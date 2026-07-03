import type { SupabaseClient } from "@supabase/supabase-js";
import { getMexicoDayBounds, toMexicoDateKey } from "@/lib/datetime/mexico";
import {
  buildTeamPairKey,
  type PartidoMatchKeyFields,
} from "@/lib/partidos/partido-match-key";
import { isPlaceholderFixtureId } from "@/lib/world-cup/knockout-match-ids";

export const DEDUPE_MIGRATION_NAME = "admin_dedupe_partidos";

export type PartidoDedupeRow = {
  id: string;
  fecha_kickoff: string;
  equipo_local_nombre: string;
  equipo_visitante_nombre: string;
  api_football_fixture_id: number | null;
  estatus: string;
  fase: string;
  metadata?: Record<string, unknown> | null;
};

export type PronosticoSummary = {
  partido_id: string;
  liga_id: string;
  usuario_id: string;
  goles_local: number;
  goles_visitante: number;
};

export type DuplicateGroup = {
  key: string;
  partidos: PartidoDedupeRow[];
  canonical_id: string;
  legacy_ids: string[];
  pronosticos: PronosticoSummary[];
};

export type DedupeAuditResult = {
  dateKey: string;
  totalPartidos: number;
  duplicateGroups: DuplicateGroup[];
  hasDuplicates: boolean;
};

export type DedupeConsolidateResult = DedupeAuditResult & {
  consolidated: number;
  knockoutReconciled: number;
  errors: string[];
  dryRun: boolean;
};

const PARTIDO_SELECT =
  "id, fecha_kickoff, equipo_local_nombre, equipo_visitante_nombre, api_football_fixture_id, estatus, fase, metadata";

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Día calendario de mañana en CDMX (YYYY-MM-DD). */
export function tomorrowMexicoDateKey(reference = new Date()): string {
  return toMexicoDateKey(addDays(reference, 1));
}

function canonicalPartidoScore(
  partido: PartidoMatchKeyFields,
  pronosticosPorPartido: Record<string, unknown>,
): number {
  let score = 0;
  if (pronosticosPorPartido[partido.id]) score += 4;
  if (!isPlaceholderFixtureId(partido.api_football_fixture_id)) score += 8;
  if (partido.estatus === "en_vivo" || partido.estatus === "medio_tiempo") {
    score += 1;
  }
  return score;
}

/** Elige fila canonical entre duplicados (fixture real > placeholder, con preds). */
function pickCanonicalPartido(
  rows: PartidoDedupeRow[],
  pronosticosPorPartido: Record<string, unknown>,
): PartidoDedupeRow {
  return [...rows].sort(
    (a, b) =>
      canonicalPartidoScore(b, pronosticosPorPartido) -
      canonicalPartidoScore(a, pronosticosPorPartido),
  )[0]!;
}

/** Agrupa partidos con mismos equipos el mismo día CDMX (captura kickoffs distintos). */
export function findDuplicateGroups(
  partidos: PartidoDedupeRow[],
  pronosticosPorPartido: Record<string, unknown> = {},
): DuplicateGroup[] {
  const byTeamDay = new Map<string, PartidoDedupeRow[]>();

  for (const partido of partidos) {
    const key = `${buildTeamPairKey(partido)}|${toMexicoDateKey(partido.fecha_kickoff)}`;
    const list = byTeamDay.get(key) ?? [];
    list.push(partido);
    byTeamDay.set(key, list);
  }

  const groups: DuplicateGroup[] = [];

  for (const [key, rows] of byTeamDay) {
    if (rows.length < 2) continue;

    const canonical = pickCanonicalPartido(rows, pronosticosPorPartido);
    groups.push({
      key,
      partidos: rows,
      canonical_id: canonical.id,
      legacy_ids: rows.filter((row) => row.id !== canonical.id).map((row) => row.id),
      pronosticos: [],
    });
  }

  return groups;
}

async function fetchPronosticosForPartidos(
  supabase: SupabaseClient,
  partidoIds: string[],
): Promise<PronosticoSummary[]> {
  if (partidoIds.length === 0) return [];

  const { data, error } = await supabase
    .from("pronosticos")
    .select("partido_id, liga_id, usuario_id, goles_local, goles_visitante")
    .in("partido_id", partidoIds);

  if (error) throw new Error(error.message);
  return (data ?? []) as PronosticoSummary[];
}

/** Audita duplicados para un día CDMX (por defecto mañana). */
export async function auditPartidoDuplicates(
  supabase: SupabaseClient,
  options: { dateKey?: string; includeAll?: boolean } = {},
): Promise<DedupeAuditResult> {
  const dateKey = options.dateKey ?? tomorrowMexicoDateKey();

  let query = supabase
    .from("partidos")
    .select(PARTIDO_SELECT)
    .neq("estatus", "cancelado");

  if (!options.includeAll) {
    const [year, month, day] = dateKey.split("-").map(Number);
    const { start, end } = getMexicoDayBounds(new Date(year, month - 1, day));
    query = query
      .gte("fecha_kickoff", start.toISOString())
      .lte("fecha_kickoff", end.toISOString());
  }

  const { data: partidos, error } = await query.order("fecha_kickoff", {
    ascending: true,
  });
  if (error) throw new Error(error.message);

  const rows = (partidos ?? []) as PartidoDedupeRow[];
  const pronosticos = await fetchPronosticosForPartidos(
    supabase,
    rows.map((row) => row.id),
  );

  const pronosticosPorPartido: Record<string, unknown> = {};
  for (const pronostico of pronosticos) {
    pronosticosPorPartido[pronostico.partido_id] = pronostico;
  }

  const duplicateGroups = findDuplicateGroups(rows, pronosticosPorPartido);
  for (const group of duplicateGroups) {
    const ids = new Set(group.partidos.map((row) => row.id));
    group.pronosticos = pronosticos.filter((pronostico) =>
      ids.has(pronostico.partido_id),
    );
  }

  return {
    dateKey,
    totalPartidos: rows.length,
    duplicateGroups,
    hasDuplicates: duplicateGroups.length > 0,
  };
}

