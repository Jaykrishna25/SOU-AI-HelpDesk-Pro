"""
SOU AI HelpDesk — Streamlit deployment of the portal's AI layer.

Built around the role selector, not a chat box. Change role and watch the
agent's toolset change with it: that is the idea this project is really about,
and it should be the first thing anyone sees.
"""
from __future__ import annotations

import streamlit as st

from agent_core.ingest import (
    build_index, get_retriever, read_transcript, transcript_documents,
    WEAK_THRESHOLD, CRITICAL_THRESHOLD,
)
from agent_core.policy import ROLES, Session, capabilities_for, CAPABILITIES
from agent_core.tools import (
    set_subjects, set_retriever, has_transcript, compute_plan,
    tool_names_for, ALL_TOOL_NAMES,
)
from agent_core.agent import build_agent, ask, opening_summary, model_label

st.set_page_config(page_title="SOU AI HelpDesk", page_icon="*", layout="wide")

CSS = """
<style>
  #MainMenu, footer {visibility: hidden;}
  .block-container {padding-top: 2.2rem; max-width: 1180px;}
  h1, h2, h3 {letter-spacing: -0.02em;}
  .hero {font-size: 2.1rem; font-weight: 650; line-height: 1.15; margin-bottom: .3rem;}
  .sub {color: #8A94A6; font-size: .95rem; margin-bottom: 1.4rem;}
  .kpi {background: #151A24; border: 1px solid #222A38; border-radius: 14px;
        padding: 1rem 1.1rem; height: 100%;}
  .kpi .label {color: #8A94A6; font-size: .72rem; text-transform: uppercase;
               letter-spacing: .09em;}
  .kpi .value {font-size: 1.5rem; font-weight: 640; margin-top: .3rem;}
  .item {background: #141922; border: 1px solid #222A38; border-left: 3px solid #2E3A4D;
         border-radius: 12px; padding: .9rem 1rem; margin-bottom: .55rem;}
  .item.critical {border-left-color: #E5484D;}
  .item.weak {border-left-color: #F5A524;}
  .item .nm {font-weight: 600;}
  .item .meta {color: #8A94A6; font-size: .8rem; margin-top: .25rem;}
  .chip {display:inline-block; background:#1B2230; border:1px solid #2A3547;
         border-radius:999px; padding:.18rem .6rem; font-size:.72rem; color:#AEB8C8;
         margin:.12rem .3rem .12rem 0;}
  .chip.off {background:#141922; border-color:#242C3A; color:#5A6274;
             text-decoration:line-through;}
  .disc {color:#7A8496; font-size:.76rem; border-top:1px solid #1E2531;
         padding-top:.8rem; margin-top:1.6rem;}
</style>
"""
st.markdown(CSS, unsafe_allow_html=True)

for k, v in {
    "store": None, "retriever": None, "agent": None, "subjects": [],
    "summary": "", "raw": "", "history": [], "filename": "",
    "threshold": WEAK_THRESHOLD, "role": "STUDENT", "indexed": 0,
}.items():
    st.session_state.setdefault(k, v)


def ensure_index(extra=None):
    """Index the knowledge base once, plus a transcript when one is uploaded."""
    store, n = build_index(extra)
    retriever = get_retriever(store)
    set_retriever(retriever)
    st.session_state.update(store=store, retriever=retriever, indexed=n)


def rebuild_agent():
    st.session_state.agent = build_agent(Session(st.session_state.role))


# ----------------------------------------------------------------- sidebar
with st.sidebar:
    st.markdown("### Acting as")
    prev = st.session_state.role
    st.session_state.role = st.selectbox(
        "Role", ROLES, index=ROLES.index(st.session_state.role),
        label_visibility="collapsed",
    )

    bound = tool_names_for(Session(st.session_state.role))
    st.caption("**Tools bound to the agent:**")
    for name in ALL_TOOL_NAMES:
        cls = "chip" if name in bound else "chip off"
        st.markdown(f"<span class='{cls}'>{name}</span>", unsafe_allow_html=True)

    st.caption(
        "A struck-through tool is **not passed to the model at all**. It is not "
        "refused — it does not exist for this role, so no phrasing can reach it."
    )

    with st.expander("Capabilities held"):
        held = capabilities_for(st.session_state.role)
        for c in CAPABILITIES:
            st.markdown(f"{'✅' if c in held else '⬜'} `{c}`")

    if st.session_state.role != prev:
        rebuild_agent()

    st.markdown("---")
    st.markdown("### Your transcript")
    up = st.file_uploader("Upload a transcript", type=["csv", "xlsx", "xls", "pdf", "txt"],
                          label_visibility="collapsed")
    use_sample = st.button("Use sample transcript", use_container_width=True)

    st.markdown("---")
    st.session_state.threshold = st.slider(
        "Flag a subject below this score", 40.0, 80.0, st.session_state.threshold, 2.5,
    )
    st.caption(f"Under {CRITICAL_THRESHOLD:g} is treated as at risk of failing.")

    st.markdown("---")
    st.caption(f"Model: `{model_label()}`")
    st.caption("Embeddings: `BAAI/bge-small-en-v1.5` · Vector store: Chroma")
    if st.session_state.indexed:
        st.caption(f"Indexed documents: {st.session_state.indexed}")


