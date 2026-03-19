import { DealStage, LeadStatus } from '../types';

export const LEAD_STATUS_KEYS = {
  NEW: 'new',
  ASSIGNED: 'assigned',
  PICKED: 'picked',
  CONTACTED: 'contacted',
  CONVERTED: 'converted',
  NURTURING: 'nurturing',
  UNVERIFIED: 'unverified',
  LOST: 'lost',
} as const;

export type LeadStatusKey = typeof LEAD_STATUS_KEYS[keyof typeof LEAD_STATUS_KEYS];

export const CLOSED_LEAD_STATUS_KEYS = [
  LEAD_STATUS_KEYS.LOST,
  LEAD_STATUS_KEYS.UNVERIFIED,
] as const;

export const LEAD_STATUS_LABELS: Record<LeadStatusKey, string> = {
  [LEAD_STATUS_KEYS.NEW]: 'Lead mới',
  [LEAD_STATUS_KEYS.ASSIGNED]: 'Đã phân bổ',
  [LEAD_STATUS_KEYS.PICKED]: 'Đã nhận',
  [LEAD_STATUS_KEYS.CONTACTED]: 'Đang chăm sóc',
  [LEAD_STATUS_KEYS.CONVERTED]: 'Đã converted',
  [LEAD_STATUS_KEYS.NURTURING]: 'Nuôi dưỡng',
  [LEAD_STATUS_KEYS.UNVERIFIED]: 'Không xác thực',
  [LEAD_STATUS_KEYS.LOST]: 'Mất',
};

export const LEAD_STATUS_OPTIONS = (Object.values(LEAD_STATUS_KEYS) as LeadStatusKey[]).map((value) => ({
  value,
  label: LEAD_STATUS_LABELS[value],
}));

const LEAD_STATUS_VALUE_BY_KEY: Record<LeadStatusKey, string> = {
  [LEAD_STATUS_KEYS.NEW]: LeadStatus.NEW,
  [LEAD_STATUS_KEYS.ASSIGNED]: LeadStatus.ASSIGNED,
  [LEAD_STATUS_KEYS.PICKED]: LeadStatus.PICKED,
  [LEAD_STATUS_KEYS.CONTACTED]: LeadStatus.CONTACTED,
  [LEAD_STATUS_KEYS.CONVERTED]: LeadStatus.CONVERTED,
  [LEAD_STATUS_KEYS.NURTURING]: LeadStatus.NURTURING,
  [LEAD_STATUS_KEYS.UNVERIFIED]: LeadStatus.UNVERIFIED,
  [LEAD_STATUS_KEYS.LOST]: LeadStatus.LOST,
};

const normalizeStatusToken = (value?: string) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');

const STATUS_NORMALIZATION_MAP: Record<string, LeadStatusKey> = {
  new: LEAD_STATUS_KEYS.NEW,
  leadmoi: LEAD_STATUS_KEYS.NEW,
  moi: LEAD_STATUS_KEYS.NEW,
  assigned: LEAD_STATUS_KEYS.ASSIGNED,
  daphanbo: LEAD_STATUS_KEYS.ASSIGNED,
  phanbo: LEAD_STATUS_KEYS.ASSIGNED,
  picked: LEAD_STATUS_KEYS.PICKED,
  pickuplead: LEAD_STATUS_KEYS.PICKED,
  danhan: LEAD_STATUS_KEYS.PICKED,
  danhanlead: LEAD_STATUS_KEYS.PICKED,
  tiepnhan: LEAD_STATUS_KEYS.PICKED,
  contacted: LEAD_STATUS_KEYS.CONTACTED,
  dangchamsoc: LEAD_STATUS_KEYS.CONTACTED,
  danglienhe: LEAD_STATUS_KEYS.CONTACTED,
  nurturing: LEAD_STATUS_KEYS.NURTURING,
  nuoiduong: LEAD_STATUS_KEYS.NURTURING,
  converted: LEAD_STATUS_KEYS.CONVERTED,
  daconverted: LEAD_STATUS_KEYS.CONVERTED,
  dachuyendoi: LEAD_STATUS_KEYS.CONVERTED,
  dachuyendoiqua: LEAD_STATUS_KEYS.CONVERTED,
  qualified: LEAD_STATUS_KEYS.CONVERTED,
  datchuan: LEAD_STATUS_KEYS.CONVERTED,
  unverifiable: LEAD_STATUS_KEYS.UNVERIFIED,
  unverified: LEAD_STATUS_KEYS.UNVERIFIED,
  notverified: LEAD_STATUS_KEYS.UNVERIFIED,
  khongxacthuc: LEAD_STATUS_KEYS.UNVERIFIED,
  unreachable: LEAD_STATUS_KEYS.UNVERIFIED,
  khongnghemay: LEAD_STATUS_KEYS.UNVERIFIED,
  disqualified: LEAD_STATUS_KEYS.UNVERIFIED,
  unqualified: LEAD_STATUS_KEYS.UNVERIFIED,
  khongdat: LEAD_STATUS_KEYS.UNVERIFIED,
  lost: LEAD_STATUS_KEYS.LOST,
  mat: LEAD_STATUS_KEYS.LOST,
  thatbai: LEAD_STATUS_KEYS.LOST,
  thatbailost: LEAD_STATUS_KEYS.LOST,
  chotthanhcongwon: LEAD_STATUS_KEYS.CONVERTED,
  won: LEAD_STATUS_KEYS.CONVERTED,
  contract: LEAD_STATUS_KEYS.CONVERTED,
  newopp: LEAD_STATUS_KEYS.CONVERTED,
  tuvanchuyensau: LEAD_STATUS_KEYS.CONVERTED,
  guilotrinhbaogia: LEAD_STATUS_KEYS.CONVERTED,
  thuongthao: LEAD_STATUS_KEYS.CONVERTED,
  thuthaphoso: LEAD_STATUS_KEYS.CONVERTED,
  aftersale: LEAD_STATUS_KEYS.CONVERTED,
};

export const normalizeLeadStatusKey = (status?: string): LeadStatusKey => {
  const token = normalizeStatusToken(status);
  return STATUS_NORMALIZATION_MAP[token] || LEAD_STATUS_KEYS.NEW;
};

export const getLeadStatusLabel = (status?: string) => LEAD_STATUS_LABELS[normalizeLeadStatusKey(status)];

export const toLeadStatusValue = (status?: string): string => {
  const normalized = normalizeLeadStatusKey(status);
  return LEAD_STATUS_VALUE_BY_KEY[normalized];
};

export const isClosedLeadStatusKey = (status?: string) =>
  CLOSED_LEAD_STATUS_KEYS.includes(normalizeLeadStatusKey(status) as typeof CLOSED_LEAD_STATUS_KEYS[number]);

export const isConvertedLeadStatus = (status?: string) => {
  const normalized = normalizeLeadStatusKey(status);
  return normalized === LEAD_STATUS_KEYS.CONVERTED || status === DealStage.WON || status === DealStage.CONTRACT;
};
