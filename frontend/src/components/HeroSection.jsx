import { useRef } from "react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { ChevronDown } from "lucide-react";

const HeroSection = ({ handleAnalysisClick }) => {
  const ref = useRef(null);
  const isVisible = useScrollAnimation(ref);

  const scrollToHow = () => {
    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
<section
  id="hero"
  ref={ref}
  className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16"
>
      {/* Background glow */}
      <div className="purple-glow w-[600px] h-[600px] -left-40 top-1/4" />
      <div className="purple-glow w-[400px] h-[400px] right-0 bottom-20 opacity-10" />

      {/* Floating SVG shapes */}
      <svg className="absolute top-32 left-[15%] opacity-10 animate-float" width="120" height="60" viewBox="0 0 120 60">
        <path d="M10 50 Q30 10 60 30 Q90 50 110 20" stroke="hsl(var(--primary))" strokeWidth="2" fill="none" />
      </svg>
      <svg className="absolute bottom-40 right-[10%] opacity-10 animate-float-delay" width="100" height="50" viewBox="0 0 100 50">
        <path d="M5 40 Q25 5 50 25 Q75 45 95 15" stroke="hsl(var(--highlight))" strokeWidth="2" fill="none" />
      </svg>

      <div className={`relative z-10 max-w-[900px] mx-auto px-4 text-center fade-up ${isVisible ? "visible" : ""}`}>
        {/* Badge */}
        <div className="inline-flex items-center gap-2 border border-primary/40 rounded-full px-5 py-2 mb-8 text-sm text-primary bg-primary/5">
          ✦ AI-Powered Handwriting Analysis
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-foreground leading-tight mb-6">
          Discover Yourself
          <br />
          Through <span className="gradient-text">Your Handwriting</span>
        </h1>

        {/* Subtext */}
        <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto mb-10">
          Upload a sample of your handwriting and our AI reveals your personality traits,
          emotional patterns, and hidden strengths — instantly.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
          <button onClick={handleAnalysisClick} className="btn-primary text-lg px-10 py-4">
            Analyze My Handwriting →
          </button>
          <button onClick={scrollToHow} className="btn-ghost text-lg px-10 py-4">
            See How It Works
          </button>
        </div>

        {/* Trust line */}
        <p className="text-muted-foreground/60 text-sm flex flex-wrap items-center justify-center gap-4">
          <span>✦ Results in under 60 seconds</span>
          <span>·</span>
          <span>✦ 100% Private</span>
          <span>·</span>
          <span>✦ AI-Powered</span>
        </p>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce-slow">
        <ChevronDown className="text-muted-foreground/40" size={28} />
      </div>
    </section>
  );
};

export default HeroSection;