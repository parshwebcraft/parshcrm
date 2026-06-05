import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { initials } from "@/lib/constants";
import { Plus, X, TrashSimple } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

const ROLE_COLORS = {
  admin: "bg-[#0B1B3D]/10 text-[#0B1B3D] border-[#0B1B3D]/20",
  manager: "bg-violet-50 text-violet-700 border-violet-200",
  sales: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

function NewEmployeeDialog({ open, onClose, onCreated }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "sales",
    password: "password123",
  });

  if (!open) return null;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/employees", form);
      toast.success("Employee added");
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-md bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-4">
          <div className="font-display text-lg font-bold">Add employee</div>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={submit} className="space-y-3 p-5">
          <input data-testid="emp-name-input" placeholder="Full name" required value={form.name} onChange={(e) => set("name", e.target.value)} className="w-full rounded-md border border-[#E2E8F0] px-3 py-2 text-sm" />
          <input data-testid="emp-email-input" placeholder="Email" type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} className="w-full rounded-md border border-[#E2E8F0] px-3 py-2 text-sm" />
          <input data-testid="emp-phone-input" placeholder="Phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} className="w-full rounded-md border border-[#E2E8F0] px-3 py-2 text-sm" />
          <select data-testid="emp-role-select" value={form.role} onChange={(e) => set("role", e.target.value)} className="w-full rounded-md border border-[#E2E8F0] px-3 py-2 text-sm">
            <option value="sales">Sales</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
          <input data-testid="emp-password-input" placeholder="Password" value={form.password} onChange={(e) => set("password", e.target.value)} className="w-full rounded-md border border-[#E2E8F0] px-3 py-2 text-sm" />
          <button data-testid="emp-submit-btn" type="submit" className="w-full rounded-md bg-[#0B1B3D] py-2 text-sm font-semibold text-white hover:bg-[#142D66]">
            Add employee
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Employees() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [emps, setEmps] = useState([]);
  const [perf, setPerf] = useState([]);
  const [dialog, setDialog] = useState(false);

  const load = () => {
    api.get("/employees").then((r) => setEmps(r.data));
    api.get("/reports/employee-performance").then((r) => setPerf(r.data));
  };
  useEffect(() => {
    load();
  }, []);

  const remove = async (id) => {
    if (!window.confirm("Delete employee?")) return;
    try {
      await api.delete(`/employees/${id}`);
      toast.success("Removed");
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed");
    }
  };

  const perfById = Object.fromEntries(perf.map((p) => [p.user_id, p]));

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
            Team
          </div>
          <h1 className="font-display text-3xl font-black tracking-tight md:text-4xl">Employees</h1>
        </div>
        {(user?.role === "admin" || user?.role === "manager") && (
          <button
            data-testid="new-emp-btn"
            onClick={() => setDialog(true)}
            className="inline-flex items-center gap-1 rounded-md bg-[#0B1B3D] px-3 py-2 text-sm font-semibold text-white hover:bg-[#142D66]"
          >
            <Plus size={14} /> Add employee
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-md border border-[#E2E8F0] bg-white">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#FAFAFA] text-left text-xs uppercase tracking-wider text-slate-500">
              <th className="py-3 pl-4 font-semibold">Member</th>
              <th className="py-3 font-semibold">Role</th>
              <th className="py-3 font-semibold">Email</th>
              <th className="py-3 font-semibold">Phone</th>
              <th className="py-3 font-semibold">Leads</th>
              <th className="py-3 font-semibold">Won</th>
              <th className="py-3 pr-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {emps.map((e) => {
              const p = perfById[e.id];
              return (
                <tr
                  key={e.id}
                  data-testid={`emp-row-${e.id}`}
                  onClick={() => nav(`/employees/${e.id}`)}
                  className="cursor-pointer border-b border-[#F1F5F9] hover:bg-slate-50"
                >
                  <td className="py-3 pl-4">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-full bg-[#0B1B3D] text-xs font-semibold text-white">
                        {initials(e.name)}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">{e.name}</div>
                        <div className="text-[10px] text-slate-500">Joined {new Date(e.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${ROLE_COLORS[e.role]}`}>
                      {e.role}
                    </span>
                  </td>
                  <td className="py-3 text-slate-600">{e.email}</td>
                  <td className="py-3 font-mono text-xs text-slate-500">{e.phone}</td>
                  <td className="py-3">{p?.total_leads ?? 0}</td>
                  <td className="py-3 font-semibold text-emerald-600">{p?.won ?? 0}</td>
                  <td className="py-3 pr-4 text-right" onClick={(ev) => ev.stopPropagation()}>
                    {user?.role === "admin" && e.id !== user.id && (
                      <button
                        data-testid={`emp-delete-${e.id}`}
                        onClick={() => remove(e.id)}
                        className="inline-grid h-8 w-8 place-items-center rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50"
                      >
                        <TrashSimple size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <NewEmployeeDialog open={dialog} onClose={() => setDialog(false)} onCreated={load} />
    </div>
  );
}
