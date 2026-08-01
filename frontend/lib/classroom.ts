"use client";
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
const SCOPES = [
  "https://www.googleapis.com/auth/classroom.courses.readonly",
  "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
  "https://www.googleapis.com/auth/classroom.announcements.readonly",
].join(" ");

export interface GcCourse { id: string; name: string; section?: string; teacher?: string; }
export interface GcWork { id: string; courseId: string; title: string; dueDate?: string; state?: string; }

export const classroomConfigured = (): boolean => Boolean(CLIENT_ID);
export const getToken = (): string | null =>
  typeof window === "undefined" ? null : sessionStorage.getItem("gc_token");

const MOCK_COURSES: GcCourse[] = [
  { id: "c1", name: "Data Structures & Algorithms", section: "CSE Sem 5 - A", teacher: "Akshay Sir" },
  { id: "c2", name: "Database Management Systems", section: "CSE Sem 5 - A", teacher: "Sagar Sir" },
  { id: "c3", name: "Operating Systems", section: "CSE Sem 5 - A", teacher: "Akshay Sir" },
];
const MOCK_WORK: GcWork[] = [
  { id: "w1", courseId: "c1", title: "Assignment 3 - Binary Trees", dueDate: "2026-08-12", state: "PUBLISHED" },
  { id: "w2", courseId: "c2", title: "Lab Record - Normalization", dueDate: "2026-08-15", state: "PUBLISHED" },
  { id: "w3", courseId: "c3", title: "Quiz - CPU Scheduling", dueDate: "2026-08-18", state: "PUBLISHED" },
];

export function connectClassroom(onDone: (ok: boolean, msg: string) => void) {
  if (!CLIENT_ID) { onDone(false, "Google Client ID is not configured. Showing sample data."); return; }
  const start = () => {
    try {
      const g = (window as any).google;
      const client = g.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (resp: any) => {
          if (resp?.access_token) {
            sessionStorage.setItem("gc_token", resp.access_token);
            onDone(true, "Connected to Google Classroom.");
          } else onDone(false, "Google did not return an access token.");
        },
      });
      client.requestAccessToken();
    } catch { onDone(false, "Could not start Google sign-in."); }
  };
  if ((window as any).google?.accounts?.oauth2) { start(); return; }
  const s = document.createElement("script");
  s.src = "https://accounts.google.com/gsi/client";
  s.async = true; s.onload = start;
  s.onerror = () => onDone(false, "Could not load Google Identity Services.");
  document.head.appendChild(s);
}

export function disconnectClassroom() {
  try { sessionStorage.removeItem("gc_token"); } catch {}
}

async function gcGet<T>(path: string, token: string): Promise<T> {
  const res = await fetch("https://classroom.googleapis.com/v1" + path, {
    headers: { Authorization: "Bearer " + token },
  });
  if (!res.ok) throw new Error("Google Classroom request failed (" + res.status + ")");
  return (await res.json()) as T;
}

export async function listCourses(): Promise<{ live: boolean; courses: GcCourse[] }> {
  const token = getToken();
  if (!token) return { live: false, courses: MOCK_COURSES };
  try {
    const data = await gcGet<{ courses?: any[] }>("/courses?courseStates=ACTIVE", token);
    return {
      live: true,
      courses: (data.courses || []).map((c) => ({ id: c.id, name: c.name, section: c.section, teacher: c.ownerId })),
    };
  } catch { return { live: false, courses: MOCK_COURSES }; }
}

export async function listWork(courseId: string): Promise<{ live: boolean; work: GcWork[] }> {
  const token = getToken();
  if (!token) return { live: false, work: MOCK_WORK.filter((w) => w.courseId === courseId) };
  try {
    const data = await gcGet<{ courseWork?: any[] }>(`/courses/${courseId}/courseWork`, token);
    return {
      live: true,
      work: (data.courseWork || []).map((w) => ({
        id: w.id, courseId,
        title: w.title,
        dueDate: w.dueDate ? `${w.dueDate.year}-${String(w.dueDate.month).padStart(2, "0")}-${String(w.dueDate.day).padStart(2, "0")}` : undefined,
        state: w.state,
      })),
    };
  } catch { return { live: false, work: MOCK_WORK.filter((w) => w.courseId === courseId) }; }
}
