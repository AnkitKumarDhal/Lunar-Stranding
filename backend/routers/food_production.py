from bisect import bisect_right
from typing import List, Optional, Dict, Any
from .compat import APIRouter, HTTPException, BaseModel

router = APIRouter(prefix="/api/minigames", tags=["food-production"])


class TaskModel(BaseModel):
    name: str
    start_hour: int
    end_hour: int
    power_kw: float
    hp_gain: int


class FoodProductionRequest(BaseModel):
    available_tasks: List[TaskModel]
    selected_tasks: Optional[List[str]] = None
    selected_task_names: Optional[List[str]] = None
    current_hp: int = 100
    daily_hp_drain: int = 30
    bus_limit_kw: float = 5.0
    session_id: Optional[str] = "default"


class GreenhouseTask:
    def __init__(self, name: str, start_hour: int, end_hour: int, power_kw: float, hp_gain: int):
        self.name = name
        self.start = start_hour
        self.end = end_hour
        self.power_kw = power_kw
        self.hp_gain = hp_gain


# Weighted Activity Selection via Dynamic Programming
def solve_best_schedule(tasks: List[GreenhouseTask]):
    if not tasks:
        return 0, []

    sorted_tasks = sorted(tasks, key=lambda t: t.end)
    n = len(sorted_tasks)
    end_hours = [t.end for t in sorted_tasks]

    # dp[i] = maximum HP gain possible using a subset of the first i tasks
    dp = [0] * (n + 1)

    for i in range(1, n + 1):
        current = sorted_tasks[i - 1]
        prev_idx = bisect_right(end_hours, current.start)

        take = current.hp_gain + dp[prev_idx]
        skip = dp[i - 1]
        dp[i] = max(take, skip)

    # Backtrack to identify chosen tasks
    chosen_tasks: List[GreenhouseTask] = []
    i = n
    while i > 0:
        current = sorted_tasks[i - 1]
        prev_idx = bisect_right(end_hours, current.start)

        if current.hp_gain + dp[prev_idx] >= dp[i - 1]:
            chosen_tasks.append(current)
            i = prev_idx
        else:
            i -= 1

    chosen_tasks.reverse()
    return dp[n], chosen_tasks


# Simulate day with accurate power bus and non-overlapping schedule validation
def simulate_day(
    all_tasks: List[GreenhouseTask],
    player_chosen_names: List[str],
    current_hp: int = 100,
    daily_hp_drain: int = 30,
    bus_limit_kw: float = 5.0,
) -> Dict[str, Any]:
    task_map = {t.name: t for t in all_tasks}
    chosen = [task_map[name] for name in player_chosen_names if name in task_map]

    # 1. Compute peak simultaneous power across all hours
    peak_power = 0.0
    if chosen:
        time_checkpoints = set(t.start for t in chosen)
        for t_point in time_checkpoints:
            concurrent_power = sum(t.power_kw for t in chosen if t.start <= t_point < t.end)
            if concurrent_power > peak_power:
                peak_power = concurrent_power
    peak_power = round(peak_power, 2)

    # 2. Check for actual power bus overload (exceeding kW limit)
    if peak_power > bus_limit_kw:
        penalized_hp = max(0, current_hp - 25)
        return {
            "status": "POWER_OVERLOAD",
            "is_valid_schedule": False,
            "message": (
                f"POWER OVERLOAD! Simultaneous draw of {peak_power:.1f} kW exceeded "
                f"the {bus_limit_kw:.1f} kW bus threshold. Breaker tripped (-25 HP penalty)."
            ),
            "peak_power_kw": peak_power,
            "hp_gained": 0,
            "new_hp": penalized_hp,
            "survived_day": penalized_hp > 0,
        }

    # 3. Check for hydroponics scheduling conflicts (overlapping time slots)
    chosen_sorted = sorted(chosen, key=lambda t: t.start)
    for i in range(len(chosen_sorted)):
        for j in range(i + 1, len(chosen_sorted)):
            if max(chosen_sorted[i].start, chosen_sorted[j].start) < min(chosen_sorted[i].end, chosen_sorted[j].end):
                penalized_hp = max(0, current_hp - 15)
                return {
                    "status": "SCHEDULING_CONFLICT",
                    "is_valid_schedule": False,
                    "message": (
                        f"SCHEDULING CONFLICT! Tasks '{chosen_sorted[i].name}' and '{chosen_sorted[j].name}' "
                        f"overlap in the hydroponic growth bay. Tasks must not overlap."
                    ),
                    "peak_power_kw": peak_power,
                    "hp_gained": 0,
                    "new_hp": penalized_hp,
                    "survived_day": penalized_hp > 0,
                }

    # 4. Valid schedule: calculate net HP
    gained_hp = sum(t.hp_gain for t in chosen)
    max_possible_hp, best_tasks = solve_best_schedule(all_tasks)

    # Calculate end of day HP capped between 0 and 100
    new_hp = min(100, max(0, current_hp - daily_hp_drain + gained_hp))
    is_optimal = (gained_hp >= max_possible_hp)

    return {
        "status": "OPTIMAL" if is_optimal else "SUBOPTIMAL",
        "is_valid_schedule": True,
        "message": (
            f"OPTIMAL SCHEDULE! Restored +{gained_hp} HP with 0 conflicts. Final Crew HP: {new_hp}%."
            if is_optimal
            else f"Valid schedule restored +{gained_hp} HP (optimal max was +{max_possible_hp} HP). Final Crew HP: {new_hp}%."
        ),
        "peak_power_kw": peak_power,
        "hp_gained": gained_hp,
        "max_possible_hp_gain": max_possible_hp,
        "daily_drain": daily_hp_drain,
        "new_hp": new_hp,
        "survived_day": new_hp > 0,
        "optimal_plan": [t.name for t in best_tasks],
    }


