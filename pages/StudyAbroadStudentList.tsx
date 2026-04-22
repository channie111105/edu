import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GraduationCap, RotateCcw, Search, Settings2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  getStudyAbroadCaseList,
  StudyAbroadCaseCompleteness,
  StudyAbroadCaseRecord,
  StudyAbroadCmtcStatus,
  StudyAbroadInvoiceStatus,
  StudyAbroadServiceStatus
} from '../services/studyAbroadCases.local';
import { AdvancedFilterDropdown, ToolbarTimeFilter } from '../components/filters';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import { decodeMojibakeReactNode } from '../utils/mojibake';
import { CustomDateRange, ToolbarOption, ToolbarValueOption, doesDateMatchTimeRange } from '../utils/filterToolbar';

type ColumnId =
  | 'student'
  | 'address'
  | 'phone'
  | 'country'
  | 'program'
  | 'major'
  | 'salesperson'
  | 'branch'
  | 'intake'
  | 'stage'
  | 'caseCompleteness'
  | 'certificate'
  | 'serviceStatus'
  | 'tuition'
  | 'invoiceStatus'
  | 'cmtc'
  | 'expectedFlightTerm';

type StudyAbroadAdvancedFieldKey =
  | 'country'
  | 'branch'
  | 'salesperson'
  | 'program'
  | 'status'
  | 'progress'
  | 'processor';
type StudyAbroadAdvancedGroupFieldKey = StudyAbroadAdvancedFieldKey;
type StudyAbroadTimeField =
  | 'createdAt'
  | 'intakeDate'
  | 'flightDate'
  | 'schoolInterviewDate'
  | 'embassyAppointmentDate';
type StudyAbroadTimeFieldSelection = 'action' | StudyAbroadTimeField;

interface ColumnConfig {
  id: ColumnId;
  label: string;
}

const COLUMN_CONFIGS: ColumnConfig[] = [
  { id: 'student', label: 'Học viên' },
  { id: 'address', label: 'Địa chỉ' },
  { id: 'phone', label: 'SĐT' },
  { id: 'country', label: 'Quốc gia' },
  { id: 'program', label: 'Chương trình' },
  { id: 'major', label: 'Ngành' },
  { id: 'salesperson', label: 'Sale' },
  { id: 'branch', label: 'Cơ sở' },
  { id: 'intake', label: 'Kỳ nhập học' },
  { id: 'stage', label: 'Tiến độ' },
  { id: 'caseCompleteness', label: 'Trạng thái hồ sơ' },
  { id: 'certificate', label: 'Chứng chỉ' },
  { id: 'serviceStatus', label: 'Trạng thái dịch vụ' },
  { id: 'tuition', label: 'Học phí' },
  { id: 'invoiceStatus', label: 'Trạng thái invoice' },
  { id: 'cmtc', label: 'CMTC' },
  { id: 'expectedFlightTerm', label: 'Kỳ bay dự kiến' }
];

const WATCHED_STORAGE_KEYS = new Set([
  'educrm_quotations',
  'educrm_leads_v2',
  'educrm_students',
  'educrm_admissions',
  'educrm_transactions',
  'educrm_invoices'
]);

const ALL_COLUMNS_VISIBLE = COLUMN_CONFIGS.reduce((acc, column) => {
  acc[column.id] = true;
  return acc;
}, {} as Record<ColumnId, boolean>);

const DEFAULT_VISIBLE_COLUMN_IDS: ColumnId[] = [
  'student',
  'phone',
  'country',
  'program',
  'salesperson',
  'stage',
  'serviceStatus',
  'invoiceStatus'
];

const DEFAULT_COLUMNS_VISIBLE = COLUMN_CONFIGS.reduce((acc, column) => {
  acc[column.id] = DEFAULT_VISIBLE_COLUMN_IDS.includes(column.id);
  return acc;
}, {} as Record<ColumnId, boolean>);

const STUDY_ABROAD_TOOLBAR_FILTER_OPTIONS = [
  { id: 'country', label: 'Quốc gia' },
  { id: 'branch', label: 'Cơ sở' },
  { id: 'salesperson', label: 'Sale' },
  { id: 'program', label: 'Chương trình' },
  { id: 'status', label: 'Trạng thái' },
  { id: 'progress', label: 'Tiến độ' },
  { id: 'processor', label: 'Người xử lý hồ sơ' }
] as const satisfies ReadonlyArray<ToolbarOption>;

const STUDY_ABROAD_TOOLBAR_GROUP_OPTIONS = [
  { id: 'country', label: 'Quốc gia' },
  { id: 'branch', label: 'Cơ sở' },
  { id: 'salesperson', label: 'Sale' },
  { id: 'program', label: 'Chương trình' },
  { id: 'status', label: 'Trạng thái' },
  { id: 'progress', label: 'Tiến độ' },
  { id: 'processor', label: 'Người xử lý hồ sơ' }
] as const satisfies ReadonlyArray<ToolbarOption>;

