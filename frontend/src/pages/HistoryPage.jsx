/**
 * HistoryPage.jsx — Displays the authenticated user's past handwriting analyses.
 *
 * Features:
 * - Fetches history from GET /api/history on mount
 * - Skeleton loading cards while fetching
 * - Expandable analysis cards with "Read more" toggle
 * - Empty state when no analyses exist
 * - "New Analysis" CTA button
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PenLine, Clock, ChevronDown, ChevronUp, Sparkles, FileText } from "lucide-react";
import Navbar from "../components/Navbar";
import { getHistory } from "../api/client";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const truncate = (text, length = 150) => {
  if (!text || text.length <= length) return text;
  return text.slice(0, length).trimEnd() + "...";
};

// ---------------------------------------------------------------------------
// Skeleton card — shown while loading
// ---------------------------------------------------------------------------

const SkeletonCard = () => (
  <div
    className="rounded-2xl p-5 flex flex-col gap-3 animate-pulse"
    style={{
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.06)",
    }}
  >
    <div className="flex items-center justify-between">
      <div className="h-4 w-32 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }} />
      <div className="h-4 w-24 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }} />
    </div>
    <div className="h-3 w-full rounded-full" style={{ background: "rgba(255,255,255,0.04)" }} />
    <div className="h-3 w-5/6 rounded-full" style={{ background: "rgba(255,255,255,0.04)" }} />
    <div className="h-3 w-4/6 rounded-full" style={{ background: "rgba(255,255,255,0.04)" }} />
    <div className="h-3 w-3/6 rounded-full mt-1" style={{ background: "rgba(255,255,255,0.03)" }} />
  </div>
);

// ---------------------------------------------------------------------------
// Analysis card
// ---------------------------------------------------------------------------

const AnalysisCard = ({ analysis, index }) => {
  const [expanded, setExpanded] = useState(false);
  const isLong = analysis.personality_traits?.length > 150;
  const displayText = expanded
    ? analysis.personality_traits
    : truncate(analysis.personality_traits);

  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-4 transition-all duration-200"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(8px)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.035)";
        e.currentTarget.style.borderColor = "rgba(124,58,237,0.25)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.02)";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
      }}
    >
      {/* Card header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
            style={{
              background: "linear-gradient(135deg, #7c3aed22, #4f46e522)",
              border: "1px solid rgba(124,58,237,0.25)",
              color: "#a78bfa",
            }}
          >
            {index}
          </div>
          <span className="text-sm font-medium" style={{ color: "#d1d5db" }}>
            Analysis #{index}
          </span>
        </div>

        <div className="flex items-center gap-1.5" style={{ color: "#6b7280" }}>
          <Clock size={12} strokeWidth={1.8} />
          <span className="text-xs">{formatDate(analysis.created_at)}</span>
        </div>
      </div>

      {/* Personality traits */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <Sparkles size={13} style={{ color: "#a78bfa" }} strokeWidth={1.8} />
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#7c3aed" }}>
            Personality Traits
          </span>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: "#9ca3af" }}>
          {displayText}
        </p>

        {/* Read more / less toggle */}
        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs font-medium self-start transition-all duration-150 mt-1"
            style={{ color: "#7c3aed" }}
            onMouseEnter={(e) => e.currentTarget.style.color = "#a78bfa"}
            onMouseLeave={(e) => e.currentTarget.style.color = "#7c3aed"}
          >
            {expanded ? (
              <><ChevronUp size={13} /> Show less</>
            ) : (
              <><ChevronDown size={13} /> Read more</>
            )}
          </button>
        )}
      </div>

      {/* Disclaimer */}
      <div
        className="rounded-xl px-3 py-2.5"
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div className="flex items-start gap-2">
          <FileText size={12} style={{ color: "#4b5563", marginTop: "2px", flexShrink: 0 }} />
          <p className="text-xs leading-relaxed" style={{ color: "#4b5563" }}>
            {analysis.disclaimer}
          </p>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

const EmptyState = ({ onNewAnalysis }) => (
  <div className="flex flex-col items-center justify-center py-20 gap-5 text-center">
    <div
      className="w-16 h-16 rounded-2xl flex items-center justify-center"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <PenLine size={26} style={{ color: "#4b5563" }} strokeWidth={1.5} />
    </div>
    <div className="flex flex-col gap-2">
      <p className="text-base font-medium" style={{ color: "#9ca3af" }}>
        No analyses yet
      </p>
      <p className="text-sm" style={{ color: "#6b7280" }}>
        Upload your first handwriting sample to get started
      </p>
    </div>
    <button
      onClick={onNewAnalysis}
      className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
      style={{
        background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
        color: "#ffffff",
        boxShadow: "0 4px 20px rgba(124,58,237,0.3)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.boxShadow = "0 8px 28px rgba(124,58,237,0.45)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 4px 20px rgba(124,58,237,0.3)";
      }}
    >
      Upload First Sample
    </button>
  </div>
);

// ---------------------------------------------------------------------------
// HistoryPage component
// ---------------------------------------------------------------------------

const HistoryPage = () => {
  const navigate = useNavigate();
  const [analyses, setAnalyses]   = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const response = await getHistory();
        setAnalyses(response.data || []);
      } catch (err) {
        console.error("Failed to fetch history:", err);
        setError("Failed to load your analysis history. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, []);

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(ellipse 80% 50% at 50% -10%, #1e1035 0%, #0a0812 50%, #030207 100%)",
      }}
    >
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 py-10 flex flex-col gap-8">

        {/* Page header */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Clock size={20} style={{ color: "#a78bfa" }} strokeWidth={1.8} />
              <h1
                className="text-2xl font-semibold tracking-tight"
                style={{
                  background: "linear-gradient(135deg, #e2d9f3 0%, #a78bfa 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  fontFamily: "'Georgia', serif",
                }}
              >
                Analysis History
              </h1>
            </div>
            <p className="text-sm" style={{ color: "#6b7280" }}>
              Your past handwriting analyses
            </p>
          </div>

          {/* New Analysis button */}
          <button
            onClick={() => navigate("/home")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
            style={{
              background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
              color: "#ffffff",
              boxShadow: "0 4px 16px rgba(124,58,237,0.3)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(124,58,237,0.45)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 16px rgba(124,58,237,0.3)";
            }}
          >
            <Sparkles size={14} strokeWidth={2} />
            New Analysis
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          /* Skeleton loading state */
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>

        ) : error ? (
          /* Error state */
          <div
            className="rounded-2xl p-6 text-center"
            style={{
              background: "rgba(239,68,68,0.05)",
              border: "1px solid rgba(239,68,68,0.15)",
            }}
          >
            <p className="text-sm" style={{ color: "#f87171" }}>{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 text-xs underline"
              style={{ color: "#6b7280" }}
            >
              Try again
            </button>
          </div>

        ) : analyses.length === 0 ? (
          /* Empty state */
          <EmptyState onNewAnalysis={() => navigate("/home")} />

        ) : (
          /* Analysis cards */
          <div className="flex flex-col gap-4">
            {/* Count badge */}
            <p className="text-xs" style={{ color: "#6b7280" }}>
              {analyses.length} {analyses.length === 1 ? "analysis" : "analyses"} found
            </p>
            {analyses.map((analysis, idx) => (
              <AnalysisCard
                key={analysis.id}
                analysis={analysis}
                index={analyses.length - idx}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default HistoryPage;