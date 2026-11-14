import sys
import os
import json
import pytest
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.encoders import jsonable_encoder
from fastapi import HTTPException
from main import root
from routers.water_rover import water_rover_navigation, WaterRoverRequest
from routers.crater_traverse import crater_traversal, CraterTraverseRequest
from routers.solar_panels import solar_panels_mst, SolarPanelsRequest
from routers.mining_rover import mining_rover_navigation, MiningRoverRequest
from routers.sample_retrieval import sample_retrieval, SampleRetrievalRequest, SampleItem
from routers.food_production import food_production_scheduling, FoodProductionRequest, TaskModel
from routers.signal_match import signal_match_search, SignalMatchRequest
from routers.signal_transmission import signal_transmission_encode, SignalTransmissionRequest


def test_root_health():
    res = root()
    assert res["status"] == "ok"
    assert len(res["endpoints"]) == 8


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
        player_path=["Base", "NodeA", "NodeC", "IceDeposit"],
        initial_battery=100.0
    )
    res = water_rover_navigation(req)
    assert res["status"] == "OPTIMAL"
    assert res["player_cost"] == 45.0
    assert res["is_valid_path"] is True


def test_water_rover_invalid_route():
    graph = {"Base": {"NodeA": 10}, "NodeA": {"Base": 10, "IceDeposit": 20}, "IceDeposit": {}}
    req = WaterRoverRequest(
        graph=graph,
        start_node="Base",
        target_node="IceDeposit",
        player_path=["Base", "IceDeposit"],
        initial_battery=100.0
    )
    res = water_rover_navigation(req)
    assert res["status"] == "INVALID_ROUTE"
    assert res["is_valid_path"] is False


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
    assert res["optimal"]["cost"] is None

    # Strict JSON serialization test (disallows non-standard Infinity/NaN)
    serialized = json.dumps(jsonable_encoder(res), allow_nan=False)
    parsed = json.loads(serialized)
    assert parsed["optimal_cost"] is None
    assert parsed["optimal"]["cost"] is None


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
    path = ["Crater_Alpha", "Rim_1", "Crater_Zeta", "Ridge_1", "Crater_Zeta", "Ridge_2", "Rim_2"]
    req = CraterTraverseRequest(
        graph=graph,
        start_node="Crater_Alpha",
        player_path=path
    )
    res = crater_traversal(req)
    assert res["all_craters_covered"] is True
    assert res["is_valid_path"] is True


def test_crater_traverse_incomplete():
    graph = {
        "Crater_Alpha": ["Rim_1"],
        "Rim_1": ["Crater_Alpha", "Crater_Zeta"],
        "Crater_Zeta": ["Rim_1"]
    }
    req = CraterTraverseRequest(
        graph=graph,
        start_node="Crater_Alpha",
        player_path=["Crater_Alpha", "Rim_1"]
    )
    res = crater_traversal(req)
    assert res["status"] == "INCOMPLETE"
    assert res["all_craters_covered"] is False


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
    assert res["is_valid_mst"] is True


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
    assert res["is_valid_mst"] is False
    assert res["status"] == "INVALID_SPANNING_TREE"


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
    assert res["has_negative_cycle"] is False


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
    assert res["has_negative_cycle"] is True
    assert res["optimal_cost"] is None
    assert res["optimal"]["cost"] is None

    # Strict standard JSON serialization test
    serialized = json.dumps(jsonable_encoder(res), allow_nan=False)
    parsed = json.loads(serialized)
    assert parsed["optimal_cost"] is None
    assert parsed["optimal"]["cost"] is None


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
    assert res["optimal"]["cost"] is None
    assert res["optimal"]["distances"]["Excavation"] is None

    # Strict standard JSON serialization test
    serialized = json.dumps(jsonable_encoder(res), allow_nan=False)
    parsed = json.loads(serialized)
    assert parsed["optimal_cost"] is None
    assert parsed["optimal"]["cost"] is None


# --- 5. Sample Retrieval (0/1 Knapsack) ---
def test_sample_retrieval_optimal():
    samples = [
        SampleItem(id="s1", name="Ilmenite", weight=5, value=10),
        SampleItem(id="s2", name="Basalt", weight=10, value=20),
        SampleItem(id="s3", name="Anorthosite", weight=3, value=15),
    ]
    req = SampleRetrievalRequest(
        bag_capacity=8,
        available_samples=samples,
        player_sample_ids=["s1", "s3"]
    )
    res = sample_retrieval(req)
    assert res["status"] == "OPTIMAL_LOADOUT"
    assert res["player_total_value"] == 25
    assert res["optimal_max_value"] == 25


