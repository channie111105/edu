import React, { useMemo, useState } from 'react';
import {
  Plus,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Building2,
  Globe,
  Award,
  MapPin,
  Users,
  Wallet,
  StickyNote,
  BookOpen,
  School,
  Filter,
  Rows3,
  Calendar,
  Pencil,
  Trash2,
  X
} from 'lucide-react';
import { AdvancedFilterDropdown, ToolbarTimeFilter } from '../components/filters';
import PinnedSearchInput, { PinnedSearchChip } from '../components/PinnedSearchInput';
import {
  CustomDateRange,
  ToolbarOption,
  ToolbarValueOption,
  doesDateMatchTimeRange,
  getTimeRangeSummaryLabel
} from '../utils/filterToolbar';
import { decodeMojibakeReactNode, decodeMojibakeText } from '../utils/mojibake';

type PartnerLevel = 'GOLD' | 'SILVER' | 'PREMIUM';
type CountryFilter = 'ALL' | 'Germany' | 'China';
type WebsiteFilter = 'ALL' | 'HAS_WEBSITE' | 'NO_WEBSITE';
type ApplicantBand = 'ALL' | 'UNDER_80' | 'FROM_80_TO_120' | 'OVER_120';
type PartnerActionKey = 'ALL' | 'CREATED' | 'PROFILE_UPDATED' | 'AGREEMENT_RENEWED' | 'PROGRAM_REVIEWED';
type TimeRangeType = 'all' | 'today' | 'yesterday' | 'thisWeek' | 'last7Days' | 'last30Days' | 'thisMonth' | 'lastMonth' | 'custom';
type PartnerModalTab = 'general' | 'admissions' | 'details';
type PartnerGroupByKey =
  | 'country'
  | 'level'
  | 'type'
  | 'ranking'
  | 'intake'
  | 'schoolType'
  | 'rankingGlobal'
  | 'major'
  | 'quota'
  | 'cmtc'
  | 'website'
  | 'applicantBand';
type PartnerAdvancedFieldKey = 'country' | 'program' | 'intake' | 'major';
type PartnerTimeField = 'intakeTerm';
type PartnerTimeFieldSelection = 'action' | PartnerTimeField;

interface IPartnerDetails {
  tuition: string;
  requirements: string[];
  address: string;
  quota: string;
  cmtc: string;
  note: string;
  majors?: string[];
  overview?: string;
  website?: string;
  schoolType?: string;
  rankingGlobal?: string;
  programs: IPartnerProgram[];
}

interface IPartnerProgramRequirement {
  program: string;
  major: string;
  gpa: string;
  languageRequirement: string;
  apsRequired: boolean;
  tuition: string;
}

interface IPartnerProgram {
  id: string;
  name: string;
  school: string;
  major: string;
  degreeLevel: 'Đại học' | 'Thạc sĩ' | 'Trường nghề';
  language: string;
  intake: string;
  interviewRequired: boolean;
  quantity: string;
  requirements: IPartnerProgramRequirement[];
}

interface IStudyAbroadPartner {
  id: number;
  name: string;
  type: string;
  country: 'Germany' | 'China';
  flag: string;
  ranking: string;
  intake: string;
  applicants: number;
  level: PartnerLevel;
  lastAction: Exclude<PartnerActionKey, 'ALL'>;
  lastActionDate: string;
  details: IPartnerDetails;
}

interface IPartnerFormState {
  name: string;
  type: string;
  country: IStudyAbroadPartner['country'];
  ranking: string;
  intake: string;
  applicants: string;
  level: PartnerLevel;
  tuition: string;
  requirementsText: string;
  address: string;
  quota: string;
  cmtc: string;
  note: string;
  majorsText: string;
  overview: string;
  website: string;
  schoolType: string;
  rankingGlobal: string;
}

const COUNTRY_LABEL: Record<IStudyAbroadPartner['country'], string> = {
  Germany: 'Đức',
  China: 'Trung Quốc'
};

const COUNTRY_FLAG: Record<IStudyAbroadPartner['country'], string> = {
  Germany: '🇩🇪',
  China: '🇨🇳'
};

const LEVEL_LABEL: Record<PartnerLevel, string> = {
  GOLD: 'Vàng',
  SILVER: 'Bạc',
  PREMIUM: 'Cao cấp'
};

const APPLICANT_BAND_LABEL: Record<Exclude<ApplicantBand, 'ALL'>, string> = {
  UNDER_80: 'Dưới 80 hồ sơ',
  FROM_80_TO_120: '80-120 hồ sơ',
  OVER_120: 'Trên 120 hồ sơ'
};

const PARTNER_ACTION_LABEL: Record<Exclude<PartnerActionKey, 'ALL'>, string> = {
  CREATED: 'Tạo mới',
  PROFILE_UPDATED: 'Cập nhật thông tin',
  AGREEMENT_RENEWED: 'Gia hạn hợp tác',
  PROGRAM_REVIEWED: 'Xem chương trình'
};

const PARTNER_ACTION_OPTIONS: Array<{ key: PartnerActionKey; label: string }> = [
  { key: 'ALL', label: 'Tất cả hành động' },
  { key: 'CREATED', label: 'Tạo mới' },
  { key: 'PROFILE_UPDATED', label: 'Cập nhật thông tin' },
  { key: 'AGREEMENT_RENEWED', label: 'Gia hạn hợp tác' },
  { key: 'PROGRAM_REVIEWED', label: 'Xem chương trình' }
];

const TIME_RANGE_PRESETS: Array<{ id: TimeRangeType; label: string }> = [
  { id: 'all', label: 'Tất cả thời gian' },
  { id: 'today', label: 'Hôm nay' },
  { id: 'yesterday', label: 'Hôm qua' },
  { id: 'thisWeek', label: 'Tuần này' },
  { id: 'last7Days', label: '7 ngày qua' },
  { id: 'last30Days', label: '30 ngày qua' },
  { id: 'thisMonth', label: 'Tháng này' },
  { id: 'lastMonth', label: 'Tháng trước' },
  { id: 'custom', label: 'Tùy chỉnh khoảng...' }
];

const GROUP_BY_OPTIONS: Array<{ key: PartnerGroupByKey; label: string }> = [
  { key: 'country', label: 'Quốc gia' },
  { key: 'level', label: 'Cấp độ đối tác' },
  { key: 'type', label: 'Loại trường' },
  { key: 'ranking', label: 'Ranking' },
  { key: 'intake', label: 'Kỳ nhập học' },
  { key: 'schoolType', label: 'Mô hình trường' },
  { key: 'rankingGlobal', label: 'Xếp hạng global' },
  { key: 'major', label: 'Ngành tuyển sinh' },
  { key: 'quota', label: 'Chỉ tiêu tuyển sinh' },
  { key: 'cmtc', label: 'CMTC' },
  { key: 'website', label: 'Website' },
  { key: 'applicantBand', label: 'Nhóm hồ sơ hiện tại' }
];

const PARTNER_TIME_FIELD_OPTIONS = [
  { id: 'intakeTerm', label: 'K\u1ef3 tuy\u1ec3n sinh' }
] as const satisfies ReadonlyArray<ToolbarOption>;

const PARTNER_TIME_PLACEHOLDER = 'action';

const PARTNER_ADVANCED_FILTER_OPTIONS = [
  { id: 'country', label: 'Qu\u1ed1c gia' },
  { id: 'program', label: 'Chương trình' },
  { id: 'intake', label: 'K\u1ef3 nh\u1eadp h\u1ecdc' },
  { id: 'major', label: 'Ngành' }
] as const satisfies ReadonlyArray<ToolbarOption>;

const PARTNER_ADVANCED_FILTER_LABELS: Record<PartnerAdvancedFieldKey, string> = {
  country: 'Qu\u1ed1c gia',
  program: 'Chương trình',
  intake: 'K\u1ef3 nh\u1eadp h\u1ecdc',
  major: 'Ngành'
};

const PARTNER_MODAL_TABS: Array<{ id: PartnerModalTab; label: string }> = [
  { id: 'general', label: 'Thông tin chung' },
  { id: 'admissions', label: 'Tuyển sinh & Tài chính' },
  { id: 'details', label: 'Chi tiết & Ghi chú' }
];

const startOfDay = (value: Date) => {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
};

const endOfDay = (value: Date) => {
  const next = new Date(value);
  next.setHours(23, 59, 59, 999);
  return next;
};

const parseDateOnly = (value?: string) => {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDateInput = (value: Date) => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatCustomDateRangeLabel = (start?: string, end?: string) => {
  const startLabel = parseDateOnly(start)?.toLocaleDateString('vi-VN');
  const endLabel = parseDateOnly(end)?.toLocaleDateString('vi-VN');
  if (startLabel && endLabel) return `${startLabel} - ${endLabel}`;
  return 'Tất cả thời gian';
};

const getTimeRangeBounds = (rangeType: TimeRangeType, startDate?: string, endDate?: string) => {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  switch (rangeType) {
    case 'today':
      return { start: todayStart, end: todayEnd };
    case 'yesterday': {
      const start = new Date(todayStart);
      start.setDate(start.getDate() - 1);
      return { start, end: endOfDay(start) };
    }
    case 'thisWeek': {
      const start = new Date(todayStart);
      const dayOfWeek = start.getDay() === 0 ? 7 : start.getDay();
      start.setDate(start.getDate() - dayOfWeek + 1);
      return { start, end: todayEnd };
    }
    case 'last7Days': {
      const start = new Date(todayStart);
      start.setDate(start.getDate() - 6);
      return { start, end: todayEnd };
    }
    case 'last30Days': {
      const start = new Date(todayStart);
      start.setDate(start.getDate() - 29);
      return { start, end: todayEnd };
    }
    case 'thisMonth':
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: todayEnd };
    case 'lastMonth':
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
      };
    case 'custom': {
      const parsedStart = parseDateOnly(startDate);
      const parsedEnd = parseDateOnly(endDate);
      if (!parsedStart || !parsedEnd) return null;
      return parsedStart <= parsedEnd
        ? { start: startOfDay(parsedStart), end: endOfDay(parsedEnd) }
        : { start: startOfDay(parsedEnd), end: endOfDay(parsedStart) };
    }
    case 'all':
    default:
      return null;
  }
};

