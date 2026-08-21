/**
 * ReportCard.jsx — Displays the graphology personality analysis report.
 *
 * Features:
 * - Fade-in animation on mount
 * - Personality traits in a readable text block
 * - Disclaimer in a muted box
 * - Copy to clipboard button with toast feedback
 */

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Sparkles, Copy, Check, FileText, ShieldAlert } from "lucide-react";

const ReportCard = ({ personalityTraits, disclaimer }) => {
  const [visible, setVisible]   = useState(false);
  const [copied, setCopied]     = useState(false);

  // Trigger fade-in on mount
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleCopy = async () => {
    const fullReport =
      `GRAPHOLOGY AI — PERSONALITY ANALYSIS\n` +
      `${"─".repeat(40)}\n\n` +
      `${personalityTraits}\n\n` +
      `${"─".repeat(40)}\n` +
      `DISCLAIMER\n${disclaimer}`;

    try {
      await navigator.clipboard.writeText(fullReport);
      setCopied(true);
      toast.success("Report copied!", {
        duration: 2500,
        style: {
          background: "#0f1a12",
          color: "#86efac",
          border: "1px solid #14532d",
          borderRadius: "12px",
          fontSize: "14px",
        },
        iconTheme: { primary: "#4ade80", secondary: "#0f1a12" },
      });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Failed to copy. Please copy manually.", {
        style: {
          background: "#1a0f0f",
          color: "#f87171",
          border: "1px solid #3f1f1f",
          borderRadius: "12px",
        },
      });
    }
  };

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "20px",
        backdropFilter: "blur(16px)",
        overflow: "hidden",
      }}
    >
      {/* Top accent bar */}
      <div
        style={{
          height: "3px",
          background: "linear-gradient(90deg, #7c3aed, #4f46e5, #7c3aed)",
          backgroundSize: "200% 100%",
          animation: "shimmer 3s linear infinite",
        }}
      />

      {/* Card content */}
      <div className="p-6 flex flex-col gap-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #7c3aed22, #4f46e522)",
                border: "1px solid rgba(124,58,237,0.3)",
              }}
            >
              <Sparkles size={15} style={{ color: "#a78bfa" }} strokeWidth={2} />
            </div>
            <h2
              className="text-base font-semibold tracking-tight"
              style={{
                background: "linear-gradient(135deg, #e2d9f3 0%, #a78bfa 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                fontFamily: "'Georgia', serif",
              }}
            >
              Your Personality Analysis
            </h2>
          </div>

          {/* Copy button */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
            style={
              copied
                ? {
                    background: "rgba(74,222,128,0.1)",
                    border: "1px solid rgba(74,222,128,0.25)",
                    color: "#4ade80",
                  }
                : {
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "#9ca3af",
                  }
            }
            onMouseEnter={(e) => {
              if (!copied) {
                e.currentTarget.style.background = "rgba(124,58,237,0.1)";
                e.currentTarget.style.borderColor = "rgba(124,58,237,0.3)";
                e.currentTarget.style.color = "#a78bfa";
              }
            }}
            onMouseLeave={(e) => {
              if (!copied) {
                e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                e.currentTarget.style.color = "#9ca3af";
              }
            }}
          >
            {copied
              ? <><Check size={12} strokeWidth={2.5} /> Copied!</>
              : <><Copy size={12} strokeWidth={2} /> Copy Report</>
            }
          </button>
        </div>

        {/* Divider */}
        <div style={{ height: "1px", background: "rgba(255,255,255,0.06)" }} />

        {/* Personality traits body */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-1.5">
            <FileText size={13} style={{ color: "#7c3aed" }} strokeWidth={1.8} />
            <span
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: "#7c3aed" }}
            >
              Personality Traits
            </span>
          </div>

          <p
            className="text-sm leading-7"
            style={{
              color: "#c4b5d4",
              whiteSpace: "pre-wrap",
              fontFamily: "'Georgia', serif",
              letterSpacing: "0.01em",
            }}
          >
            {personalityTraits}
          </p>
        </div>

        {/* Disclaimer box */}
        <div
          className="rounded-xl px-4 py-3 flex gap-3"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <ShieldAlert
            size={14}
            style={{ color: "#4b5563", flexShrink: 0, marginTop: "2px" }}
            strokeWidth={1.8}
          />
          <p
            className="text-xs leading-relaxed"
            style={{ color: "#4b5563" }}
          >
            {disclaimer}
          </p>
        </div>
      </div>

      {/* Shimmer keyframe */}
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
      `}</style>
    </div>
  );
};

export default ReportCard;