import React, { useEffect, useMemo, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar, CartesianGrid
} from 'recharts';
import {
  MoreVertical, TrendingUp, TrendingDown,
  Users, BadgeDollarSign, Filter
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardFilters, { DateRangeType, LocationType } from '../components/DashboardFilters';
import { getDeals, getQuotations } from '../utils/storage';
import { DealStage, QuotationStatus } from '../types';

interface ISaleRecord {
  id: string;
  amount: number;
  date: string;
  salesPerson: string;
  source: string;
  status: 'Won' | 'Lost' | 'Negotiation' | 'Qualified' | 'New';
}

// Bảng màu cho biểu đồ tỷ trọng nguồn.
const COLORS: Record<string, string> = {
  Facebook: '#60a5fa',
  'Google Ads': '#818cf8',
  Referral: '#2dd4bf',
  Offline: '#fbbf24',
  Other: '#cbd5e1',
};

const getSaleColor = (name: string) => COLORS[name] || COLORS.Other;

// Đưa giá trị tiền vào đơn vị "Triệu" cho dễ đọc.
const toMillion = (value: number) => Math.round(value / 1_000_000);

const buildSalesFromStorage = (): ISaleRecord[] => {
  const deals = getDeals();
  const quotations = getQuotations();
  const records: ISaleRecord[] = [];

  // Map deal → ISaleRecord. Coi như tất cả deal đều có 1 báo giá liên kết để lấy doanh số.
  deals.forEach((deal) => {
    const linkedQuotation = quotations.find((q) => q.dealId === deal.id) || quotations[0];
    const amount = linkedQuotation ? toMillion(linkedQuotation.totalAmount || 0) : 0;
    let status: ISaleRecord['status'] = 'New';
    if (deal.stage === DealStage.WON || deal.stage === DealStage.CONTRACT) status = 'Won';
    else if (deal.stage === DealStage.LOST) status = 'Lost';
    else if (deal.stage === DealStage.NEGOTIATION) status = 'Negotiation';
    else if (deal.stage === DealStage.PROPOSAL) status = 'Qualified';

    records.push({
      id: deal.id,
      amount,
      date: deal.createdAt || new Date().toISOString(),
      salesPerson: deal.assigneeName || 'Chưa rõ',
      source: deal.source || 'Other',
      status,
    });
  });

  // Bổ sung báo giá đã chốt (LOCKED / SALE_CONFIRMED) chưa có deal tương ứng.
  quotations.forEach((q) => {
    const alreadyMapped = records.some((r) => r.id === q.dealId);
    if (alreadyMapped) return;
    if (q.status === QuotationStatus.LOCKED || q.status === QuotationStatus.SALE_CONFIRMED) {
      records.push({
        id: `quotation-${q.id}`,
        amount: toMillion(q.totalAmount || 0),
        date: q.issuedAt || q.createdAt || new Date().toISOString(),
        salesPerson: q.salespersonName || 'Chưa rõ',
        source: 'Other',
        status: 'Won',
      });
    }
  });

  return records;
};

const SalesDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<DateRangeType>('thisMonth');
  const [customDate, setCustomDate] = useState<string>('');
  const [location, setLocation] = useState<LocationType>('all');
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [allSales, setAllSales] = useState<ISaleRecord[]>([]);

  useEffect(() => {
    setAllSales(buildSalesFromStorage());
  }, []);

  const filteredSales = useMemo(() => {
    let result = [...allSales];
    const now = new Date();

    if (dateRange === 'thisMonth') {
      result = result.filter((s) => {
        const d = new Date(s.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
    } else if (dateRange === 'thisQuarter') {
      const q = Math.floor(now.getMonth() / 3);
      result = result.filter((s) => Math.floor(new Date(s.date).getMonth() / 3) === q && new Date(s.date).getFullYear() === now.getFullYear());
    }

    if (selectedSource) {
      result = result.filter((s) => s.source === selectedSource);
    }

    return result;
  }, [allSales, dateRange, selectedSource]);

  // 1. KPI
  const kpiData = useMemo(() => {
    const totalRevenue = filteredSales.filter((s) => s.status === 'Won').reduce((sum, s) => sum + s.amount, 0);
    const pipelineValue = filteredSales.filter((s) => s.status !== 'Won' && s.status !== 'Lost').reduce((sum, s) => sum + s.amount, 0);
    const wonCount = filteredSales.filter((s) => s.status === 'Won').length;
    const totalCount = filteredSales.length;

    return [
      { label: 'Tổng doanh thu thực thu', value: `${(totalRevenue / 1000).toFixed(1)} Tỷ`, change: '', isPositive: true },
      { label: 'Tổng giá trị Pipeline', value: `${(pipelineValue / 1000).toFixed(1)} Tỷ`, change: '', isPositive: true },
      { label: 'Tỷ lệ chuyển đổi chung', value: totalCount ? `${((wonCount / totalCount) * 100).toFixed(1)}%` : '0%', change: '', isPositive: true },
      { label: 'Số deal đã chốt', value: `${wonCount}`, change: '', isPositive: true },
    ];
  }, [filteredSales]);

  // 2. Biểu đồ doanh thu theo tuần dựa vào ngày tạo deal.
  const revenueData = useMemo(() => {
    const buckets = 6;
    const data: Array<{ name: string; value: number; target: number }> = [];
    if (filteredSales.length === 0) {
      for (let i = 0; i < buckets; i++) {
        data.push({ name: `Tuần ${i + 1}`, value: 0, target: 0 });
      }
      return data;
    }
    const sorted = [...filteredSales].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const start = new Date(sorted[0].date).getTime();
    const end = new Date(sorted[sorted.length - 1].date).getTime();
    const span = Math.max(1, end - start);
    const bucketSize = span / buckets;
    for (let i = 0; i < buckets; i++) {
      const from = start + bucketSize * i;
      const to = start + bucketSize * (i + 1);
      const bucketSales = filteredSales.filter((s) => {
        const t = new Date(s.date).getTime();
        return t >= from && t < to && s.status === 'Won';
      });
      const value = bucketSales.reduce((sum, s) => sum + s.amount, 0);
      data.push({ name: `Tuần ${i + 1}`, value, target: 0 });
    }
    return data;
  }, [filteredSales]);

  // 3. Top sales theo doanh số.
  const salesComparison = useMemo(() => {
    const stats: Record<string, number> = {};
    filteredSales.filter((s) => s.status === 'Won').forEach((s) => {
      stats[s.salesPerson] = (stats[s.salesPerson] || 0) + s.amount;
    });
    return Object.entries(stats)
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [filteredSales]);

  // 4. Tỷ trọng nguồn (lấy theo bộ lọc ngày, không lọc theo nguồn để giữ đầy đủ slices).
  const sourceDistribution = useMemo(() => {
    const dateFiltered = allSales.filter((s) => {
      if (dateRange === 'thisMonth') {
        const now = new Date();
        return new Date(s.date).getMonth() === now.getMonth();
      }
      return true;
    });

    const counts: Record<string, number> = {};
    dateFiltered.forEach((s) => {
      counts[s.source] = (counts[s.source] || 0) + 1;
    });

    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      color: getSaleColor(name),
    }));
  }, [allSales, dateRange]);

  // 5. Tỷ lệ chuyển đổi ra hợp đồng theo nguồn.
  const conversionBySource = useMemo(() => {
    const sourceStats: Record<string, { won: number; total: number }> = {};
    filteredSales.forEach((s) => {
      if (!sourceStats[s.source]) sourceStats[s.source] = { won: 0, total: 0 };
      sourceStats[s.source].total += 1;
      if (s.status === 'Won') sourceStats[s.source].won += 1;
    });
    return Object.entries(sourceStats).map(([name, { won, total }]) => ({
      name,
      rate: total > 0 ? Math.round((won / total) * 100) : 0,
    }));
  }, [filteredSales]);

  // 6. Phân bổ trạng thái theo nguồn.
  const statusBySource = useMemo(() => {
    const sourceMap: Record<string, { NEW: number; CONTACTED: number; QUALIFIED: number; WON: number }> = {};
    filteredSales.forEach((s) => {
      if (!sourceMap[s.source]) sourceMap[s.source] = { NEW: 0, CONTACTED: 0, QUALIFIED: 0, WON: 0 };
      if (s.status === 'New') sourceMap[s.source].NEW += 1;
      else if (s.status === 'Negotiation') sourceMap[s.source].CONTACTED += 1;
      else if (s.status === 'Qualified') sourceMap[s.source].QUALIFIED += 1;
      else if (s.status === 'Won') sourceMap[s.source].WON += 1;
    });
    return Object.entries(sourceMap).map(([source, value]) => ({ source, ...value }));
  }, [filteredSales]);

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#0d141b] font-sans">
      <div className="flex flex-col flex-1 p-6 lg:p-8 max-w-[1600px] mx-auto w-full gap-6">
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

        {selectedSource && (
          <div className="flex items-center gap-2 mb-2 animate-in fade-in slide-in-from-top-2">
            <span className="text-sm text-slate-500 font-medium">Đang lọc theo nguồn:</span>
            <div className="flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-bold shadow-sm">
              <span>{selectedSource}</span>
              <button onClick={() => setSelectedSource(null)} className="hover:bg-blue-200 rounded-full p-0.5 transition-colors">
                <Filter size={12} />
              </button>
            </div>
            <button onClick={() => setSelectedSource(null)} className="text-xs text-slate-400 underline hover:text-slate-600">
              Xóa lọc
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpiData.map((kpi, index) => (
            <div key={index} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-in fade-in duration-500">
              <p className="text-slate-500 text-sm font-medium">{kpi.label}</p>
              <div className="flex items-end justify-between mt-2">
                <p className="text-2xl font-bold text-slate-900">{kpi.value}</p>
                {kpi.change ? (
                  <div className={`flex items-center text-sm font-bold ${kpi.isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                    {kpi.isPositive ? <TrendingUp size={16} className="mr-1" /> : <TrendingDown size={16} className="mr-1" />}
                    {kpi.change}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mt-4">
          <BadgeDollarSign className="text-blue-600" /> Báo cáo Hiệu suất Bán hàng
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg text-slate-900">Doanh thu theo thời gian</h3>
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
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

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

        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mt-4">
          <Users className="text-indigo-600" /> Phân tích Nguồn & Chuyển đổi
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
                      if (data && (data as { name?: string }).name) {
                        const name = (data as { name?: string }).name as string;
                        setSelectedSource(name === selectedSource ? null : name);
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
