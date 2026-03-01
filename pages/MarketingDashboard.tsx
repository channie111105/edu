
import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  Users,
  ShieldCheck,
  MousePointerClick,
  TrendingUp,
  TrendingDown,
  MoreVertical,
  FileText
} from 'lucide-react';
import DashboardFilters, {
  DateRangeType,
  LocationType,
  ProductFilterType,
  VerificationFilterType,
  SelectOption
} from '../components/DashboardFilters';
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

const PRODUCT_COLORS: Record<string, string> = {
  'tiếng đức - a1': '#6366f1',
  'tiếng đức - a2': '#818cf8',
  'tiếng đức - b1': '#4f46e5',
  'tiếng đức - combo': '#a5b4fc',
  'tiếng trung - hsk 1': '#f59e0b',
  'tiếng trung - hsk 2': '#f97316',
  'tiếng trung - combo': '#fbbf24',
  'khác': '#94a3b8',
};

// Status Colors for Stacked Chart
const STATUS_COLORS: Record<string, string> = {
  'New': '#dbbda0',         // Clay/Beige
  'Assigned': '#a5b4fc',    // Indigo 300
  'Contacted': '#6366f1',   // Indigo 500
  'Converted': '#4f46e5',   // Indigo 600
  'Unqualified': '#cbd5e1'  // Slate 300
};

const isVerifiedLead = (lead: ILead) =>
  lead.status === LeadStatus.QUALIFIED ||
  lead.status === LeadStatus.CONTACTED ||
  lead.status === LeadStatus.CONVERTED;

const normalizeText = (value?: string) =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const normalizeProgram = (value?: string) => {
  const normalized = normalizeText(value);
  if (normalized.includes('duc') || normalized.includes('german')) return 'Tiếng Đức';
  if (normalized.includes('trung') || normalized.includes('chinese')) return 'Tiếng Trung';
  return '';
};

const inferGermanProductLevel = (raw: string) => {
  if (raw.includes('a1')) return 'A1';
  if (raw.includes('a2')) return 'A2';
  if (raw.includes('b1')) return 'B1';
  if (raw.includes('combo')) return 'Combo';
  return 'Combo';
};

const inferChineseProductLevel = (raw: string) => {
  if (raw.includes('hsk1') || raw.includes('hsk 1')) return 'HSK 1';
  if (raw.includes('hsk2') || raw.includes('hsk 2')) return 'HSK 2';
  if (raw.includes('combo')) return 'Combo';
  return 'Combo';
};

const getLeadProductLabel = (lead: ILead) => {
  const program = normalizeProgram(lead.program);
  const raw = normalizeText(`${lead.product || ''} ${lead.program || ''}`);

  if (program === 'Tiếng Đức') return `Tiếng Đức - ${inferGermanProductLevel(raw)}`;
  if (program === 'Tiếng Trung') return `Tiếng Trung - ${inferChineseProductLevel(raw)}`;

  if (lead.product?.trim()) return lead.product.trim();
  return 'Khác';
};

const isGermanOrChineseLead = (lead: ILead) => {
  const program = normalizeProgram(lead.program);
  return program === 'Tiếng Đức' || program === 'Tiếng Trung';
};

const getProductColor = (productName: string) => {
  const key = normalizeText(productName);
  if (PRODUCT_COLORS[key]) return PRODUCT_COLORS[key];
  if (key.includes('tiếng đức')) return '#6366f1';
  if (key.includes('tiếng trung')) return '#f59e0b';
  return PRODUCT_COLORS['khác'];
};

const SOURCE_DISPLAY_NAMES: Record<string, string> = {
  facebook: 'Facebook',
  hotline: 'Hotline',
  referral: 'Referral',
  website: 'Website',
  ad_campaign: 'Ad Campaign',
  company_data: 'Company Data',
  sale_self: 'Sale Self',
  unknown: 'Unknown',
  google: 'Google',
  zalo: 'Zalo',
  tiktok: 'TikTok',
  email: 'Email',
};

