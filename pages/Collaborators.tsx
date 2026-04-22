
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
import { getLeads, getCollaborators, saveCollaborators, getSalesTeams } from '../utils/storage';
import { LeadStatus, IActivityLog, UserRole } from '../types';
import { useAuth } from '../contexts/AuthContext';
import LogAudienceFilterControl from '../components/LogAudienceFilter';
import PinnedSearchInput, { PinnedSearchChip } from '../components/PinnedSearchInput';
import { LogAudienceFilter } from '../utils/logAudience';
import { decodeMojibakeText } from '../utils/mojibake';

// Mock Data for Collaborators
interface ICollaborator {
    id: string;
    code?: string;
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
    status?: 'Hoạt động' | 'Tạm ngưng' | 'Dừng hợp tác' | 'Active' | 'Need Support' | 'Stopped' | 'New';
    activities?: IActivityLog[];
    followers?: ICollaboratorFollower[];
}

interface ICollaboratorFollower {
    id: string;
    name: string;
    avatar?: string;
    role?: string;
    branch?: string;
    addedAt?: string;
}

const MOCK_COLLABORATORS: ICollaborator[] = [
    {
        id: 'ctv_1',
        code: 'CTV0001',
        name: 'Nguyễn Văn A',
        phone: '0912345678',
        ownerId: 'u1',
        ownerName: 'Trần Văn Quản Trị',
        city: 'Hà Nội',
        industry: 'Giáo viên',
        segment: 'IELTS',
        notes: 'Cần gửi chính sách thưởng mới',
        nextAppointment: '2026-05-20',
        status: 'Hoạt động'
    },
    {
        id: 'ctv_2',
        code: 'CTV0002',
        name: 'Trần Thị B',
        phone: '0988777666',
        ownerId: 'u2',
        ownerName: 'Sarah Miller',
        city: 'Hồ Chí Minh',
        industry: 'Sinh viên',
        segment: 'Du học',
        notes: 'Đã gửi quà tết. Follow up tháng sau.',
        nextAppointment: '2026-06-10',
        status: 'Tạm ngưng'
    },
    {
        id: 'ctv_3',
        code: 'CTV0003',
        name: 'Lê Văn C',
        phone: '0901112233',
        ownerId: 'u3',
        ownerName: 'David Clark',
        city: 'Đà Nẵng',
        industry: 'Trung tâm tiếng Anh',
        segment: 'Xuất khẩu lao động',
        notes: 'Tiềm năng lớn, cần chăm sóc kỹ.',
        status: 'Hoạt động'
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

const COLLABORATOR_SCHEDULE_TYPES = [
    { id: 'call', label: 'Gọi điện', defaultDelayHours: 2 },
    { id: 'message', label: 'Nhắn tin', defaultDelayHours: 1 },
    { id: 'email', label: 'Gửi email', defaultDelayHours: 2 },
    { id: 'meeting', label: 'Meeting', defaultDelayHours: 24 },
    { id: 'other', label: 'Khác', defaultDelayHours: 4 }
] as const;

const COLLABORATOR_PROVINCE_OPTIONS = [
    'Hà Nội',
    'Cao Bằng',
    'Tuyên Quang',
    'Điện Biên',
    'Lai Châu',
    'Sơn La',
    'Lào Cai',
    'Thái Nguyên',
    'Lạng Sơn',
    'Quảng Ninh',
    'Bắc Ninh',
    'Phú Thọ',
    'Hải Phòng',
    'Hưng Yên',
    'Ninh Bình',
    'Thanh Hóa',
    'Nghệ An',
    'Hà Tĩnh',
    'Quảng Trị',
    'Huế',
    'Đà Nẵng',
    'Quảng Ngãi',
    'Gia Lai',
    'Khánh Hòa',
    'Đắk Lắk',
    'Lâm Đồng',
    'Đồng Nai',
    'Hồ Chí Minh',
    'Tây Ninh',
    'Đồng Tháp',
    'Vĩnh Long',
    'An Giang',
    'Cần Thơ',
    'Cà Mau'
] as const;

const COLLABORATOR_FOCUS_KEY = 'educrm_collaborator_focus_id';

type CollaboratorStatusValue = 'Hoạt động' | 'Tạm ngưng' | 'Dừng hợp tác';

const COLLABORATOR_STATUS_OPTIONS: Array<{
    id: CollaboratorStatusValue;
    label: CollaboratorStatusValue;
    badgeClass: string;
    buttonActiveClass: string;
}> = [
    {
        id: 'Hoạt động',
        label: 'Hoạt động',
        badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        buttonActiveClass: 'border-emerald-600 bg-emerald-600 text-white shadow-md'
    },
    {
        id: 'Tạm ngưng',
        label: 'Tạm ngưng',
        badgeClass: 'border-amber-200 bg-amber-50 text-amber-700',
        buttonActiveClass: 'border-amber-600 bg-amber-600 text-white shadow-md'
    },
    {
        id: 'Dừng hợp tác',
        label: 'Dừng hợp tác',
        badgeClass: 'border-rose-200 bg-rose-50 text-rose-700',
        buttonActiveClass: 'border-rose-600 bg-rose-600 text-white shadow-md'
    }
];

const normalizeCollaboratorStatus = (status?: ICollaborator['status']): CollaboratorStatusValue => {
    switch (status) {
        case 'Hoạt động':
        case 'Active':
            return 'Hoạt động';
        case 'Dừng hợp tác':
        case 'Stopped':
            return 'Dừng hợp tác';
        case 'Tạm ngưng':
        case 'Need Support':
        case 'New':
            return 'Tạm ngưng';
        default:
            return 'Tạm ngưng';
    }
};

const getCollaboratorStatusMeta = (status?: ICollaborator['status']) =>
    COLLABORATOR_STATUS_OPTIONS.find((item) => item.id === normalizeCollaboratorStatus(status)) || COLLABORATOR_STATUS_OPTIONS[1];

const getCollaboratorStatusLabel = (status?: ICollaborator['status']) =>
    getCollaboratorStatusMeta(status).label;

const normalizeTextToken = (value?: string) =>
    String(value || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const COLLABORATOR_PROVINCE_ALIAS_GROUPS: Array<{ province: (typeof COLLABORATOR_PROVINCE_OPTIONS)[number]; aliases: string[] }> = [
    { province: 'Hà Nội', aliases: ['ha noi'] },
    { province: 'Cao Bằng', aliases: ['cao bang'] },
    { province: 'Tuyên Quang', aliases: ['tuyen quang', 'ha giang'] },
    { province: 'Điện Biên', aliases: ['dien bien'] },
    { province: 'Lai Châu', aliases: ['lai chau'] },
    { province: 'Sơn La', aliases: ['son la'] },
    { province: 'Lào Cai', aliases: ['lao cai', 'yen bai'] },
    { province: 'Thái Nguyên', aliases: ['thai nguyen', 'bac kan', 'bac can'] },
    { province: 'Lạng Sơn', aliases: ['lang son'] },
    { province: 'Quảng Ninh', aliases: ['quang ninh'] },
    { province: 'Bắc Ninh', aliases: ['bac ninh', 'bac giang'] },
    { province: 'Phú Thọ', aliases: ['phu tho', 'vinh phuc', 'hoa binh'] },
    { province: 'Hải Phòng', aliases: ['hai phong', 'hai duong'] },
    { province: 'Hưng Yên', aliases: ['hung yen', 'thai binh'] },
    { province: 'Ninh Bình', aliases: ['ninh binh', 'ha nam', 'nam dinh'] },
    { province: 'Thanh Hóa', aliases: ['thanh hoa'] },
    { province: 'Nghệ An', aliases: ['nghe an'] },
    { province: 'Hà Tĩnh', aliases: ['ha tinh'] },
    { province: 'Quảng Trị', aliases: ['quang tri', 'quang binh'] },
    { province: 'Huế', aliases: ['hue', 'thua thien hue'] },
    { province: 'Đà Nẵng', aliases: ['da nang', 'quang nam'] },
    { province: 'Quảng Ngãi', aliases: ['quang ngai', 'kon tum'] },
    { province: 'Gia Lai', aliases: ['gia lai', 'binh dinh'] },
    { province: 'Khánh Hòa', aliases: ['khanh hoa', 'ninh thuan'] },
    { province: 'Đắk Lắk', aliases: ['dak lak', 'daklak', 'phu yen'] },
    { province: 'Lâm Đồng', aliases: ['lam dong', 'dak nong', 'binh thuan'] },
    { province: 'Đồng Nai', aliases: ['dong nai', 'binh phuoc'] },
    { province: 'Hồ Chí Minh', aliases: ['ho chi minh', 'thanh pho ho chi minh', 'tp ho chi minh', 'hcm', 'hcmc', 'sai gon', 'saigon', 'binh duong', 'ba ria vung tau', 'vung tau', 'ba ria'] },
    { province: 'Tây Ninh', aliases: ['tay ninh', 'long an'] },
    { province: 'Đồng Tháp', aliases: ['dong thap', 'tien giang'] },
    { province: 'Vĩnh Long', aliases: ['vinh long', 'ben tre', 'tra vinh'] },
    { province: 'An Giang', aliases: ['an giang', 'kien giang'] },
    { province: 'Cần Thơ', aliases: ['can tho', 'soc trang', 'hau giang'] },
    { province: 'Cà Mau', aliases: ['ca mau', 'bac lieu'] }
];

const normalizeCollaboratorProvince = (value?: string): string => {
    const rawValue = String(value || '').trim();
    const token = normalizeTextToken(rawValue);
    if (!token) return '';

    const directMatch = COLLABORATOR_PROVINCE_OPTIONS.find((option) => normalizeTextToken(option) === token);
    if (directMatch) return directMatch;

    const matchedAlias = COLLABORATOR_PROVINCE_ALIAS_GROUPS.find(({ aliases }) =>
        aliases.some((alias) => token === alias || token.includes(alias))
    );

    return matchedAlias?.province || rawValue;
};

const normalizeCollaboratorLogDescription = (description?: string) => {
    const value = String(description || '');
    if (!value.includes('Trạng thái CTV:')) return value;

    return value
        .replaceAll('Need Support', 'Tạm ngưng')
        .replaceAll('Stopped', 'Dừng hợp tác')
        .replaceAll('Paused', 'Tạm ngưng')
        .replaceAll('Active', 'Hoạt động')
        .replaceAll('New', 'Tạm ngưng');
};

const COLLABORATOR_LOG_TYPE_META: Record<IActivityLog['type'], { label: string; badgeClass: string; bodyClass: string }> = {
    system: {
        label: 'Hệ thống',
        badgeClass: 'bg-slate-100 text-slate-600',
        bodyClass: 'bg-slate-50 border-transparent text-slate-500 italic p-2 shadow-none'
    },
    note: {
        label: 'Log Note',
        badgeClass: 'bg-amber-100 text-amber-800',
        bodyClass: 'bg-amber-50 border-amber-100 text-slate-800'
    },
    activity: {
        label: 'Lịch hẹn',
        badgeClass: 'bg-violet-100 text-violet-700',
        bodyClass: 'bg-violet-50 border-violet-100 text-violet-900'
    },
    message: {
        label: 'Tin nhắn',
        badgeClass: 'bg-blue-100 text-blue-700',
        bodyClass: 'bg-blue-50 border-blue-100 text-slate-800'
    }
};

const getCollaboratorLogMeta = (type?: IActivityLog['type']) => COLLABORATOR_LOG_TYPE_META[type || 'note'] || COLLABORATOR_LOG_TYPE_META.note;

const normalizeCollaboratorCode = (value?: string) => String(value || '').trim().toUpperCase();

const parseCollaboratorCodeNumber = (value?: string) => {
    const matched = normalizeCollaboratorCode(value).match(/(\d+)$/);
    return matched ? Number.parseInt(matched[1], 10) : null;
};

const formatCollaboratorCode = (value: number) => `CTV${String(value).padStart(4, '0')}`;

const getNextCollaboratorCode = (items: Array<Pick<ICollaborator, 'code'>>) => {
    const maxCode = items.reduce((maxValue, item) => {
        const parsedValue = parseCollaboratorCodeNumber(item.code);
        return parsedValue && parsedValue > maxValue ? parsedValue : maxValue;
    }, 0);

    return formatCollaboratorCode(maxCode + 1);
};

const ensureCollaboratorCodes = (items: ICollaborator[]) => {
    const normalized = items.map((item) => ({
        ...item,
        code: normalizeCollaboratorCode(item.code)
    }));

    let nextCodeNumber = normalized.reduce((maxValue, item) => {
        const parsedValue = parseCollaboratorCodeNumber(item.code);
        return parsedValue && parsedValue > maxValue ? parsedValue : maxValue;
    }, 0);

    return normalized.map((item) => {
        if (item.code) return item;
        nextCodeNumber += 1;
        return {
            ...item,
            code: formatCollaboratorCode(nextCodeNumber)
        };
    });
};

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
    role = 'Nhân viên kinh doanh',
    branch?: string
): ICollaboratorFollower => ({
    id,
    name,
    role,
    branch,
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
    { id: 'status', label: 'Trạng thái', visible: true },
    { id: 'name', label: 'Họ tên & SĐT', visible: true },
    { id: 'city', label: 'Tỉnh / thành', visible: true },
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
    const [overviewNote, setOverviewNote] = useState('');
    const [noteContent, setNoteContent] = useState('');
    const [interactionType, setInteractionType] = useState('Call');
    const [scheduleNext, setScheduleNext] = useState(false);
    const [showNextActivityModal, setShowNextActivityModal] = useState(false);
    const [nextActivityType, setNextActivityType] = useState<(typeof COLLABORATOR_SCHEDULE_TYPES)[number]['id']>('call');
    const [nextActivityDate, setNextActivityDate] = useState('');
    const [nextActivitySummary, setNextActivitySummary] = useState('');
    const [showFollowersModal, setShowFollowersModal] = useState(false);
    const [followerBranchFilter, setFollowerBranchFilter] = useState('all');
    const [logAudienceFilter, setLogAudienceFilter] = useState<LogAudienceFilter>('ALL');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; visible: boolean } | null>(null);
    const [activeTab, setActiveTab] = useState<'info' | 'care'>('care');

    const salesFollowerOptions = useMemo(() => {
        const options = new Map<string, ICollaboratorFollower>();
        const teams = getSalesTeams();

        teams.forEach((team) => {
            team.members.forEach((member) => {
                options.set(
                    member.userId,
                    buildCollaboratorFollower(
                        member.userId,
                        member.name,
                        member.role || 'Nhân viên kinh doanh',
                        member.branch || team.branch
                    )
                );
            });
        });

        SALE_OWNER_OPTIONS.forEach((item) => {
            const existing = options.get(item.id);
            options.set(
                item.id,
                existing
                    ? { ...existing, name: item.name, avatar: existing.avatar || getInitials(item.name) }
                    : buildCollaboratorFollower(item.id, item.name)
            );
        });

        if (user?.id && user?.name) {
            const existing = options.get(user.id);
            options.set(
                user.id,
                existing
                    ? { ...existing, name: user.name, role: existing.role || user.role || 'Nhân viên kinh doanh' }
                    : buildCollaboratorFollower(
                        user.id,
                        user.name,
                        user.role || 'Nhân viên kinh doanh'
                    )
            );
        }

        return Array.from(options.values()).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    }, [user?.id, user?.name, user?.role]);

    const followerBranchOptions = useMemo(
        () => Array.from(new Set(salesFollowerOptions.map((item) => item.branch).filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b), 'vi')),
        [salesFollowerOptions]
    );

    const filteredSalesFollowerOptions = useMemo(
        () => salesFollowerOptions.filter((item) => followerBranchFilter === 'all' || item.branch === followerBranchFilter),
        [salesFollowerOptions, followerBranchFilter]
    );

    const currentFollowers = useMemo(() => {
        const merged = new Map<string, ICollaboratorFollower>();

        if (ctv.ownerId) {
            const ownerOption = salesFollowerOptions.find((item) => item.id === ctv.ownerId);
            const ownerLabel =
                ctv.ownerName ||
                ownerOption?.name ||
                ctv.ownerId;
            merged.set(
                ctv.ownerId,
                buildCollaboratorFollower(ctv.ownerId, ownerLabel, ownerOption?.role || 'Sale phụ trách', ownerOption?.branch)
            );
        }

        (ctv.followers || []).forEach((item) => {
            const matchedOption = salesFollowerOptions.find((option) => option.id === item.id);
            merged.set(item.id, {
                ...item,
                avatar: item.avatar || getInitials(item.name),
                role: item.role || matchedOption?.role,
                branch: item.branch || matchedOption?.branch
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

    const getDefaultNextActivityDate = (typeId: (typeof COLLABORATOR_SCHEDULE_TYPES)[number]['id'] = 'call') => {
        const matchedType = COLLABORATOR_SCHEDULE_TYPES.find((item) => item.id === typeId);
        const delayHours = matchedType?.defaultDelayHours || 0;
        const now = new Date();
        now.setHours(now.getHours() + delayHours);
        const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
        return local.toISOString().slice(0, 16);
    };

    const resetNextActivityForm = () => {
        setNextActivityType('call');
        setNextActivityDate(getDefaultNextActivityDate('call'));
        setNextActivitySummary('');
    };

    const closeNextActivityModal = () => {
        setShowNextActivityModal(false);
        resetNextActivityForm();
    };

    useEffect(() => {
        if (!isOpen) return;
        setOverviewNote(ctv.notes || '');
        setNoteContent('');
        setInteractionType('Call');
        setScheduleNext(false);
        setShowNextActivityModal(false);
        setShowFollowersModal(false);
        setFollowerBranchFilter('all');
        setLogAudienceFilter('ALL');
        resetNextActivityForm();
        setToast(null);
    }, [ctv.id, ctv.notes, isOpen]);

    useEffect(() => {
        if (!scheduleNext) return;
        setNextActivityDate(getDefaultNextActivityDate(nextActivityType));
    }, [nextActivityType, scheduleNext]);

    if (!isOpen) return null;

    const handleAddNote = () => {
        const trimmedNote = noteContent.trim();
        const trimmedScheduleSummary = nextActivitySummary.trim();

        if (!trimmedNote && !scheduleNext) {
            showToast('Vui lòng nhập nội dung chăm sóc CTV.', 'error');
            return;
        }

        if (scheduleNext && !trimmedScheduleSummary) {
            showToast('\u0056ui l\u00f2ng nh\u1eadp n\u1ed9i dung l\u1ecbch ch\u0103m s\u00f3c.', 'error');
            return;
        }

        if (scheduleNext && !nextActivityDate) {
            showToast('\u0056ui l\u00f2ng ch\u1ecdn ng\u00e0y gi\u1edd cho l\u1ecbch ch\u0103m s\u00f3c.', 'error');
            return;
        }

        if (scheduleNext) {
            if (!trimmedScheduleSummary) {
                showToast('Vui lÃ²ng nháº­p ná»™i dung lá»‹ch chÄƒm sÃ³c.', 'error');
                return;
            }

            if (!nextActivityDate) {
                showToast('Vui lÃ²ng chá»n ngÃ y giá» cho lá»‹ch chÄƒm sÃ³c.', 'error');
                return;
            }
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

        const createdActivities: IActivityLog[] = [];
        let nextAppointment = ctv.nextAppointment;

        if (scheduleNext) {
            const activityLabel =
                COLLABORATOR_SCHEDULE_TYPES.find((item) => item.id === nextActivityType)?.label || nextActivityType;

            const scheduledDate = new Date(nextActivityDate);
            const scheduledAt = Number.isNaN(scheduledDate.getTime())
                ? nextActivityDate
                : scheduledDate.toISOString();

            createdActivities.push({
                id: `next-act-${Date.now()}`,
                type: 'activity',
                status: 'scheduled',
                timestamp: new Date().toISOString(),
                title: `[${activityLabel}] L\u1ecbch ch\u0103m s\u00f3c ti\u1ebfp theo`,
                description: trimmedScheduleSummary,
                user: user?.name || 'Admin',
                datetime: scheduledAt
            });

            nextAppointment = scheduledAt;
        }

        if (trimmedNote) {
            createdActivities.push({
                id: `act-${Date.now() + 1}`,
                type: 'note',
                timestamp: new Date().toISOString(),
                title: `[${typeLabels[interactionType] || interactionType}] Ch\u0103m s\u00f3c CTV`,
                description: trimmedNote,
                user: user?.name || 'Admin'
            });
        }

        const updatedCtv: ICollaborator = {
            ...ctv,
            nextAppointment,
            activities: [...createdActivities, ...(ctv.activities || [])]
        };

        onUpdate(updatedCtv);
        setNoteContent('');
        showToast('Đã lưu nhật ký chăm sóc CTV.');
        if (scheduleNext) {
            resetNextActivityForm();
        }
        showToast(
            scheduleNext
                ? trimmedNote
                    ? '\u0110\u00e3 l\u01b0u ch\u0103m s\u00f3c v\u00e0 t\u1ea1o l\u1ecbch ti\u1ebfp theo cho CTV.'
                    : '\u0110\u00e3 t\u1ea1o l\u1ecbch ch\u0103m s\u00f3c ti\u1ebfp theo cho CTV.'
                : '\u0110\u00e3 l\u01b0u nh\u1eadt k\u00fd ch\u0103m s\u00f3c CTV.'
        );
    };

    const handleSaveOverviewNote = () => {
        const nextOverviewNote = overviewNote.trim();
        const currentOverviewNote = String(ctv.notes || '').trim();
        if (nextOverviewNote === currentOverviewNote) return;

        onUpdate({
            ...ctv,
            notes: nextOverviewNote
        });
        showToast('Đã lưu ghi chú tổng quan CTV.');
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
            COLLABORATOR_SCHEDULE_TYPES.find((item) => item.id === nextActivityType)?.label || nextActivityType;

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

    const handleStatusUpdate = (newStatus: CollaboratorStatusValue) => {
        const previousStatus = getCollaboratorStatusMeta(ctv.status);
        const nextStatus = getCollaboratorStatusMeta(newStatus);
        const systemLog: IActivityLog = {
            id: `sys-${Date.now()}`,
            type: 'system',
            timestamp: new Date().toISOString(),
            title: 'Hệ thống',
            description: `Trạng thái CTV: ${previousStatus.label} -> ${nextStatus.label}`,
            user: user?.name || 'Admin'
        };

        onUpdate({
            ...ctv,
            status: nextStatus.id,
            activities: [systemLog, ...(ctv.activities || [])]
        });
        showToast('Đã cập nhật trạng thái CTV.');
    };

    const groupedLogs = useMemo(() => {
        const filteredLogs = (ctv.activities || []).filter((log) =>
            logAudienceFilter === 'ALL' ? true : logAudienceFilter === 'SYSTEM' ? log.type === 'system' : log.type !== 'system'
        );

        return [...filteredLogs]
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .reduce((groups: Record<string, IActivityLog[]>, log) => {
                const date = new Date(log.timestamp).toLocaleDateString('vi-VN');
                if (!groups[date]) groups[date] = [];
                groups[date].push(log);
                return groups;
            }, {});
    }, [ctv.activities, logAudienceFilter]);
    const currentStatus = normalizeCollaboratorStatus(ctv.status);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative flex h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded border border-slate-300 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                {toast?.visible && (
                    <div className={`absolute top-5 left-1/2 z-[120] -translate-x-1/2 flex items-center gap-2 rounded-lg border px-4 py-2.5 shadow-xl ${toast.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'}`}>
                        {toast.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
                        <span className="text-sm font-bold">{toast.message}</span>
                    </div>
                )}
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded bg-indigo-600 text-base font-bold text-white">
                            {ctv.name.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-base font-bold uppercase tracking-tight text-slate-800">{ctv.name}</h2>
                            <div className="mt-0.5 flex flex-wrap items-center gap-2">
                                {ctv.code && (
                                    <span className="inline-flex items-center rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-700">
                                        {ctv.code}
                                    </span>
                                )}
                                <p className="text-xs text-slate-500 font-medium">{ctv.phone} • {normalizeCollaboratorProvince(ctv.city)}</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onEdit(ctv)}
                            className="flex items-center gap-1.5 rounded border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 transition-colors hover:bg-slate-100"
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
                        className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'care' ? 'border-b-2 border-indigo-600 bg-indigo-50/30 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <History size={14} /> Nhật ký chăm sóc
                    </button>
                    <button
                        onClick={() => setActiveTab('info')}
                        className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'info' ? 'border-b-2 border-indigo-600 bg-indigo-50/30 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
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
                                <div className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/50 px-3 py-2 backdrop-blur-md">
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

                                <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 px-5 py-3">
                                    {/* Followers Row */}
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 text-slate-500">
                                        <div className="flex items-center gap-3 text-xs">
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
                                                            className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-blue-100 text-[9px] font-bold text-blue-700 shadow-sm"
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

                                    <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-3">
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div>
                                                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Ghi chú tổng quan</div>
                                                <p className="mt-1 text-xs text-slate-500">Ghim trên hồ sơ CTV, khác với log note và không đẩy vào lịch sử chatter.</p>
                                            </div>
                                            <button
                                                onClick={handleSaveOverviewNote}
                                                disabled={overviewNote.trim() === String(ctv.notes || '').trim()}
                                                className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-bold text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                Lưu ghi chú tổng quan
                                            </button>
                                        </div>
                                        <textarea
                                            value={overviewNote}
                                            onChange={(e) => setOverviewNote(e.target.value)}
                                            placeholder="Ghi chú cố định về hồ sơ CTV, định hướng chăm sóc, lưu ý quan trọng..."
                                            className="mt-2 h-[88px] w-full resize-none rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm leading-relaxed text-slate-700 outline-none transition-colors focus:border-blue-400"
                                        />
                                    </div>

                                    {/* Input Area */}
                                    <div className="space-y-3">
                                        <div className={`border-2 rounded transition-all ${noteContent.trim() ? 'border-amber-400 bg-amber-50/20' : 'border-amber-200 bg-white'}`}>
                                            <textarea
                                                value={noteContent}
                                                onChange={(e) => setNoteContent(e.target.value)}
                                                placeholder={`Ghi chú nhanh cho team về việc ${interactionType === 'Call' ? 'gọi điện' : interactionType === 'Document' ? 'gửi tài liệu' : interactionType === 'Complaint' ? 'xử lý khiếu nại' : 'chăm sóc'}...`}
                                                className="h-[96px] w-full resize-none bg-transparent p-3 text-sm leading-relaxed focus:outline-none"
                                            />
                                        </div>

                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <label className="flex items-center gap-2 cursor-pointer group">
                                                    <input
                                                        type="checkbox"
                                                        checked={scheduleNext}
                                                        onChange={(e) => setScheduleNext(e.target.checked)}
                                                        className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                                                    />
                                                    <span className="text-[13px] font-bold uppercase tracking-tight text-slate-600 transition-colors group-hover:text-slate-900">Lên lịch tiếp theo?</span>
                                                </label>
                                                {ctv.nextAppointment && (
                                                    <span className="text-xs font-semibold text-slate-500">
                                                        Lịch gần nhất: {formatCollaboratorDateTime(ctv.nextAppointment)}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase mr-2 tracking-widest">Trạng thái CTV:</span>
                                                {COLLABORATOR_STATUS_OPTIONS.map((statusOption) => (
                                                    <button
                                                        key={statusOption.id}
                                                        onClick={() => handleStatusUpdate(statusOption.id)}
                                                        className={`rounded border px-2.5 py-1.5 text-[10px] font-black uppercase tracking-tight transition-all ${currentStatus === statusOption.id ? statusOption.buttonActiveClass : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                                                    >
                                                        {statusOption.label}
                                                    </button>
                                                ))}
                                                <button
                                                    onClick={handleAddNote}
                                                    disabled={!noteContent.trim() && (!scheduleNext || !nextActivitySummary.trim())}
                                                    className="ml-2 rounded bg-[#e67e22] px-5 py-2 text-xs font-bold uppercase tracking-widest text-white shadow-md transition-all hover:bg-[#d35400] active:scale-95 disabled:opacity-50"
                                                >
                                                    Gửi / Lưu
                                                </button>
                                            </div>
                                        </div>

                                        {scheduleNext && (
                                            <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-4">
                                                <div className="flex flex-wrap items-start justify-between gap-3">
                                                    <div>
                                                        <div className="text-[10px] font-bold uppercase tracking-widest text-violet-700">{'L\u1ecbch ch\u0103m s\u00f3c ti\u1ebfp theo'}</div>
                                                        <p className="mt-1 text-xs text-slate-500">{'Form CTV d\u00f9ng c\u00f9ng 3 tr\u01b0\u1eddng nh\u01b0 pipeline: h\u00e0nh \u0111\u1ed9ng, n\u1ed9i dung, ng\u00e0y gi\u1edd.'}</p>
                                                    </div>
                                                    {ctv.nextAppointment && (
                                                        <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-violet-700">
                                                            <Clock size={12} />
                                                            {formatCollaboratorDateTime(ctv.nextAppointment)}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="mt-4 space-y-3">
                                                    <div>
                                                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                                            {'H\u00e0nh \u0111\u1ed9ng'}
                                                        </label>
                                                        <select
                                                            value={nextActivityType}
                                                            onChange={(e) => setNextActivityType(e.target.value as (typeof COLLABORATOR_SCHEDULE_TYPES)[number]['id'])}
                                                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition-colors focus:border-violet-400"
                                                        >
                                                            {COLLABORATOR_SCHEDULE_TYPES.map((item) => (
                                                                <option key={item.id} value={item.id}>{item.label}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <div>
                                                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                                            {'N\u1ed9i dung'}
                                                        </label>
                                                        <textarea
                                                            value={nextActivitySummary}
                                                            onChange={(e) => setNextActivitySummary(e.target.value)}
                                                            placeholder="Nh\u1eadp n\u1ed9i dung l\u1ecbch ch\u0103m s\u00f3c..."
                                                            className="h-24 w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition-colors focus:border-violet-400"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                                            {'Ng\u00e0y gi\u1edd'}
                                                        </label>
                                                        <input
                                                            type="datetime-local"
                                                            value={nextActivityDate}
                                                            onChange={(e) => setNextActivityDate(e.target.value)}
                                                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition-colors focus:border-violet-400"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT SIDE: 1/3 - Activity Log (History) */}
                            <div className="flex-[1] flex flex-col bg-slate-50/50 overflow-hidden">
                                <div className="sticky top-0 z-10 border-b border-slate-200 bg-white p-3">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <History size={14} /> Lịch sử Chatter
                                    </h3>
                                    <div className="mt-3 flex justify-end">
                                        <LogAudienceFilterControl value={logAudienceFilter} onChange={setLogAudienceFilter} />
                                    </div>
                                </div>
                                <div className="flex-1 space-y-4 overflow-y-auto p-3">
                                    {Object.keys(groupedLogs).length > 0 ? Object.keys(groupedLogs).map(date => (
                                        <div key={date} className="space-y-3">
                                            {/* Date Divider */}
                                            <div className="flex items-center gap-4 text-slate-300">
                                                <div className="flex-1 h-px bg-slate-200"></div>
                                                <span className="text-[9px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">{date}</span>
                                                <div className="flex-1 h-px bg-slate-200"></div>
                                            </div>

                                            {groupedLogs[date].map((log: IActivityLog) => {
                                                const logMeta = getCollaboratorLogMeta(log.type);
                                                return (
                                                <div key={log.id} className="space-y-1.5">
                                                    <div className="flex items-center justify-between px-1">
                                                        <span className="font-bold text-slate-800 text-[10px]">{log.user || 'Hệ thống'}</span>
                                                        <span className="text-[9px] text-slate-400 font-medium">
                                                            {new Date(log.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>

                                                    <div className={`rounded-lg border p-2.5 shadow-sm transition-all hover:shadow-md ${logMeta.bodyClass}`}>
                                                        <div className="flex flex-col gap-1">
                                                            <span className={`w-fit text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter ${logMeta.badgeClass}`}>
                                                                {logMeta.label}
                                                            </span>
                                                            {log.type !== 'system' && log.title ? (
                                                                <p className="text-[11px] font-bold text-slate-700">{log.title}</p>
                                                            ) : null}
                                                            <p className="whitespace-pre-wrap text-[11px] leading-snug">{log.description}</p>
                                                        </div>
                                                        {log.datetime && (
                                                            <div className="mt-1.5 flex items-center gap-1.5 border-t border-slate-200/70 pt-1.5 text-[8px] font-black text-amber-600">
                                                                <Calendar size={10} /> HẸN: {formatCollaboratorDateTime(log.datetime)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )})}
                                        </div>
                                    )) : (
                                        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                                            Chưa có lịch sử phù hợp bộ lọc.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-8 space-y-6 overflow-y-auto chatter-scroll flex-1">
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm grid grid-cols-2 gap-6 relative overflow-hidden">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mã CTV</label>
                                    <p className="text-sm font-bold text-slate-900 mt-0.5">{ctv.code || '--'}</p>
                                </div>
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
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tỉnh / thành</label>
                                    <p className="text-sm font-bold text-slate-900 mt-0.5">{normalizeCollaboratorProvince(ctv.city)}</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sale phụ trách</label>
                                    <p className="text-sm font-bold text-indigo-600 mt-0.5">{ctv.ownerName || ctv.ownerId || 'Chưa gắn sale'}</p>
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ghi chú tổng quan</label>
                                    <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                                        {ctv.notes || 'Chưa có ghi chú tổng quan.'}
                                    </div>
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
                                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                            Hành động
                                        </label>
                                        <select
                                            value={nextActivityType}
                                            onChange={(e) => setNextActivityType(e.target.value as (typeof COLLABORATOR_SCHEDULE_TYPES)[number]['id'])}
                                            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition-colors focus:border-violet-400"
                                        >
                                            {COLLABORATOR_SCHEDULE_TYPES.map((item) => (
                                                <option key={item.id} value={item.id}>{item.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                            Nội dung
                                        </label>
                                        <textarea
                                            value={nextActivitySummary}
                                            onChange={(e) => setNextActivitySummary(e.target.value)}
                                            placeholder="Nhập nội dung lịch chăm sóc..."
                                            className="h-24 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition-colors focus:border-violet-400"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                            Ngày giờ
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={nextActivityDate}
                                            onChange={(e) => setNextActivityDate(e.target.value)}
                                            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition-colors focus:border-violet-400"
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

                                <div className="border-b border-slate-200 px-4 py-3">
                                    <div className="relative">
                                        <select
                                            value={followerBranchFilter}
                                            onChange={(e) => setFollowerBranchFilter(e.target.value)}
                                            className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-9 text-sm font-medium text-slate-700 outline-none transition-all hover:border-slate-300 focus:border-blue-400 focus:bg-white"
                                        >
                                            <option value="all">Cơ sở sale: Tất cả</option>
                                            {followerBranchOptions.map((branch) => (
                                                <option key={branch} value={branch}>
                                                    {branch}
                                                </option>
                                            ))}
                                        </select>
                                        <MapPin className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    </div>
                                </div>

                                <div className="max-h-[380px] space-y-2 overflow-y-auto px-4 py-4">
                                    {filteredSalesFollowerOptions.length === 0 && (
                                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                                            Không có sale thuộc cơ sở này.
                                        </div>
                                    )}
                                    {filteredSalesFollowerOptions.map((item) => {
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
                                                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                                            <span>{item.role || 'Nhân viên kinh doanh'}</span>
                                                            {item.branch && (
                                                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                                                                    <MapPin size={11} />
                                                                    {item.branch}
                                                                </span>
                                                            )}
                                                        </div>
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
    const [filterSegment, setFilterSegment] = useState('All');
    const [filterStatus, setFilterStatus] = useState<'All' | CollaboratorStatusValue>('All');
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
            const normalized = ensureCollaboratorCodes(stored.map((item: ICollaborator) => {
                const ownerId = item.ownerId || defaultOwnerId;
                return {
                    ...item,
                    code: normalizeCollaboratorCode(item.code),
                    ownerId,
                    ownerName: item.ownerName || getOwnerName(ownerId),
                    city: normalizeCollaboratorProvince(item.city) || item.city || 'Hà Nội',
                    status: normalizeCollaboratorStatus(item.status),
                    activities: (item.activities || []).map((activity) => ({
                        ...activity,
                        description: normalizeCollaboratorLogDescription(activity.description)
                    }))
                };
            }));
            setCollaborators(normalized);
            if (JSON.stringify(stored) !== JSON.stringify(normalized)) {
                saveCollaborators(normalized);
            }
        } else {
            const seeded = ensureCollaboratorCodes(MOCK_COLLABORATORS.map(item => ({
                ...item,
                code: normalizeCollaboratorCode(item.code),
                ownerId: item.ownerId || defaultOwnerId,
                ownerName: item.ownerName || getOwnerName(item.ownerId || defaultOwnerId),
                city: normalizeCollaboratorProvince(item.city) || item.city || 'Hà Nội',
                status: normalizeCollaboratorStatus(item.status)
            })));
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
    const cityOptions = useMemo(() => ['All', ...COLLABORATOR_PROVINCE_OPTIONS], []);
    const segmentOptions = useMemo(
        () => [
            'All',
            ...Array.from(
                new Set(
                    visibleCollaborators
                        .map((item) => String(item.segment || '').trim())
                        .filter(Boolean)
                )
            ).sort((left, right) => left.localeCompare(right, 'vi'))
        ],
        [visibleCollaborators]
    );
    const statusOptions = useMemo(
        () => ['All', ...COLLABORATOR_STATUS_OPTIONS.map((statusOption) => statusOption.id)],
        []
    );
    // Filter Logic
    const filteredList = useMemo(() => {
        return visibleCollaborators.filter(c => {
            const normalizedSearch = searchTerm.toLowerCase();
            const matchesSearch =
                normalizeCollaboratorCode(c.code).toLowerCase().includes(normalizedSearch) ||
                c.name.toLowerCase().includes(normalizedSearch) ||
                c.phone.includes(searchTerm);
            const matchesCity = filterCity === 'All' || normalizeCollaboratorProvince(c.city) === filterCity;
            const matchesSegment = filterSegment === 'All' || normalizeTextToken(c.segment) === normalizeTextToken(filterSegment);
            const matchesStatus = filterStatus === 'All' || normalizeCollaboratorStatus(c.status) === filterStatus;
            return matchesSearch && matchesCity && matchesSegment && matchesStatus;
        });
    }, [visibleCollaborators, searchTerm, filterCity, filterSegment, filterStatus]);

    const activeSearchChips = useMemo<PinnedSearchChip[]>(() => {
        const chips: PinnedSearchChip[] = [];

        if (activeTab === 'slow_ctv') {
            chips.push({ key: 'sla', label: 'SLA: Ch\u1eadm l\u1ecbch h\u1eb9n' });
        }

        if (filterCity !== 'All') {
            chips.push({ key: 'city', label: `Tỉnh / thành: ${decodeMojibakeText(filterCity)}` });
        }

        if (filterSegment !== 'All') {
            chips.push({ key: 'segment', label: `Sản phẩm: ${decodeMojibakeText(filterSegment)}` });
        }

        if (filterStatus !== 'All') {
            chips.push({ key: 'status', label: `Trạng thái: ${decodeMojibakeText(filterStatus)}` });
        }

        return chips;
    }, [activeTab, filterCity, filterSegment, filterStatus]);

    const removeSearchChip = (chipKey: string) => {
        if (chipKey === 'sla') setActiveTab('all');
        if (chipKey === 'city') setFilterCity('All');
        if (chipKey === 'segment') setFilterSegment('All');
        if (chipKey === 'status') setFilterStatus('All');
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
            code: normalizeCollaboratorCode(newCtv.code) || getNextCollaboratorCode(collaborators),
            name: newCtv.name.trim(),
            phone: newCtv.phone.trim(),
            ownerId,
            ownerName: getOwnerName(ownerId),
            followers: ownerId ? [buildCollaboratorFollower(ownerId, getOwnerName(ownerId), 'Sale phụ trách')] : [],
            city: normalizeCollaboratorProvince(newCtv.city) || 'Hà Nội',
            industry: newCtv.industry || '',
            segment: newCtv.segment || '',
            notes: newCtv.notes || '',
            status: normalizeCollaboratorStatus(newCtv.status || 'Hoạt động'),
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
            code: normalizeCollaboratorCode(ctv.code),
            ownerId: ctv.ownerId || user?.id || 'u1',
            ownerName: ctv.ownerName || getOwnerName(ctv.ownerId || user?.id || 'u1'),
            city: normalizeCollaboratorProvince(ctv.city) || ctv.city || 'Hà Nội',
            status: normalizeCollaboratorStatus(ctv.status)
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
            code: normalizeCollaboratorCode(editingCtv.code) || current.code || getNextCollaboratorCode(collaborators.filter(c => c.id !== editingCtv.id)),
            name: editingCtv.name.trim(),
            phone: editingCtv.phone.trim(),
            ownerId,
            ownerName: getOwnerName(ownerId),
            city: normalizeCollaboratorProvince(editingCtv.city) || normalizeCollaboratorProvince(current.city) || 'Hà Nội',
            industry: editingCtv.industry || '',
            segment: editingCtv.segment || '',
            notes: editingCtv.notes || '',
            status: normalizeCollaboratorStatus(editingCtv.status),
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
                                code: getNextCollaboratorCode(collaborators),
                                ownerId: user?.id || 'u1',
                                ownerName: user?.name || getOwnerName(user?.id || 'u1'),
                                status: 'Hoạt động'
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
                <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm xl:flex-row xl:items-center">
                    {/* Search */}
                    <div className="w-full min-w-0 xl:flex-1">
                        <PinnedSearchInput
                            value={searchTerm}
                            onChange={setSearchTerm}
                            placeholder="T\u00ecm ki\u1ebfm theo m\u00e3 CTV, t\u00ean, S\u0110T, t\u1ec9nh/th\u00e0nh, s\u1ea3n ph\u1ea9m..."
                            chips={activeSearchChips}
                            onRemoveChip={removeSearchChip}
                            inputClassName="text-sm"
                        />
                    </div>

                    <div className="mx-1 hidden h-10 w-px bg-slate-200 xl:block"></div>

                    {/* Filters Row */}
                    <div className="flex w-full min-w-0 flex-wrap gap-2 xl:w-auto xl:flex-nowrap xl:justify-end xl:shrink-0">
                        <div className="relative min-w-[180px] flex-1 xl:w-[190px] xl:flex-none">
                            <select
                                value={filterCity}
                                onChange={(e) => setFilterCity(e.target.value)}
                                className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white outline-none appearance-none cursor-pointer font-medium text-slate-700 hover:border-slate-300"
                            >
                                <option value="All">{'T\u1ec9nh / th\u00e0nh: T\u1ea5t c\u1ea3'}</option>
                                {cityOptions.filter(o => o !== 'All').map(c => (
                                    <option key={c} value={c}>{decodeMojibakeText(c)}</option>
                                ))}
                            </select>
                            <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        </div>

                        <div className="relative min-w-[180px] flex-1 xl:w-[190px] xl:flex-none">
                            <select
                                value={filterSegment}
                                onChange={(e) => setFilterSegment(e.target.value)}
                                className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white outline-none appearance-none cursor-pointer font-medium text-slate-700 hover:border-slate-300"
                            >
                                <option value="All">{'S\u1ea3n ph\u1ea9m: T\u1ea5t c\u1ea3'}</option>
                                {segmentOptions.filter((option) => option !== 'All').map((segmentOption) => (
                                    <option key={segmentOption} value={segmentOption}>{decodeMojibakeText(segmentOption)}</option>
                                ))}
                            </select>
                            <Briefcase className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        </div>

                        <div className="relative min-w-[180px] flex-1 xl:w-[190px] xl:flex-none">
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value as 'All' | CollaboratorStatusValue)}
                                className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white outline-none appearance-none cursor-pointer font-medium text-slate-700 hover:border-slate-300"
                            >
                                <option value="All">{'Tr\u1ea1ng th\u00e1i: T\u1ea5t c\u1ea3'}</option>
                                {statusOptions.filter((option) => option !== 'All').map((statusOption) => (
                                    <option key={statusOption} value={statusOption}>
                                        {decodeMojibakeText(statusOption)}
                                    </option>
                                ))}
                            </select>
                            <CheckCircle2 className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        </div>
                    </div>

                    <div className="mx-1 hidden h-10 w-px bg-slate-200 xl:block"></div>

                    {/* Column Control */}
                    <div className="relative xl:shrink-0">
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
                                    {isColVisible('city') && <th className="p-3 border-r border-slate-200">Tỉnh / thành</th>}
                                    {isColVisible('industry') && <th className="p-3 border-r border-slate-200">Ngành nghề</th>}
                                    {isColVisible('segment') && <th className="p-3 border-r border-slate-200">Mảng hợp tác</th>}
                                    {isColVisible('status') && <th className="p-3 border-r border-slate-200">Trạng thái</th>}
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
                                                                {ctv.code ? (
                                                                    <span className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-700">
                                                                        {ctv.code}
                                                                    </span>
                                                                ) : null}
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
                                                        <MapPin size={14} className="text-slate-400" /> {normalizeCollaboratorProvince(ctv.city)}
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

                                            {isColVisible('status') && (
                                                <td className="p-3 border-r border-slate-200">
                                                    <span
                                                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${getCollaboratorStatusMeta(ctv.status).badgeClass}`}
                                                        title={getCollaboratorStatusLabel(ctv.status)}
                                                    >
                                                        {getCollaboratorStatusLabel(ctv.status)}
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
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Mã CTV</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all uppercase"
                                    value={newCtv.code || ''}
                                    onChange={e => setNewCtv({ ...newCtv, code: e.target.value.toUpperCase() })}
                                    placeholder="VD: CTV0004"
                                />
                            </div>

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
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Tỉnh / thành</label>
                                    <select
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none bg-white focus:border-blue-500 transition-all"
                                        value={newCtv.city || ''}
                                        onChange={e => setNewCtv({ ...newCtv, city: e.target.value })}
                                    >
                                        <option value="">-- Chọn tỉnh / thành --</option>
                                        {COLLABORATOR_PROVINCE_OPTIONS.map((province) => (
                                            <option key={province} value={province}>{province}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Trạng thái</label>
                                    <select
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none bg-white focus:border-blue-500 transition-all"
                                        value={newCtv.status || 'Hoạt động'}
                                        onChange={e => setNewCtv({ ...newCtv, status: e.target.value as ICollaborator['status'] })}
                                    >
                                        {COLLABORATOR_STATUS_OPTIONS.map((statusOption) => (
                                            <option key={statusOption.id} value={statusOption.id}>
                                                {statusOption.label}
                                            </option>
                                        ))}
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
                                <label className="block text-sm font-bold text-slate-700 mb-1">Ghi chú tổng quan</label>
                                <textarea
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none min-h-[80px] focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                                    value={newCtv.notes || ''}
                                    onChange={e => setNewCtv({ ...newCtv, notes: e.target.value })}
                                    placeholder="Ghi chú cố định về hồ sơ CTV, lưu ý quan trọng..."
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
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Mã CTV</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all uppercase"
                                    value={editingCtv.code || ''}
                                    onChange={e => setEditingCtv({ ...editingCtv, code: e.target.value.toUpperCase() })}
                                    placeholder="VD: CTV0004"
                                />
                            </div>

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
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Tỉnh / thành</label>
                                    <select
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none bg-white focus:border-blue-500 transition-all"
                                        value={editingCtv.city || ''}
                                        onChange={e => setEditingCtv({ ...editingCtv, city: e.target.value })}
                                    >
                                        <option value="">-- Chọn tỉnh / thành --</option>
                                        {COLLABORATOR_PROVINCE_OPTIONS.map((province) => (
                                            <option key={province} value={province}>{province}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Trạng thái</label>
                                    <select
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none bg-white focus:border-blue-500 transition-all"
                                        value={editingCtv.status || 'Hoạt động'}
                                        onChange={e => setEditingCtv({ ...editingCtv, status: e.target.value as ICollaborator['status'] })}
                                    >
                                        {COLLABORATOR_STATUS_OPTIONS.map((statusOption) => (
                                            <option key={statusOption.id} value={statusOption.id}>
                                                {statusOption.label}
                                            </option>
                                        ))}
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
                                <label className="block text-sm font-bold text-slate-700 mb-1">Ghi chú tổng quan</label>
                                <textarea
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none min-h-[80px] focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                                    value={editingCtv.notes || ''}
                                    onChange={e => setEditingCtv({ ...editingCtv, notes: e.target.value })}
                                    placeholder="Nhập ghi chú cố định về hồ sơ CTV..."
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
