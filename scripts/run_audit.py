import json, os, re, time, math, yaml
from pathlib import Path
from urllib.parse import quote_plus
import requests
from bs4 import BeautifulSoup
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
import spacy

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
DATA_DIR.mkdir(exist_ok=True)

# Load config
cfg = yaml.safe_load((ROOT / "scripts" / "config.yaml").read_text())
BRAND = cfg["brand"].strip()
CATEGORY = cfg["category"].strip()
WEBSITE = cfg["website"].strip()
MARKETS = cfg.get("markets", ["USA"])
QUERY_TEMPLATES = cfg.get("queries", [f"what is {BRAND}"])

UA = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    )
}

# NLP
nlp = spacy.load("en_core_web_sm")
sent = SentimentIntensityAnalyzer()

# ------------- Fetching helpers -------------

def fetch(url: str, *, timeout=12):
    r = requests.get(url, headers=UA, timeout=timeout)
    r.raise_for_status()
    return r


def fetch_google_serp(q: str) -> str:
    url = f"https://www.google.com/search?q={quote_plus(q)}&hl=en"
    r = fetch(url)
    return r.text


def parse_serp(html: str):
    """Parse top organic results title/url/snippet. Returns list[dict]."""
    soup = BeautifulSoup(html, "lxml")
    results = []
    seen = set()

    # Google uses various wrappers for organic results. Check a handful of
    # common containers and ensure we don't double-count the same URL.
    selectors = ["div.g", "div.MjjYud", "div.NJo7tc", "div.yuRUbf"]
    for sel in selectors:
        for g in soup.select(sel):
            a = g.select_one("a")
            h3 = g.select_one("h3")
            if not a or not h3:
                continue
            url = a.get("href")
            if not url or not url.startswith("http") or url in seen:
                continue
            desc_el = g.select_one("div.VwiC3b, div[data-sncf='1']")
            snippet = desc_el.get_text(" ", strip=True) if desc_el else ""
            results.append({
                "title": h3.get_text(" ", strip=True),
                "url": url,
                "snippet": snippet,
            })
            seen.add(url)

    # Fallback: sometimes results appear outside expected wrappers
    if not results:
        for a in soup.select("a h3"):
            parent = a.parent
            url = parent.get("href") if parent else None
            if not url or not url.startswith("http") or url in seen:
                continue
            results.append({
                "title": a.get_text(" ", strip=True),
                "url": url,
                "snippet": "",
            })
            seen.add(url)

    return results[:10]


# ------------- NLP helpers -------------

def entity_hits(text: str, target: str) -> int:
    doc = nlp(text)
    target_low = target.lower()
    hits = 0
    for ent in doc.ents:
        if ent.label_ in ("ORG", "PERSON", "PRODUCT", "WORK_OF_ART"):
            if target_low in ent.text.lower():
                hits += 1
    # fallback plain match
    if hits == 0 and target_low in text.lower():
        hits = 1
    return hits


def context_depth(text: str, target: str) -> int:
    m = re.search(re.escape(target), text, re.I)
    if not m:
        return 0
    start = max(0, m.start() - 140)
    end = min(len(text), m.end() + 140)
    window = text[start:end]
    doc = nlp(window)
    nouns = sum(1 for t in doc if t.pos_ in ("NOUN", "PROPN"))
    verbs = sum(1 for t in doc if t.pos_ == "VERB")
    return int(min(100, nouns + verbs))


def sentiment_score(text: str) -> float:
    return float(sent.polarity_scores(text)["compound"])  # -1..1


def competitor_names(text: str, target: str):
    doc = nlp(text)
    names = set()
    t_low = target.lower()
    for ent in doc.ents:
        if ent.label_ in ("ORG", "PRODUCT") and t_low not in ent.text.lower():
            names.add(ent.text.strip())
    return list(names)


# ------------- Site/off-site signal checks -------------

def has_schema_types(html: str, types=("Organization", "FAQPage", "Product", "SoftwareApplication")) -> bool:
    for t in types:
        if f'"@type":"{t}"' in html or f'\"@type\":\"{t}\"' in html:
            return True
    return False


