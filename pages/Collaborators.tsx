
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
    Plus,
    MapPin,
    Users,
    FileText,
    MoreVertical,
    Phone,
    Briefcase,
    Calendar,
    X,
    Filter,
    Settings2,
    Columns as ColumnsIcon,
    Download,
    MessageSquare,
    Clock,
    Send,
    History,
    ChevronRight,
    Mail,
    User,
    CheckCircle2,
    Pencil,
    AlertTriangle
} from 'lucide-react';
import { getLeads, getCollaborators, saveCollaborators } from '../utils/storage';
import { LeadStatus, IActivityLog, UserRole } from '../types';
import { useAuth } from '../contexts/AuthContext';
import PinnedSearchInput, { PinnedSearchChip } from '../components/PinnedSearchInput';

// Mock Data for Collaborators
interface ICollaborator {
    id: string;
    name: string;
    phone: string;
    email?: string;
    ownerId?: string;
    ownerName?: string;
    city: string;
    address?: string;
    industry: string; // Ngành nghề
    segment: string;  // Mảng hợp tác
    notes: string;
    nextAppointment?: string; // Lịch hẹn
    status?: 'Active' | 'Need Support' | 'Stopped' | 'New';
    activities?: IActivityLog[];
    followers?: ICollaboratorFollower[];
}

interface ICollaboratorFollower {
    id: string;
    name: string;
    avatar?: string;
    role?: string;
    addedAt?: string;
}

const MOCK_COLLABORATORS: ICollaborator[] = [
    {
        id: 'ctv_1',
        name: 'Nguyễn Văn A',
        phone: '0912345678',
        ownerId: 'u1',
        ownerName: 'Trần Văn Quản Trị',
        city: 'Hà Nội',
        industry: 'Giáo viên',
        segment: 'IELTS',
        notes: 'Cần gửi chính sách thưởng mới',
        nextAppointment: '2026-05-20',
        status: 'Active'
    },
    {
        id: 'ctv_2',
        name: 'Trần Thị B',
        phone: '0988777666',
        ownerId: 'u2',
        ownerName: 'Sarah Miller',
        city: 'Hồ Chí Minh',
        industry: 'Sinh viên',
        segment: 'Du học',
        notes: 'Đã gửi quà tết. Follow up tháng sau.',
        nextAppointment: '2026-06-10',
        status: 'Need Support'
    },
    {
        id: 'ctv_3',
        name: 'Lê Văn C',
        phone: '0901112233',
        ownerId: 'u3',
        ownerName: 'David Clark',
        city: 'Đà Nẵng',
        industry: 'Trung tâm tiếng Anh',
        segment: 'Xuất khẩu lao động',
        notes: 'Tiềm năng lớn, cần chăm sóc kỹ.',
        status: 'Active'
    }
];

const SALE_OWNER_OPTIONS = [
    { id: 'u1', name: 'Trần Văn Quản Trị' },
    { id: 'u2', name: 'Sarah Miller' },
    { id: 'u3', name: 'David Clark' },
    { id: 'u4', name: 'Alex Rivera' }
];

const COLLABORATOR_ACTIVITY_TYPES = [
    { id: 'Call', label: 'Gọi điện', icon: Phone },
    { id: 'Document', label: 'Gửi tài liệu', icon: FileText },
    { id: 'Complaint', label: 'Xử lý khiếu nại', icon: AlertTriangle },
    { id: 'Visit', label: 'Thăm hỏi', icon: Users },
    { id: 'Zalo', label: 'Zalo', icon: MessageSquare }
] as const;

const COLLABORATOR_FOCUS_KEY = 'educrm_collaborator_focus_id';

const getInitials = (name?: string) =>
    (name || '')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('') || 'NV';

const buildCollaboratorFollower = (
    id: string,
    name: string,
    role = 'Nhân viên kinh doanh'
): ICollaboratorFollower => ({
    id,
    name,
    role,
    avatar: getInitials(name),
    addedAt: new Date().toISOString()
});

const formatCollaboratorDateTime = (value?: string) => {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString('vi-VN');
};

