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
 * Pipeline complet (OpenCV, Module 3) réellement branché — voir
 * ai-ocr/app/pipeline.py. Le traitement d'une photo de téléphone haute
 * résolution (12+ Mpx) a mis en évidence un vrai dépassement de timeout
 * (>10 min avant le downscale ajouté dans preprocessing.py, ~24s après) —
 * 60s de marge ici plutôt que 30s pour absorber la variance réelle (charge
 * serveur, qualité/taille de photo) sans que l'appel bascule silencieusement
 * en "IA indisponible" côté fiche.service.ts.
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
    { timeout: 60_000 },
  );

  return data;
}
