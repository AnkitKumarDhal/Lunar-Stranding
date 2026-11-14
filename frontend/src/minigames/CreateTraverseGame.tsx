import React, { useState } from "react";
import { gameApi } from "../services/api";
import type { CraterTraverseResult } from "../types/game";

const MOCK_BFS_GRAPH: Record<string, string[]> = {
  Crater_Alpha: ["Rim_1", "Rim_2"],
  Rim_1: ["Crater_Alpha", "Ridge_1", "Crater_Zeta"],
  Rim_2: ["Crater_Alpha", "Ridge_2"],
  Ridge_1: ["Rim_1", "Crater_Zeta"],
  Ridge_2: ["Rim_2", "Crater_Zeta"],
  Crater_Zeta: ["Rim_1", "Ridge_1", "Ridge_2"],
};

const NODE_LAYOUT: Record<string, { x: number; y: number; label: string }> = {
  Crater_Alpha: { x: 48, y: 150, label: "ALPHA" },
  Rim_1: { x: 145, y: 76, label: "RIM 1" },
  Rim_2: { x: 145, y: 225, label: "RIM 2" },
  Ridge_1: { x: 255, y: 76, label: "RIDGE 1" },
  Ridge_2: { x: 255, y: 225, label: "RIDGE 2" },
  Crater_Zeta: { x: 365, y: 150, label: "ZETA" },
};

const EDGES = Object.entries(MOCK_BFS_GRAPH).flatMap(([from, neighbors]) =>
  neighbors.filter((to) => from < to).map((to) => [from, to] as const),
);

export const CraterTraverseGame: React.FC = () => {
  const [path, setPath] = useState<string[]>(["Crater_Alpha"]);
  const [result, setResult] = useState<CraterTraverseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const lastNode = path[path.length - 1];
  const visitedCount = new Set(path).size;
  const totalNodes = Object.keys(MOCK_BFS_GRAPH).length;
  const allVisited = visitedCount === totalNodes;

  // Select a connected crater.
  const handleNodeClick = (node: string) => {
    if (!MOCK_BFS_GRAPH[lastNode]?.includes(node)) {
      return;
    }

    setPath((current) => [...current, node]);

    setResult(null);
    setError(null);
  };

  // Submit traversal to backend.
  const handleSubmit = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const response = await gameApi.submitCraterTraverse(MOCK_BFS_GRAPH, path);
      setResult(response);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to evaluate the traversal.",
      );
    } finally {
      setLoading(false);
    }
  };

  // Reset traversal.
  const reset = () => {
    setPath(["Crater_Alpha"]);
    setResult(null);
    setError(null);
  };

  // Undo last movement.
  const undo = () => {
    if (path.length <= 1) return;
    setPath((current) => current.slice(0, -1));
    setResult(null);
    setError(null);
  };

  return (
    <div className="flex h-full min-h-[380px] flex-col gap-3">
      {/* HEADER */}

      <div className="flex items-center justify-between gap-2 text-[10px] font-mono tracking-wider text-slate-400">
        <span>BFS // VISIT ALL CRATERS</span>

        <span className="text-cyan-300">
          VISITED: {visitedCount}/{totalNodes}
        </span>
      </div>

      {/* GRAPH */}

      <div className="min-h-[230px] flex-1 rounded border border-slate-700 bg-slate-900 p-2">
        <svg
          viewBox="0 0 420 290"
          className="h-full w-full"
          role="img"
          aria-label="Six-crater traversal graph"
        >
          {/* EDGES */}

          {EDGES.map(([from, to]) => {
            const a = NODE_LAYOUT[from];
            const b = NODE_LAYOUT[to];

            const active = path.some(
              (node, index) =>
                index < path.length - 1 &&
                ((node === from && path[index + 1] === to) ||
                  (node === to && path[index + 1] === from)),
            );

            return (
              <line
                key={`${from}-${to}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={active ? "#22d3ee" : "#64748b"}
                strokeWidth={active ? 3 : 1.5}
                strokeDasharray={active ? undefined : "5 5"}
              />
            );
          })}

          {/* NODES */}

          {Object.entries(NODE_LAYOUT).map(([node, position]) => {
            const visited = path.includes(node);
            const current = lastNode === node;
            const adjacent = MOCK_BFS_GRAPH[lastNode]?.includes(node) ?? false;

            return (
              <g
                key={node}
                onClick={() => handleNodeClick(node)}
                className={adjacent ? "cursor-pointer" : "cursor-not-allowed"}
                opacity={adjacent || visited ? 1 : 0.65}
              >
                <circle
                  cx={position.x}
                  cy={position.y}
                  r={current ? 17 : 14}
                  fill={current ? "#164e63" : "#0f172a"}
                  stroke={current ? "#67e8f9" : visited ? "#22d3ee" : "#94a3b8"}
                  strokeWidth={current ? 3 : 2}
                />

                <text
                  x={position.x}
                  y={position.y + 29}
                  textAnchor="middle"
                  fill={visited ? "#67e8f9" : "#e2e8f0"}
                  fontSize="10"
                  fontWeight="600"
                >
                  {position.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* CONTROLS */}

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
        <span className="min-w-0 flex-1 break-words text-cyan-300">
          STEPS: {path.length - 1}
          {" · "}
          CURRENT: {NODE_LAYOUT[lastNode]?.label}
        </span>

        <div className="flex gap-2">
          <button
            onClick={undo}
            disabled={path.length <= 1 || loading}
            className="rounded border border-slate-600 px-3 py-1.5 text-slate-200 disabled:opacity-40"
          >
            UNDO
          </button>

          <button
            onClick={reset}
            disabled={loading}
            className="rounded border border-slate-600 px-3 py-1.5 text-slate-200 disabled:opacity-40"
          >
            RESET
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="rounded border border-cyan-400 bg-cyan-500/20 px-3 py-1.5 font-bold text-cyan-300 disabled:opacity-40"
          >
            {loading ? "EVALUATING…" : "SUBMIT TRAVERSAL"}
          </button>
        </div>
      </div>

      {!allVisited && (
        <p className="text-[10px] text-slate-400">
          Visit all six craters. You may revisit a crater when the route
          requires it.
        </p>
      )}

      {/* ERROR */}

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
        <div className="space-y-1 rounded border border-slate-700 bg-slate-900 p-3 text-xs text-slate-200">
          <div className="font-bold text-cyan-300">STATUS: {result.status}</div>

          <p>{result.message}</p>

          <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-slate-400">
            <span>
              Visited:{" "}
              <strong className="text-slate-100">
                {result.craters_visited_count}/{result.total_craters}
              </strong>
            </span>

            <span>
              Steps:{" "}
              <strong className="text-slate-100">{result.player_steps}</strong>
            </span>

            <span>
              Minimum steps:{" "}
              <strong className="text-slate-100">
                {result.minimum_steps_required ?? "—"}
              </strong>
            </span>

            <span>
              Efficiency:{" "}
              <strong className="text-slate-100">
                {result.efficiency_percentage}%
              </strong>
            </span>
          </div>

          {result.unvisited_craters.length > 0 && (
            <p className="pt-1 text-[10px] text-amber-300">
              NOT VISITED: {result.unvisited_craters.join(", ")}
            </p>
          )}

          {result.optimal_path.length > 0 && (
            <p className="pt-1 text-[10px] text-cyan-300">
              OPTIMAL ROUTE: {result.optimal_path.join(" → ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
