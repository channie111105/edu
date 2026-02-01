import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Database, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  TrendingUp,
  MoreHorizontal,
  FileSpreadsheet,
  Trash2,
  Eye,
  Download,
  ThumbsUp,
  ThumbsDown,
  Filter,
  GraduationCap
} from 'lucide-react';

// --- Types ---
interface IBatch {
  id: string;
  name: string;
  source: string;
  importDate: string;
  importedBy: string;
  totalRows: number;
  validPhones: number; // Số SĐT hợp lệ
  activeDeals: number; // Số Lead có nhu cầu học (Qualified)
  wonDeals: number;    // Số học viên đã nhập học (Won)
  status: 'Processed' | 'Processing' | 'Failed';
}

// --- Mock Data ---
const MOCK_BATCHES: IBatch[] = [
  { 
    id: 'D-2410-01', 
    name: 'Data_THPT_NguyenDu_K12', 
    source: 'Hợp tác Trường THPT', 
    importDate: '24/10/2023', 
    importedBy: 'Admin', 
    totalRows: 500, 
    validPhones: 480, 
    activeDeals: 150, 
    wonDeals: 45, 
    status: 'Processed' 
  },
  { 
    id: 'D-2010-02', 
    name: 'Mua_Data_Ngoai_T10', 
    source: 'Mua ngoài (Agency A)', 
    importDate: '20/10/2023', 
    importedBy: 'Marketing Lead', 
    totalRows: 1000, 
    validPhones: 350, // Chất lượng thấp
    activeDeals: 20, 
    wonDeals: 2, 
    status: 'Processed' 
  },
  { 
    id: 'D-1510-01', 
    name: 'Hoi_Thao_Du_Hoc_Duc_HaNoi', 
    source: 'Sự kiện Offline', 
    importDate: '15/10/2023', 
    importedBy: 'Sales Leader', 
    totalRows: 200, 
    validPhones: 198, 
    activeDeals: 120, 
    wonDeals: 60, 
    status: 'Processed' 
  },
  { 
    id: 'D-0110-03', 
    name: 'Import_Excel_Cu_2022', 
    source: 'Hệ thống cũ', 
    importDate: '01/10/2023', 
    importedBy: 'Admin', 
    totalRows: 1500, 
    validPhones: 1400, 
    activeDeals: 50, 
    wonDeals: 5, 
    status: 'Processed' 
  }
];

