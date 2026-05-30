import { createHmac, timingSafeEqual } from "crypto";

/**
 * Valida firma HMAC-SHA256 del webhook.
 * API-Football puede enviar el digest en header configurable vía env.
 * Formato esperado: hex o `sha256=<hex>`.
 */
export function verifyApiFootballWebhook(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader) return false;

  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const received = signatureHeader.replace(/^sha256=/i, "").trim();

  if (expected.length !== received.length) return false;

  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(received, "hex"));
  } catch {
    return false;
  }
}

/** Fallback: comparación directa del secret en header (desarrollo / proveedores simples). */
export function verifyWebhookSecretHeader(
  headerValue: string | null,
  secret: string,
): boolean {
  if (!headerValue) return false;
  const a = Buffer.from(headerValue);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
