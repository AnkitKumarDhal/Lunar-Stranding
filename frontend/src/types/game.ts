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

// WATER ROVER

export interface WaterRoverResult {
  is_valid_path: boolean;

  status:
    | "UNREACHABLE"
    | "INVALID_ROUTE"
    | "STRANDED"
    | "OPTIMAL"
    | "SUBOPTIMAL"
    | string;

  optimal_path: string[];
  optimal_cost: number;

  player_path: string[];
  player_cost: number;

  excess_energy_spent: number;

  efficiency: number;
  efficiency_percentage: number;

  remaining_battery: number;

  message: string;
}

// CRATER TRAVERSE

export interface CraterTraverseResult {
  is_valid_path: boolean;

  status:
    | "DISCONNECTED"
    | "INVALID_PATH"
    | "INCOMPLETE"
    | "OPTIMAL_TRAVERSAL"
    | "SUBOPTIMAL_TRAVERSAL"
    | string;

  optimal: {
    path: string[];
    steps: number | null;
    bfs_discovery_order: string[];
  };

  optimal_path: string[];
  optimal_steps: number | null;
  minimum_steps_required: number | null;

  player_path: string[];
  player_steps: number;
  player_steps_taken: number;

  all_craters_covered: boolean;

  total_craters: number;
  craters_visited_count: number;

  unvisited_craters: string[];

  efficiency_percentage: number;
  step_efficiency_percentage: number;

  message: string;
}

// FOOD PRODUCTION

export interface FoodProductionResult {
  status: "POWER_OVERLOAD" | "OK" | string;

  message?: string;

  hp_gained?: number;
  max_possible_hp_gain?: number;
  daily_drain?: number;
  new_hp?: number;

  survived_day: boolean;

  optimal_plan?: string[];
}

// SAMPLE RETRIEVAL

export interface SampleRetrievalResult {
  bag_capacity: number;

  optimal_max_value: number;
  optimal_total_weight: number;
  optimal_sample_ids: string[];

  player_total_value: number;
  player_total_weight: number;

  is_overweight: boolean;

  efficiency: number;
  efficiency_percentage: number;

  reward_multiplier: number;

  status: string;
  message: string;
}

// SIGNAL MATCH

export interface SignalMatchResult {
  match_found: boolean;
  index: number;

  signal_length: number;
  pattern_length: number;
}

// SIGNAL TRANSMISSION

export interface SignalTransmissionResult {
  original_text: string;
  encoded_text: string;
  decoded_text: string;

  codes: Record<string, string>;

  original_bits: number;
  encoded_bits: number;

  compression_ratio: number;
  space_saved_percentage: number;

  round_trip_valid: boolean;
}
