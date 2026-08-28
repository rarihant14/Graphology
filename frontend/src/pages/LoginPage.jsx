import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const GoogleIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.96 11.96 0 0 0 1 12c0 1.92.44 3.73 1.18 5.35l3.66-2.84z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const PenIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
  </svg>
);

const features = [
  {
    title: "AI-Powered Analysis",
    desc: "Gemini vision AI extracts 10 handwriting features and maps them to a validated graphology rules engine.",
  },
  {
    title: "Results in 60 Seconds",
    desc: "No waiting. Upload your handwriting and receive a full personality traits report almost instantly.",
  },
  {
    title: "100% Private",
    desc: "Your image is processed and immediately discarded. We never store your handwriting — only your anonymized report.",
  },
];

const LoginPage = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: "hsl(var(--background))" }}
    >
      {/* Background glows */}
      <div className="purple-glow w-[700px] h-[700px] -left-60 top-1/4 opacity-25" />
      <div className="purple-glow w-[500px] h-[500px] right-0 bottom-0 opacity-15" />

      {/* Floating ink strokes */}
      <svg className="absolute top-20 left-[30%] opacity-[0.06] animate-float" width="180" height="80" viewBox="0 0 180 80">
        <path d="M10 60 Q45 10 90 40 Q135 70 170 20" stroke="hsl(var(--primary))" strokeWidth="2" fill="none" />
      </svg>
      <svg className="absolute bottom-28 right-[25%] opacity-[0.06] animate-float-delay" width="140" height="60" viewBox="0 0 140 60">
        <path d="M5 45 Q35 5 70 30 Q105 55 135 15" stroke="hsl(var(--highlight))" strokeWidth="2" fill="none" />
      </svg>
      <svg className="absolute top-1/3 right-[5%] opacity-[0.04] animate-float" width="100" height="50" viewBox="0 0 100 50">
        <path d="M5 35 Q25 5 50 25 Q75 45 95 15" stroke="hsl(var(--accent))" strokeWidth="2" fill="none" />
      </svg>

      {/* Navbar strip */}
      <div className="relative z-20 flex items-center justify-between px-8 py-5">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div style={{
            background: "hsl(var(--primary) / 0.12)",
            border: "1px solid hsl(var(--primary) / 0.25)",
            borderRadius: "10px",
            padding: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s",
          }}>
            <PenIcon />
          </div>
          <span className="text-foreground font-bold text-lg">Graphology AI</span>
        </Link>

        {/* Back to home */}
        <Link
          to="/"
          className="flex items-center gap-2 text-sm transition-colors duration-200"
          style={{ color: "hsl(var(--muted-foreground))" }}
          onMouseEnter={e => e.currentTarget.style.color = "hsl(var(--primary))"}
          onMouseLeave={e => e.currentTarget.style.color = "hsl(var(--muted-foreground))"}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Home
        </Link>
      </div>

      {/* Main content */}
      <div
        className="relative z-10 flex items-center justify-center min-h-[calc(100vh-80px)] px-6 pb-12"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(30px)",
          transition: "opacity 0.8s ease-out, transform 0.8s ease-out",
        }}
      >
        <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-16 items-center">

          {/* Left side — branding */}
          <div>
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 mb-8 text-sm"
              style={{
                border: "1px solid hsl(var(--primary) / 0.3)",
                color: "hsl(var(--primary))",
                background: "hsl(var(--primary) / 0.05)",
              }}
            >
              ✦ AI-Powered Handwriting Analysis
            </div>

            <h1 className="font-extrabold leading-tight mb-6" style={{ fontSize: "clamp(2.5rem, 5vw, 3.5rem)", color: "hsl(var(--foreground))" }}>
              Discover Yourself
              <br />
              Through Your
              <br />
              <span style={{
                background: "linear-gradient(to right, hsl(var(--primary)), hsl(var(--highlight)))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>
                Handwriting
              </span>
            </h1>

            <p className="mb-10 leading-relaxed" style={{ color: "hsl(var(--muted-foreground))", fontSize: "1.05rem" }}>
              Upload a handwriting sample and our AI reveals your personality traits,
              emotional patterns, and hidden strengths.
            </p>

            {/* Feature list */}
            <div className="space-y-5">
              {features.map((f) => (
                <div key={f.title} className="flex items-start gap-4">
                  <div style={{
                    minWidth: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    background: "hsl(var(--primary) / 0.15)",
                    border: "1px solid hsl(var(--primary) / 0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "hsl(var(--primary))",
                    fontSize: "14px",
                    marginTop: "2px",
                  }}>
                    ✦
                  </div>
                  <div>
                    <p className="font-semibold mb-1" style={{ color: "hsl(var(--foreground))", fontSize: "0.95rem" }}>{f.title}</p>
                    <p style={{ color: "hsl(var(--muted-foreground))", fontSize: "0.85rem", lineHeight: "1.6" }}>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right side — login card */}
          <div style={{
            background: "hsl(var(--card) / 0.5)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            borderRadius: "1.25rem",
            padding: "2.5rem",
            boxShadow: "0 0 80px hsl(var(--primary) / 0.1), inset 0 1px 0 hsl(var(--primary) / 0.1)",
          }}>

            {/* Secure badge */}
            <div className="flex justify-center mb-6">
              <div
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm"
                style={{
                  border: "1px solid hsl(var(--primary) / 0.25)",
                  color: "hsl(var(--primary))",
                  background: "hsl(var(--primary) / 0.07)",
                }}
              >
                ✦ Secure Sign In
              </div>
            </div>

            <h2 className="font-bold text-center mb-2" style={{ color: "hsl(var(--foreground))", fontSize: "1.75rem" }}>
              Welcome Back
            </h2>
            <p className="text-center mb-8 text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
              Sign in to access your handwriting analysis
            </p>

            {/* Divider */}
            <div style={{ height: "1px", background: "hsl(var(--border))", marginBottom: "2rem" }} />

            {/* Google button */}
            <button
              onClick={() => { window.location.href = "https://graphology-846t.onrender.com/auth/google"; }}
              className="w-full flex items-center justify-center gap-3 cursor-pointer transition-all duration-300"
              style={{
                background: "linear-gradient(to right, hsl(var(--primary)), hsl(var(--accent)))",
                color: "hsl(var(--primary-foreground))",
                fontWeight: 600,
                fontSize: "1rem",
                padding: "0.9rem 2rem",
                borderRadius: "0.75rem",
                border: "none",
                marginBottom: "1.25rem",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = "0 0 30px hsl(var(--primary) / 0.4)";
                e.currentTarget.style.transform = "scale(1.02)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <GoogleIcon />
              Continue with Google →
            </button>

            {/* Trust row */}
            <div
              className="flex items-center justify-center gap-3 mb-6"
              style={{ color: "hsl(var(--muted-foreground))", fontSize: "11px", opacity: 0.6 }}
            >
              <span>✦ 100% Private</span>
              <span>·</span>
              <span>✦ No data stored</span>
              <span>·</span>
              <span>✦ Secure OAuth</span>
            </div>

            {/* Fine print */}
            <p className="text-center" style={{ color: "hsl(var(--muted-foreground) / 0.5)", fontSize: "11px", lineHeight: "1.6" }}>
              By continuing, you agree that this analysis is for reflective purposes only.
              Graphology AI does not store your handwriting images.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
