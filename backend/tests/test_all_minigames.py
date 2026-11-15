import sys
import os
import json
import pytest
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.encoders import jsonable_encoder
from fastapi import HTTPException
from main import root
from routers.water_rover import water_rover_navigation, WaterRoverRequest
from routers.crater_traverse import crater_traversal, CraterTraverseRequest, generate_crater_game, bfs_reachable
from routers.solar_panels import solar_panels_mst, SolarPanelsRequest
from routers.mining_rover import mining_rover_navigation, MiningRoverRequest, generate_mining_game
from routers.sample_retrieval import sample_retrieval, SampleRetrievalRequest, SampleItem
from routers.food_production import food_production_scheduling, FoodProductionRequest, TaskModel
from routers.signal_match import signal_match_search, SignalMatchRequest, rabin_karp_search
from routers.signal_transmission import signal_transmission, SignalTransmissionRequest, decode_huffman
from routers.rover_workshop import rover_workshop_scheduling, RoverWorkshopRequest


def test_root_health():
    res = root()
    assert res["status"] == "ok"
    assert len(res["endpoints"]) == 9


# --- 1. Water Rover (Dijkstra) ---
def test_water_rover_optimal():
    graph = {
        "Base": {"NodeA": 15, "NodeB": 25},
        "NodeA": {"Base": 15, "NodeC": 10, "NodeD": 30},
        "NodeB": {"Base": 25, "NodeC": 5, "IceDeposit": 40},
        "NodeC": {"NodeA": 10, "NodeB": 5, "IceDeposit": 20},
        "NodeD": {"NodeA": 30, "IceDeposit": 10},
        "IceDeposit": {"NodeB": 40, "NodeC": 20, "NodeD": 10},
    }
    req = WaterRoverRequest(
        graph=graph,
        start_node="Base",
        target_node="IceDeposit",
        player_path=["Base", "NodeA", "NodeC", "IceDeposit"]
    )
    res = water_rover_navigation(req)
    assert res["status"] == "OPTIMAL"
    assert res["player_cost"] == 45.0
    assert res["power_consumed"] == 8.0
    assert "efficiency_percentage" not in res


def test_water_rover_suboptimal_route_consumes_more_power():
    graph = {
        "Base": {"NodeA": 15, "NodeB": 25},
        "NodeA": {"Base": 15, "NodeC": 10, "NodeD": 30},
        "NodeB": {"Base": 25, "NodeC": 5, "IceDeposit": 40},
        "NodeC": {"NodeA": 10, "NodeB": 5, "IceDeposit": 20},
        "NodeD": {"NodeA": 30, "IceDeposit": 10},
        "IceDeposit": {"NodeB": 40, "NodeC": 20, "NodeD": 10},
    }
    req = WaterRoverRequest(
        graph=graph,
        player_path=["Base", "NodeB", "IceDeposit"],
    )
    res = water_rover_navigation(req)
    assert res["status"] == "SUBOPTIMAL"
    assert res["power_consumed"] > 8.0


def test_water_rover_invalid_route():
    graph = {"Base": {"NodeA": 10}, "NodeA": {"Base": 10, "IceDeposit": 20}, "IceDeposit": {}}
    req = WaterRoverRequest(
        graph=graph,
        start_node="Base",
        target_node="IceDeposit",
        player_path=["Base", "IceDeposit"]
    )
    res = water_rover_navigation(req)
    assert res["status"] == "INVALID_ROUTE"
    assert res["power_consumed"] == 0.0


def test_water_rover_unreachable_destination_null_cost():
    # Case 1: Unreachable destination returns null optimal cost (valid standard JSON)
    graph = {
        "Base": {"NodeA": 10},
        "NodeA": {"Base": 10},
        "IceDeposit": {}
    }
    req = WaterRoverRequest(
        graph=graph,
        start_node="Base",
        target_node="IceDeposit",
        player_path=["Base", "NodeA"]
    )
    res = water_rover_navigation(req)
    assert res["status"] == "UNREACHABLE"
    assert res["optimal_cost"] is None
    assert res["power_consumed"] == 0.0

    # Strict JSON serialization test (disallows non-standard Infinity/NaN)
    serialized = json.dumps(jsonable_encoder(res), allow_nan=False)
    assert json.loads(serialized)["optimal_cost"] is None


