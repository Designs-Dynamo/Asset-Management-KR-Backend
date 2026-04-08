import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import authroutes from "./routes/authroute.js";
import assetroutes from "./routes/Assetsroute.js";
import assetUpdateroutes from "./routes/assetUpdateroutes.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.ALLOWED_ORIGIN || "*" }));
app.use(express.json());

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("MongoDB connected successfully!");
  } catch (err) {
    console.error("MongoDB connection failed:", err);
    process.exit(1);
  }
}

app.use("/api/auth", authroutes);
app.use("/api/assets", assetroutes);
app.use("/api/asset-update", assetUpdateroutes);

app.get("/", (req, res) => {
  res.send("Asset Management Backend");
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Internal server error" });
});

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
});