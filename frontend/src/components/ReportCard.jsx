import { useState } from "react";
import toast from "react-hot-toast";
import { Check, Copy, Download, Loader2, Sparkles } from "lucide-react";
import client from "../api/client";

const titleCase = (value) =>
  value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const confidenceColor = {
  high: "#4ade80",
  medium: "#facc15",
  low: "#9ca3af",
};

const Panel = ({ children, className = "" }) => (
  <div
    className={`rounded-2xl p-4 ${className}`}
    style={{
      background: "rgba(255,255,255,0.025)",
      border: "1px solid rgba(255,255,255,0.07)",
    }}
  >
    {children}
  </div>
);

const ReportCard = ({ report, sampleUrl = null }) => {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  const observations = report?.observations ?? [];
  const groupedObservations = observations.reduce((groups, observation) => {
    const category = observation.category;
    groups[category] ??= [];
    groups[category].push(observation);
    return groups;
  }, {});
  const assessableCount = observations.filter(
    ({ assessability }) => assessability !== "not_assessable",
  ).length;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      setCopied(true);
      toast.success("Observation JSON copied.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy the JSON. Please try again.");
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    setError("");
    try {
      let imageBase64 = null;
      if (sampleUrl) {
        const blob = await (await fetch(sampleUrl)).blob();
        imageBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
      const response = await client.post(
        "/api/report/pdf",
        { report, image_base64: imageBase64 },
        { responseType: "blob" },
      );
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "Handwriting_Observation_Report.pdf";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Could not generate the PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className="overflow-hidden rounded-2xl"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div style={{ height: 3, background: "linear-gradient(90deg, #7c3aed, #4f46e5)" }} />
      <div className="flex flex-col gap-6 p-5 sm:p-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ background: "rgba(124,58,237,0.15)", color: "#c4b5fd" }}
            >
              <Sparkles size={17} />
            </div>
            <div>
              <h2 className="font-semibold" style={{ color: "#e5e7eb" }}>
                Handwriting Observations
              </h2>
              <p className="text-xs" style={{ color: "#9ca3af" }}>
                {observations.length} features · {assessableCount} assessable
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs"
              style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#c4b5fd" }}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? "Copied" : "Copy JSON"}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs"
              style={{
                background: "rgba(124,58,237,0.15)",
                border: "1px solid rgba(124,58,237,0.35)",
                color: "#c4b5fd",
                opacity: downloading ? 0.7 : 1,
              }}
            >
              {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              {downloading ? "Preparing..." : "Download PDF"}
            </button>
          </div>
        </header>

        {error && <p className="text-xs" style={{ color: "#f87171" }}>{error}</p>}

        <section className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#7c3aed" }}>
            Image Assessment
          </h3>
          {sampleUrl && (
            <img
              src={sampleUrl}
              alt="Submitted handwriting sample"
              className="w-full rounded-xl object-contain"
              style={{
                maxHeight: 320,
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            />
          )}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Object.entries(report?.image_assessment ?? {}).map(([key, value]) => (
              <Panel key={key} className="p-3">
                <p className="text-[10px] uppercase tracking-wide" style={{ color: "#6b7280" }}>
                  {titleCase(key)}
                </p>
                <p className="mt-1 text-xs font-medium" style={{ color: "#d1d5db" }}>
                  {titleCase(value)}
                </p>
              </Panel>
            ))}
          </div>
          <p className="text-xs leading-relaxed" style={{ color: "#9ca3af" }}>
            These are visual observations only. A static image cannot establish physical writing
            pressure, actual writing speed, or confirmed pen lifts. Unknown features are retained
            rather than guessed.
          </p>
        </section>

        {Object.entries(groupedObservations).map(([category, items]) => (
          <section key={category} className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#7c3aed" }}>
                {titleCase(category)}
              </h3>
              <span className="text-[11px]" style={{ color: "#6b7280" }}>{items.length} features</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {items.map((observation) => (
                <Panel key={observation.feature_id} className="p-3 sm:p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-medium" style={{ color: "#e5e7eb" }}>
                        {observation.feature_name}
                      </h4>
                      <p className="mt-0.5 text-xs font-semibold" style={{ color: "#c4b5fd" }}>
                        {titleCase(observation.observed_value)}
                      </p>
                    </div>
                    <div className="flex gap-2 text-[10px]">
                      <span style={{ color: confidenceColor[observation.confidence] }}>
                        {titleCase(observation.confidence)} confidence
                      </span>
                      <span style={{ color: "#6b7280" }}>
                        {titleCase(observation.assessability)}
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed" style={{ color: "#9ca3af" }}>
                    {observation.evidence.description}
                  </p>
                  {observation.evidence.supporting_letters.length > 0 && (
                    <p className="mt-1 text-[11px]" style={{ color: "#6b7280" }}>
                      Visible evidence: {observation.evidence.supporting_letters.join(", ")}
                    </p>
                  )}
                </Panel>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

export default ReportCard;
