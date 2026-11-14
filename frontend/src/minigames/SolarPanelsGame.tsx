// frontend/src/minigames/SolarPanelsGame.tsx
import { useState } from "react";
import { gameApi, type SolarPanelsResponse } from "@/services/api";

const SOLAR_GRAPH: Record<string, Record<string, number>> = {
  Panel_Hub: { Array_1: 8, Array_2: 12 },
  Array_1: { Panel_Hub: 8, Array_2: 6, Array_3: 15 },
  Array_2: { Panel_Hub: 12, Array_1: 6, Array_4: 10 },
  Array_3: { Array_1: 15, Array_4: 7, Battery_Mast: 9 },
  Array_4: { Array_2: 10, Array_3: 7, Battery_Mast: 11 },
  Battery_Mast: { Array_3: 9, Array_4: 11 },
};

const NODE_COORDS: Record<string, { x: number; y: number; label: string }> = {
  Panel_Hub: { x: 70, y: 150, label: "MAIN HUB" },
  Array_1: { x: 190, y: 80, label: "PANEL 1" },
  Array_2: { x: 190, y: 220, label: "PANEL 2" },
  Array_3: { x: 320, y: 80, label: "PANEL 3" },
  Array_4: { x: 320, y: 220, label: "PANEL 4" },
  Battery_Mast: { x: 440, y: 150, label: "BATTERY MAST" },
};

interface EdgeDef {
  u: string;
  v: string;
  w: number;
  lx: number;
  ly: number;
}

const ALL_EDGES: EdgeDef[] = [
  { u: "Panel_Hub", v: "Array_1", w: 8, lx: 125, ly: 105 },
  { u: "Panel_Hub", v: "Array_2", w: 12, lx: 125, ly: 195 },
  { u: "Array_1", v: "Array_2", w: 6, lx: 175, ly: 150 },
  { u: "Array_1", v: "Array_3", w: 15, lx: 255, ly: 70 },
  { u: "Array_2", v: "Array_4", w: 10, lx: 255, ly: 230 },
  { u: "Array_3", v: "Array_4", w: 7, lx: 335, ly: 150 },
  { u: "Array_3", v: "Battery_Mast", w: 9, lx: 385, ly: 105 },
  { u: "Array_4", v: "Battery_Mast", w: 11, lx: 385, ly: 195 },
];

