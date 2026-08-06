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
  desinsectisation?: { lignes: unknown[] };
}

export interface ZoneDto {
  zoneLabel: string;
  postes: Array<Record<string, unknown>>;
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
