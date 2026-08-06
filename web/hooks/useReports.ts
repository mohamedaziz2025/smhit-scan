import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface ReportDto {
  _id: string;
  clientId: string;
  siteId: string;
  status: string;
  period: { type: string; from: string; to: string; label: string };
  adminRecommendations?: string;
  pdfUrl?: string;
  deratisation?: {
    interventions: Array<{
      index: number;
      zonesExternes: Array<{ zone: string; nbPiege: number; nbPrise: number; pctPrise: number; nbCadavre: number; pctCadavre: number }>;
      zonesInternes: Array<{ zone: string; nbPiege: number; nbCadavre: number; indiceCapture: number }>;
      commentairesExternes: string[];
      commentairesInternes: string[];
    }>;
    tendance?: { months: Array<{ month: string; appatsConsommes: number; cadavres: number; tendance: string; risque: string }> };
    conclusion?: { interpretation: string; risqueActuel: string; evolution: string; actionRecommandee: string };
  };
  desinsectisation?: { zonesTraitees: string[]; produits: unknown[]; conclusion: string };
}

export function useReports(params: { clientId?: string; status?: string } = {}) {
  return useQuery({
    queryKey: ["reports", params],
    queryFn: async () => {
      const { data } = await api.get("/reports", { params: { limit: 50, ...params } });
      return data as { items: ReportDto[]; total: number };
    },
  });
}

export function useReport(id: string | undefined) {
  return useQuery({
    queryKey: ["report", id],
    queryFn: async () => {
      const { data } = await api.get(`/reports/${id}`);
      return data as ReportDto;
    },
    enabled: !!id,
  });
}

export function usePatchReport(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { adminRecommendations?: string }) => {
      const { data } = await api.patch(`/reports/${id}`, body);
      return data as ReportDto;
    },
    onSuccess: (data) => qc.setQueryData(["report", id], data),
  });
}

export function useValidateReport(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/reports/${id}/validate`);
      return data as ReportDto;
    },
    onSuccess: (data) => qc.setQueryData(["report", id], data),
  });
}

export function useReturnReport(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reason?: string) => {
      const { data } = await api.post(`/reports/${id}/return`, { reason });
      return data as ReportDto;
    },
    onSuccess: (data) => qc.setQueryData(["report", id], data),
  });
}
