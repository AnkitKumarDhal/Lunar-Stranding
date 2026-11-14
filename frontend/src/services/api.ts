import type {
  CraterTraverseResult,
  FoodProductionResult,
  SampleRetrievalResult,
  SignalMatchResult,
  SignalTransmissionResult,
  WaterRoverResult,
} from "../types/game";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "/api").replace(
  /\/$/,
  "",
);

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try {
      const body: unknown = await response.json();
      if (body && typeof body === "object" && "detail" in body) {
        detail = String((body as { detail: unknown }).detail);
      } else {
        detail = JSON.stringify(body);
      }
    } catch {
      const text = await response.text();
      if (text) {
        detail = text;
      }
    }

    throw new Error(`API request failed: ${detail}`);
  }

  return (await response.json()) as T;
}

// GREENHOUSE ACTIVITY TYPE
export interface GreenhouseActivity {
  name: string;
  start_hour: number;
  end_hour: number;
  power_kw: number;
  hp_gain: number;
}

// SAMPLE TYPE
export interface SampleItem {
  id: string;
  name: string;
  weight: number;
  value: number;
}

// API METHODS
export const gameApi = {
  // 1. WATER ROVER - DIJKSTRA
  submitWaterRoverPath: (
    graph: Record<string, Record<string, number>>,
    path: string[],
    battery: number,
    sessionId = "default",
  ) =>
    request<WaterRoverResult>("/minigames/water-rover", {
      method: "POST",
      body: JSON.stringify({
        graph,
        start_node: "Base",
        target_node: "IceDeposit",
        player_path: path,
        initial_battery: battery,
        session_id: sessionId,
      }),
    }),

  // 2. CRATER TRAVERSE - BFS
  submitCraterTraverse: (
    graph: Record<string, string[]>,
    path: string[],
    sessionId = "default",
  ) =>
    request<CraterTraverseResult>("/minigames/crater-traverse", {
      method: "POST",
      body: JSON.stringify({
        graph,
        start_node: "Crater_Alpha",
        player_path: path,
        session_id: sessionId,
      }),
    }),

  // 3. FOOD PRODUCTION - ACTIVITY SCHEDULING
  submitFoodProduction: (
    activities: GreenhouseActivity[],
    selectedNames: string[],
    currentHp = 100,
    sessionId = "default",
  ) =>
    request<FoodProductionResult>("/minigames/food-production", {
      method: "POST",
      body: JSON.stringify({
        available_tasks: activities,
        selected_tasks: selectedNames,
        current_hp: currentHp,
        session_id: sessionId,
      }),
    }),

  // 4. SAMPLE RETRIEVAL - 0/1 KNAPSACK
  submitSampleRetrieval: (
    samples: SampleItem[],
    selectedIds: string[],
    capacity: number,
    sessionId = "default",
  ) =>
    request<SampleRetrievalResult>("/minigames/sample-retrieval", {
      method: "POST",
      body: JSON.stringify({
        bag_capacity: capacity,
        available_samples: samples,
        player_sample_ids: selectedIds,
        session_id: sessionId,
      }),
    }),

  // 5. SIGNAL MATCH - RABIN KARP
  submitSignalMatch: (signal: number[], pattern: number[]) =>
    request<SignalMatchResult>("/minigames/signal-match", {
      method: "POST",
      body: JSON.stringify({ signal, pattern }),
    }),

  // 6. SIGNAL TRANSMISSION - HUFFMAN
  submitSignalTransmission: (text: string) =>
    request<SignalTransmissionResult>("/minigames/signal-transmission", {
      method: "POST",
      body: JSON.stringify({ text }),
    }),
};
