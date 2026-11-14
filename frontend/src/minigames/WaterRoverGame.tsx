import React, { useState } from "react";
import { gameApi } from "../services/api";
import type { WaterRoverResult } from "../types/game";

const MOCK_GRAPH: Record<string, Record<string, number>> = {
  Base: {
    NodeA: 15,
    NodeB: 25,
  },

  NodeA: {
    Base: 15,
    NodeC: 10,
    NodeD: 30,
  },

  NodeB: {
    Base: 25,
    NodeC: 5,
    IceDeposit: 40,
  },

  NodeC: {
    NodeA: 10,
    NodeB: 5,
    IceDeposit: 20,
  },

  NodeD: {
    NodeA: 30,
    IceDeposit: 10,
  },

  IceDeposit: {
    NodeB: 40,
    NodeC: 20,
    NodeD: 10,
  },
};

const NODE_LAYOUT: Record<
  string,
  {
    x: number;
    y: number;
    label: string;
  }
> = {
  Base: {
    x: 48,
    y: 150,
    label: "BASE",
  },

  NodeA: {
    x: 145,
    y: 76,
    label: "NODE A",
  },

  NodeB: {
    x: 145,
    y: 230,
    label: "NODE B",
  },

  NodeC: {
    x: 250,
    y: 150,
    label: "NODE C",
  },

  NodeD: {
    x: 250,
    y: 48,
    label: "NODE D",
  },

  IceDeposit: {
    x: 365,
    y: 150,
    label: "ICE DEPOSIT",
  },
};

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

export const WaterRoverGame: React.FC = () => {
  const [path, setPath] = useState<string[]>(["Base"]);

  const [result, setResult] = useState<WaterRoverResult | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  const lastNode = path[path.length - 1];

  const routeComplete = lastNode === "IceDeposit";

  // Select an adjacent node.
  const handleNodeClick = (node: string) => {
    const cost = MOCK_GRAPH[lastNode]?.[node];

    if (typeof cost !== "number" || cost < 0) {
      return;
    }

    setPath((current) => [...current, node]);

    setResult(null);
    setError(null);
  };

  // Submit route to backend.
  const handleSubmit = async () => {
    if (!routeComplete || loading) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await gameApi.submitWaterRoverPath(
        MOCK_GRAPH,
        path,
        100,
      );

      setResult(response);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to evaluate the route.",
      );
    } finally {
      setLoading(false);
    }
  };

  // Reset route.
  const reset = () => {
    setPath(["Base"]);

    setResult(null);
    setError(null);
  };

  // Undo last movement.
  const undo = () => {
    if (path.length <= 1) {
      return;
    }

    setPath((current) => current.slice(0, -1));

    setResult(null);
    setError(null);
  };

  return (
    <div className="flex h-full min-h-[380px] flex-col gap-3">
      {/* HEADER */}

      <div className="flex items-center justify-between text-[10px] font-mono tracking-wider text-slate-400">
        <span>DIJKSTRA // ENERGY-WEIGHTED ROUTING</span>

        <span className="text-amber-300">
          START: BASE · TARGET: ICE DEPOSIT
        </span>
      </div>

      {/* GRAPH */}

      <div className="min-h-[230px] flex-1 rounded border border-slate-700 bg-slate-900 p-2">
        <svg
          viewBox="0 0 420 290"
          className="h-full w-full"
          role="img"
          aria-label="Water rover route graph"
        >
          {/* EDGES */}

          {EDGES.map(([from, to, weight]) => {
            const a = NODE_LAYOUT[from];
            const b = NODE_LAYOUT[to];

            const edgeInPath = path.some(
              (node, index) =>
                index < path.length - 1 &&
                ((node === from && path[index + 1] === to) ||
                  (node === to && path[index + 1] === from)),
            );

            return (
              <g key={`${from}-${to}`}>
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={edgeInPath ? "#22d3ee" : "#64748b"}
                  strokeWidth={edgeInPath ? 3 : 1.5}
                  strokeDasharray={edgeInPath ? undefined : "5 5"}
                />

                <text
                  x={(a.x + b.x) / 2}
                  y={(a.y + b.y) / 2 - 6}
                  textAnchor="middle"
                  fill="#cbd5e1"
                  fontSize="9"
                >
                  {weight} kWh
                </text>
              </g>
            );
          })}

          {/* NODES */}

          {Object.entries(NODE_LAYOUT).map(([node, position]) => {
            const visited = path.includes(node);

            const current = lastNode === node;

            const isAdjacent = typeof MOCK_GRAPH[lastNode]?.[node] === "number";

            return (
              <g
                key={node}
                onClick={() => handleNodeClick(node)}
                className={isAdjacent ? "cursor-pointer" : "cursor-not-allowed"}
                opacity={isAdjacent || visited ? 1 : 0.65}
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

      {/* ROUTE AND CONTROLS */}

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
        <span className="min-w-0 flex-1 break-words text-cyan-300">
          ROUTE: {path.join(" → ")}
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
            disabled={!routeComplete || loading}
            className="rounded border border-amber-400 bg-amber-500/20 px-3 py-1.5 font-bold text-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "EVALUATING…" : "TRANSMIT ROUTE"}
          </button>
        </div>
      </div>

      {!routeComplete && (
        <p className="text-[10px] text-slate-400">
          Select connected nodes until the route reaches ICE DEPOSIT.
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
        </div>
      )}
    </div>
  );
};
