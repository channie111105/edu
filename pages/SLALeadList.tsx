
import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
   Search,
   Phone,
   Clock,
   AlertCircle,
   ListTodo,
   BarChart3,
   Settings,
   X,
   UserCheck,
   CheckCircle2,
   History,
   MessageSquare,
   Filter,
   Check,
   ChevronDown
} from 'lucide-react';
import { getLeads, saveLead } from '../utils/storage';
import { ILead, LeadStatus } from '../types';
import { calculateSLAWarnings, SLAWarning, SLAConfig } from '../utils/slaUtils';
import UnifiedLeadDrawer from '../components/UnifiedLeadDrawer';
import AdvancedDateFilter, { DateRange } from '../components/AdvancedDateFilter';
import { useAuth } from '../contexts/AuthContext';

// Mock Sales Reps
const SALES_REPS = [
   { id: 'u2', name: 'Sarah Miller', team: 'Team Đức', avatar: 'SM', color: 'bg-purple-100 text-purple-700' },
   { id: 'u3', name: 'David Clark', team: 'Team Trung', avatar: 'DC', color: 'bg-blue-100 text-blue-700' },
   { id: 'u4', name: 'Alex Rivera', team: 'Team Du học', avatar: 'AR', color: 'bg-green-100 text-green-700' },
   { id: 'u1', name: 'Tôi', team: 'Admin', avatar: 'ME', color: 'bg-slate-100 text-slate-700' },
   { id: 'u3', name: 'Nguyễn Văn A', team: 'Team Trung', avatar: 'NA', color: 'bg-orange-100 text-orange-700' },
];

type SlowType = 'slow_accept' | 'slow_appointment' | 'slow_first_call';
type TabType = SlowType | 'slow_list' | 'report';

const SLA_STATUS_LABELS: Record<SlowType, string> = {
   slow_accept: 'Ch\u1EADm nh\u1EADn',
   slow_appointment: 'Ch\u1EADm l\u1ECBch h\u1EB9n',
   slow_first_call: 'Ch\u1EADm g\u1ECDi l\u1EA7n 1'
};

interface ISlaSlowHistoryItem {
   id: string;
   leadId: string;
   slowType: SlowType;
   leadName: string;
   phone: string;
   source: string;
   branch?: string;
   ownerId?: string;
   leadStatus?: string;
   latestMessage: string;
   firstDetectedAt: string;
   latestDetectedAt: string;
   latestDelayMinutes: number;
   maxDelayMinutes: number;
   latestDelayText: string;
   severity: SLAWarning['severity'];
   resolvedAt?: string;
}

interface ISlaSlowEvent {
   id: string;
   leadId: string;
   slowType: SlowType;
   ownerId?: string;
   branch: string;
   detectedAt: string;
   source: string;
}

const SLA_SLOW_HISTORY_KEY = 'educrm_sla_slow_history_v1';
const SLA_SLOW_EVENTS_KEY = 'educrm_sla_slow_events_v1';
const UNKNOWN_BRANCH = 'Chưa rõ cơ sở';

const buildSlowHistoryId = (leadId: string, slowType: SlowType) => `${leadId}::${slowType}`;

