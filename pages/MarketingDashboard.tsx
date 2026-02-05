
import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  Users,
  ShieldCheck,
  MousePointerClick,
  DollarSign,
  TrendingUp,
  TrendingDown,
  MoreVertical,
  Calendar,
  MapPin,
  FileText
} from 'lucide-react';
import { getLeads, getDeals } from '../utils/storage';
import { ILead, IDeal, LeadStatus, DealStage } from '../types';

// Color mapping for sources - Enhanced vibrant colors
const SOURCE_COLORS: Record<string, string> = {
  'facebook': '#6366f1',      // Indigo
  'hotline': '#f59e0b',       // Amber
  'referral': '#06b6d4',      // Cyan
  'website': '#ec4899',       // Pink
  'ad_campaign': '#8b5cf6',   // Violet
  'company_data': '#10b981',  // Emerald
  'sale_self': '#64748b',     // Slate
  'unknown': '#94a3b8',       // Light Slate
  'SLA Test': '#8b9dc3',      // Muted Blue
  'Google': '#34a853',        // Google Green
  'Zalo': '#0068ff',          // Zalo Blue
  'TikTok': '#000000',        // TikTok Black
  'Email': '#ea4335',         // Red
};

type DateRange = '30days' | 'thisMonth' | 'thisQuarter' | 'thisYear';
type Location = 'all' | 'hanoi' | 'hcm' | 'danang';

