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
  targetCountry: string;
  studentName: string;
  studentDob: string;
  studentIdentityCard: string;
  studentPhone: string;
  studentSchool: string;
  studentEducationLevel: string;
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
  targetCountry: '',
  studentName: '',
  studentDob: '',
  studentIdentityCard: '',
  studentPhone: '',
  studentSchool: '',
  studentEducationLevel: '',
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
    studentPhone: normalizedStudentPhone || undefined,
    school: formData.studentSchool.trim() || undefined,
    educationLevel: formData.studentEducationLevel || undefined,
    parentName: guardianRelation ? formData.name.trim() || undefined : undefined,
    parentPhone: guardianRelation ? formData.phone.trim() || undefined : undefined,
  };
};
