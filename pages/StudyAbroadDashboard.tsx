import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DashboardFilters, { DateRangeType, LocationType } from '../components/DashboardFilters';
import { AlertTriangle, BookOpen, Clock, Plane, Users } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CountryCaseStat, DashboardCaseStats, DashboardFilters as DashboardCaseFilters, ProgramCaseStat } from '../types';
import { getDashboardCaseStats } from '../services/dashboardCaseStats.local';

type CategoryKey = 'country' | 'program';
type ChartRow = CountryCaseStat | ProgramCaseStat;
type ChartDataRow = ChartRow & { total: number };

const STATUS_CONFIG = {
  unprocessed: { label: 'Chưa xử lý', color: '#94a3b8' },
  processing: { label: 'Đang xử lý', color: '#3b82f6' },
  departed: { label: 'Đã bay', color: '#10b981' }
} as const;

const RELOAD_KEYS = ['educrm_cases', 'educrm_admissions', 'educrm_quotations', 'educrm_students', 'educrm_leads_v2'];

const getStartOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const getEndOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};

const toDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const resolveDateRange = (dateRange: DateRangeType, customDate: string): { from: string; to: string } | undefined => {
  const now = new Date();
  const todayStart = getStartOfDay(now);
  const todayEnd = getEndOfDay(now);

  if (dateRange === 'custom' && customDate) {
    const selected = new Date(customDate);
    return {
      from: toDateString(getStartOfDay(selected)),
      to: toDateString(getEndOfDay(selected))
    };
  }

  if (dateRange === 'today') {
    return { from: toDateString(todayStart), to: toDateString(todayEnd) };
  }

  if (dateRange === 'yesterday') {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    return {
      from: toDateString(getStartOfDay(yesterday)),
      to: toDateString(getEndOfDay(yesterday))
    };
  }

  if (dateRange === '30days') {
    const from = new Date(now);
    from.setDate(now.getDate() - 29);
    return {
      from: toDateString(getStartOfDay(from)),
      to: toDateString(todayEnd)
    };
  }

  if (dateRange === 'thisMonth') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      from: toDateString(getStartOfDay(from)),
      to: toDateString(todayEnd)
    };
  }

  if (dateRange === 'lastMonth') {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 0);
    return {
      from: toDateString(getStartOfDay(from)),
      to: toDateString(getEndOfDay(to))
    };
  }

  if (dateRange === 'thisQuarter') {
    const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
    const from = new Date(now.getFullYear(), quarterStartMonth, 1);
    return {
      from: toDateString(getStartOfDay(from)),
      to: toDateString(todayEnd)
    };
  }

  if (dateRange === 'thisYear') {
    const from = new Date(now.getFullYear(), 0, 1);
    return {
      from: toDateString(getStartOfDay(from)),
      to: toDateString(todayEnd)
    };
  }

  return undefined;
};

const locationToBranch = (location: LocationType): string | 'all' => {
  if (location === 'hanoi') return 'hanoi';
  if (location === 'hcm') return 'hcm';
  if (location === 'danang') return 'danang';
  return 'all';
};

const getChartTotal = (row: ChartRow) => row.unprocessed + row.processing + row.departed;
const toChartRows = (rows: ChartRow[]): ChartDataRow[] => rows.map((row) => ({ ...row, total: getChartTotal(row) }));

const StackedBarTooltip: React.FC<{ active?: boolean; payload?: any[]; categoryKey: CategoryKey }> = ({
  active,
  payload,
  categoryKey
}) => {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as ChartDataRow | undefined;
  if (!row) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm">
      <div className="mb-1 font-bold text-slate-900">{row[categoryKey]}</div>
      <div className="space-y-1 text-slate-700">
        <div>Chưa xử lý: {row.unprocessed}</div>
        <div>Đang xử lý: {row.processing}</div>
        <div>Đã bay: {row.departed}</div>
      </div>
      <div className="mt-2 border-t pt-1 font-bold text-slate-900">Tổng: {row.total ?? getChartTotal(row)}</div>
    </div>
  );
};

const ChartSkeleton: React.FC = () => (
  <div className="space-y-3 animate-pulse">
    {Array.from({ length: 5 }).map((_, index) => (
      <div key={index} className="grid grid-cols-[120px_1fr] items-center gap-3">
        <div className="h-3 rounded bg-slate-200" />
        <div className="h-8 rounded bg-slate-200" />
      </div>
    ))}
  </div>
);

