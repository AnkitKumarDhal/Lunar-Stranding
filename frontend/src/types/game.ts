// src/types/game.ts
export type FacilityType =
  | "solar"
  | "water_rover"
  | "mining_rover"
  | "crater_sensors"
  | "radio"
  | "greenhouse"
  | "garage";

export interface HazardPayload {
  id: string;
  title: string;
  description: string;
  remainingSeconds: number;
  actions: {
    id: string;
    label: string;
    completed: boolean;
  }[];
}

export interface DailyTasksState {
  eclss: boolean;
  suitport: boolean;
  exercise: boolean;
  solarHeightAdjusted: boolean;
}
