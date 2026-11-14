from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.water_rover import router as water_rover_router
from routers.crater_traverse import router as crater_traverse_router
from routers.sample_retrieval import router as sample_retrieval_router
from routers.food_production import router as food_production_router
from routers.signal_match import router as signal_match_router
from routers.signal_transmission import router as signal_transmission_router

app = FastAPI(title="Lunar Stranding - Mini-Games API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(water_rover_router)
app.include_router(crater_traverse_router)
app.include_router(sample_retrieval_router)
app.include_router(food_production_router)
app.include_router(signal_match_router)
app.include_router(signal_transmission_router)


@app.get("/")
def root():
    return {
        "status": "ok",
        "game": "Lunar Stranding",
        "endpoints": [
            "POST /api/minigames/water-rover",
            "POST /api/minigames/crater-traverse",
            "POST /api/minigames/sample-retrieval",
            "POST /api/minigames/food-production",
            "POST /api/minigames/signal-match",
            "POST /api/minigames/signal-transmission"
        ]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
