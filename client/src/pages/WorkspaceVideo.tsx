import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { X, ChevronUp } from "lucide-react";

/**
 * Workspace Video - Simplex Editor
 * Design: Neon Cyberpunk Dark Mode Mobile
 * 
 * Menggunakan: HTML5 <video> asli yang fungsional
 * - Upload video dari galeri ponsel
 * - Kontrol Potong, Volume, Kecepatan
 * - Dark Mode Mobile UI
 */
export default function WorkspaceVideo() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"edit" | "ai">("edit");
  const [showAIPanel, setShowAIPanel] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [videoUrl, setVideoUrl] = useState(
    "https://commondatastorage.googleapis.com/gtv-videos-library/sample/big_buck_bunny.mp4"
  );
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      setStartTime(0);
      setEndTime(0);
    }
  };

  const handleBack = () => {
    setLocation("/");
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const duration = videoRef.current.duration;
      setVideoDuration(duration);
      setEndTime(duration);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setVolume(value);
    if (videoRef.current) {
      videoRef.current.volume = value;
    }
  };

  const handlePlaybackRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setPlaybackRate(value);
    if (videoRef.current) {
      videoRef.current.playbackRate = value;
    }
  };

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setStartTime(value);
    if (videoRef.current) {
      videoRef.current.currentTime = value;
    }
  };

  const handleEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setEndTime(value);
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-0 py-0">
      {/* Mobile-first container - Full screen */}
      <div className="w-full max-w-md h-screen max-h-screen flex flex-col bg-black overflow-hidden">
        
        {/* Top Bar - Controls */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-black flex-shrink-0">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-900 rounded-sm transition-colors"
            title="Back"
          >
            <X size={20} className="text-cyan-400" />
          </button>
          <h2 className="text-white font-semibold text-sm">Video Editor</h2>
          
          {/* Upload File Button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 hover:bg-gray-900 rounded-sm transition-colors text-cyan-400 font-bold text-lg"
            title="Upload Video"
          >
            📁
          </button>
        </div>

        {/* Video Player - HTML5 Video Asli */}
        <div className="flex-1 bg-gray-950 border border-gray-800 m-4 rounded-sm overflow-hidden flex items-center justify-center flex-shrink-0">
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            onLoadedMetadata={handleLoadedMetadata}
            className="w-full h-full object-contain bg-black"
            style={{ maxHeight: "300px" }}
          />
        </div>

        {/* Bottom Navigation Bar */}
        <div className="border-t border-gray-800 bg-black flex-1 flex flex-col overflow-hidden">
          {/* Tab Buttons */}
          <div className="flex items-center gap-0 flex-shrink-0">
            <button
              onClick={() => {
                setActiveTab("edit");
                setShowAIPanel(false);
              }}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-all border-b-2 ${
                activeTab === "edit"
                  ? "border-cyan-400 text-cyan-400"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
              style={
                activeTab === "edit"
                  ? { boxShadow: "0 -2px 10px rgba(0, 217, 255, 0.2)" }
                  : {}
              }
            >
              ✂️ Edit Video
            </button>
            <button
              onClick={() => {
                setActiveTab("ai");
                setShowAIPanel(!showAIPanel);
              }}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-all border-b-2 ${
                activeTab === "ai"
                  ? "border-magenta-400 text-magenta-400"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
              style={
                activeTab === "ai"
                  ? { boxShadow: "0 -2px 10px rgba(255, 0, 255, 0.2)" }
                  : {}
              }
            >
              ✨ Poles AI
            </button>
          </div>

          {/* Edit Video Panel */}
          {activeTab === "edit" && (
            <div className="bg-gray-900 border-t border-gray-800 p-4 overflow-y-auto flex-1">
              <h3 className="text-white font-semibold text-sm mb-4">Video Controls</h3>

              {/* Volume Control */}
              <div className="mb-5">
                <label className="text-gray-300 text-xs font-medium block mb-2">
                  Volume: {Math.round(volume * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-full h-2 bg-gray-800 rounded-full appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              {/* Playback Rate Control */}
              <div className="mb-5">
                <label className="text-gray-300 text-xs font-medium block mb-2">
                  Playback Speed: {playbackRate.toFixed(1)}x
                </label>
                <div className="flex gap-2">
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => {
                        setPlaybackRate(rate);
                        if (videoRef.current) {
                          videoRef.current.playbackRate = rate;
                        }
                      }}
                      className={`flex-1 py-2 px-2 rounded-sm text-xs font-medium transition-all ${
                        playbackRate === rate
                          ? "bg-cyan-400 text-black"
                          : "border border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:bg-opacity-10"
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Trim/Potong Control */}
              <div className="mb-5">
                <label className="text-gray-300 text-xs font-medium block mb-2">
                  Trim Video (Start: {formatTime(startTime)} - End: {formatTime(endTime)})
                </label>
                <div className="space-y-2">
                  <div>
                    <label className="text-gray-400 text-xs block mb-1">Start Time</label>
                    <input
                      type="range"
                      min="0"
                      max={videoDuration}
                      step="0.1"
                      value={startTime}
                      onChange={handleStartTimeChange}
                      className="w-full h-2 bg-gray-800 rounded-full appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs block mb-1">End Time</label>
                    <input
                      type="range"
                      min="0"
                      max={videoDuration}
                      step="0.1"
                      value={endTime}
                      onChange={handleEndTimeChange}
                      className="w-full h-2 bg-gray-800 rounded-full appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="text-gray-400 text-xs">
                <p>Video Duration: {formatTime(videoDuration)}</p>
                <p>Trim Duration: {formatTime(endTime - startTime)}</p>
              </div>
            </div>
          )}

          {/* AI Panel - Bottom Sheet */}
          {showAIPanel && activeTab === "ai" && (
            <div className="bg-gray-900 border-t border-gray-800 p-4 flex-1 overflow-y-auto animate-in slide-in-from-bottom">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-sm">AI Enhancement</h3>
                <button
                  onClick={() => setShowAIPanel(false)}
                  className="p-1 hover:bg-gray-800 rounded-sm"
                >
                  <ChevronUp size={16} className="text-gray-400" />
                </button>
              </div>

              {/* AI Options */}
              <div className="flex flex-col gap-3">
                <button
                  className="py-3 px-4 rounded-sm border border-cyan-400 text-white text-sm font-medium transition-all hover:bg-cyan-400 hover:bg-opacity-10"
                  style={{ boxShadow: "0 0 8px rgba(0, 217, 255, 0.2)" }}
                >
                  HD Enhancement
                </button>
                <button
                  className="py-3 px-4 rounded-sm border border-cyan-400 text-white text-sm font-medium transition-all hover:bg-cyan-400 hover:bg-opacity-10"
                  style={{ boxShadow: "0 0 8px rgba(0, 217, 255, 0.2)" }}
                >
                  Portrait Face Restore
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
