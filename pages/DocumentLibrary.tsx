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
import { useSystemCatalogOptions } from '../hooks/useSystemCatalog';

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
}

const CATEGORIES = [
    'Quy trình',
    'Quy định',
    'Chính sách',
    'Biểu mẫu',
    'Hướng dẫn sử dụng',
    'Quyết định'
];

// Mock đã loại bỏ — danh sách tài liệu sẽ load từ storage / module quản trị.
const MOCK_DOCUMENTS: Document[] = [];

const LIBRARY_DEPARTMENTS = [
    'Ban Giám đốc',
    'Kinh doanh (Sales)',
    'Marketing',
    'Tài chính (Finance)',
    'Đào tạo (Education)',
    'Du học (Study Abroad)',
    'Hành chính - Nhân sự'
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
    if (value.includes('Kinh doanh')) return 'Kinh doanh (Sales)';
    if (value.includes('Marketing')) return 'Marketing';
    if (value.includes('o t') || value.includes('Đào tạo')) return 'Đào tạo (Education)';
    if (value.includes('Tài chính')) return 'Tài chính (Finance)';
    if (value.includes('Du h') || value.includes('Du học')) return 'Du học (Study Abroad)';
    if (value.includes('Nhân') || value.includes('Nhân sự')) return 'Hành chính - Nhân sự';
    return value;
};

const normalizeCategory = (value: string) => {
    if (value.includes('Quy tr')) return 'Quy trình';
    if (value.includes('Quy định')) return 'Quy định';
    if (value.includes('Chính sách')) return 'Chính sách';
    if (value.includes('Biá') || value.includes('Biểu mẫu')) return 'Biểu mẫu';
    if (value.includes('Hư') || value.includes('Hướng dẫn')) return 'Hướng dẫn';
    if (value.includes('Quyết')) return 'Quy định';
    return value;
};

const normalizeText = (value: string) =>
    value
        .replace('Quy trình', 'Quy trình')
        .replace('thu học phí', 'thu học phí')
        .replace('Quy định', 'Quy định')
        .replace('đào tạo', 'đào tạo')
        .replace('Biểu mẫu', 'Biểu mẫu')
        .replace('nhập học', 'nhập học')
        .replace('Chính sách', 'Chính sách')
        .replace('hoa hồng', 'hoa hồng')
        .replace('Quyết định bổ nhiệm TPKD', 'Hướng dẫn onboard nhân sự mới');

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
        department: 'Tài chính (Finance)',
        executingDepts: ['Tài chính (Finance)', 'Kinh doanh (Sales)'],
        ownerName: 'Lê Thu Hà',
        tags: ['Quy trình', 'Tài chính (Finance)'],
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

const DetailRow = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) => (
    <div className="flex items-center gap-3">
        <div className="text-slate-400">{icon}</div>
        <div>
            <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{label}</div>
            <div className="text-sm font-semibold text-slate-700">{value}</div>
        </div>
    </div>
);

