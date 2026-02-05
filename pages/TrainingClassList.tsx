
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search,
    BookOpen,
    MapPin,
    Calendar,
    MoreHorizontal,
    Plus,
    Users,
    CheckCircle2,
    Clock,
    AlertTriangle,
    GraduationCap,
    ClipboardList,
    BarChart2,

    ArrowUpCircle,
    CheckSquare,
    XSquare,
    AlertCircle,
    MessageSquare,
    Save,
    FileText,
    User,
    ArrowLeft
} from 'lucide-react';

// --- MOCK DATA ---
const CLASSES = [
    {
        id: 'C-001',
        code: 'DE-A1-K24',
        name: 'Tiếng Đức A1 - K24',
        teacher: 'Cô Nguyễn Thị Lan',
        teacherAvatar: 'https://i.pravatar.cc/150?u=a042581f4e29026024d',
        room: 'Phòng 101 - Offline',
        schedule: [
            { day: 'Thứ 2', time: '18:30 - 20:30' },
            { day: 'Thứ 4', time: '18:30 - 20:30' },
            { day: 'Thứ 6', time: '18:30 - 20:30' },
        ],
        students: [
            { id: 'S1', name: 'Nguyễn Văn Nam', status: 'Paid', note: 'Đã đóng đủ', level: 'A1' },
            { id: 'S2', name: 'Trần Thị Bích', status: 'Partial', note: 'Thiếu 2tr', level: 'A1' },
            { id: 'S3', name: 'Lê Hoàng', status: 'Overdue', note: 'Quá hạn 5 ngày', level: 'A1' },
            { id: 'S4', name: 'Phạm Hương', status: 'Paid', note: 'Đã đóng đủ', level: 'A1' },
        ],
        price: '8.000.000 đ',
        status: 'active',
        startDate: '15/09/2025'
    },
    {
        id: 'C-002',
        code: 'CN-HSK3-K05',
        name: 'Luyện thi HSK 3 - K05',
        teacher: 'Cô Trần Mai',
        teacherAvatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704d',
        room: 'Online (Zoom)',
        schedule: [
            { day: 'Thứ 7', time: '14:00 - 16:00' },
            { day: 'Chủ Nhật', time: '14:00 - 16:00' },
        ],
        students: [
            { id: 'S5', name: 'Vũ Minh Hiếu', status: 'Paid', note: 'Đã đóng đủ', level: 'HSK 3' },
            { id: 'S6', name: 'Đặng Thu Thảo', status: 'Paid', note: 'Đã đóng đủ', level: 'HSK 3' },
        ],
        price: '4.500.000 đ',
        status: 'upcoming',
        startDate: '20/11/2025'
    },
    {
        id: 'C-003',
        code: 'DE-A2-K10',
        name: 'Tiếng Đức A2 - K10',
        teacher: 'Thầy Michael Đức',
        teacherAvatar: 'https://i.pravatar.cc/150?u=a042581f4e29026024e',
        room: 'Phòng 102 - Offline',
        schedule: [
            { day: 'Thứ 3', time: '08:30 - 10:30' },
            { day: 'Thứ 5', time: '08:30 - 10:30' },
        ],
        students: [
            { id: 'S7', name: 'Ngô Bá Khá', status: 'Overdue', note: 'Chưa đóng tiền', level: 'A2' },
        ],
        price: '9.000.000 đ',
        status: 'completed',
        startDate: '01/05/2025'
    },
];

const CLASS_INFO = {
    id: 'C-001',
    code: 'DE-A1-K24',
    name: 'Tiếng Đức A1 - K24',
    status: 'Active',
    branch: 'Cơ sở 1 - Hà Nội',
    language: 'Tiếng Đức',
    level: 'A1',
    type: 'Offline',
    schedule: 'T2-4-6 (18:30 - 20:30)',
    startDate: '15/09/2025',
    endDate: '15/12/2025',
    totalSessions: 24,
    completedSessions: 8,
    teacher: 'Cô Nguyễn Thị Lan',
    room: 'Phòng 101',
    teacherAvatar: 'https://i.pravatar.cc/150?u=a042581f4e29026024d',
};

