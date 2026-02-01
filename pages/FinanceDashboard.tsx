
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { 
  Download, 
  Search, 
  Filter, 
  DollarSign, 
  AlertCircle, 
  CheckCircle2, 
  TrendingUp, 
  Undo2,
  Receipt,
  FileText,
  Zap,
  Terminal,
  Wallet,
  ShoppingBag,
  Users,
  Lock,
  ArrowRightLeft
} from 'lucide-react';

// --- MOCK DATA ---
const DEBT_RECORDS = [
  {
    id: 'STU-2024-001',
    name: 'Nguyễn Thùy Linh',
    totalValue: 30000000,
    amountDue: 10000000,
    dueDate: '16/10/2024',
    overdueDays: 2,
    status: 'Overdue',
    rep: 'Phạm Hương',
    repAvatar: 'PH',
    repColor: 'bg-blue-100 text-blue-600'
  },
  {
    id: 'STU-2024-042',
    name: 'Trần Văn Minh',
    totalValue: 45000000,
    amountDue: 15000000,
    dueDate: '20/10/2024',
    overdueDays: 0,
    status: 'Partial',
    rep: 'Sarah Miller',
    repAvatar: 'SM',
    repColor: 'bg-emerald-100 text-emerald-600',
    note: 'Đã thu: 5.000.000 đ'
  },
  {
    id: 'STU-2023-982',
    name: 'Lê Hoàng',
    totalValue: 20000000,
    amountDue: 20000000,
    dueDate: '01/09/2024',
    overdueDays: 45,
    status: 'Critical',
    rep: 'David Clark',
    repAvatar: 'DC',
    repColor: 'bg-purple-100 text-purple-600'
  }
];

// Mock Data for Cash Flow Forecast
const CASH_FLOW_DATA = [
  { name: 'Tuần 1', incoming: 120, outgoing: 80, balance: 40 },
  { name: 'Tuần 2', incoming: 150, outgoing: 60, balance: 90 },
  { name: 'Tuần 3', incoming: 180, outgoing: 120, balance: 60 },
  { name: 'Tuần 4 (Dự kiến)', incoming: 250, outgoing: 90, balance: 160 },
];

