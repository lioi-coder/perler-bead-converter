import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';

interface Props {
  src: string;
  onConfirm: (dataUrl: string) => void;
  onCancel: () => void;
}

type DragMode = 'move' | 'resize' | null;

/**
 * Square-crop tool. Lets the user drag / resize a square selection on top
 * of the uploaded image, then produces a cropped PNG data URL at the image's
 * native resolution (capped at 1024 px per side to keep downstream work fast).
 */
const ImageCropper: React.FC<Props> = ({ src, onConfirm, onCancel }) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [renderSize, setRenderSize] = useState({ w: 0, h: 0 });
  const [crop, setCrop] = useState({ x: 0, y: 0, size: 0 });
  const dragRef = useRef<{
    mode: DragMode;
    startX: number;
    startY: number;
    start: { x: number; y: number; size: number };
  }>({ mode: null, startX: 0, startY: 0, start: { x: 0, y: 0, size: 0 } });

  // Initialize crop box to the largest centered square once the image renders.
  const handleImgLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    const w = img.clientWidth;
    const h = img.clientHeight;
    const size = Math.min(w, h);
    setRenderSize({ w, h });
    setCrop({ x: (w - size) / 2, y: (h - size) / 2, size });
  };

  const beginDrag = (e: React.MouseEvent, mode: Exclude<DragMode, null>) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      start: { ...crop },
    };
  };

  // Global listeners so dragging keeps working even if the cursor leaves the box.
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d.mode) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      const { w, h } = renderSize;

      if (d.mode === 'move') {
        const nx = Math.min(w - d.start.size, Math.max(0, d.start.x + dx));
        const ny = Math.min(h - d.start.size, Math.max(0, d.start.y + dy));
        setCrop({ x: nx, y: ny, size: d.start.size });
      } else {
        // Resize from bottom-right: keep square, take the larger of dx/dy so
        // diagonal drags feel responsive.
        const delta = Math.max(dx, dy);
        const maxSize = Math.min(w - d.start.x, h - d.start.y);
        const ns = Math.max(24, Math.min(maxSize, d.start.size + delta));
        setCrop({ x: d.start.x, y: d.start.y, size: ns });
      }
    };
    const onUp = () => {
      dragRef.current.mode = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [renderSize]);

  const handleConfirm = useCallback(() => {
    const img = imgRef.current;
    if (!img || renderSize.w === 0) return;
    // Translate viewport crop coords into the image's natural pixel space.
    const scale = img.naturalWidth / renderSize.w;
    const sx = crop.x * scale;
    const sy = crop.y * scale;
    const ss = crop.size * scale;

    const OUT_CAP = 1024;
    const outSize = Math.min(Math.round(ss), OUT_CAP);
    const canvas = document.createElement('canvas');
    canvas.width = outSize;
    canvas.height = outSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true;
    // @ts-ignore - imageSmoothingQuality is supported in modern browsers
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, sx, sy, ss, ss, 0, 0, outSize, outSize);
    onConfirm(canvas.toDataURL('image/png'));
  }, [crop, renderSize, onConfirm]);

  // Four dimming rectangles around the crop box (more robust than clip-path).
  const overlay = (
    <>
      <div
        className="absolute bg-black/55 pointer-events-none"
        style={{ left: 0, top: 0, width: '100%', height: crop.y }}
      />
      <div
        className="absolute bg-black/55 pointer-events-none"
        style={{
          left: 0,
          top: crop.y + crop.size,
          width: '100%',
          height: Math.max(0, renderSize.h - (crop.y + crop.size)),
        }}
      />
      <div
        className="absolute bg-black/55 pointer-events-none"
        style={{ left: 0, top: crop.y, width: crop.x, height: crop.size }}
      />
      <div
        className="absolute bg-black/55 pointer-events-none"
        style={{
          left: crop.x + crop.size,
          top: crop.y,
          width: Math.max(0, renderSize.w - (crop.x + crop.size)),
          height: crop.size,
        }}
      />
    </>
  );

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-zinc-500">
        拖动方框移动位置,拖右下角调整大小。最终只保留方框内的内容。
      </p>
      <div className="relative inline-block select-none max-w-full">
        <img
          ref={imgRef}
          src={src}
          onLoad={handleImgLoad}
          alt="待裁剪图片"
          className="max-w-full max-h-[60vh] block rounded-lg"
          draggable={false}
        />
        {renderSize.w > 0 && (
          <>
            {overlay}
            <div
              onMouseDown={(e) => beginDrag(e, 'move')}
              className="absolute border-2 border-white cursor-move"
              style={{
                left: crop.x,
                top: crop.y,
                width: crop.size,
                height: crop.size,
                boxShadow: '0 0 0 1px rgba(0,0,0,0.4)',
              }}
            >
              {/* rule-of-thirds guides */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 bottom-0 border-l border-white/40" style={{ left: '33.333%' }} />
                <div className="absolute top-0 bottom-0 border-l border-white/40" style={{ left: '66.666%' }} />
                <div className="absolute left-0 right-0 border-t border-white/40" style={{ top: '33.333%' }} />
                <div className="absolute left-0 right-0 border-t border-white/40" style={{ top: '66.666%' }} />
              </div>
              <div
                onMouseDown={(e) => beginDrag(e, 'resize')}
                className="absolute w-4 h-4 bg-white border border-zinc-500 rounded-sm cursor-nwse-resize"
                style={{ right: -8, bottom: -8 }}
              />
            </div>
          </>
        )}
      </div>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="px-5 py-2 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 flex items-center gap-2 transition-colors"
        >
          <X className="w-4 h-4" /> 取消
        </button>
        <button
          onClick={handleConfirm}
          className="px-5 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700 flex items-center gap-2 shadow-md shadow-orange-200 transition-colors"
        >
          <Check className="w-4 h-4" /> 应用裁剪
        </button>
      </div>
    </div>
  );
};

export default ImageCropper;
