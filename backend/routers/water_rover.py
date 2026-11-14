import heapq

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/minigames", tags=["water-rover"])


class WaterRoverRequest(BaseModel):
    graph: dict[str, dict[str, float]]
    start_node: str = "Base"
    target_node: str = "IceDeposit"
    player_path: list[str]
    initial_battery: float = 100.0
    session_id: str | None = "default"


# dijkstra algorithm with lazy heap deletion
def dijkstra(graph, start, target):
    if start not in graph or target not in graph:
        return float("inf"), []
    if start == target:
        return 0.0, [start]

    dist = {node: float("inf") for node in graph}
    dist[start] = 0.0
    parent = {node: None for node in graph}

    # min-heap holds tuples: (cost, node)
    pq = [(0.0, start)]
    visited = set()

    while pq:
        cost, curr = heapq.heappop(pq)

        # lazy deletion: skip stale entries
        if cost > dist[curr]:
            continue
        if curr in visited:
            continue
        visited.add(curr)

        if curr == target:
            break

        for nbr, weight in graph.get(curr, {}).items():
            if weight < 0:
                continue  # ignore negative edge weights in dijkstra
            new_cost = cost + weight
            if new_cost < dist.get(nbr, float("inf")):
                dist[nbr] = new_cost
                parent[nbr] = curr
                heapq.heappush(pq, (new_cost, nbr))

    if dist.get(target, float("inf")) == float("inf"):
        return float("inf"), []

    # reconstruct optimal path
    path = []
    curr = target
    while curr is not None:
        path.append(curr)
        curr = parent[curr]
    path.reverse()

    return dist[target], path


# get player path cost and validate
def get_path_cost(graph, path, start, target):
    if not path:
        return None, "Path cannot be empty"
    if path[0] != start:
        return None, f"Path must start at {start}"
    if path[-1] != target:
        return None, f"Path must end at {target}"

    if len(path) == 1 and start == target:
        return 0.0, ""

    total = 0.0
    for i in range(len(path) - 1):
        u, v = path[i], path[i + 1]
        if u not in graph:
            return None, f"Node {u} not found in graph"
        if v not in graph:
            return None, f"Node {v} not found in graph"
        if v not in graph[u]:
            return None, f"No edge from {u} to {v}"
        total += graph[u][v]

    return total, ""


@router.post("/water-rover")
def water_rover_navigation(req: WaterRoverRequest):
    graph = req.graph
    start = req.start_node
    target = req.target_node
    path = req.player_path
    battery = req.initial_battery

    if start not in graph:
        raise HTTPException(status_code=400, detail=f"Start node {start} not found in graph")
    if target not in graph:
        raise HTTPException(status_code=400, detail=f"Target node {target} not found in graph")

    # Dijkstra's algorithm requires all edge weights to be non-negative
    for u, neighbors in graph.items():
        for v, weight in neighbors.items():
            if weight < 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Negative edge weight detected ({u} -> {v}: {weight}). Dijkstra's algorithm requires non-negative edge weights."
                )

    # run dijkstra
    opt_cost, opt_path = dijkstra(graph, start, target)

    # Python None is used instead of float('inf') because standard JSON does not support Infinity; serializes to JSON null
    opt_cost_serializable = round(opt_cost, 2) if opt_cost != float("inf") else None

    optimal_info = {
        "path": opt_path,
        "cost": opt_cost_serializable
    }

    if opt_cost == float("inf"):
        return {
            "is_valid_path": False,
            "status": "UNREACHABLE",
            "optimal": optimal_info,
            "optimal_path": [],
            "optimal_cost": None,  # Standard JSON null for unreachable target
            "player_path": path,
            "player_cost": 0.0,
            "excess_energy_spent": 0.0,
            "efficiency": 0.0,
            "efficiency_percentage": 0.0,
            "remaining_battery": battery,
            "message": f"Target {target} is unreachable from {start}"
        }

    # calculate player cost & validate
    player_cost, err = get_path_cost(graph, path, start, target)
    if player_cost is None:
        return {
            "is_valid_path": False,
            "status": "INVALID_ROUTE",
            "optimal": optimal_info,
            "optimal_path": opt_path,
            "optimal_cost": round(opt_cost, 2),
            "player_path": path,
            "player_cost": 0.0,
            "excess_energy_spent": 0.0,
            "efficiency": 0.0,
            "efficiency_percentage": 0.0,
            "remaining_battery": battery,
            "message": err
        }

    # calculate efficiency and excess energy
    excess = max(0.0, round(player_cost - opt_cost, 2))
    if player_cost == 0 and opt_cost == 0:
        eff_ratio = 1.0
    elif player_cost <= 0:
        eff_ratio = 0.0
    else:
        eff_ratio = min(1.0, opt_cost / player_cost)
    eff_pct = round(eff_ratio * 100.0, 2)

    # battery and stranded logic
    remaining = max(0.0, round(battery - player_cost, 2))
    if battery - player_cost <= 0:
        status = "STRANDED"
        remaining = 0.0
        msg = f"Battery depleted! Needed {player_cost:.1f} kWh, had {battery:.1f} kWh. Rover is stranded."
    elif abs(player_cost - opt_cost) < 1e-5:
        # compare by cost, not path equality (ties exist)
        status = "OPTIMAL"
        msg = f"Optimal route! Cost: {player_cost:.1f} kWh."
    else:
        status = "SUBOPTIMAL"
        msg = f"Completed route with {excess:.1f} kWh extra power used."

    response = {
        "is_valid_path": True,
        "status": status,
        "optimal": optimal_info,
        "optimal_path": opt_path,
        "optimal_cost": round(opt_cost, 2),
        "player_path": path,
        "player_cost": round(player_cost, 2),
        "excess_energy_spent": excess,
        "efficiency": eff_ratio,
        "efficiency_percentage": eff_pct,
        "remaining_battery": remaining,
        "message": msg
    }

    return response
