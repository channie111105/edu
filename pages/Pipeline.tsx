import React, { useState, useEffect, useRef } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { DealStage, IDeal, ILead, LeadStatus, IContact, Activity, ActivityType } from '../types';
import { getDeals, saveDeals, getContacts, addContact, updateDeal, saveContact, getLeadById, getLeads, saveLead } from '../utils/storage';
import { useAuth } from '../contexts/AuthContext';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import UnifiedLeadDrawer from '../components/UnifiedLeadDrawer';
import DealPivotTable from '../components/DealPivotTable';
import SmartSearchBar, { SearchFilter } from '../components/SmartSearchBar';
import { isClosedLeadStatusKey } from '../utils/leadStatus';
import {
  Phone, Mail, MessageCircle, Calendar, DollarSign, User,
  FileText, CheckCircle, XCircle, AlertCircle, Clock, Plus,
  TrendingUp, Package, Sparkles, LayoutGrid, Kanban, List as ListIcon, Columns, Check,
  Filter, ChevronDown, Users
} from 'lucide-react';

// Pipeline stages with specific activities
const PIPELINE_STAGES = [
  {
    id: DealStage.NEW_OPP,
    title: 'New Opp',
    color: 'blue',
    activities: ['Tiếp nhận lead', 'Xác nhận thông tin', 'Phân công sales']
  },
  {
    id: DealStage.DEEP_CONSULTING,
    title: 'Tư vấn/Hẹn meeting',
    color: 'blue',
    activities: ['Gọi tư vấn', 'Đặt lịch hẹn', 'Xác nhận nhu cầu']
  },
  {
    id: DealStage.PROPOSAL,
    title: 'Tư vấn sâu (Gửi báo giá, lộ trình)',
    color: 'purple',
    activities: ['Xây dựng lộ trình', 'Gửi báo giá', 'Chốt phương án']
  },
  {
    id: DealStage.NEGOTIATION,
    title: 'Đàm phán (Theo dõi chốt)',
    color: 'amber',
    activities: ['Giải đáp thắc mắc', 'Theo dõi phản hồi', 'Chốt điều kiện']
  },
  {
    id: DealStage.WON,
    title: 'Won',
    color: 'green',
    activities: ['Chốt deal', 'Bàn giao', 'Xác nhận kết quả']
  },
  {
    id: DealStage.LOST,
    title: 'Lost',
    color: 'red',
    activities: ['Ghi nhận lý do', 'Phân tích nguyên nhân', 'Lên kế hoạch tái liên hệ']
  },
  {
    id: DealStage.AFTER_SALE,
    title: 'After sale',
    color: 'cyan',
    activities: ['Bàn giao hồ sơ', 'Chăm sóc sau bán', 'Theo dõi tái mua']
  }
];

const KANBAN_PIPELINE_STAGES = PIPELINE_STAGES.filter((stage) => stage.id !== DealStage.LOST);

const NEXT_ACTIVITY_TYPES: { id: ActivityType; label: string }[] = [
  { id: 'call', label: 'Gọi điện' },
  { id: 'meeting', label: 'Hẹn gặp' },
  { id: 'email', label: 'Email' }
];

const PIPELINE_ACTIVITY_OPTIONS: Array<{ id: 'all' | ActivityType; label: string }> = [
  { id: 'all', label: 'Hoạt động' },
  ...NEXT_ACTIVITY_TYPES
];

const PIPELINE_TIME_PRESETS = [
  { id: 'all', label: 'Tất cả thời gian' },
  { id: 'today', label: 'Hôm nay' },
  { id: 'yesterday', label: 'Hôm qua' },
  { id: 'thisWeek', label: 'Tuần này' },
  { id: 'last7Days', label: '7 ngày qua' },
  { id: 'last30Days', label: '30 ngày qua' },
  { id: 'thisMonth', label: 'Tháng này' },
  { id: 'lastMonth', label: 'Tháng trước' },
  { id: 'custom', label: 'Tùy chỉnh khoảng...' }
] as const;

const normalizePhone = (value?: string) => String(value || '').replace(/\D/g, '');
const normalizeText = (value: unknown) => String(value || '').trim().toLowerCase();
const buildPipelineMultiFilterField = (fieldIds: string[]) => `multi:${fieldIds.join('|')}`;
const parsePipelineMultiFilterFields = (field: string) =>
  field.startsWith('multi:') ? field.replace('multi:', '').split('|').filter(Boolean) : [];

