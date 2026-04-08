import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { getRegionByBranch, BRANCHES, REGIONS } from "../config/regions.js";
import crypto from "crypto";
import { Resend } from "resend";

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
      return res
        .status(400)
        .json({ message: "name, email, password and branchId are required" });
    }

    /* Validate branchId against config — HQ is valid for ADMIN */
    const validBranch = Object.values(BRANCHES).find(
      (b) => b.branchId === branchId,
    );
    if (!validBranch) {
      return res.status(400).json({
        message: `Invalid branchId. Valid IDs: ${Object.values(BRANCHES)
          .map((b) => b.branchId)
          .join(", ")}`,
      });
    }

    /* Resolve regionId based on role */
    let resolvedRegionId = null;

    if (role === "REGION_MANAGER") {
      if (!regionId || !Object.values(REGIONS).includes(regionId)) {
        return res.status(400).json({
          message: `regionId is required for REGION_MANAGER. Valid: ${Object.values(REGIONS).join(", ")}`,
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
        return res
          .status(400)
          .json({ message: "Could not resolve region from branchId" });
      }
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User already exists with this email" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || "BRANCH_USER",
      branchId,
      regionId: resolvedRegionId,
    });

    res.status(201).json({
      message: "User created successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        branchId: user.branchId,
        regionId: user.regionId,
      },
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
      return res
        .status(400)
        .json({ message: "Email and password are required" });
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
        userId: user._id,
        role: user.role,
        branchId: user.branchId,
        regionId: user.regionId,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        branchId: user.branchId,
        regionId: user.regionId,
      },
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
    const users = await User.find({})
      .select("-password")
      .sort({ createdAt: -1 });
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
      return res
        .status(400)
        .json({ message: "You cannot delete your own account." });
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

const resend = new Resend("re_evNmYbUH_4U6K9jSddmKCbtzqLRwXL1rW");

// @desc    Forgot Password Request
export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "No user found with this email" });

    // 1. Generate Reset Token
    const resetToken = crypto.randomBytes(20).toString("hex");

    // 2. Hash and save to database (to compare later)
    user.resetpasswordtoken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    user.resetpasswordexpire = Date.now() + 10 * 60 * 1000; // 10 mins

    await user.save();

    // 3. Send Email using Resend Web Template
    const resetUrl = `https://kr-india-assets-8kmyinj9e-jay-patels-projects-5e30b249.vercel.app/reset-password/${resetToken}`;

    const { data, error } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: user.email,
      subject: "Test Reset Link",
      html: `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" lang="en">
  <head>
    <meta content="width=device-width" name="viewport" />
    <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta content="IE=edge" http-equiv="X-UA-Compatible" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta
      content="telephone=no,address=no,email=no,date=no,url=no"
      name="format-detection" />
  </head>
  <body>
    <!--$--><!--html--><!--head-->
    <div
      style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0"
      data-skip-in-text="true">
      Click here to securely reset your password. This link expires in 10
      minutes.
      <div>
         ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿
      </div>
    </div>
    <!--body-->
    <table
      border="0"
      width="100%"
      cellpadding="0"
      cellspacing="0"
      role="presentation"
      align="center">
      <tbody>
        <tr>
          <td>
            <table
              align="center"
              width="100%"
              border="0"
              cellpadding="0"
              cellspacing="0"
              role="presentation"
              style="width:100%">
              <tbody>
                <tr style="width:100%">
                  <td>
                    <div
                      style="margin:auto;padding:20px;font-family:sans-serif;max-width:600px;border:1px solid #e2e8f0;border-radius:12px">
                      <h2
                        style="margin:0;padding:0;color:#1e293b;text-align:center">
                        Asset Management System
                      </h2>
                      <p style="margin:0;padding:0">Hi {{name}},</p>
                      <p style="margin:0;padding:0">
                        We received a request to reset your password. Click the
                        button below to choose a new one. This link expires in
                        10 minutes.
                      </p>
                      <div style="margin:30px 0;padding:0;text-align:center">
                        <p style="margin:0;padding:0">
                          <a
                            href="${resetUrl}"
                            rel="noopener noreferrer nofollow"
                            style="color:white;text-decoration:none;background-color:#4f46e5;padding:12px 24px;border-radius:8px;font-weight:bold;display:inline-block;"
                            target="_blank"
                          >
                            Reset Password
                          </a>
                        </p>
                      </div>
                      <p
                        style="margin:0;padding:0;color:#64748b;font-size:14px">
                        If you didn&#x27;t request this, you can safely ignore
                        this email.
                      </p>
                      <hr
                        style="width:100%;border:0;border-top:1px solid #f1f5f9;margin:20px 0" />
                      <p
                        style="margin:0;padding:0;font-size:12px;color:#94a3b8;text-align:center">
                        Khimji Ramdas Asset Management KR
                      </p>
                    </div>
                    <p style="margin:0;padding:0"><br /></p>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
    <!--/$-->
  </body>
</html>
`,
    });

    if (error) {
      console.log("Resend API Error:", error);
      return res.status(400).json({ error });
    }



    res
      .status(200)
      .json({ success: true, message: "Reset link sent to your email" });
  } catch (error) {
    res.status(500).json({ message: "Server error during email sending" });
  }
};

// @desc    Reset Password Action
export const resetPassword = async (req, res) => {
  const { password } = req.body;
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  try {
    const user = await User.findOne({
      // CHANGE THIS to lowercase to match your update logic below
      resetpasswordtoken: hashedToken,
      resetpasswordexpire: { $gt: Date.now() },
    });

    if (!user)
      return res.status(400).json({ message: "Invalid or expired token" });

    // 1. MANUAL HASHING
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 2. Update user fields (All lowercase now)
    user.password = hashedPassword;
    user.resetpasswordtoken = undefined;
    user.resetpasswordexpire = undefined;

    await user.save();

    // 3. Issue new JWT
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || "yoursecret",
      {
        expiresIn: "1d",
      },
    );

    res.status(200).json({
      success: true,
      token,
      message: "Password reset successful",
    });
  } catch (error) {
    console.error(error); // Always log the error so you can see it in the terminal
    res.status(500).json({ message: "Server error during password reset" });
  }
};
