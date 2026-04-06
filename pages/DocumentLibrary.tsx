import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FileText,
    FileSpreadsheet,
    File as FileIcon,
    Search,
    Plus,
    Filter,
    Download,
    Eye,
    History,
    Calendar,
    Building2,
    Users,
    CheckCircle2,
    XCircle,
    FileCheck,
    Globe,
    Upload,
    X,
    ChevronDown,
    ChevronRight,
    FolderOpen,
    MoreVertical,
    FileImage,
    ArrowLeft,
    LogOut,
    User as UserIcon,
    Briefcase
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { APP_NAME } from '../constants';

// --- Types ---

type DocumentType = 'pdf' | 'word' | 'excel' | 'image';
type DocumentStatus = 'active' | 'expiring' | 'expired';
type DocumentApprovalStatus = 'draft' | 'approved';
type ScopeType = 'company' | 'branch' | 'department';

interface DocumentVersion {
    version: string;
    updatedAt: string;
    updatedBy: string;
    note: string;
    fileUrl?: string;
}

interface Document {
    id: string;
    documentCode?: string;
    name: string;
    type: DocumentType;
    version: string;
    issueDate: string;
    effectiveDate?: string;
    expirationDate?: string;
    uploadDate: string;
    status: DocumentStatus;
    approvalStatus?: DocumentApprovalStatus;
    department: string;
    executingDepts: string[];
    ownerName?: string;
    tags?: string[];
    scope: ScopeType;
    category: string;
    contentText?: string;
    replacementOfId?: string;
    replacedById?: string;
    isLatestVersion?: boolean;
    description?: string;
    versions: DocumentVersion[];
    fileUrl?: string;
}

// --- Mock Data ---

const DEPARTMENTS = [
    'Ban Giám đốc',
    'Hành chính - Nhân sự',
    'Tài chính - Kế toán',
    'Kinh doanh (Sales)',
    'Marketing',
    'Đào tạo',
    'Công nghệ thông tin'
];

const CATEGORIES = [
    'Quy trình',
    'Quy định',
    'Chính sách',
    'Biểu mẫu',
    'Hướng dẫn sử dụng',
    'Quyết định'
];

const MOCK_DOCUMENTS: Document[] = [
    {
        id: '1',
        name: 'Quy trình thu học phí',
        type: 'pdf',
        version: '2.0',
        issueDate: '2026-01-01',
        uploadDate: '2025-12-28',
        status: 'active',
        department: 'Tài chính - Kế toán',
        executingDepts: ['Tài chính - Kế toán', 'Kinh doanh (Sales)'],
        scope: 'company',
        category: 'Quy trình',
        versions: [
            { version: '2.0', updatedAt: '2025-12-28', updatedBy: 'Admin', note: 'Cập nhật mức thu mới 2026' },
            { version: '1.0', updatedAt: '2024-01-01', updatedBy: 'Admin', note: 'Ban hành lần đầu' }
        ]
    },
    {
        id: '2',
        name: 'Quy định đào tạo 2025',
        type: 'word',
        version: '1.1',
        issueDate: '2025-10-15',
        expirationDate: '2026-10-15',
        uploadDate: '2025-10-10',
        status: 'active',
        department: 'Đào tạo',
        executingDepts: ['Đào tạo', 'Giáo viên'],
        scope: 'company',
        category: 'Quy định',
        versions: [
            { version: '1.1', updatedAt: '2025-10-10', updatedBy: 'Manager', note: 'Điều chỉnh giờ dạy' }
        ]
    },
    {
        id: '3',
        name: 'Biểu mẫu nhập học 2026',
        type: 'excel',
        version: '1.0',
        issueDate: '2026-02-01',
        expirationDate: '2026-12-31',
        uploadDate: '2026-01-30',
        status: 'active',
        department: 'Kinh doanh (Sales)',
        executingDepts: ['Kinh doanh (Sales)', 'Tài chính - Kế toán'],
        scope: 'branch',
        category: 'Biểu mẫu',
        versions: [
            { version: '1.0', updatedAt: '2026-01-30', updatedBy: 'Sale Lead', note: 'Mới' }
        ]
    },
    {
        id: '4',
        name: 'Chính sách hoa hồng Q1/2026',
        type: 'pdf',
        version: '1.0',
        issueDate: '2026-01-01',
        expirationDate: '2026-03-31',
        uploadDate: '2025-12-25',
        status: 'expired',
        department: 'Ban Giám đốc',
        executingDepts: ['Kinh doanh (Sales)'],
        scope: 'company',
        category: 'Chính sách',
        versions: [
            { version: '1.0', updatedAt: '2025-12-25', updatedBy: 'CEO', note: 'Áp dụng Q1' }
        ]
    },
    {
        id: '5',
        name: 'Quyết định bổ nhiệm TPKD',
        type: 'image',
        version: '1.0',
        issueDate: '2025-11-01',
        uploadDate: '2025-11-01',
        status: 'active',
        department: 'Hành chính - Nhân sự',
        executingDepts: ['Hành chính - Nhân sự', 'Kinh doanh (Sales)'],
        scope: 'company',
        category: 'Quyết định',
        versions: []
    }
];

