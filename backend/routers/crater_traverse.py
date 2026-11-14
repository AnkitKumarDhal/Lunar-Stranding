from collections import deque
from typing import Dict, List, Optional
from .compat import APIRouter, HTTPException, BaseModel

router = APIRouter(prefix="/api/minigames", tags=["crater-traverse"])


class CraterTraverseRequest(BaseModel):
    graph: Dict[str, List[str]]
    start_node: str = "Crater_Alpha"
    target_node: str = "Crater_Zeta"
    player_path: List[str]
    session_id: Optional[str] = "default"


# bfs shortest path on unweighted graph
def bfs_shortest_path(graph, start, target):
    if start not in graph or target not in graph:
        return None, []
    if start == target:
        return 0, [start]

    queue = deque([start])
    visited = {start}
    parent = {start: None}

    while queue:
        curr = queue.popleft()
        if curr == target:
            break

        for nbr in graph.get(curr, []):
            if nbr not in visited:
                visited.add(nbr)
                parent[nbr] = curr
                queue.append(nbr)

    # target not reached
    if target not in parent or (parent[target] is None and start != target):
        return None, []

    # rebuild path
    path = []
    curr = target
    while curr is not None:
        path.append(curr)
        curr = parent[curr]
    path.reverse()
    hops = len(path) - 1
    return hops, path


# validate contiguous player path
def validate_player_path(graph, path, start, target):
    if not path:
        return False, "Path cannot be empty"
    if path[0] != start:
        return False, f"Path must start at {start}"
    if path[-1] != target:
        return False, f"Path must end at {target}"

    for i in range(len(path) - 1):
        u, v = path[i], path[i + 1]
        if u not in graph:
            return False, f"Node {u} not in graph"
        if v not in graph.get(u, []):
            return False, f"No edge between {u} and {v}"

    return True, ""


@router.post("/crater-traverse")
def crater_traversal(req: CraterTraverseRequest):
    graph = req.graph
    start = req.start_node
    target = req.target_node
    path = req.player_path

    # check node existence
    if start not in graph:
        raise HTTPException(status_code=400, detail=f"Start node {start} not found in graph")
    if target not in graph:
        raise HTTPException(status_code=400, detail=f"Target node {target} not found in graph")

    # calculate optimal relay route via bfs
    opt_hops, opt_path = bfs_shortest_path(graph, start, target)

    # optimal payload structure
    optimal_info = {
        "path": opt_path,
        "hops": opt_hops
    }

    # target disconnected
    if opt_hops is None:
        return {
            "is_valid_path": False,
            "status": "DISCONNECTED",
            "optimal": optimal_info,
            "optimal_path": [],
            "optimal_hops": None,
            "player_path": path,
            "player_hops": len(path) - 1 if path else 0,
            "player_steps_taken": len(path) - 1 if path else 0,
            "minimum_steps_required": None,
            "efficiency": 0.0,
            "efficiency_percentage": 0.0,
            "step_efficiency_percentage": 0.0,
            "all_craters_covered": False,
            "message": f"Target {target} is unreachable from {start}"
        }

    # validate player path
    is_valid, err = validate_player_path(graph, path, start, target)
    if not is_valid:
        return {
            "is_valid_path": False,
            "status": "INVALID_PATH",
            "optimal": optimal_info,
            "optimal_path": opt_path,
            "optimal_hops": opt_hops,
            "player_path": path,
            "player_hops": len(path) - 1 if path else 0,
            "player_steps_taken": len(path) - 1 if path else 0,
            "minimum_steps_required": opt_hops,
            "efficiency": 0.0,
            "efficiency_percentage": 0.0,
            "step_efficiency_percentage": 0.0,
            "all_craters_covered": False,
            "message": err
        }

    # calculate player hops and efficiency
    player_hops = len(path) - 1
    if player_hops == 0 and opt_hops == 0:
        eff_ratio = 1.0
    elif player_hops == 0:
        eff_ratio = 0.0
    else:
        eff_ratio = min(1.0, opt_hops / player_hops)

    eff_pct = round(eff_ratio * 100.0, 2)

    # determine relay status
    if eff_ratio >= 1.0:
        status = "OPTIMAL_RELAY"
        msg = f"Optimal communications relay! Shortest path with {player_hops} hops."
    elif eff_ratio >= 0.65:
        status = "GOOD_RELAY"
        msg = f"Relay established in {player_hops} hops (optimal was {opt_hops} hops). {eff_pct}% efficiency."
    else:
        status = "INEFFICIENT_RELAY"
        msg = f"High hop latency: took {player_hops} hops vs optimal {opt_hops} hops. {eff_pct}% efficiency."

    response = {
        "is_valid_path": True,
        "status": status,
        "optimal": optimal_info,
        "optimal_path": opt_path,
        "optimal_hops": opt_hops,
        "player_path": path,
        "player_hops": player_hops,
        "player_steps_taken": player_hops,
        "minimum_steps_required": opt_hops,
        "efficiency": eff_ratio,
        "efficiency_percentage": eff_pct,
        "step_efficiency_percentage": eff_pct,
        "all_craters_covered": True,
        "message": msg
    }

    return response
