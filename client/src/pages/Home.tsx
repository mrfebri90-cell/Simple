import { useLocation } from "wouter";
import { Play, Image } from "lucide-react";

/**
 * Home Screen - Simplex Editor
 * Design: Neon Cyberpunk
 * 
 * Layout: Vertical stack, centered mobile-first container
 * - Logo at top center
 * - Two large action buttons in center
 * - Minimal, direct, no clutter
 */
export default function Home() {
  const [, setLocation] = useLocation();

  const handleNewVideoProject = () => {
    setLocation("/workspace/video");
  };

  const handleNewPhotoProject = () => {
    setLocation("/workspace/photo");
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4">
      {/* Mobile-first container: max-w-md on desktop, full width on mobile */}
      <div className="w-full max-w-md flex flex-col items-center justify-center gap-12">
        
        {/* Logo Section */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-2" style={{ fontFamily: "'Space Mono', monospace" }}>
            SIMPLEX
          </h1>
          <p className="text-sm text-gray-400 tracking-widest">CREATIVE STUDIO</p>
        </div>

        {/* Action Buttons Section */}
        <div className="w-full flex flex-col gap-6">
          
          {/* New Video Project Button */}
          <button
            onClick={handleNewVideoProject}
            className="group relative w-full py-6 px-6 rounded-sm border-2 border-[#00D9FF] bg-transparent text-white font-semibold text-lg transition-all duration-200 overflow-hidden"
            style={{
              boxShadow: "0 0 10px rgba(0, 217, 255, 0.3)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "0 0 20px rgba(0, 217, 255, 0.6), inset 0 0 10px rgba(0, 217, 255, 0.1)";
              e.currentTarget.style.background = "rgba(0, 217, 255, 0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "0 0 10px rgba(0, 217, 255, 0.3)";
              e.currentTarget.style.background = "transparent";
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = "scale(0.97)";
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            <div className="flex items-center justify-center gap-3">
              <Play size={24} className="fill-current" />
              <span>+ Proyek Baru Video</span>
            </div>
          </button>

          {/* New Photo Project Button */}
          <button
            onClick={handleNewPhotoProject}
            className="group relative w-full py-6 px-6 rounded-sm border-2 border-[#FF00FF] bg-transparent text-white font-semibold text-lg transition-all duration-200 overflow-hidden"
            style={{
              boxShadow: "0 0 10px rgba(255, 0, 255, 0.3)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "0 0 20px rgba(255, 0, 255, 0.6), inset 0 0 10px rgba(255, 0, 255, 0.1)";
              e.currentTarget.style.background = "rgba(255, 0, 255, 0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "0 0 10px rgba(255, 0, 255, 0.3)";
              e.currentTarget.style.background = "transparent";
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = "scale(0.97)";
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            <div className="flex items-center justify-center gap-3">
              <Image size={24} />
              <span>+ Proyek Baru Foto</span>
            </div>
          </button>
        </div>

        {/* Footer Info */}
        <div className="text-center text-xs text-gray-500 mt-8">
          <p>Edit faster. Create better. Ship today.</p>
        </div>
      </div>
    </div>
  );
}
