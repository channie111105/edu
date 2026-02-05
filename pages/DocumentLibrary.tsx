import React, { useState } from 'react';
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
    ChevronDown
} from 'lucide-react';

// --- Types ---

type DocumentType = 'pdf' | 'word' | 'excel';
type DocumentStatus = 'active' | 'expired' | 'draft';

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
    scope: 'company' | 'branch';
    category: string;
    versions: DocumentVersion[];
}

// --- Mock Data ---

const MOCK_DOCUMENTS: Document[] = [
    {
        id: '1',
        name: 'Quy trình thu học phí',
        type: 'pdf',
        version: '2.0',
        issueDate: '2026-01-01',
        uploadDate: '2025-12-28',
        status: 'active',
        department: 'Kế toán',
        executingDepts: ['Kế toán', 'Sale'],
        scope: 'company',
        category: 'Quy trình tài chính',
        versions: [
            { version: '2.0', updatedAt: '2025-12-28', updatedBy: 'Admin', note: 'Cập nhật mức thu mới 2026' },
            { version: '1.0', updatedAt: '2024-01-01', updatedBy: 'Admin', note: 'Ban hành lần đầu' }
        ]
    },
    {
        id: '2',
        name: 'Quy định đào tạo',
        type: 'word',
        version: '1.1',
        issueDate: '2025-10-15',
        expirationDate: '2025-12-31',
        uploadDate: '2025-10-10',
        status: 'expired',
        department: 'Đào tạo',
        executingDepts: ['Đào tạo', 'Giáo viên'],
        scope: 'company',
        category: 'Quy định chuyên môn',
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
        uploadDate: '2026-01-30',
        status: 'active',
        department: 'Sale',
        executingDepts: ['Sale', 'Kế toán'],
        scope: 'branch',
        category: 'Biểu mẫu',
        versions: [
            { version: '1.0', updatedAt: '2026-01-30', updatedBy: 'Sale Lead', note: 'Mới' }
        ]
    }
];

const DEPARTMENTS = ['Sale', 'Đào tạo', 'Kế toán', 'Marketing', 'Nhân sự'];
const CATEGORIES = ['Quy trình tài chính', 'Quy định chuyên môn', 'Quy trình thu phí', 'Biểu mẫu', 'Chính sách nhân sự'];

// --- Components ---

