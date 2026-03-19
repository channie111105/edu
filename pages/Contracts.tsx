import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Settings, SlidersHorizontal } from 'lucide-react';
import ClassCodeLookupInput from '../components/ClassCodeLookupInput';
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
  getStudentClaims,
  getStudents,
  getTeachers,
  getTrainingClasses,
  quotationLinksToStudent,
  transferStudentClass,
  updateAdmission,
  updateStudent
} from '../utils/storage';
import { approveAdmission, cancelAdmission, createAdmission } from '../services/enrollmentFlow.service';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { decodeMojibakeReactNode, decodeMojibakeText } from '../utils/mojibake';

type EnrollmentTabKey = 'waiting_enrollment' | 'waiting_approval' | 'enrolled' | 'processing' | 'students' | 'all';
type GroupByKey = 'campus' | 'program' | 'currentClass' | 'studentStatus' | 'admissionStatus';
type AdvancedFilterFieldKey = 'campus' | 'program' | 'currentClass' | 'studentStatus' | 'admissionStatus' | 'claimStatus';
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
  currentClassLabel: string;
  studentStatusKey: StudentLifecycleStatus;
  studentStatusLabel: string;
  admissionStatusKey: AdmissionDisplayStatus;
  admissionStatusLabel: string;
  claimStatusKey: StudentClaimStatus;
  claimStatusLabel: string;
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

