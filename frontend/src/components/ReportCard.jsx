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

const confidenceRank = { high: 3, medium: 2, low: 1 };

const readableCueValue = (value) => value.replace(/_/g, " ").toLowerCase();

const SummaryItem = ({ item }) => (
  <Panel className="p-4">
    <div className="flex items-start justify-between gap-3">
      <h4 className="text-sm font-semibold" style={{ color: "#e5e7eb" }}>{item.title}</h4>
      <span className="text-[10px]" style={{ color: confidenceColor[item.confidence] }}>
        {titleCase(item.confidence)} confidence
      </span>
    </div>
    <p className="mt-2 text-xs leading-relaxed" style={{ color: "#c4b5d4" }}>{item.description}</p>
    <p className="mt-2 text-[11px] leading-relaxed" style={{ color: "#6b7280" }}>
      Why we see it: {item.evidence?.[1] || item.evidence?.[0]}
    </p>
  </Panel>
);

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

const DimensionDetails = ({ dimension }) => (
  <Panel className="p-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h4 className="text-sm font-semibold" style={{ color: "#e5e7eb" }}>{dimension.label}</h4>
        <p className="mt-1 text-xs" style={{ color: "#c4b5fd" }}>{dimension.score}/100 · {dimension.core_style}</p>
      </div>
      <span className="rounded-full px-2 py-1 text-[10px]" style={{ background: "rgba(124,58,237,0.14)", color: "#c4b5fd" }}>
        {titleCase(dimension.confidence)} confidence
      </span>
    </div>
    <p className="mt-3 text-xs leading-relaxed" style={{ color: "#d1c4df" }}>{dimension.essence}</p>
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      <p className="text-[11px] leading-relaxed" style={{ color: "#9fe4f4" }}><b>Strength:</b> {dimension.strength}</p>
      <p className="text-[11px] leading-relaxed" style={{ color: "#f5c2d7" }}><b>Potential blind spot:</b> {dimension.blind_spot}</p>
      <p className="text-[11px] leading-relaxed" style={{ color: "#c4b5fd" }}><b>Growth shift:</b> {dimension.growth_shift}</p>
      <p className="text-[11px] leading-relaxed" style={{ color: "#a7f3d0" }}><b>Next move:</b> {dimension.next_move}</p>
    </div>
    <p className="mt-3 text-[11px] leading-relaxed" style={{ color: "#8b82a6" }}>
      Why we see it: {dimension.evidence?.slice(0, 3).join(" · ") || "Limited visible evidence was available."}
    </p>
  </Panel>
);

const DimensionDetailAdditions = ({ dimension }) => (
  <>
    <Panel className="p-4">
      <p className="text-xs leading-relaxed" style={{ color: "#d1c4df" }}>{dimension.detailed_explanation}</p>
    </Panel>
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      <p className="text-[11px] leading-relaxed" style={{ color: "#f0abfc" }}><b>Core style:</b> {dimension.core_style}</p>
      <p className="text-[11px] leading-relaxed" style={{ color: "#bae6fd" }}><b>Mindful action:</b> {dimension.mindful_action}</p>
    </div>
    <div className="mt-3 rounded-lg p-3" style={{ background: "rgba(124,58,237,0.08)" }}>
      <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#c4b5fd" }}>How we reached this insight</p>
      <p className="mt-1 text-[11px] leading-relaxed" style={{ color: "#a8a0b8" }}>{dimension.cue_note}</p>
    </div>
    <p className="mt-3 text-[11px] italic leading-relaxed" style={{ color: "#9ca3af" }}>
      Reflection: Which part of this interpretation matches your lived experience, and which part does not?
    </p>
  </>
);

