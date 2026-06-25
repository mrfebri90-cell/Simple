import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  X, Download, ChevronDown, Play, Pause, Loader2,
  Scissors, Gauge, Contrast, Volume2, VolumeX, CropIcon,
  RotateCw, RotateCcw, FlipHorizontal2, FlipVertical2,
  RefreshCw, Check,
} from "lucide-react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

type EditTool = "trim" | "crop" | "rotate" | "speed" | "filter" | "audio";

interface CropState {
  x: number; y: number; w: number; h: number;
}

interface AspectRatio {
  label: string; value: string; w: number; h: number;
}

const ASPECT_RATIOS: AspectRatio[] = [
  { label: "Bebas", value: "free", w: 0, h: 0 },
  { label: "16:9", value: "16:9", w: 16, h: 9 },
  { label: "9:16", value: "9:16", w: 9, h: 16 },
  { label: "1:1", value: "1:1", w: 1, h: 1 },
  { label: "4:3", value: "4:3", w: 4, h: 3 },
  { label: "3:2", value: "3:2", w: 3, h: 2 },
];

const FFMPEG_CORE = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";

const SPEED_OPTIONS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5];

const TOOLS: { id: EditTool; icon: React.ReactNode; label: string }[] = [
  { id: "trim",   icon: <Scissors size={15} />,        label: "Potong" },
  { id: "crop",   icon: <CropIcon size={15} />,         label: "Crop" },
  { id: "rotate", icon: <RotateCw size={15} />,         label: "Putar" },
  { id: "speed",  icon: <Gauge size={15} />,            label: "Speed" },
  { id: "filter", icon: <Contrast size={15} />,         label: "Filter" },
  { id: "audio",  icon: <Volume2 size={15} />,          label: "Audio" },
];

