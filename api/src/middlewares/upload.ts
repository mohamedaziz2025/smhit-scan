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
