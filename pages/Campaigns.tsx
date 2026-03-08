
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Megaphone,
  MoreVertical,
  Table as TableIcon,
  Columns,
  BarChart3,
  X,
  Save,
  Calendar,
  DollarSign,
  ToggleLeft,
  ChevronRight,
  UserPlus,
  Pencil
} from 'lucide-react';

type CampaignType = 'manual' | 'auto';
type CampaignStatus = 'Running' | 'Paused' | 'Planned' | 'Completed';

type CampaignFormData = {
  name: string;
  channel: string;
  campaignType: CampaignType;
  apiConnected: boolean;
  status: CampaignStatus;
  startDate: string;
  endDate: string;
  budget: number;
  spent: number;
  revenue: number;
  reportFileNames: string[];
};

type CampaignItem = {
  id: string;
  name: string;
  channel: string;
  status: CampaignStatus;
  startDate: string;
  endDate: string;
  budget: number;
  spent: number;
  revenue: number;
  leads: number;
  campaignType: CampaignType;
  apiConnected: boolean;
  color: string;
  reportFileNames?: string[];
};

const CAMPAIGN_TYPE_OPTIONS: { value: CampaignType; label: string; apiLabel: string }[] = [
  { value: 'manual', label: 'Chiến dịch thường', apiLabel: 'API Off' },
  { value: 'auto', label: 'Chiến dịch tự động', apiLabel: 'API On' }
];

// --- MOCK DATA ---
const CAMPAIGNS: CampaignItem[] = [
  {
    id: 'camp_01',
    name: 'Trại Hè 2024',
    channel: 'Facebook',
    status: 'Running',
    startDate: '01/05/2026',
    endDate: '30/08/2026',
    budget: 57500000,
    spent: 24500000,
    revenue: 980000000,
    leads: 1567,
    campaignType: 'auto' as CampaignType,
    apiConnected: true,
    color: 'bg-blue-100 text-blue-700'
  },
  {
    id: 'camp_02',
    name: 'Khóa học IELTS Online',
    channel: 'Google Ads',
    status: 'Paused',
    startDate: '15/04/2026',
    endDate: '15/06/2026',
    budget: 20000000,
    spent: 18000000,
    revenue: 45000000,
    leads: 124,
    campaignType: 'auto' as CampaignType,
    apiConnected: true,
    color: 'bg-orange-100 text-orange-700'
  },
  {
    id: 'camp_03',
    name: 'Hội thảo Du học Đức',
    channel: 'Event/Offline',
    status: 'Planned',
    startDate: '10/06/2026',
    endDate: '10/06/2026',
    budget: 5000000,
    spent: 0,
    revenue: 0,
    leads: 0,
    campaignType: 'manual' as CampaignType,
    apiConnected: false,
    color: 'bg-purple-100 text-purple-700'
  },
  {
    id: 'camp_04',
    name: 'TikTok Brand Awareness',
    channel: 'TikTok',
    status: 'Running',
    startDate: '01/01/2026',
    endDate: '31/12/2026',
    budget: 120000000,
    spent: 45000000,
    revenue: 120000000,
    leads: 850,
    campaignType: 'auto' as CampaignType,
    apiConnected: true,
    color: 'bg-pink-100 text-pink-700'
  },
  {
    id: 'camp_05',
    name: 'Email Marketing - Khách cũ',
    channel: 'Email',
    status: 'Running',
    startDate: '05/02/2026',
    endDate: 'Inderfinite',
    budget: 2000000,
    spent: 500000,
    revenue: 35000000,
    leads: 45,
    campaignType: 'manual' as CampaignType,
    apiConnected: false,
    color: 'bg-slate-100 text-slate-700'
  }
];

const CHANNEL_DEFAULT_BUDGETS: Record<string, number> = {
  Facebook: 30000000,
  'Google Ads': 25000000,
  TikTok: 40000000,
  Email: 3000000,
  'Event/Offline': 10000000,
  Zalo: 15000000
};

