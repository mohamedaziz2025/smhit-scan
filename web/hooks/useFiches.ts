import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface FicheDto {
  _id: string;
  clientId: string;
  siteId: string;
  status: string;
  source: string;
  interventionDate: string;
  createdByAgentId: string;
  scanImageUrls: string[];
  ocrConfidence?: number;
  deratExterne?: { zones: ZoneDto[] };
  deratInterne?: { zones: ZoneDto[] };
  desinsectisation?: { lignes: LigneDesinsectDto[]; observationsGenerales?: string };
}

export interface ProduitDto {
  refCode?: string;
  name?: string;
  codeProduit?: string;
  numLot?: string;
  concentration?: string;
  dlc?: string;
}

export interface PosteDto {
  posteNo: number;
  // Dératisation externe : intact/appatAltere/presenceCadavres/consomme/disparu.
  // Dératisation interne : intact/plaqueAlteree/presenceCadavres/disparu.
  etatAppat?: Record<string, boolean>;
  etatPlaque?: Record<string, boolean>;
  action?: { remplace?: boolean };
  produit?: ProduitDto;
  etatPorteAppat?: { inaccessible?: boolean; disparu?: boolean; malFixe?: boolean; casse?: boolean };
}

export interface ZoneDto {
  zoneLabel: string;
  postes: PosteDto[];
}

export interface LigneDesinsectDto {
  zoneTraitee: string;
  produit?: ProduitDto;
  observations?: string;
}

export function useFiches(params: { clientId?: string; status?: string; page?: number } = {}) {
  return useQuery({
    queryKey: ["fiches", params],
    queryFn: async () => {
      const { data } = await api.get("/fiches", { params: { limit: 20, ...params } });
      return data as { items: FicheDto[]; total: number };
    },
  });
}

export function useFiche(id: string | undefined) {
  return useQuery({
    queryKey: ["fiche", id],
    queryFn: async () => {
      const { data } = await api.get(`/fiches/${id}`);
      return data as FicheDto;
    },
    enabled: !!id,
  });
}
