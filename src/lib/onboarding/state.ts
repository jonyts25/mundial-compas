import { LIGA_GLOBAL_ID } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

export interface OnboardingUserState {
  /** Mostrar card de bienvenida (server-side; el dismiss es en cliente). */
  eligible: boolean;
  tienePronosticos: boolean;
  tieneGruposPrivados: boolean;
  haCreadoGrupo: boolean;
}

/**
 * Usuario “nuevo” = sin pronósticos, sin grupos privados y sin haber creado quiniela.
 * Solo membresía global (o ninguna) cuenta como sin actividad en privadas.
 */
export async function fetchOnboardingUserState(
  userId: string,
): Promise<OnboardingUserState> {
  const supabase = await createClient();

  const [
    { count: pronosticosCount },
    { count: membresiasPrivadas },
    { count: gruposCreados },
  ] = await Promise.all([
    supabase
      .from("pronosticos")
      .select("id", { count: "exact", head: true })
      .eq("usuario_id", userId),
    supabase
      .from("liga_miembros")
      .select("liga_id", { count: "exact", head: true })
      .eq("usuario_id", userId)
      .neq("liga_id", LIGA_GLOBAL_ID),
    supabase
      .from("ligas_privadas")
      .select("id", { count: "exact", head: true })
      .eq("creador_id", userId)
      .eq("es_sistema", false),
  ]);

  const tienePronosticos = (pronosticosCount ?? 0) > 0;
  const tieneGruposPrivados = (membresiasPrivadas ?? 0) > 0;
  const haCreadoGrupo = (gruposCreados ?? 0) > 0;

  const eligible =
    !tienePronosticos && !tieneGruposPrivados && !haCreadoGrupo;

  return {
    eligible,
    tienePronosticos,
    tieneGruposPrivados,
    haCreadoGrupo,
  };
}