const ShareCardPreview = ({ card, profile }) => (
  <Panel className="p-4">
    <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#a78bfa" }}>Shareable result card</h3>
    <div className="mt-3 rounded-xl p-4" style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.22), rgba(14,116,144,0.16))", border: "1px solid rgba(167,139,250,0.24)" }}>
      <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#9fe4f4" }}>INKSIGHT</p>
      <p className="mt-2 text-lg font-semibold" style={{ color: "#f3f0ff" }}>{card?.headline || profile?.archetype || "Your handwriting profile"}</p>
      <p className="mt-2 text-xs leading-relaxed" style={{ color: "#ddd6fe" }}>{card?.supporting_line || profile?.one_line_profile}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {(card?.highlights || profile?.dimensions?.slice(0, 3).map((item) => `${item.label}: ${item.score}/100`)).map((highlight) => (
          <span key={highlight} className="rounded-full px-2 py-1 text-[10px]" style={{ background: "rgba(255,255,255,0.10)", color: "#ede9fe" }}>{highlight}</span>
        ))}
      </div>
      <p className="mt-3 text-[11px]" style={{ color: "#c4b5fd" }}>{card?.call_to_action || "See your patterns. Understand your tendencies. Choose your next move."}</p>
    </div>
  </Panel>
);

const ObservationCard = ({ observation }) => (
  <Panel className="p-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h4 className="text-sm font-semibold" style={{ color: "#e5e7eb" }}>{observation.feature_name}</h4>
        <p className="mt-1 text-xs font-medium" style={{ color: observation.observed_value === "unknown" ? "#a78bfa" : "#9fe4f4" }}>
          {titleCase(observation.observed_value)}
        </p>
      </div>
      <div className="text-right text-[10px]" style={{ color: confidenceColor[observation.confidence] }}>
        <p>{titleCase(observation.confidence)} confidence</p>
        <p className="mt-1" style={{ color: "#6b7280" }}>{titleCase(observation.assessability)}</p>
      </div>
    </div>
    <p className="mt-3 text-xs leading-relaxed" style={{ color: "#c4b5d4" }}>
      {observation.evidence?.description || "No evidence description was returned for this cue."}
    </p>
    <p className="mt-2 text-[11px]" style={{ color: "#8b82a6" }}>
      Coverage: {titleCase(observation.evidence?.coverage || "unknown")}
      {observation.evidence?.supporting_letters?.length
        ? ` · Supporting letters: ${observation.evidence.supporting_letters.join(", ")}`
        : ""}
    </p>
  </Panel>
);

const ObservationBreakdown = ({ observations }) => {
  const groups = observations.reduce((result, observation) => {
    const category = observation.category || "other";
    result[category] = result[category] || [];
    result[category].push(observation);
    return result;
  }, {});

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#7c3aed" }}>
            Full 70-Cue Observation Report
          </h3>
          <p className="mt-1 text-xs" style={{ color: "#9ca3af" }}>
            Every visual cue returned by the handwriting analysis, grouped by category.
          </p>
        </div>
        <span className="text-[11px]" style={{ color: "#c4b5fd" }}>{observations.length} cues</span>
      </div>
      {Object.entries(groups).map(([category, items]) => (
        <details key={category} open className="rounded-2xl p-4" style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(167,139,250,0.16)" }}>
          <summary className="cursor-pointer text-sm font-semibold" style={{ color: "#c4b5fd" }}>
            {titleCase(category)} <span className="ml-2 text-[11px] font-normal" style={{ color: "#8b82a6" }}>{items.length} cues</span>
          </summary>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {items.map((observation) => <ObservationCard key={observation.feature_id} observation={observation} />)}
          </div>
        </details>
      ))}
    </section>
  );
};

