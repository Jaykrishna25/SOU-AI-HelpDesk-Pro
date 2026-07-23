import dotenv from "dotenv";
// Load backend/.env first, then repo-root .env as fallback (local dev).
dotenv.config();
dotenv.config({ path: "../.env" });

export const env = {
  port: Number(process.env.PORT || 5001),
  nodeEnv: process.env.NODE_ENV || "development",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",
  jwtAccess: process.env.JWT_ACCESS_SECRET || "dev-access",
  jwtRefresh: process.env.JWT_REFRESH_SECRET || "dev-refresh",
  accessTtl: process.env.ACCESS_TOKEN_TTL || "15m",
  refreshTtl: process.env.REFRESH_TOKEN_TTL || "7d",
  aiThreshold: Number(process.env.AI_CONFIDENCE_THRESHOLD || 0.9),
  slaHours: Number(process.env.ADMIN_RESPONSE_SLA_HOURS || 48),
};
