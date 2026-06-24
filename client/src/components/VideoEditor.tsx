import { useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";

interface VideoEditorProps {
  onSave?: (data: any) => void;
}

/**
 * Video Editor Component - Real Implementation
 * HTML5 Video + Canvas Timeline
 * - Real video playback
 * - Interactive timeline scrubbing
 * - Play/Pause controls
 * - Volume control
 */
export default function VideoEditor({ onSave }: VideoEditorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  // Sample video dari internet
  const sampleVideoUrl =
    "https://commondatastorage.googleapis.com/gtv-videos-library/sample/big_buck_bunny.mp4";

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      drawTimeline();
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      drawTimeline();
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, []);

  const drawTimeline = () => {
    const canvas = canvasRef.current;
    if (!canvas || !videoRef.current) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const videoDuration = videoRef.current.duration;
    const currentPos = (currentTime / videoDuration) * width;

    // Background
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = "#333333";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const x = (i / 10) * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Timeline track
    ctx.fillStyle = "#00D9FF";
    ctx.fillRect(0, height / 2 - 2, currentPos, 4);

    // Current position indicator
    ctx.fillStyle = "#FF00FF";
    ctx.fillRect(currentPos - 2, 0, 4, height);

    // Time markers
    ctx.fillStyle = "#B0B0B0";
    ctx.font = "10px 'Inter', sans-serif";
    for (let i = 0; i <= 10; i++) {
      const x = (i / 10) * width;
      const time = (i / 10) * videoDuration;
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      const timeStr = `${minutes}:${String(seconds).padStart(2, "0")}`;
      ctx.fillText(timeStr, x - 15, height - 5);
    }
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !videoRef.current) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / canvas.width;
    const newTime = percentage * duration;

    videoRef.current.currentTime = Math.max(0, Math.min(newTime, duration));
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  };

  return (
    <div className="w-full h-full flex flex-col bg-black">
      {/* Video Preview */}
      <div className="flex-1 bg-gray-950 border border-gray-800 m-4 rounded-sm overflow-hidden flex items-center justify-center">
        <video
          ref={videoRef}
          src={sampleVideoUrl}
          className="w-full h-full object-contain"
          crossOrigin="anonymous"
        />
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
              max={duration || 0}
              value={currentTime}
              onChange={(e) => {
                const newTime = parseFloat(e.target.value);
                if (videoRef.current) {
                  videoRef.current.currentTime = newTime;
                }
              }}
              className="w-full h-1 bg-gray-800 rounded-full appearance-none cursor-pointer accent-cyan-400"
            />
          </div>

          <span className="text-xs text-gray-400 whitespace-nowrap">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <button
            onClick={toggleMute}
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
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={handleVolumeChange}
            className="w-16 h-1 bg-gray-800 rounded-full appearance-none cursor-pointer accent-cyan-400"
          />
        </div>
      </div>

      {/* Timeline Canvas */}
      <div className="bg-gray-950 border-y border-gray-800 px-4 py-2 overflow-x-auto">
        <canvas
          ref={canvasRef}
          width={400}
          height={60}
          onClick={handleTimelineClick}
          className="w-full h-16 bg-gray-900 rounded-sm cursor-pointer border border-gray-800"
          style={{ minWidth: "400px" }}
        />
        <div className="text-xs text-gray-500 mt-1">Click timeline to seek</div>
      </div>
    </div>
  );
}
