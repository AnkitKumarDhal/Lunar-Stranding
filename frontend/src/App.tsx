import { useCallback, useEffect, useRef, useState } from "react";
import Hud, { DailyRoutinePanel } from "./components/Hud";
import { MapBox } from "./components/MapBoxes";
import { TacticalTabletModal } from "./components/TacticalTabletModal";
import { StoryDialogue } from "./components/StoryDialogue";
import type { DailyTasksState, FacilityType } from "./types/game";
import {
  AUTONOMY_WINDOW_SECONDS,
  STORY_STEPS,
  type StoryMissionId,
  type StoryOutcome,
  type StoryStep,
} from "./story/storyFlow";

import { WaterRoverGame } from "./minigames/WaterRoverGame";
import { CraterTraverseGame } from "./minigames/CraterTraverseGame";
import { SolarPanelsGame } from "./minigames/SolarPanelsGame";
import { MiningRoverGame } from "./minigames/MiningRoverGame";
import { FoodProductionGame } from "./minigames/FoodProductionGame";
import { RadioGame } from "./minigames/RadioGame";
import { RoverWorkshopGame } from "./minigames/RoverWorkshopGame";

const STORAGE_KEY = "lunar-stranding-story-v1";
const POWER_STORAGE_KEY = "lunar-stranding-power-v1";
const INITIAL_POWER = 100;
const AUTONOMY_WINDOW_MS = AUTONOMY_WINDOW_SECONDS * 1000;

function loadPower() {
  const saved = localStorage.getItem(POWER_STORAGE_KEY);
  const value = saved === null ? INITIAL_POWER : Number(saved);
  return Number.isFinite(value)
    ? Math.max(0, Math.min(100, value))
    : INITIAL_POWER;
}

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
      subtitle: "RABIN-KARP & HUFFMAN // SIGNAL LOCK & DECODING",
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

const MISSION_FACILITY: Record<StoryMissionId, FacilityType> = {
  "solar-panels": "solar",
  "signal-match": "radio",
  "signal-decode": "radio",
  "food-production": "greenhouse",
  "water-rover": "water_rover",
  "rover-workshop": "garage",
  "crater-sensors": "crater_sensors",
  "mining-navigation": "mining_rover",
  "sample-retrieval": "mining_rover",
};

const FACILITY_UNLOCK_MISSION: Partial<Record<StoryMissionId, FacilityType>> = {
  "solar-panels": "solar",
  "signal-decode": "radio",
  "food-production": "greenhouse",
  "water-rover": "water_rover",
  "rover-workshop": "garage",
  "crater-sensors": "crater_sensors",
  "sample-retrieval": "mining_rover",
};

const DAILY_MISSIONS: Record<number, { id: StoryMissionId; label: string }[]> = {
  5: [
    { id: "food-production", label: "Greenhouse Scheduling" },
    { id: "water-rover", label: "Water Retrieval" },
    { id: "crater-sensors", label: "Crater Sensor Traverse" },
  ],
  6: [
    { id: "rover-workshop", label: "Rover Servicing" },
    { id: "mining-navigation", label: "Mining Navigation" },
    { id: "sample-retrieval", label: "Lunar Sample Retrieval" },
  ],
  7: [
    { id: "solar-panels", label: "Solar Panel Connections" },
    { id: "signal-match", label: "Radio Signal Matching" },
    { id: "signal-decode", label: "Signal Decoding" },
  ],
};

const ALL_FACILITIES: FacilityType[] = [
  "solar",
  "radio",
  "greenhouse",
  "water_rover",
  "garage",
  "crater_sensors",
  "mining_rover",
];

function isFacilityType(value: unknown): value is FacilityType {
  return (
    typeof value === "string" && ALL_FACILITIES.includes(value as FacilityType)
  );
}

type StoryMode =
  | "dialogue"
  | "choice"
  | "mission"
  | "autonomy"
  | "sandbox"
  | "finished";

interface StoryProgress {
  day: number;
  stepIndex: number;
  lineIndex: number;
  mode: StoryMode;
  autonomyEndsAt: number | null;
  optionalSolar: boolean;
  lastMissionOutcome: StoryOutcome;
  tasks: DailyTasksState;
  unlockedFacilities: FacilityType[];
  completedDailyMissions: StoryMissionId[];
}

