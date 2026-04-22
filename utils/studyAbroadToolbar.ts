import {
  StudyAbroadCaseRecord,
  StudyAbroadServiceStatus
} from '../services/studyAbroadCases.local';
import { ToolbarOption, ToolbarValueOption } from './filterToolbar';

export type StudyAbroadAdvancedFieldKey =
  | 'country'
  | 'branch'
  | 'salesperson'
  | 'program'
  | 'status'
  | 'progress'
  | 'processor';
export type StudyAbroadAdvancedGroupFieldKey = StudyAbroadAdvancedFieldKey;
export type StudyAbroadTimeField =
  | 'createdAt'
  | 'intakeDate'
  | 'flightDate'
  | 'schoolInterviewDate'
  | 'embassyAppointmentDate';
export type StudyAbroadTimeFieldSelection = 'action' | StudyAbroadTimeField;

export const STUDY_ABROAD_TOOLBAR_FILTER_OPTIONS = [
  { id: 'country', label: 'Quốc gia' },
  { id: 'branch', label: 'Cơ sở' },
  { id: 'salesperson', label: 'Sale' },
  { id: 'program', label: 'Chương trình' },
  { id: 'status', label: 'Trạng thái' },
  { id: 'progress', label: 'Tiến độ' },
  { id: 'processor', label: 'Người xử lý hồ sơ' }
] as const satisfies ReadonlyArray<ToolbarOption>;

export const STUDY_ABROAD_TOOLBAR_GROUP_OPTIONS = [
  { id: 'country', label: 'Quốc gia' },
  { id: 'branch', label: 'Cơ sở' },
  { id: 'salesperson', label: 'Sale' },
  { id: 'program', label: 'Chương trình' },
  { id: 'status', label: 'Trạng thái' },
  { id: 'progress', label: 'Tiến độ' },
  { id: 'processor', label: 'Người xử lý hồ sơ' }
] as const satisfies ReadonlyArray<ToolbarOption>;

export const STUDY_ABROAD_TOOLBAR_TIME_FIELD_OPTIONS = [
  { id: 'createdAt', label: 'Ngày tạo' },
  { id: 'intakeDate', label: 'Kỳ nhập học' },
  { id: 'flightDate', label: 'Ngày bay' },
  { id: 'schoolInterviewDate', label: 'Ngày phỏng vấn trường' },
  { id: 'embassyAppointmentDate', label: 'Ngày hẹn ĐSQ' }
] as const satisfies ReadonlyArray<ToolbarOption>;

export const STUDY_ABROAD_TIME_PRESETS = [
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

export const STUDY_ABROAD_TOOLBAR_TIME_PLACEHOLDER = 'action';
export const DEFAULT_STUDY_ABROAD_TIME_FIELD: StudyAbroadTimeField = 'createdAt';
export const STUDY_ABROAD_SERVICE_STATUS_ORDER: StudyAbroadServiceStatus[] = [
  'NEW',
  'UNPROCESSED',
  'PROCESSED',
  'REPROCESSING',
  'DEPARTED',
  'WITHDRAWN',
  'VISA_FAILED'
];
export const STUDY_ABROAD_PROGRESS_ORDER = [
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

export const normalizeStudyAbroadSearch = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

export const normalizeStudyAbroadMonthYearToIso = (value?: string) => {
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

export const getStudyAbroadServiceStatusMeta = (status: StudyAbroadServiceStatus) => {
  if (status === 'NEW') return { label: 'Mới', className: 'bg-slate-100 text-slate-700 border-slate-200' };
  if (status === 'UNPROCESSED') return { label: 'Chưa xử lý', className: 'bg-slate-100 text-slate-700 border-slate-200' };
  if (status === 'PROCESSED') return { label: 'Đã xử lý', className: 'bg-blue-50 text-blue-700 border-blue-100' };
  if (status === 'DEPARTED') return { label: 'Đã bay', className: 'bg-emerald-50 text-emerald-700 border-emerald-100' };
  if (status === 'WITHDRAWN') return { label: 'Đã rút hồ sơ', className: 'bg-rose-50 text-rose-700 border-rose-100' };
  if (status === 'VISA_FAILED') return { label: 'Trượt visa', className: 'bg-rose-50 text-rose-700 border-rose-100' };
  return { label: 'Đang xử lý lại', className: 'bg-amber-50 text-amber-700 border-amber-100' };
};

export const getStudyAbroadTimeFieldValue = (
  row: StudyAbroadCaseRecord,
  fieldId: StudyAbroadTimeField = DEFAULT_STUDY_ABROAD_TIME_FIELD
) => {
  switch (fieldId) {
    case 'createdAt':
      return normalizeStudyAbroadMonthYearToIso(row.createdAt);
    case 'intakeDate':
      return normalizeStudyAbroadMonthYearToIso(row.intakeDate || row.intake);
    case 'flightDate':
      return normalizeStudyAbroadMonthYearToIso(row.expectedEntryDate || row.expectedFlightTerm);
    case 'schoolInterviewDate':
      return normalizeStudyAbroadMonthYearToIso(row.schoolInterviewDate);
    case 'embassyAppointmentDate':
      return normalizeStudyAbroadMonthYearToIso(row.embassyAppointmentDate);
    default:
      return '';
  }
};

export const getStudyAbroadAdvancedFieldValues = (
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

export const getStudyAbroadAdvancedFieldEmptyLabel = (
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

export const formatStudyAbroadAdvancedFieldValue = (
  fieldId: StudyAbroadAdvancedFieldKey | StudyAbroadAdvancedGroupFieldKey,
  value: string
) => {
  if (!value) return getStudyAbroadAdvancedFieldEmptyLabel(fieldId);
  if (fieldId === 'status') {
    return getStudyAbroadServiceStatusMeta(value as StudyAbroadServiceStatus).label;
  }
  return value;
};

export const getStudyAbroadAdvancedFieldDisplayValue = (
  row: StudyAbroadCaseRecord,
  fieldId: StudyAbroadAdvancedFieldKey | StudyAbroadAdvancedGroupFieldKey
) => {
  const values = getStudyAbroadAdvancedFieldValues(row, fieldId);
  if (!values.length) return getStudyAbroadAdvancedFieldEmptyLabel(fieldId);
  return values.map((value) => formatStudyAbroadAdvancedFieldValue(fieldId, value)).join(' / ');
};

export const sortStudyAbroadSelectableValues = (
  fieldId: StudyAbroadAdvancedFieldKey,
  values: string[]
) => {
  if (fieldId === 'status') {
    const statusOrder = new Map(STUDY_ABROAD_SERVICE_STATUS_ORDER.map((value, index) => [value, index]));
    return [...values].sort((left, right) => {
      const leftOrder = statusOrder.get(left as StudyAbroadServiceStatus) ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = statusOrder.get(right as StudyAbroadServiceStatus) ?? Number.MAX_SAFE_INTEGER;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return formatStudyAbroadAdvancedFieldValue(fieldId, left).localeCompare(
        formatStudyAbroadAdvancedFieldValue(fieldId, right),
        'vi'
      );
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

export const buildStudyAbroadSelectableValuesByField = (
  rows: StudyAbroadCaseRecord[],
  selectedFieldIds: ReadonlyArray<StudyAbroadAdvancedFieldKey>
) =>
  selectedFieldIds.reduce<Partial<Record<StudyAbroadAdvancedFieldKey, ReadonlyArray<ToolbarValueOption>>>>(
    (accumulator, fieldId) => {
      const derivedValues = rows.flatMap((row) => getStudyAbroadAdvancedFieldValues(row, fieldId)).filter(Boolean);
      const presetValues =
        fieldId === 'status'
          ? [...STUDY_ABROAD_SERVICE_STATUS_ORDER]
          : fieldId === 'progress'
            ? [...STUDY_ABROAD_PROGRESS_ORDER]
            : [];

      accumulator[fieldId] = sortStudyAbroadSelectableValues(
        fieldId,
        Array.from(new Set([...presetValues, ...derivedValues]))
      ).map((value) => ({
        value,
        label: formatStudyAbroadAdvancedFieldValue(fieldId, value)
      }));

      return accumulator;
    },
    {}
  );
