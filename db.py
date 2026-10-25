"""Tiny SQLite persistence layer for scan jobs."""
import json, os, sqlite3, threading
from contextlib import closing
from pathlib import Path

PATH = os.getenv("DB_PATH", str(Path(__file__).with_name("competitorx.db")))
_lock = threading.Lock()


def _q(sql, args=(), fetch=False):
    with _lock, closing(sqlite3.connect(PATH)) as c:
        c.row_factory = sqlite3.Row
        cur = c.execute(sql, args)
        rows = cur.fetchall() if fetch else None
        c.commit()
        return rows


def init():
    _q("""CREATE TABLE IF NOT EXISTS jobs(
        id TEXT PRIMARY KEY, title TEXT, at INTEGER, status TEXT,
        progress INTEGER DEFAULT 0, mode TEXT, data TEXT, error TEXT)""")


def _row(r):
    return {"id": r["id"], "t": r["title"], "at": r["at"], "status": r["status"],
            "progress": r["progress"], "mode": r["mode"], "error": r["error"],
            "data": json.loads(r["data"]) if r["data"] else []}


def create(id, title, at, mode):
    _q("INSERT INTO jobs(id,title,at,status,progress,mode) VALUES(?,?,?,?,?,?)",
       (id, title, at, "running", 0, mode))


def update(id, **kw):
    if "data" in kw:
        kw["data"] = json.dumps(kw["data"])
    cols = ", ".join(f"{k}=?" for k in kw)
    _q(f"UPDATE jobs SET {cols} WHERE id=?", (*kw.values(), id))


def get(id):
    r = _q("SELECT * FROM jobs WHERE id=?", (id,), True)
    return _row(r[0]) if r else None


def list_jobs(limit=100):
    return [_row(r) for r in _q("SELECT * FROM jobs ORDER BY at DESC LIMIT ?", (limit,), True)]


def delete(id):
    _q("DELETE FROM jobs WHERE id=?", (id,))
