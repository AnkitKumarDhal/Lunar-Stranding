import { useCallback, useEffect, useState } from "react";
import {
  gameApi,
  type MiningEdge,
  type MiningRoverResponse,
  type SampleRetrievalResponse,
  type SampleItem,
} from "@/services/api";
import type { MissionOutcome } from "@/types/game";

const NODE_COORDS: Record<string, { x: number; y: number; label: string }> = {
  Base: { x: 60, y: 150, label: "BASE" },
  Crater_Site: { x: 190, y: 75, label: "CRATER SITE" },
  Anomaly_Zone: { x: 190, y: 225, label: "ANOMALY ZONE" },
  Deep_Shaft: { x: 320, y: 75, label: "DEEP SHAFT" },
  Lava_Tube: { x: 320, y: 225, label: "LAVA TUBE" },
  Excavation: { x: 440, y: 150, label: "EXCAVATION" },
};

interface MiningRoverGameProps {
  onPowerChange: (amount: number) => void;
  initialTab?: "navigation" | "cargo";
  lockedTab?: boolean;
  onNavigationComplete?: (outcome: MissionOutcome) => void;
  onCargoComplete?: (outcome: MissionOutcome) => void;
}

export const MiningRoverGame = ({
  onPowerChange,
  initialTab = "navigation",
  lockedTab = false,
  onNavigationComplete,
  onCargoComplete,
}: MiningRoverGameProps) => {
  const [activeTab, setActiveTab] = useState<"navigation" | "cargo">(
    initialTab,
  );
  // Navigation state
  const [miningEdges, setMiningEdges] = useState<MiningEdge[]>([]);
  const [startNode, setStartNode] = useState("Base");
  const [targetNode, setTargetNode] = useState("Excavation");
  const [navPath, setNavPath] = useState<string[]>(["Base"]);
  const [navResult, setNavResult] = useState<MiningRoverResponse | null>(null);
  const [navLoading, setNavLoading] = useState(true);
  const [navError, setNavError] = useState<string | null>(null);

  // Cargo knapsack state
  const [samples, setSamples] = useState<SampleItem[]>([]);
  const [selectedSampleIds, setSelectedSampleIds] = useState<string[]>([]);
  const [roverCapacity, setRoverCapacity] = useState(15);
  const [cargoResult, setCargoResult] =
    useState<SampleRetrievalResponse | null>(null);
  const [cargoLoading, setCargoLoading] = useState(true);
  const [cargoError, setCargoError] = useState<string | null>(null);

  const loadNewMiningGame = useCallback(async () => {
    setNavLoading(true);
    setNavError(null);
    setNavResult(null);
    try {
      const game = await gameApi.newMiningRoverGame();
      setMiningEdges(game.edges);
      setStartNode(game.start_node);
      setTargetNode(game.target_node);
      setNavPath([game.start_node]);
    } catch (err: unknown) {
      setNavError(
        err instanceof Error ? err.message : "Failed to generate terrain",
      );
    } finally {
      setNavLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNewMiningGame();
  }, [loadNewMiningGame]);

  const loadNewSamples = useCallback(async () => {
    setCargoLoading(true);
    setCargoError(null);
    setSamples([]);
    setSelectedSampleIds([]);
    setCargoResult(null);

    try {
      const game = await gameApi.newSampleRetrievalGame();
      setSamples(game.available_samples);
      setRoverCapacity(game.bag_capacity);
    } catch (err: unknown) {
      setCargoError(
        err instanceof Error ? err.message : "Failed to generate sample field",
      );
    } finally {
      setCargoLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNewSamples();
  }, [loadNewSamples]);

  // --- Navigation Handlers ---
  const currentNavHead = navPath[navPath.length - 1];

  const handleNavNodeClick = (node: string) => {
    // Only allow directed forward edge from current head
    const edgeExists = miningEdges.some(
      ([u, v]) => u === currentNavHead && v === node,
    );
    if (edgeExists) {
      setNavPath((prev) => [...prev, node]);
    }
  };

  const handleNavReset = () => {
    setNavPath([startNode]);
    setNavResult(null);
    setNavError(null);
  };

  const handleNavSubmit = async () => {
    setNavLoading(true);
    setNavError(null);
    try {
      const res = await gameApi.submitMiningRover(
        miningEdges,
        navPath,
        startNode,
        targetNode,
      );
      setNavResult(res);
      onPowerChange(res.power_change);

      if (res.status === "OPTIMAL") {
        onNavigationComplete?.("optimal");
      } else if (res.status === "SUBOPTIMAL") {
        onNavigationComplete?.("suboptimal");
      }
    } catch (err: unknown) {
      setNavError(
        err instanceof Error ? err.message : "Navigation calculation failed",
      );
    } finally {
      setNavLoading(false);
    }
  };

  // --- Cargo handlers ---
  const toggleSample = (id: string) => {
    if (cargoResult || cargoLoading) return;
    setCargoError(null);
    setSelectedSampleIds((previous) =>
      previous.includes(id)
        ? previous.filter((sampleId) => sampleId !== id)
        : [...previous, id],
    );
  };

  const handleCargoReset = () => {
    setSelectedSampleIds([]);
    setCargoError(null);
  };

  const handleCargoSubmit = async () => {
    if (cargoLoading || cargoResult || !samples.length) return;

    setCargoLoading(true);
    setCargoError(null);
    try {
      const response = await gameApi.submitSampleRetrieval(
        samples,
        selectedSampleIds,
        roverCapacity,
      );
      setCargoResult(response);
      onPowerChange(response.power_gained);

      const outcome: MissionOutcome =
        response.status === "OPTIMAL_LOADOUT"
          ? "optimal"
          : response.status === "SUBOPTIMAL_LOADOUT"
            ? "suboptimal"
            : "invalid";

      onCargoComplete?.(outcome);
    } catch (err: unknown) {
      setCargoError(
        err instanceof Error ? err.message : "Loadout validation failed",
      );
    } finally {
      setCargoLoading(false);
    }
  };

  const currentWeight = samples
    .filter((sample) => selectedSampleIds.includes(sample.id))
    .reduce((sum, sample) => sum + sample.weight, 0);

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Sub-Facility Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("navigation")}
          disabled={lockedTab}
          className={`px-3 py-1.5 rounded text-xs font-bold tracking-wider transition-colors cursor-pointer ${
            activeTab === "navigation"
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
              : "bg-slate-800 text-slate-400 hover:text-slate-200 border border-transparent"
          }`}
        >
          1. NAVIGATION (BELLMAN-FORD)
        </button>
        <button
          onClick={() => setActiveTab("cargo")}
          disabled={lockedTab}
          className={`px-3 py-1.5 rounded text-xs font-bold tracking-wider transition-colors cursor-pointer ${
            activeTab === "cargo"
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
              : "bg-slate-800 text-slate-400 hover:text-slate-200 border border-transparent"
          }`}
        >
          2. SAMPLE RETRIEVAL (0/1 KNAPSACK)
        </button>
      </div>

      {/* TAB 1: BELLMAN-FORD NAVIGATION */}
      {activeTab === "navigation" && (
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
            <div>
              <span className="text-amber-400 font-bold">OBJECTIVE:</span> Find
              the lowest-energy route to {targetNode}. Negative edges regenerate
              power.
            </div>
            <div className="shrink-0 text-[11px] text-emerald-400 font-mono">
              Green = regeneration
            </div>
          </div>

          {/* Directed Graph Canvas */}
          <div className="min-h-[270px] bg-slate-900/90 border border-slate-700/80 rounded-lg p-3 relative flex items-center justify-center">
            <svg viewBox="0 0 500 300" className="w-full h-full select-none">
              <defs>
                <marker
                  id="arrow-amber"
                  viewBox="0 0 10 10"
                  refX="18"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#f59e0b" />
                </marker>
                <marker
                  id="arrow-slate"
                  viewBox="0 0 10 10"
                  refX="18"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#475569" />
                </marker>
                <marker
                  id="arrow-emerald"
                  viewBox="0 0 10 10"
                  refX="18"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#10b981" />
                </marker>
              </defs>

              {/* Render Directed Edges */}
              {miningEdges.map(([u, v, w], idx) => {
                const p1 = NODE_COORDS[u];
                const p2 = NODE_COORDS[v];
                const isTraversed = navPath.some(
                  (step, i) =>
                    i < navPath.length - 1 &&
                    step === u &&
                    navPath[i + 1] === v,
                );
                const isNegative = w < 0;

                const mx = (p1.x + p2.x) / 2;
                const my = (p1.y + p2.y) / 2;

                const strokeColor = isTraversed
                  ? "#f59e0b"
                  : isNegative
                    ? "#10b981"
                    : "#475569";
                const markerId = isTraversed
                  ? "url(#arrow-amber)"
                  : isNegative
                    ? "url(#arrow-emerald)"
                    : "url(#arrow-slate)";

                return (
                  <g key={`edge-${idx}`}>
                    <line
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke={strokeColor}
                      strokeWidth={isTraversed ? "3" : isNegative ? "2" : "1.5"}
                      strokeDasharray={
                        isTraversed ? "none" : isNegative ? "2" : "4"
                      }
                      markerEnd={markerId}
                    />
                    <rect
                      x={mx - 14}
                      y={my - 8}
                      width="28"
                      height="15"
                      fill="#0f172a"
                      stroke={isNegative ? "#10b981" : "#334155"}
                      strokeWidth="1"
                      rx="3"
                    />
                    <text
                      x={mx}
                      y={my + 3}
                      textAnchor="middle"
                      fill={
                        isTraversed
                          ? "#f59e0b"
                          : isNegative
                            ? "#34d399"
                            : "#94a3b8"
                      }
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {w > 0 ? `+${w}` : `${w}`}
                    </text>
                  </g>
                );
              })}

              {/* Render Nodes */}
              {Object.entries(NODE_COORDS).map(([key, node]) => {
                const isHead = currentNavHead === key;
                const isVisited = navPath.includes(key);
                const isNeighbor = miningEdges.some(
                  ([u, v]) => u === currentNavHead && v === key,
                );

                return (
                  <g
                    key={key}
                    transform={`translate(${node.x}, ${node.y})`}
                    onClick={() => handleNavNodeClick(key)}
                    className={isNeighbor ? "cursor-pointer" : "cursor-default"}
                  >
                    <circle
                      r={isHead ? "16" : "13"}
                      fill={isHead ? "#78350f" : "#0f172a"}
                      stroke={
                        isHead
                          ? "#f59e0b"
                          : isVisited
                            ? "#fbbf24"
                            : isNeighbor
                              ? "#38bdf8"
                              : "#475569"
                      }
                      strokeWidth={isHead ? "3" : isVisited ? "2.5" : "1.5"}
                    />
                    {isNeighbor && (
                      <circle
                        r="19"
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="1"
                        strokeDasharray="2"
                        className="animate-pulse"
                      />
                    )}
                    <text
                      y="26"
                      textAnchor="middle"
                      fill={isVisited ? "#f1f5f9" : "#94a3b8"}
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {node.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Navigation Controls */}
          <div className="flex flex-wrap justify-between items-center gap-2 bg-slate-900/60 p-2.5 rounded border border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">
                Route:
              </span>
              <span className="text-xs text-amber-400 font-bold font-mono">
                {navPath.join(" → ")}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleNavReset}
                disabled={navLoading || navResult !== null}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded border border-slate-600 transition-colors"
              >
                RESET
              </button>
              <button
                onClick={handleNavSubmit}
                disabled={
                  navLoading ||
                  navResult !== null ||
                  navPath[navPath.length - 1] !== targetNode
                }
                className="px-4 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400 text-amber-300 text-xs font-bold rounded tracking-wider disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {navLoading ? "COMPUTING..." : "SUBMIT MINING ROUTE"}
              </button>
              <button
                onClick={() => void loadNewMiningGame()}
                disabled={navLoading}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold rounded border border-cyan-500/50 disabled:opacity-40"
              >
                NEW TERRAIN
              </button>
            </div>
          </div>

          {navError && (
            <div className="text-xs text-rose-400 p-2 border border-rose-500/40 bg-rose-950/40 rounded">
              {navError}
            </div>
          )}

          {navResult && (
            <div className="text-xs p-3 border border-slate-700 bg-slate-900/95 rounded space-y-2">
              <div className="flex items-center justify-between">
                <span
                  className={`font-bold px-2 py-0.5 rounded text-[10px] tracking-wider ${navResult.status === "OPTIMAL" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" : "bg-amber-500/20 text-amber-400 border border-amber-500/40"}`}
                >
                  STATUS: {navResult.status}
                </span>
                <span className="font-mono text-cyan-300">
                  {navResult.power_change > 0
                    ? `Power +${navResult.power_change} regenerated`
                    : navResult.power_change < 0
                      ? `Power ${navResult.power_change} consumed`
                      : "No power change"}
                </span>
              </div>
              <p className="text-slate-200">{navResult.message}</p>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-[11px] font-mono">
                <div>
                  <span className="text-slate-500 block">Route Energy:</span>
                  <span className="text-amber-400 font-bold">
                    {navResult.player_cost} kWh
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Optimal Energy:</span>
                  <span className="text-emerald-400 font-bold">
                    {navResult.optimal_cost !== null
                      ? `${navResult.optimal_cost} kWh`
                      : "N/A"}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block">Optimal Path:</span>
                  <span className="text-slate-300 font-bold">
                    {navResult.optimal_path.length
                      ? navResult.optimal_path.join(" → ")
                      : "N/A"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SAMPLE RETRIEVAL (KNAPSACK) */}
      {activeTab === "cargo" && (
        <div className="flex flex-col space-y-4">
          <div className="text-xs text-slate-400">
            <span className="text-cyan-400 font-bold">OBJECTIVE:</span> Choose
            samples within the {roverCapacity} kg cargo limit to recover as much
            power as possible (0/1 Knapsack).
          </div>

          <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">
                CARGO LOAD:{" "}
                <span
                  className={
                    currentWeight > roverCapacity
                      ? "text-rose-400 font-bold"
                      : "text-amber-400 font-bold"
                  }
                >
                  {currentWeight} / {roverCapacity} kg
                </span>
              </span>
              <span className="text-slate-400">
                {selectedSampleIds.length} SAMPLES SELECTED
              </span>
            </div>
            <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-700">
              <div
                className={`h-full transition-all ${currentWeight > roverCapacity ? "bg-rose-500" : "bg-cyan-500"}`}
                style={{
                  width: `${Math.min(100, (currentWeight / roverCapacity) * 100)}%`,
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {samples.map((sample) => {
              const selected = selectedSampleIds.includes(sample.id);
              return (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => toggleSample(sample.id)}
                  disabled={cargoLoading || Boolean(cargoResult)}
                  className={`p-3 rounded-lg border text-left transition-colors disabled:cursor-default ${
                    selected
                      ? "bg-cyan-950/40 border-cyan-500/80"
                      : "bg-slate-900/80 border-slate-700 hover:border-cyan-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-slate-100">
                      {sample.name}
                    </span>
                    <span
                      className={selected ? "text-cyan-300" : "text-slate-600"}
                    >
                      {selected ? "✓" : "○"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2 mt-2 text-[11px] font-mono">
                    <span className="text-slate-400">
                      Mass:{" "}
                      <span className="text-amber-300">{sample.weight} kg</span>
                    </span>
                    <span className="text-slate-400">
                      Power value:{" "}
                      <span className="text-emerald-400">
                        +{sample.power_value}
                      </span>
                    </span>
                  </div>
                </button>
              );
            })}
            {cargoLoading && samples.length === 0 && (
              <div className="col-span-full py-8 text-center text-xs text-slate-400">
                GENERATING SAMPLE FIELD...
              </div>
            )}
          </div>

          <div className="flex flex-wrap justify-between items-center gap-2 bg-slate-900/60 p-2.5 rounded border border-slate-800">
            <span className="text-xs text-slate-400 font-mono">
              Selected mass:{" "}
              <span className="text-cyan-400 font-bold">
                {currentWeight} kg
              </span>
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCargoReset}
                disabled={
                  cargoLoading ||
                  Boolean(cargoResult) ||
                  selectedSampleIds.length === 0
                }
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded border border-slate-600 disabled:opacity-40"
              >
                RESET
              </button>
              <button
                onClick={() => void loadNewSamples()}
                disabled={cargoLoading}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold rounded border border-cyan-700 disabled:opacity-40"
              >
                NEW SAMPLE FIELD
              </button>
              <button
                onClick={handleCargoSubmit}
                disabled={
                  cargoLoading ||
                  Boolean(cargoResult) ||
                  selectedSampleIds.length === 0
                }
                className="px-4 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400 text-cyan-300 text-xs font-bold rounded tracking-wider disabled:opacity-40"
              >
                {cargoLoading ? "LOADING..." : "RECOVER POWER"}
              </button>
            </div>
          </div>

          {cargoError && (
            <div className="text-xs text-rose-400 p-2 border border-rose-500/40 bg-rose-950/40 rounded">
              {cargoError}
            </div>
          )}

          {cargoResult && (
            <div className="text-xs p-3 border border-slate-700 bg-slate-900/95 rounded space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className={`font-bold px-2 py-0.5 rounded text-[10px] tracking-wider ${
                    cargoResult.status === "OPTIMAL_LOADOUT"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                      : cargoResult.status === "PAYLOAD_OVERWEIGHT"
                        ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                        : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                  }`}
                >
                  STATUS: {cargoResult.status}
                </span>
                <span className="text-emerald-400 font-mono font-bold">
                  POWER RECOVERED: +{cargoResult.power_gained.toFixed(2)}
                </span>
              </div>
              <p className="text-slate-200">{cargoResult.message}</p>
              <div className="flex flex-wrap gap-x-8 gap-y-1 pt-2 border-t border-slate-800 text-[11px] font-mono">
                <span className="text-slate-400">
                  Cargo:{" "}
                  <span className="text-amber-300">
                    {cargoResult.player_total_weight}/{cargoResult.bag_capacity}{" "}
                    kg
                  </span>
                </span>
                <span className="text-slate-400">
                  Optimal cargo:{" "}
                  <span className="text-cyan-300">
                    {cargoResult.optimal_total_weight} kg
                  </span>
                </span>
                <span className="text-slate-400">
                  Maximum recovery:{" "}
                  <span className="text-emerald-300">
                    +{cargoResult.max_power_gain}
                  </span>
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
