import { useState } from "react";
import { gameApi, type WaterRoverResponse } from "@/services/api";
import type { MissionOutcome } from "@/types/game";

interface WaterRoverGameProps {
  onPowerConsumed: (amount: number) => void;
  onCompleted?: (outcome: MissionOutcome) => void;
}

const NODE_COORDS: Record<string, { x: number; y: number; label: string }> = {
  Base: { x: 60, y: 150, label: "BASE" },
  NodeA: { x: 180, y: 80, label: "WAYPOINT A" },
  NodeB: { x: 180, y: 220, label: "WAYPOINT B" },
  NodeC: { x: 300, y: 200, label: "WAYPOINT C" },
  NodeD: { x: 300, y: 80, label: "WAYPOINT D" },
  IceDeposit: { x: 440, y: 150, label: "ICE DEPOSIT" },
};

// Keep the map compact; edge weights are randomized each time the game opens.
const EDGE_LAYOUT = [
  { u: "Base", v: "NodeA", dx: -8, dy: -10 },
  { u: "Base", v: "NodeB", dx: -8, dy: 10 },
  { u: "NodeA", v: "NodeB", dx: -12, dy: 0 },
  { u: "NodeA", v: "NodeC", dx: 0, dy: -13 },
  { u: "NodeA", v: "NodeD", dx: 0, dy: -12 },
  { u: "NodeB", v: "NodeC", dx: 0, dy: 12 },
  { u: "NodeB", v: "NodeD", dx: -22, dy: 15 },
  { u: "NodeC", v: "NodeD", dx: 14, dy: 0 },
  { u: "NodeB", v: "IceDeposit", dx: -12, dy: 14 },
  { u: "NodeC", v: "IceDeposit", dx: 0, dy: 12 },
  { u: "NodeD", v: "IceDeposit", dx: 0, dy: -12 },
];

const createGraph = () => {
  const graph: Record<string, Record<string, number>> = Object.fromEntries(
    Object.keys(NODE_COORDS).map((node) => [node, {}]),
  );

  EDGE_LAYOUT.forEach(({ u, v }) => {
    const weight = Math.floor(Math.random() * 21) + 5;
    graph[u][v] = weight;
    graph[v][u] = weight;
  });
  return graph;
};

export const WaterRoverGame = ({
  onPowerConsumed,
  onCompleted,
}: WaterRoverGameProps) => {
  const [graph] = useState(createGraph);
  const [path, setPath] = useState<string[]>(["Base"]);
  const [result, setResult] = useState<WaterRoverResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentHead = path[path.length - 1];
  const edges = EDGE_LAYOUT.map(({ u, v, dx, dy }) => ({
    u,
    v,
    w: graph[u][v],
    lx: (NODE_COORDS[u].x + NODE_COORDS[v].x) / 2 + dx,
    ly: (NODE_COORDS[u].y + NODE_COORDS[v].y) / 2 + dy,
  }));

  const handleNodeClick = (node: string) => {
    if (node !== currentHead && graph[currentHead]?.[node] !== undefined) {
      setPath((prev) => [...prev, node]);
      setResult(null);
      setError(null);
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
      const response = await gameApi.submitWaterRoverPath(graph, path);
      setResult(response);
      if (response.power_consumed > 0) onPowerConsumed(response.power_consumed);
      const outcome: MissionOutcome =
        response.status === "OPTIMAL"
          ? "optimal"
          : response.status === "SUBOPTIMAL"
            ? "suboptimal"
            : "invalid";

      onCompleted?.(outcome);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Route transmission failed",
      );
    } finally {
      setLoading(false);
    }
  };

  const isEdgeInPlayerPath = (u: string, v: string) =>
    path.some(
      (node, index) =>
        index < path.length - 1 &&
        ((node === u && path[index + 1] === v) ||
          (node === v && path[index + 1] === u)),
    );

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="text-xs text-slate-400 border-b border-slate-800 pb-2">
        <span className="text-amber-400 font-bold">OBJECTIVE:</span> Find the
        lowest-power route from{" "}
        <span className="text-slate-200 font-bold">Base</span> to{" "}
        <span className="text-cyan-400 font-bold">Ice Deposit</span> using
        Dijkstra&apos;s algorithm.
      </div>

      <div className="flex-1 min-h-[280px] bg-slate-900/90 border border-slate-700/80 rounded-lg p-3 relative flex items-center justify-center">
        <svg viewBox="0 0 500 300" className="w-full h-full select-none">
          {edges.map((edge) => {
            const from = NODE_COORDS[edge.u];
            const to = NODE_COORDS[edge.v];
            const selected = isEdgeInPlayerPath(edge.u, edge.v);
            return (
              <g key={`${edge.u}-${edge.v}`}>
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={selected ? "#f59e0b" : "#475569"}
                  strokeWidth={selected ? 3 : 1.5}
                  strokeDasharray={selected ? undefined : "4"}
                />
                <rect
                  x={edge.lx - 17}
                  y={edge.ly - 8}
                  width="34"
                  height="15"
                  fill="#0f172a"
                  rx="3"
                />
                <text
                  x={edge.lx}
                  y={edge.ly + 3}
                  textAnchor="middle"
                  fill={selected ? "#f59e0b" : "#cbd5e1"}
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {edge.w}k
                </text>
              </g>
            );
          })}

          {Object.entries(NODE_COORDS).map(([key, node]) => {
            const isHead = currentHead === key;
            const isVisited = path.includes(key);
            const isNeighbor = graph[currentHead]?.[key] !== undefined;
            const stroke = isHead
              ? "#f59e0b"
              : isVisited
                ? "#22d3ee"
                : isNeighbor
                  ? "#38bdf8"
                  : "#475569";
            const fill = isHead ? "#78350f" : "#0f172a";

            return (
              <g
                key={key}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={() => handleNodeClick(key)}
                className={isNeighbor ? "cursor-pointer" : "cursor-default"}
              >
                <circle
                  r={isHead ? 16 : 13}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={isHead ? 3 : isVisited ? 2.5 : 1.5}
                />
                {isNeighbor && (
                  <circle
                    r="19"
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="1"
                    strokeDasharray="2"
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

      <div className="flex flex-wrap justify-between items-center gap-2 bg-slate-900/60 p-2.5 rounded border border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 uppercase font-semibold">
            Route:
          </span>
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
            disabled={loading || currentHead !== "IceDeposit" || !!result}
            className="px-4 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400 text-amber-300 text-xs font-bold rounded tracking-wider disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "CALCULATING..." : "TRANSMIT ROUTE"}
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
              className={`font-bold px-2 py-0.5 rounded text-[10px] tracking-wider ${result.status === "OPTIMAL" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" : result.status === "SUBOPTIMAL" ? "bg-amber-500/20 text-amber-400 border border-amber-500/40" : "bg-rose-500/20 text-rose-400 border border-rose-500/40"}`}
            >
              STATUS: {result.status}
            </span>
          </div>
          <p className="text-slate-200">{result.message}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-slate-800 text-[11px] font-mono">
            <div>
              <span className="text-slate-500 block">Your Route Cost:</span>
              <span className="text-amber-400 font-bold">
                {result.player_cost} kWh
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Optimal Route Cost:</span>
              <span className="text-emerald-400 font-bold">
                {result.optimal_cost !== null
                  ? `${result.optimal_cost} kWh`
                  : "N/A"}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Power Consumed:</span>
              <span className="text-amber-400 font-bold">
                {result.power_consumed.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Optimal Path:</span>
              <span className="text-slate-300 font-bold">
                {result.optimal_path.length
                  ? result.optimal_path.join(" → ")
                  : "N/A"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
