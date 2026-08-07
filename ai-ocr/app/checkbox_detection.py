"""Détection des cases cochées par densité de pixels — §7.2 étape 3 / §7.3."""

from __future__ import annotations

import numpy as np


def cell_pixel_density(cell_thresh: np.ndarray) -> float:
    """Ratio de pixels "foreground" (blanc, encre/coche) dans une cellule binarisée inversée."""
    if cell_thresh.size == 0:
        return 0.0
    # On ignore une bordure de quelques pixels pour ne pas compter le trait de
    # la grille lui-même comme "coché".
    margin = max(2, min(cell_thresh.shape) // 8)
    inner = cell_thresh[margin:-margin, margin:-margin] if min(cell_thresh.shape) > margin * 2 else cell_thresh
    if inner.size == 0:
        inner = cell_thresh
    return float(np.count_nonzero(inner)) / inner.size


def cell_checkbox_state(cell_thresh: np.ndarray, threshold: float) -> tuple[bool, float]:
    """Renvoie (coché, confiance). Confiance faible = densité proche du seuil (cas ambigu, §7.4)."""
    density = cell_pixel_density(cell_thresh)
    checked = density > threshold

    band = max(threshold, 1 - threshold)
    confidence = min(1.0, abs(density - threshold) / band * 2) if band > 0 else 1.0
    return checked, round(confidence, 2)
