import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, FileText } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { cancelAdmission, createAdmission } from '../services/enrollmentFlow.service';
import {
  IAdmission,
  IClassStudent,
  IContract,
  IQuotation,
  IStudent,
  IStudentClaim,
  ITeacher,
  ITrainingClass,
  QuotationStatus,
  StudentClaimStatus,
  StudentClaimType,
  StudentStatus,
  UserRole
} from '../types';
import {
  addClassLog,
  addStudentToClass,
  createStudentClaim,
  addStudentLog,
  getAdmissions,
  getClassStudents,
  getContractByQuotationId,
  getContracts,
  getQuotations,
  getStudentClaims,
  getStudents,
  getStudentAllowedPrograms,
  getStudentClassEligibility,
  getTeachers,
  getTrainingClasses,
  quotationLinksToStudent,
  transferStudentClass,
  updateClassStudentStatus,
  updateStudentClaim,
  updateStudent
} from '../utils/storage';
import { decodeMojibakeText } from '../utils/mojibake';
type DetailTabKey = 'overview' | 'classroom';
type ClaimModalMode = 'create' | 'process' | 'cancel';
type ClaimFormState = {
  claimType: StudentClaimType;
  claimStatus: StudentClaimStatus;
  reason: string;
  note: string;
  assignedDepartment: string;
  detail: string;
  requestedDate: string;
  expectedReturnDate: string;
  reserveUntilDate: string;
  proposedCampusId: string;
  proposedClassId: string;
  proposedClassCode: string;
  resolvedCampusId: string;
  resolvedClassId: string;
  resolvedClassCode: string;
  levelOrSubject: string;
  effectiveDate: string;
  resultNote: string;
  policyNote: string;
  keepFeeConfirmed: boolean;
  keepSlot: boolean;
  affectsStudentStatus: boolean;
};
type StudentLifecycleStatus =
  | 'MOI_TAO'
  | 'CHO_GHI_DANH'
  | 'DA_GHI_DANH'
  | 'DANG_HOC'
  | 'TAM_DUNG'
  | 'HOAN_THANH'
  | 'DUNG';

const DETAIL_TABS: Array<{ key: DetailTabKey; label: string }> = [
  { key: 'overview', label: '\u0054\u1ed5ng quan' },
  { key: 'classroom', label: '\u0047hi danh \u0026 l\u1edbp h\u1ecdc' }
];

const LEGACY_STUDENT_STATUS_LABELS: Record<StudentLifecycleStatus, string> = {
  MOI_TAO: 'Mới tạo',
  CHO_GHI_DANH: 'Chờ ghi danh',
  DA_GHI_DANH: 'Đã ghi danh',
  DANG_HOC: 'Đang học',
  TAM_DUNG: 'Tạm dừng',
  HOAN_THANH: 'Hoàn thành',
  DUNG: 'Dừng'
};

const STUDENT_STATUS_LABELS_MOJIBAKE: Record<StudentLifecycleStatus, string> = {
  MOI_TAO: 'Mới tạo',
  CHO_GHI_DANH: 'Chờ ghi danh',
  DA_GHI_DANH: 'Đã ghi danh',
  DANG_HOC: 'Đang học',
  TAM_DUNG: 'Tạm dừng',
  HOAN_THANH: 'Hoàn thành',
  DUNG: 'Dừng'
};

const STUDENT_STATUS_LABELS: Record<StudentLifecycleStatus, string> = {
  MOI_TAO: '\u004d\u1edbi t\u1ea1o',
  CHO_GHI_DANH: '\u0043h\u1edd ghi danh',
  DA_GHI_DANH: '\u0110\u00e3 ghi danh',
  DANG_HOC: '\u0110ang h\u1ecdc',
  TAM_DUNG: '\u0054\u1ea1m d\u1eebng',
  HOAN_THANH: '\u0048o\u00e0n th\u00e0nh',
  DUNG: '\u0044\u1eebng'
};

const STUDENT_STATUS_OPTIONS: StudentLifecycleStatus[] = [
  'MOI_TAO',
  'CHO_GHI_DANH',
  'DA_GHI_DANH',
  'DANG_HOC',
  'TAM_DUNG',
  'HOAN_THANH',
  'DUNG'
];

const CLAIM_TYPE_OPTIONS: Array<{ value: StudentClaimType; label: string }> = [
  { value: 'KHONG_CO', label: 'Không có' },
  { value: 'CHUYEN_LOP', label: 'Chuyển lớp' },
  { value: 'TAM_DUNG', label: 'Tạm dừng' },
  { value: 'BAO_LUU', label: 'Bảo lưu' },
  { value: 'HOC_LAI', label: 'Học lại' },
  { value: 'KHAC', label: 'Khác' }
];

const CLAIM_STATUS_OPTIONS: Array<{ value: StudentClaimStatus; label: string }> = [
  { value: 'KHONG_CO', label: 'Không có' },
  { value: 'CHO_XU_LY', label: 'Chờ xử lý' },
  { value: 'DA_XU_LY', label: 'Đã xử lý' },
  { value: 'TU_CHOI', label: 'Từ chối' },
  { value: 'DA_HUY', label: 'Đã hủy' }
];

const CLAIM_TYPE_LABELS: Record<StudentClaimType, string> = Object.fromEntries(
  CLAIM_TYPE_OPTIONS.map((item) => [item.value, item.label])
) as Record<StudentClaimType, string>;

const CLAIM_STATUS_LABELS: Record<StudentClaimStatus, string> = Object.fromEntries(
  CLAIM_STATUS_OPTIONS.map((item) => [item.value, item.label])
) as Record<StudentClaimStatus, string>;

const CLAIM_TYPE_CREATE_OPTIONS = CLAIM_TYPE_OPTIONS.filter((item) => item.value !== 'KHONG_CO');
const CLAIM_STATUS_CREATE_OPTIONS = CLAIM_STATUS_OPTIONS.filter((item) => item.value !== 'KHONG_CO');

const CLAIM_ASSIGNEE_OPTIONS: Record<StudentClaimType, string[]> = {
  KHONG_CO: [],
  CHUYEN_LOP: ['Học vụ', 'Đào tạo'],
  TAM_DUNG: ['Học vụ', 'Đào tạo', 'Quản lý đào tạo'],
  BAO_LUU: ['Quản lý đào tạo', 'Học vụ chính'],
  HOC_LAI: ['Học vụ', 'Đào tạo'],
  KHAC: ['Học vụ', 'Đào tạo', 'Quản lý']
};

const EMPTY_CLAIM_FORM: ClaimFormState = {
  claimType: 'CHUYEN_LOP',
  claimStatus: 'CHO_XU_LY',
  reason: '',
  note: '',
  assignedDepartment: 'Học vụ',
  detail: '',
  requestedDate: '',
  expectedReturnDate: '',
  reserveUntilDate: '',
  proposedCampusId: '',
  proposedClassId: '',
  proposedClassCode: '',
  resolvedCampusId: '',
  resolvedClassId: '',
  resolvedClassCode: '',
  levelOrSubject: '',
  effectiveDate: '',
  resultNote: '',
  policyNote: '',
  keepFeeConfirmed: false,
  keepSlot: false,
  affectsStudentStatus: true
};

const formatDate = (value?: string) => {
  if (!value) return '--/--/----';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN');
};

const formatDateTime = (value?: string) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN');
};

const formatMoney = (value?: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value || 0);

const normalizeEnrollmentText = (value?: string) =>
  decodeMojibakeText(String(value || ''))
    .replace(/Sáº£n pháº©m/g, 'Sản phẩm')
    .replace(/Lá»›p dá»± kiáº¿n/g, 'Lớp dự kiến')
    .replace(/Chuyá»ƒn lá»›p/g, 'Chuyển lớp');

const compactBadgeClassByStatus = (status?: string) => {
  if (status === 'DA_DUYET' || status === 'DANG_HOC' || status === 'DA_GHI_DANH') return 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100';
  if (status === 'CHO_DUYET' || status === 'CHO_GHI_DANH') return 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-100';
  if (status === 'TAM_DUNG' || status === 'BAO_LUU') return 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-100';
  if (status === 'HOAN_THANH') return 'bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-100';
  if (status === 'DUNG' || status === 'TU_CHOI' || status === 'NGHI_HOC') return 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-100';
  if (status === QuotationStatus.LOCKED) return 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-100';
  return 'bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-200';
};

const compactBadgeClassByClaimStatus = (status?: StudentClaimStatus) => {
  if (status === 'CHO_XU_LY') return 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-100';
  if (status === 'DA_XU_LY') return 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100';
  if (status === 'TU_CHOI') return 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-100';
  if (status === 'DA_HUY') return 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200';
  return 'bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-200';
};

const CompactFieldRow: React.FC<{ label: string; value?: React.ReactNode; className?: string; valueClassName?: string; truncateValue?: boolean }> = ({
  label,
  value,
  className = '',
  valueClassName = '',
  truncateValue = true
}) => (
  <div className={`flex items-baseline gap-3 py-1.5 ${className}`.trim()}>
    <div className="min-w-[112px] shrink-0 text-[11px] font-medium text-slate-500">{label}</div>
    <div className={`min-w-0 text-[13px] font-medium text-slate-900 ${truncateValue ? 'truncate' : ''} ${valueClassName}`.trim()}>{value || '--'}</div>
  </div>
);

const CompactBadgeList: React.FC<{ values: string[]; emptyLabel?: string }> = ({ values, emptyLabel = '--' }) =>
  values.length ? (
    <div className="flex flex-wrap gap-1.5">
      {values.map((value) => (
        <span key={value} className="inline-flex rounded-md bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 ring-1 ring-inset ring-slate-200">
          {value}
        </span>
      ))}
    </div>
  ) : (
    <span>{emptyLabel}</span>
  );

const getDetailTabFromParam = (value: string | null): DetailTabKey =>
  value === 'classroom' || value === 'overview' ? value : 'overview';

const normalizeQuickStatusText = (value?: string) =>
  decodeMojibakeText(String(value || ''))
    .replace(/\s+/g, ' ')
    .trim();

const getUniqueValues = (values: Array<string | undefined | null>) =>
  Array.from(
    new Set(
      values
        .map((item) => normalizeQuickStatusText(item || ''))
        .filter(Boolean)
    )
  );

const normalizeProgramLabel = (value?: string) => {
  const normalized = normalizeQuickStatusText(value);
  if (!normalized) return '';
  const hskMatch = normalized.match(/^HSK\s*([1-6])$/i);
  if (hskMatch) return `HSK${hskMatch[1]}`;
  const levelMatch = normalized.match(/^(A1|A2|B1|B2|C1|C2)$/i);
  if (levelMatch) return levelMatch[1].toUpperCase();
  return normalized;
};

const extractProgramTokens = (value?: string) => {
  const normalized = normalizeQuickStatusText(value);
  if (!normalized) return [];
  const matches = normalized.match(/\b(HSK\s*[1-6]|A1|A2|B1|B2|C1|C2|APS|Visa|Hồ sơ)\b/gi) || [];
  return Array.from(new Set(matches.map((item) => normalizeProgramLabel(item)).filter(Boolean)));
};

