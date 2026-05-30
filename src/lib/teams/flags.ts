import { getFlagCode } from "@/lib/utils";

/** Códigos almacenados (2–3 letras) → ISO flagcdn cuando no hay nombre */
const STORED_CODE_TO_ISO: Record<string, string> = {
  ENG: "gb-eng",
  WAL: "gb-wls",
  SCO: "gb-sct",
  KR: "kr",
  ZA: "za",
  MX: "mx",
  BR: "br",
  ES: "es",
  CZ: "cz",
  US: "us",
  CR: "cr",
  SA: "sa",
  AE: "ae",
  NZ: "nz",
  CI: "ci",
  NL: "nl",
  CH: "ch",
  RS: "rs",
  HR: "hr",
  MA: "ma",
  TN: "tn",
  DZ: "dz",
  EG: "eg",
  IR: "ir",
  JP: "jp",
  AU: "au",
  EC: "ec",
  UY: "uy",
  CO: "co",
  CL: "cl",
  PE: "pe",
  PY: "py",
  VE: "ve",
  BO: "bo",
  AR: "ar",
  FR: "fr",
  DE: "de",
  IT: "it",
  PT: "pt",
  BE: "be",
  PL: "pl",
  DK: "dk",
  SE: "se",
  NO: "no",
  AT: "at",
  CA: "ca",
  PA: "pa",
  JM: "jm",
  HN: "hn",
  SV: "sv",
  CU: "cu",
  QA: "qa",
  GH: "gh",
  NG: "ng",
  SN: "sn",
  CM: "cm",
  KOR: "kr",
  RSA: "za",
  MEX: "mx",
  BRA: "br",
  ESP: "es",
  CZE: "cz",
  BA: "ba",
  HT: "ht",
  TR: "tr",
  CW: "cw",
  CV: "cv",
  IQ: "iq",
  JO: "jo",
  CD: "cd",
  UZ: "uz",
  BIH: "ba",
  HAI: "ht",
  TUR: "tr",
  CUW: "cw",
  CPV: "cv",
  IRQ: "iq",
  JOR: "jo",
  COD: "cd",
  UZB: "uz",
};

function resolveIso(codigo: string, teamName?: string): string {
  if (teamName?.trim()) {
    return getFlagCode(teamName);
  }
  const upper = codigo.trim().toUpperCase();
  if (STORED_CODE_TO_ISO[upper]) return STORED_CODE_TO_ISO[upper];
  if (/^[A-Z]{2}$/.test(upper)) return upper.toLowerCase();
  if (upper.length === 3) {
    const fromName = getFlagCode(codigo);
    if (fromName !== "un") return fromName;
  }
  return getFlagCode(codigo);
}

export function getFlagImageUrl(
  codigo: string,
  size: "w40" | "w80" = "w80",
  teamName?: string,
): string {
  const iso = resolveIso(codigo, teamName);
  return `https://flagcdn.com/${size}/${iso}.png`;
}

/** Escudo del club si existe; si no, bandera por código/nombre. */
export function getTeamImageUrl(
  codigo: string,
  size: "w40" | "w80" = "w80",
  teamName?: string,
  escudoUrl?: string | null,
): string {
  const url = escudoUrl?.trim();
  if (url) return url;
  return getFlagImageUrl(codigo, size, teamName);
}

export function getFlagEmoji(codigo: string, teamName?: string): string {
  const iso = resolveIso(codigo, teamName);
  if (!iso || iso.includes("-") || iso === "un") return "🏳️";
  const code = iso.slice(0, 2).toUpperCase();
  return String.fromCodePoint(
    ...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}