const createDailyTasks = (): DailyTasksState => ({
  eclss: false,
  suitport: false,
  exercise: false,
  solarHeightAdjusted: false,
});

const createInitialProgress = (): StoryProgress => ({
  day: 1,
  stepIndex: 0,
  lineIndex: 0,
  mode: "dialogue",
  autonomyEndsAt: null,
  optionalSolar: false,
  lastMissionOutcome: null,
  tasks: createDailyTasks(),
  unlockedFacilities: [],
  completedDailyMissions: [],
});

function getLegacyFacilityUnlocks(
  day: number,
  stepIndex: number,
): FacilityType[] {
  const unlocked = new Set<FacilityType>();

  if (day > 1 || (day === 1 && stepIndex >= 5)) unlocked.add("solar");
  if (day > 1 || (day === 1 && stepIndex >= 11)) unlocked.add("radio");
  if (day > 2 || (day === 2 && stepIndex >= 2)) unlocked.add("greenhouse");
  if (day > 2 || (day === 2 && stepIndex >= 4)) unlocked.add("water_rover");
  if (day > 3 || (day === 3 && stepIndex >= 3)) unlocked.add("garage");
  if (day > 3 || (day === 3 && stepIndex >= 9)) unlocked.add("crater_sensors");
  if (day >= 5 || (day === 4 && stepIndex >= 5)) unlocked.add("mining_rover");

  return [...unlocked];
}

function loadStoryProgress(): StoryProgress {
  const initial = createInitialProgress();

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return initial;

    const parsed = JSON.parse(saved) as Partial<StoryProgress>;

    const validModes: StoryMode[] = [
      "dialogue",
      "choice",
      "mission",
      "autonomy",
      "sandbox",
      "finished",
    ];

    if (
      typeof parsed.day !== "number" ||
      parsed.day < 1 ||
      parsed.day > 7 ||
      typeof parsed.stepIndex !== "number" ||
      typeof parsed.lineIndex !== "number" ||
      !parsed.mode ||
      !validModes.includes(parsed.mode)
    ) {
      return initial;
    }

    const savedUnlocks = Array.isArray(parsed.unlockedFacilities)
      ? parsed.unlockedFacilities.filter(isFacilityType)
      : [];

    const migratedUnlocks = getLegacyFacilityUnlocks(
      parsed.day,
      parsed.stepIndex,
    );

    return {
      ...initial,
      ...parsed,
      unlockedFacilities: [...new Set([...migratedUnlocks, ...savedUnlocks])],
      tasks: { ...initial.tasks, ...(parsed.tasks ?? {}) },
      completedDailyMissions: parsed.completedDailyMissions ?? [],
    };
  } catch {
    return initial;
  }
}

function getStep(progress: StoryProgress): StoryStep | undefined {
  return STORY_STEPS[progress.day]?.[progress.stepIndex];
}

function resolveDialogueLines(
  step: Extract<StoryStep, { type: "dialogue" }>,
  outcome: StoryOutcome,
) {
  if (outcome && step.outcomeLines) {
    return step.outcomeLines[outcome] ?? step.lines;
  }

  return step.lines;
}

function resolveStoryStep(
  progress: StoryProgress,
  day: number,
  requestedIndex: number,
): StoryProgress {
  const steps = STORY_STEPS[day] ?? [];
  let stepIndex = requestedIndex;

  // The optional solar mission has no separate completion dialogue.
  while (
    steps[stepIndex]?.type === "optional-mission" &&
    !progress.optionalSolar
  ) {
    stepIndex += 1;
  }

  const step = steps[stepIndex];

  const base = {
    ...progress,
    day,
    stepIndex,
    lineIndex: 0,
    autonomyEndsAt: null,
  };

  if (!step) {
    return { ...base, mode: "finished" };
  }

  if (step.type === "mission" || step.type === "optional-mission") {
    return { ...base, mode: "mission" };
  }

  if (step.type === "choice") {
    return { ...base, mode: "choice" };
  }

  if (step.type === "autonomy") {
    return {
      ...base,
      mode: "autonomy",
      autonomyEndsAt: Date.now() + AUTONOMY_WINDOW_MS,
    };
  }

  if (step.type === "sandbox") {
    return { ...base, mode: "sandbox" };
  }

  return { ...base, mode: "dialogue" };
}

