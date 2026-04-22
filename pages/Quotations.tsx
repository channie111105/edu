import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  LayoutGrid,
  List,
  Plus,
  RotateCcw,
  Star,
  Trash2
} from 'lucide-react';
import AdvancedDateFilter, { DateRange } from '../components/AdvancedDateFilter';
import { AdvancedFilterDropdown } from '../components/filters';
import PinnedSearchInput from '../components/PinnedSearchInput';
import { IQuotation, IQuotationPaymentScheduleTerm, IStudent, ITransaction, QuotationStatus } from '../types';
import { deleteQuotation, getQuotations, getStudents, getTransactions } from '../utils/storage';

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

const TIME_FIELD_OPTIONS = [{ value: 'createdDate', label: 'Ngày tạo' }] as const;

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

const QUOTATION_TIME_FIELD_OPTIONS = [
  { value: 'createdDate', label: 'Ngày tạo' },
  { value: 'confirmDate', label: 'Ngày confirm' },
  { value: 'expectedDate', label: 'Thời gian dự kiến' },
  { value: 'dueDate', label: 'Thời gian cần đóng' }
] as const;

const QUOTATION_ADVANCED_FIELD_OPTIONS = [
  { id: 'branch', label: 'Cơ sở' },
  { id: 'salesperson', label: 'Sale' },
  { id: 'status', label: 'Trạng thái' },
  { id: 'product', label: 'Sản phẩm' }
] as const;

type DisplayView = (typeof DISPLAY_VIEW_OPTIONS)[number]['value'];
type TimeFilterField = (typeof QUOTATION_TIME_FIELD_OPTIONS)[number]['value'];
type TimeRangeType = (typeof TIME_PRESETS)[number]['value'];
type QuotationAdvancedFieldKey = (typeof QUOTATION_ADVANCED_FIELD_OPTIONS)[number]['id'];
type ActiveToolbarChipKey = 'advancedFilter' | 'groupMode' | 'time';
type ActiveToolbarChip = {
  key: ActiveToolbarChipKey;
  label: string;
};

type SelectOption = {
  value: string;
  label: string;
};

