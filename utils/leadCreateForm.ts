import { IStudentInfo, ISalesTeam } from '../types';
import { decodeMojibakeText } from './mojibake';
import {
  LEAD_CAMPUS_OPTIONS,
  LEAD_PRODUCT_OPTIONS,
  LEAD_SOURCE_OPTIONS,
  LEAD_TARGET_COUNTRY_OPTIONS,
  STUDENT_EDUCATION_LEVEL_OPTIONS,
} from './systemConfig';

export {
  LEAD_CAMPUS_OPTIONS,
  LEAD_PRODUCT_OPTIONS,
  LEAD_SOURCE_OPTIONS,
  LEAD_TARGET_COUNTRY_OPTIONS,
  STUDENT_EDUCATION_LEVEL_OPTIONS,
} from './systemConfig';

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

export interface LeadSalesRepOption {
  id: string;
  value: string;
  label: string;
  team?: string;
  branch?: string;
}

interface LeadSalesRepFallback {
  id: string;
  name: string;
  team?: string;
  branch?: string;
}

export const LEAD_RELATION_OPTIONS = [
  { value: 'Học sinh', label: 'Học sinh' },
  { value: 'Bố', label: 'Bố' },
  { value: 'Mẹ', label: 'Mẹ' },
  { value: 'Người thân', label: 'Người thân' },
] as const;

const normalizeCampusToken = (value?: string): string => {
  const normalized = decodeMojibakeText(String(value || ''))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .trim()
    .toLowerCase();

  if (!normalized) return '';
  if (['hcm', 'tphcm', 'hochiminh', 'saigon'].includes(normalized)) return 'hcm';
  if (['hanoi', 'hn'].includes(normalized)) return 'hanoi';
  if (normalized === 'hatinh') return 'hatinh';
  if (normalized === 'danang') return 'danang';
  if (normalized === 'haiphong') return 'haiphong';
  return normalized;
};

export const LEAD_POTENTIAL_OPTIONS = [
  { value: 'Nóng', label: 'Nóng' },
  { value: 'Tiềm năng', label: 'Tiềm năng' },
  { value: 'Tham khảo', label: 'Tham khảo' },
] as const;

export const createLeadInitialState = (salesperson = ''): LeadCreateFormData => ({
  name: '',
  phone: '',
  email: '',
  source: LEAD_SOURCE_OPTIONS.find((option) => option.value === 'hotline')?.value || LEAD_SOURCE_OPTIONS[0]?.value || '',
  program: LEAD_PRODUCT_OPTIONS[0]?.value || '',
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

export const buildLeadSalesRepOptions = (
  salesTeams: ISalesTeam[],
  fallbackReps: LeadSalesRepFallback[] = []
): LeadSalesRepOption[] => {
  const options = new Map<string, LeadSalesRepOption>();

  salesTeams.forEach((team) => {
    const teamName = decodeMojibakeText(team.name).trim();
    const teamBranch = decodeMojibakeText(team.branch).trim();

    team.members.forEach((member) => {
      const id = String(member.userId || '').trim();
      if (!id) return;

      const label = decodeMojibakeText(member.name || id).trim() || id;
      const branch = decodeMojibakeText(member.branch || teamBranch).trim();
      const existing = options.get(id);

      options.set(id, {
        id,
        value: id,
        label: existing?.label || label,
        team: existing?.team || teamName || undefined,
        branch: existing?.branch || branch || undefined,
      });
    });
  });

  fallbackReps.forEach((rep) => {
    const id = String(rep.id || '').trim();
    if (!id) return;

    const label = decodeMojibakeText(rep.name || id).trim() || id;
    const team = decodeMojibakeText(rep.team || '').trim();
    const branch = decodeMojibakeText(rep.branch || '').trim();
    const existing = options.get(id);

    options.set(id, {
      id,
      value: id,
      label: existing?.label || label,
      team: existing?.team || team || undefined,
      branch: existing?.branch || branch || undefined,
    });
  });

  return Array.from(options.values()).sort((left, right) => left.label.localeCompare(right.label, 'vi'));
};

export const filterLeadSalesRepOptionsByCampus = (
  salesOptions: LeadSalesRepOption[],
  campus?: string
): LeadSalesRepOption[] => {
  const normalizedCampus = normalizeCampusToken(campus);
  if (!normalizedCampus) return [];
  return salesOptions.filter((option) => normalizeCampusToken(option.branch) === normalizedCampus);
};

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
