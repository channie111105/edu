import { decodeMojibakeText } from './mojibake';

export type SystemCatalogId =
  | 'targetCountries'
  | 'products'
  | 'campuses'
  | 'educationLevels'
  | 'leadSources'
  | 'leadChannels';

export interface SystemCatalogOption {
  value: string;
  label: string;
}

const STORAGE_KEY = 'educrm_system_catalogs';
export const SYSTEM_CONFIG_EVENT = 'educrm:system-config-changed';

const normalizeText = (value: unknown) =>
  decodeMojibakeText(String(value || ''))
    .replace(/\s+/g, ' ')
    .trim();

const normalizeToken = (value: unknown) =>
  normalizeText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');

const DEFAULT_SYSTEM_CATALOGS: Record<SystemCatalogId, SystemCatalogOption[]> = {
  targetCountries: [
    { value: 'Đức', label: 'Đức' },
    { value: 'Trung', label: 'Trung' },
  ],
  products: [
    { value: 'App Tiếng Đức', label: 'App Tiếng Đức' },
    { value: 'App Tiếng Trung', label: 'App Tiếng Trung' },
    { value: 'Tiếng Đức Off', label: 'Tiếng Đức Off' },
    { value: 'Tiếng Trung Off', label: 'Tiếng Trung Off' },
    { value: 'Du Học Nghề', label: 'Du Học Nghề' },
    { value: 'Du Học Đức', label: 'Du Học Đức' },
    { value: 'Du Học Trung', label: 'Du Học Trung' },
  ],
  campuses: [
    { value: 'Hà Nội', label: 'Hà Nội' },
  ],
  educationLevels: [
    { value: 'THCS', label: 'THCS' },
    { value: 'THPT', label: 'THPT' },
    { value: 'Trung cấp', label: 'Trung cấp' },
    { value: 'Cao đẳng', label: 'Cao đẳng' },
    { value: 'Đại học', label: 'Đại học' },
    { value: 'Sau đại học', label: 'Sau đại học' },
  ],
  leadSources: [
    { value: 'facebook', label: 'Facebook' },
    { value: 'tiktok', label: 'TikTok' },
    { value: 'google', label: 'Google Search' },
    { value: 'hotline', label: 'Hotline' },
    { value: 'referral', label: 'Giới thiệu' },
  ],
  leadChannels: [
    { value: 'fb', label: 'Facebook' },
    { value: 'zl', label: 'Zalo' },
    { value: 'tik', label: 'Tiktok' },
    { value: 'gg', label: 'Google' },
    { value: 'hotline', label: 'Hotline' },
    { value: 'vang_lai', label: 'Vãng lai' },
    { value: 'ca_nhan', label: 'Cá nhân' },
    { value: 'thi_truong', label: 'Thị trường' },
  ],
};

const cloneCatalog = (items: SystemCatalogOption[]) => items.map((item) => ({ ...item }));

const normalizeCatalogOption = (
  item: Partial<SystemCatalogOption> | string,
  fallbackIndex: number,
): SystemCatalogOption | null => {
  const rawValue = typeof item === 'string' ? item : item.value || item.label;
  const rawLabel = typeof item === 'string' ? item : item.label || item.value;
  const value = normalizeText(rawValue);
  const label = normalizeText(rawLabel);

  if (!value || !label) return null;

  return {
    value,
    label,
  };
};

const sortCatalog = (items: SystemCatalogOption[]) =>
  [...items].sort((left, right) => left.label.localeCompare(right.label, 'vi'));

const normalizeCatalog = (
  catalogId: SystemCatalogId,
  items: unknown,
): SystemCatalogOption[] => {
  const sourceItems = Array.isArray(items) ? items : DEFAULT_SYSTEM_CATALOGS[catalogId];
  const uniqueItems = new Map<string, SystemCatalogOption>();

  sourceItems.forEach((item, index) => {
    const normalized = normalizeCatalogOption((item || {}) as Partial<SystemCatalogOption>, index);
    if (!normalized) return;
    const key = normalizeToken(normalized.label) || normalizeToken(normalized.value);
    if (!key || uniqueItems.has(key)) return;
    uniqueItems.set(key, normalized);
  });

  if (!Array.isArray(items) && uniqueItems.size === 0) {
    return cloneCatalog(DEFAULT_SYSTEM_CATALOGS[catalogId]);
  }

  return sortCatalog(Array.from(uniqueItems.values()));
};

const readStoredCatalogs = (): Partial<Record<SystemCatalogId, SystemCatalogOption[]>> => {
  if (typeof window === 'undefined') return {};

  try {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);
    return storedValue ? JSON.parse(storedValue) : {};
  } catch {
    return {};
  }
};

const emitCatalogChange = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(SYSTEM_CONFIG_EVENT));
};

export const getSystemCatalog = (catalogId: SystemCatalogId): SystemCatalogOption[] => {
  const storedCatalogs = readStoredCatalogs();
  return normalizeCatalog(catalogId, storedCatalogs[catalogId]);
};

export const saveSystemCatalog = (
  catalogId: SystemCatalogId,
  items: SystemCatalogOption[],
): SystemCatalogOption[] => {
  if (typeof window === 'undefined') {
    return normalizeCatalog(catalogId, items);
  }

  const storedCatalogs = readStoredCatalogs();
  const nextCatalog = normalizeCatalog(catalogId, items);
  const nextState: Partial<Record<SystemCatalogId, SystemCatalogOption[]>> = {
    ...storedCatalogs,
    [catalogId]: nextCatalog,
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  syncSystemCatalogBindings();
  emitCatalogChange();
  return nextCatalog;
};

export const createSystemCatalogOption = (label: string): SystemCatalogOption => {
  const normalizedLabel = normalizeText(label);
  return {
    value: normalizedLabel,
    label: normalizedLabel,
  };
};

export const isDefaultSystemCatalogValue = (catalogId: SystemCatalogId, value: string) => {
  const targetToken = normalizeToken(value);
  return DEFAULT_SYSTEM_CATALOGS[catalogId].some((item) => normalizeToken(item.value) === targetToken);
};

export let LEAD_TARGET_COUNTRY_OPTIONS = getSystemCatalog('targetCountries');
export let LEAD_PRODUCT_OPTIONS = getSystemCatalog('products');
export let LEAD_CAMPUS_OPTIONS = getSystemCatalog('campuses');
export let STUDENT_EDUCATION_LEVEL_OPTIONS = getSystemCatalog('educationLevels');
export let LEAD_SOURCE_OPTIONS = getSystemCatalog('leadSources');
export let LEAD_CHANNEL_OPTIONS = getSystemCatalog('leadChannels');

export const syncSystemCatalogBindings = () => {
  LEAD_TARGET_COUNTRY_OPTIONS = getSystemCatalog('targetCountries');
  LEAD_PRODUCT_OPTIONS = getSystemCatalog('products');
  LEAD_CAMPUS_OPTIONS = getSystemCatalog('campuses');
  STUDENT_EDUCATION_LEVEL_OPTIONS = getSystemCatalog('educationLevels');
  LEAD_SOURCE_OPTIONS = getSystemCatalog('leadSources');
  LEAD_CHANNEL_OPTIONS = getSystemCatalog('leadChannels');
};

if (typeof window !== 'undefined') {
  window.addEventListener('storage', syncSystemCatalogBindings);
  window.addEventListener(SYSTEM_CONFIG_EVENT, syncSystemCatalogBindings as EventListener);
}
