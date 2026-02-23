
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
   Search,
   Phone,
   Clock,
   AlertCircle,
   ChevronRight,
   ListTodo,
   Settings,
   X,
   UserCheck,
   CheckCircle2,
   History,
   MessageSquare,
   Filter,
   Check,
   ChevronDown
} from 'lucide-react';
import { getLeads, saveLead } from '../utils/storage';
import { ILead, LeadStatus } from '../types';
import { calculateSLAWarnings, SLAWarning, SLAConfig } from '../utils/slaUtils';
import UnifiedLeadDrawer from '../components/UnifiedLeadDrawer';
import AdvancedDateFilter, { DateRange } from '../components/AdvancedDateFilter';
import { useAuth } from '../contexts/AuthContext';

// Mock Sales Reps
const SALES_REPS = [
   { id: 'u2', name: 'Sarah Miller', team: 'Team Đức', avatar: 'SM', color: 'bg-purple-100 text-purple-700' },
   { id: 'u3', name: 'David Clark', team: 'Team Trung', avatar: 'DC', color: 'bg-blue-100 text-blue-700' },
   { id: 'u4', name: 'Alex Rivera', team: 'Team Du học', avatar: 'AR', color: 'bg-green-100 text-green-700' },
   { id: 'u1', name: 'Tôi', team: 'Admin', avatar: 'ME', color: 'bg-slate-100 text-slate-700' },
   { id: 'u3', name: 'Nguyễn Văn A', team: 'Team Trung', avatar: 'NA', color: 'bg-orange-100 text-orange-700' },
];

type TabType = 'Acceptance' | 'Interaction';

