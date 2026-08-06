import os

# Seuil de confiance sous lequel un champ est marqué "à vérifier" côté UI.
# Paramétrable par le Super Admin (§7.4) — exposé ici via variable d'env
# pour rester cohérent avec AI_OCR_CONFIDENCE_THRESHOLD côté Express.
CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.75"))

LAYOUTS_DIR = os.path.join(os.path.dirname(__file__), "..", "layouts")
