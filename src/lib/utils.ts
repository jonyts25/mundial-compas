/** Normaliza nombre de equipo para lookup en alias */
export function normalizeTeamKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Congo-Kinshasa (CD), no confundir con Congo-Brazzaville (CG) */
function isDrCongo(key: string): boolean {
  if (!key.includes("congo")) return false;
  if (
    key.includes("democratic") ||
    key.includes("democr") ||
    key.includes("republica democratica") ||
    key.includes("kinshasa")
  ) {
    return true;
  }
  return (
    /\bdr\b/.test(key) ||
    /\bd\s+r\b/.test(key) ||
    /\brd\b/.test(key) ||
    /\br\s+d\b/.test(key) ||
    key.includes("dr congo") ||
    key.includes("d r congo") ||
    key.includes("congo dr") ||
    key.includes("congo d r")
  );
}

/** Nombre / alias → ISO alpha-2 (o subcódigo flagcdn p. ej. gb-eng) */
const TEAM_NAME_TO_ISO: Record<string, string> = {
  "south korea": "kr",
  "korea republic": "kr",
  "republic of korea": "kr",
  "corea del sur": "kr",
  "south africa": "za",
  sudafrica: "za",
  mexico: "mx",
  brazil: "br",
  brasil: "br",
  spain: "es",
  espana: "es",
  "czech republic": "cz",
  czechia: "cz",
  "united states": "us",
  usa: "us",
  "costa rica": "cr",
  "saudi arabia": "sa",
  "united arab emirates": "ae",
  "new zealand": "nz",
  "ivory coast": "ci",
  "cote d ivoire": "ci",
  netherlands: "nl",
  holland: "nl",
  switzerland: "ch",
  serbia: "rs",
  croatia: "hr",
  morocco: "ma",
  tunisia: "tn",
  algeria: "dz",
  egypt: "eg",
  iran: "ir",
  japan: "jp",
  australia: "au",
  ecuador: "ec",
  uruguay: "uy",
  colombia: "co",
  chile: "cl",
  peru: "pe",
  paraguay: "py",
  venezuela: "ve",
  bolivia: "bo",
  argentina: "ar",
  france: "fr",
  germany: "de",
  italy: "it",
  england: "gb-eng",
  portugal: "pt",
  belgium: "be",
  poland: "pl",
  denmark: "dk",
  sweden: "se",
  norway: "no",
  austria: "at",
  wales: "gb-wls",
  scotland: "gb-sct",
  canada: "ca",
  panama: "pa",
  jamaica: "jm",
  honduras: "hn",
  "el salvador": "sv",
  cuba: "cu",
  qatar: "qa",
  ghana: "gh",
  nigeria: "ng",
  senegal: "sn",
  cameroon: "cm",
  "bosnia and herzegovina": "ba",
  "bosnia y herzegovina": "ba",
  bosnia: "ba",
  haiti: "ht",
  turkey: "tr",
  turkeye: "tr",
  turquia: "tr",
  turkiye: "tr",
  curacao: "cw",
  "cape verde": "cv",
  "cabo verde": "cv",
  iraq: "iq",
  irak: "iq",
  jordan: "jo",
  jordania: "jo",
  "dr congo": "cd",
  "d r congo": "cd",
  "congo dr": "cd",
  "congo d r": "cd",
  "democratic republic of the congo": "cd",
  "democratic republic of congo": "cd",
  "republica democratica del congo": "cd",
  "rep dem del congo": "cd",
  "dem rep congo": "cd",
  "rd congo": "cd",
  "r d congo": "cd",
  uzbekistan: "uz",
};

/** Código FIFA de 3 letras → ISO para flagcdn */
const FIFA_THREE_TO_ISO: Record<string, string> = {
  MEX: "mx",
  USA: "us",
  CAN: "ca",
  ARG: "ar",
  BRA: "br",
  URU: "uy",
  COL: "co",
  CHI: "cl",
  ECU: "ec",
  PER: "pe",
  PAR: "py",
  VEN: "ve",
  BOL: "bo",
  ESP: "es",
  FRA: "fr",
  GER: "de",
  ITA: "it",
  ENG: "gb-eng",
  POR: "pt",
  NED: "nl",
  BEL: "be",
  CRO: "hr",
  SUI: "ch",
  POL: "pl",
  SRB: "rs",
  DEN: "dk",
  SWE: "se",
  NOR: "no",
  AUT: "at",
  WAL: "gb-wls",
  SCO: "gb-sct",
  JPN: "jp",
  KOR: "kr",
  AUS: "au",
  IRN: "ir",
  KSA: "sa",
  QAT: "qa",
  MAR: "ma",
  SEN: "sn",
  GHA: "gh",
  CMR: "cm",
  NGA: "ng",
  TUN: "tn",
  ALG: "dz",
  EGY: "eg",
  RSA: "za",
  CRC: "cr",
  PAN: "pa",
  JAM: "jm",
  HON: "hn",
  SLV: "sv",
  CUB: "cu",
  CZE: "cz",
  BIH: "ba",
  BOS: "ba",
  HAI: "ht",
  HTI: "ht",
  TUR: "tr",
  CUW: "cw",
  CUR: "cw",
  CPV: "cv",
  IRQ: "iq",
  JOR: "jo",
  COD: "cd",
  UZB: "uz",
};

/**
 * Resuelve el código ISO (2 letras o subcódigo UK) para banderas a partir del nombre de equipo.
 * Evita el fallback erróneo SOU → Somalia (so).
 */
export function getFlagCode(teamName: string): string {
  const key = normalizeTeamKey(teamName);
  if (!key) return "un";

  const direct = TEAM_NAME_TO_ISO[key];
  if (direct) return direct;

  if (key.includes("south korea") || key.includes("corea del sur")) return "kr";
  if (key.includes("south africa") || key.includes("sudafric")) return "za";
  if (key.includes("czech")) return "cz";
  if (key.includes("bosnia")) return "ba";
  if (key === "haiti" || key.startsWith("haiti ")) return "ht";
  if (key.includes("turk") && !key.includes("turkmen")) return "tr";
  if (key.includes("curacao")) return "cw";
  if (key.includes("cape verde") || key.includes("cabo verde")) return "cv";
  if (key === "iraq" || key === "irak" || key.startsWith("iraq ")) return "iq";
  if (key.includes("jordan")) return "jo";
  if (isDrCongo(key)) return "cd";
  if (key.includes("uzbek")) return "uz";

  const upper = teamName.trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(upper)) return upper.toLowerCase();
  if (upper.length === 3 && FIFA_THREE_TO_ISO[upper]) {
    return FIFA_THREE_TO_ISO[upper];
  }

  return "un";
}

/** Código compacto para guardar en BD (ISO2 o FIFA de 3 letras) */
export function getTeamStorageCode(teamName: string): string {
  const iso = getFlagCode(teamName);
  if (iso === "gb-eng") return "ENG";
  if (iso === "gb-wls") return "WAL";
  if (iso === "gb-sct") return "SCO";
  return iso.toUpperCase();
}
