import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Download, FileSpreadsheet, FileText, Image as ImageIcon, ShoppingBag } from 'lucide-react';
import { useStore } from '../store/useStore';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';

const Materials: React.FC = () => {
  const navigate = useNavigate();
  const { colorStats, grid } = useStore();

  const totalBeads = colorStats.reduce((sum, stat) => sum + stat.count, 0);

  const exportToExcel = () => {
    const data = colorStats.map(stat => ({
      '色号': stat.code,
      '名称': stat.name,
      '颜色 (HEX)': stat.hex,
      '所需数量': stat.count,
      '占比 (%)': stat.percentage.toFixed(2) + '%'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '材料清单');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const fileData = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(fileData, '拼豆材料清单.xlsx');
  };

  const exportToPDF = async () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('拼豆材料清单', 20, 20);
    
    doc.setFontSize(12);
    let y = 40;
    doc.text('色号', 20, y);
    doc.text('名称', 50, y);
    doc.text('数量', 100, y);
    doc.text('占比', 130, y);
    
    y += 10;
    colorStats.forEach(stat => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(stat.code, 20, y);
      doc.text(stat.name, 50, y);
      doc.text(stat.count.toString(), 100, y);
      doc.text(stat.percentage.toFixed(2) + '%', 130, y);
      y += 10;
    });

    doc.save('拼豆材料清单.pdf');
  };

  if (colorStats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-zinc-500 mb-4">尚未生成清单，请先上传并处理图片</p>
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
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/preview')}
            className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-zinc-600" />
          </button>
          <h1 className="text-2xl font-bold text-zinc-900">材料清单</h1>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={exportToExcel}
            className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" /> 导出 Excel
          </button>
          <button 
            onClick={exportToPDF}
            className="px-4 py-2 bg-red-600 text-white rounded-lg flex items-center gap-2 hover:bg-red-700 transition-colors shadow-sm"
          >
            <FileText className="w-4 h-4" /> 导出 PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100">
          <p className="text-sm text-orange-600 font-medium mb-1">总豆子数</p>
          <p className="text-3xl font-bold text-orange-900">{totalBeads}</p>
        </div>
        <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
          <p className="text-sm text-blue-600 font-medium mb-1">使用颜色数</p>
          <p className="text-3xl font-bold text-blue-900">{colorStats.length}</p>
        </div>
        <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100">
          <p className="text-sm text-purple-600 font-medium mb-1">预计板数</p>
          <p className="text-3xl font-bold text-purple-900">1 (52×52)</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-zinc-50 border-b border-zinc-100">
            <tr>
              <th className="px-6 py-4 text-sm font-bold text-zinc-400 uppercase tracking-wider">预览</th>
              <th className="px-6 py-4 text-sm font-bold text-zinc-400 uppercase tracking-wider">色号 / 名称</th>
              <th className="px-6 py-4 text-sm font-bold text-zinc-400 uppercase tracking-wider">数量</th>
              <th className="px-6 py-4 text-sm font-bold text-zinc-400 uppercase tracking-wider text-right">比例</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {colorStats.map((stat) => (
              <tr key={stat.id} className="hover:bg-zinc-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div 
                    className="w-10 h-10 rounded-lg shadow-inner border border-zinc-200"
                    style={{ backgroundColor: stat.hex }}
                  />
                </td>
                <td className="px-6 py-4">
                  <p className="text-zinc-900 font-bold">{stat.code}</p>
                  <p className="text-zinc-500 text-sm">{stat.name}</p>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                    {stat.count} 颗
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-zinc-500 font-medium">
                  {stat.percentage.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 p-6 bg-zinc-50 rounded-2xl border border-zinc-200 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
            <ShoppingBag className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <p className="font-bold text-zinc-900">准备好开始制作了吗？</p>
            <p className="text-sm text-zinc-500">点击上方按钮导出清单，方便线下核对和购买豆子。</p>
          </div>
        </div>
        <button 
          onClick={() => navigate('/preview')}
          className="px-6 py-2 bg-white border border-zinc-200 text-zinc-600 rounded-lg hover:bg-zinc-100 transition-colors font-medium"
        >
          返回编辑
        </button>
      </div>
    </div>
  );
};

export default Materials;
