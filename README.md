# 🌕 Lunar Stranding

**An Educational Algorithmic Survival Game Set at NASA's Artemis Base Camp**

**Lunar Stranding** is an interactive visual novel and strategy survival game designed for players ages 7–12. Set on the rim of the **Shackleton Crater** at the Moon's South Pole, players step into the boots of the Base Commander after an emergency landing. Guided by a supportive onboard AI companion, players must survive a 5-to-7 Sol (lunar day) rescue timeline by managing base **Power** and **Astronaut Vitals** while solving real-world NASA engineering challenges powered by fundamental computer science algorithms.

---

## 🌟 Key Features

* **Real NASA Science & Habitat Design:** Explore authentic lunar outpost modules including the Exterior Suitport (mitigating razor-sharp lunar regolith), the ECLSS (Environmental Control and Life Support System), Hydroponic Botany Bays, the Pressurized Rover, and the Peaks of Eternal Light.
* **Algorithm-Driven Mini-Games:** Every survival task is backed by a classic computer science algorithm running on a stateless FastAPI validation engine. Players learn efficiency and optimization naturally through gameplay rather than textbooks.
* **Kid-Friendly Survival Pacing:** Built around the "Rule of Two" (short, punchy two-sentence dialogue beats), keeping reading fatigue low and engagement high while maintaining an exciting mission atmosphere.
* **Resource & Vitals Management:** Balance base battery reserves (**Power**) against human maintenance (**Health/Vitals**) through daily $\frac{1}{6}\text{th}$ gravity resistance exercises, freeze-dried ration rehydration, and emergency hazard interrupts.

---

## 🧠 Core Algorithms & Mission Mapping

Each mini-game in the frontend (`frontend/src/minigames/`) communicates with a dedicated Python router (`backend/routers/`) that generates solvable puzzles, grades player efficiency, and returns optimal solutions:

| Mini-Game Module | Backend Router | Core Algorithm | Lunar Survival Application |
| :--- | :--- | :--- | :--- |
| **Solar Panels Grid** | `solar_panels.py` | **Prim's Algorithm** (Minimum Spanning Tree) | Connect vertical solar arrays along the Shackleton Crater rim using the minimum length of high-voltage cable without creating redundant loops. |
| **Water Rover Navigation** | `water_rover.py` | **Bellman-Ford Algorithm** (Shortest Path) | Navigate the rover into freezing Permanent Shadow Regions (PSRs) to harvest ancient ice while avoiding energy-draining hazard zones. |
| **Radio & Signal Lock** | `signal_match.py` | **Rabin-Karp Algorithm** (String/Pattern Matching) | Lock onto Earth Command's radio telemetry through solar storm interference by matching exact frequency wave patterns. |
| **Binary Telemetry** | `signal_transmission.py` | **Huffman Coding** (Data Compression) | Compress and decode binary (`0`s and `1`s) rescue transmissions from Earth to save bandwidth and base power. |
| **Hydroponic Botany** | `food_production.py` | **Activity Selection** (Greedy Scheduling) | Schedule non-overlapping LED light wavelengths to maximize plant growth and oxygen synthesis in the botany bay. |
| **Rover Servicing** | `rover_workshop.py` | **Assembly Line Scheduling** (Dynamic Programming) | Route regolith-damaged rovers through automated cleaning and repair bays using the fastest, lowest-energy sequence. |
| **Perimeter Sensors** | `crater_traverse.py` | **BFS / DFS Graph Traversal** | Deploy rovers to activate moonquake and solar particle early-warning sensors across crater nodes without looping. |
| **Geological Extraction** | `sample_retrieval.py` & `mining_rover.py` | **0/1 Knapsack** (Dynamic Programming) | Select the highest-value lunar rock samples for radiation shielding without exceeding the pressurized rover's payload capacity ($15\text{ kg}$). |

---

## 📅 Story Progression (Sol-by-Sol Overview)

