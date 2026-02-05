
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Megaphone,
  MoreVertical,
  Table as TableIcon,
  Columns
} from 'lucide-react';

// --- MOCK DATA ---
const CAMPAIGNS = [
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
    color: 'bg-slate-100 text-slate-700'
  }
];

const Campaigns: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');

  // State for Campaigns to support Drag & Drop updates
  const [campaigns, setCampaigns] = useState(CAMPAIGNS);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  const filteredCampaigns = campaigns.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
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

  const handleDrop = (e: React.DragEvent, targetStatus: string) => {
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
    if (filteredCampaigns.length === 0 && searchTerm) {
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
                  <th className="p-4 text-center">Trạng thái</th>
                  <th className="p-4">Thời gian</th>
                  <th className="p-4 text-right">Ngân sách</th>
                  <th className="p-4 text-right">Chi tiêu</th>
                  <th className="p-4 text-right">Doanh thu</th>
                  <th className="p-4 text-center">Leads</th>
                  <th className="p-4 text-right">ROI</th>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      // --- KANBAN VIEW (STATUS) ---
      case 'kanban': {
        const columns = ['Planned', 'Running', 'Paused', 'Completed'];
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
                    {campaigns.filter(c => c.status === status).length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                  {campaigns.filter(c => c.status === status).map(campaign => (
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
                        <h4 className="font-bold text-sm text-slate-900 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
                          {campaign.name}
                        </h4>
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
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">
                          {campaign.channel}
                        </span>
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
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-all focus:ring-4 focus:ring-blue-100">
            <Plus size={20} /> Tạo chiến dịch mới
          </button>
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
    </div>
  );
};

export default Campaigns;