const parseCollaboratorAppointment = (value?: string) => {
    if (!value) return null;
    const normalizedValue = /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? `${value}T23:59:00`
        : value;
    const parsed = new Date(normalizedValue);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDelayMinutes = (minutes: number): string => {
    const safeMinutes = Math.max(0, Math.floor(minutes));
    const days = Math.floor(safeMinutes / (60 * 24));
    const hours = Math.floor((safeMinutes % (60 * 24)) / 60);
    const mins = safeMinutes % 60;
    const parts: string[] = [];

    if (days > 0) parts.push(`${days} ngày`);
    if (hours > 0) parts.push(`${hours} giờ`);
    if (mins > 0 || parts.length === 0) parts.push(`${mins} phút`);

    return parts.join(' ');
};

// Column Defs
const ALL_COLUMNS = [
    { id: 'index', label: '#', visible: true },
    { id: 'name', label: 'Họ tên & SĐT', visible: true },
    { id: 'city', label: 'Khu vực', visible: true },
    { id: 'industry', label: 'Ngành nghề', visible: true },
    { id: 'segment', label: 'Mảng hợp tác', visible: true },
    { id: 'stats', label: 'Hiệu quả (HVGT/HĐ)', visible: true },
    { id: 'notes', label: 'Ghi chú & Lịch hẹn', visible: true },
];

// --- COMPONENTS ---
interface CollaboratorCareDrawerProps {
    ctv: ICollaborator;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: (updated: ICollaborator) => void;
    onEdit: (ctv: ICollaborator) => void;
}

const CollaboratorCareDrawer: React.FC<CollaboratorCareDrawerProps> = ({ ctv, isOpen, onClose, onUpdate, onEdit }) => {
    const { user } = useAuth();
    const [noteContent, setNoteContent] = useState('');
    const [interactionType, setInteractionType] = useState('Call');
    const [scheduleNext, setScheduleNext] = useState(true);
    const [showNextActivityModal, setShowNextActivityModal] = useState(false);
    const [nextActivityType, setNextActivityType] = useState<(typeof COLLABORATOR_ACTIVITY_TYPES)[number]['id']>('Call');
    const [nextActivityDate, setNextActivityDate] = useState('');
    const [nextActivitySummary, setNextActivitySummary] = useState('');
    const [showFollowersModal, setShowFollowersModal] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; visible: boolean } | null>(null);
    const [activeTab, setActiveTab] = useState<'info' | 'care'>('care');

    const salesFollowerOptions = useMemo(() => {
        const options = new Map<string, ICollaboratorFollower>();

        SALE_OWNER_OPTIONS.forEach((item) => {
            options.set(item.id, buildCollaboratorFollower(item.id, item.name));
        });

        if (user?.id && user?.name) {
            options.set(
                user.id,
                buildCollaboratorFollower(
                    user.id,
                    user.name,
                    user.role || 'Nhân viên kinh doanh'
                )
            );
        }

        return Array.from(options.values());
    }, [user?.id, user?.name, user?.role]);

    const currentFollowers = useMemo(() => {
        const merged = new Map<string, ICollaboratorFollower>();

        if (ctv.ownerId) {
            const ownerLabel =
                ctv.ownerName ||
                salesFollowerOptions.find((item) => item.id === ctv.ownerId)?.name ||
                ctv.ownerId;
            merged.set(
                ctv.ownerId,
                buildCollaboratorFollower(ctv.ownerId, ownerLabel, 'Sale phụ trách')
            );
        }

        (ctv.followers || []).forEach((item) => {
            merged.set(item.id, {
                ...item,
                avatar: item.avatar || getInitials(item.name)
            });
        });

        return Array.from(merged.values());
    }, [ctv.followers, ctv.ownerId, ctv.ownerName, salesFollowerOptions]);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type, visible: true });
        window.setTimeout(() => {
            setToast((current) => (current?.message === message ? null : current));
        }, 2400);
    };

    const getDefaultNextActivityDate = () => {
        const now = new Date();
        const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
        return local.toISOString().slice(0, 16);
    };

    const openNextActivityModal = (summary?: string) => {
        setNextActivityType(interactionType as (typeof COLLABORATOR_ACTIVITY_TYPES)[number]['id']);
        setNextActivityDate(getDefaultNextActivityDate());
        setNextActivitySummary(summary || '');
        setShowNextActivityModal(true);
    };

    const closeNextActivityModal = () => {
        setShowNextActivityModal(false);
        setNextActivityType('Call');
        setNextActivityDate('');
        setNextActivitySummary('');
    };

    useEffect(() => {
        if (!isOpen) return;
        setNoteContent('');
        setInteractionType('Call');
        setScheduleNext(true);
        setShowNextActivityModal(false);
        setShowFollowersModal(false);
        setNextActivityType('Call');
        setNextActivityDate('');
        setNextActivitySummary('');
        setToast(null);
    }, [ctv.id, isOpen]);

    if (!isOpen) return null;

    const handleAddNote = () => {
        if (!noteContent.trim()) {
            showToast('Vui lòng nhập nội dung chăm sóc CTV.', 'error');
            return;
        }

        const typeLabels: Record<string, string> = {
            Call: 'Gọi điện tư vấn',
            Document: 'Gửi tài liệu',
            Complaint: 'Xử lý khiếu nại',
            Visit: 'Thăm hỏi định kỳ',
            Zalo: 'Nhắn tin Zalo'
        };

        const newActivity: IActivityLog = {
            id: `act-${Date.now()}`,
            type: 'note',
            timestamp: new Date().toISOString(),
            title: `[${typeLabels[interactionType] || interactionType}] Chăm sóc CTV`,
            description: noteContent,
            user: user?.name || 'Admin'
        };

        const updatedCtv: ICollaborator = {
            ...ctv,
            activities: [newActivity, ...(ctv.activities || [])]
        };

        onUpdate(updatedCtv);
        setNoteContent('');
        showToast('Đã lưu nhật ký chăm sóc CTV.');
        if (scheduleNext) {
            openNextActivityModal('Tạo lịch tiếp theo sau khi lưu chăm sóc CTV');
        }
    };

    const handleAddFollower = (follower: ICollaboratorFollower) => {
        if (currentFollowers.some((item) => item.id === follower.id)) {
            showToast('Sale này đang theo dõi CTV rồi.', 'error');
            return;
        }

        const normalizedFollower: ICollaboratorFollower = {
            ...follower,
            avatar: follower.avatar || getInitials(follower.name),
            addedAt: new Date().toISOString()
        };

        const systemLog: IActivityLog = {
            id: `follow-${Date.now()}`,
            type: 'system',
            timestamp: new Date().toISOString(),
            title: 'Hệ thống',
            description: `Đã thêm ${normalizedFollower.name} vào danh sách sale theo dõi CTV`,
            user: user?.name || 'Admin'
        };

        onUpdate({
            ...ctv,
            followers: [...currentFollowers, normalizedFollower],
            activities: [systemLog, ...(ctv.activities || [])]
        });

        setShowFollowersModal(false);
        showToast('Đã thêm sale theo dõi CTV.');
    };

    const handleCreateNextActivity = () => {
        const trimmedSummary = nextActivitySummary.trim();
        if (!trimmedSummary) {
            showToast('Vui lòng nhập nội dung lịch tiếp theo.', 'error');
            return;
        }

        if (!nextActivityDate) {
            showToast('Vui lòng chọn thời gian cho lịch tiếp theo.', 'error');
            return;
        }

        const activityLabel =
            COLLABORATOR_ACTIVITY_TYPES.find((item) => item.id === nextActivityType)?.label || nextActivityType;

        const scheduledDate = new Date(nextActivityDate);
        const scheduledAt = Number.isNaN(scheduledDate.getTime())
            ? nextActivityDate
            : scheduledDate.toISOString();

        const newActivity: IActivityLog = {
            id: `next-act-${Date.now()}`,
            type: 'activity',
            status: 'scheduled',
            timestamp: new Date().toISOString(),
            title: `[${activityLabel}] Lịch chăm sóc tiếp theo`,
            description: trimmedSummary,
            user: user?.name || 'Admin',
            datetime: scheduledAt
        };

        onUpdate({
            ...ctv,
            nextAppointment: scheduledAt,
            activities: [newActivity, ...(ctv.activities || [])]
        });

        closeNextActivityModal();
        showToast('Đã tạo lịch tiếp theo cho CTV.');
    };

    const handleStatusUpdate = (newStatus: any) => {
        const systemLog: IActivityLog = {
            id: `sys-${Date.now()}`,
            type: 'system',
            timestamp: new Date().toISOString(),
            title: 'Hệ thống',
            description: `Trạng thái CTV: ${ctv.status || 'New'} -> ${newStatus}`,
            user: user?.name || 'Admin'
        };

        onUpdate({
            ...ctv,
            status: newStatus,
            activities: [systemLog, ...(ctv.activities || [])]
        });
        showToast('Đã cập nhật trạng thái CTV.');
    };

    const groupedLogs = (ctv.activities || []).sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ).reduce((groups: any, log) => {
        const date = new Date(log.timestamp).toLocaleDateString('vi-VN');
        if (!groups[date]) groups[date] = [];
        groups[date].push(log);
        return groups;
    }, {});

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-6xl bg-white h-[90vh] rounded shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-300">
                {toast?.visible && (
                    <div className={`absolute top-5 left-1/2 z-[120] -translate-x-1/2 flex items-center gap-2 rounded-lg border px-4 py-2.5 shadow-xl ${toast.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'}`}>
                        {toast.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
                        <span className="text-sm font-bold">{toast.message}</span>
                    </div>
                )}
                {/* Header */}
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                            {ctv.name.charAt(0)}
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-800 text-lg uppercase tracking-tight">{ctv.name}</h2>
                            <p className="text-xs text-slate-500 font-medium">{ctv.phone} • {ctv.city}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onEdit(ctv)}
                            className="px-3 py-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 transition-colors text-xs font-bold flex items-center gap-1.5"
                        >
                            <Pencil size={14} /> Sửa thông tin
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded text-slate-500 transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200 bg-white">
                    <button
                        onClick={() => setActiveTab('care')}
                        className={`px-6 py-3 text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 ${activeTab === 'care' ? 'border-b-2 border-indigo-600 text-indigo-700 bg-indigo-50/30' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <History size={14} /> Nhật ký chăm sóc
                    </button>
                    <button
                        onClick={() => setActiveTab('info')}
                        className={`px-6 py-3 text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 ${activeTab === 'info' ? 'border-b-2 border-indigo-600 text-indigo-700 bg-indigo-50/30' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <User size={14} /> Thông tin chi tiết
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col bg-white">
                    {activeTab === 'care' ? (
                        <div className="flex-1 flex overflow-hidden">
                            {/* LEFT SIDE: 2/3 - Activity Form */}
                            <div className="flex-[2] flex flex-col border-r border-slate-200 overflow-y-auto">
                                {/* Odoo Chatter Header - Activity Buttons (Categories) */}
                                <div className="border-b border-slate-200 p-2 bg-slate-50/50 sticky top-0 z-10 backdrop-blur-md">
                                    <div className="max-w-4xl mx-auto flex flex-wrap gap-2">
                                        {COLLABORATOR_ACTIVITY_TYPES.map(btn => {
                                            const Icon = btn.icon;
                                            return (
                                            <button
                                                key={btn.id}
                                                onClick={() => setInteractionType(btn.id)}
                                                className={`px-4 py-1.5 rounded border text-xs font-bold transition-all flex items-center gap-1.5 ${interactionType === btn.id ? 'bg-amber-100 border-amber-300 text-amber-900' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                            >
                                                <Icon size={13} />
                                                <span>{btn.label}</span>
                                            </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="max-w-4xl mx-auto w-full py-4 px-6 space-y-4">
                                    {/* Followers Row */}
                                    <div className="flex items-center justify-between text-slate-500 border-b border-slate-100 pb-2">
                                        <div className="flex items-center gap-3 text-sm">
                                            <div className="flex items-center gap-2">
                                                <User size={16} />
                                                <span className="font-medium">{currentFollowers.length} Followers</span>
                                            </div>
                                            {currentFollowers.length > 0 && (
                                                <div className="flex -space-x-2">
                                                    {currentFollowers.slice(0, 4).map((follower) => (
                                                        <div
                                                            key={follower.id}
                                                            title={follower.name}
                                                            className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-blue-100 text-[10px] font-bold text-blue-700 shadow-sm"
                                                        >
                                                            {follower.avatar || getInitials(follower.name)}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => setShowFollowersModal(true)}
                                            className="text-blue-600 text-sm font-bold flex items-center gap-1 hover:underline"
                                        >
                                            <Plus size={14} /> Add
                                        </button>
                                    </div>

                                    {/* Input Area */}
                                    <div className="space-y-4">
                                        <div className={`border-2 rounded transition-all ${noteContent.trim() ? 'border-amber-400 bg-amber-50/20' : 'border-amber-200 bg-white'}`}>
                                            <textarea
                                                value={noteContent}
                                                onChange={(e) => setNoteContent(e.target.value)}
                                                placeholder={`Ghi chú nhanh cho team về việc ${interactionType === 'Call' ? 'gọi điện' : interactionType === 'Document' ? 'gửi tài liệu' : interactionType === 'Complaint' ? 'xử lý khiếu nại' : 'chăm sóc'}...`}
                                                className="w-full p-4 text-sm focus:outline-none min-h-[120px] resize-none leading-relaxed bg-transparent"
                                            />
                                        </div>

                                        <div className="flex flex-wrap items-center justify-between gap-4">
                                            <div className="flex items-center gap-4">
                                                <label className="flex items-center gap-2 cursor-pointer group">
                                                    <input
                                                        type="checkbox"
                                                        checked={scheduleNext}
                                                        onChange={(e) => setScheduleNext(e.target.checked)}
                                                        className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                                                    />
                                                    <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900 transition-colors uppercase tracking-tight">Lên lịch tiếp theo?</span>
                                                </label>
                                                {ctv.nextAppointment && (
                                                    <span className="text-xs font-semibold text-slate-500">
                                                        Lịch gần nhất: {formatCollaboratorDateTime(ctv.nextAppointment)}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase mr-2 tracking-widest">Trạng thái CTV:</span>
                                                {[
                                                    { id: 'Active', label: 'Hoạt động', color: 'emerald' },
                                                    { id: 'Need Support', label: 'Cần hỗ trợ', color: 'amber' },
                                                    { id: 'Stopped', label: 'Ngừng', color: 'rose' }
                                                ].map(s => (
                                                    <button
                                                        key={s.id}
                                                        onClick={() => handleStatusUpdate(s.id)}
                                                        className={`px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-tight border transition-all ${ctv.status === s.id ? `bg-${s.color}-600 text-white border-transparent shadow-md` : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                                                    >
                                                        {s.label}
                                                    </button>
                                                ))}
                                                <button
                                                    onClick={handleAddNote}
                                                    disabled={!noteContent.trim()}
                                                    className="bg-[#e67e22] hover:bg-[#d35400] disabled:opacity-50 text-white px-8 py-2 rounded font-bold transition-all shadow-md active:scale-95 text-sm ml-4 uppercase tracking-widest"
                                                >
                                                    Gửi / Lưu
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT SIDE: 1/3 - Activity Log (History) */}
                            <div className="flex-[1] flex flex-col bg-slate-50/50 overflow-hidden">
                                <div className="p-3 border-b border-slate-200 bg-white sticky top-0 z-10">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <History size={14} /> Lịch sử Chatter
                                    </h3>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                                    {Object.keys(groupedLogs).length > 0 ? Object.keys(groupedLogs).map(date => (
                                        <div key={date} className="space-y-4">
                                            {/* Date Divider */}
                                            <div className="flex items-center gap-4 text-slate-300">
                                                <div className="flex-1 h-px bg-slate-200"></div>
                                                <span className="text-[9px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">{date}</span>
                                                <div className="flex-1 h-px bg-slate-200"></div>
                                            </div>

                                            {groupedLogs[date].map((log: any) => (
                                                <div key={log.id} className="space-y-1.5">
                                                    <div className="flex items-center justify-between px-1">
                                                        <span className="font-bold text-slate-800 text-[10px]">{log.user.toLowerCase()}</span>
                                                        <span className="text-[9px] text-slate-400 font-medium">
                                                            {new Date(log.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>

                                                    <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-all">
                                                        <div className="flex flex-col gap-1.5">
                                                            <span className={`w-fit ${log.title === 'Hệ thống' ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-800'} text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter`}>
                                                                {log.title === 'Hệ thống' ? 'SYSTEM' : 'LOG NOTE'}
                                                            </span>
                                                            <p className="text-slate-600 text-[11px] leading-relaxed">{log.description}</p>
                                                        </div>
                                                        {log.datetime && (
                                                            <div className="mt-2 pt-2 border-t border-slate-50 flex items-center gap-1.5 text-[8px] font-black text-amber-600">
                                                                <Calendar size={10} /> HẸN: {formatCollaboratorDateTime(log.datetime)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )) : (
                                        <div className="flex flex-col items-center justify-center py-20 text-slate-300 opacity-20">
                                            <History size={48} />
                                            <p className="text-[10px] font-black uppercase tracking-widest mt-2">Trống</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-8 space-y-6 overflow-y-auto chatter-scroll flex-1">
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm grid grid-cols-2 gap-6 relative overflow-hidden">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Họ tên</label>
                                    <p className="text-sm font-bold text-slate-900 mt-0.5">{ctv.name}</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Số điện thoại</label>
                                    <p className="text-sm font-bold text-slate-900 mt-0.5">{ctv.phone}</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ngành nghề</label>
                                    <p className="text-sm font-bold text-slate-900 mt-0.5">{ctv.industry}</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mảng hợp tác</label>
                                    <p className="text-sm font-bold text-slate-900 mt-0.5">{ctv.segment}</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Khu vực</label>
                                    <p className="text-sm font-bold text-slate-900 mt-0.5">{ctv.city}</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sale phụ trách</label>
                                    <p className="text-sm font-bold text-indigo-600 mt-0.5">{ctv.ownerName || ctv.ownerId || 'Chưa gắn sale'}</p>
                                </div>
                            </div>

                            {/* Enhanced Stats */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">HV Giới thiệu</span>
                                    <span className="text-xl font-black text-slate-900 mt-1">12</span>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Hợp đồng chốt</span>
                                    <span className="text-xl font-black text-emerald-600 mt-1">4</span>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Tỷ lệ chốt</span>
                                    <span className="text-xl font-black text-blue-600 mt-1">33%</span>
                                </div>
                            </div>

                            {/* End info */}
                        </div>
                    )}

                    {showNextActivityModal && (
                        <div className="absolute inset-0 z-[110] flex items-center justify-center bg-slate-900/35 backdrop-blur-sm p-4">
                            <div className="w-full max-w-[540px] rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                                <div className="mb-5 flex items-start justify-between gap-4">
                                    <div>
                                        <h3 className="text-2xl font-bold text-slate-900">Tạo hoạt động tiếp theo</h3>
                                        <p className="mt-2 text-base text-slate-500">Hãy tạo hoạt động tiếp theo để tiếp tục chăm sóc cộng tác viên.</p>
                                    </div>
                                    <button
                                        onClick={closeNextActivityModal}
                                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">
                                            Loại hoạt động
                                        </label>
                                        <div className="grid w-full grid-cols-6 gap-1.5">
                                            {COLLABORATOR_ACTIVITY_TYPES.map((item, index) => {
                                                const Icon = item.icon;
                                                const isActive = nextActivityType === item.id;
                                                const spanClass = index < 3 ? 'col-span-2' : 'col-span-3';
                                                return (
                                                    <button
                                                        key={item.id}
                                                        onClick={() => setNextActivityType(item.id)}
                                                        className={`${spanClass} rounded-md border px-1.5 py-1 text-[8px] font-bold uppercase transition-all ${isActive ? 'border-violet-400 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'}`}
                                                    >
                                                        <div className={`mx-auto mb-0.5 flex h-5 w-5 items-center justify-center rounded-full ${isActive ? 'bg-violet-100' : 'bg-slate-100'}`}>
                                                            <Icon size={10} />
                                                        </div>
                                                        <span className="leading-tight">{item.label}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <input
                                            type="datetime-local"
                                            value={nextActivityDate}
                                            onChange={(e) => setNextActivityDate(e.target.value)}
                                            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition-colors focus:border-violet-400"
                                        />
                                        <input
                                            value={nextActivitySummary}
                                            onChange={(e) => setNextActivitySummary(e.target.value)}
                                            placeholder="Ví dụ: Gọi lại để chốt lịch gặp, gửi thêm tài liệu, hỏi tình hình cộng tác..."
                                            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition-colors focus:border-violet-400"
                                        />
                                    </div>
                                </div>

                                <div className="mt-6 flex items-center justify-end gap-3">
                                    <button
                                        onClick={closeNextActivityModal}
                                        className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100"
                                    >
                                        Bỏ qua
                                    </button>
                                    <button
                                        onClick={handleCreateNextActivity}
                                        className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-violet-700"
                                    >
                                        Tạo hoạt động
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {showFollowersModal && (
                        <div className="absolute inset-0 z-[115] flex items-center justify-center bg-slate-900/35 backdrop-blur-sm p-4">
                            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-200">
                                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900">Thêm sale theo dõi</h3>
                                        <p className="mt-1 text-sm text-slate-500">Chọn sale để cùng theo dõi và chăm sóc cộng tác viên này.</p>
                                    </div>
                                    <button
                                        onClick={() => setShowFollowersModal(false)}
                                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                <div className="max-h-[380px] space-y-2 overflow-y-auto px-4 py-4">
                                    {salesFollowerOptions.map((item) => {
                                        const isFollowing = currentFollowers.some((follower) => follower.id === item.id);

                                        return (
                                            <div
                                                key={item.id}
                                                className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-3"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                                                        {item.avatar || getInitials(item.name)}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-slate-800">{item.name}</div>
                                                        <div className="text-xs text-slate-500">{item.role || 'Nhân viên kinh doanh'}</div>
                                                    </div>
                                                </div>

                                                {isFollowing ? (
                                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                                                        <CheckCircle2 size={14} /> Đang theo dõi
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={() => handleAddFollower(item)}
                                                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-blue-700"
                                                    >
                                                        Thêm
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-5 py-4">
                                    <button
                                        onClick={() => setShowFollowersModal(false)}
                                        className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200"
                                    >
                                        Đóng
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const Collaborators: React.FC = () => {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCity, setFilterCity] = useState('All');
    const [filterIndustry, setFilterIndustry] = useState('All');
    const [activeTab, setActiveTab] = useState<'all' | 'slow_ctv'>('all');
    const [collaborators, setCollaborators] = useState<ICollaborator[]>([]);
    const [selectedCtv, setSelectedCtv] = useState<ICollaborator | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newCtv, setNewCtv] = useState<Partial<ICollaborator>>({});
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingCtv, setEditingCtv] = useState<ICollaborator | null>(null);

    // Column Visibility State
    const [columns, setColumns] = useState(ALL_COLUMNS);
    const [showColumnDropdown, setShowColumnDropdown] = useState(false);
    const canViewAllCollaborators = user?.role === UserRole.ADMIN || user?.role === UserRole.FOUNDER;
    const ownerOptions = useMemo(() => {
        const base = [...SALE_OWNER_OPTIONS];
        if (user?.id && !base.some(item => item.id === user.id)) {
            base.unshift({ id: user.id, name: user.name });
        }
        return base;
    }, [user?.id, user?.name]);
    const getOwnerName = useCallback((ownerId?: string) => {
        if (!ownerId) return '';
        return ownerOptions.find(item => item.id === ownerId)?.name || ownerId;
    }, [ownerOptions]);

    // Load data from storage
    useEffect(() => {
        const defaultOwnerId = user?.id || 'u1';
        const stored = getCollaborators();
        if (stored && stored.length > 0) {
            const normalized = stored.map((item: ICollaborator) => {
                const ownerId = item.ownerId || defaultOwnerId;
                return {
                    ...item,
                    ownerId,
                    ownerName: item.ownerName || getOwnerName(ownerId)
                };
            });
            setCollaborators(normalized);
            if (JSON.stringify(stored) !== JSON.stringify(normalized)) {
                saveCollaborators(normalized);
            }
        } else {
            const seeded = MOCK_COLLABORATORS.map(item => ({
                ...item,
                ownerId: item.ownerId || defaultOwnerId,
                ownerName: item.ownerName || getOwnerName(item.ownerId || defaultOwnerId)
            }));
            setCollaborators(seeded);
            saveCollaborators(seeded);
        }
    }, [user?.id, getOwnerName]);

    // Sync with storage whenever collaborators change
    const updateCollaborators = (newList: ICollaborator[]) => {
        setCollaborators(newList);
        saveCollaborators(newList);
    };

    // Get Leads from storage
    const leads = useMemo(() => getLeads(), []);

    const visibleCollaborators = useMemo(() => {
        if (canViewAllCollaborators) return collaborators;
        return collaborators.filter(c => c.ownerId === user?.id);
    }, [collaborators, canViewAllCollaborators, user?.id]);

    const slowCollaboratorRows = useMemo<Array<{
        ctv: ICollaborator;
        appointmentAt: string;
        overdueMinutes: number;
        overdueText: string;
    }>>(() => [], []);

    const slowCollaboratorMap = useMemo(
        () => new Map<string, { ctv: ICollaborator; appointmentAt: string; overdueMinutes: number; overdueText: string }>(),
        []
    );

    const scopedCollaborators = visibleCollaborators;

    // Derived Options for Filters
    const cityOptions = useMemo(() => ['All', ...Array.from(new Set(visibleCollaborators.map(c => c.city)))], [visibleCollaborators]);
    const industryOptions = useMemo(() => ['All', ...Array.from(new Set(visibleCollaborators.map(c => c.industry)))], [visibleCollaborators]);

    // Filter Logic
    const filteredList = useMemo(() => {
        return visibleCollaborators.filter(c => {
            const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm);
            const matchesCity = filterCity === 'All' || c.city === filterCity;
            const matchesIndustry = filterIndustry === 'All' || c.industry === filterIndustry;
            return matchesSearch && matchesCity && matchesIndustry;
        });
    }, [visibleCollaborators, searchTerm, filterCity, filterIndustry]);

    const activeSearchChips = useMemo<PinnedSearchChip[]>(() => {
        const chips: PinnedSearchChip[] = [];

        if (activeTab === 'slow_ctv') {
            chips.push({ key: 'sla', label: 'SLA: Chậm lịch hẹn' });
        }

        if (filterCity !== 'All') {
            chips.push({ key: 'city', label: `Khu vuc: ${filterCity}` });
        }

        if (filterIndustry !== 'All') {
            chips.push({ key: 'industry', label: `Nganh nghe: ${filterIndustry}` });
        }

        return chips;
    }, [activeTab, filterCity, filterIndustry]);

    const removeSearchChip = (chipKey: string) => {
        if (chipKey === 'sla') setActiveTab('all');
        if (chipKey === 'city') setFilterCity('All');
        if (chipKey === 'industry') setFilterIndustry('All');
    };

    // Stats Calculation
    const getStats = (ctvName: string) => {
        const referrals = leads.filter(l => l.referredBy && l.referredBy.toLowerCase() === ctvName.toLowerCase());
        const contracts = referrals.filter(l =>
            l.status === LeadStatus.CONVERTED ||
            l.status === 'Won' ||
            l.status === 'Chốt'
        ).length;

        return { total: referrals.length, contracts };
    };

    const handleCreate = () => {
        if (!newCtv.name || !newCtv.phone) return;
        const newId = `ctv_${Date.now()}`;
        const ownerId = canViewAllCollaborators
            ? (newCtv.ownerId || user?.id || 'u1')
            : (user?.id || 'u1');
        const newItem: ICollaborator = {
            id: newId,
            name: newCtv.name.trim(),
            phone: newCtv.phone.trim(),
            ownerId,
            ownerName: getOwnerName(ownerId),
            followers: ownerId ? [buildCollaboratorFollower(ownerId, getOwnerName(ownerId), 'Sale phụ trách')] : [],
            city: newCtv.city || 'Hà Nội',
            industry: newCtv.industry || '',
            segment: newCtv.segment || '',
            notes: newCtv.notes || '',
            status: newCtv.status || 'New',
            activities: [{
                id: `act-${Date.now()}`,
                type: 'system',
                timestamp: new Date().toISOString(),
                title: 'Hệ thống',
                description: 'Đã tạo cộng tác viên mới',
                user: user?.name || 'Admin'
            }]
        };
        updateCollaborators([newItem, ...collaborators]);
        setIsAddModalOpen(false);
        setNewCtv({});
    };

    const openEditModal = (ctv: ICollaborator) => {
        setEditingCtv({
            ...ctv,
            ownerId: ctv.ownerId || user?.id || 'u1',
            ownerName: ctv.ownerName || getOwnerName(ctv.ownerId || user?.id || 'u1')
        });
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = () => {
        if (!editingCtv || !editingCtv.id || !editingCtv.name || !editingCtv.phone) return;

        const current = collaborators.find(c => c.id === editingCtv.id);
        if (!current) return;

        const ownerId = canViewAllCollaborators
            ? (editingCtv.ownerId || current.ownerId || user?.id || 'u1')
            : (user?.id || current.ownerId || 'u1');
        const updated: ICollaborator = {
            ...current,
            ...editingCtv,
            name: editingCtv.name.trim(),
            phone: editingCtv.phone.trim(),
            ownerId,
            ownerName: getOwnerName(ownerId),
            city: editingCtv.city || current.city || 'Hà Nội',
            industry: editingCtv.industry || '',
            segment: editingCtv.segment || '',
            notes: editingCtv.notes || '',
            activities: [{
                id: `act-${Date.now()}`,
                type: 'system',
                timestamp: new Date().toISOString(),
                title: 'Hệ thống',
                description: 'Đã cập nhật thông tin cộng tác viên',
                user: user?.name || 'Admin'
            }, ...(current.activities || [])]
        };

        handleUpdateCtv(updated);
        setIsEditModalOpen(false);
        setEditingCtv(null);
    };

    const handleUpdateCtv = (updated: ICollaborator) => {
        const newList = collaborators.map(c => c.id === updated.id ? updated : c);
        updateCollaborators(newList);
        if (selectedCtv?.id === updated.id) {
            setSelectedCtv(updated);
        }
    };

    const toggleColumn = (id: string) => {
        setColumns(prev => prev.map(col => col.id === id ? { ...col, visible: !col.visible } : col));
    };

    const isColVisible = (id: string) => columns.find(c => c.id === id)?.visible;

    useEffect(() => {
        if (typeof window === 'undefined' || collaborators.length === 0) return;

        const collaboratorId = localStorage.getItem(COLLABORATOR_FOCUS_KEY);
        if (!collaboratorId) return;

        const target = collaborators.find(item => item.id === collaboratorId);
        localStorage.removeItem(COLLABORATOR_FOCUS_KEY);

        if (!target) return;
        if (!canViewAllCollaborators && target.ownerId !== user?.id) return;

        setSelectedCtv(target);
    }, [collaborators, canViewAllCollaborators, user?.id]);

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] text-[#111418] font-sans">
            <div className="flex flex-col flex-1 p-6 lg:p-8 max-w-[1600px] mx-auto w-full gap-6">

                {/* Header */}
                <div className="flex flex-wrap justify-between items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Danh sách Cộng tác viên</h1>
                        <p className="text-slate-500 mt-1">Quản lý mạng lưới đối tác, hiệu quả giới thiệu và hoa hồng.</p>
                    </div>
                    <button
                        onClick={() => {
                            setNewCtv({
                                ownerId: user?.id || 'u1',
                                ownerName: user?.name || getOwnerName(user?.id || 'u1')
                            });
                            setIsAddModalOpen(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-all"
                    >
                        <Plus size={20} /> Thêm CTV
                    </button>
                </div>

                <div className="hidden">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`px-4 py-2 rounded-md text-sm font-bold inline-flex items-center gap-2 transition-colors ${activeTab === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Tất cả
                        <span className={`rounded-full px-2 py-0.5 text-xs ${activeTab === 'all' ? 'bg-slate-100 text-slate-700' : 'bg-white text-slate-500'}`}>
                            {visibleCollaborators.length}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('slow_ctv')}
                        className={`px-4 py-2 rounded-md text-sm font-bold inline-flex items-center gap-2 transition-colors ${activeTab === 'slow_ctv' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Clock size={14} />
                        Chậm CTV
                        <span className={`rounded-full px-2 py-0.5 text-xs ${activeTab === 'slow_ctv' ? 'bg-rose-100 text-rose-700' : 'bg-white text-slate-500'}`}>
                            {slowCollaboratorRows.length}
                        </span>
                    </button>
                </div>

                {/* Toolbar & Filters */}
                <div className="flex flex-col md:flex-row gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                    {/* Search */}
                    <div className="flex-[1.5] min-w-[250px]">
                        <PinnedSearchInput
                            value={searchTerm}
                            onChange={setSearchTerm}
                            placeholder="Tim kiem theo ten, SDT, thanh pho..."
                            chips={activeSearchChips}
                            onRemoveChip={removeSearchChip}
                            inputClassName="text-sm"
                        />
                    </div>

                    <div className="h-full w-px bg-slate-200 hidden md:block mx-1"></div>

                    {/* Filters Row */}
                    <div className="flex flex-1 gap-2 overflow-x-auto">
                        <div className="relative min-w-[140px]">
                            <select
                                value={filterCity}
                                onChange={(e) => setFilterCity(e.target.value)}
                                className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white outline-none appearance-none cursor-pointer font-medium text-slate-700 hover:border-slate-300"
                            >
                                <option value="All">Khu vực: Tất cả</option>
                                {cityOptions.filter(o => o !== 'All').map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                            <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        </div>

                        <div className="relative min-w-[140px]">
                            <select
                                value={filterIndustry}
                                onChange={(e) => setFilterIndustry(e.target.value)}
                                className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white outline-none appearance-none cursor-pointer font-medium text-slate-700 hover:border-slate-300"
                            >
                                <option value="All">Ngành nghề: Tất cả</option>
                                {industryOptions.filter(o => o !== 'All').map(i => (
                                    <option key={i} value={i}>{i}</option>
                                ))}
                            </select>
                            <Briefcase className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        </div>
                    </div>

                    <div className="h-full w-px bg-slate-200 hidden md:block mx-1"></div>

                    {/* Column Control */}
                    <div className="relative">
                        <button
                            onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                            className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 bg-white"
                        >
                            <ColumnsIcon size={16} /> Cột Hiển thị
                        </button>

                        {showColumnDropdown && (
                            <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                <div className="p-3 border-b border-slate-100 font-bold text-xs text-slate-500 bg-slate-50">Tùy chỉnh cột</div>
                                <div className="p-2 space-y-1 max-h-64 overflow-y-auto">
                                    {columns.map(col => (
                                        <label key={col.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-blue-50 rounded cursor-pointer text-sm">
                                            <input
                                                type="checkbox"
                                                checked={col.visible}
                                                onChange={() => toggleColumn(col.id)}
                                                className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                                            />
                                            {col.label}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Backdrop to close */}
                        {showColumnDropdown && (
                            <div className="fixed inset-0 z-10" onClick={() => setShowColumnDropdown(false)}></div>
                        )}
                    </div>
                </div>

                {/* Excel-style Table View */}
                <div className="bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden flex-1 flex flex-col">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead className="bg-[#f0f4f8] text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10">
                                <tr>
                                    {isColVisible('index') && <th className="p-3 border-r border-slate-200 w-12 text-center">#</th>}
                                    {isColVisible('name') && <th className="p-3 border-r border-slate-200 min-w-[220px]">Thông tin CTV / Liên hệ</th>}
                                    {isColVisible('city') && <th className="p-3 border-r border-slate-200">Khu vực</th>}
                                    {isColVisible('industry') && <th className="p-3 border-r border-slate-200">Ngành nghề</th>}
                                    {isColVisible('segment') && <th className="p-3 border-r border-slate-200">Mảng hợp tác</th>}
                                    {isColVisible('stats') && <th className="p-3 border-r border-slate-200 text-center bg-blue-50/50">HVGT / HĐ</th>}
                                    {isColVisible('notes') && <th className="p-3 border-r border-slate-200 min-w-[200px]">Ghi chú & Note</th>}
                                    {activeTab === 'slow_ctv' && <th className="p-3 border-r border-slate-200 min-w-[180px] text-rose-700">SLA chậm lịch hẹn</th>}

                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {filteredList.map((ctv, index) => {
                                    const stats = getStats(ctv.name);
                                    const overdueInfo = slowCollaboratorMap.get(ctv.id);
                                    return (
                                        <tr
                                            key={ctv.id}
                                            onClick={() => setSelectedCtv(ctv)}
                                            className={`transition-colors group text-slate-800 cursor-pointer ${overdueInfo ? 'bg-rose-50/40 hover:bg-rose-50/70' : 'hover:bg-blue-50/50'}`}
                                        >
                                            {isColVisible('index') && (
                                                <td className="p-3 border-r border-slate-200 text-center text-slate-500 bg-slate-50/30">{index + 1}</td>
                                            )}

                                            {isColVisible('name') && (
                                                <td className="p-3 border-r border-slate-200">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs shrink-0 border border-indigo-200">
                                                            {ctv.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-[#1e293b]">{ctv.name}</div>
                                                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                                <a
                                                                    href={`tel:${ctv.phone}`}
                                                                    className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors text-xs font-bold"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <Phone size={10} fill="currentColor" /> {ctv.phone}
                                                                </a>
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-semibold">
                                                                    <User size={10} /> {ctv.ownerName || getOwnerName(ctv.ownerId) || 'Chưa gắn sale'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            )}

                                            {isColVisible('city') && (
                                                <td className="p-3 border-r border-slate-200">
                                                    <span className="flex items-center gap-1.5">
                                                        <MapPin size={14} className="text-slate-400" /> {ctv.city}
                                                    </span>
                                                </td>
                                            )}

                                            {isColVisible('industry') && (
                                                <td className="p-3 border-r border-slate-200 text-slate-600">{ctv.industry}</td>
                                            )}

                                            {isColVisible('segment') && (
                                                <td className="p-3 border-r border-slate-200">
                                                    <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded border border-slate-200 font-medium">
                                                        {ctv.segment}
                                                    </span>
                                                </td>
                                            )}

                                            {isColVisible('stats') && (
                                                <td className="p-3 border-r border-slate-200 bg-blue-50/20">
                                                    <div className="flex justify-center gap-2">
                                                        <div className="flex flex-col items-center min-w-[40px]">
                                                            <span className="text-[10px] uppercase text-slate-400 font-bold">Leads</span>
                                                            <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-sm">{stats.total}</span>
                                                        </div>
                                                        <div className="w-px bg-slate-300 h-8 self-center"></div>
                                                        <div className="flex flex-col items-center min-w-[40px]">
                                                            <span className="text-[10px] uppercase text-slate-400 font-bold">Won</span>
                                                            <span className={`font-bold px-2 py-0.5 rounded border shadow-sm ${stats.contracts > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                                                                {stats.contracts}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                            )}

                                            {isColVisible('notes') && (
                                                <td className="p-3 border-r border-slate-200">
                                                    <div className="flex flex-col gap-1.5">
                                                        {overdueInfo && (
                                                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-700 bg-rose-50 w-fit px-1.5 py-0.5 rounded border border-rose-100">
                                                                <AlertTriangle size={10} />
                                                                Chậm lịch hẹn
                                                            </div>
                                                        )}
                                                        {ctv.nextAppointment && (
                                                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-700 bg-blue-50 w-fit px-1.5 py-0.5 rounded border border-blue-100">
                                                                <Calendar size={10} />
                                                                {formatCollaboratorDateTime(ctv.nextAppointment)}
                                                            </div>
                                                        )}
                                                        <p className="text-xs text-slate-500 italic line-clamp-2">
                                                            {ctv.activities && ctv.activities.length > 0
                                                                ? ctv.activities[0].description
                                                                : (ctv.notes || 'Chưa có ghi chú')}
                                                        </p>
                                                    </div>
                                                </td>
                                            )}

                                            {activeTab === 'slow_ctv' && (
                                                <td className="p-3 border-r border-slate-200">
                                                    {overdueInfo ? (
                                                        <div className="flex flex-col gap-1">
                                                            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-rose-700">
                                                                <Clock size={14} /> {overdueInfo.overdueText}
                                                            </span>
                                                            <span className="text-xs text-slate-500">
                                                                Quá lịch hẹn đã lên cho CTV
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-slate-400">-</span>
                                                    )}
                                                </td>
                                            )}


                                        </tr>
                                    );
                                })}

                                {filteredList.length === 0 && (
                                    <tr>
                                        <td colSpan={ALL_COLUMNS.length + (activeTab === 'slow_ctv' ? 1 : 0)} className="p-12 text-center text-slate-400">
                                            <Filter size={48} className="mb-4 text-slate-200" />
                                            {activeTab === 'slow_ctv' ? (
                                                <p>Chưa có cộng tác viên nào đang chậm lịch hẹn theo SLA.</p>
                                            ) : null}
                                            {activeTab !== 'slow_ctv' ? <p>Không tìm thấy cộng tác viên phù hợp với bộ lọc hiện tại.</p> : null}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 flex justify-between items-center">
                        <span>Hiển thị {filteredList.length} / {scopedCollaborators.length} kết quả</span>
                        <button className="flex items-center gap-1 hover:text-blue-600 font-medium transition-colors">
                            <Download size={14} /> Xuất Excel
                        </button>
                    </div>
                </div>

            </div>

            {/* --- ADD MODAL --- */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm z-[9999]">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 border border-slate-200">
                        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
                            <h2 className="text-lg font-bold text-slate-800">Thêm Cộng tác viên mới</h2>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-1">
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Họ tên <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                        value={newCtv.name || ''}
                                        onChange={e => setNewCtv({ ...newCtv, name: e.target.value })}
                                        placeholder="VD: Nguyễn Văn A"
                                        autoFocus
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Điện thoại <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                        value={newCtv.phone || ''}
                                        onChange={e => setNewCtv({ ...newCtv, phone: e.target.value })}
                                        placeholder="VD: 0912..."
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-1">
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Ngành nghề</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                        value={newCtv.industry || ''}
                                        onChange={e => setNewCtv({ ...newCtv, industry: e.target.value })}
                                        placeholder="VD: Giáo viên..."
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Mảng hợp tác</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                        value={newCtv.segment || ''}
                                        onChange={e => setNewCtv({ ...newCtv, segment: e.target.value })}
                                        placeholder="VD: Du học..."
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-1">
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Khu vực</label>
                                    <select
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none bg-white focus:border-blue-500 transition-all"
                                        value={newCtv.city || ''}
                                        onChange={e => setNewCtv({ ...newCtv, city: e.target.value })}
                                    >
                                        <option value="">-- Chọn khu vực --</option>
                                        <option value="Hà Nội">Hà Nội</option>
                                        <option value="Hồ Chí Minh">Hồ Chí Minh</option>
                                        <option value="Đà Nẵng">Đà Nẵng</option>
                                        <option value="Khác">Khác</option>
                                    </select>
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Trạng thái</label>
                                    <select
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none bg-white focus:border-blue-500 transition-all"
                                        value={newCtv.status || 'New'}
                                        onChange={e => setNewCtv({ ...newCtv, status: e.target.value as ICollaborator['status'] })}
                                    >
                                        <option value="New">New</option>
                                        <option value="Active">Active</option>
                                        <option value="Need Support">Need Support</option>
                                        <option value="Stopped">Stopped</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Sale phụ trách</label>
                                    <select
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none bg-white focus:border-blue-500 transition-all"
                                        value={newCtv.ownerId || (user?.id || '')}
                                        onChange={e => {
                                            const ownerId = e.target.value;
                                            setNewCtv({
                                                ...newCtv,
                                                ownerId,
                                                ownerName: getOwnerName(ownerId)
                                            });
                                        }}
                                    >
                                        <option value="">-- Chọn sale --</option>
                                        {ownerOptions.map(owner => (
                                            <option key={owner.id} value={owner.id}>{owner.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Ghi chú & Lịch hẹn</label>
                                <textarea
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none min-h-[80px] focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                                    value={newCtv.notes || ''}
                                    onChange={e => setNewCtv({ ...newCtv, notes: e.target.value })}
                                    placeholder="Ghi chú về tiềm năng, lịch hẹn tiếp theo..."
                                />
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                className="px-4 py-2 text-slate-600 font-bold text-sm hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                Đóng
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={!newCtv.name || !newCtv.phone}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
                            >
                                Lưu CTV
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- EDIT MODAL --- */}
            {isEditModalOpen && editingCtv && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 border border-slate-200">
                        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
                            <h2 className="text-lg font-bold text-slate-800">Sửa thông tin CTV</h2>
                            <button
                                onClick={() => {
                                    setIsEditModalOpen(false);
                                    setEditingCtv(null);
                                }}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-1">
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Họ tên <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                        value={editingCtv.name || ''}
                                        onChange={e => setEditingCtv({ ...editingCtv, name: e.target.value })}
                                        autoFocus
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Điện thoại <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                        value={editingCtv.phone || ''}
                                        onChange={e => setEditingCtv({ ...editingCtv, phone: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-1">
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Ngành nghề</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                        value={editingCtv.industry || ''}
                                        onChange={e => setEditingCtv({ ...editingCtv, industry: e.target.value })}
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Mảng hợp tác</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                        value={editingCtv.segment || ''}
                                        onChange={e => setEditingCtv({ ...editingCtv, segment: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-1">
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                        value={editingCtv.email || ''}
                                        onChange={e => setEditingCtv({ ...editingCtv, email: e.target.value })}
                                        placeholder="vd: ctv@email.com"
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Địa chỉ</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                        value={editingCtv.address || ''}
                                        onChange={e => setEditingCtv({ ...editingCtv, address: e.target.value })}
                                        placeholder="Số nhà, đường..."
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-1">
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Khu vực</label>
                                    <select
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none bg-white focus:border-blue-500 transition-all"
                                        value={editingCtv.city || ''}
                                        onChange={e => setEditingCtv({ ...editingCtv, city: e.target.value })}
                                    >
                                        <option value="">-- Chọn khu vực --</option>
                                        <option value="Hà Nội">Hà Nội</option>
                                        <option value="Hồ Chí Minh">Hồ Chí Minh</option>
                                        <option value="Đà Nẵng">Đà Nẵng</option>
                                        <option value="Khác">Khác</option>
                                    </select>
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Trạng thái</label>
                                    <select
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none bg-white focus:border-blue-500 transition-all"
                                        value={editingCtv.status || 'New'}
                                        onChange={e => setEditingCtv({ ...editingCtv, status: e.target.value as ICollaborator['status'] })}
                                    >
                                        <option value="New">New</option>
                                        <option value="Active">Active</option>
                                        <option value="Need Support">Need Support</option>
                                        <option value="Stopped">Stopped</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Sale phụ trách</label>
                                    <select
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none bg-white focus:border-blue-500 transition-all"
                                        value={editingCtv.ownerId || ''}
                                        onChange={e => {
                                            const ownerId = e.target.value;
                                            setEditingCtv({
                                                ...editingCtv,
                                                ownerId,
                                                ownerName: getOwnerName(ownerId)
                                            });
                                        }}
                                    >
                                        <option value="">-- Chọn sale --</option>
                                        {ownerOptions.map(owner => (
                                            <option key={owner.id} value={owner.id}>{owner.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Ghi chú</label>
                                <textarea
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none min-h-[80px] focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                                    value={editingCtv.notes || ''}
                                    onChange={e => setEditingCtv({ ...editingCtv, notes: e.target.value })}
                                    placeholder="Nhập ghi chú chăm sóc CTV..."
                                />
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                            <button
                                onClick={() => {
                                    setIsEditModalOpen(false);
                                    setEditingCtv(null);
                                }}
                                className="px-4 py-2 text-slate-600 font-bold text-sm hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                Đóng
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                disabled={!editingCtv.name || !editingCtv.phone}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
                            >
                                Lưu thay đổi
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {selectedCtv && (
                <CollaboratorCareDrawer
                    ctv={selectedCtv}
                    isOpen={!!selectedCtv}
                    onClose={() => setSelectedCtv(null)}
                    onUpdate={handleUpdateCtv}
                    onEdit={openEditModal}
                />
            )}
        </div>
    );
};

export default Collaborators;
