"""CompetitorX API + static frontend.   Run:  uvicorn main:app --port 8000"""
import asyncio, csv, io, re, time, uuid
from pathlib import Path

from dotenv import load_dotenv
load_dotenv(Path(__file__).with_name(".env"))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import db, engine

FRONT = Path(__file__).resolve().parent.parent / "frontend"
app = FastAPI(title="CompetitorX API", version="1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
TASKS: set = set()
DOMAIN = re.compile(r"^(?=.{4,253}$)([a-z0-9-]+\.)+[a-z]{2,}$")


@app.on_event("startup")
def _startup():
    db.init()


def norm(u: str) -> str:
    return re.split(r"[/?#]", re.sub(r"^www\.", "", re.sub(r"^https?://", "", u.strip().lower())))[0]


class NewJob(BaseModel):
    urls: list[str]


async def run_job(id: str, domains: list[str]):
    try:
        data = await engine.scan(domains, lambda n: db.update(id, progress=n))
        db.update(id, status="done", progress=4, data=data, mode=engine.mode())
    except Exception as e:  # surfaced to the UI
        db.update(id, status="error", error=str(e)[:400])


@app.get("/api/health")
def health():
    return {"ok": True, "mode": engine.mode()}


@app.post("/api/jobs")
async def create_job(body: NewJob):
    ds = list(dict.fromkeys(norm(u) for u in body.urls if u.strip()))
    if not 2 <= len(ds) <= 3:
        raise HTTPException(422, "Provide 2 or 3 different websites.")
    bad = [d for d in ds if not DOMAIN.match(d)]
    if bad:
        raise HTTPException(422, "Invalid domain(s): " + ", ".join(bad))
    id = uuid.uuid4().hex[:12]
    db.create(id, " vs ".join(ds), int(time.time() * 1000), engine.mode())
    t = asyncio.create_task(run_job(id, ds)); TASKS.add(t); t.add_done_callback(TASKS.discard)
    return {"id": id}


@app.get("/api/jobs")
def jobs():
    return db.list_jobs()


def _job(id):
    j = db.get(id)
    if not j:
        raise HTTPException(404, "Job not found")
    return j


@app.get("/api/jobs/{id}")
def job(id: str):
    return _job(id)


@app.delete("/api/jobs/{id}")
def delete(id: str):
    _job(id); db.delete(id); return {"ok": True}


@app.get("/api/jobs/{id}/export.md", response_class=PlainTextResponse)
def export_md(id: str):
    cs = _job(id)["data"]
    L = [f"# {' vs '.join(c['n'] for c in cs)}", "", "| Capability | " + " | ".join(c["n"] for c in cs) + " |",
         "|---|" + "---|" * len(cs)]
    for k, f in enumerate(engine.FEATS):
        L.append(f"| {f} | " + " | ".join("✓ Verified" if c["f"][k] else "Not found (unknown)" for c in cs) + " |")
    L += ["", "## Pricing"] + [f"**{c['n']}**: " + ", ".join(f"{p[0]} {p[1] if p[1] is not None else 'Contact sales'}" for p in c["pl"]) for c in cs]
    return "\n".join(L)


@app.get("/api/jobs/{id}/export.csv", response_class=PlainTextResponse)
def export_csv(id: str):
    cs = _job(id)["data"]; buf = io.StringIO(); w = csv.writer(buf)
    w.writerow(["Capability"] + [c["n"] for c in cs])
    for k, f in enumerate(engine.FEATS):
        w.writerow([f] + ["Verified" if c["f"][k] else "Not found (unknown)" for c in cs])
    return buf.getvalue()


app.mount("/", StaticFiles(directory=FRONT, html=True), name="ui")  # must stay last