const formatSourceName = (rawSource?: string) => {
  const raw = (rawSource || 'unknown').toLowerCase();
  return SOURCE_DISPLAY_NAMES[raw] || raw.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
};

const getWeekStart = (input: Date) => {
  const date = new Date(input);
  const dayOfWeek = (date.getDay() + 6) % 7; // Monday = 0
  date.setDate(date.getDate() - dayOfWeek);
  date.setHours(0, 0, 0, 0);
  return date;
};

const getMonthStart = (input: Date) => {
  const date = new Date(input);
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
};

const toDayKey = (date: Date) => date.toISOString().split('T')[0];

// --- MOCK DATA GENERATOR ---
const generateMockLeads = (): ILead[] => {
  const sources = ['facebook', 'website', 'referral', 'hotline', 'Google', 'Tiktok', 'Email'];
  const programs: Array<ILead['program']> = ['Tiếng Đức', 'Tiếng Trung'];
  const germanProducts = ['A1', 'A2', 'B1', 'Combo'];
  const chineseProducts = ['HSK 1', 'HSK 2', 'Combo'];
  const cities = ['Hà Nội', 'Hồ Chí Minh', 'Đà Nẵng'];
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
    const randomProgram = programs[Math.floor(Math.random() * programs.length)];
    const randomProduct = randomProgram === 'Tiếng Đức'
      ? germanProducts[Math.floor(Math.random() * germanProducts.length)]
      : chineseProducts[Math.floor(Math.random() * chineseProducts.length)];
    const randomCity = cities[Math.floor(Math.random() * cities.length)];

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
      program: randomProgram,
      product: randomProduct,
      city: randomCity
    });
  }
  return mockLeads;
};

