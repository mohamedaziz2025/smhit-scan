"""Détection de la structure du tableau (lignes/colonnes) — §7.2 étape 2.

Deux approches disponibles :

1. `detect_table_cells` / `group_cells_into_rows` — approche générique par
   morphologie (détecte lignes horizontales ET verticales, puis les
   cellules comme contours enfermés). Fonctionne sur n'importe quel
   tableau, mais la détection des lignes verticales reste fragile sur une
   vraie photo (bruit/micro-coupures) — voir §"Bug réel" ci-dessous.

2. `detect_table_bounds` / `detect_row_boundaries` / `slice_cells_by_layout`
   — approche par mise en page fixe (15/08/2026) : exploite que les fiches
   papier SMHIT ont toujours le même gabarit imprimé. On ne détecte QUE le
   contour extérieur du tableau + les séparateurs de ligne (horizontaux,
   nettement plus fiables que les verticaux sur une photo réelle), et on
   découpe les colonnes mathématiquement à partir de proportions connues
   (layout JSON, `columns[].width_ratio`) plutôt que de détecter chaque
   trait vertical individuellement. Utilisée en priorité par pipeline.py
   quand le layout définit ces proportions ; l'approche 1 reste le repli
   pour les fiche_type qui n'en définissent pas encore.
"""

from __future__ import annotations

import cv2
import numpy as np

Box = tuple[int, int, int, int]  # x, y, w, h


