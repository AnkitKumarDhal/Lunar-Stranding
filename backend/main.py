from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# import 3 core minigame routers
from routers.water_rover import router as water_rover_router
from routers.crater_traverse import router as crater_traverse_router
from routers.sample_retrieval import router as sample_retrieval_router

app = FastAPI(title="Lunar Stranding - Mini-Games API")

# allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# mount the 3 algorithm routers
app.include_router(water_rover_router)
app.include_router(crater_traverse_router)
app.include_router(sample_retrieval_router)


# health check
@app.get("/")
def root():
    return {
        "status": "ok",
        "game": "Lunar Stranding",
        "endpoints": [
            "POST /api/minigames/water-rover",
            "POST /api/minigames/crater-traverse",
            "POST /api/minigames/sample-retrieval"
        ]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
