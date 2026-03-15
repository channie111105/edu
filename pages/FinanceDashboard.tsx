import React, { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  DollarSign,
  Filter,
  MapPin,
  TrendingUp,
  User,
  X
} from 'lucide-react';
import { DateRangeType, LocationType } from '../components/DashboardFilters';
import { IClassStudent, IQuotation, ISalesTeam, IStudent, ITrainingClass } from '../types';
import { getClassStudents, getQuotations, getSalesTeams, getStudents, getTrainingClasses } from '../utils/storage';

type SalesFilterType = 'all' | string;

type DebtTermRecord = {
  id: string;
  classStudentId: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  className: string;
  branch: string;
  salesPersonId: string;
  salesPersonName: string;
  amount: number;
  dueDate: string;
  termNo: number;
  termStatus: 'UNPAID' | 'OVERDUE';
  recordDate: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const BRANCH_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

const money = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value || 0);

const moneyCompact = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return '0 đ';
  if (value >= 1_000_000_000) {
    const normalized = value / 1_000_000_000;
    return `${Number.isInteger(normalized) ? normalized.toFixed(0) : normalized.toFixed(1)} Tỷ`;
  }
  if (value >= 1_000_000) {
    const normalized = value / 1_000_000;
    return `${Number.isInteger(normalized) ? normalized.toFixed(0) : normalized.toFixed(1)} Triệu`;
  }
  return money(value);
};

const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate());
const endOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate(), 23, 59, 59, 999);
const toDate = (value?: string | number | Date | null) => {
  if (!value && value !== 0) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const raw = typeof value === 'string' && !value.includes('T') ? `${value}T00:00:00` : value;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeToken = (value?: string) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const getLocationKey = (branch?: string): LocationType => {
  const token = normalizeToken(branch);
  if (!token) return 'all';
  if (token.includes('ha noi') || token === 'hn' || token.includes('hanoi')) return 'hanoi';
  if (token.includes('ho chi minh') || token.includes('hcm') || token.includes('sai gon')) return 'hcm';
  if (token.includes('da nang') || token.includes('danang')) return 'danang';
  return 'all';
};

const getLocationLabel = (location: LocationType) => {
  switch (location) {
    case 'hanoi':
      return 'Hà Nội';
    case 'hcm':
      return 'Hồ Chí Minh';
    case 'danang':
      return 'Đà Nẵng';
    default:
      return 'Tất cả chi nhánh';
  }
};

const matchesDateRange = (value: string, range: DateRangeType, customDate: string) => {
  const date = toDate(value);
  if (!date) return false;

  const now = new Date();
  const today = startOfDay(now);
  const current = startOfDay(date);

  switch (range) {
    case 'today':
      return current.getTime() === today.getTime();
    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return current.getTime() === yesterday.getTime();
    }
    case '30days': {
      const from = new Date(today);
      from.setDate(from.getDate() - 29);
      return current >= from && current <= endOfDay(today);
    }
    case 'thisMonth':
      return current.getMonth() === today.getMonth() && current.getFullYear() === today.getFullYear();
    case 'lastMonth': {
      const month = today.getMonth() === 0 ? 11 : today.getMonth() - 1;
      const year = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
      return current.getMonth() === month && current.getFullYear() === year;
    }
    case 'thisQuarter': {
      const quarter = Math.floor(today.getMonth() / 3);
      return Math.floor(current.getMonth() / 3) === quarter && current.getFullYear() === today.getFullYear();
    }
    case 'thisYear':
      return current.getFullYear() === today.getFullYear();
    case 'custom': {
      if (!customDate) return true;
      const selected = toDate(customDate);
      if (!selected) return true;
      return current.getTime() === startOfDay(selected).getTime();
    }
    default:
      return true;
  }
};

const getDaysUntilDue = (dueDate: string) => {
  const due = toDate(dueDate);
  if (!due) return null;
  return Math.ceil((startOfDay(due).getTime() - startOfDay(new Date()).getTime()) / DAY_MS);
};

const isOverdueTerm = (term: Pick<DebtTermRecord, 'dueDate' | 'termStatus'>) => {
  if (term.termStatus === 'OVERDUE') return true;
  const diffDays = getDaysUntilDue(term.dueDate);
  return diffDays !== null && diffDays < 0;
};

