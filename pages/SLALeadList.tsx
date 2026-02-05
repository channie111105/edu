
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
   Search,
   Filter,
   Phone,
   Clock,
   AlertOctagon,
   AlertTriangle,
   CheckCircle2,
   ChevronRight,
   ListTodo,
   FileEdit,
   Settings,
   X,
   UserCheck,
   RefreshCw
} from 'lucide-react';
import { getLeads, saveLead } from '../utils/storage';
import { ILead } from '../types';
import { calculateSLAWarnings, SLAWarning, SLAConfig } from '../utils/slaUtils';
import UnifiedLeadDrawer from '../components/UnifiedLeadDrawer';
import { useAuth } from '../contexts/AuthContext';

// Mock Sales Reps
const SALES_REPS = [
   { id: 'u2', name: 'Sarah Miller', team: 'Team Đức', avatar: 'SM', color: 'bg-purple-100 text-purple-700' },
   { id: 'u3', name: 'David Clark', team: 'Team Trung', avatar: 'DC', color: 'bg-blue-100 text-blue-700' },
   { id: 'u4', name: 'Alex Rivera', team: 'Team Du học', avatar: 'AR', color: 'bg-green-100 text-green-700' },
   { id: 'u1', name: 'Tôi', team: 'Admin', avatar: 'ME', color: 'bg-slate-100 text-slate-700' },
   { id: 'u3', name: 'Nguyễn Văn A', team: 'Team Trung', avatar: 'NA', color: 'bg-orange-100 text-orange-700' },
];

