import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Settings, Image as ImageIcon, ArrowRight } from 'lucide-react';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';

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

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setOriginalImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, [setOriginalImage]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setOriginalImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
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
        <p className="text-zinc-600">上传图片，一键生成 52×52 拼豆图纸，支持色号统计与导出</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Upload Area */}
        <div 
          className={cn(
            "relative group border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all duration-300",
            originalImage ? "border-orange-500 bg-orange-50/30" : "border-zinc-300 hover:border-orange-400 hover:bg-zinc-50"
          )}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          {originalImage ? (
            <div className="relative w-full aspect-square max-w-[300px] rounded-lg overflow-hidden shadow-lg">
              <img src={originalImage} alt="Preview" className="w-full h-full object-contain" />
              <button 
                onClick={() => setOriginalImage(null)}
                className="absolute top-2 right-2 p-1 bg-white/80 hover:bg-white rounded-full shadow-md transition-colors"
              >
                <Upload className="w-4 h-4 text-zinc-600" />
              </button>
            </div>
          ) : (
            <>
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Upload className="w-8 h-8 text-orange-600" />
              </div>
              <p className="text-zinc-900 font-medium mb-1">点击或拖拽图片上传</p>
              <p className="text-zinc-500 text-sm">支持 JPG, PNG 格式 (最大 5MB)</p>
            </>
          )}
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleFileChange}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </div>

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
              <label className="block text-sm font-medium text-zinc-700 mb-2">画布规格</label>
              <div className="p-3 bg-zinc-50 rounded-lg text-sm text-zinc-600 border border-zinc-200">
                固定规格: 52 × 52 (2.6mm 豆子)
              </div>
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
