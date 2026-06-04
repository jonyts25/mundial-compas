import { createServerDataClient } from "@/lib/supabase/server-data";
import type { FaseMundial } from "@/types/database";

const FASE_ORDER: FaseMundial[] = [
  "grupos",
  "dieciseisavos",
  "octavos",
  "cuartos",
  "semifinal",
  "tercer_lugar",
  "final",
];

export interface QuinielaFilterOptions {
  jornadas: number[];
  fases: FaseMundial[];
}

/** Jornadas y fases presentes en partidos abiertos del torneo (para selectores UI). */
export async function fetchQuinielaFilterOptions(): Promise<QuinielaFilterOptions> {
  const supabase = createServerDataClient();
  const { data, error } = await supabase
    .from("partidos")
    .select("jornada, fase")
    .in("estatus", ["programado", "aplazado", "en_vivo", "medio_tiempo"]);

  if (error) throw new Error(error.message);

  const jornadaSet = new Set<number>();
  const faseSet = new Set<FaseMundial>();

  for (const row of data ?? []) {
    const j = row.jornada as number | null;
    if (j != null && !Number.isNaN(j)) jornadaSet.add(j);
    const f = row.fase as FaseMundial;
    if (f) faseSet.add(f);
  }

  return {
    jornadas: [...jornadaSet].sort((a, b) => a - b),
    fases: FASE_ORDER.filter((f) => faseSet.has(f)),
  };
}
