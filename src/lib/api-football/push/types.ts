export type MatchPhaseKind =
  | "kickoff"
  | "halftime"
  | "second_half"
  | "regulation_end"
  | "extra_time_1st"
  | "extra_time_halftime"
  | "extra_time_2nd"
  | "penalties"
  | "fulltime";

export type PartidoPushTipo =
  | "gol"
  | "gol_anulado"
  | "tarjeta_roja"
  | "inicio_partido"
  | "medio_tiempo"
  | "inicio_segundo_tiempo"
  | "fin_tiempo_reglamentario"
  | "inicio_tiempo_extra"
  | "inicio_penales"
  | "penal_fallado"
  | "fin_partido"
  | "alineaciones";
