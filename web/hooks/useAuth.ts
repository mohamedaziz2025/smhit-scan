import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);

  return useMutation({
    mutationFn: async (input: { email: string; password: string }) => {
      const { data } = await api.post("/auth/login", input);
      return data;
    },
    onSuccess: (data) => {
      setSession(data.user, data.accessToken, data.refreshToken);
    },
  });
}

export function useLogout() {
  const { refreshToken, logout } = useAuthStore();

  return useMutation({
    mutationFn: async () => {
      if (refreshToken) await api.post("/auth/logout", { refreshToken }).catch(() => {});
    },
    onSuccess: () => logout(),
  });
}
