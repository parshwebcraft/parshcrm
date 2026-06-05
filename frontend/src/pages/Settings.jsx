import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export default function Settings() {
  const { user } = useAuth();
  const [s, setS] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/settings").then((r) => setS(r.data));
  }, []);

  if (!s) return <div>Loading…</div>;
  const set = (k, v) => setS({ ...s, [k]: v });
  const setIntegration = (k, v) =>
    setS({ ...s, integrations: { ...(s.integrations || {}), [k]: v } });

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/settings", s);
      toast.success("Settings saved");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed");
    } finally {
      setSaving(false);
    }
  };

  const isAdmin = user?.role === "admin";

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
          Workspace
        </div>
        <h1 className="font-display text-3xl font-black tracking-tight md:text-4xl">Settings</h1>
      </div>

      <div className="rounded-md border border-[#E2E8F0] bg-white p-5">
        <div className="font-display text-lg font-bold">Company information</div>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Company name</span>
            <input data-testid="settings-company-name" disabled={!isAdmin} value={s.company_name || ""} onChange={(e) => set("company_name", e.target.value)} className="rounded-md border border-[#E2E8F0] px-3 py-2 text-sm disabled:bg-slate-50" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">GST number</span>
            <input data-testid="settings-gst" disabled={!isAdmin} value={s.gst_number || ""} onChange={(e) => set("gst_number", e.target.value)} className="rounded-md border border-[#E2E8F0] px-3 py-2 text-sm disabled:bg-slate-50" />
          </label>
          <label className="md:col-span-2 flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Address</span>
            <input data-testid="settings-address" disabled={!isAdmin} value={s.address || ""} onChange={(e) => set("address", e.target.value)} className="rounded-md border border-[#E2E8F0] px-3 py-2 text-sm disabled:bg-slate-50" />
          </label>
          <label className="md:col-span-2 flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Logo URL</span>
            <input data-testid="settings-logo" disabled={!isAdmin} value={s.logo_url || ""} onChange={(e) => set("logo_url", e.target.value)} placeholder="https://…" className="rounded-md border border-[#E2E8F0] px-3 py-2 text-sm disabled:bg-slate-50" />
          </label>
        </div>
      </div>

      <div className="rounded-md border border-[#E2E8F0] bg-white p-5">
        <div className="font-display text-lg font-bold">Integrations</div>
        <p className="mt-1 text-xs text-slate-500">
          Placeholder fields for future production integrations. The CRM works fully without these.
        </p>
        <div className="mt-4 space-y-3">
          {[
            ["whatsapp_api", "WhatsApp Business API token"],
            ["calling_api", "Calling API key (Twilio / Exotel / Knowlarity)"],
            ["openai_api", "OpenAI API key for AI summaries"],
          ].map(([k, l]) => (
            <label key={k} className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{l}</span>
              <input
                data-testid={`settings-integration-${k}`}
                disabled={!isAdmin}
                value={(s.integrations || {})[k] || ""}
                onChange={(e) => setIntegration(k, e.target.value)}
                placeholder="sk-…"
                className="rounded-md border border-[#E2E8F0] px-3 py-2 text-sm font-mono disabled:bg-slate-50"
              />
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-md border border-[#E2E8F0] bg-white p-5">
        <div className="font-display text-lg font-bold">PWA</div>
        <p className="mt-1 text-xs text-slate-500">
          Facets CRM AI is a Progressive Web App. Install it on your phone via your browser menu →{" "}
          <span className="font-semibold">"Add to home screen"</span>.
        </p>
      </div>

      {isAdmin && (
        <div className="flex justify-end">
          <button
            data-testid="settings-save-btn"
            onClick={save}
            disabled={saving}
            className="rounded-md bg-[#0B1B3D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#142D66] disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      )}
    </div>
  );
}
