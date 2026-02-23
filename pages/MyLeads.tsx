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
   UserPlus, Shuffle, XCircle, FileSpreadsheet, Settings, Calendar, Users
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
      'opportunity', 'contact', 'email', 'company', 'source', 'status'
   ]);
   const [showColumnDropdown, setShowColumnDropdown] = useState(false);
   const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);

   // --- TIME RANGE FILTER STATE ---
   const [showTimePicker, setShowTimePicker] = useState(false);
   const [timeFilterField, setTimeFilterField] = useState<'createdAt' | 'expectedClosingDate'>('createdAt');
   const [timeRangeType, setTimeRangeType] = useState<string>('all');
   const [customRange, setCustomRange] = useState<{ start: string; end: string } | null>(null);

   const timePresets = [
      { id: 'all', label: 'Tất cả thời gian' },
      { id: 'today', label: 'Hôm nay' },
      { id: 'yesterday', label: 'Hôm qua' },
      { id: 'thisWeek', label: 'Tuần này' },
      { id: 'last7Days', label: '7 ngày qua' },
      { id: 'last30Days', label: '30 ngày qua' },
      { id: 'thisMonth', label: 'Tháng này' },
      { id: 'lastMonth', label: 'Tháng trước' },
      { id: 'custom', label: 'Tùy chỉnh khoảng...' },
   ];

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
               (Array.isArray(lead.productItems) ? lead.productItems : []).map(p => p.name),
               lead.expectedClosingDate || '',
               lead.createdAt || ''
            ].join(' ');
         });
      }

      if (statusFilter !== 'all') {
         result = result.filter(l => l.status === statusFilter);
      }

      // --- TIME RANGE FILTERING ---
      if (timeRangeType !== 'all') {
         const now = new Date();
         const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

         result = result.filter(lead => {
            const dateStr = lead[timeFilterField];
            if (!dateStr) return false;
            const itemDate = new Date(dateStr);

            if (timeRangeType === 'today') {
               return itemDate >= startOfDay;
            }
            if (timeRangeType === 'yesterday') {
               const yesterday = new Date(startOfDay);
               yesterday.setDate(yesterday.getDate() - 1);
               return itemDate >= yesterday && itemDate < startOfDay;
            }
            if (timeRangeType === 'thisWeek') {
               const day = now.getDay() || 7; // Monday is 1
               const monday = new Date(startOfDay);
               monday.setDate(monday.getDate() - day + 1);
               return itemDate >= monday;
            }
            if (timeRangeType === 'last7Days') {
               const last7 = new Date(startOfDay);
               last7.setDate(last7.getDate() - 7);
               return itemDate >= last7;
            }
            if (timeRangeType === 'last30Days') {
               const last30 = new Date(startOfDay);
               last30.setDate(last30.getDate() - 30);
               return itemDate >= last30;
            }
            if (timeRangeType === 'thisMonth') {
               return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
            }
            if (timeRangeType === 'lastMonth') {
               const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
               const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
               return itemDate >= lastMonth && itemDate < thisMonth;
            }
            if (timeRangeType === 'custom' && customRange?.start && customRange?.end) {
               const start = new Date(customRange.start);
               const end = new Date(customRange.end);
               end.setHours(23, 59, 59, 999);
               return itemDate >= start && itemDate <= end;
            }
            return true;
         });
      }

      // Advanced Filters
      if (filterType === 'no-activity') {
         result = result.filter(l => !l.activities || l.activities.length === 0);
      } else if (filterType === 'high-value') {
         result = result.filter(l => (l.value || 0) > 50000000);
      }

      return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
   }, [leads, searchFilters, statusFilter, filterType, timeRangeType, timeFilterField, customRange]);

   // Calculate SLA Warnings
   const slaWarnings = useMemo(() => {
      return calculateSLAWarnings(filteredLeads, user?.id);
   }, [filteredLeads, user]);

   // --- ACTIONS LOGIC ---
   const handlePickUp = (e: React.MouseEvent, lead: ILead) => {
      e.stopPropagation();
      const now = new Date();
      const createdAt = new Date(lead.createdAt);
      const diffMins = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60));
      const slaMet = diffMins <= 15;

      const pickUpLog: any = {
         id: `act-${Date.now()}`,
         type: 'system',
         timestamp: now.toISOString(),
         title: 'Tiếp nhận Lead',
         description: `Sale ${user?.name || 'Tôi'} đã tiếp nhận Lead. SLA Pick-up: ${slaMet ? 'ĐẠT' : 'VI PHẠM'} (Phản hồi sau ${diffMins} phút).`,
         user: user?.name || 'System'
      };

      const updated = {
         ...lead,
         status: LeadStatus.ASSIGNED,
         ownerId: user?.id,
         pickUpDate: now.toISOString(),
         activities: [pickUpLog, ...(lead.activities || [])]
      };

      handleLeadUpdate(updated);
      alert(`Đã tiếp nhận Lead: ${lead.name}. SLA: ${slaMet ? 'Đạt ✅' : 'Quá hạn ❌'}`);
   };

   const handleCall = (e: React.MouseEvent, lead: ILead) => {
      e.stopPropagation();
      const callLog: any = {
         id: `act-${Date.now()}`,
         type: 'system',
         timestamp: new Date().toISOString(),
         title: 'Thực hiện gọi điện',
         description: `Sale ${user?.name || 'Tôi'} đã thực hiện gọi điện cho khách hàng.`,
         user: user?.name || 'System'
      };

      if (lead.status === LeadStatus.NEW || lead.status === LeadStatus.ASSIGNED) {
         const updated = {
            ...lead,
            status: LeadStatus.CONTACTED,
            ownerId: user?.id,
            activities: [callLog, ...(lead.activities || [])]
         };
         handleLeadUpdate(updated);
      } else {
         const updated = { ...lead, activities: [callLog, ...(lead.activities || [])] };
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

         const productItems = Array.isArray(lead.productItems) ? lead.productItems : [];
         const computedValue = lead.value || productItems.reduce((sum, item) => {
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
               ...(Array.isArray(lead.activities) ? lead.activities : []).map(a => ({
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

   // Handle Bulk Convert
   const handleBulkConvert = () => {
      if (selectedIds.length === 0) {
         alert("Chưa chọn lead!");
         return;
      }

      if (confirm(`Chuyển đổi ${selectedIds.length} lead thành Deal/Hợp đồng?`)) {
         let lastDealId = '';
         const selectedLeads = leads.filter(l => selectedIds.includes(l.id));

         selectedLeads.forEach((lead, index) => {
            try {
               const contact = convertLeadToContact(lead);
               const savedContact = addContact(contact);

               const dealStage = Object.values(DealStage).includes(lead.status as DealStage)
                  ? (lead.status as DealStage)
                  : DealStage.NEW_OPP;

               const productItems = Array.isArray(lead.productItems) ? lead.productItems : [];
               const computedValue = lead.value || productItems.reduce((sum, item) => {
                  return sum + (item.price * item.quantity);
               }, 0);

               const deal: IDeal = {
                  id: `D-${Date.now()}-${index}`,
                  leadId: savedContact.id,
                  title: lead.name + ' - ' + (lead.program || 'General'),
                  value: computedValue || 0,
                  stage: dealStage,
                  ownerId: lead.ownerId || user?.id || 'admin',
                  expectedCloseDate: lead.expectedClosingDate || '',
                  products: lead.productItems?.map(p => p.name) || [],
                  productItems: lead.productItems || [],
                  discount: lead.discount || 0,
                  paymentRoadmap: lead.paymentRoadmap || '',
                  probability: lead.probability || 20,
                  createdAt: new Date().toISOString(),
                  activities: [
                     {
                        id: `act-${Date.now()}-${index}`,
                        type: 'call' as any,
                        content: 'Gọi điện tư vấn lần đầu',
                        timestamp: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                        status: 'scheduled',
                        userId: user?.id || 'admin'
                     }
                  ] as any
               };
               addDeal(deal);
               deleteLead(lead.id);
               lastDealId = deal.id;
            } catch (error) {
               console.error("Bulk Convert Individual Error", error);
            }
         });

         setLeads(prev => prev.filter(l => !selectedIds.includes(l.id)));
         setSelectedIds([]);
         alert(`Đã chuyển đổi thành công ${selectedIds.length} lead!`);
         if (lastDealId) navigate(`/pipeline?newDeal=${lastDealId}`);
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
               className={`hover:bg-blue-50/50 group transition-colors cursor-pointer border-b border-slate-100 last:border-0 ${(!lead.pickUpDate && lead.status === LeadStatus.NEW) ? 'bg-red-50/30' : (!lead.pickUpDate && lead.status === LeadStatus.ASSIGNED) ? 'bg-amber-50/20' : ''}`}
               onClick={(e) => {
                  if ((e.target as HTMLElement).tagName !== 'INPUT') setSelectedLead(lead);
               }}
            >
               <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={selectedIds.includes(lead.id)} onChange={() => {
                     setSelectedIds(prev => prev.includes(lead.id) ? prev.filter(i => i !== lead.id) : [...prev, lead.id]);
                  }} />
               </td>




               {visibleColumns.includes('opportunity') && (
                  <td className="p-3 align-middle max-w-[200px]">
                     <div className="flex flex-col gap-0.5 overflow-hidden">
                        <div className="font-bold text-slate-900 group-hover:text-blue-600 truncate">{lead.name}</div>
                        {lead.program && (
                           <span className="text-xs text-blue-600 hover:underline truncate">{lead.program}</span>
                        )}
                     </div>
                  </td>
               )}
               {visibleColumns.includes('contact') && (
                  <td className="p-3 align-middle text-slate-700 max-w-[150px]">
                     <div className="flex flex-col overflow-hidden">
                        <span className="font-semibold truncate">{lead.name}</span>
                        <span className="text-xs text-slate-500 truncate">{lead.phone}</span>
                     </div>
                  </td>
               )}
               {visibleColumns.includes('email') && <td className="p-3 align-middle text-slate-600 text-xs truncate max-w-[150px]" title={lead.email}>{lead.email || '-'}</td>}
               {visibleColumns.includes('city') && <td className="p-3 align-middle text-slate-600 text-xs truncate max-w-[100px]">{(lead as any).city || '-'}</td>}
               {visibleColumns.includes('company') && <td className="p-3 align-middle text-slate-600 text-xs truncate max-w-[120px]">{(lead as any).company || 'CS Chính'}</td>}
               {visibleColumns.includes('source') && <td className="p-3 align-middle text-slate-600 text-xs truncate max-w-[100px]" title={lead.source}>{lead.source || '-'}</td>}
               {visibleColumns.includes('medium') && <td className="p-3 align-middle text-slate-600 text-xs truncate max-w-[100px]">{(lead as any).marketingData?.medium || '-'}</td>}
               {visibleColumns.includes('campaign') && <td className="p-3 align-middle text-slate-600 text-xs truncate max-w-[120px]">{(lead as any).marketingData?.campaign || '-'}</td>}
               {visibleColumns.includes('referredBy') && <td className="p-3 align-middle text-slate-600 text-xs truncate max-w-[120px]">{(lead as any).referredBy || '-'}</td>}
               {visibleColumns.includes('salesperson') && <td className="p-3 align-middle text-slate-600 text-xs font-semibold text-blue-700 truncate max-w-[120px]">{user?.name || 'Tôi'}</td>}
               {visibleColumns.includes('title') && <td className="p-3 align-middle text-slate-600 text-xs truncate max-w-[80px]">{(lead as any).title || '-'}</td>}
               {visibleColumns.includes('full_address') && <td className="p-3 align-middle text-slate-600 text-xs truncate max-w-[150px]" title={(lead as any).address}>{(lead as any).address || '-'}</td>}

               {/* Tags */}
               {visibleColumns.includes('tags') && (
                  <td className="p-3 align-middle max-w-[150px]">
                     <div className="flex flex-nowrap gap-1 overflow-hidden">
                        {(Array.isArray((lead as any).marketingData?.tags)
                           ? (lead as any).marketingData.tags
                           : (typeof (lead as any).marketingData?.tags === 'string'
                              ? (lead as any).marketingData.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
                              : [])
                        ).slice(0, 2).map((t: string, i: number) => { // Limit to 2 tags
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
                              <span key={i} className={`text-[10px] px-2 py-0.5 rounded border ${colorClass} font-bold whitespace-nowrap truncate`}>{t}</span>
                           );
                        })}
                        {(!(lead as any).marketingData?.tags || ((lead as any).marketingData.tags.length === 0)) && '-'}
                     </div>
                  </td>
               )}

               {visibleColumns.includes('status') && (
                  <td className="p-3 align-middle text-center whitespace-nowrap">
                     <div className="flex flex-col items-center gap-1">
                        <span
                           className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase cursor-pointer hover:opacity-80 whitespace-nowrap ${lead.status === LeadStatus.NEW ? 'bg-blue-100 text-blue-700' :
                              lead.status === LeadStatus.ASSIGNED ? 'bg-amber-100 text-amber-700' :
                                 lead.status === LeadStatus.QUALIFIED ? 'bg-cyan-100 text-cyan-700' :
                                    lead.status === LeadStatus.CONTACTED || lead.status === 'CONTACTED' ? 'bg-purple-100 text-purple-700' :
                                       lead.status === DealStage.LOST ? 'bg-red-100 text-red-700' :
                                          'bg-slate-100 text-slate-600'
                              }`}
                           onClick={(e) => handleClickableField(e, 'status', 'Trạng thái', lead.status as string)}
                        >
                           {lead.status === LeadStatus.NEW ? 'Mới' :
                              lead.status === LeadStatus.ASSIGNED ? 'Đã nhận' :
                                 lead.status === LeadStatus.CONTACTED ? 'Đang liên hệ' :
                                    lead.status === LeadStatus.QUALIFIED ? 'Tiềm năng' : lead.status}
                        </span>
                        {((lead.status === LeadStatus.NEW || lead.status === LeadStatus.ASSIGNED) && !lead.pickUpDate) && (
                           <button
                              onClick={(e) => handlePickUp(e, lead)}
                              className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded hover:bg-blue-700 transition-colors shadow-sm animate-pulse"
                           >
                              Tiếp nhận
                           </button>
                        )}
                        {lead.status === LeadStatus.ASSIGNED && lead.pickUpDate && (
                           <div className="flex items-center gap-1 text-[9px] text-green-600 font-bold">
                              <CheckCircle2 size={10} /> Đã nhận
                           </div>
                        )}
                     </div>
                  </td>
               )}
            </tr>
         );
      })
   );

   return (
      <div className="flex flex-col h-full bg-[#f8fafc] font-sans text-slate-900 relative max-w-[1400px] mx-auto">

         {/* TOOLBAR */}
         <div className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-20 shadow-sm flex justify-between items-center">
            <div className="flex items-center gap-4">
               <h1 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                  <Inbox size={20} className="text-blue-600" /> Lead của tôi
               </h1>
               <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
                  {['all', LeadStatus.NEW, LeadStatus.ASSIGNED, LeadStatus.CONTACTED].map(s => (
                     <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1 text-sm rounded-md font-bold transition-colors ${statusFilter === s ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                        {s === 'all' ? 'Tất cả' : s === LeadStatus.NEW ? 'Chờ tiếp nhận' : s === LeadStatus.ASSIGNED ? 'Đã nhận' : 'Đang liên hệ'}
                     </button>
                  ))}
               </div>
            </div>
         </div>

         {/* NEW TOOLBAR (Replacing Pivot Bar) */}
         <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 w-1/3">
               <OdooSearchBar
                  filters={searchFilters}
                  onAddFilter={(filter) => setSearchFilters([...searchFilters, filter])}
                  onRemoveFilter={(index) => setSearchFilters(searchFilters.filter((_, i) => i !== index))}
                  onClearAll={() => setSearchFilters([])}
                  searchFields={searchFields}
               />
            </div>

            <div className="ml-auto flex items-center gap-2">
               {/* View Switcher */}
               <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                  <button onClick={() => setViewMode('list')} className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-blue-50 text-blue-600 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'}`} title="Dạng Danh sách"><ListIcon size={16} /></button>
                  <button onClick={() => setViewMode('pivot')} className={`p-1.5 rounded ${viewMode === 'pivot' ? 'bg-blue-50 text-blue-600 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'}`} title="Báo cáo Pivot"><LayoutGrid size={16} /></button>
               </div>

               {/* Column Settings Button (Marketing Style) */}
               <div className="relative">
                  <button
                     onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                     className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold hover:bg-white text-slate-600 bg-slate-100 shadow-sm transition-all"
                  >
                     <Settings size={14} /> Cột
                  </button>
                  {showColumnDropdown && (
                     <>
                        <div className="fixed inset-0 z-30" onClick={() => setShowColumnDropdown(false)}></div>
                        <div className="absolute right-0 top-full mt-2 w-[400px] bg-white border border-slate-200 rounded-xl shadow-xl z-40 p-3 animate-in fade-in zoom-in-95">
                           <div className="text-xs font-bold text-slate-500 uppercase px-2 py-1 mb-2 border-b border-slate-100 pb-2">Hiển thị cột</div>
                           <div className="grid grid-cols-2 gap-x-2 gap-y-1 max-h-[300px] overflow-y-auto custom-scrollbar">
                              {ALL_COLUMNS.map(col => (
                                 <div key={col.id} onClick={() => toggleColumn(col.id)} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer text-sm">
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${visibleColumns.includes(col.id) ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'}`}>
                                       {visibleColumns.includes(col.id) && <CheckCircle2 size={10} strokeWidth={4} />}
                                    </div>
                                    <span className={visibleColumns.includes(col.id) ? 'text-slate-900 font-medium' : 'text-slate-500'}>{col.label}</span>
                                 </div>
                              ))}
                           </div>
                        </div>
                     </>
                  )}
               </div>

               {/* Time Range Filter (Marketing Style) */}
               <div className="relative">
                  <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm hover:border-blue-300 transition-all">
                     <select
                        value={timeFilterField}
                        onChange={(e) => setTimeFilterField(e.target.value as any)}
                        className="bg-slate-50 border-r border-slate-200 px-2 py-1.5 text-xs font-bold text-slate-600 outline-none cursor-pointer hover:bg-slate-100"
                     >
                        <option value="createdAt">Ngày tạo</option>
                        <option value="expectedClosingDate">Hạn chót</option>
                     </select>
                     <button
                        onClick={() => setShowTimePicker(!showTimePicker)}
                        className={`flex items-center gap-2 px-3 py-2 text-xs font-bold whitespace-nowrap ${timeRangeType !== 'all' ? 'text-blue-600 bg-blue-50' : 'text-slate-500'}`}
                     >
                        <Calendar size={14} />
                        {timePresets.find(p => p.id === timeRangeType)?.label}
                        {timeRangeType === 'custom' && customRange && (
                           <span className="text-[10px] bg-blue-100 px-1 rounded ml-1">
                              {customRange.start ? new Date(customRange.start).toLocaleDateString('vi-VN') : '...'} - {customRange.end ? new Date(customRange.end).toLocaleDateString('vi-VN') : '...'}
                           </span>
                        )}
                        <ChevronDown size={14} className={`transition-transform ${showTimePicker ? 'rotate-180' : ''}`} />
                     </button>
                  </div>

                  {showTimePicker && (
                     <>
                        <div className="fixed inset-0 z-30" onClick={() => setShowTimePicker(false)}></div>
                        <div className="absolute right-0 top-full mt-2 w-[600px] bg-white border border-slate-200 rounded-xl shadow-2xl z-40 overflow-hidden flex animate-in slide-in-from-top-2">
                           <div className="w-48 bg-slate-50 border-r border-slate-100 p-2 space-y-1 shrink-0">
                              {timePresets.map(preset => (
                                 <button
                                    key={preset.id}
                                    onClick={() => {
                                       setTimeRangeType(preset.id);
                                       // Don't close if custom, otherwise close
                                       if (preset.id !== 'custom') setShowTimePicker(false);
                                    }}
                                    className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all ${timeRangeType === preset.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-200'}`}
                                 >
                                    {preset.label}
                                 </button>
                              ))}
                           </div>
                           <div className="flex-1 p-6 flex flex-col">
                              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">KHOẢNG THỜI GIAN TÙY CHỈNH</div>
                              <div className="grid grid-cols-2 gap-6">
                                 <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-2">Từ ngày</label>
                                    <div className="relative">
                                       <input
                                          type="date"
                                          className="w-full pl-3 pr-10 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:border-blue-500 outline-none text-slate-700"
                                          value={customRange?.start || ''}
                                          onChange={(e) => setCustomRange(prev => ({ start: e.target.value, end: prev?.end || '' }))}
                                       />
                                       <Calendar size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                 </div>
                                 <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-2">Đến ngày</label>
                                    <div className="relative">
                                       <input
                                          type="date"
                                          className="w-full pl-3 pr-10 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:border-blue-500 outline-none text-slate-700"
                                          value={customRange?.end || ''}
                                          onChange={(e) => setCustomRange(prev => ({ start: prev?.start || '', end: e.target.value }))}
                                       />
                                       <Calendar size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                 </div>
                              </div>
                              <div className="mt-auto pt-8 flex justify-between items-center">
                                 <button
                                    onClick={() => {
                                       setTimeRangeType('all');
                                       setCustomRange(null);
                                    }}
                                    className="text-sm font-bold text-slate-400 hover:text-slate-600"
                                 >
                                    Làm lại
                                 </button>
                                 <div className="flex items-center gap-3">
                                    <button
                                       onClick={() => setShowTimePicker(false)}
                                       className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                                    >
                                       Hủy
                                    </button>
                                    <button
                                       onClick={() => setShowTimePicker(false)}
                                       className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm shadow-blue-200"
                                    >
                                       Áp dụng
                                    </button>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </>
                  )}
               </div>

               {/* Advanced Filter Button */}
               <div className="relative">
                  <button
                     onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
                     className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-xs font-bold transition-all ${showAdvancedFilter ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                     <Filter size={14} /> Lọc nâng cao
                  </button>

                  {/* Advanced Filter UI (Image 2) */}
                  {showAdvancedFilter && (
                     <>
                        <div className="fixed inset-0 z-30" onClick={() => setShowAdvancedFilter(false)}></div>
                        <div className="absolute right-0 top-full mt-2 w-[800px] bg-white border border-slate-200 rounded-xl shadow-2xl z-40 flex animate-in fade-in zoom-in-95 overflow-hidden font-sans">
                           {/* Column 1: Filter */}
                           <div className="w-1/3 border-r border-slate-100 p-4">
                              <div className="flex items-center gap-2 mb-4 text-sm font-bold text-slate-800">
                                 <Filter size={16} /> Bộ lọc
                              </div>
                              <div className="space-y-1">
                                 <div className={`px-3 py-2 text-sm rounded cursor-pointer transition-colors ${filterType === 'all' ? 'bg-blue-600 text-white font-bold' : 'text-slate-700 hover:bg-slate-50'}`} onClick={() => setFilterType('all')}>Tất cả Lead của tôi</div>
                                 <div className={`px-3 py-2 text-sm rounded cursor-pointer transition-colors ${filterType === 'no-activity' ? 'bg-blue-600 text-white font-bold' : 'text-slate-700 hover:bg-slate-50'}`} onClick={() => setFilterType('no-activity')}>Chưa có hoạt động</div>
                                 <div className={`px-3 py-2 text-sm rounded cursor-pointer transition-colors ${filterType === 'high-value' ? 'bg-blue-600 text-white font-bold' : 'text-slate-700 hover:bg-slate-50'}`} onClick={() => setFilterType('high-value')}>Cơ hội giá trị cao</div>
                                 <div className="my-2 border-t border-slate-100"></div>
                                 <div className="px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded cursor-pointer flex justify-between items-center group">
                                    Ngày tạo <ChevronDown size={14} className="text-slate-400 group-hover:text-slate-600" />
                                 </div>
                                 <div className="px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded cursor-pointer flex justify-between items-center group">
                                    Ngày chốt <ChevronDown size={14} className="text-slate-400 group-hover:text-slate-600" />
                                 </div>
                                 <div className="my-2 border-t border-slate-100"></div>
                                 {['NEW', 'CONTACTED', 'QUALIFIED', 'LOST'].map(status => (
                                    <div key={status} className={`px-3 py-2 text-sm rounded cursor-pointer transition-colors ${statusFilter === status ? 'bg-blue-600 text-white font-bold' : 'text-slate-700 hover:bg-slate-50'}`} onClick={() => setStatusFilter(status)}>
                                       {status === 'NEW' ? 'Mới' : status === 'CONTACTED' ? 'Đang liên hệ' : status === 'QUALIFIED' ? 'Đạt' : 'Mất'}
                                    </div>
                                 ))}
                              </div>
                           </div>

                           {/* Column 2: Group By */}
                           <div className="w-1/3 border-r border-slate-100 p-4 bg-slate-50/50">
                              <div className="flex items-center gap-2 mb-4 text-sm font-bold text-slate-800">
                                 <Users size={16} /> Nhóm theo
                              </div>
                              <div className="space-y-1">
                                 {[
                                    { label: 'Không nhóm', value: 'none' },
                                    { label: 'Chuyên viên sales', value: 'salesperson' },
                                    { label: 'Giai đoạn', value: 'status' },
                                    { label: 'Thành phố', value: 'city' },
                                    { label: 'Chương trình', value: 'program' },
                                    { label: 'Nguồn', value: 'source' }
                                 ].map(item => (
                                    <div key={item.value}
                                       className={`px-3 py-2 text-sm rounded cursor-pointer transition-colors ${groupBy === item.value ? 'bg-blue-100 text-blue-700 font-bold border-l-4 border-blue-600' : 'text-slate-700 hover:bg-slate-100'}`}
                                       onClick={() => setGroupBy(item.value as any)}
                                    >
                                       {item.label}
                                    </div>
                                 ))}
                                 <div className="my-2 border-t border-slate-200"></div>
                                 {['Ngày tạo', 'Ngày đóng dự kiến', 'Ngày chốt', 'Nhóm tùy chỉnh'].map(item => (
                                    <div key={item} className="px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded cursor-pointer flex justify-between items-center group">
                                       {item} <ChevronDown size={14} className="text-slate-400 group-hover:text-slate-600" />
                                    </div>
                                 ))}
                              </div>
                           </div>

                           {/* Column 3: Favorites */}
                           <div className="w-1/3 p-4">
                              <div className="flex items-center gap-2 mb-4 text-sm font-bold text-slate-800">
                                 <FileSpreadsheet size={16} /> Danh sách yêu thích
                              </div>
                              <div className="mb-4">
                                 <label className="block text-xs font-semibold text-slate-500 mb-1.5">Lưu bộ lọc hiện tại</label>
                                 <input type="text" className="w-full border border-slate-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Quy trình" />
                              </div>
                              <label className="flex items-center gap-2 mb-6 cursor-pointer">
                                 <input type="checkbox" className="rounded border-slate-300 text-blue-600" />
                                 <span className="text-sm text-slate-700">Bộ lọc mặc định</span>
                              </label>
                              <div className="flex gap-2">
                                 <button className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded font-bold text-sm transition-colors">Lưu</button>
                                 <button className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded font-bold text-sm transition-colors">Chỉnh sửa</button>
                              </div>
                           </div>
                        </div>
                     </>
                  )}
               </div>


            </div>

            <div className="ml-auto flex items-center gap-2">
               <button
                  onClick={() => {
                     if (selectedIds.length > 0) {
                        const lead = filteredLeads.find(l => l.id === selectedIds[0]);
                        if (lead) window.location.href = `tel:${lead.phone}`;
                     } else {
                        alert("Vui lòng chọn ít nhất 1 lead để gọi");
                     }
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-bold transition-all shadow-sm"
               >
                  <Phone size={14} /> Call
               </button>

               <div className="relative">
                  <button
                     onClick={() => setIsActionMenuOpen(!isActionMenuOpen)}
                     className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition-all shadow-sm"
                  >
                     Action <ChevronDown size={14} />
                  </button>

                  {isActionMenuOpen && (
                     <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsActionMenuOpen(false)}></div>
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-md shadow-lg z-50 py-1 overflow-hidden animate-in fade-in slide-in-from-top-1">
                           <button
                              onClick={() => { setIsActionMenuOpen(false); handleBulkAssign(); }}
                              className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                           >
                              <UserPlus size={14} /> Phân bổ
                           </button>
                           <button
                              onClick={() => { setIsActionMenuOpen(false); handleBulkMarkLost(); }}
                              className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                           >
                              <XCircle size={14} /> Lost
                           </button>
                           <button
                              onClick={() => {
                                 setIsActionMenuOpen(false);
                                 if (selectedIds.length > 0) {
                                    if (confirm(`Xác nhận đánh dấu thắng (Won) cho ${selectedIds.length} lead?`)) {
                                       const updatedLeads = leads.map(l => selectedIds.includes(l.id) ? { ...l, status: DealStage.WON } : l);
                                       setLeads(updatedLeads);
                                       import('../utils/storage').then(({ saveLeads }) => saveLeads(updatedLeads));
                                       setSelectedIds([]);
                                       alert("Cập nhật thành công!");
                                    }
                                 } else alert("Chưa chọn lead!");
                              }}
                              className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                           >
                              <CheckCircle2 size={14} /> Won
                           </button>
                           <button
                              onClick={() => {
                                 setIsActionMenuOpen(false);
                                 if (selectedIds.length > 0) {
                                    if (confirm(`Xóa ${selectedIds.length} lead đã chọn?`)) {
                                       const remainingLeads = leads.filter(l => !selectedIds.includes(l.id));
                                       setLeads(remainingLeads);
                                       const allLeads = JSON.parse(localStorage.getItem('leads') || '[]');
                                       const filteredAllLeads = allLeads.filter((l: any) => !selectedIds.includes(l.id));
                                       import('../utils/storage').then(({ saveLeads }) => saveLeads(filteredAllLeads));
                                       setSelectedIds([]);
                                    }
                                 } else alert("Chưa chọn lead!");
                              }}
                              className="w-full text-left px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2"
                           >
                              <Trash2 size={14} /> Delete
                           </button>
                           <button
                              onClick={() => {
                                 setIsActionMenuOpen(false);
                                 if (selectedIds.length > 0) {
                                    const lead = leads.find(l => l.id === selectedIds[0]);
                                    if (lead) setSelectedLead(lead);
                                 } else alert("Chưa chọn lead!");
                              }}
                              className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                           >
                              <Settings size={14} /> Edit
                           </button>
                           <div className="border-t border-slate-100 my-1"></div>
                           <button
                              onClick={() => { setIsActionMenuOpen(false); navigate('/leads/import'); }}
                              className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                           >
                              <FileSpreadsheet size={14} /> Import
                           </button>
                           <button
                              onClick={() => {
                                 setIsActionMenuOpen(false);
                                 if (selectedIds.length > 0) {
                                    handleBulkConvert();
                                 } else alert("Hãy chọn ít nhất 1 lead để convert.");
                              }}
                              className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                           >
                              <Shuffle size={14} /> Convert
                           </button>
                           <button
                              onClick={() => { setIsActionMenuOpen(false); alert("Chức năng gửi tin hàng loạt đang phát triển."); }}
                              className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                           >
                              <MessageSquare size={14} /> Gửi tin hàng loạt
                           </button>
                        </div>
                     </>
                  )}
               </div>

               <div className="ml-2 text-xs text-slate-500 font-mono">
                  Tổng số: <span className="font-bold text-slate-900">{filteredLeads.length}</span> records
               </div>
            </div>
         </div>



         {/* DATA GRID */}
         <div className="flex-1 overflow-auto bg-white custom-scrollbar relative">
            {viewMode === 'pivot' ? (
               <div className="p-4 h-full overflow-auto animate-in fade-in">
                  <LeadPivotTable leads={filteredLeads} />
               </div>
            ) : (
               <table className="w-full text-left border-collapse text-sm table-fixed">
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

                        {visibleColumns.includes('opportunity') && <th className="p-3 border-r border-slate-200 whitespace-nowrap text-left">Cơ hội</th>}
                        {visibleColumns.includes('contact') && <th className="p-3 border-r border-slate-200 whitespace-nowrap text-left">Liên hệ</th>}
                        {visibleColumns.includes('email') && <th className="p-3 border-r border-slate-200 whitespace-nowrap text-left">Email</th>}
                        {visibleColumns.includes('city') && <th className="p-3 border-r border-slate-200 whitespace-nowrap text-left">Địa chỉ</th>}
                        {visibleColumns.includes('company') && <th className="p-3 border-r border-slate-200 whitespace-nowrap text-left">Cơ sở</th>}
                        {visibleColumns.includes('source') && <th className="p-3 border-r border-slate-200 whitespace-nowrap text-left">Nguồn</th>}
                        {visibleColumns.includes('medium') && <th className="p-3 border-r border-slate-200 whitespace-nowrap text-left">Môi trường</th>}
                        {visibleColumns.includes('campaign') && <th className="p-3 border-r border-slate-200 whitespace-nowrap text-left">Chiến dịch</th>}
                        {visibleColumns.includes('referredBy') && <th className="p-3 border-r border-slate-200 whitespace-nowrap text-left">Người giới thiệu</th>}
                        {visibleColumns.includes('salesperson') && <th className="p-3 border-r border-slate-200 whitespace-nowrap text-left">Sale</th>}
                        {visibleColumns.includes('title') && <th className="p-3 border-r border-slate-200 whitespace-nowrap text-left">Danh xưng</th>}
                        {visibleColumns.includes('full_address') && <th className="p-3 border-r border-slate-200 whitespace-nowrap text-left">Địa chỉ (Full)</th>}
                        {visibleColumns.includes('tags') && <th className="p-3 border-r border-slate-200 whitespace-nowrap text-left">Tags</th>}
                        {visibleColumns.includes('status') && <th className="p-3 border-slate-200 text-center whitespace-nowrap">Trạng thái</th>}
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
