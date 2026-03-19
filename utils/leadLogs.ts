import { IActivityLog, ILead, ILeadAuditFieldChange, ILeadAuditLog } from '../types';

type LeadLogActorType = 'user' | 'system';

type LeadActivityInput = {
  type?: IActivityLog['type'];
  title: string;
  description: string;
  user: string;
  timestamp?: string;
  status?: IActivityLog['status'];
  datetime?: string;
};

type LeadAuditInput = {
  action: string;
  actor: string;
  actorType?: LeadLogActorType;
  timestamp?: string;
  changes: ILeadAuditFieldChange[];
};

const toAuditText = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '(trống)';
  if (Array.isArray(value)) return value.length ? value.map(toAuditText).join(', ') : '(trống)';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return String(value);
};

export const buildLeadAuditChange = (
  field: string,
  before: unknown,
  after: unknown,
  label?: string
): ILeadAuditFieldChange => ({
  field,
  label,
  before: toAuditText(before),
  after: toAuditText(after)
});

export const buildLeadActivityLog = ({
  type = 'system',
  title,
  description,
  user,
  timestamp = new Date().toISOString(),
  status,
  datetime
}: LeadActivityInput): IActivityLog => ({
  id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  type,
  timestamp,
  title,
  description,
  user,
  status,
  datetime
});

export const buildLeadAuditLog = ({
  action,
  actor,
  actorType = 'user',
  timestamp = new Date().toISOString(),
  changes
}: LeadAuditInput): ILeadAuditLog => ({
  id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  timestamp,
  action,
  actor,
  actorType,
  changes
});

export const appendLeadLogs = (
  lead: ILead,
  logs?: {
    activities?: IActivityLog[];
    audits?: ILeadAuditLog[];
  }
): ILead => ({
  ...lead,
  activities: [...(logs?.activities || []), ...(lead.activities || [])],
  auditLogs: [...(logs?.audits || []), ...(lead.auditLogs || [])]
});

