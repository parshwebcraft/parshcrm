import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { STATUSES, STATUS_COLORS, formatINR } from "@/lib/constants";
import { toast } from "sonner";

export default function Pipeline() {
  const nav = useNavigate();
  const [leads, setLeads] = useState([]);
  const [dragged, setDragged] = useState(null);
  const [over, setOver] = useState(null);

  const load = () => api.get("/leads").then((r) => setLeads(r.data));
  useEffect(() => {
    load();
  }, []);

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

  return (
    <div className="mx-auto max-w-[1600px] space-y-4">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
          Sales
        </div>
        <h1 className="font-display text-3xl font-black tracking-tight md:text-4xl">
          Pipeline
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Drag leads across stages to update their status.
        </p>
      </div>

      <div className="flex gap-3 overflow-x-auto kanban-scroll pb-4">
        {STATUSES.map((status) => {
          const items = leads.filter((l) => l.status === status);
          const total = items.reduce((s, l) => s + (l.budget || 0), 0);
          return (
            <div
              key={status}
              data-testid={`pipeline-col-${status.replace(" ", "-")}`}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(status);
              }}
              onDragLeave={() => setOver((o) => (o === status ? null : o))}
              onDrop={() => drop(status)}
              className={`kanban-column min-w-[300px] flex-shrink-0 rounded-lg bg-[#F8FAFC] p-3 ${
                over === status ? "drag-over" : ""
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                    STATUS_COLORS[status]
                  }`}
                >
                  {status}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {items.length}
                </span>
              </div>
              <div className="mb-3 font-mono text-xs text-slate-500">
                {formatINR(total)}
              </div>
              <div className="flex flex-col gap-2">
                {items.map((l) => (
                  <div
                    key={l.id}
                    data-testid={`pipeline-card-${l.id}`}
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
                      <span>{l.source}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
