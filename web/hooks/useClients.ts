import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface ClientDto {
  _id: string;
  name: string;
  code?: string;
  isActive: boolean;
}

export interface ZoneConfigDto {
  label: string;
  postCount: number;
}

export interface SiteDto {
  _id: string;
  clientId: string;
  name: string;
  address?: string;
  zonesConfig?: {
    externalZones: ZoneConfigDto[];
    internalZones: ZoneConfigDto[];
  };
}

export function useClients(search?: string) {
  return useQuery({
    queryKey: ["clients", search],
    queryFn: async () => {
      const { data } = await api.get("/clients", { params: { search, limit: 100 } });
      return data.items as ClientDto[];
    },
  });
}

export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: ["client", id],
    queryFn: async () => {
      const { data } = await api.get(`/clients/${id}`);
      return data as ClientDto;
    },
    enabled: !!id,
  });
}

export function useSites(clientId: string | undefined) {
  return useQuery({
    queryKey: ["sites", clientId],
    queryFn: async () => {
      const { data } = await api.get(`/clients/${clientId}/sites`);
      return data as SiteDto[];
    },
    enabled: !!clientId,
  });
}

/** Création de site + plan de postes (§6.2) — Admin+SuperAdmin (§2). */
export function useCreateSite(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; zonesConfig?: SiteDto["zonesConfig"] }) => {
      const { data } = await api.post(`/clients/${clientId}/sites`, input);
      return data as SiteDto;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sites", clientId] }),
  });
}

/** Modification du plan de postes d'un site existant — SuperAdmin uniquement (§2). */
export function useUpdateSite(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ siteId, ...input }: { siteId: string; name?: string; zonesConfig?: SiteDto["zonesConfig"] }) => {
      const { data } = await api.patch(`/clients/${clientId}/sites/${siteId}`, input);
      return data as SiteDto;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sites", clientId] }),
  });
}
