"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  LayoutDashboard,
  Building2,
  FileCheck2,
  LineChart,
  Users,
  Package,
  Settings,
  LogOut,
  ScanLine,
  ClipboardList,
  MoreHorizontal,
  X,
} from "lucide-react";
import { SmhitLogo } from "./ui/SmhitLogo";
import { useAuthStore } from "@/store/auth";
import { useLogout } from "@/hooks/useAuth";

const NAV = [
  // Agent (§2/§11) : mêmes actions que sur mobile, disponibles aussi sur web.
  { href: "/scan", label: "Scanner une fiche", short: "Scanner", icon: ScanLine, roles: ["AGENT"] },
  { href: "/my-fiches", label: "Mes fiches", short: "Fiches", icon: ClipboardList, roles: ["AGENT"] },
  // Admin / SuperAdmin
  { href: "/dashboard", label: "Dashboard", short: "Accueil", icon: LayoutDashboard, roles: ["ADMIN", "SUPER_ADMIN"] },
  { href: "/clients", label: "Clients", short: "Clients", icon: Building2, roles: ["ADMIN", "SUPER_ADMIN"] },
  { href: "/reports", label: "Rapports", short: "Rapports", icon: FileCheck2, roles: ["ADMIN", "SUPER_ADMIN"] },
  { href: "/analytics", label: "Analytics", short: "Stats", icon: LineChart, roles: ["ADMIN", "SUPER_ADMIN"] },
  { href: "/admin/users", label: "Utilisateurs", short: "Users", icon: Users, roles: ["SUPER_ADMIN"] },
  { href: "/admin/products", label: "Catalogue produits", short: "Produits", icon: Package, roles: ["SUPER_ADMIN"] },
  { href: "/admin/settings", label: "Paramètres", short: "Réglages", icon: Settings, roles: ["SUPER_ADMIN"] },
];

// Barre du bas façon app mobile : 4 onglets max + "Plus" si le rôle a plus
// d'items (SuperAdmin). Au-delà on regroupe dans le tiroir "Plus" plutôt que
// de tasser des icônes illisibles sur un écran de téléphone.
const MOBILE_TAB_LIMIT = 4;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const [sheetOpen, setSheetOpen] = useState(false);

  const items = NAV.filter((item) => user && item.roles.includes(user.role));
  const tabItems = items.slice(0, MOBILE_TAB_LIMIT);
  const overflowItems = items.slice(MOBILE_TAB_LIMIT);
  const overflowActive = overflowItems.some((item) => pathname.startsWith(item.href));

  return (
    <div className="flex min-h-screen bg-bg">
      {/* Sidebar — desktop uniquement (>= md) */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface px-4 py-6 md:flex">
        <div className="mb-8 flex items-center gap-3 px-2">
          <SmhitLogo size={38} />
          <div>
            <p className="font-heading text-base font-bold leading-none text-ink">SMHIT</p>
            <p className="text-[11px] text-muted">Lutte antiparasitaire</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {items.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active ? "bg-brand-light text-brand-600" : "text-muted hover:bg-bg hover:text-ink",
                )}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 border-t border-border pt-4">
          <div className="mb-2 px-2">
            <p className="truncate text-sm font-medium text-ink">{user?.fullName}</p>
            <p className="truncate text-xs text-muted">{user?.role}</p>
          </div>
          <button
            onClick={() => logout.mutate()}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-bg hover:text-danger"
          >
            <LogOut size={18} />
            Déconnexion
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        {/* En-tête compact — mobile uniquement, sticky comme une app native */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-surface/95 px-4 py-3 backdrop-blur md:hidden [padding-top:max(0.75rem,env(safe-area-inset-top))]">
          <div className="flex items-center gap-2.5">
            <SmhitLogo size={30} />
            <p className="font-heading text-sm font-bold leading-none text-ink">SMHIT</p>
          </div>
          <button
            onClick={() => setSheetOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-bg text-xs font-semibold text-brand-600"
            aria-label="Compte"
          >
            {user?.fullName?.[0]?.toUpperCase() ?? "?"}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto pb-24 md:pb-0">
          <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 md:px-8 md:py-8">{children}</div>
        </main>

        {/* Barre d'onglets du bas — mobile uniquement, comme une app native */}
        <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-surface/95 backdrop-blur md:hidden [padding-bottom:env(safe-area-inset-bottom)]">
          {tabItems.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                  active ? "text-brand-600" : "text-muted",
                )}
              >
                <Icon size={20} />
                {item.short}
              </Link>
            );
          })}
          {overflowItems.length > 0 && (
            <button
              onClick={() => setSheetOpen(true)}
              className={clsx(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                overflowActive ? "text-brand-600" : "text-muted",
              )}
            >
              <MoreHorizontal size={20} />
              Plus
            </button>
          )}
        </nav>

        {/* Tiroir "Plus" — reste de la nav + compte + déconnexion */}
        {sheetOpen && (
          <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-ink/40 animate-[fadeIn_0.15s_ease-out]" onClick={() => setSheetOpen(false)} />
            <div className="absolute inset-x-0 bottom-0 rounded-t-card bg-surface p-4 shadow-soft [padding-bottom:max(1rem,env(safe-area-inset-bottom))]">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="truncate text-sm font-semibold text-ink">{user?.fullName}</p>
                  <p className="truncate text-xs text-muted">{user?.role}</p>
                </div>
                <button
                  onClick={() => setSheetOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-bg"
                  aria-label="Fermer"
                >
                  <X size={18} />
                </button>
              </div>

              {overflowItems.length > 0 && (
                <div className="mb-2 space-y-1 border-t border-border pt-3">
                  {overflowItems.map((item) => {
                    const active = pathname.startsWith(item.href);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setSheetOpen(false)}
                        className={clsx(
                          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                          active ? "bg-brand-light text-brand-600" : "text-muted hover:bg-bg hover:text-ink",
                        )}
                      >
                        <Icon size={18} />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}

              <button
                onClick={() => logout.mutate()}
                className="flex w-full items-center gap-3 rounded-xl border-t border-border px-3 py-3 text-sm font-medium text-danger"
              >
                <LogOut size={18} />
                Déconnexion
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
