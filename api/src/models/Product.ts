import { Schema, model, type Document } from "mongoose";
import { ProductCategory } from "../types/enums";

export interface IProduct extends Document {
  code: string;
  name: string;
  category: ProductCategory;
  activeSubstance?: string;
  concentration?: string;
  usageType?: "appat_chimique" | "plaque_colle" | "insecticide";
  isToxic: boolean;
  aliases?: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, enum: Object.values(ProductCategory), required: true },
    activeSubstance: { type: String, trim: true },
    concentration: { type: String, trim: true },
    usageType: { type: String, enum: ["appat_chimique", "plaque_colle", "insecticide"] },
    isToxic: { type: Boolean, default: true },
    // Variantes OCR possibles du nom (fautes de frappe fréquentes, casse, etc.) — §6.3.
    aliases: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

productSchema.index({ name: "text", aliases: "text" });

export const Product = model<IProduct>("Product", productSchema);
