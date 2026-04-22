import { ILead } from '../types';
import type { ToolbarValueOption } from './filterToolbar';
import {
  LEAD_CAMPUS_OPTIONS,
  LEAD_POTENTIAL_OPTIONS,
  LEAD_PRODUCT_OPTIONS,
  LEAD_SOURCE_OPTIONS,
  LEAD_TARGET_COUNTRY_OPTIONS,
} from './leadCreateForm';
import { getPickedLeadFirstActionDeadline } from './leadSla';
import { getLeadStatusLabel, LEAD_STATUS_KEYS, LEAD_STATUS_OPTIONS, normalizeLeadStatusKey } from './leadStatus';
import { decodeMojibakeText } from './mojibake';

export type LeadActionFilterField = 'createdAt' | 'assignedAt' | 'appointment' | 'sla' | 'lastInteraction';
export type LeadActionFilterSelection = 'action' | LeadActionFilterField;

export type LeadToolbarFieldKey =
  | 'status'
  | 'salesperson'
  | 'source'
  | 'campaign'
  | 'product'
  | 'targetCountry'
  | 'potential'
  | 'company'
  | 'market';

export type LeadToolbarFilterFieldKey = Exclude<LeadToolbarFieldKey, 'market'>;
export type LeadToolbarGroupFieldKey = Exclude<LeadToolbarFieldKey, 'targetCountry'>;

export const DEFAULT_LEAD_ACTION_FILTER_FIELD: LeadActionFilterField = 'createdAt';

export const LEAD_TOOLBAR_TIME_PRESETS = [
  { id: 'all', label: 'Tất cả thời gian' },
  { id: 'today', label: 'Hôm nay' },
  { id: 'yesterday', label: 'Hôm qua' },
  { id: 'thisWeek', label: 'Tuần này' },
  { id: 'last7Days', label: '7 ngày qua' },
  { id: 'last30Days', label: '30 ngày qua' },
  { id: 'thisMonth', label: 'Tháng này' },
  { id: 'lastMonth', label: 'Tháng trước' },
  { id: 'custom', label: 'Tùy chỉnh khoảng...' },
] as const;

export const LEAD_TOOLBAR_TIME_FIELD_OPTIONS: ReadonlyArray<{
  id: LeadActionFilterSelection;
  label: string;
}> = [
  { id: 'action', label: 'Hành động' },
  { id: 'createdAt', label: 'Ngày tạo' },
  { id: 'assignedAt', label: 'Ngày assign' },
  { id: 'appointment', label: 'Lịch hẹn' },
  { id: 'sla', label: 'SLA' },
  { id: 'lastInteraction', label: 'Lần tương tác cuối' },
];

export const LEAD_TOOLBAR_FIELD_OPTIONS: ReadonlyArray<{
  id: LeadToolbarFieldKey;
  label: string;
}> = [
  { id: 'status', label: 'Trạng thái lead' },
  { id: 'salesperson', label: 'Nhân viên phụ trách' },
  { id: 'source', label: 'Nguồn lead' },
  { id: 'campaign', label: 'Chiến dịch' },
  { id: 'product', label: 'Sản phẩm quan tâm' },
  { id: 'targetCountry', label: 'Quốc gia' },
  { id: 'potential', label: 'Mức độ tiềm năng' },
  { id: 'company', label: 'Cơ sở' },
  { id: 'market', label: 'Thị trường' },
];

export const LEAD_TOOLBAR_FILTER_OPTIONS = LEAD_TOOLBAR_FIELD_OPTIONS.filter((field) =>
  ['status', 'salesperson', 'source', 'campaign', 'product', 'targetCountry', 'potential', 'company'].includes(field.id)
) as ReadonlyArray<{ id: LeadToolbarFilterFieldKey; label: string }>;

export const LEAD_TOOLBAR_GROUP_OPTIONS = LEAD_TOOLBAR_FIELD_OPTIONS.filter((field) =>
  ['status', 'salesperson', 'source', 'campaign', 'product', 'market', 'potential', 'company'].includes(field.id)
) as ReadonlyArray<{ id: LeadToolbarGroupFieldKey; label: string }>;

export const LEAD_TOOLBAR_FIELD_LABELS = LEAD_TOOLBAR_FIELD_OPTIONS.reduce<Record<LeadToolbarFieldKey, string>>((acc, field) => {
  acc[field.id] = field.label;
  return acc;
}, {} as Record<LeadToolbarFieldKey, string>);

export const LEAD_TOOLBAR_TIME_FIELD_LABELS: Record<LeadActionFilterField, string> = {
  createdAt: 'Ngày tạo',
  assignedAt: 'Ngày assign',
  appointment: 'Lịch hẹn',
  sla: 'SLA',
  lastInteraction: 'Lần tương tác cuối',
};

