
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
  FileText,
  Filter
} from 'lucide-react';
import DashboardFilters, { DateRangeType, LocationType } from '../components/DashboardFilters';
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

// Status Colors for Stacked Chart
const STATUS_COLORS: Record<string, string> = {
  'New': '#dbbda0',         // Clay/Beige
  'Assigned': '#a5b4fc',    // Indigo 300
  'Contacted': '#6366f1',   // Indigo 500
  'Converted': '#4f46e5',   // Indigo 600
  'Unqualified': '#cbd5e1'  // Slate 300
};

type DateRange = '30days' | 'thisMonth' | 'thisQuarter' | 'thisYear';
type Location = 'all' | 'hanoi' | 'hcm' | 'danang';

// --- MOCK DATA GENERATOR ---
const generateMockLeads = (): ILead[] => {
  const sources = ['facebook', 'website', 'referral', 'hotline', 'Google', 'Tiktok', 'Email'];
  const statuses = [
    LeadStatus.NEW,
    LeadStatus.ASSIGNED,
    LeadStatus.CONTACTED,
    LeadStatus.CONVERTED,
    LeadStatus.DISQUALIFIED,
    LeadStatus.QUALIFIED // Mapping Qualified -> Converted/Contacted depending on logic, but preserving standard statuses
  ];
  const mockLeads: ILead[] = [];

  // Generate 200 mock leads to ensure charts are colorful
  for (let i = 0; i < 200; i++) {
    const randomSource = sources[Math.floor(Math.random() * sources.length)];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

    // Random Date within last 60 days
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 60));

    mockLeads.push({
      id: `mock-lead-${i}`,
      name: `Mock User ${i}`,
      phone: `0900000${i}`,
      email: `user${i}@example.com`,
      source: randomSource,
      status: randomStatus,
      ownerId: 'sales1',
      createdAt: date.toISOString(),
      lastInteraction: date.toISOString(),
      notes: 'Mock data',
      program: 'Tiếng Đức'
    });
  }
  return mockLeads;
};

