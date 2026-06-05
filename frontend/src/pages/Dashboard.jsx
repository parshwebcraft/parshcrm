import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { formatINR, relTime } from "@/lib/constants";
import {
  ArrowUpRight,
  UsersThree,
  Plus,
  Phone,
  ListChecks,
  Trophy,
  XCircle,
  Coins,
  ChartLineUp,
} from "@phosphor-icons/react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const CHART_COLORS = ["#0B1B3D", "#2563EB", "#10B981", "#F59E0B", "#F43F5E", "#8B5CF6", "#14B8A6", "#EC4899"];

function KPI({ icon: Icon, label, value, accent, testid }) {
  return (
    <div
      data-testid={testid}
      className="animate-slide-up rounded-md border border-[#E2E8F0] bg-white p-5 transition-shadow hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <div className={`grid h-10 w-10 place-items-center rounded-md ${accent}`}>
          <Icon size={20} weight="duotone" />
        </div>
        <ArrowUpRight size={18} className="text-slate-300" />
      </div>
      <div className="mt-4 font-display text-3xl font-black tracking-tight text-slate-900">
        {value}
      </div>
      <div className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const nav = useNavigate();
  const [stats, setStats] = useState(null);
  const [sources, setSources] = useState([]);
  const [funnel, setFunnel] = useState([]);
  const [weekly, setWeekly] = useState([]);
  const [perf, setPerf] = useState([]);
  const [acts, setActs] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get("/dashboard/stats"),
      api.get("/reports/lead-sources"),
      api.get("/reports/status-funnel"),
      api.get("/reports/weekly-leads"),
      api.get("/reports/employee-performance"),
      api.get("/reports/recent-activities"),
    ]).then(([s, src, fn, wk, p, a]) => {
      setStats(s.data);
      setSources(src.data);
      setFunnel(fn.data);
      setWeekly(wk.data);
      setPerf(p.data);
      setActs(a.data);
    });
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
            Overview
          </div>
          <h1 className="font-display text-3xl font-black tracking-tight md:text-4xl">
            Dashboard
          </h1>
        </div>
        <button
          data-testid="dashboard-new-lead-btn"
          onClick={() => nav("/leads")}
          className="hidden md:inline-flex items-center gap-2 rounded-md bg-[#0B1B3D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#142D66]"
        >
          <Plus size={16} weight="bold" /> New lead
        </button>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KPI testid="kpi-total-leads" icon={UsersThree} label="Total leads" value={stats?.total_leads ?? "—"} accent="bg-[#0B1B3D]/10 text-[#0B1B3D]" />
        <KPI testid="kpi-new-today" icon={Plus} label="New today" value={stats?.new_today ?? "—"} accent="bg-emerald-50 text-emerald-700" />
        <KPI testid="kpi-calls-today" icon={Phone} label="Calls today" value={stats?.calls_today ?? "—"} accent="bg-blue-50 text-blue-700" />
        <KPI testid="kpi-pending" icon={ListChecks} label="Pending tasks" value={stats?.pending_followups ?? "—"} accent="bg-amber-50 text-amber-700" />
        <KPI testid="kpi-won" icon={Trophy} label="Won deals" value={stats?.won_deals ?? "—"} accent="bg-emerald-50 text-emerald-700" />
        <KPI testid="kpi-lost" icon={XCircle} label="Lost deals" value={stats?.lost_deals ?? "—"} accent="bg-rose-50 text-rose-700" />
        <KPI testid="kpi-pipeline" icon={Coins} label="Pipeline" value={stats ? formatINR(stats.revenue_pipeline) : "—"} accent="bg-violet-50 text-violet-700" />
        <KPI testid="kpi-revenue" icon={ChartLineUp} label="Revenue won" value={stats ? formatINR(stats.revenue_won) : "—"} accent="bg-[#0B1B3D]/10 text-[#0B1B3D]" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-md border border-[#E2E8F0] bg-white p-5 lg:col-span-2">
          <div className="mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
            Weekly leads
          </div>
          <div className="mb-4 font-display text-xl font-bold">Acquisition trend</div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={weekly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="week" stroke="#94A3B8" fontSize={11} />
              <YAxis stroke="#94A3B8" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: "#0B1B3D",
                  border: "none",
                  color: "white",
                  borderRadius: 6,
                }}
                labelStyle={{ color: "white" }}
              />
              <Line type="monotone" dataKey="leads" stroke="#0B1B3D" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-md border border-[#E2E8F0] bg-white p-5">
          <div className="mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
            Lead sources
          </div>
          <div className="mb-4 font-display text-xl font-bold">Channels</div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={sources}
                dataKey="count"
                nameKey="source"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={2}
              >
                {sources.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-md border border-[#E2E8F0] bg-white p-5 lg:col-span-2">
          <div className="mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
            Status funnel
          </div>
          <div className="mb-4 font-display text-xl font-bold">Conversion stages</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={funnel} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis type="number" stroke="#94A3B8" fontSize={11} />
              <YAxis dataKey="status" type="category" stroke="#94A3B8" fontSize={11} width={100} />
              <Tooltip />
              <Bar dataKey="count" fill="#0B1B3D" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-md border border-[#E2E8F0] bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                Recent activity
              </div>
              <div className="font-display text-xl font-bold">Latest</div>
            </div>
          </div>
          <div className="flex max-h-[260px] flex-col gap-2 overflow-y-auto">
            {acts.slice(0, 12).map((a) => (
              <div key={a.id} className="rounded-md border border-[#F1F5F9] p-2.5 text-xs">
                <div className="font-medium text-slate-900">
                  {a.description}
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
                  <span>{a.user_name || "System"}</span>
                  <span>{relTime(a.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance */}
      <div className="rounded-md border border-[#E2E8F0] bg-white p-5">
        <div className="mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
          Team
        </div>
        <div className="mb-4 font-display text-xl font-bold">Top performers</div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="py-2 font-semibold">Member</th>
                <th className="py-2 font-semibold">Role</th>
                <th className="py-2 font-semibold">Leads</th>
                <th className="py-2 font-semibold">Won</th>
                <th className="py-2 font-semibold">Conversion</th>
                <th className="py-2 font-semibold">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {perf.map((p) => (
                <tr key={p.user_id} className="border-b border-[#F1F5F9]">
                  <td className="py-3 font-medium text-slate-900">{p.name}</td>
                  <td className="py-3 capitalize text-slate-600">{p.role}</td>
                  <td className="py-3">{p.total_leads}</td>
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
  );
}
