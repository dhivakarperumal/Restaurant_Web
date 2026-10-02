import { useState } from "react";
import { Download, Eye, LoaderCircle } from "lucide-react";
import api from "../api";

const EmployeeDocument = ({ filename }) => {
  const [busyAction, setBusyAction] = useState("");
  const [error, setError] = useState("");

  const fetchDocument = async () => {
    const response = await api.get(`/employees/documents/${encodeURIComponent(filename)}`, {
      responseType: "blob",
    });
    return URL.createObjectURL(response.data);
  };

  const viewDocument = async () => {
    const previewWindow = window.open("about:blank", "_blank");
    if (!previewWindow) {
      setError("Allow pop-ups to view this document.");
      return;
    }
    previewWindow.opener = null;
    setBusyAction("view");
    setError("");
    try {
      const url = await fetchDocument();
      previewWindow.location.href = url;
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (requestError) {
      previewWindow.close();
      setError(requestError.response?.data?.message || "Document could not be opened.");
    } finally {
      setBusyAction("");
    }
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
      <p className="break-all text-xs text-[#526258]">{filename}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={viewDocument} disabled={Boolean(busyAction)} className="inline-flex items-center gap-1.5 rounded-md border border-[#d5e0d4] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#355443] hover:bg-[#edf3ed] disabled:opacity-60">
          {busyAction === "view" ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
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
