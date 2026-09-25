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

const band = (s) => (s >= 70 ? "high" : s >= 40 ? "medium" : "low");
const bandLabel = (s) => ({ high: "Strong", medium: "Developing", low: "Growth focus" })[band(s)];
const titleCase = (k) => k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const FEATURE_GROUPS = [
  ["Size, Slant and Baseline", ["letter_size", "slant", "baseline", "capital_size"]],
  ["Pressure and Stroke", ["pressure", "stroke_quality", "writing_speed", "ending_strokes"]],
  ["Spacing and Layout", ["letter_spacing", "word_spacing", "line_spacing", "margin_usage"]],
  ["Form and Flow", ["connectivity", "letter_form", "regularity", "legibility"]],
  ["Zones, Loops and Signature Marks", ["loop_style", "zone_emphasis", "t_bar_position", "t_bar_length", "i_dot"]],
];

const CORE_STYLE = {
  emotional_balance: { high: "Caring + Steady", medium: "Adaptive + Responsive", low: "Intense + Honest" },
  thinking_learning: { high: "Thoughtful + Analytical", medium: "Flexible + Practical", low: "Intuitive + Quick" },
  health_vitality: { high: "Energetic + Active", medium: "Paced + Situational", low: "Reserved + Conserving" },
  goals_achievement: { high: "Persistent + Planned", medium: "Steady + Adaptive", low: "Open + Exploring" },
  relationships: { high: "Warm + Engaged", medium: "Measured + Selective", low: "Independent + Reserved" },
  money_mindset: { high: "Grounded + Practical", medium: "Cautious + Security-minded", low: "Careful + Hesitant" },
  personal_growth: { high: "Reflective + Structured", medium: "Aware + Searching", low: "Deep + Searching" },
};

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

      {/* Next move */}
      <div className="flex items-start gap-2 rounded-lg px-3 py-2" style={{ background: "rgba(124,58,237,0.07)" }}>
        <ArrowRight size={13} style={{ color: "#a78bfa", flexShrink: 0, marginTop: "2px" }} />
        <p className="text-xs leading-relaxed" style={{ color: "#c4b5d4" }}>
          <b>Mindful action: </b>{dimension.next_move}
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

  const dimensions = report?.dimensions ?? [];
  const overallScore = report?.overall_score ?? null;
  const overallColor = overallScore !== null ? scoreColor(overallScore) : "#a78bfa";

  const features = report?.features ?? {};
  const insights = report?.feature_insights ?? {};
  const isKnown = (v) => v && String(v).toLowerCase() !== "unknown";
  const observedCues = Object.entries(features).filter(([, v]) => isKnown(v));
  const byScoreDesc = [...dimensions].sort((a, b) => b.score - a.score);
  const byScoreAsc = [...dimensions].sort((a, b) => a.score - b.score);
  const topDims = byScoreDesc.slice(0, 3);
  const lowDims = byScoreAsc.slice(0, 3);
  const traits = report?.traits ?? [];
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
              <div className="flex flex-wrap gap-1.5">
                {observedCues.map(([k, v]) => (
                  <span key={k} className="text-[11px] px-2.5 py-1 rounded-md" style={{ background: "rgba(255,255,255,0.04)", color: "#9ca3af" }}>
                    <b style={{ color: "#c4b5d4" }}>{titleCase(k)}:</b> {v}
                  </span>
                ))}
              </div>
            )}
          </Section>
        )}

        {/* Profile snapshot */}
        {dimensions.length > 0 && (
          <Section title="Your Profile Snapshot" subtitle="Your seven-dimension profile at a glance.">
            <Panel style={{ gap: "0.7rem" }}>
              {dimensions.map((d) => (
                <div key={d.key} className="flex items-center gap-3">
                  <span className="text-xs w-36 flex-shrink-0" style={{ color: "#c4b5d4" }}>{d.label}</span>
                  <div className="flex-1"><Bar score={d.score} /></div>
                  <span className="text-xs w-24 text-right flex-shrink-0" style={{ color: scoreColor(d.score) }}>
                    <b>{d.score}</b> <span style={{ color: "#6b7280" }}>{bandLabel(d.score)}</span>
                  </span>
                </div>
              ))}
            </Panel>
            <p className="text-xs" style={{ color: "#9ca3af" }}>
              <b style={{ color: "#4ade80" }}>Strongest area:</b> {byScoreDesc[0].label} ({byScoreDesc[0].score}) &nbsp;|&nbsp;{" "}
              <b style={{ color: "#facc15" }}>Growth focus:</b> {byScoreAsc[0].label} ({byScoreAsc[0].score})
            </p>
          </Section>
        )}

        {/* Personality dashboard: trait tags with reasons */}
        {traits.length > 0 && (
          <Section title="Your Personality Dashboard" subtitle="A more human way to read your profile, beyond the numbers.">
            <div className="flex flex-wrap gap-2">
              {traits.map((t) => (
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
            <ul className="flex flex-col gap-1" style={{ paddingLeft: "1.1rem" }}>
              {traits.filter((t) => t.why).map((t) => (
                <li key={t.label} className="text-xs leading-relaxed" style={{ color: "#9ca3af", listStyleType: "disc" }}>
                  <b style={{ color: "#c4b5d4" }}>{t.label}</b> — seen in {t.why}
                </li>
              ))}
            </ul>
            <Panel style={{ background: "rgba(124,58,237,0.07)" }}>
              <p className="text-sm text-center italic" style={{ color: "#c4b5fd", fontFamily: "'Georgia', serif" }}>
                Your profile in one line: {traits.slice(0, 3).map((t) => t.label.toLowerCase()).join(" + ")}.
              </p>
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

        {/* Feature breakdown */}
        {observedCues.length > 0 && (
          <Section title="Handwriting Feature Breakdown" subtitle="Every cue examined in your sample, what was observed, and what it may suggest.">
            {FEATURE_GROUPS.map(([group, keys]) => (
              <Panel key={group} style={{ padding: "0.9rem 1rem", gap: "0.6rem" }}>
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#a78bfa" }}>{group}</span>
                {keys.map((k) => {
                  const v = features[k];
                  return (
                    <div key={k} className="grid grid-cols-1 sm:grid-cols-[9rem_7rem_1fr] gap-x-3 gap-y-0.5 text-xs leading-relaxed"
                      style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "0.5rem" }}>
                      <b style={{ color: isKnown(v) ? "#e5e7eb" : "#6b7280" }}>{titleCase(k)}</b>
                      <span style={{ color: isKnown(v) ? "#c4b5fd" : "#6b7280" }}>{isKnown(v) ? v : "Not observed"}</span>
                      <span style={{ color: "#9ca3af" }}>
                        {isKnown(v)
                          ? insights[k] || ""
                          : "Not clearly visible in this sample, so it was not scored."}
                      </span>
                    </div>
                  );
                })}
              </Panel>
            ))}
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

        {/* Takeaway */}
        <Panel style={{ background: "rgba(124,58,237,0.07)" }}>
          <SectionLabel>The Takeaway</SectionLabel>
          <p className="text-sm leading-relaxed" style={{ color: "#c4b5d4" }}>
            You do not need to become a different person. The most useful shift may be to turn your existing strengths
            into clearer decisions, stronger boundaries and consistent action.
          </p>
        </Panel>

        {/* Disclaimer */}
        <div className="rounded-xl px-4 py-3 flex gap-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <ShieldAlert size={14} style={{ color: "#4b5563", flexShrink: 0, marginTop: "2px" }} strokeWidth={1.8} />
          <p className="text-xs leading-relaxed" style={{ color: "#4b5563" }}>
            {report?.disclaimer} This report is not financial, medical, legal or psychological advice.
          </p>
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
