import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  LayoutGrid,
  List,
  Plus,
  RotateCcw,
  Search,
  Star
} from 'lucide-react';
import AdvancedDateFilter, { DateRange } from '../components/AdvancedDateFilter';
import { IQuotation, IStudent, QuotationStatus } from '../types';
import { getQuotations, getStudents } from '../utils/storage';

const FAVORITES_STORAGE_KEY = 'educrm:quotation-favorites';
const SALESPERSON_MAP: Record<string, string> = {
  u1: 'Trần Văn Quản Trị',
  u2: 'Sarah Miller',
  u3: 'David Clark',
  u4: 'Alex Rivera'
};

const DISPLAY_VIEW_OPTIONS = [
  { value: 'list', label: 'Danh sách', icon: List, disabled: false },
  { value: 'kanban', label: 'Kanban', icon: LayoutGrid, disabled: true },
  { value: 'calendar', label: 'Lịch', icon: CalendarDays, disabled: true },
  { value: 'analysis', label: 'Phân tích', icon: BarChart3, disabled: true }
] as const;

const TIME_FIELD_OPTIONS = [
  { value: 'confirmDate', label: 'Ngày xác nhận' },
  { value: 'quotationDate', label: 'Ngày báo giá' }
] as const;

const TIME_PRESETS = [
  { value: 'all', label: 'Mọi ngày' },
  { value: 'today', label: 'Hôm nay' },
  { value: 'yesterday', label: 'Hôm qua' },
  { value: 'thisWeek', label: 'Tuần này' },
  { value: 'last7Days', label: '7 ngày qua' },
  { value: 'last30Days', label: '30 ngày qua' },
  { value: 'thisMonth', label: 'Tháng này' },
  { value: 'lastMonth', label: 'Tháng trước' },
  { value: 'custom', label: 'Tùy chọn' }
] as const;

const DATA_SCOPE_OPTIONS = [
  { value: 'all', label: 'Tất cả dữ liệu' },
  { value: 'quotation', label: 'Quotation' },
  { value: 'locked', label: 'Locked' }
] as const;

const GROUP_OPTIONS = [
  { value: 'none', label: 'Không nhóm' },
  { value: 'status', label: 'Trạng thái' },
  { value: 'payment', label: 'Thanh toán' },
  { value: 'salesperson', label: 'Tư vấn' },
  { value: 'sale_type', label: 'Loại đơn' }
] as const;

const FAVORITE_OPTIONS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'only', label: 'Chỉ yêu thích' },
  { value: 'first', label: 'Ưu tiên yêu thích' }
] as const;

type DisplayView = (typeof DISPLAY_VIEW_OPTIONS)[number]['value'];
type TimeFilterField = (typeof TIME_FIELD_OPTIONS)[number]['value'];
type TimeRangeType = (typeof TIME_PRESETS)[number]['value'];
type DataScope = (typeof DATA_SCOPE_OPTIONS)[number]['value'];
type GroupMode = (typeof GROUP_OPTIONS)[number]['value'];
type FavoriteMode = (typeof FAVORITE_OPTIONS)[number]['value'];

type SelectOption = {
  value: string;
  label: string;
};

type EnrichedQuotation = {
  quotation: IQuotation;
  studentName: string;
  salespersonName: string;
  paymentState: { label: string; className: string };
  displayStatus: { label: string; className: string };
  saleTypeLabel: string;
  quotationDateValue?: string;
  confirmDateValue?: string;
  isFavorite: boolean;
};

interface CompactSelectProps {
  label?: string;
  value: string;
  options: readonly SelectOption[];
  onChange: (value: string) => void;
  className?: string;
}

