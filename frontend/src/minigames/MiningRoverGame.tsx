// frontend/src/minigames/MiningRoverGame.tsx
import { useState } from "react";
import {
  gameApi,
  type MiningRoverResponse,
  type SampleRetrievalResponse,
  type SampleItem,
} from "@/services/api";

// --- Bellman-Ford Directed Graph Definition ---
const MINING_EDGES: [string, string, number][] = [
  ["Base", "Crater_Site", 6],
  ["Base", "Anomaly_Zone", 7],
  ["Crater_Site", "Deep_Shaft", 8],
  ["Crater_Site", "Anomaly_Zone", -4], // Gravitational assist (negative weight)
  ["Anomaly_Zone", "Lava_Tube", 9],
  ["Anomaly_Zone", "Deep_Shaft", -2], // Regenerative braking downhill
  ["Deep_Shaft", "Excavation", 5],
  ["Lava_Tube", "Excavation", 2],
];

const NODE_COORDS: Record<string, { x: number; y: number; label: string }> = {
  Base: { x: 60, y: 150, label: "BASE" },
  Crater_Site: { x: 190, y: 75, label: "CRATER SITE" },
  Anomaly_Zone: { x: 190, y: 225, label: "ANOMALY ZONE" },
  Deep_Shaft: { x: 320, y: 75, label: "DEEP SHAFT" },
  Lava_Tube: { x: 320, y: 225, label: "LAVA TUBE" },
  Excavation: { x: 440, y: 150, label: "EXCAVATION" },
};

// --- Sample Retrieval Items (0/1 Knapsack) ---
const INITIAL_SAMPLES: SampleItem[] = [
  { id: "s1", name: "Helium-3 Canister", weight: 2, value: 45 },
  { id: "s2", name: "Ilmenite Titanium Ore", weight: 4, value: 35 },
  { id: "s3", name: "Anorthosite Core", weight: 7, value: 60 },
  { id: "s4", name: "Volcanic Orange Glass", weight: 5, value: 40 },
  { id: "s5", name: "KREEP Basalt Specimen", weight: 6, value: 50 },
  { id: "s6", name: "Shocked Breccia", weight: 3, value: 25 },
];

