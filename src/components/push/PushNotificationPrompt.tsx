"use client";

import { useEffect, useState } from "react";
import {
  dismissPushPrompt,
  isPushSupported,
  isStandalonePwa,
  shouldOfferPushPrompt,
  subscribeToPushNotifications,
} from "@/lib/push/client";

export function PushNotificationPrompt() {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setVisible(shouldOfferPushPrompt());
  }, []);

  if (!visible || done) return null;

  async function handleEnable() {
    setLoading(true);
    setError(null);
    try {
      const ok = await subscribeToPushNotifications();
      if (ok) {
        setDone(true);
        setVisible(false);
      } else {
        setError("Permiso denegado. Puedes activarlo después en Ajustes del iPhone.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo activar push");
    } finally {
      setLoading(false);
    }
  }

  function handleDismiss() {
    dismissPushPrompt();
    setVisible(false);
  }

  const iosInstalled = isStandalonePwa();

  return (
    <div
      className="fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 mx-auto max-w-lg px-4"
      role="region"
      aria-label="Activar notificaciones"
    >
      <div className="rounded-2xl border border-emerald-800/50 bg-zinc-900/95 p-4 shadow-xl backdrop-blur">
        <p className="text-sm font-semibold text-white">
          ¿Te avisamos de goles, tarjetas y alineaciones?
        </p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-400">
          {iosInstalled
            ? "Activa notificaciones para goles, tarjetas y avisos de inicio, medio tiempo y final."
            : "Instala la app en tu pantalla de inicio para recibir goles, tarjetas y fases del partido."}
        </p>
        {error && (
          <p className="mt-2 text-xs text-red-300" role="alert">
            {error}
          </p>
        )}
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={loading || !isPushSupported()}
            onClick={() => void handleEnable()}
            className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Activando…" : "Activar notificaciones"}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleDismiss}
            className="rounded-xl px-3 py-2.5 text-sm text-zinc-400 hover:text-white"
          >
            Ahora no
          </button>
        </div>
      </div>
    </div>
  );
}
