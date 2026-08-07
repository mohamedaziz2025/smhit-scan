import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";
import { connectDB, disconnectDB } from "../config/db";
import { Product } from "../models/Product";
import type { ProductCategory } from "../types/enums";

interface SeedProduct {
  code: string;
  name: string;
  category: ProductCategory;
  activeSubstance?: string;
  concentration?: string;
}

// products.json est fourni à la racine du monorepo (Annexe A du cahier des charges).
// Chemin différent en dev (ts-node depuis api/src/seed, racine repo un niveau
// au-dessus de api/) et en prod (code compilé dans /app/dist, products.json
// copié à côté par le Dockerfile) — on essaie les emplacements plausibles.
function resolveSeedPath(): string {
  if (process.env.PRODUCTS_SEED_PATH) return process.env.PRODUCTS_SEED_PATH;

  const candidates = [
    path.resolve(__dirname, "../../../products.json"), // dev : api/src/seed -> repo root
    path.resolve(__dirname, "../../products.json"), // prod : /app/dist/seed -> /app
    path.resolve(process.cwd(), "products.json"),
  ];

  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) {
    throw new Error(`products.json introuvable. Essayé : ${candidates.join(", ")}`);
  }
  return found;
}

async function seed() {
  const raw = fs.readFileSync(resolveSeedPath(), "utf-8");
  const products: SeedProduct[] = JSON.parse(raw);

  await connectDB();

  let created = 0;
  let updated = 0;

  for (const p of products) {
    // Plaques à colle = non toxiques par défaut (cf. Annexe A) ; le reste
    // du catalogue phyto/rodenticide/insecticide est toxique par défaut.
    const isToxic = p.category !== "glue_board";
    const code = p.code.toUpperCase();

    const existing = await Product.findOne({ code });
    if (existing) {
      existing.name = p.name;
      existing.category = p.category;
      existing.isToxic = isToxic;
      if (p.activeSubstance) existing.activeSubstance = p.activeSubstance;
      if (p.concentration) existing.concentration = p.concentration;
      await existing.save();
      updated++;
    } else {
      await Product.create({
        code,
        name: p.name,
        category: p.category,
        isToxic,
        activeSubstance: p.activeSubstance,
        concentration: p.concentration,
      });
      created++;
    }
  }

  console.log(`✅ Seed produits terminé : ${created} créés, ${updated} mis à jour (${products.length} au total).`);

  await disconnectDB();
  await mongoose.disconnect().catch(() => {});
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Échec du seed produits :", err);
  process.exit(1);
});