def test_water_rover_rejects_negative_edge_weights():
    # Case 2: Reject negative edge weights with HTTP 400
    graph = {
        "Base": {"NodeA": -5},
        "NodeA": {"IceDeposit": 10},
        "IceDeposit": {}
    }
    req = WaterRoverRequest(
        graph=graph,
        start_node="Base",
        target_node="IceDeposit",
        player_path=["Base", "NodeA", "IceDeposit"]
    )
    with pytest.raises(HTTPException) as exc_info:
        water_rover_navigation(req)
    assert exc_info.value.status_code == 400
    assert "Negative edge weight" in exc_info.value.detail


# --- 2. Crater Traverse (BFS) ---
def test_crater_traverse_optimal():
    graph = {
        "Crater_Alpha": ["Rim_1", "Rim_2"],
        "Rim_1": ["Crater_Alpha", "Ridge_1", "Crater_Zeta"],
        "Rim_2": ["Crater_Alpha", "Ridge_2"],
        "Ridge_1": ["Rim_1", "Crater_Zeta"],
        "Ridge_2": ["Rim_2", "Crater_Zeta"],
        "Crater_Zeta": ["Rim_1", "Ridge_1", "Ridge_2"],
    }
    path = ["Crater_Alpha", "Rim_1", "Ridge_1", "Crater_Zeta", "Ridge_2", "Rim_2"]
    req = CraterTraverseRequest(graph=graph, start_node="Crater_Alpha", player_path=path)
    res = crater_traversal(req)

    assert res["status"] == "OPTIMAL_TRAVERSAL"
    assert res["craters_visited_count"] == 6
    assert res["power_consumed"] > 0


def test_crater_traverse_incomplete():
    graph = {"Crater_Alpha": ["Rim_1"], "Rim_1": ["Crater_Alpha", "Crater_Zeta"], "Crater_Zeta": ["Rim_1"]}
    req = CraterTraverseRequest(graph=graph, start_node="Crater_Alpha", player_path=["Crater_Alpha", "Rim_1"])
    res = crater_traversal(req)

    assert res["status"] == "INCOMPLETE"
    assert res["craters_visited_count"] == 2
    assert res["unvisited_craters"] == ["Crater_Zeta"]
    assert res["power_consumed"] > 0


def test_crater_game_generates_connected_undirected_graph():
    game = generate_crater_game()
    graph = game["graph"]
    edge_count = sum(len(neighbors) for neighbors in graph.values())

    assert len(graph) == 10
    assert 16 <= edge_count // 2 <= 20
    assert len(bfs_reachable(graph, game["start_node"])) == 10

    # Each connection is undirected; the generator adds both directions.
    for node, neighbors in graph.items():
        for neighbor in neighbors:
            assert neighbor in graph
            assert node in graph[neighbor]


def test_crater_traverse_disconnected_counts_actual_visits():
    graph = {
        "Crater_Alpha": ["Rim_1"],
        "Rim_1": ["Crater_Alpha"],
        "Crater_Zeta": [],
    }
    req = CraterTraverseRequest(graph=graph, start_node="Crater_Alpha", player_path=["Crater_Alpha", "Rim_1"])
    res = crater_traversal(req)

    assert res["status"] == "DISCONNECTED"
    assert res["craters_visited_count"] == 2
    assert res["unvisited_craters"] == ["Crater_Zeta"]


def test_crater_traverse_extra_steps_cost_more_power():
    graph = {
        "A": ["B", "C"],
        "B": ["A", "C"],
        "C": ["A", "B"],
    }
    optimal = crater_traversal(CraterTraverseRequest(graph=graph, start_node="A", player_path=["A", "B", "C"]))
    suboptimal = crater_traversal(CraterTraverseRequest(graph=graph, start_node="A", player_path=["A", "B", "A", "C"]))

    assert optimal["status"] == "OPTIMAL_TRAVERSAL"
    assert suboptimal["status"] == "SUBOPTIMAL_TRAVERSAL"
    assert suboptimal["power_consumed"] > optimal["power_consumed"]


def test_crater_traverse_empty_request_generates_game():
    game = crater_traversal(CraterTraverseRequest())
    assert len(game["graph"]) == 10
    assert game["start_node"] in game["graph"]