def check_site_signals(website: str):
    out = {"organization_schema": False, "faq_schema": False, "hreflang": False,
           "location_pages": False, "faq_route": False}
    try:
        r = fetch(website)
        html = r.text
        out["organization_schema"] = has_schema_types(html, ("Organization",))
        out["faq_schema"] = has_schema_types(html, ("FAQPage",))
        out["hreflang"] = ("rel=\"alternate\"" in html or "hreflang=" in html)
        out["location_pages"] = any(x in html.lower() for x in ["locations", "offices", "hq", "contact"])
        # Try /faq path quickly
        try:
            f = fetch(website.rstrip("/") + "/faq")
            out["faq_route"] = (f.status_code == 200 and len(f.text) > 500)
        except Exception:
            pass
    except Exception:
        pass
    return out


def check_offsite(brand: str):
    base = quote_plus(brand)
    checks = {
        "wikipedia": f"https://en.wikipedia.org/wiki/{base}",
        "wikidata":  f"https://www.wikidata.org/wiki/Special:Search?search={base}",
        "g2":        f"https://www.g2.com/search?query={base}",
        "capterra":  f"https://www.capterra.com/search/?query={base}",
        "trustpilot":f"https://www.trustpilot.com/search?query={base}",
        "linkedin":  f"https://www.linkedin.com/search/results/companies/?keywords={base}",
        "crunchbase":f"https://www.crunchbase.com/discover/organization.companies/field/organizations/num_employees_enum/1?query={base}"
    }
    out = {}
    for k, u in checks.items():
        try:
            resp = fetch(u, timeout=10)
            out[k] = bool(resp.status_code == 200)
        except Exception:
            out[k] = False
        time.sleep(0.6)
    return out


# ------------- Query build -------------

def build_queries():
    Q = []
    for m in MARKETS:
        for tmpl in QUERY_TEMPLATES:
            q = tmpl.format(brand=BRAND, category=CATEGORY, market=m)
            Q.append({"market": m, "q": q})
    return Q


# ------------- Scoring -------------

def compute_scores_by_market(queries):
    scores = {}
    comp_counts_global = {}

    # Group by market
    markets = {}
    for item in queries:
        markets.setdefault(item["market"], []).append(item["q"])

    for market, qs in markets.items():
        q_rows = []
        comp_counts = {}
        for q in qs:
            html = fetch_google_serp(q)
            results = parse_serp(html)
            time.sleep(2)  # polite pause
            mentions = 0
            ctx_scores, sent_scores = [], []
            for r in results:
                text = " ".join([r["title"], r["snippet"]])
                if entity_hits(text, BRAND):
                    mentions += 1
                    ctx_scores.append(context_depth(text, BRAND))
                    sent_scores.append(sentiment_score(text))
                    for c in competitor_names(text, BRAND):
                        comp_counts[c] = comp_counts.get(c, 0) + 1
                        comp_counts_global[c] = comp_counts_global.get(c, 0) + 1
            rec = mentions / len(results) if results else 0.0
            ctx = (sum(ctx_scores) / len(ctx_scores)) if ctx_scores else 0.0
            snt = (sum(sent_scores) / len(sent_scores)) if sent_scores else 0.0
            q_rows.append({
                "query": q,
                "recognition": round(rec, 3),
                "context_depth": round(ctx, 2),
                "sentiment": round(snt, 3),
                "mentions": mentions,
            })
        total = len(q_rows) or 1
        recog = sum(r["recognition"] for r in q_rows) / total
        avg_ctx = sum(r["context_depth"] for r in q_rows) / total
        avg_snt = sum(r["sentiment"] for r in q_rows) / total
        brand_mentions = sum(r["mentions"] for r in q_rows)
        rival_mentions = max(comp_counts.values()) if comp_counts else 0
        comp_pos = 1.0 if rival_mentions == 0 else min(1.0, brand_mentions / (rival_mentions * 1.0))

        scores[market] = {
            "recognition_pct": round(recog * 100, 1),
            "context_avg": round(avg_ctx, 1),
            "sentiment_pct": round(((avg_snt + 1) / 2 * 100), 1),  # -1..1 -> 0..100
            "competitive_pct": round(comp_pos * 100, 1),
            "mentions": int(brand_mentions),
            "queries": q_rows,
            "competitors": sorted(comp_counts.items(), key=lambda x: x[1], reverse=True)[:8],
        }

    top_competitors = sorted(comp_counts_global.items(), key=lambda x: x[1], reverse=True)[:8]
    return scores, top_competitors