const FinanceDashboard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] font-sans text-[#111418] overflow-y-auto">
      <div className="flex flex-1 flex-col py-8 px-10 max-w-[1600px] mx-auto w-full gap-6">
        
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-[#111418] text-3xl font-bold tracking-tight">Trung tâm Tài chính & Kế toán</h1>
            <p className="text-[#64748B] text-base">Quản trị dòng tiền, công nợ và báo cáo tài chính hợp nhất.</p>
          </div>
          <div className="flex gap-2">
            <button 
                onClick={() => navigate('/finance/integration')}
                className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm transition-colors shadow-sm"
            >
              <ArrowRightLeft size={18} />
              Kết xuất Misa/Excel
            </button>
            <button 
                onClick={() => navigate('/finance/closing')}
                className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg font-bold text-sm hover:bg-slate-700 transition-colors shadow-sm"
            >
              <Lock size={18} />
              Khóa sổ kỳ
            </button>
          </div>
        </div>

        {/* --- MODULE NAVIGATION GRID --- */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <button onClick={() => navigate('/finance/transactions')} className="p-4 bg-white border border-slate-200 rounded-xl hover:shadow-md hover:border-blue-300 transition-all text-left group">
                <Receipt className="text-blue-600 mb-2 group-hover:scale-110 transition-transform" size={24} />
                <p className="font-bold text-slate-800 text-sm">Thu tiền (In)</p>
                <p className="text-xs text-slate-500">Duyệt giao dịch</p>
            </button>
            <button onClick={() => navigate('/finance/money-out')} className="p-4 bg-white border border-slate-200 rounded-xl hover:shadow-md hover:border-orange-300 transition-all text-left group">
                <Wallet className="text-orange-600 mb-2 group-hover:scale-110 transition-transform" size={24} />
                <p className="font-bold text-slate-800 text-sm">Chi tiền (Out)</p>
                <p className="text-xs text-slate-500">Sổ quỹ & Công nợ</p>
            </button>
            <button onClick={() => navigate('/finance/inventory')} className="p-4 bg-white border border-slate-200 rounded-xl hover:shadow-md hover:border-purple-300 transition-all text-left group">
                <ShoppingBag className="text-purple-600 mb-2 group-hover:scale-110 transition-transform" size={24} />
                <p className="font-bold text-slate-800 text-sm">Kho & POS</p>
                <p className="text-xs text-slate-500">Bán sách/Đồng phục</p>
            </button>
            <button onClick={() => navigate('/finance/payroll')} className="p-4 bg-white border border-slate-200 rounded-xl hover:shadow-md hover:border-indigo-300 transition-all text-left group">
                <Users className="text-indigo-600 mb-2 group-hover:scale-110 transition-transform" size={24} />
                <p className="font-bold text-slate-800 text-sm">Lương & HH</p>
                <p className="text-xs text-slate-500">Tính Commission</p>
            </button>
            <button onClick={() => navigate('/finance/invoices')} className="p-4 bg-white border border-slate-200 rounded-xl hover:shadow-md hover:border-slate-300 transition-all text-left group">
                <FileText className="text-slate-600 mb-2 group-hover:scale-110 transition-transform" size={24} />
                <p className="font-bold text-slate-800 text-sm">Hóa đơn VAT</p>
                <p className="text-xs text-slate-500">e-Invoice</p>
            </button>
            <button onClick={() => navigate('/finance/gateway-logs')} className="p-4 bg-white border border-slate-200 rounded-xl hover:shadow-md hover:border-slate-300 transition-all text-left group">
                <Terminal className="text-slate-600 mb-2 group-hover:scale-110 transition-transform" size={24} />
                <p className="font-bold text-slate-800 text-sm">Gateway Logs</p>
                <p className="text-xs text-slate-500">Đối soát API</p>
            </button>
        </div>

        {/* --- CASH FLOW FORECAST CHART --- */}
        <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-sm">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                       <TrendingUp className="text-emerald-600" size={20} />
                       Dự báo Dòng tiền (Cash Flow Forecast)
                    </h3>
                    <p className="text-sm text-slate-500">Dựa trên Payment Plan (Phải thu) và Lịch thanh toán (Phải trả)</p>
                </div>
                <div className="flex gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-emerald-500"></span> Thu (In)
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-red-500"></span> Chi (Out)
                    </div>
                </div>
            </div>
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={CASH_FLOW_DATA} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(val) => `${val}tr`} />
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <Tooltip 
                            contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                            formatter={(value: number) => [`${value} Triệu`, '']}
                        />
                        <Area type="monotone" dataKey="incoming" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIn)" name="Dòng tiền vào" />
                        <Area type="monotone" dataKey="outgoing" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorOut)" name="Dòng tiền ra" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* --- KPI Cards --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-bold text-[#64748B] uppercase tracking-wider">Tổng Phải thu (Tháng này)</p>
              <DollarSign className="text-blue-500" size={24} />
            </div>
            <p className="text-2xl font-black text-[#111418]">1.2 Tỷ</p>
            <div className="mt-2 text-xs text-emerald-600 font-bold flex items-center gap-1">
              <TrendingUp size={16} />
              +12% so với tháng trước
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-bold text-[#64748B] uppercase tracking-wider">Tổng Quá hạn</p>
              <AlertCircle className="text-red-500" size={24} />
            </div>
            <p className="text-2xl font-black text-[#E02424]">250 Triệu</p>
            <p className="mt-2 text-xs text-[#64748B]">18 học viên có nợ xấu</p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-bold text-[#64748B] uppercase tracking-wider">Dự báo Chi (Tháng tới)</p>
              <TrendingUp className="text-orange-500 transform rotate-180" size={24} />
            </div>
            <p className="text-2xl font-black text-[#111418]">450 Triệu</p>
            <p className="mt-2 text-xs text-[#64748B]">Lương, Mặt bằng, Đối tác Du học</p>
          </div>
        </div>

        {/* --- RECEIVABLES TABLE --- */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[#E2E8F0] flex justify-between items-center bg-slate-50">
             <h3 className="font-bold text-slate-800">Danh sách Phải thu (Receivables)</h3>
             <button className="text-sm text-blue-600 font-bold hover:underline">Xem tất cả</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                  <th className="px-6 py-4 text-sm font-bold text-[#475569]">Học viên</th>
                  <th className="px-6 py-4 text-sm font-bold text-[#475569]">Giá trị HĐ</th>
                  <th className="px-6 py-4 text-sm font-bold text-[#475569]">Số tiền nợ</th>
                  <th className="px-6 py-4 text-sm font-bold text-[#475569]">Hạn thanh toán</th>
                  <th className="px-6 py-4 text-sm font-bold text-[#475569]">Trạng thái</th>
                  <th className="px-6 py-4 text-sm font-bold text-[#475569] text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {DEBT_RECORDS.map((record) => (
                  <tr key={record.id} className={`hover:bg-blue-50/30 transition-colors ${record.status === 'Critical' ? 'bg-red-50/30' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-[#111418]">{record.name}</span>
                        <span className="text-xs text-[#64748B]">{record.id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#334155] font-medium">{record.totalValue.toLocaleString()} đ</td>
                    <td className="px-6 py-4 text-sm text-[#334155] font-bold">{record.amountDue.toLocaleString()} đ</td>
                    <td className="px-6 py-4 text-sm text-[#334155]">{record.dueDate}</td>
                    <td className="px-6 py-4">
                       {record.status === 'Critical' && <div className="text-sm font-bold text-[#E02424]">Nghiêm trọng</div>}
                       {record.status === 'Overdue' && <div className="text-sm font-medium text-[#E02424]">Quá hạn</div>}
                       {record.status === 'Partial' && <div className="text-sm font-medium text-orange-600">Thanh toán 1 phần</div>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => navigate(`/payment-plans/${record.id}`)}
                        className="text-[#0066FF] hover:underline text-sm font-bold"
                      >
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default FinanceDashboard;
