import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { X, Play, Pause, Volume2, VolumeX, ChevronUp } from "lucide-react";
import ReactPlayer from "react-player";

/**
 * Workspace Video - Simplex Editor
 * Design: Neon Cyberpunk
 * 
 * Menggunakan SDK ASLI: React Player + HTML5 Video
 * - Real video player dengan controls
 * - File upload input untuk video custom
 * - Timeline dengan scrubbing
 */
export default function WorkspaceVideo() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"edit" | "ai">("edit");
  const [showAIPanel, setShowAIPanel] = useState(false);
  const playerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [videoUrl, setVideoUrl] = useState(
    "https://commondatastorage.googleapis.com/gtv-videos-library/sample/big_buck_bunny.mp4"
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [played, setPlayed] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
    }
  };

  const handleBack = () => {
    setLocation("/");
  };

  const formatTime = (seconds: number) => {
    const date = new Date(seconds * 1000);
    const hh = date.getUTCHours();
    const mm = date.getUTCMinutes();
    const ss = ("0" + date.getUTCSeconds()).slice(-2);
    if (hh) {
      return `${hh}:${("0" + mm).slice(-2)}:${ss}`;
    }
    return `${mm}:${ss}`;
  };

  const Player = ReactPlayer as any;

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
            className="p-2 hover:bg-gray-900 rounded-sm transition-colors"
            title="Upload Video"
          >
            <Play size={20} className="text-cyan-400 rotate-180" />
          </button>
        </div>

        {/* Video Player - REACT PLAYER SDK */}
        <div className="flex-1 bg-gray-950 border border-gray-800 m-4 rounded-sm overflow-hidden flex items-center justify-center">
          <Player
            ref={playerRef}
            url={videoUrl}
            playing={isPlaying}
            controls={false}
            width="100%"
            height="100%"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onDuration={setDuration}
            onProgress={(state: any) => setPlayed(state.played)}
            onError={(e: any) => console.error("Video error:", e)}
            progressInterval={100}
            playbackRate={1}
            volume={volume}
            muted={isMuted}
          />
        </div>

        {/* Playback Controls */}
        <div className="px-4 py-3 bg-gray-950 border-y border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 rounded-sm bg-cyan-400 text-black hover:bg-cyan-300 transition-colors"
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
            </button>

            <div className="flex-1">
              <input
                type="range"
                min={0}
                max={0.999999}
                step="any"
                value={played}
                onChange={(e) => {
                  const newPlayed = parseFloat(e.target.value);
                  setPlayed(newPlayed);
                  playerRef.current?.seekTo(newPlayed);
                }}
                className="w-full h-1 bg-gray-800 rounded-full appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            <span className="text-xs text-gray-400 whitespace-nowrap">
              {formatTime(played * duration)} / {formatTime(duration)}
            </span>

            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 hover:bg-gray-800 rounded-sm transition-colors"
            >
              {isMuted ? (
                <VolumeX size={18} className="text-gray-400" />
              ) : (
                <Volume2 size={18} className="text-gray-400" />
              )}
            </button>

            <input
              type="range"
              min={0}
              max={1}
              step="0.1"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-16 h-1 bg-gray-800 rounded-full appearance-none cursor-pointer accent-cyan-400"
            />
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