const LEAD_SLA_ACK_TIME_MINUTES = 15;
const LEAD_SLA_FIRST_ACTION_TIME_MINUTES = 120;
const LEAD_SLA_NEGLECT_TIME_HOURS = 72;

const normalizeToolbarText = (value: unknown) => decodeMojibakeText(String(value || '')).trim();
const normalizeToolbarToken = (value: unknown) =>
  normalizeToolbarText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '')
    .toLowerCase();

const mapLabelsToOptions = (labels: ReadonlyArray<string>): ToolbarValueOption[] =>
  labels
    .map((label) => normalizeToolbarText(label))
    .filter(Boolean)
    .map((label) => ({ value: label, label }));

const mergeToolbarValueOptions = (
  ...groups: Array<ReadonlyArray<ToolbarValueOption> | undefined>
) => {
  const optionMap = new Map<string, ToolbarValueOption>();

  groups.forEach((group) => {
    group?.forEach((option) => {
      const label = normalizeToolbarText(option.label || option.value);
      if (!label) return;
      const key = normalizeToolbarToken(label);
      if (!key || optionMap.has(key)) return;
      optionMap.set(key, { value: label, label });
    });
  });

  return Array.from(optionMap.values()).sort((left, right) => left.label.localeCompare(right.label, 'vi'));
};

export const getLeadToolbarSourceLabel = (source?: string) => {
  const rawValue = normalizeToolbarText(source);
  const token = normalizeToolbarToken(rawValue);

  if (!token) return '';
  if (['facebook', 'fb', 'fbleadform', 'facebookads'].includes(token)) return 'Facebook';
  if (['tiktok', 'tik', 'tiktokads'].includes(token)) return 'TikTok';
  if (['google', 'gg', 'googleads', 'googlesearch'].includes(token)) return 'Google Search';
  if (['hotline'].includes(token)) return 'Hotline';
  if (['referral', 'gioithieu', 'ref'].includes(token)) return 'Giới thiệu';
  return rawValue;
};

export const getLeadToolbarPotentialLabel = (potential?: string) => {
  const rawValue = normalizeToolbarText(potential);
  const token = normalizeToolbarToken(rawValue);

  if (!token) return '';
  if (['nong', 'hot'].includes(token)) return 'Nóng';
  if (['tiemnang', 'potential'].includes(token)) return 'Tiềm năng';
  if (['thamkhao', 'reference', 'cold'].includes(token)) return 'Tham khảo';
  return rawValue;
};

const getCatalogLabel = (
  options: ReadonlyArray<string | { value: string; label: string }>,
  value?: string
) => {
  const rawValue = normalizeToolbarText(value);
  const token = normalizeToolbarToken(rawValue);
  if (!token) return '';

  for (const option of options) {
    const candidateLabel = normalizeToolbarText(typeof option === 'string' ? option : option.label);
    const candidateValue = normalizeToolbarText(typeof option === 'string' ? option : option.value);
    if ([candidateLabel, candidateValue].some((candidate) => normalizeToolbarToken(candidate) === token)) {
      return candidateLabel;
    }
  }

  return rawValue;
};

export const getLeadToolbarTimeFieldLabel = (field: LeadActionFilterSelection) =>
  field === 'action' ? 'Hành động' : LEAD_TOOLBAR_TIME_FIELD_LABELS[field];

export const getLeadScheduledActivity = (lead: ILead) => {
  const activities = Array.isArray(lead.activities) ? lead.activities : [];

  return activities
    .filter((activity: any) => activity?.type === 'activity' && activity?.datetime)
    .sort((first: any, second: any) => {
      const firstTime = new Date(first.datetime).getTime();
      const secondTime = new Date(second.datetime).getTime();

      if (Number.isNaN(firstTime) && Number.isNaN(secondTime)) return 0;
      if (Number.isNaN(firstTime)) return 1;
      if (Number.isNaN(secondTime)) return -1;
      return firstTime - secondTime;
    })[0];
};

