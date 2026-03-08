import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

export type DateRange = {
  startDate: Date | null;
  endDate: Date | null;
  label?: string;
};

interface AdvancedDateFilterProps {
  onChange: (range: DateRange) => void;
  label?: string;
  showPresets?: boolean;
  hideTrigger?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  align?: 'left' | 'right';
  initialRange?: DateRange;
  className?: string;
  popoverClassName?: string;
}

type PresetKey =
  | 'today'
  | 'yesterday'
  | 'thisWeek'
  | 'last7Days'
  | 'last30Days'
  | 'thisMonth'
  | 'lastMonth'
  | 'custom';

const MONTH_LABELS = [
  'Tháng 1',
  'Tháng 2',
  'Tháng 3',
  'Tháng 4',
  'Tháng 5',
  'Tháng 6',
  'Tháng 7',
  'Tháng 8',
  'Tháng 9',
  'Tháng 10',
  'Tháng 11',
  'Tháng 12'
];

const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const PRESET_OPTIONS: Array<{ key: PresetKey; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'thisWeek', label: 'This Week' },
  { key: 'last7Days', label: 'Last 7 Days' },
  { key: 'last30Days', label: 'Last 30 Days' },
  { key: 'thisMonth', label: 'This Month' },
  { key: 'lastMonth', label: 'Last Month' },
  { key: 'custom', label: 'Custom Range' }
];

const EMPTY_RANGE: DateRange = { startDate: null, endDate: null, label: 'Tùy chọn' };

const startOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const endOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};

const cloneRange = (range: DateRange): DateRange => ({
  startDate: range.startDate ? new Date(range.startDate) : null,
  endDate: range.endDate ? new Date(range.endDate) : null,
  label: range.label
});

const formatDate = (date: Date | null) => (date ? date.toLocaleDateString('vi-VN') : 'Chọn ngày');

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

const buildYearOptions = (baseYear: number) =>
  Array.from({ length: 11 }, (_, index) => baseYear - 5 + index);

const getPresetRange = (presetKey: Exclude<PresetKey, 'custom'>): DateRange => {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  switch (presetKey) {
    case 'today':
      return { startDate: todayStart, endDate: todayEnd, label: 'Today' };
    case 'yesterday': {
      const yesterday = new Date(todayStart);
      yesterday.setDate(yesterday.getDate() - 1);
      return { startDate: yesterday, endDate: endOfDay(yesterday), label: 'Yesterday' };
    }
    case 'thisWeek': {
      const start = new Date(todayStart);
      const dayOfWeek = start.getDay() === 0 ? 7 : start.getDay();
      start.setDate(start.getDate() - dayOfWeek + 1);
      return { startDate: start, endDate: todayEnd, label: 'This Week' };
    }
    case 'last7Days': {
      const start = new Date(todayStart);
      start.setDate(start.getDate() - 6);
      return { startDate: start, endDate: todayEnd, label: 'Last 7 Days' };
    }
    case 'last30Days': {
      const start = new Date(todayStart);
      start.setDate(start.getDate() - 29);
      return { startDate: start, endDate: todayEnd, label: 'Last 30 Days' };
    }
    case 'thisMonth': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: start, endDate: todayEnd, label: 'This Month' };
    }
    case 'lastMonth': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { startDate: start, endDate: end, label: 'Last Month' };
    }
  }
};

const rangesMatch = (left: DateRange, right: DateRange) => {
  const leftStart = left.startDate ? startOfDay(left.startDate).getTime() : null;
  const leftEnd = left.endDate ? endOfDay(left.endDate).getTime() : null;
  const rightStart = right.startDate ? startOfDay(right.startDate).getTime() : null;
  const rightEnd = right.endDate ? endOfDay(right.endDate).getTime() : null;
  return leftStart === rightStart && leftEnd === rightEnd;
};

const detectPreset = (range: DateRange): PresetKey => {
  if (!range.startDate || !range.endDate) return 'custom';

  const presetKeys = PRESET_OPTIONS.map((option) => option.key).filter(
    (key): key is Exclude<PresetKey, 'custom'> => key !== 'custom'
  );

  for (const presetKey of presetKeys) {
    if (rangesMatch(range, getPresetRange(presetKey))) {
      return presetKey;
    }
  }

  return 'custom';
};

