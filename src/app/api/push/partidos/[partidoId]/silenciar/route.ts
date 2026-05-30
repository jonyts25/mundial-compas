import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ partidoId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { partidoId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data } = await supabase
    .from("push_partidos_silenciados")
    .select("partido_id")
    .eq("usuario_id", user.id)
    .eq("partido_id", partidoId)
    .maybeSingle();

  return NextResponse.json({ silenciado: Boolean(data) });
}

export async function POST(_request: Request, context: RouteContext) {
  const { partidoId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { error } = await supabase.from("push_partidos_silenciados").upsert(
    { usuario_id: user.id, partido_id: partidoId },
    { onConflict: "usuario_id,partido_id" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, silenciado: true });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { partidoId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  await supabase
    .from("push_partidos_silenciados")
    .delete()
    .eq("usuario_id", user.id)
    .eq("partido_id", partidoId);

  return NextResponse.json({ ok: true, silenciado: false });
}
