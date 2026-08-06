import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import { env } from "./config/env";
import { connectDB } from "./config/db";
import "./config/redis"; // établit la connexion au chargement
import { corsOptions } from "./config/cors";
import { errorHandler, notFound } from "./middlewares/errorHandler";
import { router } from "./routes";

async function bootstrap() {
  await connectDB();

  const app = express();

  app.use(helmet());
  app.use(cors(corsOptions));
  app.use(express.json({ limit: "10mb" })); // fiches + JSON OCR peuvent être volumineux
  app.use(cookieParser());
  app.use(morgan(env.NODE_ENV === "development" ? "dev" : "combined"));

  app.use("/api", router);

  app.use(notFound);
  app.use(errorHandler);

  app.listen(env.PORT, () => {
    console.log(`🚀 SMHIT API démarrée sur http://localhost:${env.PORT}`);
    console.log(`   Environnement : ${env.NODE_ENV}`);
  });
}

bootstrap().catch((err) => {
  console.error("❌ Échec du démarrage de l'API :", err);
  process.exit(1);
});
