
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    LayoutDashboard,
    Settings,
    FileText,
    Database,
    QrCode,
    Copy,
    Save,
    PieChart,
    Globe,
    Facebook,
    CheckCircle2,
    Table as TableIcon,
    LayoutGrid,
    FileSpreadsheet,
    BarChart,
    Filter,
    TrendingUp,
    Download,
    GripVertical,
    MoreHorizontal,
    Search,
    Zap
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

// --- MOCK DATA ---
const CAMPAIGNS_METRICS = {
    totalLeads: 1567,
    validRate: 85,
    contactedRate: 60,
    conversionRate: 12,
    roi: 450,
    budget: 57500000,
    revenue: 980000000,
    cpl: 323034
};

const ROI_CHART_DATA = [
    { name: '1/2', revenue: 400, budget: 240 },
    { name: '2/2', revenue: 300, budget: 139 },
    { name: '3/2', revenue: 500, budget: 380 },
    { name: '4/2', revenue: 780, budget: 390 },
    { name: '5/2', revenue: 480, budget: 480 },
    { name: '6/2', revenue: 600, budget: 380 },
    { name: '7/2', revenue: 900, budget: 430 },
    { name: '8/2', revenue: 850, budget: 400 },
    { name: '9/2', revenue: 980, budget: 410 },
    { name: '10/2', revenue: 1100, budget: 420 },
];

// Mock Leads
const INITIAL_LEADS = Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    name: `Nguyễn Văn Lead ${i + 1}`,
    phone: `090${Math.floor(Math.random() * 10000000)}`,
    email: `lead${i + 1}@example.com`,
    status: ['Mới', 'Đã liên hệ', 'Đạt chuẩn', 'Chốt', 'Hủy'][Math.floor(Math.random() * 5)],
    verified: Math.random() > 0.3,
    source: 'Facebook'
}));

const CampaignDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'dashboard' | 'api' | 'form' | 'data'>('dashboard');

    // View Mode for Data Tab
    const [viewMode, setViewMode] = useState<'table' | 'kanban' | 'sheet' | 'funnel'>('table');

    // API Config State
    const [webhookUrl, setWebhookUrl] = useState('https://api.educrm.com/wh/v1/camp_123');
    const [fbPixelId, setFbPixelId] = useState('1293849182312');

    // State for Leads (Drag & Drop)
    const [leads, setLeads] = useState(INITIAL_LEADS);
    const [draggedItem, setDraggedItem] = useState<number | null>(null);

    // Tabs Configuration
    const tabs = [
        { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
        { id: 'api', label: 'Cấu hình API', icon: Settings },
        { id: 'form', label: 'Form & QR Code', icon: FileText },
        { id: 'data', label: 'Danh sách Data', icon: Database },
    ];

    // --- DRAG AND DROP HANDLERS ---
    const handleDragStart = (e: React.DragEvent, id: number) => {
        setDraggedItem(id);
        e.dataTransfer.effectAllowed = 'move';
        (e.target as HTMLElement).style.opacity = '0.5';
    };

    const handleDragEnd = (e: React.DragEvent) => {
        setDraggedItem(null);
        (e.target as HTMLElement).style.opacity = '1';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetStatus: string) => {
        e.preventDefault();
        if (draggedItem === null) return;

        setLeads(prev => prev.map(lead => {
            if (lead.id === draggedItem) {
                return { ...lead, status: targetStatus };
            }
            return lead;
        }));
        setDraggedItem(null);
    };


    // Helper to render various data views
    const renderDataView = () => {
        switch (viewMode) {
            // --- TABLE VIEW (DEFAULT) ---
            case 'table':
                return (
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
                        <table className="w-full text-left text-sm font-inter">
                            <thead className="bg-white text-slate-400 font-bold border-b border-slate-100">
                                <tr>
                                    <th className="px-8 py-5 text-[10px] uppercase tracking-widest">Họ tên</th>
                                    <th className="px-8 py-5 text-[10px] uppercase tracking-widest">Điện thoại</th>
                                    <th className="px-8 py-5 text-[10px] uppercase tracking-widest">Email</th>
                                    <th className="px-8 py-5 text-center text-[10px] uppercase tracking-widest">Xác thực</th>
                                    <th className="px-8 py-5 text-center text-[10px] uppercase tracking-widest">Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {leads.map(lead => (
                                    <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-8 py-4 font-bold text-slate-800 tracking-tight">{lead.name}</td>
                                        <td className="px-8 py-4 text-slate-600 font-medium tracking-tight whitespace-nowrap">{lead.phone}</td>
                                        <td className="px-8 py-4 text-slate-400 tracking-tight">{lead.email}</td>
                                        <td className="px-8 py-4">
                                            <div className="flex justify-center">
                                                {lead.verified ? (
                                                    <span className="text-green-600 font-bold text-[10px] flex items-center gap-1.5 uppercase tracking-tight">
                                                        <CheckCircle2 size={12} strokeWidth={3} /> Verified
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-300 text-[10px]">-</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-8 py-4">
                                            <div className="flex justify-center">
                                                <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest border ${lead.status === 'Mới' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                    lead.status === 'Đã liên hệ' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                                                        lead.status === 'Đạt chuẩn' ? 'bg-green-50 text-green-700 border-green-100' :
                                                            lead.status === 'Chốt' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' :
                                                                'bg-slate-50 text-slate-500 border-slate-200'
                                                    }`}>
                                                    {lead.status}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );

            // --- KANBAN VIEW ---
            case 'kanban': {
                const columns = ['Mới', 'Đã liên hệ', 'Đạt chuẩn', 'Chốt'];
                return (
                    <div className="flex gap-6 overflow-x-auto pb-6 h-[calc(100vh-320px)] animate-in fade-in slide-in-from-right-4 duration-300">
                        {columns.map(col => (
                            <div
                                key={col}
                                className="w-80 bg-slate-100/50 rounded-3xl border border-slate-200/50 flex flex-col shrink-0 overflow-hidden"
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, col)}
                            >
                                <div className="p-5 font-bold text-slate-700 uppercase text-[10px] tracking-widest flex justify-between items-center bg-white border-b border-slate-200">
                                    {col}
                                    <span className="bg-slate-100 px-2 py-0.5 rounded-lg text-[10px] font-black text-slate-500">{leads.filter(l => l.status === col).length}</span>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                                    {leads.filter(l => l.status === col).map(lead => (
                                        <div
                                            key={lead.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, lead.id)}
                                            onDragEnd={handleDragEnd}
                                            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm cursor-move hover:shadow-md transition-all active:scale-[0.98] group"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <p className="font-bold text-slate-800 text-sm leading-tight group-hover:text-blue-600 transition-colors uppercase tracking-tight">{lead.name}</p>
                                                <MoreHorizontal size={14} className="text-slate-300" />
                                            </div>
                                            <p className="text-xs text-slate-400 font-mono mb-4">{lead.phone}</p>
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-1">
                                                    {lead.verified && <CheckCircle2 size={12} className="text-green-500" />}
                                                </div>
                                                <span className="text-[9px] bg-slate-50 text-slate-400 px-1.5 py-0.5 rounded border border-slate-100 font-bold tracking-widest uppercase">{lead.source}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {/* Dropzone Hint */}
                                    <div className={`h-24 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 text-[10px] font-black uppercase tracking-widest transition-all ${draggedItem !== null ? 'bg-blue-50/50 border-blue-200 text-blue-400 opacity-100' : 'opacity-0 h-0 p-0 border-0'
                                        }`}>
                                        Thả vào đây
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                );
            }

            // --- SHEET VIEW (MINIMALIST) ---
            case 'sheet':
                return (
                    <div className="bg-white border border-slate-300 overflow-hidden font-mono shadow-inner rounded-xl animate-in fade-in duration-300">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="border border-slate-200 px-3 py-1.5 font-normal text-slate-400">A</th>
                                    <th className="border border-slate-200 px-3 py-1.5 font-normal text-slate-400">B</th>
                                    <th className="border border-slate-200 px-3 py-1.5 font-normal text-slate-400">C</th>
                                    <th className="border border-slate-200 px-3 py-1.5 font-normal text-slate-400">D</th>
                                    <th className="border border-slate-200 px-3 py-1.5 font-normal text-slate-400">E</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="bg-slate-100/50 font-bold uppercase text-[10px] tracking-tighter">
                                    <td className="border border-slate-200 px-3 py-2">ID</td>
                                    <td className="border border-slate-200 px-3 py-2">Họ Tên</td>
                                    <td className="border border-slate-200 px-3 py-2">Điện thoại</td>
                                    <td className="border border-slate-200 px-3 py-2">Nguồn</td>
                                    <td className="border border-slate-200 px-3 py-2">Trạng thái</td>
                                </tr>
                                {leads.map(lead => (
                                    <tr key={lead.id} className="hover:bg-blue-50/50 transition-colors">
                                        <td className="border border-slate-200 px-3 py-1.5">{lead.id}</td>
                                        <td className="border border-slate-200 px-3 py-1.5">{lead.name}</td>
                                        <td className="border border-slate-200 px-3 py-1.5">{lead.phone}</td>
                                        <td className="border border-slate-200 px-3 py-1.5">{lead.source}</td>
                                        <td className="border border-slate-200 px-3 py-1.5 text-blue-600 font-bold">{lead.status}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );

            // --- FUNNEL VIEW ---
            case 'funnel': {
                const funnelData = [
                    { label: 'Tổng Lead (New)', value: 100, color: 'bg-blue-600 shadow-blue-100' },
                    { label: 'Đã liên hệ (Contacted)', value: 60, color: 'bg-indigo-600 shadow-indigo-100' },
                    { label: 'Hẹn gặp/Đạt chuẩn', value: 30, color: 'bg-purple-600 shadow-purple-100' },
                    { label: 'Chốt (Won)', value: 12, color: 'bg-emerald-600 shadow-emerald-100' }
                ];
                return (
                    <div className="flex justify-center items-center py-12 bg-white rounded-3xl shadow-sm border border-slate-200 animate-in zoom-in-95 duration-500">
                        <div className="w-full max-w-xl space-y-4">
                            {funnelData.map((step, idx) => (
                                <div key={idx} className="flex flex-col items-center group">
                                    <div
                                        className={`h-16 flex items-center justify-center text-white font-black rounded-2xl relative shadow-lg transition-all group-hover:scale-105 ${step.color}`}
                                        style={{ width: `${60 + step.value * 0.4}%`, minWidth: '200px' }}
                                    >
                                        {step.value}%
                                    </div>
                                    {idx < funnelData.length - 1 && (
                                        <div className="h-6 border-l-2 border-dashed border-slate-200 my-1"></div>
                                    )}
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{step.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            }
            default:
                return null;
        }
    };

    return (
        <div className="flex flex-col h-screen bg-[#f8fafc] text-[#111418] font-sans overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/campaigns')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Chiến dịch: {id || 'Trại Hè 2024'}</h1>
                        <p className="text-xs text-slate-500 font-medium">Facebook Lead Form • <span className="text-green-600 font-bold">Đang chạy</span></p>
                    </div>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="bg-white border-b border-slate-200 shrink-0">
                <div className="max-w-[1600px] mx-auto px-6 flex gap-8 font-inter">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 py-4 px-2 text-sm font-bold border-b-2 transition-all ${activeTab === tab.id
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <tab.icon size={18} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-slate-50/50 custom-scrollbar">
                <div className="max-w-[1600px] mx-auto">

                    {/* TAB 1: DASHBOARD */}
                    {activeTab === 'dashboard' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Quick Stats Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {[
                                    { label: 'TỔNG DATA', value: CAMPAIGNS_METRICS.totalLeads.toLocaleString(), color: 'text-slate-900' },
                                    { label: '% XÁC THỰC', value: `${CAMPAIGNS_METRICS.validRate}%`, color: 'text-blue-600' },
                                    { label: '% CONTACTED', value: `${CAMPAIGNS_METRICS.contactedRate}%`, color: 'text-indigo-600' },
                                    { label: 'TỶ LỆ CHỐT', value: `${CAMPAIGNS_METRICS.conversionRate}%`, color: 'text-green-600' },
                                ].map((stat, i) => (
                                    <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-transform hover:scale-[1.01]">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                                        <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* ROI Chart Card */}
                            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
                                    <TrendingUp size={20} className="text-slate-500" /> Biểu đồ hiệu quả ROI
                                </h3>

                                <div className="h-[240px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={ROI_CHART_DATA}>
                                            <defs>
                                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                                            <Area type="monotone" dataKey="budget" stroke="#e2e8f0" strokeWidth={2} fill="transparent" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Footer Stats inside ROI Chart */}
                                <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">Chi phí (Budget)</p>
                                        <p className="text-lg font-black text-slate-900">{CAMPAIGNS_METRICS.budget.toLocaleString()}đ</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">Doanh thu (Revenue)</p>
                                        <p className="text-lg font-black text-green-600">{CAMPAIGNS_METRICS.revenue.toLocaleString()}đ</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">Lợi nhuận (ROI)</p>
                                        <p className="text-lg font-black text-blue-600">+{CAMPAIGNS_METRICS.roi}%</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: API CONFIG */}
                    {activeTab === 'api' && (
                        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
                            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                                <div className="flex items-center gap-3 mb-2">
                                    <Settings className="text-slate-400" size={20} />
                                    <h3 className="text-xl font-bold font-inter text-slate-800">Webhook Integration</h3>
                                </div>
                                <p className="text-sm text-slate-500 mb-8 font-medium">Kết nối tự động nhận Lead từ các nền tảng bên ngoài (Landing Page, Woocommerce...)</p>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 mb-3 uppercase tracking-widest">Webhook URL</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                readOnly
                                                value={webhookUrl}
                                                className="flex-1 bg-slate-50 border border-slate-200 px-5 py-3.5 rounded-xl text-sm font-mono text-blue-600 outline-none"
                                            />
                                            <button className="p-3.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors shadow-sm" title="Copy">
                                                <Copy size={18} />
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-2 font-medium">Phương thức: POST. Content-Type: application/json.</p>
                                    </div>

                                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                                        <p className="text-[10px] font-black text-slate-700 mb-3 uppercase tracking-widest">Mẫu dữ liệu JSON:</p>
                                        <pre className="text-xs font-mono text-slate-600 bg-white p-4 rounded-xl border border-slate-100 overflow-x-auto">
                                            {`{
  "name": "Nguyen Van A",
  "phone": "0901234567",
  "email": "email@example.com",
  "source": "landing_page",
  "campaign": "${id || 'Trai_He_2024'}"
}`}
                                        </pre>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <Facebook className="text-blue-600" size={20} />
                                    <h3 className="text-xl font-bold font-inter text-slate-800">Facebook API</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 mb-3 uppercase tracking-widest">Pixel ID</label>
                                        <input
                                            type="text"
                                            value={fbPixelId}
                                            onChange={(e) => setFbPixelId(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 px-5 py-3.5 rounded-xl text-sm outline-none focus:border-blue-500 transition-all font-medium"
                                            placeholder="VD: 1293849182312"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 mb-3 uppercase tracking-widest">Access Token</label>
                                        <input
                                            type="password"
                                            value="********************"
                                            readOnly
                                            className="w-full bg-slate-50 border border-slate-200 px-5 py-3.5 rounded-xl text-sm outline-none focus:border-blue-500 transition-all font-medium opacity-60"
                                        />
                                    </div>
                                </div>
                                <div className="mt-8 flex justify-end">
                                    <button className="px-8 py-3.5 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center gap-2">
                                        <Save size={16} /> Lưu cấu hình
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: FORM & QR */}
                    {activeTab === 'form' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500 items-start">
                            {/* Builder Sidebar */}
                            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                                <h3 className="text-[10px] font-black text-slate-400 mb-6 uppercase tracking-widest font-inter">Thành phần Form</h3>
                                <div className="space-y-3">
                                    {['Họ và Tên', 'Số điện thoại', 'Email', 'Câu hỏi trắc nghiệm'].map((comp, i) => (
                                        <div key={i} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl cursor-grab active:cursor-grabbing hover:bg-slate-100 transition-colors group">
                                            <span className="text-sm font-bold text-slate-700">{comp}</span>
                                            <GripVertical size={16} className="text-slate-300 group-hover:text-slate-400" />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Preview Area */}
                            <div className="bg-white p-12 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center">
                                <h2 className="text-xl font-black text-slate-800 mb-10 font-inter">Đăng ký tham gia</h2>
                                <div className="w-full space-y-5">
                                    <input disabled placeholder="Họ và tên *" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-xl text-sm italic text-slate-300" />
                                    <input disabled placeholder="Số điện thoại *" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-xl text-sm italic text-slate-300" />
                                    <input disabled placeholder="Email" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-xl text-sm italic text-slate-300" />
                                    <button disabled className="w-full py-4 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest shadow-lg shadow-blue-100 mt-4 opacity-100">Gửi đăng ký</button>
                                </div>
                            </div>

                            {/* QR Code Panel */}
                            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center">
                                <h3 className="text-[10px] font-black text-slate-400 mb-10 uppercase tracking-widest font-inter">QR Code & Link</h3>
                                <div className="flex flex-col items-center">
                                    <div className="w-48 h-48 bg-white border border-slate-100 rounded-2xl shadow-xl p-4 mb-10 flex items-center justify-center">
                                        <QrCode size={150} className="text-slate-800" strokeWidth={1.5} />
                                    </div>
                                    <button className="w-full py-3.5 bg-white border border-blue-200 text-blue-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-50 transition-all flex items-center justify-center gap-2 mb-4">
                                        <Download size={16} /> Tải xuống QR
                                    </button>
                                    <p className="text-[10px] text-slate-400 font-bold tracking-tight">Quét để mở form đăng ký</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 4: DATA LIST (MULTI-VIEW) */}
                    {activeTab === 'data' && (
                        <div className="flex flex-col gap-6 animate-in fade-in duration-500">
                            {/* Toolbar */}
                            <div className="bg-white p-4 lg:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap justify-between items-center gap-4">
                                <div className="flex items-center gap-4">
                                    <h3 className="font-bold text-lg text-slate-800 mr-4 font-inter tracking-tight">Danh sách Data</h3>

                                    <div className="flex bg-slate-100 p-1 rounded-lg gap-1 border border-slate-200">
                                        {[
                                            { id: 'table', icon: TableIcon, title: 'Bảng (Mặc định)' },
                                            { id: 'kanban', icon: LayoutGrid, title: 'Kanban (Quy trình)' },
                                            { id: 'sheet', icon: FileSpreadsheet, title: 'Sheet (Excel)' },
                                            { id: 'funnel', icon: BarChart, title: 'Phễu (Báo cáo)' },
                                        ].map(v => (
                                            <button
                                                key={v.id}
                                                onClick={() => setViewMode(v.id as any)}
                                                className={`p-2 rounded-md transition-all ${viewMode === v.id ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                                                title={v.title}
                                            >
                                                <v.icon size={18} />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400 w-64 transition-all" placeholder="Tìm tên, số điện thoại..." />
                                    </div>
                                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 font-bold hover:bg-slate-50 shadow-sm">
                                        <Filter size={16} /> Bộ lọc
                                    </button>
                                    <button className="text-sm text-blue-600 font-black uppercase tracking-widest hover:underline px-3 flex items-center gap-2">
                                        Xuất Excel
                                    </button>
                                </div>
                            </div>

                            {/* View Content */}
                            <div className="flex-1">
                                {renderDataView()}
                            </div>

                            {(viewMode === 'table' || viewMode === 'sheet') && (
                                <div className="p-4 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest">Hiển thị {leads.length}/1567 kết quả</div>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default CampaignDetails;
