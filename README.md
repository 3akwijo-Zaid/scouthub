# ScoutHub

> Le marché des transferts, lu comme une bourse.

Plateforme intelligente de scouting : application web, application mobile Flutter,
API Spring Boot, service ML (FastAPI + XGBoost + UMAP), Copilot RAG (Ollama + pgvector).
Équipe de 3 · 17 nov → 15 déc 2026.

## Structure

```
scouthub/
├── backend/   Role A — Spring Boot API (Java 21, Gradle)
├── web/       Role B — React + TypeScript + Vite + deck.gl
├── mobile/    Role B — Flutter
├── ml/        Role C — Python, FastAPI, XGBoost, UMAP, pgvector
├── infra/     Nginx, Prometheus, Grafana configs
├── docs/api/  OpenAPI contract (mock with Prism)
└── docker-compose.yml
```

## Démarrage rapide

```bash
cp .env.example .env          # copier et adapter les secrets
docker compose up -d          # postgres + redis + backend + ml + web
docker compose --profile ai up -d           # + Ollama
docker compose --profile monitoring up -d   # + Prometheus + Grafana
```

## Mock API (Sprint 0 — Role B sans backend)

```bash
npx @stoplight/prism-cli mock docs/api/openapi.yaml
# → mock server sur http://localhost:4010
```

## Services

| Service    | URL locale             | Description               |
|------------|------------------------|---------------------------|
| Backend    | http://localhost:8080/api | API REST (toutes les routes sous /api) |
| Swagger UI | http://localhost:8080/api/swagger-ui.html | Docs interactives |
| ML         | http://localhost:8000  | FastAPI + modèles         |
| Web        | http://localhost:5173  | App React                 |
| Ollama     | http://localhost:11434 | LLM local (profil ai)     |
| Prometheus | http://localhost:9090  | Métriques (profil monitoring) — backend: /api/actuator/prometheus, ml: /metrics |
| Grafana    | http://localhost:3000  | Dashboards (profil monitoring) |

## Branches

- `main` — production stable
- `role/backend` — Role A
- `role/web-mobile` — Role B
- `role/ml` — Role C
- `feat/<nom>` — features individuelles

## Équipe

| Rôle | Responsabilité |
|------|---------------|
| A — Backend | Spring Boot API, auth, PostgreSQL + pgvector, Ollama RAG, CI/CD |
| B — Web + Mobile | React (Galaxy, Fair Value, Copilot UI), Flutter (rapports, watchlist) |
| C — Data + ML | Données Transfermarkt/FBref, XGBoost + SHAP, UMAP, FastAPI |

## Conventions

- **Migrations Flyway** : `V1__init.sql` contient les tables partagées. Ensuite, chaque migration est nommée avec un horodatage
  (`V20261121_1800__datasets.sql`) pour que deux branches ne prennent jamais le même numéro de version.
- **Erreurs API** : toutes les erreurs sont renvoyées au format RFC 7807 (`application/problem+json`) par `common/ApiExceptionHandler`.
- **Tests** : `cd backend && ./gradlew build` · `cd ml && pip install -r requirements-dev.txt && pytest`.