const buildForecastBuckets = (terms: DebtTermRecord[]) => {
  const buckets = Array.from({ length: 4 }, (_, index) => ({
    name: index === 3 ? 'Tuần 4 (Dự kiến)' : `Tuần ${index + 1}`,
    value: 0
  }));

  if (!terms.length) return buckets;

  const currentTerms = terms
    .filter((term) => !isOverdueTerm(term))
    .sort((a, b) => (toDate(a.dueDate)?.getTime() || 0) - (toDate(b.dueDate)?.getTime() || 0));

  const source = currentTerms.length ? currentTerms : [...terms].sort((a, b) => (toDate(a.dueDate)?.getTime() || 0) - (toDate(b.dueDate)?.getTime() || 0));
  const anchor = toDate(source[0]?.dueDate) || startOfDay(new Date());
  const start = startOfDay(anchor);

  source.forEach((term) => {
    const due = toDate(term.dueDate) || start;
    const diffDays = Math.max(0, Math.floor((startOfDay(due).getTime() - start.getTime()) / DAY_MS));
    const bucketIndex = Math.min(Math.floor(diffDays / 7), buckets.length - 1);
    buckets[bucketIndex].value += term.amount;
  });

  return buckets;
};

const FinanceDashboard: React.FC = () => {
  const [dateRange, setDateRange] = useState<DateRangeType>('thisMonth');
  const [customDate, setCustomDate] = useState('');
  const [location, setLocation] = useState<LocationType>('all');
  const [salesFilter, setSalesFilter] = useState<SalesFilterType>('all');
  const [classStudents, setClassStudents] = useState<IClassStudent[]>([]);
  const [students, setStudents] = useState<IStudent[]>([]);
  const [classes, setClasses] = useState<ITrainingClass[]>([]);
  const [quotations, setQuotations] = useState<IQuotation[]>([]);
  const [salesTeams, setSalesTeams] = useState<ISalesTeam[]>([]);

  useEffect(() => {
    const loadData = () => {
      setClassStudents(getClassStudents());
      setStudents(getStudents());
      setClasses(getTrainingClasses());
      setQuotations(getQuotations());
      setSalesTeams(getSalesTeams());
    };

    loadData();

    window.addEventListener('educrm:class-students-changed', loadData as EventListener);
    window.addEventListener('educrm:students-changed', loadData as EventListener);
    window.addEventListener('educrm:training-classes-changed', loadData as EventListener);
    window.addEventListener('educrm:quotations-changed', loadData as EventListener);
    window.addEventListener('educrm:sales-teams-changed', loadData as EventListener);

    return () => {
      window.removeEventListener('educrm:class-students-changed', loadData as EventListener);
      window.removeEventListener('educrm:students-changed', loadData as EventListener);
      window.removeEventListener('educrm:training-classes-changed', loadData as EventListener);
      window.removeEventListener('educrm:quotations-changed', loadData as EventListener);
      window.removeEventListener('educrm:sales-teams-changed', loadData as EventListener);
    };
  }, []);

  const studentMap = useMemo(() => new Map(students.map((item) => [item.id, item])), [students]);
  const classMap = useMemo(() => new Map(classes.map((item) => [item.id, item])), [classes]);
  const quotationMap = useMemo(() => new Map(quotations.map((item) => [item.id, item])), [quotations]);

  const quotationByStudentId = useMemo(() => {
    const map = new Map<string, IQuotation>();
    quotations.forEach((quotation) => {
      if (quotation.studentId && !map.has(quotation.studentId)) {
        map.set(quotation.studentId, quotation);
      }
    });
    return map;
  }, [quotations]);

  const salesDirectory = useMemo(() => {
    const map = new Map<string, string>();
    salesTeams.forEach((team) => {
      team.members.forEach((member) => {
        if (member.userId && member.name && !map.has(member.userId)) {
          map.set(member.userId, member.name);
        }
      });
    });
    quotations.forEach((quotation) => {
      if (quotation.createdBy && quotation.salespersonName && !map.has(quotation.createdBy)) {
        map.set(quotation.createdBy, quotation.salespersonName);
      }
    });
    return map;
  }, [quotations, salesTeams]);

  const debtTerms = useMemo<DebtTermRecord[]>(() => {
    return classStudents.flatMap((item) => {
      const student = studentMap.get(item.studentId);
      const classInfo = classMap.get(item.classId);
      const quotation =
        (student?.soId ? quotationMap.get(student.soId) : undefined) ||
        quotationByStudentId.get(item.studentId);
      const salesPersonId = student?.salesPersonId || quotation?.createdBy || '';
      const branch = student?.campus || classInfo?.campus || quotation?.branchName || 'Khác';
      const recordDate =
        (typeof item.createdAt === 'number' ? new Date(item.createdAt).toISOString() : undefined) ||
        student?.createdAt ||
        quotation?.createdAt ||
        new Date().toISOString();

      return (item.debtTerms || [])
        .filter((term) => term.status !== 'PAID' && Number(term.amount || 0) > 0)
        .map((term) => ({
          id: `${item.id}-${term.termNo}`,
          classStudentId: item.id,
          studentId: item.studentId,
          studentCode: student?.code || item.studentId,
          studentName: student?.name || quotation?.customerName || item.studentId,
          className: classInfo?.name || student?.className || item.classId,
          branch,
          salesPersonId,
          salesPersonName: quotation?.salespersonName || salesDirectory.get(salesPersonId) || salesPersonId || 'Chưa gắn sales',
          amount: Number(term.amount || 0),
          dueDate: term.dueDate,
          termNo: term.termNo,
          termStatus: term.status,
          recordDate
        }));
    });
  }, [classMap, classStudents, quotationByStudentId, quotationMap, salesDirectory, studentMap]);

  const salesOptions = useMemo(() => {
    return Array.from(
      new Map(
        debtTerms
          .filter((term) => term.salesPersonId)
          .map((term) => [term.salesPersonId, { value: term.salesPersonId, label: term.salesPersonName }])
      ).values()
    ).sort((a, b) => a.label.localeCompare(b.label, 'vi'));
  }, [debtTerms]);

  const salesLabel = useMemo(() => {
    if (salesFilter === 'all') return 'Tất cả Sales';
    return salesOptions.find((item) => item.value === salesFilter)?.label || salesFilter;
  }, [salesFilter, salesOptions]);

  const dateAndSalesTerms = useMemo(() => {
    return debtTerms.filter((term) => {
      if (!matchesDateRange(term.recordDate, dateRange, customDate)) return false;
      if (salesFilter !== 'all' && term.salesPersonId !== salesFilter) return false;
      return true;
    });
  }, [customDate, dateRange, debtTerms, salesFilter]);

  const filteredTerms = useMemo(() => {
    return dateAndSalesTerms.filter((term) => {
      if (location === 'all') return true;
      return getLocationKey(term.branch) === location;
    });
  }, [dateAndSalesTerms, location]);

  const summary = useMemo(() => {
    const totalReceivables = filteredTerms.reduce((sum, term) => sum + term.amount, 0);
    const overdueTerms = filteredTerms.filter((term) => isOverdueTerm(term));
    const inTermTerms = filteredTerms.filter((term) => !isOverdueTerm(term));
    const dueSoonStudents = new Set(
      inTermTerms
        .filter((term) => {
          const diffDays = getDaysUntilDue(term.dueDate);
          return diffDays !== null && diffDays >= 0 && diffDays <= 7;
        })
        .map((term) => term.studentId)
    );

    return {
      totalReceivables,
      inTermAmount: inTermTerms.reduce((sum, term) => sum + term.amount, 0),
      inTermCount: new Set(inTermTerms.map((term) => term.studentId)).size,
      overdueAmount: overdueTerms.reduce((sum, term) => sum + term.amount, 0),
      overdueCount: new Set(overdueTerms.map((term) => term.studentId)).size,
      dueSoonCount: dueSoonStudents.size
    };
  }, [filteredTerms]);

  const forecastData = useMemo(() => buildForecastBuckets(filteredTerms), [filteredTerms]);

  const branchDistribution = useMemo(() => {
    const grouped = new Map<string, number>();
    dateAndSalesTerms.forEach((term) => {
      const key = term.branch || 'Khác';
      grouped.set(key, (grouped.get(key) || 0) + term.amount);
    });

    return Array.from(grouped.entries())
      .map(([name, value], index) => ({
        name,
        value,
        color: BRANCH_COLORS[index % BRANCH_COLORS.length],
        locationKey: getLocationKey(name)
      }))
      .sort((a, b) => b.value - a.value);
  }, [dateAndSalesTerms]);

  const totalForPie = branchDistribution.reduce((sum, item) => sum + item.value, 0);
  const inTermPercent = summary.totalReceivables > 0 ? Math.round((summary.inTermAmount / summary.totalReceivables) * 100) : 0;
  const overduePercent = summary.totalReceivables > 0 ? Math.round((summary.overdueAmount / summary.totalReceivables) * 100) : 0;
  const hasActiveFilters = salesFilter !== 'all' || location !== 'all';
  const dateOptions: Array<{ value: DateRangeType; label: string }> = [
    { value: 'today', label: 'Hôm nay' },
    { value: 'yesterday', label: 'Hôm qua' },
    { value: '30days', label: '30 ngày qua' },
    { value: 'thisMonth', label: 'Tháng này' },
    { value: 'lastMonth', label: 'Tháng trước' },
    { value: 'thisQuarter', label: 'Quý này' },
    { value: 'thisYear', label: 'Năm nay' },
    { value: 'custom', label: 'Chọn ngày cụ thể...' }
  ];

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] font-sans text-[#111418] overflow-y-auto">
      <div className="flex flex-1 flex-col py-5 px-6 lg:px-8 max-w-[1600px] mx-auto w-full gap-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold text-slate-900">Trung tâm Tài chính & Kế toán</h2>
            <p className="mt-1 text-sm text-slate-500">Báo cáo tài chính, quản trị dòng tiền và theo dõi công nợ.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 lg:justify-end">
            <div className="relative">
              <div className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2 bg-white hover:bg-slate-50 transition-colors min-w-[220px] shadow-sm">
                <Filter size={16} className="text-slate-500" />
                <User size={16} className="text-slate-500" />
                <select
                  className="bg-transparent outline-none w-full text-sm font-medium text-slate-700 cursor-pointer appearance-none"
                  value={salesFilter}
                  onChange={(event) => setSalesFilter(event.target.value)}
                >
                  <option value="all">Tất cả Sales</option>
                  {salesOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="text-slate-400" />
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
              <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
                <Calendar size={16} className="text-slate-500" />
                <div className="flex items-center gap-2">
                  <select
                    value={dateRange}
                    onChange={(event) => setDateRange(event.target.value as DateRangeType)}
                    className="bg-transparent border-none text-sm font-bold focus:ring-0 cursor-pointer outline-none text-slate-700 min-w-[120px]"
                  >
                    {dateOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  {dateRange === 'custom' && (
                    <input
                      type="date"
                      value={customDate}
                      onChange={(event) => setCustomDate(event.target.value)}
                      className="bg-slate-50 border-none text-sm font-medium focus:ring-0 cursor-pointer outline-none text-slate-700 p-0 h-6 px-1 rounded shadow-inner"
                    />
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-slate-500" />
                <select
                  value={location}
                  onChange={(event) => setLocation(event.target.value as LocationType)}
                  className="bg-transparent border-none text-sm font-bold focus:ring-0 cursor-pointer outline-none text-slate-700"
                >
                  <option value="all">Tất cả chi nhánh</option>
                  <option value="hanoi">Hà Nội</option>
                  <option value="hcm">Hồ Chí Minh</option>
                  <option value="danang">Đà Nẵng</option>
                </select>
                <ChevronDown size={14} className="text-slate-400" />
              </div>
            </div>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2">
            {salesFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setSalesFilter('all')}
                className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700"
              >
                Sale: {salesLabel}
                <X size={12} />
              </button>
            )}
            {location !== 'all' && (
              <button
                type="button"
                onClick={() => setLocation('all')}
                className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700"
              >
                Chi nhánh: {getLocationLabel(location)}
                <X size={12} />
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setSalesFilter('all');
                setLocation('all');
              }}
              className="text-xs font-semibold text-slate-400 hover:text-slate-600"
            >
              Xóa lọc
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <DollarSign size={64} className="text-blue-500" />
            </div>
            <p className="text-sm font-bold text-[#64748B] uppercase tracking-wider relative z-10">Tổng phải thu</p>
            <p className="text-[2rem] leading-tight font-black text-[#111418] mt-3 relative z-10">{moneyCompact(summary.totalReceivables)}</p>
            <p className="mt-2 text-xs text-blue-600 font-bold relative z-10">
              {filteredTerms.length ? `${filteredTerms.length} khoản thu còn mở theo bộ lọc hiện tại` : 'Chưa có công nợ phù hợp bộ lọc'}
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <CheckCircle2 size={64} className="text-emerald-500" />
            </div>
            <p className="text-sm font-bold text-[#64748B] uppercase tracking-wider relative z-10">Trong hạn (In Term)</p>
            <p className="text-[2rem] leading-tight font-black text-emerald-600 mt-3 relative z-10">{moneyCompact(summary.inTermAmount)}</p>
            <p className="mt-2 text-xs text-[#64748B] relative z-10">
              {summary.dueSoonCount > 0
                ? `${summary.dueSoonCount} học viên sắp đến hạn trong 7 ngày`
                : `Đang theo dõi ${summary.inTermCount} học viên còn trong hạn`}
            </p>
            <div className="w-full bg-emerald-100 h-1 mt-3 rounded-full">
              <div className="bg-emerald-500 h-1 rounded-full" style={{ width: `${inTermPercent}%` }} />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <AlertCircle size={64} className="text-red-500" />
            </div>
            <p className="text-sm font-bold text-[#64748B] uppercase tracking-wider relative z-10">Quá hạn (Overdue)</p>
            <p className="text-[2rem] leading-tight font-black text-[#E02424] mt-3 relative z-10">{moneyCompact(summary.overdueAmount)}</p>
            <p className="mt-2 text-xs text-[#64748B] relative z-10">
              {summary.overdueCount > 0
                ? `Cần ưu tiên xử lý ngay (${summary.overdueCount} học viên)`
                : 'Chưa phát sinh khoản quá hạn theo bộ lọc hiện tại'}
            </p>
            <div className="w-full bg-red-100 h-1 mt-3 rounded-full">
              <div className="bg-red-500 h-1 rounded-full" style={{ width: `${overduePercent}%` }} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[340px]">
          <div className="lg:col-span-2 bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="text-emerald-600" size={18} />
                  Dự báo Dòng tiền thu
                </h3>
                <p className="text-xs text-slate-500">
                  Dựa trên lịch đến hạn các khoản chưa thu, cập nhật theo bộ lọc ngày, chi nhánh và sale.
                </p>
              </div>
            </div>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecastData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickFormatter={(value) => `${Math.round(value / 1_000_000)}tr`}
                  />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(value: number) => [money(value), 'Dự kiến thu']}
                  />
                  <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" activeDot={{ r: 6 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm flex flex-col">
            <div className="mb-2">
              <h3 className="text-lg font-bold text-slate-900">Tỷ trọng Công nợ</h3>
              <p className="text-xs text-slate-500">Theo cơ sở, click biểu đồ để lọc chi nhánh</p>
            </div>
            <div className="flex-1 w-full min-h-0 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={branchDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                    onClick={(slice) => {
                      if (!slice?.locationKey || slice.locationKey === 'all') return;
                      setLocation((current) => (current === slice.locationKey ? 'all' : slice.locationKey));
                    }}
                    className="cursor-pointer"
                  >
                    {branchDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        stroke={location === entry.locationKey ? '#0f172a' : 'none'}
                        strokeWidth={2}
                        opacity={location !== 'all' && location !== entry.locationKey ? 0.35 : 1}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => money(value)} />
                  <Legend verticalAlign="bottom" height={28} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-6">
                <div className="text-center">
                  <span className="block text-xl font-bold text-slate-800">{moneyCompact(location === 'all' ? totalForPie : summary.totalReceivables)}</span>
                  <span className="text-xs text-slate-500 uppercase">
                    {location === 'all' ? 'Tổng nợ' : getLocationLabel(location)}
                  </span>
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
