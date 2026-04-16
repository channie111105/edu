import React from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, MapPin, Package, ShieldCheck } from 'lucide-react';

export type DateRangeType =
    | 'today'
    | 'yesterday'
    | '30days'
    | 'thisMonth'
    | 'lastMonth'
    | 'thisQuarter'
    | 'thisYear'
    | 'custom';

export type LocationType = 'all' | 'hanoi' | 'hcm' | 'danang';
export type ProductFilterType = 'all' | string;
export type VerificationFilterType = 'all' | 'verified' | 'unverified';

export interface DateOption {
    value: DateRangeType;
    label: string;
}

export interface SelectOption {
    value: string;
    label: string;
}

interface DashboardFiltersProps {
    dateRange: DateRangeType;
    onDateRangeChange: (range: DateRangeType) => void;
    location: LocationType;
    onLocationChange: (loc: LocationType) => void;
    customDate?: string;
    onCustomDateChange?: (date: string) => void;
    title?: string;
    subtitle?: string;
    dateOptions?: DateOption[];
    product?: ProductFilterType;
    onProductChange?: (product: ProductFilterType) => void;
    productOptions?: SelectOption[];
    verification?: VerificationFilterType;
    onVerificationChange?: (verification: VerificationFilterType) => void;
    verificationOptions?: SelectOption[];
    compact?: boolean;
}

const DashboardFilters: React.FC<DashboardFiltersProps> = ({
    dateRange,
    onDateRangeChange,
    location,
    onLocationChange,
    customDate,
    onCustomDateChange,
    title,
    subtitle,
    dateOptions,
    product = 'all',
    onProductChange,
    productOptions,
    verification = 'all',
    onVerificationChange,
    verificationOptions,
    compact
}) => {
    const { i18n } = useTranslation('common');
    const isEnglish = i18n.resolvedLanguage === 'en';
    const defaultDateOptions: DateOption[] = [
        { value: 'today', label: isEnglish ? 'Today' : 'Hôm nay' },
        { value: 'yesterday', label: isEnglish ? 'Yesterday' : 'Hôm qua' },
        { value: '30days', label: isEnglish ? 'Last 30 days' : '30 ngày qua' },
        { value: 'thisMonth', label: isEnglish ? 'This month' : 'Tháng này' },
        { value: 'thisQuarter', label: isEnglish ? 'This quarter' : 'Quý này' },
        { value: 'thisYear', label: isEnglish ? 'This year' : 'Năm nay' },
        { value: 'custom', label: isEnglish ? 'Pick a date...' : 'Chọn ngày cụ thể...' }
    ];

    const renderedDateOptions = dateOptions && dateOptions.length > 0 ? dateOptions : defaultDateOptions;
    const renderedProductOptions = productOptions && productOptions.length > 0
        ? productOptions
        : [{ value: 'all', label: isEnglish ? 'All products' : 'Tất cả sản phẩm' }];
    const renderedVerificationOptions = verificationOptions && verificationOptions.length > 0
        ? verificationOptions
        : [
            { value: 'all', label: isEnglish ? 'All verification' : 'Tất cả xác thực' },
            { value: 'verified', label: isEnglish ? 'Verified' : 'Đã xác thực' },
            { value: 'unverified', label: isEnglish ? 'Unverified' : 'Chưa xác thực' }
        ];
    const showProductFilter = Boolean(onProductChange);
    const showVerificationFilter = Boolean(onVerificationChange);

    return (
        <div className={`flex flex-col md:flex-row justify-between items-start gap-4 w-full ${compact ? 'mb-4' : 'mb-8'}`}>
            <div className="animate-in fade-in slide-in-from-left-4 duration-500 min-w-0 flex-1">
                {title && <h2 className={`${compact ? 'text-xl' : 'text-2xl'} font-bold text-slate-900 truncate`}>{title}</h2>}
                {subtitle && <p className={`text-slate-500 mt-1 ${compact ? 'text-xs' : 'text-sm'}`}>{subtitle}</p>}
            </div>

            <div className="flex flex-wrap items-center gap-4 md:ml-auto shrink-0">
                <div className="flex items-center gap-4 bg-white border border-slate-200 px-4 py-2 rounded-full shadow-sm">
                    <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
                        <Calendar size={16} className="text-slate-500" />
                        <div className="flex items-center gap-2">
                            <select
                                value={dateRange}
                                onChange={(e) => onDateRangeChange(e.target.value as DateRangeType)}
                                className="bg-transparent border-none text-sm font-bold focus:ring-0 cursor-pointer outline-none text-slate-700 min-w-[120px]"
                            >
                                {renderedDateOptions.map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>

                            {dateRange === 'custom' && (
                                <input
                                    type="date"
                                    value={customDate || ''}
                                    onChange={(e) => onCustomDateChange?.(e.target.value)}
                                    className="bg-slate-50 border-none text-sm font-medium focus:ring-0 cursor-pointer outline-none text-slate-700 p-0 h-6 px-1 rounded shadow-inner"
                                />
                            )}
                        </div>
                    </div>
                    <div className={`flex items-center gap-2 ${showProductFilter || showVerificationFilter ? 'border-r border-slate-200 pr-4' : ''}`}>
                        <MapPin size={16} className="text-slate-500" />
                        <select
                            value={location}
                            onChange={(e) => onLocationChange(e.target.value as LocationType)}
                            className="bg-transparent border-none text-sm font-bold focus:ring-0 cursor-pointer outline-none text-slate-700"
                        >
                            <option value="all">{isEnglish ? 'All branches' : 'Tất cả chi nhánh'}</option>
                            <option value="hanoi">{isEnglish ? 'Hanoi' : 'Hà Nội'}</option>
                            <option value="hcm">{isEnglish ? 'Ho Chi Minh City' : 'Hồ Chí Minh'}</option>
                            <option value="danang">{isEnglish ? 'Da Nang' : 'Đà Nẵng'}</option>
                        </select>
                    </div>

                    {showProductFilter && (
                        <div className={`flex items-center gap-2 ${showVerificationFilter ? 'border-r border-slate-200 pr-4' : ''}`}>
                            <Package size={16} className="text-slate-500" />
                            <select
                                value={product}
                                onChange={(e) => onProductChange?.(e.target.value as ProductFilterType)}
                                className="bg-transparent border-none text-sm font-bold focus:ring-0 cursor-pointer outline-none text-slate-700"
                            >
                                {renderedProductOptions.map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {showVerificationFilter && (
                        <div className="flex items-center gap-2">
                            <ShieldCheck size={16} className="text-slate-500" />
                            <select
                                value={verification}
                                onChange={(e) => onVerificationChange?.(e.target.value as VerificationFilterType)}
                                className="bg-transparent border-none text-sm font-bold focus:ring-0 cursor-pointer outline-none text-slate-700"
                            >
                                {renderedVerificationOptions.map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DashboardFilters;
