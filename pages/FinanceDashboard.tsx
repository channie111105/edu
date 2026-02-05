import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import {
  Filter,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  MapPin,
  User,
  Calendar,
  ChevronDown
} from 'lucide-react';

// --- MOCK DATA ---
// Cash Flow Forecast - Revenue Only as requested
const REVENUE_FORECAST_DATA = [
  { name: 'Tuần 1', value: 120 },
  { name: 'Tuần 2', value: 150 },
  { name: 'Tuần 3', value: 180 },
  { name: 'Tuần 4 (Dự kiến)', value: 250 },
];

// Debt Composition by Branch
const DEBT_COMPOSITION_DATA = [
  { name: 'Hà Nội', value: 750000000, color: '#3b82f6' }, // Blue
  { name: 'Hồ Chí Minh', value: 300000000, color: '#10b981' }, // Green
  { name: 'Đà Nẵng', value: 150000000, color: '#f59e0b' }, // Amber
];

const FinanceDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [branchFilter, setBranchFilter] = useState('All');
  const [salesFilter, setSalesFilter] = useState('All');

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] font-sans text-[#111418] overflow-y-auto">
      <div className="flex flex-1 flex-col py-8 px-10 max-w-[1600px] mx-auto w-full gap-8">

        {/* Header - Simplified */}
        <div className="flex flex-col gap-1">
          <h1 className="text-[#111418] text-3xl font-bold tracking-tight">Trung tâm Tài chính & Kế toán</h1>
          <p className="text-[#64748B] text-base">Báo cáo tài chính, quản trị dòng tiền và theo dõi công nợ.</p>
        </div>

        {/* --- FILTERS SECTION --- */}
        <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 font-bold text-sm uppercase mr-4">
            <Filter size={16} /> Bộ lọc
          </div>

          {/* Branch Filter */}
          <div className="relative group">
            <div className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 hover:bg-white transition-colors cursor-pointer min-w-[180px]">
              <MapPin size={16} className="text-slate-500" />
              <select
                className="bg-transparent outline-none w-full text-sm font-medium text-slate-700 cursor-pointer appearance-none"
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
              >
                <option value="All">Tất cả Cơ sở</option>
                <option value="HN">Hà Nội</option>
                <option value="HCM">Hồ Chí Minh</option>
                <option value="DN">Đà Nẵng</option>
              </select>
              <ChevronDown size={14} className="text-slate-400" />
            </div>
          </div>

          {/* Salesperson Filter */}
          <div className="relative group">
            <div className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 hover:bg-white transition-colors cursor-pointer min-w-[200px]">
              <User size={16} className="text-slate-500" />
              <select
                className="bg-transparent outline-none w-full text-sm font-medium text-slate-700 cursor-pointer appearance-none"
                value={salesFilter}
                onChange={(e) => setSalesFilter(e.target.value)}
              >
                <option value="All">Tất cả Sales</option>
                <option value="S1">Nguyễn Văn A</option>
                <option value="S2">Trần Thị B</option>
              </select>
              <ChevronDown size={14} className="text-slate-400" />
            </div>
          </div>

          {/* Time Filter - Optional but good for Reports */}
          <div className="relative group ml-auto">
            <div className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2 bg-white transition-colors cursor-pointer">
              <Calendar size={16} className="text-slate-500" />
              <span className="text-sm font-bold text-slate-700">Tháng này</span>
              <ChevronDown size={14} className="text-slate-400" />
            </div>
          </div>
        </div>

        {/* --- KPI Cards (Debt Status) --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Receivables */}
          <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-sm relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <DollarSign size={80} className="text-blue-500" />
            </div>
            <div className="flex justify-between items-start mb-2 relative z-10">
              <p className="text-sm font-bold text-[#64748B] uppercase tracking-wider">Tổng Phải thu</p>
            </div>
            <p className="text-3xl font-black text-[#111418] relative z-10">1.2 Tỷ</p>
            <div className="mt-2 text-xs text-blue-600 font-bold flex items-center gap-1 relative z-10">
              Toàn bộ công nợ chưa thu hồi
            </div>
          </div>

          {/* In Term Debt */}
          <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-sm relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <CheckCircle2 size={80} className="text-emerald-500" />
            </div>
            <div className="flex justify-between items-start mb-2 relative z-10">
              <p className="text-sm font-bold text-[#64748B] uppercase tracking-wider">Trong hạn (In Term)</p>
            </div>
            <p className="text-3xl font-black text-emerald-600 relative z-10">950 Triệu</p>
            <p className="mt-2 text-xs text-[#64748B] relative z-10">Đang theo dõi theo tiến độ HĐ</p>
            <div className="w-full bg-emerald-100 h-1 mt-4 rounded-full">
              <div className="bg-emerald-500 h-1 rounded-full" style={{ width: '79%' }}></div>
            </div>
          </div>

          {/* Overdue Debt */}
          <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-sm relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <AlertCircle size={80} className="text-red-500" />
            </div>
            <div className="flex justify-between items-start mb-2 relative z-10">
              <p className="text-sm font-bold text-[#64748B] uppercase tracking-wider">Quá hạn (Overdue)</p>
            </div>
            <p className="text-3xl font-black text-[#E02424] relative z-10">250 Triệu</p>
            <p className="mt-2 text-xs text-[#64748B] relative z-10">Cần ưu tiên xử lý ngay (18 HV)</p>
            <div className="w-full bg-red-100 h-1 mt-4 rounded-full">
              <div className="bg-red-500 h-1 rounded-full" style={{ width: '21%' }}></div>
            </div>
          </div>
        </div>

        {/* --- CHARTS ROW --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[400px]">

          {/* LEFT: Revenue Forecast (2/3 width) */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="text-emerald-600" size={20} />
                  Dự báo Dòng tiền thu (Revenue Forecast)
                </h3>
                <p className="text-sm text-slate-500">Dựa trên kế hoạch đóng phí của các Hợp đồng đang chạy</p>
              </div>
            </div>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={REVENUE_FORECAST_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(val) => `${val}tr`} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(value: number) => [`${value} Triệu`, 'Dự kiến thu']}
                  />
                  <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" activeDot={{ r: 6 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* RIGHT: Debt Composition (1/3 width) */}
          <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-sm flex flex-col">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-slate-900">Tỷ trọng Công nợ</h3>
              <p className="text-sm text-slate-500">Theo Cơ sở (Branch)</p>
            </div>
            <div className="flex-1 w-full min-h-0 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={DEBT_COMPOSITION_DATA}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {DEBT_COMPOSITION_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${(value / 1000000).toLocaleString()} Tr`} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
              {/* Center Text Overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                <div className="text-center">
                  <span className="block text-2xl font-bold text-slate-800">1.2 Tỷ</span>
                  <span className="text-xs text-slate-500 uppercase">Tổng nợ</span>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default FinanceDashboard;
