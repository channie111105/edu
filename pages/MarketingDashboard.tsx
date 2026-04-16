
import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
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

// Color mapping for sources - Blue / Beige / Mint / Lavender palette
const SOURCE_COLORS: Record<string, string> = {
  'facebook': '#8ea8f7',      // Blue
  'hotline': '#e7c487',       // Beige
  'referral': '#8ed8c2',      // Mint
  'website': '#c5b2ef',       // Lavender
  'ad_campaign': '#d2c0f4',   // Lavender Light
  'company_data': '#aedfcf',  // Mint Light
  'sale_self': '#b2c7ea',     // Blue Mist
  'unknown': '#d8e3f4',       // Blue Gray
  'sla test': '#c8d8f2',      // Blue Haze
  'google': '#9dd8b4',        // Mint
  'zalo': '#9bb7f3',          // Blue Soft
  'tiktok': '#b7b3d8',        // Lavender Gray
  'email': '#e8cfad',         // Beige Light
};

const PRODUCT_COLORS: Record<string, string> = {
  'tiếng đức - a1': '#8ea8f7',
  'tiếng đức - a2': '#b1c4fb',
  'tiếng đức - b1': '#9ab5ee',
  'tiếng đức - combo': '#c8b9ef',
  'tiếng trung - hsk 1': '#e7c487',
  'tiếng trung - hsk 2': '#eed8b7',
  'tiếng trung - combo': '#9dd8b4',
  'khác': '#d8e3f4',
};

// Status Colors for Stacked Chart
const STATUS_COLORS: Record<string, string> = {
  'New': '#e7cfaa',         // Beige
  'Assigned': '#d0c1ef',    // Lavender
  'Contacted': '#8ea8f7',   // Blue
  'Converted': '#9dd8b4',   // Mint
  'Unqualified': '#d8e3f4'  // Blue Gray
};

const ACTIVE_PIE_STROKE = '#94aac8';


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
  if (key.includes('tiếng đức')) return '#8ea8f7';
  if (key.includes('tiếng trung')) return '#e7c487';
  return PRODUCT_COLORS['khác'];
};

const isSameKey = (left?: string | null, right?: string | null) =>
  normalizeText(left) === normalizeText(right);

const getSourceColor = (rawSource?: string) => {
  const normalized = normalizeText(rawSource || 'unknown');
  return SOURCE_COLORS[normalized] || SOURCE_COLORS['unknown'];
};

const getPieRawName = (data: any) => data?.rawName || data?.payload?.rawName || null;

const SOURCE_DISPLAY_NAMES: Record<string, string> = {
  facebook: 'Facebook',
  hotline: 'Hotline',
  referral: 'Referral',
  website: 'Website',
  ad_campaign: 'Ad Campaign',
  company_data: 'Company Data',
  sale_self: 'Sale Self',
  unknown: 'Unknown',
  'sla test': 'SLA Test',
  google: 'Google',
  zalo: 'Zalo',
  tiktok: 'TikTok',
  email: 'Email',
};

const DEFAULT_GROWTH_CHANNELS = ['email', 'facebook', 'google', 'hotline', 'referral', 'tiktok', 'website', 'zalo'];

const formatSourceName = (rawSource?: string) => {
  const raw = (rawSource || 'unknown').toLowerCase();
  return SOURCE_DISPLAY_NAMES[raw] || raw.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
};

type ChartLegendButtonProps = {
  label: string;
  active: boolean;
  onClick: () => void;
  color?: string;
  muted?: boolean;
  neutral?: boolean;
  disabled?: boolean;
};

