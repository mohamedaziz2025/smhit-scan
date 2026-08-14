import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface FicheDto {
  _id: string;
  clientId: string;
  siteId: string;
  status: string;
  source: string;
  interventionDate: string;
  createdByAgentId: string;
  scanImageUrls: string[];
  ocrConfidence?: number;
  deratExterne?: { zones: ZoneDto[] };
  deratInterne?: { zones: ZoneDto[] };
  desinsectisation?: { lignes: LigneDesinsectDto[]; observationsGenerales?: string };
}

export interface ProduitDto {
  refCode?: string;
  name?: string;
  codeProduit?: string;
  numLot?: string;
  concentration?: string;
  dlc?: string;
}

export interface PosteDto {
  posteNo: number;
  // Dératisation externe : intact/appatAltere/presenceCadavres/consomme/disparu.
  // Dératisation interne : intact/plaqueAlteree/presenceCadavres/disparu.
  etatAppat?: Record<string, boolean>;
  etatPlaque?: Record<string, boolean>;
  action?: { remplace?: boolean };
  produit?: ProduitDto;
  etatPorteAppat?: { inaccessible?: boolean; disparu?: boolean; malFixe?: boolean; casse?: boolean };
}

export interface ZoneDto {
  zoneLabel: string;
  postes: PosteDto[];
}

export interface LigneDesinsectDto {
  zoneTraitee: string;
  produit?: ProduitDto;
  observations?: string;
}

export function useFiches(params: { clientId?: string; status?: string; page?: number } = {}) {
  return useQuery({
    queryKey: ["fiches", params],
    queryFn: async () => {
      const { data } = await api.get("/fiches", { params: { limit: 20, ...params } });
      return data as { items: FicheDto[]; total: number };
    },
  });
}

export function useFiche(id: string | undefined) {
  return useQuery({
    queryKey: ["fiche", id],
    queryFn: async () => {
      const { data } = await api.get(`/fiches/${id}`);
      return data as FicheDto;
    },
    enabled: !!id,
  });
}

/**
 * Scan (§11) — équivalent web de l'écran mobile : l'agent choisit
 * client/site, uploade une ou plusieurs images (au lieu de la caméra native),
 * POST /fiches/scan crée la fiche DRAFT pré-remplie par l'IA/OCR.
 */
export function useCreateFicheScan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { clientId: string; siteId: string; ficheType: string; files: File[] }) => {
      const form = new FormData();
      form.append("clientId", input.clientId);
      form.append("siteId", input.siteId);
      form.append("ficheType", input.ficheType);
      input.files.forEach((f) => form.append("images", f));

      // Ne PAS fixer Content-Type ici : un FormData a besoin d'un boundary
      // généré par le navigateur au moment de l'envoi ("multipart/form-data;
      // boundary=..."). En l'écrasant par la chaîne littérale (sans
      // boundary), le corps multipart devient illisible côté serveur
      // (multer échoue à parser clientId/siteId/images) — Axios met le bon
      // header automatiquement dès qu'on le laisse faire.
      const { data } = await api.post("/fiches/scan", form);
      return data as FicheDto;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fiches"] }),
  });
}

export function usePatchFiche() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & Partial<FicheDto>) => {
      const { data } = await api.patch(`/fiches/${id}`, input);
      return data as FicheDto;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["fiche", id] });
      qc.invalidateQueries({ queryKey: ["fiches"] });
    },
  });
}

export function useValidateFiche() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/fiches/${id}/validate`);
      return data as FicheDto;
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["fiche", id] });
      qc.invalidateQueries({ queryKey: ["fiches"] });
    },
  });
}