const SLALeadList: React.FC = () => {
   const navigate = useNavigate();
   const { user } = useAuth();

   const [filterStatus, setFilterStatus] = useState<'All' | 'NotAck' | 'Slow' | 'New'>('All');
   const [searchTerm, setSearchTerm] = useState('');

   // Config State
   const [slaConfig, setSlaConfig] = useState<SLAConfig>({ ackTimeMinutes: 15, firstActionTimeMinutes: 60 });
   const [showSettings, setShowSettings] = useState(false);

   // Real Data State
   const [leads, setLeads] = useState<ILead[]>([]);
   const [warnings, setWarnings] = useState<SLAWarning[]>([]);
   const [selectedLead, setSelectedLead] = useState<ILead | null>(null);

   // Load leads and calculate warnings
   useEffect(() => {
      const allLeads = getLeads();
      setLeads(allLeads);

      const calculatedWarnings = calculateSLAWarnings(allLeads, undefined, slaConfig);
      setWarnings(calculatedWarnings);
   }, [user, slaConfig]);

   // Filter Logic
   const filteredWarnings = useMemo(() => {
      if (filterStatus === 'New') return [];

      return warnings.filter(w => {
         let matchesStatus = false;
         if (filterStatus === 'All') matchesStatus = true;
         else if (filterStatus === 'NotAck') matchesStatus = w.type === 'not_acknowledged' || (w.severity === 'danger' && w.type === 'new_lead');
         else if (filterStatus === 'Slow') matchesStatus = w.type === 'slow_interaction' || w.type === 'overdue_appointment' || (w.severity === 'warning' && w.type === 'new_lead');
         else matchesStatus = true;

         const matchesSearch = w.lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            w.lead.phone.includes(searchTerm);

         return matchesStatus && matchesSearch;
      });
   }, [warnings, filterStatus, searchTerm]);

   // "Lead Mới" Logic
   const freshLeads = useMemo(() => {
      const warningLeadIds = new Set(warnings.map(w => w.lead.id));
      const today = new Date();
      return leads.filter(l => {
         if (warningLeadIds.has(l.id)) return false;
         if (!l.createdAt) return false;
         const d = new Date(l.createdAt);
         return d.getDate() === today.getDate() &&
            d.getMonth() === today.getMonth() &&
            d.getFullYear() === today.getFullYear();
      });
   }, [leads, warnings]);

   const notAckCount = warnings.filter(w => w.type === 'not_acknowledged' || (w.severity === 'danger' && w.type === 'new_lead')).length;
   const slowCount = warnings.filter(w => w.type === 'slow_interaction' || w.type === 'overdue_appointment').length;
   const freshCount = freshLeads.length;

   const handleUpdate = (updatedLead: ILead) => {
      saveLead(updatedLead);
      const newLeads = leads.map(l => l.id === updatedLead.id ? updatedLead : l);
      setLeads(newLeads);
      const newWarnings = calculateSLAWarnings(newLeads, undefined, slaConfig);
      setWarnings(newWarnings);
      setSelectedLead(null);
   };

   // Quick Accept Action
   const handleQuickAccept = (lead: ILead) => {
      const updatedLead: ILead = {
         ...lead,
         status: 'CONTACTED',
         ownerId: (!lead.ownerId || lead.ownerId === 'system') ? (user?.id || 'u1') : lead.ownerId,
         lastInteraction: new Date().toISOString()
      };
      handleUpdate(updatedLead);
   };

   const getRepInfo = (id?: string) => {
      if (!id) return { name: '-', color: '', avatar: '?', team: '' };
      return SALES_REPS.find(r => r.id === id) || { name: 'Unknown', color: 'bg-gray-100', avatar: '?', team: '' };
   };

   const getTypeBadge = (type: string) => {
      if (type === 'not_acknowledged' || type === 'new_lead') return <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">Chưa liên hệ</span>;
      if (type === 'slow_interaction') return <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">Chậm chăm sóc</span>;
      if (type === 'overdue_appointment') return <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">Quá hạn lịch hẹn</span>;
      return <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">Vấn đề khác</span>;
   };

   return (
      <div className="flex flex-col min-h-full bg-[#f8fafc] text-[#0d141b] font-sans">
         <div className="flex flex-col flex-1 p-6 lg:p-8 max-w-[1400px] mx-auto w-full gap-6">

            {/* Header */}
            <div className="flex flex-wrap justify-between items-center gap-4">
               <div className="flex flex-col gap-1">
                  <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                     <ListTodo className="text-blue-600" /> Danh sách Lead cần xử lý (SLA)
                  </h1>
                  <p className="text-slate-500 text-sm">Cảnh báo deadline xử lý lead và các cuộc hẹn sắp tới hạn.</p>
               </div>
               <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm"
               >
                  <Settings size={18} /> Cài đặt SLA
               </button>
            </div>

            {/* Config Panel */}
            {showSettings && (
               <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-md animate-in slide-in-from-top-2">
                  <div className="flex justify-between items-center mb-4">
                     <h3 className="font-bold text-lg text-slate-800">Cấu hình thời gian SLA</h3>
                     <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Thời gian nhận Lead (Phút)</label>
                        <div className="flex items-center gap-3">
                           <input
                              type="number"
                              className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-center font-bold"
                              value={slaConfig.ackTimeMinutes}
                              onChange={(e) => setSlaConfig({ ...slaConfig, ackTimeMinutes: parseInt(e.target.value) || 0 })}
                           />
                           <span className="text-slate-500 text-sm">Sau thời gian này nếu chưa nhận &rarr; <span className="text-red-600 font-bold">Nguy hiểm</span></span>
                        </div>
                     </div>
                     <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Thời gian tương tác đầu (Phút)</label>
                        <div className="flex items-center gap-3">
                           <input
                              type="number"
                              className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-center font-bold"
                              value={slaConfig.firstActionTimeMinutes}
                              onChange={(e) => setSlaConfig({ ...slaConfig, firstActionTimeMinutes: parseInt(e.target.value) || 0 })}
                           />
                           <span className="text-slate-500 text-sm">Sau thời gian này nếu chưa có Activity &rarr; <span className="text-amber-600 font-bold">Cảnh báo</span></span>
                        </div>
                     </div>
                  </div>
               </div>
            )}

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center">
               <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                     type="text"
                     placeholder="Tìm tên, số điện thoại..."
                     className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                  />
               </div>

               <div className="flex gap-2">
                  <button
                     onClick={() => setFilterStatus('All')}
                     className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${filterStatus === 'All' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                     Tất cả
                  </button>
                  <button
                     onClick={() => setFilterStatus('NotAck')}
                     className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-1 ${filterStatus === 'NotAck' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                  >
                     <AlertOctagon size={14} /> Quá hạn nhận ({notAckCount})
                  </button>
                  <button
                     onClick={() => setFilterStatus('Slow')}
                     className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-1 ${filterStatus === 'Slow' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'}`}
                  >
                     <Clock size={14} /> Chậm tương tác ({slowCount})
                  </button>
                  <button
                     onClick={() => setFilterStatus('New')}
                     className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-1 ${filterStatus === 'New' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                  >
                     <CheckCircle2 size={14} /> Lead mới ({freshCount})
                  </button>
               </div>
            </div>

            {/* Lead List Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
               <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200">
                     <tr>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Họ tên & Nguồn</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Sale phụ trách</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Loại Data</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Thời gian chờ</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Hành động</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {filterStatus !== 'New' && filteredWarnings.map((warning, idx) => {
                        const rep = getRepInfo((warning.lead as any).salesperson || warning.lead.ownerId);
                        return (
                           <tr key={`${warning.lead.id}-${idx}`} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setSelectedLead(warning.lead)}>
                              <td className="px-6 py-4">
                                 <div className="flex flex-col">
                                    <span className="text-sm font-bold text-slate-900">{warning.lead.name}</span>
                                    <div className="flex items-center gap-2 mt-1">
                                       <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">{warning.lead.source}</span>
                                       <span className="text-xs text-slate-400">{warning.lead.phone}</span>
                                    </div>
                                 </div>
                              </td>
                              <td className="px-6 py-4">
                                 <div className="flex items-center gap-2">
                                    {rep.name !== 'Unknown' && <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${rep.color}`}>{rep.avatar}</div>}
                                    <span className="text-sm font-medium text-slate-700">{rep.name}</span>
                                 </div>
                              </td>
                              <td className="px-6 py-4 w-[25%]">
                                 <div className="flex flex-col gap-1">
                                    {getTypeBadge(warning.type)}
                                    <span className="text-xs text-slate-500 mt-1 line-clamp-2">{warning.message}</span>
                                 </div>
                              </td>
                              <td className="px-6 py-4">
                                 <span className="text-sm font-medium text-slate-700 capitalize">{warning.lead.status}</span>
                              </td>
                              <td className="px-6 py-4">
                                 <span className={`text-sm font-bold flex items-center gap-1 ${warning.severity === 'danger' ? 'text-red-600' :
                                    warning.severity === 'warning' ? 'text-amber-600' : 'text-slate-600'
                                    }`}>
                                    <Clock size={16} /> {warning.timeLeft}
                                 </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                 <div className="flex items-center justify-end gap-2">
                                    <button
                                       onClick={(e) => { e.stopPropagation(); /* Start Call */ }}
                                       className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                       title="Gọi ngay"
                                    >
                                       <Phone size={16} />
                                    </button>

                                    {/* Quick Accept for NotAck */}
                                    {warning.type === 'not_acknowledged' && (
                                       <button
                                          onClick={(e) => { e.stopPropagation(); handleQuickAccept(warning.lead); }}
                                          className="inline-flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm font-bold shadow-sm transition-all whitespace-nowrap"
                                          title="Nhận Lead ngay"
                                       >
                                          <UserCheck size={14} /> Nhận ngay
                                       </button>
                                    )}

                                    <button
                                       onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedLead(warning.lead);
                                       }}
                                       className="inline-flex items-center gap-1 bg-[#1380ec] hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm font-bold shadow-sm transition-all whitespace-nowrap"
                                    >
                                       <FileEdit size={14} /> Cập nhật
                                    </button>
                                 </div>
                              </td>
                           </tr>
                        );
                     })}

                     {/* RENDER FRESH LEADS */}
                     {filterStatus === 'New' && freshLeads.map((lead, idx) => {
                        const rep = getRepInfo((lead as any).salesperson || lead.ownerId);
                        return (
                           <tr key={`${lead.id}-${idx}`} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setSelectedLead(lead)}>
                              <td className="px-6 py-4">
                                 <div className="flex flex-col">
                                    <span className="text-sm font-bold text-slate-900">{lead.name}</span>
                                    <div className="flex items-center gap-2 mt-1">
                                       <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">{lead.source}</span>
                                       <span className="text-xs text-slate-400">{lead.phone}</span>
                                    </div>
                                 </div>
                              </td>
                              <td className="px-6 py-4">
                                 <div className="flex items-center gap-2">
                                    {rep.name !== 'Unknown' && <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${rep.color}`}>{rep.avatar}</div>}
                                    <span className="text-sm font-medium text-slate-700">{rep.name}</span>
                                 </div>
                              </td>
                              <td className="px-6 py-4">
                                 <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">Mới về hôm nay</span>
                              </td>
                              <td className="px-6 py-4">
                                 <span className="text-sm font-medium text-slate-700 capitalize">{lead.status}</span>
                              </td>
                              <td className="px-6 py-4">
                                 <span className="text-sm font-bold text-blue-600 flex items-center gap-1">
                                    <Clock size={16} /> Trong hạn
                                 </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                 <div className="flex items-center justify-end gap-2">
                                    <button
                                       onClick={(e) => { e.stopPropagation(); /* Start Call */ }}
                                       className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                       title="Gọi ngay"
                                    >
                                       <Phone size={16} />
                                    </button>
                                    <button
                                       onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedLead(lead);
                                       }}
                                       className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded text-sm font-bold shadow-sm transition-all whitespace-nowrap"
                                    >
                                       Chi tiết
                                    </button>
                                 </div>
                              </td>
                           </tr>
                        );
                     })}

                     {/* EMPTY STATE */}
                     {((filterStatus !== 'New' && filteredWarnings.length === 0) || (filterStatus === 'New' && freshLeads.length === 0)) && (
                        <tr>
                           <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                              <div className="flex flex-col items-center gap-3">
                                 <CheckCircle2 size={48} className="text-green-500 opacity-50" />
                                 <p>Tuyệt vời! Danh sách trống.</p>
                              </div>
                           </td>
                        </tr>
                     )}
                  </tbody>
               </table>
            </div>

         </div>

         {/* Drawer */}
         <UnifiedLeadDrawer
            isOpen={!!selectedLead}
            onClose={() => setSelectedLead(null)}
            lead={selectedLead || undefined}
            onUpdate={handleUpdate}
         />
      </div>
   );
};

export default SLALeadList;
