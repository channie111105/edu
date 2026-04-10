import React, { useState, useEffect, useMemo } from 'react';
import { useRef } from 'react';
import { ILead, LeadStatus, UserRole, Activity, DealStage, IContract, ContractStatus, IQuotation, IQuotationLineItem, IQuotationLogNote, ITeacher, ITrainingClass, QuotationStatus } from '../types';
import { useAuth } from '../contexts/AuthContext';
import {
    X, User, Phone, Mail, MapPin, Globe, Calendar,
    Clock, CheckCircle2, AlertTriangle, Send, Paperclip,
    History, ArrowRight, ChevronDown, Building, FileText,
    DollarSign, CreditCard, MessageSquare, Bell, Star,
    MoreHorizontal, CalendarDays, Flag, Plus, Trash2, Trophy,
    ShieldCheck, FileSignature, Wallet, Lock, Activity as ActivityIcon, Ban, ArrowUpRight, Users, XOctagon, Tag, Handshake, ChevronRight,
    Printer, RotateCcw, Monitor
} from 'lucide-react';
import { FIXED_LEAD_TAGS, addContract, addQuotation, getClosedLeadReasons, getLeadById, getLostReasons, getQuotations, getTags, getTeachers, getTrainingClasses, saveTags, updateQuotation } from '../utils/storage';
import CreateMeetingModal from './CreateMeetingModal';
import { MeetingCustomerOption } from '../utils/meetingHelpers';
import { LEAD_CHANNEL_OPTIONS } from '../constants';
import {
    DEFAULT_QUOTATION_RECEIPT_TYPE,
    normalizeQuotationReceiptType
} from '../utils/quotationReceiptType';
import {
    formatServicePaymentPlanNote,
    resolveServicePaymentPlan
} from '../utils/servicePaymentPlans';
import {
    getLeadStatusLabel,
    isLeadStatusOneOf,
    isClosedLeadStatusKey,
    LEAD_STATUS_KEYS,
    LEAD_STATUS_OPTIONS,
    normalizeLeadStatusKey,
    toLeadStatusValue,
} from '../utils/leadStatus';
import ClassCodeLookupInput from './ClassCodeLookupInput';
import { buildTrainingClassLookupOptions } from '../utils/trainingClassLookup';
import LogAudienceFilterControl from './LogAudienceFilter';
import { LogAudienceFilter } from '../utils/logAudience';
import { appendLeadLogs, buildLeadActivityLog, buildLeadAuditChange, buildLeadAuditLog } from '../utils/leadLogs';
import LeadDrawerProfileForm from './LeadDrawerProfileForm';
import {
    buildLeadStudentInfo,
    createLeadInitialState,
    getLeadGuardianRelation,
    LeadCreateFormData,
    LeadCreateModalTab,
    resolveLeadCampus,
} from '../utils/leadCreateForm';
import { getLeadPhoneValidationMessage, normalizeLeadPhone } from '../utils/phone';
import { clearLeadReclaimTracking } from '../utils/leadSla';

interface UnifiedLeadDrawerProps {
    lead: ILead;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: (updatedLead: ILead) => void;
    onConvert?: (lead: ILead) => void;
}

type CreatorMarket = 'Đức' | 'Trung Quốc';
type CreatorServicePackage = 'Du học' | 'Combo' | 'Đào tạo';

type OrderCatalogItem = {
    id: string;
    product: string;
    market: CreatorMarket;
    servicePackage: CreatorServicePackage;
    serviceType: IQuotation['serviceType'];
    courseOptions: string[];
    programOptions: string[];
    defaultPrice: number;
};

type OrderLineDraft = {
    id: string;
    productId?: string;
    productName: string;
    studentName: string;
    studentDob: string;
    testerId: string;
    courseName: string;
    targetMarket: CreatorMarket | '';
    servicePackage: CreatorServicePackage | '';
    programs: string[];
    classId: string;
    unitPrice: number;
    discountPercent: number;
    additionalInfo: string;
};

const ORDER_LINE_CATALOG: OrderCatalogItem[] = [
    {
        id: 'order-de-training-a12',
        product: 'Khóa tiếng Đức A1-A2',
        market: 'Đức',
        servicePackage: 'Đào tạo',
        serviceType: 'Training',
        courseOptions: ['Tiếng Đức A1', 'Tiếng Đức A2'],
        programOptions: ['A1', 'A2'],
        defaultPrice: 15000000
    },
    {
        id: 'order-de-training-b12',
        product: 'Khóa tiếng Đức B1-B2',
        market: 'Đức',
        servicePackage: 'Đào tạo',
        serviceType: 'Training',
        courseOptions: ['Tiếng Đức B1', 'Tiếng Đức B2'],
        programOptions: ['B1', 'B2'],
        defaultPrice: 25000000
    },
    {
        id: 'order-de-combo',
        product: 'Combo tiếng Đức A1-B1',
        market: 'Đức',
        servicePackage: 'Combo',
        serviceType: 'Combo',
        courseOptions: ['Combo tiếng Đức A1-B1'],
        programOptions: ['A1', 'A2', 'B1'],
        defaultPrice: 45000000
    },
    {
        id: 'order-de-abroad',
        product: 'Du học Đức - Trọn gói',
        market: 'Đức',
        servicePackage: 'Du học',
        serviceType: 'StudyAbroad',
        courseOptions: ['Hồ sơ du học Đức', 'Luyện phỏng vấn', 'Định hướng trước bay'],
        programOptions: ['A1', 'A2', 'B1', 'APS', 'Visa'],
        defaultPrice: 210000000
    },
    {
        id: 'order-cn-training-hsk123',
        product: 'Khóa tiếng Trung HSK1-HSK3',
        market: 'Trung Quốc',
        servicePackage: 'Đào tạo',
        serviceType: 'Training',
        courseOptions: ['HSK 1', 'HSK 2', 'HSK 3'],
        programOptions: ['HSK1', 'HSK2', 'HSK3'],
        defaultPrice: 12000000
    },
    {
        id: 'order-cn-training-hsk45',
        product: 'Khóa tiếng Trung HSK4-HSK5',
        market: 'Trung Quốc',
        servicePackage: 'Đào tạo',
        serviceType: 'Training',
        courseOptions: ['HSK 4', 'HSK 5'],
        programOptions: ['HSK4', 'HSK5'],
        defaultPrice: 18000000
    },
    {
        id: 'order-cn-combo',
        product: 'Combo tiếng HSK1-HSK3',
        market: 'Trung Quốc',
        servicePackage: 'Combo',
        serviceType: 'Combo',
        courseOptions: ['Combo tiếng HSK1-HSK3'],
        programOptions: ['HSK1', 'HSK2', 'HSK3'],
        defaultPrice: 20000000
    },
    {
        id: 'order-cn-abroad',
        product: 'Du học Trung Quốc - Trọn gói',
        market: 'Trung Quốc',
        servicePackage: 'Du học',
        serviceType: 'StudyAbroad',
        courseOptions: ['Hồ sơ du học Trung Quốc', 'Luyện phỏng vấn', 'Định hướng trước bay'],
        programOptions: ['HSK4', 'HSK5', 'Visa', 'Hồ sơ'],
        defaultPrice: 160000000
    }
];

const CREATOR_MARKETS: CreatorMarket[] = ['Đức', 'Trung Quốc'];

const CREATOR_CLASS_FALLBACKS: ITrainingClass[] = [
    {
        id: 'CN-HSK1-K01',
        code: 'CN-HSK1-K01',
        name: 'Lớp HSK1 K01',
        campus: 'Hà Nội',
        schedule: 'T2-4-6 19:00',
        language: 'Tiếng Trung',
        level: 'HSK1',
        classType: 'Offline',
        status: 'ACTIVE' as ITrainingClass['status'],
        teacherId: 'T003'
    },
    {
        id: 'CN-HSK3-K02',
        code: 'CN-HSK3-K02',
        name: 'Lớp HSK3 K02',
        campus: 'Hà Nội',
        schedule: 'T3-5-7 18:30',
        language: 'Tiếng Trung',
        level: 'HSK3',
        classType: 'Offline',
        status: 'ACTIVE' as ITrainingClass['status'],
        teacherId: 'T003'
    },
    {
        id: 'CN-HSK5-K03',
        code: 'CN-HSK5-K03',
        name: 'Lớp HSK5 K03',
        campus: 'TP.HCM',
        schedule: 'T2-4 20:00',
        language: 'Tiếng Trung',
        level: 'HSK5',
        classType: 'Online',
        status: 'ACTIVE' as ITrainingClass['status'],
        teacherId: 'T003'
    }
];

const toInputDate = (value?: string) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const fromInputDate = (value?: string, fallback?: string) => {
    if (!value) return undefined;
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return fallback;
    const base = fallback ? new Date(fallback) : new Date();
    const safeBase = Number.isNaN(base.getTime()) ? new Date() : base;
    const next = new Date(safeBase);
    next.setFullYear(year, month - 1, day);
    next.setHours(0, 0, 0, 0);
    return next.toISOString();
};

const formatDisplayDate = (value?: string) => {
    if (!value) return '--/--/----';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--/--/----';
    return date.toLocaleDateString('vi-VN');
};

const formatDisplayDateTime = (value?: string) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('vi-VN');
};

