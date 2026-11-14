// frontend/src/components/minigames/CraterTraverseGame.tsx
import React, { useState } from "react";
import { gameApi } from "@/services/api";

const MOCK_BFS_GRAPH = {
  Crater_Alpha: ["Rim_1", "Rim_2"],
  Rim_1: ["Crater_Alpha", "Ridge_1", "Crater_Zeta"],
  Rim_2: ["Crater_Alpha", "Ridge_2"],
  Ridge_1: ["Rim_1", "Crater_Zeta"],
  Ridge_2: ["Rim_2", "Crater_Zeta"],
  Crater_Zeta: ["Rim_1", "Ridge_1", "Ridge_2"],
};

export const CraterTraverseGame = () => {
  const [path, setPath] = useState<string[]>(["Crater_Alpha"]);
  const [result, setResult] = useState<any>(null);

  const handleNodeClick = (node: string) => {
    const lastNode = path[path.length - 1];
    if (
      MOCK_BFS_GRAPH[lastNode as keyof typeof MOCK_BFS_GRAPH]?.includes(node)
    ) {
      setPath([...path, node]);
    }
  };

  const handleSubmit = async () => {
    try {
      const res = await gameApi.submitCraterTraverse(MOCK_BFS_GRAPH, path);
      setResult(res);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex-1 bg-slate-900 border border-slate-700 rounded p-4 flex items-center justify-center">
        <svg viewBox="0 0 400 300" className="w-full h-full text-slate-500">
          <line
            x1="50"
            y1="150"
            x2="150"
            y2="80"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="4"
          />
          <line
            x1="50"
            y1="150"
            x2="150"
            y2="220"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="4"
          />
          <line
            x1="150"
            y1="80"
            x2="250"
            y2="80"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="4"
          />
          <line
            x1="150"
            y1="80"
            x2="350"
            y2="150"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="4"
          />
          <line
            x1="150"
            y1="220"
            x2="250"
            y2="220"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="4"
          />
          <line
            x1="250"
            y1="80"
            x2="350"
            y2="150"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="4"
          />
          <line
            x1="250"
            y1="220"
            x2="350"
            y2="150"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="4"
          />

          {/* Render nodes with similar <g> logic as Water Rover... */}
          <g
            transform="translate(50, 150)"
            onClick={() => handleNodeClick("Crater_Alpha")}
            className="cursor-pointer hover:text-cyan-400"
          >
            <circle
              r="15"
              fill="#0f172a"
              stroke="currentColor"
              strokeWidth="2"
            />
            <text y="30" textAnchor="middle" fill="currentColor" fontSize="10">
              ALPHA
            </text>
          </g>
          <g
            transform="translate(150, 80)"
            onClick={() => handleNodeClick("Rim_1")}
            className="cursor-pointer hover:text-cyan-400"
          >
            <circle
              r="15"
              fill="#0f172a"
              stroke={path.includes("Rim_1") ? "#22d3ee" : "currentColor"}
              strokeWidth="2"
            />
            <text y="30" textAnchor="middle" fill="currentColor" fontSize="10">
              RIM 1
            </text>
          </g>
          <g
            transform="translate(150, 220)"
            onClick={() => handleNodeClick("Rim_2")}
            className="cursor-pointer hover:text-cyan-400"
          >
            <circle
              r="15"
              fill="#0f172a"
              stroke={path.includes("Rim_2") ? "#22d3ee" : "currentColor"}
              strokeWidth="2"
            />
            <text y="30" textAnchor="middle" fill="currentColor" fontSize="10">
              RIM 2
            </text>
          </g>
          <g
            transform="translate(350, 150)"
            onClick={() => handleNodeClick("Crater_Zeta")}
            className="cursor-pointer hover:text-cyan-400"
          >
            <circle
              r="15"
              fill="#0f172a"
              stroke={path.includes("Crater_Zeta") ? "#22d3ee" : "currentColor"}
              strokeWidth="2"
            />
            <text y="30" textAnchor="middle" fill="currentColor" fontSize="10">
              ZETA
            </text>
          </g>
        </svg>
      </div>

      <div className="flex justify-between items-center">
        <span className="text-[11px] text-cyan-400">
          HOPS: {path.length - 1}
        </span>
        <button
          onClick={handleSubmit}
          className="px-4 py-2 bg-cyan-500/20 border border-cyan-400 text-cyan-300 text-xs font-bold rounded"
        >
          ESTABLISH NETWORK
        </button>
      </div>

      {result && (
        <div className="text-xs text-slate-300 p-2 border border-slate-700 bg-slate-900">
          <span className="font-bold text-cyan-400">
            STATUS: {result.status}
          </span>
          <br />
          {result.message}
        </div>
      )}
    </div>
  );
};
