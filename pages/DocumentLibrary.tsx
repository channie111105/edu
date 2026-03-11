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
type DocumentStatus = 'active' | 'expired' | 'draft';
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
    name: string;
    type: DocumentType;
    version: string;
    issueDate: string;
    expirationDate?: string;
    uploadDate: string;
    status: DocumentStatus;
    department: string;
    executingDepts: string[];
    scope: ScopeType;
    category: string;
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

// --- Components ---

const DocumentLibrary = () => {
    // Auth & Navigation
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    // Selection state
    const [selectedDept, setSelectedDept] = useState<string | 'all'>('all');
    const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');
    // Keep sidebar compact by default (expand on demand via chevron)
    const [expandedDepts, setExpandedDepts] = useState<string[]>([]);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');

    // Modal state
    const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isUploadOpen, setIsUploadOpen] = useState(false);

    // Toggle Dept Expansion
    const toggleDept = (dept: string) => {
        setExpandedDepts(prev =>
            prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]
        );
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleBackToModules = () => {
        navigate('/module-selection');
    };

    // Filter Logic
    const filteredDocs = MOCK_DOCUMENTS.filter(doc => {
        const matchSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchDept = selectedDept === 'all' || doc.department === selectedDept;
        const matchCategory = selectedCategory === 'all' || doc.category === selectedCategory;
        return matchSearch && matchDept && matchCategory;
    });

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

                {/* 2. Navigation (Tree View) */}
                <div className="flex-1 overflow-y-auto py-4 px-2 custom-scrollbar">
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
                            <Upload size={16} /> <span className="hidden sm:inline">Upload Tài liệu</span>
                        </button>
                    </div>
                </div>

                {/* Filters Status Bar */}
                <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2 overflow-x-auto">
                    <span className="text-xs font-semibold text-gray-500 uppercase mr-2">Bộ lọc nhanh:</span>
                    {['active', 'expired', 'draft'].map(status => (
                        <button key={status} className="px-3 py-1 bg-white border border-gray-200 rounded-full text-xs text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-colors shadow-sm">
                            {status === 'active' ? 'Còn hiệu lực' : status === 'expired' ? 'Hết hiệu lực' : 'Nháp'}
                        </button>
                    ))}
                </div>

                {/* Table Content */}
                <div className="flex-1 overflow-auto bg-gray-50 p-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[500px] flex flex-col">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50/80 sticky top-0 z-10 backdrop-blur-sm">
                                <tr className="border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    <th className="px-6 py-4 w-[30%]">Tên văn bản</th>
                                    <th className="px-6 py-4">Phân loại</th>
                                    <th className="px-6 py-4">Ban hành / Upload</th>
                                    <th className="px-6 py-4">Hiệu lực</th>
                                    <th className="px-6 py-4">Phạm vi</th>
                                    <th className="px-6 py-4 text-center">Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredDocs.map((doc) => (
                                    <tr
                                        key={doc.id}
                                        className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                                        onClick={() => { setSelectedDoc(doc); setIsDetailOpen(true); }}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-start gap-4">
                                                <div className="mt-1 p-2.5 bg-gray-50 rounded-lg group-hover:bg-white border border-gray-100 group-hover:border-gray-200 transition-all shrink-0 text-slate-600">
                                                    {getFileIcon(doc.type)}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors text-sm line-clamp-2 leading-relaxed" title={doc.name}>
                                                        {doc.name}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1.5">
                                                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 font-mono">
                                                            v{doc.version}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-sm font-medium text-gray-900">{doc.category}</span>
                                                <span className="text-xs text-gray-500">{doc.department}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1 text-xs">
                                                <div className="flex items-center gap-1.5 text-gray-700">
                                                    <Calendar size={12} className="text-gray-400" />
                                                    {doc.issueDate}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-gray-400">
                                                    <Upload size={12} className="text-gray-300" />
                                                    {doc.uploadDate}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1 text-xs">
                                                {doc.expirationDate ? (
                                                    <div className="flex items-center gap-1.5 text-orange-700 bg-orange-50 px-2 py-1 rounded w-fit">
                                                        <History size={12} />
                                                        {doc.expirationDate}
                                                    </div>
                                                ) : (
                                                    <div className="text-gray-400 ml-5">-</div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1.5">
                                                <span className="text-xs text-xs font-medium text-slate-700 inline-flex items-center gap-1">
                                                    <Globe size={12} />
                                                    {doc.scope === 'company' ? 'Toàn công ty' : doc.scope === 'branch' ? 'Chi nhánh' : 'Phòng ban'}
                                                </span>
                                                <div className="flex flex-wrap gap-1">
                                                    {doc.executingDepts.slice(0, 1).map(dept => (
                                                        <span key={dept} className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100 truncate max-w-[100px]">
                                                            {dept.split('(')[0].trim()}
                                                        </span>
                                                    ))}
                                                    {doc.executingDepts.length > 1 && (
                                                        <span className="text-[10px] bg-gray-50 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200">
                                                            +{doc.executingDepts.length - 1}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {getStatusBadge(doc.status)}
                                        </td>
                                    </tr>
                                ))}
                                {filteredDocs.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
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
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 rounded-t-2xl">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white shadow-sm rounded-xl border border-gray-100">
                                    {getFileIcon(selectedDoc.type)}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">{selectedDoc.name}</h2>
                                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                        <span className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-700 font-mono">v{selectedDoc.version}</span>
                                        <span>•</span>
                                        <span>{selectedDoc.category}</span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setIsDetailOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                                <X size={24} className="text-gray-500" />
                            </button>
                        </div>

                        {/* Detail Content */}
                        <div className="flex-1 overflow-y-auto p-8">
                            <div className="grid grid-cols-3 gap-8">
                                {/* Left Col: Attributes */}
                                <div className="col-span-1 space-y-6 border-r border-gray-100 pr-6">
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Thông tin chi tiết</h4>
                                        <div className="space-y-4">
                                            <DetailRow icon={<Building2 size={14} />} label="Phòng ban" value={selectedDoc.department} />
                                            <DetailRow icon={<FileCheck size={14} />} label="Loại văn bản" value={selectedDoc.category} />
                                            <DetailRow icon={<Globe size={14} />} label="Phạm vi" value={selectedDoc.scope} />
                                            <DetailRow icon={<CheckCircle2 size={14} />} label="Trạng thái" value={selectedDoc.status === 'active' ? 'Có hiệu lực' : 'Hết hiệu lực'} />
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Thời gian</h4>
                                        <div className="space-y-4">
                                            <DetailRow icon={<Calendar size={14} />} label="Ngày ban hành" value={selectedDoc.issueDate} />
                                            <DetailRow icon={<Upload size={14} />} label="Ngày upload" value={selectedDoc.uploadDate} />
                                            <DetailRow icon={<History size={14} />} label="Ngày hết hạn" value={selectedDoc.expirationDate || 'Không thời hạn'} />
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Đơn vị thực thi</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedDoc.executingDepts.map(d => (
                                                <span key={d} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs border border-gray-200">
                                                    {d}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Col: Preview & Versions */}
                                <div className="col-span-2 space-y-8 pl-2">
                                    {/* File Attachment */}
                                    <div className="bg-blue-50/50 rounded-xl p-5 border border-blue-100">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="p-3 bg-white rounded-lg border border-blue-100 text-blue-600 shadow-sm">
                                                    {getFileIcon(selectedDoc.type)}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">File đính kèm (Scan/Gốc)</p>
                                                    <p className="text-sm text-gray-500">Bản scan có dấu đỏ • 2.4 MB</p>
                                                </div>
                                            </div>
                                            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm transition-all">
                                                <Download size={16} /> Tải về
                                            </button>
                                        </div>
                                    </div>

                                    {/* Validated Status */}
                                    {selectedDoc.status === 'active' && (
                                        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-100 rounded-lg text-green-800">
                                            <CheckCircle2 size={20} className="text-green-600" />
                                            <span className="text-sm font-medium">Văn bản này đang có hiệu lực thi hành</span>
                                        </div>
                                    )}

                                    {/* Version History */}
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                            <History size={16} /> Lịch sử cập nhật
                                        </h4>
                                        <div className="space-y-4">
                                            {selectedDoc.versions.map((ver, idx) => (
                                                <div key={idx} className="flex gap-4 group">
                                                    <div className="flex flex-col items-center">
                                                        <div className={`w-3 h-3 rounded-full border-2 ${idx === 0 ? 'bg-blue-600 border-blue-600' : 'bg-gray-200 border-gray-300'}`}></div>
                                                        {idx !== selectedDoc.versions.length - 1 && <div className="w-0.5 h-full bg-gray-200 my-1"></div>}
                                                    </div>
                                                    <div className="pb-4">
                                                        <div className="flex items-baseline gap-2">
                                                            <span className="text-sm font-bold text-gray-900">Phiên bản {ver.version}</span>
                                                            <span className="text-xs text-gray-500">{ver.updatedAt}</span>
                                                        </div>
                                                        <p className="text-sm text-gray-600 mt-1">{ver.note}</p>
                                                        <p className="text-xs text-gray-400 mt-1">Cập nhật bởi: {ver.updatedBy}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
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
                            <h2 className="text-lg font-bold text-gray-900">Upload Văn bản / Quy trình mới</h2>
                            <button onClick={() => setIsUploadOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
                        </div>
                        <div className="p-6 overflow-y-auto max-h-[80vh]">
                            <form className="space-y-5">
                                <div className="grid grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-gray-700">Tên văn bản <span className="text-red-500">*</span></label>
                                        <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Nhập tên văn bản..." />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-gray-700">Số/Ký hiệu</label>
                                        <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="VD: 01/2026/QĐ-GĐ" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-gray-700">Phòng ban ban hành</label>
                                        <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                            {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-gray-700">Loại văn bản</label>
                                        <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-gray-700">Ngày ban hành</label>
                                        <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-gray-700">Ngày có hiệu lực</label>
                                        <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-gray-700">Ngày hết hạn (nếu có)</label>
                                        <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-gray-700">Phạm vi áp dụng</label>
                                    <div className="flex gap-4 mt-1">
                                        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                            <input type="radio" name="scope" className="text-blue-600 focus:ring-blue-500" defaultChecked /> Toàn công ty
                                        </label>
                                        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                            <input type="radio" name="scope" className="text-blue-600 focus:ring-blue-500" /> Chi nhánh / Cơ sở
                                        </label>
                                        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                            <input type="radio" name="scope" className="text-blue-600 focus:ring-blue-500" /> Phòng ban nội bộ
                                        </label>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-gray-700">Đơn vị thực thi (Tags)</label>
                                    <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Nhập tên phòng ban..." />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">File đính kèm (Scan có dấu / PDF)</label>
                                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors cursor-pointer group">
                                        <div className="p-3 bg-blue-50 text-blue-600 rounded-full mb-3 group-hover:scale-110 transition-transform">
                                            <Upload size={20} />
                                        </div>
                                        <p className="text-sm text-gray-900 font-medium">Click để tải lên hoặc kéo thả file vào đây</p>
                                        <p className="text-xs text-gray-500 mt-1">Hỗ trợ PDF, Word, Excel, Ảnh (Max 10MB)</p>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
                            <button onClick={() => setIsUploadOpen(false)} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100">Hủy bỏ</button>
                            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm">Lưu văn bản</button>
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
