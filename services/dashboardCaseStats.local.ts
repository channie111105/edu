import {
  CaseRecord,
  CountryCaseStat,
  DashboardCaseStats,
  DashboardFilters,
  NormalizedStatus,
  ProgramCaseStat
} from '../types';

const STORAGE_KEYS = {
  CASES: 'educrm_cases',
  ADMISSIONS: 'educrm_admissions',
  QUOTATIONS: 'educrm_quotations',
  STUDENTS: 'educrm_students',
  LEADS: 'educrm_leads_v2'
} as const;

const UNKNOWN_LABEL = 'Chưa xác định';
const OTHER_LABEL = 'Khác';
const TOP_LIMIT = 8;

const STATUS_MAP: Record<string, NormalizedStatus> = {
  unprocessed: 'UNPROCESSED',
  pending: 'UNPROCESSED',
  new: 'UNPROCESSED',
  moi: 'UNPROCESSED',
  draft: 'UNPROCESSED',
  not_started: 'UNPROCESSED',
  cho_duyet: 'UNPROCESSED',
  chua_xu_ly: 'UNPROCESSED',
  chua_bat_dau: 'UNPROCESSED',
  cho_xu_ly: 'UNPROCESSED',
  rejected: 'UNPROCESSED',
  tu_choi: 'UNPROCESSED',
  canceled: 'UNPROCESSED',
  cancelled: 'UNPROCESSED',

  processing: 'PROCESSING',
  in_progress: 'PROCESSING',
  submitted: 'PROCESSING',
  verified: 'PROCESSING',
  active: 'PROCESSING',
  dang_xu_ly: 'PROCESSING',
  da_duyet: 'PROCESSING',
  approved: 'PROCESSING',
  enrolled: 'PROCESSING',
  sale_confirmed: 'PROCESSING',
  signed_contract: 'PROCESSING',
  locked: 'PROCESSING',
  da_co_visa: 'PROCESSING',
  co_visa: 'PROCESSING',

  departed: 'DEPARTED',
  completed: 'DEPARTED',
  done: 'DEPARTED',
  da_bay: 'DEPARTED',
  flew: 'DEPARTED',
  visa_granted: 'DEPARTED'
};

type RawMap = Map<string, any>;

const emptyBreakdown = () => ({
  unprocessed: 0,
  processing: 0,
  departed: 0
});

const toToken = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  return String(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
};

const tryDecodeMojibake = (value: string): string => {
  let current = value;
  for (let i = 0; i < 2; i += 1) {
    try {
      const decoded = decodeURIComponent(escape(current));
      if (!decoded || decoded === current) break;
      current = decoded;
    } catch {
      break;
    }
  }
  return current;
};

const decodeUnicodeEscapeLiterals = (value: string): string => {
  if (!value || !value.includes('\\u')) return value;
  return value.replace(/\\u([0-9a-fA-F]{4})/g, (match, hex: string) => {
    const code = Number.parseInt(hex, 16);
    return Number.isNaN(code) ? match : String.fromCharCode(code);
  });
};

const toText = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  return decodeUnicodeEscapeLiterals(tryDecodeMojibake(String(value))).replace(/\s+/g, ' ').trim();
};

