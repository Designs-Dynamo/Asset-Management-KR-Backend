import Asset from "../models/Asset.js";
import AssetUpdateRequest from "../models/AssetUpdateRequest.js";
import { getBranchesByRegion } from "../config/regions.js"; // Add this import

/* DASHBOARD – ALL ASSETS OF BRANCH  */
// For Branch------------------------------------------------------------------------
export const getBranchAssets = async (req, res) => {
  try {
    const assets = await Asset.find({
      branchId: req.user.branchId
    }).sort({ createdAt: -1 }).populate("activity.performedBy", "name email");

    res.json(assets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// For Admin----------------------------------------------------------------------
export const getallAssets = async (req, res) => {
  try {
    const assets = await Asset.find().sort({ createdAt: -1 }).populate("activity.performedBy", "name email");

    res.json(assets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ASSET DETAILS */
// For Branch---------------------------------------------------------------------
export const getAssetDetails = async (req, res) => {
  try {
    const asset = await Asset.findOne({
      _id: req.params.id,
      branchId: req.user.branchId
    })
      .populate("assignedTo", "name email")
      .populate("activity.performedBy", "name email");

    if (!asset) {
      return res.status(404).json({ message: "Asset not found" });
    }

    res.json(asset);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// For Admin------------------------------------------------------------------

export const createAsset = async (req, res) => {
  try {

    const {
      assetCode: assetCode,
      branchId: branchId,
      assetType: assetType,
      assetCompany: assetCompany,
      purchaseDate: purchaseDate,
      department: department,
      price: price,
      division: division,
      Extraprice: Extraprice,
      deviceDetails: deviceDetails,
      assignedTo: assignedTo
    } = req.body;

    if (!assetCode || !branchId || !assetType) {
      return res.status(400).json({
        message: "assetCode, branchId and assetType are required"
      });
    }

    const existing = await Asset.findOne({ assetCode });
    if (existing) {
      return res.status(400).json({
        message: "Asset with this assetCode already exists"
      });
    }

    const images =
      req.files?.map(file => ({
        url: file.path
      })) || [];

    const asset = await Asset.create({
      assetCode: assetCode,
      branchId: branchId,
      assetType: assetType,
      assetCompany: assetCompany,
      purchaseDate: purchaseDate,
      assignedTo: assignedTo,
      department: department,
      price: price,
      division: division,
      Extraprice: Extraprice ? (typeof Extraprice === "string" ? JSON.parse(Extraprice) : Extraprice) : {},
      deviceDetails: deviceDetails ? (typeof deviceDetails === "string" ? JSON.parse(deviceDetails) : deviceDetails) : {},
      images: images,
      activity: [
        {
          action: "CREATED",
          description: "Asset created by admin"
        }
      ]
    });

    res.status(201).json({
      message: "Asset created successfully",
      asset
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
// For Admin------------------------------------------------------------------------------------
export const getadminAssetDetails = async (req, res) => {
  try {
    const asset = await Asset.findOne({
      _id: req.params.id,
    })
      .populate("assignedTo", "name email")
      .populate("activity.performedBy", "name email");

    if (!asset) {
      return res.status(404).json({ message: "Asset not found" });
    }

    res.json(asset);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// For Admin-----------------------------------------------------------------

export const deleteAsset = async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);

    if (!asset) {
      return res.status(404).json({ message: "Asset not found" });
    }
    await asset.save();

    /* ================= DELETE ASSET ================= */
    await Asset.findByIdAndDelete(req.params.id);

    res.json({
      message: "Asset deleted successfully",
      assetId: req.params.id
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


/* GET ANALYTICS REPORT */

export const getAssetAnalytics = async (req, res) => {
  try {
    // 1. Summary Stats
    const totalAssets = await Asset.countDocuments();

    const maintenanceCount = await Asset.countDocuments({
      "deviceDetails.currentStatus": "Maintenance"
    });

    // New assets in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newAssets = await Asset.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    // --- NEW: Calculate Real Valuation from Price Field ---
    const valuationData = await Asset.aggregate([
      {
        $group: {
          _id: null,
          totalValuation: { $sum: "$price" } // Sums the 'price' field
        }
      }
    ]);
    const realValuation = valuationData.length > 0 ? valuationData[0].totalValuation : 0;

    // 2. Group by Branch (for Bar Chart)
    const assetsByBranch = await Asset.aggregate([
      { $group: { _id: "$branchId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 15 }
    ]);

    // 3. Group by Status (for Donut Chart)
    const assetsByStatus = await Asset.aggregate([
      { $group: { _id: "$deviceDetails.currentStatus", count: { $sum: 1 } } }
    ]);

    // 4. Request History (Needed for the Frontend Table)
    const requestHistory = await AssetUpdateRequest.find({
      status: { $in: ["APPROVED", "REJECTED"] }
    })
      .sort({ resolvedAt: -1 })
      .populate("assetId", "assetName assetCode")
      .limit(50);

    res.status(200).json({
      summary: {
        total: totalAssets,
        maintenance: maintenanceCount,
        new: newAssets,
        valuation: realValuation // <--- Sending real calculated price
      },
      byBranch: assetsByBranch,
      byStatus: assetsByStatus,
      requestHistory: requestHistory
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};



/* ================= REGION MANAGER DASHBOARD ================= */
export const getManagerAssets = async (req, res) => {
  try {
    // Get all branch objects for this manager's region
    const regionBranches = getBranchesByRegion(req.user.regionId);
    // Extract just the branch IDs
    const branchIds = regionBranches.map(b => b.branchId);

    // Find assets that belong to any of those branches
    const assets = await Asset.find({ branchId: { $in: branchIds } }).sort({ createdAt: -1 });
    res.json(assets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};