import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SMHIT — Digitalisation des fiches de lutte antiparasitaire",
  description: "Dashboard Admin / SuperAdmin — fiches, rapports et analytics SMHIT.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="font-body min-h-screen bg-bg text-ink antialiased">{children}</body>
    </html>
  );
}
