"use client";
import { motion } from "framer-motion";

export default function Panel({ title, children, delay = 0 }: { title: string; children: React.ReactNode; delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="glass p-6">
      <h3 className="font-semibold mb-4">{title}</h3>
      {children}
    </motion.div>
  );
}
