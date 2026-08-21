import { useRef } from "react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Zap, Shield, BookOpen, Sparkles } from "lucide-react";

const cards = [
  {
    icon: Zap,
    title: "Instant AI Analysis",
    desc: "No waiting for a human graphologist. Our Gemini-powered pipeline analyzes your handwriting and returns a full report in under 60 seconds.",
  },
  {
    icon: Shield,
    title: "Private by Design",
    desc: "Your image is processed and immediately discarded. We store only your anonymized report — never your raw handwriting image.",
  },
  {
    icon: BookOpen,
    title: "Rooted in Real Graphology",
    desc: "Our rules engine is built on traditional graphology research — not LLM guesswork. Every trait maps to a validated, transparent interpretation.",
  },
  {
    icon: Sparkles,
    title: "Warm, Human Tone",
    desc: "Our AI writes like a thoughtful friend, not a clinical report. Insights feel personal, reflective, and empowering.",
  },
];

const WhyUsSection = () => {
  const ref = useRef(null);
  const isVisible = useScrollAnimation(ref);

  return (
    <section id="why-us" ref={ref} className="relative py-24 px-4" style={{ background: "hsl(240 33% 8%)" }}>
      <div className="purple-glow w-[500px] h-[500px] right-0 bottom-0" />

      <div className={`relative z-10 max-w-6xl mx-auto fade-up ${isVisible ? "visible" : ""}`}>
        <p className="section-label">OUR EDGE</p>
        <h2 className="section-heading">Why Graphology AI?</h2>
        <p className="section-subtext">
          We combine the ancient science of graphology with modern AI to give you insights that are honest, private, and surprisingly accurate.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          {cards.map((c) => (
            <div key={c.title} className="glass-card p-8 border-l-2 border-l-primary">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-5">
                <c.icon className="text-primary-foreground" size={24} />
              </div>
              <h3 className="text-foreground font-bold text-xl mb-3">{c.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyUsSection;