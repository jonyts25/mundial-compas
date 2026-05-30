"use client";

import Link from "next/link";
import { useState } from "react";
import { buildAuthCallbackUrl } from "@/lib/auth/app-url";
import { createClient } from "@/lib/supabase/client";

export default function RecuperarContrasenaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: buildAuthCallbackUrl("/actualizar-contrasena"),
        },
      );

      if (resetError) throw resetError;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el correo");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-white">Recuperar contraseña</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Te enviaremos un enlace para elegir una contraseña nueva.
        </p>
      </div>

      {sent ? (
        <div className="space-y-4 rounded-2xl border border-emerald-800/50 bg-emerald-950/30 p-6 text-center">
          <p className="text-sm text-emerald-200">
            Si existe una cuenta con <strong>{email}</strong>, revisa tu bandeja
            (y spam) en los próximos minutos.
          </p>
          <Link
            href="/login"
            className="inline-block text-sm font-semibold text-emerald-400 hover:text-emerald-300"
          >
            ← Volver a iniciar sesión
          </Link>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-xl"
        >
          <div>
            <label htmlFor="email" className="mb-1 block text-sm text-zinc-300">
              Correo de tu cuenta
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none ring-emerald-500 focus:ring-2"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-950/80 px-3 py-2 text-sm text-red-200" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            {loading ? "Enviando…" : "Enviar enlace de recuperación"}
          </button>

          <p className="text-center">
            <Link
              href="/login"
              className="text-sm text-zinc-400 hover:text-white"
            >
              ← Volver a iniciar sesión
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}