const STUDENTS = [
    { id: 'S1', name: 'Nguyễn Văn Nam', code: 'HV001', status: 'Active', tuition: 'Paid', tuitionNote: 'Đủ', tuitionDate: '15/09' },
    { id: 'S2', name: 'Trần Thị Bích', code: 'HV002', status: 'Reserve', tuition: 'Partial', tuitionNote: 'Thiếu 2tr', tuitionDate: '16/09' },
    { id: 'S3', name: 'Lê Hoàng', code: 'HV003', status: 'Drop', tuition: 'Overdue', tuitionNote: 'Quá hạn', tuitionDate: '10/09' },
    { id: 'S4', name: 'Phạm Hương', code: 'HV004', status: 'Active', tuition: 'Paid', tuitionNote: 'Đủ', tuitionDate: '15/09' },
    { id: 'S5', name: 'Hoàng Minh', code: 'HV005', status: 'Active', tuition: 'Paid', tuitionNote: 'Đủ', tuitionDate: '15/09' },
];

const SESSIONS = [
    { id: 1, date: '15/09', topic: 'Bài 1: Giới thiệu' },
    { id: 2, date: '17/09', topic: 'Bài 2: Chào hỏi' },
    { id: 3, date: '19/09', topic: 'Bài 3: Số đếm' },
    { id: 4, date: '22/09', topic: 'Bài 4: Động từ' },
    { id: 5, date: '24/09', topic: 'Bài 5: Gia đình' },
];

