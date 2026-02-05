import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Filter as FilterIcon, Users } from 'lucide-react';

export type FilterType = 'filter' | 'groupby';

export interface SearchFilter {
    field: string;
    label: string;
    value: string;
    type: FilterType; // 'filter' or 'groupby'
    color?: string;
}

export interface SearchFieldConfig {
    field: string;
    label: string;
    category: string; // e.g., "Thông tin khách hàng", "Giai đoạn", "Người phụ trách"
    type: FilterType;
    icon?: React.ReactNode;
}

interface OdooSearchBarProps {
    filters: SearchFilter[];
    onAddFilter: (filter: SearchFilter) => void;
    onRemoveFilter: (index: number) => void;
    onClearAll: () => void;
    contextLabel?: string;
    searchFields: SearchFieldConfig[]; // Available fields for searching
}

const OdooSearchBar: React.FC<OdooSearchBarProps> = ({
    filters,
    onAddFilter,
    onRemoveFilter,
    onClearAll,
    contextLabel,
    searchFields
}) => {
    const [inputValue, setInputValue] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [suggestions, setSuggestions] = useState<SearchFieldConfig[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Update suggestions based on input
    useEffect(() => {
        if (inputValue.trim().length > 0) {
            // Filter search fields that match input
            const filtered = searchFields.filter(field =>
                field.label.toLowerCase().includes(inputValue.toLowerCase()) ||
                field.category.toLowerCase().includes(inputValue.toLowerCase())
            );
            setSuggestions(filtered);
            setShowDropdown(filtered.length > 0);
        } else {
            setSuggestions([]);
            setShowDropdown(false);
        }
    }, [inputValue, searchFields]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node) &&
                !inputRef.current?.contains(event.target as Node)
            ) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelectSuggestion = (field: SearchFieldConfig) => {
        onAddFilter({
            field: field.field,
            label: field.label,
            value: inputValue.trim(),
            type: field.type,
            color: getColorForType(field.type)
        });
        setInputValue('');
        setShowDropdown(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && inputValue.trim()) {
            // If no suggestion selected, use first one or general search
            if (suggestions.length > 0) {
                handleSelectSuggestion(suggestions[0]);
            } else {
                // General search
                onAddFilter({
                    field: 'search',
                    label: 'Tìm kiếm',
                    value: inputValue.trim(),
                    type: 'filter',
                    color: 'bg-blue-100 text-blue-700'
                });
                setInputValue('');
            }
        } else if (e.key === 'Escape') {
            setShowDropdown(false);
        }
    };

    const getColorForType = (type: FilterType): string => {
        if (type === 'filter') return 'bg-blue-100 text-blue-700 border-blue-300';
        if (type === 'groupby') return 'bg-amber-100 text-amber-700 border-amber-300';
        return 'bg-slate-100 text-slate-700 border-slate-300';
    };

    const getIconForType = (type: FilterType) => {
        if (type === 'filter') return <FilterIcon size={10} />;
        if (type === 'groupby') return <Users size={10} />;
        return null;
    };

    // Group suggestions by category
    const groupedSuggestions = suggestions.reduce((acc, field) => {
        if (!acc[field.category]) acc[field.category] = [];
        acc[field.category].push(field);
        return acc;
    }, {} as Record<string, SearchFieldConfig[]>);

    return (
        <div className="relative flex-1 max-w-3xl">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />

            <div className="flex items-center gap-1.5 w-full pl-9 pr-10 py-1.5 border border-slate-200 rounded-lg bg-white focus-within:ring-2 focus-within:ring-blue-500 min-h-[40px] flex-wrap">
                {/* Context Label Badge */}
                {contextLabel && (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-slate-700 text-white border border-slate-600 shrink-0">
                        {contextLabel}
                    </span>
                )}

                {/* Filter Tags */}
                {filters.map((filter, index) => (
                    <div
                        key={index}
                        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium border shrink-0 ${filter.color || getColorForType(filter.type)
                            }`}
                    >
                        {getIconForType(filter.type)}
                        <span className="opacity-70 text-[10px] uppercase tracking-wide">{filter.label}:</span>
                        <span className="font-bold">{filter.value}</span>
                        <button
                            onClick={() => onRemoveFilter(index)}
                            className="ml-0.5 hover:bg-black hover:bg-opacity-10 rounded p-0.5"
                            title="Xóa filter"
                        >
                            <X size={11} />
                        </button>
                    </div>
                ))}

                {/* Input */}
                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => inputValue.trim().length > 0 && setShowDropdown(true)}
                    placeholder={filters.length === 0 && !contextLabel ? "Tìm kiếm hoặc lọc..." : ""}
                    className="flex-1 min-w-[150px] outline-none text-sm bg-transparent"
                />
            </div>

            {/* Dropdown Suggestions */}
            {showDropdown && suggestions.length > 0 && (
                <div
                    ref={dropdownRef}
                    className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-[400px] overflow-y-auto"
                >
                    {Object.entries(groupedSuggestions).map(([category, fields]) => (
                        <div key={category} className="border-b border-slate-100 last:border-0">
                            <div className="px-3 py-2 bg-slate-50 text-xs font-bold text-slate-600 uppercase tracking-wide sticky top-0">
                                {category}
                            </div>
                            {fields.map((field, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleSelectSuggestion(field)}
                                    className="w-full text-left px-4 py-2.5 hover:bg-blue-50 flex items-center gap-3 group transition-colors"
                                >
                                    <div className={`p-1.5 rounded ${getColorForType(field.type)}`}>
                                        {getIconForType(field.type)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-sm font-semibold text-slate-800 group-hover:text-blue-600">
                                            {field.label}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            Tìm "{inputValue}" trong {field.label}
                                        </div>
                                    </div>
                                    <div className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${getColorForType(field.type)}`}>
                                        {field.type === 'filter' ? 'Lọc' : 'Nhóm'}
                                    </div>
                                </button>
                            ))}
                        </div>
                    ))}
                </div>
            )}

            {/* Clear All Button */}
            {filters.length > 0 && (
                <button
                    onClick={onClearAll}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
                    title="Xóa tất cả filters"
                >
                    <X size={16} />
                </button>
            )}
        </div>
    );
};

export default OdooSearchBar;
