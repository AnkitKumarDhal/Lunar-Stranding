from bisect import bisect_right
from typing import List, Optional
from .compat import APIRouter, BaseModel

router = APIRouter(prefix="/api/minigames", tags=["food-production"])


class GreenhouseTask:
    def __init__(self, name, start_hour, end_hour, power_kw, hp_gain):
        self.name = name
        self.start = start_hour
        self.end = end_hour
        self.power_kw = power_kw
        self.hp_gain = hp_gain


class GreenhouseTaskInput(BaseModel):
    name: str
    start_hour: float
    end_hour: float
    power_kw: float
    hp_gain: float


class FoodProductionRequest(BaseModel):
    available_tasks: List[GreenhouseTaskInput]
    selected_tasks: List[str]
    current_hp: float = 100.0
    daily_hp_drain: float = 30.0
    bus_limit_kw: float = 5.0
    session_id: Optional[str] = "default"


def solve_best_schedule(tasks):
    """
    Finds the non-overlapping greenhouse tasks
    that maximize total HP gain.
    """
    if not tasks:
        return 0, []

    sorted_tasks = sorted(tasks, key=lambda t: t.end)
    end_hours = [t.end for t in sorted_tasks]

    n = len(sorted_tasks)
    dp = [0] * (n + 1)

    for i in range(1, n + 1):
        current = sorted_tasks[i - 1]
        prev_idx = bisect_right(end_hours, current.start)

        take = current.hp_gain + dp[prev_idx]
        skip = dp[i - 1]

        dp[i] = max(take, skip)

    # Backtrack to find the selected tasks.
    chosen_tasks = []
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


def simulate_day(
    all_tasks,
    player_chosen_names,
    current_hp,
    daily_hp_drain=30,
    bus_limit_kw=5.0
):
    task_map = {t.name: t for t in all_tasks}
    chosen = [
        task_map[name]
        for name in player_chosen_names
        if name in task_map
    ]

    # Check total power consumption of overlapping tasks.
    for task in chosen:
        active = [
            t for t in chosen
            if t.start <= task.start < t.end
        ]

        combined_kw = round(
            sum(t.power_kw for t in active), 1
        )

        if combined_kw > bus_limit_kw:
            return {
                "status": "POWER_OVERLOAD",
                "message": (
                    f"Overload ({combined_kw} kW > "
                    f"{bus_limit_kw} kW limit) between "
                    f"{', '.join(t.name for t in active)}!"
                ),
                "new_hp": max(0, current_hp - 25),
                "survived_day": current_hp - 25 > 0
            }

    # Calculate HP gained.
    gained_hp = sum(t.hp_gain for t in chosen)
    max_possible_hp, best_tasks = solve_best_schedule(all_tasks)

    new_hp = min(
        100,
        max(0, current_hp - daily_hp_drain + gained_hp)
    )

    return {
        "status": "OK",
        "hp_gained": gained_hp,
        "max_possible_hp_gain": max_possible_hp,
        "daily_drain": daily_hp_drain,
        "new_hp": new_hp,
        "survived_day": new_hp > 0,
        "optimal_plan": [t.name for t in best_tasks]
    }


@router.post("/food-production")
def food_production(req: FoodProductionRequest):
    tasks = [
        GreenhouseTask(
            t.name,
            t.start_hour,
            t.end_hour,
            t.power_kw,
            t.hp_gain
        )
        for t in req.available_tasks
    ]

    return simulate_day(
        tasks,
        req.selected_tasks,
        req.current_hp,
        req.daily_hp_drain,
        req.bus_limit_kw
    )