# --- 3. Solar Panels (Prim's MST) ---
def test_solar_panels_optimal():
    graph = {
        "A": {"B": 1.0, "C": 4.0},
        "B": {"A": 1.0, "C": 2.0, "D": 5.0},
        "C": {"A": 4.0, "B": 2.0, "D": 1.0},
        "D": {"B": 5.0, "C": 1.0}
    }
    req = SolarPanelsRequest(
        graph=graph,
        start_node="A",
        player_edges=[["A", "B"], ["B", "C"], ["C", "D"]]
    )
    res = solar_panels_mst(req)
    assert res["status"] == "OPTIMAL"
    assert res["optimal_cost"] == 4.0
    assert res["player_cost"] == 4.0
    assert res["power_consumed"] == 2.0
    assert set(res) == {"status", "optimal_cost", "optimal_edges", "player_cost", "power_consumed", "message"}


def test_solar_panels_invalid_edges():
    graph = {
        "A": {"B": 1.0},
        "B": {"A": 1.0, "C": 2.0},
        "C": {"B": 2.0}
    }
    req = SolarPanelsRequest(
        graph=graph,
        start_node="A",
        player_edges=[["A", "B"]]
    )
    res = solar_panels_mst(req)
    assert res["status"] == "INVALID_SPANNING_TREE"
    assert res["power_consumed"] == 0.0


def test_solar_panels_disconnected_graph():
    graph = {
        "A": {"B": 1.0},
        "B": {"A": 1.0},
        "C": {"D": 2.0},
        "D": {"C": 2.0},
    }
    res = solar_panels_mst(SolarPanelsRequest(graph=graph))
    assert res["status"] == "DISCONNECTED_GRAPH"
    assert res["power_consumed"] == 0.0


def test_solar_panels_compares_unrounded_costs():
    graph = {
        "A": {"B": 1.0, "C": 1.004},
        "B": {"A": 1.0, "C": 1.0},
        "C": {"A": 1.004, "B": 1.0},
    }
    res = solar_panels_mst(SolarPanelsRequest(
        graph=graph,
        player_edges=[["A", "B"], ["A", "C"]],
    ))
    assert res["status"] == "SUBOPTIMAL"
    assert res["player_cost"] == res["optimal_cost"]


def test_solar_panels_randomized_game():
    game = solar_panels_mst(SolarPanelsRequest())
    graph = game["graph"]
    nodes = list(graph)

    assert nodes == list("ABCDEF")
    assert game["start_node"] == "A"

    edge_count = sum(len(neighbors) for neighbors in graph.values()) // 2
    assert edge_count == 8

    for u, neighbors in graph.items():
        for v, weight in neighbors.items():
            assert graph[v][u] == weight
            assert 1 <= weight <= 15

    # Confirm every generated panel can be reached from the start node.
    visited = {game["start_node"]}
    queue = [game["start_node"]]
    while queue:
        current = queue.pop(0)
        for neighbor in graph[current]:
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)

    assert len(visited) == len(nodes)


def test_solar_panels_suboptimal_solution_consumes_more_power():
    graph = {
        "A": {"B": 1, "C": 8, "D": 5},
        "B": {"A": 1, "C": 2, "E": 6},
        "C": {"A": 8, "B": 2, "F": 3},
        "D": {"A": 5, "E": 2},
        "E": {"D": 2, "F": 2, "B": 6},
        "F": {"C": 3, "E": 2},
    }
    optimal = solar_panels_mst(SolarPanelsRequest(
        graph=graph,
        player_edges=[["A", "B"], ["B", "C"], ["C", "F"], ["F", "E"], ["E", "D"]],
    ))
    suboptimal = solar_panels_mst(SolarPanelsRequest(
        graph=graph,
        player_edges=[["A", "D"], ["D", "E"], ["E", "F"], ["F", "C"], ["C", "B"]],
    ))
    assert optimal["status"] == "OPTIMAL"
    assert suboptimal["status"] == "SUBOPTIMAL"
    assert suboptimal["power_consumed"] > optimal["power_consumed"]