const AdvancedDateFilter: React.FC<AdvancedDateFilterProps> = ({
  onChange,
  showPresets = true,
  label = 'Khoảng thời gian',
  hideTrigger = false,
  open,
  onOpenChange,
  align = 'right',
  initialRange,
  className = '',
  popoverClassName = ''
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [tempRange, setTempRange] = useState<DateRange>(EMPTY_RANGE);
  const [confirmedRange, setConfirmedRange] = useState<DateRange>(EMPTY_RANGE);
  const [selectedPreset, setSelectedPreset] = useState<PresetKey>('custom');
  const [viewDate, setViewDate] = useState(() => new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  const isControlledOpen = typeof open === 'boolean';
  const isOpen = isControlledOpen ? Boolean(open) : internalOpen;

  const setOpen = (next: boolean) => {
    if (!isControlledOpen) {
      setInternalOpen(next);
    }
    onOpenChange?.(next);
  };

  const initialRangeKey = useMemo(() => {
    const start = initialRange?.startDate ? new Date(initialRange.startDate).getTime() : 0;
    const end = initialRange?.endDate ? new Date(initialRange.endDate).getTime() : 0;
    return `${start}-${end}-${initialRange?.label || ''}`;
  }, [initialRange]);

  useEffect(() => {
    const nextRange =
      initialRange?.startDate || initialRange?.endDate
        ? cloneRange({
            startDate: initialRange?.startDate ? startOfDay(initialRange.startDate) : null,
            endDate: initialRange?.endDate ? endOfDay(initialRange.endDate) : null,
            label: initialRange?.label || 'Tùy chọn'
          })
        : EMPTY_RANGE;

    setTempRange(nextRange);
    setConfirmedRange(nextRange);
    setSelectedPreset(detectPreset(nextRange));
    setViewDate(nextRange.startDate ? new Date(nextRange.startDate) : new Date());
  }, [initialRangeKey, initialRange]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleApply = () => {
    const normalized = {
      startDate: tempRange.startDate ? startOfDay(tempRange.startDate) : null,
      endDate: tempRange.endDate ? endOfDay(tempRange.endDate) : null,
      label: tempRange.label || 'Tùy chọn'
    };

    setConfirmedRange(cloneRange(normalized));
    onChange(normalized);
    setOpen(false);
  };

  const handlePresetSelect = (presetKey: PresetKey) => {
    setSelectedPreset(presetKey);

    if (presetKey === 'custom') {
      const anchorDate = tempRange.startDate || confirmedRange.startDate || new Date();
      setViewDate(new Date(anchorDate));
      return;
    }

    const nextRange = getPresetRange(presetKey);
    setTempRange(nextRange);
    setViewDate(new Date(nextRange.startDate || new Date()));
  };

  const isDateSelected = (date: Date) => {
    if (!tempRange.startDate) return false;

    const current = startOfDay(date).getTime();
    const start = startOfDay(tempRange.startDate).getTime();
    const end = tempRange.endDate ? startOfDay(tempRange.endDate).getTime() : null;

    return current === start || current === end;
  };

  const isDateInRange = (date: Date) => {
    if (!tempRange.startDate || !tempRange.endDate) return false;

    const current = startOfDay(date).getTime();
    const start = startOfDay(tempRange.startDate).getTime();
    const end = startOfDay(tempRange.endDate).getTime();

    return current >= start && current <= end;
  };

  const handleDateClick = (date: Date) => {
    const clickedDate = startOfDay(date);

    setSelectedPreset('custom');
    setTempRange((current) => {
      if (!current.startDate || current.endDate) {
        return { startDate: clickedDate, endDate: null, label: 'Tùy chọn' };
      }

      if (clickedDate < current.startDate) {
        return {
          startDate: clickedDate,
          endDate: endOfDay(current.startDate),
          label: 'Tùy chọn'
        };
      }

      return {
        startDate: current.startDate,
        endDate: endOfDay(clickedDate),
        label: 'Tùy chọn'
      };
    });
  };

  const shiftViewMonth = (delta: number) => {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  };

  const setCalendarMonthYear = (offset: 0 | 1, month: number, year: number) => {
    if (offset === 0) {
      setViewDate(new Date(year, month, 1));
      return;
    }

    setViewDate(new Date(year, month - 1, 1));
  };

  const renderCalendar = (offset: 0 | 1) => {
    const monthDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1);
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const yearOptions = buildYearOptions(year);
    const days: React.ReactNode[] = [];

    for (let index = 0; index < firstDay; index += 1) {
      days.push(<div key={`empty-${offset}-${index}`} className="h-9 w-9" />);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day);
      const selected = isDateSelected(date);
      const inRange = isDateInRange(date);

      days.push(
        <button
          key={`${offset}-${day}`}
          type="button"
          onClick={() => handleDateClick(date)}
          className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-md text-sm transition-colors ${
            selected
              ? 'bg-blue-600 font-bold text-white'
              : inRange
                ? 'bg-blue-50 text-blue-700'
                : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          {day}
        </button>
      );
    }

    return (
      <div className="w-[286px] p-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            {offset === 0 ? (
              <button
                type="button"
                onClick={() => shiftViewMonth(-1)}
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
              >
                <ChevronLeft size={16} />
              </button>
            ) : (
              <div className="h-8 w-8" />
            )}

            <select
              value={month}
              onChange={(event) => setCalendarMonthYear(offset, Number(event.target.value), year)}
              className="rounded-md border border-slate-200 px-2 py-1 text-sm font-semibold text-slate-700 outline-none"
            >
              {MONTH_LABELS.map((item, index) => (
                <option key={item} value={index}>
                  {item}
                </option>
              ))}
            </select>

            <select
              value={year}
              onChange={(event) => setCalendarMonthYear(offset, month, Number(event.target.value))}
              className="rounded-md border border-slate-200 px-2 py-1 text-sm font-semibold text-slate-700 outline-none"
            >
              {yearOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          {offset === 1 ? (
            <button
              type="button"
              onClick={() => shiftViewMonth(1)}
              className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
            >
              <ChevronRight size={16} />
            </button>
          ) : (
            <div className="h-8 w-8" />
          )}
        </div>

        <div className="mb-2 grid grid-cols-7 justify-items-center text-[11px] font-semibold text-slate-400">
          {DAY_LABELS.map((day) => (
            <span key={`${offset}-${day}`}>{day}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 justify-items-center gap-y-1">{days}</div>
      </div>
    );
  };

  const confirmedRangeLabel =
    confirmedRange.startDate && confirmedRange.endDate
      ? `${formatDate(confirmedRange.startDate)} - ${formatDate(confirmedRange.endDate)}`
      : 'Chọn ngày';

  const tempRangeLabel =
    tempRange.startDate && tempRange.endDate
      ? `${formatDate(tempRange.startDate)} - ${formatDate(tempRange.endDate)}`
      : 'Chọn ngày bắt đầu và kết thúc';

  return (
    <div ref={containerRef} className={`${hideTrigger ? '' : 'relative'} ${className}`.trim()}>
      {!hideTrigger && (
        <button
          type="button"
          onClick={() => setOpen(!isOpen)}
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-all hover:bg-slate-50 ${
            isOpen ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200 bg-white text-slate-600'
          }`}
        >
          <span className="text-slate-500">{label}:</span>
          <span className="font-bold text-slate-800">{confirmedRangeLabel}</span>
          <ChevronDown size={14} className="text-slate-400" />
        </button>
      )}

      {isOpen && (
        <div
          className={`absolute top-full z-50 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl ${
            align === 'left' ? 'left-0 origin-top-left' : 'right-0 origin-top-right'
          } ${popoverClassName}`.trim()}
        >
          <div
            className={`flex max-w-[calc(100vw-32px)] flex-col bg-white ${
              showPresets ? 'md:min-w-[860px] md:flex-row' : 'md:w-[572px]'
            }`}
          >
            {showPresets ? (
              <div className="border-b border-slate-100 bg-slate-50/70 md:w-[172px] md:border-b-0 md:border-r">
                <div className="flex flex-col gap-1 p-3">
                  {PRESET_OPTIONS.map((preset) => (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => handlePresetSelect(preset.key)}
                      className={`rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-colors ${
                        selectedPreset === preset.key
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-600 hover:bg-white hover:text-slate-900'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex flex-col divide-y divide-slate-100 md:flex-row md:divide-x md:divide-y-0">
                {renderCalendar(0)}
                {renderCalendar(1)}
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-5">
                <div className="text-xs font-medium text-slate-500">{tempRangeLabel}</div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleApply}
                    disabled={!tempRange.startDate || !tempRange.endDate}
                    className="rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Áp dụng
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedDateFilter;
