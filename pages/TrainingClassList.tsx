import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, FileSpreadsheet, NotebookPen, Plus, Save, Settings2, ChevronRight, Filter, Rows3 } from 'lucide-react';
import LogAudienceFilterControl from '../components/LogAudienceFilter';
import PinnedSearchInput, { PinnedSearchChip } from '../components/PinnedSearchInput';
import { decodeMojibakeReactNode, decodeMojibakeText } from '../utils/mojibake';
import {
  AttendanceStatus,
  IAttendanceRecord,
  IClassSession,
  IClassStudent,
  IStudent,
  IStudentScore,
  IStudyNote,
  ITeacher,
  ITrainingClass
} from '../types';
import {
  addClassLog,
  addStudentToClass,
  createTrainingClass,
  ensureDefaultSessionsForClass,
  getAttendanceByClassId,
  getClassStudents,
  getLogNotes,
  getQuotations,
  getSessionsByClassId,
  getStudentScoresByClassId,
  getStudents,
  getStudyNotesByClassId,
  getTeachers,
  getTrainingClasses,
  markDebtTermPaid,
  removeStudentFromClass,
  saveClassStudents,
  transferStudentClass,
  updateClassStatus,
  updateClassSession,
  upsertAttendance,
  upsertStudentScore,
  upsertStudyNote
} from '../utils/storage';
import { filterByLogAudience, getILogNoteAudience, LogAudienceFilter } from '../utils/logAudience';

const STATUS = ['DRAFT', 'ACTIVE', 'DONE', 'CANCELED'] as const;
const STATUS_LABEL: Record<ITrainingClass['status'], string> = {
  DRAFT: 'Nháp',
  ACTIVE: 'Đang học',
  DONE: 'Đã kết thúc',
  CANCELED: 'Đã hủy'
};
const STATUS_BADGE: Record<ITrainingClass['status'], string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  ACTIVE: 'bg-blue-100 text-blue-700',
  DONE: 'bg-emerald-100 text-emerald-700',
  CANCELED: 'bg-rose-100 text-rose-700'
};
const CLASS_TYPE_LABEL: Record<NonNullable<ITrainingClass['classType']>, string> = {
  Offline: 'Offline',
  Online: 'Online',
  App: 'App'
};
const ATTENDANCE_LABEL: Record<AttendanceStatus, string> = {
  PRESENT: 'Có mặt',
  ABSENT: 'Vắng',
  LATE: 'Muộn'
};
const ATTENDANCE_BADGE: Record<AttendanceStatus, string> = {
  PRESENT: 'bg-emerald-100 text-emerald-700',
  ABSENT: 'bg-rose-100 text-rose-700',
  LATE: 'bg-amber-100 text-amber-700'
};
const ATTENDANCE_SHORT_CODE_TO_STATUS: Record<string, AttendanceStatus> = {
  C: 'PRESENT',
  V: 'ABSENT',
  M: 'LATE'
};
const ATTENDANCE_STATUS_TO_SHORT_CODE: Record<AttendanceStatus, string> = {
  PRESENT: 'C',
  ABSENT: 'V',
  LATE: 'M'
};
const ATTENDANCE_CELL_CLASS: Record<AttendanceStatus, string> = {
  PRESENT: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  ABSENT: 'border-rose-200 bg-rose-50 text-rose-700',
  LATE: 'border-amber-200 bg-amber-50 text-amber-700'
};
const fd = (v?: string) => (v ? new Date(v).toLocaleDateString('vi-VN') : '-');
const formatMoney = (value: number) => value.toLocaleString('vi-VN') + ' đ';
const truncateText = (value: string, maxLength: number) => {
  const normalized = decodeMojibakeText(value);
  return normalized.length > maxLength ? `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…` : normalized;
};
const DEBT_LABEL: Record<NonNullable<IClassStudent['debtStatus']>, string> = {
  DA_DONG: 'Đã đóng',
  THIEU: 'Thiếu',
  QUA_HAN: 'Quá hạn'
};
const DEBT_BADGE: Record<NonNullable<IClassStudent['debtStatus']>, string> = {
  DA_DONG: 'bg-emerald-100 text-emerald-700',
  THIEU: 'bg-amber-100 text-amber-700',
  QUA_HAN: 'bg-red-100 text-red-700'
};
const DAY_OPTIONS = [
  { value: 1, label: 'T2' },
  { value: 2, label: 'T3' },
  { value: 3, label: 'T4' },
  { value: 4, label: 'T5' },
  { value: 5, label: 'T6' },
  { value: 6, label: 'T7' },
  { value: 0, label: 'CN' }
] as const;
const TIME_SLOT_OPTIONS = ['08:00 - 10:00', '10:00 - 12:00', '13:30 - 15:30', '15:30 - 17:30', '18:30 - 20:30', '19:00 - 21:00'];

type Row = { member: IClassStudent; student?: IStudent; score?: IStudentScore };
type PrimaryTabKey = 'students' | 'level' | 'logs';
type LevelTabKey = 'attendance' | 'grades';
type AttendanceDraft = Record<string, AttendanceStatus | ''>;
type NoteModalState = { studentId: string; studentName: string; sessionId: string; note: string };
type ClassListColumnKey = 'code' | 'level' | 'timeSlot' | 'studyDays' | 'teacher' | 'size' | 'language' | 'classType' | 'startDate' | 'endDate' | 'campus' | 'status';
type QuickActionKey = 'startDate' | 'endDate' | ITrainingClass['status'];
type TimeRangeType = 'all' | 'today' | 'yesterday' | 'thisWeek' | 'last7Days' | 'last30Days' | 'thisMonth' | 'lastMonth' | 'custom';
type ClassGroupByKey = 'status' | 'campus' | 'teacher' | 'level' | 'classType' | 'language';
type CreateClassFormState = {
  code: string;
  name: string;
  campus: string;
  room: string;
  level: string;
  classType: NonNullable<ITrainingClass['classType']>;
  language: string;
  maxStudents: number;
  startDate: string;
  endDate: string;
  teacherId: string;
  studyDays: number[];
  timeSlot: string;
  sourceClassId: string;
  promotedStudentIds: string[];
};
type ClassListColumn = {
  key: ClassListColumnKey;
  label: string;
  defaultVisible: boolean;
  required?: boolean;
  align?: 'left' | 'center';
};

const CLASS_LIST_VISIBLE_COLUMNS_KEY = 'educrm_training_class_list_visible_columns';
const CLASS_LIST_COLUMNS: ClassListColumn[] = [
  { key: 'code', label: 'Mã lớp', defaultVisible: true, required: true },
  { key: 'level', label: 'Trình độ', defaultVisible: true },
  { key: 'timeSlot', label: 'Ca dạy', defaultVisible: true },
  { key: 'studyDays', label: 'Buổi', defaultVisible: false },
  { key: 'teacher', label: 'GV', defaultVisible: true },
  { key: 'size', label: 'Sĩ số', defaultVisible: true, align: 'center' },
  { key: 'language', label: 'Ngôn ngữ', defaultVisible: false },
  { key: 'classType', label: 'Hình thức', defaultVisible: false },
  { key: 'startDate', label: 'Ngày bắt đầu', defaultVisible: false },
  { key: 'endDate', label: 'Ngày kết thúc', defaultVisible: false },
  { key: 'campus', label: 'Cơ sở', defaultVisible: true },
  { key: 'status', label: 'Trạng thái', defaultVisible: true }
] as const;
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
const QUICK_ACTION_OPTIONS: Array<{ key: QuickActionKey; label: string }> = [
  { key: 'startDate', label: 'Ngày bắt đầu' },
  { key: 'endDate', label: 'Ngày kết thúc' },
  { key: 'DRAFT', label: 'Nháp' },
  { key: 'ACTIVE', label: 'Đang học' },
  { key: 'DONE', label: 'Đã kết thúc' },
  { key: 'CANCELED', label: 'Đã hủy' }
];
const GROUP_BY_OPTIONS: Array<{ key: ClassGroupByKey; label: string }> = [
  { key: 'status', label: 'Trạng thái' },
  { key: 'campus', label: 'Cơ sở' },
  { key: 'teacher', label: 'Giáo viên' },
  { key: 'level', label: 'Trình độ' },
  { key: 'classType', label: 'Hình thức' },
  { key: 'language', label: 'Ngôn ngữ' }
];

