import { KNOCKOUT_QUINIELA_RULES_SHORT } from "@/lib/world-cup/knockout-quiniela-rules";
import { isKnockoutPartido } from "@/lib/world-cup/knockout-participant-utils";
import type { Partido } from "@/types/database";

interface KnockoutQuinielaRulesHintProps {
  partido: Pick<Partido, "fase" | "estatus">;
  className?: string;
}

export function KnockoutQuinielaRulesHint({
  partido,
  className = "",
}: KnockoutQuinielaRulesHintProps) {
  if (!isKnockoutPartido(partido)) return null;
  if (partido.estatus !== "programado" && partido.estatus !== "aplazado") {
    return null;
  }

  return (
    <p
      className={`text-[11px] leading-relaxed text-zinc-500 ${className}`.trim()}
      role="note"
    >
      {KNOCKOUT_QUINIELA_RULES_SHORT}
    </p>
  );
}
