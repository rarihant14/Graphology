import { useRef } from "react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { UploadCloud, Brain, FileText } from "lucide-react";

const steps = [
  {
    num: "01",
    icon: UploadCloud,
    title: "Upload Your Handwriting",
    desc: "Take a clear photo or scan of your natural handwriting on plain or lined paper.",
  },
  {
    num: "02",
    icon: Brain,
    title: "AI Decodes Your Writing",
    desc: "Our Gemini-powered vision AI extracts 10 observable handwriting features and maps them through a validated graphology rules engine.",
  },
  {
    num: "03",
    icon: FileText,
    title: "Receive Your Personality Report",
    desc: "Get a warm, detailed personality traits analysis explaining what your handwriting reveals about your inner self.",
  },
];

const HowItWorksSection = ({ handleAnalysisClick }) => {
  const ref = useRef(null);
  const isVisible = useScrollAnimation(ref);

  return (
    <section id="how-it-works" ref={ref} className="relative py-24 px-4" style={{ background: "hsl(240 33% 8%)" }}>
      <div className="purple-glow w-[500px] h-[500px] right-0 -top-20" />

      <div className={`relative z-10 max-w-6xl mx-auto fade-up ${isVisible ? "visible" : ""}`}>
        <p className="section-label">THE PROCESS</p>
        <h2 className="section-heading">Three Steps to Know Yourself</h2>
        <p className="section-subtext">Simple, fast, and powered by advanced AI graphology.</p>

        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((s) => (
            <div key={s.num} className="glass-card p-8 relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-accent" />
              <span className="absolute top-4 right-4 text-6xl font-extrabold text-primary/10">{s.num}</span>
              <s.icon className="text-primary mb-6 relative z-10" size={40} />
              <h3 className="text-foreground font-bold text-xl mb-3">{s.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <button onClick={handleAnalysisClick} className="btn-primary text-lg px-10 py-4">
            Start Your Analysis →
          </button>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;