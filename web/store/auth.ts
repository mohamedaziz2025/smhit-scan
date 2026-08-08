import { create } from "zustand";
import { persist } from "zustand/middleware";

export type UserRole = "AGENT" | "ADMIN" | "SUPER_ADMIN";

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
}

interface AuthStoreState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  setSession: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

/**
 * Session persistée en localStorage — les 3 rôles (Agent/Admin/SuperAdmin)
 * peuvent se connecter au web ; le contenu affiché varie selon le rôle
 * (AppShell filtre la nav, §2). Le refresh transparent est géré par `lib/api.ts`.
 *
 * Note hydratation : le composant <AuthGuard> gère le décalage SSR/CSR
 * (localStorage indisponible côté serveur) via un flag `mounted` local
 * plutôt que de dépendre d'un état de rehydration exposé par ce store.
 */
export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setSession: (user, accessToken, refreshToken) => set({ user, accessToken, refreshToken }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      logout: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    { name: "smhit-auth" },
  ),
);
