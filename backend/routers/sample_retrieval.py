import random

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/minigames", tags=["sample-retrieval"])

SAMPLE_NAMES = [
    "Helium-3 Canister", "Ilmenite Ore", "Anorthosite Core",
    "Volcanic Glass", "KREEP Basalt", "Shocked Breccia",
    "Water Ice Sample", "Rare Earth Regolith", "Titanium Fragment",
    "Apatite Crystal", "Pyroclastic Glass", "Solar Wind Trap",
    "Thorium Grain", "Platinum Dust",
]
MAX_POWER_GAIN = 20.0


class SampleItem(BaseModel):
    id: str
    name: str
    weight: int
    power_value: int


class SampleRetrievalRequest(BaseModel):
    bag_capacity: int = 15
    available_samples: list[SampleItem] = []
    player_sample_ids: list[str] = []


def generate_samples(capacity: int) -> list[SampleItem]:
    """Create a fresh set of ten samples with randomized mass and power value."""
    return [
        SampleItem(
            id=f"s{i + 1}",
            name=name,
            weight=random.randint(1, capacity),
            power_value=random.randint(10, 50),
        )
        for i, name in enumerate(random.sample(SAMPLE_NAMES, 10))
    ]


def knapsack(samples: list[SampleItem], capacity: int) -> tuple[int, int, list[str]]:
    """Return the maximum power value, its total weight, and selected sample IDs."""
    dp = [[0] * (capacity + 1) for _ in range(len(samples) + 1)]

    for i, sample in enumerate(samples, 1):
        for weight in range(capacity + 1):
            dp[i][weight] = dp[i - 1][weight]
            if sample.weight <= weight:
                dp[i][weight] = max(
                    dp[i][weight],
                    dp[i - 1][weight - sample.weight] + sample.power_value,
                )

    chosen = []
    remaining = capacity
    for i in range(len(samples), 0, -1):
        if dp[i][remaining] != dp[i - 1][remaining]:
            sample = samples[i - 1]
            chosen.append(sample.id)
            remaining -= sample.weight

    chosen.reverse()
    weight = sum(sample.weight for sample in samples if sample.id in chosen)
    return dp[-1][capacity], weight, chosen


@router.post("/sample-retrieval")
def sample_retrieval(req: SampleRetrievalRequest):
    capacity = req.bag_capacity
    samples = req.available_samples

    if capacity <= 0:
        raise HTTPException(status_code=400, detail="Bag capacity must be positive")

    # An empty request starts a new randomized sample challenge.
    if not samples:
        return {"bag_capacity": capacity, "available_samples": generate_samples(capacity)}

    item_map = {}
    for sample in samples:
        if sample.weight <= 0 or sample.power_value <= 0:
            raise HTTPException(status_code=400, detail="Sample weight and power value must be positive")
        if sample.id in item_map:
            raise HTTPException(status_code=400, detail=f"Duplicate sample ID: {sample.id}")
        item_map[sample.id] = sample

    optimal_value, optimal_weight, _ = knapsack(samples, capacity)
    player_weight = 0
    player_value = 0
    seen = set()

    for sample_id in req.player_sample_ids:
        if sample_id not in item_map:
            raise HTTPException(status_code=400, detail=f"Unknown sample ID: {sample_id}")
        if sample_id in seen:
            raise HTTPException(status_code=400, detail=f"Duplicate sample selected: {sample_id}")
        seen.add(sample_id)
        sample = item_map[sample_id]
        player_weight += sample.weight
        player_value += sample.power_value

    overweight = player_weight > capacity
    power_gained = 0.0 if overweight or optimal_value == 0 else round(
        MAX_POWER_GAIN * player_value / optimal_value, 2
    )
    status = (
        "PAYLOAD_OVERWEIGHT" if overweight
        else "OPTIMAL_LOADOUT" if player_value == optimal_value
        else "SUBOPTIMAL_LOADOUT"
    )

    if overweight:
        message = f"Cargo overloaded ({player_weight}/{capacity} kg). No power recovered."
    elif status == "OPTIMAL_LOADOUT":
        message = f"Optimal cargo recovered. +{power_gained} power restored."
    else:
        message = f"+{power_gained} of {MAX_POWER_GAIN:g} possible power restored. A better loadout can recover more."

    return {
        "status": status,
        "bag_capacity": capacity,
        "player_total_weight": player_weight,
        "optimal_total_weight": optimal_weight,
        "power_gained": power_gained,
        "max_power_gain": MAX_POWER_GAIN,
        "message": message,
    }
