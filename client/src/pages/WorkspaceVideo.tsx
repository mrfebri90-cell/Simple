import { useState, useRef, useEffect, useCallback, useReducer } from "react";
import { useLocation } from "wouter";
import {
  ChevronLeft, Download, Undo2, Redo2, Settings2, Play, Pause,
  Scissors, CropIcon, RotateCw, Gauge, SlidersHorizontal,
  Volume2, VolumeX, RotateCcw, FlipHorizontal2, FlipVertical2,
  RefreshCw, Check, X, Loader2, ChevronUp,
} from "lucide-react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

// ─── Types ────────────────────────────────────────────────────────────────────
interface EditState {
  startTime: number; endTime: number;
  cropEnabled: boolean; cropAR: string;
  crop: { x: number; y: number; w: number; h: number };
  rotation: number; flipH: boolean; flipV: boolean;
  speed: number;
  brightness: number; contrast: number; saturation: number;
  isMuted: boolean; volume: number;
}

const DEFAULT_STATE: EditState = {
  startTime: 0, endTime: 0,
  cropEnabled: false, cropAR: "free",
  crop: { x: 0, y: 0, w: 1, h: 1 },
  rotation: 0, flipH: false, flipV: false,
  speed: 1,
  brightness: 0, contrast: 0, saturation: 0,
  isMuted: false, volume: 0.8,
};

type HistoryAction =
  | { type: "PUSH"; state: EditState }
  | { type: "UNDO" }
  | { type: "REDO" };

interface HistoryStore {
  stack: EditState[]; idx: number;
}

function historyReducer(h: HistoryStore, a: HistoryAction): HistoryStore {
  switch (a.type) {
    case "PUSH": {
      const stack = [...h.stack.slice(0, h.idx + 1), a.state];
      return { stack, idx: stack.length - 1 };
    }
    case "UNDO":
      return { ...h, idx: Math.max(0, h.idx - 1) };
    case "REDO":
      return { ...h, idx: Math.min(h.stack.length - 1, h.idx + 1) };
  }
}

type EditTool = "trim" | "crop" | "rotate" | "speed" | "filter" | "audio";

const ASPECT_RATIOS = [
  { label: "Bebas", value: "free" },
  { label: "16:9", value: "16:9",  w: 16, h: 9 },
  { label: "9:16", value: "9:16",  w: 9,  h: 16 },
  { label: "1:1",  value: "1:1",   w: 1,  h: 1 },
  { label: "4:3",  value: "4:3",   w: 4,  h: 3 },
  { label: "3:2",  value: "3:2",   w: 3,  h: 2 },
] as const;

const RESOLUTIONS = [
  { label: "Asli",  value: "original" },
  { label: "720p",  value: "720p",  scale: 720 },
  { label: "1080p", value: "1080p", scale: 1080 },
  { label: "2K",    value: "2k",    scale: 1440 },
  { label: "4K",    value: "4k",    scale: 2160 },
] as const;

const FPS_OPTIONS = [
  { label: "Asli", value: 0 },
  { label: "24fps", value: 24 },
  { label: "25fps", value: 25 },
  { label: "30fps", value: 30 },
  { label: "60fps", value: 60 },
];

const SPEED_OPTIONS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5];

const TOOL_LIST: { id: EditTool; icon: React.ReactNode; label: string }[] = [
  { id: "trim",   icon: <Scissors size={20} />,         label: "Potong" },
  { id: "crop",   icon: <CropIcon size={20} />,          label: "Crop" },
  { id: "rotate", icon: <RotateCw size={20} />,          label: "Putar" },
  { id: "speed",  icon: <Gauge size={20} />,             label: "Speed" },
  { id: "filter", icon: <SlidersHorizontal size={20} />, label: "Filter" },
  { id: "audio",  icon: <Volume2 size={20} />,           label: "Audio" },
];

const CORE_URL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";

