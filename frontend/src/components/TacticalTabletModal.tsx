import React from "react";
import { X, Wifi } from "lucide-react";

interface TacticalTabletProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  closeable?: boolean;
  children: React.ReactNode;
}

export const TacticalTabletModal: React.FC<TacticalTabletProps> = ({
  title,
  subtitle = "LUNAR OS // TERMINAL LINK",
  onClose,
  closeable = true,
  children,
}) => {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/65 p-6 font-mono select-none backdrop-blur-sm">
      <div className="relative w-full max-w-3xl rounded-xl border-2 border-slate-700/80 bg-slate-900/95 p-3 shadow-[0_20px_60px_rgba(0,0,0,0.95)]">
        <div className="pointer-events-none absolute left-1.5 top-1.5 h-3 w-3 rounded-tl-sm border-l-2 border-t-2 border-cyan-500/50" />
        <div className="pointer-events-none absolute right-1.5 top-1.5 h-3 w-3 rounded-tr-sm border-r-2 border-t-2 border-cyan-500/50" />
        <div className="pointer-events-none absolute bottom-1.5 left-1.5 h-3 w-3 rounded-bl-sm border-b-2 border-l-2 border-cyan-500/50" />
        <div className="pointer-events-none absolute bottom-1.5 right-1.5 h-3 w-3 rounded-br-sm border-b-2 border-r-2 border-cyan-500/50" />

        <div className="flex items-center justify-between rounded-t-lg border-b border-slate-800 bg-slate-950/80 px-3 py-2">
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-100">
                {title}
              </h2>
              <span className="block text-[10px] tracking-widest text-slate-400">
                {subtitle}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-[10px] text-cyan-400/70">
              <Wifi size={12} />
              <span>SYNCED</span>
            </div>

            {closeable && (
              <button
                type="button"
                onClick={onClose}
                className="flex cursor-pointer items-center gap-1 rounded border border-slate-600 bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-200 transition-colors hover:bg-slate-700"
              >
                <X size={14} /> CLOSE
              </button>
            )}
          </div>
        </div>

        <div className="min-h-[380px] rounded-b-lg border border-slate-800/90 bg-slate-950 p-6 text-slate-100 shadow-inner">
          {children}
        </div>
      </div>
    </div>
  );
};
