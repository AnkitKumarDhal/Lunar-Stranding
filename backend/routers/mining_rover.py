from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/minigames", tags=["mining-rover"])


class MiningRoverRequest(BaseModel):
    edges: list[list[object]]  # [[u, v, weight], ...]
    start_node: str = "Base"
    target_node: str = "Excavation"
    player_path: list[str]
    session_id: str | None = "default"


# Bellman-Ford algorithm to compute shortest paths with negative weights
def bellman_ford_shortest_path(edges: list[tuple[str, str, float]], start_node: str | None = None):
    # Extract unique sorted nodes from the edge list
    nodes = sorted(list(set(u for u, _, _ in edges) | set(v for _, v, _ in edges)))
    if not nodes:
        return {}, {}, False

    if start_node is None or start_node not in nodes:
        start_node = nodes[0]

    dist: dict[str, float] = {node: float("inf") for node in nodes}
    predecessor: dict[str, str | None] = {node: None for node in nodes}

    dist[start_node] = 0.0

    # Relax edges V - 1 times
    for _ in range(len(nodes) - 1):
        for u, v, w in edges:
            if dist[u] != float("inf") and dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                predecessor[v] = u

    # Check for negative-weight cycles
    has_negative_cycle = False
    for u, v, w in edges:
        if dist[u] != float("inf") and dist[u] + w < dist[v]:
            has_negative_cycle = True
            break

    return dist, predecessor, has_negative_cycle


# Validate player's path and calculate total energy cost
def validate_player_route(edges: list[tuple[str, str, float]], path: list[str], start_node: str, target_node: str):
    if not path:
        return False, 0.0, "Path cannot be empty."
    if path[0] != start_node:
        return False, 0.0, f"Path must start at {start_node}."
    if path[-1] != target_node:
        return False, 0.0, f"Path must end at {target_node}."

    # Map directed edge (u, v) -> weight
    edge_map: dict[tuple[str, str], float] = {}
    for u, v, w in edges:
        # If multiple directed edges between u and v exist, keep the lowest weight
        if (u, v) not in edge_map or w < edge_map[(u, v)]:
            edge_map[(u, v)] = w

    total_cost = 0.0
    for i in range(len(path) - 1):
        u, v = path[i], path[i + 1]
        if (u, v) not in edge_map:
            return False, 0.0, f"No directed path segment from {u} to {v}."
        total_cost += edge_map[(u, v)]

    return True, total_cost, ""


@router.post("/mining-rover")
def mining_rover_navigation(req: MiningRoverRequest):
    raw_edges = req.edges
    start = req.start_node
    target = req.target_node
    path = req.player_path

    if not raw_edges:
        raise HTTPException(status_code=400, detail="Edges list cannot be empty")

    # Parse and validate edge triples
    parsed_edges: list[tuple[str, str, float]] = []
    for edge in raw_edges:
        if len(edge) != 3:
            raise HTTPException(status_code=400, detail=f"Invalid edge format: {edge}. Expected [u, v, weight]")
        u, v, w = str(edge[0]), str(edge[1]), float(edge[2])
        parsed_edges.append((u, v, w))

    all_nodes = set(u for u, _, _ in parsed_edges) | set(v for _, v, _ in parsed_edges)
    if start not in all_nodes:
        raise HTTPException(status_code=400, detail=f"Start node '{start}' not found in edge network")
    if target not in all_nodes:
        raise HTTPException(status_code=400, detail=f"Target node '{target}' not found in edge network")

    # Run Bellman-Ford
    distances, predecessor, has_neg_cycle = bellman_ford_shortest_path(parsed_edges, start)

    opt_cost = distances.get(target, float("inf"))

    # Reconstruct optimal path from predecessors if reachable and no negative cycle
    opt_path: list[str] = []
    if opt_cost != float("inf") and not has_neg_cycle:
        curr = target
        visited = set()
        while curr is not None:
            if curr in visited:
                break
            visited.add(curr)
            opt_path.append(curr)
            if curr == start:
                break
            curr = predecessor.get(curr)
        if opt_path and opt_path[-1] == start:
            opt_path.reverse()
        else:
            opt_path = []

    # Python None is used for non-finite costs/distances because standard JSON does not support Infinity or -Infinity; serializes to JSON null
    clean_distances = {
        k: (round(v, 2) if v != float("inf") and v != float("-inf") else None)
        for k, v in distances.items()
    }
    opt_cost_serializable = (
        round(opt_cost, 2)
        if (opt_cost != float("inf") and opt_cost != float("-inf") and not has_neg_cycle)
        else None
    )
    optimal_info = {
        "path": opt_path,
        "cost": opt_cost_serializable,
        "distances": clean_distances,
        "has_negative_cycle": has_neg_cycle
    }

    # Handle negative-weight cycle
    if has_neg_cycle:
        return {
            "is_valid_path": False,
            "status": "NEGATIVE_CYCLE_DETECTED",
            "has_negative_cycle": True,
            "optimal": optimal_info,
            "optimal_path": [],
            "optimal_cost": None,  # Standard JSON null for negative cycle infinite loop
            "player_path": path,
            "player_cost": 0.0,
            "efficiency": 0.0,
            "efficiency_percentage": 0.0,
            "message": "Gravitational anomaly detected: Reachable negative-weight cycle creates an infinite energy loop."
        }

    # Handle unreachable destination
    if opt_cost == float("inf"):
        return {
            "is_valid_path": False,
            "status": "UNREACHABLE",
            "has_negative_cycle": False,
            "optimal": optimal_info,
            "optimal_path": [],
            "optimal_cost": None,  # Standard JSON null for unreachable destination
            "player_path": path,
            "player_cost": 0.0,
            "efficiency": 0.0,
            "efficiency_percentage": 0.0,
            "message": f"Excavation site '{target}' is unreachable from '{start}'."
        }

    # Validate player path
    is_valid, player_cost, err = validate_player_route(parsed_edges, path, start, target)
    if not is_valid:
        return {
            "is_valid_path": False,
            "status": "INVALID_ROUTE",
            "has_negative_cycle": False,
            "optimal": optimal_info,
            "optimal_path": opt_path,
            "optimal_cost": round(opt_cost, 2),
            "player_path": path,
            "player_cost": 0.0,
            "efficiency": 0.0,
            "efficiency_percentage": 0.0,
            "message": err
        }

    # Evaluate player's path
    round_player_cost = round(player_cost, 2)
    round_opt_cost = round(opt_cost, 2)

    if round_player_cost <= round_opt_cost:
        status = "OPTIMAL"
        eff_ratio = 1.0
        eff_pct = 100.0
        msg = f"OPTIMAL ROUTE! Reached {target} consuming minimum net energy ({round_player_cost} kWh)."
    else:
        status = "SUBOPTIMAL"
        excess = round(round_player_cost - round_opt_cost, 2)
        # Avoid division by zero if costs are 0 or negative
        if round_opt_cost > 0 and round_player_cost > 0:
            eff_ratio = min(1.0, round_opt_cost / round_player_cost)
        else:
            eff_ratio = 0.8
        eff_pct = round(eff_ratio * 100.0, 2)
        msg = f"Valid route to {target}, but consumed {excess} kWh extra energy ({round_player_cost} kWh vs optimal {round_opt_cost} kWh)."

    return {
        "is_valid_path": True,
        "status": status,
        "has_negative_cycle": False,
        "optimal": optimal_info,
        "optimal_path": opt_path,
        "optimal_cost": round_opt_cost,
        "player_path": path,
        "player_cost": round_player_cost,
        "efficiency": eff_ratio,
        "efficiency_percentage": eff_pct,
        "message": msg
    }
