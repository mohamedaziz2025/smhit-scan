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

/**
 * Flux de lecture d'un scan — même logique que le proxy PDF
 * (reportPdf.service.ts) : MinIO n'est joignable que sur le réseau Docker
 * interne, une URL présignée pointant sur son hostname interne serait donc
 * injoignable par un client externe. L'image transite par l'API.
 */
export async function streamScanImage(key: string) {
  await ensureBucket();
  return minioClient.getObject(env.MINIO_BUCKET, key);
}
