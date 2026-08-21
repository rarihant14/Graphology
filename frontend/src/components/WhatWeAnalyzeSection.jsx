import { useRef, useState } from "react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const features = [
  {
    name: "Letter Size",
    desc: "Reveals confidence and self-image",
    visual: (
      <div className="flex items-end gap-3 justify-center py-4">
        <div className="text-center">
          <span className="text-foreground block" style={{ fontSize: 10, lineHeight: 1 }}>Abcd</span>
          <p className="text-[9px] text-muted-foreground mt-1">Small</p>
        </div>
        <div className="text-center">
          <span className="text-foreground block" style={{ fontSize: 17, lineHeight: 1 }}>Abcd</span>
          <p className="text-[9px] text-muted-foreground mt-1">Medium</p>
        </div>
        <div className="text-center">
          <span className="text-foreground block" style={{ fontSize: 26, lineHeight: 1 }}>Abcd</span>
          <p className="text-[9px] text-muted-foreground mt-1">Large</p>
        </div>
      </div>
    ),
  },
  {
    name: "Slant Direction",
    desc: "Indicates emotional expression style",
    visual: (
      <div className="flex items-center gap-6 justify-center py-4">
        {[
          { rotate: "rotate(-20deg)", label: "Left" },
          { rotate: "rotate(0deg)",   label: "Vertical" },
          { rotate: "rotate(20deg)",  label: "Right" },
        ].map((s) => (
          <div key={s.label} className="text-center flex flex-col items-center">
            <div
              style={{
                width: "3px",
                height: "28px",
                background: "hsl(var(--primary))",
                borderRadius: "2px",
                transform: s.rotate,
                marginBottom: "6px",
              }}
            />
            <p className="text-[9px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    name: "Baseline",
    desc: "Reflects mood stability and ambition",
    visual: (
      <svg className="w-full mx-auto" style={{ height: "56px" }} viewBox="0 0 200 56">
        <line x1="8"   y1="36" x2="42"  y2="14" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round" />
        <text x="6"  y="52" fill="hsl(var(--muted-foreground))" fontSize="8">Ascending</text>

        <line x1="55"  y1="25" x2="90"  y2="25" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round" />
        <text x="57" y="52" fill="hsl(var(--muted-foreground))" fontSize="8">Straight</text>

        <line x1="103" y1="14" x2="137" y2="36" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round" />
        <text x="100" y="52" fill="hsl(var(--muted-foreground))" fontSize="8">Descending</text>

        <path d="M152 18 Q159 32 166 18 Q173 4 180 22" stroke="hsl(var(--primary))" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <text x="155" y="52" fill="hsl(var(--muted-foreground))" fontSize="8">Wavy</text>
      </svg>
    ),
  },
  {
    name: "Writing Pressure",
    desc: "Shows energy levels and emotional intensity",
    visual: (
      <svg className="w-full mx-auto" style={{ height: "44px" }} viewBox="0 0 180 44">
        <line x1="8"   y1="12" x2="52"  y2="12" stroke="hsl(var(--primary))" strokeWidth="7"   strokeLinecap="round" />
        <text x="16"  y="30" fill="hsl(var(--muted-foreground))" fontSize="8">Heavy</text>

        <line x1="68"  y1="12" x2="112" y2="12" stroke="hsl(var(--primary))" strokeWidth="3.5" strokeLinecap="round" />
        <text x="73"  y="30" fill="hsl(var(--muted-foreground))" fontSize="8">Medium</text>

        <line x1="128" y1="12" x2="172" y2="12" stroke="hsl(var(--primary))" strokeWidth="1"   strokeLinecap="round" />
        <text x="136" y="30" fill="hsl(var(--muted-foreground))" fontSize="8">Light</text>
      </svg>
    ),
  },
  {
    name: "Letter Spacing",
    desc: "Suggests social comfort and openness",
    visual: (
      <div className="flex items-end gap-2 justify-center py-3">
        <div className="text-center">
          <span className="text-foreground text-xs block" style={{ letterSpacing: "-1px" }}>abcde</span>
          <p className="text-[9px] text-muted-foreground mt-1">Cramped</p>
        </div>
        <div className="text-center">
          <span className="text-foreground text-xs block" style={{ letterSpacing: "2px" }}>abcde</span>
          <p className="text-[9px] text-muted-foreground mt-1">Normal</p>
        </div>
        <div className="text-center">
          <span className="text-foreground text-xs block" style={{ letterSpacing: "5px" }}>abcde</span>
          <p className="text-[9px] text-muted-foreground mt-1">Wide</p>
        </div>
      </div>
    ),
  },
  {
    name: "Word Spacing",
    desc: "Indicates need for personal space",
    visual: (
      <div className="flex items-end gap-3 justify-center py-3">
        <div className="text-center">
          <div className="text-foreground text-xs leading-tight" style={{ wordSpacing: "-3px" }}>
            <div>Abc Abc</div>
            <div>Abc Abc</div>
          </div>
          <p className="text-[9px] text-muted-foreground mt-1">Narrow</p>
        </div>
        <div className="text-center">
          <div className="text-foreground text-xs leading-tight" style={{ wordSpacing: "3px" }}>
            <div>Abc Abc</div>
            <div>Abc Abc</div>
          </div>
          <p className="text-[9px] text-muted-foreground mt-1">Normal</p>
        </div>
        <div className="text-center">
          <div className="text-foreground text-xs leading-tight" style={{ wordSpacing: "10px" }}>
            <div>Abc Abc</div>
            <div>Abc Abc</div>
          </div>
          <p className="text-[9px] text-muted-foreground mt-1">Wide</p>
        </div>
      </div>
    ),
  },
  {
    name: "Connectivity",
    desc: "Reflects logical vs intuitive thinking",
    visual: (
      <div className="flex items-center gap-4 justify-center py-4">
        <div className="text-center">
          <span className="text-foreground text-xs block" style={{ letterSpacing: "4px" }}>A b c</span>
          <p className="text-[9px] text-muted-foreground mt-1">Printed</p>
        </div>
        <div className="text-center">
          <span className="text-foreground text-xs block">Abc</span>
          <p className="text-[9px] text-muted-foreground mt-1">Mixed</p>
        </div>
        <div className="text-center">
          <span className="text-foreground text-xs italic block" style={{ fontFamily: "Georgia, serif" }}>Abc</span>
          <p className="text-[9px] text-muted-foreground mt-1">Cursive</p>
        </div>
      </div>
    ),
  },
  {
    name: "Margin Usage",
    desc: "Reveals relationship with boundaries",
    visual: (
      <div className="flex items-center gap-3 justify-center py-4">
        {[
          { label: "Left-Heavy",  leftW: 10, rightW: 1 },
          { label: "Balanced",    leftW: 1,  rightW: 1 },
          { label: "Right-Heavy", leftW: 1,  rightW: 10 },
        ].map((m) => (
          <div key={m.label} className="text-center">
            <div
              style={{
                width: "40px",
                height: "28px",
                border: "1px solid hsl(var(--border))",
                borderRadius: "4px",
                display: "flex",
                overflow: "hidden",
              }}
            >
              <div style={{ width: `${m.leftW}px`, background: "hsl(var(--primary))", flexShrink: 0 }} />
              <div style={{ flex: 1 }} />
              <div style={{ width: `${m.rightW}px`, background: "hsl(var(--primary))", flexShrink: 0 }} />
            </div>
            <p className="text-[8px] text-muted-foreground mt-1 leading-tight">{m.label}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    name: "Loop Style",
    desc: "Indicates imagination and emotional depth",
    visual: (
      <svg className="w-full mx-auto" style={{ height: "58px" }} viewBox="0 0 180 58">
        {/* Open loop */}
        <path d="M22 10 L22 32 Q22 48 32 42 Q37 39 34 32"
          stroke="hsl(var(--primary))" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <text x="14" y="56" fill="hsl(var(--muted-foreground))" fontSize="8">Open</text>

        {/* Closed loop */}
        <path d="M82 10 L82 32 Q82 50 97 42 Q103 38 97 30 Q91 24 82 30"
          stroke="hsl(var(--primary))" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <text x="74" y="56" fill="hsl(var(--muted-foreground))" fontSize="8">Closed</text>

        {/* Absent — straight line */}
        <line x1="148" y1="10" x2="148" y2="44"
          stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round" />
        <text x="138" y="56" fill="hsl(var(--muted-foreground))" fontSize="8">Absent</text>
      </svg>
    ),
  },
  {
    name: "Legibility",
    desc: "Reflects communication style and clarity",
    visual: (
      <div className="flex items-end gap-2 justify-center py-3">
        <div className="text-center">
          <span className="text-foreground text-xs font-semibold block">Graphology</span>
          <p className="text-[9px] text-muted-foreground mt-1">High</p>
        </div>
        <div className="text-center">
          <span className="text-foreground text-xs italic block" style={{ opacity: 0.7 }}>Graphology</span>
          <p className="text-[9px] text-muted-foreground mt-1">Medium</p>
        </div>
        <div className="text-center">
          <span className="text-foreground text-xs italic block" style={{ opacity: 0.35, letterSpacing: "-0.5px" }}>Graphology</span>
          <p className="text-[9px] text-muted-foreground mt-1">Low</p>
        </div>
      </div>
    ),
  },
];

const WhatWeAnalyzeSection = () => {
  const ref = useRef(null);
  const isVisible = useScrollAnimation(ref);
  const [hoveredCard, setHoveredCard] = useState(null);

  return (
    <section id="what-we-analyze" ref={ref} className="relative py-24 px-4">
      <div className="purple-glow w-[400px] h-[400px] -left-20 top-1/3" />

      <div className={`relative z-10 max-w-6xl mx-auto fade-up ${isVisible ? "visible" : ""}`}>
        <p className="section-label">UNDER THE LENS</p>
        <h2 className="section-heading">10 Features Our AI Reads</h2>
        <p className="section-subtext">
          We extract precise, observable handwriting features — each mapped to a validated graphology interpretation.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {features.map((f, i) => (
            <div
              key={f.name}
              onMouseEnter={() => setHoveredCard(i)}
              onMouseLeave={() => setHoveredCard(null)}
              className={`glass-card p-5 relative transition-all duration-300 ${
                hoveredCard === i
                  ? "border-primary/60 shadow-[0_0_20px_hsl(var(--primary)/0.15)] scale-[1.02]"
                  : ""
              }`}
            >
              {/* Top purple gradient line */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "2px",
                  background: "linear-gradient(to right, hsl(var(--primary)), hsl(var(--accent)))",
                  borderRadius: "4px 4px 0 0",
                }}
              />
              <h4 className="text-foreground font-bold text-sm mb-1">{f.name}</h4>
              {f.visual}
              <p className="text-muted-foreground text-xs mt-1">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhatWeAnalyzeSection;