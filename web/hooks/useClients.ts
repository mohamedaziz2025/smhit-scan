import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface ClientDto {
  _id: string;
  name: string;
  code?: string;
  isActive: boolean;
}

export interface SiteDto {
  _id: string;
  clientId: string;
  name: string;
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
