import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatINR } from "@/lib/constants";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Funnel,
  FunnelChart,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const C = ["#0B1B3D", "#2563EB", "#10B981", "#F59E0B", "#F43F5E", "#8B5CF6", "#14B8A6", "#EC4899"];

export default function Reports() {
  const [sources, setSources] = useState([]);
  const [funnel, setFunnel] = useState([]);
  const [weekly, setWeekly] = useState([]);
  const [perf, setPerf] = useState([]);
  const [calls, setCalls] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get("/reports/lead-sources"),
      api.get("/reports/status-funnel"),
      api.get("/reports/weekly-leads"),
      api.get("/reports/employee-performance"),
      api.get("/calls"),
    ]).then(([s, f, w, p, c]) => {
      setSources(s.data);
      setFunnel(f.data);
      setWeekly(w.data);
      setPerf(p.data);
      setCalls(c.data);
    });
  }, []);

  // Call analytics
  const callOutcomes = calls.reduce((acc, c) => {
    acc[c.outcome] = (acc[c.outcome] || 0) + 1;
    return acc;
  }, {});
  const callData = Object.entries(callOutcomes).map(([outcome, count]) => ({ outcome, count }));

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
          Analytics
        </div>
        <h1 className="font-display text-3xl font-black tracking-tight md:text-4xl">Reports</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Lead conversion funnel */}
        <div className="rounded-md border border-[#E2E8F0] bg-white p-5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Lead conversion
          </div>
          <div className="mb-3 font-display text-xl font-bold">Funnel</div>
          <ResponsiveContainer width="100%" height={300}>
            <FunnelChart>
              <Tooltip />
              <Funnel dataKey="count" data={funnel} isAnimationActive>
                {funnel.map((_, i) => (
                  <Cell key={i} fill={C[i % C.length]} />
                ))}
                <LabelList position="right" fill="#0F172A" dataKey="status" />
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        </div>

        {/* Lead sources */}
        <div className="rounded-md border border-[#E2E8F0] bg-white p-5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Channels
          </div>
          <div className="mb-3 font-display text-xl font-bold">Lead sources</div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={sources} dataKey="count" nameKey="source" cx="50%" cy="50%" outerRadius={100}>
                {sources.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly leads */}
        <div className="rounded-md border border-[#E2E8F0] bg-white p-5 lg:col-span-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Trend
          </div>
          <div className="mb-3 font-display text-xl font-bold">Weekly leads</div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={weekly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="week" stroke="#94A3B8" fontSize={11} />
              <YAxis stroke="#94A3B8" fontSize={11} />
              <Tooltip />
              <Line type="monotone" dataKey="leads" stroke="#0B1B3D" strokeWidth={3} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Call analytics */}
        <div className="rounded-md border border-[#E2E8F0] bg-white p-5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Calls
          </div>
          <div className="mb-3 font-display text-xl font-bold">Call outcomes</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={callData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="outcome" stroke="#94A3B8" fontSize={11} />
              <YAxis stroke="#94A3B8" fontSize={11} />
              <Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {callData.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Employee ranking */}
        <div className="rounded-md border border-[#E2E8F0] bg-white p-5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Team
          </div>
          <div className="mb-3 font-display text-xl font-bold">Employee ranking</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={perf} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis type="number" stroke="#94A3B8" fontSize={11} />
              <YAxis dataKey="name" type="category" stroke="#94A3B8" fontSize={10} width={110} />
              <Tooltip />
              <Bar dataKey="won" fill="#10B981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue forecast */}
        <div className="rounded-md border border-[#E2E8F0] bg-white p-5 lg:col-span-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Forecast
          </div>
          <div className="mb-3 font-display text-xl font-bold">Revenue by member</div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="py-2 font-semibold">Member</th>
                  <th className="py-2 font-semibold">Won deals</th>
                  <th className="py-2 font-semibold">Conversion</th>
                  <th className="py-2 font-semibold">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {perf.map((p) => (
                  <tr key={p.user_id} className="border-b border-[#F1F5F9]">
                    <td className="py-3 font-medium text-slate-900">{p.name}</td>
                    <td className="py-3 text-emerald-600 font-semibold">{p.won}</td>
                    <td className="py-3">{p.conversion}%</td>
                    <td className="py-3 font-mono text-xs">{formatINR(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