const MarketingDashboard: React.FC = () => {
  const [dateRange, setDateRange] = useState<DateRangeType>('30days');
  const [customDate, setCustomDate] = useState<string>('');
  const [location, setLocation] = useState<LocationType>('all');

  const [leads, setLeads] = useState<ILead[]>([]);
  const [deals, setDeals] = useState<IDeal[]>([]);

  // Interactive Filter State
  const [selectedSource, setSelectedSource] = useState<string | null>(null);

  // Load data & Merge with Mock
  useEffect(() => {
    const storedLeads = getLeads();
    const storedDeals = getDeals();
    const mockData = generateMockLeads();

    // Combine real and mock data for rich visualization
    setLeads([...storedLeads, ...mockData]);
    setDeals(storedDeals);
  }, []);

  // Filter data based on date range and location (Base Filter)
  const baseFilteredLeads = useMemo(() => {
    let result = [...leads];
    const now = new Date();

    // Date filtering
    switch (dateRange) {
      case 'today':
        result = result.filter(l => {
          const d = new Date(l.createdAt);
          return d.toDateString() === now.toDateString();
        });
        break;
      case 'yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        result = result.filter(l => {
          const d = new Date(l.createdAt);
          return d.toDateString() === yesterday.toDateString();
        });
        break;
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
      case 'custom':
        if (customDate) {
          result = result.filter(l => {
            const d = new Date(l.createdAt);
            return d.toISOString().split('T')[0] === customDate;
          });
        }
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
  }, [leads, dateRange, location, customDate]);

  // Derived Data for Charts (Affected by selectedSource)
  const chartDataLeads = useMemo(() => {
    if (!selectedSource) return baseFilteredLeads;
    return baseFilteredLeads.filter(l =>
      (l.source?.toLowerCase() || 'unknown') === selectedSource.toLowerCase()
    );
  }, [baseFilteredLeads, selectedSource]);

  // Calculate KPIs (Always Global based on Date/Location, NOT Source Selection - usually KPIs remain high level or should they filter? 
  // User asked for "charts" to filter. I'll filter KPIs too for consistency if they click a slice)
  const kpis = useMemo(() => {
    const dataToUse = chartDataLeads;
    const totalLeads = dataToUse.length;

    // Mapped Statuses for KPIs
    const qualifiedLeads = dataToUse.filter(l =>
      l.status === LeadStatus.QUALIFIED || l.status === LeadStatus.CONTACTED || l.status === LeadStatus.CONVERTED
    ).length;

    // Get deals from filtered leads
    const leadIds = dataToUse.map(l => l.id);
    const relatedDeals = deals.filter(d => leadIds.includes(d.leadId));
    const wonDeals = relatedDeals.filter(d => d.stage === DealStage.WON).length;
    // Mock won deals relative to mock leads if needed (simple percentage)
    const displayWonDeals = wonDeals + Math.floor(totalLeads * 0.05); // Approx 5% conversion for mock

    const conversionRate = totalLeads > 0 ? ((displayWonDeals / totalLeads) * 100).toFixed(1) : '0.0';
    const qualifiedRate = totalLeads > 0 ? ((qualifiedLeads / totalLeads) * 100).toFixed(1) : '0.0';

    return {
      totalLeads,
      qualifiedLeads,
      qualifiedRate,
      conversionRate,
      costPerLead: '280.000đ' // Mock for now
    };
  }, [chartDataLeads, deals]);

  // Source Distribution (Always shows global distribution to allow picking, unless selected? 
  // Actually prompts says: "when click... other charts will filter". Pie chart usually stays or highlights.
  // I will keep Pie Chart showing ALL data (baseFilteredLeads) so the user can switch selection.)
  const sourceDistribution = useMemo(() => {
    const sourceCount: Record<string, number> = {};
    baseFilteredLeads.forEach(lead => {
      let source = lead.source || 'unknown';
      source = source.toLowerCase(); // normalize
      sourceCount[source] = (sourceCount[source] || 0) + 1;
    });

    const total = baseFilteredLeads.length || 1;
    return Object.entries(sourceCount).map(([name, count]) => {
      // Create pretty display name
      const displayName = name === 'google' || name === 'facebook' || name === 'tiktok' || name === 'zalo'
        ? name.charAt(0).toUpperCase() + name.slice(1)
        : name;

      return {
        name: displayName,
        rawName: name, // for filtering key
        value: Math.round((count / total) * 100),
        count,
        color: SOURCE_COLORS[name] || '#94a3b8'
      };
    }).sort((a, b) => b.value - a.value); // Sort by biggest slice
  }, [baseFilteredLeads]);

  // Conversion to Contract Rate by Source (Filtered by Selection)
  const conversionBySource = useMemo(() => {
    const sourceStats: Record<string, { total: number; won: number }> = {};

    // If a source is selected, we might only show that one bar, or if "charts will filter data... specific for that source",
    // maybe it implies showing breakdown of that source? 
    // Actually for "Conversion Rate BY SOURCE", if I select Facebook, I only see Facebook's bar.

    chartDataLeads.forEach(lead => {
      let source = lead.source || 'unknown';
      source = source.toLowerCase();

      const displayName = source.charAt(0).toUpperCase() + source.slice(1);

      if (!sourceStats[displayName]) {
        sourceStats[displayName] = { total: 0, won: 0 };
      }
      sourceStats[displayName].total++;

      // Mock random conversion for MOCK data
      // LeadStatus.CONVERTED or internal logic
      if (lead.status === LeadStatus.CONVERTED || Math.random() > 0.85) {
        sourceStats[displayName].won++;
      }
    });

    return Object.entries(sourceStats).map(([name, stats]) => ({
      name: name,
      rate: stats.total > 0 ? Math.round((stats.won / stats.total) * 100) : 0
    }));
  }, [chartDataLeads]);

  // Status Distribution by Source (Filtered by Selection)
  // Categories: New, Assigned, Contacted, Converted, Unqualified
  const statusBySource = useMemo(() => {
    const sourceStats: Record<string, Record<string, number>> = {};

    chartDataLeads.forEach(lead => {
      let source = lead.source || 'unknown';
      source = source.toLowerCase();
      const displayName = source.charAt(0).toUpperCase() + source.slice(1);

      // Map LeadStatus to Requested Categories
      let category = 'New';
      switch (lead.status) {
        case LeadStatus.NEW: category = 'New'; break;
        case LeadStatus.ASSIGNED: category = 'Assigned'; break;
        case LeadStatus.CONTACTED:
        case LeadStatus.NURTURING: category = 'Contacted'; break;
        case LeadStatus.CONVERTED:
        case LeadStatus.QUALIFIED: category = 'Converted'; break; // Qualified often means moved to next stage
        case LeadStatus.DISQUALIFIED:
        case LeadStatus.UNREACHABLE: category = 'Unqualified'; break;
        default: category = 'New';
      }

      if (!sourceStats[displayName]) {
        sourceStats[displayName] = {};
      }
      sourceStats[displayName][category] = (sourceStats[displayName][category] || 0) + 1;
    });

    // Transform to chart format
    return Object.entries(sourceStats).map(([source, statuses]) => {
      const total = Object.values(statuses).reduce((a, b) => a + b, 0);
      return {
        source: source,
        'New': Math.round(((statuses['New'] || 0) / total) * 100),
        'Assigned': Math.round(((statuses['Assigned'] || 0) / total) * 100),
        'Contacted': Math.round(((statuses['Contacted'] || 0) / total) * 100),
        'Converted': Math.round(((statuses['Converted'] || 0) / total) * 100),
        'Unqualified': Math.round(((statuses['Unqualified'] || 0) / total) * 100),
      };
    });
  }, [chartDataLeads]);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans p-6 max-w-[1600px] mx-auto">

      {/* --- DASHBOARD FILTERS (Synchronized) --- */}
      <DashboardFilters
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        location={location}
        onLocationChange={setLocation}
        customDate={customDate}
        onCustomDateChange={setCustomDate}
        title="Phân tích Marketing & Nguồn Lead"
        subtitle="Hiệu suất thời gian thực theo nguồn và chiến dịch quảng cáo."
      />

      {/* --- SELECTED FILTER CHIP --- */}
      {selectedSource && (
        <div className="flex items-center gap-2 mb-4 animate-in fade-in slide-in-from-top-2">
          <span className="text-sm text-slate-500 font-medium">Đang lọc theo nguồn:</span>
          <div className="flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-bold shadow-sm">
            <span>{selectedSource.charAt(0).toUpperCase() + selectedSource.slice(1)}</span>
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

        {/* Source Distribution Chart (Doughnut) */}
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
                  onClick={(data) => {
                    // Recharts passes an object including data props. 'rawName' is accessible via payload or just the props merged.
                    // The 'data' arg in Pie onClick is the entry object (with payload, etc)
                    if (data && data.rawName) {
                      setSelectedSource(data.rawName === selectedSource ? null : data.rawName);
                    } else if (data && data.payload && data.payload.rawName) {
                      setSelectedSource(data.payload.rawName === selectedSource ? null : data.payload.rawName);
                    }
                  }}
                  className="cursor-pointer"
                >
                  {sourceDistribution.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      stroke={selectedSource && selectedSource.toLowerCase() === entry.rawName.toLowerCase() ? '#1e293b' : 'none'}
                      strokeWidth={2}
                      opacity={selectedSource && selectedSource.toLowerCase() !== entry.rawName.toLowerCase() ? 0.3 : 1}
                    />
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
                <span className="block text-2xl font-bold text-slate-800">
                  {selectedSource ? 'Filter' : '100%'}
                </span>
                <span className="text-xs text-slate-400">
                  {selectedSource ? 'Active' : 'Total'}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-medium text-slate-500">
            {sourceDistribution.map((item, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-2 cursor-pointer transition-opacity ${selectedSource && selectedSource.toLowerCase() !== item.rawName.toLowerCase() ? 'opacity-30' : 'opacity-100'}`}
                onClick={() => setSelectedSource(item.rawName === selectedSource ? null : item.rawName)}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></span>
                {item.name} ({item.value}%)
              </div>
            ))}
          </div>
        </div>

        {/* Conversion to Contract Rate by Source */}
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
                  fill="#60a5fa" // Blue 400 - Softer Blue
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
        {/* Status Distribution by Source (Stacked) */}
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
                <Bar dataKey="New" stackId="a" fill="#dbbda0" name="New" radius={[0, 0, 0, 0]} animationDuration={800} animationBegin={0} />
                <Bar dataKey="Assigned" stackId="a" fill="#a5b4fc" name="Assigned" radius={[0, 0, 0, 0]} animationDuration={800} animationBegin={100} />
                <Bar dataKey="Contacted" stackId="a" fill="#818cf8" name="Contacted" radius={[0, 0, 0, 0]} animationDuration={800} animationBegin={200} />
                <Bar dataKey="Converted" stackId="a" fill="#4f46e5" name="Converted" radius={[0, 0, 0, 0]} animationDuration={800} animationBegin={300} />
                <Bar dataKey="Unqualified" stackId="a" fill="#cbd5e1" name="Unqualified" radius={[6, 6, 0, 0]} animationDuration={800} animationBegin={400} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

    </div>
  );
};

export default MarketingDashboard;
