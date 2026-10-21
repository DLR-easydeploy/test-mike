# Enterprise Services Portfolio Command Center

Features:
- Management Command Center and attention view
- Domain comparison
- Domain → Service → Offering heatmap
- Portfolio Health
- Assessment Workspace and history
- SQLite-backed assessments
- Persistent Action Register with status updates
- Offering/product drill-through
- Data-quality controls
- Full JSON portfolio backup

Local run:

    npm install
    PORT=3000 DATABASE_PATH=./data/portfolio.db npm start

Useful endpoints:
- /healthz
- /api/summary
- /api/storage
- /api/actions
- /api/export/assessments
- /api/export/portfolio

The Docker image writes SQLite to /data/portfolio.db. Durable EasyDeploy persistence requires /data to be mounted to persistent platform storage. Keep easydeploy.yaml unchanged unless the EasyDeploy platform team supplies an approved persistence configuration.
