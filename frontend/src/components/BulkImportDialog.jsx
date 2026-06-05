import { useRef, useState } from "react";
import { api } from "@/lib/api";
import { X, FileCsv, CloudArrowUp } from "@phosphor-icons/react";
import { toast } from "sonner";

const SAMPLE = `name,phone,email,company,city,source,status,budget,requirements
Aarav Sharma,+91 98100 11111,aarav@example.in,Sharma Traders,Mumbai,Website,New,50000,Need ecommerce site
Priya Verma,+91 98100 22222,priya@example.in,Verma Industries,Delhi,Referral,Contacted,100000,Wants CRM`;

export default function BulkImportDialog({ open, onClose, onImported }) {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/leads/import", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(data);
      toast.success(`Imported ${data.inserted} leads`);
      onImported();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Import failed");
    } finally {
      setBusy(false);
    }
  };

  const downloadSample = () => {
    const blob = new Blob([SAMPLE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads-sample.csv";
    a.click();
  };

  return (
    <div
      data-testid="import-dialog"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="w-full max-w-md rounded-md bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-4">
          <div className="font-display text-lg font-bold">Import leads from CSV</div>
          <button onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4 p-5">
          <div className="rounded-md border border-dashed border-[#E2E8F0] bg-[#FAFAFA] p-6 text-center">
            <CloudArrowUp size={32} weight="duotone" className="mx-auto text-[#0B1B3D]" />
            <div className="mt-2 text-sm text-slate-700">
              {file ? (
                <span data-testid="import-file-name" className="font-medium">{file.name}</span>
              ) : (
                "Drop a CSV here or click to browse"
              )}
            </div>
            <input
              ref={fileRef}
              data-testid="import-file-input"
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
            />
            <button
              type="button"
              data-testid="import-pick-file-btn"
              onClick={() => fileRef.current?.click()}
              className="mt-3 rounded-md border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
            >
              Choose file
            </button>
          </div>

          <div className="flex items-center justify-between rounded-md border border-[#F1F5F9] bg-white p-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <FileCsv size={16} weight="duotone" />
              <span>Need a template?</span>
            </div>
            <button
              type="button"
              data-testid="import-sample-btn"
              onClick={downloadSample}
              className="font-semibold text-[#0B1B3D] hover:underline"
            >
              Download sample
            </button>
          </div>

          <div className="text-[10px] uppercase tracking-wider text-slate-500">
            Columns: name (required), phone, email, company, website, city, state, industry, source, status, budget, requirements
          </div>

          {result && (
            <div data-testid="import-result" className="rounded-md border border-emerald-200 bg-emerald-50/60 p-3 text-xs">
              <div className="font-semibold text-emerald-800">
                Imported {result.inserted} leads · Skipped {result.skipped}
              </div>
              {result.errors?.length > 0 && (
                <ul className="mt-2 list-disc pl-4 text-slate-600">
                  {result.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-[#E2E8F0] px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Close
            </button>
            <button
              type="submit"
              data-testid="import-submit-btn"
              disabled={!file || busy}
              className="rounded-md bg-[#0B1B3D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#142D66] disabled:opacity-50"
            >
              {busy ? "Importing…" : "Import"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
