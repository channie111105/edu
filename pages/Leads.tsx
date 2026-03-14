
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ILead, LeadStatus, UserRole, IDeal, DealStage } from '../types';
import SLABadge from '../components/SLABadge';
import UnifiedLeadDrawer from '../components/UnifiedLeadDrawer';
import LeadPivotTable from '../components/LeadPivotTable'; // Import Pivot Component
import LeadStudentInfoTab from '../components/LeadStudentInfoTab';
import SmartSearchBar, { SearchFilter } from '../components/SmartSearchBar';
import { useAuth } from '../contexts/AuthContext';
import { getLeads, saveLead, saveLeads, addDeal, addContact, deleteLead, convertLeadToContact, getTags, saveTags, getLostReasons, getLeadDistributionConfig, allocateLeadOwnersRoundRobin, allocateLeadOwnersWeighted } from '../utils/storage';
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
  CheckCircle2,
  Search,
  Users,
  UserPlus,
  Calculator,
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

const Leads: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // State: Load from LocalStorage
  const [activeTab, setActiveTab] = useState<'all' | 'new' | 'sla_risk'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'pivot'>('list'); // View Mode State
  const [leads, setLeads] = useState<ILead[]>([]);
  const [searchFilters, setSearchFilters] = useState<SearchFilter[]>([]);

  // Drawer State
  const [selectedLead, setSelectedLead] = useState<ILead | null>(null);

  // Selection & Assignment State
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedRep, setSelectedRep] = useState('');

  // Tab state for Create Modal (Odoo Style)
  const [createModalActiveTab, setCreateModalActiveTab] = useState<LeadCreateModalTab>('notes');

  const [systemDistributionMode, setSystemDistributionMode] = useState<'auto' | 'manual'>(() => getLeadDistributionConfig().mode);

  // Mock Sales Reps
  const SALES_REPS = [
    { id: 'u2', name: 'Sarah Miller', team: 'Team Đức', avatar: 'SM', color: 'bg-purple-100 text-purple-700' },
    { id: 'u3', name: 'David Clark', team: 'Team Trung', avatar: 'DC', color: 'bg-blue-100 text-blue-700' },
    { id: 'u4', name: 'Alex Rivera', team: 'Team Du học', avatar: 'AR', color: 'bg-green-100 text-green-700' },
  ];

  const normalizeStatusToken = (value?: string) =>
    (value || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '');

  const STATUS_NORMALIZATION_MAP: Record<string, string> = {
    new: LeadStatus.NEW,
    moi: LeadStatus.NEW,
    assigned: LeadStatus.ASSIGNED,
    daphanbo: LeadStatus.ASSIGNED,
    contacted: LeadStatus.CONTACTED,
    danglienhe: LeadStatus.CONTACTED,
    qualified: LeadStatus.QUALIFIED,
    datchuan: LeadStatus.QUALIFIED,
    converted: LeadStatus.CONVERTED,
    dachuyendoi: LeadStatus.CONVERTED,
    disqualified: LeadStatus.DISQUALIFIED,
    khongdat: LeadStatus.DISQUALIFIED,
    won: DealStage.WON,
    chotthanhcongwon: DealStage.WON,
    lost: DealStage.LOST,
    thatbailost: DealStage.LOST
  };

  const normalizeLeadStatus = (status?: string) => {
    if (!status) return LeadStatus.NEW;
    const token = normalizeStatusToken(status);
    return STATUS_NORMALIZATION_MAP[token] || status;
  };

  const assignOwnersBySystemMode = (incomingLeads: ILead[]) => {
    const distributionConfig = getLeadDistributionConfig();
    if (distributionConfig.mode !== 'auto') return incomingLeads;
    const repIds = SALES_REPS.map(rep => rep.id);
    const ownerIds = distributionConfig.method === 'weighted'
      ? allocateLeadOwnersWeighted(incomingLeads.length, repIds, distributionConfig.weightedRatios)
      : allocateLeadOwnersRoundRobin(incomingLeads.length, repIds);
    return incomingLeads.map((lead, index) => ({
      ...lead,
      ownerId: ownerIds[index] || lead.ownerId || '',
      status: LeadStatus.NEW
    }));
  };

  // Loss Modal State
  const [showLossModal, setShowLossModal] = useState(false);
  const [lossModalLeadIds, setLossModalLeadIds] = useState<string[]>([]);
  const [lossReason, setLossReason] = useState('');
  const [customLossReason, setCustomLossReason] = useState('');
  const lostReasonsList = useMemo(() => getLostReasons(), []);



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
    const syncDistributionMode = () => {
      setSystemDistributionMode(getLeadDistributionConfig().mode);
    };
    syncDistributionMode();
    window.addEventListener('educrm:lead-distribution-config-changed', syncDistributionMode as EventListener);
    return () => window.removeEventListener('educrm:lead-distribution-config-changed', syncDistributionMode as EventListener);
  }, []);

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLeadData, setNewLeadData] = useState<LeadCreateFormData>(() => createLeadInitialState()); /*
    name: '', phone: '', email: '', source: 'hotline', program: 'Tiếng Đức', notes: '',
    title: '', company: '', province: '', city: '', ward: '', street: '', salesperson: '', campaign: '', tags: [] as string[], referredBy: '',
    product: '', market: '', channel: '', status: LeadStatus.NEW
  }); */
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [isAddingEditTag, setIsAddingEditTag] = useState(false);
  const patchNewLeadData = (patch: Partial<LeadCreateFormData>) => {
    setNewLeadData((prev) => ({ ...prev, ...patch }));
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
  const [editLeadData, setEditLeadData] = useState({
    name: '', phone: '', email: '', source: '', program: '', notes: '',
    title: '', company: '', province: '', city: '', ward: '', street: '', salesperson: '', campaign: '', tags: [] as string[], referredBy: '',
    product: '', market: '', medium: '', status: ''
  });
  const [editModalActiveTab, setEditModalActiveTab] = useState<'notes' | 'extra'>('notes');

  // Sync selected lead to edit form
  useEffect(() => {
    if (selectedLead) {
      setEditLeadData({
        name: selectedLead.name,
        phone: selectedLead.phone,
        email: selectedLead.email || '',
        source: selectedLead.source,
        program: selectedLead.program,
        notes: selectedLead.notes || '',
        title: (selectedLead as any).title || '',
        company: selectedLead.company,
        province: (selectedLead as any).province || '',
        city: (selectedLead as any).city || '',
        ward: (selectedLead as any).ward || '',
        street: (selectedLead as any).street || '',
        salesperson: selectedLead.ownerId || '',
        campaign: (selectedLead as any).campaign || '',
        tags: Array.isArray(selectedLead.marketingData?.tags) ? selectedLead.marketingData.tags : (typeof selectedLead.marketingData?.tags === 'string' ? (selectedLead.marketingData.tags as string).split(',').map(t => t.trim()).filter(Boolean) : []),
        referredBy: (selectedLead as any).referredBy || '',
        product: '',
        market: '',
        medium: '',
        status: normalizeLeadStatus(selectedLead.status as string)
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
    'opportunity', 'contact', 'email', 'phone', 'market', 'product', 'nextActivity', 'deadline', 'value', 'status', 'salesperson', 'company', 'source', 'campaign', 'tags'
  ]);

  const ALL_COLUMNS = [
    { id: 'opportunity', label: 'Cơ hội' },
    { id: 'company', label: 'Cơ sở / Công ty' },
    { id: 'contact', label: 'Tên liên hệ' },
    { id: 'title', label: 'Danh xưng' },
    { id: 'email', label: 'Email' },
    { id: 'phone', label: 'SĐT' },
    { id: 'address', label: 'Địa chỉ' },
    { id: 'salesperson', label: 'Nhân viên Sale' },
    { id: 'campaign', label: 'Chiến dịch' },
    { id: 'source', label: 'Nguồn kênh' },
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
    openOps: false, // "Mở cơ hội"
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
    const updatedLead: ILead = {
      ...selectedLead,
      name: editLeadData.name,
      phone: editLeadData.phone,
      email: editLeadData.email,
      source: editLeadData.source,
      program: editLeadData.program as any,
      notes: editLeadData.notes,
      company: editLeadData.company,
      ownerId: editLeadData.salesperson,
      status: normalizeLeadStatus(editLeadData.status as string) as any,
      marketingData: {
        ...selectedLead.marketingData,
        campaign: editLeadData.campaign,
        tags: editLeadData.tags,
        market: selectedLead.marketingData?.market || '',
        medium: selectedLead.marketingData?.medium || ''
      }
    };
    // Extra fields types casting
    (updatedLead as any).title = editLeadData.title;
    (updatedLead as any).street = editLeadData.street;
    (updatedLead as any).province = editLeadData.province;
    (updatedLead as any).city = editLeadData.city;
    (updatedLead as any).ward = editLeadData.ward;
    (updatedLead as any).referredBy = editLeadData.referredBy;

    const updatedLeads = leads.map(l => l.id === selectedLead.id ? updatedLead : l);
    setLeads(updatedLeads);
    saveLeads(updatedLeads);
    setSelectedLead(null);
  };

  // CRM FIELDS DEFINITION & TEMPLATE HEADERS
  // Removed Data Evaluation State from here as it moved to Campaign Details

  const DATA_EVALUATIONS = [
    {
      id: 'd1', name: 'Data_THPT_NguyenDu_K12', source: 'Hợp tác Trường THPT', code: '#D-2410-01', date: '24/10/2023', importer: 'Admin',
      total: 500, match: '96.0%', valid: 480, interested: '30.0%', interestedCount: 150, enrolled: '30.0%', enrolledCount: 45,
      eval: 'good', evalText: 'ƯU TIÊN NHẬP', note: 'Tỷ lệ nhập học cao'
    },
    {
      id: 'd2', name: 'Mua_Data_Ngoai_T10', source: 'Mua ngoài (Agency A)', code: '#D-2010-02', date: '20/10/2023', importer: 'Marketing Lead',
      total: 1000, match: '35.0%', valid: 350, interested: '2.0%', interestedCount: 20, enrolled: '10.0%', enrolledCount: 2,
      eval: 'bad', evalText: 'DỪNG HỢP TÁC', note: 'SĐT ảo quá nhiều'
    },
    {
      id: 'd3', name: 'Hoi_Thao_Du_Hoc_Duc_HaNoi', source: 'Sự kiện Offline', code: '#D-1510-01', date: '15/10/2023', importer: 'Sales Leader',
      total: 200, match: '99.0%', valid: 198, interested: '60.0%', interestedCount: 120, enrolled: '50.0%', enrolledCount: 60,
      eval: 'good', evalText: 'ƯU TIÊN NHẬP', note: 'Tỷ lệ nhập học cao'
    },
    {
      id: 'd4', name: 'Import_Excel_Cu_2022', source: 'Hệ thống cũ', code: '#D-0110-03', date: '01/10/2023', importer: 'Admin',
      total: 1500, match: '93.3%', valid: 1400, interested: '3.3%', interestedCount: 50, enrolled: '10.0%', enrolledCount: 5,
      eval: 'warning', evalText: 'CÂN NHẮC LẠI', note: 'Ít nhu cầu học'
    }
  ];

  const CRM_FIELDS = [
    { id: 'name', label: 'Tên Lead', excelHeader: 'Họ và tên', required: true },
    { id: 'phone', label: 'SĐT', excelHeader: 'Số điện thoại', required: true }, // Format: 10 digits, start with 0
    { id: 'email', label: 'Email', excelHeader: 'Email', required: false },      // Format: contains @
    { id: 'company', label: 'Cơ sở', excelHeader: 'Cơ sở', required: true },
    { id: 'source', label: 'Nguồn', excelHeader: 'Nguồn', required: false },
    { id: 'campaign', label: 'Chiến dịch', excelHeader: 'Chiến dịch', required: false },
    { id: 'notes', label: 'Ghi chú', excelHeader: 'Ghi chú', required: false },
    { id: 'program', label: 'Chương trình', excelHeader: 'Chương trình', required: false },
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

  // Handle File Select
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
            rowErrors.push(`Thiếu ${field.label}`);
          }
        }

        // 2. Specific Format Checks (if value exists)
        if (val) {
          const strVal = String(val).trim();

          // Email check
          if (field.id === 'email') {
            if (!strVal.includes('@')) {
              rowErrors.push(`Email không hợp lệ (thiếu @)`);
            }
          }

          // Phone check
          if (field.id === 'phone') {
            const cleanPhone = strVal.replace(/[\s\.\-]/g, '');
            // Starts with 0, 10 digits
            if (!/^0\d{9}$/.test(cleanPhone)) {
              rowErrors.push(`SĐT sai định dạng (phải 10 số, bắt đầu bằng 0)`);
            }
          }
        }
      });

      if (rowErrors.length > 0) {
        errorList.push({
          row: rowNumber,
          name: row['Họ và tên'] || 'N/A',
          errors: rowErrors
        });
      } else {
        // Normalize Data for CRM Import
        validRows.push({
          name: row['Họ và tên'],
          phone: String(row['Số điện thoại']).replace(/[\s\.\-]/g, ''),
          email: row['Email'] || '',
          company: row['Cơ sở'],
          source: row['Nguồn'] || 'Import',
          campaign: row['Chiến dịch'] || '',
          notes: row['Ghi chú'] || '',
          program: row['Chương trình'] || 'Tiếng Đức'
        });
      }
    });

    setValidImportRows(validRows);
    setImportErrors(errorList);
  };

  // Download Template
  const handleDownloadTemplate = () => {
    const ws = utils.json_to_sheet([
      { 'Họ và tên': 'Nguyễn Văn A', 'Số điện thoại': '0901234567', 'Email': 'a@example.com', 'Cơ sở': 'Hanoi', 'Nguồn': 'Facebook', 'Chiến dịch': 'Summer 2024', 'Ghi chú': 'Quan tâm du học' }
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
      alert("Lỗi tải xuống template");
    }
  };

  // Final Import
  const handleImportSubmit = () => {
    if (validImportRows.length === 0) {
      alert("Không có dòng dữ liệu nào hợp lệ để nhập!");
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
        source: row.source,
        program: row.program,
        status: LeadStatus.NEW,
        ownerId: '', // Set below
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

    assignedLeads = assignOwnersBySystemMode(assignedLeads);

    saveLeads([...leads, ...assignedLeads]);
    setLeads([...leads, ...assignedLeads]); // Optimistic update

    setShowImportModal(false);
    alert(`Đã nhập thành công ${assignedLeads.length} lead!`);

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
        return normalizedStatus !== DealStage.WON && normalizedStatus !== DealStage.LOST;
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
          const value = String(filter.value).toLowerCase();
          if (filter.field === 'search') {
            const searchableText = [
              lead.name,
              lead.phone,
              lead.email,
              lead.source,
              lead.program || '',
              normalizeLeadStatus(lead.status as string),
              lead.ownerId || '',
              (lead as any).city || '',
              (lead as any).company || ''
            ].join(' ').toLowerCase();
            return searchableText.includes(value);
          }
          const leadValue = (lead as any)[filter.field];
          return String(leadValue || '').toLowerCase() === value;
        });
      });
    }

    // 4. Tab Specific Status Filtering
    switch (activeTab) {
      case 'new':
        return result.filter(l => normalizeLeadStatus(l.status as string) === LeadStatus.NEW || !l.status);
      case 'sla_risk':
        return result.filter(l => l.slaStatus === 'danger');
      default:
        return result;
    }
  }, [leads, activeTab, searchFilters, canViewAll, user, advancedFilters]);

  // --- STATS CALCULATION ---
  const stats = useMemo(() => {
    const total = leads.length;
    const newLeads = leads.filter(l => normalizeLeadStatus(l.status as string) === LeadStatus.NEW).length;
    const slaRisk = leads.filter(l => l.slaStatus === 'danger' || l.slaStatus === 'warning').length;

    // Calculate Qualified Rate
    const qualifiedCount = leads.filter(l => {
      const normalizedStatus = normalizeLeadStatus(l.status as string);
      return normalizedStatus === LeadStatus.QUALIFIED || normalizedStatus === LeadStatus.CONVERTED || normalizedStatus === DealStage.WON;
    }).length;
    const rate = total > 0 ? ((qualifiedCount / total) * 100).toFixed(1) : '0.0';

    return { total, newLeads, slaRisk, rate };
  }, [leads]);

  // --- FILTER HELPERS ---

  const addFilter = (field: string, label: string, value: string, color?: string) => {
    // Check if filter already exists
    const exists = searchFilters.some(f => f.field === field && f.value.toLowerCase() === value.toLowerCase());
    if (!exists && value) {
      setSearchFilters([...searchFilters, { field, label, value, color }]);
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
          // Tạo activity scheduled mặc định (Next Activity)
          {
            id: `act-${Date.now()}`,
            type: 'call' as any,
            content: 'Gọi điện tư vấn lần đầu',
            timestamp: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // +1 ngày
            status: 'scheduled',
            userId: user?.id || 'admin'
          },
          // Copy activities từ Lead
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
      alert("Có lỗi xảy ra khi chuyển đổi Lead!");
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
      alert("Vui lòng nhập Tên và SĐT");
      return;
    }
    if (!newLeadData.company) {
      alert("Vui lòng chọn Cơ sở / Company Base");
      return;
    }


    const newLead: ILead = {
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
      status: normalizeLeadStatus(newLeadData.status as string) as any,
      createdAt: new Date().toISOString(),
      score: 10,
      lastActivityDate: new Date().toISOString(),
      lastInteraction: new Date().toISOString(),
      slaStatus: 'normal'
    };
    const finalLead = assignOwnersBySystemMode([newLead])[0];

    if (saveLead(finalLead)) {
      setLeads([finalLead, ...leads]);
      setShowCreateModal(false);
      setNewLeadData({
        name: '', phone: '', email: '', source: 'hotline', program: 'Tiếng Đức', notes: '',
        title: '', company: '', province: '', city: '', ward: '', street: '', salesperson: '', campaign: '', tags: [], referredBy: '',
        product: '', market: '', channel: '', status: LeadStatus.NEW
      });
      alert("Tạo Lead thành công!");
    } else {
      alert("Có lỗi xảy ra khi lưu Lead");
    }
  };

  const handleCreateSubmit = () => {
    if (!newLeadData.name.trim() || !newLeadData.phone.trim()) {
      alert('Vui lòng nhập Tên và SĐT');
      return;
    }
    if (!newLeadData.targetCountry) {
      alert('Vui lòng chọn Quốc gia mục tiêu');
      return;
    }

    const nowIso = new Date().toISOString();
    const campus = resolveLeadCampus(newLeadData);
    const guardianRelation = getLeadGuardianRelation(newLeadData.title);
    const studentInfo = buildLeadStudentInfo(newLeadData);
    const program = (
      newLeadData.product &&
      ['Tiếng Đức', 'Tiếng Trung', 'Du học Đức', 'Du học Trung', 'Du học nghề Úc'].includes(newLeadData.product)
    )
      ? newLeadData.product as ILead['program']
      : newLeadData.program as ILead['program'];

    const newLead: ILead = {
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
      studentInfo,
      marketingData: {
        tags: newLeadData.tags,
        campaign: newLeadData.campaign,
        channel: newLeadData.channel,
        market: campus || undefined,
        region: newLeadData.company.trim() || undefined,
      },
      status: normalizeLeadStatus(newLeadData.status as string) as any,
      createdAt: nowIso,
      score: 10,
      lastActivityDate: nowIso,
      lastInteraction: nowIso,
      slaStatus: 'normal'
    };
    const finalLead = assignOwnersBySystemMode([newLead])[0];

    if (saveLead(finalLead)) {
      setLeads([finalLead, ...leads]);
      setShowCreateModal(false);
      setCreateModalActiveTab('notes');
      setNewLeadData(createLeadInitialState());
      alert('Tạo Lead thành công!');
    } else {
      alert('Có lỗi xảy ra khi lưu Lead');
    }
  };

  const handleAssignSubmit = () => {
    if (!selectedRep) {
      alert("Vui lòng chọn nhân viên Sale");
      return;
    }

    const updatedLeads = leads.map(l =>
      selectedLeadIds.includes(l.id) ? { ...l, ownerId: selectedRep, status: LeadStatus.NEW } : l
    );

    saveLeads(updatedLeads);
    setLeads(updatedLeads);
    setShowAssignModal(false);
    setSelectedLeadIds([]);
    setSelectedRep('');
    alert(`Đã phân bổ thành công ${selectedLeadIds.length} lead!`);
  };

  // --- BULK ACTIONS ---
  const handleBulkDelete = () => {
    if (confirm(`Bạn có chắc muốn xóa ${selectedLeadIds.length} lead đã chọn?`)) {
      const remainingLeads = leads.filter(l => !selectedLeadIds.includes(l.id));
      setLeads(remainingLeads);
      saveLeads(remainingLeads);
      setSelectedLeadIds([]);
    }
  };

  const handleConfirmLoss = () => {
    if (!lossReason) {
      alert("Vui lòng chọn lý do!");
      return;
    }
    const finalReason = lossReason === 'Lý do khác' ? customLossReason : lossReason;
    if (lossReason === 'Lý do khác' && !customLossReason.trim()) {
      alert("Vui lòng nhập lý do cụ thể!");
      return;
    }

    const updatedLeads = leads.map(l =>
      lossModalLeadIds.includes(l.id)
        ? {
          ...l,
          status: DealStage.LOST,
          lostReason: finalReason,
          activities: [
            {
              id: `act-${Date.now()}`,
              type: 'system' as any,
              timestamp: new Date().toISOString(),
              description: `Trạng thái → LOST. Lý do: ${finalReason}`,
              user: user?.name || 'Admin',
              title: 'Thất bại'
            },
            ...(Array.isArray(l.activities) ? l.activities : [])
          ]
        }
        : l
    );

    setLeads(updatedLeads);
    saveLeads(updatedLeads);
    setShowLossModal(false);
    setLossModalLeadIds([]);
    setLossReason('');
    setCustomLossReason('');
    setSelectedLeadIds([]);
    alert(`Đã đánh dấu thất bại cho ${lossModalLeadIds.length} lead!`);
  };

  const handleBulkMarkLost = () => {
    if (selectedLeadIds.length === 0) return;
    setLossModalLeadIds(selectedLeadIds);
    setShowLossModal(true);
  };

  const handleBulkExport = () => {
    const leadsToExport = leads.filter(l => selectedLeadIds.includes(l.id));
    const ws = utils.json_to_sheet(leadsToExport.map(l => ({
      'ID': l.id,
      'Tên': l.name,
      'SĐT': l.phone,
      'Email': l.email,
      'Cơ sở': l.company,
      'Nguồn': l.source,
      'Trạng thái': normalizeLeadStatus(l.status as string)
    })));
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Leads");
    write(wb, { bookType: 'xlsx', type: 'buffer' });
    // Trigger download (simplified)
    alert("Tính năng export đang được xử lý (Console log data)");
    console.log(leadsToExport);
  };

  // --- INLINE ACTIONS ---
  const handlePickUpLead = (e: React.MouseEvent, lead: ILead) => {
    e.stopPropagation();
    const updatedLead = { ...lead, ownerId: user?.id, status: LeadStatus.ASSIGNED };
    handleUpdateLead(updatedLead);
    alert(`Đã tiếp nhận lead: ${lead.name}`);
  };

  const handleQuickMarkLost = (e: React.MouseEvent, lead: ILead) => {
    e.stopPropagation();
    setLossModalLeadIds([lead.id]);
    setShowLossModal(true);
  };

  return decodeMojibakeReactNode(
    <>
      <div className="p-6 max-w-[1600px] mx-auto min-h-screen font-inter bg-slate-50 text-slate-900">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">Cơ hội (Leads)</h1>
            <p className="text-slate-500 text-sm mt-1">Quản lý Lead đầu vào và phân bổ cho đội Sales</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowImportModal(true)} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50 flex items-center gap-2 shadow-sm transition-all hover:border-blue-300 hover:text-blue-600"><FileSpreadsheet size={16} /> Import Excel</button>
            <button
              onClick={() => {
                setCreateModalActiveTab('notes');
                setIsAddingTag(false);
                setNewLeadData(createLeadInitialState());
                setShowCreateModal(true);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-200 transition-all"
            >
              <Plus size={18} strokeWidth={3} /> Thêm Lead
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div
            onClick={() => setActiveTab('all')}
            className={`bg-white p-4 rounded-xl shadow-sm border cursor-pointer transition-all hover:shadow-md ${activeTab === 'all' ? 'border-blue-500 ring-1 ring-blue-100' : 'border-slate-100 hover:border-blue-200'}`}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng số Lead</p>
                <div className="text-2xl font-black text-slate-800 mt-1">{stats.total.toLocaleString()}</div>
              </div>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Users size={20} />
              </div>
            </div>
          </div>

          <div
            onClick={() => setActiveTab('new')}
            className={`bg-white p-4 rounded-xl shadow-sm border cursor-pointer transition-all hover:shadow-md ${activeTab === 'new' ? 'border-emerald-500 ring-1 ring-emerald-100' : 'border-slate-100 hover:border-emerald-200'}`}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lead Mới</p>
                <div className="text-2xl font-black text-slate-800 mt-1">{stats.newLeads.toLocaleString()}</div>
              </div>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <UserPlus size={20} />
              </div>
            </div>
          </div>

          <div
            onClick={() => setActiveTab('sla_risk')}
            className={`bg-white p-4 rounded-xl shadow-sm border cursor-pointer transition-all hover:shadow-md ${activeTab === 'sla_risk' ? 'border-red-500 ring-1 ring-red-100' : 'border-slate-100 hover:border-red-200'}`}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cảnh báo SLA</p>
                <div className="text-2xl font-black text-slate-800 mt-1">{stats.slaRisk.toLocaleString()}</div>
              </div>
              <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                <AlertTriangle size={20} />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 hover:border-purple-200 transition-all hover:shadow-md">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tỷ lệ xác thực</p>
                <div className="text-2xl font-black text-slate-800 mt-1">{stats.rate}%</div>
              </div>
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                <ShieldCheck size={20} />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs & Filter */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6">
          <div className="flex items-center border-b border-slate-100 px-4">
            {['all', 'new', 'sla_risk'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-4 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === tab ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                {tab === 'all' && 'Tất cả'}
                {tab === 'new' && 'Lead Mới'}
                {tab === 'sla_risk' && <span className="flex items-center gap-2">SLA Rủi ro <AlertTriangle size={14} className="text-red-500" /></span>}
              </button>
            ))}
          </div>
          <div className="p-4 flex gap-4 items-center">
            <SmartSearchBar
              filters={toolbarFilterChips}
              onAddFilter={(filter) => addFilter(filter.field, filter.label, filter.value, filter.color)}
              onRemoveFilter={handleToolbarFilterRemove}
              onClearAll={handleClearToolbarFilters}
              placeholder="Tim kiem..."
            />

            {/* View Switcher */}
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button onClick={() => setViewMode('list')} className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`} title="Dạng Danh sách"><ListIcon size={16} /></button>
              <button onClick={() => setViewMode('pivot')} className={`p-1.5 rounded ${viewMode === 'pivot' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`} title="Báo cáo Pivot"><LayoutGrid size={16} /></button>
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
              <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm hover:border-slate-300 transition-all">
                <select
                  value={timeFilterField}
                  onChange={(e) => setTimeFilterField(e.target.value as any)}
                  className="bg-slate-50 border-r border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 outline-none cursor-pointer hover:bg-slate-100"
                >
                  <option value="createdAt">Ngày tạo</option>
                  <option value="deadline">Hạn chót</option>
                  <option value="lastInteraction">Tương tác cuối</option>
                </select>
                <button
                  onClick={() => setShowTimePicker(!showTimePicker)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold whitespace-nowrap ${timeRangeType !== 'all' ? 'text-blue-600 bg-blue-50' : 'text-slate-500'}`}
                >
                  <Calendar size={16} />
                  {timePresets.find(p => p.id === timeRangeType)?.label}
                  {timeRangeType === 'custom' && customRange && (
                    <span className="text-[10px] bg-blue-100 px-1 rounded ml-1">
                      {new Date(customRange.start).toLocaleDateString('vi-VN')} - {new Date(customRange.end).toLocaleDateString('vi-VN')}
                    </span>
                  )}
                  <ChevronRight size={14} className={`transition-transform ${showTimePicker ? 'rotate-90' : ''}`} />
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
                className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-semibold hover:bg-slate-50 ${showFilterDropdown ? 'bg-slate-100 border-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}
              >
                <Filter size={16} /> Lọc nâng cao
                {(() => {
                  const activeCount = [
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
              {(() => {
                const hasActiveFilters = advancedFilters.myPipeline || advancedFilters.unassigned || advancedFilters.openOps || advancedFilters.createdDate || advancedFilters.closedDate || advancedFilters.status.length > 0;
                return hasActiveFilters ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
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
                    title="Xóa tất cả bộ lọc"
                  >
                    <X size={12} strokeWidth={3} />
                  </button>
                ) : null;
              })()}
              {showFilterDropdown && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowFilterDropdown(false)}></div>
                  <div className="absolute right-0 top-full mt-2 w-[800px] bg-white border border-slate-200 rounded-lg shadow-xl z-40 p-4 animate-in fade-in zoom-in-95 flex text-sm">
                    {/* COLUMN 1: FILTER */}
                    <div className="flex-1 pr-4 border-r border-slate-100 space-y-2">
                      <div className="font-bold text-slate-800 mb-2 flex items-center gap-2"><Filter size={14} /> Bộ lọc</div>

                      {/* My Pipeline */}
                      <div className="group">
                        <div
                          onClick={() => setAdvancedFilters(prev => ({ ...prev, myPipeline: !prev.myPipeline }))}
                          className={`flex justify-between items-center py-1.5 px-2 hover:bg-slate-50 rounded cursor-pointer font-medium ${advancedFilters.myPipeline ? 'bg-blue-50 text-blue-700' : 'text-slate-700'}`}
                        >
                          <span>
                            <Check size={14} className={`inline mr-2 ${advancedFilters.myPipeline ? 'text-blue-600' : 'text-transparent'}`} />
                            Quy trình của tôi
                          </span>
                        </div>
                        <div className="pl-6 space-y-1">
                          <div
                            onClick={() => setAdvancedFilters(prev => ({ ...prev, unassigned: !prev.unassigned }))}
                            className={`py-1 px-2 hover:bg-slate-50 rounded cursor-pointer ${advancedFilters.unassigned ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600'}`}
                          >
                            <Check size={12} className={`inline mr-1 ${advancedFilters.unassigned ? 'text-blue-600' : 'text-transparent'}`} />
                            Chưa phân công
                          </div>
                          <div
                            onClick={() => setAdvancedFilters(prev => ({ ...prev, openOps: !prev.openOps }))}
                            className={`py-1 px-2 hover:bg-slate-50 rounded cursor-pointer ${advancedFilters.openOps ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600'}`}
                          >
                            <Check size={12} className={`inline mr-1 ${advancedFilters.openOps ? 'text-blue-600' : 'text-transparent'}`} />
                            Mở cơ hội
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-slate-100 my-1"></div>

                      {/* Date Created */}
                      <div className="group relative">
                        <div onClick={(e) => toggleFilter('filter_created', e)} className={`flex justify-between items-center py-1.5 px-2 hover:bg-slate-50 rounded cursor-pointer ${expandedFilter === 'filter_created' ? 'bg-slate-100 text-blue-600' : advancedFilters.createdDate ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700'}`}>
                          <span>
                            <Check size={14} className={`inline mr-2 ${advancedFilters.createdDate ? 'text-blue-600' : 'text-transparent'}`} />
                            Ngày tạo
                            {advancedFilters.createdDate && (
                              <span className="ml-2 text-xs bg-blue-100 px-1.5 py-0.5 rounded">
                                {advancedFilters.createdDate.type === 'month' && `T${advancedFilters.createdDate.value}`}
                                {advancedFilters.createdDate.type === 'quarter' && `Q${advancedFilters.createdDate.value}`}
                                {advancedFilters.createdDate.type === 'year' && advancedFilters.createdDate.value}
                              </span>
                            )}
                          </span>
                          <span className="text-slate-400">▼</span>
                        </div>
                        {expandedFilter === 'filter_created' && (
                          <div className="absolute left-0 top-full mt-1 w-full bg-white border border-slate-200 shadow-xl rounded-lg p-2 z-50">
                            {[2, 1, 12].map(month => (
                              <div
                                key={`month-${month}`}
                                onClick={() => { setDateFilter('createdDate', 'month', month); setExpandedFilter(null); }}
                                className={`py-1 px-3 hover:bg-blue-50 rounded cursor-pointer ${advancedFilters.createdDate?.type === 'month' && advancedFilters.createdDate?.value === month ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-slate-700'}`}
                              >
                                tháng {month}
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
                            Ngày chốt
                            {advancedFilters.closedDate && (
                              <span className="ml-2 text-xs bg-blue-100 px-1.5 py-0.5 rounded">
                                {advancedFilters.closedDate.type === 'month' && `T${advancedFilters.closedDate.value}`}
                                {advancedFilters.closedDate.type === 'quarter' && `Q${advancedFilters.closedDate.value}`}
                                {advancedFilters.closedDate.type === 'year' && advancedFilters.closedDate.value}
                              </span>
                            )}
                          </span>
                          <span className="text-slate-400">▼</span>
                        </div>
                        {expandedFilter === 'filter_closed' && (
                          <div className="absolute left-0 top-full mt-1 w-full bg-white border border-slate-200 shadow-xl rounded-lg p-2 z-50">
                            {[2, 1, 12].map(month => (
                              <div
                                key={`month-${month}`}
                                onClick={() => { setDateFilter('closedDate', 'month', month); setExpandedFilter(null); }}
                                className={`py-1 px-3 hover:bg-blue-50 rounded cursor-pointer ${advancedFilters.closedDate?.type === 'month' && advancedFilters.closedDate?.value === month ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-slate-700'}`}
                              >
                                tháng {month}
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

                      {['Đạt', 'Đang diễn ra', 'Rotting', 'Mất'].map(status => (
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
                      {/* Removed "Bộ lọc tùy chỉnh" */}
                    </div>

                    {/* COLUMN 2: GROUP BY */}
                    <div className="flex-1 px-4 border-r border-slate-100 space-y-2">
                      <div className="font-bold text-slate-800 mb-2 flex items-center gap-2"><Users size={14} /> Nhóm theo</div>

                      {['Chuyên viên sales', 'Bộ phận sales', 'Giai đoạn', 'Thành phố', 'Quốc gia', 'Lý do mất', 'Chiến dịch', 'Phương tiện', 'Nguồn'].map(field => (
                        <div key={field} className="py-1.5 px-2 hover:bg-slate-50 rounded cursor-pointer text-slate-700">
                          {field}
                        </div>
                      ))}

                      <div className="border-t border-slate-100 my-1"></div>
                      <div className="group relative">
                        <div onClick={(e) => toggleFilter('group_created', e)} className={`flex justify-between items-center py-1.5 px-2 hover:bg-slate-50 rounded cursor-pointer ${expandedFilter === 'group_created' ? 'bg-slate-100 text-blue-600' : 'text-slate-700'}`}>
                          <span>Ngày tạo</span>
                          <span className="text-slate-400">▼</span>
                        </div>
                        {expandedFilter === 'group_created' && (
                          <div className="absolute left-0 top-full mt-1 w-full bg-white border border-slate-200 shadow-xl rounded-lg p-2 z-50">
                            {['Năm', 'Quý', 'Tháng', 'Tuần', 'Ngày'].map(item => (
                              <div key={item} className="py-1 px-3 hover:bg-slate-100 rounded cursor-pointer text-slate-700">{item}</div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="group relative">
                        <div onClick={(e) => toggleFilter('group_expected', e)} className={`flex justify-between items-center py-1.5 px-2 hover:bg-slate-50 rounded cursor-pointer ${expandedFilter === 'group_expected' ? 'bg-slate-100 text-blue-600' : 'text-slate-700'}`}>
                          <span>Ngày đóng dự kiến</span>
                          <span className="text-slate-400">▼</span>
                        </div>
                        {expandedFilter === 'group_expected' && (
                          <div className="absolute left-0 top-full mt-1 w-full bg-white border border-slate-200 shadow-xl rounded-lg p-2 z-50">
                            {['Năm', 'Quý', 'Tháng', 'Tuần', 'Ngày'].map(item => (
                              <div key={item} className="py-1 px-3 hover:bg-slate-100 rounded cursor-pointer text-slate-700">{item}</div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="group relative">
                        <div onClick={(e) => toggleFilter('group_closed', e)} className={`flex justify-between items-center py-1.5 px-2 hover:bg-slate-50 rounded cursor-pointer ${expandedFilter === 'group_closed' ? 'bg-slate-100 text-blue-600' : 'text-slate-700'}`}>
                          <span>Ngày chốt</span>
                          <span className="text-slate-400">▼</span>
                        </div>
                        {expandedFilter === 'group_closed' && (
                          <div className="absolute left-0 top-full mt-1 w-full bg-white border border-slate-200 shadow-xl rounded-lg p-2 z-50">
                            {['Năm', 'Quý', 'Tháng', 'Tuần', 'Ngày'].map(item => (
                              <div key={item} className="py-1 px-3 hover:bg-slate-100 rounded cursor-pointer text-slate-700">{item}</div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="border-t border-slate-100 my-1"></div>
                      <div className="group relative">
                        <div onClick={(e) => toggleFilter('group_custom', e)} className={`flex justify-between items-center py-1.5 px-2 hover:bg-slate-50 rounded cursor-pointer ${expandedFilter === 'group_custom' ? 'bg-slate-100 text-blue-600' : 'text-slate-700'}`}>
                          <span>Nhóm tùy chỉnh</span>
                          <span className="text-slate-400">▼</span>
                        </div>
                        {expandedFilter === 'group_custom' && (
                          <div className="absolute left-0 bottom-full mb-1 w-[300px] bg-white border border-slate-200 shadow-xl rounded-lg p-2 z-50 max-h-[300px] overflow-y-auto custom-scrollbar">
                            {['Bộ phận sales', 'Chiến dịch', 'Chuyên viên sales', 'Chất lượng email', 'Chất lượng điện thoại', 'Công ty', 'Cơ hội', 'Cập nhật giai đoạn lần cuối', 'Cập nhật lần cuối bởi', 'Cập nhật lần cuối vào', 'Email', 'Email cc', 'Email chuẩn hóa', 'Giai đoạn', 'Giới thiệu bởi', 'Hiện ID', 'Hoàn tất tăng cường', 'Kế hoạch định kỳ', 'Liên hệ', 'Loại'].map(field => (
                              <div key={field} className="py-1 px-3 hover:bg-slate-100 rounded cursor-pointer whitespace-nowrap text-slate-700">{field}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* COLUMN 3: FAVORITES */}
                    <div className="flex-1 pl-4 space-y-4">
                      <div className="font-bold text-slate-800 mb-2 flex items-center gap-2"><Save size={14} /> Danh sách yêu thích</div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Lưu bộ lọc hiện tại</label>
                          <input className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm mb-2" defaultValue="Quy trình" />
                          <div className="flex items-center gap-2 mb-2">
                            <input type="checkbox" id="default-filter" className="rounded border-slate-300" />
                            <label htmlFor="default-filter" className="text-slate-600 text-sm">Bộ lọc mặc định</label>
                          </div>
                          <div className="flex gap-2">
                            <button className="flex-1 bg-purple-700 text-white py-1 rounded text-xs font-bold hover:bg-purple-800">Lưu</button>
                            <button className="flex-1 bg-slate-100 text-slate-700 py-1 rounded text-xs font-bold hover:bg-slate-200">Chỉnh sửa</button>
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
                className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-semibold transition-all shadow-sm ${duplicateGroups.length > 0 ? 'border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100' : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50'}`}
                title={`Tìm thấy ${duplicateGroups.length} nhóm trùng SĐT`}
              >
                <Database size={16} />
                Chống trùng
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


            {selectedLeadIds.length > 0 && (
              <div className="ml-auto flex items-center gap-3 animate-in slide-in-from-right-4 fade-in duration-300">
                <span className="text-sm font-semibold text-slate-600">Đã chọn <span className="text-blue-600 font-bold">{selectedLeadIds.length}</span> lead</span>

                <button onClick={handleBulkMarkLost} className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Đánh dấu thất bại">
                  <XCircle size={18} />
                </button>

                <button onClick={handleBulkDelete} className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Xóa">
                  <Trash2 size={18} />
                </button>
                <button onClick={handleBulkExport} className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Xuất Excel">
                  <Download size={18} />
                </button>

                <div className="h-6 w-px bg-slate-300 mx-1"></div>

                {systemDistributionMode === 'manual' ? (
                  <button
                    onClick={() => {
                      setSelectedRep('');
                      setShowAssignModal(true);
                    }}
                    className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-bold hover:bg-blue-200 flex items-center gap-2"
                  >
                    <UserPlus size={16} /> Phân bổ
                  </button>
                ) : (
                  <div className="px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-200">
                    Auto-Assign đang bật
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* CONTENT AREA: LIST vs PIVOT */}
        <div className="mt-4">
          {viewMode === 'pivot' ? (
            <LeadPivotTable leads={filteredLeads} />
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold tracking-wider sticky top-0 z-10">
                  <tr>
                    <th className="p-2 w-8 text-center border-b border-slate-200">
                      <input type="checkbox" className="rounded border-slate-300" onChange={handleSelectAll} checked={selectedLeadIds.length === filteredLeads.length && filteredLeads.length > 0} />
                    </th>
                    {visibleColumns.includes('opportunity') && <th className="p-2 border-b border-slate-200 text-[10px]">Cơ hội</th>}
                    {visibleColumns.includes('contact') && <th className="p-2 border-b border-slate-200 text-[10px]">Tên liên hệ</th>}
                    {visibleColumns.includes('company') && <th className="p-2 border-b border-slate-200 text-[10px]">Cơ sở / Công ty</th>}
                    {visibleColumns.includes('title') && <th className="p-2 border-b border-slate-200 text-[10px]">Danh xưng</th>}
                    {visibleColumns.includes('email') && <th className="p-2 border-b border-slate-200 text-[10px]">Email</th>}
                    {visibleColumns.includes('phone') && <th className="p-2 border-b border-slate-200 text-[10px]">SĐT</th>}
                    {visibleColumns.includes('address') && <th className="p-2 border-b border-slate-200 text-[10px]">Địa chỉ</th>}
                    {visibleColumns.includes('salesperson') && <th className="p-2 border-b border-slate-200 text-[10px]">Sale</th>}
                    {visibleColumns.includes('campaign') && <th className="p-2 border-b border-slate-200 text-[10px]">Chiến dịch</th>}
                    {visibleColumns.includes('source') && <th className="p-2 border-b border-slate-200 text-[10px]">Nguồn</th>}
                    {visibleColumns.includes('tags') && <th className="p-2 border-b border-slate-200 text-[10px]">Tags</th>}
                    {visibleColumns.includes('referredBy') && <th className="p-2 border-b border-slate-200 text-[10px]">Người GT</th>}
                    {visibleColumns.includes('market') && <th className="p-2 border-b border-slate-200 text-[10px]">THỊ TRƯỜNG</th>}
                    {visibleColumns.includes('product') && <th className="p-2 border-b border-slate-200 text-[10px]">SẢN PHẨM QUAN TÂM</th>}
                    {visibleColumns.includes('notes') && <th className="p-2 border-b border-slate-200 text-[10px]">Ghi chú</th>}
                    {visibleColumns.includes('nextActivity') && <th className="p-2 border-b border-slate-200 text-[10px]">Hoạt động</th>}
                    {visibleColumns.includes('deadline') && <th className="p-2 border-b border-slate-200 text-[10px]">Hạn chót</th>}
                    {visibleColumns.includes('value') && <th className="p-2 border-b border-slate-200 text-right text-[10px]">Doanh thu</th>}
                    {visibleColumns.includes('status') && <th className="p-2 border-b border-slate-200 text-center text-[10px]">Trạng thái</th>}
                    {visibleColumns.includes('sla') && <th className="p-2 border-b border-slate-200 text-left text-[10px]">SLA</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLeads.length === 0 ? (
                    <tr><td colSpan={9} className="p-8 text-center text-slate-500">Không tìm thấy lead nào phù hợp.</td></tr>
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
                          className={`hover:bg-blue-50 group cursor-pointer transition-colors ${selectedLeadIds.includes(lead.id) ? 'bg-blue-50' : ''}`}
                          onClick={() => setSelectedLead(lead)}
                        >
                          <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" className="rounded border-slate-300 w-3.5 h-3.5" checked={selectedLeadIds.includes(lead.id)} onClick={(e) => handleSelectLeadCheckbox(lead.id, e)} onChange={() => { }} />
                          </td>

                          {visibleColumns.includes('opportunity') && (
                            <td className="p-2">
                              <div className="flex flex-col gap-0.5 overflow-hidden">
                                <span className="font-bold text-slate-900 text-[10px] truncate max-w-[120px]" title={lead.name}>{lead.name}</span>
                                {lead.program && (
                                  <span
                                    className="text-[9px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer hover:underline w-fit truncate block max-w-[120px]"
                                    onClick={(e) => handleClickableField(e, 'program', 'Chương trình', lead.program, 'bg-blue-100 text-blue-700')}
                                    title={lead.program}
                                  >
                                    {lead.program}
                                  </span>
                                )}
                              </div>
                            </td>
                          )}

                          {visibleColumns.includes('contact') && <td className="p-2 text-[10px] text-slate-700 font-semibold truncate max-w-[60px]" title={lead.name}>{lead.name}</td>}
                          {visibleColumns.includes('company') && <td className="p-2 text-[10px] text-slate-700 truncate max-w-[60px]" title={(lead as any).company}>{(lead as any).company || '-'}</td>}

                          {visibleColumns.includes('title') && <td className="p-2 text-[10px] text-slate-600 whitespace-nowrap">{(lead as any).title || '-'}</td>}

                          {visibleColumns.includes('email') && <td className="p-2 text-[10px] text-slate-600 truncate max-w-[80px]" title={lead.email}>{lead.email || '-'}</td>}

                          {visibleColumns.includes('phone') && (
                            <td className="p-2">
                              <span className="text-[10px] text-slate-600 font-bold whitespace-nowrap">{lead.phone || '-'}</span>
                            </td>
                          )}

                          {visibleColumns.includes('address') && (
                            <td className="p-2 text-[10px] text-slate-600 max-w-[60px] truncate" title={`${(lead as any).street || ''}, ${(lead as any).ward || ''}, ${(lead as any).city || ''}`}>
                              {[(lead as any).street, (lead as any).ward, (lead as any).city].filter(Boolean).join(', ') || '-'}
                            </td>
                          )}

                          {visibleColumns.includes('salesperson') && <td className="p-2 text-[10px] text-slate-600 truncate max-w-[70px]">
                            {SALES_REPS.find(r => r.id === lead.ownerId)?.name || '-'}
                          </td>}

                          {visibleColumns.includes('campaign') && <td className="p-2 text-[10px] text-slate-600 truncate max-w-[70px]" title={(lead as any).campaign}>{(lead as any).campaign || '-'}</td>}

                          {visibleColumns.includes('source') && (
                            <td className="p-2">
                              <span
                                className="text-[9px] text-teal-600 font-semibold bg-teal-50 px-1 py-0.5 rounded border border-teal-100 cursor-pointer whitespace-nowrap"
                                onClick={(e) => handleClickableField(e, 'source', 'Nguồn', lead.source, 'bg-teal-100 text-teal-700')}
                              >
                                {lead.source}
                              </span>
                            </td>
                          )}

                          {visibleColumns.includes('tags') && <td className="p-2 text-[10px] text-slate-600 overflow-hidden whitespace-nowrap">{(() => {
                            const tags = Array.isArray((lead as any).marketingData?.tags)
                              ? (lead as any).marketingData.tags
                              : (typeof (lead as any).marketingData?.tags === 'string'
                                ? (lead as any).marketingData.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
                                : []);

                            if (tags.length === 0) return '-';

                            // Show only first tag if many to save space
                            return (
                              <span className="bg-slate-100 text-slate-700 text-[9px] px-1 py-0.5 rounded border font-semibold">
                                {tags[0]}{tags.length > 1 ? ` +${tags.length - 1}` : ''}
                              </span>
                            );
                          })()}</td>}

                          {visibleColumns.includes('referredBy') && <td className="p-2 text-[10px] text-slate-600 truncate max-w-[70px]">{(lead as any).referredBy || '-'}</td>}

                          {visibleColumns.includes('market') && <td className="p-2 text-[10px] text-slate-600 truncate max-w-[80px]">{(lead as any).marketingData?.market || '-'}</td>}
                          {visibleColumns.includes('product') && <td className="p-2 text-[10px] text-slate-600 truncate max-w-[100px]" title={lead.program || (lead as any).product}>{(lead as any).product || lead.program || '-'}</td>}

                          {visibleColumns.includes('notes') && <td className="p-2 text-[10px] text-slate-500 max-w-[60px] truncate" title={(lead as any).notes || ''}>{(lead as any).notes || '-'}</td>}

                          {/* Next Activity */}
                          {visibleColumns.includes('nextActivity') && (
                            <td className="p-2">
                              {nextActivity ? (
                                <div className="flex items-center gap-1 text-[9px] font-semibold text-purple-700 bg-purple-50 px-1 py-0.5 rounded max-w-[80px] overflow-hidden" title={nextActivity.description}>
                                  <Clock size={8} className="shrink-0" />
                                  <span className="truncate">{nextActivity.description.split(':')[0] || 'Lịch hẹn'}</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 text-[9px] text-slate-400">
                                  <Plus size={8} /> Lên lịch
                                </div>
                              )}
                            </td>
                          )}

                          {/* Deadline */}
                          {visibleColumns.includes('deadline') && (
                            <td className="p-2 text-[10px] text-slate-600 whitespace-nowrap">
                              {deadline !== '-' ? <span className="text-red-600 font-bold">{deadline}</span> : '-'}
                            </td>
                          )}

                          {/* Revenue */}
                          {visibleColumns.includes('value') && (
                            <td className="p-2 text-[10px] font-bold text-slate-800 text-right whitespace-nowrap">
                              {lead.value ? lead.value.toLocaleString('vi-VN') : '-'}
                            </td>
                          )}

                          {visibleColumns.includes('status') && (
                            <td className="p-2 text-center">
                              <span
                                className={`px-1 py-0.5 rounded text-[9px] font-bold border uppercase tracking-tighter cursor-pointer hover:opacity-80 whitespace-nowrap ${normalizedStatus === LeadStatus.NEW ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                  normalizedStatus === LeadStatus.QUALIFIED ? 'bg-cyan-50 text-cyan-700 border-cyan-200' :
                                    normalizedStatus === DealStage.WON ? 'bg-green-50 text-green-700 border-green-200' :
                                      normalizedStatus === DealStage.LOST ? 'bg-red-50 text-red-700 border-red-200' :
                                        'bg-slate-50 text-slate-600 border-slate-200'
                                  }`}
                                onClick={(e) => handleClickableField(e, 'status', 'Trạng thái', normalizedStatus,
                                  normalizedStatus === LeadStatus.NEW ? 'bg-blue-100 text-blue-700' :
                                    normalizedStatus === LeadStatus.QUALIFIED ? 'bg-cyan-100 text-cyan-700' :
                                      normalizedStatus === DealStage.WON ? 'bg-green-100 text-green-700' :
                                        normalizedStatus === DealStage.LOST ? 'bg-red-100 text-red-700' :
                                          'bg-slate-100 text-slate-700'
                                )}
                                title={normalizedStatus}
                              >
                                {normalizedStatus}
                              </span>
                            </td>
                          )}

                          {visibleColumns.includes('sla') && (
                            <td className="p-2">
                              {lead.slaStatus === 'danger' || lead.slaStatus === 'warning' ? (
                                <span
                                  className={`font-bold text-[9px] ${lead.slaStatus === 'danger' ? 'text-red-600' : 'text-amber-600'} truncate block max-w-[80px]`}
                                  title={lead.slaReason || (lead.slaStatus === 'danger' ? 'Quá hạn' : 'Chú ý')}
                                >
                                  {lead.slaReason || (lead.slaStatus === 'danger' ? 'Quá hạn' : 'Chú ý')}
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
                  Chi tiết Lead: {selectedLead.name}
                </h3>
                <div className="flex items-center gap-3">
                  <button className="px-3 py-1.5 bg-white border border-slate-300 rounded text-slate-600 flex items-center gap-2 text-sm font-semibold hover:bg-slate-50">
                    <Phone size={16} /> Cuộc gọi
                  </button>
                  <button onClick={() => setSelectedLead(null)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto bg-white p-6 md:p-8 custom-scrollbar">
                {/* TOP HEADER */}
                <div className="mb-6">
                  <label className="block text-slate-700 text-sm font-bold mb-2">Mô tả / Tên khách hàng <span className="text-red-500">*</span></label>
                  <div className="flex gap-3">
                    <select
                      className="w-28 px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none bg-white font-medium text-slate-700"
                      value={editLeadData.title}
                      onChange={e => setEditLeadData({ ...editLeadData, title: e.target.value })}
                    >
                      <option value="">Danh xưng</option>
                      <option value="Mr.">Anh</option>
                      <option value="Ms.">Chị</option>
                      <option value="Phụ huynh">Phụ huynh</option>
                      <option value="Học sinh">Học sinh</option>
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
                      <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Cơ sở</label>
                      <select
                        className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none bg-white text-slate-700"
                        value={editLeadData.company}
                        onChange={e => setEditLeadData({ ...editLeadData, company: e.target.value })}
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
                          className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none text-slate-700"
                          placeholder="Số nhà, đường..."
                          value={editLeadData.street}
                          onChange={e => setEditLeadData({ ...editLeadData, street: e.target.value })}
                        />
                        <div className="grid grid-cols-3 gap-2">
                          <input className="px-2 py-2 border border-slate-300 rounded text-sm outline-none" placeholder="Tỉnh/TP" value={editLeadData.province} onChange={e => setEditLeadData({ ...editLeadData, province: e.target.value })} />
                          <input className="px-2 py-2 border border-slate-300 rounded text-sm outline-none" placeholder="Quận/Huyện" value={editLeadData.city} onChange={e => setEditLeadData({ ...editLeadData, city: e.target.value })} />
                          <input className="px-2 py-2 border border-slate-300 rounded text-sm outline-none" placeholder="P/Xã" value={editLeadData.ward} onChange={e => setEditLeadData({ ...editLeadData, ward: e.target.value })} />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Sản phẩm</label>
                      <select
                        className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none bg-white text-slate-700"
                        value={editLeadData.product}
                        onChange={e => setEditLeadData({ ...editLeadData, product: e.target.value })}
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
                      <select className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm outline-none bg-white" value={editLeadData.market} onChange={e => setEditLeadData({ ...editLeadData, market: e.target.value })}>
                        <option value="">-- Chọn --</option>
                        <option value="Vinh">Vinh</option>
                        <option value="Hà Tĩnh">Hà Tĩnh</option>
                        <option value="Hà Nội">Hà Nội</option>
                        <option value="Online">Online</option>
                      </select>
                    </div>
                  </div>

                  {/* RIGHT COL */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Điện thoại <span className="text-red-500">*</span></label>
                      <input className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm outline-none font-medium text-slate-800" value={editLeadData.phone} onChange={e => setEditLeadData({ ...editLeadData, phone: e.target.value })} />
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Email</label>
                      <input className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm outline-none" value={editLeadData.email} onChange={e => setEditLeadData({ ...editLeadData, email: e.target.value })} />
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Phụ trách</label>
                      <select className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm outline-none bg-white" value={editLeadData.salesperson} onChange={e => setEditLeadData({ ...editLeadData, salesperson: e.target.value })}>
                        <option value="">-- Sale phụ trách --</option>
                        {SALES_REPS.map(rep => <option key={rep.id} value={rep.id}>{rep.name}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Trạng thái</label>
                      <select className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm outline-none bg-white" value={editLeadData.status} onChange={e => setEditLeadData({ ...editLeadData, status: e.target.value })}>
                        <option value={LeadStatus.NEW}>Mới</option>
                        <option value={LeadStatus.CONTACTED}>Đã liên hệ</option>
                        <option value={LeadStatus.QUALIFIED}>Tiềm năng</option>
                        <option value={DealStage.LOST}>Thất bại</option>
                      </select>
                    </div>
                    <div className="flex items-start gap-4">
                      <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold mt-1.5">Tags</label>
                      <div className="flex-1 flex flex-col gap-1.5">
                        <div className="flex gap-2">
                          {!isAddingEditTag ? (
                            <select
                              className="flex-1 px-2 py-1.5 border border-slate-300 rounded text-xs bg-white outline-none focus:border-blue-500"
                              onChange={(e) => {
                                if (e.target.value === 'khác') {
                                  setIsAddingEditTag(true);
                                } else if (e.target.value && !editLeadData.tags.includes(e.target.value)) {
                                  setEditLeadData({ ...editLeadData, tags: [...editLeadData.tags, e.target.value] });
                                }
                                e.target.value = "";
                              }}
                            >
                              <option value="">-- Chọn Tag --</option>
                              {availableTags.filter(t => !editLeadData.tags.includes(t)).map(t => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                              <option value="khác" className="font-bold text-blue-600">+ Khác</option>
                            </select>
                          ) : (
                            <input
                              autoFocus
                              className="flex-1 px-2 py-1.5 border border-blue-400 rounded text-xs outline-none ring-2 ring-blue-100"
                              placeholder="Nhập tag mới rồi ấn Enter..."
                              onBlur={() => setIsAddingEditTag(false)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const val = (e.target as HTMLInputElement).value.trim();
                                  if (val) {
                                    if (!editLeadData.tags.includes(val)) {
                                      setEditLeadData({ ...editLeadData, tags: [...editLeadData.tags, val] });
                                    }
                                    if (!availableTags.includes(val)) {
                                      const newAvailable = [...availableTags, val];
                                      setAvailableTags(newAvailable);
                                      saveTags(newAvailable);
                                    }
                                    setIsAddingEditTag(false);
                                  }
                                } else if (e.key === 'Escape') {
                                  setIsAddingEditTag(false);
                                }
                              }}
                            />
                          )}
                        </div>
                        {editLeadData.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {editLeadData.tags.map(tag => (
                              <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded border border-blue-100">
                                {tag}
                                <button onClick={() => setEditLeadData({ ...editLeadData, tags: editLeadData.tags.filter(t => t !== tag) })} className="hover:text-blue-900 transition-colors">
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

                {/* TABS SECTION */}
                <div className="mt-8 border-t border-slate-200 pt-4">
                  <div className="flex border-b border-slate-200 mb-4">
                    <button onClick={() => setEditModalActiveTab('notes')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${editModalActiveTab === 'notes' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500'}`}>Ghi chú nội bộ</button>
                    <button onClick={() => setEditModalActiveTab('extra')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${editModalActiveTab === 'extra' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500'}`}>Thông tin thêm (Marketing)</button>
                  </div>
                  <div className="min-h-[150px]">
                    {editModalActiveTab === 'notes' && (
                      <textarea className="w-full p-3 border border-slate-200 rounded text-sm outline-none h-32" value={editLeadData.notes} onChange={e => setEditLeadData({ ...editLeadData, notes: e.target.value })} />
                    )}
                    {editModalActiveTab === 'extra' && (
                      <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                        <div className="flex items-center gap-4">
                          <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Chiến dịch</label>
                          <input className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm outline-none" value={editLeadData.campaign} onChange={e => setEditLeadData({ ...editLeadData, campaign: e.target.value })} />
                        </div>
                        <div className="flex items-center gap-4">
                          <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Nguồn</label>
                          <select className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm outline-none bg-white" value={editLeadData.source} onChange={e => setEditLeadData({ ...editLeadData, source: e.target.value })}>
                            <option value="hotline">Hotline</option>
                            <option value="facebook">Facebook</option>
                            <option value="google">Google Ads</option>
                            <option value="referral">Giới thiệu</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-4">
                          <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Người GT</label>
                          <input className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm outline-none" value={editLeadData.referredBy} onChange={e => setEditLeadData({ ...editLeadData, referredBy: e.target.value })} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 shrink-0">
                <button onClick={() => setSelectedLead(null)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg">Đóng</button>
                <button onClick={handleUpdateSelectedLead} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center gap-2 shadow-sm"><Save size={18} /> Cập nhật</button>
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
                  Thêm Cơ hội / Lead Mới
                </h3>
                <div className="flex items-center gap-3">
                  <button className="px-3 py-1.5 bg-white border border-slate-300 rounded text-slate-600 flex items-center gap-2 text-sm font-semibold hover:bg-slate-50">
                    <Phone size={16} /> Cuộc gọi
                  </button>
                  <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto bg-white p-6 md:p-8 custom-scrollbar">

                {/* TOP HEADER: TITLE / NAME */}
                {/* TOP HEADER: TITLE / NAME */}
                <div className="mb-6">
                  <label className="block text-slate-700 text-sm font-bold mb-2">Mô tả / Tên khách hàng <span className="text-red-500">*</span></label>
                  <div className="flex gap-3">
                    <select
                      className="w-28 px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none bg-white font-medium text-slate-700"
                      value={newLeadData.title}
                      onChange={e => setNewLeadData({ ...newLeadData, title: e.target.value })}
                    >
                      <option value="">Danh xưng</option>
                      {LEAD_RELATION_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                      {false && (
                        <>
                      <option value="">Danh xưng</option>
                      <option value="Mr.">Anh</option>
                      <option value="Ms.">Chị</option>
                      <option value="Phụ huynh">Phụ huynh</option>
                      <option value="Học sinh">Học sinh</option>
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
                      <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Quốc gia mục tiêu <span className="text-red-500">*</span></label>
                      <select
                        className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none bg-white text-slate-700"
                        value={newLeadData.targetCountry}
                        onChange={e => setNewLeadData({ ...newLeadData, targetCountry: e.target.value })}
                      >
                        <option value="">-- Chọn quốc gia mục tiêu --</option>
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

                      </>
                    )}

                    {/* Address Group */}
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

                    {/* Product */}
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
                      <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Cơ sở</label>
                      <select
                        className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none bg-white text-slate-700"
                        value={newLeadData.market}
                        onChange={e => setNewLeadData({ ...newLeadData, market: e.target.value })}
                      >
                        <option value="">-- Chọn cơ sở --</option>
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

                      </>
                    )}
                  </div>

                  {/* RIGHT COL */}
                  <div className="space-y-4">
                    {/* Phone */}
                    <div className="flex items-center gap-4">
                      <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Điện thoại <span className="text-red-500">*</span></label>
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

                    {/* Status */}
                    <div className="flex items-center gap-4">
                      <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Trạng thái</label>
                      <select
                        className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none bg-white text-slate-700"
                        value={newLeadData.status}
                        onChange={e => setNewLeadData({ ...newLeadData, status: e.target.value })}
                      >
                        <option value={LeadStatus.NEW}>Mới</option>
                        <option value={LeadStatus.CONTACTED}>Đã liên hệ</option>
                        <option value={LeadStatus.QUALIFIED}>Tiềm năng</option>
                        <option value={DealStage.LOST}>Thất bại</option>
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

                {/* TABS SECTION */}
                <div className="mt-8 border-t border-slate-200 pt-4">
                  <div className="flex border-b border-slate-200 mb-4">
                    <button
                      onClick={() => setCreateModalActiveTab('notes')}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${createModalActiveTab === 'notes' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                      Ghi chú nội bộ
                    </button>
                    <button
                      onClick={() => setCreateModalActiveTab('student')}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${createModalActiveTab === 'student' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                      Thông tin học sinh
                    </button>
                    <button
                      onClick={() => setCreateModalActiveTab('extra')}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${createModalActiveTab === 'extra' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                      Thông tin thêm (Marketing)
                    </button>
                  </div>

                  {/* Fixed Height Container to prevent layout jump */}
                  <div className="min-h-[200px]">
                    {/* TAB: NOTES */}
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

                    {createModalActiveTab === 'student' && (
                      <LeadStudentInfoTab data={newLeadData} onPatch={patchNewLeadData} />
                    )}

                    {/* TAB: EXTRA */}
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
                <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg">Hủy bỏ</button>
                <button onClick={handleCreateSubmit} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center gap-2 shadow-sm"><Save size={18} /> Lưu Lead mới</button>
              </div>
            </div>
          </div>
        )}

        {/* ASSIGN MODAL */}
        {showAssignModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAssignModal(false)}></div>
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
              <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <UserPlus size={20} className="text-blue-600" />
                  Phân bổ Lead
                </h3>
                <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
              </div>

              <div className="p-6 space-y-6">
                <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 flex gap-2 items-start border border-blue-100">
                  <Users size={18} className="mt-0.5 shrink-0" />
                  <p>Bạn đang phân bổ <span className="font-bold">{selectedLeadIds.length}</span> lead cho nhân viên kinh doanh.</p>
                </div>

                <div className="animate-in slide-in-from-top-2">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Chọn nhân viên</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar border border-slate-200 rounded-lg p-2">
                    {SALES_REPS.map(rep => (
                      <div
                        key={rep.id}
                        onClick={() => setSelectedRep(rep.id)}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${selectedRep === rep.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50 border border-transparent'}`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${rep.color}`}>
                          {rep.avatar}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900">{rep.name}</p>
                          <p className="text-xs text-slate-500">{rep.team}</p>
                        </div>
                        {selectedRep === rep.id && <CheckCircle2 size={18} className="text-blue-600" />}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
                <button onClick={() => setShowAssignModal(false)} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-lg text-sm">Hủy</button>
                <button
                  onClick={handleAssignSubmit}
                  className="px-6 py-2 text-white font-bold rounded-lg shadow-sm text-sm transition-all bg-blue-600 hover:bg-blue-700"
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
                  <h2 className="text-xl font-bold text-slate-900">Nhập dữ liệu Lead từ Excel</h2>
                  <p className="text-slate-500 text-sm mt-1">Hỗ trợ định dạng .xlsx, .csv</p>
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
                    <span className="text-xs font-bold">Ghép & Phân bổ</span>
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
                    <div className="w-full h-64 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center bg-white hover:bg-blue-50 hover:border-blue-400 transition-all cursor-pointer relative group">
                      <input type="file" accept=".csv, .xlsx, .xls" onChange={handleFileSelect} className="absolute inset-0 opacity-0 cursor-pointer" />
                      <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <UploadCloud size={32} />
                      </div>
                      <p className="text-lg font-bold text-slate-700">Kéo thả hoặc chọn tệp tin</p>
                      <p className="text-sm text-slate-500 mt-2">Hỗ trợ .CSV, .XLSX (Tối đa 5MB)</p>
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
                        <span>Kết quả kiểm tra dữ liệu</span>
                        <div className="flex gap-2">
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-bold">Hợp lệ: {validImportRows.length}</span>
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-bold">Lỗi: {importErrors.length}</span>
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto p-0 custom-scrollbar relative">
                        {importErrors.length === 0 && validImportRows.length > 0 && (
                          <div className="flex flex-col items-center justify-center h-full text-slate-500 p-8 text-center">
                            <CheckCircle size={48} className="text-green-500 mb-4" />
                            <p className="font-bold text-lg text-slate-800">Tất cả dữ liệu hợp lệ!</p>
                            <p className="text-sm">File của bạn đã sẵn sàng để nhập vào hệ thống.</p>
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
                          <span>Hệ thống sẽ chỉ nhập các dòng hợp lệ ({validImportRows.length} dòng). Các dòng lỗi sẽ bị bỏ qua.</span>
                        </div>
                      )}
                    </div>

                    {/* RIGHT: CONFIG */}
                    <div className="col-span-5 flex flex-col gap-6">
                      {/* Allocation Config */}
                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 h-full">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Users size={18} className="text-blue-600" /> Cấu hình phân bổ</h3>

                        <div className="space-y-4">
                          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                            <p className="text-sm font-bold text-slate-800 mb-1">Chế độ phân bổ từ Admin</p>
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border ${systemDistributionMode === 'auto'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                                }`}>
                                {systemDistributionMode === 'auto' ? 'Tự động' : 'Thủ công'}
                              </span>
                              <span className="text-xs text-slate-500">
                                Cấu hình tại Admin &gt; Quy tắc tự động hóa.
                              </span>
                            </div>
                          </div>

                          {systemDistributionMode === 'auto' ? (
                            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                              Lead hợp lệ sau import sẽ được tự động chia ngay theo vòng tròn cho đội Sales.
                              Không cần thao tác chọn/chia thủ công.
                            </div>
                          ) : (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                              Chế độ thủ công đang bật: lead hợp lệ sẽ được nhập vào hệ thống nhưng chưa phân bổ.
                              Admin/Leader sẽ phân công sau.
                            </div>
                          )}
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
                      <h3 className="text-2xl font-bold text-slate-900">Sẵn sàng nhập liệu!</h3>
                      <p className="text-slate-500 mt-2">Vui lòng kiểm tra thông tin lần cuối trước khi nhập vào hệ thống.</p>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 space-y-6">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Tên đợt nhập liệu (Import Batch Name)</label>
                        <input
                          className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 font-medium focus:border-blue-500 outline-none bg-slate-50"
                          value={importBatchName}
                          onChange={(e) => setImportBatchName(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Thẻ phân loại bổ sung (Tags)</label>
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
                    Tiếp tục & Review <ArrowRight size={18} />
                  </button>
                ) : (
                  <button
                    onClick={handleImportSubmit}
                    className="px-8 py-2.5 bg-green-600 text-white rounded-lg font-bold shadow-lg shadow-green-200 transition-all flex items-center gap-2 hover:bg-green-700 hover:scale-105"
                  >
                    <CheckCircle size={18} /> Xác nhận Nhập (Import)
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
                  Danh sách Lead trùng Số điện thoại
                </h3>
                <button onClick={() => setShowDuplicateModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {duplicateGroups.length === 0 ? (
                  <div className="text-center py-10">
                    <CheckCircle size={48} className="mx-auto text-green-500 mb-4 opacity-20" />
                    <p className="text-slate-500">Tuyệt vời! Không tìm thấy Lead nào bị trùng SĐT.</p>
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
                            <p className="font-bold text-slate-900 group-hover:text-blue-700">SĐT: {group.phone}</p>
                            <p className="text-sm text-slate-500">{group.leads.length} bản ghi bị trùng</p>
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
                    So sánh Lead trùng: {selectedDuplicateGroup.phone}
                  </h3>
                  <p className="text-sm text-slate-500">Xem và so sánh thông tin giữa các bản ghi để quyết định xử lý.</p>
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
                            {normalizeLeadStatus(lead.status as string)}
                          </span>
                        </div>
                        <button
                          onClick={() => { setSelectedLead(lead); setSelectedDuplicateGroup(null); setShowDuplicateModal(false); }}
                          className="p-1.5 bg-white border border-slate-200 rounded text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                          title="Chỉnh sửa Lead này"
                        >
                          <Eye size={16} />
                        </button>
                      </div>

                      <div className="p-3 space-y-3 text-sm flex-1">
                        <section>
                          <p className="text-[9px] font-bold text-slate-400 uppercase mb-1 tracking-widest">Thông tin cơ bản</p>
                          <div className="space-y-1 bg-slate-50 p-2 rounded-md border border-slate-100">
                            <div className="flex justify-between"><span className="text-slate-500 text-xs">SĐT:</span> <span className="font-bold text-slate-900">{lead.phone}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500 text-xs">Email:</span> <span className="font-medium text-slate-700 truncate max-w-[150px]" title={lead.email}>{lead.email || '-'}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500 text-xs">Cơ sở:</span> <span className="font-medium text-slate-700">{lead.company || '-'}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500 text-xs">D.xưng:</span> <span className="font-medium text-slate-700">{(lead as any).title || '-'}</span></div>
                          </div>
                        </section>

                        <section>
                          <p className="text-[9px] font-bold text-slate-400 uppercase mb-1 tracking-widest">Marketing & Nguồn</p>
                          <div className="space-y-1 bg-slate-50 p-2 rounded-md border border-slate-100">
                            <div className="flex justify-between"><span className="text-slate-500 text-xs">Nguồn:</span> <span className="font-medium text-slate-700">{lead.source || '-'}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500 text-xs">Chiến dịch:</span> <span className="font-medium text-slate-700">{lead.marketingData?.campaign || '-'}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500 text-xs">Ng.giới thiệu:</span> <span className="font-medium text-slate-700">{(lead as any).referredBy || '-'}</span></div>
                            <div className="flex justify-between items-start"><span className="text-slate-500 text-xs">Tags:</span> <div className="flex flex-wrap gap-1 justify-end">{lead.marketingData?.tags?.length ? lead.marketingData.tags.map((t: string) => <span key={t} className="bg-white border text-[9px] px-1 rounded-sm">{t}</span>) : '-'}</div></div>
                          </div>
                        </section>

                        <section>
                          <p className="text-[9px] font-bold text-slate-400 uppercase mb-1 tracking-widest">Lịch sử & Phụ trách</p>
                          <div className="space-y-1 bg-slate-50 p-2 rounded-md border border-slate-100">
                            <div className="flex justify-between"><span className="text-slate-500 text-xs">Ngày tạo:</span> <span className="font-medium text-slate-700">{new Date(lead.createdAt).toLocaleDateString('vi-VN')}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500 text-xs">Phụ trách:</span> <span className="font-bold text-blue-600">{SALES_REPS.find(r => r.id === lead.ownerId)?.name || 'Chưa phân'}</span></div>
                          </div>
                        </section>

                        <section>
                          <p className="text-[9px] font-bold text-slate-400 uppercase mb-1 tracking-widest">Ghi chú</p>
                          <div className="bg-slate-50 p-2 rounded-md border border-slate-100 text-[11px] text-slate-600 min-h-[50px] leading-relaxed">
                            {lead.notes || 'Không có ghi chú.'}
                          </div>
                        </section>
                      </div>

                      <div className="p-3 border-t border-slate-50 bg-slate-50/30 flex gap-2">
                        <button
                          onClick={() => { if (confirm("Xóa bản ghi trùng này?")) { const filtered = leads.filter(l => l.id !== lead.id); setLeads(filtered); saveLeads(filtered); setSelectedDuplicateGroup((prev: any) => ({ ...prev!, leads: prev!.leads.filter((l: any) => l.id !== lead.id) })); } }}
                          className="flex-1 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded text-[11px] font-bold transition-all uppercase"
                        >
                          Xóa
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
              <h3 className="text-lg font-bold text-red-600 flex items-center gap-2"><Ban size={20} /> Xác nhận thất bại</h3>
              <button
                onClick={() => { setShowLossModal(false); setLossModalLeadIds([]); setLossReason(''); setCustomLossReason(''); }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <p className="text-sm text-slate-600 mb-4">
                Bạn đang đánh dấu <strong>{lossModalLeadIds.length}</strong> lead là thất bại.
                Vui lòng chọn lý do để hệ thống ghi nhận:
              </p>

              <select
                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm mb-4 bg-white font-bold outline-none focus:ring-2 focus:ring-blue-500"
                value={lossReason}
                onChange={e => setLossReason(e.target.value)}
              >
                <option value="">-- Chọn lý do --</option>
                {lostReasonsList.map(reason => (
                  <option key={reason} value={reason}>{reason}</option>
                ))}
              </select>

              {lossReason === 'Lý do khác' && (
                <textarea
                  className="w-full p-3 border border-slate-300 rounded-lg text-sm mb-4 h-24 outline-none focus:ring-2 focus:ring-blue-500 animate-in slide-in-from-top-2"
                  placeholder="Vui lòng nhập lý do cụ thể..."
                  value={customLossReason}
                  onChange={e => setCustomLossReason(e.target.value)}
                ></textarea>
              )}

              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg border border-red-100 text-xs italic">
                <AlertTriangle size={14} className="shrink-0" />
                <span>Hành động này sẽ cập nhật trạng thái của lead sang <strong>LOST</strong>.</span>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 text-sm">
              <button
                onClick={() => { setShowLossModal(false); setLossModalLeadIds([]); setLossReason(''); setCustomLossReason(''); }}
                className="px-5 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmLoss}
                className="px-5 py-2 font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-lg shadow-red-200 transition-all font-bold"
              >
                Xác nhận LOST
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