const LIBRARY_DEPARTMENTS = [
    'Ban Giám đốc',
    'Kinh doanh',
    'Marketing',
    'Đào tạo',
    'Tài chính',
    'Nhân sự'
];

const LIBRARY_CATEGORIES = [
    'Quy trình',
    'Quy định',
    'Chính sách',
    'Biểu mẫu',
    'Hướng dẫn'
];

const normalizeDepartment = (value: string) => {
    if (value.includes('Ban Gi')) return 'Ban Giám đốc';
    if (value.includes('Kinh doanh')) return 'Kinh doanh';
    if (value.includes('Marketing')) return 'Marketing';
    if (value.includes('o t') || value.includes('Đào tạo')) return 'Đào tạo';
    if (value.includes('TÃ') || value.includes('Tài chính')) return 'Tài chính';
    if (value.includes('NhÃ¢n') || value.includes('Nhân sự')) return 'Nhân sự';
    return value;
};

const normalizeCategory = (value: string) => {
    if (value.includes('Quy tr')) return 'Quy trình';
    if (value.includes('Quy Ä') || value.includes('Quy định')) return 'Quy định';
    if (value.includes('ChÃ') || value.includes('Chính sách')) return 'Chính sách';
    if (value.includes('Biá') || value.includes('Biểu mẫu')) return 'Biểu mẫu';
    if (value.includes('HÆ°') || value.includes('Hướng dẫn')) return 'Hướng dẫn';
    if (value.includes('Quyáº¿t')) return 'Quy định';
    return value;
};

const normalizeText = (value: string) =>
    value
        .replace('Quy trÃ¬nh', 'Quy trình')
        .replace('thu há»c phÃ­', 'thu học phí')
        .replace('Quy Ä‘á»‹nh', 'Quy định')
        .replace('Ä‘Ã o táº¡o', 'đào tạo')
        .replace('Biá»ƒu máº«u', 'Biểu mẫu')
        .replace('nháº­p há»c', 'nhập học')
        .replace('ChÃ­nh sÃ¡ch', 'Chính sách')
        .replace('hoa há»“ng', 'hoa hồng')
        .replace('Quyáº¿t Ä‘á»‹nh bá»• nhiá»‡m TPKD', 'Hướng dẫn onboard nhân sự mới');

const NORMALIZED_DOCUMENTS: Document[] = [
    ...MOCK_DOCUMENTS.map((doc): Document => ({
        ...doc,
        documentCode:
            doc.id === '1' ? 'DOC-TC-001' :
            doc.id === '2' ? 'DOC-DT-015' :
            doc.id === '3' ? 'DOC-KD-024' :
            doc.id === '4' ? 'DOC-BGD-003' :
            'DOC-NS-009',
        name: normalizeText(doc.name),
        department: normalizeDepartment(doc.department),
        executingDepts: doc.executingDepts.map(normalizeDepartment),
        category: normalizeCategory(doc.category),
        effectiveDate:
            doc.id === '1' ? '2026-01-05' :
            doc.id === '2' ? '2025-11-01' :
            doc.id === '3' ? '2026-02-05' :
            doc.id === '4' ? '2026-01-01' :
            '2025-11-01',
        ownerName:
            doc.id === '1' ? 'Lê Thu Hà' :
            doc.id === '2' ? 'Nguyễn Minh Anh' :
            doc.id === '3' ? 'Trần Quốc Bảo' :
            doc.id === '4' ? 'Phạm Hoàng Long' :
            'Vũ Thu Trang',
        tags: [normalizeCategory(doc.category), normalizeDepartment(doc.department)],
        status: (
            doc.id === '2' || doc.id === '3' ? 'expiring' :
            doc.id === '4' ? 'expired' :
            'active'
        ) as DocumentStatus,
        approvalStatus: (doc.id === '3' ? 'draft' : 'approved') as DocumentApprovalStatus,
        contentText:
            doc.id === '1' ? 'Quy trình thu học phí áp dụng cho toàn hệ thống, bao gồm cách ghi nhận công nợ, xác nhận đợt thanh toán và phối hợp giữa kinh doanh với tài chính.' :
            doc.id === '2' ? 'Quy định đào tạo 2025 quy định khung lịch học, nguyên tắc bảo lưu, điều kiện mở lớp và trách nhiệm của học vụ, đào tạo, giáo viên.' :
            doc.id === '3' ? 'Biểu mẫu nhập học 2026 bao gồm form tiếp nhận học viên, checklist hồ sơ, xác nhận lớp học và điều khoản thanh toán.' :
            doc.id === '4' ? 'Chính sách hoa hồng Q1/2026 mô tả cơ cấu doanh số, mức thưởng theo quý và các trường hợp không áp dụng.' :
            'Hướng dẫn onboard nhân sự mới gồm quy trình tiếp nhận, checklist bàn giao tài khoản và tài liệu đào tạo hội nhập.',
        replacementOfId: doc.id === '1' ? 'doc-1-v1' : undefined,
        isLatestVersion: true,
        versions: doc.versions.map((version) => ({
            ...version,
            note: normalizeText(version.note)
        }))
    })),
    {
        id: 'doc-1-v1',
        documentCode: 'DOC-TC-001',
        name: 'Quy trình thu học phí',
        type: 'pdf',
        version: '1.0',
        issueDate: '2024-01-01',
        effectiveDate: '2024-01-05',
        expirationDate: '2025-12-31',
        uploadDate: '2024-01-01',
        status: 'expired',
        approvalStatus: 'approved',
        department: 'Tài chính',
        executingDepts: ['Tài chính', 'Kinh doanh'],
        ownerName: 'Lê Thu Hà',
        tags: ['Quy trình', 'Tài chính'],
        scope: 'company',
        category: 'Quy trình',
        contentText: 'Phiên bản cũ của quy trình thu học phí. Nội dung này đã được thay thế sau khi cập nhật quy định đối soát và xác nhận công nợ năm 2026.',
        replacedById: '1',
        isLatestVersion: false,
        versions: [
            { version: '1.0', updatedAt: '2024-01-01', updatedBy: 'Admin', note: 'Ban hành lần đầu' }
        ]
    }
];

