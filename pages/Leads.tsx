
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ILead, LeadStatus, UserRole, IDeal, DealStage } from '../types';
import SLABadge from '../components/SLABadge';
import UnifiedLeadDrawer from '../components/UnifiedLeadDrawer';
import LeadPivotTable from '../components/LeadPivotTable'; // Import Pivot Component
import LeadStudentInfoTab from '../components/LeadStudentInfoTab';
import LeadTagManager from '../components/LeadTagManager';
import SmartSearchBar, { SearchFilter } from '../components/SmartSearchBar';
import { useAuth } from '../contexts/AuthContext';
import { FIXED_LEAD_TAGS, getLeads, saveLead, saveLeads, addDeal, addContact, deleteLead, convertLeadToContact, getTags, saveTags, getClosedLeadReasons } from '../utils/storage';
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
import {
  CLOSED_LEAD_STATUS_KEYS,
  getLeadStatusLabel,
  isClosedLeadStatusKey,
  LEAD_STATUS_KEYS,
  LEAD_STATUS_OPTIONS,
  normalizeLeadStatusKey,
  toLeadStatusValue,
} from '../utils/leadStatus';
import { appendLeadLogs, buildLeadActivityLog, buildLeadAuditChange, buildLeadAuditLog } from '../utils/leadLogs';
import { decodeMojibakeReactNode } from '../utils/mojibake';
import {
  Plus,
  Phone,
  UploadCloud,
  ArrowRight,
  Check,
  Filter,
  SlidersHorizontal,
  Clock,
  X,
  Save,
  AlertTriangle,
  ExternalLink,
  Loader2,
  Database,
  Search,
  Users,
  UserPlus,
  LayoutGrid, // Pivot Icon
  List as ListIcon, // List Icon
  Settings, // Settings Icon for Column Selector
  Eye, // Eye icon for column
  FileSpreadsheet, // Excel Icon
  Download, // Download Icon
  XCircle, // Error Icon
  CheckCircle, // Success Icon
  Trash2, // Delete Icon
  ArrowLeft,
  GraduationCap,
  Calendar,
  ThumbsUp,
  ThumbsDown,
  BarChart2,
  ChevronRight,
  ShieldCheck, // Added
  Ban
} from 'lucide-react';
import { read, utils, write } from 'xlsx';

const SALES_REPS = [
  { id: 'u2', name: 'Sarah Miller', team: 'Team Äá»©c', avatar: 'SM', color: 'bg-purple-100 text-purple-700' },
  { id: 'u3', name: 'David Clark', team: 'Team Trung', avatar: 'DC', color: 'bg-blue-100 text-blue-700' },
  { id: 'u4', name: 'Alex Rivera', team: 'Team Du há»c', avatar: 'AR', color: 'bg-green-100 text-green-700' },
];

const buildEmptyAssignmentRatios = () =>
  SALES_REPS.reduce<Record<string, string>>((acc, rep) => {
    acc[rep.id] = '';
    return acc;
  }, {});

const parseAssignmentRatio = (value: string) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : 0;
};

const buildLeadCountByRatio = (leadCount: number, ratios: Record<string, number>) => {
  const counts = SALES_REPS.reduce<Record<string, number>>((acc, rep) => {
    acc[rep.id] = 0;
    return acc;
  }, {});

  const activeAllocations = SALES_REPS
    .map((rep, index) => ({
      repId: rep.id,
      ratio: ratios[rep.id] || 0,
      index,
    }))
    .filter((item) => item.ratio > 0);

  const totalRatio = activeAllocations.reduce((sum, item) => sum + item.ratio, 0);
  if (leadCount <= 0 || totalRatio !== 100 || activeAllocations.length === 0) {
    return counts;
  }

  const allocations = activeAllocations.map((item) => {
    const exactCount = (leadCount * item.ratio) / 100;
    const baseCount = Math.floor(exactCount);
    return {
      ...item,
      baseCount,
      remainder: exactCount - baseCount,
    };
  });

  let remaining = leadCount - allocations.reduce((sum, item) => sum + item.baseCount, 0);
  allocations
    .sort((left, right) => {
      if (right.remainder !== left.remainder) return right.remainder - left.remainder;
      return left.index - right.index;
    })
    .forEach((item) => {
      counts[item.repId] = item.baseCount + (remaining > 0 ? 1 : 0);
      if (remaining > 0) remaining -= 1;
    });

  return counts;
};

