import React from 'react';
import {
    CalendarCheck,
    Clock,
    MapPin,
    Users,
    MoreHorizontal,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TODAY_CLASSES = [
    { id: 'C1', name: 'Tiếng Đức A1 - K24', room: 'P.101', time: '08:30 - 10:30', teacher: 'Cô Lan', attendance: '18/20', status: 'completed' },
    { id: 'C2', name: 'Luyện thi B1 - K10', room: 'P.102', time: '08:30 - 10:30', teacher: 'Thầy Đức', attendance: '12/15', status: 'completed' },
    { id: 'C3', name: 'Tiếng Trung HSK 3', room: 'P.201', time: '14:00 - 16:00', teacher: 'Cô Mai', attendance: 'Chưa điểm danh', status: 'pending' },
    { id: 'C4', name: 'Giao tiếp A2', room: 'P.101', time: '18:30 - 20:30', teacher: 'Thầy John', attendance: 'Chờ lớp', status: 'upcoming' },
];

const TrainingToday: React.FC = () => {
    const navigate = useNavigate();

    const stats = {
        total: TODAY_CLASSES.length,
        completed: TODAY_CLASSES.filter(c => c.status === 'completed').length,
        pending: TODAY_CLASSES.filter(c => c.status === 'pending' || c.status === 'upcoming').length
    };

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] text-[#111418] font-sans overflow-y-auto">
            <div className="flex flex-1 flex-col py-8 px-10 max-w-[1600px] mx-auto w-full gap-8">

                {/* Header */}
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                            <CalendarCheck className="text-blue-600" size={32} />
                            Lịch học Hôm nay
                        </h1>
                        <p className="text-slate-500 mt-1">Danh sách các lớp học diễn ra trong ngày {new Date().toLocaleDateString('vi-VN')}.</p>
                    </div>
                    <div className="flex gap-3">
                        <div className="bg-white border border-slate-200 px-4 py-2 rounded-lg shadow-sm flex items-center gap-3">
                            <span className="text-sm font-bold text-slate-500 uppercase">Tổng số lớp</span>
                            <span className="text-xl font-bold text-slate-800">{stats.total}</span>
                        </div>
                        <div className="bg-green-50 border border-green-200 px-4 py-2 rounded-lg shadow-sm flex items-center gap-3">
                            <span className="text-sm font-bold text-green-600 uppercase">Đã xong</span>
                            <span className="text-xl font-bold text-green-700">{stats.completed}</span>
                        </div>
                        <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-lg shadow-sm flex items-center gap-3">
                            <span className="text-sm font-bold text-amber-600 uppercase">Chờ học</span>
                            <span className="text-xl font-bold text-amber-700">{stats.pending}</span>
                        </div>
                    </div>
                </div>

                {/* Main List */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-bold border-b border-slate-200">
                                    <th className="px-6 py-4">Thời gian</th>
                                    <th className="px-6 py-4">Lớp học</th>
                                    <th className="px-6 py-4">Giảng viên & Phòng</th>
                                    <th className="px-6 py-4">Trạng thái</th>
                                    <th className="px-6 py-4 text-center">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {TODAY_CLASSES.map((cls) => (
                                    <tr key={cls.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center border font-bold ${cls.status === 'completed' ? 'bg-slate-100 border-slate-200 text-slate-500' :
                                                        cls.status === 'pending' ? 'bg-blue-50 border-blue-100 text-blue-600' :
                                                            'bg-amber-50 border-amber-100 text-amber-600'
                                                    }`}>
                                                    <span className="text-xs">{cls.time.split(' - ')[0]}</span>
                                                </div>
                                                <span className="text-sm font-medium text-slate-500">{cls.time.split(' - ')[1]}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-900 text-base">{cls.name}</div>
                                            <div className="text-xs text-slate-400 mt-0.5">Mã lớp: {cls.id}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2 text-sm text-slate-700 font-medium">
                                                    <Users size={14} className="text-slate-400" /> {cls.teacher}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                                    <MapPin size={14} className="text-slate-400" /> {cls.room}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {cls.status === 'completed' && (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold border border-green-200">
                                                    <CheckCircle2 size={14} /> Đã điểm danh ({cls.attendance})
                                                </span>
                                            )}
                                            {cls.status === 'pending' && (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold border border-blue-200 animate-pulse">
                                                    <AlertCircle size={14} /> Đang diễn ra
                                                </span>
                                            )}
                                            {cls.status === 'upcoming' && (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold border border-amber-200">
                                                    <Clock size={14} /> Sắp tới
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {cls.status !== 'completed' ? (
                                                <button
                                                    onClick={() => navigate(`/training/classes/${cls.id}/attendance`)}
                                                    className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg shadow-sm transition-all"
                                                >
                                                    Điểm danh ngay
                                                </button>
                                            ) : (
                                                <button className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors">
                                                    <MoreHorizontal size={20} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Empty State if needed */}
                    {TODAY_CLASSES.length === 0 && (
                        <div className="p-12 text-center text-slate-500">
                            Không có lớp học nào trong ngày hôm nay.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TrainingToday;
