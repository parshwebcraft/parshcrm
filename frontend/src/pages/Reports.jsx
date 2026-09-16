import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatINR, relTime } from "@/lib/constants";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Funnel,
  FunnelChart,
  LabelList,
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

const C = ["#0B1B3D", "#2563EB", "#10B981", "#F59E0B", "#F43F5E", "#8B5CF6", "#14B8A6", "#EC4899"];

function Panel({ eyebrow, title, className = "", children }) {
  return (
    <div className={`rounded-md border border-[#E2E8F0] bg-white p-5 ${className}`}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{eyebrow}</div>
      <div className="mb-3 font-display text-xl font-bold">{title}</div>
      {children}
    </div>
  );
}

function LeadReports({ isOwner }) {
  const [sources, setSources] = useState([]);
  const [funnel, setFunnel] = useState([]);
  const [weekly, setWeekly] = useState([]);
  const [calls, setCalls] = useState([]);
  const [byProduct, setByProduct] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get("/reports/lead-sources"),
      api.get("/reports/status-funnel"),
      api.get("/reports/weekly-leads"),
      api.get("/calls"),
      api.get("/reports/sales-by-product"),
    ]).then(([s, f, w, c, bp]) => {
      setSources(s.data); setFunnel(f.data); setWeekly(w.data); setCalls(c.data); setByProduct(bp.data);
    });
  }, []);

  const callOutcomes = calls.reduce((acc, c) => { acc[c.outcome] = (acc[c.outcome] || 0) + 1; return acc; }, {});
  const callData = Object.entries(callOutcomes).map(([outcome, count]) => ({ outcome, count }));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Panel eyebrow="Lead conversion" title="Funnel">
        <ResponsiveContainer width="100%" height={280}>
          <FunnelChart>
            <Tooltip />
            <Funnel dataKey="count" data={funnel} isAnimationActive>
              {funnel.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
              <LabelList position="right" fill="#0F172A" dataKey="status" />
            </Funnel>
          </FunnelChart>
        </ResponsiveContainer>
      </Panel>

      <Panel eyebrow="Channels" title="Source performance">
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={sources} dataKey="count" nameKey="source" cx="50%" cy="50%" outerRadius={100}>
              {sources.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
            </Pie>
            <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </Panel>

      <Panel eyebrow="Trend" title={isOwner ? "Weekly leads" : "My weekly leads"} className="lg:col-span-2">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={weekly}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="week" stroke="#94A3B8" fontSize={11} />
            <YAxis stroke="#94A3B8" fontSize={11} />
            <Tooltip />
            <Line type="monotone" dataKey="leads" stroke="#0B1B3D" strokeWidth={3} dot />
          </LineChart>
        </ResponsiveContainer>
      </Panel>

      <Panel eyebrow="Calls" title="Call outcomes">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={callData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="outcome" stroke="#94A3B8" fontSize={10} />
            <YAxis stroke="#94A3B8" fontSize={11} />
            <Tooltip />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {callData.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <Panel eyebrow="Products" title="Sales by product / service">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={byProduct} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis type="number" stroke="#94A3B8" fontSize={11} tickFormatter={(v) => formatINR(v, { decimals: 0 })} />
            <YAxis dataKey="product_service" type="category" stroke="#94A3B8" fontSize={10} width={160} />
            <Tooltip formatter={(v) => formatINR(v)} />
            <Bar dataKey="revenue" fill="#0B1B3D" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>
    </div>
  );
}

function BusinessReports() {
  const [dash, setDash] = useState(null);
  const [outstanding, setOutstanding] = useState([]);

  useEffect(() => {
    api.get("/dashboard/owner", { params: { range: "year" } }).then((r) => setDash(r.data));
    api.get("/reports/outstanding-payments").then((r) => setOutstanding(r.data));
  }, []);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel eyebrow="Last 6 months" title="Revenue vs expenses">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={dash?.revenue_trend || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} />
              <YAxis stroke="#94A3B8" fontSize={11} tickFormatter={(v) => formatINR(v, { decimals: 0 })} />
              <Tooltip formatter={(v) => formatINR(v)} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#0B1B3D" fill="#0B1B3D33" strokeWidth={2} />
              <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#F43F5E" fill="#F43F5E22" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>

        <Panel eyebrow="Last 6 months" title="Profit analysis">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={dash?.revenue_trend || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} />
              <YAxis stroke="#94A3B8" fontSize={11} tickFormatter={(v) => formatINR(v, { decimals: 0 })} />
              <Tooltip formatter={(v) => formatINR(v)} />
              <Bar dataKey="profit" name="Net profit" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

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
              {(dash?.salesperson_table || []).map((p) => (
                <tr key={p.user_id} className="border-b border-[#F1F5F9]">
                  <td className="py-3 font-medium text-slate-900">{p.name}</td>
                  <td className="py-3">{p.leads}</td>
                  <td className="py-3 text-emerald-600 font-semibold">{p.won}</td>
                  <td className="py-3">{p.sales_count}</td>
                  <td className="py-3 font-mono text-xs">{formatINR(p.revenue)}</td>
                  <td className="py-3 font-mono text-xs text-slate-500">{formatINR(p.target)}</td>
                  <td className="py-3">{p.target ? `${p.achievement_pct}%` : "—"}</td>
                  <td className="py-3 font-mono text-xs text-amber-700">{formatINR(p.pending_collection)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel eyebrow="Collections" title="Outstanding payments">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="py-2 font-semibold">Invoice</th>
                <th className="py-2 font-semibold">Customer</th>
                <th className="py-2 font-semibold">Salesperson</th>
                <th className="py-2 font-semibold">Pending</th>
                <th className="py-2 font-semibold">Due date</th>
                <th className="py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {outstanding.map((o, i) => (
                <tr key={i} className="border-b border-[#F1F5F9]">
                  <td className="py-3 font-mono text-xs font-semibold text-[#0B1B3D]">{o.sale_no}</td>
                  <td className="py-3 text-slate-900">{o.customer}</td>
                  <td className="py-3 text-slate-600">{o.salesperson}</td>
                  <td className="py-3 font-mono text-xs font-semibold text-amber-700">{formatINR(o.pending_amount)}</td>
                  <td className="py-3 text-xs text-slate-500">{relTime(o.due_date)}</td>
                  <td className="py-3">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${o.status === "Overdue" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                      {o.status}
                    </span>
                  </td>
                </tr>
              ))}
              {outstanding.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-sm text-slate-500">No outstanding balances</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

export default function Reports() {
  const { user } = useAuth();
  const isOwner = user?.role === "admin" || user?.role === "manager";

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Analytics</div>
        <h1 className="font-display text-3xl font-black tracking-tight md:text-4xl">Reports</h1>
      </div>

      {isOwner ? (
        <Tabs defaultValue="business">
          <TabsList>
            <TabsTrigger value="business">Business</TabsTrigger>
            <TabsTrigger value="leads">Leads &amp; Calls</TabsTrigger>
          </TabsList>
          <TabsContent value="business"><BusinessReports /></TabsContent>
          <TabsContent value="leads"><LeadReports isOwner={isOwner} /></TabsContent>
        </Tabs>
      ) : (
        <LeadReports isOwner={isOwner} />
      )}
    </div>
  );
}
