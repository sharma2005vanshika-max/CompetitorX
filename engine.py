"""Scan engine.
LIVE  mode: pulls public pages through the TinyFish Fetch API (needs TINYFISH_API_KEY) and extracts
            features / pricing / audience with transparent keyword heuristics. Every feature carries
            the source URL + the sentence it was found in. Not found => "unknown", never "absent".
DEMO  mode: deterministic sample data so the app works with zero setup.
"""
import asyncio, hashlib, os, random, re
import httpx

FEATS = ["AI / machine learning", "Automation / workflows", "Analytics & reporting", "API & webhooks",
         "Collaboration", "Mobile apps", "SSO / SAML", "Security certifications", "Templates",
         "White-label / custom branding", "Priority / 24-7 support", "Free plan or trial"]
KW = [r"\b(ai|machine learning|copilot|llm)\b", r"automat|workflow|trigger", r"analytic|report|dashboard",
      r"\bapi\b|webhook", r"collaborat|real-time|together", r"mobile app|\bios\b|android",
      r"\bsso\b|saml|single sign", r"soc ?2|iso ?27001|hipaa|gdpr", r"template",
      r"white.?label|custom brand", r"priority support|24.?7|dedicated support",
      r"free (plan|forever|trial)|start for free|try .{0,12}free"]
INTEG = ["Slack", "Jira", "GitHub", "Notion", "Microsoft Teams", "Asana", "Figma", "Google Drive", "Zapier",
         "Salesforce", "HubSpot", "Zoom", "Dropbox", "Mailchimp", "Shopify", "Stripe", "Confluence", "Trello"]
PERSONAS = {"Enterprises": r"enterprise", "Startups": r"startup", "Product teams": r"product team",
            "Engineering teams": r"engineering", "Developers": r"developer", "Small businesses": r"small business",
            "Design teams": r"design(er|ers| team)", "Marketing teams": r"marketing", "Sales teams": r"sales team"}
PLAN = r"Free|Starter|Basic|Plus|Standard|Pro|Professional|Team|Teams|Business|Premium|Growth|Organization|Enterprise"

# name, icon, headline, per-seat price, plans, feature indexes NOT shown, integrations, personas
P = {
 "notion.so": ("Notion", "📓", "The connected workspace where better, faster work happens", None, [["Free", 0], ["Plus", 10], ["Business", 18], ["Enterprise", None]], [2], ["Slack", "Jira", "GitHub", "Figma", "Asana", "Microsoft Teams"], ["Enterprises", "Startups", "Product teams"]),
 "coda.io": ("Coda", "🟥", "The all-in-one collaborative doc for modern teams", 12, [["Free", 0], ["Pro", 12], ["Team", 36], ["Enterprise", None]], [7, 9], ["Slack", "HubSpot", "Google Drive", "Mailchimp", "Dropbox"], ["Enterprises", "Product teams"]),
 "linear.app": ("Linear", "🔷", "The system for modern product development", 8, [["Free", 0], ["Standard", 8], ["Plus", 14], ["Enterprise", None]], [9], ["GitHub", "Slack", "Figma"], ["Startups", "Engineering teams"]),
 "jira.atlassian.com": ("Jira", "🟦", "Plan, track, and ship with any team", 8.15, [["Free", 0], ["Standard", 8.15], ["Premium", 16], ["Enterprise", None]], [], ["Confluence", "GitHub", "Slack", "Zoom"], ["Enterprises", "Engineering teams"]),
 "slack.com": ("Slack", "💬", "Where work happens", 8.75, [["Free", 0], ["Pro", 8.75], ["Business+", 15], ["Enterprise Grid", None]], [9], ["Salesforce", "Google Drive", "Zoom", "Asana"], ["Enterprises", "Sales teams"]),
 "discord.com": ("Discord", "🎮", "Your place to talk and hang out", None, [["Free", 0], ["Nitro Basic", 2.99], ["Nitro", 9.99]], [6, 7, 10], ["GitHub", "Zoom"], ["Developers", "Startups"]),
 "stripe.com": ("Stripe", "💳", "Financial infrastructure to grow your revenue", None, [["Pay as you go", "2.9% + 30¢"], ["Custom", None]], [5, 9], ["Shopify", "Salesforce", "Zapier"], ["Developers", "Startups", "Enterprises"]),
 "adyen.com": ("Adyen", "🟩", "One platform for payments, data and financial products", None, [["Interchange++", "Custom"], ["Enterprise", None]], [8, 9, 11], ["Salesforce", "Shopify"], ["Enterprises"]),
 "supabase.com": ("Supabase", "⚡", "Build in a weekend, scale to millions", 25, [["Free", 0], ["Pro", 25], ["Team", 599], ["Enterprise", None]], [5, 9], ["GitHub", "Zapier"], ["Developers", "Startups"]),
 "firebase.google.com": ("Firebase", "🔥", "Google's app development platform", None, [["Spark", 0], ["Blaze", "Pay as you go"]], [9], ["Google Drive"], ["Developers", "Startups"]),
 "figma.com": ("Figma", "🎨", "How modern teams design together", 15, [["Starter", 0], ["Professional", 15], ["Organization", 45], ["Enterprise", 75]], [], ["Slack", "Jira", "GitHub", "Notion", "Asana", "Microsoft Teams"], ["Enterprises", "Design teams"]),
 "canva.com": ("Canva", "🖌️", "What will you design today?", 12.99, [["Free", 0], ["Pro", 12.99], ["Teams", 100], ["Enterprise", None]], [3, 6], ["Slack", "HubSpot", "Google Drive", "Mailchimp", "Dropbox"], ["Small businesses", "Marketing teams"]),
}


