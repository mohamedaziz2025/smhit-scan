/**
 * Placeholder de la racine — le vrai /dashboard (KPIs, fiches du jour,
 * rapports en attente) arrive au Module 7 (§10 du cahier des charges).
 */
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <span className="rounded-full bg-brand/10 px-4 py-1 text-sm font-medium text-brand-600">
        SMHIT
      </span>
      <h1 className="font-heading text-3xl font-semibold text-ink">
        Digitalisation des fiches de lutte antiparasitaire
      </h1>
      <p className="max-w-md text-muted">
        Squelette Module 1 — le dashboard (clients, fiches, rapports, analytics)
        sera construit au Module 7.
      </p>
    </main>
  );
}
