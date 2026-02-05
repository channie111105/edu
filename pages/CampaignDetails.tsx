
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
    Filter
} from 'lucide-react';

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
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-600 font-bold">
                                <tr>
                                    <th className="p-3">Họ tên</th>
                                    <th className="p-3">Điện thoại</th>
                                    <th className="p-3">Email</th>
                                    <th className="p-3 text-center">Xác thực</th>
                                    <th className="p-3 text-center">Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {leads.map(lead => (
                                    <tr key={lead.id} className="hover:bg-slate-50">
                                        <td className="p-3 font-medium text-slate-900">{lead.name}</td>
                                        <td className="p-3 text-slate-500">{lead.phone}</td>
                                        <td className="p-3 text-slate-500">{lead.email}</td>
                                        <td className="p-3 text-center">
                                            {lead.verified ? (
                                                <span className="text-green-600 font-bold text-xs flex items-center justify-center gap-1"><CheckCircle2 size={12} /> Verified</span>
                                            ) : (
                                                <span className="text-slate-400 text-xs">-</span>
                                            )}
                                        </td>
                                        <td className="p-3 text-center">
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold border ${lead.status === 'Mới' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                lead.status === 'Đã liên hệ' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                                    lead.status === 'Đạt chuẩn' ? 'bg-green-50 text-green-700 border-green-100' :
                                                        lead.status === 'Chốt' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                                                            'bg-slate-50 text-slate-500 border-slate-200'
                                                }`}>{lead.status}</span>
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
                    <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-320px)]">
                        {columns.map(col => (
                            <div
                                key={col}
                                className="w-72 bg-slate-100/50 rounded-lg flex flex-col shrink-0 border border-slate-200/50 transition-colors hover:bg-slate-100"
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, col)}
                            >
                                <div className="p-3 font-bold text-slate-700 uppercase text-xs flex justify-between items-center bg-slate-100 rounded-t-lg border-b border-slate-200">
                                    {col}
                                    <span className="bg-white px-2 rounded-full text-slate-500 shadow-sm">{leads.filter(l => l.status === col).length}</span>
                                </div>
                                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                                    {leads.filter(l => l.status === col).map(lead => (
                                        <div
                                            key={lead.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, lead.id)}
                                            onDragEnd={handleDragEnd}
                                            className="bg-white p-3 rounded shadow-sm border border-slate-200 cursor-move hover:shadow-md transition-shadow active:cursor-grabbing"
                                        >
                                            <div className="font-bold text-sm text-slate-900 mb-1">{lead.name}</div>
                                            <div className="text-xs text-slate-500 mb-2">{lead.phone}</div>
                                            <div className="flex items-center justify-between">
                                                {lead.verified && <CheckCircle2 size={12} className="text-green-500" />}
                                                <span className="text-[10px] bg-slate-100 text-slate-500 px-1 rounded">{lead.source}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {/* Dropzone Hint */}
                                    <div className={`h-16 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center text-slate-400 text-xs font-medium transition-all ${draggedItem !== null ? 'bg-blue-50/50 border-blue-200 text-blue-400 opacity-100' : 'opacity-0 h-0 p-0 border-0'
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
                    <div className="bg-white border border-slate-300 overflow-hidden">
                        <table className="w-full text-left text-xs font-mono border-collapse">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="border border-slate-300 px-2 py-1 font-normal text-slate-500">A</th>
                                    <th className="border border-slate-300 px-2 py-1 font-normal text-slate-500">B</th>
                                    <th className="border border-slate-300 px-2 py-1 font-normal text-slate-500">C</th>
                                    <th className="border border-slate-300 px-2 py-1 font-normal text-slate-500">D</th>
                                    <th className="border border-slate-300 px-2 py-1 font-normal text-slate-500">E</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="bg-slate-100 font-bold">
                                    <td className="border border-slate-300 px-2 py-1">ID</td>
                                    <td className="border border-slate-300 px-2 py-1">Họ Tên</td>
                                    <td className="border border-slate-300 px-2 py-1">Điện thoại</td>
                                    <td className="border border-slate-300 px-2 py-1">Nguồn</td>
                                    <td className="border border-slate-300 px-2 py-1">Trạng thái</td>
                                </tr>
                                {leads.map(lead => (
                                    <tr key={lead.id} className="hover:bg-blue-50">
                                        <td className="border border-slate-300 px-2 py-1">{lead.id}</td>
                                        <td className="border border-slate-300 px-2 py-1">{lead.name}</td>
                                        <td className="border border-slate-300 px-2 py-1">{lead.phone}</td>
                                        <td className="border border-slate-300 px-2 py-1">{lead.source}</td>
                                        <td className="border border-slate-300 px-2 py-1">{lead.status}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );

            // --- FUNNEL VIEW ---
            case 'funnel': {
                const funnelData = [
                    { label: 'Tổng Lead (New)', value: 100, color: 'bg-blue-500' },
                    { label: 'Đã liên hệ (Contacted)', value: 60, color: 'bg-indigo-500' },
                    { label: 'Hẹn gặp/Đạt chuẩn', value: 30, color: 'bg-purple-500' },
                    { label: 'Chốt (Won)', value: 12, color: 'bg-emerald-500' }
                ];
                const maxVal = 100;
                return (
                    <div className="flex justify-center items-center h-[500px] bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                        <div className="w-full max-w-2xl space-y-2">
                            {funnelData.map((step, idx) => (
                                <div key={idx} className="flex flex-col items-center">
                                    <div
                                        className={`h-16 flex items-center justify-center text-white font-bold rounded-lg relative shadow-md transition-all hover:scale-105 ${step.color}`}
                                        style={{ width: `${(step.value / maxVal) * 100}%`, minWidth: '150px' }}
                                    >
                                        {step.value}%
                                    </div>
                                    <div className="h-8 border-l-2 border-dashed border-slate-300 my-1"></div>
                                    <span className="text-sm font-bold text-slate-700">{step.label}</span>
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
        <div className="flex flex-col h-full bg-[#f8fafc] text-[#111418] font-sans">
            {/* Header */}
            <div className="flex items-center gap-4 px-6 py-4 border-b border-[#dbe0e6] bg-white">
                <button onClick={() => navigate('/campaigns')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-slate-900">Chiến dịch: {id || 'Trại Hè 2024'}</h1>
                    <p className="text-sm text-slate-500">Facebook Lead Form • Đang chạy</p>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="px-6 pt-4 bg-white border-b border-[#dbe0e6]">
                <div className="flex gap-6">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 pb-4 px-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
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
            <div className="flex-1 overflow-y-auto p-6">

                {/* TAB 1: DASHBOARD */}
                {activeTab === 'dashboard' && (
                    <div className="space-y-6 max-w-5xl mx-auto">
                        {/* Quick Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                                <p className="text-slate-500 text-xs font-medium uppercase">Tổng Data</p>
                                <p className="text-2xl font-bold text-slate-900 mt-1">{CAMPAIGNS_METRICS.totalLeads.toLocaleString()}</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                                <p className="text-slate-500 text-xs font-medium uppercase">% Xác thực</p>
                                <p className="text-2xl font-bold text-blue-600 mt-1">{CAMPAIGNS_METRICS.validRate}%</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                                <p className="text-slate-500 text-xs font-medium uppercase">% Contacted</p>
                                <p className="text-2xl font-bold text-indigo-600 mt-1">{CAMPAIGNS_METRICS.contactedRate}%</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                                <p className="text-slate-500 text-xs font-medium uppercase">Tỷ lệ chốt</p>
                                <p className="text-2xl font-bold text-emerald-600 mt-1">{CAMPAIGNS_METRICS.conversionRate}%</p>
                            </div>
                        </div>

                        {/* ROI Chart Placeholder */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2"><PieChart size={20} /> Biểu đồ hiệu quả ROI</h3>

                            <div className="h-64 bg-slate-50 rounded-lg flex items-center justify-center border border-dashed border-slate-300">
                                <p className="text-slate-400">Chart Area (Doanh thu vs Chi phí theo ngày)</p>
                            </div>

                            <div className="mt-6 grid grid-cols-3 gap-6 text-center">
                                <div>
                                    <p className="text-sm text-slate-500">Chi phí (Budget)</p>
                                    <p className="text-lg font-bold text-slate-900">{CAMPAIGNS_METRICS.budget.toLocaleString()} đ</p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">Doanh thu (Revenue)</p>
                                    <p className="text-lg font-bold text-emerald-600">{CAMPAIGNS_METRICS.revenue.toLocaleString()} đ</p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">Lợi nhuận (ROI)</p>
                                    <p className="text-lg font-bold text-green-600">+{CAMPAIGNS_METRICS.roi}%</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: API CONFIG */}
                {activeTab === 'api' && (
                    <div className="max-w-4xl mx-auto space-y-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <h3 className="font-bold text-lg text-slate-800 mb-2 flex items-center gap-2"><Settings size={20} /> Webhook Integration</h3>
                            <p className="text-slate-500 text-sm mb-6">Kết nối tự động nhận Lead từ các nền tảng bên ngoài (Landing Page, Woocommerce...)</p>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Webhook URL</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            readOnly
                                            value={webhookUrl}
                                            className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono text-slate-600"
                                        />
                                        <button className="p-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50" title="Copy">
                                            <Copy size={18} className="text-slate-600" />
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">Phương thức: POST. Content-Type: application/json.</p>
                                </div>

                                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                    <p className="text-xs font-bold text-slate-700 mb-2">Mẫu dữ liệu JSON:</p>
                                    <pre className="text-xs font-mono text-slate-600 bg-white p-3 rounded border border-slate-200 overflow-x-auto">
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

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2"><Facebook size={20} /> Facebook API</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Pixel ID</label>
                                    <input
                                        type="text"
                                        value={fbPixelId}
                                        onChange={(e) => setFbPixelId(e.target.value)}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Access Token</label>
                                    <input
                                        type="password"
                                        value="********************"
                                        readOnly
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-slate-50"
                                    />
                                </div>
                            </div>
                            <div className="mt-4 flex justify-end">
                                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700">Lưu cấu hình</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 3: FORM & QR */}
                {activeTab === 'form' && (
                    <div className="flex h-[600px] bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        {/* Builder Sidebar */}
                        <div className="w-64 bg-slate-50 border-r border-slate-200 p-4">
                            <h3 className="font-bold text-sm text-slate-700 mb-4">Thành phần Form</h3>
                            <div className="space-y-2">
                                <div className="p-3 bg-white border border-slate-200 rounded cursor-move shadow-sm text-sm">Họ và Tên</div>
                                <div className="p-3 bg-white border border-slate-200 rounded cursor-move shadow-sm text-sm">Số điện thoại</div>
                                <div className="p-3 bg-white border border-slate-200 rounded cursor-move shadow-sm text-sm">Email</div>
                                <div className="p-3 bg-white border border-slate-200 rounded cursor-move shadow-sm text-sm">Câu hỏi trắc nghiệm</div>
                            </div>
                        </div>

                        {/* Preview Area */}
                        <div className="flex-1 p-8 bg-slate-100 flex justify-center overflow-y-auto">
                            <div className="w-[400px] bg-white shadow-xl min-h-[500px] rounded-lg p-6">
                                <h2 className="text-xl font-bold text-center mb-6 text-blue-900">Đăng ký tham gia</h2>
                                <div className="space-y-4">
                                    <input disabled placeholder="Họ và tên *" className="w-full p-2 border border-slate-300 rounded bg-slate-50" />
                                    <input disabled placeholder="Số điện thoại *" className="w-full p-2 border border-slate-300 rounded bg-slate-50" />
                                    <input disabled placeholder="Email" className="w-full p-2 border border-slate-300 rounded bg-slate-50" />
                                    <button disabled className="w-full py-2 bg-blue-600 text-white rounded font-bold mt-4">Gửi đăng ký</button>
                                </div>
                            </div>
                        </div>

                        {/* QR Code Panel */}
                        <div className="w-72 border-l border-slate-200 p-6 flex flex-col items-center">
                            <h3 className="font-bold text-sm text-slate-700 mb-4">QR Code & Link</h3>
                            <div className="bg-white p-2 border border-slate-200 rounded-lg shadow-sm mb-4">
                                <QrCode size={150} className="text-slate-800" />
                            </div>
                            <button className="w-full py-2 border border-blue-600 text-blue-600 rounded-lg font-bold text-sm hover:bg-blue-50 mb-2">Tải xuống QR</button>
                            <p className="text-xs text-center text-slate-400 mt-4">Quét để mở form đăng ký</p>
                        </div>
                    </div>
                )}

                {/* TAB 4: DATA LIST (MULTI-VIEW) */}
                {activeTab === 'data' && (
                    <div className="flex flex-col gap-4">
                        {/* Toolbar */}
                        <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-slate-700 mr-4">Danh sách Data</h3>

                                <div className="flex p-1 bg-slate-100 rounded-lg gap-1">
                                    <button
                                        onClick={() => setViewMode('table')}
                                        className={`p-2 rounded text-slate-600 transition-colors ${viewMode === 'table' ? 'bg-white shadow text-blue-600' : 'hover:bg-slate-200'}`}
                                        title="Bảng (Mặc định)"
                                    >
                                        <TableIcon size={18} />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('kanban')}
                                        className={`p-2 rounded text-slate-600 transition-colors ${viewMode === 'kanban' ? 'bg-white shadow text-blue-600' : 'hover:bg-slate-200'}`}
                                        title="Kanban (Quy trình)"
                                    >
                                        <LayoutGrid size={18} />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('sheet')}
                                        className={`p-2 rounded text-slate-600 transition-colors ${viewMode === 'sheet' ? 'bg-white shadow text-blue-600' : 'hover:bg-slate-200'}`}
                                        title="Sheet (Excel)"
                                    >
                                        <FileSpreadsheet size={18} />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('funnel')}
                                        className={`p-2 rounded text-slate-600 transition-colors ${viewMode === 'funnel' ? 'bg-white shadow text-blue-600' : 'hover:bg-slate-200'}`}
                                        title="Phễu (Báo cáo)"
                                    >
                                        <BarChart size={18} />
                                    </button>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded text-sm text-slate-600 font-bold hover:bg-slate-50">
                                    <Filter size={16} /> Bộ lọc
                                </button>
                                <button className="text-sm text-blue-600 font-bold hover:underline px-3">Xuất Excel</button>
                            </div>
                        </div>

                        {/* View Content */}
                        {renderDataView()}

                        {viewMode === 'table' && <div className="p-4 text-center text-slate-500 text-sm">Hiển thị {leads.length}/1567 kết quả</div>}
                    </div>
                )}

            </div>
        </div>
    );
};

export default CampaignDetails;
