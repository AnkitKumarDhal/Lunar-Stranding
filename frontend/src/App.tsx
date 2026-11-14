// src/App.tsx
import { useState } from "react";
import Hud, { DailyRoutinePanel } from "./components/Hud";
import { MapBox } from "./components/MapBoxes";
import { TacticalTabletModal } from "./components/TacticalTabletModal";
import { HazardInterruptModal } from "./components/HazardInterruptModal";
import type {
  FacilityType,
  DailyTasksState,
  HazardPayload,
} from "./types/game";

// Mini-game components
import { WaterRoverGame } from "./minigames/WaterRoverGame";
import { CraterTraverseGame } from "./minigames/CraterTraverseGame";
import { SolarPanelsGame } from "./minigames/SolarPanelsGame";
import { MiningRoverGame } from "./minigames/MiningRoverGame";
import { FoodProductionGame } from "./minigames/FoodProductionGame";
import { RadioGame } from "./minigames/RadioGame";
import { RoverWorkshopGame } from "./minigames/RoverWorkshopGame";

const FACILITY_META: Record<FacilityType, { title: string; subtitle: string }> =
  {
    solar: {
      title: "SOLAR MICROGRID ARRAY",
      subtitle: "PRIM'S MST // CABLE ROUTING & MAST CALIBRATION",
    },
    water_rover: {
      title: "WATER EXTRACTION ROVER",
      subtitle: "DIJKSTRA // LEAST-ENERGY CRATER SLOPE NAVIGATION",
    },
    mining_rover: {
      title: "PRESSURIZED MINING ROVER",
      subtitle: "BELLMAN-FORD & 0/1 KNAPSACK // EXCAVATION & CARGO",
    },
    crater_sensors: {
      title: "CRATER PERIMETER SENSORS",
      subtitle: "BREADTH-FIRST SEARCH // SENSOR NODE DEPLOYMENT",
    },
    radio: {
      title: "DEEP SPACE COMMS DISH",
      subtitle: "RABIN-KARP & HUFFMAN // SIGNAL LOCK & COMPRESSION",
    },
    greenhouse: {
      title: "HYDROPONICS GREENHOUSE",
      subtitle: "ACTIVITY SELECTION // NON-OVERLAPPING LED SCHEDULE",
    },
    garage: {
      title: "ROVER SERVICING BAY",
      subtitle: "ASSEMBLY LINE SCHEDULING // DIAGNOSTICS & REPAIR",
    },
  };

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

  const [activeHazard] = useState<HazardPayload | null>(null);
  const [power, setPower] = useState(68);
  const [health, setHealth] = useState(80);

  const handleToggleDailyTask = (key: keyof DailyTasksState) => {
    setDailyTasks((prev) => ({ ...prev, [key]: true }));
  };

  const handleExecuteHazardAction = (actionId: string) => {
    console.log("Dispatching emergency action to backend:", actionId);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none flex items-center justify-center">
      <div
        className="relative bg-[url('/moon.png')] bg-cover bg-center bg-no-repeat shadow-[0_0_50px_rgba(6,182,212,0.15)]"
        style={{
          width: "min(100vw, 100vh * (16/9))",
          height: "min(100vh, 100vw * (9/16))",
        }}
      >
        <div className="absolute inset-0 z-10 pointer-events-auto">
          <MapBox
            id="solar-array"
            type="solar"
            label="Solar Panels"
            top="22%"
            left="18%"
            accentColor="cyan"
            onClick={() => setActiveFacility("solar")}
          />

          <MapBox
            id="rover-garage"
            type="garage"
            label="Rover Workshop"
            top="35%"
            left="16%"
            accentColor="cyan"
            onClick={() => setActiveFacility("garage")}
          />

          <MapBox
            id="crater-sensors"
            type="crater_sensors"
            label="Crater Sensors"
            top="35%"
            left="45%"
            accentColor="cyan"
            onClick={() => setActiveFacility("crater_sensors")}
          />

          <MapBox
            id="radio-dish"
            type="radio"
            label="Radio Dish"
            top="42%"
            left="64%"
            accentColor="cyan"
            onClick={() => setActiveFacility("radio")}
          />

          <MapBox
            id="water-rover"
            type="water_rover"
            label="Water Rover"
            top="68%"
            left="35%"
            accentColor="amber"
            statusBadge="READY"
            onClick={() => setActiveFacility("water_rover")}
          />

          <MapBox
            id="mining-rover"
            type="mining_rover"
            label="Mining Rover"
            top="65%"
            left="82%"
            accentColor="amber"
            onClick={() => setActiveFacility("mining_rover")}
          />

          <MapBox
            id="greenhouse"
            type="greenhouse"
            label="Greenhouse"
            top="86%"
            left="49%"
            accentColor="emerald"
            onClick={() => setActiveFacility("greenhouse")}
          />
        </div>
      </div>

      <Hud power={power} health={health} />
      <DailyRoutinePanel
        tasks={dailyTasks}
        onToggleTask={handleToggleDailyTask}
      />

      {activeFacility && (
        <TacticalTabletModal
          title={FACILITY_META[activeFacility].title}
          subtitle={FACILITY_META[activeFacility].subtitle}
          onClose={() => setActiveFacility(null)}
        >
          {activeFacility === "water_rover" && <WaterRoverGame />}

          {activeFacility === "solar" && <SolarPanelsGame />}

          {activeFacility === "crater_sensors" && (
            <CraterTraverseGame
              onPowerConsumed={(amount) =>
                setPower((current) => Math.max(0, Number((current - amount).toFixed(2))))
              }
            />
          )}

          {activeFacility === "mining_rover" && <MiningRoverGame />}

          {activeFacility === "radio" && <RadioGame />}

          {activeFacility === "greenhouse" && (
            <FoodProductionGame
              currentHp={health}
              onPowerConsumed={(amount) =>
                setPower((current) => Math.max(0, Number((current - amount).toFixed(2))))
              }
              onHealthChanged={setHealth}
            />
          )}

          {activeFacility === "garage" && <RoverWorkshopGame />}
        </TacticalTabletModal>
      )}

      <HazardInterruptModal
        hazard={activeHazard}
        onExecuteAction={handleExecuteHazardAction}
      />
    </div>
  );
}
