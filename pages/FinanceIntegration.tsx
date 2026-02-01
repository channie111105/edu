
import React, { useState } from 'react';
import { 
  ArrowLeft, 
  ArrowRightLeft, 
  Download, 
  FileSpreadsheet, 
  Check, 
  Calendar 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const FinanceIntegration: React.FC = () => {
  const navigate = useNavigate();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
      setIsExporting(true);
      setTimeout(() => setIsExporting(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#111418] font-sans overflow-hidden">
        <div className="flex flex-col flex-1 overflow-y-auto p-6 lg:p-8">
            
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => navigate('/finance')} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                    <ArrowLeft size={24} className="text-slate-600" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Tích hợp Kế toán (Integration)</h1>
                    <p className="text-sm text-slate-500">Kết xuất dữ liệu để nhập vào phần mềm kế toán chuyên dụng (Misa, Fast, Bravo).</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl">
                
                {/* Misa Export Card */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-700 font-bold text-xl">M</div>
                        <div>
                            <h3 className="font-bold text-lg text-slate-900">Misa SME.NET</h3>
                            <p className="text-xs text-slate-500">Xuất file Excel chuẩn định dạng Import Misa</p>
                        </div>
                    </div>
                    
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 mb-6 space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-600">Loại dữ liệu:</span>
                            <span className="font-bold text-slate-900">Phiếu Thu & Phiếu Chi</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-600">Kỳ kết xuất:</span>
                            <div className="flex items-center gap-2 bg-white border border-slate-200 px-2 py-1 rounded">
                                <Calendar size={14} className="text-slate-400" />
                                <span className="font-bold text-slate-900">Tháng 10/2023</span>
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={handleExport}
                        disabled={isExporting}
                        className="mt-auto w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isExporting ? 'Đang xử lý...' : (
                            <>
                                <Download size={18} /> Tải file Excel (.xlsx)
                            </>
                        )}
                    </button>
                </div>

                {/* Standard Excel Card */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-green-700 font-bold">
                            <FileSpreadsheet size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-slate-900">Báo cáo Tổng hợp (Raw Data)</h3>
                            <p className="text-xs text-slate-500">Xuất toàn bộ dữ liệu thô để làm báo cáo nội bộ.</p>
                        </div>
                    </div>
                    
                    <ul className="space-y-2 mb-6">
                        <li className="flex items-center gap-2 text-sm text-slate-600">
                            <Check size={16} className="text-green-500" /> Bao gồm chi tiết từng Items
                        </li>
                        <li className="flex items-center gap-2 text-sm text-slate-600">
                            <Check size={16} className="text-green-500" /> Bao gồm thông tin Sales Rep
                        </li>
                        <li className="flex items-center gap-2 text-sm text-slate-600">
                            <Check size={16} className="text-green-500" /> Phân loại theo Trung tâm/Chi nhánh
                        </li>
                    </ul>

                    <button className="mt-auto w-full py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-bold flex items-center justify-center gap-2">
                        <Download size={18} /> Xuất Báo cáo
                    </button>
                </div>

            </div>

        </div>
    </div>
  );
};

export default FinanceIntegration;