const LeadBatches: React.FC = () => {
  const navigate = useNavigate();
  const [batches, setBatches] = useState<IBatch[]>(MOCK_BATCHES);

  // --- Calculations Helper ---
  const getQualityMetrics = (batch: IBatch) => {
    const phoneQualityRate = (batch.validPhones / batch.totalRows) * 100;
    const conversionRate = (batch.activeDeals / batch.totalRows) * 100; // Tỷ lệ quan tâm
    const winRate = batch.activeDeals > 0 ? (batch.wonDeals / batch.activeDeals) * 100 : 0; // Tỷ lệ nhập học

    // Đánh giá chất lượng
    let assessment = {
      label: 'Chưa xác định',
      color: 'text-gray-500 bg-gray-50',
      icon: <MoreHorizontal size={14} />,
      action: 'Cần theo dõi thêm'
    };

    if (phoneQualityRate < 50) {
      assessment = {
        label: 'SĐT ảo quá nhiều',
        color: 'text-red-700 bg-red-50',
        icon: <ThumbsDown size={14} />,
        action: 'DỪNG HỢP TÁC'
      };
    } else if (conversionRate > 20 || winRate > 30) {
      assessment = {
        label: 'Tỷ lệ nhập học cao',
        color: 'text-emerald-700 bg-emerald-50',
        icon: <ThumbsUp size={14} />,
        action: 'ƯU TIÊN NHẬP'
      };
    } else if (conversionRate < 5) {
      assessment = {
        label: 'Ít nhu cầu học',
        color: 'text-amber-700 bg-amber-50',
        icon: <AlertTriangle size={14} />,
        action: 'Cân nhắc lại'
      };
    } else {
        assessment = {
            label: 'Chất lượng ổn',
            color: 'text-blue-700 bg-blue-50',
            icon: <CheckCircle2 size={14} />,
            action: 'Duy trì'
        };
    }

    return { phoneQualityRate, conversionRate, winRate, assessment };
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] font-sans text-[#111418]">
      <div className="flex flex-1 flex-col py-5 px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto w-full">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex flex-col gap-1">
             <div className="flex items-center gap-2">
                <button 
                   onClick={() => navigate('/leads')}
                   className="p-1 hover:bg-slate-200 rounded-full transition-colors"
                >
                   <ArrowLeft size={24} className="text-slate-700" />
                </button>
                <h1 className="text-2xl font-bold text-slate-900">Đánh giá Hiệu quả Nguồn Data</h1>
             </div>
             <p className="text-sm text-slate-500 ml-9">Theo dõi chất lượng từng đợt tuyển sinh để tối ưu chi phí Marketing.</p>
          </div>
          <div className="flex gap-3">
             <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 text-slate-700">
                <Filter size={16} /> Bộ lọc
             </button>
             <button 
                onClick={() => navigate('/leads/import')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm"
             >
                <FileSpreadsheet size={16} /> Nhập đợt Data mới
             </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                    <Database size={24} />
                </div>
                <div>
                    <p className="text-xs text-slate-500 font-medium uppercase">Tổng Data đã nhập</p>
                    <p className="text-2xl font-bold text-slate-900">{MOCK_BATCHES.reduce((acc, b) => acc + b.totalRows, 0).toLocaleString()}</p>
                </div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <CheckCircle2 size={24} />
                </div>
                <div>
                    <p className="text-xs text-slate-500 font-medium uppercase">SĐT Liên lạc được</p>
                    <p className="text-2xl font-bold text-slate-900">
                        {Math.round(MOCK_BATCHES.reduce((acc, b) => acc + (b.validPhones/b.totalRows), 0) / MOCK_BATCHES.length * 100)}%
                    </p>
                </div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                    <GraduationCap size={24} />
                </div>
                <div>
                    <p className="text-xs text-slate-500 font-medium uppercase">Tỷ lệ Quan tâm học</p>
                    <p className="text-2xl font-bold text-slate-900">
                        {Math.round(MOCK_BATCHES.reduce((acc, b) => acc + (b.activeDeals/b.totalRows), 0) / MOCK_BATCHES.length * 100)}%
                    </p>
                </div>
            </div>
        </div>

        {/* Batch List Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-[250px]">Tên Đợt / Nguồn Data</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ngày nhập</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng SĐT</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Chất lượng SĐT</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Kết quả Tuyển sinh</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Đánh giá Nguồn</th>
                            <th className="px-6 py-4 w-[60px]"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {batches.map((batch) => {
                            const metrics = getQualityMetrics(batch);
                            return (
                                <tr key={batch.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="text-sm font-bold text-slate-900 group-hover:text-blue-600 cursor-pointer">{batch.name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs text-slate-500 px-2 py-0.5 bg-slate-100 rounded border border-slate-200">{batch.source}</span>
                                                <span className="text-xs text-slate-400">#{batch.id}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <Calendar size={14} className="text-slate-400" />
                                            {batch.importDate}
                                        </div>
                                        <p className="text-xs text-slate-400 mt-0.5">Bởi: {batch.importedBy}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-bold text-slate-900">{batch.totalRows.toLocaleString()}</p>
                                        <p className="text-xs text-slate-500">records</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="w-full max-w-[140px]">
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className={`${metrics.phoneQualityRate < 50 ? 'text-red-600 font-bold' : 'text-slate-600'}`}>
                                                    {metrics.phoneQualityRate.toFixed(1)}% Khả dụng
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full ${metrics.phoneQualityRate < 50 ? 'bg-red-500' : metrics.phoneQualityRate < 80 ? 'bg-amber-400' : 'bg-emerald-500'}`} 
                                                    style={{ width: `${metrics.phoneQualityRate}%` }}
                                                ></div>
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-1">{batch.validPhones} SĐT đúng</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="font-bold text-slate-700">{metrics.conversionRate.toFixed(1)}%</span>
                                                <span className="text-slate-500">Quan tâm ({batch.activeDeals})</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="font-bold text-emerald-600">{metrics.winRate.toFixed(1)}%</span>
                                                <span className="text-slate-500">Nhập học ({batch.wonDeals})</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${metrics.assessment.color.replace('text-', 'border-').replace('700', '200')}`}>
                                            {metrics.assessment.icon}
                                            {metrics.assessment.action}
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-1 pl-1">{metrics.assessment.label}</p>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Xem chi tiết">
                                                <Eye size={16} />
                                            </button>
                                            <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded" title="Tải xuống báo cáo">
                                                <Download size={16} />
                                            </button>
                                            <button className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded" title="Xóa lô này">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  );
};

export default LeadBatches;