# --- 4. Mining Rover (Bellman-Ford) ---
def test_mining_rover_optimal():
    edges = [
        ["Base", "A", 6],
        ["Base", "B", 7],
        ["A", "B", 8],
        ["A", "C", -4],
        ["B", "C", 9],
        ["B", "Excavation", 5],
        ["C", "Excavation", 2]
    ]
    req = MiningRoverRequest(
        edges=edges,
        start_node="Base",
        target_node="Excavation",
        player_path=["Base", "A", "C", "Excavation"]
    )
    res = mining_rover_navigation(req)
    assert res["status"] == "OPTIMAL"
    assert res["optimal_cost"] == 4.0
    assert res["player_cost"] == 4.0
    assert res["power_change"] == -2.0
    assert "efficiency" not in res


def test_mining_rover_negative_cycle_valid_json_without_infinity():
    # Case 4: Negative cycle response returns null cost without non-standard Infinity values
    edges = [
        ["Base", "A", 2],
        ["A", "B", -4],
        ["B", "A", -3],
        ["B", "Excavation", 1]
    ]
    req = MiningRoverRequest(
        edges=edges,
        start_node="Base",
        target_node="Excavation",
        player_path=["Base", "A", "B", "Excavation"]
    )
    res = mining_rover_navigation(req)
    assert res["status"] == "NEGATIVE_CYCLE_DETECTED"
    assert res["optimal_cost"] is None
    assert res["power_change"] == 0.0

    # Strict standard JSON serialization test
    serialized = json.dumps(jsonable_encoder(res), allow_nan=False)
    assert json.loads(serialized)["optimal_cost"] is None


def test_mining_rover_unreachable_destination_null_cost():
    # Case 3: Unreachable destination returns null costs
    edges = [["Base", "A", 5], ["B", "Excavation", 3]]
    req = MiningRoverRequest(
        edges=edges,
        start_node="Base",
        target_node="Excavation",
        player_path=["Base", "A"]
    )
    res = mining_rover_navigation(req)
    assert res["status"] == "UNREACHABLE"
    assert res["optimal_cost"] is None
    assert res["power_change"] == 0.0

    # Strict standard JSON serialization test
    serialized = json.dumps(jsonable_encoder(res), allow_nan=False)
    assert json.loads(serialized)["optimal_cost"] is None


def test_mining_rover_generates_random_costs_for_same_map():
    game = generate_mining_game()
    edges = game["edges"]

    assert len(edges) == 8
    assert game["start_node"] == "Base"
    assert game["target_node"] == "Excavation"
    assert {node for u, v, _ in edges for node in (u, v)} == {
        "Base", "Crater_Site", "Anomaly_Zone", "Deep_Shaft", "Lava_Tube", "Excavation"
    }
    costs = [weight for _, _, weight in edges]
    assert any(cost < 0 for cost in costs)
    assert 0 in costs
    assert any(cost > 0 for cost in costs)


def test_mining_rover_negative_cost_regenerates_power():
    edges = [
        ["Base", "Crater_Site", -2], ["Base", "Anomaly_Zone", 6],
        ["Crater_Site", "Deep_Shaft", 1], ["Crater_Site", "Anomaly_Zone", -3],
        ["Anomaly_Zone", "Lava_Tube", 1], ["Anomaly_Zone", "Deep_Shaft", -2],
        ["Deep_Shaft", "Excavation", 1], ["Lava_Tube", "Excavation", 1],
    ]
    req = MiningRoverRequest(
        edges=edges,
        player_path=["Base", "Crater_Site", "Anomaly_Zone", "Deep_Shaft", "Excavation"],
    )
    res = mining_rover_navigation(req)

    assert res["status"] == "OPTIMAL"
    assert res["player_cost"] == -6.0
    assert res["power_change"] == 3.0


# --- 5. Sample Retrieval (0/1 Knapsack) ---
def test_sample_retrieval_generates_random_samples():
    res = sample_retrieval(SampleRetrievalRequest())
    samples = res["available_samples"]

    assert res["bag_capacity"] == 15
    assert len(samples) == 9
    assert len({sample.id for sample in samples}) == 9
    assert all(1 <= sample.weight <= 15 for sample in samples)
    assert all(10 <= sample.value <= 50 for sample in samples)
    assert all(sample.name in {
        "Ilmenite", "Anorthite", "Pyroxene", "Olivine", "Plagioclase Feldspar",
        "Armalcolite", "Spinel", "Chromite", "Zircon", "Apatite",
        "Tranquillityite", "Troilite", "Whitlockite", "Pigeonite", "Orthopyroxene",
    } for sample in samples)


