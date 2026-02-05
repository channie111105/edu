import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    ChevronRight,
    MoreVertical,
    Calendar,
    Clock,
    MapPin,
    Users,
    User,
    CheckSquare,
    XSquare,
    AlertCircle,
    MessageSquare,
    Save,
    FileText
} from 'lucide-react';

// --- MOCK DATA ---
const CLASS_INFO = {
    id: 'C-001',
    code: 'DE-A1-K24',
    name: 'Tiếng Đức A1 - K24',
    status: 'Active',
    teacher: 'Cô Nguyễn Thị Lan',
    room: 'Phòng 101 - Offline',
    schedule: 'T2-4-6 (18:30 - 20:30)',
    startDate: '15/09/2025',
    endDate: '15/12/2025',
    totalSessions: 24,
    completedSessions: 8
};

const STUDENTS = [
    { id: 'S1', name: 'Nguyễn Văn Nam', code: 'HV001' },
    { id: 'S2', name: 'Trần Thị Bích', code: 'HV002' },
    { id: 'S3', name: 'Lê Hoàng', code: 'HV003' },
    { id: 'S4', name: 'Phạm Hương', code: 'HV004' },
    { id: 'S5', name: 'Hoàng Minh', code: 'HV005' },
];

// Mock 5 recent sessions
const SESSIONS = [
    { id: 1, date: '15/09', topic: 'Bài 1: Giới thiệu' },
    { id: 2, date: '17/09', topic: 'Bài 2: Chào hỏi' },
    { id: 3, date: '19/09', topic: 'Bài 3: Số đếm' },
    { id: 4, date: '22/09', topic: 'Bài 4: Động từ' },
    { id: 5, date: '24/09', topic: 'Bài 5: Gia đình' },
];

