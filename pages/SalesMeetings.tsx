import React, { useState, useEffect } from 'react';
import {
    Calendar, Search, Filter, CheckCircle, XCircle,
    FileText, User, MapPin, Clock, ChevronRight, MoreHorizontal,
    Building2, ClipboardList
} from 'lucide-react';
import { IMeeting, MeetingStatus, MeetingType, UserRole } from '../types';
import { getMeetings, updateMeeting, getLeadById, saveLead } from '../utils/storage';
import { useAuth } from '../contexts/AuthContext';

const SalesMeetings: React.FC = () => {
    const { user } = useAuth();
    const [meetings, setMeetings] = useState<IMeeting[]>([]);

    // Filters
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterDate, setFilterDate] = useState<string>('all'); // today, tomorrow, week
    const [filterBranch, setFilterBranch] = useState<string>('all'); // branch filter
    const [searchTerm, setSearchTerm] = useState('');

    const [selectedMeeting, setSelectedMeeting] = useState<IMeeting | null>(null);
    const [isResultModalOpen, setIsResultModalOpen] = useState(false);

    // Result Form State
    const [resultScore, setResultScore] = useState('');
    const [resultNotes, setResultNotes] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = () => {
        setMeetings(getMeetings());
    };

    const handleConfirm = (id: string) => {
        const meeting = meetings.find(m => m.id === id);
        if (meeting && meeting.status === MeetingStatus.DRAFT) {
            const updated = { ...meeting, status: MeetingStatus.CONFIRMED };
            updateMeeting(updated);
            loadData();
        }
    };

    const handleCancel = (id: string) => {
        if (window.confirm('Bạn có chắc chắn muốn hủy lịch hẹn này?')) {
            const meeting = meetings.find(m => m.id === id);
            if (meeting) {
                // In a real app, we might ask for a reason here
                const updated = { ...meeting, status: MeetingStatus.CANCELLED };
                updateMeeting(updated);
                loadData();
            }
        }
    };

    const openResultModal = (meeting: IMeeting) => {
        setSelectedMeeting(meeting);
        setResultScore(meeting.result || '');
        setResultNotes(meeting.feedback || '');
        setIsResultModalOpen(true);
    };

    const submitResult = () => {
        if (selectedMeeting) {
            // 1. Update Meeting
            const updated: IMeeting = {
                ...selectedMeeting,
                status: MeetingStatus.SUBMITTED,
                result: resultScore,
                feedback: resultNotes,
                teacherId: user?.id,
                teacherName: user?.name
            };
            updateMeeting(updated);

            // 2. Sync to Lead's Activity Log
            const lead = getLeadById(selectedMeeting.leadId);
            if (lead) {
                const newActivity = {
                    id: `res-${Date.now()}`,
                    type: 'system', // or 'note'
                    content: `KẾT QUẢ TEST: ${resultScore}`,
                    subContent: `GV ${user?.name || 'Giáo viên'} đánh giá: ${resultNotes}`,
                    timestamp: new Date().toLocaleString('vi-VN'),
                    isSystem: true
                };
                // Assuming lead.activities exists, if not initialize array
                const currentActivities = lead.activities || [];
                // We need to match the Activity interface in LeadDetails (or storage)
                // In storage.ts, Activity is IActivityLog. LeadDetails uses local interface IActivity mapping. 
                // Let's rely on storage.ts structure which usually mirrors IActivityLog in types.ts
                // IActivityLog: { id, type, timestamp, title, description, user, ... }

                // Let's look at types.ts IActivityLog definition again to be safe.
                // It has: type: 'note' | 'message' | 'system' | 'activity'

                const logEntry: any = { // Using any to bypass strict type check for now if slight mismatch
                    id: `res-${Date.now()}`,
                    type: 'system',
                    title: `KẾT QUẢ TEST: ${resultScore}`,
                    description: `GV ${user?.name || 'Giáo viên'} đánh giá: ${resultNotes}`,
                    timestamp: new Date().toISOString(),
                    user: user?.name || 'Teacher'
                };

                const updatedLead = {
                    ...lead,
                    activities: [logEntry, ...currentActivities] // Prepend
                };
                saveLead(updatedLead);
            }

            setIsResultModalOpen(false);
            loadData();
        }
    };

    // Permission Helpers
    const isSales = user?.role === UserRole.SALES_REP || user?.role === UserRole.SALES_LEADER;
    const isTeacher = user?.role === UserRole.TEACHER || user?.role === UserRole.TRAINING;
    const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.FOUNDER;

    const canConfirm = isSales || isAdmin;
    // EXTENDED: Allow Sales to convert/submit result for testing flow
    const canResult = isTeacher || isAdmin || isSales;

    const MOCK_TEACHERS = [
        { id: 'T01', name: 'Nguyễn Văn A (IELTS)' },
        { id: 'T02', name: 'Trần Thị B (Tiếng Đức)' },
        { id: 'T03', name: 'Lê Văn C (Tiếng Trung)' }
    ];

    const assignTeacher = (meetingId: string, teacherId: string) => {
        const teacher = MOCK_TEACHERS.find(t => t.id === teacherId);
        const meeting = meetings.find(m => m.id === meetingId);
        if (meeting && teacher) {
            const updated = { ...meeting, teacherId: teacher.id, teacherName: teacher.name };
            updateMeeting(updated);
            loadData();
        }
    };

    const filteredMeetings = meetings.filter(m => {
        const matchesSearch = m.leadName.toLowerCase().includes(searchTerm.toLowerCase()) || m.leadPhone.includes(searchTerm);
        const matchesStatus = filterStatus === 'all' || m.status === filterStatus;
        const matchesBranch = filterBranch === 'all' || (m.campus === filterBranch);

        let matchesDate = true;
        const mDate = new Date(m.datetime);
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfTomorrow = new Date(startOfToday);
        startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
        const endOfTomorrow = new Date(startOfTomorrow);
        endOfTomorrow.setDate(endOfTomorrow.getDate() + 1);

        if (filterDate === 'today') {
            matchesDate = mDate >= startOfToday && mDate < startOfTomorrow;
        } else if (filterDate === 'tomorrow') {
            matchesDate = mDate >= startOfTomorrow && mDate < endOfTomorrow;
        } else if (filterDate === 'week') {
            const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())); // Sunday
            matchesDate = mDate >= startOfWeek;
        }

        return matchesSearch && matchesStatus && matchesDate && matchesBranch;
    });

    const getStatusBadge = (status: MeetingStatus) => {
        switch (status) {
            case MeetingStatus.DRAFT:
                return <span className="px-2 py-1 rounded text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">Draft</span>;
            case MeetingStatus.CONFIRMED:
                return <span className="px-2 py-1 rounded text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">Waiting Test</span>;
            case MeetingStatus.SUBMITTED:
                return <span className="px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-700 border border-green-200">Submit</span>;
            case MeetingStatus.CANCELLED:
                return <span className="px-2 py-1 rounded text-xs font-bold bg-red-100 text-red-700 border border-red-200">Cancel</span>;
            default:
                return <span className="px-2 py-1 rounded text-xs font-bold bg-slate-100 text-slate-600">{status}</span>;
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] p-6 font-inter">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Lịch hẹn & Test đầu vào</h1>
                    <p className="text-sm text-slate-500 mt-1">Quản lý lịch phỏng vấn, test trình độ học viên</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={loadData} className="px-3 py-2 bg-white border border-slate-200 rounded text-slate-600 text-sm font-medium hover:bg-slate-50 shadow-sm transition-all">
                        Refresh
                    </button>
                    {/* Activity Creation will handle Adding Meetings */}
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-wrap gap-4 items-center">
                <div className="relative w-64">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Tìm tên, SĐT..."
                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 transition-all"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Filter Date */}
                <div className="flex items-center gap-2 border-l border-slate-200 pl-4 h-full">
                    <Calendar size={16} className="text-slate-400" />
                    <select
                        className="text-sm outline-none text-slate-700 font-medium bg-transparent cursor-pointer hover:text-blue-600"
                        value={filterDate}
                        onChange={e => setFilterDate(e.target.value)}
                    >
                        <option value="all">Tất cả thời gian</option>
                        <option value="today">Hôm nay</option>
                        <option value="tomorrow">Ngày mai</option>
                        <option value="week">Tuần này</option>
                    </select>
                </div>

                {/* Filter Branch */}
                <div className="flex items-center gap-2 border-l border-slate-200 pl-4 h-full">
                    <Building2 size={16} className="text-slate-400" />
                    <select
                        className="text-sm outline-none text-slate-700 font-medium bg-transparent cursor-pointer hover:text-blue-600"
                        value={filterBranch}
                        onChange={e => setFilterBranch(e.target.value)}
                    >
                        <option value="all">Tất cả cơ sở</option>
                        <option value="Hanoi">Hà Nội</option>
                        <option value="HCMC">TP. HCM</option>
                        <option value="DaNang">Đà Nẵng</option>
                    </select>
                </div>

                {/* Filter Status */}
                <div className="flex items-center gap-2 border-l border-slate-200 pl-4 h-full">
                    <Filter size={16} className="text-slate-400" />
                    <select
                        className="text-sm outline-none text-slate-700 font-medium bg-transparent cursor-pointer hover:text-blue-600"
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                    >
                        <option value="all">Tất cả trạng thái</option>
                        <option value={MeetingStatus.DRAFT}>Draft</option>
                        <option value={MeetingStatus.CONFIRMED}>Waiting Test</option>
                        <option value={MeetingStatus.SUBMITTED}>Submit</option>
                        <option value={MeetingStatus.CANCELLED}>Cancel</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold sticky top-0 border-b border-slate-200">
                            <tr>
                                <th className="p-4 w-40">Thời gian</th>
                                <th className="p-4 w-56">Thông tin khách</th>
                                <th className="p-4 w-48">Địa chỉ</th>
                                <th className="p-4 w-40">Phụ trách</th>
                                <th className="p-4 w-40">Giáo viên</th>
                                <th className="p-4 min-w-[180px]">Nội dung & Ghi chú</th>
                                <th className="p-4 w-32">Trạng thái</th>
                                <th className="p-4 w-36 text-right">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {filteredMeetings.length > 0 ? filteredMeetings.map(m => {
                                const mDate = new Date(m.datetime);
                                // Logic Overdue: Past time and NOT Submitted/Cancelled
                                const isOverdue = m.status !== MeetingStatus.SUBMITTED && m.status !== MeetingStatus.CANCELLED && mDate < new Date();
                                // Logic Upcoming: Not overdue, but soon (e.g. today)
                                const isToday = mDate.toDateString() === new Date().toDateString();
                                const isUpcoming = !isOverdue && isToday;

                                return (
                                    <tr key={m.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="p-4 align-top">
                                            <div className="flex flex-col gap-1">
                                                <div className={`font-bold text-lg ${isOverdue ? 'text-red-600' : (isUpcoming ? 'text-blue-600' : 'text-slate-800')}`}>
                                                    {mDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                                <div className="text-xs text-slate-500 font-medium flex items-center gap-1">
                                                    <Calendar size={12} />
                                                    {mDate.toLocaleDateString('vi-VN')}
                                                </div>
                                                {isOverdue && <span className="inline-block px-1.5 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded w-fit">QUÁ HẠN</span>}
                                            </div>
                                        </td>
                                        <td className="p-4 align-top">
                                            <div className="flex flex-col gap-1">
                                                <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors cursor-pointer">{m.leadName}</div>
                                                <div className="text-xs text-slate-500 flex items-center gap-1">
                                                    <User size={12} /> {m.leadPhone}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 align-top">
                                            <div className="text-xs text-slate-600 flex items-start gap-1">
                                                <MapPin size={12} className="mt-0.5 shrink-0 text-slate-400" />
                                                <span className="line-clamp-2">{m.address || '-'}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 align-top">
                                            <div className="flex flex-col gap-1">
                                                <div className="text-sm font-medium text-slate-700">{m.salesPersonName || '-'}</div>
                                                <div className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded w-fit">
                                                    {m.campus || 'N/A'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 align-top">
                                            {m.teacherName ? (
                                                <div className="text-sm font-medium text-slate-700">{m.teacherName}</div>
                                            ) : (
                                                <select
                                                    className="w-full text-xs p-1 border border-slate-200 rounded outline-none bg-white hover:border-blue-400 focus:border-blue-500 transition-all text-slate-500"
                                                    onChange={(e) => assignTeacher(m.id, e.target.value)}
                                                    defaultValue=""
                                                >
                                                    <option value="" disabled>-- Chọn GV --</option>
                                                    {MOCK_TEACHERS.map(t => (
                                                        <option key={t.id} value={t.id}>{t.name}</option>
                                                    ))}
                                                </select>
                                            )}
                                        </td>
                                        <td className="p-4 align-top">
                                            <div className="space-y-2">
                                                <div>
                                                    <span className="text-sm font-medium text-slate-800 flex items-center gap-1">
                                                        {m.type === MeetingType.ONLINE ? <span className="w-2 h-2 rounded-full bg-indigo-500"></span> : <span className="w-2 h-2 rounded-full bg-orange-500"></span>}
                                                        {m.type}
                                                    </span>
                                                </div>

                                                {m.notes && <div className="text-xs text-slate-600 italic bg-yellow-50 p-2 rounded border border-yellow-100 flex gap-1">
                                                    <FileText size={12} className="shrink-0 mt-0.5 text-yellow-600" />
                                                    "{m.notes}"
                                                </div>}

                                                {m.result && (
                                                    <div className="bg-green-50 p-2 rounded border border-green-100 mt-1">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="text-[10px] font-bold text-green-700 uppercase">Kết quả</span>
                                                            <span className="text-xs font-bold text-green-700">{m.result}</span>
                                                        </div>
                                                        {m.feedback && <p className="text-[10px] text-green-600 italic border-t border-green-200 pt-1 mt-1">{m.feedback}</p>}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4 align-top">
                                            {getStatusBadge(m.status)}
                                        </td>
                                        <td className="p-4 align-top text-right">
                                            <div className="flex justify-end gap-2 items-center">
                                                {m.status === MeetingStatus.DRAFT && canConfirm && (
                                                    <button
                                                        onClick={() => handleConfirm(m.id)}
                                                        className="p-1.5 px-3 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 shadow-sm transition-all whitespace-nowrap"
                                                    >
                                                        Confirm
                                                    </button>
                                                )}

                                                {m.status === MeetingStatus.CONFIRMED && canResult && (
                                                    <button
                                                        onClick={() => openResultModal(m)}
                                                        className="p-1.5 px-3 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 shadow-sm transition-all flex items-center gap-1 ml-auto whitespace-nowrap"
                                                    >
                                                        <ClipboardList size={14} /> Submit KQ
                                                    </button>
                                                )}

                                                {/* Cancel Button - Always Visible for active meetings */}
                                                {(m.status === MeetingStatus.DRAFT || m.status === MeetingStatus.CONFIRMED) && (
                                                    <button
                                                        onClick={() => handleCancel(m.id)}
                                                        className="p-1.5 px-3 bg-white text-slate-500 rounded-lg text-xs font-bold hover:bg-red-50 hover:text-red-600 border border-slate-200 transition-all whitespace-nowrap"
                                                        title="Hủy lịch hẹn"
                                                    >
                                                        Hủy
                                                    </button>
                                                )}

                                                {m.status === MeetingStatus.SUBMITTED && (
                                                    <button disabled className="text-slate-400 text-xs font-medium cursor-not-allowed whitespace-nowrap">Đã xong</button>
                                                )}
                                                {(m.status === MeetingStatus.CANCELLED) && (
                                                    <span className="text-slate-400 text-xs whitespace-nowrap">-</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );

                            }) : (
                                <tr>
                                    <td colSpan={8} className="p-12 text-center text-slate-400 italic">
                                        <div className="flex flex-col items-center gap-2">
                                            <Calendar size={48} className="text-slate-200" />
                                            <p>Không tìm thấy lịch hẹn nào phù hợp.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* RESULT MODAL */}
            {isResultModalOpen && selectedMeeting && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsResultModalOpen(false)}></div>
                    <div className="relative bg-white w-full max-w-md rounded-xl shadow-2xl p-6 animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-slate-900">Kết quả Test / Phỏng vấn</h2>
                            <button onClick={() => setIsResultModalOpen(false)} className="text-slate-400 hover:text-slate-600"><XCircle size={24} /></button>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-lg mb-4 border border-slate-100">
                            <p className="text-sm font-bold text-slate-800">{selectedMeeting.leadName}</p>
                            <p className="text-xs text-slate-500">{selectedMeeting.type}</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Điểm số / Kết quả <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none font-medium"
                                    placeholder="VD: 8.5/10 hoặc Đạt"
                                    value={resultScore}
                                    onChange={e => setResultScore(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Đánh giá / Ghi chú chi tiết</label>
                                <textarea
                                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm h-32 resize-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                                    placeholder="Nhập nhận xét về kỹ năng, thái độ..."
                                    value={resultNotes}
                                    onChange={e => setResultNotes(e.target.value)}
                                ></textarea>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                            <button
                                onClick={() => setIsResultModalOpen(false)}
                                className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                onClick={submitResult}
                                className="px-6 py-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm shadow-green-200"
                            >
                                Lưu & Hoàn thành
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalesMeetings;
