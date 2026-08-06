from __future__ import annotations

from rapidfuzz import fuzz, process

from .schemas import MatchProductSuggestion, ProductCatalogItem

# Corrections des confusions OCR fréquentes avant le fuzzy match (§7.2).
_OCR_CONFUSIONS = {
    "O": "0",
    "I": "1",
    "L": "1",
    "S": "5",
    "B": "8",
}


def _normalize(code: str) -> str:
    code = code.strip().upper()
    return "".join(_OCR_CONFUSIONS.get(ch, ch) for ch in code)


def match_product(
    ref_code_raw: str,
    catalog: list[ProductCatalogItem],
    limit: int = 3,
    threshold: float = 80.0,
) -> tuple[MatchProductSuggestion | None, list[MatchProductSuggestion]]:
    """Fuzzy-match une référence lue par l'OCR contre le catalogue produits.

    Retourne (meilleur_match_si_confiant, top_3_suggestions).
    """
    if not catalog:
        return None, []

    normalized_input = _normalize(ref_code_raw)
    choices = {item.code: _normalize(item.code) for item in catalog}

    results = process.extract(
        normalized_input,
        choices,
        scorer=fuzz.WRatio,
        limit=limit,
    )
    # results: list of (normalized_code_value, score, code_key)
    by_code = {item.code: item for item in catalog}
    suggestions = [
        MatchProductSuggestion(code=code, name=by_code[code].name, confidence=round(score / 100, 2))
        for _value, score, code in results
    ]

    if suggestions and suggestions[0].confidence * 100 >= threshold:
        return suggestions[0], suggestions

    return None, suggestions