def test_sample_retrieval_overweight():
    samples = [
        SampleItem(id="s1", name="Ilmenite", weight=10, value=10),
    ]
    req = SampleRetrievalRequest(
        bag_capacity=5,
        available_samples=samples,
        player_sample_ids=["s1"]
    )
    res = sample_retrieval(req)
    assert res["is_overweight"] is True
    assert res["status"] == "PAYLOAD_OVERWEIGHT"


# --- 6. Food Production (Weighted Activity Selection) ---
def test_food_production_optimal():
    tasks = [
        TaskModel(name="UV Sterilization", start_hour=0, end_hour=4, power_kw=3.0, hp_gain=10),
        TaskModel(name="LED Boost", start_hour=2, end_hour=7, power_kw=4.0, hp_gain=18),
        TaskModel(name="Algae Agitation", start_hour=4, end_hour=8, power_kw=3.0, hp_gain=15),
        TaskModel(name="Harvest Cycle", start_hour=8, end_hour=12, power_kw=3.5, hp_gain=20),
    ]
    req = FoodProductionRequest(
        available_tasks=tasks,
        selected_tasks=["UV Sterilization", "Algae Agitation", "Harvest Cycle"],
        current_hp=80,
        daily_hp_drain=30,
        bus_limit_kw=5.0
    )
    res = food_production_scheduling(req)
    assert res["status"] == "OPTIMAL"
    assert res["player_hp_gain"] == 45
    assert res["is_valid_schedule"] is True


def test_food_production_power_overload():
    tasks = [
        TaskModel(name="Task1", start_hour=0, end_hour=5, power_kw=3.5, hp_gain=10),
        TaskModel(name="Task2", start_hour=2, end_hour=6, power_kw=3.0, hp_gain=15),
    ]
    req = FoodProductionRequest(
        available_tasks=tasks,
        selected_tasks=["Task1", "Task2"],
        bus_limit_kw=5.0
    )
    res = food_production_scheduling(req)
    assert res["status"] == "POWER_OVERLOAD"
    assert res["is_valid_schedule"] is False


def test_food_production_scheduling_conflict():
    tasks = [
        TaskModel(name="Task1", start_hour=0, end_hour=5, power_kw=1.0, hp_gain=10),
        TaskModel(name="Task2", start_hour=2, end_hour=6, power_kw=1.0, hp_gain=15),
    ]
    req = FoodProductionRequest(
        available_tasks=tasks,
        selected_tasks=["Task1", "Task2"],
        bus_limit_kw=5.0
    )
    res = food_production_scheduling(req)
    assert res["status"] == "SCHEDULING_CONFLICT"
    assert res["is_valid_schedule"] is False


def test_food_production_rejects_invalid_intervals():
    # Case 5: Reject invalid intervals (start >= end) immediately with HTTP 400 without hanging
    tasks = [
        TaskModel(name="InvalidInterval", start_hour=6, end_hour=4, power_kw=3.0, hp_gain=10)
    ]
    req = FoodProductionRequest(available_tasks=tasks, selected_tasks=["InvalidInterval"])
    with pytest.raises(HTTPException) as exc_info:
        food_production_scheduling(req)
    assert exc_info.value.status_code == 400
    assert "invalid time interval" in exc_info.value.detail

    # Zero duration interval
    tasks_zero = [
        TaskModel(name="ZeroDuration", start_hour=5, end_hour=5, power_kw=3.0, hp_gain=10)
    ]
    req_zero = FoodProductionRequest(available_tasks=tasks_zero, selected_tasks=["ZeroDuration"])
    with pytest.raises(HTTPException) as exc_info_zero:
        food_production_scheduling(req_zero)
    assert exc_info_zero.value.status_code == 400


def test_food_production_rejects_duplicate_task_names():
    # Case 6: Reject duplicate task names with HTTP 400
    tasks = [
        TaskModel(name="UV Light", start_hour=0, end_hour=4, power_kw=3.0, hp_gain=10),
        TaskModel(name="UV Light", start_hour=5, end_hour=8, power_kw=2.0, hp_gain=12)
    ]
    req = FoodProductionRequest(available_tasks=tasks, selected_tasks=["UV Light"])
    with pytest.raises(HTTPException) as exc_info:
        food_production_scheduling(req)
    assert exc_info.value.status_code == 400
    assert "Duplicate task name" in exc_info.value.detail


