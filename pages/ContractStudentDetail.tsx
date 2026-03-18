import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, FileText, GraduationCap, PauseCircle, RefreshCcw } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { cancelAdmission, createAdmission } from '../services/enrollmentFlow.service';
import {
  IAdmission,
  IClassStudent,
  IContract,
  ILogNote,
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
  createStudentClaim,
  addStudentLog,
  getAdmissions,
  getClassStudents,
  getContractByQuotationId,
  getContracts,
  getLogNotes,
  getQuotations,
  getStudentClaims,
  getStudents,
  getTeachers,
  getTrainingClasses,
  quotationLinksToStudent,
  transferStudentClass,
  updateClassStudentStatus,
  updateStudentClaim,
  updateStudent
} from '../utils/storage';
import { decodeMojibakeText } from '../utils/mojibake';
import LogAudienceFilterControl from '../components/LogAudienceFilter';
import { LogAudienceFilter } from '../utils/logAudience';
type DetailTabKey = 'overview' | 'classroom' | 'finance' | 'claims';
type ClaimModalMode = 'create' | 'process' | 'cancel';
type StudentLifecycleStatus =
  | 'MOI_TAO'
  | 'CHO_GHI_DANH'
  | 'DA_GHI_DANH'
  | 'DANG_HOC'
  | 'TAM_DUNG'
  | 'HOAN_THANH'
  | 'DUNG';

const LEGACY_DETAIL_TABS: Array<{ key: DetailTabKey; label: string }> = [
  { key: 'classroom', label: 'Ghi danh & lớp học' },
  { key: 'finance', label: 'Tài chính tóm tắt' },
  { key: 'logs', label: 'Log học vụ' }
];

const DETAIL_TABS_MOJIBAKE: Array<{ key: DetailTabKey; label: string }> = [
  { key: 'overview', label: 'Tổng quan' },
  { key: 'classroom', label: 'Ghi danh & lớp học' },
  { key: 'finance', label: 'Tài chính' }
];

