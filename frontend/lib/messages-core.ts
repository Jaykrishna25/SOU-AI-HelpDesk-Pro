/* ============================================================
   Direct student-faculty conversations — the rules.

   Pure functions. The authorisation rule in particular is here
   rather than inline in the route, because it is the single
   thing standing between a private thread and anyone who can
   guess an id, and it deserves a test that does not need a
   database to run.
   ============================================================ */

export const MAX_BODY = 2000;
export const MAX_SUBJECT = 120;

export interface Participants {
  studentId: string;
  facultyId: string;
}

/**
 * True when this user is one of the two people in the conversation.
 *
 * NOTE WHAT IS NOT HERE: there is no staff override. An HOD is not a
 * participant in a thread between a student and a lecturer, and being senior
 * is not the same as being spoken to. If a complaint needs escalation the
 * student raises a grievance, which has a deliberate disclosure path and
 * tells them who will read it. A quiet "heads of department can read
 * everything" rule would mean the interface promises a private conversation
 * that is not one, which is worse than having no feature.
 */
export function isParticipant(c: Participants, userId: string): boolean {
  return !!userId && (c.studentId === userId || c.facultyId === userId);
}

/** Why this message cannot be sent, or null. */
export function messageProblem(body: string): string | null {
  const text = String(body || "").trim();
  if (!text) return "Write a message first.";
  if (text.length > MAX_BODY) return "Messages are limited to " + MAX_BODY + " characters.";
  return null;
}

/** Why this conversation cannot be started, or null. */
export function startProblem(subject: string, body: string, facultyId: string): string | null {
  if (!facultyId) return "Choose who you want to contact.";
  const s = String(subject || "").trim();
  if (s.length < 3) return "Give it a short subject so your lecturer knows what it is about.";
  if (s.length > MAX_SUBJECT) return "That subject line is too long.";
  return messageProblem(body);
}

/** One line of the message, for the thread list. Never the whole thing. */
export function snippet(body: string, max = 120): string {
  const flat = String(body || "").replace(/\s+/g, " ").trim();
  return flat.length <= max ? flat : flat.slice(0, max - 1).trimEnd() + "…";
}

/**
 * Whether a thread should appear unread for this viewer.
 *
 * Your own message never marks your own thread unread, which sounds obvious
 * and is the bug every read-receipt implementation ships at least once.
 */
export function isUnread(
  thread: { lastSenderId: string; readByStudent: boolean; readByFaculty: boolean } & Participants,
  userId: string,
): boolean {
  if (thread.lastSenderId === userId) return false;
  if (userId === thread.studentId) return !thread.readByStudent;
  if (userId === thread.facultyId) return !thread.readByFaculty;
  return false;
}