const getStoredSlowHistory = (): ISlaSlowHistoryItem[] => {
   try {
      if (typeof window === 'undefined') return [];
      const raw = localStorage.getItem(SLA_SLOW_HISTORY_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
   } catch {
      return [];
   }
};

const saveStoredSlowHistory = (items: ISlaSlowHistoryItem[]) => {
   if (typeof window === 'undefined') return;
   localStorage.setItem(SLA_SLOW_HISTORY_KEY, JSON.stringify(items));
};

const getStoredSlowEvents = (): ISlaSlowEvent[] => {
   try {
      if (typeof window === 'undefined') return [];
      const raw = localStorage.getItem(SLA_SLOW_EVENTS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
   } catch {
      return [];
   }
};

const saveStoredSlowEvents = (items: ISlaSlowEvent[]) => {
   if (typeof window === 'undefined') return;
   localStorage.setItem(SLA_SLOW_EVENTS_KEY, JSON.stringify(items));
};

const normalizeText = (value?: string): string => String(value || '').trim();

const resolveLeadBranch = (lead?: Partial<ILead> | null): string => {
   const company = normalizeText((lead as any)?.company);
   if (company) return company;
   const city = normalizeText((lead as any)?.city);
   if (city) return city;
   return UNKNOWN_BRANCH;
};

const ensureBranch = (value?: string): string => {
   const branch = normalizeText(value);
   return branch || UNKNOWN_BRANCH;
};

const formatDelayMinutes = (minutes: number): string => {
   const safe = Math.max(0, Math.floor(minutes || 0));
   const h = Math.floor(safe / 60);
   const m = safe % 60;
   if (h > 0) return m > 0 ? `${h}h ${m}p` : `${h}h`;
   return `${m}p`;
};

const getWarningDelayMinutes = (warning: SLAWarning): number => {
   if (typeof warning.minutesOverdue === 'number' && Number.isFinite(warning.minutesOverdue)) {
      return Math.max(0, warning.minutesOverdue);
   }
   const txt = warning.timeLeft || '';
   const hm = txt.match(/(\d+)\s*h(?:\s*(\d+)\s*p)?/i);
   if (hm) return Number(hm[1]) * 60 + Number(hm[2] || 0);
   const m = txt.match(/(\d+)\s*p/i);
   if (m) return Number(m[1]);
   const d = txt.match(/(\d+)\s*ng/i);
   if (d) return Number(d[1]) * 24 * 60;
   return 0;
};

const mapWarningToSlaStatus = (warning: SLAWarning): SlowType => {
   switch (warning.type) {
      case 'not_acknowledged':
      case 'new_lead':
         return 'slow_accept';
      case 'overdue_appointment':
      case 'neglected_interaction':
         return 'slow_appointment';
      case 'slow_interaction':
         return 'slow_first_call';
      case 'manual_sla': {
         const msg = (warning.message || '').toLowerCase();
         if (msg.includes('l\u1ECBch h\u1EB9n') || msg.includes('h\u1EB9n')) return 'slow_appointment';
         if (msg.includes('g\u1ECDi') || msg.includes('t\u01B0\u01A1ng t\u00E1c')) return 'slow_first_call';
         return 'slow_accept';
      }
      default:
         return 'slow_accept';
   }
};

const SLALeadList: React.FC = () => {
   const { user } = useAuth();
   const filterRef = useRef<HTMLDivElement>(null);

   // Main Tab State
   const [activeTab, setActiveTab] = useState<TabType>('slow_accept');
   const [historyTypeFilter, setHistoryTypeFilter] = useState<'all' | SlowType>('all');

   // Search & Filter
   const [searchTerm, setSearchTerm] = useState('');
   const [showFilterDropdown, setShowFilterDropdown] = useState(false);

   // Advanced Filters State
   const [advancedFilters, setAdvancedFilters] = useState<{
      myPipeline: boolean;
      unassigned: boolean;
      status: string[];
      source: string[];
      ownerId: string[];
   }>({
      myPipeline: false,
      unassigned: false,
      status: [],
      source: [],
      ownerId: []
   });

   // Date Filter State
   const [dateRange, setDateRange] = useState<DateRange>({ startDate: null, endDate: null });

   // Config State (default updated as requested)
   const [slaConfig, setSlaConfig] = useState<SLAConfig>({
      ackTimeMinutes: 5,  // Updated to 5 minutes as requested
      firstActionTimeMinutes: 60,
      maxNeglectTimeHours: 72
   });
   const [showSettings, setShowSettings] = useState(false);

   // Real Data State
   const [leads, setLeads] = useState<ILead[]>([]);
   const [warnings, setWarnings] = useState<SLAWarning[]>([]);
   const [slowHistory, setSlowHistory] = useState<ISlaSlowHistoryItem[]>(() => getStoredSlowHistory());
   const [slowEvents, setSlowEvents] = useState<ISlaSlowEvent[]>(() => getStoredSlowEvents());
   const [branchFilter, setBranchFilter] = useState<string>('all');
   const [selectedLead, setSelectedLead] = useState<ILead | null>(null);

   // Load leads and calculate warnings
   useEffect(() => {
      const allLeads = getLeads();
      setLeads(allLeads);

      const calculatedWarnings = calculateSLAWarnings(allLeads, undefined, slaConfig);
      setWarnings(calculatedWarnings);
   }, [user, slaConfig]);

   // Keep a persistent history of all slow leads (including resolved items)
   useEffect(() => {
      const nowIso = new Date().toISOString();
      const leadMap = new Map(leads.map(lead => [lead.id, lead]));

      setSlowHistory(prev => {
         const historyMap = new Map(prev.map(item => [item.id, item]));
         const activeKeys = new Set<string>();
         const activatedInCycle = new Set<string>();
         const newViolationEvents: ISlaSlowEvent[] = [];

         warnings.forEach((warning) => {
            const slowType = mapWarningToSlaStatus(warning);
            const key = buildSlowHistoryId(warning.lead.id, slowType);
            const delayMinutes = getWarningDelayMinutes(warning);
            const leadSnapshot = leadMap.get(warning.lead.id) || warning.lead;
            const existing = historyMap.get(key);
            const branch = resolveLeadBranch(leadSnapshot);
            const wasActive = !!existing && !existing.resolvedAt;

            activeKeys.add(key);
            historyMap.set(key, {
               id: key,
               leadId: warning.lead.id,
               slowType,
               leadName: leadSnapshot.name || existing?.leadName || '',
               phone: leadSnapshot.phone || existing?.phone || '',
               source: leadSnapshot.source || existing?.source || '',
               branch,
               ownerId: leadSnapshot.ownerId || existing?.ownerId,
               leadStatus: String(leadSnapshot.status || existing?.leadStatus || ''),
               latestMessage: warning.message || existing?.latestMessage || '',
               firstDetectedAt: existing?.firstDetectedAt || nowIso,
               latestDetectedAt: nowIso,
               latestDelayMinutes: delayMinutes,
               maxDelayMinutes: Math.max(existing?.maxDelayMinutes || 0, delayMinutes),
               latestDelayText: warning.timeLeft || formatDelayMinutes(delayMinutes),
               severity: warning.severity || existing?.severity || 'warning',
               resolvedAt: undefined
            });

            if (!wasActive && !activatedInCycle.has(key)) {
               activatedInCycle.add(key);
               newViolationEvents.push({
                  id: `${key}::${Date.now()}::${Math.random().toString(36).slice(2, 8)}`,
                  leadId: warning.lead.id,
                  slowType,
                  ownerId: leadSnapshot.ownerId || existing?.ownerId,
                  branch,
                  detectedAt: nowIso,
                  source: leadSnapshot.source || existing?.source || ''
               });
            }
         });

         historyMap.forEach((item, key) => {
            if (activeKeys.has(key)) return;
            if (item.resolvedAt) return;
            const leadSnapshot = leadMap.get(item.leadId);
            historyMap.set(key, {
               ...item,
               leadStatus: String(leadSnapshot?.status || item.leadStatus || ''),
               ownerId: leadSnapshot?.ownerId || item.ownerId,
               branch: ensureBranch(leadSnapshot ? resolveLeadBranch(leadSnapshot) : item.branch),
               resolvedAt: nowIso
            });
         });

         const merged = Array.from(historyMap.values()).sort((a, b) => {
            return new Date(b.latestDetectedAt).getTime() - new Date(a.latestDetectedAt).getTime();
         });

         if (JSON.stringify(merged) !== JSON.stringify(prev)) {
            saveStoredSlowHistory(merged);
         }

         if (newViolationEvents.length > 0) {
            setSlowEvents(prevEvents => {
               const nextEvents = [...newViolationEvents, ...prevEvents];
               saveStoredSlowEvents(nextEvents);
               return nextEvents;
            });
         }

         return JSON.stringify(merged) !== JSON.stringify(prev) ? merged : prev;
      });
   }, [warnings, leads]);

   // Bootstrap events from old history to keep report non-empty after migration
   useEffect(() => {
      const leadMap = new Map(leads.map(lead => [lead.id, lead]));
      setSlowEvents(prev => {
         if (slowHistory.length === 0) return prev;

         const existingKeys = new Set(prev.map(item => `${item.leadId}::${item.slowType}`));
         const bootstrapped = slowHistory
            .filter(item => !existingKeys.has(`${item.leadId}::${item.slowType}`))
            .map(item => ({
               id: `bootstrap::${item.id}::${item.firstDetectedAt}`,
               leadId: item.leadId,
               slowType: item.slowType,
               ownerId: item.ownerId,
               branch: ensureBranch(item.branch || resolveLeadBranch(leadMap.get(item.leadId))),
               detectedAt: item.firstDetectedAt,
               source: item.source || ''
            }));

         if (bootstrapped.length === 0) return prev;

         const next = [...bootstrapped, ...prev];
         saveStoredSlowEvents(next);
         return next;
      });
   }, [slowHistory, leads]);

   // Handle Click Outside for Filter Dropdown
   useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
         if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
            setShowFilterDropdown(false);
         }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
   }, []);

   // Compute warning lists by 3 SLA slow types
   const warningListsByType = useMemo<Record<SlowType, SLAWarning[]>>(() => {
      const grouped: Record<SlowType, SLAWarning[]> = {
         slow_accept: [],
         slow_appointment: [],
         slow_first_call: []
      };

      warnings.forEach((warning) => {
         grouped[mapWarningToSlaStatus(warning)].push(warning);
      });

      return grouped;
   }, [warnings]);

   // Helper: Is Date in Range
   const isDateInRange = (dateStr?: string) => {
      if (!dateStr) return false;
      if (!dateRange.startDate) return true;
      const date = new Date(dateStr);
      const start = new Date(dateRange.startDate); start.setHours(0, 0, 0, 0);

      if (!dateRange.endDate) return date >= start;
      const end = new Date(dateRange.endDate); end.setHours(23, 59, 59, 999);

      return date >= start && date <= end;
   };

   // Filter Logic for Active List
   const filteredList = useMemo(() => {
      const sourceList =
         activeTab === 'slow_list' || activeTab === 'report'
            ? []
            : warningListsByType[activeTab];

      return sourceList.filter(w => {
         // 1. Text Search
         const matchesSearch = w.lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            w.lead.phone.includes(searchTerm);
         if (!matchesSearch) return false;

         // 2. Advanced Filters
         if (advancedFilters.myPipeline && user?.id) {
            if (w.lead.ownerId !== user.id) return false;
         }

         if (advancedFilters.unassigned) {
            if (w.lead.ownerId && w.lead.ownerId !== '') return false;
         }

         if (advancedFilters.status.length > 0) {
            if (activeTab !== 'slow_accept' && !advancedFilters.status.includes(w.lead.status)) return false;
         }

         if (advancedFilters.source.length > 0) {
            if (!advancedFilters.source.includes(w.lead.source)) return false;
         }

         if (advancedFilters.ownerId.length > 0) {
            if (!w.lead.ownerId || !advancedFilters.ownerId.includes(w.lead.ownerId)) return false;
         }

          const leadBranch = resolveLeadBranch(w.lead);
          if (branchFilter !== 'all' && leadBranch !== branchFilter) return false;

         // Date filter on lead created time for warning tabs.
         if (dateRange.startDate) {
            if (!isDateInRange(w.lead.createdAt)) return false;
         }

         return true;
      });
   }, [activeTab, warningListsByType, searchTerm, advancedFilters, branchFilter, dateRange, user]);

   const filteredSlowHistoryList = useMemo(() => {
      return slowHistory.filter(item => {
         const linkedLead = leads.find(lead => lead.id === item.leadId);
         const branch = ensureBranch(item.branch || resolveLeadBranch(linkedLead));
         const matchesSearch =
            item.leadName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.phone.includes(searchTerm);
         if (!matchesSearch) return false;

         if (historyTypeFilter !== 'all' && item.slowType !== historyTypeFilter) return false;
         if (advancedFilters.myPipeline && user?.id && item.ownerId !== user.id) return false;
         if (advancedFilters.unassigned && item.ownerId && item.ownerId !== '') return false;
         if (advancedFilters.source.length > 0 && !advancedFilters.source.includes(item.source)) return false;
         if (advancedFilters.ownerId.length > 0 && (!item.ownerId || !advancedFilters.ownerId.includes(item.ownerId))) return false;
         if (branchFilter !== 'all' && branch !== branchFilter) return false;

         if (dateRange.startDate && !isDateInRange(item.firstDetectedAt)) return false;
         return true;
      });
   }, [slowHistory, leads, searchTerm, historyTypeFilter, advancedFilters, branchFilter, dateRange, user]);

   const filteredSlowEvents = useMemo(() => {
      const leadMap = new Map(leads.map(lead => [lead.id, lead]));
      const historyMap = new Map(slowHistory.map(item => [item.leadId, item]));

      return slowEvents.filter(event => {
         const leadSnapshot = leadMap.get(event.leadId);
         const historySnapshot = historyMap.get(event.leadId);
         const leadName = leadSnapshot?.name || historySnapshot?.leadName || '';
         const phone = leadSnapshot?.phone || historySnapshot?.phone || '';
         const ownerId = event.ownerId || leadSnapshot?.ownerId || historySnapshot?.ownerId || '';
         const source = event.source || leadSnapshot?.source || historySnapshot?.source || '';
         const branch = ensureBranch(event.branch || historySnapshot?.branch || resolveLeadBranch(leadSnapshot));

         const matchesSearch =
            leadName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            phone.includes(searchTerm);
         if (!matchesSearch) return false;

         if (advancedFilters.myPipeline && user?.id && ownerId !== user.id) return false;
         if (advancedFilters.unassigned && ownerId) return false;
         if (advancedFilters.source.length > 0 && !advancedFilters.source.includes(source)) return false;
         if (advancedFilters.ownerId.length > 0 && (!ownerId || !advancedFilters.ownerId.includes(ownerId))) return false;
         if (branchFilter !== 'all' && branch !== branchFilter) return false;
         if (dateRange.startDate && !isDateInRange(event.detectedAt)) return false;

         return true;
      });
   }, [slowEvents, leads, slowHistory, searchTerm, advancedFilters, branchFilter, dateRange, user]);

   const reportRows = useMemo(() => {
      const rows = new Map<string, {
         ownerId?: string;
         slow_accept: number;
         slow_appointment: number;
         slow_first_call: number;
         total: number;
      }>();

      filteredSlowEvents.forEach(event => {
         const ownerKey = event.ownerId || 'unassigned';
         const existing = rows.get(ownerKey) || {
            ownerId: event.ownerId,
            slow_accept: 0,
            slow_appointment: 0,
            slow_first_call: 0,
            total: 0
         };

         existing[event.slowType] += 1;
         existing.total += 1;
         rows.set(ownerKey, existing);
      });

      return Array.from(rows.values()).sort((a, b) => b.total - a.total);
   }, [filteredSlowEvents]);

   const handleUpdate = (updatedLead: ILead) => {
      saveLead(updatedLead);
      const newLeads = leads.map(l => l.id === updatedLead.id ? updatedLead : l);
      setLeads(newLeads);
      const newWarnings = calculateSLAWarnings(newLeads, undefined, slaConfig);
      setWarnings(newWarnings);
      setSelectedLead(null);
   };

   // Toggle Filter Helper
   const toggleAdvancedFilter = (key: keyof typeof advancedFilters, value?: string) => {
      setAdvancedFilters(prev => {
         // Handle Boolean Toggles (Mutually Exclusive for pipeline/unassigned)
         if (typeof prev[key] === 'boolean') {
            const newState = !prev[key];

            // Mutual Exclusivity Logic
            if (key === 'myPipeline' && newState) {
               return { ...prev, myPipeline: true, unassigned: false };
            }
            if (key === 'unassigned' && newState) {
               return { ...prev, unassigned: true, myPipeline: false };
            }

            return { ...prev, [key]: newState };
         }

         // Handle Array Toggles
         if (Array.isArray(prev[key]) && value) {
            const arr = prev[key] as string[];
            return {
               ...prev,
               [key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value]
            };
         }
         return prev;
      });
   };

   // Quick Accept Action
   const handleQuickAccept = (lead: ILead) => {
      const updatedLead: ILead = {
         ...lead,
         status: 'CONTACTED',
         ownerId: (!lead.ownerId || lead.ownerId === 'system') ? (user?.id || 'u1') : lead.ownerId,
         activities: [
            {
               id: `act-${Date.now()}`,
               type: 'system',
               title: 'Tiếp nhận Lead',
               timestamp: new Date().toISOString(),
               description: 'Đã nhận lead từ danh sách SLA',
               user: user?.name || 'User'
            },
            ...(lead.activities || [])
         ],
         lastInteraction: new Date().toISOString()
      };
      handleUpdate(updatedLead);
   };

   const getRepInfo = (id?: string) => {
      if (!id) return { name: '-', color: '', avatar: '?', team: '' };
      return SALES_REPS.find(r => r.id === id) || { name: 'Unknown', color: 'bg-gray-100', avatar: '?', team: '' };
   };

    const getRepDisplayName = (id?: string) => {
      if (!id) return 'Chưa phân công';
      const rep = getRepInfo(id);
      if (rep.name === 'Unknown' || rep.name === '-') return id;
      return rep.name;
   };

   const getSlowTypeBadge = (slowType: SlowType) => {
      switch (slowType) {
         case 'slow_accept':
            return <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">{SLA_STATUS_LABELS.slow_accept}</span>;
         case 'slow_appointment':
            return <span className="bg-pink-100 text-pink-700 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">{SLA_STATUS_LABELS.slow_appointment}</span>;
         case 'slow_first_call':
            return <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">{SLA_STATUS_LABELS.slow_first_call}</span>;
         default:
            return <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">Khác</span>;
      }
   };

   const getWarningBadge = (warning: SLAWarning) => {
      return getSlowTypeBadge(mapWarningToSlaStatus(warning));
   };

   // Unique Values for Filters
   const uniqueSources = useMemo(() => {
      const sourceSet = new Set<string>();
      leads.forEach((lead) => { if (lead.source) sourceSet.add(lead.source); });
      slowHistory.forEach((item) => { if (item.source) sourceSet.add(item.source); });
      slowEvents.forEach((event) => { if (event.source) sourceSet.add(event.source); });
      return Array.from(sourceSet);
   }, [leads, slowHistory, slowEvents]);
   const uniqueBranches = useMemo(() => {
      const branchSet = new Set<string>();
      leads.forEach((lead) => branchSet.add(resolveLeadBranch(lead)));
      slowHistory.forEach((item) => branchSet.add(ensureBranch(item.branch)));
      slowEvents.forEach((event) => branchSet.add(ensureBranch(event.branch)));
      return Array.from(branchSet).sort((a, b) => a.localeCompare(b, 'vi'));
   }, [leads, slowHistory, slowEvents]);
   const uniqueStatuses = useMemo(() => Array.from(new Set(leads.map(l => l.status).filter(Boolean))), [leads]);

   return (
      <div className="flex flex-col min-h-full bg-[#f8fafc] text-[#0d141b] font-sans">
         <div className="flex flex-col flex-1 p-6 lg:p-8 max-w-[1400px] mx-auto w-full gap-6">

            {/* Header */}
            <div className="flex flex-wrap justify-between items-center gap-4">
               <div className="flex flex-col gap-1">
                  <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                     <ListTodo className="text-blue-600" /> Danh sách Lead cần xử lý (SLA)
                  </h1>
                  <p className="text-slate-500 text-sm">Quản lý các lead đang bị chậm tiến độ hoặc quá hạn xử lý.</p>
               </div>
               <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm"
               >
                  <Settings size={18} /> Cài đặt SLA
               </button>
            </div>

            {/* Config Panel */}
            {showSettings && (
               <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-md animate-in slide-in-from-top-2">
                  <div className="flex justify-between items-center mb-6">
                     <h3 className="font-bold text-lg text-slate-800">Cấu hình thời gian SLA</h3>
                     <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                     <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Thời gian nhận Lead (Phút)</label>
                        <div className="flex items-center gap-3">
                           <input
                              type="number"
                              className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-center font-bold"
                              value={slaConfig.ackTimeMinutes}
                              onChange={(e) => setSlaConfig({ ...slaConfig, ackTimeMinutes: parseInt(e.target.value) || 0 })}
                           />
                           <span className="text-slate-500 text-xs">Quá hạn &rarr; <span className="text-red-600 font-bold">Chưa nhận</span></span>
                        </div>
                     </div>
                     <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Tương tác đầu tiên (Phút)</label>
                        <div className="flex items-center gap-3">
                           <input
                              type="number"
                              className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-center font-bold"
                              value={slaConfig.firstActionTimeMinutes}
                              onChange={(e) => setSlaConfig({ ...slaConfig, firstActionTimeMinutes: parseInt(e.target.value) || 0 })}
                           />
                           <span className="text-slate-500 text-xs">Lead mới nhận nhưng chưa làm gì</span>
                        </div>
                     </div>
                     <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Chu kỳ chăm sóc (Giờ)</label>
                        <div className="flex items-center gap-3">
                           <input
                              type="number"
                              className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-center font-bold"
                              value={slaConfig.maxNeglectTimeHours}
                              onChange={(e) => setSlaConfig({ ...slaConfig, maxNeglectTimeHours: parseInt(e.target.value) || 0 })}
                           />
                           <span className="text-slate-500 text-xs">Quá hạn &rarr; <span className="text-orange-600 font-bold">Bỏ quên</span></span>
                        </div>
                     </div>
                  </div>
               </div>
            )}

            {/* TAB NAVIGATION */}
            <div className="flex gap-6 border-b border-slate-200">
               <button
                  onClick={() => setActiveTab('slow_accept')}
                  className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${activeTab === 'slow_accept'
                     ? 'border-red-600 text-red-600'
                     : 'border-transparent text-slate-500 hover:text-slate-700'
                     }`}
               >
                  <AlertCircle size={18} />
                  Chậm nhận
                  <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === 'slow_accept' ? 'bg-red-100 text-red-700' : 'bg-slate-100'}`}>
                     {warningListsByType.slow_accept.length}
                  </span>
               </button>
               <button
                  onClick={() => setActiveTab('slow_appointment')}
                  className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${activeTab === 'slow_appointment'
                     ? 'border-pink-600 text-pink-600'
                     : 'border-transparent text-slate-500 hover:text-slate-700'
                     }`}
               >
                  <History size={18} />
                  Chậm lịch hẹn
                  <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === 'slow_appointment' ? 'bg-pink-100 text-pink-700' : 'bg-slate-100'}`}>
                     {warningListsByType.slow_appointment.length}
                  </span>
               </button>
               <button
                  onClick={() => setActiveTab('slow_first_call')}
                  className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${activeTab === 'slow_first_call'
                     ? 'border-amber-600 text-amber-600'
                     : 'border-transparent text-slate-500 hover:text-slate-700'
                     }`}
               >
                  <MessageSquare size={18} />
                  Chậm gọi lần 1
                  <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === 'slow_first_call' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100'}`}>
                     {warningListsByType.slow_first_call.length}
                  </span>
               </button>
               <button
                  onClick={() => setActiveTab('slow_list')}
                  className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${activeTab === 'slow_list'
                     ? 'border-slate-700 text-slate-700'
                     : 'border-transparent text-slate-500 hover:text-slate-700'
                     }`}
               >
                  <ListTodo size={18} />
                  Danh sách chậm
                  <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === 'slow_list' ? 'bg-slate-200 text-slate-800' : 'bg-slate-100'}`}>
                     {slowHistory.length}
                  </span>
               </button>
               <button
                  onClick={() => setActiveTab('report')}
                  className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${activeTab === 'report'
                     ? 'border-blue-700 text-blue-700'
                     : 'border-transparent text-slate-500 hover:text-slate-700'
                     }`}
               >
                  <BarChart3 size={18} />
                  Báo cáo
                  <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === 'report' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100'}`}>
                     {slowEvents.length}
                  </span>
               </button>
            </div>

            {/* TOOLBAR: Search & Filters */}
            <div className="flex flex-wrap items-center justify-between gap-3">
               {/* Search */}
               <div className="relative flex-1 min-w-[240px] max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                     type="text"
                     placeholder="Tìm tên, số điện thoại..."
                     className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                  />
               </div>

               <div className="flex items-center gap-2">
                  {activeTab === 'slow_list' && (
                     <div className="flex items-center gap-1 p-1 rounded-lg border border-slate-200 bg-white shadow-sm">
                        <button
                           onClick={() => setHistoryTypeFilter('all')}
                           className={`px-2.5 py-1.5 text-xs font-bold rounded-md transition-all ${historyTypeFilter === 'all'
                              ? 'bg-slate-700 text-white'
                              : 'text-slate-600 hover:bg-slate-100'
                              }`}
                        >
                           Tất cả
                        </button>
                        {(Object.keys(SLA_STATUS_LABELS) as SlowType[]).map((type) => (
                           <button
                              key={type}
                              onClick={() => setHistoryTypeFilter(type)}
                              className={`px-2.5 py-1.5 text-xs font-bold rounded-md transition-all ${historyTypeFilter === type
                                 ? 'bg-blue-600 text-white'
                                 : 'text-slate-600 hover:bg-slate-100'
                                 }`}
                           >
                              {SLA_STATUS_LABELS[type]}
                           </button>
                        ))}
                     </div>
                  )}

                  {/* Date Filter */}
                  <AdvancedDateFilter onChange={setDateRange} label="Ngày tạo" />

                  {/* Branch Filter */}
                  <div className="relative">
                     <select
                        value={branchFilter}
                        onChange={(e) => setBranchFilter(e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 hover:border-slate-300 shadow-sm"
                     >
                        <option value="all">Tất cả cơ sở</option>
                        {uniqueBranches.map((branch) => (
                           <option key={branch} value={branch}>{branch}</option>
                        ))}
                     </select>
                  </div>

                  {/* Advanced Filter Dropdown */}
                  <div className="relative" ref={filterRef}>
                     <button
                        onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-bold transition-all shadow-sm ${showFilterDropdown || (advancedFilters.myPipeline || advancedFilters.unassigned || advancedFilters.status.length > 0)
                           ? 'bg-blue-50 text-blue-700 border-blue-200'
                           : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                           }`}
                     >
                        <Filter size={16} />
                        Bộ lọc
                        <ChevronDown size={14} />
                     </button>

                     {showFilterDropdown && (
                        <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-slate-200 z-50 p-2 animate-in fade-in zoom-in-95 origin-top-right">
                           <div className="p-2 border-b border-slate-100 mb-1">
                              <h4 className="text-xs font-bold text-slate-400 uppercase">Lọc nhanh</h4>
                           </div>
                           <div className="space-y-1 mb-2">
                              <button
                                 onClick={() => toggleAdvancedFilter('myPipeline')}
                                 className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-slate-50 text-sm text-slate-700"
                              >
                                 <span>Lead của tôi</span>
                                 {advancedFilters.myPipeline && <Check size={14} className="text-blue-600" />}
                              </button>
                              <button
                                 onClick={() => toggleAdvancedFilter('unassigned')}
                                 className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-slate-50 text-sm text-slate-700"
                              >
                                 <span>Chưa phân công</span>
                                 {advancedFilters.unassigned && <Check size={14} className="text-blue-600" />}
                              </button>
                           </div>

                           {(activeTab === 'slow_appointment' || activeTab === 'slow_first_call') && (
                              <>
                                 <div className="p-2 border-b border-slate-100 border-t mt-2 mb-1">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase">Trạng thái</h4>
                                 </div>
                                 <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                                    {uniqueStatuses.map(status => (
                                       <button
                                          key={status}
                                          onClick={() => toggleAdvancedFilter('status', status)}
                                          className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-slate-50 text-sm text-slate-700"
                                       >
                                          <span className="truncate">{status}</span>
                                          {advancedFilters.status.includes(status) && <Check size={14} className="text-blue-600" />}
                                       </button>
                                    ))}
                                 </div>
                              </>
                           )}

                           <div className="p-2 border-b border-slate-100 border-t mt-2 mb-1">
                              <h4 className="text-xs font-bold text-slate-400 uppercase">Nguồn Lead</h4>
                           </div>
                           <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                              {uniqueSources.map(src => (
                                 <button
                                    key={src}
                                    onClick={() => toggleAdvancedFilter('source', src)}
                                    className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-slate-50 text-sm text-slate-700"
                                 >
                                    <span className="truncate">{src}</span>
                                    {advancedFilters.source.includes(src) && <Check size={14} className="text-blue-600" />}
                                 </button>
                              ))}
                           </div>
                        </div>
                     )}
                  </div>
               </div>
            </div>

            {/* Lead List Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
               {activeTab === 'report' ? (
                  <table className="w-full text-left border-collapse">
                     <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                           <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Sale</th>
                           <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Chậm nhận</th>
                           <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Chậm lịch hẹn</th>
                           <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Chậm gọi lần 1</th>
                           <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Tổng</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                        {reportRows.map((row, idx) => {
                           const rep = getRepInfo(row.ownerId);
                           const repName = getRepDisplayName(row.ownerId);
                           return (
                              <tr key={`${row.ownerId || 'unassigned'}-${idx}`} className="hover:bg-slate-50 transition-colors">
                                 <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                       {row.ownerId && rep.name !== 'Unknown' && rep.name !== '-' && (
                                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${rep.color}`}>{rep.avatar}</div>
                                       )}
                                       <span className="text-sm font-semibold text-slate-800">{repName}</span>
                                    </div>
                                 </td>
                                 <td className="px-6 py-4 text-center text-sm font-bold text-red-600">{row.slow_accept}</td>
                                 <td className="px-6 py-4 text-center text-sm font-bold text-pink-600">{row.slow_appointment}</td>
                                 <td className="px-6 py-4 text-center text-sm font-bold text-amber-600">{row.slow_first_call}</td>
                                 <td className="px-6 py-4 text-center text-sm font-black text-slate-900">{row.total}</td>
                              </tr>
                           );
                        })}

                        {reportRows.length === 0 && (
                           <tr>
                              <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                 <div className="flex flex-col items-center gap-3">
                                    <CheckCircle2 size={48} className="text-green-500 opacity-50" />
                                    <p>Chưa có dữ liệu vi phạm theo bộ lọc hiện tại.</p>
                                 </div>
                              </td>
                           </tr>
                        )}
                     </tbody>
                  </table>
               ) : (
                  <table className="w-full text-left border-collapse">
                     <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                           <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Họ tên & Nguồn</th>
                           <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Sale phụ trách</th>
                           <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Vấn đề (Issue)</th>
                           <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                           <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Thời gian trễ</th>
                           <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Hành động</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                        {activeTab === 'slow_list' ? (
                           <>
                              {filteredSlowHistoryList.map((item, idx) => {
                                 const rep = getRepInfo(item.ownerId);
                                 const linkedLead = leads.find(lead => lead.id === item.leadId);
                                 const isResolved = !!item.resolvedAt;
                                 return (
                                    <tr
                                       key={`${item.id}-${idx}`}
                                       className={`hover:bg-slate-50 transition-colors ${linkedLead ? 'cursor-pointer' : ''}`}
                                       onClick={() => linkedLead && setSelectedLead(linkedLead)}
                                    >
                                       <td className="px-6 py-4">
                                          <div className="flex flex-col">
                                             <span className="text-sm font-bold text-slate-900">{item.leadName}</span>
                                             <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">{item.source || '-'}</span>
                                                <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-200">{ensureBranch(item.branch)}</span>
                                                <span className="text-xs text-slate-400">{item.phone}</span>
                                             </div>
                                          </div>
                                       </td>
                                       <td className="px-6 py-4">
                                          <div className="flex items-center gap-2">
                                             {rep.name !== 'Unknown' && <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${rep.color}`}>{rep.avatar}</div>}
                                             <span className="text-sm font-medium text-slate-700">{getRepDisplayName(item.ownerId)}</span>
                                          </div>
                                       </td>
                                       <td className="px-6 py-4 w-[30%]">
                                          <div className="flex flex-col gap-1 items-start">
                                             {getSlowTypeBadge(item.slowType)}
                                             <span className="text-xs text-slate-500 mt-1">{item.latestMessage}</span>
                                             <span className="text-[11px] text-slate-400">
                                                Lần đầu: {new Date(item.firstDetectedAt).toLocaleString('vi-VN')}
                                             </span>
                                          </div>
                                       </td>
                                       <td className="px-6 py-4">
                                          <div className="flex flex-col gap-1">
                                             <span className={`inline-flex items-center w-fit px-2 py-0.5 rounded text-xs font-bold ${isResolved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                {isResolved ? 'Đã xử lý' : 'Đang chậm'}
                                             </span>
                                             <span className="text-xs text-slate-500">{item.leadStatus || '-'}</span>
                                             {item.resolvedAt && (
                                                <span className="text-[11px] text-slate-400">
                                                   Xử lý lúc: {new Date(item.resolvedAt).toLocaleString('vi-VN')}
                                                </span>
                                             )}
                                          </div>
                                       </td>
                                       <td className="px-6 py-4">
                                          <div className="flex flex-col gap-1">
                                             <span className="text-sm font-bold text-slate-700 flex items-center gap-1">
                                                <Clock size={16} /> Lần cuối: {item.latestDelayText || formatDelayMinutes(item.latestDelayMinutes)}
                                             </span>
                                             <span className="text-xs text-slate-500">Max: {formatDelayMinutes(item.maxDelayMinutes)}</span>
                                          </div>
                                       </td>
                                       <td className="px-6 py-4 text-right">
                                          <div className="flex items-center justify-end gap-2">
                                             <button
                                                onClick={(e) => {
                                                   e.stopPropagation();
                                                   if (linkedLead) setSelectedLead(linkedLead);
                                                }}
                                                disabled={!linkedLead}
                                                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded text-sm font-bold shadow-sm transition-all whitespace-nowrap ${linkedLead ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                                                title={linkedLead ? 'Xem lead' : 'Lead không còn tồn tại'}
                                             >
                                                <MessageSquare size={14} /> Xem
                                             </button>
                                          </div>
                                       </td>
                                    </tr>
                                 );
                              })}

                              {filteredSlowHistoryList.length === 0 && (
                                 <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                       <div className="flex flex-col items-center gap-3">
                                          <CheckCircle2 size={48} className="text-green-500 opacity-50" />
                                          <p>Chưa có bản ghi chậm phù hợp bộ lọc.</p>
                                       </div>
                                    </td>
                                 </tr>
                              )}
                           </>
                        ) : (
                           <>
                              {filteredList.map((warning, idx) => {
                                 const rep = getRepInfo((warning.lead as any).salesperson || warning.lead.ownerId);
                                 const leadBranch = resolveLeadBranch(warning.lead);
                                 return (
                                    <tr key={`${warning.lead.id}-${idx}`} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setSelectedLead(warning.lead)}>
                                       <td className="px-6 py-4">
                                          <div className="flex flex-col">
                                             <span className="text-sm font-bold text-slate-900">{warning.lead.name}</span>
                                             <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">{warning.lead.source}</span>
                                                <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-200">{leadBranch}</span>
                                                <span className="text-xs text-slate-400">{warning.lead.phone}</span>
                                             </div>
                                          </div>
                                       </td>
                                       <td className="px-6 py-4">
                                          <div className="flex items-center gap-2">
                                             {rep.name !== 'Unknown' && <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${rep.color}`}>{rep.avatar}</div>}
                                             <span className="text-sm font-medium text-slate-700">{getRepDisplayName((warning.lead as any).salesperson || warning.lead.ownerId)}</span>
                                          </div>
                                       </td>
                                       <td className="px-6 py-4 w-[30%]">
                                          <div className="flex flex-col gap-1 items-start">
                                             {getWarningBadge(warning)}
                                             <span className="text-xs text-slate-500 mt-1">{warning.message}</span>
                                          </div>
                                       </td>
                                       <td className="px-6 py-4">
                                          <span className="text-sm font-medium text-slate-700 capitalize">{warning.lead.status}</span>
                                       </td>
                                       <td className="px-6 py-4">
                                          <span className={`text-sm font-bold flex items-center gap-1 ${warning.severity === 'danger' ? 'text-red-600' :
                                             warning.severity === 'warning' ? 'text-amber-600' : 'text-slate-600'
                                             }`}>
                                             <Clock size={16} /> {warning.timeLeft}
                                          </span>
                                       </td>
                                       <td className="px-6 py-4 text-right">
                                          <div className="flex items-center justify-end gap-2">
                                             <button
                                                onClick={(e) => { e.stopPropagation(); /* Start Call */ }}
                                                className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                                title="Gọi ngay"
                                             >
                                                <Phone size={16} />
                                             </button>

                                             {activeTab === 'slow_accept' && (
                                                <button
                                                   onClick={(e) => { e.stopPropagation(); handleQuickAccept(warning.lead); }}
                                                   className="inline-flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm font-bold shadow-sm transition-all whitespace-nowrap"
                                                   title="Nhận Lead ngay"
                                                >
                                                   <UserCheck size={14} /> Nhận
                                                </button>
                                             )}
                                             {(activeTab === 'slow_appointment' || activeTab === 'slow_first_call') && (
                                                <button
                                                   onClick={(e) => { e.stopPropagation(); setSelectedLead(warning.lead); }}
                                                   className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm font-bold shadow-sm transition-all whitespace-nowrap"
                                                   title="Xử lý / Tương tác"
                                                >
                                                   <MessageSquare size={14} /> Xử lý
                                                </button>
                                             )}
                                          </div>
                                       </td>
                                    </tr>
                                 );
                              })}

                              {filteredList.length === 0 && (
                                 <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                       <div className="flex flex-col items-center gap-3">
                                          <CheckCircle2 size={48} className="text-green-500 opacity-50" />
                                          <p>Tuyệt vời! Không có lead nào cần xử lý trong mục này.</p>
                                       </div>
                                    </td>
                                 </tr>
                              )}
                           </>
                        )}
                     </tbody>
                  </table>
               )}
            </div>
         </div>

         {/* Drawer */}
         <UnifiedLeadDrawer
            isOpen={!!selectedLead}
            onClose={() => setSelectedLead(null)}
            lead={selectedLead || {} as ILead}
            onUpdate={handleUpdate}
         />
      </div >
   );
};

export default SLALeadList;
