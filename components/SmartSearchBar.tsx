import React from 'react';
import { X, Search } from 'lucide-react';

export interface SearchFilter {
    field: string;
    label: string;
    value: string;
    color?: string;
}

interface SmartSearchBarProps {
    filters: SearchFilter[];
    onAddFilter: (filter: SearchFilter) => void;
    onRemoveFilter: (index: number) => void;
    onClearAll: () => void;
    placeholder?: string;
    contextLabel?: string; // e.g., "@My Lead", "@Leads", "@Deals"
}

const SmartSearchBar: React.FC<SmartSearchBarProps> = ({
    filters,
    onAddFilter,
    onRemoveFilter,
    onClearAll,
    placeholder = "Tìm kiếm...",
    contextLabel
}) => {
    const [inputValue, setInputValue] = React.useState('');

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && inputValue.trim()) {
            // Add as a general search filter
            onAddFilter({
                field: 'search',
                label: 'Tìm kiếm',
                value: inputValue.trim()
            });
            setInputValue('');
        }
    };

    return (
        <div className="relative flex-1 max-w-2xl">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />

            <div className="flex items-center gap-1.5 w-full pl-9 pr-10 py-1.5 border border-slate-200 rounded-lg bg-white focus-within:ring-2 focus-within:ring-blue-500 min-h-[38px]">
                {/* Context Label Badge */}
                {contextLabel && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-700 text-white border border-slate-600">
                        {contextLabel}
                    </span>
                )}

                {/* Filter Chips */}
                {filters.map((filter, index) => (
                    <div
                        key={index}
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${filter.color || 'bg-blue-100 text-blue-700'
                            } border border-current border-opacity-20`}
                    >
                        <span className="opacity-70 text-[10px] uppercase tracking-wide">{filter.label}:</span>
                        <span className="font-semibold">{filter.value}</span>
                        <button
                            onClick={() => onRemoveFilter(index)}
                            className="ml-0.5 hover:bg-black hover:bg-opacity-10 rounded p-0.5"
                            title="Xóa filter"
                        >
                            <X size={12} />
                        </button>
                    </div>
                ))}

                {/* Input */}
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={filters.length === 0 && !contextLabel ? placeholder : ""}
                    className="flex-1 min-w-[120px] outline-none text-sm bg-transparent"
                />
            </div>

            {/* Clear All Button */}
            {filters.length > 0 && (
                <button
                    onClick={onClearAll}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
                    title="Xóa tất cả filters"
                >
                    <X size={16} />
                </button>
            )}
        </div>
    );
};

export default SmartSearchBar;
