from typing import Dict, List, Tuple, Optional


def prim_minimum_spanning_tree(graph: Dict[str, List[Tuple[str, int]]], start_node: Optional[str] = None):
    if not graph:
        return {}, 0

    if start_node is None or start_node not in graph:
        start_node = next(iter(graph))

    cost: Dict[str, float] = {node: float('inf') for node in graph}
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

    # Calculate total minimum cost, ignoring infinity/disconnected nodes if any
    total_cost = sum(c for c in cost.values() if c != float('inf'))

    return predecessor, total_cost


# Example Use
if __name__ == "__main__":
    edges = [
        ("A", "B", 7), ("A", "C", 12), ("A", "D", 4),
        ("B", "C", 9), ("B", "E", 2),
        ("C", "F", 14),
        ("D", "E", 11), ("D", "G", 6),
        ("E", "F", 5), ("E", "H", 13),
        ("F", "H", 9), ("F", "I", 8),
        ("G", "H", 3), ("G", "J", 15),
        ("H", "I", 10), ("H", "J", 1),
        ("I", "J", 12),
    ]

    # Build adjacency list graph
    sample_graph = {}
    for a, b, weight in edges:
        sample_graph.setdefault(a, []).append((b, weight))
        sample_graph.setdefault(b, []).append((a, weight))

    pred_map, mst_cost = prim_minimum_spanning_tree(sample_graph)

    print(f"Predecessor Map: {pred_map}")
    print(f"Total MST Cost:  {mst_cost}")