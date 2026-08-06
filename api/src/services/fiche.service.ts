import { Fiche, type IFiche } from "../models/Fiche";
import { ApiError } from "../middlewares/errorHandler";
import { normalizeToUtcMidnight } from "../utils/date";
import { uploadScanImages } from "./upload.service";
import { extractFiche } from "./ocr.service";
import { FicheStatus, FicheType } from "../types/enums";

interface ScanInput {
  clientId: string;
  siteId: string;
  interventionDate?: Date;
  agentId: string;
  ficheType: FicheType;
  files: Array<{ buffer: Buffer; mimetype: string; originalname: string }>;
}

/**
 * Crée une fiche à partir d'un scan — applique la règle "1 fiche par
 * client/site/jour" (§5) : si une fiche existe déjà pour ce jour, on
 * renvoie 409 avec son id pour laisser le client décider de la compléter
 * via PATCH /fiches/:id plutôt que d'en créer une seconde.
 */
export async function createFicheFromScan(input: ScanInput): Promise<IFiche> {
  const interventionDate = normalizeToUtcMidnight(input.interventionDate ?? new Date());

  const existing = await Fiche.findOne({
    clientId: input.clientId,
    siteId: input.siteId,
    interventionDate,
  });

  if (existing) {
    throw new ApiError(409, "Une fiche existe déjà pour ce client/site aujourd'hui", {
      existingFicheId: existing.id,
      status: existing.status,
    });
  }

  const fiche = await Fiche.create({
    clientId: input.clientId,
    siteId: input.siteId,
    interventionDate,
    createdByAgentId: input.agentId,
    status: FicheStatus.SCANNING,
    source: input.files.length > 0 ? "UPLOAD" : "CAMERA",
    interventionsCount: 1,
  });

  if (input.files.length > 0) {
    const scanImageUrls = await uploadScanImages(input.files, fiche.id);
    fiche.scanImageUrls = scanImageUrls;
  }

  // Extraction IA (§7) — pré-remplit la fiche. Le pipeline complet arrive au
  // Module 3 ; en attendant, l'appel renvoie un contrat vide (confiance 0).
  try {
    if (input.files.length > 0) {
      const imageBase64 = input.files[0].buffer.toString("base64");
      const extraction = await extractFiche(input.ficheType, imageBase64);
      fiche.ocrConfidence = extraction.overall_confidence;
      applyExtractionToFiche(fiche, input.ficheType, extraction);
    }
  } catch (err) {
    // L'IA est indisponible : on n'échoue pas la création, l'agent saisira
    // la fiche manuellement — le scan papier reste consultable.
    console.error("⚠️  Extraction IA/OCR indisponible :", (err as Error).message);
  }

  fiche.status = FicheStatus.DRAFT;
  await fiche.save();
  return fiche;
}

function applyExtractionToFiche(
  fiche: IFiche,
  ficheType: FicheType,
  extraction: { sections: Record<string, unknown> },
): void {
  const section = extraction.sections as Record<string, { zones?: unknown[] } | undefined>;

  if (ficheType === FicheType.DERATISATION_EXTERNE && section.deratExterne) {
    fiche.deratExterne = { zones: section.deratExterne.zones ?? [] };
  }
  if (ficheType === FicheType.DERATISATION_INTERNE && section.deratInterne) {
    fiche.deratInterne = { zones: section.deratInterne.zones ?? [] };
  }
  if (ficheType === FicheType.DESINSECTISATION && section.desinsectisation) {
    const desinsect = section.desinsectisation as { lignes?: unknown[] };
    fiche.desinsectisation = { lignes: desinsect.lignes ?? [] };
  }
}

/** Verrouille les corrections agent et déclenche la génération du rapport (Module 5). */
export async function validateFiche(ficheId: string): Promise<IFiche> {
  const fiche = await Fiche.findById(ficheId);
  if (!fiche) throw new ApiError(404, "Fiche introuvable");

  if (fiche.status !== FicheStatus.DRAFT) {
    throw new ApiError(409, `Impossible de valider une fiche au statut ${fiche.status}`);
  }

  fiche.status = FicheStatus.AGENT_VALIDATED;
  fiche.agentValidatedAt = new Date();
  await fiche.save();

  return fiche;
}
