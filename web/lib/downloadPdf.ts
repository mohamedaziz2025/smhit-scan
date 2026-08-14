import { api } from "./api";

/**
 * Le endpoint /reports/:id/pdf exige un Bearer token (§13) — un simple lien
 * <a href> ne l'enverrait pas. On récupère le PDF en blob via le client API
 * authentifié, puis on l'ouvre dans un nouvel onglet.
 *
 * Piège : `window.open()` doit être appelé *synchronement* dans le
 * gestionnaire de clic pour être reconnu comme un geste utilisateur — après
 * un `await`, les navigateurs le bloquent silencieusement (bloqueur de
 * popups), sans erreur visible : le bouton semblait juste ne rien faire.
 * On ouvre donc l'onglet vide tout de suite, puis on le redirige une fois
 * le blob prêt.
 */
export async function openReportPdf(reportId: string): Promise<void> {
  const win = window.open("", "_blank");

  try {
    const response = await api.get(`/reports/${reportId}/pdf`, { responseType: "blob" });
    const url = URL.createObjectURL(response.data as Blob);

    if (win) {
      win.location.href = url;
    } else {
      // Popup bloquée malgré tout (rare) — repli sur un téléchargement direct.
      const link = document.createElement("a");
      link.href = url;
      link.download = `rapport-${reportId}.pdf`;
      link.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (err) {
    win?.close();
    throw err;
  }
}