export const getLeadToolbarTimeValue = (lead: ILead, field: LeadActionFilterField) => {
  const createdAt = lead.createdAt ? new Date(lead.createdAt) : null;
  const createdAtDate = createdAt && !Number.isNaN(createdAt.getTime()) ? createdAt : null;

  switch (field) {
    case 'createdAt':
      return lead.createdAt;
    case 'assignedAt':
      return lead.pickUpDate;
    case 'appointment':
      return getLeadScheduledActivity(lead)?.datetime;
    case 'lastInteraction':
      return lead.lastInteraction;
    case 'sla': {
      if (!createdAtDate) return undefined;

      const userActivities = (Array.isArray(lead.activities) ? lead.activities : []).filter((activity: any) => activity?.type !== 'system');
      const hasInteractions = userActivities.length > 0;
      const normalizedStatus = normalizeLeadStatusKey(String(lead.status || ''));

      if (normalizedStatus === LEAD_STATUS_KEYS.NEW) {
        return new Date(createdAtDate.getTime() + LEAD_SLA_ACK_TIME_MINUTES * 60 * 1000).toISOString();
      }

      if (!hasInteractions) {
        const pickedLeadDeadline = getPickedLeadFirstActionDeadline(lead.pickUpDate, LEAD_SLA_FIRST_ACTION_TIME_MINUTES);
        if (pickedLeadDeadline) {
          return pickedLeadDeadline.toISOString();
        }

        return new Date(createdAtDate.getTime() + LEAD_SLA_FIRST_ACTION_TIME_MINUTES * 60 * 1000).toISOString();
      }

      const lastInteractionDate = lead.lastInteraction ? new Date(lead.lastInteraction) : createdAtDate;
      if (Number.isNaN(lastInteractionDate.getTime())) return undefined;

      return new Date(lastInteractionDate.getTime() + LEAD_SLA_NEGLECT_TIME_HOURS * 60 * 60 * 1000).toISOString();
    }
    default:
      return undefined;
  }
};

export const getLeadToolbarFieldValues = (
  lead: ILead,
  field: LeadToolbarFieldKey,
  options?: { getSalespersonLabel?: (lead: ILead) => string }
) => {
  const salespersonLabel = options?.getSalespersonLabel?.(lead) || lead.ownerId || '';

  const rawValues = (() => {
    switch (field) {
      case 'status':
        return [getLeadStatusLabel(String(lead.status || '')) || normalizeLeadStatusKey(String(lead.status || ''))];
      case 'salesperson':
        return [normalizeToolbarText(salespersonLabel)];
      case 'source':
        return [getLeadToolbarSourceLabel(lead.source)];
      case 'campaign':
        return [lead.campaign || lead.marketingData?.campaign || ''];
      case 'product':
        return [getCatalogLabel(LEAD_PRODUCT_OPTIONS, lead.product || lead.program || '')];
      case 'targetCountry':
        return [getCatalogLabel(LEAD_TARGET_COUNTRY_OPTIONS, lead.targetCountry || lead.studentInfo?.targetCountry || '')];
      case 'potential':
        return [getLeadToolbarPotentialLabel((lead as any).potential || lead.internalNotes?.potential || '')];
      case 'company':
        return [getCatalogLabel(LEAD_CAMPUS_OPTIONS, lead.company || lead.marketingData?.region || '')];
      case 'market':
        return [getCatalogLabel(LEAD_CAMPUS_OPTIONS, lead.marketingData?.market || '')];
      default:
        return [];
    }
  })();

  return Array.from(new Set(rawValues.map(normalizeToolbarText).filter(Boolean)));
};

export const getLeadToolbarFieldValue = (
  lead: ILead,
  field: LeadToolbarFieldKey,
  options?: { getSalespersonLabel?: (lead: ILead) => string; emptyLabel?: string }
) => {
  const values = getLeadToolbarFieldValues(lead, field, options);
  return values[0] || options?.emptyLabel || 'Chưa có dữ liệu';
};

export const getLeadToolbarSelectableOptions = (
  field: LeadToolbarFilterFieldKey,
  options?: {
    salesOptions?: ReadonlyArray<{ value: string; label: string }>;
    dynamicValues?: ReadonlyArray<string>;
  }
) => {
  const baseOptions = (() => {
    switch (field) {
      case 'status':
        return mapLabelsToOptions(LEAD_STATUS_OPTIONS.map((option) => option.label));
      case 'salesperson':
        return mapLabelsToOptions((options?.salesOptions || []).map((option) => option.label));
      case 'source':
        return mapLabelsToOptions(LEAD_SOURCE_OPTIONS.map((option) => option.label));
      case 'campaign':
        return [];
      case 'product':
        return mapLabelsToOptions(LEAD_PRODUCT_OPTIONS.map((option) => option.label));
      case 'targetCountry':
        return mapLabelsToOptions([...LEAD_TARGET_COUNTRY_OPTIONS]);
      case 'potential':
        return mapLabelsToOptions(LEAD_POTENTIAL_OPTIONS.map((option) => option.label));
      case 'company':
        return mapLabelsToOptions([...LEAD_CAMPUS_OPTIONS]);
      default:
        return [];
    }
  })();

  return mergeToolbarValueOptions(
    baseOptions,
    mapLabelsToOptions(options?.dynamicValues || [])
  );
};
