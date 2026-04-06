import React, { useEffect, useMemo, useState } from 'react';
import {
    Calendar, Filter, XCircle,
    FileText, User, MapPin,
    Building2, ClipboardList, Monitor, Pencil, Plus
} from 'lucide-react';
import { IMeeting, MeetingStatus, MeetingType, UserRole } from '../types';
import { getMeetings, updateMeeting, getLeadById, saveLead } from '../utils/storage';
import { useAuth } from '../contexts/AuthContext';
import CreateMeetingModal from '../components/CreateMeetingModal';
import { MEETING_TEACHERS, hasTeacherConflict } from '../utils/meetingHelpers';
import PinnedSearchInput, { PinnedSearchChip } from '../components/PinnedSearchInput';

const normalizeCampus = (value?: string) => {
    const normalized = value?.trim().toLowerCase();

    if (!normalized) return '';
    if (['hà nội', 'ha noi', 'hanoi', 'hn'].includes(normalized)) return 'Hà Nội';
    if (['hcm', 'hồ chí minh', 'ho chi minh', 'tp. hcm', 'tphcm', 'hcmc'].includes(normalized)) return 'HCM';
    if (['đà nẵng', 'da nang', 'danang', 'dn'].includes(normalized)) return 'Đà Nẵng';

    return value || '';
};

