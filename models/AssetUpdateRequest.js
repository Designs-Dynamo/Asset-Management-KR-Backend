import mongoose from "mongoose";

const assetUpdateRequestSchema = new mongoose.Schema(
  {
    /* ================= RELATION ================= */

    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
      required: true
    },

    branchId: {
      type: String,
      required: true,
      index: true
    },

    regionId: {
      type: String,
      required: true,
      index: true
    },

    requestedemployee:{
      type: String,
    },

    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    requestedBranchId: {
      type: String,   // branch user wants to move asset to
      index: true
    },

    /* ================================================================
       REQUEST TYPE
 
       NORMAL        → User submits → Region Manager acts:
                         • Approve  → asset updated in DB immediately
                         • Reject   → asset unchanged, request closed
                         • Escalate → sends THIS specific request to Admin
                                      asset NOT updated until Admin decides
 
       BRANCH_CHANGE → User submits → goes DIRECTLY to Admin
                       Admin approves → asset branchId changed in DB
    ================================================================ */
    requestType: {
      type: String,
      enum: ["NORMAL", "BRANCH_CHANGE"],
      default: "NORMAL"
    },

    /* ================= ASSET META UPDATES ================= */

    updatedAssetMeta: {
      assetType: {
        type: String           // Laptop, Desktop, Printer
      },
      assetCompany: {
        type: String           // Dell, HP, Lenovo
      },
      purchaseDate: {
        type: Date
      },
      assignedTo:{
      type: String,
    },

      department:
      {
        type: String,
      },

      division:
      {
        type: String,
      },
    },

    updatedextraprice:{
      pram: String,
      pssd: String,
      phdd: String,
      pother: String,
    },

    /* ================= DEVICE DETAILS UPDATES ================= */

    updatedDeviceDetails: {
      deviceName: String,
      cpu: String,
      ram: String,
      ssd: String,
      hdd: String,
      os: String,
      currentStatus: {
        type: String,
        enum: ["Assigned", "Unassigned", "Maintenance"]
      }
    },

    /* ================= OPTIONAL NOTES ================= */

    notes: {
      type: String,
      trim: true
    },

    /* ================= REQUEST STATUS ================= */

    status: {
      type: String,
      enum: [
        "PENDING",             // Waiting for Region Manager or Admin
        "ESCALATED_TO_ADMIN",  // Manager forwarded this specific request to Admin
        "APPROVED",            // Approved — asset already updated in DB
        "REJECTED"             // Rejected — asset unchanged
      ],
      default: "PENDING"
    },

    updatedImages: [
    {
      url: String
    }
      ],

    /* ── MANAGER REVIEW ── */
    reviewedByManager: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    managerReviewedAt: { type: Date,   default: null },
    managerNote:       { type: String, default: null },
 
    /* ── ESCALATION INFO (when manager sends to Admin) ── */
    escalationNote: { type: String, default: null },
    escalatedAt:    { type: Date,   default: null },
 
    /* ── ADMIN REVIEW ── */
    reviewedByAdmin: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    adminReviewedAt: { type: Date,   default: null },
    adminNote:       { type: String, default: null },
    
    /* ================= NEW: AUTO-DELETE LOGIC ================= */
    // This field is set ONLY when status becomes APPROVED or REJECTED
    resolvedAt: { 
      type: Date, 
      default: null 
    }

  },
  { timestamps: true }
);

assetUpdateRequestSchema.index({ resolvedAt: 1 }, { expireAfterSeconds: 2592000 });

const AssetUpdateRequest = mongoose.model('AssetUpdateRequest',assetUpdateRequestSchema);

export default AssetUpdateRequest;