const DETAIL_TABS: Array<{ key: DetailTabKey; label: string }> = [
  { key: 'overview', label: '\u0054\u1ed5ng quan' },
  { key: 'classroom', label: '\u0047hi danh \u0026 l\u1edbp h\u1ecdc' },
  { key: 'finance', label: '\u0054\u00e0i ch\u00ednh' },
  { key: 'claims', label: '\u0043\u1ea7n x\u1eed l\u00fd' }
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

const badgeClassByStatus = (status?: string) => {
  if (status === 'DA_DUYET' || status === 'DANG_HOC' || status === 'DA_GHI_DANH') return 'bg-emerald-100 text-emerald-700';
  if (status === 'CHO_DUYET' || status === 'CHO_GHI_DANH') return 'bg-amber-100 text-amber-700';
  if (status === 'TAM_DUNG' || status === 'BAO_LUU') return 'bg-orange-100 text-orange-700';
  if (status === 'HOAN_THANH') return 'bg-violet-100 text-violet-700';
  if (status === 'DUNG' || status === 'TU_CHOI' || status === 'NGHI_HOC') return 'bg-rose-100 text-rose-700';
  if (status === QuotationStatus.LOCKED) return 'bg-blue-100 text-blue-700';
  return 'bg-slate-100 text-slate-600';
};

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

const FieldRow: React.FC<{ label: string; value?: React.ReactNode; className?: string }> = ({ label, value, className = '' }) => (
  <div className={`flex items-start justify-between gap-4 border-b border-slate-100 py-2 ${className}`.trim()}>
    <div className="text-[12px] font-medium text-slate-500">{label}</div>
    <div className="text-right text-[13px] font-semibold text-slate-800">{value || '--'}</div>
  </div>
);

const CompactFieldRow: React.FC<{ label: string; value?: React.ReactNode; className?: string; valueClassName?: string }> = ({
  label,
  value,
  className = '',
  valueClassName = ''
}) => (
  <div className={`flex items-baseline gap-3 py-1.5 ${className}`.trim()}>
    <div className="min-w-[112px] shrink-0 text-[11px] font-medium text-slate-500">{label}</div>
    <div className={`min-w-0 truncate text-[13px] font-medium text-slate-900 ${valueClassName}`.trim()}>{value || '--'}</div>
  </div>
);

const getDetailTabFromParam = (value: string | null): DetailTabKey =>
  value === 'classroom' || value === 'finance' || value === 'overview' || value === 'claims' ? value : 'overview';

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
  const [logs, setLogs] = useState<ILogNote[]>([]);
  const [claims, setClaims] = useState<IStudentClaim[]>([]);
  const [activeTab, setActiveTab] = useState<DetailTabKey>(() => getDetailTabFromParam(searchParams.get('tab')));
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [claimModalMode, setClaimModalMode] = useState<ClaimModalMode | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<IStudentClaim | null>(null);
  const [noteInput, setNoteInput] = useState('');
  const [logAudienceFilter, setLogAudienceFilter] = useState<LogAudienceFilter>('ALL');
  const [enrollForm, setEnrollForm] = useState({ quotationId: '', campusId: 'Hà Nội', classId: '', note: '' });
  const [transferForm, setTransferForm] = useState({ classId: '', note: '' });
  const [editForm, setEditForm] = useState({ name: '', dob: '', phone: '', email: '', campus: '', payerName: '', note: '' });
  const [claimForm, setClaimForm] = useState<{ claimType: StudentClaimType; claimStatus: StudentClaimStatus; reason: string; note: string }>({
    claimType: 'CHUYEN_LOP',
    claimStatus: 'CHO_XU_LY',
    reason: '',
    note: ''
  });

  const loadData = () => {
    setStudents(getStudents());
    setQuotations(getQuotations());
    setAdmissions(getAdmissions());
    setClassStudents(getClassStudents());
    setClasses(getTrainingClasses());
    setContracts(getContracts());
    setTeachers(getTeachers());
    setClaims(id ? getStudentClaims().filter((item) => item.studentId === id) : []);
    if (id) setLogs(getLogNotes('STUDENT', id));
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
      'educrm:student-claims-changed',
      'educrm:log-notes-changed'
    ] as const;
    events.forEach((eventName) => window.addEventListener(eventName, loadData as EventListener));
    return () => events.forEach((eventName) => window.removeEventListener(eventName, loadData as EventListener));
  }, [id]);

  useEffect(() => {
    const nextTab = getDetailTabFromParam(searchParams.get('tab'));
    setActiveTab((prev) => (prev === nextTab ? prev : nextTab));
  }, [searchParams]);

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
  const linkedQuotation = useMemo(() => {
    if (!student) return undefined;
    return (
      quotations.find((item) => item.status === QuotationStatus.LOCKED && quotationLinksToStudent(item, student)) ||
      quotations.find((item) => quotationLinksToStudent(item, student)) ||
      quotations.find((item) => item.id === student.soId)
    );
  }, [quotations, student]);

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
  const relatedContract =
    (linkedQuotation ? getContractByQuotationId(linkedQuotation.id) : undefined) || contracts.find((item) => item.studentId === student?.id);
  const availableLockedQuotations = useMemo(() => {
    if (!student) return [];
    return quotations.filter((item) => item.status === QuotationStatus.LOCKED && quotationLinksToStudent(item, student));
  }, [quotations, student]);
  const classOptions = useMemo(
    () => classes.filter((item) => item.status === 'ACTIVE' && item.id !== currentClass?.id && item.code !== currentClass?.code),
    [classes, currentClass?.code, currentClass?.id]
  );
  const latestClaim = claims[0];
  const latestPendingClaim = claims.find((item) => item.claimStatus === 'CHO_XU_LY');

  useEffect(() => {
    if (!student) return;
    setEnrollForm({
      quotationId: linkedQuotation?.id || availableLockedQuotations[0]?.id || '',
      campusId: latestAdmission?.campusId || student.campus || currentClass?.campus || 'Hà Nội',
      classId: currentClass?.id || '',
      note: ''
    });
    setTransferForm({ classId: '', note: '' });
    setEditForm({
      name: student.name || '',
      dob: student.dob || '',
      phone: student.phone || '',
      email: student.email || '',
      campus: student.campus || '',
      payerName: student.payerName || '',
      note: student.note || ''
    });
  }, [availableLockedQuotations, currentClass?.campus, currentClass?.id, latestAdmission?.campusId, linkedQuotation?.id, student]);

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

  const legacyStudentStatusLabel = STUDENT_STATUS_LABELS[studentStatusKey];
  const legacyStudentNote = normalizeEnrollmentText(student?.note || latestAdmission?.note);
  const legacyCurrentClassStatusLabel =
    studentStatusKey === 'TAM_DUNG' ? 'Tạm dừng' : studentStatusKey === 'HOAN_THANH' ? 'Hoàn thành' : student?.enrollmentStatus === 'DA_GHI_DANH' ? 'Đang học' : 'Chưa vào lớp';
  const legacyQuickWarnings = useMemo(() => {
    const warnings: string[] = [];
    if (student?.enrollmentStatus !== 'DA_GHI_DANH') warnings.push('Chưa ghi danh');
    if ((currentClassStudent?.debtTerms || []).some((item) => item.termNo === 2 && item.status !== 'PAID')) warnings.push('Thiếu đợt 2');
    if (latestAdmission?.status === 'CHO_DUYET') warnings.push('Chờ duyệt');
    if (studentStatusKey === 'TAM_DUNG') warnings.push('Tạm dừng');
    if (linkedQuotation?.serviceType === 'StudyAbroad' || linkedQuotation?.product?.includes('Du học')) warnings.push('Chờ đủ điều kiện du học');
    return warnings;
  }, [currentClassStudent?.debtTerms, latestAdmission?.status, linkedQuotation?.product, linkedQuotation?.serviceType, student?.enrollmentStatus, studentStatusKey]);
  const legacyInstallmentRows = (currentClassStudent?.debtTerms || []).map((item) => ({
    label: `Đợt ${item.termNo}`,
    amount: item.amount,
    statusLabel: item.status === 'PAID' ? 'Đã xong' : item.status === 'OVERDUE' ? 'Quá hạn' : 'Chưa đến'
  }));
  const legacySystemLogs = [];
  const legacyUserLogs = [];

  const studentStatusLabel = STUDENT_STATUS_LABELS[studentStatusKey];
  const sourceProgramLabel = [linkedQuotation?.serviceType, linkedQuotation?.product].filter(Boolean).join(' - ') || '--';
  const admissionStatusLabel =
    latestAdmission?.status === 'DA_DUYET' ? 'Đã duyệt' : latestAdmission?.status === 'CHO_DUYET' ? 'Chờ duyệt' : 'Chưa tạo';
  const studentNote = normalizeEnrollmentText(student?.note || latestAdmission?.note);
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
  const quickWarnings = useMemo(() => {
    const warnings: string[] = [];
    if (student?.enrollmentStatus !== 'DA_GHI_DANH') warnings.push('Chưa ghi danh');
    if ((currentClassStudent?.debtTerms || []).some((item) => item.termNo === 2 && item.status !== 'PAID')) warnings.push('Thiếu đợt 2');
    if (latestAdmission?.status === 'CHO_DUYET') warnings.push('Chờ duyệt');
    if (studentStatusKey === 'TAM_DUNG') warnings.push('Tạm dừng');
    if (linkedQuotation?.serviceType === 'StudyAbroad' || linkedQuotation?.product?.includes('Du học')) warnings.push('Chờ đủ điều kiện du học');
    if (latestPendingClaim) warnings.push(`Claim chờ xử lý: ${CLAIM_TYPE_LABELS[latestPendingClaim.claimType]}`);
    return warnings;
  }, [currentClassStudent?.debtTerms, latestAdmission?.status, latestPendingClaim, linkedQuotation?.product, linkedQuotation?.serviceType, student?.enrollmentStatus, studentStatusKey]);
  const installmentRows = (currentClassStudent?.debtTerms || []).map((item) => ({
    label: `Đợt ${item.termNo}`,
    amount: item.amount,
    statusLabel: item.status === 'PAID' ? 'Đã xong' : item.status === 'OVERDUE' ? 'Quá hạn' : 'Chưa đến'
  }));
  const totalValue = linkedQuotation?.finalAmount || linkedQuotation?.amount || 0;
  const paidValue = relatedContract?.paidValue || 0;
  const remainingValue = Math.max(totalValue - paidValue, 0);
  const firstInstallmentRow = installmentRows.find((item) => item.label === 'Đợt 1');
  const laterInstallmentRows = installmentRows.filter((item) => item.label !== 'Đợt 1');
  const hasFinancialBlock = Boolean(
    installmentRows.some((item) => item.statusLabel === 'Quá hạn') ||
    (firstInstallmentRow && firstInstallmentRow.statusLabel !== 'Đã xong')
  );
  const systemLogs = logs.filter((item) => item.category !== 'USER');
  const userLogs = logs.filter((item) => item.category === 'USER');
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
    setClaimForm({
      claimType: 'CHUYEN_LOP',
      claimStatus: 'CHO_XU_LY',
      reason: '',
      note: ''
    });
  };

  const openCreateClaimModal = () => {
    setSelectedClaim(null);
    setClaimModalMode('create');
    setClaimForm({
      claimType: latestPendingClaim?.claimType || latestClaim?.claimType || 'CHUYEN_LOP',
      claimStatus: latestPendingClaim ? 'CHO_XU_LY' : 'CHO_XU_LY',
      reason: '',
      note: ''
    });
  };

  const openProcessClaimModal = (claim?: IStudentClaim) => {
    const targetClaim = claim || latestPendingClaim || latestClaim;
    if (!targetClaim) return;
    setSelectedClaim(targetClaim);
    setClaimModalMode('process');
    setClaimForm({
      claimType: targetClaim.claimType,
      claimStatus: targetClaim.claimStatus === 'CHO_XU_LY' ? 'DA_XU_LY' : targetClaim.claimStatus,
      reason: targetClaim.reason || '',
      note: targetClaim.note || ''
    });
  };

  const openCancelClaimModal = (claim?: IStudentClaim) => {
    const targetClaim = claim || latestPendingClaim || latestClaim;
    if (!targetClaim) return;
    setSelectedClaim(targetClaim);
    setClaimModalMode('cancel');
    setClaimForm({
      claimType: targetClaim.claimType,
      claimStatus: 'DA_HUY',
      reason: targetClaim.reason || '',
      note: targetClaim.note || ''
    });
  };

  const openEnrollModal = () => {
    if (hideClassControls) return;
    if (!canOperate) return alert('Bạn không có quyền thao tác ghi danh');
    setShowEnrollModal(true);
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
    if (!canOperate) return alert('Bạn không có quyền chuyển lớp');
    if (!transferForm.classId) return alert('Vui lòng chọn lớp đích');
    try {
      transferStudentClass(student.id, currentClassStudent.classId, transferForm.classId);
      const targetClass = classes.find((item) => item.id === transferForm.classId || item.code === transferForm.classId);
      updateStudent({ ...student, classId: targetClass?.id || transferForm.classId, className: targetClass?.code || transferForm.classId, campus: targetClass?.campus || student.campus, status: StudentStatus.ENROLLED, enrollmentStatus: 'DA_GHI_DANH', note: transferForm.note ? [student.note, `Chuyển lớp: ${transferForm.note}`].filter(Boolean).join('\n') : student.note });
      addClassLog(currentClassStudent.classId, 'TRANSFER_OUT', `Chuyển ${student.name} sang lớp ${targetClass?.code || transferForm.classId}`, user?.id || 'system');
      addClassLog(targetClass?.id || transferForm.classId, 'TRANSFER_IN', `Tiếp nhận ${student.name} từ lớp ${currentClass?.code || currentClassStudent.classId}`, user?.id || 'system');
      addStudentLog(student.id, 'TRANSFER_CLASS', `Chuyển lớp từ ${currentClass?.code || currentClassStudent.classId} sang ${targetClass?.code || transferForm.classId}`, user?.id || 'system', 'SYSTEM');
      setShowTransferModal(false);
      loadData();
    } catch (error: any) {
      alert(error?.message || 'Không thể chuyển lớp');
    }
  };

  const pauseStudent = () => {
    if (!student || !currentClassStudent?.classId) return;
    if (!canOperate) return alert('Bạn không có quyền tạm dừng học viên');
    const updated = updateClassStudentStatus(currentClassStudent.classId, student.id, 'BAO_LUU');
    if (!updated) return alert('Không tìm thấy dữ liệu lớp của học viên');
    updateStudent({ ...student, status: StudentStatus.RESERVED, enrollmentStatus: 'DA_GHI_DANH' });
    addClassLog(currentClassStudent.classId, 'PAUSE_STUDENT', `Tạm dừng học viên ${student.name}`, user?.id || 'system');
    addStudentLog(student.id, 'PAUSE_STUDENT', `Chuyển học viên sang trạng thái tạm dừng`, user?.id || 'system', 'SYSTEM');
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
    updateStudent({
      ...student,
      name: editForm.name.trim() || student.name,
      dob: editForm.dob,
      phone: editForm.phone,
      email: editForm.email,
      campus: editForm.campus,
      payerName: editForm.payerName,
      note: editForm.note
    });
    addStudentLog(student.id, 'UPDATE_PROFILE', 'Cập nhật thông tin hồ sơ học viên', user?.id || 'system', 'SYSTEM');
    closeEditModal();
    loadData();
  };

  const addUserNote = () => {
    if (!student || !noteInput.trim()) return;
    addStudentLog(student.id, 'USER_NOTE', noteInput.trim(), user?.name || user?.id || 'user', 'USER');
    setNoteInput('');
    loadData();
  };

  const submitClaim = () => {
    if (!student || !claimModalMode) return;

    const actor = user?.name || user?.id || 'system';
    const reason = claimForm.reason.trim();
    const note = claimForm.note.trim();

    if (claimModalMode === 'create') {
      createStudentClaim({
        id: `CLM-${Date.now()}`,
        studentId: student.id,
        claimType: claimForm.claimType,
        claimStatus: claimForm.claimStatus,
        reason,
        note,
        createdAt: new Date().toISOString(),
        createdBy: actor
      });
      addStudentLog(
        student.id,
        'CREATE_CLAIM',
        `Tạo claim ${CLAIM_TYPE_LABELS[claimForm.claimType]} - ${CLAIM_STATUS_LABELS[claimForm.claimStatus]}${reason ? `: ${reason}` : ''}`,
        actor,
        'SYSTEM'
      );
      closeClaimModal();
      loadData();
      return;
    }

    if (!selectedClaim) return;

    const nextStatus = claimModalMode === 'cancel' ? 'DA_HUY' : claimForm.claimStatus;
    updateStudentClaim({
      ...selectedClaim,
      claimType: claimForm.claimType,
      claimStatus: nextStatus,
      reason,
      note,
      updatedAt: new Date().toISOString(),
      updatedBy: actor
    });
    addStudentLog(
      student.id,
      claimModalMode === 'cancel' ? 'CANCEL_CLAIM' : 'PROCESS_CLAIM',
      `${claimModalMode === 'cancel' ? 'Hủy' : 'Xử lý'} claim ${CLAIM_TYPE_LABELS[claimForm.claimType]} - ${CLAIM_STATUS_LABELS[nextStatus]}${note ? `: ${note}` : ''}`,
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => navigate('/contracts')} className="inline-flex items-center gap-1.5 rounded-lg border border-transparent px-2.5 py-1.5 text-sm font-medium text-slate-500 hover:border-slate-300 hover:bg-white hover:text-slate-800">
              <ArrowLeft size={14} />
              Quay lại
            </button>
            <button onClick={() => setShowEditModal(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-transparent px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-white">
              Chỉnh sửa hồ sơ
            </button>
            {!hideClassControls ? <button onClick={openEnrollModal} disabled={!availableLockedQuotations.length || latestAdmission?.status === 'CHO_DUYET'} className="inline-flex items-center gap-1.5 rounded-lg border border-transparent px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-white disabled:cursor-not-allowed disabled:text-slate-400">
              <GraduationCap size={14} />
              Ghi danh vào lớp
            </button> : null}
            {!hideClassControls ? <button onClick={() => setShowTransferModal(true)} disabled={!currentClassStudent?.classId || !classOptions.length} className="inline-flex items-center gap-1.5 rounded-lg border border-transparent px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-white disabled:cursor-not-allowed disabled:text-slate-400">
              <RefreshCcw size={14} />
              Chuyển lớp
            </button> : null}
            {!hideClassControls ? <button onClick={pauseStudent} disabled={!currentClassStudent?.classId || studentStatusKey !== 'DANG_HOC'} className="inline-flex items-center gap-1.5 rounded-lg border border-transparent px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-white disabled:cursor-not-allowed disabled:text-slate-400">
              <PauseCircle size={14} />
              Tạm dừng
            </button> : null}
            <button onClick={() => linkedQuotation && navigate(`/contracts/quotations/${linkedQuotation.id}`)} disabled={!linkedQuotation} className="inline-flex items-center gap-1.5 rounded-lg border border-transparent px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-white disabled:cursor-not-allowed disabled:text-slate-400">
              <FileText size={14} />
              Xem SO
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClassByStatus(studentStatusKey)}`}>{studentStatusLabel}</span>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClassByStatus(latestAdmission?.status || 'CHUA_TAO')}`}>{latestAdmission?.status || 'CHƯA TẠO'}</span>
            {linkedQuotation?.status === QuotationStatus.LOCKED ? <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClassByStatus(linkedQuotation.status)}`}>Locked</span> : null}
        </div>
        </div>

        <div className="border-b border-slate-200 px-4 py-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">{student.name}</h1>
                <span className="text-sm text-slate-400">{student.code}</span>
              </div>
              <div className="mt-1 text-sm text-slate-500">{student.phone || 'Chưa có số điện thoại'} {linkedQuotation?.soCode ? `• SO ${linkedQuotation.soCode}` : ''}</div>
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
                </div>
              </section>

              <section className="border-t border-slate-200 pt-4">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#666666]">THÔNG TIN NGUỒN</div>
                <div className="space-y-0.5">
                  <CompactFieldRow label="SO nguồn" value={linkedQuotation?.soCode || '--'} />
                  <CompactFieldRow label="Gói dịch vụ" value={sourceProgramLabel} valueClassName="whitespace-nowrap" />
                  <CompactFieldRow label="Sale phụ trách" value={linkedQuotation?.salespersonName || '--'} />
                  <CompactFieldRow label="Ngày kích hoạt" value={formatDate(student.createdAt || linkedQuotation?.lockedAt)} />
                  <CompactFieldRow label="Người thanh toán" value={student.payerName || linkedQuotation?.customerName || '--'} />
                </div>
              </section>
            </div>

            <div className="space-y-5 xl:border-l xl:border-slate-200 xl:pl-10">
              <section>
                <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#666666]">TRẠNG THÁI NHANH</div>
                <div className="space-y-0.5">
                  <CompactFieldRow label="Trạng thái học viên" value={<span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium ${compactBadgeClassByStatus(studentStatusKey)}`}>{studentStatusLabel}</span>} valueClassName="whitespace-nowrap" />
                  <CompactFieldRow label="Admission" value={<span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium ${compactBadgeClassByStatus(latestAdmission?.status || 'CHUA_TAO')}`}>{admissionStatusLabel}</span>} valueClassName="whitespace-nowrap" />
                  <CompactFieldRow label="Lớp hiện tại" value={currentClass?.code || '--'} valueClassName="whitespace-nowrap" />
                  <CompactFieldRow label="Trạng thái lớp" value={<span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium ${compactBadgeClassByStatus(studentStatusKey)}`}>{currentClassStatusLabel}</span>} valueClassName="whitespace-nowrap" />
                </div>
              </section>

              <section className="border-t border-slate-200 pt-4">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#666666]">CẢNH BÁO NHANH</div>
                <div className="flex flex-wrap gap-1.5">
                  {quickWarnings.length > 0 ? quickWarnings.map((warning) => (
                    <div key={warning} className="inline-flex rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-inset ring-amber-100 whitespace-nowrap">{warning}</div>
                  )) : <div className="text-[13px] text-slate-500">Không có cảnh báo.</div>}
                </div>
                <div className="mt-2 truncate text-[13px] text-slate-700">{studentNote || '--'}</div>
              </section>

              <section className="border-t border-slate-200 pt-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#666666]">YÊU CẦU XỬ LÝ</div>
                    <div className="mt-1 text-[13px] text-slate-500">Claim được tạo và xử lý trực tiếp trong hồ sơ học viên.</div>
                  </div>
                  {latestClaim ? (
                    <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium ${compactBadgeClassByClaimStatus(latestClaim.claimStatus)}`}>
                      {CLAIM_STATUS_LABELS[latestClaim.claimStatus]}
                    </span>
                  ) : null}
                </div>
                <div className="space-y-0.5">
                  <CompactFieldRow label="Loại claim" value={latestClaim ? CLAIM_TYPE_LABELS[latestClaim.claimType] : '--'} valueClassName="whitespace-nowrap" />
                  <CompactFieldRow label="Trạng thái claim" value={latestClaim ? <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium ${compactBadgeClassByClaimStatus(latestClaim.claimStatus)}`}>{CLAIM_STATUS_LABELS[latestClaim.claimStatus]}</span> : '--'} valueClassName="whitespace-nowrap" />
                  <CompactFieldRow label="Ngày tạo" value={formatDateTime(latestClaim?.createdAt)} valueClassName="whitespace-nowrap" />
                  <CompactFieldRow label="Người tạo" value={latestClaim?.createdBy || '--'} />
                  <CompactFieldRow label="Lý do" value={latestClaim?.reason || '--'} />
                  <CompactFieldRow label="Ghi chú" value={latestClaim?.note || '--'} />
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
                  <button onClick={() => setShowEditModal(true)} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700">Chỉnh sửa hồ sơ</button>
                  <button onClick={openEnrollModal} disabled={!availableLockedQuotations.length || latestAdmission?.status === 'CHO_DUYET'} className="rounded-md border border-blue-600 bg-blue-600 px-3 py-1.5 text-[13px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">Ghi danh vào lớp</button>
                  <button onClick={() => setShowTransferModal(true)} disabled={!currentClassStudent?.classId || !classOptions.length} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40">Chuyển lớp</button>
                  <button onClick={pauseStudent} disabled={studentStatusKey !== 'DANG_HOC'} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40">Tạm dừng</button>
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

        {activeTab === 'finance' ? (
          <div className="order-2 px-4 py-4">
            <div className="space-y-0 divide-y divide-slate-100">
              <section className="pb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#666666]">TÀI CHÍNH TÓM TẮT</div>
                  <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${compactBadgeClassByStatus(hasFinancialBlock ? 'CHO_GHI_DANH' : 'DA_DUYET')}`}>
                    {hasFinancialBlock ? 'Đang vướng tài chính' : 'Đủ điều kiện tài chính'}
                  </span>
                </div>
                <div className="mt-1 text-[11px] italic text-slate-400">Học vụ chỉ xem tóm tắt để biết có thể ghi danh hay đang vướng tài chính. Không nhập hoặc sửa tiền ở màn này.</div>
                <div className="mt-3 grid gap-x-6 gap-y-2 xl:grid-cols-4">
                  <div className="flex items-baseline gap-2 whitespace-nowrap">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#666666]">SO nguồn:</span>
                    <span className="text-[14px] font-semibold text-slate-900">{linkedQuotation?.soCode || '--'}</span>
                  </div>
                  <div className="flex items-baseline gap-2 whitespace-nowrap">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#666666]">Tổng giá trị:</span>
                    <span className="text-[14px] font-semibold text-slate-900">{formatMoney(totalValue)}</span>
                  </div>
                  <div className="flex items-baseline gap-2 whitespace-nowrap">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#666666]">Đã thu:</span>
                    <span className="text-[14px] font-semibold text-emerald-700">{formatMoney(paidValue)}</span>
                  </div>
                  <div className="flex items-baseline gap-2 whitespace-nowrap">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#666666]">Còn phải thu:</span>
                    <span className={`text-[14px] font-semibold ${remainingValue > 0 ? 'text-amber-700' : 'text-slate-900'}`}>{formatMoney(remainingValue)}</span>
                  </div>
                </div>
              </section>

              <section className="py-4">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#666666]">TRẠNG THÁI ĐỢT 1</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-[0.06em] text-slate-500">
                      <tr>
                        <th className="whitespace-nowrap py-2 pr-4">Đợt</th>
                        <th className="whitespace-nowrap py-2 pr-4">Giá trị</th>
                        <th className="whitespace-nowrap py-2">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {firstInstallmentRow ? (
                        <tr className="border-b border-slate-100 last:border-b-0">
                          <td className="whitespace-nowrap py-2 pr-4 text-[13px] font-medium text-slate-900">Đợt 1</td>
                          <td className="whitespace-nowrap py-2 pr-4 text-[13px] text-slate-700">{formatMoney(firstInstallmentRow.amount)}</td>
                          <td className="whitespace-nowrap py-2"><span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium ${compactBadgeClassByStatus(firstInstallmentRow.statusLabel === 'Đã xong' ? 'DA_DUYET' : firstInstallmentRow.statusLabel === 'Quá hạn' ? 'DUNG' : 'CHO_GHI_DANH')}`}>{firstInstallmentRow.statusLabel}</span></td>
                        </tr>
                      ) : <tr><td colSpan={3} className="py-3 text-center text-[12px] text-slate-400">No data available</td></tr>}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="pt-4">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#666666]">CÁC ĐỢT SAU</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-[0.06em] text-slate-500">
                      <tr>
                        <th className="whitespace-nowrap py-2 pr-4">Đợt</th>
                        <th className="whitespace-nowrap py-2 pr-4">Giá trị</th>
                        <th className="whitespace-nowrap py-2">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {laterInstallmentRows.length > 0 ? laterInstallmentRows.map((item) => (
                        <tr key={item.label} className="border-b border-slate-100 last:border-b-0">
                          <td className="whitespace-nowrap py-2 pr-4 text-[13px] font-medium text-slate-900">{item.label}</td>
                          <td className="whitespace-nowrap py-2 pr-4 text-[13px] text-slate-700">{formatMoney(item.amount)}</td>
                          <td className="whitespace-nowrap py-2"><span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium ${compactBadgeClassByStatus(item.statusLabel === 'Đã xong' ? 'DA_DUYET' : item.statusLabel === 'Quá hạn' ? 'DUNG' : 'CHO_GHI_DANH')}`}>{item.statusLabel}</span></td>
                        </tr>
                      )) : <tr><td colSpan={3} className="py-3 text-center text-[12px] text-slate-400">No data available</td></tr>}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </div>
        ) : null}

        {activeTab === 'claims' ? (
          <div className="order-2 px-4 py-4">
            <div className="space-y-4">
              <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Cần xử lý</div>
                  <div className="mt-1 text-xs text-slate-500">Theo dõi lịch sử claim của học viên và xử lý trực tiếp tại đây.</div>
                </div>
                <div className="flex flex-wrap gap-2">
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

              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-[0.06em] text-slate-500">
                    <tr>
                      <th className="whitespace-nowrap px-4 py-3">Mã HV</th>
                      <th className="whitespace-nowrap px-4 py-3">Học viên</th>
                      <th className="whitespace-nowrap px-4 py-3">Trạng thái học viên</th>
                      <th className="whitespace-nowrap px-4 py-3">Claim type</th>
                      <th className="whitespace-nowrap px-4 py-3">Claim status</th>
                      <th className="whitespace-nowrap px-4 py-3">Ngày tạo</th>
                      <th className="whitespace-nowrap px-4 py-3">Người tạo</th>
                      <th className="whitespace-nowrap px-4 py-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {claims.length > 0 ? claims.map((claim) => (
                      <tr key={claim.id} className="border-b border-slate-100 last:border-b-0">
                        <td className="whitespace-nowrap px-4 py-3 text-[13px] font-semibold text-indigo-700">{student.code}</td>
                        <td className="px-4 py-3">
                          <div className="text-[13px] font-semibold text-slate-900">{student.name}</div>
                          <div className="mt-1 text-[12px] text-slate-500">{claim.reason || '--'}</div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium ${compactBadgeClassByStatus(studentStatusKey)}`}>{studentStatusLabel}</span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-[13px] text-slate-700">{CLAIM_TYPE_LABELS[claim.claimType]}</td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium ${compactBadgeClassByClaimStatus(claim.claimStatus)}`}>{CLAIM_STATUS_LABELS[claim.claimStatus]}</span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-[13px] text-slate-700">{formatDateTime(claim.createdAt)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-[13px] text-slate-700">{claim.createdBy}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => openProcessClaimModal(claim)} disabled={claim.claimStatus !== 'CHO_XU_LY'} className="rounded-md border border-slate-300 bg-white px-3 py-1 text-[12px] font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40">
                              Xử lý
                            </button>
                            <button onClick={() => openCancelClaimModal(claim)} disabled={claim.claimStatus !== 'CHO_XU_LY'} className="rounded-md border border-rose-200 bg-white px-3 py-1 text-[12px] font-medium text-rose-700 disabled:cursor-not-allowed disabled:opacity-40">
                              Hủy
                            </button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={8} className="px-4 py-10 text-center text-[13px] text-slate-500">
                          Chưa có claim nào cho học viên này.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}

        {false ? (
          <div className="space-y-4 px-4 py-4">
            <section className="rounded-2xl border border-slate-200 p-4">
              <div className="mb-3 text-sm font-bold text-slate-900">Thêm ghi chú người dùng</div>
              <textarea value={noteInput} onChange={(event) => setNoteInput(event.target.value)} className="h-24 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Nhập ghi chú học vụ..." />
              <div className="mt-3 flex justify-end"><button onClick={addUserNote} disabled={!noteInput.trim()} className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Lưu ghi chú</button></div>
            </section>

            <div className="flex justify-end">
              <LogAudienceFilterControl value={logAudienceFilter} onChange={setLogAudienceFilter} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {(logAudienceFilter === 'ALL' || logAudienceFilter === 'SYSTEM') ? <section className="rounded-2xl border border-slate-200 p-4">
                <div className="mb-3 text-sm font-bold text-slate-900">Hệ thống</div>
                <div className="space-y-3">{systemLogs.length > 0 ? systemLogs.map((item) => <div key={item.id} className="rounded-xl bg-slate-50 p-3"><div className="text-sm font-semibold text-slate-900">{item.action}</div><div className="mt-1 text-sm text-slate-600">{item.message}</div><div className="mt-2 text-xs text-slate-400">{item.createdBy} • {formatDateTime(item.createdAt)}</div></div>) : <div className="text-sm text-slate-500">Chưa có log hệ thống.</div>}</div>
              </section> : null}
              {(logAudienceFilter === 'ALL' || logAudienceFilter === 'USER') ? <section className="rounded-2xl border border-slate-200 p-4">
                <div className="mb-3 text-sm font-bold text-slate-900">Người dùng</div>
                <div className="space-y-3">{userLogs.length > 0 ? userLogs.map((item) => <div key={item.id} className="rounded-xl bg-slate-50 p-3"><div className="text-sm font-semibold text-slate-900">{item.createdBy}</div><div className="mt-1 text-sm text-slate-600">{item.message}</div><div className="mt-2 text-xs text-slate-400">{formatDateTime(item.createdAt)}</div></div>) : <div className="text-sm text-slate-500">Chưa có log người dùng.</div>}</div>
              </section> : null}
            </div>
          </div>
        ) : null}
      </div>

      {showEditModal ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"><div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl"><div className="mb-4 flex items-center justify-between"><h3 className="text-lg font-bold text-slate-900">Chỉnh sửa hồ sơ học viên</h3><button onClick={closeEditModal} className="text-sm font-medium text-slate-500">Đóng</button></div><div className="grid gap-3 md:grid-cols-2"><input value={editForm.name} onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Họ tên" /><input value={editForm.dob} onChange={(event) => setEditForm((prev) => ({ ...prev, dob: event.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Ngày sinh" /><input value={editForm.phone} onChange={(event) => setEditForm((prev) => ({ ...prev, phone: event.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="SĐT" /><input value={editForm.email} onChange={(event) => setEditForm((prev) => ({ ...prev, email: event.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Email" /><input value={editForm.campus} onChange={(event) => setEditForm((prev) => ({ ...prev, campus: event.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Cơ sở mong muốn" /><input value={editForm.payerName} onChange={(event) => setEditForm((prev) => ({ ...prev, payerName: event.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Người thanh toán" /></div><textarea value={editForm.note} onChange={(event) => setEditForm((prev) => ({ ...prev, note: event.target.value }))} className="mt-3 h-24 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Ghi chú" /><div className="mt-4 flex justify-end gap-2"><button onClick={closeEditModal} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">Hủy</button><button onClick={saveProfile} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Lưu thay đổi</button></div></div></div> : null}
      {claimModalMode ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"><div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl"><div className="mb-4 flex items-center justify-between"><div><h3 className="text-lg font-bold text-slate-900">{claimModalMode === 'create' ? 'Tạo claim' : claimModalMode === 'process' ? 'Xử lý claim' : 'Hủy claim'}</h3><p className="mt-1 text-sm text-slate-500">{student.name} • {student.code}</p></div><button onClick={closeClaimModal} className="text-sm font-medium text-slate-500">Đóng</button></div><div className="space-y-3"><div className="grid gap-3 md:grid-cols-2"><div><label className="mb-1 block text-sm font-semibold text-slate-700">Claim type</label><select value={claimForm.claimType} onChange={(event) => setClaimForm((prev) => ({ ...prev, claimType: event.target.value as StudentClaimType, claimStatus: claimModalMode === 'create' && event.target.value === 'KHONG_CO' ? 'KHONG_CO' : prev.claimStatus === 'KHONG_CO' ? 'CHO_XU_LY' : prev.claimStatus }))} disabled={claimModalMode !== 'create'} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm disabled:bg-slate-50">{CLAIM_TYPE_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div><div><label className="mb-1 block text-sm font-semibold text-slate-700">Claim status</label><select value={claimModalMode === 'cancel' ? 'DA_HUY' : claimForm.claimStatus} onChange={(event) => setClaimForm((prev) => ({ ...prev, claimStatus: event.target.value as StudentClaimStatus }))} disabled={claimModalMode === 'cancel'} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm disabled:bg-slate-50">{(claimModalMode === 'process' ? CLAIM_STATUS_OPTIONS.filter((item) => ['CHO_XU_LY', 'DA_XU_LY', 'TU_CHOI'].includes(item.value)) : CLAIM_STATUS_OPTIONS).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div></div><div><label className="mb-1 block text-sm font-semibold text-slate-700">Lý do</label><textarea value={claimForm.reason} onChange={(event) => setClaimForm((prev) => ({ ...prev, reason: event.target.value }))} className="h-24 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Nhập lý do claim" /></div><div><label className="mb-1 block text-sm font-semibold text-slate-700">Ghi chú</label><textarea value={claimForm.note} onChange={(event) => setClaimForm((prev) => ({ ...prev, note: event.target.value }))} className="h-24 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder={claimModalMode === 'cancel' ? 'Nhập ghi chú hủy claim' : 'Nhập ghi chú xử lý'} /></div>{selectedClaim ? <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">Claim hiện tại: <span className="font-semibold text-slate-900">{CLAIM_TYPE_LABELS[selectedClaim.claimType]}</span> • <span className="font-semibold text-slate-900">{CLAIM_STATUS_LABELS[selectedClaim.claimStatus]}</span></div> : null}</div><div className="mt-4 flex justify-end gap-2"><button onClick={closeClaimModal} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">Hủy</button><button onClick={submitClaim} className={`rounded-xl px-4 py-2 text-sm font-semibold text-white ${claimModalMode === 'cancel' ? 'bg-rose-600' : 'bg-slate-900'}`}>{claimModalMode === 'create' ? 'Tạo claim' : claimModalMode === 'process' ? 'Lưu xử lý' : 'Xác nhận hủy'}</button></div></div></div> : null}
      {showEnrollModal ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"><div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl"><div className="mb-4 flex items-center justify-between"><h3 className="text-lg font-bold text-slate-900">Ghi danh vào lớp</h3><button onClick={() => setShowEnrollModal(false)} className="text-sm font-medium text-slate-500">Đóng</button></div><div className="space-y-3"><select value={enrollForm.quotationId} onChange={(event) => setEnrollForm((prev) => ({ ...prev, quotationId: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"><option value="">-- Chọn SO --</option>{availableLockedQuotations.map((quotation) => <option key={quotation.id} value={quotation.id}>{quotation.soCode} - {quotation.customerName}</option>)}</select><div className="grid gap-3 md:grid-cols-2"><select value={enrollForm.campusId} onChange={(event) => setEnrollForm((prev) => ({ ...prev, campusId: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm">{['Hà Nội', 'HCM', 'Đà Nẵng'].map((campus) => <option key={campus} value={campus}>{campus}</option>)}</select><select value={enrollForm.classId} onChange={(event) => setEnrollForm((prev) => ({ ...prev, classId: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"><option value="">-- Chọn lớp --</option>{classes.filter((item) => item.status === 'ACTIVE').map((item) => <option key={item.id} value={item.id}>{item.code} - {item.campus}</option>)}</select></div><textarea value={enrollForm.note} onChange={(event) => setEnrollForm((prev) => ({ ...prev, note: event.target.value }))} className="h-24 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Ghi chú" /></div><div className="mt-4 flex justify-end gap-2"><button onClick={() => setShowEnrollModal(false)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">Hủy</button><button onClick={submitEnroll} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Lưu ghi danh</button></div></div></div> : null}
      {showTransferModal ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"><div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl"><div className="mb-4 flex items-center justify-between"><h3 className="text-lg font-bold text-slate-900">Chuyển lớp</h3><button onClick={() => setShowTransferModal(false)} className="text-sm font-medium text-slate-500">Đóng</button></div><div className="space-y-3"><div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">Lớp hiện tại: <span className="font-semibold text-slate-900">{currentClass?.code || currentClassStudent?.classId || '--'}</span></div><select value={transferForm.classId} onChange={(event) => setTransferForm((prev) => ({ ...prev, classId: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"><option value="">-- Chọn lớp đích --</option>{classOptions.map((item) => <option key={item.id} value={item.id}>{item.code} - {item.campus}</option>)}</select><textarea value={transferForm.note} onChange={(event) => setTransferForm((prev) => ({ ...prev, note: event.target.value }))} className="h-24 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Lý do chuyển lớp" /></div><div className="mt-4 flex justify-end gap-2"><button onClick={() => setShowTransferModal(false)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">Hủy</button><button onClick={submitTransfer} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Xác nhận chuyển lớp</button></div></div></div> : null}
    </div>
  );
};

export default ContractStudentDetail;
