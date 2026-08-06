import { Schema, model, type Document, type Types } from "mongoose";
import { UserRole } from "../types/enums";

export interface IUser extends Document {
  fullName: string;
  email: string;
  phone?: string;
  passwordHash: string;
  role: UserRole;
  scope?: { clientIds?: Types.ObjectId[] };
  signatureImageUrl?: string;
  isActive: boolean;
  refreshTokenHash?: string;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: Object.values(UserRole), required: true, default: UserRole.AGENT },
    scope: {
      clientIds: [{ type: Schema.Types.ObjectId, ref: "Client" }],
    },
    signatureImageUrl: { type: String },
    isActive: { type: Boolean, default: true },
    refreshTokenHash: { type: String, select: false },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

userSchema.index({ role: 1 });

export const User = model<IUser>("User", userSchema);