const TrainingClassList: React.FC = () => {
    const navigate = useNavigate();
    const [selectedClassId, setSelectedClassId] = useState(CLASSES[0].id);
    const [searchTerm, setSearchTerm] = useState('');
    const selectedClass = CLASSES.find(c => c.id === selectedClassId) || CLASSES[0];

    // Detail View State
    const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'grades'>('overview');
    const [showLogModal, setShowLogModal] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [logNote, setLogNote] = useState('');

    const handleOpenLog = (student: any) => {
        setSelectedStudent(student);
        setLogNote('');
        setShowLogModal(true);
    };

    const handleSaveLog = () => {
        alert(`Đã lưu ghi chú cho ${selectedStudent.name}: ${logNote}`);
        setShowLogModal(false);
    };

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] text-[#111418] font-sans overflow-hidden">
            <div className="flex flex-1 justify-center py-5 px-6 gap-4 h-full overflow-hidden">

                {/* LEFT SIDEBAR: LIST OF CLASSES */}
                <div className="flex flex-col w-80 shrink-0 h-full overflow-hidden rounded-xl bg-white border border-[#cfdbe7] shadow-sm">
                    <div className="flex flex-wrap justify-between gap-3 p-4 border-b border-[#cfdbe7]">
                        <p className="text-[#111418] tracking-[-0.015em] text-xl font-bold leading-tight">Quản lý Lớp học</p>
                    </div>
                    {/* Search */}
                    <div className="px-4 py-3 bg-[#f8fafc]">
                        <label className="flex flex-col h-10 w-full">
                            <div className="flex w-full flex-1 items-stretch rounded-lg h-full">
                                <div className="text-[#4c739a] flex border-none bg-white items-center justify-center pl-3 rounded-l-lg border-r-0 border border-[#cfdbe7]">
                                    <Search size={18} />
                                </div>
                                <input
                                    placeholder="Tìm lớp..."
                                    className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-r-lg text-[#111418] focus:outline-0 border border-l-0 border-[#cfdbe7] bg-white px-2 text-sm font-normal"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </label>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                        {CLASSES.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())).map((cls) => (
                            <div
                                key={cls.id}
                                onClick={() => setSelectedClassId(cls.id)}
                                className={`flex flex-col gap-1 p-3 rounded-lg cursor-pointer transition-colors mb-1 ${selectedClassId === cls.id ? 'bg-blue-50 border border-blue-100' : 'hover:bg-slate-50 border border-transparent'}`}
                            >
                                <div className="flex justify-between items-start">
                                    <h4 className={`text-sm font-bold leading-tight ${selectedClassId === cls.id ? 'text-blue-700' : 'text-[#111418]'}`}>{cls.name}</h4>
                                    {cls.status === 'active' && <span className="w-2 h-2 rounded-full bg-green-500 mt-1 shrink-0"></span>}
                                    {cls.status === 'upcoming' && <span className="w-2 h-2 rounded-full bg-blue-500 mt-1 shrink-0"></span>}
                                    {cls.status === 'completed' && <span className="w-2 h-2 rounded-full bg-slate-400 mt-1 shrink-0"></span>}
                                </div>
                                <p className="text-[#64748b] text-xs line-clamp-1">{cls.code}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT CONTENT: CLASS DETAIL */}
                <div className="flex flex-col flex-1 h-full overflow-hidden bg-white rounded-xl shadow-sm border border-[#cfdbe7]">

                    {/* Header Card */}
                    <div className="px-6 py-5 border-b border-[#e7edf3] flex justify-between items-start bg-white">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-2xl font-bold text-[#0d141b]">{CLASS_INFO.name}</h1>
                                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 uppercase tracking-wide">
                                    {CLASS_INFO.status}
                                </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-[#4c739a] font-medium">
                                <span className="flex items-center gap-1.5"><Calendar size={15} /> {CLASS_INFO.schedule}</span>
                                <span className="flex items-center gap-1.5"><MapPin size={15} /> {CLASS_INFO.branch} - {CLASS_INFO.room}</span>
                                <span className="flex items-center gap-1.5"><GraduationCap size={15} /> {CLASS_INFO.teacher}</span>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            {activeTab === 'overview' && (
                                <>
                                    <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold transition-colors">
                                        <User size={16} /> Gán Giáo viên
                                    </button>
                                    <button className="flex items-center gap-2 px-4 py-2 bg-[#1380ec] hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-colors shadow-sm">
                                        <Plus size={16} /> Thêm Học viên
                                    </button>
                                </>
                            )}
                            <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500">
                                <MoreHorizontal size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex px-6 border-b border-[#cfdbe7] bg-[#f8fafc]">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'overview' ? 'border-[#1380ec] text-[#1380ec] bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                        >
                            Thông tin & Học viên
                        </button>
                        <button
                            onClick={() => setActiveTab('attendance')}
                            className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'attendance' ? 'border-[#1380ec] text-[#1380ec] bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                        >
                            Điểm danh & Log Note
                        </button>
                        <button
                            onClick={() => setActiveTab('grades')}
                            className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'grades' ? 'border-[#1380ec] text-[#1380ec] bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                        >
                            Bảng điểm
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto p-6 bg-[#f8fafc]">

                        {/* TAB: OVERVIEW */}
                        {activeTab === 'overview' && (
                            <div className="flex flex-col gap-6 max-w-[1200px] mx-auto">

                                {/* Info Grid */}
                                <div className="bg-white rounded-xl border border-[#cfdbe7] px-6 py-5 shadow-sm">
                                    <h3 className="text-[#111418] text-base font-bold mb-4 flex items-center gap-2">
                                        <AlertCircle size={18} className="text-blue-600" /> Thông tin chi tiết
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-8">
                                        <div>
                                            <p className="text-slate-500 text-xs font-semibold uppercase mb-1">Mã lớp</p>
                                            <p className="text-[#0d141b] text-sm font-medium">{CLASS_INFO.code}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-500 text-xs font-semibold uppercase mb-1">Trình độ</p>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">{CLASS_INFO.level}</span>
                                        </div>
                                        <div>
                                            <p className="text-slate-500 text-xs font-semibold uppercase mb-1">Ngôn ngữ</p>
                                            <p className="text-[#0d141b] text-sm font-medium">{CLASS_INFO.language}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-500 text-xs font-semibold uppercase mb-1">Loại lớp</p>
                                            <p className="text-[#0d141b] text-sm font-medium">{CLASS_INFO.type}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-500 text-xs font-semibold uppercase mb-1">Ngày khai giảng</p>
                                            <p className="text-[#0d141b] text-sm font-medium">{CLASS_INFO.startDate}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-500 text-xs font-semibold uppercase mb-1">Dự kiến kết thúc</p>
                                            <p className="text-[#0d141b] text-sm font-medium">{CLASS_INFO.endDate}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-500 text-xs font-semibold uppercase mb-1">Tiến độ</p>
                                            <div className="flex items-center gap-2">
                                                <p className="text-[#0d141b] text-sm font-medium">{CLASS_INFO.completedSessions}/{CLASS_INFO.totalSessions} buổi</p>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-slate-500 text-xs font-semibold uppercase mb-1">Sĩ số</p>
                                            <p className="text-[#0d141b] text-sm font-medium">{STUDENTS.length} Học viên</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Student List */}
                                <div className="bg-white rounded-xl border border-[#cfdbe7] shadow-sm flex flex-col">
                                    <div className="px-6 py-4 border-b border-[#cfdbe7] flex justify-between items-center">
                                        <h3 className="text-[#111418] text-base font-bold flex items-center gap-2">
                                            <Users size={18} className="text-blue-600" /> Danh sách Học viên
                                        </h3>
                                        {/* Filters could go here */}
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="bg-[#f8fafc]">
                                                <tr>
                                                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase border-b border-[#cfdbe7]">Học viên</th>
                                                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase border-b border-[#cfdbe7]">Trạng thái</th>
                                                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase border-b border-[#cfdbe7]">Công nợ</th>
                                                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase border-b border-[#cfdbe7]">Hạn đóng</th>
                                                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase border-b border-[#cfdbe7] text-right">Hành động</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#e7edf3]">
                                                {STUDENTS.map(student => (
                                                    <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-bold text-[#0d141b]">{student.name}</span>
                                                                <span className="text-xs text-slate-500">{student.code}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <select
                                                                className={`text-xs font-bold px-2 py-1 rounded border-0 cursor-pointer outline-none ring-1 ring-inset w-28
                                                                    ${student.status === 'Active' ? 'bg-green-50 text-green-700 ring-green-600/20' : ''}
                                                                    ${student.status === 'Reserve' ? 'bg-amber-50 text-amber-700 ring-amber-600/20' : ''}
                                                                    ${student.status === 'Drop' ? 'bg-red-50 text-red-700 ring-red-600/20' : ''}
                                                                `}
                                                                defaultValue={student.status}
                                                            >
                                                                <option value="Active">Active</option>
                                                                <option value="Reserve">Bảo lưu</option>
                                                                <option value="Drop">Nghỉ học</option>
                                                            </select>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {student.tuition === 'Paid' && (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#e7edf3] text-slate-600">
                                                                    <CheckCircle2 size={12} /> Đã đóng
                                                                </span>
                                                            )}
                                                            {student.tuition === 'Partial' && (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                                                                    <AlertTriangle size={12} /> {student.tuitionNote}
                                                                </span>
                                                            )}
                                                            {student.tuition === 'Overdue' && (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                                                    <XSquare size={12} /> {student.tuitionNote}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-slate-600">
                                                            {student.tuitionDate}
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex justify-end gap-2">
                                                                <button title="Chuyển lớp" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                                    <ArrowUpCircle size={18} />
                                                                </button>
                                                                <button title="Cập nhật điểm" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                                    <BarChart2 size={18} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB: ATTENDANCE & LOGS */}
                        {activeTab === 'attendance' && (
                            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col max-w-[1400px] mx-auto">
                                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                                    <div className="flex items-center gap-4">
                                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                            <Calendar className="text-blue-600" size={20} />
                                            Điểm danh & Ghi chú Hàng ngày
                                        </h3>
                                        <div className="flex gap-4 text-xs font-medium text-slate-500">
                                            <span className="flex items-center gap-1.5"><CheckSquare size={14} className="text-blue-600" /> Có mặt</span>
                                            <span className="flex items-center gap-1.5"><XSquare size={14} className="text-red-500" /> Vắng</span>
                                            <span className="flex items-center gap-1.5"><AlertCircle size={14} className="text-amber-500" /> Muộn</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button className="px-3 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold text-slate-600 hover:bg-slate-50">Xuất Excel</button>
                                        <button className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 shadow-sm">Lưu Dữ liệu</button>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-bold text-center">
                                                <th className="px-4 py-3 text-left w-64 border-r border-slate-200 sticky left-0 bg-slate-50 z-10">Học viên</th>
                                                {SESSIONS.map(session => (
                                                    <th key={session.id} className="px-2 py-3 border-r border-slate-200 min-w-[100px]">
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-slate-800">{session.date}</span>
                                                            <span className="text-[10px] font-normal text-slate-500 line-clamp-1 max-w-[90px]">{session.topic}</span>
                                                        </div>
                                                    </th>
                                                ))}
                                                <th className="px-4 py-3 w-40 border-l border-slate-200">Tổng kết</th>
                                                <th className="px-4 py-3 w-28">Log Note</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-sm">
                                            {STUDENTS.map((student, idx) => (
                                                <tr key={student.id} className="hover:bg-blue-50/30 transition-colors group">
                                                    <td className="px-4 py-3 font-medium text-slate-900 border-r border-slate-200 sticky left-0 bg-white group-hover:bg-blue-50/30">
                                                        <div className="flex flex-col">
                                                            <span>{student.name}</span>
                                                            <span className="text-xs text-slate-400">{student.code}</span>
                                                        </div>
                                                    </td>

                                                    {SESSIONS.map(session => (
                                                        <td key={session.id} className="px-2 py-3 text-center border-r border-slate-200">
                                                            <div className="flex justify-center gap-1">
                                                                <input type="checkbox" className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" defaultChecked />
                                                            </div>
                                                        </td>
                                                    ))}

                                                    <td className="px-4 py-3 text-center border-l border-slate-200">
                                                        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded">100%</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <button
                                                            onClick={() => handleOpenLog(student)}
                                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors relative"
                                                            title="Ghi chú buổi học"
                                                        >
                                                            <MessageSquare size={18} />
                                                            {/* Indicator dot if has note */}
                                                            {idx % 2 === 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>}
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                    </div>

                    {/* Log Note Modal */}
                    {showLogModal && selectedStudent && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
                                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-800">Ghi chú học tập - {selectedStudent.name}</h3>
                                        <p className="text-xs text-slate-500">Cập nhật tình hình học viên theo buổi</p>
                                    </div>
                                    <button onClick={() => setShowLogModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
                                </div>

                                <div className="p-6">
                                    <div className="mb-4">
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Chọn buổi học để ghi nhận xét</label>
                                        <select className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50">
                                            {SESSIONS.map(s => <option key={s.id} value={s.id}>Buổi {s.id} - {s.date} - {s.topic}</option>)}
                                        </select>
                                    </div>

                                    <div className="mb-4">
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Nội dung ghi chú & đánh giá</label>
                                        <textarea
                                            rows={5}
                                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="Ví dụ: Học viên tiếp thu tốt, nhưng cần làm bài tập đầy đủ hơn..."
                                            value={logNote}
                                            onChange={e => setLogNote(e.target.value)}
                                        ></textarea>
                                    </div>

                                    <div className="flex gap-2 text-xs text-slate-500 bg-blue-50 p-3 rounded-lg border border-blue-100">
                                        <AlertCircle size={14} className="text-blue-500 shrink-0 mt-0.5" />
                                        <p>Log note giúp giáo viên và admin theo dõi sát sao tiến độ và thái độ học tập của từng học viên qua từng buổi.</p>
                                    </div>
                                </div>

                                <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
                                    <button onClick={() => setShowLogModal(false)} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-bold hover:bg-white transition-colors">Đóng</button>
                                    <button onClick={handleSaveLog} className="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors flex items-center gap-2">
                                        <Save size={16} /> Lưu Ghi chú
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
};

export default TrainingClassList;