export const MiningRoverGame = () => {
  const [activeTab, setActiveTab] = useState<"navigation" | "cargo">("navigation");

  // Navigation State
  const [navPath, setNavPath] = useState<string[]>(["Base"]);
  const [navResult, setNavResult] = useState<MiningRoverResponse | null>(null);
  const [navLoading, setNavLoading] = useState(false);
  const [navError, setNavError] = useState<string | null>(null);

  // Cargo Knapsack State
  const [selectedSampleIds, setSelectedSampleIds] = useState<string[]>([]);
  const [cargoResult, setCargoResult] = useState<SampleRetrievalResponse | null>(null);
  const [cargoLoading, setCargoLoading] = useState(false);
  const [cargoError, setCargoError] = useState<string | null>(null);

  const roverCapacity = 15;

  // --- Navigation Handlers ---
  const currentNavHead = navPath[navPath.length - 1];

  const handleNavNodeClick = (node: string) => {
    // Only allow directed forward edge from current head
    const edgeExists = MINING_EDGES.some(
      ([u, v]) => u === currentNavHead && v === node,
    );
    if (edgeExists) {
      setNavPath((prev) => [...prev, node]);
    }
  };

  const handleNavReset = () => {
    setNavPath(["Base"]);
    setNavResult(null);
    setNavError(null);
  };

  const handleNavSubmit = async () => {
    setNavLoading(true);
    setNavError(null);
    try {
      const res = await gameApi.submitMiningRover(
        MINING_EDGES,
        navPath,
        "Base",
        "Excavation",
      );
      setNavResult(res);
    } catch (err: unknown) {
      setNavError(err instanceof Error ? err.message : "Navigation calculation failed");
    } finally {
      setNavLoading(false);
    }
  };

  // --- Cargo Handlers ---
  const toggleSample = (id: string) => {
    setSelectedSampleIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const handleCargoReset = () => {
    setSelectedSampleIds([]);
    setCargoResult(null);
    setCargoError(null);
  };

  const handleCargoSubmit = async () => {
    setCargoLoading(true);
    setCargoError(null);
    try {
      const res = await gameApi.submitSampleRetrieval(
        INITIAL_SAMPLES,
        selectedSampleIds,
        roverCapacity,
      );
      setCargoResult(res);
    } catch (err: unknown) {
      setCargoError(err instanceof Error ? err.message : "Loadout validation failed");
    } finally {
      setCargoLoading(false);
    }
  };

  const currentWeight = INITIAL_SAMPLES.filter((s) =>
    selectedSampleIds.includes(s.id),
  ).reduce((sum, s) => sum + s.weight, 0);

  const currentValue = INITIAL_SAMPLES.filter((s) =>
    selectedSampleIds.includes(s.id),
  ).reduce((sum, s) => sum + s.value, 0);

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Sub-Facility Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("navigation")}
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
          <div className="flex items-center justify-between text-xs text-slate-400">
            <div>
              <span className="text-amber-400 font-bold">OBJECTIVE:</span> Navigate directed terrain to{" "}
              <span className="text-slate-200 font-bold">Excavation</span> utilizing gravitational assists (negative weights).
            </div>
            <div className="text-[11px] text-emerald-400 font-mono">
              Green Edges = Energy Regeneration
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
              {MINING_EDGES.map(([u, v, w], idx) => {
                const p1 = NODE_COORDS[u];
                const p2 = NODE_COORDS[v];
                const isTraversed = navPath.some(
                  (step, i) => i < navPath.length - 1 && step === u && navPath[i + 1] === v,
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
                      strokeDasharray={isTraversed ? "none" : isNegative ? "2" : "4"}
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
                      fill={isTraversed ? "#f59e0b" : isNegative ? "#34d399" : "#94a3b8"}
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
                const isNeighbor = MINING_EDGES.some(
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
                      stroke={isHead ? "#f59e0b" : isVisited ? "#fbbf24" : isNeighbor ? "#38bdf8" : "#475569"}
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
              <span className="text-[11px] text-slate-400 uppercase font-semibold">Route:</span>
              <span className="text-xs text-amber-400 font-bold font-mono">
                {navPath.join(" → ")}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleNavReset}
                disabled={navLoading}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded border border-slate-600 transition-colors"
              >
                RESET
              </button>
              <button
                onClick={handleNavSubmit}
                disabled={navLoading || navPath[navPath.length - 1] !== "Excavation"}
                className="px-4 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400 text-amber-300 text-xs font-bold rounded tracking-wider disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {navLoading ? "COMPUTING..." : "SUBMIT MINING ROUTE"}
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
                  className={`font-bold px-2 py-0.5 rounded text-[10px] tracking-wider ${
                    navResult.status === "OPTIMAL"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                      : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                  }`}
                >
                  STATUS: {navResult.status}
                </span>
                <span className="text-slate-400 font-mono">
                  Efficiency: <span className="text-cyan-400 font-bold">{navResult.efficiency_percentage}%</span>
                </span>
              </div>
              <p className="text-slate-200">{navResult.message}</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-[11px] font-mono">
                <div>
                  <span className="text-slate-500 block">Your Energy Cost:</span>
                  <span className="text-amber-400 font-bold">{navResult.player_cost} kWh</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Optimal Energy Cost:</span>
                  <span className="text-emerald-400 font-bold">
                    {navResult.optimal_cost !== null ? `${navResult.optimal_cost} kWh` : "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Optimal Path:</span>
                  <span className="text-slate-300 font-bold">
                    {navResult.optimal_path && navResult.optimal_path.length > 0
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
          <div className="flex items-center justify-between text-xs text-slate-400">
            <div>
              <span className="text-cyan-400 font-bold">OBJECTIVE:</span> Select high-value lunar samples to maximize points without exceeding the{" "}
              <span className="text-amber-400 font-bold">{roverCapacity} kg</span> rover payload capacity (0/1 Knapsack).
            </div>
          </div>

          {/* Capacity Progress Bar */}
          <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 flex flex-col space-y-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-slate-400">
                CARGO BAY LOAD:{" "}
                <span className={currentWeight > roverCapacity ? "text-rose-400 font-bold" : "text-amber-400 font-bold"}>
                  {currentWeight} kg / {roverCapacity} kg
                </span>
              </span>
              <span className="text-slate-400">
                TOTAL VALUE: <span className="text-emerald-400 font-bold">+{currentValue} pts</span>
              </span>
            </div>
            <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-700">
              <div
                className={`h-full transition-all duration-300 ${
                  currentWeight > roverCapacity ? "bg-rose-500" : "bg-cyan-500"
                }`}
                style={{ width: `${Math.min(100, (currentWeight / roverCapacity) * 100)}%` }}
              />
            </div>
          </div>

          {/* Sample Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {INITIAL_SAMPLES.map((sample) => {
              const selected = selectedSampleIds.includes(sample.id);
              return (
                <div
                  key={sample.id}
                  onClick={() => toggleSample(sample.id)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer select-none ${
                    selected
                      ? "bg-cyan-950/40 border-cyan-500/80 shadow-[0_0_12px_rgba(6,182,212,0.15)]"
                      : "bg-slate-900/80 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-bold text-slate-100">{sample.name}</span>
                    <input
                      type="checkbox"
                      checked={selected}
                      readOnly
                      className="accent-cyan-400 cursor-pointer pointer-events-none"
                    />
                  </div>
                  <div className="flex justify-between items-center mt-2 text-[11px] font-mono">
                    <span className="text-slate-400">Mass: <span className="text-amber-300">{sample.weight} kg</span></span>
                    <span className="text-slate-400">Value: <span className="text-emerald-400">+{sample.value} pts</span></span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cargo Controls */}
          <div className="flex justify-between items-center bg-slate-900/60 p-2.5 rounded border border-slate-800">
            <span className="text-xs text-slate-400 font-mono">
              Samples Selected: <span className="text-cyan-400 font-bold">{selectedSampleIds.length}</span>
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCargoReset}
                disabled={cargoLoading}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded border border-slate-600 transition-colors"
              >
                RESET
              </button>
              <button
                onClick={handleCargoSubmit}
                disabled={cargoLoading || selectedSampleIds.length === 0}
                className="px-4 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400 text-cyan-300 text-xs font-bold rounded tracking-wider disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {cargoLoading ? "VERIFYING..." : "LOAD SAMPLES"}
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
              <div className="flex items-center justify-between">
                <span
                  className={`font-bold px-2 py-0.5 rounded text-[10px] tracking-wider ${
                    cargoResult.status === "OPTIMAL_LOADOUT"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                      : cargoResult.is_overweight
                      ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                      : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                  }`}
                >
                  STATUS: {cargoResult.status}
                </span>
                <span className="text-slate-400 font-mono">
                  Reward Multiplier: <span className="text-emerald-400 font-bold">{cargoResult.reward_multiplier}x</span>
                </span>
              </div>
              <p className="text-slate-200">{cargoResult.message}</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-[11px] font-mono">
                <div>
                  <span className="text-slate-500 block">Your Cargo Value:</span>
                  <span className="text-amber-400 font-bold">{cargoResult.player_total_value} pts</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Optimal Max Value:</span>
                  <span className="text-emerald-400 font-bold">{cargoResult.optimal_max_value} pts</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Optimal Total Mass:</span>
                  <span className="text-cyan-400 font-bold">{cargoResult.optimal_total_weight} kg</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