// --- Components ---

const DocumentLibrary = () => {
    // Auth & Navigation
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    // Selection state
    const [selectedDept, setSelectedDept] = useState<string | 'all'>('all');
    const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');
    const [isDeptSectionOpen, setIsDeptSectionOpen] = useState(false);
    const [isCategorySectionOpen, setIsCategorySectionOpen] = useState(false);
    const [expandedDepts, setExpandedDepts] = useState<string[]>([]);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<'all' | DocumentStatus>('all');
    const [selectedScope, setSelectedScope] = useState<'all' | ScopeType>('all');
    const [dateFieldFilter, setDateFieldFilter] = useState<'issueDate' | 'effectiveDate'>('effectiveDate');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [showVersionHistory, setShowVersionHistory] = useState(false);

    // Modal state
    const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isUploadOpen, setIsUploadOpen] = useState(false);

    const toggleDept = (dept: string) => {
        setExpandedDepts((prev) =>
            prev.includes(dept) ? prev.filter((item) => item !== dept) : [...prev, dept]
        );
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleBackToModules = () => {
        navigate('/module-selection');
    };

    const documentsById = React.useMemo(
        () => Object.fromEntries(NORMALIZED_DOCUMENTS.map((doc) => [doc.id, doc])),
        []
    );

    // Filter Logic
    const filteredDocs = React.useMemo(() => NORMALIZED_DOCUMENTS.filter((doc) => {
        if (!showVersionHistory && doc.isLatestVersion === false) return false;

        const matchSearch = `${doc.name} ${doc.documentCode || ''}`.toLowerCase().includes(searchQuery.toLowerCase());
        const matchDept = selectedDept === 'all' || doc.department === selectedDept;
        const matchCategory = selectedCategory === 'all' || doc.category === selectedCategory;
        const matchStatus = selectedStatus === 'all' || doc.status === selectedStatus;
        const matchScope = selectedScope === 'all' || doc.scope === selectedScope;

        const rawDate = dateFieldFilter === 'issueDate' ? doc.issueDate : (doc.effectiveDate || '');
        const matchDateFrom = !dateFrom || (rawDate && rawDate >= dateFrom);
        const matchDateTo = !dateTo || (rawDate && rawDate <= dateTo);

        return matchSearch && matchDept && matchCategory && matchStatus && matchScope && matchDateFrom && matchDateTo;
    }), [dateFieldFilter, dateFrom, dateTo, searchQuery, selectedCategory, selectedDept, selectedScope, selectedStatus, showVersionHistory]);

    const getFileIcon = (type: DocumentType) => {
        switch (type) {
            case 'pdf': return <FileIcon className="text-red-500" size={18} />;
            case 'word': return <FileText className="text-blue-500" size={18} />;
            case 'excel': return <FileSpreadsheet className="text-green-500" size={18} />;
            case 'image': return <FileImage className="text-purple-500" size={18} />;
            default: return <FileIcon className="text-gray-500" size={18} />;
        }
    };

    const getStatusBadge = (status: DocumentStatus) => {
        switch (status) {
            case 'active':
                return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">Còn hiệu lực</span>;
            case 'expired':
                return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100">Hết hiệu lực</span>;
            default:
                return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">Nháp</span>;
        }
    };

    const getDocumentStatusBadge = (status: DocumentStatus) => {
        if (status === 'active') {
            return <span className="inline-flex items-center rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">Đang áp dụng</span>;
        }
        if (status === 'expiring') {
            return <span className="inline-flex items-center rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">Sắp hết hiệu lực</span>;
        }
        return <span className="inline-flex items-center rounded-full border border-rose-100 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">Hết hiệu lực</span>;
    };

    const getDocumentStatusLabel = (status: DocumentStatus) =>
        status === 'active' ? 'Đang áp dụng' : status === 'expiring' ? 'Sắp hết hiệu lực' : 'Hết hiệu lực';

    const getScopeLabel = (scope: ScopeType) =>
        scope === 'company' ? 'Toàn công ty' : scope === 'branch' ? 'Chi nhánh / Cơ sở' : 'Phòng ban nội bộ';

    const getApprovalBadge = (approvalStatus?: DocumentApprovalStatus) =>
        approvalStatus === 'draft'
            ? <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">Nháp</span>
            : <span className="inline-flex items-center rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">Duyệt</span>;

    const selectedDocReplacement = selectedDoc?.replacedById ? documentsById[selectedDoc.replacedById] : null;
    const selectedDocReplaces = selectedDoc?.replacementOfId ? documentsById[selectedDoc.replacementOfId] : null;

    return (
        <div className="flex h-screen w-full bg-[#f8fafc]">

            {/* --- CUSTOM SIDEBAR (Replaces Main Sidebar) --- */}
            <aside className="w-64 bg-white border-r border-slate-200 flex flex-col z-50 shadow-sm">

                {/* 1. Header (Logo) */}
                <div className="flex items-center gap-2 p-6 border-b border-slate-100 h-[88px]">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold cursor-pointer" onClick={() => navigate('/')}>
                        U
                    </div>
                    <span className="text-xl font-bold text-slate-900 cursor-pointer" onClick={() => navigate('/')}>{APP_NAME}</span>
                </div>

                {/* 2. Navigation */}
                <div className="flex-1 overflow-y-auto py-4 px-2 custom-scrollbar">
                    <div className="mb-5">
                        <button
                            type="button"
                            onClick={() => setIsDeptSectionOpen((prev) => !prev)}
                            className="flex w-full items-center justify-between rounded-lg px-3 pb-2 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 transition-colors hover:text-slate-600"
                        >
                            <span>Theo phòng ban</span>
                            <ChevronDown size={16} className={`transition-transform ${isDeptSectionOpen ? 'rotate-180' : ''}`} />
                        </button>
                        <div className="hidden px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                            Theo phòng ban
                        </div>
                        <div className={isDeptSectionOpen ? 'space-y-1' : 'hidden'}>
                            <button
                                onClick={() => setSelectedDept('all')}
                                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
                                    selectedDept === 'all' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                                }`}
                            >
                                <Globe size={18} className={selectedDept === 'all' ? 'text-blue-600' : 'text-slate-400'} />
                                <span>Tất cả</span>
                            </button>
                            {LIBRARY_DEPARTMENTS.map((dept) => (
                                <button
                                    key={dept}
                                    onClick={() => setSelectedDept(dept)}
                                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
                                        selectedDept === dept ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                                    }`}
                                >
                                    <Briefcase size={18} className={selectedDept === dept ? 'text-blue-600' : 'text-slate-400'} />
                                    <span>{dept}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mb-2">
                        <button
                            type="button"
                            onClick={() => setIsCategorySectionOpen((prev) => !prev)}
                            className="flex w-full items-center justify-between rounded-lg px-3 pb-2 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 transition-colors hover:text-slate-600"
                        >
                            <span>Theo loại tài liệu</span>
                            <ChevronDown size={16} className={`transition-transform ${isCategorySectionOpen ? 'rotate-180' : ''}`} />
                        </button>
                        <div className="hidden px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                            Theo loại tài liệu
                        </div>
                        <div className={isCategorySectionOpen ? 'space-y-1' : 'hidden'}>
                            <button
                                onClick={() => setSelectedCategory('all')}
                                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
                                    selectedCategory === 'all' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                                }`}
                            >
                                <FolderOpen size={18} className={selectedCategory === 'all' ? 'text-blue-600' : 'text-slate-400'} />
                                <span>Tất cả</span>
                            </button>
                            {LIBRARY_CATEGORIES.map((category) => (
                                <button
                                    key={category}
                                    onClick={() => setSelectedCategory(category)}
                                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
                                        selectedCategory === category ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                                    }`}
                                >
                                    <FileCheck size={18} className={selectedCategory === category ? 'text-blue-600' : 'text-slate-400'} />
                                    <span>{category}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="hidden">
                    {/* All Docs Link */}
                    <div
                        onClick={() => { setSelectedDept('all'); setSelectedCategory('all'); }}
                        className={`
                            flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm font-bold mb-2 transition-colors uppercase tracking-wide
                            ${selectedDept === 'all'
                                ? 'bg-blue-50 text-blue-700'
                                : 'text-slate-700 hover:bg-slate-50'}
                        `}
                    >
                        <Globe size={18} />
                        <span>Tất cả phòng ban</span>
                    </div>

                    {/* Departments Tree */}
                    <div className="space-y-1">
                        {DEPARTMENTS.map(dept => {
                            const isExpanded = expandedDepts.includes(dept);
                            const isActiveDept = selectedDept === dept;

                            // Department Item (Level 1)
                            return (
                                <div key={dept}>
                                    <div
                                        className={`
                                            group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer text-sm transition-colors
                                            ${isActiveDept && selectedCategory === 'all'
                                                ? 'bg-blue-50 text-blue-700 font-bold'
                                                : 'text-slate-700 font-semibold hover:bg-slate-50 hover:text-slate-900'}
                                        `}
                                        onClick={() => {
                                            setSelectedDept(dept);
                                            setSelectedCategory('all');
                                        }}
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            {/* Icon mapping could be improved here, using generic Briefcase for now */}
                                            <Briefcase size={18} className={isActiveDept ? 'text-blue-600' : 'text-slate-400'} />
                                            <span className="truncate uppercase text-xs">{dept}</span>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); toggleDept(dept); }}
                                            className="p-1 rounded-md hover:bg-slate-200 text-slate-400"
                                        >
                                            <ChevronRight size={14} className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                        </button>
                                    </div>

                                    {/* Categories (Level 2) - Indented */}
                                    {isExpanded && (
                                        <div className="ml-4 pl-4 border-l border-slate-200 space-y-0.5 mt-1 mb-2">
                                            {CATEGORIES.map(cat => {
                                                const isActiveCat = isActiveDept && selectedCategory === cat;
                                                // Only show categories that have docs or show all? 
                                                // User requested "Tree View", implying structure. Let's show all standard categories.

                                                return (
                                                    <div
                                                        key={cat}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedDept(dept);
                                                            setSelectedCategory(cat);
                                                        }}
                                                        className={`
                                                            flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer text-sm transition-colors
                                                            ${isActiveCat
                                                                ? 'bg-blue-50 text-blue-600 font-medium'
                                                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}
                                                        `}
                                                    >
                                                        {/* Optional tiny dot for visual hierarchy */}
                                                        {isActiveCat && <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>}
                                                        <span className="truncate">{cat}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    </div>
                </div>

                {/* 3. Footer (User) */}
                {user && (
                    <div className="p-4 border-t border-slate-100">
                        <div className="flex items-center gap-3 mb-4 px-2">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 overflow-hidden">
                                {user.avatar ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" /> : <UserIcon size={20} />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-900 truncate">{user.name}</p>
                                <p className="text-xs text-slate-500 truncate">{user.role}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleBackToModules}
                            className="w-full mb-2 flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium transition-colors"
                        >
                            <ArrowLeft size={18} />
                            <span>Back</span>
                        </button>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                        >
                            <LogOut size={18} />
                            <span>Đăng xuất</span>
                        </button>
                    </div>
                )}
            </aside>

            {/* --- RIGHT CONTENT --- */}
            <div className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden">

                {/* Header Actions */}
                <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between gap-4 bg-white h-[88px]">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                            {selectedDept === 'all' ? 'Thư viện & Quy trình' : selectedDept}
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            {selectedCategory !== 'all' ? selectedCategory : 'Danh sách văn bản và tài liệu nội bộ'}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Tìm kiếm văn bản..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 transition-all"
                            />
                        </div>
                        <button
                            onClick={() => setIsUploadOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition-all"
                        >
                            <Upload size={16} /> <span className="hidden sm:inline">Tạo tài liệu</span>
                        </button>
                    </div>
                </div>

                {/* Filters Status Bar */}
                <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-3.5">
                    <div className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,2.2fr)_minmax(0,0.95fr)_minmax(0,1.05fr)_minmax(190px,1.15fr)] items-center gap-2.5">
                        <select value={selectedDept} onChange={(event) => setSelectedDept(event.target.value as typeof selectedDept)} className="min-w-0 w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-700">
                            <option value="all">Phòng ban</option>
                            {LIBRARY_DEPARTMENTS.map((department) => <option key={department} value={department}>{department}</option>)}
                        </select>
                        <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value as typeof selectedCategory)} className="min-w-0 w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-700">
                            <option value="all">Loại tài liệu</option>
                            {LIBRARY_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
                        </select>
                        <div className="grid min-w-0 grid-cols-[minmax(0,0.95fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2.5">
                            <select value={dateFieldFilter} onChange={(event) => setDateFieldFilter(event.target.value as 'issueDate' | 'effectiveDate')} className="min-w-0 w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-700">
                                <option value="effectiveDate">Ngày hiệu lực</option>
                                <option value="issueDate">Ngày ban hành</option>
                            </select>
                            <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="min-w-0 w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-700" />
                            <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="min-w-0 w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-700" />
                        </div>
                        <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value as 'all' | DocumentStatus)} className="min-w-0 w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-700">
                            <option value="all">Trạng thái</option>
                            <option value="active">Đang áp dụng</option>
                            <option value="expiring">Sắp hết hiệu lực</option>
                            <option value="expired">Hết hiệu lực</option>
                        </select>
                        <select value={selectedScope} onChange={(event) => setSelectedScope(event.target.value as 'all' | ScopeType)} className="min-w-0 w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-700">
                            <option value="all">Phạm vi áp dụng</option>
                            <option value="company">Toàn công ty</option>
                            <option value="branch">Chi nhánh / Cơ sở</option>
                            <option value="department">Phòng ban nội bộ</option>
                        </select>
                        <label className="inline-flex min-w-0 w-full items-center gap-2 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-700">
                            <input type="checkbox" checked={!showVersionHistory} onChange={(event) => setShowVersionHistory(!event.target.checked)} />
                            Chỉ hiện bản mới nhất
                        </label>
                    </div>
                </div>

                {/* Table Content */}
                <div className="flex-1 overflow-auto bg-gray-50 p-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[500px] flex flex-col">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50/80 sticky top-0 z-10 backdrop-blur-sm">
                                <tr className="border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    <th className="px-6 py-4 w-16 text-center">STT</th>
                                    <th className="px-6 py-4 w-[30%]">Tên tài liệu</th>
                                    <th className="px-6 py-4">Ban hành ngày</th>
                                    <th className="px-6 py-4">Hiệu lực từ</th>
                                    <th className="px-6 py-4">Phạm vi áp dụng</th>
                                    <th className="px-6 py-4">Người chịu trách nhiệm</th>
                                    <th className="px-6 py-4 text-center">Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredDocs.map((doc, index) => (
                                    <tr
                                        key={doc.id}
                                        className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                                        onClick={() => { setSelectedDoc(doc); setIsDetailOpen(true); }}
                                    >
                                        <td className="px-6 py-4 text-center text-sm font-semibold text-slate-500">{index + 1}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-start gap-4">
                                                <div className="mt-1 p-2.5 bg-gray-50 rounded-lg group-hover:bg-white border border-gray-100 group-hover:border-gray-200 transition-all shrink-0 text-slate-600">
                                                    {getFileIcon(doc.type)}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors text-sm line-clamp-2 leading-relaxed" title={doc.name}>
                                                        {doc.name}
                                                    </p>
                                                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 font-mono">
                                                            v{doc.version}
                                                        </span>
                                                        {(doc.tags || []).map((tag) => (
                                                            <span key={tag} className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                                                                {tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 text-sm text-gray-700">
                                                <Calendar size={14} className="text-gray-400" />
                                                <span>{doc.issueDate}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 text-sm text-gray-700">
                                                <History size={14} className="text-gray-400" />
                                                <span>{doc.effectiveDate || '--'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1.5">
                                                <span className="inline-flex items-center gap-1 text-sm font-medium text-slate-700">
                                                    <Globe size={14} className="text-slate-400" />
                                                    {getScopeLabel(doc.scope)}
                                                </span>
                                                <span className="text-xs text-slate-500">{doc.department}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-sm font-medium text-gray-900">{doc.ownerName || '--'}</span>
                                                <span className="text-xs text-gray-500">{doc.executingDepts.join(', ')}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {getDocumentStatusBadge(doc.status)}
                                        </td>
                                    </tr>
                                ))}
                                {filteredDocs.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="bg-gray-50 p-4 rounded-full mb-3">
                                                    <Search size={24} className="text-gray-300" />
                                                </div>
                                                <p>Không tìm thấy văn bản phù hợp</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            {/* --- DETAIL MODAL --- */}
            {isDetailOpen && selectedDoc && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setIsDetailOpen(false)}></div>
                    <div className="relative flex max-h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4 rounded-t-3xl">
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Chi tiết tài liệu</div>
                                <div className="mt-1 flex items-center gap-2">
                                    {getApprovalBadge(selectedDoc.approvalStatus)}
                                    {selectedDoc.approvalStatus === 'approved' ? <span className="text-sm text-slate-500">Đang ở chế độ duyệt, không thể chỉnh sửa.</span> : <span className="text-sm text-slate-500">Có thể cập nhật khi còn ở chế độ nháp.</span>}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setShowVersionHistory((prev) => !prev)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50">
                                    {showVersionHistory ? 'Ẩn lịch sử phiên bản' : 'Xem lịch sử phiên bản'}
                                </button>
                                <button onClick={() => setIsUploadOpen(true)} className="rounded-lg border border-blue-600 bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
                                    Tạo tài liệu
                                </button>
                                <button disabled={selectedDoc.approvalStatus === 'approved'} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40">
                                    Chỉnh sửa
                                </button>
                                <button onClick={() => setIsDetailOpen(false)} className="p-2 text-slate-500 hover:bg-slate-200 rounded-full transition-colors">
                                    <X size={22} />
                                </button>
                            </div>
                        </div>

                        <div className="min-h-0 overflow-y-auto">
                        <div className="grid gap-0 xl:grid-cols-[300px_minmax(0,1fr)_280px]">
                            <aside className="border-r border-slate-200 bg-white px-6 py-6">
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Mã tài liệu</div>
                                    <div className="mt-2 text-sm font-semibold text-slate-900">{selectedDoc.documentCode || '--'}</div>
                                    <div className="mt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Tên tài liệu</div>
                                    <h2 className="mt-2 text-2xl font-bold leading-tight text-slate-950">{selectedDoc.name}</h2>
                                    <div className="mt-4 flex flex-wrap items-center gap-2">
                                        <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-mono text-slate-700">v{selectedDoc.version}</span>
                                        {getApprovalBadge(selectedDoc.approvalStatus)}
                                    </div>
                                    <div className="mt-4">{getDocumentStatusBadge(selectedDoc.status)}</div>
                                </div>
                            </aside>

                            <main className="bg-slate-50 px-6 py-6">
                                {selectedDocReplacement ? (
                                    <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                                        <span>Tài liệu này đã được thay thế bởi phiên bản mới ({selectedDocReplacement.version}).</span>
                                        <button onClick={() => setSelectedDoc(selectedDocReplacement)} className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 font-medium text-amber-900 hover:bg-amber-100">
                                            Mở bản mới
                                        </button>
                                    </div>
                                ) : null}

                                {selectedDocReplaces ? (
                                    <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                                        <span>Tài liệu này thay thế cho phiên bản cũ v{selectedDocReplaces.version}.</span>
                                        <button onClick={() => setSelectedDoc(selectedDocReplaces)} className="rounded-lg border border-sky-300 bg-white px-3 py-1.5 font-medium text-sky-900 hover:bg-sky-100">
                                            Mở bản cũ
                                        </button>
                                    </div>
                                ) : null}

                                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                                    <div className="mb-4 flex items-center justify-between gap-3">
                                        <div>
                                            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Nội dung chính</div>
                                            <div className="mt-1 text-sm text-slate-500">Xem trực tiếp tài liệu, không cần tải file.</div>
                                        </div>
                                        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                                            {selectedDoc.type.toUpperCase()}
                                        </div>
                                    </div>

                                    {selectedDoc.type === 'pdf' ? (
                                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                                            <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-500">PDF Preview</div>
                                            <div className="grid min-h-[560px] place-items-center px-8 py-10">
                                                <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                                                    <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                                                        <div>
                                                            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{selectedDoc.documentCode}</div>
                                                            <h3 className="mt-1 text-xl font-bold text-slate-950">{selectedDoc.name}</h3>
                                                        </div>
                                                        <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-mono text-slate-700">v{selectedDoc.version}</span>
                                                    </div>
                                                    <div className="mt-6 space-y-4 text-sm leading-7 text-slate-700">
                                                        <p>{selectedDoc.contentText}</p>
                                                        <p>Tài liệu hiển thị trực tiếp trong màn chi tiết để người dùng đọc nhanh mà không cần tải xuống.</p>
                                                        <p>Các phiên bản cũ chỉ nên mở khi bật xem lịch sử phiên bản.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <article className="min-h-[560px] rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm leading-7 text-slate-700 whitespace-pre-line">
                                            {selectedDoc.contentText}
                                        </article>
                                    )}
                                </div>

                                {showVersionHistory ? (
                                    <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                                        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
                                            <History size={16} /> Lịch sử phiên bản
                                        </div>
                                        <div className="space-y-4">
                                            {selectedDoc.versions.map((version, index) => (
                                                <div key={`${selectedDoc.id}-${version.version}`} className="flex gap-4">
                                                    <div className="flex flex-col items-center">
                                                        <div className={`h-3 w-3 rounded-full border-2 ${index === 0 ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'}`}></div>
                                                        {index !== selectedDoc.versions.length - 1 ? <div className="my-1 h-full w-0.5 bg-slate-200"></div> : null}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-bold text-slate-900">Phiên bản {version.version}</span>
                                                            <span className="text-xs text-slate-500">{version.updatedAt}</span>
                                                        </div>
                                                        <p className="mt-1 text-sm text-slate-600">{version.note}</p>
                                                        <p className="mt-1 text-xs text-slate-400">Cập nhật bởi: {version.updatedBy}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}
                            </main>

                            <aside className="border-l border-slate-200 bg-white px-6 py-6">
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Thông tin phụ</div>
                                    <div className="mt-4 space-y-4">
                                        <DetailRow icon={<Building2 size={14} />} label="Phòng ban" value={selectedDoc.department} />
                                        <DetailRow icon={<Globe size={14} />} label="Phạm vi" value={getScopeLabel(selectedDoc.scope)} />
                                        <DetailRow icon={<History size={14} />} label="Ngày hiệu lực" value={selectedDoc.effectiveDate || '--'} />
                                        <DetailRow icon={<History size={14} />} label="Ngày hết hiệu lực" value={selectedDoc.expirationDate || 'Không thời hạn'} />
                                        <DetailRow icon={<UserIcon size={14} />} label="Người phụ trách" value={selectedDoc.ownerName || '--'} />
                                    </div>
                                </div>
                            </aside>
                        </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- UPLOAD MODAL --- */}
            {isUploadOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setIsUploadOpen(false)}></div>
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-900">Tạo tài liệu</h2>
                            <button onClick={() => setIsUploadOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
                        </div>
                        <div className="p-6 overflow-y-auto max-h-[80vh]">
                            <form className="space-y-5">
                                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                                    Chế độ tạo tài liệu hỗ trợ <span className="font-semibold text-slate-900">Nháp</span> và <span className="font-semibold text-slate-900">Duyệt</span>. Tài liệu ở chế độ duyệt sẽ không được chỉnh sửa trực tiếp.
                                </div>
                                <div className="grid grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-gray-700">Tên tài liệu <span className="text-red-500">*</span></label>
                                        <input type="text" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500" placeholder="Nhập tên tài liệu..." />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-gray-700">Version</label>
                                        <input type="text" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500" placeholder="VD: 2.0" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-gray-700">Phòng ban</label>
                                        <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500">
                                            {LIBRARY_DEPARTMENTS.map((department) => <option key={department}>{department}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-gray-700">Loại tài liệu</label>
                                        <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500">
                                            {LIBRARY_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-gray-700">Tag</label>
                                        <input type="text" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="VD: SOP, Nội bộ, Đào tạo" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-gray-700">Người chịu trách nhiệm</label>
                                        <input type="text" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Nhập tên người phụ trách" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-gray-700">Ban hành ngày</label>
                                        <input type="date" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-gray-700">Hiệu lực từ</label>
                                        <input type="date" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-gray-700">Hết hiệu lực ngày</label>
                                        <input type="date" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-5">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-gray-700">Phạm vi áp dụng</label>
                                        <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500">
                                            <option value="company">Toàn công ty</option>
                                            <option value="branch">Chi nhánh / Cơ sở</option>
                                            <option value="department">Phòng ban nội bộ</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-gray-700">Trạng thái</label>
                                        <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500">
                                            <option value="active">Đang áp dụng</option>
                                            <option value="expiring">Sắp hết hiệu lực</option>
                                            <option value="expired">Hết hiệu lực</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-gray-700">Chế độ tài liệu</label>
                                        <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500">
                                            <option value="draft">Nháp</option>
                                            <option value="approved">Duyệt</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">File đính kèm</label>
                                    <div className="group cursor-pointer rounded-xl border-2 border-dashed border-gray-300 p-6 text-center transition-colors hover:bg-gray-50">
                                        <div className="mb-3 inline-flex rounded-full bg-blue-50 p-3 text-blue-600 transition-transform group-hover:scale-110">
                                            <Upload size={20} />
                                        </div>
                                        <p className="text-sm font-medium text-gray-900">Click để tải lên hoặc kéo thả file vào đây</p>
                                        <p className="mt-1 text-xs text-gray-500">Hỗ trợ PDF, Word, Excel, ảnh. Tối đa 10MB</p>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
                            <button onClick={() => setIsUploadOpen(false)} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100">Hủy</button>
                            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm">Tạo tài liệu</button>
                        </div>
                        </div>
                </div>
            )}
        </div>
    );
};

const DetailRow = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) => (
    <div className="flex items-start gap-3">
        <div className="mt-0.5 text-gray-400">{icon}</div>
        <div>
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-sm font-medium text-gray-900">{value}</p>
        </div>
    </div>
);

export default DocumentLibrary;
