
import React, { useState, useMemo } from 'react';
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
    Download
} from 'lucide-react';
import { getLeads } from '../utils/storage';
import { LeadStatus } from '../types';

// Mock Data for Collaborators
interface ICollaborator {
    id: string;
    name: string;
    phone: string;
    city: string;
    industry: string; // Nghề nghiệp
    segment: string;  // Mảng hợp tác
    notes: string;
    nextAppointment?: string; // Lịch hẹn
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
        nextAppointment: '2026-05-20'
    },
    {
        id: 'ctv_2',
        name: 'Trần Thị B',
        phone: '0988777666',
        city: 'Hồ Chí Minh',
        industry: 'Sinh viên',
        segment: 'Du học',
        notes: 'Đã gửi quà tết. Follow up tháng sau.',
        nextAppointment: '2026-06-10'
    },
    {
        id: 'ctv_3',
        name: 'Lê Văn C',
        phone: '0901112233',
        city: 'Đà Nẵng',
        industry: 'Trung tâm tiếng Anh',
        segment: 'Xuất khẩu lao động',
        notes: 'Tiềm năng lớn, cần chăm sóc kỹ.',
    },
    {
        id: 'ctv_4',
        name: 'Phạm Thị D',
        phone: '0933445566',
        city: 'Hà Nội',
        industry: 'Sale Bất động sản',
        segment: 'Du học nghề',
        notes: 'Đang quan tâm đến chương trình Úc.',
    },
    {
        id: 'ctv_5',
        name: 'Hoàng Văn E',
        phone: '0977889900',
        city: 'Hải Phòng',
        industry: 'Giáo viên',
        segment: 'Tiếng Trung',
        notes: '',
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
    { id: 'actions', label: 'Thao tác', visible: true },
];

const Collaborators: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCity, setFilterCity] = useState('All');
    const [filterIndustry, setFilterIndustry] = useState('All');

    const [collaborators, setCollaborators] = useState<ICollaborator[]>(MOCK_COLLABORATORS);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newCtv, setNewCtv] = useState<Partial<ICollaborator>>({});

    // Column Visibility State
    const [columns, setColumns] = useState(ALL_COLUMNS);
    const [showColumnDropdown, setShowColumnDropdown] = useState(false);

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
        };
        setCollaborators([newItem, ...collaborators]);
        setIsAddModalOpen(false);
        setNewCtv({});
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
                                    {isColVisible('actions') && <th className="p-3 border-r border-slate-200 text-center w-12"><Settings2 size={16} className="mx-auto" /></th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {filteredList.map((ctv, index) => {
                                    const stats = getStats(ctv.name);
                                    return (
                                        <tr key={ctv.id} className="hover:bg-blue-50/50 transition-colors group text-slate-800">
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
                                                            {ctv.notes || 'Chưa có ghi chú'}
                                                        </p>
                                                    </div>
                                                </td>
                                            )}

                                            {isColVisible('actions') && (
                                                <td className="p-3 border-r border-slate-200 text-center">
                                                    <button className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors">
                                                        <MoreVertical size={16} />
                                                    </button>
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

            {/* --- ADD MODAL (Unchanged Logic, refreshed UI) --- */}
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

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Địa chỉ (Tỉnh/Thành)</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <select
                                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm outline-none bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all appearance-none"
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

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Ngành nghề</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                        value={newCtv.industry || ''}
                                        onChange={e => setNewCtv({ ...newCtv, industry: e.target.value })}
                                        placeholder="VD: Giáo viên..."
                                    />
                                </div>
                                <div>
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

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Ghi chú & Next Step</label>
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
        </div>
    );
};

export default Collaborators;
