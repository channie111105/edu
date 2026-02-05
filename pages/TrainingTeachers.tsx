import React, { useState } from 'react';
import {
    Search,
    Filter,
    Plus,
    MoreHorizontal,
    Mail,
    Phone,
    MapPin,
    Award,
    BookOpen,
    Briefcase,
    CheckCircle2,
    XCircle,
    Eye,
    Edit
} from 'lucide-react';

// --- TYPES (Local for now, move to types.ts in refactor) ---
export enum TeacherStatus {
    ACTIVE = 'Active',
    INACTIVE = 'Đã nghỉ'
}

export interface ITeacher {
    id: string;
    name: string;

    // Identity
    dob: string;
    phone: string;
    email: string;
    address: string;

    // HR & Contract
    contractType: 'Full-time' | 'Part-time';
    joinDate: string;
    mainBranch: 'Hanoi' | 'HCM' | 'Danang';

    // Expertise
    languages: string[]; // ['German', 'English']
    levels: string[]; // ['A1', 'B1', 'IELTS']
    qualifications: string; // e.g., 'Goethe C1'

    // Ops
    status: TeacherStatus;
    currentClassesCount: number;
}

// --- MOCK DATA ---
const MOCK_TEACHERS: ITeacher[] = [
    {
        id: 'T001',
        name: 'Nguyễn Thị Lan',
        dob: '15/08/1990',
        phone: '0901234567',
        email: 'lan.nguyen@educrm.com',
        address: 'Ba Đình, Hà Nội',
        contractType: 'Full-time',
        joinDate: '01/01/2022',
        mainBranch: 'Hanoi',
        languages: ['German'],
        levels: ['A1', 'A2', 'B1'],
        qualifications: 'Goethe C1, Pedagogy Cert',
        status: TeacherStatus.ACTIVE,
        currentClassesCount: 3
    },
    {
        id: 'T002',
        name: 'Hoàng Văn Nam',
        dob: '10/05/1988',
        phone: '0912345678',
        email: 'nam.hoang@educrm.com',
        address: 'Q1, TP.HCM',
        contractType: 'Part-time',
        joinDate: '15/03/2023',
        mainBranch: 'HCM',
        languages: ['English'],
        levels: ['IELTS', 'TOEIC'],
        qualifications: 'IELTS 8.5, TESOL',
        status: TeacherStatus.ACTIVE,
        currentClassesCount: 1
    },
    {
        id: 'T003',
        name: 'Trần Thị Hoa',
        dob: '20/11/1995',
        phone: '0987654321',
        email: 'hoa.tran@educrm.com',
        address: 'Cầu Giấy, Hà Nội',
        contractType: 'Full-time',
        joinDate: '01/06/2021',
        mainBranch: 'Hanoi',
        languages: ['Chinese'],
        levels: ['HSK3', 'HSK4', 'HSK5'],
        qualifications: 'HSK 6',
        status: TeacherStatus.INACTIVE,
        currentClassesCount: 0
    }
];