def weighted_overall(scores_by_market):
    # simple average across markets
    if not scores_by_market:
        return 0.0, {"recognition_pct":0, "context_avg":0, "sentiment_pct":0, "competitive_pct":0}
    rec = sum(m["recognition_pct"] for m in scores_by_market.values()) / len(scores_by_market)
    ctx = sum(m["context_avg"] for m in scores_by_market.values()) / len(scores_by_market)
    snt = sum(m["sentiment_pct"] for m in scores_by_market.values()) / len(scores_by_market)
    cmp = sum(m["competitive_pct"] for m in scores_by_market.values()) / len(scores_by_market)
    score = 0.40 * rec + 0.20 * ctx + 0.20 * snt + 0.20 * cmp
    return round(score, 1), {
        "recognition_pct": round(rec, 1),
        "context_avg": round(ctx, 1),
        "sentiment_pct": round(snt, 1),
        "competitive_pct": round(cmp, 1),
    }


# ------------- Recommendations -------------

def make_recommendations(site, offsite, scores_by_market, top_comp):
    recs = []
    def add(t, p, a):
        recs.append({"type": t, "priority": p, "action": a})

    # Global site hygiene
    if not site.get("organization_schema"):
        add("schema", "high", "Add Organization JSON-LD on homepage with name, URL, logo, and sameAs links to LinkedIn, G2, Crunchbase.")
    if not site.get("faq_schema"):
        add("schema", "medium", "Publish /faq with 12–20 real buyer Q&As and add FAQPage JSON-LD.")
    if len(scores_by_market) > 1 and not site.get("hreflang"):
        add("i18n", "medium", "Implement hreflang for target markets and a /locations hub with country sections.")
    if not site.get("faq_route"):
        add("content", "medium", "Create /faq route and link it from header or footer.")

    # Off-site profiles
    if not offsite.get("wikipedia"):
        add("citations", "medium", "Create neutral Wikipedia page with third‑party press citations and matching Wikidata entry.")
    for k in ("g2", "capterra", "trustpilot"):
        if not offsite.get(k):
            add("reviews", "high", f"Stand up a {k.upper()} profile and collect 15+ verified reviews. Reply to each.")

    # Market specifics
    for m, s in scores_by_market.items():
        if s["recognition_pct"] < 40:
            add("content", "high", f"{m}: Publish 5 problem‑led pages and 15 short Q&A snippets targeting '{CATEGORY}' queries in {m}. Add a local case study.")
        if s["competitive_pct"] < 60:
            comp = (top_comp[0][0] if top_comp else "top competitor")
            add("comparison", "medium", f"{m}: Build '{BRAND} vs {comp}' and 'Best {CATEGORY} in {m}' pages with a simple buyers guide.")
        if s["sentiment_pct"] < 60:
            add("reputation", "medium", f"{m}: Run a reviews drive. Publish 3 named customer stories with outcomes and logos.")

    # 90‑day plan grouping
    plan = {
        "High": [r for r in recs if r["priority"] == "high"][:10],
        "Medium": [r for r in recs if r["priority"] == "medium"][:10],
        "Low": [r for r in recs if r["priority"] == "low"][:10],
    }
    return recs, plan


# ------------- Main -------------
if __name__ == "__main__":
    queries = build_queries()

    # Scores
    scores_by_market, top_competitors = compute_scores_by_market(queries)
    overall_score, overall_breakdown = weighted_overall(scores_by_market)

    # Signals
    site_signals = check_site_signals(WEBSITE)
    offsite_signals = check_offsite(BRAND)

    # Recommendations
    recommendations, next_90_days_plan = make_recommendations(
        site_signals, offsite_signals, scores_by_market, top_competitors
    )

    report = {
        "brand": BRAND,
        "category": CATEGORY,
        "website": WEBSITE,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "score_overall": overall_score,
        "breakdown_overall": overall_breakdown,
        "scores_by_market": scores_by_market,
        "top_competitors": top_competitors,
        "site_signals": site_signals,
        "offsite_signals": offsite_signals,
        "recommendations": recommendations,
        "next_90_days_plan": next_90_days_plan,
        "sources_note": "SERP parsed from public Google HTML. Keep volume low. Respect robots.txt if you expand crawling.",
        "version": "1.0.0"
    }

    (DATA_DIR / "report.json").write_text(json.dumps(report, indent=2))
    print("Wrote data/report.json")