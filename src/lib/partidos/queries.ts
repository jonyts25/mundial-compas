import { createClient } from "@/lib/supabase/server";
import { createServerDataClient } from "@/lib/supabase/server-data";
import { filterOutPilotPartidos } from "@/lib/apifootball/pilot-config";
import { pickDatoMamalonVariado } from "@/lib/datos-mamalones/pick";
import { isPartidoEnVivo } from "@/lib/partidos/labels";
import type { DatoMamalón, Partido, Usuario } from "@/types/database";

export interface HomePageData {
  usuario: Usuario;
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

  const { data: todosPartidos } = await supabase
    .from("partidos")
    .select(
      "id, fase, grupo, jornada, equipo_local_codigo, equipo_visitante_codigo, equipo_local_nombre, equipo_visitante_nombre, fecha_kickoff, estatus, marcador_local, marcador_visitante, canal_transmision, minuto_actual, metadata",
    )
    .in("estatus", ["en_vivo", "medio_tiempo"]);

  const partidosEnVivo = filterOutPilotPartidos(todosPartidos ?? []).filter((p) =>
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
    partidosEnVivo,
    datoMamalon,
  };
}
