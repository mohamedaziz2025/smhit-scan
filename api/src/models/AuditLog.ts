import { Schema, model, type Document, type Types } from "mongoose";

export interface IAuditLog extends Document {
  actorId: Types.ObjectId;
  role: string;
  action: string; // ex "FICHE_VALIDATED", "REPORT_EDITED"
  entity: string; // ex "Fiche", "Report", "User"
  entityId: Types.ObjectId;
  diff?: Record<string, unknown>;
  ip?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, required: true },
    action: { type: String, required: true },
    entity: { type: String, required: true },
    entityId: { type: Schema.Types.ObjectId, required: true },
    diff: { type: Schema.Types.Mixed },
    ip: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditLogSchema.index({ entity: 1, entityId: 1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });

export const AuditLog = model<IAuditLog>("AuditLog", auditLogSchema);
