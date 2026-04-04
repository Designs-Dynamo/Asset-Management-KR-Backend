import express from "express";
import {
  loginUser,
  registerUser,
  getAllUsers,
  deleteUser,
  getBranchList
} from "../controller/authcontroller.js";
import { auth } from "../middleware/auth.js";
import { isAdmin } from "../middleware/admin.js";

const router = express.Router();

/* PUBLIC */
router.post("/login",       loginUser);
router.get("/branches",     getBranchList);    // all Gujarat branches for frontend dropdowns

/* ADMIN ONLY */
router.post("/register",    auth, isAdmin, registerUser);
router.get("/users",        auth, isAdmin, getAllUsers);
router.delete("/users/:id", auth, isAdmin, deleteUser);

export default router;