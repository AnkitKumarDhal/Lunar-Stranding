// frontend/src/minigames/RoverWorkshopGame.tsx
import { useState } from "react";
import { gameApi, type RoverWorkshopResponse } from "@/services/api";

const STATION_NAMES = [
  "Chassis Alignment",
  "ECLSS Scrubber",
  "Armor Plating",
  "RTG Thermal Core",
  "LIDAR Calibration",
];

const DEFAULT_LINE1_TIMES = [7.0, 9.0, 5.0, 8.0, 4.0];
const DEFAULT_LINE2_TIMES = [8.0, 4.0, 7.0, 5.0, 6.0];
const DEFAULT_T1 = [2.0, 3.0, 2.0, 3.0]; // Line 1 -> Line 2 transfer
const DEFAULT_T2 = [2.0, 1.0, 2.0, 2.0]; // Line 2 -> Line 1 transfer
const DEFAULT_ENTRY1 = 3.0;
const DEFAULT_ENTRY2 = 4.0;
const DEFAULT_EXIT1 = 3.0;
const DEFAULT_EXIT2 = 2.0;

export const RoverWorkshopGame = () => {
  const [selectedLines, setSelectedLines] = useState<number[]>([1, 1, 1, 1, 1]);
  const [result, setResult] = useState<RoverWorkshopResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set line selection (1 or 2) for a station
  const setStationLine = (stationIdx: number, lineNum: number) => {
    setSelectedLines((prev) => {
      const next = [...prev];
      next[stationIdx] = lineNum;
      return next;
    });
  };

  const handleReset = () => {
    setSelectedLines([1, 1, 1, 1, 1]);
    setResult(null);
    setError(null);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await gameApi.submitRoverWorkshop(
        DEFAULT_LINE1_TIMES,
        DEFAULT_LINE2_TIMES,
        DEFAULT_T1,
        DEFAULT_T2,
        DEFAULT_ENTRY1,
        DEFAULT_ENTRY2,
        DEFAULT_EXIT1,
        DEFAULT_EXIT2,
        selectedLines,
      );
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Schedule submission failed");
    } finally {
      setLoading(false);
    }
  };

  // Live estimated player time
  const calculateLiveTime = () => {
    if (selectedLines.length === 0) return 0;
    const firstLine = selectedLines[0];
    let total = (firstLine === 1 ? DEFAULT_ENTRY1 : DEFAULT_ENTRY2) +
      (firstLine === 1 ? DEFAULT_LINE1_TIMES[0] : DEFAULT_LINE2_TIMES[0]);

    for (let i = 1; i < selectedLines.length; i++) {
      const prev = selectedLines[i - 1];
      const curr = selectedLines[i];
      if (prev === 1 && curr === 2) total += DEFAULT_T1[i - 1];
      else if (prev === 2 && curr === 1) total += DEFAULT_T2[i - 1];
      total += curr === 1 ? DEFAULT_LINE1_TIMES[i] : DEFAULT_LINE2_TIMES[i];
    }
    const lastLine = selectedLines[selectedLines.length - 1];
    total += lastLine === 1 ? DEFAULT_EXIT1 : DEFAULT_EXIT2;
    return total;
  };

  const liveEstimatedTime = calculateLiveTime();

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Top instruction header */}
      <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
        <div>
          <span className="text-cyan-400 font-bold">OBJECTIVE:</span> Schedule the rover across two servicing lines using minimum total time (Assembly Line Scheduling DP).
        </div>
        <div className="text-[11px] font-mono text-slate-400">
          Estimated: <span className="text-amber-400 font-bold">{liveEstimatedTime.toFixed(1)} min</span>
        </div>
      </div>

      {/* Assembly Lines Schematic Canvas */}
      <div className="bg-slate-900/90 border border-slate-700/80 rounded-lg p-3 space-y-4 select-none">
        {/* Entry and Exit Headers */}
        <div className="flex justify-between items-center text-[11px] font-mono text-slate-400 px-1">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 uppercase font-bold">Entry Bays:</span>
            <span className="text-cyan-400">Line 1 (+{DEFAULT_ENTRY1}m)</span>
            <span className="text-slate-600">|</span>
            <span className="text-amber-400">Line 2 (+{DEFAULT_ENTRY2}m)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 uppercase font-bold">Exit Bays:</span>
            <span className="text-cyan-400">Line 1 (+{DEFAULT_EXIT1}m)</span>
            <span className="text-slate-600">|</span>
            <span className="text-amber-400">Line 2 (+{DEFAULT_EXIT2}m)</span>
          </div>
        </div>

        {/* Assembly Line 1 (Robotic Line) */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] font-mono text-cyan-400 font-semibold px-1">
            <span>ASSEMBLY LINE 1 (ROBOTIC BAY)</span>
            <span className="text-slate-500 text-[10px]">FAST MECHANICS</span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {DEFAULT_LINE1_TIMES.map((time, idx) => {
              const isSelected = selectedLines[idx] === 1;
              return (
                <button
                  key={`line1-station-${idx}`}
                  onClick={() => setStationLine(idx, 1)}
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between h-20 ${
                    isSelected
                      ? "bg-cyan-950/60 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.25)]"
                      : "bg-slate-950/70 border-slate-800 hover:border-slate-700 opacity-60 hover:opacity-90"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-mono">S{idx + 1}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                        isSelected ? "bg-cyan-500 text-slate-950" : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      LINE 1
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-200 block truncate">
                      {STATION_NAMES[idx]}
                    </span>
                    <span className="text-[11px] text-cyan-300 font-mono font-semibold">
                      {time} min
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Inter-Line Transfer Overhead Indicators */}
        <div className="grid grid-cols-4 gap-2 px-6 py-1 bg-slate-950/50 rounded border border-slate-800 text-[10px] font-mono">
          {DEFAULT_T1.map((t1Cost, idx) => (
            <div key={`transfer-${idx}`} className="flex flex-col items-center justify-center text-center">
              <span className="text-slate-500">Between S{idx + 1} ↔ S{idx + 2}</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-cyan-400/90">L1→L2: +{t1Cost}m</span>
                <span className="text-slate-600">•</span>
                <span className="text-amber-400/90">L2→L1: +{DEFAULT_T2[idx]}m</span>
              </div>
            </div>
          ))}
        </div>

        {/* Assembly Line 2 (Manual Bay) */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] font-mono text-amber-400 font-semibold px-1">
            <span>ASSEMBLY LINE 2 (MANUAL EVA BAY)</span>
            <span className="text-slate-500 text-[10px]">PRECISION TUNING</span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {DEFAULT_LINE2_TIMES.map((time, idx) => {
              const isSelected = selectedLines[idx] === 2;
              return (
                <button
                  key={`line2-station-${idx}`}
                  onClick={() => setStationLine(idx, 2)}
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between h-20 ${
                    isSelected
                      ? "bg-amber-950/60 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                      : "bg-slate-950/70 border-slate-800 hover:border-slate-700 opacity-60 hover:opacity-90"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-mono">S{idx + 1}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                        isSelected ? "bg-amber-500 text-slate-950" : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      LINE 2
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-200 block truncate">
                      {STATION_NAMES[idx]}
                    </span>
                    <span className="text-[11px] text-amber-300 font-mono font-semibold">
                      {time} min
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Control Strip */}
      <div className="flex flex-wrap justify-between items-center gap-2 bg-slate-900/60 p-2.5 rounded border border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 uppercase font-semibold">Route Sequence:</span>
          <span className="text-xs text-cyan-400 font-bold font-mono">
            {selectedLines.map((l, i) => `S${i + 1}:L${l}`).join(" → ")}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            disabled={loading}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded border border-slate-600 transition-colors cursor-pointer"
          >
            RESET
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400 text-cyan-300 text-xs font-bold rounded tracking-wider disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {loading ? "CALCULATING DP..." : "DISPATCH ROVER SCHEDULE"}
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="text-xs text-rose-400 p-2 border border-rose-500/40 bg-rose-950/40 rounded">
          {error}
        </div>
      )}

      {/* Evaluation Results */}
      {result && (
        <div className="text-xs p-3 border border-slate-700 bg-slate-900/95 rounded space-y-2">
          <div className="flex items-center justify-between">
            <span
              className={`font-bold px-2 py-0.5 rounded text-[10px] tracking-wider ${
                result.status === "OPTIMAL_SCHEDULE"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
              }`}
            >
              STATUS: {result.status}
            </span>
            <span className="text-slate-400 font-mono">
              Schedule Efficiency:{" "}
              <span className="text-cyan-400 font-bold">{result.efficiency_percentage}%</span>
            </span>
          </div>

          <p className="text-slate-200">{result.message}</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-slate-800 text-[11px] font-mono">
            <div>
              <span className="text-slate-500 block">Your Servicing Time:</span>
              <span className="text-amber-400 font-bold">{result.player_time} min</span>
            </div>
            <div>
              <span className="text-slate-500 block">Optimal Minimum Time:</span>
              <span className="text-emerald-400 font-bold">{result.optimal_time} min</span>
            </div>
            <div>
              <span className="text-slate-500 block">Optimal Line Path:</span>
              <span className="text-slate-300 font-bold">
                {result.optimal_sequence.map((l, i) => `S${i + 1}:L${l}`).join(" → ")}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Overhead Extra:</span>
              <span className={`font-bold ${result.time_difference === 0 ? "text-emerald-400" : "text-amber-400"}`}>
                +{result.time_difference} min
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