type EnrichedQuotation = {
  quotation: IQuotation;
  branchName: string;
  studentName: string;
  salespersonName: string;
  productName: string;
  paymentState: { label: string; className: string };
  displayStatus: { label: string; className: string };
  saleTypeLabel: string;
  createdDateValue?: string;
  confirmDateValue?: string;
  expectedDateValue?: string;
  dueDateValue?: string;
  isFavorite: boolean;
};

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
    <div className="inline-flex min-h-[32px] max-w-full items-center overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="relative border-r border-slate-200">
        <select
          aria-label="Time filter field"
          value={primaryValue}
          onChange={(event) => onPrimaryChange(event.target.value)}
          className="h-full min-w-[138px] appearance-none bg-transparent py-1 pl-3 pr-8 text-[12px] font-medium text-slate-700 outline-none"
        >
          {primaryOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500"
        />
      </div>

      <div className="relative min-w-0">
        <select
          aria-label="Time filter range"
          value={secondaryValue}
          onChange={(event) => onSecondaryChange(event.target.value)}
          className="h-full min-w-[158px] appearance-none bg-transparent px-3 py-1 pr-8 text-[12px] font-semibold text-slate-800 outline-none"
        >
          {secondaryOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500"
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

const toNumberOrZero = (value: unknown) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const normalizePaymentSchedule = (
  schedule: IQuotationPaymentScheduleTerm[] | undefined
): IQuotationPaymentScheduleTerm[] => {
  if (!Array.isArray(schedule) || schedule.length === 0) return [];

  return schedule.map((item, index) => ({
    ...item,
    id: item.id || `term-${index + 1}`,
    termNo: Number(item.termNo || index + 1),
    installmentLabel: item.installmentLabel || `Lần ${index + 1}`,
    condition: item.condition || '',
    amount: Math.max(0, Math.round(Number(item.amount) || 0)),
    expectedDate: item.expectedDate || '',
    dueDate: item.dueDate || '',
    activatedAt: item.activatedAt || '',
    activatedBy: item.activatedBy || ''
  }));
};

const parseEndOfDay = (value?: string) => {
  const raw = String(value || '').trim();
  if (!raw) return Number.NaN;

  const isoDateMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDateMatch) {
    const [, yearText, monthText, dayText] = isoDateMatch;
    const endOfDay = new Date(Number(yearText), Number(monthText) - 1, Number(dayText), 23, 59, 59, 999);
    return endOfDay.getTime();
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return Number.NaN;
  parsed.setHours(23, 59, 59, 999);
  return parsed.getTime();
};

const hasOverdueExpectedPayment = (quotation: IQuotation, transactions: ITransaction[]) => {
  if (!Array.isArray(quotation.lineItems) || quotation.lineItems.length === 0) return false;

  const approvedTransactions = transactions.filter(
    (transaction) => transaction.quotationId === quotation.id && transaction.status === 'DA_DUYET'
  );
  const paidByInstallment = new Map<string, number>();
  let legacyPaidPool = 0;

  approvedTransactions.forEach((transaction) => {
    const amount = Math.max(0, toNumberOrZero(transaction.amount));
    const installmentKey = String(transaction.installmentTermId || '').trim();

    if (installmentKey) {
      paidByInstallment.set(installmentKey, (paidByInstallment.get(installmentKey) || 0) + amount);
      return;
    }

    legacyPaidPool += amount;
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const rows = quotation.lineItems.flatMap((item) => {
    const schedule = normalizePaymentSchedule(item.paymentSchedule);

    return schedule.map((term) => {
      const mustCollect = Math.max(0, toNumberOrZero(term.amount));
      const directPaidAmount = Math.max(0, paidByInstallment.get(term.id) || 0);
      let paidAmount = Math.min(mustCollect, directPaidAmount);

      if (paidAmount < mustCollect && legacyPaidPool > 0) {
        const legacyApplied = Math.min(mustCollect - paidAmount, legacyPaidPool);
        paidAmount += legacyApplied;
        legacyPaidPool = Math.max(0, legacyPaidPool - legacyApplied);
      }

      return {
        remainingAmount: Math.max(mustCollect - paidAmount, 0),
        dueDate: term.dueDate
      };
    });
  });

  return rows.some((row) => {
    if (row.remainingAmount <= 0) return false;
    const dueTimestamp = parseEndOfDay(row.dueDate);
    return !Number.isNaN(dueTimestamp) && dueTimestamp < today.getTime();
  });
};

const canDeleteQuotation = (quotation: IQuotation) =>
  quotation.status === QuotationStatus.DRAFT || quotation.status === QuotationStatus.SENT;

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

const getCreatedDateValue = (quotation: IQuotation) => quotation.createdAt || quotation.quotationDate;

const getBranchName = (quotation: IQuotation) => normalizeText(quotation.branchName);

const getProductName = (quotation: IQuotation) => normalizeText(quotation.product);

const getConfirmDateValue = (quotation: IQuotation) => quotation.confirmDate || quotation.saleConfirmedAt || '';

const getScheduleDateValue = (
  quotation: IQuotation,
  field: keyof Pick<IQuotationPaymentScheduleTerm, 'expectedDate' | 'dueDate'>
) => {
  const matchedValue = (quotation.lineItems || [])
    .flatMap((item) => normalizePaymentSchedule(item.paymentSchedule))
    .map((term) => String(term[field] || '').trim())
    .filter(Boolean)
    .map((value) => ({ value, timestamp: new Date(value).getTime() }))
    .filter((item) => !Number.isNaN(item.timestamp))
    .sort((left, right) => left.timestamp - right.timestamp)[0];

  return matchedValue?.value || '';
};

const getTimePresetLabel = (_timeFilterField: TimeFilterField, timeRangeType: TimeRangeType) => {
  if (timeRangeType === 'all') {
    return 'Mọi ngày';
  }

  if (timeRangeType === 'custom') {
    return 'Tùy chọn';
  }

  return TIME_PRESETS.find((preset) => preset.value === timeRangeType)?.label || 'Mọi ngày';
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
  const [transactions, setTransactions] = useState<ITransaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [timeFilterField, setTimeFilterField] = useState<TimeFilterField>('createdDate');
  const [timeRangeType, setTimeRangeType] = useState<TimeRangeType>('all');
  const [customTimeRange, setCustomTimeRange] = useState<DateRange>({
    startDate: null,
    endDate: null,
    label: 'Tùy chọn'
  });
  const [isCustomRangeOpen, setIsCustomRangeOpen] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [selectedAdvancedFilterFields, setSelectedAdvancedFilterFields] = useState<QuotationAdvancedFieldKey[]>([]);
  const [selectedAdvancedFilterValue, setSelectedAdvancedFilterValue] = useState('');
  const [selectedAdvancedGroupFields, setSelectedAdvancedGroupFields] = useState<QuotationAdvancedFieldKey[]>([]);
  const [displayView, setDisplayView] = useState<DisplayView>('list');
  const [selectedIds] = useState<string[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];

    try {
      const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const filterDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const loadData = () => {
      setQuotations(getQuotations() || []);
      setStudents((getStudents() || []) as IStudent[]);
      setTransactions(getTransactions() || []);
    };

    loadData();
    window.addEventListener('educrm:quotations-changed', loadData as EventListener);
    window.addEventListener('educrm:transactions-changed', loadData as EventListener);
    window.addEventListener('storage', loadData);

    return () => {
      window.removeEventListener('educrm:quotations-changed', loadData as EventListener);
      window.removeEventListener('educrm:transactions-changed', loadData as EventListener);
      window.removeEventListener('storage', loadData);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteIds));
  }, [favoriteIds]);

  useEffect(() => {
    if (!showFilterDropdown) return undefined;

    const handleClickOutside = (event: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setShowFilterDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilterDropdown]);

  const studentMap = useMemo(() => new Map(students.map((student) => [student.id, student])), [students]);

  const getStudentName = (quotation: IQuotation) => {
    const linkedStudentId = quotation.studentIds?.[0] || quotation.studentId;
    const linkedStudent = linkedStudentId ? studentMap.get(linkedStudentId) : undefined;
    const lineItemStudent = quotation.lineItems?.find((item) => item.studentName)?.studentName;
    return normalizeText(linkedStudent?.name || lineItemStudent || quotation.customerName);
  };

  const getSalespersonName = (quotation: IQuotation) =>
    normalizeText(quotation.salespersonName || SALESPERSON_MAP[quotation.createdBy] || quotation.createdBy);

  const enrichedData = useMemo<EnrichedQuotation[]>(
    () =>
      quotations.map((quotation) => {
        return {
          quotation,
          branchName: getBranchName(quotation),
          studentName: getStudentName(quotation),
          salespersonName: getSalespersonName(quotation),
          productName: getProductName(quotation),
          paymentState: getPaymentStateConfig(quotation),
          displayStatus: getDisplayStatusConfig(quotation.status),
          saleTypeLabel: getSaleTypeLabel(quotation),
          createdDateValue: getCreatedDateValue(quotation),
          confirmDateValue: getConfirmDateValue(quotation),
          expectedDateValue: getScheduleDateValue(quotation, 'expectedDate'),
          dueDateValue: getScheduleDateValue(quotation, 'dueDate'),
          isFavorite: favoriteIds.includes(quotation.id)
        };
      }),
    [favoriteIds, quotations, studentMap]
  );

  const selectedAdvancedFilterOptions = useMemo(
    () =>
      selectedAdvancedFilterFields
        .map((fieldId) => QUOTATION_ADVANCED_FIELD_OPTIONS.find((option) => option.id === fieldId))
        .filter((option): option is (typeof QUOTATION_ADVANCED_FIELD_OPTIONS)[number] => Boolean(option)),
    [selectedAdvancedFilterFields]
  );
  const activeAdvancedFilterField = selectedAdvancedFilterOptions[0] || null;
  const selectedAdvancedGroupOptions = useMemo(
    () =>
      selectedAdvancedGroupFields
        .map((fieldId) => QUOTATION_ADVANCED_FIELD_OPTIONS.find((option) => option.id === fieldId))
        .filter((option): option is (typeof QUOTATION_ADVANCED_FIELD_OPTIONS)[number] => Boolean(option)),
    [selectedAdvancedGroupFields]
  );

  const toggleAdvancedFieldSelection = (type: 'filter' | 'group', fieldId: QuotationAdvancedFieldKey) => {
    if (type === 'filter') {
      setSelectedAdvancedFilterValue('');
      setSelectedAdvancedFilterFields((prev) => (prev.includes(fieldId) ? [] : [fieldId]));
      return;
    }

    setSelectedAdvancedGroupFields((prev) => (
      prev.includes(fieldId)
        ? prev.filter((item) => item !== fieldId)
        : [...prev, fieldId]
    ));
  };

  const getAdvancedFieldValue = (item: EnrichedQuotation, fieldId: QuotationAdvancedFieldKey) => {
    switch (fieldId) {
      case 'branch':
        return item.branchName;
      case 'salesperson':
        return item.salespersonName;
      case 'status':
        return item.displayStatus.label;
      case 'product':
        return item.productName;
      default:
        return '';
    }
  };

  const formatAdvancedFieldValue = (fieldId: QuotationAdvancedFieldKey, value: string) => {
    if (fieldId === 'branch' && value === '-') {
      return 'Chưa có cơ sở';
    }

    return value || '-';
  };

  const getGroupValue = (item: EnrichedQuotation) =>
    selectedAdvancedGroupFields.map((fieldId) => getAdvancedFieldValue(item, fieldId)).join('||');

  const getGroupLabel = (item: EnrichedQuotation) =>
    selectedAdvancedGroupFields
      .map((fieldId, index) => (
        `${selectedAdvancedGroupOptions[index]?.label || fieldId}: ${formatAdvancedFieldValue(fieldId, getAdvancedFieldValue(item, fieldId))}`
      ))
      .join(' • ');

  const getTimeFieldValue = (item: EnrichedQuotation) => {
    switch (timeFilterField) {
      case 'confirmDate':
        return item.confirmDateValue;
      case 'expectedDate':
        return item.expectedDateValue;
      case 'dueDate':
        return item.dueDateValue;
      case 'createdDate':
      default:
        return item.createdDateValue;
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
        item.salespersonName,
        item.branchName,
        item.displayStatus.label
      ]
        .join(' ')
        .toLowerCase();

      const selectedTimeValue = getTimeFieldValue(item);
      const matchesAdvancedFilter =
        !activeAdvancedFilterField ||
        !selectedAdvancedFilterValue ||
        getAdvancedFieldValue(item, activeAdvancedFilterField.id as QuotationAdvancedFieldKey) === selectedAdvancedFilterValue;

      if (keyword && !haystack.includes(keyword)) return false;
      if (!isTimeRangeMatch(selectedTimeValue, timeRangeType, customTimeRange)) return false;
      if (!matchesAdvancedFilter) return false;

      return true;
    });

    result.sort((a, b) => {
      if (selectedAdvancedGroupFields.length > 0) {
        const groupCompare = getGroupLabel(a).localeCompare(getGroupLabel(b), 'vi');
        if (groupCompare !== 0) return groupCompare;
      }

      return new Date(b.createdDateValue || b.quotation.createdAt).getTime() -
        new Date(a.createdDateValue || a.quotation.createdAt).getTime();
    });

    return result;
  }, [
    activeAdvancedFilterField,
    customTimeRange,
    enrichedData,
    searchTerm,
    selectedAdvancedFilterValue,
    selectedAdvancedGroupFields,
    selectedAdvancedGroupOptions,
    timeFilterField,
    timeRangeType
  ]);

  const pageStart = filteredData.length === 0 ? 0 : 1;
  const pageEnd = filteredData.length;
  const advancedFilterSelectableValues = useMemo(
    () => {
      if (!activeAdvancedFilterField) return [];

      return Array.from(
        new Set(
          enrichedData.map((item) =>
            getAdvancedFieldValue(item, activeAdvancedFilterField.id as QuotationAdvancedFieldKey)
          )
        )
      )
        .sort((left, right) => left.localeCompare(right, 'vi'))
        .map((value) => ({
          value,
          label: formatAdvancedFieldValue(activeAdvancedFilterField.id as QuotationAdvancedFieldKey, value)
        }));
    },
    [activeAdvancedFilterField, enrichedData]
  );
  const advancedToolbarActiveCount =
    selectedAdvancedGroupFields.length +
    (selectedAdvancedFilterValue ? 1 : 0);
  const hasAdvancedToolbarFilters =
    selectedAdvancedGroupFields.length > 0 ||
    Boolean(selectedAdvancedFilterValue);

  const toggleFavorite = (quotationId: string) => {
    setFavoriteIds((current) =>
      current.includes(quotationId)
        ? current.filter((id) => id !== quotationId)
        : [...current, quotationId]
    );
  };

  const handleDeleteQuotation = (quotation: IQuotation) => {
    if (!canDeleteQuotation(quotation)) {
      window.alert('Chỉ xóa báo giá khi chưa confirm.');
      return;
    }

    const confirmed = window.confirm(`Xóa báo giá ${normalizeText(quotation.soCode)}?`);
    if (!confirmed) return;

    const result = deleteQuotation(quotation.id);
    if (!result.ok) {
      window.alert(result.error || 'Không thể xóa báo giá.');
      return;
    }

    setFavoriteIds((current) => current.filter((id) => id !== quotation.id));
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
    setTimeFilterField('createdDate');
    setTimeRangeType('all');
    setCustomTimeRange({ startDate: null, endDate: null, label: 'Tùy chọn' });
    setIsCustomRangeOpen(false);
    setSelectedAdvancedFilterFields([]);
    setSelectedAdvancedFilterValue('');
    setSelectedAdvancedGroupFields([]);
    setShowFilterDropdown(false);
    setDisplayView('list');
  };

  const removeToolbarChip = (key: ActiveToolbarChipKey) => {
    switch (key) {
      case 'advancedFilter':
        setSelectedAdvancedFilterFields([]);
        setSelectedAdvancedFilterValue('');
        break;
      case 'groupMode':
        setSelectedAdvancedGroupFields([]);
        break;
      case 'time':
        setTimeFilterField('createdDate');
        setTimeRangeType('all');
        setCustomTimeRange({ startDate: null, endDate: null, label: 'Tùy chọn' });
        setIsCustomRangeOpen(false);
        break;
      default:
        break;
    }
  };

  const handleRemoveToolbarChip = (chipKey: string) => {
    removeToolbarChip(chipKey as ActiveToolbarChipKey);
  };

  const groupedRows = useMemo(() => {
    let lastGroup = '';
    let rowNumber = 0;

    return filteredData.flatMap((item) => {
      const groupValue = getGroupValue(item);
      const groupLabel = getGroupLabel(item);
      const rows: React.ReactNode[] = [];

      if (selectedAdvancedGroupFields.length > 0 && groupValue !== lastGroup) {
        lastGroup = groupValue;
        rows.push(
          <tr key={`group-${groupValue}`} className="bg-slate-50/80">
            <td colSpan={11} className="px-3 py-2 text-[11px] font-semibold text-slate-600">
              {groupLabel || '-'}
            </td>
          </tr>
        );
      }

      const createdDate = formatDateParts(item.createdDateValue);
      const currentRowNumber = ++rowNumber;
      const isDeletable = canDeleteQuotation(item.quotation);

      rows.push(
        <tr
          key={item.quotation.id}
          className="cursor-pointer transition-colors hover:bg-slate-50"
          onClick={() => navigate(`/contracts/quotations/${item.quotation.id}`)}
        >
          <td className="w-[38px] px-1.5 py-3 text-center text-[12px] font-semibold text-slate-500">{currentRowNumber}</td>
          <td className="px-2.5 py-3">
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
              </div>
            </div>
          </td>
          <td className="px-3 py-3 text-[12px] text-slate-700">
            <div>{createdDate.date}</div>
            {createdDate.time ? <div className="mt-0.5 truncate text-[10px] text-slate-400">{createdDate.time}</div> : null}
          </td>
          <td className="px-2.5 py-3">
            <div
              className="max-w-[142px] truncate text-[12px] font-semibold text-slate-900"
              title={normalizeText(item.quotation.customerName)}
            >
              {normalizeText(item.quotation.customerName)}
            </div>
            <div
              className="mt-0.5 max-w-[152px] truncate text-[10px] text-slate-500"
              title={normalizeText(item.quotation.product)}
            >
              {normalizeText(item.quotation.product)}
            </div>
          </td>
          <td className="px-2.5 py-3">
            <div
              className="max-w-[110px] truncate text-[12px] font-medium text-slate-800"
              title={item.studentName}
            >
              {item.studentName}
            </div>
          </td>
          <td className="px-2.5 py-3">
            <div
              className="max-w-[98px] truncate text-[12px] text-slate-700"
              title={item.salespersonName}
            >
              {item.salespersonName}
            </div>
          </td>
          <td className="px-2.5 py-3 whitespace-nowrap text-right text-[12px] font-semibold text-slate-900">
            {formatCurrency(item.quotation.finalAmount)}
          </td>
          <td className="px-2.5 py-3">
            <span className={`inline-flex rounded-lg px-2 py-1 text-[10px] font-semibold ${item.paymentState.className}`}>
              {item.paymentState.label}
            </span>
          </td>
          <td className="px-2.5 py-3">
            <span className={`inline-flex rounded-lg px-2 py-1 text-[10px] font-semibold ${item.displayStatus.className}`}>
              {item.displayStatus.label}
            </span>
          </td>
          <td className="px-2.5 py-3 text-[12px] text-slate-700">
            <div className="max-w-[72px] truncate" title={item.saleTypeLabel}>
              {item.saleTypeLabel}
            </div>
          </td>
          <td className="w-[56px] px-2 py-3 text-right" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              onClick={() => handleDeleteQuotation(item.quotation)}
              disabled={!isDeletable}
              title={isDeletable ? 'Xóa báo giá' : 'Chỉ xóa khi báo giá chưa confirm'}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-rose-200 text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300 disabled:hover:bg-transparent"
            >
              <Trash2 size={14} />
            </button>
          </td>
        </tr>
      );

      return rows;
    });
  }, [filteredData, navigate, selectedAdvancedGroupFields, selectedAdvancedGroupOptions]);

  const timePresetOptions = useMemo(
    () =>
      TIME_PRESETS.map((option) => ({
        ...option,
        label: option.value === 'all' ? getTimePresetLabel(timeFilterField, 'all') : option.label
      })),
    [timeFilterField]
  );

  const activeToolbarChips = useMemo<ActiveToolbarChip[]>(() => {
    const chips: ActiveToolbarChip[] = [];

    if (activeAdvancedFilterField && selectedAdvancedFilterValue) {
      chips.push({
        key: 'advancedFilter',
        label: `${activeAdvancedFilterField.label}: ${formatAdvancedFieldValue(activeAdvancedFilterField.id as QuotationAdvancedFieldKey, selectedAdvancedFilterValue)}`
      });
    }

    if (selectedAdvancedGroupFields.length > 0) {
      chips.push({
        key: 'groupMode',
        label: `Nhóm theo: ${selectedAdvancedGroupOptions.map((option) => option.label).join(', ')}`
      });
    }

    if (timeRangeType !== 'all') {
      const timeFieldLabel =
        QUOTATION_TIME_FIELD_OPTIONS.find((option) => option.value === timeFilterField)?.label || timeFilterField;
      const timeRangeLabel =
        timeRangeType === 'custom'
          ? customTimeRange.label || 'Tùy chọn'
          : getTimePresetLabel(timeFilterField, timeRangeType);

      chips.push({
        key: 'time',
        label: `${timeFieldLabel}: ${timeRangeLabel}`
      });
    }

    return chips;
  }, [
    activeAdvancedFilterField,
    customTimeRange.label,
    selectedAdvancedFilterValue,
    selectedAdvancedGroupFields.length,
    selectedAdvancedGroupOptions,
    timeFilterField,
    timeRangeType
  ]);

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
                primaryOptions={QUOTATION_TIME_FIELD_OPTIONS}
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
                <PinnedSearchInput
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Tim ma bao gia, khach hang, hoc vien, tu van..."
                  chips={activeToolbarChips}
                  onRemoveChip={handleRemoveToolbarChip}
                  onClearAll={resetToolbar}
                  clearAllAriaLabel="Xoa tat ca bo loc bao gia"
                  inputClassName="text-[12px] h-7 min-w-[210px]"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:col-start-2 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
                <div ref={filterDropdownRef} className="shrink-0">
                  <AdvancedFilterDropdown
                    isOpen={showFilterDropdown}
                    activeCount={advancedToolbarActiveCount}
                    hasActiveFilters={hasAdvancedToolbarFilters}
                    filterOptions={QUOTATION_ADVANCED_FIELD_OPTIONS}
                    groupOptions={QUOTATION_ADVANCED_FIELD_OPTIONS}
                    selectedFilterFieldIds={selectedAdvancedFilterFields}
                    selectedGroupFieldIds={selectedAdvancedGroupFields}
                    activeFilterField={activeAdvancedFilterField}
                    selectableValues={advancedFilterSelectableValues}
                    selectedFilterValue={selectedAdvancedFilterValue}
                    onOpenChange={setShowFilterDropdown}
                    onToggleFilterField={(fieldId) => toggleAdvancedFieldSelection('filter', fieldId as QuotationAdvancedFieldKey)}
                    onToggleGroupField={(fieldId) => toggleAdvancedFieldSelection('group', fieldId as QuotationAdvancedFieldKey)}
                    onFilterValueChange={setSelectedAdvancedFilterValue}
                    onClearAll={() => {
                      setSelectedAdvancedFilterFields([]);
                      setSelectedAdvancedFilterValue('');
                      setSelectedAdvancedGroupFields([]);
                    }}
                    triggerLabel="Bộ lọc nâng cao"
                    filterDescription="Chọn 1 trường rồi chọn giá trị tương ứng để lọc nhanh danh sách báo giá."
                    groupDescription="Có thể chọn nhiều trường. Thứ tự bấm sẽ là thứ tự ghép nhóm hiển thị trong bảng."
                    triggerClassName="min-h-[34px] rounded-lg px-3 py-1.5 text-[12px] shadow-sm"
                    panelAlign="left"
                    className="relative"
                  />
                </div>
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
            <table className="w-full min-w-[1020px] table-fixed border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                  <th className="w-[38px] px-1.5 py-2.5 whitespace-nowrap text-center">STT</th>
                  <th className="w-[112px] px-2.5 py-2.5 whitespace-nowrap">Mã báo giá</th>
                  <th className="w-[92px] px-2.5 py-2.5 whitespace-nowrap">Ngày tạo</th>
                  <th className="w-[152px] px-2.5 py-2.5 whitespace-nowrap">Khách hàng</th>
                  <th className="w-[108px] px-2.5 py-2.5 whitespace-nowrap">Học viên</th>
                  <th className="w-[104px] px-2.5 py-2.5 whitespace-nowrap">Tư vấn</th>
                  <th className="w-[112px] px-2.5 py-2.5 whitespace-nowrap text-right">Tổng tiền</th>
                  <th className="w-[108px] px-2.5 py-2.5 whitespace-nowrap">Thanh toán</th>
                  <th className="w-[96px] px-2.5 py-2.5 whitespace-nowrap">Trạng thái</th>
                  <th className="w-[78px] px-2.5 py-2.5 whitespace-nowrap">Loại đơn</th>
                  <th className="w-[56px] px-2.5 py-2.5 whitespace-nowrap text-right">Xóa</th>
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
