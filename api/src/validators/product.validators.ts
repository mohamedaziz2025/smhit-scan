import { z } from "zod";
import { ProductCategory } from "../types/enums";

export const createProductSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  category: z.nativeEnum(ProductCategory),
  activeSubstance: z.string().optional(),
  concentration: z.string().optional(),
  usageType: z.enum(["appat_chimique", "plaque_colle", "insecticide"]).optional(),
  isToxic: z.boolean().optional(),
  aliases: z.array(z.string()).optional(),
});

export const updateProductSchema = createProductSchema.partial().extend({
  isActive: z.boolean().optional(),
});
