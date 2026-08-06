import { useEffect, useState } from "react";
import { api } from "@/lib/api";

/**
 * Les images de scan exigent un Bearer token (§13) — un <img src> classique
 * ne l'enverrait pas. On les récupère en blob via le client authentifié.
 */
export function useFicheImage(ficheId: string, index: number): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    api
      .get(`/fiches/${ficheId}/images/${index}`, { responseType: "blob" })
      .then((res) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(res.data as Blob);
        setUrl(objectUrl);
      })
      .catch(() => setUrl(null));

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [ficheId, index]);

  return url;
}
