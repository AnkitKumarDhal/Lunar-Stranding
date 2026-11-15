import random

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/minigames", tags=["mining-rover"])

START_NODE = "Base"
TARGET_NODE = "Excavation"
ROUTES = [
    ("Base", "Crater_Site"),
    ("Base", "Anomaly_Zone"),
    ("Crater_Site", "Deep_Shaft"),
    ("Crater_Site", "Anomaly_Zone"),
    ("Anomaly_Zone", "Lava_Tube"),
    ("Anomaly_Zone", "Deep_Shaft"),
    ("Deep_Shaft", "Excavation"),
    ("Lava_Tube", "Excavation"),
]


class MiningRoverRequest(BaseModel):
    edges: list[list[object]] | None = None
    start_node: str = START_NODE
    target_node: str = TARGET_NODE
    player_path: list[str] = []


def generate_mining_game():
    # Keep the same directed map, but vary every edge cost each round.
    weights = [random.randint(-5, -1), 0] + [random.randint(1, 8) for _ in range(6)]
    random.shuffle(weights)
    return {
        "edges": [[u, v, weight] for (u, v), weight in zip(ROUTES, weights)],
        "start_node": START_NODE,
        "target_node": TARGET_NODE,
    }


def bellman_ford_shortest_path(edges: list[tuple[str, str, float]], start: str):
    nodes = {u for u, _, _ in edges} | {v for _, v, _ in edges}
    distances = {node: float("inf") for node in nodes}
    previous = {node: None for node in nodes}
    distances[start] = 0.0

    # Relax each edge until paths stop changing or V - 1 passes are complete.
    for _ in range(len(nodes) - 1):
        changed = False
        for u, v, cost in edges:
            if distances[u] != float("inf") and distances[u] + cost < distances[v]:
                distances[v] = distances[u] + cost
                previous[v] = u
                changed = True
        if not changed:
            break

    has_negative_cycle = any(
        distances[u] != float("inf") and distances[u] + cost < distances[v]
        for u, v, cost in edges
    )
    return distances, previous, has_negative_cycle


def validate_player_route(edges: list[tuple[str, str, float]], path: list[str], start: str, target: str):
    if not path or path[0] != start or path[-1] != target:
        return False, 0.0, f"Route must start at {start} and end at {target}."

    edge_costs = {(u, v): cost for u, v, cost in edges}
    total_cost = 0.0
    for u, v in zip(path, path[1:]):
        if (u, v) not in edge_costs:
            return False, 0.0, f"No directed route from {u} to {v}."
        total_cost += edge_costs[(u, v)]

    return True, total_cost, ""


@router.post("/mining-rover")
def mining_rover_navigation(req: MiningRoverRequest):
    # An empty request starts a new randomized navigation challenge.
    if req.edges is None:
        return generate_mining_game()
    if not req.edges:
        raise HTTPException(status_code=400, detail="Edges list cannot be empty")

    edges = []
    for edge in req.edges:
        if len(edge) != 3:
            raise HTTPException(status_code=400, detail="Each edge must contain a start, end and cost")
        edges.append((str(edge[0]), str(edge[1]), float(edge[2])))

    start, target = req.start_node, req.target_node
    if start not in {u for u, _, _ in edges}:
        raise HTTPException(status_code=400, detail=f"Start node '{start}' not found")

    distances, previous, has_negative_cycle = bellman_ford_shortest_path(edges, start)
    optimal_cost = distances.get(target, float("inf"))

    if has_negative_cycle:
        return {
            "status": "NEGATIVE_CYCLE_DETECTED",
            "optimal_path": [], "optimal_cost": None, "player_cost": 0.0,
            "power_change": 0.0,
            "message": "A gravitational loop was detected. Choose a different route.",
        }

    if optimal_cost == float("inf"):
        return {
            "status": "UNREACHABLE",
            "optimal_path": [], "optimal_cost": None, "player_cost": 0.0,
            "power_change": 0.0,
            "message": f"{target} cannot be reached from {start}.",
        }

    # Reconstruct the shortest path from the predecessor map.
    optimal_path = []
    current = target
    while current is not None:
        optimal_path.append(current)
        if current == start:
            break
        current = previous[current]
    optimal_path.reverse()

    valid, player_cost, error = validate_player_route(edges, req.player_path, start, target)
    if not valid:
        return {
            "status": "INVALID_ROUTE",
            "optimal_path": optimal_path, "optimal_cost": round(optimal_cost, 2),
            "player_cost": 0.0, "power_change": 0.0, "message": error,
        }

    # Positive net cost drains power; negative cost regenerates it.
    power_change = round(-player_cost * 0.5, 2)
    status = "OPTIMAL" if player_cost == optimal_cost else "SUBOPTIMAL"
    message = (
        f"Optimal route! Net energy cost: {player_cost:.2f} kWh."
        if status == "OPTIMAL"
        else f"Route completed. Net energy cost: {player_cost:.2f} kWh; optimal: {optimal_cost:.2f} kWh."
    )

    return {
        "status": status,
        "optimal_path": optimal_path,
        "optimal_cost": round(optimal_cost, 2),
        "player_cost": round(player_cost, 2),
        "power_change": power_change,
        "message": message,
    }
