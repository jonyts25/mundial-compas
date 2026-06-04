import {
  parseFaseGrupoFromMetadata,
  type FaseGrupoParse,
} from "@/lib/partidos/parse-grupo";
import { createServerDataClient } from "@/lib/supabase/server-data";

export interface BackfillGrupoResult {
  total: number;
  updated: number;
  skipped: number;
  fromMetadata: number;
}

export async function backfillPartidosGrupoFromMetadata(): Promise<BackfillGrupoResult> {
  const supabase = createServerDataClient();

  const { data: partidos, error } = await supabase
    .from("partidos")
    .select("id, fase, grupo, jornada, metadata");

  if (error) throw new Error(error.message);

  let updated = 0;
  let skipped = 0;
  let fromMetadata = 0;

  for (const p of partidos ?? []) {
    const parsed = parseFaseGrupoFromMetadata(p.metadata);
    if (!parsed) {
      skipped += 1;
      continue;
    }

    fromMetadata += 1;

    const needsUpdate =
      p.fase !== parsed.fase ||
      p.grupo !== parsed.grupo ||
      p.jornada !== parsed.jornada;

    if (!needsUpdate) {
      skipped += 1;
      continue;
    }

    const { error: upErr } = await supabase
      .from("partidos")
      .update({
        fase: parsed.fase,
        grupo: parsed.grupo,
        jornada: parsed.jornada,
      })
      .eq("id", p.id);

    if (upErr) throw new Error(upErr.message);
    updated += 1;
  }

  return {
    total: partidos?.length ?? 0,
    updated,
    skipped,
    fromMetadata,
  };
}

export function mergeFaseGrupoUpdate(
  current: { fase: string; grupo: string | null; jornada: number | null },
  parsed: FaseGrupoParse,
): boolean {
  return (
    current.fase !== parsed.fase ||
    current.grupo !== parsed.grupo ||
    current.jornada !== parsed.jornada
  );
}