const ReportCard = ({ report, sampleUrl = null }) => {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  const observations = report?.observations ?? [];
  const assessableCount = observations.filter(
    ({ assessability }) => assessability !== "not_assessable",
  ).length;
  const primaryVisibleCues = observations
    .filter(
      ({ assessability, observed_value, evidence }) =>
        assessability !== "not_assessable" &&
        observed_value !== "unknown" &&
        evidence?.description,
    )
    .sort((left, right) => (confidenceRank[right.confidence] || 0) - (confidenceRank[left.confidence] || 0));
  const primaryCueTotal = 70;

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
                Handwriting Report
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

        {sampleUrl && (
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#7c3aed" }}>
                Handwriting Sample
              </h3>
              <span className="text-[11px]" style={{ color: "#9ca3af" }}>Primary visual evidence</span>
            </div>
            <img
              src={sampleUrl}
              alt="Submitted handwriting sample"
              className="w-full rounded-xl object-contain"
              style={{ maxHeight: 420, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(167,139,250,0.22)" }}
            />
            <div className="rounded-lg px-3 py-2.5" style={{ background: "rgba(14,116,144,0.08)", border: "1px solid rgba(103,232,249,0.14)" }}>
              <h4 className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "#9fe4f4" }}>Primary visible cues</h4>
              <p className="mt-1.5 text-xs leading-relaxed" style={{ color: "#e5e7eb" }}>
                {primaryVisibleCues.length
                  ? primaryVisibleCues.slice(0, 6).map(({ feature_name, observed_value }) => `${feature_name.toLowerCase()}: ${readableCueValue(observed_value)}`).join(", ")
                  : "The sample did not provide enough reliable evidence for a concise primary-cue summary."}
              </p>
              <p className="mt-1.5 text-[10px]" style={{ color: "#8b82a6" }}>
                {Math.min(primaryVisibleCues.length, primaryCueTotal)} of {primaryCueTotal} handwriting cues were clearly observable in your sample.
              </p>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "#9ca3af" }}>
              This image is the starting point for the report. The observations below describe only visible letter forms,
              spacing, alignment, stroke patterns, and page organization. They are reflective possibilities, not fixed conclusions.
            </p>
          </section>
        )}

        <section className="rounded-2xl p-4 sm:p-5" style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(167,139,250,0.18)" }}>
          <h3 className="text-sm font-semibold" style={{ color: "#c4b5fd" }}>BEGIN WITH AWARENESS</h3>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: "#9ca3af" }}>A reflective report is most useful when it becomes a choice, not a label.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-4">
            {["01 Observe · Notice the visible pattern before assigning meaning.", "02 Reflect · Ask what feels familiar, useful, or incomplete.", "03 Apply · Turn one insight into a small experiment.", "04 Choose · Keep what helps and leave what does not fit."].map((item) => {
              const [title, ...description] = item.split(" · ");
              return <div key={title} className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.04)" }}><p className="text-xs font-semibold" style={{ color: "#e5e7eb" }}>{title}</p><p className="mt-1 text-[11px] leading-relaxed" style={{ color: "#c4b5d4" }}>{description.join(" · ")}</p></div>;
            })}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed" style={{ color: "#8b82a6" }}>A note on interpretation: graphology is a traditional interpretive practice, not scientifically validated, and this report is for self-reflection and entertainment only.</p>
        </section>

        {report?.report_summary && (
          <section
            className="flex flex-col gap-4 rounded-2xl p-4 sm:p-5"
            style={{
              background: "linear-gradient(135deg, rgba(124,58,237,0.12), rgba(79,70,229,0.06))",
              border: "1px solid rgba(167,139,250,0.2)",
            }}
          >
            <div>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#a78bfa" }}>
                  Your Interpretation
                </h3>
                <span className="rounded-full px-2 py-1 text-[10px]" style={{ background: "rgba(255,255,255,0.06)", color: "#c4b5fd" }}>
                  {report.report_summary.method_confidence.confidence}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed" style={{ color: "#9ca3af" }}>
                Key evidence-linked insights from your handwriting. The full 70-feature breakdown is included in the downloadable PDF.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#e5e7eb" }}>TOP 5 STRENGTHS</h4>
                {report.report_summary.top_strengths.slice(0, 5).map((item) => (
                  <SummaryItem key={item.title} item={item} />
                ))}
              </div>
              <div className="flex flex-col gap-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#e5e7eb" }}>POTENTIAL BLIND SPOTS</h4>
                {report.report_summary.potential_blind_spots.slice(0, 4).map((item) => (
                  <SummaryItem key={item.title} item={item} />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#e5e7eb" }}>YOU MAY BE SOMEONE WHO...</h4>
              {report.report_summary.you_may_be_someone_who.slice(0, 4).map((text) => (
                <p key={text} className="text-xs leading-relaxed" style={{ color: "#c4b5d4" }}>• {text}</p>
              ))}
            </div>

            <p className="text-[11px] leading-relaxed" style={{ color: "#8b82a6" }}>
              Method: {report.report_summary.method_confidence.method}
            </p>
          </section>
        )}

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#7c3aed" }}>
              Reading at a glance
            </h3>
            <span className="text-[11px]" style={{ color: "#6b7280" }}>Evidence overview</span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Panel className="p-3">
              <p className="text-[10px] uppercase tracking-wide" style={{ color: "#6b7280" }}>Features reviewed</p>
              <p className="mt-1 text-lg font-semibold" style={{ color: "#c4b5fd" }}>{observations.length}</p>
              <p className="text-[10px]" style={{ color: "#8b82a6" }}>visual cues</p>
            </Panel>
            <Panel className="p-3">
              <p className="text-[10px] uppercase tracking-wide" style={{ color: "#6b7280" }}>Assessable</p>
              <p className="mt-1 text-lg font-semibold" style={{ color: "#c4b5fd" }}>{assessableCount}</p>
              <p className="text-[10px]" style={{ color: "#8b82a6" }}>with visible evidence</p>
            </Panel>
            <Panel className="p-3">
              <p className="text-[10px] uppercase tracking-wide" style={{ color: "#6b7280" }}>Script</p>
              <p className="mt-1 text-xs font-semibold" style={{ color: "#d1d5db" }}>{titleCase(report?.image_assessment?.script || "unknown")}</p>
              <p className="text-[10px]" style={{ color: "#8b82a6" }}>detected writing system</p>
            </Panel>
            <Panel className="p-3">
              <p className="text-[10px] uppercase tracking-wide" style={{ color: "#6b7280" }}>Sample</p>
              <p className="mt-1 text-xs font-semibold" style={{ color: "#d1d5db" }}>{titleCase(report?.image_assessment?.sample_sufficiency || "unknown")}</p>
              <p className="text-[10px]" style={{ color: "#8b82a6" }}>coverage quality</p>
            </Panel>
          </div>
        </section>

        {report?.profile_snapshot && (
          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#7c3aed" }}>KNOW YOUR X-FACTOR</h3>
            <p className="text-xs leading-relaxed" style={{ color: "#9ca3af" }}>Three high-scoring signals that may be useful when you choose your next step.</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {report.profile_snapshot.dimensions.slice(0, 3).map((dimension) => (
                <Panel key={`factor-${dimension.key}`} className="p-3">
                  <p className="text-sm font-semibold" style={{ color: "#e5e7eb" }}>{dimension.label} · {dimension.score}/100</p>
                  <p className="mt-2 text-[11px] leading-relaxed" style={{ color: "#c4b5d4" }}><b>What your profile suggests:</b> {dimension.essence}</p>
                  <p className="mt-2 text-[11px] leading-relaxed" style={{ color: "#a7f3d0" }}><b>Make it useful:</b> {dimension.next_move}</p>
                </Panel>
              ))}
            </div>
          </section>
        )}

        <section className="hidden flex-col gap-3">
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

        {report?.profile_snapshot && (
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#7c3aed" }}>
                  Profile Snapshot
                </h3>
                <p className="mt-1 text-xs" style={{ color: "#9ca3af" }}>{report.profile_snapshot.one_line_profile}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-semibold" style={{ color: "#c4b5fd" }}>{report.profile_snapshot.overall_score}</p>
                <p className="text-[10px] uppercase tracking-wide" style={{ color: "#6b7280" }}>overall quotient</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {report.profile_snapshot.dimensions.map((dimension) => (
                <Panel key={dimension.key} className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium" style={{ color: "#d1d5db" }}>{dimension.label}</span>
                    <span className="text-xs font-semibold" style={{ color: "#c4b5fd" }}>{dimension.score}/100</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div className="h-full rounded-full" style={{ width: `${dimension.score}%`, background: "linear-gradient(90deg, #7c3aed, #a78bfa)" }} />
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed" style={{ color: "#8b82a6" }}>{dimension.essence}</p>
                </Panel>
              ))}
            </div>
            <p className="text-[11px]" style={{ color: "#6b7280" }}>
              Strongest focus: {report.profile_snapshot.strongest_focus} · Growth focus: {report.profile_snapshot.growth_focus}
            </p>
          </section>
        )}

        {report?.profile_snapshot && (
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#7c3aed" }}>Dimension Insights</h3>
              <span className="text-[11px]" style={{ color: "#6b7280" }}>The same core points as the PDF</span>
            </div>
            {report.profile_snapshot.dimensions.map((dimension) => (
              <div key={`detail-${dimension.key}`} className="flex flex-col gap-3">
                <DimensionDetails dimension={dimension} />
                <DimensionDetailAdditions dimension={dimension} />
              </div>
            ))}
          </section>
        )}

        {report?.report_summary && (
          <section className="grid gap-3 sm:grid-cols-2">
            <Panel>
              <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#a78bfa" }}>Personalised 30-day plan</h3>
              <div className="mt-3 flex flex-col gap-3">
                {report.report_summary.personalized_30_day_plan.slice(0, 4).map((item) => (
                  <div key={item.title}>
                    <p className="text-xs font-semibold" style={{ color: "#e5e7eb" }}>{item.timeframe}: {item.title}</p>
                    <p className="mt-1 text-[11px] leading-relaxed" style={{ color: "#c4b5d4" }}>{item.action}</p>
                    <p className="mt-1 text-[10px]" style={{ color: "#8b82a6" }}>{item.reason}</p>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel>
              <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#a78bfa" }}>Method + confidence</h3>
              <p className="mt-3 text-xs leading-relaxed" style={{ color: "#c4b5d4" }}>{report.report_summary.method_confidence.method}</p>
              <p className="mt-3 text-xs" style={{ color: confidenceColor[report.report_summary.method_confidence.confidence] }}>
                Confidence: {titleCase(report.report_summary.method_confidence.confidence)}
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] leading-relaxed" style={{ color: "#8b82a6" }}>
                {report.report_summary.method_confidence.limitations.slice(0, 4).map((limitation) => (
                  <li key={limitation}>{limitation}</li>
                ))}
              </ul>
            </Panel>
          </section>
        )}

        {report?.profile_snapshot && (
          <section className="grid gap-3 sm:grid-cols-2">
            <Panel>
              <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#a78bfa" }}>Graphology story</h3>
              <p className="mt-3 text-xs leading-relaxed" style={{ color: "#c4b5d4" }}>
                {report.profile_snapshot.one_line_profile} The strongest patterns may show where familiar habits create ease,
                while the growth focus offers a place to test a more deliberate response.
              </p>
              <div className="mt-3 rounded-lg p-3" style={{ background: "rgba(124,58,237,0.10)" }}>
                <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#c4b5fd" }}>The takeaway</p>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: "#e5e7eb" }}>
                  Keep the interpretation that creates a useful choice, and set aside anything that does not match your lived experience.
                </p>
              </div>
            </Panel>
            <ShareCardPreview card={report.report_summary?.shareable_result_card} profile={report.profile_snapshot} />
          </section>
        )}

        <p className="text-center text-[11px]" style={{ color: "#6b7280" }}>
          Detailed category-by-category observations are available in the downloaded PDF.
        </p>
      </div>
    </div>
  );
};

export default ReportCard;
