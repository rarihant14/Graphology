import { useRef } from "react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const CtaBanner = ({ handleAnalysisClick }) => {
  const ref = useRef(null);
  const isVisible = useScrollAnimation(ref);

  return (
    <section
      ref={ref}
      className="relative py-24 px-4 overflow-hidden"
      style={{
        background: "linear-gradient(180deg, hsl(270 60% 12%) 0%, hsl(240 33% 6%) 100%)",
      }}
    >
      <div className="purple-glow w-[600px] h-[600px] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30" />

      <div className={`relative z-10 max-w-3xl mx-auto text-center fade-up ${isVisible ? "visible" : ""}`}>
        <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
          Ready to Discover Yourself?
        </h2>
        <p className="text-muted-foreground text-lg mb-10">
          Join thousands of curious minds who've uncovered hidden truths through the strokes of their pen.
        </p>
        <button onClick={handleAnalysisClick} className="btn-primary text-lg px-12 py-5">
          Analyze My Handwriting Free →
        </button>
      </div>
    </section>
  );
};

export default CtaBanner;