const STUDY_ABROAD_TOOLBAR_TIME_FIELD_OPTIONS = [
  { id: 'createdAt', label: 'Ngày tạo' },
  { id: 'intakeDate', label: 'Kỳ nhập học' },
  { id: 'flightDate', label: 'Ngày bay' },
  { id: 'schoolInterviewDate', label: 'Ngày phỏng vấn trường' },
  { id: 'embassyAppointmentDate', label: 'Ngày hẹn ĐSQ' }
] as const satisfies ReadonlyArray<ToolbarOption>;

const STUDY_ABROAD_TIME_PRESETS = [
  { id: 'all', label: 'Tất cả thời gian' },
  { id: 'today', label: 'Hôm nay' },
  { id: 'yesterday', label: 'Hôm qua' },
  { id: 'thisWeek', label: 'Tuần này' },
  { id: 'last7Days', label: '7 ngày qua' },
  { id: 'last30Days', label: '30 ngày qua' },
  { id: 'thisMonth', label: 'Tháng này' },
  { id: 'lastMonth', label: 'Tháng trước' },
  { id: 'custom', label: 'Tùy chỉnh khoảng...' }
] as const satisfies ReadonlyArray<ToolbarOption>;

const STUDY_ABROAD_TOOLBAR_TIME_PLACEHOLDER = 'action';
const DEFAULT_STUDY_ABROAD_TIME_FIELD: StudyAbroadTimeField = 'createdAt';
const STUDY_ABROAD_SERVICE_STATUS_ORDER: StudyAbroadServiceStatus[] = [
  'NEW',
  'UNPROCESSED',
  'PROCESSED',
  'REPROCESSING',
  'DEPARTED',
  'WITHDRAWN',
  'VISA_FAILED'
];
const STUDY_ABROAD_PROGRESS_ORDER = [
  'HỒ SƠ MỚI',
  'Đang xử lý hồ sơ',
  'Chờ khóa SO',
  'Đã ký hợp đồng',
  'Chờ ghi danh',
  'Đã ghi danh',
  'Từ chối ghi danh',
  'Đang học',
  'ĐÃ CHỌN CHƯƠNG TRÌNH',
  'ĐÃ PHỎNG VẤN TRƯỜNG/DN',
  'ĐÃ CÓ THƯ MỜI',
  'ĐÃ CÓ LỊCH HẸN DSQ',
  'CÓ VISA',
  'ĐÃ BAY'
] as const;

const formatCurrency = (value: number) =>
  `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Math.max(0, value || 0))} đ`;

const normalizeForSearch = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const normalizeMonthYearToIso = (value?: string) => {
  if (!value) return '';
  const trimmedValue = value.trim();
  if (!trimmedValue) return '';

  const parsedDate = new Date(trimmedValue);
  if (!Number.isNaN(parsedDate.getTime())) {
    return trimmedValue;
  }

  const monthYearMatch = trimmedValue.match(/^(\d{1,2})\/(\d{4})$/);
  if (!monthYearMatch) return '';

  const [, month, year] = monthYearMatch;
  return `${year}-${month.padStart(2, '0')}-01`;
};

const getCaseCompletenessMeta = (status: StudyAbroadCaseCompleteness) => {
  if (status === 'FULL') return { label: 'Đủ hồ sơ', className: 'bg-emerald-50 text-emerald-700 border-emerald-100' };
  return { label: 'Chưa đủ', className: 'bg-amber-50 text-amber-700 border-amber-100' };
};

const getServiceStatusMeta = (status: StudyAbroadServiceStatus) => {
  if (status === 'NEW') return { label: 'Mới', className: 'bg-slate-100 text-slate-700 border-slate-200' };
  if (status === 'UNPROCESSED') return { label: 'Chưa xử lý', className: 'bg-slate-100 text-slate-700 border-slate-200' };
  if (status === 'PROCESSED') return { label: 'Đã xử lý', className: 'bg-blue-50 text-blue-700 border-blue-100' };
  if (status === 'DEPARTED') return { label: 'Đã bay', className: 'bg-emerald-50 text-emerald-700 border-emerald-100' };
  if (status === 'WITHDRAWN') return { label: 'Đã rút hồ sơ', className: 'bg-rose-50 text-rose-700 border-rose-100' };
  if (status === 'VISA_FAILED') return { label: 'Trượt visa', className: 'bg-rose-50 text-rose-700 border-rose-100' };
  return { label: 'Đang xử lý lại', className: 'bg-amber-50 text-amber-700 border-amber-100' };
};

const getInvoiceStatusMeta = (status: StudyAbroadInvoiceStatus) => {
  if (status === 'PAID') return { label: 'Đã nộp', className: 'bg-emerald-50 text-emerald-700 border-emerald-100' };
  if (status === 'HAS_INVOICE') return { label: 'Có invoice', className: 'bg-blue-50 text-blue-700 border-blue-100' };
  return { label: 'Chưa nộp', className: 'bg-slate-100 text-slate-700 border-slate-200' };
};

