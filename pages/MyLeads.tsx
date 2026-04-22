import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getDeals, getLeads, saveLead, saveDeals, saveLeads, getClosedLeadReasons, getTags, saveTags } from '../utils/storage';
import { LeadStatus, ILead, DealStage, UserRole, type Activity } from '../types';
import ConvertLeadModal, { ConvertLeadModalSubmitData } from '../components/ConvertLeadModal';
import LeadCareScheduleModal, {
   POST_CONVERT_SCHEDULE_OPTIONS,
   type PostConvertScheduleAction,
} from '../components/LeadCareScheduleModal';
import UnifiedLeadDrawer from '../components/UnifiedLeadDrawer';
import LeadDrawerProfileForm from '../components/LeadDrawerProfileForm';
import LeadPivotTable from '../components/LeadPivotTable';
import LeadStudentInfoTab from '../components/LeadStudentInfoTab';
import LeadTagManager from '../components/LeadTagManager';
import SLABadge from '../components/SLABadge';
import OdooSearchBar, { SearchFilter, SearchFieldConfig } from '../components/OdooSearchBar';
import { AdvancedFilterDropdown, ToolbarTimeFilter } from '../components/filters';
import SLAWarningBanner from '../components/SLAWarningBanner';
import SalesRoleTestSwitcher from '../components/SalesRoleTestSwitcher';
import { buildDomainFromFilters, applyDomainFilter } from '../utils/filterDomain';
import { doesDateMatchTimeRange, getTimeRangeSummaryLabel } from '../utils/filterToolbar';
import {
   DEFAULT_LEAD_ACTION_FILTER_FIELD,
   getLeadToolbarFieldValue,
   getLeadToolbarFieldValues,
   getLeadToolbarSelectableOptions,
   getLeadToolbarTimeFieldLabel,
   getLeadToolbarTimeValue,
   LEAD_TOOLBAR_FIELD_LABELS,
   LEAD_TOOLBAR_FILTER_OPTIONS,
   LEAD_TOOLBAR_GROUP_OPTIONS,
   LEAD_TOOLBAR_TIME_FIELD_OPTIONS,
   LEAD_TOOLBAR_TIME_PRESETS,
   type LeadActionFilterSelection,
   type LeadToolbarFilterFieldKey,
   type LeadToolbarGroupFieldKey,
} from '../utils/leadToolbarConfig';
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
   isLeadStatusOneOf,
   isClosedLeadStatusKey,
   LEAD_STATUS_KEYS,
   LEAD_STATUS_OPTIONS,
   normalizeLeadStatusKey,
   toLeadStatusValue,
} from '../utils/leadStatus';
import { decodeMojibakeReactNode, decodeMojibakeText } from '../utils/mojibake';
import { getLeadPhoneValidationMessage, normalizeLeadPhone } from '../utils/phone';
import { clearLeadReclaimTracking } from '../utils/leadSla';
import { convertLeadToOpportunity } from '../utils/leadConversion';
import {
   Inbox, Phone, Clock, CheckCircle2, X,
   List as ListIcon,
   ChevronDown,
   Layout, LayoutGrid, Cog, Download, Archive, MessageSquare, Trash2,
   UserPlus, Shuffle, XCircle, Save, Settings
} from 'lucide-react';

type MyLeadsGroupBy = LeadToolbarGroupFieldKey;
type MyLeadsAdvancedFieldKey = LeadToolbarFilterFieldKey;
type MyLeadsAdvancedFilters = Record<MyLeadsAdvancedFieldKey, string[]>;
type AdvancedFieldOption = { value: string; label: string };
type PostConvertScheduleState = {
   dealId: string;
   leadId: string;
   defaultAction: PostConvertScheduleAction;
   defaultDateTime: string;
};

const DEFAULT_ADVANCED_FIELD_FILTERS: MyLeadsAdvancedFilters = {
   status: [],
   salesperson: [],
   source: [],
   campaign: [],
   product: [],
   targetCountry: [],
   potential: [],
   company: [],
};

const getPostConvertScheduleLabel = (action: PostConvertScheduleAction) =>
   POST_CONVERT_SCHEDULE_OPTIONS.find((option) => option.value === action)?.label || 'Gọi điện';

