import React from 'react';
import { ChevronDown, Filter, Users, X } from 'lucide-react';
import { ToolbarOption, ToolbarValueOption } from '../../utils/filterToolbar';

interface AdvancedFilterDropdownProps {
  isOpen: boolean;
  activeCount: number;
  hasActiveFilters: boolean;
  filterOptions: ReadonlyArray<ToolbarOption>;
  groupOptions: ReadonlyArray<ToolbarOption>;
  selectedFilterFieldIds: string[];
  selectedGroupFieldIds: string[];
  activeFilterField: ToolbarOption | null;
  selectableValues: ReadonlyArray<ToolbarValueOption>;
  selectedFilterValue: string;
  selectedFilterValuesByField?: Readonly<Record<string, string>>;
  selectableValuesByField?: Readonly<Record<string, ReadonlyArray<ToolbarValueOption>>>;
  onOpenChange: (open: boolean) => void;
  onToggleFilterField: (fieldId: string) => void;
  onToggleGroupField: (fieldId: string) => void;
  onFilterValueChange: (value: string) => void;
  onFilterValueChangeForField?: (fieldId: string, value: string) => void;
  onClearAll?: () => void;
  triggerLabel?: string;
  filterDescription?: string;
  groupDescription?: string;
  filterSectionLabel?: string;
  groupSectionLabel?: string;
  filterValueTitle?: string;
  filterValueHint?: string;
  filterFieldHint?: string;
  getSelectPlaceholder?: (field: ToolbarOption, selectableValues: ReadonlyArray<ToolbarValueOption>) => string;
  className?: string;
  triggerClassName?: string;
  panelClassName?: string;
  panelAlign?: 'left' | 'right';
}

const defaultSelectPlaceholder = (
  field: ToolbarOption,
  selectableValues: ReadonlyArray<ToolbarValueOption>
) => (
  selectableValues.length > 0
    ? `Chọn ${field.label.toLowerCase()}...`
    : `Không có dữ liệu cho ${field.label.toLowerCase()}`
);

