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

export function useDeactivateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/products/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}