const DocumentLibrary = () => {
    // Auth & Navigation
    const { user, logout } = useAuth();
    // Phòng ban tài liệu lấy từ Cấu hình Dữ liệu (auto-update). Fallback dùng list mặc định.
    const documentDepartmentOptions = useSystemCatalogOptions('documentDepartments');
    const dynamicLibraryDepartments = documentDepartmentOptions.length > 0
        ? documentDepartmentOptions.map((opt) => opt.label)
        : LIBRARY_DEPARTMENTS;
    const navigate = useNavigate();

    // Selection state
    const [selectedDept, setSelectedDept] = useState<string | 'all'>('all');
    const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');
    const [isDeptSectionOpen, setIsDeptSectionOpen] = useState(false);
    const [isCategorySectionOpen, setIsCategorySectionOpen] = useState(false);

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

    const getDocumentStatusBadge = (status: DocumentStatus) => {
        if (status === 'active') {
            return <span className="inline-flex items-center rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">Đang áp dụng</span>;
        }
        if (status === 'expiring') {
            return <span className="inline-flex items-center rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">Sắp hết hiệu lực</span>;
        }
        return <span className="inline-flex items-center rounded-full border border-rose-100 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">Hết hiệu lực</span>;
    };

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

            {/* --- CUSTOM SIDEBAR --- */}
            <aside className="w-64 bg-white border-r border-slate-200 flex flex-col z-50 shadow-sm">
                <div className="flex items-center gap-2 p-6 border-b border-slate-100 h-[88px]">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold cursor-pointer" onClick={() => navigate('/')}>
                        U
                    </div>
                    <span className="text-xl font-bold text-slate-900 cursor-pointer" onClick={() => navigate('/')}>{APP_NAME}</span>
                </div>

                <div className="flex-1 overflow-y-auto py-4 px-2">
                    <div className="mb-5">
                        <button
                            type="button"
                            onClick={() => setIsDeptSectionOpen((prev) => !prev)}
                            className="flex w-full items-center justify-between rounded-lg px-3 pb-2 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 transition-colors hover:text-slate-600"
                        >
                            <span>Theo phòng ban</span>
                            <ChevronDown size={16} className={`transition-transform ${isDeptSectionOpen ? 'rotate-180' : ''}`} />
                        </button>
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
                            {dynamicLibraryDepartments.map((dept) => (
                                <button
                                    key={dept}
                                    onClick={() => setSelectedDept(dept)}
                                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
                                        selectedDept === dept ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                                    }`}
                                >
                                    <Briefcase size={18} className={selectedDept === dept ? 'text-blue-600' : 'text-slate-400'} />
                                    <span className="truncate">{dept}</span>
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
                                    <span className="truncate">{category}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {user && (
                    <div className="p-4 border-t border-slate-100">
                        <div className="flex items-center gap-3 mb-4 px-2">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 overflow-hidden">
                                <UserIcon size={20} />
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
                            <span>Quay lại</span>
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

                <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-3.5">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                            <Filter size={14} className="text-gray-400" />
                            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Bộ lọc</span>
                        </div>

                        <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value as 'all' | DocumentStatus)}
                            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                        >
                            <option value="all">Tất cả trạng thái</option>
                            <option value="active">Đang áp dụng</option>
                            <option value="expiring">Sắp hết hạn</option>
                            <option value="expired">Hết hạn</option>
                        </select>

                        <select
                            value={selectedScope}
                            onChange={(e) => setSelectedScope(e.target.value as 'all' | ScopeType)}
                            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                        >
                            <option value="all">Tất cả phạm vi</option>
                            <option value="company">Toàn công ty</option>
                            <option value="branch">Chi nhánh / Cơ sở</option>
                            <option value="department">Phòng ban nội bộ</option>
                        </select>

                        <div className="flex items-center gap-2">
                            <select
                                value={dateFieldFilter}
                                onChange={(e) => setDateFieldFilter(e.target.value as 'issueDate' | 'effectiveDate')}
                                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                            >
                                <option value="effectiveDate">Ngày hiệu lực</option>
                                <option value="issueDate">Ngày ban hành</option>
                            </select>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                            />
                            <span className="text-xs text-gray-400">đến</span>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                            />
                        </div>

                        <label className="flex items-center gap-2 text-sm text-gray-700">
                            <input
                                type="checkbox"
                                checked={!showVersionHistory}
                                onChange={(e) => setShowVersionHistory(!e.target.checked)}
                            />
                            Chỉ bản mới nhất
                        </label>

                        {(selectedStatus !== 'all' || selectedScope !== 'all' || dateFrom || dateTo) && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedStatus('all');
                                    setSelectedScope('all');
                                    setDateFrom('');
                                    setDateTo('');
                                }}
                                className="ml-auto rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100"
                            >
                                Xóa bộ lọc
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-auto bg-gray-50 p-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr className="text-xs font-semibold text-gray-500 uppercase">
                                    <th className="px-6 py-4 w-16">STT</th>
                                    <th className="px-6 py-4">Tên tài liệu</th>
                                    <th className="px-6 py-4">Ngày ban hành</th>
                                    <th className="px-6 py-4">Ngày hiệu lực</th>
                                    <th className="px-6 py-4 text-center">Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredDocs.map((doc, idx) => (
                                    <tr key={doc.id} className="hover:bg-blue-50/50 cursor-pointer" onClick={() => { setSelectedDoc(doc); setIsDetailOpen(true); }}>
                                        <td className="px-6 py-4 text-sm text-gray-500">{idx + 1}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {getFileIcon(doc.type)}
                                                <div>
                                                    <div className="font-semibold text-gray-900 text-sm">{doc.name}</div>
                                                    <div className="text-[10px] text-gray-400">{doc.documentCode} • v{doc.version}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-700">{doc.issueDate}</td>
                                        <td className="px-6 py-4 text-sm text-gray-700">{doc.effectiveDate}</td>
                                        <td className="px-6 py-4 text-center">{getDocumentStatusBadge(doc.status)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* --- DETAIL MODAL --- */}
            {isDetailOpen && selectedDoc && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsDetailOpen(false)}></div>
                    <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
                            <h2 className="text-lg font-bold">Chi tiết tài liệu</h2>
                            <button onClick={() => setIsDetailOpen(false)}><X /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8">
                            <div className="grid grid-cols-[1fr_300px] gap-8">
                                <div>
                                    <h3 className="text-2xl font-bold mb-4">{selectedDoc.name}</h3>
                                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 min-h-[400px]">
                                        <p className="text-slate-700 leading-relaxed">{selectedDoc.contentText}</p>
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
                                        <DetailRow icon={<Building2 size={16}/>} label="Phòng ban" value={selectedDoc.department} />
                                        <div className="h-4" />
                                        <DetailRow icon={<FileIcon size={16}/>} label="Mã tài liệu" value={selectedDoc.documentCode || '--'} />
                                        <div className="h-4" />
                                        <DetailRow icon={<History size={16}/>} label="Hiệu lực" value={selectedDoc.effectiveDate || '--'} />
                                    </div>
                                    <button className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all">Tải xuống tài liệu</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- UPLOAD MODAL --- */}
            {isUploadOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsUploadOpen(false)}></div>
                    <div className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl overflow-hidden">
                        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-900">Tạo tài liệu mới</h2>
                            <button onClick={() => setIsUploadOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20}/></button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Tên tài liệu</label>
                                    <input type="text" className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="Nhập tên tài liệu..."/>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Phòng ban</label>
                                    <select className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 outline-none">
                                        {dynamicLibraryDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">Tệp đính kèm</label>
                                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-slate-400 hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer">
                                    <Upload size={32} className="mb-2"/>
                                    <span className="text-sm">Kéo thả hoặc click để tải lên</span>
                                </div>
                            </div>
                            <button className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20">Lưu tài liệu</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DocumentLibrary;
