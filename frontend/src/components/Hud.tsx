import {
  Battery,
  CheckCircle2,
  Clock,
  Dumbbell,
  ListChecks,
  ShieldCheck,
  SunMedium,
  Wind,
  type LucideIcon,
} from "lucide-react";
import type { DailyTasksState } from "../types/game";
import { useState } from "react";
import { Code2, RotateCcw } from "lucide-react";

interface DailyRoutinePanelProps {
  visible: boolean;
  open: boolean;
  onToggleOpen: () => void;
  tasks: DailyTasksState;
  onToggleTask: (taskKey: keyof DailyTasksState) => void;
  day: number;
  remainingSeconds: number | null;
  sandbox: boolean;
  onEndDay: () => void;
}

export function DailyRoutinePanel({
  visible,
  open,
  onToggleOpen,
  tasks,
  onToggleTask,
  day,
  remainingSeconds,
  sandbox,
  onEndDay,
}: DailyRoutinePanelProps) {
  if (!visible) return null;

  const items: {
    key: keyof DailyTasksState;
    label: string;
    icon: LucideIcon;
  }[] = [
    { key: "eclss", label: "CYCLE ECLSS LIFE SUPPORT", icon: Wind },
    { key: "suitport", label: "PURGE SUITPORT AIRLOCK", icon: ShieldCheck },
    { key: "exercise", label: "LOW-G RESISTIVE EXERCISE", icon: Dumbbell },
    {
      key: "solarHeightAdjusted",
      label: "CALIBRATE SOLAR MAST HEIGHT",
      icon: SunMedium,
    },
  ];

  const completedCount = items.filter(({ key }) => tasks[key]).length;

  return (
    <div className="pointer-events-auto absolute bottom-5 right-6 z-30 font-mono">
      <button
        type="button"
        onClick={onToggleOpen}
        className="flex items-center gap-2 border border-cyan-500/60 bg-slate-950/90 px-4 py-3 text-[10px] font-bold tracking-widest text-cyan-200 shadow-[0_0_18px_rgba(6,182,212,0.18)] backdrop-blur transition-colors hover:bg-cyan-950/80"
      >
        <ListChecks size={15} />
        DAILY TASKS
        <span className="text-amber-300">
          {completedCount}/{items.length}
        </span>
        <span className="text-slate-500">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="absolute bottom-14 right-0 w-80 border border-cyan-800/70 bg-slate-950/95 p-4 shadow-[0_0_30px_rgba(0,0,0,0.75)] backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between border-b border-cyan-900 pb-2">
            <div>
              <h2 className="text-xs font-bold tracking-widest text-cyan-300">
                DAY {String(day).padStart(2, "0")} // CREW ROUTINE
              </h2>
              <p className="mt-1 text-[9px] text-slate-500">
                Optional base maintenance tasks
              </p>
            </div>
            <span className="text-[10px] text-emerald-400">
              {completedCount}/{items.length}
            </span>
          </div>

          <div className="space-y-2">
            {items.map(({ key, label, icon: Icon }) => {
              const done = tasks[key];

              return (
                <button
                  key={key}
                  type="button"
                  disabled={done}
                  onClick={() => onToggleTask(key)}
                  className={`flex w-full items-center justify-between gap-2 border px-3 py-2.5 text-left text-[9px] tracking-wider transition-colors ${
                    done
                      ? "border-cyan-900/50 bg-slate-900/50 text-cyan-700"
                      : "border-amber-500/40 bg-amber-950/20 text-amber-200 hover:border-amber-400 hover:bg-amber-950/50"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Icon size={13} /> {label}
                  </span>
                  {done ? <CheckCircle2 size={14} /> : <span>[ EXEC ]</span>}
                </button>
              );
            })}
          </div>

          <div className="mt-4 border-t border-slate-800 pt-3">
            {!sandbox && remainingSeconds !== null && (
              <p className="mb-3 flex items-center justify-between text-[10px] text-slate-400">
                <span className="flex items-center gap-2">
                  <Clock size={13} /> AUTONOMY WINDOW
                </span>
                <span className="font-bold tabular-nums text-amber-300">
                  {Math.floor(remainingSeconds / 60)
                    .toString()
                    .padStart(2, "0")}
                  :{(remainingSeconds % 60).toString().padStart(2, "0")}
                </span>
              </p>
            )}

            <button
              type="button"
              onClick={onEndDay}
              className="w-full border border-cyan-500/60 bg-cyan-500/15 px-3 py-2.5 text-[10px] font-bold tracking-widest text-cyan-200 transition-colors hover:bg-cyan-500/25"
            >
              {sandbox ? "END DAY" : "SLEEP / END DAY"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface HudProps {
  power: number;
  day: number;
  missionStatus: string;
  onResetGame: () => void;
}

export default function Hud({
  power,
  day,
  missionStatus,
  onResetGame,
}: HudProps) {
  const [devToolsOpen, setDevToolsOpen] = useState(false);
  const panelBase =
    "border border-cyan-800/60 bg-slate-950/75 font-mono shadow-[0_0_15px_rgba(0,0,0,0.8)] backdrop-blur-md pointer-events-auto";

  const safePower = Math.max(0, Math.min(100, power));

  return (
    <div className="pointer-events-none absolute inset-0 z-20 select-none font-mono uppercase tracking-wider text-cyan-100">
      <div className="pointer-events-auto absolute left-6 top-4 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center border-2 border-cyan-500 bg-black/80 text-2xl font-bold text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.5)]">
          LS
        </div>

        <div className="flex flex-col">
          <h1 className="text-xl font-extrabold leading-tight text-white drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]">
            LUNAR STRANDING
          </h1>
          <span className="text-[10px] tracking-[0.3em] text-cyan-500">
            SOUTH POLE OUTPOST
          </span>
        </div>
      </div>

      <div className="absolute right-6 top-4 flex w-72 flex-col gap-2">
        <div className={`${panelBase} p-3`}>
          <div className="mb-1.5 flex items-center justify-between text-amber-400">
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <Battery size={14} /> <span>POWER</span>
            </div>
            <span className="text-xs">
              {`${safePower.toFixed(1)}/100`}
            </span>
          </div>

          <div className="h-2 w-full border border-amber-900/50 bg-slate-900">
            <div
              className="h-full bg-amber-400 shadow-[0_0_8px_#fbbf24]"
              style={{ width: `${safePower}%` }}
            />
          </div>
        </div>

        <div
          className={`${panelBase} flex flex-col items-center justify-center p-2 text-cyan-400`}
        >
            <div className="mb-0.5 flex items-center gap-1 text-[10px]">
              <Clock size={10} /> <span>MISSION TIME</span>
            </div>

            <span className="text-sm font-bold text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">
              DAY {String(day).padStart(2, "0")}
            </span>
          </div>
      </div>

      <div className={`absolute right-6 top-36 w-72 p-4 ${panelBase}`}>
        <h2 className="mb-3 border-b border-cyan-800 pb-1.5 text-xs font-bold text-cyan-400">
          MISSION LOG
        </h2>

        <div className="flex items-start gap-2 text-[10px] leading-5 text-cyan-100/80">
          <span className="mt-0.5 animate-pulse text-amber-400">▶</span>
          <span>{missionStatus}</span>
        </div>
      </div>
      {import.meta.env.DEV && (
        <div className="pointer-events-auto absolute bottom-5 left-6 z-40 font-mono">
          {devToolsOpen && (
            <div className="mb-2 w-72 border border-amber-500/50 bg-slate-950/95 p-4 shadow-[0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between border-b border-amber-900/60 pb-2">
                <h2 className="text-sm font-bold tracking-widest text-amber-300">
                  DEVELOPER CONTROLS
                </h2>

                <span className="text-xs text-emerald-400">LOCAL ONLY</span>
              </div>

              <p className="mb-4 text-xs leading-5 text-slate-400">
                Testing utilities. These controls are available only in
                development mode.
              </p>

              <button
                type="button"
                onClick={onResetGame}
                className="flex w-full items-center justify-center gap-2 border border-rose-500/60 bg-rose-950/40 px-3 py-3 text-xs font-bold tracking-widest text-rose-300 transition-colors hover:border-rose-400 hover:bg-rose-950/70"
              >
                <RotateCcw size={15} />
                RESET ENTIRE GAME
              </button>

              <p className="mt-2 text-[10px] leading-4 text-slate-500">
                Clears the saved run and restarts from Day 1.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() => setDevToolsOpen((open) => !open)}
            aria-expanded={devToolsOpen}
            className="flex items-center gap-2 border border-amber-500/50 bg-slate-950/90 px-4 py-3 text-xs font-bold tracking-widest text-amber-300 shadow-[0_0_18px_rgba(251,191,36,0.12)] backdrop-blur transition-colors hover:border-amber-400 hover:bg-amber-950/50"
          >
            <Code2 size={15} />
            DEV MODE
            <span className="text-slate-500">{devToolsOpen ? "−" : "+"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