def _directional_closing(thresh: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """
    Referme les micro-coupures des traits AVANT de les isoler par direction.

    Bug réel trouvé le 14/08/2026 sur une vraie fiche photographiée sur le
    terrain (formulaire synthétique généré = traits parfaitement continus,
    une photo à main levée = micro-coupures dues au bruit JPEG/à
    l'éclairage, qui suffisent à faire disparaître un trait de MORPH_OPEN
    puisqu'il exige un segment ININTERROMPU de la longueur du noyau).
    Fermeture DIRECTIONNELLE — un noyau vertical pour le passage vertical,
    horizontal pour l'horizontal — pour combler ces micro-coupures sans
    mélanger les deux directions (une fermeture carrée globale fusionne
    aussi des éléments non liés, ex. une coche proche d'un trait de
    grille). Noyaux proportionnels à l'image (un noyau fixe de 15px est
    négligeable sur une photo haute résolution mais démesuré sur un petit
    formulaire synthétique en test, où il cassait l'alignement des
    colonnes — régression détectée par tests/test_pipeline.py).
    """
    h, w = thresh.shape
    v_close_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, max(3, h // 300)))
    h_close_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (max(3, w // 300), 1))
    thresh_for_v = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, v_close_kernel, iterations=1)
    thresh_for_h = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, h_close_kernel, iterations=1)
    return thresh_for_h, thresh_for_v


def detect_horizontal_lines(thresh: np.ndarray) -> np.ndarray:
    """
    Masque des lignes horizontales seules — nettement plus fiable que les
    verticales sur une vraie photo (une ligne horizontale de grille est
    aussi longue que toute la largeur du tableau, donc plus de marge pour
    tolérer de petites coupures qu'une ligne verticale qui ne fait que la
    hauteur d'une cellule).
    """
    h, w = thresh.shape
    thresh_for_h, _ = _directional_closing(thresh)
    horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (max(15, w // 40), 1))
    return cv2.morphologyEx(thresh_for_h, cv2.MORPH_OPEN, horizontal_kernel, iterations=2)


def detect_table_cells(thresh: np.ndarray) -> list[Box]:
    h, w = thresh.shape
    thresh_for_h, thresh_for_v = _directional_closing(thresh)

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


# --------------------------------------------------------------------------
# Approche par mise en page fixe (15/08/2026, voir docstring du module)
# --------------------------------------------------------------------------


def detect_table_bounds(horizontal_lines: np.ndarray) -> Box | None:
    """
    Boîte englobante du tableau à partir du masque des lignes horizontales
    seules (fiable, contrairement aux verticales) : du coin haut-gauche au
    coin bas-droit de toutes les lignes détectées — puisque chaque ligne de
    grille traverse toute la largeur du tableau, leur étendue combinée
    délimite précisément le tableau, sans avoir besoin de détecter le
    moindre trait vertical.
    """
    ys, xs = np.where(horizontal_lines > 0)
    if len(xs) == 0:
        return None
    x0, x1 = int(xs.min()), int(xs.max())
    y0, y1 = int(ys.min()), int(ys.max())
    return (x0, y0, x1 - x0, y1 - y0)


def detect_row_boundaries(horizontal_lines: np.ndarray, table_box: Box, min_line_fraction: float = 0.3) -> list[int]:
    """
    Ordonnées Y (coordonnées absolues) de chaque ligne horizontale de la
    grille à l'intérieur du tableau. Une vraie ligne de grille couvre une
    grande fraction de la largeur du tableau ; un fragment isolé (coche,
    bruit résiduel) ne le fait pas — c'est ce qui distingue une ligne d'un
    artefact, sans avoir besoin de connaître les colonnes.

    Seuil par défaut abaissé de 0.6 à 0.3 le 15/08/2026 : sur une vraie
    photo, les traits de séparation de ligne ne couvrent presque jamais
    100% de la largeur du tableau détectée (légère perspective, colonnes
    "Nom Commercial/Code Produit/N° Lot" vides sans texte pour ancrer le
    contraste local de la binarisation adaptative par endroits…) — 0.6 ne
    trouvait que 2 séparateurs sur ~18 attendus sur la fiche réelle testée,
    contre 19 à 0.3.
    """
    x, y, w, h = table_box
    region = horizontal_lines[y : y + h + 1, x : x + w + 1]
    min_pixels = region.shape[1] * min_line_fraction

    raw_ys = [i for i in range(region.shape[0]) if np.count_nonzero(region[i]) >= min_pixels]

    # Regroupe les Y consécutifs (une ligne dilatée fait plusieurs pixels
    # d'épaisseur, donc plusieurs lignes de pixels de suite passent le
    # test ci-dessus pour un seul et même trait de grille).
    boundaries: list[int] = []
    for yy in raw_ys:
        if boundaries and yy - boundaries[-1] <= 3:
            continue
        boundaries.append(yy)

    return _drop_leading_outliers([b + y for b in boundaries])


def _drop_leading_outliers(boundaries: list[int]) -> list[int]:
    """
    Bug réel trouvé le 15/08/2026 sur la fiche photographiée réelle : un
    filet de soulignement dans l'en-tête de la lettre à en-tête (au-dessus
    du tableau, ex. sous "Société Agréée Par Le Ministère De
    l'Environnement") est une vraie ligne horizontale que detect_
    horizontal_lines() détecte à raison — mais detect_table_bounds() inclut
    alors ce point isolé dans sa boîte englobante, et ces 1-2 lignes
    parasites se retrouvaient traitées comme "l'en-tête du tableau" par
    pipeline.py (qui saute juste la 1ère ligne), décalant TOUTES les
    postes d'une ligne dans la sortie.

    Les vraies lignes du tableau sont régulièrement espacées (hauteur de
    ligne à peu près constante) ; une ligne isolée bien avant le reste,
    séparée par un écart largement supérieur à l'espacement typique, est
    donc un artefact plutôt qu'une vraie ligne de tableau — on la retire.
    """
    if len(boundaries) < 4:
        return boundaries

    gaps = [boundaries[i + 1] - boundaries[i] for i in range(len(boundaries) - 1)]
    median_gap = sorted(gaps)[len(gaps) // 2]
    if median_gap <= 0:
        return boundaries

    # Ne considère que le tout PREMIER écart anormalement grand, au tout
    # début de la liste — un écart plus loin dans le tableau n'est pas un
    # artefact d'en-tête de lettre mais probablement juste des séparateurs
    # de ligne manqués (grille localement moins nette) qu'il ne faut pas
    # supprimer, seulement composer avec.
    cut = 0
    for i, gap in enumerate(gaps[: max(1, len(gaps) // 3)]):
        if gap > median_gap * 3:
            cut = i + 1
            break
    return boundaries[cut:]


def slice_cells_by_layout(
    table_box: Box,
    row_boundaries: list[int],
    column_width_ratios: list[float],
    leading_offset_ratio: float = 0.0,
) -> list[list[Box]]:
    """
    Découpe le tableau en cellules à partir de proportions de colonnes
    connues à l'avance (mise en page fixe du formulaire papier) plutôt que
    de détecter chaque trait vertical — élimine complètement le point de
    rupture identifié dans detect_table_cells() (lignes verticales fragiles
    sur une vraie photo). `leading_offset_ratio` saute une colonne "Zone"
    fusionnée sur plusieurs lignes (non lisible ligne par ligne, gérée
    séparément côté API via le plan de site) avant le début des colonnes
    par poste.
    """
    x, y, w, h = table_box
    total_ratio = sum(column_width_ratios) or 1.0
    normalized = [r / total_ratio for r in column_width_ratios]

    content_x = x + round(w * leading_offset_ratio)
    content_w = w - round(w * leading_offset_ratio)

    col_bounds: list[tuple[int, int]] = []
    cursor = content_x
    for ratio in normalized:
        col_w = round(content_w * ratio)
        col_bounds.append((cursor, col_w))
        cursor += col_w

    # Léger retrait vers l'intérieur de chaque cellule (bug trouvé le
    # 15/08/2026 en testant sur formulaire synthétique) : contrairement à
    # detect_table_cells() qui trouve le contour de la région blanche
    # ENFERMÉE par le trait de grille (donc déjà légèrement en retrait du
    # trait lui-même), ce découpage mathématique colle exactement aux
    # coordonnées des séparateurs de ligne/colonne — la cellule inclut donc
    # le trait de grille à ses bords. cell_pixel_density() (checkbox_
    # detection.py) exclut bien une marge avant de mesurer la densité, mais
    # cette marge est calculée sur CETTE cellule (bords compris), pas sur le
    # contenu réel de la case à cocher : un trait de grille assez épais
    # suffit à fausser légèrement la mesure sur des cas limites. Un retrait
    # de quelques pixels avant transmission à cell_pixel_density restaure un
    # comportement cohérent avec detect_table_cells().
    inset = max(2, round(min(w, h) * 0.02))

    rows: list[list[Box]] = []
    for i in range(len(row_boundaries) - 1):
        row_y = row_boundaries[i]
        row_h = row_boundaries[i + 1] - row_boundaries[i]
        if row_h <= 0:
            continue
        rows.append(
            [
                (cx + inset, row_y + inset, max(1, cw - 2 * inset), max(1, row_h - 2 * inset))
                for cx, cw in col_bounds
            ]
        )
    return rows
