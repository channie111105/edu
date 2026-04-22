import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw, Search, Settings } from 'lucide-react';
import ClassCodeLookupInput from '../components/ClassCodeLookupInput';
import { AdvancedFilterDropdown, ToolbarTimeFilter } from '../components/filters';
import {
  IAdmission,
  IClassStudent,
  IContract,
  IQuotation,
  ISalesTeam,
  IStudent,
  IStudentClaim,
  ITeacher,
  ITrainingClass,
  QuotationStatus,
  StudentClaimStatus,
  StudentStatus,
  UserRole
} from '../types';
import {
  addClassLog,
  addStudentLog,
  addStudentToClass,
  getAdmissions,
  getClassStudents,
  getContracts,
  getQuotations,
  getSalesTeams,
  getStudentClaims,
  getStudentClassEligibility,
  getStudents,
  getTeachers,
  getTrainingClasses,
  quotationLinksToStudent,
  transferStudentClass,
  updateAdmission,
  updateStudent
} from '../utils/storage';
import {
  CustomDateRange,
  ToolbarOption,
  ToolbarValueOption,
  doesDateMatchTimeRange
} from '../utils/filterToolbar';
import { approveAdmission, cancelAdmission, createAdmission } from '../services/enrollmentFlow.service';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { decodeMojibakeReactNode, decodeMojibakeText } from '../utils/mojibake';

type EnrollmentTabKey = 'waiting_enrollment' | 'waiting_approval' | 'enrolled' | 'processing' | 'students' | 'all';
type EnrollmentMarketValue = 'Đức' | 'Trung';
type EnrollmentProgramValue = 'A1' | 'A2';
type EnrollmentAdvancedFieldKey =
  | 'market'
  | 'campus'
  | 'owner'
  | 'product'
  | 'program'
  | 'admissionStatus'
  | 'claimStatus'
  | 'debtStatus'
  | 'classStatus';
type EnrollmentAdvancedGroupFieldKey = EnrollmentAdvancedFieldKey;
type EnrollmentTimeField = 'studyStartDate' | 'expectedEndDate' | 'admissionApprovedAt' | 'claimCreatedAt';
type EnrollmentTimeFieldSelection = 'action' | EnrollmentTimeField;
type StudentLifecycleStatus =
  | 'MOI_TAO'
  | 'CHO_GHI_DANH'
  | 'DA_GHI_DANH'
  | 'DANG_HOC'
  | 'TAM_DUNG'
  | 'HOAN_THANH'
  | 'DUNG';
type AdmissionDisplayStatus = 'CHUA_TAO' | 'CHO_DUYET' | 'DA_DUYET';

type StudentEnrollmentRow = {
  student: IStudent;
  lockedQuotation?: IQuotation;
  latestAdmission?: IAdmission;
  latestClaim?: IStudentClaim;
  activeClaim?: IStudentClaim;
  currentClassStudent?: IClassStudent;
  currentClass?: ITrainingClass;
  contract?: IContract;
  teacher?: ITeacher;
  desiredCampus: string;
  campusName: string;
  currentClassLabel: string;
  marketLabel: string;
  salesOwnerName: string;
  interestedProductName: string;
  programLabels: EnrollmentProgramValue[];
  programDisplayLabel: string;
  studentStatusKey: StudentLifecycleStatus;
  studentStatusLabel: string;
  admissionStatusKey: AdmissionDisplayStatus;
  admissionStatusLabel: string;
  claimStatusKey: StudentClaimStatus;
  claimStatusLabel: string;
  debtStatusKey?: NonNullable<IClassStudent['debtStatus']>;
  debtStatusLabel: string;
  classStatusKey?: ITrainingClass['status'];
  classStatusLabel: string;
  studyStartDateValue?: string;
  expectedEndDateValue?: string;
  admissionApprovedAtValue?: string;
  claimCreatedAtValue?: string;
  canEnroll: boolean;
  canCancelAdmission: boolean;
  needsProcessing: boolean;
  processingReasons: string[];
};

const TAB_CONFIG: Array<{ key: EnrollmentTabKey; label: string }> = [
  { key: 'all', label: 'Tá»•ng' },
  { key: 'waiting_enrollment', label: 'Chá» ghi danh' },
  { key: 'waiting_approval', label: 'Chá» duyá»‡t' },
  { key: 'enrolled', label: 'ÄÃ£ ghi danh' },
  { key: 'students', label: 'Cần xử lý' }
];

const STUDENT_STATUS_LABELS: Record<StudentLifecycleStatus, string> = {
  MOI_TAO: 'Má»›i táº¡o',
  CHO_GHI_DANH: 'Chá» ghi danh',
  DA_GHI_DANH: 'ÄÃ£ ghi danh',
  DANG_HOC: 'Äang há»c',
  TAM_DUNG: 'Táº¡m dá»«ng',
  HOAN_THANH: 'HoÃ n thÃ nh',
  DUNG: 'Dá»«ng'
};

const ADMISSION_STATUS_LABELS: Record<AdmissionDisplayStatus, string> = {
  CHUA_TAO: 'CHÆ¯A Táº O',
  CHO_DUYET: 'CHá»œ DUYá»†T',
  DA_DUYET: 'ÄÃƒ DUYá»†T'
};

const CLAIM_TYPE_LABELS: Record<string, string> = {
  KHONG_CO: 'Không có',
  CHUYEN_LOP: 'Chuyển lớp',
  TAM_DUNG: 'Tạm dừng',
  BAO_LUU: 'Bảo lưu',
  HOC_LAI: 'Học lại',
  KHAC: 'Khác'
};

const CLAIM_STATUS_LABELS: Record<string, string> = {
  KHONG_CO: 'Không có',
  CHO_XU_LY: 'Chờ xử lý',
  DA_XU_LY: 'Đã xử lý',
  TU_CHOI: 'Từ chối',
  DA_HUY: 'Đã hủy'
};

const DEBT_STATUS_LABELS: Record<NonNullable<IClassStudent['debtStatus']>, string> = {
  DA_DONG: 'Đã đóng',
  THIEU: 'Thiếu',
  QUA_HAN: 'Quá hạn'
};

const CLASS_STATUS_LABELS: Record<ITrainingClass['status'], string> = {
  DRAFT: 'Nháp',
  ACTIVE: 'Đang học',
  DONE: 'Đã kết thúc',
  CANCELED: 'Đã hủy'
};

const ENROLLMENT_MARKET_OPTIONS = ['Đức', 'Trung'] as const satisfies ReadonlyArray<EnrollmentMarketValue>;
const ENROLLMENT_PROGRAM_OPTIONS = ['A1', 'A2'] as const satisfies ReadonlyArray<EnrollmentProgramValue>;
const ENROLLMENT_ADMISSION_STATUS_ORDER = ['CHUA_TAO', 'CHO_DUYET', 'DA_DUYET'] as const;
const ENROLLMENT_CLAIM_STATUS_ORDER = ['KHONG_CO', 'CHO_XU_LY', 'DA_XU_LY', 'TU_CHOI', 'DA_HUY'] as const;
const ENROLLMENT_DEBT_STATUS_ORDER = ['DA_DONG', 'THIEU', 'QUA_HAN'] as const;
const ENROLLMENT_CLASS_STATUS_ORDER = ['DRAFT', 'ACTIVE', 'DONE', 'CANCELED'] as const;

const ENROLLMENT_TOOLBAR_FILTER_OPTIONS = [
  { id: 'market', label: 'Thị trường' },
  { id: 'campus', label: 'Cơ sở' },
  { id: 'owner', label: 'Nhân viên phụ trách' },
  { id: 'product', label: 'Sản phẩm quan tâm' },
  { id: 'program', label: 'Chương trình' },
  { id: 'admissionStatus', label: 'Trạng thái ghi danh' },
  { id: 'claimStatus', label: 'Trạng thái claim' },
  { id: 'debtStatus', label: 'Trạng thái công nợ' },
  { id: 'classStatus', label: 'Trạng thái lớp' }
] as const satisfies ReadonlyArray<ToolbarOption>;

const ENROLLMENT_TOOLBAR_GROUP_OPTIONS = [
  { id: 'market', label: 'Thị trường' },
  { id: 'campus', label: 'Cơ sở' },
  { id: 'owner', label: 'Nhân viên phụ trách' },
  { id: 'product', label: 'Sản phẩm quan tâm' },
  { id: 'program', label: 'Chương trình' },
  { id: 'admissionStatus', label: 'Trạng thái ghi danh' },
  { id: 'claimStatus', label: 'Trạng thái claim' },
  { id: 'debtStatus', label: 'Trạng thái công nợ' },
  { id: 'classStatus', label: 'Trạng thái lớp' }
] as const satisfies ReadonlyArray<ToolbarOption>;

const ENROLLMENT_TOOLBAR_TIME_FIELD_OPTIONS = [
  { id: 'studyStartDate', label: 'Ngày bắt đầu học' },
  { id: 'expectedEndDate', label: 'Ngày dự kiến kết thúc' },
  { id: 'admissionApprovedAt', label: 'Duyệt ghi danh' },
  { id: 'claimCreatedAt', label: 'Tạo claim' }
] as const satisfies ReadonlyArray<ToolbarOption>;

const ENROLLMENT_TOOLBAR_TIME_PRESETS = [
  { id: 'all', label: 'Tất cả thời gian' },
  { id: 'today', label: 'Hôm nay' },
  { id: 'yesterday', label: 'Hôm qua' },
  { id: 'thisWeek', label: 'Tuần này' },
  { id: 'last7Days', label: '7 ngày qua' },
  { id: 'last30Days', label: '30 ngày qua' },
  { id: 'thisMonth', label: 'Tháng này' },
  { id: 'lastMonth', label: 'Tháng trước' },
  { id: 'custom', label: 'Tùy chỉnh khoảng...' }
] as const satisfies ReadonlyArray<ToolbarOption>;

const ENROLLMENT_TOOLBAR_TIME_GROUP_LABEL = 'Hành động';
const ENROLLMENT_TOOLBAR_TIME_PLACEHOLDER = 'action';
const DEFAULT_ENROLLMENT_ACTION_FIELD: EnrollmentTimeField = 'studyStartDate';

const formatDisplayDate = (value?: string) => {
  if (!value) return '--/--/----';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return decodeMojibakeText(value);
  return date.toLocaleDateString('vi-VN');
};

const normalizeText = (value?: string) =>
  decodeMojibakeText(String(value || ''))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const text = (value?: string) => decodeMojibakeText(value || '');
const notify = (value?: string) => window.alert(text(value));
const PROCESSING_NOTE_RULES: Array<{ keyword: string; label: string }> = [
  { keyword: 'tam dung', label: 'Tạm dừng' },
  { keyword: 'bao luu', label: 'Bảo lưu' },
  { keyword: 'chuyen lop', label: 'Chuyển lớp' },
  { keyword: 'hoc lai', label: 'Học lại' },
  { keyword: 'sai lop', label: 'Sai lớp' }
];

