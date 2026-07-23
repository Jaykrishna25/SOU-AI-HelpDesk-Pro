import { Router } from "express";
import { authenticate, AuthedRequest } from "../middleware/auth";
import { runAgentPipeline } from "../ai/agents";
import { createTicket } from "../services/ticket.service";

const router = Router();

// The core AI Help Desk endpoint: runs the 12-agent pipeline.
router.post("/ask", authenticate, async (req: AuthedRequest, res) => {
  const { query } = req.body as { query: string };
  const ctx = await runAgentPipeline(query, req.user!.sub);

  let ticket = null;
  if (ctx.decision === "TICKET") {
    ticket = await createTicket({
      creatorId: req.user!.sub,
      subject: query.slice(0, 80),
      description: query,
      category: ctx.intent ?? "GENERAL",
      priority: ctx.priority,
      sentiment: ctx.sentiment,
      aiConfidence: ctx.confidence,
    });
  }

  res.json({
    success: true,
    decision: ctx.decision,
    answer: ctx.decision === "ANSWER" ? ctx.answer : null,
    confidence: ctx.confidence,
    intent: ctx.intent,
    entities: ctx.entities,
    sentiment: ctx.sentiment,
    routedTo: ctx.routedTo,
    ticket,
    agentTrace: ctx.trace,
  });
});

export default router;
