import express from "express";
import { auth } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import { isAdmin, isRegionManager } from "../middleware/admin.js";
import {
  createAssetUpdateRequest,
  createBranchChangeRequest,
  branchRequests,
  getManagerPendingRequests,
  managerApproveRequest,
  managerRejectRequest,
  managerEscalateToAdmin,
  getAdminRequests,
  adminApproveRequest,
  adminRejectRequest,
  createAdminAssetUpdateRequest
} from "../controller/assetUpdatecontroller.js";

const router = express.Router();

/* ==============================================================
   BRANCH_USER routes
============================================================== */
router.post("/:assetId",               auth, upload.array("images", 5), createAssetUpdateRequest);
router.post("/:assetId/branch-change", auth, createBranchChangeRequest);
router.get("/my-requests",             auth, branchRequests);

/* ==============================================================
   REGION_MANAGER routes  (own region + NORMAL requests only)
   Three decisions per request:
     - Approve  → asset updated in DB now
     - Reject   → asset unchanged, request closed
     - Escalate → send THIS specific request to Admin
============================================================== */
router.get("/manager/pending",       auth, isRegionManager, getManagerPendingRequests);
router.put("/:id/manager-approve",   auth, isRegionManager, managerApproveRequest);
router.put("/:id/manager-reject",    auth, isRegionManager, managerRejectRequest);
router.put("/:id/escalate-to-admin", auth, isRegionManager, managerEscalateToAdmin);

/* ==============================================================
   ADMIN routes  (full access — all regions, all types, all statuses)
   Filter escalated requests: GET /admin/all?status=ESCALATED_TO_ADMIN
   Filter branch changes:     GET /admin/all?requestType=BRANCH_CHANGE
============================================================== */
router.get("/admin/all",    auth, isAdmin, getAdminRequests);
router.put("/:id/approve",  auth, isAdmin, adminApproveRequest);
router.put("/:id/reject",   auth, isAdmin, adminRejectRequest);
router.post("/admin/:assetId", auth, isAdmin, upload.array("images", 5), createAdminAssetUpdateRequest);

export default router;