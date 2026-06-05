export const DISCLAIMER_GENERAL =
  "Mundial Compas es una experiencia social y recreativa creada para fomentar la conversación, la convivencia y la participación alrededor del fútbol. No está afiliada a FIFA ni a organizadores oficiales del torneo. La información, datos curiosos, narraciones y comentarios pueden contener errores, exageraciones, humor, sátira o contenido generado con apoyo de inteligencia artificial. Úsalo como entretenimiento, no como fuente oficial.";

export const DISCLAIMER_IA =
  "Parte del contenido de Mundial Compas, incluyendo datos mamalones, frases, narraciones y comentarios automáticos, puede generarse o asistirse con inteligencia artificial. Puede contener imprecisiones, mensajes extraños o humor fuera de contexto.";

export const DISCLAIMER_COOPERACHA =
  "En grupos con cooperacha manual, Mundial Compas solo provee herramientas de organización. No procesa pagos, no resguarda dinero, no garantiza cobros ni premios, y no participa en acuerdos privados entre miembros. El owner/admin del grupo es responsable de comunicar y administrar sus reglas.";

export const DISCLAIMER_SOCIAL =
  "La plataforma nace con una finalidad social, informativa y recreativa: facilitar la participación entre amigos durante el Mundial. Cualquier acuerdo privado entre usuarios ocurre fuera de la operación de Mundial Compas.";

export const DISCLAIMER_ADMIN_GRUPO =
  "El owner/admin de esta quiniela es responsable de sus reglas, moderación, convivencia y acuerdos internos.";

export const DISCLAIMER_CHAT_GRUPO =
  "Este chat es moderado por los administradores del grupo.";

export const DISCLAIMER_QUINIELA_INMUTABLE =
  "El tipo de quiniela y el modo de competencia se definen al crear la quiniela y no se pueden cambiar después. Si hubo un error, crea una nueva quiniela privada.";

export const LEGAL_SECTIONS = [
  { id: "general", title: "Experiencia recreativa", body: DISCLAIMER_GENERAL },
  { id: "ia", title: "Contenido e inteligencia artificial", body: DISCLAIMER_IA },
  { id: "social", title: "Finalidad social", body: DISCLAIMER_SOCIAL },
  { id: "cooperacha", title: "Cooperacha manual en grupos", body: DISCLAIMER_COOPERACHA },
  { id: "admin", title: "Responsabilidad del administrador", body: DISCLAIMER_ADMIN_GRUPO },
] as const;
