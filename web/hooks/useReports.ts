import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface SiteRowDto {
  siteId: string;
  siteName: string;
  dateRealisation: string | null;
  piegesPrevus: number;
  presents: number;
  disparus: number;
  endommages: number;
  inaccessibles: number;
  appatsConsommes: number;
  tauxDisparition: number;
  tauxEndommagement: number;
  tauxCouverture: number;
  tauxConsommation: number;
  observation: string;
}

export interface ReportDto {
  _id: string;
  clientId: string;
  siteId?: string;
  type: "STANDARD" | "MAGASINS";
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
  magasins?: {
    kpis: {
      nombreMagasinsSuivis: number;
      nombreMagasinsTotal: number;
      interventionsRealisees: number;
      tauxRealisation: number;
      nombreTotalPieges: number;
      piegesDisparus: number;
      piegesEndommages: number;
      appatsConsommes: number;
      sitesAvecActivite: number;
    };
    produitsUtilises: Array<{ type: string; produit: string; activeSubstance: string }>;
    suiviInterventions: SiteRowDto[];
    nonConformites: Array<{ numero: number; magasin: string; constat: string; actionCorrective: string; responsable: string; echeance: string | null }>;
    conclusion?: string;
  };
}

export function useReports(
  params: { clientId?: string; siteId?: string; status?: string; from?: string; to?: string } = {},
) {
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

export type ReportPeriodType = "DAY" | "WEEK" | "FORTNIGHT" | "MONTH" | "QUARTER" | "SEMESTER" | "YEAR";

/**
 * Génération à la demande d'un rapport standard pour un site (§8/§9) —
 * n'importe quel type de période (jour/semaine/quinzaine/mois/trimestre/
 * semestre/année), pas seulement le mois calendaire. `date` : n'importe
 * quel jour à l'intérieur de la période visée, le serveur calcule les
 * bornes exactes (computePeriodBounds, api/src/utils/date.ts).
 */
export function useGenerateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { clientId: string; siteId: string; periodType: ReportPeriodType; date: string }) => {
      const { data } = await api.post("/reports/generate", input);
      return data as ReportDto;
    },
    onSuccess: (data) => {
      qc.setQueryData(["report", data._id], data);
      qc.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}

/** Rapport Spécifique des Magasins (§ multi-sites) — agrège tous les locaux d'un client. */
export function useGenerateMagasinsReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { clientId: string; month: number; year: number }) => {
      const { data } = await api.post("/reports/magasins/generate", input);
      return data as ReportDto;
    },
    onSuccess: (data) => {
      qc.setQueryData(["report", data._id], data);
      qc.invalidateQueries({ queryKey: ["reports"] });
    },
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