const attendanceKey = (studentId: string, sessionId: string) => `${studentId}__${sessionId}`;
const getTodayDateOnly = () => {
  const current = new Date();
  const year = current.getFullYear();
  const month = `${current.getMonth() + 1}`.padStart(2, '0');
  const day = `${current.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const formatStudyDays = (studyDays?: number[]) =>
  (studyDays || [])
    .slice()
    .sort((a, b) => a - b)
    .map((day) => DAY_OPTIONS.find((option) => option.value === day)?.label || '')
    .filter(Boolean)
    .join(', ') || '-';
const getLegacyStudyDays = (schedule?: string) => {
  if (!schedule) return [];
  const parts = schedule.split(' ')[0]?.split('-') || [];
  let hasTPrefix = false;
  return parts
    .map((part) => part.trim().toUpperCase())
    .map((part) => {
      if (part === 'CN') return 0;
      if (part.startsWith('T')) hasTPrefix = true;
      const normalized = part.startsWith('T') ? part.slice(1) : hasTPrefix ? part : '';
      const numeric = Number.parseInt(normalized, 10);
      return Number.isFinite(numeric) && numeric >= 2 && numeric <= 7 ? numeric - 1 : null;
    })
    .filter((value): value is number => value !== null);
};
const getLegacyTimeSlot = (schedule?: string) => {
  if (!schedule) return '';
  return schedule.split(' ').slice(1).join(' ');
};
const getClassStudyDays = (classItem: ITrainingClass) => (classItem.studyDays?.length ? classItem.studyDays : getLegacyStudyDays(classItem.schedule));
const getClassTimeSlot = (classItem: ITrainingClass) => classItem.timeSlot || getLegacyTimeSlot(classItem.schedule);
const toDateInputValue = (value: Date) => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const getDefaultVisibleClassColumns = () => CLASS_LIST_COLUMNS.filter((column) => column.defaultVisible).map((column) => column.key);
const getInitialVisibleClassColumns = (): ClassListColumnKey[] => {
  if (typeof window === 'undefined') return getDefaultVisibleClassColumns();

  try {
    const raw = window.localStorage.getItem(CLASS_LIST_VISIBLE_COLUMNS_KEY);
    if (!raw) return getDefaultVisibleClassColumns();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return getDefaultVisibleClassColumns();
    const validKeys = new Set(CLASS_LIST_COLUMNS.map((column) => column.key));
    const next = parsed.filter((value): value is ClassListColumnKey => typeof value === 'string' && validKeys.has(value as ClassListColumnKey));
    return next.length ? next : getDefaultVisibleClassColumns();
  } catch {
    return getDefaultVisibleClassColumns();
  }
};
const getDefaultCreateClassForm = (): CreateClassFormState => ({
  code: '',
  name: '',
  campus: 'Hà Nội',
  room: '',
  level: 'A1',
  classType: 'Offline',
  language: 'Tiếng Đức',
  maxStudents: 25,
  startDate: '',
  endDate: '',
  teacherId: '',
  studyDays: [1, 3, 5],
  timeSlot: TIME_SLOT_OPTIONS[4],
  sourceClassId: '',
  promotedStudentIds: []
});

const normalizeClassCode = (value: string) => {
  const trimmed = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const digits = trimmed.replace(/^GERK?/, '').replace(/\D/g, '').slice(0, 3);
  return `GER-K${digits.padStart(3, '0')}`;
};

const getNextGerClassCode = (classes: ITrainingClass[]) => {
  const maxNumber = classes.reduce((max, item) => {
    const match = item.code?.toUpperCase().match(/^GER-K(\d{3})$/);
    return match ? Math.max(max, Number.parseInt(match[1], 10)) : max;
  }, 0);
  return `GER-K${String(maxNumber + 1).padStart(3, '0')}`;
};

const normalizeSessionTitle = (value?: string) => {
  const raw = (value || '').trim();
  if (!raw) return '';
  if (/[ÃƒÃ‚]/.test(raw) || raw.includes('\uFFFD')) return '';
  return raw;
};

const getSessionLabel = (session?: IClassSession) => {
  if (!session) return 'N/A';
  const title = normalizeSessionTitle(session.title);
  return title ? `Buổi ${session.order} - ${title}` : `Buổi ${session.order}`;
};

const getSessionShortTitle = (session: IClassSession) => {
  const title = normalizeSessionTitle(session.title);
  if (!title) return `Buổi ${session.order}`;
  return title.length > 24 ? `${title.slice(0, 24)}...` : title;
};

const TrainingClassList: React.FC = () => {
  const [classes, setClasses] = useState<ITrainingClass[]>([]);
  const [teachers, setTeachers] = useState<ITeacher[]>([]);
  const [students, setStudents] = useState<IStudent[]>([]);
  const [members, setMembers] = useState<IClassStudent[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [primaryTab, setPrimaryTab] = useState<PrimaryTabKey>('students');
  const [levelTab, setLevelTab] = useState<LevelTabKey>('attendance');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ITrainingClass['status']>('ALL');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [teacherFilter, setTeacherFilter] = useState('ALL');
  const [campusFilter, setCampusFilter] = useState('ALL');
  const [languageFilter, setLanguageFilter] = useState('ALL');
  const [classTypeFilter, setClassTypeFilter] = useState<'ALL' | NonNullable<ITrainingClass['classType']>>('ALL');
  const [roomFilter, setRoomFilter] = useState('ALL');
  const [studyDayFilter, setStudyDayFilter] = useState<'ALL' | `${number}`>('ALL');
  const [timeSlotFilter, setTimeSlotFilter] = useState('ALL');
  const [quickAction, setQuickAction] = useState<QuickActionKey>('startDate');
  const [timeRangeType, setTimeRangeType] = useState<TimeRangeType>('all');
  const [startDateFromFilter, setStartDateFromFilter] = useState('');
  const [endDateToFilter, setEndDateToFilter] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [groupBy, setGroupBy] = useState<ClassGroupByKey[]>([]);
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<ClassListColumnKey[]>(getInitialVisibleClassColumns);
  const [toClass, setToClass] = useState('');
  const [newStudentId, setNewStudentId] = useState('');
  const [note, setNote] = useState('');
  const [debtModal, setDebtModal] = useState<IClassStudent | null>(null);
  const [draft, setDraft] = useState<Record<string, { assignment: number; midterm: number; final: number }>>({});
  const [sessions, setSessions] = useState<IClassSession[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<IAttendanceRecord[]>([]);
  const [studyNotes, setStudyNotes] = useState<IStudyNote[]>([]);
  const [attendanceDraft, setAttendanceDraft] = useState<AttendanceDraft>({});
  const [attendanceSaveMessage, setAttendanceSaveMessage] = useState('');
  const [logAudienceFilter, setLogAudienceFilter] = useState<LogAudienceFilter>('ALL');
  const [noteModal, setNoteModal] = useState<NoteModalState | null>(null);
  const [createClassOpen, setCreateClassOpen] = useState(false);
  const [createClassError, setCreateClassError] = useState('');
  const [createClassForm, setCreateClassForm] = useState<CreateClassFormState>(getDefaultCreateClassForm);

  const loadBaseData = () => {
    setClasses(getTrainingClasses());
    setTeachers(getTeachers());
    setStudents(getStudents() as IStudent[]);
    setMembers(getClassStudents());
  };

  const loadClassStudyData = (classId: string) => {
    ensureDefaultSessionsForClass(classId);
    setSessions(getSessionsByClassId(classId));
    setAttendanceRecords(getAttendanceByClassId(classId));
    setStudyNotes(getStudyNotesByClassId(classId));
  };

  useEffect(() => {
    loadBaseData();
    const h = () => loadBaseData();
    [
      'educrm:training-classes-changed',
      'educrm:teachers-changed',
      'educrm:students-changed',
      'educrm:class-students-changed',
      'educrm:student-scores-changed',
      'educrm:log-notes-changed'
    ].forEach((e) => window.addEventListener(e, h as EventListener));
    return () =>
      [
        'educrm:training-classes-changed',
        'educrm:teachers-changed',
        'educrm:students-changed',
        'educrm:class-students-changed',
        'educrm:student-scores-changed',
        'educrm:log-notes-changed'
      ].forEach((e) => window.removeEventListener(e, h as EventListener));
  }, []);

  useEffect(() => {
    window.localStorage.setItem(CLASS_LIST_VISIBLE_COLUMNS_KEY, JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const campusOptions = useMemo(() => Array.from(new Set(classes.map((item) => item.campus).filter(Boolean))) as string[], [classes]);
  const levelOptions = useMemo(() => Array.from(new Set(classes.map((item) => item.level).filter(Boolean))) as string[], [classes]);
  const languageOptions = useMemo(() => Array.from(new Set(classes.map((item) => item.language).filter(Boolean))) as string[], [classes]);
  const roomOptions = useMemo(() => Array.from(new Set(classes.map((item) => item.room).filter(Boolean))) as string[], [classes]);
  const timeSlotOptions = useMemo(
    () => Array.from(new Set(classes.map((item) => item.timeSlot || getLegacyTimeSlot(item.schedule)).filter(Boolean))) as string[],
    [classes]
  );
  const teacherOptions = useMemo(
    () =>
      teachers
        .map((teacher) => ({ id: teacher.id, name: teacher.fullName }))
        .filter((teacher) => classes.some((item) => item.teacherId === teacher.id)),
    [classes, teachers]
  );
  const teacherNameMap = useMemo(() => new Map(teachers.map((teacher) => [teacher.id, teacher.fullName])), [teachers]);
  const classSizeMap = useMemo(() => {
    const next = new Map<string, number>();
    members.forEach((member) => next.set(member.classId, (next.get(member.classId) || 0) + 1));
    return next;
  }, [members]);
  const visibleColumnSet = useMemo(() => new Set(visibleColumns), [visibleColumns]);
  const activeClassColumns = useMemo(() => CLASS_LIST_COLUMNS.filter((column) => visibleColumnSet.has(column.key)), [visibleColumnSet]);
  const activeFilterCount = useMemo(
    () =>
      [
        statusFilter !== 'ALL',
        levelFilter !== 'ALL',
        teacherFilter !== 'ALL',
        campusFilter !== 'ALL',
        languageFilter !== 'ALL',
        classTypeFilter !== 'ALL',
        roomFilter !== 'ALL',
        studyDayFilter !== 'ALL',
        timeSlotFilter !== 'ALL',
        groupBy.length > 0
      ].filter(Boolean).length,
    [
      statusFilter,
      levelFilter,
      teacherFilter,
      campusFilter,
      languageFilter,
      classTypeFilter,
      roomFilter,
      studyDayFilter,
      timeSlotFilter,
      groupBy.length
    ]
  );
  const hasTimeFilter = timeRangeType !== 'all' && (!!startDateFromFilter || !!endDateToFilter);
  const hasQuickActionFilter = quickAction !== 'startDate';
  const hasAnyActiveTools = activeFilterCount > 0 || hasTimeFilter || hasQuickActionFilter;
  const timeRangeLabel = useMemo(() => {
    if (timeRangeType === 'custom' && startDateFromFilter && endDateToFilter) {
      return `${fd(startDateFromFilter)} - ${fd(endDateToFilter)}`;
    }
    return TIME_RANGE_PRESETS.find((item) => item.id === timeRangeType)?.label || 'Tất cả thời gian';
  }, [timeRangeType, startDateFromFilter, endDateToFilter]);
  const activeSearchChips = useMemo<PinnedSearchChip[]>(() => {
    const chips: PinnedSearchChip[] = [];
    const quickActionLabel = QUICK_ACTION_OPTIONS.find((option) => option.key === quickAction)?.label || quickAction;

    if (quickAction !== 'startDate') {
      chips.push({ key: 'quickAction', label: `Bộ lọc: ${quickActionLabel}` });
    }
    if (timeRangeType !== 'all') {
      chips.push({ key: 'timeRange', label: `Thời gian: ${timeRangeLabel}` });
    }
    if (statusFilter !== 'ALL') {
      chips.push({ key: 'statusFilter', label: `Trạng thái: ${STATUS_LABEL[statusFilter]}` });
    }
    if (teacherFilter !== 'ALL') {
      chips.push({ key: 'teacherFilter', label: `GV: ${teacherNameMap.get(teacherFilter) || teacherFilter}` });
    }
    if (campusFilter !== 'ALL') {
      chips.push({ key: 'campusFilter', label: `Cơ sở: ${campusFilter}` });
    }
    if (levelFilter !== 'ALL') {
      chips.push({ key: 'levelFilter', label: `Trình độ: ${levelFilter}` });
    }
    if (languageFilter !== 'ALL') {
      chips.push({ key: 'languageFilter', label: `Ngôn ngữ: ${languageFilter}` });
    }
    if (classTypeFilter !== 'ALL') {
      chips.push({ key: 'classTypeFilter', label: `Hình thức: ${CLASS_TYPE_LABEL[classTypeFilter]}` });
    }
    if (roomFilter !== 'ALL') {
      chips.push({ key: 'roomFilter', label: `Phòng: ${roomFilter}` });
    }
    if (studyDayFilter !== 'ALL') {
      const dayLabel = DAY_OPTIONS.find((option) => String(option.value) === studyDayFilter)?.label || studyDayFilter;
      chips.push({ key: 'studyDayFilter', label: `Ngày học: ${dayLabel}` });
    }
    if (timeSlotFilter !== 'ALL') {
      chips.push({ key: 'timeSlotFilter', label: `Khung giờ: ${timeSlotFilter}` });
    }
    if (groupBy.length > 0) {
      const groupByLabel = groupBy
        .map((key) => GROUP_BY_OPTIONS.find((option) => option.key === key)?.label || key)
        .join(', ');
      chips.push({ key: 'groupBy', label: `Nhóm theo: ${groupByLabel}` });
    }

    return chips;
  }, [
    quickAction,
    timeRangeType,
    timeRangeLabel,
    statusFilter,
    teacherFilter,
    teacherNameMap,
    campusFilter,
    levelFilter,
    languageFilter,
    classTypeFilter,
    roomFilter,
    studyDayFilter,
    timeSlotFilter,
    groupBy
  ]);
  const classItems = classes.filter((c) => {
    const normalizedSearch = search.trim().toLowerCase();
    const teacherName = teacherNameMap.get(c.teacherId || '') || '';
    const studyDays = getClassStudyDays(c);
    const timeSlot = getClassTimeSlot(c);
    const quickActionIsStatus = quickAction === 'DRAFT' || quickAction === 'ACTIVE' || quickAction === 'DONE' || quickAction === 'CANCELED';
    const selectedDateValue =
      quickAction === 'endDate' || quickAction === 'DONE' || quickAction === 'CANCELED'
        ? c.endDate
        : c.startDate;
    const matchesSearch =
      !normalizedSearch ||
      [c.name, c.code, c.room, c.campus, c.language, c.level, c.schedule, teacherName]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedSearch));
    const matchesQuickAction = !quickActionIsStatus || c.status === quickAction;
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    const matchesLevel = levelFilter === 'ALL' || (c.level || '') === levelFilter;
    const matchesTeacher = teacherFilter === 'ALL' || (c.teacherId || '') === teacherFilter;
    const matchesCampus = campusFilter === 'ALL' || (c.campus || '') === campusFilter;
    const matchesLanguage = languageFilter === 'ALL' || (c.language || '') === languageFilter;
    const matchesClassType = classTypeFilter === 'ALL' || (c.classType || '') === classTypeFilter;
    const matchesRoom = roomFilter === 'ALL' || (c.room || '') === roomFilter;
    const matchesStudyDay = studyDayFilter === 'ALL' || studyDays.includes(Number(studyDayFilter));
    const matchesTimeSlot = timeSlotFilter === 'ALL' || timeSlot === timeSlotFilter;
    const matchesStartDate = !startDateFromFilter || (!!selectedDateValue && selectedDateValue >= startDateFromFilter);
    const matchesEndDate = !endDateToFilter || (!!selectedDateValue && selectedDateValue <= endDateToFilter);

    return (
      matchesSearch &&
      matchesQuickAction &&
      matchesStatus &&
      matchesLevel &&
      matchesTeacher &&
      matchesCampus &&
      matchesLanguage &&
      matchesClassType &&
      matchesRoom &&
      matchesStudyDay &&
      matchesTimeSlot &&
      matchesStartDate &&
      matchesEndDate
    );
  });
  const getGroupByValue = (classItem: ITrainingClass, groupKey: ClassGroupByKey) => {
    switch (groupKey) {
      case 'status':
        return STATUS_LABEL[classItem.status];
      case 'campus':
        return classItem.campus || '-';
      case 'teacher':
        return teacherNameMap.get(classItem.teacherId || '') || 'Chưa phân giáo viên';
      case 'level':
        return classItem.level || '-';
      case 'classType':
        return classItem.classType ? CLASS_TYPE_LABEL[classItem.classType] : '-';
      case 'language':
        return classItem.language || '-';
      default:
        return '-';
    }
  };

  const groupedClassItems = useMemo(() => {
    if (groupBy.length === 0) return [];

    const groups = new Map<string, ITrainingClass[]>();

    classItems.forEach((classItem) => {
      const label = groupBy
        .map((groupKey) => {
          const groupLabel = GROUP_BY_OPTIONS.find((option) => option.key === groupKey)?.label || groupKey;
          return `${groupLabel}: ${getGroupByValue(classItem, groupKey)}`;
        })
        .join(' • ');

      groups.set(label, [...(groups.get(label) || []), classItem]);
    });

    return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
  }, [classItems, groupBy, teacherNameMap]);
  const selected = classItems.find((item) => item.id === selectedClassId);
  const locked = !!selected && (selected.status === 'DONE' || selected.status === 'CANCELED');

  useEffect(() => {
    if (selectedClassId && !classItems.some((item) => item.id === selectedClassId)) {
      setSelectedClassId('');
    }
  }, [classItems, selectedClassId]);

  useEffect(() => {
    if (!selected?.id) {
      setSessions([]);
      setAttendanceRecords([]);
      setStudyNotes([]);
      setAttendanceDraft({});
      setAttendanceSaveMessage('');
      return;
    }

    loadClassStudyData(selected.id);
    setAttendanceDraft({});
    setAttendanceSaveMessage('');
  }, [selected?.id]);

  useEffect(() => {
    if (!selected?.id) return;
    const h = () => loadClassStudyData(selected.id);
    ['educrm:class-sessions-changed', 'educrm:attendance-changed', 'educrm:study-notes-changed'].forEach((e) =>
      window.addEventListener(e, h as EventListener)
    );
    return () =>
      ['educrm:class-sessions-changed', 'educrm:attendance-changed', 'educrm:study-notes-changed'].forEach((e) =>
        window.removeEventListener(e, h as EventListener)
      );
  }, [selected?.id]);

  const rows = useMemo<Row[]>(() => {
    if (!selected) return [];
    const scoreMap = new Map(getStudentScoresByClassId(selected.id).map((s) => [s.studentId, s]));
    return members
      .filter((m) => m.classId === selected.id)
      .map((m) => ({ member: m, student: students.find((s) => s.id === m.studentId), score: scoreMap.get(m.studentId) }));
  }, [selected, members, students]);

  const quotations = useMemo(() => getQuotations(), [classes, members, students]);

  const logs = useMemo(() => (selected ? getLogNotes('CLASS', selected.id) : []), [selected, members, classes]);
  const filteredLogs = useMemo(
    () => filterByLogAudience(logs, logAudienceFilter, getILogNoteAudience),
    [logAudienceFilter, logs]
  );
  const availableStudents = selected ? students.filter((s) => !rows.some((r) => r.member.studentId === s.id)) : [];
  const transferTargets = selected ? classes.filter((c) => c.id !== selected.id) : [];
  const inferredLevel = selected?.level || selected?.code.match(/(A1|A2|B1|B2|C1|C2)/i)?.[1]?.toUpperCase() || '-';
  const scheduleRange = selected && (selected.startDate || selected.endDate) ? `${fd(selected.startDate)} - ${fd(selected.endDate)}` : '-';
  const classSize = selected ? `${rows.length}/${selected.maxStudents ?? 25}` : '-';
  const classType = selected?.classType ? CLASS_TYPE_LABEL[selected.classType] : '-';
  const studyDaysLabel = selected ? formatStudyDays(selected.studyDays?.length ? selected.studyDays : getLegacyStudyDays(selected.schedule)) : '-';
  const timeSlotLabel = selected?.timeSlot || getLegacyTimeSlot(selected?.schedule) || '-';
  const todayDateOnly = getTodayDateOnly();
  const heldSessionsCount = sessions.filter((session) => session.isHeld).length;
  const selectedTeacher = selected?.teacherId ? teachers.find((teacher) => teacher.id === selected.teacherId) : undefined;
  const sessionCountLabel = sessions.length ? `${sessions.length} buổi` : '-';
  const sessionProgressLabel = sessions.length ? `${heldSessionsCount}/${sessions.length} buổi` : '-';
  const sourceClassStudentRows = useMemo(() => {
    if (!createClassForm.sourceClassId) return [];
    return members
      .filter((member) => member.classId === createClassForm.sourceClassId)
      .map((member) => ({ member, student: students.find((student) => student.id === member.studentId) }))
      .filter((item) => item.student);
  }, [createClassForm.sourceClassId, members, students]);

  const attendanceMap = useMemo(() => {
    const map = new Map<string, IAttendanceRecord>();
    attendanceRecords.forEach((record) => map.set(attendanceKey(record.studentId, record.sessionId), record));
    return map;
  }, [attendanceRecords]);

  const studyNoteMap = useMemo(() => {
    const map = new Map<string, IStudyNote>();
    studyNotes.forEach((item) => map.set(attendanceKey(item.studentId, item.sessionId), item));
    return map;
  }, [studyNotes]);

  const getDueLabel = (member: IClassStudent) => {
    if (member.nearestDueDate) return fd(member.nearestDueDate);
    if ((member.debtTerms || []).length > 0 && (member.debtTerms || []).every((t) => t.status === 'PAID')) {
      return decodeMojibakeText('Không có kỳ thu');
    }
    return '-';
  };

  const renderDebtBadge = (status?: IClassStudent['debtStatus']) => {
    if (!status) return <span>-</span>;
    return <span className={`rounded-full px-2 py-1 text-xs font-bold ${DEBT_BADGE[status]}`}>{DEBT_LABEL[status]}</span>;
  };

  const getLinkedQuotation = (student?: IStudent) => {
    if (!student) return undefined;
    return quotations.find((quotation) => quotation.id === student.soId || quotation.studentId === student.id);
  };

  const getStudentProgramLabel = (row: Row) => {
    const quotation = getLinkedQuotation(row.student);
    return quotation?.product || row.student?.level || '-';
  };

  const getStudentAmount = (row: Row) => {
    const quotation = getLinkedQuotation(row.student);
    return quotation?.finalAmount || quotation?.amount || row.member.totalDebt || 0;
  };

  const getStudentRemark = (row: Row) => row.student?.note || '-';

  const isSessionDateLocked = (session?: IClassSession) => !!session?.date && session.date < todayDateOnly;

  const resetFilters = () => {
    setStatusFilter('ALL');
    setLevelFilter('ALL');
    setTeacherFilter('ALL');
    setCampusFilter('ALL');
    setLanguageFilter('ALL');
    setClassTypeFilter('ALL');
    setRoomFilter('ALL');
    setStudyDayFilter('ALL');
    setTimeSlotFilter('ALL');
    setQuickAction('startDate');
    setTimeRangeType('all');
    setStartDateFromFilter('');
    setEndDateToFilter('');
    setGroupBy([]);
  };

  const removeSearchChip = (chipKey: string) => {
    switch (chipKey) {
      case 'quickAction':
        setQuickAction('startDate');
        return;
      case 'timeRange':
        applyTimeRangePreset('all');
        return;
      case 'statusFilter':
        setStatusFilter('ALL');
        return;
      case 'teacherFilter':
        setTeacherFilter('ALL');
        return;
      case 'campusFilter':
        setCampusFilter('ALL');
        return;
      case 'levelFilter':
        setLevelFilter('ALL');
        return;
      case 'languageFilter':
        setLanguageFilter('ALL');
        return;
      case 'classTypeFilter':
        setClassTypeFilter('ALL');
        return;
      case 'roomFilter':
        setRoomFilter('ALL');
        return;
      case 'studyDayFilter':
        setStudyDayFilter('ALL');
        return;
      case 'timeSlotFilter':
        setTimeSlotFilter('ALL');
        return;
      case 'groupBy':
        setGroupBy([]);
        return;
      default:
        return;
    }
  };

  const clearAllSearchFilters = () => {
    setSearch('');
    resetFilters();
    setShowTimePicker(false);
    setFiltersOpen(false);
    setColumnMenuOpen(false);
  };

  const applyTimeRangePreset = (rangeType: TimeRangeType) => {
    setTimeRangeType(rangeType);
    if (rangeType === 'all') {
      setStartDateFromFilter('');
      setEndDateToFilter('');
      setShowTimePicker(false);
      return;
    }

    if (rangeType === 'today') {
      const today = new Date();
      const value = toDateInputValue(today);
      setStartDateFromFilter(value);
      setEndDateToFilter(value);
      setShowTimePicker(false);
      return;
    }

    if (rangeType === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const value = toDateInputValue(yesterday);
      setStartDateFromFilter(value);
      setEndDateToFilter(value);
      setShowTimePicker(false);
      return;
    }

    if (rangeType === 'thisWeek') {
      const end = new Date();
      const start = new Date();
      const day = start.getDay();
      const diff = day === 0 ? 6 : day - 1;
      start.setDate(start.getDate() - diff);
      setStartDateFromFilter(toDateInputValue(start));
      setEndDateToFilter(toDateInputValue(end));
      setShowTimePicker(false);
      return;
    }

    if (rangeType === 'last7Days') {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 7);
      setStartDateFromFilter(toDateInputValue(start));
      setEndDateToFilter(toDateInputValue(end));
      setShowTimePicker(false);
      return;
    }

    if (rangeType === 'last30Days') {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 30);
      setStartDateFromFilter(toDateInputValue(start));
      setEndDateToFilter(toDateInputValue(end));
      setShowTimePicker(false);
      return;
    }

    if (rangeType === 'thisMonth') {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date();
      setStartDateFromFilter(toDateInputValue(start));
      setEndDateToFilter(toDateInputValue(end));
      setShowTimePicker(false);
      return;
    }

    if (rangeType === 'lastMonth') {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      setStartDateFromFilter(toDateInputValue(start));
      setEndDateToFilter(toDateInputValue(end));
      setShowTimePicker(false);
      return;
    }

    if (rangeType === 'custom') {
      const end = new Date();
      const start = new Date();
      setStartDateFromFilter(toDateInputValue(start));
      setEndDateToFilter(toDateInputValue(end));
      return;
    }
  };

  const toggleClassColumn = (columnKey: ClassListColumnKey) => {
    const targetColumn = CLASS_LIST_COLUMNS.find((column) => column.key === columnKey);
    if (targetColumn?.required) return;

    setVisibleColumns((prev) => {
      if (prev.includes(columnKey)) {
        const next = prev.filter((item) => item !== columnKey);
        return next.length ? next : prev;
      }

      const order = CLASS_LIST_COLUMNS.map((column) => column.key);
      return [...prev, columnKey].sort((a, b) => order.indexOf(a) - order.indexOf(b));
    });
  };

  const resetVisibleColumns = () => {
    setVisibleColumns(getDefaultVisibleClassColumns());
  };

  const toggleGroupBy = (groupKey: ClassGroupByKey) => {
    setGroupBy((prev) => {
      if (prev.includes(groupKey)) {
        return prev.filter((item) => item !== groupKey);
      }

      const next = new Set([...prev, groupKey]);
      return GROUP_BY_OPTIONS.map((option) => option.key).filter((key) => next.has(key));
    });
  };

  const renderClassListCell = (classItem: ITrainingClass, columnKey: ClassListColumnKey) => {
    const teacherName = teacherNameMap.get(classItem.teacherId || '') || '-';
    const classTimeSlot = getClassTimeSlot(classItem) || '-';
    const studyDaysLabelValue = formatStudyDays(getClassStudyDays(classItem));
    const classSizeValue = `${classSizeMap.get(classItem.id) || 0}/${classItem.maxStudents ?? 25}`;

    switch (columnKey) {
      case 'code':
        return (
          <div>
            <div className="font-semibold text-slate-900">{classItem.code || '-'}</div>
            <div className="mt-1 text-xs text-slate-500">{classItem.name || '-'}</div>
          </div>
        );
      case 'level':
        return classItem.level || '-';
      case 'timeSlot':
        return classTimeSlot;
      case 'studyDays':
        return studyDaysLabelValue;
      case 'teacher':
        return teacherName;
      case 'size':
        return classSizeValue;
      case 'language':
        return classItem.language || '-';
      case 'classType':
        return classItem.classType ? CLASS_TYPE_LABEL[classItem.classType] : '-';
      case 'startDate':
        return fd(classItem.startDate);
      case 'endDate':
        return fd(classItem.endDate);
      case 'campus':
        return classItem.campus || '-';
      case 'status':
        return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE[classItem.status]}`}>{STATUS_LABEL[classItem.status]}</span>;
      default:
        return '-';
    }
  };

  const renderClassListRow = (classItem: ITrainingClass) => {
    const isSelected = selected?.id === classItem.id;

    return (
      <tr
        key={classItem.id}
        onClick={() => {
          setSelectedClassId(classItem.id);
          setFiltersOpen(false);
          setColumnMenuOpen(false);
          setShowTimePicker(false);
        }}
        className={`cursor-pointer border-b border-slate-100 transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
      >
        {activeClassColumns.map((column) => (
          <td
            key={column.key}
            className={`px-4 py-3 align-top ${column.align === 'center' ? 'text-center' : ''} ${column.key === 'code' ? 'min-w-[220px]' : 'whitespace-nowrap'}`}
          >
            {renderClassListCell(classItem, column.key)}
          </td>
        ))}
      </tr>
    );
  };

  const toggleCreateClassStudyDay = (day: number) => {
    setCreateClassForm((prev) => {
      const studyDays = prev.studyDays.includes(day) ? prev.studyDays.filter((item) => item !== day) : [...prev.studyDays, day].sort((a, b) => a - b);
      return { ...prev, studyDays };
    });
  };

  const handleCreateClass = () => {
    const normalizedCode = normalizeClassCode(createClassForm.code);
    if (!normalizedCode) {
      setCreateClassError('Cần nhập mã lớp.');
      return;
    }
    if (!createClassForm.startDate || !createClassForm.endDate) {
      setCreateClassError('Cần nhập ngày bắt đầu và ngày kết thúc.');
      return;
    }
    if (createClassForm.startDate > createClassForm.endDate) {
      setCreateClassError('Ngày kết thúc phải sau ngày bắt đầu.');
      return;
    }
    if (!createClassForm.studyDays.length) {
      setCreateClassError('Cần chọn ít nhất một ngày học.');
      return;
    }
    if (!createClassForm.timeSlot) {
      setCreateClassError('Cần chọn khung giờ.');
      return;
    }

    const result = createTrainingClass({
      code: normalizedCode,
      name: createClassForm.name.trim() || `Lớp ${normalizedCode}`,
      campus: createClassForm.campus.trim(),
      room: createClassForm.room.trim(),
      level: createClassForm.level.trim(),
      classType: createClassForm.classType,
      language: createClassForm.language.trim(),
      maxStudents: Number(createClassForm.maxStudents) || 25,
      startDate: createClassForm.startDate,
      endDate: createClassForm.endDate,
      teacherId: createClassForm.teacherId,
      studyDays: createClassForm.studyDays,
      timeSlot: createClassForm.timeSlot,
      status: 'DRAFT'
    });

    if (!result.ok) {
      setCreateClassError(result.error);
      return;
    }

    createClassForm.promotedStudentIds.forEach((studentId) => {
      addStudentToClass(result.data.id, studentId);
      addClassLog(result.data.id, 'PROMOTE_STUDENT', `Tiếp nhận ${studentId} từ lớp ${createClassForm.sourceClassId}`, 'training');
    });

    setCreateClassError('');
    setCreateClassOpen(false);
    setCreateClassForm(getDefaultCreateClassForm());
    setSelectedClassId(result.data.id);
  };

  const changeMember = (m: IClassStudent, status: IClassStudent['status']) => {
    saveClassStudents(members.map((x) => (x.id === m.id ? { ...x, status, studentStatus: status } : x)));
    addClassLog(selected!.id, 'UPDATE_STUDENT_STATUS', `Cập nhật trạng thái ${m.studentId} -> ${status}`, 'training');
  };

  const getAttendanceCellValue = (studentId: string, sessionId: string): AttendanceStatus | '' => {
    const key = attendanceKey(studentId, sessionId);
    return attendanceDraft[key] ?? attendanceMap.get(key)?.status ?? '';
  };

  const setAttendanceCellValue = (studentId: string, sessionId: string, value: AttendanceStatus | '') => {
    if (locked) return;
    const session = sessions.find((item) => item.id === sessionId);
    if (isSessionDateLocked(session)) return;
    const key = attendanceKey(studentId, sessionId);
    setAttendanceDraft((prev) => ({ ...prev, [key]: value }));
    setAttendanceSaveMessage('');
  };

  const togglePromotedStudent = (studentId: string) => {
    setCreateClassForm((prev) => ({
      ...prev,
      promotedStudentIds: prev.promotedStudentIds.includes(studentId)
        ? prev.promotedStudentIds.filter((item) => item !== studentId)
        : [...prev.promotedStudentIds, studentId]
    }));
  };

  const getAttendanceShortCode = (studentId: string, sessionId: string) => {
    const status = getAttendanceCellValue(studentId, sessionId);
    return status ? ATTENDANCE_STATUS_TO_SHORT_CODE[status] : '';
  };

  const parseAttendanceShortCode = (value: string): AttendanceStatus | '' => {
    const normalized = value.trim().slice(0, 1).toUpperCase();
    return ATTENDANCE_SHORT_CODE_TO_STATUS[normalized] || '';
  };

  const setAttendanceCellValueFromCode = (studentId: string, sessionId: string, value: string) => {
    setAttendanceCellValue(studentId, sessionId, parseAttendanceShortCode(value));
  };

  const toggleSessionHeld = (sessionId: string, isHeld: boolean) => {
    if (locked) return;
    const currentSession = sessions.find((item) => item.id === sessionId);
    if (isSessionDateLocked(currentSession)) return;
    const nextSession = updateClassSession(sessionId, { isHeld });
    if (!nextSession || !selected) return;

    setSessions((prev) => prev.map((session) => (session.id === sessionId ? nextSession : session)));
    addClassLog(
      selected.id,
      'SESSION_HELD_UPDATED',
      `${getSessionLabel(nextSession)}: ${isHeld ? 'Có học' : 'Không học'}`,
      'training'
    );
  };

  const getStudentAttendanceSummary = (studentId: string) => {
    if (!sessions.length) return '-';
    let completed = 0;
    let passCount = 0;
    sessions.forEach((session) => {
      const status = getAttendanceCellValue(studentId, session.id);
      if (!status) return;
      completed += 1;
      if (status === 'PRESENT' || status === 'LATE') passCount += 1;
    });
    if (!completed) return '-';
    return `${Math.round((passCount / completed) * 100)}%`;
  };

  const openNoteModal = (row: Row, sessionId: string) => {
    const key = attendanceKey(row.member.studentId, sessionId);
    setNoteModal({
      studentId: row.member.studentId,
      studentName: row.student?.name || row.member.studentId,
      sessionId,
      note: studyNoteMap.get(key)?.note || ''
    });
  };

  const onChangeNoteSession = (sessionId: string) => {
    setNoteModal((prev) => {
      if (!prev) return prev;
      const key = attendanceKey(prev.studentId, sessionId);
      return {
        ...prev,
        sessionId,
        note: studyNoteMap.get(key)?.note || ''
      };
    });
  };

  const saveAttendance = () => {
    if (!selected || locked) return;

    const changed = Object.entries(attendanceDraft)
      .map(([key, status]) => {
        if (!status) return null;
        const [studentId, sessionId] = key.split('__');
        if (!studentId || !sessionId) return null;
        const session = sessions.find((item) => item.id === sessionId);
        if (isSessionDateLocked(session)) return null;
        const current = attendanceMap.get(key)?.status;
        if (current === status) return null;
        return { studentId, sessionId, status };
      })
      .filter((item): item is { studentId: string; sessionId: string; status: AttendanceStatus } => !!item);

    if (!changed.length) {
      setAttendanceSaveMessage('Không có thay đổi để lưu.');
      return;
    }

    const changedSessionIds = new Set<string>();
    changed.forEach((item) => {
      upsertAttendance({
        classId: selected.id,
        studentId: item.studentId,
        sessionId: item.sessionId,
        status: item.status,
        updatedBy: 'training'
      });
      changedSessionIds.add(item.sessionId);
    });

    changedSessionIds.forEach((sessionId) => {
      const session = sessions.find((item) => item.id === sessionId);
      addClassLog(selected.id, 'ATTENDANCE_UPDATED', `Cập nhật điểm danh buổi ${getSessionLabel(session)}`, 'training');
    });

    setAttendanceDraft({});
    setAttendanceRecords(getAttendanceByClassId(selected.id));
    setAttendanceSaveMessage(`Đã lưu ${changed.length} ô điểm danh.`);
  };

  const saveStudyNote = () => {
    if (!selected || !noteModal || locked) return;
    const currentSession = sessions.find((item) => item.id === noteModal.sessionId);
    if (isSessionDateLocked(currentSession)) return;
    const text = noteModal.note.trim();
    if (!text) return;

    upsertStudyNote({
      classId: selected.id,
      studentId: noteModal.studentId,
      sessionId: noteModal.sessionId,
      note: text,
      createdBy: 'training',
      updatedBy: 'training'
    });

    const session = sessions.find((item) => item.id === noteModal.sessionId);
    addClassLog(
      selected.id,
      'STUDY_NOTE_ADDED',
      `Thêm ghi chú cho ${noteModal.studentName} - buổi ${getSessionLabel(session)}`,
      'training'
    );

    setStudyNotes(getStudyNotesByClassId(selected.id));
    setNoteModal(null);
  };

  const renderTabContent = () => {
    if (!selected) return null;

    if (primaryTab === 'students') {
      return (
        <table className="w-full table-fixed">
          <colgroup>
            <col className="w-[18%]" />
            <col className="w-[15%]" />
            <col className="w-[18%]" />
            <col className="w-[9%]" />
            <col className="w-[12%]" />
            <col className="w-[12%]" />
            <col className="w-[16%]" />
          </colgroup>
          <thead>
            <tr>
              <th className="border-b py-2 pr-3 text-left text-xs uppercase">Học viên</th>
              <th className="border-b py-2 pr-3 text-left text-xs uppercase">Trạng thái</th>
              <th className="border-b py-2 pr-3 text-left text-xs uppercase">Chương trình</th>
              <th className="border-b py-2 pr-3 text-left text-xs uppercase">Công nợ</th>
              <th className="border-b py-2 pr-3 text-left text-xs uppercase">Số tiền</th>
              <th className="border-b py-2 pr-3 text-left text-xs uppercase">Hạn đóng</th>
              <th className="border-b py-2 text-left text-xs uppercase">Nhận xét chung</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.member.id}>
                <td className="border-b py-3 pr-3 align-top">
                  <div className="font-semibold">{r.student?.name || r.member.studentId}</div>
                  <div className="text-xs text-slate-500">{r.student?.code || '-'}</div>
                </td>
                <td className="border-b py-3 pr-3 align-top">
                  <select
                    value={r.member.status}
                    onChange={(e) => changeMember(r.member, e.target.value as IClassStudent['status'])}
                    disabled={locked}
                    className="w-full rounded-lg border px-2 py-1 text-xs"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="BAO_LUU">Bảo lưu</option>
                    <option value="NGHI_HOC">Nghỉ học</option>
                  </select>
                </td>
                <td className="border-b py-3 pr-3 align-top text-sm text-slate-700">
                  <div className="truncate" title={getStudentProgramLabel(r)}>
                    {truncateText(getStudentProgramLabel(r), 26)}
                  </div>
                </td>
                <td className="border-b py-3 pr-3 align-top">{renderDebtBadge(r.member.debtStatus)}</td>
                <td className="border-b py-3 pr-3 align-top text-sm font-medium text-slate-700 whitespace-nowrap">{formatMoney(getStudentAmount(r))}</td>
                <td className="border-b py-3 pr-3 align-top text-sm text-slate-700 whitespace-nowrap">{truncateText(getDueLabel(r.member), 14)}</td>
                <td className="border-b py-3 align-top text-sm text-slate-600">
                  <div className="truncate" title={getStudentRemark(r)}>
                    {truncateText(getStudentRemark(r), 30)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (primaryTab === 'level' && levelTab === 'attendance') {
      return (
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-slate-50 px-3 py-3">
            <div className="flex flex-wrap items-center gap-2">
              {(['PRESENT', 'ABSENT', 'LATE'] as const).map((status) => (
                <span key={status} className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${ATTENDANCE_BADGE[status]}`}>
                  {ATTENDANCE_STATUS_TO_SHORT_CODE[status]} = {ATTENDANCE_LABEL[status]}
                </span>
              ))}
              <span className="text-[11px] font-medium text-slate-500">Chuột phải vào ô để mở Log Note</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {attendanceSaveMessage && <span className="text-xs text-slate-600">{attendanceSaveMessage}</span>}
              <button
                disabled={locked}
                onClick={saveAttendance}
                className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                <Save size={13} /> Lưu dữ liệu
              </button>
              <button
                type="button"
                title="TODO: thay báº±ng API export Excel backend"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-600"
              >
                <FileSpreadsheet size={13} /> Xuáº¥t Excel (TODO)
              </button>
            </div>
          </div>

          {!rows.length ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">
              Chưa có học viên để điểm danh
            </div>
          ) : (
            <div className="max-w-full overflow-x-auto rounded-xl border">
              <table className="min-w-[980px] w-max border-collapse">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="sticky left-0 z-20 border-b bg-slate-50 px-3 py-2 text-left text-[11px] uppercase">Học viên</th>
                    {sessions.map((session) => (
                      <th key={session.id} className="border-b px-2 py-2 text-center text-[11px] uppercase">
                        {(() => {
                          const sessionLocked = isSessionDateLocked(session);
                          return (
                            <>
                              <div className="flex items-center justify-center gap-1">
                                <label
                                  className="inline-flex h-3.5 w-3.5 cursor-pointer items-center justify-center"
                                  title={sessionLocked ? 'Buổi đã qua ngày, dữ liệu đã khóa' : 'Đánh dấu buổi này lớp có học'}
                                >
                                  <input
                                    type="checkbox"
                                    checked={!!session.isHeld}
                                    disabled={locked || sessionLocked}
                                    onChange={(e) => toggleSessionHeld(session.id, e.target.checked)}
                                    className="h-3.5 w-3.5 rounded border-slate-300"
                                  />
                                </label>
                                <span>{getSessionShortTitle(session)}</span>
                              </div>
                              <div className="mt-1 text-[10px] font-medium normal-case text-slate-500">{fd(session.date)}</div>
                            </>
                          );
                        })()}
                      </th>
                    ))}
                    <th className="border-b px-3 py-2 text-center text-[11px] uppercase">Tổng kết</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.member.id}>
                      <td className="sticky left-0 z-10 border-b bg-white px-3 py-2">
                        <div className="font-semibold">{r.student?.name || r.member.studentId}</div>
                        <div className="text-xs text-slate-500">{r.student?.code || '-'}</div>
                      </td>
                      {sessions.map((session) => {
                        const cellValue = getAttendanceCellValue(r.member.studentId, session.id);
                        const noteKey = attendanceKey(r.member.studentId, session.id);
                        const hasNote = !!studyNoteMap.get(noteKey)?.note?.trim();
                        const sessionLocked = isSessionDateLocked(session);
                        return (
                          <td key={`${r.member.id}-${session.id}`} className="border-b px-2 py-1.5 text-center">
                            <div className="relative mx-auto w-[52px]">
                              <input
                                value={getAttendanceShortCode(r.member.studentId, session.id)}
                                disabled={locked || sessionLocked}
                                maxLength={1}
                                onChange={(e) => setAttendanceCellValueFromCode(r.member.studentId, session.id, e.target.value)}
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  openNoteModal(r, session.id);
                                }}
                                onFocus={(e) => e.target.select()}
                                className={`h-8 w-[52px] rounded-md border text-center text-xs font-bold uppercase outline-none transition-colors ${
                                  cellValue ? ATTENDANCE_CELL_CLASS[cellValue] : 'border-slate-200 bg-white text-slate-500'
                                }`}
                                title={`${getSessionLabel(session)}${sessionLocked ? ' - buổi đã khóa dữ liệu' : ' - nhập C/V/M, chuột phải để mở Log Note'}`}
                                placeholder="-"
                              />
                              {hasNote && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-blue-500" />}
                            </div>
                          </td>
                        );
                      })}
                      <td className="border-b px-3 py-2 text-center text-sm font-semibold text-slate-700">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold">
                          {getStudentAttendanceSummary(r.member.studentId)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      );
    }

    if (primaryTab === 'level' && levelTab === 'grades') {
      return (
        <table className="w-full">
          <thead>
            <tr>
              <th className="border-b py-2 text-left text-xs uppercase">Học viên</th>
              <th className="border-b py-2 text-left text-xs uppercase">Chuyên cần</th>
              <th className="border-b py-2 text-left text-xs uppercase">Giữa kỳ</th>
              <th className="border-b py-2 text-left text-xs uppercase">Cuối kỳ</th>
              <th className="border-b py-2 text-left text-xs uppercase">TB</th>
              <th className="border-b py-2 text-right text-xs uppercase">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const d = draft[r.member.studentId] || {
                assignment: r.score?.assignment || 0,
                midterm: r.score?.midterm || 0,
                final: r.score?.final || 0
              };
              const avg = Number(((d.assignment + d.midterm + d.final) / 3).toFixed(1));
              return (
                <tr key={r.member.id}>
                  <td className="border-b py-2 font-semibold">{r.student?.name || r.member.studentId}</td>
                  {(['assignment', 'midterm', 'final'] as const).map((f) => (
                    <td key={f} className="border-b py-2">
                      <input
                        type="number"
                        min={0}
                        max={10}
                        step={0.1}
                        value={d[f]}
                        disabled={locked}
                        onChange={(e) => setDraft((p) => ({ ...p, [r.member.studentId]: { ...d, [f]: Number(e.target.value) } }))}
                        className="w-20 rounded-lg border px-2 py-1 text-sm"
                      />
                    </td>
                  ))}
                  <td className="border-b py-2">{avg}</td>
                  <td className="border-b py-2 text-right">
                    <button
                      disabled={locked}
                      onClick={() => {
                        const prev = r.score;
                        const next = upsertStudentScore(selected.id, r.member.studentId, d);
                        addClassLog(
                          selected.id,
                          'UPDATE_SCORE',
                          `CC ${prev?.assignment ?? 0}->${next.assignment}, GK ${prev?.midterm ?? 0}->${next.midterm}, CK ${prev?.final ?? 0}->${next.final}`,
                          'training'
                        );
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      <Save size={12} /> Lưu
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      );
    }

    return (
      <div className="flex h-full flex-col gap-3">
        <div className="rounded-xl border p-3">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="w-full rounded-lg border p-2 text-sm"
            placeholder="Nhập ghi chú lớp..."
          />
          <div className="mt-2 text-right">
            <button
              onClick={() => {
                if (!note.trim()) return;
                addClassLog(selected.id, 'MANUAL_NOTE', note.trim(), 'training');
                setNote('');
              }}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Thêm lịch sử
            </button>
          </div>
        </div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-semibold text-slate-900">Lịch sử log note</div>
          <LogAudienceFilterControl value={logAudienceFilter} onChange={setLogAudienceFilter} />
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto rounded-xl border p-3">
          {filteredLogs.map((l) => (
            <div key={l.id} className="rounded-lg border bg-[#f8fafc] p-3">
              <p className="text-sm font-semibold">{l.action}</p>
              <p className="text-sm text-slate-700">{l.message}</p>
              <p className="text-xs text-slate-500">
                {fd(l.createdAt)} - {l.createdBy}
              </p>
            </div>
          ))}
          {!filteredLogs.length && <p className="text-sm text-slate-500">Chưa có lịch sử phù hợp bộ lọc.</p>}
        </div>
      </div>
    );
  };

  return decodeMojibakeReactNode(
    <div className="flex h-full overflow-hidden bg-[#f8fafc]">
      {!selected && (
        <aside className="flex min-w-0 flex-1 flex-col bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-bold text-slate-900">Danh sách lớp</div>
                <div className="text-sm text-slate-500">{classItems.length}/{classes.length} lớp</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCreateClassError('');
                  setCreateClassForm({
                    ...getDefaultCreateClassForm(),
                    code: getNextGerClassCode(classes)
                  });
                  setCreateClassOpen(true);
                }}
                className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white"
              >
                <Plus size={13} /> Tạo lớp
              </button>
            </div>
            <div className="relative mt-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-[320px] flex-1">
                  <PinnedSearchInput
                    value={search}
                    onChange={setSearch}
                    placeholder="Tìm lớp..."
                    chips={activeSearchChips}
                    onRemoveChip={removeSearchChip}
                    onClearAll={clearAllSearchFilters}
                    clearAllAriaLabel="Xóa tất cả bộ lọc lớp"
                    className="min-h-[42px] rounded-xl border-slate-200 bg-slate-50 px-3 py-1.5 shadow-none"
                    inputClassName="text-sm h-7"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div className="flex items-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                      <select
                        value={quickAction}
                        onChange={(e) => setQuickAction(e.target.value as QuickActionKey)}
                        className="border-r border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 outline-none"
                      >
                        {QUICK_ACTION_OPTIONS.map((option) => (
                          <option key={option.key} value={option.key}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          setFiltersOpen(false);
                          setColumnMenuOpen(false);
                          setShowTimePicker((prev) => !prev);
                        }}
                        className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold ${hasTimeFilter ? 'bg-blue-50 text-blue-700' : 'text-slate-600'}`}
                      >
                        <Calendar size={16} />
                        {timeRangeLabel}
                        <ChevronRight size={14} className={`transition-transform ${showTimePicker ? 'rotate-90' : ''}`} />
                      </button>
                    </div>

                    {showTimePicker && (
                      <div className="absolute right-0 top-full z-20 mt-3 w-[560px] rounded-xl border border-slate-200 bg-white shadow-xl">
                        <div className="flex overflow-hidden rounded-2xl">
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
                                  onChange={(e) => {
                                    setTimeRangeType('custom');
                                    setStartDateFromFilter(e.target.value);
                                  }}
                                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold"
                                />
                              </label>
                              <label className="text-sm">
                                <span className="mb-1.5 block text-xs font-semibold text-slate-400">Đến ngày</span>
                                <input
                                  type="date"
                                  value={endDateToFilter}
                                  onChange={(e) => {
                                    setTimeRangeType('custom');
                                    setEndDateToFilter(e.target.value);
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
                          setColumnMenuOpen(false);
                          setFiltersOpen((prev) => !prev);
                        }}
                    className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                      filtersOpen || activeFilterCount ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Filter size={16} />
                    Lọc nâng cao
                    {activeFilterCount > 0 && <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[11px] font-bold text-white">{activeFilterCount}</span>}
                  </button>
                  {hasAnyActiveTools && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50"
                    >
                      Xóa lọc
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setShowTimePicker(false);
                      setFiltersOpen(false);
                      setColumnMenuOpen((prev) => !prev);
                    }}
                    className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                      columnMenuOpen ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Settings2 size={16} />
                  </button>
                </div>
              </div>

              {filtersOpen && (
                <div className="absolute right-0 top-full z-20 mt-3 w-full max-w-[640px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                  <button
                    type="button"
                    onClick={() => setFiltersOpen(false)}
                    className="absolute right-3 top-3 rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50"
                  >
                    Đóng
                  </button>
                  <div className="grid items-start grid-cols-[1fr_0.9fr]">
                    <div className="border-r border-slate-100 p-3">
                      <div className="mb-2 flex items-center gap-2 text-base font-semibold text-slate-800">
                        <Filter size={18} className="text-slate-700" />
                        <span>Bộ lọc</span>
                      </div>

                      <div className="space-y-2">
                        <div className="space-y-1">
                          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'ALL' | ITrainingClass['status'])} className="w-full border-0 bg-transparent px-0 py-0 text-sm leading-5 font-medium text-slate-700 outline-none">
                            <option value="ALL">Tất cả trạng thái</option>
                            {STATUS.map((status) => (
                              <option key={status} value={status}>
                                {STATUS_LABEL[status]}
                              </option>
                            ))}
                          </select>
                          <select value={teacherFilter} onChange={(e) => setTeacherFilter(e.target.value)} className="w-full border-0 bg-transparent px-0 py-0 text-sm leading-5 font-medium text-slate-700 outline-none">
                            <option value="ALL">Tất cả giáo viên</option>
                            {teacherOptions.map((teacher) => (
                              <option key={teacher.id} value={teacher.id}>
                                {teacher.name}
                              </option>
                            ))}
                          </select>
                          <select value={campusFilter} onChange={(e) => setCampusFilter(e.target.value)} className="w-full border-0 bg-transparent px-0 py-0 text-sm leading-5 font-medium text-slate-700 outline-none">
                            <option value="ALL">Tất cả cơ sở</option>
                            {campusOptions.map((campus) => (
                              <option key={campus} value={campus}>
                                {campus}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="border-t border-slate-100 pt-2">
                          <div className="space-y-1">
                            <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} className="w-full border-0 bg-transparent px-0 py-0 text-sm leading-5 font-medium text-slate-700 outline-none">
                              <option value="ALL">Tất cả trình độ</option>
                              {levelOptions.map((level) => (
                                <option key={level} value={level}>
                                  {level}
                                </option>
                              ))}
                            </select>
                            <select value={languageFilter} onChange={(e) => setLanguageFilter(e.target.value)} className="w-full border-0 bg-transparent px-0 py-0 text-sm leading-5 font-medium text-slate-700 outline-none">
                              <option value="ALL">Tất cả ngôn ngữ</option>
                              {languageOptions.map((language) => (
                                <option key={language} value={language}>
                                  {language}
                                </option>
                              ))}
                            </select>
                              <select
                              value={classTypeFilter}
                              onChange={(e) => setClassTypeFilter(e.target.value as 'ALL' | NonNullable<ITrainingClass['classType']>)}
                              className="w-full border-0 bg-transparent px-0 py-0 text-sm leading-5 font-medium text-slate-700 outline-none"
                            >
                              <option value="ALL">Tất cả hình thức</option>
                              {Object.entries(CLASS_TYPE_LABEL).map(([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="border-t border-slate-100 pt-2">
                          <div className="space-y-1">
                            <select value={roomFilter} onChange={(e) => setRoomFilter(e.target.value)} className="w-full border-0 bg-transparent px-0 py-0 text-sm leading-5 font-medium text-slate-700 outline-none">
                              <option value="ALL">Tất cả phòng</option>
                              {roomOptions.map((room) => (
                                <option key={room} value={room}>
                                  {room}
                                </option>
                              ))}
                            </select>
                            <select value={studyDayFilter} onChange={(e) => setStudyDayFilter(e.target.value as 'ALL' | `${number}`)} className="w-full border-0 bg-transparent px-0 py-0 text-sm leading-5 font-medium text-slate-700 outline-none">
                              <option value="ALL">Tất cả ngày học</option>
                              {DAY_OPTIONS.map((day) => (
                                <option key={day.value} value={String(day.value)}>
                                  {day.label}
                                </option>
                              ))}
                            </select>
                            <select value={timeSlotFilter} onChange={(e) => setTimeSlotFilter(e.target.value)} className="w-full border-0 bg-transparent px-0 py-0 text-sm leading-5 font-medium text-slate-700 outline-none">
                              <option value="ALL">Tất cả khung giờ</option>
                              {timeSlotOptions.map((slot) => (
                                <option key={slot} value={slot}>
                                  {slot}
                                </option>
                              ))}
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

              {columnMenuOpen && (
                <div className="absolute right-0 top-full z-20 mt-3 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-slate-900">Hiển thị cột</div>
                      <div className="text-xs text-slate-500">Mặc định chỉ hiện các trường quan trọng để vừa màn hình.</div>
                    </div>
                    <button
                      type="button"
                      onClick={resetVisibleColumns}
                      className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Mặc định
                    </button>
                  </div>
                  <div className="space-y-1">
                    {CLASS_LIST_COLUMNS.map((column) => {
                      const checked = visibleColumnSet.has(column.key);

                      return (
                        <label key={column.key} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm text-slate-700 hover:bg-slate-50">
                          <div>
                            <div className="font-medium">{column.label}</div>
                            {column.required && <div className="text-xs text-slate-400">Cột cố định</div>}
                          </div>
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={column.required}
                            onChange={() => toggleClassColumn(column.key)}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="w-full px-5 py-4">
            {classItems.length > 0 && (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full table-auto text-sm text-slate-700">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        {activeClassColumns.map((column) => (
                          <th
                            key={column.key}
                            className={`sticky top-0 border-b border-slate-200 bg-slate-50 px-4 py-3 font-semibold ${column.align === 'center' ? 'text-center' : 'text-left'} ${
                              column.key === 'code' ? 'w-[24%]' : ''
                            }`}
                          >
                            {column.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {groupBy.length === 0 &&
                        classItems.map((classItem) => renderClassListRow(classItem))}
                      {groupBy.length > 0 &&
                        groupedClassItems.map((group) => (
                          <React.Fragment key={group.label}>
                            <tr className="border-b border-slate-200 bg-slate-50">
                              <td colSpan={activeClassColumns.length} className="px-4 py-2 text-sm font-semibold text-slate-700">
                                <div className="flex items-center justify-between gap-3">
                                  <span>{group.label}</span>
                                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-500">{group.items.length} lớp</span>
                                </div>
                              </td>
                            </tr>
                            {group.items.map((classItem) => renderClassListRow(classItem))}
                          </React.Fragment>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {!classItems.length && <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-400">Không có lớp phù hợp bộ lọc.</div>}
          </div>
        </div>
        </aside>
      )}

      {selected && (
        <section className="min-w-0 flex-1 overflow-hidden">
          <div className="flex h-full flex-col bg-white">
            <div className="border-b px-5 py-4">
              <div className="mb-3 flex items-center justify-between">
                <h1 className="text-2xl font-bold">{selected.name}</h1>
                <div className="flex items-center gap-2">
                  <select
                    value={selected.status}
                    onChange={(e) => {
                      const s = e.target.value as ITrainingClass['status'];
                      updateClassStatus(selected.id, s);
                      addClassLog(selected.id, 'CLASS_STATUS_CHANGED', `${STATUS_LABEL[selected.status]} -> ${STATUS_LABEL[s]}`, 'training');
                    }}
                    className="rounded-lg border bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700"
                  >
                    {STATUS.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]} ({s})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm text-slate-600 md:grid-cols-3 xl:grid-cols-4">
                <div>
                  Mã lớp: <span className="font-semibold text-slate-800">{selected.code}</span>
                </div>
                <div>
                  Trình độ hiện tại: <span className="font-semibold text-slate-800">{inferredLevel}</span>
                </div>
                <div>
                  Ca dáº¡y: <span className="font-semibold text-slate-800">{`${studyDaysLabel} • ${timeSlotLabel}`}</span>
                </div>
                <div>
                  Buổi: <span className="font-semibold text-slate-800">{sessionCountLabel}</span>
                </div>
                <div>
                  Tiến độ: <span className="font-semibold text-slate-800">{sessionProgressLabel}</span>
                </div>
                <div>
                  Giáo viên: <span className="font-semibold text-slate-800">{selectedTeacher?.fullName || '-'}</span>
                </div>
                <div>
                  Sĩ số: <span className="font-semibold text-slate-800">{classSize} học viên</span>
                </div>
                <div>
                  Ngôn ngữ: <span className="font-semibold text-slate-800">{selected.language || '-'}</span>
                </div>
                <div>
                  Hình thức: <span className="font-semibold text-slate-800">{classType}</span>
                </div>
                <div>
                  Ngày bắt đầu: <span className="font-semibold text-slate-800">{fd(selected.startDate)}</span>
                </div>
                <div>
                  Ngày kết thúc: <span className="font-semibold text-slate-800">{fd(selected.endDate)}</span>
                </div>
                <div>
                  Cơ sở: <span className="font-semibold text-slate-800">{selected.campus || '-'}</span>
                </div>
                <div>
                  Phòng: <span className="font-semibold text-slate-800">{selected.room || '-'}</span>
                </div>
                <div>
                  Trạng thái: <span className="font-semibold text-slate-800">{STATUS_LABEL[selected.status]}</span>
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <select
                  value={newStudentId}
                  onChange={(e) => setNewStudentId(e.target.value)}
                  disabled={locked}
                  className="rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="">-- Chọn học viên --</option>
                  {availableStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
                <button
                  disabled={locked || !newStudentId}
                  onClick={() => {
                    addStudentToClass(selected.id, newStudentId);
                    addClassLog(selected.id, 'ADD_STUDENT', `Thêm ${newStudentId}`, 'training');
                    setNewStudentId('');
                  }}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#1380ec] px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
                >
                  <Plus size={14} /> Thêm học viên
                </button>
              </div>
            </div>

            <div className="border-b px-5">
              <div className="flex items-center gap-2">
                {[
                  { key: 'students' as const, label: 'Học viên' },
                  { key: 'level' as const, label: inferredLevel },
                  { key: 'logs' as const, label: 'Log note' }
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setPrimaryTab(item.key)}
                    className={`border-b-2 px-4 py-3 text-sm font-bold ${primaryTab === item.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              {primaryTab === 'level' && (
                <div className="flex items-center gap-2 border-t">
                  {[
                    { key: 'attendance' as const, label: 'Điểm danh' },
                    { key: 'grades' as const, label: 'Bảng điểm' }
                  ].map((item) => (
                    <button
                      key={item.key}
                      onClick={() => setLevelTab(item.key)}
                      className={`border-b-2 px-4 py-2 text-sm font-semibold ${levelTab === item.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-5">{renderTabContent()}</div>
          </div>
        </section>
      )}

      {createClassOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-5xl rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold">Tạo lớp mới</h3>
                <p className="text-sm text-slate-500">Thiết lập thông tin lớp, phòng học, ngày học và khung giờ trước khi đưa vào vận hành.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCreateClassOpen(false);
                  setCreateClassError('');
                }}
                className="rounded-lg border px-4 py-2 text-sm font-semibold"
              >
                Đóng
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="text-sm">
                <span className="mb-1 block font-semibold text-slate-700">Mã lớp</span>
                <input
                  value={createClassForm.code}
                  onChange={(e) => setCreateClassForm((prev) => ({ ...prev, code: normalizeClassCode(e.target.value) }))}
                  className="w-full rounded-lg border px-3 py-2"
                  placeholder="VD: GER-K001"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-semibold text-slate-700">Tên lớp</span>
                <input
                  value={createClassForm.name}
                  onChange={(e) => setCreateClassForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2"
                  placeholder="VD: Lớp GER-A1-K37"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-semibold text-slate-700">Trình độ</span>
                <input
                  value={createClassForm.level}
                  onChange={(e) => setCreateClassForm((prev) => ({ ...prev, level: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-semibold text-slate-700">Cơ sở</span>
                <input
                  value={createClassForm.campus}
                  onChange={(e) => setCreateClassForm((prev) => ({ ...prev, campus: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-semibold text-slate-700">Phòng</span>
                <input
                  value={createClassForm.room}
                  onChange={(e) => setCreateClassForm((prev) => ({ ...prev, room: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2"
                  placeholder="VD: P.301"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-semibold text-slate-700">Loại lớp</span>
                <select
                  value={createClassForm.classType}
                  onChange={(e) => setCreateClassForm((prev) => ({ ...prev, classType: e.target.value as CreateClassFormState['classType'] }))}
                  className="w-full rounded-lg border px-3 py-2"
                >
                  {Object.entries(CLASS_TYPE_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-semibold text-slate-700">Ngôn ngữ</span>
                <input
                  value={createClassForm.language}
                  onChange={(e) => setCreateClassForm((prev) => ({ ...prev, language: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-semibold text-slate-700">Sĩ số tối đa</span>
                <input
                  type="number"
                  min={1}
                  value={createClassForm.maxStudents}
                  onChange={(e) => setCreateClassForm((prev) => ({ ...prev, maxStudents: Number(e.target.value) || 0 }))}
                  className="w-full rounded-lg border px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-semibold text-slate-700">Ngày bắt đầu</span>
                <input
                  type="date"
                  value={createClassForm.startDate}
                  onChange={(e) => setCreateClassForm((prev) => ({ ...prev, startDate: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-semibold text-slate-700">Ngày kết thúc</span>
                <input
                  type="date"
                  value={createClassForm.endDate}
                  onChange={(e) => setCreateClassForm((prev) => ({ ...prev, endDate: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-semibold text-slate-700">Giáo viên</span>
                <select
                  value={createClassForm.teacherId}
                  onChange={(e) => setCreateClassForm((prev) => ({ ...prev, teacherId: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2"
                >
                  <option value="">-- Chọn giáo viên --</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.fullName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-semibold text-slate-700">Khung giờ</span>
                <select
                  value={createClassForm.timeSlot}
                  onChange={(e) => setCreateClassForm((prev) => ({ ...prev, timeSlot: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2"
                >
                  {TIME_SLOT_OPTIONS.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-4 rounded-xl border bg-slate-50 p-4">
              <div className="mb-2 text-sm font-semibold text-slate-700">Ngày học</div>
              <div className="flex flex-wrap gap-2">
                {DAY_OPTIONS.map((option) => {
                  const active = createClassForm.studyDays.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleCreateClassStudyDay(option.value)}
                      className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                        active ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 rounded-xl border bg-slate-50 p-4">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
                <label className="text-sm">
                  <span className="mb-1 block font-semibold text-slate-700">Chọn lớp cũ để lên lớp</span>
                  <select
                    value={createClassForm.sourceClassId}
                    onChange={(e) =>
                      setCreateClassForm((prev) => ({
                        ...prev,
                        sourceClassId: e.target.value,
                        promotedStudentIds: []
                      }))
                    }
                    className="w-full rounded-lg border px-3 py-2"
                  >
                    <option value="">-- Không chọn lớp cũ --</option>
                    {classes.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.code} - {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div>
                  <div className="mb-1 text-sm font-semibold text-slate-700">Học viên lên lớp</div>
                  <div className="max-h-40 overflow-y-auto rounded-lg border bg-white p-2">
                    {!createClassForm.sourceClassId && <div className="px-2 py-3 text-sm text-slate-400">Chọn lớp cũ để hiện danh sách học viên.</div>}
                    {!!createClassForm.sourceClassId && !sourceClassStudentRows.length && (
                      <div className="px-2 py-3 text-sm text-slate-400">Lớp cũ chưa có học viên.</div>
                    )}
                    {sourceClassStudentRows.map((item) => (
                      <label key={item.member.id} className="flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={createClassForm.promotedStudentIds.includes(item.member.studentId)}
                          onChange={() => togglePromotedStudent(item.member.studentId)}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                        <span className="font-medium text-slate-700">{item.student?.name}</span>
                        <span className="text-xs text-slate-400">{item.student?.code}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {createClassError && <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{createClassError}</div>}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setCreateClassForm(getDefaultCreateClassForm());
                  setCreateClassError('');
                }}
                className="rounded-lg border px-4 py-2 text-sm font-semibold"
              >
                Làm mới
              </button>
              <button type="button" onClick={handleCreateClass} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
                <Plus size={14} /> Tạo lớp
              </button>
            </div>
          </div>
        </div>
      )}

      {noteModal && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-5">
            <h3 className="mb-4 text-lg font-bold">Ghi chú học tập - {noteModal.studentName}</h3>
            {isSessionDateLocked(sessions.find((session) => session.id === noteModal.sessionId)) && (
              <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                Buổi học này đã qua ngày, dữ liệu đang ở chế độ khóa.
              </div>
            )}
            <div className="mb-3">
              <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Buổi học</label>
              <select
                value={noteModal.sessionId}
                onChange={(e) => onChangeNoteSession(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {getSessionLabel(session)} ({fd(session.date)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Nội dung ghi chú & đánh giá</label>
              <textarea
                value={noteModal.note}
                onChange={(e) => setNoteModal((prev) => (prev ? { ...prev, note: e.target.value } : prev))}
                rows={6}
                readOnly={locked || isSessionDateLocked(sessions.find((session) => session.id === noteModal.sessionId))}
                className="w-full rounded-lg border p-3 text-sm"
                placeholder="Nhập ghi chú học tập..."
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setNoteModal(null)} className="rounded-lg border px-4 py-2 text-sm font-semibold">
                Đóng
              </button>
              <button
                disabled={locked || isSessionDateLocked(sessions.find((session) => session.id === noteModal.sessionId)) || !noteModal.note.trim()}
                onClick={saveStudyNote}
                className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                <NotebookPen size={14} /> Lưu ghi chú
              </button>
            </div>
          </div>
        </div>
      )}

      {debtModal && selected && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-5">
            <h3 className="mb-2 text-lg font-bold">Chi tiết công nợ</h3>
            <div className="mb-2 text-sm text-slate-600">Tổng nợ: {formatMoney(debtModal.totalDebt || 0)}</div>
            <table className="w-full">
              <thead>
                <tr>
                  <th className="border-b py-2 text-left text-xs uppercase">Kỳ</th>
                  <th className="border-b py-2 text-left text-xs uppercase">Hạn đóng</th>
                  <th className="border-b py-2 text-left text-xs uppercase">Số tiền</th>
                  <th className="border-b py-2 text-left text-xs uppercase">Trạng thái</th>
                  <th className="border-b py-2 text-right text-xs uppercase">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {(debtModal.debtTerms || []).map((t) => (
                  <tr key={t.termNo}>
                    <td className="py-2 text-sm">Kỳ {t.termNo}</td>
                    <td className="py-2 text-sm">{fd(t.dueDate)}</td>
                    <td className="py-2 text-sm">{formatMoney(t.amount)}</td>
                    <td className="py-2 text-sm">{t.status}</td>
                    <td className="py-2 text-right">
                      <button
                        disabled={locked || t.status === 'PAID'}
                        onClick={() => {
                          const next = markDebtTermPaid(selected.id, debtModal.studentId, t.termNo);
                          if (next) {
                            addClassLog(selected.id, 'UPDATE_DEBT', `Đánh dấu đã thu kỳ ${t.termNo} cho ${debtModal.studentId}`, 'training');
                            setDebtModal(next);
                          }
                        }}
                        className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        Đã đóng
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 text-right">
              <button onClick={() => setDebtModal(null)} className="rounded-lg border px-4 py-2 text-sm font-semibold">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainingClassList;
