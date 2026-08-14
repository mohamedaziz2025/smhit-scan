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

    # Bug réel trouvé le 14/08/2026 sur une vraie fiche photographiée sur le
    # terrain (formulaire synthétique généré = traits parfaitement continus,
    # une photo à main levée = micro-coupures dues au bruit JPEG/à
    # l'éclairage, qui suffisent à faire disparaître un trait de
    # MORPH_OPEN puisqu'il exige un segment ININTERROMPU de la longueur du
    # noyau). Fermeture DIRECTIONNELLE préalable — un noyau vertical pour le
    # passage vertical, horizontal pour l'horizontal — pour combler ces
    # micro-coupures sans mélanger les deux directions (une fermeture carrée
    # globale fusionne aussi des éléments non liés, ex. une coche proche
    # d'un trait de grille, ce qui recrée le problème plus loin).
    # Proportionnels comme les noyaux de ligne ci-dessous — un noyau fixe de
    # 15px est négligeable sur une photo haute résolution (le cas visé) mais
    # démesuré sur un petit formulaire synthétique (cellules ~70px de haut
    # en test), où il fusionnait les coches avec la grille et cassait
    # l'alignement des colonnes (régression détectée par tests/test_pipeline.py).
    v_close_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, max(3, h // 300)))
    h_close_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (max(3, w // 300), 1))
    thresh_for_v = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, v_close_kernel, iterations=1)
    thresh_for_h = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, h_close_kernel, iterations=1)

    # Noyaux proportionnels à la taille de l'image — un noyau fixe en pixels
    # ne généralise pas entre un scan basse résolution et une photo haute
    # résolution. Le noyau vertical doit rester nettement plus court qu'une
    # hauteur de ligne de tableau, exactement comme le noyau horizontal
    # reste nettement plus court que la largeur du tableau (~2,5 % de la
    # dimension totale) — l'ancien h // 60 valait ~77 % d'une hauteur de
    # ligne réelle sur cette fiche, exigeant un trait vertical quasiment
    # parfait sur toute la cellule pour être détecté (8 cellules détectées
    # sur ~150+ attendues). h // 150 ramène ça à une proportion comparable
    # au noyau horizontal.
    horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (max(15, w // 40), 1))
    vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, max(10, h // 150)))

    horizontal_lines = cv2.morphologyEx(thresh_for_h, cv2.MORPH_OPEN, horizontal_kernel, iterations=2)
    vertical_lines = cv2.morphologyEx(thresh_for_v, cv2.MORPH_OPEN, vertical_kernel, iterations=2)

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
        # une grande partie de la page (grille localement incomplète -> un
        # contour géant fusionnant plusieurs cellules). Un vrai formulaire a
        # des dizaines de lignes/colonnes : une seule cellule ne devrait
        # jamais représenter une fraction importante de la page. Seuil
        # abaissé de 0.4 à 0.05 le 14/08/2026 — un contour géant à 31% de
        # l'image survivait auparavant à ce filtre et faisait ensuite
        # disparaître toutes les vraies petites cellules qu'il englobait
        # géométriquement, via _remove_nested_boxes ci-dessous.
        if area < img_area * 0.0008 or area > img_area * 0.05:
            continue
        cells.append((x, y, cw, ch))

    # Une case cochée (carré plein) a ses propres arêtes horizontales/
    # verticales, que la morphologie confond parfois avec des lignes de
    # grille : ça fait apparaître 1-2 contours "fantômes" emboîtés à
    # l'intérieur de la vraie cellule. Sans ce filtre, ces contours en trop
    # décalent l'alignement colonne pour tout le reste de la ligne (repéré
    # via tests/test_pipeline.py sur formulaire synthétique).
    return _remove_nested_boxes(cells)


def _is_strictly_nested(inner: Box, outer: Box, tolerance: int = 3) -> bool:
    ix, iy, iw, ih = inner
    ox, oy, ow, oh = outer
    if iw * ih >= ow * oh:
        return False
    return ix >= ox - tolerance and iy >= oy - tolerance and ix + iw <= ox + ow + tolerance and iy + ih <= oy + oh + tolerance


def _remove_nested_boxes(cells: list[Box]) -> list[Box]:
    return [c for c in cells if not any(_is_strictly_nested(c, other) for other in cells if other != c)]


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
