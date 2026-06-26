import { isGroupStageComplete } from "@/lib/standings/build-knockout-bracket";
import type { PartidoGrupoRow } from "@/lib/standings/calculate-group-standings";
import { createServerDataClient } from "@/lib/supabase/server-data";

const GROUP_STAGE_SELECT =
  "grupo, estatus, marcador_local, marcador_visitante, fase";

/** Indica si los 12 grupos cerraron sus 6 partidos (fase de grupos terminada). */
export async function fetchGroupStageComplete(): Promise<boolean> {
  const supabase = createServerDataClient();
  const { data, error } = await supabase
    .from("partidos")
    .select(GROUP_STAGE_SELECT)
    .eq("fase", "grupos")
    .not("grupo", "is", null);

  if (error) throw new Error(error.message);

  const rows: PartidoGrupoRow[] = (data ?? []).map((p) => ({
    id: "",
    grupo: p.grupo,
    fase: p.fase,
    equipo_local_codigo: "",
    equipo_visitante_codigo: "",
    equipo_local_nombre: "",
    equipo_visitante_nombre: "",
    marcador_local: p.marcador_local,
    marcador_visitante: p.marcador_visitante,
    estatus: p.estatus,
  }));

  return isGroupStageComplete(rows);
}
