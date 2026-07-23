"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { GraduationCap, LogIn, ShieldCheck } from "lucide-react";
import ThreeBackground from "@/components/ThreeBackground";
import ThemeToggle from "@/components/ThemeToggle";

const ROLE_PATH: Record<string, string> = {
  STUDENT: "/student/dashboard",
  ADMIN: "/admin/dashboard",
  FACULTY: "/faculty/dashboard",
  HOD: "/hod/dashboard",
  HOI: "/hod/dashboard",
  OWNER: "/owner/dashboard",
  SUPER_ADMIN: "/owner/dashboard",
};

function inferPath(loginId: string): string {
  const id = loginId.toUpperCase();
  if (id.startsWith("SOU")) return ROLE_PATH.STUDENT;
  if (id.startsWith("ADM")) return ROLE_PATH.ADMIN;
  if (id.startsWith("FAC")) return ROLE_PATH.FACULTY;
  if (id.startsWith("OWN")) return ROLE_PATH.OWNER;
  if (id.startsWith("HOD") || id.startsWith("HOI")) return ROLE_PATH.HOD;
  return ROLE_PATH.STUDENT;
}

const QUICK = [
  { label: "Student", id: "SOU2023CSE69", bd: "2005-05-02" },
  { label: "Admin", id: "ADM001", bd: "2000-05-02" },
  { label: "Faculty", id: "FAC001", bd: "2000-10-05" },
  { label: "HOD", id: "HOD001", bd: "1995-09-05" },
  { label: "HOI", id: "HOD002", bd: "1995-10-05" },
  { label: "Owner", id: "OWN001", bd: "1990-06-09" },
];

export default function Login() {
  const router = useRouter();
  const [loginId, setLoginId] = useState("SOU2023CSE69");
  const [birthdate, setBirthdate] = useState("2005-05-02");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";
      const res = await fetch(base + "/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId, birthdate }),
      }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json();
        if (typeof window !== "undefined") {
          sessionStorage.setItem("sou_token", data.accessToken);
          sessionStorage.setItem("sou_user", JSON.stringify(data.user));
        }
        router.push(ROLE_PATH[data.user.role] || inferPath(loginId));
        return;
      }
      if (res && !res.ok) { setErr("Invalid ID or birthdate."); return; }
      router.push(inferPath(loginId));
    } catch {
      router.push(inferPath(loginId));
    } finally { setLoading(false); }
  };

  return (
    <main className="relative min-h-screen flex items-center justify-center px-6">
      <div className="aurora" /><ThreeBackground />
      <div className="fixed top-6 right-6 z-50"><ThemeToggle /></div>
      <motion.div initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.6 }}
        className="relative z-10 glass p-8 w-full max-w-md">
        <div className="flex items-center gap-2 justify-center mb-2">
          <GraduationCap className="text-brand-light" />
          <span className="font-bold gradient-text text-lg">SOU AI HelpDesk Pro</span>
        </div>
        <p className="text-center text-sm text-[var(--muted)] mb-6">Sign in with your ID and birthdate</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs text-[var(--muted)]">Login ID / Enrollment No.</label>
            <input value={loginId} onChange={(e) => setLoginId(e.target.value)}
              className="w-full mt-1 glass px-4 py-3 bg-transparent outline-none" />
          </div>
          <div>
            <label className="text-xs text-[var(--muted)]">Birthdate</label>
            <input type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)}
              className="w-full mt-1 glass px-4 py-3 bg-transparent outline-none" />
          </div>
          {err && <p className="text-rose-400 text-xs">{err}</p>}
          <button disabled={loading}
            className="w-full py-3 rounded-full bg-brand text-white font-semibold glow flex items-center justify-center gap-2 hover:bg-brand-light transition">
            <LogIn size={18} /> {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        <div className="mt-6">
          <p className="text-xs text-[var(--muted)] mb-2 flex items-center gap-1"><ShieldCheck size={12} /> Quick demo logins</p>
          <div className="grid grid-cols-3 gap-2">
            {QUICK.map((d) => (
              <button key={d.label} onClick={() => { setLoginId(d.id); setBirthdate(d.bd); }}
                className="glass py-2 text-xs hover:bg-brand/20 transition">{d.label}</button>
            ))}
          </div>
        </div>
      </motion.div>
    </main>
  );
}
