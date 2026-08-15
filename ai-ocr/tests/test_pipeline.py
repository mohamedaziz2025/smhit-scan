"""Test du pipeline OpenCV sur un formulaire synthétique (voir
generate_synthetic_form.py) — valide la détection de grille + la lecture
des cases cochées par densité de pixels, sans dépendre de scans réels.

Exécution : `python -m tests.test_pipeline` depuis le dossier ai-ocr/
(après activation du venv avec opencv-python-headless installé).
"""

from __future__ import annotations

import sys

sys.path.insert(0, ".")

from app.checkbox_detection import cell_checkbox_state  # noqa: E402
from app.preprocessing import adaptive_threshold, decode_base64_image, preprocess  # noqa: E402
from app.table_detection import (  # noqa: E402
    detect_horizontal_lines,
    detect_row_boundaries,
    detect_table_bounds,
    detect_table_cells,
    group_cells_into_rows,
    slice_cells_by_layout,
)
from tests.generate_synthetic_form import build_synthetic_form  # noqa: E402

ROWS, COLS = 4, 6  # 1 en-tête + 3 lignes de données, 6 colonnes


def run() -> None:
    checked_ground_truth = {(0, 1), (1, 3), (2, 0), (2, 5)}
    image_b64, _ = build_synthetic_form(rows=ROWS, cols=COLS, checked_cells=checked_ground_truth)

    image = decode_base64_image(image_b64)
    gray = preprocess(image)
    thresh = adaptive_threshold(gray)

    cells = detect_table_cells(thresh)
    print(f"[grid] {len(cells)} cellules détectées (attendu ~{ROWS * COLS})")
    assert len(cells) >= ROWS * COLS * 0.8, "trop peu de cellules détectées — grille non reconnue"

    rows = group_cells_into_rows(cells)
    print(f"[grid] {len(rows)} lignes détectées (attendu {ROWS})")
    assert len(rows) == ROWS, f"nombre de lignes détectées incorrect : {len(rows)} != {ROWS}"

    data_rows = rows[1:]  # on saute l'en-tête, comme le fait pipeline.py
    errors = []

    for row_index, row in enumerate(data_rows):
        assert len(row) >= COLS * 0.8, f"ligne {row_index} : trop peu de cellules ({len(row)})"
        for col_index, (x, y, w, h) in enumerate(row[:COLS]):
            cell_thresh = thresh[y : y + h, x : x + w]
            checked, confidence = cell_checkbox_state(cell_thresh, threshold=0.35)
            expected = (row_index, col_index) in checked_ground_truth
            status = "OK" if checked == expected else "❌ MISMATCH"
            print(
                f"  row={row_index} col={col_index} checked={checked} (attendu {expected}) "
                f"confiance={confidence} {status}"
            )
            if checked != expected:
                errors.append((row_index, col_index, expected, checked))

    if errors:
        raise AssertionError(f"{len(errors)} case(s) mal détectée(s) : {errors}")

    print("\n✅ Pipeline OpenCV validé sur formulaire synthétique : grille + cases cochées correctement lues.")


def run_fixed_layout() -> None:
    """
    Valide la stratégie par mise en page fixe (15/08/2026, voir
    table_detection.py) sur le même formulaire synthétique : colonnes de
    largeur égale (1/6 chacune), pas de colonne "Zone" en tête
    (leading_offset_ratio=0, contrairement à derat_externe.json qui en a
    une) — les proportions viennent en paramètre exactement comme elles
    viendraient du layout JSON réel.
    """
    checked_ground_truth = {(0, 1), (1, 3), (2, 0), (2, 5)}
    image_b64, _ = build_synthetic_form(rows=ROWS, cols=COLS, checked_cells=checked_ground_truth)

    image = decode_base64_image(image_b64)
    gray = preprocess(image)
    thresh = adaptive_threshold(gray)

    horizontal_lines = detect_horizontal_lines(thresh)
    table_box = detect_table_bounds(horizontal_lines)
    assert table_box is not None, "contour du tableau non détecté"

    row_boundaries = detect_row_boundaries(horizontal_lines, table_box)
    print(f"[layout fixe] {len(row_boundaries)} séparateurs de ligne détectés (attendu {ROWS + 1})")
    assert len(row_boundaries) == ROWS + 1, f"séparateurs de ligne incorrects : {len(row_boundaries)} != {ROWS + 1}"

    width_ratios = [1 / COLS] * COLS
    rows = slice_cells_by_layout(table_box, row_boundaries, width_ratios, leading_offset_ratio=0.0)
    assert len(rows) == ROWS, f"nombre de lignes découpées incorrect : {len(rows)} != {ROWS}"

    data_rows = rows[1:]
    errors = []
    for row_index, row in enumerate(data_rows):
        assert len(row) == COLS, f"ligne {row_index} : {len(row)} cellules découpées, attendu {COLS}"
        for col_index, (x, y, w, h) in enumerate(row):
            cell_thresh = thresh[y : y + h, x : x + w]
            checked, confidence = cell_checkbox_state(cell_thresh, threshold=0.35)
            expected = (row_index, col_index) in checked_ground_truth
            status = "OK" if checked == expected else "❌ MISMATCH"
            print(f"  row={row_index} col={col_index} checked={checked} (attendu {expected}) confiance={confidence} {status}")
            if checked != expected:
                errors.append((row_index, col_index, expected, checked))

    if errors:
        raise AssertionError(f"{len(errors)} case(s) mal détectée(s) (layout fixe) : {errors}")

    print("\n✅ Découpage par mise en page fixe validé sur formulaire synthétique.")


if __name__ == "__main__":
    run()
    run_fixed_layout()
