import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { PAYMENT_METHODS, formatINR, relTime } from "@/lib/constants";
import { Plus, X } from "@phosphor-icons/react";
import { toast } from "sonner";

function RecordPaymentDialog({ open, onClose, onCreated, sales, customers }) {
  const [form, setForm] = useState({ sale_id: "", amount: "", payment_method: "Cash", payment_date: "", notes: "" });
  const [saving, setSaving] = useState(false);
  if (!open) return null;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const unpaidSales = sales.filter((s) => s.pending_amount > 0);
  const selected = sales.find((s) => s.id === form.sale_id);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.sale_id || !form.amount) return;
    setSaving(true);
    try {
      await api.post("/payments", { ...form, amount: Number(form.amount) });
      toast.success("Payment recorded");
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-md bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-4">
          <div className="font-display text-lg font-bold">Record payment</div>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={submit} className="space-y-3 p-5">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Sale *</span>
            <select required value={form.sale_id} onChange={(e) => set("sale_id", e.target.value)} className="rounded-md border border-[#E2E8F0] px-3 py-2 text-sm">
              <option value="">Select a sale with pending balance…</option>
              {unpaidSales.map((s) => {
                const cust = customers.find((c) => c.id === s.customer_id);
                return <option key={s.id} value={s.id}>{s.sale_no} — {cust?.name || "—"} ({formatINR(s.pending_amount)} due)</option>;
              })}
            </select>
          </label>
          {selected && (
            <div className="rounded-md bg-[#FAFAFA] p-2 text-xs text-slate-600">
              Pending balance: <span className="font-mono font-semibold text-amber-700">{formatINR(selected.pending_amount)}</span>
            </div>
          )}
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Amount (₹) *</span>
            <input required type="number" min="1" value={form.amount} onChange={(e) => set("amount", e.target.value)} className="rounded-md border border-[#E2E8F0] px-3 py-2 text-sm" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Method</span>
            <select value={form.payment_method} onChange={(e) => set("payment_method", e.target.value)} className="rounded-md border border-[#E2E8F0] px-3 py-2 text-sm">
              {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Notes</span>
            <textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} className="rounded-md border border-[#E2E8F0] px-3 py-2 text-sm" />
          </label>
          <button type="submit" disabled={saving} className="w-full rounded-md bg-[#0B1B3D] py-2 text-sm font-semibold text-white hover:bg-[#142D66] disabled:opacity-50">
            {saving ? "Saving…" : "Record payment"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [dialog, setDialog] = useState(false);

  const load = () => {
    api.get("/payments").then((r) => setPayments(r.data));
    api.get("/sales").then((r) => setSales(r.data));
  };
  useEffect(() => {
    load();
    api.get("/customers").then((r) => setCustomers(r.data));
    api.get("/employees").then((r) => setEmployees(r.data));
  }, []);

  const custById = useMemo(() => Object.fromEntries(customers.map((c) => [c.id, c])), [customers]);
  const empById = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);
  const saleById = useMemo(() => Object.fromEntries(sales.map((s) => [s.id, s])), [sales]);

  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalPending = sales.reduce((sum, s) => sum + (s.status !== "Cancelled" ? s.pending_amount : 0), 0);
  const totalOverdue = sales.reduce((sum, s) => sum + (s.status === "Overdue" ? s.pending_amount : 0), 0);
  const now = new Date();
  const thisMonthCollection = payments
    .filter((p) => {
      const d = new Date(p.payment_date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Collections</div>
          <h1 className="font-display text-3xl font-black tracking-tight md:text-4xl">Payments</h1>
        </div>
        <button onClick={() => setDialog(true)} className="inline-flex items-center gap-2 rounded-md bg-[#0B1B3D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#142D66]">
          <Plus size={16} weight="bold" /> Record payment
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-md border border-[#E2E8F0] bg-white p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Total collected</div>
          <div className="font-display text-2xl font-black text-emerald-600">{formatINR(totalCollected)}</div>
        </div>
        <div className="rounded-md border border-[#E2E8F0] bg-white p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Pending</div>
          <div className="font-display text-2xl font-black text-amber-600">{formatINR(totalPending)}</div>
        </div>
        <div className="rounded-md border border-[#E2E8F0] bg-white p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Overdue</div>
          <div className="font-display text-2xl font-black text-rose-600">{formatINR(totalOverdue)}</div>
        </div>
        <div className="rounded-md border border-[#E2E8F0] bg-white p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">This month</div>
          <div className="font-display text-2xl font-black">{formatINR(thisMonthCollection)}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-[#E2E8F0] bg-white">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#FAFAFA] text-left text-xs uppercase tracking-wider text-slate-500">
              <th className="py-3 pl-4 font-semibold">Customer</th>
              <th className="py-3 font-semibold">Sale</th>
              <th className="py-3 font-semibold">Amount</th>
              <th className="py-3 font-semibold">Method</th>
              <th className="py-3 font-semibold">Collected by</th>
              <th className="py-3 font-semibold">Status</th>
              <th className="py-3 pr-4 font-semibold">Date</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-b border-[#F1F5F9]">
                <td className="py-3 pl-4 font-medium text-slate-900">{custById[p.customer_id]?.name || "—"}</td>
                <td className="py-3 font-mono text-xs text-slate-500">{saleById[p.sale_id]?.sale_no || "—"}</td>
                <td className="py-3 font-mono text-xs font-semibold text-emerald-700">{formatINR(p.amount)}</td>
                <td className="py-3 text-slate-600">{p.payment_method}</td>
                <td className="py-3 text-slate-600">{empById[p.collected_by]?.name || "—"}</td>
                <td className="py-3">
                  <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    {p.status}
                  </span>
                </td>
                <td className="py-3 pr-4 text-xs text-slate-500">{relTime(p.payment_date)}</td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr><td colSpan={7} className="py-12 text-center text-sm text-slate-500">No payments recorded</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <RecordPaymentDialog open={dialog} onClose={() => setDialog(false)} onCreated={load} sales={sales} customers={customers} />
    </div>
  );
}
