// frontend/src/services/api.ts

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API Error ${res.status}: ${errText}`);
  }
  return res.json() as Promise<T>;
}

// --- TypeScript Interfaces for Minigame Responses & Requests ---

// 1. Water Rover (Dijkstra)
export interface WaterRoverResponse {
  status: string;
  optimal_path: string[];
  optimal_cost: number | null;
  player_cost: number;
  power_consumed: number;
  message: string;
}

// 2. Crater Traverse (BFS)
export interface CraterTraverseGameData {
  graph: Record<string, string[]>;
  start_node: string;
}

export interface CraterTraverseResponse {
  status: string;
  optimal: {
    path: string[];
    steps: number | null;
    bfs_discovery_order: string[];
  };
  player_steps: number;
  total_craters: number;
  craters_visited_count: number;
  unvisited_craters: string[];
  power_consumed: number;
  message: string;
}

// 3. Solar Panels (Prim's MST)
export interface SolarPanelsGameData {
  graph: Record<string, Record<string, number>>;
  start_node: string;
}

export interface SolarPanelsResponse {
  status: string;
  optimal_cost: number;
  optimal_edges: string[][];
  player_cost: number;
  power_consumed: number;
  message: string;
}
// 4. Mining Rover (Bellman-Ford)
export type MiningEdge = [string, string, number];

export interface MiningRoverGameData {
  edges: MiningEdge[];
  start_node: string;
  target_node: string;
}

export interface MiningRoverResponse {
  status: string;
  optimal_path: string[];
  optimal_cost: number | null;
  player_cost: number;
  power_change: number;
  message: string;
}

// 5. Sample Retrieval (0/1 Knapsack)
export interface SampleItem {
  id: string;
  name: string;
  weight: number;
  value: number;
}

export interface SampleRetrievalGameData {
  bag_capacity: number;
  available_samples: SampleItem[];
}

export interface SampleRetrievalResponse {
  status: string;
  bag_capacity: number;
  player_total_weight: number;
  player_total_value: number;
  optimal_total_weight: number;
  optimal_total_value: number;
  message: string;
}

// 6. Food Production (Activity Selection)
export interface GreenhouseTaskItem {
  name: string;
  start_hour: number;
  end_hour: number;
  power_kw: number;
}

export interface FoodProductionGameData {
  available_tasks: GreenhouseTaskItem[];
}

export interface FoodProductionResponse {
  status: string;
  optimal: {
    max_tasks: number;
    tasks: string[];
  };
  player_task_count: number;
  peak_power_kw: number;
  bus_limit_kw: number;
  power_consumed: number;
  message: string;
}

// 7. Signal Match (Rabin-Karp)
export interface SignalMatchChallenge {
  signal: string;
  pattern: string;
}

export interface SignalMatchResponse {
  pattern_found: boolean;
  status: string;
  message: string;
}

// 8. Signal Decoding (Huffman Coding)
export interface SignalTransmissionChallenge {
  encoded_signal: string;
  code_map: Record<string, string>;
}

export interface SignalTransmissionResult {
  status: string;
  is_correct: boolean;
  correct_answer: string;
  message: string;
}

// 9. Rover Workshop (Assembly Line Scheduling)
export interface RoverWorkshopGameData {
  process_names: string[];
  a1: number[];
  a2: number[];
  t1: number[];
  t2: number[];
  entry1: number;
  entry2: number;
  exit1: number;
  exit2: number;
  power_kw: number[];
}

export interface RoverWorkshopResponse {
  status: string;
  optimal: { time: number; sequence: number[] };
  player_time: number;
  time_difference: number;
  power_consumed: number;
  message: string;
}

// --- API Service Object ---
export const gameApi = {
  // 1. Water Rover (Dijkstra)
  submitWaterRoverPath: (
    graph: Record<string, Record<string, number>>,
    path: string[],
  ) =>
    request<WaterRoverResponse>("/minigames/water-rover", {
      method: "POST",
      body: JSON.stringify({ graph, player_path: path }),
    }),

  // 2. Crater Traverse (BFS)
  getNewCraterTraverseGame: () =>
    request<CraterTraverseGameData>("/minigames/crater-traverse", {
      method: "POST",
      body: JSON.stringify({}),
    }),
  submitCraterTraverse: (graph: Record<string, string[]>, path: string[], startNode: string) =>
    request<CraterTraverseResponse>("/minigames/crater-traverse", {
      method: "POST",
      body: JSON.stringify({ graph, start_node: startNode, player_path: path }),
    }),

  // 3. Solar Panels (Prim's MST)
  newSolarPanelsGame: () =>
    request<SolarPanelsGameData>("/minigames/solar-panels", {
      method: "POST",
      body: JSON.stringify({}),
    }),
  submitSolarPanels: (
    graph: Record<string, Record<string, number>>,
    playerEdges: string[][],
    startNode: string = "A",
  ) =>
    request<SolarPanelsResponse>("/minigames/solar-panels", {
      method: "POST",
      body: JSON.stringify({
        graph,
        start_node: startNode,
        player_edges: playerEdges,
      }),
    }),

  // 4. Mining Rover (Bellman-Ford)
  newMiningRoverGame: () =>
    request<MiningRoverGameData>("/minigames/mining-rover", {
      method: "POST",
      body: JSON.stringify({}),
    }),
  submitMiningRover: (edges: MiningEdge[], path: string[], startNode: string, targetNode: string) =>
    request<MiningRoverResponse>("/minigames/mining-rover", {
      method: "POST",
      body: JSON.stringify({ edges, start_node: startNode, target_node: targetNode, player_path: path }),
    }),

  // 5. Sample Retrieval (0/1 Knapsack)
  newSampleRetrievalGame: () =>
    request<SampleRetrievalGameData>("/minigames/sample-retrieval", {
      method: "POST",
      body: JSON.stringify({}),
    }),
  submitSampleRetrieval: (samples: SampleItem[], selectedIds: string[], capacity: number) =>
    request<SampleRetrievalResponse>("/minigames/sample-retrieval", {
      method: "POST",
      body: JSON.stringify({
        bag_capacity: capacity,
        available_samples: samples,
        player_sample_ids: selectedIds,
      }),
    }),

  // 6. Food Production (Activity Selection)
  newFoodProductionGame: () =>
    request<FoodProductionGameData>("/minigames/food-production", {
      method: "POST",
      body: JSON.stringify({}),
    }),
  submitFoodProduction: (
    tasks: GreenhouseTaskItem[],
    selectedNames: string[],
    busLimitKw: number,
  ) =>
    request<FoodProductionResponse>("/minigames/food-production", {
      method: "POST",
      body: JSON.stringify({
        available_tasks: tasks,
        selected_tasks: selectedNames,
        bus_limit_kw: busLimitKw,
      }),
    }),

  // 7. Signal Match (Rabin-Karp)
  newSignalMatch: () =>
    request<SignalMatchChallenge>("/minigames/signal-match", {
      method: "POST",
      body: JSON.stringify({}),
    }),
  submitSignalMatch: (challenge: SignalMatchChallenge, playerIndex: number) =>
    request<SignalMatchResponse>("/minigames/signal-match", {
      method: "POST",
      body: JSON.stringify({ ...challenge, player_index: playerIndex }),
    }),

  // 8. Signal Decoding (Huffman Coding)
  newSignalTransmission: () =>
    request<SignalTransmissionChallenge>("/minigames/signal-transmission", {
      method: "POST",
      body: JSON.stringify({}),
    }),
  submitSignalTransmission: (challenge: SignalTransmissionChallenge, answer: string) =>
    request<SignalTransmissionResult>("/minigames/signal-transmission", {
      method: "POST",
      body: JSON.stringify({ ...challenge, answer }),
    }),

  // 9. Rover Workshop (Assembly Line Scheduling)
  newRoverWorkshopGame: () =>
    request<RoverWorkshopGameData>("/minigames/rover-workshop", {
      method: "POST",
      body: JSON.stringify({}),
    }),
  submitRoverWorkshop: (game: RoverWorkshopGameData, playerSequence: number[]) =>
    request<RoverWorkshopResponse>("/minigames/rover-workshop", {
      method: "POST",
      body: JSON.stringify({ ...game, player_sequence: playerSequence }),
    }),
};
