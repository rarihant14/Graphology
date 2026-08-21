/**
 * useAnalysis.js — Custom React hook for handwriting analysis logic.
 *
 * Manages the full lifecycle of an analysis request:
 *  1. File selection + preview URL creation
 *  2. Progress step simulation (extracting → applying_rules → generating → complete)
 *  3. API call via analyzeHandwriting()
 *  4. Report state on success, error callback on failure
 *  5. State reset via clearReport()
 */

import { useState, useRef, useCallback } from "react";
import { analyzeHandwriting } from "../api/client";

// ---------------------------------------------------------------------------
// Progress step timing (ms) — simulates pipeline stages visually
// These are approximate — actual API call may finish before all steps complete
// ---------------------------------------------------------------------------

const STEP_TIMINGS = {
  extracting:     2000,   // show "Extracting features..." for 2s
  applying_rules: 4000,   // show "Applying rules..." for 4s
  generating:     6000,   // show "Generating report..." for 6s
};

// ---------------------------------------------------------------------------
// useAnalysis hook
// ---------------------------------------------------------------------------

export const useAnalysis = () => {
  const [selectedFile,  setSelectedFile]  = useState(null);
  const [previewUrl,    setPreviewUrl]    = useState(null);
  const [isAnalyzing,   setIsAnalyzing]   = useState(false);
  const [report,        setReport]        = useState(null);
  const [error,         setError]         = useState(null);
  const [progressStep,  setProgressStep]  = useState(null);

  // Refs to track and cancel progress timers if API finishes early or fails
  const timersRef = useRef([]);

  // -------------------------------------------------------------------------
  // clearTimers — cancel all pending progress step timeouts
  // -------------------------------------------------------------------------

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  // -------------------------------------------------------------------------
  // startProgressSimulation — cycles through steps with delays
  // -------------------------------------------------------------------------

  const startProgressSimulation = useCallback(() => {
    setProgressStep("extracting");

    const t1 = setTimeout(() => {
      setProgressStep("applying_rules");
    }, STEP_TIMINGS.extracting);

    const t2 = setTimeout(() => {
      setProgressStep("generating");
    }, STEP_TIMINGS.extracting + STEP_TIMINGS.applying_rules);

    timersRef.current = [t1, t2];
  }, []);

  // -------------------------------------------------------------------------
  // handleFileSelect — store file and create object URL for preview
  // -------------------------------------------------------------------------

  const handleFileSelect = useCallback((file) => {
    if (!file) return;

    // Revoke previous preview URL to avoid memory leaks
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setReport(null);
    setError(null);
    setProgressStep(null);
  }, [previewUrl]);

  // -------------------------------------------------------------------------
  // handleAnalyze — build FormData, call API, manage all states
  // -------------------------------------------------------------------------

  const handleAnalyze = useCallback(async (onError) => {
    if (!selectedFile || isAnalyzing) return;

    setIsAnalyzing(true);
    setReport(null);
    setError(null);

    // Start visual progress simulation
    startProgressSimulation();

    try {
      // Build FormData — field name must match FastAPI's expected "file" param
      const formData = new FormData();
      formData.append("file", selectedFile, selectedFile.name);

      // Make the API call — this is the single backend request
      const response = await analyzeHandwriting(formData);
      const data = response.data;

      // Cancel any remaining progress timers
      clearTimers();

      // Show "complete" step briefly before showing report
      setProgressStep("complete");
      await new Promise((resolve) => setTimeout(resolve, 600));

      setReport(data);

    } catch (err) {
      clearTimers();
      setProgressStep(null);

      const message =
        err?.response?.data?.detail ||
        err?.message ||
        "Analysis failed. Please try again.";

      setError(message);

      // Call the optional error callback (used by HomePage to show toast)
      if (typeof onError === "function") {
        onError(message);
      }

    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedFile, isAnalyzing, startProgressSimulation, clearTimers]);

  // -------------------------------------------------------------------------
  // clearReport — reset all state back to initial
  // -------------------------------------------------------------------------

  const clearReport = useCallback(() => {
    clearTimers();

    // Revoke preview URL to free memory
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(null);
    setPreviewUrl(null);
    setIsAnalyzing(false);
    setReport(null);
    setError(null);
    setProgressStep(null);
  }, [previewUrl, clearTimers]);

  // -------------------------------------------------------------------------
  // Return all state and handlers
  // -------------------------------------------------------------------------

  return {
    // State
    selectedFile,
    previewUrl,
    isAnalyzing,
    report,
    error,
    progressStep,

    // Handlers
    handleFileSelect,
    handleAnalyze,
    clearReport,
  };
};

export default useAnalysis;