def test_sample_retrieval_optimal_loadout():
    samples = [
        SampleItem(id="s1", name="Ilmenite", weight=5, value=100),
        SampleItem(id="s2", name="Anorthite", weight=10, value=150),
        SampleItem(id="s3", name="Pyroxene", weight=3, value=80),
    ]
    req = SampleRetrievalRequest(
        bag_capacity=8, available_samples=samples, player_sample_ids=["s1", "s3"]
    )
    res = sample_retrieval(req)

    assert res["status"] == "OPTIMAL_LOADOUT"
    assert res["player_total_weight"] == res["optimal_total_weight"] == 8
    assert res["player_total_value"] == res["optimal_total_value"] == 180
    assert "power_gained" not in res


def test_sample_retrieval_suboptimal_loadout():
    samples = [
        SampleItem(id="s1", name="Ilmenite", weight=5, value=100),
        SampleItem(id="s2", name="Anorthite", weight=10, value=150),
        SampleItem(id="s3", name="Pyroxene", weight=3, value=80),
    ]
    req = SampleRetrievalRequest(
        bag_capacity=8, available_samples=samples, player_sample_ids=["s3"]
    )
    res = sample_retrieval(req)

    assert res["status"] == "SUBOPTIMAL_LOADOUT"
    assert res["player_total_value"] == 80
    assert res["optimal_total_value"] == 180


def test_sample_retrieval_overweight_loadout():
    samples = [
        SampleItem(id="s1", name="Ilmenite", weight=5, value=100),
        SampleItem(id="s2", name="Anorthite", weight=4, value=80),
    ]
    req = SampleRetrievalRequest(
        bag_capacity=8, available_samples=samples, player_sample_ids=["s1", "s2"]
    )
    res = sample_retrieval(req)

    assert res["status"] == "PAYLOAD_OVERWEIGHT"
    assert res["player_total_weight"] == 9
    assert "power_gained" not in res


# --- 6. Food Production (Greedy Activity Selection) ---
def test_food_production_optimal():
    tasks = [
        TaskModel(name="UV Sterilization", start_hour=0, end_hour=4, power_kw=3.0),
        TaskModel(name="LED Boost", start_hour=2, end_hour=7, power_kw=4.0),
        TaskModel(name="Algae Agitation", start_hour=4, end_hour=8, power_kw=3.0),
        TaskModel(name="Harvest Cycle", start_hour=8, end_hour=12, power_kw=3.5),
    ]
    req = FoodProductionRequest(
        available_tasks=tasks,
        selected_tasks=["UV Sterilization", "Algae Agitation", "Harvest Cycle"],
    )
    result = food_production_scheduling(req)
    assert result["status"] == "OPTIMAL"
    assert result["player_task_count"] == 3
    assert result["optimal"]["max_tasks"] == 3


def test_food_production_power_overload():
    tasks = [
        TaskModel(name="Task1", start_hour=0, end_hour=5, power_kw=3.5),
        TaskModel(name="Task2", start_hour=2, end_hour=6, power_kw=3.0),
    ]
    result = food_production_scheduling(FoodProductionRequest(
        available_tasks=tasks, selected_tasks=["Task1", "Task2"]
    ))
    assert result["status"] == "POWER_OVERLOAD"


def test_food_production_scheduling_conflict():
    tasks = [
        TaskModel(name="Task1", start_hour=0, end_hour=5, power_kw=1.0),
        TaskModel(name="Task2", start_hour=2, end_hour=6, power_kw=1.0),
    ]
    result = food_production_scheduling(FoodProductionRequest(
        available_tasks=tasks, selected_tasks=["Task1", "Task2"]
    ))
    assert result["status"] == "SCHEDULING_CONFLICT"


