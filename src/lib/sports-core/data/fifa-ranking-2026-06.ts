/**
 * Snapshot estático FIFA — junio 2026 (Sports Core).
 * Fuente editorial para señal de ranking; no es feed en vivo.
 * Actualizar manualmente o vía ingest futuro.
 */

export interface FifaRankEntry {
  rank: number;
  points?: number;
}

/** Código FIFA de 3 letras → posición mundial (jun 2026). */
export const FIFA_RANKING_2026_06: Record<string, FifaRankEntry> = {
  ARG: { rank: 1, points: 1883 },
  FRA: { rank: 2, points: 1859 },
  ESP: { rank: 3, points: 1844 },
  ENG: { rank: 4, points: 1816 },
  BRA: { rank: 5, points: 1803 },
  POR: { rank: 6, points: 1765 },
  NED: { rank: 7, points: 1752 },
  BEL: { rank: 8, points: 1730 },
  GER: { rank: 9, points: 1718 },
  URU: { rank: 10, points: 1705 },
  COL: { rank: 11, points: 1692 },
  ITA: { rank: 12, points: 1680 },
  MEX: { rank: 13, points: 1668 },
  USA: { rank: 14, points: 1655 },
  CRO: { rank: 15, points: 1642 },
  MAR: { rank: 16, points: 1630 },
  JPN: { rank: 17, points: 1618 },
  SUI: { rank: 18, points: 1605 },
  SEN: { rank: 19, points: 1592 },
  IRN: { rank: 20, points: 1580 },
  DEN: { rank: 21, points: 1568 },
  KOR: { rank: 22, points: 1555 },
  ECU: { rank: 23, points: 1542 },
  AUT: { rank: 24, points: 1530 },
  TUR: { rank: 25, points: 1518 },
  AUS: { rank: 26, points: 1505 },
  CAN: { rank: 27, points: 1492 },
  UKR: { rank: 28, points: 1480 },
  POL: { rank: 29, points: 1468 },
  SWE: { rank: 30, points: 1455 },
  EGY: { rank: 31, points: 1442 },
  NOR: { rank: 32, points: 1430 },
  PAN: { rank: 33, points: 1418 },
  CHI: { rank: 34, points: 1405 },
  PER: { rank: 35, points: 1392 },
  PAR: { rank: 36, points: 1380 },
  CRC: { rank: 37, points: 1368 },
  ALG: { rank: 38, points: 1355 },
  NGA: { rank: 39, points: 1342 },
  CMR: { rank: 40, points: 1330 },
  GHA: { rank: 41, points: 1318 },
  TUN: { rank: 42, points: 1305 },
  JOR: { rank: 43, points: 1292 },
  UZB: { rank: 44, points: 1280 },
  QAT: { rank: 45, points: 1268 },
  KSA: { rank: 46, points: 1255 },
  RSA: { rank: 47, points: 1242 },
  CPV: { rank: 48, points: 1230 },
  CUW: { rank: 49, points: 1218 },
  JAM: { rank: 50, points: 1205 },
  HON: { rank: 51, points: 1192 },
  SLV: { rank: 52, points: 1180 },
  BOL: { rank: 53, points: 1168 },
  VEN: { rank: 54, points: 1155 },
  CZE: { rank: 55, points: 1142 },
  SRB: { rank: 56, points: 1130 },
  IRQ: { rank: 57, points: 1118 },
  COD: { rank: 58, points: 1105 },
  NZL: { rank: 59, points: 1092 },
  HAI: { rank: 60, points: 1080 },
  CUB: { rank: 61, points: 1068 },
  WAL: { rank: 62, points: 1055 },
  SCO: { rank: 63, points: 1042 },
  BIH: { rank: 64, points: 1030 },
};

const ISO2_TO_FIFA: Record<string, string> = {
  MX: "MEX",
  US: "USA",
  CA: "CAN",
  AR: "ARG",
  BR: "BRA",
  UY: "URU",
  CO: "COL",
  CL: "CHI",
  EC: "ECU",
  PE: "PER",
  PY: "PAR",
  VE: "VEN",
  BO: "BOL",
  ES: "ESP",
  FR: "FRA",
  DE: "GER",
  IT: "ITA",
  PT: "POR",
  NL: "NED",
  BE: "BEL",
  HR: "CRO",
  CH: "SUI",
  PL: "POL",
  RS: "SRB",
  DK: "DEN",
  SE: "SWE",
  NO: "NOR",
  AT: "AUT",
  JP: "JPN",
  KR: "KOR",
  AU: "AUS",
  IR: "IRN",
  SA: "KSA",
  QA: "QAT",
  MA: "MAR",
  SN: "SEN",
  GH: "GHA",
  CM: "CMR",
  NG: "NGA",
  TN: "TUN",
  DZ: "ALG",
  EG: "EGY",
  ZA: "RSA",
  CR: "CRC",
  PA: "PAN",
  JM: "JAM",
  HN: "HON",
  SV: "SLV",
  CU: "CUB",
  CZ: "CZE",
  BA: "BIH",
  HT: "HAI",
  TR: "TUR",
  CW: "CUW",
  CV: "CPV",
  IQ: "IRQ",
  JO: "JOR",
  CD: "COD",
  UZ: "UZB",
  NZ: "NZL",
  UA: "UKR",
};

/** Normaliza código de almacenamiento (2–4 chars) a clave FIFA de 3 letras. */
export function normalizeFifaStorageCode(code: string): string | null {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) return null;
  if (trimmed.length === 3 && FIFA_RANKING_2026_06[trimmed]) return trimmed;
  if (trimmed.length === 3) return trimmed;
  if (trimmed.length === 2) return ISO2_TO_FIFA[trimmed] ?? null;
  return null;
}

export function lookupFifaRank(code: string): FifaRankEntry | null {
  const fifa = normalizeFifaStorageCode(code);
  if (!fifa) return null;
  return FIFA_RANKING_2026_06[fifa] ?? null;
}