const CompactSelect: React.FC<CompactSelectProps> = ({
  label,
  value,
  options,
  onChange,
  className
}) => (
  <label
    className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] text-slate-600 shadow-sm ${className || ''}`}
  >
    {label ? <span className="whitespace-nowrap">{label}</span> : null}
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="min-w-0 flex-1 bg-transparent py-1.5 text-[12px] font-semibold text-slate-800 outline-none"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
);

interface GroupedDateFilterSelectProps {
  primaryValue: string;
  primaryOptions: readonly SelectOption[];
  onPrimaryChange: (value: string) => void;
  secondaryValue: string;
  secondaryOptions: readonly SelectOption[];
  onSecondaryChange: (value: string) => void;
  overlay?: React.ReactNode;
  className?: string;
}

const GroupedDateFilterSelect: React.FC<GroupedDateFilterSelectProps> = ({
  primaryValue,
  primaryOptions,
  onPrimaryChange,
  secondaryValue,
  secondaryOptions,
  onSecondaryChange,
  overlay,
  className
}) => (
  <div className={`relative inline-flex max-w-full ${className || ''}`}>
    <div className="inline-flex min-h-[34px] max-w-full items-center overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="relative border-r border-slate-200">
        <select
          aria-label="Time filter field"
          value={primaryValue}
          onChange={(event) => onPrimaryChange(event.target.value)}
          className="h-full appearance-none bg-transparent px-3.5 py-1.5 text-[12px] font-medium text-slate-700 outline-none"
        >
          {primaryOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="relative min-w-0">
        <select
          aria-label="Time filter range"
          value={secondaryValue}
          onChange={(event) => onSecondaryChange(event.target.value)}
          className="h-full min-w-[196px] appearance-none bg-transparent px-3.5 py-1.5 pr-9 text-[12px] font-semibold text-slate-800 outline-none"
        >
          {secondaryOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={15}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-600"
        />
      </div>
    </div>
    {overlay}
  </div>
);

const tryDecodeMojibake = (value: string) => {
  let current = value;

  for (let index = 0; index < 2; index += 1) {
    try {
      const decoded = decodeURIComponent(escape(current));
      if (!decoded || decoded === current) break;
      current = decoded;
    } catch {
      break;
    }
  }

  return current;
};

const normalizeText = (value?: string) => {
  const text = (value || '').trim();
  if (!text) return '-';
  return tryDecodeMojibake(text).replace(/\s+/g, ' ').trim();
};

const formatDateParts = (value?: string) => {
  if (!value) return { date: '-', time: '' };

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: '-', time: '' };

  return {
    date: date.toLocaleDateString('vi-VN'),
    time: date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  };
};

const formatCurrency = (value?: number) => `${(value || 0).toLocaleString('vi-VN')} đ`;

const getPaymentStateConfig = (quotation: IQuotation) => {
  if (quotation.status === QuotationStatus.LOCKED) {
    return { label: 'Đã thanh toán', className: 'bg-emerald-50 text-emerald-700' };
  }

  if (quotation.transactionStatus === 'DA_DUYET') {
    return { label: 'Đã thanh toán', className: 'bg-emerald-50 text-emerald-700' };
  }

  if (quotation.transactionStatus === 'CHO_DUYET') {
    return { label: 'Chờ duyệt', className: 'bg-amber-50 text-amber-700' };
  }

  if (quotation.transactionStatus === 'TU_CHOI') {
    return { label: 'Từ chối', className: 'bg-rose-50 text-rose-700' };
  }

  if (quotation.paymentProof || quotation.paymentMethod) {
    return { label: 'Chờ xử lý', className: 'bg-blue-50 text-blue-700' };
  }

  return { label: 'Chưa thanh toán', className: 'bg-slate-100 text-slate-600' };
};

const getDisplayStatusConfig = (status: QuotationStatus) => {
  if (status === QuotationStatus.LOCKED) {
    return { label: 'Locked', className: 'bg-slate-200 text-slate-700' };
  }
  return { label: 'Quotation', className: 'bg-blue-50 text-blue-700' };
};

const getSaleTypeLabel = (quotation: IQuotation) => {
  if (quotation.serviceType === 'Training') return 'Bán thêm';
  return 'Mới';
};

const getQuotationDateValue = (quotation: IQuotation) => quotation.quotationDate || quotation.createdAt;

const getConfirmDateValue = (quotation: IQuotation) =>
  quotation.confirmDate ||
  quotation.saleConfirmedAt ||
  (quotation.status === QuotationStatus.LOCKED ? quotation.lockedAt || quotation.updatedAt : undefined);

const getTimePresetLabel = (timeFilterField: TimeFilterField, timeRangeType: TimeRangeType) => {
  if (timeRangeType === 'all') {
    return timeFilterField === 'confirmDate' ? 'Mọi ngày xác nhận' : 'Mọi ngày báo giá';
  }

  if (timeRangeType === 'custom') {
    return 'Tùy chọn';
  }

  return TIME_PRESETS.find((preset) => preset.value === timeRangeType)?.label || 'Mọi ngày';
};

const getGroupPrefix = (groupMode: GroupMode) => {
  switch (groupMode) {
    case 'status':
      return 'Trạng thái';
    case 'payment':
      return 'Thanh toán';
    case 'salesperson':
      return 'Tư vấn';
    case 'sale_type':
      return 'Loại đơn';
    default:
      return '';
  }
};

const isTimeRangeMatch = (
  dateValue: string | undefined,
  rangeType: TimeRangeType,
  customRange?: DateRange
) => {
  if (rangeType === 'all') return true;
  if (!dateValue) return false;

  const targetDate = new Date(dateValue);
  if (Number.isNaN(targetDate.getTime())) return false;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  switch (rangeType) {
    case 'today':
      return targetDate >= startOfToday && targetDate <= endOfToday;
    case 'yesterday': {
      const yesterday = new Date(startOfToday);
      yesterday.setDate(yesterday.getDate() - 1);
      const endOfYesterday = new Date(yesterday);
      endOfYesterday.setHours(23, 59, 59, 999);
      return targetDate >= yesterday && targetDate <= endOfYesterday;
    }
    case 'thisWeek': {
      const startOfWeek = new Date(startOfToday);
      const dayOfWeek = startOfWeek.getDay() === 0 ? 7 : startOfWeek.getDay();
      startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek + 1);
      return targetDate >= startOfWeek && targetDate <= endOfToday;
    }
    case 'last7Days': {
      const startDate = new Date(startOfToday);
      startDate.setDate(startDate.getDate() - 6);
      return targetDate >= startDate && targetDate <= endOfToday;
    }
    case 'last30Days': {
      const startDate = new Date(startOfToday);
      startDate.setDate(startDate.getDate() - 29);
      return targetDate >= startDate && targetDate <= endOfToday;
    }
    case 'thisMonth': {
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      return targetDate >= startDate && targetDate <= endOfToday;
    }
    case 'lastMonth': {
      const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return targetDate >= startDate && targetDate <= endDate;
    }
    case 'custom': {
      if (!customRange?.startDate || !customRange?.endDate) return true;

      const startDate = new Date(customRange.startDate);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(customRange.endDate);
      endDate.setHours(23, 59, 59, 999);

      return targetDate >= startDate && targetDate <= endDate;
    }
    default:
      return true;
  }
};

const Quotations: React.FC = () => {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState<IQuotation[]>([]);
  const [students, setStudents] = useState<IStudent[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [timeFilterField, setTimeFilterField] = useState<TimeFilterField>('confirmDate');
  const [timeRangeType, setTimeRangeType] = useState<TimeRangeType>('all');
  const [customTimeRange, setCustomTimeRange] = useState<DateRange>({
    startDate: null,
    endDate: null,
    label: 'Tùy chọn'
  });
  const [isCustomRangeOpen, setIsCustomRangeOpen] = useState(false);
  const [dataScope, setDataScope] = useState<DataScope>('all');
  const [groupMode, setGroupMode] = useState<GroupMode>('none');
  const [favoriteMode, setFavoriteMode] = useState<FavoriteMode>('all');
  const [displayView, setDisplayView] = useState<DisplayView>('list');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];

    try {
      const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const loadData = () => {
      setQuotations(getQuotations() || []);
      setStudents((getStudents() || []) as IStudent[]);
    };

    loadData();
    window.addEventListener('educrm:quotations-changed', loadData as EventListener);
    window.addEventListener('storage', loadData);

    return () => {
      window.removeEventListener('educrm:quotations-changed', loadData as EventListener);
      window.removeEventListener('storage', loadData);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteIds));
  }, [favoriteIds]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, timeFilterField, timeRangeType, customTimeRange, dataScope, groupMode, favoriteMode]);

  const studentMap = useMemo(() => new Map(students.map((student) => [student.id, student])), [students]);

  const getStudentName = (quotation: IQuotation) => {
    const linkedStudent = quotation.studentId ? studentMap.get(quotation.studentId) : undefined;
    return normalizeText(linkedStudent?.name || quotation.customerName);
  };

  const getSalespersonName = (quotation: IQuotation) =>
    normalizeText(quotation.salespersonName || SALESPERSON_MAP[quotation.createdBy] || quotation.createdBy);

  const enrichedData = useMemo<EnrichedQuotation[]>(
    () =>
      quotations.map((quotation) => ({
        quotation,
        studentName: getStudentName(quotation),
        salespersonName: getSalespersonName(quotation),
        paymentState: getPaymentStateConfig(quotation),
        displayStatus: getDisplayStatusConfig(quotation.status),
        saleTypeLabel: getSaleTypeLabel(quotation),
        quotationDateValue: getQuotationDateValue(quotation),
        confirmDateValue: getConfirmDateValue(quotation),
        isFavorite: favoriteIds.includes(quotation.id)
      })),
    [favoriteIds, quotations, studentMap]
  );

  const getGroupValue = (item: EnrichedQuotation) => {
    switch (groupMode) {
      case 'status':
        return item.displayStatus.label;
      case 'payment':
        return item.paymentState.label;
      case 'salesperson':
        return item.salespersonName;
      case 'sale_type':
        return item.saleTypeLabel;
      default:
        return '';
    }
  };

  const matchesDataScope = (item: EnrichedQuotation) => {
    switch (dataScope) {
      case 'quotation':
        return item.quotation.status !== QuotationStatus.LOCKED;
      case 'locked':
        return item.quotation.status === QuotationStatus.LOCKED;
      default:
        return true;
    }
  };

  const filteredData = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    const result = enrichedData.filter((item) => {
      const haystack = [
        item.quotation.soCode,
        item.quotation.id,
        normalizeText(item.quotation.customerName),
        normalizeText(item.quotation.product),
        item.studentName,
        item.salespersonName
      ]
        .join(' ')
        .toLowerCase();

      const selectedTimeValue =
        timeFilterField === 'quotationDate' ? item.quotationDateValue : item.confirmDateValue;

      if (keyword && !haystack.includes(keyword)) return false;
      if (!isTimeRangeMatch(selectedTimeValue, timeRangeType, customTimeRange)) return false;
      if (!matchesDataScope(item)) return false;
      if (favoriteMode === 'only' && !item.isFavorite) return false;

      return true;
    });

    result.sort((a, b) => {
      if (favoriteMode === 'first' && a.isFavorite !== b.isFavorite) {
        return a.isFavorite ? -1 : 1;
      }

      if (groupMode !== 'none') {
        const groupCompare = getGroupValue(a).localeCompare(getGroupValue(b), 'vi');
        if (groupCompare !== 0) return groupCompare;
      }

      return new Date(b.quotationDateValue || b.quotation.createdAt).getTime() -
        new Date(a.quotationDateValue || a.quotation.createdAt).getTime();
    });

    return result;
  }, [
    customTimeRange,
    dataScope,
    enrichedData,
    favoriteMode,
    groupMode,
    searchTerm,
    timeFilterField,
    timeRangeType
  ]);

  const pageStart = filteredData.length === 0 ? 0 : 1;
  const pageEnd = filteredData.length;
  const setCurrentPage = (_value: number | ((page: number) => number)) => {};

  const allVisibleSelected =
    filteredData.length > 0 && filteredData.every((item) => selectedIds.includes(item.quotation.id));

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds((current) =>
        current.filter((id) => !filteredData.some((item) => item.quotation.id === id))
      );
      return;
    }

    setSelectedIds((current) => {
      const next = new Set(current);
      filteredData.forEach((item) => next.add(item.quotation.id));
      return Array.from(next);
    });
  };

  const toggleRowSelection = (quotationId: string) => {
    setSelectedIds((current) =>
      current.includes(quotationId)
        ? current.filter((id) => id !== quotationId)
        : [...current, quotationId]
    );
  };

  const toggleFavorite = (quotationId: string) => {
    setFavoriteIds((current) =>
      current.includes(quotationId)
        ? current.filter((id) => id !== quotationId)
        : [...current, quotationId]
    );
  };

  const handleTimeRangeChange = (value: TimeRangeType) => {
    setTimeRangeType(value);
    setIsCustomRangeOpen(value === 'custom');
  };

  const handleCustomRangeChange = (range: DateRange) => {
    setCustomTimeRange({
      startDate: range.startDate,
      endDate: range.endDate,
      label: range.label || 'Tùy chọn'
    });
    setTimeRangeType('custom');
    setIsCustomRangeOpen(false);
  };

  const resetToolbar = () => {
    setSearchTerm('');
    setTimeFilterField('confirmDate');
    setTimeRangeType('all');
    setCustomTimeRange({ startDate: null, endDate: null, label: 'Tùy chọn' });
    setIsCustomRangeOpen(false);
    setDataScope('all');
    setGroupMode('none');
    setFavoriteMode('all');
    setDisplayView('list');
    setSelectedIds([]);
    setCurrentPage(1);
  };

  const groupedRows = useMemo(() => {
    let lastGroup = '';

    return filteredData.flatMap((item) => {
      const groupValue = getGroupValue(item);
      const rows: React.ReactNode[] = [];

      if (groupMode !== 'none' && groupValue !== lastGroup) {
        lastGroup = groupValue;
        rows.push(
          <tr key={`group-${groupMode}-${groupValue}`} className="bg-slate-50/80">
            <td colSpan={11} className="px-3 py-2 text-[11px] font-semibold text-slate-600">
              {getGroupPrefix(groupMode)}: {groupValue || '-'}
            </td>
          </tr>
        );
      }

      const quotationDate = formatDateParts(item.quotationDateValue);
      const confirmDate = formatDateParts(item.confirmDateValue);
      const isSelected = selectedIds.includes(item.quotation.id);

      rows.push(
        <tr
          key={item.quotation.id}
          className="cursor-pointer transition-colors hover:bg-slate-50"
          onClick={() => navigate(`/contracts/quotations/${item.quotation.id}`)}
        >
          <td className="w-9 px-3 py-3" onClick={(event) => event.stopPropagation()}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggleRowSelection(item.quotation.id)}
              className="h-4 w-4 rounded border-slate-300"
            />
          </td>
          <td className="px-3 py-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  toggleFavorite(item.quotation.id);
                }}
                className="text-slate-300 transition-colors hover:text-amber-500"
                title={item.isFavorite ? 'Bỏ yêu thích' : 'Đánh dấu yêu thích'}
              >
                <Star size={15} className={item.isFavorite ? 'fill-amber-400 text-amber-500' : ''} />
              </button>
              <div>
                <div className="truncate text-[12px] font-bold text-blue-600">
                  {normalizeText(item.quotation.soCode)}
                </div>
                <div className="mt-0.5 truncate text-[10px] text-slate-400">
                  {normalizeText(item.quotation.id)}
                </div>
              </div>
            </div>
          </td>
          <td className="px-3 py-3 text-[12px] text-slate-700">
            <div>{quotationDate.date}</div>
            {quotationDate.time ? <div className="mt-0.5 truncate text-[10px] text-slate-400">{quotationDate.time}</div> : null}
          </td>
          <td className="px-3 py-3 text-[12px] text-slate-700">
            <div>{confirmDate.date}</div>
            {confirmDate.time ? <div className="mt-0.5 truncate text-[10px] text-slate-400">{confirmDate.time}</div> : null}
          </td>
          <td className="px-3 py-3">
            <div
              className="max-w-[160px] truncate text-[12px] font-semibold text-slate-900"
              title={normalizeText(item.quotation.customerName)}
            >
              {normalizeText(item.quotation.customerName)}
            </div>
            <div
              className="mt-0.5 max-w-[180px] truncate text-[10px] text-slate-500"
              title={normalizeText(item.quotation.product)}
            >
              {normalizeText(item.quotation.product)}
            </div>
          </td>
          <td className="px-3 py-3">
            <div
              className="max-w-[130px] truncate text-[12px] font-medium text-slate-800"
              title={item.studentName}
            >
              {item.studentName}
            </div>
          </td>
          <td className="px-3 py-3">
            <div
              className="max-w-[120px] truncate text-[12px] text-slate-700"
              title={item.salespersonName}
            >
              {item.salespersonName}
            </div>
          </td>
          <td className="px-3 py-3 whitespace-nowrap text-right text-[12px] font-semibold text-slate-900">
            {formatCurrency(item.quotation.finalAmount)}
          </td>
          <td className="px-3 py-3">
            <span className={`inline-flex rounded-lg px-2.5 py-1 text-[11px] font-semibold ${item.paymentState.className}`}>
              {item.paymentState.label}
            </span>
          </td>
          <td className="px-3 py-3">
            <span className={`inline-flex rounded-lg px-2.5 py-1 text-[11px] font-semibold ${item.displayStatus.className}`}>
              {item.displayStatus.label}
            </span>
          </td>
          <td className="px-3 py-3 text-[12px] text-slate-700">
            <div className="max-w-[84px] truncate" title={item.saleTypeLabel}>
              {item.saleTypeLabel}
            </div>
          </td>
        </tr>
      );

      return rows;
    });
  }, [filteredData, groupMode, navigate, selectedIds]);

  const timePresetOptions = useMemo(
    () =>
      TIME_PRESETS.map((option) => ({
        ...option,
        label: option.value === 'all' ? getTimePresetLabel(timeFilterField, 'all') : option.label
      })),
    [timeFilterField]
  );

  return (
    <div className="flex h-full flex-col bg-[#f6f8fc] text-slate-800">
      <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-5 p-5 lg:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[2.05rem] font-bold text-slate-900">Danh sách Báo giá</h1>
            <p className="mt-2 text-[13px] text-slate-500">
              Quản lý báo giá theo cấu trúc vận hành.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/contracts/quotations/new')}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-[14px] font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <Plus size={18} />
            Tạo báo giá
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[max-content_minmax(0,1fr)] lg:gap-x-4 lg:gap-y-3">
            <div className="flex flex-col gap-3 lg:contents">
              <div className="relative flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={resetToolbar}
                className="inline-flex min-h-[34px] items-center gap-2 rounded-lg bg-emerald-50 px-3.5 text-[12px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
              >
                <RotateCcw size={15} />
                Đặt lại
              </button>

              <GroupedDateFilterSelect
                primaryValue={timeFilterField}
                primaryOptions={TIME_FIELD_OPTIONS}
                onPrimaryChange={(value) => setTimeFilterField(value as TimeFilterField)}
                secondaryValue={timeRangeType}
                secondaryOptions={timePresetOptions}
                onSecondaryChange={(value) => handleTimeRangeChange(value as TimeRangeType)}
              />

              {timeRangeType === 'custom' || isCustomRangeOpen ? (
                <AdvancedDateFilter
                  showPresets={false}
                  hideTrigger
                  open={isCustomRangeOpen}
                  onOpenChange={setIsCustomRangeOpen}
                  align="left"
                  initialRange={customTimeRange}
                  onChange={handleCustomRangeChange}
                  className="absolute left-0 top-full z-50"
                  popoverClassName="left-0 right-auto mt-2"
                />
              ) : null}
              </div>

              <div className="min-w-[320px] flex-1 lg:min-w-0">
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Tìm số báo giá, khách hàng, học viên, tư vấn..."
                    className="h-[34px] w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3.5 text-[12px] outline-none transition-colors focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:col-start-2 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
                <CompactSelect
                  label="Bộ lọc"
                  value={dataScope}
                  options={DATA_SCOPE_OPTIONS}
                  onChange={(value) => setDataScope(value as DataScope)}
                  className="w-[174px] shrink-0"
                />

                <CompactSelect
                  label="Nhóm theo"
                  value={groupMode}
                  options={GROUP_OPTIONS}
                  onChange={(value) => setGroupMode(value as GroupMode)}
                  className="w-[198px] shrink-0"
                />

                <CompactSelect
                  label="Yêu thích"
                  value={favoriteMode}
                  options={FAVORITE_OPTIONS}
                  onChange={(value) => setFavoriteMode(value as FavoriteMode)}
                  className="w-[148px] shrink-0"
                />
              </div>

              <div className="flex items-center gap-1.5 lg:ml-auto">
                <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                  {DISPLAY_VIEW_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    const isActive = displayView === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        disabled={option.disabled}
                        onClick={() => setDisplayView(option.value)}
                        title={option.disabled ? 'Sắp có' : option.label}
                        className={`rounded-md p-1 transition-all ${
                          isActive ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:bg-white hover:text-slate-700'
                        } ${
                          option.disabled ? 'cursor-not-allowed opacity-40 hover:bg-transparent hover:text-slate-400' : ''
                        }`}
                      >
                        <Icon size={15} />
                      </button>
                    );
                  })}
                </div>

                <div className="hidden">
                  <span className="hidden">
                    {selectedIds.length} dòng đã chọn {pageStart}-{pageEnd} / {filteredData.length}
                  </span>

                  <div className="hidden" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] table-fixed border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                  <th className="w-9 px-3 py-2.5 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAllVisible}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                  </th>
                  <th className="w-[122px] px-3 py-2.5 whitespace-nowrap">Số báo giá</th>
                  <th className="w-[102px] px-3 py-2.5 whitespace-nowrap">Ngày báo giá</th>
                  <th className="w-[102px] px-3 py-2.5 whitespace-nowrap">Ngày xác nhận</th>
                  <th className="w-[170px] px-3 py-2.5 whitespace-nowrap">Khách hàng</th>
                  <th className="w-[124px] px-3 py-2.5 whitespace-nowrap">Học viên</th>
                  <th className="w-[116px] px-3 py-2.5 whitespace-nowrap">Tư vấn</th>
                  <th className="w-[126px] px-3 py-2.5 whitespace-nowrap text-right">Tổng tiền</th>
                  <th className="w-[126px] px-3 py-2.5 whitespace-nowrap">Thanh toán</th>
                  <th className="w-[116px] px-3 py-2.5 whitespace-nowrap">Trạng thái</th>
                  <th className="w-[88px] px-3 py-2.5 whitespace-nowrap">Loại đơn</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {groupedRows.length > 0 ? (
                  groupedRows
                ) : (
                  <tr>
                    <td colSpan={11} className="px-4 py-12 text-center text-[13px] italic text-slate-400">
                      Không tìm thấy báo giá phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Quotations;

