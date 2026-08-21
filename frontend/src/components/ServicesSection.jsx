import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { ScanLine, CalendarClock } from "lucide-react";

const ServicesSection = ({ handleAnalysisClick }) => {
  const ref = useRef(null);
  const isVisible = useScrollAnimation(ref);
  const navigate = useNavigate();

  return (
    <section id="services" ref={ref} className="relative py-24 px-4">
      <div className="purple-glow w-[400px] h-[400px] -left-32 top-1/3" />

      <div className={`relative z-10 max-w-6xl mx-auto fade-up ${isVisible ? "visible" : ""}`}>
        <p className="section-label">WHAT WE OFFER</p>
        <h2 className="section-heading">Our Services</h2>
        <p className="section-subtext">Two ways to unlock the story your handwriting tells.</p>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Card 1 */}
          <div className="glass-card p-10 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-6">
              <ScanLine className="text-primary-foreground" size={32} />
            </div>
            <h3 className="text-foreground font-bold text-2xl mb-4">Handwriting Analysis</h3>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Upload a photo of your handwriting and our AI instantly extracts 10 observable features, maps them through a validated graphology rules engine, and generates a warm, detailed personality traits report.
            </p>
            <ul className="text-muted-foreground text-sm space-y-2 mb-8">
              <li><span className="text-primary">✦</span> AI-powered feature extraction</li>
              <li><span className="text-primary">✦</span> 10-point personality analysis</li>
              <li><span className="text-primary">✦</span> Downloadable PDF report</li>
            </ul>
            <button onClick={handleAnalysisClick} className="btn-primary mt-auto">
              Start Analysis →
            </button>
          </div>

          {/* Card 2 */}
          <div className="glass-card p-10 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-6">
              <CalendarClock className="text-primary-foreground" size={32} />
            </div>
            <h3 className="text-foreground font-bold text-2xl mb-4">Graphology Consultation</h3>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Book a one-on-one session with a certified graphology consultant for a deeper, personalized reading of your handwriting and personality insights.
            </p>
            <ul className="text-muted-foreground text-sm space-y-2 mb-8">
              <li><span className="text-primary">✦</span> One-on-one private session</li>
              <li><span className="text-primary">✦</span> Deeper personalized insights</li>
              <li><span className="text-primary">✦</span> Career, relationships & growth focus</li>
            </ul>
            <button onClick={() => navigate("/appointment")} className="btn-ghost mt-auto">
              Book Appointment →
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;