export default function WorkspaceVideo() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"edit" | "ai">("edit");
  const [activeTool, setActiveTool] = useState<EditTool>("trim");

  const videoRef    = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ffmpegRef   = useRef<FFmpeg | null>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  const [videoFile, setVideoFile]         = useState<File | null>(null);
  const [videoUrl, setVideoUrl]           = useState("");
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime]     = useState(0);
  const [isPlaying, setIsPlaying]         = useState(false);
  const [videoNaturalW, setVideoNaturalW] = useState(0);
  const [videoNaturalH, setVideoNaturalH] = useState(0);

  // ── Trim ─────────────────────────────────────────────────────────────────
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime]     = useState(0);

  // ── Crop ─────────────────────────────────────────────────────────────────
  const [crop, setCrop]           = useState<CropState>({ x: 0, y: 0, w: 1, h: 1 });
  const [cropAR, setCropAR]       = useState<string>("free");
  const [cropEnabled, setCropEnabled] = useState(false);

  // ── Rotate / Flip ────────────────────────────────────────────────────────
  const [rotation, setRotation]   = useState(0);          // 0 | 90 | 180 | 270
  const [flipH, setFlipH]         = useState(false);
  const [flipV, setFlipV]         = useState(false);

  // ── Speed ────────────────────────────────────────────────────────────────
  const [playbackRate, setPlaybackRate] = useState(1);

  // ── Filter ───────────────────────────────────────────────────────────────
  const [brightness, setBrightness]   = useState(0);
  const [contrast, setContrast]       = useState(0);
  const [saturation, setSaturation]   = useState(0);

  // ── Audio ────────────────────────────────────────────────────────────────
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume]   = useState(1);

  // ── FFmpeg state ──────────────────────────────────────────────────────────
  const [ffmpegReady, setFfmpegReady]   = useState(false);
  const [isLoading, setIsLoading]       = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress]         = useState(0);
  const [error, setError]               = useState("");
  const [outputUrl, setOutputUrl]       = useState("");

  // ── Load FFmpeg ───────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setIsLoading(true);
        const ff = new FFmpeg();
        ff.on("progress", ({ progress: p }) => {
          if (!cancelled) setProgress(Math.round(p * 100));
        });
        await ff.load({
          coreURL: await toBlobURL(`${FFMPEG_CORE}/ffmpeg-core.js`, "text/javascript"),
          wasmURL: await toBlobURL(`${FFMPEG_CORE}/ffmpeg-core.wasm`, "application/wasm"),
        });
        if (!cancelled) {
          ffmpegRef.current = ff;
          setFfmpegReady(true);
        }
      } catch {
        if (!cancelled) setError("Gagal memuat FFmpeg SDK. Periksa koneksi internet.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; ffmpegRef.current?.terminate(); };
  }, []);

  // ── File upload ───────────────────────────────────────────────────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) { setError("Pilih file video yang valid."); return; }
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    setVideoFile(file);
    setVideoUrl(URL.createObjectURL(file));
    setOutputUrl("");
    setError("");
    setStartTime(0); setEndTime(0);
    setRotation(0); setFlipH(false); setFlipV(false);
    setCrop({ x: 0, y: 0, w: 1, h: 1 }); setCropEnabled(false);
    setBrightness(0); setContrast(0); setSaturation(0);
    setPlaybackRate(1); setIsMuted(false); setVolume(1);
  };

  const handleLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v) return;
    setVideoDuration(v.duration);
    setEndTime(v.duration);
    setVideoNaturalW(v.videoWidth);
    setVideoNaturalH(v.videoHeight);
  };

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(v.currentTime);
    if (v.currentTime >= endTime) { v.pause(); v.currentTime = startTime; setIsPlaying(false); }
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v || !videoUrl) return;
    if (isPlaying) { v.pause(); setIsPlaying(false); }
    else { v.currentTime = startTime; v.play(); setIsPlaying(true); }
  };

  // Apply preview transforms in real-time
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = isMuted ? 0 : volume;
    v.playbackRate = playbackRate;
  }, [isMuted, volume, playbackRate]);

  // CSS transform for preview (rotation + flip)
  const previewTransform = [
    `rotate(${rotation}deg)`,
    flipH ? "scaleX(-1)" : "",
    flipV ? "scaleY(-1)" : "",
  ].filter(Boolean).join(" ") || "none";

  // CSS filter for preview (brightness/contrast/saturation)
  const previewFilter = `brightness(${1 + brightness / 100}) contrast(${1 + contrast / 100}) saturate(${1 + saturation / 100})`;

  // ── Crop helpers ──────────────────────────────────────────────────────────
  const applyCropAR = (arValue: string) => {
    setCropAR(arValue);
    if (arValue === "free") { setCropEnabled(true); return; }
    const ar = ASPECT_RATIOS.find(a => a.value === arValue)!;
    // Centre the crop box with max size for this aspect ratio
    const vAR = videoNaturalW > 0 ? videoNaturalW / videoNaturalH : 16 / 9;
    const targetAR = ar.w / ar.h;
    let w: number, h: number;
    if (targetAR > vAR) { w = 1; h = vAR / targetAR; }
    else { h = 1; w = targetAR / vAR; }
    const x = (1 - w) / 2;
    const y = (1 - h) / 2;
    setCrop({ x, y, w, h });
    setCropEnabled(true);
  };

  const resetCrop = () => { setCrop({ x: 0, y: 0, w: 1, h: 1 }); setCropAR("free"); setCropEnabled(false); };

  // ── FFmpeg Export ─────────────────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    if (!ffmpegRef.current || !videoFile || !ffmpegReady) return;
    setIsProcessing(true); setProgress(0); setError(""); setOutputUrl("");

    try {
      const ff = ffmpegRef.current;
      const ext = videoFile.name.split(".").pop() || "mp4";
      await ff.writeFile(`in.${ext}`, await fetchFile(videoFile));

      // Build complex filter graph
      const vFilters: string[] = [];
      const aFilters: string[] = [];

      // 1. Trim (handled via -ss / -to, not a filter)

      // 2. Crop
      if (cropEnabled && (crop.x > 0 || crop.y > 0 || crop.w < 1 || crop.h < 1)) {
        const cw = Math.round(videoNaturalW * crop.w);
        const ch = Math.round(videoNaturalH * crop.h);
        const cx = Math.round(videoNaturalW * crop.x);
        const cy = Math.round(videoNaturalH * crop.y);
        vFilters.push(`crop=${cw}:${ch}:${cx}:${cy}`);
      }

      // 3. Rotate / Flip
      if (rotation === 90) vFilters.push("transpose=1");
      else if (rotation === 180) vFilters.push("transpose=1,transpose=1");
      else if (rotation === 270) vFilters.push("transpose=2");
      if (flipH) vFilters.push("hflip");
      if (flipV) vFilters.push("vflip");

      // 4. Filter (brightness/contrast/saturation via eq)
      if (brightness !== 0 || contrast !== 0 || saturation !== 0) {
        const b = (brightness / 100).toFixed(3);
        const c = (1 + contrast / 100).toFixed(3);
        const s = (1 + saturation / 100).toFixed(3);
        vFilters.push(`eq=brightness=${b}:contrast=${c}:saturation=${s}`);
      }

      // 5. Speed (setpts for video, atempo for audio)
      if (playbackRate !== 1) {
        const pts = (1 / playbackRate).toFixed(4);
        vFilters.push(`setpts=${pts}*PTS`);
        // atempo must be between 0.5 and 2.0 — chain if needed
        let remaining = playbackRate;
        while (remaining > 2.0) { aFilters.push("atempo=2.0"); remaining /= 2; }
        while (remaining < 0.5) { aFilters.push("atempo=0.5"); remaining /= 0.5; }
        aFilters.push(`atempo=${remaining.toFixed(4)}`);
      }

      // Build command args
      const args: string[] = [
        "-ss", startTime.toFixed(3),
        "-to", endTime.toFixed(3),
        "-i", `in.${ext}`,
      ];

      const vfStr = vFilters.join(",");
      const afStr = aFilters.join(",");

      if (vfStr || afStr || !isMuted) {
        if (vfStr) { args.push("-vf", vfStr); }
        if (isMuted) { args.push("-an"); }
        else if (afStr) { args.push("-af", afStr); }
      }

      args.push(
        "-c:v", "libx264", "-preset", "ultrafast", "-crf", "23",
        "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart",
        "-y", "out.mp4"
      );

      await ff.exec(args);

      const data = await ff.readFile("out.mp4");
      const blob = new Blob([data as Uint8Array], { type: "video/mp4" });
      setOutputUrl(URL.createObjectURL(blob));
      await ff.deleteFile(`in.${ext}`);
      await ff.deleteFile("out.mp4");
    } catch (e: any) {
      setError("Ekspor gagal: " + (e?.message || String(e)));
    } finally {
      setIsProcessing(false);
    }
  }, [ffmpegReady, videoFile, startTime, endTime, cropEnabled, crop, videoNaturalW, videoNaturalH, rotation, flipH, flipV, playbackRate, brightness, contrast, saturation, isMuted]);

  const handleBack = () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    setLocation("/");
  };

  const fmt = (s: number) => {
    if (!s || isNaN(s)) return "0:00";
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
  };

  const progressPct = videoDuration > 0 ? (currentTime / videoDuration) * 100 : 0;
  const trimLeftPct  = videoDuration > 0 ? (startTime / videoDuration) * 100 : 0;
  const trimWidthPct = videoDuration > 0 ? ((endTime - startTime) / videoDuration) * 100 : 100;

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center">
      <div className="w-full max-w-md h-screen flex flex-col bg-black overflow-hidden">

        {/* ── Top Bar ── */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800 bg-black flex-shrink-0">
          <button onClick={handleBack} className="p-2 rounded-sm hover:bg-gray-900 transition-colors">
            <X size={20} className="text-cyan-400" />
          </button>
          <div className="flex items-center gap-2">
            <h2 className="text-white font-bold text-sm tracking-wide">VIDEO EDITOR</h2>
            {isLoading && <Loader2 size={13} className="text-cyan-400 animate-spin" />}
            {ffmpegReady && !isLoading && (
              <span className="text-[10px] text-green-400 px-1.5 py-0.5 border border-green-400/40 rounded-sm font-mono">FFmpeg ✓</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileUpload} className="hidden" />
            <button
              onClick={() => { setError(""); fileInputRef.current?.click(); }}
              className="px-3 py-1.5 rounded-sm border border-cyan-400/60 text-cyan-400 text-xs font-semibold hover:bg-cyan-400/10 transition-all"
            >
              + Video
            </button>
          </div>
        </div>

        {/* ── Video Preview ── */}
        <div ref={videoContainerRef} className="flex-shrink-0 bg-black relative select-none" style={{ minHeight: 200 }}>
          {videoUrl ? (
            <div className="relative flex items-center justify-center bg-black" style={{ minHeight: 200 }}>
              {/* Video */}
              <video
                ref={videoRef}
                src={videoUrl}
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                onError={() => setError("Gagal memuat video.")}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                className="w-full object-contain bg-black transition-all"
                style={{
                  maxHeight: 220,
                  transform: previewTransform,
                  filter: previewFilter,
                  ...(cropEnabled && crop.w < 1 || crop.h < 1 ? {
                    clipPath: `inset(${crop.y * 100}% ${(1 - crop.x - crop.w) * 100}% ${(1 - crop.y - crop.h) * 100}% ${crop.x * 100}%)`,
                  } : {}),
                }}
              />

              {/* Crop overlay rectangle */}
              {activeTool === "crop" && cropEnabled && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div
                    className="absolute"
                    style={{
                      left: `${crop.x * 100}%`,
                      top:  `${crop.y * 100}%`,
                      width: `${crop.w * 100}%`,
                      height: `${crop.h * 100}%`,
                      border: "2px solid #00D9FF",
                      boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
                    }}
                  >
                    {/* Corner handles */}
                    {["-top-1.5 -left-1.5", "-top-1.5 -right-1.5", "-bottom-1.5 -left-1.5", "-bottom-1.5 -right-1.5"].map((pos, i) => (
                      <div key={i} className={`absolute ${pos} w-3 h-3 bg-cyan-400 rounded-sm`} />
                    ))}
                  </div>
                </div>
              )}

              {/* Play/Pause button */}
              <button
                onClick={togglePlay}
                className="absolute bottom-10 right-3 p-2.5 bg-black/70 border border-cyan-400/60 rounded-full text-cyan-400 hover:bg-black/90 transition-all"
                style={{ boxShadow: "0 0 8px rgba(0,217,255,0.25)" }}
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>

              {/* Timeline bar */}
              <div className="absolute bottom-0 left-0 right-0 px-3 pb-2 pt-1">
                {/* Full timeline bg */}
                <div className="relative h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  {/* Trim selection zone */}
                  <div
                    className="absolute top-0 bottom-0 bg-cyan-400/30 border-l border-r border-cyan-400"
                    style={{ left: `${trimLeftPct}%`, width: `${trimWidthPct}%` }}
                  />
                  {/* Playhead */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white rounded-full"
                    style={{ left: `${progressPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-gray-500 mt-1 font-mono">
                  <span>{fmt(currentTime)}</span>
                  <span>{fmt(videoDuration)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="flex flex-col items-center justify-center gap-3 cursor-pointer py-10"
              onClick={() => fileInputRef.current?.click()}
            >
              {isLoading ? (
                <>
                  <Loader2 size={36} className="text-cyan-400 animate-spin" />
                  <p className="text-gray-400 text-xs">Memuat FFmpeg SDK...</p>
                  <p className="text-gray-600 text-[10px]">Proses sekali, lalu siap selamanya</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 border-2 border-cyan-400/40 rounded-sm flex items-center justify-center"
                    style={{ boxShadow: "0 0 20px rgba(0,217,255,0.1)" }}>
                    <Play size={28} className="text-cyan-400/60" />
                  </div>
                  <p className="text-white text-sm font-semibold">Pilih Video</p>
                  <p className="text-gray-500 text-xs">MP4 · MOV · WebM · AVI</p>
                </>
              )}
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div className="absolute bottom-0 left-0 right-0 bg-red-900/90 px-3 py-2 flex items-center justify-between">
              <span className="text-red-300 text-xs">{error}</span>
              <button onClick={() => setError("")} className="text-red-300 hover:text-white"><X size={14} /></button>
            </div>
          )}
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-gray-800 flex-shrink-0">
          {[
            { id: "edit" as const, label: "✂️ Edit" },
            { id: "ai"   as const, label: "✨ AI" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 py-2.5 text-sm font-semibold transition-all border-b-2 ${
                activeTab === t.id
                  ? t.id === "edit" ? "border-cyan-400 text-cyan-400" : "border-pink-500 text-pink-400"
                  : "border-transparent text-gray-500 hover:text-gray-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Edit Panel ── */}
        {activeTab === "edit" && (
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            {/* Tool Tabs */}
            <div className="flex overflow-x-auto gap-1.5 px-3 py-2.5 border-b border-gray-800/60 flex-shrink-0 scrollbar-hide">
              {TOOLS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTool(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all ${
                    activeTool === t.id
                      ? "bg-cyan-400 text-black"
                      : "border border-gray-700 text-gray-400 hover:border-cyan-400/50 hover:text-cyan-400"
                  }`}
                >
                  {t.icon}{t.label}
                </button>
              ))}
            </div>

            {/* Tool Content */}
            <div className="flex-1 overflow-y-auto min-h-0 px-4 py-3">

              {/* ── TRIM ── */}
              {activeTool === "trim" && (
                <div className="space-y-4">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-gray-400">Mulai: <span className="text-cyan-400">{fmt(startTime)}</span></span>
                    <span className="text-gray-400">Durasi: <span className="text-green-400">{fmt(endTime - startTime)}</span></span>
                    <span className="text-gray-400">Selesai: <span className="text-cyan-400">{fmt(endTime)}</span></span>
                  </div>
                  {/* Visual trim bar */}
                  <div className="relative h-10 bg-gray-900 rounded-sm border border-gray-700 overflow-hidden">
                    <div
                      className="absolute top-0 bottom-0 bg-cyan-400/15 border-l-2 border-r-2 border-cyan-400"
                      style={{ left: `${trimLeftPct}%`, width: `${trimWidthPct}%` }}
                    />
                    <div className="absolute top-0 bottom-0 w-px bg-white/80" style={{ left: `${progressPct}%` }} />
                    <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-[10px] font-mono pointer-events-none">
                      {fmt(endTime - startTime)} terpilih
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Waktu Mulai</span><span className="font-mono text-cyan-400">{fmt(startTime)}</span>
                      </div>
                      <input type="range" min={0} max={videoDuration} step={0.1} value={startTime}
                        onChange={e => { const v = +e.target.value; if (v < endTime) { setStartTime(v); if (videoRef.current) videoRef.current.currentTime = v; } }}
                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-cyan-400 bg-gray-800"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Waktu Selesai</span><span className="font-mono text-cyan-400">{fmt(endTime)}</span>
                      </div>
                      <input type="range" min={0} max={videoDuration} step={0.1} value={endTime}
                        onChange={e => { const v = +e.target.value; if (v > startTime) setEndTime(v); }}
                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-cyan-400 bg-gray-800"
                      />
                    </div>
                  </div>
                  <button onClick={() => { setStartTime(0); setEndTime(videoDuration); }}
                    className="w-full py-2 text-xs border border-gray-700 rounded-sm text-gray-400 hover:border-gray-500 transition-all flex items-center justify-center gap-1.5">
                    <RefreshCw size={12} /> Reset Trim
                  </button>
                </div>
              )}

              {/* ── CROP ── */}
              {activeTool === "crop" && (
                <div className="space-y-4">
                  <p className="text-gray-400 text-xs">Rasio Aspek</p>
                  <div className="grid grid-cols-3 gap-2">
                    {ASPECT_RATIOS.map(ar => (
                      <button key={ar.value} onClick={() => applyCropAR(ar.value)}
                        className={`py-2.5 rounded-sm text-xs font-semibold transition-all ${
                          cropAR === ar.value
                            ? "bg-cyan-400 text-black"
                            : "border border-gray-700 text-gray-300 hover:border-cyan-400/50 hover:text-cyan-400"
                        }`}>
                        {ar.label}
                      </button>
                    ))}
                  </div>

                  {cropEnabled && (
                    <div className="space-y-3 pt-1 border-t border-gray-800">
                      <div>
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Posisi X</span><span className="font-mono text-cyan-400">{Math.round(crop.x * 100)}%</span>
                        </div>
                        <input type="range" min={0} max={1 - crop.w} step={0.01} value={crop.x}
                          onChange={e => setCrop(c => ({ ...c, x: +e.target.value }))}
                          className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-cyan-400 bg-gray-800"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Posisi Y</span><span className="font-mono text-cyan-400">{Math.round(crop.y * 100)}%</span>
                        </div>
                        <input type="range" min={0} max={1 - crop.h} step={0.01} value={crop.y}
                          onChange={e => setCrop(c => ({ ...c, y: +e.target.value }))}
                          className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-cyan-400 bg-gray-800"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Lebar</span><span className="font-mono text-cyan-400">{Math.round(crop.w * 100)}%</span>
                        </div>
                        <input type="range" min={0.1} max={1 - crop.x} step={0.01} value={crop.w}
                          onChange={e => setCrop(c => ({ ...c, w: +e.target.value }))}
                          className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-cyan-400 bg-gray-800"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Tinggi</span><span className="font-mono text-cyan-400">{Math.round(crop.h * 100)}%</span>
                        </div>
                        <input type="range" min={0.1} max={1 - crop.y} step={0.01} value={crop.h}
                          onChange={e => setCrop(c => ({ ...c, h: +e.target.value }))}
                          className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-cyan-400 bg-gray-800"
                        />
                      </div>
                    </div>
                  )}

                  <button onClick={resetCrop}
                    className="w-full py-2 text-xs border border-gray-700 rounded-sm text-gray-400 hover:border-gray-500 transition-all flex items-center justify-center gap-1.5">
                    <RefreshCw size={12} /> Reset Crop
                  </button>
                  {videoNaturalW > 0 && (
                    <p className="text-center text-[10px] text-gray-600 font-mono">
                      Asli: {videoNaturalW}×{videoNaturalH}px
                      {cropEnabled && ` → ${Math.round(videoNaturalW * crop.w)}×${Math.round(videoNaturalH * crop.h)}px`}
                    </p>
                  )}
                </div>
              )}

              {/* ── ROTATE ── */}
              {activeTool === "rotate" && (
                <div className="space-y-4">
                  <p className="text-gray-400 text-xs">Rotasi</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[0, 90, 180, 270].map(deg => (
                      <button key={deg} onClick={() => setRotation(deg)}
                        className={`py-3 rounded-sm text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                          rotation === deg ? "bg-cyan-400 text-black" : "border border-gray-700 text-gray-300 hover:border-cyan-400/50"
                        }`}>
                        <RotateCw size={16} style={{ transform: `rotate(${deg}deg)` }} />
                        {deg}°
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-gray-800 pt-3">
                    <p className="text-gray-400 text-xs mb-2">Balik (Mirror)</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => setFlipH(f => !f)}
                        className={`py-3 rounded-sm text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                          flipH ? "bg-cyan-400 text-black" : "border border-gray-700 text-gray-300 hover:border-cyan-400/50"
                        }`}>
                        <FlipHorizontal2 size={16} /> Horizontal
                      </button>
                      <button onClick={() => setFlipV(f => !f)}
                        className={`py-3 rounded-sm text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                          flipV ? "bg-cyan-400 text-black" : "border border-gray-700 text-gray-300 hover:border-cyan-400/50"
                        }`}>
                        <FlipVertical2 size={16} /> Vertikal
                      </button>
                    </div>
                  </div>
                  <button onClick={() => { setRotation(0); setFlipH(false); setFlipV(false); }}
                    className="w-full py-2 text-xs border border-gray-700 rounded-sm text-gray-400 hover:border-gray-500 transition-all flex items-center justify-center gap-1.5">
                    <RefreshCw size={12} /> Reset Rotasi
                  </button>
                  <div className="text-center p-3 bg-gray-900/50 rounded-sm">
                    <p className="text-[10px] text-gray-500 mb-1">Preview Transform</p>
                    <p className="text-cyan-400 font-mono text-xs">{previewTransform}</p>
                  </div>
                </div>
              )}

              {/* ── SPEED ── */}
              {activeTool === "speed" && (
                <div className="space-y-4">
                  <div className="text-center p-3 bg-gray-900/50 rounded-sm">
                    <p className="text-3xl font-bold text-cyan-400">{playbackRate}x</p>
                    <p className="text-gray-500 text-xs mt-1">Kecepatan Putar</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {SPEED_OPTIONS.map(rate => (
                      <button key={rate} onClick={() => setPlaybackRate(rate)}
                        className={`py-2.5 rounded-sm text-sm font-bold transition-all ${
                          playbackRate === rate
                            ? "bg-cyan-400 text-black"
                            : "border border-gray-700 text-gray-300 hover:border-cyan-400/50 hover:text-cyan-400"
                        }`}>
                        {rate}x
                      </button>
                    ))}
                  </div>
                  <p className="text-gray-600 text-xs text-center">Preview langsung. Ekspor encode kecepatan ini.</p>
                </div>
              )}

              {/* ── FILTER ── */}
              {activeTool === "filter" && (
                <div className="space-y-4">
                  {[
                    { label: "Kecerahan", value: brightness, set: setBrightness, color: "#fbbf24" },
                    { label: "Kontras",   value: contrast,   set: setContrast,   color: "#a78bfa" },
                    { label: "Saturasi",  value: saturation, set: setSaturation, color: "#34d399" },
                  ].map(f => (
                    <div key={f.label}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-gray-400">{f.label}</span>
                        <span className="font-mono font-bold" style={{ color: f.color }}>
                          {f.value > 0 ? "+" : ""}{f.value}%
                        </span>
                      </div>
                      <div className="relative">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-4 bg-gray-600 pointer-events-none" />
                        <input type="range" min={-50} max={50} step={1} value={f.value}
                          onChange={e => f.set(+e.target.value)}
                          className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-gray-800"
                          style={{ accentColor: f.color }}
                        />
                      </div>
                    </div>
                  ))}
                  <button onClick={() => { setBrightness(0); setContrast(0); setSaturation(0); }}
                    className="w-full py-2 text-xs border border-gray-700 rounded-sm text-gray-400 hover:border-gray-500 transition-all flex items-center justify-center gap-1.5">
                    <RefreshCw size={12} /> Reset Filter
                  </button>
                  {/* Live preview label */}
                  <div className="p-2.5 bg-gray-900/50 rounded-sm">
                    <p className="text-[10px] text-gray-500 text-center font-mono">{previewFilter}</p>
                  </div>
                </div>
              )}

              {/* ── AUDIO ── */}
              {activeTool === "audio" && (
                <div className="space-y-4">
                  <button onClick={() => setIsMuted(m => !m)}
                    className={`w-full py-3 rounded-sm text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                      isMuted
                        ? "bg-red-500/20 border border-red-500 text-red-400"
                        : "border border-gray-700 text-gray-300 hover:border-cyan-400/50"
                    }`}>
                    {isMuted ? <><VolumeX size={18} /> Audio Dimatikan (Ekspor tanpa audio)</> : <><Volume2 size={18} /> Audio Aktif</>}
                  </button>
                  {!isMuted && (
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-gray-400">Volume Preview</span>
                        <span className="text-cyan-400 font-mono font-bold">{Math.round(volume * 100)}%</span>
                      </div>
                      <input type="range" min={0} max={1} step={0.05} value={volume}
                        onChange={e => setVolume(+e.target.value)}
                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-cyan-400 bg-gray-800"
                      />
                      <p className="text-gray-600 text-[10px] mt-1">Volume preview saja. Volume ekspor menggunakan audio asli.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Export Button ── */}
            <div className="px-4 pb-3 pt-2 border-t border-gray-800 flex-shrink-0 space-y-2">
              {isProcessing ? (
                <div className="space-y-2">
                  <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${progress}%`, background: "linear-gradient(90deg,#00D9FF,#FF00FF)" }}
                    />
                  </div>
                  <p className="text-center text-xs text-gray-400 font-mono">Mengekspor... {progress}%</p>
                </div>
              ) : (
                <button
                  onClick={handleExport}
                  disabled={!ffmpegReady || !videoFile}
                  className="w-full py-3 rounded-sm text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40 transition-all active:scale-95"
                  style={{ background: "linear-gradient(90deg,#00D9FF,#FF00FF)", color: "#000", boxShadow: "0 0 16px rgba(0,217,255,0.3)" }}
                >
                  <Download size={16} /> Ekspor Video
                </button>
              )}

              {outputUrl && (
                <a href={outputUrl} download="simplex-output.mp4"
                  className="w-full py-2.5 rounded-sm text-sm font-bold text-center flex items-center justify-center gap-2 border border-green-400 text-green-400 hover:bg-green-400/10 transition-all"
                  style={{ boxShadow: "0 0 10px rgba(0,255,100,0.15)" }}>
                  <Check size={16} /> Download Hasil MP4
                </a>
              )}

              {!ffmpegReady && !isLoading && (
                <p className="text-yellow-400 text-xs text-center">⚠️ SDK belum siap. Periksa koneksi.</p>
              )}
            </div>
          </div>
        )}

        {/* ── AI Panel ── */}
        {activeTab === "ai" && (
          <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4">
            <p className="text-gray-500 text-xs mb-4 text-center">Segera hadir — Integrasi HitPaw & PicsArt AI</p>
            <div className="space-y-3">
              {[
                { label: "🎬 HD Enhancement", desc: "Tingkatkan resolusi video ke HD/4K" },
                { label: "👤 Portrait Restore", desc: "Perbaiki wajah & kulit otomatis" },
                { label: "🔊 Noise Reduction", desc: "Kurangi derau audio & video" },
                { label: "🎨 Auto Color Grade", desc: "Grading warna profesional otomatis" },
                { label: "📽️ Slow Motion AI", desc: "Perlambat video tanpa blur" },
              ].map(opt => (
                <button key={opt.label}
                  className="w-full py-3 px-4 rounded-sm border border-gray-700 text-left transition-all hover:border-cyan-400/40 hover:bg-cyan-400/5 group"
                  style={{ opacity: 0.7 }}>
                  <p className="text-white text-sm font-semibold group-hover:text-cyan-400">{opt.label}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
