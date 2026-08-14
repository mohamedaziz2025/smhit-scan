import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface ProductDto {
  _id: string;
  code: string;
  name: string;
  category: string;
  activeSubstance?: string;
  concentration?: string;
  isToxic: boolean;
  isActive: boolean;
}

export function useProducts(params: { search?: string; category?: string } = {}) {
  return useQuery({
    queryKey: ["products", params],
    queryFn: async () => {
      const { data } = await api.get("/products", { params: { limit: 200, ...params } });
      return data.items as ProductDto[];
    },
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<ProductDto>) => {
      const { data } = await api.post("/products", input);
      return data as ProductDto;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<ProductDto> & { id: string }) => {
      const { data } = await api.patch(`/products/${id}`, input);
      return data as ProductDto;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export interface ImportSummary {
  created: number;
  updated: number;
  errors: Array<{ row: number; message: string }>;
  total: number;
}

/** Import Excel du catalogue (§9) — colonnes attendues : code, name (+ category/activeSubstance/concentration optionnels). */
export function useImportProducts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      // Pas de Content-Type manuel — voir la note dans useCreateFicheScan
      // (useFiches.ts) : ça casse le boundary multipart généré par le navigateur.
      const { data } = await api.post("/products/import", form);
      return data as ImportSummary;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

/** Résolution réf -> nom commercial (§9), utilisée par l'éditeur de fiche. */
export function useResolveProduct() {
  return useMutation({
    mutationFn: async (ref: string) => {
      const { data } = await api.get("/products/resolve", { params: { ref } });
      return data as { code: string; name: string; category: string };
    },
  });
}

export function useDeactivateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/products/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}
