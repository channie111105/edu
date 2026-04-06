import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    LayoutDashboard,
    Settings,
    FileText,
    Database,
    QrCode,
    Copy,
    Save,
    PieChart,
    Globe,
    Facebook,
    CheckCircle2,
    Table as TableIcon,
    LayoutGrid,
    Filter,
    TrendingUp,
    Download,
    GripVertical,
    MoreHorizontal,
    Search,
    Zap,
    Upload,
    Plus,
    FileDown,
    X,
    ChevronDown,
    type LucideIcon
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import * as XLSX from 'xlsx';
import { decodeMojibakeReactNode, decodeMojibakeText } from '../utils/mojibake';
import { getLeadPhoneValidationMessage, isValidLeadPhone, normalizeLeadPhone } from '../utils/phone';

// --- MOCK DATA ---
const CAMPAIGNS_METRICS = {
    totalLeads: 1567,
    validRate: 85,
    contactedRate: 60,
    conversionRate: 12,
    roi: 450,
    budget: 57500000,
    revenue: 980000000,
    cpl: 323034
};

const ROI_CHART_DATA = [
    { name: '1/2', revenue: 400, budget: 240 },
    { name: '2/2', revenue: 300, budget: 139 },
    { name: '3/2', revenue: 500, budget: 380 },
    { name: '4/2', revenue: 780, budget: 390 },
    { name: '5/2', revenue: 480, budget: 480 },
    { name: '6/2', revenue: 600, budget: 380 },
    { name: '7/2', revenue: 900, budget: 430 },
    { name: '8/2', revenue: 850, budget: 400 },
    { name: '9/2', revenue: 980, budget: 410 },
    { name: '10/2', revenue: 1100, budget: 420 },
];

const LEAD_STATUS_OPTIONS = ['Mới', 'Đã liên hệ', 'Đạt chuẩn', 'Chốt', 'Hủy'];

type LeadRecord = {
    id: number;
    name: string;
    phone: string;
    email: string;
    status: string;
    verified: boolean;
    source: string;
};

type DataViewMode = 'table' | 'kanban' | 'dashboard';
type LeadVerificationFilter = 'all' | 'verified' | 'unverified';
type LeadSortMode = 'newest' | 'oldest' | 'name_asc' | 'name_desc' | 'status';

type CampaignDetailType = 'manual' | 'auto';
type CampaignDetailStatus = 'Running' | 'Paused' | 'Planned' | 'Completed';

type CampaignDetailMeta = {
    name: string;
    channel: string;
    status: CampaignDetailStatus;
    campaignType: CampaignDetailType;
    apiConnected: boolean;
};

const CAMPAIGN_DETAIL_META: Record<string, CampaignDetailMeta> = {
    camp_01: {
        name: 'Trại hè 2024',
        channel: 'Biểu mẫu khách hàng tiềm năng Facebook',
        status: 'Running',
        campaignType: 'auto',
        apiConnected: true
    },
    camp_02: {
        name: 'Khóa học IELTS Online',
        channel: 'Google Ads',
        status: 'Paused',
        campaignType: 'auto',
        apiConnected: true
    },
    camp_03: {
        name: 'Hội thảo Du học Đức',
        channel: 'Sự kiện trực tiếp',
        status: 'Running',
        campaignType: 'manual',
        apiConnected: false
    },
    camp_04: {
        name: 'Chiến dịch nhận diện thương hiệu TikTok',
        channel: 'TikTok',
        status: 'Running',
        campaignType: 'auto',
        apiConnected: true
    },
    camp_05: {
        name: 'Email Marketing - Khách cũ',
        channel: 'Email',
        status: 'Running',
        campaignType: 'manual',
        apiConnected: false
    }
};

const CAMPAIGN_STATUS_LABELS: Record<CampaignDetailStatus, string> = {
    Running: 'Đang chạy',
    Paused: 'Tạm dừng',
    Planned: 'Đã lên kế hoạch',
    Completed: 'Hoàn thành'
};

const CAMPAIGN_CHANNEL_LABELS: Record<string, string> = {
    'Facebook Lead Form': 'Biểu mẫu khách hàng tiềm năng Facebook',
    'Biểu mẫu khách hàng tiềm năng Facebook': 'Biểu mẫu khách hàng tiềm năng Facebook',
    'Google Ads': 'Google Ads',
    'Event/Offline': 'Sự kiện trực tiếp',
    'Sự kiện trực tiếp': 'Sự kiện trực tiếp',
    'TikTok': 'TikTok',
    'Email': 'Email'
};

const CAMPAIGN_TYPE_LABELS: Record<CampaignDetailType, string> = {
    auto: 'Chiến dịch tự động',
    manual: 'Chiến dịch thủ công'
};

const IMPORT_TEMPLATE_ROWS = [
    {
        ho_ten: 'Nguyễn Văn A',
        dien_thoai: '0901234567',
        email: 'a@example.com',
        trang_thai: LEAD_STATUS_OPTIONS[0],
        xac_thuc: 'Có',
        nguon: 'Facebook'
    },
    {
        ho_ten: 'Trần Thị B',
        dien_thoai: '0912345678',
        email: 'b@example.com',
        trang_thai: LEAD_STATUS_OPTIONS[1],
        xac_thuc: 'Không',
        nguon: 'Google Ads'
    }
];

type QrLeadField = {
    id: string;
    label: string;
    placeholder?: string;
    required: boolean;
    fixed: boolean;
    group: 'core' | 'marketing';
};

const QR_LEAD_FIELDS: QrLeadField[] = [
    { id: 'name', label: 'Mô tả / Tên khách hàng', placeholder: 'Họ và tên *', required: true, fixed: true, group: 'core' },
    { id: 'phone', label: 'Điện thoại', placeholder: 'Số điện thoại *', required: true, fixed: true, group: 'core' },
    { id: 'targetCountry', label: 'Quốc gia mục tiêu', placeholder: '-- Chọn quốc gia mục tiêu --', required: true, fixed: true, group: 'core' },
    { id: 'market', label: 'Cơ sở', placeholder: '-- Chọn cơ sở --', required: false, fixed: false, group: 'core' },
    { id: 'company', label: 'Đơn vị liên hệ', placeholder: 'Tên đơn vị liên hệ', required: false, fixed: false, group: 'core' },
    { id: 'address', label: 'Địa chỉ', placeholder: 'Số nhà, đường...', required: false, fixed: false, group: 'core' },
    { id: 'product', label: 'Sản phẩm', placeholder: '-- Chọn sản phẩm --', required: false, fixed: false, group: 'core' },
    { id: 'email', label: 'Email', placeholder: 'email@example.com', required: false, fixed: false, group: 'core' },
    { id: 'owner', label: 'Phụ trách', placeholder: '-- Chọn tư vấn phụ trách --', required: false, fixed: false, group: 'core' },
    { id: 'status', label: 'Trạng thái', placeholder: 'Mới', required: false, fixed: false, group: 'core' },
    { id: 'tags', label: 'Nhãn', placeholder: '-- Chọn nhãn --', required: false, fixed: false, group: 'core' },
    { id: 'campaign', label: 'Chiến dịch', placeholder: '', required: false, fixed: false, group: 'marketing' },
    { id: 'source', label: 'Nguồn', placeholder: 'Hotline', required: false, fixed: false, group: 'marketing' },
    { id: 'channel', label: 'Kênh', placeholder: '-- Chọn kênh --', required: false, fixed: false, group: 'marketing' },
    { id: 'medium', label: 'Phương tiện', placeholder: '-- Chọn --', required: false, fixed: false, group: 'marketing' },
    { id: 'referredBy', label: 'Người giới thiệu', placeholder: '', required: false, fixed: false, group: 'marketing' }
];

