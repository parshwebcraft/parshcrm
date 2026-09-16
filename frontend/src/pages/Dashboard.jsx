import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { DATE_RANGES, SALE_STATUS_COLORS, formatINR, relTime } from "@/lib/constants";
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
  Wallet,
  Receipt,
  Target,
} from "@phosphor-icons/react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
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
    <div data-testid={testid} className="animate-slide-up rounded-md border border-[#E2E8F0] bg-white p-5 transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className={`grid h-10 w-10 place-items-center rounded-md ${accent}`}>
          <Icon size={20} weight="duotone" />
        </div>
        <ArrowUpRight size={18} className="text-slate-300" />
      </div>
      <div className="mt-4 font-display text-2xl font-black tracking-tight text-slate-900 md:text-3xl">{value}</div>
      <div className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</div>
    </div>
  );
}

function Panel({ eyebrow, title, className = "", children }) {
  return (
    <div className={`rounded-md border border-[#E2E8F0] bg-white p-5 ${className}`}>
      <div className="mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">{eyebrow}</div>
      <div className="mb-4 font-display text-xl font-bold">{title}</div>
      {children}
    </div>
  );
}

function RangePicker({ range, setRange }) {
  return (
    <select
      data-testid="dashboard-range"
      value={range}
      onChange={(e) => setRange(e.target.value)}
      className="rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm font-medium"
    >
      {DATE_RANGES.map((r) => (
        <option key={r.value} value={r.value}>{r.label}</option>
      ))}
    </select>
  );
}

