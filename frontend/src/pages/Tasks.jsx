import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PRIORITIES, TASK_STATUSES, STATUS_COLORS, relTime } from "@/lib/constants";
import { Plus, X, Check, ListBullets, Calendar as CalIcon } from "@phosphor-icons/react";
import { toast } from "sonner";

const PRI_COLORS = {
  High: "bg-rose-50 text-rose-700 border-rose-200",
  Medium: "bg-amber-50 text-amber-700 border-amber-200",
  Low: "bg-slate-100 text-slate-700 border-slate-200",
};

function NewTaskDialog({ open, onClose, onCreated, leads, employees }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    lead_id: "",
    assigned_to: "",
    priority: "Medium",
    due_date: "",
    status: "Pending",
  });

  if (!open) return null;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/tasks", {
        ...form,
        lead_id: form.lead_id || null,
        assigned_to: form.assigned_to || null,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
      });
      toast.success("Task created");
      onCreated();
      onClose();
    } catch {
      toast.error("Failed");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-md bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-4">
          <div className="font-display text-lg font-bold">New task</div>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={submit} className="space-y-3 p-5">
          <input
            data-testid="task-title-input"
            placeholder="Title"
            required
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            className="w-full rounded-md border border-[#E2E8F0] px-3 py-2 text-sm"
          />
          <textarea
            data-testid="task-description-input"
            placeholder="Description"
            rows={2}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            className="w-full rounded-md border border-[#E2E8F0] px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              data-testid="task-priority-select"
              value={form.priority}
              onChange={(e) => set("priority", e.target.value)}
              className="rounded-md border border-[#E2E8F0] px-3 py-2 text-sm"
            >
              {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
            </select>
            <input
              data-testid="task-due-input"
              type="datetime-local"
              value={form.due_date}
              onChange={(e) => set("due_date", e.target.value)}
              className="rounded-md border border-[#E2E8F0] px-3 py-2 text-sm"
            />
          </div>
          <select
            value={form.lead_id}
            onChange={(e) => set("lead_id", e.target.value)}
            className="w-full rounded-md border border-[#E2E8F0] px-3 py-2 text-sm"
          >
            <option value="">Link to lead (optional)</option>
            {leads.slice(0, 100).map((l) => (
              <option key={l.id} value={l.id}>{l.name} — {l.company}</option>
            ))}
          </select>
          <select
            value={form.assigned_to}
            onChange={(e) => set("assigned_to", e.target.value)}
            className="w-full rounded-md border border-[#E2E8F0] px-3 py-2 text-sm"
          >
            <option value="">Assign to me</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
          <button
            data-testid="task-submit-btn"
            type="submit"
            className="w-full rounded-md bg-[#0B1B3D] py-2 text-sm font-semibold text-white hover:bg-[#142D66]"
          >
            Create task
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [leads, setLeads] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [filter, setFilter] = useState("All");
  const [view, setView] = useState("list");
  const [dialog, setDialog] = useState(false);

  const load = () => api.get("/tasks").then((r) => setTasks(r.data));
  useEffect(() => {
    load();
    api.get("/leads", { params: { limit: 200 } }).then((r) => setLeads(r.data));
    api.get("/employees").then((r) => setEmployees(r.data));
  }, []);

  const setStatus = async (t, status) => {
    await api.put(`/tasks/${t.id}`, { status });
    toast.success("Updated");
    load();
  };

  const leadById = Object.fromEntries(leads.map((l) => [l.id, l]));
  const empById = Object.fromEntries(employees.map((e) => [e.id, e]));

  const filtered = tasks.filter((t) => filter === "All" || t.status === filter);

  // Calendar grouping by due date (next 14 days)
  const calBuckets = {};
  filtered.forEach((t) => {
    if (!t.due_date) return;
    const day = new Date(t.due_date).toISOString().slice(0, 10);
    calBuckets[day] = calBuckets[day] || [];
    calBuckets[day].push(t);
  });
  const days = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
            Productivity
          </div>
          <h1 className="font-display text-3xl font-black tracking-tight md:text-4xl">Tasks</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-0.5">
            <button
              data-testid="tasks-view-list"
              onClick={() => setView("list")}
              className={`inline-flex items-center gap-1 rounded px-3 py-1.5 text-xs font-semibold ${
                view === "list" ? "bg-white text-[#0B1B3D] shadow-sm" : "text-slate-500"
              }`}
            >
              <ListBullets size={14} /> List
            </button>
            <button
              data-testid="tasks-view-calendar"
              onClick={() => setView("calendar")}
              className={`inline-flex items-center gap-1 rounded px-3 py-1.5 text-xs font-semibold ${
                view === "calendar" ? "bg-white text-[#0B1B3D] shadow-sm" : "text-slate-500"
              }`}
            >
              <CalIcon size={14} /> Calendar
            </button>
          </div>
          <select
            data-testid="tasks-filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-md border border-[#E2E8F0] px-3 py-2 text-sm"
          >
            <option>All</option>
            {TASK_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <button
            data-testid="new-task-btn"
            onClick={() => setDialog(true)}
            className="inline-flex items-center gap-1 rounded-md bg-[#0B1B3D] px-3 py-2 text-sm font-semibold text-white hover:bg-[#142D66]"
          >
            <Plus size={14} /> New task
          </button>
        </div>
      </div>

      {view === "list" ? (
        <div className="rounded-md border border-[#E2E8F0] bg-white">
          {filtered.map((t) => (
            <div
              key={t.id}
              data-testid={`task-row-${t.id}`}
              className="grid grid-cols-1 gap-3 border-b border-[#F1F5F9] p-4 last:border-0 md:grid-cols-12 md:items-center"
            >
              <button
                onClick={() => setStatus(t, t.status === "Completed" ? "Pending" : "Completed")}
                className={`grid h-7 w-7 place-items-center rounded-md border ${
                  t.status === "Completed"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : "border-[#E2E8F0]"
                }`}
              >
                {t.status === "Completed" && <Check size={14} weight="bold" />}
              </button>
              <div className="md:col-span-4">
                <div className={`font-medium ${t.status === "Completed" ? "line-through text-slate-400" : ""}`}>
                  {t.title}
                </div>
                <div className="text-xs text-slate-500">{leadById[t.lead_id]?.name || "—"}</div>
              </div>
              <div className="md:col-span-2">
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${PRI_COLORS[t.priority]}`}>
                  {t.priority}
                </span>
              </div>
              <div className="md:col-span-2 text-xs text-slate-500">
                {t.due_date ? relTime(t.due_date) : "—"}
              </div>
              <div className="md:col-span-2 text-xs text-slate-500">
                {empById[t.assigned_to]?.name || "Unassigned"}
              </div>
              <div>
                <select
                  data-testid={`task-status-${t.id}`}
                  value={t.status}
                  onChange={(e) => setStatus(t, e.target.value)}
                  className="rounded-md border border-[#E2E8F0] px-2 py-1 text-xs"
                >
                  {TASK_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="p-10 text-center text-sm text-slate-500">No tasks</div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
          {days.map((d) => {
            const items = calBuckets[d] || [];
            const dt = new Date(d);
            return (
              <div key={d} className="rounded-md border border-[#E2E8F0] bg-white p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  {dt.toLocaleDateString("en-IN", { weekday: "short" })}
                </div>
                <div className="font-display text-xl font-bold">{dt.getDate()}</div>
                <div className="mt-2 flex flex-col gap-1">
                  {items.map((t) => (
                    <div key={t.id} className="rounded border border-[#F1F5F9] p-2 text-xs">
                      <div className="font-medium">{t.title}</div>
                      <div className={`mt-1 inline-block rounded-full border px-1.5 py-0.5 text-[10px] ${PRI_COLORS[t.priority]}`}>
                        {t.priority}
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div className="text-[10px] text-slate-400">No tasks</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <NewTaskDialog
        open={dialog}
        onClose={() => setDialog(false)}
        onCreated={load}
        leads={leads}
        employees={employees}
      />
    </div>
  );
}
