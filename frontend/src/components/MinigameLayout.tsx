import type { ReactNode } from "react";

interface MinigameLayoutProps {
  title: string;
  headerRight?: ReactNode;
  children: ReactNode;
  controls?: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  result?: ReactNode;
}

export const MinigameLayout = ({
  title,
  headerRight,
  children,
  controls,
  hint,
  error,
  result,
}: MinigameLayoutProps) => {
  return (
    <div className="flex h-full min-h-[380px] flex-col gap-3">
      {/* COMMON HEADER */}

      <div className="flex items-center justify-between gap-2 text-[10px] font-mono tracking-wider text-slate-400">
        <span>{title}</span>
        {headerRight}
      </div>

      {/* GAME-SPECIFIC CONTENT */}
      {children}

      {/* GAME CONTROLS */}
      {controls && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
          {controls}
        </div>
      )}

      {/* OPTIONAL INSTRUCTIONS */}
      {hint && <p className="text-[10px] text-slate-400">{hint}</p>}

      {/* COMMON ERROR DISPLAY */}
      {error && (
        <div
          role="alert"
          className="rounded border border-red-700 bg-red-950/40 p-2 text-xs text-red-300"
        >
          {error}
        </div>
      )}

      {/* COMMON RESULT CONTAINER */}
      {result && (
        <div className="space-y-2 rounded border border-slate-700 bg-slate-900 p-3 text-xs text-slate-200">
          {result}
        </div>
      )}
    </div>
  );
};
