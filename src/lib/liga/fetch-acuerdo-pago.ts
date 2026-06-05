import { LIGA_GLOBAL_ID } from "@/lib/constants";
import { parseAcuerdoPago, type AcuerdoPago } from "@/lib/liga/acuerdo-pago";
import { createServerDataClient } from "@/lib/supabase/server-data";

/** @deprecated Sin UI global. Lee `acuerdo_pago` legado en configuración de liga global. */
export async function fetchAcuerdoPago(): Promise<AcuerdoPago | null> {
  const supabase = createServerDataClient();
  const { data, error } = await supabase
    .from("ligas_privadas")
    .select("configuracion")
    .eq("id", LIGA_GLOBAL_ID)
    .single();

  if (error) return null;
  return parseAcuerdoPago(data?.configuracion);
}
