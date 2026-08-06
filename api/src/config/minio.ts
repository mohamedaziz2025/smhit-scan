import { Client as MinioClient } from "minio";
import { env } from "./env";

export const minioClient = new MinioClient({
  endPoint: env.MINIO_ENDPOINT,
  port: env.MINIO_PORT,
  useSSL: env.MINIO_USE_SSL,
  accessKey: env.MINIO_ROOT_USER ?? "",
  secretKey: env.MINIO_ROOT_PASSWORD ?? "",
});

let bucketReady = false;

/** Crée le bucket au premier accès si besoin (idempotent). */
export async function ensureBucket(): Promise<void> {
  if (bucketReady) return;
  const exists = await minioClient.bucketExists(env.MINIO_BUCKET).catch(() => false);
  if (!exists) {
    await minioClient.makeBucket(env.MINIO_BUCKET);
    console.log(`✅ Bucket MinIO "${env.MINIO_BUCKET}" créé`);
  }
  bucketReady = true;
}
