"""
The capability matrix and the tool binding, pinned.

These tests exist because the claim this project makes about authorisation is
structural rather than instructional: a tool the caller is not entitled to is
never added to the agent's tool list, so no phrasing reaches it.

That claim is only true while the binding is correct. If someone widens the
matrix later, or adds a tool outside the gate, these fail — which is the point.
A security property nobody tests is a security property nobody has.

    python -m pytest tests/ -q
"""
from agent_core.policy import (
    Session, can, capabilities_for, roles_with, outranks,
    MATRIX, ROLES, CAPABILITIES, RANK,
)
from agent_core.tools import tools_for, tool_names_for, ALL_TOOL_NAMES


# ------------------------------------------------------------ the matrix

def test_every_role_can_read_its_own_record():
    for role in ROLES:
        assert can(Session(role), "study.viewOwn")
        assert can(Session(role), "finance.viewOwn")


def test_a_student_cannot_reach_cohort_or_institutional_data():
    s = Session("STUDENT")
    assert not can(s, "study.viewCohort")
    assert not can(s, "finance.viewInstitutional")


def test_faculty_gets_cohort_but_not_institutional_finance():
    # Deliberate: teaching staff need to see where a class is struggling.
    # They have no reason to see what the institution has collected.
    f = Session("FACULTY")
    assert can(f, "study.viewCohort")
    assert not can(f, "finance.viewInstitutional")


def test_institutional_finance_is_granted_to_exactly_the_intended_roles():
    # A regression guard. If anyone widens this later, the suite fails rather
    # than a student quietly gaining aggregate finance access.
    assert roles_with("finance.viewInstitutional") == ["ADMIN", "HOD", "HOI", "OWNER"]


def test_the_audit_trail_belongs_to_the_owner_alone():
    assert roles_with("audit.view") == ["OWNER"]


def test_an_unknown_role_falls_back_to_the_least_privileged():
    # A typo in a role string must fail closed, never open.
    assert capabilities_for("PRINCIPAL") == MATRIX["STUDENT"]
    assert capabilities_for("") == MATRIX["STUDENT"]
    assert capabilities_for(None) == MATRIX["STUDENT"]


def test_role_matching_is_case_insensitive_and_trimmed():
    assert can(Session(" hod "), "finance.viewInstitutional")
    assert can(Session("Owner"), "audit.view")


def test_an_unknown_capability_is_denied():
    # A renamed capability should break loudly, not grant access quietly.
    assert not can(Session("OWNER"), "finance.viewEverything")
    assert not can(Session("OWNER"), "")


def test_no_role_holds_a_capability_that_does_not_exist():
    for role, caps in MATRIX.items():
        for cap in caps:
            assert cap in CAPABILITIES, f"{role} holds undeclared capability {cap}"


# ------------------------------------------------------------ rank

def test_rank_governs_recovery_not_capability():
    assert outranks("OWNER", "HOD")
    assert outranks("HOI", "ADMIN")
    assert not outranks("STUDENT", "FACULTY")


def test_equal_ranks_cannot_reset_each_other():
    # ADMIN and HOD share rank 3 deliberately.
    assert RANK["ADMIN"] == RANK["HOD"]
    assert not outranks("ADMIN", "HOD")
    assert not outranks("HOD", "ADMIN")


def test_nobody_outranks_themselves():
    for role in ROLES:
        assert not outranks(role, role)


# ------------------------------------------------------------ the binding
#
# The matrix being right is necessary but not sufficient. What matters is
# whether the tool list actually follows it.

def test_a_students_agent_is_never_handed_institutional_finance():
    # The central claim of this project. Not "the model refuses" — the
    # function is absent from the list it was given.
    assert "analyse_institutional_finance" not in tool_names_for("STUDENT")


def test_a_students_agent_is_never_handed_the_cohort_tool():
    assert "analyse_cohort_performance" not in tool_names_for("STUDENT")


def test_faculty_get_cohort_but_still_not_institutional_finance():
    names = tool_names_for("FACULTY")
    assert "analyse_cohort_performance" in names
    assert "analyse_institutional_finance" not in names


def test_an_owner_gets_everything():
    assert set(tool_names_for("OWNER")) == set(ALL_TOOL_NAMES)


def test_an_unknown_role_gets_the_student_toolset():
    assert tool_names_for("SUPERUSER") == tool_names_for("STUDENT")


def test_every_role_can_search_policy():
    # The knowledge base is the one thing everyone reaches. A help desk that
    # cannot answer a policy question is not a help desk.
    for role in ROLES:
        assert "search_university_policy" in tool_names_for(role)


def test_a_session_object_and_a_role_string_behave_identically():
    assert tool_names_for(Session("HOD")) == tool_names_for("HOD")


def test_every_bound_tool_is_callable_and_described():
    # Guards against a tool being listed but not being a real @tool, and
    # against one shipping with no description for the model to route on.
    for role in ROLES:
        for t in tools_for(Session(role)):
            assert hasattr(t, "invoke"), f"{t} bound for {role} is not invocable"
            assert t.description, f"{t.name} has no description"
            assert len(t.description) > 80, f"{t.name} description is too thin to route on"
