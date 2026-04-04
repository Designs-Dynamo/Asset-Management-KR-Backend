import mongoose from "mongoose";

const assetSchema = new mongoose.Schema(
  {
    /* ================= CORE IDENTIFIERS ================= */

    assetCode: {
      type: String,
      required: true,
      unique: true,           // unique for all assets (global)
      trim: true
    },

    branchId: {
      type: String,
      required: true,         // same for all assets in a branch
      index: true
    },

    /* ================= ASSET META ================= */

    assetType: {
      type: String,           // Laptop, Desktop, Printer, etc.
    },

    assetCompany: {
      type: String            // Dell, HP, Lenovo, Apple, etc.
    },

    purchaseDate: {
      type: Date
    },

    department:{
      type:String
    },

    price:{
      type: Number,
    },

    division:{
      type: String,
    },

    Extraprice:{
      pram: String,
      pssd: String,
      phdd: String,
      pother: String
    },

    /* ================= DEVICE DETAILS ================= */

    deviceDetails: {
      deviceName: String,
      cpu: String,
      ram: String,
      ssd: String,
      hdd: String,
      os: String,
      assignedemployee: String,

      currentStatus: {
        type: String,
        enum: ["Assigned", "Unassigned", "Maintenance"],
        default: "Unassigned"
      }
    },

    /* ================= ASSIGNMENT (OPTIONAL) ================= */

    assignedTo: {
      type: String,
      default: null
    },

    /* ================= ASSET IMAGES ================= */

    images: [
      {
        url: String,          // Cloudinary / S3 URL
        uploadedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],

    /* ================= ACTIVITY / HISTORY ================= */

    activity: [
      {
        action: {
          type: String,       // CREATED, ASSIGNED, UPDATED, MAINTENANCE, etc.
          required: true
        },
        description: String,
        performedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        },
        performedAt: {
          type: Date,
          default: Date.now
        }
      }
    ]
  },
  { timestamps: true }
);

const Asset = mongoose.model('Asset', assetSchema);

export default Asset;