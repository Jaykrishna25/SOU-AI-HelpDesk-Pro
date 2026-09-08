"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { GraduationCap, LogIn, ShieldCheck, UserPlus, Copy, CheckCircle2 } from "lucide-react";
import ThreeBackground from "@/components/ThreeBackground";
import ThemeToggle from "@/components/ThemeToggle";
import { sendMailTo } from "@/lib/email";

const INSTITUTES = [
  "College of Engineering and Technology",
  "Silver Oak College of Computer Application",
  "Silver Oak Institute of Management",
  "Silver Oak Institute of Business Management",
  "Silver Oak Commerce College",
  "Silver Oak Institute of Design",
  "Silver Oak College of Aviation Technology",
  "Silver Oak College of Animation and Multimedia",
  "College of Pharmacy",
  "Silver Oak College of Nursing",
  "Silver Oak College of Physiotherapy",
  "Silver Oak College of Allied and Health Care",
  "Silver Oak Law College",
  "Silver Oak Institute of Science",
  "Silver Oak College of Humanities and Social Science",
  "Silver Oak Institute of Liberal & Professional Studies",
  "Silver Oak College of Vocational Education",
];

const ROLES = [
  { value: "STUDENT", label: "Student" },
  { value: "FACULTY", label: "Faculty" },
  { value: "ADMIN", label: "Admin" },
  { value: "HOD", label: "HOD (Head of Department)" },
  { value: "HOI", label: "HOI (Head of Institute)" },
  { value: "OWNER", label: "Owner / Management" },
];

const ROLE_PATH: Record<string, string> = {
  STUDENT: "/student/dashboard",
  ADMIN: "/admin/dashboard",
  FACULTY: "/faculty/dashboard",
  HOD: "/hod/dashboard",
  HOI: "/hod/dashboard",
  OWNER: "/owner/dashboard",
  SUPER_ADMIN: "/owner/dashboard",
};

