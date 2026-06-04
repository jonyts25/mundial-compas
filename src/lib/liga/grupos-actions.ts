"use server";

import { revalidatePath } from "next/cache";
import { buildConfiguracionLiga } from "@/lib/liga/liga-config";
import {
  isModoCompetencia,
  MODO_COMPETENCIA_DEFAULT,
  type ModoCompetencia,
} from "@/lib/liga/modo-competencia";
import {
  isTipoQuiniela,
  TIPO_QUINIELA_DEFAULT,
  type TipoQuiniela,
} from "@/lib/liga/tipo-quiniela";
import { assertLigaOwner, assertLigaOwnerOrAdmin } from "@/lib/liga/roles";
import { createClient } from "@/lib/supabase/server";

export type GrupoActionResult =
  | { ok: true; slug: string }
  | { ok: false; error: string; code?: string };

function slugifyNombre(nombre: string): string {
  const base = nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "grupo";
}

function generarCodigoInvitacion(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function crearGrupoPrivado(input: {
  nombre: string;
  descripcion?: string;
  tipoQuiniela: string;
  modoCompetencia?: string;
}): Promise<GrupoActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Debes iniciar sesión", code: "no_autenticado" };
  }

  const nombre = input.nombre?.trim();
  if (!nombre || nombre.length < 3 || nombre.length > 80) {
    return {
      ok: false,
      error: "El nombre debe tener entre 3 y 80 caracteres",
      code: "nombre_invalido",
    };
  }

  const tipo: TipoQuiniela = isTipoQuiniela(input.tipoQuiniela)
    ? input.tipoQuiniela
    : TIPO_QUINIELA_DEFAULT;

  const modo: ModoCompetencia = isModoCompetencia(input.modoCompetencia)
    ? input.modoCompetencia
    : MODO_COMPETENCIA_DEFAULT;

  if (!isTipoQuiniela(input.tipoQuiniela)) {
    return {
      ok: false,
      error: "Tipo de quiniela no soportado",
      code: "tipo_no_soportado",
    };
  }

  let slug = slugifyNombre(nombre);
  let codigo = generarCodigoInvitacion();
  let intentos = 0;

  while (intentos < 5) {
    const { data, error: rpcError } = await supabase.rpc("crear_grupo_privado", {
      p_nombre: nombre,
      p_slug: slug,
      p_codigo_invitacion: codigo,
      p_descripcion: input.descripcion?.trim() || null,
      p_configuracion: buildConfiguracionLiga({
        tipoQuiniela: tipo,
        modoCompetencia: modo,
      }),
    });

    if (rpcError) {
      return { ok: false, error: rpcError.message };
    }

    const result = data as Record<string, unknown> | null;
    if (result?.ok) {
      const slugOk = String(result.slug);
      revalidatePath("/grupos");
      revalidatePath(`/grupos/${slugOk}`);
      return { ok: true, slug: slugOk };
    }

    const errCode = String(result?.error ?? "");
    if (errCode === "slug_o_codigo_duplicado") {
      intentos += 1;
      slug = `${slugifyNombre(nombre)}-${Math.random().toString(36).slice(2, 6)}`;
      codigo = generarCodigoInvitacion();
      continue;
    }

    const messages: Record<string, string> = {
      no_autenticado: "Debes iniciar sesión",
      nombre_invalido: "El nombre debe tener entre 3 y 80 caracteres",
      parametros_invalidos: "No se pudo generar el grupo, intenta de nuevo",
    };
    return {
      ok: false,
      error: messages[errCode] ?? (errCode || "No se pudo crear la quiniela"),
    };
  }

  return { ok: false, error: "No se pudo generar un slug único, intenta otro nombre" };
}

export async function unirseGrupoPorCodigo(
  codigo: string,
): Promise<GrupoActionResult & { alreadyMember?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Debes iniciar sesión", code: "no_autenticado" };
  }

  const trimmed = codigo?.trim();
  if (!trimmed || trimmed.length < 4) {
    return {
      ok: false,
      error: "Código inválido",
      code: "codigo_invalido",
    };
  }

  const { data, error } = await supabase.rpc("unirse_grupo_por_codigo", {
    p_codigo: trimmed,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  const result = data as Record<string, unknown> | null;
  if (!result?.ok) {
    const code = String(result?.error ?? "error");
    const messages: Record<string, string> = {
      codigo_invalido: "Código de invitación no encontrado",
      grupo_inactivo: "Este grupo ya no está activo",
      no_autenticado: "Debes iniciar sesión",
    };
    return {
      ok: false,
      error: messages[code] ?? "No se pudo unir al grupo",
      code,
    };
  }

  const slug = String(result.slug);
  revalidatePath("/grupos");
  revalidatePath(`/grupos/${slug}`);

  return {
    ok: true,
    slug,
    alreadyMember: Boolean(result.already_member),
  };
}

/** Fase 2: editar nombre, descripción, tipo o activar/desactivar. */
export async function actualizarGrupoPrivado(_input: {
  ligaId: string;
  nombre?: string;
  descripcion?: string;
  tipoQuiniela?: string;
  activa?: boolean;
}): Promise<GrupoActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Debes iniciar sesión", code: "no_autenticado" };
  }

  try {
    await assertLigaOwnerOrAdmin(_input.ligaId, user.id);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sin permiso";
    return { ok: false, error: msg, code: "sin_permiso" };
  }

  return {
    ok: false,
    error: "Edición de grupo disponible en una próxima actualización",
    code: "proximamente",
  };
}

/** Fase 2: promover/degradar admins (solo owner). */
export async function cambiarRolMiembroGrupo(_input: {
  ligaId: string;
  usuarioId: string;
  nuevoRol: "admin" | "miembro";
}): Promise<GrupoActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Debes iniciar sesión", code: "no_autenticado" };
  }

  try {
    await assertLigaOwner(_input.ligaId, user.id);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sin permiso";
    return { ok: false, error: msg, code: "sin_permiso" };
  }

  return {
    ok: false,
    error: "Gestión de roles disponible en una próxima actualización",
    code: "proximamente",
  };
}

export async function previewGrupoPorCodigo(codigo: string): Promise<{
  ok: boolean;
  nombre?: string;
  slug?: string;
  tipo_quiniela?: TipoQuiniela;
  miembros_count?: number;
  error?: string;
  code?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Debes iniciar sesión", code: "no_autenticado" };
  }

  const { data, error } = await supabase.rpc("preview_grupo_por_codigo", {
    p_codigo: codigo.trim(),
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  const result = data as Record<string, unknown> | null;
  if (!result?.ok) {
    const code = String(result?.error ?? "codigo_invalido");
    return {
      ok: false,
      error:
        code === "grupo_inactivo"
          ? "Este grupo ya no está activo"
          : "Código de invitación no encontrado",
      code,
    };
  }

  const tipoRaw = result.tipo_quiniela;
  return {
    ok: true,
    nombre: String(result.nombre),
    slug: String(result.slug),
    tipo_quiniela: isTipoQuiniela(tipoRaw) ? tipoRaw : TIPO_QUINIELA_DEFAULT,
    miembros_count: Number(result.miembros_count ?? 0),
  };
}
