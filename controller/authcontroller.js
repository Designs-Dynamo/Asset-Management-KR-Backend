import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { getRegionByBranch, BRANCHES, REGIONS } from "../config/regions.js";

/* ================================================================
   REGISTER  (Admin only)
   - BRANCH_USER    → regionId auto-resolved from branchId
   - REGION_MANAGER → regionId must be provided explicitly
   - ADMIN          → regionId set to null (all-region access)
================================================================ */
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, role, branchId, regionId } = req.body;

    if (!name || !email || !password || !branchId) {
      return res.status(400).json({ message: "name, email, password and branchId are required" });
    }

    /* Validate branchId against config — HQ is valid for ADMIN */
    const validBranch = Object.values(BRANCHES).find(b => b.branchId === branchId);
    if (!validBranch) {
      return res.status(400).json({
        message: `Invalid branchId. Valid IDs: ${Object.values(BRANCHES).map(b => b.branchId).join(", ")}`
      });
    }

    /* Resolve regionId based on role */
    let resolvedRegionId = null;

    if (role === "REGION_MANAGER") {
      if (!regionId || !Object.values(REGIONS).includes(regionId)) {
        return res.status(400).json({
          message: `regionId is required for REGION_MANAGER. Valid: ${Object.values(REGIONS).join(", ")}`
        });
      }
      resolvedRegionId = regionId;
    } else if (role === "ADMIN") {
      // Admin belongs to HQ — no regionId needed
      resolvedRegionId = null;
    } else {
      /* BRANCH_USER: auto-resolve from branchId */
      resolvedRegionId = getRegionByBranch(branchId);
      if (!resolvedRegionId) {
        return res.status(400).json({ message: "Could not resolve region from branchId" });
      }
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists with this email" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role:     role || "BRANCH_USER",
      branchId,
      regionId: resolvedRegionId
    });

    res.status(201).json({
      message: "User created successfully",
      user: {
        _id:      user._id,
        name:     user.name,
        email:    user.email,
        role:     user.role,
        branchId: user.branchId,
        regionId: user.regionId
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================================================================
   LOGIN
================================================================ */
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    /* regionId in token enables region-based routing in middleware */
    const token = jwt.sign(
      {
        userId:   user._id,
        role:     user.role,
        branchId: user.branchId,
        regionId: user.regionId
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        _id:      user._id,
        name:     user.name,
        email:    user.email,
        role:     user.role,
        branchId: user.branchId,
        regionId: user.regionId
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================================================================
   GET ALL USERS  (Admin only)
================================================================ */
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ================================================================
   DELETE USER  (Admin only)
================================================================ */
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.userId === id) {
      return res.status(400).json({ message: "You cannot delete your own account." });
    }

    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================================================================
   GET BRANCH LIST  (public — for frontend dropdowns)
================================================================ */
export const getBranchList = async (req, res) => {
  try {
    res.json(Object.values(BRANCHES));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};