import { useState, useRef, useEffect } from "react";
import { Crop, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface AvatarCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  onCropComplete: (croppedDataUrl: string) => void;
  onCancel?: () => void;
}

export function AvatarCropDialog({
  open,
  onOpenChange,
  imageUrl,
  onCropComplete,
  onCancel,
}: AvatarCropDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const CANVAS_SIZE = 256; // Square canvas for avatar
  const CROP_SIZE = 200; // Visible crop area (center)

  useEffect(() => {
    if (!open) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setImageLoaded(false);
      return;
    }

    const img = new Image();
    img.onload = () => {
      if (imageRef.current) {
        imageRef.current.src = imageUrl;
      }
      setImageLoaded(true);
      // Auto-fit image to crop area
      redrawCanvas(img, 1, { x: 0, y: 0 });
    };
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
  }, [open, imageUrl]);

  const redrawCanvas = (
    img: HTMLImageElement,
    z: number,
    p: { x: number; y: number }
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Calculate image dimensions to fit in crop area
    const aspectRatio = img.width / img.height;
    let drawWidth = CROP_SIZE * z;
    let drawHeight = CROP_SIZE * z;

    if (aspectRatio > 1) {
      drawHeight = drawWidth / aspectRatio;
    } else {
      drawWidth = drawHeight * aspectRatio;
    }

    // Center position + pan offset
    const x = CANVAS_SIZE / 2 - drawWidth / 2 + p.x;
    const y = CANVAS_SIZE / 2 - drawHeight / 2 + p.y;

    // Draw image
    ctx.drawImage(img, x, y, drawWidth, drawHeight);

    // Draw crop circle guide
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CROP_SIZE / 2, 0, Math.PI * 2);
    ctx.stroke();

    // Draw corner guides
    ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
    ctx.lineWidth = 3;
    const guideSize = 20;
    const corners = [
      { x: guideSize, y: guideSize }, // Top-left
      { x: CANVAS_SIZE - guideSize, y: guideSize }, // Top-right
      { x: guideSize, y: CANVAS_SIZE - guideSize }, // Bottom-left
      { x: CANVAS_SIZE - guideSize, y: CANVAS_SIZE - guideSize }, // Bottom-right
    ];

    corners.forEach(({ x: cx, y: cy }) => {
      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(cx - guideSize / 2, cy);
      ctx.lineTo(cx + guideSize / 2, cy);
      ctx.stroke();

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(cx, cy - guideSize / 2);
      ctx.lineTo(cx, cy + guideSize / 2);
      ctx.stroke();
    });
  };

  useEffect(() => {
    if (!imageLoaded || !imageRef.current) return;
    redrawCanvas(imageRef.current, zoom, pan);
  }, [zoom, pan, imageLoaded]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - pan.x,
      y: e.clientY - pan.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const maxPan = (CROP_SIZE * zoom) / 2;
    setPan({
      x: Math.max(-maxPan, Math.min(maxPan, e.clientX - dragStart.x)),
      y: Math.max(-maxPan, Math.min(maxPan, e.clientY - dragStart.y)),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => Math.max(1, Math.min(3, z * zoomDelta)));
  };

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleCrop = async () => {
    if (!canvasRef.current) return;
    setIsProcessing(true);

    try {
      // Get the canvas content and crop to circle
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = CROP_SIZE;
      tempCanvas.height = CROP_SIZE;
      const tempCtx = tempCanvas.getContext("2d");
      if (!tempCtx) throw new Error("Could not get canvas context");

      // Draw circular crop
      tempCtx.fillStyle = "#ffffff";
      tempCtx.fillRect(0, 0, CROP_SIZE, CROP_SIZE);

      // Create circular mask
      tempCtx.beginPath();
      tempCtx.arc(CROP_SIZE / 2, CROP_SIZE / 2, CROP_SIZE / 2, 0, Math.PI * 2);
      tempCtx.clip();

      // Draw the relevant portion from the main canvas
      const offset = (CANVAS_SIZE - CROP_SIZE) / 2;
      tempCtx.drawImage(
        canvasRef.current,
        offset,
        offset,
        CROP_SIZE,
        CROP_SIZE,
        0,
        0,
        CROP_SIZE,
        CROP_SIZE
      );

      // Convert to data URL
      const dataUrl = tempCanvas.toDataURL("image/png");
      onCropComplete(dataUrl);
      onOpenChange(false);
    } catch (error) {
      console.error("Error cropping image:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md anim-pop">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crop className="w-5 h-5" />
            Crop avatar
          </DialogTitle>
          <DialogDescription>
            Adjust the zoom and position to frame your avatar. Drag to move, scroll to zoom.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Canvas area */}
          <div className="relative bg-card border-2 border-border rounded-lg overflow-hidden">
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
              className={cn(
                "w-full aspect-square cursor-move transition-opacity duration-200",
                isDragging ? "opacity-90" : "opacity-100",
                "select-none"
              )}
            />
            {/* Loading indicator */}
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-card/50">
                <div className="text-sm text-muted-foreground anim-spin-slow">
                  Loading...
                </div>
              </div>
            )}
          </div>

          {/* Zoom slider */}
          <div className="space-y-2 anim-fade-in" style={{ animationDelay: "0.1s" }}>
            <Label className="text-xs">Zoom</Label>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground min-w-6">1x</span>
              <Slider
                value={[zoom]}
                onValueChange={(v) => setZoom(v[0])}
                min={1}
                max={3}
                step={0.1}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground min-w-8 text-right">
                {zoom.toFixed(1)}x
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 anim-fade-in" style={{ animationDelay: "0.15s" }}>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={isProcessing}
              className="flex-1 transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onCancel?.();
              }}
              disabled={isProcessing}
              className="flex-1 transition-all duration-200 hover:scale-105 active:scale-95"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCrop}
              disabled={!imageLoaded || isProcessing}
              className="flex-1 transition-all duration-200 hover:scale-105 active:scale-95"
            >
              {isProcessing ? "Cropping..." : "Apply"}
            </Button>
          </div>

          {/* Instructions */}
          <p className="text-xs text-muted-foreground leading-relaxed anim-fade-in" style={{ animationDelay: "0.2s" }}>
            💡 <strong>Drag</strong> to move the image • <strong>Scroll</strong> to zoom • 
            Your avatar will be circular
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
