"use client";

import { useEffect, useState } from "react";

export function useFrameleafAlbums(integrationIds: string[]) {
  const id = integrationIds.length === 1 ? integrationIds[0] : undefined;
  const [result, setResult] = useState({
    data: [] as { value: string; label: string }[],
    isPending: false,
    isError: false,
  });
  useEffect(() => {
    const controller = new AbortController();
    setResult({ data: [], isPending: Boolean(id), isError: false });
    if (id)
      void fetch(`/api/integrations/frameleaf/albums?integrationId=${encodeURIComponent(id)}`, {
        cache: "no-store",
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) throw new Error();
          return (await response.json()) as { albums: { id: string; name: string }[] };
        })
        .then(({ albums }) => {
          if (!controller.signal.aborted)
            setResult({
              data: albums.map((album) => ({ value: album.id, label: album.name })),
              isPending: false,
              isError: false,
            });
        })
        .catch(() => {
          if (!controller.signal.aborted) setResult({ data: [], isPending: false, isError: true });
        });
    return () => controller.abort();
  }, [id]);
  return result;
}
