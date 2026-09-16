import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { CUSTOMER_STATUSES, CUSTOMER_STATUS_COLORS, SALE_STATUS_COLORS, formatINR, relTime } from "@/lib/constants";
import { ArrowLeft, Phone, WhatsappLogo, Receipt, CreditCard, Notepad, CheckCircle } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TIMELINE_ICON = {
  call: Phone, whatsapp: WhatsappLogo, note: Notepad, status_change: CheckCircle,
  sale: Receipt, payment: CreditCard, import: Notepad, document: Notepad,
};

export default function CustomerDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [employees, setEmployees] = useState([]);

  const load = () => api.get(`/customers/${id}`).then((r) => setData(r.data));
  useEffect(() => {
    load();
    api.get("/employees").then((r) => setEmployees(r.data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!data) return <div className="text-slate-500">Loading…</div>;
  const { customer, sales, payments, calls, whatsapp, tasks, timeline } = data;
  const owner = employees.find((e) => e.id === customer.assigned_to);

  const updateField = async (k, v) => {
    await api.put(`/customers/${id}`, { [k]: v });
    toast.success("Updated");
    load();
  };

  return (
    <div className="mx-auto max-w-7xl">
      <button onClick={() => nav("/customers")} className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft size={16} /> Back to customers
      </button>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-md border border-[#E2E8F0] bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">{customer.company || "—"}</div>
                <h1 className="font-display text-3xl font-black tracking-tight">{customer.name}</h1>
                <div className="mt-1 text-sm text-slate-500">{customer.email}</div>
              </div>
              <div className="flex items-center gap-2">
                {customer.phone && (
                  <>
                    <a href={`tel:${customer.phone}`} className="inline-flex items-center gap-1 rounded-md bg-[#0B1B3D] px-3 py-2 text-xs font-semibold text-white hover:bg-[#142D66]">
                      <Phone size={14} /> Call
                    </a>
                    <a href={`https://wa.me/${customer.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border border-[#E2E8F0] px-3 py-2 text-xs font-semibold hover:bg-slate-50">
                      <WhatsappLogo size={14} /> WhatsApp
                    </a>
                  </>
                )}
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-4 border-t border-[#F1F5F9] pt-4 sm:grid-cols-4">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Total sales</div>
                <div className="font-display text-xl font-bold">{formatINR(customer.total_sales)}</div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Pending</div>
                <div className={`font-display text-xl font-bold ${customer.pending_amount > 0 ? "text-amber-600" : ""}`}>
                  {formatINR(customer.pending_amount)}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Sales count</div>
                <div className="font-display text-xl font-bold">{sales.length}</div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">City</div>
                <div className="font-display text-xl font-bold">{customer.city || "—"}</div>
              </div>
            </div>
          </div>

          <Tabs defaultValue="timeline">
            <TabsList>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="sales">Sales</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
              <TabsTrigger value="calls">Calls</TabsTrigger>
              <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
            </TabsList>

            <TabsContent value="timeline">
              <div className="space-y-2 rounded-md border border-[#E2E8F0] bg-white p-5">
                {timeline.length === 0 && <div className="text-sm text-slate-500">No activity yet.</div>}
                {timeline.map((t, i) => {
                  const Icon = TIMELINE_ICON[t.type] || Notepad;
                  return (
                    <div key={i} className="flex items-start gap-3 border-b border-[#F1F5F9] pb-2 last:border-0">
                      <div className="grid h-8 w-8 place-items-center rounded-md bg-[#0B1B3D]/5">
                        <Icon size={14} className="text-[#0B1B3D]" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm text-slate-900">{t.description}</div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-400">{t.type} · {relTime(t.date)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="sales">
              <div className="rounded-md border border-[#E2E8F0] bg-white">
                {sales.length === 0 && <div className="p-5 text-sm text-slate-500">No sales yet.</div>}
                {sales.map((s) => (
                  <div key={s.id} className="flex items-center justify-between border-b border-[#F1F5F9] p-4 text-sm last:border-0">
                    <div>
                      <div className="font-medium">{s.sale_no} — {s.product_service}</div>
                      <div className="text-xs text-slate-500">{relTime(s.sale_date)}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs">{formatINR(s.final_amount)}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${SALE_STATUS_COLORS[s.status] || ""}`}>{s.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="payments">
              <div className="rounded-md border border-[#E2E8F0] bg-white">
                {payments.length === 0 && <div className="p-5 text-sm text-slate-500">No payments recorded.</div>}
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between border-b border-[#F1F5F9] p-4 text-sm last:border-0">
                    <div>
                      <div className="font-medium">{p.payment_method}</div>
                      <div className="text-xs text-slate-500">{relTime(p.payment_date)}</div>
                    </div>
                    <span className="font-mono text-xs font-semibold text-emerald-700">{formatINR(p.amount)}</span>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="calls">
              <div className="space-y-2 rounded-md border border-[#E2E8F0] bg-white p-5">
                {calls.length === 0 && <div className="text-sm text-slate-500">No calls logged.</div>}
                {calls.map((c) => (
                  <div key={c.id} className="rounded-md border border-[#F1F5F9] p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">{c.outcome}</div>
                      <div className="text-xs text-slate-500">{relTime(c.created_at)}</div>
                    </div>
                    {c.notes && <div className="mt-1 text-xs text-slate-600">{c.notes}</div>}
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="whatsapp">
              <div className="space-y-2 rounded-md border border-[#E2E8F0] bg-white p-5">
                {whatsapp.length === 0 && <div className="text-sm text-slate-500">No WhatsApp messages.</div>}
                {whatsapp.map((m) => (
                  <div key={m.id} className={`flex ${m.direction === "out" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-lg p-2.5 text-sm ${m.direction === "out" ? "bg-[#D9FDD3]" : "bg-slate-100"}`}>
                      {m.text}
                      <div className="mt-0.5 text-right text-[10px] text-slate-500">{relTime(m.created_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="tasks">
              <div className="space-y-2 rounded-md border border-[#E2E8F0] bg-white p-5">
                {tasks.length === 0 && <div className="text-sm text-slate-500">No tasks linked to this customer.</div>}
                {tasks.map((t) => (
                  <div key={t.id} className="flex items-center justify-between rounded-md border border-[#F1F5F9] p-3 text-sm">
                    <div>
                      <div className="font-medium">{t.title}</div>
                      <div className="text-xs text-slate-500">Due {relTime(t.due_date)} · {t.priority}</div>
                    </div>
                    <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600">{t.status}</span>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <aside className="space-y-4">
          <div className="rounded-md border border-[#E2E8F0] bg-white p-5">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Status</div>
            <select
              value={customer.status}
              onChange={(e) => updateField("status", e.target.value)}
              className="w-full rounded-md border border-[#E2E8F0] px-3 py-2 text-sm"
            >
              {CUSTOMER_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>

            <div className="mb-2 mt-4 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Salesperson</div>
            <select
              value={customer.assigned_to || ""}
              onChange={(e) => updateField("assigned_to", e.target.value)}
              className="w-full rounded-md border border-[#E2E8F0] px-3 py-2 text-sm"
            >
              {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>

            <div className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Assigned to</div>
            <div className="text-sm text-slate-900">{owner?.name || "—"}</div>

            <div className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Phone</div>
            <div className="font-mono text-sm text-slate-900">{customer.phone || "—"}</div>

            <div className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Source</div>
            <div className="text-sm text-slate-900">{customer.source}</div>

            <div className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Last activity</div>
            <div className="text-sm text-slate-900">{relTime(customer.last_activity)}</div>

            <div className={`mt-1 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${CUSTOMER_STATUS_COLORS[customer.status]}`}>
              {customer.status}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