const StackedCaseChartCard: React.FC<{
  title: string;
  categoryKey: CategoryKey;
  data: ChartRow[];
  isLoading: boolean;
}> = ({ title, categoryKey, data, isLoading }) => {
  const chartData = useMemo(() => toChartRows(data), [data]);

  return (
    <div className="flex flex-col rounded-xl border border-[#cfdbe7] bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-base font-bold text-slate-900">{title}</p>
          <p className="text-xs text-slate-500">Sắp xếp theo tổng hồ sơ giảm dần</p>
        </div>
        <span className="text-xs font-semibold text-slate-500">{chartData.length} nhóm</span>
      </div>

      {isLoading ? (
        <ChartSkeleton />
      ) : chartData.length === 0 ? (
        <div className="flex h-[260px] items-center justify-center rounded-lg border border-dashed text-sm text-slate-500">
          Không có dữ liệu theo bộ lọc hiện tại
        </div>
      ) : (
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 80, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis dataKey={categoryKey} type="category" width={120} tick={{ fontSize: 12, fontWeight: 600 }} />
              <Tooltip content={<StackedBarTooltip categoryKey={categoryKey} />} />
              <Bar dataKey="unprocessed" stackId="a" fill={STATUS_CONFIG.unprocessed.color} radius={[4, 0, 0, 4]} />
              <Bar dataKey="processing" stackId="a" fill={STATUS_CONFIG.processing.color} />
              <Bar dataKey="departed" stackId="a" fill={STATUS_CONFIG.departed.color} radius={[0, 4, 4, 0]} />
              <Bar dataKey="total" fill="transparent" legendType="none" isAnimationActive={false}>
                <LabelList
                  dataKey="total"
                  position="right"
                  formatter={(value) => `Tổng: ${value}`}
                  style={{ fill: '#334155', fontSize: 11, fontWeight: 700 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

const StudyAbroadDashboard: React.FC = () => {
  const [dateRange, setDateRange] = useState<DateRangeType>('thisMonth');
  const [customDate, setCustomDate] = useState<string>('');
  const [location, setLocation] = useState<LocationType>('all');
  const [stats, setStats] = useState<DashboardCaseStats>({ byCountry: [], byProgram: [] });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const timerRef = useRef<number | null>(null);

  const filters = useMemo<DashboardCaseFilters>(() => {
    return {
      dateRange: resolveDateRange(dateRange, customDate),
      branchId: locationToBranch(location)
    };
  }, [customDate, dateRange, location]);

  const loadStats = useCallback(
    (withDelay = true) => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }

      setIsLoading(true);
      const run = () => {
        setStats(getDashboardCaseStats(filters));
        setIsLoading(false);
      };

      if (withDelay) {
        timerRef.current = window.setTimeout(run, 150);
        return;
      }

      run();
    },
    [filters]
  );

  useEffect(() => {
    loadStats(true);
  }, [loadStats]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (!event.key || RELOAD_KEYS.includes(event.key)) {
        loadStats(false);
      }
    };
    const onCasesUpdated = () => loadStats(false);

    window.addEventListener('storage', onStorage);
    window.addEventListener('educrm_cases_updated', onCasesUpdated as EventListener);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('educrm_cases_updated', onCasesUpdated as EventListener);
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [loadStats]);

  const totals = useMemo(() => {
    return stats.byCountry.reduce(
      (acc, row) => {
        acc.unprocessed += row.unprocessed;
        acc.processing += row.processing;
        acc.departed += row.departed;
        return acc;
      },
      { unprocessed: 0, processing: 0, departed: 0 }
    );
  }, [stats.byCountry]);

  const totalCases = totals.unprocessed + totals.processing + totals.departed;

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-[#f8fafc] text-[#0d141b] font-sans">
      <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-8 p-6 lg:p-10">
        <DashboardFilters
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          location={location}
          onLocationChange={setLocation}
          customDate={customDate}
          onCustomDateChange={setCustomDate}
          title="Tổng quan"
          subtitle="Theo dõi phân bổ hồ sơ theo trạng thái, quốc gia và chương trình từ dữ liệu LocalStorage."
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-xl bg-[#e7edf3] p-5">
            <p className="text-sm font-medium text-slate-700">Hồ sơ tổng</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{totalCases}</p>
            <div className="mt-2 flex items-center gap-1 text-xs font-bold text-slate-600">
              <Users size={14} /> Total Cases
            </div>
          </div>
          <div className="rounded-xl bg-[#e7edf3] p-5">
            <p className="text-sm font-medium text-slate-700">Chưa xử lý</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{totals.unprocessed}</p>
            <div className="mt-2 flex items-center gap-1 text-xs font-bold text-amber-600">
              <AlertTriangle size={14} /> Unprocessed
            </div>
          </div>
          <div className="rounded-xl bg-[#e7edf3] p-5">
            <p className="text-sm font-medium text-slate-700">Đang xử lý</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{totals.processing}</p>
            <div className="mt-2 flex items-center gap-1 text-xs font-bold text-blue-600">
              <Clock size={14} /> Processing
            </div>
          </div>
          <div className="rounded-xl bg-[#e7edf3] p-5">
            <p className="text-sm font-medium text-slate-700">Đã bay</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{totals.departed}</p>
            <div className="mt-2 flex items-center gap-1 text-xs font-bold text-emerald-600">
              <Plane size={14} /> Departed
            </div>
          </div>
        </div>

        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[22px] font-bold tracking-[-0.015em] text-slate-900">Thống kê & Phân loại</h2>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_CONFIG.unprocessed.color }} />
                {STATUS_CONFIG.unprocessed.label}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_CONFIG.processing.color }} />
                {STATUS_CONFIG.processing.label}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_CONFIG.departed.color }} />
                {STATUS_CONFIG.departed.label}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <StackedCaseChartCard title="Hồ sơ theo Quốc gia" categoryKey="country" data={stats.byCountry} isLoading={isLoading} />
            <StackedCaseChartCard title="Hồ sơ theo Chương trình" categoryKey="program" data={stats.byProgram} isLoading={isLoading} />
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-[#cfdbe7] bg-white p-4 text-xs text-slate-500">
          <BookOpen size={14} />
          Dữ liệu đang lấy từ LocalStorage. TODO: thay service local bằng API backend khi có BE.
        </div>
      </div>
    </div>
  );
};

export default StudyAbroadDashboard;
