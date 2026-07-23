import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { env } from "./config/env";
import { errorHandler } from "./middleware/error";
import authRoutes from "./routes/auth.routes";
import aiRoutes from "./routes/ai.routes";
import ticketRoutes from "./routes/ticket.routes";
import analyticsRoutes from "./routes/analytics.routes";
import dataRoutes from "./routes/data.routes";
import { runSlaSweep } from "./services/ticket.service";

const app = express();
app.use(helmet());
app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));
app.use(rateLimit({ windowMs: 60_000, max: 120 }));

app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "SOU AI HelpDesk Pro", ts: Date.now() }));
app.use("/api/auth", authRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api", dataRoutes);

app.use(errorHandler);

// Background SLA sweep every 15 minutes.
setInterval(() => { runSlaSweep().catch(console.error); }, 15 * 60 * 1000);

app.listen(env.port, () => {
  console.log(`🚀 SOU AI HelpDesk Pro API running on http://localhost:${env.port}`);
});

export default app;