const getTodayISODate = () => new Date().toISOString().split('T')[0];

const toInputDate = (value?: string) => {
  if (!value || value === 'Indefinite' || value === 'Inderfinite') return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return '';
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
};

const toDisplayDate = (value?: string) => {
  if (!value) return 'Indefinite';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return value;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
};

const createDefaultCampaignData = (channel = 'Facebook'): CampaignFormData => ({
  name: '',
  channel,
  campaignType: 'manual' as CampaignType,
  apiConnected: false,
  status: 'Running',
  startDate: getTodayISODate(),
  endDate: '',
  budget: CHANNEL_DEFAULT_BUDGETS[channel] ?? 0,
  spent: 0,
  revenue: 0,
  reportFileNames: [] as string[]
});

const mapCampaignToFormData = (campaign: CampaignItem): CampaignFormData => ({
  name: campaign.name,
  channel: campaign.channel,
  campaignType: campaign.campaignType,
  apiConnected: campaign.apiConnected,
  status: campaign.status,
  startDate: toInputDate(campaign.startDate) || getTodayISODate(),
  endDate: toInputDate(campaign.endDate),
  budget: campaign.budget,
  spent: campaign.spent,
  revenue: campaign.revenue,
  reportFileNames: campaign.reportFileNames ?? []
});

