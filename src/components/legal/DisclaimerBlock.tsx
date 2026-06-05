interface DisclaimerBlockProps {
  title?: string;
  body: string;
  compact?: boolean;
}

export function DisclaimerBlock({
  title,
  body,
  compact = false,
}: DisclaimerBlockProps) {
  return (
    <div
      className={`rounded-xl border border-zinc-800 bg-zinc-900/40 ${
        compact ? "px-3 py-2" : "px-4 py-3"
      }`}
    >
      {title && (
        <p
          className={`font-bold uppercase tracking-wide text-zinc-500 ${
            compact ? "text-[9px]" : "text-[10px]"
          }`}
        >
          {title}
        </p>
      )}
      <p
        className={`leading-relaxed text-zinc-400 ${
          compact ? "mt-1 text-[10px]" : title ? "mt-2 text-xs" : "text-xs"
        }`}
      >
        {body}
      </p>
    </div>
  );
}
