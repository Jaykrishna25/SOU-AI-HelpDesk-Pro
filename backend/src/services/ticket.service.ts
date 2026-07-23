import { prisma } from "../config/db";
import { env } from "../config/env";
import { TicketEvent, TicketPriority, Role } from "@prisma/client";
import { notifyWatchers, sendEmail } from "./notification.service";

function ticketCode() {
  const y = new Date().getFullYear();
  const n = Math.floor(1000 + Math.random() * 9000);
  return `TKT-${y}-${n}`;
}

interface CreateTicketInput {
  creatorId: string; subject: string; description: string;
  category: string; priority?: TicketPriority; sentiment?: string; aiConfidence?: number;
}

export async function createTicket(input: CreateTicketInput) {
  const slaDueAt = new Date(Date.now() + env.slaHours * 3600 * 1000);
  const ticket = await prisma.ticket.create({
    data: {
      code: ticketCode(),
      subject: input.subject,
      description: input.description,
      category: input.category,
      priority: input.priority ?? "MEDIUM",
      sentiment: input.sentiment,
      aiConfidence: input.aiConfidence,
      creatorId: input.creatorId,
      slaDueAt,
      history: { create: { event: TicketEvent.CREATED, actor: input.creatorId } },
    },
  });

  // Auto-add watchers: creator + any admins/HOD/owner (governance chain)
  const staff = await prisma.user.findMany({
    where: { role: { in: [Role.ADMIN, Role.HOD, Role.OWNER] }, isActive: true },
    take: 5,
  });
  const watcherIds = [input.creatorId, ...staff.map((s) => s.id)];
  await prisma.ticketWatcher.createMany({
    data: watcherIds.map((userId) => ({ ticketId: ticket.id, userId })),
    skipDuplicates: true,
  });

  await notifyWatchers(ticket.id, `Ticket ${ticket.code} created`, input.subject);
  return ticket;
}

export async function assignTicket(ticketId: string, assigneeId: string, actor: string) {
  const t = await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      assigneeId, status: "ASSIGNED",
      history: { create: { event: TicketEvent.ASSIGNED, actor } },
    },
  });
  await notifyWatchers(ticketId, `Ticket ${t.code} assigned`, "A staff member is now handling your request.");
  return t;
}

export async function resolveTicket(ticketId: string, actor: string, note?: string) {
  const t = await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      status: "RESOLVED", resolvedAt: new Date(),
      history: { create: { event: TicketEvent.RESOLVED, actor, note } },
    },
  });
  await notifyWatchers(ticketId, `Ticket ${t.code} resolved`, note ?? "Your request has been resolved.");
  return t;
}

export async function escalateTicket(ticketId: string, actor: string) {
  const t = await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      status: "ESCALATED", priority: "URGENT",
      history: { create: { event: TicketEvent.ESCALATED, actor } },
    },
  });
  await notifyWatchers(ticketId, `Ticket ${t.code} escalated`, "This ticket has been escalated to higher authority.");
  return t;
}

// SLA sweep: mark breached tickets, generate escalation letters.
export async function runSlaSweep() {
  const overdue = await prisma.ticket.findMany({
    where: { slaBreached: false, resolvedAt: null, slaDueAt: { lt: new Date() },
      status: { notIn: ["RESOLVED", "CLOSED"] } },
    include: { creator: true },
  });
  for (const t of overdue) {
    await prisma.ticket.update({
      where: { id: t.id },
      data: {
        slaBreached: true, status: "ESCALATED",
        history: { create: { event: TicketEvent.SLA_WARNING, actor: "SYSTEM",
          note: "48h admin response SLA breached — auto-escalated" } },
      },
    });
    if (t.creator.email) {
      await sendEmail(t.creator.email, `SLA Escalation — ${t.code}`,
        `Dear ${t.creator.fullName}, your ticket ${t.code} exceeded the 48-hour response SLA and has been escalated to the HOD/Owner.`,
        t.id);
    }
    await notifyWatchers(t.id, `SLA breached — ${t.code}`, "Auto-escalated to HOD/Owner.");
  }
  return overdue.length;
}
