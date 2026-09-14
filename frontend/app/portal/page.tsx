"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { SceneWorld } from "@/components/sou/Scenes";

function token() {
  try { return sessionStorage.getItem("sou_token") || localStorage.getItem("sou_token") || ""; }
  catch { return ""; }
}

export default function PortalWorld() {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [leaving, setLeaving] = useState(false);

  /* route guard - no session, no dashboard */
  useEffect(() => {
    if (token()) setAuthed(true);
    else { setAuthed(false); router.replace("/login"); }
  }, [router]);

  async function exitPortal() {
    if (leaving) return;
    setLeaving(true);                       // cards dissolve via exit animation
    await new Promise(r => setTimeout(r, 900));
    router.push("/?story=exit");            // landing resumes the exit sequence
  }

  if (authed !== true) {
    return (
      <main className="sou-stage fixed inset-0 flex items-center justify-center">
        <div className="w-7 h-7 rounded-full border-2 animate-spin"
          style={{ borderColor: "rgba(245,241,232,.15)", borderTopColor: "var(--gold)" }} />
      </main>
    );
  }

  return (
    <main className="sou-stage fixed inset-0">
      <AnimatePresence>
        {!leaving && <SceneWorld key="world" onExit={exitPortal} busy={leaving} />}
      </AnimatePresence>
      <AnimatePresence>
        {leaving && (
          <motion.div key="fade" className="absolute inset-0 sou-z-ui pointer-events-none"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: .85 }} style={{ background: "var(--ink)" }} />
        )}
      </AnimatePresence>
    </main>
  );
}
