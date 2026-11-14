import React from "react";

interface MapBoxProps {
  id: string;
  label: string;
  top: string;
  left: string;
  colorClass: string;
  onClick: () => void;
}

export const MapBox: React.FC<MapBoxProps> = ({
  id,
  label,
  top,
  left,
  colorClass,
  onClick,
}) => {
  return (
    <button
      id={id}
      onClick={onClick}
      className={`absolute group flex items-center justify-center w-12 h-12 bg-slate-950/40 backdrop-blur-sm border-2 cursor-pointer transition-all hover:scale-110 hover:bg-slate-900/80 shadow-[0_0_12px_currentColor] ${colorClass}`}
      style={{ top, left, transform: "translate(-50%, -50%)" }}
    >
      {/* Corner accents for a sci-fi targeting reticle look */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-current"></div>
      <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-current"></div>
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-current"></div>
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-current"></div>

      {/* 3-Letter ID inside the box */}
      <span className="font-mono text-xs font-bold tracking-widest">
        {label.substring(0, 3)}
      </span>

      {/* Full Label (Reveals on hover) */}
      <span className="absolute -top-7 text-[10px] font-mono tracking-widest bg-black/90 px-2 py-1 border border-current whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
        {label}
      </span>
    </button>
  );
};
