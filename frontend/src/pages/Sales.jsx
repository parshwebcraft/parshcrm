import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { SALE_STATUSES, SALE_STATUS_COLORS, formatINR, relTime } from "@/lib/constants";
import { Plus, X, MagnifyingGlass } from "@phosphor-icons/react";
import { toast } from "sonner";

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${SALE_STATUS_COLORS[status] || ""}`}>
      {status}
    </span>
  );
}

function computeTotals(f) {
  const saleAmount = Number(f.sale_amount) || 0;
  const cost = Number(f.cost_amount) || 0;
  const discount = Number(f.discount) || 0;
  const tax = Number(f.tax) || 0;
  const paid = Number(f.payment_received) || 0;
  const subtotal = Math.max(0, saleAmount - discount);
  const finalAmount = Math.max(0, subtotal + tax);
  const pending = Math.max(0, finalAmount - paid);
  const grossProfit = saleAmount - cost;
  return { subtotal, finalAmount, pending, grossProfit };
}

function NewSaleDialog({ open, onClose, onCreated, customers, employees }) {
  const [form, setForm] = useState({
    customer_id: "", assigned_to: "", product_service: "", quantity: 1,
    sale_amount: "", cost_amount: "", discount: 0, tax: 0, payment_received: 0,
    due_date: "", notes: "",
  });
  const [saving, setSaving] = useState(false);
  if (!open) return null;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const totals = computeTotals(form);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.customer_id) {
      toast.error("Select a customer");
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.post("/sales", {
        ...form,
        sale_amount: Number(form.sale_amount) || 0,
        cost_amount: Number(form.cost_amount) || 0,
        discount: Number(form.discount) || 0,
        tax: Number(form.tax) || 0,
        payment_received: Number(form.payment_received) || 0,
        quantity: Number(form.quantity) || 1,
        assigned_to: form.assigned_to || undefined,
      });
      toast.success(`Sale ${data.sale_no} created`);
      onCreated(data);
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to create sale");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-md bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-4">
          <div className="font-display text-lg font-bold">New sale</div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
        </div>
        <form onSubmit={submit} className="grid max-h-[75vh] grid-cols-1 gap-3 overflow-y-auto p-5 md:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Customer *</span>
            <select required value={form.customer_id} onChange={(e) => set("customer_id", e.target.value)} className="rounded-md border border-[#E2E8F0] px-3 py-2 text-sm">
              <option value="">Select customer…</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.company}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Salesperson</span>
            <select value={form.assigned_to} onChange={(e) => set("assigned_to", e.target.value)} className="rounded-md border border-[#E2E8F0] px-3 py-2 text-sm">
              <option value="">Auto (customer owner)</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Product / Service</span>
            <input value={form.product_service} onChange={(e) => set("product_service", e.target.value)} className="rounded-md border border-[#E2E8F0] px-3 py-2 text-sm" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Quantity</span>
            <input type="number" min="1" value={form.quantity} onChange={(e) => set("quantity", e.target.value)} className="rounded-md border border-[#E2E8F0] px-3 py-2 text-sm" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Due date</span>
            <input type="date" value={form.due_date} onChange={(e) => set("due_date", e.target.value)} className="rounded-md border border-[#E2E8F0] px-3 py-2 text-sm" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Sale amount (₹) *</span>
            <input required type="number" min="0" value={form.sale_amount} onChange={(e) => set("sale_amount", e.target.value)} className="rounded-md border border-[#E2E8F0] px-3 py-2 text-sm" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Cost amount (₹)</span>
            <input type="number" min="0" value={form.cost_amount} onChange={(e) => set("cost_amount", e.target.value)} className="rounded-md border border-[#E2E8F0] px-3 py-2 text-sm" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Discount (₹)</span>
            <input type="number" min="0" value={form.discount} onChange={(e) => set("discount", e.target.value)} className="rounded-md border border-[#E2E8F0] px-3 py-2 text-sm" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Tax (₹)</span>
            <input type="number" min="0" value={form.tax} onChange={(e) => set("tax", e.target.value)} className="rounded-md border border-[#E2E8F0] px-3 py-2 text-sm" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Payment received now (₹)</span>
            <input type="number" min="0" value={form.payment_received} onChange={(e) => set("payment_received", e.target.value)} className="rounded-md border border-[#E2E8F0] px-3 py-2 text-sm" />
          </label>
          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Notes</span>
            <textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} className="rounded-md border border-[#E2E8F0] px-3 py-2 text-sm" />
          </label>

          <div className="md:col-span-2 grid grid-cols-2 gap-3 rounded-md border border-[#E2E8F0] bg-[#FAFAFA] p-4 text-sm sm:grid-cols-4">
            <div>
              <div className="text-[10px] uppercase text-slate-500">Subtotal</div>
              <div className="font-mono font-semibold">{formatINR(totals.subtotal)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-slate-500">Final amount</div>
              <div className="font-mono font-semibold">{formatINR(totals.finalAmount)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-slate-500">Pending</div>
              <div className="font-mono font-semibold text-amber-700">{formatINR(totals.pending)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-slate-500">Gross profit</div>
              <div className="font-mono font-semibold text-emerald-700">{formatINR(totals.grossProfit)}</div>
            </div>
          </div>

          <div className="col-span-1 mt-2 flex justify-end gap-2 md:col-span-2">
            <button type="button" onClick={onClose} className="rounded-md border border-[#E2E8F0] px-4 py-2 text-sm font-medium hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-md bg-[#0B1B3D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#142D66] disabled:opacity-50">
              {saving ? "Saving…" : "Create sale"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Sales() {
  const nav = useNavigate();
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState(false);

  const load = () => api.get("/sales", { params: { status: statusFilter || undefined } }).then((r) => setSales(r.data));
  useEffect(() => {
    load();
    api.get("/customers").then((r) => setCustomers(r.data));
    api.get("/employees").then((r) => setEmployees(r.data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const custById = useMemo(() => Object.fromEntries(customers.map((c) => [c.id, c])), [customers]);
  const empById = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);

  const filtered = sales.filter((s) => {
    if (!search) return true;
    const c = custById[s.customer_id];
    const q = search.toLowerCase();
    return s.sale_no.toLowerCase().includes(q) || c?.name?.toLowerCase().includes(q) || c?.company?.toLowerCase().includes(q);
  });

  const totalValue = filtered.reduce((sum, s) => sum + (s.final_amount || 0), 0);
  const totalPending = filtered.reduce((sum, s) => sum + (s.pending_amount || 0), 0);

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Revenue</div>
          <h1 className="font-display text-3xl font-black tracking-tight md:text-4xl">Sales</h1>
        </div>
        <button onClick={() => setDialog(true)} className="inline-flex items-center gap-2 rounded-md bg-[#0B1B3D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#142D66]">
          <Plus size={16} weight="bold" /> New sale
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-md border border-[#E2E8F0] bg-white p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Total sales</div>
          <div className="font-display text-2xl font-black">{filtered.length}</div>
        </div>
        <div className="rounded-md border border-[#E2E8F0] bg-white p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Total value</div>
          <div className="font-display text-2xl font-black">{formatINR(totalValue)}</div>
        </div>
        <div className="rounded-md border border-[#E2E8F0] bg-white p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Pending collection</div>
          <div className="font-display text-2xl font-black text-amber-600">{formatINR(totalPending)}</div>
        </div>
        <div className="rounded-md border border-[#E2E8F0] bg-white p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Collected</div>
          <div className="font-display text-2xl font-black text-emerald-600">{formatINR(totalValue - totalPending)}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-md border border-[#E2E8F0] bg-white p-3">
        <div className="relative min-w-[200px] flex-1">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="Search invoice, customer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-[#E2E8F0] py-2 pl-9 pr-3 text-sm focus:border-[#0B1B3D] focus:outline-none focus:ring-2 focus:ring-[#0B1B3D]/15"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-md border border-[#E2E8F0] px-3 py-2 text-sm">
          <option value="">All status</option>
          {SALE_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto rounded-md border border-[#E2E8F0] bg-white">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#FAFAFA] text-left text-xs uppercase tracking-wider text-slate-500">
              <th className="py-3 pl-4 font-semibold">Invoice</th>
              <th className="py-3 font-semibold">Customer</th>
              <th className="py-3 font-semibold">Salesperson</th>
              <th className="py-3 font-semibold">Date</th>
              <th className="py-3 font-semibold">Amount</th>
              <th className="py-3 font-semibold">Profit</th>
              <th className="py-3 font-semibold">Status</th>
              <th className="py-3 pr-4 font-semibold">Due date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} className="cursor-pointer border-b border-[#F1F5F9] hover:bg-slate-50" onClick={() => nav(`/customers/${s.customer_id}`)}>
                <td className="py-3 pl-4 font-mono text-xs font-semibold text-[#0B1B3D]">{s.sale_no}</td>
                <td className="py-3">
                  <div className="font-medium text-slate-900">{custById[s.customer_id]?.name || "—"}</div>
                  <div className="text-xs text-slate-500">{s.product_service}</div>
                </td>
                <td className="py-3 text-slate-600">{empById[s.assigned_to]?.name || "—"}</td>
                <td className="py-3 text-xs text-slate-500">{relTime(s.sale_date)}</td>
                <td className="py-3 font-mono text-xs">
                  {formatINR(s.final_amount)}
                  {s.pending_amount > 0 && <div className="text-[10px] text-amber-600">{formatINR(s.pending_amount)} due</div>}
                </td>
                <td className="py-3 font-mono text-xs text-emerald-700">{formatINR(s.gross_profit)}</td>
                <td className="py-3"><StatusBadge status={s.status} /></td>
                <td className="py-3 pr-4 text-xs text-slate-500">{s.due_date ? new Date(s.due_date).toLocaleDateString() : "—"}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="py-12 text-center text-sm text-slate-500">No sales found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <NewSaleDialog open={dialog} onClose={() => setDialog(false)} onCreated={load} customers={customers} employees={employees} />
    </div>
  );
}
