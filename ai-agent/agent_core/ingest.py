"""
Ingestion for the SOU AI HelpDesk agent.

Pipeline stages this file covers:
  document loading  -> TextLoader for the knowledge base,
                       PyPDFLoader / pandas for an uploaded transcript
  text splitting    -> section-aware, plus one Document per subject
  embeddings        -> HuggingFaceEmbeddings, BAAI/bge-small-en-v1.5
  vector store      -> Chroma
  retriever         -> as_retriever(search_kwargs={"k": 4})

Design decision worth defending
-------------------------------
The knowledge base is split on markdown headings rather than at a fixed
character count. A help-desk article is a self-contained unit of meaning: "what
to do if your fee receipt has not been generated" is three sentences that only
work together. A 500-character split cuts that article in half, and the half
that gets retrieved reads like a complete answer while missing the step that
matters.

Sections are only broken up when one exceeds MAX_CHUNK, and then on paragraph
boundaries, so a long article degrades gracefully instead of being chopped.

The same reasoning drives one Document per subject for an uploaded transcript:
a fixed split separates a subject name from its marks, so a narrow question
retrieves something that looks right and answers wrong.
"""
from __future__ import annotations

import io
import os
import re
import tempfile
import uuid
from dataclasses import dataclass

from langchain_core.documents import Document
from langchain_community.document_loaders import TextLoader, PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma

EMBED_MODEL = "BAAI/bge-small-en-v1.5"
MAX_CHUNK = 1400
CHUNK_OVERLAP = 150

WEAK_THRESHOLD = 60.0
CRITICAL_THRESHOLD = 45.0

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KB_PATH = os.path.join(HERE, "data", "knowledge_base.md")

_EMBEDDINGS = None


def get_embeddings() -> HuggingFaceEmbeddings:
    """Load the embedding model once per process - it is slow to construct."""
    global _EMBEDDINGS
    if _EMBEDDINGS is None:
        _EMBEDDINGS = HuggingFaceEmbeddings(
            model_name=EMBED_MODEL,
            encode_kwargs={"normalize_embeddings": True},
        )
    return _EMBEDDINGS


# ------------------------------------------------------------ knowledge base

def load_knowledge_base(path: str = KB_PATH) -> list[Document]:
    """Load the help-desk articles with LangChain's TextLoader, split by section."""
    raw = TextLoader(path, encoding="utf-8").load()
    text = "\n".join(d.page_content for d in raw)

    # Split on level-2 headings; each is one article.
    parts = re.split(r"^## ", text, flags=re.M)
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=MAX_CHUNK,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", ". ", " ", ""],
    )

    docs: list[Document] = []
    for part in parts[1:]:                       # parts[0] is the file preamble
        lines = part.strip().splitlines()
        if not lines:
            continue
        title = lines[0].strip()
        body = "\n".join(lines[1:]).strip()
        if not body:
            continue

        full = f"{title}\n{body}"
        if len(full) <= MAX_CHUNK:
            docs.append(Document(
                page_content=full,
                metadata={"source": "knowledge_base", "title": title, "kind": "article"},
            ))
        else:
            # Long article: keep the title on every piece so a retrieved
            # fragment still says what it is about.
            for chunk in splitter.split_text(body):
                docs.append(Document(
                    page_content=f"{title}\n{chunk}",
                    metadata={"source": "knowledge_base", "title": title, "kind": "article-part"},
                ))
    return docs


# ------------------------------------------------------------ transcripts

@dataclass
class Subject:
    code: str
    name: str
    semester: int
    score: float
    grade: str

    @property
    def weak(self) -> bool:
        return self.score < WEAK_THRESHOLD

    @property
    def critical(self) -> bool:
        return self.score < CRITICAL_THRESHOLD

    def as_text(self) -> str:
        band = "critical" if self.critical else ("weak" if self.weak else "satisfactory")
        return (
            f"Semester {self.semester} - {self.code} {self.name}. "
            f"Score {self.score:g} out of 100. Grade {self.grade}. "
            f"Performance band: {band}."
        )


_GRADE_POINTS = {"O": 10, "A+": 9, "A": 9, "B+": 8, "B": 7, "C": 6, "D": 5, "E": 4, "F": 0}


def _grade_from(score: float) -> str:
    for cut, g in [(90, "O"), (80, "A"), (70, "B+"), (60, "B"), (50, "C"), (45, "D")]:
        if score >= cut:
            return g
    return "E"


def _num(v) -> float:
    try:
        f = float(str(v).strip().replace("%", "").replace(",", ""))
        return f if f == f else 0.0
    except (TypeError, ValueError):
        return 0.0


