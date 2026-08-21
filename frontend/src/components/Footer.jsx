import { Link } from "react-router-dom";

const PenIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
  </svg>
);

const quickLinks = [
  { label: "Home", target: "hero" },
  { label: "How It Works", target: "how-it-works" },
  { label: "Services", target: "services" },
  { label: "What We Analyze", target: "what-we-analyze" },
  { label: "Why Us", target: "why-us" },
  { label: "FAQ", target: "faq" },
];

const Footer = ({ handleAnalysisClick }) => {
  const scrollTo = (id) => {
    if (id === "hero") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <footer className="border-t border-border py-16 px-4" style={{ background: "hsl(240 40% 3%)" }}>
      <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-12">
        {/* Left */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <PenIcon />
            <span className="text-foreground font-bold text-lg">Graphology AI</span>
          </div>
          <p className="text-muted-foreground text-sm mb-4">Discover Yourself Through Your Handwriting</p>
          <p className="text-muted-foreground/50 text-xs">© 2026 Graphology AI. All rights reserved.</p>
        </div>

        {/* Center */}
        <div>
          <h4 className="font-mono text-primary text-sm mb-4">Quick Links</h4>
          <div className="space-y-2">
            {quickLinks.map((l) => (
              <button
                key={l.target}
                onClick={() => scrollTo(l.target)}
                className="block text-muted-foreground text-sm hover:text-primary transition-colors cursor-pointer"
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right */}
        <div>
          <h4 className="font-mono text-primary text-sm mb-4">Get Started</h4>
          <div className="space-y-2">
            <button
              onClick={handleAnalysisClick}
              className="block text-muted-foreground text-sm hover:text-primary transition-colors cursor-pointer"
            >
              Analyze My Handwriting →
            </button>
            <Link
              to="/appointment"
              className="block text-muted-foreground text-sm hover:text-primary transition-colors"
            >
              Book a Consultation →
            </Link>
            <p className="text-muted-foreground/40 text-xs mt-4">Powered by Google Gemini AI</p>
          </div>
        </div>
      </div>

      <div className="text-center mt-12">
        <p className="text-muted-foreground/30 text-xs max-w-lg mx-auto">
          This tool is for reflective and entertainment purposes only. Graphology is not a scientifically validated field.
        </p>
      </div>
    </footer>
  );
};

export default Footer;