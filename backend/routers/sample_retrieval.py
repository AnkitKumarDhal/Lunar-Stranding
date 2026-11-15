import random

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/minigames", tags=["sample-retrieval"])

MINERAL_NAMES = [
    "Ilmenite", "Anorthite", "Pyroxene", "Olivine", "Plagioclase Feldspar",
    "Armalcolite", "Spinel", "Chromite", "Zircon", "Apatite",
    "Tranquillityite", "Troilite", "Whitlockite", "Pigeonite", "Orthopyroxene",
]


class SampleItem(BaseModel):
    id: str
    name: str
    weight: int
    value: int


class SampleRetrievalRequest(BaseModel):
    bag_capacity: int = 15
    available_samples: list[SampleItem] = []
    player_sample_ids: list[str] = []


def generate_samples(capacity: int) -> list[SampleItem]:
    """Generate nine lunar minerals with random weights and values."""
    return [
        SampleItem(
            id=f"s{i + 1}", name=name,
            weight=random.randint(1, capacity), value=random.randint(10, 50),
        )
        for i, name in enumerate(random.sample(MINERAL_NAMES, 9))
    ]


def knapsack(samples: list[SampleItem], capacity: int) -> tuple[int, int]:
    """Return the best total value and the weight of that loadout."""
    dp = [[0] * (capacity + 1) for _ in range(len(samples) + 1)]

    for i, sample in enumerate(samples, 1):
        for weight in range(capacity + 1):
            dp[i][weight] = dp[i - 1][weight]
            if sample.weight <= weight:
                dp[i][weight] = max(
                    dp[i][weight],
                    dp[i - 1][weight - sample.weight] + sample.value,
                )

    optimal_weight = 0
    remaining = capacity
    for i in range(len(samples), 0, -1):
        if dp[i][remaining] > dp[i - 1][remaining]:
            sample = samples[i - 1]
            optimal_weight += sample.weight
            remaining -= sample.weight

    return dp[-1][capacity], optimal_weight


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
        if sample.weight <= 0 or sample.value <= 0:
            raise HTTPException(status_code=400, detail="Sample weight and value must be positive")
        if sample.id in item_map:
            raise HTTPException(status_code=400, detail=f"Duplicate sample ID: {sample.id}")
        item_map[sample.id] = sample

    optimal_value, optimal_weight = knapsack(samples, capacity)
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
        player_value += sample.value

    overweight = player_weight > capacity
    status = (
        "PAYLOAD_OVERWEIGHT" if overweight
        else "OPTIMAL_LOADOUT" if player_value == optimal_value
        else "SUBOPTIMAL_LOADOUT"
    )

    if overweight:
        message = f"Cargo overloaded ({player_weight}/{capacity} kg). Remove some samples."
    elif status == "OPTIMAL_LOADOUT":
        message = f"Optimal loadout! Maximum value {player_value} within the cargo limit."
    else:
        message = f"Valid loadout: value {player_value}. The best possible value is {optimal_value}."

    return {
        "status": status,
        "bag_capacity": capacity,
        "player_total_weight": player_weight,
        "player_total_value": player_value,
        "optimal_total_weight": optimal_weight,
        "optimal_total_value": optimal_value,
        "message": message,
    }