const TrainingClassDetail: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'attendance' | 'grades'>('attendance');

    // State for Log Note Modal
    const [showLogModal, setShowLogModal] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [logNote, setLogNote] = useState('');

    // Default "All Present" mock state
    const [attendanceData, setAttendanceData] = useState<Record<string, string>>({});

    const handleOpenLog = (student: any) => {
        setSelectedStudent(student);
        setLogNote(''); // Reset or load existing note
        setShowLogModal(true);
    };

    const handleSaveLog = () => {
        // Save logic here
        alert(`Đã lưu ghi chú cho ${selectedStudent.name}: ${logNote}`);
        setShowLogModal(false);
    };

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] text-[#0d141b] font-sans overflow-hidden">

            {/* Header */}
            <div className="flex flex-col border-b border-[#e7edf3] bg-white">
                <div className="flex items-center gap-4 px-6 py-4">
                    <button
                        onClick={() => navigate('/training/classes')}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <ArrowLeft size={24} className="text-slate-600" />
                    </button>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-2xl font-bold text-[#0d141b]">{CLASS_INFO.name}</h1>
                            <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold border border-green-200">Running</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-[#4c739a]">
                            <span className="flex items-center gap-1.5"><CodeIcon /> {CLASS_INFO.code}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                            <span className="flex items-center gap-1.5"><User size={14} /> {CLASS_INFO.teacher}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                            <span className="flex items-center gap-1.5"><MapPin size={14} /> {CLASS_INFO.room}</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50">
                            Sửa thông tin
                        </button>
                        <button className="px-4 py-2 bg-[#1380ec] text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm">
                            Tác vụ
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex px-6 gap-6">
                    <button
                        onClick={() => setActiveTab('attendance')}
                        className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'attendance' ? 'border-[#1380ec] text-[#1380ec]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        Điểm danh & Theo dõi
                    </button>
                    <button
                        onClick={() => setActiveTab('grades')}
                        className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'grades' ? 'border-[#1380ec] text-[#1380ec]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        Bảng điểm & Đánh giá
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-6 lg:p-8 max-w-[1600px] mx-auto w-full">

                {activeTab === 'attendance' && (
                    <div className="flex flex-col gap-6">

                        {/* Stats Cards */}
                        <div className="grid grid-cols-4 gap-4">
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <div className="text-slate-500 text-xs font-bold uppercase mb-1">Tổng số buổi</div>
                                <div className="text-2xl font-black text-slate-800">{CLASS_INFO.completedSessions} / {CLASS_INFO.totalSessions}</div>
                                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                                    <div className="bg-blue-500 h-full rounded-full" style={{ width: '33%' }}></div>
                                </div>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <div className="text-slate-500 text-xs font-bold uppercase mb-1">Sĩ số lớp</div>
                                <div className="text-2xl font-black text-slate-800">{STUDENTS.length} Học viên</div>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <div className="text-slate-500 text-xs font-bold uppercase mb-1">Tỷ lệ chuyên cần</div>
                                <div className="text-2xl font-black text-emerald-600">92%</div>
                            </div>
                        </div>

                        {/* Attendance Table */}
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <Calendar className="text-blue-600" size={20} />
                                    Bảng Điểm Danh Chuyên Cần
                                </h3>
                                <div className="flex gap-2">
                                    <button className="px-3 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold text-slate-600 hover:bg-slate-50">Xuất Excel</button>
                                    <button className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 shadow-sm">Lưu Điểm danh</button>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-bold text-center">
                                            <th className="px-4 py-3 text-left w-64 border-r border-slate-200 sticky left-0 bg-slate-50 z-10">Học viên</th>
                                            {SESSIONS.map(session => (
                                                <th key={session.id} className="px-2 py-3 border-r border-slate-200 min-w-[80px]">
                                                    <div className="flex flex-col items-center">
                                                        <span>{session.date}</span>
                                                        <span className="text-[10px] font-normal text-slate-400">B{session.id}</span>
                                                    </div>
                                                </th>
                                            ))}
                                            <th className="px-4 py-3 w-40">Tổng kết</th>
                                            <th className="px-4 py-3 w-24">Log Note</th>
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
                                                            {/* Mock logic: Cycle statuses or just static checkbox for demo */}
                                                            <label className="cursor-pointer select-none">
                                                                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" defaultChecked />
                                                            </label>
                                                        </div>
                                                    </td>
                                                ))}

                                                <td className="px-4 py-3 text-center">
                                                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded">100%</span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <button
                                                        onClick={() => handleOpenLog(student)}
                                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Ghi chú buổi học"
                                                    >
                                                        <MessageSquare size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="flex gap-6 px-2 text-xs text-slate-500 font-medium">
                            <span className="flex items-center gap-1.5"><CheckSquare size={14} className="text-blue-600" /> Có mặt</span>
                            <span className="flex items-center gap-1.5"><XSquare size={14} className="text-red-500" /> Vắng mặt</span>
                            <span className="flex items-center gap-1.5"><AlertCircle size={14} className="text-amber-500" /> Đi muộn / Về sớm</span>
                        </div>
                    </div>
                )}

                {activeTab === 'grades' && (
                    <div className="flex items-center justify-center p-12 text-slate-400 bg-white border border-dashed border-slate-300 rounded-xl">
                        <div className="text-center">
                            <FileText size={48} className="mx-auto mb-3 opacity-20" />
                            <p>Chức năng Bảng điểm đang được cập nhật...</p>
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
                                <h3 className="font-bold text-lg text-slate-800">Ghi chú học tập</h3>
                                <p className="text-xs text-slate-500">Học viên: {selectedStudent.name}</p>
                            </div>
                            <button onClick={() => setShowLogModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
                        </div>

                        <div className="p-6">
                            <div className="mb-4">
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Chọn buổi học</label>
                                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                                    {SESSIONS.map(s => <option key={s.id} value={s.id}>Buổi {s.id} - {s.date} - {s.topic}</option>)}
                                </select>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Nội dung ghi chú</label>
                                <textarea
                                    rows={4}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Nhập nhận xét về thái độ, bài tập về nhà, mức độ hiểu bài..."
                                    value={logNote}
                                    onChange={e => setLogNote(e.target.value)}
                                ></textarea>
                            </div>

                            <div className="flex gap-2 text-xs text-slate-500 bg-blue-50 p-3 rounded-lg border border-blue-100">
                                <AlertCircle size={14} className="text-blue-500 shrink-0 mt-0.5" />
                                <p>Ghi chú này sẽ được lưu vào hồ sơ học tập của học viên và có thể hiển thị cho phụ huynh (tùy cấu hình).</p>
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
    );
};

// Simple Icon Component
const CodeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
);

export default TrainingClassDetail;
