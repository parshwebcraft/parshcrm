import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { STATUSES, STATUS_COLORS, SOURCES, formatINR, relTime } from "@/lib/constants";
import {
  Plus,
  MagnifyingGlass,
  Funnel,
  Table as TableIcon,
  Kanban,
  Phone,
  WhatsappLogo,
  X,
  UploadSimple,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import BulkImportDialog from "@/components/BulkImportDialog";

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
        STATUS_COLORS[status] || STATUS_COLORS.New
      }`}
    >
      {status}
    </span>
  );
}

function NewLeadDialog({ open, onClose, onCreated, employees }) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    company: "",
    city: "",
    industry: "",
    source: "Website",
    status: "New",
    budget: 0,
    requirements: "",
    assigned_to: "",
  });
  const [saving, setSaving] = useState(false);

  if (!open) return null;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.post("/leads", {
        ...form,
        budget: Number(form.budget) || 0,
      });
      toast.success("Lead created");
      onCreated(data);
      onClose();
    } catch (err) {
      toast.error("Failed to create lead");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      data-testid="new-lead-dialog"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="w-full max-w-lg rounded-md bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-4">
          <div className="font-display text-lg font-bold">New lead</div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={submit} className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2">
          {[
            ["name", "Name *", "text", true],
            ["company", "Company", "text", false],
            ["phone", "Phone", "text", false],
            ["email", "Email", "email", false],
            ["city", "City", "text", false],
            ["industry", "Industry", "text", false],
          ].map(([k, l, t, req]) => (
            <label key={k} className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {l}
              </span>
              <input
                data-testid={`new-lead-${k}`}
                type={t}
                required={req}
                value={form[k]}
                onChange={(e) => set(k, e.target.value)}
                className="rounded-md border border-[#E2E8F0] px-3 py-2 text-sm focus:border-[#0B1B3D] focus:outline-none focus:ring-2 focus:ring-[#0B1B3D]/15"
              />
            </label>
          ))}
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Source
            </span>
            <select
              data-testid="new-lead-source"
              value={form.source}
              onChange={(e) => set("source", e.target.value)}
              className="rounded-md border border-[#E2E8F0] px-3 py-2 text-sm"
            >
              {SOURCES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Status
            </span>
            <select
              data-testid="new-lead-status"
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
              className="rounded-md border border-[#E2E8F0] px-3 py-2 text-sm"
            >
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Budget (₹)
            </span>
            <input
              data-testid="new-lead-budget"
              type="number"
              value={form.budget}
              onChange={(e) => set("budget", e.target.value)}
              className="rounded-md border border-[#E2E8F0] px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Assign to
            </span>
            <select
              data-testid="new-lead-assigned"
              value={form.assigned_to}
              onChange={(e) => set("assigned_to", e.target.value)}
              className="rounded-md border border-[#E2E8F0] px-3 py-2 text-sm"
            >
              <option value="">Me</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </label>
          <label className="col-span-1 flex flex-col gap-1 md:col-span-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Requirements
            </span>
            <textarea
              data-testid="new-lead-requirements"
              rows={3}
              value={form.requirements}
              onChange={(e) => set("requirements", e.target.value)}
              className="rounded-md border border-[#E2E8F0] px-3 py-2 text-sm"
            />
          </label>
          <div className="col-span-1 mt-2 flex justify-end gap-2 md:col-span-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-[#E2E8F0] px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              data-testid="new-lead-submit"
              disabled={saving}
              className="rounded-md bg-[#0B1B3D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#142D66] disabled:opacity-50"
            >
              {saving ? "Saving…" : "Create lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Leads() {
  const nav = useNavigate();
  const [leads, setLeads] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [view, setView] = useState("table");
  const [dialog, setDialog] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const load = () => {
    api
      .get("/leads", {
        params: { search: search || undefined, status: statusFilter || undefined, source: sourceFilter || undefined },
      })
      .then((r) => setLeads(r.data));
  };

  useEffect(() => {
    api.get("/employees").then((r) => setEmployees(r.data));
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, sourceFilter]);

  const exportCSV = () => {
    const headers = ["name", "company", "phone", "email", "status", "source", "budget", "city"];
    const rows = [headers.join(",")];
    leads.forEach((l) => {
      rows.push(headers.map((h) => `"${(l[h] ?? "").toString().replace(/"/g, '""')}"`).join(","));
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads.csv";
    a.click();
  };

  const empById = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
            Pipeline
          </div>
          <h1 className="font-display text-3xl font-black tracking-tight md:text-4xl">
            Leads
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            data-testid="import-csv-btn"
            onClick={() => setImportOpen(true)}
            className="inline-flex items-center gap-1 rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
          >
            <UploadSimple size={14} weight="bold" /> Import CSV
          </button>
          <button
            data-testid="export-csv-btn"
            onClick={exportCSV}
            className="rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Export CSV
          </button>
          <button
            data-testid="new-lead-btn"
            onClick={() => setDialog(true)}
            className="inline-flex items-center gap-2 rounded-md bg-[#0B1B3D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#142D66]"
          >
            <Plus size={16} weight="bold" /> New lead
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-[#E2E8F0] bg-white p-3">
        <div className="relative min-w-[200px] flex-1">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            data-testid="leads-search-input"
            placeholder="Search by name, company, phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-[#E2E8F0] py-2 pl-9 pr-3 text-sm focus:border-[#0B1B3D] focus:outline-none focus:ring-2 focus:ring-[#0B1B3D]/15"
          />
        </div>
        <select
          data-testid="leads-status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-[#E2E8F0] px-3 py-2 text-sm"
        >
          <option value="">All status</option>
          {STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          data-testid="leads-source-filter"
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="rounded-md border border-[#E2E8F0] px-3 py-2 text-sm"
        >
          <option value="">All sources</option>
          {SOURCES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <div className="ml-auto inline-flex rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-0.5">
          <button
            data-testid="leads-view-table"
            onClick={() => setView("table")}
            className={`inline-flex items-center gap-1 rounded px-3 py-1.5 text-xs font-semibold ${
              view === "table" ? "bg-white text-[#0B1B3D] shadow-sm" : "text-slate-500"
            }`}
          >
            <TableIcon size={14} /> Table
          </button>
          <button
            data-testid="leads-view-kanban"
            onClick={() => setView("kanban")}
            className={`inline-flex items-center gap-1 rounded px-3 py-1.5 text-xs font-semibold ${
              view === "kanban" ? "bg-white text-[#0B1B3D] shadow-sm" : "text-slate-500"
            }`}
          >
            <Kanban size={14} /> Kanban
          </button>
        </div>
      </div>

      {view === "table" ? (
        <div className="overflow-x-auto rounded-md border border-[#E2E8F0] bg-white">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#FAFAFA] text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="py-3 pl-4 font-semibold">Name</th>
                <th className="py-3 font-semibold">Company</th>
                <th className="py-3 font-semibold">Phone</th>
                <th className="py-3 font-semibold">Status</th>
                <th className="py-3 font-semibold">Source</th>
                <th className="py-3 font-semibold">Budget</th>
                <th className="py-3 font-semibold">Owner</th>
                <th className="py-3 font-semibold">Score</th>
                <th className="py-3 font-semibold">Updated</th>
                <th className="py-3 pr-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr
                  key={l.id}
                  data-testid={`lead-row-${l.id}`}
                  className="cursor-pointer border-b border-[#F1F5F9] hover:bg-slate-50"
                  onClick={() => nav(`/leads/${l.id}`)}
                >
                  <td className="py-3 pl-4 font-medium text-slate-900">{l.name}</td>
                  <td className="py-3 text-slate-600">{l.company}</td>
                  <td className="py-3 font-mono text-xs text-slate-500">{l.phone}</td>
                  <td className="py-3"><StatusBadge status={l.status} /></td>
                  <td className="py-3 text-slate-600">{l.source}</td>
                  <td className="py-3 font-mono text-xs">{formatINR(l.budget)}</td>
                  <td className="py-3 text-slate-600">{empById[l.assigned_to]?.name || "—"}</td>
                  <td className="py-3">
                    <span className="inline-flex h-6 min-w-[2.25rem] items-center justify-center rounded-full bg-[#0B1B3D]/5 px-2 text-xs font-semibold text-[#0B1B3D]">
                      {l.score}
                    </span>
                  </td>
                  <td className="py-3 text-xs text-slate-500">{relTime(l.updated_at)}</td>
                  <td className="py-3 pr-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <a
                      data-testid={`lead-call-${l.id}`}
                      href={`tel:${l.phone}`}
                      className="mr-1 inline-grid h-8 w-8 place-items-center rounded-md hover:bg-slate-100"
                      title="Call"
                    >
                      <Phone size={16} weight="duotone" />
                    </a>
                    <a
                      data-testid={`lead-wa-${l.id}`}
                      href={`https://wa.me/${l.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-grid h-8 w-8 place-items-center rounded-md hover:bg-slate-100"
                      title="WhatsApp"
                    >
                      <WhatsappLogo size={16} weight="duotone" />
                    </a>
                  </td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-sm text-slate-500">
                    No leads found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <KanbanGrid leads={leads} onUpdate={load} empById={empById} />
      )}

      <NewLeadDialog
        open={dialog}
        onClose={() => setDialog(false)}
        onCreated={() => load()}
        employees={employees}
      />
      <BulkImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => load()}
      />
    </div>
  );
}

function KanbanGrid({ leads, onUpdate, empById }) {
  const nav = useNavigate();
  const [dragged, setDragged] = useState(null);
  const [overCol, setOverCol] = useState(null);

  const grouped = STATUSES.reduce((acc, s) => {
    acc[s] = leads.filter((l) => l.status === s);
    return acc;
  }, {});

  const drop = async (status) => {
    if (!dragged || dragged.status === status) {
      setDragged(null);
      setOverCol(null);
      return;
    }
    try {
      await api.put(`/leads/${dragged.id}`, { status });
      toast.success(`Moved to ${status}`);
      onUpdate();
    } catch (e) {
      toast.error("Failed to move");
    }
    setDragged(null);
    setOverCol(null);
  };

  return (
    <div className="flex gap-3 overflow-x-auto kanban-scroll pb-4">
      {STATUSES.map((status) => (
        <div
          key={status}
          data-testid={`kanban-column-${status.replace(" ", "-")}`}
          onDragOver={(e) => {
            e.preventDefault();
            setOverCol(status);
          }}
          onDragLeave={() => setOverCol((c) => (c === status ? null : c))}
          onDrop={() => drop(status)}
          className={`kanban-column min-w-[280px] flex-shrink-0 rounded-lg bg-[#F8FAFC] p-3 ${
            overCol === status ? "drag-over" : ""
          }`}
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusBadge status={status} />
              <span className="text-xs font-semibold text-slate-500">
                {grouped[status].length}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {grouped[status].map((l) => (
              <div
                key={l.id}
                data-testid={`kanban-card-${l.id}`}
                draggable
                onDragStart={() => setDragged(l)}
                onClick={() => nav(`/leads/${l.id}`)}
                className={`kanban-card cursor-pointer rounded-md border border-[#E2E8F0] bg-white p-3 shadow-sm hover:border-[#0B1B3D]/30 ${
                  dragged?.id === l.id ? "dragging" : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="font-medium text-slate-900">{l.name}</div>
                  <span className="inline-flex h-5 items-center rounded-full bg-[#0B1B3D]/5 px-1.5 text-[10px] font-semibold text-[#0B1B3D]">
                    {l.score}
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-500">{l.company}</div>
                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-mono">{formatINR(l.budget)}</span>
                  <span>{empById[l.assigned_to]?.name?.split(" ")[0] || "—"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
