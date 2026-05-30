import { timingSafeEqual } from "crypto";
import { createHmac } from "crypto";

export interface WebhookAuthConfig {
  secret: string;
  signatureHeaderName: string;
}

/**
 * Valida webhook entrante:
 * - Authorization: Bearer <secret>
 * - Header personalizado con el secret plano
 * - HMAC sha256 en header de firma (opcional)
 */
export function verifyFootballWebhookAuth(
  request: Request,
  rawBody: string,
  config: WebhookAuthConfig,
): boolean {
  const { secret, signatureHeaderName } = config;

  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (bearer && safeEqualString(bearer, secret)) return true;

  const plainHeader = request.headers.get(signatureHeaderName)?.trim();
  if (plainHeader && safeEqualString(plainHeader, secret)) return true;

  const altHeaders = ["x-webhook-secret", "x-apifootball-secret", "x-api-football-secret"];
  for (const name of altHeaders) {
    const v = request.headers.get(name)?.trim();
    if (v && safeEqualString(v, secret)) return true;
  }

  const signature = request.headers.get(signatureHeaderName);
  if (signature && verifyHmac(rawBody, signature, secret)) return true;

  return false;
}

function safeEqualString(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  try {
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

function verifyHmac(rawBody: string, signatureHeader: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const received = signatureHeader.replace(/^sha256=/i, "").trim();
  if (expected.length !== received.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(received, "hex"));
  } catch {
    return false;
  }
}
