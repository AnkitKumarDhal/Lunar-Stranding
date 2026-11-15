import random
from itertools import combinations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/minigames", tags=["solar-panels"])
NODES = list("ABCDEFGHIJ")


class SolarPanelsRequest(BaseModel):
    graph: dict[str, dict[str, float]] | None = None
    start_node: str = "A"
    player_edges: list[list[str]] = Field(default_factory=list)


# Prim's minimum spanning tree algorithm
def prim_minimum_spanning_tree(graph: dict[str, list[tuple[str, float]]], start_node: str | None = None):
    if not graph:
        return {}, {}, 0.0, False

    if start_node is None or start_node not in graph:
        start_node = next(iter(graph))

    cost: dict[str, float] = {node: float("inf") for node in graph}
    predecessor: dict[str, str | None] = {node: None for node in graph}

    cost[start_node] = 0.0
    q = list(graph.keys())

    while q:
        # Find unvisited node with the minimum edge weight to the tree
        u = min(q, key=lambda node: cost[node])
        q.remove(u)
        if cost[u] == float("inf"):
            break

        for v, weight in graph[u]:
            if v in q and weight < cost[v]:
                cost[v] = weight
                predecessor[v] = u

    # Check if any node was unreachable (disconnected graph)
    all_connected = all(c != float("inf") for c in cost.values())
    total_cost = sum(c for c in cost.values() if c != float("inf"))

    return predecessor, cost, total_cost, all_connected


def generate_solar_game():
    # Start with a random spanning tree so the graph is always connected.
    edges = {}
    for i in range(1, len(NODES)):
        u = NODES[i]
        v = random.choice(NODES[:i])
        edges[tuple(sorted((u, v)))] = random.randint(1, 15)

    # Add random links until the graph has 15-20 edges.
    remaining = [edge for edge in combinations(NODES, 2) if edge not in edges]
    target = random.randint(15, 20)
    for edge in random.sample(remaining, target - len(edges)):
        edges[edge] = random.randint(1, 15)

    # Store each undirected connection in both directions for the API.
    graph = {node: {} for node in NODES}
    for (u, v), weight in edges.items():
        graph[u][v] = weight
        graph[v][u] = weight

    return {"graph": graph, "start_node": "A"}


# Validate player's selected edges and calculate cable cost
def validate_player_mst(graph: dict[str, dict[str, float]], player_edges: list[list[str]], start_node: str):
    nodes = list(graph.keys())
    n = len(nodes)

    if not player_edges:
        return False, 0.0, [], "No cable connections selected."

    # Normalize undirected edges (u, v) where u < v
    unique_edges = set()
    total_cost = 0.0
    adj: dict[str, list[str]] = {node: [] for node in nodes}

    for edge in player_edges:
        if len(edge) != 2:
            return False, 0.0, [], f"Invalid edge format: {edge}. Must connect exactly 2 nodes."
        u, v = edge[0], edge[1]

        if u not in graph:
            return False, 0.0, [], f"Panel node '{u}' not found on grid."
        if v not in graph:
            return False, 0.0, [], f"Panel node '{v}' not found on grid."
        if u == v:
            return False, 0.0, [], f"Self-loop detected on panel '{u}'."

        # Check edge existence and weight
        weight = graph[u].get(v)
        if weight is None:
            weight = graph[v].get(u)
        if weight is None:
            return False, 0.0, [], f"No direct cable route between '{u}' and '{v}'."

        norm_edge = tuple(sorted([u, v]))
        if norm_edge in unique_edges:
            return False, 0.0, [], f"Duplicate cable connection between '{u}' and '{v}'."

        unique_edges.add(norm_edge)
        total_cost += weight
        adj[u].append(v)
        adj[v].append(u)

    # A spanning tree on N vertices must have exactly N - 1 edges
    if len(unique_edges) != n - 1:
        if len(unique_edges) < n - 1:
            return False, total_cost, list(unique_edges), (
                f"Incomplete grid! Selected {len(unique_edges)} cables, but {n - 1} cables "
                f"are required to span all {n} panels."
            )
        else:
            return False, total_cost, list(unique_edges), (
                f"Excessive cables! Selected {len(unique_edges)} cables for {n} panels. "
                f"This creates redundant loops (max {n - 1} allowed)."
            )

    # Check connectivity using BFS from start_node
    visited = set()
    queue = [start_node]
    visited.add(start_node)

    while queue:
        curr = queue.pop(0)
        for nbr in adj.get(curr, []):
            if nbr not in visited:
                visited.add(nbr)
                queue.append(nbr)

    if len(visited) < n:
        isolated = [node for node in nodes if node not in visited]
        return False, total_cost, list(unique_edges), (
            f"Disconnected grid! The following panels are isolated: {', '.join(isolated)}."
        )

    return True, total_cost, [list(e) for e in unique_edges], ""


