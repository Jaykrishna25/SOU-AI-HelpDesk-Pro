import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/server-auth";

const EXAM_CELL = ["ADMIN", "HOD", "HOI", "OWNER", "SUPER_ADMIN"];

function json(d: any, s = 200) { return NextResponse.json(d, { status: s }); }
async function who(req: NextRequest) {
  const s: any = await getSession(req as any);
  if (!s) return null;
  return { id: String(s.userId || s.id || s.sub || ""), role: String(s.role || s.roleCode || "STUDENT").toUpperCase(), name: String(s.name || s.fullName || "User") };
}
function seg(req: NextRequest) {
  return new URL(req.url).pathname.replace(/^\/api\/exam\/?/, "").split("/").filter(Boolean);
}

type Stu = { name: string; enrollment: string; course: string };
type Room = { room: string; rows: number; cols: number };

// Greedy allocator: never place the same course beside or directly behind another.
function allocate(students: Stu[], rooms: Room[]) {
  const buckets = new Map<string, Stu[]>();
  for (const s of students) {
    const k = (s.course || "GENERAL").trim().toUpperCase();
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k)!.push(s);
  }
  const grid: Record<string, (string | null)[][]> = {};
  for (const r of rooms) grid[r.room] = Array.from({ length: r.rows }, () => Array(r.cols).fill(null));

  const take = (forbidden: Set<string>) => {
    let key: string | null = null, n = -1;
    for (const [k, v] of buckets) if (!forbidden.has(k) && v.length > n) { key = k; n = v.length; }
    if (!key) for (const [k, v] of buckets) if (v.length > n) { key = k; n = v.length; }
    if (!key) return null;
    const s = buckets.get(key)!.shift()!;
    if (!buckets.get(key)!.length) buckets.delete(key);
    return { ...s, course: key };
  };

  const seats: any[] = [];
  for (const r of rooms) {
    for (let row = 0; row < r.rows; row++) {
      for (let col = 0; col < r.cols; col++) {
        const forbid = new Set<string>();
        const left = col > 0 ? grid[r.room][row][col - 1] : null;
        const up = row > 0 ? grid[r.room][row - 1][col] : null;
        if (left) forbid.add(left);
        if (up) forbid.add(up);
        const s = take(forbid);
        if (!s) { row = r.rows; break; }
        grid[r.room][row][col] = s.course;
        seats.push({
          room: r.room, rowNo: row + 1, colNo: col + 1,
          seatNo: r.room + "-R" + (row + 1) + "C" + (col + 1),
          studentName: s.name, enrollment: s.enrollment, course: s.course,
        });
      }
    }
  }

  let violations = 0;
  for (const r of rooms) {
    const g = grid[r.room];
    for (let row = 0; row < r.rows; row++)
      for (let col = 0; col < r.cols; col++) {
        const c = g[row][col]; if (!c) continue;
        if (col > 0 && g[row][col - 1] === c) violations++;
        if (row > 0 && g[row - 1][col] === c) violations++;
      }
  }
  let unseated = 0;
  for (const v of buckets.values()) unseated += v.length;
  return { seats, violations, unseated };
}

export async function GET(req: NextRequest) {
  const u = await who(req);
  if (!u) return json({ error: "Unauthorised" }, 401);
  const s = seg(req);
  const q = new URL(req.url).searchParams;

  if (s[0] === "plans") {
    const items = await prisma.seatingPlan.findMany({
      orderBy: { createdAt: "desc" }, take: 50,
      include: { _count: { select: { seats: true } } },
    });
    return json({ items });
  }
  if (s[0] === "plan") {
    const p = await prisma.seatingPlan.findUnique({
      where: { id: q.get("id") || "" },
      include: { seats: { orderBy: [{ room: "asc" }, { rowNo: "asc" }, { colNo: "asc" }] } },
    });
    if (!p) return json({ error: "Plan not found" }, 404);
    return json({ plan: p, rooms: JSON.parse(p.roomsJson || "[]") });
  }
  return json({ error: "Not found" }, 404);
}

export async function POST(req: NextRequest) {
  const u = await who(req);
  if (!u) return json({ error: "Unauthorised" }, 401);
  if (!EXAM_CELL.includes(u.role)) return json({ error: "Exam cell access only" }, 403);
  const b = await req.json().catch(() => ({}));

  const students: Stu[] = Array.isArray(b.students) ? b.students : [];
  const rooms: Room[] = Array.isArray(b.rooms) ? b.rooms : [];
  if (!students.length) return json({ error: "No students supplied" }, 400);
  if (!rooms.length) return json({ error: "No rooms configured" }, 400);

  const capacity = rooms.reduce((a, r) => a + r.rows * r.cols, 0);
  if (capacity < students.length)
    return json({ error: "Seats available: " + capacity + ", students: " + students.length + ". Add rooms or increase rows/columns." }, 400);

  const { seats, violations, unseated } = allocate(students, rooms);

  const plan = await prisma.seatingPlan.create({
    data: {
      code: "EX-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
      examName: String(b.examName || "Untitled exam").slice(0, 120),
      examDate: b.examDate ? new Date(b.examDate) : new Date(),
      rule: "NO_SAME_COURSE_ADJACENT",
      roomsJson: JSON.stringify(rooms),
      totalSeats: seats.length,
      createdBy: u.name + " (" + u.role + ")",
      seats: { create: seats },
    },
  });
  return json({ id: plan.id, code: plan.code, seated: seats.length, violations, unseated });
}

export async function DELETE(req: NextRequest) {
  const u = await who(req);
  if (!u) return json({ error: "Unauthorised" }, 401);
  if (!EXAM_CELL.includes(u.role)) return json({ error: "Exam cell access only" }, 403);
  const id = new URL(req.url).searchParams.get("id") || "";
  await prisma.seatingPlan.delete({ where: { id } });
  return json({ ok: true });
}

export async function PATCH() { return json({ error: "Not supported" }, 405); }