const QUICK = [
  { label: "Student", id: "SOU2023CSE69", bd: "2005-05-02" },
  { label: "Admin", id: "ADM001", bd: "2000-05-02" },
  { label: "Faculty", id: "FAC001", bd: "2000-10-05" },
  { label: "HOD", id: "HOD001", bd: "1995-09-05" },
  { label: "HOI", id: "HOD002", bd: "1995-10-05" },
  { label: "Owner", id: "OWN001", bd: "1990-06-09" },
];

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"login" | "signup">("login");

  const [loginId, setLoginId] = useState("SOU2023CSE69");
  const [birthdate, setBirthdate] = useState("2005-05-02");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const [su, setSu] = useState({
    fullName: "", email: "", phone: "", birthdate: "",
    role: "STUDENT", institute: INSTITUTES[0], course: "",
  });
  const [suErr, setSuErr] = useState("");
  const [suLoading, setSuLoading] = useState(false);
  const [newId, setNewId] = useState("");
  const [mailNote, setMailNote] = useState("");
  const [copied, setCopied] = useState(false);

  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId: loginId.trim(), birthdate }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) { setErr(data.error || "Invalid ID or birthdate."); return; }
      sessionStorage.setItem("sou_token", data.token);
      sessionStorage.setItem("sou_user", JSON.stringify(data.user));
      router.push(ROLE_PATH[data.user.role] || "/student/dashboard");
    } catch {
      setErr("Could not reach the server. Please try again.");
    } finally { setLoading(false); }
  };

  const submitSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuErr(""); setSuLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(su),
      });
      const data = await res.json();
      if (!res.ok || !data.success) { setSuErr(data.error || "Could not create the account."); return; }
      setNewId(data.loginId);
      const roleLabel = ROLES.find((r) => r.value === su.role)?.label || "Student";
      const sent = await sendMailTo(su.email, "Your SOU HelpDesk login details",
        "Welcome " + su.fullName + ".\n\n" +
        "Your account has been created on SOU AI HelpDesk Pro.\n\n" +
        "Login ID: " + data.loginId + "\n" +
        "Password: your date of birth (" + su.birthdate + ")\n" +
        "Role: " + roleLabel + "\n" +
        "Institute: " + su.institute + "\n" +
        "Course / Department: " + su.course + "\n\n" +
        "Please keep this ID safe. You can sign in from the portal login page.");
      setMailNote(sent ? "A copy has been emailed to " + su.email + "." : "Email delivery is not configured, so please copy your ID from this screen.");
    } catch {
      setSuErr("Could not reach the server. Please try again.");
    } finally { setSuLoading(false); }
  };

  const useNewId = () => { setTab("login"); setLoginId(newId); setBirthdate(su.birthdate); setNewId(""); };

  return (
    <main className="relative min-h-screen flex items-center justify-center px-4 py-10">
      <div className="aurora" /><ThreeBackground />
      <div className="fixed top-6 right-6 z-50"><ThemeToggle /></div>

      <motion.div initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.6 }}
        className="relative z-10 glass p-6 sm:p-8 w-full max-w-md">
        <div className="flex items-center gap-2 justify-center mb-1">
          <GraduationCap className="text-brand-light" />
          <span className="font-bold gradient-text text-lg">SOU AI HelpDesk Pro</span>
        </div>

        <div className="flex gap-2 my-5">
          <button onClick={() => setTab("login")}
            className={`flex-1 py-2 rounded-full text-sm transition ${tab === "login" ? "bg-brand text-white" : "glass text-[var(--muted)]"}`}>Login</button>
          <button onClick={() => setTab("signup")}
            className={`flex-1 py-2 rounded-full text-sm transition ${tab === "signup" ? "bg-brand text-white" : "glass text-[var(--muted)]"}`}>Sign Up</button>
        </div>

        {tab === "login" && (
          <>
            <p className="text-center text-xs text-[var(--muted)] mb-4">Sign in with your ID and birthdate</p>
            <form onSubmit={submitLogin} className="space-y-4">
              <div>
                <label className="text-xs text-[var(--muted)]">Login ID / Enrollment No.</label>
                <input value={loginId} onChange={(e) => setLoginId(e.target.value)}
                  className="w-full mt-1 glass px-4 py-3 bg-transparent outline-none" />
              </div>
              <div>
                <label className="text-xs text-[var(--muted)]">Birthdate (this is your password)</label>
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
          </>
        )}

        {tab === "signup" && !newId && (
          <>
            <p className="text-center text-xs text-[var(--muted)] mb-4">Register to get your unique login ID</p>
            <form onSubmit={submitSignup} className="space-y-3">
              <div>
                <label className="text-xs text-[var(--muted)]">I am registering as</label>
                <select value={su.role} onChange={(e) => setSu({ ...su, role: e.target.value })}
                  className="w-full mt-1 glass px-4 py-3 bg-transparent outline-none text-sm" style={{ color: "var(--text)" }}>
                  {ROLES.map((r) => <option key={r.value} value={r.value} style={{ color: "#111" }}>{r.label}</option>)}
                </select>
              </div>
              <input required value={su.fullName} onChange={(e) => setSu({ ...su, fullName: e.target.value })}
                placeholder="Full name" className="w-full glass px-4 py-3 bg-transparent outline-none text-sm" />
              <input required type="email" value={su.email} onChange={(e) => setSu({ ...su, email: e.target.value })}
                placeholder="Email address" className="w-full glass px-4 py-3 bg-transparent outline-none text-sm" />
              <input required value={su.phone} onChange={(e) => setSu({ ...su, phone: e.target.value })}
                placeholder="Phone number" className="w-full glass px-4 py-3 bg-transparent outline-none text-sm" />
              <div>
                <label className="text-xs text-[var(--muted)]">Date of birth (becomes your password)</label>
                <input required type="date" value={su.birthdate} onChange={(e) => setSu({ ...su, birthdate: e.target.value })}
                  className="w-full mt-1 glass px-4 py-3 bg-transparent outline-none text-sm" />
              </div>
              <select value={su.institute} onChange={(e) => setSu({ ...su, institute: e.target.value })}
                className="w-full glass px-4 py-3 bg-transparent outline-none text-sm" style={{ color: "var(--text)" }}>
                {INSTITUTES.map((i) => <option key={i} value={i} style={{ color: "#111" }}>{i}</option>)}
              </select>
              <input required value={su.course} onChange={(e) => setSu({ ...su, course: e.target.value })}
                placeholder={su.role === "STUDENT" ? "Course (e.g. B.Tech CSE)" : "Department / subject"}
                className="w-full glass px-4 py-3 bg-transparent outline-none text-sm" />
              {suErr && <p className="text-rose-400 text-xs">{suErr}</p>}
              <button disabled={suLoading}
                className="w-full py-3 rounded-full bg-brand text-white font-semibold glow flex items-center justify-center gap-2 hover:bg-brand-light transition">
                <UserPlus size={18} /> {suLoading ? "Creating account..." : "Create Account"}
              </button>
            </form>
          </>
        )}

        {tab === "signup" && newId && (
          <div className="text-center py-4">
            <CheckCircle2 className="mx-auto text-emerald-400 mb-3" size={40} />
            <p className="font-semibold mb-1">Account created</p>
            <p className="text-xs text-[var(--muted)] mb-4">Save your login ID. Your password is your date of birth.</p>
            <div className="glass px-4 py-4 mb-3">
              <div className="text-xs text-[var(--muted)]">Your unique login ID</div>
              <div className="text-2xl font-bold gradient-text tracking-wide my-1">{newId}</div>
              <button onClick={() => { navigator.clipboard.writeText(newId); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                className="text-xs text-brand-light flex items-center gap-1 mx-auto">
                <Copy size={12} /> {copied ? "Copied" : "Copy ID"}
              </button>
            </div>
            {mailNote && <p className="text-xs text-[var(--muted)] mb-4">{mailNote}</p>}
            <button onClick={useNewId} className="w-full py-3 rounded-full bg-brand text-white font-semibold">Continue to Login</button>
          </div>
        )}
      </motion.div>
    </main>
  );
}
