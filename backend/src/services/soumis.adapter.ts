export type SouMisMode = "mock" | "live";

export const soumisConfig = {
  mode: (process.env.SOUMIS_MODE as SouMisMode) || "mock",
  baseUrl: process.env.SOUMIS_BASE_URL || "",
  apiKey: process.env.SOUMIS_API_KEY || "",
  timeoutMs: Number(process.env.SOUMIS_TIMEOUT_MS || 10000),
};

export class SouMisNotAuthorizedError extends Error {
  constructor(message: string) { super(message); this.name = "SouMisNotAuthorizedError"; }
}

export interface MisStudent {
  enrollmentNo: string; fullName: string; program: string;
  semester: number; department: string;
}
export interface MisAttendanceRecord {
  enrollmentNo: string; subjectCode: string; date: string;
  status: "PRESENT" | "ABSENT"; markedBy: string;
}
export interface MisAttendanceSummary {
  enrollmentNo: string; subjectCode: string;
  attended: number; total: number; percentage: number;
}
export interface MisSyncResult {
  mode: SouMisMode; synced: number; skipped: number; at: string; source: string;
}

const MOCK_STUDENTS: MisStudent[] = [
  { enrollmentNo: "SOU2023CSE69", fullName: "Navlani Jaykrishna Satishkumar", program: "B.Tech CSE", semester: 5, department: "CSE" },
  { enrollmentNo: "SOU2023CSE02", fullName: "Harsh Barot LaxmanBhai", program: "B.Tech CSE", semester: 5, department: "CSE" },
  { enrollmentNo: "SOU2023CSE65", fullName: "Zala Rudraraj Sinh", program: "B.Tech CSE", semester: 5, department: "CSE" },
  { enrollmentNo: "SOU2023CSE05", fullName: "Ashok Sharma", program: "B.Tech CSE", semester: 5, department: "CSE" },
];

const MOCK_SUMMARY: MisAttendanceSummary[] = [
  { enrollmentNo: "SOU2023CSE69", subjectCode: "CS301", attended: 22, total: 25, percentage: 88 },
  { enrollmentNo: "SOU2023CSE69", subjectCode: "CS302", attended: 23, total: 25, percentage: 92 },
  { enrollmentNo: "SOU2023CSE02", subjectCode: "CS301", attended: 24, total: 25, percentage: 96 },
];

function assertLiveReady(): void {
  if (!soumisConfig.baseUrl || !soumisConfig.apiKey) {
    throw new SouMisNotAuthorizedError(
      "SOU MIS live mode is not configured. An official API base URL and credentials " +
      "issued by the SOU MIS/IT department are required. Running in mock mode instead."
    );
  }
}

async function misRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  assertLiveReady();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), soumisConfig.timeoutMs);
  try {
    const res = await fetch(soumisConfig.baseUrl + path, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${soumisConfig.apiKey}`,
        ...(init.headers || {}),
      },
    });
    if (res.status === 401 || res.status === 403)
      throw new SouMisNotAuthorizedError("SOU MIS rejected the credentials for " + path);
    if (!res.ok) throw new Error(`SOU MIS request failed (${res.status}) for ${path}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export const SouMisAdapter = {
  mode(): SouMisMode { return soumisConfig.mode; },

  isLive(): boolean {
    return soumisConfig.mode === "live" && Boolean(soumisConfig.baseUrl && soumisConfig.apiKey);
  },

  status() {
    return {
      mode: soumisConfig.mode,
      live: this.isLive(),
      configured: Boolean(soumisConfig.baseUrl && soumisConfig.apiKey),
      systems: {
        account: "https://account.soumis.in/",
        curriculum: "https://curriculum.soumis.in/PostAttendance/Index",
      },
      note: this.isLive()
        ? "Connected to the official SOU MIS API."
        : "Mock mode. Live access requires API credentials approved by SOU MIS/IT.",
    };
  },

  async getStudents(department: string, semester: number): Promise<MisStudent[]> {
    if (!this.isLive())
      return MOCK_STUDENTS.filter((s) => s.department === department && s.semester === semester);
    return misRequest<MisStudent[]>(`/api/students?department=${encodeURIComponent(department)}&semester=${semester}`);
  },

  async getAttendanceSummary(enrollmentNo: string): Promise<MisAttendanceSummary[]> {
    if (!this.isLive())
      return MOCK_SUMMARY.filter((a) => a.enrollmentNo === enrollmentNo);
    return misRequest<MisAttendanceSummary[]>(`/api/attendance/summary?enrollmentNo=${encodeURIComponent(enrollmentNo)}`);
  },

  async postAttendance(records: MisAttendanceRecord[], idempotencyKey: string): Promise<MisSyncResult> {
    if (!this.isLive()) {
      return {
        mode: "mock", synced: records.length, skipped: 0,
        at: new Date().toISOString(),
        source: "mock-adapter (no data written to the university system)",
      };
    }
    const result = await misRequest<{ synced: number; skipped: number }>("/api/attendance", {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: JSON.stringify({ records }),
    });
    return { mode: "live", synced: result.synced, skipped: result.skipped, at: new Date().toISOString(), source: soumisConfig.baseUrl };
  },

  async syncRoster(department: string, semester: number): Promise<MisSyncResult> {
    const students = await this.getStudents(department, semester);
    return {
      mode: this.isLive() ? "live" : "mock",
      synced: students.length, skipped: 0,
      at: new Date().toISOString(),
      source: this.isLive() ? soumisConfig.baseUrl : "mock-adapter",
    };
  },
};