const TrainingTeachers: React.FC = () => {
    const [teachers, setTeachers] = useState<ITeacher[]>(MOCK_TEACHERS);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

    // New Teacher Form State
    const [newTeacher, setNewTeacher] = useState<Partial<ITeacher>>({
        status: TeacherStatus.ACTIVE,
        languages: [],
        levels: []
    });

    const filteredTeachers = teachers.filter(t => {
        const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) || t.phone.includes(searchTerm);
        const matchesStatus = filterStatus === 'ALL' ||
            (filterStatus === 'ACTIVE' && t.status === TeacherStatus.ACTIVE) ||
            (filterStatus === 'INACTIVE' && t.status === TeacherStatus.INACTIVE);
        return matchesSearch && matchesStatus;
    });

    const handleCreateTeacher = (e: React.FormEvent) => {
        e.preventDefault();
        // Mock Save
        const newId = `T${Math.floor(Math.random() * 1000)}`;
        setTeachers([
            { ...newTeacher, id: newId, currentClassesCount: 0 } as ITeacher,
            ...teachers
        ]);
        setShowCreateModal(false);
        setNewTeacher({ status: TeacherStatus.ACTIVE, languages: [], levels: [] });
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto bg-[#F8FAFC] min-h-screen font-sans text-slate-900">

            {/* Header */}
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Đội ngũ Giáo viên</h1>
                    <p className="text-slate-500">Quản lý hồ sơ, hợp đồng và tình trạng hoạt động của giảng viên.</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-bold shadow-sm transition-all"
                >
                    <Plus size={18} /> Tạo Giáo viên mới
                </button>
            </div>

            {/* Content Container */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

                {/* Filters */}
                <div className="p-4 border-b border-slate-200 flex flex-wrap gap-4 justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                placeholder="Tìm theo tên hoặc SĐT..."
                                className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1">
                            <button
                                onClick={() => setFilterStatus('ALL')}
                                className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${filterStatus === 'ALL' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}
                            >
                                Tất cả
                            </button>
                            <button
                                onClick={() => setFilterStatus('ACTIVE')}
                                className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${filterStatus === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:bg-slate-50'}`}
                            >
                                Đang hoạt động
                            </button>
                            <button
                                onClick={() => setFilterStatus('INACTIVE')}
                                className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${filterStatus === 'INACTIVE' ? 'bg-rose-50 text-rose-700' : 'text-slate-500 hover:bg-slate-50'}`}
                            >
                                Đã nghỉ
                            </button>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-[#F8FAFC] border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Họ tên / Định danh</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Hợp đồng & Nhân sự</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Chuyên môn</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Lớp đang nhận</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredTeachers.map((teacher) => (
                                <tr key={teacher.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                                {teacher.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-sm text-slate-900">{teacher.name}</div>
                                                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                                    <span className="flex items-center gap-1"><Phone size={10} /> {teacher.phone}</span>
                                                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                    <span>{teacher.dob}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-slate-700">{teacher.contractType}</div>
                                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                            <Briefcase size={12} /> Vào làm: {teacher.joinDate}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1 mb-1">
                                            {teacher.languages.map(lang => (
                                                <span key={lang} className="px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-600 uppercase">{lang}</span>
                                            ))}
                                            {teacher.levels.map(lvl => (
                                                <span key={lvl} className="px-2 py-0.5 rounded border border-blue-100 bg-blue-50 text-[10px] font-bold text-blue-600">{lvl}</span>
                                            ))}
                                        </div>
                                        <div className="text-xs text-slate-500 flex items-center gap-1">
                                            <Award size={12} className="text-amber-500" /> {teacher.qualifications}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold ${teacher.currentClassesCount > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {teacher.currentClassesCount} lớp
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {teacher.status === TeacherStatus.ACTIVE ? (
                                            <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs bg-emerald-50 px-2 py-1 rounded border border-emerald-100 w-fit">
                                                <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
                                                Active
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 text-rose-600 font-bold text-xs bg-rose-50 px-2 py-1 rounded border border-rose-100 w-fit">
                                                <XCircle size={12} />
                                                Đã nghỉ
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Xem chi tiết">
                                                <Eye size={18} />
                                            </button>
                                            <button className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors" title="Chỉnh sửa">
                                                <Edit size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* CREATE MODAL */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-lg text-slate-800">Tạo Giáo viên mới</h3>
                            <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
                        </div>

                        <form onSubmit={handleCreateTeacher} className="p-6 grid grid-cols-2 gap-6">
                            {/* Personal Info */}
                            <div className="space-y-4">
                                <h4 className="font-bold text-sm text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">1. Thông tin cá nhân</h4>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Họ và tên</label>
                                    <input
                                        required
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={newTeacher.name || ''}
                                        onChange={e => setNewTeacher({ ...newTeacher, name: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Ngày sinh</label>
                                        <input
                                            type="date"
                                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={newTeacher.dob || ''}
                                            onChange={e => setNewTeacher({ ...newTeacher, dob: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Số điện thoại</label>
                                        <input
                                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={newTeacher.phone || ''}
                                            onChange={e => setNewTeacher({ ...newTeacher, phone: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={newTeacher.email || ''}
                                        onChange={e => setNewTeacher({ ...newTeacher, email: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Địa chỉ</label>
                                    <input
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={newTeacher.address || ''}
                                        onChange={e => setNewTeacher({ ...newTeacher, address: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Job & Qualifications */}
                            <div className="space-y-4">
                                <h4 className="font-bold text-sm text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">2. Chuyên môn & Công việc</h4>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Cơ sở làm việc</label>
                                    <select
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={newTeacher.mainBranch || 'Hanoi'}
                                        onChange={e => setNewTeacher({ ...newTeacher, mainBranch: e.target.value as any })}
                                    >
                                        <option value="Hanoi">Hà Nội</option>
                                        <option value="HCM">Hồ Chí Minh</option>
                                        <option value="Danang">Đà Nẵng</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Loại hợp đồng</label>
                                        <select
                                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={newTeacher.contractType || 'Full-time'}
                                            onChange={e => setNewTeacher({ ...newTeacher, contractType: e.target.value as any })}
                                        >
                                            <option value="Full-time">Full-time</option>
                                            <option value="Part-time">Part-time</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Ngày vào làm</label>
                                        <input
                                            type="date"
                                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={newTeacher.joinDate || ''}
                                            onChange={e => setNewTeacher({ ...newTeacher, joinDate: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Ngôn ngữ dạy</label>
                                    <input
                                        placeholder="Ví dụ: German, English"
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={newTeacher.languages?.join(', ') || ''}
                                        onChange={e => setNewTeacher({ ...newTeacher, languages: e.target.value.split(',').map(s => s.trim()) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Chứng chỉ / Bằng cấp</label>
                                    <input
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={newTeacher.qualifications || ''}
                                        onChange={e => setNewTeacher({ ...newTeacher, qualifications: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="col-span-2 flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="px-5 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors">Hủy bỏ</button>
                                <button type="submit" className="px-5 py-2.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">Lưu Giáo viên</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

export default TrainingTeachers;
