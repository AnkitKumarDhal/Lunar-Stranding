// src/components/MapBoxes.tsx
import React from "react";
import { Radio, Sprout, Wrench, Radar } from "lucide-react";
import type { FacilityType } from "../types/game";

export const RoverSvg = () => (
  <svg
    viewBox="0 0 36 36"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    className="w-7 h-7"
  >
    <path
      d="M12 10V5h5v3M14.5 5V2.5M10 15l3-5h12l3 5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <rect
      x="6"
      y="15"
      width="24"
      height="8"
      rx="1.5"
      fill="currentColor"
      fillOpacity="0.15"
    />
    <path d="M9 23l-2 4M18 23v4M27 23l2 4" strokeLinecap="round" />
    <circle cx="7" cy="28" r="3" fill="#020617" />
    <circle cx="18" cy="28" r="3" fill="#020617" />
    <circle cx="29" cy="28" r="3" fill="#020617" />
  </svg>
);

export const SolarSvg = () => (
  <svg
    viewBox="0 0 36 36"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    className="w-7 h-7"
  >
    <polygon
      points="4,16 14,7 32,11 22,20"
      fill="currentColor"
      fillOpacity="0.15"
      strokeLinejoin="round"
    />
    <line x1="9" y1="11.5" x2="27" y2="15.5" />
    <line x1="18" y1="8" x2="10" y2="17" />
    <line x1="25" y1="9.5" x2="17" y2="18.5" />
    <path d="M18 19v10M12 29h12" strokeLinecap="round" />
  </svg>
);

interface MapNodeProps {
  id: string;
  type: FacilityType;
  label: string;
  top: string;
  left: string;
  accentColor: "cyan" | "amber" | "emerald";
  statusBadge?: string;
  onClick: () => void;
}

const colorMap = {
  cyan: "border-cyan-400/80 text-cyan-300 bg-slate-950/85 hover:border-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.25)]",
  amber:
    "border-amber-400/80 text-amber-300 bg-slate-950/85 hover:border-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.25)]",
  emerald:
    "border-emerald-400/80 text-emerald-300 bg-slate-950/85 hover:border-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.25)]",
};

export const MapBox: React.FC<MapNodeProps> = ({
  id,
  type,
  label,
  top,
  left,
  accentColor,
  statusBadge,
  onClick,
}) => {
  const renderIcon = () => {
    switch (type) {
      case "water_rover":
      case "mining_rover":
        return <RoverSvg />;
      case "solar":
        return <SolarSvg />;
      case "radio":
        return <Radio className="w-6 h-6" />;
      case "greenhouse":
        return <Sprout className="w-6 h-6" />;
      case "garage":
        return <Wrench className="w-6 h-6" />;
      case "crater_sensors":
        return <Radar className="w-6 h-6" />;
    }
  };

  return (
    <button
      id={id}
      onClick={onClick}
      className="absolute flex flex-col items-center gap-1.5 cursor-pointer transition-transform duration-150 hover:scale-105 active:scale-95"
      style={{ top, left, transform: "translate(-50%, -50%)" }}
    >
      <div
        className={`relative w-12 h-12 rounded-lg border flex items-center justify-center backdrop-blur-md ${colorMap[accentColor]}`}
      >
        {renderIcon()}
        {statusBadge && (
          <span className="absolute -top-2 -right-2 px-1.5 py-0.5 text-[9px] font-mono font-bold bg-slate-950 border border-current rounded">
            {statusBadge}
          </span>
        )}
      </div>

      <span className="px-2.5 py-0.5 rounded bg-slate-950/90 border border-slate-700/80 text-[11px] font-mono font-bold tracking-wider text-slate-100 whitespace-nowrap shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
        {label}
      </span>
    </button>
  );
};
