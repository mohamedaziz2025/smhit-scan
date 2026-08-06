import { Router } from "express";
import mongoose from "mongoose";
import { redisConnection } from "../config/redis";

export const healthRouter = Router();

healthRouter.get("/health", async (_req, res) => {
  const mongoState = mongoose.connection.readyState; // 1 = connected
  const redisState = redisConnection.status; // "ready" = connected

  res.json({
    status: "ok",
    service: "smhit-api",
    timestamp: new Date().toISOString(),
    dependencies: {
      mongo: mongoState === 1 ? "connected" : "disconnected",
      redis: redisState === "ready" ? "connected" : redisState,
    },
  });
});
