from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

app = FastAPI(
    title="ScoutHub ML Service",
    version="0.1.0",
    description="Fair value prediction, player similarity, and UMAP embeddings.",
)

# The browser never calls this service directly (it goes through the backend API),
# so only the backend origin needs to be allowed. Keep "*" for local experiments only.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exposes request counts and latencies at /metrics for Prometheus
Instrumentator().instrument(app).expose(app, include_in_schema=False)


@app.get("/health")
def health():
    return {"status": "ok"}


# Routers will be added here as models are trained:
# from src.routers import value, similarity, galaxy, rag
# app.include_router(value.router,      prefix="/value")
# app.include_router(similarity.router, prefix="/similarity")
# app.include_router(galaxy.router,     prefix="/galaxy")
# app.include_router(rag.router,        prefix="/rag")
