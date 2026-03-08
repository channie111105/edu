import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom'; // Add import
import { useAuth } from '../contexts/AuthContext';
import { getLeads, saveLead, addContact, addDeal, convertLeadToContact, getTags, saveTags } from '../utils/storage';
import { LeadStatus, ILead, IDeal, DealStage } from '../types';
import UnifiedLeadDrawer from '../components/UnifiedLeadDrawer';
import LeadPivotTable from '../components/LeadPivotTable';
import SLABadge from '../components/SLABadge';
import OdooSearchBar, { SearchFilter, SearchFieldConfig } from '../components/OdooSearchBar';
import SLAWarningBanner from '../components/SLAWarningBanner';
import { buildDomainFromFilters, applyDomainFilter, getGroupByFields } from '../utils/filterDomain';
import { calculateSLAWarnings, getUrgentWarningCount } from '../utils/slaUtils';
import { LEAD_CHANNEL_OPTIONS } from '../constants';
import {
   Inbox, Search, Phone, Filter, CheckCircle2, Clock,
   ListFilter, Star, Grid, List as ListIcon, ChevronLeft, ChevronRight,
   ChevronDown, ChevronRight as ChevronRightIcon,
   Layout, LayoutGrid, Cog, Download, Archive, Mail, MessageSquare, Trash2,
   UserPlus, Shuffle, XCircle, X, Save, FileSpreadsheet, Settings, Calendar, Users
} from 'lucide-react';