const readArray = (key: string): any[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const mapById = (rows: any[]): RawMap => {
  const map: RawMap = new Map();
  rows.forEach((row) => {
    const id = toText(row?.id);
    if (id) map.set(id, row);
  });
  return map;
};

const pickString = (raw: any, keys: string[]): string => {
  for (const key of keys) {
    const value = toText(raw?.[key]);
    if (value) return value;
  }
  return '';
};

const inferCountryFromText = (text: string): string => {
  const token = toToken(text);
  if (!token) return '';
  if (token.includes('duc') || token.includes('germany') || token.includes('ger')) return 'Đức';
  if (token.includes('uc') || token.includes('australia') || token.includes('aus')) return 'Úc';
  if (token.includes('canada')) return 'Canada';
  if (token.includes('han_quoc') || token.includes('korea')) return 'Hàn Quốc';
  if (token.includes('nhat') || token.includes('japan')) return 'Nhật Bản';
  if (token.includes('trung_quoc') || token.includes('china')) return 'Trung Quốc';
  return '';
};

const inferProgramFromText = (text: string): string => {
  const token = toToken(text);
  if (!token) return '';
  if (token.includes('du_hoc_nghe') || token.includes('nghe')) return 'Du học nghề';
  if (token.includes('dai_hoc') || token.includes('bachelor')) return 'Đại học';
  if (token.includes('thac_si') || token.includes('master')) return 'Thạc sĩ';
  if (token.includes('he_tieng') || token.includes('language') || token.includes('tieng')) return 'Hệ tiếng';
  if (token.includes('combo')) return 'Combo';
  if (token.includes('studyabroad') || token.includes('du_hoc')) return 'Du học';
  if (token.includes('training') || token.includes('dao_tao')) return 'Đào tạo';
  return '';
};

const normalizeStatus = (raw: any): NormalizedStatus | null => {
  const candidates = [
    raw?.status,
    raw?.caseStatus,
    raw?.pipelineStatus,
    raw?.admissionStatus,
    raw?.studentStatus,
    raw?.contractStatus,
    raw?.stageStatus
  ];

  for (const value of candidates) {
    const token = toToken(value);
    if (!token) continue;
    if (STATUS_MAP[token]) return STATUS_MAP[token];
  }
  return null;
};

export const normalizeCase = (raw: any): CaseRecord | null => {
  if (!raw || typeof raw !== 'object') return null;

  const status = normalizeStatus(raw);
  if (!status) return null;

  const id =
    toText(raw.id) ||
    toText(raw.caseId) ||
    toText(raw.admissionId) ||
    toText(raw.code) ||
    `CASE-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const countryRaw =
    pickString(raw, ['country', 'countryName', 'targetCountry', 'destinationCountry']) ||
    inferCountryFromText(
      [
        pickString(raw, ['product', 'program', 'programType']),
        pickString(raw, ['classId', 'classCode']),
        pickString(raw, ['notes', 'note'])
      ]
        .filter(Boolean)
        .join(' ')
    );

  const programRaw =
    pickString(raw, ['program', 'programName', 'programType', 'serviceType', 'product']) ||
    inferProgramFromText(
      [
        pickString(raw, ['serviceType', 'product']),
        pickString(raw, ['classId', 'classCode'])
      ]
        .filter(Boolean)
        .join(' ')
    );

  return {
    id,
    country: countryRaw || null,
    program: programRaw || null,
    status,
    createdAt: pickString(raw, ['createdAt', 'createdDate', 'created_at']),
    branchId: pickString(raw, ['branchId', 'campusId', 'campus', 'location'])
  };
};

const buildCasesFromAdmissions = (): any[] => {
  const admissions = readArray(STORAGE_KEYS.ADMISSIONS);
  if (!admissions.length) return [];

  const quotationMap = mapById(readArray(STORAGE_KEYS.QUOTATIONS));
  const studentMap = mapById(readArray(STORAGE_KEYS.STUDENTS));
  const leadMap = mapById(readArray(STORAGE_KEYS.LEADS));

  return admissions.map((admission) => {
    const quotation = admission?.quotationId ? quotationMap.get(String(admission.quotationId)) : undefined;
    const student = admission?.studentId ? studentMap.get(String(admission.studentId)) : undefined;
    const lead = quotation?.leadId ? leadMap.get(String(quotation.leadId)) : undefined;

    const derivedCountry =
      pickString(quotation, ['country', 'targetCountry']) ||
      pickString(lead, ['targetCountry']) ||
      pickString(lead?.studentInfo, ['targetCountry']) ||
      inferCountryFromText(
        [
          pickString(quotation, ['product']),
          pickString(admission, ['classId']),
          pickString(student, ['className'])
        ]
          .filter(Boolean)
          .join(' ')
      );

    const derivedProgram =
      pickString(quotation, ['program', 'programType', 'product', 'serviceType']) ||
      pickString(student, ['program', 'level']) ||
      inferProgramFromText(
        [pickString(quotation, ['product', 'serviceType']), pickString(admission, ['classId'])].filter(Boolean).join(' ')
      );

    const statusCandidate =
      pickString(admission, ['status']) ||
      pickString(student, ['status']) ||
      pickString(quotation, ['contractStatus', 'status']);

    return {
      ...admission,
      status: statusCandidate,
      country: derivedCountry,
      program: derivedProgram,
      branchId: pickString(admission, ['campusId']) || pickString(student, ['campus']),
      createdAt:
        pickString(admission, ['createdAt']) ||
        pickString(quotation, ['createdAt']) ||
        pickString(student, ['createdAt'])
    };
  });
};

export const readCasesFromLocalStorage = (): CaseRecord[] => {
  const rawCases = readArray(STORAGE_KEYS.CASES);
  const sourceRows = rawCases.length ? rawCases : buildCasesFromAdmissions();

  return sourceRows
    .map(normalizeCase)
    .filter((item): item is CaseRecord => !!item);
};

const normalizeBranch = (value: string): string => {
  const token = toToken(value);
  if (token.includes('ha_noi') || token === 'hn' || token.includes('hanoi')) return 'hanoi';
  if (token.includes('ho_chi_minh') || token.includes('tphcm') || token === 'hcm') return 'hcm';
  if (token.includes('da_nang') || token.includes('danang')) return 'danang';
  return token;
};

const applyFilters = (records: CaseRecord[], filters?: DashboardFilters): CaseRecord[] => {
  if (!filters) return records;
  const branchFilter = filters.branchId && filters.branchId !== 'all' ? normalizeBranch(filters.branchId) : '';
  const fromTime = filters.dateRange?.from ? new Date(filters.dateRange.from).getTime() : Number.NaN;
  const toTime = filters.dateRange?.to ? new Date(filters.dateRange.to).getTime() : Number.NaN;
  const hasDateFilter = Number.isFinite(fromTime) && Number.isFinite(toTime);

  return records.filter((record) => {
    if (branchFilter && record.branchId) {
      if (normalizeBranch(record.branchId) !== branchFilter) return false;
    }

    if (hasDateFilter && record.createdAt) {
      const valueTime = new Date(record.createdAt).getTime();
      if (Number.isFinite(valueTime) && (valueTime < fromTime || valueTime > toTime)) {
        return false;
      }
    }

    return true;
  });
};

const addCaseToBucket = (bucket: Record<string, { unprocessed: number; processing: number; departed: number }>, label: string, status: NormalizedStatus) => {
  if (!bucket[label]) {
    bucket[label] = emptyBreakdown();
  }
  if (status === 'UNPROCESSED') bucket[label].unprocessed += 1;
  if (status === 'PROCESSING') bucket[label].processing += 1;
  if (status === 'DEPARTED') bucket[label].departed += 1;
};

const getTotal = (item: { unprocessed: number; processing: number; departed: number }) =>
  item.unprocessed + item.processing + item.departed;

const toCountryStats = (bucket: Record<string, { unprocessed: number; processing: number; departed: number }>): CountryCaseStat[] => {
  const rows: CountryCaseStat[] = Object.entries(bucket).map(([country, data]) => ({ country, ...data }));
  rows.sort((a, b) => getTotal(b) - getTotal(a) || a.country.localeCompare(b.country, 'vi'));
  if (rows.length <= TOP_LIMIT) return rows;

  const top = rows.slice(0, TOP_LIMIT);
  const others = rows.slice(TOP_LIMIT).reduce(
    (acc, item) => {
      acc.unprocessed += item.unprocessed;
      acc.processing += item.processing;
      acc.departed += item.departed;
      return acc;
    },
    emptyBreakdown()
  );

  if (getTotal(others) > 0) {
    top.push({ country: OTHER_LABEL, ...others });
  }
  return top;
};

const toProgramStats = (bucket: Record<string, { unprocessed: number; processing: number; departed: number }>): ProgramCaseStat[] => {
  const rows: ProgramCaseStat[] = Object.entries(bucket).map(([program, data]) => ({ program, ...data }));
  rows.sort((a, b) => getTotal(b) - getTotal(a) || a.program.localeCompare(b.program, 'vi'));
  if (rows.length <= TOP_LIMIT) return rows;

  const top = rows.slice(0, TOP_LIMIT);
  const others = rows.slice(TOP_LIMIT).reduce(
    (acc, item) => {
      acc.unprocessed += item.unprocessed;
      acc.processing += item.processing;
      acc.departed += item.departed;
      return acc;
    },
    emptyBreakdown()
  );

  if (getTotal(others) > 0) {
    top.push({ program: OTHER_LABEL, ...others });
  }
  return top;
};

export const getDashboardCaseStats = (filters?: DashboardFilters): DashboardCaseStats => {
  const records = applyFilters(readCasesFromLocalStorage(), filters);
  const byCountryBucket: Record<string, { unprocessed: number; processing: number; departed: number }> = {};
  const byProgramBucket: Record<string, { unprocessed: number; processing: number; departed: number }> = {};

  records.forEach((record) => {
    const country = toText(record.country) || UNKNOWN_LABEL;
    const program = toText(record.program) || UNKNOWN_LABEL;
    addCaseToBucket(byCountryBucket, country, record.status);
    addCaseToBucket(byProgramBucket, program, record.status);
  });

  return {
    byCountry: toCountryStats(byCountryBucket),
    byProgram: toProgramStats(byProgramBucket)
  };
};

