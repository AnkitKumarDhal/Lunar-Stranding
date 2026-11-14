from typing import List, Tuple, Optional
from .compat import APIRouter, HTTPException, BaseModel

router = APIRouter(prefix="/api/minigames", tags=["rover-workshop"])


class RoverWorkshopRequest(BaseModel):
    a1: List[float]  # Processing times for stations on Line 1
    a2: List[float]  # Processing times for stations on Line 2
    t1: List[float]  # Transfer times from Line 1 to Line 2 (size n - 1)
    t2: List[float]  # Transfer times from Line 2 to Line 1 (size n - 1)
    entry1: float    # Entry time onto Line 1
    entry2: float    # Entry time onto Line 2
    exit1: float     # Exit time from Line 1
    exit2: float     # Exit time from Line 2
    player_sequence: List[int]  # List of 1s and 2s indicating player's station choices
    session_id: Optional[str] = "default"


# Classic CLRS Assembly Line Scheduling using Dynamic Programming
def assembly_line_scheduling(
    a1: List[float],
    a2: List[float],
    t1: List[float],
    t2: List[float],
    entry1: float,
    entry2: float,
    exit1: float,
    exit2: float,
) -> Tuple[float, List[int], List[float], List[float]]:
    """
    Computes minimum total assembly time and optimal sequence of assembly lines
    using Dynamic Programming (CLRS classic algorithm).
    Returns (min_time, optimal_sequence, dp1, dp2).
    """
    n = len(a1)
    if n == 0:
        return 0.0, [], [], []

    # dp1[i] = minimum time to complete through station i ending on Line 1
    # dp2[i] = minimum time to complete through station i ending on Line 2
    dp1 = [0.0] * n
    dp2 = [0.0] * n

    # Base case: entry times + first station processing times
    dp1[0] = entry1 + a1[0]
    dp2[0] = entry2 + a2[0]

    # Predecessor backpointers for path reconstruction:
    # choice1[i] stores the predecessor line (1 or 2) chosen at station i - 1 to reach station i on Line 1
    # choice2[i] stores the predecessor line (1 or 2) chosen at station i - 1 to reach station i on Line 2
    choice1 = [0] * n
    choice2 = [0] * n

    # DP state transitions for stations 1 through n - 1
    for i in range(1, n):
        # Line 1 at station i: stay on Line 1 vs transfer from Line 2
        stay_cost_1 = dp1[i - 1]
        switch_cost_1 = dp2[i - 1] + t2[i - 1]
        if stay_cost_1 <= switch_cost_1:
            dp1[i] = a1[i] + stay_cost_1
            choice1[i] = 1
        else:
            dp1[i] = a1[i] + switch_cost_1
            choice1[i] = 2

        # Line 2 at station i: stay on Line 2 vs transfer from Line 1
        stay_cost_2 = dp2[i - 1]
        switch_cost_2 = dp1[i - 1] + t1[i - 1]
        if stay_cost_2 <= switch_cost_2:
            dp2[i] = a2[i] + stay_cost_2
            choice2[i] = 2
        else:
            dp2[i] = a2[i] + switch_cost_2
            choice2[i] = 1

    # Add exit times to determine the overall minimal time
    total_time_1 = dp1[n - 1] + exit1
    total_time_2 = dp2[n - 1] + exit2

    if total_time_1 <= total_time_2:
        min_total_time = total_time_1
        last_line = 1
    else:
        min_total_time = total_time_2
        last_line = 2

    # Reconstruct optimal sequence of lines (1 or 2) from station 0 to n - 1
    optimal_sequence = [0] * n
    curr_line = last_line
    optimal_sequence[n - 1] = curr_line

    for i in range(n - 1, 0, -1):
        if curr_line == 1:
            curr_line = choice1[i]
        else:
            curr_line = choice2[i]
        optimal_sequence[i - 1] = curr_line

    return min_total_time, optimal_sequence, dp1, dp2


