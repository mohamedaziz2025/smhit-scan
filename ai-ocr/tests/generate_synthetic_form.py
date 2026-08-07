"""Génère une image de formulaire synthétique (grille + cases cochées) pour
valider le pipeline OpenCV sans dépendre de vrais scans papier (absents au
moment du développement — voir pipeline.py, note de transparence en tête
de fichier).
"""

from __future__ import annotations

import base64
import io

from PIL import Image, ImageDraw


def build_synthetic_form(
    rows: int = 4,  # 1 en-tête + 3 lignes de données
    cols: int = 6,
    cell_w: int = 110,
    cell_h: int = 70,
    checked_cells: set[tuple[int, int]] | None = None,
) -> tuple[str, set[tuple[int, int]]]:
    """Dessine une grille `rows` x `cols` avec certaines cellules "cochées"
    (remplies d'un carré noir, comme une case cochée sur un vrai formulaire).

    Renvoie (image_base64, checked_cells) — (row, col) en excluant la ligne
    d'en-tête (row 0 = 1ère ligne de données).
    """
    checked_cells = checked_cells or set()

    margin = 40
    width = margin * 2 + cols * cell_w
    height = margin * 2 + rows * cell_h

    img = Image.new("L", (width, height), color=255)
    draw = ImageDraw.Draw(img)

    # Grille
    for r in range(rows + 1):
        y = margin + r * cell_h
        draw.line([(margin, y), (width - margin, y)], fill=0, width=2)
    for c in range(cols + 1):
        x = margin + c * cell_w
        draw.line([(x, margin), (x, height - margin)], fill=0, width=2)

    # Cellules cochées (une croix/case pleine, comme une coche manuscrite dense)
    for row, col in checked_cells:
        actual_row = row + 1  # +1 pour sauter la ligne d'en-tête
        x0 = margin + col * cell_w + 15
        y0 = margin + actual_row * cell_h + 12
        x1 = x0 + cell_w - 30
        y1 = y0 + cell_h - 24
        draw.rectangle([x0, y0, x1, y1], fill=0)

    buf = io.BytesIO()
    img.convert("RGB").save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("ascii"), checked_cells
