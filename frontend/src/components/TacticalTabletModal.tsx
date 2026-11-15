import React from "react";
import { X, Wifi } from "lucide-react";
import { UiButton, UiPanel } from "./UiPrimitives";

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
      <UiPanel tone="raised" className="relative w-full max-w-3xl p-3">
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
              <UiButton
                variant="secondary"
                size="sm"
                onClick={onClose}
                className="gap-1"
              >
                <X size={14} /> CLOSE
              </UiButton>
            )}
          </div>
        </div>

        <UiPanel
          tone="inset"
          className="min-h-[380px] rounded-b-lg p-6 text-slate-100 shadow-inner"
        >
          {children}
        </UiPanel>
      </UiPanel>
    </div>
  );
};
