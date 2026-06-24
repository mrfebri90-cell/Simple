import { useEffect, useRef } from "react";
import FilerobotImageEditor from "filerobot-image-editor";
import "filerobot-image-editor/style.css";

interface FileroboImageEditorProps {
  onSave?: (data: any) => void;
  onClose?: () => void;
}

/**
 * Filerobot Image Editor Component
 * Integrates Filerobot SDK with Dark Mode styling
 * 
 * Features:
 * - Crop, Adjustments, Filters
 * - Undo/Redo controls
 * - Save functionality
 */
export default function FileroboImageEditorComponent({
  onSave,
  onClose,
}: FileroboImageEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize Filerobot Image Editor
    const editor = new FilerobotImageEditor(
      containerRef.current,
      {
        source: "https://scaleflex.cloudimg.io/crop/300x300/q_auto/https://demo.cloudimg.io/height/500/n_o_ratio/sample.jpg",
        onSave: (editorState: any) => {
          console.log("Image saved:", editorState);
          if (onSave) onSave(editorState);
        },
        onClose: () => {
          console.log("Editor closed");
          if (onClose) onClose();
        },
      } as any
    );

    return () => {
      // Cleanup
    };
  }, [onSave, onClose]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ backgroundColor: "#000000" }}
    />
  );
}
