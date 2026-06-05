import { useEffect, useRef, useState } from "react";
import { api, API } from "@/lib/api";
import { relTime } from "@/lib/constants";
import {
  CloudArrowUp,
  File as FileIcon,
  FilePdf,
  FileImage,
  FileDoc,
  FileXls,
  TrashSimple,
  Download,
} from "@phosphor-icons/react";
import { toast } from "sonner";

function bytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function iconFor(ct = "") {
  if (ct.startsWith("image/")) return FileImage;
  if (ct === "application/pdf") return FilePdf;
  if (ct.includes("word") || ct === "text/plain") return FileDoc;
  if (ct.includes("sheet") || ct === "text/csv") return FileXls;
  return FileIcon;
}

export default function LeadDocuments({ leadId }) {
  const [docs, setDocs] = useState([]);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  const load = () =>
    api.get(`/leads/${leadId}/documents`).then((r) => setDocs(r.data));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

  const onPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      toast.error("Max 15 MB");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      await api.post(`/leads/${leadId}/documents`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Uploaded");
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (d) => {
    if (!window.confirm(`Delete ${d.filename}?`)) return;
    await api.delete(`/documents/${d.id}`);
    toast.success("Deleted");
    load();
  };

  const token = localStorage.getItem("facets_token");

  return (
    <div className="rounded-md border border-[#E2E8F0] bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Files
          </div>
          <div className="font-display text-lg font-bold">Documents</div>
        </div>
        <button
          data-testid="lead-doc-upload-btn"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-md bg-[#0B1B3D] px-3 py-2 text-xs font-semibold text-white hover:bg-[#142D66] disabled:opacity-50"
        >
          <CloudArrowUp size={14} weight="bold" /> {busy ? "Uploading…" : "Upload"}
        </button>
        <input
          ref={fileRef}
          data-testid="lead-doc-file-input"
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp,.csv,.txt"
          onChange={onPick}
          className="hidden"
        />
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {docs.length === 0 && (
          <div className="rounded-md border border-dashed border-[#E2E8F0] p-8 text-center text-sm text-slate-500">
            No documents yet. Upload PDFs, images, contracts, or proposals (max 15 MB).
          </div>
        )}
        {docs.map((d) => {
          const Icon = iconFor(d.content_type);
          const url = `${API}/documents/${d.id}/download?auth=${token}`;
          return (
            <div
              key={d.id}
              data-testid={`doc-row-${d.id}`}
              className="flex items-center gap-3 rounded-md border border-[#F1F5F9] p-3 text-sm hover:border-[#0B1B3D]/20"
            >
              <div className="grid h-10 w-10 place-items-center rounded-md bg-[#0B1B3D]/5">
                <Icon size={20} weight="duotone" className="text-[#0B1B3D]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-slate-900">{d.filename}</div>
                <div className="text-[10px] text-slate-500">
                  {bytes(d.size)} · uploaded by {d.uploader_name} · {relTime(d.created_at)}
                </div>
              </div>
              <a
                data-testid={`doc-download-${d.id}`}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="inline-grid h-8 w-8 place-items-center rounded-md border border-[#E2E8F0] hover:bg-slate-50"
                title="Download"
              >
                <Download size={14} />
              </a>
              <button
                data-testid={`doc-delete-${d.id}`}
                onClick={() => remove(d)}
                className="inline-grid h-8 w-8 place-items-center rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50"
                title="Delete"
              >
                <TrashSimple size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
