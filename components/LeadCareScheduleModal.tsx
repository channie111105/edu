import React, { useEffect, useState } from 'react';
import { type ActivityType } from '../types';
import { X } from 'lucide-react';

export type PostConvertScheduleAction = Extract<ActivityType, 'call' | 'meeting' | 'email'>;

export const POST_CONVERT_SCHEDULE_OPTIONS: Array<{
    value: PostConvertScheduleAction;
    label: string;
    defaultDelayHours: number;
}> = [
    { value: 'call', label: 'Gọi điện', defaultDelayHours: 2 },
    { value: 'meeting', label: 'Lịch hẹn', defaultDelayHours: 24 },
    { value: 'email', label: 'Email', defaultDelayHours: 2 },
];

const getDefaultDateTimeValue = (action: PostConvertScheduleAction) => {
    const matchedOption = POST_CONVERT_SCHEDULE_OPTIONS.find((option) => option.value === action);
    const nextDate = new Date();
    nextDate.setHours(nextDate.getHours() + (matchedOption?.defaultDelayHours || 2));
    return new Date(nextDate.getTime() - (nextDate.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
};

type LeadCareScheduleModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSave: (payload: {
        action: PostConvertScheduleAction;
        summary: string;
        datetime: string;
    }) => void;
    defaultAction?: PostConvertScheduleAction;
    defaultDateTime?: string;
};

const LeadCareScheduleModal: React.FC<LeadCareScheduleModalProps> = ({
    isOpen,
    onClose,
    onSave,
    defaultAction = 'call',
    defaultDateTime,
}) => {
    const [action, setAction] = useState<PostConvertScheduleAction>(defaultAction);
    const [summary, setSummary] = useState('');
    const [datetime, setDatetime] = useState(defaultDateTime || getDefaultDateTimeValue(defaultAction));
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        setAction(defaultAction);
        setSummary('');
        setDatetime(defaultDateTime || getDefaultDateTimeValue(defaultAction));
        setError('');
    }, [defaultAction, defaultDateTime, isOpen]);

    if (!isOpen) return null;

    const handleSave = () => {
        const trimmedSummary = summary.trim();
        if (!trimmedSummary) {
            setError('Vui lòng nhập nội dung lịch chăm sóc.');
            return;
        }
        if (!datetime) {
            setError('Vui lòng chọn ngày giờ lịch chăm sóc.');
            return;
        }

        setError('');
        onSave({
            action,
            summary: trimmedSummary,
            datetime,
        });
    };

    return (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/40 p-4">
            <div className="relative w-full max-w-[680px] rounded-2xl bg-white p-6 shadow-2xl">
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute right-4 top-4 rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Đóng popup lịch chăm sóc"
                >
                    <X size={18} />
                </button>

                <div className="space-y-4 pt-3">
                    <div>
                        <label className="mb-2 block text-sm font-bold uppercase tracking-wide text-slate-700">Hành động</label>
                        <select
                            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition-colors focus:border-purple-500"
                            value={action}
                            onChange={(event) => setAction(event.target.value as PostConvertScheduleAction)}
                        >
                            {POST_CONVERT_SCHEDULE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-bold uppercase tracking-wide text-slate-700">Nội dung</label>
                        <textarea
                            className="h-28 w-full resize-none rounded-xl border border-slate-300 px-4 py-4 text-base outline-none transition-colors focus:border-purple-500"
                            placeholder="Nhập nội dung lịch chăm sóc..."
                            value={summary}
                            onChange={(event) => setSummary(event.target.value)}
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-bold uppercase tracking-wide text-slate-700">Ngày giờ</label>
                        <input
                            type="datetime-local"
                            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base font-bold outline-none transition-colors focus:border-purple-500"
                            value={datetime}
                            onChange={(event) => setDatetime(event.target.value)}
                        />
                    </div>

                    {error && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                            {error}
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={handleSave}
                        className="w-full rounded-lg bg-gradient-to-r from-fuchsia-600 to-violet-600 py-3 text-base font-bold text-white shadow-sm transition-transform hover:-translate-y-0.5"
                    >
                        Lưu lịch chăm sóc
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LeadCareScheduleModal;
