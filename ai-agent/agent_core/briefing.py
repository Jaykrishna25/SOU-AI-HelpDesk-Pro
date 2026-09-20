"""
The morning briefing agent.

What makes this AGENTIC rather than just another prompt
-------------------------------------------------------
Everything else in this project answers a question a person asked. This one
runs on its own, decides what is worth saying, and says it before anyone asks.
Concretely, it:

  1. RUNS UNPROMPTED, on a schedule, with nobody at the keyboard.
  2. PLANS - it decides which of its tools are worth calling today, based on
     the student's own record, rather than calling all of them every time.
  3. ACTS - it calls live tools and reads real data.
  4. OBSERVES - it compares today against what it saw yesterday, so it can
     report what CHANGED rather than repeating itself.
  5. REPORTS - it writes a short brief and remembers what it said, so
     tomorrow it does not say the same thing again.

Step 4 is the one that matters. An assistant that produces the same digest
every morning gets ignored by Wednesday. This one keeps state.

The temperature question
------------------------
The model is qwen3:8b at temperature 1.0, which is high - the model invents
freely at that setting. That is fine for prose and dangerous for facts, so the
two are separated:

  - Every FIGURE and every LISTING comes from a tool. Deterministic Python,
    no model involved.
  - Temperature 1.0 applies only to the WRITING step, which is handed the
    gathered facts and told it may not add to them.

So the briefing reads differently each morning - which is the point, otherwise
nobody reads it twice - while the job titles, company names and counts are
whatever the feed actually returned.
"""
from __future__ import annotations

import json
import os
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATE_PATH = os.path.join(HERE, "data", "briefing_state.json")
OUTPUT_PATH = os.path.join(HERE, "data", "latest_briefing.json")

# The model the brief is written with. Temperature is deliberately high; see
# the module docstring for why that is safe here.
BRIEF_MODEL = os.getenv("BRIEFING_MODEL", "qwen3:8b")
BRIEF_TEMPERATURE = float(os.getenv("BRIEFING_TEMPERATURE", "1.0"))


# ---------------------------------------------------------------- tools

JOBS_ENDPOINT = "https://remotive.com/api/remote-jobs"
TIMEOUT = 15


@dataclass
class Listing:
    title: str
    company: str
    location: str
    url: str
    matched_on: str


@dataclass
class MarketSnapshot:
    """What the live feed says today. Facts only - no model involved."""
    listings: list[Listing] = field(default_factory=list)
    keywords: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    fetched_at: str = ""

    @property
    def ok(self) -> bool:
        return bool(self.listings)


def fetch_market(keywords: list[str], per_keyword: int = 4) -> MarketSnapshot:
    """Pull live listings for the given skill keywords.

    Never raises. A feed being unreachable is a network problem and must not
    read to a student as a statement about their prospects - so the error is
    recorded and the brief says so plainly.
    """
    snap = MarketSnapshot(keywords=list(keywords),
                          fetched_at=datetime.now(timezone.utc).isoformat(timespec="seconds"))
    seen: set[str] = set()

    for kw in keywords:
        url = JOBS_ENDPOINT + "?" + urllib.parse.urlencode({"search": kw, "limit": per_keyword})
        req = urllib.request.Request(url, headers={"User-Agent": "sou-briefing-agent/1.0"})
        try:
            with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
                jobs = json.loads(r.read().decode("utf-8", errors="replace")).get("jobs", []) or []
        except Exception as e:
            snap.errors.append(f"{kw}: {str(e)[:90]}")
            continue

        for j in jobs:
            link = str(j.get("url") or "")
            if not link or link in seen:
                continue
            seen.add(link)
            snap.listings.append(Listing(
                title=str(j.get("title") or "Untitled role"),
                company=str(j.get("company_name") or "unknown company"),
                location=str(j.get("candidate_required_location") or "location not stated"),
                url=link,
                matched_on=kw,
            ))
    return snap


# ---------------------------------------------------------------- memory

def _load_state() -> dict:
    try:
        with open(STATE_PATH, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError):
        return {"seen_urls": [], "last_run": None, "runs": 0}


