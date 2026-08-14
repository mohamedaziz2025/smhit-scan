import multer from "multer";
import { ApiError } from "./errorHandler";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

/** Upload contrôlé (type/taille) — §9 sécurité transverse. */
export const uploadScanImages = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      cb(new ApiError(400, `Type de fichier non autorisé : ${file.mimetype}`));
      return;
    }
    cb(null, true);
  },
}).array("images", 10);

const ALLOWED_EXCEL_MIME = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-excel", // .xls
  "text/csv",
  "application/octet-stream", // certains navigateurs n'envoient pas de MIME fiable pour .xlsx
]);

/** Import catalogue produits (§9 `POST /products/import`) — un seul fichier Excel/CSV. */
export const uploadProductsExcel = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_EXCEL_MIME.has(file.mimetype) && !/\.(xlsx|xls|csv)$/i.test(file.originalname)) {
      cb(new ApiError(400, `Fichier non reconnu comme Excel/CSV : ${file.originalname}`));
      return;
    }
    cb(null, true);
  },
}).single("file");
