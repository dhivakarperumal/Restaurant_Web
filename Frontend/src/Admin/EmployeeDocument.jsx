import { useState } from "react";
import { Download, Eye, LoaderCircle } from "lucide-react";
import api, { BACKEND_BASE_URL } from "../api";

const EmployeeDocument = ({ filename }) => {
  const [busyAction, setBusyAction] = useState("");
  const [error, setError] = useState("");
  const documentPath = `/upload/employee_documents/${encodeURIComponent(filename)}`;
  const documentUrl = `${BACKEND_BASE_URL}${documentPath}`;

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
      link.download = filename;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Document could not be downloaded.");
    } finally {
      setBusyAction("");
    }
  };

  return (
    <div className="mt-2 rounded-md bg-[#f5f8f4] p-2.5">
      <a href={documentUrl} target="_blank" rel="noreferrer" className="break-all text-xs font-semibold text-[#355443] underline decoration-[#b8caba] underline-offset-2 hover:text-[#244b36]">
        {documentPath}
      </a>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={viewDocument} className="inline-flex items-center gap-1.5 rounded-md border border-[#d5e0d4] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#355443] hover:bg-[#edf3ed]">
          <Eye className="h-3.5 w-3.5" />
          View
        </button>
        <button type="button" onClick={downloadDocument} disabled={Boolean(busyAction)} className="inline-flex items-center gap-1.5 rounded-md border border-[#d5e0d4] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#355443] hover:bg-[#edf3ed] disabled:opacity-60">
          {busyAction === "download" ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          Download
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-[#a13e30]">{error}</p>}
    </div>
  );
};

export default EmployeeDocument;
