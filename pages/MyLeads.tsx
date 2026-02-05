import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom'; // Add import
import { useAuth } from '../contexts/AuthContext';
import { getLeads, addContact, addDeal, deleteLead, convertLeadToContact } from '../utils/storage';
import { LeadStatus, ILead, IDeal, DealStage } from '../types';
import UnifiedLeadDrawer from '../components/UnifiedLeadDrawer';
import LeadPivotTable from '../components/LeadPivotTable';
import SLABadge from '../components/SLABadge';
import OdooSearchBar, { SearchFilter, SearchFieldConfig } from '../components/OdooSearchBar';
import SLAWarningBanner from '../components/SLAWarningBanner';
import { buildDomainFromFilters, applyDomainFilter, getGroupByFields } from '../utils/filterDomain';
import { calculateSLAWarnings, getUrgentWarningCount } from '../utils/slaUtils';
import {
   Inbox, Search, Phone, Filter, CheckCircle2, Clock,
   ListFilter, Star, Grid, List as ListIcon, ChevronLeft, ChevronRight,
   ChevronDown, ChevronRight as ChevronRightIcon,
   Layout, LayoutGrid, Cog, Download, Archive, Mail, MessageSquare, Trash2,
   UserPlus, Shuffle, XCircle, FileSpreadsheet, Settings
} from 'lucide-react';