def mode():
    return "live" if os.getenv("TINYFISH_API_KEY") else "demo"


def _pages(d, title):
    return [["HOME", title, f"https://{d}/"], ["PRICING", f"{d} Pricing", f"https://{d}/pricing"],
            ["FEATURES", f"{d} Features & Integrations", f"https://{d}/product"]]


def demo_company(d):
    p = P.get(d)
    r = random.Random(int(hashlib.md5(d.encode()).hexdigest()[:8], 16))
    name = p[0] if p else d.split(".")[0].capitalize()
    seat = p[3] if p else round(5 + r.random() * 18, 2)
    plans = p[4] if p else [["Free", 0], ["Pro", seat], ["Business", round(seat * 2.2, 2)], ["Enterprise", None]]
    head = p[2] if p else f"The {name} platform for modern teams"
    return {"d": d, "n": name, "i": p[1] if p else "🌐", "h": head, "s": seat, "pl": plans,
            "f": [(k not in p[5]) if p else r.random() > .3 for k in range(len(FEATS))],
            "ig": p[6] if p else r.sample(INTEG, 4), "pe": p[7] if p else ["Startups", "Product teams"],
            "pages": _pages(d, f"{name} — {head}"), "ev": None}


# ---------------------------------------------------------------- live (TinyFish)
async def tf_fetch(urls):
    async with httpx.AsyncClient(timeout=150) as c:
        r = await c.post("https://api.fetch.tinyfish.ai",
                         headers={"X-API-Key": os.environ["TINYFISH_API_KEY"]},
                         json={"urls": urls, "format": "markdown", "ttl": 3600, "per_url_timeout_ms": 60000,
                               "purpose": "Competitive analysis: product features, pricing tiers and target audience"})
    if r.status_code == 401:
        raise RuntimeError("TinyFish rejected the API key (401). Check TINYFISH_API_KEY.")
    if r.status_code == 402:
        raise RuntimeError("TinyFish daily free allowance is used up (402). Try again after 00:00 UTC.")
    if r.status_code == 429:
        raise RuntimeError("TinyFish rate limit hit (429). Wait a minute and retry.")
    r.raise_for_status()
    return r.json()


def _snip(t, m):
    s = t[max(0, m.start() - 100): m.end() + 120]
    return re.sub(r"\s+", " ", re.sub(r"[#*_`>\[\]]", " ", s)).strip()


def _plans(text):
    out, seen = [], set()
    for m in re.finditer(rf"(?i)\b({PLAN})\b([^\n]{{0,80}})", text):
        name, rest = m.group(1).title(), m.group(2)
        if name in seen:
            continue
        pm = re.search(r"\$\s?(\d+(?:\.\d+)?)", rest)
        if pm:
            v = float(pm.group(1)); price = int(v) if v == int(v) else v
        elif name == "Free":
            price = 0
        elif name == "Enterprise" or re.search(r"(?i)contact|custom", rest):
            price = None
        else:
            continue
        seen.add(name); out.append([name, price])
    return out[:5]


async def live_company(d):
    base = f"https://{d}"
    data = await tf_fetch([base + "/", base + "/pricing", base + "/product", base + "/features"])
    got = {r["url"]: r for r in data.get("results", [])}
    if base + "/" not in got:
        err = (data.get("errors") or [{}])[0].get("error", "unknown error")
        raise RuntimeError(f"Could not fetch {d} ({err}). The site may block crawlers or require login.")
    labels = {"/": "HOME", "/pricing": "PRICING", "/product": "FEATURES", "/features": "FEATURES"}
    pages = [(labels[u[len(base):]], u, r.get("title") or u, r.get("text") or "") for u, r in got.items()]
    home = got[base + "/"]
    title = home.get("title") or d
    head = (home.get("description") or title).strip()
    first = re.split(r"\s[|\-–—:]\s", title)[0].strip()
    name = first if 0 < len(first) <= 24 else d.split(".")[0].capitalize()
    order = sorted(pages, key=lambda p: {"FEATURES": 0, "HOME": 1, "PRICING": 2}[p[0]])
    allt = " ".join(p[3] for p in pages)
    f, ev = [], []
    for rx in KW:
        hit = None
        for _, url, _, text in order:
            m = re.search(rx, text, re.I)
            if m:
                hit = [_snip(text, m), url]; break
        f.append(bool(hit)); ev.append(hit)
    ptxt = " ".join(p[3] for p in pages if p[0] == "PRICING") or allt
    plans = _plans(ptxt)
    seat = next((p[1] for p in plans if isinstance(p[1], (int, float)) and p[1] > 0), None)
    ig = [x for x in INTEG if re.search(rf"\b{re.escape(x)}\b", allt)][:8]
    pe = sorted(((len(re.findall(rx, allt, re.I)), k) for k, rx in PERSONAS.items()), reverse=True)
    return {"d": d, "n": name, "i": "🌐", "h": head[:160], "s": seat, "pl": plans, "f": f, "ig": ig,
            "pe": [k for n, k in pe if n][:3] or ["General teams"],
            "pages": [[l, t[:70], u] for l, u, t, _ in pages], "ev": ev}


async def scan(domains, on_step=lambda n: None):
    on_step(1)
    if mode() == "live":
        on_step(2)
        out = await asyncio.gather(*[live_company(d) for d in domains])
    else:
        for n in (2, 3):
            await asyncio.sleep(0.9); on_step(n)
        out = [demo_company(d) for d in domains]
    on_step(3)
    return list(out)
