import { useState } from "react";
import { gameApi } from "../services/api";
import { MinigameLayout } from "../components/MinigameLayout";
import type { CraterTraverseResult } from "../types/game";

const MOCK_GRAPH: Record<string, string[]> = {
  Crater_Alpha: ["Rim_1", "Rim_2"],
  Rim_1: ["Crater_Alpha", "Ridge_1", "Crater_Zeta"],
  Rim_2: ["Crater_Alpha", "Ridge_2"],
  Ridge_1: ["Rim_1", "Crater_Zeta"],
  Ridge_2: ["Rim_2", "Crater_Zeta"],
  Crater_Zeta: ["Rim_1", "Ridge_1", "Ridge_2"],
};

const NODES = [
  { id: "Crater_Alpha", x: 48, y: 150, label: "ALPHA" },
  { id: "Rim_1", x: 145, y: 76, label: "RIM 1" },
  { id: "Rim_2", x: 145, y: 225, label: "RIM 2" },
  { id: "Ridge_1", x: 255, y: 76, label: "RIDGE 1" },
  { id: "Ridge_2", x: 255, y: 225, label: "RIDGE 2" },
  { id: "Crater_Zeta", x: 365, y: 150, label: "ZETA" },
];

const EDGES = [
  ["Crater_Alpha", "Rim_1"],
  ["Crater_Alpha", "Rim_2"],
  ["Rim_1", "Ridge_1"],
  ["Rim_1", "Crater_Zeta"],
  ["Rim_2", "Ridge_2"],
  ["Ridge_1", "Crater_Zeta"],
  ["Ridge_2", "Crater_Zeta"],
] as const;

export const CraterTraverseGame = () => {
  const [path, setPath] = useState<string[]>(["Crater_Alpha"]);
  const [result, setResult] = useState<CraterTraverseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const lastNode = path[path.length - 1];
  const visitedCount = new Set(path).size;
  const totalNodes = NODES.length;

  const handleNodeClick = (node: string) => {
    if (!MOCK_GRAPH[lastNode]?.includes(node)) return;

    setPath((current) => [...current, node]);
    setResult(null);
    setError(null);
  };

  const handleSubmit = async () => {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await gameApi.submitCraterTraverse(MOCK_GRAPH, path);
      setResult(response);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to evaluate the traversal.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setPath(["Crater_Alpha"]);
    setResult(null);
    setError(null);
  };

  const handleUndo = () => {
    if (path.length <= 1 || loading) return;

    setPath((current) => current.slice(0, -1));
    setResult(null);
    setError(null);
  };

  return (
    <MinigameLayout
      title="BFS // VISIT ALL CRATERS"
      headerRight={
        <span className="text-cyan-300">
          VISITED: {visitedCount}/{totalNodes}
        </span>
      }
      controls={
        <>
          <span className="min-w-0 flex-1 break-words text-cyan-300">
            STEPS: {path.length - 1}
            {" · "}
            CURRENT: {NODES.find((node) => node.id === lastNode)?.label}
          </span>

          <div className="flex gap-2">
            <button
              onClick={handleUndo}
              disabled={path.length <= 1 || loading}
              className="rounded border border-slate-600 px-3 py-1.5 text-slate-200 disabled:opacity-40"
            >
              UNDO
            </button>

            <button
              onClick={handleReset}
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
              {loading ? "EVALUATING..." : "SUBMIT TRAVERSAL"}
            </button>
          </div>
        </>
      }
      hint={
        visitedCount < totalNodes
          ? "Visit all six craters. You may revisit a crater when the route requires it."
          : undefined
      }
      error={error}
      result={
        result && (
          <>
            <div className="font-bold text-cyan-300">
              STATUS: {result.status}
            </div>

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
                <strong className="text-slate-100">
                  {result.player_steps}
                </strong>
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
          </>
        )
      }
    >
      {/* GAME GRAPH */}

      <div className="min-h-[230px] flex-1 rounded border border-slate-700 bg-slate-900 p-2">
        <svg
          viewBox="0 0 420 290"
          className="h-full w-full"
          role="img"
          aria-label="Six-crater traversal graph"
        >
          {EDGES.map(([from, to]) => {
            const start = NODES.find((node) => node.id === from)!;
            const end = NODES.find((node) => node.id === to)!;

            const active = path.some(
              (node, index) =>
                (node === from && path[index + 1] === to) ||
                (node === to && path[index + 1] === from),
            );

            return (
              <line
                key={`${from}-${to}`}
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke={active ? "#22d3ee" : "#64748b"}
                strokeWidth={active ? 3 : 1.5}
                strokeDasharray={active ? undefined : "5 5"}
              />
            );
          })}

          {NODES.map((node) => {
            const visited = path.includes(node.id);
            const current = lastNode === node.id;
            const adjacent = MOCK_GRAPH[lastNode]?.includes(node.id) ?? false;

            return (
              <g
                key={node.id}
                onClick={() => handleNodeClick(node.id)}
                className={adjacent ? "cursor-pointer" : "cursor-not-allowed"}
                opacity={adjacent || visited ? 1 : 0.65}
              >
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={current ? 17 : 14}
                  fill={current ? "#164e63" : "#0f172a"}
                  stroke={current ? "#67e8f9" : visited ? "#22d3ee" : "#94a3b8"}
                  strokeWidth={current ? 3 : 2}
                />

                <text
                  x={node.x}
                  y={node.y + 29}
                  textAnchor="middle"
                  fill={visited ? "#67e8f9" : "#e2e8f0"}
                  fontSize="10"
                  fontWeight="600"
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </MinigameLayout>
  );
};
