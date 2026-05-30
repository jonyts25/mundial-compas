import type { SupabaseClient } from "@supabase/supabase-js";

export async function fetchPushPartidosSilenciadosIds(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("push_partidos_silenciados")
    .select("partido_id")
    .eq("usuario_id", userId);

  if (error) {
    console.error("[push] fetch silenciados:", error.message);
    return [];
  }

  return (data ?? []).map((row) => row.partido_id as string);
}
