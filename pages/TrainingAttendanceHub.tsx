import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ClipboardCheck,
    Search,
    CalendarDays,
    Filter,
    CheckCircle2,
    Clock,
    UserCheck
} from 'lucide-react';

// Mock đã loại bỏ — danh sách buổi học sẽ lấy từ storage/service khi có.
const SESSIONS: Array<{ id: string; className: string; sso: string; time: string; date: string; teacher: string; total: number; present: number; status: 'completed' | 'pending' | 'upcoming' }> = [];

const TrainingAttendanceHub: React.FC = () => {
    const navigate = useNavigate();
    const [filterDate, setFilterDate] = useState('2026-02-03');
    const [searchTerm, setSearchTerm] = useState('');

    const filteredSessions = SESSIONS.filter(s =>
        (s.className.toLowerCase().includes(searchTerm.toLowerCase()) || s.sso.toLowerCase().includes(searchTerm.toLowerCase()))
        // In real app, filter by date too. For mock, we show all or just mock logic.
    );

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] text-[#111418] font-sans overflow-y-auto">
            <div className="flex flex-1 flex-col py-8 px-10 max-w-[1600px] mx-auto w-full gap-8">

                {/* Header */}
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                            <ClipboardCheck className="text-blue-600" size={32} />
                            Quản lý Điểm danh
                        </h1>
                        <p className="text-slate-500 mt-1">Ghi nhận và theo dõi chuyên cần của các lớp học.</p>
                    </div>
                    <div className="flex gap-3">
                        {/* Date Picker Mock */}
                        <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-lg shadow-sm">
                            <CalendarDays size={18} className="text-slate-400" />
                            <input
                                type="date"
                                value={filterDate}
                                onChange={(e) => setFilterDate(e.target.value)}
                                className="text-sm font-bold text-slate-700 outline-none border-none bg-transparent"
                            />
                        </div>
                    </div>
                </div>

                {/* Search & Filter Toolbar */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Tìm lớp hoặc mã lớp..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-700 placeholder:text-slate-400"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 font-bold text-slate-600 text-sm">
                        <Filter size={18} /> Lọc trạng thái
                    </button>
                </div>

                {/* Sessions List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredSessions.length === 0 && (
                        <div className="col-span-full bg-white border border-dashed border-slate-200 rounded-xl p-12 text-center text-slate-400 text-sm">
                            Chưa có buổi học nào trong ngày này.
                        </div>
                    )}
                    {filteredSessions.map(session => (
                        <div key={session.id} className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
                            <div className="p-5 border-b border-slate-100 flex-1">
                                <div className="flex justify-between items-start mb-3">
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${session.status === 'completed' ? 'bg-green-100 text-green-700' :
                                            session.status === 'pending' ? 'bg-blue-100 text-blue-700' :
                                                'bg-slate-100 text-slate-500'
                                        }`}>
                                        {session.status === 'completed' ? 'Đã điểm danh' : session.status === 'pending' ? 'Chưa điểm danh' : 'Sắp tới'}
                                    </span>
                                    <span className="text-xs font-bold text-slate-400">{session.date}</span>
                                </div>
                                <h3 className="font-bold text-lg text-slate-900 line-clamp-1" title={session.className}>{session.className}</h3>
                                <p className="text-sm text-slate-500 font-medium mb-4">{session.sso}</p>

                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <Clock size={16} className="text-slate-400" /> {session.time}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <UserCheck size={16} className="text-slate-400" /> GV: {session.teacher}
                                    </div>
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="bg-slate-50 p-4 border-t border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                                    <UserCheck size={14} />
                                    {session.status === 'completed' ? (
                                        <span className="text-green-600">{session.present}/{session.total} có mặt</span>
                                    ) : (
                                        <span>Sĩ số: {session.total}</span>
                                    )}
                                </div>

                                {session.status !== 'upcoming' && (
                                    <button
                                        onClick={() => navigate(`/training/classes/${session.id}/attendance`)} // Reuse existing attendance page
                                        className={`px-4 py-2 rounded-lg text-xs font-bold shadow-sm transition-colors ${session.status === 'completed'
                                                ? 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                                                : 'bg-blue-600 text-white hover:bg-blue-700'
                                            }`}
                                    >
                                        {session.status === 'completed' ? 'Xem lại' : 'Điểm danh'}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

            </div>
        </div>
    );
};

export default TrainingAttendanceHub;