const getDefaultPostConvertScheduleDateTime = (action: PostConvertScheduleAction) => {
   const matchedOption = POST_CONVERT_SCHEDULE_OPTIONS.find((option) => option.value === action);
   const nextDate = new Date();
   nextDate.setHours(nextDate.getHours() + (matchedOption?.defaultDelayHours || 2));
   return new Date(nextDate.getTime() - (nextDate.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
};

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

   const normalizeFilterToken = useCallback((value?: string) => decodeMojibakeText(String(value || '')).trim().toLowerCase(), []);
   const normalizeOwnerToken = normalizeFilterToken;

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
   const [groupBy, setGroupBy] = useState<MyLeadsGroupBy[]>([]);
   const [viewMode, setViewMode] = useState<'list' | 'pivot' | 'kanban'>('list');
   const [filterType, setFilterType] = useState('all');
   const [statusFilterSource, setStatusFilterSource] = useState<'tabs' | 'advanced' | null>(null);

   // Drawer State
   const [selectedLead, setSelectedLead] = useState<ILead | null>(null);
   const [leadToConvert, setLeadToConvert] = useState<ILead | null>(null);
   const [postConvertSchedule, setPostConvertSchedule] = useState<PostConvertScheduleState | null>(null);
   const [bulkLeadsToConvert, setBulkLeadsToConvert] = useState<ILead[]>([]);

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
   const [timeFilterField, setTimeFilterField] = useState<LeadActionFilterSelection>('action');
   const [timeRangeType, setTimeRangeType] = useState<string>('all');
   const [customRange, setCustomRange] = useState<{ start: string; end: string } | null>(null);
   const [advancedFieldFilters, setAdvancedFieldFilters] = useState<MyLeadsAdvancedFilters>(DEFAULT_ADVANCED_FIELD_FILTERS);
   const [selectedAdvancedFilterFields, setSelectedAdvancedFilterFields] = useState<string[]>([]);
   const [selectedAdvancedFilterValue, setSelectedAdvancedFilterValue] = useState('');

   const timeFieldOptions = LEAD_TOOLBAR_TIME_FIELD_OPTIONS;
   const timePresets = LEAD_TOOLBAR_TIME_PRESETS;

   const filterTypeLabels: Record<string, string> = {
      'no-activity': 'ChÆ°a cÃ³ hoáº¡t Ä‘á»™ng',
      'high-value': 'CÆ¡ há»™i giÃ¡ trá»‹ cao',
   };

   const groupByLabels = LEAD_TOOLBAR_FIELD_LABELS;

   const statusFilterLabels: Record<string, string> = {
      overdue: 'DS qua han',
      today_care: 'Cham soc hom nay',
      [LEAD_STATUS_KEYS.ASSIGNED]: 'Cho tiep nhan',
      [LEAD_STATUS_KEYS.PICKED]: 'Da nhan',
      [LEAD_STATUS_KEYS.CONTACTED]: 'Dang cham soc',
      [LEAD_STATUS_KEYS.CONVERTED]: 'Da convert',
      [LEAD_STATUS_KEYS.NURTURING]: 'Nuoi duong',
      [LEAD_STATUS_KEYS.UNVERIFIED]: 'Khong xac thuc',
      [LEAD_STATUS_KEYS.LOST]: 'Mat',
   };

   const getLeadOwnerName = useCallback((lead: ILead) => {
      const matchedRep = SALES_REPS.find((rep) => rep.id === lead.ownerId);
      if (matchedRep?.name) return decodeMojibakeText(matchedRep.name);
      if (lead.ownerId === user?.id) return decodeMojibakeText(user?.name || 'Toi');
      return decodeMojibakeText(lead.ownerId || 'Chua phan cong');
   }, [user]);

   const getLeadAdvancedFilterValue = useCallback((lead: ILead, field: MyLeadsAdvancedFieldKey) => {
      return getLeadToolbarFieldValue(lead, field, {
         getSalespersonLabel: getLeadOwnerName,
         emptyLabel: ''
      });
   }, [getLeadOwnerName]);

   const getLeadGroupByValue = useCallback((lead: ILead, field: MyLeadsGroupBy) => {
      return getLeadToolbarFieldValue(lead, field, {
         getSalespersonLabel: getLeadOwnerName
      });
   }, [getLeadOwnerName]);

   const getLeadSearchFieldValue = useCallback((lead: ILead, field: string) => {
      if (field === 'name') return lead.name || '';
      if (field === 'phone') return lead.phone || '';
      if (field === 'email') return lead.email || '';
      if (field === 'city') return String((lead as any).city || '').trim();
      if (field === 'program') return lead.program || '';
      if (field === 'source') return lead.source || '';
      if (field === 'status') return `${lead.status || ''} ${getLeadStatusLabel(String(lead.status || ''))}`.trim();
      if (field === 'ownerId') return `${lead.ownerId || ''} ${getLeadOwnerName(lead)}`.trim();
      if (field === 'company') return String((lead as any).company || '');
      if (field === 'notes') return String((lead as any).notes || '');
      return String((lead as any)[field] || '');
   }, [getLeadOwnerName]);

   const advancedFieldOptions = useMemo(() => {
      return LEAD_TOOLBAR_FILTER_OPTIONS.reduce((acc, field) => {
         const dynamicValues = leads.flatMap((lead) =>
            getLeadToolbarFieldValues(lead, field.id, { getSalespersonLabel: getLeadOwnerName })
         );
         acc[field.id] = getLeadToolbarSelectableOptions(field.id, {
            salesOptions: leadSalesOptions,
            dynamicValues
         });
         return acc;
      }, {} as Record<MyLeadsAdvancedFieldKey, AdvancedFieldOption[]>);
   }, [getLeadOwnerName, leadSalesOptions, leads]);

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
      { field: 'ownerId', label: 'NhÃ³m theo NgÆ°á»i phá»¥ trÃ¡ch', category: 'NhÃ³m dá»¯ liá»‡u', type: 'groupby' },
      { field: 'status', label: 'NhÃ³m theo Giai Ä‘oáº¡n', category: 'NhÃ³m dá»¯ liá»‡u', type: 'groupby' },
      { field: 'source', label: 'NhÃ³m theo Nguá»“n', category: 'NhÃ³m dá»¯ liá»‡u', type: 'groupby' },
      { field: 'program', label: 'NhÃ³m theo ChÆ°Æ¡ng trÃ¬nh', category: 'NhÃ³m dá»¯ liá»‡u', type: 'groupby' },
      { field: 'city', label: 'NhÃ³m theo ThÃ nh phá»‘', category: 'NhÃ³m dá»¯ liá»‡u', type: 'groupby' },
   ];

   const reloadMyLeads = useCallback(() => {
      const allLeads = getLeads();
      applyLeadScope(allLeads);
   }, [applyLeadScope]);

   const resolveCreatedLeadAssignment = (requestedStatus: ILead['status'], selectedOwnerId: string, nowIso: string) => {
      const isSelfOwnedLead = selectedOwnerId === user?.id;

      const effectiveStatus =
         isSelfOwnedLead && isLeadStatusOneOf(String(requestedStatus || ''), [LEAD_STATUS_KEYS.NEW, LEAD_STATUS_KEYS.ASSIGNED])
            ? LeadStatus.PICKED
            : !isSelfOwnedLead && normalizeLeadStatusKey(String(requestedStatus || '')) === LEAD_STATUS_KEYS.PICKED
               ? LeadStatus.ASSIGNED
               : requestedStatus;

      return {
         isSelfOwnedLead,
         effectiveStatus,
         pickUpDate: isSelfOwnedLead ? nowIso : undefined
      };
   };

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
      const selectedOwnerId = newLeadData.salesperson || user.id;

      const program = (newLeadData.product && ['Tiáº¿ng Äá»©c', 'Tiáº¿ng Trung', 'Du há»c Äá»©c', 'Du há»c Trung', 'Du há»c nghá» Ãšc'].includes(newLeadData.product))
         ? newLeadData.product as ILead['program']
         : newLeadData.program as ILead['program'];

      const nowIso = new Date().toISOString();
      const { isSelfOwnedLead, effectiveStatus, pickUpDate } = resolveCreatedLeadAssignment(mappedStatus, selectedOwnerId, nowIso);
      const leadBase: ILead = {
         id: `l-${Date.now()}`,
         ...newLeadData,
         phone: normalizedPhone,
         program,
         ownerId: selectedOwnerId,
         marketingData: {
            tags: newLeadData.tags,
            campaign: newLeadData.campaign,
            channel: newLeadData.channel,
            market: newLeadData.market
         },
         status: effectiveStatus,
         createdAt: nowIso,
         pickUpDate,
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
            }),
            ...(isSelfOwnedLead ? [
               buildLeadActivityLog({
                  type: 'system',
                  timestamp: nowIso,
                  title: 'Tự nhận lead',
                  description: `Lead do ${user.name || 'Tôi'} tự tạo nên được tự động nhận ngay khi tạo.`,
                  user: user.name || 'System'
               })
            ] : [])
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
                  buildLeadAuditChange('ownerId', '', selectedOwnerId, 'Sale phá»¥ trÃ¡ch'),
                  buildLeadAuditChange('status', '', effectiveStatus, 'Tráº¡ng thÃ¡i'),
                  ...(pickUpDate ? [buildLeadAuditChange('pickUpDate', '', pickUpDate, 'Thá»i gian nháº­n lead')] : [])
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
      const selectedOwnerId = newLeadData.salesperson || user.id;
      const program = (
         newLeadData.product &&
         ['Tiáº¿ng Äá»©c', 'Tiáº¿ng Trung', 'Du há»c Äá»©c', 'Du há»c Trung', 'Du há»c nghá» Ãšc'].includes(newLeadData.product)
      )
         ? newLeadData.product as ILead['program']
         : newLeadData.program as ILead['program'];

      const nowIso = new Date().toISOString();
      const { isSelfOwnedLead, effectiveStatus, pickUpDate } = resolveCreatedLeadAssignment(mappedStatus, selectedOwnerId, nowIso);
      const campus = resolveLeadCampus(newLeadData);
      const guardianRelation = getLeadGuardianRelation(newLeadData.title);
      const studentInfo = buildLeadStudentInfo(newLeadData);
      const resolvedCloseReason = resolveCloseReason(newLeadData.lossReason, newLeadData.lossReasonCustom);
      const leadBase: ILead = {
         id: `l-${Date.now()}`,
         ...newLeadData,
         phone: normalizedPhone,
         program,
         ownerId: selectedOwnerId,
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
         status: effectiveStatus,
         createdAt: nowIso,
         pickUpDate,
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
            }),
            ...(isSelfOwnedLead ? [
               buildLeadActivityLog({
                  type: 'system',
                  timestamp: nowIso,
                  title: 'Tự nhận lead',
                  description: `Lead do ${user.name || 'Tôi'} tự tạo nên được tự động nhận ngay khi tạo.`,
                  user: user.name || 'System'
               })
            ] : [])
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
                  buildLeadAuditChange('ownerId', '', selectedOwnerId, 'Sale phá»¥ trÃ¡ch'),
                  buildLeadAuditChange('status', '', effectiveStatus, 'Tráº¡ng thÃ¡i'),
                  ...(pickUpDate ? [buildLeadAuditChange('pickUpDate', '', pickUpDate, 'Thá»i gian nháº­n lead')] : [])
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

   const resolvedTimeFilterField =
      timeFilterField === 'action' ? DEFAULT_LEAD_ACTION_FILTER_FIELD : timeFilterField;

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
         }, getLeadSearchFieldValue);
      }

      (Object.entries(advancedFieldFilters) as Array<[MyLeadsAdvancedFieldKey, string[]]>).forEach(([field, selectedValues]) => {
         if (selectedValues.length === 0) return;
         const normalizedSelectedValues = new Set(selectedValues.map((value) => normalizeFilterToken(value)));
         result = result.filter((lead) => normalizedSelectedValues.has(normalizeFilterToken(getLeadAdvancedFilterValue(lead, field))));
      });

      if (statusFilter === 'overdue') {
         result = result.filter(isOverdueLead);
      } else if (statusFilter === 'today_care') {
         result = result.filter(isTodayCareLead);
      } else if (statusFilter !== 'all') {
         result = result.filter(l => normalizeLeadStatusKey(String(l.status || '')) === statusFilter);
      }

      // --- TIME RANGE FILTERING ---
      if (timeRangeType !== 'all') {
         result = result.filter((lead) =>
            doesDateMatchTimeRange(getLeadToolbarTimeValue(lead, resolvedTimeFilterField), timeRangeType, customRange)
         );
      }

      // Advanced Filters
      if (filterType === 'no-activity') {
         result = result.filter(l => !l.activities || l.activities.length === 0);
      } else if (filterType === 'high-value') {
         result = result.filter(l => (l.value || 0) > 50000000);
      }

      return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
   }, [
      advancedFieldFilters,
      customRange,
      filterType,
      getLeadAdvancedFilterValue,
      getLeadSearchFieldValue,
      leads,
      normalizeFilterToken,
      searchFilters,
      statusFilter,
      timeFilterField,
      timeRangeType,
      resolvedTimeFilterField
   ]);

   // Calculate SLA Warnings
   const slaWarnings = useMemo(() => {
      return calculateSLAWarnings(filteredLeads);
   }, [filteredLeads]);

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

      if (isLeadStatusOneOf(String(lead.status || ''), [LEAD_STATUS_KEYS.NEW, LEAD_STATUS_KEYS.ASSIGNED, LEAD_STATUS_KEYS.PICKED])) {
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
      setLeadToConvert(lead);
   };

   const handleClosePostConvertSchedule = () => {
      const nextDealId = postConvertSchedule?.dealId;
      setPostConvertSchedule(null);
      if (nextDealId) {
         navigate(`/pipeline?newDeal=${nextDealId}`);
      }
   };

   const handleSavePostConvertSchedule = ({
      action,
      summary,
      datetime,
   }: {
      action: PostConvertScheduleAction;
      summary: string;
      datetime: string;
   }) => {
      if (!postConvertSchedule) return;

      const scheduledDate = new Date(datetime);
      const scheduledAt = Number.isNaN(scheduledDate.getTime())
         ? new Date().toISOString()
         : scheduledDate.toISOString();
      const activityLabel = getPostConvertScheduleLabel(action);
      const actorName = decodeMojibakeText(user?.name || 'System');
      const newActivity: Activity = {
         id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
         type: action,
         timestamp: scheduledAt,
         title: activityLabel,
         description: summary,
         status: 'scheduled',
      };

      const updatedDeals = getDeals().map((deal) => (
         deal.id !== postConvertSchedule.dealId
            ? deal
            : {
               ...deal,
               activities: [newActivity, ...(deal.activities || [])],
            }
      ));

      saveDeals(updatedDeals);

      const persistedLead = getLeads().find((lead) => lead.id === postConvertSchedule.leadId);
      if (persistedLead) {
         const updatedLead = appendLeadLogs(
            {
               ...persistedLead,
               updatedAt: new Date().toISOString(),
            },
            {
               activities: [
                  buildLeadActivityLog({
                     type: 'activity',
                     title: activityLabel,
                     description: summary,
                     user: actorName,
                     status: 'scheduled',
                     datetime,
                  }),
               ],
               audits: [
                  buildLeadAuditLog({
                     action: 'Tạo lịch chăm sóc sau chuyển đổi',
                     actor: actorName,
                     changes: [
                        buildLeadAuditChange(
                           'postConvertSchedule',
                           '',
                           `${activityLabel} | ${summary} | ${datetime}`,
                           'Lịch chăm sóc'
                        ),
                     ],
                  }),
               ],
            }
         );

         saveLead(updatedLead);
         setLeads((prev) => prev.map((lead) => (lead.id === updatedLead.id ? updatedLead : lead)));
      }

      handleClosePostConvertSchedule();
   };

   const handleConfirmLeadConvert = ({ ownerId, salesChannel, conversionAction, customerAction, targetDealId }: ConvertLeadModalSubmitData) => {
      if (!leadToConvert) return;

      try {
         const resolvedOwnerId = ownerId || leadToConvert.ownerId || user?.id || 'admin';
         const { deal } = convertLeadToOpportunity(leadToConvert, {
            ownerId: resolvedOwnerId,
            salesChannel,
            conversionAction,
            customerAction,
            targetDealId,
         });

         const convertedLead: ILead = {
            ...leadToConvert,
            ownerId: resolvedOwnerId,
            status: LeadStatus.CONVERTED,
            updatedAt: new Date().toISOString()
         };

         saveLead(convertedLead);
         setLeads(prev => prev.map(item => item.id === leadToConvert.id ? convertedLead : item));
         setSelectedLead(null);
         setLeadToConvert(null);
         setPostConvertSchedule({
            dealId: deal.id,
            leadId: convertedLead.id,
            defaultAction: 'call',
            defaultDateTime: getDefaultPostConvertScheduleDateTime('call'),
         });
      } catch (error) {
         console.error('Convert Error', error);
         alert('Có lỗi xảy ra khi chuyển đổi Lead!');
      }
   };

   const handleConfirmBulkConvert = ({ ownerId, salesChannel, conversionAction, customerAction, targetDealId }: ConvertLeadModalSubmitData) => {
      if (bulkLeadsToConvert.length === 0) return;

      try {
         let lastDealId = '';

         bulkLeadsToConvert.forEach((lead) => {
            const resolvedOwnerId = ownerId || lead.ownerId || user?.id || 'admin';
            const { deal } = convertLeadToOpportunity(lead, {
               ownerId: resolvedOwnerId,
               salesChannel,
               conversionAction,
               customerAction,
               targetDealId,
             });

            saveLead({
               ...lead,
               ownerId: resolvedOwnerId,
               status: LeadStatus.CONVERTED,
               updatedAt: new Date().toISOString()
            });
            lastDealId = deal.id;
         });

         const convertedIdSet = new Set(bulkLeadsToConvert.map((lead) => lead.id));
         const updatedAt = new Date().toISOString();
         setLeads(prev => prev.map((lead) => (
            convertedIdSet.has(lead.id)
               ? { ...lead, ownerId: ownerId || lead.ownerId || user?.id || 'admin', status: LeadStatus.CONVERTED, updatedAt }
               : lead
         )));
         setSelectedIds([]);
         setBulkLeadsToConvert([]);

         alert(`Chuyển đổi thành công ${convertedIdSet.size} lead!`);
         if (lastDealId) navigate(`/pipeline?newDeal=${lastDealId}`);
      } catch (error) {
         console.error('Bulk Convert Error', error);
         alert('Có lỗi xảy ra khi chuyển đổi hàng loạt!');
      }
   };

   // Handle Bulk Convert
   const handleBulkConvert = () => {
      if (selectedIds.length === 0) {
         alert("ChÆ°a chá»n lead!");
         return;
      }

      setShowActionDropdown(false);
      const nextBulkLeads = filteredLeads.filter((lead) => selectedIds.includes(lead.id));
      if (nextBulkLeads.length === 0) {
         alert('KhÃ´ng cÃ³ lead há»£p lá»‡ trong danh sÃ¡ch hiá»‡n táº¡i Ä‘á»ƒ convert.');
         return;
      }

      setBulkLeadsToConvert(nextBulkLeads);
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
      if (groupBy.length === 0) return { 'All': filteredLeads };

      return filteredLeads.reduce((groups, lead) => {
         const key = groupBy
            .map((groupKey) => `${decodeMojibakeText(groupByLabels[groupKey] || groupKey)}: ${getLeadGroupByValue(lead, groupKey)}`)
            .join(' • ');

         if (!groups[key]) groups[key] = [];
         groups[key].push(lead);
         return groups;
      }, {} as Record<string, ILead[]>);
   }, [filteredLeads, getLeadGroupByValue, groupBy, groupByLabels]);

   const kanbanColumns = useMemo(() => {
      const columns: Array<{
         key: string;
         title: string;
         color: string;
         statusKeys: string[];
         leads: ILead[];
      }> = [
            {
               key: 'pending_pickup',
               title: 'Chờ tiếp nhận',
               color: 'bg-blue-50 border-blue-200',
               statusKeys: [LEAD_STATUS_KEYS.NEW, LEAD_STATUS_KEYS.ASSIGNED],
               leads: []
            },
            {
               key: LEAD_STATUS_KEYS.PICKED,
               title: getLeadStatusLabel(LEAD_STATUS_KEYS.PICKED),
               color: 'bg-yellow-50 border-yellow-200',
               statusKeys: [LEAD_STATUS_KEYS.PICKED],
               leads: []
            },
            {
               key: LEAD_STATUS_KEYS.CONTACTED,
               title: getLeadStatusLabel(LEAD_STATUS_KEYS.CONTACTED),
               color: 'bg-purple-50 border-purple-200',
               statusKeys: [LEAD_STATUS_KEYS.CONTACTED],
               leads: []
            },
            {
               key: LEAD_STATUS_KEYS.NURTURING,
               title: getLeadStatusLabel(LEAD_STATUS_KEYS.NURTURING),
               color: 'bg-teal-50 border-teal-200',
               statusKeys: [LEAD_STATUS_KEYS.NURTURING],
               leads: []
            },
            {
               key: LEAD_STATUS_KEYS.CONVERTED,
               title: getLeadStatusLabel(LEAD_STATUS_KEYS.CONVERTED),
               color: 'bg-cyan-50 border-cyan-200',
               statusKeys: [LEAD_STATUS_KEYS.CONVERTED],
               leads: []
            },
            {
               key: LEAD_STATUS_KEYS.UNVERIFIED,
               title: getLeadStatusLabel(LEAD_STATUS_KEYS.UNVERIFIED),
               color: 'bg-slate-100 border-slate-300',
               statusKeys: [LEAD_STATUS_KEYS.UNVERIFIED],
               leads: []
            },
            {
               key: LEAD_STATUS_KEYS.LOST,
               title: getLeadStatusLabel(LEAD_STATUS_KEYS.LOST),
               color: 'bg-red-50 border-red-200',
               statusKeys: [LEAD_STATUS_KEYS.LOST],
               leads: []
            },
         ];

      filteredLeads.forEach((lead) => {
         const normalized = normalizeLeadStatusKey(String(lead.status || ''));
         const column = columns.find((item) => item.statusKeys.includes(normalized));
         if (column) column.leads.push(lead);
      });

      return columns.map(({ statusKeys, ...column }) => column);
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
         syntheticField?: MyLeadsAdvancedFieldKey;
         syntheticValue?: string;
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

      (Object.entries(advancedFieldFilters) as Array<[MyLeadsAdvancedFieldKey, string[]]>).forEach(([field, values]) => {
         values.forEach((value) => {
            const optionLabel = advancedFieldOptions[field].find((option) => option.value === value)?.label || value;

            chips.push({
               field: `advanced_${field}_${value}`,
               label: LEAD_TOOLBAR_FIELD_LABELS[field],
               value: optionLabel,
               type: 'filter',
               origin: 'synthetic',
               syntheticField: field,
               syntheticValue: value,
            });
         });
      });

      groupBy.forEach((groupKey) => {
         chips.push({
            field: `group_by_${groupKey}`,
            label: 'NhÃ³m theo',
            value: groupByLabels[groupKey] || groupKey,
            type: 'groupby',
            origin: 'synthetic',
            syntheticKey: 'group-by',
            syntheticValue: groupKey,
         });
      });

      if (timeFilterField !== 'action' || timeRangeType !== 'all') {
         const timeFieldLabel = getLeadToolbarTimeFieldLabel(timeFilterField);

         chips.push({
            field: 'advanced_time',
            label: 'Thá»i gian',
            value: `${timeFieldLabel}: ${getTimeRangeSummaryLabel(timePresets, timeRangeType, customRange)}`,
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
      advancedFieldFilters,
      advancedFieldOptions,
      timeFilterField,
      timePresets,
      timeRangeType,
      customRange,
      filterTypeLabels
   ]);

   const toggleGroupBy = useCallback((groupKey: MyLeadsGroupBy) => {
      setGroupBy((prev) => {
         if (prev.includes(groupKey)) {
            return prev.filter((item) => item !== groupKey);
         }

         const next = new Set([...prev, groupKey]);
         return LEAD_TOOLBAR_GROUP_OPTIONS.map((option) => option.id).filter((value) => next.has(value));
      });
   }, []);

   const advancedDropdownFilterOptions = LEAD_TOOLBAR_FILTER_OPTIONS;
   const advancedDropdownGroupOptions = LEAD_TOOLBAR_GROUP_OPTIONS;

   const selectedAdvancedFilterOptions = advancedDropdownFilterOptions.filter((option) =>
      selectedAdvancedFilterFields.includes(option.id)
   );

   const activeAdvancedFilterField = selectedAdvancedFilterOptions[0] || null;

   const advancedFilterSelectableValues = useMemo(() => {
      if (!activeAdvancedFilterField) return [];
      return advancedFieldOptions[activeAdvancedFilterField.id as MyLeadsAdvancedFieldKey];
   }, [activeAdvancedFilterField, advancedFieldOptions]);

   const activeAdvancedFilterCount = useMemo(() => {
      const advancedValueCount = Object.values(advancedFieldFilters).reduce((count, values) => count + values.length, 0);
      const timeCount = timeFilterField !== 'action' || timeRangeType !== 'all' ? 1 : 0;
      const quickFilterCount = filterType !== 'all' ? 1 : 0;
      const statusCount = statusFilter !== 'all' ? 1 : 0;
      return advancedValueCount + groupBy.length + timeCount + quickFilterCount + statusCount;
   }, [advancedFieldFilters, filterType, groupBy.length, statusFilter, timeFilterField, timeRangeType]);

   const advancedToolbarActiveCount = activeAdvancedFilterCount + searchFilters.length;

   const hasAdvancedToolbarFilters = toolbarFilterChips.length > 0;

   const closeAdvancedFilterMenu = () => {
      setShowAdvancedFilter(false);
      setShowTimePicker(false);
      setSelectedAdvancedFilterFields([]);
      setSelectedAdvancedFilterValue('');
   };

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
         if (chip.syntheticValue) {
            setGroupBy((prev) => prev.filter((item) => item !== chip.syntheticValue));
            return;
         }
         setGroupBy([]);
         return;
      }

      if (chip.syntheticKey === 'status') {
         setStatusFilter('all');
         setStatusFilterSource(null);
         return;
      }

      if (chip.syntheticField && chip.syntheticValue) {
         setAdvancedFieldFilters((prev) => ({
            ...prev,
            [chip.syntheticField]: prev[chip.syntheticField].filter((item) => item !== chip.syntheticValue),
         }));
         return;
      }

      if (chip.syntheticKey === 'time') {
         setTimeFilterField('action');
         setTimeRangeType('all');
         setCustomRange(null);
         setShowTimePicker(false);
      }
   };

   const handleClearToolbarFilters = () => {
      setSearchFilters([]);
      setFilterType('all');
      setGroupBy([]);
      setTimeFilterField('action');
      setTimeRangeType('all');
      setCustomRange(null);
      setShowTimePicker(false);
      setStatusFilter('all');
      setStatusFilterSource(null);
      setAdvancedFieldFilters({ ...DEFAULT_ADVANCED_FIELD_FILTERS });
      setSelectedAdvancedFilterFields([]);
      setSelectedAdvancedFilterValue('');
      setShowAdvancedFilter(false);
      setShowActionDropdown(false);
      setShowColumnDropdown(false);
   };

   const toggleAdvancedDropdownSelection = useCallback((type: 'filter' | 'group', fieldId: string) => {
      if (type === 'filter') {
         setSelectedAdvancedFilterValue('');
         setSelectedAdvancedFilterFields((prev) => (prev.includes(fieldId) ? [] : [fieldId]));
         return;
      }

      toggleGroupBy(fieldId as MyLeadsGroupBy);
   }, [toggleGroupBy]);

   const handleTimeFilterOpenChange = (nextOpen: boolean) => {
      setShowAdvancedFilter(false);
      setShowActionDropdown(false);
      setShowColumnDropdown(false);
      setShowTimePicker(nextOpen);
   };

   const handleTimeFilterFieldChange = (nextFieldId: string) => {
      setShowAdvancedFilter(false);
      setShowActionDropdown(false);
      setShowColumnDropdown(false);
      setShowTimePicker(false);
      setTimeFilterField(nextFieldId as LeadActionFilterSelection);
   };

   const handleTimePresetSelect = (presetId: string) => {
      setTimeRangeType(presetId);
      if (presetId !== 'custom') {
         setShowTimePicker(false);
      }
   };

   const handleApplyCustomTimeRange = () => {
      if (customRange?.start && customRange?.end) {
         setTimeRangeType('custom');
         setShowTimePicker(false);
         return;
      }

      alert('Vui lòng chọn khoảng ngày');
   };

   const handleAdvancedFilterOpenChange = (nextOpen: boolean) => {
      setShowTimePicker(false);
      setShowActionDropdown(false);
      setShowColumnDropdown(false);
      setShowAdvancedFilter(nextOpen);
      if (!nextOpen) {
         setSelectedAdvancedFilterFields([]);
         setSelectedAdvancedFilterValue('');
      }
   };

   const handleAdvancedFilterValueChange = (nextValue: string) => {
      setSelectedAdvancedFilterValue(nextValue);
      if (!nextValue || !activeAdvancedFilterField) return;

      const field = activeAdvancedFilterField.id as MyLeadsAdvancedFieldKey;
      setAdvancedFieldFilters((prev) => ({
         ...prev,
         [field]: prev[field].includes(nextValue) ? prev[field] : [...prev[field], nextValue]
      }));
      setSelectedAdvancedFilterFields([]);
      setSelectedAdvancedFilterValue('');
      setShowAdvancedFilter(false);
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
                              {(salesRep ? decodeMojibakeText(salesRep.name) : decodeMojibakeText(user?.name || '')).split(' ').map((part) => part[0]).slice(0, 2).join('') || 'NA'}
                           </span>
                           <span className="truncate font-medium text-slate-700">{salesRep ? decodeMojibakeText(salesRep.name) : decodeMojibakeText(user?.name || lead.ownerId)}</span>
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
                        {(isLeadStatusOneOf(String(lead.status || ''), [LEAD_STATUS_KEYS.NEW, LEAD_STATUS_KEYS.ASSIGNED]) && !lead.pickUpDate) && (
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
                      onAddFilter={(filter) => {
                         if (filter.type === 'groupby') {
                            const nextGroupBy = LEAD_TOOLBAR_GROUP_OPTIONS.some((option) => option.id === filter.field)
                               ? filter.field as MyLeadsGroupBy
                               : null;
                            if (nextGroupBy) {
                               toggleGroupBy(nextGroupBy);
                            }
                            return;
                         }
                         setSearchFilters((prev) => [...prev, filter]);
                      }}
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

                     <div className="relative shrink-0">
                        <button
                           onClick={() => {
                              closeAdvancedFilterMenu();
                              setShowActionDropdown(!showActionDropdown);
                           }}
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
                           <ToolbarTimeFilter
                              isOpen={showTimePicker}
                              fieldOptions={timeFieldOptions}
                              selectedField={timeFilterField}
                              selectedRangeType={timeRangeType}
                              customRange={customRange}
                              presets={timePresets}
                              onOpenChange={handleTimeFilterOpenChange}
                              onFieldChange={handleTimeFilterFieldChange}
                              onPresetSelect={handleTimePresetSelect}
                              onCustomRangeChange={setCustomRange}
                              onReset={() => {
                                 setTimeFilterField('action');
                                 setTimeRangeType('all');
                                 setCustomRange(null);
                                 setShowTimePicker(false);
                              }}
                              onCancel={() => setShowTimePicker(false)}
                              onApplyCustomRange={handleApplyCustomTimeRange}
                              className="shrink-0"
                           />

                           <AdvancedFilterDropdown
                              isOpen={showAdvancedFilter}
                              activeCount={advancedToolbarActiveCount}
                              hasActiveFilters={hasAdvancedToolbarFilters}
                              filterOptions={advancedDropdownFilterOptions}
                              groupOptions={advancedDropdownGroupOptions}
                              selectedFilterFieldIds={selectedAdvancedFilterFields}
                              selectedGroupFieldIds={groupBy}
                              activeFilterField={activeAdvancedFilterField}
                              selectableValues={advancedFilterSelectableValues}
                              selectedFilterValue={selectedAdvancedFilterValue}
                              onOpenChange={handleAdvancedFilterOpenChange}
                              onToggleFilterField={(fieldId) => toggleAdvancedDropdownSelection('filter', fieldId)}
                              onToggleGroupField={(fieldId) => toggleAdvancedDropdownSelection('group', fieldId)}
                              onFilterValueChange={handleAdvancedFilterValueChange}
                              onClearAll={handleClearToolbarFilters}
                              className="shrink-0"
                           />
                        </div>
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
                                 onClick={() => {
                                    closeAdvancedFilterMenu();
                                    setShowColumnDropdown(!showColumnDropdown);
                                 }}
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

            {viewMode !== 'list' && (
               <div className="mt-3 border-t border-slate-100 pt-3">
                  {renderStatusTabs()}
               </div>
            )}
         </div>

         {/* DATA GRID */}
         <div className="flex-1 overflow-auto bg-white custom-scrollbar relative">
            {viewMode === 'pivot' ? (
               <div className="p-4 h-full overflow-auto animate-in fade-in">
                  <LeadPivotTable leads={filteredLeads} />
               </div>
            ) : viewMode === 'kanban' ? (
               <div className="p-4 h-full overflow-x-auto overflow-y-hidden animate-in fade-in">
                  {filteredLeads.length === 0 ? (
                     <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-3">
                        <Inbox size={36} className="text-slate-300" />
                                 <p>{isSalesLeader ? 'Chưa có lead đã phân bổ trong chế độ Kanban.' : 'Chưa có lead trong chế độ Kanban.'}</p>
                     </div>
                  ) : (
                     <div className="flex gap-4 h-full min-h-[520px] min-w-max">
                        {kanbanColumns.map((column) => (
                           <div key={column.key} className={`rounded-xl border p-3 h-full min-h-[280px] min-w-[290px] max-w-[320px] flex flex-col flex-shrink-0 ${column.color}`}>
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
                     ) : groupBy.length === 0 ? renderTableRows(filteredLeads) : (
                        (() => {
                           let rowOffset = 0;
                           return Object.entries(groupedLeads).map(([groupName, items]) => {
                              const groupStartIndex = rowOffset;
                              rowOffset += items.length;
                              return (
                           <React.Fragment key={groupName}>
                              <tr className="bg-slate-100 border-y border-slate-200">
                                 <td colSpan={listTableColumnCount} className="px-4 py-2 text-slate-700 text-xs">
                                    <div className="flex items-center gap-2">
                                       <ChevronDown size={14} className="shrink-0" />
                                       <span className="font-bold break-words">{decodeMojibakeText(groupName)}</span>
                                       <span className="shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold">{items.length}</span>
                                    </div>
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

                  {false && (
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
                  )}

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

         <ConvertLeadModal
             isOpen={!!leadToConvert}
             lead={leadToConvert}
             onClose={() => setLeadToConvert(null)}
             onConfirm={handleConfirmLeadConvert}
          />

         <LeadCareScheduleModal
            isOpen={!!postConvertSchedule}
            onClose={handleClosePostConvertSchedule}
            onSave={handleSavePostConvertSchedule}
            defaultAction={postConvertSchedule?.defaultAction || 'call'}
            defaultDateTime={postConvertSchedule?.defaultDateTime}
         />

         <ConvertLeadModal
            isOpen={bulkLeadsToConvert.length > 0}
            lead={bulkLeadsToConvert[0] || null}
            leads={bulkLeadsToConvert}
            onClose={() => setBulkLeadsToConvert([])}
            onConfirm={handleConfirmBulkConvert}
         />
      </div>
   );
};

export default MyLeads;

