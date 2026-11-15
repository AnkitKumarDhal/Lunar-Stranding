import { useEffect, useRef, useState } from "react";
import { gameApi, type SolarPanelsResponse } from "@/services/api";

interface EdgeDef {
  u: string;
  v: string;
  w: number;
  lx: number;
  ly: number;
}

interface NodePosition {
  x: number;
  y: number;
  label: string;
}

interface SolarPanelsGameProps {
  onCompleted?: () => void;
}

export const SolarPanelsGame = ({ onCompleted }: SolarPanelsGameProps) => {
  const [graph, setGraph] = useState<Record<string, Record<string, number>>>(
    {},
  );
  const [startNode, setStartNode] = useState("A");
  const [selectedEdges, setSelectedEdges] = useState<[string, string][]>([]);
  const [result, setResult] = useState<SolarPanelsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoaded = useRef(false);

  const nodes = Object.keys(graph);
  const nodeCoords: Record<string, NodePosition> = Object.fromEntries(
    nodes.map((node, index) => {
      const angle = (2 * Math.PI * index) / nodes.length - Math.PI / 2;
      return [
        node,
        {
          x: 250 + 180 * Math.cos(angle),
          y: 150 + 115 * Math.sin(angle),
          label: `PANEL ${node}`,
        },
      ];
    }),
  );

  // Draw each undirected edge once and place its weight at the midpoint.
  const allEdges: EdgeDef[] = Object.entries(graph).flatMap(([u, neighbors]) =>
    Object.entries(neighbors)
      .filter(([v]) => u < v)
      .map(([v, w]) => ({
        u,
        v,
        w,
        lx: (nodeCoords[u].x + nodeCoords[v].x) / 2,
        ly: (nodeCoords[u].y + nodeCoords[v].y) / 2,
      })),
  );

  const loadNewGame = async () => {
    setLoading(true);
    setError(null);
    setGraph({});
    setSelectedEdges([]);
    setResult(null);

    try {
      const game = await gameApi.newSolarPanelsGame();
      setGraph(game.graph);
      setStartNode(game.start_node);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate grid");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasLoaded.current) {
      hasLoaded.current = true;
      void loadNewGame();
    }
  }, []);

  // Check and toggle an undirected cable connection.
  const isSelected = (u: string, v: string) =>
    selectedEdges.some(
      ([a, b]) => (a === u && b === v) || (a === v && b === u),
    );

  const toggleEdge = (u: string, v: string) => {
    setResult(null);
    setSelectedEdges((prev) => {
      const exists = prev.some(
        ([a, b]) => (a === u && b === v) || (a === v && b === u),
      );
      return exists
        ? prev.filter(
            ([a, b]) => !((a === u && b === v) || (a === v && b === u)),
          )
        : [...prev, [u, v]];
    });
  };

  const handleReset = () => {
    setSelectedEdges([]);
    setResult(null);
    setError(null);
  };

  // Show the cable length selected by the player so far.
  const currentCost = selectedEdges.reduce(
    (sum, [u, v]) => sum + (graph[u]?.[v] ?? graph[v]?.[u] ?? 0),
    0,
  );
  const panelCount = nodes.length || 10;
  const requiredEdges = panelCount - 1;

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await gameApi.submitSolarPanels(
        graph,
        selectedEdges,
        startNode,
      );
      setResult(res);
      if (res.status === "OPTIMAL" || res.status === "SUBOPTIMAL") {
        onCompleted?.();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Grid submission failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Explain the objective and the number of required connections. */}
      <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
        <div>
          <span className="text-cyan-400 font-bold">OBJECTIVE:</span> Connect
          all{" "}
          <span className="text-slate-200 font-bold">
            {panelCount} solar panels
          </span>{" "}
          using minimum total cable length (Prim&apos;s MST).
        </div>
        <div className="text-[11px] text-slate-400 font-mono">
          Required Cables:{" "}
          <span className="text-amber-400 font-bold">{requiredEdges || 9}</span>
        </div>
      </div>

      {/* Render the randomized graph. */}
      <div className="flex-1 min-h-[280px] bg-slate-900/90 border border-slate-700/80 rounded-lg p-3 relative flex items-center justify-center">
        {nodes.length === 0 ? (
          <span className="text-xs text-slate-400">
            {loading ? "GENERATING SOLAR GRID..." : "NO GRID AVAILABLE"}
          </span>
        ) : (
          <svg viewBox="0 0 500 300" className="w-full h-full select-none">
            {allEdges.map((edge) => {
              const p1 = nodeCoords[edge.u];
              const p2 = nodeCoords[edge.v];
              const active = isSelected(edge.u, edge.v);

              return (
                <g
                  key={`${edge.u}-${edge.v}`}
                  onClick={() => !loading && toggleEdge(edge.u, edge.v)}
                  className="cursor-pointer group"
                >
                  <line
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke="transparent"
                    strokeWidth="18"
                  />
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
                  <rect
                    x={edge.lx - 13}
                    y={edge.ly - 8}
                    width="26"
                    height="16"
                    fill="#0f172a"
                    stroke={active ? "#06b6d4" : "#334155"}
                    strokeWidth="1"
                    rx="3"
                  />
                  <text
                    x={edge.lx}
                    y={edge.ly + 4}
                    textAnchor="middle"
                    fill={active ? "#22d3ee" : "#94a3b8"}
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {edge.w}m
                  </text>
                </g>
              );
            })}

            {Object.entries(nodeCoords).map(([key, node]) => {
              const isHub = key === startNode;
              const isConnected = selectedEdges.some(
                ([a, b]) => a === key || b === key,
              );

              return (
                <g key={key} transform={`translate(${node.x}, ${node.y})`}>
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
        )}
      </div>

      {/* Grid controls and current cable cost. */}
      <div className="flex flex-wrap justify-between items-center gap-2 bg-slate-900/60 p-2.5 rounded border border-slate-800">
        <div className="flex items-center gap-4 text-xs font-mono">
          <div>
            <span className="text-slate-500">CABLES CONNECTED: </span>
            <span
              className={`font-bold ${selectedEdges.length === requiredEdges ? "text-emerald-400" : "text-amber-400"}`}
            >
              {selectedEdges.length} / {requiredEdges}
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
            disabled={loading || nodes.length === 0}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded border border-slate-600 transition-colors disabled:opacity-40"
          >
            RESET
          </button>
          <button
            onClick={() => void loadNewGame()}
            disabled={loading}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded border border-slate-600 transition-colors disabled:opacity-40"
          >
            NEW GRID
          </button>
          <button
            onClick={handleSubmit}
            disabled={
              loading || nodes.length === 0 || selectedEdges.length === 0
            }
            className="px-4 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400 text-cyan-300 text-xs font-bold rounded tracking-wider disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "CALCULATING MST..." : "CONNECT POWER GRID"}
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
          <div>
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
          </div>

          <p className="text-slate-200">{result.message}</p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-[11px] font-mono">
            <div>
              <span className="text-slate-500 block">Your Cable Length:</span>
              <span className="text-amber-400 font-bold">
                {result.player_cost}m
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Optimal MST Length:</span>
              <span className="text-emerald-400 font-bold">
                {result.optimal_cost}m
              </span>
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
