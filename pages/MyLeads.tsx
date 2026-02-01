
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom'; // Add import
import { useAuth } from '../contexts/AuthContext';
import { getLeads, addContact, addDeal, deleteLead, convertLeadToContact } from '../utils/storage';
import { LeadStatus, ILead, IDeal, DealStage } from '../types';
import UnifiedLeadDrawer from '../components/UnifiedLeadDrawer';
import LeadPivotTable from '../components/LeadPivotTable';
import SLABadge from '../components/SLABadge';
import {
   Inbox, Search, Phone, Filter, CheckCircle2, Clock,
   ListFilter, Star, Grid, List as ListIcon, ChevronLeft, ChevronRight,
   ChevronDown, ChevronRight as ChevronRightIcon,
   Layout, LayoutGrid
} from 'lucide-react';

const MyLeads: React.FC = () => {
   const { user } = useAuth();
   const navigate = useNavigate(); // Init hook

   // Data State
   const [leads, setLeads] = useState<ILead[]>([]);
   const [searchTerm, setSearchTerm] = useState('');
   const [selectedIds, setSelectedIds] = useState<string[]>([]);
   const [statusFilter, setStatusFilter] = useState<string>('all');

   // Pivot/Group State
   const [groupBy, setGroupBy] = useState<'none' | 'source' | 'status' | 'program' | 'city'>('none');
   const [viewMode, setViewMode] = useState<'list' | 'pivot'>('list');
   const [filterType, setFilterType] = useState('all');

   // Drawer State
   const [selectedLead, setSelectedLead] = useState<ILead | null>(null);

   useEffect(() => {
      const allLeads = getLeads();
      const myActiveLeads = allLeads.filter(l =>
         l.ownerId === user?.id &&
         l.status !== LeadStatus.CONVERTED &&
         l.status !== LeadStatus.DISQUALIFIED
      );
      setLeads(myActiveLeads);
   }, [user]);

   const filteredLeads = useMemo(() => {
      let result = leads;
      if (searchTerm) {
         result = result.filter(l =>
            l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            l.phone.includes(searchTerm)
         );
      }
      if (statusFilter !== 'all') {
         result = result.filter(l => l.status === statusFilter);
      }

      // Advanced Filters
      if (filterType === 'no-activity') {
         result = result.filter(l => !l.activities || l.activities.length === 0);
      } else if (filterType === 'high-value') {
         result = result.filter(l => (l.value || 0) > 50000000);
      }

      return result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
   }, [leads, searchTerm, statusFilter, filterType]);

   // Handle Updates from Drawer
   const handleLeadUpdate = (updatedLead: ILead) => {
      // 1. Update UI State
      const newLeads = leads.map(l => l.id === updatedLead.id ? updatedLead : l);
      setLeads(newLeads);

      // 2. Persist to Storage
      const allLeads = getLeads(); // Fetch fresh data
      const index = allLeads.findIndex(l => l.id === updatedLead.id);
      if (index !== -1) {
         allLeads[index] = updatedLead;
         import('../utils/storage').then(({ saveLeads }) => saveLeads(allLeads));
      }
   };

   // Handle Convert
   const handleConvertLead = (lead: ILead) => {
      try {
         const contact = convertLeadToContact(lead);
         const savedContact = addContact(contact); // Capture saved contact

         const dealStage = Object.values(DealStage).includes(lead.status as DealStage)
            ? (lead.status as DealStage)
            : DealStage.DEEP_CONSULTING;

         const deal: IDeal = {
            id: `D-${Date.now()}`,
            leadId: savedContact.id, // Link to the ACTUAL Contact ID
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

         navigate(`/pipeline?newDeal=${deal.id}`);
      } catch (error) {
         console.error("Convert Error", error);
         alert("Có lỗi xảy ra khi chuyển đổi Lead!");
      }
   };

   // Grouping Logic
   const groupedLeads = useMemo(() => {
      // ... existing logic ...
      if (groupBy === 'none') return { 'All': filteredLeads };

      return filteredLeads.reduce((groups, lead) => {
         let key = 'Khác';
         if (groupBy === 'source') key = lead.source || 'Chưa xác định';
         else if (groupBy === 'status') key = lead.status;
         else if (groupBy === 'program') key = lead.program || 'Chưa có chương trình';
         else if (groupBy === 'city') key = (lead as any).city || 'Chưa cập nhật TP';

         if (!groups[key]) groups[key] = [];
         groups[key].push(lead);
         return groups;
      }, {} as Record<string, ILead[]>);
   }, [filteredLeads, groupBy]);

   const currentSLAStatus = (created: string) => {
      const diff = new Date().getTime() - new Date(created).getTime();
      const hours = diff / (1000 * 60 * 60);
      if (hours > 24) return 'bg-red-50 border-l-4 border-red-500';
      if (hours > 12) return 'bg-yellow-50 border-l-4 border-yellow-500';
      return 'border-l-4 border-transparent';
   };

   const renderTableRows = (leadList: ILead[]) => (
      leadList.map(lead => {
         // Determine Next Activity
         // @ts-ignore
         const nextActivity = (lead.activities || []).find(a => a.type === 'activity');
         const deadline = lead.expectedClosingDate ? new Date(lead.expectedClosingDate).toLocaleDateString('vi-VN') : '-';

         return (
            <tr key={lead.id}
               className={`hover:bg-blue-50/50 group transition-colors cursor-pointer border-b border-slate-100 last:border-0 ${currentSLAStatus(lead.createdAt)}`}
               onClick={(e) => {
                  if ((e.target as HTMLElement).tagName !== 'INPUT') setSelectedLead(lead);
               }}
            >
               <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={selectedIds.includes(lead.id)} onChange={() => {
                     setSelectedIds(prev => prev.includes(lead.id) ? prev.filter(i => i !== lead.id) : [...prev, lead.id]);
                  }} />
               </td>
               <td className="p-2">
                  <div className="font-bold text-slate-900 group-hover:text-blue-600">{lead.name} {lead.program ? `- ${lead.program}` : ''}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{lead.source}</div>
               </td>
               <td className="p-2 text-slate-700">{lead.name}</td>
               <td className="p-2 text-slate-600 truncate max-w-[150px]" title={lead.email}>{lead.email || '-'}</td>
               <td className="p-2 text-slate-600 font-mono text-xs">{lead.phone}</td>

               {/* Next Activity */}
               <td className="p-2">
                  {nextActivity ? (
                     <div className="flex items-center gap-2 text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-1 rounded max-w-fit">
                        <Clock size={12} /> {nextActivity.description.split(':')[0] || 'Lịch hẹn'}
                     </div>
                  ) : (
                     <div className="text-xs text-slate-300 italic">--</div>
                  )}
               </td>

               {/* Deadline */}
               <td className="p-2 text-xs font-bold text-red-600">
                  {deadline}
               </td>

               <td className="p-2 text-right font-mono text-xs text-slate-700">
                  {(lead as any).value ? new Intl.NumberFormat('vi-VN').format((lead as any).value) : '0'}
               </td>
               <td className="p-2 text-center">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${lead.status === LeadStatus.NEW ? 'bg-blue-50 text-blue-600 border-blue-200' :
                     lead.status === LeadStatus.QUALIFIED ? 'bg-green-50 text-green-600 border-green-200' :
                        lead.status === LeadStatus.CONTACTED ? 'bg-yellow-50 text-yellow-600 border-yellow-200' :
                           'bg-slate-50 text-slate-500 border-slate-200'
                     }`}>
                     {lead.status}
                  </span>
               </td>
            </tr>
         );
      })
   );

   return (
      <div className="flex flex-col h-full bg-[#f8fafc] font-sans text-slate-900 relative">

         {/* TOOLBAR */}
         <div className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-10 shadow-sm flex justify-between items-center">
            <div className="flex items-center gap-4">
               <h1 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                  <Inbox size={20} className="text-blue-600" /> Lead của tôi
               </h1>
               <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
                  {['all', LeadStatus.NEW, LeadStatus.CONTACTED].map(s => (
                     <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1 text-sm rounded-md font-bold transition-colors ${statusFilter === s ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                        {s === 'all' ? 'Tất cả' : s}
                     </button>
                  ))}
               </div>
            </div>

            <div className="relative w-64">
               <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
               <input type="text" placeholder="Tìm kiếm..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-none" />
            </div>
         </div>

         {/* ACTION & PIVOT BAR */}
         <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex items-center gap-3">
            {selectedIds.length > 0 ? (
               <div className="flex items-center gap-2 animate-in slide-in-from-left-2">
                  <button className="btn-xs bg-white border border-slate-300">Email ({selectedIds.length})</button>
                  <div className="h-4 w-px bg-slate-300 mx-2"></div>
                  <button className="btn-xs bg-white border border-slate-300 text-red-600">Xóa</button>
               </div>
            ) : (
               <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
                  <div className="flex items-center gap-2 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">
                     <Filter size={14} className="text-blue-600" />
                     <span>Bộ lọc:</span>
                     <select className="bg-transparent outline-none font-bold text-slate-700" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                        <option value="all">Tất cả</option>
                        <option value="no-activity">Chưa có hoạt động</option>
                        <option value="high-value">Giá trị cao (&gt; 50tr)</option>
                     </select>
                  </div>
                  <div className="flex items-center gap-2 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">
                     <ListFilter size={14} className="text-blue-600" />
                     <span>Nhóm theo:</span>
                     <select className="bg-transparent outline-none font-bold text-slate-700" value={groupBy} onChange={(e) => setGroupBy(e.target.value as any)}>
                        <option value="none">Không nhóm (Danh sách phẳng)</option>
                        <option value="source">Nguồn Lead</option>
                        <option value="status">Trạng thái</option>
                        <option value="program">Chương trình</option>
                        <option value="city">Thành phố</option>
                     </select>
                  </div>
                  <div className="h-4 w-px bg-slate-300 mx-2"></div>
                  <div className="flex bg-white p-0.5 rounded border border-slate-200 shadow-sm">
                     <button onClick={() => setViewMode('list')} className={`p-1 rounded ${viewMode === 'list' ? 'bg-slate-100 text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`} title="Danh sách"><ListIcon size={14} /></button>
                     <button onClick={() => setViewMode('pivot')} className={`p-1 rounded ${viewMode === 'pivot' ? 'bg-slate-100 text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`} title="Báo cáo Pivot"><LayoutGrid size={14} /></button>
                  </div>
               </div>
            )}

            <div className="ml-auto text-xs text-slate-500 font-mono">
               Tổng số: <span className="font-bold text-slate-900">{filteredLeads.length}</span> records
            </div>
         </div>

         {/* DATA GRID */}
         <div className="flex-1 overflow-auto bg-white custom-scrollbar relative">
            {viewMode === 'pivot' ? (
               <div className="p-4 h-full overflow-auto animate-in fade-in">
                  <LeadPivotTable leads={filteredLeads} />
               </div>
            ) : (
               <table className="w-full text-left border-collapse text-sm">
                  <thead className="bg-slate-50 sticky top-0 z-1 shadow-sm text-xs font-bold text-slate-500 uppercase">
                     <tr>
                        <th className="w-10 p-3 border-r border-slate-200 text-center">#</th>
                        <th className="p-3 border-r border-slate-200 min-w-[200px]">Cơ hội</th>
                        <th className="p-3 border-r border-slate-200 w-48">Liên hệ</th>
                        <th className="p-3 border-r border-slate-200 w-48">Email</th>
                        <th className="p-3 border-r border-slate-200 w-32">SĐT</th>
                        <th className="p-3 border-r border-slate-200 w-40">Hoạt động</th>
                        <th className="p-3 border-r border-slate-200 w-24">Hạn chót</th>
                        <th className="p-3 border-r border-slate-200 w-32 text-right">Giá trị Deal</th>
                        <th className="p-3 border-slate-200 w-32 text-center">Trạng thái</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {groupBy === 'none' ? renderTableRows(filteredLeads) : (
                        Object.entries(groupedLeads).map(([groupName, items]) => (
                           <React.Fragment key={groupName}>
                              <tr className="bg-slate-100 border-y border-slate-200">
                                 <td colSpan={9} className="px-4 py-2 font-bold text-slate-700 text-xs uppercase flex items-center gap-2">
                                    <ChevronDown size={14} /> {groupName}
                                    <span className="bg-slate-200 px-2 py-0.5 rounded-full text-[10px]">{items.length}</span>
                                 </td>
                              </tr>
                              {renderTableRows(items)}
                           </React.Fragment>
                        ))
                     )}
                  </tbody>
               </table>
            )}
         </div>

         {/* UNIFIED DRAWER */}
         {selectedLead && (
            <UnifiedLeadDrawer
               isOpen={!!selectedLead}
               lead={selectedLead}
               onClose={() => setSelectedLead(null)}
               onUpdate={handleLeadUpdate}
               onConvert={handleConvertLead}
            />
         )}
      </div>
   );
};

export default MyLeads;
