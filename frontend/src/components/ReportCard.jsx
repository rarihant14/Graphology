/**
 * ReportCard.jsx — Displays the full graphology analysis report: an overall
 * score + archetype, a narrative story, and one evidence-backed card per
 * scored life dimension.
 *
 * Every score/evidence value below comes straight from the backend's
 * deterministic scoring — this component only renders it, it never invents
 * or recalculates anything.
 */

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import client from "../api/client";
import { Sparkles, Copy, Check, Download, Loader2, ShieldAlert, TrendingUp, AlertTriangle, ArrowRight, Info } from "lucide-react";

const scoreColor = (score) => {
  if (score >= 70) return "#4ade80";
  if (score >= 40) return "#facc15";
  return "#f87171";
};

// ---------------------------------------------------------------------------
// DimensionCard — one scored dimension with its supporting evidence
// ---------------------------------------------------------------------------

const DimensionCard = ({ dimension }) => {
  const color = scoreColor(dimension.score);

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "16px",
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.85rem",
      }}
    >
      {/* Header: label + score */}
      <div className="flex items-center justify-between">
        <span
          className="text-sm font-semibold"
          style={{ color: "#e5e7eb", fontFamily: "'Georgia', serif" }}
        >
          {dimension.label}
        </span>
        <span className="text-sm font-bold" style={{ color }}>
          {dimension.score}
          <span style={{ color: "#6b7280", fontWeight: 400 }}>/100</span>
        </span>
      </div>

      {/* Score bar */}
      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${dimension.score}%`, background: color }}
        />
      </div>

      {/* Essence */}
      <p className="text-sm leading-relaxed" style={{ color: "#c4b5d4" }}>
        {dimension.essence}
      </p>

      {/* Why we see it */}
      {dimension.evidence?.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <Info size={12} style={{ color: "#7c3aed" }} strokeWidth={2} />
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#7c3aed" }}>
              Why we see it
            </span>
          </div>
          <ul className="flex flex-col gap-1" style={{ paddingLeft: "1.1rem" }}>
            {dimension.evidence.map((line, i) => (
              <li key={i} className="text-xs leading-relaxed" style={{ color: "#9ca3af", listStyleType: "disc" }}>
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Strength / blind spot */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div
          className="rounded-lg px-3 py-2 flex gap-2"
          style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.15)" }}
        >
          <TrendingUp size={13} style={{ color: "#4ade80", flexShrink: 0, marginTop: "2px" }} />
          <p className="text-xs leading-relaxed" style={{ color: "#a7c7b2" }}>{dimension.strength}</p>
        </div>
        <div
          className="rounded-lg px-3 py-2 flex gap-2"
          style={{ background: "rgba(250,204,21,0.06)", border: "1px solid rgba(250,204,21,0.15)" }}
        >
          <AlertTriangle size={13} style={{ color: "#facc15", flexShrink: 0, marginTop: "2px" }} />
          <p className="text-xs leading-relaxed" style={{ color: "#c9bd91" }}>{dimension.blind_spot}</p>
        </div>
      </div>

      {/* Next move */}
      <div className="flex items-start gap-2 rounded-lg px-3 py-2" style={{ background: "rgba(124,58,237,0.07)" }}>
        <ArrowRight size={13} style={{ color: "#a78bfa", flexShrink: 0, marginTop: "2px" }} />
        <p className="text-xs leading-relaxed" style={{ color: "#c4b5d4" }}>{dimension.next_move}</p>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// ReportCard
// ---------------------------------------------------------------------------

const ReportCard = ({ report, sampleUrl = null }) => {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  const dimensions = report?.dimensions ?? [];
  const overallScore = report?.overall_score ?? null;
  const overallColor = overallScore !== null ? scoreColor(overallScore) : "#a78bfa";

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleDownload = async () => {
    setDownloading(true);
    setDownloadError("");
    try {
      let imageBase64 = null;
      if (sampleUrl) {
        try {
          const blob = await (await fetch(sampleUrl)).blob();
          imageBase64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch {
          imageBase64 = null; // the PDF is still useful without the sample image
        }
      }
      const res = await client.post(
        "/api/report/pdf",
        { report, image_base64: imageBase64 },
        { responseType: "blob" },
      );
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Inksight_Graphology_Report.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError("Could not generate the PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const handleCopy = async () => {
    const dimensionText = dimensions
      .map((d) =>
        `${d.label} — ${d.score}/100\n` +
        `${d.essence}\n` +
        `Why: ${(d.evidence || []).join(" ")}\n` +
        `Strength: ${d.strength}\n` +
        `Watch for: ${d.blind_spot}\n` +
        `Next move: ${d.next_move}\n`
      )
      .join("\n");

    const fullReport =
      `GRAPHOLOGY AI — PERSONALITY ANALYSIS\n${"─".repeat(40)}\n\n` +
      (report?.archetype ? `Archetype: ${report.archetype} — ${report.archetype_tagline}\n` : "") +
      (overallScore !== null ? `Overall Score: ${overallScore}/100\n` : "") +
      ((report?.traits ?? []).length ? `Traits: ${report.traits.map((t) => t.label).join(", ")}\n` : "") +
      "\n" +
      (report?.story ? `${report.story}\n\n` : `${report?.personality_traits ?? ""}\n\n`) +
      `${"─".repeat(40)}\nDIMENSIONS\n${"─".repeat(40)}\n\n${dimensionText}\n` +
      `${"─".repeat(40)}\nDISCLAIMER\n${report?.disclaimer ?? ""}`;

    try {
      await navigator.clipboard.writeText(fullReport);
      setCopied(true);
      toast.success("Report copied!", {
        duration: 2500,
        style: { background: "#0f1a12", color: "#86efac", border: "1px solid #14532d", borderRadius: "12px", fontSize: "14px" },
        iconTheme: { primary: "#4ade80", secondary: "#0f1a12" },
      });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Failed to copy. Please copy manually.", {
        style: { background: "#1a0f0f", color: "#f87171", border: "1px solid #3f1f1f", borderRadius: "12px" },
      });
    }
  };

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "20px",
        backdropFilter: "blur(16px)",
        overflow: "hidden",
      }}
    >
      {/* Top accent bar */}
      <div
        style={{
          height: "3px",
          background: "linear-gradient(90deg, #7c3aed, #4f46e5, #7c3aed)",
          backgroundSize: "200% 100%",
          animation: "shimmer 3s linear infinite",
        }}
      />

      <div className="p-6 flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #7c3aed22, #4f46e522)", border: "1px solid rgba(124,58,237,0.3)" }}
            >
              <Sparkles size={15} style={{ color: "#a78bfa" }} strokeWidth={2} />
            </div>
            <h2
              className="text-base font-semibold tracking-tight"
              style={{
                background: "linear-gradient(135deg, #e2d9f3 0%, #a78bfa 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                fontFamily: "'Georgia', serif",
              }}
            >
              Your Personality Analysis
            </h2>
          </div>

          <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
            style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.35)", color: "#c4b5fd", opacity: downloading ? 0.7 : 1 }}
          >
            {downloading
              ? <><Loader2 size={12} className="animate-spin" /> Preparing PDF...</>
              : <><Download size={12} strokeWidth={2} /> Download PDF</>}
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
            style={
              copied
                ? { background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)", color: "#4ade80" }
                : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#9ca3af" }
            }
          >
            {copied ? <><Check size={12} strokeWidth={2.5} /> Copied!</> : <><Copy size={12} strokeWidth={2} /> Copy Report</>}
          </button>
          </div>
        </div>
        {downloadError && <p className="text-xs" style={{ color: "#f87171" }}>{downloadError}</p>}

        {/* Overall score + archetype */}
        {overallScore !== null && (
          <div
            className="flex items-center gap-5 rounded-2xl p-5"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div
              className="flex flex-col items-center justify-center flex-shrink-0"
              style={{
                width: "76px", height: "76px", borderRadius: "50%",
                border: `3px solid ${overallColor}`,
                boxShadow: `0 0 20px ${overallColor}33`,
              }}
            >
              <span className="text-xl font-bold" style={{ color: overallColor }}>{overallScore}</span>
              <span className="text-[10px]" style={{ color: "#6b7280" }}>/ 100</span>
            </div>
            <div className="flex flex-col gap-1">
              {report?.archetype && (
                <span
                  className="text-base font-bold"
                  style={{ color: "#e5e7eb", fontFamily: "'Georgia', serif" }}
                >
                  {report.archetype}
                </span>
              )}
              {report?.archetype_tagline && (
                <span className="text-xs" style={{ color: "#a78bfa" }}>{report.archetype_tagline}</span>
              )}
              {report?.confidence_note && (
                <span className="text-xs mt-1" style={{ color: "#6b7280" }}>{report.confidence_note}</span>
              )}
            </div>
          </div>
        )}

        {/* Trait tags */}
        {(report?.traits ?? []).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {report.traits.map((t) => (
              <span
                key={t.label}
                title={t.why ? `Seen in: ${t.why}` : undefined}
                className="text-xs font-medium px-3 py-1.5 rounded-full"
                style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.3)", color: "#c4b5fd" }}
              >
                {t.label}
              </span>
            ))}
          </div>
        )}

        {/* Story / narrative summary */}
        {(report?.story || report?.personality_traits) && (
          <p
            className="text-sm leading-7"
            style={{ color: "#c4b5d4", whiteSpace: "pre-wrap", fontFamily: "'Georgia', serif", letterSpacing: "0.01em" }}
          >
            {report?.story || report?.personality_traits}
          </p>
        )}

        {/* Dimension cards */}
        {dimensions.length > 0 && (
          <div className="flex flex-col gap-3">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#7c3aed" }}>
              Your Profile
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {dimensions.map((d) => (
                <DimensionCard key={d.key} dimension={d} />
              ))}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="rounded-xl px-4 py-3 flex gap-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <ShieldAlert size={14} style={{ color: "#4b5563", flexShrink: 0, marginTop: "2px" }} strokeWidth={1.8} />
          <p className="text-xs leading-relaxed" style={{ color: "#4b5563" }}>{report?.disclaimer}</p>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0%   { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
      `}</style>
    </div>
  );
};

export default ReportCard;
