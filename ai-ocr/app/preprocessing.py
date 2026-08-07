"""Prétraitement image — §7.2 étape 1 : deskew, denoise, threshold."""

from __future__ import annotations

import base64

import cv2
import numpy as np


def decode_base64_image(image_base64: str) -> np.ndarray:
    """Décode une image base64 (avec ou sans préfixe data URL) en tableau BGR OpenCV."""
    if "," in image_base64[:60]:  # tolère un préfixe "data:image/png;base64,..."
        image_base64 = image_base64.split(",", 1)[1]

    raw = base64.b64decode(image_base64)
    arr = np.frombuffer(raw, dtype=np.uint8)
    image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Image illisible (base64 invalide ou format non supporté)")
    return image


def deskew(gray: np.ndarray) -> np.ndarray:
    """Redresse une page légèrement inclinée via minAreaRect sur les pixels sombres."""
    coords = np.column_stack(np.where(gray < 200))
    if coords.shape[0] < 50:  # pas assez de contenu détecté pour estimer un angle fiable
        return gray

    angle = cv2.minAreaRect(coords)[-1]
    if angle < -45:
        angle = -(90 + angle)
    else:
        angle = -angle

    # Une image quasi droite ne doit pas être "corrigée" de travers par le bruit.
    if abs(angle) < 0.3 or abs(angle) > 20:
        return gray

    (h, w) = gray.shape
    center = (w // 2, h // 2)
    matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
    return cv2.warpAffine(gray, matrix, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)


def preprocess(image_bgr: np.ndarray) -> np.ndarray:
    """Pipeline complet : grayscale -> denoise -> deskew -> retourne l'image niveaux de gris redressée."""
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    gray = cv2.fastNlMeansDenoising(gray, h=10)
    return deskew(gray)


def adaptive_threshold(gray: np.ndarray) -> np.ndarray:
    """Binarisation adaptative — robuste aux variations d'éclairage du scan/photo."""
    return cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 25, 10
    )
