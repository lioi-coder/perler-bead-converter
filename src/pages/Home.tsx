import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Settings, Image as ImageIcon, ArrowRight, Crop } from 'lucide-react';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import ImageCropper from '../components/ImageCropper';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Available chart sizes. `recommendedSrc` is a heuristic ~8x the grid side
 * (capped at 1024 — matches the cropper's output cap), which is roughly the
 * minimum source resolution where downsampling preserves detail without
 * unnecessary processing cost.
 */
const GRID_OPTIONS: Array<{ size: number; recommendedSrc: number; suited: string }> = [
  { size: 10,  recommendedSrc: 80,   suited: '极简图标 / 表情符号 / 像素 logo' },
  { size: 25,  recommendedSrc: 200,  suited: '简单 Q 版头像 / 单色卡通' },
  { size: 40,  recommendedSrc: 320,  suited: '中等卡通形象 / 简化人物' },
  { size: 52,  recommendedSrc: 416,  suited: '常用规格,角色/动漫头像首选' },
  { size: 104, recommendedSrc: 832,  suited: '高细节作品(需 4 块 52×52 拼板拼接)' },
];

const Home: React.FC = () => {
  const navigate = useNavigate();
  const {
    originalImage,
    setOriginalImage,
    options,
    setOptions,
    startProcessing,
    isProcessing
  } = useStore();

  // Raw (uncropped) image kept locally; only the cropped result goes into the
  // store as `originalImage`, which is what the processing pipeline consumes.
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadFile = useCallback((file: File) => {
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError(`图片过大 (${(file.size / 1024 / 1024).toFixed(1)} MB),请压缩到 5 MB 以内`);
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setRawImage(event.target?.result as string);
      setOriginalImage(null); // reset any previous cropped result
    };
    reader.readAsDataURL(file);
  }, [setOriginalImage]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
  }, [loadFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) loadFile(file);
  }, [loadFile]);

  const handleCropConfirm = useCallback((dataUrl: string) => {
    setOriginalImage(dataUrl);
  }, [setOriginalImage]);

  const handleCropCancel = useCallback(() => {
    setRawImage(null);
    setOriginalImage(null);
  }, [setOriginalImage]);

  const handleRecrop = useCallback(() => {
    // Keep rawImage; just clear the cropped one so the cropper comes back.
    setOriginalImage(null);
  }, [setOriginalImage]);

  const handleConvert = async () => {
    if (!originalImage) return;
    await startProcessing();
    navigate('/preview');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-zinc-900 mb-4">拼豆图纸转换器</h1>
        <p className="text-zinc-600">上传图片,一键生成拼豆图纸,支持色号统计与导出</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      <div className={cn(
        'grid grid-cols-1 gap-8',
        rawImage && !originalImage ? 'md:grid-cols-1' : 'md:grid-cols-2'
      )}>
        {/* Upload / Crop / Preview Area */}
        {rawImage && !originalImage ? (
          // Cropping step
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-100">
            <ImageCropper
              src={rawImage}
              onConfirm={handleCropConfirm}
              onCancel={handleCropCancel}
            />
          </div>
        ) : originalImage ? (
          // Cropped preview
          <div className="relative border-2 border-orange-500 bg-orange-50/30 rounded-2xl p-8 flex flex-col items-center justify-center gap-4">
            <div className="relative w-full aspect-square max-w-[300px] rounded-lg overflow-hidden shadow-lg bg-white">
              <img src={originalImage} alt="已裁剪" className="w-full h-full object-contain" />
            </div>
            <div className="flex gap-2">
              {rawImage && (
                <button
                  onClick={handleRecrop}
                  className="px-4 py-2 text-sm bg-white border border-zinc-200 text-zinc-700 rounded-lg hover:bg-zinc-50 flex items-center gap-2 transition-colors"
                >
                  <Crop className="w-4 h-4" /> 重新裁剪
                </button>
              )}
              <label className="px-4 py-2 text-sm bg-white border border-zinc-200 text-zinc-700 rounded-lg hover:bg-zinc-50 flex items-center gap-2 transition-colors cursor-pointer">
                <Upload className="w-4 h-4" /> 换一张
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </label>
            </div>
          </div>
        ) : (
          // Empty upload dropzone
          <div
            className="relative group border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all duration-300 border-zinc-300 hover:border-orange-400 hover:bg-zinc-50"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Upload className="w-8 h-8 text-orange-600" />
            </div>
            <p className="text-zinc-900 font-medium mb-1">点击或拖拽图片上传</p>
            <p className="text-zinc-500 text-sm">支持 JPG, PNG 格式 (最大 5MB)</p>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </div>
        )}

        {/* Options Area */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-zinc-100">
          <div className="flex items-center gap-2 mb-6">
            <Settings className="w-5 h-5 text-orange-600" />
            <h2 className="text-xl font-semibold text-zinc-900">转换设置</h2>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">转换算法</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setOptions({ algorithm: 'precise' })}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    options.algorithm === 'precise' 
                      ? "bg-orange-600 text-white shadow-md" 
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  )}
                >
                  精确匹配
                </button>
                <button
                  onClick={() => setOptions({ algorithm: 'approximate' })}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    options.algorithm === 'approximate' 
                      ? "bg-orange-600 text-white shadow-md" 
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  )}
                >
                  近似匹配
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl">
              <div>
                <p className="text-sm font-medium text-zinc-900">背景透明</p>
                <p className="text-xs text-zinc-500">自动忽略浅色/透明背景</p>
              </div>
              <button
                onClick={() => setOptions({ transparency: !options.transparency })}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                  options.transparency ? "bg-orange-600" : "bg-zinc-300"
                )}
              >
                <span className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  options.transparency ? "translate-x-6" : "translate-x-1"
                )} />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">颜色数量上限</label>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { value: 0, label: '不限' },
                  { value: 16, label: '16' },
                  { value: 24, label: '24' },
                  { value: 32, label: '32' },
                  { value: 48, label: '48' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setOptions({ maxColors: opt.value })}
                    className={cn(
                      'px-2 py-2 rounded-lg text-sm font-medium transition-all',
                      options.maxColors === opt.value
                        ? 'bg-orange-600 text-white shadow-md'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-zinc-500 mt-2">"不限"会保留所有匹配到的色号(最忠实于原图);限制色数适合追求简洁/节省豆子。</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">画布规格</label>
              <div className="grid grid-cols-5 gap-2">
                {GRID_OPTIONS.map(opt => (
                  <button
                    key={opt.size}
                    onClick={() => setOptions({ gridSize: opt.size })}
                    className={cn(
                      'px-2 py-2 rounded-lg text-sm font-medium transition-all',
                      options.gridSize === opt.size
                        ? 'bg-orange-600 text-white shadow-md'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    )}
                  >
                    {opt.size}×{opt.size}
                  </button>
                ))}
              </div>
              {(() => {
                const cur = GRID_OPTIONS.find(o => o.size === options.gridSize) ?? GRID_OPTIONS[3];
                return (
                  <div className="mt-2 p-3 bg-zinc-50 rounded-lg border border-zinc-200 text-xs text-zinc-600 leading-relaxed">
                    <p><span className="font-semibold text-zinc-800">推荐原图尺寸:</span> ≥ {cur.recommendedSrc}×{cur.recommendedSrc} px</p>
                    <p className="mt-0.5"><span className="font-semibold text-zinc-800">适合:</span> {cur.suited}</p>
                  </div>
                );
              })()}
            </div>

            <button
              onClick={handleConvert}
              disabled={!originalImage || isProcessing}
              className={cn(
                "w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-200",
                originalImage && !isProcessing 
                  ? "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700" 
                  : "bg-zinc-300 cursor-not-allowed"
              )}
            >
              {isProcessing ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  开始转换 <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
