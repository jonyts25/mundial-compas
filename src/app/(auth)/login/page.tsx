"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { applyPendingHonorTermsIfAny } from "@/lib/auth/apply-honor-terms";

type AuthMode = "login" | "register";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const authError = searchParams.get("error");

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombreVisible, setNombreVisible] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    if (authError === "auth_callback") {
      setError("No se pudo completar el inicio de sesión. Intenta de nuevo.");
    }
  }, [authError]);

  async function afterAuth(userId: string) {
    await applyPendingHonorTermsIfAny(supabase, userId);
    router.push(next);
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === "login") {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        if (!data.user) throw new Error("No se pudo iniciar sesión");
        await afterAuth(data.user.id);
        return;
      }

      const origin = window.location.origin;
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${origin}/callback?next=${encodeURIComponent(next)}`,
          data: {
            nombre_visible: nombreVisible.trim() || email.split("@")[0],
          },
        },
      });

      if (signUpError) throw signUpError;

      if (!data.user) {
        throw new Error("No se pudo crear la cuenta");
      }

      if (data.session) {
        await afterAuth(data.user.id);
        return;
      }

      setMessage("Revisa tu correo para confirmar la cuenta.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Ocurrió un error";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
          Mundial 2026
        </p>
        <h1 className="mt-2 text-3xl font-bold text-white">Mundial Compas</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Quiniela y chat en tiempo real entre compas
        </p>
      </div>

      <div className="mb-6 flex rounded-full bg-zinc-900/80 p-1 ring-1 ring-zinc-800">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`flex-1 rounded-full py-2 text-sm font-medium transition ${
            mode === "login"
              ? "bg-emerald-600 text-white shadow"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Iniciar sesión
        </button>
        <button
          type="button"
          onClick={() => setMode("register")}
          className={`flex-1 rounded-full py-2 text-sm font-medium transition ${
            mode === "register"
              ? "bg-emerald-600 text-white shadow"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Crear cuenta
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-xl backdrop-blur"
      >
        {mode === "register" && (
          <div>
            <label htmlFor="nombre" className="mb-1 block text-sm text-zinc-300">
              Nombre en la quiniela
            </label>
            <input
              id="nombre"
              type="text"
              value={nombreVisible}
              onChange={(e) => setNombreVisible(e.target.value)}
              placeholder="Ej. El Chicharito"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none ring-emerald-500 focus:ring-2"
            />
          </div>
        )}

        <div>
          <label htmlFor="email" className="mb-1 block text-sm text-zinc-300">
            Correo electrónico
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none ring-emerald-500 focus:ring-2"
          />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label htmlFor="password" className="text-sm text-zinc-300">
              Contraseña
            </label>
            {mode === "login" && (
              <Link
                href="/recuperar-contrasena"
                className="text-xs text-emerald-400 hover:text-emerald-300"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            )}
          </div>
          <input
            id="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none ring-emerald-500 focus:ring-2"
          />
        </div>

        {mode === "register" && (
          <p className="rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-xs text-zinc-400">
            La quiniela es <strong className="text-emerald-400">gratis</strong> para
            todos. La bolsa de paga y el Contrato de Honor se activan después desde{" "}
            <strong className="text-zinc-300">Mi Quiniela</strong>.
          </p>
        )}

        {error && (
          <p className="rounded-lg bg-red-950/80 px-3 py-2 text-sm text-red-200" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="rounded-lg bg-emerald-950/80 px-3 py-2 text-sm text-emerald-200">
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-700 py-3 text-base font-bold text-white shadow-lg shadow-emerald-900/40 transition hover:from-emerald-400 hover:to-emerald-600 disabled:opacity-60"
        >
          {loading
            ? "Espere…"
            : mode === "login"
              ? "Entrar a la quiniela"
              : "Crear cuenta y unirme"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-zinc-500">
        Al entrar serás agregado automáticamente a la liga global{" "}
        <strong className="text-zinc-400">Mundial Compas</strong>.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center text-sm text-zinc-400">Cargando…</div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
