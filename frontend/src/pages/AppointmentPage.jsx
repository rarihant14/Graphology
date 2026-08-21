import { useState } from "react";
import { Link } from "react-router-dom";
import { bookAppointment } from "../api/client";

const PenIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
  </svg>
);

const inputStyle = {
  width: "100%",
  padding: "0.75rem 1rem",
  borderRadius: "10px",
  border: "1px solid hsl(var(--border))",
  background: "hsl(var(--card) / 0.4)",
  color: "hsl(var(--foreground))",
  fontSize: "0.9rem",
  outline: "none",
  transition: "border-color 0.2s, box-shadow 0.2s",
};

const labelStyle = {
  display: "block",
  marginBottom: "6px",
  fontSize: "0.85rem",
  fontWeight: 500,
  color: "hsl(var(--muted-foreground))",
};

const AppointmentPage = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    preferred_datetime: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleFocus = (e) => {
    e.target.style.borderColor = "hsl(var(--primary) / 0.6)";
    e.target.style.boxShadow = "0 0 0 3px hsl(var(--primary) / 0.08)";
  };

  const handleBlur = (e) => {
    e.target.style.borderColor = "hsl(var(--border))";
    e.target.style.boxShadow = "none";
  };

  const validate = () => {
    if (!form.name.trim())              return "Please enter your name.";
    if (!form.email.trim())             return "Please enter your email.";
    if (!form.phone.trim())             return "Please enter your phone number.";
    if (!form.preferred_datetime)       return "Please select a preferred date and time.";
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { setError(err); return; }

    setLoading(true);
    setError("");

    try {
      await bookAppointment({
        ...form,
        preferred_datetime: new Date(form.preferred_datetime).toISOString(),
      });
      setSuccess(true);
    } catch (e) {
      setError(
        e?.response?.data?.detail ||
        "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: "hsl(var(--background))" }}>

      {/* Background glows */}
      <div className="purple-glow w-[600px] h-[600px] -left-40 top-0 opacity-20" />
      <div className="purple-glow w-[400px] h-[400px] right-0 bottom-0 opacity-10" />

      {/* Floating ink strokes */}
      <svg className="absolute top-24 left-[10%] opacity-[0.05] animate-float" width="160" height="70" viewBox="0 0 160 70">
        <path d="M10 55 Q40 10 80 35 Q120 60 150 20" stroke="hsl(var(--primary))" strokeWidth="2" fill="none" />
      </svg>
      <svg className="absolute bottom-32 right-[8%] opacity-[0.05] animate-float-delay" width="120" height="55" viewBox="0 0 120 55">
        <path d="M5 45 Q30 5 60 28 Q90 50 115 15" stroke="hsl(var(--highlight))" strokeWidth="2" fill="none" />
      </svg>

      {/* Navbar strip */}
      <div className="relative z-20 flex items-center justify-between px-6 sm:px-10 py-4"
        style={{ borderBottom: "1px solid hsl(var(--border))", backdropFilter: "blur(20px)" }}>
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
          <div style={{
            background: "hsl(var(--primary) / 0.12)",
            border: "1px solid hsl(var(--primary) / 0.25)",
            borderRadius: "8px", padding: "6px",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <PenIcon />
          </div>
          <span style={{ color: "hsl(var(--foreground))", fontWeight: 700, fontSize: "1.1rem" }}>
            Graphology AI
          </span>
        </Link>
        <Link to="/"
          style={{ color: "hsl(var(--muted-foreground))", fontSize: "0.875rem", textDecoration: "none", display: "flex", alignItems: "center", gap: "6px" }}
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
      <main className="relative z-10 max-w-2xl mx-auto px-4 py-12">

        {/* Success state */}
        {success ? (
          <div style={{
            background: "hsl(var(--card) / 0.5)",
            backdropFilter: "blur(20px)",
            borderRadius: "1.25rem",
            padding: "3rem 2rem",
            textAlign: "center",
            boxShadow: "0 0 60px hsl(var(--primary) / 0.1)",
            animation: "menuSlideIn 0.4s ease-out",
          }}>
            <div style={{
              width: "64px", height: "64px", borderRadius: "50%",
              background: "hsl(var(--primary) / 0.15)",
              border: "1px solid hsl(var(--primary) / 0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 1.5rem",
              fontSize: "1.75rem",
            }}>
              ✦
            </div>
            <h2 style={{ color: "hsl(var(--foreground))", fontWeight: 700, fontSize: "1.5rem", marginBottom: "0.75rem" }}>
              Appointment Booked!
            </h2>
            <p style={{ color: "hsl(var(--muted-foreground))", fontSize: "0.95rem", lineHeight: 1.6, marginBottom: "2rem" }}>
              Thank you, <strong style={{ color: "hsl(var(--foreground))" }}>{form.name}</strong>!
              We've received your booking request and will confirm via email at <strong style={{ color: "hsl(var(--primary))" }}>{form.email}</strong>.
            </p>
            <button
              onClick={() => { setSuccess(false); setForm({ name: "", email: "", phone: "", preferred_datetime: "", message: "" }); }}
              className="btn-ghost"
              style={{ padding: "0.7rem 2rem", fontSize: "0.9rem" }}
            >
              Book Another Appointment
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-2 mb-6 text-sm"
                style={{ border: "1px solid hsl(var(--primary) / 0.3)", color: "hsl(var(--primary))", background: "hsl(var(--primary) / 0.05)" }}>
                ✦ One-on-One Graphology Consultation
              </div>
              <h1 className="font-extrabold mb-3" style={{
                fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
                background: "linear-gradient(135deg, hsl(var(--foreground)) 0%, hsl(var(--primary)) 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              }}>
                Book Your Consultation
              </h1>
              <p style={{ color: "hsl(var(--muted-foreground))", fontSize: "0.95rem" }}>
                Fill in your details and we'll confirm your session shortly.
              </p>
            </div>

            {/* Form card */}
            <div style={{
              background: "hsl(var(--card) / 0.4)",
              backdropFilter: "blur(20px)",
              borderRadius: "1.25rem",
              padding: "2rem",
              boxShadow: "0 0 60px hsl(var(--primary) / 0.06)",
            }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

                {/* Name */}
                <div>
                  <label style={labelStyle}>Full Name *</label>
                  <input
                    name="name" value={form.name} onChange={handleChange}
                    onFocus={handleFocus} onBlur={handleBlur}
                    placeholder="Your full name"
                    style={inputStyle}
                  />
                </div>

                {/* Email + Phone row */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}
                  className="grid-cols-1 sm:grid-cols-2">
                  <div>
                    <label style={labelStyle}>Email *</label>
                    <input
                      name="email" type="email" value={form.email} onChange={handleChange}
                      onFocus={handleFocus} onBlur={handleBlur}
                      placeholder="you@example.com"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Phone Number *</label>
                    <input
                      name="phone" type="tel" value={form.phone} onChange={handleChange}
                      onFocus={handleFocus} onBlur={handleBlur}
                      placeholder="+91 XXXXX XXXXX"
                      style={inputStyle}
                    />
                  </div>
                </div>

                {/* Date & Time */}
                <div>
                  <label style={labelStyle}>Preferred Date & Time *</label>
                  <input
                    name="preferred_datetime" type="datetime-local"
                    value={form.preferred_datetime} onChange={handleChange}
                    onFocus={handleFocus} onBlur={handleBlur}
                    style={{ ...inputStyle, colorScheme: "dark" }}
                  />
                </div>

                {/* Message */}
                <div>
                  <label style={labelStyle}>Message / Reason for Consultation</label>
                  <textarea
                    name="message" value={form.message} onChange={handleChange}
                    onFocus={handleFocus} onBlur={handleBlur}
                    placeholder="Tell us what you'd like to explore in your session..."
                    rows={4}
                    style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
                  />
                </div>

                {/* Error */}
                {error && (
                  <div style={{
                    padding: "0.75rem 1rem", borderRadius: "10px",
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.2)",
                    color: "#f87171", fontSize: "0.85rem",
                  }}>
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="btn-primary w-full"
                  style={{
                    padding: "0.9rem",
                    fontSize: "1rem",
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading ? 0.7 : 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Booking...
                    </>
                  ) : (
                    "Book Appointment →"
                  )}
                </button>

              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default AppointmentPage;