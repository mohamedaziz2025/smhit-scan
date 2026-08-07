"""Détection de la structure du tableau (lignes/colonnes) — §7.2 étape 2.

Technique : morphologie (noyaux horizontaux/verticaux) pour isoler le
squelette de la grille, puis contours des régions blanches enfermées par
cette grille = cellules.
"""

from __future__ import annotations

import cv2
import numpy as np

Box = tuple[int, int, int, int]  # x, y, w, h


def detect_table_cells(thresh: np.ndarray) -> list[Box]:
    h, w = thresh.shape

    # Noyaux proportionnels à la taille de l'image — un noyau fixe en pixels
    # ne généralise pas entre un scan basse résolution et une photo haute résolution.
    horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (max(15, w // 40), 1))
    vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, max(15, h // 60)))

    horizontal_lines = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, horizontal_kernel, iterations=2)
    vertical_lines = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, vertical_kernel, iterations=2)

    grid = cv2.bitwise_or(horizontal_lines, vertical_lines)
    grid = cv2.dilate(grid, np.ones((3, 3), np.uint8), iterations=1)

    # Les cellules sont les régions blanches enfermées par le squelette de grille noir.
    inverted = cv2.bitwise_not(grid)
    contours, _ = cv2.findContours(inverted, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)

    img_area = h * w
    cells: list[Box] = []
    for c in contours:
        x, y, cw, ch = cv2.boundingRect(c)
        area = cw * ch
        # Exclut le bruit (area trop petite) et les faux positifs englobant
        # toute la page (pas de grille détectée -> un seul contour géant).
        if area < img_area * 0.0008 or area > img_area * 0.4:
            continue
        cells.append((x, y, cw, ch))

    return cells


def group_cells_into_rows(cells: list[Box], row_tolerance_ratio: float = 0.6) -> list[list[Box]]:
    """Regroupe les cellules détectées en lignes (tri par y, puis x dans chaque ligne)."""
    if not cells:
        return []

    sorted_cells = sorted(cells, key=lambda b: b[1])
    median_height = sorted(c[3] for c in sorted_cells)[len(sorted_cells) // 2]
    tolerance = median_height * row_tolerance_ratio

    rows: list[list[Box]] = []
    current_row: list[Box] = [sorted_cells[0]]
    current_y = sorted_cells[0][1]

    for cell in sorted_cells[1:]:
        if abs(cell[1] - current_y) <= tolerance:
            current_row.append(cell)
        else:
            rows.append(sorted(current_row, key=lambda b: b[0]))
            current_row = [cell]
            current_y = cell[1]
    rows.append(sorted(current_row, key=lambda b: b[0]))

    return rows
