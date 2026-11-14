import { useState } from "react";
import { gameApi } from "../services/api";
import { MinigameLayout } from "../components/MinigameLayout";
import type { WaterRoverResult } from "../types/game";

const MOCK_GRAPH: Record<string, Record<string, number>> = {
  Base: { NodeA: 15, NodeB: 25 },
  NodeA: { Base: 15, NodeC: 10, NodeD: 30 },
  NodeB: { Base: 25, NodeC: 5, IceDeposit: 40 },
  NodeC: { NodeA: 10, NodeB: 5, IceDeposit: 20 },
  NodeD: { NodeA: 30, IceDeposit: 10 },
  IceDeposit: { NodeB: 40, NodeC: 20, NodeD: 10 },
};

const NODES = [
  { id: "Base", x: 48, y: 150, label: "BASE" },
  { id: "NodeA", x: 145, y: 76, label: "NODE A" },
  { id: "NodeB", x: 145, y: 230, label: "NODE B" },
  { id: "NodeC", x: 250, y: 150, label: "NODE C" },
  { id: "NodeD", x: 250, y: 48, label: "NODE D" },
  { id: "IceDeposit", x: 365, y: 150, label: "ICE DEPOSIT" },
];

const EDGES = [
  ["Base", "NodeA", 15],
  ["Base", "NodeB", 25],
  ["NodeA", "NodeC", 10],
  ["NodeA", "NodeD", 30],
  ["NodeB", "NodeC", 5],
  ["NodeB", "IceDeposit", 40],
  ["NodeC", "IceDeposit", 20],
  ["NodeD", "IceDeposit", 10],
] as const;

export const WaterRoverGame = () => {
  const [path, setPath] = useState<string[]>(["Base"]);
  const [result, setResult] = useState<WaterRoverResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const lastNode = path[path.length - 1];
  const routeComplete = lastNode === "IceDeposit";

  const handleNodeClick = (node: string) => {
    if (MOCK_GRAPH[lastNode]?.[node] === undefined) return;

    setPath((current) => [...current, node]);
    setResult(null);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!routeComplete || loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await gameApi.submitWaterRoverPath(
        MOCK_GRAPH,
        path,
        100,
      );

      setResult(response);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to evaluate the route.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setPath(["Base"]);
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
      title="DIJKSTRA // ENERGY-WEIGHTED ROUTING"
      headerRight={
        <span className="text-amber-300">
          START: BASE · TARGET: ICE DEPOSIT
        </span>
      }
      controls={
        <>
          <span className="min-w-0 flex-1 break-words text-cyan-300">
            ROUTE: {path.join(" → ")}
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
              disabled={!routeComplete || loading}
              className="rounded border border-amber-400 bg-amber-500/20 px-3 py-1.5 font-bold text-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? "EVALUATING..." : "TRANSMIT ROUTE"}
            </button>
          </div>
        </>
      }
      hint={
        !routeComplete
          ? "Select connected nodes until the route reaches ICE DEPOSIT."
          : undefined
      }
      error={error}
      result={
        result && (
          <>
            <div className="font-bold text-amber-300">
              STATUS: {result.status}
            </div>

            <p>{result.message}</p>

            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-slate-400">
              <span>
                Route energy:{" "}
                <strong className="text-slate-100">
                  {result.player_cost} kWh
                </strong>
              </span>

              <span>
                Optimal energy:{" "}
                <strong className="text-slate-100">
                  {result.optimal_cost} kWh
                </strong>
              </span>

              <span>
                Efficiency:{" "}
                <strong className="text-slate-100">
                  {result.efficiency_percentage}%
                </strong>
              </span>

              <span>
                Battery remaining:{" "}
                <strong className="text-slate-100">
                  {result.remaining_battery} kWh
                </strong>
              </span>
            </div>

            {result.optimal_path.length > 0 && (
              <p className="pt-1 text-[10px] text-cyan-300">
                OPTIMAL: {result.optimal_path.join(" → ")}
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
          aria-label="Water rover route graph"
        >
          {EDGES.map(([from, to, weight]) => {
            const start = NODES.find((node) => node.id === from)!;
            const end = NODES.find((node) => node.id === to)!;

            const active = path.some(
              (node, index) =>
                (node === from && path[index + 1] === to) ||
                (node === to && path[index + 1] === from),
            );

            return (
              <g key={`${from}-${to}`}>
                <line
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                  stroke={active ? "#22d3ee" : "#64748b"}
                  strokeWidth={active ? 3 : 1.5}
                  strokeDasharray={active ? undefined : "5 5"}
                />

                <text
                  x={(start.x + end.x) / 2}
                  y={(start.y + end.y) / 2 - 6}
                  textAnchor="middle"
                  fill="#cbd5e1"
                  fontSize="9"
                >
                  {weight} kWh
                </text>
              </g>
            );
          })}

          {NODES.map((node) => {
            const visited = path.includes(node.id);
            const current = lastNode === node.id;
            const adjacent = MOCK_GRAPH[lastNode]?.[node.id] !== undefined;

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