const Campaigns: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [campaignTypeTab, setCampaignTypeTab] = useState<CampaignType>('manual');
  const [statusFilter, setStatusFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');

  // State for Campaigns to support Drag & Drop updates
  const [campaigns, setCampaigns] = useState(CAMPAIGNS);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  // --- CREATE MODAL STATE ---
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCampaignData, setNewCampaignData] = useState(() => createDefaultCampaignData());
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);

  const handleOpenCreateModal = () => {
    setNewCampaignData(createDefaultCampaignData());
    setEditingCampaignId(null);
    setShowCreateModal(true);
  };

  const handleOpenEditModal = (e: React.MouseEvent, campaign: CampaignItem) => {
    e.stopPropagation();
    setEditingCampaignId(campaign.id);
    setNewCampaignData(mapCampaignToFormData(campaign));
    setShowCreateModal(true);
  };

  const handleCloseCampaignModal = () => {
    setShowCreateModal(false);
    setEditingCampaignId(null);
    setNewCampaignData(createDefaultCampaignData());
  };

  const handleChannelChange = (channel: string) => {
    setNewCampaignData(prev => ({
      ...prev,
      channel,
      budget: CHANNEL_DEFAULT_BUDGETS[channel] ?? prev.budget
    }));
  };

  const handleCampaignTypeChange = (campaignType: CampaignType) => {
    setNewCampaignData(prev => ({
      ...prev,
      campaignType,
      apiConnected: campaignType === 'auto'
    }));
  };

  const handleReportFileChange = (files: FileList | null) => {
    if (!files) {
      setNewCampaignData(prev => ({ ...prev, reportFileNames: [] }));
      return;
    }

    setNewCampaignData(prev => ({
      ...prev,
      reportFileNames: Array.from(files).map(file => file.name)
    }));
  };

  const handleSaveCampaign = () => {
    if (!newCampaignData.name) {
      alert('Vui lòng nhập tên chiến dịch');
      return;
    }
    const normalizedCampaignData = {
      ...newCampaignData,
      startDate: toDisplayDate(newCampaignData.startDate),
      endDate: toDisplayDate(newCampaignData.endDate)
    };

    if (editingCampaignId) {
      setCampaigns(prev => prev.map(campaign =>
        campaign.id === editingCampaignId
          ? {
              ...campaign,
              ...normalizedCampaignData
            }
          : campaign
      ));
      handleCloseCampaignModal();
      return;
    }

    const newId = `camp_0${campaigns.length + 1}`;
    const colors = [
      'bg-blue-100 text-blue-700',
      'bg-orange-100 text-orange-700',
      'bg-purple-100 text-purple-700',
      'bg-pink-100 text-pink-700',
      'bg-slate-100 text-slate-700'
    ];
    const newEntry = {
      ...normalizedCampaignData,
      id: newId,
      leads: 0,
      color: colors[campaigns.length % colors.length]
    };
    setCampaigns([newEntry, ...campaigns]);
    handleCloseCampaignModal();
  };

  const filteredCampaigns = campaigns.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
    const matchesType = c.campaignType === campaignTypeTab;
    return matchesSearch && matchesStatus && matchesType;
  });

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val);

  // Toggle Status Handler
  const handleToggleStatus = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    console.log('Toggled status for', id);
    // Update local state to reflect change immediately
    setCampaigns(prev => prev.map(c => {
      if (c.id !== id) return c;
      return { ...c, status: c.status === 'Running' ? 'Paused' : 'Running' };
    }));
  };

  // --- DRAG AND DROP HANDLERS ---
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedItem(id);
    e.dataTransfer.effectAllowed = 'move';
    (e.target as HTMLElement).style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedItem(null);
    (e.target as HTMLElement).style.opacity = '1';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetStatus: CampaignStatus) => {
    e.preventDefault();
    if (!draggedItem) return;

    setCampaigns(prev => prev.map(c => {
      if (c.id === draggedItem) {
        return { ...c, status: targetStatus };
      }
      return c;
    }));
    setDraggedItem(null);
  };

  const renderContent = () => {
    if (filteredCampaigns.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-slate-300 col-span-full">
          <Megaphone size={48} className="text-slate-300 mb-4" />
          <p className="text-slate-500 font-medium">Không tìm thấy chiến dịch nào.</p>
          <button className="mt-4 text-blue-600 font-bold hover:underline">Tạo chiến dịch đầu tiên</button>
        </div>
      );
    }

    switch (viewMode) {
      // --- TABLE VIEW (LIST - PRIMARY) ---
      case 'table':
        return (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-4">Tên chiến dịch</th>
                  <th className="p-4">Kênh</th>
                  <th className="p-4 text-center">API</th>
                  <th className="p-4 text-center">Trạng thái</th>
                  <th className="p-4">Thời gian</th>
                  <th className="p-4 text-right">Ngân sách</th>
                  <th className="p-4 text-right">Chi tiêu</th>
                  <th className="p-4 text-right">Doanh thu</th>
                  <th className="p-4 text-center">Leads</th>
                  <th className="p-4 text-right">ROI</th>
                  <th className="p-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCampaigns.map(c => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/campaigns/${c.id}`)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="p-4 font-bold text-slate-900">{c.name}</td>
                    <td className="p-4 text-slate-600">{c.channel}</td>
                    <td className="p-4 text-center">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${c.apiConnected
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                      >
                        {c.apiConnected ? 'On' : 'Off'}
                      </span>
                    </td>
                    <td className="p-4 flex justify-center">
                      <div
                        onClick={(e) => handleToggleStatus(e, c.id)}
                        className={`flex items-center gap-2 px-2 py-1 rounded-full border cursor-pointer w-fit ${c.status === 'Running'
                          ? 'bg-green-50 border-green-200 hover:bg-green-100'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                          }`}
                      >
                        <div className={`w-8 h-4 rounded-full relative transition-colors ${c.status === 'Running' ? 'bg-green-500' : 'bg-slate-300'}`}>
                          <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-all ${c.status === 'Running' ? 'left-4.5' : 'left-0.5'}`} style={{ left: c.status === 'Running' ? '18px' : '2px' }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-xs text-slate-500 whitespace-nowrap">
                      {c.startDate} <br /> {c.endDate}
                    </td>
                    <td className="p-4 text-right">{formatCurrency(c.budget)}</td>
                    <td className="p-4 text-right font-medium text-slate-700">{formatCurrency(c.spent)}</td>
                    <td className="p-4 text-right font-bold text-emerald-600">{formatCurrency(c.revenue)}</td>
                    <td className="p-4 text-center font-bold text-slate-900">{c.leads}</td>
                    <td className={`p-4 text-right font-bold ${c.revenue > c.spent ? 'text-green-600' : 'text-slate-500'}`}>
                      {c.spent > 0 ? ((c.revenue - c.spent) / c.spent * 100).toFixed(0) + '%' : 'N/A'}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={(e) => handleOpenEditModal(e, c)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                        >
                          <Pencil size={14} />
                          <span className="text-xs font-bold">Sửa</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      // --- KANBAN VIEW (STATUS) ---
      case 'kanban': {
        const columns: CampaignStatus[] = ['Planned', 'Running', 'Paused', 'Completed'];
        return (
          <div className="flex gap-6 overflow-x-auto pb-6 h-[calc(100vh-250px)]">
            {columns.map(status => (
              <div
                key={status}
                className="w-80 flex flex-col shrink-0 bg-slate-100/50 rounded-xl border border-slate-200/50 h-full transition-colors hover:bg-slate-100"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, status)}
              >
                <div className="p-4 font-bold text-slate-700 flex justify-between items-center bg-slate-100 rounded-t-xl border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${status === 'Running' ? 'bg-green-500' :
                      status === 'Paused' ? 'bg-amber-500' :
                        status === 'Planned' ? 'bg-purple-500' :
                          'bg-slate-500'
                      }`}></div>
                    {status}
                  </div>
                  <span className="bg-white px-2 py-0.5 rounded-md text-xs font-bold text-slate-500 shadow-sm">
                    {filteredCampaigns.filter(c => c.status === status).length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                  {filteredCampaigns.filter(c => c.status === status).map(campaign => (
                    <div
                      key={campaign.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, campaign.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => navigate(`/campaigns/${campaign.id}`)}
                      className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 cursor-move hover:shadow-md transition-all group active:cursor-grabbing"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${campaign.color}`}>
                          <Megaphone size={14} />
                        </div>
                        <div className="flex-1 flex items-start justify-between gap-2">
                          <h4 className="font-bold text-sm text-slate-900 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
                            {campaign.name}
                          </h4>
                          <button
                            type="button"
                            onClick={(e) => handleOpenEditModal(e, campaign)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            title="Sửa chiến dịch"
                          >
                            <Pencil size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                        <div>
                          <p className="text-slate-500">Leads</p>
                          <p className="font-bold text-slate-900">{campaign.leads}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">ROI</p>
                          <p className="font-bold text-green-600">
                            {campaign.spent > 0 ? ((campaign.revenue - campaign.spent) / campaign.spent * 100).toFixed(0) + '%' : '-'}
                          </p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">
                            {campaign.channel}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${campaign.apiConnected
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}>
                            API {campaign.apiConnected ? 'ON' : 'OFF'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {campaign.endDate}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Dropzone Hint */}
                  <div className={`h-20 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center text-slate-400 text-xs font-medium transition-all ${draggedItem ? 'bg-blue-50/50 border-blue-200 text-blue-400 opacity-100' : 'opacity-0 h-0 p-0 border-0'
                    }`}>
                    Thả vào đây
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#111418] font-sans">
      <div className="flex flex-col flex-1 p-6 lg:p-8 max-w-[1600px] mx-auto w-full gap-6">

        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Chiến dịch Marketing</h1>
            <p className="text-slate-500 mt-1">Quản lý tập trung các chiến dịch, ngân sách và hiệu quả đầu tư.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/campaigns/camp_01/evaluation')}
              className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg font-bold flex items-center gap-2 shadow-sm hover:bg-slate-50 transition-all"
            >
              <BarChart3 size={20} className="text-blue-600" /> Đánh giá
            </button>
            <button
              onClick={handleOpenCreateModal}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-all focus:ring-4 focus:ring-blue-100"
            >
              <Plus size={20} /> Tạo chiến dịch mới
            </button>
          </div>
        </div>

        {/* Campaign Type Tabs */}
        <div className="inline-flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm w-fit">
          {CAMPAIGN_TYPE_OPTIONS.map(option => (
            <button
              key={option.value}
              onClick={() => setCampaignTypeTab(option.value)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${campaignTypeTab === option.value
                ? 'bg-slate-800 text-white'
                : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Controls Bar */}
        <div className="flex flex-wrap gap-4 items-center bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
          {/* Search */}
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Tìm kiếm chiến dịch..."
              className="w-full pl-10 pr-4 py-2 border-0 bg-transparent text-sm focus:ring-0 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="h-6 w-px bg-slate-200 mx-2"></div>

          {/* Status Filters */}
          <div className="flex gap-1 overflow-x-auto no-scrollbar">
            {['All', 'Running', 'Paused', 'Planned', 'Completed'].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${statusFilter === status
                  ? 'bg-slate-800 text-white'
                  : 'bg-white text-slate-500 hover:bg-slate-100'
                  }`}
              >
                {status === 'All' ? 'Tất cả' : status}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-slate-200 mx-2"></div>

          {/* View Switcher */}
          <div className="flex p-1 bg-slate-100 rounded-lg gap-1">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'}`}
              title="Dạng Bảng (List)"
            >
              <TableIcon size={18} />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'}`}
              title="Dạng Kanban (Status)"
            >
              <Columns size={18} />
            </button>
          </div>
        </div>

        {/* Content Render */}
        <div className="flex-1">
          {renderContent()}
        </div>

      </div>

      {/* CREATE CAMPAIGN MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleCloseCampaignModal}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh] font-inter">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Megaphone size={20} className="text-blue-600" />
                {editingCampaignId ? 'Sửa chiến dịch Marketing' : 'Thêm chiến dịch Marketing mới'}
              </h3>
              <button onClick={handleCloseCampaignModal} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-slate-700 text-sm font-bold mb-2">Tên chiến dịch <span className="text-red-500">*</span></label>
                  <input
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-slate-800 transition-all"
                    placeholder="VD: Trại Hè 2024, Khóa học IELTS Online..."
                    value={newCampaignData.name}
                    onChange={e => setNewCampaignData({ ...newCampaignData, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 text-sm font-bold mb-2">Kênh quảng cáo <span className="text-red-500">*</span></label>
                    <select
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none bg-white font-medium text-slate-700 transition-all"
                      value={newCampaignData.channel}
                      onChange={e => handleChannelChange(e.target.value)}
                    >
                      <option value="Facebook">Facebook</option>
                      <option value="Google Ads">Google Ads</option>
                      <option value="TikTok">TikTok</option>
                      <option value="Email">Email</option>
                      <option value="Event/Offline">Sự kiện / Offline</option>
                      <option value="Zalo">Zalo Ads</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 text-sm font-bold mb-2">Trạng thái ban đầu</label>
                    <div className="flex items-center gap-3 h-[42px]">
                      <button
                        onClick={() => setNewCampaignData({ ...newCampaignData, status: newCampaignData.status === 'Running' ? 'Paused' : 'Running' })}
                        className={`w-12 h-6 rounded-full relative transition-colors ${newCampaignData.status === 'Running' ? 'bg-green-500' : 'bg-slate-300'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${newCampaignData.status === 'Running' ? 'left-7' : 'left-1'}`}></div>
                      </button>
                      <span className={`text-sm font-bold ${newCampaignData.status === 'Running' ? 'text-green-600' : 'text-slate-500'}`}>
                        {newCampaignData.status === 'Running' ? 'Đang chạy' : 'Tạm dừng'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 text-sm font-bold mb-2">Loại chiến dịch</label>
                    <select
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none bg-white font-medium text-slate-700 transition-all"
                      value={newCampaignData.campaignType}
                      onChange={e => handleCampaignTypeChange(e.target.value as CampaignType)}
                    >
                      {CAMPAIGN_TYPE_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 text-sm font-bold mb-2">Đấu nối API</label>
                    <div className="h-[42px] px-3 border border-slate-200 rounded-lg bg-slate-50 flex items-center justify-between">
                      <span className={`text-sm font-bold ${newCampaignData.apiConnected ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {newCampaignData.apiConnected ? 'Đang bật' : 'Đang tắt'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest border ${newCampaignData.apiConnected
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                        {newCampaignData.apiConnected ? 'On' : 'Off'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timing */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 text-sm font-bold mb-2 flex items-center gap-2">
                    <Calendar size={16} className="text-slate-400" /> Ngày bắt đầu <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:border-blue-500 outline-none text-slate-700"
                    value={newCampaignData.startDate}
                    onChange={e => setNewCampaignData({ ...newCampaignData, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-slate-700 text-sm font-bold mb-2 flex items-center gap-2">
                    <Calendar size={16} className="text-slate-400" /> Ngày kết thúc
                  </label>
                  <input
                    type="date"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:border-blue-500 outline-none text-slate-700"
                    value={newCampaignData.endDate}
                    onChange={e => setNewCampaignData({ ...newCampaignData, endDate: e.target.value })}
                  />
                </div>
              </div>

              {/* Financials */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Thông tin tài chính (VND)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-slate-600 text-xs font-bold mb-1.5">Ngân sách dự kiến</label>
                    <div className="relative">
                      <input
                        type="number"
                        className="w-full pl-4 pr-10 py-2 border border-slate-300 rounded-lg text-sm font-bold outline-none focus:border-blue-500"
                        value={newCampaignData.budget}
                        onChange={e => setNewCampaignData({ ...newCampaignData, budget: Number(e.target.value) })}
                      />
                      <span className="absolute right-3 top-2.5 text-slate-400 text-xs font-bold font-inter">đ</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-600 text-xs font-bold mb-1.5">Đã chi tiêu</label>
                    <div className="relative">
                      <input
                        type="number"
                        className="w-full pl-4 pr-10 py-2 border border-slate-300 rounded-lg text-sm font-bold outline-none focus:border-blue-500"
                        value={newCampaignData.spent}
                        onChange={e => setNewCampaignData({ ...newCampaignData, spent: Number(e.target.value) })}
                      />
                      <span className="absolute right-3 top-2.5 text-slate-400 text-xs font-bold font-inter">đ</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-600 text-xs font-bold mb-1.5">Doanh thu</label>
                    <div className="relative">
                      <input
                        type="number"
                        className="w-full pl-4 pr-10 py-2 border border-slate-300 rounded-lg text-sm font-bold outline-none focus:border-blue-500"
                        value={newCampaignData.revenue}
                        onChange={e => setNewCampaignData({ ...newCampaignData, revenue: Number(e.target.value) })}
                      />
                      <span className="absolute right-3 top-2.5 text-slate-400 text-xs font-bold font-inter">đ</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="block text-slate-600 text-xs font-bold">Đính kèm file báo cáo</label>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.xlsx,.xls,.csv,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg"
                    className="w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                    onChange={e => handleReportFileChange(e.target.files)}
                  />
                  {newCampaignData.reportFileNames.length > 0 && (
                    <p className="text-xs text-slate-500">
                      Đã chọn: {newCampaignData.reportFileNames.join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 shrink-0">
              <button
                onClick={handleCloseCampaignModal}
                className="px-5 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-lg transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSaveCampaign}
                className="px-8 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center gap-2 shadow-lg shadow-blue-100 transition-all active:scale-95"
              >
                <Save size={18} /> {editingCampaignId ? 'Cập nhật chiến dịch' : 'Lưu chiến dịch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Campaigns;