// ─── Component ────────────────────────────────────────────────────────────────
export default function WorkspaceVideo() {
  const [, setLocation] = useLocation();
  const videoRef    = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ffmpegRef   = useRef<FFmpeg | null>(null);

  // ── Media state ──────────────────────────────────────────────────────────
  const [videoFile, setVideoFile]         = useState<File | null>(null);
  const [videoUrl, setVideoUrl]           = useState("");
  const [duration, setDuration]           = useState(0);
  const [currentTime, setCurrentTime]     = useState(0);
  const [isPlaying, setIsPlaying]         = useState(false);
  const [naturalW, setNaturalW]           = useState(1920);
  const [naturalH, setNaturalH]           = useState(1080);

  // ── Edit state + undo/redo ───────────────────────────────────────────────
  const [edit, setEdit]     = useState<EditState>({ ...DEFAULT_STATE });
  const [history, dispatch] = useReducer(historyReducer, { stack: [{ ...DEFAULT_STATE }], idx: 0 });
  const canUndo = history.idx > 0;
  const canRedo = history.idx < history.stack.length - 1;

  const applyEdit = useCallback((partial: Partial<EditState>, pushHist = true) => {
    setEdit(prev => {
      const next = { ...prev, ...partial };
      if (pushHist) dispatch({ type: "PUSH", state: next });
      return next;
    });
  }, []);

  const undo = () => {
    dispatch({ type: "UNDO" });
    setEdit(history.stack[Math.max(0, history.idx - 1)]);
  };

  const redo = () => {
    dispatch({ type: "REDO" });
    setEdit(history.stack[Math.min(history.stack.length - 1, history.idx + 1)]);
  };

  // ── Output settings ──────────────────────────────────────────────────────
  const [outputRes, setOutputRes] = useState("original");
  const [outputFps, setOutputFps] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  // ── UI state ─────────────────────────────────────────────────────────────
  const [activeTool, setActiveTool] = useState<EditTool | null>(null);

  // ── SDK state ─────────────────────────────────────────────────────────────
  const [sdkReady, setSdkReady]     = useState(false);
  const [sdkLoading, setSdkLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [outputUrl, setOutputUrl]   = useState("");
  const [error, setError]           = useState("");

  // ── Load FFmpeg SDK ────────────────────────────────────────────────────────
  useEffect(() => {
    let dead = false;
    (async () => {
      setSdkLoading(true);
      try {
        const ff = new FFmpeg();
        ff.on("progress", ({ progress: p }) => { if (!dead) setExportProgress(Math.round(p * 100)); });
        await ff.load({
          coreURL: await toBlobURL(`${CORE_URL}/ffmpeg-core.js`, "text/javascript"),
          wasmURL: await toBlobURL(`${CORE_URL}/ffmpeg-core.wasm`, "application/wasm"),
        });
        if (!dead) { ffmpegRef.current = ff; setSdkReady(true); }
      } catch { if (!dead) setError("SDK gagal dimuat. Periksa koneksi."); }
      finally   { if (!dead) setSdkLoading(false); }
    })();
    return () => { dead = true; ffmpegRef.current?.terminate(); };
  }, []);

  // ── File upload ────────────────────────────────────────────────────────────
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("video/")) { setError("File bukan video."); return; }
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    setVideoFile(f); setVideoUrl(URL.createObjectURL(f));
    setOutputUrl(""); setError(""); setCurrentTime(0); setIsPlaying(false);
    const fresh = { ...DEFAULT_STATE };
    setEdit(fresh);
    dispatch({ type: "PUSH", state: fresh });
  };

  const handleMeta = () => {
    const v = videoRef.current; if (!v) return;
    setDuration(v.duration);
    setNaturalW(v.videoWidth || 1920);
    setNaturalH(v.videoHeight || 1080);
    applyEdit({ endTime: v.duration, startTime: 0, volume: 0.8 }, false);
  };

  const handleTimeUpdate = () => {
    const v = videoRef.current; if (!v) return;
    setCurrentTime(v.currentTime);
    if (v.currentTime >= edit.endTime) { v.pause(); v.currentTime = edit.startTime; setIsPlaying(false); }
  };

  const togglePlay = () => {
    const v = videoRef.current; if (!v || !videoUrl) return;
    if (isPlaying) { v.pause(); } else { v.currentTime = edit.startTime; v.play(); }
  };

  // Apply preview params
  useEffect(() => {
    const v = videoRef.current; if (!v) return;
    v.volume = edit.isMuted ? 0 : Math.min(1, edit.volume);
    v.playbackRate = edit.speed;
  }, [edit.isMuted, edit.volume, edit.speed]);

  const previewTransform = [
    edit.rotation ? `rotate(${edit.rotation}deg)` : "",
    edit.flipH ? "scaleX(-1)" : "",
    edit.flipV ? "scaleY(-1)" : "",
  ].filter(Boolean).join(" ") || "none";

  const previewFilter = `brightness(${1 + edit.brightness / 100}) contrast(${1 + edit.contrast / 100}) saturate(${1 + edit.saturation / 100})`;

  // ── Crop helpers ───────────────────────────────────────────────────────────
  const applyCropAR = (arValue: string) => {
    if (arValue === "free") { applyEdit({ cropEnabled: true, cropAR: "free" }); return; }
    const ar = ASPECT_RATIOS.find(a => a.value === arValue)!;
    if (!("w" in ar)) return;
    const vAR = naturalW / naturalH;
    const tAR = ar.w / ar.h;
    let w: number, h: number;
    if (tAR > vAR) { w = 1; h = vAR / tAR; } else { h = 1; w = tAR / vAR; }
    const x = (1 - w) / 2, y = (1 - h) / 2;
    applyEdit({ cropEnabled: true, cropAR: arValue, crop: { x, y, w, h } });
  };

  // ── Export ─────────────────────────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    if (!ffmpegRef.current || !videoFile || !sdkReady) return;
    setIsExporting(true); setExportProgress(0); setError(""); setOutputUrl("");
    try {
      const ff = ffmpegRef.current;
      const ext = (videoFile.name.split(".").pop() || "mp4").toLowerCase();
      await ff.writeFile(`i.${ext}`, await fetchFile(videoFile));

      const vf: string[] = [];
      const af: string[] = [];

      // Resolution scale
      const res = RESOLUTIONS.find(r => r.value === outputRes);
      if (res && "scale" in res) vf.push(`scale=-2:${res.scale}`);

      // Crop
      if (edit.cropEnabled && (edit.crop.x > 0 || edit.crop.y > 0 || edit.crop.w < 1 || edit.crop.h < 1)) {
        const cw = Math.round(naturalW * edit.crop.w);
        const ch = Math.round(naturalH * edit.crop.h);
        const cx = Math.round(naturalW * edit.crop.x);
        const cy = Math.round(naturalH * edit.crop.y);
        vf.push(`crop=${cw}:${ch}:${cx}:${cy}`);
      }

      // Rotate/flip
      if (edit.rotation === 90)  vf.push("transpose=1");
      else if (edit.rotation === 180) vf.push("transpose=1,transpose=1");
      else if (edit.rotation === 270) vf.push("transpose=2");
      if (edit.flipH) vf.push("hflip");
      if (edit.flipV) vf.push("vflip");

      // Color filters
      if (edit.brightness || edit.contrast || edit.saturation) {
        vf.push(`eq=brightness=${(edit.brightness / 100).toFixed(3)}:contrast=${(1 + edit.contrast / 100).toFixed(3)}:saturation=${(1 + edit.saturation / 100).toFixed(3)}`);
      }

      // Speed
      if (edit.speed !== 1) {
        vf.push(`setpts=${(1 / edit.speed).toFixed(4)}*PTS`);
        let r = edit.speed;
        while (r > 2.0) { af.push("atempo=2.0"); r /= 2; }
        while (r < 0.5) { af.push("atempo=0.5"); r *= 2; }
        af.push(`atempo=${r.toFixed(4)}`);
      }

      // Volume amplification (export)
      if (!edit.isMuted && edit.volume !== 1) {
        af.push(`volume=${edit.volume.toFixed(2)}`);
      }

      const args: string[] = ["-ss", edit.startTime.toFixed(3), "-to", edit.endTime.toFixed(3), "-i", `i.${ext}`];
      if (vf.length) args.push("-vf", vf.join(","));
      if (edit.isMuted) args.push("-an");
      else if (af.length) args.push("-af", af.join(","));
      if (outputFps > 0) args.push("-r", String(outputFps));
      args.push("-c:v", "libx264", "-preset", "ultrafast", "-crf", "22", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", "-y", "o.mp4");

      await ff.exec(args);
      const data = await ff.readFile("o.mp4");
      setOutputUrl(URL.createObjectURL(new Blob([data as Uint8Array], { type: "video/mp4" })));
      await ff.deleteFile(`i.${ext}`); await ff.deleteFile("o.mp4");
    } catch (e: any) { setError("Ekspor gagal: " + (e?.message || String(e))); }
    finally { setIsExporting(false); }
  }, [sdkReady, videoFile, edit, outputRes, outputFps, naturalW, naturalH]);

  const fmt = (s: number) => {
    if (!s || isNaN(s)) return "0:00";
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
  };

  const pct = (v: number, max: number) => max > 0 ? (v / max) * 100 : 0;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="h-screen bg-black flex flex-col items-center justify-center">
      <div className="w-full max-w-md h-full flex flex-col bg-black relative overflow-hidden">

        {/* ══ TOP BAR ══ */}
        <div className="flex items-center justify-between px-3 py-2 bg-black flex-shrink-0 border-b border-gray-900">
          {/* Left */}
          <button onClick={() => { if (videoUrl) URL.revokeObjectURL(videoUrl); setLocation("/"); }}
            className="p-2 rounded-full hover:bg-gray-900 active:bg-gray-800 transition-colors">
            <ChevronLeft size={22} className="text-white" />
          </button>

          {/* Center: title + undo/redo */}
          <div className="flex items-center gap-1">
            <button onClick={undo} disabled={!canUndo}
              className="p-2 rounded-full transition-colors disabled:opacity-20 hover:bg-gray-900 active:bg-gray-800">
              <Undo2 size={18} className="text-white" />
            </button>
            <span className="text-white text-sm font-bold tracking-wider px-2">VIDEO</span>
            <button onClick={redo} disabled={!canRedo}
              className="p-2 rounded-full transition-colors disabled:opacity-20 hover:bg-gray-900 active:bg-gray-800">
              <Redo2 size={18} className="text-white" />
            </button>
          </div>

          {/* Right: settings + export */}
          <div className="flex items-center gap-1">
            <button onClick={() => { setShowSettings(s => !s); setActiveTool(null); }}
              className="p-2 rounded-full hover:bg-gray-900 active:bg-gray-800 transition-colors">
              <Settings2 size={20} className={showSettings ? "text-cyan-400" : "text-white"} />
            </button>
            <button
              onClick={handleExport}
              disabled={!sdkReady || !videoFile || isExporting}
              className="px-4 py-1.5 rounded-full text-black text-xs font-bold disabled:opacity-30 active:scale-95 transition-all"
              style={{ background: "linear-gradient(90deg,#00D9FF,#FF00FF)" }}>
              {isExporting ? `${exportProgress}%` : "Ekspor"}
            </button>
          </div>
        </div>

        {/* ══ SETTINGS PANEL (slides down) ══ */}
        <div className={`flex-shrink-0 bg-gray-950 border-b border-gray-800 overflow-hidden transition-all duration-300 ${showSettings ? "max-h-60" : "max-h-0"}`}>
          <div className="px-4 py-3 space-y-4">
            <div>
              <p className="text-gray-400 text-xs mb-2 font-semibold uppercase tracking-wider">Resolusi Output</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {RESOLUTIONS.map(r => (
                  <button key={r.value} onClick={() => setOutputRes(r.value)}
                    className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap flex-shrink-0 transition-all ${outputRes === r.value ? "bg-cyan-400 text-black" : "border border-gray-700 text-gray-300"}`}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-2 font-semibold uppercase tracking-wider">Frame Rate</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {FPS_OPTIONS.map(f => (
                  <button key={f.value} onClick={() => setOutputFps(f.value)}
                    className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap flex-shrink-0 transition-all ${outputFps === f.value ? "bg-cyan-400 text-black" : "border border-gray-700 text-gray-300"}`}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ══ VIDEO PREVIEW ══ */}
        <div className="flex-1 bg-black relative min-h-0 flex flex-col">

          {/* Video area */}
          <div className="flex-1 relative flex items-center justify-center bg-black min-h-0">
            {videoUrl ? (
              <>
                <video ref={videoRef} src={videoUrl}
                  onLoadedMetadata={handleMeta} onTimeUpdate={handleTimeUpdate}
                  onError={() => setError("Gagal memuat video.")}
                  onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)}
                  className="max-w-full max-h-full object-contain"
                  style={{ transform: previewTransform, filter: previewFilter,
                    ...(edit.cropEnabled && (edit.crop.w < 1 || edit.crop.h < 1) ? {
                      clipPath: `inset(${edit.crop.y * 100}% ${(1 - edit.crop.x - edit.crop.w) * 100}% ${(1 - edit.crop.y - edit.crop.h) * 100}% ${edit.crop.x * 100}%)`,
                    } : {})
                  }}
                />
                {/* Crop overlay */}
                {activeTool === "crop" && edit.cropEnabled && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute" style={{
                      left: `${edit.crop.x * 100}%`, top: `${edit.crop.y * 100}%`,
                      width: `${edit.crop.w * 100}%`, height: `${edit.crop.h * 100}%`,
                      border: "2px solid #00D9FF", boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)",
                    }}>
                      {["-top-2 -left-2", "-top-2 -right-2", "-bottom-2 -left-2", "-bottom-2 -right-2"].map((p, i) => (
                        <div key={i} className={`absolute ${p} w-4 h-4 bg-cyan-400 rounded-sm`} />
                      ))}
                    </div>
                  </div>
                )}
                {/* Play / Pause button */}
                <button onClick={togglePlay}
                  className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 active:opacity-100 transition-opacity">
                  <div className="w-14 h-14 bg-black/60 border-2 border-white/40 rounded-full flex items-center justify-center">
                    {isPlaying ? <Pause size={24} className="text-white" /> : <Play size={24} className="text-white fill-white" />}
                  </div>
                </button>
              </>
            ) : (
              <div onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center gap-4 cursor-pointer px-8 py-12">
                {sdkLoading ? (
                  <>
                    <Loader2 size={40} className="text-cyan-400 animate-spin" />
                    <div className="text-center">
                      <p className="text-white font-semibold">Menyiapkan Editor...</p>
                      <p className="text-gray-500 text-sm mt-1">Mohon tunggu sebentar</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-gray-700 flex items-center justify-center">
                      <Play size={32} className="text-gray-600 fill-gray-600" />
                    </div>
                    <div className="text-center">
                      <p className="text-white font-bold text-lg">Tambah Video</p>
                      <p className="text-gray-500 text-sm mt-1">MP4 · MOV · WebM · AVI</p>
                    </div>
                    {sdkReady && (
                      <span className="text-xs text-green-400 px-3 py-1 border border-green-400/40 rounded-full">
                        ✓ Editor Siap
                      </span>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* ── Timeline ── */}
          <div className="flex-shrink-0 px-4 py-2 bg-black">
            <div className="relative h-8 bg-gray-900 rounded-lg overflow-hidden">
              {/* Trim zone */}
              <div className="absolute top-0 bottom-0 bg-cyan-400/20 border-l-2 border-r-2 border-cyan-400 rounded"
                style={{ left: `${pct(edit.startTime, duration)}%`, width: `${pct(edit.endTime - edit.startTime, duration)}%` }} />
              {/* Playhead */}
              <div className="absolute top-0 bottom-0 w-0.5 bg-white"
                style={{ left: `${pct(currentTime, duration)}%` }} />
              {/* Time labels */}
              <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
                <span className="text-gray-500 text-[10px] font-mono">{fmt(edit.startTime)}</span>
                <span className="text-gray-500 text-[10px] font-mono">{fmt(edit.endTime)}</span>
              </div>
            </div>
            {/* Scrub bar */}
            <input type="range" min={0} max={duration || 1} step={0.01} value={currentTime}
              onChange={e => { const v = +e.target.value; if (videoRef.current) videoRef.current.currentTime = v; setCurrentTime(v); }}
              className="w-full mt-1" style={{ height: 2, accentColor: "#00D9FF" }}
            />
          </div>

          {/* Upload input */}
          <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFile} className="hidden" />
        </div>

        {/* ══ TOOL BAR ══ */}
        <div className="flex-shrink-0 bg-black border-t border-gray-900">
          {/* Tool icons row */}
          <div className="flex overflow-x-auto">
            {/* Upload button */}
            <button onClick={() => { setActiveTool(null); setShowSettings(false); fileInputRef.current?.click(); }}
              className="flex flex-col items-center gap-1 px-5 py-3 flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity">
              <div className="w-7 h-7 rounded-lg border border-gray-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">+</span>
              </div>
              <span className="text-gray-400 text-[10px]">Video</span>
            </button>
            {/* Separator */}
            <div className="w-px bg-gray-800 my-3 flex-shrink-0" />
            {/* Tools */}
            {TOOL_LIST.map(t => (
              <button key={t.id}
                onClick={() => { setActiveTool(act => act === t.id ? null : t.id); setShowSettings(false); }}
                className={`flex flex-col items-center gap-1 px-4 py-3 flex-shrink-0 transition-all ${activeTool === t.id ? "opacity-100" : "opacity-60 hover:opacity-90"}`}>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${activeTool === t.id ? "bg-cyan-400" : ""}`}>
                  <span className={activeTool === t.id ? "text-black" : "text-white"}>{t.icon}</span>
                </div>
                <span className={`text-[10px] font-medium ${activeTool === t.id ? "text-cyan-400" : "text-gray-400"}`}>{t.label}</span>
              </button>
            ))}
          </div>

          {/* ── Tool Panel (slides up) ── */}
          <div className={`overflow-hidden transition-all duration-300 ${activeTool ? "max-h-64" : "max-h-0"}`}>
            <div className="bg-gray-950 border-t border-gray-800 px-4 py-4 space-y-4">

              {/* TRIM */}
              {activeTool === "trim" && (
                <div className="space-y-3">
                  <div className="flex justify-between text-xs text-gray-400 font-mono">
                    <span>Mulai: <b className="text-cyan-400">{fmt(edit.startTime)}</b></span>
                    <span>Durasi: <b className="text-green-400">{fmt(edit.endTime - edit.startTime)}</b></span>
                    <span>Akhir: <b className="text-cyan-400">{fmt(edit.endTime)}</b></span>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-[11px] text-gray-500 mb-1"><span>Waktu Mulai</span><span className="font-mono text-cyan-400">{fmt(edit.startTime)}</span></div>
                      <input type="range" min={0} max={duration} step={0.1} value={edit.startTime}
                        onMouseUp={e => applyEdit({ startTime: +( e.target as HTMLInputElement).value })}
                        onTouchEnd={e => applyEdit({ startTime: +(e.target as HTMLInputElement).value })}
                        onChange={e => { const v = +e.target.value; if (v < edit.endTime) setEdit(p => ({ ...p, startTime: v })); }}
                        className="w-full h-1 rounded-full appearance-none cursor-pointer bg-gray-800" style={{ accentColor: "#00D9FF" }} />
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] text-gray-500 mb-1"><span>Waktu Akhir</span><span className="font-mono text-cyan-400">{fmt(edit.endTime)}</span></div>
                      <input type="range" min={0} max={duration} step={0.1} value={edit.endTime}
                        onMouseUp={e => applyEdit({ endTime: +(e.target as HTMLInputElement).value })}
                        onTouchEnd={e => applyEdit({ endTime: +(e.target as HTMLInputElement).value })}
                        onChange={e => { const v = +e.target.value; if (v > edit.startTime) setEdit(p => ({ ...p, endTime: v })); }}
                        className="w-full h-1 rounded-full appearance-none cursor-pointer bg-gray-800" style={{ accentColor: "#00D9FF" }} />
                    </div>
                  </div>
                  <button onClick={() => applyEdit({ startTime: 0, endTime: duration })}
                    className="text-gray-500 text-xs flex items-center gap-1 hover:text-gray-300">
                    <RefreshCw size={11} /> Reset Trim
                  </button>
                </div>
              )}

              {/* CROP */}
              {activeTool === "crop" && (
                <div className="space-y-3">
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {ASPECT_RATIOS.map(ar => (
                      <button key={ar.value} onClick={() => applyCropAR(ar.value)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap flex-shrink-0 transition-all ${edit.cropAR === ar.value && edit.cropEnabled ? "bg-cyan-400 text-black" : "border border-gray-700 text-gray-300"}`}>
                        {ar.label}
                      </button>
                    ))}
                    {edit.cropEnabled && (
                      <button onClick={() => applyEdit({ cropEnabled: false, cropAR: "free", crop: { x: 0, y: 0, w: 1, h: 1 } })}
                        className="px-3 py-1.5 rounded-full text-xs border border-red-500/50 text-red-400 whitespace-nowrap flex-shrink-0">Reset</button>
                    )}
                  </div>
                  {edit.cropEnabled && (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      {[
                        { label: "X", key: "x" as const, max: 1 - edit.crop.w },
                        { label: "Y", key: "y" as const, max: 1 - edit.crop.h },
                        { label: "Lebar", key: "w" as const, max: 1 - edit.crop.x },
                        { label: "Tinggi", key: "h" as const, max: 1 - edit.crop.y },
                      ].map(f => (
                        <div key={f.key}>
                          <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                            <span>{f.label}</span><span className="font-mono text-cyan-400">{Math.round(edit.crop[f.key] * 100)}%</span>
                          </div>
                          <input type="range" min={0.01} max={f.max} step={0.01} value={edit.crop[f.key]}
                            onChange={e => setEdit(p => ({ ...p, crop: { ...p.crop, [f.key]: +e.target.value } }))}
                            onMouseUp={e => applyEdit({ crop: { ...edit.crop, [f.key]: +(e.target as HTMLInputElement).value } })}
                            className="w-full h-1 rounded-full appearance-none cursor-pointer bg-gray-800" style={{ accentColor: "#00D9FF" }} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ROTATE */}
              {activeTool === "rotate" && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    {[0, 90, 180, 270].map(deg => (
                      <button key={deg} onClick={() => applyEdit({ rotation: deg })}
                        className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${edit.rotation === deg ? "bg-cyan-400 text-black" : "border border-gray-700 text-gray-400"}`}>
                        {deg}°
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => applyEdit({ flipH: !edit.flipH })}
                      className={`flex-1 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${edit.flipH ? "bg-cyan-400 text-black" : "border border-gray-700 text-gray-400"}`}>
                      <FlipHorizontal2 size={14} /> Horizontal
                    </button>
                    <button onClick={() => applyEdit({ flipV: !edit.flipV })}
                      className={`flex-1 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${edit.flipV ? "bg-cyan-400 text-black" : "border border-gray-700 text-gray-400"}`}>
                      <FlipVertical2 size={14} /> Vertikal
                    </button>
                  </div>
                </div>
              )}

              {/* SPEED */}
              {activeTool === "speed" && (
                <div className="space-y-3">
                  <div className="text-center">
                    <span className="text-3xl font-black text-white">{edit.speed}</span>
                    <span className="text-gray-400 text-sm ml-1">×</span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {SPEED_OPTIONS.map(s => (
                      <button key={s} onClick={() => applyEdit({ speed: s })}
                        className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap flex-shrink-0 transition-all ${edit.speed === s ? "bg-cyan-400 text-black" : "border border-gray-700 text-gray-300"}`}>
                        {s}×
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* FILTER */}
              {activeTool === "filter" && (
                <div className="space-y-3">
                  {[
                    { label: "Kecerahan", key: "brightness" as const, color: "#fbbf24" },
                    { label: "Kontras",   key: "contrast"   as const, color: "#a78bfa" },
                    { label: "Saturasi",  key: "saturation" as const, color: "#34d399" },
                  ].map(f => (
                    <div key={f.key} className="flex items-center gap-3">
                      <span className="text-gray-400 text-xs w-20 flex-shrink-0">{f.label}</span>
                      <input type="range" min={-50} max={50} step={1} value={edit[f.key]}
                        onChange={e => setEdit(p => ({ ...p, [f.key]: +e.target.value }))}
                        onMouseUp={e => applyEdit({ [f.key]: +(e.target as HTMLInputElement).value })}
                        onTouchEnd={e => applyEdit({ [f.key]: +(e.target as HTMLInputElement).value })}
                        className="flex-1 h-1 rounded-full appearance-none cursor-pointer bg-gray-800"
                        style={{ accentColor: f.color }} />
                      <span className="font-mono text-xs w-8 text-right" style={{ color: f.color }}>
                        {edit[f.key] > 0 ? "+" : ""}{edit[f.key]}
                      </span>
                    </div>
                  ))}
                  <button onClick={() => applyEdit({ brightness: 0, contrast: 0, saturation: 0 })}
                    className="text-gray-500 text-xs flex items-center gap-1 hover:text-gray-300">
                    <RefreshCw size={11} /> Reset
                  </button>
                </div>
              )}

              {/* AUDIO */}
              {activeTool === "audio" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-semibold">Audio</span>
                    <button onClick={() => applyEdit({ isMuted: !edit.isMuted })}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${edit.isMuted ? "bg-red-500/20 border border-red-500 text-red-400" : "bg-cyan-400/10 border border-cyan-400/40 text-cyan-400"}`}>
                      {edit.isMuted ? <><VolumeX size={16} /> Mute</> : <><Volume2 size={16} /> Aktif</>}
                    </button>
                  </div>
                  {!edit.isMuted && (
                    <div>
                      <div className="flex justify-between text-xs text-gray-400 mb-2">
                        <span>Volume</span>
                        <span className="font-mono text-cyan-400 font-bold">{Math.round(edit.volume * 100)}%</span>
                      </div>
                      <input type="range" min={0} max={2} step={0.05} value={edit.volume}
                        onChange={e => setEdit(p => ({ ...p, volume: +e.target.value }))}
                        onMouseUp={e => applyEdit({ volume: +(e.target as HTMLInputElement).value })}
                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-gray-800"
                        style={{ accentColor: "#00D9FF" }} />
                      <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                        <span>0%</span><span className="text-cyan-400/60">100%</span><span>200%</span>
                      </div>
                      <p className="text-gray-600 text-[10px] mt-1">Di atas 100% akan memperkuat suara saat ekspor</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Export result download */}
          {outputUrl && (
            <div className="px-4 py-2 border-t border-gray-900">
              <a href={outputUrl} download="simplex-video.mp4"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-black text-sm font-bold"
                style={{ background: "linear-gradient(90deg,#00D9FF,#22c55e)" }}>
                <Check size={16} /> Unduh Hasil Video (MP4)
              </a>
            </div>
          )}
        </div>

        {/* Error toast */}
        {error && (
          <div className="absolute bottom-32 left-4 right-4 bg-red-900 border border-red-700 rounded-xl px-4 py-3 flex items-center justify-between z-50">
            <span className="text-red-200 text-sm">{error}</span>
            <button onClick={() => setError("")}><X size={16} className="text-red-400" /></button>
          </div>
        )}
      </div>
    </div>
  );
}