async function remapPushSilenciados(
  supabase: SupabaseClient,
  canonicalId: string,
  legacyId: string,
): Promise<void> {
  const { data: legacyRows, error: fetchError } = await supabase
    .from("push_partidos_silenciados")
    .select("usuario_id")
    .eq("partido_id", legacyId);

  if (fetchError) throw new Error(fetchError.message);
  if (!legacyRows?.length) return;

  for (const row of legacyRows) {
    const { data: existing } = await supabase
      .from("push_partidos_silenciados")
      .select("id")
      .eq("partido_id", canonicalId)
      .eq("usuario_id", row.usuario_id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("push_partidos_silenciados")
        .delete()
        .eq("partido_id", legacyId)
        .eq("usuario_id", row.usuario_id);
    } else {
      await supabase
        .from("push_partidos_silenciados")
        .update({ partido_id: canonicalId })
        .eq("partido_id", legacyId)
        .eq("usuario_id", row.usuario_id);
    }
  }
}

async function consolidatePartidoPair(
  supabase: SupabaseClient,
  canonical: PartidoDedupeRow,
  legacy: PartidoDedupeRow,
): Promise<void> {
  await supabase.from("partido_dedupe_pair_archive").upsert(
    {
      migration_name: DEDUPE_MIGRATION_NAME,
      canonical_partido_id: canonical.id,
      legacy_partido_id: legacy.id,
      equipo_local_nombre: canonical.equipo_local_nombre,
      equipo_visitante_nombre: canonical.equipo_visitante_nombre,
      fecha_kickoff: canonical.fecha_kickoff,
    },
    { onConflict: "migration_name,legacy_partido_id" },
  );

  const [{ data: legacyRow }, { data: canonicalRow }] = await Promise.all([
    supabase.from("partidos").select("metadata").eq("id", legacy.id).single(),
    supabase.from("partidos").select("metadata").eq("id", canonical.id).single(),
  ]);

  if (legacyRow && canonicalRow) {
    const mergedMetadata = {
      ...((canonicalRow.metadata as Record<string, unknown> | null) ?? {}),
      ...((legacyRow.metadata as Record<string, unknown> | null) ?? {}),
    };
    const { error: metaError } = await supabase
      .from("partidos")
      .update({ metadata: mergedMetadata })
      .eq("id", canonical.id);
    if (metaError) throw new Error(metaError.message);
  }

  const { error: mergeError } = await supabase.rpc(
    "merge_pronostico_on_partido_dedupe",
    {
      p_canonical_id: canonical.id,
      p_legacy_id: legacy.id,
      p_migration_name: DEDUPE_MIGRATION_NAME,
    },
  );
  if (mergeError) throw new Error(mergeError.message);

  const { error: chatError } = await supabase
    .from("mensajes_chat")
    .update({ partido_id: canonical.id })
    .eq("partido_id", legacy.id);
  if (chatError) throw new Error(chatError.message);

  await remapPushSilenciados(supabase, canonical.id, legacy.id);

  const { error: notifyError } = await supabase
    .from("notificaciones")
    .update({ partido_id: canonical.id })
    .eq("partido_id", legacy.id);
  if (notifyError) throw new Error(notifyError.message);

  const { error: deleteError } = await supabase
    .from("partidos")
    .delete()
    .eq("id", legacy.id);
  if (deleteError) throw new Error(deleteError.message);
}

/** Consolida duplicados: primero RPC KO, luego pares restantes por equipos+día. */
export async function consolidatePartidoDuplicates(
  supabase: SupabaseClient,
  options: { dateKey?: string; dryRun?: boolean } = {},
): Promise<DedupeConsolidateResult> {
  const dryRun = options.dryRun ?? false;
  const before = await auditPartidoDuplicates(supabase, options);
  const errors: string[] = [];
  let knockoutReconciled = 0;
  let consolidated = 0;

  if (dryRun || !before.hasDuplicates) {
    return { ...before, consolidated: 0, knockoutReconciled: 0, errors, dryRun };
  }

  const { data: koPairs, error: koError } = await supabase.rpc(
    "reconcile_knockout_partido_duplicates",
  );
  if (koError) {
    errors.push(`reconcile_knockout_partido_duplicates: ${koError.message}`);
  } else {
    knockoutReconciled =
      (koPairs as Array<{ canonical_id: string; legacy_id: string }> | null)?.length ??
      0;
  }

  const afterKo = await auditPartidoDuplicates(supabase, options);

  for (const group of afterKo.duplicateGroups) {
    const canonical = group.partidos.find((row) => row.id === group.canonical_id);
    if (!canonical) continue;

    for (const legacyId of group.legacy_ids) {
      const legacy = group.partidos.find((row) => row.id === legacyId);
      if (!legacy) continue;

      try {
        await consolidatePartidoPair(supabase, canonical, legacy);
        consolidated += 1;
      } catch (error) {
        errors.push(
          error instanceof Error
            ? `${legacy.equipo_local_nombre} vs ${legacy.equipo_visitante_nombre}: ${error.message}`
            : String(error),
        );
      }
    }
  }

  const finalAudit = await auditPartidoDuplicates(supabase, options);

  return {
    ...finalAudit,
    consolidated,
    knockoutReconciled,
    errors,
    dryRun: false,
  };
}