def ingest(file_bytes: bytes, name: str):
    with st.status("Reading your transcript...", expanded=True) as s:
        st.write("Parsing subjects and marks")
        raw_text, subjects = read_transcript(file_bytes, name)
        if not subjects:
            s.update(label="Could not read any subjects", state="error")
            st.error("No subjects were found. A transcript needs a subject column "
                     "and a marks or grade column.")
            return

        set_subjects(subjects)
        st.write(f"Found {len(subjects)} subjects. Embedding into Chroma...")
        ensure_index(transcript_documents(raw_text, subjects))

        st.write("Running the study plan tool")
        raw, summary = opening_summary(st.session_state.threshold)
        rebuild_agent()

        st.session_state.update(
            subjects=subjects, raw=raw, summary=summary, history=[], filename=name,
        )
        s.update(label=f"Ready — {len(subjects)} subjects, {st.session_state.indexed} indexed documents",
                 state="complete", expanded=False)


if st.session_state.store is None:
    with st.spinner("Indexing the university knowledge base..."):
        ensure_index()
        rebuild_agent()

if up is not None and up.name != st.session_state.filename:
    ingest(up.getvalue(), up.name)
elif use_sample:
    with open("sample/transcript.csv", "rb") as f:
        ingest(f.read(), "sample/transcript.csv")


# ----------------------------------------------------------------- header
st.markdown('<div class="hero">SOU AI HelpDesk</div>', unsafe_allow_html=True)
st.markdown(
    '<div class="sub">The AI layer of the Silver Oak University help desk portal. '
    'Answers from university documents and from your own record — and refuses '
    'rather than guesses when it cannot.</div>',
    unsafe_allow_html=True,
)

# ----------------------------------------------------------------- plan
if st.session_state.subjects:
    items = compute_plan(st.session_state.threshold)
    scored = [s.score for s in st.session_state.subjects if s.score > 0]
    avg = round(sum(scored) / len(scored), 1) if scored else 0

    cols = st.columns(4)
    for col, (label, value) in zip(cols, [
        ("Subjects", len(st.session_state.subjects)),
        ("Average", f"{avg}/100"),
        ("Weak areas", len(items)),
        ("At risk", sum(1 for i in items if i.severity == "critical")),
    ]):
        col.markdown(
            f"<div class='kpi'><div class='label'>{label}</div>"
            f"<div class='value'>{value}</div></div>",
            unsafe_allow_html=True,
        )

    if st.session_state.summary:
        st.markdown("### What this means")
        st.write(st.session_state.summary)

    if items:
        st.markdown("### Revise in this order")
        for i in items:
            st.markdown(
                f"<div class='item {i.severity}'><div class='nm'>{i.priority}. {i.name}</div>"
                f"<div class='meta'>{i.code} · semester {i.semester} · {i.score:g}/100 "
                f"({i.grade}) · {i.hours_per_week} hrs/week · {i.reason}</div></div>",
                unsafe_allow_html=True,
            )

    with st.expander("Raw study plan tool output (exactly what the model was given)"):
        st.text(st.session_state.raw)
else:
    st.info(
        "Upload a transcript in the sidebar, or click **Use sample transcript**, to get a "
        "study plan. You can ask about university policy without one."
    )

# ----------------------------------------------------------------- chat
st.markdown("### Ask the help desk")
st.caption(
    "The assistant calls tools for every figure and is told it may never calculate. "
    "What it can reach depends on the role selected in the sidebar."
)

SUGGESTIONS = {
    "STUDENT": ["What should I revise first?",
                "What are the rules for supplementary examinations?",
                "What is our institutional collection rate?",
                "How do I get a bonafide certificate?"],
    "FACULTY": ["Which subjects does the cohort struggle with?",
                "What is our institutional collection rate?",
                "What is the minimum attendance requirement?"],
    "HOD":     ["Which subjects does the cohort struggle with?",
                "What is our institutional collection rate?",
                "What does the policy say about revaluation?"],
    "OWNER":   ["What is our institutional collection rate?",
                "Which subjects does the cohort struggle with?",
                "How many students are overdue?"],
}
picks = SUGGESTIONS.get(Session(st.session_state.role).normalised, SUGGESTIONS["STUDENT"])

clicked = None
for col, s in zip(st.columns(len(picks)), picks):
    if col.button(s, use_container_width=True):
        clicked = s

for role, text in st.session_state.history:
    with st.chat_message(role):
        st.markdown(text)

typed = st.chat_input("Ask about fees, exams, attendance, your results…")
question = clicked or typed

if question:
    st.session_state.history.append(("user", question))
    with st.chat_message("user"):
        st.markdown(question)
    with st.chat_message("assistant"):
        with st.spinner("Checking…"):
            answer = ask(st.session_state.agent, question)
        st.markdown(answer)
        st.caption("Tools available to this role: " + ", ".join(
            tool_names_for(Session(st.session_state.role))))
    st.session_state.history.append(("assistant", answer))

st.markdown(
    '<div class="disc">Guidance only. Not an official academic or financial record, and '
    'no result is predicted. Institutional figures are seed data for demonstration.</div>',
    unsafe_allow_html=True,
)