const FIXED_REQUIRED_QR_FIELDS = QR_LEAD_FIELDS.filter(field => field.fixed && field.required);
const LEFT_PANEL_CORE_FIELDS = QR_LEAD_FIELDS.filter(field => field.group === 'core');
const LEFT_PANEL_MARKETING_FIELDS = QR_LEAD_FIELDS.filter(field => field.group === 'marketing');
const OPTIONAL_QR_FIELDS = QR_LEAD_FIELDS.filter(field => !field.fixed);
const DEFAULT_SELECTED_OPTIONAL_QR_FIELDS = ['email'];

// Mock Leads
const INITIAL_LEADS: LeadRecord[] = Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    name: `Nguyễn Văn ${i + 1}`,
    phone: `090${Math.floor(Math.random() * 10000000)}`,
    email: `lead${i + 1}@example.com`,
    status: LEAD_STATUS_OPTIONS[Math.floor(Math.random() * LEAD_STATUS_OPTIONS.length)],
    verified: Math.random() > 0.3,
    source: 'Facebook'
}));

const DATA_VIEW_OPTIONS: Array<{ id: DataViewMode; icon: LucideIcon; title: string }> = [
    { id: 'table', icon: TableIcon, title: 'Bảng dữ liệu' },
    { id: 'kanban', icon: LayoutGrid, title: 'Bảng kéo thả' },
    { id: 'dashboard', icon: LayoutDashboard, title: 'Tổng quan dữ liệu' },
];

const LEAD_VERIFICATION_OPTIONS: Array<{ value: LeadVerificationFilter; label: string }> = [
    { value: 'all', label: 'Tất cả xác thực' },
    { value: 'verified', label: 'Đã xác thực' },
    { value: 'unverified', label: 'Chưa xác thực' },
];

const LEAD_SORT_OPTIONS: Array<{ value: LeadSortMode; label: string }> = [
    { value: 'newest', label: 'Mới nhất' },
    { value: 'oldest', label: 'Cũ nhất' },
    { value: 'name_asc', label: 'Tên A-Z' },
    { value: 'name_desc', label: 'Tên Z-A' },
    { value: 'status', label: 'Theo trạng thái' },
];

type CompactToolbarSelectProps = {
    icon: LucideIcon;
    value: string;
    options: Array<{ value: string; label: string }>;
    onChange: (value: string) => void;
    className?: string;
};

