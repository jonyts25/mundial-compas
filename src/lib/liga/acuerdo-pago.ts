import { formatMexicoDateLabel } from "@/lib/datetime/mexico";

export interface AcuerdoPago {
  montoPorCompa: number;
  moneda: string;
  fechaLimitePago: string;
  notas: string | null;
  acordadoAt: string | null;
}

export function parseAcuerdoPago(config: unknown): AcuerdoPago | null {
  if (!config || typeof config !== "object") return null;
  const c = config as Record<string, unknown>;
  const raw = c.acuerdo_pago;
  if (!raw || typeof raw !== "object") return null;

  const a = raw as Record<string, unknown>;
  const monto = Number(a.monto_por_compa);
  const fecha = a.fecha_limite_pago ? String(a.fecha_limite_pago) : "";

  if (!Number.isFinite(monto) || monto <= 0 || !fecha) return null;

  return {
    montoPorCompa: monto,
    moneda: String(a.moneda ?? "MXN"),
    fechaLimitePago: fecha,
    notas: a.notas ? String(a.notas) : null,
    acordadoAt: a.acordado_at ? String(a.acordado_at) : null,
  };
}

export function formatMontoAcuerdo(acuerdo: AcuerdoPago): string {
  const fmt = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: acuerdo.moneda === "MXN" ? "MXN" : "USD",
    maximumFractionDigits: 0,
  });
  return fmt.format(acuerdo.montoPorCompa);
}

export function formatFechaLimiteAcuerdo(acuerdo: AcuerdoPago): string {
  return formatMexicoDateLabel(acuerdo.fechaLimitePago);
}

export function acuerdoPagoResumen(acuerdo: AcuerdoPago): string {
  const monto = formatMontoAcuerdo(acuerdo);
  const fecha = formatFechaLimiteAcuerdo(acuerdo);
  return `${monto} por compa · pago acordado antes del ${fecha}`;
}
