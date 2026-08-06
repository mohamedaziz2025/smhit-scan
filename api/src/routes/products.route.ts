import { Router } from "express";
import { Product } from "../models/Product";
import { UserRole } from "../types/enums";
import { requireAuth, requireRole } from "../middlewares/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../middlewares/errorHandler";
import { auditFromRequest } from "../utils/audit";
import { createProductSchema, updateProductSchema } from "../validators/product.validators";

export const productsRouter = Router();
productsRouter.use(requireAuth);

productsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { search, category, page = "1", limit = "20" } = req.query as Record<string, string>;
    const filter: Record<string, unknown> = { isActive: true };
    if (category) filter.category = category;
    if (search) filter.$text = { $search: search };

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(200, Math.max(1, Number(limit)));

    const [items, total] = await Promise.all([
      Product.find(filter)
        .sort({ code: 1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Product.countDocuments(filter),
    ]);

    res.json({ items, total, page: pageNum, limit: limitNum });
  }),
);

/**
 * Résolution réf. -> nom commercial (§9). L'agent tape un code produit
 * (ex "PLDRT021"), l'app affiche le nom (ex "RAMET BLOC"). Recherche exacte
 * d'abord (code ou alias), puis fuzzy via le microservice IA/OCR en fallback
 * si rien n'est trouvé (tolère les fautes de frappe / confusions OCR).
 */
productsRouter.get(
  "/resolve",
  asyncHandler(async (req, res) => {
    const ref = String(req.query.ref ?? "").trim().toUpperCase();
    if (!ref) throw new ApiError(400, "Paramètre ?ref= requis");

    const exact = await Product.findOne({
      isActive: true,
      $or: [{ code: ref }, { aliases: ref }],
    });

    if (exact) {
      res.json({ code: exact.code, name: exact.name, category: exact.category, matched: "exact" });
      return;
    }

    res.status(404).json({ error: `Aucun produit trouvé pour la référence "${ref}"`, matched: "none" });
  }),
);

productsRouter.post(
  "/",
  requireRole(UserRole.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const input = createProductSchema.parse(req.body);
    const product = await Product.create({ ...input, code: input.code.toUpperCase() });
    await auditFromRequest(req, "PRODUCT_CREATED", "Product", product.id, input);
    res.status(201).json(product);
  }),
);

productsRouter.patch(
  "/:id",
  requireRole(UserRole.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const input = updateProductSchema.parse(req.body);
    const product = await Product.findByIdAndUpdate(req.params.id, input, { new: true });
    if (!product) throw new ApiError(404, "Produit introuvable");
    await auditFromRequest(req, "PRODUCT_UPDATED", "Product", product.id, input);
    res.json(product);
  }),
);

productsRouter.delete(
  "/:id",
  requireRole(UserRole.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const product = await Product.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!product) throw new ApiError(404, "Produit introuvable");
    await auditFromRequest(req, "PRODUCT_DEACTIVATED", "Product", product.id);
    res.status(204).send();
  }),
);
