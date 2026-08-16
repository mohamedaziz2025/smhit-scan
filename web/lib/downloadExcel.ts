import { api } from "./api";

/**
 * Export Excel d'un site (§9/§11) — même contrainte d'auth que le PDF
 * (Bearer token, un <a href> brut ne le porterait pas) mais pas le même
 * piège de popup-blocker : un fichier .xlsx est un téléchargement direct,
 * pas un nouvel onglet, donc un clic synthétique sur un <a download> après
 * l'await suffit (pas de window.open à ouvrir avant coup).
 */
export async function downloadSiteExcel(clientId: string, siteId: string, siteName: string): Promise<void> {
  const response = await api.get("/reports/site-export", {
    params: { clientId, siteId },
    responseType: "blob",
  });
  const url = URL.createObjectURL(response.data as Blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `export-${siteName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.xlsx`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
