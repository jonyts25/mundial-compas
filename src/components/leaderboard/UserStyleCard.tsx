"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics/track";
import type { ProfileBadge, UserProfile } from "@/lib/insights/profiles";

interface UserStyleCardProps {
  profile: UserProfile;
  ligaScope: "global" | "grupo";
}

export function UserStyleCard({ profile, ligaScope }: UserStyleCardProps) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    trackEvent("profile_card_viewed", {
      liga_scope: ligaScope,
      profile_primary: profile.primary.id,
    });
  }, [ligaScope, profile.primary.id]);

  return (
    <div className="mb-4 rounded-xl border border-zinc-700/80 bg-zinc-900/50 px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
        Tu estilo
      </p>
      <p className="mt-1 text-lg font-bold text-white">
        {profile.primary.emoji} {profile.primary.label}
      </p>
      <p className="mt-1 text-xs text-zinc-400">{profile.phrase}</p>

      {profile.secondary.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {profile.secondary.map((badge) => (
            <SecondaryBadge key={badge.id} badge={badge} />
          ))}
        </div>
      )}

      {profile.sampleOk && (
        <p className="mt-2 text-[10px] text-zinc-600">
          Basado en {profile.metrics.N} partidos puntuados · estimación recreativa
        </p>
      )}
    </div>
  );
}

function SecondaryBadge({ badge }: { badge: ProfileBadge }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-300">
      {badge.emoji} {badge.label}
    </span>
  );
}
