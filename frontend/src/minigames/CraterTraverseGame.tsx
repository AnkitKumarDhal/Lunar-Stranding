// frontend/src/minigames/CraterTraverseGame.tsx
import { useState } from "react";
import { gameApi, type CraterTraverseResponse } from "@/services/api";

const MOCK_BFS_GRAPH: Record<string, string[]> = {
  Crater_Alpha: ["Rim_1", "Rim_2"],
  Rim_1: ["Crater_Alpha", "Ridge_1", "Crater_Zeta"],
  Rim_2: ["Crater_Alpha", "Ridge_2"],
  Ridge_1: ["Rim_1", "Crater_Zeta"],
  Ridge_2: ["Rim_2", "Crater_Zeta"],
  Crater_Zeta: ["Rim_1", "Ridge_1", "Ridge_2"],
};

const NODE_POSITIONS: Record<string, { x: number; y: number; label: string }> = {
  Crater_Alpha: { x: 60, y: 150, label: "ALPHA" },
  Rim_1: { x: 180, y: 80, label: "RIM 1" },
  Rim_2: { x: 180, y: 220, label: "RIM 2" },
  Ridge_1: { x: 310, y: 80, label: "RIDGE 1" },
  Ridge_2: { x: 310, y: 220, label: "RIDGE 2" },
  Crater_Zeta: { x: 440, y: 150, label: "ZETA" },
};

const EDGES: [string, string][] = [
  ["Crater_Alpha", "Rim_1"],
  ["Crater_Alpha", "Rim_2"],
  ["Rim_1", "Ridge_1"],
  ["Rim_1", "Crater_Zeta"],
  ["Rim_2", "Ridge_2"],
  ["Ridge_1", "Crater_Zeta"],
  ["Ridge_2", "Crater_Zeta"],
];

export const CraterTraverseGame = () => {
  const [path, setPath] = useState<string[]>(["Crater_Alpha"]);
  const [result, setResult] = useState<CraterTraverseResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentHead = path[path.length - 1];
  const uniqueVisited = Array.from(new Set(path));

  const handleNodeClick = (node: string) => {
    // Only allow clicking connected neighbors of current head
    if (MOCK_BFS_GRAPH[currentHead]?.includes(node)) {
      setPath((prev) => [...prev, node]);
    }
  };

  const handleReset = () => {
    setPath(["Crater_Alpha"]);
    setResult(null);
    setError(null);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await gameApi.submitCraterTraverse(MOCK_BFS_GRAPH, path);
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network traversal submission failed");
    } finally {
      setLoading(false);
    }
  };

  const isEdgeTraversed = (u: string, v: string) => {
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
      {/* Top instruction header */}
      <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
        <div>
          <span className="text-cyan-400 font-bold">OBJECTIVE:</span> Deploy perimeter sensors to visit{" "}
          <span className="text-slate-200 font-bold">all 6 craters</span> in the minimum number of steps (BFS).
        </div>
        <div className="text-[11px] text-slate-400 font-mono">
          Sensors Online:{" "}
          <span className="text-cyan-400 font-bold">{uniqueVisited.length} / 6</span>
        </div>
      </div>

      {/* Graph Visualizer */}
      <div className="flex-1 min-h-[280px] bg-slate-900/90 border border-slate-700/80 rounded-lg p-3 relative flex items-center justify-center">
        <svg viewBox="0 0 500 300" className="w-full h-full select-none">
          {/* Render All 7 Edges */}
          {EDGES.map(([u, v], idx) => {
            const p1 = NODE_POSITIONS[u];
            const p2 = NODE_POSITIONS[v];
            const traversed = isEdgeTraversed(u, v);
            return (
              <line
                key={`edge-${idx}`}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={traversed ? "#22d3ee" : "#475569"}
                strokeWidth={traversed ? "3" : "1.5"}
                strokeDasharray={traversed ? "none" : "4"}
              />
            );
          })}

          {/* Render All 6 Nodes (Including both Ridge_1 and Ridge_2) */}
          {Object.entries(NODE_POSITIONS).map(([nodeKey, node]) => {
            const isHead = currentHead === nodeKey;
            const isVisited = uniqueVisited.includes(nodeKey);
            const isNeighbor = MOCK_BFS_GRAPH[currentHead]?.includes(nodeKey);

            let strokeColor = "#475569";
            let fillColor = "#0f172a";
            if (isHead) {
              strokeColor = "#38bdf8";
              fillColor = "#0369a1";
            } else if (isVisited) {
              strokeColor = "#22d3ee";
              fillColor = "#083344";
            } else if (isNeighbor) {
              strokeColor = "#a5f3fc";
            }

            return (
              <g
                key={nodeKey}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={() => handleNodeClick(nodeKey)}
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
                    stroke="#22d3ee"
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
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-slate-400 uppercase font-semibold">Traverse Hops:</span>
          <span className="text-xs text-cyan-400 font-bold font-mono">
            {path.length - 1} steps
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            ({path.join(" → ")})
          </span>
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
            disabled={loading || path.length < 2}
            className="px-4 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400 text-cyan-300 text-xs font-bold rounded tracking-wider disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "CHECKING BFS..." : "ESTABLISH SENSOR NETWORK"}
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
                result.status === "OPTIMAL_TRAVERSAL"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : result.status === "SUBOPTIMAL_TRAVERSAL"
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                  : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
              }`}
            >
              STATUS: {result.status}
            </span>
            <span className="text-slate-400 font-mono">
              Efficiency: <span className="text-cyan-400 font-bold">{result.step_efficiency_percentage}%</span>
            </span>
          </div>

          <p className="text-slate-200">{result.message}</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-slate-800 text-[11px] font-mono">
            <div>
              <span className="text-slate-500 block">Your Steps:</span>
              <span className="text-cyan-400 font-bold">{result.player_steps}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Optimal Steps:</span>
              <span className="text-emerald-400 font-bold">{result.optimal_steps}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Craters Visited:</span>
              <span className="text-slate-300 font-bold">{result.craters_visited_count} / {result.total_craters}</span>
            </div>
            <div>
              <span className="text-slate-500 block">BFS Discovery:</span>
              <span className="text-slate-300 font-bold">{result.optimal.bfs_discovery_order.join(" → ")}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