const SalesMeetings: React.FC = () => {
    const { user } = useAuth();
    const [meetings, setMeetings] = useState<IMeeting[]>([]);

    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterDate, setFilterDate] = useState<string>('all');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [filterBranch, setFilterBranch] = useState<string>('all');
    const [filterType, setFilterType] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');

    const [selectedMeeting, setSelectedMeeting] = useState<IMeeting | null>(null);
    const [meetingToEdit, setMeetingToEdit] = useState<IMeeting | null>(null);
    const [isResultModalOpen, setIsResultModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const [resultScore, setResultScore] = useState('');
    const [resultNotes, setResultNotes] = useState('');

    const loadData = () => setMeetings(getMeetings());

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        const syncMeetings = () => loadData();
        window.addEventListener('educrm:meetings-changed', syncMeetings as EventListener);
        window.addEventListener('storage', syncMeetings);
        return () => {
            window.removeEventListener('educrm:meetings-changed', syncMeetings as EventListener);
            window.removeEventListener('storage', syncMeetings);
        };
    }, []);

    const normalizeMeetingType = (type?: string): MeetingType =>
        type === MeetingType.ONLINE ? MeetingType.ONLINE : MeetingType.OFFLINE;

    const getMeetingTypeLabel = (type?: string) =>
        normalizeMeetingType(type) === MeetingType.ONLINE ? 'Online' : 'Offline';

    const handleFilterDateChange = (value: string) => {
        setFilterDate(value);
        if (value !== 'custom') {
            setCustomStartDate('');
            setCustomEndDate('');
        }
    };

    const handleConfirm = (id: string) => {
        const meeting = meetings.find(m => m.id === id);
        if (!meeting || meeting.status !== MeetingStatus.DRAFT) return;
        const canConfirmMeeting = isAdmin || user?.role === UserRole.SALES_LEADER || meeting.salesPersonId === user?.id;
        if (!canConfirmMeeting) return;

        updateMeeting({ ...meeting, status: MeetingStatus.CONFIRMED });
        loadData();
    };

    const handleCancel = (id: string) => {
        if (!window.confirm('Bạn có chắc chắn muốn hủy lịch hẹn này?')) return;
        const meeting = meetings.find(m => m.id === id);
        if (!meeting) return;
        updateMeeting({ ...meeting, status: MeetingStatus.CANCELLED });
        loadData();
    };

    const handleEdit = (meeting: IMeeting) => {
        setMeetingToEdit(meeting);
        setIsCreateModalOpen(true);
    };

    const openResultModal = (meeting: IMeeting) => {
        setSelectedMeeting(meeting);
        setResultScore(meeting.result || '');
        setResultNotes(meeting.feedback || '');
        setIsResultModalOpen(true);
    };

    const submitResult = () => {
        if (!selectedMeeting) return;

        const updated: IMeeting = {
            ...selectedMeeting,
            status: MeetingStatus.SUBMITTED,
            result: resultScore,
            feedback: resultNotes,
            teacherId: user?.id,
            teacherName: user?.name
        };
        updateMeeting(updated);

        const lead = getLeadById(selectedMeeting.leadId);
        if (lead) {
            const logEntry: any = {
                id: `res-${Date.now()}`,
                type: 'system',
                title: `KẾT QUẢ TEST: ${resultScore}`,
                description: `GV ${user?.name || 'Giáo viên'} đánh giá: ${resultNotes}`,
                timestamp: new Date().toISOString(),
                user: user?.name || 'Teacher'
            };
            saveLead({ ...lead, activities: [logEntry, ...(lead.activities || [])] });
        }

        setIsResultModalOpen(false);
        loadData();
    };

    const isSales = user?.role === UserRole.SALES_REP || user?.role === UserRole.SALES_LEADER;
    const isTeacher = user?.role === UserRole.TEACHER || user?.role === UserRole.TRAINING;
    const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.FOUNDER;

    const canConfirm = isSales || isAdmin;
    const canResult = isTeacher || isAdmin || isSales;

    const assignTeacher = (meetingId: string, teacherId: string) => {
        const teacher = MEETING_TEACHERS.find(t => t.id === teacherId);
        const meeting = meetings.find(m => m.id === meetingId);
        if (meeting && teacher) {
            if (hasTeacherConflict(teacher.id, meeting.datetime, meeting.id)) {
                window.alert('Giáo viên đã có lịch trùng giờ. Vui lòng cân nhắc đổi giờ hoặc đổi giáo viên.');
            }
            updateMeeting({ ...meeting, teacherId: teacher.id, teacherName: teacher.name });
            loadData();
        }
    };

    const filteredMeetings = useMemo(() => meetings.filter(m => {
        const matchesSearch = m.leadName.toLowerCase().includes(searchTerm.toLowerCase()) || m.leadPhone.includes(searchTerm);
        const matchesStatus = filterStatus === 'all' || m.status === filterStatus;
        const matchesBranch = filterBranch === 'all' || normalizeCampus(m.campus) === filterBranch;
        const matchesType = filterType === 'all' || normalizeMeetingType(m.type) === filterType;

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
            const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
            matchesDate = mDate >= startOfWeek;
        } else if (filterDate === 'custom') {
            const startDate = customStartDate ? new Date(customStartDate) : null;
            const endDate = customEndDate ? new Date(customEndDate) : null;

            if (startDate) {
                startDate.setHours(0, 0, 0, 0);
                matchesDate = matchesDate && mDate >= startDate;
            }

            if (endDate) {
                endDate.setHours(23, 59, 59, 999);
                matchesDate = matchesDate && mDate <= endDate;
            }
        }

        return matchesSearch && matchesStatus && matchesBranch && matchesType && matchesDate;
    }), [meetings, searchTerm, filterStatus, filterBranch, filterType, filterDate, customStartDate, customEndDate]);

    const statusLabelMap: Record<string, string> = {
        all: 'Tat ca trang thai',
        [MeetingStatus.DRAFT]: 'Draft',
        [MeetingStatus.CONFIRMED]: 'Confirm',
        [MeetingStatus.SUBMITTED]: 'Submit',
        [MeetingStatus.CANCELLED]: 'Cancel'
    };

    const typeLabelMap: Record<string, string> = {
        all: 'Tat ca hinh thuc',
        [MeetingType.OFFLINE]: 'Offline',
        [MeetingType.ONLINE]: 'Online'
    };

    const dateLabelMap: Record<string, string> = {
        all: 'Tat ca thoi gian',
        today: 'Hom nay',
        tomorrow: 'Ngay mai',
        week: 'Tuan nay',
        custom: 'Tuy bien'
    };

    const activeSearchChips = useMemo<PinnedSearchChip[]>(() => {
        const chips: PinnedSearchChip[] = [];

        if (filterDate !== 'all') {
            const customLabel = filterDate === 'custom'
                ? [customStartDate, customEndDate].filter(Boolean).join(' - ') || 'Tuy bien'
                : dateLabelMap[filterDate] || filterDate;
            chips.push({ key: 'date', label: `Thoi gian: ${customLabel}` });
        }

        if (filterBranch !== 'all') {
            chips.push({ key: 'branch', label: `Co so: ${filterBranch}` });
        }

        if (filterStatus !== 'all') {
            chips.push({ key: 'status', label: `Trang thai: ${statusLabelMap[filterStatus] || filterStatus}` });
        }

        if (filterType !== 'all') {
            chips.push({ key: 'type', label: `Hinh thuc: ${typeLabelMap[filterType] || filterType}` });
        }

        return chips;
    }, [filterDate, customStartDate, customEndDate, filterBranch, filterStatus, filterType, dateLabelMap, statusLabelMap, typeLabelMap]);

    const removeSearchChip = (chipKey: string) => {
        if (chipKey === 'date') {
            setFilterDate('all');
            setCustomStartDate('');
            setCustomEndDate('');
            return;
        }
        if (chipKey === 'branch') {
            setFilterBranch('all');
            return;
        }
        if (chipKey === 'status') {
            setFilterStatus('all');
            return;
        }
        if (chipKey === 'type') {
            setFilterType('all');
        }
    };

    const clearAllSearchFilters = () => {
        setSearchTerm('');
        setFilterDate('all');
        setCustomStartDate('');
        setCustomEndDate('');
        setFilterBranch('all');
        setFilterStatus('all');
        setFilterType('all');
    };

    const getStatusBadge = (status: MeetingStatus) => {
        switch (status) {
            case MeetingStatus.DRAFT:
                return <span className="px-2 py-1 rounded text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">Draft</span>;
            case MeetingStatus.CONFIRMED:
                return <span className="px-2 py-1 rounded text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">Confirm</span>;
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
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Lịch hẹn & Test đầu vào</h1>
                    <p className="text-sm text-slate-500 mt-1">Quản lý lịch phỏng vấn, test trình độ học viên</p>
                </div>
                <button
                    onClick={() => {
                        setMeetingToEdit(null);
                        setIsCreateModalOpen(true);
                    }}
                    className="px-3 py-2 bg-emerald-600 border border-emerald-700 rounded text-white text-sm font-bold hover:bg-emerald-700 shadow-sm transition-all flex items-center gap-1"
                >
                    <Plus size={14} /> Tạo lịch hẹn
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[300px]">
                    <PinnedSearchInput
                        value={searchTerm}
                        onChange={setSearchTerm}
                        placeholder="Tim ten, SDT..."
                        chips={activeSearchChips}
                        onRemoveChip={removeSearchChip}
                        onClearAll={clearAllSearchFilters}
                        clearAllAriaLabel="Xoa tat ca bo loc lich hen"
                        inputClassName="text-sm h-7"
                    />
                </div>

                <div className="flex items-center gap-2 border-l border-slate-200 pl-4 h-full">
                    <Calendar size={16} className="text-slate-400" />
                    <select className="text-sm outline-none text-slate-700 font-medium bg-transparent cursor-pointer hover:text-blue-600" value={filterDate} onChange={e => handleFilterDateChange(e.target.value)}>
                        <option value="all">Tất cả thời gian</option>
                        <option value="today">Hôm nay</option>
                        <option value="tomorrow">Ngày mai</option>
                        <option value="week">Tuần này</option>
                        <option value="custom">Tùy biến</option>
                    </select>
                </div>

                {filterDate === 'custom' && (
                    <div className="flex items-center gap-2 border-l border-slate-200 pl-4 h-full">
                        <input
                            type="date"
                            value={customStartDate}
                            onChange={e => setCustomStartDate(e.target.value)}
                            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:bg-white"
                        />
                        <span className="text-xs font-medium text-slate-400">đến</span>
                        <input
                            type="date"
                            value={customEndDate}
                            min={customStartDate || undefined}
                            onChange={e => setCustomEndDate(e.target.value)}
                            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:bg-white"
                        />
                    </div>
                )}

                <div className="flex items-center gap-2 border-l border-slate-200 pl-4 h-full">
                    <Building2 size={16} className="text-slate-400" />
                    <select className="text-sm outline-none text-slate-700 font-medium bg-transparent cursor-pointer hover:text-blue-600" value={filterBranch} onChange={e => setFilterBranch(e.target.value)}>
                        <option value="all">Tất cả cơ sở</option>
                        <option value="Hà Nội">Hà Nội</option>
                        <option value="HCM">HCM</option>
                        <option value="Đà Nẵng">Đà Nẵng</option>
                    </select>
                </div>

                <div className="flex items-center gap-2 border-l border-slate-200 pl-4 h-full">
                    <Filter size={16} className="text-slate-400" />
                    <select className="text-sm outline-none text-slate-700 font-medium bg-transparent cursor-pointer hover:text-blue-600" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option value="all">Tất cả trạng thái</option>
                        <option value={MeetingStatus.DRAFT}>Draft</option>
                        <option value={MeetingStatus.CONFIRMED}>Confirm</option>
                        <option value={MeetingStatus.SUBMITTED}>Submit</option>
                        <option value={MeetingStatus.CANCELLED}>Cancel</option>
                    </select>
                </div>

                <div className="flex items-center gap-2 border-l border-slate-200 pl-4 h-full">
                    <Monitor size={16} className="text-slate-400" />
                    <select className="text-sm outline-none text-slate-700 font-medium bg-transparent cursor-pointer hover:text-blue-600 appearance-none" value={filterType} onChange={e => setFilterType(e.target.value)}>
                        <option value="all">Tất cả hình thức</option>
                        <option value={MeetingType.OFFLINE}>Offline</option>
                        <option value={MeetingType.ONLINE}>Online</option>
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold sticky top-0 border-b border-slate-200">
                            <tr>
                                <th className="p-4 w-16 text-center">STT</th>
                                <th className="p-4 w-44">Thời gian & Ngày</th>
                                <th className="p-4 w-56">Contact Name / SĐT</th>
                                <th className="p-4 w-56">Địa chỉ</th>
                                <th className="p-4 w-32">Cơ sở</th>
                                <th className="p-4 w-44">Salesperson</th>
                                <th className="p-4 w-44">Giáo viên test</th>
                                <th className="p-4 w-44">Hình thức hẹn / Kết quả</th>
                                <th className="p-4 min-w-[220px]">Note</th>
                                <th className="p-4 w-32">Trạng thái</th>
                                <th className="p-4 w-52 text-right">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {filteredMeetings.length > 0 ? filteredMeetings.map((m, index) => {
                                const mDate = new Date(m.datetime);
                                const canConfirmMeeting =
                                    canConfirm &&
                                    (isAdmin || user?.role === UserRole.SALES_LEADER || m.salesPersonId === user?.id);
                                const isOverdue = m.status !== MeetingStatus.SUBMITTED && m.status !== MeetingStatus.CANCELLED && mDate < new Date();
                                const isToday = mDate.toDateString() === new Date().toDateString();
                                const isUpcoming = !isOverdue && isToday;

                                return (
                                    <tr key={m.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="p-4 align-top text-center font-semibold text-slate-500">{index + 1}</td>
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
                                            <div className="text-xs text-slate-600 font-semibold bg-slate-100 px-2 py-1 rounded w-fit">
                                                {m.campus || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="p-4 align-top">
                                            <div className="text-sm font-medium text-slate-700">{m.salesPersonName || '-'}</div>
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
                                                    {MEETING_TEACHERS.map(t => (
                                                        <option key={t.id} value={t.id}>{t.name}</option>
                                                    ))}
                                                </select>
                                            )}
                                        </td>
                                        <td className="p-4 align-top">
                                            <div className="space-y-2">
                                                <div>
                                                    <span className="text-sm font-medium text-slate-800 flex items-center gap-1">
                                                        {normalizeMeetingType(m.type) === MeetingType.ONLINE ? <span className="w-2 h-2 rounded-full bg-indigo-500"></span> : <span className="w-2 h-2 rounded-full bg-orange-500"></span>}
                                                        {getMeetingTypeLabel(m.type)}
                                                    </span>
                                                </div>
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
                                            {m.notes ? (
                                                <div className="text-xs text-slate-600 italic bg-yellow-50 p-2 rounded border border-yellow-100 flex gap-1">
                                                    <FileText size={12} className="shrink-0 mt-0.5 text-yellow-600" />
                                                    "{m.notes}"
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-400">-</span>
                                            )}
                                        </td>
                                        <td className="p-4 align-top">{getStatusBadge(m.status)}</td>
                                        <td className="p-4 align-top text-right">
                                            <div className="flex justify-end gap-2 items-center">
                                                {(m.status === MeetingStatus.DRAFT || m.status === MeetingStatus.CONFIRMED) && (
                                                    <button
                                                        onClick={() => handleEdit(m)}
                                                        className="p-1.5 px-3 bg-white text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 border border-slate-200 transition-all flex items-center gap-1 whitespace-nowrap"
                                                        title="Sửa lịch hẹn"
                                                    >
                                                        <Pencil size={13} />
                                                        Sửa
                                                    </button>
                                                )}

                                                {m.status === MeetingStatus.DRAFT && canConfirm && (
                                                    <button
                                                        onClick={() => handleConfirm(m.id)}
                                                        disabled={!canConfirmMeeting}
                                                        className={`p-1.5 px-3 rounded-lg text-xs font-bold shadow-sm transition-all whitespace-nowrap ${canConfirmMeeting ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                                                        title={canConfirmMeeting ? 'Sale xác nhận lịch hẹn' : 'Chỉ sale phụ trách hoặc quản lý mới được confirm'}
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
                                                {m.status === MeetingStatus.CANCELLED && (
                                                    <span className="text-slate-400 text-xs whitespace-nowrap">-</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={11} className="p-12 text-center text-slate-400 italic">
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
                            <button onClick={() => setIsResultModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg">Hủy bỏ</button>
                            <button onClick={submitResult} className="px-6 py-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm shadow-green-200">Lưu & Hoàn thành</button>
                        </div>
                    </div>
                </div>
            )}

            <CreateMeetingModal
                isOpen={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    setMeetingToEdit(null);
                }}
                onCreated={() => loadData()}
                salesPersonId={user?.id || 'u2'}
                salesPersonName={user?.name || 'Sales Rep'}
                meetingToEdit={meetingToEdit}
            />
        </div>
    );
};

export default SalesMeetings;