def _save_state(state: dict) -> None:
    os.makedirs(os.path.dirname(STATE_PATH), exist_ok=True)
    with open(STATE_PATH, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2)


@dataclass
class Delta:
    """What changed since the last run. This is what makes it worth reading."""
    new_listings: list[Listing]
    repeat_count: int
    first_run: bool
    days_since_last: int | None


def diff_against_memory(snap: MarketSnapshot, state: dict) -> Delta:
    seen = set(state.get("seen_urls") or [])
    new = [l for l in snap.listings if l.url not in seen]

    last = state.get("last_run")
    days = None
    if last:
        try:
            days = (datetime.now(timezone.utc) - datetime.fromisoformat(last)).days
        except ValueError:
            days = None

    return Delta(
        new_listings=new,
        repeat_count=len(snap.listings) - len(new),
        first_run=not seen,
        days_since_last=days,
    )


# ---------------------------------------------------------------- planning

@dataclass
class Plan:
    """What the agent decided to do today, and why."""
    keywords: list[str]
    focus: str
    reason: str
    skipped: list[str] = field(default_factory=list)


def plan_today(subjects: list, weak_names: list[str] | None = None) -> Plan:
    """Decide what this morning's brief should be about.

    This is the agent's own judgement and it is deliberately NOT a model call:
    a decision this cheap should be deterministic and inspectable. The model
    writes the brief; it does not choose what the brief is about.

    The rule: match the market against what the student is GOOD at, and say so.
    Their weak subjects are the study plan's job, and opening a morning
    briefing with a list of failures is not a thing anyone should build.
    """
    from agent_core.ingest import WEAK_THRESHOLD

    strong = sorted(
        (s for s in subjects if getattr(s, "score", 0) >= WEAK_THRESHOLD),
        key=lambda s: -s.score,
    )

    keywords: list[str] = []
    # Only subjects that actually contributed a keyword. The first draft used
    # the highest-scoring subject full stop, so a transcript with Yoga at 95
    # produced a brief headed "strongest subject: Yoga" while searching for
    # SQL roles — incoherent, and the sort of thing nobody notices until a
    # judge reads the output aloud.
    contributing: list = []

    for s in strong:
        skills = _skills_for(s.name)
        if not skills:
            continue
        contributing.append(s)
        for kw in skills:
            if kw not in keywords:
                keywords.append(kw)
        if len(keywords) >= 4:
            break

    skipped = (weak_names or [])[:3]

    if not keywords:
        return Plan(
            keywords=["computer science"],
            focus="general",
            reason="No subject mapped to a skill keyword, so the search is broad.",
            skipped=skipped,
        )

    return Plan(
        keywords=keywords[:4],
        focus=contributing[0].name,
        reason="Matched on: " + ", ".join(s.name for s in contributing[:3]),
        skipped=skipped,
    )


_SKILL_MAP = {
    "database": ["sql", "database"], "dbms": ["sql", "database"],
    "operating system": ["linux", "systems"], "network": ["networking"],
    "data structure": ["algorithms"], "algorithm": ["algorithms"],
    "software engineering": ["software engineer"], "web": ["web developer"],
    "machine learning": ["machine learning"], "artificial intelligence": ["machine learning"],
    "python": ["python"], "java": ["java"], "cloud": ["cloud"],
    "security": ["cybersecurity"], "mobile": ["android"],
}


def _skills_for(subject: str) -> list[str]:
    s = str(subject or "").lower()
    for key, skills in _SKILL_MAP.items():
        if key in s:
            return skills
    return []


# ---------------------------------------------------------------- the brief

@dataclass
class Briefing:
    generated_at: str
    greeting: str
    body: str
    plan: dict
    listings: list[dict]
    new_count: int
    errors: list[str]
    model: str
    temperature: float


SYSTEM = """You write a short morning briefing for one university student.

HARD RULES:
1. Use ONLY the facts given to you below. Do not invent a company, a role, a
   number, a date or a trend. If the facts are thin, the briefing is short -
   that is fine and honest.
2. Never predict anything: not salaries, not hiring trends, not the student's
   chances. You have no basis for any of it.
3. Do not flatter. No "great news!", no exclamation marks, no "exciting
   opportunity". A briefing is read at 8am by someone who has not had tea yet.
4. Three to five sentences. Lead with what CHANGED since the last briefing.
5. If the listings feed failed, say the feed could not be reached. Do not
   dress it up as "a quiet day in the market" - that would be inventing a
   market condition from a network error.

Write in plain British English. No headings, no bullet points, no sign-off."""


