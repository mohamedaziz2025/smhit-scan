"""Prétraitement image — §7.2 étape 1 : correction EXIF, deskew, denoise, threshold."""

from __future__ import annotations

import base64
from io import BytesIO

import cv2
import numpy as np
from PIL import Image, ImageOps


def decode_base64_image(image_base64: str) -> np.ndarray:
    """
    Décode une image base64 (avec ou sans préfixe data URL) en tableau BGR OpenCV.

    Bug réel trouvé le 14/08/2026 en vérifiant une vraie fiche scannée sur le
    terrain (pas un test synthétique) : `cv2.imdecode` ignore complètement la
    balise EXIF Orientation. Une photo prise en portrait sur téléphone est
    très souvent enregistrée avec des pixels bruts en paysage + une balise
    EXIF indiquant la rotation à appliquer à l'affichage — sans cette
    correction, l'image arrive à la détection de tableau tournée à 90°, ce
    que `deskew()` (qui ne corrige que les petits angles, > 20° = ignoré,
    car jugé être du bruit plutôt qu'une vraie rotation) ne rattrape pas.
    Résultat observé : sur 17 postes répartis en 2 zones, seuls 2 postes
    fragmentaires étaient détectés (confiance 0.52).

    `ImageOps.exif_transpose` applique la rotation/symétrie EXIF si présente
    (no-op sinon) avant toute conversion en tableau OpenCV.
    """
    if "," in image_base64[:60]:  # tolère un préfixe "data:image/png;base64,..."
        image_base64 = image_base64.split(",", 1)[1]

    raw = base64.b64decode(image_base64)
    try:
        pil_image = Image.open(BytesIO(raw))
        pil_image = ImageOps.exif_transpose(pil_image)
        rgb = np.array(pil_image.convert("RGB"))
    except Exception as err:  # image corrompue, format non supporté par PIL, etc.
        raise ValueError("Image illisible (base64 invalide ou format non supporté)") from err

    return cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)


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
