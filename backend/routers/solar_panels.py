import random
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/minigames", tags=["solar-panels"])
NODES = list("ABCDEF")


class SolarPanelsRequest(BaseModel):
    graph: dict[str, dict[str, float]] | None = None
    start_node: str = "A"
    player_edges: list[list[str]] = Field(default_factory=list)


def prim_minimum_spanning_tree(
    graph: dict[str, list[tuple[str, float]]], start_node: str
) -> tuple[dict[str, str | None], float, bool]:
    """Return the MST parents, total cost and connectivity using Prim's algorithm."""
    costs = {node: float("inf") for node in graph}
    parents: dict[str, str | None] = {node: None for node in graph}
    costs[start_node] = 0.0
    unvisited = list(graph)

    while unvisited:
        node = min(unvisited, key=costs.get)
        unvisited.remove(node)
        if costs[node] == float("inf"):
            break

        for neighbor, weight in graph[node]:
            if neighbor in unvisited and weight < costs[neighbor]:
                costs[neighbor] = weight
                parents[neighbor] = node

    connected = all(cost != float("inf") for cost in costs.values())
    total_cost = sum(cost for cost in costs.values() if cost != float("inf"))
    return parents, total_cost, connected


def generate_solar_game():
    # Create a 2x3 grid with one extra diagonal for another route option.
    edges = [
        ("A", "B"), ("B", "C"), ("D", "E"), ("E", "F"),
        ("A", "D"), ("B", "E"), ("C", "F"),
        random.choice([("A", "E"), ("B", "D"), ("B", "F"), ("C", "E")]),
    ]
    graph = {node: {} for node in NODES}
    for u, v in edges:
        graph[u][v] = graph[v][u] = random.randint(1, 15)
    return {"graph": graph, "start_node": "A"}


def validate_player_mst(
    graph: dict[str, dict[str, float]], player_edges: list[list[str]], start_node: str
) -> tuple[bool, float, str]:
    """Check that the selected cables form a spanning tree and return their cost."""
    if not player_edges:
        return False, 0.0, "No cable connections selected."

    nodes = list(graph)
    selected = set()
    adjacency = {node: [] for node in nodes}
    total_cost = 0.0

    for edge in player_edges:
        if len(edge) != 2:
            return False, 0.0, "Each cable must connect exactly two panels."

        u, v = edge
        if u not in graph or v not in graph:
            return False, 0.0, "A selected panel does not exist on this grid."
        if u == v:
            return False, 0.0, f"A cable cannot connect panel '{u}' to itself."

        weight = graph[u].get(v, graph[v].get(u))
        if weight is None:
            return False, 0.0, f"No direct cable route between '{u}' and '{v}'."

        key = tuple(sorted((u, v)))
        if key in selected:
            return False, 0.0, f"Cable '{u}-{v}' was selected more than once."

        selected.add(key)
        total_cost += weight
        adjacency[u].append(v)
        adjacency[v].append(u)

    if len(selected) != len(nodes) - 1:
        return False, total_cost, f"Select exactly {len(nodes) - 1} cables to connect all panels."

    visited = {start_node}
    pending = [start_node]
    while pending:
        for neighbor in adjacency[pending.pop()]:
            if neighbor not in visited:
                visited.add(neighbor)
                pending.append(neighbor)

    if len(visited) != len(nodes):
        return False, total_cost, "The selected cables do not connect every solar panel."

    return True, total_cost, ""


@router.post("/solar-panels")
def solar_panels_mst(req: SolarPanelsRequest):
    # An empty request generates a new randomized grid.
    if req.graph is None:
        return generate_solar_game()

    graph = req.graph
    if not graph:
        raise HTTPException(status_code=400, detail="Graph cannot be empty")
    if req.start_node not in graph:
        raise HTTPException(status_code=400, detail=f"Start node '{req.start_node}' not found in graph")

    adjacency = {
        node: [(neighbor, weight) for neighbor, weight in neighbors.items()]
        for node, neighbors in graph.items()
    }
    parents, optimal_cost, connected = prim_minimum_spanning_tree(adjacency, req.start_node)
    optimal_edges = [[parent, node] for node, parent in parents.items() if parent is not None]

    if not connected:
        return {
            "status": "DISCONNECTED_GRAPH",
            "optimal_cost": round(optimal_cost, 2),
            "optimal_edges": optimal_edges,
            "player_cost": 0.0,
            "power_consumed": 0.0,
            "message": "The grid is disconnected, so a complete spanning tree cannot be formed.",
        }

    valid, player_cost, error = validate_player_mst(graph, req.player_edges, req.start_node)
    if not valid:
        return {
            "status": "INVALID_SPANNING_TREE",
            "optimal_cost": round(optimal_cost, 2),
            "optimal_edges": optimal_edges,
            "player_cost": round(player_cost, 2),
            "power_consumed": 0.0,
            "message": error,
        }

    excess = max(0.0, player_cost - optimal_cost)
    power_consumed = round(2.0 + excess * 0.25, 2)
    optimal = excess < 1e-9
    return {
        "status": "OPTIMAL" if optimal else "SUBOPTIMAL",
        "optimal_cost": round(optimal_cost, 2),
        "optimal_edges": optimal_edges,
        "player_cost": round(player_cost, 2),
        "power_consumed": power_consumed,
        "message": (
            f"Optimal grid connected! Power used: {power_consumed:.2f}."
            if optimal else f"Grid connected with {excess:.2f}m extra cable. Power used: {power_consumed:.2f}."
        ),
    }
