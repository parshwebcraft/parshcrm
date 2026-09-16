import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { formatINR, initials, relTime, STATUS_COLORS } from "@/lib/constants";
import {
  ArrowLeft,
  Phone,
  Trophy,
  XCircle,
  ChartLineUp,
  Coins,
  PhoneCall,
  ListChecks,
  EnvelopeSimple,
  ChatCircleDots,
  Receipt,
  Target,
  Wallet,
} from "@phosphor-icons/react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const C = ["#0B1B3D", "#2563EB", "#10B981", "#F59E0B", "#F43F5E", "#8B5CF6", "#14B8A6", "#EC4899"];

function fmtTalk(s) {
  if (!s) return "0m";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function Stat({ icon: Icon, label, value, accent }) {
  return (
    <div className="animate-slide-up rounded-md border border-[#E2E8F0] bg-white p-4">
      <div className={`grid h-9 w-9 place-items-center rounded-md ${accent}`}>
        <Icon size={18} weight="duotone" />
      </div>
      <div className="mt-3 font-display text-2xl font-black tracking-tight">{value}</div>
      <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </div>
    </div>
  );
}

export default function EmployeeDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get(`/employees/${id}/stats`).then((r) => setData(r.data));
  }, [id]);

  if (!data) {
    return <div className="text-slate-500">Loading…</div>;
  }

  const { employee: e, totals: t, by_status, recent_activity, top_leads } = data;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <button
        data-testid="back-to-employees-btn"
        onClick={() => nav("/employees")}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft size={16} /> Back to team
      </button>

      {/* Header */}
      <div className="rounded-md border border-[#E2E8F0] bg-white p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-[#0B1B3D] text-xl font-display font-black text-white">
            {initials(e.name)}
          </div>
          <div className="flex-1">
            <div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
              {e.role}
            </div>
            <h1 data-testid="employee-name" className="font-display text-3xl font-black tracking-tight">
              {e.name}
            </h1>
            <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <EnvelopeSimple size={12} /> {e.email}
              </span>
              {e.phone && (
                <span className="inline-flex items-center gap-1 font-mono">
                  <Phone size={12} /> {e.phone}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat icon={Trophy} label="Won deals" value={t.won} accent="bg-emerald-50 text-emerald-700" />
        <Stat icon={XCircle} label="Lost deals" value={t.lost} accent="bg-rose-50 text-rose-700" />
        <Stat icon={ChartLineUp} label="Conversion" value={`${t.conversion}%`} accent="bg-violet-50 text-violet-700" />
        <Stat icon={Receipt} label="Sales" value={t.sales_count} accent="bg-blue-50 text-blue-700" />
        <Stat icon={Coins} label="Revenue" value={formatINR(t.revenue)} accent="bg-[#0B1B3D]/10 text-[#0B1B3D]" />
        <Stat icon={Wallet} label="Pending collection" value={formatINR(t.pending_collection)} accent="bg-amber-50 text-amber-700" />
        <Stat icon={Target} label="Target achievement" value={t.target ? `${t.achievement_pct}%` : "—"} accent="bg-emerald-50 text-emerald-700" />
        <Stat icon={PhoneCall} label="Calls" value={t.calls_total} accent="bg-blue-50 text-blue-700" />
        <Stat icon={ChatCircleDots} label="Connect rate" value={`${t.connect_rate}%`} accent="bg-amber-50 text-amber-700" />
        <Stat icon={Phone} label="Talk time" value={fmtTalk(t.talk_time_seconds)} accent="bg-[#0B1B3D]/10 text-[#0B1B3D]" />
        <Stat icon={ListChecks} label="Pending tasks" value={t.tasks_pending} accent="bg-amber-50 text-amber-700" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Status breakdown */}
        <div className="rounded-md border border-[#E2E8F0] bg-white p-5 lg:col-span-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Pipeline
          </div>
          <div className="mb-3 font-display text-xl font-bold">Leads by status</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={by_status}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="status" stroke="#94A3B8" fontSize={10} />
              <YAxis stroke="#94A3B8" fontSize={11} />
              <Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {by_status.map((_, i) => (
                  <Cell key={i} fill={C[i % C.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent activity */}
        <div className="rounded-md border border-[#E2E8F0] bg-white p-5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Activity
          </div>
          <div className="mb-3 font-display text-xl font-bold">Recent</div>
          <div className="flex max-h-[260px] flex-col gap-2 overflow-y-auto">
            {recent_activity.length === 0 && (
              <div className="text-sm text-slate-500">No recent activity</div>
            )}
            {recent_activity.map((a) => (
              <div key={a.id} className="rounded-md border border-[#F1F5F9] p-2.5 text-xs">
                <div className="font-medium text-slate-900">{a.description}</div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
                  <span>{a.lead_name || a.type}</span>
                  <span>{relTime(a.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pipeline value + top leads */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-md border border-[#E2E8F0] bg-white p-5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Forecast
          </div>
          <div className="mt-1 font-display text-xl font-bold">Open pipeline</div>
          <div className="mt-3 font-display text-4xl font-black tracking-tight text-[#0B1B3D]">
            {formatINR(t.pipeline_value)}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Across {t.total_leads - t.won - t.lost} open lead(s)
          </div>
        </div>

        <div className="rounded-md border border-[#E2E8F0] bg-white p-5 lg:col-span-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Hottest leads
          </div>
          <div className="mb-3 font-display text-xl font-bold">Top by score</div>
          <div className="space-y-2">
            {top_leads.length === 0 && (
              <div className="text-sm text-slate-500">No leads assigned yet</div>
            )}
            {top_leads.map((l) => (
              <button
                key={l.id}
                data-testid={`top-lead-${l.id}`}
                onClick={() => nav(`/leads/${l.id}`)}
                className="flex w-full items-center justify-between rounded-md border border-[#F1F5F9] p-3 text-left hover:border-[#0B1B3D]/20"
              >
                <div>
                  <div className="text-sm font-medium text-slate-900">{l.name}</div>
                  <div className="text-xs text-slate-500">{l.company}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                      STATUS_COLORS[l.status]
                    }`}
                  >
                    {l.status}
                  </span>
                  <span className="grid h-7 min-w-[2.25rem] place-items-center rounded-full bg-[#0B1B3D]/5 px-2 text-xs font-bold text-[#0B1B3D]">
                    {l.score}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
