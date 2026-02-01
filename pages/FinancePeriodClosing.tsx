
import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Lock, 
  Unlock, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const FinancePeriodClosing: React.FC = () => {
  const navigate = useNavigate();

  // Mock Data
  const PERIODS = [
    { month: '10/2023', status: 'Open', revenue: 1200000000, expense: 450000000 },
    { month: '09/2023', status: 'Closed', revenue: 1100000000, expense: 420000000, closedBy: 'Kế toán trưởng', closedDate: '05/10/2023' },
    { month: '08/2023', status: 'Closed', revenue: 980000000, expense: 380000000, closedBy: 'Kế toán trưởng', closedDate: '05/09/2023' },
  ];

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#111418] font-sans overflow-hidden">
        <div className="flex flex-col flex-1 overflow-y-auto p-6 lg:p-8">
            
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => navigate('/finance')} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                    <ArrowLeft size={24} className="text-slate-600" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Khóa sổ Kỳ Kế toán</h1>
                    <p className="text-sm text-slate-500">Chốt số liệu và ngăn chặn chỉnh sửa giao dịch cũ.</p>
                </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 mb-8 max-w-3xl">
                <AlertTriangle className="text-amber-600 mt-0.5" size={20} />
                <div>
                    <h3 className="text-sm font-bold text-amber-800">Lưu ý về Khóa sổ</h3>
                    <p className="text-sm text-amber-700 mt-1">
                        Khi một kỳ kế toán đã bị khóa (Closed), nhân viên sẽ không thể thêm, sửa, xóa bất kỳ giao dịch thu/chi nào trong kỳ đó. Chỉ Admin mới có quyền mở lại sổ (Re-open).
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden max-w-4xl">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold">
                        <tr>
                            <th className="px-6 py-4">Kỳ (Tháng)</th>
                            <th className="px-6 py-4">Tổng Thu</th>
                            <th className="px-6 py-4">Tổng Chi</th>
                            <th className="px-6 py-4">Trạng thái</th>
                            <th className="px-6 py-4 text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {PERIODS.map((period, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 font-bold text-slate-900">
                                        <Calendar size={16} className="text-slate-400" />
                                        {period.month}
                                    </div>
                                    {period.status === 'Closed' && (
                                        <div className="text-xs text-slate-500 mt-1">
                                            Đóng bởi {period.closedBy} ({period.closedDate})
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4 font-mono text-sm text-emerald-600 font-bold">{formatCurrency(period.revenue)}</td>
                                <td className="px-6 py-4 font-mono text-sm text-red-600 font-bold">{formatCurrency(period.expense)}</td>
                                <td className="px-6 py-4">
                                    {period.status === 'Open' ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">
                                            <Unlock size={12} /> Đang mở
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                                            <Lock size={12} /> Đã khóa
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {period.status === 'Open' ? (
                                        <button className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors">
                                            Khóa sổ ngay
                                        </button>
                                    ) : (
                                        <button className="text-slate-400 cursor-not-allowed text-xs font-bold">
                                            Đã chốt
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

        </div>
    </div>
  );
};

export default FinancePeriodClosing;