export const SolarPanelsGame = () => {
  const [selectedEdges, setSelectedEdges] = useState<[string, string][]>([]);
  const [result, setResult] = useState<SolarPanelsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to check if edge is selected (undirected)
  const isSelected = (u: string, v: string) => {
    return selectedEdges.some(
      ([a, b]) => (a === u && b === v) || (a === v && b === u),
    );
  };

  const toggleEdge = (u: string, v: string) => {
    setSelectedEdges((prev) => {
      const exists = prev.some(
        ([a, b]) => (a === u && b === v) || (a === v && b === u),
      );
      if (exists) {
        return prev.filter(
          ([a, b]) => !(a === u && b === v) && !(a === v && b === u),
        );
      } else {
        return [...prev, [u, v]];
      }
    });
  };

  const handleReset = () => {
    setSelectedEdges([]);
    setResult(null);
    setError(null);
  };

  // Calculate current total cable length selected by player
  const currentCost = selectedEdges.reduce((sum, [u, v]) => {
    const w = SOLAR_GRAPH[u]?.[v] || SOLAR_GRAPH[v]?.[u] || 0;
    return sum + w;
  }, 0);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await gameApi.submitSolarPanels(
        SOLAR_GRAPH,
        selectedEdges,
        "Panel_Hub",
      );
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Grid submission failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Top instruction header */}
      <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
        <div>
          <span className="text-cyan-400 font-bold">OBJECTIVE:</span> Connect all{" "}
          <span className="text-slate-200 font-bold">6 solar panels</span> using minimum total cable length (Prim&apos;s MST).
        </div>
        <div className="text-[11px] text-slate-400 font-mono">
          Required Cables: <span className="text-amber-400 font-bold">5</span>
        </div>
      </div>

      {/* Graph Visualizer */}
      <div className="flex-1 min-h-[280px] bg-slate-900/90 border border-slate-700/80 rounded-lg p-3 relative flex items-center justify-center">
        <svg viewBox="0 0 500 300" className="w-full h-full select-none">
          {/* Render Clickable Edges */}
          {ALL_EDGES.map((e, idx) => {
            const p1 = NODE_COORDS[e.u];
            const p2 = NODE_COORDS[e.v];
            const active = isSelected(e.u, e.v);

            return (
              <g
                key={`edge-${idx}`}
                onClick={() => toggleEdge(e.u, e.v)}
                className="cursor-pointer group"
              >
                {/* Invisible wide hit area */}
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke="transparent"
                  strokeWidth="18"
                />
                {/* Visible line */}
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke={active ? "#06b6d4" : "#475569"}
                  strokeWidth={active ? "3.5" : "1.5"}
                  strokeDasharray={active ? "none" : "4"}
                  className="transition-colors group-hover:stroke-cyan-400"
                />
                {/* Edge weight badge */}
                <rect
                  x={e.lx - 13}
                  y={e.ly - 8}
                  width="26"
                  height="16"
                  fill="#0f172a"
                  stroke={active ? "#06b6d4" : "#334155"}
                  strokeWidth="1"
                  rx="3"
                  className="transition-colors"
                />
                <text
                  x={e.lx}
                  y={e.ly + 4}
                  textAnchor="middle"
                  fill={active ? "#22d3ee" : "#94a3b8"}
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {e.w}m
                </text>
              </g>
            );
          })}

          {/* Render Nodes */}
          {Object.entries(NODE_COORDS).map(([key, node]) => {
            const isHub = key === "Panel_Hub";
            const isConnected = selectedEdges.some(
              ([a, b]) => a === key || b === key,
            );

            return (
              <g
                key={key}
                transform={`translate(${node.x}, ${node.y})`}
                className="cursor-default"
              >
                <circle
                  r={isHub ? "16" : "13"}
                  fill={isHub ? "#083344" : "#0f172a"}
                  stroke={isConnected ? "#06b6d4" : "#475569"}
                  strokeWidth={isHub ? "3" : isConnected ? "2" : "1.5"}
                />
                <text
                  y="26"
                  textAnchor="middle"
                  fill={isConnected ? "#f1f5f9" : "#94a3b8"}
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

      {/* Control Strip */}
      <div className="flex flex-wrap justify-between items-center gap-2 bg-slate-900/60 p-2.5 rounded border border-slate-800">
        <div className="flex items-center gap-4 text-xs font-mono">
          <div>
            <span className="text-slate-500">CABLES CONNECTED: </span>
            <span className={`font-bold ${selectedEdges.length === 5 ? "text-emerald-400" : "text-amber-400"}`}>
              {selectedEdges.length} / 5
            </span>
          </div>
          <div>
            <span className="text-slate-500">TOTAL LENGTH: </span>
            <span className="text-cyan-400 font-bold">{currentCost}m</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            disabled={loading}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded border border-slate-600 transition-colors"
          >
            RESET
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || selectedEdges.length === 0}
            className="px-4 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400 text-cyan-300 text-xs font-bold rounded tracking-wider disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "CALCULATING MST..." : "CONNECT POWER GRID"}
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
                result.status === "OPTIMAL"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : result.status === "SUBOPTIMAL"
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                  : "bg-rose-500/20 text-rose-400 border border-rose-500/40"
              }`}
            >
              STATUS: {result.status}
            </span>
            <span className="text-slate-400 font-mono">
              Efficiency: <span className="text-cyan-400 font-bold">{result.efficiency_percentage}%</span>
            </span>
          </div>

          <p className="text-slate-200">{result.message}</p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-[11px] font-mono">
            <div>
              <span className="text-slate-500 block">Your Cable Length:</span>
              <span className="text-amber-400 font-bold">{result.player_cost}m</span>
            </div>
            <div>
              <span className="text-slate-500 block">Optimal MST Length:</span>
              <span className="text-emerald-400 font-bold">{result.optimal_cost}m</span>
            </div>
            <div>
              <span className="text-slate-500 block">Optimal Connections:</span>
              <span className="text-slate-300 font-bold">
                {result.optimal_edges.map(([u, v]) => `${u}-${v}`).join(", ")}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
