import { Schema, model, type Document, type Types } from "mongoose";
import { PeriodType, ReportStatus, ReportType } from "../types/enums";

export interface IReport extends Document {
  ficheIds: Types.ObjectId[];
  clientId: Types.ObjectId;
  siteId?: Types.ObjectId; // absent pour un rapport MAGASINS (multi-sites)
  type: ReportType;
  period: { type: PeriodType; from: Date; to: Date; label: string };
  status: ReportStatus;
  deratisation?: unknown;
  desinsectisation?: unknown;
  magasins?: unknown; // agrégat multi-sites (§ Rapport Spécifique des magasins)
  adminRecommendations?: string;
  adminEdits?: Record<string, unknown>;
  pdfUrl?: string;
  createdByAgentAuto: boolean;
  reviewedByAdminId?: Types.ObjectId;
  validatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const periodSchema = new Schema(
  {
    type: { type: String, enum: Object.values(PeriodType), required: true },
    from: { type: Date, required: true },
    to: { type: Date, required: true },
    label: { type: String, required: true }, // ex "Juillet 2026"
  },
  { _id: false },
);

const reportSchema = new Schema<IReport>(
  {
    ficheIds: [{ type: Schema.Types.ObjectId, ref: "Fiche", required: true }],
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true },
    siteId: { type: Schema.Types.ObjectId, ref: "Site" },
    type: { type: String, enum: Object.values(ReportType), default: ReportType.STANDARD },
    period: { type: periodSchema, required: true },
    status: { type: String, enum: Object.values(ReportStatus), default: ReportStatus.PENDING_ADMIN },

    // Données calculées (§8), stockées pour audit — schéma libre car dérivé,
    // recalculable via POST /reports/generate ou /reports/magasins/generate.
    deratisation: { type: Schema.Types.Mixed },
    desinsectisation: { type: Schema.Types.Mixed },
    magasins: { type: Schema.Types.Mixed },

    adminRecommendations: { type: String, trim: true },
    adminEdits: { type: Schema.Types.Mixed },
    pdfUrl: { type: String },
    createdByAgentAuto: { type: Boolean, default: true },
    reviewedByAdminId: { type: Schema.Types.ObjectId, ref: "User" },
    validatedAt: { type: Date },
  },
  { timestamps: true },
);

reportSchema.index({ clientId: 1, "period.from": -1 });
reportSchema.index({ status: 1 });

export const Report = model<IReport>("Report", reportSchema);
