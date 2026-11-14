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

export const gameApi = {
  // 1. Water Rover (Dijkstra)
  submitWaterRoverPath: (
    graph: Record<string, Record<string, number>>,
    path: string[],
    battery: number,
  ) =>
    request<any>("/minigames/water-rover", {
      method: "POST",
      body: JSON.stringify({
        graph,
        start_node: "Base",
        target_node: "IceDeposit",
        player_path: path,
        initial_battery: battery,
        session_id: "default",
      }),
    }),

  // 2. Crater Traverse (BFS)
  submitCraterTraverse: (graph: Record<string, string[]>, path: string[]) =>
    request<any>("/minigames/crater-traverse", {
      method: "POST",
      body: JSON.stringify({
        graph,
        start_node: "Crater_Alpha",
        target_node: "Crater_Zeta",
        player_path: path,
        session_id: "default",
      }),
    }),

  // 3. Food Production (Activity Selection)
  submitFoodProduction: (
    activities: {
      name: string;
      start_hour: number;
      end_hour: number;
      power_kw: number;
      hp_gain: number;
    }[],
    selectedNames: string[],
  ) =>
    request<any>("/minigames/food-production", {
      method: "POST",
      body: JSON.stringify({
        available_tasks: activities,
        selected_tasks: selectedNames,
        current_hp: 100,
      }), // Note: Modify based on exact Pydantic model if they push one later
    }),

  // 4. Sample Retrieval (0/1 Knapsack)
  submitSampleRetrieval: (
    samples: { id: string; name: string; weight: number; value: number }[],
    selectedIds: string[],
    capacity: number,
  ) =>
    request<any>("/minigames/sample-retrieval", {
      method: "POST",
      body: JSON.stringify({
        bag_capacity: capacity,
        available_samples: samples,
        player_sample_ids: selectedIds,
        session_id: "default",
      }),
    }),

  // 5. Signal Transmission (Huffman)
  submitSignalTransmission: (text: string) =>
    request<any>("/minigames/signal-transmission", {
      method: "POST",
      body: JSON.stringify({ text }),
    }),
};