export default function App() {
  const [story, setStory] = useState<StoryProgress>(loadStoryProgress);
  const [clockNow, setClockNow] = useState(Date.now());
  const dayAdvanceLock = useRef(false);

  const [manualFacility, setManualFacility] = useState<FacilityType | null>(
    null,
  );
  const [tasksOpen, setTasksOpen] = useState(false);
  const [power, setPower] = useState(loadPower);
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(story));
  }, [story]);

  useEffect(() => {
    localStorage.setItem(POWER_STORAGE_KEY, String(power));
    if (power === 0) {
      setGameOver(true);
      setManualFacility(null);
      setTasksOpen(false);
    }
  }, [power]);

  useEffect(() => {
    if (story.mode !== "autonomy") return;

    const timer = window.setInterval(() => setClockNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [story.mode]);

  const advanceDay = useCallback(() => {
    if (dayAdvanceLock.current) return;
    dayAdvanceLock.current = true;

    setManualFacility(null);
    setTasksOpen(false);

    setStory((current) => {
      if (current.day >= 7) {
        return {
          ...current,
          mode: "finished",
          autonomyEndsAt: null,
        };
      }

      const nextDay = current.day + 1;

      const nextProgress: StoryProgress = {
        ...current,
        day: nextDay,
        stepIndex: 0,
        lineIndex: 0,
        mode: "dialogue",
        autonomyEndsAt: null,
        optionalSolar: false,
        lastMissionOutcome: null,
        tasks: createDailyTasks(),
        completedDailyMissions: [],
      };

      return resolveStoryStep(nextProgress, nextDay, 0);
    });
  }, []);

  useEffect(() => {
    dayAdvanceLock.current = false;
    if (story.mode === "sandbox") setTasksOpen(true);
  }, [story.day, story.mode]);

  const remainingSeconds =
    story.mode === "autonomy" && story.autonomyEndsAt !== null
      ? Math.max(0, Math.ceil((story.autonomyEndsAt - clockNow) / 1000))
      : null;

  useEffect(() => {
    if (story.mode === "autonomy" && remainingSeconds === 0) {
      advanceDay();
    }
  }, [story.mode, remainingSeconds, advanceDay]);

  const advanceDialogue = () => {
    setStory((current) => {
      const step = getStep(current);
      if (step?.type !== "dialogue") return current;

      const lines = resolveDialogueLines(step, current.lastMissionOutcome);

      if (current.lineIndex + 1 < lines.length) {
        return { ...current, lineIndex: current.lineIndex + 1 };
      }

      const shouldRetry =
        current.lastMissionOutcome !== null &&
        (step.retryOn?.includes(current.lastMissionOutcome) ?? false);

      if (shouldRetry) {
        return resolveStoryStep(
          { ...current, lastMissionOutcome: null },
          current.day,
          current.stepIndex - 1,
        );
      }

      return resolveStoryStep(
        { ...current, lastMissionOutcome: null },
        current.day,
        current.stepIndex + 1,
      );
    });
  };

  const completeStoryMission = (outcome: StoryOutcome = null) => {
    setStory((current) => {
      const step = getStep(current);

      if (
        current.mode !== "mission" ||
        (step?.type !== "mission" && step?.type !== "optional-mission")
      ) {
        return current;
      }

      const isInvalidAttempt = outcome === "invalid" || outcome === "incorrect";

      // The optional solar mission stays open if its grid is invalid.
      if (step.type === "optional-mission" && isInvalidAttempt) {
        return current;
      }

      const facilityToUnlock = isInvalidAttempt
        ? undefined
        : FACILITY_UNLOCK_MISSION[step.id];

      const unlockedFacilities = facilityToUnlock
        ? [...new Set([...current.unlockedFacilities, facilityToUnlock])]
        : current.unlockedFacilities;

      return resolveStoryStep(
        {
          ...current,
          lastMissionOutcome: outcome,
          unlockedFacilities,
        },
        current.day,
        current.stepIndex + 1,
      );
    });
  };

  const chooseStoryOption = (choiceId: string) => {
    setStory((current) => {
      const step = getStep(current);

      if (current.mode !== "choice" || step?.type !== "choice") {
        return current;
      }

      if (!step.choices.some((choice) => choice.id === choiceId)) {
        return current;
      }

      return resolveStoryStep(
        { ...current, optionalSolar: choiceId === "activate" },
        current.day,
        current.stepIndex + 1,
      );
    });
  };

  const toggleDailyTask = (key: keyof DailyTasksState) => {
    setStory((current) => ({
      ...current,
      tasks: { ...current.tasks, [key]: true },
    }));
  };

  const currentStep = getStep(story);

  const dialogueStep =
    story.mode === "dialogue" && currentStep?.type === "dialogue"
      ? currentStep
      : null;

  const dialogueLines = dialogueStep
    ? resolveDialogueLines(dialogueStep, story.lastMissionOutcome)
    : [];

  const dialogueLine = dialogueLines[story.lineIndex];

  const choiceStep =
    story.mode === "choice" && currentStep?.type === "choice"
      ? currentStep
      : null;

  const missionId: StoryMissionId | null =
    story.mode === "mission" &&
    currentStep &&
    (currentStep.type === "mission" || currentStep.type === "optional-mission")
      ? currentStep.id
      : null;

  const isStoryMission = missionId !== null;
  const storyFacility = missionId ? MISSION_FACILITY[missionId] : null;
  const activeFacility = storyFacility ?? manualFacility;

  const isSandbox = story.mode === "sandbox";
  const canVisitFacilities = story.mode === "autonomy" || isSandbox;
  const isFacilityUnlocked = (facility: FacilityType) =>
    isSandbox || story.unlockedFacilities.includes(facility);
  const canOpenTasks = story.mode === "autonomy" || isSandbox;

  // Completing any valid result counts toward that day's required operations.
  const reportMissionOutcome = (id: StoryMissionId, outcome: StoryOutcome) => {
    if (isStoryMission) {
      if (missionId !== id) return;
      if (
        story.day === 3 &&
        outcome === "invalid" &&
        (id === "food-production" || id === "water-rover")
      ) return;
      completeStoryMission(outcome);
      return;
    }

    if (
      !isSandbox ||
      (outcome !== "optimal" && outcome !== "suboptimal") ||
      !(DAILY_MISSIONS[story.day] ?? []).some((mission) => mission.id === id)
    ) return;

    setStory((current) => ({
      ...current,
      completedDailyMissions: [
        ...new Set([...current.completedDailyMissions, id]),
      ],
    }));
  };

  const requiredMissions = isSandbox ? DAILY_MISSIONS[story.day] ?? [] : [];

  const missionStatus = isSandbox
    ? "FULL AUTONOMY // ALL FACILITIES AVAILABLE"
    : story.mode === "autonomy"
      ? "DAILY AUTONOMY WINDOW // ROUTINE TASKS"
      : story.mode === "finished"
        ? "DAY 7 COMPLETE // RESCUE VERIFICATION PENDING"
        : "GUIDED SURVIVAL // FOLLOW THE AI COMPANION";

  const openFacility = (facility: FacilityType) => {
    if (!canVisitFacilities || !isFacilityUnlocked(facility)) return;

    setManualFacility(facility);
    setTasksOpen(false);
  };

  const closeFacility = () => {
    if (!isStoryMission) {
      setManualFacility(null);
    }
  };

  const handlePowerConsumed = (amount: number) => {
    setPower((current) => Math.max(0, current - amount));
  };

  const handlePowerChange = (amount: number) => {
    setPower((current) => Math.max(0, Math.min(100, current + amount)));
  };

  const restartGame = () => {
    setStory(createInitialProgress());
    setPower(INITIAL_POWER);
    setGameOver(false);
    setManualFacility(null);
    setTasksOpen(false);
    localStorage.removeItem(STORAGE_KEY);
  };

  const resetGameForTesting = () => {
    if (!import.meta.env.DEV) return;

    const confirmed = window.confirm(
      "RESET THE ENTIRE GAME?\n\nThis will erase your saved story progress, unlocked facilities and current run. The game will restart from Day 1.",
    );

    if (!confirmed) return;

    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(POWER_STORAGE_KEY);

    // Reloading resets active minigames and transient UI state.
    window.location.reload();
  };

  return (
    <div className="ui-readable relative flex h-screen w-screen select-none items-center justify-center overflow-hidden bg-black">
      <div
        className="relative bg-[url('/moon.png')] bg-cover bg-center bg-no-repeat shadow-[0_0_50px_rgba(6,182,212,0.15)]"
        style={{
          width: "min(100vw, 100vh * (16/9))",
          height: "min(100vh, 100vw * (9/16))",
        }}
      >
        {story.mode !== "finished" && (
          <div
            className={`absolute inset-0 z-10 ${
              canVisitFacilities ? "pointer-events-auto" : "pointer-events-none"
            }`}
          >
            <MapBox
              id="solar-array"
              type="solar"
              label="Solar Panels"
              top="22%"
              left="18%"
              accentColor="cyan"
              locked={!isFacilityUnlocked("solar")}
              onClick={() => openFacility("solar")}
            />

            <MapBox
              id="rover-garage"
              type="garage"
              label="Rover Workshop"
              top="35%"
              left="16%"
              accentColor="cyan"
              locked={!isFacilityUnlocked("garage")}
              onClick={() => openFacility("garage")}
            />

            <MapBox
              id="crater-sensors"
              type="crater_sensors"
              label="Crater Sensors"
              top="35%"
              left="45%"
              accentColor="cyan"
              locked={!isFacilityUnlocked("crater_sensors")}
              onClick={() => openFacility("crater_sensors")}
            />

            <MapBox
              id="radio-dish"
              type="radio"
              label="Radio Dish"
              top="42%"
              left="64%"
              accentColor="cyan"
              locked={!isFacilityUnlocked("radio")}
              onClick={() => openFacility("radio")}
            />

            <MapBox
              id="water-rover"
              type="water_rover"
              label="Water Rover"
              top="68%"
              left="35%"
              accentColor="amber"
              locked={!isFacilityUnlocked("water_rover")}
              onClick={() => openFacility("water_rover")}
            />

            <MapBox
              id="mining-rover"
              type="mining_rover"
              label="Mining Rover"
              top="65%"
              left="82%"
              accentColor="amber"
              locked={!isFacilityUnlocked("mining_rover")}
              onClick={() => openFacility("mining_rover")}
            />

            <MapBox
              id="greenhouse"
              type="greenhouse"
              label="Greenhouse"
              top="86%"
              left="49%"
              accentColor="emerald"
              locked={!isFacilityUnlocked("greenhouse")}
              onClick={() => openFacility("greenhouse")}
            />
          </div>
        )}
      </div>

      <Hud
        power={power}
        day={story.day}
        missionStatus={missionStatus}
        onResetGame={resetGameForTesting}
      />

      <DailyRoutinePanel
        visible={canOpenTasks && !activeFacility}
        open={tasksOpen}
        onToggleOpen={() => setTasksOpen((open) => !open)}
        tasks={story.tasks}
        onToggleTask={toggleDailyTask}
        day={story.day}
        remainingSeconds={remainingSeconds}
        sandbox={isSandbox}
        requiredMissions={requiredMissions}
        completedMissions={story.completedDailyMissions}
        onEndDay={advanceDay}
      />

      {activeFacility && (
        <TacticalTabletModal
          title={FACILITY_META[activeFacility].title}
          subtitle={FACILITY_META[activeFacility].subtitle}
          onClose={closeFacility}
          closeable={!isStoryMission}
        >
          {activeFacility === "water_rover" && (
            <WaterRoverGame
              onPowerConsumed={handlePowerConsumed}
              onCompleted={(outcome) =>
                reportMissionOutcome("water-rover", outcome)
              }
            />
          )}

          {activeFacility === "solar" && (
            <SolarPanelsGame
              onPowerConsumed={handlePowerConsumed}
              onCompleted={(outcome) =>
                reportMissionOutcome("solar-panels", outcome)
              }
            />
          )}

          {activeFacility === "crater_sensors" && (
            <CraterTraverseGame
              onPowerConsumed={handlePowerConsumed}
              onCompleted={(outcome) =>
                reportMissionOutcome("crater-sensors", outcome)
              }
            />
          )}

          {activeFacility === "mining_rover" && (
            <MiningRoverGame
              onPowerChange={handlePowerChange}
              initialTab={
                missionId === "sample-retrieval" ? "cargo" : "navigation"
              }
              lockedTab={isStoryMission}
              onNavigationComplete={(outcome) =>
                reportMissionOutcome("mining-navigation", outcome)
              }
              onCargoComplete={(outcome) =>
                reportMissionOutcome("sample-retrieval", outcome)
              }
            />
          )}

          {activeFacility === "radio" && (
            <RadioGame
              initialTab={
                missionId === "signal-decode" ? "transmission" : "match"
              }
              lockedTab={isStoryMission}
              onMatchComplete={(matched) =>
                reportMissionOutcome(
                  "signal-match",
                  matched ? "optimal" : "incorrect",
                )
              }
              onTransmissionComplete={(decoded) =>
                reportMissionOutcome(
                  "signal-decode",
                  decoded ? "optimal" : "incorrect",
                )
              }
            />
          )}

          {activeFacility === "greenhouse" && (
            <FoodProductionGame
              onPowerConsumed={handlePowerConsumed}
              onCompleted={(outcome) =>
                reportMissionOutcome("food-production", outcome)
              }
            />
          )}

          {activeFacility === "garage" && (
            <RoverWorkshopGame
              onPowerConsumed={handlePowerConsumed}
              onCompleted={(outcome) =>
                reportMissionOutcome("rover-workshop", outcome)
              }
            />
          )}
        </TacticalTabletModal>
      )}

      {dialogueLine && (
        <StoryDialogue
          day={story.day}
          line={dialogueLine}
          onContinue={advanceDialogue}
        />
      )}

      {choiceStep && (
        <StoryDialogue
          day={story.day}
          line={choiceStep.line}
          choices={choiceStep.choices}
          onChoose={chooseStoryOption}
          onContinue={() => undefined}
        />
      )}

      {gameOver && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 px-6 text-center font-mono">
          <div className="max-w-xl border border-red-500/60 bg-slate-900/90 p-8 shadow-[0_0_60px_rgba(239,68,68,0.15)]">
            <p className="text-xs tracking-[0.3em] text-red-400">
              LUNAR STRANDING // LIFE SUPPORT
            </p>
            <h2 className="mt-4 text-4xl font-black tracking-widest text-white">
              GAME OVER
            </h2>
            <p className="mt-5 text-sm leading-7 text-slate-300">
              The outpost has run out of power. Restart the mission and try again.
            </p>
            <button
              type="button"
              onClick={restartGame}
              className="mt-7 border border-cyan-500/60 bg-cyan-500/15 px-6 py-3 text-[10px] font-bold tracking-widest text-cyan-200 transition-colors hover:bg-cyan-500/25"
            >
              RETRY
            </button>
          </div>
        </div>
      )}

      {story.mode === "finished" && !gameOver && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/95 px-6 text-center font-mono">
          <div className="max-w-2xl border border-cyan-500/50 bg-slate-900/80 p-8 shadow-[0_0_60px_rgba(6,182,212,0.12)]">
            <p className="text-xs tracking-[0.3em] text-cyan-400">
              LUNAR STRANDING // DAY 07
            </p>

            <h2 className="mt-4 text-3xl font-black tracking-widest text-white">
              RESCUE WINDOW REACHED
            </h2>

            <p className="mt-5 text-sm leading-7 text-slate-300">
              The seven-day survival window is complete. Final rescue
              confirmation must come from the backend life-support system.
            </p>

            <p className="mt-4 text-[10px] tracking-widest text-amber-300">
              SURVIVAL STATUS: AWAITING AUTHORITATIVE ENERGY CHECK
            </p>

            <button
              type="button"
              onClick={restartGame}
              className="mt-7 border border-cyan-500/60 bg-cyan-500/15 px-5 py-3 text-[10px] font-bold tracking-widest text-cyan-200 transition-colors hover:bg-cyan-500/25"
            >
              RESTART STORY
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
