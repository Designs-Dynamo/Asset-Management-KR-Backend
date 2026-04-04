import Asset from "../models/Asset.js";
import AssetUpdateRequest from "../models/AssetUpdateRequest.js";
import { getRegionByBranch } from "../config/regions.js";

/* ================================================================
   HELPER — apply all field updates from a request onto an asset
================================================================ */
const applyUpdatesToAsset = (asset, request, performedBy, description) => {
  // 1. Update Core Meta (Asset Type, Company, etc.)
  if (request.updatedAssetMeta) {
    Object.keys(request.updatedAssetMeta).forEach(key => {
      const val = request.updatedAssetMeta[key];
      if (val !== undefined && val !== null) asset[key] = val;
    });
  }

  // 2. Update Device Technical Details
  if (request.updatedDeviceDetails) {
    Object.keys(request.updatedDeviceDetails).forEach(key => {
      const val = request.updatedDeviceDetails[key];
      if (val !== undefined && val !== null) asset.deviceDetails[key] = val;
    });
  }

  // 3. COMBINE EXTRA PRICE INTO MAIN PRICE
  if (request.updatedextraprice) {
    const p = request.updatedextraprice;
    
    // Ensure asset.price is a number to avoid NaN issues
    let currentPrice = Number(asset.price) || 0;

    // Calculate the sum of all incoming extra charges
    const extraSum = 
      (Number(p.pram) || 0) + 
      (Number(p.pssd) || 0) + 
      (Number(p.phdd) || 0) + 
      (Number(p.pother) || 0);

    // Update the main asset price
    asset.price = currentPrice + extraSum;

    // Optional: If you still want to keep the breakdown in Extraprice object:
    if (!asset.Extraprice) asset.Extraprice = {};
    asset.Extraprice.pram = p.pram || asset.Extraprice.pram;
    asset.Extraprice.pssd = p.pssd || asset.Extraprice.pssd;
    asset.Extraprice.phdd = p.phdd || asset.Extraprice.phdd;
    asset.Extraprice.pother = p.pother || asset.Extraprice.pother;
  }

  // 4. Update Images
  if (request.updatedImages?.length) {
    asset.images.push(...request.updatedImages);
  }

  // 5. Log Activity
  asset.activity.push({
    action: "UPDATED",
    description: description || `Asset price updated to ${asset.price}`,
    performedBy: performedBy, // Fixed: Use the parameter passed to the function
    performedAt: new Date()
  });
};

/* ================================================================
   HELPER — safely parse JSON string fields
================================================================ */
const parseField = (field) => {
  if (!field) return undefined;
  try {
    return typeof field === "string" ? JSON.parse(field) : field;
  } catch (e) {
    return undefined;
  }
};