const isDateInTimeRange = (value: string, rangeType: TimeRangeType, startDate?: string, endDate?: string) => {
  const current = new Date(value);
  if (Number.isNaN(current.getTime())) return false;

  const bounds = getTimeRangeBounds(rangeType, startDate, endDate);
  if (!bounds) return true;

  return current >= bounds.start && current <= bounds.end;
};

const extractPartnerIntakeMonths = (value?: string) =>
  Array.from(
    new Set(
      (decodeMojibakeText(value || '').match(/\d{1,2}/g) || [])
        .map((token) => Number(token))
        .filter((month) => month >= 1 && month <= 12)
    )
  );

const getPartnerIntakeDateCandidates = (partner: IStudyAbroadPartner, now = new Date()) => {
  const months = new Set<number>();

  extractPartnerIntakeMonths(partner.intake).forEach((month) => months.add(month));
  partner.details.programs.forEach((program) => {
    extractPartnerIntakeMonths(program.intake).forEach((month) => months.add(month));
  });

  return Array.from(months).map((month) => `${now.getFullYear()}-${`${month}`.padStart(2, '0')}-01`);
};

const doesPartnerTimeFieldMatch = (
  partner: IStudyAbroadPartner,
  fieldId: PartnerTimeField,
  rangeType: TimeRangeType,
  range: CustomDateRange | null
) => {
  if (fieldId !== 'intakeTerm') return true;

  return getPartnerIntakeDateCandidates(partner).some((dateValue) =>
    doesDateMatchTimeRange(dateValue, rangeType, range)
  );
};

const formatPartnerAdvancedFilterValue = (fieldId: PartnerAdvancedFieldKey, value: string) => {
  if (fieldId === 'country' && value in COUNTRY_LABEL) {
    return COUNTRY_LABEL[value as IStudyAbroadPartner['country']];
  }
  return value;
};

const PARTNERS: IStudyAbroadPartner[] = [
  {
    id: 1,
    name: 'Đại học Kỹ thuật Munich (TUM)',
    type: 'Đại học nghiên cứu công lập',
    country: 'Germany',
    flag: '🇩🇪',
    ranking: '#1 Đức',
    intake: 'Tháng 4, 10',
    applicants: 142,
    level: 'GOLD',
    lastAction: 'PROFILE_UPDATED',
    lastActionDate: '2026-03-12T09:30:00',
    details: {
      tuition: 'EUR 0 - 1,500 / kỳ',
      requirements: ['GPA: 3.5+', 'IELTS: 6.5 / TestDaF 4', 'Yêu cầu phỏng vấn'],
      address: 'Arcisstraße 21, 80333 München, Đức',
      quota: '50 sinh viên/năm',
      cmtc: 'Tài khoản phong tỏa 11.208 EUR',
      majors: ['Kỹ thuật', 'Công nghệ thông tin', 'Kinh tế', 'Điều dưỡng'],
      overview:
        'Đại học Kỹ thuật Munich là trường dẫn đầu tại Đức về kỹ thuật, công nghệ và khoa học ứng dụng với mạng lưới hợp tác doanh nghiệp mạnh.',
      website: 'https://www.tum.de',
      schoolType: 'Công lập',
      rankingGlobal: '#1 Đức',
      note: 'Ưu tiên hồ sơ nộp sớm trước 3 tháng. Trường yêu cầu phỏng vấn kỹ thuật online.',
      programs: [
        {
          id: 'tum-bse',
          name: 'Bachelor of Science in Engineering',
          school: 'Đại học Kỹ thuật Munich (TUM)',
          major: 'Kỹ thuật',
          degreeLevel: 'Đại học',
          language: 'Đức',
          intake: 'Tháng 10',
          interviewRequired: true,
          quantity: '25 chỉ tiêu',
          requirements: [
            {
              program: 'Bachelor of Science in Engineering',
              major: 'Kỹ thuật',
              gpa: '3.5+',
              languageRequirement: 'IELTS 6.5 / TestDaF 4',
              apsRequired: true,
              tuition: 'EUR 1,500 / kỳ'
            }
          ]
        },
        {
          id: 'tum-msc-it',
          name: 'Master of Science in Information Technology',
          school: 'Đại học Kỹ thuật Munich (TUM)',
          major: 'Công nghệ thông tin',
          degreeLevel: 'Thạc sĩ',
          language: 'Anh',
          intake: 'Tháng 4, 10',
          interviewRequired: false,
          quantity: '15 chỉ tiêu',
          requirements: [
            {
              program: 'Master of Science in Information Technology',
              major: 'Công nghệ thông tin',
              gpa: '3.4+',
              languageRequirement: 'IELTS 6.5+',
              apsRequired: true,
              tuition: 'EUR 0 - 1,500 / kỳ'
            }
          ]
        }
      ]
    }
  },
  {
    id: 2,
    name: 'Đại học Bắc Kinh',
    type: 'Đại học trọng điểm quốc gia',
    country: 'China',
    flag: '🇨🇳',
    ranking: '#2 Trung Quốc',
    intake: 'Tháng 9',
    applicants: 118,
    level: 'GOLD',
    lastAction: 'AGREEMENT_RENEWED',
    lastActionDate: '2026-03-05T14:15:00',
    details: {
      tuition: '26,000 - 30,000 RMB / năm',
      requirements: ['HSK 5 (210+)', 'GPA: 3.2+', 'Thư giới thiệu'],
      address: 'Haidian District, Beijing, Trung Quốc',
      quota: '30 sinh viên/năm',
      cmtc: 'Sổ tiết kiệm tối thiểu 30.000 USD',
      majors: ['Kinh tế', 'Ngôn ngữ Trung', 'Khoa học dữ liệu'],
      overview:
        'Đại học Bắc Kinh nổi bật với các chương trình kinh tế, ngôn ngữ và khoa học dữ liệu dành cho sinh viên quốc tế.',
      website: 'https://www.pku.edu.cn',
      schoolType: 'Công lập',
      rankingGlobal: 'Top 20 châu Á',
      note: 'Học bổng CSC thường đóng đơn vào tháng 1. Một số ngành có vòng phỏng vấn với khoa.',
      programs: [
        {
          id: 'pku-intl-biz',
          name: 'International Business',
          school: 'Đại học Bắc Kinh',
          major: 'Kinh tế',
          degreeLevel: 'Đại học',
          language: 'Anh',
          intake: 'Tháng 9',
          interviewRequired: false,
          quantity: '20 chỉ tiêu',
          requirements: [
            {
              program: 'International Business',
              major: 'Kinh tế',
              gpa: '3.2+',
              languageRequirement: 'IELTS 6.0+ hoặc TOEFL iBT 80+',
              apsRequired: false,
              tuition: '30,000 RMB / năm'
            }
          ]
        },
        {
          id: 'pku-chinese-lang',
          name: 'Chinese Language and Culture',
          school: 'Đại học Bắc Kinh',
          major: 'Ngôn ngữ Trung',
          degreeLevel: 'Trường nghề',
          language: 'Trung',
          intake: 'Tháng 9',
          interviewRequired: true,
          quantity: '10 chỉ tiêu',
          requirements: [
            {
              program: 'Chinese Language and Culture',
              major: 'Ngôn ngữ Trung',
              gpa: '3.0+',
              languageRequirement: 'HSK 5 (210+)',
              apsRequired: false,
              tuition: '26,000 RMB / năm'
            }
          ]
        }
      ]
    }
  },
  {
    id: 3,
    name: 'Đại học Heidelberg',
    type: 'Đại học xuất sắc',
    country: 'Germany',
    flag: '🇩🇪',
    ranking: '#3 Đức',
    intake: 'Tháng 10',
    applicants: 78,
    level: 'SILVER',
    lastAction: 'CREATED',
    lastActionDate: '2026-02-24T10:00:00',
    details: {
      tuition: 'EUR 1,500 / kỳ',
      requirements: ['GPA: 3.0+', 'TestAS', 'DSH-2'],
      address: 'Grabengasse 1, 69117 Heidelberg, Đức',
      quota: '20 sinh viên/năm',
      cmtc: 'Tài khoản phong tỏa 11.208 EUR',
      majors: ['Y sinh', 'Khoa học xã hội', 'Nghiên cứu liên ngành'],
      overview:
        'Đại học Heidelberg phù hợp với hồ sơ học thuật định hướng nghiên cứu, đặc biệt ở y sinh và khoa học xã hội.',
      website: 'https://www.uni-heidelberg.de',
      schoolType: 'Công lập',
      rankingGlobal: 'Top 50 thế giới',
      note: 'Yêu cầu TestAS cho một số chương trình. Hồ sơ nghiên cứu cần thư động lực rõ định hướng.',
      programs: [
        {
          id: 'hd-med-sci',
          name: 'Medical Bioscience',
          school: 'Đại học Heidelberg',
          major: 'Y sinh',
          degreeLevel: 'Thạc sĩ',
          language: 'Anh',
          intake: 'Tháng 10',
          interviewRequired: false,
          quantity: '12 chỉ tiêu',
          requirements: [
            {
              program: 'Medical Bioscience',
              major: 'Y sinh',
              gpa: '3.2+',
              languageRequirement: 'IELTS 6.5+',
              apsRequired: true,
              tuition: 'EUR 1,500 / kỳ'
            }
          ]
        },
        {
          id: 'hd-social-research',
          name: 'Social Research',
          school: 'Đại học Heidelberg',
          major: 'Khoa học xã hội',
          degreeLevel: 'Thạc sĩ',
          language: 'Đức',
          intake: 'Tháng 10',
          interviewRequired: true,
          quantity: '8 chỉ tiêu',
          requirements: [
            {
              program: 'Social Research',
              major: 'Khoa học xã hội',
              gpa: '3.0+',
              languageRequirement: 'DSH-2 / TestDaF 4',
              apsRequired: true,
              tuition: 'EUR 1,500 / kỳ'
            }
          ]
        }
      ]
    }
  },
  {
    id: 4,
    name: 'Đại học Phục Đán',
    type: 'Thành viên C9 League',
    country: 'China',
    flag: '🇨🇳',
    ranking: '#5 Trung Quốc',
    intake: 'Tháng 9',
    applicants: 62,
    level: 'PREMIUM',
    lastAction: 'PROGRAM_REVIEWED',
    lastActionDate: '2026-03-14T16:45:00',
    details: {
      tuition: '23,000 - 75,000 RMB / năm',
      requirements: ['HSK 6', 'Phỏng vấn chuyên môn', 'Bài luận cá nhân'],
      address: '220 Handan Rd, Yangpu District, Shanghai, Trung Quốc',
      quota: '15 sinh viên/năm',
      cmtc: 'Chứng minh thu nhập người bảo lãnh',
      majors: ['Y khoa', 'Công nghệ thông tin', 'Tài chính'],
      overview:
        'Đại học Phục Đán mạnh về các chương trình quốc tế trong nhóm ngành y khoa, CNTT và tài chính cạnh tranh cao.',
      website: 'https://www.fudan.edu.cn',
      schoolType: 'Công lập',
      rankingGlobal: 'Top 100 thế giới',
      note: 'Chương trình MBBS yêu cầu phỏng vấn trực tiếp. Khoa tài chính ưu tiên ứng viên có nền tảng toán tốt.',
      programs: [
        {
          id: 'fudan-mbbs',
          name: 'MBBS',
          school: 'Đại học Phục Đán',
          major: 'Y khoa',
          degreeLevel: 'Đại học',
          language: 'Anh',
          intake: 'Tháng 9',
          interviewRequired: true,
          quantity: '10 chỉ tiêu',
          requirements: [
            {
              program: 'MBBS',
              major: 'Y khoa',
              gpa: '3.4+',
              languageRequirement: 'IELTS 6.5+ hoặc tương đương',
              apsRequired: false,
              tuition: '75,000 RMB / năm'
            }
          ]
        },
        {
          id: 'fudan-fintech',
          name: 'Financial Technology',
          school: 'Đại học Phục Đán',
          major: 'Tài chính',
          degreeLevel: 'Thạc sĩ',
          language: 'Anh',
          intake: 'Tháng 9',
          interviewRequired: true,
          quantity: '5 chỉ tiêu',
          requirements: [
            {
              program: 'Financial Technology',
              major: 'Tài chính',
              gpa: '3.3+',
              languageRequirement: 'IELTS 6.5+',
              apsRequired: false,
              tuition: '38,000 RMB / năm'
            }
          ]
        }
      ]
    }
  }
];

