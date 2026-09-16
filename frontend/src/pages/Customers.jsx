import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { CUSTOMER_STATUSES, CUSTOMER_STATUS_COLORS, formatINR, relTime } from "@/lib/constants";
import { Plus, MagnifyingGlass, Phone, WhatsappLogo, X } from "@phosphor-icons/react";
import { toast } from "sonner";

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
        CUSTOMER_STATUS_COLORS[status] || CUSTOMER_STATUS_COLORS.Lead
      }`}
    >
      {status}
    </span>
  );
}

function NewCustomerDialog({ open, onClose, onCreated, employees }) {
  const [form, setForm] = useState({
    name: "", company: "", phone: "", email: "", city: "", state: "",
    industry: "", source: "Website", status: "Prospect", assigned_to: "",
  });
  const [saving, setSaving] = useState(false);
  if (!open) return null;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.post("/customers", form);
      toast.success("Customer created");
      onCreated(data);
      onClose();
    } catch {
      toast.error("Failed to create customer");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-md bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-4">
          <div className="font-display text-lg font-bold">New customer</div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={submit} className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2">
          {[
            ["name", "Name *", true],
            ["company", "Company", false],
            ["phone", "Phone", false],
            ["email", "Email", false],
            ["city", "City", false],
            ["state", "State", false],
            ["industry", "Industry", false],
          ].map(([k, l, req]) => (
            <label key={k} className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{l}</span>
              <input
                required={req}
                value={form[k]}
                onChange={(e) => set(k, e.target.value)}
                className="rounded-md border border-[#E2E8F0] px-3 py-2 text-sm focus:border-[#0B1B3D] focus:outline-none focus:ring-2 focus:ring-[#0B1B3D]/15"
              />
            </label>
          ))}
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Status</span>
            <select value={form.status} onChange={(e) => set("status", e.target.value)} className="rounded-md border border-[#E2E8F0] px-3 py-2 text-sm">
              {CUSTOMER_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Assign to</span>
            <select value={form.assigned_to} onChange={(e) => set("assigned_to", e.target.value)} className="rounded-md border border-[#E2E8F0] px-3 py-2 text-sm">
              <option value="">Me</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </label>
          <div className="col-span-1 mt-2 flex justify-end gap-2 md:col-span-2">
            <button type="button" onClick={onClose} className="rounded-md border border-[#E2E8F0] px-4 py-2 text-sm font-medium hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="rounded-md bg-[#0B1B3D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#142D66] disabled:opacity-50">
              {saving ? "Saving…" : "Create customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Customers() {
  const nav = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dialog, setDialog] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api
      .get("/customers", { params: { search: search || undefined, status: statusFilter || undefined } })
      .then((r) => setCustomers(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    api.get("/employees").then((r) => setEmployees(r.data));
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter]);

  const empById = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Accounts</div>
          <h1 className="font-display text-3xl font-black tracking-tight md:text-4xl">Customers</h1>
        </div>
        <button
          onClick={() => setDialog(true)}
          className="inline-flex items-center gap-2 rounded-md bg-[#0B1B3D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#142D66]"
        >
          <Plus size={16} weight="bold" /> New customer
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-md border border-[#E2E8F0] bg-white p-3">
        <div className="relative min-w-[200px] flex-1">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="Search by name, company, phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-[#E2E8F0] py-2 pl-9 pr-3 text-sm focus:border-[#0B1B3D] focus:outline-none focus:ring-2 focus:ring-[#0B1B3D]/15"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-md border border-[#E2E8F0] px-3 py-2 text-sm">
          <option value="">All status</option>
          {CUSTOMER_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto rounded-md border border-[#E2E8F0] bg-white">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#FAFAFA] text-left text-xs uppercase tracking-wider text-slate-500">
              <th className="py-3 pl-4 font-semibold">Customer</th>
              <th className="py-3 font-semibold">Company</th>
              <th className="py-3 font-semibold">Phone</th>
              <th className="py-3 font-semibold">City</th>
              <th className="py-3 font-semibold">Salesperson</th>
              <th className="py-3 font-semibold">Status</th>
              <th className="py-3 font-semibold">Total sales</th>
              <th className="py-3 font-semibold">Pending</th>
              <th className="py-3 font-semibold">Last activity</th>
              <th className="py-3 pr-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr
                key={c.id}
                className="cursor-pointer border-b border-[#F1F5F9] hover:bg-slate-50"
                onClick={() => nav(`/customers/${c.id}`)}
              >
                <td className="py-3 pl-4 font-medium text-slate-900">{c.name}</td>
                <td className="py-3 text-slate-600">{c.company || "—"}</td>
                <td className="py-3 font-mono text-xs text-slate-500">{c.phone}</td>
                <td className="py-3 text-slate-600">{c.city || "—"}</td>
                <td className="py-3 text-slate-600">{empById[c.assigned_to]?.name || "—"}</td>
                <td className="py-3"><StatusBadge status={c.status} /></td>
                <td className="py-3 font-mono text-xs">{formatINR(c.total_sales)}</td>
                <td className="py-3 font-mono text-xs">
                  <span className={c.pending_amount > 0 ? "text-amber-700" : "text-slate-400"}>
                    {formatINR(c.pending_amount)}
                  </span>
                </td>
                <td className="py-3 text-xs text-slate-500">{relTime(c.last_activity)}</td>
                <td className="py-3 pr-4 text-right" onClick={(e) => e.stopPropagation()}>
                  {c.phone && (
                    <>
                      <a href={`tel:${c.phone}`} className="mr-1 inline-grid h-8 w-8 place-items-center rounded-md hover:bg-slate-100" title="Call">
                        <Phone size={16} weight="duotone" />
                      </a>
                      <a
                        href={`https://wa.me/${c.phone.replace(/\D/g, "")}`}
                        target="_blank" rel="noreferrer"
                        className="inline-grid h-8 w-8 place-items-center rounded-md hover:bg-slate-100"
                        title="WhatsApp"
                      >
                        <WhatsappLogo size={16} weight="duotone" />
                      </a>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {!loading && customers.length === 0 && (
              <tr>
                <td colSpan={10} className="py-12 text-center text-sm text-slate-500">
                  No customers found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <NewCustomerDialog open={dialog} onClose={() => setDialog(false)} onCreated={load} employees={employees} />
    </div>
  );
}
