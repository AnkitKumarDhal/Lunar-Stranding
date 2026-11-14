import type {
  CraterTraverseResult,
  FoodProductionResult,
  GreenhouseActivity,
  SampleItem,
  SampleRetrievalResult,
  SignalMatchResult,
  SignalTransmissionResult,
  WaterRoverResult,
} from "../types/game";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "/api").replace(
  /\/$/,
  "",
);

// Send a JSON request and return the backend response.
async function request<T>(endpoint: string, data: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `API request failed (${response.status})`);
  }

  return response.json() as Promise<T>;
}

export const gameApi = {
  submitWaterRoverPath: (
    graph: Record<string, Record<string, number>>,
    path: string[],
    battery: number,
    sessionId = "default",
  ) =>
    request<WaterRoverResult>("/minigames/water-rover", {
      graph,
      start_node: "Base",
      target_node: "IceDeposit",
      player_path: path,
      initial_battery: battery,
      session_id: sessionId,
    }),

  submitCraterTraverse: (
    graph: Record<string, string[]>,
    path: string[],
    sessionId = "default",
  ) =>
    request<CraterTraverseResult>("/minigames/crater-traverse", {
      graph,
      start_node: "Crater_Alpha",
      player_path: path,
      session_id: sessionId,
    }),

  submitFoodProduction: (
    activities: GreenhouseActivity[],
    selectedNames: string[],
    currentHp = 100,
    sessionId = "default",
  ) =>
    request<FoodProductionResult>("/minigames/food-production", {
      available_tasks: activities,
      selected_tasks: selectedNames,
      current_hp: currentHp,
      session_id: sessionId,
    }),

  submitSampleRetrieval: (
    samples: SampleItem[],
    selectedIds: string[],
    capacity: number,
    sessionId = "default",
  ) =>
    request<SampleRetrievalResult>("/minigames/sample-retrieval", {
      bag_capacity: capacity,
      available_samples: samples,
      player_sample_ids: selectedIds,
      session_id: sessionId,
    }),

  submitSignalMatch: (signal: number[], pattern: number[]) =>
    request<SignalMatchResult>("/minigames/signal-match", {
      signal,
      pattern,
    }),

  submitSignalTransmission: (text: string) =>
    request<SignalTransmissionResult>("/minigames/signal-transmission", {
      text,
    }),
};
