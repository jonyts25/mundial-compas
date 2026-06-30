"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { EstatusPartido, FaseMundial } from "@/types/database";

interface PartidoRefreshRow {
  id?: string;
  fase?: FaseMundial | string;
  estatus?: EstatusPartido;
  metadata?: Record<string, unknown> | null;
}

interface PosicionesLiveRefreshProps {
  /** Refresca tablas de grupos al finalizar partidos de fase de grupos. */
  refreshOnGroupFinal?: boolean;
  /** Refresca cuadro eliminatorio al actualizar partidos de knockout. */
  refreshOnKnockoutUpdate?: boolean;
  /** Respaldo por polling si hay partidos en vivo. */
  pollWhileLive?: boolean;
}

function hasPenaltyMetadata(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object") return false;
  const m = metadata as Record<string, unknown>;
  return m.marcador_penales_local != null || m.marcador_penales_visitante != null;
}

/**
 * Refresca /posiciones cuando cambian resultados relevantes (grupos o eliminatoria).
 */
export function PosicionesLiveRefresh({
  refreshOnGroupFinal = false,
  refreshOnKnockoutUpdate = false,
  pollWhileLive = false,
}: PosicionesLiveRefreshProps) {
  const router = useRouter();
  const refreshTimer = useRef<number | null>(null);
  const seenKeys = useRef(new Set<string>());

  useEffect(() => {
    if (!refreshOnGroupFinal && !refreshOnKnockoutUpdate) return;

    const scheduleRefresh = () => {
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
      refreshTimer.current = window.setTimeout(() => {
        router.refresh();
      }, 800);
    };

    const supabase = createClient();
    const channel = supabase
      .channel("posiciones-live-refresh")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "partidos",
        },
        (payload) => {
          const row = payload.new as PartidoRefreshRow;
          if (!row.id) return;

          if (refreshOnGroupFinal && row.fase === "grupos" && row.estatus === "finalizado") {
            const key = `grupo:${row.id}`;
            if (seenKeys.current.has(key)) return;
            seenKeys.current.add(key);
            scheduleRefresh();
            return;
          }

          if (refreshOnKnockoutUpdate && row.fase && row.fase !== "grupos") {
            if (row.estatus !== "finalizado" && !hasPenaltyMetadata(row.metadata)) {
              return;
            }
            scheduleRefresh();
          }
        },
      )
      .subscribe();

    return () => {
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
      void supabase.removeChannel(channel);
    };
  }, [refreshOnGroupFinal, refreshOnKnockoutUpdate, router]);

  useEffect(() => {
    if (!pollWhileLive) return;

    const id = window.setInterval(() => router.refresh(), 60_000);
    return () => window.clearInterval(id);
  }, [pollWhileLive, router]);

  return null;
}
