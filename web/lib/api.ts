import axios from "axios";
import { useAuthStore } from "@/store/auth";

/**
 * Client HTTP centralisé — attache l'access token à chaque requête et tente
 * un refresh transparent sur 401 (même stratégie que le client mobile Dio,
 * cf. mobile/lib/core/network/api_client.dart). L'access token dure 15 min.
 */
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api",
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing: Promise<string | null> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const isAuthRoute = error.config?.url?.includes("/auth/");
    if (error.response?.status !== 401 || isAuthRoute || error.config?._retried) {
      return Promise.reject(error);
    }

    const refreshToken = useAuthStore.getState().refreshToken;
    if (!refreshToken) return Promise.reject(error);

    refreshing ??= axios
      .post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken })
      .then((res) => {
        useAuthStore.getState().setTokens(res.data.accessToken, res.data.refreshToken);
        return res.data.accessToken as string;
      })
      .catch(() => {
        useAuthStore.getState().logout();
        return null;
      })
      .finally(() => {
        refreshing = null;
      });

    const newAccessToken = await refreshing;
    if (!newAccessToken) return Promise.reject(error);

    error.config._retried = true;
    error.config.headers.Authorization = `Bearer ${newAccessToken}`;
    return api.request(error.config);
  },
);
