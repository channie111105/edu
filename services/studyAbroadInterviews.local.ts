import { decodeMojibakeText } from '../utils/mojibake';

export type StudyAbroadInterviewStatus = 'Scheduled' | 'Pending' | 'Completed' | 'Cancelled';
export type StudyAbroadInterviewType = 'Visa' | 'Entrance Exam';

export interface StudyAbroadInterviewItem {
  id: string;
  date: string;
  time: string;
  studentName: string;
  type: StudyAbroadInterviewType;
  subType: string;
  location: string;
  status: StudyAbroadInterviewStatus;
  reminded: boolean;
  channel: string;
  createdAt: string;
  updatedAt: string;
}

export type StudyAbroadInterviewInput = Omit<StudyAbroadInterviewItem, 'id' | 'createdAt' | 'updatedAt'>;

const STORAGE_KEY = 'educrm_study_abroad_interviews';
const CHANGE_EVENT = 'educrm:study-abroad-interviews-changed';

const INITIAL_INTERVIEWS: StudyAbroadInterviewItem[] = [
  {
    id: 'SAI-001',
    date: '2026-09-10',
    time: '09:00',
    studentName: 'Nguyen Thuy Linh',
    type: 'Visa',
    subType: 'Duc',
    location: 'Dai su quan Duc (Ha Noi)',
    status: 'Scheduled',
    reminded: true,
    channel: 'Zalo',
    createdAt: '2026-09-01T08:00:00.000Z',
    updatedAt: '2026-09-01T08:00:00.000Z'
  },
  {
    id: 'SAI-002',
    date: '2026-09-07',
    time: '14:30',
    studentName: 'Tran Van Minh',
    type: 'Entrance Exam',
    subType: 'TestAS',
    location: 'Online (Zoom Link)',
    status: 'Scheduled',
    reminded: false,
    channel: 'Email',
    createdAt: '2026-09-01T09:00:00.000Z',
    updatedAt: '2026-09-01T09:00:00.000Z'
  },
  {
    id: 'SAI-003',
    date: '2026-09-15',
    time: '10:00',
    studentName: 'Le Hoang',
    type: 'Visa',
    subType: 'Duc',
    location: 'Lanh su quan (HCM)',
    status: 'Pending',
    reminded: false,
    channel: 'Zalo',
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z'
  },
  {
    id: 'SAI-004',
    date: '2026-09-01',
    time: '08:00',
    studentName: 'Pham Huong',
    type: 'Visa',
    subType: 'Duc',
    location: 'Dai su quan Duc (Ha Noi)',
    status: 'Completed',
    reminded: true,
    channel: 'Email',
    createdAt: '2026-09-01T11:00:00.000Z',
    updatedAt: '2026-09-01T11:00:00.000Z'
  },
  {
    id: 'SAI-005',
    date: '2026-09-12',
    time: '13:00',
    studentName: 'Dao Van Hung',
    type: 'Entrance Exam',
    subType: 'Tieng Duc B1',
    location: 'Trung tam Goethe',
    status: 'Cancelled',
    reminded: true,
    channel: 'SMS',
    createdAt: '2026-09-01T12:00:00.000Z',
    updatedAt: '2026-09-01T12:00:00.000Z'
  }
];

const emitChangeEvent = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  }
};

const normalizeText = (value: unknown) => decodeMojibakeText(typeof value === 'string' ? value : '').trim();

const normalizeInterviewStatus = (value: unknown): StudyAbroadInterviewStatus => {
  const token = normalizeText(value).toLowerCase();
  if (token === 'completed') return 'Completed';
  if (token === 'cancelled') return 'Cancelled';
  if (token === 'pending') return 'Pending';
  return 'Scheduled';
};

const normalizeInterviewType = (value: unknown): StudyAbroadInterviewType => {
  const token = normalizeText(value).toLowerCase();
  return token === 'entrance exam' ? 'Entrance Exam' : 'Visa';
};

const normalizeInterviewItem = (value: Partial<StudyAbroadInterviewItem>, index: number): StudyAbroadInterviewItem => {
  const now = new Date().toISOString();

  return {
    id: normalizeText(value.id) || `SAI-${Date.now()}-${index}`,
    date: normalizeText(value.date),
    time: normalizeText(value.time),
    studentName: normalizeText(value.studentName),
    type: normalizeInterviewType(value.type),
    subType: normalizeText(value.subType),
    location: normalizeText(value.location),
    status: normalizeInterviewStatus(value.status),
    reminded: Boolean(value.reminded),
    channel: normalizeText(value.channel) || 'Zalo',
    createdAt: normalizeText(value.createdAt) || now,
    updatedAt: normalizeText(value.updatedAt) || normalizeText(value.createdAt) || now
  };
};

const loadStoredInterviews = (): StudyAbroadInterviewItem[] => {
  if (typeof window === 'undefined') return INITIAL_INTERVIEWS;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_INTERVIEWS;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return INITIAL_INTERVIEWS;

    return parsed.map((item, index) => normalizeInterviewItem(item, index));
  } catch {
    return INITIAL_INTERVIEWS;
  }
};

const saveStoredInterviews = (items: StudyAbroadInterviewItem[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  emitChangeEvent();
};

export const getStudyAbroadInterviews = (): StudyAbroadInterviewItem[] => loadStoredInterviews();

export const addStudyAbroadInterview = (payload: StudyAbroadInterviewInput): StudyAbroadInterviewItem => {
  const list = loadStoredInterviews();
  const now = new Date().toISOString();
  const nextItem = normalizeInterviewItem(
    {
      ...payload,
      id: `SAI-${Date.now()}`,
      createdAt: now,
      updatedAt: now
    },
    0
  );

  saveStoredInterviews([nextItem, ...list]);
  return nextItem;
};

export const updateStudyAbroadInterview = (updated: StudyAbroadInterviewItem): boolean => {
  const list = loadStoredInterviews();
  const index = list.findIndex((item) => item.id === updated.id);
  if (index < 0) return false;

  list[index] = normalizeInterviewItem(
    {
      ...list[index],
      ...updated,
      updatedAt: new Date().toISOString()
    },
    index
  );
  saveStoredInterviews(list);
  return true;
};

export const deleteStudyAbroadInterview = (id: string): boolean => {
  const list = loadStoredInterviews();
  const nextList = list.filter((item) => item.id !== id);
  if (nextList.length === list.length) return false;
  saveStoredInterviews(nextList);
  return true;
};
