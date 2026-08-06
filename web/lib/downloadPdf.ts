import { api } from "./api";

/**
 * Le endpoint /reports/:id/pdf exige un Bearer token (§13) — un simple lien
 * <a href> ne l'enverrait pas. On récupère le PDF en blob via le client API
 * authentifié, puis on l'ouvre dans un nouvel onglet.
 */
export async function openReportPdf(reportId: string): Promise<void> {
  const response = await api.get(`/reports/${reportId}/pdf`, { responseType: "blob" });
  const url = URL.createObjectURL(response.data as Blob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
