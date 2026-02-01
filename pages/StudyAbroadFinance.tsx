
import React, { useState } from 'react';
import { 
  Landmark, 
  DollarSign, 
  Euro, 
  TrendingUp, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Download,
  Filter,
  Search,
  ArrowRightLeft
} from 'lucide-react';

const StudyAbroadFinance: React.FC = () => {
  const [currency, setCurrency] = useState<'VND' | 'EUR' | 'USD'>('EUR');

  // Mock Commission Data
  const COMMISSIONS = [
    { id: 'COM-001', school: 'TU Munich', student: 'Nguyễn Thùy Linh', intake: 'Winter 2024', tuition: 15000, rate: 15, commission: 2250, currency: 'EUR', status: 'Invoiced', invoiceDate: '20/10/2023', dueDate: '20/11/2023' },
    { id: 'COM-002', school: 'ĐH Bắc Kinh', student: 'Phạm Văn Hùng', intake: 'Fall 2024', tuition: 30000, rate: 20, commission: 6000, currency: 'CNY', status: 'Received', invoiceDate: '15/09/2023', dueDate: '15/10/2023' },
    { id: 'COM-003', school: 'Heidelberg', student: 'Trần Văn Minh', intake: 'Winter 2024', tuition: 12000, rate: 10, commission: 1200, currency: 'EUR', status: 'Pending', invoiceDate: '-', dueDate: '-' },
  ];

  // Exchange Rates (Mock)
  const RATES = { EUR: 26500, USD: 24500, CNY: 3400 };

  const formatMoney = (amount: number, curr: string) => {
    if (currency === 'VND') {
      const rate = curr === 'EUR' ? RATES.EUR : curr === 'CNY' ? RATES.CNY : RATES.USD;
      return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount * rate);
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: curr }).format(amount);
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#0d141b] font-sans overflow-y-auto">
      <div className="flex flex-col flex-1 p-6 lg:p-10 max-w-[1600px] mx-auto w-full gap-8">
        
        {/* Header */}
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
               <Landmark className="text-blue-600" /> Quản lý Hoa hồng & Đối soát
            </h1>
            <p className="text-slate-500 mt-1">Theo dõi Commission từ trường đối tác và quy đổi đa tiền tệ.</p>
          </div>
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm text-sm">
                <span className="text-slate-500">Hiển thị tiền tệ:</span>
                <select 
                   value={currency} 
                   onChange={(e) => setCurrency(e.target.value as any)}
                   className="font-bold text-blue-600 bg-transparent outline-none cursor-pointer"
                >
                   <option value="EUR">Nguyên tệ (EUR/USD)</option>
                   <option value="VND">Quy đổi VND</option>
                </select>
             </div>
             <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm hover:bg-blue-700 transition-colors flex items-center gap-2">
                <FileText size={16} /> Tạo Invoice gửi Trường
             </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                 <p className="text-xs font-bold text-slate-500 uppercase">Tổng Hoa hồng Dự kiến</p>
                 <TrendingUp size={20} className="text-blue-600" />
              </div>
              <p className="text-2xl font-black text-slate-900">€ 45,250</p>
              <p className="text-xs text-slate-400 mt-1">~ 1.2 Tỷ VNĐ</p>
           </div>
           <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                 <p className="text-xs font-bold text-slate-500 uppercase">Đã xuất Invoice (Chờ về)</p>
                 <Clock size={20} className="text-amber-500" />
              </div>
              <p className="text-2xl font-black text-amber-600">€ 12,500</p>
              <p className="text-xs text-slate-400 mt-1">5 Invoices đang chờ</p>
           </div>
           <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                 <p className="text-xs font-bold text-slate-500 uppercase">Thực nhận (Tháng này)</p>
                 <CheckCircle2 size={20} className="text-emerald-500" />
              </div>
              <p className="text-2xl font-black text-emerald-600">€ 8,200</p>
              <p className="text-xs text-slate-400 mt-1">Đã quy đổi & nhập quỹ</p>
           </div>
        </div>

        {/* Filters & Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
           <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div className="flex gap-3">
                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Tìm trường, học viên..." />
                 </div>
                 <button className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-100 flex items-center gap-2">
                    <Filter size={16} /> Lọc trạng thái
                 </button>
              </div>
              <button className="text-blue-600 text-sm font-bold hover:underline flex items-center gap-1">
                 <Download size={16} /> Xuất Excel
              </button>
           </div>

           <table className="w-full text-left">
              <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase">
                 <tr>
                    <th className="px-6 py-4">Mã Invoice</th>
                    <th className="px-6 py-4">Trường / Đối tác</th>
                    <th className="px-6 py-4">Học viên / Intake</th>
                    <th className="px-6 py-4 text-right">Học phí (Gross)</th>
                    <th className="px-6 py-4 text-center">% Comm</th>
                    <th className="px-6 py-4 text-right">Hoa hồng (Net)</th>
                    <th className="px-6 py-4 text-center">Trạng thái</th>
                    <th className="px-6 py-4 text-right">Hạn TT</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                 {COMMISSIONS.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                       <td className="px-6 py-4 font-mono text-blue-600 font-bold">{item.id}</td>
                       <td className="px-6 py-4 font-bold text-slate-900">{item.school}</td>
                       <td className="px-6 py-4">
                          <p className="text-slate-900 font-medium">{item.student}</p>
                          <p className="text-xs text-slate-500">{item.intake}</p>
                       </td>
                       <td className="px-6 py-4 text-right text-slate-600">
                          {formatMoney(item.tuition, item.currency)}
                       </td>
                       <td className="px-6 py-4 text-center font-bold">{item.rate}%</td>
                       <td className="px-6 py-4 text-right font-bold text-emerald-600 text-base">
                          {formatMoney(item.commission, item.currency)}
                       </td>
                       <td className="px-6 py-4 text-center">
                          {item.status === 'Invoiced' && <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold">Đã gửi Bill</span>}
                          {item.status === 'Received' && <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">Đã nhận tiền</span>}
                          {item.status === 'Pending' && <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold">Chưa xử lý</span>}
                       </td>
                       <td className="px-6 py-4 text-right text-slate-500">{item.dueDate}</td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>

      </div>
    </div>
  );
};

export default StudyAbroadFinance;