const normalizeCallLogToken = (value?: string) =>
    String(value || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ');

const calculateOrderLineTotal = (unitPrice: number, quantity: number, discountPercent: number) =>
    Math.max(0, unitPrice * quantity * (1 - discountPercent / 100));

const getLineItemSubtotal = (item: Partial<IQuotationLineItem>) =>
    (Number(item.unitPrice) || 0) * Math.max(1, Number(item.quantity) || 1);

const getResolvedLineItemTotal = (item: Partial<IQuotationLineItem>) => {
    if (typeof item.total === 'number' && !Number.isNaN(item.total)) {
        return Math.max(0, item.total);
    }
    return calculateOrderLineTotal(
        Number(item.unitPrice) || 0,
        Math.max(1, Number(item.quantity) || 1),
        Math.min(100, Math.max(0, Number(item.discount) || 0))
    );
};

const getCatalogByProduct = (productName: string) =>
    ORDER_LINE_CATALOG.find((item) => item.product === productName);

const getPrimaryCatalogByServicePackage = (
    market?: CreatorMarket | '',
    servicePackage?: CreatorServicePackage | ''
) =>
    ORDER_LINE_CATALOG.find(
        (item) => item.market === market && item.servicePackage === servicePackage
    );

const mapStoredItemsToQuotationLineItems = (items: any[] = [], leadData?: Partial<ILead>): IQuotationLineItem[] =>
    items.map((item, index) => {
        const quantity = Math.max(1, Number(item?.quantity) || 1);
        const unitPrice = Math.max(0, Number(item?.unitPrice ?? item?.price) || 0);
        const discountPercent = Math.min(100, Math.max(0, Number(item?.discountPercent ?? item?.discount) || 0));
        const total = typeof item?.total === 'number'
            ? Math.max(0, Number(item.total) || 0)
            : calculateOrderLineTotal(unitPrice, quantity, discountPercent);

        return {
            id: item?.id || `line-${Date.now()}-${index}`,
            productId: item?.productId || item?.id,
            name: item?.name || item?.productName || 'Sản phẩm',
            quantity,
            unitPrice,
            discount: discountPercent,
            total,
            studentName: item?.studentName || leadData?.name || '',
            studentDob: item?.studentDob || leadData?.dob || '',
            testerId: item?.testerId,
            testerName: item?.testerName,
            courseName: item?.courseName,
            targetMarket: item?.targetMarket || leadData?.targetCountry,
            servicePackage: item?.servicePackage,
            programs: Array.isArray(item?.programs) ? item.programs : [],
            classId: item?.classId,
            className: item?.className,
            additionalInfo: item?.additionalInfo
        };
    });

const createOrderDraft = (
    leadData: Partial<ILead>,
    base?: Partial<OrderLineDraft>,
    lineItem?: IQuotationLineItem
): OrderLineDraft => ({
    id: lineItem?.id || base?.id || `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    productId: lineItem?.productId || base?.productId,
    productName: lineItem?.name || base?.productName || '',
    studentName: lineItem?.studentName || base?.studentName || leadData.name || '',
    studentDob: toInputDate(lineItem?.studentDob || base?.studentDob || leadData.dob),
    testerId: lineItem?.testerId || base?.testerId || '',
    courseName: lineItem?.courseName || base?.courseName || '',
    targetMarket: (lineItem?.targetMarket as CreatorMarket) || base?.targetMarket || (leadData.targetCountry as CreatorMarket) || '',
    servicePackage: (lineItem?.servicePackage as CreatorServicePackage) || base?.servicePackage || '',
    programs: Array.isArray(lineItem?.programs) ? lineItem.programs : base?.programs || [],
    classId: lineItem?.classId || base?.classId || '',
    unitPrice: lineItem?.unitPrice || base?.unitPrice || 0,
    discountPercent: lineItem?.discount || base?.discountPercent || 0,
    additionalInfo: lineItem?.additionalInfo || base?.additionalInfo || ''
});

const ACTIVITY_TYPES = [
    { id: 'call', label: 'Gọi điện', icon: Phone, defaultDelayHours: 2 },
    { id: 'message', label: 'Nhắn tin', icon: MessageSquare, defaultDelayHours: 1 },
    { id: 'email', label: 'Gửi email', icon: Mail, defaultDelayHours: 2 },
    { id: 'meeting', label: 'Meeting', icon: CalendarDays, defaultDelayHours: 24 },
    { id: 'other', label: 'Khác', icon: MoreHorizontal, defaultDelayHours: 4 },
] as const;

const MOCK_USERS = [
    { id: 'u1', name: 'Sarah Miller', avatar: 'SM', role: 'Sales Rep' },
    { id: 'u2', name: 'Minh Khôi', avatar: 'MK', role: 'Contract Manager' },
    { id: 'u3', name: 'Hải Yến', avatar: 'HY', role: 'Sales Manager' },
    { id: 'u4', name: 'Admin', avatar: 'AD', role: 'Admin' },
];

const PIPELINE_STAGE_OPTIONS: DealStage[] = [
    DealStage.NEW_OPP,
    DealStage.DEEP_CONSULTING,
    DealStage.PROPOSAL,
    DealStage.NEGOTIATION,
    DealStage.WON,
    DealStage.LOST,
    DealStage.AFTER_SALE
];

const STAGE_LABELS: Record<string, string> = {
    [DealStage.NEW_OPP]: 'New Opp',
    [DealStage.DEEP_CONSULTING]: 'Tư vấn/Hẹn meeting',
    [DealStage.PROPOSAL]: 'Tư vấn sâu (Gửi báo giá, lộ trình)',
    [DealStage.NEGOTIATION]: 'Đàm phán (Theo dõi chốt)',
    [DealStage.WON]: 'Won',
    [DealStage.LOST]: 'Lost',
    [DealStage.AFTER_SALE]: 'After sale'
};

const STANDARD_LEAD_STATUS_OPTIONS = LEAD_STATUS_OPTIONS;
const CUSTOM_CLOSE_REASON = 'Lý do khác';

const normalizeLeadFormStatus = (status?: string) => normalizeLeadStatusKey(status);

const isClosedLeadFormStatus = (status?: string) => isClosedLeadStatusKey(status);

const resolveCloseReason = (reason: string, customReason?: string) =>
    reason === CUSTOM_CLOSE_REASON ? customReason?.trim() || '' : reason;

const getCloseReasonOptions = (status?: string) =>
    getClosedLeadReasons(normalizeLeadFormStatus(status));

const getCloseReasonFormState = (status?: string, reason?: string) => {
    const normalizedReason = String(reason || '').trim();
    if (!normalizedReason) {
        return { lossReason: '', lossReasonCustom: '' };
    }

    const reasonOptions = getCloseReasonOptions(status);
    if (reasonOptions.includes(normalizedReason)) {
        return { lossReason: normalizedReason, lossReasonCustom: '' };
    }

    return { lossReason: CUSTOM_CLOSE_REASON, lossReasonCustom: normalizedReason };
};

const getCloseReasonStateForStatusChange = (status: string, reason: string, customReason?: string) => {
    if (!isClosedLeadFormStatus(status)) {
        return { lossReason: '', lossReasonCustom: '' };
    }

    const resolvedReason = resolveCloseReason(reason, customReason);
    if (!resolvedReason) {
        return { lossReason: '', lossReasonCustom: '' };
    }

    const reasonOptions = getCloseReasonOptions(status);
    if (reasonOptions.includes(resolvedReason)) {
        return { lossReason: resolvedReason, lossReasonCustom: '' };
    }

    return { lossReason: '', lossReasonCustom: '' };
};

const validateCloseReason = (status: string, reason: string, customReason?: string) => {
    if (!isClosedLeadFormStatus(status)) return null;
    if (!reason) return 'Vui lòng chọn lý do.';
    if (reason === CUSTOM_CLOSE_REASON && !customReason?.trim()) {
        return 'Vui lòng nhập lý do cụ thể.';
    }
    return null;
};

const mapLeadToFormData = (lead: ILead): LeadCreateFormData => {
    const rawTags = lead.marketingData?.tags as string[] | string | undefined;
    const studentInfo = lead.studentInfo || {};

    return {
        ...createLeadInitialState(lead.ownerId || ''),
        name: lead.name || '',
        phone: lead.phone || '',
        email: lead.email || '',
        source: lead.source || 'hotline',
        program: lead.program || 'Tiếng Đức',
        notes: lead.notes || '',
        title: (lead as any).title || '',
        company: lead.company || lead.marketingData?.region || '',
        province: (lead as any).province || lead.city || '',
        city: (lead as any).city || lead.district || '',
        ward: (lead as any).ward || lead.ward || '',
        street: (lead as any).street || lead.address || '',
        salesperson: lead.ownerId || '',
        campaign: lead.marketingData?.campaign || (lead as any).campaign || '',
        tags: Array.isArray(rawTags)
            ? rawTags
            : (typeof rawTags === 'string'
                ? rawTags.split(',').map((item: string) => item.trim()).filter(Boolean)
                : []),
        referredBy: (lead as any).referredBy || '',
        product: lead.product || lead.program || '',
        market: lead.marketingData?.market || '',
        channel: lead.marketingData?.channel || lead.marketingData?.medium || '',
        status: normalizeLeadFormStatus(lead.status as string),
        ...getCloseReasonFormState(lead.status as string, lead.lostReason),
        targetCountry: lead.targetCountry || studentInfo.targetCountry || '',
        studentName: studentInfo.studentName || '',
        studentDob: toInputDate(studentInfo.dob || lead.dob),
        studentIdentityCard: studentInfo.identityCard || (lead as any).identityCard || '',
        studentLanguageLevel: studentInfo.languageLevel || (lead as any).languageLevel || '',
        studentPhone: studentInfo.studentPhone || '',
        studentSchool: studentInfo.school || '',
        studentEducationLevel: studentInfo.educationLevel || lead.educationLevel || '',
        identityDate: toInputDate(lead.identityDate),
        identityPlace: lead.identityPlace || '',
        expectedStart: lead.internalNotes?.expectedStart || '',
        parentOpinion: lead.internalNotes?.parentOpinion || '',
        financial: lead.internalNotes?.financial || studentInfo.financialStatus || '',
        potential: lead.internalNotes?.potential || '',
        createdAtDisplay: formatDisplayDateTime(lead.createdAt),
        assignedAtDisplay: formatDisplayDateTime(lead.pickUpDate),
    };
};

const UnifiedLeadDrawer: React.FC<UnifiedLeadDrawerProps> = ({ lead: initialLead, isOpen, onClose, onUpdate, onConvert }) => {
    if (!isOpen) return null;

    const { user } = useAuth();
    const [lead, setLead] = useState<ILead>(initialLead || {} as ILead);
    const [leadFormData, setLeadFormData] = useState<LeadCreateFormData>(() => mapLeadToFormData(initialLead || {} as ILead));
    const [leadFormActiveTab, setLeadFormActiveTab] = useState<LeadCreateModalTab>('notes');
    const quotationSalesOptions = useMemo(() => {
        const options = new Map<string, { id: string; name: string; avatar: string; role: string }>();

        if (user?.id && user?.name) {
            options.set(user.id, {
                id: user.id,
                name: user.name,
                avatar: user.name.slice(0, 2).toUpperCase(),
                role: user.role || 'Sales Rep'
            });
        }

        MOCK_USERS
            .filter((item) => item.role !== 'Contract Manager')
            .forEach((item) => options.set(item.id, item));

        return Array.from(options.values());
    }, [user?.id, user?.name, user?.role]);
    const leadSalesOptions = useMemo(
        () => quotationSalesOptions
            .filter((item) => item.role !== 'Contract Manager')
            .map((item) => ({ id: item.id, value: item.name, label: item.name })),
        [quotationSalesOptions]
    );
    const leadFormCloseReasonOptions = useMemo(
        () => getCloseReasonOptions(leadFormData.status),
        [leadFormData.status]
    );
    const patchLeadFormData = (patch: Partial<LeadCreateFormData>) => {
        setLeadFormData((prev) => ({ ...prev, ...patch }));
    };
    const callCount = useMemo(() => {
        const auditCount = (lead.auditLogs || []).filter((log) => log.action === 'lead_called').length;
        if (auditCount > 0) return auditCount;

        return (lead.activities || []).filter((activity: any) => {
            if (activity?.type === 'call') return true;
            const titleToken = normalizeCallLogToken(activity?.title);
            const descriptionToken = normalizeCallLogToken(activity?.description);
            return titleToken.includes('goi dien') || titleToken.includes('goi khach hang') || descriptionToken.includes('goi dien');
        }).length;
    }, [lead.activities, lead.auditLogs]);

    // UI States
    const [chatterTab, setChatterTab] = useState<'message' | 'note' | 'activity' | 'meeting'>('note');
    const [noteContent, setNoteContent] = useState('');
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

    const [isCreateMeetingModalOpen, setIsCreateMeetingModalOpen] = useState(false);

    // Followers State
    const [showFollowersModal, setShowFollowersModal] = useState(false);
    const [followers, setFollowers] = useState<any[]>(Array.isArray(initialLead?.followers) ? initialLead.followers : []);

    // Ensure Owner is a follower
    useEffect(() => {
        if (!initialLead) return;
        if (followers.length === 0 && initialLead.ownerId) {
            const owner = MOCK_USERS.find(u => u.name === initialLead.ownerId) || { id: 'u1', name: initialLead.ownerId || 'Sarah Miller', avatar: 'SM', isOwner: true };
            setFollowers([{ ...owner, addedAt: new Date().toISOString() }]);
        }
    }, [initialLead?.ownerId]);

    // Loss Modal State
    const [showLossModal, setShowLossModal] = useState(false);
    const [lossReason, setLossReason] = useState('');
    const [customLossReason, setCustomLossReason] = useState('');
    const lostReasonsList = useMemo(() => getLostReasons(), []);

    // Activity Schedule State
    const [activityType, setActivityType] = useState('call');
    const [activityDate, setActivityDate] = useState('');
    const [activitySummary, setActivitySummary] = useState('');
    const [showNextActivityModal, setShowNextActivityModal] = useState(false);
    const [nextActivityType, setNextActivityType] = useState('call');
    const [nextActivityDate, setNextActivityDate] = useState('');
    const [nextActivitySummary, setNextActivitySummary] = useState('');
    const [completingActivityId, setCompletingActivityId] = useState<string | null>(null);
    const [completionNote, setCompletionNote] = useState('');
    const [logAudienceFilter, setLogAudienceFilter] = useState<LogAudienceFilter>('ALL');
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showQuotationCreator, setShowQuotationCreator] = useState(false);
    const [quotationCreatorTab, setQuotationCreatorTab] = useState<'order_lines' | 'other_info'>('order_lines');
    const [quotationWorkflowStatus, setQuotationWorkflowStatus] = useState<'draft' | 'sent' | 'sale_order' | 'cancelled'>('draft');
    const [activeQuotationId, setActiveQuotationId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false); // Global saving indicator state
    const lastLoggedValues = useRef<Record<string, any>>({}); // To prevent duplicate logs in rapid succession
    const previousInitialLeadIdRef = useRef(initialLead?.id || '');

    // Mapping for logging internal notes
    const INTERNAL_NOTE_LABELS: any = {
        expectedStart: 'Thời gian tham gia',
        parentOpinion: 'Ý kiến bố mẹ',
        financial: 'Tài chính',
        potential: 'Mức độ tiềm năng'
    };

    const LEAD_FIELD_LABELS: Partial<Record<keyof ILead, string>> = {
        name: 'Họ và tên',
        phone: 'Số điện thoại',
        email: 'Email',
        source: 'Nguồn data',
        ownerId: 'Người phụ trách',
        targetCountry: 'Thị trường mục tiêu',
        educationLevel: 'Trình độ học vấn',
        dob: 'Ngày sinh',
        notes: 'Ghi chú',
        identityCard: 'Số CCCD/Hộ chiếu',
        identityDate: 'Ngày cấp',
        identityPlace: 'Nơi cấp',
        address: 'Địa chỉ',
        expectedClosingDate: 'Ngày dự kiến chốt',
        probability: 'Xác suất thành công',
        discountReason: 'Lý do giảm giá'
    };

    const formatAuditValue = (value: any): string => {
        if (value === null || value === undefined || value === '') return '(Trống)';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
    };

    const toValidTimestamp = (value?: string): string => {
        const parsed = Date.parse(value || '');
        if (Number.isNaN(parsed)) return new Date().toISOString();
        return new Date(parsed).toISOString();
    };

    const mapLeadActivityToQuotationLogNote = (activity: any): IQuotationLogNote => ({
        id: `lead-log-${activity?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`}`,
        timestamp: toValidTimestamp(activity?.timestamp || activity?.datetime),
        user: activity?.user || 'System',
        type: activity?.type || 'system',
        action: `Lead: ${activity?.title || activity?.type || 'Cập nhật'}`,
        detail: activity?.description || activity?.content || '',
        attachments: Array.isArray(activity?.attachments) ? activity.attachments : undefined
    });

    const mergeQuotationLogNotes = (
        currentLogs: IQuotationLogNote[] = [],
        leadActivities: any[] = []
    ): IQuotationLogNote[] => {
        const leadLogs = Array.isArray(leadActivities) ? leadActivities.map(mapLeadActivityToQuotationLogNote) : [];
        const merged = [...currentLogs, ...leadLogs];
        const seen = new Set<string>();
        const deduped: IQuotationLogNote[] = [];

        for (const item of merged) {
            const key = item.id || `${item.timestamp}|${item.user}|${item.action}|${item.detail || ''}`;
            if (seen.has(key)) continue;
            seen.add(key);
            deduped.push(item);
        }

        return deduped.sort((a, b) => {
            const tsA = Date.parse(a.timestamp || '');
            const tsB = Date.parse(b.timestamp || '');
            const safeA = Number.isNaN(tsA) ? 0 : tsA;
            const safeB = Number.isNaN(tsB) ? 0 : tsB;
            return safeB - safeA;
        });
    };

    const areQuotationLogsEqual = (a: IQuotationLogNote[] = [], b: IQuotationLogNote[] = []) => {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            const left = a[i];
            const right = b[i];
            if (
                left.id !== right.id ||
                left.timestamp !== right.timestamp ||
                left.user !== right.user ||
                (left.type || 'system') !== (right.type || 'system') ||
                left.action !== right.action ||
                (left.detail || '') !== (right.detail || '') ||
                JSON.stringify(left.attachments || []) !== JSON.stringify(right.attachments || [])
            ) {
                return false;
            }
        }
        return true;
    };

    const syncLeadHistoryToQuotationLogs = (leadSnapshot: ILead) => {
        if (!leadSnapshot?.id || !Array.isArray(leadSnapshot.activities) || leadSnapshot.activities.length === 0) return;

        const relatedQuotations = getQuotations().filter(
            (quotation) => quotation.leadId === leadSnapshot.id || quotation.customerId === leadSnapshot.id
        );

        if (relatedQuotations.length === 0) return;

        relatedQuotations.forEach((quotation) => {
            const nextLogNotes = mergeQuotationLogNotes(quotation.logNotes || [], leadSnapshot.activities || []);
            if (areQuotationLogsEqual(quotation.logNotes || [], nextLogNotes)) return;

            updateQuotation({
                ...quotation,
                logNotes: nextLogNotes,
                updatedAt: new Date().toISOString()
            });
        });
    };

    // Quotation Specific Fields
    const [quotationData, setQuotationData] = useState({
        paymentMethod: 'Chuyển khoản',
        expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        pricelist: '[Center 11] Base Price (VND)',
        orderMode: DEFAULT_QUOTATION_RECEIPT_TYPE,
        salespersonName: user?.name || '',
        serviceType: 'Training' as 'StudyAbroad' | 'Training' | 'Combo',
        classCode: '',
        schedule: '',
        pricingNote: '',
        internalNote: '',
        needInvoice: false
    });

    // Local State for Quotation Editing
    const [quotationLineItems, setQuotationLineItems] = useState<IQuotationLineItem[]>(
        mapStoredItemsToQuotationLineItems(Array.isArray(initialLead?.productItems) ? initialLead.productItems : [], initialLead)
    );
    const [discountAdjustment, setDiscountAdjustment] = useState((initialLead && initialLead.discount) || 0);
    const [showOrderLineModal, setShowOrderLineModal] = useState(false);
    const [editingOrderLineId, setEditingOrderLineId] = useState<string | null>(null);
    const [programDropdownOpen, setProgramDropdownOpen] = useState(false);
    const [orderLineDraft, setOrderLineDraft] = useState<OrderLineDraft>(() => createOrderDraft(initialLead || {}));
    const programDropdownRef = useRef<HTMLDivElement | null>(null);

    // Toast Notification State
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; visible: boolean } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToast({ message, type, visible: true });
        setTimeout(() => setToast(null), 3000);
    };

    const loadClassCodeOptions = () =>
        buildTrainingClassLookupOptions([...getTrainingClasses(), ...CREATOR_CLASS_FALLBACKS]);

    // --- TAG MANAGEMENT ---
    const [allAvailableTags, setAllAvailableTags] = useState<string[]>([]);
    const [isAddingTag, setIsAddingTag] = useState(false);

    useEffect(() => {
        setAllAvailableTags(getTags());
    }, []);

    useEffect(() => {
        syncLeadHistoryToQuotationLogs(lead);
    }, [lead.id, lead.activities]);
    const addTagCatalogEntry = (tag: string) => {
        const value = tag.trim();
        if (!value) return;
        const nextTags = saveTags([...allAvailableTags, value]);
        setAllAvailableTags(nextTags);
    };

    const deleteTagCatalogEntry = (tag: string) => {
        if (FIXED_LEAD_TAGS.includes(tag as typeof FIXED_LEAD_TAGS[number])) return;
        const nextTags = saveTags(allAvailableTags.filter((item) => item !== tag));
        setAllAvailableTags(nextTags);
        setLeadFormData((prev) => ({ ...prev, tags: prev.tags.filter((item) => item !== tag) }));
    };

    const addTagToLeadForm = (tag: string) => {
        setLeadFormData((prev) => (
            prev.tags.includes(tag)
                ? prev
                : { ...prev, tags: [...prev.tags, tag] }
        ));
    };

    // --- STAGE HELPERS ---
    const normalizedLeadStatus = normalizeLeadStatusKey(String(lead.status || ''));
    const isLeadStage = isLeadStatusOneOf(String(lead.status || ''), [LEAD_STATUS_KEYS.NEW, LEAD_STATUS_KEYS.ASSIGNED, LEAD_STATUS_KEYS.PICKED, LEAD_STATUS_KEYS.CONTACTED, LEAD_STATUS_KEYS.NURTURING]);
    const isQualified = normalizedLeadStatus === LEAD_STATUS_KEYS.CONVERTED || Object.values(DealStage).includes(lead.status as any);
    const isConverted = normalizedLeadStatus === LEAD_STATUS_KEYS.CONVERTED || lead.status === DealStage.CONTRACT || lead.status === DealStage.WON;
    const isPipeline = Object.values(DealStage).includes(lead.status as any);
    const isWon = lead.status === DealStage.WON;
    const isContract = lead.status === DealStage.CONTRACT;
    const isLost = normalizedLeadStatus === LEAD_STATUS_KEYS.LOST;

    useEffect(() => {
        if (!initialLead) return;
        const mappedLineItems = mapStoredItemsToQuotationLineItems(Array.isArray(initialLead.productItems) ? initialLead.productItems : [], initialLead);
        const isDifferentLead = initialLead.id !== previousInitialLeadIdRef.current;

        setLead(initialLead);
        setLeadFormData(mapLeadToFormData(initialLead));
        setQuotationLineItems(mappedLineItems);
        setDiscountAdjustment(deriveDiscountAdjustment(initialLead.discount, mappedLineItems));
        setOrderLineDraft(createOrderDraft(initialLead));
        setFollowers(Array.isArray(initialLead.followers) ? initialLead.followers : []);

        if (isDifferentLead) {
            setLeadFormActiveTab('notes');
        }

        previousInitialLeadIdRef.current = initialLead.id;
    }, [initialLead]);

    useEffect(() => {
        setLeadFormData(mapLeadToFormData(lead));
    }, [lead]);

    useEffect(() => {
        if (!programDropdownOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (programDropdownRef.current && !programDropdownRef.current.contains(event.target as Node)) {
                setProgramDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [programDropdownOpen]);

    const getDefaultActivityDate = (typeId: string) => {
        const typeConfig = ACTIVITY_TYPES.find(t => t.id === typeId);
        const delay = typeConfig?.defaultDelayHours || 0;
        const now = new Date();
        now.setHours(now.getHours() + delay);
        return new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    };

    const lockedMeetingCustomer: MeetingCustomerOption = {
        key: `lead:${lead.id}`,
        id: lead.id,
        source: 'lead',
        name: lead.name,
        phone: lead.phone,
        campus: lead.company || lead.city || 'Hanoi',
        address: lead.address || 'N/A',
        leadId: lead.id
    };

    // Set default time when activity type changes
    useEffect(() => {
        const typeConfig = ACTIVITY_TYPES.find(t => t.id === activityType);
        if (typeConfig) {
            const localIsoString = getDefaultActivityDate(activityType);
            setActivityDate(localIsoString);
            setActivitySummary('');
        }
    }, [activityType]);

    useEffect(() => {
        if (!showNextActivityModal) return;
        setNextActivityDate(getDefaultActivityDate(nextActivityType));
    }, [nextActivityType, showNextActivityModal]);

    const lineItemsSubtotal = useMemo(
        () => quotationLineItems.reduce((sum, item) => sum + getLineItemSubtotal(item), 0),
        [quotationLineItems]
    );

    const lineItemsNetTotal = useMemo(
        () => quotationLineItems.reduce((sum, item) => sum + getResolvedLineItemTotal(item), 0),
        [quotationLineItems]
    );

    const lineItemsDiscountAmount = useMemo(
        () => Math.max(0, lineItemsSubtotal - lineItemsNetTotal),
        [lineItemsNetTotal, lineItemsSubtotal]
    );

    const totalDiscountAmount = useMemo(
        () => lineItemsDiscountAmount + Math.max(0, discountAdjustment || 0),
        [discountAdjustment, lineItemsDiscountAmount]
    );

    // --- LOGIC: AUTO CALCULATE TOTAL VALUE ---
    const calculatedTotal = useMemo(
        () => Math.max(0, lineItemsNetTotal - Math.max(0, discountAdjustment || 0)),
        [discountAdjustment, lineItemsNetTotal]
    );

    const leadProductItems = useMemo(
        () => quotationLineItems.map((item) => ({
            id: item.productId || item.id,
            name: item.name,
            price: item.unitPrice || 0,
            quantity: item.quantity || 1
        })),
        [quotationLineItems]
    );

    const deriveDiscountAdjustment = (storedDiscount: number | undefined, lineItems: IQuotationLineItem[]) =>
        Math.max(0, (Number(storedDiscount) || 0) - Math.max(0, lineItems.reduce((sum, item) => sum + getLineItemSubtotal(item), 0) - lineItems.reduce((sum, item) => sum + getResolvedLineItemTotal(item), 0)));

    // Sync calculated total to Lead Value
    useEffect(() => {
        if (calculatedTotal !== lead.value) {
            setLead(prev => ({ ...prev, value: calculatedTotal }));
        }
    }, [calculatedTotal]);


    if (!isOpen) return null;

    // --- ACTIONS ---

    const handleSendLog = () => {
        const trimmedContent = noteContent.trim();
        if (!trimmedContent) return;

        addLog(chatterTab === 'message' ? 'message' : 'note', trimmedContent);
        setNoteContent('');
    };

    const commitLeadLogUpdate = (
        nextLead: ILead,
        options?: {
            activities?: any[];
            audits?: any[];
        }
    ) => {
        const finalLead = appendLeadLogs(nextLead, {
            activities: options?.activities,
            audits: options?.audits
        });
        setLead(finalLead);
        onUpdate(finalLead);
        return finalLead;
    };

    const addLog = (type: 'note' | 'message' | 'system' | 'activity', content: string, extra?: any) => {
        if (!content.trim()) return;

        // Prevent duplicate logs for the same content within the same minute
        const logKey = `log-${type}-${content}`;
        const nowMinute = new Date().toISOString().slice(0, 16);
        if (lastLoggedValues.current[logKey] === nowMinute) return;
        lastLoggedValues.current[logKey] = nowMinute;

        const nowIso = new Date().toISOString();
        const newActivity: any = {
            ...buildLeadActivityLog({
                type,
                title: extra?.title || '',
                description: content,
                user: user?.name || 'Admin',
                timestamp: nowIso,
                status: extra?.status,
                datetime: extra?.datetime
            }),
            activityType: extra?.activityType
        };

        const currentActivities = lead.activities || [];

        // AUTO STATUS: NEW/ASSIGNED/PICKED -> CONTACTED
        let newStatus = lead.status;
        if (isLeadStatusOneOf(String(lead.status || ''), [LEAD_STATUS_KEYS.NEW, LEAD_STATUS_KEYS.ASSIGNED, LEAD_STATUS_KEYS.PICKED]) || !lead.status) {
            newStatus = LeadStatus.CONTACTED;
        }

        const audits = [
            buildLeadAuditLog({
                action: extra?.activityType === 'meeting'
                    ? 'lead_schedule_activity'
                    : type === 'message'
                        ? 'lead_message_logged'
                        : type === 'activity'
                            ? 'lead_activity_logged'
                            : type === 'note'
                                ? 'lead_note_logged'
                                : 'lead_interaction_logged',
                actor: user?.name || 'Admin',
                actorType: 'user',
                timestamp: nowIso,
                changes: [
                    buildLeadAuditChange('activities', currentActivities.length, currentActivities.length + 1, 'Số log hiển thị'),
                    buildLeadAuditChange('lastInteraction', lead.lastInteraction, nowIso, 'Lần tương tác cuối'),
                    ...(String(newStatus) !== String(lead.status)
                        ? [buildLeadAuditChange('status', lead.status, newStatus, 'Trạng thái')]
                        : [])
                ]
            })
        ];

        commitLeadLogUpdate(
            {
                ...lead,
                status: newStatus as any,
                lastInteraction: nowIso,
                lastActivityDate: nowIso
            },
            {
                activities: [newActivity],
                audits
            }
        );
    };

    // Removed handleSendNote as it is replaced by handleSendLog

    const addScheduledActivity = (typeId: string, summary: string, dateStr: string) => {
        const typeConfig = ACTIVITY_TYPES.find(t => t.id === typeId);
        const scheduledAt = dateStr || new Date().toISOString();
        addLog('activity', summary, {
            title: typeConfig?.label || 'Lịch',
            status: 'scheduled',
            datetime: scheduledAt,
            activityType: typeId
        });
    };

    const openNextActivityModal = () => {
        const defaultType = 'call';
        setNextActivityType(defaultType);
        setNextActivityDate(getDefaultActivityDate(defaultType));
        setNextActivitySummary('');
        setShowNextActivityModal(true);
    };

    const handleOpenMeetingScheduler = () => {
        setChatterTab('meeting');
        setIsCreateMeetingModalOpen(true);
    };

    const completeActivity = () => {
        if (!lead || !completingActivityId || !completionNote.trim()) return;
        const updatedActivities = (lead.activities || []).map((a: any) =>
            a.id === completingActivityId ? { ...a, status: 'completed', completedAt: new Date().toISOString() } : a
        );
        const resultLog: any = {
            id: `act-${Date.now()}`,
            type: 'note',
            timestamp: new Date().toISOString(),
            description: completionNote,
            user: user?.name || 'Admin',
            title: 'Kết quả hoạt động'
        };
        const updatedLead = {
            ...lead,
            activities: [resultLog, ...updatedActivities]
        };
        setLead(updatedLead);
        onUpdate(updatedLead);
        setCompletionNote('');
        setCompletingActivityId(null);

        // Auto-prompt for Next Activity
        openNextActivityModal();
    };

    const handleFieldBlur = (field: keyof ILead, currentValue: any) => {
        if (JSON.stringify(lead[field]) !== JSON.stringify(currentValue)) {
            // Extra guard: Check ref to prevent rapid duplicate logs
            const valStr = JSON.stringify(currentValue);
            if (lastLoggedValues.current[`field-${field}`] === valStr) return;
            lastLoggedValues.current[`field-${field}`] = valStr;

            const fieldLabel = LEAD_FIELD_LABELS[field] || field.toString();
            const oldValueText = formatAuditValue(lead[field]);
            const newValueText = formatAuditValue(currentValue);
            const logMsg = `${user?.name || 'Admin'} cập nhật ${fieldLabel}: ${oldValueText} -> ${newValueText}`;

            // Create activity log
            const nowIso = new Date().toISOString();
            const newLogEntry: any = buildLeadActivityLog({
                type: 'system',
                timestamp: nowIso,
                description: logMsg,
                user: user?.name || 'Admin',
                title: 'Cập nhật hệ thống'
            });

            commitLeadLogUpdate({
                ...lead,
                [field]: currentValue
            }, {
                activities: [newLogEntry],
                audits: [
                    buildLeadAuditLog({
                        action: 'lead_field_updated',
                        actor: user?.name || 'Admin',
                        actorType: 'user',
                        timestamp: nowIso,
                        changes: [buildLeadAuditChange(String(field), lead[field], currentValue, fieldLabel)]
                    })
                ]
            });

            // Auto-save feedback
            setIsSaving(true);
            setTimeout(() => setIsSaving(false), 2000);

            // Sync Owner to Followers
            if (field === 'ownerId') {
                const newOwner = MOCK_USERS.find(u => u.name === currentValue) || { id: 'u-ex', name: currentValue as string, avatar: 'EX', role: 'Sales Rep' };
                if (!followers?.find(f => f.name === currentValue)) {
                    handleAddFollower(newOwner, true);
                }
            }
        }
    };

    const handleInternalNoteBlur = (field: keyof NonNullable<ILead['internalNotes']>, value: string) => {
        const currentVal = lead.internalNotes?.[field] || '';
        if (currentVal === value) return;

        // Extra guard: Check ref to prevent rapid duplicate logs
        if (lastLoggedValues.current[`internal-${field}`] === value) return;
        lastLoggedValues.current[`internal-${field}`] = value;

        // Auto-save feedback
        setIsSaving(true);
        setTimeout(() => setIsSaving(false), 2000);

        const fieldLabel = INTERNAL_NOTE_LABELS[field] || field;
        const oldValueText = formatAuditValue(currentVal);
        const newValueText = formatAuditValue(value);
        const nowIso = new Date().toISOString();
        const newLogEntry: any = buildLeadActivityLog({
            type: 'system',
            timestamp: nowIso,
            description: `${user?.name || 'Admin'} cập nhật ${fieldLabel}: ${oldValueText} -> ${newValueText}`,
            user: user?.name || 'Admin',
            title: 'Cập nhật ghi chú nội bộ'
        });

        commitLeadLogUpdate({
            ...lead,
            internalNotes: {
                ...(lead.internalNotes || {}),
                [field]: value
            }
        }, {
            activities: [newLogEntry],
            audits: [
                buildLeadAuditLog({
                    action: 'lead_internal_note_updated',
                    actor: user?.name || 'Admin',
                    actorType: 'user',
                    timestamp: nowIso,
                    changes: [buildLeadAuditChange(`internalNotes.${String(field)}`, currentVal, value, fieldLabel)]
                })
            ]
        });
    };

    const handleLeadFormSubmit = () => {
        if (!leadFormData.name.trim()) {
            showToast('Vui lòng nhập tên khách hàng.', 'error');
            return;
        }
        if (!leadFormData.phone.trim()) {
            showToast('Vui lòng nhập số điện thoại.', 'error');
            return;
        }
        const normalizedPhone = normalizeLeadPhone(leadFormData.phone);
        const phoneError = getLeadPhoneValidationMessage(leadFormData.phone);
        if (phoneError) {
            showToast(phoneError, 'error');
            return;
        }
        if (!leadFormData.targetCountry) {
            showToast('Vui lòng chọn quốc gia mục tiêu.', 'error');
            return;
        }

        const closeReasonError = validateCloseReason(leadFormData.status, leadFormData.lossReason, leadFormData.lossReasonCustom);
        if (closeReasonError) {
            showToast(closeReasonError, 'error');
            return;
        }

        const guardianRelation = getLeadGuardianRelation(leadFormData.title);
        const studentInfo = buildLeadStudentInfo(leadFormData);
        const campus = resolveLeadCampus(leadFormData);
        const resolvedCloseReason = resolveCloseReason(leadFormData.lossReason, leadFormData.lossReasonCustom);
        const normalizedProgram =
            leadFormData.product &&
            ['Tiếng Đức', 'Tiếng Trung', 'Du học Đức', 'Du học Trung', 'Du học nghề Úc'].includes(leadFormData.product)
                ? leadFormData.product as ILead['program']
                : leadFormData.program as ILead['program'];

        const updatedLead: ILead = {
            ...lead,
            name: leadFormData.name,
            phone: normalizedPhone,
            email: leadFormData.email,
            source: leadFormData.source,
            program: normalizedProgram,
            notes: leadFormData.notes,
            company: campus || undefined,
            ownerId: leadFormData.salesperson,
            targetCountry: leadFormData.targetCountry || lead.targetCountry,
            educationLevel: leadFormData.studentEducationLevel || undefined,
            dob: leadFormData.studentDob || undefined,
            identityCard: leadFormData.studentIdentityCard || undefined,
            identityDate: leadFormData.identityDate || undefined,
            identityPlace: leadFormData.identityPlace || undefined,
            address: leadFormData.street.trim() || undefined,
            city: leadFormData.province.trim() || undefined,
            district: leadFormData.city.trim() || undefined,
            ward: leadFormData.ward.trim() || undefined,
            guardianName: guardianRelation ? leadFormData.name.trim() || undefined : undefined,
            guardianPhone: guardianRelation ? normalizedPhone || undefined : undefined,
            guardianRelation,
            lostReason: isClosedLeadFormStatus(leadFormData.status) ? resolvedCloseReason : undefined,
            studentInfo,
            internalNotes: {
                ...(lead.internalNotes || {}),
                expectedStart: leadFormData.expectedStart.trim() || undefined,
                parentOpinion: leadFormData.parentOpinion.trim() || undefined,
                financial: leadFormData.financial.trim() || undefined,
                potential: (leadFormData.potential.trim() || undefined) as any,
            },
            status: toLeadStatusValue(leadFormData.status as string) as any,
            marketingData: {
                ...lead.marketingData,
                campaign: leadFormData.campaign,
                tags: leadFormData.tags,
                market: leadFormData.market,
                channel: leadFormData.channel,
                medium: leadFormData.channel,
                region: campus || undefined
            }
        };

        (updatedLead as any).title = leadFormData.title;
        (updatedLead as any).street = leadFormData.street;
        (updatedLead as any).province = leadFormData.province;
        (updatedLead as any).city = leadFormData.city;
        (updatedLead as any).ward = leadFormData.ward;
        (updatedLead as any).referredBy = leadFormData.referredBy;

        const changedFields: any[] = [];
        const pushChange = (field: string, oldValue: any, newValue: any, label: string) => {
            if (JSON.stringify(oldValue) === JSON.stringify(newValue)) return;
            changedFields.push(buildLeadAuditChange(field, oldValue, newValue, label));
        };

        pushChange('name', lead.name, updatedLead.name, 'Tên lead');
        pushChange('phone', lead.phone, updatedLead.phone, 'Số điện thoại');
        pushChange('email', lead.email, updatedLead.email, 'Email');
        pushChange('source', lead.source, updatedLead.source, 'Nguồn');
        pushChange('ownerId', lead.ownerId, updatedLead.ownerId, 'Sale phụ trách');
        pushChange('status', lead.status, updatedLead.status, 'Trạng thái');
        pushChange('targetCountry', lead.targetCountry, updatedLead.targetCountry, 'Quốc gia mục tiêu');
        pushChange('educationLevel', lead.educationLevel, updatedLead.educationLevel, 'Trình độ học vấn');
        pushChange('dob', lead.dob, updatedLead.dob, 'Ngày sinh');
        pushChange('identityCard', lead.identityCard, updatedLead.identityCard, 'CCCD');
        pushChange('identityDate', lead.identityDate, updatedLead.identityDate, 'Ngày cấp');
        pushChange('identityPlace', lead.identityPlace, updatedLead.identityPlace, 'Nơi cấp');
        pushChange('address', lead.address, updatedLead.address, 'Địa chỉ');
        pushChange('city', lead.city, updatedLead.city, 'Tỉnh/TP');
        pushChange('district', lead.district, updatedLead.district, 'Quận/Huyện');
        pushChange('ward', lead.ward, updatedLead.ward, 'Phường/Xã');
        pushChange('notes', lead.notes, updatedLead.notes, 'Ghi chú nội bộ');
        pushChange('studentInfo.languageLevel', lead.studentInfo?.languageLevel, updatedLead.studentInfo?.languageLevel, 'GPA / Điểm ngoại ngữ');
        pushChange('studentInfo.financialStatus', lead.studentInfo?.financialStatus, updatedLead.studentInfo?.financialStatus, 'Tài chính');
        pushChange('internalNotes.expectedStart', lead.internalNotes?.expectedStart, updatedLead.internalNotes?.expectedStart, 'Thời gian dự kiến tham gia');
        pushChange('internalNotes.parentOpinion', lead.internalNotes?.parentOpinion, updatedLead.internalNotes?.parentOpinion, 'Ý kiến bố mẹ');
        pushChange('internalNotes.financial', lead.internalNotes?.financial, updatedLead.internalNotes?.financial, 'Tài chính');
        pushChange('internalNotes.potential', lead.internalNotes?.potential, updatedLead.internalNotes?.potential, 'Mức độ tiềm năng');
        pushChange('marketingData.campaign', lead.marketingData?.campaign, updatedLead.marketingData?.campaign, 'Chiến dịch');
        pushChange('marketingData.channel', lead.marketingData?.channel, updatedLead.marketingData?.channel, 'Kênh');
        pushChange('marketingData.market', lead.marketingData?.market, updatedLead.marketingData?.market, 'Cơ sở');
        pushChange('marketingData.tags', lead.marketingData?.tags || [], updatedLead.marketingData?.tags || [], 'Tags');
        pushChange('referredBy', (lead as any).referredBy, (updatedLead as any).referredBy, 'Người giới thiệu');
        pushChange('lostReason', lead.lostReason, updatedLead.lostReason, 'Lý do đóng lead');

        if (changedFields.length === 0) {
            showToast('Không có thay đổi để lưu.', 'info');
            return;
        }

        const activities = [
            ...(lead.status !== updatedLead.status
                ? [buildLeadActivityLog({
                    type: 'system',
                    title: 'Đổi trạng thái',
                    description: `Trạng thái: ${getLeadStatusLabel(String(lead.status || ''))} → ${getLeadStatusLabel(String(updatedLead.status || ''))}`,
                    user: user?.name || 'Admin'
                })]
                : []),
            ...(lead.ownerId !== updatedLead.ownerId
                ? [buildLeadActivityLog({
                    type: 'system',
                    title: lead.ownerId ? 'Phân bổ lại Lead' : 'Phân bổ Lead',
                    description: lead.ownerId
                        ? `Lead được phân bổ lại từ ${lead.ownerId} sang ${updatedLead.ownerId}.`
                        : `Lead được giao cho ${updatedLead.ownerId}.`,
                    user: user?.name || 'Admin'
                })]
                : []),
            buildLeadActivityLog({
                type: 'system',
                title: 'Cập nhật lead',
                description: `${user?.name || 'Admin'} đã cập nhật form chi tiết lead.`,
                user: user?.name || 'Admin'
            })
        ];

        const finalLead = appendLeadLogs(updatedLead, {
            activities,
            audits: [
                buildLeadAuditLog({
                    action: 'lead_updated',
                    actor: user?.name || 'Admin',
                    actorType: 'user',
                    changes: changedFields
                })
            ]
        });

        setLead(finalLead);
        onUpdate(finalLead);
        setIsSaving(true);
        setTimeout(() => setIsSaving(false), 1500);
        showToast('Đã cập nhật thông tin lead.', 'success');
    };

    const handleAddFollower = (newFollower: any, isSystem = false) => {
        if (followers?.some(f => f.id === newFollower.id)) return;

        const updatedList = [...followers, { ...newFollower, addedAt: new Date().toISOString() }];
        setFollowers(updatedList);

        // Log
        const logMsg = isSystem
            ? `Hệ thống đã thêm [${newFollower.name}] vào danh sách theo dõi.`
            : `${user?.name || 'Admin'} đã thêm [${newFollower.name}] vào danh sách theo dõi.`;

        // Create log entry and update lead in one go to avoid race conditions
        const logEntry: any = {
            id: `act-${Date.now()}-follow`,
            type: 'system',
            timestamp: new Date().toISOString(),
            description: logMsg,
            user: isSystem ? 'System' : (user?.name || 'Admin'),
            title: 'Follower'
        };

        const finalLead = {
            ...lead,
            followers: updatedList,
            activities: [logEntry, ...(lead.activities || [])]
        };

        setLead(finalLead);
        onUpdate(finalLead);
        setShowFollowersModal(false);
    };

    const handleStatusChange = (newStatus: string) => {
        // --- GATEKEEPER LOGIC ---

        // 1. GATE: Lead -> Qualified
        if (normalizeLeadStatusKey(newStatus) === LEAD_STATUS_KEYS.CONVERTED) {
            if (!lead.dob || !lead.educationLevel) {
                showToast("Vui lòng điền 'Ngày sinh' và 'Trình độ học vấn' ở Mục B trước.", 'error');
                setShowStatusDropdown(false);
                return;
            }
            const hasInteraction = (lead.activities || []).some(a => a.type === 'note' || a.type === 'activity');
            if (!hasInteraction) {
                showToast("Vui lòng cập nhật ít nhất 1 nhật ký tư vấn.", 'error');
                setShowStatusDropdown(false);
                return;
            }
        }

        // 2. GATE: Into Negotiation & Advanced Stages
        // Logic: Cannot enter Negotiation or later steps without filling Quotation (Sec 3)
        const advancedStages: string[] = [DealStage.NEGOTIATION, DealStage.CONTRACT, DealStage.DOCUMENT_COLLECTION, DealStage.WON];
        if (advancedStages.includes(newStatus)) {
            // Check Quotation Section (3)
            if (quotationLineItems.length === 0 || calculatedTotal < 0) { // Allow 0 if free, but usually > 0
                showToast("Vui lòng tạo Bảng báo giá (Sản phẩm) ở Mục 3 trước khi sang giai đoạn này.", 'error');
                setShowStatusDropdown(false);
                return;
            }
            // Check Target Country (Only required for Study Abroad or Combos)
            const isStudyAbroad = quotationLineItems.some(p => p.name.toLowerCase().includes('du học'));

            if (isStudyAbroad && !lead.targetCountry) {
                showToast("Vui lòng chọn 'Thị trường mục tiêu' (Bắt buộc với Du học/Combo) ở Mục 2 trước.", 'error');
                setShowStatusDropdown(false);
                return;
            }
        }

        // 3. GATE: Contract / Won checks
        // Must satisfy Negotiation section (Sec 4)
        if ((newStatus === DealStage.CONTRACT || newStatus === DealStage.WON) && totalDiscountAmount > 0 && !lead.discountReason) {
            showToast("Vui lòng nhập 'Lý do giảm giá' ở Mục 4.", 'error');
            setShowStatusDropdown(false);
            return;
        }

        // 4. GATE: Final WON
        if (newStatus === DealStage.WON) {
            handleWonAction();
            return;
        }

        // Add log
        const isDealStageStatus = Object.values(DealStage).includes(newStatus as DealStage);
        const nextStatusLabel = isDealStageStatus ? newStatus : getLeadStatusLabel(newStatus);
        const nowIso = new Date().toISOString();
        const statusLog: any = buildLeadActivityLog({
            type: 'system',
            timestamp: nowIso,
            description: `Trạng thái: ${getLeadStatusLabel(lead.status as string)} → ${nextStatusLabel}`,
            user: user?.name || 'Admin',
            title: 'Đổi trạng thái'
        });

        commitLeadLogUpdate({
            ...lead,
            status: (isDealStageStatus ? newStatus : toLeadStatusValue(newStatus)) as any,
            productItems: leadProductItems, // Sync current products
            discount: totalDiscountAmount, // Sync current discount
            paymentRoadmap: lead.paymentRoadmap
        }, {
            activities: [statusLog],
            audits: [
                buildLeadAuditLog({
                    action: 'lead_status_changed',
                    actor: user?.name || 'Admin',
                    actorType: 'user',
                    timestamp: nowIso,
                    changes: [buildLeadAuditChange('status', lead.status, isDealStageStatus ? newStatus : toLeadStatusValue(newStatus), 'Trạng thái')]
                })
            ]
        });
        setShowStatusDropdown(false);
    };

    const handleLossAction = () => {
        if (!lossReason) {
            showToast("Vui lòng chọn lý do!", 'error');
            return;
        }

        const finalReason = lossReason === 'Lý do khác' ? customLossReason : lossReason;
        if (lossReason === 'Lý do khác' && !customLossReason.trim()) {
            showToast("Vui lòng nhập lý do cụ thể!", 'error');
            return;
        }

        const nowIso = new Date().toISOString();
        const statusLog: any = buildLeadActivityLog({
            type: 'system',
            timestamp: nowIso,
            description: `Trạng thái: ${getLeadStatusLabel(lead.status as string)} → ${getLeadStatusLabel(LEAD_STATUS_KEYS.LOST)}. Lý do: ${finalReason}`,
            user: user?.name || 'Admin',
            title: 'Mất'
        });

        commitLeadLogUpdate(
            { ...lead, status: LeadStatus.LOST, lostReason: finalReason } as any,
            {
                activities: [statusLog],
                audits: [
                    buildLeadAuditLog({
                        action: 'lead_status_changed',
                        actor: user?.name || 'Admin',
                        actorType: 'user',
                        timestamp: nowIso,
                        changes: [
                            buildLeadAuditChange('status', lead.status, LeadStatus.LOST, 'Trạng thái'),
                            buildLeadAuditChange('lostReason', lead.lostReason, finalReason, 'Lý do thất bại')
                        ]
                    })
                ]
            }
        );
        setShowLossModal(false);
        setLossReason('');
        setCustomLossReason('');
    };

    const handleWonAction = () => {
        // 1. Basic Check for Won
        if (quotationLineItems.length === 0 || calculatedTotal <= 0) {
            showToast("Giá trị Hợp đồng phải > 0. Vui lòng kiểm tra Bảng báo giá (Mục 3).", 'error');
            return;
        }

        // 2. Update Status to WON
        const wonLog: any = {
            id: `act-${Date.now()}`,
            type: 'system',
            timestamp: new Date().toISOString(),
            description: `Trạng thái: ${lead.status || 'Mới'} → WON (Chốt thành công)`,
            user: user?.name || 'Admin',
            title: 'Chốt thành công'
        };

        const updatedLead = {
            ...lead,
            status: DealStage.WON as any,
            activities: [wonLog, ...(lead.activities || [])],
        };

        setLead(updatedLead);
        onUpdate(updatedLead);
        setShowConfetti(true);
        showToast("Chốt WON thành công! Nút 'Tạo Hợp đồng' đã sẵn sàng.", 'success');
    };

    const handleDisqualifiedAction = () => {
        const disqualifiedLog: any = {
            id: `act-${Date.now()}`,
            type: 'system',
            timestamp: new Date().toISOString(),
            description: `Trạng thái: ${getLeadStatusLabel(lead.status as string)} → ${getLeadStatusLabel(LEAD_STATUS_KEYS.UNVERIFIED)}`,
            user: user?.name || 'Admin',
            title: getLeadStatusLabel(LEAD_STATUS_KEYS.UNVERIFIED)
        };

        const updatedLead = {
            ...lead,
            status: LeadStatus.UNVERIFIED as any,
            activities: [disqualifiedLog, ...(lead.activities || [])],
        };

        setLead(updatedLead);
        onUpdate(updatedLead);
        showToast(`Đã cập nhật: ${getLeadStatusLabel(LEAD_STATUS_KEYS.UNVERIFIED)}`, 'info');
    };

    const handlePickUpAction = () => {
        const now = new Date();
        const createdAt = new Date(lead.createdAt);
        const diffMins = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60));
        const slaMet = diffMins <= 15;

        const nowIso = now.toISOString();
        const pickUpLog: any = buildLeadActivityLog({
            type: 'system',
            timestamp: nowIso,
            description: `Sale ${user?.name || 'Admin'} đã tiếp nhận Lead. SLA Pick-up: ${slaMet ? 'ĐẠT' : 'VI PHẠM'} (Phản hồi sau ${diffMins} phút).`,
            user: user?.name || 'Admin',
            title: 'Tiếp nhận Lead'
        });

        commitLeadLogUpdate({
            ...clearLeadReclaimTracking(lead),
            status: LeadStatus.PICKED as any,
            ownerId: user?.name || lead.ownerId,
            pickUpDate: nowIso,
        }, {
            activities: [pickUpLog],
            audits: [
                buildLeadAuditLog({
                    action: 'lead_picked',
                    actor: user?.name || 'Admin',
                    actorType: 'user',
                    timestamp: nowIso,
                    changes: [
                        buildLeadAuditChange('status', lead.status, LeadStatus.PICKED, 'Trạng thái'),
                        buildLeadAuditChange('ownerId', lead.ownerId, user?.name || lead.ownerId, 'Sale phụ trách'),
                        buildLeadAuditChange('pickUpDate', lead.pickUpDate, nowIso, 'Thời gian nhận lead')
                    ]
                })
            ]
        });
        showToast(`Đã tiếp nhận Lead. SLA: ${slaMet ? 'Đạt' : 'Quá hạn'}`, slaMet ? 'success' : 'info');
    };

    const handleCallAction = () => {
        const nowIso = new Date().toISOString();
        const callLog: any = buildLeadActivityLog({
            type: 'system',
            timestamp: nowIso,
            title: 'Thực hiện gọi điện',
            description: `Sale ${user?.name || 'Tôi'} đã thực hiện gọi điện cho khách hàng.`,
            user: user?.name || 'Admin',
        });

        if (isLeadStatusOneOf(String(lead.status || ''), [LEAD_STATUS_KEYS.NEW, LEAD_STATUS_KEYS.ASSIGNED, LEAD_STATUS_KEYS.PICKED])) {
            commitLeadLogUpdate({
                ...lead,
                status: LeadStatus.CONTACTED as any,
                lastInteraction: nowIso
            }, {
                activities: [callLog],
                audits: [
                    buildLeadAuditLog({
                        action: 'lead_called',
                        actor: user?.name || 'Admin',
                        actorType: 'user',
                        timestamp: nowIso,
                        changes: [
                            buildLeadAuditChange('status', lead.status, LeadStatus.CONTACTED, 'Trạng thái'),
                            buildLeadAuditChange('lastInteraction', lead.lastInteraction, nowIso, 'Lần tương tác cuối')
                        ]
                    })
                ]
            });
        } else {
            commitLeadLogUpdate({
                ...lead,
                lastInteraction: nowIso
            }, {
                activities: [callLog],
                audits: [
                    buildLeadAuditLog({
                        action: 'lead_called',
                        actor: user?.name || 'Admin',
                        actorType: 'user',
                        timestamp: nowIso,
                        changes: [buildLeadAuditChange('lastInteraction', lead.lastInteraction, nowIso, 'Lần tương tác cuối')]
                    })
                ]
            });
        }
        window.location.href = `tel:${lead.phone}`;
    };

    const handleAssignAction = (targetUser: any) => {
        const nowIso = new Date().toISOString();
        const isReassigned = Boolean(lead.ownerId && lead.ownerId !== targetUser.name);
        const assignLog: any = buildLeadActivityLog({
            type: 'system',
            timestamp: nowIso,
            description: isReassigned
                ? `Lead được chia lại từ ${lead.ownerId} sang ${targetUser.name}.`
                : `Lead được giao cho ${targetUser.name}.`,
            user: user?.name || 'Admin',
            title: isReassigned ? 'Chia lại Lead' : 'Phân bổ Lead'
        });

        commitLeadLogUpdate({
            ...clearLeadReclaimTracking(lead),
            status: LeadStatus.ASSIGNED as any,
            ownerId: targetUser.name,
        }, {
            activities: [assignLog],
            audits: [
                buildLeadAuditLog({
                    action: isReassigned ? 'lead_reassigned' : 'lead_assigned',
                    actor: user?.name || 'Admin',
                    actorType: 'user',
                    timestamp: nowIso,
                    changes: [
                        buildLeadAuditChange('ownerId', lead.ownerId, targetUser.name, 'Sale phụ trách'),
                        buildLeadAuditChange('status', lead.status, LeadStatus.ASSIGNED, 'Trạng thái')
                    ]
                })
            ]
        });
        setShowAssignModal(false);
        showToast(`Đã chuyển Lead cho ${targetUser.name}`, 'info');
    };

    const handleCreateContract = () => {
        // 1. STRICT VALIDATION for Contract Handover
        if (!lead.identityCard || !lead.identityDate || !lead.identityPlace || !lead.address) {
            showToast("Thiếu thông tin ĐỊNH DANH (CCCD, Ngày/Nơi cấp, Địa chỉ). Vui lòng bổ sung Mục 5.", 'error');
            // Highlight section?
            return;
        }
        if (!lead.paymentRoadmap) {
            showToast("Vui lòng nhập 'Lộ trình đóng phí' (Mục 3) để bộ phận Hợp đồng nắm thông tin.", 'error');
            return;
        }
        // Validate Image (Mock)
        // if (!hasImage) { showToast("Chưa upload ảnh CCCD!", 'error'); return; }

        // 2. DATA MAPPING & CREATION
        const contractCode = `HD-2026-${Math.floor(1000 + Math.random() * 9000)}`;
        const newContract: IContract = {
            id: `CT-${Date.now()}`,
            code: contractCode,
            dealId: lead.id,
            customerName: lead.name,
            totalValue: lead.value || 0,
            paidValue: 0,
            status: ContractStatus.DRAFT,
            createdBy: user?.name || 'Admin',
            // Mapped Fields
            cccdNumber: lead.identityCard,
            identityDate: lead.identityDate,
            identityPlace: lead.identityPlace,
            address: lead.address,
        };

        addContract(newContract);

        // 3. LOGGING & HANDOVER
        // Add Contract Manager as Follower
        const contractManager = MOCK_USERS.find(u => u.role === 'Contract Manager');
        let updatedFollowers = [...followers];
        let logs: any[] = [];

        if (contractManager && !updatedFollowers?.find(f => f.id === contractManager.id)) {
            updatedFollowers.push({ ...contractManager, addedAt: new Date().toISOString() });
            logs.push({
                id: `act-${Date.now()}`, type: 'system', timestamp: new Date().toISOString(),
                description: `Hệ thống đã thêm [${contractManager.name}] (Bộ phận Hợp đồng) vào danh sách theo dõi hồ sơ.`,
                user: 'System'
            });
        }

        // Main Handover Log
        logs.push({
            id: `act-${Date.now() + 1}`, type: 'system', timestamp: new Date().toISOString(),
            description: `[${user?.name || 'Sales'}] đã khởi tạo hợp đồng [${contractCode}] từ cơ hội này. Trạng thái: Chờ soạn thảo.`,
            user: 'System',
            title: 'Bàn giao Hợp đồng'
        });

        // Notification Log
        logs.push({
            id: `act-${Date.now() + 2}`, type: 'message', timestamp: new Date().toISOString(),
            description: `Notification: Cơ hội [${lead.name}] đã chốt. Vui lòng kiểm tra dữ liệu để xuất hợp đồng.`,
            user: 'System',
            title: 'Notification'
        });

        const updatedLead = {
            ...lead,
            contractCode: contractCode,
            followers: updatedFollowers,
            activities: [...logs, ...(lead.activities || [])]
        };

        setLead(updatedLead);
        onUpdate(updatedLead);
        showToast(`Đã chuyển thông tin sang bộ phận Hợp đồng (Mã: ${contractCode})`, 'success');
    };


    const handleConvertAction = () => {
        if (typeof onConvert === 'function') {
            onConvert(lead);
        } else {
            console.error("onConvert param is not a function", onConvert);
        }
    };

    const handleScheduleActivity = () => {
        if (!activitySummary.trim()) {
            showToast('Vui lòng nhập nội dung lịch chăm sóc.', 'error');
            return;
        }
        if (!activityDate) {
            showToast('Vui lòng chọn ngày giờ lịch chăm sóc.', 'error');
            return;
        }
        addScheduledActivity(activityType, activitySummary.trim(), activityDate);
        setActivitySummary('');
        showToast("Đã lên lịch thành công!", 'success');
        setChatterTab('note');
    };

    const handleCreateQuote = () => {
        const existingQuotation = getQuotations().find(q => q.leadId === lead.id);
        if (existingQuotation) {
            const nextLineItems = existingQuotation.lineItems?.length
                ? existingQuotation.lineItems.map((item) => ({ ...item, total: getResolvedLineItemTotal(item) }))
                : mapStoredItemsToQuotationLineItems(Array.isArray(lead.productItems) ? lead.productItems : [], lead);
            setActiveQuotationId(existingQuotation.id);
            setQuotationLineItems(nextLineItems);
            setDiscountAdjustment(deriveDiscountAdjustment(existingQuotation.discount, nextLineItems));
            setQuotationWorkflowStatus(
                existingQuotation.status === QuotationStatus.SALE_ORDER
                    ? 'sale_order'
                    : existingQuotation.status === QuotationStatus.SENT
                        ? 'sent'
                        : 'draft'
            );
            setQuotationData(prev => ({
                ...prev,
                paymentMethod: existingQuotation.paymentMethod === 'CASH' ? 'Tiền mặt' : existingQuotation.paymentMethod === 'CK' ? 'Chuyển khoản' : prev.paymentMethod,
                expirationDate: existingQuotation.expirationDate || existingQuotation.updatedAt?.slice(0, 10) || prev.expirationDate,
                pricelist: existingQuotation.pricelist || prev.pricelist,
                orderMode: normalizeQuotationReceiptType(existingQuotation.orderMode || prev.orderMode),
                salespersonName: existingQuotation.salespersonName || existingQuotation.createdBy || prev.salespersonName || user?.name || '',
                classCode: existingQuotation.classCode || prev.classCode,
                schedule: existingQuotation.schedule || prev.schedule,
                pricingNote: existingQuotation.pricingNote || prev.pricingNote,
                serviceType: existingQuotation.serviceType || prev.serviceType,
                needInvoice: !!existingQuotation.needInvoice
            }));
        } else {
            const nextLineItems = mapStoredItemsToQuotationLineItems(Array.isArray(lead.productItems) ? lead.productItems : [], lead);
            setActiveQuotationId(null);
            setQuotationLineItems(nextLineItems);
            setDiscountAdjustment(deriveDiscountAdjustment(lead.discount, nextLineItems));
            setQuotationWorkflowStatus('draft');
            setQuotationData(prev => ({
                ...prev,
                paymentMethod: 'Chuyển khoản',
                expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                salespersonName: user?.name || prev.salespersonName || ''
            }));
        }
        setEditingOrderLineId(null);
        setProgramDropdownOpen(false);
        setOrderLineDraft(createOrderDraft(lead));
        setShowOrderLineModal(false);
        setQuotationCreatorTab('order_lines');
        setShowQuotationCreator(true);
    };

    const buildQuotationLogNote = (action: string, detail?: string): IQuotationLogNote => ({
        id: `q-log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: new Date().toISOString(),
        user: user?.name || 'System',
        type: 'system',
        action,
        detail
    });

    const mapPaymentMethod = (): 'CK' | 'CASH' | undefined => {
        if (quotationData.paymentMethod === 'Chuyển khoản') return 'CK';
        if (quotationData.paymentMethod === 'Tiền mặt') return 'CASH';
        return undefined;
    };

    const upsertQuotation = (
        status: QuotationStatus,
        action: string,
        detail?: string
    ): IQuotation => {
        const now = new Date().toISOString();
        const existing = activeQuotationId ? getQuotations().find(q => q.id === activeQuotationId) : undefined;
        const mappedPayment = mapPaymentMethod();
        const normalizedLineItems = quotationLineItems.map((item) => {
            const quantity = Math.max(1, Number(item.quantity) || 1);
            const unitPrice = Math.max(0, Number(item.unitPrice) || 0);
            const discountPercent = Math.min(100, Math.max(0, Number(item.discount) || 0));
            return {
                ...item,
                quantity,
                unitPrice,
                discount: discountPercent,
                total: calculateOrderLineTotal(unitPrice, quantity, discountPercent)
            };
        });
        const subtotal = normalizedLineItems.reduce((sum, item) => sum + getLineItemSubtotal(item), 0);
        const normalizedNetTotal = normalizedLineItems.reduce((sum, item) => sum + getResolvedLineItemTotal(item), 0);
        const lineDiscountAmount = Math.max(0, subtotal - normalizedNetTotal);
        const finalAmount = Math.max(normalizedNetTotal - Math.max(0, discountAdjustment || 0), 0);
        const baseLogNotes = [buildQuotationLogNote(action, detail), ...(existing?.logNotes || [])];
        const logNotes = mergeQuotationLogNotes(baseLogNotes, lead.activities || []);
        const derivedServiceType =
            normalizedLineItems[0]?.servicePackage === 'Du học'
                ? 'StudyAbroad'
                : normalizedLineItems[0]?.servicePackage === 'Combo'
                    ? 'Combo'
                    : normalizedLineItems[0]?.servicePackage === 'Đào tạo'
                        ? 'Training'
                        : quotationData.serviceType;

        const payload: IQuotation = {
            id: existing?.id || `Q-${Date.now()}`,
            soCode: existing?.soCode || `SO${String(getQuotations().length + 1).padStart(4, '0')}`,
            customerName: lead.name,
            customerId: lead.id,
            leadId: lead.id,
            dealId: lead.id,
            serviceType: derivedServiceType,
            product: normalizedLineItems.map(item => item.name).filter(Boolean).join(' + ') || lead.product || 'Dịch vụ tư vấn',
            lineItems: normalizedLineItems,
            amount: subtotal,
            discount: lineDiscountAmount + Math.max(0, discountAdjustment || 0),
            finalAmount,
            pricingNote: quotationData.pricingNote,
            expirationDate: quotationData.expirationDate || undefined,
            pricelist: quotationData.pricelist || undefined,
            orderMode: normalizeQuotationReceiptType(quotationData.orderMode),
            createdAt: existing?.createdAt || now,
            updatedAt: now,
            status,
            contractStatus: status === QuotationStatus.SALE_ORDER
                ? 'sale_confirmed'
                : (existing?.contractStatus || 'quotation'),
            schedule: quotationData.schedule || undefined,
            classCode: quotationData.classCode || undefined,
            studentPhone: lead.phone || '',
            studentEmail: lead.email || '',
            studentDob: normalizedLineItems[0]?.studentDob || lead.dob || '',
            studentAddress: lead.address || '',
            identityCard: lead.identityCard || '',
            guardianName: lead.guardianName || '',
            guardianPhone: lead.guardianPhone || '',
            paymentMethod: mappedPayment,
            // Bill/chứng từ chỉ nhập tại màn Ghi danh (QuotationDetails), không lấy từ Pipeline.
            paymentProof: existing?.paymentProof,
            paymentDocuments: existing?.paymentDocuments,
            needInvoice: quotationData.needInvoice,
            logNotes,
            createdBy: quotationData.salespersonName || user?.name || 'System',
            salespersonName: quotationData.salespersonName || user?.name || 'System'
        };

        if (existing) {
            updateQuotation(payload);
        } else {
            addQuotation(payload);
            setActiveQuotationId(payload.id);
        }
        return payload;
    };

    const handleSaveQuotationDraft = () => {
        upsertQuotation(QuotationStatus.DRAFT, 'Lưu báo giá nháp', `Hạn: ${quotationData.expirationDate || 'N/A'}`);
        setQuotationWorkflowStatus('draft');
        showToast("Đã lưu báo giá nháp.", 'success');
    };

    const handleCreateQuotation = () => {
        const savedQuotation = upsertQuotation(
            QuotationStatus.DRAFT,
            'Tạo báo giá',
            `Hạn: ${quotationData.expirationDate || 'N/A'}`
        );
        const statusLog: any = {
            id: `act-${Date.now()}`,
            type: 'system',
            timestamp: new Date().toISOString(),
            description: `Đã tạo báo giá ${savedQuotation.soCode}.`,
            user: user?.name || 'Admin',
            title: 'Tạo báo giá'
        };

        const updatedLead = {
            ...lead,
            activities: [statusLog, ...(lead.activities || [])],
            productItems: leadProductItems,
            discount: totalDiscountAmount,
            paymentRoadmap: quotationData.internalNote || lead.paymentRoadmap
        };

        setLead(updatedLead);
        onUpdate(updatedLead);
        setQuotationWorkflowStatus('draft');
        setShowOrderLineModal(false);
        setShowQuotationCreator(false);
        showToast(`Đã tạo báo giá thành công (${savedQuotation.soCode})!`, 'success');
    };

    const handleConfirmQuotation = () => {
        const savedQuotation = upsertQuotation(
            QuotationStatus.SALE_ORDER,
            'Confirm Sale',
            'Đã xác nhận đơn bán hàng.'
        );
        setQuotationWorkflowStatus('sale_order');
        showToast(`Đã xác nhận ${savedQuotation.soCode} thành Sale Order.`, 'success');
    };

    const handleCancelQuotation = () => {
        const savedQuotation = upsertQuotation(
            QuotationStatus.DRAFT,
            'Hủy báo giá',
            'Sale hủy thao tác gửi/confirm từ popup pipeline.'
        );
        setQuotationWorkflowStatus('cancelled');
        showToast(`Đã hủy thao tác báo giá (${savedQuotation.soCode}).`, 'info');
    };

    const handlePrintQuotation = () => {
        const savedQuotation = upsertQuotation(
            quotationWorkflowStatus === 'sale_order' ? QuotationStatus.SALE_ORDER : QuotationStatus.DRAFT,
            'In báo giá',
            'In nhanh từ popup pipeline'
        );
        showToast(`Đang mở bản in cho ${savedQuotation.soCode}.`, 'info');
        window.print();
    };

    const creatorTeachers = useMemo(
        () => getTeachers().filter((teacher) => teacher.status === 'ACTIVE'),
        [showQuotationCreator]
    );

    const creatorClasses = useMemo(() => {
        const merged = [...getTrainingClasses(), ...CREATOR_CLASS_FALLBACKS];
        const deduped = new Map<string, ITrainingClass>();
        merged.forEach((item) => deduped.set(item.id, item));
        return Array.from(deduped.values());
    }, [showQuotationCreator]);

    const availableServicePackages = useMemo(() => {
        if (!orderLineDraft.targetMarket) return [];
        return Array.from(
            new Set(
                ORDER_LINE_CATALOG.filter((item) => item.market === orderLineDraft.targetMarket).map((item) => item.servicePackage)
            )
        );
    }, [orderLineDraft.targetMarket]);

    const availableProducts = useMemo(() => {
        if (!orderLineDraft.targetMarket || !orderLineDraft.servicePackage) return [];
        return ORDER_LINE_CATALOG.filter(
            (item) => item.market === orderLineDraft.targetMarket && item.servicePackage === orderLineDraft.servicePackage
        );
    }, [orderLineDraft.servicePackage, orderLineDraft.targetMarket]);

    const availableProgramOptions = useMemo(() => {
        return Array.from(new Set(availableProducts.flatMap((item) => item.programOptions)));
    }, [availableProducts]);

    const availableClassOptions = useMemo(() => {
        if (!orderLineDraft.targetMarket) return creatorClasses;
        return creatorClasses.filter((item) => {
            if (String(item.status).toUpperCase() !== 'ACTIVE') return false;
            const language = (item.language || '').toLowerCase();
            const classTokens = [item.name, item.code, item.level].join(' ').toLowerCase();
            const matchLanguage =
                orderLineDraft.targetMarket === 'Đức'
                    ? language.includes('đức') || language.includes('german')
                    : language.includes('trung') || language.includes('chinese');

            if (!matchLanguage) return false;
            if (orderLineDraft.programs.length === 0) return true;
            return orderLineDraft.programs.some((program) => classTokens.includes(program.toLowerCase()));
        });
    }, [creatorClasses, orderLineDraft.programs, orderLineDraft.targetMarket]);

    const resolvedOrderPaymentPlan = useMemo(
        () => resolveServicePaymentPlan(orderLineDraft.targetMarket, orderLineDraft.servicePackage, orderLineDraft.unitPrice),
        [orderLineDraft.servicePackage, orderLineDraft.targetMarket, orderLineDraft.unitPrice]
    );

    const openNewOrderLineModal = () => {
        setEditingOrderLineId(null);
        setProgramDropdownOpen(false);
        setOrderLineDraft(createOrderDraft(lead));
        setShowOrderLineModal(true);
    };

    const openEditOrderLineModal = (lineId: string) => {
        const foundLine = quotationLineItems.find((item) => item.id === lineId);
        if (!foundLine) return;
        setEditingOrderLineId(lineId);
        setProgramDropdownOpen(false);
        setOrderLineDraft(createOrderDraft(lead, undefined, foundLine));
        setShowOrderLineModal(true);
    };

    const closeOrderLineModal = () => {
        setProgramDropdownOpen(false);
        setShowOrderLineModal(false);
        setEditingOrderLineId(null);
        setOrderLineDraft(createOrderDraft(lead));
    };

    const handleOrderDraftMarketChange = (market: CreatorMarket | '') => {
        setProgramDropdownOpen(false);
        setOrderLineDraft((prev) => ({
            ...prev,
            targetMarket: market,
            servicePackage: '',
            productId: undefined,
            productName: '',
            courseName: '',
            programs: [],
            classId: '',
            unitPrice: 0
        }));
    };

    const handleOrderDraftServiceChange = (servicePackage: CreatorServicePackage | '') => {
        setProgramDropdownOpen(false);
        const catalog = getPrimaryCatalogByServicePackage(orderLineDraft.targetMarket, servicePackage);
        setOrderLineDraft((prev) => ({
            ...prev,
            servicePackage,
            productId: catalog?.id,
            productName: catalog?.product || servicePackage,
            courseName: '',
            programs: [],
            classId: '',
            unitPrice: catalog?.defaultPrice || 0
        }));
        if (catalog?.serviceType) {
            setQuotationData((prev) => ({ ...prev, serviceType: catalog.serviceType }));
        }
    };

    const handleOrderDraftProgramToggle = (program: string) => {
        setOrderLineDraft((prev) => ({
            ...prev,
            programs: prev.programs.includes(program)
                ? prev.programs.filter((item) => item !== program)
                : [...prev.programs, program],
            classId: ''
        }));
    };

    const handleRemoveOrderLine = () => {
        if (editingOrderLineId) {
            setQuotationLineItems((prev) => prev.filter((item) => item.id !== editingOrderLineId));
        }
        closeOrderLineModal();
    };

    const handleSaveOrderLine = (mode: 'close' | 'new') => {
        if (!orderLineDraft.studentName || !orderLineDraft.targetMarket || !orderLineDraft.servicePackage) {
            showToast('Vui lòng điền đủ tên học sinh, thị trường mục tiêu và gói dịch vụ.', 'error');
            return;
        }

        const selectedClass = [...getTrainingClasses(), ...CREATOR_CLASS_FALLBACKS].find((item) => item.id === orderLineDraft.classId);
        const total = calculateOrderLineTotal(orderLineDraft.unitPrice, 1, orderLineDraft.discountPercent);
        const paymentPlan = resolveServicePaymentPlan(orderLineDraft.targetMarket, orderLineDraft.servicePackage, orderLineDraft.unitPrice);
        const pricingNote = formatServicePaymentPlanNote(paymentPlan);

        const nextLine: IQuotationLineItem = {
            id: editingOrderLineId || orderLineDraft.id,
            productId: orderLineDraft.productId,
            name: orderLineDraft.productName || orderLineDraft.servicePackage,
            quantity: 1,
            unitPrice: orderLineDraft.unitPrice,
            discount: orderLineDraft.discountPercent,
            total,
            studentName: orderLineDraft.studentName,
            studentDob: fromInputDate(orderLineDraft.studentDob, lead.dob),
            targetMarket: orderLineDraft.targetMarket || undefined,
            servicePackage: orderLineDraft.servicePackage || undefined,
            programs: orderLineDraft.programs,
            classId: orderLineDraft.classId || undefined,
            className: selectedClass?.name,
            additionalInfo: orderLineDraft.additionalInfo || undefined
        };

        setQuotationLineItems((prev) =>
            editingOrderLineId
                ? prev.map((item) => (item.id === editingOrderLineId ? nextLine : item))
                : [...prev, nextLine]
        );
        if (pricingNote) {
            setQuotationData((prev) => ({ ...prev, pricingNote }));
        }

        if (mode === 'new') {
            setEditingOrderLineId(null);
            setProgramDropdownOpen(false);
            setOrderLineDraft(createOrderDraft(lead, {
                studentName: orderLineDraft.studentName,
                studentDob: orderLineDraft.studentDob,
                targetMarket: orderLineDraft.targetMarket
            }));
            return;
        }

        closeOrderLineModal();
    };

    // Log Grouping Logic
    const groupedLogs = useMemo(() => {
        const groups: Record<string, any[]> = {};
        const logs = (lead.activities || []).filter((log: any) =>
            logAudienceFilter === 'ALL' ? true : logAudienceFilter === 'SYSTEM' ? log.type === 'system' : log.type !== 'system'
        );
        const sortedLogs = [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        sortedLogs.forEach(log => {
            const dateStr = new Date(log.timestamp).toLocaleDateString('vi-VN');
            if (!groups[dateStr]) groups[dateStr] = [];
            groups[dateStr].push(log);
        });
        return groups;
    }, [lead.activities, logAudienceFilter]);

    const formatMetaDateTime = (value?: string) => {
        if (!value) return '-';
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? '-' : parsed.toLocaleString('vi-VN');
    };


    return (
        <div className="fixed inset-0 z-50 flex justify-end font-inter">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="relative w-full h-full bg-slate-100 flex flex-col animate-in slide-in-from-right duration-300 shadow-2xl">

                {/* TOAST NOTIFICATION */}
                {toast && toast.visible && (
                    <div className={`absolute top-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl animate-in slide-in-from-top-5 fade-in duration-300 ${toast.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
                        toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
                            'bg-slate-800 text-white'
                        }`}>
                        {toast.type === 'error' && <AlertTriangle size={18} />}
                        {toast.type === 'success' && <CheckCircle2 size={18} />}
                        <span className="text-sm font-bold">{toast.message}</span>
                    </div>
                )}

                {/* HEADER TOOLBAR */}
                <div className="bg-white border-b border-slate-300 flex flex-col z-20">
                    {/* Auto-save status */}
                    <div className={`absolute top-12 left-1/2 -translate-x-1/2 px-3 py-1 bg-slate-800 text-white text-[10px] font-bold rounded-full shadow-lg transition-all z-[100] flex items-center gap-1.5 ${isSaving ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
                        <Monitor size={10} className="animate-pulse" /> ĐÃ LƯU HỆ THỐNG
                    </div>

                    {/* Status Bar Indicator */}
                    <div className="h-10 px-6 flex items-center bg-slate-50 border-b border-slate-200 overflow-x-auto no-scrollbar">
                        {[LEAD_STATUS_KEYS.NEW, LEAD_STATUS_KEYS.ASSIGNED, LEAD_STATUS_KEYS.PICKED, LEAD_STATUS_KEYS.CONTACTED, LEAD_STATUS_KEYS.CONVERTED].map((st, idx, arr) => {
                            const currentIndex = arr.findIndex((status) => status === normalizedLeadStatus);
                            const isCurrent = normalizedLeadStatus === st;
                            const isPast = currentIndex >= idx;
                            return (
                                <React.Fragment key={st}>
                                    <div className={`flex items-center gap-2 whitespace-nowrap ${isCurrent ? 'opacity-100' : 'opacity-60'}`}>
                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${isPast ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                            {isPast ? <CheckCircle2 size={12} /> : idx + 1}
                                        </div>
                                        <span className={`text-[11px] font-bold uppercase tracking-tight ${isCurrent ? 'text-blue-700' : isPast ? 'text-slate-700' : 'text-slate-400'}`}>
                                            {getLeadStatusLabel(st)}
                                        </span>
                                    </div>
                                    {idx < arr.length - 1 && <ChevronRight size={14} className="mx-2 text-slate-300 flex-shrink-0" />}
                                </React.Fragment>
                            );
                        })}
                    </div>

                    <div className="h-14 flex items-center justify-between px-6 shadow-sm">
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                            <span className="font-semibold cursor-pointer">Leads</span>
                            <span className="text-slate-300">/</span>
                            <span className="text-slate-800 font-bold">{lead.name}</span>
                            {isWon && <span className="ml-2 bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded border border-green-200 uppercase">Đã chốt hợp đồng</span>}
                            {isLost && <span className="ml-2 bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded border border-red-200 uppercase">Đã mất</span>}
                        </div>

                        <div className="flex items-center gap-2">
                            {/* 1. PICK UP BUTTON - Prominent if not yet picked up */}
                            {(isLeadStatusOneOf(String(lead.status || ''), [LEAD_STATUS_KEYS.NEW, LEAD_STATUS_KEYS.ASSIGNED]) && !lead.pickUpDate) && user?.role !== UserRole.MARKETING && (
                                <button
                                    onClick={handlePickUpAction}
                                    className="px-6 py-2 text-sm font-black text-white bg-blue-600 border border-blue-700 rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-lg shadow-blue-200 transition-all animate-pulse"
                                >
                                    <Handshake size={20} /> TIẾP NHẬN LEAD NGAY
                                </button>
                            )}

                            {/* OTHER ACTIONS - ONLY IF PICKED UP OR ADVANCED STATUS */}
                            {(lead.pickUpDate || !isLeadStatusOneOf(String(lead.status || ''), [LEAD_STATUS_KEYS.NEW, LEAD_STATUS_KEYS.ASSIGNED])) && (
                                <div className="flex items-center gap-2 bg-blue-50/50 p-1 rounded-lg border border-blue-100/50 mr-2">
                                    {/* 0. CALL BUTTON - Light Blue Theme */}
                                    <button
                                        onClick={handleCallAction}
                                        className="px-3 py-1.5 text-blue-700 bg-white border border-blue-200 rounded hover:bg-blue-50 flex flex-col items-start shadow-sm transition-all active:scale-95"
                                    >
                                        <span className="text-[9px] font-bold uppercase tracking-wide text-blue-400 leading-none">
                                            {callCount} call
                                        </span>
                                        <span className="mt-1 flex items-center gap-2 text-[11px] font-black leading-none">
                                            <Phone size={13} className="fill-blue-100" /> GỌI ĐIỆN
                                        </span>
                                    </button>

                                    {!isWon && !isContract && !isLost && (
                                        <button
                                            onClick={handleCreateQuote}
                                            className="px-4 py-1.5 text-[11px] font-black text-indigo-700 bg-white border border-indigo-200 rounded hover:bg-indigo-50 flex items-center gap-2 shadow-sm transition-all active:scale-95"
                                        >
                                            <FileText size={13} /> TẠO BÁO GIÁ
                                        </button>
                                    )}

                                    {/* 2. ASSIGN BUTTON - Matching Style */}
                                    {!isWon && !isContract && !isLost && user?.role !== UserRole.MARKETING && (
                                        <button
                                            onClick={() => setShowAssignModal(true)}
                                            className="px-4 py-1.5 text-[11px] font-bold text-slate-600 bg-white border border-slate-200 rounded hover:bg-slate-50 flex items-center gap-2 shadow-sm transition-all active:scale-95"
                                        >
                                            <Users size={13} /> PHÂN BỔ
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* PRIMARY ACTIONS - ONLY IF PICKED UP */}
                            {(lead.pickUpDate || !isLeadStatusOneOf(String(lead.status || ''), [LEAD_STATUS_KEYS.NEW, LEAD_STATUS_KEYS.ASSIGNED])) && (
                                <>
                                    {/* 3. CONVERT BUTTON */}
                                    {typeof onConvert === 'function' && !isWon && !isContract && !isLost && !isConverted && !isPipeline && user?.role !== UserRole.MARKETING && (
                                        <button onClick={handleConvertAction} className="px-3 py-1.5 text-xs font-bold text-blue-600 border border-blue-600 rounded hover:bg-blue-50 flex items-center gap-1 transition-all">
                                            <ArrowUpRight size={14} /> CHUYỂN ĐỔI
                                        </button>
                                    )}

                                    {/* 4. WON BUTTON */}
                                    {!isWon && !isContract && !isLost && user?.role !== UserRole.MARKETING && (
                                        <button onClick={handleWonAction} className="px-4 py-1.5 text-xs font-bold text-white bg-green-600 border border-green-600 rounded hover:bg-green-700 flex items-center gap-1 shadow-md shadow-green-100 transition-all active:scale-95">
                                            <Trophy size={14} /> CHỐT WON
                                        </button>
                                    )}

                                    {/* 5. LOSS BUTTON */}
                                    {!isContract && !isLost && user?.role !== UserRole.MARKETING && (
                                        <button onClick={() => setShowLossModal(true)} className="px-3 py-1.5 text-xs font-bold text-red-600 border border-red-200 rounded hover:bg-red-50 flex items-center gap-1">
                                            <Ban size={14} /> MẤT
                                        </button>
                                    )}

                                    {/* 6. UNQUALIFIED BUTTON */}
                                    {!isWon && !isContract && !isLost && normalizedLeadStatus !== LEAD_STATUS_KEYS.UNVERIFIED && user?.role !== UserRole.MARKETING && (
                                        <button onClick={handleDisqualifiedAction} className="px-3 py-1.5 text-xs font-bold text-slate-400 border border-slate-200 rounded hover:bg-slate-50 flex items-center gap-1">
                                            <XOctagon size={14} /> KHÔNG XÁC THỰC
                                        </button>
                                    )}
                                </>
                            )}

                            <div className="h-6 w-px bg-slate-200 mx-1"></div>
                            <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors p-2"><X size={20} /></button>
                        </div>
                    </div>
                </div>

                {/* WORKSPACE */}
                <div className="flex-1 flex overflow-hidden">

                    {/* --- LEFT: MASTER FORM (2/3) --- */}
                    <div className="w-[66%] h-full overflow-y-auto bg-white border-r border-slate-200 p-8 shadow-[inset_-10px_0_15px_-10px_rgba(0,0,0,0.05)] custom-scrollbar relative">

                        <LeadDrawerProfileForm
                            leadFormData={leadFormData}
                            leadFormActiveTab={leadFormActiveTab}
                            closeReasonOptions={isClosedLeadFormStatus(leadFormData.status) ? leadFormCloseReasonOptions : []}
                            salesOptions={leadSalesOptions}
                            availableTags={allAvailableTags}
                            fixedTags={FIXED_LEAD_TAGS}
                            isAddingTag={isAddingTag}
                            customCloseReason={CUSTOM_CLOSE_REASON}
                            onPatch={patchLeadFormData}
                            onTabChange={setLeadFormActiveTab}
                            onStatusChange={(status) => patchLeadFormData({
                                status,
                                ...getCloseReasonStateForStatusChange(status, leadFormData.lossReason, leadFormData.lossReasonCustom)
                            })}
                            onStartAddingTag={() => setIsAddingTag(true)}
                            onStopAddingTag={() => setIsAddingTag(false)}
                            onAddTag={addTagToLeadForm}
                            onCreateTag={(tag) => {
                                addTagCatalogEntry(tag);
                                addTagToLeadForm(tag);
                            }}
                            onRemoveSelectedTag={(tag) => setLeadFormData((prev) => ({ ...prev, tags: prev.tags.filter((item) => item !== tag) }))}
                            onDeleteTag={deleteTagCatalogEntry}
                        />

                        {/* ACTION BUTTON */}
                        <div className="sticky bottom-0 bg-white pt-4 pb-2 border-t border-slate-100 flex justify-between gap-3 shadow-[0_-5px_15px_rgba(0,0,0,0.05)] z-20">
                            {isContract ? (
                                <div className="w-full flex justify-between items-center bg-green-50 px-4 py-2 rounded-lg border border-green-200">
                                    <span className="text-green-800 text-sm font-bold flex items-center gap-2"><Lock size={18} /> Hợp đồng đã ký (Closed).</span>
                                    <button
                                        onClick={() => showToast("Hợp đồng PDF đã được lưu trữ.", 'info')}
                                        className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold shadow-md hover:bg-green-700 active:scale-95 transition-all text-sm flex items-center gap-2"
                                    >
                                        <FileSignature size={16} /> XEM HỢP ĐỒNG
                                    </button>
                                </div>
                            ) : (
                                <div className="w-full flex items-center justify-between gap-3">
                                    <span className="flex items-center text-xs italic text-slate-400">
                                        Cập nhật đầy đủ thông tin lead.
                                    </span>
                                    <button
                                        onClick={handleLeadFormSubmit}
                                        className="flex items-center gap-2 rounded-lg bg-slate-800 px-6 py-2 text-sm font-bold text-white shadow-md transition-all hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <CheckCircle2 size={18} /> LƯU THÔNG TIN
                                    </button>
                                </div>
                            )}
                        </div>

                    </div>

                    {/* --- RIGHT: CHATTER (1/3) --- */}
                    <div className="w-[34%] bg-[#F9FAFB] flex flex-col h-full border-l border-slate-200">
                        {/* TABS */}
                        <div className="px-4 py-3 border-b border-slate-200 bg-white flex sticky top-0 z-10 gap-2">
                            <button onClick={() => setChatterTab('note')} className={`flex-1 py-1.5 text-xs font-bold rounded border ${chatterTab === 'note' ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-white border-slate-300 text-slate-600'}`}>Log Note</button>
                            <button onClick={handleOpenMeetingScheduler} className={`flex-1 py-1.5 text-xs font-bold rounded border ${chatterTab === 'meeting' ? 'bg-blue-600 text-white border-blue-700' : 'bg-white border-slate-300 text-slate-600'}`}>Lịch hẹn / Test</button>
                            <button onClick={() => setChatterTab('message')} className={`flex-1 py-1.5 text-xs font-bold rounded border ${chatterTab === 'message' ? 'bg-blue-100 text-blue-900 border-blue-300' : 'bg-white border-slate-300 text-slate-600'}`}>Gửi Tin</button>
                            <button onClick={() => setChatterTab('activity')} className={`flex-1 py-1.5 text-xs font-bold rounded border ${chatterTab === 'activity' ? 'bg-purple-100 text-purple-900 border-purple-300' : 'bg-white border-slate-300 text-slate-600'}`}>Lên Lịch</button>
                        </div>

                        {/* FOLLOWERS BAR */}
                        <div className="px-4 py-2 border-b border-slate-100 bg-white flex justify-between items-center shadow-sm z-0">
                            <div className="flex items-center gap-2 text-slate-500">
                                <Users size={14} />
                                <span className="text-xs font-bold">{followers.length} Followers</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="flex -space-x-2 mr-2">
                                    {followers?.map((f, idx) => (
                                        <div key={idx} className="w-6 h-6 rounded-full bg-blue-100 border border-white flex items-center justify-center text-[10px] font-bold text-blue-800" title={f.name}>
                                            {f.avatar || f.name?.charAt(0)}
                                        </div>
                                    ))}
                                </div>
                                {chatterTab === 'meeting' && (
                                    <button onClick={() => setShowFollowersModal(true)} className="text-xs text-blue-600 font-bold hover:bg-blue-50 px-2 py-1 rounded flex items-center gap-1">
                                        <Plus size={12} /> Add
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* INPUT AREA */}
                        <div className="p-4 border-b border-slate-200 bg-white">
                            {chatterTab === 'activity' ? (
                                <div className="space-y-3">
                                    <div>
                                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Hành động</label>
                                        <select
                                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-purple-500"
                                            value={activityType}
                                            onChange={(e) => setActivityType(e.target.value)}
                                        >
                                            {ACTIVITY_TYPES.map((typeOption) => (
                                                <option key={typeOption.id} value={typeOption.id}>{typeOption.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Nội dung</label>
                                        <textarea
                                            className="h-20 w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-purple-500"
                                            placeholder="Nhập nội dung lịch chăm sóc..."
                                            value={activitySummary}
                                            onChange={e => setActivitySummary(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Ngày giờ</label>
                                        <input
                                            type="datetime-local"
                                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold outline-none focus:border-purple-500"
                                            value={activityDate}
                                            onChange={e => setActivityDate(e.target.value)}
                                        />
                                    </div>
                                    <button
                                        onClick={handleScheduleActivity}
                                        className="w-full rounded bg-purple-600 py-2 text-xs font-bold text-white shadow-md transition-colors hover:bg-purple-700"
                                    >
                                        Lưu lịch chăm sóc
                                    </button>
                                </div>
                            ) : chatterTab === 'meeting' ? (
                                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-3 text-xs leading-5 text-slate-600">
                                        Lịch hẹn / test dùng form riêng để chọn hình thức hẹn, cơ sở và giáo viên test.
                                    </div>
                                    <button
                                        onClick={() => setIsCreateMeetingModalOpen(true)}
                                        className="flex w-full items-center justify-center gap-2 rounded bg-blue-600 py-2 text-xs font-bold text-white shadow-md transition-colors hover:bg-blue-700"
                                    >
                                        <Calendar size={14} /> Mở form lịch hẹn / test
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <textarea
                                        className={`w-full h-20 p-2 text-xs border rounded resize-none mb-2 ${chatterTab === 'note' ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}`}
                                        placeholder={chatterTab === 'note' ? "Ghi chú nhanh cho team..." : "Soạn tin nhắn gửi khách..."}
                                        value={noteContent}
                                        onChange={e => setNoteContent(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendLog(); } }}
                                    ></textarea>
                                    <div className="flex justify-between items-center">
                                        <div className="ml-auto">
                                            <button
                                                onClick={handleSendLog}
                                                className={`px-4 py-1.5 rounded text-xs font-bold shadow-md transition-colors ${chatterTab === 'note' ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                                            >
                                                Gửi / Lưu
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* TIMELINE */}
                        <div className="flex-1 overflow-auto p-4 custom-scrollbar space-y-6">
                            <div className="flex justify-end">
                                <LogAudienceFilterControl value={logAudienceFilter} onChange={setLogAudienceFilter} />
                            </div>
                            {Object.keys(groupedLogs).length === 0 ? (
                                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                                    Chưa có log note phù hợp bộ lọc.
                                </div>
                            ) : Object.entries(groupedLogs).map(([date, logs]) => (
                                <div key={date}>
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="h-px bg-slate-200 flex-1"></div>
                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-full border border-slate-200 whitespace-nowrap">{date}</span>
                                        <div className="h-px bg-slate-200 flex-1"></div>
                                    </div>

                                    <div className="space-y-4">
                                        {logs.map((log: any) => (
                                            <div key={log.id} className="relative pl-6 pb-2 border-l border-slate-200 last:border-0 ml-2 group">
                                                <div className={`absolute -left-[17px] top-0 w-8 h-8 rounded-full border-2 flex items-center justify-center bg-white text-[10px] font-bold z-10 ${log.type === 'system' ? 'border-slate-200 text-slate-400' : 'border-blue-200 text-blue-600'}`}>
                                                    {log.user === 'Hệ thống' || log.user === 'Admin' ? 'SYS' : (log.user || 'U').charAt(0)}
                                                </div>

                                                <div className="flex justify-between items-start">
                                                    <span className="font-bold text-xs text-slate-800">{log.user || 'System'}</span>
                                                    <span className="text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>

                                                <div className={`mt-1 text-sm p-3 rounded-lg border text-xs shadow-sm ${log.type === 'system' ? 'bg-slate-50 border-transparent text-slate-500 italic p-1 pl-2 shadow-none' :
                                                    log.type === 'note' ? 'bg-[#fffbeb] border-amber-100 text-slate-800' :
                                                        log.type === 'activity' ? 'bg-purple-50 border-purple-100 text-purple-900' :
                                                            'bg-white border-blue-100 text-slate-800'
                                                    }`}>
                                                    {log.type === 'note' && <span className="text-[9px] font-extrabold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded mr-2 uppercase tracking-wide">Log Note</span>}
                                                    {log.type === 'activity' && <span className="text-[9px] font-extrabold text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded mr-2 uppercase tracking-wide">Lịch</span>}
                                                    {log.type === 'message' && <span className="text-[9px] font-extrabold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded mr-2 uppercase tracking-wide">Tin Nhắn</span>}

                                                    {log.description}
                                                    {log.type === 'activity' && log.status === 'scheduled' && (
                                                        <div className="mt-2">
                                                            <button
                                                                onClick={() => {
                                                                    setCompletingActivityId(log.id);
                                                                    setCompletionNote('');
                                                                }}
                                                                className="text-[10px] font-bold text-purple-700 bg-white border border-purple-200 px-2 py-1 rounded hover:bg-purple-50"
                                                            >
                                                                Hoàn thành
                                                            </button>
                                                        </div>
                                                    )}
                                                    {log.type === 'activity' && log.status === 'completed' && (
                                                        <div className="mt-2 text-[10px] font-bold text-green-700">Đã hoàn thành</div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                    </div>
                </div>

                {/* NEXT ACTIVITY MODAL */}
                {
                    showNextActivityModal && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
                            <div className="bg-white p-6 rounded-lg shadow-2xl w-[420px] animate-in zoom-in-95">
                                <h3 className="text-lg font-bold text-slate-900 mb-2">Tạo hoạt động tiếp theo</h3>
                                <p className="text-sm text-slate-600 mb-4">Hãy tạo hoạt động tiếp theo để tiếp tục chăm sóc.</p>

                                <div className="mb-3">
                                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Hành động</label>
                                    <select
                                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-purple-500"
                                        value={nextActivityType}
                                        onChange={e => setNextActivityType(e.target.value)}
                                    >
                                        {ACTIVITY_TYPES.map((typeOption) => (
                                            <option key={typeOption.id} value={typeOption.id}>{typeOption.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="mb-3">
                                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Nội dung</label>
                                    <textarea
                                        className="h-20 w-full resize-none rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-purple-500"
                                        placeholder="Nhập nội dung lịch chăm sóc..."
                                        value={nextActivitySummary}
                                        onChange={e => setNextActivitySummary(e.target.value)}
                                    />
                                </div>

                                <div className="mb-4">
                                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Ngày giờ</label>
                                    <input
                                        type="datetime-local"
                                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm font-bold outline-none focus:border-purple-500"
                                        value={nextActivityDate}
                                        onChange={e => setNextActivityDate(e.target.value)}
                                    />
                                </div>

                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={() => { setShowNextActivityModal(false); }}
                                        className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded"
                                    >
                                        Bỏ qua
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (!nextActivitySummary.trim()) {
                                                showToast('Vui lòng nhập nội dung lịch chăm sóc.', 'error');
                                                return;
                                            }
                                            if (!nextActivityDate) {
                                                showToast('Vui lòng chọn ngày giờ lịch chăm sóc.', 'error');
                                                return;
                                            }
                                            addScheduledActivity(nextActivityType, nextActivitySummary.trim(), nextActivityDate);
                                            setNextActivitySummary('');
                                            setShowNextActivityModal(false);
                                        }}
                                        className="px-4 py-2 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded"
                                    >
                                        Tạo hoạt động
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* COMPLETE ACTIVITY MODAL */}
                {
                    completingActivityId && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
                            <div className="bg-white p-6 rounded-lg shadow-2xl w-[420px] animate-in zoom-in-95">
                                <h3 className="text-lg font-bold text-slate-900 mb-2">Cập nhật kết quả</h3>
                                <p className="text-sm text-slate-600 mb-4">Nhập nội dung thực tế để lưu vào Log Note.</p>

                                <textarea
                                    className="w-full p-2 border border-slate-300 rounded text-sm mb-4 h-24"
                                    placeholder="VD: Đã gọi, khách hẹn gặp lại..."
                                    value={completionNote}
                                    onChange={e => setCompletionNote(e.target.value)}
                                ></textarea>

                                <div className="flex justify-end gap-2">
                                    <button onClick={() => setCompletingActivityId(null)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded">Hủy</button>
                                    <button onClick={completeActivity} className="px-4 py-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded">Lưu</button>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* QUOTATION CREATOR MODAL (ODOO STYLE) */}
                {showQuotationCreator && (
                    <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="bg-white border-b border-slate-200 px-6 py-2">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex h-8">
                                    <div className="flex items-center">
                                        <div className={`px-5 py-1.5 text-[10px] font-extrabold uppercase border-l border-t border-b border-slate-200 rounded-l-md ${quotationWorkflowStatus === 'draft' ? 'bg-blue-50 text-[#2b5a83]' : 'bg-white text-slate-400'}`}>Báo giá</div>
                                        <div className="relative h-full w-[16px] overflow-hidden">
                                            <div className={`absolute top-[-8px] left-[-8px] w-[32px] h-[32px] border border-slate-200 rotate-45 ${quotationWorkflowStatus === 'draft' ? 'bg-blue-50' : 'bg-white'}`}></div>
                                        </div>
                                    </div>
                                    <div className="flex items-center ml-[-12px]">
                                        <div className={`px-5 py-1.5 text-[10px] font-bold uppercase border-t border-b border-slate-200 ${quotationWorkflowStatus === 'sent' ? 'bg-blue-50 text-[#2b5a83]' : 'bg-white text-slate-400'}`}>Đã gửi báo giá</div>
                                        <div className="relative h-full w-[16px] overflow-hidden">
                                            <div className={`absolute top-[-8px] left-[-8px] w-[32px] h-[32px] border border-slate-200 rotate-45 ${quotationWorkflowStatus === 'sent' ? 'bg-blue-50' : 'bg-white'}`}></div>
                                        </div>
                                    </div>
                                    <div className="flex items-center ml-[-12px]">
                                        <div className={`px-5 py-1.5 text-[10px] font-bold uppercase border-t border-b border-r border-slate-200 rounded-r-md ${quotationWorkflowStatus === 'sale_order' ? 'bg-blue-50 text-[#2b5a83]' : 'bg-white text-slate-400'}`}>Đơn bán hàng</div>
                                    </div>
                                    {quotationWorkflowStatus === 'cancelled' && (
                                        <div className="ml-2 px-3 py-1.5 bg-red-50 text-red-600 text-[10px] font-bold uppercase border border-red-200 rounded-md">Đã hủy</div>
                                    )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button onClick={handleCreateQuotation} className="px-5 py-1.5 bg-blue-600 text-white text-xs font-bold rounded shadow-sm hover:bg-blue-700 transition-all uppercase">
                                            Tạo
                                        </button>
                                        <button onClick={() => setShowQuotationCreator(false)} className="flex h-8 w-8 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 shadow-sm hover:bg-slate-50">
                                            <X size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Content Area */}
                            <div className="flex-1 overflow-y-auto p-12 bg-white">
                                <div className="max-w-4xl mx-auto">
                                    <h2 className="text-3xl font-bold text-slate-800 mb-8 tracking-tight">Mới</h2>

                                    <div className="grid grid-cols-2 gap-x-20 gap-y-5 mb-12">
                                        <div className="space-y-4">
                                            <div className="flex min-h-[32px] items-center">
                                                <label className="w-40 text-[13px] font-bold text-slate-700">Khách hàng</label>
                                                <div className="flex-1 px-3 py-1.5 bg-blue-50 border border-slate-300 rounded text-[13px] font-bold text-blue-900">
                                                    {lead.name}
                                                </div>
                                            </div>
                                            <div className="flex min-h-[32px] items-center">
                                                <label className="w-40 text-[13px] font-bold text-slate-700">Sale phụ trách</label>
                                                <select
                                                    className="flex-1 px-3 py-1.5 bg-blue-50 border border-slate-300 rounded text-[13px] outline-none transition-colors focus:border-blue-500"
                                                    value={quotationData.salespersonName || user?.name || ''}
                                                    onChange={e => setQuotationData({ ...quotationData, salespersonName: e.target.value })}
                                                >
                                                    {quotationSalesOptions.map((option) => (
                                                        <option key={option.id} value={option.name}>{option.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex min-h-[32px] items-center">
                                                <label className="w-[148px] text-[13px] font-bold text-slate-700">Ngày hết hạn</label>
                                                <div className="flex-1">
                                                    <input
                                                        type="date"
                                                        className="w-full px-3 py-1.5 border border-slate-300 rounded text-[13px] outline-none focus:border-blue-500 transition-colors bg-white"
                                                        value={quotationData.expirationDate}
                                                        onChange={e => setQuotationData({ ...quotationData, expirationDate: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tabs */}
                                    <div className="flex gap-8 border-b border-slate-200 mb-6 px-2">
                                        <button onClick={() => setQuotationCreatorTab('order_lines')} className={`pb-3 text-[11px] font-extrabold uppercase tracking-wider ${quotationCreatorTab === 'order_lines' ? 'text-blue-700 border-b-2 border-blue-700' : 'text-slate-400 hover:text-slate-600 transition-colors'}`}>Chi tiết đơn hàng</button>
                                        <button onClick={() => setQuotationCreatorTab('other_info')} className={`pb-3 text-[11px] font-extrabold uppercase tracking-wider ${quotationCreatorTab === 'other_info' ? 'text-blue-700 border-b-2 border-blue-700' : 'text-slate-400 hover:text-slate-600 transition-colors'}`}>Thông tin khác</button>
                                    </div>

                                    {/* Order Lines Table */}
                                    {quotationCreatorTab === 'order_lines' && (
                                        <div className="overflow-x-auto">
                                            <table className="w-full table-fixed border-collapse text-left text-[12px]">
                                                <colgroup>
                                                    <col className="w-[19%]" />
                                                    <col className="w-[30%]" />
                                                    <col className="w-[15%]" />
                                                    <col className="w-[14%]" />
                                                    <col className="w-[22%]" />
                                                </colgroup>
                                                <thead className="bg-[#f8f9fa] font-bold uppercase text-slate-700">
                                                    <tr className="border-b border-slate-200">
                                                        <th className="p-3">Gói dịch vụ</th>
                                                        <th className="p-3">Chương trình</th>
                                                        <th className="p-3 text-right">Đơn giá</th>
                                                        <th className="p-3 text-center">Giảm giá (%)</th>
                                                        <th className="p-3 text-right">Thành tiền</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {quotationLineItems.map((item) => (
                                                        <tr
                                                            key={item.id}
                                                            className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50"
                                                            onClick={() => openEditOrderLineModal(item.id)}
                                                        >
                                                            <td className="align-top p-3 text-slate-700">{item.servicePackage || '-'}</td>
                                                            <td className="align-top p-3 text-slate-500">
                                                                <div className="text-[11px] leading-5">
                                                                    <div className="font-semibold text-slate-700">
                                                                        {item.programs?.length ? item.programs.join(', ') : item.courseName || '-'}
                                                                    </div>
                                                                    {item.courseName && item.programs?.length ? (
                                                                        <div>
                                                                            <span className="font-semibold text-slate-500">Khóa học:</span> {item.courseName}
                                                                        </div>
                                                                    ) : null}
                                                                    {item.testerName ? (
                                                                        <div>
                                                                            <span className="font-semibold text-slate-500">Tester:</span> {item.testerName}
                                                                        </div>
                                                                    ) : null}
                                                                    {item.className ? (
                                                                        <div>
                                                                            <span className="font-semibold text-slate-500">Lớp:</span> {item.className}
                                                                        </div>
                                                                    ) : null}
                                                                    {item.additionalInfo ? (
                                                                        <div>
                                                                            <span className="font-semibold text-slate-500">Thông tin thêm:</span> {item.additionalInfo}
                                                                        </div>
                                                                    ) : null}
                                                                    {!item.courseName && !item.programs?.length && !item.testerName && !item.className && !item.additionalInfo && (
                                                                        <div className="italic text-slate-400">Không có thông tin thêm</div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="align-top p-3 text-right text-slate-700">{(item.unitPrice || 0).toLocaleString('vi-VN')}</td>
                                                            <td className="align-top p-3 text-center text-slate-700">{item.discount || 0}</td>
                                                            <td className="align-top p-3 text-right font-bold text-slate-900">{getResolvedLineItemTotal(item).toLocaleString('vi-VN')}</td>
                                                        </tr>
                                                    ))}
                                                    <tr className="bg-slate-50/30">
                                                        <td colSpan={5} className="p-3">
                                                            <button onClick={openNewOrderLineModal} className="flex items-center gap-1 font-bold text-blue-600 transition-all hover:underline">
                                                                <Plus size={14} /> Thêm một dòng
                                                            </button>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {quotationCreatorTab === 'other_info' && (
                                        <div className="grid grid-cols-2 gap-3 border border-slate-200 rounded-lg p-4 bg-slate-50">
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Loại dịch vụ</label>
                                                <select
                                                    value={quotationData.serviceType}
                                                    onChange={e => setQuotationData({ ...quotationData, serviceType: e.target.value as 'StudyAbroad' | 'Training' | 'Combo' })}
                                                    className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded text-[13px] bg-white"
                                                >
                                                    <option value="Training">Đào tạo</option>
                                                    <option value="StudyAbroad">Du học</option>
                                                    <option value="Combo">Combo</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Mã lớp dự kiến</label>
                                                <ClassCodeLookupInput
                                                    value={quotationData.classCode}
                                                    onChange={(value) => setQuotationData({ ...quotationData, classCode: value })}
                                                    loadOptions={loadClassCodeOptions}
                                                    placeholder="VD: DE-A1-02/2026"
                                                    inputClassName="w-full h-9 rounded border border-slate-300 bg-white px-3 py-1.5 text-[13px] outline-none focus:border-blue-500"
                                                    buttonClassName="h-9 rounded border border-slate-300 bg-white px-3 text-[12px] font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Lịch học mong muốn</label>
                                                <input
                                                    value={quotationData.schedule}
                                                    onChange={e => setQuotationData({ ...quotationData, schedule: e.target.value })}
                                                    className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded text-[13px] bg-white"
                                                    placeholder="VD: T2-T4-T6, 19:00-21:00"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Ghi chú chính sách giá</label>
                                                <input
                                                    value={quotationData.pricingNote}
                                                    onChange={e => setQuotationData({ ...quotationData, pricingNote: e.target.value })}
                                                    className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded text-[13px] bg-white"
                                                    placeholder="Nêu lý do giảm giá/chính sách áp dụng..."
                                                />
                                            </div>
                                            <div className="col-span-2 grid grid-cols-[minmax(0,1fr)_auto] gap-3 items-end">
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Thông tin khác</label>
                                                    <textarea
                                                        value={quotationData.internalNote}
                                                        onChange={e => setQuotationData({ ...quotationData, internalNote: e.target.value })}
                                                        className="w-full px-3 py-2 border border-slate-300 rounded text-[13px] bg-white h-14 resize-none"
                                                        placeholder="Ghi chú nội bộ hoặc yêu cầu xử lý..."
                                                    />
                                                </div>
                                                <label className="inline-flex items-center gap-2 text-[13px] font-semibold text-slate-700 whitespace-nowrap pb-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={quotationData.needInvoice}
                                                        onChange={e => setQuotationData({ ...quotationData, needInvoice: e.target.checked })}
                                                        className="rounded border-slate-300"
                                                    />
                                                    KH cần in hóa đơn VAT
                                                </label>
                                            </div>
                                        </div>
                                    )}

                                    {/* Total Summary */}
                                    <div className="mt-16 flex justify-end">
                                        <div className="w-80 space-y-2 border-t border-slate-800 pt-4">
                                            <div className="flex justify-between text-[13px] py-1">
                                                <span className="text-slate-500 font-bold">Số tiền trước thuế:</span>
                                                <span className="font-bold text-slate-900 border-b border-slate-200 px-6">{lineItemsSubtotal.toLocaleString('vi-VN')} ₫</span>
                                            </div>
                                            {totalDiscountAmount > 0 && (
                                                <div className="flex justify-between text-[13px] py-1">
                                                    <span className="text-slate-500 font-bold">Chiết khấu:</span>
                                                    <span className="font-bold text-slate-900 border-b border-slate-200 px-6">{totalDiscountAmount.toLocaleString('vi-VN')} ₫</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between text-[13px] py-1">
                                                <span className="text-slate-500 font-bold">Thuế:</span>
                                                <span className="font-bold text-slate-900 border-b border-slate-200 px-6">0 ₫</span>
                                            </div>
                                            <div className="flex justify-between items-center py-5 border-t border-slate-200 mt-2">
                                                <span className="text-lg font-black text-slate-800 uppercase tracking-tighter">Tổng cộng:</span>
                                                <span className="text-2xl font-black text-blue-700 tracking-tight border-b-2 border-slate-800 px-6">{calculatedTotal.toLocaleString('vi-VN')} ₫</span>
                                            </div>
                                        </div>
                                    </div>

                                    {showOrderLineModal && (
                                        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/50 p-3 backdrop-blur-sm">
                                            <div className="flex max-h-[calc(100vh-1rem)] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
                                                <div className="shrink-0 flex items-center justify-between border-b border-slate-200 px-6 py-3">
                                                    <h3 className="text-lg font-bold text-slate-900">
                                                        {editingOrderLineId ? 'Cập nhật đơn hàng' : 'Thêm đơn hàng'}
                                                    </h3>
                                                    <button type="button" onClick={closeOrderLineModal} className="text-slate-400 transition-colors hover:text-slate-700">
                                                        <X size={18} />
                                                    </button>
                                                </div>

                                                <div className="min-h-0 overflow-y-auto px-6 py-4">
                                                    <div className="grid gap-4 md:grid-cols-2">
                                                    <div className="min-w-0 space-y-3">
                                                        <div>
                                                            <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Tên học sinh</label>
                                                            <input
                                                                value={orderLineDraft.studentName}
                                                                onChange={(e) => setOrderLineDraft((prev) => ({ ...prev, studentName: e.target.value }))}
                                                                className="h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500"
                                                                placeholder="Nhập tên học sinh"
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Ngày sinh</label>
                                                            <input
                                                                type="date"
                                                                value={orderLineDraft.studentDob}
                                                                onChange={(e) => setOrderLineDraft((prev) => ({ ...prev, studentDob: e.target.value }))}
                                                                className="h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500"
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Thị trường mục tiêu</label>
                                                            <select
                                                                value={orderLineDraft.targetMarket}
                                                                onChange={(e) => handleOrderDraftMarketChange(e.target.value as CreatorMarket | '')}
                                                                className="h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500"
                                                            >
                                                                <option value="">-- Chọn thị trường --</option>
                                                                {CREATOR_MARKETS.map((market) => (
                                                                    <option key={market} value={market}>{market}</option>
                                                                ))}
                                                            </select>
                                                        </div>

                                                        <div>
                                                            <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Gói dịch vụ</label>
                                                            <select
                                                                value={orderLineDraft.servicePackage}
                                                                onChange={(e) => handleOrderDraftServiceChange(e.target.value as CreatorServicePackage | '')}
                                                                className="h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500"
                                                            >
                                                                <option value="">-- Chọn gói dịch vụ --</option>
                                                                {availableServicePackages.map((servicePackage) => (
                                                                    <option key={servicePackage} value={servicePackage}>{servicePackage}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>

                                                    <div className="min-w-0 space-y-3">
                                                        <div ref={programDropdownRef} className="relative min-w-0">
                                                            <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Chương trình</label>
                                                            <button
                                                                type="button"
                                                                onClick={() => setProgramDropdownOpen((prev) => !prev)}
                                                                className="flex h-10 w-full items-center justify-between gap-3 rounded border border-slate-300 bg-white px-3 text-left text-sm outline-none transition-colors hover:border-blue-400 focus:border-blue-500"
                                                            >
                                                                <div className="min-w-0 flex flex-1 flex-nowrap items-center gap-2 overflow-hidden">
                                                                    {orderLineDraft.programs.length > 0 ? (
                                                                        orderLineDraft.programs.map((program) => (
                                                                            <span key={program} className="shrink-0 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                                                                                {program}
                                                                            </span>
                                                                        ))
                                                                    ) : (
                                                                        <span className="truncate text-sm text-slate-400">
                                                                            -- Chọn chương trình --
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${programDropdownOpen ? 'rotate-180' : ''}`} />
                                                            </button>

                                                            {programDropdownOpen && (
                                                                <div className="absolute z-30 mt-1 w-full rounded border border-slate-200 bg-white shadow-lg">
                                                                    <div className="max-h-56 overflow-auto py-1">
                                                                        {availableProgramOptions.length > 0 ? (
                                                                            availableProgramOptions.map((program) => (
                                                                                <label key={program} className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={orderLineDraft.programs.includes(program)}
                                                                                        onChange={() => handleOrderDraftProgramToggle(program)}
                                                                                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                                                    />
                                                                                    <span>{program}</span>
                                                                                </label>
                                                                            ))
                                                                        ) : (
                                                                            <div className="px-3 py-2 text-sm text-slate-400">Chưa có chương trình phù hợp</div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div>
                                                            <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Lớp</label>
                                                            <select
                                                                value={orderLineDraft.classId}
                                                                onChange={(e) => setOrderLineDraft((prev) => ({ ...prev, classId: e.target.value }))}
                                                                className="h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500"
                                                            >
                                                                <option value="">-- Chọn lớp --</option>
                                                                {availableClassOptions.map((trainingClass) => (
                                                                    <option key={trainingClass.id} value={trainingClass.id}>
                                                                        {trainingClass.name} {trainingClass.schedule ? `• ${trainingClass.schedule}` : ''}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>

                                                        <div className="space-y-3">
                                                            <div>
                                                                <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Đơn giá</label>
                                                                <input
                                                                    type="number"
                                                                    min={0}
                                                                    value={orderLineDraft.unitPrice}
                                                                    onChange={(e) => setOrderLineDraft((prev) => ({ ...prev, unitPrice: Math.max(0, Number(e.target.value) || 0) }))}
                                                                    className="h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Giảm giá (%)</label>
                                                                <input
                                                                    type="number"
                                                                    min={0}
                                                                    max={100}
                                                                    value={orderLineDraft.discountPercent}
                                                                    onChange={(e) => setOrderLineDraft((prev) => ({ ...prev, discountPercent: Math.min(100, Math.max(0, Number(e.target.value) || 0)) }))}
                                                                    className="h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="md:col-span-2">
                                                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                                            <div className="mb-2">
                                                                <div className="text-xs font-bold uppercase tracking-wide text-slate-600">Lộ trình đóng phí</div>
                                                                <div className="text-sm text-slate-500">Hiển thị theo cấu hình admin của gói dịch vụ đã chọn.</div>
                                                            </div>

                                                            {resolvedOrderPaymentPlan ? (
                                                                <div className="overflow-x-auto">
                                                                    <table className="w-full border-collapse text-left text-sm">
                                                                        <thead>
                                                                            <tr className="border-b border-slate-200 text-xs font-bold uppercase text-slate-500">
                                                                                <th className="py-2 pr-4">Đợt thu</th>
                                                                                <th className="py-2 pr-4">Điều kiện đóng</th>
                                                                                <th className="py-2 text-right">Số tiền</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {resolvedOrderPaymentPlan.steps.map((step) => (
                                                                                <tr key={step.installmentLabel} className="border-b border-slate-100 last:border-b-0">
                                                                                    <td className="py-3 pr-4 font-semibold text-slate-700">{step.installmentLabel}</td>
                                                                                    <td className="py-3 pr-4 text-slate-600">{step.condition}</td>
                                                                                    <td className="py-3 text-right font-semibold text-slate-900">{step.amount.toLocaleString('vi-VN')} đ</td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            ) : (
                                                                <div className="rounded border border-dashed border-slate-300 bg-white px-4 py-4 text-sm text-slate-500">
                                                                    Chọn thị trường và gói dịch vụ để xem lộ trình đóng phí.
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                        <div className="md:col-span-2">
                                                            <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Thông tin thêm</label>
                                                            <textarea
                                                                value={orderLineDraft.additionalInfo}
                                                                onChange={(e) => setOrderLineDraft((prev) => ({ ...prev, additionalInfo: e.target.value }))}
                                                                className="h-20 w-full resize-none rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                                                                placeholder="Nhập ghi chú hoặc yêu cầu đặc biệt..."
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="shrink-0 flex items-center justify-between border-t border-slate-200 px-6 py-3">
                                                    <div className="text-sm font-semibold text-slate-700">
                                                        Thành tiền: <span className="text-base text-blue-700">{calculateOrderLineTotal(orderLineDraft.unitPrice, 1, orderLineDraft.discountPercent).toLocaleString('vi-VN')} đ</span>
                                                    </div>

                                                    <div className="flex gap-3">
                                                        <button
                                                            type="button"
                                                            onClick={handleRemoveOrderLine}
                                                            className={`rounded px-4 py-2 text-sm font-semibold transition-colors ${
                                                                editingOrderLineId
                                                                    ? 'border border-red-200 bg-white text-red-600 hover:bg-red-50'
                                                                    : 'border border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                                                            }`}
                                                        >
                                                            Loại bỏ
                                                        </button>
                                                        <button type="button" onClick={() => handleSaveOrderLine('close')} className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700">
                                                            Lưu và đóng
                                                        </button>
                                                        <button type="button" onClick={() => handleSaveOrderLine('new')} className="rounded border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100">
                                                            Lưu và thêm
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* LOSS MODAL */}
                {
                    showLossModal && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
                            <div className="bg-white p-6 rounded-lg shadow-2xl w-96 animate-in zoom-in-95">
                                <h3 className="text-lg font-bold text-red-600 mb-4 flex items-center gap-2"><Ban /> Xác nhận chuyển lead sang Mất?</h3>
                                <p className="text-sm text-slate-600 mb-4">Vui lòng chọn lý do để hệ thống ghi nhận lead đóng:</p>

                                <select
                                    className="w-full p-2 border border-slate-300 rounded text-sm mb-4 bg-white font-bold"
                                    value={lossReason}
                                    onChange={e => setLossReason(e.target.value)}
                                >
                                    <option value="">-- Chọn lý do --</option>
                                    {lostReasonsList.map(reason => (
                                        <option key={reason} value={reason}>{reason}</option>
                                    ))}
                                </select>

                                {lossReason === 'Lý do khác' && (
                                    <textarea
                                        className="w-full p-2 border border-slate-300 rounded text-sm mb-4 h-24 animate-in slide-in-from-top-2"
                                        placeholder="Vui lòng nhập lý do cụ thể..."
                                        value={customLossReason}
                                        onChange={e => setCustomLossReason(e.target.value)}
                                    ></textarea>
                                )}

                                <div className="flex justify-end gap-2 text-sm">
                                    <button onClick={() => { setShowLossModal(false); setLossReason(''); setCustomLossReason(''); }} className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded">Hủy</button>
                                    <button onClick={handleLossAction} className="px-4 py-2 font-bold text-white bg-red-600 hover:bg-red-700 rounded shadow-lg shadow-red-200">Xác nhận MẤT</button>
                                </div>
                            </div>
                        </div>
                    )}

                {/* ASSIGN MODAL */}
                {showAssignModal && (
                    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2"><Users size={18} className="text-blue-600" /> Phân bổ Lead</h3>
                                <button onClick={() => setShowAssignModal(false)}><X size={20} className="text-slate-400 hover:text-red-500" /></button>
                            </div>
                            <div className="p-6">
                                <p className="text-sm text-slate-500 mb-6">Chọn nhân viên Sales để chuyển quyền xử lý Lead này.</p>
                                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                                    {MOCK_USERS.filter(u => u.name !== lead.ownerId).map(u => (
                                        <button
                                            key={u.id}
                                            onClick={() => handleAssignAction(u)}
                                            className="w-full flex items-center justify-between p-3 border border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 border-2 border-white overflow-hidden shadow-sm">
                                                    {u.avatar || u.name.charAt(0)}
                                                </div>
                                                <div className="text-left">
                                                    <div className="text-sm font-bold text-slate-800 group-hover:text-blue-700">{u.name}</div>
                                                    <div className="text-xs text-slate-500">{u.role}</div>
                                                </div>
                                            </div>
                                            <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-500 transition-transform group-hover:translate-x-1" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                                <button onClick={() => setShowAssignModal(false)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg">Đóng</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* FOLLOWERS MODAL */}
                {isOpen && showFollowersModal && (
                    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center animate-in fade-in">
                        <div className="bg-white p-6 rounded-lg w-80 shadow-2xl scale-in-95">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-md font-bold flex items-center gap-2"><Users size={16} /> Thêm người theo dõi</h3>
                                <button onClick={() => setShowFollowersModal(false)}><X size={16} className="text-slate-400 hover:text-black" /></button>
                            </div>
                            <div className="space-y-2">
                                {MOCK_USERS.map(u => {
                                    const isFollowing = followers?.some(f => f.id === u.id);
                                    return (
                                        <div key={u.id} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded border border-transparent hover:border-slate-100">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-600">
                                                    {u.avatar}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-slate-700">{u.name}</div>
                                                    <div className="text-xs text-slate-500">{u.role}</div>
                                                </div>
                                            </div>
                                            {isFollowing ? (
                                                <span className="text-xs text-green-600 font-bold flex items-center"><CheckCircle2 size={12} className="mr-1" /> Following</span>
                                            ) : (
                                                <button onClick={() => handleAddFollower(u)} className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">Add</button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {showConfetti && (
                    <div className="fixed inset-0 pointer-events-none z-[100] flex items-center justify-center">
                        <div className="animate-in zoom-in spin-in duration-1000">
                            <span className="text-6xl">🎉</span>
                        </div>
                    </div>
                )}

                <CreateMeetingModal
                    isOpen={isCreateMeetingModalOpen}
                    onClose={() => setIsCreateMeetingModalOpen(false)}
                    salesPersonId={user?.id || 'u2'}
                    salesPersonName={user?.name || 'Sales Rep'}
                    lockedCustomer={lockedMeetingCustomer}
                    onCreated={() => {
                        const refreshedLead = getLeadById(lead.id);
                        if (refreshedLead) {
                            setLead(refreshedLead);
                            onUpdate(refreshedLead);
                        }
                        setChatterTab('note');
                        showToast('Đã tạo lịch hẹn / test thành công.', 'success');
                    }}
                />

            </div>
        </div>
    );
};

export default UnifiedLeadDrawer;
