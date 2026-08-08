"use client";

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
} from "lucide-react";
import { SmhitLogo } from "./ui/SmhitLogo";
import { useAuthStore } from "@/store/auth";
import { useLogout } from "@/hooks/useAuth";

const NAV = [
  // Agent (§2/§11) : mêmes actions que sur mobile, disponibles aussi sur web.
  { href: "/scan", label: "Scanner une fiche", icon: ScanLine, roles: ["AGENT"] },
  { href: "/my-fiches", label: "Mes fiches", icon: ClipboardList, roles: ["AGENT"] },
  // Admin / SuperAdmin
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "SUPER_ADMIN"] },
  { href: "/clients", label: "Clients", icon: Building2, roles: ["ADMIN", "SUPER_ADMIN"] },
  { href: "/reports", label: "Rapports", icon: FileCheck2, roles: ["ADMIN", "SUPER_ADMIN"] },
  { href: "/analytics", label: "Analytics", icon: LineChart, roles: ["ADMIN", "SUPER_ADMIN"] },
  { href: "/admin/users", label: "Utilisateurs", icon: Users, roles: ["SUPER_ADMIN"] },
  { href: "/admin/products", label: "Catalogue produits", icon: Package, roles: ["SUPER_ADMIN"] },
  { href: "/admin/settings", label: "Paramètres", icon: Settings, roles: ["SUPER_ADMIN"] },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();

  const items = NAV.filter((item) => user && item.roles.includes(user.role));

  return (
    <div className="flex min-h-screen bg-bg">
      <aside className="flex w-64 flex-col border-r border-border bg-surface px-4 py-6">
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

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
