import { NextResponse } from "next/server";
import { processFootballWebhook } from "@/lib/apifootball/webhook/process";
import { verifyFootballWebhookAuth } from "@/lib/apifootball/webhook/verify-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerEnv } from "@/lib/env";

export const runtime = "nodejs";

/**
 * Webhook definitivo apifootball.com (livescore / relay HTTP).
 *
 * URL producción: https://TU-DOMINIO.railway.app/api/webhooks/football
 *
 * Auth: Authorization: Bearer <API_FOOTBALL_WEBHOOK_SECRET>
 * o header configurado en API_FOOTBALL_WEBHOOK_SIGNATURE_HEADER
 */
export async function POST(request: Request) {
  let env: ReturnType<typeof getServerEnv>;
  try {
    env = getServerEnv();
  } catch (e) {
    const message = e instanceof Error ? e.message : "Config error";
    console.error("[webhook/football] env:", message);
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const rawBody = await request.text();

  const authorized = verifyFootballWebhookAuth(request, rawBody, {
    secret: env.apiFootballWebhookSecret,
    signatureHeaderName: env.apiFootballWebhookSignatureHeader,
  });

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody) as unknown;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const result = await processFootballWebhook(supabase, payload);

  if (!result.ok) {
    const status = result.message?.includes("no registrado") ? 404 : 422;
    return NextResponse.json(
      { ok: false, error: result.message, processed: result.processed, skipped: result.skipped },
      { status },
    );
  }

  return NextResponse.json({
    ok: true,
    message: result.message,
    processed: result.processed,
    skipped: result.skipped,
  });
}

export async function GET() {
  return NextResponse.json({
    status: "apifootball football webhook ready",
    path: "/api/webhooks/football",
    auth: "Authorization: Bearer <API_FOOTBALL_WEBHOOK_SECRET>",
    docs: "https://apifootball.com/documentation/",
  });
}
