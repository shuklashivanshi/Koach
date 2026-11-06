# Koach

A personal UPSC CSE coach. Product and plans live in `.planning/` (start with `PROJECT.md`).

## Run locally (web)

```bash
pnpm install
pnpm dev          # API on :8080 + web app on :8081
```

Open http://localhost:8081.

- **Data** is an in-memory Postgres (PGlite), so it resets whenever the API restarts.
- **Sign-in** is local only:
  - *Use email instead* prints the 6-digit code in the API terminal.
  - *Continue with Google* signs in as a fixed local test user.
- **AI and voice** call Vertex AI on `koach-dev-8cf0a5` through your `gcloud auth application-default login`.
- **Dev screen:** open http://localhost:8081/dev for the AI ping.

To run the parts separately, use `pnpm dev:api` and `pnpm dev:web`.

## Checks

```bash
pnpm typecheck && pnpm lint && pnpm test
```

## Cloud

Pushing to `main` deploys to Cloud Run (koach-dev) via `deploy.yaml`. For setup and infra scripts, see `infra/README.md`.
