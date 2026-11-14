import React from "react";
import { X, Wifi } from "lucide-react";

interface TacticalTabletProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}

export const TacticalTabletModal: React.FC<TacticalTabletProps> = ({
  title,
  subtitle = "LUNAR OS // TERMINAL LINK",
  onClose,
  children,
}) => {
  return (
    <div className="fixed inset-0 z-40 bg-black/65 backdrop-blur-sm flex items-center justify-center p-6 select-none font-mono">
      <div className="relative w-full max-w-3xl bg-slate-900/95 border-2 border-slate-700/80 rounded-xl p-3 shadow-[0_20px_60px_rgba(0,0,0,0.95)]">
        <div className="absolute top-1.5 left-1.5 w-3 h-3 border-t-2 border-l-2 border-cyan-500/50 rounded-tl-sm pointer-events-none" />
        <div className="absolute top-1.5 right-1.5 w-3 h-3 border-t-2 border-r-2 border-cyan-500/50 rounded-tr-sm pointer-events-none" />
        <div className="absolute bottom-1.5 left-1.5 w-3 h-3 border-b-2 border-l-2 border-cyan-500/50 rounded-bl-sm pointer-events-none" />
        <div className="absolute bottom-1.5 right-1.5 w-3 h-3 border-b-2 border-r-2 border-cyan-500/50 rounded-br-sm pointer-events-none" />

        <div className="flex items-center justify-between px-3 py-2 bg-slate-950/80 rounded-t-lg border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <div>
              <h2 className="text-sm font-bold tracking-wider text-slate-100 uppercase">
                {title}
              </h2>
              <span className="text-[10px] text-slate-400 tracking-widest block">
                {subtitle}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-[10px] text-cyan-400/70">
              <Wifi size={12} />
              <span>SYNCED</span>
            </div>
            <button
              onClick={onClose}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-600 cursor-pointer transition-colors"
            >
              <X size={14} /> CLOSE
            </button>
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800/90 rounded-b-lg p-6 min-h-[380px] text-slate-100 shadow-inner">
          {children}
        </div>
      </div>
    </div>
  );
};
