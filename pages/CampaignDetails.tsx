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
    BarChart,
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
    X
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

const LEAD_STATUS_OPTIONS = ['MÃ¡Â»â€ºi', 'Ã„ÂÃƒÂ£ liÃƒÂªn hÃ¡Â»â€¡', 'Ã„ÂÃ¡ÂºÂ¡t chuÃ¡ÂºÂ©n', 'ChÃ¡Â»â€˜t', 'HÃ¡Â»Â§y'].map((status) =>
    decodeMojibakeText(status)
);

type LeadRecord = {
    id: number;
    name: string;
    phone: string;
    email: string;
    status: string;
    verified: boolean;
    source: string;
};

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
        name: 'Tráº¡i HÃ¨ 2024',
        channel: 'Facebook Lead Form',
        status: 'Running',
        campaignType: 'auto',
        apiConnected: true
    },
    camp_02: {
        name: 'KhÃ³a há»c IELTS Online',
        channel: 'Google Ads',
        status: 'Paused',
        campaignType: 'auto',
        apiConnected: true
    },
    camp_03: {
        name: 'Há»™i tháº£o Du há»c Äá»©c',
        channel: 'Event/Offline',
        status: 'Running',
        campaignType: 'manual',
        apiConnected: false
    },
    camp_04: {
        name: 'TikTok Brand Awareness',
        channel: 'TikTok',
        status: 'Running',
        campaignType: 'auto',
        apiConnected: true
    },
    camp_05: {
        name: 'Email Marketing - KhÃ¡ch cÅ©',
        channel: 'Email',
        status: 'Running',
        campaignType: 'manual',
        apiConnected: false
    }
};