function OwnerDashboard() {
  const nav = useNavigate();
  const [range, setRange] = useState("month");
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/dashboard/owner", { params: { range } }).then((r) => setData(r.data));
  }, [range]);

  const k = data?.kpis;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Overview</div>
          <h1 className="font-display text-3xl font-black tracking-tight md:text-4xl">Business Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          <RangePicker range={range} setRange={setRange} />
          <button
            onClick={() => nav("/leads")}
            className="hidden md:inline-flex items-center gap-2 rounded-md bg-[#0B1B3D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#142D66]"
          >
            <Plus size={16} weight="bold" /> New lead
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KPI testid="kpi-revenue" icon={Coins} label="Total revenue" value={k ? formatINR(k.total_revenue) : "—"} accent="bg-[#0B1B3D]/10 text-[#0B1B3D]" />
        <KPI testid="kpi-sales" icon={Receipt} label="Total sales" value={k?.total_sales ?? "—"} accent="bg-blue-50 text-blue-700" />
        <KPI testid="kpi-expenses" icon={Wallet} label="Total expenses" value={k ? formatINR(k.total_expenses) : "—"} accent="bg-rose-50 text-rose-700" />
        <KPI testid="kpi-net-profit" icon={ChartLineUp} label="Net profit" value={k ? formatINR(k.net_profit) : "—"} accent="bg-emerald-50 text-emerald-700" />
        <KPI testid="kpi-pending" icon={ListChecks} label="Pending payments" value={k ? formatINR(k.pending_payments) : "—"} accent="bg-amber-50 text-amber-700" />
        <KPI testid="kpi-total-leads" icon={UsersThree} label="Total leads" value={k?.total_leads ?? "—"} accent="bg-violet-50 text-violet-700" />
        <KPI testid="kpi-won" icon={Trophy} label="Won deals" value={k?.won_deals ?? "—"} accent="bg-emerald-50 text-emerald-700" />
        <KPI testid="kpi-conversion" icon={Target} label="Conversion rate" value={k ? `${k.conversion_rate}%` : "—"} accent="bg-[#0B1B3D]/10 text-[#0B1B3D]" />
      </div>

      {k && (
        <div className="flex flex-wrap gap-3 rounded-md border border-[#E2E8F0] bg-white p-4 text-xs text-slate-500">
          <span>Gross profit <b className="text-slate-900">{formatINR(k.gross_profit)}</b></span>
          <span>·</span>
          <span>Margin <b className="text-slate-900">{k.margin_pct}%</b></span>
          <span>·</span>
          <span>Collected this range <b className="text-slate-900">{formatINR(k.collected_in_range)}</b></span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel eyebrow="Last 6 months" title="Revenue trend" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data?.revenue_trend || []}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0B1B3D" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#0B1B3D" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} />
              <YAxis stroke="#94A3B8" fontSize={11} tickFormatter={(v) => formatINR(v, { decimals: 0 })} />
              <Tooltip formatter={(v) => formatINR(v)} contentStyle={{ background: "#0B1B3D", border: "none", color: "white", borderRadius: 6 }} labelStyle={{ color: "white" }} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#0B1B3D" fill="url(#revGrad)" strokeWidth={2.5} />
              <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#F43F5E" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="profit" name="Profit" stroke="#10B981" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>

        <Panel eyebrow="Channels" title="Lead sources">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={data?.lead_sources || []} dataKey="count" nameKey="source" innerRadius={50} outerRadius={90} paddingAngle={2}>
                {(data?.lead_sources || []).map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel eyebrow="Team" title="Sales performance" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data?.sales_performance || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="salesperson" stroke="#94A3B8" fontSize={11} />
              <YAxis stroke="#94A3B8" fontSize={11} tickFormatter={(v) => formatINR(v, { decimals: 0 })} />
              <Tooltip formatter={(v) => formatINR(v)} />
              <Bar dataKey="amount" name="Sales amount" fill="#0B1B3D" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel eyebrow="Collections" title="Payment status">
          {data?.payment_status && (
            <div className="space-y-3">
              {[
                ["Collected", data.payment_status.collected, "bg-emerald-500"],
                ["Pending", data.payment_status.pending, "bg-amber-500"],
                ["Overdue", data.payment_status.overdue, "bg-rose-500"],
              ].map(([label, val, color]) => {
                const total = data.payment_status.collected + data.payment_status.pending + data.payment_status.overdue || 1;
                return (
                  <div key={label}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700">{label}</span>
                      <span className="font-mono font-semibold">{formatINR(val)}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full ${color}`} style={{ width: `${(val / total) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      <Panel eyebrow="Pipeline" title="Lead funnel">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data?.lead_funnel || []} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis type="number" stroke="#94A3B8" fontSize={11} />
            <YAxis dataKey="status" type="category" stroke="#94A3B8" fontSize={11} width={100} />
            <Tooltip formatter={(v, _n, p) => [`${v} (${p.payload.pct}%)`, "Leads"]} />
            <Bar dataKey="count" fill="#0B1B3D" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <Panel eyebrow="Team" title="Salesperson performance">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="py-2 font-semibold">Salesperson</th>
                <th className="py-2 font-semibold">Leads</th>
                <th className="py-2 font-semibold">Won</th>
                <th className="py-2 font-semibold">Sales</th>
                <th className="py-2 font-semibold">Revenue</th>
                <th className="py-2 font-semibold">Target</th>
                <th className="py-2 font-semibold">Achievement</th>
                <th className="py-2 font-semibold">Pending</th>
              </tr>
            </thead>
            <tbody>
              {(data?.salesperson_table || []).map((p) => (
                <tr key={p.user_id} className="border-b border-[#F1F5F9]">
                  <td className="py-3 font-medium text-slate-900">{p.name}</td>
                  <td className="py-3">{p.leads}</td>
                  <td className="py-3 font-semibold text-emerald-600">{p.won}</td>
                  <td className="py-3">{p.sales_count}</td>
                  <td className="py-3 font-mono text-xs">{formatINR(p.revenue)}</td>
                  <td className="py-3 font-mono text-xs text-slate-500">{formatINR(p.target)}</td>
                  <td className="py-3">
                    {p.target ? (
                      <span className={`font-semibold ${p.achievement_pct >= 100 ? "text-emerald-600" : p.achievement_pct >= 60 ? "text-amber-600" : "text-rose-600"}`}>
                        {p.achievement_pct}%
                      </span>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="py-3 font-mono text-xs text-amber-700">{formatINR(p.pending_collection)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel eyebrow="Latest" title="Recent sales">
          <div className="space-y-2">
            {(data?.recent_sales || []).map((s, i) => (
              <div key={i} className="flex items-center justify-between rounded-md border border-[#F1F5F9] p-3 text-sm">
                <div>
                  <div className="font-medium text-slate-900">{s.customer}</div>
                  <div className="text-xs text-slate-500">{s.salesperson} · {relTime(s.date)}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-xs font-semibold">{formatINR(s.amount)}</div>
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${SALE_STATUS_COLORS[s.status] || ""}`}>{s.status}</span>
                </div>
              </div>
            ))}
            {(!data?.recent_sales || data.recent_sales.length === 0) && <div className="text-sm text-slate-500">No sales yet.</div>}
          </div>
        </Panel>

        <Panel eyebrow="Reminders" title="Upcoming follow-ups">
          <div className="space-y-2">
            {(data?.upcoming_followups || []).map((f, i) => (
              <div key={i} className="flex items-center justify-between rounded-md border border-[#F1F5F9] p-3 text-sm">
                <div>
                  <div className="font-medium text-slate-900">{f.customer}</div>
                  <div className="text-xs text-slate-500">{f.assigned_to} · {relTime(f.follow_up_date)}</div>
                </div>
                <span className="inline-flex items-center rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600">{f.priority}</span>
              </div>
            ))}
            {(!data?.upcoming_followups || data.upcoming_followups.length === 0) && <div className="text-sm text-slate-500">Nothing scheduled.</div>}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function SalespersonDashboard() {
  const { user } = useAuth();
  const [range, setRange] = useState("month");
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/dashboard/me", { params: { range } }).then((r) => setData(r.data));
  }, [range]);

  const k = data?.kpis;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">My Performance</div>
          <h1 className="font-display text-3xl font-black tracking-tight md:text-4xl">Hi, {user?.name?.split(" ")[0]}</h1>
        </div>
        <RangePicker range={range} setRange={setRange} />
      </div>

      {k && (
        <div className="rounded-md border border-[#E2E8F0] bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Target achievement</div>
              <div className="font-display text-2xl font-black">{formatINR(k.my_sales)} <span className="text-sm font-medium text-slate-400">/ {formatINR(k.target)}</span></div>
            </div>
            <div className="font-display text-3xl font-black text-[#0B1B3D]">{k.achievement_pct}%</div>
          </div>
          <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-gradient-to-r from-[#0B1B3D] to-[#2563EB]" style={{ width: `${Math.min(100, k.achievement_pct)}%` }} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KPI icon={UsersThree} label="My leads" value={k?.my_leads ?? "—"} accent="bg-[#0B1B3D]/10 text-[#0B1B3D]" />
        <KPI icon={Plus} label="New leads" value={k?.new_leads ?? "—"} accent="bg-blue-50 text-blue-700" />
        <KPI icon={Phone} label="Calls today" value={k?.calls_today ?? "—"} accent="bg-violet-50 text-violet-700" />
        <KPI icon={ListChecks} label="Open opportunities" value={k?.open_opportunities ?? "—"} accent="bg-amber-50 text-amber-700" />
        <KPI icon={Trophy} label="Won deals" value={k?.won_deals ?? "—"} accent="bg-emerald-50 text-emerald-700" />
        <KPI icon={XCircle} label="Lost deals" value={k?.lost_deals ?? "—"} accent="bg-rose-50 text-rose-700" />
        <KPI icon={Receipt} label="My sales" value={k ? formatINR(k.my_sales) : "—"} accent="bg-[#0B1B3D]/10 text-[#0B1B3D]" />
        <KPI icon={Wallet} label="Pending collection" value={k ? formatINR(k.my_pending_collection) : "—"} accent="bg-amber-50 text-amber-700" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel eyebrow="Last 6 months" title="My revenue trend" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data?.revenue_trend || []}>
              <defs>
                <linearGradient id="myRevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0B1B3D" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#0B1B3D" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} />
              <YAxis stroke="#94A3B8" fontSize={11} tickFormatter={(v) => formatINR(v, { decimals: 0 })} />
              <Tooltip formatter={(v) => formatINR(v)} contentStyle={{ background: "#0B1B3D", border: "none", color: "white", borderRadius: 6 }} labelStyle={{ color: "white" }} />
              <Area type="monotone" dataKey="revenue" stroke="#0B1B3D" fill="url(#myRevGrad)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>

        <Panel eyebrow="Stages" title="My pipeline">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data?.my_pipeline || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis type="number" stroke="#94A3B8" fontSize={10} />
              <YAxis dataKey="status" type="category" stroke="#94A3B8" fontSize={10} width={90} />
              <Tooltip />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {(data?.my_pipeline || []).map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel eyebrow="Today" title="Today's follow-ups">
          <div className="space-y-2">
            {(data?.todays_followups || []).map((f, i) => (
              <div key={i} className="flex items-center justify-between rounded-md border border-[#F1F5F9] p-3 text-sm">
                <div className="font-medium text-slate-900">{f.customer}</div>
                <span className="inline-flex items-center rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600">{f.priority}</span>
              </div>
            ))}
            {(!data?.todays_followups || data.todays_followups.length === 0) && <div className="text-sm text-slate-500">Nothing due today. 🎉</div>}
          </div>
        </Panel>

        <Panel eyebrow="Latest" title="My recent sales">
          <div className="space-y-2">
            {(data?.my_recent_sales || []).map((s, i) => (
              <div key={i} className="flex items-center justify-between rounded-md border border-[#F1F5F9] p-3 text-sm">
                <div>
                  <div className="font-medium text-slate-900">{s.customer}</div>
                  <div className="text-xs text-slate-500">{relTime(s.date)}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-xs font-semibold">{formatINR(s.amount)}</div>
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${SALE_STATUS_COLORS[s.status] || ""}`}>{s.status}</span>
                </div>
              </div>
            ))}
            {(!data?.my_recent_sales || data.my_recent_sales.length === 0) && <div className="text-sm text-slate-500">No sales yet.</div>}
          </div>
        </Panel>
      </div>

      <Panel eyebrow="Activity" title="My recent activities">
        <div className="flex max-h-[260px] flex-col gap-2 overflow-y-auto">
          {(data?.my_recent_activities || []).map((a, i) => (
            <div key={i} className="rounded-md border border-[#F1F5F9] p-2.5 text-xs">
              <div className="font-medium text-slate-900">{a.description}</div>
              <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
                <span>{a.lead_name || "—"}</span>
                <span>{relTime(a.date)}</span>
              </div>
            </div>
          ))}
          {(!data?.my_recent_activities || data.my_recent_activities.length === 0) && <div className="text-sm text-slate-500">No recent activity.</div>}
        </div>
      </Panel>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const isOwner = user?.role === "admin" || user?.role === "manager";
  return isOwner ? <OwnerDashboard /> : <SalespersonDashboard />;
}
