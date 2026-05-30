import { NextResponse } from "next/server";
import { getVapidPublicKey } from "@/lib/push/vapid";

export async function GET() {
  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    return NextResponse.json(
      { error: "Push no configurado en el servidor" },
      { status: 503 },
    );
  }
  return NextResponse.json({ publicKey });
}
