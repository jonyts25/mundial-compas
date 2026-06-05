"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/analytics/track";
import {
  dismissOnboarding,
  isOnboardingDismissed,
} from "@/lib/onboarding/dismiss";

const STEPS = [
  {
    n: "1",
    title: "Pronostica",
    body: "Marca tus resultados antes del pitazo. Cada acierto suma al liderato.",
    emoji: "🎯",
  },
  {
    n: "2",
    title: "Compite",
    body: "Sube en el ranking global o arma una quiniela solo con tus compas.",
    emoji: "🏆",
  },
  {
    n: "3",
    title: "Vive el partido",
    body: "Chat en vivo, datos mamalones y el calendario del Mundial en un solo lugar.",
    emoji: "⚽",
  },
] as const;

interface OnboardingStartCardProps {
  eligible: boolean;
}

export function OnboardingStartCard({ eligible }: OnboardingStartCardProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!eligible) return;
    if (!isOnboardingDismissed()) setVisible(true);
  }, [eligible]);

  if (!eligible || !visible) return null;

  return (
    <section
      className="mb-4 overflow-hidden rounded-2xl border border-emerald-800/40 bg-gradient-to-br from-emerald-950/80 via-zinc-900 to-zinc-950 shadow-lg shadow-emerald-950/30"
      aria-label="Guía de inicio"
    >
      <div className="relative px-4 pb-4 pt-5">
        <div
          className="pointer-events-none absolute -right-6 -top-4 text-6xl opacity-[0.12]"
          aria-hidden
        >
          🌍
        </div>

        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/90">
          Bienvenido, compa
        </p>
        <h2 className="mt-1 text-lg font-black leading-tight text-white">
          Arma tu quiniela del Mundial en 2 minutos
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-300">
          Pronostica partidos, compite con tus compas y sigue el Mundial con
          chats en vivo, datos mamalones y rankings.
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {STEPS.map((step) => (
            <div
              key={step.n}
              className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 px-2 py-2.5 text-center"
            >
              <span className="text-lg" aria-hidden>
                {step.emoji}
              </span>
              <p className="mt-1 text-[10px] font-bold uppercase text-emerald-400/90">
                {step.n}. {step.title}
              </p>
              <p className="mt-0.5 text-[10px] leading-snug text-zinc-500">
                {step.body}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-2 rounded-xl border border-zinc-800/60 bg-zinc-950/40 px-3 py-3 text-xs text-zinc-400">
          <p>
            <span className="font-semibold text-zinc-200">Quiniela global:</span>{" "}
            todos juegan por honor.
          </p>
          <p>
            <span className="font-semibold text-zinc-200">Quiniela privada:</span>{" "}
            crea tu grupo, invita compas y define si es honor o cooperacha
            manual.
          </p>
          <Link
            href="/legal"
            className="inline-block text-[11px] font-medium text-emerald-500 hover:underline"
          >
            Más info legal →
          </Link>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link
            href="/quiniela"
            onClick={() => trackEvent("onboarding_cta_clicked", { cta: "pronostico" })}
            className="rounded-xl bg-emerald-600 px-4 py-3 text-center text-sm font-bold text-white shadow-md shadow-emerald-900/40 transition hover:bg-emerald-500 active:scale-[0.98]"
          >
            Hacer mi primer pronóstico
          </Link>
          <Link
            href="/grupos/crear"
            onClick={() => trackEvent("onboarding_cta_clicked", { cta: "crear_grupo" })}
            className="rounded-xl border border-violet-700/50 bg-violet-950/40 px-4 py-3 text-center text-sm font-semibold text-violet-100 transition hover:border-violet-600/60 active:scale-[0.98]"
          >
            Crear quiniela privada
          </Link>
          <Link
            href="/grupos/unirse"
            onClick={() => trackEvent("onboarding_cta_clicked", { cta: "unirse" })}
            className="rounded-xl border border-zinc-700 bg-zinc-900/80 px-4 py-3 text-center text-sm font-semibold text-zinc-200 transition hover:bg-zinc-800 active:scale-[0.98]"
          >
            Unirme con código
          </Link>
        </div>

        <button
          type="button"
          onClick={() => {
            trackEvent("onboarding_dismissed", {});
            dismissOnboarding();
            setVisible(false);
          }}
          className="mt-3 w-full py-1 text-center text-xs text-zinc-500 transition hover:text-zinc-300"
        >
          Ya entendí
        </button>
      </div>
    </section>
  );
}