const IMPORT_TEMPLATE_ROWS = [
    {
        ho_ten: 'Nguyen Van A',
        dien_thoai: '0901234567',
        email: 'a@example.com',
        trang_thai: LEAD_STATUS_OPTIONS[0],
        xac_thuc: 'TRUE',
        nguon: 'Facebook'
    },
    {
        ho_ten: 'Tran Thi B',
        dien_thoai: '0912345678',
        email: 'b@example.com',
        trang_thai: LEAD_STATUS_OPTIONS[1],
        xac_thuc: 'FALSE',
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
    { id: 'name', label: 'MÃ´ táº£ / TÃªn khÃ¡ch hÃ ng', placeholder: 'Há» vÃ  tÃªn *', required: true, fixed: true, group: 'core' },
    { id: 'phone', label: 'Äiá»‡n thoáº¡i', placeholder: 'Sá»‘ Ä‘iá»‡n thoáº¡i *', required: true, fixed: true, group: 'core' },
    { id: 'targetCountry', label: 'Quá»‘c gia má»¥c tiÃªu', placeholder: '-- Chá»n quá»‘c gia má»¥c tiÃªu --', required: true, fixed: true, group: 'core' },
    { id: 'market', label: 'CÆ¡ sá»Ÿ', placeholder: '-- Chá»n cÆ¡ sá»Ÿ --', required: false, fixed: false, group: 'core' },
    { id: 'company', label: 'ÄÆ¡n vá»‹ liÃªn há»‡', placeholder: 'TÃªn Ä‘Æ¡n vá»‹ liÃªn há»‡', required: false, fixed: false, group: 'core' },
    { id: 'address', label: 'Äá»‹a chá»‰', placeholder: 'Sá»‘ nhÃ , Ä‘Æ°á»ng...', required: false, fixed: false, group: 'core' },
    { id: 'product', label: 'Sáº£n pháº©m', placeholder: '-- Chá»n sáº£n pháº©m --', required: false, fixed: false, group: 'core' },
    { id: 'email', label: 'Email', placeholder: 'email@example.com', required: false, fixed: false, group: 'core' },
    { id: 'owner', label: 'Phá»¥ trÃ¡ch', placeholder: '-- Sale phá»¥ trÃ¡ch --', required: false, fixed: false, group: 'core' },
    { id: 'status', label: 'Tráº¡ng thÃ¡i', placeholder: 'Má»›i', required: false, fixed: false, group: 'core' },
    { id: 'tags', label: 'Tags', placeholder: '-- Chá»n Tag --', required: false, fixed: false, group: 'core' },
    { id: 'campaign', label: 'Chiáº¿n dá»‹ch', placeholder: '', required: false, fixed: false, group: 'marketing' },
    { id: 'source', label: 'Nguá»“n', placeholder: 'Hotline', required: false, fixed: false, group: 'marketing' },
    { id: 'channel', label: 'KÃªnh', placeholder: '-- Chá»n kÃªnh --', required: false, fixed: false, group: 'marketing' },
    { id: 'medium', label: 'Medium', placeholder: '-- Chá»n --', required: false, fixed: false, group: 'marketing' },
    { id: 'referredBy', label: 'NgÆ°á»i GT', placeholder: '', required: false, fixed: false, group: 'marketing' }
];

const FIXED_REQUIRED_QR_FIELDS = QR_LEAD_FIELDS.filter(field => field.fixed && field.required);
const LEFT_PANEL_CORE_FIELDS = QR_LEAD_FIELDS.filter(field => field.group === 'core');
const LEFT_PANEL_MARKETING_FIELDS = QR_LEAD_FIELDS.filter(field => field.group === 'marketing');
const OPTIONAL_QR_FIELDS = QR_LEAD_FIELDS.filter(field => !field.fixed);
const DEFAULT_SELECTED_OPTIONAL_QR_FIELDS = ['email'];

// Mock Leads
const INITIAL_LEADS: LeadRecord[] = Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    name: decodeMojibakeText(`NguyÃ¡Â»â€¦n VÃ„Æ’n Lead ${i + 1}`),
    phone: `090${Math.floor(Math.random() * 10000000)}`,
    email: `lead${i + 1}@example.com`,
    status: LEAD_STATUS_OPTIONS[Math.floor(Math.random() * LEAD_STATUS_OPTIONS.length)],
    verified: Math.random() > 0.3,
    source: 'Facebook'
}));

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
            name: id || 'Campaign',
            channel: 'Facebook Lead Form',
            status: 'Running',
            campaignType: 'auto',
            apiConnected: true
        };
    }, [id, location.state]);
    const isAutoCampaign = campaignMeta.campaignType === 'auto';

    useEffect(() => {
        if (!isAutoCampaign && activeTab === 'api') {
            setActiveTab('dashboard');
        }
    }, [activeTab, isAutoCampaign]);
    // View Mode for Data Tab
    const [viewMode, setViewMode] = useState<'table' | 'kanban' | 'funnel'>('table');

    // API Config State
    const [webhookUrl, setWebhookUrl] = useState('https://api.educrm.com/wh/v1/camp_123');
    const [fbPixelId, setFbPixelId] = useState('1293849182312');

    // State for Leads (Drag & Drop)
    const [leads, setLeads] = useState<LeadRecord[]>(INITIAL_LEADS);
    const [draggedItem, setDraggedItem] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
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
        source: 'Facebook'
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
        if (['new', 'moi', 'má»›i'].includes(normalized)) return LEAD_STATUS_OPTIONS[0];
        if (['contacted', 'lien he', 'da lien he', 'Ä‘Ã£ liÃªn há»‡'].includes(normalized)) return LEAD_STATUS_OPTIONS[1];
        if (['qualified', 'dat chuan', 'Ä‘áº¡t chuáº©n'].includes(normalized)) return LEAD_STATUS_OPTIONS[2];
        if (['won', 'chot', 'chá»‘t'].includes(normalized)) return LEAD_STATUS_OPTIONS[3];
        if (['cancelled', 'canceled', 'huy', 'há»§y'].includes(normalized)) return LEAD_STATUS_OPTIONS[4];
        return LEAD_STATUS_OPTIONS[0];
    };

    const parseVerified = (value: string) => {
        const normalized = decodeMojibakeText(value).trim().toLowerCase();
        return ['1', 'true', 'yes', 'y', 'verified', 'co', 'cÃ³', 'da', 'Ä‘Ã£'].includes(normalized);
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

    const filteredLeads = leads.filter(lead => {
        const keyword = searchTerm.trim().toLowerCase();
        if (!keyword) return true;
        return [lead.name, lead.phone, lead.email, lead.status, lead.source]
            .join(' ')
            .toLowerCase()
            .includes(keyword);
    });

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
            source: 'Facebook'
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
            source: manualLead.source.trim() || 'Manual'
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
                alert(decodeMojibakeText('File import khÃƒÂ´ng cÃƒÂ³ dÃ¡Â»Â¯ liÃ¡Â»â€¡u.'));
                return;
            }

            const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[firstSheet], { defval: '' });
            if (!rows.length) {
                alert(decodeMojibakeText('File import khÃƒÂ´ng cÃƒÂ³ dÃƒÂ²ng dÃ¡Â»Â¯ liÃ¡Â»â€¡u.'));
                return;
            }

            const parsedRows = rows
                .map((row) => {
                    const name = getCellValue(row, ['ho_ten', 'HoTen', 'name', 'Name', 'full_name']);
                    const phone = normalizeLeadPhone(getCellValue(row, ['dien_thoai', 'DienThoai', 'phone', 'Phone', 'so_dien_thoai', 'sdt']));
                    const email = getCellValue(row, ['email', 'Email']);
                    const source = getCellValue(row, ['nguon', 'Nguon', 'source', 'Source']) || 'Import';
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
                alert(decodeMojibakeText('KhÃƒÆ’Ã‚Â´ng cÃƒÆ’Ã‚Â³ dÃƒÆ’Ã‚Â²ng hÃƒÂ¡Ã‚Â»Ã‚Â£p lÃƒÂ¡Ã‚Â»Ã¢â‚¬Â¡. SÃƒÂ¡Ã‚Â»Ã¢â‚¬Ëœ Ã„â€˜iÃ¡Â»â€¡n thoÃ¡ÂºÂ¡i phÃ¡ÂºÂ£i gÃƒÂ¡Ã‚Â»Ã¢â‚¬Å“m Ã„â€˜ÃƒÂºng 10 sÃ¡Â»â€˜ vÃƒÂ  bÃ¡ÂºÂ¯t Ã„â€˜Ã¡ÂºÂ§u bÃ¡ÂºÂ±ng 0.'));
                return;
            }

            if (!parsedRows.length) {
                alert(decodeMojibakeText('KhÃƒÂ´ng cÃƒÂ³ dÃƒÂ²ng hÃ¡Â»Â£p lÃ¡Â»â€¡. CÃ¡ÂºÂ§n tÃ¡Â»â€˜i thiÃ¡Â»Æ’u hÃ¡Â»Â tÃƒÂªn vÃƒÂ  sÃ¡Â»â€˜ Ã„â€˜iÃ¡Â»â€¡n thoÃ¡ÂºÂ¡i.'));
                return;
            }

            addLeads(parsedRows);
            if (skippedRows > 0) {
                alert(decodeMojibakeText(`Ãƒâ€žÃ‚ÂÃƒÆ’Ã‚Â£ import ${parsedRows.length} lead. BÃ¡Â»Â qua ${skippedRows} dÃƒÂ²ng do thiÃ¡ÂºÂ¿u tÃƒÂªn hoÃ¡ÂºÂ·c SÃ„ÂT khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡.`));
                return;
            }
            alert(decodeMojibakeText(`Ã„ÂÃƒÂ£ import ${parsedRows.length} lead.`));
        } catch (error) {
            console.error(error);
            alert(decodeMojibakeText('Import thÃ¡ÂºÂ¥t bÃ¡ÂºÂ¡i. Vui lÃƒÂ²ng kiÃ¡Â»Æ’m tra file mÃ¡ÂºÂ«u.'));
        } finally {
            setImporting(false);
            event.target.value = '';
        }
    };

    const handleDownloadTemplate = () => {
        const worksheet = XLSX.utils.json_to_sheet(IMPORT_TEMPLATE_ROWS);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
        XLSX.writeFile(workbook, `campaign_data_template_${id || 'campaign'}.xlsx`);
    };

    // Tabs Configuration
    const tabs = [
        { id: 'dashboard', label: 'TÃ¡Â»â€¢ng quan', icon: LayoutDashboard },
        { id: 'api', label: 'CÃ¡ÂºÂ¥u hÃƒÂ¬nh API', icon: Settings },
        { id: 'form', label: 'Form & QR Code', icon: FileText },
        { id: 'data', label: 'Danh sÃƒÂ¡ch Data', icon: Database },
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
        switch (viewMode) {
            // --- TABLE VIEW (DEFAULT) ---
            case 'table':
                return (
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
                        <table className="w-full text-left text-sm font-inter">
                            <thead className="bg-white text-slate-400 font-bold border-b border-slate-100">
                                <tr>
                                    <th className="px-8 py-5 text-[10px] uppercase tracking-widest">HÃ¡Â»Â tÃƒÂªn</th>
                                    <th className="px-8 py-5 text-[10px] uppercase tracking-widest">Ã„ÂiÃ¡Â»â€¡n thoÃ¡ÂºÂ¡i</th>
                                    <th className="px-8 py-5 text-[10px] uppercase tracking-widest">Email</th>
                                    <th className="px-8 py-5 text-center text-[10px] uppercase tracking-widest">XÃƒÂ¡c thÃ¡Â»Â±c</th>
                                    <th className="px-8 py-5 text-center text-[10px] uppercase tracking-widest">TrÃ¡ÂºÂ¡ng thÃƒÂ¡i</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredLeads.map(lead => (
                                    <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-8 py-4 font-bold text-slate-800 tracking-tight">{lead.name}</td>
                                        <td className="px-8 py-4 text-slate-600 font-medium tracking-tight whitespace-nowrap">{lead.phone}</td>
                                        <td className="px-8 py-4 text-slate-400 tracking-tight">{lead.email}</td>
                                        <td className="px-8 py-4">
                                            <div className="flex justify-center">
                                                {lead.verified ? (
                                                    <span className="text-green-600 font-bold text-[10px] flex items-center gap-1.5 uppercase tracking-tight">
                                                        <CheckCircle2 size={12} strokeWidth={3} /> Verified
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
                                                <p className="font-bold text-slate-800 text-sm leading-tight group-hover:text-blue-600 transition-colors uppercase tracking-tight">{lead.name}</p>
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
                                    <div className={`h-24 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 text-[10px] font-black uppercase tracking-widest transition-all ${draggedItem !== null ? 'bg-blue-50/50 border-blue-200 text-blue-400 opacity-100' : 'opacity-0 h-0 p-0 border-0'
                                        }`}>
                                        ThÃ¡ÂºÂ£ vÃƒÂ o Ã„â€˜ÃƒÂ¢y
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                );
            }

            // --- FUNNEL VIEW ---
            case 'funnel': {
                const funnelData = [
                    { label: 'TÃ¡Â»â€¢ng Lead (New)', value: 100, color: 'bg-blue-600 shadow-blue-100' },
                    { label: 'Ã„ÂÃƒÂ£ liÃƒÂªn hÃ¡Â»â€¡ (Contacted)', value: 60, color: 'bg-indigo-600 shadow-indigo-100' },
                    { label: 'HÃ¡ÂºÂ¹n gÃ¡ÂºÂ·p/Ã„ÂÃ¡ÂºÂ¡t chuÃ¡ÂºÂ©n', value: 30, color: 'bg-purple-600 shadow-purple-100' },
                    { label: 'ChÃ¡Â»â€˜t (Won)', value: 12, color: 'bg-emerald-600 shadow-emerald-100' }
                ];
                return (
                    <div className="flex justify-center items-center py-12 bg-white rounded-3xl shadow-sm border border-slate-200 animate-in zoom-in-95 duration-500">
                        <div className="w-full max-w-xl space-y-4">
                            {funnelData.map((step, idx) => (
                                <div key={idx} className="flex flex-col items-center group">
                                    <div
                                        className={`h-16 flex items-center justify-center text-white font-black rounded-2xl relative shadow-lg transition-all group-hover:scale-105 ${step.color}`}
                                        style={{ width: `${60 + step.value * 0.4}%`, minWidth: '200px' }}
                                    >
                                        {step.value}%
                                    </div>
                                    {idx < funnelData.length - 1 && (
                                        <div className="h-6 border-l-2 border-dashed border-slate-200 my-1"></div>
                                    )}
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{step.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            }
            default:
                return null;
        }
    };

    return decodeMojibakeReactNode(
        <div className="flex flex-col h-screen bg-[#f8fafc] text-[#111418] font-sans overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/campaigns')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">ChiÃ¡ÂºÂ¿n dÃ¡Â»â€¹ch: {campaignMeta.name}</h1>
                        <p className="text-xs text-slate-500 font-medium">
                            {campaignMeta.channel} Ã¢â‚¬Â¢ {isAutoCampaign ? 'ChiÃ¡ÂºÂ¿n dÃ¡Â»â€¹ch tÃ¡Â»Â± Ã„â€˜Ã¡Â»â„¢ng' : 'ChiÃ¡ÂºÂ¿n dÃ¡Â»â€¹ch thÃ†Â°Ã¡Â»Âng'} Ã¢â‚¬Â¢ <span className={`font-bold ${campaignMeta.status === 'Running' ? 'text-green-600' : 'text-slate-500'}`}>{campaignMeta.status === 'Running' ? 'Ã„Âang chÃ¡ÂºÂ¡y' : campaignMeta.status}</span>
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
                                ? 'border-blue-600 text-blue-600'
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
            <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-slate-50/50 custom-scrollbar">
                <div className="max-w-[1600px] mx-auto">

                    {/* TAB 1: DASHBOARD */}
                    {activeTab === 'dashboard' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Quick Stats Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {[
                                    { label: 'TÃ¡Â»â€NG DATA', value: CAMPAIGNS_METRICS.totalLeads.toLocaleString(), color: 'text-slate-900' },
                                    { label: '% XÃƒÂC THÃ¡Â»Â°C', value: `${CAMPAIGNS_METRICS.validRate}%`, color: 'text-blue-600' },
                                    { label: '% CONTACTED', value: `${CAMPAIGNS_METRICS.contactedRate}%`, color: 'text-indigo-600' },
                                    { label: 'TÃ¡Â»Â¶ LÃ¡Â»â€  CHÃ¡Â»ÂT', value: `${CAMPAIGNS_METRICS.conversionRate}%`, color: 'text-green-600' },
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
                                    <TrendingUp size={20} className="text-slate-500" /> BiÃ¡Â»Æ’u Ã„â€˜Ã¡Â»â€œ hiÃ¡Â»â€¡u quÃ¡ÂºÂ£ ROI
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
                                        <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">Chi phÃƒÂ­ (Budget)</p>
                                        <p className="text-lg font-black text-slate-900">{CAMPAIGNS_METRICS.budget.toLocaleString()}Ã„â€˜</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">Doanh thu (Revenue)</p>
                                        <p className="text-lg font-black text-green-600">{CAMPAIGNS_METRICS.revenue.toLocaleString()}Ã„â€˜</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">LÃ¡Â»Â£i nhuÃ¡ÂºÂ­n (ROI)</p>
                                        <p className="text-lg font-black text-blue-600">+{CAMPAIGNS_METRICS.roi}%</p>
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
                                    <h3 className="text-xl font-bold font-inter text-slate-800">Webhook Integration</h3>
                                </div>
                                <p className="text-sm text-slate-500 mb-8 font-medium">KÃ¡ÂºÂ¿t nÃ¡Â»â€˜i tÃ¡Â»Â± Ã„â€˜Ã¡Â»â„¢ng nhÃ¡ÂºÂ­n Lead tÃ¡Â»Â« cÃƒÂ¡c nÃ¡Â»Ân tÃ¡ÂºÂ£ng bÃƒÂªn ngoÃƒÂ i (Landing Page, Woocommerce...)</p>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 mb-3 uppercase tracking-widest">Webhook URL</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                readOnly
                                                value={webhookUrl}
                                                className="flex-1 bg-slate-50 border border-slate-200 px-5 py-3.5 rounded-xl text-sm font-mono text-blue-600 outline-none"
                                            />
                                            <button className="p-3.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors shadow-sm" title="Copy">
                                                <Copy size={18} />
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-2 font-medium">PhÃ†Â°Ã†Â¡ng thÃ¡Â»Â©c: POST. Content-Type: application/json.</p>
                                    </div>

                                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                                        <p className="text-[10px] font-black text-slate-700 mb-3 uppercase tracking-widest">MÃ¡ÂºÂ«u dÃ¡Â»Â¯ liÃ¡Â»â€¡u JSON:</p>
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
                                    <h3 className="text-xl font-bold font-inter text-slate-800">Facebook API</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 mb-3 uppercase tracking-widest">Pixel ID</label>
                                        <input
                                            type="text"
                                            value={fbPixelId}
                                            onChange={(e) => setFbPixelId(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 px-5 py-3.5 rounded-xl text-sm outline-none focus:border-blue-500 transition-all font-medium"
                                            placeholder="VD: 1293849182312"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 mb-3 uppercase tracking-widest">Access Token</label>
                                        <input
                                            type="password"
                                            value="********************"
                                            readOnly
                                            className="w-full bg-slate-50 border border-slate-200 px-5 py-3.5 rounded-xl text-sm outline-none focus:border-blue-500 transition-all font-medium opacity-60"
                                        />
                                    </div>
                                </div>
                                <div className="mt-8 flex justify-end">
                                    <button className="px-8 py-3.5 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center gap-2">
                                        <Save size={16} /> LÃ†Â°u cÃ¡ÂºÂ¥u hÃƒÂ¬nh
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
                                <h3 className="text-[10px] font-black text-slate-400 mb-6 uppercase tracking-widest font-inter">TrÃ†Â°Ã¡Â»Âng thÃƒÂ´ng tin Lead</h3>
                                <div className="space-y-2">
                                    {LEFT_PANEL_CORE_FIELDS.map((field) => (
                                        <div
                                            key={field.id}
                                            draggable={!field.fixed}
                                            onDragStart={(event) => !field.fixed && handleQrFieldDragStart(event, field.id)}
                                            onDragEnd={handleQrFieldDragEnd}
                                            className={`flex items-center justify-between p-3 border rounded-xl transition-colors group ${field.fixed
                                                ? 'bg-blue-50 border-blue-200'
                                                : 'bg-slate-50 border-slate-200 hover:bg-slate-100 cursor-grab active:cursor-grabbing'
                                                } ${draggingQrFieldId === field.id ? 'opacity-60' : ''}`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-slate-700">
                                                    {field.label}
                                                    {field.required ? ' *' : ''}
                                                </span>
                                                {field.fixed && (
                                                    <span className="px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md bg-blue-100 text-blue-700 border border-blue-200">
                                                        CÃ¡Â»â€˜ Ã„â€˜Ã¡Â»â€¹nh
                                                    </span>
                                                )}
                                                {!field.fixed && selectedOptionalQrFieldIds.includes(field.id) && (
                                                    <span className="px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        Ã„ÂÃƒÂ£ thÃƒÂªm
                                                    </span>
                                                )}
                                            </div>
                                            <GripVertical size={16} className={field.fixed ? 'text-blue-200' : 'text-slate-300 group-hover:text-slate-400'} />
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-5 pt-5 border-t border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 mb-3 uppercase tracking-widest">ThÃƒÂ´ng tin thÃƒÂªm (Marketing)</p>
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
                                                            Ã„ÂÃƒÂ£ thÃƒÂªm
                                                        </span>
                                                    )}
                                                </div>
                                                <GripVertical size={16} className="text-slate-300 group-hover:text-slate-400" />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <p className="mt-4 text-[11px] leading-5 text-slate-500">
    Form QR luÃ´n cá»‘ Ä‘á»‹nh cÃ¡c trÆ°á»ng báº¯t buá»™c cá»§a CÆ¡ há»™i/Lead: <span className="font-bold text-slate-700">TÃªn khÃ¡ch hÃ ng</span>, <span className="font-bold text-slate-700">Äiá»‡n thoáº¡i</span> vÃ  <span className="font-bold text-slate-700">Quá»‘c gia má»¥c tiÃªu</span>.
</p>
<p className="mt-1 text-[11px] leading-5 text-slate-500">
    TrÆ°á»ng <span className="font-bold text-slate-700">CÆ¡ sá»Ÿ</span> lÃ  tÃ¹y chá»n, khÃ´ng báº¯t buá»™c.
</p>
                            </div>

                            {/* Preview Area */}
                            <div className="bg-white p-12 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center">
                                <h2 className="text-xl font-black text-slate-800 mb-6 font-inter">Ã„ÂÃ„Æ’ng kÃƒÂ½ tham gia</h2>
                                <div className="w-full space-y-4">
                                    <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-700">TrÃ†Â°Ã¡Â»Âng bÃ¡ÂºÂ¯t buÃ¡Â»â„¢c cÃ¡Â»â€˜ Ã„â€˜Ã¡Â»â€¹nh</p>
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
                                        <div className={`rounded-xl border-2 border-dashed p-3 transition-colors ${draggingQrFieldId ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-slate-50'}`}>
                                            <p className="text-xs font-semibold text-slate-600">
                                                KÃƒÂ©o trÃ†Â°Ã¡Â»Âng tÃ¡Â»Â« cÃ¡Â»â„¢t trÃƒÂ¡i thÃ¡ÂºÂ£ vÃƒÂ o Ã„â€˜ÃƒÂ¢y Ã„â€˜Ã¡Â»Æ’ thÃƒÂªm vÃƒÂ o form QR
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
                                                        title="BÃ¡Â»Â trÃ†Â°Ã¡Â»Âng khÃ¡Â»Âi form QR"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-xs text-slate-400 italic">ChÃ†Â°a cÃƒÂ³ trÃ†Â°Ã¡Â»Âng tÃƒÂ¹y chÃ¡Â»Ân nÃƒÂ o Ã„â€˜Ã†Â°Ã¡Â»Â£c thÃƒÂªm.</p>
                                        )}
                                    </div>

                                    <button disabled className="w-full py-4 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest shadow-lg shadow-blue-100 mt-4 opacity-100">GÃ¡Â»Â­i Ã„â€˜Ã„Æ’ng kÃƒÂ½</button>
                                </div>
                            </div>

                            {/* QR Code Panel */}
                            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center">
                                <h3 className="text-[10px] font-black text-slate-400 mb-10 uppercase tracking-widest font-inter">QR Code & Link</h3>
                                <div className="flex flex-col items-center">
                                    <div className="w-48 h-48 bg-white border border-slate-100 rounded-2xl shadow-xl p-4 mb-10 flex items-center justify-center">
                                        <QrCode size={150} className="text-slate-800" strokeWidth={1.5} />
                                    </div>
                                    <button className="w-full py-3.5 bg-white border border-blue-200 text-blue-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-50 transition-all flex items-center justify-center gap-2 mb-4">
                                        <Download size={16} /> TÃ¡ÂºÂ£i xuÃ¡Â»â€˜ng QR
                                    </button>
                                    <p className="text-[10px] text-slate-400 font-bold tracking-tight">QuÃƒÂ©t Ã„â€˜Ã¡Â»Æ’ mÃ¡Â»Å¸ form Ã„â€˜Ã„Æ’ng kÃƒÂ½</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 4: DATA LIST (MULTI-VIEW) */}
                    {activeTab === 'data' && (
                        <div className="flex flex-col gap-6 animate-in fade-in duration-500">
                            {/* Toolbar */}
                            <div className="bg-white p-4 lg:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap justify-between items-center gap-4">
                                <div className="flex items-center gap-4">
                                    <h3 className="font-bold text-lg text-slate-800 mr-4 font-inter tracking-tight">Danh sÃƒÂ¡ch Data</h3>

                                    <div className="flex bg-slate-100 p-1 rounded-lg gap-1 border border-slate-200">
                                        {[
                                            { id: 'table', icon: TableIcon, title: 'BÃ¡ÂºÂ£ng (MÃ¡ÂºÂ·c Ã„â€˜Ã¡Â»â€¹nh)' },
                                            { id: 'kanban', icon: LayoutGrid, title: 'Kanban (Quy trÃƒÂ¬nh)' },
                                            { id: 'funnel', icon: BarChart, title: 'PhÃ¡Â»â€¦u (BÃƒÂ¡o cÃƒÂ¡o)' },
                                        ].map(v => (
                                            <button
                                                key={v.id}
                                                onClick={() => setViewMode(v.id as any)}
                                                className={`p-2 rounded-md transition-all ${viewMode === v.id ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                                                title={v.title}
                                            >
                                                <v.icon size={18} />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-3 justify-end">
                                    <button
                                        onClick={() => setShowManualModal(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-sm transition-colors"
                                    >
                                        <Plus size={16} /> NhÃ¡ÂºÂ­p tay
                                    </button>

                                    <button
                                        onClick={() => importInputRef.current?.click()}
                                        disabled={importing}
                                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 font-bold hover:bg-slate-50 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <Upload size={16} /> {importing ? 'Ã„Âang import...' : 'Import'}
                                    </button>

                                    <button
                                        onClick={handleDownloadTemplate}
                                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 font-bold hover:bg-slate-50 shadow-sm transition-colors"
                                    >
                                        <FileDown size={16} /> XuÃ¡ÂºÂ¥t file mÃ¡ÂºÂ«u
                                    </button>

                                    <input
                                        ref={importInputRef}
                                        type="file"
                                        accept=".xlsx,.xls,.csv"
                                        className="hidden"
                                        onChange={handleImportFileChange}
                                    />

                                    <div className="relative">
                                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400 w-64 transition-all"
                                            placeholder="TÃƒÂ¬m tÃƒÂªn, sÃ¡Â»â€˜ Ã„â€˜iÃ¡Â»â€¡n thoÃ¡ÂºÂ¡i..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>

                                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 font-bold hover:bg-slate-50 shadow-sm">
                                        <Filter size={16} /> BÃ¡Â»â„¢ lÃ¡Â»Âc
                                    </button>
                                    <button className="text-sm text-blue-600 font-black uppercase tracking-widest hover:underline px-3 flex items-center gap-2">
                                        XuÃ¡ÂºÂ¥t Excel
                                    </button>
                                </div>
                            </div>

                            {/* View Content */}
                            <div className="flex-1">
                                {renderDataView()}
                            </div>

                            {viewMode === 'table' && (
                                <div className="p-4 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest">HiÃ¡Â»Æ’n thÃ¡Â»â€¹ {filteredLeads.length}/{leads.length} kÃ¡ÂºÂ¿t quÃ¡ÂºÂ£</div>
                            )}
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
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">NhÃ¡ÂºÂ­p tay lead</h3>
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
                                <label className="block text-xs font-bold text-slate-600 mb-1.5">HÃ¡Â»Â tÃƒÂªn *</label>
                                <input
                                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500"
                                    value={manualLead.name}
                                    onChange={(e) => setManualLead(prev => ({ ...prev, name: e.target.value }))}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Ã„ÂiÃ¡Â»â€¡n thoÃ¡ÂºÂ¡i *</label>
                                    <input
                                        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500"
                                        value={manualLead.phone}
                                        onChange={(e) => setManualLead(prev => ({ ...prev, phone: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Email</label>
                                    <input
                                        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500"
                                        value={manualLead.email}
                                        onChange={(e) => setManualLead(prev => ({ ...prev, email: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1.5">TrÃ¡ÂºÂ¡ng thÃƒÂ¡i</label>
                                    <select
                                        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500 bg-white"
                                        value={manualLead.status}
                                        onChange={(e) => setManualLead(prev => ({ ...prev, status: normalizeLeadStatus(e.target.value) }))}
                                    >
                                        {LEAD_STATUS_OPTIONS.map(status => (
                                            <option key={status} value={status}>{status}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1.5">NguÃ¡Â»â€œn</label>
                                    <input
                                        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500"
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
                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                XÃƒÂ¡c thÃ¡Â»Â±c lead
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
                                HÃ¡Â»Â§y
                            </button>
                            <button
                                onClick={handleAddManualLead}
                                className="px-4 py-2 rounded-lg text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                            >
                                LÃ†Â°u lead
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CampaignDetails;

