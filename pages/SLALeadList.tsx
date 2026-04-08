
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
   Phone,
   Clock,
   AlertCircle,
   ListTodo,
   BarChart3,
   RotateCcw,
   Settings,
   X,
   UserCheck,
   UserPlus,
   CheckCircle2,
   History,
   MessageSquare,
   Filter,
   Check,
   ChevronDown,
   Users,
   Search
} from 'lucide-react';
import { getCollaborators, getLeadById, getLeads, getSalesTeams, saveLead, saveLeads } from '../utils/storage';
import { ILead, LeadStatus, UserRole } from '../types';
import { calculateSLAWarnings, SLAWarning, SLAConfig } from '../utils/slaUtils';
import UnifiedLeadDrawer from '../components/UnifiedLeadDrawer';
import { appendLeadLogs, buildLeadActivityLog, buildLeadAuditChange, buildLeadAuditLog } from '../utils/leadLogs';
import AdvancedDateFilter, { DateRange } from '../components/AdvancedDateFilter';
import { useAuth } from '../contexts/AuthContext';
import PinnedSearchInput, { PinnedSearchChip } from '../components/PinnedSearchInput';
import { decodeMojibakeText } from '../utils/mojibake';
import { clearLeadReclaimTracking, getPickedLeadFirstActionDeadline, getPickedLeadFirstActionMessage } from '../utils/leadSla';

// Mock Sales Reps
const SALES_REPS = [
   { id: 'u2', name: 'Sarah Miller', team: 'Team Đức', avatar: 'SM', color: 'bg-purple-100 text-purple-700' },
   { id: 'u3', name: 'David Clark', team: 'Team Trung', avatar: 'DC', color: 'bg-blue-100 text-blue-700' },
   { id: 'u4', name: 'Alex Rivera', team: 'Team Du học', avatar: 'AR', color: 'bg-green-100 text-green-700' },
   { id: 'u1', name: 'Tôi', team: 'Admin', avatar: 'ME', color: 'bg-slate-100 text-slate-700' },
   { id: 'u3', name: 'Nguyễn Văn A', team: 'Team Trung', avatar: 'NA', color: 'bg-orange-100 text-orange-700' },
];

const ASSIGNABLE_SALES_REPS: AssignableSalesRep[] = (() => {
   const seen = new Set<string>();
   return SALES_REPS.filter((rep) => {
      if (!rep.id || seen.has(rep.id)) return false;
      seen.add(rep.id);
      return true;
   });
})();

const buildEmptyAssignmentRatios = () =>
   ASSIGNABLE_SALES_REPS.reduce<Record<string, string>>((acc, rep) => {
      acc[rep.id] = '';
      return acc;
   }, {});

