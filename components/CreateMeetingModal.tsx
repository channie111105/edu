import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Calendar, Search, User, X } from 'lucide-react';
import { IMeeting, MeetingType } from '../types';
import {
    MEETING_TEACHERS,
    MeetingCustomerOption,
    createMeetingWithActivityLog,
    getMeetingCustomerOptions,
    hasTeacherConflict
} from '../utils/meetingHelpers';
import { updateMeeting } from '../utils/storage';

interface CreateMeetingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated?: (meeting: IMeeting) => void;
    salesPersonId: string;
    salesPersonName: string;
    lockedCustomer?: MeetingCustomerOption | null;
    meetingToEdit?: IMeeting | null;
}

const normalizeMeetingType = (type?: string): MeetingType =>
    type === MeetingType.ONLINE ? MeetingType.ONLINE : MeetingType.OFFLINE;

const CAMPUS_OPTIONS = ['Hà Nội', 'HCM', 'Đà Nẵng'] as const;

const normalizeCampus = (value?: string) => {
    const normalized = value?.trim().toLowerCase();

    if (!normalized) return 'Hà Nội';
    if (['hà nội', 'ha noi', 'hanoi', 'hn'].includes(normalized)) return 'Hà Nội';
    if (['hcm', 'hồ chí minh', 'ho chi minh', 'tp. hcm', 'tphcm', 'hcmc'].includes(normalized)) return 'HCM';
    if (['đà nẵng', 'da nang', 'danang', 'dn'].includes(normalized)) return 'Đà Nẵng';

    return 'Hà Nội';
};

const toDateTimeLocalValue = (value?: string) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const timezoneOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
};

