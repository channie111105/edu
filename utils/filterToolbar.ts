export type SearchFilterMatchMode = 'includes' | 'equals';

export interface SearchFilter {
  field: string;
  label: string;
  value: string;
  color?: string;
  matchMode?: SearchFilterMatchMode;
}

export interface ToolbarFilterChip extends SearchFilter {
  origin: 'search' | 'synthetic';
  originalIndex?: number;
  syntheticKey?: string;
}

export interface ToolbarOption {
  id: string;
  label: string;
}

export interface ToolbarValueOption {
  value: string;
  label: string;
}

export interface CustomDateRange {
  start: string;
  end: string;
}

export const buildMultiFieldFilterKey = (prefix: string, fieldIds: string[]) =>
  `${prefix}${fieldIds.join('|')}`;

export const parseMultiFieldFilterKeys = (field: string, prefix: string) =>
  field.startsWith(prefix)
    ? field.slice(prefix.length).split('|').filter(Boolean)
    : [];

export const appendUniqueSearchFilter = (
  filters: SearchFilter[],
  nextFilter: SearchFilter,
  normalizeToken: (value?: string) => string
) => {
  const normalizedValue = nextFilter.value.trim();
  if (!normalizedValue) {
    return filters;
  }

  const nextMatchMode = nextFilter.matchMode || 'includes';
  const exists = filters.some((filter) =>
    filter.field === nextFilter.field &&
    normalizeToken(filter.value) === normalizeToken(normalizedValue) &&
    (filter.matchMode || 'includes') === nextMatchMode
  );

  if (exists) {
    return filters;
  }

  return [...filters, { ...nextFilter, value: normalizedValue, matchMode: nextMatchMode }];
};

export const getTimePresetLabel = (presets: ReadonlyArray<ToolbarOption>, rangeType: string) =>
  presets.find((preset) => preset.id === rangeType)?.label || rangeType;

const formatRangeDate = (value: string, locale: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString(locale);
};

export const formatCustomDateRangeLabel = (
  range: CustomDateRange | null,
  locale = 'vi-VN'
) => {
  if (!range?.start || !range?.end) {
    return '';
  }

  return `${formatRangeDate(range.start, locale)} - ${formatRangeDate(range.end, locale)}`;
};

export const getTimeRangeSummaryLabel = (
  presets: ReadonlyArray<ToolbarOption>,
  rangeType: string,
  range: CustomDateRange | null,
  locale = 'vi-VN'
) => (
  rangeType === 'custom' && range?.start && range?.end
    ? formatCustomDateRangeLabel(range, locale)
    : getTimePresetLabel(presets, rangeType)
);

export const doesDateMatchTimeRange = (
  dateStr: string | undefined,
  type: string,
  range: CustomDateRange | null,
  now = new Date()
) => {
  if (!dateStr) return false;

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return false;

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  switch (type) {
    case 'today':
      return date >= startOfToday && date <= endOfToday;
    case 'yesterday': {
      const yesterday = new Date(startOfToday);
      yesterday.setDate(yesterday.getDate() - 1);
      const endOfYesterday = new Date(yesterday);
      endOfYesterday.setHours(23, 59, 59);
      return date >= yesterday && date <= endOfYesterday;
    }
    case 'thisWeek': {
      const startOfWeek = new Date(startOfToday);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      return date >= startOfWeek;
    }
    case 'last7Days': {
      const last7 = new Date(startOfToday);
      last7.setDate(last7.getDate() - 7);
      return date >= last7;
    }
    case 'last30Days': {
      const last30 = new Date(startOfToday);
      last30.setDate(last30.getDate() - 30);
      return date >= last30;
    }
    case 'thisMonth': {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return date >= startOfMonth;
    }
    case 'lastMonth': {
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      return date >= startOfLastMonth && date <= endOfLastMonth;
    }
    case 'custom': {
      if (!range) return true;
      const start = new Date(range.start);
      const end = new Date(range.end);
      end.setHours(23, 59, 59);
      return date >= start && date <= end;
    }
    default:
      return true;
  }
};
