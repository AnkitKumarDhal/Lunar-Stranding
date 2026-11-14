// frontend/src/minigames/WaterRoverGame.tsx
import { useState } from "react";
import { gameApi, type WaterRoverResponse } from "@/services/api";

const MOCK_GRAPH: Record<string, Record<string, number>> = {
  Base: { NodeA: 15, NodeB: 25 },
  NodeA: { Base: 15, NodeC: 10, NodeD: 30 },
  NodeB: { Base: 25, NodeC: 5, IceDeposit: 40 },
  NodeC: { NodeA: 10, NodeB: 5, IceDeposit: 20 },
  NodeD: { NodeA: 30, IceDeposit: 10 },
  IceDeposit: { NodeB: 40, NodeC: 20, NodeD: 10 },
};

// Node coordinates on the SVG canvas
const NODE_COORDS: Record<string, { x: number; y: number; label: string }> = {
  Base: { x: 60, y: 150, label: "BASE" },
  NodeA: { x: 180, y: 80, label: "WAYPOINT A" },
  NodeB: { x: 180, y: 220, label: "WAYPOINT B" },
  NodeC: { x: 300, y: 200, label: "WAYPOINT C" },
  NodeD: { x: 300, y: 80, label: "WAYPOINT D" },
  IceDeposit: { x: 440, y: 150, label: "ICE DEPOSIT" },
};

// All unique undirected edges with coordinates and weight labels
const EDGES = [
  { u: "Base", v: "NodeA", w: 15, lx: 105, ly: 105 },
  { u: "Base", v: "NodeB", w: 25, lx: 105, ly: 195 },
  { u: "NodeA", v: "NodeC", w: 10, lx: 250, ly: 150 },
  { u: "NodeA", v: "NodeD", w: 30, lx: 240, ly: 70 },
  { u: "NodeB", v: "NodeC", w: 5, lx: 235, ly: 225 },
  { u: "NodeB", v: "IceDeposit", w: 40, lx: 300, ly: 260 },
  { u: "NodeC", v: "IceDeposit", w: 20, lx: 380, ly: 190 },
  { u: "NodeD", v: "IceDeposit", w: 10, lx: 380, ly: 105 },
];

export const WaterRoverGame = () => {
  const [path, setPath] = useState<string[]>(["Base"]);
  const [result, setResult] = useState<WaterRoverResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentHead = path[path.length - 1];

  const handleNodeClick = (node: string) => {
    // If clicking the current head, ignore
    if (node === currentHead) return;

    // Check if clicked node is directly connected to the current route head
    if (MOCK_GRAPH[currentHead]?.[node] !== undefined) {
      setPath((prev) => [...prev, node]);
    }
  };

  const handleResetRoute = () => {
    setPath(["Base"]);
    setResult(null);
    setError(null);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await gameApi.submitWaterRoverPath(
        MOCK_GRAPH,
        path,
        100.0,
        "Base",
        "IceDeposit",
      );
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Route transmission failed");
    } finally {
      setLoading(false);
    }
  };

  // Check if an edge is currently traversed in the player's path
  const isEdgeInPlayerPath = (u: string, v: string) => {
    for (let i = 0; i < path.length - 1; i++) {
      if (
        (path[i] === u && path[i + 1] === v) ||
        (path[i] === v && path[i + 1] === u)
      ) {
        return true;
      }
    }
    return false;
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Top instruction bar */}
      <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
        <div>
          <span className="text-amber-400 font-bold">OBJECTIVE:</span> Find least-energy route from{" "}
          <span className="text-slate-200 font-bold">Base</span> to{" "}
          <span className="text-cyan-400 font-bold">Ice Deposit</span> using Dijkstra&apos;s algorithm.
        </div>
        <div className="text-[11px] text-slate-400">
          Battery Reserve: <span className="text-emerald-400 font-bold">100.0 kWh</span>
        </div>
      </div>

      {/* Graph Visualizer */}
      <div className="flex-1 min-h-[280px] bg-slate-900/90 border border-slate-700/80 rounded-lg p-3 relative flex items-center justify-center">
        <svg viewBox="0 0 500 300" className="w-full h-full select-none">
          {/* Render All Edges */}
          {EDGES.map((e, idx) => {
            const p1 = NODE_COORDS[e.u];
            const p2 = NODE_COORDS[e.v];
            const isSelected = isEdgeInPlayerPath(e.u, e.v);
            return (
              <g key={`edge-${idx}`}>
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke={isSelected ? "#f59e0b" : "#475569"}
                  strokeWidth={isSelected ? "3" : "1.5"}
                  strokeDasharray={isSelected ? "none" : "4"}
                />
                <rect
                  x={e.lx - 12}
                  y={e.ly - 8}
                  width="24"
                  height="14"
                  fill="#0f172a"
                  rx="3"
                  className="opacity-80"
                />
                <text
                  x={e.lx}
                  y={e.ly + 3}
                  textAnchor="middle"
                  fill={isSelected ? "#f59e0b" : "#94a3b8"}
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {e.w}k
                </text>
              </g>
            );
          })}

          {/* Render All Nodes */}
          {Object.entries(NODE_COORDS).map(([key, node]) => {
            const isHead = currentHead === key;
            const isVisited = path.includes(key);
            const isNeighbor = MOCK_GRAPH[currentHead]?.[key] !== undefined;

            let strokeColor = "#475569";
            let fillColor = "#0f172a";
            if (isHead) {
              strokeColor = "#f59e0b";
              fillColor = "#78350f";
            } else if (isVisited) {
              strokeColor = "#22d3ee";
            } else if (isNeighbor) {
              strokeColor = "#38bdf8";
            }

            return (
              <g
                key={key}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={() => handleNodeClick(key)}
                className={`transition-all duration-150 ${
                  isNeighbor ? "cursor-pointer hover:scale-110" : "cursor-default"
                }`}
              >
                <circle
                  r={isHead ? "16" : "13"}
                  fill={fillColor}
                  stroke={strokeColor}
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

      {/* Control Strip */}
      <div className="flex flex-wrap justify-between items-center gap-2 bg-slate-900/60 p-2.5 rounded border border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 uppercase font-semibold">Route:</span>
          <span className="text-xs text-amber-400 font-bold font-mono">
            {path.join(" → ")}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetRoute}
            disabled={loading}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded border border-slate-600 transition-colors"
          >
            RESET
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || path[path.length - 1] !== "IceDeposit"}
            className="px-4 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400 text-amber-300 text-xs font-bold rounded tracking-wider disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "CALCULATING..." : "TRANSMIT ROUTE"}
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

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-slate-800 text-[11px] font-mono">
            <div>
              <span className="text-slate-500 block">Your Energy:</span>
              <span className="text-amber-400 font-bold">{result.player_cost} kWh</span>
            </div>
            <div>
              <span className="text-slate-500 block">Optimal Energy:</span>
              <span className="text-emerald-400 font-bold">
                {result.optimal_cost !== null ? `${result.optimal_cost} kWh` : "N/A"}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Remaining Battery:</span>
              <span className="text-cyan-400 font-bold">{result.remaining_battery} kWh</span>
            </div>
            <div>
              <span className="text-slate-500 block">Optimal Path:</span>
              <span className="text-slate-300 font-bold">
                {result.optimal_path && result.optimal_path.length > 0 ? result.optimal_path.join(" → ") : "N/A"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
