from typing import Dict, List, Tuple, Optional
import random
from itertools import combinations


nodes = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"]

def generate_edges():
    first = set()                       #so that every node has at least one edge
    for n in nodes:
        other = random.choice([m for m in nodes if m != n])
        first.add(tuple(sorted((n, other))))

    all_pairs = list(combinations(nodes, 2))

    count = random.randint(15, 20)
    rest = [p for p in all_pairs if p not in first]
    extra = random.sample(rest, count - len(first))
    chosen = list(first) + extra

    edges = [(a, b, random.randint(1, 15)) for a, b in chosen]
    return edges

def prim_minimum_spanning_tree(graph: Dict[str, List[Tuple[str, int]]], start_node: Optional[str] = None):
    if not graph:
        return {}, 0, False

    if start_node is None or start_node not in graph:
        start_node = next(iter(graph))

    cost: Dict[str, float] = {node: float('inf') for node in graph}
    predecessor: Dict[str, Optional[str]] = {node: None for node in graph}

    cost[start_node] = 0.0
    q = list(graph.keys())

    reached = []
    while q:
        # Find unvisited node with the minimum edge weight to the tree
        u = min(q, key=lambda node: cost[node])
        q.remove(u)
        if cost[u] != float('inf'):         #check for bad graph with disconnected nodes
            reached.append(u)

        for v, weight in graph[u]:
            if v in q and weight < cost[v]:
                cost[v] = weight
                predecessor[v] = u

    # Calculate total minimum cost, ignoring infinity/disconnected nodes if any
    total_cost = sum(c for c in cost.values() if c != float('inf'))

    return predecessor, total_cost, len(reached) == len(nodes)

def generate_valid_graph():
    while True:
        edges = generate_edges()
        graph = {}
        for a, b, weight in edges:
            graph.setdefault(a, []).append((b, weight))
            graph.setdefault(b, []).append((a, weight))
        pred_map, mst_cost, connected = prim_minimum_spanning_tree(graph)
        if connected:
            return edges, graph, pred_map, mst_cost

def to_api_graph(edges):                #convert edge list to adjacency dict for API
    api_graph = {}
    for a, b, weight in edges:
        api_graph.setdefault(a, {})[b] = weight
        api_graph.setdefault(b, {})[a] = weight
    return api_graph

def new_game():
    edges, graph, pred_map, mst_cost = generate_valid_graph()
    return {
        "graph": to_api_graph(edges),
        "start_node": "A",
    }
# Example Use
if __name__ == "__main__":
    edges, sample_graph, pred_map, mst_cost = generate_valid_graph()
    print(f"Predecessor Map: {pred_map}")
    print(f"Total MST Cost:  {mst_cost}")
    print(to_api_graph(edges))
    print(new_game())