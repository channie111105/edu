import React, { useEffect, useMemo, useState } from 'react';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';
import { Lock, DollarSign, MoreVertical, TrendingUp, FileText } from 'lucide-react';
import DashboardFilters, { DateOption, DateRangeType, LocationType } from '../components/DashboardFilters';
import { IQuotation, QuotationStatus } from '../types';
import { getQuotations } from '../utils/storage';

type TimeBucket = {
    key: string;
    label: string;
    start: Date;
    end: Date;
};

const FILTER_OPTIONS: DateOption[] = [
    { value: 'today', label: 'Hôm nay' },
    { value: 'thisMonth', label: 'Tháng này' },
    { value: 'lastMonth', label: 'Tháng trước' },
    { value: 'thisQuarter', label: 'Quý này' },
    { value: 'custom', label: 'Tùy chọn ngày' }
];

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const getRangeBounds = (range: DateRangeType, customDate?: string): { start: Date; end: Date } => {
    const now = new Date();

    if (range === 'today') {
        const start = startOfDay(now);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        return { start, end };
    }

    if (range === 'thisMonth') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        return { start, end };
    }

    if (range === 'lastMonth') {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 1);
        return { start, end };
    }

    if (range === 'thisQuarter') {
        const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
        const start = new Date(now.getFullYear(), quarterStartMonth, 1);
        const end = new Date(now.getFullYear(), quarterStartMonth + 3, 1);
        return { start, end };
    }

    const custom = customDate ? new Date(customDate) : now;
    const safeCustom = Number.isNaN(custom.getTime()) ? now : custom;
    const start = startOfDay(safeCustom);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
};

const isInRange = (date: Date, start: Date, end: Date) => date >= start && date < end;

const getExpectedDate = (quotation: IQuotation): Date => {
    // Inference: hệ thống hiện chưa có trường "ngày dự kiến thu phí", dùng createdAt làm mốc dự kiến.
    const d = new Date(quotation.createdAt);
    return Number.isNaN(d.getTime()) ? new Date() : d;
};

const getLockDate = (quotation: IQuotation): Date => {
    const d = new Date(quotation.updatedAt || quotation.createdAt);
    return Number.isNaN(d.getTime()) ? new Date() : d;
};

const formatCompactCurrency = (amount: number): string => {
    if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)} Tỷ`;
    if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(0)} Tr`;
    return `${amount.toLocaleString('vi-VN')} đ`;
};

const buildBuckets = (range: DateRangeType, start: Date, end: Date): TimeBucket[] => {
    if (range === 'today' || range === 'custom') {
        const buckets: TimeBucket[] = [];
        for (let i = 0; i < 6; i += 1) {
            const bucketStart = new Date(start);
            bucketStart.setHours(i * 4, 0, 0, 0);
            const bucketEnd = new Date(bucketStart);
            bucketEnd.setHours(bucketStart.getHours() + 4);
            buckets.push({
                key: `h-${i}`,
                label: `${bucketStart.getHours().toString().padStart(2, '0')}:00`,
                start: bucketStart,
                end: bucketEnd
            });
        }
        return buckets;
    }

    if (range === 'thisQuarter') {
        const buckets: TimeBucket[] = [];
        const cursor = new Date(start);
        while (cursor < end) {
            const bucketStart = new Date(cursor);
            const bucketEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
            buckets.push({
                key: `m-${bucketStart.getMonth()}`,
                label: `T${bucketStart.getMonth() + 1}`,
                start: bucketStart,
                end: bucketEnd
            });
            cursor.setMonth(cursor.getMonth() + 1);
        }
        return buckets;
    }

    const buckets: TimeBucket[] = [];
    let week = 1;
    let cursor = new Date(start);
    while (cursor < end) {
        const bucketStart = new Date(cursor);
        const bucketEnd = new Date(cursor);
        bucketEnd.setDate(bucketEnd.getDate() + 7);
        buckets.push({
            key: `w-${week}`,
            label: `Tuần ${week}`,
            start: bucketStart,
            end: bucketEnd > end ? end : bucketEnd
        });
        cursor = bucketEnd;
        week += 1;
    }
    return buckets;
};

