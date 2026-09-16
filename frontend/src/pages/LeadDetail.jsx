import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { STATUSES, STATUS_COLORS, SOURCES, PRIORITIES, formatINR, relTime } from "@/lib/constants";
import {
  Phone,
  WhatsappLogo,
  Plus,
  Notepad,
  ArrowLeft,
  TrashSimple,
  UserSwitch,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import LeadDocuments from "@/components/LeadDocuments";

export default function LeadDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [lead, setLead] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [calls, setCalls] = useState([]);
  const [msgs, setMsgs] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [note, setNote] = useState("");

  const load = () => {
    api.get(`/leads/${id}`).then((r) => setLead(r.data));
    api.get(`/leads/${id}/timeline`).then((r) => setTimeline(r.data));
    api.get(`/calls`, { params: { lead_id: id } }).then((r) => setCalls(r.data));
    api.get(`/whatsapp/messages`, { params: { lead_id: id } }).then((r) => setMsgs(r.data));
    api.get(`/tasks`, { params: { lead_id: id } }).then((r) => setTasks(r.data));
  };

  useEffect(() => {
    load();
    api.get("/employees").then((r) => setEmployees(r.data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!lead) return <div className="text-slate-500">Loading…</div>;

  const updateField = async (k, v) => {
    await api.put(`/leads/${lead.id}`, { [k]: v });
    toast.success("Updated");
    load();
  };

  const addNote = async () => {
    if (!note.trim()) return;
    await api.put(`/leads/${lead.id}`, { notes: (lead.notes ? lead.notes + "\n\n" : "") + note });
    // also add activity
    setNote("");
    toast.success("Note added");
    load();
  };

  const deleteLead = async () => {
    if (!window.confirm("Delete this lead?")) return;
    try {
      await api.delete(`/leads/${lead.id}`);
      toast.success("Deleted");
      nav("/leads");
    } catch {
      toast.error("Cannot delete");
    }
  };

  const convertToCustomer = async () => {
    try {
      const { data } = await api.post(`/leads/${lead.id}/convert`);
      toast.success("Converted to customer");
      nav(`/customers/${data.id}`);
    } catch {
      toast.error("Failed to convert");
    }
  };

  const owner = employees.find((e) => e.id === lead.assigned_to);

  return (
    <div className="mx-auto max-w-7xl">
      <button
        data-testid="back-to-leads-btn"
        onClick={() => nav("/leads")}
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft size={16} /> Back to leads
      </button>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main */}
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-md border border-[#E2E8F0] bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                  {lead.company || "—"}
                </div>
                <h1 data-testid="lead-name" className="font-display text-3xl font-black tracking-tight">
                  {lead.name}
                </h1>
                <div className="mt-1 text-sm text-slate-500">{lead.email}</div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  data-testid="quick-call-btn"
                  href={`tel:${lead.phone}`}
                  className="inline-flex items-center gap-1 rounded-md bg-[#0B1B3D] px-3 py-2 text-xs font-semibold text-white hover:bg-[#142D66]"
                >
                  <Phone size={14} /> Call
                </a>
                <a
                  data-testid="quick-wa-btn"
                  href={`https://wa.me/${(lead.phone || "").replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-[#E2E8F0] px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                >
                  <WhatsappLogo size={14} /> WhatsApp
                </a>
                <button
                  data-testid="convert-customer-btn"
                  onClick={convertToCustomer}
                  className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                >
                  <UserSwitch size={14} /> Convert to customer
                </button>
                <button
                  data-testid="delete-lead-btn"
                  onClick={deleteLead}
                  className="inline-grid h-9 w-9 place-items-center rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50"
                >
                  <TrashSimple size={14} />
                </button>
              </div>
            </div>
          </div>

          <Tabs defaultValue="overview">
            <TabsList data-testid="lead-tabs">
              <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
              <TabsTrigger value="timeline" data-testid="tab-timeline">Timeline</TabsTrigger>
              <TabsTrigger value="calls" data-testid="tab-calls">Calls</TabsTrigger>
              <TabsTrigger value="whatsapp" data-testid="tab-whatsapp">WhatsApp</TabsTrigger>
              <TabsTrigger value="tasks" data-testid="tab-tasks">Tasks</TabsTrigger>
              <TabsTrigger value="documents" data-testid="tab-documents">Documents</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid grid-cols-2 gap-3 rounded-md border border-[#E2E8F0] bg-white p-5">
                {[
                  ["Phone", lead.phone],
                  ["Email", lead.email],
                  ["Company", lead.company],
                  ["Website", lead.website],
                  ["City", lead.city],
                  ["State", lead.state],
                  ["Industry", lead.industry],
                  ["Source", lead.source],
                  ["Product / Service", lead.product_service],
                  ["Budget", formatINR(lead.budget)],
                  ["Priority", lead.priority],
                  ["Next follow-up", lead.next_follow_up ? relTime(lead.next_follow_up) : null],
                  ["Created", relTime(lead.created_at)],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      {k}
                    </div>
                    <div className="text-sm text-slate-900">{v || "—"}</div>
                  </div>
                ))}
                <div className="col-span-2">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Requirements
                  </div>
                  <div className="mt-1 text-sm text-slate-900">{lead.requirements || "—"}</div>
                </div>
                <div className="col-span-2">
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Add internal note
                  </div>
                  <div className="flex gap-2">
                    <input
                      data-testid="lead-note-input"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Write a note…"
                      className="flex-1 rounded-md border border-[#E2E8F0] px-3 py-2 text-sm"
                    />
                    <button
                      data-testid="lead-note-add-btn"
                      onClick={addNote}
                      className="rounded-md bg-[#0B1B3D] px-3 py-2 text-xs font-semibold text-white hover:bg-[#142D66]"
                    >
                      <Plus size={14} className="inline" /> Add
                    </button>
                  </div>
                  {lead.notes && (
                    <pre className="mt-3 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-md border border-[#F1F5F9] bg-[#FAFAFA] p-3 text-xs text-slate-700">
                      {lead.notes}
                    </pre>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="timeline">
              <div className="space-y-2 rounded-md border border-[#E2E8F0] bg-white p-5">
                {timeline.length === 0 && (
                  <div className="text-sm text-slate-500">No activity yet.</div>
                )}
                {timeline.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 border-b border-[#F1F5F9] pb-2 last:border-0">
                    <div className="grid h-8 w-8 place-items-center rounded-md bg-[#0B1B3D]/5">
                      <Notepad size={14} className="text-[#0B1B3D]" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-slate-900">{a.description}</div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-400">
                        {a.type} · {relTime(a.created_at)}
                      </div>
                    </div>
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
                      <div className="text-xs text-slate-500">{Math.floor(c.duration / 60)}m {c.duration % 60}s · {relTime(c.created_at)}</div>
                    </div>
                    {c.notes && <div className="mt-1 text-xs text-slate-600">{c.notes}</div>}
                    {c.summary && (
                      <div className="mt-2 rounded border border-emerald-200 bg-emerald-50/40 p-2 text-xs">
                        <span className="font-semibold text-emerald-800">AI Summary:</span> {c.summary}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="whatsapp">
              <div className="space-y-2 rounded-md border border-[#E2E8F0] bg-white p-5">
                {msgs.length === 0 && <div className="text-sm text-slate-500">No WhatsApp messages.</div>}
                {msgs.map((m) => (
                  <div key={m.id} className={`flex ${m.direction === "out" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-lg p-2.5 text-sm ${
                        m.direction === "out" ? "bg-[#D9FDD3]" : "bg-slate-100"
                      }`}
                    >
                      {m.text}
                      <div className="mt-0.5 text-right text-[10px] text-slate-500">
                        {relTime(m.created_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="tasks">
              <div className="space-y-2 rounded-md border border-[#E2E8F0] bg-white p-5">
                {tasks.length === 0 && <div className="text-sm text-slate-500">No tasks.</div>}
                {tasks.map((t) => (
                  <div key={t.id} className="flex items-center justify-between rounded-md border border-[#F1F5F9] p-3 text-sm">
                    <div>
                      <div className="font-medium">{t.title}</div>
                      <div className="text-xs text-slate-500">Due {relTime(t.due_date)} · {t.priority}</div>
                    </div>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[t.status] || "border-slate-200 text-slate-600"}`}>
                      {t.status}
                    </span>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="documents">
              <LeadDocuments leadId={lead.id} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right rail */}
        <aside className="space-y-4">
          <div className="rounded-md border border-[#E2E8F0] bg-white p-5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Lead score
            </div>
            <div className="mt-2 flex items-center gap-3">
              <div className="font-display text-5xl font-black tracking-tight text-[#0B1B3D]">
                {lead.score}
              </div>
              <div className="text-xs text-slate-500">/ 100</div>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-gradient-to-r from-[#0B1B3D] to-[#2563EB]"
                style={{ width: `${lead.score}%` }}
              />
            </div>
          </div>

          <div className="rounded-md border border-[#E2E8F0] bg-white p-5">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Stage
            </div>
            <select
              data-testid="lead-status-select"
              value={lead.status}
              onChange={(e) => updateField("status", e.target.value)}
              className="w-full rounded-md border border-[#E2E8F0] px-3 py-2 text-sm"
            >
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>

            <div className="mb-2 mt-4 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Priority
            </div>
            <select
              data-testid="lead-priority-select"
              value={lead.priority || "Medium"}
              onChange={(e) => updateField("priority", e.target.value)}
              className="w-full rounded-md border border-[#E2E8F0] px-3 py-2 text-sm"
            >
              {PRIORITIES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>

            <div className="mb-2 mt-4 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Next follow-up
            </div>
            <input
              data-testid="lead-followup-input"
              type="date"
              value={lead.next_follow_up ? lead.next_follow_up.slice(0, 10) : ""}
              onChange={(e) => updateField("next_follow_up", e.target.value ? new Date(e.target.value).toISOString() : null)}
              className="w-full rounded-md border border-[#E2E8F0] px-3 py-2 text-sm"
            />

            <div className="mb-2 mt-4 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Owner
            </div>
            <select
              data-testid="lead-owner-select"
              value={lead.assigned_to || ""}
              onChange={(e) => updateField("assigned_to", e.target.value)}
              className="w-full rounded-md border border-[#E2E8F0] px-3 py-2 text-sm"
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>

            <div className="mb-2 mt-4 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Source
            </div>
            <select
              data-testid="lead-source-select"
              value={lead.source}
              onChange={(e) => updateField("source", e.target.value)}
              className="w-full rounded-md border border-[#E2E8F0] px-3 py-2 text-sm"
            >
              {SOURCES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>

            <div className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Last activity
            </div>
            <div className="text-sm text-slate-900">{relTime(lead.last_activity)}</div>

            <div className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Owner
            </div>
            <div className="text-sm text-slate-900">{owner?.name || "—"}</div>
          </div>
        </aside>
      </div>
    </div>
  );
}
