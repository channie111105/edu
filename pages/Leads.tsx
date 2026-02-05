
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ILead, LeadStatus, UserRole, IDeal, DealStage } from '../types';
import SLABadge from '../components/SLABadge';
import UnifiedLeadDrawer from '../components/UnifiedLeadDrawer';
import LeadPivotTable from '../components/LeadPivotTable'; // Import Pivot Component
import SmartSearchBar, { SearchFilter } from '../components/SmartSearchBar';
import { useAuth } from '../contexts/AuthContext';
import { getLeads, saveLead, saveLeads, addDeal, addContact, deleteLead, convertLeadToContact } from '../utils/storage';
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
  Shuffle,
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
  BarChart2
} from 'lucide-react';
import { read, utils, write } from 'xlsx';

const Leads: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // State: Load from LocalStorage
  const [activeTab, setActiveTab] = useState<'all' | 'new' | 'converted' | 'unconverted' | 'sla_risk'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'pivot'>('list'); // View Mode State
  const [leads, setLeads] = useState<ILead[]>([]);
  const [searchFilters, setSearchFilters] = useState<SearchFilter[]>([]);

  // Drawer State
  const [selectedLead, setSelectedLead] = useState<ILead | null>(null);

  // Selection & Assignment State
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignMethod, setAssignMethod] = useState<'auto' | 'manual'>('auto');
  const [selectedRep, setSelectedRep] = useState('');

  // Tab state for Create Modal (Odoo Style)
  const [createModalActiveTab, setCreateModalActiveTab] = useState<'notes' | 'extra'>('notes');

  // Auto Distribution (Store quantities)
  const [distribution, setDistribution] = useState<Record<string, number>>({});

  // Mock Sales Reps
  const SALES_REPS = [
    { id: 'u2', name: 'Sarah Miller', team: 'Team Đức', avatar: 'SM', color: 'bg-purple-100 text-purple-700' },
    { id: 'u3', name: 'David Clark', team: 'Team Trung', avatar: 'DC', color: 'bg-blue-100 text-blue-700' },
    { id: 'u4', name: 'Alex Rivera', team: 'Team Du học', avatar: 'AR', color: 'bg-green-100 text-green-700' },
  ];



  // Load data
  useEffect(() => {
    setLeads(getLeads());
  }, []);

  // Initialize distribution with equal quantities
  useEffect(() => {
    if (showAssignModal && selectedLeadIds.length > 0) {
      const count = selectedLeadIds.length;
      const repCount = SALES_REPS.length;
      const base = Math.floor(count / repCount);
      const remainder = count % repCount;

      const newDist: Record<string, number> = {};
      SALES_REPS.forEach((rep, index) => {
        newDist[rep.id] = base + (index < remainder ? 1 : 0);
      });
      setDistribution(newDist);
    }
  }, [showAssignModal, selectedLeadIds.length]);

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLeadData, setNewLeadData] = useState({
    name: '', phone: '', email: '', source: 'hotline', program: 'Tiếng Đức', notes: '',
    title: '', company: '', province: '', city: '', ward: '', street: '', salesperson: '', campaign: '', tags: '', referredBy: '',
    product: '', market: '', medium: '', status: 'NEW'
  });
  const [duplicateWarning, setDuplicateWarning] = useState<ILead | null>(null);
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<'notes' | 'extra'>('notes');


  // Edit Lead Modal State
  const [editLeadData, setEditLeadData] = useState({
    name: '', phone: '', email: '', source: '', program: '', notes: '',
    title: '', company: '', province: '', city: '', ward: '', street: '', salesperson: '', campaign: '', tags: '', referredBy: '',
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
        tags: (selectedLead.marketingData?.tags || []).join(', '),
        referredBy: (selectedLead as any).referredBy || '',
        product: '',
        market: '',
        medium: '',
        status: selectedLead.status
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
    'opportunity', 'contact', 'email', 'phone', 'nextActivity', 'deadline', 'value', 'status', 'salesperson', 'company', 'source', 'campaign', 'tags'
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
      status: editLeadData.status as any,
      marketingData: {
        ...selectedLead.marketingData,
        campaign: editLeadData.campaign,
        tags: editLeadData.tags ? editLeadData.tags.split(',').map(t => t.trim()).filter(Boolean) : (selectedLead.marketingData?.tags || []),
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
  const [showDataEvaluation, setShowDataEvaluation] = useState(false);

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

  // Re-use allocation state for Import
  const [importAssignMethod, setImportAssignMethod] = useState<'round-robin' | 'manual'>('round-robin');
  const [importDistribution, setImportDistribution] = useState<Record<string, number>>({});
  const [importManualOwnerId, setImportManualOwnerId] = useState<string>('');

  // Auto-calculate distribution when valid rows change
  useEffect(() => {
    if (validImportRows.length > 0 && importAssignMethod === 'round-robin') {
      // Default to all reps initially if empty? Or just use SALES_REPS global
      const activeReps = SALES_REPS;
      const totalLeads = validImportRows.length;
      const baseCount = Math.floor(totalLeads / activeReps.length);
      const remainder = totalLeads % activeReps.length;

      const newDist: Record<string, number> = {};
      activeReps.forEach((rep, index) => {
        newDist[rep.id] = baseCount + (index < remainder ? 1 : 0);
      });
      setImportDistribution(newDist);
    }
  }, [validImportRows.length, importAssignMethod]);

  const currentImportDistTotal = Object.values(importDistribution).reduce((a, b) => a + b, 0);
  const isImportDistValid = currentImportDistTotal === validImportRows.length;

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

    // 3. Assign Owners based on Distribution
    let leadIndex = 0;

    // Normalize data structure first
    assignedLeads = validImportRows.map((row) => {
      return {
        id: `l-import-${Date.now()}-${leadIndex}-${Math.random().toString(36).substr(2, 9)}`,
        name: row.name,
        phone: row.phone,
        email: row.email,
        company: row.company,
        source: row.source,
        program: row.program,
        status: 'NEW',
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

    if (importAssignMethod === 'round-robin') {
      // Validate total
      const totalDistributed = Object.values(importDistribution).reduce((a, b) => a + b, 0);
      if (totalDistributed !== assignedLeads.length) {
        alert(`Tổng số lượng phân bổ (${totalDistributed}) không khớp với số Lead (${assignedLeads.length})`);
        return;
      }

      Object.entries(importDistribution).forEach(([repId, count]) => {
        for (let i = 0; i < count; i++) {
          if (leadIndex < assignedLeads.length) {
            assignedLeads[leadIndex].ownerId = repId;
            leadIndex++;
          }
        }
      });
    } else if (importAssignMethod === 'manual') {
      if (importManualOwnerId) {
        assignedLeads.forEach(l => l.ownerId = importManualOwnerId);
      }
    }

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
      if (activeTab === 'new' || activeTab === 'unconverted') {
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
      result = result.filter(l => !['WON', 'LOST', 'Mất', 'Đạt'].includes(l.status as string));
    }

    if (status.length > 0) {
      // Simple string matching for status filter
      result = result.filter(l => status.includes(l.status));
    }

    if (createdDate) {
      result = result.filter(l => isDateMatch(l.createdAt, createdDate));
    }
    if (closedDate) {
      // @ts-ignore
      result = result.filter(l => isDateMatch(l.closedAt || l.updatedAt, closedDate));
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
              lead.status,
              lead.ownerId || '',
              (lead as any).city || '',
              (lead as any).company || ''
            ].join(' ').toLowerCase();
            return searchableText.includes(value);
          }
          // Generic field match
          const leadValue = (lead as any)[filter.field];
          return String(leadValue || '').toLowerCase() === value;
        });
      });
    }

    // 4. Tab Specific Status Filtering (Preserving original bottom logic)
    switch (activeTab) {
      case 'new':
        // If we already filtered by unassigned above (for new/unconverted), we might not need strict status check,
        // but let's keep it if consistent.
        return result.filter(l => l.status === LeadStatus.NEW || !l.status);
      case 'converted':
        return result.filter(l => ([LeadStatus.QUALIFIED, LeadStatus.CONTACTED] as string[]).includes(l.status));
      case 'unconverted':
        return result.filter(l => ([LeadStatus.DISQUALIFIED, LeadStatus.NEW] as string[]).includes(l.status));
      case 'sla_risk':
        return result.filter(l => l.slaStatus === 'danger');
      default:
        return result;
    }
  }, [leads, activeTab, searchFilters, canViewAll, user, advancedFilters]);

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

      const computedValue = lead.value || (lead.productItems || []).reduce((sum, item) => {
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

  const checkDuplicate = (phone: string) => {
    setIsCheckingPhone(true);
    // Remove setTimeout for instant check
    const exists = leads.find(l => l.phone === phone);
    if (exists) {
      setDuplicateWarning(exists);
    } else {
      setDuplicateWarning(null);
    }
    setIsCheckingPhone(false);
  };

  const handleCreateSubmit = () => {
    if (!newLeadData.name || !newLeadData.phone) {
      alert("Vui lòng nhập Tên và SĐT");
      return;
    }
    if (!newLeadData.company) {
      alert("Vui lòng chọn Cơ sở / Company Base");
      return;
    }

    // Double-check for duplicate phone number (safety net)
    const existingLead = leads.find(l => l.phone === newLeadData.phone);
    if (existingLead) {
      alert(`⚠️ Số điện thoại này đã tồn tại trong hệ thống!\n\nLead hiện có:\n- Tên: ${existingLead.name}\n- Trạng thái: ${existingLead.status}\n- Người phụ trách: ${SALES_REPS.find(r => r.id === existingLead.ownerId)?.name || 'Chưa phân'}\n\nVui lòng kiểm tra lại hoặc cập nhật Lead cũ thay vì tạo mới.`);
      // Also update the warning state
      setDuplicateWarning(existingLead);
      return;
    }

    const newLead: ILead = {
      id: `l-${Date.now()}`,
      ...newLeadData,
      program: newLeadData.program as any,
      ownerId: newLeadData.salesperson,
      marketingData: {
        tags: newLeadData.tags ? [newLeadData.tags] : [],
        campaign: newLeadData.campaign,
        medium: newLeadData.medium,
        market: newLeadData.market
      },
      status: newLeadData.status as any,
      createdAt: new Date().toISOString(),
      score: 10,
      lastActivityDate: new Date().toISOString(),
      lastInteraction: new Date().toISOString(),
      slaStatus: 'normal'
    };
    if (saveLead(newLead)) {
      setLeads([newLead, ...leads]);
      setShowCreateModal(false);
      setNewLeadData({
        name: '', phone: '', email: '', source: 'hotline', program: 'Tiếng Đức', notes: '',
        title: '', company: '', province: '', city: '', ward: '', street: '', salesperson: '', campaign: '', tags: '', referredBy: '',
        product: '', market: '', medium: '', status: 'NEW'
      });
      setDuplicateWarning(null); // Reset duplicate warning
      alert("Tạo Lead thành công!");
    } else {
      alert("Có lỗi xảy ra khi lưu Lead");
    }
  };

  const handleAssignSubmit = () => {
    let updatedLeads = [...leads];
    if (assignMethod === 'manual') {
      if (!selectedRep) {
        alert("Vui lòng chọn nhân viên Sale");
        return;
      }
      updatedLeads = updatedLeads.map(l =>
        selectedLeadIds.includes(l.id) ? { ...l, ownerId: selectedRep, status: LeadStatus.CONTACTED } : l
      );
    } else {
      // Validate total quantity
      const totalDistributed = Object.values(distribution).reduce((a, b) => a + b, 0);
      if (totalDistributed !== selectedLeadIds.length) {
        alert(`Tổng số lượng phân bổ (${totalDistributed}) không khớp với số Lead đã chọn (${selectedLeadIds.length})`);
        return;
      }

      let leadIndex = 0;
      Object.entries(distribution).forEach(([repId, count]) => {
        for (let i = 0; i < count; i++) {
          if (leadIndex < selectedLeadIds.length) {
            const leadId = selectedLeadIds[leadIndex];
            const leadToUpdateIndex = updatedLeads.findIndex(l => l.id === leadId);
            if (leadToUpdateIndex !== -1) {
              updatedLeads[leadToUpdateIndex] = { ...updatedLeads[leadToUpdateIndex], ownerId: repId, status: LeadStatus.CONTACTED };
            }
            leadIndex++;
          }
        }
      });
    }
    saveLeads(updatedLeads);
    setLeads(updatedLeads);
    setShowAssignModal(false);
    setSelectedLeadIds([]);
    alert(`Đã phân bổ thành công ${selectedLeadIds.length} lead!`);
  };

  const updateDistribution = (repId: string, val: number) => {
    // 1. Validate: Negative check
    if (val < 0) return;

    // 2. Prepare data
    const totalLeads = selectedLeadIds.length;
    let newValue = val;
    // Cap at total
    if (newValue > totalLeads) newValue = totalLeads;

    const currentDist = { ...distribution };
    const oldValue = currentDist[repId] || 0;
    const diff = newValue - oldValue;

    if (diff === 0) return;

    // Update target
    currentDist[repId] = newValue;

    // 3. Balance the difference
    const otherRepIds = SALES_REPS.map(r => r.id).filter(id => id !== repId);
    let remaining = Math.abs(diff);

    if (diff > 0) {
      // INCREASE: Must SUBTRACT from others
      for (const otherId of otherRepIds) {
        if (remaining === 0) break;
        const otherVal = currentDist[otherId] || 0;
        if (otherVal > 0) {
          const deduct = Math.min(otherVal, remaining);
          currentDist[otherId] -= deduct;
          remaining -= deduct;
        }
      }
      // If still remaining (cannot borrow from anyone), revert the increase
      if (remaining > 0) {
        currentDist[repId] -= remaining;
      }
    } else {
      // DECREASE: Must ADD to others (to keep Total constant)
      // We pour the excess into the first available other rep
      for (const otherId of otherRepIds) {
        if (remaining === 0) break;
        currentDist[otherId] += remaining;
        remaining = 0; // Filled all into one.
      }
    }

    setDistribution(currentDist);
  };

  const currentDistTotal = Object.values(distribution).reduce((a, b) => a + b, 0);
  const isDistValid = currentDistTotal === selectedLeadIds.length;

  // --- BULK ACTIONS ---
  const handleBulkDelete = () => {
    if (confirm(`Bạn có chắc muốn xóa ${selectedLeadIds.length} lead đã chọn?`)) {
      const remainingLeads = leads.filter(l => !selectedLeadIds.includes(l.id));
      setLeads(remainingLeads);
      saveLeads(remainingLeads);
      setSelectedLeadIds([]);
    }
  };

  const handleBulkMarkLost = () => {
    if (confirm(`Đánh dấu ${selectedLeadIds.length} lead là Thất bại (Lost)?`)) {
      const updatedLeads = leads.map(l =>
        selectedLeadIds.includes(l.id) ? { ...l, status: DealStage.LOST } : l
      );
      setLeads(updatedLeads);
      saveLeads(updatedLeads);
      setSelectedLeadIds([]);
    }
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
      'Trạng thái': l.status
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
    const updatedLead = { ...lead, ownerId: user?.id, status: LeadStatus.CONTACTED };
    handleUpdateLead(updatedLead);
    alert(`Đã tiếp nhận lead: ${lead.name}`);
  };

  const handleQuickMarkLost = (e: React.MouseEvent, lead: ILead) => {
    e.stopPropagation();
    if (confirm("Đánh dấu Lead này là thất bại?")) {
      handleUpdateLead({ ...lead, status: DealStage.LOST });
    }
  };


  return (
    <>
      {showDataEvaluation ? (
        <div className="p-6 max-w-[1600px] mx-auto min-h-screen font-inter bg-slate-50 text-slate-900 animate-in slide-in-from-right-4 fade-in duration-300">
          {/* New Header with Back Button */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <button onClick={() => setShowDataEvaluation(false)} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors mb-1 font-semibold group">
                <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> Quay lại
              </button>
              <h1 className="text-2xl font-bold text-slate-900">Đánh giá Hiệu quả Nguồn Data</h1>
              <p className="text-slate-500 text-sm mt-1">Theo dõi chất lượng từng đợt tuyển sinh để tối ưu chi phí Marketing.</p>
            </div>
            <div className="flex gap-3">
              <button className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50 flex items-center gap-2 shadow-sm"><Filter size={16} /> Bộ lọc</button>
              <button onClick={() => { setShowDataEvaluation(false); setShowImportModal(true); }} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-200"><FileSpreadsheet size={18} /> Nhập đợt Data mới</button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600"><Database size={24} /></div>
              <div>
                <p className="text-slate-500 text-xs font-bold uppercase">Tổng Data đã nhập</p>
                <p className="text-2xl font-bold text-slate-900">3.200</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-600"><CheckCircle size={24} /></div>
              <div>
                <p className="text-slate-500 text-xs font-bold uppercase">SĐT Liên lạc được</p>
                <p className="text-2xl font-bold text-slate-900">81%</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600"><GraduationCap size={24} /></div>
              <div>
                <p className="text-slate-500 text-xs font-bold uppercase">Tỷ lệ quan tâm học</p>
                <p className="text-2xl font-bold text-slate-900">24%</p>
              </div>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-xs uppercase">
                <tr>
                  <th className="p-4 pl-6">Tên đợt / Nguồn Data</th>
                  <th className="p-4">Ngày nhập</th>
                  <th className="p-4">Tổng SĐT</th>
                  <th className="p-4">Chất lượng SĐT</th>
                  <th className="p-4">Kết quả tuyển sinh</th>
                  <th className="p-4">Đánh giá nguồn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {DATA_EVALUATIONS.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 pl-6">
                      <p className="font-bold text-slate-900">{item.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium">{item.source}</span>
                        <span className="text-xs text-slate-400">{item.code}</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-600">
                      <div className="flex items-center gap-2"><Calendar size={14} /> {item.date}</div>
                      <p className="text-xs text-slate-400 mt-1">Bởi: {item.importer}</p>
                    </td>
                    <td className="p-4 font-bold text-slate-900">{item.total} <span className="text-xs font-normal text-slate-500 block">records</span></td>
                    <td className="p-4">
                      <p className={`font-bold ${parseFloat(item.match) > 90 ? 'text-green-600' : parseFloat(item.match) < 50 ? 'text-red-500' : 'text-slate-700'}`}>{item.match} <span className="text-slate-500 font-normal">Khả dụng</span></p>
                      <div className="w-24 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                        <div style={{ width: item.match }} className={`h-full ${parseFloat(item.match) > 90 ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{item.valid} SĐT đúng</p>
                    </td>
                    <td className="p-4 space-y-1">
                      <div className="flex justify-between text-xs text-slate-600"><span>Quan tâm ({item.interestedCount})</span> <span className="font-bold">{item.interested}</span></div>
                      <div className="flex justify-between text-xs text-green-700"><span>Nhập học ({item.enrolledCount})</span> <span className="font-bold">{item.enrolled}</span></div>
                    </td>
                    <td className="p-4">
                      {item.eval === 'good' && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded text-xs font-bold"><ThumbsUp size={12} /> {item.evalText}</span>
                      )}
                      {item.eval === 'bad' && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 border border-red-200 rounded text-xs font-bold"><ThumbsDown size={12} /> {item.evalText}</span>
                      )}
                      {item.eval === 'warning' && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded text-xs font-bold"><AlertTriangle size={12} /> {item.evalText}</span>
                      )}
                      <p className="text-xs text-slate-400 mt-1 italic">{item.note}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-6 max-w-[1600px] mx-auto min-h-screen font-inter bg-slate-50 text-slate-900">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">Cơ hội (Leads)</h1>
              <p className="text-slate-500 text-sm mt-1">Quản lý Lead đầu vào và phân bổ cho đội Sales</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowDataEvaluation(true)} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50 flex items-center gap-2 shadow-sm transition-all hover:border-blue-300 hover:text-blue-600 group">
                <BarChart2 size={16} className="text-slate-400 group-hover:text-blue-600" /> Đánh giá hiệu quả
              </button>
              <button onClick={() => setShowImportModal(true)} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50 flex items-center gap-2 shadow-sm transition-all hover:border-blue-300 hover:text-blue-600"><FileSpreadsheet size={16} /> Import Excel</button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-200 transition-all"
              >
                <Plus size={18} strokeWidth={3} /> Thêm Lead
              </button>
            </div>
          </div>

          {/* Tabs & Filter */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6">
            <div className="flex items-center border-b border-slate-100 px-4">
              {['all', 'new', 'sla_risk', 'converted', 'unconverted'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`px-4 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === tab ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                  {tab === 'all' && 'Tất cả'}
                  {tab === 'new' && 'Lead Mới'}
                  {tab === 'sla_risk' && <span className="flex items-center gap-2">SLA Rủi ro <AlertTriangle size={14} className="text-red-500" /></span>}
                  {tab === 'converted' && 'Đã chuyển đổi'}
                  {tab === 'unconverted' && 'Chưa chuyển đổi'}
                </button>
              ))}
            </div>
            <div className="p-4 flex gap-4 items-center">
              <SmartSearchBar
                filters={searchFilters}
                onAddFilter={(filter) => setSearchFilters([...searchFilters, filter])}
                onRemoveFilter={(index) => setSearchFilters(searchFilters.filter((_, i) => i !== index))}
                onClearAll={() => setSearchFilters([])}
                placeholder="Tìm kiếm..."
              />

              {/* View Switcher */}
              <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button onClick={() => setViewMode('list')} className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`} title="Dạng Danh sách"><ListIcon size={16} /></button>
                <button onClick={() => setViewMode('pivot')} className={`p-1.5 rounded ${viewMode === 'pivot' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`} title="Báo cáo Pivot"><LayoutGrid size={16} /></button>
              </div>


              <div className="relative">
                <button
                  onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                  className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 text-slate-600 bg-white"
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

              {selectedLeadIds.length > 0 && (
                <div className="ml-auto flex items-center gap-3 animate-in slide-in-from-right-4 fade-in duration-300">
                  <span className="text-sm font-semibold text-slate-600">Đã chọn <span className="text-blue-600 font-bold">{selectedLeadIds.length}</span> lead</span>

                  <button onClick={handleBulkMarkLost} className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Đánh dấu thất bại">
                    <XCircle size={18} />
                  </button>
                  <button onClick={() => alert("Chức năng chuyển đổi hàng loạt đang phát triển")} className="p-2 text-slate-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg" title="Chuyển đổi">
                    <Shuffle size={18} />
                  </button>
                  <button onClick={handleBulkDelete} className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Xóa">
                    <Trash2 size={18} />
                  </button>
                  <button onClick={handleBulkExport} className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Xuất Excel">
                    <Download size={18} />
                  </button>

                  <div className="h-6 w-px bg-slate-300 mx-1"></div>

                  <button
                    onClick={() => setShowAssignModal(true)}
                    className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-bold hover:bg-blue-200 flex items-center gap-2"
                  >
                    <UserPlus size={16} /> Phân bổ
                  </button>
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
                      <th className="p-3 w-10 text-center border-b border-slate-200"><input type="checkbox" className="rounded border-slate-300" onChange={handleSelectAll} checked={selectedLeadIds.length === filteredLeads.length && filteredLeads.length > 0} /></th>
                      {visibleColumns.includes('opportunity') && <th className="p-3 border-b border-slate-200 min-w-[200px]">Cơ hội</th>}
                      {visibleColumns.includes('company') && <th className="p-3 border-b border-slate-200">Cơ sở / Công ty</th>}
                      {visibleColumns.includes('contact') && <th className="p-3 border-b border-slate-200">Tên liên hệ</th>}
                      {visibleColumns.includes('title') && <th className="p-3 border-b border-slate-200">Danh xưng</th>}
                      {visibleColumns.includes('email') && <th className="p-3 border-b border-slate-200">Email</th>}
                      {visibleColumns.includes('phone') && <th className="p-3 border-b border-slate-200">SĐT</th>}
                      {visibleColumns.includes('address') && <th className="p-3 border-b border-slate-200">Địa chỉ</th>}
                      {visibleColumns.includes('salesperson') && <th className="p-3 border-b border-slate-200">Sale</th>}
                      {visibleColumns.includes('campaign') && <th className="p-3 border-b border-slate-200">Chiến dịch</th>}
                      {visibleColumns.includes('source') && <th className="p-3 border-b border-slate-200">Nguồn</th>}
                      {visibleColumns.includes('tags') && <th className="p-3 border-b border-slate-200">Tags</th>}
                      {visibleColumns.includes('referredBy') && <th className="p-3 border-b border-slate-200">Người GT</th>}
                      {visibleColumns.includes('notes') && <th className="p-3 border-b border-slate-200">Ghi chú</th>}
                      {visibleColumns.includes('nextActivity') && <th className="p-3 border-b border-slate-200">Hoạt động tiếp theo</th>}
                      {visibleColumns.includes('deadline') && <th className="p-3 border-b border-slate-200">Hạn chót</th>}
                      {visibleColumns.includes('value') && <th className="p-3 border-b border-slate-200 text-right">Doanh thu</th>}
                      {visibleColumns.includes('status') && <th className="p-3 border-b border-slate-200 text-center">Trạng thái</th>}
                      {visibleColumns.includes('sla') && <th className="p-3 border-b border-slate-200 text-left">Cảnh báo SLA</th>}
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

                        return (
                          <tr
                            key={lead.id}
                            className={`hover:bg-blue-50 group cursor-pointer transition-colors ${selectedLeadIds.includes(lead.id) ? 'bg-blue-50' : ''}`}
                            onClick={() => setSelectedLead(lead)}
                          >
                            <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <input type="checkbox" className="rounded border-slate-300" checked={selectedLeadIds.includes(lead.id)} onClick={(e) => handleSelectLeadCheckbox(lead.id, e)} onChange={() => { }} />
                            </td>

                            {visibleColumns.includes('opportunity') && (
                              <td className="p-3">
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-bold text-slate-900 block truncate max-w-[200px]" title={lead.name}>{lead.name}</span>
                                  {lead.program && (
                                    <span
                                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer hover:underline w-fit"
                                      onClick={(e) => handleClickableField(e, 'program', 'Chương trình', lead.program, 'bg-blue-100 text-blue-700')}
                                      title="Click để lọc theo chương trình"
                                    >
                                      {lead.program}
                                    </span>
                                  )}
                                  <span className="text-xs text-slate-500">ID: {lead.id.substring(0, 6)}...</span>
                                </div>
                              </td>
                            )}

                            {visibleColumns.includes('contact') && <td className="p-3 text-sm text-slate-700 font-semibold">{lead.name}</td>}

                            {visibleColumns.includes('company') && <td className="p-3 text-sm text-slate-700">{(lead as any).company || '-'}</td>}

                            {visibleColumns.includes('title') && <td className="p-3 text-sm text-slate-600">{(lead as any).title || '-'}</td>}

                            {visibleColumns.includes('email') && <td className="p-3 text-sm text-slate-600 truncate max-w-[150px]" title={lead.email}>{lead.email || '-'}</td>}

                            {visibleColumns.includes('phone') && (
                              <td className="p-3">
                                <span className="text-sm text-slate-600 font-bold">{lead.phone || '-'}</span>
                              </td>
                            )}

                            {visibleColumns.includes('address') && (
                              <td className="p-3 text-sm text-slate-600 max-w-[150px] truncate" title={`${(lead as any).street || ''}, ${(lead as any).ward || ''}, ${(lead as any).city || ''}`}>
                                {[(lead as any).street, (lead as any).ward, (lead as any).city].filter(Boolean).join(', ') || '-'}
                              </td>
                            )}

                            {visibleColumns.includes('salesperson') && <td className="p-3 text-sm text-slate-600">
                              {SALES_REPS.find(r => r.id === lead.ownerId)?.name || '-'}
                            </td>}

                            {visibleColumns.includes('campaign') && <td className="p-3 text-sm text-slate-600">{(lead as any).campaign || '-'}</td>}

                            {visibleColumns.includes('source') && (
                              <td className="p-3">
                                <span
                                  className="text-[11px] text-teal-600 font-semibold bg-teal-50 px-2 py-0.5 rounded border border-teal-100 cursor-pointer"
                                  onClick={(e) => handleClickableField(e, 'source', 'Nguồn', lead.source, 'bg-teal-100 text-teal-700')}
                                >
                                  {lead.source}
                                </span>
                              </td>
                            )}

                            {visibleColumns.includes('tags') && <td className="p-3 text-sm text-slate-600">{
                              (lead as any).marketingData?.tags?.map((t: string) => {
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
                                  <span key={t} className={`inline-block ${colorClass} text-xs px-2 py-0.5 rounded border mr-1 font-semibold`}>{t}</span>
                                );
                              }) || '-'
                            }</td>}

                            {visibleColumns.includes('referredBy') && <td className="p-3 text-sm text-slate-600">{(lead as any).referredBy || '-'}</td>}

                            {visibleColumns.includes('notes') && <td className="p-3 text-sm text-slate-500 max-w-[150px] truncate" title={(lead as any).notes || ''}>{(lead as any).notes || '-'}</td>}

                            {/* Next Activity */}
                            {visibleColumns.includes('nextActivity') && (
                              <td className="p-3">
                                {nextActivity ? (
                                  <div className="flex items-center gap-2 text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-1 rounded max-w-fit">
                                    <Clock size={12} /> {nextActivity.description.split(':')[0] || 'Lịch hẹn'}
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 text-xs text-slate-400">
                                    <Plus size={12} /> Lên lịch
                                  </div>
                                )}
                              </td>
                            )}

                            {/* Deadline */}
                            {visibleColumns.includes('deadline') && (
                              <td className="p-3 text-sm text-slate-600">
                                {deadline !== '-' ? <span className="text-red-600 font-bold">{deadline}</span> : '-'}
                              </td>
                            )}

                            {/* Revenue */}
                            {visibleColumns.includes('value') && (
                              <td className="p-3 text-sm font-bold text-slate-800 text-right">
                                {lead.value ? lead.value.toLocaleString('vi-VN') : '-'}
                              </td>
                            )}

                            {visibleColumns.includes('status') && (
                              <td className="p-3 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded text-[11px] font-bold border uppercase tracking-wide cursor-pointer hover:opacity-80 ${lead.status === LeadStatus.NEW ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                    lead.status === LeadStatus.QUALIFIED ? 'bg-cyan-50 text-cyan-700 border-cyan-200' :
                                      lead.status === DealStage.WON ? 'bg-green-50 text-green-700 border-green-200' :
                                        lead.status === DealStage.LOST ? 'bg-red-50 text-red-700 border-red-200' :
                                          'bg-slate-50 text-slate-600 border-slate-200'
                                    }`}
                                  onClick={(e) => handleClickableField(e, 'status', 'Trạng thái', lead.status,
                                    lead.status === LeadStatus.NEW ? 'bg-blue-100 text-blue-700' :
                                      lead.status === LeadStatus.QUALIFIED ? 'bg-cyan-100 text-cyan-700' :
                                        lead.status === DealStage.WON ? 'bg-green-100 text-green-700' :
                                          lead.status === DealStage.LOST ? 'bg-red-100 text-red-700' :
                                            'bg-slate-100 text-slate-700'
                                  )}
                                  title="Click để lọc theo trạng thái"
                                >
                                  {lead.status}
                                </span>
                              </td>
                            )}

                            {visibleColumns.includes('sla') && (
                              <td className="p-3 text-sm">
                                {lead.slaStatus === 'danger' || lead.slaStatus === 'warning' ? (
                                  <span className={`font-bold ${lead.slaStatus === 'danger' ? 'text-red-600' : 'text-amber-600'}`}>
                                    {lead.slaReason || (lead.slaStatus === 'danger' ? 'Quá hạn nghiêm trọng' : 'Cần chú ý')}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-xs">-</span>
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
          {selectedLead && (
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
                          <option value="NEW">Mới</option>
                          <option value="CONTACTED">Đã liên hệ</option>
                          <option value="QUALIFIED">Tiềm năng</option>
                          <option value="LOST">Thất bại</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-4">
                        <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Tags</label>
                        <input className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm outline-none" placeholder="VD: Goi lan 1, Zalo..." value={editLeadData.tags} onChange={e => setEditLeadData({ ...editLeadData, tags: e.target.value })} />
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

                  {/* MAIN FORM GRID */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-5">

                    {/* LEFT COL */}
                    <div className="space-y-4">

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

                    </div>

                    {/* RIGHT COL */}
                    <div className="space-y-4">
                      {/* Phone */}
                      <div className="flex items-center gap-4 relative">
                        <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Điện thoại <span className="text-red-500">*</span></label>
                        <div className="flex-1 relative">
                          <input
                            className={`w-full px-3 py-2 border rounded text-sm outline-none font-medium ${duplicateWarning ? 'border-amber-500 text-amber-700 bg-amber-50' : 'border-slate-300 focus:border-purple-500 text-slate-800'}`}
                            placeholder="0912..."
                            value={newLeadData.phone}
                            onChange={e => {
                              setNewLeadData({ ...newLeadData, phone: e.target.value });
                              if (e.target.value.length > 9) checkDuplicate(e.target.value);
                              else setDuplicateWarning(null);
                            }}
                          />
                          {isCheckingPhone && <Loader2 size={14} className="absolute right-3 top-2.5 animate-spin text-slate-400" />}
                          {duplicateWarning && (
                            <div className="absolute top-full right-0 mt-1 z-10 w-64 bg-white border border-amber-200 rounded shadow-lg p-3 text-xs">
                              <p className="font-bold text-amber-700 flex items-center gap-1"><AlertTriangle size={12} /> Đã tồn tại: {duplicateWarning.name}</p>
                              <p className="text-slate-500 mt-1">Phụ trách: {SALES_REPS.find(r => r.id === duplicateWarning.ownerId)?.name}</p>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  setShowCreateModal(false);
                                  setSelectedLead(duplicateWarning);
                                }}
                                className="mt-2 text-blue-600 font-bold hover:underline cursor-pointer flex items-center gap-1"
                              >
                                Xem chi tiết &rarr;
                              </button>
                            </div>
                          )}
                        </div>
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
                          <option value="NEW">Mới</option>
                          <option value="CONTACTED">Đã liên hệ</option>
                          <option value="QUALIFIED">Tiềm năng</option>
                          <option value="LOST">Thất bại</option>
                        </select>
                      </div>

                      {/* Tags */}
                      <div className="flex items-center gap-4">
                        <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Tags</label>
                        <select
                          className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none bg-white text-slate-700"
                          value={newLeadData.tags}
                          onChange={e => setNewLeadData({ ...newLeadData, tags: e.target.value })}
                        >
                          <option value="">-- Chọn Tag --</option>
                          <option value="Goi lan 1">Gọi lần 1</option>
                          <option value="Goi lan 2">Gọi lần 2</option>
                          <option value="Zalo">Zalo</option>
                        </select>
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
                            <label className="w-24 shrink-0 text-slate-600 text-sm font-semibold">Medium</label>
                            <select
                              className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:border-purple-500 outline-none bg-white text-slate-700"
                              value={newLeadData.medium}
                              onChange={e => setNewLeadData({ ...newLeadData, medium: e.target.value })}
                            >
                              <option value="">-- Chọn --</option>
                              <option value="cpc">CPC</option>
                              <option value="social">Social</option>
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

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-3">Phương thức phân bổ</label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => setAssignMethod('auto')}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${assignMethod === 'auto' ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200' : 'border-slate-200 hover:border-slate-300'}`}
                      >
                        <div className="flex items-center gap-2 mb-2 font-bold text-slate-900">
                          <Shuffle size={18} className={assignMethod === 'auto' ? 'text-blue-600' : 'text-slate-400'} /> Tự động
                        </div>
                        <p className="text-xs text-slate-500">Chia theo số lượng (Chỉ định số lượng cho từng Sale).</p>
                      </button>
                      <button
                        onClick={() => setAssignMethod('manual')}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${assignMethod === 'manual' ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200' : 'border-slate-200 hover:border-slate-300'}`}
                      >
                        <div className="flex items-center gap-2 mb-2 font-bold text-slate-900">
                          <Users size={18} className={assignMethod === 'manual' ? 'text-blue-600' : 'text-slate-400'} /> Thủ công
                        </div>
                        <p className="text-xs text-slate-500">Chọn đích danh một nhân viên để gán toàn bộ.</p>
                      </button>
                    </div>
                  </div>

                  {/* AUTO DISTRIBUTION TABLE */}
                  {assignMethod === 'auto' && (
                    <div className="animate-in slide-in-from-top-2">
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-bold text-slate-700">Chia số lượng Lead</label>
                        <span className={`text-xs font-bold ${isDistValid ? 'text-green-600' : 'text-red-500'}`}>
                          Tổng: {currentDistTotal} / {selectedLeadIds.length}
                        </span>
                      </div>
                      <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                            <tr>
                              <th className="p-2 text-left pl-3">Nhân viên</th>
                              <th className="p-2 text-center w-24">Tỷ lệ</th>
                              <th className="p-2 text-right w-24 pr-3">Số lượng</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {SALES_REPS.map(rep => {
                              const count = distribution[rep.id] || 0;
                              const percent = selectedLeadIds.length > 0 ? ((count / selectedLeadIds.length) * 100).toFixed(1) : '0.0';
                              return (
                                <tr key={rep.id}>
                                  <td className="p-2 pl-3">
                                    <div className="flex items-center gap-2">
                                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${rep.color}`}>{rep.avatar}</div>
                                      <span className="font-medium text-slate-700">{rep.name}</span>
                                    </div>
                                  </td>
                                  <td className="p-2 text-center text-slate-500 text-xs font-mono">{percent}%</td>
                                  <td className="p-2 pr-3">
                                    <input
                                      type="number"
                                      min="0"
                                      className="w-full border border-slate-300 rounded px-2 py-1 text-right font-bold text-slate-900 outline-none focus:border-blue-500"
                                      value={count}
                                      onChange={(e) => updateDistribution(rep.id, Number(e.target.value))}
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      {!isDistValid && <p className="text-xs text-red-500 mt-2 font-medium text-right">Tổng số lượng chưa khớp. Vui lòng điều chỉnh.</p>}
                    </div>
                  )}

                  {assignMethod === 'manual' && (
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
                  )}
                </div>

                <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
                  <button onClick={() => setShowAssignModal(false)} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-lg text-sm">Hủy</button>
                  <button
                    onClick={handleAssignSubmit}
                    disabled={assignMethod === 'auto' && !isDistValid}
                    className={`px-6 py-2 text-white font-bold rounded-lg shadow-sm text-sm transition-all ${assignMethod === 'auto' && !isDistValid ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
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
                            <div className="space-y-2">
                              <label className="text-sm font-semibold text-slate-600">Chiến lược phân công</label>
                              <div className="grid grid-cols-2 gap-3">
                                <button
                                  onClick={() => setImportAssignMethod('round-robin')}
                                  className={`p-3 rounded-lg border text-sm font-medium text-center transition-all ${importAssignMethod === 'round-robin' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                >
                                  Xoay vòng (Round-robin)
                                </button>
                                <button
                                  onClick={() => setImportAssignMethod('manual')}
                                  className={`p-3 rounded-lg border text-sm font-medium text-center transition-all ${importAssignMethod === 'manual' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                >
                                  Phân bổ thủ công
                                </button>
                              </div>
                            </div>

                            {/* DISTRIBUTION TABLE */}
                            {importAssignMethod === 'round-robin' && (
                              <div className="animate-in slide-in-from-top-2">
                                <div className="flex justify-between items-center mb-3">
                                  <label className="block text-sm font-bold text-slate-700">Chia số lượng Lead</label>
                                  <span className={`text-xs font-bold ${isImportDistValid ? 'text-green-600' : 'text-red-500'}`}>
                                    Tổng: {currentImportDistTotal} / {validImportRows.length}
                                  </span>
                                </div>
                                <div className="border border-slate-200 rounded-lg overflow-hidden">
                                  <div className="max-h-64 overflow-y-auto custom-scrollbar">
                                    <table className="w-full text-sm">
                                      <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 sticky top-0 z-10">
                                        <tr>
                                          <th className="p-3 text-left pl-4">Nhân viên</th>
                                          <th className="p-3 text-center w-24">Tỷ lệ</th>
                                          <th className="p-3 text-right w-24 pr-4">Số lượng</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 bg-white">
                                        {SALES_REPS.map(rep => {
                                          const count = importDistribution[rep.id] || 0;
                                          const percent = validImportRows.length > 0 ? ((count / validImportRows.length) * 100).toFixed(1) : '0.0';
                                          return (
                                            <tr key={rep.id} className="hover:bg-slate-50 transition-colors">
                                              <td className="p-3 pl-4">
                                                <div className="flex items-center gap-3">
                                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${rep.color}`}>{rep.avatar}</div>
                                                  <span className="font-medium text-slate-700">{rep.name}</span>
                                                </div>
                                              </td>
                                              <td className="p-3 text-center text-slate-500 font-medium">{percent}%</td>
                                              <td className="p-3 text-right pr-4">
                                                <input
                                                  type="number"
                                                  className="w-16 py-1.5 px-1 border border-slate-300 rounded-md text-center text-slate-800 font-bold focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                                  value={count}
                                                  onChange={(e) => {
                                                    const val = parseInt(e.target.value) || 0;
                                                    setImportDistribution({ ...importDistribution, [rep.id]: val >= 0 ? val : 0 });
                                                  }}
                                                />
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* MANUAL SELECTION LIST */}
                            {importAssignMethod === 'manual' && (
                              <div className="animate-in slide-in-from-top-2">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Chọn nhân viên phụ trách</label>
                                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                                  <div className="max-h-64 overflow-y-auto custom-scrollbar p-2">
                                    {SALES_REPS.map(rep => (
                                      <div
                                        key={rep.id}
                                        className={`flex items-center gap-3 p-3 rounded-lg border mb-2 cursor-pointer transition-all ${importManualOwnerId === rep.id ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:bg-slate-50'}`}
                                        onClick={() => setImportManualOwnerId(rep.id)}
                                      >
                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${importManualOwnerId === rep.id ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'}`}>
                                          {importManualOwnerId === rep.id && <CheckCircle size={12} className="text-white" />}
                                        </div>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${rep.color}`}>{rep.avatar}</div>
                                        <div className="flex-1">
                                          <p className={`text-sm font-bold ${importManualOwnerId === rep.id ? 'text-blue-700' : 'text-slate-700'}`}>{rep.name}</p>
                                          <p className="text-xs text-slate-500">{rep.team}</p>
                                        </div>
                                        {importManualOwnerId === rep.id && <span className="text-xs font-bold text-blue-600 bg-white px-2 py-1 rounded-full shadow-sm">Đã chọn</span>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
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

        </div>
      )}
    </>
  );
};

export default Leads;