const SLALeadList: React.FC = () => {
   const navigate = useNavigate();
   const { user } = useAuth();
   const filterRef = useRef<HTMLDivElement>(null);

   // Main Tab State
   const [activeTab, setActiveTab] = useState<TabType>('Acceptance');

   // Search & Filter
   const [searchTerm, setSearchTerm] = useState('');
   const [showFilterDropdown, setShowFilterDropdown] = useState(false);

   // Advanced Filters State
   const [advancedFilters, setAdvancedFilters] = useState<{
      myPipeline: boolean;
      unassigned: boolean;
      status: string[];
      source: string[];
      ownerId: string[];
   }>({
      myPipeline: false,
      unassigned: false,
      status: [],
      source: [],
      ownerId: []
   });

   // Date Filter State
   const [dateRange, setDateRange] = useState<DateRange>({ startDate: null, endDate: null });

   // Config State (default updated as requested)
   const [slaConfig, setSlaConfig] = useState<SLAConfig>({
      ackTimeMinutes: 5,  // Updated to 5 minutes as requested
      firstActionTimeMinutes: 60,
      maxNeglectTimeHours: 72
   });
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

   // Handle Click Outside for Filter Dropdown
   useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
         if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
            setShowFilterDropdown(false);
         }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
   }, []);

   // Compute Lists based on Warnings
   const acceptanceList = useMemo(() => {
      return warnings.filter(w => w.type === 'not_acknowledged' || w.type === 'new_lead');
   }, [warnings]);

   const interactionList = useMemo(() => {
      return warnings.filter(w => w.type === 'slow_interaction' || w.type === 'neglected_interaction' || w.type === 'overdue_appointment' || w.type === 'manual_sla');
   }, [warnings]);

   // Helper: Is Date in Range
   const isDateInRange = (dateStr?: string) => {
      if (!dateStr) return false;
      if (!dateRange.startDate) return true;
      const date = new Date(dateStr);
      const start = new Date(dateRange.startDate); start.setHours(0, 0, 0, 0);

      if (!dateRange.endDate) return date >= start;
      const end = new Date(dateRange.endDate); end.setHours(23, 59, 59, 999);

      return date >= start && date <= end;
   };

   // Filter Logic for Active List
   const filteredList = useMemo(() => {
      const sourceList = activeTab === 'Acceptance' ? acceptanceList : interactionList;

      return sourceList.filter(w => {
         // 1. Text Search
         const matchesSearch = w.lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            w.lead.phone.includes(searchTerm);
         if (!matchesSearch) return false;

         // 2. Advanced Filters
         if (advancedFilters.myPipeline && user?.id) {
            if (w.lead.ownerId !== user.id) return false;
         }

         if (advancedFilters.unassigned) {
            if (w.lead.ownerId && w.lead.ownerId !== '') return false;
         }

         if (advancedFilters.status.length > 0) {
            if (!activeTab.includes('Acceptance') && !advancedFilters.status.includes(w.lead.status)) return false;
            // Note: Acceptance tab usually implies NEW status, but keeping flexibility
         }

         if (advancedFilters.source.length > 0) {
            if (!advancedFilters.source.includes(w.lead.source)) return false;
         }

         if (advancedFilters.ownerId.length > 0) {
            if (!w.lead.ownerId || !advancedFilters.ownerId.includes(w.lead.ownerId)) return false;
         }

         // 3. Date Filter (Check CreatedAt for Acceptance, LastInteraction for Interaction Tab?)
         // Usually Date Filter applies to 'createdAt' or the event time. 
         // Let's apply to 'createdAt' for now as standard.
         if (dateRange.startDate) {
            if (!isDateInRange(w.lead.createdAt)) return false;
         }

         return true;
      });
   }, [activeTab, acceptanceList, interactionList, searchTerm, advancedFilters, dateRange, user]);

   const handleUpdate = (updatedLead: ILead) => {
      saveLead(updatedLead);
      const newLeads = leads.map(l => l.id === updatedLead.id ? updatedLead : l);
      setLeads(newLeads);
      const newWarnings = calculateSLAWarnings(newLeads, undefined, slaConfig);
      setWarnings(newWarnings);
      setSelectedLead(null);
   };

   // Toggle Filter Helper
   const toggleAdvancedFilter = (key: keyof typeof advancedFilters, value?: string) => {
      setAdvancedFilters(prev => {
         // Handle Boolean Toggles (Mutually Exclusive for pipeline/unassigned)
         if (typeof prev[key] === 'boolean') {
            const newState = !prev[key];

            // Mutual Exclusivity Logic
            if (key === 'myPipeline' && newState) {
               return { ...prev, myPipeline: true, unassigned: false };
            }
            if (key === 'unassigned' && newState) {
               return { ...prev, unassigned: true, myPipeline: false };
            }

            return { ...prev, [key]: newState };
         }

         // Handle Array Toggles
         if (Array.isArray(prev[key]) && value) {
            const arr = prev[key] as string[];
            return {
               ...prev,
               [key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value]
            };
         }
         return prev;
      });
   };

   // Quick Accept Action
   const handleQuickAccept = (lead: ILead) => {
      const updatedLead: ILead = {
         ...lead,
         status: 'CONTACTED',
         ownerId: (!lead.ownerId || lead.ownerId === 'system') ? (user?.id || 'u1') : lead.ownerId,
         activities: [
            {
               id: `act-${Date.now()}`,
               type: 'system',
               title: 'Tiếp nhận Lead',
               timestamp: new Date().toISOString(),
               description: 'Đã nhận lead từ danh sách SLA',
               user: user?.name || 'User'
            },
            ...(lead.activities || [])
         ],
         lastInteraction: new Date().toISOString()
      };
      handleUpdate(updatedLead);
   };

   const getRepInfo = (id?: string) => {
      if (!id) return { name: '-', color: '', avatar: '?', team: '' };
      return SALES_REPS.find(r => r.id === id) || { name: 'Unknown', color: 'bg-gray-100', avatar: '?', team: '' };
   };

   const getTypeBadge = (type: string) => {
      switch (type) {
         case 'not_acknowledged':
         case 'new_lead':
            return <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">Chưa nhận</span>;
         case 'slow_interaction':
            return <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">Chậm chăm sóc (Mới)</span>;
         case 'neglected_interaction':
            return <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">Bỏ quên (Cũ)</span>;
         case 'overdue_appointment':
            return <span className="bg-pink-100 text-pink-700 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">Lỡ hẹn</span>;
         case 'manual_sla':
            return <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">Yêu cầu xử lý</span>;
         default:
            return <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">Khác</span>;
      }
   };

   // Unique Values for Filters
   const uniqueSources = useMemo(() => Array.from(new Set(leads.map(l => l.source).filter(Boolean))), [leads]);
   const uniqueStatuses = useMemo(() => Array.from(new Set(leads.map(l => l.status).filter(Boolean))), [leads]);

   return (
      <div className="flex flex-col min-h-full bg-[#f8fafc] text-[#0d141b] font-sans">
         <div className="flex flex-col flex-1 p-6 lg:p-8 max-w-[1400px] mx-auto w-full gap-6">

            {/* Header */}
            <div className="flex flex-wrap justify-between items-center gap-4">
               <div className="flex flex-col gap-1">
                  <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                     <ListTodo className="text-blue-600" /> Danh sách Lead cần xử lý (SLA)
                  </h1>
                  <p className="text-slate-500 text-sm">Quản lý các lead đang bị chậm tiến độ hoặc quá hạn xử lý.</p>
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
                  <div className="flex justify-between items-center mb-6">
                     <h3 className="font-bold text-lg text-slate-800">Cấu hình thời gian SLA</h3>
                     <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                     <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Thời gian nhận Lead (Phút)</label>
                        <div className="flex items-center gap-3">
                           <input
                              type="number"
                              className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-center font-bold"
                              value={slaConfig.ackTimeMinutes}
                              onChange={(e) => setSlaConfig({ ...slaConfig, ackTimeMinutes: parseInt(e.target.value) || 0 })}
                           />
                           <span className="text-slate-500 text-xs">Quá hạn &rarr; <span className="text-red-600 font-bold">Chưa nhận</span></span>
                        </div>
                     </div>
                     <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Tương tác đầu tiên (Phút)</label>
                        <div className="flex items-center gap-3">
                           <input
                              type="number"
                              className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-center font-bold"
                              value={slaConfig.firstActionTimeMinutes}
                              onChange={(e) => setSlaConfig({ ...slaConfig, firstActionTimeMinutes: parseInt(e.target.value) || 0 })}
                           />
                           <span className="text-slate-500 text-xs">Lead mới nhận nhưng chưa làm gì</span>
                        </div>
                     </div>
                     <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Chu kỳ chăm sóc (Giờ)</label>
                        <div className="flex items-center gap-3">
                           <input
                              type="number"
                              className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-center font-bold"
                              value={slaConfig.maxNeglectTimeHours}
                              onChange={(e) => setSlaConfig({ ...slaConfig, maxNeglectTimeHours: parseInt(e.target.value) || 0 })}
                           />
                           <span className="text-slate-500 text-xs">Quá hạn &rarr; <span className="text-orange-600 font-bold">Bỏ quên</span></span>
                        </div>
                     </div>
                  </div>
               </div>
            )}

            {/* TAB NAVIGATION */}
            <div className="flex gap-6 border-b border-slate-200">
               <button
                  onClick={() => setActiveTab('Acceptance')}
                  className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${activeTab === 'Acceptance'
                     ? 'border-red-600 text-red-600'
                     : 'border-transparent text-slate-500 hover:text-slate-700'
                     }`}
               >
                  <AlertCircle size={18} />
                  Chờ tiếp nhận
                  <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === 'Acceptance' ? 'bg-red-100 text-red-700' : 'bg-slate-100'}`}>
                     {acceptanceList.length}
                  </span>
               </button>
               <button
                  onClick={() => setActiveTab('Interaction')}
                  className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${activeTab === 'Interaction'
                     ? 'border-amber-600 text-amber-600'
                     : 'border-transparent text-slate-500 hover:text-slate-700'
                     }`}
               >
                  <History size={18} />
                  Cần chăm sóc / Tương tác
                  <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === 'Interaction' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100'}`}>
                     {interactionList.length}
                  </span>
               </button>
            </div>

            {/* TOOLBAR: Search & Filters */}
            <div className="flex flex-wrap items-center justify-between gap-3">
               {/* Search */}
               <div className="relative flex-1 min-w-[240px] max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                     type="text"
                     placeholder="Tìm tên, số điện thoại..."
                     className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                  />
               </div>

               <div className="flex items-center gap-2">
                  {/* Date Filter */}
                  <AdvancedDateFilter onChange={setDateRange} label="Ngày tạo" />

                  {/* Advanced Filter Dropdown */}
                  <div className="relative" ref={filterRef}>
                     <button
                        onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-bold transition-all shadow-sm ${showFilterDropdown || (advancedFilters.myPipeline || advancedFilters.unassigned || advancedFilters.status.length > 0)
                           ? 'bg-blue-50 text-blue-700 border-blue-200'
                           : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                           }`}
                     >
                        <Filter size={16} />
                        Bộ lọc
                        <ChevronDown size={14} />
                     </button>

                     {showFilterDropdown && (
                        <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-slate-200 z-50 p-2 animate-in fade-in zoom-in-95 origin-top-right">
                           <div className="p-2 border-b border-slate-100 mb-1">
                              <h4 className="text-xs font-bold text-slate-400 uppercase">Lọc nhanh</h4>
                           </div>
                           <div className="space-y-1 mb-2">
                              <button
                                 onClick={() => toggleAdvancedFilter('myPipeline')}
                                 className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-slate-50 text-sm text-slate-700"
                              >
                                 <span>Lead của tôi</span>
                                 {advancedFilters.myPipeline && <Check size={14} className="text-blue-600" />}
                              </button>
                              <button
                                 onClick={() => toggleAdvancedFilter('unassigned')}
                                 className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-slate-50 text-sm text-slate-700"
                              >
                                 <span>Chưa phân công</span>
                                 {advancedFilters.unassigned && <Check size={14} className="text-blue-600" />}
                              </button>
                           </div>

                           {activeTab === 'Interaction' && (
                              <>
                                 <div className="p-2 border-b border-slate-100 border-t mt-2 mb-1">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase">Trạng thái</h4>
                                 </div>
                                 <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                                    {uniqueStatuses.map(status => (
                                       <button
                                          key={status}
                                          onClick={() => toggleAdvancedFilter('status', status)}
                                          className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-slate-50 text-sm text-slate-700"
                                       >
                                          <span className="truncate">{status}</span>
                                          {advancedFilters.status.includes(status) && <Check size={14} className="text-blue-600" />}
                                       </button>
                                    ))}
                                 </div>
                              </>
                           )}

                           <div className="p-2 border-b border-slate-100 border-t mt-2 mb-1">
                              <h4 className="text-xs font-bold text-slate-400 uppercase">Nguồn Lead</h4>
                           </div>
                           <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                              {uniqueSources.map(src => (
                                 <button
                                    key={src}
                                    onClick={() => toggleAdvancedFilter('source', src)}
                                    className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-slate-50 text-sm text-slate-700"
                                 >
                                    <span className="truncate">{src}</span>
                                    {advancedFilters.source.includes(src) && <Check size={14} className="text-blue-600" />}
                                 </button>
                              ))}
                           </div>
                        </div>
                     )}
                  </div>
               </div>
            </div>

            {/* Lead List Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
               <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200">
                     <tr>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Họ tên & Nguồn</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Sale phụ trách</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Vấn đề (Issue)</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Thời gian trễ</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Hành động</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {filteredList.map((warning, idx) => {
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
                              <td className="px-6 py-4 w-[30%]">
                                 <div className="flex flex-col gap-1 items-start">
                                    {getTypeBadge(warning.type)}
                                    <span className="text-xs text-slate-500 mt-1">{warning.message}</span>
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
                                    {activeTab === 'Acceptance' && (
                                       <button
                                          onClick={(e) => { e.stopPropagation(); handleQuickAccept(warning.lead); }}
                                          className="inline-flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm font-bold shadow-sm transition-all whitespace-nowrap"
                                          title="Nhận Lead ngay"
                                       >
                                          <UserCheck size={14} /> Nhận
                                       </button>
                                    )}
                                    {activeTab === 'Interaction' && (
                                       <button
                                          onClick={(e) => { e.stopPropagation(); setSelectedLead(warning.lead); }}
                                          className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm font-bold shadow-sm transition-all whitespace-nowrap"
                                          title="Xử lý / Tương tác"
                                       >
                                          <MessageSquare size={14} /> Xử lý
                                       </button>
                                    )}


                                 </div>
                              </td>
                           </tr>
                        );
                     })}

                     {/* EMPTY STATE */}
                     {filteredList.length === 0 && (
                        <tr>
                           <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                              <div className="flex flex-col items-center gap-3">
                                 <CheckCircle2 size={48} className="text-green-500 opacity-50" />
                                 <p>Tuyệt vời! Không có lead nào cần xử lý trong mục này.</p>
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
            lead={selectedLead || {} as ILead}
            onUpdate={handleUpdate}
         />
      </div >
   );
};

export default SLALeadList;
