import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  ChevronLeft, Upload, Sparkles, Download, X,
  ChevronUp, Zap, User, Trees, Layers,
} from "lucide-react";
import FilerobotImageEditor from "filerobot-image-editor";

const AI_PRESETS = [
  { icon: <Layers size={20} />,  label: "Product",  desc: "Optimalkan foto produk" },
  { icon: <User size={20} />,    label: "Portrait", desc: "Perhalus kulit & wajah" },
  { icon: <Trees size={20} />,   label: "Nature",   desc: "Perkaya warna alam" },
  { icon: <Zap size={20} />,     label: "Graphic",  desc: "Tingkatkan ketajaman" },
];

export default function WorkspacePhoto() {
  const [, setLocation] = useLocation();
  const containerRef  = useRef<HTMLDivElement>(null);
  const editorRef     = useRef<any>(null);
  const fileInputRef  = useRef<HTMLInputElement>(null);

  const [imageUrl, setImageUrl] = useState(
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&h=800&fit=crop"
  );
  const [showAI, setShowAI]       = useState(false);
  const [aiLoading, setAiLoading] = useState<string | null>(null);

  // ─── Init / reinit Filerobot ───────────────────────────────────────────────
  const initEditor = useCallback(() => {
    if (!containerRef.current) return;

    if (editorRef.current) {
      try { editorRef.current.terminate?.(); } catch { /* ignore */ }
      editorRef.current = null;
    }

    // Clear container children before re-mount
    containerRef.current.innerHTML = "";

    const config: any = {
      source: imageUrl,

      onSave: (_state: any, canvas: HTMLCanvasElement) => {
        const link = document.createElement("a");
        link.href = canvas.toDataURL("image/png");
        link.download = "simplex-photo.png";
        link.click();
      },
      onClose: () => { /* keep editor mounted */ },

      // ── Dark / Neon theme ──────────────────────────────────────────────────
      theme: {
        palette: {
          "bg-primary":        "#0a0a0a",
          "bg-secondary":      "#111111",
          "bg-primary-active": "#1a1a1a",
          "bg-secondary-active":"#222222",
          "text-primary":      "#ffffff",
          "text-secondary":    "#a0a0a0",
          "accent-primary":    "#00D9FF",
          "accent-primary-active": "#00b8d9",
          "icons-primary":     "#ffffff",
          "icons-secondary":   "#a0a0a0",
          "border-primary":    "#2a2a2a",
          "border-secondary":  "#1a1a1a",
          "warning":           "#f59e0b",
          "error":             "#ef4444",
          "link-primary":      "#00D9FF",
          "link-primary-active":"#00b8d9",
          "btn-primary-text":  "#000000",
          "btn-disabled-text": "#505050",
          "tooltip-bg":        "#1a1a1a",
          "tooltip-text":      "#ffffff",
        },
        typography: {
          fontFamily: "Inter, system-ui, sans-serif",
        },
      },

      // ── Layout (simple = bottom toolbar, mobile-friendly) ──────────────────
      layout: "default",

      // ── Tools ─────────────────────────────────────────────────────────────
      tools: ["Adjust", "Finetune", "Filters", "Watermark", "Annotate", "Resize"],

      // ── Misc ──────────────────────────────────────────────────────────────
      showBackButton:    false,
      useCloudimage:     false,
      savingPixelRatio:  4,
      previewPixelRatio: window.devicePixelRatio || 2,

      // Disable built-in close so our shell handles navigation
      closeAfterSave: false,
    };

    try {
      const editor = new FilerobotImageEditor(containerRef.current, config);
      editorRef.current = editor;
      editor.render();
    } catch (e) {
      console.error("Filerobot init error:", e);
    }
  }, [imageUrl]);

  useEffect(() => {
    const timer = setTimeout(initEditor, 80);
    return () => clearTimeout(timer);
  }, [initEditor]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try { editorRef.current?.terminate?.(); } catch { /* ignore */ }
    };
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { if (ev.target?.result) setImageUrl(ev.target.result as string); };
    reader.readAsDataURL(file);
  };

  const handleAIPreset = async (label: string) => {
    setAiLoading(label);
    // Placeholder — will be replaced by HitPaw/PicsArt API
    await new Promise(r => setTimeout(r, 1500));
    setAiLoading(null);
  };

  const handleBack = () => {
    try { editorRef.current?.terminate?.(); } catch { /* ignore */ }
    setLocation("/");
  };

  return (
    <div className="h-screen bg-black flex flex-col items-center justify-center">
      <div className="w-full max-w-md h-full flex flex-col bg-black overflow-hidden relative">

        {/* ══ TOP BAR ══ */}
        <div className="flex items-center justify-between px-3 py-2 bg-[#0a0a0a] border-b border-gray-900 flex-shrink-0 z-20">
          {/* Back */}
          <button onClick={handleBack}
            className="p-2 rounded-full hover:bg-gray-900 active:bg-gray-800 transition-colors">
            <ChevronLeft size={22} className="text-white" />
          </button>

          {/* Title */}
          <span className="text-white text-sm font-bold tracking-wider">PHOTO EDITOR</span>

          {/* Right actions */}
          <div className="flex items-center gap-1">
            {/* AI button */}
            <button
              onClick={() => setShowAI(s => !s)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                showAI
                  ? "bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-black"
                  : "border border-gray-700 text-gray-300 hover:border-cyan-400/50"
              }`}>
              <Sparkles size={13} />
              AI
            </button>
            {/* Upload button */}
            <button onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-full hover:bg-gray-900 active:bg-gray-800 transition-colors">
              <Upload size={18} className="text-cyan-400" />
            </button>
          </div>

          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
        </div>

        {/* ══ AI PANEL (slides down) ══ */}
        <div className={`flex-shrink-0 bg-[#0d0d0d] border-b border-gray-800 overflow-hidden transition-all duration-300 z-10 ${showAI ? "max-h-48" : "max-h-0"}`}>
          <div className="px-4 pt-3 pb-4">
            <p className="text-gray-500 text-xs mb-3 uppercase tracking-wider font-semibold">Poles AI — Segera hadir dengan HitPaw & PicsArt</p>
            <div className="grid grid-cols-4 gap-2">
              {AI_PRESETS.map(p => (
                <button key={p.label}
                  onClick={() => handleAIPreset(p.label)}
                  disabled={!!aiLoading}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border border-gray-800 hover:border-cyan-400/40 hover:bg-cyan-400/5 active:scale-95 transition-all disabled:opacity-50">
                  <span className="text-cyan-400">
                    {aiLoading === p.label ? (
                      <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                    ) : p.icon}
                  </span>
                  <span className="text-gray-300 text-[10px] font-semibold">{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ══ FILEROBOT EDITOR ══ */}
        <div
          ref={containerRef}
          className="flex-1 min-h-0 w-full overflow-hidden"
          style={{ background: "#0a0a0a" }}
        />
      </div>
    </div>
  );
}
