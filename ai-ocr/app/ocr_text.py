"""OCR texte des cellules (nom produit, N° lot, poste) — §7.2 étape 4.

PaddleOCR est une dépendance lourde (~700 Mo avec les modèles fr) commentée
dans requirements.txt (voir README). Le chargement est différé (lazy) et
tolérant à l'absence du package : sans PaddleOCR installé, ces fonctions
renvoient une chaîne vide + confiance nulle plutôt que de faire planter le
pipeline — l'agent complète alors le champ manuellement (comportement
identique au reste du service, cf. `main.py::extract`).
"""

from __future__ import annotations

import numpy as np

_engine = None
_unavailable = False


def _get_engine():
    global _engine, _unavailable
    if _unavailable:
        return None
    if _engine is None:
        try:
            from paddleocr import PaddleOCR  # import différé : dépendance optionnelle

            _engine = PaddleOCR(lang="fr", use_angle_cls=True, show_log=False)
        except Exception:  # ImportError si non installé, ou erreur de chargement des modèles
            _unavailable = True
            return None
    return _engine


def ocr_cell_text(cell_gray: np.ndarray) -> tuple[str, float]:
    """OCR d'une cellule -> (texte concaténé, confiance moyenne)."""
    engine = _get_engine()
    if engine is None or cell_gray.size == 0:
        return "", 0.0

    result = engine.ocr(cell_gray, cls=True)
    if not result or not result[0]:
        return "", 0.0

    texts = []
    confidences = []
    for line in result[0]:
        _box, (text, confidence) = line
        texts.append(text)
        confidences.append(confidence)

    combined = " ".join(texts).strip()
    avg_confidence = round(sum(confidences) / len(confidences), 2) if confidences else 0.0
    return combined, avg_confidence
