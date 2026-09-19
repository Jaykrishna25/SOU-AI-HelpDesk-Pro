"""
The agent's tools.

One rule runs through every function here: **the model never calculates.** If a
number appears in an answer, a tool produced it. Averages, priorities, study
hours, collection rates — all Python, all deterministic, all checkable.

That matters because a student acts on this. A plan confidently wrong about
which subject is most urgent sends them to revise the wrong thing, and a wrong
fee figure is worse than no fee figure.

The second rule is that tools are BOUND BY ROLE (see policy.py). A student's
agent is never handed `analyse_institutional_finance`, so no phrasing reaches
it.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

from langchain_core.tools import tool

from agent_core.ingest import Subject, WEAK_THRESHOLD, CRITICAL_THRESHOLD
from agent_core.policy import Session, can

# ---------------------------------------------------------------------------
# Session state. The agent should not carry a whole transcript through a tool
# argument, so the app sets it once after ingestion.
# ---------------------------------------------------------------------------
_SUBJECTS: list[Subject] = []
_RETRIEVER = None


def set_subjects(subjects: list[Subject]) -> None:
    global _SUBJECTS
    _SUBJECTS = subjects


def set_retriever(retriever) -> None:
    global _RETRIEVER
    _RETRIEVER = retriever


def has_transcript() -> bool:
    return bool(_SUBJECTS)


# ---------------------------------------------------------------------------
# Deterministic arithmetic
# ---------------------------------------------------------------------------

@dataclass
class PlanItem:
    code: str
    name: str
    semester: int
    score: float
    grade: str
    priority: int
    severity: str
    hours_per_week: int
    reason: str


def compute_plan(threshold: float = WEAK_THRESHOLD) -> list[PlanItem]:
    """All of the study-plan arithmetic. No model involved anywhere in here."""
    weak = [s for s in _SUBJECTS if s.score < threshold]
    # Worst score first. Ties break on the lower grade point, so the ordering
    # is total rather than arbitrary.
    weak.sort(key=lambda s: (s.score, s.name))

    items: list[PlanItem] = []
    for i, s in enumerate(weak, start=1):
        gap = max(0.0, threshold - s.score)
        hours = int(min(10, max(2, round(gap / 8) + 2)))
        items.append(PlanItem(
            code=s.code, name=s.name, semester=s.semester,
            score=s.score, grade=s.grade, priority=i,
            severity="critical" if s.score < CRITICAL_THRESHOLD else "weak",
            hours_per_week=hours,
            reason=(
                f"scored {s.score:g}/100 ({s.grade}), "
                + ("below the pass-risk line" if s.score < CRITICAL_THRESHOLD
                   else "below the target line")
                + f" of {threshold:g}"
            ),
        ))
    return items


def render_plan(threshold: float = WEAK_THRESHOLD) -> str:
    """The exact text the model is given. It rewords this; it never recomputes."""
    items = compute_plan(threshold)
    scored = [s.score for s in _SUBJECTS if s.score > 0]
    avg = round(sum(scored) / len(scored), 2) if scored else 0.0
    strong = [s.name for s in sorted(_SUBJECTS, key=lambda x: -x.score)[:3] if s.score >= 70]

    out = [
        f"STUDY PLAN (generated {datetime.now(timezone.utc):%Y-%m-%d %H:%M UTC})",
        f"Subjects on the transcript: {len(_SUBJECTS)}",
        f"Average score: {avg:g} out of 100",
        f"Weak subjects: {len(items)} "
        f"(of which {sum(1 for i in items if i.severity == 'critical')} are at risk of failing)",
        f"Suggested study load: {sum(i.hours_per_week for i in items)} hours per week in total",
        "",
    ]
    if not items:
        out.append("No subject falls below the threshold. Nothing is flagged for revision.")
    else:
        out.append("PRIORITISED WEAK AREAS:")
        for i in items:
            out.append(
                f"{i.priority}. {i.name} ({i.code}, semester {i.semester}) - "
                f"{i.severity.upper()} - {i.hours_per_week} hrs/week. Reason: {i.reason}."
            )
    if strong:
        out.append("")
        out.append("STRONGEST SUBJECTS: " + ", ".join(strong))
    out.append("")
    out.append("These figures come from the transcript only. No grade is predicted.")
    return "\n".join(out)


# ---------------------------------------------------------------------------
# Tool 1: the student's own study plan
# ---------------------------------------------------------------------------
@tool
def analyse_my_results(weak_threshold_pct: float = 60.0) -> str:
    """Build a prioritised study plan from this student's transcript.

    Uses deterministic arithmetic. For every subject scoring below
    weak_threshold_pct (a PERCENTAGE out of 100, default 60) it returns the
    subject, its score, its grade, how urgent it is, suggested study hours per
    week, and the reason it was flagged. Also returns the overall average and
    the student's strongest subjects.

    Scores are out of 100, hours are per week. Call this for any question about
    what to revise, which subjects are weak, or overall performance. It makes no
    prediction and gives no grade forecast.
    """
    if not has_transcript():
        return "No transcript has been uploaded yet, so there is nothing to analyse."
    return render_plan(weak_threshold_pct)


# ---------------------------------------------------------------------------
# Tool 2: cohort performance — withheld from STUDENT
# ---------------------------------------------------------------------------
@tool
def analyse_cohort_performance() -> str:
    """Analyse examination performance across the cohort rather than one student.

    Returns per-subject averages out of 100 and how many fell below the weak
    threshold, worst subject first. Aggregate figures only - it never returns an
    individual student's marks. Call this for questions about which subjects a
    department or the cohort struggles with.
    """
    if not has_transcript():
        return "No transcript has been uploaded yet, so there is nothing to aggregate."

    lines = [
        "COHORT PERFORMANCE",
        "Transcripts held in this session: 1 (the uploaded transcript).",
        "",
        "IMPORTANT: this demonstration holds one transcript, so these are that "
        "student's own marks shown per subject. They are NOT a cohort average "
        "and must not be described as one. In the deployed portal this tool "
        "aggregates across every student record in the database.",
        "",
    ]
    for s in sorted(_SUBJECTS, key=lambda x: x.score):
        band = "below the weak threshold" if s.weak else "at or above it"
        lines.append(f"- {s.name} ({s.code}): {s.score:g}/100, {band}")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Tool 3: institutional finance — withheld from STUDENT and FACULTY
#
# Seed figures, and the tool says so in its own output. The portal computes
# these from the database; here they are fixed so the gating is demonstrable
# without a database. Presenting them as real would be exactly the kind of
# fabrication this project exists to avoid.
# ---------------------------------------------------------------------------
@tool
def analyse_institutional_finance() -> str:
    """Analyse fee collection across the whole institution, with exact arithmetic.

    Returns total billed, total collected, outstanding, the collection rate as a
    percentage, and how many students are overdue. Aggregate figures only - it
    never returns an individual student's details. Call this for questions about
    overall collection, institutional outstanding dues, or how the institution
    is performing financially.
    """
    billed, collected, overdue_students, total_students = 12_400_000, 9_610_000, 214, 1_180
    outstanding = billed - collected
    rate = round(collected / billed * 100, 2)

    return "\n".join([
        "INSTITUTIONAL FEE POSITION",
        "",
        "SEED DATA. These figures are demonstration values, not Silver Oak "
        "University's real finances. Say so if you report them.",
        "",
        f"Total billed:      INR {billed:,}",
        f"Total collected:   INR {collected:,}",
        f"Outstanding:       INR {outstanding:,}",
        f"Collection rate:   {rate}%",
        f"Students overdue:  {overdue_students} of {total_students}",
        "",
        "Every figure above was computed here, not estimated. Do not recalculate "
        "them and do not derive new figures from them.",
    ])


# ---------------------------------------------------------------------------
# Tool 4: the university knowledge base
# ---------------------------------------------------------------------------
@tool
def search_university_policy(query: str) -> str:
    """Search official Silver Oak University help-desk documents.

    Covers fees and payment, examinations and hall tickets, results and
    revaluation, attendance requirements, bonafide certificates, hostel,
    library, room booking, grievances, scholarships, placements, IT problems and
    how tickets work.

    Use this for any question about what the RULES or PROCEDURES say, as opposed
    to what this particular student scored or owes. Returns extracts with the
    article each came from.

    If the extracts do not answer the question, say so - do not fill the gap
    from general knowledge about Indian universities.
    """
    if _RETRIEVER is None:
        return "The knowledge base has not been indexed yet."
    try:
        docs = _RETRIEVER.invoke(query)
    except Exception as e:
        return "The policy search could not be completed: " + str(e)[:160]
    if not docs:
        return "No university document matching that query was found."
    return "\n\n".join(
        f"[{d.metadata.get('title', d.metadata.get('kind', 'document'))}]\n{d.page_content}"
        for d in docs
    )


# ---------------------------------------------------------------------------
# Role-bound binding. THIS FUNCTION IS THE SECURITY BOUNDARY.
# ---------------------------------------------------------------------------
ALL_TOOL_NAMES = (
    "analyse_my_results",
    "analyse_cohort_performance",
    "analyse_institutional_finance",
    "search_university_policy",
)


def tools_for(session: Session | str) -> list:
    """The toolset for this session, decided by capability.

    A tool the caller does not hold the capability for is never appended, so the
    model is never told it exists and no phrasing can reach it. Compare with the
    usual approach - a line in the system prompt asking the model not to do
    something - which is a request the model is free to be talked out of.
    """
    if isinstance(session, str):
        session = Session(session)

    tools = []
    if can(session, "policy.search"):
        tools.append(search_university_policy)
    if can(session, "study.viewOwn"):
        tools.append(analyse_my_results)
    if can(session, "study.viewCohort"):
        tools.append(analyse_cohort_performance)
    if can(session, "finance.viewInstitutional"):
        tools.append(analyse_institutional_finance)
    return tools


def tool_names_for(session: Session | str) -> list[str]:
    """Names of the bound tools, for display.

    A capability matrix nobody can see is indistinguishable from a promise.
    """
    return [t.name for t in tools_for(session)]
