# CompetitorX – AI Competitive Intelligence

Compare 2–3 public websites: feature matrix, pricing/TCO, battlecards, insights, and a page-level evidence audit.
Every claim links to its source; "not found" means **unknown**, never "absent".

```
competitorx/
├── backend/
│   ├── main.py            FastAPI app: REST API + serves the frontend
│   ├── engine.py          Scan engine: LIVE (TinyFish Fetch API) or DEMO (sample data)
│   ├── db.py              SQLite storage for scan history
│   ├── requirements.txt
│   └── .env.example       copy to .env and add TINYFISH_API_KEY
├── frontend/
│   ├── index.html · styles.css · app.js      (no build step)
├── run.sh / run.bat       one-command launchers (macOS·Linux / Windows)
└── Dockerfile
```

## Run it

| Platform | Command |
|---|---|
| macOS / Linux | `./run.sh` |
| Windows | double-click `run.bat` |
| Docker (any OS) | `docker build -t competitorx . && docker run -p 8000:8000 -v cx:/data competitorx` |

Needs Python 3.10+. Then open **http://localhost:8000**.

### Live scans with TinyFish
1. Create a key at TinyFish and put it in `backend/.env`: `TINYFISH_API_KEY=...`
2. Restart. The top-bar pill changes to **Live engine · TinyFish**.

Live mode fetches `/`, `/pricing`, `/product`, `/features` of each site, then extracts features, plans, integrations and
audience with keyword heuristics (see `engine.py`). Without a key it runs in demo mode with sample data.
Fetch is free up to 1,000 URLs/day (4 per site per scan). Sites that block bots or need login return a clear error.

### Frontend only
Opening `frontend/index.html` directly (file://) still works: it uses the demo engine and stores history in the browser.

## API
| Method | Path | |
|---|---|---|
| GET | `/api/health` | `{ok, mode}` |
| POST | `/api/jobs` | body `{"urls":["notion.so","coda.io"]}` → `{id}` (runs in background) |
| GET | `/api/jobs` · `/api/jobs/{id}` | list / status (`running`·`done`·`error`) + results |
| DELETE | `/api/jobs/{id}` | delete |
| GET | `/api/jobs/{id}/export.md` · `export.csv` | downloads |

Interactive docs: http://localhost:8000/docs

## Known limits
- Live extraction is heuristic: always verify important findings via the linked source.
- Pricing pages built with heavy JS toggles may yield partial plans.
- No auth: put it behind a login/reverse proxy before exposing it publicly.
