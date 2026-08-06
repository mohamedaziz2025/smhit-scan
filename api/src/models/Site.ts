import { Schema, model, type Document, type Types } from "mongoose";

interface IZoneConfig {
  label: string;
  postCount: number;
}

export interface ISite extends Document {
  clientId: Types.ObjectId;
  name: string; // "Site Client" de la fiche papier
  address?: string;
  zonesConfig?: {
    externalZones: IZoneConfig[];
    internalZones: IZoneConfig[];
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const zoneConfigSchema = new Schema<IZoneConfig>(
  {
    label: { type: String, required: true },
    postCount: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const siteSchema = new Schema<ISite>(
  {
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true },
    name: { type: String, required: true, trim: true },
    address: { type: String, trim: true },
    zonesConfig: {
      externalZones: { type: [zoneConfigSchema], default: [] },
      internalZones: { type: [zoneConfigSchema], default: [] },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

siteSchema.index({ clientId: 1, name: 1 }, { unique: true });

export const Site = model<ISite>("Site", siteSchema);