const GROUP_BY_OPTIONS: Array<{ value: GroupByKey; label: string }> = [
  { value: 'campus', label: 'NhÃ³m theo cÆ¡ sá»Ÿ' },
  { value: 'program', label: 'NhÃ³m theo chÆ°Æ¡ng trÃ¬nh' },
  { value: 'currentClass', label: 'NhÃ³m theo lá»›p hiá»‡n táº¡i' },
  { value: 'studentStatus', label: 'NhÃ³m theo tráº¡ng thÃ¡i há»c viÃªn' },
  { value: 'admissionStatus', label: 'NhÃ³m theo tráº¡ng thÃ¡i ghi danh' }
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

const ADVANCED_FILTER_FIELDS: Array<{ key: AdvancedFilterFieldKey; label: string }> = [
  { key: 'campus', label: 'Cơ sở' },
  { key: 'program', label: 'Chương trình' },
  { key: 'currentClass', label: 'Lớp hiện tại' },
  { key: 'studentStatus', label: 'Trạng thái học viên' },
  { key: 'admissionStatus', label: 'Trạng thái ghi danh' },
  { key: 'claimStatus', label: 'Trạng thái claim' }
];

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
  const [claims, setClaims] = useState<IStudentClaim[]>([]);
  const [activeTab, setActiveTab] = useState<EnrollmentTabKey>('all');
  const [search, setSearch] = useState('');
  const [campusFilter, setCampusFilter] = useState('all');
  const [programFilter, setProgramFilter] = useState('all');
  const [currentClassFilter, setCurrentClassFilter] = useState('all');
  const [studentStatusFilter, setStudentStatusFilter] = useState<'all' | StudentLifecycleStatus>('all');
  const [admissionStatusFilter, setAdmissionStatusFilter] = useState<'all' | AdmissionDisplayStatus>('all');
  const [claimStatusFilter, setClaimStatusFilter] = useState<'all' | Exclude<StudentClaimStatus, 'KHONG_CO'>>('all');
  const [groupBy, setGroupBy] = useState<GroupByKey[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [activeAdvancedFilterField, setActiveAdvancedFilterField] = useState<AdvancedFilterFieldKey>('campus');
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
  const [assignForm, setAssignForm] = useState({ classId: '', classCode: '', note: '' });

  const loadData = () => {
    setAdmissions(getAdmissions());
    setStudents(getStudents());
    setQuotations(getQuotations());
    setClassStudents(getClassStudents());
    setClasses(getTrainingClasses());
    setContracts(getContracts());
    setTeachers(getTeachers());
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
        const currentClassLabel =
          currentClass?.code ||
          currentClassStudent?.classId ||
          latestAdmission?.classId ||
          ((student.enrollmentStatus === 'DA_GHI_DANH' || student.status === StudentStatus.ENROLLED) ? student.className || '--' : '--');
        const studentStatusKey = resolveStudentStatus(student, latestAdmission, currentClassStudent, currentClass, lockedQuotation);
        const admissionStatusKey: AdmissionDisplayStatus =
          latestAdmission?.status === 'DA_DUYET'
            ? 'DA_DUYET'
            : latestAdmission?.status === 'CHO_DUYET'
              ? 'CHO_DUYET'
              : 'CHUA_TAO';
        const claimStatusKey: StudentClaimStatus = latestClaim?.claimStatus || 'KHONG_CO';
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
          currentClassLabel,
          studentStatusKey,
          studentStatusLabel: STUDENT_STATUS_LABELS[studentStatusKey],
          admissionStatusKey,
          admissionStatusLabel: ADMISSION_STATUS_LABELS[admissionStatusKey],
          claimStatusKey,
          claimStatusLabel: CLAIM_STATUS_LABELS[claimStatusKey],
          canEnroll,
          canCancelAdmission,
          needsProcessing: processingReasons.length > 0 || !!activeClaim,
          processingReasons
        };
      })
      .filter(Boolean) as StudentEnrollmentRow[];
  }, [admissions, claims, classStudents, classes, contracts, quotations, students, teachers]);

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

  const filteredRows = useMemo(() => {
    const byTab = studentRows.filter((row) => {
      if (activeTab === 'students') {
        if (claimStatusFilter !== 'all') return row.claimStatusKey === claimStatusFilter;
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
          row.desiredCampus,
          row.currentClassLabel,
          row.currentClass?.level,
          row.teacher?.fullName,
          row.studentStatusLabel,
          row.admissionStatusLabel,
          row.claimStatusLabel,
          row.processingReasons.join(' ')
        ]
          .map(normalizeText)
          .join(' ')
          .includes(query);

      const campusMatch = campusFilter === 'all' || row.desiredCampus === campusFilter || row.currentClass?.campus === campusFilter;
      const programMatch = programFilter === 'all' || row.lockedQuotation?.product === programFilter;
      const currentClassMatch = currentClassFilter === 'all' || row.currentClassLabel === currentClassFilter;
      const studentStatusMatch = studentStatusFilter === 'all' || row.studentStatusKey === studentStatusFilter;
      const admissionStatusMatch = admissionStatusFilter === 'all' || row.admissionStatusKey === admissionStatusFilter;
      const claimStatusMatch = activeTab !== 'students' || claimStatusFilter === 'all' || row.claimStatusKey === claimStatusFilter;

      return searchMatch && campusMatch && programMatch && currentClassMatch && studentStatusMatch && admissionStatusMatch && claimStatusMatch;
    });
  }, [activeTab, admissionStatusFilter, campusFilter, claimStatusFilter, currentClassFilter, programFilter, search, studentRows, studentStatusFilter]);

  const groupedRows = useMemo(() => {
    if (!groupBy.length) return [{ key: 'all', label: `Táº¥t cáº£ (${filteredRows.length})`, rows: filteredRows }];

    const getGroupValue = (row: StudentEnrollmentRow, field: GroupByKey) => {
      if (field === 'campus') return row.desiredCampus || '--';
      if (field === 'program') return row.lockedQuotation?.product || '--';
      if (field === 'currentClass') return row.currentClassLabel || '--';
      if (field === 'studentStatus') return row.studentStatusLabel;
      return row.admissionStatusLabel;
    };

    const buildGroups = (rows: StudentEnrollmentRow[], fields: GroupByKey[], path: string[] = []) => {
      if (!fields.length) {
        const label = `${path.join(' / ')} (${rows.length})`;
        return [{ key: path.join('||') || 'all', label, rows }];
      }

      const [currentField, ...restFields] = fields;
      const groups = new Map<string, StudentEnrollmentRow[]>();

      rows.forEach((row) => {
        const key = getGroupValue(row, currentField);
        groups.set(key, [...(groups.get(key) || []), row]);
      });

      return Array.from(groups.entries())
        .sort((left, right) => left[0].localeCompare(right[0]))
        .flatMap(([key, nestedRows]) => buildGroups(nestedRows, restFields, [...path, key]));
    };

    return buildGroups(filteredRows, groupBy);
  }, [filteredRows, groupBy]);

  const filteredRowIds = useMemo(() => filteredRows.map((row) => row.student.id), [filteredRows]);
  const selectedRows = useMemo(
    () => studentRows.filter((row) => selectedStudentIds.includes(row.student.id)),
    [selectedStudentIds, studentRows]
  );
  const allFilteredSelected = filteredRowIds.length > 0 && filteredRowIds.every((id) => selectedStudentIds.includes(id));

  const campusOptions = useMemo(() => {
    const source = new Set<string>();
    studentRows.forEach((row) => {
      if (row.desiredCampus) source.add(row.desiredCampus);
      if (row.currentClass?.campus) source.add(row.currentClass.campus);
    });
    return Array.from(source).sort();
  }, [studentRows]);

  const programOptions = useMemo(() => {
    const source = new Set<string>();
    studentRows.forEach((row) => {
      if (row.lockedQuotation?.product) source.add(row.lockedQuotation.product);
    });
    return Array.from(source).sort();
  }, [studentRows]);

  const currentClassOptions = useMemo(() => {
    const source = new Set<string>();
    studentRows.forEach((row) => {
      if (row.currentClassLabel && row.currentClassLabel !== '--') source.add(row.currentClassLabel);
    });
    return Array.from(source).sort();
  }, [studentRows]);

  const advancedFilterCount = useMemo(() => {
    let count = 0;
    if (campusFilter !== 'all') count += 1;
    if (programFilter !== 'all') count += 1;
    if (currentClassFilter !== 'all') count += 1;
    if (studentStatusFilter !== 'all') count += 1;
    if (admissionStatusFilter !== 'all') count += 1;
    if (claimStatusFilter !== 'all') count += 1;
    count += groupBy.length;
    return count;
  }, [admissionStatusFilter, campusFilter, claimStatusFilter, currentClassFilter, groupBy, programFilter, studentStatusFilter]);

  const resetAdvancedFilters = () => {
    setCampusFilter('all');
    setProgramFilter('all');
    setCurrentClassFilter('all');
    setStudentStatusFilter('all');
    setAdmissionStatusFilter('all');
    setClaimStatusFilter('all');
    setGroupBy([]);
  };

  const activeAdvancedFilterLabel =
    ADVANCED_FILTER_FIELDS.find((field) => field.key === activeAdvancedFilterField)?.label || 'Bộ lọc';

  const findActiveClass = (value?: string) => {
    const normalizedValue = normalizeText(value?.trim());
    if (!normalizedValue) return undefined;
    return activeClasses.find(
      (item) => normalizeText(item.id) === normalizedValue || normalizeText(item.code) === normalizedValue
    );
  };

  const selectedDesiredClass = useMemo(
    () => findActiveClass(form.classId) || findActiveClass(form.classCode),
    [activeClasses, form.classCode, form.classId]
  );
  const selectedAssignClass = useMemo(
    () => findActiveClass(assignForm.classId) || findActiveClass(assignForm.classCode),
    [activeClasses, assignForm.classCode, assignForm.classId]
  );

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setSelectedEnrollRow(null);
    setForm({
      studentId: '',
      quotationId: '',
      campusId: text('HÃ  Ná»™i'),
      classId: '',
      classCode: '',
      note: ''
    });
  };

  const closeAssignModal = () => {
    setShowAssignModal(false);
    setSelectedAssignRow(null);
    setAssignForm({ classId: '', classCode: '', note: '' });
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
      campusId: selectedStudent?.campus || prev.campusId
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
    setForm({
      studentId: row?.student.id || '',
      quotationId: row?.lockedQuotation?.id || '',
      campusId: row?.desiredCampus || row?.student.campus || text('HÃ  Ná»™i'),
      classId: row?.currentClass?.id || '',
      classCode: row?.currentClass?.code || '',
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
  const isStudentTab = activeTab === 'students';
  const isClaimFocusedTab = activeTab === 'processing' || isStudentTab;
  const isBatchEnrollMode = !selectedEnrollRow && selectedStudentIds.length > 0;
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
      campusId: text('HÃ  Ná»™i'),
      classId: '',
      classCode: '',
      note: ''
    });
    setShowCreateModal(true);
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
    setAssignForm({ classId: '', classCode: '', note: '' });
    setShowAssignModal(true);
  };

  const openAssign = (row?: StudentEnrollmentRow) => {
    const initialValue = row?.latestAdmission?.classId || row?.currentClass?.id || row?.currentClass?.code || '';
    const initialClass = findActiveClass(initialValue);

    setSelectedAssignRow(row || null);
    setAssignForm({
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
    selectedAssignableRows.forEach((row) => {
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
    closeAssignModal();
    setSelectedStudentIds([]);
    loadData();
    notify(`ÄÃ£ gÃ¡n lá»›p ${targetClass.code} cho ${selectedAssignableRows.length} há»c viÃªn.`);
  };

  return decodeMojibakeReactNode(
    <div className="mx-auto max-w-7xl p-6 font-sans text-slate-800">
      <div className="mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Học viên</h1>
          <p className="mt-1 text-sm text-slate-500">5 tab dùng để phân loại hoặc đổi góc nhìn hồ sơ. Bộ lọc và group by phía dưới áp dụng chung cho toàn bộ dữ liệu.</p>
        </div>
      </div>

      <div className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative xl:flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="TÃ¬m kiáº¿m theo mÃ£ há»c viÃªn, SO, chÆ°Æ¡ng trÃ¬nh, lá»›p..."
              className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-slate-500"
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row xl:flex-none">
            <button
              type="button"
              onClick={() => setShowAdvancedFilters((prev) => !prev)}
              className="inline-flex min-w-[190px] items-center justify-between rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
            >
              <span className="inline-flex items-center gap-2">
                <SlidersHorizontal size={16} />
                {advancedFilterCount ? `Lá»c nÃ¢ng cao (${advancedFilterCount})` : 'Lá»c nÃ¢ng cao'}
              </span>
              <span className={['text-xs text-slate-400 transition', showAdvancedFilters ? 'rotate-180' : ''].join(' ')}>▼</span>
            </button>
          </div>
        </div>

        {showAdvancedFilters ? (
          <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/60">
            <div className="grid divide-y divide-slate-200 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
              <div className="p-5">
                <div className="mb-2 text-lg font-semibold text-slate-900">Filter</div>
                <p className="mb-4 text-sm text-slate-500">Chọn trường học viên để lọc. Sau đó chọn giá trị tương ứng ở khung bên phải.</p>
                <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                  <div className="max-h-72 overflow-y-auto pr-1">
                    {ADVANCED_FILTER_FIELDS.map((field) => (
                      <button
                        key={field.key}
                        type="button"
                        onClick={() => setActiveAdvancedFilterField(field.key)}
                        className={[
                          'flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm transition',
                          activeAdvancedFilterField === field.key
                            ? 'bg-blue-50 font-semibold text-blue-900'
                            : 'text-slate-700 hover:bg-white'
                        ].join(' ')}
                      >
                        {field.label}
                      </button>
                    ))}
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-sm font-semibold text-slate-900">{activeAdvancedFilterLabel}</div>
                    <div className="mt-3">
                      {activeAdvancedFilterField === 'campus' ? (
                        <select value={campusFilter} onChange={(event) => setCampusFilter(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
                          <option value="all">Tất cả cơ sở</option>
                          {campusOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                      ) : null}
                      {activeAdvancedFilterField === 'program' ? (
                        <select value={programFilter} onChange={(event) => setProgramFilter(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
                          <option value="all">Tất cả chương trình</option>
                          {programOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                      ) : null}
                      {activeAdvancedFilterField === 'currentClass' ? (
                        <select value={currentClassFilter} onChange={(event) => setCurrentClassFilter(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
                          <option value="all">Tất cả lớp hiện tại</option>
                          {currentClassOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                      ) : null}
                      {activeAdvancedFilterField === 'studentStatus' ? (
                        <select value={studentStatusFilter} onChange={(event) => setStudentStatusFilter(event.target.value as 'all' | StudentLifecycleStatus)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
                          <option value="all">Tất cả trạng thái học viên</option>
                          {Object.entries(STUDENT_STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                        </select>
                      ) : null}
                      {activeAdvancedFilterField === 'admissionStatus' ? (
                        <select value={admissionStatusFilter} onChange={(event) => setAdmissionStatusFilter(event.target.value as 'all' | AdmissionDisplayStatus)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
                          <option value="all">Tất cả trạng thái ghi danh</option>
                          {Object.entries(ADMISSION_STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                        </select>
                      ) : null}
                      {activeAdvancedFilterField === 'claimStatus' ? (
                        <select value={claimStatusFilter} onChange={(event) => setClaimStatusFilter(event.target.value as 'all' | Exclude<StudentClaimStatus, 'KHONG_CO'>)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
                          <option value="all">Tất cả trạng thái claim</option>
                          {(['CHO_XU_LY', 'DA_XU_LY', 'TU_CHOI', 'DA_HUY'] as Array<Exclude<StudentClaimStatus, 'KHONG_CO'>>).map((status) => (
                            <option key={status} value={status}>{CLAIM_STATUS_LABELS[status]}</option>
                          ))}
                        </select>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-5">
                <div className="mb-2 text-lg font-semibold text-slate-900">Group by</div>
                <p className="mb-4 text-sm text-slate-500">Có thể chọn nhiều trường để gom nhóm. Thứ tự bấm sẽ là thứ tự nhóm hiển thị.</p>
                <div className="max-h-72 overflow-y-auto pr-1">
                  <button
                    type="button"
                    onClick={() => setGroupBy([])}
                    className={[
                      'mb-1 flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm transition',
                      !groupBy.length
                        ? 'bg-blue-50 font-semibold text-blue-900'
                        : 'text-slate-700 hover:bg-white'
                    ].join(' ')}
                  >
                    Không nhóm
                  </button>
                  {GROUP_BY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setGroupBy((prev) => (
                        prev.includes(option.value)
                          ? prev.filter((item) => item !== option.value)
                          : [...prev, option.value]
                      ))}
                      className={[
                        'flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm transition',
                        groupBy.includes(option.value)
                          ? 'bg-blue-50 font-semibold text-blue-900'
                          : 'text-slate-700 hover:bg-white'
                      ].join(' ')}
                    >
                      <span className="flex-1">{option.label}</span>
                      {groupBy.includes(option.value) ? (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                          {groupBy.indexOf(option.value) + 1}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div className="text-xs font-medium text-slate-500">Äang hiá»ƒn thá»‹ {filteredRows.length} há»“ sÆ¡ sau khi lá»c.{selectedStudentIds.length ? ` ÄÃ£ chá»n ${selectedStudentIds.length} há»c viÃªn.` : ''}</div>
          {advancedFilterCount ? (
            <button type="button" onClick={resetAdvancedFilters} className="text-xs font-semibold text-blue-700 hover:text-blue-800">
              XÃ³a lá»c nÃ¢ng cao
            </button>
          ) : null}
        </div>
      </div>

      <div className="sticky top-0 z-20 mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
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
                <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                  <button onClick={openActionEnroll} className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50">Ghi danh</button>
                  <button onClick={openActionAssign} className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50">GÃ¡n lá»›p</button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="space-y-4">
        {groupedRows.map((group) => (
          <section key={group.key} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {groupBy.length ? <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">{group.label}</div> : null}
            <div className="overflow-hidden">
              {isClaimFocusedTab ? (
                <table className="w-full table-fixed text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase text-slate-500">
                    <tr>
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
                    {group.rows.length > 0 ? group.rows.map((row) => (
                      (() => {
                        const displayClaim = row.activeClaim || row.latestClaim;
                        return (
                          <tr key={row.student.id} onClick={() => openStudentClaims(row.student.id)} className="cursor-pointer hover:bg-slate-50">
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
                      <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-500">Không có học viên phù hợp với bộ lọc hiện tại.</td></tr>
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
                  {group.rows.length > 0 ? group.rows.map((row) => (
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
                        {activeTab === 'processing' && row.processingReasons.length ? (
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
                                Ghi danh
                              </button>
                              <button
                                onClick={(event) => { event.stopPropagation(); openStudentProfile(row.student.id); }}
                                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                Xem hồ sơ
                              </button>
                            </>
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
                    <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-500">KhÃ´ng cÃ³ há»c viÃªn phÃ¹ há»£p vá»›i bá»™ lá»c hiá»‡n táº¡i.</td></tr>
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
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Lá»›p há»c mong muá»‘n</label>
                <ClassCodeLookupInput
                  value={form.classCode}
                  onChange={(value) => setForm((prev) => ({ ...prev, classCode: value, classId: findActiveClass(value)?.id || '' }))}
                  loadOptions={() =>
                    activeClasses.map((item) => ({
                      code: item.code,
                      name: item.name,
                      campus: item.campus,
                      schedule: item.schedule,
                      level: item.level,
                      classType: item.classType,
                      status: item.status
                    }))
                  }
                  placeholder="Nháº­p hoáº·c tÃ¬m theo mÃ£ lá»›p"
                  wrapperClassName="w-full"
                  inputClassName="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
                  buttonClassName="rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                />
                {selectedDesiredClass ? (
                  <div className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    <span className="font-semibold text-slate-900">{selectedDesiredClass.code}</span>
                    {selectedDesiredClass.campus ? ` â€¢ ${selectedDesiredClass.campus}` : ''}
                    {selectedDesiredClass.level ? ` â€¢ ${selectedDesiredClass.level}` : ''}
                    {selectedDesiredClass.schedule ? <span className="block">{selectedDesiredClass.schedule}</span> : null}
                  </div>
                ) : null}
              </div>
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

            <div className="mt-3">
              <label className="mb-1 block text-sm font-semibold text-slate-700">{selectedAssignRow ? 'Danh sách lớp' : 'Lớp đích'}</label>
              <ClassCodeLookupInput
                value={assignForm.classCode}
                onChange={(value) => setAssignForm((prev) => ({ ...prev, classCode: value, classId: findActiveClass(value)?.id || '' }))}
                loadOptions={() =>
                  activeClasses.map((item) => ({
                    code: item.code,
                    name: item.name,
                    campus: item.campus,
                    schedule: item.schedule,
                    level: item.level,
                    classType: item.classType,
                    status: item.status
                  }))
                }
                placeholder="Nháº­p hoáº·c tÃ¬m theo mÃ£ lá»›p"
                wrapperClassName="w-full"
                inputClassName="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
                buttonClassName="rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              />
              {selectedAssignClass ? (
                <div className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  <span className="font-semibold text-slate-900">{selectedAssignClass.code}</span>
                  {selectedAssignClass.campus ? ` • ${selectedAssignClass.campus}` : ''}
                  {selectedAssignClass.level ? ` • ${selectedAssignClass.level}` : ''}
                  {selectedAssignClass.schedule ? <span className="block">{selectedAssignClass.schedule}</span> : null}
                </div>
              ) : null}
            </div>

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
