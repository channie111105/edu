import { IStudentInfo } from '../types';

export type LeadCreateModalTab = 'notes' | 'student' | 'extra';

export interface LeadCreateFormData {
  name: string;
  phone: string;
  email: string;
  source: string;
  program: string;
  notes: string;
  title: string;
  company: string;
  province: string;
  city: string;
  ward: string;
  street: string;
  salesperson: string;
  campaign: string;
  tags: string[];
  referredBy: string;
  product: string;
  market: string;
  channel: string;
  status: string;
  lossReason: string;
  lossReasonCustom: string;
  targetCountry: string;
  studentName: string;
  studentDob: string;
  studentIdentityCard: string;
  studentLanguageLevel: string;
  studentPhone: string;
  studentSchool: string;
  studentEducationLevel: string;
  identityDate: string;
  identityPlace: string;
  expectedStart: string;
  parentOpinion: string;
  financial: string;
  potential: string;
  createdAtDisplay: string;
  assignedAtDisplay: string;
}

export const LEAD_RELATION_OPTIONS = [
  { value: 'Học sinh', label: 'Học sinh' },
  { value: 'Bố', label: 'Bố' },
  { value: 'Mẹ', label: 'Mẹ' },
  { value: 'Người thân', label: 'Người thân' },
] as const;

export const LEAD_CAMPUS_OPTIONS = [
  'Vinh',
  'Hà Tĩnh',
  'Hà Nội',
  'TP. HCM',
  'Đà Nẵng',
  'Hải Phòng',
  'Online',
] as const;

export const LEAD_TARGET_COUNTRY_OPTIONS = [
  'Đức',
  'Úc',
  'Nhật Bản',
  'Hàn Quốc',
  'Trung Quốc',
  'Canada',
  'Mỹ',
  'Khác',
] as const;

export const LEAD_SOURCE_OPTIONS = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'google', label: 'Google Search' },
  { value: 'hotline', label: 'Hotline' },
  { value: 'referral', label: 'Giới thiệu' },
] as const;

export const LEAD_POTENTIAL_OPTIONS = [
  { value: 'Nóng', label: 'Nóng' },
  { value: 'Tiềm năng', label: 'Tiềm năng' },
  { value: 'Tham khảo', label: 'Tham khảo' },
] as const;

export const LEAD_PRODUCT_OPTIONS = [
  { value: 'Tiếng Đức', label: 'Tiếng Đức' },
  { value: 'Tiếng Trung', label: 'Tiếng Trung' },
  { value: 'Du học Đức', label: 'Du học Đức' },
  { value: 'Du học Trung', label: 'Du học Trung' },
  { value: 'Du học Nghề', label: 'Du học Nghề' },
  { value: 'XKLĐ', label: 'XKLĐ' },
] as const;

export const STUDENT_EDUCATION_LEVEL_OPTIONS = [
  'THCS',
  'THPT',
  'Trung cấp',
  'Cao đẳng',
  'Đại học',
  'Sau đại học',
] as const;

export const createLeadInitialState = (salesperson = ''): LeadCreateFormData => ({
  name: '',
  phone: '',
  email: '',
  source: 'hotline',
  program: 'Tiếng Đức',
  notes: '',
  title: '',
  company: '',
  province: '',
  city: '',
  ward: '',
  street: '',
  salesperson,
  campaign: '',
  tags: [],
  referredBy: '',
  product: '',
  market: '',
  channel: '',
  status: 'new',
  lossReason: '',
  lossReasonCustom: '',
  targetCountry: '',
  studentName: '',
  studentDob: '',
  studentIdentityCard: '',
  studentLanguageLevel: '',
  studentPhone: '',
  studentSchool: '',
  studentEducationLevel: '',
  identityDate: '',
  identityPlace: '',
  expectedStart: '',
  parentOpinion: '',
  financial: '',
  potential: '',
  createdAtDisplay: '',
  assignedAtDisplay: '',
});

export const getLeadGuardianRelation = (title: string): string | undefined => {
  const normalized = title.trim();
  if (!normalized || normalized === 'Học sinh') {
    return undefined;
  }
  return normalized;
};

export const resolveLeadCampus = (formData: LeadCreateFormData): string => {
  return formData.market.trim() || formData.company.trim();
};

export const buildLeadStudentInfo = (formData: LeadCreateFormData): IStudentInfo => {
  const guardianRelation = getLeadGuardianRelation(formData.title);
  const normalizedStudentName = formData.studentName.trim() || (!guardianRelation ? formData.name.trim() : '');
  const normalizedStudentPhone = formData.studentPhone.trim() || (!guardianRelation ? formData.phone.trim() : '');

  return {
    targetCountry: formData.targetCountry || undefined,
    studentName: normalizedStudentName || undefined,
    dob: formData.studentDob || undefined,
    identityCard: formData.studentIdentityCard.trim() || undefined,
    languageLevel: formData.studentLanguageLevel.trim() || undefined,
    studentPhone: normalizedStudentPhone || undefined,
    school: formData.studentSchool.trim() || undefined,
    educationLevel: formData.studentEducationLevel || undefined,
    financialStatus: formData.financial.trim() || undefined,
    parentName: guardianRelation ? formData.name.trim() || undefined : undefined,
    parentPhone: guardianRelation ? formData.phone.trim() || undefined : undefined,
  };
};
