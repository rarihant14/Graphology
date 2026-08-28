import { useState, useRef, useEffect, useCallback } from "react";
import { Camera, RefreshCw, X, Check, RotateCcw, AlertCircle } from "lucide-react";

/**
 * CameraModal — Full-featured live camera photo capture modal.
 *
 * Features:
 * - Live webcam stream with automatic camera selection (rear camera on mobile fallback to user)
 * - Support for multi-camera toggling (front/back camera switch)
 * - Visual framing overlay to assist handwriting alignment
 * - High quality snapshot capture to JPEG File
 * - Snapshot preview with Retake / Confirm actions
 * - Camera device permission handling & clean resource teardown
 */
const CameraModal = ({ isOpen, onClose, onCapture }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [capturedFile, setCapturedFile] = useState(null);
  const [error, setError] = useState(null);
  const [facingMode, setFacingMode] = useState("environment"); // preference: rear camera
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [isLoadingCamera, setIsLoadingCamera] = useState(false);

  // Check if multiple cameras are available
  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;

    navigator.mediaDevices.enumerateDevices()
      .then((devices) => {
        const videoDevices = devices.filter((d) => d.kind === "videoinput");
        setHasMultipleCameras(videoDevices.length > 1);
      })
      .catch(() => {});
  }, []);

  // Stop camera tracks cleanly
  const stopStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  // Start live stream
  const startCamera = useCallback(async (mode) => {
    setIsLoadingCamera(true);
    setError(null);

    // Stop current stream if running
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }

    try {
      let mediaStream = null;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
      } catch (firstErr) {
        // Fallback to basic video request if preferred mode fails
        console.warn("Preferred facingMode failed, trying generic video constraints", firstErr);
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setError("Unable to access camera. Please allow camera permissions or check device connections.");
    } finally {
      setIsLoadingCamera(false);
    }
  }, [stream]);

  // Open camera when modal opens, close on exit
  useEffect(() => {
    if (isOpen && !capturedImage) {
      startCamera(facingMode);
    }

    return () => {
      if (!isOpen) {
        stopStream();
      }
    };
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup stream when modal closes
  const handleClose = () => {
    stopStream();
    setCapturedImage(null);
    setCapturedFile(null);
    setError(null);
    onClose();
  };

  // Toggle camera front/back
  const toggleCamera = () => {
    const nextMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Take photo snapshot
  const takeSnapshot = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("Failed to capture image snapshot.");
          return;
        }
        const file = new File([blob], `handwriting-photo-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        const imageUrl = URL.createObjectURL(blob);

        setCapturedFile(file);
        setCapturedImage(imageUrl);

        // Turn off stream while showing preview
        stopStream();
      },
      "image/jpeg",
      0.95
    );
  };

  // Retake photo
  const handleRetake = () => {
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage);
    }
    setCapturedImage(null);
    setCapturedFile(null);
    startCamera(facingMode);
  };

  // Confirm photo choice
  const handleUsePhoto = () => {
    if (capturedFile) {
      onCapture(capturedFile);
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-2xl rounded-3xl overflow-hidden flex flex-col"
        style={{
          background: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
        }}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <Camera size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-base sm:text-lg leading-tight">
                {capturedImage ? "Photo Preview" : "Take Handwriting Photo"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {capturedImage
                  ? "Verify clarity before analyzing"
                  : "Position handwriting sample clearly in the box"}
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Camera Viewport / Preview */}
        <div className="relative w-full aspect-[4/3] bg-black flex items-center justify-center overflow-hidden">
          {/* Error Message Display */}
          {error ? (
            <div className="p-6 text-center max-w-md flex flex-col items-center gap-3">
              <div className="p-3 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                <AlertCircle size={32} />
              </div>
              <p className="text-sm text-red-300 font-medium">{error}</p>
              <button
                onClick={() => startCamera(facingMode)}
                className="mt-2 text-xs px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity"
              >
                <RefreshCw size={14} /> Try Again
              </button>
            </div>
          ) : capturedImage ? (
            /* Snapshot Preview */
            <img
              src={capturedImage}
              alt="Captured preview"
              className="w-full h-full object-contain"
            />
          ) : (
            /* Live Video Feed */
            <>
              {isLoadingCamera && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-2 text-primary">
                    <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <span className="text-xs font-medium text-white/80">Opening camera...</span>
                  </div>
                </div>
              )}

              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Handwriting framing guide box */}
              <div className="absolute inset-6 sm:inset-10 border-2 border-dashed border-primary/60 rounded-2xl pointer-events-none flex flex-col justify-between p-4 shadow-[0_0_40px_rgba(0,0,0,0.5)_inset]">
                <div className="flex justify-between">
                  <div className="w-4 h-4 border-t-2 border-l-2 border-primary" />
                  <div className="w-4 h-4 border-t-2 border-r-2 border-primary" />
                </div>
                <p className="text-center text-xs text-white/80 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full self-center border border-white/10">
                  Align 3-4 lines of handwriting in good light
                </p>
                <div className="flex justify-between">
                  <div className="w-4 h-4 border-b-2 border-l-2 border-primary" />
                  <div className="w-4 h-4 border-b-2 border-r-2 border-primary" />
                </div>
              </div>

              {/* Flip camera button */}
              {hasMultipleCameras && (
                <button
                  onClick={toggleCamera}
                  title="Switch Camera"
                  className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/20 hover:bg-black/80 transition-all"
                >
                  <RefreshCw size={18} />
                </button>
              )}
            </>
          )}

          {/* Hidden Canvas element for frame grabbing */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Modal Controls Footer */}
        <div className="p-4 sm:p-6 bg-card border-t border-border/60 flex items-center justify-between">
          {capturedImage ? (
            /* Controls after photo captured */
            <div className="flex items-center gap-3 w-full">
              <button
                onClick={handleRetake}
                className="flex-1 py-3 px-4 rounded-xl border border-border text-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-white/5 transition-colors"
              >
                <RotateCcw size={16} /> Retake
              </button>
              <button
                onClick={handleUsePhoto}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:opacity-95 transition-all"
              >
                <Check size={16} /> Use This Photo
              </button>
            </div>
          ) : (
            /* Controls for live stream */
            <div className="flex items-center justify-between w-full">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>

              <button
                onClick={takeSnapshot}
                disabled={isLoadingCamera || !!error}
                className="group relative flex items-center justify-center"
              >
                {/* Outer ring */}
                <div className="w-16 h-16 rounded-full border-2 border-primary flex items-center justify-center transition-transform group-hover:scale-105 group-active:scale-95">
                  {/* Inner shutter button */}
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/40">
                    <Camera size={22} className="text-primary-foreground" />
                  </div>
                </div>
              </button>

              <div className="w-12 sm:w-16" /> {/* spacer for alignment */}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CameraModal;
