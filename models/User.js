import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,        // 🔑 IMPORTANT
      lowercase: true,
      trim: true
    },

    password: {
      type: String,
      required: true
    },

    role: {
      type: String,
      enum: ["ADMIN", "BRANCH_USER", "REGION_MANAGER"],
      default: "BRANCH_USER"
    },

    branchId: {
      type: String,
      required: true,
      index: true           // 🔑 Faster branch queries
    },

    regionId: {
      type: String,
      index: true,
      default: null
    }

    /* ================= OPTIONAL (RECOMMENDED) ================= */
    
  },
  { timestamps: true }
);


const User = mongoose.model('User', userSchema);

export default User;