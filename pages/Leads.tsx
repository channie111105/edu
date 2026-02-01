
import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ILead, LeadStatus, UserRole, IDeal, DealStage } from '../types';
import SLABadge from '../components/SLABadge';
import UnifiedLeadDrawer from '../components/UnifiedLeadDrawer';
import LeadPivotTable from '../components/LeadPivotTable'; // Import Pivot Component
import { useAuth } from '../contexts/AuthContext';
import { getLeads, saveLead, saveLeads, addDeal, addContact, deleteLead, convertLeadToContact } from '../utils/storage';
import {
  Plus,
  UploadCloud,
  Check,
  Filter,
  SlidersHorizontal,
  Clock,
  X,
  Save,
  AlertTriangle,
  ExternalLink,
  Loader2,
  Database,
  CheckCircle2,
  Search,
  Users,
  Shuffle,
  UserPlus,
  Calculator,
  LayoutGrid, // Pivot Icon
  List as ListIcon // List Icon
} from 'lucide-react';

const Leads: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // State: Load from LocalStorage
  const [activeTab, setActiveTab] = useState<'all' | 'new' | 'converted' | 'unconverted' | 'sla_risk'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'pivot'>('list'); // View Mode State
  const [leads, setLeads] = useState<ILead[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Drawer State
  const [selectedLead, setSelectedLead] = useState<ILead | null>(null);

  // Selection & Assignment State
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignMethod, setAssignMethod] = useState<'auto' | 'manual'>('auto');
  const [selectedRep, setSelectedRep] = useState('');

  // Auto Distribution
  const [distribution, setDistribution] = useState<Record<string, number>>({});

  // Mock Sales Reps
  const SALES_REPS = [
    { id: 'u2', name: 'Sarah Miller', team: 'Team Đức', avatar: 'SM', color: 'bg-purple-100 text-purple-700' },
    { id: 'u3', name: 'David Clark', team: 'Team Trung', avatar: 'DC', color: 'bg-blue-100 text-blue-700' },
    { id: 'u4', name: 'Alex Rivera', team: 'Team Du học', avatar: 'AR', color: 'bg-green-100 text-green-700' },
  ];

  // Load data
  useEffect(() => {
    setLeads(getLeads());
  }, []);

  // Initialize distribution
  useEffect(() => {
    if (showAssignModal && selectedLeadIds.length > 0) {
      const count = selectedLeadIds.length;
      const repCount = SALES_REPS.length;
      const base = Math.floor(count / repCount);
      const remainder = count % repCount;

      const newDist: Record<string, number> = {};
      SALES_REPS.forEach((rep, index) => {
        newDist[rep.id] = base + (index < remainder ? 1 : 0);
      });
      setDistribution(newDist);
    }
  }, [showAssignModal, selectedLeadIds.length]);

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLeadData, setNewLeadData] = useState({
    name: '', phone: '', email: '', source: 'hotline', program: 'Tiếng Đức', notes: ''
  });
  const [duplicateWarning, setDuplicateWarning] = useState<ILead | null>(null);
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);

  // Auto switch tab
  useEffect(() => {
    if (location.state && (location.state as any).activeTab) {
      setActiveTab((location.state as any).activeTab);
    }
  }, [location]);

  const canViewAll = hasPermission([UserRole.ADMIN, UserRole.FOUNDER, UserRole.MARKETING]);

  // Filtering
  const filteredLeads = useMemo(() => {
    let result = leads;

    // Marketing: Chỉ hiển thị Lead chưa được phân bổ (chưa có Owner)
    if (canViewAll) {
      result = result.filter(l => !l.ownerId || l.ownerId === '');
    } else {
      // Sales: Chỉ thấy Lead của mình
      result = result.filter(l => l.ownerId === user?.id);
    }

    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(l =>
        l.name.toLowerCase().includes(lowerTerm) ||
        l.phone.includes(lowerTerm) ||
        l.email.toLowerCase().includes(lowerTerm) ||
        l.source.toLowerCase().includes(lowerTerm)
      );
    }
    switch (activeTab) {
      case 'new': return result.filter(l => l.status === LeadStatus.NEW);
      case 'converted': return result.filter(l => ([LeadStatus.QUALIFIED, LeadStatus.CONTACTED] as string[]).includes(l.status));
      case 'unconverted': return result.filter(l => ([LeadStatus.DISQUALIFIED, LeadStatus.NEW] as string[]).includes(l.status));
      case 'sla_risk': return result.filter(l => l.slaStatus === 'danger');
      default: return result;
    }
  }, [leads, activeTab, searchTerm, canViewAll, user]);

  // --- ACTIONS ---

  const handleUpdateLead = (updatedLead: ILead) => {
    const updatedList = leads.map(l => l.id === updatedLead.id ? updatedLead : l);
    setLeads(updatedList);
    saveLeads(updatedList);
    if (selectedLead?.id === updatedLead.id) {
      setSelectedLead(updatedLead);
    }
  };

  const handleConvertLead = (lead: ILead) => {
    try {
      const contact = convertLeadToContact(lead);
      const savedContact = addContact(contact);

      const dealStage = Object.values(DealStage).includes(lead.status as DealStage)
        ? (lead.status as DealStage)
        : DealStage.DEEP_CONSULTING;

      const deal: IDeal = {
        id: `D-${Date.now()}`,
        leadId: savedContact.id, // Link to the ACTUAL stored Contact ID
        title: lead.name + ' - ' + (lead.program || 'General'),
        value: lead.value || 0,
        stage: dealStage,
        ownerId: lead.ownerId || user?.id || 'admin',
        expectedCloseDate: lead.expectedClosingDate || '',
        products: lead.productItems?.map(p => p.name) || [],
        productItems: lead.productItems || [], // Persist full product details
        discount: lead.discount || 0,
        paymentRoadmap: lead.paymentRoadmap || '',
        probability: lead.probability || 20,
        createdAt: new Date().toISOString(),
      };
      addDeal(deal);
      deleteLead(lead.id);

      setLeads(prev => prev.filter(l => l.id !== lead.id));
      setSelectedLead(null);

      // Navigate to Pipeline with highlight
      navigate(`/pipeline?newDeal=${deal.id}`);
    } catch (error) {
      console.error("Convert Error", error);
      alert("Có lỗi xảy ra khi chuyển đổi Lead!");
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedLeadIds(filteredLeads.map(l => l.id));
    } else {
      setSelectedLeadIds([]);
    }
  };

  const handleSelectLeadCheckbox = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Stop row click
    if (selectedLeadIds.includes(id)) {
      setSelectedLeadIds(selectedLeadIds.filter(lid => lid !== id));
    } else {
      setSelectedLeadIds([...selectedLeadIds, id]);
    }
  };

  const checkDuplicate = (phone: string) => {
    setIsCheckingPhone(true);
    setTimeout(() => {
      const exists = leads.find(l => l.phone === phone);
      if (exists) {
        setDuplicateWarning(exists);
      } else {
        setDuplicateWarning(null);
      }
      setIsCheckingPhone(false);
    }, 500);
  };

  const handleCreateSubmit = () => {
    if (!newLeadData.name || !newLeadData.phone) {
      alert("Vui lòng nhập Tên và SĐT");
      return;
    }
    const newLead: ILead = {
      id: `l-${Date.now()}`,
      ...newLeadData,
      program: newLeadData.program as any,
      status: LeadStatus.NEW,
      ownerId: '',
      createdAt: new Date().toISOString(),
      score: 10,
      lastActivityDate: new Date().toISOString(),
      lastInteraction: new Date().toISOString(),
      slaStatus: 'normal'
    };
    if (saveLead(newLead)) {
      setLeads([newLead, ...leads]);
      setShowCreateModal(false);
      setNewLeadData({ name: '', phone: '', email: '', source: 'hotline', program: 'Tiếng Đức', notes: '' });
      alert("Tạo Lead thành công!");
    } else {
      alert("Có lỗi xảy ra khi lưu Lead");
    }
  };

  const handleAssignSubmit = () => {
    let updatedLeads = [...leads];
    if (assignMethod === 'manual') {
      if (!selectedRep) {
        alert("Vui lòng chọn nhân viên Sale");
        return;
      }
      updatedLeads = updatedLeads.map(l =>
        selectedLeadIds.includes(l.id) ? { ...l, ownerId: selectedRep, status: LeadStatus.CONTACTED } : l
      );
    } else {
      const totalDistributed = Object.values(distribution).reduce((a, b) => a + b, 0);
      if (totalDistributed !== selectedLeadIds.length) {
        alert(`Tổng số lượng phân bổ (${totalDistributed}) không khớp với số Lead đã chọn (${selectedLeadIds.length})`);
        return;
      }
      let leadIndex = 0;
      Object.entries(distribution).forEach(([repId, count]) => {
        for (let i = 0; i < count; i++) {
          if (leadIndex < selectedLeadIds.length) {
            const leadId = selectedLeadIds[leadIndex];
            const leadToUpdateIndex = updatedLeads.findIndex(l => l.id === leadId);
            if (leadToUpdateIndex !== -1) {
              updatedLeads[leadToUpdateIndex] = { ...updatedLeads[leadToUpdateIndex], ownerId: repId, status: LeadStatus.CONTACTED };
            }
            leadIndex++;
          }
        }
      });
    }
    saveLeads(updatedLeads);
    setLeads(updatedLeads);
    setShowAssignModal(false);
    setSelectedLeadIds([]);
    alert(`Đã phân bổ thành công ${selectedLeadIds.length} lead!`);
  };

  const updateDistribution = (repId: string, val: number) => {
    setDistribution(prev => ({ ...prev, [repId]: val }));
  };

  const currentDistTotal = Object.values(distribution).reduce((a, b) => a + b, 0);
  const isDistValid = currentDistTotal === selectedLeadIds.length;

  return (
    <div className="p-6 max-w-[1600px] mx-auto min-h-screen font-inter bg-slate-50 text-slate-900">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">Cơ hội (Leads)</h1>
          <p className="text-slate-500 text-sm mt-1">Quản lý Lead đầu vào và phân bổ cho đội Sales</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50 flex items-center gap-2"><UploadCloud size={16} /> Import Excel</button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-200 transition-all"
          >
            <Plus size={18} strokeWidth={3} /> Thêm Lead
          </button>
        </div>
      </div>

      {/* Tabs & Filter */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6">
        <div className="flex items-center border-b border-slate-100 px-4">
          {['all', 'new', 'sla_risk', 'converted', 'unconverted'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === tab ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              {tab === 'all' && 'Tất cả'}
              {tab === 'new' && 'Lead Mới'}
              {tab === 'sla_risk' && <span className="flex items-center gap-2">SLA Rủi ro <AlertTriangle size={14} className="text-red-500" /></span>}
              {tab === 'converted' && 'Đã chuyển đổi'}
              {tab === 'unconverted' && 'Chưa chuyển đổi'}
            </button>
          ))}
        </div>
        <div className="p-4 flex gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, SĐT, email..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* View Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`} title="Dạng Danh sách"><ListIcon size={16} /></button>
            <button onClick={() => setViewMode('pivot')} className={`p-1.5 rounded ${viewMode === 'pivot' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`} title="Báo cáo Pivot"><LayoutGrid size={16} /></button>
          </div>

          <button className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 text-slate-600"><Filter size={16} /> Lọc nâng cao</button>
          {selectedLeadIds.length > 0 && (
            <div className="ml-auto flex items-center gap-3 animate-in slide-in-from-right-4 fade-in duration-300">
              <span className="text-sm font-semibold text-slate-600">Đã chọn <span className="text-blue-600 font-bold">{selectedLeadIds.length}</span> lead</span>
              <button
                onClick={() => setShowAssignModal(true)}
                className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-bold hover:bg-blue-200 flex items-center gap-2"
              >
                <UserPlus size={16} /> Phân bổ Lead
              </button>
            </div>
          )}
        </div>
      </div>

      {/* CONTENT AREA: LIST vs PIVOT */}
      <div className="mt-4">
        {viewMode === 'pivot' ? (
          <LeadPivotTable leads={filteredLeads} />
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold tracking-wider sticky top-0 z-10">
                <tr>
                  <th className="p-3 w-10 text-center border-b border-slate-200"><input type="checkbox" className="rounded border-slate-300" onChange={handleSelectAll} checked={selectedLeadIds.length === filteredLeads.length && filteredLeads.length > 0} /></th>
                  <th className="p-3 border-b border-slate-200 min-w-[200px]">Cơ hội</th>
                  <th className="p-3 border-b border-slate-200">Liên hệ</th>
                  <th className="p-3 border-b border-slate-200">Email</th>
                  <th className="p-3 border-b border-slate-200">SĐT</th>
                  <th className="p-3 border-b border-slate-200">Hoạt động tiếp theo</th>
                  <th className="p-3 border-b border-slate-200">Hạn chót</th>
                  <th className="p-3 border-b border-slate-200 text-right">Doanh thu</th>
                  <th className="p-3 border-b border-slate-200 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeads.length === 0 ? (
                  <tr><td colSpan={9} className="p-8 text-center text-slate-500">Không tìm thấy lead nào phù hợp.</td></tr>
                ) : (
                  filteredLeads.map(lead => {
                    // Helper: Find next activity
                    // @ts-ignore
                    const nextActivity = (lead.activities || []).find(a => a.type === 'activity');
                    const deadline = lead.expectedClosingDate ? new Date(lead.expectedClosingDate).toLocaleDateString('vi-VN') : '-';

                    return (
                      <tr
                        key={lead.id}
                        className={`hover:bg-blue-50 group cursor-pointer transition-colors ${selectedLeadIds.includes(lead.id) ? 'bg-blue-50' : ''}`}
                        onClick={() => setSelectedLead(lead)}
                      >
                        <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" className="rounded border-slate-300" checked={selectedLeadIds.includes(lead.id)} onClick={(e) => handleSelectLeadCheckbox(lead.id, e)} onChange={() => { }} />
                        </td>
                        <td className="p-3">
                          <span className="font-bold text-slate-900 block truncate max-w-[200px]" title={lead.name}>{lead.name} {lead.program ? `- ${lead.program}` : ''}</span>
                          <span className="text-xs text-slate-500">ID: {lead.id.substring(0, 6)}...</span>
                        </td>
                        <td className="p-3 text-sm text-slate-700">{lead.name}</td>
                        <td className="p-3 text-sm text-slate-600 truncate max-w-[150px]" title={lead.email}>{lead.email || '-'}</td>
                        <td className="p-3 text-sm text-slate-600">{lead.phone || '-'}</td>

                        {/* Next Activity */}
                        <td className="p-3">
                          {nextActivity ? (
                            <div className="flex items-center gap-2 text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-1 rounded max-w-fit">
                              <Clock size={12} /> {nextActivity.description.split(':')[0] || 'Lịch hẹn'}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-xs text-slate-400">
                              <Plus size={12} /> Lên lịch
                            </div>
                          )}
                        </td>

                        {/* Deadline */}
                        <td className="p-3 text-sm text-slate-600">
                          {deadline !== '-' ? <span className="text-red-600 font-bold">{deadline}</span> : '-'}
                        </td>

                        {/* Revenue */}
                        <td className="p-3 text-sm font-bold text-slate-800 text-right">
                          {lead.value ? lead.value.toLocaleString('vi-VN') : '-'}
                        </td>

                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold border uppercase tracking-wide ${lead.status === LeadStatus.NEW ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            lead.status === LeadStatus.QUALIFIED ? 'bg-cyan-50 text-cyan-700 border-cyan-200' :
                              lead.status === DealStage.WON ? 'bg-green-50 text-green-700 border-green-200' :
                                lead.status === DealStage.LOST ? 'bg-red-50 text-red-700 border-red-200' :
                                  'bg-slate-50 text-slate-600 border-slate-200'
                            }`}>
                            {lead.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Drawer for Detail */}
      {selectedLead && (
        <UnifiedLeadDrawer
          isOpen={!!selectedLead}
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdate={handleUpdateLead}
          onConvert={handleConvertLead}
        />
      )}

      {/* CREATE LIST MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowCreateModal(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <UserPlus size={20} className="text-blue-600" />
                Thêm Lead Mới
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Họ tên <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Nguyễn Văn A"
                    value={newLeadData.name}
                    onChange={e => setNewLeadData({ ...newLeadData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Số điện thoại <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input
                      type="text"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 outline-none ${duplicateWarning ? 'border-amber-500 ring-amber-200' : 'border-slate-300 focus:ring-blue-500'}`}
                      placeholder="0912345678"
                      value={newLeadData.phone}
                      onChange={e => {
                        setNewLeadData({ ...newLeadData, phone: e.target.value });
                        if (e.target.value.length > 9) checkDuplicate(e.target.value);
                      }}
                    />
                    {isCheckingPhone && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />}
                  </div>
                </div>

                {duplicateWarning && (
                  <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-3 animate-in slide-in-from-top-2 col-span-2">
                    <AlertTriangle className="text-amber-600 shrink-0" size={20} />
                    <div className="text-sm">
                      <p className="font-bold text-amber-800">Phát hiện trùng lặp!</p>
                      <p className="text-amber-700 mt-1">
                        Số điện thoại này đã tồn tại và thuộc quản lý của Sale <b>{duplicateWarning.ownerId}</b>.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nguồn Lead</label>
                  <select
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    value={newLeadData.source}
                    onChange={e => setNewLeadData({ ...newLeadData, source: e.target.value })}
                  >
                    <option value="hotline">Hotline</option>
                    <option value="fb_lead_form">Facebook Form</option>
                    <option value="sale_tu_kiem_ca_nhan">Sale tự kiếm</option>
                    <option value="referral">Giới thiệu</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Sản phẩm quan tâm</label>
                  <select
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    value={newLeadData.program}
                    onChange={e => setNewLeadData({ ...newLeadData, program: e.target.value })}
                  >
                    <option value="Tiếng Đức">Tiếng Đức</option>
                    <option value="Du học Đức">Du học Đức</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ghi chú ban đầu</label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  placeholder="Ghi chú thêm về nhu cầu..."
                  value={newLeadData.notes}
                  onChange={e => setNewLeadData({ ...newLeadData, notes: e.target.value })}
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg">Hủy bỏ</button>
              <button onClick={handleCreateSubmit} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center gap-2 shadow-sm"><Save size={18} /> Lưu Lead mới</button>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN MODAL */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAssignModal(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <UserPlus size={20} className="text-blue-600" />
                Phân bổ Lead
              </h3>
              <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 flex gap-2 items-start border border-blue-100">
                <Users size={18} className="mt-0.5 shrink-0" />
                <p>Bạn đang phân bổ <span className="font-bold">{selectedLeadIds.length}</span> lead cho nhân viên kinh doanh.</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-3">Phương thức phân bổ</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setAssignMethod('auto')}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${assignMethod === 'auto' ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200' : 'border-slate-200 hover:border-slate-300'}`}
                  >
                    <div className="flex items-center gap-2 mb-2 font-bold text-slate-900">
                      <Shuffle size={18} className={assignMethod === 'auto' ? 'text-blue-600' : 'text-slate-400'} /> Tự động
                    </div>
                    <p className="text-xs text-slate-500">Chia theo số lượng (Chỉ định số lượng cho từng Sale).</p>
                  </button>
                  <button
                    onClick={() => setAssignMethod('manual')}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${assignMethod === 'manual' ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200' : 'border-slate-200 hover:border-slate-300'}`}
                  >
                    <div className="flex items-center gap-2 mb-2 font-bold text-slate-900">
                      <Users size={18} className={assignMethod === 'manual' ? 'text-blue-600' : 'text-slate-400'} /> Thủ công
                    </div>
                    <p className="text-xs text-slate-500">Chọn đích danh một nhân viên để gán toàn bộ.</p>
                  </button>
                </div>
              </div>

              {/* AUTO DISTRIBUTION TABLE */}
              {assignMethod === 'auto' && (
                <div className="animate-in slide-in-from-top-2">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-bold text-slate-700">Chia số lượng Lead</label>
                    <span className={`text-xs font-bold ${isDistValid ? 'text-green-600' : 'text-red-500'}`}>
                      Đã chia: {currentDistTotal}/{selectedLeadIds.length}
                    </span>
                  </div>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="p-2 text-left pl-3">Nhân viên</th>
                          <th className="p-2 text-center w-20">Tỷ lệ</th>
                          <th className="p-2 text-right w-24 pr-3">Số lượng</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {SALES_REPS.map(rep => {
                          const count = distribution[rep.id] || 0;
                          const percent = selectedLeadIds.length > 0 ? Math.round((count / selectedLeadIds.length) * 100) : 0;
                          return (
                            <tr key={rep.id}>
                              <td className="p-2 pl-3">
                                <div className="flex items-center gap-2">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${rep.color}`}>{rep.avatar}</div>
                                  <span className="font-medium text-slate-700">{rep.name}</span>
                                </div>
                              </td>
                              <td className="p-2 text-center text-slate-500 text-xs">{percent}%</td>
                              <td className="p-2 pr-3">
                                <input
                                  type="number"
                                  min="0"
                                  className="w-full border border-slate-300 rounded px-2 py-1 text-right font-bold text-slate-900 outline-none focus:border-blue-500"
                                  value={count}
                                  onChange={(e) => updateDistribution(rep.id, Number(e.target.value))}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {!isDistValid && <p className="text-xs text-red-500 mt-2 font-medium text-right">Tổng số lượng chưa khớp. Vui lòng điều chỉnh.</p>}
                </div>
              )}

              {assignMethod === 'manual' && (
                <div className="animate-in slide-in-from-top-2">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Chọn nhân viên</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar border border-slate-200 rounded-lg p-2">
                    {SALES_REPS.map(rep => (
                      <div
                        key={rep.id}
                        onClick={() => setSelectedRep(rep.id)}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${selectedRep === rep.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50 border border-transparent'}`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${rep.color}`}>
                          {rep.avatar}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900">{rep.name}</p>
                          <p className="text-xs text-slate-500">{rep.team}</p>
                        </div>
                        {selectedRep === rep.id && <CheckCircle2 size={18} className="text-blue-600" />}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setShowAssignModal(false)} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-lg text-sm">Hủy</button>
              <button
                onClick={handleAssignSubmit}
                disabled={assignMethod === 'auto' && !isDistValid}
                className={`px-6 py-2 text-white font-bold rounded-lg shadow-sm text-sm transition-all ${assignMethod === 'auto' && !isDistValid ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                Xác nhận Phân bổ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leads;
