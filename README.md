# Enterprise Services Portfolio: Administration Release

This larger release moves the master portfolio into SQLite and adds a self-contained editing layer.

## Included

- Existing Command Center, heatmap, comparison, assessments, and action register
- SQLite-backed Domains, Services, Offerings, Products, and Relationships
- Create and edit forms for all master entities
- Archive rather than hard-delete
- Relationship role, confidence, status, and notes
- Audit history
- Data-quality checks for orphans, missing mappings, and missing owners
- Merge import from the JSON portfolio export
- Full JSON backup/export
- Automatic seed migration from `portfolio.js` when master tables are empty

## Run

    npm install
    PORT=3000 DATABASE_PATH=./data/portfolio.db npm start

## API

- `/healthz`
- `/api/view-model`
- `/api/storage`
- `/api/portfolio-quality`
- `/api/admin/domains`
- `/api/admin/services`
- `/api/admin/offerings`
- `/api/admin/products`
- `/api/admin/relationships`
- `/api/admin/audit`
- `/api/import/portfolio`
- `/api/export/portfolio`

## Persistence

Local SQLite data is stored at `./data/portfolio.db`. The Docker image uses `/data/portfolio.db`. Durable EasyDeploy persistence requires the platform to mount `/data` as persistent storage.
