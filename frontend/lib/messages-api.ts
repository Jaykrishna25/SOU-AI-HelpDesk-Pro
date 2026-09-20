import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getLiveSession, notifyUser } from "@/lib/server-auth";
import { can } from "@/lib/policy";
import {
  isParticipant, messageProblem, startProblem, snippet, MAX_BODY,
} from "@/lib/messages-core";

/* ============================================================
   Direct student-faculty conversations.

   Every read and every write re-checks participation against
   the row, not against a role. That is the whole security
   model and it is deliberately boring: there is no staff
   override, no "senior roles can see all threads", no admin
   inbox. See the comment on isParticipant for why.

   A student starts a thread; faculty reply. Both can close it;
   either reopens it by writing again.
   ============================================================ */

function json(d: any, s = 200) { return NextResponse.json(d, { status: s }); }
function seg(req: NextRequest) {
  return new URL(req.url).pathname.replace(/^\/api\/messages\/?/, "").split("/").filter(Boolean);
}

/** Faculty a student may write to. Names only — no emails, no phone numbers. */
async function contactableFaculty() {
  const rows = await prisma.user.findMany({
    where: { isActive: true, role: { in: ["FACULTY", "HOD", "HOI"] } },
    select: { id: true, fullName: true, role: true, course: true, institute: true },
    orderBy: { fullName: "asc" },
    take: 300,
  });
  return rows;
}

export async function GET(req: NextRequest) {
  const s = await getLiveSession(req);
  if (!s) return json({ error: "Unauthenticated" }, 401);

  const p = seg(req);
  const q = new URL(req.url).searchParams;

  /* ---- who can I write to ---- */
  if (p[0] === "faculty") {
    if (!can(s, "message.start")) return json({ error: "Not permitted" }, 403);
    return json({ faculty: await contactableFaculty() });
  }

  /* ---- one thread ---- */
  if (p[0] === "thread") {
    const id = q.get("id") || "";
    const c = await prisma.conversation.findUnique({ where: { id } });
    /* 404 rather than 403 for a thread you are not in. A 403 confirms the
       conversation exists, which is itself something you should not learn
       by guessing an id. */
    if (!c || !isParticipant(c, s.userId)) return json({ error: "Not found" }, 404);

    const messages = await prisma.message.findMany({
      where: { conversationId: c.id }, orderBy: { sentAt: "asc" }, take: 500,
    });

    /* Opening a thread marks it read for whichever side you are. */
    const mine = c.studentId === s.userId ? { readByStudent: true } : { readByFaculty: true };
    await prisma.message.updateMany({ where: { conversationId: c.id }, data: mine });

    return json({
      conversation: { id: c.id, subject: c.subject, closed: c.closed, createdAt: c.createdAt },
      messages,
      me: s.userId,
    });
  }

  /* ---- my threads ---- */
  const conversations = await prisma.conversation.findMany({
    where: { OR: [{ studentId: s.userId }, { facultyId: s.userId }] },
    orderBy: { lastMessageAt: "desc" },
    take: 100,
    include: {
      student: { select: { id: true, fullName: true } },
      faculty: { select: { id: true, fullName: true, role: true } },
      messages: { orderBy: { sentAt: "desc" }, take: 1,
        select: { senderId: true, readByStudent: true, readByFaculty: true } },
    },
  });

  return json({
    me: s.userId,
    canStart: can(s, "message.start"),
    conversations: conversations.map(c => {
      const last = c.messages[0];
      const iAmStudent = c.studentId === s.userId;
      return {
        id: c.id,
        subject: c.subject,
        closed: c.closed,
        lastMessageAt: c.lastMessageAt,
        lastSnippet: c.lastSnippet,
        /* The other person, from the viewer's side. */
        withName: iAmStudent ? c.faculty.fullName : c.student.fullName,
        withRole: iAmStudent ? c.faculty.role : "STUDENT",
        unread: !!last && last.senderId !== s.userId
          && (iAmStudent ? !last.readByStudent : !last.readByFaculty),
      };
    }),
  });
}

export async function POST(req: NextRequest) {
  const s = await getLiveSession(req);
  if (!s) return json({ error: "Unauthenticated" }, 401);

  const p = seg(req);
  const b = await req.json().catch(() => ({} as any));

  /* ---- start a thread ---- */
  if (p[0] === "start") {
    if (!can(s, "message.start")) {
      return json({ error: "Only students can start a conversation from here." }, 403);
    }
    const facultyId = String(b?.facultyId || "");
    const subject = String(b?.subject || "");
    const body = String(b?.body || "");

    const problem = startProblem(subject, body, facultyId);
    if (problem) return json({ error: problem }, 400);

    /* The recipient must actually be teaching staff. Without this a student
       could open a thread against any user id they could name. */
    const target = await prisma.user.findUnique({
      where: { id: facultyId }, select: { id: true, role: true, isActive: true, fullName: true },
    });
    if (!target || !target.isActive || !["FACULTY", "HOD", "HOI"].includes(target.role)) {
      return json({ error: "That person cannot be contacted this way." }, 400);
    }

    const text = body.trim().slice(0, MAX_BODY);
    const conversation = await prisma.conversation.create({
      data: {
        studentId: s.userId, facultyId: target.id, subject: subject.trim(),
        lastSnippet: snippet(text), lastMessageAt: new Date(),
        messages: {
          create: {
            senderId: s.userId, senderName: s.fullName, senderRole: s.role,
            body: text, readByStudent: true,
          },
        },
      },
    });

    await notifyUser(target.id, "Message from " + s.fullName, subject.trim() + " - " + snippet(text, 80));
    return json({ conversation: { id: conversation.id } });
  }

  /* ---- reply ---- */
  if (p[0] === "reply") {
    const c = await prisma.conversation.findUnique({ where: { id: String(b?.id || "") } });
    if (!c || !isParticipant(c, s.userId)) return json({ error: "Not found" }, 404);

    const problem = messageProblem(String(b?.body || ""));
    if (problem) return json({ error: problem }, 400);

    const text = String(b.body).trim().slice(0, MAX_BODY);
    const iAmStudent = c.studentId === s.userId;

    await prisma.message.create({
      data: {
        conversationId: c.id, senderId: s.userId, senderName: s.fullName, senderRole: s.role,
        body: text,
        readByStudent: iAmStudent, readByFaculty: !iAmStudent,
      },
    });
    /* Writing reopens a closed thread. Closing is a tidy-up, not a lock. */
    await prisma.conversation.update({
      where: { id: c.id },
      data: { lastMessageAt: new Date(), lastSnippet: snippet(text), closed: false },
    });

    const other = iAmStudent ? c.facultyId : c.studentId;
    await notifyUser(other, "Reply from " + s.fullName, c.subject + " - " + snippet(text, 80));
    return json({ sent: true });
  }

  /* ---- close ---- */
  if (p[0] === "close") {
    const c = await prisma.conversation.findUnique({ where: { id: String(b?.id || "") } });
    if (!c || !isParticipant(c, s.userId)) return json({ error: "Not found" }, 404);
    await prisma.conversation.update({ where: { id: c.id }, data: { closed: Boolean(b?.closed) } });
    return json({ closed: Boolean(b?.closed) });
  }

  return json({ error: "Not found" }, 404);
}
