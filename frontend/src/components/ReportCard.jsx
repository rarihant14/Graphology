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

const ReportSection = ({ title, subtitle, children, className = "" }) => (
  <section className={`overflow-hidden rounded-2xl ${className}`} style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(167,139,250,0.18)", boxShadow: "0 16px 40px rgba(0,0,0,0.14)" }}>
    <div style={{ background: "linear-gradient(135deg, rgba(76,29,149,0.92), rgba(30,64,175,0.82))", padding: "18px 20px" }}>
      <h2 className="text-xl font-bold" style={{ color: "#fff" }}>{title}</h2>
      {subtitle && <p className="mt-1 text-sm" style={{ color: "#ede9fe" }}>{subtitle}</p>}
    </div>
    <div className="p-5 sm:p-7" style={{ color: "#d1c4df" }}>{children}</div>
  </section>
);

const ReportText = ({ children, className = "" }) => (
  <p className={`text-sm leading-7 ${className}`} style={{ color: "#d1c4df" }}>{children}</p>
);

const ReportLabel = ({ children }) => (
  <h3 className="mt-5 mb-2 text-sm font-bold uppercase tracking-wider" style={{ color: "#a78bfa" }}>{children}</h3>
);

const ReportCard = ({ report, sampleUrl = null, name = "" }) => {
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

  const profile = report?.profile_snapshot;
  const summary = report?.report_summary;
  const dimensions = profile?.dimensions || [];
  const preparedName = name || "Your handwriting profile";
  const assessmentItems = Object.entries(report?.image_assessment || {});

  return (
    <div className="overflow-hidden rounded-2xl" style={{ background: "linear-gradient(180deg, rgba(18,15,35,0.98), rgba(10,10,20,0.98))", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="flex flex-wrap items-center justify-between gap-3 p-4" style={{ background: "#111827" }}>
        <div>
          <p className="text-xs font-bold tracking-widest" style={{ color: "#9fe4f4" }}>INKSIGHT</p>
          <p className="mt-1 text-sm font-semibold" style={{ color: "#fff" }}>PDA Graphology Analysis Report</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={handleCopy} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs" style={{ border: "1px solid rgba(255,255,255,0.18)", color: "#c4b5fd", background: "transparent" }}>
            {copied ? <Check size={13} /> : <Copy size={13} />}{copied ? "Copied" : "Copy JSON"}
          </button>
          <button type="button" onClick={handleDownload} disabled={downloading} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs" style={{ background: "#6d28d9", border: "1px solid #8b5cf6", color: "#fff", opacity: downloading ? 0.7 : 1 }}>
            {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}{downloading ? "Preparing..." : "Download PDF"}
          </button>
        </div>
      </div>

      {error && <p className="m-4 text-xs" style={{ color: "#b91c1c" }}>{error}</p>}

      <div className="flex flex-col gap-7 p-4 sm:p-7">
        {/* PDF-only cover intentionally omitted from the web report. */}
        {/* <section className="rounded-none p-8 text-center sm:p-14" style={{ background: "#1b3157", color: "#fff" }}>
          <p className="text-base font-bold tracking-wide" style={{ color: "#9fe4f4" }}>INKSIGHT</p>
          <h1 className="mt-10 text-3xl font-bold leading-tight sm:text-5xl">PDA GRAPHOLOGY<br />ANALYSIS REPORT</h1>
          <p className="mt-4 text-sm">A personalized self-discovery report based on traditional graphology</p>
          <p className="mt-16 text-lg font-bold">Prepared for</p>
          <p className="text-lg">{preparedName}</p>
          <p className="mx-auto mt-16 max-w-xl text-sm leading-6">Discover your patterns. Understand your strengths. Choose your next step.</p>
        </section> */}
        <p className="text-xs" style={{ color: "#6b7280" }}>Inksight · Your handwriting, interpreted as a mirror for reflection.</p>

        <ReportSection title="Handwriting Insight Report" subtitle={`Discover your patterns. Understand your strengths. Choose your next step. Schema ${report?.schema_version || "2.1"} · ${new Date().toLocaleDateString("en-GB")}${name ? ` · ${name}` : ""}`}>
          {sampleUrl && (
            <>
              <img src={sampleUrl} alt="Submitted handwriting sample" className="mx-auto w-full rounded-xl object-contain" style={{ maxHeight: 520, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(167,139,250,0.24)" }} />
              <ReportLabel>Visible Cues in This Image</ReportLabel>
              <div className="overflow-x-auto rounded-lg" style={{ border: "1px solid rgba(103,232,249,0.2)" }}>
                <table className="w-full text-left text-xs">
                  <thead style={{ background: "rgba(14,116,144,0.28)", color: "#9fe4f4" }}><tr><th className="p-3">Visible cue</th><th className="p-3">Observed value</th><th className="p-3">Evidence note</th></tr></thead>
                  <tbody>{observations.filter((item) => item.assessability !== "not_assessable").slice(0, 6).map((item) => <tr key={item.feature_id} style={{ background: "rgba(255,255,255,0.025)", color: "#d1c4df", borderTop: "1px solid rgba(103,232,249,0.12)" }}><td className="p-3 font-semibold">{item.feature_name}</td><td className="p-3">{titleCase(item.observed_value)}</td><td className="p-3">{item.evidence?.description || "No evidence description was returned for this cue."}</td></tr>)}</tbody>
                </table>
              </div>
            </>
          )}
          <ReportLabel>Image Assessment</ReportLabel>
          <div className="grid gap-2 sm:grid-cols-2">{assessmentItems.map(([key, value]) => <div key={key} className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.08)" }}><p className="text-xs font-bold" style={{ color: "#8b82a6" }}>{titleCase(key)}</p><p className="mt-1 text-sm" style={{ color: "#e5e7eb" }}>{titleCase(value)}</p></div>)}</div>
          <ReportLabel>Report at a Glance</ReportLabel>
          <div className="grid gap-2 sm:grid-cols-3">{[["70", "Features reviewed"], [String(assessableCount), "Visually assessable"], [summary?.method_confidence?.confidence || "low", "Overall coverage"]].map(([value, label]) => <div key={label} className="rounded-lg p-4 text-center" style={{ background: "rgba(124,58,237,0.13)", border: "1px solid rgba(196,181,253,0.28)" }}><p className="text-2xl font-bold" style={{ color: "#c4b5fd" }}>{value}</p><p className="text-xs font-bold uppercase" style={{ color: "#d1c4df" }}>{label}</p></div>)}</div>
          <ReportText className="mt-5">This one-page overview is a concise starting point. The following pages explain the evidence, limitations, actions, and all 70 visual observations in detail.</ReportText>
        </ReportSection>

        <ReportSection title="Begin With Awareness" subtitle="A reflective report is most useful when it becomes a choice, not a label.">
          <div className="grid gap-3 sm:grid-cols-2">{[
            ["01 Observe", "Notice the visible pattern before assigning meaning."], ["02 Reflect", "Ask what feels familiar, useful, or incomplete."], ["03 Apply", "Turn one insight into a small experiment."], ["04 Choose", "Keep what helps and leave what does not fit."],
          ].map(([title, text]) => <div key={title} className="rounded-lg p-4" style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(167,139,250,0.16)" }}><p className="font-bold" style={{ color: "#e5e7eb" }}>{title}</p><p className="mt-1 text-sm leading-6" style={{ color: "#c4b5d4" }}>{text}</p></div>)}</div>
          <ReportLabel>A Note on Interpretation</ReportLabel><ReportText>{"Graphology is a traditional interpretive practice, not scientifically validated. This report is for self-reflection and entertainment only, not diagnosis or financial, health, or relationship advice."}</ReportText>
          <ReportLabel>How to Read Your Report</ReportLabel><ReportText>Read the score beside the language and evidence. A low score is not a flaw; it is a possible area for curiosity, practice, or a different context.</ReportText>
        </ReportSection>

        <ReportSection title="Your Handwriting" subtitle="The image is the source. The interpretation stays grounded in what is visible.">
          <ReportLabel>Primary Visible Cues</ReportLabel><ReportText>{summary?.method_confidence?.method || "The report uses visible letter forms, spacing, alignment, stroke patterns, and page organization."}</ReportText>
          <ReportText className="mt-4">The detailed visual observations are retained in the analysis payload and are used as the evidence base for the profile below.</ReportText>
          <ReportText className="mt-4">A handwriting sample contains several layers at once: the form of individual letters, the rhythm between letters and words, the relationship between lines, and the way the page is used as a visual field. No single mark should carry the whole interpretation. The report combines multiple visible cues and keeps uncertain features qualified, so you can see both what the image can support and where your own lived experience remains the stronger source of truth.</ReportText>
          <ReportLabel>Image Quality and Sample Sufficiency</ReportLabel><ReportText>The quality labels on the cover describe how much of the uploaded sample was available for visual review. Where a cue was not clear, the profile uses cautious language rather than certainty.</ReportText>
        </ReportSection>

        {profile && <>
          <ReportSection title="Profile Snapshot" subtitle="Seven dimensions, one overall quotient, and two useful anchors.">
            <div className="grid gap-3">{dimensions.map((dimension) => <div key={dimension.key}><div className="flex justify-between text-sm font-semibold"><span>{dimension.label}</span><span>{dimension.score}/100</span></div><div className="mt-2 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}><div className="h-full rounded-full" style={{ width: `${dimension.score}%`, background: "linear-gradient(90deg, #7c3aed, #a78bfa)" }} /></div></div>)}</div>
            <div className="mt-6 rounded-lg p-4 text-center" style={{ background: "rgba(124,58,237,0.14)", border: "1px solid rgba(196,181,253,0.24)" }}><p className="text-3xl font-bold" style={{ color: "#c4b5fd" }}>{profile.overall_score}/100</p><p className="text-xs font-bold uppercase" style={{ color: "#d1c4df" }}>Overall Quotient</p></div>
            <ReportText className="mt-4">Strongest focus: {profile.strongest_focus} · Growth focus: {profile.growth_focus}</ReportText>
            <ReportText className="mt-4">The quotient is the rounded mean of the seven dimension scores. The bars show relative emphasis in this sample; they are not grades, diagnoses, or fixed personality limits.</ReportText>
          </ReportSection>

          <ReportSection title="Personality Dashboard" subtitle={profile.one_line_profile}>
            <ReportText><b>{profile.archetype}</b><br />{profile.archetype_tagline}</ReportText>
            <ReportLabel>Trait Signals</ReportLabel><div className="flex flex-wrap gap-2">{dimensions.slice(0, 12).map((d) => <span key={d.key} className="rounded-full px-3 py-1 text-xs" style={{ background: "rgba(124,58,237,0.16)", color: "#c4b5fd", border: "1px solid rgba(167,139,250,0.2)" }}>{d.label}</span>)}</div>
            <ReportText className="mt-5">Your profile is a conversation starter: it may describe tendencies in this sample, not the limits of who you are.</ReportText>
            <ReportText className="mt-4">Read the dashboard as a landscape rather than a leaderboard. Stronger dimensions may show where a familiar response is already available to you; the growth focus may show where a smaller, more deliberate experiment could add flexibility.</ReportText>
          </ReportSection>

          <ReportSection title="Know Your X-Factor" subtitle="Three high-scoring signals that may be useful when you choose your next step.">
            {dimensions.slice(0, 3).map((d) => <div key={d.key} className="mb-4 rounded-lg p-4" style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.08)" }}><ReportText><b>{d.label} · {d.score}/100</b></ReportText><ReportText className="mt-2">What your profile suggests: {d.essence}<br />Make it useful: {d.next_move}</ReportText></div>)}
          </ReportSection>

          {dimensions.map((dimension) => <ReportSection key={dimension.key} title={dimension.label} subtitle={`${dimension.score}/100 · ${dimension.core_style}`}>
            <ReportText>{dimension.detailed_explanation}</ReportText>
            <div className="mt-5 grid gap-3 sm:grid-cols-2"><ReportText><b>Essence:</b> {dimension.essence}</ReportText><ReportText><b>Strength:</b> {dimension.strength}</ReportText><ReportText><b>Watch For:</b> {dimension.blind_spot}</ReportText><ReportText><b>Growth Shift:</b> {dimension.growth_shift}</ReportText><ReportText><b>Core Style:</b> {dimension.core_style}</ReportText><ReportText><b>Mindful Action:</b> {dimension.mindful_action}</ReportText></div>
            <ReportLabel>How We Reached This Insight</ReportLabel><ReportText>{dimension.cue_note}</ReportText><ReportText className="mt-3">{(dimension.evidence || []).join(" · ") || "No single cue was strong enough to summarize."}</ReportText>
          </ReportSection>)}

          <ReportSection title="30-Day Growth Plan" subtitle="Small experiments create better information than fixed labels.">{(summary?.personalized_30_day_plan || []).slice(0, 4).map((item, index) => <div key={item.title} className="mb-4"><ReportText><b>{item.timeframe || `Week ${index + 1}`} · {item.title}</b><br />{item.action}<br /><span style={{ color: "#6b7280" }}>Why: {item.reason}</span></ReportText></div>)}</ReportSection>
          <ReportSection title="Graphology Story" subtitle="A narrative summary of the profile, written as a possibility rather than a verdict."><ReportText>{profile.one_line_profile}</ReportText><ReportText className="mt-4">The strongest patterns may show where your current habits create ease. The lower patterns are not weaknesses; they may simply point to places where a different practice could help.</ReportText><ReportText className="mt-4">The useful question is not whether every sentence is true. It is whether one sentence gives you a better choice in real life.</ReportText><ReportText className="mt-4">Across the report, the most reliable thread is the invitation to compare the language with your own experience. Keep the observations that create clarity, and treat the rest as prompts for further reflection.</ReportText><ReportLabel>The Takeaway</ReportLabel><ReportText>Use the report as a mirror with a question attached: what would you like to try next?</ReportText></ReportSection>
          <ReportSection title="Trust the Process" subtitle="See your patterns. Understand your tendencies. Choose your next move."><ReportText>{"Graphology is a traditional interpretive practice, not scientifically validated. This report is for self-reflection and entertainment only, not diagnosis or financial, health, or relationship advice."}</ReportText><ReportLabel>About Inksight</ReportLabel><ReportText>Inksight turns visible handwriting cues into a structured reflection experience. It is designed to support curiosity, not replace professional advice or lived experience.</ReportText></ReportSection>

          <ReportSection title="Your Personal Insight Layer" subtitle="Score + interpretation + evidence + action"><ReportText>{"Graphology is a traditional interpretive practice, not scientifically validated. This report is for self-reflection and entertainment only, not diagnosis or financial, health, or relationship advice."}</ReportText></ReportSection>
          {dimensions.map((d) => <ReportSection key={`appendix-${d.key}`} title={d.label} subtitle={`Personal insight · ${d.score}/100`}><ReportText>{d.detailed_explanation}</ReportText><ReportLabel>Why We See It</ReportLabel>{(d.evidence || []).map((cue, index) => <ReportText key={`${d.key}-${index}`} className="mt-2"><b>Evidence {index + 1}</b> · {cue}</ReportText>)}<ReportLabel>Original Report Cues</ReportLabel><ReportText>{d.cue_note}</ReportText><ReportText className="mt-4"><b>Strength:</b> {d.strength}<br /><b>Potential Blind Spot:</b> {d.blind_spot}<br /><b>Next Move:</b> {d.next_move}</ReportText><ReportText className="mt-4" style={{ fontStyle: "italic" }}>Which part of this interpretation matches your lived experience, and which part does not?</ReportText></ReportSection>)}
          <ReportSection title="Top 5 Strengths" subtitle="Ranked signals to practice, not labels to perform.">{dimensions.slice(0, 5).map((d, index) => <ReportText key={d.key} className="mb-4"><b>{index + 1}. {d.label} · {d.score}/100</b><br />{d.strength}<br /><span style={{ color: "#6b7280" }}>Potential blind spot: {d.blind_spot}<br />Cue: {(d.evidence || ["Not enough evidence"])[0]}</span></ReportText>)}</ReportSection>
          <ReportSection title="You May Be Someone Who…" subtitle="Seven readable statements to test against your lived experience.">{dimensions.slice(0, 7).map((d) => <ReportText key={`may-${d.key}`} className="mb-3">• You may be someone who {d.essence.charAt(0).toLowerCase() + d.essence.slice(1)}</ReportText>)}<ReportLabel>A Useful Test</ReportLabel><ReportText>Keep the statement that helps you notice a choice. Set aside the statement that does not match your lived experience.</ReportText></ReportSection>
          <ReportSection title="Personalised 30-Day Plan" subtitle="Built from the three lowest-scoring dimensions, with low scores treated as invitations rather than flaws.">{[...dimensions].sort((a, b) => a.score - b.score).slice(0, 3).map((d, index) => <ReportText key={`plan-${d.key}`} className="mb-4"><b>Focus {index + 1}: {d.label}</b><br />{d.next_move}<br /><span style={{ color: "#6b7280" }}>Why: {d.growth_shift}</span></ReportText>)}<ReportLabel>Day 30 Review</ReportLabel><ReportText>What became easier? What still needs a smaller experiment? What will you carry into the next month?</ReportText><ReportText className="mt-4"><b>30-DAY PRINCIPLE:</b> consistent and small is more informative than intense and temporary.</ReportText></ReportSection>
          <ReportSection title="Share Card" subtitle="A compact version of the reflection to save or share."><ReportText><b>{preparedName}</b><br />{profile.archetype}<br />{profile.one_line_profile}</ReportText><ReportText className="mt-4">{dimensions.slice(0, 3).map((d) => `${d.label} ${d.score}/100`).join(" · ")}</ReportText><ReportText className="mt-4">Suggested caption: A reflective snapshot of the patterns in my handwriting, with one next step to try.</ReportText><ReportText className="mt-4">CTA: See your patterns. Understand your tendencies. Choose your next move.</ReportText></ReportSection>
          <ReportSection title="Method + Confidence" subtitle="What was observed, how it was interpreted, and where the limits are."><ReportText>{summary?.method_confidence?.method}</ReportText><ReportText className="mt-4">Confidence level: {summary?.method_confidence?.confidence}</ReportText><ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6">{(summary?.method_confidence?.limitations || []).map((item) => <li key={item}>{item}</li>)}</ul><ReportText className="mt-5">{"Graphology is a traditional interpretive practice, not scientifically validated. This report is for self-reflection and entertainment only, not diagnosis or financial, health, or relationship advice."}</ReportText></ReportSection>
        </>}

        <p className="text-center text-xs" style={{ color: "#6b7280" }}>INKSIGHT · Reflective handwriting report</p>
      </div>
    </div>
  );
};

/*
 * The report is intentionally rendered as a document: the section order and
 * copy above mirror backend/report_pdf.py so the browser and downloaded PDF
 * tell the same story.
 */
/*
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
*/

export default ReportCard;
