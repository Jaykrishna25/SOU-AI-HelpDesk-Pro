"use client";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const revenue = [
  { m: "Feb", v: 42 }, { m: "Mar", v: 55 }, { m: "Apr", v: 61 },
  { m: "May", v: 78 }, { m: "Jun", v: 74 }, { m: "Jul", v: 92 },
];
const tickets = [
  { c: "Exams", n: 120 }, { c: "Fees", n: 90 }, { c: "Results", n: 75 },
  { c: "Attend.", n: 60 }, { c: "Hostel", n: 40 },
];
const pie = [
  { name: "Auto-resolved", value: 68 }, { name: "Ticketed", value: 22 }, { name: "Escalated", value: 10 },
];
const COLORS = ["#8b5cf6", "#06b6d4", "#f43f5e"];

export default function AnalyticsCharts() {
  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="glass p-5">
        <h4 className="font-semibold mb-3 text-sm">Revenue Trend (₹ Lakh)</h4>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={revenue}>
            <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.7} />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient></defs>
            <XAxis dataKey="m" stroke="#9aa0b4" fontSize={11} />
            <YAxis stroke="#9aa0b4" fontSize={11} />
            <Tooltip contentStyle={{ background: "#14142b", border: "none", borderRadius: 12 }} />
            <Area type="monotone" dataKey="v" stroke="#8b5cf6" fill="url(#g)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="glass p-5">
        <h4 className="font-semibold mb-3 text-sm">Tickets by Category</h4>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={tickets}>
            <XAxis dataKey="c" stroke="#9aa0b4" fontSize={11} />
            <YAxis stroke="#9aa0b4" fontSize={11} />
            <Tooltip contentStyle={{ background: "#14142b", border: "none", borderRadius: 12 }} />
            <Bar dataKey="n" fill="#06b6d4" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="glass p-5">
        <h4 className="font-semibold mb-3 text-sm">AI Resolution Mix</h4>
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie data={pie} dataKey="value" innerRadius={45} outerRadius={70} paddingAngle={4}>
              {pie.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
            </Pie>
            <Tooltip contentStyle={{ background: "#14142b", border: "none", borderRadius: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
