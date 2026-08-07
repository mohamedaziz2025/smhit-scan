import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface SettingsDto {
  aiConfidenceThreshold: number;
  riskMoyenMax: number;
  riskEleveMinCaptures: number;
}

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data } = await api.get("/settings");
      return data as SettingsDto;
    },
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<SettingsDto>) => {
      const { data } = await api.patch("/settings", input);
      return data as SettingsDto;
    },
    onSuccess: (data) => qc.setQueryData(["settings"], data),
  });
}
