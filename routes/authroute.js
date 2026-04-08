import express from "express";
import {
  loginUser,
  registerUser,
  getAllUsers,
  deleteUser,
  getBranchList,
  forgotPassword,
  resetPassword
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

// Endpoint: POST /api/auth/forgot-password
// Logic: Checks email, creates token, sends Resend email
router.post('/forgot-password', forgotPassword);

// Endpoint: PUT /api/auth/reset-password/:token
// Logic: Verifies token, hashes new password, updates DB
router.put('/reset-password/:token', resetPassword);

export default router;