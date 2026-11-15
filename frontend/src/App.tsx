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
const AUTONOMY_WINDOW_MS = AUTONOMY_WINDOW_SECONDS * 1000;

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
});

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

    return {
      ...initial,
      ...parsed,
      tasks: { ...initial.tasks, ...(parsed.tasks ?? {}) },
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
    return step.outcomeLines[outcome];
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

  // Skipping the optional solar mission also skips its completion dialogue.
  while (
    steps[stepIndex]?.type === "optional-mission" &&
    !progress.optionalSolar
  ) {
    stepIndex += 2;
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

  // The backend will supply this value. Do not calculate or mutate energy here.
  const power: number | null = null;
  const [health, setHealth] = useState(100);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(story));
  }, [story]);

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
      };

      return resolveStoryStep(nextProgress, nextDay, 0);
    });
  }, []);

  useEffect(() => {
    dayAdvanceLock.current = false;
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

      return resolveStoryStep(
        { ...current, lastMissionOutcome: null },
        current.day,
        current.stepIndex + 1,
      );
    });
  };

  const completeStoryMission = (outcome: StoryOutcome = null) => {
    setStory((current) => {
      if (current.mode !== "mission") return current;

      return resolveStoryStep(
        { ...current, lastMissionOutcome: outcome },
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
  const canOpenTasks = story.mode === "autonomy" || isSandbox;

  const missionStatus = isSandbox
    ? "FULL AUTONOMY // ALL FACILITIES AVAILABLE"
    : story.mode === "autonomy"
      ? "DAILY AUTONOMY WINDOW // ROUTINE TASKS"
      : story.mode === "finished"
        ? "DAY 7 COMPLETE // RESCUE VERIFICATION PENDING"
        : "GUIDED SURVIVAL // FOLLOW THE AI COMPANION";

  const openFacility = (facility: FacilityType) => {
    if (!isSandbox) return;

    setManualFacility(facility);
    setTasksOpen(false);
  };

  const closeFacility = () => {
    if (!isStoryMission) {
      setManualFacility(null);
    }
  };

  // These legacy callbacks intentionally do not change frontend energy.
  // Energy accounting will be connected to the backend game-state API.
  const handlePowerConsumed = (_amount: number) => undefined;
  const handlePowerChange = (_amount: number) => undefined;

  const restartStory = () => {
    setStory(createInitialProgress());
    setManualFacility(null);
    setTasksOpen(false);
    setHealth(100);
  };

  return (
    <div className="relative flex h-screen w-screen select-none items-center justify-center overflow-hidden bg-black">
      <div
        className="relative bg-[url('/moon.png')] bg-cover bg-center bg-no-repeat shadow-[0_0_50px_rgba(6,182,212,0.15)]"
        style={{
          width: "min(100vw, 100vh * (16/9))",
          height: "min(100vh, 100vw * (9/16))",
        }}
      >
        {isSandbox && (
          <div className="pointer-events-auto absolute inset-0 z-10">
            <MapBox
              id="solar-array"
              type="solar"
              label="Solar Panels"
              top="22%"
              left="18%"
              accentColor="cyan"
              onClick={() => openFacility("solar")}
            />

            <MapBox
              id="rover-garage"
              type="garage"
              label="Rover Workshop"
              top="35%"
              left="16%"
              accentColor="cyan"
              onClick={() => openFacility("garage")}
            />

            <MapBox
              id="crater-sensors"
              type="crater_sensors"
              label="Crater Sensors"
              top="35%"
              left="45%"
              accentColor="cyan"
              onClick={() => openFacility("crater_sensors")}
            />

            <MapBox
              id="radio-dish"
              type="radio"
              label="Radio Dish"
              top="42%"
              left="64%"
              accentColor="cyan"
              onClick={() => openFacility("radio")}
            />

            <MapBox
              id="water-rover"
              type="water_rover"
              label="Water Rover"
              top="68%"
              left="35%"
              accentColor="amber"
              onClick={() => openFacility("water_rover")}
            />

            <MapBox
              id="mining-rover"
              type="mining_rover"
              label="Mining Rover"
              top="65%"
              left="82%"
              accentColor="amber"
              onClick={() => openFacility("mining_rover")}
            />

            <MapBox
              id="greenhouse"
              type="greenhouse"
              label="Greenhouse"
              top="86%"
              left="49%"
              accentColor="emerald"
              onClick={() => openFacility("greenhouse")}
            />
          </div>
        )}
      </div>

      <Hud
        power={power}
        health={health}
        day={story.day}
        missionStatus={missionStatus}
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
              onCompleted={
                isStoryMission ? () => completeStoryMission() : undefined
              }
            />
          )}

          {activeFacility === "solar" && (
            <SolarPanelsGame
              onCompleted={
                isStoryMission ? () => completeStoryMission() : undefined
              }
            />
          )}

          {activeFacility === "crater_sensors" && (
            <CraterTraverseGame
              onPowerConsumed={handlePowerConsumed}
              onCompleted={
                isStoryMission ? () => completeStoryMission() : undefined
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
              onNavigationComplete={(foundNegativeRoute) => {
                if (isStoryMission && missionId === "mining-navigation") {
                  completeStoryMission(
                    foundNegativeRoute ? "success" : "failure",
                  );
                }
              }}
              onCargoComplete={() => {
                if (isStoryMission && missionId === "sample-retrieval") {
                  completeStoryMission();
                }
              }}
            />
          )}

          {activeFacility === "radio" && (
            <RadioGame
              initialTab={
                missionId === "signal-decode" ? "transmission" : "match"
              }
              lockedTab={isStoryMission}
              onMatchComplete={(matched) => {
                if (isStoryMission && missionId === "signal-match") {
                  completeStoryMission(matched ? "success" : "failure");
                }
              }}
              onTransmissionComplete={(decoded) => {
                if (isStoryMission && missionId === "signal-decode") {
                  completeStoryMission(decoded ? "success" : "failure");
                }
              }}
            />
          )}

          {activeFacility === "greenhouse" && (
            <FoodProductionGame
              currentHp={health}
              onPowerConsumed={handlePowerConsumed}
              onHealthChanged={setHealth}
              onCompleted={() => {
                if (isStoryMission) completeStoryMission();
              }}
            />
          )}

          {activeFacility === "garage" && (
            <RoverWorkshopGame
              onPowerConsumed={handlePowerConsumed}
              onCompleted={() => {
                if (isStoryMission) completeStoryMission();
              }}
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

      {story.mode === "finished" && (
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
              onClick={restartStory}
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
