import { useState } from "react";
import { useLocation } from "wouter";
import { X, Play, Pause, ChevronUp } from "lucide-react";

/**
 * Workspace Video - Simplex Editor
 * Design: Neon Cyberpunk
 * 
 * Layout: Mobile-first vertical stack
 * - Top bar: Back button
 * - Center: Video preview player
 * - Middle: Timeline (multi-track horizontal)
 * - Bottom: Navigation tabs (Edit Video, Poles AI)
 * 
 * TODO: Integrate OpenReel Video SDK
 */
export default function WorkspaceVideo() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"edit" | "ai">("edit");
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const videoDuration = 120; // seconds

  const handleBack = () => {
    setLocation("/");
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 py-4">
      {/* Mobile-first container */}
      <div className="w-full max-w-md h-screen max-h-screen flex flex-col bg-black">
        
        {/* Top Bar - Controls */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-900 rounded-sm transition-colors"
            title="Back"
          >
            <X size={20} className="text-cyan-400" />
          </button>
          <h2 className="text-white font-semibold text-sm">Video Editor</h2>
          <div className="w-8" /> {/* Spacer for alignment */}
        </div>

        {/* Video Preview Player */}
        <div className="bg-gray-950 border border-gray-800 m-4 rounded-sm aspect-video flex items-center justify-center overflow-hidden">
          <div className="text-center">
            <div className="text-gray-500 text-sm mb-2">
              Video Preview
            </div>
            <div className="text-gray-600 text-xs">
              (OpenReel SDK akan diintegrasikan di sini)
            </div>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="px-4 py-3 bg-gray-950 border-y border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={togglePlayPause}
              className="p-2 rounded-sm bg-cyan-400 text-black hover:bg-cyan-300 transition-colors"
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
            </button>
            <div className="flex-1">
              <input
                type="range"
                min="0"
                max={videoDuration}
                value={currentTime}
                onChange={(e) => setCurrentTime(Number(e.target.value))}
                className="w-full h-1 bg-gray-800 rounded-full appearance-none cursor-pointer accent-cyan-400"
              />
            </div>
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, "0")}
            </span>
          </div>
        </div>

        {/* Timeline Placeholder */}
        <div className="bg-gray-950 border-y border-gray-800 px-4 py-3 h-20 overflow-x-auto">
          <div className="text-center text-gray-600 text-xs py-6">
            Multi-track Timeline (OpenReel SDK)
          </div>
        </div>

        {/* Bottom Navigation Bar */}
        <div className="border-t border-gray-800 bg-gray-950 flex-1 flex flex-col">
          {/* Tab Buttons */}
          <div className="flex items-center gap-0">
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
