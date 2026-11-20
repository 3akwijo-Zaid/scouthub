from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="ScoutHub ML Service",
    version="0.1.0",
    description="Fair value prediction, player similarity, and UMAP embeddings.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


# Routers will be added here as models are trained:
# from src.routers import value, similarity, galaxy, rag
# app.include_router(value.router,      prefix="/value")
# app.include_router(similarity.router, prefix="/similarity")
# app.include_router(galaxy.router,     prefix="/galaxy")
# app.include_router(rag.router,        prefix="/rag")
