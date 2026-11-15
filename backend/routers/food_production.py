import random

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
TASK_COUNT = 7
POWER_COST_PER_KWH = 0.1  # 10 kWh uses 1 HUD power point.


class TaskModel(BaseModel):
    name: str
    start_hour: int
    end_hour: int
    power_kw: float


class FoodProductionRequest(BaseModel):
    available_tasks: list[TaskModel] | None = None
    selected_tasks: list[str] | None = None
    bus_limit_kw: float = 5.0


def generate_food_game():
    """Generate seven randomized greenhouse activities."""
    tasks = []
    for name in random.sample(TASK_NAMES, TASK_COUNT):
        duration = random.randint(2, 6)
        start = random.randint(0, 24 - duration)
        tasks.append({
            "name": name,
            "start_hour": start,
            "end_hour": start + duration,
            "power_kw": round(random.uniform(1.5, 4.8), 1),
        })
    return {"available_tasks": tasks}


# Greedy Activity Selection: choose the most non-overlapping tasks.
def solve_best_schedule(tasks: list[TaskModel], bus_limit_kw: float):
    tasks = sorted(
        (task for task in tasks if task.power_kw <= bus_limit_kw),
        key=lambda task: task.end_hour,
    )
    chosen = []
    last_end = 0

    for task in tasks:
        if task.start_hour >= last_end:
            chosen.append(task)
            last_end = task.end_hour

    return chosen


@router.post("/food-production")
def food_production_scheduling(req: FoodProductionRequest):
    # An empty request generates a new randomized task set on the same endpoint.
    if not req.available_tasks:
        return generate_food_game()

    if req.bus_limit_kw < 0:
        raise HTTPException(status_code=400, detail="Power bus limit cannot be negative.")

    tasks = {}
    for task in req.available_tasks:
        if not (0 <= task.start_hour < task.end_hour <= 24):
            raise HTTPException(status_code=400, detail=f"Task '{task.name}' has an invalid time interval.")
        if task.power_kw < 0:
            raise HTTPException(status_code=400, detail=f"Task '{task.name}' cannot have negative power.")
        if task.name in tasks:
            raise HTTPException(status_code=400, detail=f"Duplicate task name '{task.name}'.")
        tasks[task.name] = task

    selected = []
    for name in req.selected_tasks or []:
        if name not in tasks:
            raise HTTPException(status_code=400, detail=f"Selected task '{name}' not found in available tasks.")
        selected.append(tasks[name])

    # Energy (kWh) = power (kW) x duration (hours); 10 kWh costs 1 HUD point.
    energy = sum(task.power_kw * (task.end_hour - task.start_hour) for task in selected)
    power_consumed = round(energy * POWER_COST_PER_KWH, 2)
    peak_power = max((
        sum(t.power_kw for t in selected if t.start_hour <= task.start_hour < t.end_hour)
        for task in selected
    ), default=0.0)

    optimal = solve_best_schedule(req.available_tasks, req.bus_limit_kw)

    if peak_power > req.bus_limit_kw:
        status = "POWER_OVERLOAD"
        message = f"POWER OVERLOAD! Peak draw of {peak_power:.1f} kW exceeded the {req.bus_limit_kw:.1f} kW bus limit."
    else:
        ordered = sorted(selected, key=lambda task: task.start_hour)
        overlap = next(((a, b) for a, b in zip(ordered, ordered[1:]) if a.end_hour > b.start_hour), None)
        if overlap:
            status = "SCHEDULING_CONFLICT"
            message = f"'{overlap[0].name}' and '{overlap[1].name}' overlap. Choose non-overlapping tasks."
        else:
            status = "OPTIMAL" if len(selected) == len(optimal) else "SUBOPTIMAL"
            message = (
                f"OPTIMAL SCHEDULE! You selected the maximum {len(optimal)} tasks."
                if status == "OPTIMAL"
                else f"You selected {len(selected)} tasks. A maximum of {len(optimal)} non-overlapping tasks is possible."
            )

    return {
        "status": status,
        "optimal": {"max_tasks": len(optimal), "tasks": [task.name for task in optimal]},
        "player_task_count": len(selected),
        "peak_power_kw": round(peak_power, 2),
        "bus_limit_kw": req.bus_limit_kw,
        "power_consumed": power_consumed,
        "message": message,
    }
