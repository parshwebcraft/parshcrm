import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { relTime, initials } from "@/lib/constants";
import { PaperPlaneTilt, MagnifyingGlass, ArrowLeft } from "@phosphor-icons/react";
import { toast } from "sonner";

const TEMPLATES = [
  "Hi, thanks for your interest! Let me share more details.",
  "Sharing our proposal now.",
  "When would be a good time for a quick call?",
  "Our pricing starts at ₹30,000 for the basic package.",
  "Thanks! We'll deliver within 7 working days.",
];

export default function WhatsAppPage() {
  const [convs, setConvs] = useState([]);
  const [active, setActive] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [filter, setFilter] = useState("");
  const scrollerRef = useRef(null);

  const loadConvs = () => api.get("/whatsapp/conversations").then((r) => setConvs(r.data));

  useEffect(() => {
    loadConvs();
  }, []);

  useEffect(() => {
    if (!active) return;
    api.get("/whatsapp/messages", { params: { lead_id: active.lead_id } }).then((r) => {
      setMsgs(r.data);
      setTimeout(() => {
        if (scrollerRef.current) scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
      }, 50);
    });
  }, [active]);

  const send = async (body) => {
    const msg = body ?? text;
    if (!msg.trim() || !active) return;
    setText("");
    try {
      const { data } = await api.post("/whatsapp/send", { lead_id: active.lead_id, text: msg });
      setMsgs((m) => [...m, data]);
      loadConvs();
      setTimeout(() => {
        if (scrollerRef.current) scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
      }, 50);
    } catch {
      toast.error("Failed to send");
    }
  };

  const filtered = convs.filter(
    (c) =>
      !filter ||
      c.lead_name.toLowerCase().includes(filter.toLowerCase()) ||
      (c.company || "").toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div className="flex h-[calc(100vh-3.5rem-4rem)] lg:h-[calc(100vh-3.5rem)]">
      {/* Conversation list */}
      <aside
        className={`flex w-full flex-col border-r border-[#E2E8F0] bg-white md:w-80 lg:w-96 ${
          active ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="border-b border-[#E2E8F0] p-3">
          <div className="font-display text-lg font-bold">WhatsApp</div>
          <div className="relative mt-2">
            <MagnifyingGlass size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              data-testid="wa-search-input"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search chats"
              className="w-full rounded-md border border-[#E2E8F0] bg-[#FAFAFA] py-1.5 pl-8 pr-2 text-xs"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map((c) => (
            <button
              key={c.lead_id}
              data-testid={`wa-conv-${c.lead_id}`}
              onClick={() => setActive(c)}
              className={`flex w-full items-center gap-3 border-b border-[#F1F5F9] p-3 text-left hover:bg-slate-50 ${
                active?.lead_id === c.lead_id ? "bg-slate-50" : ""
              }`}
            >
              <div className="grid h-10 w-10 place-items-center rounded-full bg-[#25D366]/10 text-sm font-semibold text-[#0B1B3D]">
                {initials(c.lead_name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <div className="truncate text-sm font-semibold">{c.lead_name}</div>
                  <div className="text-[10px] text-slate-400">{relTime(c.last_time)}</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="truncate text-xs text-slate-500">
                    {c.last_direction === "out" ? "You: " : ""}
                    {c.last_message}
                  </div>
                  {c.unread > 0 && (
                    <span className="ml-2 inline-grid h-4 min-w-4 place-items-center rounded-full bg-[#25D366] px-1 text-[10px] font-bold text-white">
                      {c.unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* Conversation pane */}
      <section className={`flex flex-1 flex-col ${active ? "flex" : "hidden md:flex"}`}>
        {active ? (
          <>
            <div className="flex items-center gap-3 border-b border-[#E2E8F0] bg-white p-3">
              <button
                data-testid="wa-back-btn"
                onClick={() => setActive(null)}
                className="md:hidden text-slate-500"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="grid h-10 w-10 place-items-center rounded-full bg-[#25D366]/10 text-sm font-semibold text-[#0B1B3D]">
                {initials(active.lead_name)}
              </div>
              <div className="flex-1">
                <div className="font-semibold">{active.lead_name}</div>
                <div className="text-xs text-slate-500">{active.company} · {active.phone}</div>
              </div>
            </div>

            <div ref={scrollerRef} className="wa-bg flex-1 overflow-y-auto p-4">
              <div className="mx-auto flex max-w-2xl flex-col gap-1.5">
                {msgs.map((m) => (
                  <div
                    key={m.id}
                    data-testid={`wa-msg-${m.id}`}
                    className={`flex ${m.direction === "out" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-2.5 text-sm shadow-sm ${
                        m.direction === "out"
                          ? "rounded-tr-none bg-[#D9FDD3]"
                          : "rounded-tl-none bg-white"
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
            </div>

            {/* Templates */}
            <div className="flex gap-1.5 overflow-x-auto border-t border-[#E2E8F0] bg-white p-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t}
                  data-testid={`wa-template-${TEMPLATES.indexOf(t)}`}
                  onClick={() => send(t)}
                  className="flex-shrink-0 rounded-full border border-[#E2E8F0] px-3 py-1 text-xs hover:bg-slate-50"
                >
                  {t.slice(0, 40)}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="flex items-center gap-2 border-t border-[#E2E8F0] bg-white p-2"
            >
              <input
                data-testid="wa-input"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type a message"
                className="flex-1 rounded-full border border-[#E2E8F0] bg-[#FAFAFA] px-4 py-2 text-sm focus:outline-none"
              />
              <button
                data-testid="wa-send-btn"
                type="submit"
                className="grid h-10 w-10 place-items-center rounded-full bg-[#25D366] text-white hover:bg-[#1ebe5a]"
              >
                <PaperPlaneTilt size={18} weight="fill" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center bg-[#F8FAFC]">
            <div className="max-w-sm text-center">
              <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full bg-[#25D366]/10">
                <PaperPlaneTilt size={28} weight="duotone" className="text-[#25D366]" />
              </div>
              <div className="font-display text-lg font-bold">Select a conversation</div>
              <div className="mt-1 text-sm text-slate-500">
                Pick a chat to view and send WhatsApp messages.
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
