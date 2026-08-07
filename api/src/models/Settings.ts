import { Schema, model, type Document } from "mongoose";

/**
 * Paramètres système (§9 : "seuils IA, matrices de risque, templates de
 * commentaires") — document singleton (une seule instance, toujours la même
 * clé `singleton`). Modifiable par le Super Admin uniquement (§2).
 */
export interface ISettings extends Document {
  singleton: "main";
  aiConfidenceThreshold: number; // §7.4 : sous ce seuil, champ marqué "à vérifier"
  riskMoyenMax: number; // §8 : jusqu'à N consommations -> risque "Moyen"
  riskEleveMinCaptures: number; // §8 : à partir de N captures -> risque "Élevé"
  updatedAt: Date;
}

const settingsSchema = new Schema<ISettings>(
  {
    singleton: { type: String, default: "main", unique: true },
    aiConfidenceThreshold: { type: Number, default: 0.75, min: 0, max: 1 },
    riskMoyenMax: { type: Number, default: 3, min: 0 },
    riskEleveMinCaptures: { type: Number, default: 1, min: 0 },
  },
  { timestamps: true },
);

export const Settings = model<ISettings>("Settings", settingsSchema);
