from collections import deque

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/minigames", tags=["crater-traverse"])


class CraterTraverseRequest(BaseModel):
    graph: dict[str, list[str]]
    start_node: str = "Crater_Alpha"
    player_path: list[str]
    target_node: str | None = None  # optional, default is to visit all nodes
    session_id: str | None = "default"


# Standard BFS for the shortest path between two nodes.
def bfs_shortest_path(graph, start, target):
    if start == target:
        return 0, [start]
    queue = deque([(start, [start])])
    visited = {start}
    while queue:
        curr, path = queue.popleft()
        if curr == target:
            return len(path) - 1, path
        for nbr in graph.get(curr, []):
            if nbr not in visited:
                visited.add(nbr)
                queue.append((nbr, path + [nbr]))
    return None, []


# standard bfs to check reachable nodes
def bfs_reachable(graph, start):
    queue = deque([start])
    visited = {start}
    order = []

    while queue:
        curr = queue.popleft()
        order.append(curr)

        for nbr in graph.get(curr, []):
            if nbr not in visited:
                visited.add(nbr)
                queue.append(nbr)

    return order


# bfs in state space (current_node, visited_bitmask)
# finds the exact minimum number of steps to visit all nodes from start
def bfs_min_steps_to_all(graph, start):
    nodes = sorted(list(graph.keys()))
    n = len(nodes)
    if n <= 1:
        return 0, [start]

    node_to_idx = {name: i for i, name in enumerate(nodes)}
    target_mask = (1 << n) - 1

    start_idx = node_to_idx[start]
    start_mask = 1 << start_idx

    # queue holds: (current_node, visited_mask, path_so_far)
    queue = deque([(start, start_mask, [start])])
    visited_states = {(start, start_mask)}

    while queue:
        curr, mask, path = queue.popleft()

        # all nodes have been visited
        if mask == target_mask:
            return len(path) - 1, path

        for nbr in graph.get(curr, []):
            nbr_idx = node_to_idx[nbr]
            next_mask = mask | (1 << nbr_idx)
            state = (nbr, next_mask)

            if state not in visited_states:
                visited_states.add(state)
                queue.append((nbr, next_mask, path + [nbr]))

    # not all nodes reachable
    return None, []


# validate that each step connects to an adjacent node
def validate_player_path(graph, path, start):
    if not path:
        return False, "Path cannot be empty"
    if path[0] != start:
        return False, f"Path must start at {start}"

    for i in range(len(path) - 1):
        u, v = path[i], path[i + 1]
        if u not in graph:
            return False, f"Crater {u} not found on map"
        if v not in graph.get(u, []):
            return False, f"No direct route between {u} and {v}"

    return True, ""


@router.post("/crater-traverse")
def crater_traversal(req: CraterTraverseRequest):
    graph = req.graph
    start = req.start_node
    path = req.player_path

    if start not in graph:
        raise HTTPException(status_code=400, detail=f"Start crater '{start}' not found in map")

    # get all reachable nodes
    bfs_order = bfs_reachable(graph, start)
    total_nodes = len(graph)
    reachable_count = len(bfs_order)

    # find optimal minimum steps using state-space bfs
    opt_steps, opt_path = bfs_min_steps_to_all(graph, start)

    optimal_info = {
        "path": opt_path,
        "steps": opt_steps,
        "bfs_discovery_order": bfs_order
    }

    # if graph has disconnected craters
    if opt_steps is None or reachable_count < total_nodes:
        unreachable = [c for c in graph if c not in bfs_order]
        return {
            "is_valid_path": False,
            "status": "DISCONNECTED",
            "optimal": optimal_info,
            "optimal_path": opt_path or [],
            "optimal_steps": opt_steps,
            "minimum_steps_required": opt_steps,
            "player_path": path,
            "player_steps": len(path) - 1 if path else 0,
            "player_steps_taken": len(path) - 1 if path else 0,
            "all_craters_covered": False,
            "total_craters": total_nodes,
            "craters_visited_count": 0,
            "unvisited_craters": unreachable,
            "efficiency_percentage": 0.0,
            "step_efficiency_percentage": 0.0,
            "message": f"Graph has disconnected craters that cannot be reached: {', '.join(unreachable)}"
        }

    # validate player path continuity
    is_valid, err = validate_player_path(graph, path, start)
    if not is_valid:
        return {
            "is_valid_path": False,
            "status": "INVALID_PATH",
            "optimal": optimal_info,
            "optimal_path": opt_path,
            "optimal_steps": opt_steps,
            "minimum_steps_required": opt_steps,
            "player_path": path,
            "player_steps": len(path) - 1 if path else 0,
            "player_steps_taken": len(path) - 1 if path else 0,
            "all_craters_covered": False,
            "total_craters": total_nodes,
            "craters_visited_count": len(set(path)) if path else 0,
            "unvisited_craters": [c for c in graph if c not in set(path)],
            "efficiency_percentage": 0.0,
            "step_efficiency_percentage": 0.0,
            "message": err
        }

    # check which craters player visited
    visited_by_player = set(path)
    visited_count = len(visited_by_player)
    unvisited = [c for c in graph if c not in visited_by_player]
    all_covered = (len(unvisited) == 0)

    # calculate player steps and efficiency
    player_steps = len(path) - 1

    if not all_covered:
        status = "INCOMPLETE"
        eff_pct = round((visited_count / total_nodes) * 50.0, 2)
        msg = f"Incomplete exploration! You visited {visited_count}/{total_nodes} craters. Missed: {', '.join(unvisited)}."
    else:
        # efficiency = optimal_steps / player_steps
        if player_steps <= opt_steps:
            eff_pct = 100.0
            status = "OPTIMAL_TRAVERSAL"
            msg = f"PERFECT TRAVERSAL! All {total_nodes} craters visited in the minimum possible {player_steps} steps."
        else:
            eff_ratio = min(1.0, opt_steps / player_steps)
            eff_pct = round(eff_ratio * 100.0, 2)
            status = "SUBOPTIMAL_TRAVERSAL"
            extra = player_steps - opt_steps
            msg = f"All {total_nodes} craters visited, but took {player_steps} steps ({extra} extra steps vs optimal {opt_steps}). {eff_pct}% efficiency."

    return {
        "is_valid_path": True,
        "status": status,
        "optimal": optimal_info,
        "optimal_path": opt_path,
        "optimal_steps": opt_steps,
        "minimum_steps_required": opt_steps,
        "player_path": path,
        "player_steps": player_steps,
        "player_steps_taken": player_steps,
        "all_craters_covered": all_covered,
        "total_craters": total_nodes,
        "craters_visited_count": visited_count,
        "unvisited_craters": unvisited,
        "efficiency_percentage": eff_pct,
        "step_efficiency_percentage": eff_pct,
        "message": msg
    }