def test_food_production_rejects_invalid_intervals():
    tasks = [TaskModel(name="InvalidInterval", start_hour=6, end_hour=4, power_kw=3.0)]
    with pytest.raises(HTTPException) as exc_info:
        food_production_scheduling(FoodProductionRequest(available_tasks=tasks, selected_tasks=["InvalidInterval"]))
    assert exc_info.value.status_code == 400
    assert "invalid time interval" in exc_info.value.detail

    tasks = [TaskModel(name="ZeroDuration", start_hour=5, end_hour=5, power_kw=3.0)]
    with pytest.raises(HTTPException):
        food_production_scheduling(FoodProductionRequest(available_tasks=tasks, selected_tasks=["ZeroDuration"]))


def test_food_production_rejects_duplicate_task_names():
    tasks = [
        TaskModel(name="UV Light", start_hour=0, end_hour=4, power_kw=3.0),
        TaskModel(name="UV Light", start_hour=5, end_hour=8, power_kw=2.0),
    ]
    with pytest.raises(HTTPException) as exc_info:
        food_production_scheduling(FoodProductionRequest(available_tasks=tasks, selected_tasks=["UV Light"]))
    assert exc_info.value.status_code == 400
    assert "Duplicate task name" in exc_info.value.detail


def test_food_production_generates_seven_random_tasks():
    tasks = food_production_scheduling(FoodProductionRequest())["available_tasks"]
    assert len(tasks) == 7
    assert len({task["name"] for task in tasks}) == 7
    for task in tasks:
        assert 0 <= task["start_hour"] < task["end_hour"] <= 24
        assert 1.5 <= task["power_kw"] <= 4.8
        assert set(task) == {"name", "start_hour", "end_hour", "power_kw"}


def test_food_production_always_consumes_power_for_selected_tasks():
    task = TaskModel(name="LED Cycle", start_hour=2, end_hour=7, power_kw=2.0)
    result = food_production_scheduling(FoodProductionRequest(
        available_tasks=[task], selected_tasks=["LED Cycle"]
    ))
    assert result["power_consumed"] == 1.0  # 10 kWh costs 1 HUD point.
    assert result["status"] == "OPTIMAL"
    assert set(result) == {
        "status", "optimal", "player_task_count", "peak_power_kw",
        "bus_limit_kw", "power_consumed", "message",
    }


def test_food_production_maximizes_task_count_not_power_value():
    tasks = [
        TaskModel(name="Long", start_hour=0, end_hour=6, power_kw=4.5),
        TaskModel(name="A", start_hour=0, end_hour=2, power_kw=3.0),
        TaskModel(name="B", start_hour=2, end_hour=4, power_kw=3.0),
        TaskModel(name="C", start_hour=4, end_hour=6, power_kw=3.0),
    ]
    result = food_production_scheduling(FoodProductionRequest(
        available_tasks=tasks, selected_tasks=["A", "B", "C"]
    ))
    assert result["optimal"]["tasks"] == ["A", "B", "C"]
    assert result["optimal"]["max_tasks"] == 3
    assert result["status"] == "OPTIMAL"


def test_food_production_optimal_plan_excludes_tasks_over_bus_limit():
    tasks = [
        TaskModel(name="A", start_hour=0, end_hour=5, power_kw=8.0),
        TaskModel(name="B", start_hour=5, end_hour=8, power_kw=4.0),
    ]
    result = food_production_scheduling(FoodProductionRequest(
        available_tasks=tasks, selected_tasks=["B"], bus_limit_kw=5.0
    ))
    assert result["optimal"]["tasks"] == ["B"]
    assert result["optimal"]["max_tasks"] == 1
    assert result["status"] == "OPTIMAL"
    assert result["player_task_count"] == 1


# --- 7. Signal Match (Rabin-Karp) ---
def test_signal_match_generates_unique_challenge():
    challenge = signal_match_search(SignalMatchRequest())
    signal, pattern = challenge["signal"], challenge["pattern"]

    assert len(signal) == 80
    assert len(pattern) == 10
    assert set(signal + pattern) <= {"0", "1"}
    assert sum(signal[i:i + len(pattern)] == pattern for i in range(len(signal) - len(pattern) + 1)) == 1


def test_signal_match_accepts_correct_window():
    challenge = signal_match_search(SignalMatchRequest())
    index = rabin_karp_search(challenge["signal"], challenge["pattern"])
    req = SignalMatchRequest(**challenge, player_index=index)

    result = signal_match_search(req)
    assert result["pattern_found"] is True
    assert result["status"] == "PATTERN_LOCKED"