def read_transcript(file_bytes: bytes, filename: str) -> tuple[str, list[Subject]]:
    """Read a transcript in CSV, Excel, PDF or text. Returns (raw_text, subjects)."""
    lower = filename.lower()

    if lower.endswith(".pdf"):
        tmp = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False)
        try:
            tmp.write(file_bytes)
            tmp.close()
            text = "\n".join(p.page_content or "" for p in PyPDFLoader(tmp.name).load())
        finally:
            try:
                os.unlink(tmp.name)
            except OSError:
                pass
        return text, _from_text(text)

    if lower.endswith((".xlsx", ".xls", ".csv")):
        import pandas as pd
        df = (pd.read_excel(io.BytesIO(file_bytes)) if lower.endswith((".xlsx", ".xls"))
              else pd.read_csv(io.BytesIO(file_bytes)))
        return _df_text(df), _from_df(df)

    text = file_bytes.decode("utf-8", errors="replace")
    return text, _from_text(text)


def _norm(s) -> str:
    return re.sub(r"[^a-z]", "", str(s).lower())


def _from_df(df) -> list[Subject]:
    """Map a tabular transcript to subjects, matching headers loosely.

    Real transcripts vary: "Subject" or "Course Title", "Total" or "Marks".
    Demanding exact headers would fail on the first real file.
    """
    cols = {_norm(c): c for c in df.columns}

    def pick(*names):
        for n in names:
            if n in cols:
                return cols[n]
        for n in names:
            for key, original in cols.items():
                if n in key:
                    return original
        return None

    c_name = pick("subject", "coursetitle", "course", "title", "paper")
    if c_name is None:
        return []
    c_code, c_sem = pick("code", "subjectcode"), pick("semester", "sem", "term")
    c_total, c_grade = pick("total", "marks", "percentage", "score"), pick("grade")
    c_int, c_ext = pick("internal", "ia"), pick("external", "ese")

    out: list[Subject] = []
    for _, row in df.iterrows():
        name = str(row[c_name]).strip()
        if not name or name.lower() == "nan":
            continue

        if c_total is not None:
            score = _num(row[c_total])
        elif c_int is not None and c_ext is not None:
            score = _num(row[c_int]) + _num(row[c_ext])
        else:
            score = 0.0

        grade = str(row[c_grade]).strip().upper() if c_grade is not None else ""
        if score <= 0 and grade in _GRADE_POINTS:
            score = _GRADE_POINTS[grade] * 10.0

        out.append(Subject(
            code=str(row[c_code]).strip() if c_code is not None else "",
            name=name,
            semester=int(_num(row[c_sem])) if c_sem is not None else 0,
            score=score,
            grade=grade or _grade_from(score),
        ))

    out.sort(key=lambda s: (s.semester, s.code))
    return out


_ROW = re.compile(
    r"^\s*(?P<code>[A-Z]{2,4}\s?\d{3})\s+(?P<name>.+?)\s+(?P<score>\d{1,3})\s*(?P<grade>[A-EO]\+?)?\s*$"
)


def _from_text(text: str) -> list[Subject]:
    """Best-effort parse of a transcript that arrived as free text or PDF."""
    out: list[Subject] = []
    semester = 0
    for line in text.splitlines():
        sem = re.search(r"semester\s*[:\-]?\s*(\d)", line, re.I)
        if sem:
            semester = int(sem.group(1))
        m = _ROW.match(line.strip())
        if not m:
            continue
        score = _num(m.group("score"))
        out.append(Subject(
            code=m.group("code").replace(" ", ""),
            name=m.group("name").strip(),
            semester=semester,
            score=score,
            grade=(m.group("grade") or _grade_from(score)).upper(),
        ))
    return out


def _df_text(df) -> str:
    lines = ["ACADEMIC TRANSCRIPT", "", " | ".join(str(c) for c in df.columns)]
    for _, row in df.iterrows():
        lines.append(" | ".join(str(row[c]) for c in df.columns))
    return "\n".join(lines)


# ------------------------------------------------------------ indexing

def build_index(extra_docs: list[Document] | None = None) -> tuple[Chroma, int]:
    """Embed the knowledge base, plus any uploaded documents, into Chroma."""
    docs = load_knowledge_base()
    if extra_docs:
        docs = docs + extra_docs

    store = Chroma.from_documents(
        documents=docs,
        embedding=get_embeddings(),
        collection_name="sou_helpdesk_" + uuid.uuid4().hex[:8],
    )
    return store, len(docs)


def transcript_documents(raw_text: str, subjects: list[Subject]) -> list[Document]:
    """Whole-transcript chunks plus one Document per subject.

    The per-subject documents are the important half: see the module docstring.
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500, chunk_overlap=120,
        separators=["\n\n", "\n", " | ", ". ", " ", ""],
    )
    docs = [
        Document(page_content=c, metadata={"source": "transcript", "kind": "section"})
        for c in splitter.split_text(raw_text)
    ]
    for s in subjects:
        docs.append(Document(
            page_content=s.as_text(),
            metadata={"source": "transcript", "kind": "subject",
                      "code": s.code, "name": s.name, "weak": s.weak},
        ))
    return docs


def get_retriever(store: Chroma, k: int = 4):
    return store.as_retriever(search_kwargs={"k": k})
