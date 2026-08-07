import json
import logging
import os

from fastapi import FastAPI, HTTPException

from .config import CONFIDENCE_THRESHOLD, LAYOUTS_DIR
from .matching import match_product
from .pipeline import run_pipeline
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
    version="0.2.0",
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
      4. OCR des cellules texte — PaddleOCR (fr + chiffres), si installé
      5. Matching des références produits — RapidFuzz (voir match_product)

    Robustesse : toute erreur du pipeline (image illisible, aucun tableau
    détecté, dépendance manquante) est absorbée et renvoyée comme une
    réponse de contrat valide à confiance nulle plutôt que de propager une
    500 — l'agent complète alors la fiche manuellement (§7.4 : "l'agent
    reste maître").
    """
    if not payload.image_base64:
        raise HTTPException(status_code=400, detail="image_base64 manquant")

    try:
        result = run_pipeline(
            payload.fiche_type,
            payload.image_base64,
            [c.model_dump() for c in payload.product_catalog],
        )
        return ExtractResponse(**result)
    except Exception as err:  # noqa: BLE001 — on ne veut jamais 500 ici, cf. docstring
        logger.exception("Échec du pipeline d'extraction pour fiche_type=%s", payload.fiche_type)
        return ExtractResponse(
            overall_confidence=0.0,
            header=HeaderResult(),
            sections={},
            warnings=[
                f"Extraction impossible : {err}",
                f"Seuil de confiance configuré : {CONFIDENCE_THRESHOLD}",
            ],
        )
