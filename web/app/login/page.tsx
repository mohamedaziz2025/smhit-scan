"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, LogIn, Eye, EyeOff } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GradientButton } from "@/components/ui/GradientButton";
import { SmhitLogo } from "@/components/ui/SmhitLogo";
import { useLogin } from "@/hooks/useAuth";

export default function LoginPage() {
  const router = useRouter();
  const login = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [obscure, setObscure] = useState(true);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const result = await login.mutateAsync({ email, password });
      // §2 : l'agent n'a pas accès au dashboard admin — il atterrit sur son
      // propre point d'entrée (scan), identique à l'écran d'accueil mobile.
      router.push(result.user.role === "AGENT" ? "/scan" : "/dashboard");
    } catch {
      // erreur affichée via login.isError ci-dessous
    }
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center p-6"
      style={{ background: "linear-gradient(to bottom, #FFF8F2, #F8FAFC, #F8FAFC)" }}
    >
      <GlassCard className="w-full max-w-sm animate-[fadeIn_0.45s_ease-out]">
        <div className="flex flex-col items-center">
          <SmhitLogo size={56} />
          <h1 className="mt-5 font-heading text-2xl font-bold text-ink">SMHIT</h1>
          <p className="mt-1 text-center text-sm text-muted">
            Fiches, rapports &amp; analytics de lutte antiparasitaire
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="h-12 w-full rounded-xl border border-border bg-bg pl-10 pr-3 text-sm outline-none transition-colors focus:border-brand"
            />
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
            <input
              type={obscure ? "password" : "text"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe"
              className="h-12 w-full rounded-xl border border-border bg-bg pl-10 pr-10 text-sm outline-none transition-colors focus:border-brand"
            />
            <button
              type="button"
              onClick={() => setObscure(!obscure)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted"
            >
              {obscure ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
          </div>

          {login.isError && (
            <p className="text-sm text-danger">
              {(login.error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
                "Connexion impossible — vérifiez le réseau."}
            </p>
          )}

          <GradientButton type="submit" disabled={login.isPending} className="w-full">
            {login.isPending ? "Connexion…" : (
              <>
                <LogIn size={16} /> Se connecter
              </>
            )}
          </GradientButton>
        </form>

        <p className="mt-6 text-center text-[11px] text-muted">
          {process.env.NEXT_PUBLIC_API_URL}
        </p>
      </GlassCard>
    </div>
  );
}
