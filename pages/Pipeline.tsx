import React, { useState, useEffect, useRef } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { DealStage, IDeal, ILead, LeadStatus, IContact, Activity, ActivityType } from '../types';
import { getDeals, saveDeals, getContacts, addContact, updateDeal, saveContact, getLeadById, getLeads, saveLead, getSalesTeams } from '../utils/storage';
import { useAuth } from '../contexts/AuthContext';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import UnifiedLeadDrawer from '../components/UnifiedLeadDrawer';
import DealPivotTable from '../components/DealPivotTable';
import SmartSearchBar, { SearchFilter } from '../components/SmartSearchBar';
import { AdvancedFilterDropdown, ToolbarTimeFilter } from '../components/filters';
import { isClosedLeadStatusKey, LEAD_STATUS_OPTIONS } from '../utils/leadStatus';
import {
  ToolbarFilterChip,
  ToolbarValueOption,
  appendUniqueSearchFilter,
  buildMultiFieldFilterKey,
  doesDateMatchTimeRange,
  getTimeRangeSummaryLabel,
  parseMultiFieldFilterKeys,
} from '../utils/filterToolbar';
import {
  LEAD_CAMPUS_OPTIONS,
  LEAD_POTENTIAL_OPTIONS,
  LEAD_PRODUCT_OPTIONS,
  LEAD_SOURCE_OPTIONS,
  LEAD_TARGET_COUNTRY_OPTIONS,
} from '../utils/leadCreateForm';
import {
  DEFAULT_LEAD_ACTION_FILTER_FIELD,
  LEAD_TOOLBAR_TIME_FIELD_OPTIONS,
  LEAD_TOOLBAR_TIME_PRESETS,
  getLeadToolbarFieldValue,
  getLeadToolbarFieldValues,
  getLeadToolbarTimeFieldLabel,
  getLeadToolbarTimeValue,
  type LeadActionFilterField,
  type LeadActionFilterSelection,
} from '../utils/leadToolbarConfig';
import { decodeMojibakeText } from '../utils/mojibake';
import {
  Phone, Mail, MessageCircle, Calendar, DollarSign, User,
  FileText, CheckCircle, XCircle, AlertCircle, Clock, Plus,
  TrendingUp, Package, Sparkles, LayoutGrid, Kanban, List as ListIcon, Columns, Check,
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

const PIPELINE_MULTI_FILTER_PREFIX = '__pipeline_multi__:';

type PipelineAdvancedFieldKey =
  | 'status'
  | 'salesperson'
  | 'source'
  | 'campaign'
  | 'product'
  | 'market'
  | 'potential'
  | 'company';

const PIPELINE_ADVANCED_FIELD_OPTIONS: ReadonlyArray<{ id: PipelineAdvancedFieldKey; label: string }> = [
  { id: 'status', label: 'Trạng thái lead' },
  { id: 'salesperson', label: 'Nhân viên phụ trách' },
  { id: 'source', label: 'Nguồn lead' },
  { id: 'campaign', label: 'Chiến dịch' },
  { id: 'product', label: 'Sản phẩm quan tâm' },
  { id: 'market', label: 'Thị trường' },
  { id: 'potential', label: 'Mức độ tiềm năng' },
  { id: 'company', label: 'Cơ sở' },
];
const PIPELINE_ADVANCED_FIELD_ID_SET = new Set<PipelineAdvancedFieldKey>(
  PIPELINE_ADVANCED_FIELD_OPTIONS.map((option) => option.id)
);

const normalizeToolbarLabel = (value: unknown) => decodeMojibakeText(String(value || '')).trim();
const normalizeToolbarToken = (value: unknown) =>
  normalizeToolbarLabel(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '')
    .toLowerCase();
const LEAD_CAMPUS_OPTION_TOKEN_SET = new Set(
  LEAD_CAMPUS_OPTIONS.map((option) => normalizeToolbarToken(option))
);

const mapLabelsToValueOptions = (labels: ReadonlyArray<string>): ToolbarValueOption[] =>
  labels
    .map((label) => normalizeToolbarLabel(label))
    .filter(Boolean)
    .map((label) => ({ value: label, label }));

const mergeValueOptions = (...groups: Array<ReadonlyArray<ToolbarValueOption> | undefined>) => {
  const optionMap = new Map<string, ToolbarValueOption>();

  groups.forEach((group) => {
    group?.forEach((option) => {
      const label = normalizeToolbarLabel(option.label || option.value);
      const key = normalizeToolbarToken(label);
      if (!label || !key || optionMap.has(key)) return;
      optionMap.set(key, { value: label, label });
    });
  });

  return Array.from(optionMap.values()).sort((left, right) => left.label.localeCompare(right.label, 'vi'));
};

const normalizePhone = (value?: string) => String(value || '').replace(/\D/g, '');
const normalizeText = (value: unknown) => String(value || '').trim().toLowerCase();

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
  const [selectedAdvancedFilterFields, setSelectedAdvancedFilterFields] = useState<PipelineAdvancedFieldKey[]>([]);
  const [selectedAdvancedFilterValue, setSelectedAdvancedFilterValue] = useState('');
  const [selectedAdvancedGroupFields, setSelectedAdvancedGroupFields] = useState<PipelineAdvancedFieldKey[]>([]);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timeFilterField, setTimeFilterField] = useState<LeadActionFilterSelection>('action');
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
        .map((fieldId) => PIPELINE_ADVANCED_FIELD_OPTIONS.find((option) => option.id === fieldId))
        .filter((option): option is { id: PipelineAdvancedFieldKey; label: string } => Boolean(option)),
    [selectedAdvancedFilterFields]
  );
  const activeAdvancedFilterField = selectedAdvancedFilterOptions[0] || null;
  const selectedAdvancedGroupOptions = React.useMemo(
    () =>
      selectedAdvancedGroupFields
        .map((fieldId) => PIPELINE_ADVANCED_FIELD_OPTIONS.find((option) => option.id === fieldId))
        .filter((option): option is { id: PipelineAdvancedFieldKey; label: string } => Boolean(option)),
    [selectedAdvancedGroupFields]
  );
  const isListView = viewMode === 'list';
  const isKanbanView = viewMode === 'kanban';
  const supportsListFilters = isListView || isKanbanView;
  const timePresets = LEAD_TOOLBAR_TIME_PRESETS;
  const timeFieldOptions = LEAD_TOOLBAR_TIME_FIELD_OPTIONS;
  const resolvedTimeFilterField =
    timeFilterField === 'action' ? DEFAULT_LEAD_ACTION_FILTER_FIELD : timeFilterField;

  const toggleAdvancedFieldSelection = (type: 'filter' | 'group', fieldId: PipelineAdvancedFieldKey) => {
    if (type === 'filter') {
      setSelectedAdvancedFilterValue('');
      setSelectedAdvancedFilterFields((prev) => (prev.includes(fieldId) ? [] : [fieldId]));
      return;
    }

    if (viewMode !== 'list') {
      setViewMode('list');
    }

    setSelectedAdvancedGroupFields((prev) =>
      prev.includes(fieldId) ? prev.filter((item) => item !== fieldId) : [...prev, fieldId]
    );
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

  const isDealDetachedFromContact = (deal?: IDeal | null) => deal?.customerLinkMode === 'no_contact';

  const buildVirtualContactFromLead = (lead: ILead): IContact => {
    const studentInfo = lead.studentInfo || {};

    return {
      id: lead.id,
      leadId: lead.id,
      name: lead.name,
      phone: lead.phone,
      targetCountry: lead.targetCountry || studentInfo.targetCountry || 'Đức',
      email: lead.email || '',
      address: lead.address,
      city: lead.city,
      identityCard: lead.identityCard || studentInfo.identityCard,
      identityDate: lead.identityDate,
      identityPlace: lead.identityPlace,
      gender: lead.gender || studentInfo.gender,
      guardianName: lead.guardianName || studentInfo.parentName,
      guardianPhone: lead.guardianPhone || studentInfo.parentPhone,
      guardianRelation: lead.guardianRelation,
      studentName: studentInfo.studentName,
      studentPhone: studentInfo.studentPhone,
      school: studentInfo.school,
      educationLevel: lead.educationLevel || studentInfo.educationLevel,
      languageLevel: studentInfo.languageLevel,
      financialStatus: studentInfo.financialStatus,
      socialLink: studentInfo.socialLink,
      company: lead.company,
      title: lead.title,
      ownerId: lead.ownerId,
      source: lead.source,
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt,
      notes: lead.notes,
      activities: lead.activities || [],
      marketingData: lead.marketingData as IContact['marketingData'],
    };
  };

  const resolveLinkedLeadForPipeline = (deal: IDeal, contact?: IContact | null) => {
    if (isDealDetachedFromContact(deal)) {
      const detachedLead = getLeadById(deal.leadId);
      if (detachedLead) return detachedLead;
    }

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

  const getDealContactRecord = (deal: IDeal, sourceContacts: IContact[] = contacts) => {
    let contact = sourceContacts.find((item) => item.id === deal.leadId);

    if (!contact && !isDealDetachedFromContact(deal)) {
      const potentialName = deal.title.split(' - ')[0].trim();
      contact = sourceContacts.find((item) => item.name.toLowerCase() === potentialName.toLowerCase());
    }

    if (contact) return contact;

    const linkedLead = resolveLinkedLeadForPipeline(deal);
    return linkedLead ? buildVirtualContactFromLead(linkedLead) : undefined;
  };

  const isDealClosedForPipeline = (deal: IDeal) => {
    if (deal.stage === DealStage.LOST) return true;
    const linkedLead = resolveLinkedLeadForPipeline(deal, getDealContactRecord(deal));
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

  const getLatestPipelineInteractionDate = (activities: any[] = [], fallback = '') => {
    const latestActivity = activities.find(
      (activity) => activity && String(activity?.status || '').toLowerCase() !== 'scheduled' && getActivityTimestamp(activity) > 0
    );

    return latestActivity ? getActivityDateValue(latestActivity) : fallback;
  };

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

  const pipelineSalesOptions = React.useMemo(() => {
    const optionMap = new Map<string, { value: string; label: string }>();

    getSalesTeams().forEach((team) => {
      team.members.forEach((member) => {
        if (!member.userId) return;
        optionMap.set(member.userId, {
          value: member.userId,
          label: normalizeToolbarLabel(member.name || member.userId)
        });
      });
    });

    if (user?.id) {
      optionMap.set(user.id, {
        value: user.id,
        label: normalizeToolbarLabel(user.name || user.id)
      });
    }

    return Array.from(optionMap.values()).sort((left, right) => left.label.localeCompare(right.label, 'vi'));
  }, [user?.id, user?.name]);

  const ownerLabelMap = React.useMemo(() => {
    const entries = pipelineSalesOptions.map((option) => [option.value, option.label] as const);
    return Object.fromEntries(entries) as Record<string, string>;
  }, [pipelineSalesOptions]);

  const getOwnerDisplayName = (ownerId?: string) => {
    if (!ownerId) return 'Chưa phân công';
    return ownerLabelMap[ownerId] || normalizeToolbarLabel(ownerId) || ownerId;
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

  const getPipelineToolbarLead = (deal: IDeal, contact?: IContact) => {
    const linkedLead = resolveLinkedLeadForPipeline(deal, contact);
    const mergedActivities = mergeActivities(
      Array.isArray(linkedLead?.activities) ? (linkedLead.activities as any[]) : [],
      mergeActivities(deal.activities || [], (contact?.activities as any[]) || [])
    );
    const mergedMarketingData = {
      ...(contact?.marketingData || {}),
      ...(linkedLead?.marketingData || {})
    };
    const campus =
      normalizeToolbarLabel(linkedLead?.company) ||
      normalizeToolbarLabel(contact?.company) ||
      normalizeToolbarLabel(mergedMarketingData.region) ||
      normalizeToolbarLabel(mergedMarketingData.market);
    const fallbackMarket = normalizeToolbarLabel(mergedMarketingData.market);
    const targetMarket =
      normalizeToolbarLabel(linkedLead?.targetCountry) ||
      normalizeToolbarLabel(linkedLead?.studentInfo?.targetCountry) ||
      normalizeToolbarLabel(contact?.targetCountry) ||
      (
        fallbackMarket && !LEAD_CAMPUS_OPTION_TOKEN_SET.has(normalizeToolbarToken(fallbackMarket))
          ? fallbackMarket
          : ''
      );
    const productInterest =
      normalizeToolbarLabel(linkedLead?.product) ||
      normalizeToolbarLabel(linkedLead?.program) ||
      normalizeToolbarLabel(getDealDemand(deal, contact));
    const createdAt = linkedLead?.createdAt || contact?.createdAt || getLeadCreatedDate(deal) || new Date().toISOString();
    const assignedAt = linkedLead?.pickUpDate || getAssignedDate(deal, contact);
    const lastInteraction =
      linkedLead?.lastInteraction ||
      getLatestPipelineInteractionDate(mergedActivities, linkedLead?.updatedAt || createdAt);
    const fallbackProgram = productInterest || 'Tiếng Đức';

    return {
      ...(linkedLead || {}),
      id: linkedLead?.id || contact?.leadId || contact?.id || deal.id,
      name: linkedLead?.name || contact?.name || deal.title.split(' - ')[0] || deal.title,
      phone: linkedLead?.phone || contact?.phone || '',
      email: linkedLead?.email || contact?.email || '',
      source: linkedLead?.source || contact?.source || mergedMarketingData.source || '',
      campaign: linkedLead?.campaign || mergedMarketingData.campaign || '',
      program: (linkedLead?.program || fallbackProgram) as ILead['program'],
      status: linkedLead?.status || '',
      ownerId: linkedLead?.ownerId || deal.ownerId || contact?.ownerId || '',
      createdAt,
      pickUpDate: assignedAt || undefined,
      updatedAt: linkedLead?.updatedAt,
      lastInteraction,
      notes: linkedLead?.notes || contact?.notes || '',
      activities: mergedActivities as any,
      company: campus || undefined,
      product: productInterest || undefined,
      targetCountry: targetMarket || undefined,
      studentInfo: {
        ...(linkedLead?.studentInfo || {}),
        targetCountry: targetMarket || linkedLead?.studentInfo?.targetCountry || undefined
      },
      marketingData: {
        ...mergedMarketingData,
        source: linkedLead?.source || contact?.source || mergedMarketingData.source || '',
        campaign: linkedLead?.campaign || mergedMarketingData.campaign || '',
        market: targetMarket || mergedMarketingData.market || '',
        region: campus || mergedMarketingData.region || ''
      },
      internalNotes: {
        ...(linkedLead?.internalNotes || {}),
        potential: linkedLead?.internalNotes?.potential || (linkedLead as any)?.potential || undefined
      }
    } as ILead;
  };

  const getPipelineTimeFieldValue = (
    deal: IDeal,
    contact: IContact | undefined,
    field: LeadActionFilterField
  ) => {
    const toolbarLead = getPipelineToolbarLead(deal, contact);

    if (field === 'appointment') {
      return getNextActivityDate(deal, contact) || getLeadToolbarTimeValue(toolbarLead, field);
    }

    return getLeadToolbarTimeValue(toolbarLead, field);
  };

  const getPipelineAdvancedFieldValues = (
    deal: IDeal,
    contact: IContact | undefined,
    fieldId: PipelineAdvancedFieldKey
  ) => {
    const toolbarLead = getPipelineToolbarLead(deal, contact);
    return getLeadToolbarFieldValues(toolbarLead, fieldId, {
      getSalespersonLabel: (lead) => getOwnerDisplayName(lead.ownerId)
    });
  };

  const getPipelineAdvancedSelectableOptions = (
    fieldId: PipelineAdvancedFieldKey,
    dynamicValues: ReadonlyArray<string>
  ) => {
    const baseOptions = (() => {
      switch (fieldId) {
        case 'status':
          return mapLabelsToValueOptions(LEAD_STATUS_OPTIONS.map((option) => option.label));
        case 'salesperson':
          return pipelineSalesOptions.map((option) => ({ value: option.label, label: option.label }));
        case 'source':
          return mapLabelsToValueOptions(LEAD_SOURCE_OPTIONS.map((option) => option.label));
        case 'campaign':
          return [];
        case 'product':
          return mapLabelsToValueOptions(LEAD_PRODUCT_OPTIONS.map((option) => option.label));
        case 'market':
          return mapLabelsToValueOptions([...LEAD_TARGET_COUNTRY_OPTIONS]);
        case 'potential':
          return mapLabelsToValueOptions(LEAD_POTENTIAL_OPTIONS.map((option) => option.label));
        case 'company':
          return mapLabelsToValueOptions([...LEAD_CAMPUS_OPTIONS]);
        default:
          return [];
      }
    })();

    return mergeValueOptions(baseOptions, mapLabelsToValueOptions(dynamicValues));
  };

  const getDealFieldValues = (deal: IDeal, contact: IContact | undefined, fieldId: string) => {
    const opportunityName = deal.title.split(' - ')[0] || deal.title;
    const programName = deal.title.split(' - ')[1] || '';
    const assignedDate = getAssignedDate(deal, contact);
    const tags = parseTags(contact?.marketingData?.tags);
    const nextActivityDate = getNextActivityDate(deal, contact);

    if (PIPELINE_ADVANCED_FIELD_ID_SET.has(fieldId as PipelineAdvancedFieldKey)) {
      return getPipelineAdvancedFieldValues(deal, contact, fieldId as PipelineAdvancedFieldKey);
    }

    switch (fieldId) {
      case 'opportunity':
        return [opportunityName, programName, getDealDemand(deal, contact)].filter(Boolean);
      case 'contact':
        return [contact?.name, contact?.phone].filter(Boolean);
      case 'email':
        return [contact?.email].filter(Boolean);
      case 'city':
        return [contact?.city, contact?.address].filter(Boolean);
      case 'assignedDate':
        return [assignedDate, formatDate(assignedDate)].filter(Boolean);
      case 'tags':
        return [...tags, tags.join(' | ')].filter(Boolean);
      case 'nextActivity':
        return [nextActivityDate, formatDate(nextActivityDate)].filter(Boolean);
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
          ...tags,
          getStageLabel(deal.stage)
        ].filter(Boolean);
    }
  };

  const getDealFieldValue = (deal: IDeal, contact: IContact | undefined, fieldId: string) => {
    const values = getDealFieldValues(deal, contact, fieldId);
    if (fieldId === 'tags') {
      return parseTags(contact?.marketingData?.tags).join(' | ');
    }
    return values.join(' | ');
  };

  const getDealSelectableFieldValues = (deal: IDeal, contact: IContact | undefined, fieldId: string) => {
    const assignedDate = getAssignedDate(deal, contact);

    switch (fieldId) {
      case 'opportunity':
        return [deal.title.split(' - ')[0] || deal.title].filter(Boolean);
      case 'assignedDate': {
        const formattedDate = formatDate(assignedDate);
        return formattedDate && formattedDate !== '-' ? [formattedDate] : [];
      }
      case 'tags':
        return parseTags(contact?.marketingData?.tags);
      default:
        return getDealFieldValues(deal, contact, fieldId);
    }
  };

  const doesDealMatchFilter = (
    deal: IDeal,
    contact: IContact | undefined,
    field: string,
    value: string,
    matchMode: SearchFilter['matchMode'] = 'includes'
  ) => {
    const normalizedValue = normalizeText(value);
    if (!normalizedValue) return true;

    const matchesFieldValues = (fieldId: string, mode: SearchFilter['matchMode'] = matchMode) =>
      getDealFieldValues(deal, contact, fieldId).some((item) => {
        const normalizedItem = normalizeText(item);
        if (!normalizedItem) return false;
        return mode === 'equals'
          ? normalizedItem === normalizedValue
          : normalizedItem.includes(normalizedValue);
      });

    const groupedFields = parseMultiFieldFilterKeys(field, PIPELINE_MULTI_FILTER_PREFIX);
    if (groupedFields.length > 0) {
      return groupedFields.some((fieldId) => matchesFieldValues(fieldId));
    }

    if (field === 'search') {
      return matchesFieldValues('search', 'includes');
    }

    return matchesFieldValues(field);
  };

  const getGroupValue = (deal: IDeal, contact: IContact | undefined, fieldId: string) => {
    if (PIPELINE_ADVANCED_FIELD_ID_SET.has(fieldId as PipelineAdvancedFieldKey)) {
      const toolbarLead = getPipelineToolbarLead(deal, contact);
      return getLeadToolbarFieldValue(toolbarLead, fieldId as PipelineAdvancedFieldKey, {
        getSalespersonLabel: (lead) => getOwnerDisplayName(lead.ownerId),
        emptyLabel: 'Chưa có dữ liệu'
      });
    }

    const rawValue = getDealFieldValue(deal, contact, fieldId);
    const normalized = String(rawValue || '').trim();
    return normalized || 'Chưa có dữ liệu';
  };

  const toolbarFilterChips = React.useMemo<ToolbarFilterChip[]>(() => {
    const chips: ToolbarFilterChip[] = searchFilters.map((filter, index) => ({
      ...filter,
      origin: 'search',
      originalIndex: index
    }));

    if (timeFilterField !== 'action' || timeRangeType !== 'all') {
      chips.push({
        field: 'time',
        label: 'Hành động',
        value: `${getLeadToolbarTimeFieldLabel(timeFilterField)} / ${getTimeRangeSummaryLabel(timePresets, timeRangeType, customRange)}`,
        origin: 'synthetic',
        syntheticKey: 'time'
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
    customRange,
    searchFilters,
    selectedAdvancedGroupOptions,
    timeFilterField,
    timePresets,
    timeRangeType
  ]);

  const searchOnlyFilters = React.useMemo(
    () => searchFilters.filter((filter) => filter.field === 'search'),
    [searchFilters]
  );

  const searchOnlyToolbarChips = React.useMemo<ToolbarFilterChip[]>(
    () =>
      searchFilters
        .map((filter, index) => ({
          ...filter,
          origin: 'search' as const,
          originalIndex: index
        }))
        .filter((filter) => filter.field === 'search'),
    [searchFilters]
  );

  const headerSearchFilters = supportsListFilters ? toolbarFilterChips : searchOnlyToolbarChips;
  const headerActiveField = supportsListFilters && activeAdvancedFilterField
    ? {
      field: activeAdvancedFilterField.id,
      label: activeAdvancedFilterField.label,
      color: 'bg-emerald-100 text-emerald-700'
    }
    : null;

  const addToolbarFilter = (
    field: string,
    label: string,
    value: string,
    color?: string,
    matchMode: SearchFilter['matchMode'] = 'includes'
  ) => {
    setSearchFilters((prev) => appendUniqueSearchFilter(prev, {
      field,
      label,
      value,
      color,
      matchMode
    }, normalizeText));
  };

  const applySelectedAdvancedFilter = (
    rawValue: string,
    options?: { matchMode?: SearchFilter['matchMode']; closeDropdown?: boolean }
  ) => {
    const normalizedValue = String(rawValue || '').trim();
    const matchMode = options?.matchMode || 'includes';
    const closeDropdown = options?.closeDropdown ?? true;

    if (!normalizedValue || selectedAdvancedFilterOptions.length === 0) return false;

    if (selectedAdvancedFilterOptions.length > 1) {
      addToolbarFilter(
        buildMultiFieldFilterKey(PIPELINE_MULTI_FILTER_PREFIX, selectedAdvancedFilterOptions.map((option) => option.id)),
        selectedAdvancedFilterOptions.map((option) => option.label).join(' OR '),
        normalizedValue,
        'bg-emerald-100 text-emerald-700',
        matchMode
      );
    } else {
      addToolbarFilter(
        selectedAdvancedFilterOptions[0].id,
        selectedAdvancedFilterOptions[0].label,
        normalizedValue,
        'bg-emerald-100 text-emerald-700',
        matchMode
      );
    }

    if (closeDropdown) {
      setSelectedAdvancedFilterFields([]);
      setSelectedAdvancedFilterValue('');
      setShowFilterDropdown(false);
    }

    return true;
  };

  const handleToolbarFilterRemove = (index: number) => {
    const chip = toolbarFilterChips[index];
    if (!chip) return;

    if (chip.origin === 'search' && typeof chip.originalIndex === 'number') {
      setSearchFilters((prev) => prev.filter((_, itemIndex) => itemIndex !== chip.originalIndex));
      return;
    }

    if (chip.syntheticKey === 'time') {
      setTimeFilterField('action');
      setTimeRangeType('all');
      setCustomRange(null);
      setShowTimePicker(false);
      return;
    }

    if (chip.syntheticKey === 'groupFields') {
      setSelectedAdvancedGroupFields([]);
    }
  };

  const handleClearToolbarFilters = () => {
    setSearchFilters([]);
    setSelectedAdvancedFilterFields([]);
    setSelectedAdvancedFilterValue('');
    setSelectedAdvancedGroupFields([]);
    setTimeFilterField('action');
    setTimeRangeType('all');
    setCustomRange(null);
    setShowTimePicker(false);
    setShowFilterDropdown(false);
  };

  const handleHeaderSearchAddFilter = (filter: SearchFilter) => {
    if (!supportsListFilters) {
      addToolbarFilter(filter.field, filter.label, filter.value, filter.color, filter.matchMode);
      return;
    }

    if (selectedAdvancedFilterOptions.length > 1) {
      addToolbarFilter(
        buildMultiFieldFilterKey(PIPELINE_MULTI_FILTER_PREFIX, selectedAdvancedFilterOptions.map((option) => option.id)),
        'Logic lọc',
        filter.value,
        'bg-emerald-100 text-emerald-700',
        filter.matchMode
      );
      return;
    }

    if (selectedAdvancedFilterOptions.length === 1) {
      addToolbarFilter(
        selectedAdvancedFilterOptions[0].id,
        selectedAdvancedFilterOptions[0].label,
        filter.value,
        'bg-emerald-100 text-emerald-700',
        filter.matchMode
      );
      return;
    }

    addToolbarFilter(filter.field, filter.label, filter.value, filter.color, filter.matchMode);
  };

  const handleHeaderSearchRemoveFilter = (index: number) => {
    if (supportsListFilters) {
      handleToolbarFilterRemove(index);
      return;
    }

    const chip = searchOnlyToolbarChips[index];
    if (!chip) return;
    setSearchFilters((prev) => prev.filter((_, itemIndex) => itemIndex !== chip.originalIndex));
  };

  const handleHeaderSearchClearAll = () => {
    if (supportsListFilters) {
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
      const contact = getDealContactRecord(deal);
      return searchOnlyFilters.every((filter) =>
        doesDealMatchFilter(deal, contact, filter.field, filter.value, filter.matchMode)
      );
    });
  }, [contacts, pipelineDeals, searchOnlyFilters]);

  const filteredDeals = React.useMemo(() => {
    return pipelineDeals.filter((deal) => {
      const contact = getDealContactRecord(deal);

      if (timeRangeType !== 'all') {
        if (!doesDateMatchTimeRange(getPipelineTimeFieldValue(deal, contact, resolvedTimeFilterField), timeRangeType, customRange)) {
          return false;
        }
      }

      if (searchFilters.length > 0) {
        return searchFilters.every((filter) =>
          doesDealMatchFilter(deal, contact, filter.field, filter.value, filter.matchMode)
        );
      }

      return true;
    });
  }, [contacts, customRange, pipelineDeals, resolvedTimeFilterField, searchFilters, timeRangeType]);

  const advancedFilterSelectableValues = React.useMemo<ReadonlyArray<ToolbarValueOption>>(() => {
    if (!activeAdvancedFilterField) return [];

    const dynamicValues = filteredDeals.flatMap((deal) => {
      const contact = getDealContactRecord(deal);
      return getDealSelectableFieldValues(deal, contact, activeAdvancedFilterField.id);
    });

    return getPipelineAdvancedSelectableOptions(activeAdvancedFilterField.id, dynamicValues);
  }, [activeAdvancedFilterField, filteredDeals, pipelineSalesOptions]);

  const buildGroupedDealBuckets = (dealList: IDeal[]) => {
    if (selectedAdvancedGroupFields.length === 0) return [];

    const buckets = new Map<string, { key: string; label: string; deals: IDeal[] }>();
    dealList.forEach((deal) => {
      const contact = getDealContactRecord(deal);
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
  }, [contacts, filteredDeals, selectedAdvancedGroupFields, selectedAdvancedGroupOptions]);

  // Group deals by stage bucket
  const getDealsByStage = (stage: DealStage) => {
    return filteredDeals.filter(deal => getPipelineBucket(deal.stage) === stage);
  };

  const advancedDropdownFilterOptions = PIPELINE_ADVANCED_FIELD_OPTIONS;
  const advancedDropdownGroupOptions = PIPELINE_ADVANCED_FIELD_OPTIONS;
  const hasTimeToolbarFilter = timeFilterField !== 'action' || timeRangeType !== 'all';
  const advancedToolbarActiveCount =
    searchFilters.length +
    selectedAdvancedGroupFields.length +
    (hasTimeToolbarFilter ? 1 : 0);
  const hasAdvancedToolbarFilters =
    searchFilters.length > 0 ||
    selectedAdvancedGroupFields.length > 0 ||
    hasTimeToolbarFilter;

  const handleTimeFilterFieldChange = (nextFieldId: string) => {
    setShowFilterDropdown(false);
    setShowColumnsDropdown(false);
    setShowTimePicker(false);
    setTimeFilterField(nextFieldId as LeadActionFilterSelection);
  };

  const handleTimeFilterOpenChange = (nextOpen: boolean) => {
    setShowFilterDropdown(false);
    setShowColumnsDropdown(false);
    setShowTimePicker(nextOpen);
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
    setShowColumnsDropdown(false);
    setShowFilterDropdown(nextOpen);
  };

  const handleAdvancedFilterValueChange = (nextValue: string) => {
    setSelectedAdvancedFilterValue(nextValue);
    if (!nextValue) return;
    applySelectedAdvancedFilter(nextValue, { matchMode: 'equals' });
  };

  function getDefaultActivityDate(typeId: ActivityType) {
    const now = new Date();
    const delayHours = typeId === 'meeting' ? 24 : 2;
    now.setHours(now.getHours() + delayHours);
    return new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
  }

  const resolveLinkedLead = (contact?: IContact | null, deal?: IDeal | null) => {
    if (!deal) return undefined;
    return resolveLinkedLeadForPipeline(deal, contact);
  };

  // Handle Deal Click -> Open Drawer (Unified Form)
  const handleDealClick = (deal: IDeal) => {
    const contacts = getContacts();
    const contact = getDealContactRecord(deal, contacts);

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
        activities: mergeActivities(
          linkedLead?.activities || [],
          isDealDetachedFromContact(deal) ? [] : (contact.activities || [])
        ),
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
      const shouldSkipContactUpdate = isDealDetachedFromContact(selectedDeal);
      const existingContact = shouldSkipContactUpdate
        ? undefined
        : getContacts().find(contact =>
            contact.id === drawerLead.id ||
            contact.leadId === drawerLead.id ||
            normalizePhone(contact.phone) === normalizePhone(updatedLead.phone)
          );
      const linkedLead = shouldSkipContactUpdate
        ? (getLeadById(selectedDeal.leadId) || resolveLinkedLead(null, selectedDeal))
        : resolveLinkedLead(existingContact || null, selectedDeal);
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
      // Update contact in storage only when the deal is linked to a real contact.
      if (!shouldSkipContactUpdate) {
        if (existingContact) {
          saveContact({
            ...existingContact,
            ...contactUpdate
          } as IContact);
        } else {
          addContact(contactUpdate as any);
        }
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
      if (!shouldSkipContactUpdate) {
        setContacts(getContacts());
      }
      setSelectedDeal(updatedDeal);
      setDrawerLead(persistedLead);
    }
  };

  const listTableColumnCount = visibleColumns.length + 2;
  const renderListRow = (deal: IDeal, rowNumber: number) => {
    const contact = getDealContactRecord(deal);
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
    const contact = getDealContactRecord(deal);
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

          <div className="flex w-full flex-col gap-3 xl:w-[780px] xl:max-w-[780px]">
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

            <div className={`flex w-full flex-col gap-2 sm:flex-row sm:items-start ${supportsListFilters ? 'sm:justify-between' : 'sm:justify-end'}`}>
              {supportsListFilters ? (
                <div className="flex flex-wrap items-center gap-2">
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
                  />

                  <AdvancedFilterDropdown
                    isOpen={showFilterDropdown}
                    activeCount={advancedToolbarActiveCount}
                    hasActiveFilters={hasAdvancedToolbarFilters}
                    filterOptions={advancedDropdownFilterOptions}
                    groupOptions={advancedDropdownGroupOptions}
                    selectedFilterFieldIds={selectedAdvancedFilterFields}
                    selectedGroupFieldIds={selectedAdvancedGroupFields}
                    activeFilterField={activeAdvancedFilterField}
                    selectableValues={advancedFilterSelectableValues}
                    selectedFilterValue={selectedAdvancedFilterValue}
                    onOpenChange={handleAdvancedFilterOpenChange}
                    onToggleFilterField={(fieldId) => toggleAdvancedFieldSelection('filter', fieldId as PipelineAdvancedFieldKey)}
                    onToggleGroupField={(fieldId) => toggleAdvancedFieldSelection('group', fieldId as PipelineAdvancedFieldKey)}
                    onFilterValueChange={handleAdvancedFilterValueChange}
                    onClearAll={handleClearToolbarFilters}
                    filterDescription="Chọn 1 trường lead trong pipeline rồi chọn giá trị tương ứng ở dropdown bên dưới để lọc đúng theo dữ liệu của form thêm lead."
                    groupDescription="Có thể chọn nhiều trường lead. Khi chọn group by, pipeline sẽ chuyển sang dạng danh sách để hiển thị nhóm."
                  />
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-2">
                {isListView && (
                  <div className="relative">
                    <button
                      onClick={() => {
                        setShowColumnsDropdown(!showColumnsDropdown);
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
                )}

                <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-1 transition-all">
                <button
                  onClick={() => {
                    setViewMode('kanban');
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
                    {pipelineSalesOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
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
          statusBarMode="pipeline"
          statusBarStage={selectedDeal?.stage}
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