const CreateMeetingModal: React.FC<CreateMeetingModalProps> = ({
    isOpen,
    onClose,
    onCreated,
    salesPersonId,
    salesPersonName,
    lockedCustomer,
    meetingToEdit
}) => {
    const [customers, setCustomers] = useState<MeetingCustomerOption[]>([]);
    const [query, setQuery] = useState('');
    const [selectedCustomerKey, setSelectedCustomerKey] = useState('');
    const [meetingDateTime, setMeetingDateTime] = useState('');
    const [meetingType, setMeetingType] = useState<MeetingType>(MeetingType.OFFLINE);
    const [campus, setCampus] = useState('');
    const [teacherId, setTeacherId] = useState('');
    const [notes, setNotes] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        const options = getMeetingCustomerOptions();
        setCustomers(options);
        setError('');

        if (meetingToEdit) {
            setSelectedCustomerKey('');
            setQuery(meetingToEdit.leadName);
            setCampus(normalizeCampus(meetingToEdit.campus));
            setMeetingDateTime(toDateTimeLocalValue(meetingToEdit.datetime));
            setMeetingType(normalizeMeetingType(meetingToEdit.type));
            setTeacherId(meetingToEdit.teacherId || '');
            setNotes(meetingToEdit.notes || '');
        } else if (lockedCustomer) {
            setSelectedCustomerKey(lockedCustomer.key);
            setQuery(lockedCustomer.name);
            setCampus(normalizeCampus(lockedCustomer.campus));
            setMeetingDateTime('');
            setMeetingType(MeetingType.OFFLINE);
            setTeacherId('');
            setNotes('');
        } else {
            setSelectedCustomerKey('');
            setQuery('');
            setCampus('Hà Nội');
            setMeetingDateTime('');
            setMeetingType(MeetingType.OFFLINE);
            setTeacherId('');
            setNotes('');
        }

    }, [isOpen, lockedCustomer, meetingToEdit]);

    const selectedCustomer = useMemo(() => {
        if (meetingToEdit) {
            return {
                key: `meeting:${meetingToEdit.id}`,
                id: meetingToEdit.leadId,
                source: 'lead' as const,
                name: meetingToEdit.leadName,
                phone: meetingToEdit.leadPhone,
                campus: meetingToEdit.campus,
                address: meetingToEdit.address,
                leadId: meetingToEdit.leadId
            };
        }
        if (lockedCustomer) return lockedCustomer;
        return customers.find(c => c.key === selectedCustomerKey) || null;
    }, [customers, selectedCustomerKey, lockedCustomer, meetingToEdit]);

    const filteredCustomers = useMemo(() => {
        const keyword = query.trim().toLowerCase();
        if (!keyword) return customers.slice(0, 20);
        return customers
            .filter(c => c.name.toLowerCase().includes(keyword) || c.phone.includes(keyword))
            .slice(0, 20);
    }, [customers, query]);

    const selectedTeacher = MEETING_TEACHERS.find(t => t.id === teacherId);
    const hasConflict = useMemo(() => {
        if (!teacherId || !meetingDateTime) return false;
        return hasTeacherConflict(teacherId, meetingDateTime, meetingToEdit?.id);
    }, [teacherId, meetingDateTime, meetingToEdit?.id]);

    const handleSelectCustomer = (customer: MeetingCustomerOption) => {
        setSelectedCustomerKey(customer.key);
        setQuery(customer.name);
        setCampus(normalizeCampus(customer.campus));
    };

    const handleSave = () => {
        if (!selectedCustomer) {
            setError('Vui lòng chọn khách hàng.');
            return;
        }
        if (!meetingDateTime) {
            setError('Vui lòng chọn thời gian hẹn.');
            return;
        }
        if (!meetingType) {
            setError('Vui lòng chọn hình thức hẹn.');
            return;
        }
        if (!campus.trim()) {
            setError('Vui lòng chọn cơ sở.');
            return;
        }
        if (!teacherId) {
            setError('Vui lòng chọn giáo viên test.');
            return;
        }

        if (meetingToEdit) {
            const updatedMeeting: IMeeting = {
                ...meetingToEdit,
                leadId: selectedCustomer.leadId || meetingToEdit.leadId,
                leadName: selectedCustomer.name,
                leadPhone: selectedCustomer.phone,
                salesPersonId,
                salesPersonName,
                campus: campus.trim(),
                address: selectedCustomer.address || meetingToEdit.address || 'N/A',
                datetime: meetingDateTime,
                type: meetingType,
                teacherId,
                teacherName: selectedTeacher?.name,
                notes: notes.trim()
            };

            updateMeeting(updatedMeeting);
            onCreated?.(updatedMeeting);
            onClose();
            return;
        }

        const meeting = createMeetingWithActivityLog({
            customer: selectedCustomer,
            datetime: meetingDateTime,
            type: meetingType,
            campus: campus.trim(),
            address: selectedCustomer.address,
            notes: notes.trim(),
            teacherId,
            teacherName: selectedTeacher?.name,
            salesPersonId,
            salesPersonName
        });

        onCreated?.(meeting);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <h3 className="text-lg font-bold text-slate-900">{meetingToEdit ? 'Sửa lịch hẹn' : 'Tạo lịch hẹn mới'}</h3>
                    <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Khách hàng</label>
                        {lockedCustomer || meetingToEdit ? (
                            <div className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm font-medium text-slate-700">
                                {selectedCustomer?.name || '-'} - {selectedCustomer?.phone || '-'}
                            </div>
                        ) : (
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                                <input
                                    value={query}
                                    onChange={(e) => {
                                        setQuery(e.target.value);
                                        setSelectedCustomerKey('');
                                    }}
                                    placeholder="Tìm theo tên hoặc số điện thoại..."
                                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-blue-500 outline-none"
                                />
                                {!!query && !selectedCustomer && (
                                    <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                                        {filteredCustomers.length === 0 && (
                                            <div className="px-3 py-2 text-xs text-slate-400">Không có dữ liệu phù hợp.</div>
                                        )}
                                        {filteredCustomers.map(item => (
                                            <button
                                                key={item.key}
                                                onClick={() => handleSelectCustomer(item)}
                                                className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                                            >
                                                <div className="text-sm font-medium text-slate-800">{item.name}</div>
                                                <div className="text-xs text-slate-500 flex items-center gap-1">
                                                    <User size={10} /> {item.phone} • {item.source}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Thời gian & ngày</label>
                            <div className="relative">
                                <Calendar size={14} className="absolute left-3 top-2.5 text-slate-400" />
                                <input
                                    type="datetime-local"
                                    value={meetingDateTime}
                                    onChange={(e) => setMeetingDateTime(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-blue-500 outline-none"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Hình thức hẹn</label>
                            <select
                                value={meetingType}
                                onChange={(e) => setMeetingType(e.target.value as MeetingType)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-blue-500 outline-none"
                            >
                                <option value={MeetingType.ONLINE}>Online</option>
                                <option value={MeetingType.OFFLINE}>Offline</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Cơ sở / chi nhánh</label>
                            <select
                                value={campus}
                                onChange={(e) => setCampus(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-blue-500 outline-none"
                            >
                                {CAMPUS_OPTIONS.map(option => (
                                    <option key={option} value={option}>{option}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Giáo viên test</label>
                            <select
                                value={teacherId}
                                onChange={(e) => setTeacherId(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-blue-500 outline-none"
                            >
                                <option value="">-- Chọn giáo viên --</option>
                                {MEETING_TEACHERS.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {hasConflict && (
                        <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-start gap-2">
                            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                            <span>Giáo viên này đang có lịch trùng giờ. Sale nên cân nhắc đổi giờ hoặc đổi giáo viên.</span>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Ghi chú (Internal Notes)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full h-24 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-blue-500 outline-none resize-none"
                            placeholder="Nội dung chuẩn bị cho buổi test..."
                        />
                    </div>

                    {!!error && (
                        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                            {error}
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">
                        Hủy
                    </button>
                    <button onClick={handleSave} className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg">
                        {meetingToEdit ? 'Lưu thay đổi' : 'Lưu lịch hẹn'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateMeetingModal;