# Calculate the exact total time for a player's selected line sequence
def calculate_player_time(
    a1: List[float],
    a2: List[float],
    t1: List[float],
    t2: List[float],
    entry1: float,
    entry2: float,
    exit1: float,
    exit2: float,
    player_sequence: List[int],
) -> float:
    n = len(player_sequence)
    if n == 0:
        return 0.0

    # Start with entry time and station 0 processing time
    first_line = player_sequence[0]
    total_time = (entry1 if first_line == 1 else entry2) + (a1[0] if first_line == 1 else a2[0])

    # Add station processing times and transfer costs for line switches
    for i in range(1, n):
        prev_line = player_sequence[i - 1]
        curr_line = player_sequence[i]

        if prev_line == 1 and curr_line == 2:
            total_time += t1[i - 1]
        elif prev_line == 2 and curr_line == 1:
            total_time += t2[i - 1]

        total_time += a1[i] if curr_line == 1 else a2[i]

    # Add exit time
    last_line = player_sequence[-1]
    total_time += exit1 if last_line == 1 else exit2

    return total_time


@router.post("/rover-workshop")
def rover_workshop_scheduling(req: RoverWorkshopRequest):
    # Validate processing times arrays length
    if not req.a1 or not req.a2 or len(req.a1) != len(req.a2):
        raise HTTPException(
            status_code=400,
            detail="Processing time arrays a1 and a2 must be non-empty and of equal length."
        )

    n = len(req.a1)

    # Validate transfer times arrays length (must be n - 1 elements)
    if len(req.t1) != n - 1 or len(req.t2) != n - 1:
        raise HTTPException(
            status_code=400,
            detail=f"Transfer time arrays t1 and t2 must contain exactly n - 1 ({n - 1}) elements."
        )

    # Reject negative times
    if req.entry1 < 0 or req.entry2 < 0 or req.exit1 < 0 or req.exit2 < 0:
        raise HTTPException(
            status_code=400,
            detail="Entry and exit times must be non-negative."
        )

    if any(x < 0 for x in req.a1) or any(x < 0 for x in req.a2):
        raise HTTPException(
            status_code=400,
            detail="Processing times must be non-negative."
        )

    if any(x < 0 for x in req.t1) or any(x < 0 for x in req.t2):
        raise HTTPException(
            status_code=400,
            detail="Transfer times must be non-negative."
        )

    # Validate player sequence choices and length
    if len(req.player_sequence) != n:
        raise HTTPException(
            status_code=400,
            detail=f"Player sequence must contain exactly {n} station choices (received {len(req.player_sequence)})."
        )

    if any(choice not in (1, 2) for choice in req.player_sequence):
        raise HTTPException(
            status_code=400,
            detail="Every choice in player sequence must be either Line 1 or Line 2."
        )

    # Compute player total servicing time
    player_time = calculate_player_time(
        req.a1, req.a2, req.t1, req.t2,
        req.entry1, req.entry2, req.exit1, req.exit2,
        req.player_sequence
    )

    # Compute optimal servicing time and line sequence using DP
    opt_time, opt_seq, dp1, dp2 = assembly_line_scheduling(
        req.a1, req.a2, req.t1, req.t2,
        req.entry1, req.entry2, req.exit1, req.exit2
    )

    round_player_time = round(player_time, 2)
    round_opt_time = round(opt_time, 2)
    time_diff = max(0.0, round(round_player_time - round_opt_time, 2))

    # Evaluate player schedule against optimal DP result
    if round_player_time <= round_opt_time:
        status = "OPTIMAL_SCHEDULE"
        eff_ratio = 1.0
        eff_pct = 100.0
        msg = f"OPTIMAL ASSEMBLY SCHEDULE! Minimum servicing time achieved ({round_opt_time} min)."
    else:
        status = "SUBOPTIMAL_SCHEDULE"
        eff_ratio = round_opt_time / round_player_time if round_player_time > 0 else 0.0
        eff_pct = round(eff_ratio * 100.0, 2)
        msg = f"Assembly completed in {round_player_time} min ({time_diff} min extra vs optimal {round_opt_time} min). Efficiency: {eff_pct}%."

    return {
        "is_valid_schedule": True,
        "status": status,
        "optimal": {
            "min_time": round_opt_time,
            "optimal_sequence": opt_seq,
            "dp1": [round(x, 2) for x in dp1],
            "dp2": [round(x, 2) for x in dp2],
        },
        "optimal_time": round_opt_time,
        "optimal_sequence": opt_seq,
        "player_time": round_player_time,
        "player_sequence": req.player_sequence,
        "time_difference": time_diff,
        "efficiency": eff_ratio,
        "efficiency_percentage": eff_pct,
        "message": msg
    }
