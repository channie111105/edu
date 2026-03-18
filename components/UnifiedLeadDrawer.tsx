import React, { useState, useEffect, useMemo } from 'react';
import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ILead, LeadStatus, UserRole, Activity, DealStage, IContract, ContractStatus, IMeeting, MeetingStatus, MeetingType, IQuotation, IQuotationLineItem, IQuotationLogNote, ITeacher, ITrainingClass, QuotationStatus } from '../types';
import { useAuth } from '../contexts/AuthContext';
import {
    X, User, Phone, Mail, MapPin, Globe, Calendar,
    Clock, CheckCircle2, AlertTriangle, Send, Paperclip,
    History, ArrowRight, ChevronDown, Building, FileText,
    DollarSign, CreditCard, MessageSquare, Bell, Star,
    MoreHorizontal, CalendarDays, Flag, CheckSquare, Plus, Trash2, Trophy,
    ShieldCheck, FileSignature, Wallet, Lock, Activity as ActivityIcon, Ban, ArrowUpRight, Users, XOctagon, Tag, Handshake, ChevronRight,
    Save, Printer, RotateCcw, Monitor
} from 'lucide-react';
import { addContract, addMeeting, addQuotation, getLeadById, getLostReasons, getQuotations, getTags, getTeachers, getTrainingClasses, saveTags, updateQuotation } from '../utils/storage';
import CreateMeetingModal from './CreateMeetingModal';
import { MeetingCustomerOption } from '../utils/meetingHelpers';
import {
    DEFAULT_QUOTATION_RECEIPT_TYPE,
    normalizeQuotationReceiptType
} from '../utils/quotationReceiptType';
import {
    formatServicePaymentPlanNote,
    resolveServicePaymentPlan
} from '../utils/servicePaymentPlans';
import ClassCodeLookupInput from './ClassCodeLookupInput';
import { buildTrainingClassLookupOptions } from '../utils/trainingClassLookup';
import LogAudienceFilterControl from './LogAudienceFilter';
import { LogAudienceFilter } from '../utils/logAudience';

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
    { id: 'meeting', label: 'Họp trực tiếp', icon: User, defaultDelayHours: 24 },
    { id: 'email', label: 'Gửi Email', icon: Mail, defaultDelayHours: 0 },
    { id: 'todo', label: 'Việc cần làm', icon: CheckSquare, defaultDelayHours: 0 },
];

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

