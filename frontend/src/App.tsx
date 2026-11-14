import { useState } from "react";
import Hud, { DailyRoutinePanel } from "./components/Hud";
import { MapBox } from "./components/MapBoxes";
import { TacticalTabletModal } from "./components/TacticalTabletModal";
import { HazardInterruptModal } from "./components/HazardInterruptModal";
import { WaterRoverGame } from "./minigames/WaterRoverGame";
import { CraterTraverseGame } from "./minigames/CraterTraverseGame";
import { SampleRetrievalGame } from "./minigames/SampleRetrievalGame";
import { FoodProductionGame } from "./minigames/FoodProductionGame";

import type {
  FacilityType,
  DailyTasksState,
  HazardPayload,
} from "./types/game";

interface Facility {
  id: string;
  type: FacilityType;
  label: string;
  title: string;
  subtitle: string;
  top: string;
  left: string;
  accentColor: "cyan" | "amber" | "emerald";
  statusBadge?: string;
}

const FACILITIES: Facility[] = [
  {
    id: "solar-array",
    type: "solar",
    label: "Solar Panels",
    title: "SOLAR MICROGRID ARRAY",
    subtitle: "PRIM'S MST // CABLE ROUTING & MAST CALIBRATION",
    top: "22%",
    left: "18%",
    accentColor: "cyan",
  },
  {
    id: "rover-garage",
    type: "garage",
    label: "Rover Workshop",
    title: "ROVER SERVICING BAY",
    subtitle: "ASSEMBLY LINE SCHEDULING // DIAGNOSTICS & REPAIR",
    top: "35%",
    left: "16%",
    accentColor: "cyan",
  },
  {
    id: "crater-sensors",
    type: "crater_sensors",
    label: "Crater Sensors",
    title: "CRATER PERIMETER SENSORS",
    subtitle: "BREADTH-FIRST SEARCH // VISIT EVERY CRATER",
    top: "35%",
    left: "45%",
    accentColor: "cyan",
  },
  {
    id: "radio-dish",
    type: "radio",
    label: "Radio Dish",
    title: "DEEP SPACE COMMS DISH",
    subtitle: "RABIN-KARP & HUFFMAN // SIGNAL LOCK & COMPRESSION",
    top: "42%",
    left: "64%",
    accentColor: "cyan",
  },
  {
    id: "water-rover",
    type: "water_rover",
    label: "Water Rover",
    title: "WATER EXTRACTION ROVER",
    subtitle: "DIJKSTRA // LEAST-ENERGY CRATER SLOPE NAVIGATION",
    top: "68%",
    left: "35%",
    accentColor: "amber",
    statusBadge: "READY",
  },
  {
    id: "mining-rover",
    type: "mining_rover",
    label: "Mining Rover",
    title: "PRESSURIZED MINING ROVER",
    subtitle: "BELLMAN-FORD & 0/1 KNAPSACK // EXCAVATION & CARGO",
    top: "65%",
    left: "82%",
    accentColor: "amber",
  },
  {
    id: "greenhouse",
    type: "greenhouse",
    label: "Greenhouse",
    title: "HYDROPONICS GREENHOUSE",
    subtitle: "ACTIVITY SELECTION // NON-OVERLAPPING LED SCHEDULE",
    top: "86%",
    left: "49%",
    accentColor: "emerald",
  },
];

export default function App() {
  const [activeFacility, setActiveFacility] = useState<FacilityType | null>(
    null,
  );

  const [dailyTasks, setDailyTasks] = useState<DailyTasksState>({
    eclss: false,
    suitport: false,
    exercise: false,
    solarHeightAdjusted: false,
  });

  const activeHazard: HazardPayload | null = null;

  const selectedFacility = FACILITIES.find(
    (facility) => facility.type === activeFacility,
  );

  const handleToggleDailyTask = (key: keyof DailyTasksState) => {
    setDailyTasks((previous) => ({
      ...previous,
      [key]: true,
    }));
  };

  const handleExecuteHazardAction = (actionId: string) => {
    console.warn("Hazard action is not connected yet:", actionId);
  };

  return (
    <div className="relative flex h-screen w-screen select-none items-center justify-center overflow-hidden bg-black">
      {/* LUNAR MAP */}

      <div
        className="relative bg-[url('/moon.png')] bg-cover bg-center bg-no-repeat shadow-[0_0_50px_rgba(6,182,212,0.15)]"
        style={{
          width: "min(100vw, 100vh * (16/9))",
          height: "min(100vh, 100vw * (9/16))",
        }}
      >
        <div className="pointer-events-auto absolute inset-0 z-10">
          {FACILITIES.map((facility) => (
            <MapBox
              key={facility.id}
              id={facility.id}
              type={facility.type}
              label={facility.label}
              top={facility.top}
              left={facility.left}
              accentColor={facility.accentColor}
              statusBadge={facility.statusBadge}
              onClick={() => setActiveFacility(facility.type)}
            />
          ))}
        </div>
      </div>

      {/* HUD */}

      <Hud />

      <DailyRoutinePanel
        tasks={dailyTasks}
        onToggleTask={handleToggleDailyTask}
      />

      {/* FACILITY MODAL */}

      {selectedFacility && (
        <TacticalTabletModal
          title={selectedFacility.title}
          subtitle={selectedFacility.subtitle}
          onClose={() => setActiveFacility(null)}
        >
          {activeFacility === "water_rover" && <WaterRoverGame />}
          {activeFacility === "crater_sensors" && <CraterTraverseGame />}
          {activeFacility === "mining_rover" && <SampleRetrievalGame />}
          {activeFacility === "greenhouse" && <FoodProductionGame />}
          {activeFacility === "solar" && (
            <div className="flex h-80 items-center justify-center text-xs text-slate-400">
              [ SOLAR MICROGRID MINIGAME VIEWPORT ]
            </div>
          )}

          {activeFacility === "radio" && (
            <div className="flex h-80 items-center justify-center text-xs text-slate-400">
              [ RADIO COMMS MINIGAME VIEWPORT ]
            </div>
          )}

          {activeFacility === "garage" && (
            <div className="flex h-80 items-center justify-center text-xs text-slate-400">
              [ ROVER SERVICING MINIGAME VIEWPORT ]
            </div>
          )}
        </TacticalTabletModal>
      )}

      {/* HAZARD MODAL */}

      <HazardInterruptModal
        hazard={activeHazard}
        onExecuteAction={handleExecuteHazardAction}
      />
    </div>
  );
}
