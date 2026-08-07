"use client";

import { useState } from "react";
import { UserPlus, Shield, Ban, CheckCircle, Trash2 } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GradientButton } from "@/components/ui/GradientButton";
import { Modal } from "@/components/ui/Modal";
import {
  useUsers,
  useCreateUser,
  useUpdateUserRole,
  useToggleUserActive,
  useDeleteUser,
  type UserDto,
} from "@/hooks/useUsers";
import type { UserRole } from "@/store/auth";

const ROLES: UserRole[] = ["AGENT", "ADMIN", "SUPER_ADMIN"];

export default function AdminUsersPage() {
  const users = useUsers();
  const createUser = useCreateUser();
  const updateRole = useUpdateUserRole();
  const toggleActive = useToggleUserActive();
  const deleteUser = useDeleteUser();

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", password: "", role: "AGENT" as UserRole });
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createUser.mutateAsync(form);
      setModalOpen(false);
      setForm({ fullName: "", email: "", password: "", role: "AGENT" });
    } catch (err) {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(message ?? "Échec de la création.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink">Utilisateurs</h1>
          <p className="mt-1 text-sm text-muted">Rôles &amp; accès — réservé Super Admin (§2).</p>
        </div>
        <GradientButton onClick={() => setModalOpen(true)}>
          <UserPlus size={16} /> Nouvel utilisateur
        </GradientButton>
      </div>

      <GlassCard className="p-0">
        {users.isLoading ? (
          <p className="p-6 text-sm text-muted">Chargement…</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted">
                <th className="px-6 py-3">Nom</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Rôle</th>
                <th className="px-6 py-3">Statut</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.data?.map((u) => (
                <UserRow
                  key={u._id}
                  user={u}
                  onRoleChange={(role) => updateRole.mutate({ id: u._id, role })}
                  onToggleActive={() => toggleActive.mutate({ id: u._id, isActive: !u.isActive })}
                  onDelete={() => deleteUser.mutate(u._id)}
                />
              ))}
            </tbody>
          </table>
        )}
      </GlassCard>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouvel utilisateur">
        <form onSubmit={handleCreate} className="space-y-3">
          <input
            required
            placeholder="Nom complet"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            className="h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm outline-none focus:border-brand"
          />
          <input
            required
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm outline-none focus:border-brand"
          />
          <input
            required
            type="password"
            placeholder="Mot de passe (8+ caractères)"
            minLength={8}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm outline-none focus:border-brand"
          />
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
            className="h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm outline-none focus:border-brand"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          {error && <p className="text-sm text-danger">{error}</p>}
          <GradientButton type="submit" disabled={createUser.isPending} className="w-full">
            {createUser.isPending ? "Création…" : "Créer"}
          </GradientButton>
        </form>
      </Modal>
    </div>
  );
}

function UserRow({
  user,
  onRoleChange,
  onToggleActive,
  onDelete,
}: {
  user: UserDto;
  onRoleChange: (role: UserRole) => void;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-6 py-3 text-ink">{user.fullName}</td>
      <td className="px-6 py-3 text-muted">{user.email}</td>
      <td className="px-6 py-3">
        <select
          value={user.role}
          onChange={(e) => onRoleChange(e.target.value as UserRole)}
          className="rounded-lg border border-border bg-bg px-2 py-1 text-xs outline-none focus:border-brand"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </td>
      <td className="px-6 py-3">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
            user.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
          }`}
        >
          <Shield size={11} /> {user.isActive ? "Actif" : "Désactivé"}
        </span>
      </td>
      <td className="px-6 py-3">
        <div className="flex justify-end gap-2">
          <button onClick={onToggleActive} className="rounded-lg p-2 text-muted hover:bg-bg hover:text-ink" title={user.isActive ? "Désactiver" : "Activer"}>
            {user.isActive ? <Ban size={16} /> : <CheckCircle size={16} />}
          </button>
          <button onClick={onDelete} className="rounded-lg p-2 text-muted hover:bg-bg hover:text-danger" title="Supprimer">
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
}
