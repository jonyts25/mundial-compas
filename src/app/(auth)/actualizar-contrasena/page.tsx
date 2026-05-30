"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ActualizarContrasenaPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function verifySession() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          window.history.replaceState({}, "", "/actualizar-contrasena");
        }
      }

      const { data } = await supabase.auth.getSession();
      setHasSession(Boolean(data.session));
      setChecking(false);
    }

    void verifySession();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) throw updateError;
      setDone(true);
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <p className="text-center text-sm text-zinc-400">Verificando enlace…</p>
    );
  }

  if (!hasSession) {
    return (
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 text-center">
        <p className="text-sm text-zinc-300">
          El enlace expiró o ya se usó. Solicita uno nuevo.
        </p>
        <Link
          href="/recuperar-contrasena"
          className="inline-block text-sm font-semibold text-emerald-400 hover:text-emerald-300"
        >
          Recuperar contraseña
        </Link>
        <Link href="/login" className="block text-sm text-zinc-500 hover:text-white">
          ← Iniciar sesión
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-emerald-800/50 bg-emerald-950/30 p-6 text-center">
        <p className="text-sm font-semibold text-emerald-200">
          Contraseña actualizada. Entrando a la app…
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-white">Nueva contraseña</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Elige una contraseña segura para tu cuenta.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-xl"
      >
        <div>
          <label htmlFor="password" className="mb-1 block text-sm text-zinc-300">
            Nueva contraseña
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none ring-emerald-500 focus:ring-2"
          />
        </div>

        <div>
          <label htmlFor="confirm" className="mb-1 block text-sm text-zinc-300">
            Confirmar contraseña
          </label>
          <input
            id="confirm"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
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
          {loading ? "Guardando…" : "Guardar contraseña"}
        </button>
      </form>
    </div>
  );
}
