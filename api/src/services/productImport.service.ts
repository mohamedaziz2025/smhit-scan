import * as XLSX from "xlsx";
import { Product } from "../models/Product";
import { ProductCategory } from "../types/enums";
import { ApiError } from "../middlewares/errorHandler";

// Préfixes -> catégorie par défaut si la colonne "category" est absente ou
// invalide dans le fichier importé (§ Annexe A du cahier des charges).
const PREFIX_CATEGORY: Array<[string, ProductCategory]> = [
  ["EQU", ProductCategory.GLUE_BOARD],
  ["NET", ProductCategory.DISINFECTANT],
  ["PLDRT", ProductCategory.RODENTICIDE],
  ["PLDSF", ProductCategory.DISINFECTANT],
  ["PLDSH", ProductCategory.HERBICIDE],
  ["PLDSI", ProductCategory.INSECTICIDE],
  ["PLFUM", ProductCategory.FUMIGANT],
];

function guessCategory(code: string): ProductCategory {
  const match = PREFIX_CATEGORY.find(([prefix]) => code.toUpperCase().startsWith(prefix));
  return match?.[1] ?? ProductCategory.OTHER;
}

// Alias de noms de colonnes tolérés (français/anglais, casse libre) — un
// fichier Excel réel n'a jamais des en-têtes parfaitement normalisés.
const HEADER_ALIASES: Record<string, string[]> = {
  code: ["code", "code produit", "réf", "ref", "référence"],
  name: ["name", "nom", "désignation", "designation", "nom commercial"],
  category: ["category", "catégorie", "categorie", "type"],
  activeSubstance: ["activesubstance", "matière active", "matiere active", "substance active"],
  concentration: ["concentration"],
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase();
}

function buildColumnMap(headerRow: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  headerRow.forEach((raw, i) => {
    const norm = normalizeHeader(String(raw ?? ""));
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.includes(norm) && !(field in map)) map[field] = i;
    }
  });
  return map;
}

export interface ImportSummary {
  created: number;
  updated: number;
  errors: Array<{ row: number; message: string }>;
  total: number;
}

/**
 * Import Excel du catalogue produits (§9 : `POST /products/import`, jamais
 * implémenté jusqu'ici malgré la mention au cahier des charges). Colonnes
 * attendues : code, name (obligatoires) — category/activeSubstance/
 * concentration optionnelles, avec repli sur le préfixe du code si la
 * catégorie est absente (cf. Annexe A).
 */
export async function importProductsFromExcel(buffer: Buffer): Promise<ImportSummary> {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer" });
  } catch {
    throw new ApiError(400, "Fichier Excel illisible — vérifiez le format (.xlsx/.xls/.csv).");
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new ApiError(400, "Le classeur Excel ne contient aucune feuille.");

  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });
  if (rows.length < 2) throw new ApiError(400, "Le fichier doit contenir un en-tête + au moins une ligne de données.");

  const columns = buildColumnMap(rows[0].map(String));
  if (columns.code === undefined || columns.name === undefined) {
    throw new ApiError(400, 'Colonnes requises introuvables — le fichier doit avoir au minimum "code" et "name"/"nom".');
  }

  const summary: ImportSummary = { created: 0, updated: 0, errors: [], total: rows.length - 1 };

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 1; // +1 pour compter l'en-tête comme ligne 1, humain-lisible

    const code = String(row[columns.code] ?? "").trim().toUpperCase();
    const name = String(row[columns.name] ?? "").trim();

    if (!code || !name) {
      summary.errors.push({ row: rowNumber, message: "code ou nom manquant — ligne ignorée" });
      continue;
    }

    const categoryRaw = columns.category !== undefined ? String(row[columns.category] ?? "").trim().toLowerCase() : "";
    const category = Object.values(ProductCategory).includes(categoryRaw as ProductCategory)
      ? (categoryRaw as ProductCategory)
      : guessCategory(code);

    const activeSubstance =
      columns.activeSubstance !== undefined ? String(row[columns.activeSubstance] ?? "").trim() || undefined : undefined;
    const concentration =
      columns.concentration !== undefined ? String(row[columns.concentration] ?? "").trim() || undefined : undefined;
    const isToxic = category !== ProductCategory.GLUE_BOARD;

    try {
      const existing = await Product.findOne({ code });
      if (existing) {
        existing.name = name;
        existing.category = category;
        existing.isToxic = isToxic;
        if (activeSubstance) existing.activeSubstance = activeSubstance;
        if (concentration) existing.concentration = concentration;
        await existing.save();
        summary.updated++;
      } else {
        await Product.create({ code, name, category, isToxic, activeSubstance, concentration });
        summary.created++;
      }
    } catch (err) {
      summary.errors.push({ row: rowNumber, message: (err as Error).message });
    }
  }

  return summary;
}
