# 🌕 Lunar Stranding

**An educational algorithmic survival game set at an Artemis-inspired lunar outpost**

🌐 **Play the deployed game:** [https://lunar-stranding-rho.vercel.app/](https://lunar-stranding-rho.vercel.app/)

**Lunar Stranding** is an interactive story and strategy game set near **Shackleton Crater at the Moon's South Pole**. After an emergency landing, the player becomes the commander of a lunar outpost. Guided by an onboard AI companion, they must keep the base running and complete a seven-day survival mission while waiting for rescue.

Players operate the outpost through short story sequences, a top-down base map and algorithm-based mini-games. Each mini-game turns a real computer science problem into a practical engineering task.

---

## 🌟 Key Features

- **Lunar outpost setting:** Explore facilities inspired by lunar surface operations, including the suitport, ECLSS, solar array, greenhouse, water rover, mining rover and rover workshop.
- **Algorithm-based mini-games:** Solve graph, string, greedy and dynamic-programming challenges through interactive gameplay.
- **Randomized challenges:** Several mini-games generate new maps, routes, signals, schedules or cargo items for replayability.
- **AI-guided story:** Follow the narrative across seven in-game days. From Day 5 onward, complete the required daily mini-games before ending the day.
- **Shared Power resource:** The HUD tracks Power from 0 to 100. Relevant mini-games consume Power, while downhill mining routes can regenerate it. Reaching zero triggers Game Over and a retry option.
- **Saved progress:** Story progress and current Power are stored in the browser using `localStorage`.

> **Current resource model:** Power is the game's implemented survival resource. A separate player Health/HP or Vitals system is not used.

---

## 🧠 Core Algorithms & Mission Mapping

Each mini-game in `frontend/src/minigames/` communicates with a FastAPI router in `backend/routers/`. The API generates challenges and evaluates the player's solution against the relevant algorithm.

| Mini-game | Backend router | Core algorithm | Gameplay objective |
|---|---|---|---|
| **Solar Panels Grid** | `solar_panels.py` | **Prim's Minimum Spanning Tree** | Connect six panels arranged in a 2×3 grid using exactly five cables and the minimum total cable length. Cable weights are randomized. |
| **Water Rover Navigation** | `water_rover.py` | **Dijkstra's Shortest Path** | Guide the rover from the Base to the Ice Deposit using the least-energy route. Edge costs are non-negative. |
| **Radio Signal Matching** | `signal_match.py` | **Rabin–Karp Pattern Matching** | Find a target binary substring inside a larger signal by sliding a fixed-length window one bit at a time. |
| **Radio Signal Decoding** | `signal_transmission.py` | **Huffman Coding** | Decode the binary response using the supplied character-to-code table. The current transmitted message is `RECEIVED`. |
| **Greenhouse Scheduling** | `food_production.py` | **Greedy Activity Selection** | Choose the maximum number of non-overlapping greenhouse activities while respecting the 5 kW power-bus limit. |
| **Rover Servicing** | `rover_workshop.py` | **Assembly Line Scheduling (Dynamic Programming)** | Choose between two servicing lines at each station to minimize total repair time, including entry, exit and transfer times. |
| **Crater Sensor Traverse** | `crater_traverse.py` | **Breadth-First Search (BFS)** | Visit every sensor node using the fewest movements. The generated network contains ten connected crater nodes. |
| **Mining Rover Navigation** | `mining_rover.py` | **Bellman–Ford Shortest Path** | Find a minimum-net-energy route to the Excavation site. Randomized directed edges can have positive, zero or negative costs; negative costs represent solar regeneration. |
| **Lunar Sample Retrieval** | `sample_retrieval.py` | **0/1 Knapsack (Dynamic Programming)** | Select the most valuable combination of nine randomized lunar mineral samples without exceeding the 15 kg cargo limit. Each sample is taken whole or left behind. |

### Power behaviour

Power is a shared HUD resource, but the cost calculation is specific to each task. Route length, movement count, cable length, schedule energy or servicing time can affect the amount consumed. Mining navigation uses signed net energy: positive route cost consumes Power, while negative route cost regenerates it. Sample Retrieval is a value-and-weight puzzle and does not change Power.

---

## 📅 Seven-Day Story Progression

The first four days introduce the outpost and its systems through guided missions. After the player learns the core operations, Days 5–7 use a daily checklist of required mini-games.

| Day | Story and required activities |
|---|---|
| **Day 1 — Landing & Communication** | Reach the base through the suitport, bring the outpost online, connect the solar panels, match the radio signal and decode Earth's response. |
| **Day 2 — Water & Food** | Schedule greenhouse activities and navigate the Water Rover to the Ice Deposit. The solar grid can also be offered as an optional activity. |
| **Day 3 — Maintenance & Sensors** | Schedule greenhouse activities, service the Water Rover, collect water and activate all crater sensors. The crew then prepares to travel toward the mining site. |
| **Day 4 — Mining & Collection** | Navigate the Mining Rover to the Excavation site and select lunar mineral samples that fit within the cargo limit. |
| **Day 5 — Full Autonomy** | Complete Greenhouse Scheduling, Water Retrieval and Crater Sensor Traverse. |
| **Day 6 — Maintenance & Mining** | Complete Rover Servicing, Mining Navigation and Lunar Sample Retrieval. |
| **Day 7 — Final Operations** | Complete Solar Panel Connections, Radio Signal Matching and Signal Decoding. Finishing all three leads to the final AI dialogue and **MISSION SUCCESS** screen. |

For Days 5–7, the **Daily Operations** panel lists the three required mini-games and tracks completion. A valid optimal or suboptimal result counts as completed; an invalid or incorrect attempt does not. The **Eat / Rest / End Day** action remains disabled until all three required activities are complete.

---

## ⚡ Power, Progress and Game States

- The Power HUD starts at **100** and is clamped between 0 and 100.
- Mini-games that use Power report their cost or signed Power change to the main application, which updates the HUD.
- A negative Mining Rover route cost can restore Power through solar regeneration.
- When Power reaches **0**, the game displays **GAME OVER**. **RETRY** restarts the mission from Day 1 and resets Power.
- Completing the required operations on Day 7 leads to the final **MISSION SUCCESS** screen.
- Story progress and Power are saved in browser `localStorage` so a page refresh does not automatically restart the run.

---

## 🧰 Technology Stack

- **Frontend:** React, TypeScript, Vite and Tailwind CSS.
- **Backend:** Python, FastAPI and Pydantic.
- **Algorithms:** Graph algorithms, string matching, greedy scheduling and dynamic programming.
- **Testing:** Pytest for backend logic and API behaviour; TypeScript/Vite build and Oxlint for the frontend.

---

## 📂 Project Architecture

```text
Lunar-Stranding/
├── backend/
│   ├── main.py                         # FastAPI application and router registration
│   ├── requirements.txt                # Python dependencies
│   ├── routers/
│   │   ├── crater_traverse.py           # BFS sensor traversal
│   │   ├── food_production.py           # Greedy Activity Selection
│   │   ├── mining_rover.py              # Bellman–Ford navigation
│   │   ├── rover_workshop.py            # Assembly Line Scheduling DP
│   │   ├── sample_retrieval.py          # 0/1 Knapsack mineral selection
│   │   ├── signal_match.py              # Rabin–Karp binary pattern search
│   │   ├── signal_transmission.py       # Huffman challenge generation and decoding
│   │   ├── solar_panels.py              # Prim's Minimum Spanning Tree
│   │   └── water_rover.py               # Dijkstra water-route navigation
│   └── tests/
│       ├── test_all_minigames.py        # Backend algorithm and endpoint tests
│       └── verify_live_server.py        # Live API checks
└── frontend/
    ├── index.html                       # Web entry point
    ├── package.json                    # Frontend scripts and dependencies
    ├── vite.config.ts                  # Vite configuration
    └── src/
        ├── App.tsx                     # Main game state, power and story progression
        ├── components/
        │   ├── HazardInterruptModal.tsx
        │   ├── Hud.tsx                 # Power HUD and Daily Operations panel
        │   ├── MapBoxes.tsx            # Interactive outpost map and facilities
        │   ├── MinigameLayout.tsx      # Shared mini-game layout
        │   ├── StoryDialogue.tsx       # AI dialogue and story controls
        │   ├── TacticalTabletModal.tsx # Facility mini-game container
        │   └── UiPrimitives.tsx        # Shared UI elements
        ├── minigames/
        │   ├── CraterTraverseGame.tsx
        │   ├── FoodProductionGame.tsx
        │   ├── MiningRoverGame.tsx
        │   ├── RadioGame.tsx
        │   ├── RoverWorkshopGame.tsx
        │   ├── SolarPanelsGame.tsx
        │   └── WaterRoverGame.tsx
        ├── services/
        │   └── api.ts                  # Frontend-to-FastAPI client and types
        ├── story/
        │   └── storyFlow.ts            # Day-by-day dialogue and mission flow
        ├── types/
        │   └── game.ts                 # Shared TypeScript types
        ├── index.css
        └── theme.css
```

---

## 🚀 Play the Game

The game is deployed and can be played directly in your browser:

**[https://lunar-stranding-rho.vercel.app/](https://lunar-stranding-rho.vercel.app/)**

### Requirements for Local Development

If you want to run or modify the project locally, you will need:

- **Python:** 3.10 or newer
- **Node.js:** 20.19+ or 22.12+
- **npm**
- **Backend dependencies:** listed in `backend/requirements.txt`
- **Frontend dependencies:** listed in `frontend/package.json`

### Testing

The project includes backend tests in `backend/tests/test_all_minigames.py` and live API checks in `backend/tests/verify_live_server.py`. The frontend uses its configured build and lint checks.

---

## 📌 Project Scope

Lunar Stranding is an educational game prototype. Its mini-games demonstrate algorithmic ideas through simplified lunar-outpost scenarios; they are not a full engineering simulation or an official NASA product. The campaign currently focuses on Power management, algorithm challenges, daily objectives and story progression.