const getActivityTimestamp = (activity: any) => {
  const raw = activity?.datetime || activity?.timestamp || activity?.date || activity?.createdAt || '';
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const mergeActivities = (primary: any[] = [], secondary: any[] = []) => {
  const seen = new Set<string>();
  return [...primary, ...secondary]
    .filter(Boolean)
    .filter((activity) => {
      const key = String(
        activity?.id ||
        `${activity?.type || ''}|${activity?.title || ''}|${activity?.description || activity?.content || ''}|${activity?.timestamp || activity?.datetime || ''}`
      );
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => getActivityTimestamp(b) - getActivityTimestamp(a));
};

interface IConvertLeadDraft {
  dealId: string;
  contactId: string;
  name: string;
  phone: string;
  demand: string;
  source: string;
  tagsText: string;
  ownerId: string;
  newNote: string;
}

const Pipeline: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [deals, setDeals] = useState<IDeal[]>([]);
  const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'pivot'>('kanban');
  const [highlightDealId, setHighlightDealId] = useState<string | null>(null);
  const [contacts, setContacts] = useState<IContact[]>([]);
  const [searchFilters, setSearchFilters] = useState<SearchFilter[]>([]);
  const [selectedAdvancedFilterFields, setSelectedAdvancedFilterFields] = useState<string[]>([]);
  const [selectedAdvancedGroupFields, setSelectedAdvancedGroupFields] = useState<string[]>([]);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showActivityDropdown, setShowActivityDropdown] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [activityFilter, setActivityFilter] = useState<'all' | ActivityType>('all');
  const [timeRangeType, setTimeRangeType] = useState<string>('all');
  const [customRange, setCustomRange] = useState<{ start: string; end: string } | null>(null);
  const [showNextActivityModal, setShowNextActivityModal] = useState(false);
  const [nextActivityDealId, setNextActivityDealId] = useState<string | null>(null);
  const [nextActivityType, setNextActivityType] = useState<ActivityType>('call');
  const [nextActivityDate, setNextActivityDate] = useState('');
  const [nextActivitySummary, setNextActivitySummary] = useState('');
  const [showConvertLeadModal, setShowConvertLeadModal] = useState(false);
  const [convertLeadDraft, setConvertLeadDraft] = useState<IConvertLeadDraft | null>(null);

  // Drawer & Selection
  const [selectedDeal, setSelectedDeal] = useState<IDeal | null>(null);
  const [drawerLead, setDrawerLead] = useState<ILead | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const skipNextDrawerAutoCloseRef = useRef(false);

  const syncDrawerQuery = (dealId: string | null, replace = false) => {
    const params = new URLSearchParams(location.search);
    if (dealId) params.set('drawer', dealId);
    else params.delete('drawer');
    const nextSearch = params.toString() ? `?${params.toString()}` : '';
    if (nextSearch === location.search) return;
    navigate(
      {
        pathname: location.pathname,
        search: nextSearch
      },
      { replace }
    );
  };

  // Column Management
  const ALL_COLUMNS = [
    { id: 'opportunity', label: 'Cơ hội' },
    { id: 'contact', label: 'Họ tên & SĐT' },
    { id: 'email', label: 'Email' },
    { id: 'city', label: 'Địa chỉ (TP)' },
    { id: 'company', label: 'Cơ sở' },
    { id: 'source', label: 'Nguồn' },
    { id: 'salesperson', label: 'Sale' },
    { id: 'assignedDate', label: 'Ngày assign' },
    { id: 'tags', label: 'Tags' },
    { id: 'status', label: 'Trạng thái' },
  ];

  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    ALL_COLUMNS.filter(c => c.id !== 'assignedDate').map(c => c.id)
  );

  const [showColumnsDropdown, setShowColumnsDropdown] = useState(false);
  const selectedAdvancedFilterOptions = React.useMemo(
    () =>
      selectedAdvancedFilterFields
        .map((fieldId) => ALL_COLUMNS.find((column) => column.id === fieldId))
        .filter((column): column is { id: string; label: string } => Boolean(column)),
    [ALL_COLUMNS, selectedAdvancedFilterFields]
  );
  const selectedAdvancedGroupOptions = React.useMemo(
    () =>
      selectedAdvancedGroupFields
        .map((fieldId) => ALL_COLUMNS.find((column) => column.id === fieldId))
        .filter((column): column is { id: string; label: string } => Boolean(column)),
    [ALL_COLUMNS, selectedAdvancedGroupFields]
  );
  const activityFilterLabel = PIPELINE_ACTIVITY_OPTIONS.find((option) => option.id === activityFilter)?.label || 'Hoạt động';
  const timeRangeLabel = React.useMemo(() => {
    if (timeRangeType === 'custom' && customRange?.start && customRange?.end) {
      return `${customRange.start} - ${customRange.end}`;
    }
    return PIPELINE_TIME_PRESETS.find((option) => option.id === timeRangeType)?.label || 'Tất cả thời gian';
  }, [customRange, timeRangeType]);
  const isListView = viewMode === 'list';

  const toggleAdvancedFieldSelection = (type: 'filter' | 'group', fieldId: string) => {
    if (type === 'filter') {
      setSelectedAdvancedFilterFields((prev) =>
        prev.includes(fieldId) ? prev.filter((item) => item !== fieldId) : [...prev, fieldId]
      );
      return;
    }

    setSelectedAdvancedGroupFields((prev) =>
      prev.includes(fieldId) ? prev.filter((item) => item !== fieldId) : [...prev, fieldId]
    );
  };

  const getTimeRangeBounds = (rangeType: string) => {
    if (rangeType === 'all') return null;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday);
    endOfToday.setHours(23, 59, 59, 999);

    switch (rangeType) {
      case 'today':
        return { start: startOfToday, end: endOfToday };
      case 'yesterday': {
        const start = new Date(startOfToday);
        start.setDate(start.getDate() - 1);
        const end = new Date(start);
        end.setHours(23, 59, 59, 999);
        return { start, end };
      }
      case 'thisWeek': {
        const start = new Date(startOfToday);
        const dayOfWeek = start.getDay() === 0 ? 7 : start.getDay();
        start.setDate(start.getDate() - dayOfWeek + 1);
        return { start, end: endOfToday };
      }
      case 'last7Days': {
        const start = new Date(startOfToday);
        start.setDate(start.getDate() - 6);
        return { start, end: endOfToday };
      }
      case 'last30Days': {
        const start = new Date(startOfToday);
        start.setDate(start.getDate() - 29);
        return { start, end: endOfToday };
      }
      case 'thisMonth': {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        return { start, end: endOfToday };
      }
      case 'lastMonth': {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        return { start, end };
      }
      case 'custom': {
        if (!customRange?.start || !customRange?.end) return null;
        const start = new Date(customRange.start);
        const end = new Date(customRange.end);
        end.setHours(23, 59, 59, 999);
        return { start, end };
      }
      default:
        return null;
    }
  };

  // Load deals and handle highlight
  useEffect(() => {
    const loadedDeals = getDeals();
    const loadedContacts = getContacts();
    setDeals(loadedDeals);
    setContacts(loadedContacts);

    // Check for newDeal param
    const params = new URLSearchParams(location.search);
    const newDealId = params.get('newDeal');
    if (newDealId) {
      setHighlightDealId(newDealId);
      params.delete('newDeal');
      navigate({
        pathname: location.pathname,
        search: params.toString() ? `?${params.toString()}` : ''
      }, { replace: true });
      // Remove highlight after 3 seconds
      setTimeout(() => setHighlightDealId(null), 3000);
    }
  }, [location, navigate]);

  useEffect(() => {
    if (!showNextActivityModal) return;
    setNextActivityDate(getDefaultActivityDate(nextActivityType));
  }, [nextActivityType, showNextActivityModal]);

  // Browser back while drawer open: close drawer first, stay on Pipeline.
  useEffect(() => {
    if (skipNextDrawerAutoCloseRef.current) {
      skipNextDrawerAutoCloseRef.current = false;
      return;
    }
    const params = new URLSearchParams(location.search);
    const hasDrawerQuery = Boolean(params.get('drawer'));
    if (!hasDrawerQuery && drawerLead) {
      setDrawerLead(null);
      setSelectedDeal(null);
    }
  }, [location.search, drawerLead]);

  // Drag and Drop Handler
  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const newStage = destination.droppableId as DealStage;
    const updatedDeals = deals.map(deal =>
      deal.id === draggableId ? { ...deal, stage: newStage } : deal
    );

    setDeals(updatedDeals);
    saveDeals(updatedDeals);
  };

  const handleSaveNextActivity = () => {
    if (!nextActivityDealId || !nextActivitySummary) return;
    const newActivity: Activity = {
      id: `a-${Date.now()}`,
      type: nextActivityType,
      timestamp: new Date(nextActivityDate || Date.now()).toISOString(),
      title: 'Hoạt động tiếp theo',
      description: nextActivitySummary,
      status: 'scheduled'
    };

    const updatedDeals = deals.map(d => {
      if (d.id !== nextActivityDealId) return d;
      return {
        ...d,
        activities: [newActivity, ...(d.activities || [])]
      };
    });

    setDeals(updatedDeals);
    saveDeals(updatedDeals);
    setShowNextActivityModal(false);
    setNextActivityDealId(null);
    setNextActivitySummary('');
  };

  const contactsById = React.useMemo(
    () =>
      contacts.reduce((acc, contact) => {
        acc[contact.id] = contact;
        return acc;
      }, {} as Record<string, IContact>),
    [contacts]
  );

  const resolveLinkedLeadForPipeline = (deal: IDeal, contact?: IContact | null) => {
    if (contact?.leadId) {
      const directLead = getLeadById(contact.leadId);
      if (directLead) return directLead;
    }

    const normalizedPhone = normalizePhone(contact?.phone);
    if (normalizedPhone) {
      const byPhone = getLeads().find((lead) => normalizePhone(lead.phone) === normalizedPhone);
      if (byPhone) return byPhone;
    }

    const potentialName = String(contact?.name || deal?.title.split(' - ')[0] || '').trim().toLowerCase();
    if (!potentialName) return undefined;

    return getLeads().find((lead) => String(lead.name || '').trim().toLowerCase() === potentialName);
  };

  const isDealClosedForPipeline = (deal: IDeal) => {
    if (deal.stage === DealStage.LOST) return true;
    const linkedLead = resolveLinkedLeadForPipeline(deal, contactsById[deal.leadId]);
    return Boolean(linkedLead && isClosedLeadStatusKey(String(linkedLead.status || '')));
  };

  const getPipelineBucket = (stage: DealStage) => {
    if (stage === DealStage.CONTRACT || stage === DealStage.DOCUMENT_COLLECTION) return DealStage.AFTER_SALE;
    return stage;
  };

  const getStageLabel = (stage: DealStage) => {
    switch (stage) {
      case DealStage.NEW_OPP: return 'New Opp';
      case DealStage.DEEP_CONSULTING: return 'Tư vấn/Hẹn meeting';
      case DealStage.PROPOSAL: return 'Tư vấn sâu (Gửi báo giá, lộ trình)';
      case DealStage.NEGOTIATION: return 'Đàm phán (Theo dõi chốt)';
      case DealStage.WON: return 'Won';
      case DealStage.LOST: return 'Lost';
      case DealStage.AFTER_SALE:
      case DealStage.CONTRACT:
      case DealStage.DOCUMENT_COLLECTION:
        return 'After sale';
      default:
        return stage;
    }
  };

  const getNextActivityDate = (deal: IDeal, contact?: IContact) => {
    const allActivities = [
      ...(deal.activities || []),
      ...((contact?.activities as any[]) || [])
    ];
    const scheduled = allActivities
      .filter(a => a && (a.status === 'scheduled' || a.type === 'activity'))
      .map(a => a.datetime || a.timestamp || a.date)
      .filter(Boolean)
      .map((d: string) => new Date(d))
      .filter(d => !Number.isNaN(d.getTime()));

    if (scheduled.length === 0) return '';
    scheduled.sort((a, b) => a.getTime() - b.getTime());
    return scheduled[0].toISOString();
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const parsed = new Date(dateStr);
    if (Number.isNaN(parsed.getTime())) return '-';
    return parsed.toLocaleDateString('vi-VN');
  };

  const getActivityDateValue = (activity: any) => activity?.datetime || activity?.timestamp || activity?.date || '';

  const getLeadCreatedDate = (deal: IDeal) => {
    return deal.leadCreatedAt || deal.createdAt || '';
  };

  const getAssignedDate = (deal: IDeal, contact?: IContact) => {
    if (deal.assignedAt) return deal.assignedAt;

    const activities = [
      ...(Array.isArray(deal.activities) ? deal.activities : []),
      ...((contact?.activities as any[]) || [])
    ];

    const matchedDates = activities
      .filter((activity: any) => {
        const text = `${activity?.title || ''} ${activity?.description || ''} ${activity?.content || ''}`;
        return /tiếp nhận lead|lead được phân bổ|phân bổ|assign/i.test(text);
      })
      .map((activity: any) => getActivityDateValue(activity))
      .filter(Boolean)
      .map((value: string) => new Date(value))
      .filter((value) => !Number.isNaN(value.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    if (matchedDates.length > 0) {
      return matchedDates[0].toISOString();
    }

    return '';
  };

  const OWNER_LABELS: Record<string, string> = {
    u1: 'Tran Van Quan Tri',
    u2: 'Sarah Miller',
    u3: 'David Clark',
    u4: 'Alex Rivera',
    admin: 'Admin'
  };

  const getOwnerDisplayName = (ownerId?: string) => {
    if (!ownerId) return 'Chưa phân công';
    return OWNER_LABELS[ownerId] || ownerId;
  };

  const parseTags = (raw: unknown): string[] => {
    if (Array.isArray(raw)) {
      return raw.map(item => String(item || '').trim()).filter(Boolean);
    }
    if (typeof raw === 'string') {
      return raw.split(',').map(item => item.trim()).filter(Boolean);
    }
    return [];
  };

  const getDealDemand = (deal: IDeal, contact?: IContact) => {
    const fromProductItem = Array.isArray(deal.productItems)
      ? deal.productItems.find(item => item?.name)?.name
      : '';
    const fromProducts = Array.isArray(deal.products) ? deal.products.find(Boolean) : '';
    const fromTitle = deal.title.includes(' - ')
      ? deal.title.split(' - ').slice(1).join(' - ').trim()
      : '';
    const fromContact = String((contact as any)?.product || contact?.targetCountry || '').trim();
    return fromProductItem || fromProducts || fromTitle || fromContact || 'Chưa rõ nhu cầu';
  };

  const getFilteredActivities = (deal: IDeal, contact?: IContact | null) => {
    const allowedTypes = new Set<ActivityType>(NEXT_ACTIVITY_TYPES.map((item) => item.id));
    return mergeActivities(deal.activities || [], contact?.activities || []).filter((activity) => {
      const rawType = String(activity?.type || '').toLowerCase() as ActivityType;
      if (!allowedTypes.has(rawType)) return false;
      if (activityFilter === 'all') return true;
      return rawType === activityFilter;
    });
  };

  const getDealFieldValue = (deal: IDeal, contact: IContact | undefined, fieldId: string) => {
    const opportunityName = deal.title.split(' - ')[0] || deal.title;
    const programName = deal.title.split(' - ')[1] || '';
    const assignedDate = getAssignedDate(deal, contact);
    const tags = parseTags(contact?.marketingData?.tags);
    const nextActivityDate = getNextActivityDate(deal, contact);

    switch (fieldId) {
      case 'opportunity':
        return [opportunityName, programName, getDealDemand(deal, contact)].filter(Boolean).join(' | ');
      case 'contact':
        return [contact?.name, contact?.phone].filter(Boolean).join(' | ');
      case 'email':
        return contact?.email || '';
      case 'city':
        return [contact?.city, contact?.address].filter(Boolean).join(' | ');
      case 'company':
        return contact?.company || '';
      case 'source':
        return contact?.source || '';
      case 'salesperson':
        return getOwnerDisplayName(deal.ownerId);
      case 'assignedDate':
        return [assignedDate, formatDate(assignedDate)].filter(Boolean).join(' | ');
      case 'tags':
        return tags.join(' | ');
      case 'status':
        return getStageLabel(deal.stage);
      case 'nextActivity':
        return [nextActivityDate, formatDate(nextActivityDate)].filter(Boolean).join(' | ');
      default:
        return [
          opportunityName,
          programName,
          contact?.name,
          contact?.phone,
          contact?.email,
          contact?.city,
          contact?.company,
          contact?.source,
          getOwnerDisplayName(deal.ownerId),
          tags.join(' | '),
          getStageLabel(deal.stage)
        ].filter(Boolean).join(' | ');
    }
  };

  const doesDealMatchFilter = (deal: IDeal, contact: IContact | undefined, field: string, value: string) => {
    const normalizedValue = normalizeText(value);
    if (!normalizedValue) return true;

    const groupedFields = parsePipelineMultiFilterFields(field);
    if (groupedFields.length > 0) {
      return groupedFields.some((fieldId) => normalizeText(getDealFieldValue(deal, contact, fieldId)).includes(normalizedValue));
    }

    if (field === 'search') {
      return normalizeText(getDealFieldValue(deal, contact, 'search')).includes(normalizedValue);
    }

    return normalizeText(getDealFieldValue(deal, contact, field)).includes(normalizedValue);
  };

  const getGroupValue = (deal: IDeal, contact: IContact | undefined, fieldId: string) => {
    const rawValue = getDealFieldValue(deal, contact, fieldId);
    const normalized = String(rawValue || '').trim();
    return normalized || 'Chưa có dữ liệu';
  };

  const toolbarFilterChips = React.useMemo(() => {
    const chips: Array<SearchFilter & {
      origin: 'search' | 'synthetic';
      originalIndex?: number;
      syntheticKey?: string;
    }> = searchFilters.map((filter, index) => ({
      ...filter,
      origin: 'search',
      originalIndex: index
    }));

    if (activityFilter !== 'all') {
      chips.push({
        field: 'activity',
        label: 'Activity',
        value: activityFilterLabel,
        origin: 'synthetic',
        syntheticKey: 'activity'
      });
    }

    if (timeRangeType !== 'all') {
      chips.push({
        field: 'time_range',
        label: 'Arrange time',
        value: timeRangeLabel,
        origin: 'synthetic',
        syntheticKey: 'timeRange'
      });
    }

    if (selectedAdvancedFilterOptions.length > 0) {
      chips.push({
        field: 'advanced_filter_fields',
        label: 'Filter',
        value: selectedAdvancedFilterOptions.map((item) => item.label).join(' OR '),
        origin: 'synthetic',
        syntheticKey: 'filterFields'
      });
    }

    if (selectedAdvancedGroupOptions.length > 0) {
      chips.push({
        field: 'advanced_group_fields',
        label: 'Group by',
        value: selectedAdvancedGroupOptions.map((item) => item.label).join(' > '),
        origin: 'synthetic',
        syntheticKey: 'groupFields'
      });
    }

    return chips;
  }, [
    activityFilter,
    activityFilterLabel,
    searchFilters,
    selectedAdvancedFilterOptions,
    selectedAdvancedGroupOptions,
    timeRangeLabel,
    timeRangeType
  ]);

  const searchOnlyFilters = React.useMemo(
    () => searchFilters.filter((filter) => filter.field === 'search'),
    [searchFilters]
  );

  const searchOnlyToolbarChips = React.useMemo(
    () =>
      searchFilters
        .map((filter, index) => ({
          ...filter,
          originalIndex: index
        }))
        .filter((filter) => filter.field === 'search'),
    [searchFilters]
  );

  const headerSearchFilters = isListView ? toolbarFilterChips : searchOnlyToolbarChips;
  const headerActiveField = isListView && selectedAdvancedFilterOptions.length === 1
    ? {
      field: selectedAdvancedFilterOptions[0].id,
      label: selectedAdvancedFilterOptions[0].label,
      color: 'bg-emerald-100 text-emerald-700'
    }
    : null;

  const handleToolbarFilterRemove = (index: number) => {
    const chip = toolbarFilterChips[index];
    if (!chip) return;

    if (chip.origin === 'search' && typeof chip.originalIndex === 'number') {
      setSearchFilters((prev) => prev.filter((_, itemIndex) => itemIndex !== chip.originalIndex));
      return;
    }

    if (chip.syntheticKey === 'activity') {
      setActivityFilter('all');
      return;
    }

    if (chip.syntheticKey === 'timeRange') {
      setTimeRangeType('all');
      setCustomRange(null);
      setShowTimePicker(false);
      return;
    }

    if (chip.syntheticKey === 'filterFields') {
      setSelectedAdvancedFilterFields([]);
      return;
    }

    if (chip.syntheticKey === 'groupFields') {
      setSelectedAdvancedGroupFields([]);
    }
  };

  const handleClearToolbarFilters = () => {
    setSearchFilters([]);
    setSelectedAdvancedFilterFields([]);
    setSelectedAdvancedGroupFields([]);
    setActivityFilter('all');
    setTimeRangeType('all');
    setCustomRange(null);
    setShowTimePicker(false);
  };

  const handleHeaderSearchAddFilter = (filter: SearchFilter) => {
    if (!isListView) {
      setSearchFilters((prev) => [...prev, filter]);
      return;
    }

    if (selectedAdvancedFilterOptions.length > 1) {
      setSearchFilters((prev) => ([
        ...prev,
        {
          field: buildPipelineMultiFilterField(selectedAdvancedFilterOptions.map((option) => option.id)),
          label: 'Logic lọc',
          value: filter.value,
          color: 'bg-emerald-100 text-emerald-700'
        }
      ]));
      return;
    }

    if (selectedAdvancedFilterOptions.length === 1) {
      setSearchFilters((prev) => ([
        ...prev,
        {
          field: selectedAdvancedFilterOptions[0].id,
          label: selectedAdvancedFilterOptions[0].label,
          value: filter.value,
          color: 'bg-emerald-100 text-emerald-700'
        }
      ]));
      return;
    }

    setSearchFilters((prev) => [...prev, filter]);
  };

  const handleHeaderSearchRemoveFilter = (index: number) => {
    if (isListView) {
      handleToolbarFilterRemove(index);
      return;
    }

    const chip = searchOnlyToolbarChips[index];
    if (!chip) return;
    setSearchFilters((prev) => prev.filter((_, itemIndex) => itemIndex !== chip.originalIndex));
  };

  const handleHeaderSearchClearAll = () => {
    if (isListView) {
      handleClearToolbarFilters();
      return;
    }

    setSearchFilters((prev) => prev.filter((filter) => filter.field !== 'search'));
  };

  const openNextActivityModal = (dealId: string) => {
    setNextActivityDealId(dealId);
    setNextActivityType('call');
    setNextActivityDate(getDefaultActivityDate('call'));
    setNextActivitySummary('');
    setShowNextActivityModal(true);
  };

  const openConvertLeadModal = (dealId: string, loadedDeals: IDeal[], loadedContacts: IContact[]) => {
    const deal = loadedDeals.find(item => item.id === dealId);
    if (!deal) return false;

    const contact = loadedContacts.find(item => item.id === deal.leadId);
    if (!contact) return false;

    const tags = parseTags(contact.marketingData?.tags);
    setConvertLeadDraft({
      dealId: deal.id,
      contactId: contact.id,
      name: contact.name || deal.title.split(' - ')[0] || '',
      phone: contact.phone || '',
      demand: getDealDemand(deal, contact),
      source: contact.source || '',
      tagsText: tags.join(', '),
      ownerId: deal.ownerId || contact.ownerId || '',
      newNote: ''
    });
    setShowConvertLeadModal(true);
    return true;
  };

  const handleSaveConvertedLeadInfo = () => {
    if (!convertLeadDraft) return;

    const currentDeal = deals.find(item => item.id === convertLeadDraft.dealId);
    const currentContact = contacts.find(item => item.id === convertLeadDraft.contactId);
    if (!currentDeal || !currentContact) return;

    const parsedTags = parseTags(convertLeadDraft.tagsText);
    const noteLine = convertLeadDraft.newNote.trim()
      ? `[${new Date().toLocaleString('vi-VN')}] ${convertLeadDraft.newNote.trim()}`
      : '';
    const mergedNotes = [String(currentContact.notes || '').trim(), noteLine].filter(Boolean).join('\n');

    const updatedContact: IContact = {
      ...currentContact,
      name: convertLeadDraft.name.trim() || currentContact.name,
      phone: convertLeadDraft.phone.trim() || currentContact.phone,
      source: convertLeadDraft.source.trim() || currentContact.source,
      ownerId: convertLeadDraft.ownerId || currentContact.ownerId,
      notes: mergedNotes,
      marketingData: {
        ...(currentContact.marketingData || {}),
        tags: parsedTags
      },
      updatedAt: new Date().toISOString()
    };

    const savedContact = saveContact(updatedContact);

    const demand = convertLeadDraft.demand.trim() || getDealDemand(currentDeal, savedContact);
    const updatedDeal: IDeal = {
      ...currentDeal,
      ownerId: convertLeadDraft.ownerId || currentDeal.ownerId,
      title: `${savedContact.name} - ${demand}`,
      products: demand ? [demand] : currentDeal.products
    };

    const updatedDeals = deals.map(item => (item.id === updatedDeal.id ? updatedDeal : item));
    setDeals(updatedDeals);
    saveDeals(updatedDeals);
    updateDeal(updatedDeal);
    setContacts(getContacts());

    setShowConvertLeadModal(false);
    setConvertLeadDraft(null);
  };

  const handleSkipConvertedLeadInfo = () => {
    if (!convertLeadDraft) return;
    setShowConvertLeadModal(false);
    setConvertLeadDraft(null);
  };

  const pipelineDeals = deals.filter((deal) => !isDealClosedForPipeline(deal));

  const searchFilteredDeals = React.useMemo(() => {
    if (searchOnlyFilters.length === 0) return pipelineDeals;

    return pipelineDeals.filter((deal) => {
      const contact = contactsById[deal.leadId];
      return searchOnlyFilters.every((filter) => doesDealMatchFilter(deal, contact, filter.field, filter.value));
    });
  }, [contactsById, pipelineDeals, searchOnlyFilters]);

  const filteredDeals = React.useMemo(() => {
    const activityBounds = getTimeRangeBounds(timeRangeType);

    return pipelineDeals.filter((deal) => {
      const contact = contactsById[deal.leadId];
      const relevantActivities = getFilteredActivities(deal, contact);

      if (activityFilter !== 'all' && relevantActivities.length === 0) {
        return false;
      }

      if (activityBounds) {
        const matchesActivityTime = relevantActivities.some((activity) => {
          const rawDate = getActivityDateValue(activity);
          if (!rawDate) return false;
          const activityDate = new Date(rawDate);
          if (Number.isNaN(activityDate.getTime())) return false;
          return activityDate >= activityBounds.start && activityDate <= activityBounds.end;
        });

        if (!matchesActivityTime) {
          return false;
        }
      }

      if (searchFilters.length > 0) {
        return searchFilters.every((filter) => doesDealMatchFilter(deal, contact, filter.field, filter.value));
      }

      return true;
    });
  }, [activityFilter, contactsById, pipelineDeals, searchFilters, timeRangeType, customRange]);

  const buildGroupedDealBuckets = (dealList: IDeal[]) => {
    if (selectedAdvancedGroupFields.length === 0) return [];

    const buckets = new Map<string, { key: string; label: string; deals: IDeal[] }>();
    dealList.forEach((deal) => {
      const contact = contactsById[deal.leadId];
      const values = selectedAdvancedGroupFields.map((fieldId) => getGroupValue(deal, contact, fieldId));
      const key = values.join('||');
      const label = values
        .map((value, index) => `${selectedAdvancedGroupOptions[index]?.label || selectedAdvancedGroupFields[index]}: ${value}`)
        .join(' • ');
      const current = buckets.get(key);

      if (current) {
        current.deals.push(deal);
        return;
      }

      buckets.set(key, {
        key,
        label,
        deals: [deal]
      });
    });

    return Array.from(buckets.values());
  };

  const groupedDeals = React.useMemo(() => {
    return buildGroupedDealBuckets(filteredDeals);
  }, [contactsById, filteredDeals, selectedAdvancedGroupFields, selectedAdvancedGroupOptions]);

  // Group deals by stage bucket
  const getDealsByStage = (stage: DealStage) => {
    return searchFilteredDeals.filter(deal => getPipelineBucket(deal.stage) === stage);
  };

  function getDefaultActivityDate(typeId: ActivityType) {
    const now = new Date();
    const delayHours = typeId === 'meeting' ? 24 : 2;
    now.setHours(now.getHours() + delayHours);
    return new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
  }

  const resolveLinkedLead = (contact?: IContact | null, deal?: IDeal | null) => {
    if (contact?.leadId) {
      const directLead = getLeadById(contact.leadId);
      if (directLead) return directLead;
    }

    const normalizedPhone = normalizePhone(contact?.phone);
    if (normalizedPhone) {
      const byPhone = getLeads().find((lead) => normalizePhone(lead.phone) === normalizedPhone);
      if (byPhone) return byPhone;
    }

    const potentialName = String(contact?.name || deal?.title.split(' - ')[0] || '').trim().toLowerCase();
    if (!potentialName) return undefined;

    return getLeads().find((lead) => String(lead.name || '').trim().toLowerCase() === potentialName);
  };

  // Handle Deal Click -> Open Drawer (Unified Form)
  const handleDealClick = (deal: IDeal) => {
    const contacts = getContacts();
    let contact = contacts.find(c => c.id === deal.leadId);

    // Fallback: Try to find by name if ID link is broken (for older conversions)
    if (!contact) {
      const potentialName = deal.title.split(' - ')[0].trim();
      contact = contacts.find(c => c.name.toLowerCase() === potentialName.toLowerCase());
    }

    if (contact) {
      const linkedLead = resolveLinkedLead(contact, deal);
      const leadCreatedDate = getLeadCreatedDate(deal);
      const assignedDate = getAssignedDate(deal, contact);
      // Construct ILead from Contact + Deal
      // This allows using the UnifiedLeadDrawer seamlessly
      const unifiedLead: ILead = {
        id: linkedLead?.id || contact.leadId || contact.id,
        name: linkedLead?.name || contact.name,
        phone: linkedLead?.phone || contact.phone,
        email: linkedLead?.email || contact.email || '',
        program: (deal.title.split('-')[1] || '').trim() as any, // Try to parse program or default
        source: linkedLead?.source || contact.source || 'Unknown',
        status: (linkedLead?.status || deal.stage) as unknown as LeadStatus,
        ownerId: linkedLead?.ownerId || deal.ownerId,
        createdAt: linkedLead?.createdAt || leadCreatedDate || deal.createdAt,
        pickUpDate: linkedLead?.pickUpDate || assignedDate || undefined,
        value: linkedLead?.value || deal.value,

        // Sync Extended Info
        studentInfo: {
          ...(linkedLead?.studentInfo || {}),
          studentName: linkedLead?.studentInfo?.studentName || contact.studentName,
          studentPhone: linkedLead?.studentInfo?.studentPhone || contact.studentPhone,
          school: linkedLead?.studentInfo?.school || contact.school,
          educationLevel: linkedLead?.studentInfo?.educationLevel || contact.educationLevel,
          parentName: linkedLead?.studentInfo?.parentName || contact.guardianName,
          parentPhone: linkedLead?.studentInfo?.parentPhone || contact.guardianPhone,
          languageLevel: linkedLead?.studentInfo?.languageLevel || contact.languageLevel,
          financialStatus: linkedLead?.studentInfo?.financialStatus || contact.financialStatus,
          socialLink: linkedLead?.studentInfo?.socialLink || contact.socialLink,
          targetCountry: linkedLead?.studentInfo?.targetCountry || contact.targetCountry,
        },
        targetCountry: linkedLead?.targetCountry || contact.targetCountry,
        educationLevel: linkedLead?.educationLevel || contact.educationLevel || contact.school,
        address: linkedLead?.address || contact.address,
        city: linkedLead?.city || contact.city,
        dob: linkedLead?.dob || contact.dob,
        identityCard: linkedLead?.identityCard || contact.identityCard,
        identityDate: linkedLead?.identityDate || contact.identityDate,
        identityPlace: linkedLead?.identityPlace || contact.identityPlace,
        gender: linkedLead?.gender || contact.gender,
        guardianName: linkedLead?.guardianName || contact.guardianName,
        guardianPhone: linkedLead?.guardianPhone || contact.guardianPhone,
        guardianRelation: linkedLead?.guardianRelation || contact.guardianRelation,
        company: linkedLead?.company || contact.company,
        title: linkedLead?.title || contact.title,
        notes: linkedLead?.notes || contact.notes,
        marketingData: {
          ...(contact.marketingData || {}),
          ...(linkedLead?.marketingData || {})
        },
        lastInteraction: linkedLead?.lastInteraction || deal.createdAt,
        lastActivityDate: linkedLead?.lastActivityDate,
        lostReason: linkedLead?.lostReason,
        referredBy: linkedLead?.referredBy,

        // Deal specific
        expectedClosingDate: linkedLead?.expectedClosingDate || deal.expectedCloseDate,
        productItems: linkedLead?.productItems || deal.productItems || [],
        discount: linkedLead?.discount || deal.discount || 0,
        paymentRoadmap: linkedLead?.paymentRoadmap || deal.paymentRoadmap || '',
        activities: mergeActivities(linkedLead?.activities || [], contact.activities || []),
      };

      skipNextDrawerAutoCloseRef.current = true;
      setDrawerLead(unifiedLead);
      setSelectedDeal(deal);
      syncDrawerQuery(deal.id);
    } else {
      alert("Không tìm thấy thông tin contact gốc của deal này.");
    }
  };

  const handleDrawerUpdate = (updatedLead: ILead) => {
    // 1. Update Contact
    if (drawerLead && selectedDeal) {
      const existingContact = getContacts().find(contact =>
        contact.id === drawerLead.id ||
        contact.leadId === drawerLead.id ||
        normalizePhone(contact.phone) === normalizePhone(updatedLead.phone)
      );
      const linkedLead = resolveLinkedLead(existingContact || null, selectedDeal);
      const studentInfo = updatedLead.studentInfo || {};
      const contactUpdate = {
        id: existingContact?.id || drawerLead.id,
        leadId: existingContact?.leadId || linkedLead?.id || updatedLead.id,
        name: updatedLead.name,
        phone: updatedLead.phone,
        email: updatedLead.email,
        address: updatedLead.address,
        city: updatedLead.city,
        company: updatedLead.company,
        title: updatedLead.title,
        targetCountry: updatedLead.targetCountry || studentInfo.targetCountry || existingContact?.targetCountry || '',
        dob: studentInfo.dob || updatedLead.dob,
        identityCard: studentInfo.identityCard || updatedLead.identityCard,
        identityDate: updatedLead.identityDate,
        identityPlace: updatedLead.identityPlace,
        gender: studentInfo.gender || updatedLead.gender,
        studentName: studentInfo.studentName || existingContact?.studentName,
        studentPhone: studentInfo.studentPhone || existingContact?.studentPhone,
        school: studentInfo.school || existingContact?.school,
        educationLevel: updatedLead.educationLevel || studentInfo.educationLevel || existingContact?.educationLevel,
        guardianName: updatedLead.guardianName || studentInfo.parentName || existingContact?.guardianName,
        guardianPhone: updatedLead.guardianPhone || studentInfo.parentPhone || existingContact?.guardianPhone,
        guardianRelation: updatedLead.guardianRelation || existingContact?.guardianRelation,
        notes: updatedLead.notes,
        activities: mergeActivities(updatedLead.activities, existingContact?.activities || []),
        languageLevel: studentInfo.languageLevel || existingContact?.languageLevel,
        financialStatus: studentInfo.financialStatus || existingContact?.financialStatus,
        socialLink: studentInfo.socialLink || existingContact?.socialLink,
        source: updatedLead.source || existingContact?.source,
        ownerId: updatedLead.ownerId || existingContact?.ownerId,
        marketingData: {
          ...(existingContact?.marketingData || {}),
          ...(updatedLead.marketingData || {})
        }
      };
      // Update contact in storage
      if (existingContact) {
        saveContact({
          ...existingContact,
          ...contactUpdate
        } as IContact);
      } else {
        addContact(contactUpdate as any);
      }

      const persistedLead: ILead = {
        ...(linkedLead || {}),
        ...updatedLead,
        id: linkedLead?.id || existingContact?.leadId || updatedLead.id,
        name: updatedLead.name || linkedLead?.name || existingContact?.name || drawerLead.name,
        phone: updatedLead.phone || linkedLead?.phone || existingContact?.phone || drawerLead.phone,
        email: updatedLead.email || linkedLead?.email || existingContact?.email || drawerLead.email || '',
        source: updatedLead.source || linkedLead?.source || existingContact?.source || drawerLead.source || 'Unknown',
        program: (updatedLead.program || linkedLead?.program || drawerLead.program) as ILead['program'],
        ownerId: updatedLead.ownerId || linkedLead?.ownerId || selectedDeal.ownerId || drawerLead.ownerId,
        createdAt: linkedLead?.createdAt || updatedLead.createdAt || drawerLead.createdAt || selectedDeal.createdAt,
        lastInteraction: updatedLead.lastInteraction || linkedLead?.lastInteraction || drawerLead.lastInteraction || selectedDeal.createdAt,
        notes: updatedLead.notes || linkedLead?.notes || existingContact?.notes || drawerLead.notes || '',
        closedAt: isClosedLeadStatusKey(updatedLead.status as string)
          ? updatedLead.closedAt || linkedLead?.closedAt || new Date().toISOString()
          : undefined,
        activities: mergeActivities(
          updatedLead.activities,
          mergeActivities(linkedLead?.activities || [], existingContact?.activities || [])
        ),
        lastActivityDate: updatedLead.lastActivityDate || linkedLead?.lastActivityDate,
        marketingData: {
          ...(existingContact?.marketingData || {}),
          ...(linkedLead?.marketingData || {}),
          ...(updatedLead.marketingData || {})
        }
      };

      saveLead(persistedLead);

      // 2. Update Deal status/stage if changed
      const newStage = updatedLead.status as unknown as DealStage;
      const shouldHideDealFromPipeline = isClosedLeadStatusKey(updatedLead.status as string);
      const updatedDeal = {
        ...selectedDeal,
        value: updatedLead.value || selectedDeal.value,
        stage: shouldHideDealFromPipeline
          ? selectedDeal.stage
          : (Object.values(DealStage).includes(newStage) ? newStage : selectedDeal.stage),
        expectedCloseDate: updatedLead.expectedClosingDate || selectedDeal.expectedCloseDate,
        leadCreatedAt: selectedDeal.leadCreatedAt || updatedLead.createdAt || selectedDeal.createdAt,
        assignedAt: updatedLead.pickUpDate || selectedDeal.assignedAt,
        productItems: updatedLead.productItems, // Save detailed products
        discount: updatedLead.discount,
        paymentRoadmap: updatedLead.paymentRoadmap
      };

      updateDeal(updatedDeal);

      // 3. Update UI State
      setDeals(prev => prev.map(d => d.id === updatedDeal.id ? updatedDeal : d));
      setContacts(getContacts());
      setSelectedDeal(updatedDeal);
      setDrawerLead(persistedLead);
    }
  };

  const listTableColumnCount = visibleColumns.length + 2;
  const renderListRow = (deal: IDeal, rowNumber: number) => {
    const contact = contactsById[deal.leadId];
    const opportunityName = deal.title.split(' - ')[0] || deal.title;
    const programName = deal.title.split(' - ')[1] || '';
    const leadCreatedDate = getLeadCreatedDate(deal);
    const assignedDate = getAssignedDate(deal, contact);
    const tags = parseTags(contact?.marketingData?.tags);

    return (
      <tr
        key={deal.id}
        className="hover:bg-blue-50/50 group transition-colors cursor-pointer border-b border-slate-100 last:border-0"
        onClick={() => handleDealClick(deal)}
      >
        <td className="p-3 text-center border-r border-slate-50" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={selectedIds.includes(deal.id)}
            onChange={() => {
              setSelectedIds((prev) => (
                prev.includes(deal.id) ? prev.filter((id) => id !== deal.id) : [...prev, deal.id]
              ));
            }}
          />
        </td>
        <td className="p-3 text-center border-r border-slate-50 font-semibold text-slate-500">{rowNumber}</td>
        {visibleColumns.includes('opportunity') && (
          <td className="p-2 border-r border-slate-50">
            <div className="flex flex-col gap-0.5">
              <div className="font-bold text-slate-900 group-hover:text-blue-600">{opportunityName}</div>
              {programName && (
                <span className="text-[10px] text-blue-600 font-medium">{programName}</span>
              )}
              <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                <Calendar size={11} className="text-slate-400 shrink-0" />
                Tạo lead: {formatDate(leadCreatedDate)}
              </span>
            </div>
          </td>
        )}

        {visibleColumns.includes('contact') && (
          <td className="p-2 border-r border-slate-50 text-slate-700">
            <div className="flex flex-col">
              <span className="font-semibold text-xs">{contact?.name || '-'}</span>
              <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                <Phone size={11} className="text-slate-400 shrink-0" />
                {contact?.phone || '-'}
              </span>
            </div>
          </td>
        )}

        {visibleColumns.includes('email') && (
          <td className="p-2 border-r border-slate-50 text-slate-600 text-[10px] truncate max-w-[120px]" title={contact?.email}>
            {contact?.email || '-'}
          </td>
        )}

        {visibleColumns.includes('city') && (
          <td className="p-2 border-r border-slate-50 text-slate-600 text-[10px]">
            {contact?.city || '-'}
          </td>
        )}

        {visibleColumns.includes('company') && (
          <td className="p-2 border-r border-slate-50 text-slate-600 text-[10px]">
            {contact?.company || 'CS Chính'}
          </td>
        )}

        {visibleColumns.includes('source') && (
          <td className="p-2 border-r border-slate-50 text-slate-600 text-[10px] truncate max-w-[100px]" title={contact?.source}>
            {contact?.source || '-'}
          </td>
        )}

        {visibleColumns.includes('salesperson') && (
          <td className="p-2 border-r border-slate-50 text-slate-600 text-[10px] font-semibold text-blue-700">
            {getOwnerDisplayName(deal.ownerId)}
          </td>
        )}

        {visibleColumns.includes('assignedDate') && (
          <td className="p-2 border-r border-slate-50 text-slate-600 text-[10px]">
            <span className="inline-flex items-center gap-1">
              <Clock size={11} className="text-slate-400 shrink-0" />
              {formatDate(assignedDate)}
            </span>
          </td>
        )}

        {visibleColumns.includes('tags') && (
          <td className="p-2 border-r border-slate-50">
            <div className="flex flex-wrap gap-1">
              {tags.length > 0 ? (
                tags.map((tag, index) => (
                  <span
                    key={`${deal.id}-tag-${index}`}
                    className="text-[9px] px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-600 font-bold whitespace-nowrap"
                  >
                    {tag}
                  </span>
                ))
              ) : '-'}
            </div>
          </td>
        )}

        {visibleColumns.includes('status') && (
          <td className="p-2 text-center">
            <span
              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${deal.stage === DealStage.WON
                ? 'bg-green-100 text-green-700 border border-green-200'
                : deal.stage === DealStage.LOST
                  ? 'bg-red-100 text-red-700 border border-red-200'
                  : 'bg-blue-50 text-blue-700 border border-blue-100'}`}
            >
              {getStageLabel(deal.stage)}
            </span>
          </td>
        )}
      </tr>
    );
  };

  const renderKanbanCard = (deal: IDeal, index: number) => {
    const contact = contactsById[deal.leadId];
    const nextDate = getNextActivityDate(deal, contact) || deal.expectedCloseDate;
    const leadCreatedDate = getLeadCreatedDate(deal);
    const demand = getDealDemand(deal, contact);
    const tags = parseTags(contact?.marketingData?.tags);
    const isOverdueNextActivity = nextDate ? new Date(nextDate) < new Date() : false;
    const contactName = contact?.name || deal.title.split(' - ')[0] || deal.title;

    return (
      <Draggable key={deal.id} draggableId={deal.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`bg-white border-2 rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-pointer ${snapshot.isDragging ? 'shadow-lg rotate-2' : ''
              } ${highlightDealId === deal.id
                ? 'border-green-500 bg-green-50 animate-pulse'
                : 'border-slate-200'
              }`}
            onClick={() => handleDealClick(deal)}
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-bold text-sm text-slate-900 line-clamp-2">
                  {contactName}
                </h4>
                <span className="inline-flex items-center gap-1 text-xs text-slate-500 whitespace-nowrap">
                  <Phone size={12} className="text-slate-400 shrink-0" />
                  {contact?.phone || '-'}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-700">
                <Package size={13} className="text-blue-600 shrink-0" />
                <span className="line-clamp-1"><span className="font-semibold">Nhu cầu:</span> {demand}</span>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-700">
                <MessageCircle size={13} className="text-emerald-600 shrink-0" />
                <span className="line-clamp-1"><span className="font-semibold">Source:</span> {contact?.source || '-'}</span>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-700">
                <FileText size={13} className="text-amber-600 shrink-0" />
                <span className="line-clamp-1">
                  <span className="font-semibold">Tag:</span>{' '}
                  {tags.length > 0 ? tags.join(', ') : '-'}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-700">
                <User size={13} className="text-slate-500 shrink-0" />
                <span className="line-clamp-1"><span className="font-semibold">Người phụ trách:</span> {getOwnerDisplayName(deal.ownerId)}</span>
              </div>

              <div className="flex items-center gap-1.5 rounded-md bg-slate-50 px-2 py-1 text-[11px] text-slate-600">
                <Calendar size={11} className="text-slate-400 shrink-0" />
                <span className="font-medium">Tạo lead:</span>
                <span className="truncate">{formatDate(leadCreatedDate)}</span>
              </div>

              <div className={`flex items-center gap-2 px-2 py-1 rounded-md border text-xs ${nextDate
                ? (isOverdueNextActivity ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700')
                : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}>
                <Calendar size={12} className="shrink-0" />
                <span className="font-semibold">Lịch hẹn tiếp:</span>
                <span>{formatDate(nextDate)}</span>
              </div>

              {highlightDealId === deal.id && (
                <div className="flex items-center gap-1 mt-2">
                  <Sparkles size={14} className="text-green-600" />
                  <span className="text-xs font-bold text-green-600">
                    Deal mới!
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </Draggable>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Pipeline - Quy trình chốt deal</h1>
            <p className="mt-1 text-sm text-slate-600">
              Quản lý hành trình từ tư vấn đến chốt thành công
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 xl:w-[780px] xl:max-w-[780px] xl:items-end">
            <div className="w-full">
              <SmartSearchBar
                filters={headerSearchFilters}
                onAddFilter={handleHeaderSearchAddFilter}
                onRemoveFilter={handleHeaderSearchRemoveFilter}
                onClearAll={handleHeaderSearchClearAll}
                activeField={headerActiveField}
                placeholder="Tìm kiếm cơ hội..."
                compact
                fullWidth
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              {isListView && (
                <>
              <div className="relative">
                <button
                  onClick={() => {
                    setShowActivityDropdown((prev) => !prev);
                    setShowTimePicker(false);
                    setShowFilterDropdown(false);
                    setShowColumnsDropdown(false);
                  }}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition-all ${showActivityDropdown ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                >
                  <span>{activityFilterLabel}</span>
                  <ChevronDown size={14} className="text-slate-400" />
                </button>

                {showActivityDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowActivityDropdown(false)}></div>
                    <div className="absolute right-0 top-full z-50 mt-2 w-44 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                      {PIPELINE_ACTIVITY_OPTIONS.map((option) => (
                        <button
                          key={option.id}
                          onClick={() => {
                            setActivityFilter(option.id);
                            setShowActivityDropdown(false);
                          }}
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-semibold transition-colors ${activityFilter === option.id ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                          <span>{option.label}</span>
                          {activityFilter === option.id && <Check size={14} className="text-blue-600" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="relative">
                <button
                  onClick={() => {
                    setShowTimePicker((prev) => !prev);
                    setShowActivityDropdown(false);
                    setShowFilterDropdown(false);
                    setShowColumnsDropdown(false);
                  }}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition-all ${showTimePicker ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                >
                  <Calendar size={14} className="text-slate-400" />
                  <span>{timeRangeLabel}</span>
                  <ChevronDown size={14} className="text-slate-400" />
                </button>

                {showTimePicker && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowTimePicker(false)}></div>
                    <div className="absolute right-0 top-full z-50 mt-2 flex w-[680px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                      <div className="w-[180px] border-r border-slate-100 bg-slate-50/80 p-3">
                        <div className="space-y-1">
                          {PIPELINE_TIME_PRESETS.map((preset) => (
                            <button
                              key={preset.id}
                              onClick={() => {
                                if (preset.id === 'custom') {
                                  setTimeRangeType('custom');
                                  return;
                                }
                                setTimeRangeType(preset.id);
                                setCustomRange(null);
                                setShowTimePicker(false);
                              }}
                              className={`w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition-colors ${timeRangeType === preset.id ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white hover:text-slate-900'}`}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-1 flex-col p-5">
                        <div className="mb-4 text-xs font-black uppercase tracking-widest text-slate-400">Khoảng thời gian tùy chỉnh</div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="mb-1 block text-[10px] font-bold text-slate-400">Từ ngày</label>
                            <input
                              type="date"
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-blue-500"
                              value={customRange?.start || ''}
                              onChange={(event) => setCustomRange((prev) => ({ start: event.target.value, end: prev?.end || event.target.value }))}
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-[10px] font-bold text-slate-400">Đến ngày</label>
                            <input
                              type="date"
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-blue-500"
                              value={customRange?.end || ''}
                              onChange={(event) => setCustomRange((prev) => ({ start: prev?.start || event.target.value, end: event.target.value }))}
                            />
                          </div>
                        </div>

                        <div className="mt-auto flex items-center justify-between pt-6">
                          <button
                            onClick={() => {
                              setTimeRangeType('all');
                              setCustomRange(null);
                              setShowTimePicker(false);
                            }}
                            className="text-xs font-bold text-slate-400 hover:text-slate-600"
                          >
                            Làm lại
                          </button>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setShowTimePicker(false)}
                              className="rounded-lg px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                            >
                              Hủy
                            </button>
                            <button
                              onClick={() => {
                                if (customRange?.start && customRange?.end) {
                                  setTimeRangeType('custom');
                                  setShowTimePicker(false);
                                  return;
                                }
                                alert('Vui lòng chọn khoảng ngày');
                              }}
                              className="rounded-lg bg-blue-600 px-6 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
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

              <div className="relative">
                <button
                  onClick={() => {
                    setShowFilterDropdown((prev) => !prev);
                    setShowActivityDropdown(false);
                    setShowTimePicker(false);
                    setShowColumnsDropdown(false);
                  }}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition-all ${showFilterDropdown ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                >
                  <Filter size={14} />
                  <span>Lọc nâng cao</span>
                  {(selectedAdvancedFilterFields.length + selectedAdvancedGroupFields.length) > 0 ? (
                    <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {selectedAdvancedFilterFields.length + selectedAdvancedGroupFields.length}
                    </span>
                  ) : null}
                </button>

                {showFilterDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowFilterDropdown(false)}></div>
                    <div className="absolute right-0 top-full z-50 mt-2 w-[720px] max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="border-r border-slate-100 pr-3">
                          <div className="mb-3 flex items-center gap-2 font-bold text-slate-800">
                            <Filter size={14} /> Filter
                          </div>
                          <p className="mb-3 text-xs text-slate-500">
                            Chọn trường pipeline để nhập giá trị ở ô tìm kiếm và tạo bộ lọc.
                          </p>
                          <div className="max-h-[360px] space-y-1 overflow-y-auto">
                            {ALL_COLUMNS.map((column) => (
                              <button
                                key={`filter-${column.id}`}
                                onClick={() => toggleAdvancedFieldSelection('filter', column.id)}
                                className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${selectedAdvancedFilterFields.includes(column.id) ? 'border-emerald-200 bg-emerald-50 font-semibold text-emerald-700' : 'border-transparent text-slate-700 hover:bg-slate-50'}`}
                              >
                                {column.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="pl-1">
                          <div className="mb-3 flex items-center gap-2 font-bold text-slate-800">
                            <Users size={14} /> Group by
                          </div>
                          <p className="mb-3 text-xs text-slate-500">
                            Có thể chọn nhiều trường. Thứ tự bấm sẽ là thứ tự nhóm hiển thị ở dạng danh sách.
                          </p>
                          <div className="max-h-[360px] space-y-1 overflow-y-auto">
                            <button
                              onClick={() => setSelectedAdvancedGroupFields([])}
                              className={`flex w-full items-center rounded-lg border px-3 py-2 text-left text-sm transition-colors ${selectedAdvancedGroupFields.length === 0 ? 'border-blue-200 bg-blue-50 font-semibold text-blue-700' : 'border-transparent text-slate-700 hover:bg-slate-50'}`}
                            >
                              <span className="flex-1">Không nhóm</span>
                            </button>
                            {ALL_COLUMNS.map((column) => (
                              <button
                                key={`group-${column.id}`}
                                onClick={() => toggleAdvancedFieldSelection('group', column.id)}
                                className={`flex w-full items-center rounded-lg border px-3 py-2 text-left text-sm transition-colors ${selectedAdvancedGroupFields.includes(column.id) ? 'border-blue-200 bg-blue-50 font-semibold text-blue-700' : 'border-transparent text-slate-700 hover:bg-slate-50'}`}
                              >
                                <span className="flex-1">{column.label}</span>
                                {selectedAdvancedGroupFields.includes(column.id) ? (
                                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-blue-700 border border-blue-100">
                                    {selectedAdvancedGroupFields.indexOf(column.id) + 1}
                                  </span>
                                ) : null}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="relative">
                <button
                  onClick={() => {
                    setShowColumnsDropdown(!showColumnsDropdown);
                    setShowActivityDropdown(false);
                    setShowTimePicker(false);
                    setShowFilterDropdown(false);
                  }}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition-all hover:border-blue-200 hover:text-blue-600"
                  title="Cài đặt cột"
                >
                  <Columns size={18} />
                  <span className="text-xs font-bold font-inter">Cột</span>
                </button>

                {showColumnsDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowColumnsDropdown(false)}></div>
                    <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-xl z-50 animate-in zoom-in-95">
                      <div className="mb-1 border-b border-slate-100 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Hiển thị cột</div>
                      {ALL_COLUMNS.map(col => (
                        <button
                          key={col.id}
                          onClick={() => {
                            if (visibleColumns.includes(col.id)) {
                              if (visibleColumns.length > 1) setVisibleColumns(visibleColumns.filter(id => id !== col.id));
                            } else {
                              const nextCols = ALL_COLUMNS.filter(c => c.id === col.id || visibleColumns.includes(c.id)).map(c => c.id);
                              setVisibleColumns(nextCols);
                            }
                          }}
                          className="group flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs transition-colors hover:bg-slate-50"
                        >
                          <span className={`${visibleColumns.includes(col.id) ? 'font-semibold text-slate-900' : 'text-slate-500'}`}>{col.label}</span>
                          {visibleColumns.includes(col.id) && <Check size={14} className="text-blue-600" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
                </>
              )}

              <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-1 transition-all">
                <button
                  onClick={() => {
                    setViewMode('kanban');
                    setShowActivityDropdown(false);
                    setShowTimePicker(false);
                    setShowFilterDropdown(false);
                    setShowColumnsDropdown(false);
                  }}
                  className={`rounded p-2 ${viewMode === 'kanban' ? 'bg-white text-blue-600 shadow' : 'text-slate-500 hover:text-slate-700'}`}
                  title="Kanban"
                >
                  <Kanban size={18} />
                </button>
                <button
                  onClick={() => {
                    setViewMode('list');
                    setShowActivityDropdown(false);
                    setShowTimePicker(false);
                    setShowFilterDropdown(false);
                    setShowColumnsDropdown(false);
                  }}
                  className={`rounded p-2 ${viewMode === 'list' ? 'bg-white text-blue-600 shadow' : 'text-slate-500 hover:text-slate-700'}`}
                  title="Danh sách"
                >
                  <ListIcon size={18} />
                </button>
                <button
                  onClick={() => {
                    setViewMode('pivot');
                    setShowActivityDropdown(false);
                    setShowTimePicker(false);
                    setShowFilterDropdown(false);
                    setShowColumnsDropdown(false);
                  }}
                  className={`rounded p-2 ${viewMode === 'pivot' ? 'bg-white text-blue-600 shadow' : 'text-slate-500 hover:text-slate-700'}`}
                  title="Báo cáo pivot"
                >
                  <LayoutGrid size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* CONTENT AREA */}
      <div className="flex-1 overflow-hidden relative">
        {viewMode === 'kanban' ? (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="h-full overflow-x-auto p-6">
              <div className="flex gap-6 h-full min-w-max">
                {KANBAN_PIPELINE_STAGES.map(stage => {
                  const stageDeals = getDealsByStage(stage.id);

                  return (
                    <div key={stage.id} className="flex flex-col min-w-[300px] max-w-[320px] h-full flex-shrink-0">
                      {/* Stage Header - Enhanced Style */}
                      <div className="flex items-center justify-between px-4 py-3 mb-3 bg-blue-50 rounded-t-lg border-b-2 border-blue-200">
                        <h3 className="font-bold text-blue-900 text-sm tracking-wide">
                          {stage.title}
                        </h3>
                        <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full">
                          {stageDeals.length}
                        </span>
                      </div>
                      {/* Droppable Area */}
                      <Droppable droppableId={stage.id} isDropDisabled={false}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`flex-1 overflow-y-auto p-3 space-y-3 bg-white rounded-lg shadow-sm border-2 border-slate-200 border-t-4 border-t-blue-500 ${snapshot.isDraggingOver ? 'bg-blue-50 border-blue-400' : ''
                              }`}
                          >
                            {stageDeals.map((deal, index) => renderKanbanCard(deal, index))}
                            {provided.placeholder}

                            {/* Empty State */}
                            {stageDeals.length === 0 && (
                              <div className="text-center py-8 text-slate-400">
                                <Package size={32} className="mx-auto mb-2 opacity-50" />
                                <p className="text-xs">Chưa có deal</p>
                              </div>
                            )}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  );
                })}
              </div>
            </div>
          </DragDropContext>
        ) : viewMode === 'pivot' ? (
          <div className="p-6 h-full overflow-auto animation-fade-in">
            <DealPivotTable deals={searchFilteredDeals} />
          </div>
        ) : (
          <div className="flex flex-col h-full overflow-hidden">
            {selectedIds.length > 0 && (
              <div className="bg-blue-50 border-b border-blue-100 px-4 py-2 flex items-center animate-in fade-in slide-in-from-top-1">
                <span className="text-sm font-medium text-blue-700">
                  Đã chọn <span className="font-bold">{selectedIds.length}</span> deal
                </span>
                <button
                  onClick={() => setSelectedIds([])}
                  className="ml-4 text-xs font-bold text-blue-600 hover:text-blue-800"
                >
                  Bỏ chọn
                </button>
              </div>
            )}
            <div className="flex-1 overflow-auto bg-white rounded-lg shadow border border-slate-200 m-4">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50 sticky top-0 z-10 font-bold text-slate-500 text-[10px] uppercase border-b border-slate-200">
                  <tr>
                    <th className="p-3 text-center border-r border-slate-200 w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.length > 0 && selectedIds.length === filteredDeals.length}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedIds(filteredDeals.map(d => d.id));
                          else setSelectedIds([]);
                        }}
                      />
                    </th>
                    <th className="p-3 text-center border-r border-slate-200 w-16">STT</th>
                    {visibleColumns.includes('opportunity') && <th className="p-3 border-r border-slate-200 min-w-[200px]">Cơ hội</th>}
                    {visibleColumns.includes('contact') && <th className="p-3 border-r border-slate-200 w-44">Liên hệ</th>}
                    {visibleColumns.includes('email') && <th className="p-3 border-r border-slate-200 w-40">Email</th>}
                    {visibleColumns.includes('city') && <th className="p-3 border-r border-slate-200 w-32">Địa chỉ</th>}
                    {visibleColumns.includes('company') && <th className="p-3 border-r border-slate-200 w-32">Cơ sở</th>}
                    {visibleColumns.includes('source') && <th className="p-3 border-r border-slate-200 w-28">Nguồn</th>}
                    {visibleColumns.includes('salesperson') && <th className="p-3 border-r border-slate-200 w-28">Sale</th>}
                    {visibleColumns.includes('assignedDate') && <th className="p-3 border-r border-slate-200 w-32">Ngày assign</th>}
                    {visibleColumns.includes('tags') && <th className="p-3 border-r border-slate-200 w-32">Tags</th>}
                    {visibleColumns.includes('status') && <th className="p-3 text-center w-32">Trạng thái</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDeals.length === 0 ? (
                    <tr>
                      <td colSpan={listTableColumnCount} className="px-4 py-10 text-center text-sm text-slate-500">
                        Chưa có cơ hội phù hợp với bộ lọc hiện tại.
                      </td>
                    </tr>
                  ) : selectedAdvancedGroupFields.length > 0 ? (
                    (() => {
                      let currentIndex = 0;

                      return groupedDeals.map((group) => {
                        const groupStartIndex = currentIndex;
                        currentIndex += group.deals.length;

                        return (
                          <React.Fragment key={group.key}>
                            <tr className="bg-slate-100 border-y border-slate-200">
                              <td colSpan={listTableColumnCount} className="px-4 py-2">
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                                    {group.label}
                                  </span>
                                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500 border border-slate-200">
                                    {group.deals.length} deal
                                  </span>
                                </div>
                              </td>
                            </tr>
                            {group.deals.map((deal, index) => renderListRow(deal, groupStartIndex + index + 1))}
                          </React.Fragment>
                        );
                      });
                    })()
                  ) : (
                    filteredDeals.map((deal, index) => renderListRow(deal, index + 1))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showConvertLeadModal && convertLeadDraft && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Cập nhật lead sau convert</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Lưu lại thông tin mới và note trước khi lên lịch hành động tiếp theo.
                </p>
              </div>
              <button
                onClick={handleSkipConvertedLeadInfo}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Đóng"
              >
                <XCircle size={20} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-2">Tên lead</label>
                  <input
                    value={convertLeadDraft.name}
                    onChange={(e) => setConvertLeadDraft(prev => prev ? { ...prev, name: e.target.value } : prev)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="Nhập tên lead"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-2">Số điện thoại</label>
                  <input
                    value={convertLeadDraft.phone}
                    onChange={(e) => setConvertLeadDraft(prev => prev ? { ...prev, phone: e.target.value } : prev)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="Nhập số điện thoại"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-2">Nhu cầu</label>
                  <input
                    value={convertLeadDraft.demand}
                    onChange={(e) => setConvertLeadDraft(prev => prev ? { ...prev, demand: e.target.value } : prev)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="Ví dụ: Du học Đức"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-2">Source</label>
                  <input
                    value={convertLeadDraft.source}
                    onChange={(e) => setConvertLeadDraft(prev => prev ? { ...prev, source: e.target.value } : prev)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="Facebook, Google..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-2">Tag</label>
                  <input
                    value={convertLeadDraft.tagsText}
                    onChange={(e) => setConvertLeadDraft(prev => prev ? { ...prev, tagsText: e.target.value } : prev)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="Hot lead, Đã gọi, Zalo"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-2">Người phụ trách</label>
                  <select
                    value={convertLeadDraft.ownerId}
                    onChange={(e) => setConvertLeadDraft(prev => prev ? { ...prev, ownerId: e.target.value } : prev)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none bg-white"
                  >
                    <option value="">Chưa phân công</option>
                    {Object.entries(OWNER_LABELS).map(([ownerId, label]) => (
                      <option key={ownerId} value={ownerId}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">Note mới</label>
                <textarea
                  value={convertLeadDraft.newNote}
                  onChange={(e) => setConvertLeadDraft(prev => prev ? { ...prev, newNote: e.target.value } : prev)}
                  className="w-full min-h-[120px] rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none resize-none"
                  placeholder="Nhập ghi chú mới sau khi convert..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
              <button
                onClick={handleSkipConvertedLeadInfo}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Bỏ qua thông tin
              </button>
              <button
                onClick={handleSaveConvertedLeadInfo}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Lưu và lên lịch tiếp
              </button>
            </div>
          </div>
        </div>
      )}

      {showNextActivityModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-lg p-6 w-[420px] shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Tạo hành động tiếp theo</h3>
            <p className="text-sm text-slate-600 mb-4">Hãy tạo hoạt động tiếp theo để theo dõi deal mới.</p>

            <div className="flex gap-2 mb-3">
              {NEXT_ACTIVITY_TYPES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setNextActivityType(t.id)}
                  className={`flex-1 p-2 rounded border text-[10px] font-bold uppercase ${nextActivityType === t.id ? 'bg-purple-50 border-purple-400 text-purple-700' : 'border-slate-200 text-slate-500'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <input type="datetime-local" className="w-full text-xs p-2 border rounded font-bold mb-2" value={nextActivityDate} onChange={e => setNextActivityDate(e.target.value)} />
            <input className="w-full text-xs p-2 border rounded mb-4" placeholder="Nội dung dự kiến..." value={nextActivitySummary} onChange={e => setNextActivitySummary(e.target.value)} />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowNextActivityModal(false); setNextActivityDealId(null); }}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded"
              >
                Bỏ qua
              </button>
              <button
                onClick={handleSaveNextActivity}
                className="px-4 py-2 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded"
              >
                Lưu hoạt động
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UNIFIED DRAWER FOR DEALS */}
      {drawerLead && (
        <UnifiedLeadDrawer
          isOpen={!!drawerLead}
          lead={drawerLead}
          onClose={() => {
            setDrawerLead(null);
            setSelectedDeal(null);
            syncDrawerQuery(null, true);
          }}
          onUpdate={handleDrawerUpdate}
        />
      )}
    </div>
  );
};

export default Pipeline;

