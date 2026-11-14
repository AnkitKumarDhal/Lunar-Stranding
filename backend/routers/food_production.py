import random
from bisect import bisect_right

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/minigames", tags=["food-production"])

TASK_NAMES = [
    "UV Water Sterilization",
    "Red/Blue LED Photosynthesis",
    "Aeroponic Root Mist Cycle",
    "Algae Bioreactor Agitation",
    "Thermal Canopy Heating",
    "Microgreen Harvest Cycle",
    "Nutrient Solution Circulation",
    "Seed Germination Chamber",
    "CO2 Recovery System",
    "Root-Zone Temperature Control",
]
TASK_COUNT = 6
POWER_COST_PER_KWH = 0.1  # 1 HUD power point per 10 kWh used.


class TaskModel(BaseModel):
    name: str
    start_hour: int
    end_hour: int
    power_kw: float
    hp_gain: int


class FoodProductionRequest(BaseModel):
    available_tasks: list[TaskModel] | None = None
    selected_tasks: list[str] | None = None
    current_hp: int = 80
    daily_hp_drain: int = 30
    bus_limit_kw: float = 5.0


def generate_food_game():
    """Create six randomly ordered greenhouse tasks for a new cycle."""
    tasks = []
    for name in random.sample(TASK_NAMES, TASK_COUNT):
        duration = random.randint(2, 6)
        start = random.randint(0, 24 - duration)
        # HP yield = task duration multiplied by a random 2-4 HP per hour.
        tasks.append({
            "name": name,
            "start_hour": start,
            "end_hour": start + duration,
            "power_kw": round(random.uniform(1.5, 4.8), 1),
            "hp_gain": duration * random.randint(2, 4),
        })

    return {"available_tasks": tasks}


# Weighted Activity Selection using Dynamic Programming.
def solve_best_schedule(tasks: list[TaskModel], bus_limit_kw: float):
    # Sort only for DP; the generated task order stays randomized in the UI.
    tasks = sorted((t for t in tasks if t.power_kw <= bus_limit_kw), key=lambda t: t.end_hour)
    if not tasks:
        return 0, []

    end_hours = [t.end_hour for t in tasks]
    dp = [0] * (len(tasks) + 1)

    for i, task in enumerate(tasks, 1):
        previous = bisect_right(end_hours, task.start_hour)
        dp[i] = max(task.hp_gain + dp[previous], dp[i - 1])

    chosen = []
    i = len(tasks)
    while i:
        task = tasks[i - 1]
        previous = bisect_right(end_hours, task.start_hour)
        if task.hp_gain + dp[previous] >= dp[i - 1]:
            chosen.append(task)
            i = previous
        else:
            i -= 1

    return dp[-1], chosen[::-1]


def simulate_day(
    tasks: list[TaskModel],
    selected_names: list[str],
    current_hp: int,
    daily_drain: int,
    bus_limit_kw: float,
    optimal_hp: int,
) -> dict[str, object]:
    task_map = {task.name: task for task in tasks}
    chosen = [task_map[name] for name in selected_names]
    # Check concurrent draw at each task start, where the load can increase.
    peak_power = max((
        sum(t.power_kw for t in chosen if t.start_hour <= task.start_hour < t.end_hour)
        for task in chosen
    ), default=0.0)
    # Energy (kWh) = power (kW) x duration (hours); 10 kWh costs 1 HUD point.
    energy_kwh = sum(t.power_kw * (t.end_hour - t.start_hour) for t in chosen)
    power_consumed = round(energy_kwh * POWER_COST_PER_KWH, 2)

    gained_hp = 0
    penalty = 0
    ordered = sorted(chosen, key=lambda t: t.start_hour)

    if peak_power > bus_limit_kw:
        status = "POWER_OVERLOAD"
        penalty = 25
        message = f"POWER OVERLOAD! Peak draw of {peak_power:.1f} kW exceeded the {bus_limit_kw:.1f} kW bus limit. Breaker tripped (-25 HP penalty)."
    else:
        overlap = next((
            (left, right) for left, right in zip(ordered, ordered[1:])
            if left.end_hour > right.start_hour
        ), None)

        if overlap:
            status = "SCHEDULING_CONFLICT"
            penalty = 15
            left, right = overlap
            message = f"SCHEDULING CONFLICT! '{left.name}' and '{right.name}' overlap. Tasks must not overlap (-15 HP penalty)."
        else:
            gained_hp = sum(t.hp_gain for t in chosen)
            status = "OPTIMAL" if gained_hp >= optimal_hp else "SUBOPTIMAL"
            message = (
                f"OPTIMAL SCHEDULE! Restored +{gained_hp} HP."
                if status == "OPTIMAL"
                else f"Valid schedule restored +{gained_hp} HP (optimal maximum was +{optimal_hp} HP)."
            )

    # Daily drain and any scheduling penalty are applied before task recovery.
    new_hp = min(100, max(0, current_hp - daily_drain - penalty + gained_hp))
    message += f" Final Crew HP: {new_hp}%."

    return {
        "status": status,
        "message": message,
        "peak_power_kw": round(peak_power, 2),
        "power_consumed": power_consumed,
        "hp_gained": gained_hp,
        "new_hp": new_hp,
        "survived_day": new_hp > 0,
    }


@router.post("/food-production")
def food_production_scheduling(req: FoodProductionRequest):
    # An empty request generates a new randomized task set on the same endpoint.
    if not req.available_tasks:
        return generate_food_game()

    if req.bus_limit_kw < 0:
        raise HTTPException(status_code=400, detail="Power bus limit cannot be negative.")

    seen_names = set()
    for task in req.available_tasks:
        if not (0 <= task.start_hour < task.end_hour <= 24):
            raise HTTPException(status_code=400, detail=f"Task '{task.name}' has an invalid time interval.")
        if task.power_kw < 0 or task.hp_gain < 0:
            raise HTTPException(status_code=400, detail=f"Task '{task.name}' cannot have negative power or HP gain.")
        if task.name in seen_names:
            raise HTTPException(status_code=400, detail=f"Duplicate task name '{task.name}'.")
        seen_names.add(task.name)

    tasks = req.available_tasks
    selected_names = req.selected_tasks or []
    for name in selected_names:
        if name not in seen_names:
            raise HTTPException(status_code=400, detail=f"Selected task '{name}' not found in available tasks.")

    optimal_hp, best_tasks = solve_best_schedule(tasks, req.bus_limit_kw)
    result = simulate_day(
        tasks, selected_names, req.current_hp, req.daily_hp_drain,
        req.bus_limit_kw, optimal_hp,
    )

    return {
        "status": result["status"],
        "optimal": {"max_hp_gain": optimal_hp, "tasks": [t.name for t in best_tasks]},
        "player_hp_gain": result["hp_gained"],
        "final_hp": result["new_hp"],
        "survived_day": result["survived_day"],
        "peak_power_kw": result["peak_power_kw"],
        "bus_limit_kw": req.bus_limit_kw,
        "power_consumed": result["power_consumed"],
        "message": result["message"],
    }
