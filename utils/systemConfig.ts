import { decodeMojibakeText } from './mojibake';

export type SystemCatalogId =
  | 'targetCountries'
  | 'products'
  | 'campuses'
  | 'educationLevels'
  | 'leadSources'
  | 'leadChannels'
  | 'teams'
  | 'leadPotentials'
  | 'provinces'
  | 'cooperationModules'
  | 'classrooms'
  | 'interviewTypes'
  | 'documentDepartments'
  | 'programTypes'
  | 'programs'
  | 'levels'
  | 'leadTags'
  | 'lostReasons'
  | 'leadStatuses';

export interface SystemCatalogOption {
  value: string;
  label: string;
  parentId?: string; // For grouping, e.g. product under country
  metadata?: any; // For complex fields like address, phone etc.
  inactive?: boolean; // For soft-deleting/hiding options
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

export const DEFAULT_SYSTEM_CATALOGS: Record<SystemCatalogId, SystemCatalogOption[]> = {
  targetCountries: [
    { value: 'Đức', label: 'Đức' },
    { value: 'Trung', label: 'Trung' },
    { value: 'Hàn', label: 'Hàn' },
    { value: 'Anh', label: 'Anh' },
    { value: 'SP khác', label: 'SP khác' },
  ],
  products: [
    { value: 'Tiếng Đức off', label: 'Tiếng Đức off', parentId: 'Đức' },
    { value: 'Tiếng Đức onl', label: 'Tiếng Đức onl', parentId: 'Đức' },
    { value: 'Du học Đức', label: 'Du học Đức', parentId: 'Đức' },
    { value: 'Tiếng Đức app', label: 'Tiếng Đức app', parentId: 'Đức' },
    { value: 'Tiếng Trung off', label: 'Tiếng Trung off', parentId: 'Trung' },
    { value: 'Tiếng Trung onl', label: 'Tiếng Trung onl', parentId: 'Trung' },
    { value: 'Du học Trung', label: 'Du học Trung', parentId: 'Trung' },
    { value: 'Tiếng Trung app', label: 'Tiếng Trung app', parentId: 'Trung' },
    { value: 'SP khác', label: 'SP khác' },
  ],
  campuses: [
    {
      value: 'Cơ sở 1',
      label: 'Cơ sở 1',
      metadata: { code: 'CS1', type: 'Trụ sở chính', status: 'Active' },
    },
    {
      value: 'Cơ sở 2',
      label: 'Cơ sở 2',
      metadata: { code: 'CS2', type: 'Chi nhánh', status: 'Active' },
    },
  ],
  educationLevels: [
    { value: 'THCS', label: 'THCS' },
    { value: 'THPT', label: 'THPT' },
    { value: 'Cao đẳng', label: 'Cao đẳng' },
    { value: 'Đại học', label: 'Đại học' },
    { value: 'Sau ĐH', label: 'Sau ĐH' },
  ],
  leadSources: [
    { value: 'Công ty', label: 'Công ty' },
    { value: 'Cá nhân', label: 'Cá nhân' },
    { value: 'CTV', label: 'CTV' },
    { value: 'Thị trường', label: 'Thị trường' },
  ],
  leadChannels: [
    { value: 'Facebook Organic', label: 'Facebook Organic' },
    { value: 'Facebook Ads', label: 'Facebook Ads' },
    { value: 'TikTok Organic', label: 'TikTok Organic' },
    { value: 'TikTok Ads', label: 'TikTok Ads' },
    { value: 'Zalo Ads', label: 'Zalo Ads' },
    { value: 'Landing Page', label: 'Landing Page' },
    { value: 'Google Form', label: 'Google Form' },
    { value: 'Hotline', label: 'Hotline' },
    { value: 'Vãng lai', label: 'Vãng lai' },
    { value: 'Giới thiệu', label: 'Giới thiệu' },
  ],
  teams: [
    { value: 'Team KD 1', label: 'Team KD 1', parentId: 'Cơ sở 1', metadata: { type: 'Sale' } },
    { value: 'Team KD 2', label: 'Team KD 2', parentId: 'Cơ sở 1', metadata: { type: 'Sale' } },
    { value: 'Phòng Hồ sơ', label: 'Phòng Hồ sơ', parentId: 'Cơ sở 1', metadata: { type: 'Hồ sơ' } },
    { value: 'Phòng MKT', label: 'Phòng MKT', parentId: 'Cơ sở 1', metadata: { type: 'Marketing' } },
    { value: 'Phòng Đào tạo', label: 'Phòng Đào tạo', parentId: 'Cơ sở 1', metadata: { type: 'Đào tạo' } },
  ],
  leadPotentials: [
    { value: 'Chưa đánh giá được', label: 'Chưa đánh giá được' },
    { value: 'Tham khảo', label: 'Tham khảo' },
    { value: 'Tiềm năng', label: 'Tiềm năng' },
    { value: 'Nóng', label: 'Nóng' },
    { value: 'Nuôi dưỡng', label: 'Nuôi dưỡng' },
  ],
  provinces: [
    // 11 đơn vị giữ nguyên
    { value: 'Hà Nội', label: 'TP. Hà Nội' },
    { value: 'Huế', label: 'TP. Huế' },
    { value: 'Lai Châu', label: 'Lai Châu' },
    { value: 'Điện Biên', label: 'Điện Biên' },
    { value: 'Sơn La', label: 'Sơn La' },
    { value: 'Lạng Sơn', label: 'Lạng Sơn' },
    { value: 'Quảng Ninh', label: 'Quảng Ninh' },
    { value: 'Thanh Hóa', label: 'Thanh Hóa' },
    { value: 'Nghệ An', label: 'Nghệ An' },
    { value: 'Hà Tĩnh', label: 'Hà Tĩnh' },
    { value: 'Cao Bằng', label: 'Cao Bằng' },
    // 23 đơn vị mới sau sáp nhập
    { value: 'Tuyên Quang', label: 'Tuyên Quang' },
    { value: 'Lào Cai', label: 'Lào Cai' },
    { value: 'Thái Nguyên', label: 'Thái Nguyên' },
    { value: 'Phú Thọ', label: 'Phú Thọ' },
    { value: 'Bắc Ninh', label: 'Bắc Ninh' },
    { value: 'Hưng Yên', label: 'Hưng Yên' },
    { value: 'Hải Phòng', label: 'TP. Hải Phòng' },
    { value: 'Ninh Bình', label: 'Ninh Bình' },
    { value: 'Quảng Trị', label: 'Quảng Trị' },
    { value: 'Đà Nẵng', label: 'TP. Đà Nẵng' },
    { value: 'Quảng Ngãi', label: 'Quảng Ngãi' },
    { value: 'Gia Lai', label: 'Gia Lai' },
    { value: 'Khánh Hòa', label: 'Khánh Hòa' },
    { value: 'Lâm Đồng', label: 'Lâm Đồng' },
    { value: 'Đắk Lắk', label: 'Đắk Lắk' },
    { value: 'Hồ Chí Minh', label: 'TP. Hồ Chí Minh' },
    { value: 'Đồng Nai', label: 'Đồng Nai' },
    { value: 'Tây Ninh', label: 'Tây Ninh' },
    { value: 'Cần Thơ', label: 'TP. Cần Thơ' },
    { value: 'Vĩnh Long', label: 'Vĩnh Long' },
    { value: 'Đồng Tháp', label: 'Đồng Tháp' },
    { value: 'Cà Mau', label: 'Cà Mau' },
    { value: 'An Giang', label: 'An Giang' },
  ],
  cooperationModules: [
    { value: 'Du học Đức', label: 'Du học Đức' },
    { value: 'Bán app Trung', label: 'Bán app Trung' },
    { value: 'app Đức', label: 'app Đức' },
  ],
  classrooms: [
    { value: 'P01', label: 'P01', parentId: 'Cơ sở 1' },
    { value: 'P02', label: 'P02', parentId: 'Cơ sở 1' },
  ],
  interviewTypes: [
    { value: 'Lịch hẹn DSQ', label: 'Lịch hẹn DSQ' },
    { value: 'Lịch thi đầu vào', label: 'Lịch thi đầu vào' },
    { value: 'Lịch bổ sung', label: 'Lịch bổ sung' },
  ],
  documentDepartments: [
    { value: 'Ban GD', label: 'Ban GD' },
    { value: 'Phòng MKT', label: 'Phòng MKT' },
    { value: 'Sale', label: 'Sale' },
  ],
  programTypes: [
    { value: 'Đào tạo', label: 'Đào tạo' },
    { value: 'Du học', label: 'Du học' },
    { value: 'Loại khác', label: 'Loại khác' },
  ],
  programs: [
    { value: 'A1', label: 'A1', parentId: 'Đào tạo' },
    { value: 'A2', label: 'A2', parentId: 'Đào tạo' },
    { value: 'B1', label: 'B1', parentId: 'Đào tạo' },
    { value: 'HSK 1', label: 'HSK 1', parentId: 'Đào tạo' },
    { value: 'HSK 2', label: 'HSK 2', parentId: 'Đào tạo' },
    { value: 'HSK 3', label: 'HSK 3', parentId: 'Đào tạo' },
    { value: 'HSK 4', label: 'HSK 4', parentId: 'Đào tạo' },
    { value: 'HSK 5', label: 'HSK 5', parentId: 'Đào tạo' },
    { value: 'HSK 6', label: 'HSK 6', parentId: 'Đào tạo' },
    { value: 'Du học', label: 'Du học', parentId: 'Du học' },
  ],
  levels: [
    { value: 'A1', label: 'A1', parentId: 'Đức' },
    { value: 'A2', label: 'A2', parentId: 'Đức' },
    { value: 'B1', label: 'B1', parentId: 'Đức' },
    { value: 'Ôn B1', label: 'Ôn B1', parentId: 'Đức' },
    { value: 'B2', label: 'B2', parentId: 'Đức' },
    { value: 'HSK 1', label: 'HSK 1', parentId: 'Trung' },
    { value: 'HSK 2', label: 'HSK 2', parentId: 'Trung' },
    { value: 'HSK 3', label: 'HSK 3', parentId: 'Trung' },
    { value: 'HSK 4', label: 'HSK 4', parentId: 'Trung' },
    { value: 'HSK 5', label: 'HSK 5', parentId: 'Trung' },
    { value: 'HSK 6', label: 'HSK 6', parentId: 'Trung' },
  ],
  leadTags: [
    { value: 'Gọi lần 1', label: 'Gọi lần 1' },
    { value: 'Gọi lần 2', label: 'Gọi lần 2' },
    { value: 'Gọi lần 3', label: 'Gọi lần 3' },
  ],
  lostReasons: [
    { value: 'Sai số', label: 'Sai số' },
    { value: 'Không nhấc máy', label: 'Không nhấc máy' },
    { value: 'Không có nhu cầu', label: 'Không có nhu cầu' },
    { value: 'Giá cao', label: 'Giá cao' },
    { value: 'Đã đi nơi khác', label: 'Đã đi nơi khác' },
  ],
  leadStatuses: [
    { value: 'new', label: 'Lead mới' },
    { value: 'assigned', label: 'Đã phân bổ' },
    { value: 'picked', label: 'Đã nhận' },
    { value: 'contacted', label: 'Đang chăm sóc' },
    { value: 'converted', label: 'Đã chuyển đổi' },
    { value: 'nurturing', label: 'Nuôi dưỡng' },
    { value: 'unverified', label: 'Không xác thực' },
    { value: 'lost', label: 'Mất' },
  ],
};

const cloneCatalog = (items: SystemCatalogOption[]) => items.map((item) => ({ ...item }));

const normalizeCatalogOption = (
  item: Partial<SystemCatalogOption> | string,
  fallbackIndex: number,
): SystemCatalogOption | null => {
  const isString = typeof item === 'string';
  const rawValue = isString ? item : (item as SystemCatalogOption).value || (item as SystemCatalogOption).label;
  const rawLabel = isString ? item : (item as SystemCatalogOption).label || (item as SystemCatalogOption).value;
  const value = normalizeText(rawValue);
  const label = normalizeText(rawLabel);

  if (!value || !label) return null;

  return {
    value,
    label,
    parentId: isString ? undefined : (item as SystemCatalogOption).parentId,
    metadata: isString ? undefined : (item as SystemCatalogOption).metadata,
    inactive: isString ? undefined : (item as SystemCatalogOption).inactive,
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

export const getSystemCatalog = (catalogId: SystemCatalogId, includeInactive: boolean = false): SystemCatalogOption[] => {
  const storedCatalogs = readStoredCatalogs();
  const options = normalizeCatalog(catalogId, storedCatalogs[catalogId]);
  if (includeInactive) return options;
  return options.filter(opt => !opt.inactive);
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
export let ADMIN_TEAM_OPTIONS = getSystemCatalog('teams');
export let LEAD_POTENTIAL_OPTIONS = getSystemCatalog('leadPotentials');
export let PROVINCE_OPTIONS = getSystemCatalog('provinces');
export let COOPERATION_MODULE_OPTIONS = getSystemCatalog('cooperationModules');
export let CLASSROOM_OPTIONS = getSystemCatalog('classrooms');
export let INTERVIEW_TYPE_OPTIONS = getSystemCatalog('interviewTypes');
export let DOCUMENT_DEPARTMENT_OPTIONS = getSystemCatalog('documentDepartments');
export let PROGRAM_TYPE_OPTIONS = getSystemCatalog('programTypes');
export let PROGRAM_OPTIONS = getSystemCatalog('programs');
export let LEVEL_OPTIONS = getSystemCatalog('levels');
export let LEAD_TAG_OPTIONS = getSystemCatalog('leadTags');
export let LOST_REASON_OPTIONS = getSystemCatalog('lostReasons');

export const getDynamicLeadStatusLabels = (): Record<string, string> => {
  const labels: Record<string, string> = {};
  const catalog = getSystemCatalog('leadStatuses');
  catalog.forEach(item => {
    labels[item.value] = item.label;
  });
  return labels;
};

export const syncSystemCatalogBindings = () => {
  LEAD_TARGET_COUNTRY_OPTIONS = getSystemCatalog('targetCountries');
  LEAD_PRODUCT_OPTIONS = getSystemCatalog('products');
  LEAD_CAMPUS_OPTIONS = getSystemCatalog('campuses');
  STUDENT_EDUCATION_LEVEL_OPTIONS = getSystemCatalog('educationLevels');
  LEAD_SOURCE_OPTIONS = getSystemCatalog('leadSources');
  LEAD_CHANNEL_OPTIONS = getSystemCatalog('leadChannels');
  ADMIN_TEAM_OPTIONS = getSystemCatalog('teams');
  LEAD_POTENTIAL_OPTIONS = getSystemCatalog('leadPotentials');
  PROVINCE_OPTIONS = getSystemCatalog('provinces');
  COOPERATION_MODULE_OPTIONS = getSystemCatalog('cooperationModules');
  CLASSROOM_OPTIONS = getSystemCatalog('classrooms');
  INTERVIEW_TYPE_OPTIONS = getSystemCatalog('interviewTypes');
  DOCUMENT_DEPARTMENT_OPTIONS = getSystemCatalog('documentDepartments');
  PROGRAM_TYPE_OPTIONS = getSystemCatalog('programTypes');
  PROGRAM_OPTIONS = getSystemCatalog('programs');
  LEVEL_OPTIONS = getSystemCatalog('levels');
  LEAD_TAG_OPTIONS = getSystemCatalog('leadTags');
  LOST_REASON_OPTIONS = getSystemCatalog('lostReasons');
};

if (typeof window !== 'undefined') {
  window.addEventListener('storage', syncSystemCatalogBindings);
  window.addEventListener(SYSTEM_CONFIG_EVENT, syncSystemCatalogBindings as EventListener);
}
