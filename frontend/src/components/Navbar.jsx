import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";

const navLinks = [
  { label: "Home", target: "hero" },
  { label: "How It Works", target: "how-it-works" },
  { label: "Services", target: "services" },
  { label: "What We Analyze", target: "what-we-analyze" },
  { label: "Why Us", target: "why-us" },
  { label: "FAQ", target: "faq" },
];

const PenIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
  </svg>
);

const Navbar = ({ handleAnalysisClick }) => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const scrollTo = (id) => {
    setMenuOpen(false);
    setTimeout(() => {
      if (id === "hero") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  };

  return (
    <>
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          transition: "all 0.3s ease",
          background: scrolled ? "hsl(var(--background) / 0.95)" : "transparent",
          backdropFilter: scrolled ? "blur(20px)" : "none",
          borderBottom: scrolled ? "1px solid hsl(var(--border))" : "none",
        }}
      >
        <div style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "0 1rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "64px",
        }}>

          {/* Logo */}
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none", flexShrink: 0 }}>
            <div style={{
              background: "hsl(var(--primary) / 0.12)",
              border: "1px solid hsl(var(--primary) / 0.25)",
              borderRadius: "8px",
              padding: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <PenIcon />
            </div>
            <span style={{ color: "hsl(var(--foreground))", fontWeight: 700, fontSize: "1.1rem", whiteSpace: "nowrap" }}>
              Graphology AI
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.target}
                onClick={() => scrollTo(link.target)}
                style={{ color: "hsl(var(--muted-foreground))", fontSize: "0.875rem", background: "none", border: "none", cursor: "pointer", transition: "color 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.color = "hsl(var(--foreground))"}
                onMouseLeave={e => e.currentTarget.style.color = "hsl(var(--muted-foreground))"}
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Desktop buttons */}
          <div className="hidden lg:flex items-center gap-3">
            <Link to="/login" className="btn-ghost text-sm py-2 px-5">Login</Link>
            <button onClick={handleAnalysisClick} className="btn-primary text-sm py-2 px-5">
              Get Started Free
            </button>
          </div>

          {/* Hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden"
            style={{
              background: menuOpen ? "hsl(var(--primary) / 0.15)" : "hsl(var(--primary) / 0.08)",
              border: "1px solid hsl(var(--primary) / 0.2)",
              borderRadius: "8px",
              padding: "8px",
              cursor: "pointer",
              color: "hsl(var(--foreground))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: "40px",
              minHeight: "40px",
              transition: "all 0.2s",
            }}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            top: "64px",
            zIndex: 99,
            background: "hsl(var(--background))",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem 1.5rem",
            animation: "menuSlideIn 0.25s ease-out",
          }}
        >
          {/* Nav links */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
            width: "100%",
            marginBottom: "2rem",
          }}>
            {navLinks.map((link, i) => (
              <button
                key={link.target}
                onClick={() => scrollTo(link.target)}
                style={{
                  color: "hsl(var(--muted-foreground))",
                  fontSize: "0.95rem",
                  fontWeight: 500,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "0.6rem 1.25rem",
                  borderRadius: "10px",
                  width: "100%",
                  textAlign: "center",
                  transition: "all 0.2s",
                  animation: `menuItemFade 0.3s ease-out ${i * 0.05}s both`,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "hsl(var(--primary) / 0.08)";
                  e.currentTarget.style.color = "hsl(var(--primary))";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "none";
                  e.currentTarget.style.color = "hsl(var(--muted-foreground))";
                }}
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div style={{
            width: "100%",
            height: "1px",
            background: "hsl(var(--border))",
            marginBottom: "1.5rem",
          }} />

          {/* CTA buttons */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            width: "100%",
            maxWidth: "280px",
            animation: "menuItemFade 0.3s ease-out 0.3s both",
          }}>
            <Link
              to="/login"
              onClick={() => setMenuOpen(false)}
              className="btn-ghost text-center"
              style={{ padding: "0.7rem 1.5rem", fontSize: "0.9rem" }}
            >
              Login
            </Link>
            <button
              onClick={() => { setMenuOpen(false); handleAnalysisClick(); }}
              className="btn-primary text-center"
              style={{ padding: "0.7rem 1.5rem", fontSize: "0.9rem" }}
            >
              Get Started Free
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;