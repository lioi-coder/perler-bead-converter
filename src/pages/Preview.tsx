import React, { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Download, MousePointer2, Eraser, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { useStore } from '../store/useStore';
import { PERLER_COLORS } from '../constants/perler-colors';
import { cn } from '../lib/utils';

const Preview: React.FC = () => {
  const navigate = useNavigate();
  const { grid, updateCell, resetProject } = useStore();
  const [selectedColor, setSelectedColor] = useState(PERLER_COLORS[0].hex);
  const [isErasing, setIsErasing] = useState(false);
  const [zoom, setZoom] = useState(1);
  const gridRef = useRef<HTMLDivElement>(null);

  // Map hex codes to bead codes for fast lookup
  const colorCodeMap = useMemo(() => {
    const map = new Map<string, string>();
    PERLER_COLORS.forEach(c => map.set(c.hex, c.code));
    return map;
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

  const handleCellClick = (x: number, y: number) => {
    updateCell(x, y, isErasing ? 'transparent' : selectedColor);
  };

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
          <div className="absolute top-4 left-4 flex gap-2">
            <button 
              onClick={() => setZoom(prev => Math.min(prev + 0.2, 3))}
              className="p-2 bg-white rounded-lg shadow-sm border border-zinc-200 hover:bg-zinc-50"
            >
              <ZoomIn className="w-5 h-5 text-zinc-600" />
            </button>
            <button 
              onClick={() => setZoom(prev => Math.max(prev - 0.2, 0.5))}
              className="p-2 bg-white rounded-lg shadow-sm border border-zinc-200 hover:bg-zinc-50"
            >
              <ZoomOut className="w-5 h-5 text-zinc-600" />
            </button>
          </div>

          <div 
            ref={gridRef}
            className="grid gap-0 bg-white shadow-2xl border border-zinc-300"
            style={{ 
              gridTemplateColumns: `repeat(52, 1fr)`,
              width: `${52 * 12 * zoom}px`,
              height: `${52 * 12 * zoom}px`,
              transform: `scale(${zoom})`,
              transformOrigin: 'center'
            }}
          >
            {grid.map((row, y) => (
              row.map((color, x) => (
                <div
                  key={`${x}-${y}`}
                  onClick={() => handleCellClick(x, y)}
                  className={cn(
                    "w-full h-full border-[0.5px] border-zinc-200 cursor-crosshair transition-colors hover:opacity-80 flex items-center justify-center overflow-hidden",
                    color === 'transparent' ? "bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAAXNSR0IArs4c6QAAAC1JREFUGFdjZEACDAwM/xkYGBgY4AKMIAFGEA8mABRkBAowgAUYQAKMIAFGEA8mAI0VBAV6+IunAAAAAElFTkSuQmCC')] bg-repeat" : ""
                  )}
                  style={{ backgroundColor: color !== 'transparent' ? color : undefined }}
                >
                  {color !== 'transparent' && zoom >= 0.8 && (
                    <span 
                      className="font-bold select-none pointer-events-none drop-shadow-md flex items-center justify-center w-full h-full leading-none"
                      style={{ 
                        color: parseInt(color.replace('#', ''), 16) > 0xffffff / 2 ? '#000' : '#fff',
                        fontSize: `${Math.max(6, 4 * zoom)}px`
                      }}
                    >
                      {colorCodeMap.get(color)?.replace('M', '')}
                    </span>
                  )}
                </div>
              ))
            ))}
          </div>
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
