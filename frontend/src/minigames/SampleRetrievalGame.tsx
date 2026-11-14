import { useState } from "react";
import { gameApi } from "../services/api";
import { MinigameLayout } from "../components/MinigameLayout";
import type { SampleItem, SampleRetrievalResult } from "../types/game";

const BAG_CAPACITY = 15;

const SAMPLES: SampleItem[] = [
  { id: "S1", name: "Water Ice Core", weight: 5, value: 30 },
  { id: "S2", name: "Helium-3 Regolith", weight: 8, value: 42 },
  { id: "S3", name: "Rare Earth Ore", weight: 4, value: 24 },
  { id: "S4", name: "Ancient Basalt", weight: 3, value: 14 },
  { id: "S5", name: "Titanium Fragment", weight: 6, value: 28 },
  { id: "S6", name: "Solar Glass Sample", weight: 2, value: 11 },
];

export const SampleRetrievalGame = () => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [result, setResult] = useState<SampleRetrievalResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedSamples = SAMPLES.filter((sample) =>
    selectedIds.includes(sample.id),
  );

  const selectedWeight = selectedSamples.reduce(
    (total, sample) => total + sample.weight,
    0,
  );

  const selectedValue = selectedSamples.reduce(
    (total, sample) => total + sample.value,
    0,
  );

  const isOverweight = selectedWeight > BAG_CAPACITY;

  const handleToggle = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((sampleId) => sampleId !== id)
        : [...current, id],
    );

    setResult(null);
    setError(null);
  };

  const handleSubmit = async () => {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await gameApi.submitSampleRetrieval(
        SAMPLES,
        selectedIds,
        BAG_CAPACITY,
      );

      setResult(response);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to evaluate the cargo loadout.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedIds([]);
    setResult(null);
    setError(null);
  };

  const getSampleName = (id: string) =>
    SAMPLES.find((sample) => sample.id === id)?.name ?? id;

  return (
    <MinigameLayout
      title="MINING ROVER // SAMPLE COLLECTION"
      headerRight={<span className="text-amber-300">0/1 KNAPSACK</span>}
      controls={
        <>
          <span className="text-[10px] font-mono text-slate-400">
            {selectedIds.length} ITEMS SELECTED
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
              className="rounded border border-amber-400 bg-amber-500/20 px-3 py-1.5 text-[11px] font-bold text-amber-300 disabled:opacity-40"
            >
              {loading ? "ANALYSING..." : "EVALUATE LOADOUT"}
            </button>
          </div>
        </>
      }
      error={error}
      result={
        result && (
          <>
            <div
              className={`font-bold ${
                result.is_overweight ? "text-red-400" : "text-cyan-300"
              }`}
            >
              STATUS: {result.status}
            </div>

            <p>{result.message}</p>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
              <span>
                Your value:{" "}
                <strong className="text-slate-100">
                  {result.player_total_value}
                </strong>
              </span>

              <span>
                Optimal value:{" "}
                <strong className="text-slate-100">
                  {result.optimal_max_value}
                </strong>
              </span>

              <span>
                Your weight:{" "}
                <strong className="text-slate-100">
                  {result.player_total_weight} KG
                </strong>
              </span>

              <span>
                Efficiency:{" "}
                <strong className="text-slate-100">
                  {result.efficiency_percentage}%
                </strong>
              </span>
            </div>

            <div className="border-t border-slate-700 pt-2">
              <div className="text-[10px] text-slate-400">
                REWARD MULTIPLIER
              </div>

              <div className="text-lg font-bold text-amber-300">
                {result.reward_multiplier.toFixed(1)}x
              </div>
            </div>

            <div className="border-t border-slate-700 pt-2">
              <div className="text-[10px] text-slate-400">
                BACKEND CALCULATED OPTIMAL LOADOUT
              </div>

              <div className="mt-1 text-cyan-300">
                {result.optimal.sample_ids.map(getSampleName).join(" · ") ||
                  "NO SAMPLES"}
              </div>

              <div className="mt-1 text-[10px] text-slate-400">
                {result.optimal_total_weight} KG
                {" · "}
                {result.optimal_max_value} PTS
              </div>
            </div>
          </>
        )
      }
    >
      {/* CARGO STATUS */}

      <div className="space-y-2 rounded border border-slate-700 bg-slate-900 p-3">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-300">CARGO CAPACITY</span>

          <span className={isOverweight ? "text-red-400" : "text-cyan-300"}>
            {selectedWeight} / {BAG_CAPACITY} KG
          </span>
        </div>

        <div className="h-2 overflow-hidden rounded bg-slate-700">
          <div
            className={`h-full transition-all ${
              isOverweight ? "bg-red-500" : "bg-cyan-400"
            }`}
            style={{
              width: `${Math.min((selectedWeight / BAG_CAPACITY) * 100, 100)}%`,
            }}
          />
        </div>

        <div className="flex justify-between text-[10px] text-slate-400">
          <span>Selected: {selectedIds.length} samples</span>
          <span>Potential value: {selectedValue} PTS</span>
        </div>

        {isOverweight && (
          <p className="text-[10px] text-red-400">
            CARGO OVERWEIGHT // REMOVE SOME SAMPLES
          </p>
        )}
      </div>

      {/* AVAILABLE SAMPLES */}

      <div className="space-y-2">
        <div className="text-[10px] font-mono tracking-wider text-slate-400">
          AVAILABLE LUNAR SAMPLES
        </div>

        <div className="grid grid-cols-2 gap-2">
          {SAMPLES.map((sample) => {
            const selected = selectedIds.includes(sample.id);

            return (
              <button
                key={sample.id}
                type="button"
                aria-pressed={selected}
                onClick={() => handleToggle(sample.id)}
                disabled={loading}
                className={`rounded border p-3 text-left transition-colors disabled:opacity-50 ${
                  selected
                    ? "border-cyan-400 bg-cyan-950/40"
                    : "border-slate-700 bg-slate-900 hover:border-slate-500"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono text-slate-400">
                    {sample.id}
                  </span>

                  <span
                    className={selected ? "text-cyan-300" : "text-slate-500"}
                  >
                    {selected ? "✓ SELECTED" : "+ SELECT"}
                  </span>
                </div>

                <div className="mt-2 text-xs font-bold text-slate-100">
                  {sample.name}
                </div>

                <div className="mt-2 flex justify-between text-[10px] text-slate-400">
                  <span>{sample.weight} KG</span>
                  <span className="text-amber-300">{sample.value} PTS</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </MinigameLayout>
  );
};