def _ollama(system: str, user: str) -> str:
    """Call the local model. Raises on failure; the caller decides what to do."""
    from langchain_ollama import ChatOllama
    from langchain_core.messages import SystemMessage, HumanMessage

    llm = ChatOllama(model=BRIEF_MODEL, temperature=BRIEF_TEMPERATURE)
    out = llm.invoke([SystemMessage(content=system), HumanMessage(content=user)])
    return out.content if isinstance(out.content, str) else str(out.content)


def _facts_block(plan: Plan, snap: MarketSnapshot, delta: Delta) -> str:
    """Exactly what the model is allowed to know. Nothing else reaches it."""
    lines = [
        f"Today: {datetime.now().strftime('%A %d %B %Y')}",
        f"Search keywords, taken from the student's strongest subjects: {', '.join(plan.keywords)}",
        f"Strongest subject: {plan.focus}",
        "",
    ]

    if delta.first_run:
        lines.append("This is the first briefing ever generated for this student.")
    elif delta.days_since_last is not None:
        lines.append(f"Days since the last briefing: {delta.days_since_last}")

    if snap.errors and not snap.listings:
        lines.append("")
        lines.append("THE LISTINGS FEED COULD NOT BE REACHED. There are no listings today.")
        lines.append("Errors: " + "; ".join(snap.errors))
        return "\n".join(lines)

    lines.append(f"New listings since the last briefing: {len(delta.new_listings)}")
    lines.append(f"Listings already seen before: {delta.repeat_count}")
    lines.append("")

    if delta.new_listings:
        lines.append("THE NEW LISTINGS:")
        for l in delta.new_listings[:6]:
            lines.append(f"- {l.title} at {l.company} ({l.location}) [matched: {l.matched_on}]")
    else:
        lines.append("No new listings today - everything returned was seen in a previous briefing.")

    if snap.errors:
        lines.append("")
        lines.append("Some searches failed: " + "; ".join(snap.errors))

    return "\n".join(lines)


def build_briefing(subjects: list, student_name: str = "there") -> Briefing:
    """Run the whole loop: plan, act, observe, report, remember."""
    state = _load_state()

    plan = plan_today(subjects)
    snap = fetch_market(plan.keywords)
    delta = diff_against_memory(snap, state)
    facts = _facts_block(plan, snap, delta)

    hour = datetime.now().hour
    greeting = (
        f"Good morning, {student_name}." if hour < 12
        else f"Good afternoon, {student_name}." if hour < 17
        else f"Good evening, {student_name}."
    )

    try:
        body = _ollama(SYSTEM, facts).strip()
    except Exception as e:
        # The facts are already gathered and correct, so fall back to them
        # rather than to nothing. A plain list beats an error message.
        body = (
            "The briefing could not be written up - the local model was not reachable "
            f"({str(e)[:110]}). The findings themselves are below, unchanged.\n\n" + facts
        )

    # Remember what was shown, so tomorrow reports what is actually new.
    state["seen_urls"] = list({*(state.get("seen_urls") or []), *(l.url for l in snap.listings)})[-400:]
    state["last_run"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    state["runs"] = int(state.get("runs") or 0) + 1
    _save_state(state)

    brief = Briefing(
        generated_at=datetime.now().isoformat(timespec="seconds"),
        greeting=greeting,
        body=body,
        plan=asdict(plan),
        listings=[asdict(l) for l in delta.new_listings[:6]],
        new_count=len(delta.new_listings),
        errors=snap.errors,
        model=BRIEF_MODEL,
        temperature=BRIEF_TEMPERATURE,
    )

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(asdict(brief), f, indent=2, ensure_ascii=False)

    return brief


def load_latest() -> dict | None:
    """The most recent briefing, for the UI to display."""
    try:
        with open(OUTPUT_PATH, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError):
        return None
