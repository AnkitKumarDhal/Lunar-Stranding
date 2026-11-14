import React from "react";
import { AlertTriangle, ShieldAlert, CheckCircle2 } from "lucide-react";
import type { HazardPayload } from "../types/game";

interface Props {
  hazard: HazardPayload | null;
  onExecuteAction: (actionId: string) => void;
}

export const HazardInterruptModal: React.FC<Props> = ({
  hazard,
  onExecuteAction,
}) => {
  if (!hazard) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 font-mono select-none">
      <div className="w-full max-w-lg bg-slate-950 border-2 border-red-500/80 rounded-xl shadow-[0_0_40px_rgba(239,68,68,0.3)] p-6 text-slate-100">
        <div className="flex items-center justify-between border-b border-red-900/60 pb-3 mb-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-red-500 w-7 h-7" />
            <div>
              <div className="text-[10px] tracking-widest text-red-400 font-bold">
                BACKEND ALERT // SOLAR ANOMALY
              </div>
              <h2 className="text-lg font-extrabold tracking-wider text-white">
                {hazard.title}
              </h2>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-red-400">WINDOW</div>
            <div className="text-2xl font-black text-red-400">
              {hazard.remainingSeconds}s
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-300 mb-4">{hazard.description}</p>

        <div className="space-y-2">
          {hazard.actions.map((act) => (
            <button
              key={act.id}
              disabled={act.completed}
              onClick={() => onExecuteAction(act.id)}
              className={`w-full py-2.5 px-4 rounded border text-xs font-bold tracking-wider flex items-center justify-between transition-colors cursor-pointer ${
                act.completed
                  ? "bg-emerald-950/30 border-emerald-600/50 text-emerald-400 cursor-default"
                  : "bg-red-950/40 border-red-500/70 text-red-100 hover:bg-red-900/50"
              }`}
            >
              <span className="flex items-center gap-2">
                <ShieldAlert size={15} />
                {act.label}
              </span>
              {act.completed ? (
                <span className="flex items-center gap-1 text-[10px]">
                  <CheckCircle2 size={14} /> DONE
                </span>
              ) : (
                <span className="text-[10px] bg-red-500/20 px-2 py-0.5 rounded border border-red-400/50">
                  TRIGGER
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