const parseAssignmentRatio = (value: string) => {
   const parsed = Number.parseInt(value, 10);
   return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

const buildLeadCountByRatio = (leadCount: number, ratios: Record<string, number>) => {
   return ASSIGNABLE_SALES_REPS.reduce<Record<string, number>>((acc, rep) => {
      acc[rep.id] = Math.max(0, ratios[rep.id] || 0);
      return acc;
   }, {});
};

type SlowType = 'slow_accept' | 'slow_appointment' | 'slow_first_call';
type TabType = SlowType | 'slow_collaborator' | 'slow_list' | 'reclaim' | 'report';

interface ICollaboratorSlaItem {
   id: string;
   name: string;
   phone: string;
   ownerId?: string;
   ownerName?: string;
   city?: string;
   notes?: string;
   nextAppointment?: string;
   status?: string;
   activities?: Array<{ description?: string }>;
}

interface ISlowCollaboratorRow {
   collaborator: ICollaboratorSlaItem;
   appointmentAt: string;
   overdueMinutes: number;
   overdueText: string;
   isPreview?: boolean;
}

interface ReclaimLeadItem {
   lead: ILead;
   reclaimType: 'picked_no_action' | 'slow_care';
   message: string;
   triggerAt: string;
   overdueMinutes: number;
   overdueText: string;
   currentOwnerId?: string;
   previousOwnerId?: string;
   reclaimedAt?: string;
   isAlreadyReclaimed?: boolean;
}

interface AssignableSalesRep {
   id: string;
   name: string;
   team: string;
   branch?: string;
   avatar: string;
   color: string;
}

const SLA_STATUS_LABELS: Record<SlowType, string> = {
   slow_accept: 'Chậm nhận',
   slow_appointment: 'Chậm lịch hẹn',
   slow_first_call: 'Chậm gọi lần 1'
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

interface ISlaSlowLeadRow {
   id: string;
   leadId: string;
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
   slowTypes: SlowType[];
   items: ISlaSlowHistoryItem[];
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

const COLLABORATOR_FOCUS_KEY = 'educrm_collaborator_focus_id';

const buildSlowHistoryId = (leadId: string, slowType: SlowType) => `${leadId}::${slowType}`;

const getStoredSlowHistory = (): ISlaSlowHistoryItem[] => {
   try {
      if (typeof window === 'undefined') return [];
      const raw = localStorage.getItem(SLA_SLOW_HISTORY_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];

      return parsed.map((item) => ({
         ...item,
         leadName: decodeMojibakeText(String(item?.leadName || '')),
         phone: decodeMojibakeText(String(item?.phone || '')),
         source: decodeMojibakeText(String(item?.source || '')),
         branch: decodeMojibakeText(String(item?.branch || '')),
         leadStatus: decodeMojibakeText(String(item?.leadStatus || '')),
         latestMessage: decodeMojibakeText(String(item?.latestMessage || '')),
         latestDelayText: decodeMojibakeText(String(item?.latestDelayText || ''))
      }));
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
      if (!Array.isArray(parsed)) return [];

      return parsed.map((item) => ({
         ...item,
         branch: decodeMojibakeText(String(item?.branch || '')),
         source: decodeMojibakeText(String(item?.source || ''))
      }));
   } catch {
      return [];
   }
};

const saveStoredSlowEvents = (items: ISlaSlowEvent[]) => {
   if (typeof window === 'undefined') return;
   localStorage.setItem(SLA_SLOW_EVENTS_KEY, JSON.stringify(items));
};

const text = (value?: string): string => decodeMojibakeText(value || '');

const normalizeText = (value?: string): string => text(value).trim();

const normalizeAssignFilterToken = (value?: string): string =>
   text(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();

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

const getLeadResponsibleOwnerId = (lead?: Partial<ILead> | null): string => {
   const ownerId = normalizeText((lead as any)?.ownerId);
   if (ownerId) return ownerId;
   return normalizeText((lead as any)?.salesperson);
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
         if (msg.includes('lịch hẹn') || msg.includes('hẹn')) return 'slow_appointment';
         if (msg.includes('gọi') || msg.includes('tương tác')) return 'slow_first_call';
         return 'slow_accept';
      }
      default:
         return 'slow_accept';
   }
};

const parseDateSafe = (value?: string) => {
   if (!value) return null;
   const date = new Date(value);
   return Number.isNaN(date.getTime()) ? null : date;
};

const parseCollaboratorAppointment = (value?: string) => {
   if (!value) return null;
   const normalizedValue = /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? `${value}T23:59:00`
      : value;
   return parseDateSafe(normalizedValue);
};

const getLeadActivityMoment = (activity: any): Date | null => {
   if (!activity) return null;
   return parseDateSafe(activity.timestamp || activity.datetime || activity.date || activity.createdAt);
};

const hasFollowUpAfterPickup = (lead: ILead): boolean => {
   const pickUpDate = parseDateSafe(lead.pickUpDate);
   if (!pickUpDate) return false;

   const pickUpMs = pickUpDate.getTime();
   const lastInteraction = parseDateSafe(lead.lastInteraction);
   if (lastInteraction && lastInteraction.getTime() > pickUpMs) {
      return true;
   }

   const activities = Array.isArray(lead.activities) ? lead.activities : [];
   return activities.some((activity) => {
      const when = getLeadActivityMoment(activity);
      return !!when && when.getTime() > pickUpMs;
   });
};

const getPickedLeadReclaimMessage = (pickUpDate?: string): string => {
   const pickedAt = parseDateSafe(pickUpDate);
   if (!pickedAt) return 'Đã nhận lead nhưng chưa có gọi/cập nhật sau khi nhận.';

   const hour = pickedAt.getHours();
   if (hour >= 8 && hour < 17) return 'Đã nhận lead trong giờ hành chính nhưng quá 2 giờ vẫn chưa có cập nhật.';
   return 'Đã nhận lead ngoài giờ hành chính nhưng đến 09:00 sáng hôm sau vẫn chưa có cập nhật.';
};

const SLALeadList: React.FC = () => {
   const { user } = useAuth();
   const filterRef = useRef<HTMLDivElement>(null);

   // Main Tab State
   const [activeTab, setActiveTab] = useState<TabType>('slow_accept');

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
      firstActionTimeMinutes: 120,
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
   const [selectedReclaimLeadIds, setSelectedReclaimLeadIds] = useState<string[]>([]);
   const [showAssignModal, setShowAssignModal] = useState(false);
   const [assignmentRatios, setAssignmentRatios] = useState<Record<string, string>>(() => buildEmptyAssignmentRatios());
   const [assignRepSearch, setAssignRepSearch] = useState('');
   const [assignCampusFilter, setAssignCampusFilter] = useState('all');
   const [collaborators, setCollaborators] = useState<ICollaboratorSlaItem[]>([]);
   const [nowTimestamp, setNowTimestamp] = useState(() => Date.now());

   const reloadLeads = useCallback(() => {
      const allLeads = getLeads();
      setLeads(allLeads);
      setWarnings(calculateSLAWarnings(allLeads, undefined, slaConfig));
      setSelectedLead((prev) => {
         if (!prev?.id) return prev;
         return allLeads.find((lead) => lead.id === prev.id) || null;
      });
   }, [slaConfig]);

   const reloadCollaborators = useCallback(() => {
      const allCollaborators = getCollaborators() as ICollaboratorSlaItem[];
      setCollaborators(Array.isArray(allCollaborators) ? allCollaborators : []);
   }, []);

   // Load leads and calculate warnings
   useEffect(() => {
      reloadLeads();
   }, [reloadLeads]);

   useEffect(() => {
      reloadCollaborators();
   }, [reloadCollaborators]);

   useEffect(() => {
      const handleLeadsChanged = () => {
         reloadLeads();
      };

      const handleCollaboratorsChanged = () => {
         reloadCollaborators();
      };

      const handleStorageChanged = (event: StorageEvent) => {
         if (!event.key || event.key === 'educrm_leads_v2') {
            reloadLeads();
         }
         if (!event.key || event.key === 'educrm_collaborators') {
            reloadCollaborators();
         }
      };

      window.addEventListener('educrm:leads-changed', handleLeadsChanged);
      window.addEventListener('focus', handleCollaboratorsChanged);
      window.addEventListener('storage', handleStorageChanged);

      return () => {
         window.removeEventListener('educrm:leads-changed', handleLeadsChanged);
         window.removeEventListener('focus', handleCollaboratorsChanged);
         window.removeEventListener('storage', handleStorageChanged);
      };
   }, [reloadCollaborators, reloadLeads]);

   useEffect(() => {
      const intervalId = window.setInterval(() => setNowTimestamp(Date.now()), 60000);
      return () => window.clearInterval(intervalId);
   }, []);

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
            const responsibleOwnerId = existing?.ownerId || getLeadResponsibleOwnerId(leadSnapshot);
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
               ownerId: responsibleOwnerId,
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
                  ownerId: responsibleOwnerId,
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

   const visibleCollaborators = useMemo(() => {
      if (!user || user.role === UserRole.ADMIN || user.role === UserRole.FOUNDER) {
         return collaborators;
      }

      return collaborators.filter((item) => item.ownerId === user.id);
   }, [collaborators, user]);

   const slowCollaboratorList = useMemo<ISlowCollaboratorRow[]>(() => {
      const overdueRows = visibleCollaborators
         .map((collaborator) => {
            const appointmentAt = parseCollaboratorAppointment(collaborator.nextAppointment);
            if (!appointmentAt) return null;

            const overdueMinutes = Math.floor((nowTimestamp - appointmentAt.getTime()) / (1000 * 60));
            if (overdueMinutes <= 0) return null;

            return {
               collaborator,
               appointmentAt: appointmentAt.toISOString(),
               overdueMinutes,
               overdueText: formatDelayMinutes(overdueMinutes)
            };
         })
         .filter((item): item is ISlowCollaboratorRow => Boolean(item))
         .sort((a, b) => b.overdueMinutes - a.overdueMinutes);

      if (overdueRows.length > 0) {
         return overdueRows;
      }

      const previewCollaborator = visibleCollaborators[0];
      if (!previewCollaborator) {
         return [];
      }

      const previewAppointment = new Date(nowTimestamp - 3 * 60 * 60 * 1000);

      return [{
         collaborator: previewCollaborator,
         appointmentAt: previewAppointment.toISOString(),
         overdueMinutes: 180,
         overdueText: formatDelayMinutes(180),
         isPreview: true
      }];
   }, [nowTimestamp, visibleCollaborators]);

   const slowOwnerByHistoryId = useMemo(() => {
      const entries = new Map<string, string>();
      slowHistory.forEach((item) => {
         if (item.ownerId) {
            entries.set(item.id, item.ownerId);
         }
      });
      return entries;
   }, [slowHistory]);

   const getWarningResponsibleOwnerId = (warning: SLAWarning): string => {
      const slowType = mapWarningToSlaStatus(warning);
      const historyId = buildSlowHistoryId(warning.lead.id, slowType);
      return slowOwnerByHistoryId.get(historyId) || getLeadResponsibleOwnerId(warning.lead);
   };

   const reclaimList = useMemo<ReclaimLeadItem[]>(() => {
      const now = new Date();

      return leads.flatMap<ReclaimLeadItem>((lead) => {
         const currentOwnerId = getLeadResponsibleOwnerId(lead);
         const previousOwnerId = normalizeText(lead.reclaimedFromOwnerId);
         const normalizedStatus = String(lead.status || '').trim().toLowerCase();
         if (['lost', 'unverified', 'converted', 'won', 'qualified'].includes(normalizedStatus)) return [];

         if (lead.reclaimedAt && !currentOwnerId) {
            const reclaimedAt = parseDateSafe(lead.reclaimedAt);
            const triggerAt = parseDateSafe(lead.reclaimTriggerAt) || reclaimedAt || now;
            const overdueMinutes = reclaimedAt
               ? Math.max(0, Math.floor((now.getTime() - reclaimedAt.getTime()) / (1000 * 60)))
               : 0;

            return [{
               lead,
               reclaimType: (lead.reclaimReason === 'slow_care' ? 'slow_care' : 'picked_no_action') as ReclaimLeadItem['reclaimType'],
               message: lead.reclaimReason === 'slow_care'
                  ? 'Lead da bi thu hoi do cham cham soc qua 3 ngay va dang cho phan bo lai.'
                  : 'Lead da bi thu hoi do da nhan nhung khong co cap nhat theo SLA va dang cho phan bo lai.',
               triggerAt: triggerAt.toISOString(),
               overdueMinutes,
               overdueText: formatDelayMinutes(overdueMinutes),
               currentOwnerId,
               previousOwnerId,
               reclaimedAt: lead.reclaimedAt,
               isAlreadyReclaimed: true
            }];
         }

         if (!currentOwnerId || currentOwnerId === 'system') return [];

         if (lead.pickUpDate && !hasFollowUpAfterPickup(lead)) {
            const triggerAt = getPickedLeadFirstActionDeadline(lead.pickUpDate, 120);
            if (triggerAt && now >= triggerAt) {
               const overdueMinutes = Math.floor((now.getTime() - triggerAt.getTime()) / (1000 * 60));
               return [{
                  lead,
                  reclaimType: 'picked_no_action',
                  message: getPickedLeadFirstActionMessage(lead.pickUpDate, 120),
                  triggerAt: triggerAt.toISOString(),
                  overdueMinutes,
                  overdueText: formatDelayMinutes(overdueMinutes),
                  currentOwnerId,
                  previousOwnerId,
                  isAlreadyReclaimed: false
               }];
            }
         }

         const userActivities = (Array.isArray(lead.activities) ? lead.activities : []).filter((activity: any) => activity.type !== 'system');
         if (userActivities.length === 0) return [];

         const lastInteraction = parseDateSafe(lead.lastInteraction);
         if (!lastInteraction) return [];

         const slowCareTriggerAt = new Date(lastInteraction.getTime() + 3 * 24 * 60 * 60 * 1000);
         if (now < slowCareTriggerAt) return [];

         const overdueMinutes = Math.floor((now.getTime() - slowCareTriggerAt.getTime()) / (1000 * 60));
         return [{
            lead,
            reclaimType: 'slow_care',
            message: 'Lead đã chậm chăm sóc quá 3 ngày và cần chuyển về tab thu hồi để phân bổ lại.',
            triggerAt: slowCareTriggerAt.toISOString(),
            overdueMinutes,
            overdueText: formatDelayMinutes(overdueMinutes),
            currentOwnerId,
            previousOwnerId,
            isAlreadyReclaimed: false
         }];
      }).sort((a, b) => {
         if (Number(Boolean(b.isAlreadyReclaimed)) !== Number(Boolean(a.isAlreadyReclaimed))) {
            return Number(Boolean(b.isAlreadyReclaimed)) - Number(Boolean(a.isAlreadyReclaimed));
         }
         return b.overdueMinutes - a.overdueMinutes;
      });
   }, [leads]);

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
         activeTab === 'slow_list' || activeTab === 'reclaim' || activeTab === 'report' || activeTab === 'slow_collaborator'
            ? []
            : (warningListsByType[activeTab] ?? []);

      return sourceList.filter(w => {
         const responsibleOwnerId = getWarningResponsibleOwnerId(w);

         // 1. Text Search
         const matchesSearch = w.lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            w.lead.phone.includes(searchTerm);
         if (!matchesSearch) return false;

         // 2. Advanced Filters
         if (advancedFilters.myPipeline && user?.id) {
            if (responsibleOwnerId !== user.id) return false;
         }

         if (advancedFilters.unassigned) {
            if (responsibleOwnerId && responsibleOwnerId !== '') return false;
         }

         if (advancedFilters.status.length > 0) {
            if (activeTab !== 'slow_accept' && !advancedFilters.status.includes(text(w.lead.status))) return false;
         }

         if (advancedFilters.source.length > 0) {
            if (!advancedFilters.source.includes(text(w.lead.source))) return false;
         }

         if (advancedFilters.ownerId.length > 0) {
            if (!responsibleOwnerId || !advancedFilters.ownerId.includes(responsibleOwnerId)) return false;
         }

          const leadBranch = resolveLeadBranch(w.lead);
          if (branchFilter !== 'all' && leadBranch !== branchFilter) return false;

         // Date filter on lead created time for warning tabs.
         if (dateRange.startDate) {
            if (!isDateInRange(w.lead.createdAt)) return false;
         }

         return true;
      });
   }, [activeTab, warningListsByType, searchTerm, advancedFilters, branchFilter, dateRange, user, slowOwnerByHistoryId]);

   const aggregatedSlowHistoryList = useMemo<ISlaSlowLeadRow[]>(() => {
      const grouped = new Map<string, ISlaSlowHistoryItem[]>();

      slowHistory.forEach((item) => {
         const current = grouped.get(item.leadId) || [];
         current.push(item);
         grouped.set(item.leadId, current);
      });

      return Array.from(grouped.entries()).map(([leadId, items]) => {
         const sorted = [...items].sort((a, b) => {
            return new Date(b.latestDetectedAt).getTime() - new Date(a.latestDetectedAt).getTime();
         });
         const latest = sorted[0];
         const activeItems = sorted.filter((item) => !item.resolvedAt);
         const primaryItems = activeItems.length > 0 ? activeItems : sorted;
         const latestResolvedAt = sorted
            .map((item) => item.resolvedAt)
            .filter(Boolean)
            .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0];

         return {
            id: leadId,
            leadId,
            leadName: latest.leadName,
            phone: latest.phone,
            source: latest.source,
            branch: latest.branch,
            ownerId: latest.ownerId,
            leadStatus: latest.leadStatus,
            latestMessage: primaryItems.map((item) => item.latestMessage).filter(Boolean).join(' | '),
            firstDetectedAt: sorted
               .map((item) => item.firstDetectedAt)
               .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0] || latest.firstDetectedAt,
            latestDetectedAt: latest.latestDetectedAt,
            latestDelayMinutes: Math.max(...primaryItems.map((item) => item.latestDelayMinutes)),
            maxDelayMinutes: Math.max(...sorted.map((item) => item.maxDelayMinutes)),
            latestDelayText: latest.latestDelayText,
            severity: primaryItems.some((item) => item.severity === 'danger') ? 'danger' : latest.severity,
            resolvedAt: activeItems.length === 0 ? latestResolvedAt : undefined,
            slowTypes: Array.from(new Set(primaryItems.map((item) => item.slowType))),
            items: sorted
         };
      }).sort((a, b) => new Date(b.latestDetectedAt).getTime() - new Date(a.latestDetectedAt).getTime());
   }, [slowHistory]);

   const filteredSlowHistoryList = useMemo(() => {
      return aggregatedSlowHistoryList.filter(item => {
         const linkedLead = leads.find(lead => lead.id === item.leadId);
         const branch = ensureBranch(item.branch || resolveLeadBranch(linkedLead));
         const matchesSearch =
            item.leadName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.phone.includes(searchTerm);
         if (!matchesSearch) return false;

         if (advancedFilters.myPipeline && user?.id && item.ownerId !== user.id) return false;
         if (advancedFilters.unassigned && item.ownerId && item.ownerId !== '') return false;
         if (advancedFilters.source.length > 0 && !advancedFilters.source.includes(text(item.source))) return false;
         if (advancedFilters.ownerId.length > 0 && (!item.ownerId || !advancedFilters.ownerId.includes(item.ownerId))) return false;
         if (branchFilter !== 'all' && branch !== branchFilter) return false;

         if (dateRange.startDate && !isDateInRange(item.firstDetectedAt)) return false;
         return true;
      });
   }, [aggregatedSlowHistoryList, leads, searchTerm, advancedFilters, branchFilter, dateRange, user]);

   const filteredReclaimList = useMemo(() => {
      return reclaimList.filter(item => {
         const lead = item.lead;
         const currentOwnerId = item.currentOwnerId || getLeadResponsibleOwnerId(lead);
         const displayOwnerId = item.previousOwnerId || currentOwnerId;
         const matchesSearch =
            lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            lead.phone.includes(searchTerm);
         if (!matchesSearch) return false;

         if (advancedFilters.myPipeline && user?.id && displayOwnerId !== user.id) return false;
         if (advancedFilters.unassigned && currentOwnerId) return false;
         if (advancedFilters.status.length > 0 && !advancedFilters.status.includes(text(lead.status))) return false;
         if (advancedFilters.source.length > 0 && !advancedFilters.source.includes(text(lead.source))) return false;
         if (advancedFilters.ownerId.length > 0 && (!displayOwnerId || !advancedFilters.ownerId.includes(displayOwnerId))) return false;

         const leadBranch = resolveLeadBranch(lead);
         if (branchFilter !== 'all' && leadBranch !== branchFilter) return false;
         if (dateRange.startDate && !isDateInRange(item.triggerAt)) return false;

         return true;
      });
   }, [reclaimList, searchTerm, advancedFilters, branchFilter, dateRange, user]);

   const filteredSlowCollaboratorList = useMemo(() => {
      return slowCollaboratorList.filter((item) => {
         const collaborator = item.collaborator;
         const ownerId = normalizeText(collaborator.ownerId);
         const collaboratorBranch = normalizeText(collaborator.city) || UNKNOWN_BRANCH;
         const matchesSearch =
            normalizeText(collaborator.name).toLowerCase().includes(searchTerm.toLowerCase()) ||
            normalizeText(collaborator.phone).includes(searchTerm);

         if (!matchesSearch) return false;
         if (advancedFilters.myPipeline && user?.id && ownerId !== user.id) return false;
         if (advancedFilters.unassigned && ownerId) return false;
         if (advancedFilters.ownerId.length > 0 && (!ownerId || !advancedFilters.ownerId.includes(ownerId))) return false;
         if (branchFilter !== 'all' && collaboratorBranch !== branchFilter) return false;
         if (dateRange.startDate && !isDateInRange(item.appointmentAt)) return false;

         return true;
      });
   }, [slowCollaboratorList, searchTerm, advancedFilters, branchFilter, dateRange, user]);

   const selectedReclaimLeadSet = useMemo(() => new Set(selectedReclaimLeadIds), [selectedReclaimLeadIds]);
   const selectedReclaimItems = useMemo(
      () => reclaimList.filter((item) => selectedReclaimLeadSet.has(item.lead.id)),
      [reclaimList, selectedReclaimLeadSet]
   );
   const selectedReclaimCount = selectedReclaimItems.length;
   const allFilteredReclaimSelected = useMemo(() => {
      const filteredSelectableIds = filteredReclaimList.map((item) => item.lead.id);
      return filteredSelectableIds.length > 0 && filteredSelectableIds.every((id) => selectedReclaimLeadSet.has(id));
   }, [filteredReclaimList, selectedReclaimLeadSet]);
   const assignmentRatioValues = useMemo(
      () =>
         ASSIGNABLE_SALES_REPS.reduce<Record<string, number>>((acc, rep) => {
            acc[rep.id] = parseAssignmentRatio(assignmentRatios[rep.id] || '');
            return acc;
         }, {}),
      [assignmentRatios]
   );
   const assignmentRatioTotal = useMemo(
      () => ASSIGNABLE_SALES_REPS.reduce((sum, rep) => sum + (assignmentRatioValues[rep.id] || 0), 0),
      [assignmentRatioValues]
   );
   const assignmentLeadCounts = useMemo(
      () => buildLeadCountByRatio(selectedReclaimCount, assignmentRatioValues),
      [assignmentRatioValues, selectedReclaimCount]
   );

   const assignmentSalesReps = useMemo<AssignableSalesRep[]>(() => {
      const branchByUserId = new Map<string, string>();
      const teamByUserId = new Map<string, string>();

      getSalesTeams().forEach((team) => {
         const teamName = text(team.name);
         const teamBranch = ensureBranch(team.branch);
         team.members.forEach((member) => {
            if (!member.userId) return;
            if (!teamByUserId.has(member.userId)) {
               teamByUserId.set(member.userId, teamName);
            }
            if (!branchByUserId.has(member.userId)) {
               branchByUserId.set(member.userId, ensureBranch(member.branch || teamBranch));
            }
         });
      });

      return ASSIGNABLE_SALES_REPS.map((rep) => ({
         ...rep,
         team: teamByUserId.get(rep.id) || text(rep.team),
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

   useEffect(() => {
      const selectableIds = new Set(reclaimList.map((item) => item.lead.id));
      setSelectedReclaimLeadIds((prev) => prev.filter((id) => selectableIds.has(id)));
   }, [reclaimList]);

   const filteredSlowEvents = useMemo(() => {
      const leadMap = new Map(leads.map(lead => [lead.id, lead]));
      const historyMap = new Map(slowHistory.map(item => [`${item.leadId}::${item.slowType}`, item]));

      return slowEvents.filter(event => {
         const leadSnapshot = leadMap.get(event.leadId);
         const historySnapshot = historyMap.get(`${event.leadId}::${event.slowType}`);
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
         if (advancedFilters.source.length > 0 && !advancedFilters.source.includes(text(source))) return false;
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

   const openLeadDetails = (leadOrId?: ILead | string | null) => {
      if (!leadOrId) return;
      const leadId = typeof leadOrId === 'string' ? leadOrId : leadOrId.id;
      if (!leadId) return;

      const latestLead = getLeadById(leadId) || leads.find((item) => item.id === leadId);
      if (latestLead) {
         setSelectedLead(latestLead);
         return;
      }

      if (typeof leadOrId !== 'string') {
         setSelectedLead(leadOrId);
      }
   };

   const openCollaboratorDetails = (collaboratorId?: string) => {
      if (!collaboratorId || typeof window === 'undefined') return;
      localStorage.setItem(COLLABORATOR_FOCUS_KEY, collaboratorId);
      window.location.hash = '/marketing/collaborators';
   };

   const resetAssignModal = () => {
      setAssignmentRatios(buildEmptyAssignmentRatios());
   };

   const openAssignModal = (item?: ReclaimLeadItem) => {
      if (item?.lead?.id) {
         setSelectedReclaimLeadIds((prev) => prev.includes(item.lead.id) ? prev : [item.lead.id]);
      }
      resetAssignModal();
      resetAssignFilters();
      setShowAssignModal(true);
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

      const normalizedValue = String(Math.min(selectedReclaimCount, parseAssignmentRatio(value)));
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
      const baseCount = Math.floor(selectedReclaimCount / targetRepIds.length);
      let remaining = selectedReclaimCount - (baseCount * targetRepIds.length);

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
            acc[rep.id] = rep.id === repId ? String(selectedReclaimCount) : '';
            return acc;
         }, {})
      );
   };

   const toggleReclaimLeadSelection = (leadId: string) => {
      setSelectedReclaimLeadIds((prev) =>
         prev.includes(leadId) ? prev.filter((id) => id !== leadId) : [...prev, leadId]
      );
   };

   const handleSelectAllReclaim = () => {
      const filteredSelectableIds = filteredReclaimList.map((item) => item.lead.id);

      if (filteredSelectableIds.length === 0) return;

      const allSelected = filteredSelectableIds.every((id) => selectedReclaimLeadSet.has(id));
      setSelectedReclaimLeadIds((prev) => {
         const remaining = prev.filter((id) => !filteredSelectableIds.includes(id));
         return allSelected ? remaining : [...remaining, ...filteredSelectableIds];
      });
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
      const nowIso = new Date().toISOString();
      const updatedLead: ILead = appendLeadLogs({
         ...clearLeadReclaimTracking(lead),
         status: LeadStatus.PICKED,
         ownerId: (!lead.ownerId || lead.ownerId === 'system') ? (user?.id || 'u1') : lead.ownerId,
         pickUpDate: nowIso,
         lastInteraction: nowIso
      }, {
         activities: [
            buildLeadActivityLog({
               type: 'system',
               title: 'Tiếp nhận Lead',
               timestamp: nowIso,
               description: 'Sale đã nhận lead từ danh sách SLA.',
               user: user?.name || 'User'
            })
         ],
         audits: [
            buildLeadAuditLog({
               action: 'lead_picked',
               actor: user?.name || 'User',
               actorType: 'user',
               timestamp: nowIso,
               changes: [
                  buildLeadAuditChange('status', lead.status, LeadStatus.PICKED, 'Trạng thái'),
                  buildLeadAuditChange('pickUpDate', lead.pickUpDate, nowIso, 'Thời gian nhận lead')
               ]
            })
         ]
      });
      handleUpdate(updatedLead);
   };

   const handleReclaimLead = (item: ReclaimLeadItem) => {
      const lead = item.lead;
      if (item.isAlreadyReclaimed) {
         openAssignModal(item);
         return;
      }
      const previousOwnerId = getLeadResponsibleOwnerId(lead);
      const previousOwnerName = getRepDisplayName(previousOwnerId);
      const nowIso = new Date().toISOString();
      const reclaimTriggerAt = item.triggerAt || lead.reclaimTriggerAt || nowIso;
      const updatedLead: ILead = appendLeadLogs({
         ...lead,
         status: LeadStatus.NEW,
         ownerId: '',
         pickUpDate: undefined,
         reclaimedAt: nowIso,
         reclaimReason: item.reclaimType,
         reclaimTriggerAt,
         reclaimedFromOwnerId: previousOwnerId
      }, {
         activities: [
            buildLeadActivityLog({
               type: 'system',
               timestamp: nowIso,
               title: 'Thu hồi Lead',
               description: `Lead bị thu hồi từ ${previousOwnerName} do vi phạm SLA xử lý.`,
               user: user?.name || 'Marketing'
            })
         ],
         audits: [
            buildLeadAuditLog({
               action: 'lead_reclaimed',
               actor: user?.name || 'Marketing',
               actorType: 'user',
               timestamp: nowIso,
               changes: [
                  buildLeadAuditChange('status', lead.status, LeadStatus.NEW, 'Trạng thái'),
                  buildLeadAuditChange('ownerId', lead.ownerId, '', 'Sale phụ trách'),
                  buildLeadAuditChange('pickUpDate', lead.pickUpDate, undefined, 'Thời gian nhận lead')
               ]
            })
         ]
      });

      handleUpdate(updatedLead);
   };

   const handleAssignReclaimedLead = () => {
      const repsWithLeads = assignmentSalesReps.filter((rep) => (assignmentLeadCounts[rep.id] || 0) > 0);
      if (selectedReclaimCount === 0) return;

      if (repsWithLeads.length === 0) {
         window.alert('Vui lòng nhập số lượng lead cho ít nhất 1 sale.');
         return;
      }

      if (assignmentRatioTotal !== selectedReclaimCount) {
         window.alert('Tổng số lead phân bổ phải bằng số lead đã chọn.');
         return;
      }

      const selectedIds = new Set(selectedReclaimLeadIds);
      const ownerAssignments = repsWithLeads.flatMap((rep) =>
         Array.from({ length: assignmentLeadCounts[rep.id] || 0 }, () => rep.id)
      );
      let assignmentIndex = 0;
      const nowIso = new Date().toISOString();
      const updatedLeads = leads.map((lead) => {
         if (!selectedIds.has(lead.id)) return lead;

         const ownerId = ownerAssignments[assignmentIndex] || repsWithLeads[repsWithLeads.length - 1].id;
         assignmentIndex += 1;
         const targetRep = assignmentSalesReps.find((rep) => rep.id === ownerId);
         const previousOwnerId = lead.reclaimedFromOwnerId || getLeadResponsibleOwnerId(lead) || lead.ownerId || '';
         const previousOwnerName = getRepDisplayName(previousOwnerId);

         return appendLeadLogs({
            ...clearLeadReclaimTracking(lead),
            status: LeadStatus.ASSIGNED,
            ownerId,
            pickUpDate: undefined
         }, {
            activities: [
               buildLeadActivityLog({
                  type: 'system',
                  timestamp: nowIso,
                  title: previousOwnerId ? 'Phân bổ lại Lead' : 'Phân bổ Lead',
                  description: previousOwnerId
                     ? `Lead được phân bổ lại từ ${previousOwnerName} sang ${targetRep?.name || ownerId} tại tab lead thu hồi.`
                     : `Lead được phân bổ cho ${targetRep?.name || ownerId} tại tab lead thu hồi.`,
                  user: user?.name || 'Marketing'
               })
            ],
            audits: [
               buildLeadAuditLog({
                  action: previousOwnerId ? 'lead_reassigned' : 'lead_assigned',
                  actor: user?.name || 'Marketing',
                  actorType: 'user',
                  timestamp: nowIso,
                  changes: [
                     buildLeadAuditChange('ownerId', lead.ownerId, ownerId, 'Sale phụ trách'),
                     buildLeadAuditChange('status', lead.status, LeadStatus.ASSIGNED, 'Trạng thái')
                  ]
               })
            ]
         });
      });

      saveLeads(updatedLeads);
      setLeads(updatedLeads);
      setWarnings(calculateSLAWarnings(updatedLeads, undefined, slaConfig));
      setSelectedReclaimLeadIds([]);
      closeAssignModal();
      window.alert(`Đã phân bổ thành công ${selectedReclaimCount} lead!`);
   };

   const getRepInfo = (id?: string) => {
      if (!id) return { name: '-', color: '', avatar: '?', team: '' };
      const rep = SALES_REPS.find(r => r.id === id) || { name: 'Unknown', color: 'bg-gray-100', avatar: '?', team: '' };
      return {
         ...rep,
         name: text(rep.name),
         team: text(rep.team)
      };
   };

   const getRepDisplayName = (id?: string) => {
      if (!id) return 'Ch\u01B0a ph\u00E2n c\u00F4ng';
      const rep = getRepInfo(id);
      if (rep.name === 'Unknown' || rep.name === '-') return text(id);
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
            return <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">{"Kh\u00E1c"}</span>;
      }
   };

   const getWarningBadge = (warning: SLAWarning) => {
      return getSlowTypeBadge(mapWarningToSlaStatus(warning));
   };

   const getReclaimBadge = (item: ReclaimLeadItem) => {
      if (item.isAlreadyReclaimed) {
         return <span className="bg-violet-100 text-violet-700 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">{"Chờ phân bổ lại"}</span>;
      }
      if (item.reclaimType === 'slow_care') {
         return <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">{"Ch\u1EADm ch\u0103m s\u00F3c"}</span>;
      }
      return <span className="bg-fuchsia-100 text-fuchsia-700 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">{"\u0110\u00E3 nh\u1EADn ch\u01B0a c\u1EADp nh\u1EADt"}</span>;
   };

   // Unique Values for Filters
   const uniqueSources = useMemo(() => {
      const sourceSet = new Set<string>();
      leads.forEach((lead) => { if (lead.source) sourceSet.add(text(lead.source)); });
      slowHistory.forEach((item) => { if (item.source) sourceSet.add(text(item.source)); });
      slowEvents.forEach((event) => { if (event.source) sourceSet.add(text(event.source)); });
      return Array.from(sourceSet);
   }, [leads, slowHistory, slowEvents]);
   const uniqueBranches = useMemo(() => {
      const branchSet = new Set<string>();
      leads.forEach((lead) => branchSet.add(resolveLeadBranch(lead)));
      slowHistory.forEach((item) => branchSet.add(ensureBranch(item.branch)));
      slowEvents.forEach((event) => branchSet.add(ensureBranch(event.branch)));
      collaborators.forEach((collaborator) => {
         const collaboratorBranch = normalizeText(collaborator.city);
         if (collaboratorBranch) branchSet.add(collaboratorBranch);
      });
      return Array.from(branchSet).sort((a, b) => a.localeCompare(b, 'vi'));
   }, [collaborators, leads, slowHistory, slowEvents]);
   const uniqueStatuses = useMemo(() => Array.from(new Set(leads.map(l => text(l.status)).filter(Boolean))), [leads]);

   const formatChipDate = (value?: string | Date | null) => {
      if (!value) return '';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return value;
      return date.toLocaleDateString('vi-VN');
   };

   const activeSearchChips = useMemo<PinnedSearchChip[]>(() => {
      const chips: PinnedSearchChip[] = [];

      if (branchFilter !== 'all') {
         chips.push({ key: 'branch', label: `Co so: ${branchFilter}` });
      }

      if (dateRange.startDate) {
         const start = formatChipDate(dateRange.startDate);
         const end = formatChipDate(dateRange.endDate || dateRange.startDate);
         chips.push({ key: 'dateRange', label: `Ngay: ${start} - ${end}` });
      }

      if (advancedFilters.myPipeline) {
         chips.push({ key: 'myPipeline', label: 'Bo loc: Lead cua toi' });
      }

      if (advancedFilters.unassigned) {
         chips.push({ key: 'unassigned', label: 'Bo loc: Chua phan cong' });
      }

      advancedFilters.status.forEach((statusValue) => {
         chips.push({ key: `status:${statusValue}`, label: `Trạng thái: ${statusValue}` });
      });

      advancedFilters.source.forEach((sourceValue) => {
         chips.push({ key: `source:${sourceValue}`, label: `Nguon: ${sourceValue}` });
      });

      advancedFilters.ownerId.forEach((ownerIdValue) => {
         chips.push({ key: `owner:${ownerIdValue}`, label: `Sales: ${getRepDisplayName(ownerIdValue)}` });
      });

      return chips;
   }, [activeTab, advancedFilters, branchFilter, dateRange]);

   const removeSearchChip = (chipKey: string) => {
      if (chipKey === 'branch') {
         setBranchFilter('all');
         return;
      }

      if (chipKey === 'dateRange') {
         setDateRange({ startDate: null, endDate: null });
         return;
      }

      if (chipKey === 'myPipeline') {
         setAdvancedFilters(prev => ({ ...prev, myPipeline: false }));
         return;
      }

      if (chipKey === 'unassigned') {
         setAdvancedFilters(prev => ({ ...prev, unassigned: false }));
         return;
      }

      if (chipKey.startsWith('status:')) {
         const target = chipKey.slice('status:'.length);
         setAdvancedFilters(prev => ({ ...prev, status: prev.status.filter(item => item !== target) }));
         return;
      }

      if (chipKey.startsWith('source:')) {
         const target = chipKey.slice('source:'.length);
         setAdvancedFilters(prev => ({ ...prev, source: prev.source.filter(item => item !== target) }));
         return;
      }

      if (chipKey.startsWith('owner:')) {
         const target = chipKey.slice('owner:'.length);
         setAdvancedFilters(prev => ({ ...prev, ownerId: prev.ownerId.filter(item => item !== target) }));
      }
   };

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
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
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
                     <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">{"Quy t\u1EAFc thu h\u1ED3i"}</label>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
                           <div>{"Lead \u0111\u00E3 nh\u1EADn: qu\u00E1 2 gi\u1EDD trong gi\u1EDD h\u00E0nh ch\u00EDnh, ho\u1EB7c qu\u00E1 09:00 s\u00E1ng h\u00F4m sau n\u1EBFu nh\u1EADn ngo\u00E0i gi\u1EDD."}</div>
                           <div>{"Lead ch\u1EADm ch\u0103m s\u00F3c: qu\u00E1 3 ng\u00E0y kh\u00F4ng c\u1EADp nh\u1EADt s\u1EBD v\u00E0o tab thu h\u1ED3i \u0111\u1EC3 ph\u00E2n b\u1ED5 l\u1EA1i."}</div>
                        </div>
                     </div>
                  </div>
               </div>
            )}

            {/* TOOLBAR: Search & Filters */}
            <div className="flex flex-wrap items-center justify-between gap-3">
               {/* Search */}
               <div className="min-w-[240px] flex-1">
                  <PinnedSearchInput
                     value={searchTerm}
                     onChange={setSearchTerm}
                     placeholder="Tìm tên, số điện thoại..."
                     chips={activeSearchChips}
                     onRemoveChip={removeSearchChip}
                     inputClassName="text-sm h-7"
                  />
               </div>

               <div className="flex shrink-0 items-center gap-2">
                  {/* Date Filter */}
                  <AdvancedDateFilter onChange={setDateRange} label="Thời gian" />

                  {/* Branch Filter */}
                  <div className="relative">
                     <select
                        value={branchFilter}
                        onChange={(e) => setBranchFilter(e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 hover:border-slate-300 shadow-sm"
                     >
                        <option value="all">Tất cả cơ sở</option>
                        {uniqueBranches.map((branch) => (
                           <option key={branch} value={branch}>{text(branch)}</option>
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

                           {(activeTab === 'slow_appointment' || activeTab === 'slow_first_call' || activeTab === 'reclaim') && (
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
               <div className="flex gap-6 overflow-x-auto border-b border-slate-100 bg-white px-4 pt-4 pb-1">
                  <button
                     onClick={() => setActiveTab('slow_accept')}
                     className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${activeTab === 'slow_accept'
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
                     className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${activeTab === 'slow_appointment'
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
                     onClick={() => setActiveTab('slow_collaborator')}
                     className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${activeTab === 'slow_collaborator'
                        ? 'border-rose-600 text-rose-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                  >
                     <Users size={18} />
                     Chậm CTV
                     <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === 'slow_collaborator' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100'}`}>
                        {slowCollaboratorList.length}
                     </span>
                  </button>
                  <button
                     onClick={() => setActiveTab('slow_first_call')}
                     className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${activeTab === 'slow_first_call'
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
                     className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${activeTab === 'slow_list'
                        ? 'border-slate-700 text-slate-700'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                  >
                     <ListTodo size={18} />
                     Danh sách chậm
                     <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === 'slow_list' ? 'bg-slate-200 text-slate-800' : 'bg-slate-100'}`}>
                        {aggregatedSlowHistoryList.length}
                     </span>
                  </button>
                  <button
                     onClick={() => setActiveTab('reclaim')}
                     className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${activeTab === 'reclaim'
                        ? 'border-violet-700 text-violet-700'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                  >
                     <RotateCcw size={18} />
                     Lead thu hồi
                     <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === 'reclaim' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100'}`}>
                        {reclaimList.length}
                     </span>
                  </button>
                  <button
                     onClick={() => setActiveTab('report')}
                     className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${activeTab === 'report'
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
               {activeTab === 'reclaim' && selectedReclaimCount > 0 && (
                  <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                     <div className="text-sm text-slate-600">
                        <span className="font-bold text-slate-900">{selectedReclaimCount}</span> lead thu hồi đang được chọn
                     </div>
                     <button
                        onClick={() => openAssignModal()}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-blue-700"
                     >
                        <UserPlus size={16} /> Phân bổ
                     </button>
                  </div>
               )}
               {activeTab === 'report' ? (
                  <table className="w-full text-left border-collapse">
                     <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                           <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center w-16">STT</th>
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
                                 <td className="px-6 py-4 text-center text-sm font-semibold text-slate-500">{idx + 1}</td>
                                 <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                       {row.ownerId && rep.name !== 'Unknown' && rep.name !== '-' && (
                                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${rep.color}`}>{rep.avatar}</div>
                                       )}
                                       <span className="text-sm font-semibold text-slate-800">{text(repName)}</span>
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
                              <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
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
                           {activeTab === 'reclaim' && (
                              <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-12">
                                 <input
                                    type="checkbox"
                                    className="rounded border-slate-300"
                                    checked={allFilteredReclaimSelected}
                                    onChange={handleSelectAllReclaim}
                                 />
                              </th>
                           )}
                           <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center w-16">STT</th>
                           <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Họ tên & Nguồn</th>
                           <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Sale phụ trách</th>
                           <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Vấn đề (Issue)</th>
                           <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                           <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Thời gian trễ</th>
                           {activeTab !== 'reclaim' && <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Hành động</th>}
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                        {activeTab === 'slow_collaborator' ? (
                           <>
                              {filteredSlowCollaboratorList.map((item, idx) => {
                                 const collaborator = item.collaborator;
                                 const ownerId = normalizeText(collaborator.ownerId);
                                 const rep = getRepInfo(ownerId);
                                 const ownerLabel = text(collaborator.ownerName || getRepDisplayName(ownerId));
                                 const latestNote =
                                    Array.isArray(collaborator.activities) && collaborator.activities.length > 0
                                       ? text(collaborator.activities[0]?.description)
                                       : text(collaborator.notes || '');

                                 return (
                                    <tr key={`${collaborator.id}-collaborator-${idx}`} className="hover:bg-rose-50/40 transition-colors">
                                       <td className="px-6 py-4 text-center text-sm font-semibold text-slate-500">{idx + 1}</td>
                                       <td className="px-6 py-4">
                                          <div className="flex flex-col">
                                             <span className="text-sm font-bold text-slate-900">{text(collaborator.name)}</span>
                                             <div className="mt-1 flex items-center gap-2">
                                                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">CTV</span>
                                                <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-200">
                                                   {text(collaborator.city || UNKNOWN_BRANCH)}
                                                </span>
                                                <span className="text-xs text-slate-400">{text(collaborator.phone)}</span>
                                             </div>
                                          </div>
                                       </td>
                                       <td className="px-6 py-4">
                                          <div className="flex items-center gap-2">
                                             {ownerId && rep.name !== 'Unknown' && (
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${rep.color}`}>{rep.avatar}</div>
                                             )}
                                             <span className="text-sm font-medium text-slate-700">{ownerLabel || 'Chưa phân công'}</span>
                                          </div>
                                       </td>
                                       <td className="px-6 py-4 w-[30%]">
                                          <div className="flex flex-col gap-1 items-start">
                                             {item.isPreview && (
                                                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">Xem trước</span>
                                             )}
                                             <span className="bg-rose-100 text-rose-700 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">Chậm lịch hẹn CTV</span>
                                             <span className="text-xs text-slate-500 mt-1">
                                                Đã quá lịch hẹn chăm sóc cộng tác viên. {latestNote ? latestNote : 'Cần xử lý lại lịch hẹn tiếp theo.'}
                                             </span>
                                             {(collaborator.nextAppointment || item.isPreview) && (
                                                <span className="text-[11px] text-slate-400">
                                                   Lịch hẹn: {new Date(item.appointmentAt).toLocaleString('vi-VN')}
                                                </span>
                                             )}
                                          </div>
                                       </td>
                                       <td className="px-6 py-4">
                                          <span className="text-sm font-medium text-slate-700">{text(collaborator.status || 'New')}</span>
                                       </td>
                                       <td className="px-6 py-4">
                                          <span className="text-sm font-bold flex items-center gap-1 text-rose-700">
                                             <Clock size={16} /> {item.overdueText}
                                          </span>
                                       </td>
                                       <td className="px-6 py-4 text-right">
                                          <div className="flex items-center justify-end gap-2">
                                             <button
                                                onClick={() => openCollaboratorDetails(collaborator.id)}
                                                className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm font-bold shadow-sm transition-all whitespace-nowrap"
                                                title="Mở cộng tác viên để xử lý"
                                             >
                                                <Users size={14} /> Xử lý
                                             </button>
                                          </div>
                                       </td>
                                    </tr>
                                 );
                              })}

                              {filteredSlowCollaboratorList.length === 0 && (
                                 <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                       <div className="flex flex-col items-center gap-3">
                                          <CheckCircle2 size={48} className="text-green-500 opacity-50" />
                                          <p>Chưa có cộng tác viên nào đang chậm lịch hẹn theo SLA.</p>
                                       </div>
                                    </td>
                                 </tr>
                              )}
                           </>
                        ) : activeTab === 'slow_list' ? (
                           <>
                              {filteredSlowHistoryList.map((item, idx) => {
                                 const rep = getRepInfo(item.ownerId);
                                 const linkedLead = leads.find(lead => lead.id === item.leadId);
                                 const isResolved = !!item.resolvedAt;
                                 return (
                                    <tr
                                       key={`${item.id}-${idx}`}
                                       className={`hover:bg-slate-50 transition-colors ${linkedLead ? 'cursor-pointer' : ''}`}
                                       onClick={() => linkedLead && openLeadDetails(linkedLead.id)}
                                    >
                                       <td className="px-6 py-4 text-center text-sm font-semibold text-slate-500">{idx + 1}</td>
                                       <td className="px-6 py-4">
                                          <div className="flex flex-col">
                                             <span className="text-sm font-bold text-slate-900">{text(item.leadName)}</span>
                                             <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">{text(item.source || '-')}</span>
                                                <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-200">{text(ensureBranch(item.branch))}</span>
                                                <span className="text-xs text-slate-400">{text(item.phone)}</span>
                                             </div>
                                          </div>
                                       </td>
                                       <td className="px-6 py-4">
                                          <div className="flex items-center gap-2">
                                             {rep.name !== 'Unknown' && <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${rep.color}`}>{rep.avatar}</div>}
                                             <span className="text-sm font-medium text-slate-700">{text(getRepDisplayName(item.ownerId))}</span>
                                          </div>
                                       </td>
                                       <td className="px-6 py-4 w-[30%]">
                                          <div className="flex flex-col gap-1 items-start">
                                             <div className="flex flex-wrap gap-1">
                                                {item.slowTypes.map((slowType) => (
                                                   <React.Fragment key={`${item.leadId}-${slowType}`}>
                                                      {getSlowTypeBadge(slowType)}
                                                   </React.Fragment>
                                                ))}
                                             </div>
                                             <span className="text-xs text-slate-500 mt-1">{text(item.latestMessage)}</span>
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
                                             <span className="text-xs text-slate-500">{text(item.leadStatus || '-')}</span>
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
                                                   if (linkedLead) openLeadDetails(linkedLead.id);
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
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                       <div className="flex flex-col items-center gap-3">
                                          <CheckCircle2 size={48} className="text-green-500 opacity-50" />
                                          <p>Chưa có bản ghi chậm phù hợp bộ lọc.</p>
                                       </div>
                                    </td>
                                 </tr>
                              )}
                           </>
                        ) : activeTab === 'reclaim' ? (
                           <>
                              {filteredReclaimList.map((item, idx) => {
                                 const ownerDisplayId = item.previousOwnerId || item.currentOwnerId || item.lead.ownerId;
                                 const rep = getRepInfo(ownerDisplayId);
                                 const leadBranch = resolveLeadBranch(item.lead);
                                 return (
                                    <tr key={`${item.lead.id}-reclaim-${idx}`} className={`hover:bg-slate-50 transition-colors cursor-pointer ${selectedReclaimLeadSet.has(item.lead.id) ? 'bg-slate-50' : ''}`} onClick={() => openLeadDetails(item.lead.id)}>
                                       <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                                          <input
                                             type="checkbox"
                                             className="rounded border-slate-300 w-4 h-4"
                                             checked={selectedReclaimLeadSet.has(item.lead.id)}
                                             onChange={() => toggleReclaimLeadSelection(item.lead.id)}
                                          />
                                       </td>
                                        <td className="px-6 py-4 text-center text-sm font-semibold text-slate-500">{idx + 1}</td>
                                       <td className="px-6 py-4">
                                          <div className="flex flex-col">
                                             <span className="text-sm font-bold text-slate-900">{text(item.lead.name)}</span>
                                             <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">{text(item.lead.source)}</span>
                                                <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-200">{text(leadBranch)}</span>
                                                <span className="text-xs text-slate-400">{text(item.lead.phone)}</span>
                                             </div>
                                          </div>
                                       </td>
                                       <td className="px-6 py-4">
                                          <div className="flex items-center gap-2">
                                             {rep.name !== 'Unknown' && <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${rep.color}`}>{rep.avatar}</div>}
                                             <div className="flex flex-col">
                                                <span className="text-sm font-medium text-slate-700">{text(getRepDisplayName(ownerDisplayId))}</span>
                                                {item.isAlreadyReclaimed && (
                                                   <span className="text-[11px] text-slate-400">Đã thu hồi, hiện chưa phân công</span>
                                                )}
                                             </div>
                                          </div>
                                       </td>
                                       <td className="px-6 py-4 w-[30%]">
                                          <div className="flex flex-col gap-1 items-start">
                                             {getReclaimBadge(item)}
                                             <span className="text-xs text-slate-500 mt-1">{text(item.message)}</span>
                                             <span className="text-[11px] text-slate-400">
                                                {item.isAlreadyReclaimed ? 'Thu hồi lúc' : 'Mốc thu hồi'}: {new Date(item.isAlreadyReclaimed ? (item.reclaimedAt || item.triggerAt) : item.triggerAt).toLocaleString('vi-VN')}
                                             </span>
                                          </div>
                                       </td>
                                       <td className="px-6 py-4">
                                          <span className="text-sm font-medium text-slate-700 capitalize">
                                             {item.isAlreadyReclaimed ? 'Chờ phân bổ lại' : text(item.lead.status)}
                                          </span>
                                       </td>
                                       <td className="px-6 py-4">
                                          <span className="text-sm font-bold flex items-center gap-1 text-violet-700">
                                             <Clock size={16} /> {item.overdueText}
                                          </span>
                                       </td>
                                    </tr>
                                 );
                              })}

                              {filteredReclaimList.length === 0 && (
                                 <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                       <div className="flex flex-col items-center gap-3">
                                          <CheckCircle2 size={48} className="text-green-500 opacity-50" />
                                          <p>Chưa có lead nào tới ngưỡng thu hồi theo quy tắc hiện tại.</p>
                                       </div>
                                    </td>
                                 </tr>
                              )}
                           </>
                        ) : (
                           <>
                              {filteredList.map((warning, idx) => {
                                 const responsibleOwnerId = getWarningResponsibleOwnerId(warning);
                                 const rep = getRepInfo(responsibleOwnerId);
                                 const leadBranch = resolveLeadBranch(warning.lead);
                                 return (
                                    <tr key={`${warning.lead.id}-${idx}`} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => openLeadDetails(warning.lead.id)}>
                                       <td className="px-6 py-4 text-center text-sm font-semibold text-slate-500">{idx + 1}</td>
                                       <td className="px-6 py-4">
                                          <div className="flex flex-col">
                                             <span className="text-sm font-bold text-slate-900">{text(warning.lead.name)}</span>
                                             <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">{text(warning.lead.source)}</span>
                                                <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-200">{text(leadBranch)}</span>
                                                <span className="text-xs text-slate-400">{text(warning.lead.phone)}</span>
                                             </div>
                                          </div>
                                       </td>
                                       <td className="px-6 py-4">
                                          <div className="flex items-center gap-2">
                                             {rep.name !== 'Unknown' && <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${rep.color}`}>{rep.avatar}</div>}
                                             <span className="text-sm font-medium text-slate-700">{text(getRepDisplayName(responsibleOwnerId))}</span>
                                          </div>
                                       </td>
                                       <td className="px-6 py-4 w-[30%]">
                                          <div className="flex flex-col gap-1 items-start">
                                             {getWarningBadge(warning)}
                                             <span className="text-xs text-slate-500 mt-1">{text(warning.message)}</span>
                                          </div>
                                       </td>
                                       <td className="px-6 py-4">
                                          <span className="text-sm font-medium text-slate-700 capitalize">{text(warning.lead.status)}</span>
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
                                                   onClick={(e) => { e.stopPropagation(); openLeadDetails(warning.lead.id); }}
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
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
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

         {showAssignModal && (
            <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm">
               <div className="absolute inset-0" onClick={closeAssignModal}></div>
               <div className="relative flex min-h-full items-center justify-center py-4">
                  <div className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                     <h3 className="flex items-center gap-2 text-[15px] font-bold text-slate-900">
                        <UserPlus size={18} className="text-blue-600" />
                        {text('Phân bổ Lead thu hồi')}
                     </h3>
                     <button onClick={closeAssignModal} className="rounded-sm p-1 text-slate-400 hover:bg-white hover:text-slate-600">
                        <X size={18} />
                     </button>
                  </div>

                   <div className="min-h-0 space-y-4 overflow-y-auto p-4">
                     <div className="flex items-start gap-2 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-[12px] text-blue-800">
                        <Users size={16} className="mt-0.5 shrink-0" />
                        <p>{text('Bạn đang phân bổ')} <span className="font-bold">{selectedReclaimCount}</span> {text('lead thu hồi cho nhân viên kinh doanh.')}</p>
                     </div>

                     <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                        <div className="mb-3 flex flex-col gap-3 border-b border-slate-200 pb-3 sm:flex-row sm:items-center">
                           <label className="relative block flex-1">
                              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input
                                 type="text"
                                 value={assignRepSearch}
                                 onChange={(e) => setAssignRepSearch(e.target.value)}
                                 placeholder={text('Tìm tên sale...')}
                                 className="w-full rounded-sm border border-slate-300 bg-white py-2 pl-9 pr-3 text-[13px] text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                              />
                           </label>
                           <select
                              value={assignCampusFilter}
                              onChange={(e) => setAssignCampusFilter(e.target.value)}
                              className="rounded-sm border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-52"
                           >
                              <option value="all">{text('Tất cả cơ sở')}</option>
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
                                 className="rounded-sm border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-bold text-slate-700 hover:bg-slate-100"
                              >
                                 {text('Xóa lọc')}
                              </button>
                           )}
                        </div>

                        <div className="mb-3 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                           <span>
                              {text('Hiển thị')} <span className="font-semibold text-slate-700">{filteredAssignmentSalesReps.length}</span> / {assignmentSalesReps.length} sale
                           </span>
                           {assignCampusFilter !== 'all' && <span>{text('Cơ sở')}: {assignCampusFilter}</span>}
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                           <div>
                              <p className="text-[13px] font-bold text-slate-800">{text('Phân bổ theo số lượng')}</p>
                              <p className="mt-0.5 text-[11px] text-slate-500">{text('Nhập số lead cho từng sale. Tổng phải bằng số lead đã chọn.')}</p>
                           </div>
                           <div className="flex items-center gap-2">
                              <button
                                 type="button"
                                 onClick={fillAssignmentRatiosEvenly}
                                 className={`rounded-sm border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-bold text-slate-700 hover:bg-slate-100 ${filteredAssignmentSalesReps.length === 0 ? 'cursor-not-allowed opacity-50' : ''}`}
                                 disabled={filteredAssignmentSalesReps.length === 0}
                              >
                                 {text('Chia đều số lượng')}
                              </button>
                              <button type="button" onClick={resetAssignModal} className="rounded-sm border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-bold text-slate-700 hover:bg-slate-100">
                                 Reset
                              </button>
                           </div>
                        </div>

                        <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-2">
                           <div>
                              <div className="text-[11px] text-slate-500">{text('Tổng phân bổ')}</div>
                              <div className={`text-[15px] font-bold ${assignmentRatioTotal === selectedReclaimCount ? 'text-emerald-600' : 'text-amber-600'}`}>{assignmentRatioTotal}</div>
                           </div>
                           <div>
                              <div className="text-[11px] text-slate-500">{text('Tổng lead')}</div>
                              <div className="text-[15px] font-bold text-slate-900">{selectedReclaimCount}</div>
                           </div>
                           <div>
                              <div className="text-[11px] text-slate-500">{text('Số sale tham gia')}</div>
                              <div className="text-[15px] font-bold text-slate-900">{Object.values(assignmentRatioValues).filter((value) => value > 0).length}</div>
                           </div>
                        </div>
                     </div>

                     <div>
                        <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">{text('Số lượng theo nhân viên')}</label>
                        {filteredAssignmentSalesReps.length === 0 ? (
                           <div className="flex h-24 items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50 text-[12px] text-slate-500">
                              {text('Không tìm thấy sale phù hợp với bộ lọc hiện tại.')}
                           </div>
                        ) : (
                        <div className="max-h-[340px] overflow-y-auto">
                           {filteredAssignmentSalesReps.map((rep) => {
                              const ratioValue = assignmentRatios[rep.id] || '';
                              const ratio = assignmentRatioValues[rep.id] || 0;
                              const leadCount = assignmentLeadCounts[rep.id] || 0;
                              const isActive = ratio > 0 || ratioValue !== '';

                              return (
                                 <div key={rep.id} className={`border-b border-slate-100 py-2 transition-colors ${isActive ? 'bg-blue-50/40' : 'bg-white'}`}>
                                    <div className="flex items-center gap-3">
                                       <div className={`flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold ${rep.color}`}>
                                          {rep.avatar}
                                       </div>
                                       <div className="min-w-0 flex-1">
                                          <p className="text-[13px] font-semibold text-slate-900">{text(rep.name)}</p>
                                          <p className="text-[11px] text-slate-500">{rep.branch ? `${text(rep.team)} | ${text(rep.branch)}` : text(rep.team)}</p>
                                       </div>
                                       <div className="flex items-center gap-2">
                                          <input
                                             type="number"
                                             min={0}
                                             max={selectedReclaimCount}
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
                                           {ratio > 0 ? `${text('Dự kiến nhận')} ${leadCount} lead` : text('Chưa tham gia phân bổ')}
                                       </p>
                                       <button
                                          type="button"
                                          onClick={() => setSingleRepAssignment(rep.id)}
                                          className="rounded-sm border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-100"
                                       >
                                           {text('Giao hết cho sale này')}
                                       </button>
                                    </div>
                                 </div>
                              );
                           })}
                        </div>
                        )}
                     </div>
                  </div>

                   <div className="flex shrink-0 justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
                     <button onClick={closeAssignModal} className="rounded-sm px-3 py-1.5 text-[12px] font-bold text-slate-600 hover:bg-slate-200">{text('Hủy')}</button>
                     <button
                        onClick={handleAssignReclaimedLead}
                        className={`rounded-sm px-4 py-1.5 text-[12px] font-bold text-white transition-colors ${assignmentRatioTotal === selectedReclaimCount && selectedReclaimCount > 0 ? 'bg-blue-600 hover:bg-blue-700' : 'cursor-not-allowed bg-slate-400'}`}
                        disabled={assignmentRatioTotal !== selectedReclaimCount || selectedReclaimCount === 0}
                     >
                        {text('Xác nhận Phân bổ')}
                     </button>
                   </div>
                  </div>
               </div>
            </div>
         )}

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
