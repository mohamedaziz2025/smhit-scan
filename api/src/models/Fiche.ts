import { Schema, model, type Document, type Types } from "mongoose";
import { FicheStatus } from "../types/enums";

/* ------------------------------------------------------------------ */
/* Sous-documents partagés                                            */
/* ------------------------------------------------------------------ */

interface IProduitUse {
  refCode?: string; // résolu depuis refCode_raw par l'IA/agent
  name?: string;
  codeProduit?: string;
  numLot?: string;
}

const produitUseSchema = new Schema<IProduitUse>(
  {
    refCode: { type: String, uppercase: true, trim: true },
    name: { type: String, trim: true },
    codeProduit: { type: String, trim: true },
    numLot: { type: String, trim: true },
  },
  { _id: false },
);

interface IEtatPorteAppat {
  inaccessible: boolean;
  disparu: boolean;
  malFixe: boolean;
  casse: boolean;
}

const etatPorteAppatSchema = new Schema<IEtatPorteAppat>(
  {
    inaccessible: { type: Boolean, default: false },
    disparu: { type: Boolean, default: false },
    malFixe: { type: Boolean, default: false },
    casse: { type: Boolean, default: false },
  },
  { _id: false },
);

const actionSchema = new Schema({ remplace: { type: Boolean, default: false } }, { _id: false });

/* ------------------------------------------------------------------ */
/* Dératisation zones externes                                        */
/* ------------------------------------------------------------------ */

const etatAppatSchema = new Schema(
  {
    intact: { type: Boolean, default: false },
    appatAltere: { type: Boolean, default: false },
    presenceCadavres: { type: Boolean, default: false },
    consomme: { type: Boolean, default: false },
    disparu: { type: Boolean, default: false },
  },
  { _id: false },
);

const posteExterneSchema = new Schema(
  {
    posteNo: { type: Number, required: true },
    etatAppat: { type: etatAppatSchema, default: () => ({}) },
    action: { type: actionSchema, default: () => ({}) },
    produit: { type: produitUseSchema, default: () => ({}) },
    etatPorteAppat: { type: etatPorteAppatSchema, default: () => ({}) },
  },
  { _id: false },
);

const zoneExterneSchema = new Schema(
  {
    zoneLabel: { type: String, required: true },
    postes: { type: [posteExterneSchema], default: [] },
  },
  { _id: false },
);

/* ------------------------------------------------------------------ */
/* Dératisation zones internes (plaques à colle)                      */
/* ------------------------------------------------------------------ */

const etatPlaqueSchema = new Schema(
  {
    intact: { type: Boolean, default: false },
    plaqueAlteree: { type: Boolean, default: false },
    presenceCadavres: { type: Boolean, default: false },
    disparu: { type: Boolean, default: false },
  },
  { _id: false },
);

const posteInterneSchema = new Schema(
  {
    posteNo: { type: Number, required: true },
    etatPlaque: { type: etatPlaqueSchema, default: () => ({}) },
    action: { type: actionSchema, default: () => ({}) },
    produit: { type: produitUseSchema, default: () => ({}) },
    etatPorteAppat: { type: etatPorteAppatSchema, default: () => ({}) },
  },
  { _id: false },
);

const zoneInterneSchema = new Schema(
  {
    zoneLabel: { type: String, required: true },
    postes: { type: [posteInterneSchema], default: [] },
  },
  { _id: false },
);

/* ------------------------------------------------------------------ */
/* Désinsectisation                                                    */
/* ------------------------------------------------------------------ */

const produitDesinsectSchema = new Schema(
  {
    refCode: { type: String, uppercase: true, trim: true },
    name: { type: String, trim: true },
    codeProduit: { type: String, trim: true },
    concentration: { type: String, trim: true },
    numLot: { type: String, trim: true },
    dlc: { type: String, trim: true },
  },
  { _id: false },
);

const ligneDesinsectSchema = new Schema(
  {
    zoneTraitee: { type: String, required: true }, // "clôture externe", "regards", "vestiaires"...
    produit: { type: produitDesinsectSchema, default: () => ({}) },
    observations: { type: String, trim: true },
  },
  { _id: false },
);

const signataireSchema = new Schema(
  { name: { type: String, trim: true }, visaUrl: { type: String } },
  { _id: false },
);

const signaturesSchema = new Schema(
  {
    agent: { type: signataireSchema, default: () => ({}) },
    hygienisteSMHIT: { type: signataireSchema, default: () => ({}) },
    responsableClient: { type: signataireSchema, default: () => ({}) },
  },
  { _id: false },
);

/* ------------------------------------------------------------------ */
/* Fiche                                                                */
/* ------------------------------------------------------------------ */

export interface IFiche extends Document {
  clientId: Types.ObjectId;
  siteId: Types.ObjectId;
  interventionDate: Date;
  createdByAgentId: Types.ObjectId;
  status: FicheStatus;
  source: "CAMERA" | "UPLOAD";
  scanImageUrls: string[];
  ocrJobId?: string;
  ocrConfidence?: number;
  interventionsCount: number;
  deratExterne?: { zones: unknown[] };
  deratInterne?: { zones: unknown[] };
  desinsectisation?: {
    lignes: unknown[];
    signatures?: unknown;
    observationsGenerales?: string;
  };
  agentValidatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ficheSchema = new Schema<IFiche>(
  {
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true },
    siteId: { type: Schema.Types.ObjectId, ref: "Site", required: true },
    interventionDate: { type: Date, required: true }, // normalisée à minuit UTC du site
    createdByAgentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: Object.values(FicheStatus), default: FicheStatus.SCANNING },
    source: { type: String, enum: ["CAMERA", "UPLOAD"], required: true },
    scanImageUrls: { type: [String], default: [] },
    ocrJobId: { type: String },
    ocrConfidence: { type: Number, min: 0, max: 1 },
    interventionsCount: { type: Number, default: 1 },

    deratExterne: {
      zones: { type: [zoneExterneSchema], default: undefined },
    },
    deratInterne: {
      zones: { type: [zoneInterneSchema], default: undefined },
    },
    desinsectisation: {
      lignes: { type: [ligneDesinsectSchema], default: undefined },
      signatures: { type: signaturesSchema },
      observationsGenerales: { type: String, trim: true },
    },

    agentValidatedAt: { type: Date },
  },
  { timestamps: true },
);

// Règle métier §5 : une seule fiche par client+site+jour (les 2 passages du
// jour vont sur la même fiche, cf. interventionsCount).
ficheSchema.index({ clientId: 1, siteId: 1, interventionDate: 1 }, { unique: true });
ficheSchema.index({ createdByAgentId: 1, status: 1 });
ficheSchema.index({ status: 1, interventionDate: -1 });

export const Fiche = model<IFiche>("Fiche", ficheSchema);
