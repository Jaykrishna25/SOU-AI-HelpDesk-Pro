"""
The agent: ChatOllama + tool calling, ReAct style.

Provider is switchable. Ollama is the default and the app genuinely runs
offline on a laptop; set LLM_PROVIDER=gemini with a GOOGLE_API_KEY to run the
same agent, the same tools and the same prompts against a hosted model on a
machine that cannot hold an 8B model. Nothing else in the pipeline changes.
"""
from __future__ import annotations

import inspect
import os

from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage, SystemMessage

from agent_core.policy import Session
from agent_core.tools import tools_for, analyse_my_results

# create_agent moved between packages across versions; support both.
try:
    from langchain.agents import create_agent           # LangChain 1.x
except ImportError:                                      # pragma: no cover
    from langgraph.prebuilt import create_react_agent as create_agent

MODEL = os.getenv("OLLAMA_MODEL", "qwen3:8b")
PROVIDER = os.getenv("LLM_PROVIDER", "ollama").strip().lower()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite")


def model_label() -> str:
    """What to show in the UI, so it is never ambiguous what answered."""
    if PROVIDER == "gemini":
        return f"{GEMINI_MODEL} (Google AI Studio free tier)"
    return f"{MODEL} (local, via Ollama)"


SYSTEM = """You are the Silver Oak University help desk assistant.

HARD RULES, in order of importance:
1. You NEVER calculate. The tools calculate. Scores, averages, study hours,
   fee totals, percentages - all of them come from a tool. Never estimate a
   number and never state one a tool did not return.
2. NEVER predict a grade, a rank, a CGPA or a probability of passing. Nothing
   in this system produces a forecast. If asked, say plainly that you cannot
   predict results, and say what the recorded marks show instead.
3. Always say where a figure came from: the uploaded transcript, the
   institutional figures, or a university document.
4. If a tool returns nothing useful, say so plainly and suggest raising a
   ticket. Do NOT fall back on general knowledge about Indian universities. A
   wrong fee deadline is worse than an honest "I do not know".
5. If institutional figures are marked as seed data, say they are seed data.
6. You are not a financial adviser. You explain what numbers say. You never
   recommend a loan and never tell a student what to do about money.
7. Be brief - three to six sentences unless a breakdown is asked for.

There is no rule here telling you to refuse questions outside your role.
There does not need to be: a tool you were not given is not something you can
be talked into using."""

_PROMPT_KW = None


def get_llm():
    """The chat model for this run."""
    if PROVIDER == "gemini":
        key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        if not key:
            raise RuntimeError(
                "LLM_PROVIDER=gemini but no GOOGLE_API_KEY is set. Get a free key at "
                "https://aistudio.google.com/apikey, or unset LLM_PROVIDER to use Ollama."
            )
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
        except ImportError as e:      # pragma: no cover
            raise RuntimeError(
                "LLM_PROVIDER=gemini needs: pip install langchain-google-genai"
            ) from e
        return ChatGoogleGenerativeAI(model=GEMINI_MODEL, temperature=0.1, google_api_key=key)

    return ChatOllama(model=MODEL, temperature=0.1)


def prompt_kwarg() -> str:
    """Find what this installed version calls the system-prompt parameter."""
    global _PROMPT_KW
    if _PROMPT_KW is None:
        params = inspect.signature(create_agent).parameters
        _PROMPT_KW = next(
            (k for k in ("system_prompt", "prompt", "state_modifier", "messages_modifier")
             if k in params),
            "",
        )
    return _PROMPT_KW


def build_agent(session: Session | str):
    """Build the agent for this role.

    Note what is NOT here: no instruction telling the model to refuse
    institutional questions when the caller is a student. There does not need to
    be. The function was never passed in, so there is nothing to refuse with and
    nothing to talk it out of. See agent_core/policy.py.
    """
    tools = tools_for(session)
    kw = prompt_kwarg()
    if kw:
        return create_agent(get_llm(), tools, **{kw: SYSTEM})
    return create_agent(get_llm(), tools)


def ask(agent, question: str, history: list | None = None) -> str:
    """Ask the agent one question. Never raises into the UI."""
    messages = list(history or []) + [HumanMessage(content=question)]
    try:
        result = agent.invoke({"messages": messages})
    except Exception as e:
        return "The assistant could not be reached just now. Details: " + str(e)[:200]

    msgs = result.get("messages", []) if isinstance(result, dict) else []
    for m in reversed(msgs):
        text = getattr(m, "content", "")
        if isinstance(text, list):
            text = "".join(p.get("text", "") for p in text if isinstance(p, dict))
        if text and getattr(m, "type", "") in ("ai", "AIMessageChunk"):
            return str(text).strip()
    return "No answer came back. Try rephrasing the question."


def opening_summary(threshold: float = 60.0) -> tuple[str, str]:
    """Run the study-plan tool DIRECTLY, then have the model reword the result.

    Design decision worth defending: the plan shown on upload does not depend on
    a small local model choosing to call a tool. The tool genuinely runs the
    moment ingestion finishes, so the numbers are always correct and the model
    only ever rewords them.

    Returns (raw_tool_output, plain_language_summary). The raw output is shown
    in the UI so the summary can be checked against its own working.
    """
    raw = analyse_my_results.invoke({"weak_threshold_pct": threshold})
    try:
        out = get_llm().invoke([
            SystemMessage(content=(
                "Rewrite the study plan below for the student in three or four sentences. "
                "Use ONLY the numbers given - do not calculate anything new, do not add a "
                "figure that is not present, and do not predict future grades. Name the "
                "most urgent subject and say what the overall picture is."
            )),
            HumanMessage(content=raw),
        ])
        text = out.content if isinstance(out.content, str) else str(out.content)
        return raw, text.strip() or "See the plan below."
    except Exception:
        return raw, "The plain-language summary could not be generated, but the plan below is exact."
