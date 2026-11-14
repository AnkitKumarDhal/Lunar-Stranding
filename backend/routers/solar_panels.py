from typing import Dict, List, Tuple, Optional
from .compat import APIRouter, HTTPException, BaseModel

router = APIRouter(prefix="/api/minigames", tags=["solar-panels"])


class SolarPanelsRequest(BaseModel):
    graph: Dict[str, Dict[str, float]]
    start_node: str = "A"
    player_edges: List[List[str]]
    session_id: Optional[str] = "default"


# Prim's minimum spanning tree algorithm
def prim_minimum_spanning_tree(graph: Dict[str, List[Tuple[str, float]]], start_node: Optional[str] = None):
    if not graph:
        return {}, 0.0

    if start_node is None or start_node not in graph:
        start_node = next(iter(graph))

    cost: Dict[str, float] = {node: float("inf") for node in graph}
    predecessor: Dict[str, Optional[str]] = {node: None for node in graph}

    cost[start_node] = 0.0
    q = list(graph.keys())

    while q:
        # Find unvisited node with the minimum edge weight to the tree
        u = min(q, key=lambda node: cost[node])
        q.remove(u)

        for v, weight in graph[u]:
            if v in q and weight < cost[v]:
                cost[v] = weight
                predecessor[v] = u

    # Check if any node was unreachable (disconnected graph)
    all_connected = all(c != float("inf") for c in cost.values())
    total_cost = sum(c for c in cost.values() if c != float("inf"))

    return predecessor, cost, total_cost, all_connected


# Validate player's selected edges and calculate cable cost
def validate_player_mst(graph: Dict[str, Dict[str, float]], player_edges: List[List[str]], start_node: str):
    nodes = list(graph.keys())
    n = len(nodes)

    if not player_edges:
        return False, 0.0, [], "No cable connections selected."

    # Normalize undirected edges (u, v) where u < v
    unique_edges = set()
    total_cost = 0.0
    adj: Dict[str, List[str]] = {node: [] for node in nodes}

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
    graph = req.graph
    start = req.start_node
    player_edges = req.player_edges

    if not graph:
        raise HTTPException(status_code=400, detail="Graph cannot be empty")
    if start not in graph:
        raise HTTPException(status_code=400, detail=f"Start node '{start}' not found in graph")

    # Convert graph to adjacency list format for Prim's algorithm
    adj_list: Dict[str, List[Tuple[str, float]]] = {}
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
    is_valid, player_cost, valid_edges, err = validate_player_mst(graph, player_edges, start)
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
    if round_player_cost <= round_opt_cost:
        eff_ratio = 1.0
        eff_pct = 100.0
        status = "OPTIMAL"
        msg = f"OPTIMAL MST! Connected all {len(graph)} solar panels with minimum cable cost ({round_player_cost}m)."
    else:
        eff_ratio = round_opt_cost / round_player_cost if round_player_cost > 0 else 0.0
        eff_pct = round(eff_ratio * 100.0, 2)
        excess = round(round_player_cost - round_opt_cost, 2)
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
