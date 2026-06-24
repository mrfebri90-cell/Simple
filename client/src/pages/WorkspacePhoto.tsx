import { useState } from "react";
import { useLocation } from "wouter";
import { X, RotateCcw, RotateCw, Download, ChevronUp } from "lucide-react";

/**
 * Workspace Photo - Simplex Editor
 * Design: Neon Cyberpunk
 * 
 * Layout: Mobile-first vertical stack
 * - Top bar: Back, Undo, Redo, Save buttons
 * - Center: Filerobot Image Editor placeholder (will be integrated)
 * - Bottom: Navigation tabs (Edit, Poles AI)
 * 
 * TODO: Integrate Filerobot Image Editor SDK
 */
export default function WorkspacePhoto() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"edit" | "ai">("edit");
  const [showAIPanel, setShowAIPanel] = useState(false);

  const handleBack = () => {
    setLocation("/");
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

          <div className="flex items-center gap-2">
            <button
              className="p-2 hover:bg-gray-900 rounded-sm transition-colors"
              title="Undo"
            >
              <RotateCcw size={20} className="text-gray-400" />
            </button>
            <button
              className="p-2 hover:bg-gray-900 rounded-sm transition-colors"
              title="Redo"
            >
              <RotateCw size={20} className="text-gray-400" />
            </button>
            <button
              className="p-2 hover:bg-gray-900 rounded-sm transition-colors"
              title="Save"
            >
              <Download size={20} className="text-cyan-400" />
            </button>
          </div>
        </div>

        {/* Editor Area - Placeholder for Filerobot SDK */}
        <div className="flex-1 bg-gray-950 border border-gray-800 m-4 rounded-sm flex items-center justify-center overflow-hidden">
          <div className="text-center">
            <div className="text-gray-500 text-sm mb-2">
              Filerobot Image Editor
            </div>
            <div className="text-gray-600 text-xs">
              (SDK akan diintegrasikan di sini)
            </div>
          </div>
        </div>

        {/* Bottom Navigation Bar */}
        <div className="border-t border-gray-800 bg-gray-950">
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
            <div className="bg-gray-900 border-t border-gray-800 p-4 animate-in slide-in-from-bottom">
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