* **Sol 1 – Crash & Triage:** Enter through the Suitport to keep sharp lunar dust out of the airlocks, boot up the **ECLSS**, wire the vertical solar microgrid (**Prim's**), and establish initial radio contact with Earth (**Rabin-Karp** & **Huffman**).
* **Sol 2 – The Dark Craters:** Configure hydroponic LED schedules (**Activity Selection**), pilot the ice-mining rover into the 15-Eiffel-Tower-deep Shackleton Crater PSR (**Bellman-Ford**), and make high-stakes power investments on the Peaks of Eternal Light.
* **Sol 3 – The Hostile Environment:** Clean lunar dust from jammed rover joints (**Assembly Line DP**), deploy moonquake and radiation sensors (**Graph Traversal**), and board the Pressurized Rover to escape incoming charged micro-particles.
* **Sol 4 & 5 – Surface Push & Extraction:** Harvest optimal lunar regolith and rock payloads for radiation shielding (**0/1 Knapsack**), survive solar flare interrupts, and lock the final landing beacon for the Earth rescue lander.

---

## 📂 Project Architecture

```text
Lunar-Stranding/
├── backend/
│   ├── main.py                      # FastAPI application entry point & CORS setup
│   ├── requirements.txt             # Python dependencies (FastAPI, Pydantic, Uvicorn)
│   ├── routers/                     # Algorithmic validation & puzzle generation endpoints
│   │   ├── crater_traverse.py       # Sensor network graph traversal
│   │   ├── food_production.py       # Hydroponic LED greedy scheduling
│   │   ├── mining_rover.py          # Lunar rock extraction logic
│   │   ├── rover_workshop.py        # Assembly line DP servicing
│   │   ├── sample_retrieval.py      # 0/1 Knapsack payload optimizer
│   │   ├── signal_match.py          # Rabin-Karp frequency matching
│   │   ├── signal_transmission.py   # Binary/Huffman decoding
│   │   ├── solar_panels.py          # Prim's MST microgrid generator & validator
│   │   └── water_rover.py           # Bellman-Ford PSR pathfinding
│   └── tests/
│       ├── test_all_minigames.py    # Automated unit tests for all algorithm endpoints
│       └── verify_live_server.py    # Live API health & endpoint verification
└── frontend/
    ├── index.html                   # Web entry point
    ├── package.json                 # Node dependencies & Vite scripts
    ├── vite.config.ts               # Vite bundler configuration
    └── src/
        ├── App.tsx                  # Main game state & loop controller
        ├── components/              # Core UI & Visual Novel HUD elements
        │   ├── HazardInterruptModal.tsx
        │   ├── Hud.tsx              # Power, Vitals, and Sol tracker
        │   ├── MapBoxes.tsx         # Interactive top-down NASA habitat layout
        │   ├── MinigameLayout.tsx   # Wrapper for algorithmic puzzles
        │   ├── StoryDialogue.tsx    # "Rule of Two" visual novel dialogue box
        │   ├── TacticalTabletModal.tsx
        │   └── UiPrimitives.tsx
        ├── minigames/               # Interactive React components for each algorithm
        │   ├── CraterTraverseGame.tsx
        │   ├── FoodProductionGame.tsx
        │   ├── MiningRoverGame.tsx
        │   ├── RadioGame.tsx
        │   ├── RoverWorkshopGame.tsx
        │   ├── SolarPanelsGame.tsx
        │   └── WaterRoverGame.tsx
        ├── services/
        │   └── api.ts               # Frontend-to-FastAPI HTTP client
        ├── story/
        │   └── storyFlow.ts         # Day-by-day narrative script & state transitions
        └── types/
            └── game.ts              # TypeScript interfaces for requests & game state
```

---

## 🚀 Getting Started

### Prerequisites
* **Python:** `3.10+` (or Anaconda environment)
* **Node.js:** `18+` (LTS recommended) and `npm`

### 1. Run the Backend Server (FastAPI)
Open a terminal and navigate to the `backend` directory:

```powershell
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```
*The backend API will start at `http://127.0.0.1:8000`. You can view the interactive Swagger API documentation at `http://127.0.0.1:8000/docs`.*

### 2. Run the Frontend Client (React + Vite)
Open a second terminal and navigate to the `frontend` directory:

```powershell
cd frontend
npm install
npm run dev
```
*Click the local URL printed in your terminal (typically `http://localhost:5173`) to launch **Lunar Stranding** in your browser.*

---

## 🧪 Running Tests

To verify all algorithm engines and edge-case validations on the backend:

```powershell
cd backend
pytest tests/test_all_minigames.py
```