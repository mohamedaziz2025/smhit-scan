import axios from "axios";
import { env } from "../config/env";
import { Product } from "../models/Product";
import type { FicheType } from "../types/enums";

interface ExtractResponse {
  overall_confidence: number;
  header: Record<string, { value: unknown; confidence: number } | null>;
  sections: Record<string, unknown>;
  warnings: string[];
}

/**
 * Appelle le microservice IA/OCR (`POST /extract`, §7.3) avec le catalogue
 * produits actif injecté, pour permettre le matching des références lues.
 *
 * Mode HTTP (§7.4) : l'AI/OCR pipeline complet (OpenCV/PaddleOCR) est
 * construit au Module 3 — tant que ce n'est pas fait, /extract renvoie un
 * contrat de réponse vide avec confiance nulle (voir ai-ocr/app/main.py).
 * L'appel réel est déjà branché ici pour ne pas devoir retoucher l'API
 * fiches quand le pipeline sera complété.
 */
export async function extractFiche(ficheType: FicheType, imageBase64: string): Promise<ExtractResponse> {
  const catalog = await Product.find({ isActive: true }).select("code name").lean();

  const { data } = await axios.post<ExtractResponse>(
    `${env.AI_OCR_URL}/extract`,
    {
      fiche_type: ficheType,
      image_base64: imageBase64,
      layout_version: "v01",
      product_catalog: catalog.map((p) => ({ code: p.code, name: p.name })),
    },
    { timeout: 30_000 },
  );

  return data;
}
