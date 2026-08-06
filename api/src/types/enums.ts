/** Rôles RBAC — §2 du cahier des charges. */
export enum UserRole {
  AGENT = "AGENT",
  ADMIN = "ADMIN",
  SUPER_ADMIN = "SUPER_ADMIN",
}

/** États d'une fiche — §5. */
export enum FicheStatus {
  SCANNING = "SCANNING",
  DRAFT = "DRAFT",
  AGENT_VALIDATED = "AGENT_VALIDATED",
  LOCKED = "LOCKED",
}

/** États d'un rapport — §5. */
export enum ReportStatus {
  PENDING_ADMIN = "PENDING_ADMIN",
  IN_REVIEW = "IN_REVIEW",
  VALIDATED = "VALIDATED",
  RETURNED = "RETURNED",
}

/** Catégories du catalogue produits — §6.3, préfixes décrits en Annexe A. */
export enum ProductCategory {
  RODENTICIDE = "rodenticide",
  GLUE_BOARD = "glue_board",
  INSECTICIDE = "insecticide",
  DISINFECTANT = "disinfectant",
  FUMIGANT = "fumigant",
  HERBICIDE = "herbicide",
  OTHER = "other",
}

/** Types de fiches — §6 intro. */
export enum FicheType {
  DERATISATION_EXTERNE = "DERATISATION_EXTERNE",
  DERATISATION_INTERNE = "DERATISATION_INTERNE",
  DESINSECTISATION = "DESINSECTISATION",
}

/** Granularité des périodes d'analyse — §6.5 / §10. */
export enum PeriodType {
  DAY = "DAY",
  WEEK = "WEEK",
  FORTNIGHT = "FORTNIGHT",
  MONTH = "MONTH",
  QUARTER = "QUARTER",
  YEAR = "YEAR",
}

/** Niveaux de risque — §8 (matrice paramétrable). */
export enum RiskLevel {
  FAIBLE = "Faible",
  MOYEN = "Moyen",
  ELEVE = "Élevé",
}
