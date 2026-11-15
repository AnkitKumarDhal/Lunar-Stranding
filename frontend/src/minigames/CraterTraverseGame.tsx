import { useCallback, useEffect, useState } from "react";
import { gameApi, type CraterTraverseGameData, type CraterTraverseResponse } from "@/services/api";

interface CraterTraverseGameProps {
  onPowerConsumed: (amount: number) => void;
}

type NodePosition = { x: number; y: number; label: string };

export const CraterTraverseGame = ({ onPowerConsumed }: CraterTraverseGameProps) => {
  const [game, setGame] = useState<CraterTraverseGameData | null>(null);
  const [path, setPath] = useState<string[]>([]);
  const [result, setResult] = useState<CraterTraverseResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const graph = game?.graph ?? {};
  const startNode = game?.start_node ?? "";
  const nodes = Object.keys(graph);
  const currentHead = path[path.length - 1] ?? startNode;
  const visitedNodes = new Set(path);

  // Place all craters evenly around an ellipse.
  const nodePositions: Record<string, NodePosition> = {};
  nodes.forEach((node, index) => {
    const angle = (2 * Math.PI * index) / nodes.length - Math.PI / 2;
    nodePositions[node] = {
      x: 280 + 215 * Math.cos(angle),
      y: 180 + 130 * Math.sin(angle),
      label: `CRATER ${index + 1}`,
    };
  });

  const edges = Object.entries(graph).flatMap(([from, neighbors]) =>
    neighbors.filter((to) => from < to).map((to) => [from, to] as [string, string]),
  );

  const loadNewGame = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const nextGame = await gameApi.getNewCraterTraverseGame();
      setGame(nextGame);
      setPath([nextGame.start_node]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate crater map");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNewGame();
  }, [loadNewGame]);

  const handleNodeClick = (node: string) => {
    if (!loading && graph[currentHead]?.includes(node)) {
      setPath((previous) => [...previous, node]);
      setResult(null);
      setError(null);
    }
  };

  const handleReset = () => {
    if (!loading && startNode) {
      setPath([startNode]);
      setResult(null);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (!game || loading || path.length < 2 || result) return;

    setLoading(true);
    setError(null);
    try {
      const response = await gameApi.submitCraterTraverse(game.graph, path, game.start_node);
      setResult(response);
      onPowerConsumed(response.power_consumed);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network traversal submission failed");
    } finally {
      setLoading(false);
    }
  };

  const isEdgeTraversed = (from: string, to: string) =>
    path.some((node, index) => index < path.length - 1 && ((node === from && path[index + 1] === to) || (node === to && path[index + 1] === from)));

  const displayNode = (node: string) => nodePositions[node]?.label ?? node;

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
        <div>
          <span className="text-cyan-400 font-bold">OBJECTIVE:</span> Deploy perimeter sensors to visit{" "}
          <span className="text-slate-200 font-bold">all {nodes.length || 10} craters</span> in the minimum number of steps (BFS).
        </div>
        <div className="text-[11px] text-slate-400 font-mono">
          Sensors Online: <span className="text-cyan-400 font-bold">{visitedNodes.size} / {nodes.length || 10}</span>
        </div>
      </div>

      <div className="flex-1 min-h-[280px] bg-slate-900/90 border border-slate-700/80 rounded-lg p-3 relative flex items-center justify-center">
        {game ? (
          <svg viewBox="0 0 560 360" className="w-full h-full select-none">
            {edges.map(([from, to]) => {
              const start = nodePositions[from];
              const end = nodePositions[to];
              const traversed = isEdgeTraversed(from, to);

              return (
                <line
                  key={`${from}-${to}`}
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                  stroke={traversed ? "#22d3ee" : "#475569"}
                  strokeWidth={traversed ? "3" : "1.5"}
                />
              );
            })}

            {nodes.map((nodeKey) => {
              const node = nodePositions[nodeKey];
              const isHead = currentHead === nodeKey;
              const isVisited = visitedNodes.has(nodeKey);
              const isNeighbor = graph[currentHead]?.includes(nodeKey) ?? false;

              return (
                <g
                  key={nodeKey}
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={() => handleNodeClick(nodeKey)}
                  className={isNeighbor ? "cursor-pointer" : "cursor-default"}
                >
                  <circle
                    r={isHead ? "16" : "13"}
                    fill={isHead ? "#0369a1" : isVisited ? "#083344" : "#0f172a"}
                    stroke={isHead ? "#38bdf8" : isVisited ? "#22d3ee" : isNeighbor ? "#a5f3fc" : "#475569"}
                    strokeWidth={isHead ? "3" : isVisited ? "2.5" : "1.5"}
                  />
                  {isNeighbor && (
                    <circle r="19" fill="none" stroke="#22d3ee" strokeWidth="1" strokeDasharray="2" className="animate-pulse" />
                  )}
                  <text
                    y="27"
                    textAnchor="middle"
                    fill={isVisited ? "#f1f5f9" : "#94a3b8"}
                    fontSize="9"
                    fontWeight="bold"
                    fontFamily="monospace"
                    pointerEvents="none"
                  >
                    {node.label}
                  </text>
                </g>
              );
            })}
          </svg>
        ) : (
          <span className="text-xs text-slate-400">{error ?? "Generating crater map..."}</span>
        )}
      </div>

      <div className="flex flex-wrap justify-between items-center gap-2 bg-slate-900/60 p-2.5 rounded border border-slate-800">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[11px] text-slate-400 uppercase font-semibold">Traverse Hops:</span>
          <span className="text-xs text-cyan-400 font-bold font-mono">{Math.max(0, path.length - 1)} steps</span>
          <span className="text-[10px] text-slate-500 font-mono truncate">
            ({path.map(displayNode).join(" → ")})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => void loadNewGame()} disabled={loading} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold rounded border border-slate-600 disabled:opacity-40">
            NEW MAP
          </button>
          <button onClick={handleReset} disabled={loading || !game} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded border border-slate-600 disabled:opacity-40">
            RESET
          </button>
          <button onClick={handleSubmit} disabled={loading || path.length < 2 || !!result} className="px-4 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400 text-cyan-300 text-xs font-bold rounded tracking-wider disabled:opacity-40 disabled:cursor-not-allowed">
            {loading ? "CHECKING BFS..." : "ESTABLISH SENSOR NETWORK"}
          </button>
        </div>
      </div>

      {error && <div className="text-xs text-rose-400 p-2 border border-rose-500/40 bg-rose-950/40 rounded">{error}</div>}

      {result && (
        <div className="text-xs p-3 border border-slate-700 bg-slate-900/95 rounded space-y-2">
          <div className="flex items-center justify-between">
            <span className={`font-bold px-2 py-0.5 rounded text-[10px] tracking-wider ${result.status === "OPTIMAL_TRAVERSAL" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" : result.status === "SUBOPTIMAL_TRAVERSAL" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40" : "bg-amber-500/20 text-amber-400 border border-amber-500/40"}`}>
              STATUS: {result.status}
            </span>
            <span className="text-amber-400 font-mono font-bold">Power consumed: {result.power_consumed.toFixed(2)}</span>
          </div>

          <p className="text-slate-200">{result.message}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-slate-800 text-[11px] font-mono">
            <div>
              <span className="text-slate-500 block">Your Steps:</span>
              <span className="text-cyan-400 font-bold">{result.player_steps}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Optimal Steps:</span>
              <span className="text-emerald-400 font-bold">{result.optimal.steps ?? "N/A"}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Craters Visited:</span>
              <span className="text-slate-300 font-bold">{result.craters_visited_count} / {result.total_craters}</span>
            </div>
            <div>
              <span className="text-slate-500 block">BFS Discovery:</span>
              <span className="text-slate-300 font-bold">{result.optimal.bfs_discovery_order.map(displayNode).join(" → ")}</span>
            </div>
          </div>
          {result.unvisited_craters.length > 0 && (
            <p className="text-amber-300">Not visited: {result.unvisited_craters.map(displayNode).join(", ")}</p>
          )}
        </div>
      )}
    </div>
  );
};
