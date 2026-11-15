import { useCallback, useEffect, useState } from "react";
import {
  gameApi,
  type FoodProductionResponse,
  type GreenhouseTaskItem,
} from "@/services/api";
import type { MissionOutcome } from "@/types/game";

const DAILY_HP_DRAIN = 30;
const POWER_BUS_LIMIT_KW = 5.0;

interface FoodProductionGameProps {
  currentHp: number;
  onPowerConsumed: (amount: number) => void;
  onHealthChanged: (health: number) => void;
  onCompleted?: (outcome: MissionOutcome) => void;
}

export const FoodProductionGame = ({
  currentHp,
  onPowerConsumed,
  onHealthChanged,
  onCompleted,
}: FoodProductionGameProps) => {
  const [tasks, setTasks] = useState<GreenhouseTaskItem[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [result, setResult] = useState<FoodProductionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNewTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    setTasks([]);
    setResult(null);
    setSelectedTasks([]);

    try {
      const game = await gameApi.newFoodProductionGame();
      setTasks(game.available_tasks);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to generate greenhouse tasks",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNewTasks();
  }, [loadNewTasks]);

  const toggleTask = (name: string) => {
    setError(null);
    setSelectedTasks((previous) =>
      previous.includes(name)
        ? previous.filter((task) => task !== name)
        : [...previous, name],
    );
  };

  const chosenTasks = tasks.filter((task) => selectedTasks.includes(task.name));
  const estimatedHpGain = chosenTasks.reduce(
    (sum, task) => sum + task.hp_gain,
    0,
  );
  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await gameApi.submitFoodProduction(
        tasks,
        selectedTasks,
        currentHp,
        DAILY_HP_DRAIN,
        POWER_BUS_LIMIT_KW,
      );
      setResult(response);
      onPowerConsumed(response.power_consumed);
      onHealthChanged(response.final_hp);
      const outcome: MissionOutcome =
        response.survived_day && response.status === "OPTIMAL"
          ? "optimal"
          : response.survived_day && response.status === "SUBOPTIMAL"
            ? "suboptimal"
            : "invalid";

      onCompleted?.(outcome);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Schedule simulation failed",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
        <div>
          <span className="text-emerald-400 font-bold">OBJECTIVE:</span> Select
          non-overlapping tasks to maximize Crew HP (Weighted Activity
          Selection).
        </div>
        <div className="text-[11px] font-mono text-right">
          Bus Limit:{" "}
          <span className="text-amber-400 font-bold">
            {POWER_BUS_LIMIT_KW.toFixed(1)} kW
          </span>
          <span className="mx-1">|</span> Daily Drain:{" "}
          <span className="text-rose-400 font-bold">-{DAILY_HP_DRAIN} HP</span>
          <span className="mx-1">|</span> HP Yield:{" "}
          <span className="text-emerald-400">2–4 / hour</span>
          <span className="mx-1">|</span> Power:{" "}
          <span className="text-amber-400">1% / 10 kWh</span>
        </div>
      </div>

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

        <div className="space-y-1.5 pt-1">
          {tasks.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              {loading
                ? "GENERATING GREENHOUSE TASKS..."
                : "NO TASKS AVAILABLE"}
            </div>
          ) : (
            tasks.map((task) => {
              const isSelected = selectedTasks.includes(task.name);
              const left = (task.start_hour / 24) * 100;
              const width = ((task.end_hour - task.start_hour) / 24) * 100;

              return (
                <div
                  key={task.name}
                  onClick={() => !loading && !result && toggleTask(task.name)}
                  className={`relative h-9 rounded flex items-center px-2 border ${
                    result ? "cursor-default" : "cursor-pointer"
                  } ${
                    isSelected
                      ? "bg-emerald-950/40 border-emerald-500/80"
                      : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div
                    className={`absolute top-1 bottom-1 rounded ${isSelected ? "bg-emerald-500/25 border-l-2 border-r-2 border-emerald-400" : "bg-slate-800/40"}`}
                    style={{ left: `${left}%`, width: `${width}%` }}
                  />
                  <div className="relative z-10 flex items-center justify-between w-full text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                        className="accent-emerald-400 pointer-events-none"
                      />
                      <span
                        className={`font-semibold truncate ${isSelected ? "text-emerald-200" : "text-slate-300"}`}
                      >
                        {task.name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
                        ({task.start_hour}:00 - {task.end_hour}:00)
                      </span>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-[11px] whitespace-nowrap">
                      <span className="text-amber-400">
                        {task.power_kw.toFixed(1)} kW
                      </span>
                      <span className="text-emerald-400 font-bold">
                        +{task.hp_gain} HP
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="flex flex-wrap justify-between items-center gap-2 bg-slate-900/60 p-2.5 rounded border border-slate-800">
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
          <div>
            <span className="text-slate-500">TASKS: </span>
            <span className="text-cyan-400 font-bold">
              {selectedTasks.length}
            </span>
          </div>
          <div>
            <span className="text-slate-500">EST. HP: </span>
            <span className="text-emerald-400 font-bold">
              +{estimatedHpGain}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => void loadNewTasks()}
            disabled={loading}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold rounded border border-slate-600 disabled:opacity-40"
          >
            NEW TASKS
          </button>
          <button
            onClick={() => setSelectedTasks([])}
            disabled={loading || !!result}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded border border-slate-600 disabled:opacity-40"
          >
            CLEAR
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || selectedTasks.length === 0 || !!result}
            className="px-4 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400 text-emerald-300 text-xs font-bold rounded tracking-wider disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "SIMULATING..." : "SUBMIT SCHEDULE"}
          </button>
        </div>
      </div>

      {error && (
        <div className="text-xs text-rose-400 p-2 border border-rose-500/40 bg-rose-950/40 rounded">
          {error}
        </div>
      )}

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
            <span className="text-amber-400 font-mono font-bold">
              POWER USED: -{result.power_consumed.toFixed(2)}%
            </span>
          </div>
          <p className="text-slate-200">{result.message}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-slate-800 text-[11px] font-mono">
            <div>
              <span className="text-slate-500 block">Crew Final HP:</span>
              <span
                className={`font-bold ${result.final_hp > 50 ? "text-emerald-400" : "text-amber-400"}`}
              >
                {result.final_hp}%{" "}
                {result.survived_day ? "(SURVIVED)" : "(CASUALTY)"}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Food HP Gained:</span>
              <span className="text-emerald-400 font-bold">
                +{result.player_hp_gain} HP
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Optimal Max Gain:</span>
              <span className="text-cyan-400 font-bold">
                +{result.optimal.max_hp_gain} HP
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Peak Power Draw:</span>
              <span className="text-amber-400 font-bold">
                {result.peak_power_kw.toFixed(1)} /{" "}
                {result.bus_limit_kw.toFixed(1)} kW
              </span>
            </div>
          </div>
          <div className="pt-1 text-[11px] text-slate-400 font-mono">
            Best Schedule:{" "}
            <span className="text-slate-200 font-semibold">
              {result.optimal.tasks.join(" → ")}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
