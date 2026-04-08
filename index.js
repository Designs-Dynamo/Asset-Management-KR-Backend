import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import authroutes from "./routes/authroute.js";
import assetroutes from "./routes/Assetsroute.js";
import assetUpdateroutes from "./routes/assetUpdateroutes.js";


const app= express();

app.use(cors());
app.use(express.json());

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGO_URL, {
      bufferCommands: false,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

// 🔴 CRITICAL: wait for DB BEFORE routes
await connectDB();

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

export default app;
