"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Building2, ChevronRight } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { useClients } from "@/hooks/useClients";

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useClients(search || undefined);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-ink">Clients</h1>
        <p className="mt-1 text-sm text-muted">Sites, fiches et rapports par client.</p>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un client…"
          className="h-11 w-full rounded-xl border border-border bg-surface pl-10 pr-3 text-sm outline-none focus:border-brand"
        />
      </div>

      <GlassCard className="p-0">
        {isLoading ? (
          <p className="p-6 text-sm text-muted">Chargement…</p>
        ) : data?.length === 0 ? (
          <p className="p-6 text-sm text-muted">Aucun client trouvé.</p>
        ) : (
          <div className="divide-y divide-border">
            {data?.map((client) => (
              <Link
                key={client._id}
                href={`/clients/${client._id}`}
                className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-bg"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light text-brand-600">
                  <Building2 size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-ink">{client.name}</p>
                  {client.code && <p className="text-xs text-muted">{client.code}</p>}
                </div>
                <ChevronRight size={18} className="text-muted" />
              </Link>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
