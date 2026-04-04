import express from "express";
import { auth } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import {
  getBranchAssets,
  getAssetDetails,
  createAsset,
  getadminAssetDetails,
  getallAssets,
  deleteAsset,
  getAssetAnalytics,
  getManagerAssets
} from "../controller/assetscontroller.js";
import { isAdmin, isRegionManager } from "../middleware/admin.js";

const router = express.Router();


/* ================= ADMIN CREATE ASSET ================= */
router.post("/", auth, isAdmin, upload.array("images", 5), createAsset);

router.get("/analytics", auth, isAdmin , getAssetAnalytics);

/* ================= ADMIN ASSET DETAILS ================= */
router.get("/admin/:id", auth, isAdmin, getadminAssetDetails);

/* ================= GET ALL ASSETS (ADMIN / HQ) ================= */
router.get("/all", auth, getallAssets);

/* ================= BRANCH DASHBOARD ================= */
router.get("/", auth, getBranchAssets);

/* ================= ASSET DETAILS (BRANCH USER) ================= */
router.get("/:id", auth, getAssetDetails);

router.post("/delete/:id",auth,isAdmin, deleteAsset);

/* ================= MANAGER DASHBOARD ================= */
router.get("/manager/:regionId", auth, isRegionManager, getManagerAssets);



export default router;