const ChartLegendButton: React.FC<ChartLegendButtonProps> = ({
  label,
  active,
  onClick,
  color,
  muted = false,
  neutral = false,
  disabled = false,
}) => (
  <button
    type="button"
    onClick={disabled ? undefined : onClick}
    className={[
      'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-medium transition',
      active
        ? 'bg-slate-50 text-slate-700 ring-1 ring-slate-200'
        : 'text-slate-500',
      !disabled && !active ? 'hover:bg-slate-50 hover:text-slate-600' : '',
      muted ? 'opacity-30' : 'opacity-100',
      disabled ? 'cursor-default' : 'cursor-pointer',
    ].join(' ')}
  >
    <span
      className={neutral ? 'h-2.5 w-2.5 shrink-0 rounded-full border border-slate-400 bg-white' : 'h-2.5 w-2.5 shrink-0 rounded-full'}
      style={neutral ? undefined : { backgroundColor: color }}
    />
    <span className="truncate">{label}</span>
  </button>
);

const renderLineEndLabel = (color: string) => (props: any) => {
  const { x, y, value, index, points } = props;
  if (
    typeof x !== 'number' ||
    typeof y !== 'number' ||
    typeof value !== 'number' ||
    !Array.isArray(points) ||
    index !== points.length - 1
  ) {
    return null;
  }

  return (
    <text x={x + 8} y={y - 8} fill={color} fontSize={11} fontWeight={600}>
      {value}
    </text>
  );
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

const getYearStart = (input: Date) => {
  const date = new Date(input);
  date.setMonth(0, 1);
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
  const { i18n } = useTranslation('common');
  const isEnglish = i18n.resolvedLanguage === 'en';
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
  const [selectedContractSource, setSelectedContractSource] = useState<string | null>(null);
  const [selectedStatusKey, setSelectedStatusKey] = useState<string | null>(null);
  const [conversionDimension, setConversionDimension] = useState<'source' | 'product'>('source');
  const [growthGranularity, setGrowthGranularity] = useState<'week' | 'month' | 'year'>('week');
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
      { value: 'all', label: isEnglish ? 'All products' : 'Tất cả sản phẩm' },
      { value: 'Tiếng Đức', label: isEnglish ? 'German' : 'Tiếng Đức' },
      { value: 'Tiếng Trung', label: isEnglish ? 'Chinese' : 'Tiếng Trung' }
    ];
  }, [isEnglish]);

  const translateProductName = (name: string) => {
    if (!isEnglish) return name;
    return name
      .replaceAll('Tiếng Đức', 'German')
      .replaceAll('Tiếng Trung', 'Chinese')
      .replaceAll('Khác', 'Other');
  };

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
      isSameKey(l.source || 'unknown', selectedSource)
    );
  }, [baseFilteredLeads, selectedSource]);

  // KPI dataset must ignore verification filter, but still follow other filters/source selection.
  const chartDataLeadsForKpi = useMemo(() => {
    if (!selectedSource) return leadsFilteredByCore;
    return leadsFilteredByCore.filter(l =>
      isSameKey(l.source || 'unknown', selectedSource)
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
        color: getSourceColor(name)
      };
    }).sort((a, b) => b.value - a.value); // Sort by biggest slice
  }, [baseFilteredLeads]);

  const selectedSourceSlice = useMemo(
    () => sourceDistribution.find((item) => isSameKey(item.rawName, selectedSource)) || null,
    [sourceDistribution, selectedSource]
  );

  useEffect(() => {
    if (!selectedSource) return;
    const stillExists = sourceDistribution.some((item) => isSameKey(item.rawName, selectedSource));
    if (!stillExists) setSelectedSource(null);
  }, [sourceDistribution, selectedSource]);

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
        name: formatSourceName(source),
        rawName: source,
        value: Math.round((count / total) * 100),
        count,
        color: getSourceColor(source),
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
          getSourceColor(rawSource)
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
        name: conversionDimension === 'product' ? translateProductName(item.label) : item.label,
        rate: item.total > 0 ? Math.round((item.won / item.total) * 100) : 0,
        total: item.total,
        color: item.color,
      }))
      .sort((a, b) => b.total - a.total);
  }, [chartDataLeads, deals, conversionDimension, isEnglish]);

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
        const label = `${isEnglish ? 'Week' : 'Tuần'} ${String(start.getDate()).padStart(2, '0')}/${String(start.getMonth() + 1).padStart(2, '0')}`;
        periods.push({ key, label });
        periodIndex.set(key, periods.length - 1);
      }
    } else if (growthGranularity === 'month') {
      const anchorMonth = getMonthStart(anchorDate);
      for (let i = lookback; i >= 0; i--) {
        const start = new Date(anchorMonth);
        start.setMonth(anchorMonth.getMonth() - i);
        const key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
        const label = `${String(start.getMonth() + 1).padStart(2, '0')}/${start.getFullYear()}`;
        periods.push({ key, label });
        periodIndex.set(key, periods.length - 1);
      }
    } else {
      const anchorYear = getYearStart(anchorDate);
      for (let i = lookback; i >= 0; i--) {
        const start = new Date(anchorYear);
        start.setFullYear(anchorYear.getFullYear() - i);
        const key = `${start.getFullYear()}`;
        const label = `${isEnglish ? 'Year' : 'Năm'} ${start.getFullYear()}`;
        periods.push({ key, label });
        periodIndex.set(key, periods.length - 1);
      }
    }

    const rows: Array<Record<string, string | number>> = periods.map((period) => ({
      time: period.label,
      total: 0,
    }));

    const fallbackChannels = DEFAULT_GROWTH_CHANNELS.map((rawName) => ({
      rawName,
      label: formatSourceName(rawName),
      color: getSourceColor(rawName),
      total: 0,
    }));

    const channels = (sourceDistribution.length > 0
      ? sourceDistribution.slice(0, 8).map((item) => ({
          rawName: item.rawName,
          label: item.name,
          color: item.color,
          total: 0,
        }))
      : fallbackChannels
    ).sort((a, b) => a.label.localeCompare(b.label));

    const scaleFactor = growthGranularity === 'week'
      ? 1
      : growthGranularity === 'month'
        ? 1.35
        : 2.2;

    const channelSlopePattern = [1.3, 2.1, 1.7, 1.1, 1.9, 1.4, 2.3, 1.6];
    const channelBasePattern = [8, 11, 10, 7, 9, 6, 12, 8];
    const channelWavePattern = [2.2, 1.4, 2.8, 1.8, 2.1, 1.2, 2.6, 1.6];

    rows.forEach((row, rowIndex) => {
      let rowTotal = 0;
      channels.forEach((channel, channelIndex) => {
        const base = channelBasePattern[channelIndex % channelBasePattern.length] * scaleFactor;
        const slope = channelSlopePattern[channelIndex % channelSlopePattern.length] * rowIndex * scaleFactor;
        const wave = Math.sin((rowIndex + channelIndex) / 1.35) * channelWavePattern[channelIndex % channelWavePattern.length] * scaleFactor;
        const step = ((rowIndex + channelIndex) % 3) * 0.8 * scaleFactor;
        const value = Math.max(0, Math.round(base + slope + wave + step));

        row[channel.label] = value;
        rowTotal += value;
        channel.total += value;
      });
      row.total = rowTotal;
    });

    return { rows, channels };
  }, [growthGranularity, growthLookback, growthYearOffset, sourceDistribution, isEnglish]);

  const growthLookbackLabel = growthGranularity === 'week'
    ? (isEnglish ? 'Previous weeks' : 'Số tuần trước')
    : growthGranularity === 'month'
      ? (isEnglish ? 'Previous months' : 'Số tháng trước')
      : (isEnglish ? 'Previous years' : 'Số năm trước');

  const growthLookbackMax = growthGranularity === 'week'
    ? 52
    : growthGranularity === 'month'
      ? 36
      : 10;

  useEffect(() => {
    if (growthLookback > growthLookbackMax) {
      setGrowthLookback(growthLookbackMax);
    }
  }, [growthLookback, growthLookbackMax]);

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
        name: formatSourceName(source),
        rawName: source,
        value: count,
        percent: Math.round((count / totalContracts) * 100),
        color: getSourceColor(source)
      }))
      .sort((a, b) => b.value - a.value);
  }, [chartDataLeads, deals]);

  const totalContracts = useMemo(
    () => contractShareBySource.reduce((sum, item) => sum + item.value, 0),
    [contractShareBySource]
  );

  const selectedContractSlice = useMemo(
    () => contractShareBySource.find((item) => isSameKey(item.rawName, selectedContractSource)) || null,
    [contractShareBySource, selectedContractSource]
  );

  useEffect(() => {
    if (!selectedContractSource) return;
    const stillExists = contractShareBySource.some((item) => isSameKey(item.rawName, selectedContractSource));
    if (!stillExists) setSelectedContractSource(null);
  }, [contractShareBySource, selectedContractSource]);

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

  const selectedStatusSlice = useMemo(
    () => statusDistributionPie.find((item) => isSameKey(item.rawName, selectedStatusKey)) || null,
    [statusDistributionPie, selectedStatusKey]
  );

  useEffect(() => {
    if (!selectedStatusKey) return;
    const stillExists = statusDistributionPie.some((item) => isSameKey(item.rawName, selectedStatusKey));
    if (!stillExists) setSelectedStatusKey(null);
  }, [statusDistributionPie, selectedStatusKey]);

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
        title={isEnglish ? 'Marketing Analysis & Lead Sources' : 'Phân tích Marketing & Nguồn Lead'}
        subtitle={isEnglish ? 'Real-time performance by source and campaign.' : 'Hiệu suất thời gian thực theo nguồn và chiến dịch quảng cáo.'}
      />

      {/* --- KPI CARDS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

        {/* Card 1: Total Leads */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-slate-50 p-3 rounded-xl">
              <Users className="text-[#8ea8f7]" size={24} />
            </div>
            <span className="text-[#7dbb98] text-sm font-bold flex items-center bg-slate-50 px-2 py-1 rounded-lg">
              <TrendingUp size={14} className="mr-1" /> +12.5%
            </span>
          </div>
          <h3 className="text-slate-500 text-sm font-medium">{isEnglish ? 'Total Leads' : 'Tổng số Leads'}</h3>
          <p className="text-3xl font-bold mt-1 text-slate-900">{kpis.totalLeads.toLocaleString()}</p>
        </div>

        {/* Card 2: Qualified Rate */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-slate-50 p-3 rounded-xl">
              <ShieldCheck className="text-[#8fcfaf]" size={24} />
            </div>
            <span className="text-[#7dbb98] text-sm font-bold flex items-center bg-slate-50 px-2 py-1 rounded-lg">
              <TrendingUp size={14} className="mr-1" /> +8.2%
            </span>
          </div>
          <h3 className="text-slate-500 text-sm font-medium">{isEnglish ? '% Verified Leads' : '% Lead xác thực'}</h3>
          <p className="text-3xl font-bold mt-1 text-slate-900">{kpis.qualifiedRate}%</p>
        </div>

        {/* Card 3: Conversion to Contract Rate */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-slate-50 p-3 rounded-xl">
              <FileText className="text-[#c2afe8]" size={24} />
            </div>
            <span className="text-[#c5b08d] text-sm font-bold flex items-center bg-slate-50 px-2 py-1 rounded-lg">
              <TrendingDown size={14} className="mr-1" /> -2.4%
            </span>
          </div>
          <h3 className="text-slate-500 text-sm font-medium">{isEnglish ? '% Conversion to Contract' : '% Chuyển đổi ra Hợp đồng'}</h3>
          <p className="text-3xl font-bold mt-1 text-slate-900">{kpis.conversionRate}%</p>
        </div>

        {/* Card 4: Qualified Leads Count */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-slate-50 p-3 rounded-xl">
              <MousePointerClick className="text-[#e2c088]" size={24} />
            </div>
            <span className="text-[#7dbb98] text-sm font-bold flex items-center bg-slate-50 px-2 py-1 rounded-lg">
              <TrendingUp size={14} className="mr-1" /> +15%
            </span>
          </div>
          <h3 className="text-slate-500 text-sm font-medium">{isEnglish ? 'Verified Leads' : 'Lead Xác thực'}</h3>
          <p className="text-3xl font-bold mt-1 text-slate-900">{kpis.qualifiedLeads.toLocaleString()}</p>
        </div>
      </div>

      {/* --- CHARTS SECTION ROW 1 --- */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-8">

        {/* Source Distribution Chart (Doughnut) */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-left-4 duration-700 delay-400">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-slate-900">{isEnglish ? 'Lead Share by Channel' : 'Tỉ trọng Lead theo các Kênh'}</h3>
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
                    const raw = getPieRawName(data);
                    if (raw) setSelectedSource(isSameKey(raw, selectedSource) ? null : raw);
                  }}
                  className="cursor-pointer"
                >
                  {sourceDistribution.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      stroke={selectedSource && isSameKey(selectedSource, entry.rawName) ? ACTIVE_PIE_STROKE : 'none'}
                      strokeWidth={2}
                      opacity={selectedSource && !isSameKey(selectedSource, entry.rawName) ? 0.3 : 1}
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
                  formatter={(value: number, _name, props: any) => [
                    `${props?.payload?.count || 0} (${value}%)`,
                    props?.payload?.name || ''
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Text */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <span className="block text-2xl font-bold text-slate-800">
                  {selectedSourceSlice ? selectedSourceSlice.count : baseFilteredLeads.length}
                </span>
                <span className="text-xs text-slate-400">
                  {selectedSourceSlice ? selectedSourceSlice.name : 'Leads'}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-medium text-slate-500">
            <ChartLegendButton
              label={isEnglish ? 'Total' : 'Tổng'}
              active={!selectedSource}
              onClick={() => setSelectedSource(null)}
              neutral
            />
            {sourceDistribution.map((item, idx) => (
              <ChartLegendButton
                key={idx}
                label={`${item.name} (${item.value}%)`}
                color={item.color}
                active={!!selectedSource && isSameKey(selectedSource, item.rawName)}
                muted={!!selectedSource && !isSameKey(selectedSource, item.rawName)}
                onClick={() => setSelectedSource(isSameKey(item.rawName, selectedSource) ? null : item.rawName)}
              />
            ))}
          </div>
        </div>

        {/* Drill-down Product Distribution */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-left-4 duration-700 delay-450">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-slate-900">
              {selectedProductDrill
                ? (isEnglish ? `Channels for ${translateProductName(selectedProductDrill)}` : `Kênh theo ${selectedProductDrill}`)
                : (isEnglish ? 'Product Share' : 'Tỷ trọng Sản phẩm')}
            </h3>
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
                      const raw = getPieRawName(data);
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
                      props?.payload?.name ? translateProductName(props.payload.name) : ''
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">
                {isEnglish ? 'No data available' : 'Chưa có dữ liệu'}
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
              <ChartLegendButton
                label={isEnglish ? 'Total' : 'Tổng'}
                active={!selectedProductDrill}
                onClick={() => setSelectedProductDrill(null)}
                neutral
              />
              {productDrillData.map((item) => (
                <ChartLegendButton
                  key={item.rawName}
                  label={`${translateProductName(item.name)} (${item.value}%)`}
                  color={item.color}
                  active={false}
                  disabled={!!selectedProductDrill}
                  onClick={() => {
                    if (!selectedProductDrill) setSelectedProductDrill(item.rawName);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Contract Share by Source */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-slate-900">{isEnglish ? 'Contract Share by Source' : 'Tỷ trọng Hợp đồng theo Nguồn'}</h3>
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
                    onClick={(data) => {
                      const raw = getPieRawName(data);
                      if (raw) setSelectedContractSource(isSameKey(raw, selectedContractSource) ? null : raw);
                    }}
                    className="cursor-pointer"
                  >
                    {contractShareBySource.map((entry, index) => (
                      <Cell
                        key={`contract-cell-top-${index}`}
                        fill={entry.color}
                        stroke={selectedContractSource && isSameKey(selectedContractSource, entry.rawName) ? ACTIVE_PIE_STROKE : 'none'}
                        strokeWidth={2}
                        opacity={selectedContractSource && !isSameKey(selectedContractSource, entry.rawName) ? 0.3 : 1}
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
                    formatter={(value: number, _name, props: any) => [
                      isEnglish ? `${value} contracts (${props?.payload?.percent || 0}%)` : `${value} HĐ (${props?.payload?.percent || 0}%)`,
                      props?.payload?.name || ''
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <span className="block text-2xl font-bold text-slate-800">0</span>
                  <span className="text-sm text-slate-400">{isEnglish ? 'No contract data' : 'Chưa có dữ liệu hợp đồng'}</span>
                </div>
              </div>
            )}
            {contractShareBySource.length > 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <span className="block text-2xl font-bold text-slate-800">
                    {selectedContractSlice ? selectedContractSlice.value : totalContracts}
                  </span>
                  <span className="text-xs text-slate-400">
                    {selectedContractSlice ? selectedContractSlice.name : (isEnglish ? 'Contracts' : 'Hợp đồng')}
                  </span>
                </div>
              </div>
            )}
          </div>
          {contractShareBySource.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-medium text-slate-500">
              <ChartLegendButton
                label={isEnglish ? 'Total' : 'Tổng'}
                active={!selectedContractSource}
                onClick={() => setSelectedContractSource(null)}
                neutral
              />
              {contractShareBySource.map((item) => (
                <ChartLegendButton
                  key={item.rawName}
                  label={`${item.name} (${item.percent}%)`}
                  color={item.color}
                  active={!!selectedContractSource && isSameKey(selectedContractSource, item.rawName)}
                  muted={!!selectedContractSource && !isSameKey(selectedContractSource, item.rawName)}
                  onClick={() => setSelectedContractSource(isSameKey(item.rawName, selectedContractSource) ? null : item.rawName)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Status Distribution Pie */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-550">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-slate-900">{isEnglish ? 'Status Share by Source' : 'Tỷ trọng Trạng thái theo Nguồn'}</h3>
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
                    onClick={(data) => {
                      const raw = getPieRawName(data);
                      if (raw) setSelectedStatusKey(isSameKey(raw, selectedStatusKey) ? null : raw);
                    }}
                    className="cursor-pointer"
                  >
                    {statusDistributionPie.map((entry, index) => (
                      <Cell
                        key={`status-cell-top-${index}`}
                        fill={entry.color}
                        stroke={selectedStatusKey && isSameKey(selectedStatusKey, entry.rawName) ? ACTIVE_PIE_STROKE : 'none'}
                        strokeWidth={2}
                        opacity={selectedStatusKey && !isSameKey(selectedStatusKey, entry.rawName) ? 0.3 : 1}
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
                    formatter={(value: number, _name, props: any) => [
                      `${props?.payload?.count || 0} (${value}%)`,
                      props?.payload?.name || ''
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">
                {isEnglish ? 'No data available' : 'Chưa có dữ liệu'}
              </div>
            )}
            {statusDistributionPie.length > 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <span className="block text-2xl font-bold text-slate-800">
                    {selectedStatusSlice ? selectedStatusSlice.count : totalStatusLeads}
                  </span>
                  <span className="text-xs text-slate-400">
                    {selectedStatusSlice ? selectedStatusSlice.name : 'Leads'}
                  </span>
                </div>
              </div>
            )}
          </div>
          {statusDistributionPie.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-medium text-slate-500">
              <ChartLegendButton
                label={isEnglish ? 'Total' : 'Tổng'}
                active={!selectedStatusKey}
                onClick={() => setSelectedStatusKey(null)}
                neutral
              />
              {statusDistributionPie.map((item) => (
                <ChartLegendButton
                  key={item.rawName}
                  label={`${item.name} (${item.value}%)`}
                  color={item.color}
                  active={!!selectedStatusKey && isSameKey(selectedStatusKey, item.rawName)}
                  muted={!!selectedStatusKey && !isSameKey(selectedStatusKey, item.rawName)}
                  onClick={() => setSelectedStatusKey(isSameKey(item.rawName, selectedStatusKey) ? null : item.rawName)}
                />
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
                {isEnglish
                  ? `Contract Conversion Rate by ${conversionDimension === 'source' ? 'Source' : 'Product'}`
                  : `Tỷ lệ chuyển đổi HĐ theo ${conversionDimension === 'source' ? 'Nguồn' : 'Sản phẩm'}`}
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
                  {isEnglish ? 'By source' : 'Theo nguồn'}
                </button>
                <button
                  onClick={() => setConversionDimension('product')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                    conversionDimension === 'product'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {isEnglish ? 'By product' : 'Theo sản phẩm'}
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
                      isEnglish ? 'Conversion rate' : 'Tỷ lệ chuyển đổi',
                    ]}
                  />
                  <Bar
                    dataKey="rate"
                    radius={[6, 6, 0, 0]}
                    name={isEnglish ? 'Conversion rate (%)' : 'Tỷ lệ chuyển đổi (%)'}
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
                {isEnglish ? 'No conversion data' : 'Chưa có dữ liệu chuyển đổi'}
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
              <h3 className="font-bold text-lg text-slate-900">{isEnglish ? 'Lead Velocity by Channel Over Time' : 'Tốc độ Lead theo Kênh theo Thời gian'}</h3>
              <p className="text-xs text-slate-500 mt-1">
                {isEnglish
                  ? 'Sample data for the trend chart. The X axis is time and each line represents a channel.'
                  : 'Dữ liệu minh họa cho biểu đồ đường. Trục X là thời gian, mỗi đường là một kênh.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={growthGranularity}
                onChange={(e) => setGrowthGranularity(e.target.value as 'week' | 'month' | 'year')}
                className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-700"
              >
                  <option value="week">{isEnglish ? 'By week' : 'Theo tuần'}</option>
                  <option value="month">{isEnglish ? 'By month' : 'Theo tháng'}</option>
                  <option value="year">{isEnglish ? 'By year' : 'Theo năm'}</option>
              </select>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                <span className="text-xs text-slate-500 whitespace-nowrap">
                  {growthLookbackLabel}
                </span>
                <input
                  type="number"
                  min={0}
                  max={growthLookbackMax}
                  value={growthLookback}
                  onChange={(e) => {
                    const parsed = Math.floor(Number(e.target.value) || 0);
                    const capped = Math.max(0, Math.min(parsed, growthLookbackMax));
                    setGrowthLookback(capped);
                  }}
                  className="w-16 bg-white border border-slate-200 rounded px-2 py-1 text-sm text-slate-700"
                />
              </div>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                  <span className="text-xs text-slate-500 whitespace-nowrap">{isEnglish ? 'Year offset' : 'Số năm trước'}</span>
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
                <LineChart data={leadGrowthByChannel.rows}>
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
                  />
                  <Tooltip
                    cursor={{ stroke: '#cbd5e1', strokeDasharray: '4 4' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(value: number, name: string) => [isEnglish ? `${value} leads` : `${value} lead`, name]}
                  />
                  <Legend wrapperStyle={{ paddingTop: '16px' }} iconType="plainline" />
                  {leadGrowthByChannel.channels.map((channel) => (
                    <Line
                      key={channel.rawName}
                      dataKey={channel.label}
                      type="linear"
                      stroke={channel.color}
                      strokeWidth={2}
                      dot={false}
                      activeDot={false}
                      label={renderLineEndLabel(channel.color)}
                      connectNulls
                      animationDuration={900}
                      name={channel.label}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">
                {isEnglish ? 'No data for the selected time range' : 'Chưa có dữ liệu cho khoảng thời gian đã chọn'}
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

export default MarketingDashboard;

