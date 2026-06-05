"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { buildAuthCallbackUrl } from "@/lib/auth/app-url";
import { applyPendingHonorTermsIfAny } from "@/lib/auth/apply-honor-terms";
import {
  getAuthErrorMessage,
  isSignupPendingEmailConfirmation,
  VERIFY_EMAIL_MESSAGE,
} from "@/lib/auth/messages";

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

  async function handleGoogleSignIn() {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: buildAuthCallbackUrl(next),
        },
      });
      if (oauthError) throw oauthError;
    } catch (err) {
      setError(getAuthErrorMessage(err, "login"));
      setLoading(false);
    }
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

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: buildAuthCallbackUrl(next),
          data: {
            nombre_visible: nombreVisible.trim() || email.split("@")[0],
          },
        },
      });

      if (signUpError) throw signUpError;

      if (isSignupPendingEmailConfirmation(data)) {
        setMessage(VERIFY_EMAIL_MESSAGE);
        setMode("login");
        return;
      }

      if (!data.user) {
        throw new Error("No se pudo crear la cuenta");
      }

      if (data.session) {
        await afterAuth(data.user.id);
        return;
      }

      setMessage(VERIFY_EMAIL_MESSAGE);
      setMode("login");
    } catch (err) {
      setError(getAuthErrorMessage(err, mode));
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
            La quiniela global es <strong className="text-emerald-400">gratuita</strong>{" "}
            y de honor. Para cooperacha entre amigos, crea una quiniela privada.
          </p>
        )}

        {error && (
          <p className="rounded-lg bg-red-950/80 px-3 py-2 text-sm text-red-200" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p
            className="rounded-lg border border-emerald-800/60 bg-emerald-950/80 px-3 py-3 text-sm leading-relaxed text-emerald-100"
            role="status"
          >
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

        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-700" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-zinc-900/60 px-2 text-zinc-500">o continúa con</span>
          </div>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={() => void handleGoogleSignIn()}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-700 bg-zinc-950 py-3 text-sm font-medium text-white transition hover:bg-zinc-900 disabled:opacity-60"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Google
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
