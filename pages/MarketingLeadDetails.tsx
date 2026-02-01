
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLeadById, saveLead } from '../utils/storage';
import { useAuth } from '../contexts/AuthContext';
import {
    ArrowLeft, Phone, Mail, MessageCircle, Clock,
    Tag, MapPin, TrendingUp, Database, Calendar,
    Send, FileText, Save, ExternalLink, Hash
} from 'lucide-react';
import { LeadStatus, ILead, UserRole } from '../types';

interface IActivity {
    id: string;
    type: 'system' | 'note' | 'email' | 'call';
    content: string;
    subContent?: string;
    timestamp: string;
    isSystem?: boolean;
}

const MarketingLeadDetails: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [lead, setLead] = useState<ILead | null>(null);
    const [formData, setFormData] = useState<Partial<ILead>>({});
    const [studentInfo, setStudentInfo] = useState<any>({});

    // Marketing-specific fields
    const [marketingData, setMarketingData] = useState({
        batch: '',
        tags: [] as string[],
        profileLink: '',
        region: '',
        message: ''
    });

    const [noteContent, setNoteContent] = useState('');
    const [activeTab, setActiveTab] = useState<'timeline' | 'notes' | 'email'>('timeline');
    const [activities, setActivities] = useState<IActivity[]>([]);

    // Check if user is Marketing
    const isMarketing = user && user.role === UserRole.MARKETING;

    // Load Lead
    useEffect(() => {
        if (id) {
            const foundLead = getLeadById(id);
            if (foundLead) {
                setLead(foundLead);
                setFormData(foundLead);
                setStudentInfo(foundLead.studentInfo || {});

                // Load marketing-specific data if exists
                const mktData = (foundLead as any).marketingData || {};
                setMarketingData({
                    batch: mktData.batch || '',
                    tags: mktData.tags || [],
                    profileLink: mktData.profileLink || '',
                    region: mktData.region || '',
                    message: mktData.message || ''
                });

                setActivities([
                    {
                        id: 'sys-1',
                        type: 'system',
                        content: 'Lead được tạo từ Marketing',
                        subContent: `Nguồn: ${foundLead.source} | Chiến dịch: ${foundLead.campaign || 'N/A'}`,
                        timestamp: new Date(foundLead.createdAt).toLocaleString(),
                        isSystem: true
                    }
                ]);
            }
        }
    }, [id]);

    const handleInputChange = (field: keyof ILead, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleMarketingDataChange = (field: string, value: any) => {
        setMarketingData(prev => ({ ...prev, [field]: value }));
    };

    const handleSaveInfo = () => {
        if (lead) {
            const updatedLead = {
                ...lead,
                ...formData,
                studentInfo,
                marketingData // Save marketing-specific data
            };
            saveLead(updatedLead);
            setLead(updatedLead);
            alert('✅ Đã lưu thông tin Lead (Marketing) thành công!');
        }
    };

    const handleAddTag = (tag: string) => {
        if (tag && !marketingData.tags.includes(tag)) {
            setMarketingData(prev => ({
                ...prev,
                tags: [...prev.tags, tag]
            }));
        }
    };

    const handleRemoveTag = (tag: string) => {
        setMarketingData(prev => ({
            ...prev,
            tags: prev.tags.filter(t => t !== tag)
        }));
    };

    const handleSendNote = () => {
        if (!noteContent.trim()) return;
        const newNote: IActivity = {
            id: `note-${Date.now()}`,
            type: 'note',
            content: 'Ghi chú Marketing',
            subContent: noteContent,
            timestamp: 'Vừa xong',
            isSystem: false
        };
        setActivities([newNote, ...activities]);
        setNoteContent('');
    };

    if (!lead) return <div className="p-10 text-center">Loading Lead...</div>;

    // --- MARKETING VIEW ---
    return (
        <div className="flex flex-col h-screen bg-slate-50 text-[#111418] font-sans overflow-hidden">

            {/* HEADER */}
            <header className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-white shrink-0 z-20 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="text-slate-500 hover:text-slate-800 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-sm">
                            {lead.name.charAt(0)}
                        </div>
                        <div>
                            <h1 className="text-base font-bold leading-none text-slate-900">{lead.name}</h1>
                            <p className="text-xs text-slate-500 mt-1">Lead ID: {lead.id} | Marketing View</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleSaveInfo}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-bold hover:bg-purple-700 transition-colors shadow-sm"
                    >
                        <Save size={16} /> Lưu thông tin
                    </button>
                </div>
            </header>

            {/* MAIN LAYOUT (3 COLUMNS) */}
            <div className="flex flex-1 overflow-hidden">

                {/* COL 1: MARKETING INFO (Left) */}
                <aside className="w-[380px] bg-white border-r border-slate-200 flex flex-col shrink-0 h-full overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-purple-50/50">
                        <h3 className="text-xs font-bold text-purple-700 uppercase tracking-wider">📊 THÔNG TIN MARKETING</h3>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">

                        {/* 1. ĐỊNH DANH & LIÊN HỆ */}
                        <div>
                            <h4 className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wide">1. Thông tin định danh</h4>
                            <div className="space-y-3">
                                {/* Phone */}
                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                        <Phone size={16} className="text-blue-600" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] text-slate-500 font-medium mb-0.5">Số điện thoại (Unique ID)</p>
                                        <input
                                            className="w-full bg-transparent text-sm font-bold text-slate-900 focus:outline-none"
                                            placeholder="0901 234 567"
                                            value={formData.phone || ''}
                                            onChange={(e) => handleInputChange('phone', e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Email */}
                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                                        <Mail size={16} className="text-purple-600" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] text-slate-500 font-medium mb-0.5">Email</p>
                                        <input
                                            className="w-full bg-transparent text-sm text-slate-700 focus:outline-none"
                                            placeholder="nam.nguyen@example.com"
                                            value={formData.email || ''}
                                            onChange={(e) => handleInputChange('email', e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Profile Link */}
                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                        <ExternalLink size={16} className="text-blue-600" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] text-slate-500 font-medium mb-0.5">Link Profile (FB/TikTok)</p>
                                        <input
                                            className="w-full bg-transparent text-sm text-blue-600 focus:outline-none"
                                            placeholder="facebook.com/..."
                                            value={marketingData.profileLink}
                                            onChange={(e) => handleMarketingDataChange('profileLink', e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Region */}
                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                        <MapPin size={16} className="text-green-600" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] text-slate-500 font-medium mb-0.5">Địa chỉ/Khu vực</p>
                                        <input
                                            className="w-full bg-transparent text-sm text-slate-700 focus:outline-none"
                                            placeholder="Hà Nội, TP.HCM..."
                                            value={marketingData.region}
                                            onChange={(e) => handleMarketingDataChange('region', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. NGUỒN GỐC (TRACKING INFO) */}
                        <div className="bg-purple-50/50 p-4 rounded-lg border border-purple-100">
                            <h4 className="text-xs font-bold text-purple-700 mb-3 uppercase tracking-wide flex items-center gap-1">
                                <TrendingUp size={14} /> 2. Nguồn gốc (Tracking)
                            </h4>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-[10px] text-slate-500 font-bold block mb-1.5">Nguồn (Source)</label>
                                    <select
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 outline-none focus:border-purple-500"
                                        value={formData.source}
                                        onChange={(e) => handleInputChange('source', e.target.value)}
                                    >
                                        <option value="fb_lead_form">Facebook Ads</option>
                                        <option value="tiktok">TikTok</option>
                                        <option value="google">Google Ads</option>
                                        <option value="hotline">Hotline</option>
                                        <option value="event">Sự kiện trường THPT</option>
                                        <option value="b2b">B2B/Agent</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[10px] text-slate-500 font-bold block mb-1.5">Chiến dịch (Campaign)</label>
                                    <input
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-purple-600 outline-none focus:border-purple-500"
                                        placeholder="VD: Du-hoc-Duc-2026"
                                        value={formData.campaign || ''}
                                        onChange={(e) => handleInputChange('campaign', e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] text-slate-500 font-bold block mb-1.5">Lô dữ liệu (Batch Name)</label>
                                    <input
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:border-purple-500"
                                        placeholder="VD: Batch_THPT_01"
                                        value={marketingData.batch}
                                        onChange={(e) => handleMarketingDataChange('batch', e.target.value)}
                                    />
                                </div>

                                {/* Tags */}
                                <div>
                                    <label className="text-[10px] text-slate-500 font-bold block mb-1.5">Thẻ (Tags)</label>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {marketingData.tags.map(tag => (
                                            <span
                                                key={tag}
                                                className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full"
                                            >
                                                <Hash size={10} />
                                                {tag}
                                                <button
                                                    onClick={() => handleRemoveTag(tag)}
                                                    className="ml-1 hover:text-purple-900"
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            id="tag-input"
                                            className="flex-1 px-2 py-1.5 bg-white border border-slate-200 rounded text-xs outline-none"
                                            placeholder="Nhập tag..."
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleAddTag((e.target as HTMLInputElement).value);
                                                    (e.target as HTMLInputElement).value = '';
                                                }
                                            }}
                                        />
                                        <button
                                            onClick={() => {
                                                const input = document.getElementById('tag-input') as HTMLInputElement;
                                                handleAddTag(input.value);
                                                input.value = '';
                                            }}
                                            className="px-3 py-1.5 bg-purple-600 text-white text-xs font-bold rounded hover:bg-purple-700"
                                        >
                                            +
                                        </button>
                                    </div>
                                    <p className="text-[9px] text-slate-400 mt-1">VD: #HotLead, #VuaTotNghiep, #CoTiengDuc</p>
                                </div>
                            </div>
                        </div>

                    </div>
                </aside>

                {/* COL 2: TIMELINE & NOTES (Center) */}
                <main className="flex-1 flex flex-col min-w-0 bg-white border-r border-slate-200">

                    {/* Tabs Header */}
                    <div className="flex border-b border-slate-200 px-6 pt-2">
                        <button
                            onClick={() => setActiveTab('timeline')}
                            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'timeline' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                        >
                            Dòng thời gian
                        </button>
                        <button
                            onClick={() => setActiveTab('notes')}
                            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'notes' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                        >
                            Ghi chú
                        </button>
                        <button
                            onClick={() => setActiveTab('email')}
                            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'email' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                        >
                            Email
                        </button>
                    </div>

                    {/* Timeline Content */}
                    <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 custom-scrollbar">
                        <div className="max-w-3xl space-y-6">
                            {activities.length === 0 ? (
                                <div className="text-center text-slate-400 py-10">
                                    Chưa có hoạt động nào. Hãy thêm ghi chú đầu tiên.
                                </div>
                            ) : activities.map((act) => (
                                <div key={act.id} className="flex gap-4 group">
                                    <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 border-white shadow-sm 
                              ${act.type === 'call' ? 'bg-green-100 text-green-600' :
                                            act.type === 'note' ? 'bg-purple-100 text-purple-600' :
                                                act.isSystem ? 'bg-slate-200 text-slate-500' : 'bg-blue-100 text-blue-600'}
                           `}>
                                        {act.type === 'call' ? <Phone size={14} /> :
                                            act.type === 'note' ? <FileText size={14} /> :
                                                act.isSystem ? <Database size={14} /> : <MessageCircle size={14} />}
                                    </div>
                                    <div className="flex-1 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                        <div className="flex justify-between mb-1">
                                            <p className="text-sm font-bold text-slate-900">{act.content} <span className="text-xs font-normal text-slate-400 ml-1">{act.timestamp}</span></p>
                                        </div>
                                        {act.subContent && (
                                            <div className={`text-sm mt-1 p-2 rounded-lg ${act.type === 'system' ? 'bg-white text-slate-600' : 'bg-slate-50 text-slate-800 border border-slate-100'}`}>
                                                {act.subContent}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer Note Input */}
                    <div className="p-4 border-t border-slate-200 bg-white">
                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">GHI CHÚ MARKETING</label>
                        <div className="flex gap-2">
                            <textarea
                                rows={2}
                                className="flex-1 border border-slate-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                                placeholder="Nhập ghi chú về Lead này..."
                                value={noteContent}
                                onChange={(e) => setNoteContent(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendNote(); } }}
                            />
                            <button
                                onClick={handleSendNote}
                                className="bg-purple-600 text-white px-4 rounded-lg font-bold hover:bg-purple-700 shadow-sm flex flex-col items-center justify-center min-w-[80px]"
                            >
                                <Send size={18} className="mb-1" />
                                <span className="text-xs">Lưu Note</span>
                            </button>
                        </div>
                    </div>
                </main>

            </div>
        </div>
    );
};

export default MarketingLeadDetails;
