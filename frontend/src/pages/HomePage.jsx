import { useCallback, useState, useRef } from "react";
import { useDropzone } from "react-dropzone";
import toast, { Toaster } from "react-hot-toast";
import { Upload, ImagePlus, X, Sparkles, PenLine, LogOut, History, Camera } from "lucide-react";
import { Link } from "react-router-dom";

import ReportCard from "../components/ReportCard";
import CameraModal from "../components/CameraModal";
import { useAnalysis } from "../hooks/useAnalysis";
import { useAuth } from "../context/AuthContext";

const PROGRESS_STEPS = [
  { key: "extracting",     label: "Extracting handwriting features...", percent: 30 },
  { key: "applying_rules", label: "Applying graphology rules...",        percent: 65 },
  { key: "generating",     label: "Generating your report...",           percent: 90 },
  { key: "complete",       label: "Analysis complete!",                  percent: 100 },
];

const PenIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
  </svg>
);

const HomePage = () => {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const cameraInputRef = useRef(null);

  const {
    selectedFile,
    previewUrl,
    isAnalyzing,
    report,
    progressStep,
    handleFileSelect,
    handleAnalyze,
    clearReport,
  } = useAnalysis();

  const { user, logout } = useAuth();

  const showError = useCallback((msg) => {
    toast.error(msg || "Analysis failed. Please try again.", {
      duration: 5000,
      style: {
        background: "hsl(var(--card))",
        color: "#f87171",
        border: "1px solid rgba(239,68,68,0.2)",
        borderRadius: "12px",
        fontSize: "14px",
      },
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"] },
    maxFiles: 1,
    maxSize: 15 * 1024 * 1024, // 15MB
    disabled: isAnalyzing,
    onDropAccepted: (files) => handleFileSelect(files[0], showError),
    onDropRejected: (rejections) => {
      const err = rejections[0]?.errors[0];
      if (err?.code === "file-too-large") {
        toast.error("File size exceeds 15MB. Please upload a smaller image.", {
          style: {
            background: "hsl(var(--card))",
            color: "#f87171",
            border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: "12px",
          },
        });
      } else {
        toast.error("Only JPEG and PNG images (up to 15MB) are accepted.", {
          style: {
            background: "hsl(var(--card))",
            color: "#f87171",
            border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: "12px",
          },
        });
      }
    },
  });

  const currentStep = PROGRESS_STEPS.find((s) => s.key === progressStep);
  const progressPercent = currentStep?.percent ?? 0;

  return (
    <>
      <Toaster position="top-right" />

      <div className="min-h-screen relative overflow-hidden" style={{ background: "hsl(var(--background))" }}>

        {/* Background glows — matching landing page */}
        <div className="purple-glow w-[600px] h-[600px] -left-40 top-0 opacity-20" />
        <div className="purple-glow w-[400px] h-[400px] right-0 bottom-0 opacity-10" />

        {/* Floating ink strokes */}
        <svg className="absolute top-24 left-[10%] opacity-[0.05] animate-float" width="160" height="70" viewBox="0 0 160 70">
          <path d="M10 55 Q40 10 80 35 Q120 60 150 20" stroke="hsl(var(--primary))" strokeWidth="2" fill="none" />
        </svg>
        <svg className="absolute bottom-32 right-[8%] opacity-[0.05] animate-float-delay" width="120" height="55" viewBox="0 0 120 55">
          <path d="M5 45 Q30 5 60 28 Q90 50 115 15" stroke="hsl(var(--highlight))" strokeWidth="2" fill="none" />
        </svg>

        {/* Navbar — matching landing page style */}
        <nav
          className="relative z-20 flex items-center justify-between px-6 sm:px-10 py-4"
          style={{
            background: "hsl(var(--background) / 0.8)",
            backdropFilter: "blur(20px)",
            borderBottom: "1px solid hsl(var(--border))",
          }}
        >
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div style={{
              background: "hsl(var(--primary) / 0.12)",
              border: "1px solid hsl(var(--primary) / 0.25)",
              borderRadius: "10px",
              padding: "7px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <PenIcon />
            </div>
            <span className="text-foreground font-bold text-lg">Graphology AI</span>
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* User avatar + name */}
            {user && (
              <div className="hidden sm:flex items-center gap-2">
                {user.avatar_url && (
                  <img
                    src={user.avatar_url}
                    alt={user.name}
                    className="w-8 h-8 rounded-full"
                    style={{ border: "1px solid hsl(var(--border))" }}
                  />
                )}
                <span className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                  {user.name}
                </span>
              </div>
            )}

            {/* History button */}
            <Link
              to="/history"
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-all duration-200"
              style={{
                color: "hsl(var(--muted-foreground))",
                border: "1px solid hsl(var(--border))",
                background: "transparent",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = "hsl(var(--primary))";
                e.currentTarget.style.borderColor = "hsl(var(--primary) / 0.4)";
                e.currentTarget.style.background = "hsl(var(--primary) / 0.05)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = "hsl(var(--muted-foreground))";
                e.currentTarget.style.borderColor = "hsl(var(--border))";
                e.currentTarget.style.background = "transparent";
              }}
            >
              <History size={15} />
              <span className="hidden sm:inline">History</span>
            </Link>

            {/* Logout button */}
            <button
              onClick={logout}
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-all duration-200"
              style={{
                color: "hsl(var(--muted-foreground))",
                border: "1px solid hsl(var(--border))",
                background: "transparent",
                cursor: "pointer",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = "#f87171";
                e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)";
                e.currentTarget.style.background = "rgba(239,68,68,0.05)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = "hsl(var(--muted-foreground))";
                e.currentTarget.style.borderColor = "hsl(var(--border))";
                e.currentTarget.style.background = "transparent";
              }}
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </nav>

        {/* Main content */}
        <main className="relative z-10 max-w-3xl mx-auto px-4 py-12 flex flex-col gap-8">

          {/* Page header */}
          <div className="text-center">
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 mb-6 text-sm"
              style={{
                border: "1px solid hsl(var(--primary) / 0.3)",
                color: "hsl(var(--primary))",
                background: "hsl(var(--primary) / 0.05)",
              }}
            >
              <PenLine size={14} />
              AI-Powered Handwriting Analysis
            </div>

            <h1
              className="font-extrabold mb-3"
              style={{
                fontSize: "clamp(2rem, 4vw, 2.75rem)",
                background: "linear-gradient(135deg, hsl(var(--foreground)) 0%, hsl(var(--primary)) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Analyze Your Handwriting
            </h1>
            <p style={{ color: "hsl(var(--muted-foreground))", fontSize: "1rem" }}>
              Upload a clear image of your handwriting to receive a detailed personality insight.
            </p>
          </div>

          {/* Upload zone */}
          {!report && (
            <div className="flex flex-col gap-4">

              {/* Dropzone */}
              <div
                {...getRootProps()}
                className="relative rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300"
                style={{
                  minHeight: previewUrl ? "auto" : "240px",
                  border: isDragActive
                    ? "2px dashed hsl(var(--primary))"
                    : "2px dashed hsl(var(--border))",
                  background: isDragActive
                    ? "hsl(var(--primary) / 0.06)"
                    : "hsl(var(--card) / 0.4)",
                  backdropFilter: "blur(12px)",
                  boxShadow: isDragActive
                    ? "0 0 30px hsl(var(--primary) / 0.15)"
                    : "none",
                  transition: "all 0.3s ease",
                }}
              >
                <input {...getInputProps()} />

                {previewUrl ? (
                  <div className="relative w-full">
                    <img
                      src={previewUrl}
                      alt="Handwriting preview"
                      className="w-full rounded-2xl object-contain"
                      style={{ maxHeight: "380px" }}
                    />
                    {!isAnalyzing && (
                      <button
                        onClick={(e) => { e.stopPropagation(); clearReport(); }}
                        className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150"
                        style={{
                          background: "rgba(0,0,0,0.6)",
                          border: "1px solid rgba(255,255,255,0.12)",
                          color: "#e5e7eb",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "rgba(239,68,68,0.4)"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "rgba(0,0,0,0.6)"}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4 py-14 px-6 text-center">
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300"
                      style={{
                        background: isDragActive
                          ? "hsl(var(--primary) / 0.2)"
                          : "hsl(var(--primary) / 0.08)",
                        border: `1px solid hsl(var(--primary) / ${isDragActive ? "0.5" : "0.2"})`,
                      }}
                    >
                      {isDragActive
                        ? <Upload size={26} style={{ color: "hsl(var(--primary))" }} />
                        : <ImagePlus size={26} style={{ color: "hsl(var(--primary))" }} />
                      }
                    </div>
                    <div>
                      <p className="font-semibold mb-1" style={{ color: "hsl(var(--foreground))", fontSize: "1rem" }}>
                        {isDragActive ? "Drop your image here" : "Drag & drop your handwriting"}
                      </p>
                      <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                        or click to browse — JPEG, PNG accepted (up to 15MB)
                      </p>
                    </div>

                    {/* Camera Photo Action */}
                    <div className="flex flex-col sm:flex-row items-center gap-2 mt-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsCameraOpen(true);
                        }}
                        className="px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all duration-200"
                        style={{
                          background: "hsl(var(--primary) / 0.15)",
                          border: "1px solid hsl(var(--primary) / 0.35)",
                          color: "hsl(var(--primary))",
                          boxShadow: "0 2px 12px hsl(var(--primary) / 0.15)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "hsl(var(--primary) / 0.25)";
                          e.currentTarget.style.transform = "scale(1.03)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "hsl(var(--primary) / 0.15)";
                          e.currentTarget.style.transform = "scale(1)";
                        }}
                      >
                        <Camera size={16} />
                        Take Photo with Camera
                      </button>

                      {/* Hidden native input for direct mobile camera capture fallback */}
                      <input
                        ref={cameraInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handleFileSelect(e.target.files[0], showError);
                          }
                        }}
                      />
                    </div>

                    {/* Tips */}
                    <div
                      className="flex items-center gap-4 mt-2"
                      style={{ color: "hsl(var(--muted-foreground))", fontSize: "11px", opacity: 0.7 }}
                    >
                      <span>✦ Use plain or lined paper</span>
                      <span>·</span>
                      <span>✦ Natural handwriting</span>
                      <span>·</span>
                      <span>✦ Clear lighting</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Progress bar */}
              {isAnalyzing && (
                <div
                  className="flex flex-col gap-3 p-5 rounded-2xl"
                  style={{
                    background: "hsl(var(--card) / 0.5)",
                    border: "1px solid hsl(var(--border))",
                    backdropFilter: "blur(12px)",
                  }}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: "hsl(var(--primary))" }} />
                      <p className="text-sm font-medium" style={{ color: "hsl(var(--primary))" }}>
                        {currentStep?.label ?? "Processing..."}
                      </p>
                    </div>
                    <p className="text-xs font-mono" style={{ color: "hsl(var(--muted-foreground))" }}>
                      {progressPercent}%
                    </p>
                  </div>
                  <div
                    className="w-full h-1.5 rounded-full overflow-hidden"
                    style={{ background: "hsl(var(--border))" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${progressPercent}%`,
                        background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))",
                        boxShadow: "0 0 12px hsl(var(--primary) / 0.5)",
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Analyze button */}
              <button
                onClick={() => handleAnalyze(showError)}
                disabled={!selectedFile || isAnalyzing}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-sm font-semibold transition-all duration-200"
                style={
                  !selectedFile || isAnalyzing
                    ? {
                        background: "hsl(var(--card) / 0.4)",
                        border: "1px solid hsl(var(--border))",
                        color: "hsl(var(--muted-foreground) / 0.4)",
                        cursor: "not-allowed",
                      }
                    : {
                        background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))",
                        border: "none",
                        color: "hsl(var(--primary-foreground))",
                        cursor: "pointer",
                        boxShadow: "0 4px 24px hsl(var(--primary) / 0.35)",
                      }
                }
                onMouseEnter={(e) => {
                  if (selectedFile && !isAnalyzing) {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 8px 32px hsl(var(--primary) / 0.5)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = selectedFile && !isAnalyzing
                    ? "0 4px 24px hsl(var(--primary) / 0.35)"
                    : "none";
                }}
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Analyzing your handwriting...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} strokeWidth={2} />
                    Analyze Handwriting
                  </>
                )}
              </button>
            </div>
          )}

          {/* Report */}
          {report && (
            <div className="flex flex-col gap-4">
              <ReportCard
                personalityTraits={report.personality_traits}
                disclaimer={report.disclaimer}
              />
              <button
                onClick={clearReport}
                className="w-full py-3.5 rounded-xl text-sm font-medium transition-all duration-200"
                style={{
                  background: "hsl(var(--card) / 0.4)",
                  border: "1px solid hsl(var(--border))",
                  color: "hsl(var(--muted-foreground))",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "hsl(var(--primary) / 0.08)";
                  e.currentTarget.style.borderColor = "hsl(var(--primary) / 0.3)";
                  e.currentTarget.style.color = "hsl(var(--primary))";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "hsl(var(--card) / 0.4)";
                  e.currentTarget.style.borderColor = "hsl(var(--border))";
                  e.currentTarget.style.color = "hsl(var(--muted-foreground))";
                }}
              >
                ← Analyze Another Sample
              </button>
            </div>
          )}
        </main>

        {/* Camera Capture Modal */}
        <CameraModal
          isOpen={isCameraOpen}
          onClose={() => setIsCameraOpen(false)}
          onCapture={(file) => handleFileSelect(file, showError)}
        />
      </div>
    </>
  );
};

export default HomePage;