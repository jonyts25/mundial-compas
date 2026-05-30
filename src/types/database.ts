export type EstatusPartido =
  | "programado"
  | "en_vivo"
  | "medio_tiempo"
  | "finalizado"
  | "suspendido"
  | "aplazado"
  | "cancelado";

export type CanalTransmision =
  | "azteca_7"
  | "vix"
  | "azteca_7_y_vix"
  | "sin_asignar";

export type FaseMundial =
  | "grupos"
  | "dieciseisavos"
  | "octavos"
  | "cuartos"
  | "semifinal"
  | "tercer_lugar"
  | "final";

export type TipoDatoMamalón =
  | "trivia"
  | "hito"
  | "curiosidad"
  | "record"
  | "meme_historico";

export interface Usuario {
  id: string;
  nombre_visible: string;
  avatar_url: string | null;
  quiniela_paga: boolean;
}

export interface Partido {
  id: string;
  fase: FaseMundial;
  grupo: string | null;
  jornada: number | null;
  equipo_local_codigo: string;
  equipo_visitante_codigo: string;
  equipo_local_nombre: string;
  equipo_visitante_nombre: string;
  fecha_kickoff: string;
  estatus: EstatusPartido;
  marcador_local: number | null;
  marcador_visitante: number | null;
  canal_transmision: CanalTransmision;
  minuto_actual: number | null;
}

export type TipoMensajeChat =
  | "usuario"
  | "sistema"
  | "dato_mamalón"
  | "evento_partido";

export interface PronosticoPartido {
  id: string;
  goles_local: number;
  goles_visitante: number;
  puntos: number;
}

export interface DatoMamalón {
  id: string;
  tipo: TipoDatoMamalón;
  titulo: string;
  contenido: string;
  mundial_anio: number | null;
  tags: string[];
}
