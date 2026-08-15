"""Orchestration du pipeline complet d'extraction — §7.2 / §7.3.

Deux stratégies de découpage du tableau (voir table_detection.py) :

- Mise en page fixe (15/08/2026) — quand le layout JSON définit
  `zone_column_ratio` + un `width_ratio` par colonne (cas de
  derat_externe.json, calibré sur une vraie fiche papier scannée) : ne
  détecte que le contour du tableau + les séparateurs de ligne
  (horizontaux, fiables), découpe les colonnes mathématiquement. Élimine
  le point de rupture trouvé en testant une vraie photo de terrain (la
  détection ligne par ligne des traits verticaux, ci-dessous, est fragile
  face au bruit/micro-coupures d'une photo à main levée).
- Générique par grille complète (`detect_table_cells`) — repli pour les
  fiche_type dont le layout ne définit pas encore ces proportions.

Simplification restante : une seule zone par image (le layout papier a
plusieurs zones fusionnées sur des lignes du même tableau, ex. "Zone N°1"
5 postes + "Zone N°2" 12 postes) — la répartition se fait côté API à
partir du plan de site (§6.2, fiche.service.ts remapZonesUsingSitePlan),
pas ici.
"""

from __future__ import annotations

import json
import os
from typing import Any

from .checkbox_detection import cell_checkbox_state
from .config import LAYOUTS_DIR
from .matching import match_product
from .ocr_text import ocr_cell_text
from .preprocessing import adaptive_threshold, decode_base64_image, preprocess
from .schemas import ProductCatalogItem
from .table_detection import (
    detect_horizontal_lines,
    detect_row_boundaries,
    detect_table_bounds,
    detect_table_cells,
    group_cells_into_rows,
    slice_cells_by_layout,
)

_LAYOUT_FILES = {
    "DERATISATION_EXTERNE": "derat_externe.json",
    "DERATISATION_INTERNE": "derat_interne.json",
    "DESINSECTISATION": "desinsectisation.json",
}

_SECTION_KEYS = {
    "DERATISATION_EXTERNE": "deratExterne",
    "DERATISATION_INTERNE": "deratInterne",
    "DESINSECTISATION": "desinsectisation",
}


def _load_layout(fiche_type: str) -> dict:
    path = os.path.join(LAYOUTS_DIR, _LAYOUT_FILES[fiche_type])
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _set_nested(target: dict, dotted_key: str, value: Any) -> None:
    parts = dotted_key.split(".")
    cur = target
    for part in parts[:-1]:
        cur = cur.setdefault(part, {})
    cur[parts[-1]] = value


def _rows_by_fixed_layout(thresh, layout: dict) -> list[list[tuple[int, int, int, int]]] | None:
    """Stratégie par mise en page fixe — voir docstring du module. Renvoie
    None si le layout ne définit pas encore les proportions nécessaires
    (repli sur la détection générique) ou si aucun tableau n'est trouvé."""
    zone_ratio = layout.get("zone_column_ratio")
    columns = layout["columns"]
    if zone_ratio is None or any("width_ratio" not in c for c in columns):
        return None

    horizontal_lines = detect_horizontal_lines(thresh)
    table_box = detect_table_bounds(horizontal_lines)
    if table_box is None:
        return None

    row_boundaries = detect_row_boundaries(horizontal_lines, table_box)
    if len(row_boundaries) < 2:
        return None

    width_ratios = [c["width_ratio"] for c in columns]
    return slice_cells_by_layout(table_box, row_boundaries, width_ratios, leading_offset_ratio=zone_ratio)


def run_pipeline(fiche_type: str, image_base64: str, product_catalog: list[dict]) -> dict:
    layout = _load_layout(fiche_type)
    density_threshold = layout.get("checkbox_pixel_density_threshold", 0.35)
    columns = layout["columns"]
    catalog = [ProductCatalogItem(**c) for c in product_catalog]

    image = decode_base64_image(image_base64)
    gray = preprocess(image)
    thresh = adaptive_threshold(gray)

    rows = _rows_by_fixed_layout(thresh, layout)
    if rows is None:
        rows = group_cells_into_rows(detect_table_cells(thresh))
    data_rows = rows[1:] if len(rows) > 1 else rows  # 1ère ligne = en-tête présumé

    entries: list[dict] = []
    confidences: list[float] = []
    warnings: list[str] = []

    for row_index, row in enumerate(data_rows):
        if len(row) < 2:
            continue  # ligne trop fragmentée pour être fiable — ignorée plutôt que d'inventer

        entry: dict = {}
        for col_index, col in enumerate(columns):
            if col_index >= len(row):
                break
            x, y, w, h = row[col_index]
            cell_thresh = thresh[y : y + h, x : x + w]
            cell_gray = gray[y : y + h, x : x + w]

            if col["type"] == "checkbox":
                checked, confidence = cell_checkbox_state(cell_thresh, density_threshold)
                _set_nested(entry, col["key"], checked)
                confidences.append(confidence)
                if confidence < 0.6:
                    warnings.append(f"ligne {row_index + 1} : case « {col['label']} » ambiguë (confiance {confidence})")

            elif col["type"] == "number":
                text, confidence = ocr_cell_text(cell_gray)
                digits = "".join(ch for ch in text if ch.isdigit())
                _set_nested(entry, col["key"], int(digits) if digits else row_index + 1)
                confidences.append(confidence)

            else:  # "text"
                text, confidence = ocr_cell_text(cell_gray)
                if col["key"] == "produit.refCode_raw" and text:
                    matched, suggestions = match_product(text, catalog)
                    _set_nested(entry, "produit.refCode_raw", text)
                    _set_nested(entry, "produit.matched", matched.model_dump() if matched else None)
                    _set_nested(entry, "produit.suggestions", [s.model_dump() for s in suggestions])
                else:
                    _set_nested(entry, col["key"], text)
                confidences.append(confidence)

        if "posteNo" not in entry:
            entry["posteNo"] = row_index + 1
        entries.append(entry)

    overall_confidence = round(sum(confidences) / len(confidences), 2) if confidences else 0.0

    if not entries:
        warnings.append("Aucun tableau détecté dans l'image — vérifiez la qualité/le cadrage du scan.")
        sections: dict = {}
    elif fiche_type == "DESINSECTISATION":
        sections = {_SECTION_KEYS[fiche_type]: {"lignes": entries}}
    else:
        sections = {_SECTION_KEYS[fiche_type]: {"zones": [{"zoneLabel": "Zone N°1", "postes": entries}]}}

    return {
        "overall_confidence": overall_confidence,
        "header": {},
        "sections": sections,
        "warnings": warnings,
    }
