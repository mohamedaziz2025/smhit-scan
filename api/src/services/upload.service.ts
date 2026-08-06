import { randomUUID } from "node:crypto";
import { ensureBucket, minioClient } from "../config/minio";
import { env } from "../config/env";

/**
 * Upload les images scannées vers MinIO (stockage privé, §13) et renvoie
 * les clés objet (pas d'URL publique — l'accès se fait via URLs signées,
 * cf. `getSignedScanUrl`).
 */
export async function uploadScanImages(
  files: Array<{ buffer: Buffer; mimetype: string; originalname: string }>,
  ficheId: string,
): Promise<string[]> {
  await ensureBucket();

  const keys: string[] = [];
  for (const file of files) {
    const ext = file.originalname.split(".").pop() ?? "jpg";
    const key = `fiches/${ficheId}/${randomUUID()}.${ext}`;
    await minioClient.putObject(env.MINIO_BUCKET, key, file.buffer, file.buffer.length, {
      "Content-Type": file.mimetype,
    });
    keys.push(key);
  }
  return keys;
}

/** URL signée temporaire (24h) pour afficher un scan dans le viewer fiche (§10/§11). */
export async function getSignedScanUrl(key: string): Promise<string> {
  return minioClient.presignedGetObject(env.MINIO_BUCKET, key, 24 * 60 * 60);
}
