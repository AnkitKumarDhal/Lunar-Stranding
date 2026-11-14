import { useState } from "react";
import { gameApi } from "../services/api";
import type { FoodProductionResult, GreenhouseActivity } from "../types/game";

const CURRENT_HP = 80;

const ACTIVITIES: GreenhouseActivity[] = [
  {
    name: "UV Water Sterilization",
    start_hour: 0,
    end_hour: 4,
    power_kw: 3.8,
    hp_gain: 10,
  },
  {
    name: "Red/Blue LED Boost",
    start_hour: 2,
    end_hour: 7,
    power_kw: 4.8,
    hp_gain: 18,
  },
  {
    name: "Aeroponic Root Mist",
    start_hour: 6,
    end_hour: 10,
    power_kw: 3.5,
    hp_gain: 12,
  },
  {
    name: "Algae Tank Agitation",
    start_hour: 8,
    end_hour: 14,
    power_kw: 4.2,
    hp_gain: 20,
  },
  {
    name: "Thermal Canopy Heating",
    start_hour: 12,
    end_hour: 18,
    power_kw: 4.9,
    hp_gain: 15,
  },
  {
    name: "Microgreen Harvest Cycle",
    start_hour: 16,
    end_hour: 22,
    power_kw: 4.0,
    hp_gain: 18,
  },
];

const formatHour = (hour: number) => `${String(hour).padStart(2, "0")}:00`;

export const FoodProductionGame = () => {
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [result, setResult] = useState<FoodProductionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedActivities = ACTIVITIES.filter((activity) =>
    selectedTasks.includes(activity.name),
  );

  const selectedHpGain = selectedActivities.reduce(
    (total, activity) => total + activity.hp_gain,
    0,
  );

  const handleToggle = (name: string) => {
    setSelectedTasks((current) =>
      current.includes(name)
        ? current.filter((task) => task !== name)
        : [...current, name],
    );

    setResult(null);
    setError(null);
  };

  const handleSubmit = async () => {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await gameApi.submitFoodProduction(
        ACTIVITIES,
        selectedTasks,
        CURRENT_HP,
      );

      setResult(response);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to evaluate the greenhouse schedule.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedTasks([]);
    setResult(null);
    setError(null);
  };

  return (
    <div className="flex h-full min-h-[380px] flex-col gap-4">
      {/* HEADER */}

      <div className="flex items-center justify-between text-[10px] font-mono tracking-wider text-slate-400">
        <span>GREENHOUSE // ACTIVITY SCHEDULING</span>
        <span className="text-emerald-300">DYNAMIC PROGRAMMING</span>
      </div>

      {/* CREW STATUS */}

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded border border-slate-700 bg-slate-900 p-3">
          <div className="text-[10px] text-slate-400">CURRENT CREW HP</div>

          <div className="mt-1 text-xl font-bold text-red-400">
            {CURRENT_HP}/100
          </div>
        </div>

        <div className="rounded border border-slate-700 bg-slate-900 p-3">
          <div className="text-[10px] text-slate-400">SELECTED HP GAIN</div>

          <div className="mt-1 text-xl font-bold text-emerald-300">
            +{selectedHpGain} HP
          </div>
        </div>
      </div>

      {/* AVAILABLE ACTIVITIES */}

      <div className="space-y-2">
        <div className="flex items-center justify-between text-[10px] font-mono tracking-wider text-slate-400">
          <span>AVAILABLE ACTIVITIES</span>
          <span>POWER BUS LIMIT: 5.0 KW</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {ACTIVITIES.map((activity) => {
            const selected = selectedTasks.includes(activity.name);

            const duration = activity.end_hour - activity.start_hour;

            return (
              <button
                key={activity.name}
                type="button"
                aria-pressed={selected}
                onClick={() => handleToggle(activity.name)}
                disabled={loading}
                className={`rounded border p-3 text-left transition-colors disabled:opacity-50 ${
                  selected
                    ? "border-emerald-400 bg-emerald-950/40"
                    : "border-slate-700 bg-slate-900 hover:border-slate-500"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-400">
                    {formatHour(activity.start_hour)}
                  </span>

                  <span
                    className={selected ? "text-emerald-300" : "text-slate-500"}
                  >
                    {selected ? "✓ SELECTED" : "+ SELECT"}
                  </span>
                </div>

                <div className="mt-2 text-xs font-bold text-slate-100">
                  {activity.name}
                </div>

                <div className="mt-2 h-1.5 overflow-hidden rounded bg-slate-700">
                  <div
                    className="h-full rounded bg-emerald-400"
                    style={{
                      width: `${duration * (100 / 24)}%`,
                      marginLeft: `${activity.start_hour * (100 / 24)}%`,
                    }}
                  />
                </div>

                <div className="mt-2 flex flex-wrap justify-between gap-1 text-[10px] text-slate-400">
                  <span>
                    {formatHour(activity.start_hour)} -{" "}
                    {formatHour(activity.end_hour)}
                  </span>

                  <span>{activity.power_kw} KW</span>
                </div>

                <div className="mt-1 text-[10px] text-emerald-300">
                  +{activity.hp_gain} HP
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* CONTROLS */}

      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-mono text-slate-400">
          {selectedTasks.length} ACTIVITIES SELECTED
        </span>

        <div className="flex gap-2">
          <button
            onClick={handleReset}
            disabled={loading}
            className="rounded border border-slate-600 px-3 py-1.5 text-[11px] text-slate-200 disabled:opacity-40"
          >
            RESET
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="rounded border border-emerald-400 bg-emerald-500/20 px-3 py-1.5 text-[11px] font-bold text-emerald-300 disabled:opacity-40"
          >
            {loading ? "SIMULATING..." : "RUN DAILY SCHEDULE"}
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded border border-red-700 bg-red-950/40 p-2 text-xs text-red-300"
        >
          {error}
        </div>
      )}

      {/* BACKEND RESULT */}

      {result && (
        <div className="space-y-2 rounded border border-slate-700 bg-slate-900 p-3 text-xs text-slate-200">
          <div
            className={`font-bold ${
              result.status === "OK" ? "text-emerald-300" : "text-red-400"
            }`}
          >
            STATUS: {result.status}
          </div>

          <p>{result.message}</p>

          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
            <span>
              HP gained:{" "}
              <strong className="text-slate-100">
                {result.hp_gained ?? 0}
              </strong>
            </span>

            <span>
              Daily drain:{" "}
              <strong className="text-slate-100">
                {result.daily_drain ?? 30}
              </strong>
            </span>

            <span>
              New crew HP:{" "}
              <strong className="text-slate-100">{result.new_hp}/100</strong>
            </span>

            <span>
              Survival:{" "}
              <strong
                className={
                  result.survived_day ? "text-emerald-300" : "text-red-400"
                }
              >
                {result.survived_day ? "STABLE" : "FAILED"}
              </strong>
            </span>
          </div>

          {result.optimal_plan && (
            <div className="border-t border-slate-700 pt-2">
              <div className="text-[10px] text-slate-400">
                BACKEND OPTIMAL SCHEDULE
              </div>

              <div className="mt-1 space-y-1 text-emerald-300">
                {result.optimal_plan.map((task) => (
                  <div key={task}>✓ {task}</div>
                ))}
              </div>

              <div className="mt-2 text-[10px] text-slate-400">
                Maximum possible HP gain: {result.max_possible_hp_gain ?? 0}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
