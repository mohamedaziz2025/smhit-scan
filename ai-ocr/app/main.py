import json
import logging
import os

from fastapi import FastAPI, HTTPException

from .config import CONFIDENCE_THRESHOLD, LAYOUTS_DIR
from .matching import match_product
from .schemas import (
    ExtractRequest,
    ExtractResponse,
    HeaderResult,
    MatchProductRequest,
    MatchProductResponse,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("smhit.ai-ocr")

app = FastAPI(
    title="SMHIT AI/OCR",
    description=(
        "Microservice IA/OCR autonome (sans API tierce) — extraction des fiches "
        "de lutte antiparasitaire scannées. Voir §7 du cahier des charges."
    ),
    version="0.1.0",
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "smhit-ai-ocr"}


@app.post("/reload-layouts")
def reload_layouts() -> dict:
    """Recharge les templates de layout JSON (§7.2) sans redémarrer le service."""
    if not os.path.isdir(LAYOUTS_DIR):
        raise HTTPException(status_code=500, detail=f"Dossier layouts introuvable : {LAYOUTS_DIR}")

    loaded = []
    for filename in sorted(os.listdir(LAYOUTS_DIR)):
        if filename.endswith(".json"):
            path = os.path.join(LAYOUTS_DIR, filename)
            with open(path, encoding="utf-8") as f:
                json.load(f)  # valide le JSON
            loaded.append(filename)

    return {"reloaded": loaded}


@app.post("/match-product", response_model=MatchProductResponse)
def match_product_endpoint(payload: MatchProductRequest) -> MatchProductResponse:
    """Résolution isolée d'une référence produit (fuzzy match, §7.3)."""
    matched, suggestions = match_product(payload.refCode_raw, payload.product_catalog)
    return MatchProductResponse(matched=matched, suggestions=suggestions)


@app.post("/extract", response_model=ExtractResponse)
def extract(payload: ExtractRequest) -> ExtractResponse:
    """
    Pipeline complet d'extraction (§7.2) :
      1. Prétraitement image (deskew, threshold) — OpenCV
      2. Détection tableau/cellules — morphologie OpenCV + template de layout
      3. Détection cases cochées — densité de pixels par cellule
      4. OCR des cellules texte — PaddleOCR (fr + chiffres)
      5. Matching des références produits — RapidFuzz (voir match_product)

    NOTE — squelette Module 1 : seules les étapes d'infra/contrat sont posées
    ici. Le pipeline OpenCV/PaddleOCR complet est construit au Module 3
    (§14). Cet endpoint valide déjà le contrat d'API et renvoie une réponse
    structurée conforme, avec confiance nulle et un warning explicite, pour
    que l'intégration Express (Module 4) puisse être développée en parallèle.
    """
    if not payload.image_base64:
        raise HTTPException(status_code=400, detail="image_base64 manquant")

    logger.info("extract() appelé pour fiche_type=%s (pipeline OCR = Module 3)", payload.fiche_type)

    return ExtractResponse(
        overall_confidence=0.0,
        header=HeaderResult(),
        sections={},
        warnings=[
            "Pipeline OCR non implémenté (Module 3) — réponse de contrat vide.",
            f"Seuil de confiance configuré : {CONFIDENCE_THRESHOLD}",
        ],
    )