const MyLeads: React.FC = () => {
   const { user } = useAuth();
   const navigate = useNavigate();

   // Data State
   const [leads, setLeads] = useState<ILead[]>([]);
   const [searchFilters, setSearchFilters] = useState<SearchFilter[]>([]);
   const [selectedIds, setSelectedIds] = useState<string[]>([]);
   const [statusFilter, setStatusFilter] = useState<string>('all');

   // UI State
   const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
   const [showConfetti, setShowConfetti] = useState(false);

   // Pivot/Group State
   const [groupBy, setGroupBy] = useState<'none' | 'source' | 'status' | 'program' | 'city'>('none');
   const [viewMode, setViewMode] = useState<'list' | 'pivot'>('list');
   const [filterType, setFilterType] = useState('all');

   // Drawer State
   const [selectedLead, setSelectedLead] = useState<ILead | null>(null);

   // Column Management
   const ALL_COLUMNS = [
      { id: 'actions', label: 'Hành động' },
      { id: 'opportunity', label: 'Cơ hội' },
      { id: 'contact', label: 'Họ tên & SĐT' },
      { id: 'email', label: 'Email' },
      { id: 'city', label: 'Địa chỉ (TP)' },
      { id: 'company', label: 'Cơ sở' },
      { id: 'source', label: 'Nguồn' },
      { id: 'campaign', label: 'Chiến dịch' },
      { id: 'salesperson', label: 'Sale' },
      { id: 'tags', label: 'Tags' },
      { id: 'title', label: 'Danh xưng' },
      { id: 'full_address', label: 'Địa chỉ chi tiết' },
      { id: 'medium', label: 'Medium' },
      { id: 'referredBy', label: 'Người giới thiệu' },
      { id: 'status', label: 'Trạng thái' },
   ];

   const [visibleColumns, setVisibleColumns] = useState<string[]>([
      'actions', 'opportunity', 'contact', 'city', 'company', 'source', 'salesperson', 'tags', 'status'
   ]);
   const [showColumnDropdown, setShowColumnDropdown] = useState(false);

   const toggleColumn = (columnId: string) => {
      setVisibleColumns(prev =>
         prev.includes(columnId)
            ? (prev.length > 1 ? prev.filter(c => c !== columnId) : prev)
            : [...prev, columnId]
      );
   };

   // Search Field Configurations (Odoo-style)
   const searchFields: SearchFieldConfig[] = [
      // Filters
      { field: 'name', label: 'Tên khách hàng', category: 'Thông tin cơ bản', type: 'filter' },
      { field: 'phone', label: 'Số điện thoại', category: 'Thông tin cơ bản', type: 'filter' },
      { field: 'email', label: 'Email', category: 'Thông tin cơ bản', type: 'filter' },
      { field: 'city', label: 'Thành phố', category: 'Địa điểm', type: 'filter' },
      { field: 'program', label: 'Chương trình', category: 'Chương trình học', type: 'filter' },
      { field: 'source', label: 'Nguồn', category: 'Marketing', type: 'filter' },
      { field: 'status', label: 'Giai đoạn', category: 'Trạng thái', type: 'filter' },
      { field: 'ownerId', label: 'Người phụ trách', category: 'Phân công', type: 'filter' },

      // Group By
      { field: 'status', label: 'Nhóm theo Giai đoạn', category: 'Nhóm dữ liệu', type: 'groupby' },
      { field: 'source', label: 'Nhóm theo Nguồn', category: 'Nhóm dữ liệu', type: 'groupby' },
      { field: 'program', label: 'Nhóm theo Chương trình', category: 'Nhóm dữ liệu', type: 'groupby' },
      { field: 'city', label: 'Nhóm theo Thành phố', category: 'Nhóm dữ liệu', type: 'groupby' },
   ];

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

      // Build domains from filters (Odoo-style)
      const domains = buildDomainFromFilters(searchFilters);

      // Apply domain filtering
      if (domains.length > 0) {
         result = applyDomainFilter(result, domains, (lead) => {
            // Get all searchable text from lead
            return [
               lead.name,
               lead.phone,
               lead.email,
               lead.source,
               lead.program || '',
               lead.status,
               lead.ownerId || '',
               (lead as any).city || '',
               (lead as any).address || '',
               (lead as any).notes || '',
               (lead as any).identityCard || '',
               (lead as any).identityPlace || '',
               (lead as any).company || '',
               ...(lead.productItems || []).map(p => p.name),
               lead.expectedClosingDate || '',
               lead.createdAt || ''
            ].join(' ');
         });
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
   }, [leads, searchFilters, statusFilter, filterType]);

   // Calculate SLA Warnings
   const slaWarnings = useMemo(() => {
      return calculateSLAWarnings(filteredLeads, user?.id);
   }, [filteredLeads, user]);

   // --- ACTIONS LOGIC ---
   const handlePickUp = (e: React.MouseEvent, lead: ILead) => {
      e.stopPropagation();
      const updated = { ...lead, status: LeadStatus.CONTACTED, ownerId: user?.id };
      handleLeadUpdate(updated);
      alert(`Đã tiếp nhận Lead: ${lead.name}`);
   };

   const handleCall = (e: React.MouseEvent, lead: ILead) => {
      e.stopPropagation();
      // Auto-status update to CONTACTED on call
      if (lead.status === LeadStatus.NEW || lead.status === LeadStatus.ASSIGNED) {
         const updated = { ...lead, status: LeadStatus.CONTACTED, ownerId: user?.id };
         handleLeadUpdate(updated);
      }
      window.location.href = `tel:${lead.phone}`;
   };

   const handleMarkLost = (e: React.MouseEvent, lead: ILead) => {
      e.stopPropagation();
      if (confirm("Xác nhận đánh dấu Lead này là Thất bại/Lost?")) {
         const updated = { ...lead, status: DealStage.LOST };
         handleLeadUpdate(updated);
      }
   };

   const handleBulkMarkLost = () => {
      if (confirm(`Đánh dấu ${selectedIds.length} lead là Thất bại?`)) {
         const updatedLeads = leads.map(l => selectedIds.includes(l.id) ? { ...l, status: DealStage.LOST } : l);
         setLeads(updatedLeads);
         // Simulate save
         import('../utils/storage').then(({ saveLeads }) => saveLeads(updatedLeads));
         setSelectedIds([]);
      }
   };

   // Mock Assign (Handover)
   const handleBulkAssign = () => {
      const target = prompt("Nhập tên người nhận bàn giao:");
      if (target) {
         const allLeads = getLeads();
         const updatedAllLeads = allLeads.map(l =>
            selectedIds.includes(l.id) ? { ...l, ownerId: target } : l
         );

         import('../utils/storage').then(({ saveLeads }) => {
            saveLeads(updatedAllLeads);
            // Update local state: remove from "My Leads" since owner changed
            setLeads(prev => prev.filter(l => !selectedIds.includes(l.id)));
            setSelectedIds([]);
            alert(`Đã bàn giao ${selectedIds.length} lead cho ${target}`);
         });
      }
   };


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
            : DealStage.NEW_OPP;

         const computedValue = lead.value || (lead.productItems || []).reduce((sum, item) => {
            return sum + (item.price * item.quantity);
         }, 0);

         const deal: IDeal = {
            id: `D-${Date.now()}`,
            leadId: savedContact.id, // Link to the ACTUAL Contact ID
            title: lead.name + ' - ' + (lead.program || 'General'),
            value: computedValue || 0,
            stage: dealStage,
            ownerId: lead.ownerId || user?.id || 'admin',
            expectedCloseDate: lead.expectedClosingDate || '',
            products: lead.productItems?.map(p => p.name) || [],
            productItems: lead.productItems || [], // Persist full product details
            discount: lead.discount || 0,
            paymentRoadmap: lead.paymentRoadmap || '',
            probability: lead.probability || 20,
            createdAt: new Date().toISOString(),
            activities: [
               {
                  id: `act-${Date.now()}`,
                  type: 'call' as any,
                  content: 'Gọi điện tư vấn lần đầu',
                  timestamp: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                  status: 'scheduled',
                  userId: user?.id || 'admin'
               },
               ...(lead.activities || []).map(a => ({
                  ...a,
                  type: a.type === 'message' ? 'chat' : a.type === 'system' ? 'note' : a.type as any
               }))
            ] as any
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
      if (hours > 24) return 'border-l-4 border-red-500';
      if (hours > 12) return 'border-l-4 border-yellow-500';
      return 'border-l-4 border-transparent';
   };

   // Filter helpers
   const addFilter = (field: string, label: string, value: string, type: 'filter' | 'groupby' = 'filter', color?: string) => {
      const exists = searchFilters.some(f => f.field === field && f.value.toLowerCase() === value.toLowerCase());
      if (!exists && value) {
         setSearchFilters([...searchFilters, { field, label, value, type, color }]);
      }
   };

   const handleClickableField = (e: React.MouseEvent, field: string, label: string, value: string, color?: string) => {
      e.stopPropagation();
      addFilter(field, label, value, 'filter', color);
   };

   const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) {
         setSelectedIds(filteredLeads.map(l => l.id));
      } else {
         setSelectedIds([]);
      }
   };

   // Handle SLA warning click - open drawer with Profile tab
   const handleSLAWarningClick = (lead: ILead) => {
      setSelectedLead(lead);
      // Note: UnifiedLeadDrawer will need to support opening specific tab
   };

   const renderTableRows = (leadList: ILead[]) => (
      leadList.map(lead => {
         // Determine Next Activity
         // @ts-ignore
         const nextActivity = (lead.activities || []).find(a => a.type === 'activity');
         const deadline = lead.expectedClosingDate ? new Date(lead.expectedClosingDate).toLocaleDateString('vi-VN') : '-';

         return (
            <tr key={lead.id}
               className={`hover:bg-blue-50/50 group transition-colors cursor-pointer border-b border-slate-100 last:border-0`}
               onClick={(e) => {
                  if ((e.target as HTMLElement).tagName !== 'INPUT') setSelectedLead(lead);
               }}
            >
               <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={selectedIds.includes(lead.id)} onChange={() => {
                     setSelectedIds(prev => prev.includes(lead.id) ? prev.filter(i => i !== lead.id) : [...prev, lead.id]);
                  }} />
               </td>

               {/* Actions */}
               {visibleColumns.includes('actions') && (
                  <td className="p-2 text-center">
                     <div className="flex items-center justify-center gap-1">
                        <button
                           onClick={(e) => handleCall(e, lead)}
                           className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded"
                           title="Gọi (Tự động chuyển Contacted)"
                        >
                           <Phone size={14} />
                        </button>
                        {(lead.status === LeadStatus.NEW || lead.status === LeadStatus.ASSIGNED) && (
                           <button onClick={(e) => handlePickUp(e, lead)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Tiếp nhận">
                              <CheckCircle2 size={14} />
                           </button>
                        )}
                        <button
                           onClick={(e) => { e.stopPropagation(); handleConvertLead(lead); }}
                           className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded"
                           title="Chuyển đổi thành Deal/Hợp đồng"
                        >
                           <Shuffle size={14} />
                        </button>
                        <button onClick={(e) => handleMarkLost(e, lead)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded" title="Mark Lost">
                           <XCircle size={14} />
                        </button>
                     </div>
                  </td>
               )}

               {visibleColumns.includes('opportunity') && (
                  <td className="p-2">
                     <div className="flex flex-col gap-0.5">
                        <div className="font-bold text-slate-900 group-hover:text-blue-600">{lead.name}</div>
                        {lead.program && (
                           <span className="text-xs text-blue-600 hover:underline">{lead.program}</span>
                        )}
                     </div>
                  </td>
               )}
               {visibleColumns.includes('contact') && (
                  <td className="p-2 text-slate-700">
                     <div className="flex flex-col">
                        <span className="font-semibold">{lead.name}</span>
                        <span className="text-xs text-slate-500">{lead.phone}</span>
                     </div>
                  </td>
               )}
               {visibleColumns.includes('email') && <td className="p-2 text-slate-600 text-xs truncate max-w-[120px]" title={lead.email}>{lead.email || '-'}</td>}
               {visibleColumns.includes('city') && <td className="p-2 text-slate-600 text-xs">{(lead as any).city || '-'}</td>}
               {visibleColumns.includes('company') && <td className="p-2 text-slate-600 text-xs">{(lead as any).company || 'CS Chính'}</td>}
               {visibleColumns.includes('source') && <td className="p-2 text-slate-600 text-xs truncate max-w-[100px]" title={lead.source}>{lead.source || '-'}</td>}
               {visibleColumns.includes('medium') && <td className="p-2 text-slate-600 text-xs truncate max-w-[100px]">{(lead as any).marketingData?.medium || '-'}</td>}
               {visibleColumns.includes('campaign') && <td className="p-2 text-slate-600 text-xs truncate max-w-[100px]">{(lead as any).marketingData?.campaign || '-'}</td>}
               {visibleColumns.includes('referredBy') && <td className="p-2 text-slate-600 text-xs">{(lead as any).referredBy || '-'}</td>}
               {visibleColumns.includes('salesperson') && <td className="p-2 text-slate-600 text-xs font-semibold text-blue-700">{user?.name || 'Tôi'}</td>}
               {visibleColumns.includes('title') && <td className="p-2 text-slate-600 text-xs">{(lead as any).title || '-'}</td>}
               {visibleColumns.includes('full_address') && <td className="p-2 text-slate-600 text-xs truncate max-w-[150px]" title={(lead as any).address}>{(lead as any).address || '-'}</td>}

               {/* Tags */}
               {visibleColumns.includes('tags') && (
                  <td className="p-2">
                     <div className="flex flex-wrap gap-1">
                        {(lead as any).marketingData?.tags?.map((t: string, i: number) => {
                           const colors = [
                              'bg-blue-100 text-blue-800 border-blue-200',
                              'bg-green-100 text-green-800 border-green-200',
                              'bg-purple-100 text-purple-800 border-purple-200',
                              'bg-orange-100 text-orange-800 border-orange-200',
                              'bg-pink-100 text-pink-800 border-pink-200',
                              'bg-teal-100 text-teal-800 border-teal-200'
                           ];
                           const colorClass = colors[t.charCodeAt(0) % colors.length] || colors[0];
                           return (
                              <span key={i} className={`text-[10px] px-2 py-0.5 rounded border ${colorClass} font-bold whitespace-nowrap`}>{t}</span>
                           );
                        }) || '-'}
                     </div>
                  </td>
               )}

               {visibleColumns.includes('status') && (
                  <td className="p-2 text-center">
                     <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase cursor-pointer hover:opacity-80 ${lead.status === LeadStatus.NEW ? 'bg-blue-100 text-blue-700' :
                           lead.status === LeadStatus.QUALIFIED ? 'bg-cyan-100 text-cyan-700' :
                              lead.status === 'CONTACTED' ? 'bg-purple-100 text-purple-700' :
                                 lead.status === DealStage.LOST ? 'bg-red-100 text-red-700' :
                                    'bg-slate-100 text-slate-600'
                           }`}
                        onClick={(e) => handleClickableField(e, 'status', 'Trạng thái', lead.status)}
                     >
                        {lead.status}
                     </span>
                  </td>
               )}
            </tr>
         );
      })
   );

   return (
      <div className="flex flex-col h-full bg-[#f8fafc] font-sans text-slate-900 relative max-w-[1400px] mx-auto">

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

            <OdooSearchBar
               filters={searchFilters}
               onAddFilter={(filter) => setSearchFilters([...searchFilters, filter])}
               onRemoveFilter={(index) => setSearchFilters(searchFilters.filter((_, i) => i !== index))}
               onClearAll={() => setSearchFilters([])}
               searchFields={searchFields}
            />

            <div className="relative ml-4">
               <button
                  onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                  className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-slate-200 bg-white shadow-sm transition-colors"
                  title="Tùy chỉnh cột"
               >
                  <Settings size={20} />
               </button>
               {showColumnDropdown && (
                  <>
                     <div className="fixed inset-0 z-40" onClick={() => setShowColumnDropdown(false)}></div>
                     <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-lg shadow-xl z-50 p-2 animate-in zoom-in-95">
                        <div className="text-[10px] font-bold text-slate-400 uppercase px-2 mb-2">Hiển thị cột</div>
                        <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
                           {ALL_COLUMNS.map(col => (
                              <label key={col.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer">
                                 <input
                                    type="checkbox"
                                    checked={visibleColumns.includes(col.id)}
                                    onChange={() => toggleColumn(col.id)}
                                    className="rounded border-slate-300 text-blue-600"
                                 />
                                 <span className="text-xs font-medium text-slate-700">{col.label}</span>
                              </label>
                           ))}
                        </div>
                     </div>
                  </>
               )}
            </div>
         </div>

         {/* ACTION & PIVOT BAR */}
         <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex items-center gap-3">
            {selectedIds.length > 0 ? (
               <div className="flex items-center gap-4 animate-in slide-in-from-left-2">
                  <span className="text-sm font-medium text-slate-700">
                     <span className="font-bold text-blue-600">{selectedIds.length}</span> đã chọn
                  </span>

                  <div className="relative">
                     <div className="flex bg-white rounded-lg shadow-sm border border-slate-300 overflow-hidden divide-x divide-slate-200">
                        <button onClick={handleBulkAssign} className="px-3 py-1.5 text-slate-700 hover:bg-slate-50 flex items-center gap-2 text-sm font-medium" title="Bàn giao">
                           <UserPlus size={16} /> <span className="hidden md:inline">Assign</span>
                        </button>
                        <button onClick={() => alert('Chức năng Convert hàng loạt đang phát triển')} className="px-3 py-1.5 text-slate-700 hover:bg-slate-50 flex items-center gap-2 text-sm font-medium" title="Chuyển đổi">
                           <Shuffle size={16} /> <span className="hidden md:inline">Convert</span>
                        </button>
                        <button onClick={handleBulkMarkLost} className="px-3 py-1.5 text-slate-700 hover:bg-red-50 hover:text-red-600 flex items-center gap-2 text-sm font-medium" title="Mark Lost">
                           <XCircle size={16} /> <span className="hidden md:inline">Mark Lost</span>
                        </button>
                        <button onClick={() => {
                           if (confirm(`Xóa ${selectedIds.length} lead đã chọn?`)) {
                              const newLeads = leads.filter(l => !selectedIds.includes(l.id));
                              setLeads(newLeads);
                              setSelectedIds([]);
                           }
                        }} className="px-3 py-1.5 text-red-600 hover:bg-red-50 flex items-center gap-2 text-sm font-medium" title="Xóa">
                           <Trash2 size={16} />
                        </button>
                        <button className="px-3 py-1.5 text-slate-700 hover:bg-slate-50 flex items-center gap-2 text-sm font-medium" onClick={() => setShowConfetti(true)} title="Xuất Excel">
                           <FileSpreadsheet size={16} />
                        </button>
                     </div>
                  </div>

                  {/* Backdrop for menu */}
                  {isActionMenuOpen && (
                     <div className="fixed inset-0 z-40" onClick={() => setIsActionMenuOpen(false)}></div>
                  )}
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
                        <th className="w-10 p-3 border-r border-slate-200 text-center">
                           <input
                              type="checkbox"
                              className="rounded border-slate-300"
                              onChange={handleSelectAll}
                              checked={selectedIds.length === filteredLeads.length && filteredLeads.length > 0}
                           />
                        </th>
                        {visibleColumns.includes('actions') && <th className="p-3 border-r border-slate-200 w-24 text-center">Actions</th>}
                        {visibleColumns.includes('opportunity') && <th className="p-3 border-r border-slate-200 min-w-[150px]">Cơ hội</th>}
                        {visibleColumns.includes('contact') && <th className="p-3 border-r border-slate-200 w-40">Liên hệ</th>}
                        {visibleColumns.includes('email') && <th className="p-3 border-r border-slate-200 w-40">Email</th>}
                        {visibleColumns.includes('city') && <th className="p-3 border-r border-slate-200 w-32">Địa chỉ</th>}
                        {visibleColumns.includes('company') && <th className="p-3 border-r border-slate-200 w-32">Cơ sở</th>}
                        {visibleColumns.includes('source') && <th className="p-3 border-r border-slate-200 w-28">Nguồn</th>}
                        {visibleColumns.includes('campaign') && <th className="p-3 border-r border-slate-200 w-32">Chiến dịch</th>}
                        {visibleColumns.includes('salesperson') && <th className="p-3 border-r border-slate-200 w-28">Sale</th>}
                        {visibleColumns.includes('tags') && <th className="p-3 border-r border-slate-200 w-32">Tags</th>}
                        {visibleColumns.includes('status') && <th className="p-3 border-slate-200 w-32 text-center">Trạng thái</th>}
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
