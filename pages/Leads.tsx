
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ILead, LeadStatus, UserRole } from '../types';
import SLABadge from '../components/SLABadge';
import ConvertLeadModal, { ConvertLeadModalSubmitData } from '../components/ConvertLeadModal';
import UnifiedLeadDrawer from '../components/UnifiedLeadDrawer';
import LeadDrawerProfileForm from '../components/LeadDrawerProfileForm';
import LeadPivotTable from '../components/LeadPivotTable'; // Import Pivot Component
import LeadStudentInfoTab from '../components/LeadStudentInfoTab';
import LeadTagManager from '../components/LeadTagManager';
import SmartSearchBar, { SearchFilter } from '../components/SmartSearchBar';
import { useAuth } from '../contexts/AuthContext';
import { FIXED_LEAD_TAGS, KEYS, getLeads, saveLead, saveLeads, deleteLead, getTags, saveTags, getClosedLeadReasons, getSalesTeams } from '../utils/storage';
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
  isLeadStatusOneOf,
  isClosedLeadStatusKey,
  LEAD_STATUS_KEYS,
  LEAD_STATUS_OPTIONS,
  normalizeLeadStatusKey,
  toLeadStatusValue,
} from '../utils/leadStatus';
import { appendLeadLogs, buildLeadActivityLog, buildLeadAuditChange, buildLeadAuditLog } from '../utils/leadLogs';
import { decodeMojibakeReactNode, decodeMojibakeText } from '../utils/mojibake';
import { getLeadPhoneValidationMessage, isValidLeadPhone, normalizeLeadPhone } from '../utils/phone';
import { convertLeadToOpportunity } from '../utils/leadConversion';
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
  { id: 'u2', name: 'Sarah Miller', team: 'Team Ã„ÂÃ¡Â»Â©c', avatar: 'SM', color: 'bg-purple-100 text-purple-700' },
  { id: 'u3', name: 'David Clark', team: 'Team Trung', avatar: 'DC', color: 'bg-blue-100 text-blue-700' },
  { id: 'u4', name: 'Alex Rivera', team: 'Team Du hÃ¡Â»Âc', avatar: 'AR', color: 'bg-green-100 text-green-700' },
];

const normalizeAssignFilterToken = (value?: string) =>
  decodeMojibakeText(String(value || ''))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const buildEmptyAssignmentRatios = () =>
  SALES_REPS.reduce<Record<string, string>>((acc, rep) => {
    acc[rep.id] = '';
    return acc;
  }, {});

const parseAssignmentRatio = (value: string) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

const buildLeadCountByRatio = (leadCount: number, ratios: Record<string, number>) => {
  return SALES_REPS.reduce<Record<string, number>>((acc, rep) => {
    acc[rep.id] = Math.max(0, ratios[rep.id] || 0);
    return acc;
  }, {});
};

