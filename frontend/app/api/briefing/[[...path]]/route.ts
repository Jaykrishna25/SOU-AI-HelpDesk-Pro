export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// The cron run touches every student, so it needs more than the default 10s.
export const maxDuration = 60;
export { GET, POST } from "@/lib/briefing-api";
