import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom'; // Add import
import { useAuth } from '../contexts/AuthContext';
import { getLeads, saveLead, saveLeads, addContact, addDeal, convertLeadToContact, getClosedLeadReasons, getTags, saveTags, getLeadActivitiesForConversion } from '../utils/storage';
import { LeadStatus, ILead, IDeal, DealStage, UserRole } from '../types';
import UnifiedLeadDrawer from '../components/UnifiedLeadDrawer';
import LeadDrawerProfileForm from '../components/LeadDrawerProfileForm';
import LeadPivotTable from '../components/LeadPivotTable';
import LeadStudentInfoTab from '../components/LeadStudentInfoTab';
import LeadTagManager from '../components/LeadTagManager';
import SLABadge from '../components/SLABadge';
import OdooSearchBar, { SearchFilter, SearchFieldConfig } from '../components/OdooSearchBar';
import SLAWarningBanner from '../components/SLAWarningBanner';
import SalesRoleTestSwitcher from '../components/SalesRoleTestSwitcher';
import { buildDomainFromFilters, applyDomainFilter, getGroupByFields } from '../utils/filterDomain';
import { calculateSLAWarnings, getUrgentWarningCount } from '../utils/slaUtils';
import { LEAD_CHANNEL_OPTIONS } from '../constants';
import {
   buildLeadStudentInfo,
   createLeadInitialState,
   getLeadGuardianRelation,
   LEAD_CAMPUS_OPTIONS,
   LEAD_RELATION_OPTIONS,
   LEAD_TARGET_COUNTRY_OPTIONS,
   LeadCreateFormData,
   LeadCreateModalTab,
   resolveLeadCampus,
} from '../utils/leadCreateForm';
import { FIXED_LEAD_TAGS } from '../utils/storage';
import { appendLeadLogs, buildLeadActivityLog, buildLeadAuditChange, buildLeadAuditLog } from '../utils/leadLogs';
import { useSalesTestRole } from '../utils/salesTestRole';
import {
   getLeadStatusLabel,
   isClosedLeadStatusKey,
   LEAD_STATUS_KEYS,
   LEAD_STATUS_OPTIONS,
   normalizeLeadStatusKey,
   toLeadStatusValue,
} from '../utils/leadStatus';
import { decodeMojibakeReactNode, decodeMojibakeText } from '../utils/mojibake';
import { getLeadPhoneValidationMessage, normalizeLeadPhone } from '../utils/phone';
import { clearLeadReclaimTracking } from '../utils/leadSla';
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
   const { salesTestRole } = useSalesTestRole(user?.role);
   const isSalesLeader = salesTestRole === UserRole.SALES_LEADER;

   const SALES_REPS = [
      { id: 'u1', name: 'Tráº§n VÄƒn Quáº£n Trá»‹' },
      { id: 'u2', name: 'Sarah Miller' },
      { id: 'u3', name: 'David Clark' },
      { id: 'u4', name: 'Alex Rivera' },
   ];

   const normalizeOwnerToken = useCallback((value?: string) => decodeMojibakeText(String(value || '')).trim().toLowerCase(), []);

   const isLeadAllocated = useCallback((lead: ILead) => Boolean(normalizeOwnerToken(lead.ownerId)), [normalizeOwnerToken]);

   const isLeadVisibleToCurrentUser = useCallback((lead: ILead) => {
      if (!user) return false;
      if (isSalesLeader) return isLeadAllocated(lead);

      const ownerToken = normalizeOwnerToken(lead.ownerId);
      if (!ownerToken) return false;

      return [normalizeOwnerToken(user.id), normalizeOwnerToken(user.name)].includes(ownerToken);
   }, [isLeadAllocated, isSalesLeader, normalizeOwnerToken, user]);

   const applyLeadScope = useCallback((allLeads: ILead[]) => {
      const scopedLeads = allLeads.filter(isLeadVisibleToCurrentUser);
      setLeads(scopedLeads);
      setSelectedIds((prev) => prev.filter((id) => scopedLeads.some((lead) => lead.id === id)));
      setSelectedLead((prev) => (prev ? scopedLeads.find((lead) => lead.id === prev.id) || null : null));
      return scopedLeads;
   }, [isLeadVisibleToCurrentUser]);

   const myLeadsTitle = isSalesLeader ? 'Lead đã được phân bổ' : 'Lead của tôi';
   const myLeadsEmptyLabel = isSalesLeader ? 'Chưa có lead đã phân bổ trong danh sách hiện tại.' : 'Chưa có lead trong danh sách hiện tại.';

   const NEW_LEAD_INITIAL_STATE = createLeadInitialState(user?.id || ''); /*
      name: '',
      phone: '',
      email: '',
      source: 'hotline',
      program: 'Tiáº¿ng Äá»©c',
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
   }; */
   const CUSTOM_CLOSE_REASON = 'LÃ½ do khÃ¡c';
   const isClosedLeadStatus = isClosedLeadStatusKey;

   const resolveCloseReason = (reason: string, customReason?: string) =>
      reason === CUSTOM_CLOSE_REASON ? customReason?.trim() || '' : reason;

   const validateCloseReason = (status: string, reason: string, customReason?: string) => {
      if (!isClosedLeadStatus(status)) return null;
      if (!reason) return 'Vui lÃ²ng chá»n lÃ½ do.';
      if (reason === CUSTOM_CLOSE_REASON && !customReason?.trim()) {
         return 'Vui lÃ²ng nháº­p lÃ½ do cá»¥ thá»ƒ.';
      }
      return null;
   };

   const getCloseReasonOptions = (status?: string) =>
      getClosedLeadReasons(normalizeLeadStatusKey(status));

   const getCloseReasonStateForStatusChange = (status: string, reason: string, customReason?: string) => {
      if (!isClosedLeadStatus(status)) {
         return { lossReason: '', lossReasonCustom: '' };
      }

      const resolvedReason = resolveCloseReason(reason, customReason);
      if (!resolvedReason) {
         return { lossReason: '', lossReasonCustom: '' };
      }

      const reasonOptions = getCloseReasonOptions(status);
      if (reasonOptions.includes(resolvedReason)) {
         return { lossReason: resolvedReason, lossReasonCustom: '' };
      }

      return { lossReason: '', lossReasonCustom: '' };
   };

   // Data State
   const [leads, setLeads] = useState<ILead[]>([]);
   const [searchFilters, setSearchFilters] = useState<SearchFilter[]>([]);
   const [selectedIds, setSelectedIds] = useState<string[]>([]);
   const [statusFilter, setStatusFilter] = useState<string>('all');

   // UI State
   const [showConfetti, setShowConfetti] = useState(false);
   const [showCreateLeadModal, setShowCreateLeadModal] = useState(false);
   const [newLeadData, setNewLeadData] = useState<LeadCreateFormData>(NEW_LEAD_INITIAL_STATE);
   const [createModalActiveTab, setCreateModalActiveTab] = useState<LeadCreateModalTab>('notes');
   const [availableTags, setAvailableTags] = useState<string[]>([]);
   const [isAddingTag, setIsAddingTag] = useState(false);
   const leadSalesOptions = useMemo(
      () => SALES_REPS.map((rep) => ({ id: rep.id, value: rep.id, label: rep.name })),
      []
   );
   const newCloseReasonOptions = useMemo(() => getCloseReasonOptions(newLeadData.status), [newLeadData.status]);
   const patchNewLeadData = (patch: Partial<LeadCreateFormData>) => {
      setNewLeadData((prev) => ({ ...prev, ...patch }));
   };
   const addTagCatalogEntry = (tag: string) => {
      const value = tag.trim();
      if (!value) return;
      const nextTags = saveTags([...availableTags, value]);
      setAvailableTags(nextTags);
   };
   const deleteTagCatalogEntry = (tag: string) => {
      if (FIXED_LEAD_TAGS.includes(tag as typeof FIXED_LEAD_TAGS[number])) return;
      const nextTags = saveTags(availableTags.filter((item) => item !== tag));
      setAvailableTags(nextTags);
      setNewLeadData((prev) => ({ ...prev, tags: prev.tags.filter((item) => item !== tag) }));
   };
   const addTagToNewLead = (tag: string) => {
      setNewLeadData((prev) => (
         prev.tags.includes(tag)
            ? prev
            : { ...prev, tags: [...prev.tags, tag] }
      ));
   };

   // Pivot/Group State
   const [groupBy, setGroupBy] = useState<'none' | 'source' | 'status' | 'program' | 'city'>('none');
   const [viewMode, setViewMode] = useState<'list' | 'pivot' | 'kanban'>('list');
   const [filterType, setFilterType] = useState('all');
   const [statusFilterSource, setStatusFilterSource] = useState<'tabs' | 'advanced' | null>(null);

   // Drawer State
   const [selectedLead, setSelectedLead] = useState<ILead | null>(null);

   // Column Management
   const ALL_COLUMNS = [
      { id: 'opportunity', label: 'Tên liên hệ' },
      { id: 'company', label: 'Cơ sở / Công ty' },
      { id: 'contact', label: 'Tên liên hệ phụ' },
      { id: 'createdAt', label: 'Ngày đổ lead' },
      { id: 'title', label: 'Danh xưng' },
      { id: 'email', label: 'Email' },
      { id: 'phone', label: 'SĐT' },
      { id: 'address', label: 'Địa chỉ' },
      { id: 'salesperson', label: 'Nhân viên Sale' },
      { id: 'campaign', label: 'Chiến dịch' },
      { id: 'source', label: 'Nguồn kênh' },
      { id: 'potential', label: 'Mức độ tiềm năng' },
      { id: 'tags', label: 'Tags' },
      { id: 'referredBy', label: 'Người giới thiệu' },
      { id: 'market', label: 'THỊ TRƯỜNG' },
      { id: 'product', label: 'SẢN PHẨM QUAN TÂM' },
      { id: 'notes', label: 'Ghi chú' },
      { id: 'nextActivity', label: 'Hoạt động tiếp theo' },
      { id: 'deadline', label: 'Hạn chót' },
      { id: 'value', label: 'Doanh thu' },
      { id: 'status', label: 'Trạng thái' },
      { id: 'sla', label: 'Cảnh báo SLA' },
   ];

   const [visibleColumns, setVisibleColumns] = useState<string[]>([
      'opportunity', 'company', 'email', 'phone', 'salesperson', 'source', 'potential', 'tags', 'product', 'status'
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
      { id: 'createdAt', label: 'NgÃ y táº¡o' },
      { id: 'lastInteraction', label: 'Láº§n tÆ°Æ¡ng tÃ¡c cuá»‘i' },
      { id: 'expectedClosingDate', label: 'NgÃ y dá»± kiáº¿n chá»‘t' },
      { id: 'pickUpDate', label: 'NgÃ y tiáº¿p nháº­n' },
   ] as const;

   const timePresets = [
      { id: 'all', label: 'Táº¥t cáº£ thá»i gian' },
      { id: 'today', label: 'HÃ´m nay' },
      { id: 'yesterday', label: 'HÃ´m qua' },
      { id: 'thisWeek', label: 'Tuáº§n nÃ y' },
      { id: 'last7Days', label: '7 ngÃ y qua' },
      { id: 'last30Days', label: '30 ngÃ y qua' },
      { id: 'thisMonth', label: 'ThÃ¡ng nÃ y' },
      { id: 'lastMonth', label: 'ThÃ¡ng trÆ°á»›c' },
      { id: 'custom', label: 'TÃ¹y chá»‰nh khoáº£ng...' },
   ];

   const filterTypeLabels: Record<string, string> = {
      'no-activity': 'ChÆ°a cÃ³ hoáº¡t Ä‘á»™ng',
      'high-value': 'CÆ¡ há»™i giÃ¡ trá»‹ cao',
   };

   const groupByLabels: Record<string, string> = {
      none: 'KhÃ´ng nhÃ³m',
      salesperson: 'ChuyÃªn viÃªn sales',
      status: 'Giai Ä‘oáº¡n',
      city: 'ThÃ nh phá»‘',
      program: 'ChÆ°Æ¡ng trÃ¬nh',
      source: 'Nguá»“n',
   };

   const statusFilterLabels: Record<string, string> = {
      overdue: 'DS qua han',
      today_care: 'Cham soc hom nay',
      [LEAD_STATUS_KEYS.ASSIGNED]: 'Da phan bo',
      [LEAD_STATUS_KEYS.PICKED]: 'Da nhan',
      [LEAD_STATUS_KEYS.CONTACTED]: 'Dang cham soc',
      [LEAD_STATUS_KEYS.CONVERTED]: 'Da convert',
      [LEAD_STATUS_KEYS.NURTURING]: 'Nuoi duong',
      [LEAD_STATUS_KEYS.UNVERIFIED]: 'Khong xac thuc',
      [LEAD_STATUS_KEYS.LOST]: 'Mat',
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
      { field: 'name', label: 'TÃªn khÃ¡ch hÃ ng', category: 'ThÃ´ng tin cÆ¡ báº£n', type: 'filter' },
      { field: 'phone', label: 'Sá»‘ Ä‘iá»‡n thoáº¡i', category: 'ThÃ´ng tin cÆ¡ báº£n', type: 'filter' },
      { field: 'email', label: 'Email', category: 'ThÃ´ng tin cÆ¡ báº£n', type: 'filter' },
      { field: 'city', label: 'ThÃ nh phá»‘', category: 'Äá»‹a Ä‘iá»ƒm', type: 'filter' },
      { field: 'program', label: 'ChÆ°Æ¡ng trÃ¬nh', category: 'ChÆ°Æ¡ng trÃ¬nh há»c', type: 'filter' },
      { field: 'source', label: 'Nguá»“n', category: 'Marketing', type: 'filter' },
      { field: 'status', label: 'Giai Ä‘oáº¡n', category: 'Tráº¡ng thÃ¡i', type: 'filter' },
      { field: 'ownerId', label: 'NgÆ°á»i phá»¥ trÃ¡ch', category: 'PhÃ¢n cÃ´ng', type: 'filter' },

      // Group By
      { field: 'status', label: 'NhÃ³m theo Giai Ä‘oáº¡n', category: 'NhÃ³m dá»¯ liá»‡u', type: 'groupby' },
      { field: 'source', label: 'NhÃ³m theo Nguá»“n', category: 'NhÃ³m dá»¯ liá»‡u', type: 'groupby' },
      { field: 'program', label: 'NhÃ³m theo ChÆ°Æ¡ng trÃ¬nh', category: 'NhÃ³m dá»¯ liá»‡u', type: 'groupby' },
      { field: 'city', label: 'NhÃ³m theo ThÃ nh phá»‘', category: 'NhÃ³m dá»¯ liá»‡u', type: 'groupby' },
   ];

   const reloadMyLeads = useCallback(() => {
      const allLeads = getLeads();
      applyLeadScope(allLeads);
   }, [applyLeadScope]);

   const handleCreateMyLeadLegacy = () => {
      if (!user?.id) {
         alert('KhÃ´ng xÃ¡c Ä‘á»‹nh Ä‘Æ°á»£c tÃ i khoáº£n sale.');
         return;
      }

      if (!newLeadData.name?.trim()) {
         alert('Vui lÃ²ng nháº­p tÃªn khÃ¡ch hÃ ng.');
         return;
      }
      if (!newLeadData.phone?.trim()) {
         alert('Vui lÃ²ng nháº­p sá»‘ Ä‘iá»‡n thoáº¡i.');
         return;
      }
      const normalizedPhone = normalizeLeadPhone(newLeadData.phone);
      const phoneError = getLeadPhoneValidationMessage(newLeadData.phone);
      if (phoneError) {
         alert(phoneError);
         return;
      }
      if (!newLeadData.company) {
         alert("Vui lÃ²ng chá»n CÆ¡ sá»Ÿ / Company Base");
         return;
      }
      const closeReasonError = validateCloseReason(newLeadData.status, newLeadData.lossReason, newLeadData.lossReasonCustom);
      if (closeReasonError) {
         alert(closeReasonError);
         return;
      }

      const mappedStatus = toLeadStatusValue(newLeadData.status);

      const program = (newLeadData.product && ['Tiáº¿ng Äá»©c', 'Tiáº¿ng Trung', 'Du há»c Äá»©c', 'Du há»c Trung', 'Du há»c nghá» Ãšc'].includes(newLeadData.product))
         ? newLeadData.product as ILead['program']
         : newLeadData.program as ILead['program'];

      const nowIso = new Date().toISOString();
      const leadBase: ILead = {
         id: `l-${Date.now()}`,
         ...newLeadData,
         phone: normalizedPhone,
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
         slaStatus: 'normal'
      };
      const lead = appendLeadLogs(leadBase, {
         activities: [
            buildLeadActivityLog({
               type: 'system',
               timestamp: nowIso,
               title: 'Táº¡o lead',
               description: `Lead Ä‘Æ°á»£c táº¡o bá»Ÿi ${user.name || 'TÃ´i'} tá»« My Leads.`,
               user: user.name || 'System'
            })
         ],
         audits: [
            buildLeadAuditLog({
               action: 'lead_created',
               actor: user.name || 'System',
               actorType: 'user',
               timestamp: nowIso,
               changes: [
                  buildLeadAuditChange('name', '', newLeadData.name.trim(), 'TÃªn lead'),
                  buildLeadAuditChange('phone', '', newLeadData.phone.trim(), 'Sá»‘ Ä‘iá»‡n thoáº¡i'),
                  buildLeadAuditChange('ownerId', '', newLeadData.salesperson || user.id, 'Sale phá»¥ trÃ¡ch'),
                  buildLeadAuditChange('status', '', mappedStatus, 'Tráº¡ng thÃ¡i')
               ]
            })
         ]
      });

      saveLead(lead);
      reloadMyLeads();
      setShowCreateLeadModal(false);
      setCreateModalActiveTab('notes');
      setNewLeadData({
         ...NEW_LEAD_INITIAL_STATE,
         salesperson: user.id
      });
      alert('Táº¡o Lead thÃ nh cÃ´ng!');
   };

   const handleCreateMyLead = () => {
      if (!user?.id) {
         alert('KhÃ´ng xÃ¡c Ä‘á»‹nh Ä‘Æ°á»£c tÃ i khoáº£n sale.');
         return;
      }

      if (!newLeadData.name.trim()) {
         alert('Vui lÃ²ng nháº­p tÃªn khÃ¡ch hÃ ng.');
         return;
      }
      if (!newLeadData.phone.trim()) {
         alert('Vui lÃ²ng nháº­p sá»‘ Ä‘iá»‡n thoáº¡i.');
         return;
      }
      const normalizedPhone = normalizeLeadPhone(newLeadData.phone);
      const phoneError = getLeadPhoneValidationMessage(newLeadData.phone);
      if (phoneError) {
         alert(phoneError);
         return;
      }
      if (!newLeadData.targetCountry) {
         alert('Vui lÃ²ng chá»n Quá»‘c gia má»¥c tiÃªu');
         return;
      }

      const mappedStatus = toLeadStatusValue(newLeadData.status);
      const program = (
         newLeadData.product &&
         ['Tiáº¿ng Äá»©c', 'Tiáº¿ng Trung', 'Du há»c Äá»©c', 'Du há»c Trung', 'Du há»c nghá» Ãšc'].includes(newLeadData.product)
      )
         ? newLeadData.product as ILead['program']
         : newLeadData.program as ILead['program'];

      const nowIso = new Date().toISOString();
      const campus = resolveLeadCampus(newLeadData);
      const guardianRelation = getLeadGuardianRelation(newLeadData.title);
      const studentInfo = buildLeadStudentInfo(newLeadData);
      const resolvedCloseReason = resolveCloseReason(newLeadData.lossReason, newLeadData.lossReasonCustom);
      const leadBase: ILead = {
         id: `l-${Date.now()}`,
         ...newLeadData,
         phone: normalizedPhone,
         program,
         ownerId: newLeadData.salesperson || user.id,
         company: campus || undefined,
         targetCountry: newLeadData.targetCountry,
         educationLevel: newLeadData.studentEducationLevel || undefined,
         dob: newLeadData.studentDob || undefined,
         identityCard: newLeadData.studentIdentityCard || undefined,
         address: newLeadData.street.trim() || undefined,
         city: newLeadData.province.trim() || undefined,
         district: newLeadData.city.trim() || undefined,
         ward: newLeadData.ward.trim() || undefined,
         guardianName: guardianRelation ? newLeadData.name.trim() || undefined : undefined,
         guardianPhone: guardianRelation ? normalizedPhone || undefined : undefined,
         guardianRelation,
         lostReason: isClosedLeadStatus(newLeadData.status) ? resolvedCloseReason : undefined,
         studentInfo,
         marketingData: {
            tags: newLeadData.tags,
            campaign: newLeadData.campaign,
            channel: newLeadData.channel,
            market: campus || undefined,
            region: newLeadData.company.trim() || undefined
         },
         status: mappedStatus,
         createdAt: nowIso,
         score: 10,
         lastActivityDate: nowIso,
         lastInteraction: nowIso,
         slaStatus: 'normal'
      };
      const lead = appendLeadLogs(leadBase, {
         activities: [
            buildLeadActivityLog({
               type: 'system',
               timestamp: nowIso,
               title: 'Táº¡o lead',
               description: `Lead Ä‘Æ°á»£c táº¡o bá»Ÿi ${user.name || 'TÃ´i'} tá»« My Leads.`,
               user: user.name || 'System'
            })
         ],
         audits: [
            buildLeadAuditLog({
               action: 'lead_created',
               actor: user.name || 'System',
               actorType: 'user',
               timestamp: nowIso,
               changes: [
                  buildLeadAuditChange('name', '', newLeadData.name.trim(), 'TÃªn lead'),
                  buildLeadAuditChange('phone', '', newLeadData.phone.trim(), 'Sá»‘ Ä‘iá»‡n thoáº¡i'),
                  buildLeadAuditChange('ownerId', '', newLeadData.salesperson || user.id, 'Sale phá»¥ trÃ¡ch'),
                  buildLeadAuditChange('status', '', mappedStatus, 'Tráº¡ng thÃ¡i')
               ]
            })
         ]
      });

      saveLead(lead);
      reloadMyLeads();
      setShowCreateLeadModal(false);
      setCreateModalActiveTab('notes');
      setNewLeadData({
         ...NEW_LEAD_INITIAL_STATE,
         salesperson: user.id
      });
      alert('Táº¡o Lead thÃ nh cÃ´ng!');
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
      const syncTags = () => setAvailableTags(getTags());
      window.addEventListener('educrm:tags-changed', syncTags as EventListener);
      return () => window.removeEventListener('educrm:tags-changed', syncTags as EventListener);
   }, []);

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

   const getTodayCareActivityDateValue = (activity: any) =>
      String(activity?.datetime || activity?.timestamp || activity?.date || '');

   const getLeadTodayCareActivities = (lead: ILead) => {
      const { start, end } = getDateRangeToday();

      return (Array.isArray(lead.activities) ? lead.activities : [])
         .filter((activity: any) => {
            const rawType = String(activity?.type || '').toLowerCase();
            const rawStatus = String(activity?.status || '').toLowerCase();
            const activityDateValue = getTodayCareActivityDateValue(activity);
            if (!activityDateValue) return false;

            const activityTime = new Date(activityDateValue).getTime();
            if (Number.isNaN(activityTime)) return false;
            if (activityTime < start.getTime() || activityTime > end.getTime()) return false;

            const isPlannedAction = rawType === 'activity' || rawStatus === 'scheduled' || rawStatus === 'completed';
            return isPlannedAction;
         })
         .sort((a: any, b: any) => {
            const aCompleted = String(a?.status || '').toLowerCase() === 'completed';
            const bCompleted = String(b?.status || '').toLowerCase() === 'completed';
            if (Number(aCompleted) !== Number(bCompleted)) {
               return Number(aCompleted) - Number(bCompleted);
            }

            const aTime = new Date(getTodayCareActivityDateValue(a)).getTime();
            const bTime = new Date(getTodayCareActivityDateValue(b)).getTime();
            return aTime - bTime;
         });
   };

   const getLeadTodayCareActivity = (lead: ILead) => getLeadTodayCareActivities(lead)[0];

   const isTodayCareLead = (lead: ILead) => {
      return Boolean(getLeadTodayCareActivity(lead));
   };

   const overdueLeadsCount = useMemo(() => leads.filter(isOverdueLead).length, [leads]);
   const todayCareLeadsCount = useMemo(() => leads.filter(isTodayCareLead).length, [leads]);
   const assignedLeadsCount = useMemo(
      () => leads.filter((lead) => normalizeLeadStatusKey(String(lead.status || '')) === LEAD_STATUS_KEYS.ASSIGNED).length,
      [leads]
   );
   const statusTabs = useMemo(() => ([
      { id: 'all', label: 'Táº¥t cáº£', count: leads.length },
      { id: LEAD_STATUS_KEYS.ASSIGNED, label: 'Chá» tiáº¿p nháº­n', count: assignedLeadsCount },
      { id: 'overdue', label: 'DS quÃ¡ háº¡n', count: overdueLeadsCount },
      { id: 'today_care', label: 'ChÄƒm sÃ³c hÃ´m nay', count: todayCareLeadsCount },
   ]), [assignedLeadsCount, leads.length, overdueLeadsCount, todayCareLeadsCount]);

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
         result = result.filter(l => normalizeLeadStatusKey(String(l.status || '')) === statusFilter);
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
      return calculateSLAWarnings(filteredLeads);
   }, [filteredLeads]);

   const getLeadOwnerName = (lead: ILead) => {
      const matchedRep = SALES_REPS.find((rep) => rep.id === lead.ownerId);
      if (matchedRep?.name) return matchedRep.name;
      if (lead.ownerId === user?.id) return user?.name || 'TÃ´i';
      return lead.ownerId || 'ChÆ°a phÃ¢n cÃ´ng';
   };

   const formatTodayCareDateTime = (value?: string) => {
      if (!value) return '-';
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return '-';
      return parsed.toLocaleString('vi-VN', {
         day: '2-digit',
         month: '2-digit',
         year: 'numeric',
         hour: '2-digit',
         minute: '2-digit'
      });
   };

   const getTodayCareActionLabel = (activity: any) => {
      const rawType = String(activity?.activityType || activity?.type || '').toLowerCase();

      if (rawType === 'call') return 'Gá»i Ä‘iá»‡n';
      if (rawType === 'meeting') return 'Há»p trá»±c tiáº¿p';
      if (rawType === 'message' || rawType === 'chat') return 'Gá»­i tin';
      if (rawType === 'todo' || rawType === 'task') return 'Viá»‡c cáº§n lÃ m';
      if (rawType === 'activity') return String(activity?.title || 'Lá»‹ch chÄƒm sÃ³c');

      return String(activity?.title || 'Lá»‹ch chÄƒm sÃ³c');
   };

   const getTodayCareActionBadgeClass = (activity: any) => {
      const rawType = String(activity?.activityType || activity?.type || '').toLowerCase();

      if (rawType === 'call') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      if (rawType === 'meeting') return 'bg-blue-50 text-blue-700 border-blue-200';
      if (rawType === 'message' || rawType === 'chat') return 'bg-sky-50 text-sky-700 border-sky-200';
      if (rawType === 'todo' || rawType === 'task') return 'bg-amber-50 text-amber-700 border-amber-200';
      return 'bg-violet-50 text-violet-700 border-violet-200';
   };

   const getTodayCareStatusMeta = (activity: any) => {
      const rawStatus = String(activity?.status || '').toLowerCase();

      if (rawStatus === 'completed') {
         return {
            label: 'HoÃ n thÃ nh',
            className: 'bg-emerald-100 text-emerald-700'
         };
      }

      if (rawStatus === 'scheduled') {
         return {
            label: 'ÄÃ£ lÃªn lá»‹ch',
            className: 'bg-amber-100 text-amber-700'
         };
      }

      return {
         label: rawStatus ? rawStatus : 'Äang xá»­ lÃ½',
         className: 'bg-slate-100 text-slate-700'
      };
   };

   const todayCareRows = useMemo<Array<{ lead: ILead; activity: any; scheduledAt: string }>>(() => {
      if (statusFilter !== 'today_care') return [];

      return filteredLeads
         .map((lead) => {
            const activity = getLeadTodayCareActivity(lead);
            if (!activity) return null;

            return {
               lead,
               activity,
               scheduledAt: getTodayCareActivityDateValue(activity)
            };
         })
         .filter((item): item is { lead: ILead; activity: any; scheduledAt: string } => Boolean(item))
         .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
   }, [filteredLeads, statusFilter]);

   // --- ACTIONS LOGIC ---
   const handlePickUp = (e: React.MouseEvent, lead: ILead) => {
      e.stopPropagation();
      const now = new Date();
      const createdAt = new Date(lead.createdAt);
      const diffMins = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60));
      const slaMet = diffMins <= 15;

      const nowIso = now.toISOString();
      const nextOwnerId = isSalesLeader ? lead.ownerId : (user?.id || lead.ownerId);
      const updated = appendLeadLogs({
         ...clearLeadReclaimTracking(lead),
         status: LeadStatus.PICKED,
         ownerId: nextOwnerId,
         pickUpDate: nowIso
      }, {
         activities: [
            buildLeadActivityLog({
               type: 'system',
               timestamp: nowIso,
               title: 'Tiáº¿p nháº­n Lead',
               description: `Sale ${user?.name || 'TÃ´i'} Ä‘Ã£ tiáº¿p nháº­n lead. SLA Pick-up: ${slaMet ? 'Äáº T' : 'VI PHáº M'} (pháº£n há»“i sau ${diffMins} phÃºt).`,
               user: user?.name || 'System'
            })
         ],
         audits: [
            buildLeadAuditLog({
               action: 'lead_picked',
               actor: user?.name || 'System',
               actorType: 'user',
               timestamp: nowIso,
               changes: [
                  buildLeadAuditChange('status', lead.status, LeadStatus.PICKED, 'Tráº¡ng thÃ¡i'),
                  buildLeadAuditChange('ownerId', lead.ownerId, nextOwnerId, 'Sale phá»¥ trÃ¡ch'),
                  buildLeadAuditChange('pickUpDate', lead.pickUpDate, nowIso, 'Thá»i gian nháº­n lead')
               ]
            })
         ]
      });

      handleLeadUpdate(updated);
      alert(`Tiáº¿p nháº­n Lead: ${lead.name}. SLA: ${slaMet ? 'Äáº¡t' : 'QuÃ¡ háº¡n'}`);
   };

   const handleCall = (e: React.MouseEvent, lead: ILead) => {
      e.stopPropagation();
      const nowIso = new Date().toISOString();
      const nextOwnerId = isSalesLeader ? lead.ownerId : (user?.id || lead.ownerId);

      if ([LEAD_STATUS_KEYS.NEW, LEAD_STATUS_KEYS.ASSIGNED, LEAD_STATUS_KEYS.PICKED].includes(normalizeLeadStatusKey(String(lead.status || '')))) {
         const updated = appendLeadLogs({
            ...lead,
            status: LeadStatus.CONTACTED,
            ownerId: nextOwnerId,
            lastInteraction: nowIso
         }, {
            activities: [
               buildLeadActivityLog({
                  type: 'system',
                  timestamp: nowIso,
                  title: 'ÄÃ£ gá»i khÃ¡ch hÃ ng',
                  description: `Sale ${user?.name || 'TÃ´i'} Ä‘Ã£ thá»±c hiá»‡n gá»i Ä‘iá»‡n cho khÃ¡ch hÃ ng.`,
                  user: user?.name || 'System'
               })
            ],
            audits: [
               buildLeadAuditLog({
                  action: 'lead_called',
                  actor: user?.name || 'System',
                  actorType: 'user',
                  timestamp: nowIso,
                  changes: [
                     buildLeadAuditChange('status', lead.status, LeadStatus.CONTACTED, 'Tráº¡ng thÃ¡i'),
                     buildLeadAuditChange('lastInteraction', lead.lastInteraction, nowIso, 'Láº§n tÆ°Æ¡ng tÃ¡c cuá»‘i')
                  ]
               })
            ]
         });
         handleLeadUpdate(updated);
      } else {
         const updated = appendLeadLogs({
            ...lead,
            lastInteraction: nowIso
         }, {
            activities: [
               buildLeadActivityLog({
                  type: 'system',
                  timestamp: nowIso,
                  title: 'ÄÃ£ gá»i khÃ¡ch hÃ ng',
                  description: `Sale ${user?.name || 'TÃ´i'} Ä‘Ã£ thá»±c hiá»‡n gá»i Ä‘iá»‡n cho khÃ¡ch hÃ ng.`,
                  user: user?.name || 'System'
               })
            ],
            audits: [
               buildLeadAuditLog({
                  action: 'lead_called',
                  actor: user?.name || 'System',
                  actorType: 'user',
                  timestamp: nowIso,
                  changes: [buildLeadAuditChange('lastInteraction', lead.lastInteraction, nowIso, 'Láº§n tÆ°Æ¡ng tÃ¡c cuá»‘i')]
               })
            ]
         });
         handleLeadUpdate(updated);
      }
      window.location.href = `tel:${lead.phone}`;
   };

   const handleMarkLost = (e: React.MouseEvent, lead: ILead) => {
      e.stopPropagation();
      if (confirm("XÃ¡c nháº­n Ä‘Ã¡nh dáº¥u Lead nÃ y lÃ  Tháº¥t báº¡i/Lost?")) {
         const nowIso = new Date().toISOString();
         const updated = appendLeadLogs({
            ...lead,
            status: LeadStatus.LOST
         }, {
            activities: [
               buildLeadActivityLog({
                  type: 'system',
                  timestamp: nowIso,
                  title: 'Äá»•i tráº¡ng thÃ¡i',
                  description: `Tráº¡ng thÃ¡i: ${getLeadStatusLabel(String(lead.status || ''))} â†’ ${getLeadStatusLabel(String(LeadStatus.LOST))}`,
                  user: user?.name || 'System'
               })
            ],
            audits: [
               buildLeadAuditLog({
                  action: 'lead_status_changed',
                  actor: user?.name || 'System',
                  actorType: 'user',
                  timestamp: nowIso,
                  changes: [buildLeadAuditChange('status', lead.status, LeadStatus.LOST, 'Tráº¡ng thÃ¡i')]
               })
            ]
         });
         handleLeadUpdate(updated);
      }
   };

   const handleBulkMarkLost = () => {
      if (confirm(`ÄÃ¡nh dáº¥u ${selectedIds.length} lead lÃ  Tháº¥t báº¡i?`)) {
         const nowIso = new Date().toISOString();
         const allLeads = getLeads();
         const updatedAllLeads = allLeads.map(l => selectedIds.includes(l.id)
            ? appendLeadLogs({
               ...l,
               status: LeadStatus.LOST
            }, {
               activities: [
                  buildLeadActivityLog({
                     type: 'system',
                     timestamp: nowIso,
                     title: 'Äá»•i tráº¡ng thÃ¡i',
                     description: `Tráº¡ng thÃ¡i: ${getLeadStatusLabel(String(l.status || ''))} â†’ ${getLeadStatusLabel(String(LeadStatus.LOST))}`,
                     user: user?.name || 'System'
                  })
               ],
               audits: [
                  buildLeadAuditLog({
                     action: 'lead_status_changed',
                     actor: user?.name || 'System',
                     actorType: 'user',
                     timestamp: nowIso,
                     changes: [buildLeadAuditChange('status', l.status, LeadStatus.LOST, 'Tráº¡ng thÃ¡i')]
                  })
               ]
            })
            : l);
         applyLeadScope(updatedAllLeads);
         saveLeads(updatedAllLeads);
         setSelectedIds([]);
       }
    };

   // Mock Assign (Handover)
   const handleBulkAssign = () => {
      const target = prompt("Nháº­p tÃªn ngÆ°á»i nháº­n bÃ n giao:");
      if (target) {
         const nowIso = new Date().toISOString();
         const allLeads = getLeads();
         const updatedAllLeads = allLeads.map(l => {
            if (!selectedIds.includes(l.id)) return l;
            return appendLeadLogs(
               { ...clearLeadReclaimTracking(l), ownerId: target, status: LeadStatus.ASSIGNED },
               {
                  activities: [
                     buildLeadActivityLog({
                        type: 'system',
                        timestamp: nowIso,
                        title: l.ownerId ? 'Chia láº¡i Lead' : 'PhÃ¢n bá»• Lead',
                        description: l.ownerId
                           ? `Lead Ä‘Æ°á»£c chia láº¡i tá»« ${l.ownerId} sang ${target}.`
                           : `Lead Ä‘Æ°á»£c giao cho ${target}.`,
                        user: user?.name || 'System'
                     })
                  ],
                  audits: [
                     buildLeadAuditLog({
                        action: l.ownerId ? 'lead_reassigned' : 'lead_assigned',
                        actor: user?.name || 'System',
                        actorType: 'user',
                        timestamp: nowIso,
                        changes: [
                           buildLeadAuditChange('ownerId', l.ownerId, target, 'Sale phá»¥ trÃ¡ch'),
                           buildLeadAuditChange('status', l.status, LeadStatus.ASSIGNED, 'Tráº¡ng thÃ¡i')
                        ]
                     })
                  ]
               }
            );
         });

         saveLeads(updatedAllLeads);
         applyLeadScope(updatedAllLeads);
         setSelectedIds([]);
         alert(`Đã bàn giao ${selectedIds.length} lead cho ${target}`);
      }
   };


   // Handle Updates from Drawer
   const handleLeadUpdate = (updatedLead: ILead) => {
      const allLeads = getLeads();
      const index = allLeads.findIndex(l => l.id === updatedLead.id);
      if (index !== -1) {
         allLeads[index] = updatedLead;
         applyLeadScope(allLeads);
         saveLeads(allLeads);
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
            activities: getLeadActivitiesForConversion(lead).map(a => ({
               ...a,
               type: a.type === 'message' ? 'chat' : a.type === 'system' ? 'note' : a.type as any
            })) as any
         };
         addDeal(deal);
         const convertedLead: ILead = {
            ...lead,
            status: LeadStatus.CONVERTED,
            updatedAt: new Date().toISOString()
         };
         saveLead(convertedLead);
         setLeads(prev => prev.map(item => item.id === lead.id ? convertedLead : item));
         setSelectedLead(null);

         navigate(`/pipeline?newDeal=${deal.id}`);
      } catch (error) {
         console.error("Convert Error", error);
         alert("CÃ³ lá»—i xáº£y ra khi chuyá»ƒn Ä‘á»•i Lead!");
      }
   };

   // Handle Bulk Convert
   const handleBulkConvert = () => {
      if (selectedIds.length === 0) {
         alert("ChÆ°a chá»n lead!");
         return;
      }

      if (confirm(`Chuyá»ƒn Ä‘á»•i ${selectedIds.length} lead thÃ nh Deal/Há»£p Ä‘á»“ng?`)) {
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
                  activities: getLeadActivitiesForConversion(lead).map(a => ({
                     ...a,
                     type: a.type === 'message' ? 'chat' : a.type === 'system' ? 'note' : a.type as any
                  })) as any
               };
               addDeal(deal);
               saveLead({
                  ...lead,
                  status: LeadStatus.CONVERTED,
                  updatedAt: new Date().toISOString()
               });
               lastDealId = deal.id;
            } catch (error) {
               console.error("Bulk Convert Individual Error", error);
            }
         });

         setSelectedIds([]);
         alert(`Chuyá»ƒn Ä‘á»•i thÃ nh cÃ´ng ${selectedIds.length} lead!`);
         if (lastDealId) navigate(`/pipeline?newDeal=${lastDealId}`);
      }
   };

   const handleBulkWon = () => {
      if (selectedIds.length > 0) {
         if (confirm(`XÃ¡c nháº­n Ä‘Ã¡nh dáº¥u tháº¯ng (Won) cho ${selectedIds.length} lead?`)) {
            const allLeads = getLeads();
            const updatedAllLeads = allLeads.map(l => selectedIds.includes(l.id) ? { ...l, status: DealStage.WON } : l);
            applyLeadScope(updatedAllLeads);
            saveLeads(updatedAllLeads);
            setSelectedIds([]);
            alert("Cáº­p nháº­t thÃ nh cÃ´ng!");
         }
      } else {
         alert("ChÆ°a chá»n lead!");
      }
   };

   const handleBulkDelete = () => {
      if (selectedIds.length > 0) {
         if (confirm(`XÃ³a ${selectedIds.length} lead Ä‘Ã£ chá»n?`)) {
            const allLeads = getLeads();
            const filteredAllLeads = allLeads.filter((l) => !selectedIds.includes(l.id));
            applyLeadScope(filteredAllLeads);
            saveLeads(filteredAllLeads);
            setSelectedIds([]);
         }
      } else {
         alert("ChÆ°a chá»n lead!");
      }
   };

   const handleBulkEdit = () => {
      if (selectedIds.length > 0) {
         const lead = leads.find(l => l.id === selectedIds[0]);
         if (lead) setSelectedLead(lead);
      } else {
         alert("ChÆ°a chá»n lead!");
      }
   };

   // Grouping Logic
   const groupedLeads = useMemo(() => {
      // ... existing logic ...
      if (groupBy === 'none') return { 'All': filteredLeads };

      return filteredLeads.reduce((groups, lead) => {
         let key = 'KhÃ¡c';
         if (groupBy === 'source') key = lead.source || 'ChÆ°a xÃ¡c Ä‘á»‹nh';
         else if (groupBy === 'status') key = lead.status;
         else if (groupBy === 'program') key = lead.program || 'ChÆ°a cÃ³ chÆ°Æ¡ng trÃ¬nh';
         else if (groupBy === 'city') key = (lead as any).city || 'ChÆ°a cáº­p nháº­t TP';

         if (!groups[key]) groups[key] = [];
         groups[key].push(lead);
         return groups;
      }, {} as Record<string, ILead[]>);
   }, [filteredLeads, groupBy]);

   const kanbanColumns = useMemo(() => {
      const columns: Array<{
         key: string;
         title: string;
         color: string;
         leads: ILead[];
      }> = [
            { key: LEAD_STATUS_KEYS.NEW, title: getLeadStatusLabel(LEAD_STATUS_KEYS.NEW), color: 'bg-blue-50 border-blue-200', leads: [] },
            { key: LEAD_STATUS_KEYS.ASSIGNED, title: getLeadStatusLabel(LEAD_STATUS_KEYS.ASSIGNED), color: 'bg-amber-50 border-amber-200', leads: [] },
            { key: LEAD_STATUS_KEYS.PICKED, title: getLeadStatusLabel(LEAD_STATUS_KEYS.PICKED), color: 'bg-yellow-50 border-yellow-200', leads: [] },
            { key: LEAD_STATUS_KEYS.CONTACTED, title: getLeadStatusLabel(LEAD_STATUS_KEYS.CONTACTED), color: 'bg-purple-50 border-purple-200', leads: [] },
            { key: LEAD_STATUS_KEYS.NURTURING, title: getLeadStatusLabel(LEAD_STATUS_KEYS.NURTURING), color: 'bg-teal-50 border-teal-200', leads: [] },
            { key: LEAD_STATUS_KEYS.CONVERTED, title: getLeadStatusLabel(LEAD_STATUS_KEYS.CONVERTED), color: 'bg-cyan-50 border-cyan-200', leads: [] },
            { key: LEAD_STATUS_KEYS.UNVERIFIED, title: getLeadStatusLabel(LEAD_STATUS_KEYS.UNVERIFIED), color: 'bg-slate-100 border-slate-300', leads: [] },
            { key: LEAD_STATUS_KEYS.LOST, title: getLeadStatusLabel(LEAD_STATUS_KEYS.LOST), color: 'bg-red-50 border-red-200', leads: [] },
         ];

      filteredLeads.forEach((lead) => {
         const normalized = normalizeLeadStatusKey(String(lead.status || ''));
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
            label: 'Bá»™ lá»c',
            value: filterTypeLabels[filterType],
            type: 'filter',
            origin: 'synthetic',
            syntheticKey: 'filter-type',
         });
      }

      if (statusFilter !== 'all') {
         chips.push({
            field: 'advanced_status',
            label: 'Trang thai',
            value: statusFilterLabels[statusFilter] || String(statusFilter),
            type: 'filter',
            origin: 'synthetic',
            syntheticKey: 'status',
         });
      }

      if (groupBy !== 'none') {
         chips.push({
            field: 'group_by',
            label: 'NhÃ³m theo',
            value: groupByLabels[groupBy] || groupBy,
            type: 'groupby',
            origin: 'synthetic',
            syntheticKey: 'group-by',
         });
      }

      if (timeRangeType !== 'all') {
         const timeFieldLabel = timeFieldOptions.find((option) => option.id === timeFilterField)?.label || 'NgÃ y táº¡o';
         const timePresetLabel = timePresets.find((preset) => preset.id === timeRangeType)?.label || timeRangeType;
         const customLabel = customRange?.start && customRange?.end
            ? `${customRange.start} - ${customRange.end}`
            : 'TÃ¹y chá»‰nh khoáº£ng thá»i gian';

         chips.push({
            field: 'time_field',
            label: 'Má»‘c thá»i gian',
            value: timeFieldLabel,
            type: 'filter',
            origin: 'synthetic',
            syntheticKey: 'time',
         });

         chips.push({
            field: 'time_range',
            label: 'Thá»i gian',
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
      statusFilterLabels,
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
      setStatusFilter('all');
      setStatusFilterSource(null);
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

   const renderTableRows = (leadList: ILead[], startIndex = 0) => (
      leadList.map((lead, index) => {
         // Determine Next Activity
         // @ts-ignore
         const nextActivity = (lead.activities || []).find(a => a.type === 'activity');
         const deadline = lead.expectedClosingDate ? new Date(lead.expectedClosingDate).toLocaleDateString('vi-VN') : '-';
         const normalizedStatus = normalizeLeadStatusKey(String(lead.status || ''));
         const potentialValue = String((lead as any).potential || lead.internalNotes?.potential || '').trim();
         const potentialClassName =
            potentialValue === 'Nóng' || potentialValue === 'NÃ³ng' ? 'bg-red-100 text-red-700 border-red-200' :
               potentialValue === 'Tiềm năng' || potentialValue === 'Tiá»m nÄƒng' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                  potentialValue === 'Tham khảo' || potentialValue === 'Tham kháº£o' ? 'bg-slate-100 text-slate-700 border-slate-200' :
                     'bg-slate-50 text-slate-500 border-slate-200';
         const salesRep = SALES_REPS.find((rep) => rep.id === lead.ownerId);
         const addressValue = [
            (lead as any).street,
            (lead as any).ward,
            (lead as any).city
         ].filter(Boolean).join(', ') || (lead as any).address || '-';
         const campaignValue = lead.marketingData?.campaign || (lead as any).campaign || '-';
         const marketValue = (lead as any).marketingData?.market || '-';
         const productValue = (lead as any).product || lead.program || '-';
         const nextActivityLabel = nextActivity?.description?.split(':')[0] || nextActivity?.title || '-';
         const nextActivityTitle = nextActivity?.description || nextActivity?.title || '';
         const slaText = lead.slaStatus === 'danger' || lead.slaStatus === 'warning'
            ? (lead.slaReason || (lead.slaStatus === 'danger' ? 'Quá hạn' : 'Chú ý'))
            : '-';
         const statusClassName =
            normalizedStatus === LEAD_STATUS_KEYS.NEW ? 'bg-blue-100 text-blue-700' :
               normalizedStatus === LEAD_STATUS_KEYS.ASSIGNED ? 'bg-amber-100 text-amber-700' :
                  normalizedStatus === LEAD_STATUS_KEYS.PICKED ? 'bg-yellow-100 text-yellow-700' :
                     normalizedStatus === LEAD_STATUS_KEYS.CONTACTED ? 'bg-purple-100 text-purple-700' :
                        normalizedStatus === LEAD_STATUS_KEYS.NURTURING ? 'bg-teal-100 text-teal-700' :
                           normalizedStatus === LEAD_STATUS_KEYS.CONVERTED ? 'bg-cyan-100 text-cyan-700' :
                              normalizedStatus === LEAD_STATUS_KEYS.UNVERIFIED ? 'bg-slate-200 text-slate-700' :
                                 normalizedStatus === LEAD_STATUS_KEYS.LOST ? 'bg-red-100 text-red-700' :
                                    'bg-slate-100 text-slate-600';

         return (
            <tr key={lead.id}
               className={`hover:bg-blue-50/50 group transition-colors cursor-pointer border-b border-slate-100 last:border-0 ${(!lead.pickUpDate && normalizedStatus === LEAD_STATUS_KEYS.NEW) ? 'bg-red-50/30' : (!lead.pickUpDate && normalizedStatus === LEAD_STATUS_KEYS.ASSIGNED) ? 'bg-amber-50/20' : ''}`}
               onClick={(e) => {
                  if ((e.target as HTMLElement).tagName !== 'INPUT') setSelectedLead(lead);
               }}
            >
               <td className="px-2 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={selectedIds.includes(lead.id)} onChange={() => {
                     setSelectedIds(prev => prev.includes(lead.id) ? prev.filter(i => i !== lead.id) : [...prev, lead.id]);
                  }} />
               </td>

               <td className="w-12 px-2 py-3 text-center align-middle font-semibold text-slate-500">
                  {startIndex + index + 1}
               </td>

               <td className="w-12 px-2 py-3 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                  <button
                     onClick={(e) => handleCall(e, lead)}
                     className="inline-flex items-center justify-center p-1 rounded bg-green-100 text-green-700 hover:bg-green-200"
                     title="Gá»i ngay"
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
                     <span className="font-semibold truncate block">{lead.name || '-'}</span>
                  </td>
               )}
               {visibleColumns.includes('email') && <td className="p-3 align-middle text-slate-600 text-xs truncate max-w-[150px]" title={lead.email}>{lead.email || '-'}</td>}
               {visibleColumns.includes('company') && <td className="p-3 align-middle text-slate-600 text-xs truncate max-w-[120px]">{(lead as any).company || '-'}</td>}
               {visibleColumns.includes('createdAt') && <td className="p-3 align-middle text-slate-600 text-xs whitespace-nowrap">{lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('vi-VN') : '-'}</td>}
               {visibleColumns.includes('title') && <td className="p-3 align-middle text-slate-600 text-xs truncate max-w-[80px]">{(lead as any).title || '-'}</td>}
               {visibleColumns.includes('phone') && <td className="p-3 align-middle text-slate-700 text-xs font-semibold whitespace-nowrap">{lead.phone || '-'}</td>}
               {visibleColumns.includes('address') && <td className="p-3 align-middle text-slate-600 text-xs truncate max-w-[150px]" title={addressValue}>{addressValue}</td>}
               {visibleColumns.includes('salesperson') && (
                  <td className="p-3 align-middle text-slate-700 text-xs">
                     {lead.ownerId ? (
                        <div className="flex items-center gap-2">
                           <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${salesRep ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                              {salesRep?.name?.split(' ').map((part) => part[0]).slice(0, 2).join('') || 'NA'}
                           </span>
                           <span className="truncate font-medium text-slate-700">{salesRep?.name || user?.name || lead.ownerId}</span>
                        </div>
                     ) : (
                        <span className="text-slate-400">Chưa nhận</span>
                     )}
                  </td>
               )}
               {visibleColumns.includes('campaign') && <td className="p-3 align-middle text-slate-600 text-xs truncate max-w-[120px]" title={campaignValue}>{campaignValue}</td>}
               {visibleColumns.includes('source') && (
                  <td className="p-3 align-middle text-xs">
                     <span className="inline-flex max-w-[110px] items-center rounded-sm border border-teal-100 bg-teal-50/70 px-1.5 py-0 text-[10px] font-semibold text-teal-700" title={lead.source}>
                        <span className="truncate">{lead.source || '-'}</span>
                     </span>
                  </td>
               )}
               {visibleColumns.includes('potential') && (
                  <td className="p-3 align-middle text-xs whitespace-nowrap">
                     <span className={`inline-flex items-center rounded-full border px-2 py-0.5 font-bold ${potentialClassName}`}>
                        {potentialValue || '-'}
                     </span>
                  </td>
               )}

               {/* Tags */}
               {visibleColumns.includes('tags') && (
                  <td className="p-3 align-middle max-w-[150px]">
                     <div className="flex flex-wrap gap-1 overflow-hidden">
                        {(Array.isArray((lead as any).marketingData?.tags)
                           ? (lead as any).marketingData.tags
                           : (typeof (lead as any).marketingData?.tags === 'string'
                              ? (lead as any).marketingData.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
                              : [])
                        ).map((t: string, i: number) => {
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
               {visibleColumns.includes('referredBy') && <td className="p-3 align-middle text-slate-600 text-xs truncate max-w-[120px]">{(lead as any).referredBy || '-'}</td>}
               {visibleColumns.includes('market') && <td className="p-3 align-middle text-slate-600 text-xs truncate max-w-[100px]">{marketValue}</td>}
               {visibleColumns.includes('product') && <td className="p-3 align-middle text-slate-600 text-xs truncate max-w-[120px]" title={productValue}>{productValue}</td>}
               {visibleColumns.includes('notes') && <td className="p-3 align-middle text-slate-500 text-xs truncate max-w-[140px]" title={(lead as any).notes || ''}>{(lead as any).notes || '-'}</td>}
               {visibleColumns.includes('nextActivity') && (
                  <td className="p-3 align-middle text-xs">
                     {nextActivity ? (
                        <div className="flex max-w-[120px] items-center gap-1 overflow-hidden rounded-sm bg-purple-50 px-1 py-0 text-[9px] font-semibold text-purple-700" title={nextActivityTitle}>
                           <Clock size={8} className="shrink-0" />
                           <span className="truncate">{nextActivityLabel}</span>
                        </div>
                     ) : (
                        <span className="text-slate-400">-</span>
                     )}
                  </td>
               )}
               {visibleColumns.includes('deadline') && (
                  <td className="p-3 align-middle text-xs whitespace-nowrap">
                     {deadline !== '-' ? <span className="font-bold text-red-600">{deadline}</span> : '-'}
                  </td>
               )}
               {visibleColumns.includes('value') && (
                  <td className="p-3 align-middle text-slate-800 text-xs font-bold whitespace-nowrap">
                     {lead.value ? lead.value.toLocaleString('vi-VN') : '-'}
                  </td>
               )}

               {visibleColumns.includes('status') && (
                  <td className="p-3 align-middle text-center whitespace-nowrap">
                     <div className="flex flex-col items-center gap-1">
                        <span
                           className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase cursor-pointer hover:opacity-80 whitespace-nowrap ${statusClassName}`}
                           onClick={(e) => handleClickableField(e, 'status', 'Tráº¡ng thÃ¡i', lead.status as string)}
                        >
                           {getLeadStatusLabel(lead.status as string)}
                        </span>
                        {([LEAD_STATUS_KEYS.NEW, LEAD_STATUS_KEYS.ASSIGNED].includes(normalizedStatus) && !lead.pickUpDate) && (
                           <button
                              onClick={(e) => handlePickUp(e, lead)}
                              className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded hover:bg-blue-700 transition-colors shadow-sm animate-pulse"
                           >
                              Tiáº¿p nháº­n
                           </button>
                        )}
                        {normalizedStatus === LEAD_STATUS_KEYS.PICKED && lead.pickUpDate && (
                           <div className="flex items-center gap-1 text-[9px] text-green-600 font-bold">
                              <CheckCircle2 size={10} /> ÄÃ£ nháº­n
                           </div>
                        )}
                     </div>
                  </td>
               )}
               {visibleColumns.includes('sla') && (
                  <td className="p-3 align-middle text-xs">
                     {slaText !== '-' ? (
                        <span className={`font-bold ${lead.slaStatus === 'danger' ? 'text-red-600' : 'text-amber-600'}`}>{slaText}</span>
                     ) : (
                        <span className="text-slate-400">-</span>
                     )}
                  </td>
               )}
            </tr>
         );
      })
   );

   const listTableColumnCount = visibleColumns.length + 3;
   const todayCareTableColumnCount = 9;

   const renderStatusTabs = (containerClassName = '') => (
      <div className={`min-w-0 overflow-x-auto ${containerClassName}`.trim()}>
         <div className="flex items-center gap-1 min-w-max">
            {statusTabs.map((tab) => (
               <button
                  key={tab.id}
                  onClick={() => {
                     setStatusFilter(tab.id);
                     setStatusFilterSource(tab.id === 'all' ? null : 'tabs');
                  }}
                  className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-bold normal-case whitespace-nowrap transition-all ${statusFilter === tab.id ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
               >
                  <span>{tab.label}</span>
                  <span className={`text-[10px] ${statusFilter === tab.id ? 'text-blue-500' : 'text-slate-400'}`}>{tab.count}</span>
               </button>
            ))}
         </div>
      </div>
   );

   const actionDropdownItems = [
      {
         label: 'PhÃ¢n bá»•',
         icon: Shuffle,
         onClick: () => {
            if (selectedIds.length === 0) {
               alert('HÃ£y chá»n Ã­t nháº¥t 1 lead.');
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
               alert('HÃ£y chá»n Ã­t nháº¥t 1 lead.');
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
               alert('HÃ£y chá»n Ã­t nháº¥t 1 lead.');
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
               alert('HÃ£y chá»n Ã­t nháº¥t 1 lead.');
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
               alert('HÃ£y chá»n Ã­t nháº¥t 1 lead.');
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
               alert('HÃ£y chá»n Ã­t nháº¥t 1 lead Ä‘á»ƒ convert.');
               return;
            }
            handleBulkConvert();
         }
      },
      {
         label: 'Gá»­i tin',
         icon: MessageSquare,
         onClick: () => alert('Chá»©c nÄƒng gá»­i tin hÃ ng loáº¡t Ä‘ang phÃ¡t triá»ƒn.')
      }
   ];

   return decodeMojibakeReactNode(
      <div className="flex flex-col h-full bg-[#f8fafc] font-sans text-slate-900 relative max-w-[1400px] mx-auto">
         {/* TOOLBAR */}
         <div className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-20 shadow-sm">
            <div className="flex flex-col gap-2 xl:flex-row xl:flex-wrap xl:gap-x-4 xl:gap-y-1 xl:items-start xl:justify-between">
               <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3 flex-wrap xl:flex-nowrap">
                     <h1 className="text-xl font-bold flex items-center gap-2 text-slate-800 shrink-0">
                        <Inbox size={20} className="text-blue-600" /> {myLeadsTitle}
                     </h1>

                     <SalesRoleTestSwitcher className="shrink-0" />

                     {viewMode !== 'list' && renderStatusTabs('pb-1')}


                     {false && showTimePicker && timeRangeType === 'custom' && (
                        <div className="flex items-center gap-2 flex-wrap">
                           <input
                              type="date"
                              value={customRange?.start || ''}
                              onChange={(e) => setCustomRange(prev => ({ start: e.target.value, end: prev?.end || '' }))}
                              className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 outline-none focus:border-blue-300"
                           />
                           <span className="text-xs font-semibold text-slate-500">Ã„â€˜Ã¡ÂºÂ¿n</span>
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
                              XÃƒÂ³a
                           </button>
                        </div>
                     )}
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
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 shadow-sm"
                     >
                        <UserPlus size={13} /> Táº¡o lead
                     </button>

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

                     {showTimePicker && timeRangeType === 'custom' && (
                        <div className="flex items-center gap-2 flex-wrap">
                           <input
                              type="date"
                              value={customRange?.start || ''}
                              onChange={(e) => setCustomRange(prev => ({ start: e.target.value, end: prev?.end || '' }))}
                              className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 outline-none focus:border-blue-300"
                           />
                           <span className="text-xs font-semibold text-slate-500">Ä‘áº¿n</span>
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
                              XÃ³a
                           </button>
                        </div>
                     )}

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

                  <div className="w-full xl:w-[52%] xl:max-w-[700px] xl:flex-none flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between xl:flex-nowrap">
                     <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                        <div className="relative shrink-0">
                           <button
                              onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
                              className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-xs font-bold whitespace-nowrap transition-all ${showAdvancedFilter ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                           >
                              <Filter size={14} /> Lá»c nÃ¢ng cao
                           </button>

                           {showAdvancedFilter && (
                              <>
                                 <div className="fixed inset-0 z-30" onClick={() => setShowAdvancedFilter(false)}></div>
                                 <div className="absolute right-0 top-full mt-2 w-[800px] max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-xl shadow-2xl z-40 flex animate-in fade-in zoom-in-95 overflow-hidden font-sans">
                                    <div className="w-1/3 border-r border-slate-100 p-4">
                                       <div className="flex items-center gap-2 mb-4 text-sm font-bold text-slate-800">
                                          <Filter size={16} /> Bá»™ lá»c
                                       </div>
                                       <div className="space-y-1">
                                          <div className={`px-3 py-2 text-sm rounded cursor-pointer transition-colors ${filterType === 'all' ? 'bg-blue-600 text-white font-bold' : 'text-slate-700 hover:bg-slate-50'}`} onClick={() => setFilterType('all')}>{isSalesLeader ? 'Tất cả lead đã phân bổ' : 'Tất cả lead của tôi'}</div>
                                          <div className={`px-3 py-2 text-sm rounded cursor-pointer transition-colors ${filterType === 'no-activity' ? 'bg-blue-600 text-white font-bold' : 'text-slate-700 hover:bg-slate-50'}`} onClick={() => setFilterType('no-activity')}>ChÆ°a cÃ³ hoáº¡t Ä‘á»™ng</div>
                                          <div className={`px-3 py-2 text-sm rounded cursor-pointer transition-colors ${filterType === 'high-value' ? 'bg-blue-600 text-white font-bold' : 'text-slate-700 hover:bg-slate-50'}`} onClick={() => setFilterType('high-value')}>CÆ¡ há»™i giÃ¡ trá»‹ cao</div>
                                          <div className="my-2 border-t border-slate-100"></div>
                                          <div className="px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded cursor-pointer flex justify-between items-center group">
                                             NgÃ y táº¡o <ChevronDown size={14} className="text-slate-400 group-hover:text-slate-600" />
                                          </div>
                                          <div className="px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded cursor-pointer flex justify-between items-center group">
                                             NgÃ y chá»‘t <ChevronDown size={14} className="text-slate-400 group-hover:text-slate-600" />
                                          </div>
                                          <div className="my-2 border-t border-slate-100"></div>
                                          {LEAD_STATUS_OPTIONS.map(status => (
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
                                          <Users size={16} /> NhÃ³m theo
                                       </div>
                                       <div className="space-y-1">
                                          {[
                                             { label: 'KhÃ´ng nhÃ³m', value: 'none' },
                                             { label: 'ChuyÃªn viÃªn sales', value: 'salesperson' },
                                             { label: 'Giai Ä‘oáº¡n', value: 'status' },
                                             { label: 'ThÃ nh phá»‘', value: 'city' },
                                             { label: 'ChÆ°Æ¡ng trÃ¬nh', value: 'program' },
                                             { label: 'Nguá»“n', value: 'source' }
                                          ].map(item => (
                                             <div key={item.value}
                                                className={`px-3 py-2 text-sm rounded cursor-pointer transition-colors ${groupBy === item.value ? 'bg-blue-100 text-blue-700 font-bold border-l-4 border-blue-600' : 'text-slate-700 hover:bg-slate-100'}`}
                                                onClick={() => setGroupBy(item.value as any)}
                                             >
                                                {item.label}
                                             </div>
                                          ))}
                                          <div className="my-2 border-t border-slate-200"></div>
                                          {['NgÃ y táº¡o', 'NgÃ y Ä‘Ã³ng dá»± kiáº¿n', 'NgÃ y chá»‘t', 'NhÃ³m tÃ¹y chá»‰nh'].map(item => (
                                             <div key={item} className="px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded cursor-pointer flex justify-between items-center group">
                                                {item} <ChevronDown size={14} className="text-slate-400 group-hover:text-slate-600" />
                                             </div>
                                          ))}
                                       </div>
                                    </div>

                                    <div className="w-1/3 p-4">
                                       <div className="flex items-center gap-2 mb-4 text-sm font-bold text-slate-800">
                                          <FileSpreadsheet size={16} /> Danh sÃ¡ch yÃªu thÃ­ch
                                       </div>
                                       <div className="mb-4">
                                          <label className="block text-xs font-semibold text-slate-500 mb-1.5">LÆ°u bá»™ lá»c hiá»‡n táº¡i</label>
                                          <input type="text" className="w-full border border-slate-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Quy trÃ¬nh" />
                                       </div>
                                       <label className="flex items-center gap-2 mb-6 cursor-pointer">
                                          <input type="checkbox" className="rounded border-slate-300 text-blue-600" />
                                          <span className="text-sm text-slate-700">Bá»™ lá»c máº·c Ä‘á»‹nh</span>
                                       </label>
                                       <div className="flex gap-2">
                                          <button className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded font-bold text-sm transition-colors">LÆ°u</button>
                                          <button className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded font-bold text-sm transition-colors">Chá»‰nh sá»­a</button>
                                       </div>
                                    </div>
                                 </div>
                              </>
                           )}
                        </div>

                        <div className="hidden items-center gap-2 border border-slate-200 rounded-lg bg-white px-2 py-1.5 text-xs shrink-0">
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

                        <div className="hidden items-center gap-2 border border-slate-200 rounded-lg bg-white px-2 py-1.5 text-xs shrink-0">
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

                        {false && showTimePicker && timeRangeType === 'custom' && (
                           <div className="flex items-center gap-2 flex-wrap">
                              <input
                                 type="date"
                                 value={customRange?.start || ''}
                                 onChange={(e) => setCustomRange(prev => ({ start: e.target.value, end: prev?.end || '' }))}
                                 className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 outline-none focus:border-blue-300"
                              />
                              <span className="text-xs font-semibold text-slate-500">Ä‘áº¿n</span>
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
                                 XÃ³a
                              </button>
                           </div>
                        )}
                     </div>

                     <div className="flex items-center justify-end gap-2">
                        <div className="flex bg-white px-1 py-0.5 rounded-lg border border-slate-200 shadow-sm">
                           <button onClick={() => setViewMode('list')} className={`p-1 rounded ${viewMode === 'list' ? 'bg-blue-50 text-blue-600 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'}`} title="Dáº¡ng danh sÃ¡ch"><ListIcon size={15} /></button>
                           <button onClick={() => setViewMode('kanban')} className={`p-1 rounded ${viewMode === 'kanban' ? 'bg-blue-50 text-blue-600 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'}`} title="Dáº¡ng kanban"><Layout size={15} /></button>
                           <button onClick={() => setViewMode('pivot')} className={`p-1 rounded ${viewMode === 'pivot' ? 'bg-blue-50 text-blue-600 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'}`} title="BÃ¡o cÃ¡o pivot"><LayoutGrid size={15} /></button>
                        </div>

                        {statusFilter !== 'today_care' && (
                           <div className="relative shrink-0">
                              <button
                                 onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                                 className="flex items-center gap-1.5 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-bold hover:bg-white text-slate-600 bg-slate-100 shadow-sm transition-all whitespace-nowrap"
                              >
                                 <Settings size={13} /> Cá»™t
                              </button>
                              {showColumnDropdown && (
                                 <>
                                    <div className="fixed inset-0 z-30" onClick={() => setShowColumnDropdown(false)}></div>
                                    <div className="absolute right-0 top-full mt-2 w-[400px] max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-xl shadow-xl z-40 p-3 animate-in fade-in zoom-in-95">
                                       <div className="text-xs font-bold text-slate-500 uppercase px-2 py-1 mb-2 border-b border-slate-100 pb-2">Hiá»ƒn thá»‹ cá»™t</div>
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
                        )}

                        <div className="text-xs text-slate-500 font-mono whitespace-nowrap shrink-0">
                           Tá»•ng sá»‘: <span className="font-bold text-slate-900">{filteredLeads.length}</span> bản ghi
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
                                 <p>{isSalesLeader ? 'Chưa có lead đã phân bổ trong chế độ Kanban.' : 'Chưa có lead trong chế độ Kanban.'}</p>
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
                                             title="Gá»i ngay"
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
            ) : statusFilter === 'today_care' ? (
               <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 shadow-sm">
                     <tr>
                        <th colSpan={todayCareTableColumnCount} className="border-b border-slate-200 bg-white px-4 py-2 text-left align-middle normal-case">
                           {renderStatusTabs()}
                        </th>
                     </tr>
                     <tr>
                        <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-12">
                           <input
                              type="checkbox"
                              className="rounded border-slate-300"
                              onChange={handleSelectAll}
                              checked={selectedIds.length === todayCareRows.length && todayCareRows.length > 0}
                           />
                        </th>
                        <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-16 text-center">STT</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Há»c viÃªn</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Äiá»‡n thoáº¡i</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Sale phá»¥ trÃ¡ch</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">HÃ nh Ä‘á»™ng</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Thá»i gian</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ná»™i dung</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tráº¡ng thÃ¡i</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {todayCareRows.length === 0 ? (
                        <tr>
                           <td colSpan={todayCareTableColumnCount} className="px-6 py-12 text-center text-slate-400">
                              ChÆ°a cÃ³ lá»‹ch chÄƒm sÃ³c nÃ o trong hÃ´m nay.
                           </td>
                        </tr>
                     ) : (
                        todayCareRows.map(({ lead, activity }, index) => {
                           const statusMeta = getTodayCareStatusMeta(activity);
                           const actionLabel = getTodayCareActionLabel(activity);
                           const actionClassName = getTodayCareActionBadgeClass(activity);
                           const activityTimeValue = getTodayCareActivityDateValue(activity);
                           const activityContent = String(activity?.description || activity?.content || activity?.title || '').trim() || '-';

                           return (
                              <tr
                                 key={`${lead.id}-${activity.id || activityTimeValue}`}
                                 className="hover:bg-slate-50 transition-colors cursor-pointer"
                                 onClick={() => setSelectedLead(lead)}
                              >
                                 <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                                    <input
                                       type="checkbox"
                                       className="rounded border-slate-300"
                                       checked={selectedIds.includes(lead.id)}
                                       onChange={() => {
                                          setSelectedIds((prev) => prev.includes(lead.id) ? prev.filter((id) => id !== lead.id) : [...prev, lead.id]);
                                       }}
                                    />
                                 </td>
                                 <td className="px-4 py-4 text-center font-semibold text-slate-500">{index + 1}</td>
                                 <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1">
                                       <span className="text-sm font-bold text-slate-900">{lead.name || '-'}</span>
                                       <span className="text-xs text-slate-500">{lead.program || lead.source || '-'}</span>
                                    </div>
                                 </td>
                                 <td className="px-6 py-4 text-sm font-medium text-slate-700">{lead.phone || '-'}</td>
                                 <td className="px-6 py-4 text-sm text-slate-700">{getLeadOwnerName(lead)}</td>
                                 <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-bold whitespace-nowrap ${actionClassName}`}>
                                       {actionLabel}
                                    </span>
                                 </td>
                                 <td className="px-6 py-4 text-sm font-medium text-slate-700 whitespace-nowrap">{formatTodayCareDateTime(activityTimeValue)}</td>
                                 <td className="px-6 py-4 text-sm text-slate-600 max-w-[320px]">
                                    <div className="truncate" title={activityContent}>{activityContent}</div>
                                 </td>
                                 <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${statusMeta.className}`}>
                                       {statusMeta.label}
                                    </span>
                                 </td>
                              </tr>
                           );
                        })
                     )}
                  </tbody>
               </table>
            ) : (
               <table className="w-full text-left border-collapse text-sm table-fixed">
                  <colgroup>
                      <col style={{ width: '40px' }} />
                      <col style={{ width: '56px' }} />
                      <col style={{ width: '48px' }} />
                     {ALL_COLUMNS.filter((column) => visibleColumns.includes(column.id)).map((column) => (
                        <col key={column.id} />
                     ))}
                  </colgroup>
                  <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-bold text-slate-500 uppercase shadow-sm">
                     <tr>
                        <th colSpan={listTableColumnCount} className="border-b border-slate-200 bg-white px-3 py-2 text-left align-middle normal-case">
                           {renderStatusTabs()}
                        </th>
                     </tr>
                     <tr>
                        <th className="w-10 px-2 py-3 border-r border-slate-200 text-center">
                           <input
                              type="checkbox"
                              className="rounded border-slate-300"
                              onChange={handleSelectAll}
                              checked={selectedIds.length === filteredLeads.length && filteredLeads.length > 0}
                           />
                        </th>
                        <th className="w-14 px-2 py-3 border-r border-slate-200 text-center">STT</th>
                        <th className="w-12 px-2 py-3 border-r border-slate-200 text-center">
                           <Phone size={12} className="mx-auto text-slate-400" />
                        </th>

                        {visibleColumns.includes('opportunity') && <th className="p-3 border-r border-slate-200 whitespace-nowrap text-left">Tên liên hệ</th>}
                        {visibleColumns.includes('company') && <th className="p-3 border-r border-slate-200 whitespace-nowrap text-left">Cơ sở / Công ty</th>}
                        {visibleColumns.includes('contact') && <th className="p-3 border-r border-slate-200 whitespace-nowrap text-left">Tên liên hệ phụ</th>}
                        {visibleColumns.includes('createdAt') && <th className="p-3 border-r border-slate-200 whitespace-nowrap text-left">Ngày đổ lead</th>}
                        {visibleColumns.includes('title') && <th className="p-3 border-r border-slate-200 whitespace-nowrap text-left">Danh xưng</th>}
                        {visibleColumns.includes('email') && <th className="p-3 border-r border-slate-200 whitespace-nowrap text-left">Email</th>}
                        {visibleColumns.includes('phone') && <th className="p-3 border-r border-slate-200 whitespace-nowrap text-left">SĐT</th>}
                        {visibleColumns.includes('address') && <th className="p-3 border-r border-slate-200 whitespace-nowrap text-left">Địa chỉ</th>}
                        {visibleColumns.includes('salesperson') && <th className="p-3 border-r border-slate-200 whitespace-nowrap text-left">Nhân viên Sale</th>}
                        {visibleColumns.includes('campaign') && <th className="p-3 border-r border-slate-200 whitespace-nowrap text-left">Chiến dịch</th>}
                        {visibleColumns.includes('source') && <th className="p-3 border-r border-slate-200 whitespace-nowrap text-left">Nguồn kênh</th>}
                        {visibleColumns.includes('potential') && <th className="p-3 border-r border-slate-200 whitespace-nowrap text-left">Mức độ tiềm năng</th>}
                        {visibleColumns.includes('tags') && <th className="p-3 border-r border-slate-200 whitespace-nowrap text-left">Tags</th>}
                        {visibleColumns.includes('referredBy') && <th className="p-3 border-r border-slate-200 whitespace-nowrap text-left">Người giới thiệu</th>}
                        {visibleColumns.includes('market') && <th className="p-3 border-r border-slate-200 whitespace-nowrap text-left">THỊ TRƯỜNG</th>}
                        {visibleColumns.includes('product') && <th className="p-3 border-r border-slate-200 whitespace-nowrap text-left">SẢN PHẨM QUAN TÂM</th>}
                        {visibleColumns.includes('notes') && <th className="p-3 border-r border-slate-200 whitespace-nowrap text-left">Ghi chú</th>}
                        {visibleColumns.includes('nextActivity') && <th className="p-3 border-r border-slate-200 whitespace-nowrap text-left">Hoạt động tiếp theo</th>}
                        {visibleColumns.includes('deadline') && <th className="p-3 border-r border-slate-200 whitespace-nowrap text-left">Hạn chót</th>}
                        {visibleColumns.includes('value') && <th className="p-3 border-r border-slate-200 whitespace-nowrap text-left">Doanh thu</th>}
                        {visibleColumns.includes('status') && <th className="p-3 border-r border-slate-200 text-center whitespace-nowrap">Trạng thái</th>}
                        {visibleColumns.includes('sla') && <th className="p-3 border-slate-200 whitespace-nowrap text-left">Cảnh báo SLA</th>}
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {filteredLeads.length === 0 ? (
                        <tr>
                           <td colSpan={listTableColumnCount} className="px-6 py-14 text-center text-slate-500">
                              <div className="flex flex-col items-center gap-3">
                                 <Inbox size={34} className="text-slate-300" />
                                 <p>{myLeadsEmptyLabel}</p>
                                  {leads.length === 0 && (
                                     <button
                                        onClick={openCreateLeadModal}
                                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded text-xs font-bold transition-all shadow-sm"
                                     >
                                        <UserPlus size={14} /> {isSalesLeader ? 'Tạo lead mới' : 'Tạo lead cho tôi'}
                                     </button>
                                  )}
                              </div>
                           </td>
                        </tr>
                     ) : groupBy === 'none' ? renderTableRows(filteredLeads) : (
                        (() => {
                           let rowOffset = 0;
                           return Object.entries(groupedLeads).map(([groupName, items]) => {
                              const groupStartIndex = rowOffset;
                              rowOffset += items.length;
                              return (
                           <React.Fragment key={groupName}>
                              <tr className="bg-slate-100 border-y border-slate-200">
                                 <td colSpan={listTableColumnCount} className="px-4 py-2 font-bold text-slate-700 text-xs uppercase flex items-center gap-2">
                                    <ChevronDown size={14} /> {groupName}
                                    <span className="bg-slate-200 px-2 py-0.5 rounded-full text-[10px]">{items.length}</span>
                                 </td>
                              </tr>
                              {renderTableRows(items, groupStartIndex)}
                           </React.Fragment>
                           );
                           });
                        })()
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
                        ThÃªm CÆ¡ há»™i / Lead Má»›i
                     </h3>
                     <div className="flex items-center gap-3">
                        <button className="px-3 py-1.5 bg-white border border-slate-300 rounded text-slate-600 flex items-center gap-2 text-sm font-semibold hover:bg-slate-50">
                           <Phone size={16} /> Cuá»™c gá»i
                        </button>
                        <button onClick={() => setShowCreateLeadModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                     </div>
                  </div>

                  <div className="flex-1 overflow-y-auto bg-white p-6 md:p-8 custom-scrollbar">
                     <LeadDrawerProfileForm
                        leadFormData={newLeadData}
                        leadFormActiveTab={createModalActiveTab}
                        closeReasonOptions={isClosedLeadStatus(newLeadData.status) ? newCloseReasonOptions : []}
                        salesOptions={leadSalesOptions}
                        availableTags={availableTags}
                        fixedTags={FIXED_LEAD_TAGS}
                        isAddingTag={isAddingTag}
                        customCloseReason={CUSTOM_CLOSE_REASON}
                        onPatch={patchNewLeadData}
                        onTabChange={setCreateModalActiveTab}
                        onStatusChange={(status) => setNewLeadData((prev) => ({
                           ...prev,
                           status,
                           ...getCloseReasonStateForStatusChange(status, prev.lossReason, prev.lossReasonCustom)
                        }))}
                        onStartAddingTag={() => setIsAddingTag(true)}
                        onStopAddingTag={() => setIsAddingTag(false)}
                        onAddTag={addTagToNewLead}
                        onCreateTag={(tag) => {
                           addTagCatalogEntry(tag);
                           addTagToNewLead(tag);
                        }}
                        onRemoveSelectedTag={(tag) => setNewLeadData((prev) => ({ ...prev, tags: prev.tags.filter((item) => item !== tag) }))}
                        onDeleteTag={deleteTagCatalogEntry}
                     />
                  </div>

                  {false && (
                  <div className="flex-1 overflow-y-auto bg-white p-6 md:p-8 custom-scrollbar">
                     <div className="mb-6">
                        <label className="block text-slate-700 text-sm font-bold mb-2">MÃ´ táº£ / TÃªn khÃ¡ch hÃ ng <span className="text-red-500">*</span></label>
                        <div className="flex gap-3">
                           <select
                              className="w-28 px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none bg-white font-medium text-slate-700"
                              value={newLeadData.title}
                              onChange={e => setNewLeadData({ ...newLeadData, title: e.target.value })}
                           >
                              <option value="">Danh xÆ°ng</option>
                              {LEAD_RELATION_OPTIONS.map((option) => (
                                 <option key={option.value} value={option.value}>
                                    {option.label}
                                 </option>
                              ))}
                              {false && (
                                 <>
                              <option value="">Danh xÆ°ng</option>
                              <option value="Mr.">Anh</option>
                              <option value="Ms.">Chá»‹</option>
                              <option value="Phá»¥ huynh">Phá»¥ huynh</option>
                              <option value="Há»c sinh">Há»c sinh</option>
                                 </>
                              )}
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
                              <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Quá»‘c gia má»¥c tiÃªu <span className="text-red-500">*</span></label>
                              <select
                                 className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none bg-white text-slate-700"
                                 value={newLeadData.targetCountry}
                                 onChange={e => setNewLeadData({ ...newLeadData, targetCountry: e.target.value })}
                              >
                                 <option value="">-- Chá»n quá»‘c gia má»¥c tiÃªu --</option>
                                 {LEAD_TARGET_COUNTRY_OPTIONS.map((option) => (
                                    <option key={option} value={option}>
                                       {option}
                                    </option>
                                 ))}
                              </select>
                           </div>

                           {false && (
                              <>
                           <div className="flex items-center gap-4">
                              <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Quá»‘c gia má»¥c tiÃªu <span className="text-red-500">*</span></label>
                              <select
                                 className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none bg-white text-slate-700"
                                 value={newLeadData.targetCountry}
                                 onChange={e => setNewLeadData({ ...newLeadData, targetCountry: e.target.value })}
                              >
                                 <option value="">-- Chá»n quá»‘c gia má»¥c tiÃªu --</option>
                                 {LEAD_TARGET_COUNTRY_OPTIONS.map((option) => (
                                    <option key={option} value={option}>
                                       {option}
                                    </option>
                                 ))}
                              </select>
                           </div>

                           <div className="flex items-center gap-4">
                              <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">CÆ¡ sá»Ÿ</label>
                              <select
                                 className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none bg-white text-slate-700"
                                 value={newLeadData.company}
                                 onChange={e => setNewLeadData({ ...newLeadData, company: e.target.value })}
                              >
                                 <option value="">-- Chá»n cÆ¡ sá»Ÿ --</option>
                                 <option value="Hanoi">HÃ  Ná»™i</option>
                                 <option value="HCMC">TP. HCM</option>
                                 <option value="DaNang">ÄÃ  Náºµng</option>
                                 <option value="HaiPhong">Háº£i PhÃ²ng</option>
                              </select>
                           </div>

                              </>
                           )}

                           <div className="flex items-start gap-4">
                              <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold pt-2">Äá»‹a chá»‰</label>
                              <div className="flex-1 space-y-2">
                                 <input
                                    className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none text-slate-700 placeholder:text-slate-400"
                                    placeholder="Sá»‘ nhÃ , Ä‘Æ°á»ng..."
                                    value={newLeadData.street}
                                    onChange={e => setNewLeadData({ ...newLeadData, street: e.target.value })}
                                 />
                                 <div className="grid grid-cols-3 gap-2">
                                    <input
                                       className="px-2 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none text-slate-700 placeholder:text-slate-400"
                                       placeholder="Tá»‰nh/TP"
                                       value={newLeadData.province}
                                       onChange={e => setNewLeadData({ ...newLeadData, province: e.target.value })}
                                    />
                                    <input
                                       className="px-2 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none text-slate-700 placeholder:text-slate-400"
                                       placeholder="Quáº­n/Huyá»‡n"
                                       value={newLeadData.city}
                                       onChange={e => setNewLeadData({ ...newLeadData, city: e.target.value })}
                                    />
                                    <input
                                       className="px-2 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none text-slate-700 placeholder:text-slate-400"
                                       placeholder="P/XÃ£"
                                       value={newLeadData.ward}
                                       onChange={e => setNewLeadData({ ...newLeadData, ward: e.target.value })}
                                    />
                                 </div>
                              </div>
                           </div>

                           <div className="flex items-center gap-4">
                              <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Sáº£n pháº©m</label>
                              <select
                                 className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none bg-white text-slate-700"
                                 value={newLeadData.product}
                                 onChange={e => setNewLeadData({ ...newLeadData, product: e.target.value })}
                              >
                                 <option value="">-- Chá»n sáº£n pháº©m --</option>
                                 <option value="Tiáº¿ng Äá»©c">Tiáº¿ng Äá»©c</option>
                                 <option value="Du há»c Äá»©c">Du há»c Äá»©c</option>
                                 <option value="Du há»c Nghá»">Du há»c Nghá»</option>
                                 <option value="XKLÄ">Xuáº¥t kháº©u lao Ä‘á»™ng</option>
                              </select>
                           </div>

                           <div className="flex items-center gap-4">
                              <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Thá»‹ trÆ°á»ng</label>
                              <select
                                 className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none bg-white text-slate-700"
                                 value={newLeadData.market}
                                 onChange={e => setNewLeadData({ ...newLeadData, market: e.target.value })}
                              >
                                 <option value="">-- Chá»n --</option>
                                 <option value="Vinh">Vinh</option>
                                 <option value="HÃ  TÄ©nh">HÃ  TÄ©nh</option>
                                 <option value="HÃ  Ná»™i">HÃ  Ná»™i</option>
                                 <option value="Online">Online</option>
                              </select>
                           </div>
                        </div>

                        <div className="space-y-4">
                           <div className="flex items-center gap-4">
                              <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Äiá»‡n thoáº¡i <span className="text-red-500">*</span></label>
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
                              <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Phá»¥ trÃ¡ch</label>
                              <select
                                 className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none bg-white text-slate-700"
                                 value={newLeadData.salesperson}
                                 onChange={e => setNewLeadData({ ...newLeadData, salesperson: e.target.value })}
                              >
                                 <option value="">-- Sale phá»¥ trÃ¡ch --</option>
                                 {SALES_REPS.map(rep => (
                                    <option key={rep.id} value={rep.id}>{rep.name}</option>
                                 ))}
                              </select>
                           </div>

                           <div className="flex items-center gap-4">
                              <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Tráº¡ng thÃ¡i</label>
                              <select
                                 className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none bg-white text-slate-700"
                                 value={newLeadData.status}
                                 onChange={e => setNewLeadData({ ...newLeadData, status: e.target.value })}
                              >
                                 {LEAD_STATUS_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                 ))}
                              </select>
                           </div>

                           <div className="flex items-start gap-4">
                              <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold mt-1.5">Tags</label>
                                                            <LeadTagManager
                                 selectedTags={newLeadData.tags}
                                 availableTags={availableTags}
                                 fixedTags={FIXED_LEAD_TAGS}
                                 isAdding={isAddingTag}
                                 accent="purple"
                                 mode="dropdown"
                                 onStartAdding={() => setIsAddingTag(true)}
                                 onStopAdding={() => setIsAddingTag(false)}
                                 onAddTag={addTagToNewLead}
                                 onCreateTag={(tag) => {
                                    addTagCatalogEntry(tag);
                                    addTagToNewLead(tag);
                                 }}
                                 onRemoveSelectedTag={(tag) => setNewLeadData((prev) => ({ ...prev, tags: prev.tags.filter((item) => item !== tag) }))}
                                 onDeleteTag={deleteTagCatalogEntry}
                              />
                        </div>
                     </div>
                  </div>

                     <div className="mt-8 border-t border-slate-200 pt-4">
                        <div className="flex border-b border-slate-200 mb-4">
                           <button
                              onClick={() => setCreateModalActiveTab('notes')}
                              className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${createModalActiveTab === 'notes' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                           >
                              Ghi chÃº ná»™i bá»™
                           </button>
                           <button
                              onClick={() => setCreateModalActiveTab('student')}
                              className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${createModalActiveTab === 'student' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                           >
                              ThÃ´ng tin há»c sinh
                           </button>
                           <button
                              onClick={() => setCreateModalActiveTab('extra')}
                              className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${createModalActiveTab === 'extra' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                           >
                              ThÃ´ng tin thÃªm (Marketing)
                           </button>
                        </div>

                        <div className="min-h-[200px]">
                           {createModalActiveTab === 'notes' && (
                              <div className="animate-in fade-in duration-200">
                                 <textarea
                                    className="w-full p-3 border border-slate-200 rounded text-sm focus:border-purple-500 outline-none text-slate-700 h-40"
                                    placeholder="Viáº¿t ghi chÃº..."
                                    value={newLeadData.notes}
                                    onChange={e => setNewLeadData({ ...newLeadData, notes: e.target.value })}
                                 />
                              </div>
                           )}

                           {createModalActiveTab === 'student' && (
                              <LeadStudentInfoTab data={newLeadData} onPatch={patchNewLeadData} />
                           )}

                           {createModalActiveTab === 'extra' && (
                              <div className="grid grid-cols-2 gap-x-12 gap-y-4 animate-in fade-in duration-200">
                                 <div className="flex items-center gap-4">
                                    <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Chiáº¿n dá»‹ch</label>
                                    <input
                                       className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none text-slate-700"
                                       value={newLeadData.campaign}
                                       onChange={e => setNewLeadData({ ...newLeadData, campaign: e.target.value })}
                                    />
                                 </div>
                                 <div className="flex items-center gap-4">
                                    <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Nguá»“n</label>
                                    <select
                                       className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none bg-white text-slate-700"
                                       value={newLeadData.source}
                                       onChange={e => setNewLeadData({ ...newLeadData, source: e.target.value })}
                                    >
                                       <option value="hotline">Hotline</option>
                                       <option value="facebook">Facebook</option>
                                       <option value="google">Google Ads</option>
                                       <option value="referral">Giá»›i thiá»‡u</option>
                                    </select>
                                 </div>
                                 <div className="flex items-center gap-4">
                                    <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">KÃªnh</label>
                                    <select
                                       className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none bg-white text-slate-700"
                                       value={newLeadData.channel}
                                       onChange={e => setNewLeadData({ ...newLeadData, channel: e.target.value })}
                                    >
                                       <option value="">-- Chá»n kÃªnh --</option>
                                       {LEAD_CHANNEL_OPTIONS.map(option => (
                                          <option key={option.value} value={option.value}>{option.label}</option>
                                       ))}
                                    </select>
                                 </div>
                                 <div className="flex items-center gap-4">
                                    <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">NgÆ°á»i GT</label>
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
                  )}

                  <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 shrink-0">
                     <button onClick={() => setShowCreateLeadModal(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg">Há»§y bá»</button>
                     <button onClick={handleCreateMyLead} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center gap-2 shadow-sm"><Save size={18} /> LÆ°u Lead má»›i</button>
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

