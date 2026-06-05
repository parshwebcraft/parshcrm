import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { relTime } from "@/lib/constants";
import { Phone, PhoneSlash, Sparkle, X } from "@phosphor-icons/react";
import { toast } from "sonner";

const OUTCOMES = ["Connected", "No Answer", "Voicemail", "Busy", "Wrong Number"];

function fmtDur(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

function DialerModal({ lead, onClose, onLogged }) {
  const [phase, setPhase] = useState("dialing"); // dialing | ringing | connected | wrapup
  const [seconds, setSeconds] = useState(0);
  const [outcome, setOutcome] = useState("Connected");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const tickRef = useRef(null);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("ringing"), 1200);
    const t2 = setTimeout(() => setPhase("connected"), 2800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  useEffect(() => {
    if (phase === "connected") {
      tickRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    }
    return () => clearInterval(tickRef.current);
  }, [phase]);

  const hangup = () => {
    clearInterval(tickRef.current);
    setPhase("wrapup");
  };

  const save = async () => {
    setSaving(true);
    try {
      const { data: call } = await api.post("/calls", {
        lead_id: lead.id,
        duration: seconds,
        outcome,
        notes,
      });
      // Try AI summary in background (non-blocking)
      api.post(`/calls/${call.id}/ai-summary`).then(() => {
        toast.success("AI summary generated");
      }).catch(() => {});
      toast.success("Call logged");
      onLogged();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div data-testid="dialer-modal" className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            {phase === "wrapup" ? "Log call" : "In call"}
          </div>
          <button onClick={onClose} className="text-slate-400">
            <X size={18} />
          </button>
        </div>
        <div className="mt-3 text-center">
          <div className="mx-auto mb-3 grid h-20 w-20 place-items-center rounded-full bg-[#0B1B3D] font-display text-3xl font-black text-white">
            {lead?.name?.[0] || "?"}
          </div>
          <div className="font-display text-xl font-bold">{lead?.name}</div>
          <div className="text-sm text-slate-500">{lead?.company}</div>
          <div className="mt-1 font-mono text-xs text-slate-500">{lead?.phone}</div>
        </div>

        {phase === "wrapup" ? (
          <div className="mt-5 space-y-3">
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Duration
              </div>
              <div className="font-mono">{fmtDur(seconds)}</div>
            </div>
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Outcome
              </div>
              <select
                data-testid="call-outcome-select"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                className="w-full rounded-md border border-[#E2E8F0] px-3 py-2 text-sm"
              >
                {OUTCOMES.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Notes
              </div>
              <textarea
                data-testid="call-notes-input"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What happened on this call?"
                className="w-full rounded-md border border-[#E2E8F0] px-3 py-2 text-sm"
              />
            </div>
            <button
              data-testid="call-save-btn"
              disabled={saving}
              onClick={save}
              className="w-full rounded-md bg-[#0B1B3D] py-2.5 text-sm font-semibold text-white hover:bg-[#142D66] disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save & generate AI summary"}
            </button>
          </div>
        ) : (
          <>
            <div className="mt-5 text-center text-xs uppercase tracking-wider text-slate-500">
              {phase === "dialing" && "Dialing…"}
              {phase === "ringing" && "Ringing…"}
              {phase === "connected" && "Connected"}
            </div>
            <div className="mt-1 text-center font-mono text-2xl font-bold">
              {fmtDur(seconds)}
            </div>
            <div className="mt-5 flex justify-center">
              <button
                data-testid="call-hangup-btn"
                onClick={hangup}
                className="grid h-14 w-14 place-items-center rounded-full bg-rose-500 text-white shadow-lg hover:bg-rose-600"
              >
                <PhoneSlash size={22} weight="fill" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function Calls() {
  const [calls, setCalls] = useState([]);
  const [leads, setLeads] = useState([]);
  const [active, setActive] = useState(null);
  const [summarizing, setSummarizing] = useState(null);

  const load = () => {
    api.get("/calls").then((r) => setCalls(r.data));
  };
  useEffect(() => {
    load();
    api.get("/leads", { params: { limit: 200 } }).then((r) => setLeads(r.data));
  }, []);

  const leadById = Object.fromEntries(leads.map((l) => [l.id, l]));

  const regenerate = async (callId) => {
    setSummarizing(callId);
    try {
      await api.post(`/calls/${callId}/ai-summary`);
      toast.success("AI summary updated");
      load();
    } catch {
      toast.error("Failed");
    } finally {
      setSummarizing(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
          Communications
        </div>
        <h1 className="font-display text-3xl font-black tracking-tight md:text-4xl">
          Call center
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Click-to-call simulator with AI-generated post-call summaries.
        </p>
      </div>

      {/* Click-to-call deck */}
      <div className="rounded-md border border-[#E2E8F0] bg-white p-5">
        <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Quick dial
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          {leads.slice(0, 9).map((l) => (
            <button
              key={l.id}
              data-testid={`quick-dial-${l.id}`}
              onClick={() => setActive(l)}
              className="flex items-center gap-3 rounded-md border border-[#E2E8F0] p-3 text-left hover:border-[#0B1B3D]/30"
            >
              <div className="grid h-9 w-9 place-items-center rounded-md bg-[#0B1B3D]/5">
                <Phone size={16} weight="duotone" className="text-[#0B1B3D]" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">{l.name}</div>
                <div className="text-xs text-slate-500">{l.company}</div>
              </div>
              <div className="font-mono text-[10px] text-slate-400">{l.phone}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Recent calls */}
      <div className="rounded-md border border-[#E2E8F0] bg-white">
        <div className="border-b border-[#E2E8F0] p-5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            History
          </div>
          <div className="font-display text-xl font-bold">Recent calls</div>
        </div>
        <div className="divide-y divide-[#F1F5F9]">
          {calls.slice(0, 40).map((c) => {
            const l = leadById[c.lead_id];
            return (
              <div key={c.id} className="grid grid-cols-1 gap-2 p-4 md:grid-cols-12 md:items-center">
                <div className="md:col-span-3">
                  <div className="font-medium text-slate-900">{l?.name || "Unknown lead"}</div>
                  <div className="text-xs text-slate-500">{l?.company}</div>
                </div>
                <div className="md:col-span-2 text-xs">
                  <div className="font-semibold">{c.outcome}</div>
                  <div className="font-mono text-slate-500">{fmtDur(c.duration)}</div>
                </div>
                <div className="md:col-span-5 text-sm text-slate-600">
                  {c.summary || c.notes || <span className="italic text-slate-400">No summary yet</span>}
                  {c.summary && (
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px]">
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700 capitalize">
                        {c.sentiment}
                      </span>
                      <span className="rounded-full bg-[#0B1B3D]/5 px-2 py-0.5 font-medium text-[#0B1B3D]">
                        Score {c.lead_score}
                      </span>
                      {c.next_action && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700">
                          {c.next_action}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="md:col-span-2 flex items-center justify-between gap-2">
                  <div className="text-[10px] text-slate-500">{relTime(c.created_at)}</div>
                  <button
                    data-testid={`ai-summarize-${c.id}`}
                    disabled={summarizing === c.id}
                    onClick={() => regenerate(c.id)}
                    className="inline-flex items-center gap-1 rounded-md border border-[#E2E8F0] px-2 py-1 text-[10px] font-semibold hover:bg-slate-50 disabled:opacity-50"
                  >
                    <Sparkle size={12} weight="duotone" /> {summarizing === c.id ? "…" : "AI"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {active && <DialerModal lead={active} onClose={() => setActive(null)} onLogged={load} />}
    </div>
  );
}
