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
  Calendar
} from 'lucide-react';
import PinnedSearchInput, { PinnedSearchChip } from '../components/PinnedSearchInput';
import { decodeMojibakeReactNode, decodeMojibakeText } from '../utils/mojibake';

type PartnerLevel = 'GOLD' | 'SILVER' | 'PREMIUM';
type CountryFilter = 'ALL' | 'Germany' | 'China';
type WebsiteFilter = 'ALL' | 'HAS_WEBSITE' | 'NO_WEBSITE';
type ApplicantBand = 'ALL' | 'UNDER_80' | 'FROM_80_TO_120' | 'OVER_120';
type PartnerActionKey = 'ALL' | 'CREATED' | 'PROFILE_UPDATED' | 'AGREEMENT_RENEWED' | 'PROGRAM_REVIEWED';
type TimeRangeType = 'all' | 'today' | 'yesterday' | 'thisWeek' | 'last7Days' | 'last30Days' | 'thisMonth' | 'lastMonth' | 'custom';
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

const COUNTRY_LABEL: Record<IStudyAbroadPartner['country'], string> = {
  Germany: 'Đức',
  China: 'Trung Quốc'
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

const normalizePartner = (partner: IStudyAbroadPartner): IStudyAbroadPartner => ({
  ...partner,
  name: decodeMojibakeText(partner.name),
  type: decodeMojibakeText(partner.type),
  ranking: decodeMojibakeText(partner.ranking),
  intake: decodeMojibakeText(partner.intake),
  details: {
    tuition: decodeMojibakeText(partner.details.tuition),
    requirements: (partner.details.requirements || []).map((item) => decodeMojibakeText(item)),
    address: decodeMojibakeText(partner.details.address),
    quota: decodeMojibakeText(partner.details.quota),
    cmtc: decodeMojibakeText(partner.details.cmtc),
    note: decodeMojibakeText(partner.details.note),
    majors: (partner.details.majors || []).map((item) => decodeMojibakeText(item)),
    overview: decodeMojibakeText(partner.details.overview || ''),
    website: decodeMojibakeText(partner.details.website || ''),
    schoolType: decodeMojibakeText(partner.details.schoolType || ''),
    rankingGlobal: decodeMojibakeText(partner.details.rankingGlobal || ''),
    programs: (partner.details.programs || []).map((program) => ({
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
  const partners = useMemo(() => PARTNERS.map(normalizePartner), []);
  const [expandedId, setExpandedId] = useState<number | null>(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
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

  const typeOptions = useMemo(() => Array.from(new Set(partners.map((partner) => partner.type))).filter(Boolean), [partners]);
  const rankingOptions = useMemo(() => Array.from(new Set(partners.map((partner) => partner.ranking))).filter(Boolean), [partners]);
  const intakeOptions = useMemo(() => Array.from(new Set(partners.map((partner) => partner.intake))).filter(Boolean), [partners]);
  const schoolTypeOptions = useMemo(
    () => Array.from(new Set(partners.map((partner) => partner.details.schoolType).filter(Boolean))) as string[],
    [partners]
  );
  const rankingGlobalOptions = useMemo(
    () => Array.from(new Set(partners.map((partner) => partner.details.rankingGlobal).filter(Boolean))) as string[],
    [partners]
  );
  const majorOptions = useMemo(
    () => Array.from(new Set(partners.flatMap((partner) => partner.details.majors || []).filter(Boolean))) as string[],
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
  const hasTimeFilter = timeRangeType !== 'all' && (timeRangeType !== 'custom' || (!!startDateFromFilter && !!endDateToFilter));
  const timeRangeLabel = useMemo(() => {
    if (timeRangeType === 'custom') {
      return formatCustomDateRangeLabel(startDateFromFilter, endDateToFilter);
    }

    return TIME_RANGE_PRESETS.find((item) => item.id === timeRangeType)?.label || 'Tất cả thời gian';
  }, [endDateToFilter, startDateFromFilter, timeRangeType]);

  const activeFilterCount = useMemo(
    () =>
      [
        actionFilter !== 'ALL',
        hasTimeFilter,
        countryFilter !== 'ALL',
        levelFilter !== 'ALL',
        typeFilter !== 'ALL',
        rankingFilter !== 'ALL',
        intakeFilter !== 'ALL',
        schoolTypeFilter !== 'ALL',
        rankingGlobalFilter !== 'ALL',
        majorFilter !== 'ALL',
        quotaFilter !== 'ALL',
        cmtcFilter !== 'ALL',
        websiteFilter !== 'ALL',
        applicantBandFilter !== 'ALL',
        groupBy.length > 0
      ].filter(Boolean).length,
    [
      actionFilter,
      hasTimeFilter,
      countryFilter,
      levelFilter,
      typeFilter,
      rankingFilter,
      intakeFilter,
      schoolTypeFilter,
      rankingGlobalFilter,
      majorFilter,
      quotaFilter,
      cmtcFilter,
      websiteFilter,
      applicantBandFilter,
      groupBy.length
    ]
  );

  const activeSearchChips = useMemo<PinnedSearchChip[]>(() => {
    const chips: PinnedSearchChip[] = [];
    if (actionFilter !== 'ALL') chips.push({ key: 'action', label: `Hành động: ${PARTNER_ACTION_LABEL[actionFilter]}` });
    if (hasTimeFilter) chips.push({ key: 'timeRange', label: `Thời gian: ${timeRangeLabel}` });

    if (countryFilter !== 'ALL') chips.push({ key: 'country', label: `Quốc gia: ${COUNTRY_LABEL[countryFilter]}` });
    if (levelFilter !== 'ALL') chips.push({ key: 'level', label: `Cấp độ: ${LEVEL_LABEL[levelFilter]}` });
    if (typeFilter !== 'ALL') chips.push({ key: 'type', label: `Loại trường: ${typeFilter}` });
    if (rankingFilter !== 'ALL') chips.push({ key: 'ranking', label: `Ranking: ${rankingFilter}` });
    if (intakeFilter !== 'ALL') chips.push({ key: 'intake', label: `Kỳ nhập học: ${intakeFilter}` });
    if (schoolTypeFilter !== 'ALL') chips.push({ key: 'schoolType', label: `Mô hình trường: ${schoolTypeFilter}` });
    if (rankingGlobalFilter !== 'ALL') chips.push({ key: 'rankingGlobal', label: `Xếp hạng global: ${rankingGlobalFilter}` });
    if (majorFilter !== 'ALL') chips.push({ key: 'major', label: `Ngành: ${majorFilter}` });
    if (quotaFilter !== 'ALL') chips.push({ key: 'quota', label: `Chỉ tiêu: ${quotaFilter}` });
    if (cmtcFilter !== 'ALL') chips.push({ key: 'cmtc', label: `CMTC: ${cmtcFilter}` });
    if (websiteFilter !== 'ALL') chips.push({ key: 'website', label: `Website: ${websiteFilter === 'HAS_WEBSITE' ? 'Có' : 'Chưa có'}` });
    if (applicantBandFilter !== 'ALL') chips.push({ key: 'applicantBand', label: `Nhóm hồ sơ: ${APPLICANT_BAND_LABEL[applicantBandFilter]}` });
    if (groupBy.length > 0) {
      chips.push({
        key: 'groupBy',
        label: `Nhóm theo: ${groupBy.map((key) => GROUP_BY_OPTIONS.find((option) => option.key === key)?.label || key).join(', ')}`
      });
    }

    return chips;
  }, [
    actionFilter,
    hasTimeFilter,
    timeRangeLabel,
    countryFilter,
    levelFilter,
    typeFilter,
    rankingFilter,
    intakeFilter,
    schoolTypeFilter,
    rankingGlobalFilter,
    majorFilter,
    quotaFilter,
    cmtcFilter,
    websiteFilter,
    applicantBandFilter,
    groupBy
  ]);

  const resetFilters = () => {
    setShowTimePicker(false);
    setActionFilter('ALL');
    setTimeRangeType('all');
    setCountryFilter('ALL');
    setLevelFilter('ALL');
    setTypeFilter('ALL');
    setRankingFilter('ALL');
    setIntakeFilter('ALL');
    setSchoolTypeFilter('ALL');
    setRankingGlobalFilter('ALL');
    setMajorFilter('ALL');
    setQuotaFilter('ALL');
    setCmtcFilter('ALL');
    setWebsiteFilter('ALL');
    setApplicantBandFilter('ALL');
    setGroupBy([]);
    const today = formatDateInput(new Date());
    setStartDateFromFilter(today);
    setEndDateToFilter(today);
  };

  const clearAllSearchFilters = () => {
    setSearchTerm('');
    resetFilters();
    setFiltersOpen(false);
    setShowTimePicker(false);
  };

  const removeSearchChip = (chipKey: string) => {
    switch (chipKey) {
      case 'action':
        setActionFilter('ALL');
        return;
      case 'timeRange':
        setTimeRangeType('all');
        return;
      case 'country':
        setCountryFilter('ALL');
        return;
      case 'level':
        setLevelFilter('ALL');
        return;
      case 'type':
        setTypeFilter('ALL');
        return;
      case 'ranking':
        setRankingFilter('ALL');
        return;
      case 'intake':
        setIntakeFilter('ALL');
        return;
      case 'schoolType':
        setSchoolTypeFilter('ALL');
        return;
      case 'rankingGlobal':
        setRankingGlobalFilter('ALL');
        return;
      case 'major':
        setMajorFilter('ALL');
        return;
      case 'quota':
        setQuotaFilter('ALL');
        return;
      case 'cmtc':
        setCmtcFilter('ALL');
        return;
      case 'website':
        setWebsiteFilter('ALL');
        return;
      case 'applicantBand':
        setApplicantBandFilter('ALL');
        return;
      case 'groupBy':
        setGroupBy([]);
        return;
      default:
        return;
    }
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
      const matchesAction = actionFilter === 'ALL' || partner.lastAction === actionFilter;
      const matchesTimeRange = !hasTimeFilter || isDateInTimeRange(partner.lastActionDate, timeRangeType, startDateFromFilter, endDateToFilter);
      const matchesCountry = countryFilter === 'ALL' || partner.country === countryFilter;
      const matchesLevel = levelFilter === 'ALL' || partner.level === levelFilter;
      const matchesType = typeFilter === 'ALL' || partner.type === typeFilter;
      const matchesRanking = rankingFilter === 'ALL' || partner.ranking === rankingFilter;
      const matchesIntake = intakeFilter === 'ALL' || partner.intake === intakeFilter;
      const matchesSchoolType = schoolTypeFilter === 'ALL' || (partner.details.schoolType || '') === schoolTypeFilter;
      const matchesRankingGlobal = rankingGlobalFilter === 'ALL' || (partner.details.rankingGlobal || '') === rankingGlobalFilter;
      const matchesMajor = majorFilter === 'ALL' || (partner.details.majors || []).includes(majorFilter);
      const matchesQuota = quotaFilter === 'ALL' || partner.details.quota === quotaFilter;
      const matchesCmtc = cmtcFilter === 'ALL' || partner.details.cmtc === cmtcFilter;
      const matchesWebsite = websiteFilter === 'ALL' || (websiteFilter === 'HAS_WEBSITE' ? Boolean(partner.details.website) : !partner.details.website);
      const matchesApplicantBand = applicantBandFilter === 'ALL' || getApplicantBand(partner.applicants) === applicantBandFilter;

      return (
        matchesSearch &&
        matchesAction &&
        matchesTimeRange &&
        matchesCountry &&
        matchesLevel &&
        matchesType &&
        matchesRanking &&
        matchesIntake &&
        matchesSchoolType &&
        matchesRankingGlobal &&
        matchesMajor &&
        matchesQuota &&
        matchesCmtc &&
        matchesWebsite &&
        matchesApplicantBand
      );
    });
  }, [
    partners,
    searchTerm,
    actionFilter,
    hasTimeFilter,
    timeRangeType,
    startDateFromFilter,
    endDateToFilter,
    countryFilter,
    levelFilter,
    typeFilter,
    rankingFilter,
    intakeFilter,
    schoolTypeFilter,
    rankingGlobalFilter,
    majorFilter,
    quotaFilter,
    cmtcFilter,
    websiteFilter,
    applicantBandFilter
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

  const toggleExpand = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
    setFiltersOpen(false);
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
            {expandedId === partner.id ? (
              <ChevronUp size={20} className="text-[#0d47a1]" />
            ) : (
              <ChevronDown size={20} className="text-slate-400 group-hover:text-[#0d47a1]" />
            )}
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

  return decodeMojibakeReactNode(
    <div className="flex h-full flex-col overflow-y-auto bg-[#f8fafc] font-sans text-[#0d141b]">
      <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-6 p-6 lg:p-10">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Cơ sở dữ liệu Đối tác</h1>
            <p className="mt-1 text-slate-500">Quản lý mạng lưới trường đại học liên kết tại Đức và Trung Quốc.</p>
          </div>
          <button className="flex items-center gap-2 rounded-lg bg-[#0d47a1] px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#0a3d8b]">
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
                <div className="relative">
                  {showTimePicker && <div className="fixed inset-0 z-10" onClick={() => setShowTimePicker(false)} />}

                  <div className="relative z-20 flex items-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <select
                      value={actionFilter}
                      onChange={(event) => setActionFilter(event.target.value as PartnerActionKey)}
                      className="border-r border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 outline-none"
                    >
                      {PARTNER_ACTION_OPTIONS.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.label}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => {
                        setFiltersOpen(false);
                        setShowTimePicker((prev) => !prev);
                      }}
                      className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold ${
                        hasTimeFilter ? 'bg-blue-50 text-blue-700' : 'text-slate-600'
                      }`}
                    >
                      <Calendar size={16} />
                      {timeRangeLabel}
                      <ChevronRight size={14} className={`transition-transform ${showTimePicker ? 'rotate-90' : ''}`} />
                    </button>
                  </div>

                  {showTimePicker && (
                    <div className="absolute right-0 top-full z-20 mt-3 w-[560px] rounded-xl border border-slate-200 bg-white shadow-xl">
                      <div className="flex overflow-hidden rounded-xl">
                        <div className="w-40 border-r border-slate-100 bg-slate-50 p-2.5">
                          <div className="space-y-1">
                            {TIME_RANGE_PRESETS.map((preset) => (
                              <button
                                key={preset.id}
                                type="button"
                                onClick={() => applyTimeRangePreset(preset.id)}
                                className={`w-full rounded-lg px-3 py-1.5 text-left text-sm font-semibold ${
                                  timeRangeType === preset.id ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex min-h-[280px] flex-1 flex-col p-4">
                          <div className="mb-4 text-base font-bold uppercase tracking-wide text-slate-300">Khoảng thời gian tùy chỉnh</div>
                          <div className="grid grid-cols-2 gap-3">
                            <label className="text-sm">
                              <span className="mb-1.5 block text-xs font-semibold text-slate-400">Từ ngày</span>
                              <input
                                type="date"
                                value={startDateFromFilter}
                                onChange={(event) => {
                                  setTimeRangeType('custom');
                                  setStartDateFromFilter(event.target.value);
                                }}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold"
                              />
                            </label>

                            <label className="text-sm">
                              <span className="mb-1.5 block text-xs font-semibold text-slate-400">Đến ngày</span>
                              <input
                                type="date"
                                value={endDateToFilter}
                                onChange={(event) => {
                                  setTimeRangeType('custom');
                                  setEndDateToFilter(event.target.value);
                                }}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold"
                              />
                            </label>
                          </div>

                          <div className="mt-auto flex items-center justify-between pt-5">
                            <button
                              type="button"
                              onClick={() => applyTimeRangePreset('all')}
                              className="text-xs font-semibold text-slate-400 hover:text-slate-600"
                            >
                              Làm lại
                            </button>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setShowTimePicker(false)}
                                className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-500 hover:bg-slate-50"
                              >
                                Hủy
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setTimeRangeType('custom');
                                  setShowTimePicker(false);
                                }}
                                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                              >
                                Áp dụng
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowTimePicker(false);
                    setFiltersOpen((prev) => !prev);
                  }}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                    filtersOpen || activeFilterCount
                      ? 'border-blue-200 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Filter size={16} />
                  Lọc nâng cao
                  {activeFilterCount > 0 && (
                    <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[11px] font-bold text-white">{activeFilterCount}</span>
                  )}
                </button>

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

            {filtersOpen && (
              <div className="absolute right-0 top-full z-20 mt-3 w-full max-w-[760px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                <button
                  type="button"
                  onClick={() => setFiltersOpen(false)}
                  className="absolute right-3 top-3 rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50"
                >
                  Đóng
                </button>

                <div className="grid grid-cols-[1.25fr_0.95fr] items-start">
                  <div className="border-r border-slate-100 p-3">
                    <div className="mb-2 flex items-center gap-2 text-base font-semibold text-slate-800">
                      <Filter size={18} className="text-slate-700" />
                      <span>Bộ lọc</span>
                    </div>

                    <div className="space-y-2">
                      <div className="space-y-1">
                        <select value={countryFilter} onChange={(event) => setCountryFilter(event.target.value as CountryFilter)} className="w-full border-0 bg-transparent px-0 py-0 text-sm font-medium leading-5 text-slate-700 outline-none">
                          <option value="ALL">Tất cả quốc gia</option>
                          <option value="Germany">Đức</option>
                          <option value="China">Trung Quốc</option>
                        </select>
                        <select value={levelFilter} onChange={(event) => setLevelFilter(event.target.value as 'ALL' | PartnerLevel)} className="w-full border-0 bg-transparent px-0 py-0 text-sm font-medium leading-5 text-slate-700 outline-none">
                          <option value="ALL">Tất cả cấp độ đối tác</option>
                          <option value="GOLD">Vàng</option>
                          <option value="SILVER">Bạc</option>
                          <option value="PREMIUM">Cao cấp</option>
                        </select>
                        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="w-full border-0 bg-transparent px-0 py-0 text-sm font-medium leading-5 text-slate-700 outline-none">
                          <option value="ALL">Tất cả loại trường</option>
                          {typeOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        <select value={rankingFilter} onChange={(event) => setRankingFilter(event.target.value)} className="w-full border-0 bg-transparent px-0 py-0 text-sm font-medium leading-5 text-slate-700 outline-none">
                          <option value="ALL">Tất cả ranking</option>
                          {rankingOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="border-t border-slate-100 pt-2">
                        <div className="space-y-1">
                          <select value={intakeFilter} onChange={(event) => setIntakeFilter(event.target.value)} className="w-full border-0 bg-transparent px-0 py-0 text-sm font-medium leading-5 text-slate-700 outline-none">
                            <option value="ALL">Tất cả kỳ nhập học</option>
                            {intakeOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                          <select value={schoolTypeFilter} onChange={(event) => setSchoolTypeFilter(event.target.value)} className="w-full border-0 bg-transparent px-0 py-0 text-sm font-medium leading-5 text-slate-700 outline-none">
                            <option value="ALL">Tất cả mô hình trường</option>
                            {schoolTypeOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                          <select value={rankingGlobalFilter} onChange={(event) => setRankingGlobalFilter(event.target.value)} className="w-full border-0 bg-transparent px-0 py-0 text-sm font-medium leading-5 text-slate-700 outline-none">
                            <option value="ALL">Tất cả xếp hạng global</option>
                            {rankingGlobalOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                          <select value={majorFilter} onChange={(event) => setMajorFilter(event.target.value)} className="w-full border-0 bg-transparent px-0 py-0 text-sm font-medium leading-5 text-slate-700 outline-none">
                            <option value="ALL">Tất cả ngành tuyển sinh</option>
                            {majorOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="border-t border-slate-100 pt-2">
                        <div className="space-y-1">
                          <select value={quotaFilter} onChange={(event) => setQuotaFilter(event.target.value)} className="w-full border-0 bg-transparent px-0 py-0 text-sm font-medium leading-5 text-slate-700 outline-none">
                            <option value="ALL">Tất cả chỉ tiêu tuyển sinh</option>
                            {quotaOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                          <select value={cmtcFilter} onChange={(event) => setCmtcFilter(event.target.value)} className="w-full border-0 bg-transparent px-0 py-0 text-sm font-medium leading-5 text-slate-700 outline-none">
                            <option value="ALL">Tất cả CMTC</option>
                            {cmtcOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                          <select value={websiteFilter} onChange={(event) => setWebsiteFilter(event.target.value as WebsiteFilter)} className="w-full border-0 bg-transparent px-0 py-0 text-sm font-medium leading-5 text-slate-700 outline-none">
                            <option value="ALL">Tất cả trạng thái website</option>
                            <option value="HAS_WEBSITE">Có website</option>
                            <option value="NO_WEBSITE">Chưa có website</option>
                          </select>
                          <select value={applicantBandFilter} onChange={(event) => setApplicantBandFilter(event.target.value as ApplicantBand)} className="w-full border-0 bg-transparent px-0 py-0 text-sm font-medium leading-5 text-slate-700 outline-none">
                            <option value="ALL">Tất cả nhóm hồ sơ hiện tại</option>
                            <option value="UNDER_80">{APPLICANT_BAND_LABEL.UNDER_80}</option>
                            <option value="FROM_80_TO_120">{APPLICANT_BAND_LABEL.FROM_80_TO_120}</option>
                            <option value="OVER_120">{APPLICANT_BAND_LABEL.OVER_120}</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3">
                    <div className="mb-2">
                      <div className="flex items-center gap-2 text-base font-semibold text-slate-800">
                        <Rows3 size={18} className="text-slate-700" />
                        <span>Nhóm theo</span>
                      </div>
                      {groupBy.length > 0 && (
                        <div className="mt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => setGroupBy([])}
                            className="shrink-0 whitespace-nowrap rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50"
                          >
                            Bỏ nhóm
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      {GROUP_BY_OPTIONS.map((option) => (
                        <label
                          key={option.key}
                          className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium leading-5 transition-colors ${
                            groupBy.includes(option.key) ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span>{option.label}</span>
                          <input
                            type="checkbox"
                            checked={groupBy.includes(option.key)}
                            onChange={() => toggleGroupBy(option.key)}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
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
                <th className="w-10 px-6 py-4"></th>
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
      </div>
    </div>
  );
};

export default StudyAbroadPartners;