const getQuotationProgramLabels = (quotation?: IQuotation) => {
  if (!quotation) return [];
  const linePrograms = (quotation.lineItems || []).flatMap((item) => [
    ...(item.programs || []).map((program) => normalizeProgramLabel(program)),
    ...extractProgramTokens(item.courseName),
    ...extractProgramTokens(item.name)
  ]);
  const fallbackPrograms = linePrograms.length ? [] : extractProgramTokens(quotation.product);
  return Array.from(new Set([...linePrograms, ...fallbackPrograms].filter(Boolean)));
};

const getCertificateLabel = ({
  studentLevel,
  classLevel,
  classLanguage,
  classCode,
  certificateInfo,
  product
}: {
  studentLevel?: string;
  classLevel?: string;
  classLanguage?: string;
  classCode?: string;
  certificateInfo?: string;
  product?: string;
}) => {
  const candidates = [certificateInfo, classLevel, studentLevel, classLanguage, classCode, product]
    .map((item) => normalizeQuickStatusText(item))
    .filter(Boolean);

  const chineseSource = candidates.some((item) => /\b(hsk|trung|chinese)\b/i.test(item));
  for (const item of candidates) {
    const hskRangeMatch = item.match(/\bHSK\s*([1-6])\s*[-–]\s*(?:HSK\s*)?([1-6])\b/i);
    if (hskRangeMatch) return `Trung HSK${hskRangeMatch[1]}-HSK${hskRangeMatch[2]}`;
  }

  for (const item of candidates) {
    const levelRangeMatch = item.match(/\b(A1|A2|B1|B2)\s*[-–]\s*(A1|A2|B1|B2)\b/i);
    if (levelRangeMatch) return `${chineseSource ? 'Trung' : 'Đức'} ${levelRangeMatch[1].toUpperCase()}-${levelRangeMatch[2].toUpperCase()}`;
  }

  for (const item of candidates) {
    const hskMatch = item.match(/\bHSK\s*([1-6])\b/i);
    if (hskMatch) return `Trung HSK${hskMatch[1]}`;
  }

  for (const item of candidates) {
    const levelMatch = item.match(/\b(A1|A2|B1|B2)\b/i);
    if (levelMatch) return `${chineseSource ? 'Trung' : 'Đức'} ${levelMatch[1].toUpperCase()}`;
  }

  return '--';
};

const getCertificateBadgeClass = (value: string) => {
  if (value === '--') return 'bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-200';
  if (value.includes('HSK')) return 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-100';
  return 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-100';
};

const toLogValue = (value: unknown): string => {
  if (typeof value === 'boolean') return value ? 'Có' : 'Không';
  if (value === undefined || value === null) return '--';
  const normalized = String(value).trim();
  if (!normalized || normalized === '--/--/----') return '--';
  return normalized ? normalized : '--';
};

const buildChangeLogMessage = (
  prefix: string,
  changes: Array<{ label: string; before?: unknown; after?: unknown }>
) => {
  const normalized = changes
    .map((item) => ({
      label: item.label,
      before: toLogValue(item.before),
      after: toLogValue(item.after)
    }))
    .filter((item) => item.before !== item.after);

  if (!normalized.length) return prefix;
  return `${prefix}: ${normalized.map((item) => `${item.label} ${item.before} -> ${item.after}`).join('; ')}`;
};

const buildDetailLogMessage = (
  prefix: string,
  details: Array<{ label: string; value?: unknown }>
) => {
  const normalized = details
    .map((item) => ({ label: item.label, value: toLogValue(item.value) }))
    .filter((item) => item.value !== '--');

  if (!normalized.length) return prefix;
  return `${prefix}: ${normalized.map((item) => `${item.label} ${item.value}`).join('; ')}`;
};

const ContractStudentDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const canOperate =
    user?.role === UserRole.SALES_REP ||
    user?.role === UserRole.SALES_LEADER ||
    user?.role === UserRole.ADMIN ||
    user?.role === UserRole.FOUNDER;
  const profileEditMode = searchParams.get('mode') === 'profile_edit';
  const hideClassControls = searchParams.get('hideClassControls') === '1';

  const [students, setStudents] = useState<IStudent[]>([]);
  const [quotations, setQuotations] = useState<IQuotation[]>([]);
  const [admissions, setAdmissions] = useState<IAdmission[]>([]);
  const [classStudents, setClassStudents] = useState<IClassStudent[]>([]);
  const [classes, setClasses] = useState<ITrainingClass[]>([]);
  const [contracts, setContracts] = useState<IContract[]>([]);
  const [teachers, setTeachers] = useState<ITeacher[]>([]);
  const [claims, setClaims] = useState<IStudentClaim[]>([]);
  const [activeTab, setActiveTab] = useState<DetailTabKey>(() => getDetailTabFromParam(searchParams.get('tab')));
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [claimModalMode, setClaimModalMode] = useState<ClaimModalMode | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<IStudentClaim | null>(null);
  const [enrollForm, setEnrollForm] = useState({ quotationId: '', campusId: 'Hà Nội', classId: '', note: '' });
  const [transferForm, setTransferForm] = useState({ campusId: 'Hà Nội', classId: '', effectiveDate: '', reason: '' });
  const [pauseForm, setPauseForm] = useState({ startDate: '', reason: '', expectedReturnDate: '', note: '' });
  const [editForm, setEditForm] = useState({ name: '', dob: '', phone: '', email: '', campus: '', payerName: '', note: '' });
  const [claimForm, setClaimForm] = useState<ClaimFormState>(EMPTY_CLAIM_FORM);

  const loadData = () => {
    setStudents(getStudents());
    setQuotations(getQuotations());
    setAdmissions(getAdmissions());
    setClassStudents(getClassStudents());
    setClasses(getTrainingClasses());
    setContracts(getContracts());
    setTeachers(getTeachers());
    setClaims(id ? getStudentClaims().filter((item) => item.studentId === id) : []);
  };

  useEffect(() => {
    loadData();
    const events = [
      'educrm:students-changed',
      'educrm:quotations-changed',
      'educrm:admissions-changed',
      'educrm:class-students-changed',
      'educrm:training-classes-changed',
      'educrm:contracts-changed',
      'educrm:student-claims-changed'
    ] as const;
    events.forEach((eventName) => window.addEventListener(eventName, loadData as EventListener));
    return () => events.forEach((eventName) => window.removeEventListener(eventName, loadData as EventListener));
  }, [id]);

  useEffect(() => {
    const requestedTab = searchParams.get('tab');
    const nextTab = getDetailTabFromParam(requestedTab);
    setActiveTab((prev) => (prev === nextTab ? prev : nextTab));
    if (requestedTab && nextTab === 'overview' && requestedTab !== 'overview') {
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        params.delete('tab');
        return params;
      }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleTabChange = (tab: DetailTabKey) => {
    setActiveTab(tab);
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (tab === 'overview') params.delete('tab');
      else params.set('tab', tab);
      return params;
    }, { replace: true });
  };

  const student = useMemo(() => students.find((item) => item.id === id), [id, students]);
  const linkedQuotations = useMemo(() => {
    if (!student) return [];
    const matched = quotations.filter(
      (item) => quotationLinksToStudent(item, student) || (!!student.soId && item.id === student.soId)
    );

    return Array.from(new Map(matched.map((item) => [item.id, item])).values()).sort((left, right) => {
      const leftLocked = left.status === QuotationStatus.LOCKED ? 1 : 0;
      const rightLocked = right.status === QuotationStatus.LOCKED ? 1 : 0;
      if (leftLocked !== rightLocked) return rightLocked - leftLocked;
      return new Date(right.updatedAt || right.lockedAt || right.createdAt).getTime() - new Date(left.updatedAt || left.lockedAt || left.createdAt).getTime();
    });
  }, [quotations, student]);
  const linkedQuotation = linkedQuotations[0];

  useEffect(() => {
    if (!profileEditMode || !student) return;
    setShowEditModal(true);
  }, [profileEditMode, student]);

  const studentAdmissions = useMemo(
    () =>
      admissions
        .filter((item) => item.studentId === student?.id)
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()),
    [admissions, student?.id]
  );
  const latestAdmission = studentAdmissions[0];
  const studentClassHistory = useMemo(
    () =>
      classStudents
        .filter((item) => item.studentId === student?.id)
        .sort((left, right) => right.createdAt - left.createdAt),
    [classStudents, student?.id]
  );
  const currentClassStudent =
    studentClassHistory.find((item) => item.classId === student?.classId || item.classId === student?.className) || studentClassHistory[0];
  const currentClass =
    classes.find((item) => item.id === currentClassStudent?.classId || item.code === currentClassStudent?.classId) ||
    ((student?.enrollmentStatus === 'DA_GHI_DANH' || student?.status === StudentStatus.ENROLLED) &&
    (student?.classId || student?.className)
      ? classes.find((item) => item.id === student?.classId || item.code === student?.classId || item.code === student?.className)
      : undefined);
  const teacher = teachers.find((item) => item.id === currentClass?.teacherId);
  const relatedContracts = useMemo(
    () =>
      Array.from(
        new Map(
          [
            ...linkedQuotations.map((item) => getContractByQuotationId(item.id)).filter(Boolean),
            ...contracts.filter((item) => item.studentId === student?.id)
          ].map((item) => [item!.id, item!])
        ).values()
      ),
    [contracts, linkedQuotations, student?.id]
  );
  const availableLockedQuotations = useMemo(
    () => linkedQuotations.filter((item) => item.status === QuotationStatus.LOCKED),
    [linkedQuotations]
  );
  const studentAllowedPrograms = useMemo(
    () => getStudentAllowedPrograms(student, quotations),
    [quotations, student]
  );
  const eligibleActiveClasses = useMemo(
    () =>
      student
        ? classes.filter(
            (item) => item.status === 'ACTIVE' && getStudentClassEligibility(student, item, quotations).ok
          )
        : [],
    [classes, quotations, student]
  );
  const classOptions = useMemo(
    () =>
      eligibleActiveClasses.filter((item) => item.id !== currentClass?.id && item.code !== currentClass?.code),
    [currentClass?.code, currentClass?.id, eligibleActiveClasses]
  );
  const findClassByValue = (value?: string) => {
    const normalizedValue = value?.trim();
    if (!normalizedValue) return undefined;
    return classes.find((item) => item.id === normalizedValue || item.code === normalizedValue);
  };
  const resolveClassCampus = (id?: string, code?: string) => findClassByValue(id)?.campus || findClassByValue(code)?.campus || '';
  const allCampusOptions = useMemo(
    () => Array.from(new Set(classes.map((item) => item.campus).filter(Boolean) as string[])).sort(),
    [classes]
  );
  const enrollCampusOptions = useMemo(() => {
    const source = new Set<string>();
    [latestAdmission?.campusId, student?.campus, currentClass?.campus].filter(Boolean).forEach((item) => source.add(item as string));
    eligibleActiveClasses.forEach((item) => {
      if (item.campus) source.add(item.campus);
    });
    return Array.from(source).sort();
  }, [currentClass?.campus, eligibleActiveClasses, latestAdmission?.campusId, student?.campus]);
  const enrollAvailableClasses = useMemo(
    () => eligibleActiveClasses.filter((item) => !enrollForm.campusId || item.campus === enrollForm.campusId),
    [eligibleActiveClasses, enrollForm.campusId]
  );
  const transferCampusOptions = useMemo(() => {
    const source = new Set<string>();
    if (currentClass?.campus) source.add(currentClass.campus);
    classOptions.forEach((item) => {
      if (item.campus) source.add(item.campus);
    });
    return Array.from(source).sort();
  }, [classOptions, currentClass?.campus]);
  const transferAvailableClasses = useMemo(
    () => classOptions.filter((item) => !transferForm.campusId || item.campus === transferForm.campusId),
    [classOptions, transferForm.campusId]
  );
  const claimCampusOptions = useMemo(() => {
    const source = new Set<string>();
    if (currentClass?.campus) source.add(currentClass.campus);
    classOptions.forEach((item) => {
      if (item.campus) source.add(item.campus);
    });
    return Array.from(source).sort();
  }, [classOptions, currentClass?.campus]);
  const claimProposedClassOptions = useMemo(
    () => classOptions.filter((item) => !claimForm.proposedCampusId || item.campus === claimForm.proposedCampusId),
    [classOptions, claimForm.proposedCampusId]
  );
  const claimResolvedClassOptions = useMemo(
    () => classOptions.filter((item) => !claimForm.resolvedCampusId || item.campus === claimForm.resolvedCampusId),
    [classOptions, claimForm.resolvedCampusId]
  );
  const latestClaim = claims[0];
  const latestPendingClaim = claims.find((item) => item.claimStatus === 'CHO_XU_LY');
  const displayClaim = latestPendingClaim || latestClaim || null;
  const latestClaimTypeLabel = displayClaim ? CLAIM_TYPE_LABELS[displayClaim.claimType] : CLAIM_TYPE_LABELS.KHONG_CO;
  const latestClaimStatusLabel = displayClaim ? CLAIM_STATUS_LABELS[displayClaim.claimStatus] : CLAIM_STATUS_LABELS.KHONG_CO;

  const getDefaultAssignedDepartment = (claimType: StudentClaimType) => CLAIM_ASSIGNEE_OPTIONS[claimType][0] || 'Học vụ';

  const buildClaimForm = (claimType: StudentClaimType, source?: Partial<IStudentClaim>): ClaimFormState => ({
    ...EMPTY_CLAIM_FORM,
    claimType,
    claimStatus: source?.claimStatus || 'CHO_XU_LY',
    reason: source?.reason || '',
    note: source?.note || '',
    assignedDepartment: source?.assignedDepartment || getDefaultAssignedDepartment(claimType),
    detail: source?.detail || '',
    requestedDate: source?.requestedDate || '',
    expectedReturnDate: source?.expectedReturnDate || '',
    reserveUntilDate: source?.reserveUntilDate || '',
    proposedCampusId:
      resolveClassCampus(source?.proposedClassId, source?.proposedClassCode) ||
      currentClass?.campus ||
      classOptions[0]?.campus ||
      '',
    proposedClassId: source?.proposedClassId || '',
    proposedClassCode: source?.proposedClassCode || '',
    resolvedCampusId:
      resolveClassCampus(source?.resolvedClassId || source?.proposedClassId, source?.resolvedClassCode || source?.proposedClassCode) ||
      resolveClassCampus(source?.proposedClassId, source?.proposedClassCode) ||
      currentClass?.campus ||
      classOptions[0]?.campus ||
      '',
    resolvedClassId: source?.resolvedClassId || '',
    resolvedClassCode: source?.resolvedClassCode || '',
    levelOrSubject: source?.levelOrSubject || '',
    effectiveDate: source?.effectiveDate || '',
    resultNote: source?.resultNote || '',
    policyNote: source?.policyNote || '',
    keepFeeConfirmed: Boolean(source?.keepFeeConfirmed),
    keepSlot: Boolean(source?.keepSlot),
    affectsStudentStatus: source?.affectsStudentStatus ?? true
  });

  useEffect(() => {
    if (!student) return;
    const defaultEnrollCampus = latestAdmission?.campusId || student.campus || currentClass?.campus || enrollCampusOptions[0] || allCampusOptions[0] || 'Hà Nội';
    setEnrollForm({
      quotationId: linkedQuotation?.id || availableLockedQuotations[0]?.id || '',
      campusId: defaultEnrollCampus,
      classId:
        eligibleActiveClasses.some((item) => item.id === currentClass?.id) && currentClass?.campus === defaultEnrollCampus
          ? currentClass?.id || ''
          : '',
      note: ''
    });
    setTransferForm({ campusId: currentClass?.campus || transferCampusOptions[0] || allCampusOptions[0] || 'Hà Nội', classId: '', effectiveDate: '', reason: '' });
    setPauseForm({ startDate: '', reason: '', expectedReturnDate: '', note: '' });
    setEditForm({
      name: student.name || '',
      dob: student.dob || '',
      phone: student.phone || '',
      email: student.email || '',
      campus: student.campus || '',
      payerName: student.payerName || '',
      note: student.note || ''
    });
  }, [allCampusOptions, availableLockedQuotations, currentClass?.campus, currentClass?.id, eligibleActiveClasses, enrollCampusOptions, latestAdmission?.campusId, linkedQuotation?.id, student, transferCampusOptions]);

  const studentStatusKey = useMemo<StudentLifecycleStatus>(() => {
    if (!student) return 'MOI_TAO';
    if (student.status === StudentStatus.RESERVED || currentClassStudent?.status === 'BAO_LUU') return 'TAM_DUNG';
    if (student.status === StudentStatus.DONE || currentClass?.status === 'DONE') return 'HOAN_THANH';
    if (student.status === StudentStatus.DROPPED) return 'DUNG';
    if (student.enrollmentStatus === 'DA_GHI_DANH' || student.status === StudentStatus.ENROLLED) {
      const startDate = currentClass?.startDate ? new Date(currentClass.startDate).getTime() : NaN;
      if (!Number.isNaN(startDate) && startDate > Date.now()) return 'DA_GHI_DANH';
      return 'DANG_HOC';
    }
    if (latestAdmission?.status === 'CHO_DUYET' || linkedQuotation || latestAdmission) return 'CHO_GHI_DANH';
    return 'MOI_TAO';
  }, [currentClass?.startDate, currentClass?.status, currentClassStudent?.status, latestAdmission, linkedQuotation, student]);

  const studentStatusLabel = STUDENT_STATUS_LABELS[studentStatusKey];
  const sourceSoCodes = useMemo(() => getUniqueValues(linkedQuotations.map((item) => item.soCode)), [linkedQuotations]);
  const sourceProductLabels = useMemo(() => getUniqueValues(linkedQuotations.map((item) => item.product)), [linkedQuotations]);
  const sourceProgramLabels = useMemo(
    () => Array.from(new Set(linkedQuotations.flatMap((item) => getQuotationProgramLabels(item)))),
    [linkedQuotations]
  );
  const sourceSalespeople = useMemo(() => getUniqueValues(linkedQuotations.map((item) => item.salespersonName)), [linkedQuotations]);
  const profileNote = normalizeEnrollmentText(student?.note || latestAdmission?.note || linkedQuotation?.internalNote);
  const currentClassStatusLabel =
    studentStatusKey === 'TAM_DUNG'
      ? 'Tạm dừng'
      : studentStatusKey === 'HOAN_THANH'
        ? 'Hoàn thành'
        : studentStatusKey === 'DANG_HOC'
          ? 'Đang học'
        : studentStatusKey === 'DA_GHI_DANH'
            ? 'Đã ghi danh'
            : '--';
  const remainingValue = Math.max(
    linkedQuotations.reduce((sum, item) => sum + (item.finalAmount || item.amount || 0), 0) -
      relatedContracts.reduce((sum, item) => sum + (item.paidValue || 0), 0),
    0
  );
  const certificateLabel = getCertificateLabel({
    studentLevel: student?.level,
    classLevel: currentClass?.level,
    classLanguage: currentClass?.language,
    classCode: currentClass?.code,
    certificateInfo: linkedQuotation?.certificateInfo,
    product: linkedQuotation?.product
  });
  const nextDebtDueDate =
    currentClassStudent?.nearestDueDate ||
    currentClassStudent?.debtTerms?.find((item) => item.status !== 'PAID')?.dueDate;
  const debtTerms = currentClassStudent?.debtTerms || [];
  const hasOverdueDebt = debtTerms.some((item) => item.status === 'OVERDUE');
  const financeStatusKey =
    remainingValue <= 0 ? 'DA_THU_DU' : hasOverdueDebt ? 'QUA_HAN' : debtTerms.length > 0 ? 'DANG_THU' : 'PHAT_SINH';
  const debtQuickStatusMeta =
    remainingValue <= 0
      ? {
          label: 'Không có',
          badgeClassName: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100',
          timing: '--'
        }
      : financeStatusKey === 'QUA_HAN'
        ? {
            label: 'Quá hạn',
            badgeClassName: 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-100',
            timing: nextDebtDueDate ? `Quá hạn từ ${formatDate(nextDebtDueDate)}` : '--'
          }
        : {
            label: 'Có khoản phải thu',
            badgeClassName: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-100',
            timing: nextDebtDueDate ? `Hạn ${formatDate(nextDebtDueDate)}` : '--'
          };
  const hideTransferClaimMetaFields = claimModalMode === 'create' && claimForm.claimType === 'CHUYEN_LOP';
  const closeEditModal = () => {
    setShowEditModal(false);
    if (!profileEditMode) return;
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.delete('mode');
      params.delete('hideClassControls');
      return params;
    }, { replace: true });
  };

  const closeClaimModal = () => {
    setClaimModalMode(null);
    setSelectedClaim(null);
    setClaimForm(EMPTY_CLAIM_FORM);
  };

  const openCreateClaimModal = () => {
    setSelectedClaim(null);
    setClaimModalMode('create');
    const initialType = displayClaim?.claimType && displayClaim.claimType !== 'KHONG_CO' ? displayClaim.claimType : 'CHUYEN_LOP';
    setClaimForm(
      buildClaimForm(initialType, {
        claimType: initialType,
        claimStatus: 'CHO_XU_LY',
        currentClassId: currentClass?.id || currentClassStudent?.classId,
        currentClassCode: currentClass?.code || currentClassStudent?.classId
      })
    );
  };

  const openProcessClaimModal = (claim?: IStudentClaim) => {
    const targetClaim = claim || latestPendingClaim || latestClaim;
    if (!targetClaim) return;
    setSelectedClaim(targetClaim);
    setClaimModalMode('process');
    setClaimForm(
      buildClaimForm(targetClaim.claimType, {
        ...targetClaim,
        claimStatus: targetClaim.claimStatus === 'CHO_XU_LY' ? 'DA_XU_LY' : targetClaim.claimStatus,
        currentClassId: targetClaim.currentClassId || currentClass?.id || currentClassStudent?.classId,
        currentClassCode: targetClaim.currentClassCode || currentClass?.code || currentClassStudent?.classId,
        resolvedClassId: targetClaim.resolvedClassId || targetClaim.proposedClassId || '',
        resolvedClassCode: targetClaim.resolvedClassCode || targetClaim.proposedClassCode || ''
      })
    );
  };

  const openCancelClaimModal = (claim?: IStudentClaim) => {
    const targetClaim = claim || latestPendingClaim || latestClaim;
    if (!targetClaim) return;
    setSelectedClaim(targetClaim);
    setClaimModalMode('cancel');
    setClaimForm(
      buildClaimForm(targetClaim.claimType, {
        ...targetClaim,
        claimStatus: 'DA_HUY'
      })
    );
  };

  const openEnrollModal = () => {
    if (hideClassControls) return;
    if (!canOperate) return alert('Bạn không có quyền thao tác ghi danh');
    if (!eligibleActiveClasses.length) {
      return alert(
        studentAllowedPrograms.length
          ? `Học viên chỉ có chương trình ${studentAllowedPrograms.join(', ')} nên chưa có lớp phù hợp để ghi danh`
          : 'Học viên chưa có chương trình trong hồ sơ nên chưa thể ghi danh vào lớp'
      );
    }
    setShowEnrollModal(true);
  };

  const openTransferModal = () => {
    if (hideClassControls) return;
    if (!canOperate) return alert('Ban khong co quyen chuyen lop');
    if (!classOptions.length) {
      return alert(
        studentAllowedPrograms.length
          ? `Không có lớp đích phù hợp với chương trình ${studentAllowedPrograms.join(', ')}`
          : 'Học viên chưa có chương trình phù hợp để chuyển lớp'
      );
    }
    setTransferForm({ campusId: currentClass?.campus || transferCampusOptions[0] || allCampusOptions[0] || 'Hà Nội', classId: '', effectiveDate: '', reason: '' });
    setShowTransferModal(true);
  };

  const openPauseModal = () => {
    if (hideClassControls) return;
    if (!canOperate) return alert('Ban khong co quyen tam dung hoc vien');
    setPauseForm({ startDate: '', reason: '', expectedReturnDate: '', note: '' });
    setShowPauseModal(true);
  };

  const submitEnroll = () => {
    if (!student) return;
    if (!canOperate) return alert('Bạn không có quyền thao tác ghi danh');
    if (!enrollForm.classId || !enrollForm.campusId) return alert('Vui lòng chọn cơ sở và lớp');
    if (!enrollForm.quotationId) return alert('Không tìm thấy SO đã khóa để ghi danh');
    try {
      createAdmission({
        studentId: student.id,
        quotationId: enrollForm.quotationId,
        classId: enrollForm.classId,
        campusId: enrollForm.campusId,
        note: enrollForm.note,
        createdBy: user?.id || 'system'
      });
      setShowEnrollModal(false);
      setActiveTab('classroom');
      loadData();
      alert('Đã tạo hồ sơ ghi danh chờ duyệt');
    } catch (error: any) {
      alert(error?.message || 'Không thể tạo ghi danh');
    }
  };

  const submitTransfer = () => {
    if (!student || !currentClassStudent?.classId) return;
    if (!canOperate) return alert('Ban khong co quyen chuyen lop');
    if (!transferForm.classId) return alert('Vui long chon lop dich');
    if (!transferForm.effectiveDate) return alert('Vui long chon ngay chuyen');
    try {
      transferStudentClass(student.id, currentClassStudent.classId, transferForm.classId);
      const targetClass = classes.find((item) => item.id === transferForm.classId || item.code === transferForm.classId);
      const transferSummary = `Chuyen lop ngay ${transferForm.effectiveDate} tu ${currentClass?.code || currentClassStudent.classId} sang ${targetClass?.code || transferForm.classId}${transferForm.reason ? `: ${transferForm.reason}` : ''}`;
      updateStudent({
        ...student,
        classId: targetClass?.id || transferForm.classId,
        className: targetClass?.code || transferForm.classId,
        campus: targetClass?.campus || student.campus,
        status: StudentStatus.ENROLLED,
        enrollmentStatus: 'DA_GHI_DANH',
        note: [student.note, transferSummary].filter(Boolean).join('\n')
      });
      addClassLog(currentClassStudent.classId, 'TRANSFER_OUT', `Chuyen ${student.name} sang lop ${targetClass?.code || transferForm.classId} ngay ${transferForm.effectiveDate}`, user?.id || 'system');
      addClassLog(targetClass?.id || transferForm.classId, 'TRANSFER_IN', `Tiep nhan ${student.name} tu lop ${currentClass?.code || currentClassStudent.classId} ngay ${transferForm.effectiveDate}`, user?.id || 'system');
      addStudentLog(student.id, 'TRANSFER_CLASS', transferSummary, user?.id || 'system', 'SYSTEM');
      setShowTransferModal(false);
      loadData();
    } catch (error: any) {
      alert(error?.message || 'Khong the chuyen lop');
    }
  };

  const submitPause = () => {
    if (!student || !currentClassStudent?.classId) return;
    if (!canOperate) return alert('Ban khong co quyen tam dung hoc vien');
    if (!pauseForm.startDate) return alert('Vui long chon ngay bat dau tam dung');
    if (!pauseForm.reason.trim()) return alert('Vui long nhap ly do tam dung');
    const updated = updateClassStudentStatus(currentClassStudent.classId, student.id, 'BAO_LUU');
    if (!updated) return alert('Khong tim thay du lieu lop cua hoc vien');
    const pauseSummary = `Tam dung tu ${pauseForm.startDate}${pauseForm.expectedReturnDate ? ` den ${pauseForm.expectedReturnDate}` : ''}: ${pauseForm.reason.trim()}`;
    updateStudent({
      ...student,
      status: StudentStatus.RESERVED,
      enrollmentStatus: 'DA_GHI_DANH',
      note: [student.note, pauseSummary, pauseForm.note.trim()].filter(Boolean).join('\n')
    });
    addClassLog(currentClassStudent.classId, 'PAUSE_STUDENT', `Tam dung hoc vien ${student.name} tu ${pauseForm.startDate}`, user?.id || 'system');
    addStudentLog(student.id, 'PAUSE_STUDENT', [pauseSummary, pauseForm.note.trim()].filter(Boolean).join(' - '), user?.id || 'system', 'SYSTEM');
    setShowPauseModal(false);
    loadData();
  };

  const finishClass = () => {
    if (!student || !currentClassStudent?.classId) return;
    if (!canOperate) return alert('Bạn không có quyền kết thúc lớp');
    updateClassStudentStatus(currentClassStudent.classId, student.id, 'NGHI_HOC');
    updateStudent({ ...student, status: StudentStatus.DONE, enrollmentStatus: 'DA_GHI_DANH' });
    addStudentLog(student.id, 'FINISH_CLASS', `Kết thúc lớp ${currentClass?.code || currentClassStudent.classId}`, user?.id || 'system', 'SYSTEM');
    loadData();
  };

  const cancelCurrentAdmission = () => {
    if (!latestAdmission) return;
    if (!canOperate) return alert('Bạn không có quyền hủy ghi danh');
    const result = cancelAdmission(latestAdmission.id, user?.id || 'system');
    if (!result.ok) return alert('Không thể hủy ghi danh');
    loadData();
  };

  const saveProfile = () => {
    if (!student) return;
    const nextStudent: IStudent = {
      ...student,
      name: editForm.name.trim() || student.name,
      dob: editForm.dob,
      phone: editForm.phone,
      email: editForm.email,
      campus: editForm.campus,
      payerName: editForm.payerName,
      note: editForm.note
    };
    updateStudent(nextStudent);
    addStudentLog(
      student.id,
      'UPDATE_PROFILE',
      buildChangeLogMessage('Cập nhật thông tin hồ sơ học viên', [
        { label: 'Họ tên', before: student.name, after: nextStudent.name },
        { label: 'Ngày sinh', before: formatDate(student.dob), after: formatDate(nextStudent.dob) },
        { label: 'SĐT', before: student.phone, after: nextStudent.phone },
        { label: 'Email', before: student.email, after: nextStudent.email },
        { label: 'Cơ sở', before: student.campus, after: nextStudent.campus },
        { label: 'Ghi chú', before: student.note, after: nextStudent.note }
      ]),
      user?.id || 'system',
      'SYSTEM'
    );
    closeEditModal();
    loadData();
  };

  const appendStudentNote = (baseNote?: string, nextNote?: string) => [baseNote, nextNote].filter(Boolean).join('\n');
  const getClassDisplayName = (id?: string, code?: string) => {
    if (code) return code;
    if (!id) return '--';
    return classes.find((item) => item.id === id || item.code === id)?.code || id;
  };

  const submitClaim = () => {
    if (!student || !claimModalMode) return;

    const actor = user?.name || user?.id || 'system';
    const reason = claimForm.reason.trim();
    const note = claimForm.note.trim();
    const resultNote = claimForm.resultNote.trim();
    const policyNote = claimForm.policyNote.trim();
    const nextStatus = claimModalMode === 'cancel' ? 'DA_HUY' : claimForm.claimStatus;
    const claimPayload: Partial<IStudentClaim> = {
      claimType: claimForm.claimType,
      claimStatus: nextStatus,
      reason,
      note,
      assignedDepartment: claimForm.assignedDepartment,
      detail: claimForm.detail.trim(),
      requestedDate: claimForm.requestedDate,
      expectedReturnDate: claimForm.expectedReturnDate,
      reserveUntilDate: claimForm.reserveUntilDate,
      currentClassId: currentClass?.id || currentClassStudent?.classId,
      currentClassCode: currentClass?.code || currentClassStudent?.classId,
      proposedClassId: claimForm.proposedClassId,
      proposedClassCode: claimForm.proposedClassCode,
      resolvedClassId: claimForm.resolvedClassId,
      resolvedClassCode: claimForm.resolvedClassCode,
      levelOrSubject: claimForm.levelOrSubject.trim(),
      effectiveDate: claimForm.effectiveDate,
      resultNote,
      policyNote,
      keepFeeConfirmed: claimForm.keepFeeConfirmed,
      keepSlot: claimForm.keepSlot,
      affectsStudentStatus: claimForm.affectsStudentStatus
    };

    if (claimForm.claimType !== 'KHONG_CO' && !reason) {
      alert('Vui lòng nhập lý do claim');
      return;
    }

    if (claimModalMode === 'process' && nextStatus === 'DA_XU_LY' && ['CHUYEN_LOP', 'HOC_LAI'].includes(claimForm.claimType) && !claimForm.resolvedClassId) {
      alert('Vui lòng chọn lớp xử lý');
      return;
    }

    if (claimModalMode === 'create') {
      createStudentClaim({
        id: `CLM-${Date.now()}`,
        studentId: student.id,
        ...(claimPayload as IStudentClaim),
        createdAt: new Date().toISOString(),
        createdBy: actor
      });
      addStudentLog(
        student.id,
        'CREATE_CLAIM',
        buildDetailLogMessage(`Tạo claim ${CLAIM_TYPE_LABELS[claimForm.claimType]}`, [
          { label: 'Trạng thái', value: CLAIM_STATUS_LABELS[nextStatus] },
          { label: 'Ai xử lý', value: claimForm.assignedDepartment },
          { label: 'Lớp đề xuất', value: getClassDisplayName(claimForm.proposedClassId, claimForm.proposedClassCode) },
          { label: 'Lớp xử lý', value: getClassDisplayName(claimForm.resolvedClassId, claimForm.resolvedClassCode) },
          { label: 'Level/môn', value: claimForm.levelOrSubject.trim() },
          { label: 'Ngày mong muốn', value: formatDate(claimForm.requestedDate) },
          { label: 'Ngày hiệu lực', value: formatDate(claimForm.effectiveDate) },
          { label: 'Ngày quay lại', value: formatDate(claimForm.expectedReturnDate) },
          { label: 'Bảo lưu đến', value: formatDate(claimForm.reserveUntilDate) },
          { label: 'Lý do', value: reason },
          { label: 'Mô tả', value: claimForm.detail.trim() },
          { label: 'Ghi chú', value: note }
        ]),
        actor,
        'SYSTEM'
      );
      closeClaimModal();
      loadData();
      return;
    }

    if (!selectedClaim) return;

    if (claimModalMode === 'process' && nextStatus === 'DA_XU_LY') {
      try {
        if (claimForm.claimType === 'CHUYEN_LOP' && claimForm.resolvedClassId) {
          const targetClass = classes.find((item) => item.id === claimForm.resolvedClassId || item.code === claimForm.resolvedClassId);
          if (targetClass) {
            if (currentClassStudent?.classId) {
              transferStudentClass(student.id, currentClassStudent.classId, targetClass.id);
              addClassLog(currentClassStudent.classId, 'CLAIM_TRANSFER_OUT', `Claim chuyển lớp cho ${student.name} sang ${targetClass.code}`, actor);
            } else {
              addStudentToClass(targetClass.id, student.id);
            }
            updateStudent({
              ...student,
              classId: targetClass.id,
              className: targetClass.code,
              campus: targetClass.campus || student.campus,
              status: StudentStatus.ENROLLED,
              enrollmentStatus: 'DA_GHI_DANH',
              note: appendStudentNote(student.note, `Claim chuyển lớp đã xử lý${resultNote ? `: ${resultNote}` : ''}`)
            });
            addClassLog(targetClass.id, 'CLAIM_TRANSFER_IN', `Tiếp nhận ${student.name} từ claim chuyển lớp`, actor);
          }
        }

        if (claimForm.claimType === 'TAM_DUNG' || claimForm.claimType === 'BAO_LUU') {
          if (currentClassStudent?.classId) {
            updateClassStudentStatus(currentClassStudent.classId, student.id, 'BAO_LUU');
            addClassLog(currentClassStudent.classId, 'CLAIM_PAUSE_STUDENT', `${student.name} ${claimForm.claimType === 'BAO_LUU' ? 'bảo lưu' : 'tạm dừng'} từ claim`, actor);
          }
          updateStudent({
            ...student,
            status: StudentStatus.RESERVED,
            enrollmentStatus: 'DA_GHI_DANH',
            note: appendStudentNote(
              student.note,
              `${claimForm.claimType === 'BAO_LUU' ? 'Bảo lưu' : 'Tạm dừng'} từ ${claimForm.effectiveDate || claimForm.requestedDate || '--'}${claimForm.reserveUntilDate || claimForm.expectedReturnDate ? ` đến ${claimForm.reserveUntilDate || claimForm.expectedReturnDate}` : ''}`
            )
          });
        }

        if (claimForm.claimType === 'HOC_LAI' && claimForm.resolvedClassId) {
          const targetClass = classes.find((item) => item.id === claimForm.resolvedClassId || item.code === claimForm.resolvedClassId);
          if (targetClass) {
            if (currentClassStudent?.classId) transferStudentClass(student.id, currentClassStudent.classId, targetClass.id);
            else addStudentToClass(targetClass.id, student.id);
            updateStudent({
              ...student,
              classId: targetClass.id,
              className: targetClass.code,
              campus: targetClass.campus || student.campus,
              status: StudentStatus.ENROLLED,
              enrollmentStatus: 'DA_GHI_DANH',
              note: appendStudentNote(student.note, `Học lại lớp ${targetClass.code}${resultNote ? `: ${resultNote}` : ''}`)
            });
          }
        }

        if (claimForm.claimType === 'KHAC' && claimForm.affectsStudentStatus) {
          updateStudent({
            ...student,
            note: appendStudentNote(student.note, `Claim khác đã xử lý${resultNote ? `: ${resultNote}` : policyNote ? `: ${policyNote}` : ''}`)
          });
        }
      } catch (error: any) {
        alert(error?.message || 'Không thể xử lý claim');
        return;
      }
    }

    updateStudentClaim({
      ...selectedClaim,
      ...claimPayload,
      claimStatus: nextStatus,
      updatedAt: new Date().toISOString(),
      updatedBy: actor
    });
    const claimLogMessage = buildChangeLogMessage(
      `${claimModalMode === 'cancel' ? 'Hủy' : 'Xử lý'} claim ${CLAIM_TYPE_LABELS[claimForm.claimType]}`,
      [
        { label: 'Trạng thái', before: CLAIM_STATUS_LABELS[selectedClaim.claimStatus], after: CLAIM_STATUS_LABELS[nextStatus] },
        { label: 'Ai xử lý', before: selectedClaim.assignedDepartment, after: claimForm.assignedDepartment },
        { label: 'Lý do', before: selectedClaim.reason, after: reason },
        { label: 'Ghi chú', before: selectedClaim.note, after: note },
        { label: 'Mô tả', before: selectedClaim.detail, after: claimForm.detail.trim() },
        { label: 'Lớp đề xuất', before: getClassDisplayName(selectedClaim.proposedClassId, selectedClaim.proposedClassCode), after: getClassDisplayName(claimForm.proposedClassId, claimForm.proposedClassCode) },
        { label: 'Lớp xử lý', before: getClassDisplayName(selectedClaim.resolvedClassId, selectedClaim.resolvedClassCode), after: getClassDisplayName(claimForm.resolvedClassId, claimForm.resolvedClassCode) },
        { label: 'Level/môn', before: selectedClaim.levelOrSubject, after: claimForm.levelOrSubject.trim() },
        { label: 'Ngày mong muốn', before: formatDate(selectedClaim.requestedDate), after: formatDate(claimForm.requestedDate) },
        { label: 'Ngày hiệu lực', before: formatDate(selectedClaim.effectiveDate), after: formatDate(claimForm.effectiveDate) },
        { label: 'Ngày quay lại', before: formatDate(selectedClaim.expectedReturnDate), after: formatDate(claimForm.expectedReturnDate) },
        { label: 'Bảo lưu đến', before: formatDate(selectedClaim.reserveUntilDate), after: formatDate(claimForm.reserveUntilDate) },
        { label: 'Ghi chú xử lý', before: selectedClaim.resultNote, after: resultNote },
        { label: 'Chính sách quay lại', before: selectedClaim.policyNote, after: policyNote },
        { label: 'Giữ học phí', before: selectedClaim.keepFeeConfirmed, after: claimForm.keepFeeConfirmed },
        { label: 'Giữ chỗ', before: selectedClaim.keepSlot, after: claimForm.keepSlot },
        { label: 'Ảnh hưởng trạng thái', before: selectedClaim.affectsStudentStatus, after: claimForm.affectsStudentStatus }
      ]
    );
    addStudentLog(
      student.id,
      claimModalMode === 'cancel' ? 'CANCEL_CLAIM' : 'PROCESS_CLAIM',
      claimLogMessage,
      actor,
      'SYSTEM'
    );
    closeClaimModal();
    loadData();
  };

  if (!student) {
    return (
      <div className="mx-auto max-w-6xl p-4 font-sans text-slate-800">
        <button onClick={() => navigate('/contracts')} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
          <ArrowLeft size={14} />
          Quay lại danh sách
        </button>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Không tìm thấy học viên.</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl bg-[#f6f7f9] p-4 font-sans text-slate-800">
      <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => navigate('/contracts')} className="inline-flex items-center gap-1.5 rounded-lg border border-transparent px-2.5 py-1.5 text-sm font-medium text-slate-500 hover:border-slate-300 hover:bg-white hover:text-slate-800">
              <ArrowLeft size={14} />
              Quay lại
            </button>
            <button onClick={() => setShowEditModal(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-transparent px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-white">
              Chỉnh sửa hồ sơ
            </button>
            <button onClick={() => linkedQuotation && navigate(`/contracts/quotations/${linkedQuotation.id}`)} disabled={!linkedQuotation} className="inline-flex items-center gap-1.5 rounded-lg border border-transparent px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-white disabled:cursor-not-allowed disabled:text-slate-400">
              <FileText size={14} />
              Xem SO
            </button>
          </div>
        </div>

        <div className="border-b border-slate-200 px-4 py-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">{student.name}</h1>
                <span className="text-sm text-slate-400">{student.code}</span>
              </div>
              <div className="mt-1 text-sm text-slate-500">{student.phone || 'Chưa có số điện thoại'} {sourceSoCodes.length ? `• SO ${sourceSoCodes.join(', ')}` : ''}</div>
            </div>
          </div>
        </div>

        {activeTab === 'overview' ? <div className="order-2 px-4 py-4">
          <div className="grid gap-x-10 gap-y-6 xl:grid-cols-2">
            <div className="space-y-5">
              <section>
                <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#666666]">THÔNG TIN CƠ BẢN</div>
                <div className="space-y-0.5">
                  <CompactFieldRow label="Mã học viên" value={student.code} />
                  <CompactFieldRow label="Họ tên" value={student.name} />
                  <CompactFieldRow label="Ngày sinh" value={formatDate(student.dob)} />
                  <CompactFieldRow label="SĐT" value={student.phone || '--'} />
                  <CompactFieldRow label="Email" value={student.email || '--'} />
                  <CompactFieldRow label="Cơ sở" value={latestAdmission?.campusId || student.campus || '--'} />
                  <CompactFieldRow label="SO nguồn" value={<CompactBadgeList values={sourceSoCodes} />} truncateValue={false} valueClassName="whitespace-normal" />
                  <CompactFieldRow label="Sản phẩm" value={<CompactBadgeList values={sourceProductLabels} />} truncateValue={false} valueClassName="whitespace-normal" />
                  <CompactFieldRow label="Chương trình" value={<CompactBadgeList values={sourceProgramLabels} />} truncateValue={false} valueClassName="whitespace-normal" />
                  <CompactFieldRow label="Sale phụ trách" value={<CompactBadgeList values={sourceSalespeople} />} truncateValue={false} valueClassName="whitespace-normal" />
                  <CompactFieldRow label="Ngày kích hoạt" value={formatDate(student.createdAt || linkedQuotation?.lockedAt)} />
                </div>
              </section>
            </div>

            <div className="space-y-5 xl:border-l xl:border-slate-200 xl:pl-10">
              <section>
                <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#666666]">TRẠNG THÁI NHANH</div>
                <div className="space-y-0.5">
                  <CompactFieldRow label="Trạng thái học viên" value={<span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium ${compactBadgeClassByStatus(studentStatusKey)}`}>{studentStatusLabel}</span>} valueClassName="whitespace-nowrap" />
                  <CompactFieldRow label="Cơ sở hiện tại" value={currentClass?.campus || latestAdmission?.campusId || student.campus || '--'} valueClassName="whitespace-nowrap" />
                  <CompactFieldRow label="Lớp hiện tại" value={currentClass?.code || '--'} valueClassName="whitespace-nowrap" />
                  <CompactFieldRow label="Trạng thái lớp" value={<span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium ${compactBadgeClassByStatus(studentStatusKey)}`}>{currentClassStatusLabel}</span>} valueClassName="whitespace-nowrap" />
                  <CompactFieldRow label="Chứng chỉ" value={<span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium ${getCertificateBadgeClass(certificateLabel)}`}>{certificateLabel}</span>} valueClassName="whitespace-nowrap" />
                  <CompactFieldRow label="Trạng thái công nợ" value={<span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium ${debtQuickStatusMeta.badgeClassName}`}>{debtQuickStatusMeta.label}</span>} valueClassName="whitespace-nowrap" />
                  <CompactFieldRow label="Số tiền công nợ" value={formatMoney(remainingValue)} valueClassName="whitespace-nowrap" />
                  <CompactFieldRow label="Thời gian công nợ" value={debtQuickStatusMeta.timing} valueClassName="whitespace-nowrap" />
                </div>
              </section>

              <section className="border-t border-slate-200 pt-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#666666]">YÊU CẦU XỬ LÝ</div>
                    <div className="mt-1 text-[13px] text-slate-500">Claim được tạo và xử lý trực tiếp trong hồ sơ học viên.</div>
                  </div>
                  <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium ${compactBadgeClassByClaimStatus(displayClaim?.claimStatus)}`}>
                    {latestClaimStatusLabel}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <CompactFieldRow label="Loại claim" value={latestClaimTypeLabel} valueClassName="whitespace-nowrap" />
                  <CompactFieldRow label="Trạng thái claim" value={<span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium ${compactBadgeClassByClaimStatus(displayClaim?.claimStatus)}`}>{latestClaimStatusLabel}</span>} valueClassName="whitespace-nowrap" />
                  <CompactFieldRow label="Ngày tạo" value={formatDateTime(displayClaim?.createdAt)} valueClassName="whitespace-nowrap" />
                  <CompactFieldRow label="Người tạo" value={displayClaim?.createdBy || '--'} />
                  <CompactFieldRow label="Lý do" value={displayClaim?.reason || '--'} />
                  <CompactFieldRow label="Ghi chú" value={displayClaim?.note || '--'} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={openCreateClaimModal} className="rounded-md border border-blue-600 bg-blue-600 px-3 py-1.5 text-[13px] font-medium text-white">
                    Tạo claim
                  </button>
                  <button onClick={() => openProcessClaimModal()} disabled={!latestPendingClaim} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40">
                    Xử lý claim
                  </button>
                  <button onClick={() => openCancelClaimModal()} disabled={!latestPendingClaim} className="rounded-md border border-rose-200 bg-white px-3 py-1.5 text-[13px] font-medium text-rose-700 disabled:cursor-not-allowed disabled:opacity-40">
                    Hủy claim
                  </button>
                </div>
              </section>
            </div>

            <section className="xl:col-span-2 xl:border-t xl:border-slate-200 xl:pt-4">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#666666]">GHI CHÚ</div>
              <div className="rounded-xl bg-slate-50 px-4 py-3 text-[13px] leading-6 text-slate-700 whitespace-pre-wrap">
                {profileNote || 'Chưa có ghi chú.'}
              </div>
            </section>
          </div>
        </div> : null}
        <div className="order-1 border-b border-slate-200 px-4 pt-3">
          <div className="flex flex-wrap gap-2">
            {DETAIL_TABS.map((tab) => (
              <button key={tab.key} onClick={() => handleTabChange(tab.key)} className={['-mb-px rounded-t-md border border-b-0 px-3 py-1.5 text-[13px] font-medium leading-5', activeTab === tab.key ? 'border-slate-300 bg-white text-slate-900' : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700'].join(' ')}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'classroom' ? (
          <div className="order-2 px-4 py-4">
            <div className="space-y-0 divide-y divide-[#eeeeee]">
              <section className="pb-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <button onClick={openEnrollModal} disabled={!availableLockedQuotations.length || latestAdmission?.status === 'CHO_DUYET'} className="rounded-md border border-blue-600 bg-blue-600 px-3 py-1.5 text-[13px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">Ghi danh vào lớp</button>
                  <button onClick={openTransferModal} disabled={!currentClassStudent?.classId || !classOptions.length} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40">Chuyển lớp</button>
                  <button onClick={openPauseModal} disabled={studentStatusKey !== 'DANG_HOC'} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40">Tạm dừng</button>
                  <button onClick={() => linkedQuotation && navigate(`/contracts/quotations/${linkedQuotation.id}`)} disabled={!linkedQuotation} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40">Xem SO</button>
                </div>
              </section>

              <section className="py-4">
                <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[#666666]">Current Class</div>
                <div className="grid gap-x-6 gap-y-2 xl:grid-cols-4">
                  <CompactFieldRow label="Cơ sở" value={currentClass?.campus || '--'} valueClassName="whitespace-nowrap" />
                  <CompactFieldRow label="Lớp hiện tại" value={currentClass?.code || '--'} valueClassName="whitespace-nowrap" />
                  <CompactFieldRow label="Trình độ" value={currentClass?.level || '--'} valueClassName="whitespace-nowrap" />
                  <CompactFieldRow label="Ca học" value={currentClass?.schedule || '--'} valueClassName="whitespace-nowrap" />
                  <CompactFieldRow label="Giáo viên" value={teacher?.fullName || '--'} valueClassName="whitespace-nowrap" />
                  <CompactFieldRow label="Ngày bắt đầu" value={formatDate(currentClass?.startDate)} valueClassName="whitespace-nowrap" />
                  <CompactFieldRow label="Ngày kết thúc" value={formatDate(currentClass?.endDate)} valueClassName="whitespace-nowrap" />
                  <CompactFieldRow label="Trạng thái lớp" value={<span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium ${compactBadgeClassByStatus(studentStatusKey)}`}>{currentClassStatusLabel}</span>} valueClassName="whitespace-nowrap" />
                </div>
              </section>

              <section className="pt-4">
                <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[#666666]">Class History</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-[0.06em] text-slate-500">
                      <tr>
                        <th className="whitespace-nowrap py-2 pr-4">Lớp</th>
                        <th className="whitespace-nowrap py-2 pr-4">Trình độ</th>
                        <th className="whitespace-nowrap py-2 pr-4">Ngày bắt đầu</th>
                        <th className="whitespace-nowrap py-2 pr-4">Ngày kết thúc</th>
                        <th className="whitespace-nowrap py-2 pr-4">Trạng thái</th>
                        <th className="whitespace-nowrap py-2">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentClassHistory.length > 0 ? studentClassHistory.map((item) => {
                        const classInfo = classes.find((entry) => entry.id === item.classId || entry.code === item.classId);
                        const historyStatus = item.classId === currentClassStudent?.classId ? currentClassStatusLabel : item.status === 'BAO_LUU' ? 'Tạm dừng' : item.status === 'NGHI_HOC' ? 'Dừng' : 'Đang học';
                        return (
                          <tr key={item.id} className="border-b border-slate-100 last:border-b-0">
                            <td className="whitespace-nowrap py-2 pr-4 text-[13px] font-semibold text-slate-900">{classInfo?.code || item.classId}</td>
                            <td className="whitespace-nowrap py-2 pr-4 text-[13px] text-slate-700">{classInfo?.level || '--'}</td>
                            <td className="whitespace-nowrap py-2 pr-4 text-[13px] text-slate-700">{formatDate(classInfo?.startDate || new Date(item.createdAt).toISOString())}</td>
                            <td className="whitespace-nowrap py-2 pr-4 text-[13px] text-slate-700">{formatDate(classInfo?.endDate)}</td>
                            <td className="whitespace-nowrap py-2 pr-4"><span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium ${compactBadgeClassByStatus(historyStatus)}`}>{historyStatus}</span></td>
                            <td className="whitespace-nowrap py-2 text-[13px] text-slate-600">{item.debtStatus ? `Công nợ: ${item.debtStatus}` : '--'}</td>
                          </tr>
                        );
                      }) : <tr><td colSpan={6} className="py-6 text-center text-[12px] text-slate-400">Chưa có lịch sử lớp học.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </div>
        ) : null}

      </div>

      {showEditModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Chỉnh sửa hồ sơ học viên</h3>
              <button onClick={closeEditModal} className="text-sm font-medium text-slate-500">Đóng</button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Trường họ tên học viên
                </label>
                <input
                  value={editForm.name}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  placeholder="Nhập họ tên học viên"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Trường ngày sinh
                </label>
                <input
                  value={editForm.dob}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, dob: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  placeholder="Nhập ngày sinh"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Trường số điện thoại
                </label>
                <input
                  value={editForm.phone}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, phone: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  placeholder="Nhập số điện thoại học viên"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Trường email
                </label>
                <input
                  value={editForm.email}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, email: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  placeholder="Nhập email học viên"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Trường cơ sở theo học
                </label>
                <input
                  value={editForm.campus}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, campus: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  placeholder="Nhập cơ sở theo học hoặc cơ sở mong muốn"
                />
              </div>

            </div>

            <div className="mt-3">
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Trường ghi chú hồ sơ
              </label>
              <textarea
                value={editForm.note}
                onChange={(event) => setEditForm((prev) => ({ ...prev, note: event.target.value }))}
                className="h-24 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                placeholder="Nhập ghi chú thêm cho hồ sơ học viên"
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={closeEditModal} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">Hủy</button>
              <button onClick={saveProfile} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Lưu thay đổi</button>
            </div>
          </div>
        </div>
      ) : null}
      {claimModalMode ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 p-4">
          <div className="flex min-h-full items-start justify-center py-4 sm:items-center">
            <div className="flex w-full max-w-3xl max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{claimModalMode === 'create' ? 'Tạo claim' : claimModalMode === 'process' ? 'Xử lý claim' : 'Hủy claim'}</h3>
                <p className="mt-1 text-sm text-slate-500">{student.name} • {student.code}</p>
              </div>
              <button onClick={closeClaimModal} className="text-sm font-medium text-slate-500">Đóng</button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="space-y-4">
              <div className={`grid gap-3 ${hideTransferClaimMetaFields ? 'md:grid-cols-1' : 'md:grid-cols-2'}`}>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Claim type</label>
                  <select
                    value={claimForm.claimType}
                    onChange={(event) => {
                      const nextType = event.target.value as StudentClaimType;
                      setClaimForm((prev) =>
                        buildClaimForm(nextType, {
                          reason: prev.reason,
                          note: prev.note,
                          claimStatus: 'CHO_XU_LY',
                          currentClassId: currentClass?.id || currentClassStudent?.classId,
                          currentClassCode: currentClass?.code || currentClassStudent?.classId
                        })
                      );
                    }}
                    disabled={claimModalMode !== 'create'}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm disabled:bg-slate-50"
                  >
                    {(claimModalMode === 'create' ? CLAIM_TYPE_CREATE_OPTIONS : CLAIM_TYPE_OPTIONS).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </div>
                {!hideTransferClaimMetaFields ? (
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">Claim status</label>
                    <select
                      value={claimModalMode === 'cancel' ? 'DA_HUY' : claimForm.claimStatus}
                      onChange={(event) => setClaimForm((prev) => ({ ...prev, claimStatus: event.target.value as StudentClaimStatus }))}
                      disabled={claimModalMode === 'cancel'}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm disabled:bg-slate-50"
                    >
                      {(claimModalMode === 'process'
                        ? CLAIM_STATUS_OPTIONS.filter((item) => ['CHO_XU_LY', 'DA_XU_LY', 'TU_CHOI'].includes(item.value))
                        : claimModalMode === 'create'
                          ? CLAIM_STATUS_CREATE_OPTIONS
                          : CLAIM_STATUS_OPTIONS).map((item) => (
                        <option key={item.value} value={item.value}>{item.label}</option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {!hideTransferClaimMetaFields ? (
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">Ai xử lý</label>
                    <select
                      value={claimForm.assignedDepartment}
                      onChange={(event) => setClaimForm((prev) => ({ ...prev, assignedDepartment: event.target.value }))}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                    >
                      {CLAIM_ASSIGNEE_OPTIONS[claimForm.claimType].map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </div>
                ) : null}
                {(claimForm.claimType === 'TAM_DUNG' || claimForm.claimType === 'BAO_LUU') && claimModalMode === 'create' ? (
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">Lý do</label>
                    <input value={claimForm.reason} onChange={(event) => setClaimForm((prev) => ({ ...prev, reason: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Nhập lý do claim" />
                  </div>
                ) : null}
                {claimForm.claimType === 'HOC_LAI' && claimModalMode === 'create' ? (
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">Level / môn cần học lại</label>
                    <input value={claimForm.levelOrSubject} onChange={(event) => setClaimForm((prev) => ({ ...prev, levelOrSubject: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Ví dụ: A1 hoặc HSK3" />
                  </div>
                ) : null}
                {claimForm.claimType === 'KHAC' && claimModalMode === 'create' ? (
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">Ngày mong muốn xử lý</label>
                    <input type="date" value={claimForm.requestedDate} onChange={(event) => setClaimForm((prev) => ({ ...prev, requestedDate: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
                  </div>
                ) : null}
                {(claimForm.claimType === 'CHUYEN_LOP' || (claimForm.claimType === 'HOC_LAI' && claimModalMode === 'process')) && claimModalMode !== 'cancel' ? (
                  <>
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-slate-700">{claimModalMode === 'create' ? 'Cơ sở đề xuất' : 'Cơ sở xử lý'}</label>
                      <select
                        value={claimModalMode === 'create' ? claimForm.proposedCampusId : claimForm.resolvedCampusId}
                        onChange={(event) => {
                          const nextCampus = event.target.value;
                          setClaimForm((prev) => ({
                            ...prev,
                            ...(claimModalMode === 'create'
                              ? { proposedCampusId: nextCampus, proposedClassId: '', proposedClassCode: '' }
                              : { resolvedCampusId: nextCampus, resolvedClassId: '', resolvedClassCode: '' })
                          }));
                        }}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                      >
                        <option value="">-- Chọn cơ sở --</option>
                        {(claimCampusOptions.length ? claimCampusOptions : allCampusOptions).map((campus) => <option key={campus} value={campus}>{campus}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-slate-700">{claimForm.claimType === 'HOC_LAI' ? 'Học lại lớp nào' : claimModalMode === 'create' ? 'Lớp đề xuất mới' : 'Lớp mới'}</label>
                      <select
                        value={claimModalMode === 'create' ? claimForm.proposedClassId : claimForm.resolvedClassId}
                        onChange={(event) => {
                          const selected = classes.find((item) => item.id === event.target.value);
                          setClaimForm((prev) => ({
                            ...prev,
                            ...(claimModalMode === 'create'
                              ? {
                                  proposedCampusId: selected?.campus || prev.proposedCampusId,
                                  proposedClassId: event.target.value,
                                  proposedClassCode: selected?.code || ''
                                }
                              : {
                                  resolvedCampusId: selected?.campus || prev.resolvedCampusId,
                                  resolvedClassId: event.target.value,
                                  resolvedClassCode: selected?.code || ''
                                })
                          }));
                        }}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                      >
                        <option value="">{claimModalMode === 'create' ? '-- Không bắt buộc --' : '-- Chọn lớp --'}</option>
                        {(claimModalMode === 'create' ? claimProposedClassOptions : claimResolvedClassOptions).map((item) => <option key={item.id} value={item.id}>{item.code} - {item.campus}{item.level ? ` - ${item.level}` : ''}</option>)}
                      </select>
                    </div>
                  </>
                ) : null}
              </div>

              {!(claimForm.claimType === 'CHUYEN_LOP' && claimModalMode === 'create') && !((claimForm.claimType === 'TAM_DUNG' || claimForm.claimType === 'BAO_LUU') && claimModalMode === 'create') && !(claimForm.claimType === 'KHAC' && claimModalMode === 'process') ? (
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Lý do</label>
                  <textarea value={claimForm.reason} onChange={(event) => setClaimForm((prev) => ({ ...prev, reason: event.target.value }))} className="h-20 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Nhập lý do claim" />
                </div>
              ) : null}

              {claimForm.claimType === 'CHUYEN_LOP' ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {claimModalMode === 'create' ? (
                    <>
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700">Ngày mong muốn áp dụng</label>
                        <input type="date" value={claimForm.requestedDate} onChange={(event) => setClaimForm((prev) => ({ ...prev, requestedDate: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
                        <div className="mt-3">
                          <label className="mb-1 block text-sm font-semibold text-slate-700">Ghi chú</label>
                          <textarea value={claimForm.note} onChange={(event) => setClaimForm((prev) => ({ ...prev, note: event.target.value }))} className="h-20 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Nhập ghi chú" />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700">Lý do</label>
                        <textarea value={claimForm.reason} onChange={(event) => setClaimForm((prev) => ({ ...prev, reason: event.target.value }))} className="h-40 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Nhập lý do claim" />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700">Cơ sở hiện tại</label>
                        <input value={currentClass?.campus || student?.campus || '--'} disabled className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm" />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700">Lớp hiện tại</label>
                        <input value={currentClass?.code || currentClassStudent?.classId || '--'} disabled className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm" />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700">Ngày hiệu lực</label>
                        <input type="date" value={claimForm.effectiveDate} onChange={(event) => setClaimForm((prev) => ({ ...prev, effectiveDate: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
                      </div>
                    </>
                  )}
                </div>
              ) : null}

              {(claimForm.claimType === 'TAM_DUNG' || claimForm.claimType === 'BAO_LUU') ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">{claimForm.claimType === 'TAM_DUNG' ? (claimModalMode === 'create' ? 'Ngày bắt đầu mong muốn' : 'Ngày bắt đầu tạm dừng') : (claimModalMode === 'create' ? 'Ngày bắt đầu bảo lưu' : 'Ngày hiệu lực bảo lưu')}</label>
                    <input type="date" value={claimModalMode === 'create' ? claimForm.requestedDate : claimForm.effectiveDate} onChange={(event) => setClaimForm((prev) => ({ ...prev, [claimModalMode === 'create' ? 'requestedDate' : 'effectiveDate']: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">{claimForm.claimType === 'BAO_LUU' ? (claimModalMode === 'create' ? 'Thời gian bảo lưu dự kiến' : 'Bảo lưu đến ngày') : 'Ngày dự kiến quay lại'}</label>
                    <input type="date" value={claimForm.claimType === 'BAO_LUU' ? claimForm.reserveUntilDate : claimForm.expectedReturnDate} onChange={(event) => setClaimForm((prev) => ({ ...prev, [claimForm.claimType === 'BAO_LUU' ? 'reserveUntilDate' : 'expectedReturnDate']: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
                  </div>
                </div>
              ) : null}

              {claimForm.claimType === 'HOC_LAI' ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {claimModalMode === 'create' ? null : (
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-slate-700">Level / môn cần học lại</label>
                      <input value={claimForm.levelOrSubject} onChange={(event) => setClaimForm((prev) => ({ ...prev, levelOrSubject: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Ví dụ: A1 hoặc HSK3" />
                    </div>
                  )}
                  {claimModalMode === 'process' ? (
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-slate-700">Ngày bắt đầu</label>
                      <input type="date" value={claimForm.effectiveDate} onChange={(event) => setClaimForm((prev) => ({ ...prev, effectiveDate: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
                    </div>
                  ) : null}
                </div>
              ) : null}

              {claimForm.claimType === 'KHAC' ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {claimModalMode === 'process' ? (
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-slate-700">Kết quả xử lý</label>
                      <input value={claimForm.resultNote} onChange={(event) => setClaimForm((prev) => ({ ...prev, resultNote: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Kết quả xử lý" />
                    </div>
                  ) : null}
                  {claimModalMode === 'process' ? (
                    <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700">
                      <input type="checkbox" checked={claimForm.affectsStudentStatus} onChange={(event) => setClaimForm((prev) => ({ ...prev, affectsStudentStatus: event.target.checked }))} />
                      Có ảnh hưởng trạng thái học viên
                    </label>
                  ) : null}
                </div>
              ) : null}

              {((claimForm.claimType === 'KHAC' && claimModalMode === 'create') || (claimModalMode === 'create' && !['CHUYEN_LOP', 'TAM_DUNG', 'BAO_LUU', 'HOC_LAI'].includes(claimForm.claimType))) ? (
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Mô tả chi tiết</label>
                  <textarea value={claimForm.detail} onChange={(event) => setClaimForm((prev) => ({ ...prev, detail: event.target.value }))} className="h-20 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Thông tin bổ sung" />
                </div>
              ) : null}

              {claimModalMode === 'process' && (claimForm.claimType === 'CHUYEN_LOP' || claimForm.claimType === 'HOC_LAI' || claimForm.claimType === 'TAM_DUNG' || claimForm.claimType === 'BAO_LUU') ? (
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">{claimForm.claimType === 'TAM_DUNG' ? 'Ghi chú xử lý' : (claimForm.claimType === 'BAO_LUU' || claimForm.claimType === 'HOC_LAI') ? 'Ghi chú' : 'Lý do xử lý / ghi chú'}</label>
                  <textarea value={claimForm.resultNote} onChange={(event) => setClaimForm((prev) => ({ ...prev, resultNote: event.target.value }))} className="h-20 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Nhập ghi chú xử lý" />
                </div>
              ) : null}

              {(claimModalMode === 'process' && (claimForm.claimType === 'CHUYEN_LOP' || claimForm.claimType === 'HOC_LAI')) ? (
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700">
                  <input type="checkbox" checked={claimForm.keepFeeConfirmed} onChange={(event) => setClaimForm((prev) => ({ ...prev, keepFeeConfirmed: event.target.checked }))} />
                  {claimForm.claimType === 'HOC_LAI' ? 'Có thu thêm phí không' : 'Xác nhận giữ học phí / chênh lệch nếu có'}
                </label>
              ) : null}

              {(claimModalMode === 'process' && claimForm.claimType === 'TAM_DUNG') ? (
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700">
                  <input type="checkbox" checked={claimForm.keepSlot} onChange={(event) => setClaimForm((prev) => ({ ...prev, keepSlot: event.target.checked }))} />
                  Có giữ chỗ lớp hay không
                </label>
              ) : null}

              {(claimModalMode === 'process' && claimForm.claimType === 'BAO_LUU') ? (
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Chính sách quay lại học</label>
                  <textarea value={claimForm.policyNote} onChange={(event) => setClaimForm((prev) => ({ ...prev, policyNote: event.target.value }))} className="h-20 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Ghi chú chính sách quay lại học" />
                </div>
              ) : null}

              {claimModalMode === 'cancel' ? (
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Ghi chú hủy claim</label>
                  <textarea value={claimForm.note} onChange={(event) => setClaimForm((prev) => ({ ...prev, note: event.target.value }))} className="h-20 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Nhập ghi chú hủy claim" />
                </div>
              ) : !(claimForm.claimType === 'CHUYEN_LOP' && claimModalMode === 'create') ? (
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Ghi chú</label>
                  <textarea value={claimForm.note} onChange={(event) => setClaimForm((prev) => ({ ...prev, note: event.target.value }))} className="h-20 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Nhập ghi chú" />
                </div>
              ) : null}

              {selectedClaim ? <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">Claim hiện tại: <span className="font-semibold text-slate-900">{CLAIM_TYPE_LABELS[selectedClaim.claimType]}</span> • <span className="font-semibold text-slate-900">{CLAIM_STATUS_LABELS[selectedClaim.claimStatus]}</span></div> : null}
            </div>
            </div>
            <div className="mt-4 flex justify-end gap-2 border-t border-slate-200 pt-4">
              <button onClick={closeClaimModal} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">Hủy</button>
              <button onClick={submitClaim} className={`rounded-xl px-4 py-2 text-sm font-semibold text-white ${claimModalMode === 'cancel' ? 'bg-rose-600' : 'bg-slate-900'}`}>{claimModalMode === 'create' ? 'Tạo claim' : claimModalMode === 'process' ? 'Lưu xử lý' : 'Xác nhận hủy'}</button>
            </div>
          </div>
        </div>
        </div>
      ) : null}
      {false ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"><div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl"><div className="mb-4 flex items-center justify-between"><div><h3 className="text-lg font-bold text-slate-900">{claimModalMode === 'create' ? 'Tạo claim' : claimModalMode === 'process' ? 'Xử lý claim' : 'Hủy claim'}</h3><p className="mt-1 text-sm text-slate-500">{student.name} • {student.code}</p></div><button onClick={closeClaimModal} className="text-sm font-medium text-slate-500">Đóng</button></div><div className="space-y-3"><div className="grid gap-3 md:grid-cols-2"><div><label className="mb-1 block text-sm font-semibold text-slate-700">Claim type</label><select value={claimForm.claimType} onChange={(event) => setClaimForm((prev) => ({ ...prev, claimType: event.target.value as StudentClaimType, claimStatus: claimModalMode === 'create' && event.target.value === 'KHONG_CO' ? 'KHONG_CO' : prev.claimStatus === 'KHONG_CO' ? 'CHO_XU_LY' : prev.claimStatus }))} disabled={claimModalMode !== 'create'} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm disabled:bg-slate-50">{CLAIM_TYPE_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div><div><label className="mb-1 block text-sm font-semibold text-slate-700">Claim status</label><select value={claimModalMode === 'cancel' ? 'DA_HUY' : claimForm.claimStatus} onChange={(event) => setClaimForm((prev) => ({ ...prev, claimStatus: event.target.value as StudentClaimStatus }))} disabled={claimModalMode === 'cancel'} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm disabled:bg-slate-50">{(claimModalMode === 'process' ? CLAIM_STATUS_OPTIONS.filter((item) => ['CHO_XU_LY', 'DA_XU_LY', 'TU_CHOI'].includes(item.value)) : CLAIM_STATUS_OPTIONS).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div></div><div><label className="mb-1 block text-sm font-semibold text-slate-700">Lý do</label><textarea value={claimForm.reason} onChange={(event) => setClaimForm((prev) => ({ ...prev, reason: event.target.value }))} className="h-24 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Nhập lý do claim" /></div><div><label className="mb-1 block text-sm font-semibold text-slate-700">Ghi chú</label><textarea value={claimForm.note} onChange={(event) => setClaimForm((prev) => ({ ...prev, note: event.target.value }))} className="h-24 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder={claimModalMode === 'cancel' ? 'Nhập ghi chú hủy claim' : 'Nhập ghi chú xử lý'} /></div>{selectedClaim ? <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">Claim hiện tại: <span className="font-semibold text-slate-900">{CLAIM_TYPE_LABELS[selectedClaim.claimType]}</span> • <span className="font-semibold text-slate-900">{CLAIM_STATUS_LABELS[selectedClaim.claimStatus]}</span></div> : null}</div><div className="mt-4 flex justify-end gap-2"><button onClick={closeClaimModal} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">Hủy</button><button onClick={submitClaim} className={`rounded-xl px-4 py-2 text-sm font-semibold text-white ${claimModalMode === 'cancel' ? 'bg-rose-600' : 'bg-slate-900'}`}>{claimModalMode === 'create' ? 'Tạo claim' : claimModalMode === 'process' ? 'Lưu xử lý' : 'Xác nhận hủy'}</button></div></div></div> : null}
      {showEnrollModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Ghi danh vào lớp</h3>
              <button onClick={() => setShowEnrollModal(false)} className="text-sm font-medium text-slate-500">Đóng</button>
            </div>
            <div className="space-y-3">
              <select value={enrollForm.quotationId} onChange={(event) => setEnrollForm((prev) => ({ ...prev, quotationId: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
                <option value="">-- Chọn SO --</option>
                {availableLockedQuotations.map((quotation) => <option key={quotation.id} value={quotation.id}>{quotation.soCode} - {quotation.customerName}</option>)}
              </select>
              <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                Chỉ hiển thị lớp khớp chương trình học viên: {studentAllowedPrograms.length ? studentAllowedPrograms.join(', ') : '--'}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Cơ sở</label>
                  <select
                    value={enrollForm.campusId}
                    onChange={(event) =>
                      setEnrollForm((prev) => ({
                        ...prev,
                        campusId: event.target.value,
                        classId: enrollAvailableClasses.find((item) => item.id === prev.classId)?.campus === event.target.value ? prev.classId : ''
                      }))
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  >
                    {(enrollCampusOptions.length ? enrollCampusOptions : allCampusOptions).map((campus) => <option key={campus} value={campus}>{campus}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Lớp</label>
                  <select value={enrollForm.classId} onChange={(event) => setEnrollForm((prev) => ({ ...prev, classId: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
                    <option value="">-- Chọn lớp --</option>
                    {enrollAvailableClasses.map((item) => <option key={item.id} value={item.id}>{item.code} - {item.campus}{item.level ? ` - ${item.level}` : ''}</option>)}
                  </select>
                </div>
              </div>
              <textarea value={enrollForm.note} onChange={(event) => setEnrollForm((prev) => ({ ...prev, note: event.target.value }))} className="h-24 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Ghi chú" />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowEnrollModal(false)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">Hủy</button>
              <button onClick={submitEnroll} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Lưu ghi danh</button>
            </div>
          </div>
        </div>
      ) : null}
      {showTransferModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Chuyển lớp</h3>
              <button onClick={() => setShowTransferModal(false)} className="text-sm font-medium text-slate-500">Đóng</button>
            </div>
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Cơ sở hiện tại</label>
                  <input value={currentClass?.campus || student?.campus || '--'} disabled className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Lớp hiện tại</label>
                  <input value={currentClass?.code || currentClassStudent?.classId || '--'} disabled className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Cơ sở chuyển đến</label>
                  <select
                    value={transferForm.campusId}
                    onChange={(event) =>
                      setTransferForm((prev) => ({
                        ...prev,
                        campusId: event.target.value,
                        classId: transferAvailableClasses.find((item) => item.id === prev.classId)?.campus === event.target.value ? prev.classId : ''
                      }))
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  >
                    {(transferCampusOptions.length ? transferCampusOptions : allCampusOptions).map((campus) => <option key={campus} value={campus}>{campus}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Lớp đề xuất chuyển sang</label>
                  <select value={transferForm.classId} onChange={(event) => setTransferForm((prev) => ({ ...prev, classId: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
                    <option value="">-- Chọn lớp đích --</option>
                    {transferAvailableClasses.map((item) => <option key={item.id} value={item.id}>{item.code} - {item.campus}{item.level ? ` - ${item.level}` : ''}</option>)}
                  </select>
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                Chỉ hiển thị lớp khớp chương trình học viên: {studentAllowedPrograms.length ? studentAllowedPrograms.join(', ') : '--'}
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Ngày chuyển</label>
                <input type="date" value={transferForm.effectiveDate} onChange={(event) => setTransferForm((prev) => ({ ...prev, effectiveDate: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Lý do</label>
                <textarea value={transferForm.reason} onChange={(event) => setTransferForm((prev) => ({ ...prev, reason: event.target.value }))} className="h-24 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Lý do chuyển lớp" />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowTransferModal(false)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">Hủy</button>
              <button onClick={submitTransfer} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Xác nhận chuyển lớp</button>
            </div>
          </div>
        </div>
      ) : null}
      {showPauseModal ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"><div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl"><div className="mb-4 flex items-center justify-between"><h3 className="text-lg font-bold text-slate-900">T?m d?ng</h3><button onClick={() => setShowPauseModal(false)} className="text-sm font-medium text-slate-500">��ng</button></div><div className="space-y-3"><div><label className="mb-1 block text-sm font-semibold text-slate-700">Ng�y b?t d?u t?m d?ng</label><input type="date" value={pauseForm.startDate} onChange={(event) => setPauseForm((prev) => ({ ...prev, startDate: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" /></div><div><label className="mb-1 block text-sm font-semibold text-slate-700">L� do</label><textarea value={pauseForm.reason} onChange={(event) => setPauseForm((prev) => ({ ...prev, reason: event.target.value }))} className="h-24 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="L� do t?m d?ng" /></div><div><label className="mb-1 block text-sm font-semibold text-slate-700">Ng�y d? ki?n quay l?i</label><input type="date" value={pauseForm.expectedReturnDate} onChange={(event) => setPauseForm((prev) => ({ ...prev, expectedReturnDate: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" /></div><div><label className="mb-1 block text-sm font-semibold text-slate-700">Ghi ch�</label><textarea value={pauseForm.note} onChange={(event) => setPauseForm((prev) => ({ ...prev, note: event.target.value }))} className="h-20 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Ghi ch� th�m" /></div></div><div className="mt-4 flex justify-end gap-2"><button onClick={() => setShowPauseModal(false)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">H?y</button><button onClick={submitPause} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Luu t?m d?ng</button></div></div></div> : null}
    </div>
  );
};

export default ContractStudentDetail;

