
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLeadById, saveLead, getTags, saveTags } from '../utils/storage';
import { useAuth } from '../contexts/AuthContext';
import {
    ArrowLeft, Phone, Mail, MessageCircle, Clock,
    Tag, MapPin, TrendingUp, Database, Calendar,
    Send, FileText, Save, ExternalLink, Hash, X, User, Building, AlertTriangle, Plus, CheckCircle
} from 'lucide-react';
import { LeadStatus, ILead, UserRole, DealStage } from '../types';

const MarketingLeadDetails: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [lead, setLead] = useState<ILead | null>(null);

    // Flat state like Leads.tsx to handle the form easily
    const [editData, setEditData] = useState({
        name: '',
        phone: '',
        email: '',
        source: '',
        program: '' as any,
        notes: '',
        title: '',
        company: '',
        province: '',
        city: '',
        ward: '',
        street: '',
        salesperson: '',
        campaign: '',
        tags: [] as string[],
        referredBy: '',
        status: '' as any
    });

    const [activeTab, setActiveTab] = useState<'notes' | 'extra'>('notes');
    const [availableTags, setAvailableTags] = useState<string[]>([]);
    const [isAddingTag, setIsAddingTag] = useState(false);

    // Activity state for timeline
    const [activities, setActivities] = useState<any[]>([]);

    // Load Data
    useEffect(() => {
        setAvailableTags(getTags());
        if (id) {
            const foundLead = getLeadById(id);
            if (foundLead) {
                setLead(foundLead);
                setActivities(foundLead.activities || []);

                // Initialize flat state
                setEditData({
                    name: foundLead.name,
                    phone: foundLead.phone,
                    email: foundLead.email || '',
                    source: foundLead.source || '',
                    program: foundLead.program || 'Tiếng Đức',
                    notes: foundLead.notes || '',
                    title: foundLead.title || '',
                    company: foundLead.company || '',
                    province: (foundLead as any).province || '',
                    city: foundLead.city || '',
                    ward: foundLead.ward || '',
                    street: foundLead.address || '',
                    salesperson: foundLead.ownerId || '',
                    campaign: foundLead.campaign || '',
                    tags: Array.isArray(foundLead.marketingData?.tags)
                        ? foundLead.marketingData.tags
                        : (typeof foundLead.marketingData?.tags === 'string'
                            ? (foundLead.marketingData.tags as string).split(',').map(t => t.trim()).filter(Boolean)
                            : []),
                    referredBy: foundLead.referredBy || '',
                    status: foundLead.status || 'NEW'
                });
            }
        }
    }, [id]);

    const handleSave = () => {
        if (lead) {
            const updatedLead: ILead = {
                ...lead,
                name: editData.name,
                phone: editData.phone,
                email: editData.email,
                source: editData.source,
                program: editData.program,
                notes: editData.notes,
                title: editData.title,
                company: editData.company,
                city: editData.city,
                ward: editData.ward,
                address: editData.street,
                ownerId: editData.salesperson,
                campaign: editData.campaign,
                referredBy: editData.referredBy,
                status: editData.status,
                marketingData: {
                    ...lead.marketingData,
                    tags: editData.tags,
                    campaign: editData.campaign,
                    source: editData.source
                },
                // @ts-ignore
                province: editData.province
            };
            saveLead(updatedLead);
            setLead(updatedLead);
            alert('✅ Đã lưu thông tin Lead thành công!');
        }
    };

    if (!lead) return <div className="p-10 text-center text-slate-500">Đang tải thông tin Lead...</div>;

    const SALES_REPS = [
        { id: 'u1', name: 'Sarah Miller' },
        { id: 'u2', name: 'Minh Khôi' },
        { id: 'u3', name: 'Hải Yến' }
    ];

    return (
        <div className="flex flex-col h-screen bg-white text-slate-900 font-sans overflow-hidden">
            {/* HEADER */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white shrink-0 z-20">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <ArrowLeft size={20} className="text-slate-600" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                            {editData.name || 'Chi tiết Lead'}
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200 uppercase tracking-widest">Marketing</span>
                        </h1>
                        <p className="text-xs text-slate-500 mt-1">ID: {lead.id} | Ngày tạo: {new Date(lead.createdAt).toLocaleDateString('vi-VN')}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                    >
                        <Save size={18} /> Lưu thay đổi
                    </button>
                </div>
            </header>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="max-w-6xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden p-8">

                    {/* TITLE SECTION (FORM STYLE) */}
                    <div className="mb-10">
                        <label className="block text-slate-600 text-sm font-bold mb-3 uppercase tracking-wide">Mô tả / Tên khách hàng <span className="text-red-500">*</span></label>
                        <div className="flex gap-4">
                            <select
                                className="w-36 px-4 py-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none bg-slate-50 font-bold text-slate-700"
                                value={editData.title}
                                onChange={e => setEditData({ ...editData, title: e.target.value })}
                            >
                                <option value="">Danh xưng</option>
                                <option value="Mr.">Anh</option>
                                <option value="Ms.">Chị</option>
                                <option value="Phụ huynh">Phụ huynh</option>
                                <option value="Học sinh">Học sinh</option>
                            </select>
                            <input
                                className="flex-1 px-4 py-3 border border-slate-300 rounded-xl text-lg font-bold focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none text-slate-800 placeholder:text-slate-400 bg-slate-50"
                                placeholder="VD: Nguyen Van A..."
                                value={editData.name}
                                onChange={e => setEditData({ ...editData, name: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* MAIN GRID */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-16 gap-y-8">

                        {/* LEFT COLUMN */}
                        <div className="space-y-6">
                            <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2 mb-2">
                                <User size={14} /> Thông tin căn bản
                            </h3>

                            {/* Company */}
                            <div className="flex items-center gap-6">
                                <label className="w-28 shrink-0 text-slate-500 text-sm font-medium">Cơ sở</label>
                                <select
                                    className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 outline-none focus:border-blue-500"
                                    value={editData.company}
                                    onChange={e => setEditData({ ...editData, company: e.target.value })}
                                >
                                    <option value="">-- Chọn cơ sở --</option>
                                    <option value="Hanoi">Hà Nội</option>
                                    <option value="HCMC">TP. HCM</option>
                                    <option value="DaNang">Đà Nẵng</option>
                                    <option value="HaiPhong">Hải Phòng</option>
                                </select>
                            </div>

                            {/* Address Group */}
                            <div className="flex items-start gap-6">
                                <label className="w-28 shrink-0 text-slate-500 text-sm font-medium pt-2">Địa chỉ</label>
                                <div className="flex-1 space-y-3">
                                    <input
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                                        placeholder="Số nhà, đường..."
                                        value={editData.street}
                                        onChange={e => setEditData({ ...editData, street: e.target.value })}
                                    />
                                    <div className="grid grid-cols-3 gap-3">
                                        <input
                                            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                                            placeholder="Tỉnh/TP"
                                            value={editData.province}
                                            onChange={e => setEditData({ ...editData, province: e.target.value })}
                                        />
                                        <input
                                            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                                            placeholder="Quận/Huyện"
                                            value={editData.city}
                                            onChange={e => setEditData({ ...editData, city: e.target.value })}
                                        />
                                        <input
                                            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                                            placeholder="P/Xã"
                                            value={editData.ward}
                                            onChange={e => setEditData({ ...editData, ward: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Product */}
                            <div className="flex items-center gap-6">
                                <label className="w-28 shrink-0 text-slate-500 text-sm font-medium">Sản phẩm</label>
                                <select
                                    className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 outline-none focus:border-blue-500"
                                    value={editData.program}
                                    onChange={e => setEditData({ ...editData, program: e.target.value })}
                                >
                                    <option value="">-- Chọn sản phẩm --</option>
                                    <option value="Tiếng Đức">Tiếng Đức</option>
                                    <option value="Du học Đức">Du học Đức</option>
                                    <option value="Du học Nghề">Du học Nghề</option>
                                    <option value="XKLĐ">Xuất khẩu lao động</option>
                                </select>
                            </div>

                        </div>

                        {/* RIGHT COLUMN */}
                        <div className="space-y-6">
                            <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2 mb-2">
                                <Phone size={14} /> Liên hệ & Phụ trách
                            </h3>

                            {/* Phone */}
                            <div className="flex items-center gap-6">
                                <label className="w-28 shrink-0 text-slate-500 text-sm font-medium">Điện thoại <span className="text-red-500">*</span></label>
                                <input
                                    className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-blue-500"
                                    placeholder="0912..."
                                    value={editData.phone}
                                    onChange={e => setEditData({ ...editData, phone: e.target.value })}
                                />
                            </div>

                            {/* Email */}
                            <div className="flex items-center gap-6">
                                <label className="w-28 shrink-0 text-slate-500 text-sm font-medium">Email</label>
                                <input
                                    className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                                    placeholder="email@example.com"
                                    value={editData.email}
                                    onChange={e => setEditData({ ...editData, email: e.target.value })}
                                />
                            </div>

                            {/* Salesperson */}
                            <div className="flex items-center gap-6">
                                <label className="w-28 shrink-0 text-slate-500 text-sm font-medium">Phụ trách</label>
                                <select
                                    className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 outline-none focus:border-blue-500"
                                    value={editData.salesperson}
                                    onChange={e => setEditData({ ...editData, salesperson: e.target.value })}
                                >
                                    <option value="">-- Sale phụ trách --</option>
                                    {SALES_REPS.map(rep => (
                                        <option key={rep.id} value={rep.id}>{rep.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Status */}
                            <div className="flex items-center gap-6">
                                <label className="w-28 shrink-0 text-slate-500 text-sm font-medium">Trạng thái</label>
                                <select
                                    className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:border-blue-500"
                                    value={editData.status}
                                    onChange={e => setEditData({ ...editData, status: e.target.value as any })}
                                >
                                    <option value="NEW">Mới</option>
                                    <option value="CONTACTED">Đã liên hệ</option>
                                    <option value="QUALIFIED">Tiềm năng</option>
                                    <option value="LOST">Thất bại</option>
                                </select>
                            </div>

                            {/* Tags Input (Marketing specialized) */}
                            <div className="flex items-start gap-6">
                                <label className="w-28 shrink-0 text-slate-500 text-sm font-medium mt-2">Gắn thẻ (Tags)</label>
                                <div className="flex-1 flex flex-col gap-2">
                                    <div className="flex gap-2">
                                        {!isAddingTag ? (
                                            <select
                                                className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                                                onChange={(e) => {
                                                    if (e.target.value === 'khác') {
                                                        setIsAddingTag(true);
                                                    } else if (e.target.value) {
                                                        if (!editData.tags.includes(e.target.value)) {
                                                            setEditData({ ...editData, tags: [...editData.tags, e.target.value] });
                                                        }
                                                    }
                                                    e.target.value = "";
                                                }}
                                            >
                                                <option value="">-- Chọn Tag --</option>
                                                {availableTags.filter(t => !editData.tags.includes(t)).map(t => (
                                                    <option key={t} value={t}>{t}</option>
                                                ))}
                                                <option value="khác" className="font-bold text-blue-600">+ Thêm mới...</option>
                                            </select>
                                        ) : (
                                            <input
                                                autoFocus
                                                className="flex-1 px-4 py-2 border border-blue-400 rounded-lg text-sm outline-none ring-2 ring-blue-50"
                                                placeholder="Tạo tag mới rồi nhấn Enter..."
                                                onBlur={() => setIsAddingTag(false)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        const val = (e.target as HTMLInputElement).value.trim();
                                                        if (val) {
                                                            if (!editData.tags.includes(val)) {
                                                                setEditData({ ...editData, tags: [...editData.tags, val] });
                                                            }
                                                            if (!availableTags.includes(val)) {
                                                                const newAvailable = [...availableTags, val];
                                                                setAvailableTags(newAvailable);
                                                                saveTags(newAvailable);
                                                            }
                                                            setIsAddingTag(false);
                                                        }
                                                    } else if (e.key === 'Escape') {
                                                        setIsAddingTag(false);
                                                    }
                                                }}
                                            />
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {editData.tags.map(tag => (
                                            <span key={tag} className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 text-[10px] font-extrabold rounded-full border border-blue-100">
                                                {tag}
                                                <button onClick={() => setEditData({ ...editData, tags: editData.tags.filter(t => t !== tag) })} className="hover:text-blue-900 transition-colors">
                                                    <X size={12} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* TABS SECTION */}
                    <div className="mt-12 border-t border-slate-100 pt-8">
                        <div className="flex border-b border-slate-200 mb-6">
                            <button
                                onClick={() => setActiveTab('notes')}
                                className={`px-6 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'notes' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                            >
                                <FileText size={16} /> Ghi chú nội bộ
                            </button>
                            <button
                                onClick={() => setActiveTab('extra')}
                                className={`px-6 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'extra' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                            >
                                <MapPin size={16} /> Thông tin Marketing & Nguồn
                            </button>
                        </div>

                        <div className="min-h-[250px]">
                            {activeTab === 'notes' && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                    <textarea
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 min-h-[180px] focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
                                        placeholder="Nhập ghi chú quan trọng về Lead này..."
                                        value={editData.notes}
                                        onChange={e => setEditData({ ...editData, notes: e.target.value })}
                                    />
                                </div>
                            )}

                            {activeTab === 'extra' && (
                                <div className="grid grid-cols-2 gap-x-12 gap-y-6 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex items-center gap-6">
                                        <label className="w-28 shrink-0 text-slate-500 text-sm font-medium">Chiến dịch</label>
                                        <input
                                            className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-blue-500"
                                            value={editData.campaign}
                                            onChange={e => setEditData({ ...editData, campaign: e.target.value })}
                                        />
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <label className="w-28 shrink-0 text-slate-500 text-sm font-medium">Nguồn</label>
                                        <select
                                            className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-blue-500"
                                            value={editData.source}
                                            onChange={e => setEditData({ ...editData, source: e.target.value })}
                                        >
                                            <option value="facebook">Facebook Ads</option>
                                            <option value="google">Google Search</option>
                                            <option value="hotline">Hotline</option>
                                            <option value="referral">Giới thiệu</option>
                                            <option value="tiktok">TikTok</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <label className="w-28 shrink-0 text-slate-500 text-sm font-medium">Người giới thiệu</label>
                                        <input
                                            className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                                            value={editData.referredBy}
                                            onChange={e => setEditData({ ...editData, referredBy: e.target.value })}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default MarketingLeadDetails;