@router.post("/food-production")
def food_production_scheduling(req: FoodProductionRequest):
    if not req.available_tasks:
        raise HTTPException(status_code=400, detail="Available tasks list cannot be empty")

    # Support either selected_tasks or selected_task_names
    chosen_names = req.selected_task_names if req.selected_task_names is not None else (req.selected_tasks or [])

    # Map request models to GreenhouseTask objects
    task_objs = [
        GreenhouseTask(t.name, t.start_hour, t.end_hour, t.power_kw, t.hp_gain)
        for t in req.available_tasks
    ]

    opt_hp, best_tasks = solve_best_schedule(task_objs)
    opt_names = [t.name for t in best_tasks]

    optimal_info = {
        "max_hp_gain": opt_hp,
        "tasks": opt_names
    }

    # Validate that chosen task names exist
    known_names = {t.name for t in task_objs}
    for name in chosen_names:
        if name not in known_names:
            raise HTTPException(status_code=400, detail=f"Selected task '{name}' not found in available tasks")

    # Run simulation
    sim_result = simulate_day(
        task_objs,
        chosen_names,
        current_hp=req.current_hp,
        daily_hp_drain=req.daily_hp_drain,
        bus_limit_kw=req.bus_limit_kw
    )

    player_hp = sim_result["hp_gained"]
    if opt_hp > 0:
        eff_ratio = min(1.0, player_hp / opt_hp) if sim_result["is_valid_schedule"] else 0.0
    else:
        eff_ratio = 1.0 if player_hp == 0 else 0.0

    return {
        "status": sim_result["status"],
        "is_valid_schedule": sim_result["is_valid_schedule"],
        "optimal": optimal_info,
        "optimal_hp_gain": opt_hp,
        "optimal_tasks": opt_names,
        "player_hp_gain": player_hp,
        "player_tasks": chosen_names,
        "current_hp": req.current_hp,
        "daily_drain": req.daily_hp_drain,
        "final_hp": sim_result["new_hp"],
        "survived_day": sim_result["survived_day"],
        "peak_power_kw": sim_result["peak_power_kw"],
        "bus_limit_kw": req.bus_limit_kw,
        "efficiency": eff_ratio,
        "efficiency_percentage": round(eff_ratio * 100.0, 2),
        "message": sim_result["message"]
    }
