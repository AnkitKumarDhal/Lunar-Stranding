import random
from collections import deque
from itertools import combinations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/minigames", tags=["crater-traverse"])

CRATER_NODES = [f"Crater_{i:02d}" for i in range(1, 11)]


class CraterTraverseRequest(BaseModel):
    graph: dict[str, list[str]] | None = None
    start_node: str = "Crater_01"
    player_path: list[str] | None = None


def generate_crater_game():
    """Create a connected, undirected crater network with 10 nodes and 16-20 edges."""
    nodes = CRATER_NODES
    ring = nodes if random.choice((True, False)) else list(reversed(nodes))
    graph = {node: [] for node in nodes}

    # An undirected ring guarantees every crater remains reachable.
    for i, node in enumerate(ring):
        graph[node].extend([ring[i - 1], ring[(i + 1) % len(ring)]])

    ring_edges = {frozenset((node, ring[(i + 1) % len(ring)])) for i, node in enumerate(ring)}
    extra_edges = [edge for edge in combinations(nodes, 2) if frozenset(edge) not in ring_edges]

    # Add 6-10 undirected shortcuts without duplicate routes.
    for u, v in random.sample(extra_edges, random.randint(6, 10)):
        graph[u].append(v)
        graph[v].append(u)

    return {"graph": graph, "start_node": nodes[0]}


def bfs_reachable(graph: dict[str, list[str]], start: str) -> list[str]:
    queue = deque([start])
    visited = {start}
    order = []

    while queue:
        current = queue.popleft()
        order.append(current)

        for neighbor in graph.get(current, []):
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)

    return order


def bfs_min_steps_to_all(
    graph: dict[str, list[str]], start: str
) -> tuple[int | None, list[str]]:
    """Find the shortest walk that visits every node at least once."""
    nodes = sorted(graph)
    if len(nodes) <= 1:
        return 0, [start]

    node_index = {node: i for i, node in enumerate(nodes)}
    target_mask = (1 << len(nodes)) - 1
    start_mask = 1 << node_index[start]
    queue = deque([(start, start_mask, [start])])
    visited_states = {(start, start_mask)}

    while queue:
        current, mask, path = queue.popleft()
        if mask == target_mask:
            return len(path) - 1, path

        for neighbor in graph.get(current, []):
            next_mask = mask | (1 << node_index[neighbor])
            state = (neighbor, next_mask)

            if state not in visited_states:
                visited_states.add(state)
                queue.append((neighbor, next_mask, path + [neighbor]))

    return None, []


def validate_player_path(graph: dict[str, list[str]], path: list[str], start: str) -> tuple[bool, str]:
    if not path:
        return False, "Path cannot be empty"
    if path[0] != start:
        return False, f"Path must start at {start}"

    for i in range(len(path) - 1):
        current, next_node = path[i], path[i + 1]
        if current not in graph:
            return False, f"Crater {current} not found on map"
        if next_node not in graph.get(current, []):
            return False, f"No direct route from {current} to {next_node}"

    return True, ""


def calculate_power_cost(player_steps: int, optimal_steps: int | None, unvisited_count: int) -> float:
    """Charge a base deployment cost, then extra power for detours or missed craters."""
    if optimal_steps is None:
        return round(1.0 + player_steps * 0.5 + unvisited_count, 2)

    extra_steps = max(0, player_steps - optimal_steps)
    return round(1.0 + optimal_steps * 0.25 + extra_steps * 0.5 + unvisited_count, 2)


@router.post("/crater-traverse")
def crater_traversal(req: CraterTraverseRequest):
    # An empty request creates a new map; submissions use the same endpoint.
    if req.graph is None and req.player_path is None:
        return generate_crater_game()
    if req.graph is None or req.player_path is None:
        raise HTTPException(status_code=400, detail="Graph and player_path are required for submission")

    graph = req.graph
    start = req.start_node
    path = req.player_path

    if start not in graph:
        raise HTTPException(status_code=400, detail=f"Start crater '{start}' not found in map")

    bfs_order = bfs_reachable(graph, start)
    opt_steps, opt_path = bfs_min_steps_to_all(graph, start)
    visited_by_player = set(path).intersection(graph)
    unvisited = [node for node in graph if node not in visited_by_player]
    player_steps = max(0, len(path) - 1)

    result = {
        "optimal": {
            "path": opt_path,
            "steps": opt_steps,
            "bfs_discovery_order": bfs_order,
        },
        "player_steps": player_steps,
        "total_craters": len(graph),
        "craters_visited_count": len(visited_by_player),
        "unvisited_craters": unvisited,
    }

    if opt_steps is None or len(bfs_order) < len(graph):
        result.update({
            "status": "DISCONNECTED",
            "power_consumed": calculate_power_cost(player_steps, opt_steps, len(unvisited)),
            "message": f"Some craters cannot be reached from {start}: {', '.join(node for node in graph if node not in bfs_order)}",
        })
        return result

    is_valid, error = validate_player_path(graph, path, start)
    if not is_valid:
        result.update({"status": "INVALID_PATH", "power_consumed": 0.0, "message": error})
        return result

    if unvisited:
        status = "INCOMPLETE"
        message = f"Incomplete exploration! You visited {len(visited_by_player)}/{len(graph)} craters. Missed: {', '.join(unvisited)}."
    elif player_steps == opt_steps:
        status = "OPTIMAL_TRAVERSAL"
        message = f"Perfect traversal! All {len(graph)} craters visited in the minimum {opt_steps} steps."
    else:
        status = "SUBOPTIMAL_TRAVERSAL"
        extra = player_steps - opt_steps
        message = f"All craters visited, but you used {extra} extra steps ({player_steps} vs optimal {opt_steps})."

    result.update({
        "status": status,
        "power_consumed": calculate_power_cost(player_steps, opt_steps, len(unvisited)),
        "message": message,
    })
    return result
