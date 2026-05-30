"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type PushSilenciadosContextValue = {
  isSilenciado: (partidoId: string) => boolean;
  toggleSilenciado: (partidoId: string) => Promise<boolean>;
  isLoading: (partidoId: string) => boolean;
};

const PushSilenciadosContext = createContext<PushSilenciadosContextValue | null>(
  null,
);

export function PushSilenciadosProvider({
  initialIds,
  children,
}: {
  initialIds: string[];
  children: ReactNode;
}) {
  const [silenciados, setSilenciados] = useState(() => new Set(initialIds));
  const [loadingIds, setLoadingIds] = useState(() => new Set<string>());

  const isSilenciado = useCallback(
    (partidoId: string) => silenciados.has(partidoId),
    [silenciados],
  );

  const isLoading = useCallback(
    (partidoId: string) => loadingIds.has(partidoId),
    [loadingIds],
  );

  const toggleSilenciado = useCallback(async (partidoId: string) => {
    let wasSilenciado = false;
    setSilenciados((prev) => {
      wasSilenciado = prev.has(partidoId);
      return prev;
    });

    setLoadingIds((prev) => new Set(prev).add(partidoId));
    try {
      const res = await fetch(`/api/push/partidos/${partidoId}/silenciar`, {
        method: wasSilenciado ? "DELETE" : "POST",
      });
      if (!res.ok) return wasSilenciado;

      const body = (await res.json()) as { silenciado?: boolean };
      const next = Boolean(body.silenciado);

      setSilenciados((prev) => {
        const updated = new Set(prev);
        if (next) updated.add(partidoId);
        else updated.delete(partidoId);
        return updated;
      });

      return next;
    } finally {
      setLoadingIds((prev) => {
        const updated = new Set(prev);
        updated.delete(partidoId);
        return updated;
      });
    }
  }, []);

  const value = useMemo(
    () => ({ isSilenciado, toggleSilenciado, isLoading }),
    [isSilenciado, toggleSilenciado, isLoading],
  );

  return (
    <PushSilenciadosContext.Provider value={value}>
      {children}
    </PushSilenciadosContext.Provider>
  );
}

export function usePushPartidoSilenciado(partidoId: string) {
  const ctx = useContext(PushSilenciadosContext);
  if (!ctx) {
    throw new Error(
      "usePushPartidoSilenciado must be used within PushSilenciadosProvider",
    );
  }

  const silenciado = ctx.isSilenciado(partidoId);
  const loading = ctx.isLoading(partidoId);
  const toggle = useCallback(
    () => ctx.toggleSilenciado(partidoId),
    [ctx, partidoId],
  );

  return { silenciado, loading, toggle };
}
