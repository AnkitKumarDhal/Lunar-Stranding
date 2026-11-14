import { Battery, Activity, Clock, Terminal, Volume2 } from "lucide-react";

export default function Hud() {
  const panelBase =
    "bg-slate-950/70 backdrop-blur-md border border-cyan-800/60 shadow-[0_0_15px_rgba(0,0,0,0.8)] pointer-events-auto font-mono";

  return (
    <div className="absolute inset-0 z-20 pointer-events-none text-cyan-100 uppercase tracking-wider select-none">
      <div className="absolute top-4 left-6 flex items-center gap-3 pointer-events-auto">
        <div className="w-12 h-12 flex items-center justify-center border-2 border-cyan-500 bg-black/80 font-bold text-2xl text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.5)]">
          LS
        </div>
        <div className="flex flex-col">
          <h1 className="font-extrabold text-xl leading-tight text-white drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]">
            LUNAR STRANDING
          </h1>
          <span className="text-[10px] text-cyan-500 tracking-[0.3em]">
            SOUTH POLE OUTPOST
          </span>
        </div>
      </div>

      <div className="absolute top-4 right-6 flex flex-col gap-2 w-72">
        <div className={`${panelBase} p-3`}>
          <div className="flex justify-between items-center mb-1.5 text-amber-400">
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <Battery size={14} /> <span>POWER</span>
            </div>
            <span className="text-xs">68/100</span>
          </div>
          <div className="w-full bg-slate-900 h-2 border border-amber-900/50">
            <div className="bg-amber-400 h-full w-[68%] shadow-[0_0_8px_#fbbf24]"></div>
          </div>
        </div>

        <div className="flex gap-2">
          <div className={`${panelBase} p-3 flex-1`}>
            <div className="flex justify-between items-center mb-1 text-red-400">
              <div className="flex items-center gap-1 text-[10px] font-bold">
                <Activity size={12} /> <span>HEALTH</span>
              </div>
              <span className="text-[10px]">88%</span>
            </div>
            <div className="w-full bg-slate-900 h-1.5">
              <div className="bg-red-500 h-full w-[88%] shadow-[0_0_5px_#ef4444]"></div>
            </div>
          </div>

          <div
            className={`${panelBase} p-2 flex-1 flex flex-col justify-center items-center text-cyan-400`}
          >
            <div className="flex items-center gap-1 text-[10px] mb-0.5">
              <Clock size={10} /> <span>MISSION TIME</span>
            </div>
            <span className="text-sm font-bold text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">
              DAY 01
            </span>
          </div>
        </div>
      </div>

      <div className={`absolute top-1/3 right-6 w-72 ${panelBase} p-4`}>
        <h2 className="text-xs font-bold text-cyan-400 border-b border-cyan-800 pb-1.5 mb-3">
          MISSION LOG
        </h2>
        <ul className="text-[11px] space-y-2.5 text-cyan-100/80">
          <li className="flex items-start gap-2">
            <span className="text-amber-400 mt-0.5 animate-pulse">▶</span>
            <span>Awaiting task assignment.</span>
          </li>
          <li className="flex items-start gap-2 opacity-40">
            <span className="text-cyan-600 mt-0.5">✓</span>
            <span className="line-through">Establish outpost power</span>
          </li>
        </ul>
      </div>

      <div className={`absolute bottom-4 left-6 w-96 ${panelBase} p-4`}>
        <div className="flex items-center gap-2 text-[10px] text-amber-500 mb-2 border-b border-amber-900/50 pb-1.5">
          <Terminal size={12} /> AI TERMINAL // MANUAL OVERRIDE
        </div>
        <div className="text-[11px] space-y-1 h-20 overflow-y-auto mb-3 flex flex-col justify-end">
          <p className="text-cyan-500/70">&gt; System initialized.</p>
          <p className="text-amber-400">
            &gt; WARNING: 7 days life support remaining.
          </p>
          <p className="text-cyan-300">&gt; Awaiting queries...</p>
        </div>
        <div className="flex gap-2">
          <button className="text-[10px] border border-cyan-800 hover:bg-cyan-900/50 hover:border-cyan-500 transition-colors py-1.5 px-3 flex-1 text-cyan-300">
            [ STATUS ]
          </button>
          <button className="text-[10px] border border-cyan-800 hover:bg-cyan-900/50 hover:border-cyan-500 transition-colors py-1.5 px-3 flex-1 text-cyan-300">
            [ RESCUE ]
          </button>
        </div>
      </div>

      <div className={`absolute bottom-4 right-6 w-48 ${panelBase} p-3`}>
        <div className="text-[10px] text-cyan-600 mb-2">SYSTEM COMMS</div>
        <div className="flex items-center justify-between text-[11px] text-cyan-300 hover:text-cyan-100 transition-colors cursor-pointer">
          <div className="flex items-center gap-2">
            <Volume2 size={14} /> <span>MUTE ALL</span>
          </div>
          <input
            type="checkbox"
            className="accent-cyan-500 w-3.5 h-3.5 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
