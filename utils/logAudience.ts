import { IActualTransactionLog, ILogNote, IQuotationLogNote, IRefundLog } from '../types';

export type LogAudienceFilter = 'ALL' | 'SYSTEM' | 'USER';

const normalizeActor = (value?: string) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const SYSTEM_ACTORS = new Set([
  'system',
  'he thong',
  'hệ thống',
  'automation',
  'auto'
]);

export const isSystemActor = (value?: string) => {
  const normalized = normalizeActor(value);
  return SYSTEM_ACTORS.has(normalized) || normalized.startsWith('system ') || normalized.startsWith('he thong');
};

export const filterByLogAudience = <T,>(
  items: T[],
  audience: LogAudienceFilter,
  getAudience: (item: T) => Exclude<LogAudienceFilter, 'ALL'>
) => {
  if (audience === 'ALL') return items;
  return items.filter((item) => getAudience(item) === audience);
};

export const getILogNoteAudience = (item: ILogNote): Exclude<LogAudienceFilter, 'ALL'> =>
  item.category === 'USER' ? 'USER' : 'SYSTEM';

export const getQuotationLogAudience = (item: IQuotationLogNote): Exclude<LogAudienceFilter, 'ALL'> =>
  item.type === 'system' ? 'SYSTEM' : 'USER';

export const getActualTransactionLogAudience = (item: IActualTransactionLog): Exclude<LogAudienceFilter, 'ALL'> =>
  isSystemActor(item.createdBy) || /tu dong|tự động/i.test(item.message) ? 'SYSTEM' : 'USER';

export const getRefundLogAudience = (item: IRefundLog): Exclude<LogAudienceFilter, 'ALL'> =>
  isSystemActor(item.createdBy) ? 'SYSTEM' : 'USER';
