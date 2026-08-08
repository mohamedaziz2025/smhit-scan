import { Fiche, type IFiche } from "../models/Fiche";
import { Site } from "../models/Site";
import { ApiError } from "../middlewares/errorHandler";
import { normalizeToUtcMidnight } from "../utils/date";
import { uploadScanImages } from "./upload.service";
import { extractFiche } from "./ocr.service";
import { generateOrUpdateReportForFiche } from "./report.service";
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

  // Toute erreur à partir d'ici doit supprimer la fiche fraîchement créée :
  // sinon elle reste bloquée en SCANNING et, à cause de l'index unique
  // {clientId, siteId, interventionDate}, condamne définitivement le "jour"
  // pour ce client/site tant qu'un admin ne l'a pas nettoyée à la main.
  try {
    if (input.files.length > 0) {
      const scanImageUrls = await uploadScanImages(input.files, fiche.id);
      fiche.scanImageUrls = scanImageUrls;
    }

    // Plan des postes du site (§6.2, configuré manuellement par l'Admin) —
    // pré-remplit les zones/postes attendus avant même l'IA, pour que
    // l'agent n'ait pas à recréer chaque poste à la main. L'extraction OCR
    // ci-dessous écrase ce plan si elle détecte des données réelles.
    const site = await Site.findById(input.siteId);
    if (site?.zonesConfig) {
      initZonesFromSitePlan(fiche, input.ficheType, site.zonesConfig);
    }

    // Extraction IA (§7) — pré-remplit la fiche. Le pipeline complet arrive
    // au Module 3 ; en attendant, l'appel renvoie un contrat vide (confiance
    // 0). Contrairement à l'upload, une IA indisponible n'est pas
    // bloquante : l'agent saisira la fiche manuellement.
    try {
      if (input.files.length > 0) {
        const imageBase64 = input.files[0].buffer.toString("base64");
        const extraction = await extractFiche(input.ficheType, imageBase64);
        fiche.ocrConfidence = extraction.overall_confidence;
        applyExtractionToFiche(fiche, input.ficheType, extraction);
      }
    } catch (err) {
      console.error("⚠️  Extraction IA/OCR indisponible :", (err as Error).message);
    }

    fiche.status = FicheStatus.DRAFT;
    await fiche.save();
    return fiche;
  } catch (err) {
    await Fiche.findByIdAndDelete(fiche.id);
    throw err;
  }
}

interface ZoneConfig {
  label: string;
  postCount: number;
}

/**
 * Initialise les zones/postes d'une fiche à partir du plan du site (§6.2)
 * — chaque poste démarre "vierge" (aucune case cochée), l'agent n'a plus
 * qu'à cocher plutôt qu'à ajouter un à un les postes prévus.
 */
function initZonesFromSitePlan(
  fiche: IFiche,
  ficheType: FicheType,
  zonesConfig: { externalZones: ZoneConfig[]; internalZones: ZoneConfig[] },
): void {
  if (ficheType === FicheType.DERATISATION_EXTERNE && zonesConfig.externalZones?.length) {
    fiche.deratExterne = {
      zones: zonesConfig.externalZones.map((z) => ({
        zoneLabel: z.label,
        postes: Array.from({ length: z.postCount }, (_, i) => ({
          posteNo: i + 1,
          etatAppat: {},
          action: {},
          produit: {},
          etatPorteAppat: {},
        })),
      })),
    };
  }
  if (ficheType === FicheType.DERATISATION_INTERNE && zonesConfig.internalZones?.length) {
    fiche.deratInterne = {
      zones: zonesConfig.internalZones.map((z) => ({
        zoneLabel: z.label,
        postes: Array.from({ length: z.postCount }, (_, i) => ({
          posteNo: i + 1,
          etatPlaque: {},
          action: {},
          produit: {},
          etatPorteAppat: {},
        })),
      })),
    };
  }
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

/** Verrouille les corrections agent et déclenche la génération du rapport (§5, §8). */
export async function validateFiche(ficheId: string): Promise<IFiche> {
  const fiche = await Fiche.findById(ficheId);
  if (!fiche) throw new ApiError(404, "Fiche introuvable");

  if (fiche.status !== FicheStatus.DRAFT) {
    throw new ApiError(409, `Impossible de valider une fiche au statut ${fiche.status}`);
  }

  fiche.status = FicheStatus.AGENT_VALIDATED;
  fiche.agentValidatedAt = new Date();
  await fiche.save();

  // Génération/mise à jour du rapport mensuel (§5 workflow). Une erreur ici
  // ne doit pas invalider la fiche déjà verrouillée côté agent — le rapport
  // pourra être régénéré via POST /reports/generate.
  try {
    await generateOrUpdateReportForFiche(fiche);
  } catch (err) {
    console.error("⚠️  Génération du rapport échouée :", (err as Error).message);
  }

  return fiche;
}
