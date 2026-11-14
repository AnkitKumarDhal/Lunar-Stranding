import subprocess
import time
import urllib.request
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

        # 2. Signal Match POST
        match_payload = json.dumps({"signal": "11010010110", "pattern": "00101"}).encode()
        req2 = urllib.request.Request(
            "http://127.0.0.1:8000/api/minigames/signal-match",
            data=match_payload,
            headers={"Content-Type": "application/json"}
        )
        res2 = json.loads(urllib.request.urlopen(req2).read().decode())
        print("Live Signal Match:", res2["status"], "Match Index:", res2["match_index"])

        # 3. Solar Panels POST
        solar_payload = json.dumps({
            "graph": {"A": {"B": 1.0, "C": 4.0}, "B": {"A": 1.0, "C": 2.0}, "C": {"A": 4.0, "B": 2.0}},
            "start_node": "A",
            "player_edges": [["A", "B"], ["B", "C"]]
        }).encode()
        req3 = urllib.request.Request(
            "http://127.0.0.1:8000/api/minigames/solar-panels",
            data=solar_payload,
            headers={"Content-Type": "application/json"}
        )
        res3 = json.loads(urllib.request.urlopen(req3).read().decode())
        print("Live Solar Panels:", res3["status"], "Optimal Cost:", res3["optimal_cost"], "Player Cost:", res3["player_cost"])

        # 4. Mining Rover POST
        mining_payload = json.dumps({
            "edges": [["Base", "A", 3], ["A", "Excavation", -1]],
            "start_node": "Base",
            "target_node": "Excavation",
            "player_path": ["Base", "A", "Excavation"]
        }).encode()
        req4 = urllib.request.Request(
            "http://127.0.0.1:8000/api/minigames/mining-rover",
            data=mining_payload,
            headers={"Content-Type": "application/json"}
        )
        res4 = json.loads(urllib.request.urlopen(req4).read().decode())
        print("Live Mining Rover:", res4["status"], "Optimal Cost:", res4["optimal_cost"])

        # 5. Food Production POST
        food_payload = json.dumps({
            "available_tasks": [{"name": "Task1", "start_hour": 0, "end_hour": 4, "power_kw": 3.0, "hp_gain": 20}],
            "selected_tasks": ["Task1"],
            "current_hp": 80
        }).encode()
        req5 = urllib.request.Request(
            "http://127.0.0.1:8000/api/minigames/food-production",
            data=food_payload,
            headers={"Content-Type": "application/json"}
        )
        res5 = json.loads(urllib.request.urlopen(req5).read().decode())
        print("Live Food Production:", res5["status"], "Final HP:", res5["final_hp"])

        print("ALL LIVE ENDPOINT CHECKS SUCCEEDED!")
    finally:
        proc.terminate()
        proc.wait()

if __name__ == "__main__":
    run_live_check()
