# Enterprise Services Portfolio

Complete EasyDeploy application with a normalized portfolio dataset, assessment workspace, and SQLite-backed assessment history.

## Replace the existing project

Copy these files into the root of `test-mike`, replacing matching files:

- `Dockerfile`
- `package.json`
- `package-lock.json`
- `.dockerignore`
- `src/index.js`
- `src/data/model.js`
- `src/data/portfolio.js`
- `src/data/store.js`

Keep the existing `easydeploy.yaml` unchanged.

## Local run

```bash
npm install
PORT=3000 DATABASE_PATH=./data/portfolio.db npm start
```

Useful checks:

- `/healthz`
- `/api/summary`
- `/api/storage`
- `/api/export/assessments`

## Persistence

SQLite is stored at `DATABASE_PATH`. The Dockerfile defaults to `/data/portfolio.db`.

Local assessment data survives app restarts. In EasyDeploy, `/data` must be backed by platform-provided persistent storage; otherwise the database survives only for the life of the container. The export endpoint provides a JSON backup while durable storage is being arranged.
