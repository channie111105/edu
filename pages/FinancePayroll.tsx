
import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Users, 
  Calculator, 
  CheckCircle2,
  FileText,
  RefreshCw,
  Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const FinancePayroll: React.FC = () => {
  const navigate = useNavigate();
  const [isCalculated, setIsCalculated] = useState(false);

  // Mock Data
  const [payrollData, setPayrollData] = useState([
    { id: 'T-001', name: 'Cô Lan', role: 'Giáo viên', hours: 40, rate: 500000, bonus: 0, penalty: 0, total: 20000000, status: 'Draft' },
    { id: 'T-002', name: 'Thầy Đức', role: 'Giáo viên', hours: 35, rate: 550000, bonus: 500000, penalty: 200000, total: 19550000, status: 'Draft' },
    { id: 'S-001', name: 'Phạm Hương', role: 'Sales Rep', hours: 0, rate: 0, bonus: 15400000, penalty: 0, total: 23400000, salary: 8000000, status: 'Calculated' }, // Sales logic mixed
  ]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  const handleSyncAttendance = () => {
      // Simulate fetching from Attendance module
      alert("Đang đồng bộ dữ liệu điểm danh tháng 10...");
      setTimeout(() => {
          setPayrollData(prev => prev.map(p => {
              if (p.role === 'Giáo viên') {
                  const newBonus = 500000; // Mock bonus for everyone
                  const newTotal = (p.hours * p.rate) + newBonus - p.penalty;
                  return { ...p, bonus: newBonus, total: newTotal, status: 'Calculated' };
              }
              return p;
          }));
          setIsCalculated(true);
      }, 1000);
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#111418] font-sans overflow-hidden">
        <div className="flex flex-col flex-1 overflow-y-auto p-6 lg:p-8">
            
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => navigate('/finance')} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                    <ArrowLeft size={24} className="text-slate-600" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Tính Lương & Hoa hồng</h1>
                    <p className="text-sm text-slate-500">Tự động tính toán lương Giáo viên dựa trên giờ dạy thực tế.</p>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <div className="flex items-center gap-4">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <Users size={18} className="text-indigo-600" /> Bảng lương Tháng 10/2023
                        </h3>
                        {isCalculated && (
                            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded border border-green-100 flex items-center gap-1">
                                <CheckCircle2 size={12} /> Đã đồng bộ từ Điểm danh
                            </span>
                        )}
                    </div>
                    <button 
                        onClick={handleSyncAttendance}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-colors"
                    >
                        {isCalculated ? <RefreshCw size={18} /> : <Calculator size={18} />} 
                        {isCalculated ? 'Tính toán lại' : 'Đồng bộ & Tính lương'}
                    </button>
                </div>
                
                {/* Info Bar */}
                <div className="bg-blue-50 px-6 py-2 text-xs text-blue-800 flex items-center gap-2 border-b border-blue-100">
                    <Info size={14} />
                    Công thức: (Giờ dạy * Đơn giá) + Thưởng - Phạt = Tổng nhận
                </div>

                <table className="w-full text-left">
                    <thead className="bg-white text-slate-500 uppercase text-xs font-bold border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4">Nhân viên</th>
                            <th className="px-6 py-4">Giờ dạy / KPI</th>
                            <th className="px-6 py-4">Đơn giá / Lương cứng</th>
                            <th className="px-6 py-4 text-green-600">Thưởng (+)</th>
                            <th className="px-6 py-4 text-red-600">Phạt (-)</th>
                            <th className="px-6 py-4">Tổng nhận</th>
                            <th className="px-6 py-4 text-right">Trạng thái</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {payrollData.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                    <p className="text-sm font-bold text-slate-900">{item.name}</p>
                                    <p className="text-xs text-slate-500">{item.role}</p>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-700 font-medium">
                                    {item.role === 'Giáo viên' ? `${item.hours}h` : '--'}
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-700">
                                    {item.role === 'Giáo viên' ? `${formatCurrency(item.rate)}/h` : formatCurrency(item.salary || 0)}
                                </td>
                                <td className="px-6 py-4 text-sm font-bold text-green-600">
                                    {formatCurrency(item.bonus)}
                                </td>
                                <td className="px-6 py-4 text-sm font-bold text-red-600">
                                    {formatCurrency(item.penalty)}
                                </td>
                                <td className="px-6 py-4 text-sm font-bold text-slate-900 bg-slate-50">
                                    {formatCurrency(item.total)}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {item.status === 'Paid' ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">
                                            <CheckCircle2 size={12} /> Đã chi
                                        </span>
                                    ) : (
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${item.status === 'Calculated' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {item.status === 'Calculated' ? 'Chờ duyệt' : 'Nháp'}
                                        </span>
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

export default FinancePayroll;
