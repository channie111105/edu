
import React, { useState, useMemo, useEffect } from 'react';
import {
    Search,
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
    CheckCircle2
} from 'lucide-react';
import { getLeads, getCollaborators, saveCollaborators } from '../utils/storage';
import { LeadStatus, IActivityLog } from '../types';
import { useAuth } from '../contexts/AuthContext';

// Mock Data for Collaborators
interface ICollaborator {
    id: string;
    name: string;
    phone: string;
    email?: string;
    city: string;
    address?: string;
    industry: string; // Ngành nghề
    segment: string;  // Mảng hợp tác
    notes: string;
    nextAppointment?: string; // Lịch hẹn
    status?: 'Active' | 'Need Support' | 'Stopped' | 'New';
    activities?: IActivityLog[];
    commissionLevel?: 'Standard' | 'Silver' | 'Gold' | 'Diamond';
    commissionRate?: number;
}

const MOCK_COLLABORATORS: ICollaborator[] = [
    {
        id: 'ctv_1',
        name: 'Nguyễn Văn A',
        phone: '0912345678',
        city: 'Hà Nội',
        industry: 'Giáo viên',
        segment: 'IELTS',
        notes: 'Cần gửi chính sách thưởng mới',
        nextAppointment: '2026-05-20',
        status: 'Active',
        commissionLevel: 'Silver',
        commissionRate: 10
    },
    {
        id: 'ctv_2',
        name: 'Trần Thị B',
        phone: '0988777666',
        city: 'Hồ Chí Minh',
        industry: 'Sinh viên',
        segment: 'Du học',
        notes: 'Đã gửi quà tết. Follow up tháng sau.',
        nextAppointment: '2026-06-10',
        status: 'Need Support',
        commissionLevel: 'Standard',
        commissionRate: 5
    },
    {
        id: 'ctv_3',
        name: 'Lê Văn C',
        phone: '0901112233',
        city: 'Đà Nẵng',
        industry: 'Trung tâm tiếng Anh',
        segment: 'Xuất khẩu lao động',
        notes: 'Tiềm năng lớn, cần chăm sóc kỹ.',
        status: 'Active',
        commissionLevel: 'Gold',
        commissionRate: 15
    }
];

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
}

