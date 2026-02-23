import React, { useState, useMemo, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar, CartesianGrid
} from 'recharts';
import {
  ArrowUp, ArrowDown, MoreVertical, Calendar, TrendingUp, TrendingDown,
  Users, BadgeDollarSign, Filter
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardFilters, { DateRangeType, LocationType } from '../components/DashboardFilters';

// --- MOCK DATA ---
interface ISaleRecord {
  id: string;
  amount: number;
  date: string;
  salesPerson: string;
  source: string;
  status: 'Won' | 'Lost' | 'Negotiation' | 'Qualified' | 'New';
}

const SALES_PEOPLE = ['Nguyễn Văn Nam', 'Trần Thị Hương', 'Lê Hoàng', 'Phạm Bích Ngọc', 'Vũ Minh Hiếu'];
const SOURCES = ['Facebook', 'Google Ads', 'Referral', 'Offline', 'Other'];

const generateMockSalesData = (): ISaleRecord[] => {
  const data: ISaleRecord[] = [];
  const now = new Date();

  // Generate 500 sales records over last 3 months
  for (let i = 0; i < 500; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - Math.floor(Math.random() * 90));

    // Weighted random source
    const rand = Math.random();
    let source = 'Other';
    if (rand < 0.4) source = 'Facebook';
    else if (rand < 0.65) source = 'Google Ads';
    else if (rand < 0.8) source = 'Referral';
    else if (rand < 0.9) source = 'Offline';

    data.push({
      id: `sale-${i}`,
      amount: Math.floor(Math.random() * 50) + 10, // 10-60 Trieu
      date: date.toISOString(),
      salesPerson: SALES_PEOPLE[Math.floor(Math.random() * SALES_PEOPLE.length)],
      source,
      status: Math.random() > 0.7 ? 'Won' : Math.random() > 0.4 ? 'Negotiation' : 'New'
    });
  }
  return data;
};

// Colors (Soft Palette)
const COLORS = {
  Facebook: '#60a5fa', // Blue 400
  'Google Ads': '#818cf8', // Indigo 400
  Referral: '#2dd4bf', // Teal 400
  Offline: '#fbbf24', // Amber 400
  Other: '#cbd5e1', // Slate 300
};

const SalesDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<DateRangeType>('thisMonth');
  const [customDate, setCustomDate] = useState<string>('');
  const [location, setLocation] = useState<LocationType>('all');

  // Filtering State
  const [selectedSource, setSelectedSource] = useState<string | null>(null);

  // Raw Data
  const [allSales, setAllSales] = useState<ISaleRecord[]>([]);

  useEffect(() => {
    setAllSales(generateMockSalesData());
  }, []);

  // Filtered Data Logic
  const filteredSales = useMemo(() => {
    let result = [...allSales];
    const now = new Date();

    // Date Filter
    if (dateRange === 'thisMonth') {
      result = result.filter(s => new Date(s.date).getMonth() === now.getMonth() && new Date(s.date).getFullYear() === now.getFullYear());
    } else if (dateRange === 'thisQuarter') {
      const q = Math.floor(now.getMonth() / 3);
      result = result.filter(s => Math.floor(new Date(s.date).getMonth() / 3) === q && new Date(s.date).getFullYear() === now.getFullYear());
    }
    // (Simplified date logic for demo)

    // Source Filter
    if (selectedSource) {
      result = result.filter(s => s.source === selectedSource);
    }

    return result;
  }, [allSales, dateRange, selectedSource]);

  // --- DERIVED CHART DATA ---

  // 1. KPIs
  const kpiData = useMemo(() => {
    const totalRevenue = filteredSales.filter(s => s.status === 'Won').reduce((sum, s) => sum + s.amount, 0);
    const pipelineValue = filteredSales.filter(s => s.status !== 'Won' && s.status !== 'Lost').reduce((sum, s) => sum + s.amount, 0);
    const wonCount = filteredSales.filter(s => s.status === 'Won').length;
    const totalCount = filteredSales.length;

    return [
      { label: 'Tổng doanh thu thực thu', value: `${(totalRevenue / 1000).toFixed(1)} Tỷ`, change: '+12%', isPositive: true },
      { label: 'Tổng giá trị Pipeline', value: `${(pipelineValue / 1000).toFixed(1)} Tỷ`, change: '+8%', isPositive: true },
      { label: 'Tỷ lệ chuyển đổi chung', value: totalCount ? `${((wonCount / totalCount) * 100).toFixed(1)}%` : '0%', change: '-2%', isPositive: false },
      { label: '% Lead xác thực', value: '45%', change: '+5%', isPositive: true }, // Static for demo
    ];
  }, [filteredSales]);

  // 2. Revenue Graph (Time Series)
  const revenueData = useMemo(() => {
    // Bucket by week/day (Simplified: Just bucket by index for area chart shape)
    // Real impl would bucket by date.
    // Let's create dummy buckets based on filtered sales count to show change
    const buckets = 6;
    const data = [];
    for (let i = 0; i < buckets; i++) {
      const val = filteredSales.length * (Math.random() * 0.5 + 0.5) * 10;
      data.push({ name: `Tuần ${i + 1}`, value: Math.round(val), target: Math.round(val * 0.9) });
    }
    return data;
  }, [filteredSales]);

  // 3. Top Sales
  const salesComparison = useMemo(() => {
    const stats: Record<string, number> = {};
    filteredSales.filter(s => s.status === 'Won').forEach(s => {
      stats[s.salesPerson] = (stats[s.salesPerson] || 0) + s.amount;
    });
    return Object.entries(stats)
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [filteredSales]);

  // 4. Source Distribution (For Pie Chart) - THIS CONTROLS THE FILTER
  // Note: Pie chart should usually show ALL sources even if filtered? 
  // Standard UI pattern: Pie shows global distribution. Clicking filters others.
  // If we filter the Pie chart itself, it becomes 100% of 1 slice.
  // So we derive this from `allSales` (filtered by DATE only, NOT Source).
  const sourceDistribution = useMemo(() => {
    const dateFiltered = allSales.filter(s => {
      // Apply same date logic as main filter
      if (dateRange === 'thisMonth') {
        const now = new Date();
        return new Date(s.date).getMonth() === now.getMonth();
      }
      return true;
    });

    const counts: Record<string, number> = {};
    dateFiltered.forEach(s => counts[s.source] = (counts[s.source] || 0) + 1);

    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      color: COLORS[name as keyof typeof COLORS] || COLORS.Other
    }));
  }, [allSales, dateRange]);

  // 5. Conversion Rate
  const conversionBySource = useMemo(() => {
    // If filtered by source, show only that source or breakdown?
    // Let's show breakdown of valid sources in current view
    const dataToUse = selectedSource ? filteredSales : allSales; // Simplify for demo

    // Actually, usually Bar charts react to filter.
    const sources = selectedSource ? [selectedSource] : SOURCES;

    return sources.map(source => ({
      name: source,
      rate: Math.floor(Math.random() * 30) + 10 // Mock rate
    }));
  }, [selectedSource, filteredSales, allSales]);

  // 6. Status Stacked
  const statusBySource = useMemo(() => {
    const sources = selectedSource ? [selectedSource] : SOURCES;
    return sources.map(source => ({
      source,
      NEW: Math.floor(Math.random() * 50),
      CONTACTED: Math.floor(Math.random() * 40),
      QUALIFIED: Math.floor(Math.random() * 30),
      WON: Math.floor(Math.random() * 20),
    }));
  }, [selectedSource]);


  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#0d141b] font-sans">
      <div className="flex flex-col flex-1 p-6 lg:p-8 max-w-[1600px] mx-auto w-full gap-6">

        {/* Header Title & Controls */}
        <DashboardFilters
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          location={location}
          onLocationChange={setLocation}
          customDate={customDate}
          onCustomDateChange={setCustomDate}
          title="Tổng quan Kinh doanh (Sales)"
          subtitle="Theo dõi hiệu suất bán hàng, doanh thu và tỷ lệ chuyển đổi."
        />

        {/* --- SELECTED FILTER CHIP --- */}
        {selectedSource && (
          <div className="flex items-center gap-2 mb-2 animate-in fade-in slide-in-from-top-2">
            <span className="text-sm text-slate-500 font-medium">Đang lọc theo nguồn:</span>
            <div className="flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-bold shadow-sm">
              <span>{selectedSource}</span>
              <button
                onClick={() => setSelectedSource(null)}
                className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
              >
                <Filter size={12} />
              </button>
            </div>
            <button
              onClick={() => setSelectedSource(null)}
              className="text-xs text-slate-400 underline hover:text-slate-600"
            >
              Xóa lọc
            </button>
          </div>
        )}

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
                      <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Area type="monotone" dataKey="value" stroke="#60a5fa" fillOpacity={1} fill="url(#colorRev)" name="Thực tế" />
                  <Area type="monotone" dataKey="target" stroke="#cbd5e1" strokeDasharray="5 5" fill="none" name="Mục tiêu" />
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
                  <Bar dataKey="revenue" fill="#818cf8" radius={[0, 4, 4, 0]} name="Doanh số (Tr)" />
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
                    data={sourceDistribution}
                    cx="50%" cy="50%"
                    innerRadius={60} outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    onClick={(data) => {
                      if (data && data.name) {
                        setSelectedSource(data.name === selectedSource ? null : data.name);
                      }
                    }}
                    className="cursor-pointer"
                  >
                    {sourceDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        stroke={selectedSource === entry.name ? '#1e293b' : 'none'}
                        strokeWidth={2}
                        opacity={selectedSource && selectedSource !== entry.name ? 0.3 : 1}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                <div className="text-center">
                  <span className="block text-2xl font-bold text-slate-800">
                    {selectedSource ? 'Lọc' : '100%'}
                  </span>
                  <span className="text-xs text-slate-400">
                    {selectedSource ? selectedSource : 'Tổng quan'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Conversion By Source */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-lg text-slate-900 mb-6">% Chuyển đổi ra Hợp đồng theo Nguồn</h3>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={conversionBySource} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} unit="%" />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none' }} />
                  <Bar dataKey="rate" fill="#60a5fa" radius={[4, 4, 0, 0]} name="Tỷ lệ CĐ (%)" />
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
              <BarChart data={statusBySource} barSize={50}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="source" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none' }} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="NEW" stackId="a" fill="#cbd5e1" name="Mới" />
                <Bar dataKey="CONTACTED" stackId="a" fill="#a5b4fc" name="Đang LH" />
                <Bar dataKey="QUALIFIED" stackId="a" fill="#818cf8" name="Đạt chuẩn/Xác thực" />
                <Bar dataKey="WON" stackId="a" fill="#4f46e5" name="Đã chốt (Won)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SalesDashboard;
