import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS, formatINR, relTime } from "@/lib/constants";
import { Plus, X, TrashSimple } from "@phosphor-icons/react";
import { toast } from "sonner";

function NewExpenseDialog({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ category: "Marketing", description: "", amount: "", date: "", payment_method: "Cash", notes: "" });
  const [saving, setSaving] = useState(false);
  if (!open) return null;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/expenses", { ...form, amount: Number(form.amount) || 0 });
      toast.success("Expense added");
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
          <div className="font-display text-lg font-bold">New expense</div>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={submit} className="space-y-3 p-5">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Category</span>
            <select value={form.category} onChange={(e) => set("category", e.target.value)} className="rounded-md border border-[#E2E8F0] px-3 py-2 text-sm">
              {EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Description</span>
            <input required value={form.description} onChange={(e) => set("description", e.target.value)} className="rounded-md border border-[#E2E8F0] px-3 py-2 text-sm" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Amount (₹)</span>
              <input required type="number" min="1" value={form.amount} onChange={(e) => set("amount", e.target.value)} className="rounded-md border border-[#E2E8F0] px-3 py-2 text-sm" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Date</span>
              <input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} className="rounded-md border border-[#E2E8F0] px-3 py-2 text-sm" />
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Payment method</span>
            <select value={form.payment_method} onChange={(e) => set("payment_method", e.target.value)} className="rounded-md border border-[#E2E8F0] px-3 py-2 text-sm">
              {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Notes</span>
            <textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} className="rounded-md border border-[#E2E8F0] px-3 py-2 text-sm" />
          </label>
          <button type="submit" disabled={saving} className="w-full rounded-md bg-[#0B1B3D] py-2 text-sm font-semibold text-white hover:bg-[#142D66] disabled:opacity-50">
            {saving ? "Saving…" : "Add expense"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [category, setCategory] = useState("");
  const [dialog, setDialog] = useState(false);

  const load = () => api.get("/expenses", { params: { category: category || undefined } }).then((r) => setExpenses(r.data));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const remove = async (id) => {
    if (!window.confirm("Delete this expense?")) return;
    await api.delete(`/expenses/${id}`);
    toast.success("Deleted");
    load();
  };

  const now = new Date();
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const thisMonth = expenses.filter((e) => {
    const d = new Date(e.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((s, e) => s + e.amount, 0);
  const marketing = expenses.filter((e) => ["Marketing", "Advertising"].includes(e.category)).reduce((s, e) => s + e.amount, 0);
  const operations = expenses.filter((e) => ["Operations", "Office", "Software"].includes(e.category)).reduce((s, e) => s + e.amount, 0);

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Costs</div>
          <h1 className="font-display text-3xl font-black tracking-tight md:text-4xl">Expenses</h1>
        </div>
        <button onClick={() => setDialog(true)} className="inline-flex items-center gap-2 rounded-md bg-[#0B1B3D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#142D66]">
          <Plus size={16} weight="bold" /> New expense
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-md border border-[#E2E8F0] bg-white p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Total expenses</div>
          <div className="font-display text-2xl font-black">{formatINR(total)}</div>
        </div>
        <div className="rounded-md border border-[#E2E8F0] bg-white p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">This month</div>
          <div className="font-display text-2xl font-black">{formatINR(thisMonth)}</div>
        </div>
        <div className="rounded-md border border-[#E2E8F0] bg-white p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Marketing</div>
          <div className="font-display text-2xl font-black">{formatINR(marketing)}</div>
        </div>
        <div className="rounded-md border border-[#E2E8F0] bg-white p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Operational</div>
          <div className="font-display text-2xl font-black">{formatINR(operations)}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-md border border-[#E2E8F0] bg-white p-3">
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-md border border-[#E2E8F0] px-3 py-2 text-sm">
          <option value="">All categories</option>
          {EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto rounded-md border border-[#E2E8F0] bg-white">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#FAFAFA] text-left text-xs uppercase tracking-wider text-slate-500">
              <th className="py-3 pl-4 font-semibold">Category</th>
              <th className="py-3 font-semibold">Description</th>
              <th className="py-3 font-semibold">Amount</th>
              <th className="py-3 font-semibold">Method</th>
              <th className="py-3 font-semibold">Date</th>
              <th className="py-3 pr-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id} className="border-b border-[#F1F5F9] hover:bg-slate-50">
                <td className="py-3 pl-4">
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700">{e.category}</span>
                </td>
                <td className="py-3 text-slate-700">{e.description}</td>
                <td className="py-3 font-mono text-xs font-semibold">{formatINR(e.amount)}</td>
                <td className="py-3 text-slate-600">{e.payment_method}</td>
                <td className="py-3 text-xs text-slate-500">{relTime(e.date)}</td>
                <td className="py-3 pr-4 text-right">
                  <button onClick={() => remove(e.id)} className="inline-grid h-8 w-8 place-items-center rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50">
                    <TrashSimple size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr><td colSpan={6} className="py-12 text-center text-sm text-slate-500">No expenses recorded</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <NewExpenseDialog open={dialog} onClose={() => setDialog(false)} onCreated={load} />
    </div>
  );
}
