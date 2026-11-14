from typing import List, Dict, Optional
from .compat import APIRouter, HTTPException, BaseModel

router = APIRouter(prefix="/api/minigames", tags=["sample-retrieval"])


class SampleItem(BaseModel):
    id: str
    name: str
    weight: int
    value: int


class SampleRetrievalRequest(BaseModel):
    bag_capacity: int = 15
    available_samples: List[SampleItem]
    player_sample_ids: List[str]
    session_id: Optional[str] = "default"


# 0/1 knapsack dynamic programming algorithm
def knapsack(capacity, items):
    if capacity <= 0 or not items:
        return 0, 0, []

    n = len(items)
    dp = [[0] * (capacity + 1) for _ in range(n + 1)]

    # fill dp table
    for i in range(1, n + 1):
        wt = items[i - 1].weight
        val = items[i - 1].value
        for w in range(capacity + 1):
            if wt <= w:
                dp[i][w] = max(dp[i - 1][w], dp[i - 1][w - wt] + val)
            else:
                dp[i][w] = dp[i - 1][w]

    # backtrack to find which items were chosen
    chosen = []
    w = capacity
    for i in range(n, 0, -1):
        if dp[i][w] != dp[i - 1][w]:
            item = items[i - 1]
            chosen.append(item.id)
            w -= item.weight

    chosen.reverse()
    total_weight = sum(item.weight for item in items if item.id in chosen)
    return dp[n][capacity], total_weight, chosen


@router.post("/sample-retrieval")
def sample_retrieval(req: SampleRetrievalRequest):
    capacity = req.bag_capacity
    samples = req.available_samples
    player_ids = req.player_sample_ids

    if capacity < 0:
        raise HTTPException(status_code=400, detail="Bag capacity cannot be negative")

    # validate sample items
    item_map = {}
    for s in samples:
        if s.weight <= 0:
            raise HTTPException(status_code=400, detail=f"Sample {s.id} weight must be positive")
        if s.value < 0:
            raise HTTPException(status_code=400, detail=f"Sample {s.id} value cannot be negative")
        if s.id in item_map:
            raise HTTPException(status_code=400, detail=f"Duplicate sample ID in available pool: {s.id}")
        item_map[s.id] = s

    # run knapsack
    opt_val, opt_wt, opt_ids = knapsack(capacity, samples)

    optimal_info = {
        "max_value": opt_val,
        "total_weight": opt_wt,
        "sample_ids": opt_ids
    }

    # validate player choices
    player_wt = 0
    player_val = 0
    seen = set()

    for sid in player_ids:
        if sid not in item_map:
            raise HTTPException(status_code=400, detail=f"Unknown sample id: {sid}")
        if sid in seen:
            raise HTTPException(status_code=400, detail=f"Duplicate sample selected: {sid}")
        seen.add(sid)

        item = item_map[sid]
        player_wt += item.weight
        player_val += item.value

    # check if bag is overloaded
    is_overweight = player_wt > capacity

    if is_overweight:
        status = "PAYLOAD_OVERWEIGHT"
        eff_ratio = 0.0
        eff_pct = 0.0
        mult = 0.0
        msg = f"Overweight! Max capacity is {capacity}kg, you took {player_wt}kg. 0 points."
    else:
        if opt_val == 0:
            eff_ratio = 1.0 if player_val == 0 else 0.0
        else:
            eff_ratio = min(1.0, player_val / opt_val)
        eff_pct = round(eff_ratio * 100.0, 2)

        # compare by total VALUE, not item set (ties exist)
        if player_val >= opt_val and not is_overweight:
            status = "OPTIMAL_LOADOUT"
            mult = 1.5
            msg = f"Optimal load! Gathered {player_val} points. 1.5x bonus."
        elif eff_pct >= 80.0:
            status = "HIGH_EFFICIENCY"
            mult = 1.2
            msg = f"Good load! {eff_pct}% efficiency. 1.2x bonus."
        elif eff_pct >= 50.0:
            status = "MODERATE_EFFICIENCY"
            mult = 1.0
            msg = f"Average load. {eff_pct}% efficiency."
        else:
            status = "LOW_EFFICIENCY"
            mult = 0.5
            msg = f"Low value loadout ({eff_pct}% efficiency)."

    response = {
        "bag_capacity": capacity,
        "optimal": optimal_info,
        "optimal_max_value": opt_val,
        "optimal_total_weight": opt_wt,
        "optimal_sample_ids": opt_ids,
        "player_total_value": player_val,
        "player_total_weight": player_wt,
        "is_overweight": is_overweight,
        "efficiency": eff_ratio,
        "efficiency_percentage": eff_pct,
        "reward_multiplier": mult,
        "status": status,
        "message": msg
    }

    return response