const normalizePartnerLevel = (value: unknown): PartnerLevel => {
  const token = decodeMojibakeText(String(value || '')).toUpperCase();
  if (token === 'SILVER') return 'SILVER';
  if (token === 'PREMIUM') return 'PREMIUM';
  return 'GOLD';
};

const normalizePartnerAction = (value: unknown): Exclude<PartnerActionKey, 'ALL'> => {
  const token = decodeMojibakeText(String(value || '')).toUpperCase();
  if (token === 'AGREEMENT_RENEWED') return 'AGREEMENT_RENEWED';
  if (token === 'PROGRAM_REVIEWED') return 'PROGRAM_REVIEWED';
  if (token === 'PROFILE_UPDATED') return 'PROFILE_UPDATED';
  return 'CREATED';
};

const normalizePartnerCountry = (value: unknown): IStudyAbroadPartner['country'] => {
  const token = decodeMojibakeText(String(value || '')).toLowerCase();
  return token.includes('china') || token.includes('trung') ? 'China' : 'Germany';
};

const normalizePartner = (partner: IStudyAbroadPartner): IStudyAbroadPartner => {
  const country = normalizePartnerCountry(partner.country);
  const details = partner.details || ({} as IPartnerDetails);

  return {
    ...partner,
    id: Number(partner.id) || Date.now(),
    country,
    flag: COUNTRY_FLAG[country],
    applicants: Math.max(0, Number(partner.applicants) || 0),
    level: normalizePartnerLevel(partner.level),
    lastAction: normalizePartnerAction(partner.lastAction),
    lastActionDate: decodeMojibakeText(partner.lastActionDate || '') || new Date().toISOString(),
    name: decodeMojibakeText(partner.name),
    type: decodeMojibakeText(partner.type),
    ranking: decodeMojibakeText(partner.ranking),
    intake: decodeMojibakeText(partner.intake),
    details: {
      tuition: decodeMojibakeText(details.tuition || ''),
      requirements: (details.requirements || []).map((item) => decodeMojibakeText(item)),
      address: decodeMojibakeText(details.address || ''),
      quota: decodeMojibakeText(details.quota || ''),
      cmtc: decodeMojibakeText(details.cmtc || ''),
      note: decodeMojibakeText(details.note || ''),
      majors: (details.majors || []).map((item) => decodeMojibakeText(item)),
      overview: decodeMojibakeText(details.overview || ''),
      website: decodeMojibakeText(details.website || ''),
      schoolType: decodeMojibakeText(details.schoolType || ''),
      rankingGlobal: decodeMojibakeText(details.rankingGlobal || ''),
      programs: (details.programs || []).map((program) => ({
        ...program,
        name: decodeMojibakeText(program.name),
        school: decodeMojibakeText(program.school),
        major: decodeMojibakeText(program.major),
        degreeLevel: decodeMojibakeText(program.degreeLevel) as IPartnerProgram['degreeLevel'],
        language: decodeMojibakeText(program.language),
        intake: decodeMojibakeText(program.intake),
        quantity: decodeMojibakeText(program.quantity),
        requirements: (program.requirements || []).map((requirement) => ({
          ...requirement,
          program: decodeMojibakeText(requirement.program),
          major: decodeMojibakeText(requirement.major),
          gpa: decodeMojibakeText(requirement.gpa),
          languageRequirement: decodeMojibakeText(requirement.languageRequirement),
          tuition: decodeMojibakeText(requirement.tuition)
        }))
      }))
    }
  };
};

const PARTNERS_STORAGE_KEY = 'educrm_study_abroad_partners';

const loadPersistedPartners = (): IStudyAbroadPartner[] => {
  const fallback = PARTNERS.map(normalizePartner);
  if (typeof window === 'undefined') return fallback;

  try {
    const raw = window.localStorage.getItem(PARTNERS_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((item) => normalizePartner(item as IStudyAbroadPartner)) : fallback;
  } catch {
    return fallback;
  }
};

const persistPartners = (partners: IStudyAbroadPartner[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PARTNERS_STORAGE_KEY, JSON.stringify(partners));
};

const splitTextTokens = (value: string) =>
  value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);

const EMPTY_PARTNER_FORM: IPartnerFormState = {
  name: '',
  type: '',
  country: 'Germany',
  ranking: '',
  intake: '',
  applicants: '',
  level: 'GOLD',
  tuition: '',
  requirementsText: '',
  address: '',
  quota: '',
  cmtc: '',
  note: '',
  majorsText: '',
  overview: '',
  website: '',
  schoolType: '',
  rankingGlobal: ''
};

const toPartnerFormState = (partner: IStudyAbroadPartner): IPartnerFormState => ({
  name: partner.name,
  type: partner.type,
  country: partner.country,
  ranking: partner.ranking,
  intake: partner.intake,
  applicants: String(partner.applicants || ''),
  level: partner.level,
  tuition: partner.details.tuition || '',
  requirementsText: (partner.details.requirements || []).join('\n'),
  address: partner.details.address || '',
  quota: partner.details.quota || '',
  cmtc: partner.details.cmtc || '',
  note: partner.details.note || '',
  majorsText: (partner.details.majors || []).join(', '),
  overview: partner.details.overview || '',
  website: partner.details.website || '',
  schoolType: partner.details.schoolType || '',
  rankingGlobal: partner.details.rankingGlobal || ''
});

const getApplicantBand = (applicants: number): Exclude<ApplicantBand, 'ALL'> => {
  if (applicants < 80) return 'UNDER_80';
  if (applicants <= 120) return 'FROM_80_TO_120';
  return 'OVER_120';
};

const getWebsiteLabel = (website?: string) => (website ? 'Có website' : 'Chưa có website');

const getLevelBadge = (level: PartnerLevel) => {
  switch (level) {
    case 'GOLD':
      return <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">ĐỐI TÁC VÀNG</span>;
    case 'SILVER':
      return <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">ĐỐI TÁC BẠC</span>;
    case 'PREMIUM':
      return <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-800">CAO CẤP</span>;
    default:
      return null;
  }
};

