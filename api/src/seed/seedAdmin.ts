import mongoose from "mongoose";
import { connectDB } from "../config/db";
import { createUserWithPassword } from "../services/auth.service";
import { UserRole } from "../types/enums";

/**
 * Crée le premier compte Super Admin si aucun n'existe encore.
 * Identifiants pilotés par variables d'env pour ne jamais committer de secret :
 *   SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD / SEED_ADMIN_NAME
 */
async function seed() {
  await connectDB();

  const email = process.env.SEED_ADMIN_EMAIL ?? "superadmin@smhit.local";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";
  const fullName = process.env.SEED_ADMIN_NAME ?? "Super Admin SMHIT";

  try {
    const user = await createUserWithPassword({ fullName, email, password, role: UserRole.SUPER_ADMIN });
    console.log(`✅ Super Admin créé : ${user.email}`);
    if (!process.env.SEED_ADMIN_PASSWORD) {
      console.log(`   Mot de passe par défaut : "${password}" — à changer immédiatement.`);
    }
  } catch (err) {
    console.log(`ℹ️  ${(err as Error).message}`);
  }

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("❌ Échec du seed admin :", err);
  process.exit(1);
});
