import { useEffect, useRef, useState } from "react";
import FilerobotImageEditor from "filerobot-image-editor";

interface FilerobotEditorProps {
  onSave?: (data: any) => void;
  onClose?: () => void;
}

/**
 * Filerobot Image Editor Component - Real Implementation
 * Canvas editor yang benar-benar berfungsi dengan tools bawaan
 * - Crop, Adjustments, Filters, Undo/Redo
 */
export default function FilerobotEditor({
  onSave,
  onClose,
}: FilerobotEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    // Sample image dari Unsplash
    const sampleImageUrl =
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=500&h=500&fit=crop";

    // Konfigurasi Filerobot Editor
    const config: any = {
      source: sampleImageUrl,
      onSave: (editorState: any, canvas: any) => {
        console.log("Image saved:", editorState);
        if (onSave) onSave(editorState);
      },
      onClose: () => {
        console.log("Editor closed");
        if (onClose) onClose();
      },
      // Disable buttons yang tidak diperlukan
      showBackButton: false,
      // Theme configuration
      theme: {
        colors: {
          primaryBg: "#000000",
          secondaryBg: "#1a1a1a",
          tertiaryBg: "#333333",
          primaryBorder: "#00D9FF",
          text: "#FFFFFF",
          textMuted: "#B0B0B0",
          accent: "#00D9FF",
        },
      },
    };

    try {
      // Inisialisasi editor
      const editor = new FilerobotImageEditor(containerRef.current, config);
      editorRef.current = editor;
      
      // Render editor
      editor.render();
      
      setIsLoading(false);
    } catch (error) {
      console.error("Error initializing Filerobot:", error);
      setIsLoading(false);
    }

    return () => {
      // Cleanup
      if (editorRef.current) {
        try {
          editorRef.current.terminate?.();
        } catch (e) {
          console.error("Error terminating editor:", e);
        }
      }
    };
  }, [onSave, onClose]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{
        backgroundColor: "#000000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {isLoading && (
        <div className="text-center">
          <div className="text-cyan-400 text-sm mb-2">Loading Editor...</div>
          <div className="text-gray-600 text-xs">Initializing Filerobot</div>
        </div>
      )}
    </div>
  );
}
