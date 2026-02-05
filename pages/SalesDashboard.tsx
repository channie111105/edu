
import React, { useState, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar, CartesianGrid
} from 'recharts';
import {
  ArrowUp, ArrowDown, MoreVertical, Calendar, TrendingUp, TrendingDown,
  Users, BadgeDollarSign
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// --- MOCK DATA GENERATORS ---

const getKPIData = (range: string) => {
  const multiplier = range === 'today' ? 0.03 : range === 'thisWeek' ? 0.25 : 1;
  return [
    { label: 'Tổng doanh thu thực thu', value: `${(2.3 * multiplier).toFixed(1)} Tỷ`, change: '+12%', isPositive: true },
    { label: 'Tổng giá trị Pipeline', value: `${(1.5 * multiplier).toFixed(1)} Tỷ`, change: '+8%', isPositive: true },
    { label: 'Tỷ lệ chuyển đổi chung', value: '15%', change: '-2%', isPositive: false },
    { label: '% Lead xác thực', value: '45%', change: '+5%', isPositive: true },
  ];
};

const getRevenueData = (range: string) => {
  // Return different data points based on range granularity
  if (range === 'today') {
    return [
      { name: '8:00', value: 5, target: 10 },
      { name: '10:00', value: 12, target: 20 },
      { name: '12:00', value: 18, target: 30 },
      { name: '14:00', value: 25, target: 40 },
      { name: '16:00', value: 35, target: 50 },
      { name: '18:00', value: 42, target: 60 },
    ];
  } else if (range === 'thisWeek') {
    return [
      { name: 'T2', value: 80, target: 100 },
      { name: 'T3', value: 150, target: 200 },
      { name: 'T4', value: 220, target: 300 },
      { name: 'T5', value: 310, target: 400 },
      { name: 'T6', value: 450, target: 500 },
      { name: 'T7', value: 520, target: 600 },
      { name: 'CN', value: 580, target: 700 },
    ];
  } else {
    // Month
    return [
      { name: 'Tuần 1', value: 400, target: 350 },
      { name: 'Tuần 2', value: 700, target: 600 },
      { name: 'Tuần 3', value: 1200, target: 1000 },
      { name: 'Tuần 4', value: 1600, target: 1400 },
    ];
  }
};

const getSalesComparison = (range: string) => {
  const multiplier = range === 'today' ? 0.05 : range === 'thisWeek' ? 0.2 : 1;
  return [
    { name: 'Nguyễn Văn Nam', revenue: Math.round(500 * multiplier), deals: Math.round(25 * multiplier) },
    { name: 'Trần Thị Hương', revenue: Math.round(400 * multiplier), deals: Math.round(20 * multiplier) },
    { name: 'Lê Hoàng', revenue: Math.round(350 * multiplier), deals: Math.round(18 * multiplier) },
    { name: 'Phạm Bích Ngọc', revenue: Math.round(300 * multiplier), deals: Math.round(15 * multiplier) },
    { name: 'Vũ Minh Hiếu', revenue: Math.round(250 * multiplier), deals: Math.round(12 * multiplier) },
  ];
};

const SOURCE_DISTRIBUTION = [
  { name: 'Facebook', value: 45, color: '#6366f1' },
  { name: 'Google Ads', value: 25, color: '#3b82f6' },
  { name: 'Referral', value: 15, color: '#10b981' },
  { name: 'Offline', value: 10, color: '#f59e0b' },
  { name: 'Other', value: 5, color: '#94a3b8' },
];

const CONVERSION_BY_SOURCE = [
  { name: 'Facebook', rate: 12 },
  { name: 'Google', rate: 18 },
  { name: 'Referral', rate: 35 },
  { name: 'Offline', rate: 25 },
  { name: 'Other', rate: 8 },
];

const STATUS_BY_SOURCE = [
  { source: 'Facebook', NEW: 40, CONTACTED: 30, QUALIFIED: 20, WON: 10 },
  { source: 'Google', NEW: 30, CONTACTED: 30, QUALIFIED: 25, WON: 15 },
  { source: 'Referral', NEW: 10, CONTACTED: 20, QUALIFIED: 30, WON: 40 },
  { source: 'Offline', NEW: 20, CONTACTED: 25, QUALIFIED: 30, WON: 25 },
];

const SalesDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState('thisMonth');

  // Dynamic Data
  const kpiData = useMemo(() => getKPIData(dateRange), [dateRange]);
  const revenueData = useMemo(() => getRevenueData(dateRange), [dateRange]);
  const salesComparison = useMemo(() => getSalesComparison(dateRange), [dateRange]);

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#0d141b] font-sans">
      <div className="flex flex-col flex-1 p-6 lg:p-8 max-w-[1600px] mx-auto w-full gap-6">

        {/* Header Title & Controls */}
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Tổng quan Kinh doanh (Sales)</h1>
            <p className="text-slate-500 mt-1">Theo dõi hiệu suất bán hàng, doanh thu và tỷ lệ chuyển đổi.</p>
          </div>

          {/* Filter Controls - UPDATED */}
          <div className="flex items-center gap-4 bg-white border border-slate-200 px-4 py-2 rounded-full shadow-sm">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-slate-500" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="bg-transparent border-none text-sm font-bold focus:ring-0 cursor-pointer outline-none text-slate-700"
              >
                <option value="today">Hôm nay</option>
                <option value="thisWeek">Tuần này</option>
                <option value="thisMonth">Tháng này</option>
                <option value="thisYear">Năm nay</option>
              </select>
            </div>
          </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpiData.map((kpi, index) => (
            <div key={index} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-in fade-in duration-500">
              <p className="text-slate-500 text-sm font-medium">{kpi.label}</p>
              <div className="flex items-end justify-between mt-2">
                <p className="text-2xl font-bold text-slate-900">{kpi.value}</p>
                <div className={`flex items-center text-sm font-bold ${kpi.isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                  {kpi.isPositive ? <TrendingUp size={16} className="mr-1" /> : <TrendingDown size={16} className="mr-1" />}
                  {kpi.change}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* SALES REPORTS (Revenue & Comparison) */}
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mt-4">
          <BadgeDollarSign className="text-blue-600" /> Báo cáo Hiệu suất Bán hàng
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Revenue Report */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg text-slate-900">Doanh thu Thực tế vs Mục tiêu</h3>
              <button className="text-slate-400 hover:text-slate-600"><MoreVertical size={20} /></button>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Area type="monotone" dataKey="value" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRev)" name="Thực tế" />
                  <Area type="monotone" dataKey="target" stroke="#94a3b8" strokeDasharray="5 5" fill="none" name="Mục tiêu" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sales Comparison */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg text-slate-900">Top Sale theo Doanh số</h3>
              <button className="text-slate-400 hover:text-slate-600"><MoreVertical size={20} /></button>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesComparison} layout="vertical" barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                  <YAxis dataKey="name" type="category" width={120} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="revenue" fill="#10b981" radius={[0, 4, 4, 0]} name="Doanh số (Tr)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* MARKETING-STYLE ANALYSIS */}
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mt-4">
          <Users className="text-indigo-600" /> Phân tích Nguồn & Chuyển đổi
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Source Distribution */}
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-lg text-slate-900 mb-6">Tỷ trọng Nguồn Lead</h3>
            <div className="h-[250px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={SOURCE_DISTRIBUTION}
                    cx="50%" cy="50%"
                    innerRadius={60} outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {SOURCE_DISTRIBUTION.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                <span className="text-2xl font-bold text-slate-800">100%</span>
              </div>
            </div>
          </div>

          {/* Conversion By Source */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-lg text-slate-900 mb-6">% Chuyển đổi ra Hợp đồng theo Nguồn</h3>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={CONVERSION_BY_SOURCE} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} unit="%" />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none' }} />
                  <Bar dataKey="rate" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Tỷ lệ CĐ (%)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Status By Source */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-8">
          <h3 className="font-bold text-lg text-slate-900 mb-6">Tỷ trọng Trạng thái theo Nguồn</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={STATUS_BY_SOURCE} barSize={50}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="source" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none' }} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="NEW" stackId="a" fill="#94a3b8" name="Mới" />
                <Bar dataKey="CONTACTED" stackId="a" fill="#3b82f6" name="Đang LH" />
                <Bar dataKey="QUALIFIED" stackId="a" fill="#f59e0b" name="Đạt chuẩn/Xác thực" />
                <Bar dataKey="WON" stackId="a" fill="#10b981" name="Đã chốt (Won)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SalesDashboard;
