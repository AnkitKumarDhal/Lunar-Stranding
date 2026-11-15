import random

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/minigames", tags=["rover-workshop"])

PROCESS_NAMES = [
    "Chassis Alignment",
    "ECLSS Scrubber",
    "Armor Plating",
    "RTG Thermal Core",
    "LIDAR Calibration",
    "Wheel Actuator Repair",
    "Pressure Seal Test",
    "Battery Diagnostics",
    "Navigation Sensor Tune-Up",
    "Radiator Inspection",
    "Communications Array Repair",
    "Suspension Calibration",
]
STATION_COUNT = 5
HUD_POWER_PER_KWH = 1.0


class RoverWorkshopRequest(BaseModel):
    process_names: list[str] | None = None
    a1: list[float] | None = None
    a2: list[float] | None = None
    t1: list[float] | None = None
    t2: list[float] | None = None
    entry1: float | None = None
    entry2: float | None = None
    exit1: float | None = None
    exit2: float | None = None
    power_kw: list[float] | None = None
    player_sequence: list[int] | None = None


def generate_rover_workshop_game():
    """Generate five random repair processes and their line costs."""
    return {
        "process_names": random.sample(PROCESS_NAMES, STATION_COUNT),
        "a1": [random.randint(4, 10) for _ in range(STATION_COUNT)],
        "a2": [random.randint(4, 10) for _ in range(STATION_COUNT)],
        "t1": [random.randint(1, 3) for _ in range(STATION_COUNT - 1)],
        "t2": [random.randint(1, 3) for _ in range(STATION_COUNT - 1)],
        "entry1": random.randint(1, 4),
        "entry2": random.randint(1, 4),
        "exit1": random.randint(1, 4),
        "exit2": random.randint(1, 4),
        "power_kw": [round(random.uniform(2.0, 4.5), 1) for _ in range(STATION_COUNT)],
    }


# Assembly Line Scheduling with DP and path reconstruction.
def assembly_line_scheduling(
    a1: list[float], a2: list[float], t1: list[float], t2: list[float],
    entry1: float, entry2: float, exit1: float, exit2: float,
) -> tuple[float, list[int]]:
    n = len(a1)
    dp1 = [entry1 + a1[0]] + [0.0] * (n - 1)
    dp2 = [entry2 + a2[0]] + [0.0] * (n - 1)
    prev1 = [1] * n
    prev2 = [2] * n

    for i in range(1, n):
        stay1, switch1 = dp1[i - 1], dp2[i - 1] + t2[i - 1]
        stay2, switch2 = dp2[i - 1], dp1[i - 1] + t1[i - 1]

        dp1[i] = a1[i] + min(stay1, switch1)
        dp2[i] = a2[i] + min(stay2, switch2)
        prev1[i] = 1 if stay1 <= switch1 else 2
        prev2[i] = 2 if stay2 <= switch2 else 1

    line = 1 if dp1[-1] + exit1 <= dp2[-1] + exit2 else 2
    min_time = dp1[-1] + exit1 if line == 1 else dp2[-1] + exit2

    sequence = [0] * n
    sequence[-1] = line
    for i in range(n - 1, 0, -1):
        line = prev1[i] if line == 1 else prev2[i]
        sequence[i - 1] = line

    return min_time, sequence


def calculate_player_time(req: RoverWorkshopRequest) -> float:
    lines = req.player_sequence
    total = (req.entry1 if lines[0] == 1 else req.entry2)
    total += req.a1[0] if lines[0] == 1 else req.a2[0]

    for i in range(1, len(lines)):
        previous, current = lines[i - 1], lines[i]
        if previous != current:
            total += req.t1[i - 1] if previous == 1 else req.t2[i - 1]
        total += req.a1[i] if current == 1 else req.a2[i]

    return total + (req.exit1 if lines[-1] == 1 else req.exit2)


@router.post("/rover-workshop")
def rover_workshop_scheduling(req: RoverWorkshopRequest):
    # An empty request creates a new work order on this same endpoint.
    if req.a1 is None:
        return generate_rover_workshop_game()

    required = (
        req.process_names, req.a2, req.t1, req.t2, req.entry1, req.entry2,
        req.exit1, req.exit2, req.power_kw, req.player_sequence,
    )
    if any(value is None for value in required):
        raise HTTPException(status_code=400, detail="Incomplete rover workshop schedule data.")

    n = len(req.a1)
    if n == 0 or len(req.a2) != n or len(req.process_names) != n or len(req.power_kw) != n:
        raise HTTPException(status_code=400, detail="Process and line arrays must have the same non-zero length.")
    if len(req.t1) != n - 1 or len(req.t2) != n - 1:
        raise HTTPException(status_code=400, detail=f"Transfer arrays must contain exactly {n - 1} values.")
    if len(req.player_sequence) != n or any(line not in (1, 2) for line in req.player_sequence):
        raise HTTPException(status_code=400, detail="Choose Line 1 or Line 2 for every process.")

    times = [*req.a1, *req.a2, *req.t1, *req.t2, req.entry1, req.entry2, req.exit1, req.exit2]
    if any(value < 0 for value in times) or any(power <= 0 for power in req.power_kw):
        raise HTTPException(status_code=400, detail="Times must be non-negative and process power must be positive.")

    optimal_time, optimal_sequence = assembly_line_scheduling(
        req.a1, req.a2, req.t1, req.t2,
        req.entry1, req.entry2, req.exit1, req.exit2,
    )
    player_time = calculate_player_time(req)
    extra_time = max(0.0, player_time - optimal_time)

    # Average process draw (kW) multiplied by servicing time (hours) gives kWh.
    power_consumed = round((sum(req.power_kw) / n) * player_time / 60 * HUD_POWER_PER_KWH, 2)
    optimal = extra_time < 1e-9
    status = "OPTIMAL_SCHEDULE" if optimal else "SUBOPTIMAL_SCHEDULE"
    message = (
        f"Optimal schedule completed in {optimal_time:.1f} min."
        if optimal else
        f"Schedule took {player_time:.1f} min ({extra_time:.1f} min above optimal)."
    )

    return {
        "status": status,
        "optimal": {"time": round(optimal_time, 2), "sequence": optimal_sequence},
        "player_time": round(player_time, 2),
        "time_difference": round(extra_time, 2),
        "power_consumed": power_consumed,
        "message": f"{message} Power used: {power_consumed:.2f}. "
                   "Shorter schedules use less power. One kWh drains one HUD power point.",
    }
