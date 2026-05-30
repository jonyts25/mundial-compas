import { createClient } from "@/lib/supabase/server";
import { createServerDataClient } from "@/lib/supabase/server-data";
import { getMexicoDayBounds } from "@/lib/datetime/mexico";
import { pickDatoMamalonVariado } from "@/lib/datos-mamalones/pick";
import { isPartidoEnVivo } from "@/lib/partidos/labels";
import type { DatoMamalón, Partido, Usuario } from "@/types/database";

export interface HomePageData {
  usuario: Usuario;
  partidosDelDia: Partido[];
  partidosEnVivo: Partido[];
  datoMamalon: DatoMamalón | null;
}

export async function fetchHomePageData(userId: string): Promise<HomePageData> {
  const supabase = await createClient();

  const { data: usuario, error: userError } = await supabase
    .from("usuarios")
    .select("id, nombre_visible, avatar_url, quiniela_paga")
    .eq("id", userId)
    .single();

  if (userError || !usuario) {
    throw new Error("No se pudo cargar el perfil");
  }

  const { start, end } = getMexicoDayBounds();

  const { data: partidosDelDia } = await supabase
    .from("partidos")
    .select(
      "id, fase, grupo, jornada, equipo_local_codigo, equipo_visitante_codigo, equipo_local_nombre, equipo_visitante_nombre, fecha_kickoff, estatus, marcador_local, marcador_visitante, canal_transmision, minuto_actual, metadata",
    )
    .gte("fecha_kickoff", start.toISOString())
    .lte("fecha_kickoff", end.toISOString())
    .order("fecha_kickoff", { ascending: true });

  const { data: todosPartidos } = await supabase
    .from("partidos")
    .select(
      "id, fase, grupo, jornada, equipo_local_codigo, equipo_visitante_codigo, equipo_local_nombre, equipo_visitante_nombre, fecha_kickoff, estatus, marcador_local, marcador_visitante, canal_transmision, minuto_actual, metadata",
    )
    .in("estatus", ["en_vivo", "medio_tiempo"]);

  const partidosEnVivo = (todosPartidos ?? []).filter((p) =>
    isPartidoEnVivo(p.estatus),
  ) as Partido[];

  let datoMamalon: DatoMamalón | null = null;

  if (partidosEnVivo.length === 0) {
    const admin = createServerDataClient();
    const pick = await pickDatoMamalonVariado(admin);
    if (pick) {
      const { data: row } = await supabase
        .from("datos_mamalones")
        .select("id, tipo, titulo, contenido, mundial_anio, tags")
        .eq("id", pick.id)
        .single();
      if (row) datoMamalon = row as DatoMamalón;
    }
  }

  return {
    usuario: usuario as Usuario,
    partidosDelDia: (partidosDelDia ?? []) as Partido[],
    partidosEnVivo,
    datoMamalon,
  };
}