const detectEnrollmentMarket = (...values: Array<string | undefined>) => {
  const normalized = normalizeText(values.filter(Boolean).join(' '));
  if (!normalized) return '';
  if (['duc', 'german', 'deutsch'].some((keyword) => normalized.includes(keyword))) return 'Đức';
  if (['trung', 'china', 'chinese', 'hsk'].some((keyword) => normalized.includes(keyword))) return 'Trung';
  return '';
};

const extractEnrollmentPrograms = (...values: Array<string | undefined>) => {
  const normalized = normalizeText(values.filter(Boolean).join(' '));
  return ENROLLMENT_PROGRAM_OPTIONS.filter((program) => normalized.includes(program.toLowerCase()));
};

const formatEnrollmentProgramLabel = (values: EnrollmentProgramValue[]) => values.join(' / ');

const Contracts: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEnrollBySales =
    user?.role === UserRole.SALES_REP ||
    user?.role === UserRole.SALES_LEADER ||
    user?.role === UserRole.ADMIN ||
    user?.role === UserRole.FOUNDER;

  const [admissions, setAdmissions] = useState<IAdmission[]>([]);
  const [students, setStudents] = useState<IStudent[]>([]);
  const [quotations, setQuotations] = useState<IQuotation[]>([]);
  const [classStudents, setClassStudents] = useState<IClassStudent[]>([]);
  const [classes, setClasses] = useState<ITrainingClass[]>([]);
  const [contracts, setContracts] = useState<IContract[]>([]);
  const [teachers, setTeachers] = useState<ITeacher[]>([]);
  const [salesTeams, setSalesTeams] = useState<ISalesTeam[]>([]);
  const [claims, setClaims] = useState<IStudentClaim[]>([]);
  const [activeTab, setActiveTab] = useState<EnrollmentTabKey>('all');
  const [search, setSearch] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timeFilterField, setTimeFilterField] = useState<EnrollmentTimeFieldSelection>(ENROLLMENT_TOOLBAR_TIME_PLACEHOLDER);
  const [timeRangeType, setTimeRangeType] = useState<(typeof ENROLLMENT_TOOLBAR_TIME_PRESETS)[number]['id']>('all');
  const [customRange, setCustomRange] = useState<CustomDateRange | null>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [selectedAdvancedFilterFields, setSelectedAdvancedFilterFields] = useState<EnrollmentAdvancedFieldKey[]>([]);
  const [selectedAdvancedFilterValue, setSelectedAdvancedFilterValue] = useState('');
  const [selectedAdvancedGroupFields, setSelectedAdvancedGroupFields] = useState<EnrollmentAdvancedGroupFieldKey[]>([]);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedEnrollRow, setSelectedEnrollRow] = useState<StudentEnrollmentRow | null>(null);
  const [selectedAssignRow, setSelectedAssignRow] = useState<StudentEnrollmentRow | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);
  const [form, setForm] = useState({
    studentId: '',
    quotationId: '',
    campusId: text('HÃ  Ná»™i'),
    classId: '',
    classCode: '',
    note: ''
  });
  const [assignForm, setAssignForm] = useState({ campusId: text('HÃ  Ná»™i'), classId: '', classCode: '', note: '' });

  const loadData = () => {
    setAdmissions(getAdmissions());
    setStudents(getStudents());
    setQuotations(getQuotations());
    setClassStudents(getClassStudents());
    setClasses(getTrainingClasses());
    setContracts(getContracts());
    setTeachers(getTeachers());
    setSalesTeams(getSalesTeams());
    setClaims(getStudentClaims());
  };

  useEffect(() => {
    loadData();
    const events = [
      'educrm:admissions-changed',
      'educrm:students-changed',
      'educrm:quotations-changed',
      'educrm:class-students-changed',
      'educrm:training-classes-changed',
      'educrm:contracts-changed',
      'educrm:sales-teams-changed',
      'educrm:student-claims-changed'
    ] as const;
    events.forEach((eventName) => window.addEventListener(eventName, loadData as EventListener));
    return () => events.forEach((eventName) => window.removeEventListener(eventName, loadData as EventListener));
  }, []);

  useEffect(() => {
    if (!showActionMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setShowActionMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showActionMenu]);

  const activeClasses = useMemo(
    () => classes.filter((item) => item.status === 'ACTIVE').sort((left, right) => left.code.localeCompare(right.code)),
    [classes]
  );

  const salesOwnerLookup = useMemo(() => {
    const lookup = new Map<string, string>();

    salesTeams.forEach((team) => {
      team.members.forEach((member) => {
        const memberId = String(member.userId || '').trim();
        const memberName = text(member.name).trim();
        if (memberId && memberName) {
          lookup.set(memberId, memberName);
        }
      });
    });

    if (user?.id && user.name) {
      lookup.set(user.id, text(user.name).trim());
    }

    return lookup;
  }, [salesTeams, user?.id, user?.name]);

  const studentRows = useMemo<StudentEnrollmentRow[]>(() => {
    const now = Date.now();

    const resolveStudentStatus = (
      student: IStudent,
      latestAdmission: IAdmission | undefined,
      currentClassStudent: IClassStudent | undefined,
      currentClass: ITrainingClass | undefined,
      lockedQuotation: IQuotation | undefined
    ): StudentLifecycleStatus => {
      if (student.status === StudentStatus.RESERVED || currentClassStudent?.status === 'BAO_LUU') return 'TAM_DUNG';
      if (student.status === StudentStatus.DONE || currentClass?.status === 'DONE') return 'HOAN_THANH';
      if (student.status === StudentStatus.DROPPED) return 'DUNG';
      if (student.enrollmentStatus === 'DA_GHI_DANH' || student.status === StudentStatus.ENROLLED) {
        const startDate = currentClass?.startDate ? new Date(currentClass.startDate).getTime() : NaN;
        if (!Number.isNaN(startDate) && startDate > now) return 'DA_GHI_DANH';
        return 'DANG_HOC';
      }
      if (latestAdmission?.status === 'CHO_DUYET' || lockedQuotation || latestAdmission) return 'CHO_GHI_DANH';
      return 'MOI_TAO';
    };

    return students
      .map((student) => {
        const lockedQuotation =
          quotations.find((item) => item.status === QuotationStatus.LOCKED && quotationLinksToStudent(item, student)) ||
          quotations.find((item) => item.id === student.soId && item.status === QuotationStatus.LOCKED);
        const studentAdmissions = admissions
          .filter((item) => item.studentId === student.id)
          .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
        const latestAdmission = studentAdmissions[0];
        const history = classStudents
          .filter((item) => item.studentId === student.id)
          .sort((left, right) => right.createdAt - left.createdAt);
        const currentClassStudent =
          history.find((item) => item.classId === student.classId || item.classId === student.className) || history[0];
        const currentClass =
          classes.find((item) => item.id === currentClassStudent?.classId || item.code === currentClassStudent?.classId) ||
          ((student.enrollmentStatus === 'DA_GHI_DANH' || student.status === StudentStatus.ENROLLED) &&
          (student.classId || student.className)
            ? classes.find((item) => item.id === student.classId || item.code === student.classId || item.code === student.className)
            : undefined);
        const contract =
          (lockedQuotation ? contracts.find((item) => item.quotationId === lockedQuotation.id) : undefined) ||
          contracts.find((item) => item.studentId === student.id);
        const studentClaims = claims
          .filter((item) => item.studentId === student.id)
          .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
        const latestClaim = studentClaims[0];
        const activeClaim = studentClaims.find((item) => item.claimStatus === 'CHO_XU_LY');
        const teacher = teachers.find((item) => item.id === currentClass?.teacherId);
        const desiredCampus = latestAdmission?.campusId || student.campus || '--';
        const campusName = currentClass?.campus || desiredCampus || '--';
        const currentClassLabel =
          currentClass?.code ||
          currentClassStudent?.classId ||
          latestAdmission?.classId ||
          ((student.enrollmentStatus === 'DA_GHI_DANH' || student.status === StudentStatus.ENROLLED) ? student.className || '--' : '--');
        const quotationLinePrograms = (lockedQuotation?.lineItems || [])
          .flatMap((item) => [item.courseName, item.name, ...(item.programs || [])])
          .filter(Boolean)
          .join(' ');
        const quotationTargetMarkets = (lockedQuotation?.lineItems || [])
          .map((item) => item.targetMarket)
          .filter(Boolean)
          .join(' ');
        const salesOwnerName =
          text(
            lockedQuotation?.salespersonName ||
              (student.salesPersonId ? salesOwnerLookup.get(student.salesPersonId) : '') ||
              (lockedQuotation?.saleConfirmedBy ? salesOwnerLookup.get(lockedQuotation.saleConfirmedBy) : '') ||
              (lockedQuotation?.createdBy ? salesOwnerLookup.get(lockedQuotation.createdBy) : '') ||
              (latestAdmission?.createdBy ? salesOwnerLookup.get(latestAdmission.createdBy) : '') ||
              student.salesPersonId ||
              lockedQuotation?.saleConfirmedBy ||
              lockedQuotation?.createdBy ||
              latestAdmission?.createdBy ||
              '--'
          ).trim() || '--';
        const interestedProductName =
          text(
            lockedQuotation?.product ||
              currentClass?.name ||
              student.level ||
              currentClass?.level ||
              '--'
          ).trim() || '--';
        const marketLabel =
          detectEnrollmentMarket(
            lockedQuotation?.country,
            lockedQuotation?.targetCountry,
            lockedQuotation?.product,
            quotationTargetMarkets,
            currentClass?.language,
            student.level,
            currentClass?.code
          ) || '';
        const programLabels = extractEnrollmentPrograms(
          lockedQuotation?.product,
          quotationLinePrograms,
          currentClass?.level,
          currentClass?.code,
          student.level
        );
        const programDisplayLabel = formatEnrollmentProgramLabel(programLabels);
        const studentStatusKey = resolveStudentStatus(student, latestAdmission, currentClassStudent, currentClass, lockedQuotation);
        const admissionStatusKey: AdmissionDisplayStatus =
          latestAdmission?.status === 'DA_DUYET'
            ? 'DA_DUYET'
            : latestAdmission?.status === 'CHO_DUYET'
              ? 'CHO_DUYET'
              : 'CHUA_TAO';
        const claimStatusKey: StudentClaimStatus = latestClaim?.claimStatus || 'KHONG_CO';
        const debtStatusKey = currentClassStudent?.debtStatus;
        const classStatusKey = currentClass?.status;
        const canEnroll =
          !!lockedQuotation &&
          student.enrollmentStatus !== 'DA_GHI_DANH' &&
          latestAdmission?.status !== 'CHO_DUYET';
        const canCancelAdmission = latestAdmission?.status === 'CHO_DUYET';
        const processingReasons = Array.from(
          new Set([
            ...(activeClaim ? [`Claim: ${CLAIM_TYPE_LABELS[activeClaim.claimType] || activeClaim.claimType}`] : []),
            ...PROCESSING_NOTE_RULES.filter(({ keyword }) =>
              normalizeText([activeClaim?.note, latestAdmission?.note, currentClassStudent?.status].filter(Boolean).join(' ')).includes(keyword)
            ).map(({ label }) => label)
          ])
        );

        if (!lockedQuotation && !latestAdmission && student.enrollmentStatus !== 'DA_GHI_DANH') return null;

        return {
          student,
          lockedQuotation,
          latestAdmission,
          latestClaim,
          activeClaim,
          currentClassStudent,
          currentClass,
          contract,
          teacher,
          desiredCampus,
          campusName,
          currentClassLabel,
          marketLabel,
          salesOwnerName,
          interestedProductName,
          programLabels,
          programDisplayLabel,
          studentStatusKey,
          studentStatusLabel: STUDENT_STATUS_LABELS[studentStatusKey],
          admissionStatusKey,
          admissionStatusLabel: ADMISSION_STATUS_LABELS[admissionStatusKey],
          claimStatusKey,
          claimStatusLabel: CLAIM_STATUS_LABELS[claimStatusKey],
          debtStatusKey,
          debtStatusLabel: debtStatusKey ? DEBT_STATUS_LABELS[debtStatusKey] : '',
          classStatusKey,
          classStatusLabel: classStatusKey ? CLASS_STATUS_LABELS[classStatusKey] : '',
          studyStartDateValue: currentClassStudent?.startDate || currentClass?.startDate || student.admissionDate,
          expectedEndDateValue: currentClass?.endDate,
          admissionApprovedAtValue:
            latestAdmission?.approvedAt ||
            latestAdmission?.updatedAt ||
            (latestAdmission?.status === 'DA_DUYET' ? latestAdmission?.createdAt : ''),
          claimCreatedAtValue: activeClaim?.createdAt || latestClaim?.createdAt,
          canEnroll,
          canCancelAdmission,
          needsProcessing: processingReasons.length > 0 || !!activeClaim,
          processingReasons
        };
      })
      .filter(Boolean) as StudentEnrollmentRow[];
  }, [admissions, claims, classStudents, classes, contracts, quotations, salesOwnerLookup, students, teachers]);

  const tabCounts = useMemo(() => {
    const next = {
      waiting_enrollment: 0,
      waiting_approval: 0,
      enrolled: 0,
      processing: 0,
      students: 0,
      all: studentRows.length
    } as Record<EnrollmentTabKey, number>;

    studentRows.forEach((row) => {
      if (row.needsProcessing) next.processing += 1;
      if (row.needsProcessing) next.students += 1;
      if (row.admissionStatusKey === 'CHO_DUYET') next.waiting_approval += 1;
      else if (['DA_GHI_DANH', 'DANG_HOC', 'TAM_DUNG', 'HOAN_THANH'].includes(row.studentStatusKey)) next.enrolled += 1;
      else next.waiting_enrollment += 1;
    });

    return next;
  }, [studentRows]);

  const canAssignClass = (row: StudentEnrollmentRow) =>
    row.admissionStatusKey === 'DA_DUYET' || ['DA_GHI_DANH', 'DANG_HOC', 'TAM_DUNG'].includes(row.studentStatusKey);

  const selectedAdvancedFilterOptions = useMemo(
    () =>
      selectedAdvancedFilterFields
        .map((fieldId) => ENROLLMENT_TOOLBAR_FILTER_OPTIONS.find((option) => option.id === fieldId))
        .filter((option): option is (typeof ENROLLMENT_TOOLBAR_FILTER_OPTIONS)[number] => Boolean(option)),
    [selectedAdvancedFilterFields]
  );
  const activeAdvancedFilterField = selectedAdvancedFilterOptions[0] || null;
  const resolvedTimeFilterField =
    timeFilterField === ENROLLMENT_TOOLBAR_TIME_PLACEHOLDER ? DEFAULT_ENROLLMENT_ACTION_FIELD : timeFilterField;

  const getRowTimeFieldValue = (
    row: StudentEnrollmentRow,
    fieldId: EnrollmentTimeField = resolvedTimeFilterField
  ) => {
    switch (fieldId) {
      case 'expectedEndDate':
        return row.expectedEndDateValue;
      case 'admissionApprovedAt':
        return row.admissionApprovedAtValue;
      case 'claimCreatedAt':
        return row.claimCreatedAtValue;
      case 'studyStartDate':
      default:
        return row.studyStartDateValue;
    }
  };

  const getAdvancedFieldValues = (
    row: StudentEnrollmentRow,
    fieldId: EnrollmentAdvancedFieldKey | EnrollmentAdvancedGroupFieldKey
  ) => {
    switch (fieldId) {
      case 'market':
        return row.marketLabel ? [row.marketLabel] : [];
      case 'campus':
        return row.campusName && row.campusName !== '--' ? [row.campusName] : [];
      case 'owner':
        return row.salesOwnerName && row.salesOwnerName !== '--' ? [row.salesOwnerName] : [];
      case 'product':
        return row.interestedProductName && row.interestedProductName !== '--' ? [row.interestedProductName] : [];
      case 'program':
        return row.programLabels;
      case 'admissionStatus':
        return row.admissionStatusLabel ? [row.admissionStatusLabel] : [];
      case 'claimStatus':
        return row.claimStatusLabel ? [row.claimStatusLabel] : [];
      case 'debtStatus':
        return row.debtStatusLabel ? [row.debtStatusLabel] : [];
      case 'classStatus':
        return row.classStatusLabel ? [row.classStatusLabel] : [];
      default:
        return [];
    }
  };

  const getAdvancedFieldEmptyLabel = (
    fieldId: EnrollmentAdvancedFieldKey | EnrollmentAdvancedGroupFieldKey
  ) => {
    switch (fieldId) {
      case 'market':
        return 'Khác';
      case 'campus':
        return 'Chưa có cơ sở';
      case 'owner':
        return 'Chưa phân công';
      case 'product':
        return 'Chưa có sản phẩm';
      case 'program':
        return 'Chưa có chương trình';
      case 'debtStatus':
        return 'Chưa phát sinh công nợ';
      case 'classStatus':
        return 'Chưa có lớp';
      default:
        return 'Chưa có dữ liệu';
    }
  };

  const formatAdvancedFieldValue = (
    fieldId: EnrollmentAdvancedFieldKey | EnrollmentAdvancedGroupFieldKey,
    value: string
  ) => value || getAdvancedFieldEmptyLabel(fieldId);

  const getAdvancedFieldDisplayValue = (
    row: StudentEnrollmentRow,
    fieldId: EnrollmentAdvancedFieldKey | EnrollmentAdvancedGroupFieldKey
  ) => {
    const values = getAdvancedFieldValues(row, fieldId);
    if (!values.length) return '';
    if (fieldId === 'program') {
      return formatEnrollmentProgramLabel(values as EnrollmentProgramValue[]);
    }
    return values.join(' / ');
  };

  const getPresetAdvancedFilterValues = (
    fieldId: EnrollmentAdvancedFieldKey
  ): string[] => {
    switch (fieldId) {
      case 'market':
        return [...ENROLLMENT_MARKET_OPTIONS];
      case 'program':
        return [...ENROLLMENT_PROGRAM_OPTIONS];
      case 'admissionStatus':
        return ENROLLMENT_ADMISSION_STATUS_ORDER.map((status) => ADMISSION_STATUS_LABELS[status]);
      case 'claimStatus':
        return ENROLLMENT_CLAIM_STATUS_ORDER.map((status) => CLAIM_STATUS_LABELS[status]);
      case 'debtStatus':
        return ENROLLMENT_DEBT_STATUS_ORDER.map((status) => DEBT_STATUS_LABELS[status]);
      case 'classStatus':
        return ENROLLMENT_CLASS_STATUS_ORDER.map((status) => CLASS_STATUS_LABELS[status]);
      default:
        return [];
    }
  };

  const sortSelectableValues = (fieldId: EnrollmentAdvancedFieldKey, values: string[]) => {
    const sortByOrder = (orderedValues: string[]) => {
      const orderLookup = new Map(orderedValues.map((value, index) => [value, index]));
      return [...values].sort((left, right) => {
        const leftOrder = orderLookup.get(left) ?? Number.MAX_SAFE_INTEGER;
        const rightOrder = orderLookup.get(right) ?? Number.MAX_SAFE_INTEGER;
        if (leftOrder !== rightOrder) return leftOrder - rightOrder;
        return left.localeCompare(right, 'vi');
      });
    };

    switch (fieldId) {
      case 'market':
        return sortByOrder([...ENROLLMENT_MARKET_OPTIONS]);
      case 'program':
        return sortByOrder([...ENROLLMENT_PROGRAM_OPTIONS]);
      case 'admissionStatus':
        return sortByOrder(ENROLLMENT_ADMISSION_STATUS_ORDER.map((status) => ADMISSION_STATUS_LABELS[status]));
      case 'claimStatus':
        return sortByOrder(ENROLLMENT_CLAIM_STATUS_ORDER.map((status) => CLAIM_STATUS_LABELS[status]));
      case 'debtStatus':
        return sortByOrder(ENROLLMENT_DEBT_STATUS_ORDER.map((status) => DEBT_STATUS_LABELS[status]));
      case 'classStatus':
        return sortByOrder(ENROLLMENT_CLASS_STATUS_ORDER.map((status) => CLASS_STATUS_LABELS[status]));
      default:
        return [...values].sort((left, right) => left.localeCompare(right, 'vi'));
    }
  };

  const advancedFilterSelectableValues = useMemo<ReadonlyArray<ToolbarValueOption>>(() => {
    if (!activeAdvancedFilterField) return [];

    const fieldId = activeAdvancedFilterField.id as EnrollmentAdvancedFieldKey;
    const derivedValues = studentRows.flatMap((row) => getAdvancedFieldValues(row, fieldId));

    return sortSelectableValues(
      fieldId,
      Array.from(new Set([...getPresetAdvancedFilterValues(fieldId), ...derivedValues].filter(Boolean)))
    ).map((value) => ({
      value,
      label: formatAdvancedFieldValue(fieldId, value)
    }));
  }, [activeAdvancedFilterField, studentRows]);

  const toggleAdvancedFieldSelection = (
    type: 'filter' | 'group',
    fieldId: EnrollmentAdvancedFieldKey | EnrollmentAdvancedGroupFieldKey
  ) => {
    if (type === 'filter') {
      setSelectedAdvancedFilterValue('');
      setSelectedAdvancedFilterFields((prev) =>
        prev.includes(fieldId as EnrollmentAdvancedFieldKey) ? [] : [fieldId as EnrollmentAdvancedFieldKey]
      );
      return;
    }

    setSelectedAdvancedGroupFields((prev) =>
      prev.includes(fieldId as EnrollmentAdvancedGroupFieldKey)
        ? prev.filter((item) => item !== fieldId)
        : [...prev, fieldId as EnrollmentAdvancedGroupFieldKey]
    );
  };

  const filteredRows = useMemo(() => {
    const byTab = studentRows.filter((row) => {
      if (activeTab === 'students') {
        return row.needsProcessing;
      }
      if (activeTab === 'processing') return row.needsProcessing;
      if (activeTab === 'waiting_approval') return row.admissionStatusKey === 'CHO_DUYET';
      if (activeTab === 'enrolled') return ['DA_GHI_DANH', 'DANG_HOC', 'TAM_DUNG', 'HOAN_THANH'].includes(row.studentStatusKey);
      if (activeTab === 'waiting_enrollment') {
        return row.admissionStatusKey !== 'CHO_DUYET' && !['DANG_HOC', 'TAM_DUNG', 'HOAN_THANH'].includes(row.studentStatusKey);
      }
      return true;
    });

    return byTab.filter((row) => {
      const query = normalizeText(search.trim());
      const searchMatch =
        !query ||
        [
          row.student.code,
          row.student.name,
          row.student.phone,
          row.student.email,
          row.lockedQuotation?.soCode,
          row.lockedQuotation?.product,
          row.marketLabel,
          row.campusName,
          row.salesOwnerName,
          row.interestedProductName,
          row.programDisplayLabel,
          row.currentClassLabel,
          row.currentClass?.level,
          row.teacher?.fullName,
          row.studentStatusLabel,
          row.admissionStatusLabel,
          row.claimStatusLabel,
          row.debtStatusLabel,
          row.classStatusLabel,
          row.processingReasons.join(' ')
        ]
          .map(normalizeText)
          .join(' ')
          .includes(query);

      if (timeRangeType !== 'all' && !doesDateMatchTimeRange(getRowTimeFieldValue(row), timeRangeType, customRange)) {
        return false;
      }

      if (
        activeAdvancedFilterField &&
        selectedAdvancedFilterValue &&
        !getAdvancedFieldValues(row, activeAdvancedFilterField.id as EnrollmentAdvancedFieldKey).includes(selectedAdvancedFilterValue)
      ) {
        return false;
      }

      return searchMatch;
    }).sort((left, right) => {
      if (selectedAdvancedGroupFields.length > 0) {
        const leftGroup = selectedAdvancedGroupFields
          .map((fieldId) => getAdvancedFieldDisplayValue(left, fieldId))
          .join('||');
        const rightGroup = selectedAdvancedGroupFields
          .map((fieldId) => getAdvancedFieldDisplayValue(right, fieldId))
          .join('||');
        const groupCompare = leftGroup.localeCompare(rightGroup, 'vi');
        if (groupCompare !== 0) return groupCompare;
      }
      return left.student.code.localeCompare(right.student.code, 'vi');
    });
  }, [
    activeAdvancedFilterField,
    activeTab,
    customRange,
    search,
    selectedAdvancedFilterValue,
    selectedAdvancedGroupFields,
    studentRows,
    timeRangeType
  ]);

  const groupedRows = useMemo(() => {
    if (!selectedAdvancedGroupFields.length) {
      return [{ key: 'all', label: `Táº¥t cáº£ (${filteredRows.length})`, rows: filteredRows }];
    }

    const buildGroups = (
      rows: StudentEnrollmentRow[],
      fields: EnrollmentAdvancedGroupFieldKey[],
      path: string[] = [],
      keyPath: string[] = []
    ) => {
      if (!fields.length) {
        const label = `${path.join(' / ')} (${rows.length})`;
        return [{ key: keyPath.join('||') || 'all', label, rows }];
      }

      const [currentField, ...restFields] = fields;
      const groups = new Map<string, StudentEnrollmentRow[]>();
      const fieldLabel =
        ENROLLMENT_TOOLBAR_GROUP_OPTIONS.find((option) => option.id === currentField)?.label || currentField;

      rows.forEach((row) => {
        const key = getAdvancedFieldDisplayValue(row, currentField);
        groups.set(key, [...(groups.get(key) || []), row]);
      });

      return Array.from(groups.entries())
        .sort((left, right) => left[0].localeCompare(right[0]))
        .flatMap(([key, nestedRows]) =>
          buildGroups(
            nestedRows,
            restFields,
            [...path, `${fieldLabel}: ${formatAdvancedFieldValue(currentField, key)}`],
            [...keyPath, `${fieldLabel}:${formatAdvancedFieldValue(currentField, key)}`]
          )
        );
    };

    return buildGroups(filteredRows, selectedAdvancedGroupFields);
  }, [filteredRows, selectedAdvancedGroupFields]);

  const filteredRowIds = useMemo(() => filteredRows.map((row) => row.student.id), [filteredRows]);
  const selectedRows = useMemo(
    () => studentRows.filter((row) => selectedStudentIds.includes(row.student.id)),
    [selectedStudentIds, studentRows]
  );
  const allFilteredSelected = filteredRowIds.length > 0 && filteredRowIds.every((id) => selectedStudentIds.includes(id));

  const campusOptions = useMemo(() => {
    const source = new Set<string>();
    studentRows.forEach((row) => {
      if (row.campusName && row.campusName !== '--') source.add(row.campusName);
    });
    return Array.from(source).sort();
  }, [studentRows]);

  const advancedToolbarActiveCount =
    selectedAdvancedGroupFields.length + (selectedAdvancedFilterValue ? 1 : 0);
  const hasAdvancedToolbarFilters =
    selectedAdvancedGroupFields.length > 0 || Boolean(selectedAdvancedFilterValue);

  const clearAllFilters = () => {
    setSearch('');
    setShowTimePicker(false);
    setTimeFilterField(ENROLLMENT_TOOLBAR_TIME_PLACEHOLDER);
    setTimeRangeType('all');
    setCustomRange(null);
    setShowFilterDropdown(false);
    setSelectedAdvancedFilterFields([]);
    setSelectedAdvancedFilterValue('');
    setSelectedAdvancedGroupFields([]);
  };

  const handleTimeFilterOpenChange = (nextOpen: boolean) => {
    setShowFilterDropdown(false);
    setShowTimePicker(nextOpen);
  };

  const handleTimeFilterFieldChange = (fieldId: string) => {
    setShowFilterDropdown(false);
    setShowTimePicker(false);
    setTimeFilterField(fieldId as EnrollmentTimeFieldSelection);
  };

  const handleTimePresetSelect = (presetId: string) => {
    setTimeRangeType(presetId as (typeof ENROLLMENT_TOOLBAR_TIME_PRESETS)[number]['id']);
    if (presetId !== 'custom') {
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
    setShowTimePicker(false);
    setShowFilterDropdown(nextOpen);
  };

  const findActiveClass = (value?: string) => {
    const normalizedValue = normalizeText(value?.trim());
    if (!normalizedValue) return undefined;
    return activeClasses.find(
      (item) => normalizeText(item.id) === normalizedValue || normalizeText(item.code) === normalizedValue
    );
  };
  const activeClassCampusOptions = useMemo(
    () => Array.from(new Set(activeClasses.map((item) => item.campus).filter(Boolean) as string[])).sort(),
    [activeClasses]
  );
  const desiredClassOptions = useMemo(
    () => activeClasses.filter((item) => !form.campusId || item.campus === form.campusId),
    [activeClasses, form.campusId]
  );
  const assignClassOptions = useMemo(
    () => activeClasses.filter((item) => !assignForm.campusId || item.campus === assignForm.campusId),
    [activeClasses, assignForm.campusId]
  );

  const selectedDesiredClass = useMemo(
    () => findActiveClass(form.classId) || findActiveClass(form.classCode),
    [activeClasses, form.classCode, form.classId]
  );
  const selectedAssignClass = useMemo(
    () => findActiveClass(assignForm.classId) || findActiveClass(assignForm.classCode),
    [activeClasses, assignForm.classCode, assignForm.classId]
  );
  const getEligibilityErrorMessage = (targetStudents: IStudent[], targetClass: ITrainingClass) => {
    const invalidStudents = targetStudents
      .map((student) => ({
        student,
        eligibility: getStudentClassEligibility(student, targetClass, quotations)
      }))
      .filter((item) => !item.eligibility.ok);

    if (!invalidStudents.length) return '';
    if (invalidStudents.length === 1) {
      return invalidStudents[0].eligibility.reason || `Học viên ${invalidStudents[0].student.name} không phù hợp với lớp ${targetClass.code}`;
    }
    return `Có ${invalidStudents.length} học viên không khớp chương trình với lớp ${targetClass.code}: ${invalidStudents.map((item) => item.student.name).join(', ')}`;
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setSelectedEnrollRow(null);
    setForm({
      studentId: '',
      quotationId: '',
      campusId: activeClassCampusOptions[0] || text('HÃ  Ná»™i'),
      classId: '',
      classCode: '',
      note: ''
    });
  };

  const closeAssignModal = () => {
    setShowAssignModal(false);
    setSelectedAssignRow(null);
    setAssignForm({ campusId: activeClassCampusOptions[0] || text('HÃ  Ná»™i'), classId: '', classCode: '', note: '' });
  };

  const admissionEligibleStudents = useMemo(
    () => studentRows.filter((row) => row.canEnroll && row.lockedQuotation).map((row) => row.student),
    [studentRows]
  );

  const linkedQuotationsForStudent = useMemo(() => {
    if (!form.studentId) return [];
    const selectedStudent = students.find((item) => item.id === form.studentId);
    if (!selectedStudent) return [];
    return quotations.filter((item) => item.status === QuotationStatus.LOCKED && quotationLinksToStudent(item, selectedStudent));
  }, [form.studentId, quotations, students]);

  const onStudentChange = (studentId: string) => {
    const selectedStudent = students.find((item) => item.id === studentId);
    const studentQuotations = selectedStudent
      ? quotations.filter((item) => item.status === QuotationStatus.LOCKED && quotationLinksToStudent(item, selectedStudent))
      : [];
    setForm((prev) => ({
      ...prev,
      studentId,
      quotationId: studentQuotations[0]?.id || '',
      campusId: selectedStudent?.campus || prev.campusId,
      classId: '',
      classCode: ''
    }));
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds((prev) => (
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    ));
  };

  const toggleSelectAllFiltered = () => {
    setSelectedStudentIds((prev) => {
      if (allFilteredSelected) {
        return prev.filter((id) => !filteredRowIds.includes(id));
      }
      return Array.from(new Set([...prev, ...filteredRowIds]));
    });
  };

  const openEnroll = (row?: StudentEnrollmentRow) => {
    if (!canEnrollBySales) {
      notify('Chá»‰ Sale/Admin Ä‘Æ°á»£c táº¡o ghi danh');
      return;
    }
    setSelectedEnrollRow(row || null);
    const initialClass = findActiveClass(row?.currentClass?.id || row?.currentClass?.code);
    setForm({
      studentId: row?.student.id || '',
      quotationId: row?.lockedQuotation?.id || '',
      campusId: initialClass?.campus || row?.desiredCampus || row?.student.campus || activeClassCampusOptions[0] || text('HÃ  Ná»™i'),
      classId: initialClass?.id || '',
      classCode: initialClass?.code || '',
      note: ''
    });
    setShowCreateModal(true);
  };

  const handleCreate = () => {
    if (!canEnrollBySales) {
      notify('Chá»‰ Sale/Admin Ä‘Æ°á»£c táº¡o ghi danh');
      return;
    }
    const targetStudentId = selectedEnrollRow?.student.id || form.studentId;
    if (!targetStudentId) {
      notify('KhÃ´ng tÃ¬m tháº¥y há»c viÃªn Ä‘á»ƒ ghi danh');
      return;
    }
    if (!selectedDesiredClass) {
      notify('Vui lÃ²ng chá»n há»c viÃªn, cÆ¡ sá»Ÿ vÃ  lá»›p');
      return;
    }
    if (!form.quotationId) {
      notify('KhÃ´ng tÃ¬m tháº¥y SO Ä‘Ã£ khÃ³a Ä‘á»ƒ ghi danh');
      return;
    }
    const eligibilityError = getEligibilityErrorMessage([selectedEnrollRow?.student || students.find((item) => item.id === targetStudentId)].filter(Boolean) as IStudent[], selectedDesiredClass);
    if (eligibilityError) {
      notify(eligibilityError);
      return;
    }

    try {
      createAdmission({
        studentId: targetStudentId,
        quotationId: form.quotationId,
        classId: selectedDesiredClass.id,
        campusId: selectedDesiredClass.campus || form.campusId,
        note: form.note,
        createdBy: user?.id || 'system'
      });
      closeCreateModal();
      setActiveTab('waiting_approval');
      loadData();
      notify('ÄÃ£ táº¡o ghi danh vÃ  chuyá»ƒn sang tab Chá» duyá»‡t.');
    } catch (error: any) {
      notify(error?.message || 'KhÃ´ng thá»ƒ táº¡o ghi danh');
    }
  };

  const handleCancelAdmission = (row: StudentEnrollmentRow) => {
    if (!canEnrollBySales || !row.latestAdmission) {
      notify('Báº¡n khÃ´ng cÃ³ quyá»n há»§y ghi danh');
      return;
    }
    const result = cancelAdmission(row.latestAdmission.id, user?.id || 'system');
    if (!result.ok) {
      notify('KhÃ´ng thá»ƒ há»§y ghi danh nÃ y');
      return;
    }
    loadData();
    setActiveTab('waiting_enrollment');
    notify('ÄÃ£ há»§y ghi danh vÃ  chuyá»ƒn há»c viÃªn vá» tab Chá» ghi danh');
  };

  const submitSelectedEnroll = () => {
    if (!canEnrollBySales) {
      notify('Chá»‰ Sale/Admin Ä‘Æ°á»£c táº¡o ghi danh');
      return;
    }

    const targetRows = selectedEnrollRow
      ? [selectedEnrollRow]
      : selectedStudentIds.length
        ? selectedEnrollRows
        : studentRows.filter((row) => row.student.id === form.studentId && row.canEnroll && row.lockedQuotation);

    if (!targetRows.length) {
      notify('Vui lÃ²ng chá»n há»c viÃªn Ä‘á»ƒ ghi danh');
      return;
    }
    if (!selectedDesiredClass) {
      notify('Vui lÃ²ng chá»n lá»›p há»c mong muá»‘n tá»« danh sÃ¡ch tra cá»©u');
      return;
    }
    if (!selectedEnrollRow && !selectedStudentIds.length && !form.quotationId) {
      notify('KhÃ´ng tÃ¬m tháº¥y SO Ä‘Ã£ khÃ³a Ä‘á»ƒ ghi danh');
      return;
    }
    const eligibilityError = getEligibilityErrorMessage(targetRows.map((row) => row.student), selectedDesiredClass);
    if (eligibilityError) {
      notify(eligibilityError);
      return;
    }

    try {
      targetRows.forEach((row) => {
        createAdmission({
          studentId: row.student.id,
          quotationId: selectedEnrollRow || selectedStudentIds.length ? row.lockedQuotation?.id : form.quotationId,
          classId: selectedDesiredClass.id,
          campusId: selectedDesiredClass.campus || form.campusId,
          note: form.note,
          createdBy: user?.id || 'system'
        });
      });
      closeCreateModal();
      setSelectedStudentIds([]);
      setActiveTab('waiting_approval');
      loadData();
      if (selectedStudentIds.length) {
        const skippedCount = selectedStudentIds.length - targetRows.length;
        notify(
          skippedCount > 0
            ? `ÃÃ£ x? lÃ½ ${selectedStudentIds.length} h?c viÃªn dÃ£ ch?n. T?o admission cho ${targetRows.length} h?c viÃªn d? di?u ki?n, b? qua ${skippedCount} h?c viÃªn vÃ  chuy?n sang tab Ch? duy?t.`
            : `ÃÃ£ x? lÃ½ ghi danh cho ${selectedStudentIds.length} h?c viÃªn vÃ  chuy?n sang tab Ch? duy?t.`
        );
      } else {
        notify(`ÄÃ£ táº¡o ghi danh cho ${targetRows.length} há»c viÃªn vÃ  chuyá»ƒn sang tab Chá» duyá»‡t.`);
      }
    } catch (error: any) {
      notify(error?.message || 'KhÃ´ng thá»ƒ táº¡o ghi danh');
    }
  };

  const renderStudentStatusBadge = (status: StudentLifecycleStatus) => {
    const className =
      status === 'DANG_HOC'
        ? 'bg-emerald-100 text-emerald-700'
        : status === 'DA_GHI_DANH'
          ? 'bg-sky-100 text-sky-700'
          : status === 'CHO_GHI_DANH'
            ? 'bg-amber-100 text-amber-700'
            : status === 'TAM_DUNG'
              ? 'bg-orange-100 text-orange-700'
              : status === 'HOAN_THANH'
                ? 'bg-violet-100 text-violet-700'
                : status === 'DUNG'
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-slate-100 text-slate-700';

    return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${className}`}>{STUDENT_STATUS_LABELS[status]}</span>;
  };

  const renderAdmissionStatusBadge = (status: AdmissionDisplayStatus) => {
    const className =
      status === 'DA_DUYET'
        ? 'bg-emerald-100 text-emerald-700'
        : status === 'CHO_DUYET'
          ? 'bg-amber-100 text-amber-700'
          : 'bg-slate-100 text-slate-600';

    return <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${className}`}>{ADMISSION_STATUS_LABELS[status]}</span>;
  };

  const renderClaimStatusBadge = (status?: string) => {
    const className =
      status === 'CHO_XU_LY'
        ? 'bg-amber-100 text-amber-700'
        : status === 'DA_XU_LY'
          ? 'bg-emerald-100 text-emerald-700'
          : status === 'TU_CHOI'
            ? 'bg-rose-100 text-rose-700'
            : status === 'DA_HUY'
              ? 'bg-slate-100 text-slate-600'
              : 'bg-slate-100 text-slate-600';

    return <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${className}`}>{CLAIM_STATUS_LABELS[status || 'KHONG_CO'] || 'Không có'}</span>;
  };

  const selectedEnrollRows = useMemo(
    () => selectedRows.filter((row) => row.canEnroll && row.lockedQuotation),
    [selectedRows]
  );
  const selectedAssignableRows = useMemo(
    () => selectedRows.filter((row) => canAssignClass(row)),
    [selectedRows]
  );
  const selectedCancelableRows = useMemo(
    () => selectedRows.filter((row) => row.canCancelAdmission && row.latestAdmission),
    [selectedRows]
  );
  const isStudentTab = activeTab === 'students';
  const isClaimFocusedTab = activeTab === 'processing' || isStudentTab;
  const isBatchEnrollMode = !selectedEnrollRow && selectedStudentIds.length > 0;

  useEffect(() => {
    if (!selectedStudentIds.length) {
      setShowActionMenu(false);
    }
  }, [selectedStudentIds]);

  useEffect(() => {
    setShowActionMenu(false);
  }, [activeTab]);

  const openActionEnroll = () => {
    if (!canEnrollBySales) {
      notify('Chá»‰ Sale/Admin Ä‘Æ°á»£c táº¡o ghi danh');
      return;
    }
    if (!selectedStudentIds.length) {
      notify('Vui lÃ²ng chá»n Ã­t nháº¥t 1 há»c viÃªn');
      return;
    }
    if (!selectedEnrollRows.length) {
      notify('KhÃ´ng cÃ³ há»c viÃªn phÃ¹ há»£p Ä‘á»ƒ ghi danh trong danh sÃ¡ch Ä‘Ã£ chá»n');
      return;
    }
    setShowActionMenu(false);
    setSelectedEnrollRow(null);
    setForm({
      studentId: '',
      quotationId: '',
      campusId: activeClassCampusOptions[0] || text('HÃ  Ná»™i'),
      classId: '',
      classCode: '',
      note: ''
    });
    setShowCreateModal(true);
  };

  const handleCancelSelectedAdmissions = () => {
    if (!canEnrollBySales) {
      notify('Báº¡n khÃ´ng cÃ³ quyá»n há»§y ghi danh');
      return;
    }
    if (!selectedCancelableRows.length) {
      notify('KhÃ´ng cÃ³ há»“ sÆ¡ chá» duyá»‡t phÃ¹ há»£p Ä‘á»ƒ há»§y ghi danh');
      return;
    }

    let cancelledCount = 0;
    selectedCancelableRows.forEach((row) => {
      if (!row.latestAdmission) return;
      const result = cancelAdmission(row.latestAdmission.id, user?.id || 'system');
      if (result.ok) cancelledCount += 1;
    });

    setShowActionMenu(false);
    setSelectedStudentIds((prev) => prev.filter((id) => !selectedCancelableRows.some((row) => row.student.id === id)));
    loadData();

    if (!cancelledCount) {
      notify('KhÃ´ng thá»ƒ há»§y ghi danh cho danh sÃ¡ch Ä‘Ã£ chá»n');
      return;
    }

    setActiveTab('waiting_enrollment');
    notify(
      cancelledCount === 1
        ? 'ÄÃ£ há»§y ghi danh cho 1 há»c viÃªn vÃ  chuyá»ƒn vá» tab Chờ ghi danh'
        : `ÄÃ£ há»§y ghi danh cho ${cancelledCount} há»c viÃªn vÃ  chuyá»ƒn vá» tab Chờ ghi danh`
    );
  };

  const openActionAssign = () => {
    if (!selectedStudentIds.length) {
      notify('Vui lÃ²ng chá»n Ã­t nháº¥t 1 há»c viÃªn');
      return;
    }
    if (!selectedAssignableRows.length) {
      notify('KhÃ´ng cÃ³ há»c viÃªn phÃ¹ há»£p Ä‘á»ƒ gÃ¡n lá»›p trong danh sÃ¡ch Ä‘Ã£ chá»n');
      return;
    }
    setShowActionMenu(false);
    setSelectedAssignRow(null);
    setAssignForm({ campusId: activeClassCampusOptions[0] || text('HÃ  Ná»™i'), classId: '', classCode: '', note: '' });
    setShowAssignModal(true);
  };

  const openAssign = (row?: StudentEnrollmentRow) => {
    const initialValue = row?.latestAdmission?.classId || row?.currentClass?.id || row?.currentClass?.code || '';
    const initialClass = findActiveClass(initialValue);

    setSelectedAssignRow(row || null);
    setAssignForm({
      campusId: initialClass?.campus || row?.latestAdmission?.campusId || row?.student.campus || activeClassCampusOptions[0] || text('HÃ  Ná»™i'),
      classId: initialClass?.id || row?.latestAdmission?.classId || row?.currentClass?.id || '',
      classCode: initialClass?.code || row?.latestAdmission?.classId || row?.currentClass?.code || '',
      note: ''
    });
    setShowAssignModal(true);
  };

  const openStudentProfile = (studentId: string) => {
    navigate(`/contracts/students/${studentId}`);
  };

  const openStudentClaims = (studentId: string) => {
    navigate(`/contracts/students/${studentId}`);
  };

  const handleApproveAdmission = (row: StudentEnrollmentRow) => {
    if (!row.latestAdmission) {
      notify('KhÃ´ng tÃ¬m tháº¥y há»“ sÆ¡ chá» duyá»‡t');
      return;
    }

    const result = approveAdmission(row.latestAdmission.id, user?.id || 'training');
    if (!result.ok) {
      notify(result.error || 'KhÃ´ng thá»ƒ duyá»‡t ghi danh');
      return;
    }

    setSelectedStudentIds((prev) => prev.filter((id) => id !== row.student.id));
    loadData();
    notify(`ÄÃ£ duyá»‡t ghi danh cho ${row.student.name}.`);
  };

  const submitSelectedAssign = () => {
    if (!selectedAssignClass) {
      notify('Vui lÃ²ng chá»n lá»›p Ä‘Ã­ch tá»« danh sÃ¡ch tra cá»©u');
      return;
    }
    const targetRows = selectedAssignRow ? [selectedAssignRow] : selectedAssignableRows;
    if (!targetRows.length) {
      notify('KhÃ´ng cÃ³ há»c viÃªn phÃ¹ há»£p Ä‘á»ƒ gÃ¡n lá»›p');
      return;
    }
    const eligibilityError = getEligibilityErrorMessage(targetRows.map((row) => row.student), selectedAssignClass);
    if (eligibilityError) {
      notify(eligibilityError);
      return;
    }

    if (selectedAssignRow?.latestAdmission?.status === 'CHO_DUYET') {
      updateAdmission({
        ...selectedAssignRow.latestAdmission,
        classId: selectedAssignClass.id,
        campusId: selectedAssignClass.campus || selectedAssignRow.latestAdmission.campusId,
        note: assignForm.note
          ? [selectedAssignRow.latestAdmission.note, `Gán lớp chờ duyệt: ${assignForm.note}`].filter(Boolean).join('\n')
          : selectedAssignRow.latestAdmission.note,
        updatedAt: new Date().toISOString()
      });
      updateStudent({
        ...selectedAssignRow.student,
        campus: selectedAssignClass.campus || selectedAssignRow.student.campus,
        classId: selectedAssignClass.id,
        className: selectedAssignClass.code,
        note: assignForm.note
          ? [selectedAssignRow.student.note, `Gán lớp chờ duyệt: ${assignForm.note}`].filter(Boolean).join('\n')
          : selectedAssignRow.student.note
      });
      addStudentLog(
        selectedAssignRow.student.id,
        'ASSIGN_PENDING_CLASS',
        text(`Gán vào lớp ${selectedAssignClass.code}${assignForm.note ? `: ${assignForm.note}` : ''}`),
        user?.id || 'training',
        'SYSTEM'
      );
      closeAssignModal();
      loadData();
      notify(`ÄÃ£ cáº­p nháº­t lá»›p ${selectedAssignClass.code} cho há»“ sÆ¡ chá» duyá»‡t.`);
      return;
    }

    const targetClass = selectedAssignClass;
    try {
      targetRows.forEach((row) => {
        if (row.currentClassStudent?.classId) {
          transferStudentClass(row.student.id, row.currentClassStudent.classId, targetClass.id);
        } else {
          addStudentToClass(targetClass.id, row.student.id);
        }

        updateStudent({
          ...row.student,
          campus: targetClass.campus || row.student.campus,
          classId: targetClass.id,
          className: targetClass.code,
          enrollmentStatus: 'DA_GHI_DANH',
          status: StudentStatus.ENROLLED,
          note: assignForm.note ? [row.student.note, text(`GÃ¡n lá»›p hÃ ng loáº¡t: ${assignForm.note}`)].filter(Boolean).join('\n') : row.student.note
        });
        addStudentLog(row.student.id, 'BULK_ASSIGN_CLASS', text(`GÃ¡n vÃ o lá»›p ${targetClass.code}${assignForm.note ? `: ${assignForm.note}` : ''}`), user?.id || 'system', 'SYSTEM');
        addClassLog(targetClass.id, 'BULK_ASSIGN_CLASS', text(`GÃ¡n há»c viÃªn ${row.student.name} tá»« mÃ n danh sÃ¡ch`), user?.id || 'system');
      });
    } catch (error: any) {
      notify(error?.message || 'KhÃ´ng thá»ƒ gÃ¡n lá»›p');
      return;
    }
    closeAssignModal();
    setSelectedStudentIds([]);
    loadData();
    notify(`ÄÃ£ gÃ¡n lá»›p ${targetClass.code} cho ${targetRows.length} há»c viÃªn.`);
  };

  return decodeMojibakeReactNode(
    <div className="mx-auto max-w-7xl p-6 font-sans text-slate-800">
      <div className="mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Học viên</h1>
          <p className="mt-1 text-sm text-slate-500">5 tab dùng để phân loại hoặc đổi góc nhìn hồ sơ. Bộ lọc và group by phía dưới áp dụng chung cho toàn bộ dữ liệu.</p>
        </div>
      </div>

      <div className="mb-5 overflow-visible rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="flex flex-wrap items-center gap-2 xl:flex-none">
            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex min-h-[36px] items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[13px] font-semibold text-emerald-700 transition hover:bg-emerald-100"
            >
              <RotateCcw size={16} />
              Đặt lại
            </button>

            <ToolbarTimeFilter
              isOpen={showTimePicker}
              fieldOptions={ENROLLMENT_TOOLBAR_TIME_FIELD_OPTIONS}
              fieldPlaceholderValue={ENROLLMENT_TOOLBAR_TIME_PLACEHOLDER}
              fieldPlaceholderLabel={ENROLLMENT_TOOLBAR_TIME_GROUP_LABEL}
              selectedField={timeFilterField}
              selectedRangeType={timeRangeType}
              customRange={customRange}
              presets={ENROLLMENT_TOOLBAR_TIME_PRESETS}
              onOpenChange={handleTimeFilterOpenChange}
              onFieldChange={handleTimeFilterFieldChange}
              onPresetSelect={handleTimePresetSelect}
              onCustomRangeChange={setCustomRange}
              onReset={() => {
                setTimeFilterField(ENROLLMENT_TOOLBAR_TIME_PLACEHOLDER);
                setTimeRangeType('all');
                setCustomRange(null);
                setShowTimePicker(false);
              }}
              onCancel={() => setShowTimePicker(false)}
              onApplyCustomRange={handleApplyCustomTimeRange}
              controlClassName="min-h-[36px] rounded-xl border-slate-300 shadow-none"
              fieldSectionClassName="bg-white"
              fieldSelectClassName="text-[13px]"
              rangeButtonClassName="px-2.5 text-[13px]"
              panelAlign="left"
              className="shrink-0"
            />
          </div>

          <div className="relative xl:flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="TÃ¬m kiáº¿m theo mÃ£ há»c viÃªn, SO, chÆ°Æ¡ng trÃ¬nh, lá»›p..."
              className="h-9 w-full rounded-xl border border-slate-300 pl-10 pr-4 text-[13px] outline-none transition focus:border-slate-500"
            />
          </div>
          <AdvancedFilterDropdown
            isOpen={showFilterDropdown}
            activeCount={advancedToolbarActiveCount}
            hasActiveFilters={hasAdvancedToolbarFilters}
            filterOptions={ENROLLMENT_TOOLBAR_FILTER_OPTIONS}
            groupOptions={ENROLLMENT_TOOLBAR_GROUP_OPTIONS}
            selectedFilterFieldIds={selectedAdvancedFilterFields}
            selectedGroupFieldIds={selectedAdvancedGroupFields}
            activeFilterField={activeAdvancedFilterField}
            selectableValues={advancedFilterSelectableValues}
            selectedFilterValue={selectedAdvancedFilterValue}
            onOpenChange={handleAdvancedFilterOpenChange}
            onToggleFilterField={(fieldId) =>
              toggleAdvancedFieldSelection('filter', fieldId as EnrollmentAdvancedFieldKey)
            }
            onToggleGroupField={(fieldId) =>
              toggleAdvancedFieldSelection('group', fieldId as EnrollmentAdvancedGroupFieldKey)
            }
            onFilterValueChange={setSelectedAdvancedFilterValue}
            onClearAll={() => {
              setSelectedAdvancedFilterFields([]);
              setSelectedAdvancedFilterValue('');
              setSelectedAdvancedGroupFields([]);
            }}
            triggerLabel="Lọc nâng cao"
            filterDescription="Chọn 1 trường rồi chọn giá trị tương ứng để lọc nhanh danh sách học viên ghi danh."
            groupDescription="Có thể chọn nhiều trường. Thứ tự bấm sẽ là thứ tự ghép nhóm hiển thị trong bảng."
            triggerClassName="min-h-[36px] rounded-xl px-3 py-1.5 text-[13px] font-medium shadow-none"
            className="xl:flex-none"
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div className="text-xs font-medium text-slate-500">Äang hiá»ƒn thá»‹ {filteredRows.length} há»“ sÆ¡ sau khi lá»c.{selectedStudentIds.length ? ` ÄÃ£ chá»n ${selectedStudentIds.length} há»c viÃªn.` : ''}</div>
          {search.trim() || timeRangeType !== 'all' || hasAdvancedToolbarFilters ? (
            <button type="button" onClick={clearAllFilters} className="text-xs font-semibold text-blue-700 hover:text-blue-800">
              Đặt lại bộ lọc
            </button>
          ) : null}
        </div>
      </div>

      <div className="sticky top-0 z-20 mb-4 overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-end gap-2 border-b border-slate-200 px-4 pt-3">
          {TAB_CONFIG.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={[
                'inline-flex items-center gap-2 rounded-t-2xl border border-b-0 px-5 py-3 text-sm font-semibold transition',
                activeTab === tab.key
                  ? '-mb-px border-blue-200 bg-blue-50 text-blue-900'
                  : 'border-transparent bg-transparent text-slate-500 hover:text-slate-900'
              ].join(' ')}
            >
              <span>{tab.label}</span>
              <span className={['rounded-full px-2 py-0.5 text-[11px]', activeTab === tab.key ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'].join(' ')}>
                {tabCounts[tab.key]}
              </span>
            </button>
          ))}
          {!isClaimFocusedTab ? (
            <div ref={actionMenuRef} className="relative mb-2 ml-auto">
              <button
                type="button"
                aria-label={selectedStudentIds.length ? `Action cho ${selectedStudentIds.length} há»c viÃªn` : 'Action'}
                title={selectedStudentIds.length ? `Action cho ${selectedStudentIds.length} há»c viÃªn` : 'Action'}
                onClick={() => setShowActionMenu((prev) => !prev)}
                disabled={!selectedStudentIds.length}
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Settings size={18} className={showActionMenu ? 'rotate-90 transition' : 'transition'} />
                {selectedStudentIds.length ? (
                  <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-slate-900 px-1.5 py-0.5 text-center text-[10px] font-semibold text-white">
                    {selectedStudentIds.length}
                  </span>
                ) : null}
              </button>
              {showActionMenu ? (
                <div className="absolute right-0 top-full z-30 mt-2 w-52 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                  <button
                    onClick={openActionEnroll}
                    disabled={!canEnrollBySales || !selectedEnrollRows.length}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span>Tạo ghi danh</span>
                    <span className="text-xs text-slate-400">{selectedEnrollRows.length}</span>
                  </button>
                  <button
                    onClick={openActionAssign}
                    disabled={!selectedAssignableRows.length}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span>Gán lớp</span>
                    <span className="text-xs text-slate-400">{selectedAssignableRows.length}</span>
                  </button>
                  <button
                    onClick={handleCancelSelectedAdmissions}
                    disabled={!canEnrollBySales || !selectedCancelableRows.length}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span>Hủy ghi danh</span>
                    <span className="text-xs text-rose-300">{selectedCancelableRows.length}</span>
                  </button>
                  {!selectedEnrollRows.length && !selectedAssignableRows.length && !selectedCancelableRows.length ? (
                    <div className="px-3 py-2 text-xs text-slate-400">Danh sách đã chọn chưa có thao tác phù hợp.</div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="space-y-4">
        {groupedRows.map((group) => (
          <section key={group.key} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {selectedAdvancedGroupFields.length ? <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">{group.label}</div> : null}
            <div className="overflow-hidden">
              {isClaimFocusedTab ? (
                <table className="w-full table-fixed text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase text-slate-500">
                    <tr>
                      <th className="w-[6%] px-4 py-3 text-center">STT</th>
                      <th className="w-[10%] px-4 py-3">Mã HV</th>
                      <th className="w-[18%] px-4 py-3">Học viên</th>
                      <th className="w-[14%] px-4 py-3">Trạng thái học viên</th>
                      <th className="w-[12%] px-4 py-3">Claim type</th>
                      <th className="w-[12%] px-4 py-3">Claim status</th>
                      <th className="w-[12%] px-4 py-3">Ngày tạo</th>
                      <th className="w-[12%] px-4 py-3">Người tạo</th>
                      <th className="w-[10%] px-4 py-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {group.rows.length > 0 ? group.rows.map((row, index) => (
                      (() => {
                        const displayClaim = row.activeClaim || row.latestClaim;
                        return (
                          <tr key={row.student.id} onClick={() => openStudentClaims(row.student.id)} className="cursor-pointer hover:bg-slate-50">
                            <td className="px-4 py-3 align-top text-center font-semibold text-slate-500">{index + 1}</td>
                            <td className="px-4 py-3 align-top">
                              <div className="break-words font-bold text-indigo-700">{row.student.code}</div>
                            </td>
                            <td className="px-4 py-3 align-top">
                              <div className="font-semibold text-slate-900">{row.student.name}</div>
                              <div className="text-xs text-slate-500">{row.student.phone || '--'}</div>
                              {row.processingReasons.length ? <div className="mt-1 text-[11px] font-medium text-amber-700">{row.processingReasons.join(', ')}</div> : null}
                            </td>
                            <td className="px-4 py-3 align-top">{renderStudentStatusBadge(row.studentStatusKey)}</td>
                            <td className="px-4 py-3 align-top text-[13px] text-slate-700">{CLAIM_TYPE_LABELS[displayClaim?.claimType || 'KHONG_CO'] || 'Không có'}</td>
                            <td className="px-4 py-3 align-top">{renderClaimStatusBadge(displayClaim?.claimStatus)}</td>
                            <td className="px-4 py-3 align-top text-[13px] text-slate-700">{formatDisplayDate(displayClaim?.createdAt)}</td>
                            <td className="px-4 py-3 align-top text-[13px] text-slate-700">{displayClaim?.createdBy || '--'}</td>
                            <td className="px-4 py-3 align-top">
                              <div className="flex flex-col items-end gap-2">
                                <button onClick={(event) => { event.stopPropagation(); openStudentClaims(row.student.id); }} className="w-full rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800">
                                  {row.activeClaim ? 'Xử lý claim' : displayClaim ? 'Xem claim' : 'Tạo claim'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })()
                    )) : (
                      <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-500">Không có học viên phù hợp với bộ lọc hiện tại.</td></tr>
                    )}
                  </tbody>
                </table>
              ) : (
              <table className="w-full table-fixed text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase text-slate-500">
                  <tr>
                    <th className="w-[4%] px-4 py-3">
                      <input
                        type="checkbox"
                        checked={group.rows.length > 0 && group.rows.every((row) => selectedStudentIds.includes(row.student.id))}
                        onChange={(event) => {
                          const groupIds = group.rows.map((row) => row.student.id);
                          setSelectedStudentIds((prev) =>
                            event.target.checked
                              ? Array.from(new Set([...prev, ...groupIds]))
                              : prev.filter((id) => !groupIds.includes(id))
                          );
                        }}
                        className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                      />
                    </th>
                    <th className="w-[6%] px-4 py-3 text-center">STT</th>
                    <th className="w-[9%] px-4 py-3">MÃ£ HV</th>
                    <th className="w-[16%] px-4 py-3">Há»c viÃªn</th>
                    <th className="w-[22%] px-4 py-3">SO / ChÆ°Æ¡ng trÃ¬nh</th>
                    <th className="w-[18%] px-4 py-3">CÆ¡ sá»Ÿ / Lá»›p</th>
                    <th className="w-[11%] px-4 py-3">Tráº¡ng thÃ¡i há»c viÃªn</th>
                    <th className="w-[12%] px-4 py-3">Tráº¡ng thÃ¡i ghi danh</th>
                    <th className="w-[12%] px-4 py-3 text-right">Thao tÃ¡c</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {group.rows.length > 0 ? group.rows.map((row, index) => (
                    <tr key={row.student.id} onClick={() => navigate(`/contracts/students/${row.student.id}`)} className="cursor-pointer hover:bg-slate-50">
                      <td className="px-4 py-3 align-top">
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.includes(row.student.id)}
                          onClick={(event) => event.stopPropagation()}
                          onChange={() => toggleStudentSelection(row.student.id)}
                          className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                        />
                      </td>
                      <td className="px-4 py-3 align-top text-center font-semibold text-slate-500">{index + 1}</td>
                      <td className="px-4 py-3 align-top">
                        <div className="break-words font-bold text-indigo-700">{row.student.code}</div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="font-semibold text-slate-900">{row.student.name}</div>
                        <div className="text-xs text-slate-500">{row.student.phone || '--'}</div>
                        <div className="text-[11px] text-slate-400">
                          NS: {formatDisplayDate(row.student.dob)}
                          {row.teacher ? <span className="block">GV: {row.teacher.fullName}</span> : null}
                        </div>
                        {row.processingReasons.length ? (
                          <div className="mt-1 text-[11px] font-medium text-amber-700">Cần xử lý: {row.processingReasons.join(', ')}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="font-semibold text-slate-900">{row.lockedQuotation?.soCode || '--'}</div>
                        <div className="text-xs text-slate-500">{row.contract?.code || 'ChÆ°a cÃ³ há»£p Ä‘á»“ng'}</div>
                        <div className="mt-1 break-words font-medium text-slate-800">{row.lockedQuotation?.product || '--'}</div>
                        <div className="text-xs text-slate-500">{row.lockedQuotation?.serviceType || '--'}</div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="font-medium text-slate-800">{row.desiredCampus || '--'}</div>
                        <div className="mt-1 break-words text-sm text-slate-800">{row.currentClassLabel || '--'}</div>
                        <div className="text-xs text-slate-500">
                          {row.currentClass?.level || '--'}
                          {row.currentClass?.schedule ? <span className="block">{row.currentClass.schedule}</span> : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        {renderStudentStatusBadge(row.studentStatusKey)}
                      </td>
                      <td className="px-4 py-3 align-top">
                        {renderAdmissionStatusBadge(row.admissionStatusKey)}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-col items-end gap-2">
                          {activeTab === 'waiting_enrollment' ? (
                            <>
                              <button
                                onClick={(event) => { event.stopPropagation(); openEnroll(row); }}
                                disabled={!row.canEnroll || !canEnrollBySales}
                                className="w-full rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                Tạo ghi danh
                              </button>
                              <button
                                onClick={(event) => { event.stopPropagation(); openStudentProfile(row.student.id); }}
                                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                Xem hồ sơ
                              </button>
                            </>
                          ) : null}
                          {activeTab !== 'waiting_enrollment' && activeTab !== 'waiting_approval' && row.canEnroll ? (
                            <button
                              onClick={(event) => { event.stopPropagation(); openEnroll(row); }}
                              disabled={!canEnrollBySales}
                              className="w-full rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Tạo ghi danh
                            </button>
                          ) : null}
                          {activeTab === 'waiting_approval' ? (
                            <>
                              <button
                                onClick={(event) => { event.stopPropagation(); handleApproveAdmission(row); }}
                                disabled={!row.latestAdmission}
                                className="w-full rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                Duyệt ghi danh
                              </button>
                              <button
                                onClick={(event) => { event.stopPropagation(); openAssign(row); }}
                                disabled={!row.latestAdmission}
                                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                Gán lớp
                              </button>
                            </>
                          ) : null}
                          {row.canCancelAdmission && activeTab !== 'waiting_approval' ? <button onClick={(event) => { event.stopPropagation(); handleCancelAdmission(row); }} disabled={!canEnrollBySales} className="w-full rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40">Há»§y ghi danh</button> : null}
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-500">KhÃ´ng cÃ³ há»c viÃªn phÃ¹ há»£p vá»›i bá»™ lá»c hiá»‡n táº¡i.</td></tr>
                  )}
                </tbody>
              </table>
              )}
            </div>
          </section>
        ))}
      </div>

      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Ghi danh há»c viÃªn</h3>
                <p className="text-sm text-slate-500">Táº¡o admission chá» duyá»‡t tá»« danh sÃ¡ch há»c viÃªn. Sau khi lÆ°u, mÃ n hÃ¬nh sáº½ chuyá»ƒn sang tab Chá» duyá»‡t.</p>
              </div>
              <button onClick={closeCreateModal} className="text-sm font-medium text-slate-500 hover:text-slate-800">ÄÃ³ng</button>
            </div>
            <div className="space-y-3">
              {selectedEnrollRow ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Há»“ sÆ¡</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">{selectedEnrollRow.student.name}</div>
                  <div className="text-xs text-slate-500">
                    {selectedEnrollRow.student.code}
                    {selectedEnrollRow.lockedQuotation?.soCode ? ` â€¢ ${selectedEnrollRow.lockedQuotation.soCode}` : ''}
                  </div>
                </div>
              ) : isBatchEnrollMode ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ghi danh hÃ ng loáº¡t</div>
                  <div className="mt-1 text-sm text-slate-700">
                    ÄÃ£ chá»n <span className="font-semibold text-slate-900">{selectedStudentIds.length}</span> há»c viÃªn.
                  </div>
                  <div className="text-sm text-slate-700">
                    CÃ³ thá»ƒ táº¡o admission cho <span className="font-semibold text-slate-900">{selectedEnrollRows.length}</span> há»c viÃªn Ä‘á»§ Ä‘iá»u kiá»‡n.
                  </div>
                  {selectedEnrollRows.length !== selectedStudentIds.length ? (
                    <div className="mt-2 text-xs text-amber-700">
                      CÃ¡c há»c viÃªn khÃ´ng Ä‘á»§ Ä‘iá»u kiá»‡n ghi danh sáº½ Ä‘Æ°á»£c bá» qua khi lÆ°u.
                    </div>
                  ) : null}
                </div>
              ) : (
                <>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">Há»c viÃªn</label>
                    <select value={form.studentId} onChange={(event) => onStudentChange(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
                      <option value="">-- Chá»n há»c viÃªn --</option>
                      {admissionEligibleStudents.map((student) => <option key={student.id} value={student.id}>{student.code} - {student.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">SO liÃªn quan</label>
                    <select value={form.quotationId} onChange={(event) => setForm((prev) => ({ ...prev, quotationId: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
                      <option value="">-- Chá»n SO --</option>
                      {linkedQuotationsForStudent.map((quotation) => <option key={quotation.id} value={quotation.id}>{quotation.soCode} - {quotation.customerName}</option>)}
                    </select>
                  </div>
                </>
              )}
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Cơ sở lớp học</label>
                  <select
                    value={form.campusId}
                    onChange={(event) => setForm((prev) => ({ ...prev, campusId: event.target.value, classId: '', classCode: '' }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  >
                    {activeClassCampusOptions.map((campus) => <option key={campus} value={campus}>{campus}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Lớp học mong muốn</label>
                  <ClassCodeLookupInput
                    value={form.classCode}
                    onChange={(value) => {
                      const selected = findActiveClass(value);
                      setForm((prev) => ({
                        ...prev,
                        campusId: selected?.campus || prev.campusId,
                        classCode: value,
                        classId: selected?.id || ''
                      }));
                    }}
                    loadOptions={() =>
                      desiredClassOptions.map((item) => ({
                        code: item.code,
                        name: item.name,
                        campus: item.campus,
                        schedule: item.schedule,
                        level: item.level,
                        classType: item.classType,
                        status: item.status
                      }))
                    }
                    placeholder="Nhập hoặc tìm theo mã lớp"
                    wrapperClassName="w-full"
                    inputClassName="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
                    buttonClassName="rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  />
                </div>
              </div>
              {selectedDesiredClass ? (
                <div className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  <span className="font-semibold text-slate-900">{selectedDesiredClass.code}</span>
                  {selectedDesiredClass.campus ? ` â€¢ ${selectedDesiredClass.campus}` : ''}
                  {selectedDesiredClass.level ? ` â€¢ ${selectedDesiredClass.level}` : ''}
                  {selectedDesiredClass.schedule ? <span className="block">{selectedDesiredClass.schedule}</span> : null}
                </div>
              ) : null}
              {!desiredClassOptions.length ? <div className="text-xs text-amber-700">Cơ sở này hiện chưa có lớp đang mở phù hợp.</div> : null}
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Ghi chÃº</label>
                <textarea
                  value={form.note}
                  onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
                  className="h-24 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={closeCreateModal} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">Há»§y</button>
              <button onClick={submitSelectedEnroll} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                {isBatchEnrollMode ? 'LÆ°u ghi danh hÃ ng loáº¡t' : 'LÆ°u ghi danh'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showAssignModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className={`w-full rounded-2xl bg-white p-5 shadow-2xl ${selectedAssignRow ? 'max-w-md' : 'max-w-lg'}`}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Gán lớp</h3>
                <p className="text-sm text-slate-500">
                  {selectedAssignRow ? 'Chọn lớp cho hồ sơ chờ duyệt để đào tạo xác nhận.' : 'Chọn học viên cần thao tác, sau đó mở hồ sơ ở tab lớp học.'}
                </p>
              </div>
              <button onClick={closeAssignModal} className="text-sm font-medium text-slate-500 hover:text-slate-800">Đóng</button>
            </div>

            {selectedAssignRow ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Hồ sơ chờ duyệt</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{selectedAssignRow.student.name}</div>
                <div className="text-xs text-slate-500">
                  {selectedAssignRow.student.code}
                  {selectedAssignRow.latestAdmission?.code ? ` • ${selectedAssignRow.latestAdmission.code}` : ''}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                Thao tác cho <span className="font-semibold text-slate-900">{selectedAssignableRows.length}</span> học viên đã chọn.
              </div>
            )}

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Cơ sở lớp</label>
                <select
                  value={assignForm.campusId}
                  onChange={(event) => setAssignForm((prev) => ({ ...prev, campusId: event.target.value, classId: '', classCode: '' }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                >
                  {activeClassCampusOptions.map((campus) => <option key={campus} value={campus}>{campus}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">{selectedAssignRow ? 'Danh sách lớp' : 'Lớp đích'}</label>
                <ClassCodeLookupInput
                  value={assignForm.classCode}
                  onChange={(value) => {
                    const selected = findActiveClass(value);
                    setAssignForm((prev) => ({
                      ...prev,
                      campusId: selected?.campus || prev.campusId,
                      classCode: value,
                      classId: selected?.id || ''
                    }));
                  }}
                  loadOptions={() =>
                    assignClassOptions.map((item) => ({
                      code: item.code,
                      name: item.name,
                      campus: item.campus,
                      schedule: item.schedule,
                      level: item.level,
                      classType: item.classType,
                      status: item.status
                    }))
                  }
                  placeholder="Nhập hoặc tìm theo mã lớp"
                  wrapperClassName="w-full"
                  inputClassName="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
                  buttonClassName="rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                />
              </div>
            </div>
            {selectedAssignClass ? (
              <div className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <span className="font-semibold text-slate-900">{selectedAssignClass.code}</span>
                {selectedAssignClass.campus ? ` • ${selectedAssignClass.campus}` : ''}
                {selectedAssignClass.level ? ` • ${selectedAssignClass.level}` : ''}
                {selectedAssignClass.schedule ? <span className="block">{selectedAssignClass.schedule}</span> : null}
              </div>
            ) : null}
            {!assignClassOptions.length ? <div className="mt-2 text-xs text-amber-700">Cơ sở này hiện chưa có lớp đang mở để gán.</div> : null}

            <div className="mt-3">
              <label className="mb-1 block text-sm font-semibold text-slate-700">Ghi chú</label>
              <textarea value={assignForm.note} onChange={(event) => setAssignForm((prev) => ({ ...prev, note: event.target.value }))} className="h-24 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button onClick={closeAssignModal} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">Hủy</button>
              <button onClick={submitSelectedAssign} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                {selectedAssignRow ? 'Lưu lớp chọn' : 'Gán lớp hàng loạt'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {false && showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Ghi danh há»c viÃªn</h3>
                <p className="text-sm text-slate-500">Táº¡o admission chá» duyá»‡t. Sau khi lÆ°u, há»c viÃªn váº«n hiá»ƒn thá»‹ á»Ÿ tab Tá»•ng Ä‘á»ƒ cÃ³ thá»ƒ há»§y ghi danh ngay.</p>
              </div>
              <button onClick={closeCreateModal} className="text-sm font-medium text-slate-500 hover:text-slate-800">ÄÃ³ng</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Há»c viÃªn</label>
                <select value={form.studentId} onChange={(event) => onStudentChange(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
                  <option value="">-- Chá»n há»c viÃªn --</option>
                  {admissionEligibleStudents.map((student) => <option key={student.id} value={student.id}>{student.code} - {student.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">SO liÃªn quan</label>
                <select value={form.quotationId} onChange={(event) => setForm((prev) => ({ ...prev, quotationId: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
                  <option value="">-- Chá»n SO --</option>
                  {linkedQuotationsForStudent.map((quotation) => <option key={quotation.id} value={quotation.id}>{quotation.soCode} - {quotation.customerName}</option>)}
                </select>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">CÆ¡ sá»Ÿ mong muá»‘n</label>
                  <select value={form.campusId} onChange={(event) => setForm((prev) => ({ ...prev, campusId: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
                    {campusOptions.map((campus) => <option key={campus} value={campus}>{campus}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">LÃ¡Â»â€ºp</label>
                  <select value={form.classId} onChange={(event) => setForm((prev) => ({ ...prev, classId: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
                    <option value="">-- Chá»n lá»›p --</option>
                    {activeClasses.map((item) => <option key={item.id} value={item.id}>{item.code} - {item.campus}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Ghi chÃº</label>
                <textarea value={form.note} onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))} className="h-24 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowCreateModal(false)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">Há»§y</button>
              <button onClick={handleCreate} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">LÆ°u ghi danh</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Contracts;