@router.post("/solar-panels")
def solar_panels_mst(req: SolarPanelsRequest):
    # An empty request starts a new randomized game on the same endpoint.
    if req.graph is None:
        return generate_solar_game()

    graph = req.graph
    start = req.start_node
    player_edges = req.player_edges

    if not graph:
        raise HTTPException(status_code=400, detail="Graph cannot be empty")
    if start not in graph:
        raise HTTPException(status_code=400, detail=f"Start node '{start}' not found in graph")

    # Convert graph to adjacency list format for Prim's algorithm
    adj_list: dict[str, list[tuple[str, float]]] = {}
    for u, neighbors in graph.items():
        adj_list[u] = [(v, float(w)) for v, w in neighbors.items()]

    pred_map, costs, opt_cost, all_connected = prim_minimum_spanning_tree(adj_list, start)

    # Build optimal MST edge list
    optimal_edges = []
    for node, pred in pred_map.items():
        if pred is not None:
            optimal_edges.append([pred, node, round(costs[node], 2)])

    optimal_info = {
        "mst_edges": optimal_edges,
        "total_cost": round(opt_cost, 2),
        "predecessor_map": pred_map
    }

    # Handle disconnected graph definition
    if not all_connected:
        return {
            "is_valid_mst": False,
            "status": "DISCONNECTED_GRAPH",
            "optimal": optimal_info,
            "optimal_cost": round(opt_cost, 2),
            "optimal_edges": optimal_edges,
            "player_cost": 0.0,
            "player_edges": player_edges,
            "efficiency": 0.0,
            "efficiency_percentage": 0.0,
            "message": "Graph is disconnected; unable to form a complete spanning tree for all solar panels."
        }

    # Validate player's solution
    is_valid, player_cost, _, err = validate_player_mst(graph, player_edges, start)
    round_player_cost = round(player_cost, 2)
    round_opt_cost = round(opt_cost, 2)

    if not is_valid:
        return {
            "is_valid_mst": False,
            "status": "INVALID_SPANNING_TREE",
            "optimal": optimal_info,
            "optimal_cost": round_opt_cost,
            "optimal_edges": optimal_edges,
            "player_cost": round_player_cost,
            "player_edges": player_edges,
            "efficiency": 0.0,
            "efficiency_percentage": 0.0,
            "message": err
        }

    # Calculate efficiency
    if player_cost <= opt_cost:
        eff_ratio = 1.0
        eff_pct = 100.0
        status = "OPTIMAL"
        msg = f"OPTIMAL MST! Connected all {len(graph)} solar panels with minimum cable cost ({round_player_cost}m)."
    else:
        eff_ratio = opt_cost / player_cost if player_cost > 0 else 0.0
        eff_pct = round(eff_ratio * 100.0, 2)
        excess = round(player_cost - opt_cost, 2)
        status = "SUBOPTIMAL"
        msg = f"Valid spanning tree formed, but used {excess}m excess cable ({round_player_cost}m vs optimal {round_opt_cost}m). {eff_pct}% efficiency."

    return {
        "is_valid_mst": True,
        "status": status,
        "optimal": optimal_info,
        "optimal_cost": round_opt_cost,
        "optimal_edges": optimal_edges,
        "player_cost": round_player_cost,
        "player_edges": player_edges,
        "efficiency": eff_ratio,
        "efficiency_percentage": eff_pct,
        "message": msg
    }