const getCmtcMeta = (status: StudyAbroadCmtcStatus) => {
  if (status === 'SUBMITTED') return { label: 'Đã nộp', className: 'bg-emerald-50 text-emerald-700 border-emerald-100' };
  if (status === 'OPENED') return { label: 'Đã mở tài khoản', className: 'bg-blue-50 text-blue-700 border-blue-100' };
  return { label: 'Chưa mở tài khoản', className: 'bg-slate-100 text-slate-700 border-slate-200' };
};

const TableBadge: React.FC<{ label: string; className: string }> = ({ label, className }) => (
  <span className={`inline-flex max-w-full items-center rounded-full border px-2 py-1 text-[10px] font-bold ${className}`}>
    <span className="truncate">{label}</span>
  </span>
);

const StudyAbroadStudentList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const columnMenuRef = useRef<HTMLDivElement | null>(null);
  const refreshTimerRef = useRef<number | null>(null);

  const [rows, setRows] = useState<StudyAbroadCaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnId, boolean>>(DEFAULT_COLUMNS_VISIBLE);
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timeFilterField, setTimeFilterField] = useState<StudyAbroadTimeFieldSelection>(STUDY_ABROAD_TOOLBAR_TIME_PLACEHOLDER);
  const [timeRangeType, setTimeRangeType] = useState<(typeof STUDY_ABROAD_TIME_PRESETS)[number]['id']>('all');
  const [customRange, setCustomRange] = useState<CustomDateRange | null>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [selectedAdvancedFilterFields, setSelectedAdvancedFilterFields] = useState<StudyAbroadAdvancedFieldKey[]>([]);
  const [selectedAdvancedFilterValues, setSelectedAdvancedFilterValues] = useState<Partial<Record<StudyAbroadAdvancedFieldKey, string>>>({});
  const [selectedAdvancedGroupFields, setSelectedAdvancedGroupFields] = useState<StudyAbroadAdvancedGroupFieldKey[]>([]);

  const reloadCases = useCallback(() => {
    if (refreshTimerRef.current) {
      window.clearTimeout(refreshTimerRef.current);
    }

    setLoading(true);
    refreshTimerRef.current = window.setTimeout(() => {
      setRows(getStudyAbroadCaseList());
      setLoading(false);
    }, 120);
  }, []);

  useEffect(() => {
    reloadCases();
    return () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
      }
    };
  }, [reloadCases]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!columnMenuRef.current) return;
      if (columnMenuRef.current.contains(event.target as Node)) return;
      setShowColumnMenu(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (!event.key || WATCHED_STORAGE_KEYS.has(event.key)) {
        reloadCases();
      }
    };
    const handleClientRefresh = () => reloadCases();

    const watchEvents = [
      'educrm_cases_updated',
      'educrm:study-abroad-cases-changed',
      'educrm:quotations-changed',
      'educrm:leads-changed',
      'educrm:students-changed',
      'educrm:admissions-changed'
    ];

    window.addEventListener('storage', handleStorage);
    watchEvents.forEach((eventName) => window.addEventListener(eventName, handleClientRefresh));

    return () => {
      window.removeEventListener('storage', handleStorage);
      watchEvents.forEach((eventName) => window.removeEventListener(eventName, handleClientRefresh));
    };
  }, [reloadCases]);

  const canViewAllCases = user?.role === UserRole.ADMIN || user?.role === UserRole.FOUNDER;

  const scopedRows = useMemo(() => {
    if (!user || canViewAllCases) return rows;
    const currentUserName = normalizeForSearch(user.name);
    return rows.filter((row) => normalizeForSearch(row.salesperson) === currentUserName);
  }, [canViewAllCases, rows, user]);

  const selectedAdvancedFilterOptions = useMemo(
    () =>
      selectedAdvancedFilterFields
        .map((fieldId) => STUDY_ABROAD_TOOLBAR_FILTER_OPTIONS.find((option) => option.id === fieldId))
        .filter((option): option is (typeof STUDY_ABROAD_TOOLBAR_FILTER_OPTIONS)[number] => Boolean(option)),
    [selectedAdvancedFilterFields]
  );
  const activeAdvancedFilterField = selectedAdvancedFilterOptions[0] || null;
  const selectedAdvancedFilterEntries = Object.entries(selectedAdvancedFilterValues).filter(
    (entry): entry is [StudyAbroadAdvancedFieldKey, string] => Boolean(entry[1])
  );
  const resolvedTimeFilterField =
    timeFilterField === STUDY_ABROAD_TOOLBAR_TIME_PLACEHOLDER ? DEFAULT_STUDY_ABROAD_TIME_FIELD : timeFilterField;

  const getRowTimeFieldValue = (
    row: StudyAbroadCaseRecord,
    fieldId: StudyAbroadTimeField = resolvedTimeFilterField
  ) => {
    switch (fieldId) {
      case 'createdAt':
        return normalizeMonthYearToIso(row.createdAt);
      case 'intakeDate':
        return normalizeMonthYearToIso(row.intakeDate || row.intake);
      case 'flightDate':
        return normalizeMonthYearToIso(row.expectedEntryDate || row.expectedFlightTerm);
      case 'schoolInterviewDate':
        return normalizeMonthYearToIso(row.schoolInterviewDate);
      case 'embassyAppointmentDate':
        return normalizeMonthYearToIso(row.embassyAppointmentDate);
      default:
        return '';
    }
  };

  const getAdvancedFieldValues = (
    row: StudyAbroadCaseRecord,
    fieldId: StudyAbroadAdvancedFieldKey | StudyAbroadAdvancedGroupFieldKey
  ) => {
    switch (fieldId) {
      case 'country':
        return row.country ? [row.country] : [];
      case 'branch':
        return row.branch ? [row.branch] : [];
      case 'salesperson':
        return row.salesperson ? [row.salesperson] : [];
      case 'program':
        return row.program ? [row.program] : [];
      case 'status':
        return row.serviceStatus ? [row.serviceStatus] : [];
      case 'progress':
        return row.stage ? [row.stage] : [];
      case 'processor':
        return row.processorName ? [row.processorName] : [];
      default:
        return [];
    }
  };

  const getAdvancedFieldEmptyLabel = (
    fieldId: StudyAbroadAdvancedFieldKey | StudyAbroadAdvancedGroupFieldKey
  ) => {
    switch (fieldId) {
      case 'country':
        return 'Chưa có quốc gia';
      case 'branch':
        return 'Chưa có cơ sở';
      case 'salesperson':
        return 'Chưa có sale';
      case 'program':
        return 'Chưa có chương trình';
      case 'status':
        return 'Chưa có trạng thái';
      case 'progress':
        return 'Chưa có tiến độ';
      case 'processor':
        return 'Chưa phân công';
      default:
        return 'Chưa có dữ liệu';
    }
  };

  const formatAdvancedFieldValue = (
    fieldId: StudyAbroadAdvancedFieldKey | StudyAbroadAdvancedGroupFieldKey,
    value: string
  ) => {
    if (!value) return getAdvancedFieldEmptyLabel(fieldId);
    if (fieldId === 'status') {
      return getServiceStatusMeta(value as StudyAbroadServiceStatus).label;
    }
    return value;
  };

  const getAdvancedFieldDisplayValue = (
    row: StudyAbroadCaseRecord,
    fieldId: StudyAbroadAdvancedFieldKey | StudyAbroadAdvancedGroupFieldKey
  ) => {
    const values = getAdvancedFieldValues(row, fieldId);
    if (!values.length) return getAdvancedFieldEmptyLabel(fieldId);
    return values.map((value) => formatAdvancedFieldValue(fieldId, value)).join(' / ');
  };

  const sortSelectableValues = (fieldId: StudyAbroadAdvancedFieldKey, values: string[]) => {
    if (fieldId === 'status') {
      const statusOrder = new Map(STUDY_ABROAD_SERVICE_STATUS_ORDER.map((value, index) => [value, index]));
      return [...values].sort((left, right) => {
        const leftOrder = statusOrder.get(left as StudyAbroadServiceStatus) ?? Number.MAX_SAFE_INTEGER;
        const rightOrder = statusOrder.get(right as StudyAbroadServiceStatus) ?? Number.MAX_SAFE_INTEGER;
        if (leftOrder !== rightOrder) return leftOrder - rightOrder;
        return formatAdvancedFieldValue(fieldId, left).localeCompare(formatAdvancedFieldValue(fieldId, right), 'vi');
      });
    }

    if (fieldId === 'progress') {
      const progressOrder = new Map(STUDY_ABROAD_PROGRESS_ORDER.map((value, index) => [value, index]));
      return [...values].sort((left, right) => {
        const leftOrder = progressOrder.get(left) ?? Number.MAX_SAFE_INTEGER;
        const rightOrder = progressOrder.get(right) ?? Number.MAX_SAFE_INTEGER;
        if (leftOrder !== rightOrder) return leftOrder - rightOrder;
        return left.localeCompare(right, 'vi');
      });
    }

    return [...values].sort((left, right) => left.localeCompare(right, 'vi'));
  };

  const advancedFilterSelectableValuesByField = useMemo<
    Readonly<Partial<Record<StudyAbroadAdvancedFieldKey, ReadonlyArray<ToolbarValueOption>>>>
  >(() => {
    return selectedAdvancedFilterFields.reduce<Partial<Record<StudyAbroadAdvancedFieldKey, ReadonlyArray<ToolbarValueOption>>>>(
      (accumulator, fieldId) => {
        const derivedValues = scopedRows.flatMap((row) => getAdvancedFieldValues(row, fieldId)).filter(Boolean);
        const presetValues =
          fieldId === 'status'
            ? [...STUDY_ABROAD_SERVICE_STATUS_ORDER]
            : fieldId === 'progress'
              ? [...STUDY_ABROAD_PROGRESS_ORDER]
              : [];

        accumulator[fieldId] = sortSelectableValues(
          fieldId,
          Array.from(new Set([...presetValues, ...derivedValues]))
        ).map((value) => ({
          value,
          label: formatAdvancedFieldValue(fieldId, value)
        }));

        return accumulator;
      },
      {}
    );
  }, [scopedRows, selectedAdvancedFilterFields]);
  const advancedFilterSelectableValues =
    (activeAdvancedFilterField
      ? advancedFilterSelectableValuesByField[activeAdvancedFilterField.id as StudyAbroadAdvancedFieldKey]
      : []) || [];

  const filteredRows = useMemo(() => {
    const keyword = normalizeForSearch(searchTerm);

    return scopedRows
      .filter((row) => {
        if (keyword) {
          const searchable = normalizeForSearch(
            [
              row.soCode,
              row.student,
              row.address,
              row.phone,
              row.country,
              row.program,
              row.major,
              row.salesperson,
              row.branch,
              row.intake,
              row.stage,
              row.certificate,
              row.expectedFlightTerm,
              row.processorName
            ].join(' ')
          );

          if (!searchable.includes(keyword)) {
            return false;
          }
        }

        if (timeRangeType !== 'all' && !doesDateMatchTimeRange(getRowTimeFieldValue(row), timeRangeType, customRange)) {
          return false;
        }

        if (
          selectedAdvancedFilterEntries.some(
            ([fieldId, selectedValue]) => !getAdvancedFieldValues(row, fieldId).includes(selectedValue)
          )
        ) {
          return false;
        }

        return true;
      })
      .sort((left, right) => {
        if (selectedAdvancedGroupFields.length > 0) {
          const leftGroup = selectedAdvancedGroupFields
            .map((fieldId) => getAdvancedFieldDisplayValue(left, fieldId))
            .join('||');
          const rightGroup = selectedAdvancedGroupFields
            .map((fieldId) => getAdvancedFieldDisplayValue(right, fieldId))
            .join('||');
          const groupCompare = leftGroup.localeCompare(rightGroup, 'vi');
          if (groupCompare !== 0) return groupCompare;
        }

        return left.student.localeCompare(right.student, 'vi');
      });
  }, [
    customRange,
    scopedRows,
    searchTerm,
    selectedAdvancedFilterEntries,
    selectedAdvancedGroupFields,
    timeRangeType
  ]);

  const groupedRows = useMemo(() => {
    if (!selectedAdvancedGroupFields.length) {
      return [{ key: 'all', label: `Tất cả (${filteredRows.length})`, rows: filteredRows }];
    }

    const buildGroups = (
      rowsToGroup: StudyAbroadCaseRecord[],
      fields: StudyAbroadAdvancedGroupFieldKey[],
      path: string[] = [],
      keyPath: string[] = []
    ): Array<{ key: string; label: string; rows: StudyAbroadCaseRecord[] }> => {
      if (!fields.length) {
        return [{ key: keyPath.join('||') || 'all', label: `${path.join(' / ')} (${rowsToGroup.length})`, rows: rowsToGroup }];
      }

      const [currentField, ...restFields] = fields;
      const groups = new Map<string, StudyAbroadCaseRecord[]>();
      const fieldLabel =
        STUDY_ABROAD_TOOLBAR_GROUP_OPTIONS.find((option) => option.id === currentField)?.label || currentField;

      rowsToGroup.forEach((row) => {
        const key = getAdvancedFieldDisplayValue(row, currentField);
        groups.set(key, [...(groups.get(key) || []), row]);
      });

      return Array.from(groups.entries())
        .sort((left, right) => left[0].localeCompare(right[0], 'vi'))
        .flatMap(([key, nestedRows]) =>
          buildGroups(
            nestedRows,
            restFields,
            [...path, `${fieldLabel}: ${key}`],
            [...keyPath, `${fieldLabel}:${key}`]
          )
        );
    };

    return buildGroups(filteredRows, selectedAdvancedGroupFields);
  }, [filteredRows, selectedAdvancedGroupFields]);

  const advancedToolbarActiveCount =
    selectedAdvancedGroupFields.length + selectedAdvancedFilterEntries.length;
  const hasAdvancedToolbarFilters =
    selectedAdvancedGroupFields.length > 0 || selectedAdvancedFilterEntries.length > 0;

  const clearAllFilters = () => {
    setSearchTerm('');
    setShowTimePicker(false);
    setTimeFilterField(STUDY_ABROAD_TOOLBAR_TIME_PLACEHOLDER);
    setTimeRangeType('all');
    setCustomRange(null);
    setShowFilterDropdown(false);
    setSelectedAdvancedFilterFields([]);
    setSelectedAdvancedFilterValues({});
    setSelectedAdvancedGroupFields([]);
  };

  const handleTimeFilterOpenChange = (nextOpen: boolean) => {
    setShowFilterDropdown(false);
    setShowTimePicker(nextOpen);
  };

  const handleTimeFilterFieldChange = (fieldId: string) => {
    setShowFilterDropdown(false);
    setShowTimePicker(false);
    setTimeFilterField(fieldId as StudyAbroadTimeFieldSelection);
  };

  const handleTimePresetSelect = (presetId: string) => {
    const nextPresetId = presetId as (typeof STUDY_ABROAD_TIME_PRESETS)[number]['id'];
    setTimeRangeType(nextPresetId);
    if (nextPresetId !== 'custom') {
      setShowTimePicker(false);
    }
  };

  const handleApplyCustomTimeRange = () => {
    if (customRange?.start && customRange?.end) {
      setTimeRangeType('custom');
      setShowTimePicker(false);
      return;
    }
    window.alert('Vui lòng chọn khoảng ngày');
  };

  const handleAdvancedFilterOpenChange = (nextOpen: boolean) => {
    setShowTimePicker(false);
    setShowFilterDropdown(nextOpen);
  };

  const toggleAdvancedFieldSelection = (
    type: 'filter' | 'group',
    fieldId: StudyAbroadAdvancedFieldKey | StudyAbroadAdvancedGroupFieldKey
  ) => {
    if (type === 'filter') {
      const resolvedFieldId = fieldId as StudyAbroadAdvancedFieldKey;

      setSelectedAdvancedFilterFields((prev) =>
        prev.includes(resolvedFieldId)
          ? prev.filter((item) => item !== resolvedFieldId)
          : [...prev, resolvedFieldId]
      );
      setSelectedAdvancedFilterValues((prev) => {
        if (!(resolvedFieldId in prev)) return prev;

        const nextValues = { ...prev };
        delete nextValues[resolvedFieldId];
        return nextValues;
      });
      return;
    }

    setSelectedAdvancedGroupFields((prev) =>
      prev.includes(fieldId as StudyAbroadAdvancedGroupFieldKey)
        ? prev.filter((item) => item !== fieldId)
        : [...prev, fieldId as StudyAbroadAdvancedGroupFieldKey]
    );
  };

  const handleAdvancedFilterValueChange = (
    fieldId: StudyAbroadAdvancedFieldKey,
    value: string
  ) => {
    setSelectedAdvancedFilterValues((prev) => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const visibleColumnList = useMemo(
    () => COLUMN_CONFIGS.filter((column) => visibleColumns[column.id]),
    [visibleColumns]
  );

  const visibleCount = visibleColumnList.length;
  const allChecked = visibleCount === COLUMN_CONFIGS.length;

  const toggleColumn = (columnId: ColumnId) => {
    setVisibleColumns((prev) => {
      const currentVisible = COLUMN_CONFIGS.filter((item) => prev[item.id]).length;
      if (prev[columnId] && currentVisible <= 1) return prev;
      return { ...prev, [columnId]: !prev[columnId] };
    });
  };

  const toggleAllColumns = (checked: boolean) => {
    if (checked) {
      setVisibleColumns({ ...ALL_COLUMNS_VISIBLE });
      return;
    }

    const onlyStudent: Record<ColumnId, boolean> = { ...ALL_COLUMNS_VISIBLE };
    COLUMN_CONFIGS.forEach((column) => {
      onlyStudent[column.id] = column.id === 'student';
    });
    setVisibleColumns(onlyStudent);
  };

  const renderCell = (row: StudyAbroadCaseRecord, columnId: ColumnId) => {
    if (columnId === 'student') return `${row.student} (${row.soCode})`;
    if (columnId === 'address') return row.address;
    if (columnId === 'phone') return row.phone;
    if (columnId === 'country') return row.country;
    if (columnId === 'program') return row.program;
    if (columnId === 'major') return row.major;
    if (columnId === 'salesperson') return row.salesperson;
    if (columnId === 'branch') return row.branch;
    if (columnId === 'intake') return row.intake;
    if (columnId === 'stage') return row.stage;
    if (columnId === 'certificate') return row.certificate;
    if (columnId === 'expectedFlightTerm') return row.expectedFlightTerm;
    if (columnId === 'tuition') return formatCurrency(row.tuition);

    if (columnId === 'caseCompleteness') {
      const meta = getCaseCompletenessMeta(row.caseCompleteness);
      return <TableBadge label={meta.label} className={meta.className} />;
    }
    if (columnId === 'serviceStatus') {
      const meta = getServiceStatusMeta(row.serviceStatus);
      return <TableBadge label={meta.label} className={meta.className} />;
    }
    if (columnId === 'invoiceStatus') {
      const meta = getInvoiceStatusMeta(row.invoiceStatus);
      return <TableBadge label={meta.label} className={meta.className} />;
    }

    const meta = getCmtcMeta(row.cmtc);
    return <TableBadge label={meta.label} className={meta.className} />;
  };

  const isBadgeColumn = (columnId: ColumnId) =>
    columnId === 'caseCompleteness' ||
    columnId === 'serviceStatus' ||
    columnId === 'invoiceStatus' ||
    columnId === 'cmtc';

  const renderTableRow = (row: StudyAbroadCaseRecord, index: number, keyPrefix = '') => (
    <tr
      key={`${keyPrefix}${row.id}`}
      className="cursor-pointer transition-colors hover:bg-[#f8fafc]"
      onClick={() => navigate(`/study-abroad/cases/${row.id}`)}
    >
      <td className="px-2 py-2.5 text-center text-sm font-semibold text-slate-500">{index + 1}</td>
      {visibleColumnList.map((column) => {
        const value = renderCell(row, column.id);
        const title = typeof value === 'string' ? value : undefined;

        return (
          <td key={column.id} className="px-2 py-2.5 align-middle text-sm text-[#111418]">
            {isBadgeColumn(column.id) ? (
              <div className="min-w-0 truncate whitespace-nowrap">{value}</div>
            ) : (
              <div className="min-w-0 truncate whitespace-nowrap" title={title}>
                {value}
              </div>
            )}
          </td>
        );
      })}
    </tr>
  );

  return decodeMojibakeReactNode(
    <div className="flex h-full flex-col overflow-hidden bg-[#f8fafc] text-[#111418]">
      <div className="mx-auto flex h-full w-full max-w-[1500px] flex-1 flex-col overflow-y-auto p-6 lg:p-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div className="flex min-w-72 flex-col gap-1">
            <h1 className="flex items-center gap-2 text-[32px] font-bold leading-tight tracking-[-0.015em] text-[#111418]">
              <GraduationCap size={32} className="text-blue-600" /> Hồ sơ Du học sinh
            </h1>
            <p className="text-sm font-normal leading-normal text-[#4c739a]">
              Quản lý danh sách hồ sơ du học tự sinh từ SO đã khóa. Mỗi khách hàng hiển thị 1 dòng.
            </p>
          </div>
          <button className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700">
            + Thêm hồ sơ
          </button>
        </div>

        <div className="mb-4 overflow-visible rounded-2xl border border-[#cfdbe7] bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
            >
              <RotateCcw size={16} />
              Đặt lại
            </button>

            <ToolbarTimeFilter
              isOpen={showTimePicker}
              fieldOptions={STUDY_ABROAD_TOOLBAR_TIME_FIELD_OPTIONS}
              fieldPlaceholderValue={STUDY_ABROAD_TOOLBAR_TIME_PLACEHOLDER}
              fieldPlaceholderLabel="Hành động"
              selectedField={timeFilterField}
              selectedRangeType={timeRangeType}
              customRange={customRange}
              presets={STUDY_ABROAD_TIME_PRESETS}
              onOpenChange={handleTimeFilterOpenChange}
              onFieldChange={handleTimeFilterFieldChange}
              onPresetSelect={handleTimePresetSelect}
              onCustomRangeChange={setCustomRange}
              onReset={() => {
                setTimeFilterField(STUDY_ABROAD_TOOLBAR_TIME_PLACEHOLDER);
                setTimeRangeType('all');
                setCustomRange(null);
                setShowTimePicker(false);
              }}
              onCancel={() => setShowTimePicker(false)}
              onApplyCustomRange={handleApplyCustomTimeRange}
              controlClassName="min-h-[36px] rounded-xl border-[#cfdbe7] shadow-none"
              fieldSectionClassName="bg-white"
              fieldSelectClassName="text-[13px]"
              rangeButtonClassName="px-2.5 text-[13px]"
              className="shrink-0"
              panelAlign="left"
            />

            <div className="min-w-[320px] flex-[1.6]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Tìm kiếm học viên, mã hồ sơ, sale, SDT..."
                  className="h-9 w-full rounded-xl border border-[#cfdbe7] bg-[#f8fafc] pl-10 pr-4 text-[13px] outline-none transition focus:border-slate-400"
                />
              </div>
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-3">
              <AdvancedFilterDropdown
                isOpen={showFilterDropdown}
                activeCount={advancedToolbarActiveCount}
                hasActiveFilters={hasAdvancedToolbarFilters}
                filterOptions={STUDY_ABROAD_TOOLBAR_FILTER_OPTIONS}
                groupOptions={STUDY_ABROAD_TOOLBAR_GROUP_OPTIONS}
                selectedFilterFieldIds={selectedAdvancedFilterFields}
                selectedGroupFieldIds={selectedAdvancedGroupFields}
                activeFilterField={activeAdvancedFilterField}
                selectableValues={advancedFilterSelectableValues}
                selectedFilterValue={activeAdvancedFilterField ? (selectedAdvancedFilterValues[activeAdvancedFilterField.id as StudyAbroadAdvancedFieldKey] || '') : ''}
                selectedFilterValuesByField={selectedAdvancedFilterValues}
                selectableValuesByField={advancedFilterSelectableValuesByField}
                onOpenChange={handleAdvancedFilterOpenChange}
                onToggleFilterField={(fieldId) =>
                  toggleAdvancedFieldSelection('filter', fieldId as StudyAbroadAdvancedFieldKey)
                }
                onToggleGroupField={(fieldId) =>
                  toggleAdvancedFieldSelection('group', fieldId as StudyAbroadAdvancedGroupFieldKey)
                }
                onFilterValueChange={() => undefined}
                onFilterValueChangeForField={(fieldId, value) =>
                  handleAdvancedFilterValueChange(fieldId as StudyAbroadAdvancedFieldKey, value)
                }
                onClearAll={() => {
                  setSelectedAdvancedFilterFields([]);
                  setSelectedAdvancedFilterValues({});
                  setSelectedAdvancedGroupFields([]);
                }}
                triggerLabel="Lọc nâng cao"
                filterDescription="Chọn một hoặc nhiều trường rồi chọn giá trị tương ứng để lọc nhanh danh sách hồ sơ du học."
                groupDescription="Có thể chọn nhiều trường. Thứ tự bấm sẽ là thứ tự ghép nhóm hiển thị trong bảng."
                triggerClassName="min-h-[36px] rounded-xl px-3 py-1.5 text-[13px] font-medium shadow-none"
                className="shrink-0"
              />

              <div className="relative" ref={columnMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowColumnMenu((prev) => !prev)}
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#cfdbe7] bg-white px-3 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <Settings2 size={16} />
                  Cột
                </button>

                {showColumnMenu ? (
                  <div className="absolute right-0 top-11 z-20 max-h-96 w-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
                    <label className="mb-2 flex cursor-pointer items-center gap-2 border-b border-slate-100 pb-2 text-sm font-semibold text-slate-800">
                      <input
                        type="checkbox"
                        checked={allChecked}
                        onChange={(event) => toggleAllColumns(event.target.checked)}
                      />
                      Chọn tất cả cột
                    </label>
                    <div className="space-y-2">
                      {COLUMN_CONFIGS.map((column) => (
                        <label key={column.id} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={visibleColumns[column.id]}
                            onChange={() => toggleColumn(column.id)}
                          />
                          <span className="truncate">{column.label}</span>
                        </label>
                      ))}
                    </div>
                    <p className="mt-2 text-[11px] text-slate-500">Cần tối thiểu 1 cột được chọn.</p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#e7edf3] pt-3">
            <div className="text-xs text-slate-500">
              Đang hiển thị {loading ? '...' : filteredRows.length} hồ sơ, {visibleCount}/{COLUMN_CONFIGS.length} cột. Nguồn dữ liệu: SO đã khóa.
            </div>
            {(searchTerm.trim() || timeRangeType !== 'all' || hasAdvancedToolbarFilters) ? (
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-xs font-semibold text-slate-500 transition-colors hover:text-slate-700"
              >
                Xóa lọc
              </button>
            ) : null}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-[#cfdbe7] bg-white shadow-sm">
          <div className="w-full overflow-x-hidden">
            <table className="w-full table-fixed border-collapse text-left">
              <thead className="border-b border-[#cfdbe7] bg-[#f8fafc]">
                <tr>
                  <th className="w-16 px-2 py-3 text-center text-[11px] font-bold uppercase tracking-wide text-[#111418]">STT</th>
                  {visibleColumnList.map((column) => (
                    <th
                      key={column.id}
                      className="px-2 py-3 text-[11px] font-bold uppercase tracking-wide text-[#111418]"
                    >
                      <div className="min-w-0 truncate whitespace-nowrap">{column.label}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef3f8]">
                {loading &&
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={`skeleton-${index}`}>
                      <td colSpan={visibleColumnList.length + 1} className="px-3 py-3">
                        <div className="h-8 animate-pulse rounded bg-slate-100" />
                      </td>
                    </tr>
                  ))}

                {!loading && selectedAdvancedGroupFields.length === 0 &&
                  filteredRows.map((row, index) => renderTableRow(row, index))}

                {!loading && selectedAdvancedGroupFields.length > 0 &&
                  (() => {
                    let currentIndex = 0;
                    return groupedRows.map((group) => {
                      const groupStartIndex = currentIndex;
                      currentIndex += group.rows.length;

                      return (
                        <React.Fragment key={group.key}>
                          <tr className="border-b border-[#dbe5ef] bg-[#f8fafc]">
                            <td colSpan={visibleColumnList.length + 1} className="px-3 py-2 text-sm font-semibold text-slate-700">
                              <div className="flex items-center justify-between gap-3">
                                <span>{group.label}</span>
                                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-500">
                                  {group.rows.length} hồ sơ
                                </span>
                              </div>
                            </td>
                          </tr>
                          {group.rows.map((row, index) => renderTableRow(row, groupStartIndex + index, `${group.key}-`))}
                        </React.Fragment>
                      );
                    });
                  })()}

                {!loading && filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={visibleColumnList.length + 1} className="px-3 py-8 text-center text-sm font-medium text-slate-500">
                      Không có dữ liệu theo bộ lọc hiện tại.
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

export default StudyAbroadStudentList;
