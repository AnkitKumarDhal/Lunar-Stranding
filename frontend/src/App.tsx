import Hud from "./components/Hud";
import { MapBox } from "./components/MapBoxes";

export default function App() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none flex items-center justify-center">
      <div
        className="relative bg-[url(/moon.png)] bg-cover bg-center bg-no-repeat shadow-[0_0_50px_rgba(6,182,212,0.15)]"
        style={{
          width: "min(100vw, 100vh * (16/9))",
          height: "min(100vh, 100vw * (9/16))",
        }}
      >
        {/* Layer 1: Interactive Map Markers */}
        <div className="absolute inset-0 z-10 pointer-events-auto">
          <MapBox
            id="solar-array"
            label="SOLAR ARRAY"
            top="22%"
            left="18%"
            colorClass="border-cyan-500 text-cyan-400"
            onClick={() => console.log("Solar Array clicked")}
          />

          <MapBox
            id="habitat-base"
            label="HABITAT BASE"
            top="52%"
            left="27%"
            colorClass="border-cyan-500 text-cyan-400"
            onClick={() => console.log("Habitat clicked")}
          />

          <MapBox
            id="rover-unit"
            label="ROVER UNIT"
            top="70%"
            left="40%"
            colorClass="border-amber-500 text-amber-400"
            onClick={() => console.log("Rover clicked")}
          />
        </div>
      </div>

      {/* Layer 2: HUD & UI */}
      <Hud />
    </div>
  );
}