const Leads: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const { t } = useTranslation('marketing');
  const navigate = useNavigate();
  const location = useLocation();

  // State: Load from LocalStorage
  const [activeTab, setActiveTab] = useState<'all' | 'new' | 'closed'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'pivot'>('list'); // View Mode State
  const [leads, setLeads] = useState<ILead[]>([]);
  const [searchFilters, setSearchFilters] = useState<SearchFilter[]>([]);

  // Drawer State
  const [selectedLead, setSelectedLead] = useState<ILead | null>(null);
  const [leadToConvert, setLeadToConvert] = useState<ILead | null>(null);

  // Selection & Assignment State
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignmentRatios, setAssignmentRatios] = useState<Record<string, string>>(() => buildEmptyAssignmentRatios());
  const [assignRepSearch, setAssignRepSearch] = useState('');
  const [assignCampusFilter, setAssignCampusFilter] = useState('all');

  // Tab state for Create Modal (Odoo Style)
  const [createModalActiveTab, setCreateModalActiveTab] = useState<LeadCreateModalTab>('notes');

  const STANDARD_LEAD_STATUS = LEAD_STATUS_KEYS;

  const CLOSED_LEAD_STATUSES = CLOSED_LEAD_STATUS_KEYS;
  const CUSTOM_CLOSE_REASON = 'LÃ½ do khÃ¡c';
  const STANDARD_LEAD_STATUS_OPTIONS = LEAD_STATUS_OPTIONS;
  const normalizeLeadStatus = normalizeLeadStatusKey;
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

  const toInputDate = (value?: string) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDisplayDateTime = (value?: string) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('vi-VN');
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
        return 'Lead Má»›i';
      case 'closed':
        return 'Lead Ä‘Ã£ Ä‘Ã³ng';
      default:
        return 'Táº¥t cáº£';
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

  const assignmentSalesReps = useMemo(() => {
    const branchByUserId = new Map<string, string>();
    const teamByUserId = new Map<string, string>();

    getSalesTeams().forEach((team) => {
      const teamName = decodeMojibakeText(team.name);
      const teamBranch = decodeMojibakeText(team.branch);
      team.members.forEach((member) => {
        if (!member.userId) return;
        if (!teamByUserId.has(member.userId)) {
          teamByUserId.set(member.userId, teamName);
        }
        if (!branchByUserId.has(member.userId)) {
          branchByUserId.set(member.userId, decodeMojibakeText(member.branch || teamBranch));
        }
      });
    });

    return SALES_REPS.map((rep) => ({
      ...rep,
      team: teamByUserId.get(rep.id) || decodeMojibakeText(rep.team),
      branch: branchByUserId.get(rep.id) || ''
    }));
  }, [showAssignModal]);

  const assignmentCampusOptions = useMemo(
    () =>
      Array.from(new Set(assignmentSalesReps.map((rep) => rep.branch).filter(Boolean))).sort((left, right) =>
        left.localeCompare(right, 'vi')
      ),
    [assignmentSalesReps]
  );

  const filteredAssignmentSalesReps = useMemo(() => {
    const normalizedSearch = normalizeAssignFilterToken(assignRepSearch);

    return assignmentSalesReps.filter((rep) => {
      const matchesSearch =
        !normalizedSearch ||
        normalizeAssignFilterToken(rep.name).includes(normalizedSearch) ||
        normalizeAssignFilterToken(rep.team).includes(normalizedSearch);
      const matchesCampus = assignCampusFilter === 'all' || rep.branch === assignCampusFilter;
      return matchesSearch && matchesCampus;
    });
  }, [assignCampusFilter, assignRepSearch, assignmentSalesReps]);

  const hasAssignmentRepFilters = assignRepSearch.trim().length > 0 || assignCampusFilter !== 'all';

  const resetAssignFilters = () => {
    setAssignRepSearch('');
    setAssignCampusFilter('all');
  };

  const resetAssignModal = () => {
    setAssignmentRatios(buildEmptyAssignmentRatios());
  };

  const closeAssignModal = () => {
    setShowAssignModal(false);
    resetAssignModal();
    resetAssignFilters();
  };

  const updateAssignmentRatio = (repId: string, value: string) => {
    if (value === '') {
      setAssignmentRatios((prev) => ({ ...prev, [repId]: '' }));
      return;
    }

    const normalizedValue = String(Math.min(selectedLeadIds.length, parseAssignmentRatio(value)));
    setAssignmentRatios((prev) => ({ ...prev, [repId]: normalizedValue }));
  };

  const fillAssignmentRatiosEvenly = () => {
    const visibleRepIds = filteredAssignmentSalesReps.map((rep) => rep.id);
    const scopeRepIds = visibleRepIds.length > 0
      ? visibleRepIds
      : hasAssignmentRepFilters
        ? []
        : assignmentSalesReps.map((rep) => rep.id);
    if (scopeRepIds.length === 0) return;
    const activeRepIds = scopeRepIds
      .filter((repId) => assignmentRatioValues[repId] > 0);
    const targetRepIds = activeRepIds.length > 0 ? activeRepIds : scopeRepIds;
    const baseCount = Math.floor(selectedLeadIds.length / targetRepIds.length);
    let remaining = selectedLeadIds.length - (baseCount * targetRepIds.length);

    setAssignmentRatios(
      assignmentSalesReps.reduce<Record<string, string>>((acc, rep) => {
        if (!targetRepIds.includes(rep.id)) {
          acc[rep.id] = '';
          return acc;
        }

        const nextCount = baseCount + (remaining > 0 ? 1 : 0);
        acc[rep.id] = String(nextCount);
        if (remaining > 0) remaining -= 1;
        return acc;
      }, {})
    );
  };

  const setSingleRepAssignment = (repId: string) => {
    setAssignmentRatios(
      assignmentSalesReps.reduce<Record<string, string>>((acc, rep) => {
        acc[rep.id] = rep.id === repId ? String(selectedLeadIds.length) : '';
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



  const reloadLeads = useCallback(() => {
    const rawLeads = getLeads();
    const normalizedLeads = rawLeads.map((lead) => ({
      ...lead,
      status: normalizeLeadStatus(lead.status as string) as any
    }));
    setLeads(normalizedLeads);
    setSelectedLead((prev) => {
      if (!prev) return null;
      return normalizedLeads.find((lead) => lead.id === prev.id) || null;
    });
    const hasNormalizedDiff = rawLeads.some((lead, idx) => lead.status !== normalizedLeads[idx].status);
    if (hasNormalizedDiff) {
      saveLeads(normalizedLeads);
    }
  }, []);

  // Load data
  useEffect(() => {
    reloadLeads();
    setAvailableTags(getTags());
  }, [reloadLeads]);

  useEffect(() => {
    const syncTags = () => setAvailableTags(getTags());
    window.addEventListener('educrm:tags-changed', syncTags as EventListener);
    return () => window.removeEventListener('educrm:tags-changed', syncTags as EventListener);
  }, []);

  useEffect(() => {
    const handleLeadsChanged = () => {
      reloadLeads();
    };

    const handleStorageChanged = (event: StorageEvent) => {
      if (!event.key || event.key === KEYS.LEADS) {
        reloadLeads();
      }
    };

    window.addEventListener('educrm:leads-changed', handleLeadsChanged);
    window.addEventListener('storage', handleStorageChanged);

    return () => {
      window.removeEventListener('educrm:leads-changed', handleLeadsChanged);
      window.removeEventListener('storage', handleStorageChanged);
    };
  }, [reloadLeads]);

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLeadData, setNewLeadData] = useState<LeadCreateFormData>(() => createLeadInitialState()); /*
    name: '', phone: '', email: '', source: 'hotline', program: 'TiÃ¡ÂºÂ¿ng Ã„ÂÃ¡Â»Â©c', notes: '',
    title: '', company: '', province: '', city: '', ward: '', street: '', salesperson: '', campaign: '', tags: [] as string[], referredBy: '',
    product: '', market: '', channel: '', status: STANDARD_LEAD_STATUS.NEW
  }); */
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [isAddingEditTag, setIsAddingEditTag] = useState(false);
  const leadSalesOptions = useMemo(
    () => SALES_REPS.map((rep) => ({ id: rep.id, value: rep.id, label: rep.name })),
    []
  );
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
  const getLeadCreatedAtTimestamp = (lead: ILead) => {
    const timestamp = new Date(lead.createdAt || '').getTime();
    return Number.isNaN(timestamp) ? 0 : timestamp;
  };

  const formatDuplicateLeadCreatedAt = (value?: string) => {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('vi-VN');
  };

  const getDuplicateLeadOwner = (ownerId?: string) =>
    SALES_REPS.find((rep) => rep.id === ownerId || rep.name === ownerId);

  const getDuplicateLeadOwnerLabel = (lead: ILead) =>
    getDuplicateLeadOwner(lead.ownerId)?.name || lead.ownerId || 'Chưa phân';

  const getDuplicateLeadCampusLabel = (lead: ILead) =>
    lead.company || (lead as any).city || '-';

  const duplicateGroups = useMemo(() => {
    const groups: { [key: string]: ILead[] } = {};
    leads.forEach(lead => {
      const phone = normalizeLeadPhone(lead.phone);
      if (isValidLeadPhone(phone)) {
        if (!groups[phone]) groups[phone] = [];
        groups[phone].push(lead);
      }
    });
    return Object.entries(groups)
      .map(([phone, group]) => ({
        phone,
        leads: group
          .filter((lead) => normalizeLeadStatus(lead.status as string) !== STANDARD_LEAD_STATUS.LOST)
          .sort((a, b) => getLeadCreatedAtTimestamp(a) - getLeadCreatedAtTimestamp(b)),
      }))
      .filter((group) => group.leads.length > 1)
      .sort((a, b) => a.phone.localeCompare(b.phone));
  }, [leads]);

  const duplicateGroupSections = useMemo(() => {
    let rowNumber = 0;
    return duplicateGroups.map((group, groupIndex) => ({
      phone: group.phone,
      groupIndex,
      totalLeads: group.leads.length,
      rows: group.leads.map((lead) => ({
        lead,
        stt: ++rowNumber,
      })),
    }));
  }, [duplicateGroups]);
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
        program: selectedLead.program || 'TiÃ¡ÂºÂ¿ng Ã„ÂÃ¡Â»Â©c',
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
        studentDob: toInputDate(studentInfo.dob || selectedLead.dob),
        studentIdentityCard: studentInfo.identityCard || (selectedLead as any).identityCard || '',
        studentLanguageLevel: studentInfo.languageLevel || (selectedLead as any).languageLevel || '',
        studentPhone: studentInfo.studentPhone || '',
        studentSchool: studentInfo.school || '',
        studentEducationLevel: studentInfo.educationLevel || selectedLead.educationLevel || '',
        identityDate: toInputDate(selectedLead.identityDate),
        identityPlace: selectedLead.identityPlace || '',
        expectedStart: selectedLead.internalNotes?.expectedStart || '',
        parentOpinion: selectedLead.internalNotes?.parentOpinion || '',
        financial: selectedLead.internalNotes?.financial || studentInfo.financialStatus || '',
        potential: selectedLead.internalNotes?.potential || '',
        createdAtDisplay: formatDisplayDateTime(selectedLead.createdAt),
        assignedAtDisplay: formatDisplayDateTime(selectedLead.pickUpDate),
      });
      setEditModalActiveTab('notes');
      setIsAddingEditTag(false);
    }
  }, [selectedLead]);
  useEffect(() => {
    if (location.state && (location.state as any).activeTab) {
      const nextTab = (location.state as any).activeTab;
      if (nextTab === 'all' || nextTab === 'new' || nextTab === 'closed') {
        setActiveTab(nextTab);
      }
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

  const [selectedAdvancedFilterFields, setSelectedAdvancedFilterFields] = useState<string[]>([]);
  const [selectedAdvancedGroupFields, setSelectedAdvancedGroupFields] = useState<string[]>([]);

  const selectedAdvancedFilterOptions = ALL_COLUMNS.filter((col) => selectedAdvancedFilterFields.includes(col.id));
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
    openOps: false, // "MÃ¡Â»Å¸ cÃ†Â¡ hÃ¡Â»â„¢i"
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

  const fieldLabels = {
    createdAt: 'Ngày tạo',
    deadline: 'Hạn chót',
    lastInteraction: 'Tương tác cuối'
  };

  const handleUpdateSelectedLead = () => {
    if (!selectedLead) return;
    const normalizedPhone = normalizeLeadPhone(editLeadData.phone);
    const phoneError = getLeadPhoneValidationMessage(editLeadData.phone);

    if (!editLeadData.name.trim()) {
      alert('Vui lÃ²ng nháº­p tÃªn khÃ¡ch hÃ ng.');
      return;
    }
    if (!editLeadData.phone.trim()) {
      alert('Vui lÃ²ng nháº­p sá»‘ Ä‘iá»‡n thoáº¡i.');
      return;
    }
    if (phoneError) {
      alert(phoneError);
      return;
    }

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
      phone: normalizedPhone,
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
      identityDate: editLeadData.identityDate || undefined,
      identityPlace: editLeadData.identityPlace || undefined,
      address: editLeadData.street.trim() || undefined,
      city: editLeadData.province.trim() || undefined,
      district: editLeadData.city.trim() || undefined,
      ward: editLeadData.ward.trim() || undefined,
      guardianName: guardianRelation ? editLeadData.name.trim() || undefined : undefined,
      guardianPhone: guardianRelation ? normalizedPhone || undefined : undefined,
      guardianRelation,
      lostReason: isClosedLeadStatus(editLeadData.status) ? resolvedCloseReason : undefined,
      studentInfo,
      internalNotes: {
        ...(selectedLead.internalNotes || {}),
        expectedStart: editLeadData.expectedStart.trim() || undefined,
        parentOpinion: editLeadData.parentOpinion.trim() || undefined,
        financial: editLeadData.financial.trim() || undefined,
        potential: (editLeadData.potential.trim() || undefined) as any,
      },
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
      selectedLead.name !== updatedLead.name ? buildLeadAuditChange('name', selectedLead.name, updatedLead.name, 'TÃªn lead') : null,
      selectedLead.phone !== updatedLead.phone ? buildLeadAuditChange('phone', selectedLead.phone, updatedLead.phone, 'Sá»‘ Ä‘iá»‡n thoáº¡i') : null,
      selectedLead.status !== updatedLead.status ? buildLeadAuditChange('status', selectedLead.status, updatedLead.status, 'Tráº¡ng thÃ¡i') : null,
      selectedLead.ownerId !== updatedLead.ownerId ? buildLeadAuditChange('ownerId', selectedLead.ownerId, updatedLead.ownerId, 'Sale phá»¥ trÃ¡ch') : null,
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
              title: 'Äá»•i tráº¡ng thÃ¡i',
              description: `Tráº¡ng thÃ¡i: ${getLeadStatusLabel(String(selectedLead.status || ''))} â†’ ${getLeadStatusLabel(String(updatedLead.status || ''))}`,
              user: user?.name || 'Admin'
            })]
            : []),
          ...(selectedLead.ownerId !== updatedLead.ownerId
            ? [buildLeadActivityLog({
              type: 'system',
              title: selectedLead.ownerId ? 'Chia láº¡i Lead' : 'PhÃ¢n bá»• Lead',
              description: selectedLead.ownerId
                ? `Lead Ä‘Æ°á»£c chia láº¡i tá»« ${SALES_REPS.find((rep) => rep.id === selectedLead.ownerId)?.name || selectedLead.ownerId} sang ${SALES_REPS.find((rep) => rep.id === updatedLead.ownerId)?.name || updatedLead.ownerId}.`
                : `Lead Ä‘Æ°á»£c giao cho ${SALES_REPS.find((rep) => rep.id === updatedLead.ownerId)?.name || updatedLead.ownerId}.`,
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
      id: 'd1', name: 'Data_THPT_NguyenDu_K12', source: 'HÃ¡Â»Â£p tÃƒÂ¡c TrÃ†Â°Ã¡Â»Âng THPT', code: '#D-2410-01', date: '24/10/2023', importer: 'Admin',
      total: 500, match: '96.0%', valid: 480, interested: '30.0%', interestedCount: 150, enrolled: '30.0%', enrolledCount: 45,
      eval: 'good', evalText: 'Ã†Â¯U TIÃƒÅ N NHÃ¡ÂºÂ¬P', note: 'TÃ¡Â»Â· lÃ¡Â»â€¡ nhÃ¡ÂºÂ­p hÃ¡Â»Âc cao'
    },
    {
      id: 'd2', name: 'Mua_Data_Ngoai_T10', source: 'Mua ngoÃƒÂ i (Agency A)', code: '#D-2010-02', date: '20/10/2023', importer: 'Marketing Lead',
      total: 1000, match: '35.0%', valid: 350, interested: '2.0%', interestedCount: 20, enrolled: '10.0%', enrolledCount: 2,
      eval: 'bad', evalText: 'DÃ¡Â»ÂªNG HÃ¡Â»Â¢P TÃƒÂC', note: 'SÃ„ÂT Ã¡ÂºÂ£o quÃƒÂ¡ nhiÃ¡Â»Âu'
    },
    {
      id: 'd3', name: 'Hoi_Thao_Du_Hoc_Duc_HaNoi', source: 'SÃ¡Â»Â± kiÃ¡Â»â€¡n Offline', code: '#D-1510-01', date: '15/10/2023', importer: 'Sales Leader',
      total: 200, match: '99.0%', valid: 198, interested: '60.0%', interestedCount: 120, enrolled: '50.0%', enrolledCount: 60,
      eval: 'good', evalText: 'Ã†Â¯U TIÃƒÅ N NHÃ¡ÂºÂ¬P', note: 'TÃ¡Â»Â· lÃ¡Â»â€¡ nhÃ¡ÂºÂ­p hÃ¡Â»Âc cao'
    },
    {
      id: 'd4', name: 'Import_Excel_Cu_2022', source: 'HÃ¡Â»â€¡ thÃ¡Â»â€˜ng cÃ…Â©', code: '#D-0110-03', date: '01/10/2023', importer: 'Admin',
      total: 1500, match: '93.3%', valid: 1400, interested: '3.3%', interestedCount: 50, enrolled: '10.0%', enrolledCount: 5,
      eval: 'warning', evalText: 'CÃƒâ€šN NHÃ¡ÂºÂ®C LÃ¡ÂºÂ I', note: 'ÃƒÂt nhu cÃ¡ÂºÂ§u hÃ¡Â»Âc'
    }
  ];

  const CRM_FIELDS = [
    { id: 'name', label: 'TÃƒÂªn Lead', excelHeader: 'HÃ¡Â»Â vÃƒÂ  tÃƒÂªn', required: true },
    { id: 'phone', label: 'SÃ„ÂT', excelHeader: 'SÃ¡Â»â€˜ Ã„â€˜iÃ¡Â»â€¡n thoÃ¡ÂºÂ¡i', required: true }, // Format: 10 digits, start with 0
    { id: 'email', label: 'Email', excelHeader: 'Email', required: false },      // Format: contains @
    { id: 'targetCountry', label: 'QuÃ¡Â»â€˜c gia mÃ¡Â»Â¥c tiÃƒÂªu', excelHeader: 'QuÃ¡Â»â€˜c gia mÃ¡Â»Â¥c tiÃƒÂªu', required: true },
    { id: 'company', label: 'CÃ†Â¡ sÃ¡Â»Å¸', excelHeader: 'CÃ†Â¡ sÃ¡Â»Å¸', required: false },
    { id: 'source', label: 'NguÃ¡Â»â€œn', excelHeader: 'NguÃ¡Â»â€œn', required: false },
    { id: 'campaign', label: 'ChiÃ¡ÂºÂ¿n dÃ¡Â»â€¹ch', excelHeader: 'ChiÃ¡ÂºÂ¿n dÃ¡Â»â€¹ch', required: false },
    { id: 'notes', label: 'Ghi chÃƒÂº', excelHeader: 'Ghi chÃƒÂº', required: false },
    { id: 'program', label: 'ChÃ†Â°Ã†Â¡ng trÃƒÂ¬nh', excelHeader: 'ChÃ†Â°Ã†Â¡ng trÃƒÂ¬nh', required: false },
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

      setImportBatchName(`KHO_LEAD_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}_BATCH_1`);
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
            rowErrors.push(`ThiÃ¡ÂºÂ¿u ${field.label}`);
          }
        }

        // 2. Specific Format Checks (if value exists)
        if (val) {
          const strVal = String(val).trim();

          // Email check
          if (field.id === 'email') {
            if (!strVal.includes('@')) {
              rowErrors.push(`Email khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡ (thiÃ¡ÂºÂ¿u @)`);
            }
          }

          // Phone check
          if (field.id === 'phone') {
            if (!isValidLeadPhone(strVal)) {
              rowErrors.push(`SÃ„ÂT sai Ã„â€˜Ã¡Â»â€¹nh dÃ¡ÂºÂ¡ng (phÃ¡ÂºÂ£i 10 sÃ¡Â»â€˜, bÃ¡ÂºÂ¯t Ã„â€˜Ã¡ÂºÂ§u bÃ¡ÂºÂ±ng 0)`);
            }
          }
        }
      });

      if (rowErrors.length > 0) {
        errorList.push({
          row: rowNumber,
          name: row['HÃ¡Â»Â vÃƒÂ  tÃƒÂªn'] || 'N/A',
          errors: rowErrors
        });
      } else {
        // Normalize Data for CRM Import
        validRows.push({
          name: row['HÃ¡Â»Â vÃƒÂ  tÃƒÂªn'],
          phone: String(row['SÃ¡Â»â€˜ Ã„â€˜iÃ¡Â»â€¡n thoÃ¡ÂºÂ¡i']).replace(/[\s\.\-]/g, ''),
          email: row['Email'] || '',
          targetCountry: row['QuÃ¡Â»â€˜c gia mÃ¡Â»Â¥c tiÃƒÂªu'],
          company: row['CÃ†Â¡ sÃ¡Â»Å¸'] || '',
          source: row['NguÃ¡Â»â€œn'] || 'Import',
          campaign: row['ChiÃ¡ÂºÂ¿n dÃ¡Â»â€¹ch'] || '',
          notes: row['Ghi chÃƒÂº'] || '',
          program: row['ChÃ†Â°Ã†Â¡ng trÃƒÂ¬nh'] || 'TiÃ¡ÂºÂ¿ng Ã„ÂÃ¡Â»Â©c'
        });
      }
    });

    setValidImportRows(validRows);
    setImportErrors(errorList);
  };

  // Download Template
  const handleDownloadTemplate = () => {
    const ws = utils.json_to_sheet([
      { 'HÃ¡Â»Â vÃƒÂ  tÃƒÂªn': 'NguyÃ¡Â»â€¦n VÃ„Æ’n A', 'SÃ¡Â»â€˜ Ã„â€˜iÃ¡Â»â€¡n thoÃ¡ÂºÂ¡i': '0901234567', 'Email': 'a@example.com', 'QuÃ¡Â»â€˜c gia mÃ¡Â»Â¥c tiÃƒÂªu': 'Ã„ÂÃ¡Â»Â©c', 'CÃ†Â¡ sÃ¡Â»Å¸': 'Hanoi', 'NguÃ¡Â»â€œn': 'Facebook', 'ChiÃ¡ÂºÂ¿n dÃ¡Â»â€¹ch': 'Summer 2024', 'Ghi chÃƒÂº': 'Quan tÃƒÂ¢m du hÃ¡Â»Âc' }
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
      alert("LÃ¡Â»â€”i tÃ¡ÂºÂ£i xuÃ¡Â»â€˜ng template");
    }
  };

  // Final Import
  const handleImportSubmit = () => {
    if (validImportRows.length === 0) {
      alert("Không có dòng dữ liệu hợp lệ để ghép vào kho lead!");
      return;
    }

    let importedLeads: ILead[] = [];
    const now = new Date().toISOString();

    // Imported rows stay in the shared lead pool until Admin/Leader assigns them manually.
    importedLeads = validImportRows.map((row, index) => {
      return {
        id: `l-import-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
        name: row.name,
        phone: normalizeLeadPhone(row.phone),
        email: row.email,
        company: row.company,
        targetCountry: row.targetCountry,
        source: row.source,
        program: row.program,
        status: STANDARD_LEAD_STATUS.NEW,
        ownerId: '',
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

    saveLeads([...leads, ...importedLeads]);
    setLeads([...leads, ...importedLeads]); // Optimistic update

    setShowImportModal(false);
    alert(`Đã ghép thành công ${importedLeads.length} lead vào kho lead chung. Các lead này hiện chưa phân bổ cho sale.`);

    // Reset
    setImportStep(1);
    setImportFile(null);
    setRawImportData([]);
    setValidImportRows([]);
    setImportErrors([]);
    setImportTags([]);
    setNewTagInput('');
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

  const getLeadTagValues = (lead: ILead) => {
    const rawTags = lead.marketingData?.tags as string[] | string | undefined;
    const tags = Array.isArray(rawTags)
      ? rawTags
      : (typeof rawTags === 'string' ? rawTags.split(',') : []);

    return Array.from(
      new Set(
        tags
          .map((tag) => decodeMojibakeText(String(tag || '')).trim())
          .filter(Boolean)
      )
    );
  };

  const formatLeadFilterDateValue = (value?: string) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return decodeMojibakeText(value).trim();
    }
    return date.toLocaleDateString('vi-VN');
  };

  const getLeadFilterMatchValues = (lead: ILead, field: string) => {
    const salespersonLabel = SALES_REPS.find((rep) => rep.id === lead.ownerId)?.name || lead.ownerId || '';
    const deadlineValue = (lead as any).expectedClosingDate || '';
    const nextActivity = ((lead as any).activities || []).find((activity: any) => activity.type === 'activity');

    const rawValues = (() => {
      switch (field) {
        case 'opportunity':
          return [lead.name];
        case 'contact':
          return [(lead as any).contactPerson || (lead as any).contactName || lead.name];
        case 'company':
          return [lead.company || ''];
        case 'createdAt':
          return [lead.createdAt || '', formatLeadFilterDateValue(lead.createdAt)];
        case 'title':
          return [(lead as any).title || ''];
        case 'email':
          return [lead.email || ''];
        case 'phone':
          return [lead.phone || ''];
        case 'address':
          return [[(lead as any).street, (lead as any).ward, (lead as any).city].filter(Boolean).join(', ')];
        case 'salesperson':
          return [salespersonLabel];
        case 'campaign':
          return [(lead as any).campaign || lead.marketingData?.campaign || ''];
        case 'source':
          return [lead.source || ''];
        case 'potential':
          return [(lead as any).potential || lead.internalNotes?.potential || ''];
        case 'tags': {
          const tags = getLeadTagValues(lead);
          return [...tags, tags.join(', ')];
        }
        case 'referredBy':
          return [(lead as any).referredBy || ''];
        case 'market':
          return [lead.marketingData?.market || ''];
        case 'product':
          return [(lead as any).product || lead.program || ''];
        case 'notes':
          return [lead.notes || ''];
        case 'nextActivity':
          return [nextActivity?.description || ''];
        case 'deadline':
          return [deadlineValue, formatLeadFilterDateValue(deadlineValue)];
        case 'value':
          return lead.value != null ? [String(lead.value)] : [];
        case 'status':
          return [normalizeLeadStatus(lead.status as string), getLeadStatusLabel(lead.status as string)];
        case 'sla':
          return [lead.slaReason || '', lead.slaStatus || ''];
        default:
          return [(lead as any)[field] ?? ''];
      }
    })();

    return Array.from(
      new Set(
        rawValues
          .map((value) => decodeMojibakeText(String(value || '')).trim())
          .filter(Boolean)
      )
    );
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
  ].map((value) => normalizeAssignFilterToken(String(value || ''))).join(' ');

  const doesLeadMatchFilter = (
    lead: ILead,
    field: string,
    rawValue: string,
    matchMode: SearchFilter['matchMode'] = 'includes'
  ) => {
    const value = normalizeAssignFilterToken(rawValue);
    if (!value) return true;

    if (field === 'search') {
      return getLeadSearchableText(lead).includes(value);
    }

    const leadValues = getLeadFilterMatchValues(lead, field)
      .map((item) => normalizeAssignFilterToken(item))
      .filter(Boolean);

    if (leadValues.length === 0) return false;

    return leadValues.some((leadValue) =>
      matchMode === 'equals'
        ? leadValue === value
        : leadValue.includes(value)
    );
  };

  const doesLeadHaveFieldValue = (lead: ILead, field: string) => {
    const hasText = (value: unknown) => decodeMojibakeText(String(value || '')).trim().length > 0;
    const nextActivity = ((lead as any).activities || []).find((activity: any) => activity.type === 'activity');

    switch (field) {
      case 'opportunity':
        return hasText(lead.name);
      case 'contact':
        return hasText((lead as any).contactPerson || (lead as any).contactName);
      case 'company':
        return hasText(lead.company || lead.marketingData?.region);
      case 'createdAt':
        return hasText(lead.createdAt);
      case 'title':
        return hasText((lead as any).title || lead.title);
      case 'email':
        return hasText(lead.email);
      case 'phone':
        return hasText(lead.phone);
      case 'address':
        return hasText(lead.address) || hasText([(lead as any).street, (lead as any).ward, (lead as any).city].filter(Boolean).join(', '));
      case 'salesperson':
        return hasText(lead.ownerId);
      case 'campaign':
        return hasText((lead as any).campaign || lead.marketingData?.campaign);
      case 'source':
        return hasText(lead.source);
      case 'potential':
        return hasText((lead as any).potential || lead.internalNotes?.potential);
      case 'tags':
        return getLeadTagValues(lead).length > 0;
      case 'referredBy':
        return hasText((lead as any).referredBy || lead.referredBy);
      case 'market':
        return hasText(lead.marketingData?.market);
      case 'product':
        return hasText((lead as any).product || lead.program);
      case 'notes':
        return hasText(lead.notes);
      case 'nextActivity':
        return hasText(nextActivity?.description);
      case 'deadline':
        return hasText((lead as any).expectedClosingDate || lead.expectedClosingDate);
      case 'value':
        return lead.value != null;
      case 'status':
        return hasText(lead.status);
      case 'sla':
        return hasText(lead.slaReason || lead.slaStatus);
      default:
        return hasText((lead as any)[field]);
    }
  };

  const getLeadGroupFieldValue = (lead: ILead, field: string) => {
    const nextActivity = ((lead as any).activities || []).find((activity: any) => activity.type === 'activity');

    switch (field) {
      case 'opportunity':
        return decodeMojibakeText(String(lead.name || '')).trim() || 'Chưa có dữ liệu';
      case 'contact':
        return decodeMojibakeText(String((lead as any).contactPerson || (lead as any).contactName || '')).trim() || 'Chưa có dữ liệu';
      case 'company':
        return decodeMojibakeText(String(lead.company || lead.marketingData?.region || '')).trim() || 'Chưa có dữ liệu';
      case 'createdAt':
        return formatLeadFilterDateValue(lead.createdAt) || 'Chưa có dữ liệu';
      case 'title':
        return decodeMojibakeText(String((lead as any).title || lead.title || '')).trim() || 'Chưa có dữ liệu';
      case 'email':
        return decodeMojibakeText(String(lead.email || '')).trim() || 'Chưa có dữ liệu';
      case 'phone':
        return decodeMojibakeText(String(lead.phone || '')).trim() || 'Chưa có dữ liệu';
      case 'address':
        return decodeMojibakeText(String(lead.address || [(lead as any).street, (lead as any).ward, (lead as any).city].filter(Boolean).join(', ') || '')).trim() || 'Chưa có dữ liệu';
      case 'salesperson':
        return decodeMojibakeText(String(SALES_REPS.find((rep) => rep.id === lead.ownerId)?.name || lead.ownerId || '')).trim() || 'Chưa có dữ liệu';
      case 'campaign':
        return decodeMojibakeText(String((lead as any).campaign || lead.marketingData?.campaign || '')).trim() || 'Chưa có dữ liệu';
      case 'source':
        return decodeMojibakeText(String(lead.source || '')).trim() || 'Chưa có dữ liệu';
      case 'potential':
        return decodeMojibakeText(String((lead as any).potential || lead.internalNotes?.potential || '')).trim() || 'Chưa có dữ liệu';
      case 'tags': {
        const tags = getLeadTagValues(lead);
        return tags.length > 0 ? tags.join(', ') : 'Chưa có dữ liệu';
      }
      case 'referredBy':
        return decodeMojibakeText(String((lead as any).referredBy || lead.referredBy || '')).trim() || 'Chưa có dữ liệu';
      case 'market':
        return decodeMojibakeText(String(lead.marketingData?.market || '')).trim() || 'Chưa có dữ liệu';
      case 'product':
        return decodeMojibakeText(String((lead as any).product || lead.program || '')).trim() || 'Chưa có dữ liệu';
      case 'notes':
        return decodeMojibakeText(String(lead.notes || '')).trim() || 'Chưa có dữ liệu';
      case 'nextActivity':
        return decodeMojibakeText(String(nextActivity?.description || '')).trim() || 'Chưa có dữ liệu';
      case 'deadline':
        return formatLeadFilterDateValue((lead as any).expectedClosingDate || lead.expectedClosingDate) || 'Chưa có dữ liệu';
      case 'value':
        return lead.value != null ? lead.value.toLocaleString('vi-VN') : 'Chưa có dữ liệu';
      case 'status':
        return decodeMojibakeText(String(getLeadStatusLabel(lead.status as string) || lead.status || '')).trim() || 'Chưa có dữ liệu';
      case 'sla':
        return decodeMojibakeText(String(lead.slaReason || lead.slaStatus || '')).trim() || 'Chưa có dữ liệu';
      default:
        return decodeMojibakeText(String((lead as any)[field] || '')).trim() || 'Chưa có dữ liệu';
    }
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

    if (selectedAdvancedFilterFields.length > 0) {
      result = result.filter((lead) =>
        selectedAdvancedFilterFields.every((field) => doesLeadHaveFieldValue(lead, field))
      );
    }

    // 3. Search Filters
    if (searchFilters.length > 0) {
      result = result.filter(lead => {
        return searchFilters.every(filter => {
          const groupedFields = parseAdvancedMultiFilterFields(filter.field);
          if (groupedFields.length > 0) {
            return groupedFields.some((fieldId) => doesLeadMatchFilter(lead, fieldId, filter.value, filter.matchMode));
          }
          return doesLeadMatchFilter(lead, filter.field, filter.value, filter.matchMode);
        });
      });
    }

    // 4. Tab Specific Status Filtering
    switch (activeTab) {
      case 'new':
        return result.filter(l => normalizeLeadStatus(l.status as string) === STANDARD_LEAD_STATUS.NEW || !l.status);
      case 'closed':
        return result.filter(l => isClosedLeadStatus(l.status as string));
      default:
        return result;
    }
  }, [leads, activeTab, searchFilters, canViewAll, user, advancedFilters, timeRangeType, timeFilterField, customRange, selectedAdvancedFilterFields]);

  const groupedLeads = useMemo(() => {
    if (selectedAdvancedGroupFields.length === 0) return [];

    const groups = new Map<string, { key: string; label: string; leads: ILead[] }>();

    filteredLeads.forEach((lead) => {
      const parts = selectedAdvancedGroupFields.map((fieldId) => {
        const columnLabel = ALL_COLUMNS.find((column) => column.id === fieldId)?.label || fieldId;
        const value = getLeadGroupFieldValue(lead, fieldId);
        return { fieldId, columnLabel, value };
      });

      const key = parts.map((part) => `${part.fieldId}:${part.value}`).join('|');
      const label = parts.map((part) => `${part.columnLabel}: ${part.value}`).join(' > ');
      const existing = groups.get(key);

      if (existing) {
        existing.leads.push(lead);
        return;
      }

      groups.set(key, {
        key,
        label,
        leads: [lead]
      });
    });

    return Array.from(groups.values());
  }, [filteredLeads, selectedAdvancedGroupFields]);

  // --- STATS CALCULATION ---
  const stats = useMemo(() => {
    const total = leads.length;
    const assigned = leads.filter((lead) => Boolean(lead.ownerId)).length;
    const unassigned = total - assigned;
    const slaRisk = leads.filter((lead) => lead.slaStatus === 'danger').length;
    const verified = leads.filter((lead) => {
      const normalizedStatus = normalizeLeadStatus(lead.status as string);
      return normalizedStatus === STANDARD_LEAD_STATUS.CONVERTED || normalizedStatus === STANDARD_LEAD_STATUS.NURTURING;
    }).length;
    const processing = leads.filter((lead) => {
      if (!lead.ownerId) return false;
      const normalizedStatus = normalizeLeadStatus(lead.status as string);
      return (
        normalizedStatus !== STANDARD_LEAD_STATUS.NEW &&
        normalizedStatus !== STANDARD_LEAD_STATUS.ASSIGNED &&
        normalizedStatus !== STANDARD_LEAD_STATUS.CONVERTED &&
        !isClosedLeadStatus(normalizedStatus)
      );
    }).length;
    const newLeads = leads.filter((lead) => !lead.ownerId).length;
    const verificationRate = total > 0 ? (verified / total) * 100 : 0;

    return { total, assigned, unassigned, processing, newLeads, slaRisk, verificationRate };
  }, [leads]);

  // --- FILTER HELPERS ---

  const addFilter = (
    field: string,
    label: string,
    value: string,
    color?: string,
    matchMode: SearchFilter['matchMode'] = 'includes'
  ) => {
    // Check if filter already exists
    const normalizedLabel = decodeMojibakeText(label);
    const normalizedValue = decodeMojibakeText(value).trim();
    const exists = searchFilters.some((f) =>
      f.field === field &&
      normalizeAssignFilterToken(f.value) === normalizeAssignFilterToken(normalizedValue) &&
      (f.matchMode || 'includes') === matchMode
    );
    if (!exists && normalizedValue) {
      setSearchFilters((prev) => [...prev, { field, label: normalizedLabel, value: normalizedValue, color, matchMode }]);
    }
  };

  const applySelectedAdvancedFilter = (
    rawValue: string,
    options?: { matchMode?: SearchFilter['matchMode']; closeDropdown?: boolean }
  ) => {
    const normalizedValue = decodeMojibakeText(rawValue).trim();
    const matchMode = options?.matchMode || 'includes';
    const closeDropdown = options?.closeDropdown ?? true;
    if (!normalizedValue || selectedAdvancedFilterOptions.length === 0) return false;

    if (selectedAdvancedFilterOptions.length > 1) {
      addFilter(
        buildAdvancedMultiFilterField(selectedAdvancedFilterOptions.map((option) => option.id)),
        selectedAdvancedFilterOptions.map((option) => option.label).join(' OR '),
        normalizedValue,
        'bg-emerald-100 text-emerald-700',
        matchMode
      );
    } else {
      addFilter(
        selectedAdvancedFilterOptions[0].id,
        selectedAdvancedFilterOptions[0].label,
        normalizedValue,
        'bg-emerald-100 text-emerald-700',
        matchMode
      );
    }

    if (closeDropdown) {
      setSelectedAdvancedFilterFields([]);
      setShowFilterDropdown(false);
    }
    return true;
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

    return chips;
  }, [searchFilters, advancedFilters, timeFilterField, timeRangeType, customRange, timePresets, fieldLabels]);

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
    setLeadToConvert(lead);
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

      if (customerAction === 'no_customer_link') {
        const convertedLead: ILead = {
          ...leadToConvert,
          ownerId: resolvedOwnerId,
          status: LeadStatus.CONVERTED,
          updatedAt: new Date().toISOString()
        };
        saveLead(convertedLead);
        setLeads(prev => prev.map(l => l.id === leadToConvert.id ? convertedLead : l));
      } else {
        deleteLead(leadToConvert.id);
        setLeads(prev => prev.filter(l => l.id !== leadToConvert.id));
      }
      setSelectedLead(null);
      setLeadToConvert(null);

      navigate(`/pipeline?newDeal=${deal.id}`);
    } catch (error) {
      console.error('Convert Error', error);
      alert('Có lỗi xảy ra khi chuyển đổi Lead!');
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
    if (!newLeadData.name?.trim()) {
      alert('Vui l\u00f2ng nh\u1eadp t\u00ean kh\u00e1ch h\u00e0ng.');
      return;
    }
    if (!newLeadData.phone?.trim()) {
      alert('Vui l\u00f2ng nh\u1eadp s\u1ed1 \u0111i\u1ec7n tho\u1ea1i.');
      return;
    }
    const normalizedPhone = normalizeLeadPhone(newLeadData.phone);
    const phoneError = getLeadPhoneValidationMessage(newLeadData.phone);
    if (phoneError) {
      alert(phoneError);
      return;
    }
    if (!newLeadData.company) {
      alert("Vui lÃƒÂ²ng chÃ¡Â»Ân CÃ†Â¡ sÃ¡Â»Å¸ / Company Base");
      return;
    }


    const newLeadBase: ILead = {
      id: `l-${Date.now()}`,
      ...newLeadData,
      phone: normalizedPhone,
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
          title: 'Táº¡o lead',
          description: `Lead Ä‘Æ°á»£c táº¡o bá»Ÿi ${user?.name || 'Admin'}.`,
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
            buildLeadAuditChange('name', '', newLeadBase.name, 'TÃªn lead'),
            buildLeadAuditChange('phone', '', newLeadBase.phone, 'Sá»‘ Ä‘iá»‡n thoáº¡i'),
            buildLeadAuditChange('ownerId', '', newLeadBase.ownerId, 'Sale phá»¥ trÃ¡ch'),
            buildLeadAuditChange('status', '', newLeadBase.status, 'Tráº¡ng thÃ¡i')
          ]
        })
      ]
    });

    if (saveLead(finalLead)) {
      setLeads([finalLead, ...leads]);
      setShowCreateModal(false);
      setNewLeadData(createLeadInitialState());
      alert("TÃ¡ÂºÂ¡o Lead thÃƒÂ nh cÃƒÂ´ng!");
    } else {
      alert("CÃƒÂ³ lÃ¡Â»â€”i xÃ¡ÂºÂ£y ra khi lÃ†Â°u Lead");
    }
  };

  const handleCreateSubmit = () => {
    if (!newLeadData.name.trim()) {
      alert('Vui l\u00f2ng nh\u1eadp t\u00ean kh\u00e1ch h\u00e0ng.');
      return;
    }
    if (!newLeadData.phone.trim()) {
      alert('Vui l\u00f2ng nh\u1eadp s\u1ed1 \u0111i\u1ec7n tho\u1ea1i.');
      return;
    }
    const normalizedPhone = normalizeLeadPhone(newLeadData.phone);
    const phoneError = getLeadPhoneValidationMessage(newLeadData.phone);
    if (phoneError) {
      alert(phoneError);
      return;
    }
    if (!newLeadData.targetCountry) {
      alert('Vui l\u00f2ng ch\u1ecdn qu\u1ed1c gia m\u1ee5c ti\u00eau.');
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
      phone: normalizedPhone,
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
      guardianPhone: guardianRelation ? normalizedPhone || undefined : undefined,
      guardianRelation,
      lostReason: isClosedLeadStatus(newLeadData.status) ? resolvedCloseReason : undefined,
      studentInfo,
      identityDate: newLeadData.identityDate || undefined,
      identityPlace: newLeadData.identityPlace || undefined,
      internalNotes: {
        expectedStart: newLeadData.expectedStart.trim() || undefined,
        parentOpinion: newLeadData.parentOpinion.trim() || undefined,
        financial: newLeadData.financial.trim() || undefined,
        potential: (newLeadData.potential.trim() || undefined) as any,
      },
      marketingData: {
        tags: newLeadData.tags,
        campaign: newLeadData.campaign,
        channel: newLeadData.channel,
        market: campus || undefined,
        medium: newLeadData.channel,
        region: campus || undefined,
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
          title: 'Táº¡o lead',
          description: `Lead Ä‘Æ°á»£c táº¡o bá»Ÿi ${user?.name || 'Admin'}.`,
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
            buildLeadAuditChange('name', '', newLeadBase.name, 'TÃªn lead'),
            buildLeadAuditChange('phone', '', newLeadBase.phone, 'Sá»‘ Ä‘iá»‡n thoáº¡i'),
            buildLeadAuditChange('ownerId', '', newLeadBase.ownerId, 'Sale phá»¥ trÃ¡ch'),
            buildLeadAuditChange('status', '', newLeadBase.status, 'Tráº¡ng thÃ¡i')
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
      alert("Vui lòng nhập số lượng lead cho ít nhất 1 nhân viên Sale");
      return;
    }

    if (assignmentRatioTotal !== selectedLeadIds.length) {
      alert("Tổng số lead phân bổ phải bằng số lead đã chọn");
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
              title: lead.ownerId ? 'Chia láº¡i Lead' : 'PhÃ¢n bá»• Lead',
              description: lead.ownerId
                ? `Lead Ä‘Æ°á»£c chia láº¡i tá»« ${SALES_REPS.find((rep) => rep.id === lead.ownerId)?.name || lead.ownerId} sang ${SALES_REPS.find((rep) => rep.id === ownerId)?.name || ownerId}.`
                : `Lead Ä‘Æ°á»£c giao cho ${SALES_REPS.find((rep) => rep.id === ownerId)?.name || ownerId}.`,
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
                buildLeadAuditChange('ownerId', lead.ownerId, ownerId, 'Sale phá»¥ trÃ¡ch'),
                buildLeadAuditChange('status', lead.status, nextStatus, 'Tráº¡ng thÃ¡i')
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
    alert(`Ã„ÂÃƒÂ£ phÃƒÂ¢n bÃ¡Â»â€¢ thÃƒÂ nh cÃƒÂ´ng ${selectedLeadIds.length} lead!`);
  };

  // --- BULK ACTIONS ---
  const handleBulkDelete = () => {
    if (selectedLeadIds.length === 0) return;
    if (confirm(`BÃ¡ÂºÂ¡n cÃƒÂ³ chÃ¡ÂºÂ¯c muÃ¡Â»â€˜n xÃƒÂ³a ${selectedLeadIds.length} lead Ã„â€˜ÃƒÂ£ chÃ¡Â»Ân?`)) {
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
              description: `Tráº¡ng thÃ¡i: ${getLeadStatusLabel(String(l.status || ''))} â†’ ${getLeadStatusLabel(nextStatus)}. LÃ½ do: ${finalReason}`,
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
                buildLeadAuditChange('status', l.status, toLeadStatusValue(nextStatus), 'Tráº¡ng thÃ¡i'),
                buildLeadAuditChange('lostReason', l.lostReason, finalReason, 'LÃ½ do tháº¥t báº¡i')
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
      'TÃƒÂªn': l.name,
      'SÃ„ÂT': l.phone,
      'Email': l.email,
      'CÃ†Â¡ sÃ¡Â»Å¸': l.company,
      'NguÃ¡Â»â€œn': l.source,
      'TrÃ¡ÂºÂ¡ng thÃƒÂ¡i': getLeadStatusLabel(l.status as string)
    })));
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Leads");
    write(wb, { bookType: 'xlsx', type: 'buffer' });
    // Trigger download (simplified)
    alert("TÃƒÂ­nh nÃ„Æ’ng export Ã„â€˜ang Ã„â€˜Ã†Â°Ã¡Â»Â£c xÃ¡Â»Â­ lÃƒÂ½ (Console log data)");
    console.log(leadsToExport);
  };

  // --- INLINE ACTIONS ---
  const handlePickUpLead = (e: React.MouseEvent, lead: ILead) => {
    e.stopPropagation();
    const updatedLead = { ...lead, ownerId: user?.id, status: toLeadStatusValue(STANDARD_LEAD_STATUS.PICKED) };
    handleUpdateLead(updatedLead);
    alert(`Ã„ÂÃƒÂ£ tiÃ¡ÂºÂ¿p nhÃ¡ÂºÂ­n lead: ${lead.name}`);
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
      alert('Vui lòng chọn lead trước khi phân bổ nhanh');
      return;
    }

    resetAssignModal();
    resetAssignFilters();
    setShowAssignModal(true);
  };

  const getAllocationStatusMeta = (lead: ILead) => {
    const normalizedStatus = normalizeLeadStatus(lead.status as string);

    if (normalizedStatus === STANDARD_LEAD_STATUS.LOST) {
      return {
        label: 'Máº¥t',
        className: 'border-rose-200 bg-rose-50 text-rose-700'
      };
    }

    if (normalizedStatus === STANDARD_LEAD_STATUS.UNVERIFIED) {
      return {
        label: 'KhÃ´ng xÃ¡c thá»±c',
        className: 'border-amber-200 bg-amber-50 text-amber-700'
      };
    }

    if (!lead.ownerId) {
      return {
        label: 'Má»›i',
        className: 'border-[#e4e7ec] bg-[#f8fafc] text-slate-600'
      };
    }

    if (isLeadStatusOneOf(normalizedStatus, [STANDARD_LEAD_STATUS.NEW, STANDARD_LEAD_STATUS.ASSIGNED])) {
      return {
        label: 'ÄÃ£ phÃ¢n bá»•',
        className: 'border-[#d7e3f4] bg-[#eef4fb] text-[#4f6b8a]'
      };
    }

    return {
      label: 'Äang xá»­ lÃ½',
      className: 'border-[#d9e7df] bg-[#edf6f1] text-[#55756a]'
    };
  };

  const renderLeadListRow = (lead: ILead, rowNumber: number) => {
    const nextActivity = (lead.activities || []).find(a => a.type === 'activity');
    const deadline = lead.expectedClosingDate ? new Date(lead.expectedClosingDate).toLocaleDateString('vi-VN') : '-';
    const potentialValue = String((lead as any).potential || lead.internalNotes?.potential || '').trim();
    const potentialToken = potentialValue.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '').toLowerCase();
    const potentialClassName =
      potentialToken === 'nong' ? 'bg-red-100 text-red-700 border-red-200' :
        potentialToken === 'tiemnang' ? 'bg-amber-100 text-amber-700 border-amber-200' :
          potentialToken === 'thamkhao' ? 'bg-slate-100 text-slate-700 border-slate-200' :
            'bg-slate-50 text-slate-500 border-slate-200';
    const tags = getLeadTagValues(lead);

    return (
      <tr
        key={lead.id}
        className={`group cursor-pointer transition-colors hover:bg-slate-50 ${selectedLeadIds.includes(lead.id) ? 'bg-slate-50' : ''}`}
        onClick={() => setSelectedLead(lead)}
      >
        <td className="px-2 py-1 text-center align-middle" onClick={(e) => e.stopPropagation()}>
          <input type="checkbox" className="rounded border-slate-300 w-3.5 h-3.5" checked={selectedLeadIds.includes(lead.id)} onClick={(e) => handleSelectLeadCheckbox(lead.id, e)} onChange={() => { }} />
        </td>
        <td className={`${compactBodyCellClass} text-center font-semibold text-slate-500`}>{rowNumber}</td>

        {visibleColumns.includes('opportunity') && (
          <td className={compactMetaCellClass}>
            <div className="flex flex-col gap-0.5 overflow-hidden">
              <span className="font-bold text-slate-900 text-[10px] truncate max-w-[120px]" title={lead.name}>{lead.name}</span>
              {lead.program && (
                <span
                  className="text-[9px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer hover:underline w-fit truncate block max-w-[120px]"
                  onClick={(e) => handleClickableField(e, 'program', 'ChÃ†Â°Ã†Â¡ng trÃƒÂ¬nh', lead.program, 'bg-blue-100 text-blue-700')}
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
        {visibleColumns.includes('phone') && <td className={`${compactBodyCellClass} font-semibold text-slate-700`}>{lead.phone || '-'}</td>}
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
              <span className="text-[12px] text-slate-400">ChÃ†Â°a nhÃ¡ÂºÂ­n</span>
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
              onClick={(e) => handleClickableField(e, 'source', 'NguÃ¡Â»â€œn', lead.source, 'bg-teal-100 text-teal-700')}
              title={lead.source}
            >
              <span className="truncate">{lead.source || '-'}</span>
            </span>
          </td>
        )}

        {visibleColumns.includes('potential') && (
          <td className={compactBodyCellClass}>
            <span className={`inline-flex max-w-[110px] items-center justify-center rounded-sm border px-1.5 py-0 text-[10px] font-semibold ${potentialClassName}`}>
              <span className="truncate">{potentialValue || '-'}</span>
            </span>
          </td>
        )}

        {visibleColumns.includes('tags') && <td className={`${compactMetaCellClass} overflow-hidden`}>
          {tags.length === 0 ? '-' : (
            <div className="flex flex-wrap gap-1">
              {tags.map((tag, tagIndex) => {
                const colors = [
                  'bg-blue-100 text-blue-800 border-blue-200',
                  'bg-green-100 text-green-800 border-green-200',
                  'bg-purple-100 text-purple-800 border-purple-200',
                  'bg-orange-100 text-orange-800 border-orange-200',
                  'bg-pink-100 text-pink-800 border-pink-200',
                  'bg-teal-100 text-teal-800 border-teal-200'
                ];
                const colorClass = colors[tag.charCodeAt(0) % colors.length] || colors[0];

                return (
                  <span
                    key={`${tag}-${tagIndex}`}
                    className={`rounded border px-1.5 py-0.5 text-[9px] font-bold whitespace-nowrap ${colorClass}`}
                  >
                    {tag}
                  </span>
                );
              })}
            </div>
          )}
        </td>}
        {visibleColumns.includes('market') && <td className={`${compactMetaCellClass} max-w-[110px] truncate`}>{(lead as any).marketingData?.market || '-'}</td>}
        {visibleColumns.includes('product') && <td className={`${compactMetaCellClass} max-w-[120px] truncate`} title={lead.program || (lead as any).product}>{(lead as any).product || lead.program || '-'}</td>}

        {visibleColumns.includes('nextActivity') && (
          <td className={compactMetaCellClass}>
            {nextActivity ? (
              <div className="flex max-w-[110px] items-center gap-1 overflow-hidden rounded-sm bg-purple-50 px-1 py-0 text-[9px] font-semibold text-purple-700" title={nextActivity.description}>
                <Clock size={8} className="shrink-0" />
                <span className="truncate">{nextActivity.description.split(':')[0] || 'LÃ¡Â»â€¹ch hÃ¡ÂºÂ¹n'}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-[9px] text-slate-400">
                <Plus size={8} /> LÃƒÂªn lÃ¡Â»â€¹ch
              </div>
            )}
          </td>
        )}

        {visibleColumns.includes('deadline') && (
          <td className={`${compactMetaCellClass} text-right`}>
            {deadline !== '-' ? <span className="text-red-600 font-bold">{deadline}</span> : '-'}
          </td>
        )}

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
                title={lead.slaReason || (lead.slaStatus === 'danger' ? 'QuÃƒÂ¡ hÃ¡ÂºÂ¡n' : 'ChÃƒÂº ÃƒÂ½')}
              >
                {lead.slaReason || (lead.slaStatus === 'danger' ? 'QuÃƒÂ¡ hÃ¡ÂºÂ¡n' : 'ChÃƒÂº ÃƒÂ½')}
              </span>
            ) : (
              <span className="text-slate-400 text-[9px]">-</span>
            )}
          </td>
        )}
      </tr>
    );
  };

  const compactHeaderCellClass = 'border-b border-[#f1f5f9] px-2 py-1.5 text-left text-[10px] font-bold uppercase tracking-[0.06em] text-[#7b8794]';
  const compactBodyCellClass = 'whitespace-nowrap px-2 py-1 align-middle text-[12px] text-slate-700';
  const compactMetaCellClass = 'whitespace-nowrap px-2 py-1 align-middle text-[12px] text-slate-600';
  const flatRibbonButtonClass = 'inline-flex items-center gap-1 rounded-sm border border-transparent px-2 py-1 text-[11px] font-semibold text-slate-700 transition-colors hover:border-[#d8dee8] hover:bg-white hover:text-slate-900';
  const compactToolbarButtonClass = 'inline-flex items-center gap-1 rounded-sm border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900';
  const leadTableColSpan = visibleColumns.length + 2;

  return decodeMojibakeReactNode(
    <>
      <div className="mx-auto min-h-screen max-w-[1600px] bg-[#f8fafc] px-4 py-6 font-inter text-slate-900 md:px-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-bold tracking-tight text-[#2f5bd3] md:text-[22px]">{t('leads.title')}</h1>
            <p className="mt-1 text-[13px] text-slate-600">{t('leads.description')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[14px] font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              <FileSpreadsheet size={18} /> {t('leads.importExcel')}
            </button>
            <button
              onClick={openCreateLeadModal}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2f5bd3] px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-[#244fc4]"
            >
              <Plus size={18} /> {t('leads.addLead')}
            </button>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <button onClick={() => setActiveTab('all')} className="rounded-[18px] border border-slate-200 bg-white px-5 py-4 text-left shadow-sm transition-transform hover:-translate-y-0.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">{t('leads.stats.totalLeads')}</div>
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
                <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">{t('leads.stats.newLeads')}</div>
                <div className="mt-2 text-[18px] font-bold text-slate-900">{stats.newLeads.toLocaleString()}</div>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <UserPlus size={22} />
              </span>
            </div>
          </button>
          <div className="hidden rounded-[18px] border border-slate-200 bg-white px-5 py-4 text-left shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">CÃƒÂ¡Ã‚ÂºÃ‚Â£nh bÃƒÆ’Ã‚Â¡o SLA</div>
                <div className="hidden mt-2 text-[18px] font-bold text-slate-900">{stats.slaRisk.toLocaleString()}</div>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
                <AlertTriangle size={22} />
              </span>
            </div>
          </div>
          <div className="rounded-[18px] border border-slate-200 bg-white px-5 py-4 text-left shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">TÃƒÂ¡Ã‚Â»Ã‚Â· lÃƒÂ¡Ã‚Â»Ã¢â‚¬Â¡ xÃƒÆ’Ã‚Â¡c thÃƒÂ¡Ã‚Â»Ã‚Â±c</div>
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
              <h1 className="text-[15px] font-bold uppercase tracking-[0.12em] text-slate-900">Phân bổ Lead</h1>
              <div className="flex flex-wrap items-center gap-0.5 rounded-sm border border-[#e4e7ec] bg-[#f5f6f8] px-1 py-1">
                <button
                  onClick={openCreateLeadModal}
                  className={flatRibbonButtonClass}
                >
                  <Plus size={13} /> TÃ¡ÂºÂ¡o mÃ¡Â»â€ºi
                </button>
                <button
                  onClick={openQuickAssignModal}
                  className={flatRibbonButtonClass}
                >
                  <UserPlus size={13} /> Phân bổ nhanh
                </button>
                <button
                  onClick={() => setShowImportModal(true)}
                  className={flatRibbonButtonClass}
                >
                  <FileSpreadsheet size={13} /> NhÃ¡ÂºÂ­p Excel
                </button>
                <button
                  onClick={handleBulkExport}
                  className={flatRibbonButtonClass}
                >
                  <Download size={13} /> XuÃ¡ÂºÂ¥t Excel
                </button>
                <div className="mx-1 h-4 w-px bg-[#d8dee8]"></div>
                <button
                  onClick={handleBulkMarkLost}
                  disabled={selectedLeadIds.length === 0}
                  className={`${flatRibbonButtonClass} ${selectedLeadIds.length === 0 ? 'cursor-not-allowed hover:border-transparent hover:bg-transparent hover:text-slate-700' : ''}`}
                  title="Ã„ÂÃƒÂ¡nh dÃ¡ÂºÂ¥u thÃ¡ÂºÂ¥t bÃ¡ÂºÂ¡i"
                >
                  <XCircle size={13} /> Ã„ÂÃƒÂ¡nh dÃ¡ÂºÂ¥u thÃ¡ÂºÂ¥t bÃ¡ÂºÂ¡i
                </button>

                <button
                  onClick={handleBulkDelete}
                  disabled={selectedLeadIds.length === 0}
                  className={`${flatRibbonButtonClass} ${selectedLeadIds.length === 0 ? 'cursor-not-allowed hover:border-transparent hover:bg-transparent hover:text-slate-700' : ''}`}
                  title="XÃƒÂ³a"
                >
                  <Trash2 size={13} /> XÃƒÂ³a
                </button>
              </div>
              <div className="hidden items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg border border-red-100 text-xs italic">
                <AlertTriangle size={14} className="shrink-0" />
                <span>Lead sáº½ Ä‘Æ°á»£c chuyá»ƒn sang <strong>{getLeadStatusLabel(lossStatus).toUpperCase()}</strong> vÃ  báº¯t buá»™c lÆ°u lÃ½ do.</span>
              </div>
            </div>

            <div className="ml-auto grid gap-x-6 gap-y-2 md:grid-cols-4 xl:max-w-[520px]">
              <button onClick={() => setActiveTab('all')} className="text-left">
                <div className="text-[11px] font-medium text-[#7b8794]">TÃ¡Â»â€¢ng lead</div>
                <div className="mt-0.5 text-[15px] font-bold text-slate-900">{stats.total.toLocaleString()}</div>
              </button>
              <button onClick={() => setActiveTab('new')} className="text-left">
                <div className="text-[11px] font-medium text-[#7b8794]">ChÆ°a phÃ¢n bá»•</div>
                <div className="mt-0.5 text-[15px] font-bold text-amber-600">{stats.unassigned.toLocaleString()}</div>
              </button>
              <div className="text-left">
                <div className="text-[11px] font-medium text-[#7b8794]">ÄÃ£ phÃ¢n bá»•</div>
                <div className="mt-0.5 text-[15px] font-bold text-emerald-600">{stats.assigned.toLocaleString()}</div>
              </div>
              <div className="text-left">
                <div className="text-[11px] font-medium text-[#7b8794]">Ã„Âang xÃ¡Â»Â­ lÃƒÂ½</div>
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
                {tab === 'all' && 'TÃƒÂ¡Ã‚ÂºÃ‚Â¥t cÃƒÂ¡Ã‚ÂºÃ‚Â£'}
                {tab === 'new' && 'Lead Má»›i'}
              </button>
            ))}
          </div>
          <div className="space-y-3 px-4 py-4">
            {false && selectedLeadIds.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[12px] font-semibold text-slate-500">{selectedLeadIds.length} lead Ãƒâ€žÃ¢â‚¬Ëœang Ãƒâ€žÃ¢â‚¬ËœÃƒâ€ Ã‚Â°ÃƒÂ¡Ã‚Â»Ã‚Â£c chÃƒÂ¡Ã‚Â»Ã‚Ân</span>
                <button onClick={openQuickAssignModal} className={compactToolbarButtonClass}><UserPlus size={14} /> PhÃƒÆ’Ã‚Â¢n bÃƒÂ¡Ã‚Â»Ã¢â‚¬Â¢ nhanh</button>
                <button onClick={handleBulkExport} className={compactToolbarButtonClass}><Download size={14} /> XuÃƒÂ¡Ã‚ÂºÃ‚Â¥t Excel</button>
                <button onClick={handleBulkMarkLost} className={compactToolbarButtonClass}><XCircle size={14} /> Ãƒâ€žÃ‚ÂÃƒÆ’Ã‚Â¡nh dÃƒÂ¡Ã‚ÂºÃ‚Â¥u thÃƒÂ¡Ã‚ÂºÃ‚Â¥t bÃƒÂ¡Ã‚ÂºÃ‚Â¡i</button>
                <button onClick={handleBulkDelete} className={compactToolbarButtonClass}><Trash2 size={14} /> XÃƒÆ’Ã‚Â³a</button>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-1.5 lg:flex-nowrap">
            <SmartSearchBar
              filters={toolbarFilterChips}
              onAddFilter={(filter) => {
                if (applySelectedAdvancedFilter(filter.value)) {
                  return;
                }
                addFilter(filter.field, filter.label, filter.value, filter.color);
              }}
              onRemoveFilter={handleToolbarFilterRemove}
              onClearAll={handleClearToolbarFilters}
              onFieldFilterConsumed={() => setSelectedAdvancedFilterFields([])}
              activeField={selectedAdvancedFilterOptions.length === 1 ? {
                field: selectedAdvancedFilterOptions[0].id,
                label: selectedAdvancedFilterOptions[0].label,
                color: 'bg-emerald-100 text-emerald-700'
              } : null}
              contextLabel={selectedAdvancedFilterOptions.length > 1 ? `Lọc ${selectedAdvancedFilterOptions.length} trường` : undefined}
              placeholder="Tìm kiếm lead..."
              compact
              fullWidth
            />

            <div className="flex items-center rounded-sm border border-[#e4e7ec] bg-[#f8fafc] p-0.5">
              <button onClick={() => setViewMode('list')} className={`rounded-sm p-1 ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`} title="Dạng danh sách"><ListIcon size={15} /></button>
              <button onClick={() => setViewMode('pivot')} className={`rounded-sm p-1 ${viewMode === 'pivot' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`} title="Báo cáo Pivot"><LayoutGrid size={15} /></button>
            </div>

            <div className="relative hidden">
              <button
                onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 text-slate-600 bg-white shadow-sm"
              >
                <Settings size={16} /> Cột
              </button>
              {showColumnDropdown && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowColumnDropdown(false)}></div>
                  <div className="absolute right-0 top-full mt-2 w-[500px] bg-white border border-slate-200 rounded-lg shadow-xl z-40 p-3 animate-in fade-in zoom-in-95">
                    <div className="text-xs font-bold text-slate-500 uppercase px-2 py-1 mb-2 border-b border-slate-100 pb-2">Hiển thị cột</div>
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
                  <option value="createdAt">Ngày tạo</option>
                  <option value="deadline">Hạn chót</option>
                  <option value="lastInteraction">Tương tác cuối</option>
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
                      <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Khoảng thời gian tùy chỉnh</div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1">Từ ngày</label>
                          <input
                            type="date"
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:border-blue-500 outline-none"
                            value={customRange?.start || ''}
                            onChange={(e) => setCustomRange(prev => ({ start: e.target.value, end: prev?.end || e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1">Đến ngày</label>
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
                          Làm lại
                        </button>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setShowTimePicker(false)}
                            className="px-4 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-bold"
                          >
                            Hủy
                          </button>
                          <button
                            onClick={() => {
                              if (customRange?.start && customRange?.end) {
                                setTimeRangeType('custom');
                                setShowTimePicker(false);
                              } else {
                                alert("Vui lòng chọn khoảng ngày");
                              }
                            }}
                            className="px-6 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-lg shadow-blue-100"
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
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className={`inline-flex items-center gap-1 rounded-sm border px-2 py-1 text-[11px] font-semibold transition-colors ${showFilterDropdown ? 'border-slate-300 bg-slate-100 text-slate-900' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
              >
                <Filter size={13} /> Lọc nâng cao
                {(() => {
                  const activeCount = [
                    ...selectedAdvancedFilterFields,
                    ...selectedAdvancedGroupFields,
                    ...searchFilters,
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
                        Chọn trường là bảng sẽ lọc ngay các dòng đang có dữ liệu ở trường đó. Có thể gõ thêm ở ô tìm kiếm để thu hẹp tiếp.
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
                        Có thể chọn nhiều trường. Thứ tự bấm sẽ là thứ tự ghép nhóm hiển thị trong bảng.
                      </p>
                      <div className="max-h-[360px] overflow-y-auto custom-scrollbar space-y-1">
                          {ALL_COLUMNS.map((col) => (
                            <button
                              key={`group-${col.id}`}
                              onClick={() => toggleAdvancedFieldSelection('group', col.id)}
                              className={`flex w-full items-center gap-2 text-left py-2 px-3 rounded-lg transition-colors ${selectedAdvancedGroupFields.includes(col.id) ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200' : 'text-slate-700 hover:bg-slate-50 border border-transparent'}`}
                            >
                              <span className="flex-1">{col.label}</span>
                              {selectedAdvancedGroupFields.includes(col.id) ? (
                                <span className="rounded-full border border-blue-100 bg-white px-2 py-0.5 text-[10px] font-bold text-blue-700">
                                  {selectedAdvancedGroupFields.indexOf(col.id) + 1}
                                </span>
                              ) : null}
                            </button>
                        ))}
                      </div>
                      </div>
                    </div>
                  </div>
                )}
              {(() => {
                const hasActiveFilters = selectedAdvancedFilterFields.length > 0 || selectedAdvancedGroupFields.length > 0 || searchFilters.length > 0 || advancedFilters.myPipeline || advancedFilters.unassigned || advancedFilters.openOps || advancedFilters.createdDate || advancedFilters.closedDate || advancedFilters.status.length > 0;
                return hasActiveFilters ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearToolbarFilters();
                    }}
                    className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-lg z-10"
                    title="Xóa tất cả bộ lọc"
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
                      <div className="font-bold text-slate-800 mb-2 flex items-center gap-2"><Filter size={14} /> BÃ¡Â»â„¢ lÃ¡Â»Âc</div>

                      {/* My Pipeline */}
                      <div className="group">
                        <div
                          onClick={() => setAdvancedFilters(prev => ({ ...prev, myPipeline: !prev.myPipeline }))}
                          className={`flex justify-between items-center py-1.5 px-2 hover:bg-slate-50 rounded cursor-pointer font-medium ${advancedFilters.myPipeline ? 'bg-blue-50 text-blue-700' : 'text-slate-700'}`}
                        >
                          <span>
                            <Check size={14} className={`inline mr-2 ${advancedFilters.myPipeline ? 'text-blue-600' : 'text-transparent'}`} />
                            Quy trÃƒÂ¬nh cÃ¡Â»Â§a tÃƒÂ´i
                          </span>
                        </div>
                        <div className="pl-6 space-y-1">
                          <div
                            onClick={() => setAdvancedFilters(prev => ({ ...prev, unassigned: !prev.unassigned }))}
                            className={`py-1 px-2 hover:bg-slate-50 rounded cursor-pointer ${advancedFilters.unassigned ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600'}`}
                          >
                            <Check size={12} className={`inline mr-1 ${advancedFilters.unassigned ? 'text-blue-600' : 'text-transparent'}`} />
                            ChÃ†Â°a phÃƒÂ¢n cÃƒÂ´ng
                          </div>
                          <div
                            onClick={() => setAdvancedFilters(prev => ({ ...prev, openOps: !prev.openOps }))}
                            className={`py-1 px-2 hover:bg-slate-50 rounded cursor-pointer ${advancedFilters.openOps ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600'}`}
                          >
                            <Check size={12} className={`inline mr-1 ${advancedFilters.openOps ? 'text-blue-600' : 'text-transparent'}`} />
                            MÃ¡Â»Å¸ cÃ†Â¡ hÃ¡Â»â„¢i
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-slate-100 my-1"></div>

                      {/* Date Created */}
                      <div className="group relative">
                        <div onClick={(e) => toggleFilter('filter_created', e)} className={`flex justify-between items-center py-1.5 px-2 hover:bg-slate-50 rounded cursor-pointer ${expandedFilter === 'filter_created' ? 'bg-slate-100 text-blue-600' : advancedFilters.createdDate ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700'}`}>
                          <span>
                            <Check size={14} className={`inline mr-2 ${advancedFilters.createdDate ? 'text-blue-600' : 'text-transparent'}`} />
                            NgÃƒÂ y tÃ¡ÂºÂ¡o
                            {advancedFilters.createdDate && (
                              <span className="ml-2 text-xs bg-blue-100 px-1.5 py-0.5 rounded">
                                {advancedFilters.createdDate.type === 'month' && `T${advancedFilters.createdDate.value}`}
                                {advancedFilters.createdDate.type === 'quarter' && `Q${advancedFilters.createdDate.value}`}
                                {advancedFilters.createdDate.type === 'year' && advancedFilters.createdDate.value}
                              </span>
                            )}
                          </span>
                          <span className="text-slate-400">Ã¢â€“Â¼</span>
                        </div>
                        {expandedFilter === 'filter_created' && (
                          <div className="absolute left-0 top-full mt-1 w-full bg-white border border-slate-200 shadow-xl rounded-lg p-2 z-50">
                            {[2, 1, 12].map(month => (
                              <div
                                key={`month-${month}`}
                                onClick={() => { setDateFilter('createdDate', 'month', month); setExpandedFilter(null); }}
                                className={`py-1 px-3 hover:bg-blue-50 rounded cursor-pointer ${advancedFilters.createdDate?.type === 'month' && advancedFilters.createdDate?.value === month ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-slate-700'}`}
                              >
                                thÃƒÂ¡ng {month}
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
                            NgÃƒÂ y chÃ¡Â»â€˜t
                            {advancedFilters.closedDate && (
                              <span className="ml-2 text-xs bg-blue-100 px-1.5 py-0.5 rounded">
                                {advancedFilters.closedDate.type === 'month' && `T${advancedFilters.closedDate.value}`}
                                {advancedFilters.closedDate.type === 'quarter' && `Q${advancedFilters.closedDate.value}`}
                                {advancedFilters.closedDate.type === 'year' && advancedFilters.closedDate.value}
                              </span>
                            )}
                          </span>
                          <span className="text-slate-400">Ã¢â€“Â¼</span>
                        </div>
                        {expandedFilter === 'filter_closed' && (
                          <div className="absolute left-0 top-full mt-1 w-full bg-white border border-slate-200 shadow-xl rounded-lg p-2 z-50">
                            {[2, 1, 12].map(month => (
                              <div
                                key={`month-${month}`}
                                onClick={() => { setDateFilter('closedDate', 'month', month); setExpandedFilter(null); }}
                                className={`py-1 px-3 hover:bg-blue-50 rounded cursor-pointer ${advancedFilters.closedDate?.type === 'month' && advancedFilters.closedDate?.value === month ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-slate-700'}`}
                              >
                                thÃƒÂ¡ng {month}
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

                      {['Ã„ÂÃ¡ÂºÂ¡t', 'Ã„Âang diÃ¡Â»â€¦n ra', 'Rotting', 'MÃ¡ÂºÂ¥t'].map(status => (
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
                      {/* Removed "BÃ¡Â»â„¢ lÃ¡Â»Âc tÃƒÂ¹y chÃ¡Â»â€°nh" */}
                    </div>

                    {/* COLUMN 2: GROUP BY */}
                    <div className="flex-1 px-4 border-r border-slate-100 space-y-2">
                      <div className="font-bold text-slate-800 mb-2 flex items-center gap-2"><Users size={14} /> NhÃƒÂ³m theo</div>

                      {['ChuyÃƒÂªn viÃƒÂªn sales', 'BÃ¡Â»â„¢ phÃ¡ÂºÂ­n sales', 'Giai Ã„â€˜oÃ¡ÂºÂ¡n', 'ThÃƒÂ nh phÃ¡Â»â€˜', 'QuÃ¡Â»â€˜c gia', 'LÃƒÂ½ do mÃ¡ÂºÂ¥t', 'ChiÃ¡ÂºÂ¿n dÃ¡Â»â€¹ch', 'PhÃ†Â°Ã†Â¡ng tiÃ¡Â»â€¡n', 'NguÃ¡Â»â€œn'].map(field => (
                        <div key={field} className="py-1.5 px-2 hover:bg-slate-50 rounded cursor-pointer text-slate-700">
                          {field}
                        </div>
                      ))}

                      <div className="border-t border-slate-100 my-1"></div>
                      <div className="group relative">
                        <div onClick={(e) => toggleFilter('group_created', e)} className={`flex justify-between items-center py-1.5 px-2 hover:bg-slate-50 rounded cursor-pointer ${expandedFilter === 'group_created' ? 'bg-slate-100 text-blue-600' : 'text-slate-700'}`}>
                          <span>NgÃƒÂ y tÃ¡ÂºÂ¡o</span>
                          <span className="text-slate-400">Ã¢â€“Â¼</span>
                        </div>
                        {expandedFilter === 'group_created' && (
                          <div className="absolute left-0 top-full mt-1 w-full bg-white border border-slate-200 shadow-xl rounded-lg p-2 z-50">
                            {['NÃ„Æ’m', 'QuÃƒÂ½', 'ThÃƒÂ¡ng', 'TuÃ¡ÂºÂ§n', 'NgÃƒÂ y'].map(item => (
                              <div key={item} className="py-1 px-3 hover:bg-slate-100 rounded cursor-pointer text-slate-700">{item}</div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="group relative">
                        <div onClick={(e) => toggleFilter('group_expected', e)} className={`flex justify-between items-center py-1.5 px-2 hover:bg-slate-50 rounded cursor-pointer ${expandedFilter === 'group_expected' ? 'bg-slate-100 text-blue-600' : 'text-slate-700'}`}>
                          <span>NgÃƒÂ y Ã„â€˜ÃƒÂ³ng dÃ¡Â»Â± kiÃ¡ÂºÂ¿n</span>
                          <span className="text-slate-400">Ã¢â€“Â¼</span>
                        </div>
                        {expandedFilter === 'group_expected' && (
                          <div className="absolute left-0 top-full mt-1 w-full bg-white border border-slate-200 shadow-xl rounded-lg p-2 z-50">
                            {['NÃ„Æ’m', 'QuÃƒÂ½', 'ThÃƒÂ¡ng', 'TuÃ¡ÂºÂ§n', 'NgÃƒÂ y'].map(item => (
                              <div key={item} className="py-1 px-3 hover:bg-slate-100 rounded cursor-pointer text-slate-700">{item}</div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="group relative">
                        <div onClick={(e) => toggleFilter('group_closed', e)} className={`flex justify-between items-center py-1.5 px-2 hover:bg-slate-50 rounded cursor-pointer ${expandedFilter === 'group_closed' ? 'bg-slate-100 text-blue-600' : 'text-slate-700'}`}>
                          <span>NgÃƒÂ y chÃ¡Â»â€˜t</span>
                          <span className="text-slate-400">Ã¢â€“Â¼</span>
                        </div>
                        {expandedFilter === 'group_closed' && (
                          <div className="absolute left-0 top-full mt-1 w-full bg-white border border-slate-200 shadow-xl rounded-lg p-2 z-50">
                            {['NÃ„Æ’m', 'QuÃƒÂ½', 'ThÃƒÂ¡ng', 'TuÃ¡ÂºÂ§n', 'NgÃƒÂ y'].map(item => (
                              <div key={item} className="py-1 px-3 hover:bg-slate-100 rounded cursor-pointer text-slate-700">{item}</div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="border-t border-slate-100 my-1"></div>
                      <div className="group relative">
                        <div onClick={(e) => toggleFilter('group_custom', e)} className={`flex justify-between items-center py-1.5 px-2 hover:bg-slate-50 rounded cursor-pointer ${expandedFilter === 'group_custom' ? 'bg-slate-100 text-blue-600' : 'text-slate-700'}`}>
                          <span>NhÃƒÂ³m tÃƒÂ¹y chÃ¡Â»â€°nh</span>
                          <span className="text-slate-400">Ã¢â€“Â¼</span>
                        </div>
                        {expandedFilter === 'group_custom' && (
                          <div className="absolute left-0 bottom-full mb-1 w-[300px] bg-white border border-slate-200 shadow-xl rounded-lg p-2 z-50 max-h-[300px] overflow-y-auto custom-scrollbar">
                            {['BÃ¡Â»â„¢ phÃ¡ÂºÂ­n sales', 'ChiÃ¡ÂºÂ¿n dÃ¡Â»â€¹ch', 'ChuyÃƒÂªn viÃƒÂªn sales', 'ChÃ¡ÂºÂ¥t lÃ†Â°Ã¡Â»Â£ng email', 'ChÃ¡ÂºÂ¥t lÃ†Â°Ã¡Â»Â£ng Ã„â€˜iÃ¡Â»â€¡n thoÃ¡ÂºÂ¡i', 'CÃƒÂ´ng ty', 'CÃ†Â¡ hÃ¡Â»â„¢i', 'CÃ¡ÂºÂ­p nhÃ¡ÂºÂ­t giai Ã„â€˜oÃ¡ÂºÂ¡n lÃ¡ÂºÂ§n cuÃ¡Â»â€˜i', 'CÃ¡ÂºÂ­p nhÃ¡ÂºÂ­t lÃ¡ÂºÂ§n cuÃ¡Â»â€˜i bÃ¡Â»Å¸i', 'CÃ¡ÂºÂ­p nhÃ¡ÂºÂ­t lÃ¡ÂºÂ§n cuÃ¡Â»â€˜i vÃƒÂ o', 'Email', 'Email cc', 'Email chuÃ¡ÂºÂ©n hÃƒÂ³a', 'Giai Ã„â€˜oÃ¡ÂºÂ¡n', 'GiÃ¡Â»â€ºi thiÃ¡Â»â€¡u bÃ¡Â»Å¸i', 'HiÃ¡Â»â€¡n ID', 'HoÃƒÂ n tÃ¡ÂºÂ¥t tÃ„Æ’ng cÃ†Â°Ã¡Â»Âng', 'KÃ¡ÂºÂ¿ hoÃ¡ÂºÂ¡ch Ã„â€˜Ã¡Â»â€¹nh kÃ¡Â»Â³', 'LiÃƒÂªn hÃ¡Â»â€¡', 'LoÃ¡ÂºÂ¡i'].map(field => (
                              <div key={field} className="py-1 px-3 hover:bg-slate-100 rounded cursor-pointer whitespace-nowrap text-slate-700">{field}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* COLUMN 3: FAVORITES */}
                    <div className="flex-1 pl-4 space-y-4">
                      <div className="font-bold text-slate-800 mb-2 flex items-center gap-2"><Save size={14} /> Danh sÃƒÂ¡ch yÃƒÂªu thÃƒÂ­ch</div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">LÃ†Â°u bÃ¡Â»â„¢ lÃ¡Â»Âc hiÃ¡Â»â€¡n tÃ¡ÂºÂ¡i</label>
                          <input className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm mb-2" defaultValue="Quy trÃƒÂ¬nh" />
                          <div className="flex items-center gap-2 mb-2">
                            <input type="checkbox" id="default-filter" className="rounded border-slate-300" />
                            <label htmlFor="default-filter" className="text-slate-600 text-sm">BÃ¡Â»â„¢ lÃ¡Â»Âc mÃ¡ÂºÂ·c Ã„â€˜Ã¡Â»â€¹nh</label>
                          </div>
                          <div className="flex gap-2">
                            <button className="flex-1 bg-purple-700 text-white py-1 rounded text-xs font-bold hover:bg-purple-800">LÃ†Â°u</button>
                            <button className="flex-1 bg-slate-100 text-slate-700 py-1 rounded text-xs font-bold hover:bg-slate-200">ChÃ¡Â»â€°nh sÃ¡Â»Â­a</button>
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
                title={`TÃƒÂ¬m thÃ¡ÂºÂ¥y ${duplicateGroups.length} nhÃƒÂ³m trÃƒÂ¹ng SÃ„ÂT`}
              >
                <Database size={13} />
                ChÃ¡Â»â€˜ng trÃƒÂ¹ng
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
                <Settings size={13} /> CÃ¡Â»â„¢t
              </button>
              {showColumnDropdown && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowColumnDropdown(false)}></div>
                  <div className="absolute right-0 top-full mt-2 w-[500px] bg-white border border-slate-200 rounded-lg shadow-xl z-40 p-3 animate-in fade-in zoom-in-95">
                    <div className="text-xs font-bold text-slate-500 uppercase px-2 py-1 mb-2 border-b border-slate-100 pb-2">HiÃƒÂ¡Ã‚Â»Ã†â€™n thÃƒÂ¡Ã‚Â»Ã¢â‚¬Â¹ cÃƒÂ¡Ã‚Â»Ã¢â€žÂ¢t</div>
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
                {tab === 'all' && 'TÃ¡ÂºÂ¥t cÃ¡ÂºÂ£'}
                {tab === 'new' && 'Lead Má»›i'}
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
                <span className="text-[12px] font-semibold text-slate-500">{selectedLeadIds.length} lead Ä‘ang Ä‘Æ°á»£c chá»n</span>
                <button onClick={openQuickAssignModal} className={compactToolbarButtonClass}><UserPlus size={14} /> PhÃ¢n bá»• nhanh</button>
                <button onClick={handleBulkExport} className={compactToolbarButtonClass}><Download size={14} /> Xuáº¥t Excel</button>
                <button onClick={handleBulkMarkLost} className={compactToolbarButtonClass}><XCircle size={14} /> ÄÃ¡nh dáº¥u tháº¥t báº¡i</button>
                <button onClick={handleBulkDelete} className={compactToolbarButtonClass}><Trash2 size={14} /> XÃ³a</button>
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
                    <span className="text-[12px] font-semibold text-slate-500">{selectedLeadIds.length} lead Ä‘ang Ä‘Æ°á»£c chá»n</span>
                    <button onClick={openQuickAssignModal} className={compactToolbarButtonClass}><UserPlus size={14} /> PhÃ¢n bá»• nhanh</button>
                    <button onClick={handleBulkExport} className={compactToolbarButtonClass}><Download size={14} /> Xuáº¥t Excel</button>
                    <button onClick={handleBulkMarkLost} className={compactToolbarButtonClass}><XCircle size={14} /> ÄÃ¡nh dáº¥u tháº¥t báº¡i</button>
                    <button onClick={handleBulkDelete} className={compactToolbarButtonClass}><Trash2 size={14} /> XÃ³a</button>
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
                    <th className={`${compactHeaderCellClass} w-12 text-center`}>STT</th>
                    {visibleColumns.includes('opportunity') && <th className={compactHeaderCellClass}>T\u00ean li\u00ean h\u1ec7</th>}
                    {visibleColumns.includes('contact') && <th className={compactHeaderCellClass}>T\u00ean li\u00ean h\u1ec7 ph\u1ee5</th>}
                    {visibleColumns.includes('company') && <th className={compactHeaderCellClass}>CÃ†Â¡ sÃ¡Â»Å¸ / CÃƒÂ´ng ty</th>}
                    {visibleColumns.includes('email') && <th className={compactHeaderCellClass}>Email</th>}
                    {visibleColumns.includes('phone') && <th className={compactHeaderCellClass}>SÃ„ÂT</th>}
                    {visibleColumns.includes('salesperson') && <th className={compactHeaderCellClass}>Sale</th>}
                    {visibleColumns.includes('campaign') && <th className={compactHeaderCellClass}>ChiÃ¡ÂºÂ¿n dÃ¡Â»â€¹ch</th>}
                    {visibleColumns.includes('source') && <th className={compactHeaderCellClass}>NguÃ¡Â»â€œn</th>}
                    {visibleColumns.includes('potential') && <th className={compactHeaderCellClass}>Mức độ tiềm năng</th>}
                    {visibleColumns.includes('tags') && <th className={compactHeaderCellClass}>Tags</th>}
                    {visibleColumns.includes('market') && <th className={compactHeaderCellClass}>THÃ¡Â»Å  TRÃ†Â¯Ã¡Â»Å“NG</th>}
                    {visibleColumns.includes('product') && <th className={compactHeaderCellClass}>SÃ¡ÂºÂ¢N PHÃ¡ÂºÂ¨M QUAN TÃƒâ€šM</th>}
                    {visibleColumns.includes('nextActivity') && <th className={compactHeaderCellClass}>HoÃ¡ÂºÂ¡t Ã„â€˜Ã¡Â»â„¢ng</th>}
                    {visibleColumns.includes('deadline') && <th className={`${compactHeaderCellClass} text-right`}>HÃ¡ÂºÂ¡n chÃƒÂ³t</th>}
                    {visibleColumns.includes('value') && <th className={`${compactHeaderCellClass} text-right`}>Doanh thu</th>}
                    {visibleColumns.includes('createdAt') && <th className={`${compactHeaderCellClass} text-right`}>NgÃƒÂ y Ã„â€˜Ã¡Â»â€¢ lead</th>}
                    {visibleColumns.includes('title') && <th className={compactHeaderCellClass}>Danh xÃ†Â°ng</th>}
                    {visibleColumns.includes('address') && <th className={compactHeaderCellClass}>Ã„ÂÃ¡Â»â€¹a chÃ¡Â»â€°</th>}
                    {visibleColumns.includes('referredBy') && <th className={compactHeaderCellClass}>NgÃ†Â°Ã¡Â»Âi giÃ¡Â»â€ºi thiÃ¡Â»â€¡u</th>}
                    {visibleColumns.includes('status') && <th className={`${compactHeaderCellClass} text-center`}>TrÃ¡ÂºÂ¡ng thÃƒÂ¡i</th>}
                    {visibleColumns.includes('notes') && <th className={compactHeaderCellClass}>Ghi chÃƒÂº</th>}
                    {visibleColumns.includes('sla') && <th className={compactHeaderCellClass}>CÃ¡ÂºÂ£nh bÃƒÂ¡o SLA</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9]">
                  {filteredLeads.length === 0 ? (
                    <tr><td colSpan={leadTableColSpan} className="px-3 py-4 text-center text-[12px] text-slate-400">No data available</td></tr>
                  ) : selectedAdvancedGroupFields.length > 0 ? (
                    (() => {
                      let currentIndex = 0;

                      return groupedLeads.map((group) => {
                        const groupStartIndex = currentIndex;
                        currentIndex += group.leads.length;

                        return (
                          <React.Fragment key={group.key}>
                            <tr className="bg-slate-100 border-y border-slate-200">
                              <td colSpan={leadTableColSpan} className="px-4 py-2">
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                                    {group.label}
                                  </span>
                                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500 border border-slate-200">
                                    {group.leads.length} lead
                                  </span>
                                </div>
                              </td>
                            </tr>
                            {group.leads.map((lead, index) => renderLeadListRow(lead, groupStartIndex + index + 1))}
                          </React.Fragment>
                        );
                      });
                    })()
                  ) : (
                    filteredLeads.map((lead, index) => renderLeadListRow(lead, index + 1))
                  )}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </div>

        {false && selectedLead && user?.role === UserRole.MARKETING && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedLead(null)}></div>
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
              <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Users size={20} className="text-blue-600" />
                  Chi tiÃ¡ÂºÂ¿t Lead: {selectedLead.name}
                </h3>
                <div className="flex items-center gap-3">
                  <button className="px-3 py-1.5 bg-white border border-slate-300 rounded text-slate-600 flex items-center gap-2 text-sm font-semibold hover:bg-slate-50">
                    <Phone size={16} /> CuÃƒÂ¡Ã‚Â»Ã¢â€žÂ¢c gÃƒÂ¡Ã‚Â»Ã‚Âi
                  </button>
                  <button onClick={() => setSelectedLead(null)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto bg-white p-6 md:p-8 custom-scrollbar">
                <LeadDrawerProfileForm
                  leadFormData={editLeadData}
                  leadFormActiveTab={editModalActiveTab}
                  closeReasonOptions={isClosedLeadStatus(editLeadData.status) ? editCloseReasonOptions : []}
                  salesOptions={leadSalesOptions}
                  availableTags={availableTags}
                  fixedTags={FIXED_LEAD_TAGS}
                  isAddingTag={isAddingEditTag}
                  customCloseReason={CUSTOM_CLOSE_REASON}
                  onPatch={patchEditLeadData}
                  onTabChange={setEditModalActiveTab}
                  onStatusChange={(status) => setEditLeadData((prev) => ({
                    ...prev,
                    status,
                    ...getCloseReasonStateForStatusChange(status, prev.lossReason, prev.lossReasonCustom)
                  }))}
                  onStartAddingTag={() => setIsAddingEditTag(true)}
                  onStopAddingTag={() => setIsAddingEditTag(false)}
                  onAddTag={addTagToEditLead}
                  onCreateTag={(tag) => {
                    addTagCatalogEntry(tag);
                    addTagToEditLead(tag);
                  }}
                  onRemoveSelectedTag={(tag) => setEditLeadData((prev) => ({ ...prev, tags: prev.tags.filter((item) => item !== tag) }))}
                  onDeleteTag={deleteTagCatalogEntry}
                />
              </div>

              <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 shrink-0">
                <button onClick={() => setSelectedLead(null)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg">Ãƒâ€žÃ‚ÂÃƒÆ’Ã‚Â³ng</button>
                <button onClick={handleUpdateSelectedLead} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center gap-2 shadow-sm"><Save size={18} /> CÃƒÂ¡Ã‚ÂºÃ‚Â­p nhÃƒÂ¡Ã‚ÂºÃ‚Â­t</button>
              </div>
            </div>
          </div>
        )}

        {/* EDIT MODAL - MARKETING VIEW */}
        {selectedLead && user?.role === UserRole.MARKETING && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedLead(null)}></div>
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
              <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Users size={20} className="text-blue-600" />
                  Chi tiÃ¡ÂºÂ¿t Lead: {selectedLead.name}
                </h3>
                <div className="flex items-center gap-3">
                  <button className="px-3 py-1.5 bg-white border border-slate-300 rounded text-slate-600 flex items-center gap-2 text-sm font-semibold hover:bg-slate-50">
                    <Phone size={16} /> CuÃ¡Â»â„¢c gÃ¡Â»Âi
                  </button>
                  <button onClick={() => setSelectedLead(null)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto bg-white p-6 md:p-8 custom-scrollbar">
                {/* TOP HEADER */}
                <div className="mb-6">
                  <label className="block text-slate-700 text-sm font-bold mb-2">MÃƒÂ´ tÃ¡ÂºÂ£ / TÃƒÂªn khÃƒÂ¡ch hÃƒÂ ng <span className="text-red-500">*</span></label>
                  <div className="flex gap-3">
                    <select
                      className="w-28 px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none bg-white font-medium text-slate-700"
                      value={editLeadData.title}
                      onChange={e => setEditLeadData({ ...editLeadData, title: e.target.value })}
                    >
                      <option value="">Danh xưng</option>
                      {LEAD_RELATION_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <input
                      className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm font-semibold focus:border-purple-500 outline-none text-slate-800"
                      placeholder="VD: Nguyen Van A..."
                      value={editLeadData.name}
                      onChange={e => setEditLeadData({ ...editLeadData, name: e.target.value })}
                    />
                  </div>
                </div>

                {/* MAIN FORM GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-5">
                  {/* LEFT COL */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Quốc gia mục tiêu <span className="text-red-500">*</span></label>
                      <select
                        className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none bg-white text-slate-700"
                        value={editLeadData.targetCountry}
                        onChange={e => setEditLeadData({ ...editLeadData, targetCountry: e.target.value })}
                      >
                        <option value="">-- Chọn quốc gia mục tiêu --</option>
                        {LEAD_TARGET_COUNTRY_OPTIONS.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>

                    {false && isClosedLeadStatus(editLeadData.status) && (
                      <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50/70 p-4">
                        <div className="flex items-center gap-4">
                          <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">LÃ½ do</label>
                          <select
                            className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm outline-none bg-white"
                            value={editLeadData.lossReason}
                            onChange={e => setEditLeadData({ ...editLeadData, lossReason: e.target.value })}
                          >
                            <option value="">-- Chá»n lÃ½ do --</option>
                            {editCloseReasonOptions.map(reason => (
                              <option key={reason} value={reason}>{reason}</option>
                            ))}
                          </select>
                        </div>
                        {editLeadData.lossReason === CUSTOM_CLOSE_REASON && (
                          <div className="flex items-start gap-4">
                            <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold mt-2">Chi tiáº¿t</label>
                            <textarea
                              className="flex-1 min-h-[88px] rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none"
                              placeholder="Nháº­p lÃ½ do cá»¥ thá»ƒ..."
                              value={editLeadData.lossReasonCustom}
                              onChange={e => setEditLeadData({ ...editLeadData, lossReasonCustom: e.target.value })}
                            />
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex items-start gap-4">
                      <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold pt-2">Ã„ÂÃ¡Â»â€¹a chÃ¡Â»â€°</label>
                      <div className="flex-1 space-y-2">
                        <input
                          className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none text-slate-700"
                          placeholder="SÃ¡Â»â€˜ nhÃƒÂ , Ã„â€˜Ã†Â°Ã¡Â»Âng..."
                          value={editLeadData.street}
                          onChange={e => setEditLeadData({ ...editLeadData, street: e.target.value })}
                        />
                        <div className="grid grid-cols-3 gap-2">
                          <input className="px-2 py-2 border border-slate-300 rounded text-sm outline-none" placeholder="TÃ¡Â»â€°nh/TP" value={editLeadData.province} onChange={e => setEditLeadData({ ...editLeadData, province: e.target.value })} />
                          <input className="px-2 py-2 border border-slate-300 rounded text-sm outline-none" placeholder="QuÃ¡ÂºÂ­n/HuyÃ¡Â»â€¡n" value={editLeadData.city} onChange={e => setEditLeadData({ ...editLeadData, city: e.target.value })} />
                          <input className="px-2 py-2 border border-slate-300 rounded text-sm outline-none" placeholder="P/XÃƒÂ£" value={editLeadData.ward} onChange={e => setEditLeadData({ ...editLeadData, ward: e.target.value })} />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">SÃ¡ÂºÂ£n phÃ¡ÂºÂ©m</label>
                      <select
                        className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none bg-white text-slate-700"
                        value={editLeadData.product}
                        onChange={e => setEditLeadData({ ...editLeadData, product: e.target.value })}
                      >
                        <option value="">-- ChÃ¡Â»Ân sÃ¡ÂºÂ£n phÃ¡ÂºÂ©m --</option>
                        <option value="TiÃ¡ÂºÂ¿ng Ã„ÂÃ¡Â»Â©c">TiÃ¡ÂºÂ¿ng Ã„ÂÃ¡Â»Â©c</option>
                        <option value="Du hÃ¡Â»Âc Ã„ÂÃ¡Â»Â©c">Du hÃ¡Â»Âc Ã„ÂÃ¡Â»Â©c</option>
                        <option value="Du hÃ¡Â»Âc NghÃ¡Â»Â">Du hÃ¡Â»Âc NghÃ¡Â»Â</option>
                        <option value="XKLÃ„Â">XuÃ¡ÂºÂ¥t khÃ¡ÂºÂ©u lao Ã„â€˜Ã¡Â»â„¢ng</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Cơ sở</label>
                      <select
                        className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none bg-white text-slate-700"
                        value={editLeadData.market}
                        onChange={e => setEditLeadData({ ...editLeadData, market: e.target.value })}
                      >
                        <option value="">-- Chọn cơ sở --</option>
                        {LEAD_CAMPUS_OPTIONS.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* RIGHT COL */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Ã„ÂiÃ¡Â»â€¡n thoÃ¡ÂºÂ¡i <span className="text-red-500">*</span></label>
                      <input className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm outline-none font-medium text-slate-800" value={editLeadData.phone} onChange={e => setEditLeadData({ ...editLeadData, phone: e.target.value })} />
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Email</label>
                      <input className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm outline-none" value={editLeadData.email} onChange={e => setEditLeadData({ ...editLeadData, email: e.target.value })} />
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">PhÃ¡Â»Â¥ trÃƒÂ¡ch</label>
                      <select className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm outline-none bg-white" value={editLeadData.salesperson} onChange={e => setEditLeadData({ ...editLeadData, salesperson: e.target.value })}>
                        <option value="">-- Sale phÃ¡Â»Â¥ trÃƒÂ¡ch --</option>
                        {SALES_REPS.map(rep => <option key={rep.id} value={rep.id}>{rep.name}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">TrÃ¡ÂºÂ¡ng thÃƒÂ¡i</label>
                      <select className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm outline-none bg-white" value={editLeadData.status} onChange={e => setEditLeadData({ ...editLeadData, status: e.target.value, ...getCloseReasonStateForStatusChange(e.target.value, editLeadData.lossReason, editLeadData.lossReasonCustom) })}>
                        {STANDARD_LEAD_STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                    {isClosedLeadStatus(editLeadData.status) && (
                      <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50/70 p-4">
                        <div className="flex items-center gap-4">
                          <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">LÃ½ do</label>
                          <select
                            className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm outline-none bg-white"
                            value={editLeadData.lossReason}
                            onChange={e => setEditLeadData({ ...editLeadData, lossReason: e.target.value })}
                          >
                            <option value="">-- Chá»n lÃ½ do --</option>
                            {editCloseReasonOptions.map(reason => (
                              <option key={reason} value={reason}>{reason}</option>
                            ))}
                          </select>
                        </div>
                        {editLeadData.lossReason === CUSTOM_CLOSE_REASON && (
                          <div className="flex items-start gap-4">
                            <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold mt-2">Chi tiáº¿t</label>
                            <textarea
                              className="flex-1 min-h-[88px] rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none"
                              placeholder="Nháº­p lÃ½ do cá»¥ thá»ƒ..."
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
                        accent="purple"
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
                    <button onClick={() => setEditModalActiveTab('notes')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${editModalActiveTab === 'notes' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Ghi chú nội bộ</button>
                    <button onClick={() => setEditModalActiveTab('student')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${editModalActiveTab === 'student' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Thông tin học sinh</button>
                    <button onClick={() => setEditModalActiveTab('extra')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${editModalActiveTab === 'extra' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Thông tin thêm (Marketing)</button>
                  </div>
                  <div className="min-h-[200px]">
                    {editModalActiveTab === 'notes' && (
                      <div className="animate-in fade-in duration-200">
                        <textarea className="w-full p-3 border border-slate-200 rounded text-sm focus:border-purple-500 outline-none text-slate-700 h-40" placeholder="Viết ghi chú..." value={editLeadData.notes} onChange={e => setEditLeadData({ ...editLeadData, notes: e.target.value })} />
                      </div>
                    )}
                    {editModalActiveTab === 'student' && (
                      <LeadStudentInfoTab data={editLeadData} onPatch={patchEditLeadData} />
                    )}
                    {editModalActiveTab === 'extra' && (
                      <div className="grid grid-cols-2 gap-x-12 gap-y-4 animate-in fade-in duration-200">
                        <div className="flex items-center gap-4">
                          <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">ChiÃ¡ÂºÂ¿n dÃ¡Â»â€¹ch</label>
                          <input className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm outline-none" value={editLeadData.campaign} onChange={e => setEditLeadData({ ...editLeadData, campaign: e.target.value })} />
                        </div>
                        <div className="flex items-center gap-4">
                          <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">NguÃ¡Â»â€œn</label>
                          <select className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm outline-none bg-white" value={editLeadData.source} onChange={e => setEditLeadData({ ...editLeadData, source: e.target.value })}>
                            <option value="hotline">Hotline</option>
                            <option value="facebook">Facebook</option>
                            <option value="google">Google Ads</option>
                            <option value="referral">GiÃ¡Â»â€ºi thiÃ¡Â»â€¡u</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-4">
                          <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">KÃƒÂªnh</label>
                          <select className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm outline-none bg-white" value={editLeadData.channel} onChange={e => setEditLeadData({ ...editLeadData, channel: e.target.value })}>
                            <option value="">-- ChÃ¡Â»Ân kÃƒÂªnh --</option>
                            {LEAD_CHANNEL_OPTIONS.map(option => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center gap-4">
                          <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">NgÃ†Â°Ã¡Â»Âi GT</label>
                          <input className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm outline-none" value={editLeadData.referredBy} onChange={e => setEditLeadData({ ...editLeadData, referredBy: e.target.value })} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 shrink-0">
                <button onClick={() => setSelectedLead(null)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg">Ã„ÂÃƒÂ³ng</button>
                <button onClick={handleUpdateSelectedLead} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center gap-2 shadow-sm"><Save size={18} /> CÃ¡ÂºÂ­p nhÃ¡ÂºÂ­t</button>
              </div>
            </div>
          </div>
        )}

        {false && showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowCreateModal(false)}></div>
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
              <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <UserPlus size={20} className="text-blue-600" />
                  ThÃƒÆ’Ã‚Âªm CÃƒâ€ Ã‚Â¡ hÃƒÂ¡Ã‚Â»Ã¢â€žÂ¢i / Lead MÃƒÂ¡Ã‚Â»Ã¢â‚¬Âºi
                </h3>
                <div className="flex items-center gap-3">
                  <button className="px-3 py-1.5 bg-white border border-slate-300 rounded text-slate-600 flex items-center gap-2 text-sm font-semibold hover:bg-slate-50">
                    <Phone size={16} /> CuÃƒÂ¡Ã‚Â»Ã¢â€žÂ¢c gÃƒÂ¡Ã‚Â»Ã‚Âi
                  </button>
                  <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
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

              <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 shrink-0">
                <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg">HÃƒÂ¡Ã‚Â»Ã‚Â§y bÃƒÂ¡Ã‚Â»Ã‚Â</button>
                <button onClick={handleCreateSubmit} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center gap-2 shadow-sm"><Save size={18} /> LÃƒâ€ Ã‚Â°u Lead mÃƒÂ¡Ã‚Â»Ã¢â‚¬Âºi</button>
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
                  ThÃƒÂªm CÃ†Â¡ hÃ¡Â»â„¢i / Lead MÃ¡Â»â€ºi
                </h3>
                <div className="flex items-center gap-3">
                  <button className="px-3 py-1.5 bg-white border border-slate-300 rounded text-slate-600 flex items-center gap-2 text-sm font-semibold hover:bg-slate-50">
                    <Phone size={16} /> CuÃ¡Â»â„¢c gÃ¡Â»Âi
                  </button>
                  <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto bg-white p-6 md:p-8 custom-scrollbar">

                {/* TOP HEADER: TITLE / NAME */}
                {/* TOP HEADER: TITLE / NAME */}
                <div className="mb-6">
                  <label className="block text-slate-700 text-sm font-bold mb-2">MÃƒÂ´ tÃ¡ÂºÂ£ / TÃƒÂªn khÃƒÂ¡ch hÃƒÂ ng <span className="text-red-500">*</span></label>
                  <div className="flex gap-3">
                    <select
                      className="w-28 px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none bg-white font-medium text-slate-700"
                      value={newLeadData.title}
                      onChange={e => setNewLeadData({ ...newLeadData, title: e.target.value })}
                    >
                      <option value="">Danh xÃ†Â°ng</option>
                      {LEAD_RELATION_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                      {false && (
                        <>
                      <option value="">Danh xÃ†Â°ng</option>
                      <option value="Mr.">Anh</option>
                      <option value="Ms.">ChÃ¡Â»â€¹</option>
                      <option value="PhÃ¡Â»Â¥ huynh">PhÃ¡Â»Â¥ huynh</option>
                      <option value="HÃ¡Â»Âc sinh">HÃ¡Â»Âc sinh</option>
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
                      <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">QuÃ¡Â»â€˜c gia mÃ¡Â»Â¥c tiÃƒÂªu <span className="text-red-500">*</span></label>
                      <select
                        className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none bg-white text-slate-700"
                        value={newLeadData.targetCountry}
                        onChange={e => setNewLeadData({ ...newLeadData, targetCountry: e.target.value })}
                      >
                        <option value="">-- ChÃ¡Â»Ân quÃ¡Â»â€˜c gia mÃ¡Â»Â¥c tiÃƒÂªu --</option>
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
                      <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">CÃ†Â¡ sÃ¡Â»Å¸</label>
                      <select
                        className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none bg-white text-slate-700"
                        value={newLeadData.company}
                        onChange={e => setNewLeadData({ ...newLeadData, company: e.target.value })}
                      >
                        <option value="">-- ChÃ¡Â»Ân cÃ†Â¡ sÃ¡Â»Å¸ --</option>
                        <option value="Hanoi">HÃƒÂ  NÃ¡Â»â„¢i</option>
                        <option value="HCMC">TP. HCM</option>
                        <option value="DaNang">Ã„ÂÃƒÂ  NÃ¡ÂºÂµng</option>
                        <option value="HaiPhong">HÃ¡ÂºÂ£i PhÃƒÂ²ng</option>
                      </select>
                    </div>

                      </>
                    )}

                    {/* Address Group */}
                    <div className="flex items-start gap-4">
                      <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold pt-2">Ã„ÂÃ¡Â»â€¹a chÃ¡Â»â€°</label>
                      <div className="flex-1 space-y-2">
                        <input
                          className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none text-slate-700 placeholder:text-slate-400"
                          placeholder="SÃ¡Â»â€˜ nhÃƒÂ , Ã„â€˜Ã†Â°Ã¡Â»Âng..."
                          value={newLeadData.street}
                          onChange={e => setNewLeadData({ ...newLeadData, street: e.target.value })}
                        />
                        <div className="grid grid-cols-3 gap-2">
                          <input
                            className="px-2 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none text-slate-700 placeholder:text-slate-400"
                            placeholder="TÃ¡Â»â€°nh/TP"
                            value={newLeadData.province}
                            onChange={e => setNewLeadData({ ...newLeadData, province: e.target.value })}
                          />
                          <input
                            className="px-2 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none text-slate-700 placeholder:text-slate-400"
                            placeholder="QuÃ¡ÂºÂ­n/HuyÃ¡Â»â€¡n"
                            value={newLeadData.city}
                            onChange={e => setNewLeadData({ ...newLeadData, city: e.target.value })}
                          />
                          <input
                            className="px-2 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none text-slate-700 placeholder:text-slate-400"
                            placeholder="P/XÃƒÂ£"
                            value={newLeadData.ward}
                            onChange={e => setNewLeadData({ ...newLeadData, ward: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Product */}
                    <div className="flex items-center gap-4">
                      <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">SÃ¡ÂºÂ£n phÃ¡ÂºÂ©m</label>
                      <select
                        className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none bg-white text-slate-700"
                        value={newLeadData.product}
                        onChange={e => setNewLeadData({ ...newLeadData, product: e.target.value })}
                      >
                        <option value="">-- ChÃ¡Â»Ân sÃ¡ÂºÂ£n phÃ¡ÂºÂ©m --</option>
                        <option value="TiÃ¡ÂºÂ¿ng Ã„ÂÃ¡Â»Â©c">TiÃ¡ÂºÂ¿ng Ã„ÂÃ¡Â»Â©c</option>
                        <option value="Du hÃ¡Â»Âc Ã„ÂÃ¡Â»Â©c">Du hÃ¡Â»Âc Ã„ÂÃ¡Â»Â©c</option>
                        <option value="Du hÃ¡Â»Âc NghÃ¡Â»Â">Du hÃ¡Â»Âc NghÃ¡Â»Â</option>
                        <option value="XKLÃ„Â">XuÃ¡ÂºÂ¥t khÃ¡ÂºÂ©u lao Ã„â€˜Ã¡Â»â„¢ng</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">CÃ†Â¡ sÃ¡Â»Å¸</label>
                      <select
                        className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none bg-white text-slate-700"
                        value={newLeadData.market}
                        onChange={e => setNewLeadData({ ...newLeadData, market: e.target.value })}
                      >
                        <option value="">-- ChÃ¡Â»Ân cÃ†Â¡ sÃ¡Â»Å¸ --</option>
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
                      <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">ThÃ¡Â»â€¹ trÃ†Â°Ã¡Â»Âng</label>
                      <select
                        className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none bg-white text-slate-700"
                        value={newLeadData.market}
                        onChange={e => setNewLeadData({ ...newLeadData, market: e.target.value })}
                      >
                        <option value="">-- ChÃ¡Â»Ân --</option>
                        <option value="Vinh">Vinh</option>
                        <option value="HÃƒÂ  TÃ„Â©nh">HÃƒÂ  TÃ„Â©nh</option>
                        <option value="HÃƒÂ  NÃ¡Â»â„¢i">HÃƒÂ  NÃ¡Â»â„¢i</option>
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
                      <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Ã„ÂiÃ¡Â»â€¡n thoÃ¡ÂºÂ¡i <span className="text-red-500">*</span></label>
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
                      <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">PhÃ¡Â»Â¥ trÃƒÂ¡ch</label>
                      <select
                        className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none bg-white text-slate-700"
                        value={newLeadData.salesperson}
                        onChange={e => setNewLeadData({ ...newLeadData, salesperson: e.target.value })}
                      >
                        <option value="">-- Sale phÃ¡Â»Â¥ trÃƒÂ¡ch --</option>
                        {SALES_REPS.map(rep => (
                          <option key={rep.id} value={rep.id}>{rep.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-4">
                      <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">TrÃ¡ÂºÂ¡ng thÃƒÂ¡i</label>
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
                          <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">LÃ½ do</label>
                          <select
                            className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm outline-none bg-white"
                            value={newLeadData.lossReason}
                            onChange={e => setNewLeadData({ ...newLeadData, lossReason: e.target.value })}
                          >
                            <option value="">-- Chá»n lÃ½ do --</option>
                            {newCloseReasonOptions.map(reason => (
                              <option key={reason} value={reason}>{reason}</option>
                            ))}
                          </select>
                        </div>
                        {newLeadData.lossReason === CUSTOM_CLOSE_REASON && (
                          <div className="flex items-start gap-4">
                            <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold mt-2">Chi tiáº¿t</label>
                            <textarea
                              className="flex-1 min-h-[88px] rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none"
                              placeholder="Nháº­p lÃ½ do cá»¥ thá»ƒ..."
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
                      Ghi chÃƒÂº nÃ¡Â»â„¢i bÃ¡Â»â„¢
                    </button>
                    <button
                      onClick={() => setCreateModalActiveTab('student')}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${createModalActiveTab === 'student' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                      ThÃƒÂ´ng tin hÃ¡Â»Âc sinh
                    </button>
                    <button
                      onClick={() => setCreateModalActiveTab('extra')}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${createModalActiveTab === 'extra' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                      ThÃƒÂ´ng tin thÃƒÂªm (Marketing)
                    </button>
                  </div>

                  {/* Fixed Height Container to prevent layout jump */}
                  <div className="min-h-[200px]">
                    {/* TAB: NOTES */}
                    {createModalActiveTab === 'notes' && (
                      <div className="animate-in fade-in duration-200">
                        <textarea
                          className="w-full p-3 border border-slate-200 rounded text-sm focus:border-purple-500 outline-none text-slate-700 h-40"
                          placeholder="ViÃ¡ÂºÂ¿t ghi chÃƒÂº..."
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
                          <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">ChiÃ¡ÂºÂ¿n dÃ¡Â»â€¹ch</label>
                          <input
                            className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none text-slate-700"
                            value={newLeadData.campaign}
                            onChange={e => setNewLeadData({ ...newLeadData, campaign: e.target.value })}
                          />
                        </div>
                        <div className="flex items-center gap-4">
                          <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">NguÃ¡Â»â€œn</label>
                          <select
                            className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none bg-white text-slate-700"
                            value={newLeadData.source}
                            onChange={e => setNewLeadData({ ...newLeadData, source: e.target.value })}
                          >
                            <option value="hotline">Hotline</option>
                            <option value="facebook">Facebook</option>
                            <option value="google">Google Ads</option>
                            <option value="referral">GiÃ¡Â»â€ºi thiÃ¡Â»â€¡u</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-4">
                          <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">KÃƒÂªnh</label>
                          <select
                            className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none bg-white text-slate-700"
                            value={newLeadData.channel}
                            onChange={e => setNewLeadData({ ...newLeadData, channel: e.target.value })}
                          >
                            <option value="">-- ChÃ¡Â»Ân kÃƒÂªnh --</option>
                            {LEAD_CHANNEL_OPTIONS.map(option => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center gap-4">
                          <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">NgÃ†Â°Ã¡Â»Âi GT</label>
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
                <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg">HÃ¡Â»Â§y bÃ¡Â»Â</button>
                <button onClick={handleCreateSubmit} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center gap-2 shadow-sm"><Save size={18} /> LÃ†Â°u Lead mÃ¡Â»â€ºi</button>
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
                  Phân bổ Lead
                </h3>
                <button onClick={closeAssignModal} className="rounded-sm p-1 text-slate-400 hover:bg-white hover:text-slate-600"><X size={18} /></button>
              </div>

              <div className="space-y-4 p-4">
                <div className="flex items-start gap-2 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-[12px] text-blue-800">
                  <Users size={16} className="mt-0.5 shrink-0" />
                  <p>Bạn đang phân bổ <span className="font-bold">{selectedLeadIds.length}</span> lead cho nhân viên kinh doanh.</p>
                </div>

                <div className="rounded-md border border-[#e8edf3] bg-[#fafbfc] p-3">
                  <div className="mb-3 flex flex-col gap-3 border-b border-slate-200 pb-3 sm:flex-row sm:items-center">
                    <label className="relative block flex-1">
                      <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={assignRepSearch}
                        onChange={(e) => setAssignRepSearch(e.target.value)}
                        placeholder="Tìm tên sale..."
                        className="w-full rounded-sm border border-slate-300 bg-white py-2 pl-9 pr-3 text-[13px] text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </label>
                    <select
                      value={assignCampusFilter}
                      onChange={(e) => setAssignCampusFilter(e.target.value)}
                      className="rounded-sm border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-52"
                    >
                      <option value="all">Tất cả cơ sở</option>
                      {assignmentCampusOptions.map((campus) => (
                        <option key={campus} value={campus}>
                          {campus}
                        </option>
                      ))}
                    </select>
                    {hasAssignmentRepFilters && (
                      <button
                        type="button"
                        onClick={resetAssignFilters}
                        className={compactToolbarButtonClass}
                      >
                        Xóa lọc
                      </button>
                    )}
                  </div>

                  <div className="mb-3 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                    <span>
                      Hiển thị <span className="font-semibold text-slate-700">{filteredAssignmentSalesReps.length}</span> / {assignmentSalesReps.length} sale
                    </span>
                    {assignCampusFilter !== 'all' && <span>Cơ sở: {assignCampusFilter}</span>}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[13px] font-bold text-slate-800">Phân bổ theo số lượng</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">Nhập số lead cho từng sale. Tổng phải bằng số lead đã chọn.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={fillAssignmentRatiosEvenly}
                        className={`${compactToolbarButtonClass} ${filteredAssignmentSalesReps.length === 0 ? 'cursor-not-allowed opacity-50' : ''}`}
                        disabled={filteredAssignmentSalesReps.length === 0}
                      >
                        Chia đều số lượng
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
                      <div className="text-[11px] text-slate-500">Tổng phân bổ</div>
                      <div className={`text-[15px] font-bold ${assignmentRatioTotal === selectedLeadIds.length ? 'text-emerald-600' : 'text-amber-600'}`}>{assignmentRatioTotal}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500">Tổng lead</div>
                      <div className="text-[15px] font-bold text-slate-900">{selectedLeadIds.length}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500">Số sale tham gia</div>
                      <div className="text-[15px] font-bold text-slate-900">{Object.values(assignmentRatioValues).filter((value) => value > 0).length}</div>
                    </div>
                  </div>
                </div>

                <div className="animate-in slide-in-from-top-2">
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.08em] text-[#7b8794]">Số lượng theo nhân viên</label>
                  {filteredAssignmentSalesReps.length === 0 ? (
                    <div className="flex h-24 items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50 text-[12px] text-slate-500">
                      Không tìm thấy sale phù hợp với bộ lọc hiện tại.
                    </div>
                  ) : (
                  <div className="max-h-[340px] overflow-y-auto custom-scrollbar">
                    {filteredAssignmentSalesReps.map((rep) => {
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
                              <p className="text-[11px] text-slate-500">{rep.branch ? `${rep.team} • ${rep.branch}` : rep.team}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={0}
                                max={selectedLeadIds.length}
                                value={ratioValue}
                                onChange={(e) => updateAssignmentRatio(rep.id, e.target.value)}
                                placeholder="0"
                                className="w-16 rounded-sm border border-slate-300 bg-white px-2 py-1 text-[13px] font-semibold text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                              />
                              <span className="text-[13px] font-bold text-slate-500">lead</span>
                            </div>
                          </div>

                          <div className="mt-1 flex items-center justify-between gap-3 pl-10">
                            <p className="text-[11px] text-slate-600">
                              {ratio > 0 ? `Dự kiến nhận ${leadCount} lead` : 'Chưa tham gia phân bổ'}
                            </p>
                            <button
                              type="button"
                              onClick={() => setSingleRepAssignment(rep.id)}
                              className="rounded-sm border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-100"
                            >
                              Giao hết cho sale này
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-[#e8edf3] bg-[#f6f7f8] px-4 py-3">
                <button onClick={closeAssignModal} className="rounded-sm px-3 py-1.5 text-[12px] font-bold text-slate-600 hover:bg-slate-200">Hủy</button>
                <button
                  onClick={handleAssignSubmit}
                  className={`rounded-sm px-4 py-1.5 text-[12px] font-bold text-white transition-colors ${assignmentRatioTotal === selectedLeadIds.length && selectedLeadIds.length > 0 ? 'bg-blue-600 hover:bg-blue-700' : 'cursor-not-allowed bg-slate-400'}`}
                  disabled={assignmentRatioTotal !== selectedLeadIds.length || selectedLeadIds.length === 0}
                >
                  Xác nhận Phân bổ
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
                  <h2 className="text-xl font-bold text-slate-900">NhÃ¡ÂºÂ­p dÃ¡Â»Â¯ liÃ¡Â»â€¡u Lead tÃ¡Â»Â« Excel</h2>
                  <p className="text-slate-500 text-sm mt-1">HÃ¡Â»â€” trÃ¡Â»Â£ Ã„â€˜Ã¡Â»â€¹nh dÃ¡ÂºÂ¡ng .xlsx, .csv</p>
                </div>
                <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-200 rounded-full"><X size={24} /></button>
              </div>

              {/* Stepper */}
              <div className="bg-white border-b border-slate-200 py-4 px-12">
                <div className="flex items-center justify-between relative">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 -z-10"></div>
                  <div className={`flex flex-col items-center gap-2 z-10 ${importStep >= 1 ? 'text-blue-600' : 'text-slate-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${importStep >= 1 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-300'}`}>1</div>
                    <span className="text-xs font-bold">Tải lên</span>
                  </div>
                  <div className={`flex flex-col items-center gap-2 z-10 ${importStep >= 2 ? 'text-blue-600' : 'text-slate-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${importStep >= 2 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-300'}`}>2</div>
                    <span className="text-xs font-bold">Ghép vào kho lead</span>
                  </div>
                  <div className={`flex flex-col items-center gap-2 z-10 ${importStep >= 3 ? 'text-blue-600' : 'text-slate-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${importStep >= 3 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-300'}`}>3</div>
                    <span className="text-xs font-bold">Hoàn tất</span>
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
                      <label htmlFor="lead-import-file-input" className="absolute inset-0 z-10 cursor-pointer" aria-label="Chọn tệp import lead" />
                      <div className="pointer-events-none w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <UploadCloud size={32} />
                      </div>
                      <p className="text-lg font-bold text-slate-700">Kéo thả hoặc chọn tệp tin</p>
                      <p className="text-sm text-slate-500 mt-2">Hỗ trợ .CSV, .XLSX (tối đa 5MB)</p>
                    </div>

                    <div className="flex gap-4">
                      <button onClick={handleDownloadTemplate} className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm hover:underline">
                        <Download size={16} /> Tải tệp mẫu chuẩn (Template_Leads.xlsx)
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
                        <span>Kết quả kiểm tra trước khi ghép</span>
                        <div className="flex gap-2">
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-bold">Hợp lệ: {validImportRows.length}</span>
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-bold">Lỗi: {importErrors.length}</span>
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto p-0 custom-scrollbar relative">
                        {importErrors.length === 0 && validImportRows.length > 0 && (
                          <div className="flex flex-col items-center justify-center h-full text-slate-500 p-8 text-center">
                            <CheckCircle size={48} className="text-green-500 mb-4" />
                            <p className="font-bold text-lg text-slate-800">Tất cả dữ liệu hợp lệ</p>
                            <p className="text-sm">File đã sẵn sàng để ghép vào kho lead chung.</p>
                          </div>
                        )}

                        {importErrors.length > 0 && (
                          <table className="w-full text-sm">
                            <thead className="bg-red-50 text-red-800 font-semibold border-b border-red-100 sticky top-0">
                              <tr>
                                 <th className="p-3 text-left w-20">Dòng</th>
                                 <th className="p-3 text-left w-40">Tên Lead</th>
                                 <th className="p-3 text-left">Chi tiết lỗi</th>
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
                          <div className="p-8 text-center text-slate-500 italic">Không tìm thấy dữ liệu hoặc file rỗng.</div>
                        )}
                      </div>

                      {importErrors.length > 0 && (
                        <div className="p-3 bg-red-50 border-t border-red-100 text-xs text-red-700 flex items-center gap-2">
                          <AlertTriangle size={14} />
                          <span>Hệ thống sẽ chỉ ghép các dòng hợp lệ ({validImportRows.length} dòng) vào kho lead chung. Các dòng lỗi sẽ bị bỏ qua.</span>
                        </div>
                      )}
                    </div>

                    {/* RIGHT: CONFIG */}
                    <div className="col-span-5 flex flex-col gap-6">
                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 h-full">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Users size={18} className="text-blue-600" /> Trạng thái sau ghép</h3>

                        <div className="space-y-4">
                          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                            <p className="text-sm font-bold text-slate-800 mb-1">Phân bổ sale</p>
                            <div className="flex items-center gap-2">
                              <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border bg-slate-100 text-slate-600 border-slate-200">
                                Thủ công
                              </span>
                              <span className="text-xs text-slate-500">
                                Bước import không gán sale tự động.
                              </span>
                            </div>
                          </div>

                          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                            Lead hợp lệ sẽ được ghép vào kho lead chung và giữ trạng thái chưa phân bổ.
                            Admin/Leader sẽ phân công sau ở màn hình phân bổ thủ công.
                          </div>

                          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                            Sau bước này, bạn có thể tiếp tục gắn tên đợt nhập và tag để dễ lọc lại danh sách vừa ghép.
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
                      <h3 className="text-2xl font-bold text-slate-900">Sẵn sàng ghép vào kho lead chung</h3>
                      <p className="text-slate-500 mt-2">Kiểm tra lần cuối tên đợt nhập và tag trước khi đưa dữ liệu hợp lệ vào kho lead.</p>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 space-y-6">
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                        Sẽ ghép <span className="font-bold">{validImportRows.length}</span> lead hợp lệ vào kho lead chung.
                        Tất cả lead sau import vẫn ở trạng thái <span className="font-bold">chưa phân bổ</span>.
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Tên đợt nhập kho</label>
                        <input
                          className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 font-medium focus:border-blue-500 outline-none bg-slate-50"
                          value={importBatchName}
                          onChange={(e) => setImportBatchName(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Tag gắn cho đợt ghép</label>
                        <div className="p-3 border border-slate-300 rounded-lg bg-white flex flex-wrap gap-2 focus-within:border-blue-500 transition-colors">
                          {importTags.map(tag => (
                            <span key={tag} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                              {tag} <button onClick={() => setImportTags(importTags.filter(t => t !== tag))}><X size={12} /></button>
                            </span>
                          ))}
                            <input
                              className="flex-1 min-w-[120px] outline-none text-sm p-1"
                              placeholder="Nhập tag và ấn Enter..."
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
                    Quay lại
                  </button>
                )}

                {importStep < 3 ? (
                  <button
                    onClick={() => {
                      if (importStep === 1 && !importFile) return alert("Vui lòng chọn file!");
                      setImportStep(prev => (prev + 1) as 1 | 2 | 3);
                    }}
                    className={`px-8 py-2.5 bg-blue-600 text-white rounded-lg font-bold shadow-lg shadow-blue-200 transition-all flex items-center gap-2 ${(!importFile && importStep === 1) ? 'opacity-50 cursor-not-allowed' : (validImportRows.length === 0 && importStep === 2) ? 'bg-slate-400 cursor-not-allowed text-slate-200 shadow-none' : 'hover:bg-blue-700 hover:scale-105'}`}
                    disabled={validImportRows.length === 0 && importStep === 2}
                  >
                    {importStep === 1 ? 'Tiếp tục kiểm tra' : 'Tiếp tục gắn nhãn'} <ArrowRight size={18} />
                  </button>
                ) : (
                  <button
                    onClick={handleImportSubmit}
                    className="px-8 py-2.5 bg-green-600 text-white rounded-lg font-bold shadow-lg shadow-green-200 transition-all flex items-center gap-2 hover:bg-green-700 hover:scale-105"
                  >
                    <CheckCircle size={18} /> Ghép vào kho lead
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
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-6xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[85vh]">
              <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-amber-50 shrink-0">
                <div>
                  <h3 className="text-lg font-bold text-amber-900 flex items-center gap-2">
                    <AlertTriangle size={20} className="text-amber-600" />
                    Danh sách Lead trùng Số điện thoại
                  </h3>
                  <p className="mt-1 text-sm text-amber-800/80">
                    Các lead trùng được gom theo từng SĐT và hiển thị liền nhau. Bấm vào dòng để mở nhanh lead tương ứng.
                  </p>
                </div>
                <button onClick={() => setShowDuplicateModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {duplicateGroups.length === 0 ? (
                  <div className="text-center py-10">
                    <CheckCircle size={48} className="mx-auto text-green-500 mb-4 opacity-20" />
                    <p className="text-slate-500">Không tìm thấy lead nào đang bị trùng SĐT.</p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <div className="overflow-x-auto">
                      <table className="min-w-full border-collapse">
                        <thead className="sticky top-0 z-10 bg-slate-50">
                          <tr>
                            <th className={`${compactHeaderCellClass} w-16 text-center`}>STT</th>
                            <th className={`${compactHeaderCellClass} w-32`}>Ngày tạo</th>
                            <th className={compactHeaderCellClass}>Tên</th>
                            <th className={compactHeaderCellClass}>SĐT</th>
                            <th className={compactHeaderCellClass}>Ng phụ trách</th>
                            <th className={compactHeaderCellClass}>Chi nhánh</th>
                            <th className={`${compactHeaderCellClass} text-center`}>Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody>
                          {duplicateGroupSections.map((group) => (
                            <React.Fragment key={group.phone}>
                              <tr className="bg-amber-50/70">
                                <td colSpan={7} className="border-b border-amber-100 px-3 py-2">
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="text-sm font-semibold text-amber-900">
                                      Nhóm trùng #{group.groupIndex + 1} • SĐT {group.phone}
                                    </div>
                                    <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                                      {group.totalLeads} lead trùng
                                    </div>
                                  </div>
                                </td>
                              </tr>
                              {group.rows.map(({ lead, stt }) => {
                                const allocationStatus = getAllocationStatusMeta(lead);
                                return (
                                  <tr
                                    key={lead.id}
                                    onClick={() => { setSelectedLead(lead); setShowDuplicateModal(false); }}
                                    className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-blue-50/60"
                                    title={`Mở lead: ${lead.name}`}
                                  >
                                    <td className={`${compactBodyCellClass} text-center font-semibold text-slate-500`}>{stt}</td>
                                    <td className={compactBodyCellClass}>{formatDuplicateLeadCreatedAt(lead.createdAt)}</td>
                                    <td className={`${compactBodyCellClass} max-w-[260px]`}>
                                      <div className="truncate font-semibold text-slate-900" title={lead.name}>{lead.name || '-'}</div>
                                    </td>
                                    <td className={`${compactBodyCellClass} font-semibold text-slate-700`}>{lead.phone || '-'}</td>
                                    <td className={`${compactBodyCellClass} max-w-[200px]`}>
                                      <div className="truncate" title={getDuplicateLeadOwnerLabel(lead)}>
                                        {getDuplicateLeadOwnerLabel(lead)}
                                      </div>
                                    </td>
                                    <td className={`${compactBodyCellClass} max-w-[180px]`}>
                                      <div className="truncate" title={getDuplicateLeadCampusLabel(lead)}>
                                        {getDuplicateLeadCampusLabel(lead)}
                                      </div>
                                    </td>
                                    <td className="px-2 py-1 text-center align-middle">
                                      <span className={`inline-flex max-w-[110px] justify-center rounded-sm border px-1.5 py-0 text-[10px] font-semibold ${allocationStatus.className}`}>
                                        {allocationStatus.label}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
              <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 text-xs text-slate-500">
                Đang hiển thị {duplicateGroupSections.length} nhóm trùng và{' '}
                {duplicateGroupSections.reduce((total, group) => total + group.totalLeads, 0)} lead cần rà soát.
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
              <h3 className="text-lg font-bold text-red-600 flex items-center gap-2"><Ban size={20} /> XÃƒÂ¡c nhÃ¡ÂºÂ­n thÃ¡ÂºÂ¥t bÃ¡ÂºÂ¡i</h3>
              <button
                onClick={() => { setShowLossModal(false); setLossModalLeadIds([]); setLossStatus(STANDARD_LEAD_STATUS.LOST); setLossReason(''); setCustomLossReason(''); }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <p className="text-sm text-slate-600 mb-4">
                BÃ¡ÂºÂ¡n Ã„â€˜ang Ã„â€˜ÃƒÂ¡nh dÃ¡ÂºÂ¥u <strong>{lossModalLeadIds.length}</strong> lead lÃƒÂ  thÃ¡ÂºÂ¥t bÃ¡ÂºÂ¡i.
                Vui lÃƒÂ²ng chÃ¡Â»Ân lÃƒÂ½ do Ã„â€˜Ã¡Â»Æ’ hÃ¡Â»â€¡ thÃ¡Â»â€˜ng ghi nhÃ¡ÂºÂ­n:
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
                <option value="">-- ChÃ¡Â»Ân lÃƒÂ½ do --</option>
                {bulkCloseReasonOptions.map(reason => (
                  <option key={reason} value={reason}>{reason}</option>
                ))}
              </select>

              {lossReason === 'LÃƒÂ½ do khÃƒÂ¡c' && (
                <textarea
                  className="w-full p-3 border border-slate-300 rounded-lg text-sm mb-4 h-24 outline-none focus:ring-2 focus:ring-blue-500 animate-in slide-in-from-top-2"
                  placeholder="Vui lÃƒÂ²ng nhÃ¡ÂºÂ­p lÃƒÂ½ do cÃ¡Â»Â¥ thÃ¡Â»Æ’..."
                  value={customLossReason}
                  onChange={e => setCustomLossReason(e.target.value)}
                ></textarea>
              )}

              {lossReason === CUSTOM_CLOSE_REASON && (
                <textarea
                  className="w-full p-3 border border-slate-300 rounded-lg text-sm mb-4 h-24 outline-none focus:ring-2 focus:ring-blue-500 animate-in slide-in-from-top-2"
                  placeholder="Nháº­p lÃ½ do cá»¥ thá»ƒ..."
                  value={customLossReason}
                  onChange={e => setCustomLossReason(e.target.value)}
                ></textarea>
              )}

              <div className="hidden items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg border border-red-100 text-xs italic">
                <AlertTriangle size={14} className="shrink-0" />
                <span>HÃƒÂ nh Ã„â€˜Ã¡Â»â„¢ng nÃƒÂ y sÃ¡ÂºÂ½ cÃ¡ÂºÂ­p nhÃ¡ÂºÂ­t trÃ¡ÂºÂ¡ng thÃƒÂ¡i cÃ¡Â»Â§a lead sang <strong>LOST</strong>.</span>
              </div>
            </div>

            <div className="px-6 pt-0 pb-4">
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg border border-red-100 text-xs italic">
                <AlertTriangle size={14} className="shrink-0" />
                <span>Lead sáº½ Ä‘Æ°á»£c chuyá»ƒn sang <strong>{getLeadStatusLabel(lossStatus).toUpperCase()}</strong> vÃ  báº¯t buá»™c lÆ°u lÃ½ do.</span>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 text-sm">
              <button
                onClick={() => { setShowLossModal(false); setLossModalLeadIds([]); setLossStatus(STANDARD_LEAD_STATUS.LOST); setLossReason(''); setCustomLossReason(''); }}
                className="px-5 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                HÃ¡Â»Â§y
              </button>
              <button
                onClick={handleConfirmLoss}
                className="px-5 py-2 font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-lg shadow-red-200 transition-all font-bold"
              >
                XÃƒÂ¡c nhÃ¡ÂºÂ­n LOST
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
          onConvert={handleConvertLead}
        />
      )}

      <ConvertLeadModal
        isOpen={!!leadToConvert}
        lead={leadToConvert}
        onClose={() => setLeadToConvert(null)}
        onConfirm={handleConfirmLeadConvert}
      />
    </>
  );
};

export default Leads;








