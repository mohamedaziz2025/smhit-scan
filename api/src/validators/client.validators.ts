import { z } from "zod";

export const createClientSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
});

export const updateClientSchema = createClientSchema.partial().extend({
  isActive: z.boolean().optional(),
});

const zoneConfigSchema = z.object({ label: z.string().min(1), postCount: z.number().int().min(0) });

export const createSiteSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  zonesConfig: z
    .object({
      externalZones: z.array(zoneConfigSchema).default([]),
      internalZones: z.array(zoneConfigSchema).default([]),
    })
    .optional(),
});

export const updateSiteSchema = createSiteSchema.partial().extend({
  isActive: z.boolean().optional(),
});