const MarketingDashboard: React.FC = () => {
  const [dateRange, setDateRange] = useState<DateRangeType>('today');
  const [customDate, setCustomDate] = useState<string>('');
  const [location, setLocation] = useState<LocationType>('all');
  const [product, setProduct] = useState<ProductFilterType>('all');
  const [verification, setVerification] = useState<VerificationFilterType>('all');

  const [leads, setLeads] = useState<ILead[]>([]);
  const [deals, setDeals] = useState<IDeal[]>([]);

  // Interactive Filter State
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [selectedProductDrill, setSelectedProductDrill] = useState<string | null>(null);
  const [conversionDimension, setConversionDimension] = useState<'source' | 'product'>('source');
  const [growthGranularity, setGrowthGranularity] = useState<'week' | 'month'>('week');
  const [growthLookback, setGrowthLookback] = useState<number>(8);
  const [growthYearOffset, setGrowthYearOffset] = useState<number>(0);

  // Load data & Merge with Mock
  useEffect(() => {
    const storedLeads = getLeads();
    const storedDeals = getDeals();
    const mockData = generateMockLeads();

    // Combine real and mock data for rich visualization
    setLeads([...storedLeads, ...mockData]);
    setDeals(storedDeals);
  }, []);

  const productOptions = useMemo<SelectOption[]>(() => {
    return [
      { value: 'all', label: 'Tất cả sản phẩm' },
      { value: 'Tiếng Đức', label: 'Tiếng Đức' },
      { value: 'Tiếng Trung', label: 'Tiếng Trung' }
    ];
  }, []);

  // Filter data based on date range, location and product
  const leadsFilteredByCore = useMemo(() => {
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
      const locationKeywords: Record<LocationType, string[]> = {
        'all': [],
        'hanoi': ['ha noi', 'hanoi'],
        'hcm': ['ho chi minh', 'hcm', 'tp hcm', 'tphcm', 'sai gon', 'saigon'],
        'danang': ['da nang', 'danang']
      };
      const keywords = locationKeywords[location];
      result = result.filter((lead) => {
        const regionRaw = [
          lead.city,
          lead.address,
          lead.marketingData?.region,
          lead.marketingData?.market
        ].filter(Boolean).join(' ');
        const region = normalizeText(regionRaw);
        return keywords.some((keyword) => region.includes(keyword));
      });
    }

    if (product !== 'all') {
      result = result.filter((lead) => normalizeProgram(lead.program) === product);
    }
    return result;
  }, [leads, dateRange, location, customDate, product]);

  // Filter data based on verification (for charts)
  const baseFilteredLeads = useMemo(() => {
    if (verification === 'all') return leadsFilteredByCore;
    return leadsFilteredByCore.filter((lead) =>
      verification === 'verified' ? isVerifiedLead(lead) : !isVerifiedLead(lead)
    );
  }, [leadsFilteredByCore, verification]);

  // Derived Data for Charts (Affected by selectedSource)
  const chartDataLeads = useMemo(() => {
    if (!selectedSource) return baseFilteredLeads;
    return baseFilteredLeads.filter(l =>
      (l.source?.toLowerCase() || 'unknown') === selectedSource.toLowerCase()
    );
  }, [baseFilteredLeads, selectedSource]);

  // KPI dataset must ignore verification filter, but still follow other filters/source selection.
  const chartDataLeadsForKpi = useMemo(() => {
    if (!selectedSource) return leadsFilteredByCore;
    return leadsFilteredByCore.filter(l =>
      (l.source?.toLowerCase() || 'unknown') === selectedSource.toLowerCase()
    );
  }, [leadsFilteredByCore, selectedSource]);

  // KPI rules:
  // - Total Leads, Lead xác thực, % Lead xác thực: ignore verification filter.
  // - % Chuyển đổi ra Hợp đồng: still follows current chart filter (including verification).
  const kpis = useMemo(() => {
    const totalLeads = chartDataLeadsForKpi.length;
    const qualifiedLeads = chartDataLeadsForKpi.filter(isVerifiedLead).length;
    const qualifiedRate = totalLeads > 0 ? ((qualifiedLeads / totalLeads) * 100).toFixed(1) : '0.0';

    // Conversion KPI follows verification filter
    const conversionLeads = chartDataLeads;
    const conversionBaseTotal = conversionLeads.length;
    const leadIds = conversionLeads.map(l => l.id);
    const relatedDeals = deals.filter(d => leadIds.includes(d.leadId));
    const wonDeals = relatedDeals.filter(d => d.stage === DealStage.WON).length;
    // Mock won deals relative to mock leads if needed (simple percentage)
    const displayWonDeals = wonDeals + Math.floor(conversionBaseTotal * 0.05); // Approx 5% conversion for mock

    const conversionRate = conversionBaseTotal > 0 ? ((displayWonDeals / conversionBaseTotal) * 100).toFixed(1) : '0.0';

    return {
      totalLeads,
      qualifiedLeads,
      qualifiedRate,
      conversionRate,
      costPerLead: '280.000đ' // Mock for now
    };
  }, [chartDataLeadsForKpi, chartDataLeads, deals]);

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
      const displayName = formatSourceName(name);

      return {
        name: displayName,
        rawName: name, // for filtering key
        value: Math.round((count / total) * 100),
        count,
        color: SOURCE_COLORS[name] || '#94a3b8'
      };
    }).sort((a, b) => b.value - a.value); // Sort by biggest slice
  }, [baseFilteredLeads]);

  // Drill-down chart: Product -> Channel
  const productDistribution = useMemo(() => {
    const productCount: Record<string, number> = {};
    chartDataLeads
      .filter(isGermanOrChineseLead)
      .forEach((lead) => {
      const productLabel = getLeadProductLabel(lead);
      productCount[productLabel] = (productCount[productLabel] || 0) + 1;
      });

    const total = Object.values(productCount).reduce((sum, count) => sum + count, 0) || 1;
    return Object.entries(productCount)
      .map(([name, count]) => ({
        name,
        rawName: name,
        value: Math.round((count / total) * 100),
        count,
        color: getProductColor(name),
      }))
      .sort((a, b) => b.count - a.count);
  }, [chartDataLeads]);

  const channelBySelectedProduct = useMemo(() => {
    if (!selectedProductDrill) return [];
    const sourceCount: Record<string, number> = {};

    baseFilteredLeads
      .filter(isGermanOrChineseLead)
      .filter((lead) => getLeadProductLabel(lead) === selectedProductDrill)
      .forEach((lead) => {
        const source = (lead.source || 'unknown').toLowerCase();
        sourceCount[source] = (sourceCount[source] || 0) + 1;
      });

    const total = Object.values(sourceCount).reduce((sum, count) => sum + count, 0) || 1;
    return Object.entries(sourceCount)
      .map(([source, count]) => ({
        name: source.charAt(0).toUpperCase() + source.slice(1),
        rawName: source,
        value: Math.round((count / total) * 100),
        count,
        color: SOURCE_COLORS[source] || '#94a3b8',
      }))
      .sort((a, b) => b.count - a.count);
  }, [baseFilteredLeads, selectedProductDrill]);

  const productDrillData = selectedProductDrill ? channelBySelectedProduct : productDistribution;
  const productDrillTotal = useMemo(
    () => productDrillData.reduce((sum, item) => sum + item.count, 0),
    [productDrillData]
  );

  useEffect(() => {
    if (!selectedProductDrill) return;
    const stillExists = baseFilteredLeads.some(
      (lead) => isGermanOrChineseLead(lead) && getLeadProductLabel(lead) === selectedProductDrill
    );
    if (!stillExists) setSelectedProductDrill(null);
  }, [baseFilteredLeads, selectedProductDrill]);

  // Conversion rate to contract by source/product
  const conversionByDimension = useMemo(() => {
    const wonLeadIds = new Set(
      deals
        .filter((deal) => deal.stage === DealStage.WON || deal.stage === DealStage.CONTRACT)
        .map((deal) => deal.leadId)
    );

    const stats: Record<string, { label: string; total: number; won: number; color: string }> = {};

    const addLeadToBucket = (lead: ILead, key: string, label: string, color: string) => {
      if (!stats[key]) stats[key] = { label, total: 0, won: 0, color };
      stats[key].total += 1;
      if (
        wonLeadIds.has(lead.id) ||
        lead.status === LeadStatus.CONVERTED ||
        lead.status === LeadStatus.QUALIFIED
      ) {
        stats[key].won += 1;
      }
    };

    if (conversionDimension === 'source') {
      chartDataLeads.forEach((lead) => {
        const rawSource = (lead.source || 'unknown').toLowerCase();
        addLeadToBucket(
          lead,
          rawSource,
          formatSourceName(rawSource),
          SOURCE_COLORS[rawSource] || '#94a3b8'
        );
      });
    } else {
      chartDataLeads
        .filter(isGermanOrChineseLead)
        .forEach((lead) => {
          const productLabel = getLeadProductLabel(lead);
          const key = normalizeText(productLabel);
          addLeadToBucket(lead, key, productLabel, getProductColor(productLabel));
        });
    }

    return Object.values(stats)
      .map((item) => ({
        name: item.label,
        rate: item.total > 0 ? Math.round((item.won / item.total) * 100) : 0,
        total: item.total,
        color: item.color,
      }))
      .sort((a, b) => b.total - a.total);
  }, [chartDataLeads, deals, conversionDimension]);

  // Lead growth by channel over time
  const leadGrowthByChannel = useMemo(() => {
    const now = new Date();
    const anchorDate = new Date(now);
    anchorDate.setFullYear(anchorDate.getFullYear() - growthYearOffset);

    const lookback = Math.max(0, Math.floor(growthLookback));
    const periods: Array<{ key: string; label: string }> = [];
    const periodIndex = new Map<string, number>();

    if (growthGranularity === 'week') {
      const anchorWeek = getWeekStart(anchorDate);
      for (let i = lookback; i >= 0; i--) {
        const start = new Date(anchorWeek);
        start.setDate(anchorWeek.getDate() - i * 7);
        const key = toDayKey(start);
        const label = `Tuần ${String(start.getDate()).padStart(2, '0')}/${String(start.getMonth() + 1).padStart(2, '0')}`;
        periods.push({ key, label });
        periodIndex.set(key, periods.length - 1);
      }
    } else {
      const anchorMonth = getMonthStart(anchorDate);
      for (let i = lookback; i >= 0; i--) {
        const start = new Date(anchorMonth);
        start.setMonth(anchorMonth.getMonth() - i);
        const key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
        const label = `${String(start.getMonth() + 1).padStart(2, '0')}/${start.getFullYear()}`;
        periods.push({ key, label });
        periodIndex.set(key, periods.length - 1);
      }
    }

    const rows: Array<Record<string, string | number>> = periods.map((period) => ({
      time: period.label,
      total: 0,
    }));

    const channelStats: Record<string, { rawName: string; label: string; color: string; total: number }> = {};

    chartDataLeads.forEach((lead) => {
      const createdAt = new Date(lead.createdAt);
      if (Number.isNaN(createdAt.getTime())) return;

      const periodKey = growthGranularity === 'week'
        ? toDayKey(getWeekStart(createdAt))
        : `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
      const targetIndex = periodIndex.get(periodKey);
      if (targetIndex === undefined) return;

      const rawSource = (lead.source || 'unknown').toLowerCase();
      const sourceLabel = formatSourceName(rawSource);

      if (!channelStats[rawSource]) {
        channelStats[rawSource] = {
          rawName: rawSource,
          label: sourceLabel,
          color: SOURCE_COLORS[rawSource] || '#94a3b8',
          total: 0,
        };
      }

      const row = rows[targetIndex];
      row[sourceLabel] = Number(row[sourceLabel] || 0) + 1;
      row.total = Number(row.total || 0) + 1;
      channelStats[rawSource].total += 1;
    });

    const channels = Object.values(channelStats).sort((a, b) => b.total - a.total);
    rows.forEach((row) => {
      channels.forEach((channel) => {
        if (row[channel.label] === undefined) row[channel.label] = 0;
      });
    });

    return { rows, channels };
  }, [chartDataLeads, growthGranularity, growthLookback, growthYearOffset]);

  // Contract share by source (pie chart)
  const contractShareBySource = useMemo(() => {
    const leadSourceById = new Map(
      chartDataLeads.map((lead) => [lead.id, (lead.source || 'unknown').toLowerCase()])
    );

    const contractCountBySource: Record<string, number> = {};

    deals
      .filter((deal) => deal.stage === DealStage.CONTRACT || deal.stage === DealStage.WON)
      .forEach((deal) => {
        const source = leadSourceById.get(deal.leadId);
        if (!source) return;
        contractCountBySource[source] = (contractCountBySource[source] || 0) + 1;
      });

    // Fallback for local/demo state when deals are not created yet.
    if (Object.keys(contractCountBySource).length === 0) {
      chartDataLeads.forEach((lead) => {
        if (lead.status === LeadStatus.CONVERTED || lead.status === LeadStatus.QUALIFIED) {
          const source = (lead.source || 'unknown').toLowerCase();
          contractCountBySource[source] = (contractCountBySource[source] || 0) + 1;
        }
      });
    }

    const totalContracts = Object.values(contractCountBySource).reduce((sum, count) => sum + count, 0);
    if (totalContracts === 0) return [];

    return Object.entries(contractCountBySource)
      .map(([source, count]) => ({
        name: source.charAt(0).toUpperCase() + source.slice(1),
        rawName: source,
        value: count,
        percent: Math.round((count / totalContracts) * 100),
        color: SOURCE_COLORS[source] || '#94a3b8'
      }))
      .sort((a, b) => b.value - a.value);
  }, [chartDataLeads, deals]);

  const totalContracts = useMemo(
    () => contractShareBySource.reduce((sum, item) => sum + item.value, 0),
    [contractShareBySource]
  );

  // Status distribution (affected by source/product/date filters)
  const statusDistributionPie = useMemo(() => {
    const statusCount: Record<string, number> = {
      New: 0,
      Assigned: 0,
      Contacted: 0,
      Converted: 0,
      Unqualified: 0,
    };

    chartDataLeads.forEach((lead) => {
      let category: keyof typeof statusCount = 'New';
      switch (lead.status) {
        case LeadStatus.NEW:
          category = 'New';
          break;
        case LeadStatus.ASSIGNED:
          category = 'Assigned';
          break;
        case LeadStatus.CONTACTED:
        case LeadStatus.NURTURING:
          category = 'Contacted';
          break;
        case LeadStatus.CONVERTED:
        case LeadStatus.QUALIFIED:
          category = 'Converted';
          break;
        case LeadStatus.DISQUALIFIED:
        case LeadStatus.UNREACHABLE:
          category = 'Unqualified';
          break;
        default:
          category = 'New';
      }

      statusCount[category] = (statusCount[category] || 0) + 1;
    });

    const total = Object.values(statusCount).reduce((sum, count) => sum + count, 0) || 1;
    return Object.entries(statusCount)
      .filter(([, count]) => count > 0)
      .map(([name, count]) => ({
        name,
        rawName: name,
        value: Math.round((count / total) * 100),
        count,
        color: STATUS_COLORS[name] || '#cbd5e1',
      }))
      .sort((a, b) => b.count - a.count);
  }, [chartDataLeads]);

  const totalStatusLeads = useMemo(
    () => statusDistributionPie.reduce((sum, item) => sum + item.count, 0),
    [statusDistributionPie]
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans p-6 max-w-[1600px] mx-auto">

      {/* --- DASHBOARD FILTERS (Synchronized) --- */}
      <DashboardFilters
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        location={location}
        onLocationChange={setLocation}
        product={product}
        onProductChange={setProduct}
        productOptions={productOptions}
        verification={verification}
        onVerificationChange={setVerification}
        customDate={customDate}
        onCustomDateChange={setCustomDate}
        title="Phân tích Marketing & Nguồn Lead"
        subtitle="Hiệu suất thời gian thực theo nguồn và chiến dịch quảng cáo."
      />

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
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-8">

        {/* Source Distribution Chart (Doughnut) */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-left-4 duration-700 delay-400">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-lg text-slate-900">Nguồn Lead</h3>
              {selectedSource && (
                <button
                  onClick={() => setSelectedSource(null)}
                  className="text-xs text-blue-600 underline hover:text-blue-700"
                >
                  Tổng
                </button>
              )}
            </div>
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

        {/* Drill-down Product Distribution */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-left-4 duration-700 delay-450">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-lg text-slate-900">
                {selectedProductDrill ? `Kênh theo ${selectedProductDrill}` : 'Tỷ trọng Sản phẩm'}
              </h3>
              {selectedProductDrill && (
                <button
                  onClick={() => setSelectedProductDrill(null)}
                  className="text-xs text-blue-600 underline hover:text-blue-700"
                >
                  Quay lại
                </button>
              )}
            </div>
            <button className="text-slate-400 hover:text-slate-600">
              <MoreVertical size={20} />
            </button>
          </div>
          <div className="h-[250px] w-full relative">
            {productDrillData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={productDrillData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                    animationDuration={1000}
                    animationEasing="ease-out"
                    onClick={(data) => {
                      if (selectedProductDrill) return;
                      const raw = data?.rawName || data?.payload?.rawName;
                      if (raw) setSelectedProductDrill(raw);
                    }}
                    className={selectedProductDrill ? '' : 'cursor-pointer'}
                  >
                    {productDrillData.map((entry, index) => (
                      <Cell key={`product-drill-cell-${index}`} fill={entry.color} />
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
                    formatter={(value: number, _name, props: any) => [
                      `${props?.payload?.count || 0} (${value}%)`,
                      props?.payload?.name || ''
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">
                Chưa có dữ liệu
              </div>
            )}
            {productDrillData.length > 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <span className="block text-2xl font-bold text-slate-800">{productDrillTotal}</span>
                  <span className="text-xs text-slate-400">Leads</span>
                </div>
              </div>
            )}
          </div>
          {productDrillData.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-medium text-slate-500">
              {productDrillData.map((item) => (
                <div
                  key={item.rawName}
                  className={`flex items-center gap-2 ${selectedProductDrill ? '' : 'cursor-pointer'}`}
                  onClick={() => {
                    if (!selectedProductDrill) setSelectedProductDrill(item.rawName);
                  }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></span>
                  {item.name} ({item.value}%)
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Contract Share by Source */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-slate-900">Tỷ trọng Hợp đồng theo Nguồn</h3>
            <button className="text-slate-400 hover:text-slate-600">
              <MoreVertical size={20} />
            </button>
          </div>
          <div className="h-[250px] w-full relative">
            {contractShareBySource.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={contractShareBySource}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                    animationDuration={1000}
                    animationEasing="ease-out"
                  >
                    {contractShareBySource.map((entry, index) => (
                      <Cell key={`contract-cell-top-${index}`} fill={entry.color} />
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
                    formatter={(value: number, _name, props: any) => [
                      `${value} HĐ (${props?.payload?.percent || 0}%)`,
                      props?.payload?.name || ''
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <span className="block text-2xl font-bold text-slate-800">0</span>
                  <span className="text-sm text-slate-400">Chưa có dữ liệu hợp đồng</span>
                </div>
              </div>
            )}
            {contractShareBySource.length > 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <span className="block text-2xl font-bold text-slate-800">{totalContracts}</span>
                  <span className="text-xs text-slate-400">Hợp đồng</span>
                </div>
              </div>
            )}
          </div>
          {contractShareBySource.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-medium text-slate-500">
              {contractShareBySource.map((item) => (
                <div key={item.rawName} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></span>
                  {item.name} ({item.percent}%)
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status Distribution Pie */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-550">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-slate-900">Tỷ trọng Trạng thái theo Nguồn</h3>
            <button className="text-slate-400 hover:text-slate-600">
              <MoreVertical size={20} />
            </button>
          </div>
          <div className="h-[250px] w-full relative">
            {statusDistributionPie.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistributionPie}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                    animationDuration={1000}
                    animationEasing="ease-out"
                  >
                    {statusDistributionPie.map((entry, index) => (
                      <Cell key={`status-cell-top-${index}`} fill={entry.color} />
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
                    formatter={(value: number, _name, props: any) => [
                      `${props?.payload?.count || 0} (${value}%)`,
                      props?.payload?.name || ''
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">
                Chưa có dữ liệu
              </div>
            )}
            {statusDistributionPie.length > 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <span className="block text-2xl font-bold text-slate-800">{totalStatusLeads}</span>
                  <span className="text-xs text-slate-400">Leads</span>
                </div>
              </div>
            )}
          </div>
          {statusDistributionPie.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-medium text-slate-500">
              {statusDistributionPie.map((item) => (
                <div key={item.rawName} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></span>
                  {item.name} ({item.value}%)
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* --- CHARTS SECTION ROW 2 --- */}
      <div className="grid grid-cols-1 gap-8 mb-8">
        {/* Conversion to Contract Rate by Source */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-600">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-lg text-slate-900">
                Tỷ lệ chuyển đổi HĐ theo {conversionDimension === 'source' ? 'Nguồn' : 'Sản phẩm'}
              </h3>
              <div className="inline-flex bg-slate-100 rounded-lg p-1">
                <button
                  onClick={() => setConversionDimension('source')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                    conversionDimension === 'source'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Theo nguồn
                </button>
                <button
                  onClick={() => setConversionDimension('product')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                    conversionDimension === 'product'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Theo sản phẩm
                </button>
              </div>
            </div>
            <button className="text-slate-400 hover:text-slate-600">
              <MoreVertical size={20} />
            </button>
          </div>
          <div className="h-[340px] w-full">
            {conversionByDimension.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={conversionByDimension} barSize={40}>
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
                    formatter={(value: number, _name, props: any) => [
                      `${value}% (n=${props?.payload?.total || 0})`,
                      'Tỷ lệ chuyển đổi',
                    ]}
                  />
                  <Bar
                    dataKey="rate"
                    radius={[6, 6, 0, 0]}
                    name="Tỷ lệ chuyển đổi (%)"
                    animationDuration={1000}
                    animationEasing="ease-out"
                  >
                    {conversionByDimension.map((item, index) => (
                      <Cell key={`conversion-dim-${index}`} fill={item.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">
                Chưa có dữ liệu chuyển đổi
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- CHARTS SECTION ROW 3 --- */}
      <div className="grid grid-cols-1 gap-8 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-700">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div>
              <h3 className="font-bold text-lg text-slate-900">Tốc độ Lead theo Kênh theo Thời gian</h3>
              <p className="text-xs text-slate-500 mt-1">
                Trục X là thời gian, kênh là từng series. Bộ lọc tính cả kỳ hiện tại (tuần/tháng đang chọn).
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={growthGranularity}
                onChange={(e) => setGrowthGranularity(e.target.value as 'week' | 'month')}
                className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-700"
              >
                <option value="week">Theo tuần</option>
                <option value="month">Theo tháng</option>
              </select>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                <span className="text-xs text-slate-500 whitespace-nowrap">
                  {growthGranularity === 'week' ? 'Số tuần trước' : 'Số tháng trước'}
                </span>
                <input
                  type="number"
                  min={0}
                  max={growthGranularity === 'week' ? 52 : 36}
                  value={growthLookback}
                  onChange={(e) => {
                    const parsed = Math.floor(Number(e.target.value) || 0);
                    const capped = Math.max(0, Math.min(parsed, growthGranularity === 'week' ? 52 : 36));
                    setGrowthLookback(capped);
                  }}
                  className="w-16 bg-white border border-slate-200 rounded px-2 py-1 text-sm text-slate-700"
                />
              </div>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                <span className="text-xs text-slate-500 whitespace-nowrap">Số năm trước</span>
                <input
                  type="number"
                  min={0}
                  max={5}
                  value={growthYearOffset}
                  onChange={(e) => {
                    const parsed = Math.floor(Number(e.target.value) || 0);
                    setGrowthYearOffset(Math.max(0, Math.min(parsed, 5)));
                  }}
                  className="w-14 bg-white border border-slate-200 rounded px-2 py-1 text-sm text-slate-700"
                />
              </div>
            </div>
          </div>

          <div className="h-[360px] w-full">
            {leadGrowthByChannel.rows.some((row) => Number(row.total || 0) > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={leadGrowthByChannel.rows} barCategoryGap={24}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="time"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    label={{ value: 'Leads', position: 'insideLeft', style: { fill: '#64748b' } }}
                  />
                  <Tooltip
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '16px' }} iconType="circle" />
                  {leadGrowthByChannel.channels.map((channel) => (
                    <Bar
                      key={channel.rawName}
                      dataKey={channel.label}
                      stackId="growth"
                      fill={channel.color}
                      radius={[4, 4, 0, 0]}
                      animationDuration={900}
                      name={channel.label}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">
                Chưa có dữ liệu cho khoảng thời gian đã chọn
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

export default MarketingDashboard;

