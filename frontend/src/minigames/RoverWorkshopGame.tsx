import { useCallback, useEffect, useState } from "react";
import {
  gameApi,
  type RoverWorkshopGameData,
  type RoverWorkshopResponse,
} from "@/services/api";

interface RoverWorkshopGameProps {
  onPowerConsumed: (amount: number) => void;
}

export const RoverWorkshopGame = ({ onPowerConsumed }: RoverWorkshopGameProps) => {
  const [game, setGame] = useState<RoverWorkshopGameData | null>(null);
  const [selectedLines, setSelectedLines] = useState<number[]>([]);
  const [result, setResult] = useState<RoverWorkshopResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNewJob = useCallback(async () => {
    setLoading(true);
    setError(null);
    setGame(null);
    setResult(null);

    try {
      const nextGame = await gameApi.newRoverWorkshopGame();
      setGame(nextGame);
      setSelectedLines(Array(nextGame.a1.length).fill(1));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load repair processes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNewJob();
  }, [loadNewJob]);

  const selectLine = (station: number, line: number) => {
    setSelectedLines((previous) =>
      previous.map((selected, index) => index === station ? line : selected),
    );
  };

  const handleSubmit = async () => {
    if (!game) return;
    setLoading(true);
    setError(null);

    try {
      const response = await gameApi.submitRoverWorkshop(game, selectedLines);
      setResult(response);
      onPowerConsumed(response.power_consumed);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Schedule submission failed");
    } finally {
      setLoading(false);
    }
  };

  const averagePower = game
    ? game.power_kw.reduce((sum, value) => sum + value, 0) / game.power_kw.length
    : 0;
  const positions = (index: number) => 100 + index * 200;

  return (
    <div className="flex h-full flex-col gap-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2 text-slate-400">
        <p>
          <span className="font-bold text-cyan-400">OBJECTIVE:</span> Choose one line for each repair process. Minimize total service time and power use.
        </p>
        {game && <span className="font-mono text-amber-400">AVG DRAW {averagePower.toFixed(1)} kW</span>}
      </div>

      {loading && !game ? (
        <div className="py-16 text-center font-mono text-cyan-300">GENERATING WORK ORDER...</div>
      ) : game && (
        <>
          <div className="flex flex-wrap justify-between gap-2 rounded border border-slate-700 bg-slate-900/70 px-3 py-2 font-mono text-[10px]">
            <span>ENTRY: <b className="text-cyan-300">L1 +{game.entry1}m</b> / <b className="text-amber-300">L2 +{game.entry2}m</b></span>
            <span>EXIT: <b className="text-cyan-300">L1 +{game.exit1}m</b> / <b className="text-amber-300">L2 +{game.exit2}m</b></span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-950/80 p-2">
            <div className="relative mx-auto h-[245px] min-w-[640px]">
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 245" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <marker id="workshop-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M0,0 L6,3 L0,6 Z" fill="#475569" />
                  </marker>
                  <marker id="workshop-selected-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M0,0 L6,3 L0,6 Z" fill="#22d3ee" />
                  </marker>
                </defs>
                {game.a1.slice(0, -1).map((_, index) => {
                  const x1 = positions(index) + 80;
                  const x2 = positions(index + 1) - 80;
                  return (
                    <g key={index} stroke="#475569" strokeWidth="2" opacity="0.8" markerEnd="url(#workshop-arrow)">
                      <line x1={x1} y1="95" x2={x2} y2="95" />
                      <line x1={x1} y1="195" x2={x2} y2="195" />
                      <line x1={x1} y1="95" x2={x2} y2="195" />
                      <line x1={x1} y1="195" x2={x2} y2="95" />
                    </g>
                  );
                })}
                {selectedLines.slice(0, -1).map((line, index) => (
                  <line
                    key={index}
                    x1={positions(index) + 80}
                    y1={line === 1 ? 95 : 195}
                    x2={positions(index + 1) - 80}
                    y2={selectedLines[index + 1] === 1 ? 95 : 195}
                    stroke="#22d3ee"
                    strokeWidth="4"
                    markerEnd="url(#workshop-selected-arrow)"
                  />
                ))}
              </svg>

              {game.process_names.map((name, index) => (
                <div key={`${name}-${index}`}>
                  <div
                    className="absolute top-1 -translate-x-1/2 px-1 text-center text-[10px] font-semibold leading-tight text-slate-200"
                    style={{ left: `${10 + index * 20}%`, width: "18%", minHeight: "38px" }}
                  >
                    <span className="block text-[9px] text-slate-500">S{index + 1}</span>
                    <span className="line-clamp-2 break-words">{name}</span>
                  </div>

                  {[1, 2].map((line) => {
                    const isSelected = selectedLines[index] === line;
                    const time = line === 1 ? game.a1[index] : game.a2[index];
                    return (
                      <button
                        key={line}
                        type="button"
                        disabled={Boolean(result) || loading}
                        aria-pressed={isSelected}
                        onClick={() => selectLine(index, line)}
                        className={`absolute flex h-[58px] -translate-x-1/2 flex-col items-center justify-center rounded-lg border text-center font-mono transition-colors disabled:cursor-default ${
                          isSelected
                            ? line === 1
                              ? "border-cyan-400 bg-cyan-950 text-cyan-100 shadow-[0_0_12px_rgba(34,211,238,0.18)]"
                              : "border-amber-400 bg-amber-950 text-amber-100 shadow-[0_0_12px_rgba(251,191,36,0.18)]"
                            : "border-slate-700 bg-slate-900/90 text-slate-500 hover:border-slate-500"
                        }`}
                        style={{ left: `${10 + index * 20}%`, top: line === 1 ? "66px" : "166px", width: "16%" }}
                      >
                        <span className="text-[9px]">LINE {line}</span>
                        <span className="text-sm font-bold">{time} min</span>
                        <span className="text-[9px]">{game.power_kw[index].toFixed(1)} kW</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4">
            {game.t1.map((cost, index) => (
              <div key={index} className="rounded border border-slate-800 bg-slate-900/60 px-2 py-1.5 text-center font-mono text-[9px]">
                <span className="block text-slate-500">S{index + 1} → S{index + 2}</span>
                <span className="text-cyan-300">1→2 +{cost}m</span>
                <span className="mx-1 text-slate-600">|</span>
                <span className="text-amber-300">2→1 +{game.t2[index]}m</span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-800 bg-slate-900/60 p-2">
            <div className="flex flex-wrap items-center gap-1 font-mono text-[10px]">
              <span className="mr-1 text-slate-500">ROUTE:</span>
              {selectedLines.map((line, index) => (
                <span key={index} className={line === 1 ? "text-cyan-300" : "text-amber-300"}>
                  S{index + 1}:L{line}{index < selectedLines.length - 1 ? " →" : ""}
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={loadNewJob} disabled={loading} className="rounded border border-slate-600 bg-slate-800 px-3 py-1.5 text-[10px] font-bold text-slate-300 hover:bg-slate-700 disabled:opacity-40">
                NEW JOB
              </button>
              <button onClick={handleSubmit} disabled={loading || Boolean(result)} className="rounded border border-cyan-400 bg-cyan-500/15 px-3 py-1.5 text-[10px] font-bold text-cyan-300 hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-40">
                {loading ? "CALCULATING..." : "DISPATCH SCHEDULE"}
              </button>
            </div>
          </div>
        </>
      )}

      {error && <p className="rounded border border-rose-500/40 bg-rose-950/30 p-2 text-rose-300">{error}</p>}

      {result && (
        <div className="space-y-2 rounded border border-slate-700 bg-slate-900/90 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={`rounded border px-2 py-1 text-[10px] font-bold ${result.status === "OPTIMAL_SCHEDULE" ? "border-emerald-500/40 text-emerald-300" : "border-amber-500/40 text-amber-300"}`}>
              {result.status}
            </span>
            <span className="font-mono text-[10px] text-amber-300">POWER DRAIN: -{result.power_consumed.toFixed(2)} PWR</span>
          </div>
          <p className="text-slate-200">{result.message}</p>
          <div className="grid grid-cols-2 gap-2 border-t border-slate-800 pt-2 text-[10px] font-mono md:grid-cols-4">
            <div><span className="block text-slate-500">YOUR TIME</span><b className="text-amber-300">{result.player_time} min</b></div>
            <div><span className="block text-slate-500">OPTIMAL TIME</span><b className="text-emerald-300">{result.optimal.time} min</b></div>
            <div><span className="block text-slate-500">EXTRA TIME</span><b className="text-amber-300">+{result.time_difference} min</b></div>
            <div><span className="block text-slate-500">OPTIMAL ROUTE</span><b className="text-cyan-300">{result.optimal.sequence.map((line) => `L${line}`).join(" → ")}</b></div>
          </div>
        </div>
      )}
    </div>
  );
};
