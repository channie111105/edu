
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLeadById, saveLead, convertLeadToContact, addContact, addDeal, deleteLead } from '../utils/storage';
import { useAuth } from '../contexts/AuthContext';
import {
    ArrowLeft, Phone, Mail, MessageCircle, Clock, AlertCircle,
    CheckCircle2, XCircle, Calendar, Send, Edit, User,
    GraduationCap, FileText, Zap
} from 'lucide-react';
import { LeadStatus, ILead, DealStage } from '../types';
import Toast from '../components/Toast';

interface ITimelineEvent {
    id: string;
    type: 'status_change' | 'call' | 'note' | 'system';
    title: string;
    description?: string;
    timestamp: string;
    status?: string;
}

interface IToast {
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
}

const SalesLeadQuickProcess: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [lead, setLead] = useState<ILead | null>(null);
    const [quickNote, setQuickNote] = useState('');
    const [timeline, setTimeline] = useState<ITimelineEvent[]>([]);
    const [slaMinutesLeft, setSlaMinutesLeft] = useState<number>(0);
    const [toast, setToast] = useState<IToast | null>(null);
    const [showDisqualifyPrompt, setShowDisqualifyPrompt] = useState(false);
    const [disqualifyReason, setDisqualifyReason] = useState('');
    const [showConvertConfirm, setShowConvertConfirm] = useState(false);

    // Load Lead
    useEffect(() => {
        if (id) {
            const foundLead = getLeadById(id);
            if (foundLead) {
                setLead(foundLead);

                // Calculate SLA
                const created = new Date(foundLead.createdAt).getTime();
                const now = Date.now();
                const elapsed = now - created;
                const SLA_LIMIT = 15 * 60 * 1000;
                const remaining = Math.max(0, SLA_LIMIT - elapsed);
                setSlaMinutesLeft(Math.floor(remaining / 60000));

                // Initialize timeline
                setTimeline([
                    {
                        id: 'init',
                        type: 'system',
                        title: 'Lead được tạo mới',
                        description: `Từ nguồn: ${foundLead.source}`,
                        timestamp: new Date(foundLead.createdAt).toLocaleString('vi-VN'),
                    }
                ]);
            }
        }
    }, [id]);

    const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
        setToast({ message, type });
    };

    const handleStatusChange = (newStatus: LeadStatus) => {
        if (!lead) return;

        // Validation for Qualified status - Check all required fields
        if (newStatus === LeadStatus.QUALIFIED) {
            const missingFields: string[] = [];

            // 1. ĐỊNH DANH & LIÊN HỆ
            if (!lead.name?.trim()) missingFields.push('Họ và tên');
            if (!lead.phone?.trim()) missingFields.push('Số điện thoại');

            // 2. NHU CẦU
            if (!lead.program) missingFields.push('Chương trình quan tâm');
            if (!lead.studentInfo?.targetCountry) missingFields.push('Quốc gia mục tiêu');
            if (!lead.studentInfo?.dealType) missingFields.push('Loại gói');

            // 3. HỆ THỐNG
            if (!lead.source) missingFields.push('Nguồn (Source)');
            if (!lead.notes?.trim()) missingFields.push('Ghi chú');

            if (missingFields.length > 0) {
                showToast(
                    `⚠️ Vui lòng điền đầy đủ các trường bắt buộc:\n\n${missingFields.map(f => `• ${f}`).join('\n')}`,
                    'warning'
                );
                return;
            }
        }

        // Validation for Disqualified - Require reason (handled by modal)
        if (newStatus === LeadStatus.DISQUALIFIED) {
            setShowDisqualifyPrompt(true);
            return;
        }

        const updated = { ...lead, status: newStatus };
        saveLead(updated);
        setLead(updated);

        // Add to timeline
        const event: ITimelineEvent = {
            id: `status-${Date.now()}`,
            type: 'status_change',
            title: 'Thay đổi trạng thái',
            description: `Chuyển sang ${newStatus}`,
            timestamp: new Date().toLocaleString('vi-VN'),
            status: newStatus
        };
        setTimeline([event, ...timeline]);

        // Show success toast
        showToast(`✅ Đã chuyển trạng thái sang: ${newStatus}`, 'success');
    };

    const handleDisqualify = () => {
        if (!disqualifyReason.trim()) {
            showToast('⚠️ Vui lòng nhập lý do không đạt!', 'warning');
            return;
        }

        if (lead) {
            lead.notes = (lead.notes || '') + `\n[DISQUALIFIED] Lý do: ${disqualifyReason}`;
            const updated = { ...lead, status: LeadStatus.DISQUALIFIED };
            saveLead(updated);
            setLead(updated);

            // Add to timeline
            const event: ITimelineEvent = {
                id: `status-${Date.now()}`,
                type: 'status_change',
                title: 'Chuyển sang Không đạt',
                description: `Lý do: ${disqualifyReason}`,
                timestamp: new Date().toLocaleString('vi-VN'),
                status: LeadStatus.DISQUALIFIED
            };
            setTimeline([event, ...timeline]);

            setShowDisqualifyPrompt(false);
            setDisqualifyReason('');
            showToast('✅ Đã chuyển sang trạng thái Không đạt', 'success');
        }
    };

    const handleCallClick = () => {
        const event: ITimelineEvent = {
            id: `call-${Date.now()}`,
            type: 'call',
            title: 'Cuộc gọi đi (Outbound)',
            description: 'Thời lượng: 00:03. Kết nối thành công.',
            timestamp: new Date().toLocaleString('vi-VN'),
        };
        setTimeline([event, ...timeline]);
    };

    const handleSaveNote = () => {
        if (!quickNote.trim()) return;

        const event: ITimelineEvent = {
            id: `note-${Date.now()}`,
            type: 'note',
            title: 'Ghi chú cuộc gọi / Kết quả (Bất buộc)',
            description: quickNote,
            timestamp: new Date().toLocaleString('vi-VN'),
        };
        setTimeline([event, ...timeline]);
        setQuickNote('');
    };

    if (!lead) return <div className="p-10 text-center">Loading...</div>;

    const isOverdue = slaMinutesLeft === 0;

    return (
        <div className="flex flex-col h-screen bg-slate-50 font-sans overflow-hidden">

            {/* HEADER */}
            <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="text-slate-500 hover:text-slate-800">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                            L
                        </div>
                        <div>
                            <h1 className="text-base font-bold text-slate-900">{lead.name}</h1>
                            <p className="text-xs text-slate-500">ID: L-{lead.id}</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleCallClick}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200"
                    >
                        <Phone size={16} className="text-green-600" /> Gọi điện
                    </button>

                    {/* Only show Convert button when status is Qualified */}
                    {lead.status === LeadStatus.QUALIFIED && (
                        <button
                            onClick={() => setShowConvertConfirm(true)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                        >
                            <Send size={16} /> Chuyển đổi (Convert)
                        </button>
                    )}

                    <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200">
                        <Clock size={16} className="text-amber-600" /> Check SLA
                    </button>
                </div>
            </header>

            {/* MAIN 3-COLUMN LAYOUT */}
            <div className="flex flex-1 overflow-hidden">

                {/* LEFT COLUMN - THÔNG TIN LEAD */}
                <aside className="w-[420px] bg-white border-r border-slate-200 overflow-y-auto shrink-0">
                    <div className="p-6 space-y-6">

                        {/* Section Header */}
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">THÔNG TIN LEAD</h2>
                            <button
                                onClick={() => {
                                    if (lead) {
                                        saveLead(lead);
                                        showToast('✅ Đã lưu thông tin!', 'success');
                                    }
                                }}
                                className="text-blue-600 text-sm font-medium flex items-center gap-1 hover:underline"
                            >
                                <Edit size={14} /> Lưu
                            </button>
                        </div>

                        {/* 1. ĐỊNH DANH & LIÊN HỆ (BẮT BUỘC) */}
                        <div>
                            <h3 className="text-xs font-bold text-blue-600 mb-3 flex items-center gap-2">
                                <User size={14} /> 1. ĐỊNH DANH & LIÊN HỆ <span className="text-red-500">*</span>
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-slate-500 font-medium block mb-1">Họ và tên *</label>
                                    <input
                                        type="text"
                                        value={lead?.name || ''}
                                        onChange={(e) => setLead(lead ? { ...lead, name: e.target.value } : null)}
                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Nhập họ tên đầy đủ"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-slate-500 font-medium block mb-1">Số điện thoại *</label>
                                        <input
                                            type="text"
                                            value={lead?.phone || ''}
                                            onChange={(e) => setLead(lead ? { ...lead, phone: e.target.value } : null)}
                                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="0901234567"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 font-medium block mb-1">Zalo/FB Link</label>
                                        <input
                                            type="text"
                                            value={lead?.studentInfo?.socialLink || ''}
                                            onChange={(e) => setLead(lead ? {
                                                ...lead,
                                                studentInfo: { ...lead.studentInfo, socialLink: e.target.value }
                                            } : null)}
                                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-blue-600 focus:outline-none"
                                            placeholder="facebook.com/..."
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs text-slate-500 font-medium block mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={lead?.email || ''}
                                        onChange={(e) => setLead(lead ? { ...lead, email: e.target.value } : null)}
                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none"
                                        placeholder="email@example.com"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 2. NHU CẦU (BẮT BUỘC) */}
                        <div>
                            <h3 className="text-xs font-bold text-blue-600 mb-3 flex items-center gap-2">
                                <Zap size={14} /> 2. NHU CẦU <span className="text-red-500">*</span>
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-slate-500 font-medium block mb-1">Chương trình quan tâm *</label>
                                    <select
                                        value={lead?.program || ''}
                                        onChange={(e) => setLead(lead ? { ...lead, program: e.target.value as any } : null)}
                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">-- Chọn chương trình --</option>
                                        <option value="Tiếng Đức">Tiếng Đức</option>
                                        <option value="Tiếng Trung">Tiếng Trung</option>
                                        <option value="Du học Đức">Du học Đức</option>
                                        <option value="Du học Trung">Du học Trung</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-slate-500 font-medium block mb-1">Quốc gia mục tiêu *</label>
                                        <select
                                            value={lead?.studentInfo?.targetCountry || ''}
                                            onChange={(e) => setLead(lead ? {
                                                ...lead,
                                                studentInfo: { ...lead.studentInfo, targetCountry: e.target.value }
                                            } : null)}
                                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">-- Chọn --</option>
                                            <option value="Đức">🇩🇪 Đức</option>
                                            <option value="Trung Quốc">🇨🇳 Trung</option>
                                            <option value="Nhật Bản">🇯🇵 Nhật</option>
                                            <option value="Hàn Quốc">🇰🇷 Hàn</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 font-medium block mb-1">Loại gói *</label>
                                        <select
                                            value={lead?.studentInfo?.dealType || ''}
                                            onChange={(e) => setLead(lead ? {
                                                ...lead,
                                                studentInfo: { ...lead.studentInfo, dealType: e.target.value as any }
                                            } : null)}
                                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none"
                                        >
                                            <option value="">-- Chọn --</option>
                                            <option value="Combo">Combo</option>
                                            <option value="Single">Gói lẻ</option>
                                            <option value="Consulting">Tư vấn</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. CHẤT LƯỢNG (CẦN THIẾT) */}
                        <div>
                            <h3 className="text-xs font-bold text-blue-600 mb-3 flex items-center gap-2">
                                <GraduationCap size={14} /> 3. CHẤT LƯỢNG (CẦN THIẾT)
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-slate-500 font-medium block mb-1">Năm sinh</label>
                                    <input
                                        type="text"
                                        value={lead?.studentInfo?.dob || ''}
                                        onChange={(e) => setLead(lead ? {
                                            ...lead,
                                            studentInfo: { ...lead.studentInfo, dob: e.target.value }
                                        } : null)}
                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none"
                                        placeholder="01/01/2000"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs text-slate-500 font-medium block mb-1">Trình độ học vấn / Trường</label>
                                    <input
                                        type="text"
                                        value={lead?.studentInfo?.school || ''}
                                        onChange={(e) => setLead(lead ? {
                                            ...lead,
                                            studentInfo: { ...lead.studentInfo, school: e.target.value }
                                        } : null)}
                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none"
                                        placeholder="VD: Đại học Bách Khoa"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs text-slate-500 font-medium block mb-1">Trình độ ngoại ngữ</label>
                                    <input
                                        type="text"
                                        value={lead?.studentInfo?.languageLevel || ''}
                                        onChange={(e) => setLead(lead ? {
                                            ...lead,
                                            studentInfo: { ...lead.studentInfo, languageLevel: e.target.value }
                                        } : null)}
                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none"
                                        placeholder="VD: A1, B1, IELTS 5.0"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs text-slate-500 font-medium block mb-1">Khả năng tài chính</label>
                                    <select
                                        value={lead?.studentInfo?.financialStatus || ''}
                                        onChange={(e) => setLead(lead ? {
                                            ...lead,
                                            studentInfo: { ...lead.studentInfo, financialStatus: e.target.value }
                                        } : null)}
                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none"
                                    >
                                        <option value="">-- Đánh giá --</option>
                                        <option value="Tốt">Tốt (Đủ chi phí)</option>
                                        <option value="Trung bình">Trung bình (Cần hỗ trợ)</option>
                                        <option value="Hạn chế">Hạn chế</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* 4. HỆ THỐNG (BẮT BUỘC) */}
                        <div>
                            <h3 className="text-xs font-bold text-blue-600 mb-3 flex items-center gap-2">
                                <FileText size={14} /> 4. HỆ THỐNG <span className="text-red-500">*</span>
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-slate-500 font-medium block mb-1">Nguồn (Source) *</label>
                                    <select
                                        value={lead?.source || ''}
                                        onChange={(e) => setLead(lead ? { ...lead, source: e.target.value } : null)}
                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">-- Chọn nguồn --</option>
                                        <option value="fb_lead_form">Facebook Ads</option>
                                        <option value="hotline">Hotline</option>
                                        <option value="landing_page">Website</option>
                                        <option value="referral">Giới thiệu</option>
                                        <option value="event">Sự kiện</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs text-slate-500 font-medium block mb-1">Chiến dịch</label>
                                    <input
                                        type="text"
                                        value={lead?.campaign || ''}
                                        onChange={(e) => setLead(lead ? { ...lead, campaign: e.target.value } : null)}
                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none"
                                        placeholder="VD: Tuyển sinh Du học Nghề 2024"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs text-slate-500 font-medium block mb-1">Chi nhánh (Branch)</label>
                                    <select className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none">
                                        <option value="">-- Chọn chi nhánh --</option>
                                        <option value="HN">Hà Nội</option>
                                        <option value="HCM">TP. Hồ Chí Minh</option>
                                        <option value="DN">Đà Nẵng</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs text-slate-500 font-medium block mb-1">Ghi chú *</label>
                                    <textarea
                                        rows={3}
                                        value={lead?.notes || ''}
                                        onChange={(e) => setLead(lead ? { ...lead, notes: e.target.value } : null)}
                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none resize-none"
                                        placeholder="Ghi chú về khách hàng..."
                                    />
                                </div>

                                {/* Thông tin phụ huynh */}
                                <div className="pt-3 border-t border-slate-200">
                                    <label className="text-xs text-slate-600 font-bold block mb-2">Thông tin Phụ huynh (Nếu có)</label>
                                    <div className="space-y-2">
                                        <input
                                            type="text"
                                            value={lead?.studentInfo?.parentName || ''}
                                            onChange={(e) => setLead(lead ? {
                                                ...lead,
                                                studentInfo: { ...lead.studentInfo, parentName: e.target.value }
                                            } : null)}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none"
                                            placeholder="Tên phụ huynh"
                                        />
                                        <input
                                            type="text"
                                            value={lead?.studentInfo?.parentPhone || ''}
                                            onChange={(e) => setLead(lead ? {
                                                ...lead,
                                                studentInfo: { ...lead.studentInfo, parentPhone: e.target.value }
                                            } : null)}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none"
                                            placeholder="SĐT phụ huynh"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Validation Warning */}
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                            <p className="text-xs text-amber-800">
                                <span className="font-bold">⚠️ Lưu ý:</span> Các trường có dấu <span className="text-red-500">*</span> là bắt buộc để chuyển sang <b>Qualified</b>
                            </p>
                        </div>

                    </div>
                </aside>

                {/* CENTER COLUMN - LỊCH SỬ TƯƠNG TÁC */}
                <main className="flex-1 flex flex-col bg-white overflow-hidden">
                    <div className="p-6 border-b border-slate-200">
                        <h2 className="text-sm font-bold text-slate-700 uppercase">LỊCH SỬ TƯƠNG TÁC</h2>
                    </div>

                    {/* Timeline */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {timeline.map((event) => (
                            <div key={event.id} className="flex gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${event.type === 'status_change' ? 'bg-blue-100' :
                                    event.type === 'call' ? 'bg-green-100' :
                                        event.type === 'note' ? 'bg-amber-100' : 'bg-slate-100'
                                    }`}>
                                    {event.type === 'status_change' ? <CheckCircle2 size={18} className="text-blue-600" /> :
                                        event.type === 'call' ? <Phone size={18} className="text-green-600" /> :
                                            event.type === 'note' ? <FileText size={18} className="text-amber-600" /> :
                                                <AlertCircle size={18} className="text-slate-500" />}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">{event.title}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">{event.status || 'Vừa xong'}</p>
                                        </div>
                                    </div>
                                    {event.description && (
                                        <p className="text-sm text-slate-700 mt-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                            {event.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Note Input Footer */}
                    <div className="p-6 border-t border-slate-200 bg-slate-50">
                        <label className="text-xs font-bold text-slate-600 uppercase block mb-2">
                            GHI CHÚ CUỘC GỌI / KẾT QUẢ (BẮT BUỘC)
                        </label>
                        <div className="flex gap-3">
                            <input
                                type="text"
                                placeholder="Nhập nội dung trạo đổi với khách hàng..."
                                className="flex-1 px-4 py-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={quickNote}
                                onChange={(e) => setQuickNote(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveNote();
                                }}
                            />
                            <button
                                onClick={handleSaveNote}
                                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 flex items-center gap-2"
                            >
                                <Send size={16} /> Lưu Note
                            </button>
                        </div>
                    </div>
                </main>

                {/* RIGHT COLUMN - TRẠNG THÁI */}
                <aside className="w-[320px] bg-white border-l border-slate-200 overflow-y-auto shrink-0">
                    <div className="p-6 space-y-6">

                        {/* Status Selector */}
                        <div>
                            <h3 className="text-sm font-bold text-slate-700 uppercase mb-3">TRẠNG THÁI HIỆN TẠI</h3>
                            <select
                                value={lead.status}
                                onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
                                className={`w-full px-4 py-3 border-2 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 ${lead.status === LeadStatus.QUALIFIED ? 'bg-green-50 border-green-500 text-green-700 focus:ring-green-500' :
                                    lead.status === LeadStatus.CONTACTED ? 'bg-blue-50 border-blue-500 text-blue-700 focus:ring-blue-500' :
                                        lead.status === LeadStatus.UNREACHABLE ? 'bg-amber-50 border-amber-500 text-amber-700 focus:ring-amber-500' :
                                            lead.status === LeadStatus.DISQUALIFIED ? 'bg-red-50 border-red-500 text-red-700 focus:ring-red-500' :
                                                'bg-slate-50 border-slate-300 text-slate-700 focus:ring-slate-500'
                                    }`}
                            >
                                <option value={LeadStatus.NEW}>Mới (New)</option>
                                <option value={LeadStatus.CONTACTED}>Đang liên hệ</option>
                                <option value={LeadStatus.QUALIFIED}>Đạt chuẩn (Qualified)</option>
                                <option value={LeadStatus.UNREACHABLE}>Không nghe máy</option>
                                <option value={LeadStatus.DISQUALIFIED}>Không đạt</option>
                            </select>

                            <p className="text-xs text-slate-500 mt-2 italic">
                                {lead.status === LeadStatus.QUALIFIED
                                    ? 'Khách đạt chuẩn! Hãy nhấn "Chuyển đổi" để tạo Deal.'
                                    : 'Điền đầy đủ thông tin và chuyển sang "Đạt chuẩn" để Convert.'}
                            </p>
                        </div>

                        {/* Assigned User */}
                        <div>
                            <h3 className="text-sm font-bold text-slate-700 uppercase mb-3">NGƯỜI PHỤ TRÁCH</h3>
                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                                    SM
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-900">Sarah Miller</p>
                                    <p className="text-xs text-slate-500">Sales Rep</p>
                                </div>
                            </div>
                        </div>

                        {/* SLA Warning */}
                        {isOverdue && (
                            <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <AlertCircle className="text-red-600" size={20} />
                                    <p className="text-sm font-bold text-red-900">⚠️ Quá hạn SLA</p>
                                </div>
                                <p className="text-xs text-red-700">
                                    Lead này đã quá 15 phút chưa được xử lý. Hãy liên hệ ngay!
                                </p>
                            </div>
                        )}

                    </div>
                </aside>

            </div>

            {/* Toast Notification */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            {/* Disqualify Modal */}
            {showDisqualifyPrompt && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Lý do không đạt</h3>
                        <p className="text-sm text-slate-600 mb-4">Vui lòng nhập lý do để chuyển sang trạng thái "Không đạt"</p>

                        <textarea
                            rows={4}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            placeholder="VD: Sai số, Không đủ tài chính, Đã đi nước khác..."
                            value={disqualifyReason}
                            onChange={(e) => setDisqualifyReason(e.target.value)}
                            autoFocus
                        />

                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={() => {
                                    setShowDisqualifyPrompt(false);
                                    setDisqualifyReason('');
                                }}
                                className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleDisqualify}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700"
                            >
                                Xác nhận
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Convert Confirmation Modal */}
            {showConvertConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Chuyển đổi Lead thành Deal</h3>
                        <p className="text-sm text-slate-600 mb-4">
                            Bạn có chắc chắn muốn chuyển đổi Lead này thành Deal?
                            Hệ thống sẽ:
                        </p>
                        <ul className="text-sm text-slate-700 mb-4 space-y-1 list-disc list-inside">
                            <li>Tạo Contact trong My Contact</li>
                            <li>Tạo Deal mới trong Pipeline</li>
                            <li>Chuyển bạn sang trang Pipeline</li>
                        </ul>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConvertConfirm(false)}
                                className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={() => {
                                    if (!lead) return;

                                    try {
                                        // 1. Convert Lead to Contact
                                        const contact = convertLeadToContact(lead);
                                        const savedContact = addContact(contact);
                                        console.log('[Convert] Contact created:', savedContact.id);

                                        // 2. Create Deal
                                        const newDeal = {
                                            id: `D-${Date.now()}`,
                                            leadId: savedContact.id,
                                            title: `${lead.name} - ${lead.program || 'Chương trình'}`,
                                            value: 0, // Sẽ cập nhật sau khi chọn sản phẩm
                                            stage: DealStage.DEEP_CONSULTING, // Giai đoạn đầu tiên
                                            ownerId: lead.ownerId,
                                            expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // +30 days
                                            products: lead.program ? [lead.program] : [],
                                            probability: 20,
                                            createdAt: new Date().toISOString()
                                        };

                                        addDeal(newDeal);
                                        console.log('[Convert] Deal created:', newDeal.id);

                                        // 3. Delete Lead from My Leads (IMPORTANT!)
                                        deleteLead(lead.id);
                                        console.log('[Convert] Lead deleted from My Leads:', lead.id);

                                        // 4. Show success toast
                                        setShowConvertConfirm(false);
                                        showToast('✅ Đã chuyển đổi thành công! Đang chuyển sang Pipeline...', 'success');

                                        // 5. Navigate to Pipeline with new deal highlighted
                                        setTimeout(() => {
                                            navigate(`/pipeline?newDeal=${newDeal.id}`);
                                        }, 800);

                                    } catch (error) {
                                        console.error('[Convert] Error:', error);
                                        showToast('❌ Có lỗi xảy ra khi chuyển đổi!', 'error');
                                        setShowConvertConfirm(false);
                                    }
                                }}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
                            >
                                Xác nhận
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalesLeadQuickProcess;
