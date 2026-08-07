import { Settings, type ISettings } from "../models/Settings";

/** Renvoie le singleton de paramètres, le crée avec les valeurs par défaut au premier accès. */
export async function getSettings(): Promise<ISettings> {
  const existing = await Settings.findOne({ singleton: "main" });
  if (existing) return existing;
  return Settings.create({ singleton: "main" });
}

export async function updateSettings(patch: Partial<Pick<ISettings, "aiConfidenceThreshold" | "riskMoyenMax" | "riskEleveMinCaptures">>): Promise<ISettings> {
  const settings = await getSettings();
  Object.assign(settings, patch);
  await settings.save();
  return settings;
}
