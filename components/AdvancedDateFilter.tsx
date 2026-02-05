import React, { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronDown, Check, ChevronLeft, ChevronRight, X } from 'lucide-react';

export type DateRange = {
    startDate: Date | null;
    endDate: Date | null;
    label?: string;
};

interface AdvancedDateFilterProps {
    onChange: (range: DateRange) => void;
    label?: string;
}

const PRESETS = [
    { label: 'Hôm nay', id: 'today' },
    { label: 'Hôm qua', id: 'yesterday' },
    { label: 'Tuần này', id: 'this_week' },
    { label: '7 ngày qua', id: 'last_7_days' },
    { label: '30 ngày qua', id: 'last_30_days' },
    { label: 'Tháng này', id: 'this_month' },
    { label: 'Tháng trước', id: 'last_month' },
    { label: 'Tùy chỉnh', id: 'custom' },
];

// Helper to generate calendar days
const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay(); // 0 = Sunday
};

const AdvancedDateFilter: React.FC<AdvancedDateFilterProps> = ({ onChange, label = "Sắp xếp thời gian" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedPreset, setSelectedPreset] = useState('this_month');
    const [tempRange, setTempRange] = useState<DateRange>({ startDate: null, endDate: null, label: 'Tháng này' });
    const [confirmedRange, setConfirmedRange] = useState<DateRange>({ startDate: null, endDate: null, label: 'Tháng này' });

    // Calendar Navigation State
    const [viewDate, setViewDate] = useState(new Date()); // Controls the month being viewed
    const containerRef = useRef<HTMLDivElement>(null);

    // Initialize with "This Month"
    useEffect(() => {
        applyPreset('this_month', false);
    }, []);

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const applyPreset = (presetId: string, confirm = true) => {
        const now = new Date();
        let start = new Date();
        let end = new Date();
        let label = '';

        // Reset hours
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        switch (presetId) {
            case 'today':
                label = 'Hôm nay';
                break;
            case 'yesterday':
                start.setDate(now.getDate() - 1);
                end.setDate(now.getDate() - 1);
                label = 'Hôm qua';
                break;
            case 'this_week':
                const day = now.getDay() || 7; // CN = 0 -> 7
                start.setDate(now.getDate() - day + 1);
                end.setDate(start.getDate() + 6);
                label = 'Tuần này';
                break;
            case 'last_7_days':
                start.setDate(now.getDate() - 6);
                label = '7 ngày qua';
                break;
            case 'last_30_days':
                start.setDate(now.getDate() - 29);
                label = '30 ngày qua';
                break;
            case 'this_month':
                start.setDate(1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                end.setHours(23, 59, 59, 999);
                label = 'Tháng này';
                break;
            case 'last_month':
                start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                end = new Date(now.getFullYear(), now.getMonth(), 0);
                end.setHours(23, 59, 59, 999);
                label = 'Tháng trước';
                break;
            case 'overdue':
                // Overdue logic: From beginning of time to NOW
                start = new Date(0); // Epoch
                end = new Date(); // Now
                label = 'Quá hạn';
                break;
            case 'custom':
                label = 'Tùy chỉnh';
                break;
        }

        const newRange = { startDate: start, endDate: end, label };
        setTempRange(newRange);
        setSelectedPreset(presetId);

        // Sync view date to start date of range
        if (start) setViewDate(new Date(start));

        if (confirm && presetId !== 'custom') {
            handleApply(newRange);
        }
    };

    const handleApply = (range: DateRange) => {
        setConfirmedRange(range);
        onChange(range);
        setIsOpen(false);
    };

    const navMonth = (offset: number) => {
        const newDate = new Date(viewDate);
        newDate.setMonth(newDate.getMonth() + offset);
        setViewDate(newDate);
    };

    const isDateInRange = (date: Date) => {
        if (!tempRange.startDate || !tempRange.endDate) return false;
        // Normalize logic
        const d = new Date(date); d.setHours(0, 0, 0, 0);
        const s = new Date(tempRange.startDate); s.setHours(0, 0, 0, 0);
        const e = new Date(tempRange.endDate); e.setHours(0, 0, 0, 0);
        return d >= s && d <= e;
    };

    const isDateSelected = (date: Date) => {
        if (!tempRange.startDate) return false;
        const d = new Date(date).setHours(0, 0, 0, 0);
        const s = new Date(tempRange.startDate).setHours(0, 0, 0, 0);
        const e = tempRange.endDate ? new Date(tempRange.endDate).setHours(0, 0, 0, 0) : null;
        return d === s || d === e;
    };

    const handleDateClick = (date: Date) => {
        setSelectedPreset('custom');
        let newRange = { ...tempRange, label: 'Tùy chỉnh' };

        // Logic for range selection
        if (!newRange.startDate || (newRange.startDate && newRange.endDate)) {
            // Start new selection
            newRange.startDate = date;
            newRange.endDate = null;
        } else {
            // Complete selection
            if (date < newRange.startDate) {
                newRange.endDate = newRange.startDate;
                newRange.startDate = date;
            } else {
                newRange.endDate = date;
            }
            // Set end of day for end date
            if (newRange.endDate) newRange.endDate.setHours(23, 59, 59, 999);
        }
        setTempRange(newRange);
    };

    const renderCalendar = (offsetMonth: number) => {
        const currentMonthDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + offsetMonth, 1);
        const year = currentMonthDate.getFullYear();
        const month = currentMonthDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);

        const days = [];
        // Padding empty days
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-8 w-8"></div>);
        }

        // Days
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(year, month, d);
            const isSelected = isDateSelected(date);
            const inRange = isDateInRange(date);
            const isToday = new Date().toDateString() === date.toDateString();

            days.push(
                <button
                    key={d}
                    onClick={() => handleDateClick(date)}
                    className={`h-8 w-8 text-xs rounded-full flex items-center justify-center transition-colors relative z-10
                    ${isSelected ? 'bg-blue-600 text-white font-bold' : ''}
                    ${!isSelected && inRange ? 'bg-blue-50 text-blue-700 rounded-none' : ''}
                    ${!isSelected && !inRange ? 'hover:bg-slate-100 text-slate-700' : ''}
                    ${isToday && !isSelected && !inRange ? 'border border-blue-400 font-bold text-blue-600' : ''}
                    ${isSelected && inRange && date.getTime() === tempRange.startDate?.setHours(0, 0, 0, 0) ? 'rounded-r-none' : ''}
                    ${isSelected && inRange && tempRange.endDate && date.getTime() === tempRange.endDate?.setHours(0, 0, 0, 0) ? 'rounded-l-none' : ''}
                `}
                >
                    {d}
                </button>
            );
        }

        return (
            <div className="w-64 p-2">
                <div className="text-center font-bold text-slate-700 mb-2 text-sm">
                    Tháng {month + 1}, {year}
                </div>
                <div className="grid grid-cols-7 gap-y-1 text-center mb-1">
                    {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(d => (
                        <span key={d} className="text-[10px] uppercase font-bold text-slate-400">{d}</span>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-y-1 justify-items-center">
                    {days}
                </div>
            </div>
        );
    };

    return (
        <div className="relative" ref={containerRef}>
            {/* TRIGGER BUTTON */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold hover:bg-slate-50 transition-all ${isOpen ? 'ring-2 ring-blue-100 border-blue-400' : 'border-slate-200 bg-white text-slate-600'}`}
            >
                <span className="text-slate-500">{label}:</span>
                <span className="font-bold text-slate-800">
                    {confirmedRange.startDate?.toLocaleDateString('vi-VN')} - {confirmedRange.endDate?.toLocaleDateString('vi-VN')}
                </span>
                <ChevronDown size={14} className="text-slate-400" />
            </button>

            {/* POPOVER */}
            {isOpen && (
                <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-2xl border border-slate-200 z-50 flex overflow-hidden animate-in fade-in zoom-in-95 origin-top-right">

                    {/* LEFT: PRESETS SIDEBAR */}
                    <div className="w-40 border-r border-slate-100 p-2 bg-slate-50 flex flex-col gap-1">
                        {PRESETS.map(p => (
                            <button
                                key={p.id}
                                onClick={() => applyPreset(p.id)}
                                className={`text-left px-3 py-2 rounded text-xs transition-colors flex justify-between items-center ${selectedPreset === p.id
                                    ? 'bg-blue-100 text-blue-700 font-bold'
                                    : 'hover:bg-slate-100 text-slate-600'
                                    }`}
                            >
                                {p.label}
                                {selectedPreset === p.id && <Check size={12} />}
                            </button>
                        ))}
                    </div>

                    {/* RIGHT: CALENDARS & ACTIONS */}
                    <div className="flex flex-col">
                        {/* CALENDAR HEADER */}
                        <div className="flex items-center justify-between p-2 border-b border-slate-100">
                            <button onClick={() => navMonth(-1)} className="p-1 hover:bg-slate-100 rounded text-slate-500"><ChevronLeft size={16} /></button>
                            <button onClick={() => navMonth(1)} className="p-1 hover:bg-slate-100 rounded text-slate-500"><ChevronRight size={16} /></button>
                        </div>

                        {/* CALENDARS GRID */}
                        <div className="flex divide-x divide-slate-100">
                            {renderCalendar(0)}
                            {renderCalendar(1)}
                        </div>

                        {/* FOOTER ACTIONS */}
                        <div className="p-3 border-t border-slate-100 flex items-center justify-between bg-white">
                            <div className="text-xs text-slate-500">
                                {tempRange.startDate ? tempRange.startDate.toLocaleDateString('vi-VN') : '...'}
                                {' - '}
                                {tempRange.endDate ? tempRange.endDate.toLocaleDateString('vi-VN') : '...'}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded border border-transparent"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    onClick={() => handleApply(tempRange)}
                                    disabled={!tempRange.startDate || !tempRange.endDate}
                                    className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                >
                                    Áp dụng
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdvancedDateFilter;
