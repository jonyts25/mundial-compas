"use client";

import { useState } from "react";

export type ScoreValue = number | null;

export function ScoreInput({
  value,
  onChange,
  disabled,
  "aria-label": ariaLabel,
  compact = false,
}: {
  value: ScoreValue;
  onChange: (v: ScoreValue) => void;
  disabled: boolean;
  "aria-label": string;
  compact?: boolean;
}) {
  const [draft, setDraft] = useState(() =>
    value === null ? "" : String(value),
  );

  const sizeClass = compact
    ? "h-12 w-12 text-xl"
    : "h-14 w-14 text-2xl";

  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={draft}
      disabled={disabled}
      aria-label={ariaLabel}
      placeholder="—"
      onChange={(e) => {
        const raw = e.target.value.replace(/\D/g, "");
        if (raw === "") {
          setDraft("");
          onChange(null);
          return;
        }
        const n = Number.parseInt(raw, 10);
        if (Number.isNaN(n)) return;
        const clamped = Math.min(20, n);
        setDraft(String(clamped));
        onChange(clamped);
      }}
      onBlur={() => {
        if (draft === "") {
          onChange(null);
        }
      }}
      className={`${sizeClass} rounded-xl border-2 border-zinc-700 bg-zinc-950 text-center font-black tabular-nums text-white outline-none placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:text-zinc-600`}
    />
  );
}
