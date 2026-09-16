import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { STATUSES, STATUS_COLORS, formatINR, relTime } from "@/lib/constants";
import { toast } from "sonner";

const PRI_COLORS = {
  High: "bg-rose-50 text-rose-700 border-rose-200",
  Medium: "bg-amber-50 text-amber-700 border-amber-200",
  Low: "bg-slate-100 text-slate-700 border-slate-200",
};

function HeaderStat({ label, value, accent }) {
  return (
    <div className="rounded-md border border-[#E2E8F0] bg-white p-4">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mt-1 font-display text-xl font-black tracking-tight ${accent || "text-slate-900"}`}>{value}</div>
    </div>
  );
}

export default function Pipeline() {
  const nav = useNavigate();
  const [leads, setLeads] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [dragged, setDragged] = useState(null);
  const [over, setOver] = useState(null);

  const load = () => api.get("/leads", { params: { limit: 500 } }).then((r) => setLeads(r.data));
  useEffect(() => {
    load();
    api.get("/employees").then((r) => setEmployees(r.data));
  }, []);

  const empById = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);

  const drop = async (status) => {
    if (!dragged || dragged.status === status) {
      setDragged(null);
      setOver(null);
      return;
    }
    await api.put(`/leads/${dragged.id}`, { status });
    toast.success(`Moved ${dragged.name} → ${status}`);
    setDragged(null);
    setOver(null);
    load();
  };

  const openDeals = leads.filter((l) => l.status !== "Won" && l.status !== "Lost");
  const wonDeals = leads.filter((l) => l.status === "Won");
  const lostDeals = leads.filter((l) => l.status === "Lost");
  const pipelineValue = openDeals.reduce((s, l) => s + (l.budget || 0), 0);
  const weightedPipeline = openDeals.reduce((s, l) => s + (l.budget || 0) * ((l.score || 0) / 100), 0);
  const wonValue = wonDeals.reduce((s, l) => s + (l.budget || 0), 0);
  const lostValue = lostDeals.reduce((s, l) => s + (l.budget || 0), 0);

  return (
    <div className="mx-auto max-w-[1600px] space-y-4">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Sales</div>
        <h1 className="font-display text-3xl font-black tracking-tight md:text-4xl">Pipeline</h1>
        <p className="mt-1 text-sm text-slate-500">Drag leads across stages to update their status.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <HeaderStat label="Total opportunities" value={openDeals.length} />
        <HeaderStat label="Pipeline value" value={formatINR(pipelineValue)} />
        <HeaderStat label="Weighted pipeline" value={formatINR(weightedPipeline)} accent="text-[#0B1B3D]" />
        <HeaderStat label="Won value" value={formatINR(wonValue)} accent="text-emerald-600" />
        <HeaderStat label="Lost value" value={formatINR(lostValue)} accent="text-rose-600" />
      </div>

      <div className="flex gap-3 overflow-x-auto kanban-scroll pb-4">
        {STATUSES.map((status) => {
          const items = leads.filter((l) => l.status === status);
          const total = items.reduce((s, l) => s + (l.budget || 0), 0);
          return (
            <div
              key={status}
              data-testid={`pipeline-col-${status.replace(" ", "-")}`}
              onDragOver={(e) => { e.preventDefault(); setOver(status); }}
              onDragLeave={() => setOver((o) => (o === status ? null : o))}
              onDrop={() => drop(status)}
              className={`kanban-column min-w-[300px] flex-shrink-0 rounded-lg bg-[#F8FAFC] p-3 ${over === status ? "drag-over" : ""}`}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}>{status}</span>
                <span className="text-xs font-semibold text-slate-500">{items.length}</span>
              </div>
              <div className="mb-3 font-mono text-xs text-slate-500">{formatINR(total)}</div>
              <div className="flex flex-col gap-2">
                {items.map((l) => (
                  <div
                    key={l.id}
                    data-testid={`pipeline-card-${l.id}`}
                    draggable
                    onDragStart={() => setDragged(l)}
                    onClick={() => nav(`/leads/${l.id}`)}
                    className={`kanban-card cursor-pointer rounded-md border border-[#E2E8F0] bg-white p-3 shadow-sm hover:border-[#0B1B3D]/30 ${dragged?.id === l.id ? "dragging" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium text-slate-900">{l.name}</div>
                      <span className="inline-flex h-5 flex-shrink-0 items-center rounded-full bg-[#0B1B3D]/5 px-1.5 text-[10px] font-semibold text-[#0B1B3D]">{l.score}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{l.company}</div>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                      <span className="font-mono font-semibold text-slate-600">{formatINR(l.budget)}</span>
                      {l.priority && (
                        <span className={`rounded-full border px-1.5 py-0.5 font-medium ${PRI_COLORS[l.priority] || ""}`}>{l.priority}</span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t border-[#F1F5F9] pt-2 text-[10px] text-slate-400">
                      <span>{empById[l.assigned_to]?.name?.split(" ")[0] || "Unassigned"}</span>
                      <span>{l.next_follow_up ? `Follow-up ${relTime(l.next_follow_up)}` : relTime(l.last_activity)}</span>
                    </div>
                  </div>
                ))}
                {items.length === 0 && <div className="py-6 text-center text-[10px] text-slate-400">No deals</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