const AdvancedFilterDropdown: React.FC<AdvancedFilterDropdownProps> = ({
  isOpen,
  activeCount,
  hasActiveFilters,
  filterOptions,
  groupOptions,
  selectedFilterFieldIds,
  selectedGroupFieldIds,
  activeFilterField,
  selectableValues,
  selectedFilterValue,
  selectedFilterValuesByField,
  selectableValuesByField,
  onOpenChange,
  onToggleFilterField,
  onToggleGroupField,
  onFilterValueChange,
  onFilterValueChangeForField,
  onClearAll,
  triggerLabel = 'Lọc nâng cao',
  filterDescription = 'Chọn một hoặc nhiều trường lọc rồi chọn giá trị tương ứng để áp dụng nhanh bộ lọc.',
  groupDescription = 'Có thể chọn nhiều trường. Thứ tự bấm sẽ là thứ tự ghép nhóm hiển thị trong bảng.',
  filterSectionLabel = 'Bộ lọc',
  groupSectionLabel = 'Nhóm theo',
  filterValueTitle = 'Giá trị lọc',
  filterValueHint = 'Chọn một giá trị cho từng trường vừa chọn để áp dụng bộ lọc.',
  filterFieldHint = 'Chọn một hoặc nhiều trường lọc ở danh sách bên trên để hiển thị toàn bộ giá trị có sẵn.',
  getSelectPlaceholder = defaultSelectPlaceholder,
  className = '',
  triggerClassName = '',
  panelClassName = '',
  panelAlign = 'right'
}) => {
  const hasGroupSection = groupOptions.length > 0;
  const panelPositionClass = panelAlign === 'left' ? 'left-0' : 'right-0';
  const selectedFilterFields = selectedFilterFieldIds
    .map((fieldId) => filterOptions.find((option) => option.id === fieldId))
    .filter((option): option is ToolbarOption => Boolean(option));
  const resolvedSelectedFilterValuesByField =
    selectedFilterValuesByField ??
    (activeFilterField ? { [activeFilterField.id]: selectedFilterValue } : {});
  const resolvedSelectableValuesByField =
    selectableValuesByField ??
    (activeFilterField ? { [activeFilterField.id]: selectableValues } : {});
  const singleFieldSelectableCount =
    selectedFilterFields.length === 1
      ? (resolvedSelectableValuesByField[selectedFilterFields[0].id] || []).length
      : 0;

  return (
    <div className={`relative ${className}`.trim()}>
      <button
        onClick={() => onOpenChange(!isOpen)}
        className={`inline-flex items-center gap-1 rounded-sm border px-2 py-1 text-[11px] font-semibold transition-colors ${isOpen ? 'border-slate-300 bg-slate-100 text-slate-900' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'} ${triggerClassName}`.trim()}
      >
        <Filter size={13} /> {triggerLabel}
        {activeCount > 0 ? (
          <span className="min-w-[18px] rounded-full bg-blue-600 px-1.5 py-0.5 text-center text-xs font-bold text-white">
            {activeCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <>
          <div className="fixed inset-0 z-30" onClick={() => onOpenChange(false)}></div>
          <div
            className={`custom-scrollbar absolute top-full z-40 mt-2 max-h-[70vh] max-w-[calc(100vw-2rem)] animate-in overflow-y-auto overscroll-y-contain rounded-lg border border-slate-200 bg-white p-4 shadow-xl fade-in zoom-in-95 ${panelPositionClass} ${hasGroupSection ? 'w-[720px]' : 'w-[360px]'} ${panelClassName}`.trim()}
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div className={`grid gap-4 text-sm ${hasGroupSection ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <div className={hasGroupSection ? 'border-r border-slate-100 pr-2' : ''}>
                <div className="mb-3 flex items-center gap-2 font-bold text-slate-800">
                  <Filter size={14} /> {filterSectionLabel}
                </div>
                <p className="mb-3 text-xs text-slate-500">
                  {filterDescription}
                </p>
                <div
                  className="custom-scrollbar max-h-[360px] space-y-1 overflow-y-auto overscroll-y-contain"
                  style={{ WebkitOverflowScrolling: 'touch' }}
                >
                  {filterOptions.map((option) => (
                    <button
                      key={`filter-${option.id}`}
                      onClick={() => onToggleFilterField(option.id)}
                      className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${selectedFilterFieldIds.includes(option.id) ? 'border-emerald-200 bg-emerald-50 font-semibold text-emerald-700' : 'border-transparent text-slate-700 hover:bg-slate-50'}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-emerald-700">
                      {filterValueTitle}
                    </div>
                    {selectedFilterFields.length > 0 ? (
                      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        {selectedFilterFields.length > 1 ? `${selectedFilterFields.length} trường` : `${singleFieldSelectableCount} giá trị`}
                      </span>
                    ) : null}
                  </div>

                  {selectedFilterFields.length > 0 ? (
                    <>
                      <div className="space-y-3">
                        {selectedFilterFields.map((field) => {
                          const fieldSelectableValues = resolvedSelectableValuesByField[field.id] || [];
                          const fieldValue = resolvedSelectedFilterValuesByField[field.id] || '';

                          return (
                            <div key={`filter-value-${field.id}`}>
                              <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-emerald-700">
                                {field.label}
                              </div>
                              <div className="relative">
                                <select
                                  value={fieldValue}
                                  onChange={(event) => {
                                    if (onFilterValueChangeForField) {
                                      onFilterValueChangeForField(field.id, event.target.value);
                                      return;
                                    }

                                    onFilterValueChange(event.target.value);
                                  }}
                                  className="w-full appearance-none rounded-lg border border-emerald-200 bg-white px-3 py-2.5 pr-9 text-sm text-slate-700 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                                  disabled={fieldSelectableValues.length === 0}
                                >
                                  <option value="">
                                    {getSelectPlaceholder(field, fieldSelectableValues)}
                                  </option>
                                  {fieldSelectableValues.map((option) => (
                                    <option key={`${field.id}-${option.value}`} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                                <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        {filterValueHint}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-slate-500">
                      {filterFieldHint}
                    </p>
                  )}
                </div>
              </div>

              {hasGroupSection ? (
                <div className="pl-2">
                  <div className="mb-3 flex items-center gap-2 font-bold text-slate-800">
                    <Users size={14} /> {groupSectionLabel}
                  </div>
                  <p className="mb-3 text-xs text-slate-500">
                    {groupDescription}
                  </p>
                  <div
                    className="custom-scrollbar max-h-[360px] space-y-1 overflow-y-auto overscroll-y-contain"
                    style={{ WebkitOverflowScrolling: 'touch' }}
                  >
                    {groupOptions.map((option) => (
                      <button
                        key={`group-${option.id}`}
                        onClick={() => onToggleGroupField(option.id)}
                        className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors ${selectedGroupFieldIds.includes(option.id) ? 'border-blue-200 bg-blue-50 font-semibold text-blue-700' : 'border-transparent text-slate-700 hover:bg-slate-50'}`}
                      >
                        <span className="flex-1">{option.label}</span>
                        {selectedGroupFieldIds.includes(option.id) ? (
                          <span className="rounded-full border border-blue-100 bg-white px-2 py-0.5 text-[10px] font-bold text-blue-700">
                            {selectedGroupFieldIds.indexOf(option.id) + 1}
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </>
      ) : null}

      {hasActiveFilters && onClearAll ? (
        <button
          onClick={(event) => {
            event.stopPropagation();
            onClearAll();
          }}
          className="absolute -right-1 -top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white shadow-lg hover:bg-red-600"
          title="Xóa tất cả bộ lọc"
        >
          <X size={12} strokeWidth={3} />
        </button>
      ) : null}
    </div>
  );
};

export default AdvancedFilterDropdown;
