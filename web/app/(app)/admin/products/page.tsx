"use client";

import { useRef, useState } from "react";
import { PackagePlus, Trash2, Pencil, FileSpreadsheet } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GradientButton } from "@/components/ui/GradientButton";
import { Modal } from "@/components/ui/Modal";
import {
  useProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeactivateProduct,
  useImportProducts,
  type ProductDto,
} from "@/hooks/useProducts";

const CATEGORIES = ["rodenticide", "glue_board", "insecticide", "disinfectant", "fumigant", "herbicide", "other"];

const emptyForm = { code: "", name: "", category: "rodenticide", activeSubstance: "", concentration: "", isToxic: true };

export default function AdminProductsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const products = useProducts({ search: search || undefined, category: category || undefined });
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deactivate = useDeactivateProduct();
  const importProducts = useImportProducts();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProductDto | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<string | null>(null);

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permet de réimporter le même fichier après correction
    if (!file) return;
    setImportResult(null);
    try {
      const summary = await importProducts.mutateAsync(file);
      setImportResult(
        `${summary.created} créé(s), ${summary.updated} mis à jour${
          summary.errors.length ? `, ${summary.errors.length} ligne(s) ignorée(s)` : ""
        } sur ${summary.total}.`,
      );
    } catch (err) {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setImportResult(message ?? "Échec de l'import.");
    }
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(p: ProductDto) {
    setEditing(p);
    setForm({
      code: p.code,
      name: p.name,
      category: p.category,
      activeSubstance: p.activeSubstance ?? "",
      concentration: p.concentration ?? "",
      isToxic: p.isToxic,
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (editing) await updateProduct.mutateAsync({ id: editing._id, ...form });
      else await createProduct.mutateAsync(form);
      setModalOpen(false);
    } catch (err) {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(message ?? "Échec de l'enregistrement.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink">Catalogue produits</h1>
          <p className="mt-1 text-sm text-muted">{products.data?.length ?? 0} références actives.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importProducts.isPending}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-medium text-ink hover:bg-bg disabled:opacity-50"
          >
            <FileSpreadsheet size={16} /> {importProducts.isPending ? "Import…" : "Importer Excel"}
          </button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={handleImportFile} />
          <GradientButton onClick={openCreate}>
            <PackagePlus size={16} /> Nouveau produit
          </GradientButton>
        </div>
      </div>

      {importResult && (
        <p className="rounded-xl bg-brand-light px-4 py-2.5 text-sm text-brand-600">{importResult}</p>
      )}

      <div className="flex gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher (nom, alias)…"
          className="h-11 max-w-xs flex-1 rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-brand"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-11 rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-brand"
        >
          <option value="">Toutes catégories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <GlassCard className="p-0">
        {products.isLoading ? (
          <p className="p-6 text-sm text-muted">Chargement…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted">
                  <th className="px-4 py-3 md:px-6">Code</th>
                  <th className="px-4 py-3 md:px-6">Nom</th>
                  <th className="px-4 py-3 md:px-6">Catégorie</th>
                  <th className="px-4 py-3 md:px-6">Matière active</th>
                  <th className="px-4 py-3 text-right md:px-6">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.data?.map((p) => (
                  <tr key={p._id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 font-mono text-xs text-ink md:px-6">{p.code}</td>
                    <td className="px-4 py-2.5 text-ink md:px-6">{p.name}</td>
                    <td className="px-4 py-2.5 text-muted md:px-6">{p.category}</td>
                    <td className="px-4 py-2.5 text-muted md:px-6">{p.activeSubstance ?? "—"}</td>
                    <td className="px-4 py-2.5 md:px-6">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEdit(p)} className="rounded-lg p-2 text-muted hover:bg-bg hover:text-ink">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => deactivate.mutate(p._id)} className="rounded-lg p-2 text-muted hover:bg-bg hover:text-danger">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Modifier le produit" : "Nouveau produit"}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            required
            disabled={!!editing}
            placeholder="Code (ex PLDRT021)"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            className="h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm outline-none focus:border-brand disabled:opacity-60"
          />
          <input
            required
            placeholder="Nom commercial"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm outline-none focus:border-brand"
          />
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm outline-none focus:border-brand"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            placeholder="Matière active (ex Chlorophacinone)"
            value={form.activeSubstance}
            onChange={(e) => setForm({ ...form, activeSubstance: e.target.value })}
            className="h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm outline-none focus:border-brand"
          />
          <input
            placeholder="Concentration (ex 5%)"
            value={form.concentration}
            onChange={(e) => setForm({ ...form, concentration: e.target.value })}
            className="h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm outline-none focus:border-brand"
          />
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={form.isToxic}
              onChange={(e) => setForm({ ...form, isToxic: e.target.checked })}
              className="h-4 w-4 rounded border-border accent-brand"
            />
            Produit toxique
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <GradientButton type="submit" disabled={createProduct.isPending || updateProduct.isPending} className="w-full">
            {editing ? "Enregistrer" : "Créer"}
          </GradientButton>
        </form>
      </Modal>
    </div>
  );
}
