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
import { Sparkles, Copy, Check, Download, Loader2, ShieldAlert, TrendingUp, AlertTriangle, ArrowRight, Info, Brain, HeartPulse, Target, Users, WalletCards, Activity, PenLine, Lightbulb } from "lucide-react";

const scoreColor = (score) => {
  if (score >= 70) return "#4ade80";
  if (score >= 40) return "#facc15";
  return "#f87171";
};

const band = (s) => (s >= 70 ? "high" : s >= 40 ? "medium" : "low");
const bandLabel = (s) => ({ high: "Strong", medium: "Developing", low: "Growth focus" })[band(s)];
const titleCase = (k) => k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const CORE_STYLE = {
  emotional_balance: { high: "Caring + Steady", medium: "Adaptive + Responsive", low: "Intense + Honest" },
  thinking_learning: { high: "Thoughtful + Analytical", medium: "Flexible + Practical", low: "Intuitive + Quick" },
  health_vitality: { high: "Energetic + Active", medium: "Paced + Situational", low: "Reserved + Conserving" },
  goals_achievement: { high: "Persistent + Planned", medium: "Steady + Adaptive", low: "Open + Exploring" },
  relationships: { high: "Warm + Engaged", medium: "Measured + Selective", low: "Independent + Reserved" },
  money_mindset: { high: "Grounded + Practical", medium: "Cautious + Security-minded", low: "Careful + Hesitant" },
};

const DASHBOARD_ICONS = [Brain, HeartPulse, Target, Users, WalletCards, Activity];

const SectionLabel = ({ children }) => (
  <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#7c3aed" }}>{children}</span>
);

const Panel = ({ children, style }) => (
  <div
    className="rounded-2xl p-5 flex flex-col gap-2"
    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", ...style }}
  >
    {children}
  </div>
);

const Section = ({ title, subtitle, children }) => (
  <div className="flex flex-col gap-3">
    <div className="flex flex-col gap-0.5">
      <SectionLabel>{title}</SectionLabel>
      {subtitle && <span className="text-xs" style={{ color: "#6b7280" }}>{subtitle}</span>}
    </div>
    {children}
  </div>
);

