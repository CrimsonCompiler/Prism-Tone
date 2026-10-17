from fastapi import FastAPI
from api.ndvi_routes import router

app = FastAPI(title="Earth Jukebox API")

app.include_router(router)


@app.get("/")
def home():
    return {"message": "Earth Jukebox API is running"}
