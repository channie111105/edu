import React from 'react';
import { X, Search } from 'lucide-react';
import { decodeMojibakeText } from '../utils/mojibake';

export interface SearchFilter {
    field: string;
    label: string;
    value: string;
    color?: string;
    matchMode?: 'includes' | 'equals';
}

interface SmartSearchBarProps {
    filters: SearchFilter[];
    onAddFilter: (filter: SearchFilter) => void;
    onRemoveFilter: (index: number) => void;
    onClearAll: () => void;
    activeField?: { field: string; label: string; color?: string } | null;
    onFieldFilterConsumed?: () => void;
    placeholder?: string;
    contextLabel?: string;
    compact?: boolean;
    fullWidth?: boolean;
}

const SmartSearchBar: React.FC<SmartSearchBarProps> = ({
    filters,
    onAddFilter,
    onRemoveFilter,
    onClearAll,
    activeField,
    onFieldFilterConsumed,
    placeholder = 'Tim kiem...',
    contextLabel,
    compact = false,
    fullWidth = false
}) => {
    const [inputValue, setInputValue] = React.useState('');
    const inputRef = React.useRef<HTMLInputElement | null>(null);
    const text = React.useCallback((value?: string) => decodeMojibakeText(String(value || '')), []);

    React.useEffect(() => {
        if (activeField || contextLabel) {
            inputRef.current?.focus();
        }
    }, [activeField, contextLabel]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && inputValue.trim()) {
            onAddFilter({
                field: activeField?.field || 'search',
                label: text(activeField?.label || 'Tìm kiếm'),
                value: inputValue.trim(),
                color: activeField?.color
            });
            onFieldFilterConsumed?.();
            setInputValue('');
        }
    };

    const resolvedPlaceholder = activeField
        ? `Nhập giá trị cho ${text(activeField.label).toLowerCase()}...`
        : contextLabel
            ? 'Nhập giá trị rồi nhấn Enter...'
            : text(placeholder);

    return (
        <div className={`relative flex-1 ${fullWidth ? 'max-w-none' : 'max-w-2xl'}`}>
            <Search size={compact ? 14 : 16} className={`absolute left-3 top-1/2 z-10 -translate-y-1/2 text-slate-400 ${compact ? 'text-slate-500' : ''}`} />

            <div className={`flex w-full items-center gap-1.5 border border-slate-200 bg-white pl-9 pr-10 focus-within:ring-2 focus-within:ring-blue-500 ${compact ? 'min-h-[34px] rounded-md py-1' : 'min-h-[38px] rounded-lg py-1.5'}`}>
                {contextLabel && (
                    <span className={`inline-flex items-center rounded border border-slate-600 bg-slate-700 text-white ${compact ? 'px-1.5 py-0.5 text-[10px] font-semibold' : 'px-2 py-0.5 text-xs font-bold'}`}>
                        {text(contextLabel)}
                    </span>
                )}

                {activeField && (
                    <span className={`inline-flex items-center rounded border border-emerald-200 bg-emerald-100 text-emerald-700 ${compact ? 'px-1.5 py-0.5 text-[10px] font-semibold' : 'px-2 py-0.5 text-xs font-bold'}`}>
                        {text('Bộ lọc')}: {text(activeField.label)}
                    </span>
                )}

                {filters.map((filter, index) => (
                    <div
                        key={index}
                        className={`inline-flex items-center gap-1.5 rounded border border-current border-opacity-20 font-medium ${filter.color || 'bg-blue-100 text-blue-700'} ${compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'}`}
                    >
                        {filter.label ? (
                            <span className={`opacity-70 uppercase tracking-wide ${compact ? 'text-[9px]' : 'text-[10px]'}`}>{text(filter.label)}:</span>
                        ) : null}
                        <span className="font-semibold">{text(filter.value)}</span>
                        <button
                            onClick={() => onRemoveFilter(index)}
                            className="ml-0.5 rounded p-0.5 hover:bg-black hover:bg-opacity-10"
                            title={text('Xóa bộ lọc')}
                        >
                            <X size={12} />
                        </button>
                    </div>
                ))}

                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={resolvedPlaceholder}
                    className={`min-w-[120px] flex-1 bg-transparent outline-none ${compact ? 'text-[12px]' : 'text-sm'}`}
                />
            </div>

            {filters.length > 0 && (
                <button
                    onClick={onClearAll}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 ${compact ? 'text-slate-500' : ''}`}
                    title={text('Xóa tất cả bộ lọc')}
                >
                    <X size={compact ? 14 : 16} />
                </button>
            )}
        </div>
    );
};

export default SmartSearchBar;