const Bar = ({ score }) => (
  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score}%`, background: scoreColor(score) }} />
  </div>
);

// ---------------------------------------------------------------------------
// DimensionCard — one scored dimension with its supporting evidence
// ---------------------------------------------------------------------------

const DimensionCard = ({ dimension }) => {
  const color = scoreColor(dimension.score);
  const coreStyle = CORE_STYLE[dimension.key]?.[band(dimension.score)];

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
          <span style={{ color: "#6b7280", fontWeight: 400 }}>/100 · {bandLabel(dimension.score)}</span>
        </span>
      </div>
      {coreStyle && (
        <span className="text-xs font-semibold" style={{ color: "#a78bfa" }}>Core style: {coreStyle}</span>
      )}

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

      {/* What We are Seeing */}
      {dimension.evidence?.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <Info size={12} style={{ color: "#7c3aed" }} strokeWidth={2} />
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#7c3aed" }}>
              What We are Seeing
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
          <p className="text-xs leading-relaxed" style={{ color: "#a7c7b2" }}>
            <b>Your strength: </b>{dimension.strength}
          </p>
        </div>
        <div
          className="rounded-lg px-3 py-2 flex gap-2"
          style={{ background: "rgba(250,204,21,0.06)", border: "1px solid rgba(250,204,21,0.15)" }}
        >
          <AlertTriangle size={13} style={{ color: "#facc15", flexShrink: 0, marginTop: "2px" }} />
          <p className="text-xs leading-relaxed" style={{ color: "#c9bd91" }}>
            <b>Watch for: </b>{dimension.blind_spot}
          </p>
        </div>
      </div>

      {/* Make it useful */}
      <div className="flex items-start gap-2 rounded-lg px-3 py-2" style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.15)" }}>
        <TrendingUp size={13} style={{ color: "#4ade80", flexShrink: 0, marginTop: "2px" }} />
        <p className="text-xs leading-relaxed" style={{ color: "#a7c7b2" }}>
          <b>Make it useful: </b>{dimension.strength}
        </p>
      </div>

      {/* Next move */}
      <div className="flex items-start gap-2 rounded-lg px-3 py-2" style={{ background: "rgba(124,58,237,0.07)" }}>
        <ArrowRight size={13} style={{ color: "#a78bfa", flexShrink: 0, marginTop: "2px" }} />
        <p className="text-xs leading-relaxed" style={{ color: "#c4b5d4" }}>
          <b>Your Next Step: </b>{dimension.next_move}
        </p>
      </div>

      <p className="text-[11px] leading-relaxed" style={{ color: "#6b7280" }}>
        {dimension.confidence === "high"
          ? "Confidence: high — two or more clearly visible cues supported this score."
          : "Confidence: low — fewer than two cues were clearly visible, so read this as a light indication."}
      </p>
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

  const dimensions = (report?.dimensions ?? []).filter((d) => d.key !== "personal_growth");
  const overallScore = report?.overall_score ?? null;
  const overallColor = overallScore !== null ? scoreColor(overallScore) : "#a78bfa";

  const features = report?.features ?? {};
  const isKnown = (v) => v && String(v).toLowerCase() !== "unknown";
  const observedCues = Object.entries(features).filter(([, v]) => isKnown(v));
  const byScoreDesc = [...dimensions].sort((a, b) => b.score - a.score);
  const byScoreAsc = [...dimensions].sort((a, b) => a.score - b.score);
  const topDims = byScoreDesc.slice(0, 3);
  const lowDims = byScoreAsc.slice(0, 3);
  const traits = report?.traits ?? [];
  const topStrengths = byScoreDesc.slice(0, 3);
  const potentialBlindSpots = byScoreDesc.slice(0, 5);
  const methodCueCount = Object.values(features).filter(isKnown).length;
  const methodCueTotal = Object.keys(features).length;
  const planTexts = [
    lowDims[0] && `Focus on ${lowDims[0].label}. ${lowDims[0].next_move}`,
    lowDims[1] && `Turn to ${lowDims[1].label}. ${lowDims[1].next_move}`,
    lowDims[2] && `Build ${lowDims[2].label} into a routine. ${lowDims[2].next_move}`,
    "Ask: what worked, what drained me, and what should I continue, stop or change? Keep the habits that helped and drop the rest.",
  ].filter(Boolean);
  const planLabels = ["Week 1 · Clarity", "Week 2 · Expression", "Week 3 · Momentum", "Week 4 · Review"];

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
        `Make it useful: ${d.strength}\n` +
        `Strength: ${d.strength}\n` +
        `Watch for: ${d.blind_spot}\n` +
        `Your Next Step: ${d.next_move}\n`
      )
      .join("\n");

    const fullReport =
      `GRAPHOLOGY AI — PERSONALITY ANALYSIS\n${"─".repeat(40)}\n\n` +
      (report?.archetype ? `Archetype: ${report.archetype} — ${report.archetype_tagline}\n` : "") +
      (overallScore !== null ? `Overall Score: ${overallScore}/100\n` : "") +
      ((report?.traits ?? []).length ? `Traits: ${report.traits.map((t) => t.label).join(", ")}\n` : "") +
      "\n" +
      (report?.story ? `${report.story}\n\n` : `${report?.personality_traits ?? ""}\n\n`) +
      `${"─".repeat(40)}\nTOP 3 STRENGTHS\n${"─".repeat(40)}\n` +
      `${topStrengths.map((d, i) => `${i + 1}. ${d.label}: ${d.strength}`).join("\n")}\n\n` +
      `${"─".repeat(40)}\nPOTENTIAL BLIND SPOTS\n${"─".repeat(40)}\n` +
      `${potentialBlindSpots.map((d) => `${d.label}: ${d.blind_spot}`).join("\n")}\n\n` +
      `${"─".repeat(40)}\nYOU MAY BE SOMEONE WHO\n${"─".repeat(40)}\n` +
      `${traits.slice(0, 5).map((t) => `You may be someone who is ${t.label.toLowerCase()}.`).join("\n")}\n\n` +
      `${"─".repeat(40)}\nDIMENSIONS\n${"─".repeat(40)}\n\n${dimensionText}\n` +
      `${"─".repeat(40)}\nMETHOD + CONFIDENCE\n${"─".repeat(40)}\n` +
      `${report?.confidence_note ?? ""}\nScores with fewer than two supporting cues are light indications, not firm conclusions.\n\n` +
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

        {/* Begin with awareness */}
        <Section title="Begin With Awareness" subtitle="This report turns handwriting observations into an easy-to-read self-reflection.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              ["01 Observe", "Your handwriting contains visible patterns in size, spacing, slant, pressure, rhythm and letter formation."],
              ["02 Reflect", "Graphology uses these patterns to suggest tendencies, not fixed truths or diagnoses."],
              ["03 Apply", "The most useful part is what you can do with the insight: strengths to use and patterns to watch."],
              ["04 Choose", "Keep what resonates with your lived experience. Treat the report as a conversation starter with yourself."],
            ].map(([h, t]) => (
              <Panel key={h} style={{ padding: "0.9rem 1rem", gap: "0.25rem" }}>
                <span className="text-xs font-bold" style={{ color: "#c4b5fd" }}>{h}</span>
                <span className="text-xs leading-relaxed" style={{ color: "#9ca3af" }}>{t}</span>
              </Panel>
            ))}
          </div>
          <Panel style={{ padding: "0.9rem 1rem" }}>
            <span className="text-xs leading-relaxed" style={{ color: "#9ca3af" }}>
              <b style={{ color: "#c4b5d4" }}>How to read your report: </b>
              look at the combination of score + interpretation + evidence + practical action. A lower score is not a
              flaw, and a higher score is not automatically a strength in every situation. Cues that could not be judged
              are left out rather than guessed.
            </span>
          </Panel>
        </Section>

        {/* Your handwriting */}
        {(sampleUrl || observedCues.length > 0) && (
          <Section title="Your Handwriting" subtitle="The report is based on the patterns visible in your submitted writing sample.">
            {sampleUrl && (
              <img
                src={sampleUrl}
                alt="Your handwriting sample"
                className="rounded-xl w-full"
                style={{ maxHeight: "320px", objectFit: "contain", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
              />
            )}
            {observedCues.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#7c3aed" }}>
                  Visible clues
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {observedCues.map(([k, v]) => (
                    <span key={k} className="text-[11px] px-2.5 py-1 rounded-md" style={{ background: "rgba(255,255,255,0.04)", color: "#9ca3af" }}>
                      <b style={{ color: "#c4b5d4" }}>{titleCase(k)}:</b> {v}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Section>
        )}

        {/* Profile snapshot */}
        {dimensions.length > 0 && (
          <Section title="Your Profile Snapshot" subtitle="A visual map of the six dimensions in your handwriting profile.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {dimensions.map((d, i) => (
                <Panel key={d.key} style={{ padding: "0.85rem 1rem", gap: "0.45rem", background: "linear-gradient(135deg, rgba(124,58,237,0.09), rgba(255,255,255,0.025))" }}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: scoreColor(d.score), boxShadow: `0 0 10px ${scoreColor(d.score)}88` }} />
                      <span className="text-xs font-semibold" style={{ color: "#e5e7eb" }}>{d.label}</span>
                    </div>
                    <span className="text-sm font-bold" style={{ color: scoreColor(d.score) }}>{d.score}</span>
                  </div>
                  <Bar score={d.score} />
                  <div className="flex justify-between text-[10px]" style={{ color: "#6b7280" }}>
                    <span>{bandLabel(d.score)}</span><span>{i + 1} of {dimensions.length}</span>
                  </div>
                </Panel>
              ))}
            </div>
            <Panel style={{ padding: "0.75rem 1rem", gap: "0.5rem", background: "rgba(255,255,255,0.025)" }}>
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#9ca3af" }}>Legend</span>
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-[11px]" style={{ color: "#9ca3af" }}>
                {[['#4ade80', 'Strong · 70–100'], ['#facc15', 'Developing · 40–69'], ['#f87171', 'Growth focus · 0–39']].map(([color, label]) => (
                  <span key={label} className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: color }} />{label}</span>
                ))}
              </div>
            </Panel>
            <p className="text-xs" style={{ color: "#9ca3af" }}>
              <b style={{ color: "#4ade80" }}>Strongest area:</b> {byScoreDesc[0].label} ({byScoreDesc[0].score}) &nbsp;|&nbsp;{" "}
              <b style={{ color: "#facc15" }}>Growth focus:</b> {byScoreAsc[0].label} ({byScoreAsc[0].score})
            </p>
          </Section>
        )}

        {/* Personality dashboard: visual trait cards with handwriting reasons */}
        {traits.length > 0 && (
          <Section title="Your Personality Dashboard" subtitle="A more human way to read your profile, beyond the numbers.">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {traits.map((t, i) => {
                const Icon = DASHBOARD_ICONS[i % DASHBOARD_ICONS.length];
                return <Panel key={t.label} style={{ padding: "0.9rem", gap: "0.55rem", background: "linear-gradient(145deg, rgba(124,58,237,0.13), rgba(255,255,255,0.025))" }}>
                  <div className="flex items-center gap-2"><span className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(167,139,250,0.16)", color: "#c4b5fd" }}><Icon size={15} /></span><span className="text-xs font-bold" style={{ color: "#e5e7eb" }}>{t.label}</span></div>
                  <span className="text-[11px] leading-relaxed" style={{ color: "#9ca3af" }}>{t.why ? `Seen in ${t.why}` : "A theme in your current profile."}</span>
                </Panel>;
              })}
            </div>
            <Panel style={{ background: "rgba(124,58,237,0.07)" }}>
              <p className="text-sm text-center italic" style={{ color: "#c4b5fd", fontFamily: "'Georgia', serif" }}>
                Your profile in one line: {traits.slice(0, 3).map((t) => t.label.toLowerCase()).join(" + ")}.
              </p>
            </Panel>
          </Section>
        )}

        {/* Requested reflection sections */}
        {topStrengths.length > 0 && (
          <Section title="Top 3 Strengths" subtitle="The strongest patterns in your current profile and how they may help you.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {topStrengths.map((d, i) => (
                <Panel key={d.key} style={{ padding: "0.9rem 1rem", gap: "0.35rem" }}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold" style={{ color: "#c4b5fd" }}>{i + 1}. {d.label}</span>
                    <span className="text-xs font-bold" style={{ color: scoreColor(d.score) }}>{d.score}</span>
                  </div>
                  <span className="text-xs leading-relaxed" style={{ color: "#a7c7b2" }}>{d.strength}</span>
                </Panel>
              ))}
            </div>
          </Section>
        )}

        {potentialBlindSpots.length > 0 && (
          <Section title="Potential Blind Spots" subtitle="Patterns worth noticing when a strength is overused or under-supported.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {potentialBlindSpots.map((d) => (
                <Panel key={d.key} style={{ padding: "0.9rem 1rem", gap: "0.35rem", background: "rgba(250,204,21,0.04)", border: "1px solid rgba(250,204,21,0.12)" }}>
                  <span className="text-xs font-bold" style={{ color: "#facc15" }}>{d.label}</span>
                  <span className="text-xs leading-relaxed" style={{ color: "#c4b5d4" }}>{d.blind_spot}</span>
                </Panel>
              ))}
            </div>
          </Section>
        )}

        {(report?.archetype || traits.length > 0) && (
          <Section title="You May Be Someone Who" subtitle="A tentative reflection, not a fixed label.">
            <Panel style={{ background: "rgba(124,58,237,0.07)", gap: "0.55rem" }}>
              {report?.archetype && (
                <p className="text-sm leading-relaxed" style={{ color: "#c4b5fd", fontFamily: "'Georgia', serif" }}>
                  You may be someone who reflects the {report.archetype.toLowerCase()} pattern — {report.archetype_tagline?.toLowerCase()}
                </p>
              )}
              {traits.slice(0, 5).map((t) => (
                <p key={t.label} className="text-xs leading-relaxed" style={{ color: "#c4b5d4" }}>
                  <b style={{ color: "#e5e7eb" }}>You may be someone who is {t.label.toLowerCase()}.</b>{t.why ? ` This is associated with ${t.why}.` : ""}
                </p>
              ))}
            </Panel>
          </Section>
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

        {/* X-Factor */}
        {topDims.length > 0 && (
          <Section title="Know Your X-Factor" subtitle="Your strongest dimensions and what they can look like in everyday life.">
            {topDims.map((d) => (
              <Panel key={d.key}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold" style={{ color: "#e5e7eb", fontFamily: "'Georgia', serif" }}>{d.label}</span>
                  <span className="text-sm font-bold" style={{ color: scoreColor(d.score) }}>{d.score}</span>
                </div>
                <Bar score={d.score} />
                <p className="text-xs leading-relaxed mt-1" style={{ color: "#c4b5d4" }}>
                  <b style={{ color: "#a78bfa" }}>What your profile suggests: </b>{d.essence}
                </p>
                <p className="text-xs leading-relaxed" style={{ color: "#a7c7b2" }}>
                  <b style={{ color: "#4ade80" }}>Make it useful: </b>{d.strength}
                </p>
              </Panel>
            ))}
          </Section>
        )}

        {/* Dimension cards */}
        {dimensions.length > 0 && (
          <Section title="Your Profile in Detail">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {dimensions.map((d) => (
                <DimensionCard key={d.key} dimension={d} />
              ))}
            </div>
          </Section>
        )}

        {/* 30-day growth plan */}
        {lowDims.length > 0 && (
          <Section title="Your 30-Day Growth Plan" subtitle="Turn the report into a small experiment, not a label.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {planTexts.map((t, i) => (
                <Panel key={i} style={{ padding: "0.9rem 1rem", gap: "0.3rem" }}>
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#a78bfa" }}>{planLabels[i]}</span>
                  <span className="text-xs leading-relaxed" style={{ color: "#c4b5d4" }}>{t}</span>
                </Panel>
              ))}
            </div>
            <Panel style={{ padding: "0.9rem 1rem" }}>
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#a78bfa" }}>
                Growth loop for {lowDims[0].label}
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
                {[
                  ["1 Reflect", "What matters most right now?"],
                  ["2 Choose", "What is one action within my control?"],
                  ["3 Repeat", "What can I practise weekly?"],
                  ["4 Review", "What changed after 30 days?"],
                ].map(([h, t]) => (
                  <div key={h} className="text-xs leading-relaxed" style={{ color: "#9ca3af" }}>
                    <b style={{ color: "#c4b5d4" }}>{h}</b><br />{t}
                  </div>
                ))}
              </div>
            </Panel>
            <p className="text-sm text-center italic" style={{ color: "#c4b5fd", fontFamily: "'Georgia', serif" }}>
              The goal is not to fix yourself. It is to test which insights genuinely help you live and work better.
            </p>
          </Section>
        )}

        {/* Pattern, conclusion and requested next-step index */}
        {dimensions.length > 0 && (
          <>
            <Section title="Your Pattern" subtitle="The recurring rhythm your profile suggests across the strongest and most developing areas.">
              <Panel style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.14), rgba(79,70,229,0.05))", gap: "0.8rem" }}>
                <div className="flex items-center gap-2"><PenLine size={16} style={{ color: "#c4b5fd" }} /><span className="text-sm font-semibold" style={{ color: "#e5e7eb" }}>The pattern at a glance</span></div>
                <p className="text-sm leading-relaxed" style={{ color: "#c4b5d4" }}>
                  Your profile is led by <b style={{ color: "#c4b5fd" }}>{topDims.map((d) => d.label).join(", ")}</b>. It may be useful to treat these as your natural operating strengths, while giving extra attention to <b style={{ color: "#facc15" }}>{lowDims[0]?.label}</b> when you want more balance.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {topDims.map((d) => <div key={d.key} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.05)" }}><span className="text-[10px] uppercase tracking-wider" style={{ color: "#9ca3af" }}>Signal</span><div className="text-xs font-semibold mt-1" style={{ color: "#e5e7eb" }}>{d.label}</div><Bar score={d.score} /></div>)}
                </div>
              </Panel>
            </Section>

            <Section title="Overall Conclusion" subtitle="A concise reading of the report as a whole.">
              <Panel style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.16)" }}>
                <div className="flex items-start gap-3"><Lightbulb size={18} style={{ color: "#4ade80", flexShrink: 0 }} /><p className="text-sm leading-relaxed" style={{ color: "#c4b5d4" }}>
                  Overall, your handwriting profile points to a person with a distinct mix of {traits.slice(0, 3).map((t) => t.label.toLowerCase()).join(", ") || "individual strengths"}. Your best results are likely to come from using those strengths deliberately, then taking one practical step in the area that currently needs the most support: {lowDims[0]?.label || "your developing areas"}.
                </p></div>
              </Panel>
            </Section>

          </>
        )}

        <Section title="Method + Confidence" subtitle="How to use the report responsibly.">
          <Panel style={{ gap: "0.55rem" }}>
            <p className="text-xs leading-relaxed" style={{ color: "#c4b5d4" }}>
              <b style={{ color: "#c4b5fd" }}>Method: </b>
              handwriting cues are extracted from the uploaded sample, mapped through the app's rule-based interpretations, and combined into six dimension scores. The narrative language is generated from those observed cues and scores.
            </p>
            <p className="text-xs leading-relaxed" style={{ color: "#c4b5d4" }}>
              <b style={{ color: "#c4b5fd" }}>Confidence: </b>
              {report?.confidence_note || `${methodCueCount} of ${methodCueTotal} handwriting cues were clearly observable in your sample.`} Scores with fewer than two supporting cues are light indications, not firm conclusions.
            </p>
            <p className="text-xs leading-relaxed" style={{ color: "#9ca3af" }}>
              Graphology is not a scientifically validated personality assessment. Keep what resonates, question what does not, and use this report for reflection rather than diagnosis or high-stakes decisions.
            </p>
          </Panel>
        </Section>

        {/* Disclaimer */}
        <div className="rounded-xl px-4 py-3 flex gap-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <ShieldAlert size={14} style={{ color: "#4b5563", flexShrink: 0, marginTop: "2px" }} strokeWidth={1.8} />
          <p className="text-xs leading-relaxed" style={{ color: "#4b5563" }}>
            {report?.disclaimer} This report is not financial, medical, legal or psychological advice.
          </p>
        </div>

        {dimensions.length > 0 && (
          <Section title="Your Next Steps" subtitle="Areas of Improvement">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {["Decision Making", "Desires", "Goals", "Thinking Patterns", "Interpersonal Relations", "Fears and Defenses", "Self-destructive Traits"].map((area, i) => (
                <Panel key={area} style={{ padding: "0.85rem 1rem", flexDirection: "row", alignItems: "center", gap: "0.7rem", background: "rgba(255,255,255,0.025)" }}>
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "rgba(124,58,237,0.18)", color: "#c4b5fd" }}>{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-xs font-semibold" style={{ color: "#e5e7eb" }}>{area}</span>
                </Panel>
              ))}
            </div>
          </Section>
        )}

        <button type="button" className="w-full rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200" style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)", color: "#fff", boxShadow: "0 8px 24px rgba(79,70,229,0.24)" }}>
          Level 2
        </button>
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