const Leads: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // State: Load from LocalStorage
  const [activeTab, setActiveTab] = useState<'all' | 'new' | 'closed' | 'sla_risk'>('all');
  useEffect(() => {
    if (activeTab === 'sla_risk') {
      setActiveTab('all');
    }
  }, [activeTab]);
  const [viewMode, setViewMode] = useState<'list' | 'pivot'>('list'); // View Mode State
  const [leads, setLeads] = useState<ILead[]>([]);
  const [searchFilters, setSearchFilters] = useState<SearchFilter[]>([]);

  // Drawer State
  const [selectedLead, setSelectedLead] = useState<ILead | null>(null);

  // Selection & Assignment State
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignmentRatios, setAssignmentRatios] = useState<Record<string, string>>(() => buildEmptyAssignmentRatios());

  // Tab state for Create Modal (Odoo Style)
  const [createModalActiveTab, setCreateModalActiveTab] = useState<LeadCreateModalTab>('notes');

  const STANDARD_LEAD_STATUS = LEAD_STATUS_KEYS;

  const CLOSED_LEAD_STATUSES = CLOSED_LEAD_STATUS_KEYS;
  const CUSTOM_CLOSE_REASON = 'Lý do khác';
  const STANDARD_LEAD_STATUS_OPTIONS = LEAD_STATUS_OPTIONS;
  const normalizeLeadStatus = normalizeLeadStatusKey;
  const isClosedLeadStatus = isClosedLeadStatusKey;

  const resolveCloseReason = (reason: string, customReason?: string) =>
    reason === CUSTOM_CLOSE_REASON ? customReason?.trim() || '' : reason;

  const validateCloseReason = (status: string, reason: string, customReason?: string) => {
    if (!isClosedLeadStatus(status)) return null;
    if (!reason) return 'Vui lòng chọn lý do.';
    if (reason === CUSTOM_CLOSE_REASON && !customReason?.trim()) {
      return 'Vui lòng nhập lý do cụ thể.';
    }
    return null;
  };

  const getCloseReasonOptions = (status?: string) =>
    getClosedLeadReasons(normalizeLeadStatus(status));

  const getCloseReasonFormState = (status?: string, reason?: string) => {
    const normalizedReason = String(reason || '').trim();
    if (!normalizedReason) {
      return { lossReason: '', lossReasonCustom: '' };
    }

    const reasonOptions = getCloseReasonOptions(status);
    if (reasonOptions.includes(normalizedReason)) {
      return { lossReason: normalizedReason, lossReasonCustom: '' };
    }

    return { lossReason: CUSTOM_CLOSE_REASON, lossReasonCustom: normalizedReason };
  };

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

  const LEAD_LIST_TABS = ['all', 'new', 'closed'] as const;
  const CLOSED_STATUS_OPTIONS = STANDARD_LEAD_STATUS_OPTIONS.filter((option) => isClosedLeadStatus(option.value));

  const getLeadListTabLabel = (tab: typeof LEAD_LIST_TABS[number]) => {
    switch (tab) {
      case 'new':
        return 'Lead Mới';
      case 'closed':
        return 'Lead đã đóng';
      default:
        return 'Tất cả';
    }
  };

  const assignmentRatioValues = useMemo(
    () =>
      SALES_REPS.reduce<Record<string, number>>((acc, rep) => {
        acc[rep.id] = parseAssignmentRatio(assignmentRatios[rep.id] || '');
        return acc;
      }, {}),
    [assignmentRatios]
  );

  const assignmentRatioTotal = useMemo(
    () => SALES_REPS.reduce((sum, rep) => sum + (assignmentRatioValues[rep.id] || 0), 0),
    [assignmentRatioValues]
  );

  const assignmentLeadCounts = useMemo(
    () => buildLeadCountByRatio(selectedLeadIds.length, assignmentRatioValues),
    [assignmentRatioValues, selectedLeadIds.length]
  );

  const resetAssignModal = () => {
    setAssignmentRatios(buildEmptyAssignmentRatios());
  };

  const closeAssignModal = () => {
    setShowAssignModal(false);
    resetAssignModal();
  };

  const updateAssignmentRatio = (repId: string, value: string) => {
    if (value === '') {
      setAssignmentRatios((prev) => ({ ...prev, [repId]: '' }));
      return;
    }

    const normalizedValue = String(parseAssignmentRatio(value));
    setAssignmentRatios((prev) => ({ ...prev, [repId]: normalizedValue }));
  };

  const fillAssignmentRatiosEvenly = () => {
    const activeRepIds = SALES_REPS
      .filter((rep) => assignmentRatioValues[rep.id] > 0)
      .map((rep) => rep.id);
    const targetRepIds = activeRepIds.length > 0 ? activeRepIds : SALES_REPS.map((rep) => rep.id);
    const baseRatio = Math.floor(100 / targetRepIds.length);
    let remaining = 100 - (baseRatio * targetRepIds.length);

    setAssignmentRatios(
      SALES_REPS.reduce<Record<string, string>>((acc, rep) => {
        if (!targetRepIds.includes(rep.id)) {
          acc[rep.id] = '';
          return acc;
        }

        const nextRatio = baseRatio + (remaining > 0 ? 1 : 0);
        acc[rep.id] = String(nextRatio);
        if (remaining > 0) remaining -= 1;
        return acc;
      }, {})
    );
  };

  const setSingleRepAssignment = (repId: string) => {
    setAssignmentRatios(
      SALES_REPS.reduce<Record<string, string>>((acc, rep) => {
        acc[rep.id] = rep.id === repId ? '100' : '';
        return acc;
      }, {})
    );
  };

  // Loss Modal State
  const [showLossModal, setShowLossModal] = useState(false);
  const [lossModalLeadIds, setLossModalLeadIds] = useState<string[]>([]);
  const [lossStatus, setLossStatus] = useState<string>(STANDARD_LEAD_STATUS.LOST);
  const [lossReason, setLossReason] = useState('');
  const [customLossReason, setCustomLossReason] = useState('');



  // Load data
  useEffect(() => {
    const rawLeads = getLeads();
    const normalizedLeads = rawLeads.map((lead) => ({
      ...lead,
      status: normalizeLeadStatus(lead.status as string) as any
    }));
    setLeads(normalizedLeads);
    const hasNormalizedDiff = rawLeads.some((lead, idx) => lead.status !== normalizedLeads[idx].status);
    if (hasNormalizedDiff) {
      saveLeads(normalizedLeads);
    }
    setAvailableTags(getTags());
  }, []);

  useEffect(() => {
    const syncTags = () => setAvailableTags(getTags());
    window.addEventListener('educrm:tags-changed', syncTags as EventListener);
    return () => window.removeEventListener('educrm:tags-changed', syncTags as EventListener);
  }, []);

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLeadData, setNewLeadData] = useState<LeadCreateFormData>(() => createLeadInitialState()); /*
    name: '', phone: '', email: '', source: 'hotline', program: 'Tiáº¿ng Äá»©c', notes: '',
    title: '', company: '', province: '', city: '', ward: '', street: '', salesperson: '', campaign: '', tags: [] as string[], referredBy: '',
    product: '', market: '', channel: '', status: STANDARD_LEAD_STATUS.NEW
  }); */
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [isAddingEditTag, setIsAddingEditTag] = useState(false);
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
    setEditLeadData((prev) => ({ ...prev, tags: prev.tags.filter((item) => item !== tag) }));
  };
  const addTagToNewLead = (tag: string) => {
    setNewLeadData((prev) => (
      prev.tags.includes(tag)
        ? prev
        : { ...prev, tags: [...prev.tags, tag] }
    ));
  };
  const addTagToEditLead = (tag: string) => {
    setEditLeadData((prev) => (
      prev.tags.includes(tag)
        ? prev
        : { ...prev, tags: [...prev.tags, tag] }
    ));
  };

  // --- DUPLICATE CHECK STATE ---
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [selectedDuplicateGroup, setSelectedDuplicateGroup] = useState<any | null>(null);

  const duplicateGroups = useMemo(() => {
    const groups: { [key: string]: ILead[] } = {};
    leads.forEach(lead => {
      const phone = (lead.phone || '').replace(/[\s\.\-]/g, '');
      if (phone && phone.length >= 9) {
        if (!groups[phone]) groups[phone] = [];
        groups[phone].push(lead);
      }
    });
    return Object.entries(groups)
      .filter(([_, group]) => group.length > 1)
      .map(([phone, group]) => ({ phone, leads: group }));
  }, [leads]);
  const [activeModalTab, setActiveModalTab] = useState<'notes' | 'extra'>('notes');


  // Edit Lead Modal State
  const [editLeadData, setEditLeadData] = useState<LeadCreateFormData>(() => createLeadInitialState());
  const [editModalActiveTab, setEditModalActiveTab] = useState<LeadCreateModalTab>('notes');
  const patchEditLeadData = (patch: Partial<LeadCreateFormData>) => {
    setEditLeadData((prev) => ({ ...prev, ...patch }));
  };
  const editCloseReasonOptions = useMemo(() => getCloseReasonOptions(editLeadData.status), [editLeadData.status]);
  const newCloseReasonOptions = useMemo(() => getCloseReasonOptions(newLeadData.status), [newLeadData.status]);
  const bulkCloseReasonOptions = useMemo(() => getCloseReasonOptions(lossStatus), [lossStatus]);

  // Sync selected lead to edit form
  useEffect(() => {
    if (selectedLead) {
      const studentInfo = selectedLead.studentInfo || {};
      setEditLeadData({
        ...createLeadInitialState(selectedLead.ownerId || ''),
        name: selectedLead.name,
        phone: selectedLead.phone,
        email: selectedLead.email || '',
        source: selectedLead.source || 'hotline',
        program: selectedLead.program || 'Tiáº¿ng Äá»©c',
        notes: selectedLead.notes || '',
        title: (selectedLead as any).title || '',
        company: selectedLead.company || selectedLead.marketingData?.region || '',
        province: (selectedLead as any).province || selectedLead.city || '',
        city: (selectedLead as any).city || selectedLead.district || '',
        ward: (selectedLead as any).ward || selectedLead.ward || '',
        street: (selectedLead as any).street || selectedLead.address || '',
        salesperson: selectedLead.ownerId || '',
        campaign: selectedLead.marketingData?.campaign || (selectedLead as any).campaign || '',
        tags: Array.isArray(selectedLead.marketingData?.tags) ? selectedLead.marketingData.tags : (typeof selectedLead.marketingData?.tags === 'string' ? (selectedLead.marketingData.tags as string).split(',').map(t => t.trim()).filter(Boolean) : []),
        referredBy: (selectedLead as any).referredBy || '',
        product: selectedLead.product || selectedLead.program || '',
        market: selectedLead.marketingData?.market || '',
        channel: selectedLead.marketingData?.channel || selectedLead.marketingData?.medium || '',
        status: normalizeLeadStatus(selectedLead.status as string),
        ...getCloseReasonFormState(selectedLead.status as string, selectedLead.lostReason),
        targetCountry: selectedLead.targetCountry || studentInfo.targetCountry || '',
        studentName: studentInfo.studentName || '',
        studentDob: studentInfo.dob || selectedLead.dob || '',
        studentIdentityCard: studentInfo.identityCard || (selectedLead as any).identityCard || '',
        studentPhone: studentInfo.studentPhone || '',
        studentSchool: studentInfo.school || '',
        studentEducationLevel: studentInfo.educationLevel || selectedLead.educationLevel || ''
      });
    }
  }, [selectedLead]);
  useEffect(() => {
    if (location.state && (location.state as any).activeTab) {
      setActiveTab((location.state as any).activeTab);
    }
  }, [location]);

  // Column Visibility State
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [expandedFilter, setExpandedFilter] = useState<string | null>(null);

  const toggleFilter = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedFilter(prev => prev === id ? null : id);
  };

  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'opportunity',
    'contact',
    'company',
    'email',
    'phone',
    'salesperson',
    'source',
    'tags',
    'product',
    'status'
  ]);

  const ALL_COLUMNS = [
    { id: 'opportunity', label: 'CÆ¡ há»™i' },
    { id: 'company', label: 'CÆ¡ sá»Ÿ / CÃ´ng ty' },
    { id: 'contact', label: 'TÃªn liÃªn há»‡' },
    { id: 'createdAt', label: 'NgÃ y Ä‘á»• lead' },
    { id: 'title', label: 'Danh xÆ°ng' },
    { id: 'email', label: 'Email' },
    { id: 'phone', label: 'SÄT' },
    { id: 'address', label: 'Äá»‹a chá»‰' },
    { id: 'salesperson', label: 'NhÃ¢n viÃªn Sale' },
    { id: 'campaign', label: 'Chiáº¿n dá»‹ch' },
    { id: 'source', label: 'Nguá»“n kÃªnh' },
    { id: 'tags', label: 'Tags' },
    { id: 'referredBy', label: 'NgÆ°á»i giá»›i thiá»‡u' },
    { id: 'market', label: 'THá»Š TRÆ¯á»œNG' },
    { id: 'product', label: 'Sáº¢N PHáº¨M QUAN TÃ‚M' },
    { id: 'notes', label: 'Ghi chÃº' },
    { id: 'nextActivity', label: 'Hoáº¡t Ä‘á»™ng tiáº¿p theo' },
    { id: 'deadline', label: 'Háº¡n chÃ³t' },
    { id: 'value', label: 'Doanh thu' },
    { id: 'status', label: 'Tráº¡ng thÃ¡i' },
    { id: 'sla', label: 'Cáº£nh bÃ¡o SLA' },
  ];

  const [selectedAdvancedFilterFields, setSelectedAdvancedFilterFields] = useState<string[]>([]);
  const [selectedAdvancedGroupFields, setSelectedAdvancedGroupFields] = useState<string[]>([]);

  const selectedAdvancedFilterOptions = ALL_COLUMNS.filter((col) => selectedAdvancedFilterFields.includes(col.id));
  const selectedAdvancedGroupOptions = ALL_COLUMNS.filter((col) => selectedAdvancedGroupFields.includes(col.id));
  const ADVANCED_MULTI_FILTER_PREFIX = '__advanced_multi__:';

  const toggleAdvancedFieldSelection = (type: 'filter' | 'group', fieldId: string) => {
    const setter = type === 'filter' ? setSelectedAdvancedFilterFields : setSelectedAdvancedGroupFields;
    setter((prev) => (
      prev.includes(fieldId)
        ? prev.filter((item) => item !== fieldId)
        : [...prev, fieldId]
    ));
  };

  const toggleColumn = (columnId: string) => {
    if (visibleColumns.includes(columnId)) {
      if (visibleColumns.length > 1) { // Prevent hiding all columns
        setVisibleColumns(visibleColumns.filter(c => c !== columnId));
      }
    } else {
      setVisibleColumns([...visibleColumns, columnId]);
    }
  };

  const canViewAll = hasPermission([UserRole.ADMIN, UserRole.FOUNDER, UserRole.MARKETING]);

  // Advanced Filter Logic State
  const [advancedFilters, setAdvancedFilters] = useState<{
    myPipeline: boolean;
    unassigned: boolean;
    openOps: boolean;
    createdDate: { type: 'month' | 'quarter' | 'year'; value: number } | null;
    closedDate: { type: 'month' | 'quarter' | 'year'; value: number } | null;
    status: string[];
  }>({
    myPipeline: false,
    unassigned: false,
    openOps: false, // "Má»Ÿ cÆ¡ há»™i"
    createdDate: null,
    closedDate: null,
    status: []
  });

  // --- TIME RANGE FILTER STATE ---
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timeFilterField, setTimeFilterField] = useState<'createdAt' | 'deadline' | 'lastInteraction'>('createdAt');
  const [timeRangeType, setTimeRangeType] = useState<string>('all');
  const [customRange, setCustomRange] = useState<{ start: string; end: string } | null>(null);

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

  const fieldLabels = {
    createdAt: 'NgÃ y táº¡o',
    deadline: 'Háº¡n chÃ³t',
    lastInteraction: 'TÆ°Æ¡ng tÃ¡c cuá»‘i'
  };

  const handleUpdateSelectedLead = () => {
    if (!selectedLead) return;

    const closeReasonError = validateCloseReason(editLeadData.status, editLeadData.lossReason, editLeadData.lossReasonCustom);
    if (closeReasonError) {
      alert(closeReasonError);
      return;
    }

    const guardianRelation = getLeadGuardianRelation(editLeadData.title);
    const studentInfo = buildLeadStudentInfo(editLeadData);
    const campus = resolveLeadCampus(editLeadData);
    const resolvedCloseReason = resolveCloseReason(editLeadData.lossReason, editLeadData.lossReasonCustom);
    const normalizedProgram =
      editLeadData.product &&
      ['Ti?ng ??c', 'Ti?ng Trung', 'Du h?c ??c', 'Du h?c Trung', 'Du h?c ngh? ?c'].includes(editLeadData.product)
        ? editLeadData.product as ILead['program']
        : editLeadData.program as ILead['program'];

    const updatedLead: ILead = {
      ...selectedLead,
      name: editLeadData.name,
      phone: editLeadData.phone,
      email: editLeadData.email,
      source: editLeadData.source,
      program: normalizedProgram,
      notes: editLeadData.notes,
      company: campus,
      ownerId: editLeadData.salesperson,
      targetCountry: editLeadData.targetCountry || selectedLead.targetCountry,
      educationLevel: editLeadData.studentEducationLevel || undefined,
      dob: editLeadData.studentDob || undefined,
      identityCard: editLeadData.studentIdentityCard || undefined,
      address: editLeadData.street.trim() || undefined,
      city: editLeadData.province.trim() || undefined,
      district: editLeadData.city.trim() || undefined,
      ward: editLeadData.ward.trim() || undefined,
      guardianName: guardianRelation ? editLeadData.name.trim() || undefined : undefined,
      guardianPhone: guardianRelation ? editLeadData.phone.trim() || undefined : undefined,
      lostReason: isClosedLeadStatus(editLeadData.status) ? resolvedCloseReason : undefined,
      studentInfo,
      status: toLeadStatusValue(editLeadData.status as string) as any,
      marketingData: {
        ...selectedLead.marketingData,
        campaign: editLeadData.campaign,
        tags: editLeadData.tags,
        market: editLeadData.market,
        channel: editLeadData.channel,
        medium: editLeadData.channel,
        region: campus || undefined
      }
    };

    (updatedLead as any).title = editLeadData.title;
    (updatedLead as any).street = editLeadData.street;
    (updatedLead as any).province = editLeadData.province;
    (updatedLead as any).city = editLeadData.city;
    (updatedLead as any).ward = editLeadData.ward;
    (updatedLead as any).referredBy = editLeadData.referredBy;

    const changedFields = [
      selectedLead.name !== updatedLead.name ? buildLeadAuditChange('name', selectedLead.name, updatedLead.name, 'Tên lead') : null,
      selectedLead.phone !== updatedLead.phone ? buildLeadAuditChange('phone', selectedLead.phone, updatedLead.phone, 'Số điện thoại') : null,
      selectedLead.status !== updatedLead.status ? buildLeadAuditChange('status', selectedLead.status, updatedLead.status, 'Trạng thái') : null,
      selectedLead.ownerId !== updatedLead.ownerId ? buildLeadAuditChange('ownerId', selectedLead.ownerId, updatedLead.ownerId, 'Sale phụ trách') : null,
      JSON.stringify(selectedLead.marketingData?.tags || []) !== JSON.stringify(updatedLead.marketingData?.tags || [])
        ? buildLeadAuditChange('marketingData.tags', selectedLead.marketingData?.tags || [], updatedLead.marketingData?.tags || [], 'Tags')
        : null
    ].filter(Boolean);

    const updatedLeadWithLogs = changedFields.length > 0
      ? appendLeadLogs(updatedLead, {
        activities: [
          ...(selectedLead.status !== updatedLead.status
            ? [buildLeadActivityLog({
              type: 'system',
              title: 'Đổi trạng thái',
              description: `Trạng thái: ${getLeadStatusLabel(String(selectedLead.status || ''))} → ${getLeadStatusLabel(String(updatedLead.status || ''))}`,
              user: user?.name || 'Admin'
            })]
            : []),
          ...(selectedLead.ownerId !== updatedLead.ownerId
            ? [buildLeadActivityLog({
              type: 'system',
              title: selectedLead.ownerId ? 'Chia lại Lead' : 'Phân bổ Lead',
              description: selectedLead.ownerId
                ? `Lead được chia lại từ ${SALES_REPS.find((rep) => rep.id === selectedLead.ownerId)?.name || selectedLead.ownerId} sang ${SALES_REPS.find((rep) => rep.id === updatedLead.ownerId)?.name || updatedLead.ownerId}.`
                : `Lead được giao cho ${SALES_REPS.find((rep) => rep.id === updatedLead.ownerId)?.name || updatedLead.ownerId}.`,
              user: user?.name || 'Admin'
            })]
            : [])
        ],
        audits: [
          buildLeadAuditLog({
            action: 'lead_updated',
            actor: user?.name || 'Admin',
            actorType: 'user',
            changes: changedFields as any[]
          })
        ]
      })
      : updatedLead;

    const updatedLeads = leads.map(l => l.id === selectedLead.id ? updatedLeadWithLogs : l);
    setLeads(updatedLeads);
    saveLeads(updatedLeads);
    setSelectedLead(null);
  };

  // CRM FIELDS DEFINITION & TEMPLATE HEADERS
  // CRM FIELDS DEFINITION & TEMPLATE HEADERS
  // Removed Data Evaluation State from here as it moved to Campaign Details

  const DATA_EVALUATIONS = [
    {
      id: 'd1', name: 'Data_THPT_NguyenDu_K12', source: 'Há»£p tÃ¡c TrÆ°á»ng THPT', code: '#D-2410-01', date: '24/10/2023', importer: 'Admin',
      total: 500, match: '96.0%', valid: 480, interested: '30.0%', interestedCount: 150, enrolled: '30.0%', enrolledCount: 45,
      eval: 'good', evalText: 'Æ¯U TIÃŠN NHáº¬P', note: 'Tá»· lá»‡ nháº­p há»c cao'
    },
    {
      id: 'd2', name: 'Mua_Data_Ngoai_T10', source: 'Mua ngoÃ i (Agency A)', code: '#D-2010-02', date: '20/10/2023', importer: 'Marketing Lead',
      total: 1000, match: '35.0%', valid: 350, interested: '2.0%', interestedCount: 20, enrolled: '10.0%', enrolledCount: 2,
      eval: 'bad', evalText: 'Dá»ªNG Há»¢P TÃC', note: 'SÄT áº£o quÃ¡ nhiá»u'
    },
    {
      id: 'd3', name: 'Hoi_Thao_Du_Hoc_Duc_HaNoi', source: 'Sá»± kiá»‡n Offline', code: '#D-1510-01', date: '15/10/2023', importer: 'Sales Leader',
      total: 200, match: '99.0%', valid: 198, interested: '60.0%', interestedCount: 120, enrolled: '50.0%', enrolledCount: 60,
      eval: 'good', evalText: 'Æ¯U TIÃŠN NHáº¬P', note: 'Tá»· lá»‡ nháº­p há»c cao'
    },
    {
      id: 'd4', name: 'Import_Excel_Cu_2022', source: 'Há»‡ thá»‘ng cÅ©', code: '#D-0110-03', date: '01/10/2023', importer: 'Admin',
      total: 1500, match: '93.3%', valid: 1400, interested: '3.3%', interestedCount: 50, enrolled: '10.0%', enrolledCount: 5,
      eval: 'warning', evalText: 'CÃ‚N NHáº®C Láº I', note: 'Ãt nhu cáº§u há»c'
    }
  ];

  const CRM_FIELDS = [
    { id: 'name', label: 'TÃªn Lead', excelHeader: 'Há» vÃ  tÃªn', required: true },
    { id: 'phone', label: 'SÄT', excelHeader: 'Sá»‘ Ä‘iá»‡n thoáº¡i', required: true }, // Format: 10 digits, start with 0
    { id: 'email', label: 'Email', excelHeader: 'Email', required: false },      // Format: contains @
    { id: 'targetCountry', label: 'Quá»‘c gia má»¥c tiÃªu', excelHeader: 'Quá»‘c gia má»¥c tiÃªu', required: true },
    { id: 'company', label: 'CÆ¡ sá»Ÿ', excelHeader: 'CÆ¡ sá»Ÿ', required: false },
    { id: 'source', label: 'Nguá»“n', excelHeader: 'Nguá»“n', required: false },
    { id: 'campaign', label: 'Chiáº¿n dá»‹ch', excelHeader: 'Chiáº¿n dá»‹ch', required: false },
    { id: 'notes', label: 'Ghi chÃº', excelHeader: 'Ghi chÃº', required: false },
    { id: 'program', label: 'ChÆ°Æ¡ng trÃ¬nh', excelHeader: 'ChÆ°Æ¡ng trÃ¬nh', required: false },
  ];

  // IMPORT MODAL STATE
  const [showImportModal, setShowImportModal] = useState(false);
  const [importStep, setImportStep] = useState<1 | 2 | 3>(1);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [rawImportData, setRawImportData] = useState<any[]>([]); // Raw rows from Excel
  const [validImportRows, setValidImportRows] = useState<any[]>([]); // Only valid rows ready to import
  const [importErrors, setImportErrors] = useState<{ row: number; name: string; errors: string[] }[]>([]); // Detailed errors

  const [importBatchName, setImportBatchName] = useState('');
  const [importTags, setImportTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const importFileInputRef = useRef<HTMLInputElement | null>(null);

  const openImportFilePicker = () => {
    importFileInputRef.current?.click();
  };

  // Handle File Select
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImportFile(file);

    // Parse File
    const reader = new FileReader();
    reader.onload = (evt) => {
      const arrayBuffer = evt.target?.result;
      const wb = read(arrayBuffer, { type: 'array' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];

      // Get JSON with header mapping directly
      const jsonData = utils.sheet_to_json(ws); // Array of Objects

      setRawImportData(jsonData);
      validateData(jsonData);

      setImportBatchName(`IMPORT_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}_BATCH_1`);
    };
    reader.readAsArrayBuffer(file);
  };

  // VALIDATION & PROCESSING LOGIC
  const validateData = (data: any[]) => {
    const validRows: any[] = [];
    const errorList: { row: number; name: string; errors: string[] }[] = [];

    data.forEach((row, index) => {
      const rowErrors: string[] = [];
      const rowNumber = index + 2; // +1 header, +1 for 0-index

      // 1. Check Required Headers & Values
      CRM_FIELDS.forEach(field => {
        // Access by excelHeader strictly
        const val = row[field.excelHeader];

        if (field.required) {
          if (val === undefined || val === null || String(val).trim() === '') {
            rowErrors.push(`Thiáº¿u ${field.label}`);
          }
        }

        // 2. Specific Format Checks (if value exists)
        if (val) {
          const strVal = String(val).trim();

          // Email check
          if (field.id === 'email') {
            if (!strVal.includes('@')) {
              rowErrors.push(`Email khÃ´ng há»£p lá»‡ (thiáº¿u @)`);
            }
          }

          // Phone check
          if (field.id === 'phone') {
            const cleanPhone = strVal.replace(/[\s\.\-]/g, '');
            // Starts with 0, 10 digits
            if (!/^0\d{9}$/.test(cleanPhone)) {
              rowErrors.push(`SÄT sai Ä‘á»‹nh dáº¡ng (pháº£i 10 sá»‘, báº¯t Ä‘áº§u báº±ng 0)`);
            }
          }
        }
      });

      if (rowErrors.length > 0) {
        errorList.push({
          row: rowNumber,
          name: row['Há» vÃ  tÃªn'] || 'N/A',
          errors: rowErrors
        });
      } else {
        // Normalize Data for CRM Import
        validRows.push({
          name: row['Há» vÃ  tÃªn'],
          phone: String(row['Sá»‘ Ä‘iá»‡n thoáº¡i']).replace(/[\s\.\-]/g, ''),
          email: row['Email'] || '',
          targetCountry: row['Quá»‘c gia má»¥c tiÃªu'],
          company: row['CÆ¡ sá»Ÿ'] || '',
          source: row['Nguá»“n'] || 'Import',
          campaign: row['Chiáº¿n dá»‹ch'] || '',
          notes: row['Ghi chÃº'] || '',
          program: row['ChÆ°Æ¡ng trÃ¬nh'] || 'Tiáº¿ng Äá»©c'
        });
      }
    });

    setValidImportRows(validRows);
    setImportErrors(errorList);
  };

  // Download Template
  const handleDownloadTemplate = () => {
    const ws = utils.json_to_sheet([
      { 'Há» vÃ  tÃªn': 'Nguyá»…n VÄƒn A', 'Sá»‘ Ä‘iá»‡n thoáº¡i': '0901234567', 'Email': 'a@example.com', 'Quá»‘c gia má»¥c tiÃªu': 'Äá»©c', 'CÆ¡ sá»Ÿ': 'Hanoi', 'Nguá»“n': 'Facebook', 'Chiáº¿n dá»‹ch': 'Summer 2024', 'Ghi chÃº': 'Quan tÃ¢m du há»c' }
    ]);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Template");
    const today = new Date().toISOString().slice(0, 10);

    try {
      // Write to XLSX buffer instead of CSV to avoid encoding issues
      const wbout = write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Template_Leads_${today}.xlsx`); // .xlsx extension
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("Download failed", e);
      alert("Lá»—i táº£i xuá»‘ng template");
    }
  };

  // Final Import
  const handleImportSubmit = () => {
    if (validImportRows.length === 0) {
      alert("KhÃ´ng cÃ³ dÃ²ng dá»¯ liá»‡u nÃ o há»£p lá»‡ Ä‘á»ƒ nháº­p!");
      return;
    }

    let assignedLeads: ILead[] = [];
    const now = new Date().toISOString();

    // Normalize data structure first
    assignedLeads = validImportRows.map((row, index) => {
      return {
        id: `l-import-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
        name: row.name,
        phone: row.phone,
        email: row.email,
        company: row.company,
        targetCountry: row.targetCountry,
        source: row.source,
        program: row.program,
        status: STANDARD_LEAD_STATUS.NEW,
        ownerId: '', // Set below
        studentInfo: {
          targetCountry: row.targetCountry
        },
        marketingData: {
          campaign: row.campaign || importBatchName,
          tags: [...importTags, ...(row.tags ? [row.tags] : [])],
          market: '',
          medium: ''
        },
        notes: row.notes || '',
        createdAt: now,
        lastActivityDate: now,
        lastInteraction: now,
        score: 10,
        slaStatus: 'normal'
      } as ILead;
    });

    saveLeads([...leads, ...assignedLeads]);
    setLeads([...leads, ...assignedLeads]); // Optimistic update

    setShowImportModal(false);
    alert(`ÄÃ£ nháº­p thÃ nh cÃ´ng ${assignedLeads.length} lead!`);

    // Reset
    setImportStep(1);
    setImportFile(null);
    setRawImportData([]);
    setValidImportRows([]);
    setImportErrors([]);
    setImportTags([]);
  };


  const toggleAdvancedStatus = (status: string) => {
    setAdvancedFilters(prev => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter(s => s !== status)
        : [...prev.status, status]
    }));
  };

  const setDateFilter = (field: 'createdDate' | 'closedDate', type: 'month' | 'quarter' | 'year', value: number) => {
    setAdvancedFilters(prev => ({ ...prev, [field]: prev[field]?.value === value && prev[field]?.type === type ? null : { type, value } }));
  };

  const buildAdvancedMultiFilterField = (fieldIds: string[]) =>
    `${ADVANCED_MULTI_FILTER_PREFIX}${fieldIds.join('|')}`;

  const parseAdvancedMultiFilterFields = (field: string) =>
    field.startsWith(ADVANCED_MULTI_FILTER_PREFIX)
      ? field.slice(ADVANCED_MULTI_FILTER_PREFIX.length).split('|').filter(Boolean)
      : [];

  const getLeadFilterableValue = (lead: ILead, field: string) => {
    switch (field) {
      case 'opportunity':
      case 'contact':
        return lead.name;
      case 'company':
        return lead.company || '';
      case 'title':
        return (lead as any).title || '';
      case 'email':
        return lead.email || '';
      case 'phone':
        return lead.phone || '';
      case 'address':
        return [(lead as any).street, (lead as any).ward, (lead as any).city].filter(Boolean).join(', ');
      case 'salesperson':
        return SALES_REPS.find((rep) => rep.id === lead.ownerId)?.name || '';
      case 'campaign':
        return (lead as any).campaign || lead.marketingData?.campaign || '';
      case 'source':
        return lead.source || '';
      case 'tags': {
        const tags = Array.isArray(lead.marketingData?.tags)
          ? lead.marketingData?.tags
          : (typeof lead.marketingData?.tags === 'string' ? lead.marketingData.tags.split(',').map(tag => tag.trim()) : []);
        return tags.join(', ');
      }
      case 'referredBy':
        return (lead as any).referredBy || '';
      case 'market':
        return lead.marketingData?.market || '';
      case 'product':
        return (lead as any).product || lead.program || '';
      case 'notes':
        return lead.notes || '';
      case 'nextActivity': {
        const nextActivity = ((lead as any).activities || []).find((activity: any) => activity.type === 'activity');
        return nextActivity?.description || '';
      }
      case 'deadline':
        return (lead as any).expectedClosingDate || '';
      case 'value':
        return lead.value != null ? String(lead.value) : '';
      case 'status':
        return normalizeLeadStatus(lead.status as string);
      case 'sla':
        return lead.slaReason || lead.slaStatus || '';
      default:
        return (lead as any)[field] ?? '';
    }
  };

  const getLeadSearchableText = (lead: ILead) => [
    lead.name,
    lead.phone,
    lead.email,
    lead.source,
    lead.program || '',
    getLeadStatusLabel(lead.status as string),
    normalizeLeadStatus(lead.status as string),
    lead.ownerId || '',
    (lead as any).city || '',
    (lead as any).company || ''
  ].join(' ').toLowerCase();

  const doesLeadMatchFilter = (lead: ILead, field: string, rawValue: string) => {
    const value = rawValue.trim().toLowerCase();
    if (!value) return true;

    if (field === 'search') {
      return getLeadSearchableText(lead).includes(value);
    }

    if (field === 'status') {
      const normalizedStatus = normalizeLeadStatus(lead.status as string).toLowerCase();
      const statusLabel = getLeadStatusLabel(lead.status as string).toLowerCase();
      return normalizedStatus.includes(value) || statusLabel.includes(value);
    }

    const leadValue = String(getLeadFilterableValue(lead, field) || '').toLowerCase();
    if (!leadValue) return false;

    if (field === 'createdAt' || field === 'deadline') {
      const formattedDate = (() => {
        const date = new Date(leadValue);
        return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('vi-VN').toLowerCase();
      })();
      return leadValue.includes(value) || formattedDate.includes(value);
    }

    return leadValue.includes(value);
  };

  // Helper to check date matches
  const isDateMatch = (dateStr: string | undefined, filter: { type: 'month' | 'quarter' | 'year'; value: number } | null) => {
    if (!filter || !dateStr) return true;
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // 1-12

    // Simple current year assumption for month/quarter for this demo, or match strictly if year filter
    const currentYear = new Date().getFullYear();

    if (filter.type === 'year') return year === filter.value;
    if (filter.type === 'month') return month === filter.value && year === currentYear;
    if (filter.type === 'quarter') {
      const q = Math.ceil(month / 3);
      return q === filter.value && year === currentYear;
    }
    return true;
  };

  const filteredLeads = useMemo(() => {
    let result = leads;

    // 1. Permission Based Filtering
    if (!canViewAll) {
      result = result.filter(l => l.ownerId === user?.id);
    } else {
      if (activeTab === 'new') {
        result = result.filter(l => !l.ownerId || l.ownerId === '');
      }
    }

    // 2. Advanced Global Filters
    const { myPipeline, unassigned, openOps, createdDate, closedDate, status } = advancedFilters;

    if (myPipeline && user?.id) {
      result = result.filter(l => l.ownerId === user.id);
    }

    if (unassigned) {
      result = result.filter(l => !l.ownerId || l.ownerId === '');
    }

    if (openOps) {
      result = result.filter(l => {
        const normalizedStatus = normalizeLeadStatus(l.status as string);
        return normalizedStatus !== STANDARD_LEAD_STATUS.CONVERTED && !isClosedLeadStatus(normalizedStatus);
      });
    }

    if (status.length > 0) {
      result = result.filter(l => {
        const normalizedStatus = normalizeLeadStatus(l.status as string);
        return status.includes(l.status as string) || status.includes(normalizedStatus);
      });
    }

    if (createdDate) {
      result = result.filter(l => isDateMatch(l.createdAt, createdDate));
    }
    if (closedDate) {
      // @ts-ignore
      result = result.filter(l => isDateMatch(l.closedAt || l.updatedAt, closedDate));
    }

    // --- TIME RANGE FILTER LOGIC ---
    if (timeRangeType !== 'all') {
      const isTimeRangeMatch = (dateStr: string | undefined, type: string, range: { start: string; end: string } | null) => {
        if (!dateStr) return false;
        const date = new Date(dateStr);
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

        switch (type) {
          case 'today': return date >= startOfToday && date <= endOfToday;
          case 'yesterday': {
            const yesterday = new Date(startOfToday);
            yesterday.setDate(yesterday.getDate() - 1);
            const endOfYesterday = new Date(yesterday);
            endOfYesterday.setHours(23, 59, 59);
            return date >= yesterday && date <= endOfYesterday;
          }
          case 'thisWeek': {
            const startOfWeek = new Date(startOfToday);
            startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
            return date >= startOfWeek;
          }
          case 'last7Days': {
            const last7 = new Date(startOfToday);
            last7.setDate(last7.getDate() - 7);
            return date >= last7;
          }
          case 'last30Days': {
            const last30 = new Date(startOfToday);
            last30.setDate(last30.getDate() - 30);
            return date >= last30;
          }
          case 'thisMonth': {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            return date >= startOfMonth;
          }
          case 'lastMonth': {
            const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
            return date >= startOfLastMonth && date <= endOfLastMonth;
          }
          case 'custom': {
            if (!range) return true;
            const start = new Date(range.start);
            const end = new Date(range.end);
            end.setHours(23, 59, 59);
            return date >= start && date <= end;
          }
          default: return true;
        }
      };
      result = result.filter(l => isTimeRangeMatch((l as any)[timeFilterField], timeRangeType, customRange));
    }

    // 3. Search Filters
    if (searchFilters.length > 0) {
      result = result.filter(lead => {
        return searchFilters.every(filter => {
          const groupedFields = parseAdvancedMultiFilterFields(filter.field);
          if (groupedFields.length > 0) {
            return groupedFields.some((fieldId) => doesLeadMatchFilter(lead, fieldId, filter.value));
          }
          return doesLeadMatchFilter(lead, filter.field, filter.value);
        });
      });
    }

    // 4. Tab Specific Status Filtering
    switch (activeTab) {
      case 'new':
        return result.filter(l => normalizeLeadStatus(l.status as string) === STANDARD_LEAD_STATUS.NEW || !l.status);
      case 'closed':
        return result.filter(l => isClosedLeadStatus(l.status as string));
      case 'sla_risk':
        return result.filter(l => l.slaStatus === 'danger');
      default:
        return result;
    }
  }, [leads, activeTab, searchFilters, canViewAll, user, advancedFilters, timeRangeType, timeFilterField, customRange]);

  // --- STATS CALCULATION ---
  const stats = useMemo(() => {
    const total = leads.length;
    const assigned = leads.filter((lead) => Boolean(lead.ownerId)).length;
    const unassigned = total - assigned;
    const slaRisk = leads.filter((lead) => lead.slaStatus === 'danger').length;
    const verified = leads.filter((lead) => Boolean((lead as any).verified || (lead as any).isVerified)).length;
    const processing = leads.filter((lead) => {
      if (!lead.ownerId) return false;
      const normalizedStatus = normalizeLeadStatus(lead.status as string);
      return ![
        STANDARD_LEAD_STATUS.NEW,
        STANDARD_LEAD_STATUS.ASSIGNED,
        STANDARD_LEAD_STATUS.CONVERTED,
        ...CLOSED_LEAD_STATUSES
      ].includes(normalizedStatus as typeof STANDARD_LEAD_STATUS[keyof typeof STANDARD_LEAD_STATUS]);
    }).length;
    const newLeads = leads.filter((lead) => !lead.ownerId).length;
    const verificationRate = total > 0 ? (verified / total) * 100 : 0;

    return { total, assigned, unassigned, processing, newLeads, slaRisk, verificationRate };
  }, [leads]);

  // --- FILTER HELPERS ---

  const addFilter = (field: string, label: string, value: string, color?: string) => {
    // Check if filter already exists
    const exists = searchFilters.some(f => f.field === field && f.value.toLowerCase() === value.toLowerCase());
    if (!exists && value) {
      setSearchFilters((prev) => [...prev, { field, label, value, color }]);
    }
  };

  const handleClickableField = (e: React.MouseEvent, field: string, label: string, value: string, color?: string) => {
    e.stopPropagation(); // Prevent opening drawer
    addFilter(field, label, value, color);
  };

  const getAdvancedDateLabel = (filter: { type: 'month' | 'quarter' | 'year'; value: number } | null) => {
    if (!filter) return '';
    if (filter.type === 'month') return `Thang ${filter.value}`;
    if (filter.type === 'quarter') return `Quy ${filter.value}`;
    return `Nam ${filter.value}`;
  };

  const toolbarFilterChips = useMemo(() => {
    const chips: Array<SearchFilter & {
      origin: 'search' | 'synthetic';
      originalIndex?: number;
      syntheticKey?: string;
    }> = searchFilters.map((filter, index) => ({
      ...filter,
      origin: 'search',
      originalIndex: index
    }));

    if (advancedFilters.myPipeline) {
      chips.push({
        field: 'my_pipeline',
        label: 'Bo loc',
        value: 'Lead cua toi',
        origin: 'synthetic',
        syntheticKey: 'myPipeline'
      });
    }

    if (advancedFilters.unassigned) {
      chips.push({
        field: 'unassigned',
        label: 'Bo loc',
        value: 'Chua phan cong',
        origin: 'synthetic',
        syntheticKey: 'unassigned'
      });
    }

    if (advancedFilters.openOps) {
      chips.push({
        field: 'open_ops',
        label: 'Bo loc',
        value: 'Mo co hoi',
        origin: 'synthetic',
        syntheticKey: 'openOps'
      });
    }

    advancedFilters.status.forEach((statusValue) => {
      chips.push({
        field: 'status',
        label: 'Trang thai',
        value: statusValue,
        origin: 'synthetic',
        syntheticKey: `status:${statusValue}`
      });
    });

    if (advancedFilters.createdDate) {
      chips.push({
        field: 'created_date',
        label: 'Ngay tao',
        value: getAdvancedDateLabel(advancedFilters.createdDate),
        origin: 'synthetic',
        syntheticKey: 'createdDate'
      });
    }

    if (advancedFilters.closedDate) {
      chips.push({
        field: 'closed_date',
        label: 'Ngay dong',
        value: getAdvancedDateLabel(advancedFilters.closedDate),
        origin: 'synthetic',
        syntheticKey: 'closedDate'
      });
    }

    if (timeFilterField !== 'createdAt' || timeRangeType !== 'all') {
      const presetLabel = timePresets.find((item) => item.id === timeRangeType)?.label || timeRangeType;
      const timeLabel = timeRangeType === 'custom' && customRange?.start && customRange?.end
        ? `${customRange.start} - ${customRange.end}`
        : presetLabel;
      chips.push({
        field: 'time',
        label: 'Moc thoi gian',
        value: `${fieldLabels[timeFilterField]}: ${timeLabel}`,
        origin: 'synthetic',
        syntheticKey: 'time'
      });
    }

    if (selectedAdvancedFilterOptions.length > 0) {
      chips.push({
        field: 'selected_filter',
        label: '',
        value: selectedAdvancedFilterOptions.map((option) => option.label).join(' OR '),
        color: 'bg-emerald-50 text-emerald-700',
        origin: 'synthetic',
        syntheticKey: 'selectedFilter'
      });
    }

    if (selectedAdvancedGroupOptions.length > 0) {
      chips.push({
        field: 'group_by',
        label: '',
        value: selectedAdvancedGroupOptions.map((option) => option.label).join(' > '),
        color: 'bg-blue-50 text-blue-700',
        origin: 'synthetic',
        syntheticKey: 'groupBy'
      });
    }

    return chips;
  }, [searchFilters, advancedFilters, timeFilterField, timeRangeType, customRange, timePresets, fieldLabels, selectedAdvancedFilterOptions, selectedAdvancedGroupOptions]);

  const handleToolbarFilterRemove = (index: number) => {
    const chip = toolbarFilterChips[index];
    if (!chip) return;

    if (chip.origin === 'search' && typeof chip.originalIndex === 'number') {
      setSearchFilters(prev => prev.filter((_, i) => i !== chip.originalIndex));
      return;
    }

    if (chip.syntheticKey === 'myPipeline') {
      setAdvancedFilters(prev => ({ ...prev, myPipeline: false }));
      return;
    }

    if (chip.syntheticKey === 'unassigned') {
      setAdvancedFilters(prev => ({ ...prev, unassigned: false }));
      return;
    }

    if (chip.syntheticKey === 'openOps') {
      setAdvancedFilters(prev => ({ ...prev, openOps: false }));
      return;
    }

    if (chip.syntheticKey === 'createdDate') {
      setAdvancedFilters(prev => ({ ...prev, createdDate: null }));
      return;
    }

    if (chip.syntheticKey === 'closedDate') {
      setAdvancedFilters(prev => ({ ...prev, closedDate: null }));
      return;
    }

    if (chip.syntheticKey === 'time') {
      setTimeFilterField('createdAt');
      setTimeRangeType('all');
      setCustomRange(null);
      setShowTimePicker(false);
      return;
    }

    if (chip.syntheticKey === 'selectedFilter') {
      setSelectedAdvancedFilterFields([]);
      return;
    }

    if (chip.syntheticKey === 'groupBy') {
      setSelectedAdvancedGroupFields([]);
      return;
    }

    if (chip.syntheticKey?.startsWith('status:')) {
      const statusValue = chip.syntheticKey.slice('status:'.length);
      setAdvancedFilters(prev => ({ ...prev, status: prev.status.filter((item) => item !== statusValue) }));
    }
  };

  const handleClearToolbarFilters = () => {
    setSearchFilters([]);
    setSelectedAdvancedFilterFields([]);
    setSelectedAdvancedGroupFields([]);
    setAdvancedFilters({
      myPipeline: false,
      unassigned: false,
      openOps: false,
      createdDate: null,
      closedDate: null,
      status: []
    });
    setTimeFilterField('createdAt');
    setTimeRangeType('all');
    setCustomRange(null);
    setShowTimePicker(false);
  };

  // --- ACTIONS ---

  const handleUpdateLead = (updatedLead: ILead) => {
    const updatedList = leads.map(l => l.id === updatedLead.id ? updatedLead : l);
    setLeads(updatedList);
    saveLeads(updatedList);
    if (selectedLead?.id === updatedLead.id) {
      setSelectedLead(updatedLead);
    }
  };

  const handleConvertLead = (lead: ILead) => {
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
        id: `D-${Date.now()}`,
        leadId: savedContact.id, // Link to the ACTUAL stored Contact ID
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
          // Táº¡o activity scheduled máº·c Ä‘á»‹nh (Next Activity)
          {
            id: `act-${Date.now()}`,
            type: 'call' as any,
            content: 'Gá»i Ä‘iá»‡n tÆ° váº¥n láº§n Ä‘áº§u',
            timestamp: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // +1 ngÃ y
            status: 'scheduled',
            userId: user?.id || 'admin'
          },
          // Copy activities tá»« Lead
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

      // Navigate to Pipeline with highlight
      navigate(`/pipeline?newDeal=${deal.id}`);
    } catch (error) {
      console.error("Convert Error", error);
      alert("CÃ³ lá»—i xáº£y ra khi chuyá»ƒn Ä‘á»•i Lead!");
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedLeadIds(filteredLeads.map(l => l.id));
    } else {
      setSelectedLeadIds([]);
    }
  };

  const handleSelectLeadCheckbox = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Stop row click
    if (selectedLeadIds.includes(id)) {
      setSelectedLeadIds(selectedLeadIds.filter(lid => lid !== id));
    } else {
      setSelectedLeadIds([...selectedLeadIds, id]);
    }
  };


  const handleCreateSubmitLegacy = () => {
    if (!newLeadData.name || !newLeadData.phone) {
      alert("Vui lÃ²ng nháº­p TÃªn vÃ  SÄT");
      return;
    }
    if (!newLeadData.company) {
      alert("Vui lÃ²ng chá»n CÆ¡ sá»Ÿ / Company Base");
      return;
    }


    const newLeadBase: ILead = {
      id: `l-${Date.now()}`,
      ...newLeadData,
      program: newLeadData.program as any,
      ownerId: newLeadData.salesperson,
      marketingData: {
        tags: newLeadData.tags,
        campaign: newLeadData.campaign,
        channel: newLeadData.channel,
        market: newLeadData.market
      },
      status: toLeadStatusValue(newLeadData.status as string) as any,
      createdAt: new Date().toISOString(),
      score: 10,
      lastActivityDate: new Date().toISOString(),
      lastInteraction: new Date().toISOString(),
      slaStatus: 'normal'
    };
    const finalLead = appendLeadLogs(newLeadBase, {
      activities: [
        buildLeadActivityLog({
          type: 'system',
          timestamp: newLeadBase.createdAt,
          title: 'Tạo lead',
          description: `Lead được tạo bởi ${user?.name || 'Admin'}.`,
          user: user?.name || 'System'
        })
      ],
      audits: [
        buildLeadAuditLog({
          action: 'lead_created',
          actor: user?.name || 'Admin',
          actorType: 'user',
          timestamp: newLeadBase.createdAt,
          changes: [
            buildLeadAuditChange('name', '', newLeadBase.name, 'Tên lead'),
            buildLeadAuditChange('phone', '', newLeadBase.phone, 'Số điện thoại'),
            buildLeadAuditChange('ownerId', '', newLeadBase.ownerId, 'Sale phụ trách'),
            buildLeadAuditChange('status', '', newLeadBase.status, 'Trạng thái')
          ]
        })
      ]
    });

    if (saveLead(finalLead)) {
      setLeads([finalLead, ...leads]);
      setShowCreateModal(false);
      setNewLeadData({
        name: '', phone: '', email: '', source: 'hotline', program: 'Tiáº¿ng Äá»©c', notes: '',
        title: '', company: '', province: '', city: '', ward: '', street: '', salesperson: '', campaign: '', tags: [], referredBy: '',
        product: '', market: '', channel: '', status: STANDARD_LEAD_STATUS.NEW
      });
      alert("Táº¡o Lead thÃ nh cÃ´ng!");
    } else {
      alert("CÃ³ lá»—i xáº£y ra khi lÆ°u Lead");
    }
  };

  const handleCreateSubmit = () => {
    if (!newLeadData.name.trim() || !newLeadData.phone.trim()) {
      alert('Vui l?ng nh?p T?n v? S?T');
      return;
    }
    if (!newLeadData.targetCountry) {
      alert('Vui l?ng ch?n Qu?c gia m?c ti?u');
      return;
    }

    const closeReasonError = validateCloseReason(newLeadData.status, newLeadData.lossReason, newLeadData.lossReasonCustom);
    if (closeReasonError) {
      alert(closeReasonError);
      return;
    }

    const nowIso = new Date().toISOString();
    const campus = resolveLeadCampus(newLeadData);
    const guardianRelation = getLeadGuardianRelation(newLeadData.title);
    const studentInfo = buildLeadStudentInfo(newLeadData);
    const resolvedCloseReason = resolveCloseReason(newLeadData.lossReason, newLeadData.lossReasonCustom);
    const program = (
      newLeadData.product &&
      ['Ti?ng ??c', 'Ti?ng Trung', 'Du h?c ??c', 'Du h?c Trung', 'Du h?c ngh? ?c'].includes(newLeadData.product)
    )
      ? newLeadData.product as ILead['program']
      : newLeadData.program as ILead['program'];

    const newLeadBase: ILead = {
      id: `l-${Date.now()}`,
      ...newLeadData,
      program,
      ownerId: newLeadData.salesperson,
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
      guardianPhone: guardianRelation ? newLeadData.phone.trim() || undefined : undefined,
      guardianRelation,
      lostReason: isClosedLeadStatus(newLeadData.status) ? resolvedCloseReason : undefined,
      studentInfo,
      marketingData: {
        tags: newLeadData.tags,
        campaign: newLeadData.campaign,
        channel: newLeadData.channel,
        market: campus || undefined,
        region: newLeadData.company.trim() || undefined,
      },
      status: toLeadStatusValue(newLeadData.status as string) as any,
      createdAt: nowIso,
      score: 10,
      lastActivityDate: nowIso,
      lastInteraction: nowIso,
      slaStatus: 'normal'
    };
    const newLead = appendLeadLogs(newLeadBase, {
      activities: [
        buildLeadActivityLog({
          type: 'system',
          timestamp: nowIso,
          title: 'Tạo lead',
          description: `Lead được tạo bởi ${user?.name || 'Admin'}.`,
          user: user?.name || 'System'
        })
      ],
      audits: [
        buildLeadAuditLog({
          action: 'lead_created',
          actor: user?.name || 'Admin',
          actorType: 'user',
          timestamp: nowIso,
          changes: [
            buildLeadAuditChange('name', '', newLeadBase.name, 'Tên lead'),
            buildLeadAuditChange('phone', '', newLeadBase.phone, 'Số điện thoại'),
            buildLeadAuditChange('ownerId', '', newLeadBase.ownerId, 'Sale phụ trách'),
            buildLeadAuditChange('status', '', newLeadBase.status, 'Trạng thái')
          ]
        })
      ]
    });

    if (saveLead(newLead)) {
      setLeads([newLead, ...leads]);
      setShowCreateModal(false);
      setCreateModalActiveTab('notes');
      setNewLeadData(createLeadInitialState());
      alert('T?o Lead th?nh c?ng!');
    } else {
      alert('C? l?i x?y ra khi l?u Lead');
    }
  };

  const handleAssignSubmit = () => {
    const repsWithLeads = SALES_REPS.filter((rep) => (assignmentLeadCounts[rep.id] || 0) > 0);

    if (repsWithLeads.length === 0) {
      alert("Vui lÃ²ng nháº­p tá»· lá»‡ phÃ¢n bá»• cho Ã­t nháº¥t 1 nhÃ¢n viÃªn Sale");
      return;
    }

    if (assignmentRatioTotal !== 100) {
      alert("Tá»•ng tá»· lá»‡ phÃ¢n bá»• pháº£i báº±ng 100%");
      return;
    }

    const selectedLeadIdSet = new Set(selectedLeadIds);
    const ownerAssignments = repsWithLeads.flatMap((rep) =>
      Array.from({ length: assignmentLeadCounts[rep.id] || 0 }, () => rep.id)
    );
    let assignmentIndex = 0;

    const nowIso = new Date().toISOString();
    const updatedLeads = leads.map((lead) => {
      if (!selectedLeadIdSet.has(lead.id)) return lead;

      const ownerId = ownerAssignments[assignmentIndex] || repsWithLeads[repsWithLeads.length - 1].id;
      assignmentIndex += 1;

      const nextStatus = toLeadStatusValue(STANDARD_LEAD_STATUS.ASSIGNED);
      return appendLeadLogs(
        { ...lead, ownerId, status: nextStatus },
        {
          activities: [
            buildLeadActivityLog({
              type: 'system',
              timestamp: nowIso,
              title: lead.ownerId ? 'Chia lại Lead' : 'Phân bổ Lead',
              description: lead.ownerId
                ? `Lead được chia lại từ ${SALES_REPS.find((rep) => rep.id === lead.ownerId)?.name || lead.ownerId} sang ${SALES_REPS.find((rep) => rep.id === ownerId)?.name || ownerId}.`
                : `Lead được giao cho ${SALES_REPS.find((rep) => rep.id === ownerId)?.name || ownerId}.`,
              user: user?.name || 'Admin'
            })
          ],
          audits: [
            buildLeadAuditLog({
              action: lead.ownerId ? 'lead_reassigned' : 'lead_assigned',
              actor: user?.name || 'Admin',
              actorType: 'user',
              timestamp: nowIso,
              changes: [
                buildLeadAuditChange('ownerId', lead.ownerId, ownerId, 'Sale phụ trách'),
                buildLeadAuditChange('status', lead.status, nextStatus, 'Trạng thái')
              ]
            })
          ]
        }
      );
    });

    saveLeads(updatedLeads);
    setLeads(updatedLeads);
    closeAssignModal();
    setSelectedLeadIds([]);
    alert(`ÄÃ£ phÃ¢n bá»• thÃ nh cÃ´ng ${selectedLeadIds.length} lead!`);
  };

  // --- BULK ACTIONS ---
  const handleBulkDelete = () => {
    if (selectedLeadIds.length === 0) return;
    if (confirm(`Báº¡n cÃ³ cháº¯c muá»‘n xÃ³a ${selectedLeadIds.length} lead Ä‘Ã£ chá»n?`)) {
      const remainingLeads = leads.filter(l => !selectedLeadIds.includes(l.id));
      setLeads(remainingLeads);
      saveLeads(remainingLeads);
      setSelectedLeadIds([]);
    }
  };

  const handleConfirmLoss = () => {
    const closeReasonError = validateCloseReason(lossStatus, lossReason, customLossReason);
    if (closeReasonError) {
      alert(closeReasonError);
      return;
    }

    const finalReason = resolveCloseReason(lossReason, customLossReason);
    const nextStatus = normalizeLeadStatus(lossStatus);

    const nowIso = new Date().toISOString();
    const updatedLeads = leads.map(l =>
      lossModalLeadIds.includes(l.id)
        ? appendLeadLogs({
          ...l,
          status: toLeadStatusValue(nextStatus),
          lostReason: finalReason
        }, {
          activities: [
            buildLeadActivityLog({
              type: 'system',
              timestamp: nowIso,
              description: `Trạng thái: ${getLeadStatusLabel(String(l.status || ''))} → ${getLeadStatusLabel(nextStatus)}. Lý do: ${finalReason}`,
              user: user?.name || 'Admin',
              title: getLeadStatusLabel(nextStatus)
            })
          ],
          audits: [
            buildLeadAuditLog({
              action: 'lead_status_changed',
              actor: user?.name || 'Admin',
              actorType: 'user',
              timestamp: nowIso,
              changes: [
                buildLeadAuditChange('status', l.status, toLeadStatusValue(nextStatus), 'Trạng thái'),
                buildLeadAuditChange('lostReason', l.lostReason, finalReason, 'Lý do thất bại')
              ]
            })
          ]
        })
        : l
    );

    setLeads(updatedLeads);
    saveLeads(updatedLeads);
    setShowLossModal(false);
    setLossModalLeadIds([]);
    setLossStatus(STANDARD_LEAD_STATUS.LOST);
    setLossReason('');
    setCustomLossReason('');
    setSelectedLeadIds([]);
    alert(`?? c?p nh?t tr?ng th?i ??ng cho ${lossModalLeadIds.length} lead!`);
  };

  const handleBulkMarkLost = () => {
    if (selectedLeadIds.length === 0) return;
    setLossModalLeadIds(selectedLeadIds);
    setLossStatus(STANDARD_LEAD_STATUS.LOST);
    setLossReason('');
    setCustomLossReason('');
    setShowLossModal(true);
  };

  const handleBulkExport = () => {
    const leadsToExport = selectedLeadIds.length > 0
      ? leads.filter((lead) => selectedLeadIds.includes(lead.id))
      : filteredLeads;
    const ws = utils.json_to_sheet(leadsToExport.map(l => ({
      'ID': l.id,
      'TÃªn': l.name,
      'SÄT': l.phone,
      'Email': l.email,
      'CÆ¡ sá»Ÿ': l.company,
      'Nguá»“n': l.source,
      'Tráº¡ng thÃ¡i': getLeadStatusLabel(l.status as string)
    })));
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Leads");
    write(wb, { bookType: 'xlsx', type: 'buffer' });
    // Trigger download (simplified)
    alert("TÃ­nh nÄƒng export Ä‘ang Ä‘Æ°á»£c xá»­ lÃ½ (Console log data)");
    console.log(leadsToExport);
  };

  // --- INLINE ACTIONS ---
  const handlePickUpLead = (e: React.MouseEvent, lead: ILead) => {
    e.stopPropagation();
    const updatedLead = { ...lead, ownerId: user?.id, status: toLeadStatusValue(STANDARD_LEAD_STATUS.PICKED) };
    handleUpdateLead(updatedLead);
    alert(`ÄÃ£ tiáº¿p nháº­n lead: ${lead.name}`);
  };

  const handleQuickMarkLost = (e: React.MouseEvent, lead: ILead) => {
    e.stopPropagation();
    setLossModalLeadIds([lead.id]);
    setShowLossModal(true);
  };

  const openCreateLeadModal = () => {
    setCreateModalActiveTab('notes');
    setIsAddingTag(false);
    setNewLeadData(createLeadInitialState());
    setShowCreateModal(true);
  };

  const openQuickAssignModal = () => {
    if (selectedLeadIds.length === 0) {
      alert('Vui lÃ²ng chá»n lead trÆ°á»›c khi phÃ¢n bá»• nhanh');
      return;
    }

    resetAssignModal();
    setShowAssignModal(true);
  };

  const getAllocationStatusMeta = (lead: ILead) => {
    const normalizedStatus = normalizeLeadStatus(lead.status as string);

    if (normalizedStatus === STANDARD_LEAD_STATUS.LOST) {
      return {
        label: 'Mất',
        className: 'border-rose-200 bg-rose-50 text-rose-700'
      };
    }

    if (normalizedStatus === STANDARD_LEAD_STATUS.UNVERIFIED) {
      return {
        label: 'Không xác thực',
        className: 'border-amber-200 bg-amber-50 text-amber-700'
      };
    }

    if (!lead.ownerId) {
      return {
        label: 'Mới',
        className: 'border-[#e4e7ec] bg-[#f8fafc] text-slate-600'
      };
    }

    if ([STANDARD_LEAD_STATUS.NEW, STANDARD_LEAD_STATUS.ASSIGNED].includes(normalizedStatus)) {
      return {
        label: 'Đã chia',
        className: 'border-[#d7e3f4] bg-[#eef4fb] text-[#4f6b8a]'
      };
    }

    return {
      label: 'Đang xử lý',
      className: 'border-[#d9e7df] bg-[#edf6f1] text-[#55756a]'
    };
  };

  const compactHeaderCellClass = 'border-b border-[#f1f5f9] px-2 py-1.5 text-left text-[10px] font-bold uppercase tracking-[0.06em] text-[#7b8794]';
  const compactBodyCellClass = 'whitespace-nowrap px-2 py-1 align-middle text-[12px] text-slate-700';
  const compactMetaCellClass = 'whitespace-nowrap px-2 py-1 align-middle text-[12px] text-slate-600';
  const flatRibbonButtonClass = 'inline-flex items-center gap-1 rounded-sm border border-transparent px-2 py-1 text-[11px] font-semibold text-slate-700 transition-colors hover:border-[#d8dee8] hover:bg-white hover:text-slate-900';
  const compactToolbarButtonClass = 'inline-flex items-center gap-1 rounded-sm border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900';
  const leadTableColSpan = visibleColumns.length + 1;

  return decodeMojibakeReactNode(
    <>
      <div className="mx-auto min-h-screen max-w-[1600px] bg-[#f8fafc] px-4 py-6 font-inter text-slate-900 md:px-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-bold tracking-tight text-[#2f5bd3] md:text-[22px]">CÃ†Â¡ hÃ¡Â»â„¢i (Leads)</h1>
            <p className="mt-1 text-[13px] text-slate-600">QuÃ¡ÂºÂ£n lÃƒÂ½ Lead Ã„â€˜Ã¡ÂºÂ§u vÃƒÂ o vÃƒÂ  phÃƒÂ¢n bÃ¡Â»â€¢ cho Ã„â€˜Ã¡Â»â„¢i Sales</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[14px] font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              <FileSpreadsheet size={18} /> Import Excel
            </button>
            <button
              onClick={openCreateLeadModal}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2f5bd3] px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-[#244fc4]"
            >
              <Plus size={18} /> ThÃƒÂªm Lead
            </button>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <button onClick={() => setActiveTab('all')} className="rounded-[18px] border border-[#2f5bd3] bg-white px-5 py-4 text-left shadow-sm transition-transform hover:-translate-y-0.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">TÃ¡Â»â€¢ng sÃ¡Â»â€˜ lead</div>
                <div className="mt-2 text-[18px] font-bold text-slate-900">{stats.total.toLocaleString()}</div>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#2f5bd3]">
                <Users size={22} />
              </span>
            </div>
          </button>
          <button onClick={() => setActiveTab('new')} className="rounded-[18px] border border-slate-200 bg-white px-5 py-4 text-left shadow-sm transition-transform hover:-translate-y-0.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">Lead mÃ¡Â»â€ºi</div>
                <div className="mt-2 text-[18px] font-bold text-slate-900">{stats.newLeads.toLocaleString()}</div>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <UserPlus size={22} />
              </span>
            </div>
          </button>
          <div className="rounded-[18px] border border-slate-200 bg-white px-5 py-4 text-left shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">CÃ¡ÂºÂ£nh bÃƒÂ¡o SLA</div>
                <div className="mt-2 text-[18px] font-bold text-slate-900">{stats.slaRisk.toLocaleString()}</div>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
                <AlertTriangle size={22} />
              </span>
            </div>
          </div>
          <div className="rounded-[18px] border border-slate-200 bg-white px-5 py-4 text-left shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">TÃ¡Â»Â· lÃ¡Â»â€¡ xÃƒÂ¡c thÃ¡Â»Â±c</div>
                <div className="mt-2 text-[18px] font-bold text-slate-900">{stats.verificationRate.toFixed(1)}%</div>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <ShieldCheck size={22} />
              </span>
            </div>
          </div>
        </div>
        <div className="hidden mb-3 border-b border-[#f1f5f9] pb-2.5">
          <div className="flex flex-wrap items-center gap-2 xl:flex-nowrap">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[15px] font-bold uppercase tracking-[0.12em] text-slate-900">PhÃ¢n bá»• Lead</h1>
              <div className="flex flex-wrap items-center gap-0.5 rounded-sm border border-[#e4e7ec] bg-[#f5f6f8] px-1 py-1">
                <button
                  onClick={openCreateLeadModal}
                  className={flatRibbonButtonClass}
                >
                  <Plus size={13} /> Táº¡o má»›i
                </button>
                <button
                  onClick={openQuickAssignModal}
                  className={flatRibbonButtonClass}
                >
                  <UserPlus size={13} /> PhÃ¢n bá»• nhanh
                </button>
                <button
                  onClick={() => setShowImportModal(true)}
                  className={flatRibbonButtonClass}
                >
                  <FileSpreadsheet size={13} /> Nháº­p Excel
                </button>
                <button
                  onClick={handleBulkExport}
                  className={flatRibbonButtonClass}
                >
                  <Download size={13} /> Xuáº¥t Excel
                </button>
                <div className="mx-1 h-4 w-px bg-[#d8dee8]"></div>
                <button
                  onClick={handleBulkMarkLost}
                  disabled={selectedLeadIds.length === 0}
                  className={`${flatRibbonButtonClass} ${selectedLeadIds.length === 0 ? 'cursor-not-allowed hover:border-transparent hover:bg-transparent hover:text-slate-700' : ''}`}
                  title="ÄÃ¡nh dáº¥u tháº¥t báº¡i"
                >
                  <XCircle size={13} /> ÄÃ¡nh dáº¥u tháº¥t báº¡i
                </button>

                <button
                  onClick={handleBulkDelete}
                  disabled={selectedLeadIds.length === 0}
                  className={`${flatRibbonButtonClass} ${selectedLeadIds.length === 0 ? 'cursor-not-allowed hover:border-transparent hover:bg-transparent hover:text-slate-700' : ''}`}
                  title="XÃ³a"
                >
                  <Trash2 size={13} /> XÃ³a
                </button>
              </div>
              <div className="hidden items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg border border-red-100 text-xs italic">
                <AlertTriangle size={14} className="shrink-0" />
                <span>Lead sẽ được chuyển sang <strong>{getLeadStatusLabel(lossStatus).toUpperCase()}</strong> và bắt buộc lưu lý do.</span>
              </div>
            </div>

            <div className="ml-auto grid gap-x-6 gap-y-2 md:grid-cols-4 xl:max-w-[520px]">
              <button onClick={() => setActiveTab('all')} className="text-left">
                <div className="text-[11px] font-medium text-[#7b8794]">Tá»•ng lead</div>
                <div className="mt-0.5 text-[15px] font-bold text-slate-900">{stats.total.toLocaleString()}</div>
              </button>
              <button onClick={() => setActiveTab('new')} className="text-left">
                <div className="text-[11px] font-medium text-[#7b8794]">ChÆ°a chia</div>
                <div className="mt-0.5 text-[15px] font-bold text-amber-600">{stats.unassigned.toLocaleString()}</div>
              </button>
              <div className="text-left">
                <div className="text-[11px] font-medium text-[#7b8794]">ÄÃ£ chia</div>
                <div className="mt-0.5 text-[15px] font-bold text-emerald-600">{stats.assigned.toLocaleString()}</div>
              </div>
              <div className="text-left">
                <div className="text-[11px] font-medium text-[#7b8794]">Äang xá»­ lÃ½</div>
                <div className="mt-0.5 text-[15px] font-bold text-blue-700">{stats.processing.toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs & Filter */}
        <div className="mb-6 overflow-visible rounded-[20px] border border-slate-200 bg-white shadow-sm">
          <div className="hidden flex-wrap items-center gap-2 border-b border-slate-100 px-4 pt-4">
            {LEAD_LIST_TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-t-xl border-b-2 px-4 pb-3 text-[14px] font-semibold transition-colors ${activeTab === tab ? 'border-[#2f5bd3] text-[#2f5bd3]' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
              >
                {tab === 'all' && 'TÃ¡ÂºÂ¥t cÃ¡ÂºÂ£'}
                {tab === 'new' && 'Lead Mới'}
                {tab === 'sla_risk' && (
                  <span className="inline-flex items-center gap-1">
                    SLA RÃ¡Â»Â§i ro
                    <AlertTriangle size={14} className="text-rose-500" />
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="space-y-3 px-4 py-4">
            {false && selectedLeadIds.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[12px] font-semibold text-slate-500">{selectedLeadIds.length} lead Ã„â€˜ang Ã„â€˜Ã†Â°Ã¡Â»Â£c chÃ¡Â»Ân</span>
                <button onClick={openQuickAssignModal} className={compactToolbarButtonClass}><UserPlus size={14} /> PhÃƒÂ¢n bÃ¡Â»â€¢ nhanh</button>
                <button onClick={handleBulkExport} className={compactToolbarButtonClass}><Download size={14} /> XuÃ¡ÂºÂ¥t Excel</button>
                <button onClick={handleBulkMarkLost} className={compactToolbarButtonClass}><XCircle size={14} /> Ã„ÂÃƒÂ¡nh dÃ¡ÂºÂ¥u thÃ¡ÂºÂ¥t bÃ¡ÂºÂ¡i</button>
                <button onClick={handleBulkDelete} className={compactToolbarButtonClass}><Trash2 size={14} /> XÃƒÂ³a</button>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-1.5 lg:flex-nowrap">
            <SmartSearchBar
              filters={toolbarFilterChips}
              onAddFilter={(filter) => {
                if (selectedAdvancedFilterOptions.length > 1) {
                  addFilter(
                    buildAdvancedMultiFilterField(selectedAdvancedFilterOptions.map((option) => option.id)),
                    'Logic lá»c',
                    filter.value,
                    'bg-emerald-100 text-emerald-700'
                  );
                  return;
                }
                if (selectedAdvancedFilterOptions.length === 1) {
                  addFilter(
                    selectedAdvancedFilterOptions[0].id,
                    selectedAdvancedFilterOptions[0].label,
                    filter.value,
                    'bg-emerald-100 text-emerald-700'
                  );
                  return;
                }
                addFilter(filter.field, filter.label, filter.value, filter.color);
              }}
              onRemoveFilter={handleToolbarFilterRemove}
              onClearAll={handleClearToolbarFilters}
              activeField={selectedAdvancedFilterOptions.length === 1 ? {
                field: selectedAdvancedFilterOptions[0].id,
                label: selectedAdvancedFilterOptions[0].label,
                color: 'bg-emerald-100 text-emerald-700'
              } : null}
              placeholder="TÃ¬m kiáº¿m lead..."
              compact
              fullWidth
            />

            <div className="flex items-center rounded-sm border border-[#e4e7ec] bg-[#f8fafc] p-0.5">
              <button onClick={() => setViewMode('list')} className={`rounded-sm p-1 ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`} title="Dáº¡ng Danh sÃ¡ch"><ListIcon size={15} /></button>
              <button onClick={() => setViewMode('pivot')} className={`rounded-sm p-1 ${viewMode === 'pivot' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`} title="BÃ¡o cÃ¡o Pivot"><LayoutGrid size={15} /></button>
            </div>

            <div className="relative hidden">
              <button
                onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 text-slate-600 bg-white shadow-sm"
              >
                <Settings size={16} /> Cá»™t
              </button>
              {showColumnDropdown && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowColumnDropdown(false)}></div>
                  <div className="absolute right-0 top-full mt-2 w-[500px] bg-white border border-slate-200 rounded-lg shadow-xl z-40 p-3 animate-in fade-in zoom-in-95">
                    <div className="text-xs font-bold text-slate-500 uppercase px-2 py-1 mb-2 border-b border-slate-100 pb-2">Hiá»ƒn thá»‹ cá»™t</div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                      {ALL_COLUMNS.map(col => (
                        <div key={col.id} onClick={() => toggleColumn(col.id)} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer text-sm">
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${visibleColumns.includes(col.id) ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'}`}>
                            {visibleColumns.includes(col.id) && <Check size={10} strokeWidth={4} />}
                          </div>
                          <span className={visibleColumns.includes(col.id) ? 'text-slate-900 font-medium' : 'text-slate-500'}>{col.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* --- NEW TIME RANGE FILTER (IMAGE 2 STYLE) --- */}
            <div className="relative">
              <div className="flex items-center overflow-hidden rounded-sm border border-slate-200 bg-white transition-colors hover:border-slate-300">
                <select
                  value={timeFilterField}
                  onChange={(e) => setTimeFilterField(e.target.value as any)}
                  className="cursor-pointer border-r border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600 outline-none hover:bg-slate-100"
                >
                  <option value="createdAt">NgÃ y táº¡o</option>
                  <option value="deadline">Háº¡n chÃ³t</option>
                  <option value="lastInteraction">TÆ°Æ¡ng tÃ¡c cuá»‘i</option>
                </select>
                <button
                  onClick={() => setShowTimePicker(!showTimePicker)}
                  className={`flex items-center gap-1.5 whitespace-nowrap px-2 py-1 text-[11px] font-semibold ${timeRangeType !== 'all' ? 'bg-blue-50 text-blue-600' : 'text-slate-500'}`}
                >
                  <Calendar size={14} />
                  {timePresets.find(p => p.id === timeRangeType)?.label}
                  {timeRangeType === 'custom' && customRange && (
                    <span className="text-[10px] bg-blue-100 px-1 rounded ml-1">
                      {new Date(customRange.start).toLocaleDateString('vi-VN')} - {new Date(customRange.end).toLocaleDateString('vi-VN')}
                    </span>
                  )}
                  <ChevronRight size={12} className={`transition-transform ${showTimePicker ? 'rotate-90' : ''}`} />
                </button>
              </div>

              {showTimePicker && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowTimePicker(false)}></div>
                  <div className="absolute right-0 top-full mt-2 w-[550px] bg-white border border-slate-200 rounded-xl shadow-2xl z-40 overflow-hidden flex animate-in slide-in-from-top-2">
                    {/* Left Sidebar: Presets */}
                    <div className="w-40 bg-slate-50 border-r border-slate-100 p-2 space-y-1 shrink-0">
                      {timePresets.map(preset => (
                        <button
                          key={preset.id}
                          onClick={() => {
                            setTimeRangeType(preset.id);
                            if (preset.id !== 'custom') setShowTimePicker(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all ${timeRangeType === preset.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-200'}`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    {/* Right Side: Custom Range Selection */}
                    <div className="flex-1 p-4 flex flex-col">
                      <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Khoáº£ng thá»i gian tÃ¹y chá»‰nh</div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1">Tá»« ngÃ y</label>
                          <input
                            type="date"
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:border-blue-500 outline-none"
                            value={customRange?.start || ''}
                            onChange={(e) => setCustomRange(prev => ({ start: e.target.value, end: prev?.end || e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1">Äáº¿n ngÃ y</label>
                          <input
                            type="date"
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:border-blue-500 outline-none"
                            value={customRange?.end || ''}
                            onChange={(e) => setCustomRange(prev => ({ start: prev?.start || e.target.value, end: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div className="mt-auto pt-6 flex justify-between items-center bg-white">
                        <button
                          onClick={() => {
                            setTimeRangeType('all');
                            setCustomRange(null);
                            setShowTimePicker(false);
                          }}
                          className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                        >
                          LÃ m láº¡i
                        </button>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setShowTimePicker(false)}
                            className="px-4 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-bold"
                          >
                            Há»§y
                          </button>
                          <button
                            onClick={() => {
                              if (customRange?.start && customRange?.end) {
                                setTimeRangeType('custom');
                                setShowTimePicker(false);
                              } else {
                                alert("Vui lÃ²ng chá»n khoáº£ng ngÃ y");
                              }
                            }}
                            className="px-6 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-lg shadow-blue-100"
                          >
                            Ãp dá»¥ng
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
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className={`inline-flex items-center gap-1 rounded-sm border px-2 py-1 text-[11px] font-semibold transition-colors ${showFilterDropdown ? 'border-slate-300 bg-slate-100 text-slate-900' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
              >
                <Filter size={13} /> Lá»c nÃ¢ng cao
                {(() => {
                  const activeCount = [
                    ...selectedAdvancedFilterFields,
                    ...selectedAdvancedGroupFields,
                    advancedFilters.myPipeline,
                    advancedFilters.unassigned,
                    advancedFilters.openOps,
                    advancedFilters.createdDate,
                    advancedFilters.closedDate,
                    ...advancedFilters.status
                  ].filter(Boolean).length;
                  return activeCount > 0 ? (
                    <span className="bg-blue-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                      {activeCount}
                    </span>
                  ) : null;
                })()}
              </button>
              {showFilterDropdown && (
                <div className="absolute right-0 top-full mt-2 max-h-[70vh] w-[720px] overflow-y-auto rounded-lg border border-slate-200 bg-white p-4 shadow-xl z-40 animate-in fade-in zoom-in-95">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="pr-2 border-r border-slate-100">
                      <div className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <Filter size={14} /> Filter
                      </div>
                      <p className="text-xs text-slate-500 mb-3">
                        Chon truong tu muc Cot. Sau do nhap gia tri vao o tim kiem de tao bo loc.
                      </p>
                      <div className="max-h-[360px] overflow-y-auto custom-scrollbar space-y-1">
                          {ALL_COLUMNS.map((col) => (
                            <button
                              key={`filter-${col.id}`}
                              onClick={() => toggleAdvancedFieldSelection('filter', col.id)}
                              className={`w-full text-left py-2 px-3 rounded-lg transition-colors ${selectedAdvancedFilterFields.includes(col.id) ? 'bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200' : 'text-slate-700 hover:bg-slate-50 border border-transparent'}`}
                            >
                              {col.label}
                            </button>
                        ))}
                      </div>
                    </div>

                    <div className="pl-2">
                      <div className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <Users size={14} /> Group by
                      </div>
                      <p className="text-xs text-slate-500 mb-3">
                        Danh sach truong lay toan bo tu muc Cot.
                      </p>
                      <div className="max-h-[360px] overflow-y-auto custom-scrollbar space-y-1">
                          {ALL_COLUMNS.map((col) => (
                            <button
                              key={`group-${col.id}`}
                              onClick={() => toggleAdvancedFieldSelection('group', col.id)}
                              className={`w-full text-left py-2 px-3 rounded-lg transition-colors ${selectedAdvancedGroupFields.includes(col.id) ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200' : 'text-slate-700 hover:bg-slate-50 border border-transparent'}`}
                            >
                              {col.label}
                            </button>
                        ))}
                      </div>
                      </div>
                    </div>
                  </div>
                )}
              {(() => {
                const hasActiveFilters = selectedAdvancedFilterFields.length > 0 || selectedAdvancedGroupFields.length > 0 || advancedFilters.myPipeline || advancedFilters.unassigned || advancedFilters.openOps || advancedFilters.createdDate || advancedFilters.closedDate || advancedFilters.status.length > 0;
                return hasActiveFilters ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAdvancedFilterFields([]);
                      setSelectedAdvancedGroupFields([]);
                      setAdvancedFilters({
                        myPipeline: false,
                        unassigned: false,
                        openOps: false,
                        createdDate: null,
                        closedDate: null,
                        status: []
                      });
                    }}
                    className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-lg z-10"
                    title="XÃ³a táº¥t cáº£ bá»™ lá»c"
                  >
                    <X size={12} strokeWidth={3} />
                  </button>
                ) : null;
              })()}
              {false && showFilterDropdown && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowFilterDropdown(false)}></div>
                  <div className="hidden absolute right-0 top-full mt-2 w-[800px] bg-white border border-slate-200 rounded-lg shadow-xl z-40 p-4 animate-in fade-in zoom-in-95 flex text-sm">
                    {/* COLUMN 1: FILTER */}
                    <div className="flex-1 pr-4 border-r border-slate-100 space-y-2">
                      <div className="font-bold text-slate-800 mb-2 flex items-center gap-2"><Filter size={14} /> Bá»™ lá»c</div>

                      {/* My Pipeline */}
                      <div className="group">
                        <div
                          onClick={() => setAdvancedFilters(prev => ({ ...prev, myPipeline: !prev.myPipeline }))}
                          className={`flex justify-between items-center py-1.5 px-2 hover:bg-slate-50 rounded cursor-pointer font-medium ${advancedFilters.myPipeline ? 'bg-blue-50 text-blue-700' : 'text-slate-700'}`}
                        >
                          <span>
                            <Check size={14} className={`inline mr-2 ${advancedFilters.myPipeline ? 'text-blue-600' : 'text-transparent'}`} />
                            Quy trÃ¬nh cá»§a tÃ´i
                          </span>
                        </div>
                        <div className="pl-6 space-y-1">
                          <div
                            onClick={() => setAdvancedFilters(prev => ({ ...prev, unassigned: !prev.unassigned }))}
                            className={`py-1 px-2 hover:bg-slate-50 rounded cursor-pointer ${advancedFilters.unassigned ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600'}`}
                          >
                            <Check size={12} className={`inline mr-1 ${advancedFilters.unassigned ? 'text-blue-600' : 'text-transparent'}`} />
                            ChÆ°a phÃ¢n cÃ´ng
                          </div>
                          <div
                            onClick={() => setAdvancedFilters(prev => ({ ...prev, openOps: !prev.openOps }))}
                            className={`py-1 px-2 hover:bg-slate-50 rounded cursor-pointer ${advancedFilters.openOps ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600'}`}
                          >
                            <Check size={12} className={`inline mr-1 ${advancedFilters.openOps ? 'text-blue-600' : 'text-transparent'}`} />
                            Má»Ÿ cÆ¡ há»™i
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-slate-100 my-1"></div>

                      {/* Date Created */}
                      <div className="group relative">
                        <div onClick={(e) => toggleFilter('filter_created', e)} className={`flex justify-between items-center py-1.5 px-2 hover:bg-slate-50 rounded cursor-pointer ${expandedFilter === 'filter_created' ? 'bg-slate-100 text-blue-600' : advancedFilters.createdDate ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700'}`}>
                          <span>
                            <Check size={14} className={`inline mr-2 ${advancedFilters.createdDate ? 'text-blue-600' : 'text-transparent'}`} />
                            NgÃ y táº¡o
                            {advancedFilters.createdDate && (
                              <span className="ml-2 text-xs bg-blue-100 px-1.5 py-0.5 rounded">
                                {advancedFilters.createdDate.type === 'month' && `T${advancedFilters.createdDate.value}`}
                                {advancedFilters.createdDate.type === 'quarter' && `Q${advancedFilters.createdDate.value}`}
                                {advancedFilters.createdDate.type === 'year' && advancedFilters.createdDate.value}
                              </span>
                            )}
                          </span>
                          <span className="text-slate-400">â–¼</span>
                        </div>
                        {expandedFilter === 'filter_created' && (
                          <div className="absolute left-0 top-full mt-1 w-full bg-white border border-slate-200 shadow-xl rounded-lg p-2 z-50">
                            {[2, 1, 12].map(month => (
                              <div
                                key={`month-${month}`}
                                onClick={() => { setDateFilter('createdDate', 'month', month); setExpandedFilter(null); }}
                                className={`py-1 px-3 hover:bg-blue-50 rounded cursor-pointer ${advancedFilters.createdDate?.type === 'month' && advancedFilters.createdDate?.value === month ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-slate-700'}`}
                              >
                                thÃ¡ng {month}
                              </div>
                            ))}
                            {[4, 3, 2, 1].map(q => (
                              <div
                                key={`q-${q}`}
                                onClick={() => { setDateFilter('createdDate', 'quarter', q); setExpandedFilter(null); }}
                                className={`py-1 px-3 hover:bg-blue-50 rounded cursor-pointer ${advancedFilters.createdDate?.type === 'quarter' && advancedFilters.createdDate?.value === q ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-slate-700'}`}
                              >
                                Q{q}
                              </div>
                            ))}
                            <div className="border-t my-1"></div>
                            {[2026, 2025, 2024].map(year => (
                              <div
                                key={`year-${year}`}
                                onClick={() => { setDateFilter('createdDate', 'year', year); setExpandedFilter(null); }}
                                className={`py-1 px-3 hover:bg-blue-50 rounded cursor-pointer ${advancedFilters.createdDate?.type === 'year' && advancedFilters.createdDate?.value === year ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-slate-700'}`}
                              >
                                {year}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="group relative">
                        <div onClick={(e) => toggleFilter('filter_closed', e)} className={`flex justify-between items-center py-1.5 px-2 hover:bg-slate-50 rounded cursor-pointer ${expandedFilter === 'filter_closed' ? 'bg-slate-100 text-blue-600' : advancedFilters.closedDate ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700'}`}>
                          <span>
                            <Check size={14} className={`inline mr-2 ${advancedFilters.closedDate ? 'text-blue-600' : 'text-transparent'}`} />
                            NgÃ y chá»‘t
                            {advancedFilters.closedDate && (
                              <span className="ml-2 text-xs bg-blue-100 px-1.5 py-0.5 rounded">
                                {advancedFilters.closedDate.type === 'month' && `T${advancedFilters.closedDate.value}`}
                                {advancedFilters.closedDate.type === 'quarter' && `Q${advancedFilters.closedDate.value}`}
                                {advancedFilters.closedDate.type === 'year' && advancedFilters.closedDate.value}
                              </span>
                            )}
                          </span>
                          <span className="text-slate-400">â–¼</span>
                        </div>
                        {expandedFilter === 'filter_closed' && (
                          <div className="absolute left-0 top-full mt-1 w-full bg-white border border-slate-200 shadow-xl rounded-lg p-2 z-50">
                            {[2, 1, 12].map(month => (
                              <div
                                key={`month-${month}`}
                                onClick={() => { setDateFilter('closedDate', 'month', month); setExpandedFilter(null); }}
                                className={`py-1 px-3 hover:bg-blue-50 rounded cursor-pointer ${advancedFilters.closedDate?.type === 'month' && advancedFilters.closedDate?.value === month ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-slate-700'}`}
                              >
                                thÃ¡ng {month}
                              </div>
                            ))}
                            {[4, 3, 2, 1].map(q => (
                              <div
                                key={`q-${q}`}
                                onClick={() => { setDateFilter('closedDate', 'quarter', q); setExpandedFilter(null); }}
                                className={`py-1 px-3 hover:bg-blue-50 rounded cursor-pointer ${advancedFilters.closedDate?.type === 'quarter' && advancedFilters.closedDate?.value === q ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-slate-700'}`}
                              >
                                Q{q}
                              </div>
                            ))}
                            <div className="border-t my-1"></div>
                            {[2026, 2025, 2024].map(year => (
                              <div
                                key={`year-${year}`}
                                onClick={() => { setDateFilter('closedDate', 'year', year); setExpandedFilter(null); }}
                                className={`py-1 px-3 hover:bg-blue-50 rounded cursor-pointer ${advancedFilters.closedDate?.type === 'year' && advancedFilters.closedDate?.value === year ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-slate-700'}`}
                              >
                                {year}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="border-t border-slate-100 my-1"></div>

                      {['Äáº¡t', 'Äang diá»…n ra', 'Rotting', 'Máº¥t'].map(status => (
                        <div
                          key={status}
                          onClick={() => toggleAdvancedStatus(status)}
                          className={`py-1.5 px-2 hover:bg-slate-50 rounded cursor-pointer ${advancedFilters.status.includes(status) ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700'}`}
                        >
                          <Check size={14} className={`inline mr-2 ${advancedFilters.status.includes(status) ? 'text-blue-600' : 'text-transparent'}`} />
                          {status}
                        </div>
                      ))}

                      <div className="border-t border-slate-100 my-1"></div>
                      {/* Removed "Bá»™ lá»c tÃ¹y chá»‰nh" */}
                    </div>

                    {/* COLUMN 2: GROUP BY */}
                    <div className="flex-1 px-4 border-r border-slate-100 space-y-2">
                      <div className="font-bold text-slate-800 mb-2 flex items-center gap-2"><Users size={14} /> NhÃ³m theo</div>

                      {['ChuyÃªn viÃªn sales', 'Bá»™ pháº­n sales', 'Giai Ä‘oáº¡n', 'ThÃ nh phá»‘', 'Quá»‘c gia', 'LÃ½ do máº¥t', 'Chiáº¿n dá»‹ch', 'PhÆ°Æ¡ng tiá»‡n', 'Nguá»“n'].map(field => (
                        <div key={field} className="py-1.5 px-2 hover:bg-slate-50 rounded cursor-pointer text-slate-700">
                          {field}
                        </div>
                      ))}

                      <div className="border-t border-slate-100 my-1"></div>
                      <div className="group relative">
                        <div onClick={(e) => toggleFilter('group_created', e)} className={`flex justify-between items-center py-1.5 px-2 hover:bg-slate-50 rounded cursor-pointer ${expandedFilter === 'group_created' ? 'bg-slate-100 text-blue-600' : 'text-slate-700'}`}>
                          <span>NgÃ y táº¡o</span>
                          <span className="text-slate-400">â–¼</span>
                        </div>
                        {expandedFilter === 'group_created' && (
                          <div className="absolute left-0 top-full mt-1 w-full bg-white border border-slate-200 shadow-xl rounded-lg p-2 z-50">
                            {['NÄƒm', 'QuÃ½', 'ThÃ¡ng', 'Tuáº§n', 'NgÃ y'].map(item => (
                              <div key={item} className="py-1 px-3 hover:bg-slate-100 rounded cursor-pointer text-slate-700">{item}</div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="group relative">
                        <div onClick={(e) => toggleFilter('group_expected', e)} className={`flex justify-between items-center py-1.5 px-2 hover:bg-slate-50 rounded cursor-pointer ${expandedFilter === 'group_expected' ? 'bg-slate-100 text-blue-600' : 'text-slate-700'}`}>
                          <span>NgÃ y Ä‘Ã³ng dá»± kiáº¿n</span>
                          <span className="text-slate-400">â–¼</span>
                        </div>
                        {expandedFilter === 'group_expected' && (
                          <div className="absolute left-0 top-full mt-1 w-full bg-white border border-slate-200 shadow-xl rounded-lg p-2 z-50">
                            {['NÄƒm', 'QuÃ½', 'ThÃ¡ng', 'Tuáº§n', 'NgÃ y'].map(item => (
                              <div key={item} className="py-1 px-3 hover:bg-slate-100 rounded cursor-pointer text-slate-700">{item}</div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="group relative">
                        <div onClick={(e) => toggleFilter('group_closed', e)} className={`flex justify-between items-center py-1.5 px-2 hover:bg-slate-50 rounded cursor-pointer ${expandedFilter === 'group_closed' ? 'bg-slate-100 text-blue-600' : 'text-slate-700'}`}>
                          <span>NgÃ y chá»‘t</span>
                          <span className="text-slate-400">â–¼</span>
                        </div>
                        {expandedFilter === 'group_closed' && (
                          <div className="absolute left-0 top-full mt-1 w-full bg-white border border-slate-200 shadow-xl rounded-lg p-2 z-50">
                            {['NÄƒm', 'QuÃ½', 'ThÃ¡ng', 'Tuáº§n', 'NgÃ y'].map(item => (
                              <div key={item} className="py-1 px-3 hover:bg-slate-100 rounded cursor-pointer text-slate-700">{item}</div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="border-t border-slate-100 my-1"></div>
                      <div className="group relative">
                        <div onClick={(e) => toggleFilter('group_custom', e)} className={`flex justify-between items-center py-1.5 px-2 hover:bg-slate-50 rounded cursor-pointer ${expandedFilter === 'group_custom' ? 'bg-slate-100 text-blue-600' : 'text-slate-700'}`}>
                          <span>NhÃ³m tÃ¹y chá»‰nh</span>
                          <span className="text-slate-400">â–¼</span>
                        </div>
                        {expandedFilter === 'group_custom' && (
                          <div className="absolute left-0 bottom-full mb-1 w-[300px] bg-white border border-slate-200 shadow-xl rounded-lg p-2 z-50 max-h-[300px] overflow-y-auto custom-scrollbar">
                            {['Bá»™ pháº­n sales', 'Chiáº¿n dá»‹ch', 'ChuyÃªn viÃªn sales', 'Cháº¥t lÆ°á»£ng email', 'Cháº¥t lÆ°á»£ng Ä‘iá»‡n thoáº¡i', 'CÃ´ng ty', 'CÆ¡ há»™i', 'Cáº­p nháº­t giai Ä‘oáº¡n láº§n cuá»‘i', 'Cáº­p nháº­t láº§n cuá»‘i bá»Ÿi', 'Cáº­p nháº­t láº§n cuá»‘i vÃ o', 'Email', 'Email cc', 'Email chuáº©n hÃ³a', 'Giai Ä‘oáº¡n', 'Giá»›i thiá»‡u bá»Ÿi', 'Hiá»‡n ID', 'HoÃ n táº¥t tÄƒng cÆ°á»ng', 'Káº¿ hoáº¡ch Ä‘á»‹nh ká»³', 'LiÃªn há»‡', 'Loáº¡i'].map(field => (
                              <div key={field} className="py-1 px-3 hover:bg-slate-100 rounded cursor-pointer whitespace-nowrap text-slate-700">{field}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* COLUMN 3: FAVORITES */}
                    <div className="flex-1 pl-4 space-y-4">
                      <div className="font-bold text-slate-800 mb-2 flex items-center gap-2"><Save size={14} /> Danh sÃ¡ch yÃªu thÃ­ch</div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">LÆ°u bá»™ lá»c hiá»‡n táº¡i</label>
                          <input className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm mb-2" defaultValue="Quy trÃ¬nh" />
                          <div className="flex items-center gap-2 mb-2">
                            <input type="checkbox" id="default-filter" className="rounded border-slate-300" />
                            <label htmlFor="default-filter" className="text-slate-600 text-sm">Bá»™ lá»c máº·c Ä‘á»‹nh</label>
                          </div>
                          <div className="flex gap-2">
                            <button className="flex-1 bg-purple-700 text-white py-1 rounded text-xs font-bold hover:bg-purple-800">LÆ°u</button>
                            <button className="flex-1 bg-slate-100 text-slate-700 py-1 rounded text-xs font-bold hover:bg-slate-200">Chá»‰nh sá»­a</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Duplicate Check Button */}
            <div className="relative">
              <button
                onClick={() => setShowDuplicateModal(true)}
                className={`inline-flex items-center gap-1 rounded-sm border px-2 py-1 text-[11px] font-semibold transition-colors ${duplicateGroups.length > 0 ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                title={`TÃ¬m tháº¥y ${duplicateGroups.length} nhÃ³m trÃ¹ng SÄT`}
              >
                <Database size={13} />
                Chá»‘ng trÃ¹ng
                {duplicateGroups.length > 0 && (
                  <span className="bg-amber-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1">
                    {duplicateGroups.length}
                  </span>
                )}
              </button>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                className={compactToolbarButtonClass}
              >
                <Settings size={13} /> Cá»™t
              </button>
              {showColumnDropdown && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowColumnDropdown(false)}></div>
                  <div className="absolute right-0 top-full mt-2 w-[500px] bg-white border border-slate-200 rounded-lg shadow-xl z-40 p-3 animate-in fade-in zoom-in-95">
                    <div className="text-xs font-bold text-slate-500 uppercase px-2 py-1 mb-2 border-b border-slate-100 pb-2">HiÃ¡Â»Æ’n thÃ¡Â»â€¹ cÃ¡Â»â„¢t</div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                      {ALL_COLUMNS.map(col => (
                        <div key={col.id} onClick={() => toggleColumn(col.id)} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer text-sm">
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${visibleColumns.includes(col.id) ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'}`}>
                            {visibleColumns.includes(col.id) && <Check size={10} strokeWidth={4} />}
                          </div>
                          <span className={visibleColumns.includes(col.id) ? 'text-slate-900 font-medium' : 'text-slate-500'}>{col.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="hidden flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 pt-3 pb-4">
            {LEAD_LIST_TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-t-xl border-b-2 px-4 pb-3 text-[14px] font-semibold transition-colors ${activeTab === tab ? 'border-[#2f5bd3] text-[#2f5bd3]' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
              >
                {tab === 'all' && 'Táº¥t cáº£'}
                {tab === 'new' && 'Lead Mới'}
              </button>
            ))}
          </div>
          <div className="hidden flex-wrap items-start justify-between gap-3 border-t border-slate-100 px-4 pt-3 pb-4">
            <div className="flex flex-wrap items-center gap-2">
              {LEAD_LIST_TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-t-xl border-b-2 px-4 pb-3 text-[14px] font-semibold transition-colors ${activeTab === tab ? 'border-[#2f5bd3] text-[#2f5bd3]' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
                >
                  {getLeadListTabLabel(tab)}
                </button>
              ))}
            </div>
            {selectedLeadIds.length > 0 && (
              <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                <span className="text-[12px] font-semibold text-slate-500">{selectedLeadIds.length} lead đang được chọn</span>
                <button onClick={openQuickAssignModal} className={compactToolbarButtonClass}><UserPlus size={14} /> Phân bổ nhanh</button>
                <button onClick={handleBulkExport} className={compactToolbarButtonClass}><Download size={14} /> Xuất Excel</button>
                <button onClick={handleBulkMarkLost} className={compactToolbarButtonClass}><XCircle size={14} /> Đánh dấu thất bại</button>
                <button onClick={handleBulkDelete} className={compactToolbarButtonClass}><Trash2 size={14} /> Xóa</button>
              </div>
            )}
          </div>
        </div>
        </div>

        {/* CONTENT AREA: LIST vs PIVOT */}
        <div className="mt-4">
          {viewMode === 'pivot' ? (
            <LeadPivotTable leads={filteredLeads} />
          ) : (
            <div className="rounded-[20px] border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 pt-4 pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  {LEAD_LIST_TABS.map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`rounded-t-xl border-b-2 px-4 pb-3 text-[14px] font-semibold transition-colors ${activeTab === tab ? 'border-[#2f5bd3] text-[#2f5bd3]' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
                    >
                      {getLeadListTabLabel(tab)}
                    </button>
                  ))}
                </div>
                {selectedLeadIds.length > 0 && (
                  <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                    <span className="text-[12px] font-semibold text-slate-500">{selectedLeadIds.length} lead đang được chọn</span>
                    <button onClick={openQuickAssignModal} className={compactToolbarButtonClass}><UserPlus size={14} /> Phân bổ nhanh</button>
                    <button onClick={handleBulkExport} className={compactToolbarButtonClass}><Download size={14} /> Xuất Excel</button>
                    <button onClick={handleBulkMarkLost} className={compactToolbarButtonClass}><XCircle size={14} /> Đánh dấu thất bại</button>
                    <button onClick={handleBulkDelete} className={compactToolbarButtonClass}><Trash2 size={14} /> Xóa</button>
                  </div>
                )}
              </div>
              <div className="overflow-x-auto">
              <table className="w-full table-fixed border-collapse text-left">
                <thead className="sticky top-0 z-10 bg-[#fafbfc]">
                  <tr>
                    <th className={`${compactHeaderCellClass} w-8 text-center`}>
                      <input type="checkbox" className="rounded border-slate-300" onChange={handleSelectAll} checked={selectedLeadIds.length === filteredLeads.length && filteredLeads.length > 0} />
                    </th>
                    {visibleColumns.includes('opportunity') && <th className={compactHeaderCellClass}>CÆ¡ há»™i</th>}
                    {visibleColumns.includes('contact') && <th className={compactHeaderCellClass}>TÃªn liÃªn há»‡</th>}
                    {visibleColumns.includes('company') && <th className={compactHeaderCellClass}>CÆ¡ sá»Ÿ / CÃ´ng ty</th>}
                    {visibleColumns.includes('email') && <th className={compactHeaderCellClass}>Email</th>}
                    {visibleColumns.includes('phone') && <th className={compactHeaderCellClass}>SÄT</th>}
                    {visibleColumns.includes('salesperson') && <th className={compactHeaderCellClass}>Sale</th>}
                    {visibleColumns.includes('campaign') && <th className={compactHeaderCellClass}>Chiáº¿n dá»‹ch</th>}
                    {visibleColumns.includes('source') && <th className={compactHeaderCellClass}>Nguá»“n</th>}
                    {visibleColumns.includes('tags') && <th className={compactHeaderCellClass}>Tags</th>}
                    {visibleColumns.includes('market') && <th className={compactHeaderCellClass}>THá»Š TRÆ¯á»œNG</th>}
                    {visibleColumns.includes('product') && <th className={compactHeaderCellClass}>Sáº¢N PHáº¨M QUAN TÃ‚M</th>}
                    {visibleColumns.includes('nextActivity') && <th className={compactHeaderCellClass}>Hoáº¡t Ä‘á»™ng</th>}
                    {visibleColumns.includes('deadline') && <th className={`${compactHeaderCellClass} text-right`}>Háº¡n chÃ³t</th>}
                    {visibleColumns.includes('value') && <th className={`${compactHeaderCellClass} text-right`}>Doanh thu</th>}
                    {visibleColumns.includes('createdAt') && <th className={`${compactHeaderCellClass} text-right`}>NgÃ y Ä‘á»• lead</th>}
                    {visibleColumns.includes('title') && <th className={compactHeaderCellClass}>Danh xÆ°ng</th>}
                    {visibleColumns.includes('address') && <th className={compactHeaderCellClass}>Äá»‹a chá»‰</th>}
                    {visibleColumns.includes('referredBy') && <th className={compactHeaderCellClass}>NgÆ°á»i giá»›i thiá»‡u</th>}
                    {visibleColumns.includes('status') && <th className={`${compactHeaderCellClass} text-center`}>Tráº¡ng thÃ¡i</th>}
                    {visibleColumns.includes('notes') && <th className={compactHeaderCellClass}>Ghi chÃº</th>}
                    {visibleColumns.includes('sla') && <th className={compactHeaderCellClass}>Cáº£nh bÃ¡o SLA</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9]">
                  {filteredLeads.length === 0 ? (
                    <tr><td colSpan={leadTableColSpan} className="px-3 py-4 text-center text-[12px] text-slate-400">No data available</td></tr>
                  ) : (
                    filteredLeads.map(lead => {
                      // Helper: Find next activity
                      // @ts-ignore
                      const nextActivity = (lead.activities || []).find(a => a.type === 'activity');
                      const deadline = lead.expectedClosingDate ? new Date(lead.expectedClosingDate).toLocaleDateString('vi-VN') : '-';
                      const normalizedStatus = normalizeLeadStatus(lead.status as string);

                      return (
                        <tr
                          key={lead.id}
                          className={`group cursor-pointer transition-colors hover:bg-slate-50 ${selectedLeadIds.includes(lead.id) ? 'bg-slate-50' : ''}`}
                          onClick={() => setSelectedLead(lead)}
                        >
                          <td className="px-2 py-1 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" className="rounded border-slate-300 w-3.5 h-3.5" checked={selectedLeadIds.includes(lead.id)} onClick={(e) => handleSelectLeadCheckbox(lead.id, e)} onChange={() => { }} />
                          </td>

                          {visibleColumns.includes('opportunity') && (
                            <td className={compactMetaCellClass}>
                              <div className="flex flex-col gap-0.5 overflow-hidden">
                                <span className="font-bold text-slate-900 text-[10px] truncate max-w-[120px]" title={lead.name}>{lead.name}</span>
                                {lead.program && (
                                  <span
                                    className="text-[9px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer hover:underline w-fit truncate block max-w-[120px]"
                                    onClick={(e) => handleClickableField(e, 'program', 'ChÆ°Æ¡ng trÃ¬nh', lead.program, 'bg-blue-100 text-blue-700')}
                                    title={lead.program}
                                  >
                                    {lead.program}
                                  </span>
                                )}
                              </div>
                            </td>
                          )}

                          {visibleColumns.includes('contact') && (
                            <td className={`${compactBodyCellClass} max-w-[150px] overflow-hidden text-[13px] font-bold text-slate-900`} title={lead.name}>
                              <span className="block truncate">{lead.name}</span>
                            </td>
                          )}
                          {visibleColumns.includes('company') && <td className={`${compactMetaCellClass} max-w-[96px] truncate`} title={(lead as any).company}>{(lead as any).company || '-'}</td>}
                          {visibleColumns.includes('email') && <td className={`${compactMetaCellClass} max-w-[124px] truncate`} title={lead.email}>{lead.email || '-'}</td>}
                          {visibleColumns.includes('phone') && <td className={`${compactBodyCellClass} text-right font-semibold text-slate-700`}>{lead.phone || '-'}</td>}
                          {visibleColumns.includes('salesperson') && (
                            <td className={compactBodyCellClass}>
                              {lead.ownerId ? (
                                <div className="flex items-center gap-2">
                                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${SALES_REPS.find((rep) => rep.id === lead.ownerId)?.color || 'bg-slate-100 text-slate-600'}`}>
                                    {SALES_REPS.find((rep) => rep.id === lead.ownerId)?.avatar || 'NA'}
                                  </span>
                                  <span className="truncate text-[12px] font-medium text-slate-700">{SALES_REPS.find((rep) => rep.id === lead.ownerId)?.name || '-'}</span>
                                </div>
                              ) : (
                                <span className="text-[12px] text-slate-400">ChÆ°a nháº­n</span>
                              )}
                            </td>
                          )}

                          {visibleColumns.includes('campaign') && (
                            <td className={`${compactBodyCellClass} max-w-[120px] overflow-hidden`} title={lead.marketingData?.campaign || (lead as any).campaign || '-'}>
                              <span className="block truncate">{lead.marketingData?.campaign || (lead as any).campaign || '-'}</span>
                            </td>
                          )}
                          {visibleColumns.includes('source') && (
                            <td className={compactBodyCellClass}>
                              <span
                                className="inline-flex max-w-[96px] items-center rounded-sm border border-teal-100 bg-teal-50/70 px-1.5 py-0 text-[10px] font-semibold text-teal-700"
                                onClick={(e) => handleClickableField(e, 'source', 'Nguá»“n', lead.source, 'bg-teal-100 text-teal-700')}
                                title={lead.source}
                              >
                                <span className="truncate">{lead.source || '-'}</span>
                              </span>
                            </td>
                          )}

                          {visibleColumns.includes('tags') && <td className={`${compactMetaCellClass} overflow-hidden`}>{(() => {
                            const tags = Array.isArray((lead as any).marketingData?.tags)
                              ? (lead as any).marketingData.tags
                              : (typeof (lead as any).marketingData?.tags === 'string'
                                ? (lead as any).marketingData.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
                                : []);

                            if (tags.length === 0) return '-';

                            // Show only first tag if many to save space
                            return (
                              <span className="rounded-sm border border-slate-200 bg-slate-100 px-1 py-0 text-[9px] font-semibold text-slate-700">
                                {tags[0]}{tags.length > 1 ? ` +${tags.length - 1}` : ''}
                              </span>
                            );
                          })()}</td>}
                          {visibleColumns.includes('market') && <td className={`${compactMetaCellClass} max-w-[110px] truncate`}>{(lead as any).marketingData?.market || '-'}</td>}
                          {visibleColumns.includes('product') && <td className={`${compactMetaCellClass} max-w-[120px] truncate`} title={lead.program || (lead as any).product}>{(lead as any).product || lead.program || '-'}</td>}

                          {/* Next Activity */}
                          {visibleColumns.includes('nextActivity') && (
                            <td className={compactMetaCellClass}>
                              {nextActivity ? (
                                <div className="flex max-w-[110px] items-center gap-1 overflow-hidden rounded-sm bg-purple-50 px-1 py-0 text-[9px] font-semibold text-purple-700" title={nextActivity.description}>
                                  <Clock size={8} className="shrink-0" />
                                  <span className="truncate">{nextActivity.description.split(':')[0] || 'Lá»‹ch háº¹n'}</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 text-[9px] text-slate-400">
                                  <Plus size={8} /> LÃªn lá»‹ch
                                </div>
                              )}
                            </td>
                          )}

                          {/* Deadline */}
                          {visibleColumns.includes('deadline') && (
                            <td className={`${compactMetaCellClass} text-right`}>
                              {deadline !== '-' ? <span className="text-red-600 font-bold">{deadline}</span> : '-'}
                            </td>
                          )}

                          {/* Revenue */}
                          {visibleColumns.includes('value') && (
                            <td className={`${compactMetaCellClass} text-right font-bold text-slate-800`}>
                              {lead.value ? lead.value.toLocaleString('vi-VN') : '-'}
                            </td>
                          )}

                          {visibleColumns.includes('createdAt') && (
                            <td className={`${compactBodyCellClass} text-right`}>
                              {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('vi-VN') : '-'}
                            </td>
                          )}

                          {visibleColumns.includes('title') && <td className={compactMetaCellClass}>{(lead as any).title || '-'}</td>}

                          {visibleColumns.includes('address') && (
                            <td className={`${compactMetaCellClass} max-w-[160px] truncate`} title={`${(lead as any).street || ''}, ${(lead as any).ward || ''}, ${(lead as any).city || ''}`}>
                              {[(lead as any).street, (lead as any).ward, (lead as any).city].filter(Boolean).join(', ') || '-'}
                            </td>
                          )}

                          {visibleColumns.includes('referredBy') && <td className={`${compactMetaCellClass} max-w-[90px] truncate`}>{(lead as any).referredBy || '-'}</td>}

                          {visibleColumns.includes('status') && (
                            <td className="px-2 py-1 text-center align-middle">
                              {(() => {
                                const allocationStatus = getAllocationStatusMeta(lead);
                                return (
                                  <span className={`inline-flex max-w-[78px] justify-center rounded-sm border px-1.5 py-0 text-[10px] font-semibold ${allocationStatus.className}`}>
                                    {allocationStatus.label}
                                  </span>
                                );
                              })()}
                            </td>
                          )}

                          {visibleColumns.includes('notes') && <td className={`${compactMetaCellClass} max-w-[140px] truncate text-slate-500`} title={(lead as any).notes || ''}>{(lead as any).notes || '-'}</td>}

                          {visibleColumns.includes('sla') && (
                            <td className={compactMetaCellClass}>
                              {lead.slaStatus === 'danger' || lead.slaStatus === 'warning' ? (
                                <span
                                  className={`font-bold text-[9px] ${lead.slaStatus === 'danger' ? 'text-red-600' : 'text-amber-600'} truncate block max-w-[80px]`}
                                  title={lead.slaReason || (lead.slaStatus === 'danger' ? 'QuÃ¡ háº¡n' : 'ChÃº Ã½')}
                                >
                                  {lead.slaReason || (lead.slaStatus === 'danger' ? 'QuÃ¡ háº¡n' : 'ChÃº Ã½')}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[9px]">-</span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </div>

        {/* EDIT MODAL - MARKETING VIEW */}
        {selectedLead && user?.role === UserRole.MARKETING && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedLead(null)}></div>
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
              <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Users size={20} className="text-blue-600" />
                  Chi tiáº¿t Lead: {selectedLead.name}
                </h3>
                <div className="flex items-center gap-3">
                  <button className="px-3 py-1.5 bg-white border border-slate-300 rounded text-slate-600 flex items-center gap-2 text-sm font-semibold hover:bg-slate-50">
                    <Phone size={16} /> Cuá»™c gá»i
                  </button>
                  <button onClick={() => setSelectedLead(null)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto bg-white p-6 md:p-8 custom-scrollbar">
                {/* TOP HEADER */}
                <div className="mb-6">
                  <label className="block text-slate-700 text-sm font-bold mb-2">MÃ´ táº£ / TÃªn khÃ¡ch hÃ ng <span className="text-red-500">*</span></label>
                  <div className="flex gap-3">
                    <select
                      className="w-28 px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none bg-white font-medium text-slate-700"
                      value={editLeadData.title}
                      onChange={e => setEditLeadData({ ...editLeadData, title: e.target.value })}
                    >
                      <option value="">Danh xÆ°ng</option>
                      <option value="Mr.">Anh</option>
                      <option value="Ms.">Chá»‹</option>
                      <option value="Phá»¥ huynh">Phá»¥ huynh</option>
                      <option value="Há»c sinh">Há»c sinh</option>
                    </select>
                    <input
                      className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm font-semibold focus:border-purple-500 outline-none text-slate-800"
                      placeholder="VD: Nguyen Van A..."
                      value={editLeadData.name}
                      onChange={e => setEditLeadData({ ...editLeadData, name: e.target.value })}
                    />
                  </div>
                </div>

                <div className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-5">
                  <div className="flex items-center gap-4">
                    <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Quá»‘c gia MT</label>
                    <select
                      className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none bg-white text-slate-700"
                      value={editLeadData.targetCountry}
                      onChange={e => setEditLeadData({ ...editLeadData, targetCountry: e.target.value })}
                    >
                      <option value="">-- Chá»n quá»‘c gia --</option>
                      {LEAD_TARGET_COUNTRY_OPTIONS.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* MAIN FORM GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-5">
                  {/* LEFT COL */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">CÆ¡ sá»Ÿ</label>
                      <select
                        className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none bg-white text-slate-700"
                        value={editLeadData.company}
                        onChange={e => setEditLeadData({ ...editLeadData, company: e.target.value })}
                      >
                        <option value="">-- Chá»n cÆ¡ sá»Ÿ --</option>
                        <option value="Hanoi">HÃ  Ná»™i</option>
                        <option value="HCMC">TP. HCM</option>
                        <option value="DaNang">ÄÃ  Náºµng</option>
                        <option value="HaiPhong">Háº£i PhÃ²ng</option>
                      </select>
                    </div>

                    {false && isClosedLeadStatus(editLeadData.status) && (
                      <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50/70 p-4">
                        <div className="flex items-center gap-4">
                          <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Lý do</label>
                          <select
                            className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm outline-none bg-white"
                            value={editLeadData.lossReason}
                            onChange={e => setEditLeadData({ ...editLeadData, lossReason: e.target.value })}
                          >
                            <option value="">-- Chọn lý do --</option>
                            {editCloseReasonOptions.map(reason => (
                              <option key={reason} value={reason}>{reason}</option>
                            ))}
                          </select>
                        </div>
                        {editLeadData.lossReason === CUSTOM_CLOSE_REASON && (
                          <div className="flex items-start gap-4">
                            <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold mt-2">Chi tiết</label>
                            <textarea
                              className="flex-1 min-h-[88px] rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none"
                              placeholder="Nhập lý do cụ thể..."
                              value={editLeadData.lossReasonCustom}
                              onChange={e => setEditLeadData({ ...editLeadData, lossReasonCustom: e.target.value })}
                            />
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex items-start gap-4">
                      <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold pt-2">Äá»‹a chá»‰</label>
                      <div className="flex-1 space-y-2">
                        <input
                          className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none text-slate-700"
                          placeholder="Sá»‘ nhÃ , Ä‘Æ°á»ng..."
                          value={editLeadData.street}
                          onChange={e => setEditLeadData({ ...editLeadData, street: e.target.value })}
                        />
                        <div className="grid grid-cols-3 gap-2">
                          <input className="px-2 py-2 border border-slate-300 rounded text-sm outline-none" placeholder="Tá»‰nh/TP" value={editLeadData.province} onChange={e => setEditLeadData({ ...editLeadData, province: e.target.value })} />
                          <input className="px-2 py-2 border border-slate-300 rounded text-sm outline-none" placeholder="Quáº­n/Huyá»‡n" value={editLeadData.city} onChange={e => setEditLeadData({ ...editLeadData, city: e.target.value })} />
                          <input className="px-2 py-2 border border-slate-300 rounded text-sm outline-none" placeholder="P/XÃ£" value={editLeadData.ward} onChange={e => setEditLeadData({ ...editLeadData, ward: e.target.value })} />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Sáº£n pháº©m</label>
                      <select
                        className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none bg-white text-slate-700"
                        value={editLeadData.product}
                        onChange={e => setEditLeadData({ ...editLeadData, product: e.target.value })}
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
                      <select className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm outline-none bg-white" value={editLeadData.market} onChange={e => setEditLeadData({ ...editLeadData, market: e.target.value })}>
                        <option value="">-- Chá»n --</option>
                        <option value="Vinh">Vinh</option>
                        <option value="HÃ  TÄ©nh">HÃ  TÄ©nh</option>
                        <option value="HÃ  Ná»™i">HÃ  Ná»™i</option>
                        <option value="Online">Online</option>
                      </select>
                    </div>
                  </div>

                  {/* RIGHT COL */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Äiá»‡n thoáº¡i <span className="text-red-500">*</span></label>
                      <input className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm outline-none font-medium text-slate-800" value={editLeadData.phone} onChange={e => setEditLeadData({ ...editLeadData, phone: e.target.value })} />
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Email</label>
                      <input className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm outline-none" value={editLeadData.email} onChange={e => setEditLeadData({ ...editLeadData, email: e.target.value })} />
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Phá»¥ trÃ¡ch</label>
                      <select className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm outline-none bg-white" value={editLeadData.salesperson} onChange={e => setEditLeadData({ ...editLeadData, salesperson: e.target.value })}>
                        <option value="">-- Sale phá»¥ trÃ¡ch --</option>
                        {SALES_REPS.map(rep => <option key={rep.id} value={rep.id}>{rep.name}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Tráº¡ng thÃ¡i</label>
                      <select className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm outline-none bg-white" value={editLeadData.status} onChange={e => setEditLeadData({ ...editLeadData, status: e.target.value, ...getCloseReasonStateForStatusChange(e.target.value, editLeadData.lossReason, editLeadData.lossReasonCustom) })}>
                        {STANDARD_LEAD_STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                    {isClosedLeadStatus(editLeadData.status) && (
                      <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50/70 p-4">
                        <div className="flex items-center gap-4">
                          <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Lý do</label>
                          <select
                            className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm outline-none bg-white"
                            value={editLeadData.lossReason}
                            onChange={e => setEditLeadData({ ...editLeadData, lossReason: e.target.value })}
                          >
                            <option value="">-- Chọn lý do --</option>
                            {editCloseReasonOptions.map(reason => (
                              <option key={reason} value={reason}>{reason}</option>
                            ))}
                          </select>
                        </div>
                        {editLeadData.lossReason === CUSTOM_CLOSE_REASON && (
                          <div className="flex items-start gap-4">
                            <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold mt-2">Chi tiết</label>
                            <textarea
                              className="flex-1 min-h-[88px] rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none"
                              placeholder="Nhập lý do cụ thể..."
                              value={editLeadData.lossReasonCustom}
                              onChange={e => setEditLeadData({ ...editLeadData, lossReasonCustom: e.target.value })}
                            />
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex items-start gap-4">
                      <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold mt-1.5">Tags</label>
                      <LeadTagManager
                        selectedTags={editLeadData.tags}
                        availableTags={availableTags}
                        fixedTags={FIXED_LEAD_TAGS}
                        isAdding={isAddingEditTag}
                        accent="blue"
                        mode="dropdown"
                        onStartAdding={() => setIsAddingEditTag(true)}
                        onStopAdding={() => setIsAddingEditTag(false)}
                        onAddTag={addTagToEditLead}
                        onCreateTag={(tag) => {
                          addTagCatalogEntry(tag);
                          addTagToEditLead(tag);
                        }}
                        onRemoveSelectedTag={(tag) => setEditLeadData((prev) => ({ ...prev, tags: prev.tags.filter((item) => item !== tag) }))}
                        onDeleteTag={deleteTagCatalogEntry}
                      />
                  </div>
                </div>
                </div>

                {/* TABS SECTION */}
                <div className="mt-8 border-t border-slate-200 pt-4">
                  <div className="flex border-b border-slate-200 mb-4">
                    <button onClick={() => setEditModalActiveTab('notes')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${editModalActiveTab === 'notes' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500'}`}>Ghi chÃº ná»™i bá»™</button>
                    <button onClick={() => setEditModalActiveTab('student')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${editModalActiveTab === 'student' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500'}`}>ThÃ´ng tin há»c sinh</button>
                    <button onClick={() => setEditModalActiveTab('extra')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${editModalActiveTab === 'extra' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500'}`}>ThÃ´ng tin thÃªm (Marketing)</button>
                  </div>
                  <div className="min-h-[150px]">
                    {editModalActiveTab === 'notes' && (
                      <textarea className="w-full p-3 border border-slate-200 rounded text-sm outline-none h-32" value={editLeadData.notes} onChange={e => setEditLeadData({ ...editLeadData, notes: e.target.value })} />
                    )}
                    {editModalActiveTab === 'student' && (
                      <LeadStudentInfoTab data={editLeadData} onPatch={patchEditLeadData} />
                    )}
                    {editModalActiveTab === 'extra' && (
                      <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                        <div className="flex items-center gap-4">
                          <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Chiáº¿n dá»‹ch</label>
                          <input className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm outline-none" value={editLeadData.campaign} onChange={e => setEditLeadData({ ...editLeadData, campaign: e.target.value })} />
                        </div>
                        <div className="flex items-center gap-4">
                          <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Nguá»“n</label>
                          <select className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm outline-none bg-white" value={editLeadData.source} onChange={e => setEditLeadData({ ...editLeadData, source: e.target.value })}>
                            <option value="hotline">Hotline</option>
                            <option value="facebook">Facebook</option>
                            <option value="google">Google Ads</option>
                            <option value="referral">Giá»›i thiá»‡u</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-4">
                          <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">KÃªnh</label>
                          <select className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm outline-none bg-white" value={editLeadData.channel} onChange={e => setEditLeadData({ ...editLeadData, channel: e.target.value })}>
                            <option value="">-- Chá»n kÃªnh --</option>
                            {LEAD_CHANNEL_OPTIONS.map(option => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center gap-4">
                          <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">NgÆ°á»i GT</label>
                          <input className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm outline-none" value={editLeadData.referredBy} onChange={e => setEditLeadData({ ...editLeadData, referredBy: e.target.value })} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 shrink-0">
                <button onClick={() => setSelectedLead(null)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg">ÄÃ³ng</button>
                <button onClick={handleUpdateSelectedLead} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center gap-2 shadow-sm"><Save size={18} /> Cáº­p nháº­t</button>
              </div>
            </div>
          </div>
        )}

        {/* CREATE LIST MODAL - ODOO STYLE */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowCreateModal(false)}></div>
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
                  <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto bg-white p-6 md:p-8 custom-scrollbar">

                {/* TOP HEADER: TITLE / NAME */}
                {/* TOP HEADER: TITLE / NAME */}
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

                {/* MAIN FORM GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-5">

                  {/* LEFT COL */}
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
                    {/* Company */}
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

                    {/* Address Group */}
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

                    {/* Product */}
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
                      <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">CÆ¡ sá»Ÿ</label>
                      <select
                        className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none bg-white text-slate-700"
                        value={newLeadData.market}
                        onChange={e => setNewLeadData({ ...newLeadData, market: e.target.value })}
                      >
                        <option value="">-- Chá»n cÆ¡ sá»Ÿ --</option>
                        {LEAD_CAMPUS_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>

                    {false && (
                      <>
                    {/* Market */}
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

                      </>
                    )}
                  </div>

                  {/* RIGHT COL */}
                  <div className="space-y-4">
                    {/* Phone */}
                    <div className="flex items-center gap-4">
                      <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Äiá»‡n thoáº¡i <span className="text-red-500">*</span></label>
                      <input
                        className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none text-slate-800 font-medium"
                        placeholder="0912..."
                        value={newLeadData.phone}
                        onChange={e => setNewLeadData({ ...newLeadData, phone: e.target.value })}
                      />
                    </div>

                    {/* Email */}
                    <div className="flex items-center gap-4">
                      <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Email</label>
                      <input
                        className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none text-slate-700 placeholder:text-slate-400"
                        placeholder="email@example.com"
                        value={newLeadData.email}
                        onChange={e => setNewLeadData({ ...newLeadData, email: e.target.value })}
                      />
                    </div>

                    {/* Salesperson */}
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

                    {/* Status */}
                    <div className="flex items-center gap-4">
                      <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Tráº¡ng thÃ¡i</label>
                      <select
                        className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none bg-white text-slate-700"
                        value={newLeadData.status}
                        onChange={e => setNewLeadData({ ...newLeadData, status: e.target.value, ...getCloseReasonStateForStatusChange(e.target.value, newLeadData.lossReason, newLeadData.lossReasonCustom) })}
                      >
                        {STANDARD_LEAD_STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>

                    {isClosedLeadStatus(newLeadData.status) && (
                      <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50/70 p-4">
                        <div className="flex items-center gap-4">
                          <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Lý do</label>
                          <select
                            className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm outline-none bg-white"
                            value={newLeadData.lossReason}
                            onChange={e => setNewLeadData({ ...newLeadData, lossReason: e.target.value })}
                          >
                            <option value="">-- Chọn lý do --</option>
                            {newCloseReasonOptions.map(reason => (
                              <option key={reason} value={reason}>{reason}</option>
                            ))}
                          </select>
                        </div>
                        {newLeadData.lossReason === CUSTOM_CLOSE_REASON && (
                          <div className="flex items-start gap-4">
                            <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold mt-2">Chi tiết</label>
                            <textarea
                              className="flex-1 min-h-[88px] rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none"
                              placeholder="Nhập lý do cụ thể..."
                              value={newLeadData.lossReasonCustom}
                              onChange={e => setNewLeadData({ ...newLeadData, lossReasonCustom: e.target.value })}
                            />
                          </div>
                        )}
                      </div>
                    )}

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

                {/* TABS SECTION */}
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

                  {/* Fixed Height Container to prevent layout jump */}
                  <div className="min-h-[200px]">
                    {/* TAB: NOTES */}
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

                    {/* TAB: EXTRA */}
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
                <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg">Há»§y bá»</button>
                <button onClick={handleCreateSubmit} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center gap-2 shadow-sm"><Save size={18} /> LÆ°u Lead má»›i</button>
              </div>
            </div>
          </div>
        )}

        {/* ASSIGN MODAL */}
        {showAssignModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeAssignModal}></div>
            <div className="relative w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-2xl animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-[#e8edf3] bg-[#f6f7f8] px-4 py-3">
                <h3 className="flex items-center gap-2 text-[15px] font-bold text-slate-900">
                  <UserPlus size={18} className="text-blue-600" />
                  PhÃ¢n bá»• Lead
                </h3>
                <button onClick={closeAssignModal} className="rounded-sm p-1 text-slate-400 hover:bg-white hover:text-slate-600"><X size={18} /></button>
              </div>

              <div className="space-y-4 p-4">
                <div className="flex items-start gap-2 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-[12px] text-blue-800">
                  <Users size={16} className="mt-0.5 shrink-0" />
                  <p>Báº¡n Ä‘ang phÃ¢n bá»• <span className="font-bold">{selectedLeadIds.length}</span> lead cho nhÃ¢n viÃªn kinh doanh.</p>
                </div>

                <div className="rounded-md border border-[#e8edf3] bg-[#fafbfc] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[13px] font-bold text-slate-800">PhÃ¢n bá»• theo pháº§n trÄƒm</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">Nháº­p tá»· lá»‡ cho tá»«ng sale. Tá»•ng pháº£i báº±ng 100%.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={fillAssignmentRatiosEvenly}
                        className={compactToolbarButtonClass}
                      >
                        Chia Ä‘á»u
                      </button>
                      <button
                        type="button"
                        onClick={resetAssignModal}
                        className={compactToolbarButtonClass}
                      >
                        Reset
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-2">
                    <div>
                      <div className="text-[11px] text-slate-500">Tá»•ng tá»· lá»‡</div>
                      <div className={`text-[15px] font-bold ${assignmentRatioTotal === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>{assignmentRatioTotal}%</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500">Tá»•ng lead</div>
                      <div className="text-[15px] font-bold text-slate-900">{selectedLeadIds.length}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500">Sá»‘ sale tham gia</div>
                      <div className="text-[15px] font-bold text-slate-900">{Object.values(assignmentRatioValues).filter((value) => value > 0).length}</div>
                    </div>
                  </div>
                </div>

                <div className="animate-in slide-in-from-top-2">
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.08em] text-[#7b8794]">Tá»· lá»‡ theo nhÃ¢n viÃªn</label>
                  <div className="max-h-[340px] overflow-y-auto custom-scrollbar">
                    {SALES_REPS.map((rep) => {
                      const ratioValue = assignmentRatios[rep.id] || '';
                      const ratio = assignmentRatioValues[rep.id] || 0;
                      const leadCount = assignmentLeadCounts[rep.id] || 0;
                      const isActive = ratio > 0 || ratioValue !== '';

                      return (
                        <div
                          key={rep.id}
                          className={`border-b border-[#f1f5f9] py-2 transition-colors ${isActive ? 'bg-blue-50/40' : 'bg-white'}`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold ${rep.color}`}>
                              {rep.avatar}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] font-semibold text-slate-900">{rep.name}</p>
                              <p className="text-[11px] text-slate-500">{rep.team}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={ratioValue}
                                onChange={(e) => updateAssignmentRatio(rep.id, e.target.value)}
                                placeholder="0"
                                className="w-16 rounded-sm border border-slate-300 bg-white px-2 py-1 text-[13px] font-semibold text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                              />
                              <span className="text-[13px] font-bold text-slate-500">%</span>
                            </div>
                          </div>

                          <div className="mt-1 flex items-center justify-between gap-3 pl-10">
                            <p className="text-[11px] text-slate-600">
                              {ratio > 0 ? `Dá»± kiáº¿n nháº­n ${leadCount} lead (${ratio}%)` : 'ChÆ°a tham gia phÃ¢n bá»•'}
                            </p>
                            <button
                              type="button"
                              onClick={() => setSingleRepAssignment(rep.id)}
                              className="rounded-sm border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-100"
                            >
                              100% cho sale nÃ y
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-[#e8edf3] bg-[#f6f7f8] px-4 py-3">
                <button onClick={closeAssignModal} className="rounded-sm px-3 py-1.5 text-[12px] font-bold text-slate-600 hover:bg-slate-200">Há»§y</button>
                <button
                  onClick={handleAssignSubmit}
                  className={`rounded-sm px-4 py-1.5 text-[12px] font-bold text-white transition-colors ${assignmentRatioTotal === 100 ? 'bg-blue-600 hover:bg-blue-700' : 'cursor-not-allowed bg-slate-400'}`}
                  disabled={assignmentRatioTotal !== 100}
                >
                  XÃ¡c nháº­n PhÃ¢n bá»•
                </button>
              </div>
            </div>
          </div>
        )}
        {/* IMPORT EXCEL MODAL */}
        {showImportModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowImportModal(false)}></div>
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95">

              {/* Header */}
              <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Nháº­p dá»¯ liá»‡u Lead tá»« Excel</h2>
                  <p className="text-slate-500 text-sm mt-1">Há»— trá»£ Ä‘á»‹nh dáº¡ng .xlsx, .csv</p>
                </div>
                <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-200 rounded-full"><X size={24} /></button>
              </div>

              {/* Stepper */}
              <div className="bg-white border-b border-slate-200 py-4 px-12">
                <div className="flex items-center justify-between relative">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 -z-10"></div>
                  <div className={`flex flex-col items-center gap-2 z-10 ${importStep >= 1 ? 'text-blue-600' : 'text-slate-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${importStep >= 1 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-300'}`}>1</div>
                    <span className="text-xs font-bold">Táº£i lÃªn</span>
                  </div>
                  <div className={`flex flex-col items-center gap-2 z-10 ${importStep >= 2 ? 'text-blue-600' : 'text-slate-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${importStep >= 2 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-300'}`}>2</div>
                    <span className="text-xs font-bold">GhÃ©p & PhÃ¢n bá»•</span>
                  </div>
                  <div className={`flex flex-col items-center gap-2 z-10 ${importStep >= 3 ? 'text-blue-600' : 'text-slate-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${importStep >= 3 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-300'}`}>3</div>
                    <span className="text-xs font-bold">HoÃ n táº¥t</span>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
                {/* STEP 1: UPLOAD */}
                {importStep === 1 && (
                  <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto space-y-6">
                    <div
                      className="w-full h-64 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center bg-white hover:bg-blue-50 hover:border-blue-400 transition-all cursor-pointer relative group select-none"
                      onClick={openImportFilePicker}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          openImportFilePicker();
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <input id="lead-import-file-input" ref={importFileInputRef} type="file" accept=".csv, .xlsx, .xls" onChange={handleFileSelect} className="sr-only" />
                      <label htmlFor="lead-import-file-input" className="absolute inset-0 z-10 cursor-pointer" aria-label="Chon tep import lead" />
                      <div className="pointer-events-none w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <UploadCloud size={32} />
                      </div>
                      <p className="text-lg font-bold text-slate-700">KÃ©o tháº£ hoáº·c chá»n tá»‡p tin</p>
                      <p className="text-sm text-slate-500 mt-2">Há»— trá»£ .CSV, .XLSX (Tá»‘i Ä‘a 5MB)</p>
                    </div>

                    <div className="flex gap-4">
                      <button onClick={handleDownloadTemplate} className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm hover:underline">
                        <Download size={16} /> Táº£i tá»‡p máº«u chuáº©n (Template_Leads.xlsx)
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2: VALIDATION & ALLOCATION */}
                {importStep === 2 && (
                  <div className="grid grid-cols-12 gap-8 h-full">
                    {/* LEFT: VALIDATION REPORT */}
                    <div className="col-span-7 flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="p-4 border-b border-slate-100 bg-slate-50 font-bold text-slate-700 flex justify-between items-center">
                        <span>Káº¿t quáº£ kiá»ƒm tra dá»¯ liá»‡u</span>
                        <div className="flex gap-2">
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-bold">Há»£p lá»‡: {validImportRows.length}</span>
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-bold">Lá»—i: {importErrors.length}</span>
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto p-0 custom-scrollbar relative">
                        {importErrors.length === 0 && validImportRows.length > 0 && (
                          <div className="flex flex-col items-center justify-center h-full text-slate-500 p-8 text-center">
                            <CheckCircle size={48} className="text-green-500 mb-4" />
                            <p className="font-bold text-lg text-slate-800">Táº¥t cáº£ dá»¯ liá»‡u há»£p lá»‡!</p>
                            <p className="text-sm">File cá»§a báº¡n Ä‘Ã£ sáºµn sÃ ng Ä‘á»ƒ nháº­p vÃ o há»‡ thá»‘ng.</p>
                          </div>
                        )}

                        {importErrors.length > 0 && (
                          <table className="w-full text-sm">
                            <thead className="bg-red-50 text-red-800 font-semibold border-b border-red-100 sticky top-0">
                              <tr>
                                <th className="p-3 text-left w-20">DÃ²ng</th>
                                <th className="p-3 text-left w-40">TÃªn Lead</th>
                                <th className="p-3 text-left">Chi tiáº¿t lá»—i</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {importErrors.map((err, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                  <td className="p-3 font-medium text-slate-600">#{err.row}</td>
                                  <td className="p-3 font-medium text-slate-800">{err.name || '-'}</td>
                                  <td className="p-3 text-red-600">
                                    <ul className="list-disc list-inside">
                                      {err.errors.map((e, i) => <li key={i}>{e}</li>)}
                                    </ul>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}

                        {rawImportData.length === 0 && (
                          <div className="p-8 text-center text-slate-500 italic">KhÃ´ng tÃ¬m tháº¥y dá»¯ liá»‡u hoáº·c file rá»—ng.</div>
                        )}
                      </div>

                      {importErrors.length > 0 && (
                        <div className="p-3 bg-red-50 border-t border-red-100 text-xs text-red-700 flex items-center gap-2">
                          <AlertTriangle size={14} />
                          <span>Há»‡ thá»‘ng sáº½ chá»‰ nháº­p cÃ¡c dÃ²ng há»£p lá»‡ ({validImportRows.length} dÃ²ng). CÃ¡c dÃ²ng lá»—i sáº½ bá»‹ bá» qua.</span>
                        </div>
                      )}
                    </div>

                    {/* RIGHT: CONFIG */}
                    <div className="col-span-5 flex flex-col gap-6">
                      {/* Allocation Config */}
                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 h-full">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Users size={18} className="text-blue-600" /> Cáº¥u hÃ¬nh phÃ¢n bá»•</h3>

                        <div className="space-y-4">
                          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                            <p className="text-sm font-bold text-slate-800 mb-1">Cháº¿ Ä‘á»™ phÃ¢n bá»• tá»« Admin</p>
                            <div className="flex items-center gap-2">
                              <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border bg-slate-100 text-slate-600 border-slate-200">
                                Thá»§ cÃ´ng
                              </span>
                              <span className="text-xs text-slate-500">
                                Admin &gt; Quy táº¯c tá»± Ä‘á»™ng hÃ³a Ä‘Ã£ chá»‰ giá»¯ luá»“ng phÃ¢n cÃ´ng thá»§ cÃ´ng.
                              </span>
                            </div>
                          </div>

                          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                            Cháº¿ Ä‘á»™ thá»§ cÃ´ng Ä‘ang báº­t: lead há»£p lá»‡ sáº½ Ä‘Æ°á»£c nháº­p vÃ o há»‡ thá»‘ng nhÆ°ng chÆ°a phÃ¢n bá»•.
                            Admin/Leader sáº½ phÃ¢n cÃ´ng sau.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3: REVIEW & TAGS */}
                {importStep === 3 && (
                  <div className="flex flex-col h-full max-w-3xl mx-auto">
                    <div className="text-center mb-8">
                      <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                        <CheckCircle size={32} />
                      </div>
                      <h3 className="text-2xl font-bold text-slate-900">Sáºµn sÃ ng nháº­p liá»‡u!</h3>
                      <p className="text-slate-500 mt-2">Vui lÃ²ng kiá»ƒm tra thÃ´ng tin láº§n cuá»‘i trÆ°á»›c khi nháº­p vÃ o há»‡ thá»‘ng.</p>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 space-y-6">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">TÃªn Ä‘á»£t nháº­p liá»‡u (Import Batch Name)</label>
                        <input
                          className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 font-medium focus:border-blue-500 outline-none bg-slate-50"
                          value={importBatchName}
                          onChange={(e) => setImportBatchName(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Tháº» phÃ¢n loáº¡i bá»• sung (Tags)</label>
                        <div className="p-3 border border-slate-300 rounded-lg bg-white flex flex-wrap gap-2 focus-within:border-blue-500 transition-colors">
                          {importTags.map(tag => (
                            <span key={tag} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                              {tag} <button onClick={() => setImportTags(importTags.filter(t => t !== tag))}><X size={12} /></button>
                            </span>
                          ))}
                          <input
                            className="flex-1 min-w-[120px] outline-none text-sm p-1"
                            placeholder="Nháº­p tag vÃ  áº¥n Enter..."
                            value={newTagInput}
                            onChange={(e) => setNewTagInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && newTagInput.trim()) {
                                e.preventDefault();
                                if (!importTags.includes(newTagInput.trim())) {
                                  setImportTags([...importTags, newTagInput.trim()]);
                                }
                                setNewTagInput('');
                              }
                            }}
                          />
                        </div>
                        <div className="mt-3 flex gap-2">
                          {['Summer Camp 2024', 'Workshop T10', 'Hot Lead'].map(tag => (
                            <button
                              key={tag}
                              onClick={() => !importTags.includes(tag) && setImportTags([...importTags, tag])}
                              className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded hover:bg-slate-200"
                            >
                              + {tag}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Buttons */}
              <div className="p-6 border-t border-slate-200 bg-white flex justify-end gap-3">
                {importStep > 1 && (
                  <button
                    onClick={() => setImportStep(prev => (prev - 1) as 1 | 2 | 3)}
                    className="px-6 py-2.5 border border-slate-300 rounded-lg text-slate-700 font-bold hover:bg-slate-50 transition-colors"
                  >
                    Quay láº¡i
                  </button>
                )}

                {importStep < 3 ? (
                  <button
                    onClick={() => {
                      if (importStep === 1 && !importFile) return alert("Vui lÃ²ng chá»n file!");
                      setImportStep(prev => (prev + 1) as 1 | 2 | 3);
                    }}
                    className={`px-8 py-2.5 bg-blue-600 text-white rounded-lg font-bold shadow-lg shadow-blue-200 transition-all flex items-center gap-2 ${(!importFile && importStep === 1) ? 'opacity-50 cursor-not-allowed' : (validImportRows.length === 0 && importStep === 2) ? 'bg-slate-400 cursor-not-allowed text-slate-200 shadow-none' : 'hover:bg-blue-700 hover:scale-105'}`}
                    disabled={validImportRows.length === 0 && importStep === 2}
                  >
                    Tiáº¿p tá»¥c & Review <ArrowRight size={18} />
                  </button>
                ) : (
                  <button
                    onClick={handleImportSubmit}
                    className="px-8 py-2.5 bg-green-600 text-white rounded-lg font-bold shadow-lg shadow-green-200 transition-all flex items-center gap-2 hover:bg-green-700 hover:scale-105"
                  >
                    <CheckCircle size={18} /> XÃ¡c nháº­n Nháº­p (Import)
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* DUPLICATE GROUPS MODAL */}
        {showDuplicateModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowDuplicateModal(false)}></div>
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[80vh]">
              <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-amber-50 shrink-0">
                <h3 className="text-lg font-bold text-amber-900 flex items-center gap-2">
                  <AlertTriangle size={20} className="text-amber-600" />
                  Danh sÃ¡ch Lead trÃ¹ng Sá»‘ Ä‘iá»‡n thoáº¡i
                </h3>
                <button onClick={() => setShowDuplicateModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {duplicateGroups.length === 0 ? (
                  <div className="text-center py-10">
                    <CheckCircle size={48} className="mx-auto text-green-500 mb-4 opacity-20" />
                    <p className="text-slate-500">Tuyá»‡t vá»i! KhÃ´ng tÃ¬m tháº¥y Lead nÃ o bá»‹ trÃ¹ng SÄT.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {duplicateGroups.map((group) => (
                      <div
                        key={group.phone}
                        onClick={() => setSelectedDuplicateGroup(group)}
                        className="p-4 border border-slate-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-all group"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-bold text-slate-900 group-hover:text-blue-700">SÄT: {group.phone}</p>
                            <p className="text-sm text-slate-500">{group.leads.length} báº£n ghi bá»‹ trÃ¹ng</p>
                          </div>
                          <div className="flex -space-x-2">
                            {group.leads.slice(0, 3).map((l: any) => (
                              <div key={l.id} className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 shadow-sm" title={l.name}>
                                {l.name.charAt(0)}
                              </div>
                            ))}
                            {group.leads.length > 3 && (
                              <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500 shadow-sm">
                                +{group.leads.length - 3}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 text-xs flex gap-2">
                          {group.leads.map((l: any) => (
                            <span key={l.id} className="bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600">{l.name}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SIDE-BY-SIDE COMPARISON MODAL */}
        {selectedDuplicateGroup && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={() => setSelectedDuplicateGroup(null)}></div>
            <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-7xl overflow-hidden animate-in slide-in-from-bottom-4 flex flex-col max-h-[95vh]">
              <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
                <div>
                  <h3 className="text-xl font-black text-slate-900 flex items-center gap-2 uppercase tracking-tighter">
                    <Database size={24} className="text-blue-600" />
                    So sÃ¡nh Lead trÃ¹ng: {selectedDuplicateGroup.phone}
                  </h3>
                  <p className="text-sm text-slate-500">Xem vÃ  so sÃ¡nh thÃ´ng tin giá»¯a cÃ¡c báº£n ghi Ä‘á»ƒ quyáº¿t Ä‘á»‹nh xá»­ lÃ½.</p>
                </div>
                <button onClick={() => setSelectedDuplicateGroup(null)} className="p-2 hover:bg-slate-200 rounded transition-colors"><X size={24} /></button>
              </div>

              <div className="flex-1 overflow-x-auto overflow-y-auto p-4 custom-scrollbar bg-slate-100">
                <div className="flex gap-3 w-full pb-2">
                  {selectedDuplicateGroup.leads.map((lead: ILead) => (
                    <div key={lead.id} className="flex-1 min-w-[300px] bg-white rounded-md border border-slate-200 hover:border-blue-400 transition-all shadow-sm flex flex-col">
                      <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">ID: {lead.id}</p>
                          <h4 className="font-bold text-slate-900 text-base">{lead.name}</h4>
                          <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded mt-1 inline-block uppercase">
                            {getLeadStatusLabel(lead.status as string)}
                          </span>
                        </div>
                        <button
                          onClick={() => { setSelectedLead(lead); setSelectedDuplicateGroup(null); setShowDuplicateModal(false); }}
                          className="p-1.5 bg-white border border-slate-200 rounded text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                          title="Chá»‰nh sá»­a Lead nÃ y"
                        >
                          <Eye size={16} />
                        </button>
                      </div>

                      <div className="p-3 space-y-3 text-sm flex-1">
                        <section>
                          <p className="text-[9px] font-bold text-slate-400 uppercase mb-1 tracking-widest">ThÃ´ng tin cÆ¡ báº£n</p>
                          <div className="space-y-1 bg-slate-50 p-2 rounded-md border border-slate-100">
                            <div className="flex justify-between"><span className="text-slate-500 text-xs">SÄT:</span> <span className="font-bold text-slate-900">{lead.phone}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500 text-xs">Email:</span> <span className="font-medium text-slate-700 truncate max-w-[150px]" title={lead.email}>{lead.email || '-'}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500 text-xs">CÆ¡ sá»Ÿ:</span> <span className="font-medium text-slate-700">{lead.company || '-'}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500 text-xs">D.xÆ°ng:</span> <span className="font-medium text-slate-700">{(lead as any).title || '-'}</span></div>
                          </div>
                        </section>

                        <section>
                          <p className="text-[9px] font-bold text-slate-400 uppercase mb-1 tracking-widest">Marketing & Nguá»“n</p>
                          <div className="space-y-1 bg-slate-50 p-2 rounded-md border border-slate-100">
                            <div className="flex justify-between"><span className="text-slate-500 text-xs">Nguá»“n:</span> <span className="font-medium text-slate-700">{lead.source || '-'}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500 text-xs">Chiáº¿n dá»‹ch:</span> <span className="font-medium text-slate-700">{lead.marketingData?.campaign || '-'}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500 text-xs">Ng.giá»›i thiá»‡u:</span> <span className="font-medium text-slate-700">{(lead as any).referredBy || '-'}</span></div>
                            <div className="flex justify-between items-start"><span className="text-slate-500 text-xs">Tags:</span> <div className="flex flex-wrap gap-1 justify-end">{lead.marketingData?.tags?.length ? lead.marketingData.tags.map((t: string) => <span key={t} className="bg-white border text-[9px] px-1 rounded-sm">{t}</span>) : '-'}</div></div>
                          </div>
                        </section>

                        <section>
                          <p className="text-[9px] font-bold text-slate-400 uppercase mb-1 tracking-widest">Lá»‹ch sá»­ & Phá»¥ trÃ¡ch</p>
                          <div className="space-y-1 bg-slate-50 p-2 rounded-md border border-slate-100">
                            <div className="flex justify-between"><span className="text-slate-500 text-xs">NgÃ y táº¡o:</span> <span className="font-medium text-slate-700">{new Date(lead.createdAt).toLocaleDateString('vi-VN')}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500 text-xs">Phá»¥ trÃ¡ch:</span> <span className="font-bold text-blue-600">{SALES_REPS.find(r => r.id === lead.ownerId)?.name || 'ChÆ°a phÃ¢n'}</span></div>
                          </div>
                        </section>

                        <section>
                          <p className="text-[9px] font-bold text-slate-400 uppercase mb-1 tracking-widest">Ghi chÃº</p>
                          <div className="bg-slate-50 p-2 rounded-md border border-slate-100 text-[11px] text-slate-600 min-h-[50px] leading-relaxed">
                            {lead.notes || 'KhÃ´ng cÃ³ ghi chÃº.'}
                          </div>
                        </section>
                      </div>

                      <div className="p-3 border-t border-slate-50 bg-slate-50/30 flex gap-2">
                        <button
                          onClick={() => { if (confirm("XÃ³a báº£n ghi trÃ¹ng nÃ y?")) { const filtered = leads.filter(l => l.id !== lead.id); setLeads(filtered); saveLeads(filtered); setSelectedDuplicateGroup((prev: any) => ({ ...prev!, leads: prev!.leads.filter((l: any) => l.id !== lead.id) })); } }}
                          className="flex-1 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded text-[11px] font-bold transition-all uppercase"
                        >
                          XÃ³a
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 border-t border-slate-200 bg-slate-50 flex justify-end shrink-0">
                <button onClick={() => setSelectedDuplicateGroup(null)} className="px-8 py-2 bg-slate-900 text-white font-bold rounded shadow hover:bg-slate-800 transition-all text-sm uppercase">Xong</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* LOSS MODAL */}
      {showLossModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-red-600 flex items-center gap-2"><Ban size={20} /> XÃ¡c nháº­n tháº¥t báº¡i</h3>
              <button
                onClick={() => { setShowLossModal(false); setLossModalLeadIds([]); setLossStatus(STANDARD_LEAD_STATUS.LOST); setLossReason(''); setCustomLossReason(''); }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <p className="text-sm text-slate-600 mb-4">
                Báº¡n Ä‘ang Ä‘Ã¡nh dáº¥u <strong>{lossModalLeadIds.length}</strong> lead lÃ  tháº¥t báº¡i.
                Vui lÃ²ng chá»n lÃ½ do Ä‘á»ƒ há»‡ thá»‘ng ghi nháº­n:
              </p>

              <select
                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm mb-3 bg-white font-bold outline-none focus:ring-2 focus:ring-blue-500"
                value={lossStatus}
                onChange={e => {
                  const nextStatus = e.target.value;
                  const nextReasonState = getCloseReasonStateForStatusChange(nextStatus, lossReason, customLossReason);
                  setLossStatus(nextStatus);
                  setLossReason(nextReasonState.lossReason);
                  setCustomLossReason(nextReasonState.lossReasonCustom);
                }}
              >
                {CLOSED_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>

              <select
                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm mb-4 bg-white font-bold outline-none focus:ring-2 focus:ring-blue-500"
                value={lossReason}
                onChange={e => setLossReason(e.target.value)}
              >
                <option value="">-- Chá»n lÃ½ do --</option>
                {bulkCloseReasonOptions.map(reason => (
                  <option key={reason} value={reason}>{reason}</option>
                ))}
              </select>

              {lossReason === 'LÃ½ do khÃ¡c' && (
                <textarea
                  className="w-full p-3 border border-slate-300 rounded-lg text-sm mb-4 h-24 outline-none focus:ring-2 focus:ring-blue-500 animate-in slide-in-from-top-2"
                  placeholder="Vui lÃ²ng nháº­p lÃ½ do cá»¥ thá»ƒ..."
                  value={customLossReason}
                  onChange={e => setCustomLossReason(e.target.value)}
                ></textarea>
              )}

              {lossReason === CUSTOM_CLOSE_REASON && (
                <textarea
                  className="w-full p-3 border border-slate-300 rounded-lg text-sm mb-4 h-24 outline-none focus:ring-2 focus:ring-blue-500 animate-in slide-in-from-top-2"
                  placeholder="Nhập lý do cụ thể..."
                  value={customLossReason}
                  onChange={e => setCustomLossReason(e.target.value)}
                ></textarea>
              )}

              <div className="hidden items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg border border-red-100 text-xs italic">
                <AlertTriangle size={14} className="shrink-0" />
                <span>HÃ nh Ä‘á»™ng nÃ y sáº½ cáº­p nháº­t tráº¡ng thÃ¡i cá»§a lead sang <strong>LOST</strong>.</span>
              </div>
            </div>

            <div className="px-6 pt-0 pb-4">
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg border border-red-100 text-xs italic">
                <AlertTriangle size={14} className="shrink-0" />
                <span>Lead sẽ được chuyển sang <strong>{getLeadStatusLabel(lossStatus).toUpperCase()}</strong> và bắt buộc lưu lý do.</span>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 text-sm">
              <button
                onClick={() => { setShowLossModal(false); setLossModalLeadIds([]); setLossStatus(STANDARD_LEAD_STATUS.LOST); setLossReason(''); setCustomLossReason(''); }}
                className="px-5 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Há»§y
              </button>
              <button
                onClick={handleConfirmLoss}
                className="px-5 py-2 font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-lg shadow-red-200 transition-all font-bold"
              >
                XÃ¡c nháº­n LOST
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedLead && user?.role !== UserRole.MARKETING && (
        <UnifiedLeadDrawer
          isOpen={!!selectedLead}
          onClose={() => setSelectedLead(null)}
          lead={selectedLead}
          onUpdate={handleUpdateLead}
        />
      )}
    </>
  );
};

export default Leads;




