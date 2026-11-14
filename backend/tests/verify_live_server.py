import subprocess
import time
import urllib.request
import urllib.error
import json
import sys

def run_live_check():
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000"],
        cwd="backend"
    )
    time.sleep(2.5)
    try:
        # 1. Health check
        req = urllib.request.urlopen("http://127.0.0.1:8000/")
        root_data = json.loads(req.read().decode())
        print("Live Health Check:", root_data["status"], len(root_data["endpoints"]), "endpoints registered")

        # 2. Water Rover unreachable: verify null optimal_cost in actual JSON response
        wr_unreachable = json.dumps({
            "graph": {"Base": {"A": 10}, "A": {"Base": 10}, "IceDeposit": {}},
            "start_node": "Base",
            "target_node": "IceDeposit",
            "player_path": ["Base", "A"]
        }).encode()
        req_wr = urllib.request.Request(
            "http://127.0.0.1:8000/api/minigames/water-rover",
            data=wr_unreachable,
            headers={"Content-Type": "application/json"}
        )
        res_wr = json.loads(urllib.request.urlopen(req_wr).read().decode())
        assert res_wr["optimal_cost"] is None, "Expected optimal_cost to be null"
        assert res_wr["optimal"]["cost"] is None
        print("Live Water Rover Unreachable: optimal_cost is JSON null (verified)")

        # 3. Water Rover negative weight rejection: verify HTTP 400
        wr_neg = json.dumps({
            "graph": {"Base": {"A": -5}, "A": {"IceDeposit": 10}, "IceDeposit": {}},
            "start_node": "Base",
            "target_node": "IceDeposit",
            "player_path": ["Base", "A", "IceDeposit"]
        }).encode()
        try:
            req_neg = urllib.request.Request(
                "http://127.0.0.1:8000/api/minigames/water-rover",
                data=wr_neg,
                headers={"Content-Type": "application/json"}
            )
            urllib.request.urlopen(req_neg)
            raise AssertionError("Should have raised HTTP 400")
        except urllib.error.HTTPError as e:
            assert e.code == 400
            print("Live Water Rover Negative Edge: HTTP 400 returned (verified)")

        # 4. Mining Rover negative cycle: verify null cost in JSON response
        mining_cycle = json.dumps({
            "edges": [["Base", "A", 2], ["A", "B", -4], ["B", "A", -3], ["B", "Excavation", 1]],
            "start_node": "Base",
            "target_node": "Excavation",
            "player_path": ["Base", "A", "B", "Excavation"]
        }).encode()
        req_cycle = urllib.request.Request(
            "http://127.0.0.1:8000/api/minigames/mining-rover",
            data=mining_cycle,
            headers={"Content-Type": "application/json"}
        )
        res_cycle = json.loads(urllib.request.urlopen(req_cycle).read().decode())
        assert res_cycle["optimal_cost"] is None, "Expected optimal_cost to be null"
        print("Live Mining Rover Negative Cycle: optimal_cost is JSON null (verified)")

        # 5. Food Production optimal plan with bus limit
        food_payload = json.dumps({
            "available_tasks": [
                {"name": "A", "start_hour": 0, "end_hour": 5, "power_kw": 8.0, "hp_gain": 50},
                {"name": "B", "start_hour": 5, "end_hour": 8, "power_kw": 4.0, "hp_gain": 20}
            ],
            "selected_tasks": ["B"],
            "bus_limit_kw": 5.0
        }).encode()
        req_fp = urllib.request.Request(
            "http://127.0.0.1:8000/api/minigames/food-production",
            data=food_payload,
            headers={"Content-Type": "application/json"}
        )
        res_fp = json.loads(urllib.request.urlopen(req_fp).read().decode())
        assert res_fp["optimal_tasks"] == ["B"]
        assert res_fp["optimal_hp_gain"] == 20
        print("Live Food Production Bus Limit: Excluded 8 kW task, optimal plan is ['B'] (verified)")

        # 6. Rabin-Karp invalid binary rejection: verify HTTP 400
        match_invalid = json.dumps({"signal": "10201", "pattern": "01"}).encode()
        try:
            req_rk = urllib.request.Request(
                "http://127.0.0.1:8000/api/minigames/signal-match",
                data=match_invalid,
                headers={"Content-Type": "application/json"}
            )
            urllib.request.urlopen(req_rk)
            raise AssertionError("Should have raised HTTP 400")
        except urllib.error.HTTPError as e:
            assert e.code == 400
            print("Live Rabin-Karp Invalid Input: HTTP 400 returned (verified)")

        # 7. Rover Workshop Assembly Line Scheduling: verify live POST
        rw_payload = json.dumps({
            "a1": [7, 9, 3, 4, 8, 4],
            "a2": [8, 5, 6, 4, 5, 7],
            "t1": [2, 3, 1, 3, 4],
            "t2": [2, 1, 2, 2, 1],
            "entry1": 2,
            "entry2": 4,
            "exit1": 3,
            "exit2": 2,
            "player_sequence": [1, 2, 1, 2, 2, 1]
        }).encode()
        req_rw = urllib.request.Request(
            "http://127.0.0.1:8000/api/minigames/rover-workshop",
            data=rw_payload,
            headers={"Content-Type": "application/json"}
        )
        res_rw = json.loads(urllib.request.urlopen(req_rw).read().decode())
        assert res_rw["optimal_time"] == 38.0
        assert res_rw["player_time"] == 38.0
        assert res_rw["status"] == "OPTIMAL_SCHEDULE"
        print("Live Rover Workshop: optimal_time 38 min, status OPTIMAL_SCHEDULE (verified)")

        print("ALL LIVE ENDPOINT CHECKS SUCCEEDED!")
    finally:
        proc.terminate()
        proc.wait()

if __name__ == "__main__":
    run_live_check()