const MyLeads: React.FC = () => {
   const { user } = useAuth();
   const navigate = useNavigate();

   const SALES_REPS = [
      { id: 'u1', name: 'Trần Văn Quản Trị' },
      { id: 'u2', name: 'Sarah Miller' },
      { id: 'u3', name: 'David Clark' },
      { id: 'u4', name: 'Alex Rivera' },
   ];

   const NEW_LEAD_INITIAL_STATE = {
      name: '',
      phone: '',
      email: '',
      source: 'hotline',
      program: 'Tiếng Đức',
      notes: '',
      title: '',
      company: '',
      province: '',
      city: '',
      ward: '',
      street: '',
      salesperson: user?.id || '',
      campaign: '',
      tags: [] as string[],
      referredBy: '',
      product: '',
      market: '',
      channel: '',
      status: 'NEW'
   };

   // Data State
   const [leads, setLeads] = useState<ILead[]>([]);
   const [searchFilters, setSearchFilters] = useState<SearchFilter[]>([]);
   const [selectedIds, setSelectedIds] = useState<string[]>([]);
   const [statusFilter, setStatusFilter] = useState<string>('all');

   // UI State
   const [showConfetti, setShowConfetti] = useState(false);
   const [showCreateLeadModal, setShowCreateLeadModal] = useState(false);
   const [newLeadData, setNewLeadData] = useState(NEW_LEAD_INITIAL_STATE);
   const [createModalActiveTab, setCreateModalActiveTab] = useState<'notes' | 'extra'>('notes');
   const [availableTags, setAvailableTags] = useState<string[]>([]);
   const [isAddingTag, setIsAddingTag] = useState(false);

   // Pivot/Group State
   const [groupBy, setGroupBy] = useState<'none' | 'source' | 'status' | 'program' | 'city'>('none');
   const [viewMode, setViewMode] = useState<'list' | 'pivot' | 'kanban'>('list');
   const [filterType, setFilterType] = useState('all');
   const [statusFilterSource, setStatusFilterSource] = useState<'tabs' | 'advanced' | null>(null);

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
   const [showActionDropdown, setShowActionDropdown] = useState(false);

   // --- TIME RANGE FILTER STATE ---
   const [showTimePicker, setShowTimePicker] = useState(false);
   const [timeFilterField, setTimeFilterField] = useState<'createdAt' | 'lastInteraction' | 'expectedClosingDate' | 'pickUpDate'>('createdAt');
   const [timeRangeType, setTimeRangeType] = useState<string>('all');
   const [customRange, setCustomRange] = useState<{ start: string; end: string } | null>(null);

   const timeFieldOptions = [
      { id: 'createdAt', label: 'Ngày tạo' },
      { id: 'lastInteraction', label: 'Lần tương tác cuối' },
      { id: 'expectedClosingDate', label: 'Ngày dự kiến chốt' },
      { id: 'pickUpDate', label: 'Ngày tiếp nhận' },
   ] as const;

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

   const filterTypeLabels: Record<string, string> = {
      'no-activity': 'Chưa có hoạt động',
      'high-value': 'Cơ hội giá trị cao',
   };

   const groupByLabels: Record<string, string> = {
      none: 'Không nhóm',
      salesperson: 'Chuyên viên sales',
      status: 'Giai đoạn',
      city: 'Thành phố',
      program: 'Chương trình',
      source: 'Nguồn',
   };

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

   const reloadMyLeads = useCallback(() => {
      if (!user?.id) {
         setLeads([]);
         return;
      }
      const allLeads = getLeads();
      const myLeads = allLeads.filter(l => l.ownerId === user.id);
      setLeads(myLeads);
   }, [user?.id]);

   const handleCreateMyLead = () => {
      if (!user?.id) {
         alert('Không xác định được tài khoản sale.');
         return;
      }

      if (!newLeadData.name || !newLeadData.phone) {
         alert("Vui lòng nhập Tên và SĐT");
         return;
      }
      if (!newLeadData.company) {
         alert("Vui lòng chọn Cơ sở / Company Base");
         return;
      }

      const statusMap: Record<string, string> = {
         NEW: LeadStatus.NEW,
         CONTACTED: LeadStatus.CONTACTED,
         QUALIFIED: LeadStatus.QUALIFIED,
         LOST: DealStage.LOST
      };
      const mappedStatus = statusMap[newLeadData.status] || LeadStatus.NEW;

      const program = (newLeadData.product && ['Tiếng Đức', 'Tiếng Trung', 'Du học Đức', 'Du học Trung', 'Du học nghề Úc'].includes(newLeadData.product))
         ? newLeadData.product as ILead['program']
         : newLeadData.program as ILead['program'];

      const nowIso = new Date().toISOString();
      const lead: ILead = {
         id: `l-${Date.now()}`,
         ...newLeadData,
         program,
         ownerId: newLeadData.salesperson || user.id,
         marketingData: {
            tags: newLeadData.tags,
            campaign: newLeadData.campaign,
            channel: newLeadData.channel,
            market: newLeadData.market
         },
         status: mappedStatus,
         createdAt: nowIso,
         score: 10,
         lastActivityDate: nowIso,
         lastInteraction: nowIso,
         slaStatus: 'normal',
         activities: [{
            id: `act-${Date.now()}`,
            type: 'system',
            timestamp: nowIso,
            title: 'Tạo lead thủ công',
            description: `Sale ${user.name || 'Tôi'} tạo lead từ My Leads.`,
            user: user.name || 'System'
         }]
      };

      saveLead(lead);
      reloadMyLeads();
      setShowCreateLeadModal(false);
      setCreateModalActiveTab('notes');
      setNewLeadData({
         ...NEW_LEAD_INITIAL_STATE,
         salesperson: user.id
      });
      alert('Tạo Lead thành công!');
   };

   const openCreateLeadModal = () => {
      setCreateModalActiveTab('notes');
      setIsAddingTag(false);
      setNewLeadData({
         ...NEW_LEAD_INITIAL_STATE,
         salesperson: user?.id || ''
      });
      setShowCreateLeadModal(true);
   };

   useEffect(() => {
      reloadMyLeads();
      setAvailableTags(getTags());
      setNewLeadData((prev) => ({
         ...prev,
         salesperson: user?.id || ''
      }));
   }, [user, reloadMyLeads]);

   useEffect(() => {
      const handleLeadsChanged = () => {
         reloadMyLeads();
      };

      const handleStorageChanged = (event: StorageEvent) => {
         if (!event.key || event.key === 'educrm_leads_v2') {
            reloadMyLeads();
         }
      };

      window.addEventListener('educrm:leads-changed', handleLeadsChanged);
      window.addEventListener('storage', handleStorageChanged);

      return () => {
         window.removeEventListener('educrm:leads-changed', handleLeadsChanged);
         window.removeEventListener('storage', handleStorageChanged);
      };
   }, [reloadMyLeads]);

   const getDateRangeToday = () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      return { start, end };
   };

   const getLeadTimeValue = (
      lead: ILead,
      field: 'createdAt' | 'lastInteraction' | 'expectedClosingDate' | 'pickUpDate'
   ) => {
      if (field === 'createdAt') return lead.createdAt;
      if (field === 'lastInteraction') return lead.lastInteraction;
      if (field === 'expectedClosingDate') return lead.expectedClosingDate;
      return lead.pickUpDate;
   };

   const getTimeRangeBounds = (rangeType: string) => {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(startOfDay);
      endOfDay.setHours(23, 59, 59, 999);

      if (rangeType === 'today') {
         return { start: startOfDay, end: endOfDay };
      }

      if (rangeType === 'yesterday') {
         const start = new Date(startOfDay);
         start.setDate(start.getDate() - 1);
         const end = new Date(startOfDay);
         end.setMilliseconds(-1);
         return { start, end };
      }

      if (rangeType === 'thisWeek') {
         const day = now.getDay() || 7;
         const start = new Date(startOfDay);
         start.setDate(start.getDate() - day + 1);
         const end = new Date(start);
         end.setDate(end.getDate() + 6);
         end.setHours(23, 59, 59, 999);
         return { start, end };
      }

      if (rangeType === 'last7Days') {
         const start = new Date(startOfDay);
         start.setDate(start.getDate() - 6);
         return { start, end: endOfDay };
      }

      if (rangeType === 'last30Days') {
         const start = new Date(startOfDay);
         start.setDate(start.getDate() - 29);
         return { start, end: endOfDay };
      }

      if (rangeType === 'thisMonth') {
         const start = new Date(now.getFullYear(), now.getMonth(), 1);
         const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
         end.setHours(23, 59, 59, 999);
         return { start, end };
      }

      if (rangeType === 'lastMonth') {
         const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
         const end = new Date(now.getFullYear(), now.getMonth(), 0);
         end.setHours(23, 59, 59, 999);
         return { start, end };
      }

      if (rangeType === 'custom' && customRange?.start && customRange?.end) {
         const start = new Date(customRange.start);
         const end = new Date(customRange.end);
         end.setHours(23, 59, 59, 999);
         return { start, end };
      }

      return null;
   };

   const isOverdueLead = (lead: ILead) => {
      const dueDateRaw = (lead as any).deadline || lead.expectedClosingDate;
      if (!dueDateRaw) return false;
      const dueDate = new Date(dueDateRaw);
      if (Number.isNaN(dueDate.getTime())) return false;
      const { start } = getDateRangeToday();
      return dueDate < start;
   };

   const isTodayCareLead = (lead: ILead) => {
      const { start, end } = getDateRangeToday();
      const getTime = (value?: string) => {
         if (!value) return null;
         const t = new Date(value).getTime();
         return Number.isNaN(t) ? null : t;
      };

      const hasScheduledToday = (lead.activities || []).some((activity: any) => {
         const activityTime = getTime(activity?.datetime || activity?.timestamp);
         if (!activityTime) return false;
         return activityTime >= start.getTime() && activityTime <= end.getTime();
      });
      if (hasScheduledToday) return true;

      const lastInteractionTime = getTime(lead.lastInteraction);
      if (!lastInteractionTime) return false;
      return lastInteractionTime >= start.getTime() && lastInteractionTime <= end.getTime();
   };

   const overdueLeadsCount = useMemo(() => leads.filter(isOverdueLead).length, [leads]);
   const todayCareLeadsCount = useMemo(() => leads.filter(isTodayCareLead).length, [leads]);

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

      if (statusFilter === 'overdue') {
         result = result.filter(isOverdueLead);
      } else if (statusFilter === 'today_care') {
         result = result.filter(isTodayCareLead);
      } else if (statusFilter !== 'all') {
         result = result.filter(l => l.status === statusFilter);
      }

      // --- TIME RANGE FILTERING ---
      if (timeRangeType !== 'all') {
         const bounds = getTimeRangeBounds(timeRangeType);
         if (bounds) {
            result = result.filter(lead => {
               const dateStr = getLeadTimeValue(lead, timeFilterField);
               if (!dateStr) return false;
               const itemDate = new Date(dateStr);
               if (Number.isNaN(itemDate.getTime())) return false;
               return itemDate >= bounds.start && itemDate <= bounds.end;
            });
         }
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
      alert(`Tiếp nhận Lead: ${lead.name}. SLA: ${slaMet ? 'Đạt' : 'Quá hạn'}`);
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
            alert(`? b?n giao ${selectedIds.length} lead cho ${target}`);
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
            leadCreatedAt: lead.createdAt,
            assignedAt: lead.pickUpDate,
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
                  leadCreatedAt: lead.createdAt,
                  assignedAt: lead.pickUpDate,
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
               lastDealId = deal.id;
            } catch (error) {
               console.error("Bulk Convert Individual Error", error);
            }
         });

         setSelectedIds([]);
         alert(`Chuyển đổi thành công ${selectedIds.length} lead!`);
         if (lastDealId) navigate(`/pipeline?newDeal=${lastDealId}`);
      }
   };

   const handleBulkWon = () => {
      if (selectedIds.length > 0) {
         if (confirm(`Xác nhận đánh dấu thắng (Won) cho ${selectedIds.length} lead?`)) {
            const updatedLeads = leads.map(l => selectedIds.includes(l.id) ? { ...l, status: DealStage.WON } : l);
            setLeads(updatedLeads);
            import('../utils/storage').then(({ saveLeads }) => saveLeads(updatedLeads));
            setSelectedIds([]);
            alert("Cập nhật thành công!");
         }
      } else {
         alert("Chưa chọn lead!");
      }
   };

   const handleBulkDelete = () => {
      if (selectedIds.length > 0) {
         if (confirm(`Xóa ${selectedIds.length} lead đã chọn?`)) {
            const remainingLeads = leads.filter(l => !selectedIds.includes(l.id));
            setLeads(remainingLeads);
            const allLeads = JSON.parse(localStorage.getItem('leads') || '[]');
            const filteredAllLeads = allLeads.filter((l: any) => !selectedIds.includes(l.id));
            import('../utils/storage').then(({ saveLeads }) => saveLeads(filteredAllLeads));
            setSelectedIds([]);
         }
      } else {
         alert("Chưa chọn lead!");
      }
   };

   const handleBulkEdit = () => {
      if (selectedIds.length > 0) {
         const lead = leads.find(l => l.id === selectedIds[0]);
         if (lead) setSelectedLead(lead);
      } else {
         alert("Chưa chọn lead!");
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

   const normalizeLeadStatus = (status: string) => {
      if (status === LeadStatus.NEW || status === 'NEW') return 'new';
      if (status === LeadStatus.ASSIGNED || status === 'ASSIGNED') return 'assigned';
      if (status === LeadStatus.CONTACTED || status === 'CONTACTED') return 'contacted';
      if (status === LeadStatus.QUALIFIED || status === 'QUALIFIED') return 'qualified';
      if (status === DealStage.LOST || status === 'LOST') return 'lost';
      return 'other';
   };

   const kanbanColumns = useMemo(() => {
      const columns: Array<{
         key: string;
         title: string;
         color: string;
         leads: ILead[];
      }> = [
            { key: 'new', title: 'Chờ tiếp nhận', color: 'bg-blue-50 border-blue-200', leads: [] },
            { key: 'assigned', title: 'Đã nhận', color: 'bg-amber-50 border-amber-200', leads: [] },
            { key: 'contacted', title: 'Đang liên hệ', color: 'bg-purple-50 border-purple-200', leads: [] },
            { key: 'qualified', title: 'Tiềm năng', color: 'bg-cyan-50 border-cyan-200', leads: [] },
            { key: 'lost', title: 'Thất bại', color: 'bg-red-50 border-red-200', leads: [] },
         ];

      filteredLeads.forEach((lead) => {
         const normalized = normalizeLeadStatus(String(lead.status || ''));
         const col = columns.find((item) => item.key === normalized);
         if (col) col.leads.push(lead);
      });

      return columns;
   }, [filteredLeads]);

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

   const toolbarFilterChips = useMemo(() => {
      const chips: Array<SearchFilter & {
         origin: 'search' | 'synthetic';
         originalIndex?: number;
         syntheticKey?: 'filter-type' | 'group-by' | 'status' | 'time';
      }> = searchFilters.map((filter, index) => ({
         ...filter,
         origin: 'search',
         originalIndex: index,
      }));

      if (filterType !== 'all' && filterTypeLabels[filterType]) {
         chips.push({
            field: 'advanced_filter',
            label: 'Bộ lọc',
            value: filterTypeLabels[filterType],
            type: 'filter',
            origin: 'synthetic',
            syntheticKey: 'filter-type',
         });
      }

      if (statusFilterSource === 'advanced' && statusFilter !== 'all') {
         chips.push({
            field: 'advanced_status',
            label: 'Trạng thái',
            value: String(statusFilter),
            type: 'filter',
            origin: 'synthetic',
            syntheticKey: 'status',
         });
      }

      if (groupBy !== 'none') {
         chips.push({
            field: 'group_by',
            label: 'Nhóm theo',
            value: groupByLabels[groupBy] || groupBy,
            type: 'groupby',
            origin: 'synthetic',
            syntheticKey: 'group-by',
         });
      }

      if (timeRangeType !== 'all') {
         const timeFieldLabel = timeFieldOptions.find((option) => option.id === timeFilterField)?.label || 'Ngày tạo';
         const timePresetLabel = timePresets.find((preset) => preset.id === timeRangeType)?.label || timeRangeType;
         const customLabel = customRange?.start && customRange?.end
            ? `${customRange.start} - ${customRange.end}`
            : 'Tùy chỉnh khoảng thời gian';

         chips.push({
            field: 'time_field',
            label: 'Mốc thời gian',
            value: timeFieldLabel,
            type: 'filter',
            origin: 'synthetic',
            syntheticKey: 'time',
         });

         chips.push({
            field: 'time_range',
            label: 'Thời gian',
            value: timeRangeType === 'custom' ? customLabel : timePresetLabel,
            type: 'filter',
            origin: 'synthetic',
            syntheticKey: 'time',
         });
      }

      return chips;
   }, [
      searchFilters,
      filterType,
      groupBy,
      groupByLabels,
      statusFilter,
      statusFilterSource,
      timeFilterField,
      timeFieldOptions,
      timePresets,
      timeRangeType,
      customRange,
      filterTypeLabels
   ]);

   const handleToolbarFilterRemove = (index: number) => {
      const chip = toolbarFilterChips[index];
      if (!chip) return;

      if (chip.origin === 'search' && typeof chip.originalIndex === 'number') {
         setSearchFilters(prev => prev.filter((_, i) => i !== chip.originalIndex));
         return;
      }

      if (chip.syntheticKey === 'filter-type') {
         setFilterType('all');
         return;
      }

      if (chip.syntheticKey === 'group-by') {
         setGroupBy('none');
         return;
      }

      if (chip.syntheticKey === 'status') {
         setStatusFilter('all');
         setStatusFilterSource(null);
         return;
      }

      if (chip.syntheticKey === 'time') {
         setTimeFilterField('createdAt');
         setTimeRangeType('all');
         setCustomRange(null);
         setShowTimePicker(false);
      }
   };

   const handleClearToolbarFilters = () => {
      setSearchFilters([]);
      setFilterType('all');
      setGroupBy('none');
      setTimeFilterField('createdAt');
      setTimeRangeType('all');
      setCustomRange(null);
      setShowTimePicker(false);
      if (statusFilterSource === 'advanced') {
         setStatusFilter('all');
         setStatusFilterSource(null);
      }
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

               <td className="w-12 p-3 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                  <button
                     onClick={(e) => handleCall(e, lead)}
                     className="inline-flex items-center justify-center p-1 rounded bg-green-100 text-green-700 hover:bg-green-200"
                     title="Gọi ngay"
                  >
                     <Phone size={12} />
                  </button>
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

   const actionDropdownItems = [
      {
         label: 'Phân bổ',
         icon: Shuffle,
         onClick: () => {
            if (selectedIds.length === 0) {
               alert('Hãy chọn ít nhất 1 lead.');
               return;
            }
            handleBulkAssign();
         }
      },
      {
         label: 'Lost',
         icon: XCircle,
         onClick: () => {
            if (selectedIds.length === 0) {
               alert('Hãy chọn ít nhất 1 lead.');
               return;
            }
            handleBulkMarkLost();
         }
      },
      {
         label: 'Won',
         icon: CheckCircle2,
         onClick: () => {
            if (selectedIds.length === 0) {
               alert('Hãy chọn ít nhất 1 lead.');
               return;
            }
            handleBulkWon();
         }
      },
      {
         label: 'Edit',
         icon: Settings,
         onClick: () => {
            if (selectedIds.length === 0) {
               alert('Hãy chọn ít nhất 1 lead.');
               return;
            }
            handleBulkEdit();
         }
      },
      {
         label: 'Delete',
         icon: Trash2,
         onClick: () => {
            if (selectedIds.length === 0) {
               alert('Hãy chọn ít nhất 1 lead.');
               return;
            }
            handleBulkDelete();
         }
      },
      {
         label: 'Import',
         icon: Download,
         onClick: () => navigate('/leads/import')
      },
      {
         label: 'Convert',
         icon: Archive,
         onClick: () => {
            if (selectedIds.length === 0) {
               alert('Hãy chọn ít nhất 1 lead để convert.');
               return;
            }
            handleBulkConvert();
         }
      },
      {
         label: 'Gửi tin',
         icon: MessageSquare,
         onClick: () => alert('Chức năng gửi tin hàng loạt đang phát triển.')
      }
   ];

   return (
      <div className="flex flex-col h-full bg-[#f8fafc] font-sans text-slate-900 relative max-w-[1400px] mx-auto">
         {/* TOOLBAR */}
         <div className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-20 shadow-sm">
            <div className="flex flex-col gap-2 xl:flex-row xl:flex-wrap xl:gap-x-4 xl:gap-y-1 xl:items-start xl:justify-between">
               <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3 flex-wrap xl:flex-nowrap">
                     <h1 className="text-xl font-bold flex items-center gap-2 text-slate-800 shrink-0">
                        <Inbox size={20} className="text-blue-600" /> Lead của tôi
                     </h1>

                     <div className="min-w-0 overflow-x-auto pb-1">
                        <div className="flex items-center gap-1 min-w-max">
                           {[
                              { id: 'all', label: 'Tất cả', count: leads.length },
                              { id: LeadStatus.NEW, label: 'Chờ tiếp nhận', count: leads.filter(l => l.status === LeadStatus.NEW).length },
                              { id: 'overdue', label: 'DS quá hạn', count: overdueLeadsCount },
                              { id: 'today_care', label: 'Chăm sóc hôm nay', count: todayCareLeadsCount },
                           ].map((tab) => (
                              <button
                                 key={tab.id}
                                 onClick={() => {
                                    setStatusFilter(tab.id);
                                    setStatusFilterSource(tab.id === 'all' ? null : 'tabs');
                                 }}
                                 className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap border transition-all ${statusFilter === tab.id ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                              >
                                 <span>{tab.label}</span>
                                 <span className={`text-[10px] ${statusFilter === tab.id ? 'text-blue-500' : 'text-slate-400'}`}>{tab.count}</span>
                              </button>
                           ))}
                        </div>
                     </div>
                  </div>
               </div>

               <div className="w-full xl:w-[52%] xl:max-w-[700px] xl:flex-none">
                  <OdooSearchBar
                     filters={toolbarFilterChips}
                     onAddFilter={(filter) => setSearchFilters([...searchFilters, filter])}
                     onRemoveFilter={handleToolbarFilterRemove}
                     onClearAll={handleClearToolbarFilters}
                     searchFields={searchFields}
                     size="sm"
                     className="max-w-none"
                  />
               </div>

               <div className="flex flex-col gap-2 xl:flex-row xl:items-start xl:justify-between xl:basis-full">
                  <div className="flex items-center gap-1.5 flex-wrap">
                     <button
                        onClick={openCreateLeadModal}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0"
                     >
                        <UserPlus size={13} /> Tạo lead
                     </button>

                     <div className="relative shrink-0">
                        <button
                           onClick={() => setShowActionDropdown(!showActionDropdown)}
                           className={`flex items-center gap-1 px-2.5 py-1.5 border rounded-lg text-xs font-bold whitespace-nowrap transition-all ${showActionDropdown ? 'bg-slate-100 border-slate-300 text-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                        >
                           <Cog size={13} />
                           Action
                           <ChevronDown size={13} />
                        </button>

                        {showActionDropdown && (
                           <>
                              <div className="fixed inset-0 z-30" onClick={() => setShowActionDropdown(false)}></div>
                              <div className="absolute left-0 top-full mt-2 w-[200px] bg-white border border-slate-200 rounded-xl shadow-xl z-40 p-1.5 animate-in fade-in zoom-in-95">
                                 {actionDropdownItems.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                       <button
                                          key={item.label}
                                          onClick={() => {
                                             setShowActionDropdown(false);
                                             item.onClick();
                                          }}
                                          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                                       >
                                          <Icon size={14} className="text-slate-400" />
                                          <span>{item.label}</span>
                                       </button>
                                    );
                                 })}
                              </div>
                           </>
                        )}
                     </div>
                  </div>

                  <div className="w-full xl:w-[52%] xl:max-w-[700px] xl:ml-auto flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between xl:flex-nowrap">
                     <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                        <div className="relative shrink-0">
                           <button
                              onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
                              className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-xs font-bold whitespace-nowrap transition-all ${showAdvancedFilter ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                           >
                              <Filter size={14} /> Lọc nâng cao
                           </button>

                           {showAdvancedFilter && (
                              <>
                                 <div className="fixed inset-0 z-30" onClick={() => setShowAdvancedFilter(false)}></div>
                                 <div className="absolute right-0 top-full mt-2 w-[800px] max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-xl shadow-2xl z-40 flex animate-in fade-in zoom-in-95 overflow-hidden font-sans">
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
                                          {[
                                             { value: LeadStatus.NEW, label: 'Mới' },
                                             { value: LeadStatus.CONTACTED, label: 'Đang liên hệ' },
                                             { value: LeadStatus.QUALIFIED, label: 'Đạt' },
                                             { value: DealStage.LOST, label: 'Mất' }
                                          ].map(status => (
                                             <div key={status.value} className={`px-3 py-2 text-sm rounded cursor-pointer transition-colors ${statusFilter === status.value ? 'bg-blue-600 text-white font-bold' : 'text-slate-700 hover:bg-slate-50'}`} onClick={() => {
                                                setStatusFilter(status.value);
                                                setStatusFilterSource('advanced');
                                             }}>
                                                {status.label}
                                             </div>
                                          ))}
                                       </div>
                                    </div>

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

                        <div className="flex items-center gap-2 border border-slate-200 rounded-lg bg-white px-2 py-1.5 text-xs shrink-0">
                           <select
                              value={timeFilterField}
                              onChange={(e) => {
                                 setTimeFilterField(e.target.value as typeof timeFieldOptions[number]['id']);
                              }}
                              className="outline-none bg-transparent font-semibold text-slate-600"
                           >
                              {timeFieldOptions.map((option) => (
                                 <option key={option.id} value={option.id}>{option.label}</option>
                              ))}
                           </select>
                        </div>

                        <div className="flex items-center gap-2 border border-slate-200 rounded-lg bg-white px-2 py-1.5 text-xs shrink-0">
                           <select
                              value={timeRangeType}
                              onChange={(e) => {
                                 const nextRange = e.target.value;
                                 setTimeRangeType(nextRange);
                                 setShowTimePicker(nextRange === 'custom');
                                 if (nextRange !== 'custom') {
                                    setCustomRange(null);
                                 }
                              }}
                              className="outline-none bg-transparent font-semibold text-slate-600"
                           >
                              {timePresets.map((preset) => (
                                 <option key={preset.id} value={preset.id}>{preset.label}</option>
                              ))}
                           </select>
                        </div>
                        </div>

                        {showTimePicker && timeRangeType === 'custom' && (
                           <div className="flex items-center gap-2 flex-wrap">
                              <input
                                 type="date"
                                 value={customRange?.start || ''}
                                 onChange={(e) => setCustomRange(prev => ({ start: e.target.value, end: prev?.end || '' }))}
                                 className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 outline-none focus:border-blue-300"
                              />
                              <span className="text-xs font-semibold text-slate-500">đến</span>
                              <input
                                 type="date"
                                 value={customRange?.end || ''}
                                 onChange={(e) => setCustomRange(prev => ({ start: prev?.start || '', end: e.target.value }))}
                                 className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 outline-none focus:border-blue-300"
                              />
                              <button
                                 onClick={() => {
                                    setCustomRange(null);
                                    setTimeRangeType('all');
                                    setShowTimePicker(false);
                                 }}
                                 className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50"
                              >
                                 Xóa
                              </button>
                           </div>
                        )}
                     </div>

                     <div className="flex items-center justify-end gap-2">
                        <div className="flex bg-white px-1 py-0.5 rounded-lg border border-slate-200 shadow-sm">
                           <button onClick={() => setViewMode('list')} className={`p-1 rounded ${viewMode === 'list' ? 'bg-blue-50 text-blue-600 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'}`} title="Dạng danh sách"><ListIcon size={15} /></button>
                           <button onClick={() => setViewMode('kanban')} className={`p-1 rounded ${viewMode === 'kanban' ? 'bg-blue-50 text-blue-600 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'}`} title="Dạng kanban"><Layout size={15} /></button>
                           <button onClick={() => setViewMode('pivot')} className={`p-1 rounded ${viewMode === 'pivot' ? 'bg-blue-50 text-blue-600 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'}`} title="Báo cáo pivot"><LayoutGrid size={15} /></button>
                        </div>

                        <div className="relative shrink-0">
                           <button
                              onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-bold hover:bg-white text-slate-600 bg-slate-100 shadow-sm transition-all whitespace-nowrap"
                           >
                              <Settings size={13} /> Cột
                           </button>
                           {showColumnDropdown && (
                              <>
                                 <div className="fixed inset-0 z-30" onClick={() => setShowColumnDropdown(false)}></div>
                                 <div className="absolute right-0 top-full mt-2 w-[400px] max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-xl shadow-xl z-40 p-3 animate-in fade-in zoom-in-95">
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

                        <div className="text-xs text-slate-500 font-mono whitespace-nowrap shrink-0">
                           Tổng số: <span className="font-bold text-slate-900">{filteredLeads.length}</span> records
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>

         {/* DATA GRID */}
         <div className="flex-1 overflow-auto bg-white custom-scrollbar relative">
            {viewMode === 'pivot' ? (
               <div className="p-4 h-full overflow-auto animate-in fade-in">
                  <LeadPivotTable leads={filteredLeads} />
               </div>
            ) : viewMode === 'kanban' ? (
               <div className="p-4 h-full overflow-auto animate-in fade-in">
                  {filteredLeads.length === 0 ? (
                     <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-3">
                        <Inbox size={36} className="text-slate-300" />
                        <p>Chưa có lead trong chế độ Kanban.</p>
                     </div>
                  ) : (
                     <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 h-full min-h-[520px]">
                        {kanbanColumns.map((column) => (
                           <div key={column.key} className={`rounded-xl border p-3 h-full min-h-[280px] flex flex-col ${column.color}`}>
                              <div className="flex items-center justify-between mb-3">
                                 <h4 className="text-sm font-bold text-slate-700">{column.title}</h4>
                                 <span className="text-xs px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600 font-semibold">{column.leads.length}</span>
                              </div>
                              <div className="space-y-2 flex-1 overflow-auto pr-1">
                                 {column.leads.map((lead) => (
                                    <div
                                       key={lead.id}
                                       onClick={() => setSelectedLead(lead)}
                                       className="bg-white border border-slate-200 rounded-lg p-3 cursor-pointer hover:shadow-sm transition"
                                    >
                                       <div className="flex items-start justify-between gap-2">
                                          <div className="min-w-0">
                                             <p className="text-sm font-bold text-slate-800 truncate">{lead.name}</p>
                                             <p className="text-xs text-slate-500 truncate">{lead.phone}</p>
                                          </div>
                                          <button
                                             onClick={(e) => handleCall(e, lead)}
                                             className="p-1 rounded bg-green-100 text-green-700 hover:bg-green-200 shrink-0"
                                             title="Gọi ngay"
                                          >
                                             <Phone size={13} />
                                          </button>
                                       </div>
                                       <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
                                          <span className="px-1.5 py-0.5 rounded bg-slate-100">{lead.source || '-'}</span>
                                          <span className="truncate">{(lead as any).company || (lead as any).city || '-'}</span>
                                       </div>
                                    </div>
                                 ))}
                              </div>
                           </div>
                        ))}
                     </div>
                  )}
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
                        <th className="w-12 p-3 border-r border-slate-200 text-center">
                           <Phone size={12} className="mx-auto text-slate-400" />
                        </th>

                        {visibleColumns.includes('opportunity') && <th className="p-3 border-r border-slate-200 whitespace-nowrap text-left">Tên lead</th>}
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
                     {filteredLeads.length === 0 ? (
                        <tr>
                           <td colSpan={Math.max(visibleColumns.length + 1, 2)} className="px-6 py-14 text-center text-slate-500">
                              <div className="flex flex-col items-center gap-3">
                                 <Inbox size={34} className="text-slate-300" />
                                 <p>Chưa có lead trong danh sách hiện tại.</p>
                                 {leads.length === 0 && (
                                    <button
                                       onClick={openCreateLeadModal}
                                       className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded text-xs font-bold transition-all shadow-sm"
                                    >
                                       <UserPlus size={14} /> Tạo lead cho tôi
                                    </button>
                                 )}
                              </div>
                           </td>
                        </tr>
                     ) : groupBy === 'none' ? renderTableRows(filteredLeads) : (
                        Object.entries(groupedLeads).map(([groupName, items]) => (
                           <React.Fragment key={groupName}>
                              <tr className="bg-slate-100 border-y border-slate-200">
                                 <td colSpan={Math.max(visibleColumns.length + 1, 2)} className="px-4 py-2 font-bold text-slate-700 text-xs uppercase flex items-center gap-2">
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

         {showCreateLeadModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
               <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowCreateLeadModal(false)}></div>
               <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                  <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
                     <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <UserPlus size={20} className="text-blue-600" />
                        Thêm Cơ hội / Lead Mới
                     </h3>
                     <div className="flex items-center gap-3">
                        <button className="px-3 py-1.5 bg-white border border-slate-300 rounded text-slate-600 flex items-center gap-2 text-sm font-semibold hover:bg-slate-50">
                           <Phone size={16} /> Cuộc gọi
                        </button>
                        <button onClick={() => setShowCreateLeadModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                     </div>
                  </div>

                  <div className="flex-1 overflow-y-auto bg-white p-6 md:p-8 custom-scrollbar">
                     <div className="mb-6">
                        <label className="block text-slate-700 text-sm font-bold mb-2">Mô tả / Tên khách hàng <span className="text-red-500">*</span></label>
                        <div className="flex gap-3">
                           <select
                              className="w-28 px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none bg-white font-medium text-slate-700"
                              value={newLeadData.title}
                              onChange={e => setNewLeadData({ ...newLeadData, title: e.target.value })}
                           >
                              <option value="">Danh xưng</option>
                              <option value="Mr.">Anh</option>
                              <option value="Ms.">Chị</option>
                              <option value="Phụ huynh">Phụ huynh</option>
                              <option value="Học sinh">Học sinh</option>
                           </select>
                           <input
                              className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm font-semibold focus:border-purple-500 outline-none text-slate-800 placeholder:text-slate-400"
                              placeholder="VD: Nguyen Van A..."
                              value={newLeadData.name}
                              onChange={e => setNewLeadData({ ...newLeadData, name: e.target.value })}
                           />
                        </div>
                     </div>

                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-5">
                        <div className="space-y-4">
                           <div className="flex items-center gap-4">
                              <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Cơ sở</label>
                              <select
                                 className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none bg-white text-slate-700"
                                 value={newLeadData.company}
                                 onChange={e => setNewLeadData({ ...newLeadData, company: e.target.value })}
                              >
                                 <option value="">-- Chọn cơ sở --</option>
                                 <option value="Hanoi">Hà Nội</option>
                                 <option value="HCMC">TP. HCM</option>
                                 <option value="DaNang">Đà Nẵng</option>
                                 <option value="HaiPhong">Hải Phòng</option>
                              </select>
                           </div>

                           <div className="flex items-start gap-4">
                              <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold pt-2">Địa chỉ</label>
                              <div className="flex-1 space-y-2">
                                 <input
                                    className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none text-slate-700 placeholder:text-slate-400"
                                    placeholder="Số nhà, đường..."
                                    value={newLeadData.street}
                                    onChange={e => setNewLeadData({ ...newLeadData, street: e.target.value })}
                                 />
                                 <div className="grid grid-cols-3 gap-2">
                                    <input
                                       className="px-2 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none text-slate-700 placeholder:text-slate-400"
                                       placeholder="Tỉnh/TP"
                                       value={newLeadData.province}
                                       onChange={e => setNewLeadData({ ...newLeadData, province: e.target.value })}
                                    />
                                    <input
                                       className="px-2 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none text-slate-700 placeholder:text-slate-400"
                                       placeholder="Quận/Huyện"
                                       value={newLeadData.city}
                                       onChange={e => setNewLeadData({ ...newLeadData, city: e.target.value })}
                                    />
                                    <input
                                       className="px-2 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none text-slate-700 placeholder:text-slate-400"
                                       placeholder="P/Xã"
                                       value={newLeadData.ward}
                                       onChange={e => setNewLeadData({ ...newLeadData, ward: e.target.value })}
                                    />
                                 </div>
                              </div>
                           </div>

                           <div className="flex items-center gap-4">
                              <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Sản phẩm</label>
                              <select
                                 className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none bg-white text-slate-700"
                                 value={newLeadData.product}
                                 onChange={e => setNewLeadData({ ...newLeadData, product: e.target.value })}
                              >
                                 <option value="">-- Chọn sản phẩm --</option>
                                 <option value="Tiếng Đức">Tiếng Đức</option>
                                 <option value="Du học Đức">Du học Đức</option>
                                 <option value="Du học Nghề">Du học Nghề</option>
                                 <option value="XKLĐ">Xuất khẩu lao động</option>
                              </select>
                           </div>

                           <div className="flex items-center gap-4">
                              <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Thị trường</label>
                              <select
                                 className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none bg-white text-slate-700"
                                 value={newLeadData.market}
                                 onChange={e => setNewLeadData({ ...newLeadData, market: e.target.value })}
                              >
                                 <option value="">-- Chọn --</option>
                                 <option value="Vinh">Vinh</option>
                                 <option value="Hà Tĩnh">Hà Tĩnh</option>
                                 <option value="Hà Nội">Hà Nội</option>
                                 <option value="Online">Online</option>
                              </select>
                           </div>
                        </div>

                        <div className="space-y-4">
                           <div className="flex items-center gap-4">
                              <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Điện thoại <span className="text-red-500">*</span></label>
                              <input
                                 className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none text-slate-800 font-medium"
                                 placeholder="0912..."
                                 value={newLeadData.phone}
                                 onChange={e => setNewLeadData({ ...newLeadData, phone: e.target.value })}
                              />
                           </div>

                           <div className="flex items-center gap-4">
                              <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Email</label>
                              <input
                                 className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none text-slate-700 placeholder:text-slate-400"
                                 placeholder="email@example.com"
                                 value={newLeadData.email}
                                 onChange={e => setNewLeadData({ ...newLeadData, email: e.target.value })}
                              />
                           </div>

                           <div className="flex items-center gap-4">
                              <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Phụ trách</label>
                              <select
                                 className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none bg-white text-slate-700"
                                 value={newLeadData.salesperson}
                                 onChange={e => setNewLeadData({ ...newLeadData, salesperson: e.target.value })}
                              >
                                 <option value="">-- Sale phụ trách --</option>
                                 {SALES_REPS.map(rep => (
                                    <option key={rep.id} value={rep.id}>{rep.name}</option>
                                 ))}
                              </select>
                           </div>

                           <div className="flex items-center gap-4">
                              <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Trạng thái</label>
                              <select
                                 className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none bg-white text-slate-700"
                                 value={newLeadData.status}
                                 onChange={e => setNewLeadData({ ...newLeadData, status: e.target.value })}
                              >
                                 <option value="NEW">Mới</option>
                                 <option value="CONTACTED">Đã liên hệ</option>
                                 <option value="QUALIFIED">Tiềm năng</option>
                                 <option value="LOST">Thất bại</option>
                              </select>
                           </div>

                           <div className="flex items-start gap-4">
                              <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold mt-1.5">Tags</label>
                              <div className="flex-1 flex flex-col gap-1.5">
                                 <div className="flex gap-2">
                                    {!isAddingTag ? (
                                       <select
                                          className="flex-1 px-2 py-1.5 border border-slate-300 rounded text-xs bg-white outline-none focus:border-purple-500"
                                          onChange={(e) => {
                                             if (e.target.value === 'khác') {
                                                setIsAddingTag(true);
                                             } else if (e.target.value && !newLeadData.tags.includes(e.target.value)) {
                                                setNewLeadData({ ...newLeadData, tags: [...newLeadData.tags, e.target.value] });
                                             }
                                             e.target.value = "";
                                          }}
                                       >
                                          <option value="">-- Chọn Tag --</option>
                                          {availableTags.filter(t => !newLeadData.tags.includes(t)).map(t => (
                                             <option key={t} value={t}>{t}</option>
                                          ))}
                                          <option value="khác" className="font-bold text-blue-600">+ Khác</option>
                                       </select>
                                    ) : (
                                       <input
                                          autoFocus
                                          className="flex-1 px-2 py-1.5 border border-purple-400 rounded text-xs outline-none ring-2 ring-purple-100"
                                          placeholder="Nhập tag mới rồi ấn Enter..."
                                          onBlur={() => setIsAddingTag(false)}
                                          onKeyDown={(e) => {
                                             if (e.key === 'Enter') {
                                                e.preventDefault();
                                                const val = (e.target as HTMLInputElement).value.trim();
                                                if (val) {
                                                   if (!newLeadData.tags.includes(val)) {
                                                      setNewLeadData({ ...newLeadData, tags: [...newLeadData.tags, val] });
                                                   }
                                                   if (!availableTags.includes(val)) {
                                                      const newAvailable = [...availableTags, val];
                                                      setAvailableTags(newAvailable);
                                                      saveTags(newAvailable);
                                                   }
                                                   setIsAddingTag(false);
                                                }
                                             } else if (e.key === 'Escape') {
                                                setIsAddingTag(false);
                                             }
                                          }}
                                       />
                                    )}
                                 </div>
                                 {newLeadData.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                       {newLeadData.tags.map(tag => (
                                          <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-bold rounded border border-purple-100">
                                             {tag}
                                             <button onClick={() => setNewLeadData({ ...newLeadData, tags: newLeadData.tags.filter(t => t !== tag) })} className="hover:text-purple-900 transition-colors">
                                                <X size={10} strokeWidth={3} />
                                             </button>
                                          </span>
                                       ))}
                                    </div>
                                 )}
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className="mt-8 border-t border-slate-200 pt-4">
                        <div className="flex border-b border-slate-200 mb-4">
                           <button
                              onClick={() => setCreateModalActiveTab('notes')}
                              className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${createModalActiveTab === 'notes' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                           >
                              Ghi chú nội bộ
                           </button>
                           <button
                              onClick={() => setCreateModalActiveTab('extra')}
                              className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${createModalActiveTab === 'extra' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                           >
                              Thông tin thêm (Marketing)
                           </button>
                        </div>

                        <div className="min-h-[200px]">
                           {createModalActiveTab === 'notes' && (
                              <div className="animate-in fade-in duration-200">
                                 <textarea
                                    className="w-full p-3 border border-slate-200 rounded text-sm focus:border-purple-500 outline-none text-slate-700 h-40"
                                    placeholder="Viết ghi chú..."
                                    value={newLeadData.notes}
                                    onChange={e => setNewLeadData({ ...newLeadData, notes: e.target.value })}
                                 />
                              </div>
                           )}

                           {createModalActiveTab === 'extra' && (
                              <div className="grid grid-cols-2 gap-x-12 gap-y-4 animate-in fade-in duration-200">
                                 <div className="flex items-center gap-4">
                                    <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Chiến dịch</label>
                                    <input
                                       className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none text-slate-700"
                                       value={newLeadData.campaign}
                                       onChange={e => setNewLeadData({ ...newLeadData, campaign: e.target.value })}
                                    />
                                 </div>
                                 <div className="flex items-center gap-4">
                                    <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Nguồn</label>
                                    <select
                                       className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none bg-white text-slate-700"
                                       value={newLeadData.source}
                                       onChange={e => setNewLeadData({ ...newLeadData, source: e.target.value })}
                                    >
                                       <option value="hotline">Hotline</option>
                                       <option value="facebook">Facebook</option>
                                       <option value="google">Google Ads</option>
                                       <option value="referral">Giới thiệu</option>
                                    </select>
                                 </div>
                                 <div className="flex items-center gap-4">
                                    <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Kênh</label>
                                    <select
                                       className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none bg-white text-slate-700"
                                       value={newLeadData.channel}
                                       onChange={e => setNewLeadData({ ...newLeadData, channel: e.target.value })}
                                    >
                                       <option value="">-- Chọn kênh --</option>
                                       {LEAD_CHANNEL_OPTIONS.map(option => (
                                          <option key={option.value} value={option.value}>{option.label}</option>
                                       ))}
                                    </select>
                                 </div>
                                 <div className="flex items-center gap-4">
                                    <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Người GT</label>
                                    <input
                                       className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none text-slate-700"
                                       value={newLeadData.referredBy}
                                       onChange={e => setNewLeadData({ ...newLeadData, referredBy: e.target.value })}
                                    />
                                 </div>
                              </div>
                           )}
                        </div>
                     </div>
                  </div>

                  <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 shrink-0">
                     <button onClick={() => setShowCreateLeadModal(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg">Hủy bỏ</button>
                     <button onClick={handleCreateMyLead} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center gap-2 shadow-sm"><Save size={18} /> Lưu Lead mới</button>
                  </div>
               </div>
            </div>
         )}

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