/* ================================================================
   BRANCH_USER — Submit a normal update request
================================================================ */
export const createAssetUpdateRequest = async (req, res) => {
  try {
    const { assetId } = req.params;

    // ✅ FIX: safely read body — form-data populates req.body via multer
    const body = req.body || {};
    const { updatedAssetMeta, updatedextraprice, updatedDeviceDetails, notes } = body;

    const query = req.user.role === "ADMIN"
      ? { _id: assetId }
      : { _id: assetId, branchId: req.user.branchId };

    const asset = await Asset.findOne(query);
    if (!asset) {
      return res.status(403).json({ message: "Asset not found or you don't have access to it" });
    }

    const existing = await AssetUpdateRequest.findOne({
      assetId,
      status: { $in: ["PENDING", "ESCALATED_TO_ADMIN"] }
    });
    if (existing) {
      return res.status(400).json({ message: "An active request already exists for this asset" });
    }

    const regionId = req.user.role === "ADMIN"
      ? getRegionByBranch(asset.branchId)
      : (req.user.regionId || getRegionByBranch(req.user.branchId));

    if (!regionId) {
      return res.status(400).json({ message: "Could not determine region for this branch" });
    }

    const images = req.files?.map(file => ({ url: file.path })) || [];

    const request = await AssetUpdateRequest.create({
      assetId,
      branchId: asset.branchId,
      regionId,
      requestedBy: req.user.userId,
      requestType: "NORMAL",
      updatedAssetMeta: parseField(updatedAssetMeta),
      updatedextraprice: parseField(updatedextraprice),
      updatedDeviceDetails: parseField(updatedDeviceDetails),
      updatedImages: images,
      notes
    });

    res.status(201).json({
      message: "Request submitted. Awaiting Region Manager review.",
      request
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ================================================================
   BRANCH_USER — Submit a branch-change request
   Goes DIRECTLY to Admin. Region Manager has no role here.
================================================================ */
export const createBranchChangeRequest = async (req, res) => {
  try {
    const { assetId } = req.params;

    // ✅ FIX: safely read body
    const { requestedBranchId, notes } = req.body || {};

    if (!requestedBranchId) {
      return res.status(400).json({ message: "requestedBranchId is required" });
    }

    const asset = await Asset.findById(assetId);
    if (!asset) return res.status(404).json({ message: "Asset not found" });

    if (asset.branchId === requestedBranchId) {
      return res.status(400).json({ message: "Asset already belongs to this branch" });
    }

    const existing = await AssetUpdateRequest.findOne({
      assetId,
      status: { $in: ["PENDING", "ESCALATED_TO_ADMIN"] }
    });
    if (existing) {
      return res.status(400).json({ message: "An active request already exists for this asset" });
    }

    const regionId = req.user.regionId || getRegionByBranch(req.user.branchId);

    const request = await AssetUpdateRequest.create({
      assetId,
      branchId: asset.branchId,
      regionId,
      requestedBy: req.user.userId,
      requestedBranchId,
      requestType: "BRANCH_CHANGE",
      notes
    });

    res.status(201).json({
      message: "Branch change request submitted. Goes directly to Admin for approval.",
      request
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ================================================================
   BRANCH_USER — View all requests from their branch
================================================================ */
export const branchRequests = async (req, res) => {
  try {
    const requests = await AssetUpdateRequest.find({ branchId: req.user.branchId })
      .populate("assetId", "assetCode assetType deviceDetails branchId")
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ================================================================
   REGION_MANAGER — Get PENDING normal requests for their region
================================================================ */
export const getManagerPendingRequests = async (req, res) => {
  try {
    const requests = await AssetUpdateRequest.find({
      regionId: req.user.regionId,
      requestType: "NORMAL",
      status: "PENDING"
    })
      .populate("assetId", "assetCode assetType branchId deviceDetails")
      .populate("requestedBy", "name email branchId")
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ================================================================
   REGION_MANAGER — APPROVE a normal request
   → Asset updated in DB immediately
   → Status: PENDING → APPROVED
================================================================ */
export const managerApproveRequest = async (req, res) => {
  try {
    const { note } = req.body || {};
    const request = await AssetUpdateRequest.findById(req.params.id).populate("assetId");

    if (!request) return res.status(404).json({ message: "Request not found" });

    if (request.regionId !== req.user.regionId) {
      return res.status(403).json({ message: "This request does not belong to your region" });
    }
    if (request.requestType === "BRANCH_CHANGE") {
      return res.status(403).json({ message: "Branch change requests are handled by Admin only" });
    }
    if (request.status !== "PENDING") {
      return res.status(400).json({ message: `Request is already ${request.status}` });
    }

    const asset = request.assetId;

    applyUpdatesToAsset(
      asset,
      request,
      req.user.userId,
      `Asset updated — approved by Region Manager (${req.user.regionId})`
    );
    await asset.save();

    request.status = "APPROVED";
    request.reviewedByManager = req.user.userId;
    request.managerReviewedAt = new Date();
    request.managerNote = note || null;
    request.resolvedAt = new Date();
    await request.save();

    res.json({ message: "Request approved. Asset updated in database immediately.", request });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ================================================================
   REGION_MANAGER — REJECT a normal request
   → Asset stays unchanged
   → Status: PENDING → REJECTED
================================================================ */
export const managerRejectRequest = async (req, res) => {
  try {
    const { note } = req.body || {};
    const request = await AssetUpdateRequest.findById(req.params.id).populate("assetId");

    if (!request) return res.status(404).json({ message: "Request not found" });

    if (request.regionId !== req.user.regionId) {
      return res.status(403).json({ message: "This request does not belong to your region" });
    }
    if (request.requestType === "BRANCH_CHANGE") {
      return res.status(403).json({ message: "Branch change requests are handled by Admin only" });
    }
    if (request.status !== "PENDING") {
      return res.status(400).json({ message: `Request is already ${request.status}` });
    }

    if (request.assetId) {
      request.assetId.activity.push({
        action: "UPDATE_REJECTED",
        description: note || "Asset update request rejected by Region Manager",
        performedBy: req.user.userId
      });
      await request.assetId.save();
    }

    request.status = "REJECTED";
    request.reviewedByManager = req.user.userId;
    request.managerReviewedAt = new Date();
    request.managerNote = note || null;
    request.resolvedAt = new Date();
    await request.save();

    res.json({ message: "Request rejected. Asset data unchanged.", request });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ================================================================
   REGION_MANAGER — ESCALATE one specific request to Admin
   Frontend: "Send to Admin" button
   → Asset NOT updated yet
   → Status: PENDING → ESCALATED_TO_ADMIN
================================================================ */
export const managerEscalateToAdmin = async (req, res) => {
  try {
    const { escalationNote } = req.body || {};
    const request = await AssetUpdateRequest.findById(req.params.id);

    if (!request) return res.status(404).json({ message: "Request not found" });

    if (request.regionId !== req.user.regionId) {
      return res.status(403).json({ message: "This request does not belong to your region" });
    }
    if (request.requestType === "BRANCH_CHANGE") {
      return res.status(403).json({ message: "Branch change requests already go to Admin directly" });
    }
    if (request.status !== "PENDING") {
      return res.status(400).json({ message: `Request is already ${request.status}` });
    }

    request.status = "ESCALATED_TO_ADMIN";
    request.reviewedByManager = req.user.userId;
    request.managerReviewedAt = new Date();
    request.escalationNote = escalationNote || null;
    request.escalatedAt = new Date();
    await request.save();

    res.json({
      message: "Request sent to Admin for final decision. Asset will not be updated until Admin approves.",
      request
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ================================================================
   ADMIN — Get ALL requests (full visibility, all regions)
   Query params: ?status= &regionId= &requestType=
================================================================ */
export const getAdminRequests = async (req, res) => {
  try {
    const { status, regionId, requestType } = req.query;

    const filter = {};

    // ✅ Handle status properly
    if (status) {
      filter.status = status;
    } else {
      // 👇 DEFAULT: show actionable requests for admin
      filter.status = { $in: ["PENDING", "ESCALATED_TO_ADMIN"] };
    }

    if (requestType) filter.requestType = requestType;

    // ✅ FIX: avoid ObjectId crash
    if (regionId && mongoose.Types.ObjectId.isValid(regionId)) {
      filter.regionId = regionId;
    }

    const requests = await AssetUpdateRequest.find(filter)
      .populate("assetId", "assetCode assetType branchId deviceDetails")
      .populate("requestedBy", "name email branchId regionId")
      .populate("reviewedByManager", "name email regionId")
      .populate("reviewedByAdmin", "name email")
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ================================================================
   ADMIN — APPROVE a request
   1. BRANCH_CHANGE (PENDING)     → move asset to new branch
   2. ESCALATED_TO_ADMIN (NORMAL) → apply all updates to asset
================================================================ */
export const adminApproveRequest = async (req, res) => {
  try {
    const { note } = req.body || {};
    const request = await AssetUpdateRequest.findById(req.params.id).populate("assetId");

    if (!request) return res.status(404).json({ message: "Request not found" });

    const allowedStatuses = ["PENDING", "ESCALATED_TO_ADMIN"];
    if (!allowedStatuses.includes(request.status)) {
      return res.status(400).json({
        message: `Cannot approve a request with status: ${request.status}`
      });
    }

    if (request.requestType === "BRANCH_CHANGE" && request.status !== "PENDING") {
      return res.status(400).json({ message: "Branch change request is not in PENDING state" });
    }

    const asset = request.assetId;

    if (request.requestedBranchId) {
      const oldBranch = asset.branchId;
      asset.branchId = request.requestedBranchId;
      asset.activity.push({
        action: "BRANCH_TRANSFER",
        description: `Asset moved from ${oldBranch} to ${request.requestedBranchId} — approved by Admin`,
        performedBy: req.user.userId
      });
    }

    applyUpdatesToAsset(
      asset,
      request,
      req.user.userId,
      request.requestType === "BRANCH_CHANGE"
        ? "Asset branch changed — Admin approval"
        : "Asset updated — Admin approved escalated request"
    );
    await asset.save();

    request.status = "APPROVED";
    request.reviewedByAdmin = req.user.userId;
    request.adminReviewedAt = new Date();
    request.adminNote = note || null;
    request.resolvedAt = new Date();
    await request.save();

    res.json({ message: "Request approved by Admin. Asset updated in database." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ================================================================
   ADMIN — REJECT a request
   Asset stays completely unchanged.
================================================================ */
export const adminRejectRequest = async (req, res) => {
  try {
    const { note } = req.body || {};
    const request = await AssetUpdateRequest.findById(req.params.id).populate("assetId");

    if (!request) return res.status(404).json({ message: "Request not found" });

    if (["APPROVED", "REJECTED"].includes(request.status)) {
      return res.status(400).json({ message: `Request is already ${request.status}` });
    }

    if (request.assetId) {
      request.assetId.activity.push({
        action: "UPDATE_REJECTED",
        description: note || "Asset update request rejected by Admin",
        performedBy: req.user.userId
      });
      await request.assetId.save();
    }

    request.status = "REJECTED";
    request.reviewedByAdmin = req.user.userId;
    request.adminReviewedAt = new Date();
    request.adminNote = note || null;
    request.resolvedAt = new Date();
    await request.save();

    res.json({ message: "Request rejected by Admin. Asset unchanged." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ================================================================
   ADMIN — Direct asset update (no approval flow, instant update)
================================================================ */
export const createAdminAssetUpdateRequest = async (req, res) => {
  try {
    const { assetId } = req.params;

    // ✅ FIX: safely read body
    const { updatedAssetMeta, updatedextraprice, updatedDeviceDetails, notes } = req.body || {};

    const asset = await Asset.findById(assetId);
    if (!asset) return res.status(404).json({ message: "Asset not found" });

    const existing = await AssetUpdateRequest.findOne({
      assetId,
      status: { $in: ["PENDING", "ESCALATED_TO_ADMIN"] }
    });
    if (existing) {
      return res.status(400).json({ message: "An active request already exists for this asset" });
    }

    const images = req.files?.map(file => ({ url: file.path })) || [];

    const parsedMeta = parseField(updatedAssetMeta);
    const parsedExtra = parseField(updatedextraprice);
    const parsedDevice = parseField(updatedDeviceDetails);

    const request = await AssetUpdateRequest.create({
      assetId,
      branchId: asset.branchId,
      regionId: getRegionByBranch(asset.branchId),
      requestedBy: req.user.userId,
      requestType: "NORMAL",
      status: "APPROVED",
      updatedAssetMeta: parsedMeta,
      updatedextraprice: parsedExtra,
      updatedDeviceDetails: parsedDevice,
      updatedImages: images,
      notes,
      reviewedByAdmin: req.user.userId,
      adminReviewedAt: new Date(),
      resolvedAt: new Date()
    });

    applyUpdatesToAsset(asset, request, req.user.userId, "Asset updated directly by Admin");
    await asset.save();

    res.status(201).json({ message: "Asset updated directly by Admin.", request });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};