const StudyAbroadPartners: React.FC = () => {
  const [partners, setPartners] = useState<IStudyAbroadPartner[]>(() => loadPersistedPartners());
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timeFilterField, setTimeFilterField] = useState<PartnerTimeFieldSelection>(PARTNER_TIME_PLACEHOLDER);
  const [customRange, setCustomRange] = useState<CustomDateRange | null>(null);
  const [showAdvancedFilterDropdown, setShowAdvancedFilterDropdown] = useState(false);
  const [selectedAdvancedFilterFields, setSelectedAdvancedFilterFields] = useState<PartnerAdvancedFieldKey[]>([]);
  const [selectedAdvancedFilterValues, setSelectedAdvancedFilterValues] = useState<Partial<Record<PartnerAdvancedFieldKey, string>>>({});
  const [countryFilter, setCountryFilter] = useState<CountryFilter>('ALL');
  const [levelFilter, setLevelFilter] = useState<'ALL' | PartnerLevel>('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [rankingFilter, setRankingFilter] = useState('ALL');
  const [intakeFilter, setIntakeFilter] = useState('ALL');
  const [schoolTypeFilter, setSchoolTypeFilter] = useState('ALL');
  const [rankingGlobalFilter, setRankingGlobalFilter] = useState('ALL');
  const [majorFilter, setMajorFilter] = useState('ALL');
  const [quotaFilter, setQuotaFilter] = useState('ALL');
  const [cmtcFilter, setCmtcFilter] = useState('ALL');
  const [websiteFilter, setWebsiteFilter] = useState<WebsiteFilter>('ALL');
  const [applicantBandFilter, setApplicantBandFilter] = useState<ApplicantBand>('ALL');
  const [actionFilter, setActionFilter] = useState<PartnerActionKey>('ALL');
  const [timeRangeType, setTimeRangeType] = useState<TimeRangeType>('all');
  const [startDateFromFilter, setStartDateFromFilter] = useState(() => formatDateInput(new Date()));
  const [endDateToFilter, setEndDateToFilter] = useState(() => formatDateInput(new Date()));
  const [expandedPrograms, setExpandedPrograms] = useState<Record<number, string>>({});
  const [groupBy, setGroupBy] = useState<PartnerGroupByKey[]>([]);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [editingPartnerId, setEditingPartnerId] = useState<number | null>(null);
  const [activePartnerTab, setActivePartnerTab] = useState<PartnerModalTab>('general');
  const [partnerForm, setPartnerForm] = useState<IPartnerFormState>(EMPTY_PARTNER_FORM);

  const typeOptions = useMemo(() => Array.from(new Set(partners.map((partner) => partner.type))).filter(Boolean), [partners]);
  const rankingOptions = useMemo(() => Array.from(new Set(partners.map((partner) => partner.ranking))).filter(Boolean), [partners]);
  const programOptions = useMemo(
    () => Array.from(new Set(partners.flatMap((partner) => partner.details.programs.map((program) => program.name)).filter(Boolean))) as string[],
    [partners]
  );
  const intakeOptions = useMemo(
    () =>
      Array.from(
        new Set(
          partners.flatMap((partner) => [partner.intake, ...partner.details.programs.map((program) => program.intake)]).filter(Boolean)
        )
      ) as string[],
    [partners]
  );
  const schoolTypeOptions = useMemo(
    () => Array.from(new Set(partners.map((partner) => partner.details.schoolType).filter(Boolean))) as string[],
    [partners]
  );
  const rankingGlobalOptions = useMemo(
    () => Array.from(new Set(partners.map((partner) => partner.details.rankingGlobal).filter(Boolean))) as string[],
    [partners]
  );
  const majorOptions = useMemo(
    () =>
      Array.from(
        new Set(
          partners
            .flatMap((partner) => [...(partner.details.majors || []), ...partner.details.programs.map((program) => program.major)])
            .filter(Boolean)
        )
      ) as string[],
    [partners]
  );
  const quotaOptions = useMemo(
    () => Array.from(new Set(partners.map((partner) => partner.details.quota).filter(Boolean))) as string[],
    [partners]
  );
  const cmtcOptions = useMemo(
    () => Array.from(new Set(partners.map((partner) => partner.details.cmtc).filter(Boolean))) as string[],
    [partners]
  );
  const selectedAdvancedFilterOptions = useMemo(
    () =>
      selectedAdvancedFilterFields
        .map((fieldId) => PARTNER_ADVANCED_FILTER_OPTIONS.find((option) => option.id === fieldId))
        .filter((option): option is (typeof PARTNER_ADVANCED_FILTER_OPTIONS)[number] => Boolean(option)),
    [selectedAdvancedFilterFields]
  );
  const activeAdvancedFilterField = selectedAdvancedFilterOptions[0] || null;
  const selectedAdvancedFilterEntries = useMemo(
    () =>
      Object.entries(selectedAdvancedFilterValues).filter(
        (entry): entry is [PartnerAdvancedFieldKey, string] => Boolean(entry[1])
      ),
    [selectedAdvancedFilterValues]
  );
  const advancedFilterSelectableValuesByField = useMemo(
    () =>
      selectedAdvancedFilterFields.reduce<Partial<Record<PartnerAdvancedFieldKey, ReadonlyArray<ToolbarValueOption>>>>(
        (accumulator, fieldId) => {
          if (fieldId === 'country') {
            accumulator[fieldId] = Object.entries(COUNTRY_LABEL).map(([value, label]) => ({ value, label }));
          } else if (fieldId === 'program') {
            accumulator[fieldId] = programOptions.map((value) => ({ value, label: value }));
          } else if (fieldId === 'intake') {
            accumulator[fieldId] = intakeOptions.map((value) => ({ value, label: value }));
          } else if (fieldId === 'major') {
            accumulator[fieldId] = majorOptions.map((value) => ({ value, label: value }));
          }

          return accumulator;
        },
        {}
      ),
    [intakeOptions, majorOptions, programOptions, selectedAdvancedFilterFields]
  );
  const advancedFilterSelectableValues =
    (activeAdvancedFilterField
      ? advancedFilterSelectableValuesByField[activeAdvancedFilterField.id as PartnerAdvancedFieldKey]
      : []) || [];
  const resolvedTimeFilterField =
    timeFilterField === PARTNER_TIME_PLACEHOLDER ? ('intakeTerm' as PartnerTimeField) : timeFilterField;
  const hasTimeFilter = timeRangeType !== 'all' && (timeRangeType !== 'custom' || Boolean(customRange?.start && customRange?.end));
  const timeRangeLabel = useMemo(
    () => getTimeRangeSummaryLabel(TIME_RANGE_PRESETS as ReadonlyArray<ToolbarOption>, timeRangeType, customRange),
    [customRange, timeRangeType]
  );
  const advancedFilterActiveCount = selectedAdvancedFilterEntries.length;
  const hasAdvancedFilters = selectedAdvancedFilterEntries.length > 0;
  const activeFilterCount = selectedAdvancedFilterEntries.length + (hasTimeFilter ? 1 : 0);

  const activeSearchChips = useMemo<PinnedSearchChip[]>(() => {
    const chips: PinnedSearchChip[] = selectedAdvancedFilterEntries.map(([fieldId, value]) => ({
      key: fieldId,
      label: `${PARTNER_ADVANCED_FILTER_LABELS[fieldId]}: ${formatPartnerAdvancedFilterValue(fieldId, value)}`
    }));
    if (hasTimeFilter) {
      chips.push({ key: 'timeRange', label: `K\u1ef3 tuy\u1ec3n sinh: ${timeRangeLabel}` });
    }

    return chips;
  }, [hasTimeFilter, selectedAdvancedFilterEntries, timeRangeLabel]);

  const resetFilters = () => {
    setShowTimePicker(false);
    setShowAdvancedFilterDropdown(false);
    setTimeFilterField(PARTNER_TIME_PLACEHOLDER);
    setTimeRangeType('all');
    setCustomRange(null);
    setSelectedAdvancedFilterFields([]);
    setSelectedAdvancedFilterValues({});
  };

  const clearAllSearchFilters = () => {
    setSearchTerm('');
    resetFilters();
  };

  const removeSearchChip = (chipKey: string) => {
    switch (chipKey) {
      case 'timeRange':
        setShowTimePicker(false);
        setTimeFilterField(PARTNER_TIME_PLACEHOLDER);
        setTimeRangeType('all');
        setCustomRange(null);
        return;
      case 'country':
      case 'program':
      case 'intake':
      case 'major':
        setSelectedAdvancedFilterFields((prev) => prev.filter((item) => item !== chipKey));
        setSelectedAdvancedFilterValues((prev) => {
          if (!(chipKey in prev)) return prev;

          const nextValues = { ...prev };
          delete nextValues[chipKey as PartnerAdvancedFieldKey];
          return nextValues;
        });
        return;
      default:
        return;
    }
  };

  const handleTimeFilterOpenChange = (nextOpen: boolean) => {
    setFiltersOpen(false);
    setShowAdvancedFilterDropdown(false);
    setShowTimePicker(nextOpen);
  };

  const handleTimeFilterFieldChange = (fieldId: string) => {
    setFiltersOpen(false);
    setShowAdvancedFilterDropdown(false);
    setShowTimePicker(false);
    setTimeFilterField(fieldId as PartnerTimeFieldSelection);
  };

  const handleTimePresetSelect = (presetId: string) => {
    const nextPresetId = presetId as TimeRangeType;
    setTimeRangeType(nextPresetId);
    if (nextPresetId !== 'custom') {
      setShowTimePicker(false);
    }
  };

  const handleApplyCustomTimeRange = () => {
    if (customRange?.start && customRange?.end) {
      setTimeRangeType('custom');
      setShowTimePicker(false);
      return;
    }
    window.alert('Vui lòng chọn khoảng ngày');
  };

  const handleAdvancedFilterOpenChange = (nextOpen: boolean) => {
    setFiltersOpen(false);
    setShowTimePicker(false);
    setShowAdvancedFilterDropdown(nextOpen);
  };

  const toggleAdvancedFilterField = (fieldId: PartnerAdvancedFieldKey) => {
    setSelectedAdvancedFilterFields((prev) =>
      prev.includes(fieldId) ? prev.filter((item) => item !== fieldId) : [...prev, fieldId]
    );
    setSelectedAdvancedFilterValues((prev) => {
      if (!(fieldId in prev)) return prev;

      const nextValues = { ...prev };
      delete nextValues[fieldId];
      return nextValues;
    });
  };

  const handleAdvancedFilterValueChange = (fieldId: PartnerAdvancedFieldKey, value: string) => {
    setSelectedAdvancedFilterValues((prev) => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const toggleGroupBy = (groupKey: PartnerGroupByKey) => {
    setGroupBy((prev) => {
      if (prev.includes(groupKey)) {
        return prev.filter((item) => item !== groupKey);
      }

      const next = new Set([...prev, groupKey]);
      return GROUP_BY_OPTIONS.map((option) => option.key).filter((key) => next.has(key));
    });
  };

  const getGroupByValue = (partner: IStudyAbroadPartner, groupKey: PartnerGroupByKey) => {
    switch (groupKey) {
      case 'country':
        return COUNTRY_LABEL[partner.country];
      case 'level':
        return LEVEL_LABEL[partner.level];
      case 'type':
        return partner.type || '-';
      case 'ranking':
        return partner.ranking || '-';
      case 'intake':
        return partner.intake || '-';
      case 'schoolType':
        return partner.details.schoolType || 'Chưa cập nhật';
      case 'rankingGlobal':
        return partner.details.rankingGlobal || 'Chưa cập nhật';
      case 'major':
        return partner.details.majors && partner.details.majors.length > 0 ? partner.details.majors.join(', ') : 'Chưa cập nhật';
      case 'quota':
        return partner.details.quota || 'Chưa cập nhật';
      case 'cmtc':
        return partner.details.cmtc || 'Chưa cập nhật';
      case 'website':
        return getWebsiteLabel(partner.details.website);
      case 'applicantBand':
        return APPLICANT_BAND_LABEL[getApplicantBand(partner.applicants)];
      default:
        return '-';
    }
  };

  const filteredPartners = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return partners.filter((partner) => {
      const haystack = [
        partner.name,
        partner.type,
        COUNTRY_LABEL[partner.country],
        partner.ranking,
        partner.intake,
        LEVEL_LABEL[partner.level],
        partner.details.tuition,
        partner.details.address,
        partner.details.quota,
        partner.details.cmtc,
        partner.details.note,
        partner.details.website || '',
        partner.details.schoolType || '',
        partner.details.rankingGlobal || '',
        (partner.details.majors || []).join(' '),
        partner.details.overview || '',
        (partner.details.requirements || []).join(' '),
        partner.details.programs
          .flatMap((program) => [
            program.name,
            program.school,
            program.major,
            program.degreeLevel,
            program.language,
            program.intake,
            program.quantity,
            ...program.requirements.flatMap((requirement) => [
              requirement.program,
              requirement.major,
              requirement.gpa,
              requirement.languageRequirement,
              requirement.tuition,
              requirement.apsRequired ? 'aps' : 'khong aps'
            ])
          ])
          .join(' ')
      ]
        .join(' ')
        .toLowerCase();

      const matchesSearch = !keyword || haystack.includes(keyword);
      const matchesTimeRange =
        !hasTimeFilter || doesPartnerTimeFieldMatch(partner, resolvedTimeFilterField, timeRangeType, customRange);
      const matchesAdvancedFilters = selectedAdvancedFilterEntries.every(([fieldId, selectedValue]) => {
        if (fieldId === 'country') {
          return partner.country === selectedValue;
        }
        if (fieldId === 'program') {
          return partner.details.programs.some((program) => program.name === selectedValue);
        }
        if (fieldId === 'intake') {
          return [partner.intake, ...partner.details.programs.map((program) => program.intake)].includes(selectedValue);
        }
        return [...(partner.details.majors || []), ...partner.details.programs.map((program) => program.major)].includes(selectedValue);
      });

      return matchesSearch && matchesTimeRange && matchesAdvancedFilters;
    });
  }, [
    partners,
    searchTerm,
    customRange,
    hasTimeFilter,
    resolvedTimeFilterField,
    selectedAdvancedFilterEntries,
    timeRangeType,
  ]);

  const groupedPartners = useMemo(() => {
    if (groupBy.length === 0) return [];

    const groups = new Map<string, IStudyAbroadPartner[]>();

    filteredPartners.forEach((partner) => {
      const label = groupBy
        .map((groupKey) => {
          const groupLabel = GROUP_BY_OPTIONS.find((option) => option.key === groupKey)?.label || groupKey;
          return `${groupLabel}: ${getGroupByValue(partner, groupKey)}`;
        })
        .join(' • ');

      groups.set(label, [...(groups.get(label) || []), partner]);
    });

    return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
  }, [filteredPartners, groupBy]);

  const commitPartners = (nextPartners: IStudyAbroadPartner[]) => {
    setPartners(nextPartners);
    persistPartners(nextPartners);
  };

  const openCreatePartnerModal = () => {
    setEditingPartnerId(null);
    setActivePartnerTab('general');
    setPartnerForm(EMPTY_PARTNER_FORM);
    setShowPartnerModal(true);
  };

  const openEditPartnerModal = (partner: IStudyAbroadPartner) => {
    setEditingPartnerId(partner.id);
    setActivePartnerTab('general');
    setPartnerForm(toPartnerFormState(partner));
    setShowPartnerModal(true);
  };

  const closePartnerModal = () => {
    setShowPartnerModal(false);
    setEditingPartnerId(null);
    setActivePartnerTab('general');
    setPartnerForm(EMPTY_PARTNER_FORM);
  };

  const updatePartnerFormField = <K extends keyof IPartnerFormState>(key: K, value: IPartnerFormState[K]) => {
    setPartnerForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSavePartner = (event: React.FormEvent) => {
    event.preventDefault();

    if (!partnerForm.name.trim() || !partnerForm.type.trim() || !partnerForm.ranking.trim() || !partnerForm.intake.trim()) {
      window.alert('Vui lòng nhập đủ tên trường, loại trường, ranking và kỳ nhập học.');
      return;
    }

    const now = new Date().toISOString();
    const existingPartner = editingPartnerId !== null ? partners.find((partner) => partner.id === editingPartnerId) : undefined;
    const nextId = existingPartner?.id || partners.reduce((maxId, partner) => Math.max(maxId, partner.id), 0) + 1;
    const programs = (existingPartner?.details.programs || []).map((program) => ({
      ...program,
      school: partnerForm.name.trim() || program.school
    }));

    const nextPartner = normalizePartner({
      id: nextId,
      name: partnerForm.name.trim(),
      type: partnerForm.type.trim(),
      country: partnerForm.country,
      flag: COUNTRY_FLAG[partnerForm.country],
      ranking: partnerForm.ranking.trim(),
      intake: partnerForm.intake.trim(),
      applicants: Math.max(0, Number(partnerForm.applicants) || 0),
      level: partnerForm.level,
      lastAction: existingPartner ? 'PROFILE_UPDATED' : 'CREATED',
      lastActionDate: now,
      details: {
        tuition: partnerForm.tuition.trim(),
        requirements: splitTextTokens(partnerForm.requirementsText),
        address: partnerForm.address.trim(),
        quota: partnerForm.quota.trim(),
        cmtc: partnerForm.cmtc.trim(),
        note: partnerForm.note.trim(),
        majors: splitTextTokens(partnerForm.majorsText),
        overview: partnerForm.overview.trim(),
        website: partnerForm.website.trim(),
        schoolType: partnerForm.schoolType.trim(),
        rankingGlobal: partnerForm.rankingGlobal.trim(),
        programs
      }
    });

    const nextPartners = existingPartner
      ? partners.map((partner) => (partner.id === existingPartner.id ? nextPartner : partner))
      : [nextPartner, ...partners];

    commitPartners(nextPartners);
    setExpandedId(nextPartner.id);
    closePartnerModal();
  };

  const handleDeletePartner = (partner: IStudyAbroadPartner) => {
    const confirmed = window.confirm(`Xóa đối tác ${partner.name}?`);
    if (!confirmed) return;

    const nextPartners = partners.filter((item) => item.id !== partner.id);
    commitPartners(nextPartners);

    setExpandedPrograms((prev) => {
      const next = { ...prev };
      delete next[partner.id];
      return next;
    });

    if (expandedId === partner.id) {
      setExpandedId(null);
    }

    if (editingPartnerId === partner.id) {
      closePartnerModal();
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
    setFiltersOpen(false);
    setShowAdvancedFilterDropdown(false);
    setShowTimePicker(false);
  };

  const getExpandedProgramId = (partner: IStudyAbroadPartner) => expandedPrograms[partner.id] ?? null;

  const toggleProgramDetails = (partnerId: number, programId: string) => {
    setExpandedPrograms((prev) => ({
      ...prev,
      [partnerId]: prev[partnerId] === programId ? '' : programId
    }));
  };

  const applyTimeRangePreset = (presetId: TimeRangeType) => {
    setTimeRangeType(presetId);

    if (presetId === 'all') {
      const today = formatDateInput(new Date());
      setStartDateFromFilter(today);
      setEndDateToFilter(today);
      setShowTimePicker(false);
      return;
    }

    if (presetId !== 'custom') {
      setShowTimePicker(false);
    }
  };

  const renderPartnerRow = (partner: IStudyAbroadPartner, rowNumber: number) => {
    const expandedProgramId = getExpandedProgramId(partner);

    return (
      <React.Fragment key={partner.id}>
        <tr
          onClick={() => toggleExpand(partner.id)}
          className={`cursor-pointer transition-colors group ${expandedId === partner.id ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}
        >
          <td className="px-6 py-4 text-center text-sm font-semibold text-slate-500">{rowNumber}</td>
          <td className="px-6 py-4">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-[#0d141b]">{partner.name}</span>
              <span className="text-xs text-slate-400">{partner.type}</span>
            </div>
          </td>
          <td className="px-6 py-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">{partner.flag}</span>
              <span className="text-sm font-medium text-slate-700">{COUNTRY_LABEL[partner.country]}</span>
            </div>
          </td>
          <td className="px-6 py-4">
            <span className="rounded bg-blue-50 px-2 py-1 text-xs font-bold text-[#0d47a1]">{partner.ranking}</span>
          </td>
          <td className="px-6 py-4">
            <span className="text-sm font-medium text-slate-700">{partner.intake}</span>
          </td>
          <td className="px-6 py-4 text-center">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-[#0d47a1]">{partner.applicants}</span>
          </td>
          <td className="px-6 py-4">{getLevelBadge(partner.level)}</td>
          <td className="px-6 py-4 text-right">
            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  openEditPartnerModal(partner);
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                title="Chỉnh sửa đối tác"
              >
                <Pencil size={14} />
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handleDeletePartner(partner);
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                title="Xóa đối tác"
              >
                <Trash2 size={14} />
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  toggleExpand(partner.id);
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-[#0d47a1]"
                title={expandedId === partner.id ? 'Thu gọn' : 'Mở chi tiết'}
              >
                {expandedId === partner.id ? (
                  <ChevronUp size={20} className="text-[#0d47a1]" />
                ) : (
                  <ChevronDown size={20} className="text-slate-400 group-hover:text-[#0d47a1]" />
                )}
              </button>
            </div>
          </td>
        </tr>

        {expandedId === partner.id && (
          <tr className="animate-in slide-in-from-top-1 bg-slate-50/50">
            <td colSpan={8} className="border-b border-slate-100 px-0 py-0">
              <div className="my-1.5 ml-6 rounded-r-lg border-l-4 border-[#0d47a1] bg-white px-4 py-4 shadow-inner">
                <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-xl border border-[#f1f5f9] bg-white px-4 py-3">
                    <div className="flex items-start gap-2">
                      <Building2 size={14} className="mt-0.5 text-slate-400" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Quốc gia</p>
                        <p className="mt-1 text-[12px] font-semibold text-slate-800">{COUNTRY_LABEL[partner.country]}</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-[#f1f5f9] bg-white px-4 py-3">
                    <div className="flex items-start gap-2">
                      <School size={14} className="mt-0.5 text-slate-400" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Loại trường</p>
                        <p className="mt-1 text-[12px] font-semibold text-slate-800">{partner.details.schoolType || 'Chưa cập nhật'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-[#f1f5f9] bg-white px-4 py-3">
                    <div className="flex items-start gap-2">
                      <Globe size={14} className="mt-0.5 text-slate-400" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Website</p>
                        {partner.details.website ? (
                          <a
                            href={partner.details.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 block break-all text-[12px] font-semibold text-[#0d47a1] hover:underline"
                          >
                            {partner.details.website.replace(/^https?:\/\//, '')}
                          </a>
                        ) : (
                          <p className="mt-1 text-[12px] font-medium text-slate-500">Chưa cập nhật</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-[#f1f5f9] bg-white px-4 py-3">
                    <div className="flex items-start gap-2">
                      <Award size={14} className="mt-0.5 text-slate-400" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Ranking</p>
                        <p className="mt-1 text-[12px] font-semibold text-slate-800">{partner.ranking}</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-[#f1f5f9] bg-white px-4 py-3 md:col-span-2 xl:col-span-1">
                    <div className="flex items-start gap-2">
                      <MapPin size={14} className="mt-0.5 text-slate-400" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Địa chỉ</p>
                        <p className="mt-1 text-[12px] font-medium leading-5 text-slate-700">{partner.details.address || 'Chưa cập nhật'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 md:col-span-2 xl:col-span-1">
                    <div className="flex items-start gap-2">
                      <StickyNote size={14} className="mt-0.5 text-amber-600" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">Ghi chú nội bộ</p>
                        <p className="mt-1 text-[12px] font-medium leading-5 text-slate-700">{partner.details.note || 'Chưa cập nhật'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 border-t border-[#f1f5f9] pt-4">
                  <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                        <BookOpen size={14} /> Dashboard chương trình
                      </p>
                      <h3 className="mt-1 text-[14px] font-bold text-slate-900">Danh sách chương trình liên kết</h3>
                    </div>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-bold text-[#0d47a1]">
                      {partner.details.programs.length} chương trình
                    </span>
                  </div>

                  <div className="space-y-2">
                    {partner.details.programs.map((program) => {
                      const isOpen = expandedProgramId === program.id;

                      return (
                        <div key={program.id} className={`overflow-hidden rounded-xl border transition-colors ${isOpen ? 'border-blue-200 bg-blue-50/30' : 'border-[#f1f5f9] bg-white'}`}>
                          <button
                            type="button"
                            onClick={() => toggleProgramDetails(partner.id, program.id)}
                            className="w-full px-4 py-3 text-left"
                          >
                            <div className="hidden grid-cols-[1.8fr_1.4fr_1.1fr_0.95fr_0.95fr_1fr_0.85fr_0.95fr_18px] gap-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 lg:grid">
                              <span>Chương trình</span>
                              <span>Trường</span>
                              <span>Ngành</span>
                              <span>Cấp bậc</span>
                              <span>Ngôn ngữ</span>
                              <span>Kỳ nhập học</span>
                              <span>Phỏng vấn</span>
                              <span>Số lượng</span>
                              <span></span>
                            </div>
                            <div className="mt-2 hidden items-center gap-3 lg:grid lg:grid-cols-[1.8fr_1.4fr_1.1fr_0.95fr_0.95fr_1fr_0.85fr_0.95fr_18px]">
                              <span className="text-[12px] font-bold leading-5 text-slate-900">{program.name}</span>
                              <span className="text-[12px] font-medium leading-5 text-slate-700">{program.school}</span>
                              <span className="text-[12px] font-medium text-slate-700">{program.major}</span>
                              <span className="text-[12px] font-medium text-slate-700">{program.degreeLevel}</span>
                              <span className="text-[12px] font-medium text-slate-700">{program.language}</span>
                              <span className="text-[12px] font-medium text-slate-700">{program.intake}</span>
                              <span className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[11px] font-bold ${program.interviewRequired ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'}`}>
                                {program.interviewRequired ? 'Có' : 'Không'}
                              </span>
                              <span className="text-[12px] font-bold text-slate-800">{program.quantity}</span>
                              <span className="flex justify-end">{isOpen ? <ChevronUp size={15} className="text-[#0d47a1]" /> : <ChevronDown size={15} className="text-slate-400" />}</span>
                            </div>

                            <div className="space-y-1.5 lg:hidden">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-[12px] font-bold leading-5 text-slate-900">{program.name}</p>
                                  <p className="text-xs font-medium text-slate-500">{program.school}</p>
                                </div>
                                {isOpen ? <ChevronUp size={15} className="text-[#0d47a1]" /> : <ChevronDown size={15} className="text-slate-400" />}
                              </div>
                              <div className="grid grid-cols-2 gap-1.5 text-[12px] text-slate-600">
                                <span><strong>Ngành:</strong> {program.major}</span>
                                <span><strong>Cấp bậc:</strong> {program.degreeLevel}</span>
                                <span><strong>Ngôn ngữ:</strong> {program.language}</span>
                                <span><strong>Kỳ:</strong> {program.intake}</span>
                                <span><strong>Phỏng vấn:</strong> {program.interviewRequired ? 'Có' : 'Không'}</span>
                                <span><strong>Số lượng:</strong> {program.quantity}</span>
                              </div>
                            </div>
                          </button>

                          {isOpen && (
                            <div className="border-t border-[#f1f5f9] bg-white px-4 py-3">
                              <div className="mb-2.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                                <Users size={14} /> Yêu cầu từng ngành
                              </div>
                              <div className="space-y-2">
                                {program.requirements.map((requirement, index) => (
                                  <div key={`${program.id}-${index}`} className="grid grid-cols-1 gap-3 rounded-xl border border-[#f1f5f9] bg-slate-50/50 p-3 md:grid-cols-2 xl:grid-cols-6">
                                    <div>
                                      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Chương trình</p>
                                      <p className="text-[12px] font-bold leading-5 text-slate-900">{requirement.program}</p>
                                      <p className="mt-1 text-[12px] text-slate-500">Ngành: {requirement.major}</p>
                                    </div>
                                    <div>
                                      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">GPA</p>
                                      <p className="text-[12px] font-bold text-slate-800">{requirement.gpa}</p>
                                    </div>
                                    <div>
                                      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Yêu cầu ngoại ngữ</p>
                                      <p className="text-[12px] font-medium text-slate-700">{requirement.languageRequirement}</p>
                                    </div>
                                    <div>
                                      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">APS</p>
                                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${requirement.apsRequired ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-700'}`}>
                                        {requirement.apsRequired ? 'Có yêu cầu' : 'Không yêu cầu'}
                                      </span>
                                    </div>
                                    <div>
                                      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Học phí</p>
                                      <p className="text-[12px] font-bold text-slate-800">{requirement.tuition}</p>
                                    </div>
                                    <div>
                                      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Phỏng vấn</p>
                                      <p className="text-[12px] font-medium text-slate-700">{program.interviewRequired ? 'Có phỏng vấn' : 'Không phỏng vấn'}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  };

  const modalFieldClass =
    'h-10 w-full border-0 border-b border-slate-200 bg-transparent px-0 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-0';
  const modalSelectClass = `${modalFieldClass} pr-8`;
  const modalTextAreaClass =
    'min-h-[68px] w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-5 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100';
  const modalLabelClass = 'mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-600';
  const modalSectionGridClass = 'grid gap-x-8 gap-y-3.5 md:grid-cols-2';
  const getPartnerTabClass = (tabId: PartnerModalTab) =>
    activePartnerTab === tabId
      ? 'border-blue-600 bg-white text-blue-700 shadow-sm'
      : 'border-transparent bg-transparent text-slate-500 hover:border-slate-200 hover:bg-white hover:text-slate-700';

  return decodeMojibakeReactNode(
    <div className="flex h-full flex-col overflow-y-auto bg-[#f8fafc] font-sans text-[#0d141b]">
      <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-6 p-6 lg:p-10">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Cơ sở dữ liệu Đối tác</h1>
            <p className="mt-1 text-slate-500">Quản lý mạng lưới trường đại học liên kết tại Đức và Trung Quốc.</p>
          </div>
          <button
            type="button"
            onClick={openCreatePartnerModal}
            className="flex items-center gap-2 rounded-lg bg-[#0d47a1] px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#0a3d8b]"
          >
            <Plus size={18} /> Thêm Đối tác Mới
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="relative">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-[320px] flex-1">
                <PinnedSearchInput
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Tìm kiếm theo tên trường..."
                  chips={activeSearchChips}
                  onRemoveChip={removeSearchChip}
                  onClearAll={clearAllSearchFilters}
                  clearAllAriaLabel="Xóa tất cả bộ lọc đối tác trường"
                  className="min-h-[42px] rounded-xl border-slate-200 bg-slate-50 px-3 py-1.5 shadow-none"
                  inputClassName="h-7 text-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <ToolbarTimeFilter
                  isOpen={showTimePicker}
                  fieldOptions={PARTNER_TIME_FIELD_OPTIONS}
                  fieldPlaceholderValue={PARTNER_TIME_PLACEHOLDER}
                  fieldPlaceholderLabel="H\u00E0nh \u0111\u1ED9ng"
                  selectedField={timeFilterField}
                  selectedRangeType={timeRangeType}
                  customRange={customRange}
                  presets={TIME_RANGE_PRESETS}
                  onOpenChange={handleTimeFilterOpenChange}
                  onFieldChange={handleTimeFilterFieldChange}
                  onPresetSelect={handleTimePresetSelect}
                  onCustomRangeChange={setCustomRange}
                  onReset={() => {
                    setTimeFilterField(PARTNER_TIME_PLACEHOLDER);
                    setTimeRangeType('all');
                    setCustomRange(null);
                    setShowTimePicker(false);
                  }}
                  onCancel={() => setShowTimePicker(false)}
                  onApplyCustomRange={handleApplyCustomTimeRange}
                  controlClassName="min-h-[42px] rounded-xl border-slate-200 shadow-none"
                  fieldSectionClassName="bg-white"
                  fieldSelectClassName="text-[13px]"
                  rangeButtonClassName="px-3 text-[13px]"
                  className="shrink-0"
                />

                <AdvancedFilterDropdown
                  isOpen={showAdvancedFilterDropdown}
                  activeCount={advancedFilterActiveCount}
                  hasActiveFilters={hasAdvancedFilters}
                  filterOptions={PARTNER_ADVANCED_FILTER_OPTIONS}
                  groupOptions={[]}
                  selectedFilterFieldIds={selectedAdvancedFilterFields}
                  selectedGroupFieldIds={[]}
                  activeFilterField={activeAdvancedFilterField}
                  selectableValues={advancedFilterSelectableValues}
                  selectedFilterValue={
                    activeAdvancedFilterField
                      ? selectedAdvancedFilterValues[activeAdvancedFilterField.id as PartnerAdvancedFieldKey] || ''
                      : ''
                  }
                  selectedFilterValuesByField={selectedAdvancedFilterValues}
                  selectableValuesByField={advancedFilterSelectableValuesByField}
                  onOpenChange={handleAdvancedFilterOpenChange}
                  onToggleFilterField={(fieldId) => toggleAdvancedFilterField(fieldId as PartnerAdvancedFieldKey)}
                  onToggleGroupField={() => undefined}
                  onFilterValueChange={() => undefined}
                  onFilterValueChangeForField={(fieldId, value) =>
                    handleAdvancedFilterValueChange(fieldId as PartnerAdvancedFieldKey, value)
                  }
                  onClearAll={() => {
                    setSelectedAdvancedFilterFields([]);
                    setSelectedAdvancedFilterValues({});
                  }}
                  triggerLabel="Lọc nâng cao"
                  filterDescription="Chọn quốc gia, chương trình, kỳ nhập học và ngành để lọc nhanh danh sách đối tác trường."
                  triggerClassName="min-h-[42px] rounded-xl px-3 py-1.5 text-[13px] font-medium shadow-none"
                  className="shrink-0"
                />

                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50"
                  >
                    Xóa lọc
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="w-16 px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500">STT</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Tên trường</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Quốc gia</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Ranking</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Kỳ nhập học</th>
                <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Hồ sơ hiện tại</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Cấp độ đối tác</th>
                <th className="w-36 px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {groupBy.length === 0 && filteredPartners.map((partner, index) => renderPartnerRow(partner, index + 1))}

              {groupBy.length > 0 &&
                (() => {
                  let currentIndex = 0;

                  return groupedPartners.map((group) => {
                    const groupStartIndex = currentIndex;
                    currentIndex += group.items.length;

                    return (
                      <React.Fragment key={group.label}>
                        <tr className="border-b border-slate-200 bg-slate-50">
                          <td colSpan={8} className="px-6 py-2 text-sm font-semibold text-slate-700">
                            <div className="flex items-center justify-between gap-3">
                              <span>{group.label}</span>
                              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-500">{group.items.length} đối tác</span>
                            </div>
                          </td>
                        </tr>
                        {group.items.map((partner, index) => renderPartnerRow(partner, groupStartIndex + index + 1))}
                      </React.Fragment>
                    );
                  });
                })()}

              {filteredPartners.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-sm text-slate-500">
                    Không có đối tác phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-4 text-sm font-medium text-slate-500">
            <p>Hiển thị {filteredPartners.length} đối tác trong tổng số {partners.length} đối tác</p>
            <div className="flex gap-2">
              <button className="rounded-md border border-slate-200 px-3 py-1 hover:bg-slate-50 disabled:opacity-50" disabled>
                Trước
              </button>
              <button className="rounded-md border border-slate-200 bg-slate-100 px-3 py-1 font-bold text-slate-900">1</button>
              <button className="rounded-md border border-slate-200 px-3 py-1 hover:bg-slate-50">2</button>
              <button className="rounded-md border border-slate-200 px-3 py-1 hover:bg-slate-50">3</button>
              <button className="rounded-md border border-slate-200 px-3 py-1 hover:bg-slate-50">Sau</button>
            </div>
          </div>
        </div>

        {showPartnerModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/45 p-4 backdrop-blur-sm">
            <div className="flex min-h-full items-start justify-center py-4">
              <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-[#fcfcfd] shadow-[0_28px_80px_rgba(15,23,42,0.22)]">
                <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
                  <div className="flex items-start justify-between gap-4 px-6 py-5">
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-600">Partner Profile</div>
                  <h3 className="mt-2 truncate text-2xl font-semibold text-slate-900">
                        {partnerForm.name.trim() || (editingPartnerId !== null ? 'Chỉnh sửa đối tác trường' : 'Đối tác trường mới')}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {editingPartnerId !== null
                          ? 'Chỉnh sửa hồ sơ trường theo từng nhóm thông tin để xử lý nhanh hơn.'
                          : 'Tạo hồ sơ đối tác trường mới theo từng nhóm dữ liệu để tránh form quá dài.'}
                      </p>
                      <h3 className="hidden">
                    {editingPartnerId !== null ? 'Chỉnh sửa đối tác trường' : 'Tạo đối tác trường mới'}
                  </h3>
                  <p className="hidden">
                    Cập nhật thông tin trường, chỉ tiêu và ghi chú nội bộ. Danh sách chương trình liên kết hiện có sẽ được giữ nguyên.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closePartnerModal}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:border-slate-300 hover:text-slate-600"
                  aria-label="Đóng"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="border-t border-slate-100 bg-slate-50/90 px-6">
                <div className="flex flex-wrap gap-2 py-3">
                  {PARTNER_MODAL_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActivePartnerTab(tab.id)}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${getPartnerTabClass(tab.id)}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
                </div>

                <form onSubmit={handleSavePartner} className="flex min-h-0 flex-1 flex-col">
                  <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                    {activePartnerTab === 'general' && (
                      <div className={modalSectionGridClass}>
                        <div className="space-y-3.5">
                          <div>
                            <label className={modalLabelClass}>Tên trường</label>
                            <input
                              className={modalFieldClass}
                              value={partnerForm.name}
                              onChange={(event) => updatePartnerFormField('name', event.target.value)}
                              placeholder="Nhập tên trường"
                              required
                            />
                          </div>
                          <div>
                            <label className={modalLabelClass}>Quốc gia</label>
                            <select
                              className={modalSelectClass}
                              value={partnerForm.country}
                              onChange={(event) => updatePartnerFormField('country', event.target.value as IStudyAbroadPartner['country'])}
                            >
                              <option value="Germany">Đức</option>
                              <option value="China">Trung Quốc</option>
                            </select>
                          </div>
                          <div>
                            <label className={modalLabelClass}>Địa chỉ</label>
                            <input
                              className={modalFieldClass}
                              value={partnerForm.address}
                              onChange={(event) => updatePartnerFormField('address', event.target.value)}
                              placeholder="Nhập địa chỉ trường"
                            />
                          </div>
                          <div>
                            <label className={modalLabelClass}>Website</label>
                            <input
                              className={modalFieldClass}
                              value={partnerForm.website}
                              onChange={(event) => updatePartnerFormField('website', event.target.value)}
                              placeholder="https://..."
                            />
                          </div>
                        </div>

                        <div className="space-y-3.5">
                          <div>
                            <label className={modalLabelClass}>Loại trường</label>
                            <input
                              className={modalFieldClass}
                              value={partnerForm.type}
                              onChange={(event) => updatePartnerFormField('type', event.target.value)}
                              placeholder="Ví dụ: Đại học công lập"
                              required
                            />
                          </div>
                          <div>
                            <label className={modalLabelClass}>Mô hình trường</label>
                            <input
                              className={modalFieldClass}
                              value={partnerForm.schoolType}
                              onChange={(event) => updatePartnerFormField('schoolType', event.target.value)}
                              placeholder="Công lập / Tư thục"
                            />
                          </div>
                          <div>
                            <label className={modalLabelClass}>Cấp độ đối tác</label>
                            <select
                              className={modalSelectClass}
                              value={partnerForm.level}
                              onChange={(event) => updatePartnerFormField('level', event.target.value as PartnerLevel)}
                            >
                              <option value="GOLD">Vàng</option>
                              <option value="SILVER">Bạc</option>
                              <option value="PREMIUM">Cao cấp</option>
                            </select>
                          </div>
                          <div>
                            <label className={modalLabelClass}>Xếp hạng Global</label>
                            <input
                              className={modalFieldClass}
                              value={partnerForm.rankingGlobal}
                              onChange={(event) => updatePartnerFormField('rankingGlobal', event.target.value)}
                              placeholder="Top 50 thế giới"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {activePartnerTab === 'admissions' && (
                      <div className={modalSectionGridClass}>
                        <div className="space-y-3.5">
                          <div>
                            <label className={modalLabelClass}>Học phí</label>
                            <input
                              className={modalFieldClass}
                              value={partnerForm.tuition}
                              onChange={(event) => updatePartnerFormField('tuition', event.target.value)}
                              placeholder="Ví dụ: EUR 1,500 / kỳ"
                            />
                          </div>
                          <div>
                            <label className={modalLabelClass}>Chỉ tiêu</label>
                            <input
                              className={modalFieldClass}
                              value={partnerForm.quota}
                              onChange={(event) => updatePartnerFormField('quota', event.target.value)}
                              placeholder="Ví dụ: 50 sinh viên/năm"
                            />
                          </div>
                          <div>
                            <label className={modalLabelClass}>Ranking</label>
                            <input
                              className={modalFieldClass}
                              value={partnerForm.ranking}
                              onChange={(event) => updatePartnerFormField('ranking', event.target.value)}
                              placeholder="Ví dụ: #1 Đức"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-3.5">
                          <div>
                            <label className={modalLabelClass}>Kỳ nhập học</label>
                            <input
                              className={modalFieldClass}
                              value={partnerForm.intake}
                              onChange={(event) => updatePartnerFormField('intake', event.target.value)}
                              placeholder="Ví dụ: Tháng 4, 10"
                              required
                            />
                          </div>
                          <div>
                            <label className={modalLabelClass}>Hồ sơ hiện tại</label>
                            <input
                              type="number"
                              min="0"
                              className={modalFieldClass}
                              value={partnerForm.applicants}
                              onChange={(event) => updatePartnerFormField('applicants', event.target.value)}
                              placeholder="Số lượng hồ sơ"
                            />
                          </div>
                          <div>
                            <label className={modalLabelClass}>CMTC</label>
                            <input
                              className={modalFieldClass}
                              value={partnerForm.cmtc}
                              onChange={(event) => updatePartnerFormField('cmtc', event.target.value)}
                              placeholder="Điều kiện chứng minh tài chính"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {activePartnerTab === 'details' && (
                      <div className="grid gap-x-6 gap-y-3 md:grid-cols-2">
                        <div>
                          <label className={modalLabelClass}>Ngành tuyển sinh</label>
                          <textarea
                            rows={2}
                            className={modalTextAreaClass}
                            value={partnerForm.majorsText}
                            onChange={(event) => updatePartnerFormField('majorsText', event.target.value)}
                            placeholder="Phân tách bằng dấu phẩy hoặc xuống dòng"
                          />
                        </div>
                        <div>
                          <label className={modalLabelClass}>Yêu cầu đầu vào</label>
                          <textarea
                            rows={2}
                            className={modalTextAreaClass}
                            value={partnerForm.requirementsText}
                            onChange={(event) => updatePartnerFormField('requirementsText', event.target.value)}
                            placeholder="Mỗi yêu cầu một dòng hoặc phân tách bằng dấu phẩy"
                          />
                        </div>
                        <div>
                          <label className={modalLabelClass}>Tổng quan</label>
                          <textarea
                            rows={2}
                            className={modalTextAreaClass}
                            value={partnerForm.overview}
                            onChange={(event) => updatePartnerFormField('overview', event.target.value)}
                            placeholder="Mô tả ngắn về đối tác"
                          />
                        </div>
                        <div>
                          <label className={modalLabelClass}>Ghi chú nội bộ</label>
                          <textarea
                            rows={2}
                            className={modalTextAreaClass}
                            value={partnerForm.note}
                            onChange={(event) => updatePartnerFormField('note', event.target.value)}
                            placeholder="Ghi chú cho đội xử lý hồ sơ"
                          />
                        </div>
                      </div>
                    )}
                    {false && (
                      <>
                    <div>
                    <label className={modalLabelClass}>Tên trường</label>
                    <input
                      className={modalFieldClass}
                      value={partnerForm.name}
                      onChange={(event) => updatePartnerFormField('name', event.target.value)}
                      placeholder="Nhập tên trường"
                      required
                    />
                  </div>
                  <div>
                    <label className={modalLabelClass}>Loại trường</label>
                    <input
                      className={modalFieldClass}
                      value={partnerForm.type}
                      onChange={(event) => updatePartnerFormField('type', event.target.value)}
                      placeholder="Ví dụ: Đại học công lập"
                      required
                    />
                  </div>
                  <div>
                    <label className={modalLabelClass}>Quốc gia</label>
                    <select
                      className={modalFieldClass}
                      value={partnerForm.country}
                      onChange={(event) => updatePartnerFormField('country', event.target.value as IStudyAbroadPartner['country'])}
                    >
                      <option value="Germany">Đức</option>
                      <option value="China">Trung Quốc</option>
                    </select>
                  </div>
                  <div>
                    <label className={modalLabelClass}>Cấp độ đối tác</label>
                    <select
                      className={modalFieldClass}
                      value={partnerForm.level}
                      onChange={(event) => updatePartnerFormField('level', event.target.value as PartnerLevel)}
                    >
                      <option value="GOLD">Vàng</option>
                      <option value="SILVER">Bạc</option>
                      <option value="PREMIUM">Cao cấp</option>
                    </select>
                  </div>
                  <div>
                    <label className={modalLabelClass}>Ranking</label>
                    <input
                      className={modalFieldClass}
                      value={partnerForm.ranking}
                      onChange={(event) => updatePartnerFormField('ranking', event.target.value)}
                      placeholder="Ví dụ: #1 Đức"
                      required
                    />
                  </div>
                  <div>
                    <label className={modalLabelClass}>Kỳ nhập học</label>
                    <input
                      className={modalFieldClass}
                      value={partnerForm.intake}
                      onChange={(event) => updatePartnerFormField('intake', event.target.value)}
                      placeholder="Ví dụ: Tháng 4, 10"
                      required
                    />
                  </div>
                  <div>
                    <label className={modalLabelClass}>Hồ sơ hiện tại</label>
                    <input
                      type="number"
                      min="0"
                      className={modalFieldClass}
                      value={partnerForm.applicants}
                      onChange={(event) => updatePartnerFormField('applicants', event.target.value)}
                      placeholder="Số lượng hồ sơ"
                    />
                  </div>
                  <div>
                    <label className={modalLabelClass}>Website</label>
                    <input
                      className={modalFieldClass}
                      value={partnerForm.website}
                      onChange={(event) => updatePartnerFormField('website', event.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <label className={modalLabelClass}>Mô hình trường</label>
                    <input
                      className={modalFieldClass}
                      value={partnerForm.schoolType}
                      onChange={(event) => updatePartnerFormField('schoolType', event.target.value)}
                      placeholder="Công lập / Tư thục"
                    />
                  </div>
                  <div>
                    <label className={modalLabelClass}>Xếp hạng global</label>
                    <input
                      className={modalFieldClass}
                      value={partnerForm.rankingGlobal}
                      onChange={(event) => updatePartnerFormField('rankingGlobal', event.target.value)}
                      placeholder="Top 50 thế giới"
                    />
                  </div>
                  <div>
                    <label className={modalLabelClass}>Học phí</label>
                    <input
                      className={modalFieldClass}
                      value={partnerForm.tuition}
                      onChange={(event) => updatePartnerFormField('tuition', event.target.value)}
                      placeholder="Ví dụ: EUR 1,500 / kỳ"
                    />
                  </div>
                  <div>
                    <label className={modalLabelClass}>Chỉ tiêu</label>
                    <input
                      className={modalFieldClass}
                      value={partnerForm.quota}
                      onChange={(event) => updatePartnerFormField('quota', event.target.value)}
                      placeholder="Ví dụ: 50 sinh viên/năm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className={modalLabelClass}>Địa chỉ</label>
                    <input
                      className={modalFieldClass}
                      value={partnerForm.address}
                      onChange={(event) => updatePartnerFormField('address', event.target.value)}
                      placeholder="Nhập địa chỉ trường"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className={modalLabelClass}>CMTC</label>
                    <input
                      className={modalFieldClass}
                      value={partnerForm.cmtc}
                      onChange={(event) => updatePartnerFormField('cmtc', event.target.value)}
                      placeholder="Điều kiện chứng minh tài chính"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className={modalLabelClass}>Ngành tuyển sinh</label>
                    <textarea
                      rows={2}
                      className={modalTextAreaClass}
                      value={partnerForm.majorsText}
                      onChange={(event) => updatePartnerFormField('majorsText', event.target.value)}
                      placeholder="Phân tách bằng dấu phẩy hoặc xuống dòng"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className={modalLabelClass}>Yêu cầu đầu vào</label>
                    <textarea
                      rows={3}
                      className={modalTextAreaClass}
                      value={partnerForm.requirementsText}
                      onChange={(event) => updatePartnerFormField('requirementsText', event.target.value)}
                      placeholder="Mỗi yêu cầu một dòng hoặc phân tách bằng dấu phẩy"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className={modalLabelClass}>Tổng quan</label>
                    <textarea
                      rows={3}
                      className={modalTextAreaClass}
                      value={partnerForm.overview}
                      onChange={(event) => updatePartnerFormField('overview', event.target.value)}
                      placeholder="Mô tả ngắn về đối tác"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className={modalLabelClass}>Ghi chú nội bộ</label>
                    <textarea
                      rows={3}
                      className={modalTextAreaClass}
                      value={partnerForm.note}
                      onChange={(event) => updatePartnerFormField('note', event.target.value)}
                      placeholder="Ghi chú cho đội xử lý hồ sơ"
                    />
                  </div>
                      </>
                    )}
                  </div>

                <div className="sticky bottom-0 z-20 border-t border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="text-sm text-slate-500">
                      {activePartnerTab === 'general' && 'Thông tin định danh và cấp độ hợp tác của trường.'}
                      {activePartnerTab === 'admissions' && 'Nhóm dữ liệu tuyển sinh, học phí và năng lực tiếp nhận hồ sơ.'}
                      {activePartnerTab === 'details' && 'Chi tiết mô tả, yêu cầu đầu vào và ghi chú nội bộ.'}
                    </div>
                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
                      {editingPartnerId !== null ? (
                        <button
                          type="button"
                          onClick={() => {
                            const currentPartner = partners.find((partner) => partner.id === editingPartnerId);
                            if (currentPartner) handleDeletePartner(currentPartner);
                          }}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                        >
                          <Trash2 size={15} />
                          Xóa đối tác
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={closePartnerModal}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                      >
                        {editingPartnerId !== null ? 'Lưu thay đổi' : 'Tạo đối tác'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="hidden">
                  <div>
                    {editingPartnerId !== null ? (
                      <button
                        type="button"
                        onClick={() => {
                          const currentPartner = partners.find((partner) => partner.id === editingPartnerId);
                          if (currentPartner) handleDeletePartner(currentPartner);
                        }}
                        className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                      >
                        <Trash2 size={15} />
                        Xóa đối tác
                      </button>
                    ) : null}
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={closePartnerModal}
                      className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                      {editingPartnerId !== null ? 'Lưu thay đổi' : 'Tạo đối tác'}
                    </button>
                  </div>
                </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudyAbroadPartners;
