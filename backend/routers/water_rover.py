import heapq

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/minigames", tags=["water-rover"])


class WaterRoverRequest(BaseModel):
    graph: dict[str, dict[str, float]]
    start_node: str = "Base"
    target_node: str = "IceDeposit"
    player_path: list[str]


# Dijkstra finds the least-cost route using non-negative edge weights.
def dijkstra(graph, start, target):
    if start not in graph or target not in graph:
        return float("inf"), []

    dist = {node: float("inf") for node in graph}
    parent = {node: None for node in graph}
    dist[start] = 0.0
    queue = [(0.0, start)]

    while queue:
        cost, node = heapq.heappop(queue)
        if cost > dist[node]:
            continue
        if node == target:
            break

        for neighbor, weight in graph[node].items():
            new_cost = cost + weight
            if new_cost < dist.get(neighbor, float("inf")):
                dist[neighbor] = new_cost
                parent[neighbor] = node
                heapq.heappush(queue, (new_cost, neighbor))

    if dist[target] == float("inf"):
        return float("inf"), []

    path = []
    node = target
    while node is not None:
        path.append(node)
        node = parent[node]
    return dist[target], path[::-1]


def get_path_cost(graph, path, start, target):
    if not path or path[0] != start or path[-1] != target:
        return None, f"Path must start at {start} and end at {target}"

    total = 0.0
    for u, v in zip(path, path[1:]):
        if v not in graph.get(u, {}):
            return None, f"No edge from {u} to {v}"
        total += graph[u][v]
    return total, ""


@router.post("/water-rover")
def water_rover_navigation(req: WaterRoverRequest):
    graph, start, target, path = req.graph, req.start_node, req.target_node, req.player_path

    if start not in graph:
        raise HTTPException(status_code=400, detail=f"Start node {start} not found in graph")
    if target not in graph:
        raise HTTPException(status_code=400, detail=f"Target node {target} not found in graph")

    for u, neighbors in graph.items():
        for v, weight in neighbors.items():
            if weight < 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Negative edge weight detected ({u} -> {v}: {weight}). Dijkstra's algorithm requires non-negative edge weights."
                )

    optimal_cost, optimal_path = dijkstra(graph, start, target)
    if optimal_cost == float("inf"):
        return {
            "status": "UNREACHABLE",
            "optimal_path": [],
            "optimal_cost": None,
            "player_cost": 0.0,
            "power_consumed": 0.0,
            "message": f"Target {target} is unreachable from {start}"
        }

    player_cost, error = get_path_cost(graph, path, start, target)
    if player_cost is None:
        return {
            "status": "INVALID_ROUTE",
            "optimal_path": optimal_path,
            "optimal_cost": round(optimal_cost, 2),
            "player_cost": 0.0,
            "power_consumed": 0.0,
            "message": error
        }

    # Every trip costs 8 power; extra route energy increases the cost up to 30.
    power_consumed = round(min(30.0, 8.0 + 12.0 * max(0.0, player_cost - optimal_cost) / max(optimal_cost, 1.0)), 2)
    status = "OPTIMAL" if abs(player_cost - optimal_cost) < 1e-5 else "SUBOPTIMAL"
    message = (
        f"Optimal route completed. Power consumed: {power_consumed:.2f}."
        if status == "OPTIMAL"
        else f"Route used {player_cost - optimal_cost:.1f} kWh extra. Power consumed: {power_consumed:.2f}."
    )

    return {
        "status": status,
        "optimal_path": optimal_path,
        "optimal_cost": round(optimal_cost, 2),
        "player_cost": round(player_cost, 2),
        "power_consumed": power_consumed,
        "message": message
    }