const ContractDashboard: React.FC = () => {
    const [dateRange, setDateRange] = useState<DateRangeType>('thisMonth');
    const [customDate, setCustomDate] = useState<string>('');
    const [location, setLocation] = useState<LocationType>('all');
    const [quotations, setQuotations] = useState<IQuotation[]>([]);

    const loadQuotations = () => setQuotations(getQuotations());

    useEffect(() => {
        loadQuotations();
    }, []);

    useEffect(() => {
        const sync = () => loadQuotations();
        window.addEventListener('educrm:quotations-changed', sync as EventListener);
        window.addEventListener('storage', sync);
        return () => {
            window.removeEventListener('educrm:quotations-changed', sync as EventListener);
            window.removeEventListener('storage', sync);
        };
    }, []);

    const { start, end } = useMemo(() => getRangeBounds(dateRange, customDate), [dateRange, customDate]);

    const expectedQuotations = useMemo(
        () => quotations.filter(q =>
            (q.status === QuotationStatus.DRAFT || q.status === QuotationStatus.SENT)
            && isInRange(getExpectedDate(q), start, end)
        ),
        [quotations, start, end]
    );

    const lockedQuotations = useMemo(
        () => quotations.filter(q => q.status === QuotationStatus.LOCKED && isInRange(getLockDate(q), start, end)),
        [quotations, start, end]
    );

    const stats = useMemo(() => {
        const expectedRevenue = expectedQuotations.reduce((sum, q) => sum + (q.finalAmount || 0), 0);
        const actualRevenue = lockedQuotations.reduce((sum, q) => sum + (q.finalAmount || 0), 0);

        return {
            lockedSO: lockedQuotations.length,
            expectedRevenue,
            actualRevenue
        };
    }, [expectedQuotations, lockedQuotations]);

    const enrollmentData = useMemo(() => {
        const enrolled = lockedQuotations.length;
        const pending = expectedQuotations.length;
        const total = enrolled + pending;

        if (total === 0) {
            return [
                { name: 'Đã ghi danh', value: 0, color: '#10b981' },
                { name: 'Chưa ghi danh', value: 0, color: '#f59e0b' }
            ];
        }

        return [
            { name: 'Đã ghi danh', value: enrolled, color: '#10b981' },
            { name: 'Chưa ghi danh', value: pending, color: '#f59e0b' }
        ];
    }, [lockedQuotations.length, expectedQuotations.length]);

    const totalEnrollment = useMemo(() => enrollmentData.reduce((sum, item) => sum + item.value, 0), [enrollmentData]);

    const revenueTrendData = useMemo(() => {
        const buckets = buildBuckets(dateRange, start, end);
        return buckets.map(bucket => {
            const expected = expectedQuotations
                .filter(q => isInRange(getExpectedDate(q), bucket.start, bucket.end))
                .reduce((sum, q) => sum + (q.finalAmount || 0), 0);

            const actual = lockedQuotations
                .filter(q => isInRange(getLockDate(q), bucket.start, bucket.end))
                .reduce((sum, q) => sum + (q.finalAmount || 0), 0);

            return {
                name: bucket.label,
                expected,
                actual
            };
        });
    }, [dateRange, start, end, expectedQuotations, lockedQuotations]);

    const chartTitle = useMemo(() => {
        if (dateRange === 'today') return 'Doanh thu & Dự kiến (Hôm nay)';
        if (dateRange === 'lastMonth') return 'Doanh thu & Dự kiến (Tháng trước)';
        if (dateRange === 'thisQuarter') return 'Doanh thu & Dự kiến (Quý này)';
        if (dateRange === 'custom') return 'Doanh thu & Dự kiến (Ngày tùy chọn)';
        return 'Doanh thu & Dự kiến (Tháng này)';
    }, [dateRange]);

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] text-[#0d141b] font-sans overflow-hidden">
            <div className="flex flex-col h-full p-4 lg:p-5 max-w-[1600px] mx-auto w-full gap-4">
                <DashboardFilters
                    dateRange={dateRange}
                    onDateRangeChange={setDateRange}
                    location={location}
                    onLocationChange={setLocation}
                    customDate={customDate}
                    onCustomDateChange={setCustomDate}
                    title="Tổng quan Ghi danh"
                    subtitle="Báo cáo tình hình ghi danh và doanh thu hợp đồng."
                    dateOptions={FILTER_OPTIONS}
                    compact
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between min-h-[132px]">
                        <div className="flex justify-between items-start">
                            <div className="bg-slate-100 p-3 rounded-xl text-slate-600">
                                <Lock size={24} />
                            </div>
                            <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded">SO / Quotes</span>
                        </div>
                        <div className="mt-3">
                            <h3 className="text-2xl font-bold text-slate-900">{stats.lockedSO}</h3>
                            <p className="text-slate-500 text-xs">Số SO đã khóa</p>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between min-h-[132px]">
                        <div className="flex justify-between items-start">
                            <div className="bg-blue-50 p-3 rounded-xl text-blue-600">
                                <FileText size={24} />
                            </div>
                        </div>
                        <div className="mt-3">
                            <h3 className="text-2xl font-bold text-slate-900">{formatCompactCurrency(stats.expectedRevenue)}</h3>
                            <p className="text-slate-500 text-xs">Doanh số dự kiến</p>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between min-h-[132px]">
                        <div className="flex justify-between items-start">
                            <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600">
                                <DollarSign size={24} />
                            </div>
                            <span className="bg-emerald-50 text-emerald-600 text-xs font-bold px-2 py-1 flex items-center gap-1 rounded">
                                <TrendingUp size={12} /> Realized
                            </span>
                        </div>
                        <div className="mt-3">
                            <h3 className="text-2xl font-bold text-emerald-600">{formatCompactCurrency(stats.actualRevenue)}</h3>
                            <p className="text-slate-500 text-xs">Doanh thu thực tế</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col min-h-0">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-bold text-lg text-slate-900">Tỷ trọng Ghi danh</h3>
                            <button className="text-slate-400 hover:text-slate-600"><MoreVertical size={20} /></button>
                        </div>

                        <div className="h-[240px] relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={enrollmentData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={80}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {enrollmentData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip
                                        formatter={(value: number, _name, props: any) => {
                                            const percent = totalEnrollment > 0 ? Math.round((Number(value) / totalEnrollment) * 100) : 0;
                                            return [`${Number(value).toLocaleString('vi-VN')} (${percent}%)`, props?.payload?.name || ''];
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>

                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-6">
                                <span className="text-3xl font-bold text-slate-900">{totalEnrollment}</span>
                                <span className="text-xs text-slate-400">Học viên</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col min-h-0">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-bold text-lg text-slate-900">{chartTitle}</h3>
                            <button className="text-slate-400 hover:text-slate-600"><MoreVertical size={20} /></button>
                        </div>

                        <div className="h-[240px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={revenueTrendData} barSize={20}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} tickFormatter={(v) => `${Math.round(Number(v) / 1_000_000)}M`} />
                                    <Tooltip
                                        cursor={{ fill: '#f1f5f9' }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                        formatter={(value: number) => formatCompactCurrency(Number(value))}
                                    />
                                    <Bar dataKey="expected" name="Dự kiến" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="actual" name="Thực tế" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContractDashboard;
