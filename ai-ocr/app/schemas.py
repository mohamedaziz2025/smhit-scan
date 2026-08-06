from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, Field

FicheType = Literal["DERATISATION_EXTERNE", "DERATISATION_INTERNE", "DESINSECTISATION"]


class ProductCatalogItem(BaseModel):
    code: str
    name: str


class ExtractRequest(BaseModel):
    """Requête POST /extract — voir §7.3 du cahier des charges."""

    fiche_type: FicheType
    image_base64: str
    layout_version: str = "v01"
    product_catalog: list[ProductCatalogItem] = Field(default_factory=list)


class FieldValue(BaseModel):
    value: Any
    confidence: float


class HeaderResult(BaseModel):
    client_name: Optional[FieldValue] = None
    site_name: Optional[FieldValue] = None
    date: Optional[FieldValue] = None


class ExtractResponse(BaseModel):
    """Réponse structurée renvoyée à Express pour pré-remplir la Fiche."""

    overall_confidence: float
    header: HeaderResult
    sections: dict[str, Any] = Field(default_factory=dict)
    warnings: list[str] = Field(default_factory=list)


class MatchProductRequest(BaseModel):
    refCode_raw: str
    product_catalog: list[ProductCatalogItem] = Field(default_factory=list)


class MatchProductSuggestion(BaseModel):
    code: str
    name: str
    confidence: float


class MatchProductResponse(BaseModel):
    matched: Optional[MatchProductSuggestion] = None
    suggestions: list[MatchProductSuggestion] = Field(default_factory=list)
