import { useState } from "react";
import { Download, ExternalLink, Eye, FileSpreadsheet, FileText, Image as ImageIcon, LoaderCircle } from "lucide-react";
import api, { BACKEND_BASE_URL } from "../api";

const EmployeeDocument = ({ filename, label }) => {
  const [busyAction, setBusyAction] = useState("");
  const [error, setError] = useState("");
  const documentPath = `/upload/employee_documents/${encodeURIComponent(filename)}`;
  const documentUrl = `${BACKEND_BASE_URL}${documentPath}`;

  const cleanName = filename ? filename.replace(/^\d+[-_]/, "") : "Document";
  const ext = filename ? filename.split(".").pop()?.toUpperCase() : "FILE";
  const isImage = ["JPG", "JPEG", "PNG", "WEBP", "GIF"].includes(ext);
  const isPdf = ext === "PDF";

  const fetchDocument = async () => {
    const response = await api.get(`/employees/documents/${encodeURIComponent(filename)}`, {
      responseType: "blob",
    });
    return URL.createObjectURL(response.data);
  };

  const viewDocument = async () => {
    window.open(documentUrl, "_blank", "noopener,noreferrer");
  };

  const downloadDocument = async () => {
    setBusyAction("download");
    setError("");
    try {
      const url = await fetchDocument();
      const link = document.createElement("a");
      link.href = url;
      link.download = cleanName;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Document could not be downloaded.");
    } finally {
      setBusyAction("");
    }
  };

  return (
    <div className="mt-2 flex flex-col gap-2 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 transition hover:border-emerald-200 hover:bg-slate-50">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          isPdf ? "bg-rose-50 text-rose-600 border border-rose-100" :
          isImage ? "bg-blue-50 text-blue-600 border border-blue-100" :
          "bg-emerald-50 text-emerald-700 border border-emerald-100"
        }`}>
          {isImage ? <ImageIcon className="h-4 w-4" /> : isPdf ? <FileText className="h-4 w-4" /> : <FileSpreadsheet className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          {label && <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>}
          <p className="truncate text-xs font-semibold text-slate-800" title={cleanName}>
            {cleanName}
          </p>
          <span className="inline-block text-[10px] font-bold text-slate-400">
            {ext} File
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60">
        <button
          type="button"
          onClick={viewDocument}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-1.5 px-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200 transition"
        >
          <Eye className="h-3.5 w-3.5 text-emerald-700" />
          <span>View</span>
        </button>
        <button
          type="button"
          onClick={downloadDocument}
          disabled={Boolean(busyAction)}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-1.5 px-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200 transition disabled:opacity-60"
        >
          {busyAction === "download" ? (
            <LoaderCircle className="h-3.5 w-3.5 animate-spin text-emerald-700" />
          ) : (
            <Download className="h-3.5 w-3.5 text-emerald-700" />
          )}
          <span>Download</span>
        </button>
      </div>
      {error && <p role="alert" className="text-xs text-rose-600">{error}</p>}
    </div>
  );
};

export default EmployeeDocument;
