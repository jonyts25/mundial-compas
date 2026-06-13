"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { EstatusPartido } from "@/types/database";

interface PartidoGruposRow {
  id?: string;
  fase?: string;
  estatus?: EstatusPartido;
}

interface PosicionesLiveRefreshProps {
  /** Activo mientras la fase de grupos no haya terminado. */
  enabled: boolean;
  /** Respaldo por polling si hay partidos en vivo (webhook/realtime). */
  pollWhileLive?: boolean;
}

/**
 * Refresca /posiciones cuando un partido de grupos pasa a finalizado
 * (tablas + ronda de 32). Usa Supabase Realtime + polling opcional en vivo.
 */
export function PosicionesLiveRefresh({
  enabled,
  pollWhileLive = false,
}: PosicionesLiveRefreshProps) {
  const router = useRouter();
  const refreshTimer = useRef<number | null>(null);
  const finalizedIds = useRef(new Set<string>());

  useEffect(() => {
    if (!enabled) return;

    const scheduleRefresh = () => {
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
      refreshTimer.current = window.setTimeout(() => {
        router.refresh();
      }, 800);
    };

    const supabase = createClient();
    const channel = supabase
      .channel("posiciones-grupos-final")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "partidos",
          filter: "fase=eq.grupos",
        },
        (payload) => {
          const row = payload.new as PartidoGruposRow;
          if (row.fase !== "grupos" || row.estatus !== "finalizado") return;
          if (!row.id || finalizedIds.current.has(row.id)) return;

          finalizedIds.current.add(row.id);
          scheduleRefresh();
        },
      )
      .subscribe();

    return () => {
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
      void supabase.removeChannel(channel);
    };
  }, [enabled, router]);

  useEffect(() => {
    if (!enabled || !pollWhileLive) return;

    const id = window.setInterval(() => router.refresh(), 60_000);
    return () => window.clearInterval(id);
  }, [enabled, pollWhileLive, router]);

  return null;
}