def test_signal_match_rejects_wrong_window():
    challenge = signal_match_search(SignalMatchRequest())
    index = rabin_karp_search(challenge["signal"], challenge["pattern"])
    wrong_index = index + 1 if index < len(challenge["signal"]) - len(challenge["pattern"]) else index - 1
    result = signal_match_search(SignalMatchRequest(**challenge, player_index=wrong_index))

    assert result["pattern_found"] is False
    assert result["status"] == "WRONG_WINDOW"


def test_signal_match_rejects_invalid_bits_and_window():
    with pytest.raises(HTTPException) as exc_info:
        signal_match_search(SignalMatchRequest(signal="010201", pattern="010", player_index=0))
    assert exc_info.value.status_code == 400

    challenge = signal_match_search(SignalMatchRequest())
    with pytest.raises(HTTPException) as index_error:
        signal_match_search(SignalMatchRequest(**challenge, player_index=100))
    assert index_error.value.status_code == 400


def test_rabin_karp_search():
    assert rabin_karp_search("11010010110", "00101") == 4
    assert rabin_karp_search("101010", "111") == -1


# --- 8. Signal Transmission (Huffman Decoding) ---
def test_signal_transmission_generates_and_decodes_challenge():
    challenge = signal_transmission(SignalTransmissionRequest())
    assert set(challenge) == {"encoded_signal", "code_map"}
    assert set(challenge["code_map"]).issubset(set("ABCDEFGHIJKLMNOPQRSTUVWXYZ "))
    assert set(challenge["encoded_signal"]).issubset({"0", "1"})

    answer = decode_huffman(challenge["encoded_signal"], challenge["code_map"])
    assert answer == "RECEIVED"
    req = SignalTransmissionRequest(**challenge, answer=answer.lower())
    result = signal_transmission(req)

    assert result["is_correct"] is True
    assert result["status"] == "CORRECT"
    assert result["correct_answer"] == answer


def test_signal_transmission_rejects_wrong_answer():
    challenge = signal_transmission(SignalTransmissionRequest())
    answer = decode_huffman(challenge["encoded_signal"], challenge["code_map"])
    wrong_answer = "HELP"

    result = signal_transmission(SignalTransmissionRequest(**challenge, answer=wrong_answer))
    assert result["is_correct"] is False
    assert result["status"] == "INCORRECT"


def test_signal_transmission_rejects_invalid_bits():
    req = SignalTransmissionRequest(encoded_signal="01012", code_map={"A": "0"}, answer="A")
    with pytest.raises(HTTPException) as exc_info:
        signal_transmission(req)
    assert exc_info.value.status_code == 400


# --- 9. Rover Workshop (Assembly Line Scheduling DP) ---
def make_workshop_request(**overrides):
    a1 = overrides.get("a1", [7, 9, 3, 4, 8, 4])
    n = len(a1)
    data = {
        "process_names": [f"Repair {i + 1}" for i in range(n)],
        "a1": a1,
        "a2": [6] * n,
        "t1": [1] * (n - 1),
        "t2": [1] * (n - 1),
        "entry1": 1,
        "entry2": 1,
        "exit1": 1,
        "exit2": 1,
        "power_kw": [3.0] * n,
        "player_sequence": [1] * n,
    }
    data.update(overrides)
    return RoverWorkshopRequest(**data)


def test_rover_workshop_generates_random_work_order():
    game = rover_workshop_scheduling(RoverWorkshopRequest())
    assert len(game["process_names"]) == 5
    assert len(set(game["process_names"])) == 5
    assert len(game["a1"]) == len(game["a2"]) == len(game["power_kw"]) == 5
    assert len(game["t1"]) == len(game["t2"]) == 4
    assert all(2.0 <= power <= 4.5 for power in game["power_kw"])

    req = RoverWorkshopRequest(**game, player_sequence=[1] * 5)
    result = rover_workshop_scheduling(req)
    assert result["power_consumed"] > 0


