import { Router } from "express";
import { Report } from "../models/Report";
import { UserRole, ReportStatus } from "../types/enums";
import { requireAuth, requireRole } from "../middlewares/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../middlewares/errorHandler";
import { canAccessClient } from "../utils/scope";
import { auditFromRequest } from "../utils/audit";
import { generateAndStoreReportPdf, streamReportPdf } from "../services/reportPdf.service";
import { generateReportForPeriod, recomputeReport } from "../services/report.service";
import {
  generateReportSchema,
  listReportsQuerySchema,
  patchReportSchema,
  returnReportSchema,
} from "../validators/report.validators";

// Rapports — §9. Consultation/édition réservée Admin+SuperAdmin (§2 : l'agent
// n'a pas accès aux rapports, la génération est automatique côté agent).
export const reportsRouter = Router();
reportsRouter.use(requireAuth, requireRole(UserRole.ADMIN, UserRole.SUPER_ADMIN));

reportsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = listReportsQuerySchema.parse(req.query);
    const filter: Record<string, unknown> = {};
    if (query.clientId) filter.clientId = query.clientId;
    if (query.status) filter.status = query.status;
    if (query.period) filter["period.type"] = query.period;
    if (query.from || query.to) {
      filter["period.from"] = { ...(query.from ? { $gte: query.from } : {}), ...(query.to ? { $lte: query.to } : {}) };
    }

    const [items, total] = await Promise.all([
      Report.find(filter)
        .sort({ "period.from": -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit),
      Report.countDocuments(filter),
    ]);

    res.json({ items, total, page: query.page, limit: query.limit });
  }),
);

reportsRouter.post(
  "/generate",
  asyncHandler(async (req, res) => {
    const input = generateReportSchema.parse(req.body);
    if (!(await canAccessClient(req.auth!, input.clientId))) throw new ApiError(403, "Hors de votre périmètre");

    const report = await generateReportForPeriod(input.clientId, input.siteId, input.month, input.year);
    await auditFromRequest(req, "REPORT_GENERATED", "Report", report.id, input);
    res.json(report);
  }),
);

reportsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const report = await Report.findById(req.params.id);
    if (!report) throw new ApiError(404, "Rapport introuvable");
    if (!(await canAccessClient(req.auth!, report.clientId))) throw new ApiError(403, "Hors de votre périmètre");
    res.json(report);
  }),
);

reportsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const report = await Report.findById(req.params.id);
    if (!report) throw new ApiError(404, "Rapport introuvable");
    if (report.status === ReportStatus.VALIDATED) throw new ApiError(409, "Rapport verrouillé, non modifiable");

    const input = patchReportSchema.parse(req.body);
    Object.assign(report, input);
    if (report.status === ReportStatus.PENDING_ADMIN) report.status = ReportStatus.IN_REVIEW;
    await report.save();

    await auditFromRequest(req, "REPORT_EDITED", "Report", report.id, input);
    res.json(report);
  }),
);

reportsRouter.post(
  "/:id/validate",
  asyncHandler(async (req, res) => {
    const report = await Report.findById(req.params.id);
    if (!report) throw new ApiError(404, "Rapport introuvable");
    if (report.status === ReportStatus.VALIDATED) throw new ApiError(409, "Déjà validé");

    report.status = ReportStatus.VALIDATED;
    report.reviewedByAdminId = req.auth!.userId as unknown as typeof report.reviewedByAdminId;
    report.validatedAt = new Date();

    const pdfKey = await generateAndStoreReportPdf(report);
    report.pdfUrl = pdfKey;
    await report.save();

    await auditFromRequest(req, "REPORT_VALIDATED", "Report", report.id);
    res.json(report);
  }),
);

reportsRouter.post(
  "/:id/return",
  asyncHandler(async (req, res) => {
    const report = await Report.findById(req.params.id);
    if (!report) throw new ApiError(404, "Rapport introuvable");
    if (report.status === ReportStatus.VALIDATED) throw new ApiError(409, "Rapport verrouillé");

    const { reason } = returnReportSchema.parse(req.body);
    report.status = ReportStatus.RETURNED;
    if (reason) report.adminRecommendations = reason;
    await report.save();

    await auditFromRequest(req, "REPORT_RETURNED", "Report", report.id, { reason });
    res.json(report);
  }),
);

reportsRouter.get(
  "/:id/pdf",
  asyncHandler(async (req, res) => {
    const report = await Report.findById(req.params.id);
    if (!report) throw new ApiError(404, "Rapport introuvable");

    if (!report.pdfUrl) {
      // Régénère à la volée si le PDF n'a pas encore été produit (rapport non
      // encore validé) — pratique pour la preview avant validation admin.
      await recomputeReport(report);
      const pdfKey = await generateAndStoreReportPdf(report);
      report.pdfUrl = pdfKey;
      await report.save();
    }

    const stream = await streamReportPdf(report.pdfUrl);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="rapport-${report.id}.pdf"`);
    stream.on("error", (err) => {
      console.error("Erreur de lecture du PDF MinIO :", err.message);
      if (!res.headersSent) res.status(500).json({ error: "Impossible de lire le PDF" });
    });
    stream.pipe(res);
  }),
);
