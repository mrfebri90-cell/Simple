import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { X, ChevronUp, Download, Scissors, Gauge, Volume2, VolumeX, Contrast, Play, Pause, Loader2 } from "lucide-react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

/**
 * Workspace Video - Simplex Editor
 * SDK: FFmpeg.wasm (@ffmpeg/ffmpeg)
 * Features: Trim, Speed, Brightness, Contrast, Mute, Export
 */

type EditTool = "trim" | "speed" | "filter" | "audio";

const FFMPEG_CORE_BASE = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";

export default function WorkspaceVideo() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"edit" | "ai">("edit");
  const [activeTool, setActiveTool] = useState<EditTool>("trim");
  const [showAIPanel, setShowAIPanel] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Edit params
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);

  // State
  const [ffmpegReady, setFfmpegReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMsg, setProcessingMsg] = useState("");
  const [error, setError] = useState("");
  const [outputUrl, setOutputUrl] = useState<string>("");

  // Load FFmpeg.wasm on mount
  useEffect(() => {
    const loadFFmpeg = async () => {
      try {
        setIsLoading(true);
        const ffmpeg = new FFmpeg();
        ffmpegRef.current = ffmpeg;

        ffmpeg.on("log", ({ message }) => {
          console.log("[FFmpeg]", message);
        });

        ffmpeg.on("progress", ({ progress }) => {
          setProcessingMsg(`Memproses... ${Math.round(progress * 100)}%`);
        });

        await ffmpeg.load({
          coreURL: await toBlobURL(`${FFMPEG_CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
          wasmURL: await toBlobURL(`${FFMPEG_CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
        });

        setFfmpegReady(true);
      } catch (e) {
        console.error("FFmpeg load error:", e);
        setError("Gagal memuat video SDK. Periksa koneksi internet Anda.");
      } finally {
        setIsLoading(false);
      }
    };

    loadFFmpeg();

    return () => {
      ffmpegRef.current?.terminate();
    };
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setError("Pilih file video yang valid (MP4, MOV, WebM, dll).");
      return;
    }

    setError("");
    setOutputUrl("");
    if (videoUrl) URL.revokeObjectURL(videoUrl);

    const url = URL.createObjectURL(file);
    setVideoFile(file);
    setVideoUrl(url);
    setStartTime(0);
    setEndTime(0);
    setPlaybackRate(1);
    setBrightness(0);
    setContrast(0);
    setIsMuted(false);
    setVolume(1);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      setVideoDuration(dur);
      setEndTime(dur);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      if (videoRef.current.currentTime >= endTime) {
        videoRef.current.pause();
        videoRef.current.currentTime = startTime;
        setIsPlaying(false);
      }
    }
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (isPlaying) {
      v.pause();
      setIsPlaying(false);
    } else {
      v.currentTime = startTime;
      v.play();
      setIsPlaying(true);
    }
  };

  // Apply preview filters via CSS
  const videoFilter = `brightness(${1 + brightness / 100}) contrast(${1 + contrast / 100})`;

  // Apply volume & speed in real-time
  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.volume = isMuted ? 0 : volume;
    videoRef.current.playbackRate = playbackRate;
  }, [volume, isMuted, playbackRate]);

  const handleExport = useCallback(async () => {
    if (!ffmpegRef.current || !videoFile || !ffmpegReady) return;

    setIsProcessing(true);
    setProcessingMsg("Menyiapkan file...");
    setError("");
    setOutputUrl("");

    try {
      const ffmpeg = ffmpegRef.current;
      const inputName = "input." + (videoFile.name.split(".").pop() || "mp4");
      const outputName = "output.mp4";

      // Write input file
      await ffmpeg.writeFile(inputName, await fetchFile(videoFile));

      // Build filter chain
      const filters: string[] = [];
      if (brightness !== 0 || contrast !== 0) {
        const eq = `eq=brightness=${(brightness / 100).toFixed(2)}:contrast=${(1 + contrast / 100).toFixed(2)}`;
        filters.push(eq);
      }

      const videoFilterArg = filters.length > 0 ? ["-vf", filters.join(",")] : [];

      // Speed: setpts and atempo
      const speedArgs: string[] = [];
      if (playbackRate !== 1) {
        const pts = (1 / playbackRate).toFixed(4);
        const audioTempo = Math.max(0.5, Math.min(2, playbackRate)).toFixed(4);
        speedArgs.push("-filter_complex", `[0:v]setpts=${pts}*PTS[v];[0:a]atempo=${audioTempo}[a]`, "-map", "[v]", "-map", "[a]");
      }

      // Audio
      const audioArgs = isMuted ? ["-an"] : [];

      // Trim
      const trimArgs = [
        "-ss", startTime.toFixed(2),
        "-to", endTime.toFixed(2),
      ];

      const finalArgs = [
        "-i", inputName,
        ...trimArgs,
        ...videoFilterArg,
        ...(speedArgs.length > 0 ? speedArgs : []),
        ...audioArgs,
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-c:a", "aac",
        "-movflags", "+faststart",
        outputName,
      ];

      setProcessingMsg("Mengekspor video...");
      await ffmpeg.exec(finalArgs);

      const data = await ffmpeg.readFile(outputName);
      const blob = new Blob([data], { type: "video/mp4" });
      const url = URL.createObjectURL(blob);
      setOutputUrl(url);

      // Cleanup
      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(outputName);

      setProcessingMsg("Selesai!");
    } catch (e: any) {
      console.error("Export error:", e);
      setError("Ekspor gagal: " + (e?.message || "Error tidak diketahui"));
    } finally {
      setIsProcessing(false);
    }
  }, [ffmpegReady, videoFile, startTime, endTime, playbackRate, brightness, contrast, isMuted, volume]);

  const handleBack = () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    setLocation("/");
  };

  const formatTime = (s: number) => {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const tools: { id: EditTool; icon: React.ReactNode; label: string }[] = [
    { id: "trim", icon: <Scissors size={16} />, label: "Potong" },
    { id: "speed", icon: <Gauge size={16} />, label: "Kecepatan" },
    { id: "filter", icon: <Contrast size={16} />, label: "Filter" },
    { id: "audio", icon: isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />, label: "Audio" },
  ];

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center">
      <div className="w-full max-w-md h-screen max-h-screen flex flex-col bg-black overflow-hidden">

        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-black flex-shrink-0">
          <button onClick={handleBack} className="p-2 hover:bg-gray-900 rounded-sm transition-colors" title="Kembali">
            <X size={20} className="text-cyan-400" />
          </button>
          <div className="flex items-center gap-2">
            <h2 className="text-white font-semibold text-sm">Video Editor</h2>
            {isLoading && <Loader2 size={14} className="text-cyan-400 animate-spin" />}
            {ffmpegReady && !isLoading && (
              <span className="text-xs text-green-400 px-1.5 py-0.5 border border-green-400 border-opacity-50 rounded-sm">SDK Ready</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileUpload} className="hidden" />
            <button
              onClick={() => { setError(""); fileInputRef.current?.click(); }}
              className="p-2 hover:bg-gray-900 rounded-sm transition-colors text-cyan-400 text-lg"
              title="Upload Video"
            >
              📁
            </button>
          </div>
        </div>

        {/* Video Preview */}
        <div className="flex-shrink-0 bg-black border-b border-gray-800 relative">
          {videoUrl ? (
            <div className="relative">
              <video
                ref={videoRef}
                src={videoUrl}
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                onError={() => setError("Gagal memuat video.")}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                className="w-full object-contain bg-black"
                style={{ maxHeight: "240px", filter: videoFilter }}
              />
              {/* Play/Pause Overlay */}
              <button
                onClick={togglePlay}
                className="absolute bottom-3 right-3 p-2 bg-black bg-opacity-60 rounded-full border border-cyan-400 border-opacity-60 text-cyan-400 hover:bg-opacity-80 transition-all"
                style={{ boxShadow: "0 0 8px rgba(0,217,255,0.3)" }}
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              </button>
              {/* Timeline indicator */}
              <div className="h-1 bg-gray-800 mx-4 mb-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-400 transition-all"
                  style={{ width: videoDuration > 0 ? `${(currentTime / videoDuration) * 100}%` : "0%" }}
                />
              </div>
              <div className="flex justify-between px-4 pb-2 text-gray-500 text-xs">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(videoDuration)}</span>
              </div>
            </div>
          ) : (
            <div
              className="flex flex-col items-center justify-center gap-3 py-12 cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              {isLoading ? (
                <>
                  <Loader2 size={32} className="text-cyan-400 animate-spin" />
                  <p className="text-gray-400 text-xs">Memuat FFmpeg SDK...</p>
                </>
              ) : (
                <>
                  <div className="text-5xl">📹</div>
                  <p className="text-gray-400 text-sm">Tap untuk pilih video</p>
                  <p className="text-gray-600 text-xs">MP4, MOV, WebM, AVI didukung</p>
                </>
              )}
            </div>
          )}

          {/* Error overlay */}
          {error && (
            <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4">
              <div className="flex flex-col items-center gap-2 text-center">
                <span className="text-red-400 text-sm">{error}</span>
                <button onClick={() => setError("")} className="text-xs text-gray-400 underline">Tutup</button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-800 bg-black flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Tab Buttons */}
          <div className="flex items-center flex-shrink-0">
            <button
              onClick={() => { setActiveTab("edit"); setShowAIPanel(false); }}
              className={`flex-1 py-3 text-sm font-medium transition-all border-b-2 ${activeTab === "edit" ? "border-cyan-400 text-cyan-400" : "border-transparent text-gray-400"}`}
              style={activeTab === "edit" ? { boxShadow: "0 -2px 10px rgba(0,217,255,0.2)" } : {}}
            >
              ✂️ Edit Video
            </button>
            <button
              onClick={() => { setActiveTab("ai"); setShowAIPanel(!showAIPanel); }}
              className={`flex-1 py-3 text-sm font-medium transition-all border-b-2 ${activeTab === "ai" ? "border-pink-500 text-pink-400" : "border-transparent text-gray-400"}`}
              style={activeTab === "ai" ? { boxShadow: "0 -2px 10px rgba(255,0,255,0.2)" } : {}}
            >
              ✨ Poles AI
            </button>
          </div>

          {/* Edit Panel */}
          {activeTab === "edit" && (
            <div className="flex-1 overflow-y-auto min-h-0">
              {/* Tool Selector Row */}
              <div className="flex gap-2 px-4 pt-3 pb-2 overflow-x-auto flex-shrink-0">
                {tools.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTool(t.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-sm text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                      activeTool === t.id
                        ? "bg-cyan-400 text-black"
                        : "border border-gray-700 text-gray-300 hover:border-cyan-400 hover:text-cyan-400"
                    }`}
                  >
                    {t.icon}
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="px-4 pb-4">
                {/* Trim Tool */}
                {activeTool === "trim" && (
                  <div className="space-y-4">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Mulai: <span className="text-cyan-400 font-mono">{formatTime(startTime)}</span></span>
                      <span>Selesai: <span className="text-cyan-400 font-mono">{formatTime(endTime)}</span></span>
                      <span>Durasi: <span className="text-green-400 font-mono">{formatTime(endTime - startTime)}</span></span>
                    </div>
                    {/* Visual trim bar */}
                    <div className="relative h-8 bg-gray-800 rounded-sm overflow-hidden">
                      <div
                        className="absolute top-0 bottom-0 bg-cyan-400 bg-opacity-20 border-l-2 border-r-2 border-cyan-400"
                        style={{
                          left: `${videoDuration > 0 ? (startTime / videoDuration) * 100 : 0}%`,
                          right: `${videoDuration > 0 ? ((videoDuration - endTime) / videoDuration) * 100 : 0}%`,
                        }}
                      />
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-white"
                        style={{ left: `${videoDuration > 0 ? (currentTime / videoDuration) * 100 : 0}%` }}
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 text-xs block mb-1">Waktu Mulai</label>
                      <input
                        type="range" min="0" max={videoDuration} step="0.1" value={startTime}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          if (v < endTime) {
                            setStartTime(v);
                            if (videoRef.current) videoRef.current.currentTime = v;
                          }
                        }}
                        className="w-full h-2 bg-gray-800 rounded-full appearance-none cursor-pointer accent-cyan-400"
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 text-xs block mb-1">Waktu Selesai</label>
                      <input
                        type="range" min="0" max={videoDuration} step="0.1" value={endTime}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          if (v > startTime) setEndTime(v);
                        }}
                        className="w-full h-2 bg-gray-800 rounded-full appearance-none cursor-pointer accent-cyan-400"
                      />
                    </div>
                  </div>
                )}

                {/* Speed Tool */}
                {activeTool === "speed" && (
                  <div className="space-y-3">
                    <p className="text-gray-400 text-xs">Kecepatan Putar: <span className="text-cyan-400 font-bold">{playbackRate}x</span></p>
                    <div className="grid grid-cols-3 gap-2">
                      {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5].map((rate) => (
                        <button
                          key={rate}
                          onClick={() => setPlaybackRate(rate)}
                          className={`py-2.5 rounded-sm text-sm font-medium transition-all ${
                            playbackRate === rate
                              ? "bg-cyan-400 text-black font-bold"
                              : "border border-gray-700 text-gray-300 hover:border-cyan-400 hover:text-cyan-400"
                          }`}
                        >
                          {rate}x
                        </button>
                      ))}
                    </div>
                    <p className="text-gray-600 text-xs">Preview langsung diterapkan. Ekspor akan encode kecepatan ini.</p>
                  </div>
                )}

                {/* Filter Tool */}
                {activeTool === "filter" && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Kecerahan</span>
                        <span className="text-cyan-400 font-mono">{brightness > 0 ? "+" : ""}{brightness}%</span>
                      </div>
                      <input
                        type="range" min="-50" max="50" step="1" value={brightness}
                        onChange={(e) => setBrightness(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-800 rounded-full appearance-none cursor-pointer accent-cyan-400"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Kontras</span>
                        <span className="text-cyan-400 font-mono">{contrast > 0 ? "+" : ""}{contrast}%</span>
                      </div>
                      <input
                        type="range" min="-50" max="50" step="1" value={contrast}
                        onChange={(e) => setContrast(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-800 rounded-full appearance-none cursor-pointer accent-cyan-400"
                      />
                    </div>
                    <button
                      onClick={() => { setBrightness(0); setContrast(0); }}
                      className="w-full py-2 text-xs text-gray-400 border border-gray-700 rounded-sm hover:border-gray-500 transition-all"
                    >
                      Reset Filter
                    </button>
                    <p className="text-gray-600 text-xs">Preview diterapkan via CSS. Ekspor akan encode filter ini.</p>
                  </div>
                )}

                {/* Audio Tool */}
                {activeTool === "audio" && (
                  <div className="space-y-4">
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className={`w-full py-3 rounded-sm text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                        isMuted
                          ? "bg-red-500 bg-opacity-20 border border-red-500 text-red-400"
                          : "border border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:bg-opacity-10"
                      }`}
                    >
                      {isMuted ? <><VolumeX size={16} /> Suara Dimatikan (Ekspor tanpa audio)</> : <><Volume2 size={16} /> Suara Aktif</>}
                    </button>
                    {!isMuted && (
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-400">Volume</span>
                          <span className="text-cyan-400 font-mono">{Math.round(volume * 100)}%</span>
                        </div>
                        <input
                          type="range" min="0" max="1" step="0.05" value={volume}
                          onChange={(e) => setVolume(parseFloat(e.target.value))}
                          className="w-full h-2 bg-gray-800 rounded-full appearance-none cursor-pointer accent-cyan-400"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Export Button */}
              {videoFile && (
                <div className="px-4 pb-4 flex flex-col gap-2">
                  <button
                    onClick={handleExport}
                    disabled={!ffmpegReady || isProcessing}
                    className="w-full py-3 rounded-sm text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{
                      background: "linear-gradient(90deg, #00D9FF, #FF00FF)",
                      color: "#000",
                      boxShadow: isProcessing ? "none" : "0 0 16px rgba(0,217,255,0.4)",
                    }}
                  >
                    {isProcessing ? (
                      <><Loader2 size={16} className="animate-spin" /> {processingMsg}</>
                    ) : (
                      <><Download size={16} /> Ekspor Video (FFmpeg)</>
                    )}
                  </button>

                  {outputUrl && (
                    <a
                      href={outputUrl}
                      download="simplex-video.mp4"
                      className="w-full py-2.5 rounded-sm text-sm font-medium text-center transition-all border border-green-400 text-green-400 hover:bg-green-400 hover:bg-opacity-10"
                      style={{ boxShadow: "0 0 8px rgba(0,255,100,0.2)" }}
                    >
                      ✅ Download Hasil (MP4)
                    </a>
                  )}
                </div>
              )}

              {/* FFmpeg not ready notice */}
              {!ffmpegReady && !isLoading && (
                <div className="px-4 pb-4">
                  <p className="text-yellow-400 text-xs text-center border border-yellow-400 border-opacity-30 rounded-sm p-2">
                    ⚠️ SDK belum siap. Periksa koneksi internet.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* AI Panel */}
          {activeTab === "ai" && showAIPanel && (
            <div className="flex-1 overflow-y-auto min-h-0 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-sm">AI Enhancement</h3>
                <button onClick={() => setShowAIPanel(false)} className="p-1 hover:bg-gray-800 rounded-sm">
                  <ChevronUp size={16} className="text-gray-400" />
                </button>
              </div>
              <div className="flex flex-col gap-3">
                {["HD Enhancement", "Portrait Face Restore", "Noise Reduction", "Auto Color Grade"].map((opt) => (
                  <button
                    key={opt}
                    className="py-3 px-4 rounded-sm border border-cyan-400 text-white text-sm font-medium transition-all hover:bg-cyan-400 hover:bg-opacity-10"
                    style={{ boxShadow: "0 0 8px rgba(0,217,255,0.15)" }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
