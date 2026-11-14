from typing import Dict, List, Tuple, Optional


def bellman_ford_shortest_path(edges: List[Tuple[str, str, int]], start_node: Optional[str] = None):
    # Extract unique sorted nodes from the edge list
    nodes = sorted(list(set(u for u, _, _ in edges) | set(v for _, v, _ in edges)))
    if not nodes:
        return {}, {}, False

    if start_node is None or start_node not in nodes:
        start_node = nodes[0]

    dist: Dict[str, float] = {node: float("inf") for node in nodes}
    predecessor: Dict[str, Optional[str]] = {node: None for node in nodes}

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


# Example Use
if __name__ == "__main__":
    sample_edges = [
        ("A", "B", 6), ("A", "C", 7),
        ("B", "C", 8), ("B", "D", 5), ("B", "E", -4),
        ("C", "D", -3), ("C", "E", 9),
        ("D", "B", -2),
        ("E", "A", 2), ("E", "D", 7),
    ]

    distances, pred_map, neg_cycle = bellman_ford_shortest_path(sample_edges, "A")

    print(f"Shortest Distances: {distances}")
    print(f"Predecessor Map:    {pred_map}")
    print(f"Negative Cycle:     {neg_cycle}")