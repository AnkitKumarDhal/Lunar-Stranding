// frontend/src/minigames/FoodProductionGame.tsx
import { useState } from "react";
import {
  gameApi,
  type FoodProductionResponse,
  type GreenhouseTaskItem,
} from "@/services/api";

const GREENHOUSE_TASKS: GreenhouseTaskItem[] = [
  { name: "UV Water Sterilization", start_hour: 0, end_hour: 4, power_kw: 3.8, hp_gain: 10 },
  { name: "Red/Blue LED Photosynthesis", start_hour: 2, end_hour: 7, power_kw: 4.8, hp_gain: 18 },
  { name: "Aeroponic Root Mist Cycle", start_hour: 6, end_hour: 10, power_kw: 3.5, hp_gain: 12 },
  { name: "Algae Bioreactor Agitation", start_hour: 8, end_hour: 14, power_kw: 4.2, hp_gain: 20 },
  { name: "Thermal Canopy Heating", start_hour: 12, end_hour: 18, power_kw: 4.9, hp_gain: 15 },
  { name: "Microgreen Harvest Cycle", start_hour: 16, end_hour: 22, power_kw: 4.0, hp_gain: 18 },
];

export const FoodProductionGame = () => {
  const [selectedTasks, setSelectedTasks] = useState<string[]>([
    "Red/Blue LED Photosynthesis",
    "Algae Bioreactor Agitation",
    "Microgreen Harvest Cycle",
  ]);
  const [result, setResult] = useState<FoodProductionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialHp = 80;
  const dailyDrain = 30;
  const powerBusLimit = 5.0;

  const toggleTask = (name: string) => {
    setSelectedTasks((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name],
    );
  };

  const handleReset = () => {
    setSelectedTasks([]);
    setResult(null);
    setError(null);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await gameApi.submitFoodProduction(
        GREENHOUSE_TASKS,
        selectedTasks,
        initialHp,
        dailyDrain,
        powerBusLimit,
      );
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Schedule simulation failed");
    } finally {
      setLoading(false);
    }
  };

  // Calculate live preview metrics
  const chosenObjects = GREENHOUSE_TASKS.filter((t) => selectedTasks.includes(t.name));
  const estimatedHpGain = chosenObjects.reduce((sum, t) => sum + t.hp_gain, 0);

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
        <div>
          <span className="text-emerald-400 font-bold">OBJECTIVE:</span> Select non-overlapping greenhouse tasks to maximize Crew HP gain (Weighted Activity Selection).
        </div>
        <div className="text-[11px] font-mono">
          Power Bus Limit: <span className="text-amber-400 font-bold">{powerBusLimit.toFixed(1)} kW</span> | Daily Drain: <span className="text-rose-400 font-bold">-{dailyDrain} HP</span>
        </div>
      </div>

      {/* 24-Hour Timeline Bar Chart */}
      <div className="bg-slate-900/90 border border-slate-700/80 rounded-lg p-3 space-y-2">
        <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono border-b border-slate-800 pb-1">
          <span>00:00</span>
          <span>04:00</span>
          <span>08:00</span>
          <span>12:00</span>
          <span>16:00</span>
          <span>20:00</span>
          <span>24:00</span>
        </div>

        {/* Task Timeline Rows */}
        <div className="space-y-1.5 pt-1">
          {GREENHOUSE_TASKS.map((task) => {
            const isSelected = selectedTasks.includes(task.name);
            const leftPct = (task.start_hour / 24) * 100;
            const widthPct = ((task.end_hour - task.start_hour) / 24) * 100;

            return (
              <div
                key={task.name}
                onClick={() => toggleTask(task.name)}
                className={`relative h-9 rounded flex items-center px-2 cursor-pointer transition-all border ${
                  isSelected
                    ? "bg-emerald-950/40 border-emerald-500/80 shadow-[0_0_10px_rgba(16,185,129,0.15)]"
                    : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                }`}
              >
                {/* Background duration block */}
                <div
                  className={`absolute top-1 bottom-1 rounded transition-colors ${
                    isSelected ? "bg-emerald-500/25 border-l-2 border-r-2 border-emerald-400" : "bg-slate-800/40"
                  }`}
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                />

                <div className="relative z-10 flex items-center justify-between w-full text-xs">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      className="accent-emerald-400 cursor-pointer pointer-events-none"
                    />
                    <span className={`font-semibold ${isSelected ? "text-emerald-200" : "text-slate-300"}`}>
                      {task.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      ({task.start_hour}:00 - {task.end_hour}:00)
                    </span>
                  </div>

                  <div className="flex items-center gap-3 font-mono text-[11px]">
                    <span className="text-amber-400">{task.power_kw} kW</span>
                    <span className="text-emerald-400 font-bold">+{task.hp_gain} HP</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Controls Strip */}
      <div className="flex flex-wrap justify-between items-center gap-2 bg-slate-900/60 p-2.5 rounded border border-slate-800">
        <div className="flex items-center gap-4 text-xs font-mono">
          <div>
            <span className="text-slate-500">TASKS SELECTED: </span>
            <span className="text-cyan-400 font-bold">{selectedTasks.length}</span>
          </div>
          <div>
            <span className="text-slate-500">ESTIMATED RECOVERY: </span>
            <span className="text-emerald-400 font-bold">+{estimatedHpGain} HP</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            disabled={loading}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded border border-slate-600 transition-colors"
          >
            CLEAR
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || selectedTasks.length === 0}
            className="px-4 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400 text-emerald-300 text-xs font-bold rounded tracking-wider disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "SIMULATING CYCLE..." : "SUBMIT DAILY SCHEDULE"}
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="text-xs text-rose-400 p-2 border border-rose-500/40 bg-rose-950/40 rounded">
          {error}
        </div>
      )}

      {/* Simulation Results */}
      {result && (
        <div className="text-xs p-3 border border-slate-700 bg-slate-900/95 rounded space-y-2">
          <div className="flex items-center justify-between">
            <span
              className={`font-bold px-2 py-0.5 rounded text-[10px] tracking-wider ${
                result.status === "OPTIMAL"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : result.status === "SUBOPTIMAL"
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                  : "bg-rose-500/20 text-rose-400 border border-rose-500/40"
              }`}
            >
              STATUS: {result.status}
            </span>
            <span className="text-slate-400 font-mono">
              Schedule Efficiency: <span className="text-emerald-400 font-bold">{result.efficiency_percentage}%</span>
            </span>
          </div>

          <p className="text-slate-200">{result.message}</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-slate-800 text-[11px] font-mono">
            <div>
              <span className="text-slate-500 block">Crew Final HP:</span>
              <span className={`font-bold ${result.final_hp > 50 ? "text-emerald-400" : "text-amber-400"}`}>
                {result.final_hp}% {result.survived_day ? "(SURVIVED)" : "(CASUALTY)"}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Food HP Gained:</span>
              <span className="text-emerald-400 font-bold">+{result.player_hp_gain} HP</span>
            </div>
            <div>
              <span className="text-slate-500 block">Optimal Max Gain:</span>
              <span className="text-cyan-400 font-bold">+{result.optimal_hp_gain} HP</span>
            </div>
            <div>
              <span className="text-slate-500 block">Peak Power Draw:</span>
              <span className={`font-bold ${result.peak_power_kw > result.bus_limit_kw ? "text-rose-400" : "text-amber-400"}`}>
                {result.peak_power_kw} kW / {result.bus_limit_kw} kW
              </span>
            </div>
          </div>

          <div className="pt-1 text-[11px] text-slate-400 font-mono">
            Optimal Schedule:{" "}
            <span className="text-slate-200 font-semibold">{result.optimal_tasks.join(" → ")}</span>
          </div>
        </div>
      )}
    </div>
  );
};
