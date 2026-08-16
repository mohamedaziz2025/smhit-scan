import { z } from "zod";

export const scanFicheSchema = z.object({
  clientId: z.string().min(1),
  siteId: z.string().min(1),
  interventionDate: z.coerce.date().optional(), // défaut : aujourd'hui
});

const produitUseSchema = z.object({
  refCode: z.string().optional(),
  name: z.string().optional(),
  codeProduit: z.string().optional(),
  numLot: z.string().optional(),
});

const etatPorteAppatSchema = z.object({
  inaccessible: z.boolean().optional(),
  disparu: z.boolean().optional(),
  malFixe: z.boolean().optional(),
  casse: z.boolean().optional(),
});

const actionSchema = z.object({ remplace: z.boolean().optional() });

const posteExterneSchema = z.object({
  posteNo: z.number().int(),
  etatAppat: z
    .object({
      intact: z.boolean().optional(),
      appatAltere: z.boolean().optional(),
      presenceCadavres: z.boolean().optional(),
      consomme: z.boolean().optional(),
      disparu: z.boolean().optional(),
    })
    .optional(),
  action: actionSchema.optional(),
  produit: produitUseSchema.optional(),
  etatPorteAppat: etatPorteAppatSchema.optional(),
});

const zoneExterneSchema = z.object({
  zoneLabel: z.string().min(1),
  postes: z.array(posteExterneSchema).default([]),
});

const posteInterneSchema = z.object({
  posteNo: z.number().int(),
  etatPlaque: z
    .object({
      intact: z.boolean().optional(),
      plaqueAlteree: z.boolean().optional(),
      presenceCadavres: z.boolean().optional(),
      disparu: z.boolean().optional(),
    })
    .optional(),
  action: actionSchema.optional(),
  produit: produitUseSchema.optional(),
  etatPorteAppat: etatPorteAppatSchema.optional(),
});

const zoneInterneSchema = z.object({
  zoneLabel: z.string().min(1),
  postes: z.array(posteInterneSchema).default([]),
});

const ligneDesinsectSchema = z.object({
  zoneTraitee: z.string().min(1),
  produit: produitUseSchema.extend({ concentration: z.string().optional(), dlc: z.string().optional() }).optional(),
  observations: z.string().optional(),
});

const signataireSchema = z.object({ name: z.string().optional(), visaUrl: z.string().optional() });

export const updateFicheSchema = z.object({
  deratExterne: z.object({ zones: z.array(zoneExterneSchema) }).optional(),
  deratInterne: z.object({ zones: z.array(zoneInterneSchema) }).optional(),
  desinsectisation: z
    .object({
      lignes: z.array(ligneDesinsectSchema).optional(),
      signatures: z
        .object({
          agent: signataireSchema.optional(),
          hygienisteSMHIT: signataireSchema.optional(),
          responsableClient: signataireSchema.optional(),
        })
        .optional(),
      observationsGenerales: z.string().optional(),
    })
    .optional(),
  interventionsCount: z.number().int().min(1).optional(),
});

export const listFichesQuerySchema = z.object({
  clientId: z.string().optional(),
  siteId: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  status: z.string().optional(),
  agentId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
