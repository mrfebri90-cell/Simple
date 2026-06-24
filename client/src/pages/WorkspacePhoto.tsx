import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { X, Download, ChevronUp } from "lucide-react";
import FilerobotImageEditor from "filerobot-image-editor";

/**
 * Workspace Photo - Simplex Editor
 * Design: Neon Cyberpunk Dark Mode Mobile
 * 
 * Menggunakan SDK ASLI: Filerobot Image Editor
 * - Dark Mode dengan filter invert
 * - Layout Mobile (toolbar horizontal di bawah)
 * - Canvas editor bawaan SDK dengan tools
 */
export default function WorkspacePhoto() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"edit" | "ai">("edit");
  const [showAIPanel, setShowAIPanel] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<string>(
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=500&h=500&fit=crop"
  );

  // Inisialisasi Filerobot Editor dengan Dark Mode Mobile
  useEffect(() => {
    if (!containerRef.current) return;

    const initializeEditor = () => {
      try {
        // Hapus editor lama jika ada
        if (editorRef.current) {
          editorRef.current.terminate?.();
        }

        // Konfigurasi Filerobot
        const config: any = {
          source: selectedImage,
          onSave: (editorState: any, canvas: any) => {
            console.log("Image saved:", editorState);
            // Download hasil
            const link = document.createElement("a");
            link.href = canvas.toDataURL("image/png");
            link.download = "edited-image.png";
            link.click();
          },
          onClose: () => {
            console.log("Editor closed");
          },
          
          // Tools Configuration
          tools: {
            enabled: [
              "crop",
              "finetune",
              "filters",
              "adjust",
              "watermark",
              "annotate",
              "resize",
              "rotate",
              "flip",
            ],
          },
          
          // Mobile-specific settings
          showBackButton: false,
          savingPixelRatio: 1,
          previewPixelRatio: 1,
          minWidth: 100,
          minHeight: 100,
          maxWidth: 4000,
          maxHeight: 4000,
        };

        // Inisialisasi editor dengan container
        const editor = new FilerobotImageEditor(containerRef.current!, config);
        editorRef.current = editor;

        // Render editor
        editor.render();
      } catch (error) {
        console.error("Error initializing Filerobot:", error);
      }
    };

    // Delay untuk memastikan DOM siap
    const timer = setTimeout(initializeEditor, 100);
    return () => clearTimeout(timer);
  }, [selectedImage]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        setSelectedImage(imageUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBack = () => {
    if (editorRef.current) {
      editorRef.current.terminate?.();
    }
    setLocation("/");
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

          <h2 className="text-white font-semibold text-sm">Photo Editor</h2>

          <div className="flex items-center gap-2">
            {/* Upload File Button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 hover:bg-gray-900 rounded-sm transition-colors"
              title="Upload Image"
            >
              <Download size={20} className="text-cyan-400 rotate-180" />
            </button>
          </div>
        </div>

        {/* Editor Area - FILEROBOT SDK CANVAS - Dark Mode with Filter */}
        <div 
          ref={containerRef}
          className="flex-1 overflow-hidden bg-black"
          style={{ 
            minHeight: 0,
            width: "100%",
            filter: "invert(1) hue-rotate(180deg)",
          }}
        />

        {/* Bottom Navigation Bar */}
        <div className="border-t border-gray-800 bg-black flex-shrink-0">
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
              ✂️ Edit
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
            <div className="bg-gray-900 border-t border-gray-800 p-4 animate-in slide-in-from-bottom max-h-48 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-sm">AI Enhancement</h3>
                <button
                  onClick={() => setShowAIPanel(false)}
                  className="p-1 hover:bg-gray-800 rounded-sm"
                >
                  <ChevronUp size={16} className="text-gray-400" />
                </button>
              </div>

              {/* AI Options Grid */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  className="py-3 px-3 rounded-sm border border-cyan-400 text-white text-xs font-medium transition-all hover:bg-cyan-400 hover:bg-opacity-10"
                  style={{ boxShadow: "0 0 8px rgba(0, 217, 255, 0.2)" }}
                >
                  Product
                </button>
                <button
                  className="py-3 px-3 rounded-sm border border-cyan-400 text-white text-xs font-medium transition-all hover:bg-cyan-400 hover:bg-opacity-10"
                  style={{ boxShadow: "0 0 8px rgba(0, 217, 255, 0.2)" }}
                >
                  Portrait
                </button>
                <button
                  className="py-3 px-3 rounded-sm border border-cyan-400 text-white text-xs font-medium transition-all hover:bg-cyan-400 hover:bg-opacity-10"
                  style={{ boxShadow: "0 0 8px rgba(0, 217, 255, 0.2)" }}
                >
                  Nature
                </button>
                <button
                  className="py-3 px-3 rounded-sm border border-cyan-400 text-white text-xs font-medium transition-all hover:bg-cyan-400 hover:bg-opacity-10"
                  style={{ boxShadow: "0 0 8px rgba(0, 217, 255, 0.2)" }}
                >
                  Graphic
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