const CompactToolbarSelect: React.FC<CompactToolbarSelectProps> = ({
    icon: Icon,
    value,
    options,
    onChange,
    className = ''
}) => (
    <label
        className={`group relative min-w-[150px] flex-1 rounded-xl px-1 transition-all hover:bg-white hover:shadow-[inset_0_0_0_1px_#dbe7f2] focus-within:bg-white focus-within:shadow-[inset_0_0_0_1px_#b8d3e8,0_0_0_3px_rgba(88,146,194,0.12)] ${className}`}
    >
        <Icon
            size={15}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-hover:text-sky-700 group-focus-within:text-sky-700"
        />
        <select
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="h-10 w-full appearance-none bg-transparent pl-9 pr-9 text-sm font-medium text-slate-600 outline-none"
        >
            {options.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
        <ChevronDown
            size={15}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-hover:text-slate-600 group-focus-within:text-sky-700"
        />
    </label>
);

const SEARCH_NORMALIZER_PATTERN = /[\u0300-\u036f]/g;

const normalizeSearchValue = (value: string) =>
    decodeMojibakeText(value || '')
        .normalize('NFD')
        .replace(SEARCH_NORMALIZER_PATTERN, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toLowerCase()
        .trim();

const getCampaignStatusLabel = (status?: string) =>
    CAMPAIGN_STATUS_LABELS[status as CampaignDetailStatus] || decodeMojibakeText(status || '');

const getCampaignStatusTone = (status?: string) => {
    switch (status) {
        case 'Running':
            return 'text-sky-700';
        case 'Paused':
            return 'text-amber-600';
        case 'Completed':
            return 'text-emerald-600';
        default:
            return 'text-slate-500';
    }
};

const getCampaignChannelLabel = (channel?: string) =>
    CAMPAIGN_CHANNEL_LABELS[decodeMojibakeText(channel || '')] || decodeMojibakeText(channel || '');

const CampaignDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const [activeTab, setActiveTab] = useState<'dashboard' | 'api' | 'form' | 'data'>('dashboard');
    const campaignMeta = useMemo<CampaignDetailMeta>(() => {
        const routeState = location.state as {
            campaignName?: string;
            channel?: string;
            status?: CampaignDetailStatus;
            campaignType?: CampaignDetailType;
            apiConnected?: boolean;
        } | null;
        if (routeState?.campaignType && routeState?.campaignName && routeState?.channel && routeState?.status) {
            return {
                name: routeState.campaignName,
                channel: routeState.channel,
                status: routeState.status,
                campaignType: routeState.campaignType,
                apiConnected: routeState.campaignType === 'auto'
            };
        }

        return CAMPAIGN_DETAIL_META[id || ''] || {
            name: id || 'Chiến dịch',
            channel: 'Biểu mẫu khách hàng tiềm năng Facebook',
            status: 'Running',
            campaignType: 'auto',
            apiConnected: true
        };
    }, [id, location.state]);
    const isAutoCampaign = campaignMeta.campaignType === 'auto';
    const campaignStatusLabel = getCampaignStatusLabel(campaignMeta.status);
    const campaignChannelLabel = getCampaignChannelLabel(campaignMeta.channel);
    const campaignTypeLabel = CAMPAIGN_TYPE_LABELS[campaignMeta.campaignType];

    useEffect(() => {
        if (!isAutoCampaign && activeTab === 'api') {
            setActiveTab('dashboard');
        }
    }, [activeTab, isAutoCampaign]);
    // View Mode for Data Tab
    const [viewMode, setViewMode] = useState<DataViewMode>('table');

    // API Config State
    const [webhookUrl, setWebhookUrl] = useState('https://api.educrm.com/wh/v1/camp_123');
    const [fbPixelId, setFbPixelId] = useState('1293849182312');

    // State for Leads (Drag & Drop)
    const [leads, setLeads] = useState<LeadRecord[]>(INITIAL_LEADS);
    const [draggedItem, setDraggedItem] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [sourceFilter, setSourceFilter] = useState<string>('all');
    const [verificationFilter, setVerificationFilter] = useState<LeadVerificationFilter>('all');
    const [sortMode, setSortMode] = useState<LeadSortMode>('newest');
    const [showManualModal, setShowManualModal] = useState(false);
    const [importing, setImporting] = useState(false);
    const [draggingQrFieldId, setDraggingQrFieldId] = useState<string | null>(null);
    const [selectedOptionalQrFieldIds, setSelectedOptionalQrFieldIds] = useState<string[]>(DEFAULT_SELECTED_OPTIONAL_QR_FIELDS);
    const [manualLead, setManualLead] = useState({
        name: '',
        phone: '',
        email: '',
        status: LEAD_STATUS_OPTIONS[0],
        verified: false,
        source: 'Nhập tay'
    });
    const importInputRef = useRef<HTMLInputElement>(null);

    const selectedOptionalQrFields = selectedOptionalQrFieldIds
        .map((fieldId) => OPTIONAL_QR_FIELDS.find(field => field.id === fieldId))
        .filter((field): field is QrLeadField => Boolean(field));

    const addOptionalQrField = (fieldId: string) => {
        const field = OPTIONAL_QR_FIELDS.find(item => item.id === fieldId);
        if (!field) return;
        setSelectedOptionalQrFieldIds(prev => (prev.includes(fieldId) ? prev : [...prev, fieldId]));
    };

    const removeOptionalQrField = (fieldId: string) => {
        setSelectedOptionalQrFieldIds(prev => prev.filter(id => id !== fieldId));
    };

    const handleQrFieldDragStart = (event: React.DragEvent, fieldId: string) => {
        event.dataTransfer.setData('text/plain', fieldId);
        event.dataTransfer.effectAllowed = 'copy';
        setDraggingQrFieldId(fieldId);
    };

    const handleQrFieldDragEnd = () => {
        setDraggingQrFieldId(null);
    };

    const handleQrPreviewDragOver = (event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
    };

    const handleQrPreviewDrop = (event: React.DragEvent) => {
        event.preventDefault();
        const droppedFieldId = event.dataTransfer.getData('text/plain') || draggingQrFieldId;
        if (droppedFieldId) addOptionalQrField(droppedFieldId);
        setDraggingQrFieldId(null);
    };

    const normalizeLeadStatus = (value: string) => {
        const raw = decodeMojibakeText(value).trim();
        const normalized = raw.toLowerCase();

        if (LEAD_STATUS_OPTIONS.includes(raw)) return raw;
        if (['new', 'moi', 'mới', 'má»›i'].includes(normalized)) return LEAD_STATUS_OPTIONS[0];
        if (['contacted', 'lien he', 'liên hệ', 'da lien he', 'đã liên hệ', 'Ä‘Ã£ liÃªn há»‡'].includes(normalized)) return LEAD_STATUS_OPTIONS[1];
        if (['qualified', 'dat chuan', 'đạt chuẩn', 'Ä‘áº¡t chuáº©n'].includes(normalized)) return LEAD_STATUS_OPTIONS[2];
        if (['won', 'chot', 'chốt', 'chá»‘t'].includes(normalized)) return LEAD_STATUS_OPTIONS[3];
        if (['cancelled', 'canceled', 'huy', 'hủy', 'há»§y'].includes(normalized)) return LEAD_STATUS_OPTIONS[4];
        return LEAD_STATUS_OPTIONS[0];
    };

    const parseVerified = (value: string) => {
        const normalized = decodeMojibakeText(value).trim().toLowerCase();
        return ['1', 'true', 'yes', 'y', 'verified', 'co', 'có', 'cÃ³', 'da', 'đã', 'Ä‘Ã£'].includes(normalized);
    };

    const getCellValue = (row: Record<string, unknown>, keys: string[]) => {
        for (const key of keys) {
            const cell = row[key];
            if (cell !== undefined && cell !== null && String(cell).trim()) {
                return decodeMojibakeText(String(cell).trim());
            }
        }
        return '';
    };

    const sourceOptions = useMemo(
        () =>
            Array.from(
                new Set(
                    leads
                        .map((lead) => decodeMojibakeText(lead.source).trim())
                        .filter(Boolean)
                )
            ).sort((left, right) => left.localeCompare(right, 'vi')),
        [leads]
    );

    const filteredLeads = useMemo(() => {
        const keyword = normalizeSearchValue(searchTerm);
        const digitsKeyword = searchTerm.replace(/\D/g, '');

        const matches = leads.filter((lead) => {
            const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
            const matchesSource = sourceFilter === 'all' || lead.source === sourceFilter;
            const matchesVerification =
                verificationFilter === 'all' ||
                (verificationFilter === 'verified' ? lead.verified : !lead.verified);

            if (!matchesStatus || !matchesSource || !matchesVerification) return false;
            if (!keyword && !digitsKeyword) return true;

            const searchable = [
                normalizeSearchValue(lead.name),
                normalizeSearchValue(lead.email),
                normalizeSearchValue(lead.status),
                normalizeSearchValue(lead.source),
                lead.phone.replace(/\D/g, '')
            ].join(' ');

            return searchable.includes(keyword) || (!!digitsKeyword && lead.phone.replace(/\D/g, '').includes(digitsKeyword));
        });

        return [...matches].sort((left, right) => {
            switch (sortMode) {
                case 'oldest':
                    return left.id - right.id;
                case 'name_asc':
                    return left.name.localeCompare(right.name, 'vi');
                case 'name_desc':
                    return right.name.localeCompare(left.name, 'vi');
                case 'status':
                    return left.status.localeCompare(right.status, 'vi') || right.id - left.id;
                case 'newest':
                default:
                    return right.id - left.id;
            }
        });
    }, [leads, searchTerm, sortMode, sourceFilter, statusFilter, verificationFilter]);

    const activeFilterCount = [
        searchTerm.trim(),
        statusFilter !== 'all',
        sourceFilter !== 'all',
        verificationFilter !== 'all',
        sortMode !== 'newest'
    ].filter(Boolean).length;

    const activeFilterPills = [
        searchTerm.trim()
            ? {
                key: 'search',
                label: `Tìm: ${searchTerm.trim()}`,
                onRemove: () => setSearchTerm('')
            }
            : null,
        statusFilter !== 'all'
            ? {
                key: 'status',
                label: `Trạng thái: ${statusFilter}`,
                onRemove: () => setStatusFilter('all')
            }
            : null,
        sourceFilter !== 'all'
            ? {
                key: 'source',
                label: `Nguồn: ${sourceFilter}`,
                onRemove: () => setSourceFilter('all')
            }
            : null,
        verificationFilter !== 'all'
            ? {
                key: 'verified',
                label: verificationFilter === 'verified' ? 'Đã xác thực' : 'Chưa xác thực',
                onRemove: () => setVerificationFilter('all')
            }
            : null,
        sortMode !== 'newest'
            ? {
                key: 'sort',
                label: `Sắp xếp: ${LEAD_SORT_OPTIONS.find((option) => option.value === sortMode)?.label || 'Mới nhất'}`,
                onRemove: () => setSortMode('newest')
            }
            : null
    ].filter((pill): pill is { key: string; label: string; onRemove: () => void } => Boolean(pill));

    const leadCountsByStatus = useMemo(
        () =>
            filteredLeads.reduce<Record<string, number>>((accumulator, lead) => {
                accumulator[lead.status] = (accumulator[lead.status] || 0) + 1;
                return accumulator;
            }, {}),
        [filteredLeads]
    );

    const funnelData = useMemo(
        () => [
            {
                label: 'Khách mới',
                status: LEAD_STATUS_OPTIONS[0],
                count: leadCountsByStatus[LEAD_STATUS_OPTIONS[0]] || 0,
                color: 'bg-sky-500 shadow-sky-100'
            },
            {
                label: 'Đã liên hệ',
                status: LEAD_STATUS_OPTIONS[1],
                count: leadCountsByStatus[LEAD_STATUS_OPTIONS[1]] || 0,
                color: 'bg-cyan-500 shadow-cyan-100'
            },
            {
                label: 'Đạt chuẩn',
                status: LEAD_STATUS_OPTIONS[2],
                count: leadCountsByStatus[LEAD_STATUS_OPTIONS[2]] || 0,
                color: 'bg-blue-500 shadow-blue-100'
            },
            {
                label: 'Chốt',
                status: LEAD_STATUS_OPTIONS[3],
                count: leadCountsByStatus[LEAD_STATUS_OPTIONS[3]] || 0,
                color: 'bg-indigo-500 shadow-indigo-100'
            }
        ].map((step) => ({
            ...step,
            percentage: filteredLeads.length ? Math.round((step.count / filteredLeads.length) * 100) : 0
        })),
        [filteredLeads.length, leadCountsByStatus]
    );

    const addLeads = (rows: Omit<LeadRecord, 'id'>[]) => {
        if (!rows.length) return;

        setLeads(prev => {
            let nextId = prev.length ? Math.max(...prev.map(lead => lead.id)) + 1 : 1;
            const mappedRows = rows.map(row => ({ ...row, id: nextId++ }));
            return [...mappedRows, ...prev];
        });
    };

    const resetManualLead = () => {
        setManualLead({
            name: '',
            phone: '',
            email: '',
            status: LEAD_STATUS_OPTIONS[0],
            verified: false,
            source: 'Nhập tay'
        });
    };

    const handleAddManualLead = () => {
        if (!manualLead.name.trim()) {
            alert('Vui l\u00f2ng nh\u1eadp h\u1ecd t\u00ean.');
            return;
        }
        if (!manualLead.phone.trim()) {
            alert('Vui l\u00f2ng nh\u1eadp s\u1ed1 \u0111i\u1ec7n tho\u1ea1i.');
            return;
        }

        const normalizedPhone = normalizeLeadPhone(manualLead.phone);
        const phoneError = getLeadPhoneValidationMessage(manualLead.phone);
        if (phoneError) {
            alert(phoneError);
            return;
        }

        addLeads([{
            name: manualLead.name.trim(),
            phone: normalizedPhone,
            email: manualLead.email.trim(),
            status: manualLead.status,
            verified: manualLead.verified,
            source: manualLead.source.trim() || 'Nhập tay'
        }]);

        setShowManualModal(false);
        resetManualLead();
    };

    const handleImportFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setImporting(true);
        try {
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: 'array' });
            const firstSheet = workbook.SheetNames[0];
            if (!firstSheet) {
                alert('Tệp nhập không có dữ liệu.');
                return;
            }

            const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[firstSheet], { defval: '' });
            if (!rows.length) {
                alert('Tệp nhập không có dòng dữ liệu.');
                return;
            }

            const parsedRows = rows
                .map((row) => {
                    const name = getCellValue(row, ['ho_ten', 'HoTen', 'name', 'Name', 'full_name']);
                    const phone = normalizeLeadPhone(getCellValue(row, ['dien_thoai', 'DienThoai', 'phone', 'Phone', 'so_dien_thoai', 'sdt']));
                    const email = getCellValue(row, ['email', 'Email']);
                    const source = getCellValue(row, ['nguon', 'Nguon', 'source', 'Source']) || 'Tệp nhập';
                    const status = normalizeLeadStatus(getCellValue(row, ['trang_thai', 'TrangThai', 'status', 'Status']));
                    const verified = parseVerified(getCellValue(row, ['xac_thuc', 'XacThuc', 'verified', 'Verified']));

                    if (!name || !isValidLeadPhone(phone)) return null;

                    return {
                        name,
                        phone,
                        email,
                        source,
                        status,
                        verified
                    } satisfies Omit<LeadRecord, 'id'>;
                })
                .filter((row): row is Omit<LeadRecord, 'id'> => Boolean(row));

            const skippedRows = rows.length - parsedRows.length;
            if (!parsedRows.length) {
                alert('Không có dòng hợp lệ. Số điện thoại phải đúng 10 số, bắt đầu bằng 0 và có kèm họ tên.');
                return;
            }

            addLeads(parsedRows);
            if (skippedRows > 0) {
                alert(`Đã nhập ${parsedRows.length} khách tiềm năng. Bỏ qua ${skippedRows} dòng do thiếu họ tên hoặc số điện thoại không hợp lệ.`);
                return;
            }
            alert(`Đã nhập ${parsedRows.length} khách tiềm năng.`);
        } catch (error) {
            console.error(error);
            alert('Nhập dữ liệu thất bại. Vui lòng kiểm tra lại tệp mẫu.');
        } finally {
            setImporting(false);
            event.target.value = '';
        }
    };

    const handleDownloadTemplate = () => {
        const worksheet = XLSX.utils.json_to_sheet(IMPORT_TEMPLATE_ROWS);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'MauNhap');
        XLSX.writeFile(workbook, `mau_du_lieu_chien_dich_${id || 'chien_dich'}.xlsx`);
    };

    const handleExportFilteredLeads = () => {
        if (!filteredLeads.length) {
            alert('Không có dữ liệu phù hợp để xuất.');
            return;
        }

        const worksheet = XLSX.utils.json_to_sheet(
            filteredLeads.map((lead, index) => ({
                STT: index + 1,
                'Họ tên': lead.name,
                'Số điện thoại': lead.phone,
                Email: lead.email || '-',
                'Xác thực': lead.verified ? 'Đã xác thực' : 'Chưa xác thực',
                'Trạng thái': lead.status,
                'Nguồn': lead.source
            }))
        );
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'DuLieuChienDich');
        XLSX.writeFile(workbook, `du_lieu_chien_dich_${id || 'chien_dich'}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const resetDataFilters = () => {
        setSearchTerm('');
        setStatusFilter('all');
        setSourceFilter('all');
        setVerificationFilter('all');
        setSortMode('newest');
    };

    // Tabs Configuration
    const tabs = [
        { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
        { id: 'api', label: 'Cấu hình API', icon: Settings },
        { id: 'form', label: 'Biểu mẫu & mã QR', icon: FileText },
        { id: 'data', label: 'Danh sách dữ liệu', icon: Database },
    ];

    const visibleTabs = isAutoCampaign ? tabs : tabs.filter((tab) => tab.id !== 'api');

    // --- DRAG AND DROP HANDLERS ---
    const handleDragStart = (e: React.DragEvent, id: number) => {
        setDraggedItem(id);
        e.dataTransfer.effectAllowed = 'move';
        (e.target as HTMLElement).style.opacity = '0.5';
    };

    const handleDragEnd = (e: React.DragEvent) => {
        setDraggedItem(null);
        (e.target as HTMLElement).style.opacity = '1';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetStatus: string) => {
        e.preventDefault();
        if (draggedItem === null) return;

        setLeads(prev => prev.map(lead => {
            if (lead.id === draggedItem) {
                return { ...lead, status: targetStatus };
            }
            return lead;
        }));
        setDraggedItem(null);
    };


    // Helper to render various data views
    const renderDataView = () => {
        if (!filteredLeads.length) {
            return (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm px-6 py-16 text-center animate-in fade-in duration-300">
                    <div className="mx-auto flex max-w-md flex-col items-center gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                            <Search size={24} />
                        </div>
                        <div>
                            <h4 className="text-lg font-bold text-slate-800">Không tìm thấy khách tiềm năng phù hợp</h4>
                            <p className="mt-1 text-sm text-slate-500">
                                Thử đổi từ khóa, nguồn hoặc trạng thái để xem lại dữ liệu của chiến dịch.
                            </p>
                        </div>
                        {activeFilterCount > 0 && (
                            <button
                                type="button"
                                onClick={resetDataFilters}
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                            >
                                <X size={14} /> Xóa bộ lọc
                            </button>
                        )}
                    </div>
                </div>
            );
        }

        switch (viewMode) {
            // --- TABLE VIEW (DEFAULT) ---
            case 'table':
                return (
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
                        <table className="w-full text-left text-sm font-inter">
                            <thead className="bg-white text-slate-400 font-bold border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-5 text-center text-[10px] uppercase tracking-widest w-16">STT</th>
                                    <th className="px-8 py-5 text-[10px] uppercase tracking-widest">Họ tên</th>
                                    <th className="px-8 py-5 text-[10px] uppercase tracking-widest">Điện thoại</th>
                                    <th className="px-8 py-5 text-[10px] uppercase tracking-widest">Email</th>
                                    <th className="px-8 py-5 text-center text-[10px] uppercase tracking-widest">Xác thực</th>
                                    <th className="px-8 py-5 text-center text-[10px] uppercase tracking-widest">Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredLeads.map((lead, index) => (
                                    <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-6 py-4 text-center text-sm font-semibold text-slate-500">{index + 1}</td>
                                        <td className="px-8 py-4 font-bold text-slate-800 tracking-tight">{lead.name}</td>
                                        <td className="px-8 py-4 text-slate-600 font-medium tracking-tight whitespace-nowrap">{lead.phone}</td>
                                        <td className="px-8 py-4 text-slate-400 tracking-tight">{lead.email}</td>
                                        <td className="px-8 py-4">
                                            <div className="flex justify-center">
                                                {lead.verified ? (
                                                    <span className="text-green-600 font-bold text-[10px] flex items-center gap-1.5 uppercase tracking-tight">
                                                        <CheckCircle2 size={12} strokeWidth={3} /> Đã xác thực
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-300 text-[10px]">-</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-8 py-4">
                                            <div className="flex justify-center">
                                                <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest border ${lead.status === LEAD_STATUS_OPTIONS[0] ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                    lead.status === LEAD_STATUS_OPTIONS[1] ? 'bg-orange-50 text-orange-700 border-orange-100' :
                                                        lead.status === LEAD_STATUS_OPTIONS[2] ? 'bg-green-50 text-green-700 border-green-100' :
                                                            lead.status === LEAD_STATUS_OPTIONS[3] ? 'bg-emerald-50 text-emerald-800 border-emerald-100' :
                                                                'bg-slate-50 text-slate-500 border-slate-200'
                                                    }`}>
                                                    {lead.status}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );

            // --- KANBAN VIEW ---
            case 'kanban': {
                const columns = LEAD_STATUS_OPTIONS.slice(0, 4);
                return (
                    <div className="flex gap-6 overflow-x-auto pb-6 h-[calc(100vh-320px)] animate-in fade-in slide-in-from-right-4 duration-300">
                        {columns.map(col => (
                            <div
                                key={col}
                                className="w-80 bg-slate-100/50 rounded-3xl border border-slate-200/50 flex flex-col shrink-0 overflow-hidden"
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, col)}
                            >
                                <div className="p-5 font-bold text-slate-700 uppercase text-[10px] tracking-widest flex justify-between items-center bg-white border-b border-slate-200">
                                    {col}
                                    <span className="bg-slate-100 px-2 py-0.5 rounded-lg text-[10px] font-black text-slate-500">{filteredLeads.filter(l => l.status === col).length}</span>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                                    {filteredLeads.filter(l => l.status === col).map(lead => (
                                        <div
                                            key={lead.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, lead.id)}
                                            onDragEnd={handleDragEnd}
                                            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm cursor-move hover:shadow-md transition-all active:scale-[0.98] group"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <p className="font-bold text-slate-800 text-sm leading-tight group-hover:text-sky-700 transition-colors uppercase tracking-tight">{lead.name}</p>
                                                <MoreHorizontal size={14} className="text-slate-300" />
                                            </div>
                                            <p className="text-xs text-slate-400 font-mono mb-4">{lead.phone}</p>
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-1">
                                                    {lead.verified && <CheckCircle2 size={12} className="text-green-500" />}
                                                </div>
                                                <span className="text-[9px] bg-slate-50 text-slate-400 px-1.5 py-0.5 rounded border border-slate-100 font-bold tracking-widest uppercase">{lead.source}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {/* Dropzone Hint */}
                                    <div className={`h-24 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 text-[10px] font-black uppercase tracking-widest transition-all ${draggedItem !== null ? 'bg-sky-50/70 border-sky-200 text-sky-500 opacity-100' : 'opacity-0 h-0 p-0 border-0'
                                        }`}>
                                        Thả vào đây
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                );
            }

            // --- DASHBOARD VIEW ---
            case 'dashboard': {
                const verifiedCount = filteredLeads.filter((lead) => lead.verified).length;
                const sourceCount = new Set(filteredLeads.map((lead) => lead.source)).size;

                return (
                    <div className="space-y-4 animate-in zoom-in-95 duration-500">
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                            {[
                                { label: 'Tổng khách tiềm năng', value: filteredLeads.length, tone: 'bg-sky-50 text-sky-700' },
                                { label: 'Đã xác thực', value: verifiedCount, tone: 'bg-cyan-50 text-cyan-700' },
                                {
                                    label: 'Tỷ lệ xác thực',
                                    value: `${filteredLeads.length ? Math.round((verifiedCount / filteredLeads.length) * 100) : 0}%`,
                                    tone: 'bg-blue-50 text-blue-700'
                                },
                                { label: 'Nguồn đang hoạt động', value: sourceCount, tone: 'bg-indigo-50 text-indigo-700' }
                            ].map((metric) => (
                                <div
                                    key={metric.label}
                                    className="rounded-[20px] border border-slate-200 bg-white px-4 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
                                >
                                    <div className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${metric.tone}`}>
                                        {metric.label}
                                    </div>
                                    <div className="mt-3 text-2xl font-semibold tracking-tight text-slate-800">{metric.value}</div>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center justify-center rounded-[24px] border border-slate-200 bg-white px-6 py-10 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                            <div className="w-full max-w-xl space-y-4">
                                {funnelData.map((step, idx) => (
                                    <div key={idx} className="flex flex-col items-center group">
                                        <div
                                            className={`flex h-16 items-center justify-center rounded-2xl text-white shadow-lg transition-all group-hover:scale-[1.01] ${step.color}`}
                                            style={{ width: `${48 + step.percentage * 0.45}%`, minWidth: '220px' }}
                                        >
                                            <div className="flex flex-col items-center leading-tight">
                                                <span className="text-lg font-semibold">{step.count}</span>
                                                <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/80">
                                                    {step.percentage}%
                                                </span>
                                            </div>
                                        </div>
                                        {idx < funnelData.length - 1 && (
                                            <div className="my-1 h-6 border-l-2 border-dashed border-slate-200"></div>
                                        )}
                                        <span className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-400">{step.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            }
            default:
                return null;
        }
    };

    return decodeMojibakeReactNode(
        <div className="flex h-screen flex-col overflow-hidden bg-[#f4f9fd] font-sans text-[#111418]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/campaigns')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Chiến dịch: {campaignMeta.name}</h1>
                        <p className="text-xs text-slate-500 font-medium">
                            {campaignChannelLabel} • {campaignTypeLabel} • <span className={`font-bold ${getCampaignStatusTone(campaignMeta.status)}`}>{campaignStatusLabel}</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="bg-white border-b border-slate-200 shrink-0">
                <div className="max-w-[1600px] mx-auto px-6 flex gap-8 font-inter">
                    {visibleTabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 py-4 px-2 text-sm font-bold border-b-2 transition-all ${activeTab === tab.id
                                ? 'border-sky-600 text-sky-700'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <tab.icon size={18} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="custom-scrollbar flex-1 overflow-y-auto bg-[#f4f9fd] p-6 lg:p-8">
                <div className="max-w-[1600px] mx-auto">

                    {/* TAB 1: DASHBOARD */}
                    {activeTab === 'dashboard' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Quick Stats Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {[
                                    { label: 'Tổng dữ liệu', value: CAMPAIGNS_METRICS.totalLeads.toLocaleString(), color: 'text-slate-900' },
                                    { label: 'Tỷ lệ xác thực', value: `${CAMPAIGNS_METRICS.validRate}%`, color: 'text-sky-700' },
                                    { label: 'Tỷ lệ đã liên hệ', value: `${CAMPAIGNS_METRICS.contactedRate}%`, color: 'text-cyan-700' },
                                    { label: 'Tỷ lệ chốt', value: `${CAMPAIGNS_METRICS.conversionRate}%`, color: 'text-indigo-700' },
                                ].map((stat, i) => (
                                    <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-transform hover:scale-[1.01]">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                                        <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* ROI Chart Card */}
                            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
                                    <TrendingUp size={20} className="text-slate-500" /> Biểu đồ hiệu quả ROI
                                </h3>

                                <div className="h-[240px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={ROI_CHART_DATA}>
                                            <defs>
                                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                                            <Area type="monotone" dataKey="budget" stroke="#e2e8f0" strokeWidth={2} fill="transparent" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Footer Stats inside ROI Chart */}
                                <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">Chi phí</p>
                                        <p className="text-lg font-black text-slate-900">{CAMPAIGNS_METRICS.budget.toLocaleString()}đ</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">Doanh thu</p>
                                        <p className="text-lg font-black text-cyan-700">{CAMPAIGNS_METRICS.revenue.toLocaleString()}đ</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">Lợi nhuận ROI</p>
                                        <p className="text-lg font-black text-sky-700">+{CAMPAIGNS_METRICS.roi}%</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: API CONFIG */}
                    {activeTab === 'api' && isAutoCampaign && (
                        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
                            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                                <div className="flex items-center gap-3 mb-2">
                                    <Settings className="text-slate-400" size={20} />
                                    <h3 className="text-xl font-bold font-inter text-slate-800">Tích hợp webhook</h3>
                                </div>
                                <p className="text-sm text-slate-500 mb-8 font-medium">Kết nối tự động để nhận khách tiềm năng từ các nền tảng bên ngoài như landing page hoặc WooCommerce.</p>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 mb-3 uppercase tracking-widest">Đường dẫn webhook</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                readOnly
                                                value={webhookUrl}
                                                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-5 py-3.5 text-sm font-mono text-sky-700 outline-none"
                                            />
                                            <button className="p-3.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors shadow-sm" title="Sao chép">
                                                <Copy size={18} />
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-2 font-medium">Phương thức: POST. Kiểu dữ liệu: application/json.</p>
                                    </div>

                                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                                        <p className="text-[10px] font-black text-slate-700 mb-3 uppercase tracking-widest">Mẫu dữ liệu JSON</p>
                                        <pre className="text-xs font-mono text-slate-600 bg-white p-4 rounded-xl border border-slate-100 overflow-x-auto">
                                            {`{
  "name": "Nguyen Van A",
  "phone": "0901234567",
  "email": "email@example.com",
  "source": "landing_page",
  "campaign": "${id || 'Trai_He_2024'}"
}`}
                                        </pre>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <Facebook className="text-blue-600" size={20} />
                                    <h3 className="text-xl font-bold font-inter text-slate-800">API Facebook</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 mb-3 uppercase tracking-widest">Mã Pixel</label>
                                        <input
                                            type="text"
                                            value={fbPixelId}
                                            onChange={(e) => setFbPixelId(e.target.value)}
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-5 py-3.5 text-sm font-medium outline-none transition-all focus:border-sky-500"
                                            placeholder="VD: 1293849182312"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 mb-3 uppercase tracking-widest">Mã truy cập</label>
                                        <input
                                            type="password"
                                            value="********************"
                                            readOnly
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-5 py-3.5 text-sm font-medium outline-none transition-all focus:border-sky-500 opacity-60"
                                        />
                                    </div>
                                </div>
                                <div className="mt-8 flex justify-end">
                                    <button className="px-8 py-3.5 bg-sky-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-sky-700 transition-all shadow-lg shadow-sky-100 flex items-center gap-2">
                                        <Save size={16} /> Lưu cấu hình
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: FORM & QR */}
                    {activeTab === 'form' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500 items-start">
                            {/* Builder Sidebar */}
                            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                                <h3 className="text-[10px] font-black text-slate-400 mb-6 uppercase tracking-widest font-inter">Trường thông tin khách tiềm năng</h3>
                                <div className="space-y-2">
                                    {LEFT_PANEL_CORE_FIELDS.map((field) => (
                                        <div
                                            key={field.id}
                                            draggable={!field.fixed}
                                            onDragStart={(event) => !field.fixed && handleQrFieldDragStart(event, field.id)}
                                            onDragEnd={handleQrFieldDragEnd}
                                            className={`flex items-center justify-between p-3 border rounded-xl transition-colors group ${field.fixed
                                                ? 'bg-sky-50 border-sky-200'
                                                : 'bg-slate-50 border-slate-200 hover:bg-slate-100 cursor-grab active:cursor-grabbing'
                                                } ${draggingQrFieldId === field.id ? 'opacity-60' : ''}`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-slate-700">
                                                    {field.label}
                                                    {field.required ? ' *' : ''}
                                                </span>
                                                {field.fixed && (
                                                    <span className="rounded-md border border-sky-200 bg-sky-100 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-sky-700">
                                                        Cố định
                                                    </span>
                                                )}
                                                {!field.fixed && selectedOptionalQrFieldIds.includes(field.id) && (
                                                    <span className="px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        Đã thêm
                                                    </span>
                                                )}
                                            </div>
                                            <GripVertical size={16} className={field.fixed ? 'text-sky-200' : 'text-slate-300 group-hover:text-slate-400'} />
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-5 pt-5 border-t border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 mb-3 uppercase tracking-widest">Thông tin thêm (Marketing)</p>
                                    <div className="space-y-2">
                                        {LEFT_PANEL_MARKETING_FIELDS.map((field) => (
                                            <div
                                                key={field.id}
                                                draggable
                                                onDragStart={(event) => handleQrFieldDragStart(event, field.id)}
                                                onDragEnd={handleQrFieldDragEnd}
                                                className={`flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors group cursor-grab active:cursor-grabbing ${draggingQrFieldId === field.id ? 'opacity-60' : ''}`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-slate-700">{field.label}</span>
                                                    {selectedOptionalQrFieldIds.includes(field.id) && (
                                                        <span className="px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                            Đã thêm
                                                        </span>
                                                    )}
                                                </div>
                                                <GripVertical size={16} className="text-slate-300 group-hover:text-slate-400" />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <p className="mt-4 text-[11px] leading-5 text-slate-500">
                                    Biểu mẫu QR luôn giữ cố định các trường bắt buộc của cơ hội/khách tiềm năng:
                                    {' '}
                                    <span className="font-bold text-slate-700">Tên khách hàng</span>,
                                    {' '}
                                    <span className="font-bold text-slate-700">Điện thoại</span>
                                    {' '}và
                                    {' '}
                                    <span className="font-bold text-slate-700">Quốc gia mục tiêu</span>.
                                </p>
                                <p className="mt-1 text-[11px] leading-5 text-slate-500">
                                    Trường <span className="font-bold text-slate-700">Cơ sở</span> là tùy chọn, không bắt buộc.
                                </p>
                            </div>

                            {/* Preview Area */}
                            <div className="bg-white p-12 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center">
                                <h2 className="text-xl font-black text-slate-800 mb-6 font-inter">Đăng ký tham gia</h2>
                                <div className="w-full space-y-4">
                                    <div className="rounded-xl border border-sky-100 bg-sky-50 p-3">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-sky-700">Trường bắt buộc cố định</p>
                                    </div>

                                    {FIXED_REQUIRED_QR_FIELDS.map((field) => (
                                        <input
                                            key={field.id}
                                            disabled
                                            placeholder={field.placeholder || field.label}
                                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl text-sm italic text-slate-400"
                                        />
                                    ))}

                                    <div
                                        className="pt-2 border-t border-slate-100 space-y-3"
                                        onDragOver={handleQrPreviewDragOver}
                                        onDrop={handleQrPreviewDrop}
                                    >
                                        <div className={`rounded-xl border-2 border-dashed p-3 transition-colors ${draggingQrFieldId ? 'border-sky-300 bg-sky-50' : 'border-slate-200 bg-slate-50'}`}>
                                            <p className="text-xs font-semibold text-slate-600">
                                                Kéo trường từ cột trái thả vào đây để thêm vào biểu mẫu QR
                                            </p>
                                        </div>

                                        {selectedOptionalQrFields.length > 0 ? (
                                            selectedOptionalQrFields.map((field) => (
                                                <div key={field.id} className="relative">
                                                    <input
                                                        disabled
                                                        placeholder={field.placeholder || field.label}
                                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-xl text-sm italic text-slate-300"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeOptionalQrField(field.id)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-red-500 transition-colors"
                                                        title="Bỏ trường khỏi biểu mẫu QR"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-xs text-slate-400 italic">Chưa có trường tùy chọn nào được thêm.</p>
                                        )}
                                    </div>

                                    <button disabled className="mt-4 w-full rounded-xl bg-sky-600 py-4 font-black uppercase tracking-widest text-white opacity-100 shadow-lg shadow-sky-100">Gửi đăng ký</button>
                                </div>
                            </div>

                            {/* QR Code Panel */}
                            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center">
                                <h3 className="text-[10px] font-black text-slate-400 mb-10 uppercase tracking-widest font-inter">Mã QR & liên kết</h3>
                                <div className="flex flex-col items-center">
                                    <div className="w-48 h-48 bg-white border border-slate-100 rounded-2xl shadow-xl p-4 mb-10 flex items-center justify-center">
                                        <QrCode size={150} className="text-slate-800" strokeWidth={1.5} />
                                    </div>
                                    <button className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-sky-200 bg-white py-3.5 text-[10px] font-black uppercase tracking-widest text-sky-700 transition-all hover:bg-sky-50">
                                        <Download size={16} /> Tải xuống QR
                                    </button>
                                    <p className="text-[10px] font-bold tracking-tight text-slate-400">Quét để mở biểu mẫu đăng ký</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 4: DATA LIST (MULTI-VIEW) */}
                    {activeTab === 'data' && (
                        <div className="flex flex-col gap-6 animate-in fade-in duration-500">
                            {/* Toolbar */}
                            <div className="rounded-[24px] border border-[#e4e7eb] bg-white px-4 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:px-5">
                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                                        <div className="flex flex-wrap items-center gap-2.5">
                                            <h3 className="font-inter text-[22px] font-semibold tracking-tight text-slate-800">Danh sách dữ liệu</h3>
                                            <span className="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700">
                                                {filteredLeads.length}/{leads.length} khách tiềm năng
                                            </span>
                                            {activeFilterCount > 0 && (
                                                <span className="inline-flex items-center rounded-full bg-[#edf8f7] px-2.5 py-1 text-[11px] font-semibold text-[#0f766e]">
                                                    {activeFilterCount} bộ lọc
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setShowManualModal(true)}
                                                className="inline-flex h-10 items-center gap-2 rounded-xl bg-sky-600 px-4 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(56,139,201,0.22)] transition-colors hover:bg-sky-700"
                                            >
                                                <Plus size={16} /> Nhập thủ công
                                            </button>

                                            <div className="inline-flex items-center rounded-xl border border-[#e2e5ea] bg-[#fcfcfd] p-1 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
                                                <button
                                                    type="button"
                                                    onClick={() => importInputRef.current?.click()}
                                                    disabled={importing}
                                                    className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-[#f5f6f8] disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                    <Upload size={15} /> {importing ? 'Đang nhập...' : 'Nhập tệp'}
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={handleExportFilteredLeads}
                                                    className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-[#f5f6f8]"
                                                >
                                                    <Download size={15} /> Xuất Excel
                                                </button>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={handleDownloadTemplate}
                                                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#e2e5ea] bg-white text-slate-500 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-colors hover:bg-sky-50 hover:text-sky-700"
                                                title="Tải file mẫu"
                                            >
                                                <FileDown size={16} />
                                            </button>
                                        </div>

                                        <input
                                            ref={importInputRef}
                                            type="file"
                                            accept=".xlsx,.xls,.csv"
                                            className="hidden"
                                            onChange={handleImportFileChange}
                                        />
                                    </div>

                                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                                        <div className="grid flex-1 gap-3 xl:grid-cols-[minmax(260px,1fr)_minmax(0,1.6fr)]">
                                            <label className="relative block">
                                                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    className="h-10 w-full rounded-xl border border-[#e2e5ea] bg-[#fbfbfc] pl-10 pr-4 text-sm text-slate-700 outline-none shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-all placeholder:text-slate-400 focus:border-sky-300 focus:bg-white focus:shadow-[0_0_0_3px_rgba(56,139,201,0.12)]"
                                                    placeholder="Tìm tên, số điện thoại, email..."
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                />
                                            </label>

                                            <div className="flex flex-wrap items-center gap-1 rounded-2xl bg-[#f3f4f6] p-1">
                                                <CompactToolbarSelect
                                                    icon={Filter}
                                                    value={statusFilter}
                                                    onChange={setStatusFilter}
                                                    options={[
                                                        { value: 'all', label: 'Trạng thái' },
                                                        ...LEAD_STATUS_OPTIONS.map((status) => ({ value: status, label: status }))
                                                    ]}
                                                />
                                                <CompactToolbarSelect
                                                    icon={Database}
                                                    value={sourceFilter}
                                                    onChange={setSourceFilter}
                                                    options={[
                                                        { value: 'all', label: 'Nguồn' },
                                                        ...sourceOptions.map((source) => ({ value: source, label: source }))
                                                    ]}
                                                />
                                                <CompactToolbarSelect
                                                    icon={CheckCircle2}
                                                    value={verificationFilter}
                                                    onChange={(value) => setVerificationFilter(value as LeadVerificationFilter)}
                                                    options={[
                                                        { value: 'all', label: 'Xác thực' },
                                                        ...LEAD_VERIFICATION_OPTIONS.filter((option) => option.value !== 'all')
                                                    ]}
                                                />
                                                <CompactToolbarSelect
                                                    icon={TrendingUp}
                                                    value={sortMode}
                                                    onChange={(value) => setSortMode(value as LeadSortMode)}
                                                    options={LEAD_SORT_OPTIONS}
                                                    className="md:max-w-[180px]"
                                                />
                                            </div>
                                        </div>

                                        <div className="inline-flex items-center rounded-xl border border-[#e2e5ea] bg-white p-1 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
                                            {DATA_VIEW_OPTIONS.map((option) => (
                                                <button
                                                    key={option.id}
                                                    type="button"
                                                    onClick={() => setViewMode(option.id)}
                                                    className={`inline-flex h-9 w-9 items-center justify-center rounded-lg transition-all ${viewMode === option.id
                                                        ? 'bg-sky-600 text-white shadow-[0_6px_14px_rgba(56,139,201,0.22)]'
                                                        : 'text-slate-500 hover:bg-sky-50 hover:text-sky-700'
                                                        }`}
                                                    title={option.title}
                                                    aria-label={option.title}
                                                >
                                                    <option.icon size={16} />
                                                    <span className="sr-only">{option.title}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {activeFilterPills.length > 0 && (
                                        <div className="flex flex-wrap items-center gap-2">
                                            {activeFilterPills.map((pill) => (
                                                <button
                                                    key={pill.key}
                                                    type="button"
                                                    onClick={pill.onRemove}
                                                    className="inline-flex items-center gap-2 rounded-full border border-[#e2e5ea] bg-[#fbfbfc] px-2.5 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:bg-white"
                                                >
                                                    {pill.label}
                                                    <X size={12} />
                                                </button>
                                            ))}

                                            <button
                                                type="button"
                                                onClick={resetDataFilters}
                                                className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-semibold text-sky-700 transition-colors hover:bg-sky-50"
                                            >
                                                Xóa tất cả
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* View Content */}
                            <div className="flex-1">
                                {renderDataView()}
                            </div>

                            <div className="p-4 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest">
                                Hiển thị {filteredLeads.length}/{leads.length} kết quả
                            </div>
                        </div>
                    )}

                </div>
            </div>

            {showManualModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        onClick={() => {
                            setShowManualModal(false);
                            resetManualLead();
                        }}
                    ></div>
                    <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Nhập thủ công khách tiềm năng</h3>
                            <button
                                onClick={() => {
                                    setShowManualModal(false);
                                    resetManualLead();
                                }}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            <div>
                                <label className="mb-1.5 block text-xs font-bold text-slate-600">Họ tên *</label>
                                <input
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-sky-500"
                                    value={manualLead.name}
                                    onChange={(e) => setManualLead(prev => ({ ...prev, name: e.target.value }))}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="mb-1.5 block text-xs font-bold text-slate-600">Điện thoại *</label>
                                    <input
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-sky-500"
                                        value={manualLead.phone}
                                        onChange={(e) => setManualLead(prev => ({ ...prev, phone: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Email</label>
                                    <input
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-sky-500"
                                        value={manualLead.email}
                                        onChange={(e) => setManualLead(prev => ({ ...prev, email: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="mb-1.5 block text-xs font-bold text-slate-600">Trạng thái</label>
                                    <select
                                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-500"
                                        value={manualLead.status}
                                        onChange={(e) => setManualLead(prev => ({ ...prev, status: normalizeLeadStatus(e.target.value) }))}
                                    >
                                        {LEAD_STATUS_OPTIONS.map(status => (
                                            <option key={status} value={status}>{status}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-xs font-bold text-slate-600">Nguồn</label>
                                    <input
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-sky-500"
                                        value={manualLead.source}
                                        onChange={(e) => setManualLead(prev => ({ ...prev, source: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <label className="flex items-center gap-2 text-sm text-slate-700 font-medium cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={manualLead.verified}
                                    onChange={(e) => setManualLead(prev => ({ ...prev, verified: e.target.checked }))}
                                    className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                                />
                                Xác thực khách tiềm năng
                            </label>
                        </div>

                        <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                            <button
                                onClick={() => {
                                    setShowManualModal(false);
                                    resetManualLead();
                                }}
                                className="px-4 py-2 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleAddManualLead}
                                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-sky-700"
                            >
                                Lưu khách
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CampaignDetails;

