import mongoose from "mongoose";
import { env } from "./env";

let isConnected = false;

export async function connectDB(): Promise<void> {
  if (isConnected) return;

  mongoose.set("strictQuery", true);

  mongoose.connection.on("connected", () => {
    isConnected = true;
    console.log("✅ MongoDB connecté");
  });
  mongoose.connection.on("error", (err) => {
    console.error("❌ Erreur MongoDB :", err);
  });
  mongoose.connection.on("disconnected", () => {
    isConnected = false;
    console.warn("⚠️  MongoDB déconnecté");
  });

  await mongoose.connect(env.MONGO_URI);
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}