def test_rover_workshop_clrs_switching_optimal():
    req = make_workshop_request(
        a1=[7, 9, 3, 4, 8, 4],
        a2=[8, 5, 6, 4, 5, 7],
        t1=[2, 3, 1, 3, 4],
        t2=[2, 1, 2, 2, 1],
        entry1=2, entry2=4, exit1=3, exit2=2,
        player_sequence=[1, 2, 1, 2, 2, 1],
    )
    res = rover_workshop_scheduling(req)
    assert res["status"] == "OPTIMAL_SCHEDULE"
    assert res["optimal"]["time"] == 38.0
    assert res["player_time"] == 38.0
    assert res["optimal"]["sequence"] == [1, 2, 1, 2, 2, 1]
    assert res["time_difference"] == 0.0
    assert res["power_consumed"] > 0
    assert "efficiency" not in res
    json.dumps(jsonable_encoder(res), allow_nan=False)


def test_rover_workshop_staying_on_same_line_optimal():
    req = make_workshop_request(
        a1=[1, 1, 1], a2=[10, 10, 10], t1=[5, 5], t2=[5, 5],
        entry1=1, entry2=10, exit1=1, exit2=10, player_sequence=[1, 1, 1],
    )
    res = rover_workshop_scheduling(req)
    assert res["status"] == "OPTIMAL_SCHEDULE"
    assert res["optimal"]["time"] == 5.0
    assert res["player_time"] == 5.0
    assert res["optimal"]["sequence"] == [1, 1, 1]


def test_rover_workshop_suboptimal_schedule_uses_more_power():
    req = make_workshop_request(
        a1=[1, 1, 1], a2=[10, 10, 10], t1=[5, 5], t2=[5, 5],
        entry1=1, entry2=10, exit1=1, exit2=10, player_sequence=[2, 2, 2],
    )
    result = rover_workshop_scheduling(req)
    optimal_req = req.model_copy(update={"player_sequence": [1, 1, 1]})
    optimal_result = rover_workshop_scheduling(optimal_req)

    assert result["status"] == "SUBOPTIMAL_SCHEDULE"
    assert result["player_time"] == 50.0
    assert result["time_difference"] == 45.0
    assert result["power_consumed"] > optimal_result["power_consumed"]


def test_rover_workshop_invalid_sequence():
    req = make_workshop_request(a1=[1, 2, 3], player_sequence=[1, 2])
    with pytest.raises(HTTPException) as exc_info:
        rover_workshop_scheduling(req)
    assert exc_info.value.status_code == 400

    req = make_workshop_request(a1=[1, 2, 3], player_sequence=[1, 3, 2])
    with pytest.raises(HTTPException) as exc_info:
        rover_workshop_scheduling(req)
    assert exc_info.value.status_code == 400


def test_rover_workshop_invalid_array_lengths():
    req = make_workshop_request(a1=[1, 2, 3], a2=[1, 2])
    with pytest.raises(HTTPException) as exc_info:
        rover_workshop_scheduling(req)
    assert exc_info.value.status_code == 400

    req = make_workshop_request(a1=[1, 2, 3], t1=[1])
    with pytest.raises(HTTPException) as exc_info:
        rover_workshop_scheduling(req)
    assert exc_info.value.status_code == 400


def test_rover_workshop_rejects_negative_times_and_power():
    req = make_workshop_request(entry1=-1)
    with pytest.raises(HTTPException) as exc_info:
        rover_workshop_scheduling(req)
    assert exc_info.value.status_code == 400

    req = make_workshop_request(a1=[1, -2])
    with pytest.raises(HTTPException) as exc_info:
        rover_workshop_scheduling(req)
    assert exc_info.value.status_code == 400

    req = make_workshop_request(power_kw=[3.0, -1.0, 2.0, 2.0, 2.0, 2.0])
    with pytest.raises(HTTPException) as exc_info:
        rover_workshop_scheduling(req)
    assert exc_info.value.status_code == 400


def test_rover_workshop_single_station():
    req = make_workshop_request(
        a1=[5], a2=[7], t1=[], t2=[], entry1=2, entry2=1,
        exit1=3, exit2=2, player_sequence=[1],
    )
    res = rover_workshop_scheduling(req)
    assert res["status"] == "OPTIMAL_SCHEDULE"
    assert res["optimal"]["time"] == 10.0
    assert res["player_time"] == 10.0
    assert res["optimal"]["sequence"] == [1]
