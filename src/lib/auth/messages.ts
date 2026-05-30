export const VERIFY_EMAIL_MESSAGE =
  "Te enviamos un correo para verificar tu cuenta. Abre el enlace de Supabase y, cuando esté confirmada, vuelve aquí para iniciar sesión.";

type SignUpResult = {
  user: { identities?: { id: string }[] } | null;
  session: unknown;
};

/** Registro con confirmación por correo: sin sesión activa aún. */
export function isSignupPendingEmailConfirmation(data: SignUpResult): boolean {
  if (data.session) return false;
  if (!data.user) return true;
  if (data.user.identities?.length === 0) return true;
  return true;
}

export function getAuthErrorMessage(
  err: unknown,
  mode: "login" | "register",
): string {
  if (!(err instanceof Error)) return "Ocurrió un error";

  const msg = err.message.toLowerCase();

  if (
    msg.includes("email not confirmed") ||
    msg.includes("email_not_confirmed")
  ) {
    return "Tu cuenta aún no está verificada. Revisa tu bandeja (y spam) y abre el enlace del correo de Supabase.";
  }

  if (
    mode === "register" &&
    (msg.includes("already registered") ||
      msg.includes("already been registered") ||
      msg.includes("user already registered"))
  ) {
    return VERIFY_EMAIL_MESSAGE;
  }

  if (msg.includes("invalid login credentials")) {
    return "Correo o contraseña incorrectos. Si acabas de registrarte, confirma primero el enlace del correo.";
  }

  return err.message;
}
