// frontend/src/components/minigames/WaterRoverGame.tsx
import React, { useState } from "react";
import { gameApi } from "@/services/api";

const MOCK_GRAPH = {
  Base: { NodeA: 15, NodeB: 25 },
  NodeA: { Base: 15, NodeC: 10, NodeD: 30 },
  NodeB: { Base: 25, NodeC: 5, IceDeposit: 40 },
  NodeC: { NodeA: 10, NodeB: 5, IceDeposit: 20 },
  NodeD: { NodeA: 30, IceDeposit: 10 },
  IceDeposit: { NodeB: 40, NodeC: 20, NodeD: 10 },
};

export const WaterRoverGame = () => {
  const [path, setPath] = useState<string[]>(["Base"]);
  const [result, setResult] = useState<any>(null);

  const handleNodeClick = (node: string) => {
    const lastNode = path[path.length - 1];
    // Only allow clicking connected nodes
    if (MOCK_GRAPH[lastNode as keyof typeof MOCK_GRAPH]?.[node as never]) {
      setPath([...path, node]);
    }
  };

  const handleSubmit = async () => {
    try {
      const res = await gameApi.submitWaterRoverPath(MOCK_GRAPH, path, 100.0);
      setResult(res);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex-1 bg-slate-900 border border-slate-700 rounded p-4 flex items-center justify-center relative">
        <svg viewBox="0 0 400 300" className="w-full h-full text-slate-500">
          {/* Edges */}
          <line
            x1="50"
            y1="150"
            x2="150"
            y2="80"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="4"
          />
          <text x="90" y="110" fill="currentColor" fontSize="10">
            15 kWh
          </text>

          <line
            x1="50"
            y1="150"
            x2="150"
            y2="220"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="4"
          />
          <text x="90" y="200" fill="currentColor" fontSize="10">
            25 kWh
          </text>

          <line
            x1="150"
            y1="80"
            x2="250"
            y2="150"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="4"
          />
          <text x="210" y="110" fill="currentColor" fontSize="10">
            10 kWh
          </text>

          <line
            x1="150"
            y1="220"
            x2="250"
            y2="150"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="4"
          />
          <text x="190" y="200" fill="currentColor" fontSize="10">
            5 kWh
          </text>

          <line
            x1="250"
            y1="150"
            x2="350"
            y2="150"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="4"
          />
          <text x="290" y="140" fill="currentColor" fontSize="10">
            20 kWh
          </text>

          {/* Nodes */}
          <g
            transform="translate(50, 150)"
            onClick={() => handleNodeClick("Base")}
            className="cursor-pointer hover:text-cyan-400 transition-colors"
          >
            <circle
              r="15"
              fill="#0f172a"
              stroke="currentColor"
              strokeWidth="2"
            />
            <text y="30" textAnchor="middle" fill="currentColor" fontSize="10">
              BASE
            </text>
          </g>

          <g
            transform="translate(150, 80)"
            onClick={() => handleNodeClick("NodeA")}
            className="cursor-pointer hover:text-cyan-400 transition-colors"
          >
            <circle
              r="15"
              fill="#0f172a"
              stroke={path.includes("NodeA") ? "#22d3ee" : "currentColor"}
              strokeWidth="2"
            />
            <text y="30" textAnchor="middle" fill="currentColor" fontSize="10">
              NODE A
            </text>
          </g>

          <g
            transform="translate(150, 220)"
            onClick={() => handleNodeClick("NodeB")}
            className="cursor-pointer hover:text-cyan-400 transition-colors"
          >
            <circle
              r="15"
              fill="#0f172a"
              stroke={path.includes("NodeB") ? "#22d3ee" : "currentColor"}
              strokeWidth="2"
            />
            <text y="30" textAnchor="middle" fill="currentColor" fontSize="10">
              NODE B
            </text>
          </g>

          <g
            transform="translate(250, 150)"
            onClick={() => handleNodeClick("NodeC")}
            className="cursor-pointer hover:text-cyan-400 transition-colors"
          >
            <circle
              r="15"
              fill="#0f172a"
              stroke={path.includes("NodeC") ? "#22d3ee" : "currentColor"}
              strokeWidth="2"
            />
            <text y="30" textAnchor="middle" fill="currentColor" fontSize="10">
              NODE C
            </text>
          </g>

          <g
            transform="translate(350, 150)"
            onClick={() => handleNodeClick("IceDeposit")}
            className="cursor-pointer hover:text-cyan-400 transition-colors"
          >
            <circle
              r="15"
              fill="#0f172a"
              stroke={path.includes("IceDeposit") ? "#22d3ee" : "currentColor"}
              strokeWidth="2"
            />
            <text y="30" textAnchor="middle" fill="currentColor" fontSize="10">
              ICE DEPOSIT
            </text>
          </g>
        </svg>
      </div>

      <div className="flex justify-between items-center">
        <span className="text-[11px] text-cyan-400">
          ROUTE: {path.join(" -> ")}
        </span>
        <button
          onClick={handleSubmit}
          className="px-4 py-2 bg-amber-500/20 border border-amber-400 text-amber-400 text-xs font-bold rounded"
        >
          TRANSMIT ROUTE
        </button>
      </div>

      {result && (
        <div className="text-xs text-slate-300 p-2 border border-slate-700 bg-slate-900">
          <span className="font-bold text-amber-400">
            STATUS: {result.status}
          </span>
          <br />
          {result.message}
        </div>
      )}
    </div>
  );
};
