import * as XLSX from "xlsx";
import { Client } from "../models/Client";
import { Site } from "../models/Site";
import { Fiche, type IFiche } from "../models/Fiche";
import { Report } from "../models/Report";
import { User } from "../models/User";
import { ApiError } from "../middlewares/errorHandler";
import { totalsForFiche } from "./reportCalculations";

/**
 * Export Excel d'un site (§9) — 3 feuilles :
 *  1. "Plan" — le plan de zones/postes configuré (§6.2).
 *  2. "Fiches" — une ligne par fiche scannée sur ce site, la plus récente
 *     en premier (§11 "les fiches de chaque jour").
 *  3. "Rapports" — les rapports déjà générés pour ce site, tous types de
 *     période confondus (jour/semaine/quinzaine/mois/trimestre/semestre/
 *     année, cf. computePeriodBounds).
 */
export async function generateSiteExcel(clientId: string, siteId: string): Promise<Buffer> {
  const [client, site] = await Promise.all([Client.findById(clientId), Site.findById(siteId)]);
  if (!client) throw new ApiError(404, "Client introuvable");
  if (!site || site.clientId.toString() !== clientId) throw new ApiError(404, "Site introuvable");

  const [fiches, reports] = await Promise.all([
    Fiche.find({ clientId, siteId }).sort({ interventionDate: -1 }),
    Report.find({ clientId, siteId }).sort({ "period.from": -1 }),
  ]);

  const agentIds = [...new Set(fiches.map((f) => f.createdByAgentId.toString()))];
  const agents = await User.find({ _id: { $in: agentIds } }).select("fullName").lean();
  const agentNameById = new Map(agents.map((a) => [a._id.toString(), a.fullName]));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, buildPlanSheet(client.name, site.name, site.zonesConfig), "Plan");
  XLSX.utils.book_append_sheet(wb, buildFichesSheet(fiches, agentNameById), "Fiches");
  XLSX.utils.book_append_sheet(wb, buildReportsSheet(reports), "Rapports");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

interface ZoneConfigLike {
  label: string;
  postCount: number;
}

function buildPlanSheet(
  clientName: string,
  siteName: string,
  zonesConfig: { externalZones?: ZoneConfigLike[]; internalZones?: ZoneConfigLike[] } | undefined,
): XLSX.WorkSheet {
  const rows: Array<Record<string, string | number>> = [
    { Client: clientName, Site: siteName, "Type de zone": "", "Libellé zone": "", "Nombre de postes": "" },
  ];

  for (const z of zonesConfig?.externalZones ?? []) {
    rows.push({ Client: "", Site: "", "Type de zone": "Externe", "Libellé zone": z.label, "Nombre de postes": z.postCount });
  }
  for (const z of zonesConfig?.internalZones ?? []) {
    rows.push({ Client: "", Site: "", "Type de zone": "Interne", "Libellé zone": z.label, "Nombre de postes": z.postCount });
  }
  if (!zonesConfig?.externalZones?.length && !zonesConfig?.internalZones?.length) {
    rows.push({ Client: "", Site: "", "Type de zone": "—", "Libellé zone": "Aucun plan de postes défini", "Nombre de postes": "" });
  }

  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [{ wch: 22 }, { wch: 22 }, { wch: 12 }, { wch: 28 }, { wch: 16 }];
  return ws;
}

function countPostesTotal(fiche: IFiche): { externes: number; internes: number } {
  const externes = ((fiche.deratExterne?.zones ?? []) as Array<{ postes: unknown[] }>).reduce(
    (sum, z) => sum + z.postes.length,
    0,
  );
  const internes = ((fiche.deratInterne?.zones ?? []) as Array<{ postes: unknown[] }>).reduce(
    (sum, z) => sum + z.postes.length,
    0,
  );
  return { externes, internes };
}

function buildFichesSheet(fiches: IFiche[], agentNameById: Map<string, string>): XLSX.WorkSheet {
  const rows = fiches.map((f) => {
    const totals = totalsForFiche(f);
    const postes = countPostesTotal(f);
    return {
      Date: new Date(f.interventionDate).toLocaleDateString("fr-FR"),
      Statut: f.status,
      Agent: agentNameById.get(f.createdByAgentId.toString()) ?? "—",
      "Postes externes": postes.externes,
      "Postes internes": postes.internes,
      "Appâts consommés": totals.appatsConsommes,
      Cadavres: totals.cadavres,
      "Confiance OCR": f.ocrConfidence != null ? Math.round(f.ocrConfidence * 100) + "%" : "—",
      Source: f.source,
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ Date: "Aucune fiche sur ce site" }]);
  ws["!cols"] = [{ wch: 12 }, { wch: 16 }, { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 10 }, { wch: 13 }, { wch: 10 }];
  return ws;
}

function buildReportsSheet(reports: InstanceType<typeof Report>[]): XLSX.WorkSheet {
  const rows = reports.map((r) => {
    const conclusion = (r.deratisation as { conclusion?: { risqueActuel?: string; evolution?: string } } | undefined)
      ?.conclusion;
    return {
      Période: r.period.label,
      Type: r.period.type,
      Statut: r.status,
      "Risque actuel": conclusion?.risqueActuel ?? "—",
      Évolution: conclusion?.evolution ?? "—",
      "Du": new Date(r.period.from).toLocaleDateString("fr-FR"),
      "Au": new Date(r.period.to).toLocaleDateString("fr-FR"),
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ Période: "Aucun rapport généré pour ce site" }]);
  ws["!cols"] = [{ wch: 24 }, { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
  return ws;
}
