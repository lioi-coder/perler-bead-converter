import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Download, MousePointer2, Eraser, ZoomIn, ZoomOut, RotateCcw, Hash } from 'lucide-react';
import { useStore } from '../store/useStore';
import { PERLER_COLORS } from '../constants/perler-colors';
import { cn } from '../lib/utils';

// Margin (in pixels) reserved around the chart for row/column number labels.
const AXIS_MARGIN = 28;
// Pick black or white text based on background luminance for legibility.
const textColorFor = (hex: string): string => {
  if (hex === 'transparent') return '#71717a';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luma = 0.299 * r + 0.587 * g + 0.114 * b;
  return luma > 160 ? '#1f2937' : '#ffffff';
};

const Preview: React.FC = () => {
  const navigate = useNavigate();
  const { grid, updateCell, resetProject } = useStore();
  const [selectedColor, setSelectedColor] = useState(PERLER_COLORS[0].hex);
  const [isErasing, setIsErasing] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [showCodes, setShowCodes] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Map hex -> bead code for fast lookup when drawing labels.
  const colorCodeMap = useMemo(() => {
    const map = new Map<string, string>();
    PERLER_COLORS.forEach(c => map.set(c.hex, c.code));
    return map;
  }, []);

  const gridSize = grid.length;
  // Base cell size in CSS pixels; user can zoom in/out around this.
  const baseCell = 16;
  const cellSize = Math.round(baseCell * zoom);
  const chartPx = cellSize * gridSize;
  const canvasPx = chartPx + AXIS_MARGIN * 2;

  // Re-render the canvas every time grid/zoom/showCodes changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || gridSize === 0) return;

    // Use a device-pixel-ratio-aware backing store so text & lines stay crisp.
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasPx * dpr;
    canvas.height = canvasPx * dpr;
    canvas.style.width = `${canvasPx}px`;
    canvas.style.height = `${canvasPx}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasPx, canvasPx);

    // Cells
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const color = grid[y][x];
        const px = AXIS_MARGIN + x * cellSize;
        const py = AXIS_MARGIN + y * cellSize;
        if (color === 'transparent') {
          // Checker pattern to indicate transparency
          ctx.fillStyle = (x + y) % 2 === 0 ? '#f4f4f5' : '#e4e4e7';
          ctx.fillRect(px, py, cellSize, cellSize);
        } else {
          ctx.fillStyle = color;
          ctx.fillRect(px, py, cellSize, cellSize);
        }
      }
    }

    // Color codes inside cells (only when cell is large enough to be readable)
    if (showCodes && cellSize >= 14) {
      const fontSize = Math.max(7, Math.floor(cellSize * 0.45));
      ctx.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
          const color = grid[y][x];
          if (color === 'transparent') continue;
          const code = colorCodeMap.get(color);
          if (!code) continue;
          // Show short code without the leading letter for compactness (e.g. M01 -> 01)
          const short = code.replace(/^[A-Za-z]+/, '');
          ctx.fillStyle = textColorFor(color);
          ctx.fillText(
            short,
            AXIS_MARGIN + x * cellSize + cellSize / 2,
            AXIS_MARGIN + y * cellSize + cellSize / 2 + 0.5
          );
        }
      }
    }

    // Thin gridlines (every cell)
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= gridSize; i++) {
      const p = AXIS_MARGIN + i * cellSize + 0.5;
      ctx.moveTo(AXIS_MARGIN, p);
      ctx.lineTo(AXIS_MARGIN + chartPx, p);
      ctx.moveTo(p, AXIS_MARGIN);
      ctx.lineTo(p, AXIS_MARGIN + chartPx);
    }
    ctx.stroke();

    // Major gridlines (every 5 cells) and outer border
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i <= gridSize; i += 5) {
      const p = AXIS_MARGIN + i * cellSize + 0.5;
      ctx.moveTo(AXIS_MARGIN, p);
      ctx.lineTo(AXIS_MARGIN + chartPx, p);
      ctx.moveTo(p, AXIS_MARGIN);
      ctx.lineTo(p, AXIS_MARGIN + chartPx);
    }
    // Always close the outer border even if gridSize % 10 !== 0
    ctx.strokeRect(AXIS_MARGIN + 0.5, AXIS_MARGIN + 0.5, chartPx, chartPx);
    ctx.stroke();

    // Axis labels (1-indexed for end users)
    ctx.fillStyle = '#52525b';
    ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < gridSize; i++) {
      const showLabel = i === 0 || (i + 1) % 5 === 0 || i === gridSize - 1;
      if (!showLabel) continue;
      const cx = AXIS_MARGIN + i * cellSize + cellSize / 2;
      const cy = AXIS_MARGIN + i * cellSize + cellSize / 2;
      ctx.fillText(String(i + 1), cx, AXIS_MARGIN / 2);
      ctx.fillText(String(i + 1), cx, AXIS_MARGIN + chartPx + AXIS_MARGIN / 2);
      ctx.fillText(String(i + 1), AXIS_MARGIN / 2, cy);
      ctx.fillText(String(i + 1), AXIS_MARGIN + chartPx + AXIS_MARGIN / 2, cy);
    }
  }, [grid, gridSize, cellSize, chartPx, canvasPx, showCodes, colorCodeMap]);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left - AXIS_MARGIN;
      const y = e.clientY - rect.top - AXIS_MARGIN;
      if (x < 0 || y < 0 || x >= chartPx || y >= chartPx) return;
      const gx = Math.floor(x / cellSize);
      const gy = Math.floor(y / cellSize);
      if (gx < 0 || gx >= gridSize || gy < 0 || gy >= gridSize) return;
      updateCell(gx, gy, isErasing ? 'transparent' : selectedColor);
    },
    [cellSize, chartPx, gridSize, isErasing, selectedColor, updateCell]
  );

  const handleExportPNG = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '拼豆图纸.png';
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }, []);

  if (grid.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-zinc-500 mb-4">尚未生成图纸，请先上传图片</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
        >
          返回首页
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-zinc-600" />
          </button>
          <h1 className="text-2xl font-bold text-zinc-900">图纸预览与编辑</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportPNG}
            className="px-4 py-2 text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4" /> 导出 PNG
          </button>
          <button
            onClick={() => {
              resetProject();
              navigate('/');
            }}
            className="px-4 py-2 text-zinc-600 hover:bg-zinc-100 rounded-lg flex items-center gap-2 transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> 重新开始
          </button>
          <button
            onClick={() => navigate('/materials')}
            className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2 shadow-lg shadow-orange-200 transition-all"
          >
            查看材料清单 <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        {/* Main Editor Area */}
        <div className="bg-zinc-100 rounded-2xl p-8 flex items-center justify-center overflow-auto min-h-[600px] relative border border-zinc-200 shadow-inner">
          <div className="absolute top-4 left-4 flex gap-2 z-10">
            <button
              onClick={() => setZoom(prev => Math.min(prev + 0.2, 3))}
              className="p-2 bg-white rounded-lg shadow-sm border border-zinc-200 hover:bg-zinc-50"
              title="放大"
            >
              <ZoomIn className="w-5 h-5 text-zinc-600" />
            </button>
            <button
              onClick={() => setZoom(prev => Math.max(prev - 0.2, 0.5))}
              className="p-2 bg-white rounded-lg shadow-sm border border-zinc-200 hover:bg-zinc-50"
              title="缩小"
            >
              <ZoomOut className="w-5 h-5 text-zinc-600" />
            </button>
            <button
              onClick={() => setShowCodes(v => !v)}
              className={cn(
                'p-2 rounded-lg shadow-sm border transition-colors',
                showCodes
                  ? 'bg-orange-50 border-orange-200 text-orange-600'
                  : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
              )}
              title="显示/隐藏色号"
            >
              <Hash className="w-5 h-5" />
            </button>
          </div>

          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className="bg-white shadow-2xl border border-zinc-300 cursor-crosshair"
          />
        </div>

        {/* Sidebar Tools */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-zinc-100">
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">工具</h3>
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setIsErasing(false)}
                className={cn(
                  "flex-1 py-3 rounded-lg flex flex-col items-center justify-center gap-1 transition-all",
                  !isErasing ? "bg-orange-50 text-orange-600 border border-orange-200 shadow-sm" : "bg-zinc-50 text-zinc-500 border border-transparent hover:bg-zinc-100"
                )}
              >
                <MousePointer2 className="w-5 h-5" />
                <span className="text-xs font-medium">画笔</span>
              </button>
              <button
                onClick={() => setIsErasing(true)}
                className={cn(
                  "flex-1 py-3 rounded-lg flex flex-col items-center justify-center gap-1 transition-all",
                  isErasing ? "bg-orange-50 text-orange-600 border border-orange-200 shadow-sm" : "bg-zinc-50 text-zinc-500 border border-transparent hover:bg-zinc-100"
                )}
              >
                <Eraser className="w-5 h-5" />
                <span className="text-xs font-medium">橡皮擦</span>
              </button>
            </div>

            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">色板</h3>
            <div className="grid grid-cols-5 gap-2 h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {PERLER_COLORS.map((color) => (
                <button
                  key={color.id}
                  onClick={() => {
                    setSelectedColor(color.hex);
                    setIsErasing(false);
                  }}
                  className={cn(
                    "aspect-square rounded-md border-2 transition-all hover:scale-110",
                    selectedColor === color.hex && !isErasing ? "border-zinc-900 scale-110 shadow-md" : "border-transparent"
                  )}
                  style={{ backgroundColor: color.hex }}
                  title={`${color.name} (${color.code})`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Preview;
