import React from 'react';
import { Calendar, ChevronDown, ChevronRight } from 'lucide-react';
import {
  CustomDateRange,
  ToolbarOption,
  formatCustomDateRangeLabel,
  getTimePresetLabel,
} from '../../utils/filterToolbar';

interface ToolbarTimeFilterProps {
  isOpen: boolean;
  fieldOptions: ReadonlyArray<ToolbarOption>;
  selectedField: string;
  selectedRangeType: string;
  customRange: CustomDateRange | null;
  presets: ReadonlyArray<ToolbarOption>;
  showFieldSelector?: boolean;
  fieldGroupLabel?: string;
  fieldPlaceholderValue?: string;
  fieldPlaceholderLabel?: string;
  collapseFieldGroupLabelWhenPlaceholder?: boolean;
  collapseFieldGroupLabelWhenSelected?: boolean;
  onOpenChange: (open: boolean) => void;
  onFieldChange: (fieldId: string) => void;
  onPresetSelect: (presetId: string) => void;
  onCustomRangeChange: (range: CustomDateRange | null) => void;
  onReset: () => void;
  onApplyCustomRange: () => void;
  onCancel?: () => void;
  className?: string;
  controlClassName?: string;
  fieldSectionClassName?: string;
  fieldSelectClassName?: string;
  rangeButtonClassName?: string;
  panelAlign?: 'left' | 'right';
}

const ToolbarTimeFilter: React.FC<ToolbarTimeFilterProps> = ({
  isOpen,
  fieldOptions,
  selectedField,
  selectedRangeType,
  customRange,
  presets,
  showFieldSelector = true,
  fieldGroupLabel,
  fieldPlaceholderValue,
  fieldPlaceholderLabel,
  collapseFieldGroupLabelWhenPlaceholder = false,
  collapseFieldGroupLabelWhenSelected = false,
  onOpenChange,
  onFieldChange,
  onPresetSelect,
  onCustomRangeChange,
  onReset,
  onApplyCustomRange,
  onCancel,
  className = '',
  controlClassName = '',
  fieldSectionClassName = '',
  fieldSelectClassName = '',
  rangeButtonClassName = '',
  panelAlign = 'right'
}) => {
  const customRangeLabel = formatCustomDateRangeLabel(customRange);
  const isPlaceholderSelected = fieldPlaceholderValue !== undefined && selectedField === fieldPlaceholderValue;
  const isSpecificFieldSelected = !isPlaceholderSelected;
  const showFieldGroupLabel =
    Boolean(fieldGroupLabel) &&
    !(collapseFieldGroupLabelWhenPlaceholder && isPlaceholderSelected) &&
    !(collapseFieldGroupLabelWhenSelected && isSpecificFieldSelected);
  const panelPositionClass = panelAlign === 'left' ? 'left-0' : 'right-0';

  return (
    <div className={`relative ${className}`.trim()}>
      <div
        className={`flex items-stretch overflow-hidden rounded-sm border border-slate-200 bg-white transition-colors hover:border-slate-300 ${controlClassName}`.trim()}
      >
        {showFieldSelector ? (
          <div className={`flex items-stretch border-r border-slate-200 bg-slate-50 ${fieldSectionClassName}`.trim()}>
            {showFieldGroupLabel ? (
              <span className="flex items-center border-r border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                {fieldGroupLabel}
              </span>
            ) : null}
            <div className="relative flex min-h-full items-center pl-2.5 pr-7">
              <select
                value={selectedField}
                onChange={(event) => onFieldChange(event.target.value)}
                className={`h-full cursor-pointer appearance-none bg-transparent py-1 text-[11px] font-semibold text-slate-700 outline-none ${fieldSelectClassName}`.trim()}
              >
                {fieldPlaceholderValue !== undefined && fieldPlaceholderLabel ? (
                  <option value={fieldPlaceholderValue} hidden>
                    {fieldPlaceholderLabel}
                  </option>
                ) : null}
                {fieldOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
        ) : null}
        <button
          onClick={() => onOpenChange(!isOpen)}
          className={`flex min-h-full items-center gap-1.5 whitespace-nowrap px-2 py-1 text-[11px] font-semibold ${selectedRangeType !== 'all' ? 'bg-blue-50 text-blue-600' : 'text-slate-500'} ${rangeButtonClassName}`.trim()}
        >
          <Calendar size={14} />
          {getTimePresetLabel(presets, selectedRangeType)}
          {selectedRangeType === 'custom' && customRangeLabel ? (
            <span className="ml-1 rounded bg-blue-100 px-1 text-[10px]">
              {customRangeLabel}
            </span>
          ) : null}
          <ChevronRight size={12} className={`transition-transform ${isOpen ? 'rotate-90' : ''}`} />
        </button>
      </div>

      {isOpen ? (
        <>
          <div className="fixed inset-0 z-30" onClick={() => onOpenChange(false)}></div>
          <div
            className={`absolute top-full z-40 mt-2 flex w-[550px] max-w-[calc(100vw-2rem)] animate-in overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl slide-in-from-top-2 ${panelPositionClass}`.trim()}
          >
            <div className="w-40 shrink-0 space-y-1 border-r border-slate-100 bg-slate-50 p-2">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => onPresetSelect(preset.id)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-xs font-bold transition-all ${selectedRangeType === preset.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-200'}`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="flex flex-1 flex-col p-4">
              <div className="mb-4 text-xs font-black uppercase tracking-widest text-slate-400">
                Khoảng thời gian tùy chỉnh
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-[10px] font-bold text-slate-400">Từ ngày</label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold outline-none focus:border-blue-500"
                    value={customRange?.start || ''}
                    onChange={(event) =>
                      onCustomRangeChange({
                        start: event.target.value,
                        end: customRange?.end || event.target.value
                      })
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold text-slate-400">Đến ngày</label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold outline-none focus:border-blue-500"
                    value={customRange?.end || ''}
                    onChange={(event) =>
                      onCustomRangeChange({
                        start: customRange?.start || event.target.value,
                        end: event.target.value
                      })
                    }
                  />
                </div>
              </div>

              <div className="mt-auto flex items-center justify-between bg-white pt-6">
                <button
                  onClick={onReset}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600"
                >
                  Làm lại
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={onCancel || (() => onOpenChange(false))}
                    className="rounded-lg px-4 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={onApplyCustomRange}
                    className="rounded-lg bg-blue-600 px-6 py-1.5 text-xs font-bold text-white shadow-lg shadow-blue-100 hover:bg-blue-700"
                  >
                    Áp dụng
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default ToolbarTimeFilter;