const MarketingDashboard: React.FC = () => {
  const [dateRange, setDateRange] = useState<DateRange>('30days');
  const [location, setLocation] = useState<Location>('all');
  const [leads, setLeads] = useState<ILead[]>([]);
  const [deals, setDeals] = useState<IDeal[]>([]);

  // Load data
  useEffect(() => {
    setLeads(getLeads());
    setDeals(getDeals());
  }, []);

  // Filter data based on date range and location
  const filteredLeads = useMemo(() => {
    let result = [...leads];
    const now = new Date();

    // Date filtering
    switch (dateRange) {
      case '30days':
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        result = result.filter(l => new Date(l.createdAt) >= thirtyDaysAgo);
        break;
      case 'thisMonth':
        result = result.filter(l => {
          const d = new Date(l.createdAt);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
        break;
      case 'thisQuarter':
        const currentQuarter = Math.floor(now.getMonth() / 3);
        result = result.filter(l => {
          const d = new Date(l.createdAt);
          const leadQuarter = Math.floor(d.getMonth() / 3);
          return leadQuarter === currentQuarter && d.getFullYear() === now.getFullYear();
        });
        break;
      case 'thisYear':
        result = result.filter(l => new Date(l.createdAt).getFullYear() === now.getFullYear());
        break;
    }

    // Location filtering
    if (location !== 'all') {
      const locationMap: Record<Location, string> = {
        'all': '',
        'hanoi': 'Hà Nội',
        'hcm': 'HCM',
        'danang': 'Đà Nẵng'
      };
      const cityName = locationMap[location];
      result = result.filter(l => (l as any).city?.includes(cityName));
    }

    return result;
  }, [leads, dateRange, location]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const totalLeads = filteredLeads.length;
    const qualifiedLeads = filteredLeads.filter(l =>
      l.status === LeadStatus.QUALIFIED || l.status === LeadStatus.CONTACTED
    ).length;

    // Get deals from filtered leads
    const leadIds = filteredLeads.map(l => l.id);
    const relatedDeals = deals.filter(d => leadIds.includes(d.leadId));
    const wonDeals = relatedDeals.filter(d => d.stage === DealStage.WON).length;

    const conversionRate = totalLeads > 0 ? ((wonDeals / totalLeads) * 100).toFixed(1) : '0.0';
    const qualifiedRate = totalLeads > 0 ? ((qualifiedLeads / totalLeads) * 100).toFixed(1) : '0.0';

    return {
      totalLeads,
      qualifiedLeads,
      qualifiedRate,
      conversionRate,
      costPerLead: '280.000đ' // Mock for now
    };
  }, [filteredLeads, deals]);

  // Calculate source distribution (Tổng số lead phân bổ theo tỷ trọng nguồn)
  const sourceDistribution = useMemo(() => {
    const sourceCount: Record<string, number> = {};
    filteredLeads.forEach(lead => {
      const source = lead.source || 'unknown';
      sourceCount[source] = (sourceCount[source] || 0) + 1;
    });

    const total = filteredLeads.length || 1;
    return Object.entries(sourceCount).map(([name, count]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value: Math.round((count / total) * 100),
      count,
      color: SOURCE_COLORS[name] || '#94a3b8'
    }));
  }, [filteredLeads]);

  // Calculate conversion to contract rate by source (% chuyển đổi ra hợp đồng)
  const conversionBySource = useMemo(() => {
    const sourceStats: Record<string, { total: number; won: number }> = {};

    filteredLeads.forEach(lead => {
      const source = lead.source || 'unknown';
      if (!sourceStats[source]) {
        sourceStats[source] = { total: 0, won: 0 };
      }
      sourceStats[source].total++;

      // Check if lead converted to won deal
      const wonDeal = deals.find(d => d.leadId === lead.id && d.stage === DealStage.WON);
      if (wonDeal) {
        sourceStats[source].won++;
      }
    });

    return Object.entries(sourceStats).map(([name, stats]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      total: stats.total,
      converted: stats.won,
      rate: stats.total > 0 ? Math.round((stats.won / stats.total) * 100) : 0
    }));
  }, [filteredLeads, deals]);

  // Calculate status distribution by source (Tỷ trọng các trạng thái chuyển đổi theo từng nguồn)
  const statusBySource = useMemo(() => {
    const sourceStats: Record<string, Record<string, number>> = {};

    filteredLeads.forEach(lead => {
      const source = lead.source || 'unknown';
      const status = lead.status || 'NEW';

      if (!sourceStats[source]) {
        sourceStats[source] = {};
      }
      sourceStats[source][status] = (sourceStats[source][status] || 0) + 1;
    });

    // Transform to chart format
    return Object.entries(sourceStats).map(([source, statuses]) => {
      const total = Object.values(statuses).reduce((a, b) => a + b, 0);
      return {
        source: source.charAt(0).toUpperCase() + source.slice(1),
        NEW: Math.round(((statuses['NEW'] || 0) / total) * 100),
        CONTACTED: Math.round(((statuses['CONTACTED'] || 0) / total) * 100),
        QUALIFIED: Math.round(((statuses['QUALIFIED'] || 0) / total) * 100),
        DISQUALIFIED: Math.round(((statuses['DISQUALIFIED'] || 0) / total) * 100),
      };
    });
  }, [filteredLeads]);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans p-6 max-w-[1600px] mx-auto">

      {/* --- DASHBOARD HEADER CONTROLS --- */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          {/* Mobile Title View usually handled by Layout */}
        </div>

        {/* Date & Location Filters (Top Right) */}
        <div className="flex items-center gap-6 w-full md:w-auto justify-end">
          <div className="flex items-center gap-4 bg-white border border-slate-200 px-4 py-2 rounded-full shadow-sm">
            <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
              <Calendar size={16} className="text-slate-500" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as DateRange)}
                className="bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer outline-none text-slate-700"
              >
                <option value="30days">30 ngày qua</option>
                <option value="thisMonth">Tháng này</option>
                <option value="thisQuarter">Quý này</option>
                <option value="thisYear">Năm nay</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-slate-500" />
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value as Location)}
                className="bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer outline-none text-slate-700"
              >
                <option value="all">Tất cả chi nhánh</option>
                <option value="hanoi">Trụ sở Hà Nội</option>
                <option value="hcm">Chi nhánh HCM</option>
                <option value="danang">Văn phòng Đà Nẵng</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* --- TITLE & ACTIONS --- */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Phân tích Marketing & Nguồn Lead</h2>
          <p className="text-slate-500 mt-1">Hiệu suất thời gian thực theo nguồn và chiến dịch quảng cáo.</p>
        </div>
      </div>

      {/* --- KPI CARDS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

        {/* Card 1: Total Leads */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-blue-50 p-3 rounded-xl">
              <Users className="text-[#6366f1]" size={24} />
            </div>
            <span className="text-emerald-600 text-sm font-bold flex items-center bg-emerald-50 px-2 py-1 rounded-lg">
              <TrendingUp size={14} className="mr-1" /> +12.5%
            </span>
          </div>
          <h3 className="text-slate-500 text-sm font-medium">Tổng số Leads</h3>
          <p className="text-3xl font-bold mt-1 text-slate-900">{kpis.totalLeads.toLocaleString()}</p>
        </div>

        {/* Card 2: Qualified Rate */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-emerald-50 p-3 rounded-xl">
              <ShieldCheck className="text-emerald-600" size={24} />
            </div>
            <span className="text-emerald-600 text-sm font-bold flex items-center bg-emerald-50 px-2 py-1 rounded-lg">
              <TrendingUp size={14} className="mr-1" /> +8.2%
            </span>
          </div>
          <h3 className="text-slate-500 text-sm font-medium">% Lead xác thực</h3>
          <p className="text-3xl font-bold mt-1 text-slate-900">{kpis.qualifiedRate}%</p>
        </div>

        {/* Card 3: Conversion to Contract Rate */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-purple-50 p-3 rounded-xl">
              <FileText className="text-purple-600" size={24} />
            </div>
            <span className="text-rose-500 text-sm font-bold flex items-center bg-rose-50 px-2 py-1 rounded-lg">
              <TrendingDown size={14} className="mr-1" /> -2.4%
            </span>
          </div>
          <h3 className="text-slate-500 text-sm font-medium">% Chuyển đổi ra Hợp đồng</h3>
          <p className="text-3xl font-bold mt-1 text-slate-900">{kpis.conversionRate}%</p>
        </div>

        {/* Card 4: Qualified Leads Count */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-amber-50 p-3 rounded-xl">
              <MousePointerClick className="text-amber-600" size={24} />
            </div>
            <span className="text-emerald-600 text-sm font-bold flex items-center bg-emerald-50 px-2 py-1 rounded-lg">
              <TrendingUp size={14} className="mr-1" /> +15%
            </span>
          </div>
          <h3 className="text-slate-500 text-sm font-medium">Lead Xác thực</h3>
          <p className="text-3xl font-bold mt-1 text-slate-900">{kpis.qualifiedLeads.toLocaleString()}</p>
        </div>
      </div>

      {/* --- CHARTS SECTION ROW 1 --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">

        {/* Source Distribution Chart (Doughnut) - Tổng số lead phân bổ theo tỷ trọng nguồn */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-left-4 duration-700 delay-400">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-slate-900">Nguồn Lead</h3>
            <button className="text-slate-400 hover:text-slate-600">
              <MoreVertical size={20} />
            </button>
          </div>
          <div className="h-[250px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sourceDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                  animationBegin={0}
                  animationDuration={1200}
                  animationEasing="ease-out"
                >
                  {sourceDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    padding: '8px 12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Text */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <span className="block text-2xl font-bold text-slate-800">100%</span>
                <span className="text-xs text-slate-400">Total</span>
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-medium text-slate-500">
            {sourceDistribution.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></span>
                {item.name} ({item.value}%)
              </div>
            ))}
          </div>
        </div>

        {/* Conversion to Contract Rate by Source - % chuyển đổi ra hợp đồng */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-right-4 duration-700 delay-500">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-slate-900">% Chuyển đổi ra Hợp đồng theo Nguồn</h3>
            <button className="text-slate-400 hover:text-slate-600">
              <MoreVertical size={20} />
            </button>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={conversionBySource} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  label={{ value: '%', position: 'insideLeft', style: { fill: '#64748b' } }}
                />
                <Tooltip
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar
                  dataKey="rate"
                  fill="#10b981"
                  radius={[6, 6, 0, 0]}
                  name="Tỷ lệ chuyển đổi (%)"
                  animationDuration={1000}
                  animationEasing="ease-out"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* --- CHARTS SECTION ROW 2 --- */}
      <div className="grid grid-cols-1 gap-8 mb-8">
        {/* Status Distribution by Source - Tỷ trọng các trạng thái chuyển đổi theo từng nguồn */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-600">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-slate-900">Tỷ trọng Trạng thái theo Nguồn</h3>
            <button className="text-slate-400 hover:text-slate-600">
              <MoreVertical size={20} />
            </button>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusBySource} barSize={50}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="source"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  label={{ value: '%', position: 'insideLeft', style: { fill: '#64748b' } }}
                />
                <Tooltip
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="circle"
                />
                <Bar dataKey="NEW" stackId="a" fill="#3b82f6" name="Mới" radius={[0, 0, 0, 0]} animationDuration={800} animationBegin={0} />
                <Bar dataKey="CONTACTED" stackId="a" fill="#06b6d4" name="Đã liên hệ" radius={[0, 0, 0, 0]} animationDuration={800} animationBegin={100} />
                <Bar dataKey="QUALIFIED" stackId="a" fill="#10b981" name="Đạt chuẩn" radius={[0, 0, 0, 0]} animationDuration={800} animationBegin={200} />
                <Bar dataKey="DISQUALIFIED" stackId="a" fill="#ef4444" name="Loại bỏ" radius={[6, 6, 0, 0]} animationDuration={800} animationBegin={300} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

    </div>
  );
};

export default MarketingDashboard;