const UnifiedLeadDrawer: React.FC<UnifiedLeadDrawerProps> = ({ lead: initialLead, isOpen, onClose, onUpdate, onConvert }) => {
    if (!isOpen) return null;

    const { user } = useAuth();
    const navigate = useNavigate();
    const [lead, setLead] = useState<ILead>(initialLead || {} as ILead);
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

    // UI States
    const [chatterTab, setChatterTab] = useState<'message' | 'note' | 'activity' | 'meeting'>('note');
    const [noteContent, setNoteContent] = useState('');
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

    // Meeting State
    const [meetingDate, setMeetingDate] = useState('');
    const [meetingType, setMeetingType] = useState<MeetingType | ''>('');
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
    const [pendingConvertLead, setPendingConvertLead] = useState<ILead | null>(null);
    const [completingActivityId, setCompletingActivityId] = useState<string | null>(null);
    const [completionNote, setCompletionNote] = useState('');
    const [logAudienceFilter, setLogAudienceFilter] = useState<LogAudienceFilter>('ALL');
    const [scheduleNext, setScheduleNext] = useState(true); // Default to true to suggest next activity
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showQuotationCreator, setShowQuotationCreator] = useState(false);
    const [quotationCreatorTab, setQuotationCreatorTab] = useState<'order_lines' | 'other_info'>('order_lines');
    const [quotationWorkflowStatus, setQuotationWorkflowStatus] = useState<'draft' | 'sent' | 'sale_order' | 'cancelled'>('draft');
    const [activeQuotationId, setActiveQuotationId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false); // Global saving indicator state
    const lastLoggedValues = useRef<Record<string, any>>({}); // To prevent duplicate logs in rapid succession

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
    const [newTagInput, setNewTagInput] = useState('');

    useEffect(() => {
        setAllAvailableTags(getTags());
    }, []);

    useEffect(() => {
        syncLeadHistoryToQuotationLogs(lead);
    }, [lead.id, lead.activities]);

    const handleAddTag = (tag: string) => {
        if (!tag.trim()) return;
        const currentTags = lead.marketingData?.tags || [];
        if (currentTags.includes(tag)) return;

        const updatedTags = [...currentTags, tag];
        const updatedLead = {
            ...lead,
            marketingData: {
                ...lead.marketingData,
                tags: updatedTags
            }
        };
        setLead(updatedLead);
        onUpdate(updatedLead);

        if (!allAvailableTags.includes(tag)) {
            const nextAll = [...allAvailableTags, tag];
            setAllAvailableTags(nextAll);
            saveTags(nextAll);
        }
        setNewTagInput('');
        setIsAddingTag(false);
    };

    const handleRemoveTag = (tag: string) => {
        const currentTags = lead.marketingData?.tags || [];
        const updatedTags = currentTags.filter(t => t !== tag);
        const updatedLead = {
            ...lead,
            marketingData: {
                ...lead.marketingData,
                tags: updatedTags
            }
        };
        setLead(updatedLead);
        onUpdate(updatedLead);
    };

    // --- STAGE HELPERS ---
    const isLeadStage = !lead.status || lead.status === LeadStatus.NEW || lead.status === LeadStatus.CONTACTED;
    const isQualified = lead.status === LeadStatus.QUALIFIED || Object.values(DealStage).includes(lead.status as any);
    const isConverted = lead.status === LeadStatus.CONVERTED || lead.status === DealStage.CONTRACT || lead.status === DealStage.WON;
    const isPipeline = Object.values(DealStage).includes(lead.status as any);
    const isWon = lead.status === DealStage.WON;
    const isContract = lead.status === DealStage.CONTRACT;
    // @ts-ignore
    const isLost = lead.status === 'LOST' || lead.status === 'lost';
    const isNotPickedUp = !lead.pickUpDate && lead.status !== LeadStatus.CONTACTED && lead.status !== LeadStatus.QUALIFIED && !isPipeline;
    const lockedMsg = "Vui lòng nhấn 'Tiếp nhận Lead' để bắt đầu cập nhật thông tin";

    useEffect(() => {
        if (!initialLead) return;
        // Only sync if ID changed or we're not in the middle of a local update sync
        if (initialLead.id !== lead.id) {
            const mappedLineItems = mapStoredItemsToQuotationLineItems(Array.isArray(initialLead.productItems) ? initialLead.productItems : [], initialLead);
            setLead(initialLead);
            setQuotationLineItems(mappedLineItems);
            setDiscountAdjustment(deriveDiscountAdjustment(initialLead.discount, mappedLineItems));
            setOrderLineDraft(createOrderDraft(initialLead));
            setFollowers(Array.isArray(initialLead.followers) ? initialLead.followers : []);
        } else if ((initialLead.activities?.length || 0) > (lead.activities?.length || 0)) {
            // Keep activities in sync if updated from outside (e.g. system)
            setLead(prev => ({ ...prev, activities: initialLead.activities }));
        }
    }, [initialLead]);

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
            setActivitySummary(typeConfig.id === 'call' ? 'Gọi lại tư vấn' : '');
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
        if (!noteContent.trim() && chatterTab === 'note') return;

        if (chatterTab === 'meeting') {
            if (!meetingType) {
                showToast('Vui lòng chọn hình thức hẹn (Online/Offline)', 'error');
                return;
            }
            if (!meetingDate) {
                showToast('Vui lòng chọn thời gian lịch hẹn', 'error');
                return;
            }

            // 1. Logic Create Meeting
            const newMeeting: IMeeting = {
                id: `M-${Date.now()}`,
                title: `Lịch hẹn: ${lead.name}`,
                leadId: lead.id,
                leadName: lead.name,
                leadPhone: lead.phone,
                salesPersonId: lead.ownerId,
                salesPersonName: user?.name || 'Sales Rep',
                campus: (lead as any).company || 'Hanoi',
                address: (lead as any).address || 'N/A',
                datetime: meetingDate,
                type: meetingType as MeetingType,
                status: MeetingStatus.DRAFT,
                notes: noteContent,
                createdAt: new Date().toISOString()
            };
            addMeeting(newMeeting);

            addLog('system', `Đã tạo lịch hẹn: ${meetingType} vào lúc ${new Date(meetingDate).toLocaleString('vi-VN')}. Note: ${noteContent}`, {
                title: 'Đặt lịch hẹn',
                activityType: 'meeting'
            });

            showToast('Đã tạo lịch hẹn thành công!', 'success');
            setMeetingDate('');
            setNoteContent('');
            setChatterTab('note'); // Reset
        } else {
            // Normal Note
            addLog('note', noteContent);
            setNoteContent('');

            if (scheduleNext) {
                openNextActivityModal('Tạo lịch tiếp theo sau khi lưu note');
            }
        }
    };

    const addLog = (type: 'note' | 'message' | 'system' | 'activity', content: string, extra?: any) => {
        if (!content.trim()) return;

        // Prevent duplicate logs for the same content within the same minute
        const logKey = `log-${type}-${content}`;
        const nowMinute = new Date().toISOString().slice(0, 16);
        if (lastLoggedValues.current[logKey] === nowMinute) return;
        lastLoggedValues.current[logKey] = nowMinute;

        const newActivity: any = {
            id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            type,
            timestamp: new Date().toISOString(),
            title: extra?.title || '',
            description: content,
            user: user?.name || 'Admin',
            status: extra?.status,
            datetime: extra?.datetime,
            activityType: extra?.activityType
        };

        const currentActivities = lead.activities || [];
        const updatedActivities = [newActivity, ...currentActivities];

        // AUTO STATUS: NEW/ASSIGNED -> CONTACTED
        let newStatus = lead.status;
        if (lead.status === LeadStatus.NEW || lead.status === LeadStatus.ASSIGNED || !lead.status) {
            newStatus = LeadStatus.CONTACTED;
        }

        const updatedLead = { ...lead, activities: updatedActivities, status: newStatus as any };
        setLead(updatedLead);
        onUpdate(updatedLead);
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

    const openNextActivityModal = (presetSummary?: string) => {
        const defaultType = 'call';
        setNextActivityType(defaultType);
        setNextActivityDate(getDefaultActivityDate(defaultType));
        setNextActivitySummary(presetSummary || '');
        setShowNextActivityModal(true);
    };

    const finalizePendingConvert = () => {
        if (pendingConvertLead && typeof onConvert === 'function') {
            onConvert(pendingConvertLead);
        }
        setPendingConvertLead(null);
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
        openNextActivityModal('Tạo lịch tiếp theo sau khi hoàn thành công việc');
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
            const newLogEntry: any = {
                id: `act-${Date.now()}-${field}`,
                type: 'system',
                timestamp: new Date().toISOString(),
                description: logMsg,
                user: user?.name || 'Admin',
                title: 'Cập nhật hệ thống'
            };

            const updatedLead = {
                ...lead,
                [field]: currentValue,
                activities: [newLogEntry, ...(lead.activities || [])]
            };

            setLead(updatedLead);
            onUpdate(updatedLead);

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
        const newLogEntry: any = {
            id: `act-${Date.now()}-int-${field}`,
            type: 'system',
            timestamp: new Date().toISOString(),
            description: `${user?.name || 'Admin'} cập nhật ${fieldLabel}: ${oldValueText} -> ${newValueText}`,
            user: user?.name || 'Admin',
            title: 'Cập nhật ghi chú nội bộ'
        };

        const updatedLead = {
            ...lead,
            internalNotes: {
                ...(lead.internalNotes || {}),
                [field]: value
            },
            activities: [newLogEntry, ...(lead.activities || [])]
        };

        setLead(updatedLead);
        onUpdate(updatedLead);
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
        if (newStatus === LeadStatus.QUALIFIED) {
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
        const statusLog: any = {
            id: `act-${Date.now()}`,
            type: 'system',
            timestamp: new Date().toISOString(),
            description: `Trạng thái: ${lead.status || 'Mới'} → ${newStatus}`,
            user: user?.name || 'Admin',
            title: ''
        };

        const updatedLead = {
            ...lead,
            status: newStatus as any,
            activities: [statusLog, ...(lead.activities || [])],
            productItems: leadProductItems, // Sync current products
            discount: totalDiscountAmount, // Sync current discount
            paymentRoadmap: lead.paymentRoadmap
        };

        setLead(updatedLead);
        onUpdate(updatedLead);
        setShowStatusDropdown(false);
    };

    const handleLossAction = () => {
        if (!lossReason) {
            showToast("Vui lòng chọn lý do thất bại!", 'error');
            return;
        }

        const finalReason = lossReason === 'Lý do khác' ? customLossReason : lossReason;
        if (lossReason === 'Lý do khác' && !customLossReason.trim()) {
            showToast("Vui lòng nhập lý do cụ thể!", 'error');
            return;
        }

        const statusLog: any = {
            id: `act-${Date.now()}`,
            type: 'system',
            timestamp: new Date().toISOString(),
            description: `Trạng thái: ${lead.status} → LOST. Lý do: ${finalReason}`,
            user: user?.name || 'Admin',
            title: 'Thất bại'
        };

        // @ts-ignore
        const updatedLead = { ...lead, status: 'LOST', lostReason: finalReason, activities: [statusLog, ...(lead.activities || [])] };
        setLead(updatedLead);
        onUpdate(updatedLead);
        setShowLossModal(false);
        setLossReason('');
        setCustomLossReason('');
    }

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
            description: `Trạng thái: ${lead.status || 'Mới'} → KHÔNG ĐẠT (Unqualified)`,
            user: user?.name || 'Admin',
            title: 'Không đạt'
        };

        const updatedLead = {
            ...lead,
            status: LeadStatus.DISQUALIFIED as any,
            activities: [disqualifiedLog, ...(lead.activities || [])],
        };

        setLead(updatedLead);
        onUpdate(updatedLead);
        showToast("Đã phân loại: KHÔNG ĐẠT", 'info');
    };

    const handlePickUpAction = () => {
        const now = new Date();
        const createdAt = new Date(lead.createdAt);
        const diffMins = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60));
        const slaMet = diffMins <= 15;

        const pickUpLog: any = {
            id: `act-${Date.now()}`,
            type: 'system',
            timestamp: now.toISOString(),
            description: `Sale ${user?.name || 'Admin'} đã tiếp nhận Lead. SLA Pick-up: ${slaMet ? 'ĐẠT' : 'VI PHẠM'} (Phản hồi sau ${diffMins} phút).`,
            user: user?.name || 'Admin',
            title: 'Tiếp nhận Lead'
        };

        const updatedLead = {
            ...lead,
            status: LeadStatus.ASSIGNED as any,
            ownerId: user?.name || lead.ownerId,
            pickUpDate: now.toISOString(),
            activities: [pickUpLog, ...(lead.activities || [])],
        };

        setLead(updatedLead);
        onUpdate(updatedLead);
        showToast(`Đã tiếp nhận Lead. SLA: ${slaMet ? 'Đạt' : 'Quá hạn'}`, slaMet ? 'success' : 'info');
    };

    const handleCallAction = () => {
        const callLog: any = {
            id: `act-${Date.now()}`,
            type: 'system',
            timestamp: new Date().toISOString(),
            title: 'Thực hiện gọi điện',
            description: `Sale ${user?.name || 'Tôi'} đã thực hiện gọi điện cho khách hàng.`,
            user: user?.name || 'Admin',
        };

        if (lead.status === LeadStatus.NEW || lead.status === LeadStatus.ASSIGNED) {
            const updatedLead = {
                ...lead,
                status: LeadStatus.CONTACTED as any,
                activities: [callLog, ...(lead.activities || [])],
            };
            setLead(updatedLead);
            onUpdate(updatedLead);
        } else {
            const updatedLead = {
                ...lead,
                activities: [callLog, ...(lead.activities || [])],
            };
            setLead(updatedLead);
            onUpdate(updatedLead);
        }
        window.location.href = `tel:${lead.phone}`;
    };

    const handleAssignAction = (targetUser: any) => {
        const assignLog: any = {
            id: `act-${Date.now()}`,
            type: 'system',
            timestamp: new Date().toISOString(),
            description: `Hệ thống phân bổ Lead cho: ${targetUser.name}`,
            user: user?.name || 'Admin',
            title: 'Phân bổ'
        };

        const updatedLead = {
            ...lead,
            status: LeadStatus.ASSIGNED as any,
            ownerId: targetUser.name,
            activities: [assignLog, ...(lead.activities || [])],
        };

        setLead(updatedLead);
        onUpdate(updatedLead);
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
            setPendingConvertLead(lead);
            openNextActivityModal('Tạo hoạt động tiếp theo sau Convert');
        } else {
            console.error("onConvert param is not a function", onConvert);
        }
    }

    const handleScheduleActivity = () => {
        if (!activitySummary) return;
        addScheduledActivity(activityType, activitySummary, activityDate);
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
                        {[LeadStatus.NEW, LeadStatus.ASSIGNED, LeadStatus.CONTACTED, LeadStatus.QUALIFIED, LeadStatus.CONVERTED].map((st, idx, arr) => {
                            const isCurrent = lead.status === st;
                            const isPast = arr.indexOf(lead.status as LeadStatus) >= idx;
                            return (
                                <React.Fragment key={st}>
                                    <div className={`flex items-center gap-2 whitespace-nowrap ${isCurrent ? 'opacity-100' : 'opacity-60'}`}>
                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${isPast ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                            {isPast ? <CheckCircle2 size={12} /> : idx + 1}
                                        </div>
                                        <span className={`text-[11px] font-bold uppercase tracking-tight ${isCurrent ? 'text-blue-700' : isPast ? 'text-slate-700' : 'text-slate-400'}`}>
                                            {st}
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
                            {isLost && <span className="ml-2 bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded border border-red-200 uppercase">Đã thất bại</span>}
                        </div>

                        <div className="flex items-center gap-2">
                            {/* 1. PICK UP BUTTON - Prominent if not yet picked up */}
                            {((lead.status === LeadStatus.NEW || lead.status === LeadStatus.ASSIGNED) && !lead.pickUpDate) && user?.role !== UserRole.MARKETING && (
                                <button
                                    onClick={handlePickUpAction}
                                    className="px-6 py-2 text-sm font-black text-white bg-blue-600 border border-blue-700 rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-lg shadow-blue-200 transition-all animate-pulse"
                                >
                                    <Handshake size={20} /> TIẾP NHẬN LEAD NGAY
                                </button>
                            )}

                            {/* OTHER ACTIONS - ONLY IF PICKED UP OR ADVANCED STATUS */}
                            {(lead.pickUpDate || (![LeadStatus.NEW, LeadStatus.ASSIGNED].includes(lead.status as LeadStatus))) && (
                                <div className="flex items-center gap-2 bg-blue-50/50 p-1 rounded-lg border border-blue-100/50 mr-2">
                                    {/* 0. CALL BUTTON - Light Blue Theme */}
                                    <button
                                        onClick={handleCallAction}
                                        className="px-4 py-1.5 text-[11px] font-black text-blue-700 bg-white border border-blue-200 rounded hover:bg-blue-50 flex items-center gap-2 shadow-sm transition-all active:scale-95"
                                    >
                                        <Phone size={13} className="fill-blue-100" /> GỌI ĐIỆN
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
                            {(lead.pickUpDate || (![LeadStatus.NEW, LeadStatus.ASSIGNED].includes(lead.status as LeadStatus))) && (
                                <>
                                    {/* 3. CONVERT BUTTON */}
                                    {!isWon && !isContract && !isLost && !isPipeline && user?.role !== UserRole.MARKETING && (
                                        <button onClick={handleConvertAction} className="px-3 py-1.5 text-xs font-bold text-blue-600 border border-blue-600 rounded hover:bg-blue-50 flex items-center gap-1 transition-all">
                                            <ArrowUpRight size={14} /> CONVERT
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
                                            <Ban size={14} /> THẤT BẠI
                                        </button>
                                    )}

                                    {/* 6. UNQUALIFIED BUTTON */}
                                    {!isWon && !isContract && !isLost && lead.status !== LeadStatus.DISQUALIFIED && user?.role !== UserRole.MARKETING && (
                                        <button onClick={handleDisqualifiedAction} className="px-3 py-1.5 text-xs font-bold text-slate-400 border border-slate-200 rounded hover:bg-slate-50 flex items-center gap-1">
                                            <XOctagon size={14} /> KHÔNG ĐẠT
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

                        {(isWon || isLost) && <div className="absolute top-0 left-0 w-full h-full bg-slate-50/50 z-20 pointer-events-none" />}

                        {/* VISUAL GUIDE FOR STAGES */}
                        <style>{`
                    .field-label { font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 4px; display: block; letter-spacing: 0.02em; }
                    .field-input { width: 100%; padding: 8px 10px; font-size: 13px; color: #1e293b; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; outline: none; transition: all 0.2s; }
                    .field-input:focus { background-color: #fff; border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1); }
                    .field-input:disabled { background-color: #e2e8f0; color: #94a3b8; cursor: not-allowed; }
                    .field-input.locked { background-color: #f0fdf4; border-color: #bbf7d0; color: #166534; pointer-events: none; }
                    .section-title { display: none; }
                    .badge-section { background: #dbeafe; color: #1e40af; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; }
                    .dimmed-section { opacity: 0.5; pointer-events: none; filter: grayscale(100%); transition: all 0.3s; }
                    .active-section { opacity: 1; pointer-events: auto; filter: none; }
                    @keyframes bounce-subtle {
                        0%, 100% { transform: translateY(0); }
                        50% { transform: translateY(-3px); }
                    }
                    .animate-bounce-subtle {
                        animation: bounce-subtle 2s infinite ease-in-out;
                    }
                `}</style>

                        <div className="mb-4 pb-2 border-b border-blue-100 flex items-center gap-2">
                            <h3 className="text-[14px] font-extrabold text-blue-800 uppercase tracking-wide">THÔNG TIN LEAD</h3>
                            {isQualified && <Lock size={12} className="text-green-600" />}
                            {isNotPickedUp && <span className="text-[10px] text-red-500 font-bold animate-pulse inline-flex items-center gap-1"><Lock size={10} /> {lockedMsg}</span>}
                        </div>

                        {/* CORE LEAD INFO */}
                        <div className="mb-10">
                            <h3 className="section-title">Thông tin lead</h3>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                                <div>
                                    <label className="field-label">Họ và tên <span className="text-red-500">*</span></label>
                                    <input className={`field-input font-bold ${isQualified ? 'locked' : ''}`} defaultValue={lead.name} onBlur={e => handleFieldBlur('name', e.target.value)} disabled={isQualified || isContract || isLost} />
                                </div>
                                <div>
                                    <label className="field-label">Số điện thoại <span className="text-red-500">*</span></label>
                                    <input className={`field-input font-bold ${isQualified ? 'locked' : ''}`} defaultValue={lead.phone} onBlur={e => handleFieldBlur('phone', e.target.value)} disabled={isQualified || isContract || isLost} />
                                </div>
                                <div>
                                    <label className="field-label">Nguồn Data</label>
                                    <select className={`field-input ${isQualified ? 'locked' : ''}`} defaultValue={lead.source} onChange={e => handleFieldBlur('source', e.target.value)} disabled={isQualified || isContract || isLost}>
                                        <option value="Facebook">Facebook</option><option value="TikTok">TikTok</option><option value="Google">Google Search</option><option value="Hotline">Hotline</option><option value="Referral">Giới thiệu</option>
                                    </select>
                                </div>
                                <div><label className="field-label">Email</label><input className={`field-input ${isQualified ? 'locked' : ''}`} defaultValue={lead.email} onBlur={e => handleFieldBlur('email', e.target.value)} disabled={isQualified || isContract || isLost} /></div>
                            </div>
                        </div>

                        {/* PROFILING */}
                        <div className={`mb-10 p-4 border rounded-lg ${!isLeadStage ? 'bg-white border-blue-100 active-section' : 'bg-slate-50 border-slate-200'}`}>
                            <h3 className="section-title">Hồ sơ năng lực</h3>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                                <div>
                                    <label className="field-label">Thị trường mục tiêu</label>
                                    <select className="field-input" defaultValue={lead.targetCountry} onChange={e => handleFieldBlur('targetCountry', e.target.value)} disabled={isContract || isLost}>
                                        <option value="">-- Chọn --</option><option value="Đức">Đức</option><option value="Úc">Úc</option><option value="Nhật Bản">Nhật Bản</option><option value="Hàn Quốc">Hàn Quốc</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="field-label">Trình độ học vấn <span className="text-red-500">*</span></label>
                                    <select className="field-input" defaultValue={lead.educationLevel} onChange={e => handleFieldBlur('educationLevel', e.target.value)} disabled={isContract || isLost} >
                                        <option value="">-- Chọn --</option><option value="THPT">Tốt nghiệp THPT</option><option value="Cao đẳng">Cao đẳng</option><option value="Đại học">Đại học</option><option value="Thạc sĩ">Thạc sĩ</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="field-label">Ngày sinh <span className="text-red-500">* (Bắt buộc Qualified)</span></label>
                                    <input type="date" className="field-input" defaultValue={lead.dob} onBlur={e => handleFieldBlur('dob', e.target.value)} disabled={isContract || isLost} />
                                </div>
                                <div><label className="field-label">GPA / Điểm ngoại ngữ</label><input className="field-input" placeholder="VD: GPA 7.5 - IELTS 6.0" defaultValue={lead.studentInfo?.languageLevel} onBlur={e => handleFieldBlur('studentInfo', { ...lead.studentInfo, languageLevel: e.target.value })} disabled={isContract || isLost} /></div>
                            </div>
                        </div>

                        {/* INTERNAL NOTES */}
                        <div className="mb-10 p-4 border rounded-lg bg-slate-50 border-slate-200">
                            <h3 className="section-title">Ghi chú nội bộ</h3>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                                <div title={isNotPickedUp ? lockedMsg : ""}>
                                    <label className="field-label">Mức độ tiềm năng</label>
                                    <select className="field-input" value={lead.internalNotes?.potential || ''} onChange={e => handleInternalNoteBlur('potential', e.target.value as any)} disabled={isNotPickedUp || isConverted || isLost}>
                                        <option value="">-- Chọn --</option>
                                        <option value="Nóng">Nóng</option>
                                        <option value="Tiềm năng">Tiềm năng</option>
                                        <option value="Tham khảo">Tham khảo</option>
                                    </select>
                                </div>
                                <div title={isNotPickedUp ? lockedMsg : ""}>
                                    <label className="field-label">Thời gian dự kiến tham gia</label>
                                    <input className="field-input" placeholder="VD: 06/2026" defaultValue={lead.internalNotes?.expectedStart || ''} onBlur={e => handleInternalNoteBlur('expectedStart', e.target.value)} disabled={isNotPickedUp || isConverted || isLost} />
                                </div>
                                <div title={isNotPickedUp ? lockedMsg : ""}>
                                    <label className="field-label">Tài chính</label>
                                    <input className="field-input" placeholder="Đủ / Thiếu / Cần hỗ trợ" defaultValue={lead.internalNotes?.financial || ''} onBlur={e => handleInternalNoteBlur('financial', e.target.value)} disabled={isNotPickedUp || isConverted || isLost} />
                                </div>
                                <div title={isNotPickedUp ? lockedMsg : ""}>
                                    <label className="field-label">Ý kiến bố mẹ</label>
                                    <input className="field-input" placeholder="Đồng ý / Cần cân nhắc..." defaultValue={lead.internalNotes?.parentOpinion || ''} onBlur={e => handleInternalNoteBlur('parentOpinion', e.target.value)} disabled={isNotPickedUp || isConverted || isLost} />
                                </div>
                                <div className="col-span-2" title={isNotPickedUp ? lockedMsg : ""}>
                                    <label className="field-label">Ghi chú khác</label>
                                    <textarea className={`field-input h-20 resize-none ${isConverted ? 'locked' : ''}`} defaultValue={lead.notes || ''} onBlur={e => handleFieldBlur('notes', e.target.value)} disabled={isNotPickedUp || isConverted || isLost} />
                                </div>
                            </div>
                        </div>

                        {/* LEGAL INFO */}
                        <div className={`mb-20 ${isPipeline || isContract ? 'active-section' : 'dimmed-section'}`}>
                            <h3 className="section-title text-red-700 border-red-100 bg-red-50 pl-2 py-1 rounded-sm"><ShieldCheck size={16} /> Thông tin pháp lý</h3>

                            <div className="grid grid-cols-3 gap-x-4 gap-y-4 border border-red-100 rounded p-4 bg-white relative">
                                <div className="col-span-1">
                                    <label className="field-label text-red-800">Số CCCD / Hộ chiếu <span className="text-red-500">*</span></label>
                                    <input className="field-input font-bold border-red-200" placeholder="Số giấy tờ" defaultValue={lead.identityCard} onBlur={e => handleFieldBlur('identityCard', e.target.value)} disabled={isWon || isContract || isLost} />
                                </div>
                                <div className="col-span-1">
                                    <label className="field-label text-red-800">Ngày cấp <span className="text-red-500">*</span></label>
                                    <input type="date" className="field-input border-red-200" defaultValue={lead.identityDate} onBlur={e => handleFieldBlur('identityDate', e.target.value)} disabled={isWon || isContract || isLost} />
                                </div>
                                <div className="col-span-1">
                                    <label className="field-label text-red-800">Nơi cấp <span className="text-red-500">*</span></label>
                                    <input className="field-input border-red-200" placeholder="Cục CS QLHC..." defaultValue={lead.identityPlace} onBlur={e => handleFieldBlur('identityPlace', e.target.value)} disabled={isWon || isContract || isLost} />
                                </div>
                                <div className="col-span-3">
                                    <label className="field-label text-red-800">Địa chỉ thường trú (Full) <span className="text-red-500">*</span></label>
                                    <input className="field-input border-red-200" placeholder="Số nhà, Đường, Phường/Xã, Quận/Huyện, Tỉnh/TP" defaultValue={lead.address} onBlur={e => handleFieldBlur('address', e.target.value)} disabled={isWon || isContract || isLost} />
                                </div>
                            </div>
                        </div>

                        {/* MARKETING META */}
                        <div className="mb-10 p-4 border rounded-lg bg-slate-50 border-slate-200">
                            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                                <div>
                                    <label className="field-label">Ngày tạo lead</label>
                                    <input className="field-input" value={formatMetaDateTime(lead.createdAt)} readOnly disabled />
                                </div>
                                <div>
                                    <label className="field-label">Ngày assign</label>
                                    <input className="field-input" value={formatMetaDateTime(lead.pickUpDate)} readOnly disabled />
                                </div>
                                <div className="col-span-2">
                                    <label className="field-label flex items-center justify-between">
                                        <span>Tags (Phân loại)</span>
                                        <button onClick={() => setIsAddingTag(!isAddingTag)} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 normal-case">
                                            <Plus size={12} /> {isAddingTag ? 'Đóng' : 'Thêm Tag'}
                                        </button>
                                    </label>

                                    <div className="flex flex-wrap gap-2 mb-2 p-3 bg-white border border-dashed border-slate-300 rounded-lg min-h-[40px]">
                                        {(lead.marketingData?.tags || []).length > 0 ? (
                                            (lead.marketingData?.tags || []).map((t, idx) => (
                                                <span key={idx} className="flex items-center gap-1 bg-white border border-blue-200 text-blue-700 px-2 py-1 rounded text-[11px] font-bold shadow-sm group">
                                                    {t}
                                                    <button onClick={() => handleRemoveTag(t)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 ml-1">
                                                        <X size={10} />
                                                    </button>
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-slate-400 text-xs italic">Chưa có tag nào...</span>
                                        )}
                                    </div>

                                    {isAddingTag && (
                                        <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-lg mb-4 animate-in fade-in zoom-in-95">
                                            <div className="flex gap-2 mb-3">
                                                <input
                                                    className="flex-1 field-input"
                                                    placeholder="Tạo tag mới..."
                                                    value={newTagInput}
                                                    onChange={e => setNewTagInput(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && handleAddTag(newTagInput)}
                                                />
                                                <button onClick={() => handleAddTag(newTagInput)} className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-blue-700">Tạo</button>
                                            </div>
                                            <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto pr-1">
                                                {allAvailableTags.filter(t => !(lead.marketingData?.tags || []).includes(t)).map((t, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => handleAddTag(t)}
                                                        className="text-[10px] px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600 border border-slate-200 transition-colors"
                                                    >
                                                        + {t}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

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
                            ) : isLost ? (
                                <div className="w-full flex justify-center items-center bg-red-50 px-4 py-2 rounded-lg border border-red-200 text-red-700 font-bold">
                                    <Ban size={16} className="mr-2" /> Lead đã thất bại.
                                </div>
                            ) : (
                                <>
                                    <span className="text-xs text-slate-400 italic flex items-center">Cập nhật đầy đủ thông tin lead.</span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => { addLog('system', 'Lưu thủ công'); showToast('Đã lưu dữ liệu!', 'success'); }}
                                            className="flex items-center gap-2 bg-slate-800 text-white px-6 py-2 rounded-lg font-bold shadow-md hover:bg-slate-900 active:scale-95 transition-all text-sm"
                                        >
                                            <CheckCircle2 size={16} /> LƯU THÔNG TIN
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                    </div>

                    {/* --- RIGHT: CHATTER (1/3) --- */}
                    <div className="w-[34%] bg-[#F9FAFB] flex flex-col h-full border-l border-slate-200">
                        {/* TABS */}
                        <div className="px-4 py-3 border-b border-slate-200 bg-white flex sticky top-0 z-10 gap-2">
                            <button onClick={() => setChatterTab('note')} className={`flex-1 py-1.5 text-xs font-bold rounded border ${chatterTab === 'note' ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-white border-slate-300 text-slate-600'}`}>Log Note</button>
                            <button onClick={() => setChatterTab('meeting')} className={`flex-1 py-1.5 text-xs font-bold rounded border ${chatterTab === 'meeting' ? 'bg-blue-600 text-white border-blue-700' : 'bg-white border-slate-300 text-slate-600'}`}>Lịch hẹn / Test</button>
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
                                <button onClick={() => setShowFollowersModal(true)} className="text-xs text-blue-600 font-bold hover:bg-blue-50 px-2 py-1 rounded flex items-center gap-1">
                                    <Plus size={12} /> Add
                                </button>
                            </div>
                        </div>

                        {/* INPUT AREA */}
                        <div className="p-4 border-b border-slate-200 bg-white">
                            {chatterTab === 'activity' ? (
                                <div className="space-y-3">
                                    <button
                                        onClick={() => setIsCreateMeetingModalOpen(true)}
                                        className="w-full bg-emerald-600 text-white py-2 rounded text-xs font-bold hover:bg-emerald-700 flex items-center justify-center gap-2"
                                    >
                                        <Plus size={14} /> Tạo lịch hẹn
                                    </button>
                                    <div className="flex gap-2 mb-2">
                                        {ACTIVITY_TYPES.map(t => (
                                            <button key={t.id} onClick={() => setActivityType(t.id)} className={`p-2 rounded border text-[10px] font-bold uppercase flex flex-col items-center gap-1 w-1/4 ${activityType === t.id ? 'bg-purple-50 border-purple-400 text-purple-700' : 'border-slate-200 text-slate-500'}`}>
                                                <t.icon size={14} /> {t.label}
                                            </button>
                                        ))}
                                    </div>
                                    <input type="datetime-local" className="w-full text-xs p-2 border rounded font-bold" value={activityDate} onChange={e => setActivityDate(e.target.value)} />
                                    <input className="w-full text-xs p-2 border rounded" placeholder="Tiêu đề công việc..." value={activitySummary} onChange={e => setActivitySummary(e.target.value)} />
                                    <button onClick={handleScheduleActivity} className="w-full bg-purple-600 text-white py-1.5 rounded text-xs font-bold">Lưu Công Việc</button>
                                </div>
                            ) : chatterTab === 'meeting' ? (
                                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <label className="text-[10px] font-bold text-slate-500 mb-1 block">Thời gian</label>
                                            <input
                                                type="datetime-local"
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-blue-500 outline-none font-bold"
                                                value={meetingDate}
                                                onChange={(e) => setMeetingDate(e.target.value)}
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-[10px] font-bold text-slate-500 mb-1 block">Loại hình</label>
                                            <select
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-blue-500 outline-none"
                                                value={meetingType}
                                                onChange={(e) => setMeetingType(e.target.value as MeetingType)}
                                            >
                                                <option value="">-- Chọn hình thức --</option>
                                                <option value={MeetingType.OFFLINE}>Offline (Tại trung tâm)</option>
                                                <option value={MeetingType.ONLINE}>Online (Phóng vấn)</option>
                                            </select>
                                        </div>
                                    </div>
                                    <textarea
                                        className="w-full h-20 p-2 text-xs border border-blue-300 bg-blue-50 rounded resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Ghi chú cho lịch hẹn (VD: Học sinh cần test kỹ ngữ pháp...)"
                                        value={noteContent}
                                        onChange={e => setNoteContent(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendLog(); } }}
                                    ></textarea>
                                    <button
                                        onClick={handleSendLog}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-xs font-bold shadow-md transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Calendar size={14} /> ĐẶT LỊCH HẸN
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
                                        {chatterTab === 'note' && (
                                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                                                    checked={scheduleNext}
                                                    onChange={e => setScheduleNext(e.target.checked)}
                                                />
                                                <span className="text-xs font-bold text-slate-600">Lên lịch tiếp theo? (Arrange time)</span>
                                            </label>
                                        )}
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

                                <div className="flex gap-2 mb-3">
                                    {ACTIVITY_TYPES.map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => setNextActivityType(t.id)}
                                            className={`flex-1 p-2 rounded border text-[10px] font-bold uppercase ${nextActivityType === t.id ? 'bg-purple-50 border-purple-400 text-purple-700' : 'border-slate-200 text-slate-500'}`}
                                        >
                                            <t.icon size={12} /> {t.label}
                                        </button>
                                    ))}
                                </div>

                                <input type="datetime-local" className="w-full text-xs p-2 border rounded font-bold mb-2" value={nextActivityDate} onChange={e => setNextActivityDate(e.target.value)} />
                                <input className="w-full text-xs p-2 border rounded mb-4" placeholder="Tiêu đề công việc..." value={nextActivitySummary} onChange={e => setNextActivitySummary(e.target.value)} />

                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={() => { setShowNextActivityModal(false); finalizePendingConvert(); }}
                                        className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded"
                                    >
                                        Bỏ qua
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (!nextActivitySummary) return;
                                            addScheduledActivity(nextActivityType, nextActivitySummary, nextActivityDate);
                                            setNextActivitySummary('');
                                            setShowNextActivityModal(false);
                                            finalizePendingConvert();
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
                                <h3 className="text-lg font-bold text-red-600 mb-4 flex items-center gap-2"><Ban /> Xác nhận thất bại Lead?</h3>
                                <p className="text-sm text-slate-600 mb-4">Vui lòng chọn lý do để hệ thống ghi nhận:</p>

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
                                    <button onClick={handleLossAction} className="px-4 py-2 font-bold text-white bg-red-600 hover:bg-red-700 rounded shadow-lg shadow-red-200">Xác nhận LOST</button>
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
                    }}
                />

            </div>
        </div>
    );
};

export default UnifiedLeadDrawer;
