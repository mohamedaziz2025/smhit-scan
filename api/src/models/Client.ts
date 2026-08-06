import { Schema, model, type Document } from "mongoose";

export interface IClient extends Document {
  name: string;
  code?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const clientSchema = new Schema<IClient>(
  {
    // Nom du client — sert au matching OCR (nom lu sur la fiche papier), §6.2.
    name: { type: String, required: true, unique: true, trim: true },
    code: { type: String, trim: true },
    contactName: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

clientSchema.index({ name: "text" });

export const Client = model<IClient>("Client", clientSchema);
