"""
The capability matrix — the same rule the deployed portal runs on.

This is a direct port of `frontend/lib/policy.ts`. It is here, in Python, for
one reason: the idea it encodes is the most important thing in this project,
and it has to be demonstrable in the submitted artifact rather than merely
described.

The idea
--------
Most systems restrict an assistant by TELLING it what not to do: "never reveal
institutional finance figures to a student." That is a request, and a request
can be argued with. People talk models out of their own instructions every
week.

The alternative is to make the restriction structural. A tool the caller does
not hold the capability for is never added to the agent's tool list, so the
model is never told it exists. There is no phrasing that reaches a function
that was not passed in. The question stops being "will the model comply?" and
becomes "was the function bound?" — a fact about a list, not a matter of
persuasion.

That is why this is a matrix rather than a paragraph in a system prompt.
"""
from __future__ import annotations

from dataclasses import dataclass

CAPABILITIES = (
    "study.viewOwn",              # this student's own transcript
    "study.viewCohort",           # aggregate performance, never individuals
    "finance.viewOwn",            # this student's own fee ledger
    "finance.viewInstitutional",  # institution-wide collection figures
    "policy.search",              # the university knowledge base
    "audit.view",                 # the audit trail
)

# Mirrors MATRIX in frontend/lib/policy.ts. Keep the two in step.
MATRIX: dict[str, tuple[str, ...]] = {
    "STUDENT": ("study.viewOwn", "finance.viewOwn", "policy.search"),
    "FACULTY": ("study.viewOwn", "study.viewCohort", "finance.viewOwn", "policy.search"),
    "ADMIN":   ("study.viewOwn", "study.viewCohort", "finance.viewOwn",
                "finance.viewInstitutional", "policy.search"),
    "HOD":     ("study.viewOwn", "study.viewCohort", "finance.viewOwn",
                "finance.viewInstitutional", "policy.search"),
    "HOI":     ("study.viewOwn", "study.viewCohort", "finance.viewOwn",
                "finance.viewInstitutional", "policy.search"),
    "OWNER":   CAPABILITIES,
}

ROLES = tuple(MATRIX.keys())

# Rank governs account recovery, not capability: you may only reset an account
# you outrank. ADMIN and HOD share a rank deliberately, so neither can reset
# the other.
RANK: dict[str, int] = {
    "STUDENT": 1, "FACULTY": 2, "ADMIN": 3, "HOD": 3, "HOI": 4, "OWNER": 5,
}


@dataclass(frozen=True)
class Session:
    role: str

    @property
    def normalised(self) -> str:
        """An unknown role falls back to the LEAST privileged, never the most.

        A typo in a role string must fail closed. This single line is the
        difference between a matrix and a suggestion.
        """
        r = str(self.role or "").strip().upper()
        return r if r in MATRIX else "STUDENT"


def can(session: Session, capability: str) -> bool:
    if capability not in CAPABILITIES:
        # An unknown capability is denied rather than allowed, so a renamed
        # capability breaks loudly instead of granting access quietly.
        return False
    return capability in MATRIX[session.normalised]


def capabilities_for(role: str) -> tuple[str, ...]:
    return MATRIX[Session(role).normalised]


def roles_with(capability: str) -> list[str]:
    """Which roles hold a capability. Used by the tests as a regression guard."""
    return [r for r in ROLES if capability in MATRIX[r]]


def outranks(actor: str, target: str) -> bool:
    return RANK.get(Session(actor).normalised, 0) > RANK.get(Session(target).normalised, 0)
