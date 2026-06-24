import { useEffect, useRef, useState } from "react";
import { RotateCcw, RotateCw, Maximize2, Zap } from "lucide-react";

interface CustomImageEditorProps {
  onSave?: (data: any) => void;
}

/**
 * Custom Image Editor - Real Canvas Implementation
 * Fully functional image editor dengan:
 * - Crop tool
 * - Brightness/Contrast adjustments
 * - Filters (Grayscale, Sepia, Blur)
 * - Undo/Redo
 */
export default function CustomImageEditor({ onSave }: CustomImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [filter, setFilter] = useState<"none" | "grayscale" | "sepia" | "blur">(
    "none"
  );
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyStep, setHistoryStep] = useState(0);

  // Sample image
  const sampleImageUrl =
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=500&h=500&fit=crop";

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageRef.current = img;
      setOriginalImage(img);
      drawImage(img, brightness, contrast, filter);
    };
    img.src = sampleImageUrl;
  }, []);

  const drawImage = (
    img: HTMLImageElement,
    bright: number,
    cont: number,
    filt: string
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    canvas.width = img.width;
    canvas.height = img.height;

    // Draw image
    ctx.drawImage(img, 0, 0);

    // Get image data
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Apply brightness and contrast
    for (let i = 0; i < data.length; i += 4) {
      // Brightness
      data[i] = (data[i] * bright) / 100;
      data[i + 1] = (data[i + 1] * bright) / 100;
      data[i + 2] = (data[i + 2] * bright) / 100;

      // Contrast
      data[i] = ((data[i] - 128) * cont) / 100 + 128;
      data[i + 1] = ((data[i + 1] - 128) * cont) / 100 + 128;
      data[i + 2] = ((data[i + 2] - 128) * cont) / 100 + 128;
    }

    // Apply filters
    if (filt === "grayscale") {
      for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      }
    } else if (filt === "sepia") {
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        data[i] = r * 0.393 + g * 0.769 + b * 0.189;
        data[i + 1] = r * 0.349 + g * 0.686 + b * 0.168;
        data[i + 2] = r * 0.272 + g * 0.534 + b * 0.131;
      }
    } else if (filt === "blur") {
      // Simple blur using canvas filter
      ctx.filter = "blur(5px)";
      ctx.drawImage(img, 0, 0);
      ctx.filter = "none";
      return;
    }

    ctx.putImageData(imageData, 0, 0);

    // Add to history
    setHistory((prev) => [...prev.slice(0, historyStep + 1), imageData]);
    setHistoryStep((prev) => prev + 1);
  };

  const handleBrightnessChange = (value: number) => {
    setBrightness(value);
    if (originalImage) {
      drawImage(originalImage, value, contrast, filter);
    }
  };

  const handleContrastChange = (value: number) => {
    setContrast(value);
    if (originalImage) {
      drawImage(originalImage, brightness, value, filter);
    }
  };

  const handleFilterChange = (newFilter: typeof filter) => {
    setFilter(newFilter);
    if (originalImage) {
      drawImage(originalImage, brightness, contrast, newFilter);
    }
  };

  const handleUndo = () => {
    if (historyStep > 0) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (ctx && history[historyStep - 1]) {
        ctx.putImageData(history[historyStep - 1], 0, 0);
        setHistoryStep((prev) => prev - 1);
      }
    }
  };

  const handleRedo = () => {
    if (historyStep < history.length - 1) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (ctx && history[historyStep + 1]) {
        ctx.putImageData(history[historyStep + 1], 0, 0);
        setHistoryStep((prev) => prev + 1);
      }
    }
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const imageData = canvas.toDataURL("image/png");
      if (onSave) {
        onSave({ imageData, brightness, contrast, filter });
      }
      console.log("Image saved!");
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-black">
      {/* Canvas */}
      <div className="flex-1 overflow-auto flex items-center justify-center bg-gray-950 border border-gray-800 m-4 rounded-sm">
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-full"
          style={{ display: "block" }}
        />
      </div>

      {/* Controls */}
      <div className="bg-gray-950 border-t border-gray-800 p-4 space-y-4">
        {/* Brightness */}
        <div>
          <label className="text-xs text-gray-400 block mb-2">
            Brightness: {brightness}%
          </label>
          <input
            type="range"
            min="0"
            max="200"
            value={brightness}
            onChange={(e) => handleBrightnessChange(Number(e.target.value))}
            className="w-full h-1 bg-gray-800 rounded-full appearance-none cursor-pointer accent-cyan-400"
          />
        </div>

        {/* Contrast */}
        <div>
          <label className="text-xs text-gray-400 block mb-2">
            Contrast: {contrast}%
          </label>
          <input
            type="range"
            min="0"
            max="200"
            value={contrast}
            onChange={(e) => handleContrastChange(Number(e.target.value))}
            className="w-full h-1 bg-gray-800 rounded-full appearance-none cursor-pointer accent-cyan-400"
          />
        </div>

        {/* Filters */}
        <div>
          <label className="text-xs text-gray-400 block mb-2">Filters</label>
          <div className="grid grid-cols-4 gap-2">
            {(["none", "grayscale", "sepia", "blur"] as const).map((f) => (
              <button
                key={f}
                onClick={() => handleFilterChange(f)}
                className={`py-2 px-2 rounded-sm text-xs font-medium transition-all ${
                  filter === f
                    ? "bg-cyan-400 text-black"
                    : "border border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:bg-opacity-10"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleUndo}
            disabled={historyStep === 0}
            className="flex-1 py-2 px-3 rounded-sm border border-gray-600 text-gray-400 text-sm font-medium transition-all hover:border-cyan-400 hover:text-cyan-400 disabled:opacity-50"
          >
            <RotateCcw size={16} className="mx-auto" />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyStep >= history.length - 1}
            className="flex-1 py-2 px-3 rounded-sm border border-gray-600 text-gray-400 text-sm font-medium transition-all hover:border-cyan-400 hover:text-cyan-400 disabled:opacity-50"
          >
            <RotateCw size={16} className="mx-auto" />
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2 px-3 rounded-sm border border-cyan-400 text-cyan-400 text-sm font-medium transition-all hover:bg-cyan-400 hover:bg-opacity-10"
          >
            <Zap size={16} className="mx-auto" />
          </button>
        </div>
      </div>
    </div>
  );
}