def test_food_production_optimal_plan_excludes_tasks_exceeding_bus_limit():
    # Case 7: Exclude tasks exceeding bus_limit_kw from optimal plan
    # Task A: 0-5, 8 kW, 50 HP (exceeds 5 kW bus limit)
    # Task B: 5-8, 4 kW, 20 HP (within 5 kW bus limit)
    # Expected: Task B only, with 20 HP
    tasks = [
        TaskModel(name="A", start_hour=0, end_hour=5, power_kw=8.0, hp_gain=50),
        TaskModel(name="B", start_hour=5, end_hour=8, power_kw=4.0, hp_gain=20),
    ]
    req = FoodProductionRequest(
        available_tasks=tasks,
        selected_tasks=["B"],
        bus_limit_kw=5.0
    )
    res = food_production_scheduling(req)
    assert res["optimal_hp_gain"] == 20
    assert res["optimal_tasks"] == ["B"]
    assert res["status"] == "OPTIMAL"
    assert res["player_hp_gain"] == 20


# --- 7. Signal Match (Rabin-Karp) ---
def test_signal_match_found():
    req = SignalMatchRequest(
        signal="11010010110",
        pattern="00101"
    )
    res = signal_match_search(req)
    assert res["pattern_found"] is True
    assert res["match_index"] == 4
    assert res["status"] == "PATTERN_LOCKED"


def test_signal_match_edge_cases():
    req1 = SignalMatchRequest(signal="10101", pattern="")
    assert signal_match_search(req1)["status"] == "EMPTY_PATTERN"

    req2 = SignalMatchRequest(signal="10", pattern="10101")
    assert signal_match_search(req2)["status"] == "PATTERN_TOO_LONG"


def test_rabin_karp_rejects_invalid_binary_string():
    # Case 8: Reject strings containing invalid characters with HTTP 400
    req = SignalMatchRequest(signal="101021", pattern="01")
    with pytest.raises(HTTPException) as exc_info:
        signal_match_search(req)
    assert exc_info.value.status_code == 400
    assert "Only binary digits '0' and '1' are allowed" in exc_info.value.detail

    req2 = SignalMatchRequest(signal="10101", pattern="01abc")
    with pytest.raises(HTTPException) as exc_info2:
        signal_match_search(req2)
    assert exc_info2.value.status_code == 400
    assert "Only binary digits '0' and '1' are allowed" in exc_info2.value.detail


def test_rabin_karp_rejects_invalid_integer_array():
    # Case 9: Reject integer arrays with values other than 0 and 1 with HTTP 400
    req = SignalMatchRequest(signal=[1, 0, 2, 1], pattern=[0, 1])
    with pytest.raises(HTTPException) as exc_info:
        signal_match_search(req)
    assert exc_info.value.status_code == 400
    assert "Only 0 and 1 integer values are allowed" in exc_info.value.detail

    req2 = SignalMatchRequest(signal=[1, 0, 1], pattern=[0, -1])
    with pytest.raises(HTTPException) as exc_info2:
        signal_match_search(req2)
    assert exc_info2.value.status_code == 400
    assert "Only 0 and 1 integer values are allowed" in exc_info2.value.detail


# --- 8. Signal Transmission (Huffman Coding) ---
def test_signal_transmission_roundtrip():
    req = SignalTransmissionRequest(text="lunar base communication")
    res = signal_transmission_encode(req)
    assert res["is_valid"] is True
    assert res["decoded_text"] == "lunar base communication"
    assert res["encoded_length_bits"] < res["original_length_bits"]
    assert res["status"] == "OPTIMAL_COMPRESSION"


def test_signal_transmission_edge_cases():
    req1 = SignalTransmissionRequest(text="AAAA")
    res1 = signal_transmission_encode(req1)
    assert res1["is_valid"] is True
    assert res1["decoded_text"] == "AAAA"

    req2 = SignalTransmissionRequest(text="")
    res2 = signal_transmission_encode(req2)
    assert res2["status"] == "EMPTY_INPUT"