const CollaboratorCareDrawer: React.FC<CollaboratorCareDrawerProps> = ({ ctv, isOpen, onClose, onUpdate }) => {
    const { user } = useAuth();
    const [noteContent, setNoteContent] = useState('');
    const [interactionType, setInteractionType] = useState('Call');
    const [nextFollowUp, setNextFollowUp] = useState('');
    const [activeTab, setActiveTab] = useState<'info' | 'care'>('care');

    if (!isOpen) return null;

    const handleAddNote = () => {
        if (!noteContent.trim()) return;

        const typeLabels: Record<string, string> = {
            'Call': 'Gọi điện tư vấn',
            'Document': 'Gửi tài liệu',
            'Complaint': 'Xử lý khiếu nại',
            'Visit': 'Thăm hỏi định kỳ',
            'Zalo': 'Nhắn tin Zalo'
        };

        const newActivity: IActivityLog = {
            id: `act-${Date.now()}`,
            type: 'note',
            timestamp: new Date().toISOString(),
            title: `[${typeLabels[interactionType] || interactionType}] Chăm sóc CTV`,
            description: noteContent,
            user: user?.name || 'Admin',
            datetime: nextFollowUp || undefined
        };

        const updatedCtv: ICollaborator = {
            ...ctv,
            activities: [newActivity, ...(ctv.activities || [])],
            nextAppointment: nextFollowUp || ctv.nextAppointment
        };

        onUpdate(updatedCtv);
        setNoteContent('');
        setNextFollowUp('');
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
                                        {[
                                            { id: 'Call', label: '📞 Gọi điện tư vấn', color: 'bg-amber-100 border-amber-300 text-amber-900' },
                                            { id: 'Document', label: '📄 Gửi tài liệu', color: 'bg-white border-slate-200 text-slate-600' },
                                            { id: 'Complaint', label: '⚠️ Xử lý khiếu nại', color: 'bg-white border-slate-200 text-slate-600' },
                                            { id: 'Visit', label: '🤝 Thăm hỏi định kỳ', color: 'bg-white border-slate-200 text-slate-600' },
                                            { id: 'Zalo', label: '💬 Zalo', color: 'bg-white border-slate-200 text-slate-600' }
                                        ].map(btn => (
                                            <button
                                                key={btn.id}
                                                onClick={() => setInteractionType(btn.id)}
                                                className={`px-4 py-1.5 rounded border text-xs font-bold transition-all ${interactionType === btn.id ? btn.color : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                            >
                                                {btn.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="max-w-4xl mx-auto w-full py-4 px-6 space-y-4">
                                    {/* Followers Row */}
                                    <div className="flex items-center justify-between text-slate-500 border-b border-slate-100 pb-2">
                                        <div className="flex items-center gap-2 text-sm">
                                            <User size={16} />
                                            <span className="font-medium">0 Followers</span>
                                        </div>
                                        <button className="text-blue-600 text-sm font-bold flex items-center gap-1 hover:underline">
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
                                                        checked={!!nextFollowUp}
                                                        onChange={(e) => !e.target.checked && setNextFollowUp('')}
                                                        className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                                                    />
                                                    <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900 transition-colors uppercase tracking-tight">Hẹn lịch tiếp?</span>
                                                </label>
                                                <input
                                                    type="datetime-local"
                                                    value={nextFollowUp}
                                                    onChange={(e) => setNextFollowUp(e.target.value)}
                                                    className={`text-xs font-bold text-slate-500 border border-slate-200 rounded px-2 py-1.5 focus:border-amber-400 outline-none transition-all shadow-sm ${!nextFollowUp && 'opacity-30'}`}
                                                />
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
                                                                <Calendar size={10} /> HẸN: {new Date(log.datetime).toLocaleString('vi-VN')}
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
                                <div className="absolute top-0 right-0 p-4">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase shadow-sm ${ctv.commissionLevel === 'Diamond' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' :
                                        ctv.commissionLevel === 'Gold' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                                            ctv.commissionLevel === 'Silver' ? 'bg-slate-100 text-slate-700 border border-slate-200' :
                                                'bg-blue-50 text-blue-700 border border-blue-100'
                                        }`}>
                                        Level: {ctv.commissionLevel || 'Standard'}
                                    </span>
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
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Khu vực</label>
                                    <p className="text-sm font-bold text-slate-900 mt-0.5">{ctv.city}</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hoa hồng hiện tại</label>
                                    <p className="text-sm font-bold text-blue-600 mt-0.5">{ctv.commissionRate || 5}%</p>
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

                            {/* Commission History */}
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                <h3 className="text-[10px] font-bold text-slate-400 uppercase mb-4 flex items-center gap-2 tracking-widest">
                                    <History size={12} /> Lịch sử thay đổi chính sách
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-xs p-3 bg-slate-50 rounded-lg border border-slate-100">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-700">Nâng cấp Level: Silver</span>
                                            <span className="text-[10px] text-slate-400">{new Date().toLocaleDateString('vi-VN')}</span>
                                        </div>
                                        <span className="font-bold text-emerald-600">+5% Hoa hồng</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs p-3 bg-slate-50 rounded-lg border border-slate-100">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-700">Đăng ký CTV mới</span>
                                            <span className="text-[10px] text-slate-400">01/01/2026</span>
                                        </div>
                                        <span className="font-bold text-slate-500">Mức Standard (5%)</span>
                                    </div>
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

    const [collaborators, setCollaborators] = useState<ICollaborator[]>([]);
    const [selectedCtv, setSelectedCtv] = useState<ICollaborator | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newCtv, setNewCtv] = useState<Partial<ICollaborator>>({});

    // Column Visibility State
    const [columns, setColumns] = useState(ALL_COLUMNS);
    const [showColumnDropdown, setShowColumnDropdown] = useState(false);

    // Load data from storage
    useEffect(() => {
        const stored = getCollaborators();
        if (stored && stored.length > 0) {
            setCollaborators(stored);
        } else {
            setCollaborators(MOCK_COLLABORATORS);
            saveCollaborators(MOCK_COLLABORATORS);
        }
    }, []);

    // Sync with storage whenever collaborators change
    const updateCollaborators = (newList: ICollaborator[]) => {
        setCollaborators(newList);
        saveCollaborators(newList);
    };

    // Get Leads from storage
    const leads = useMemo(() => getLeads(), []);

    // Derived Options for Filters
    const cityOptions = useMemo(() => ['All', ...Array.from(new Set(collaborators.map(c => c.city)))], [collaborators]);
    const industryOptions = useMemo(() => ['All', ...Array.from(new Set(collaborators.map(c => c.industry)))], [collaborators]);

    // Filter Logic
    const filteredList = useMemo(() => {
        return collaborators.filter(c => {
            const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm);
            const matchesCity = filterCity === 'All' || c.city === filterCity;
            const matchesIndustry = filterIndustry === 'All' || c.industry === filterIndustry;
            return matchesSearch && matchesCity && matchesIndustry;
        });
    }, [collaborators, searchTerm, filterCity, filterIndustry]);

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
        const newItem: ICollaborator = {
            id: newId,
            name: newCtv.name,
            phone: newCtv.phone,
            city: newCtv.city || 'Hà Nội',
            industry: newCtv.industry || '',
            segment: newCtv.segment || '',
            notes: newCtv.notes || '',
            status: 'New',
            commissionLevel: newCtv.commissionLevel || 'Standard',
            commissionRate: newCtv.commissionRate || 5,
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
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-all"
                    >
                        <Plus size={20} /> Thêm CTV
                    </button>
                </div>

                {/* Toolbar & Filters */}
                <div className="flex flex-col md:flex-row gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                    {/* Search */}
                    <div className="relative flex-[1.5] min-w-[250px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm theo Tên, SĐT, Thành phố..."
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:border-blue-400 focus:ring-0 outline-none transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
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

                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {filteredList.map((ctv, index) => {
                                    const stats = getStats(ctv.name);
                                    return (
                                        <tr
                                            key={ctv.id}
                                            onClick={() => setSelectedCtv(ctv)}
                                            className="hover:bg-blue-50/50 transition-colors group text-slate-800 cursor-pointer"
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
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <a
                                                                    href={`tel:${ctv.phone}`}
                                                                    className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors text-xs font-bold"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <Phone size={10} fill="currentColor" /> {ctv.phone}
                                                                </a>
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
                                                        {ctv.nextAppointment && (
                                                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-700 bg-blue-50 w-fit px-1.5 py-0.5 rounded border border-blue-100">
                                                                <Calendar size={10} />
                                                                {ctv.nextAppointment}
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


                                        </tr>
                                    );
                                })}

                                {filteredList.length === 0 && (
                                    <tr>
                                        <td colSpan={ALL_COLUMNS.length} className="p-12 text-center text-slate-400 flex flex-col items-center justify-center">
                                            <Filter size={48} className="mb-4 text-slate-200" />
                                            <p>Không tìm thấy cộng tác viên phù hợp với bộ lọc hiện tại.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 flex justify-between items-center">
                        <span>Hiển thị {filteredList.length} / {collaborators.length} kết quả</span>
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
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Cấp độ CTV</label>
                                    <select
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none bg-white focus:border-blue-500 transition-all"
                                        value={newCtv.commissionLevel || 'Standard'}
                                        onChange={e => {
                                            const level = e.target.value as any;
                                            const rates: any = { Standard: 5, Silver: 10, Gold: 15, Diamond: 20 };
                                            setNewCtv({ ...newCtv, commissionLevel: level, commissionRate: rates[level] });
                                        }}
                                    >
                                        <option value="Standard">Standard (5%)</option>
                                        <option value="Silver">Silver (10%)</option>
                                        <option value="Gold">Gold (15%)</option>
                                        <option value="Diamond">Diamond (20%)</option>
                                    </select>
                                </div>
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

            {selectedCtv && (
                <CollaboratorCareDrawer
                    ctv={selectedCtv}
                    isOpen={!!selectedCtv}
                    onClose={() => setSelectedCtv(null)}
                    onUpdate={handleUpdateCtv}
                />
            )}
        </div>
    );
};

export default Collaborators;