const DocumentLibrary = () => {
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [selectedDept, setSelectedDept] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    // Filter Logic
    const filteredDocs = MOCK_DOCUMENTS.filter(doc => {
        const matchSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchCategory = selectedCategory ? doc.category === selectedCategory : true;
        const matchDept = selectedDept ? doc.department === selectedDept : true;
        return matchSearch && matchCategory && matchDept;
    });

    const getFileIcon = (type: DocumentType) => {
        switch (type) {
            case 'pdf': return <FileIcon className="text-red-500" size={18} />;
            case 'word': return <FileText className="text-blue-500" size={18} />;
            case 'excel': return <FileSpreadsheet className="text-green-500" size={18} />;
            default: return <FileIcon className="text-gray-500" size={18} />;
        }
    };

    const getStatusBadge = (status: DocumentStatus) => {
        switch (status) {
            case 'active':
                return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700"><CheckCircle2 size={12} className="mr-1" /> Còn hiệu lực</span>;
            case 'expired':
                return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700"><XCircle size={12} className="mr-1" /> Hết hiệu lực</span>;
            default:
                return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">Nháp</span>;
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-gray-50 font-sans">

            {/* --- HEADER & FILTERS --- */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm z-20">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Thư viện & Quy trình</h1>
                        <p className="text-sm text-gray-500">Quản lý và tra cứu văn bản toàn hệ thống</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-all">
                            <Upload size={16} /> Upload Tài liệu
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition-all">
                            <Plus size={16} /> Tạo Quy trình mới
                        </button>
                    </div>
                </div>

                {/* Filters Bar */}
                <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm văn bản, quy trình..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-sm"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Department Filter */}
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Filter size={16} className="text-gray-400" />
                            </div>
                            <select
                                value={selectedDept}
                                onChange={(e) => setSelectedDept(e.target.value)}
                                className="pl-9 pr-8 py-2 bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm appearance-none hover:bg-gray-50 cursor-pointer"
                            >
                                <option value="">Tất cả phòng ban</option>
                                {DEPARTMENTS.map(dept => (
                                    <option key={dept} value={dept}>{dept}</option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                                <ChevronDown size={14} className="text-gray-400" />
                            </div>
                        </div>

                        {/* Category Filter */}
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FileCheck size={16} className="text-gray-400" />
                            </div>
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="pl-9 pr-8 py-2 bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm appearance-none hover:bg-gray-50 cursor-pointer"
                            >
                                <option value="">Tất cả nghiệp vụ</option>
                                {CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                                <ChevronDown size={14} className="text-gray-400" />
                            </div>
                        </div>
                    </div>

                    {/* Active Filters Display */}
                    {(selectedDept || selectedCategory) && (
                        <button
                            onClick={() => { setSelectedDept(''); setSelectedCategory(''); }}
                            className="text-sm text-red-600 hover:text-red-800 font-medium ml-2"
                        >
                            Xóa bộ lọc
                        </button>
                    )}
                </div>
            </div>

            {/* --- MAIN CONTENT (Full Width List) --- */}
            <div className="flex-1 overflow-hidden bg-gray-50 p-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col">
                    <div className="overflow-auto flex-1">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 sticky top-0 z-10">
                                <tr className="border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    <th className="px-6 py-4">Tên văn bản</th>
                                    <th className="px-6 py-4 w-24">Version</th>
                                    <th className="px-6 py-4 w-32">Ngày ban hành</th>
                                    <th className="px-6 py-4 w-32">Trạng thái</th>
                                    <th className="px-6 py-4 w-48">Bộ phận thực thi</th>
                                    <th className="px-6 py-4 w-24 text-right">Hành động</th>
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
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-white transition-colors">
                                                    {getFileIcon(doc.type)}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900 group-hover:text-blue-700 transition-colors">{doc.name}</p>
                                                    <p className="text-xs text-gray-500 mt-0.5">{doc.category}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-gray-100 rounded text-xs font-mono text-gray-700">v{doc.version}</span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {doc.issueDate}
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(doc.status)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {doc.executingDepts.map(dept => (
                                                    <span key={dept} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-200">
                                                        {dept}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-blue-600" title="Xem chi tiết">
                                                    <Eye size={16} />
                                                </button>
                                                <button className="p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-blue-600" title="Tải xuống">
                                                    <Download size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredDocs.length === 0 && (
                            <div className="p-12 text-center text-gray-500">
                                <FileIcon size={48} className="mx-auto text-gray-300 mb-4" />
                                <p>Không tìm thấy văn bản phù hợp</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- DETAIL MODAL (CENTERED) --- */}
            {isDetailOpen && selectedDoc && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setIsDetailOpen(false)}></div>

                    {/* Modal Content */}
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 rounded-t-2xl">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white shadow-sm rounded-xl border border-gray-100">
                                    {getFileIcon(selectedDoc.type)}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">{selectedDoc.name}</h2>
                                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                        <span className="font-mono bg-gray-200 px-1.5 rounded text-xs text-gray-700 font-bold">v{selectedDoc.version}</span>
                                        <span>•</span>
                                        <span>{selectedDoc.uploadDate}</span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setIsDetailOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                                <X size={24} className="text-gray-500" />
                            </button>
                        </div>

                        {/* Content Scrollable */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            {/* Status Banner */}
                            <div className={`p-4 rounded-xl flex items-center gap-3 ${selectedDoc.status === 'active' ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}>
                                {selectedDoc.status === 'active' ? <CheckCircle2 className="text-green-600" /> : <XCircle className="text-red-600" />}
                                <div>
                                    <p className={`font-medium ${selectedDoc.status === 'active' ? 'text-green-800' : 'text-red-800'}`}>
                                        Văn bản {selectedDoc.status === 'active' ? 'đang có hiệu lực' : 'đã hết hiệu lực'}
                                    </p>
                                    {selectedDoc.expirationDate && (
                                        <p className="text-sm text-gray-600 mt-0.5">Hiệu lực đến ngày: {selectedDoc.expirationDate}</p>
                                    )}
                                </div>
                            </div>

                            {/* 2-Column Grid */}
                            <div className="grid grid-cols-2 gap-8">
                                {/* Column 1: Info */}
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <Building2 size={14} /> Thông tin chung
                                        </h3>
                                        <div className="space-y-4">
                                            <DetailItem label="Phòng ban ban hành" value={selectedDoc.department} />
                                            <DetailItem label="Loại văn bản" value={selectedDoc.category} />
                                            <DetailItem label="Phạm vi áp dụng" value={selectedDoc.scope === 'company' ? 'Toàn công ty' : 'Chi nhánh'} />
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <Users size={14} /> Phạm vi thực thi
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedDoc.executingDepts.map(dept => (
                                                <span key={dept} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium border border-blue-100">
                                                    {dept}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Column 2: File & History */}
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <FileIcon size={14} /> Văn bản gốc
                                        </h3>
                                        <div className="flex items-center justify-between p-3 border border-gray-200 rounded-xl hover:border-blue-300 transition-colors bg-white group cursor-pointer shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                                                    <FileIcon size={20} />
                                                </div>
                                                <div className="overflow-hidden">
                                                    <p className="font-medium text-gray-900 truncate max-w-[150px]">{selectedDoc.name}.pdf</p>
                                                    <p className="text-xs text-gray-500">2.4 MB</p>
                                                </div>
                                            </div>
                                            <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                                                <Download size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <History size={14} /> Lịch sử phiên bản
                                        </h3>
                                        <div className="space-y-0 relative before:absolute before:inset-y-0 before:left-2 before:w-0.5 before:bg-gray-100">
                                            {selectedDoc.versions.map((ver, idx) => (
                                                <div key={idx} className="relative pl-6 py-2">
                                                    <div className={`absolute left-0 top-3 w-4 h-4 rounded-full border-2 border-white shadow-sm z-10 ${idx === 0 ? 'bg-blue-500 ring-4 ring-blue-50' : 'bg-gray-300'}`}></div>
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <span className={`text-sm font-bold ${idx === 0 ? 'text-gray-900' : 'text-gray-500'}`}>v{ver.version}</span>
                                                            <p className="text-xs text-gray-500">{ver.updatedAt}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-xs text-gray-500 italic max-w-[100px] truncate">{ver.updatedBy}</p>
                                                        </div>
                                                    </div>
                                                    <p className="text-sm text-gray-600 mt-1">{ver.note}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3 rounded-b-2xl">
                            <button onClick={() => setIsDetailOpen(false)} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 shadow-sm">
                                Đóng
                            </button>
                            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm flex items-center gap-2 transition-all">
                                <History size={16} /> Cập nhật phiên bản mới
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const DetailItem = ({ label, value }: { label: string, value: string }) => (
    <div className="flex flex-col">
        <span className="text-xs text-gray-500 mb-0.5">{label}</span>
        <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
);

export default DocumentLibrary;
