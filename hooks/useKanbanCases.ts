import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getStudyAbroadCaseList,
  StudyAbroadCaseRecord,
  updateStudyAbroadCaseInternalNote,
  updateStudyAbroadCaseStage
} from '../services/studyAbroadCases.local';

export type StageId =
  | 'stage-1'
  | 'stage-2'
  | 'stage-3'
  | 'stage-4'
  | 'stage-5'
  | 'stage-6'
  | 'stage-7'
  | 'stage-8'
  | 'stage-9';

export type KanbanStage = {
  id: StageId;
  title: string;
  color: string;
};

export type KanbanCaseItem = {
  id: string;
  studentName: string;
  dateOfBirth?: string;
  program: string;
  country: string;
  processorName: string;
  caseCompletenessLabel: string;
  tags: string[];
  noOfferWarning?: boolean;
  internalNote?: string;
  internalNoteUpdatedAt?: string;
  stageId: StageId;
  stageUpdatedAt?: string;
};

export type KanbanStageData = Record<StageId, KanbanCaseItem[]>;

export const KANBAN_STAGES: KanbanStage[] = [
  { id: 'stage-1', title: 'HỒ SƠ MỚI', color: 'bg-slate-500' },
  { id: 'stage-2', title: 'ĐANG XỬ LÝ', color: 'bg-blue-500' },
  { id: 'stage-3', title: 'ĐÃ NỘP TRƯỜNG', color: 'bg-cyan-500' },
  { id: 'stage-4', title: 'ĐÃ PHỎNG VẤN VS TRƯỜNG', color: 'bg-indigo-500' },
  { id: 'stage-5', title: 'CÓ THƯ MỜI', color: 'bg-purple-500' },
  { id: 'stage-6', title: 'ĐÃ PHỎNG VẤN ĐSQ (XIN VISA)', color: 'bg-orange-500' },
  { id: 'stage-7', title: 'CÓ VISA', color: 'bg-green-500' },
  { id: 'stage-8', title: 'BAY', color: 'bg-emerald-600' },
  { id: 'stage-9', title: 'HỒ SƠ HUỶ', color: 'bg-rose-500' }
];

const WATCHED_STORAGE_KEYS = new Set([
  'educrm_quotations',
  'educrm_leads_v2',
  'educrm_students',
  'educrm_admissions',
  'educrm_transactions',
  'educrm_invoices'
]);

const STAGE_TITLE_BY_ID: Record<StageId, string> = KANBAN_STAGES.reduce((acc, stage) => {
  acc[stage.id] = stage.title;
  return acc;
}, {} as Record<StageId, string>);

const normalizeToken = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const createEmptyStageData = (): KanbanStageData =>
  KANBAN_STAGES.reduce((acc, stage) => {
    acc[stage.id] = [];
    return acc;
  }, {} as KanbanStageData);

const formatProgramLabel = (value: string) => {
  const token = normalizeToken(value || '');
  if ((token.includes('duc') || token.includes('germany')) && (token.includes('dai_hoc') || token.includes('dh'))) {
    return 'DH ĐH Đức';
  }
  if (token.includes('nghe')) return 'DH nghề';
  if (token.includes('trung') || token.includes('tq') || token.includes('china')) return 'DH TQ';
  return value || 'Chưa cập nhật';
};

const getCaseCompletenessLabel = (value: StudyAbroadCaseRecord['caseCompleteness']) =>
  value === 'FULL' ? 'Đã đủ' : 'Chưa đủ';

const buildCaseTags = (row: StudyAbroadCaseRecord): string[] => {
  const tags: string[] = [];

  if (row.serviceStatus === 'WITHDRAWN') {
    tags.push('Tạm dừng');
  }

  if (row.caseCompleteness === 'MISSING' || row.translationStatus === 'NOT_YET' || row.visaStatus === 'SUPPLEMENT') {
    tags.push('Bổ sung giấy tờ');
  }

  if (row.flightStatus === 'CANCELLED' || row.serviceStatus === 'REPROCESSING') {
    tags.push('Delay kỳ bay');
  }

  tags.push(`Trạng thái hồ sơ: ${getCaseCompletenessLabel(row.caseCompleteness)}`);

  return Array.from(new Set(tags));
};

const mapCaseToStageId = (row: StudyAbroadCaseRecord): StageId => {
  if (row.serviceStatus === 'WITHDRAWN') return 'stage-9';
  if (row.flightStatus === 'DEPARTED' || row.serviceStatus === 'DEPARTED') return 'stage-8';
  if (row.visaStatus === 'GRANTED') return 'stage-7';
  if (
    row.serviceStatus === 'VISA_FAILED' ||
    row.embassyAppointmentStatus === 'BOOKED' ||
    row.embassyAppointmentStatus === 'SCHEDULED' ||
    row.visaStatus === 'SUBMITTED' ||
    row.visaStatus === 'SUPPLEMENT' ||
    row.visaStatus === 'FAILED'
  ) {
    return 'stage-6';
  }
  if (row.offerLetterStatus === 'RECEIVED') return 'stage-5';
  if (
    row.schoolInterviewStatus === 'SCHEDULED' ||
    row.schoolInterviewStatus === 'INTERVIEWED' ||
    row.schoolInterviewStatus === 'PASSED'
  ) {
    return 'stage-4';
  }
  if (row.offerLetterStatus === 'SENT') return 'stage-3';
  if (row.programSelectionStatus === 'SELECTED') return 'stage-2';

  const token = normalizeToken(row.stage || '');
  if (token.includes('rut') || token.includes('withdraw') || token.includes('huy') || token.includes('cancel')) {
    return 'stage-9';
  }
  if (token.includes('da_bay') || token.includes('dang_hoc')) return 'stage-8';
  if (token.includes('co_visa') || token.includes('do_visa') || token.includes('visa_granted')) return 'stage-7';
  if (token.includes('lich_hen') || token.includes('dsq') || token.includes('dai_su_quan') || token.includes('nop_dsq')) {
    return 'stage-6';
  }
  if (token.includes('thu_moi') || token.includes('offer') || token.includes('admit')) return 'stage-5';
  if (token.includes('phong_van') || token.includes('interview') || token.includes('ghi_danh')) return 'stage-4';
  if (token.includes('nop_truong') || token.includes('submitted_school') || token.includes('apply_school')) return 'stage-3';
  if (token.includes('chon_chuong_trinh') || token.includes('chuong_trinh')) return 'stage-2';
  if (token.includes('ho_so_moi') || token.includes('dang_xu_ly')) return 'stage-1';

  return row.serviceStatus === 'NEW' || row.serviceStatus === 'UNPROCESSED' ? 'stage-1' : 'stage-2';
};

const toKanbanItem = (row: StudyAbroadCaseRecord): KanbanCaseItem => ({
  id: row.id,
  studentName: row.student,
  dateOfBirth: row.dateOfBirth,
  program: formatProgramLabel(row.program),
  country: row.country,
  processorName: row.processorName || row.salesperson,
  caseCompletenessLabel: getCaseCompletenessLabel(row.caseCompleteness),
  tags: buildCaseTags(row),
  noOfferWarning: row.serviceStatus === 'REPROCESSING' && row.offerLetterStatus !== 'RECEIVED',
  internalNote: row.internalNote,
  internalNoteUpdatedAt: row.internalNoteUpdatedAt,
  stageId: mapCaseToStageId(row),
  stageUpdatedAt: row.stageUpdatedAt
});

const groupByStage = (rows: StudyAbroadCaseRecord[]): KanbanStageData => {
  const grouped = createEmptyStageData();
  rows.forEach((row) => {
    const item = toKanbanItem(row);
    grouped[item.stageId].push(item);
  });
  return grouped;
};

const moveItemAcrossStages = (
  data: KanbanStageData,
  caseId: string,
  targetStageId: StageId,
  destinationIndex = 0,
  stageUpdatedAt?: string
): KanbanStageData => {
  const next = createEmptyStageData();
  (Object.keys(data) as StageId[]).forEach((stageId) => {
    next[stageId] = [...data[stageId]];
  });

  let movingItem: KanbanCaseItem | null = null;
  (Object.keys(next) as StageId[]).some((stageId) => {
    const index = next[stageId].findIndex((item) => item.id === caseId);
    if (index < 0) return false;
    const [removed] = next[stageId].splice(index, 1);
    movingItem = removed;
    return true;
  });

  if (!movingItem) return data;

  const insertIndex = Math.max(0, Math.min(destinationIndex, next[targetStageId].length));
  next[targetStageId].splice(insertIndex, 0, {
    ...movingItem,
    stageId: targetStageId,
    stageUpdatedAt
  });

  return next;
};

export const useKanbanCases = (updatedBy = 'Study Abroad') => {
  const [rows, setRows] = useState<StudyAbroadCaseRecord[]>([]);
  const [stageData, setStageData] = useState<KanbanStageData>(createEmptyStageData);
  const [loading, setLoading] = useState(true);

  const reloadCases = useCallback(() => {
    setLoading(true);
    const nextRows = getStudyAbroadCaseList();
    setRows(nextRows);
    setStageData(groupByStage(nextRows));
    setLoading(false);
  }, []);

  useEffect(() => {
    reloadCases();
  }, [reloadCases]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (!event.key || WATCHED_STORAGE_KEYS.has(event.key)) {
        reloadCases();
      }
    };
    const handleClientRefresh = () => reloadCases();

    const watchEvents = [
      'educrm_cases_updated',
      'educrm:study-abroad-cases-changed',
      'educrm:quotations-changed',
      'educrm:leads-changed',
      'educrm:students-changed',
      'educrm:admissions-changed'
    ];

    window.addEventListener('storage', handleStorage);
    watchEvents.forEach((eventName) => window.addEventListener(eventName, handleClientRefresh));

    return () => {
      window.removeEventListener('storage', handleStorage);
      watchEvents.forEach((eventName) => window.removeEventListener(eventName, handleClientRefresh));
    };
  }, [reloadCases]);

  const updateCaseStage = useCallback(
    async (
      caseId: string,
      targetStageId: StageId,
      options?: { destinationIndex?: number; actorName?: string }
    ): Promise<boolean> => {
      const previousRows = rows;
      const previousStageData = stageData;
      const now = new Date().toISOString();
      const stageLabel = STAGE_TITLE_BY_ID[targetStageId];
      const destinationIndex = options?.destinationIndex ?? 0;

      setRows((prev) =>
        prev.map((row) =>
          row.id === caseId
            ? {
                ...row,
                stage: stageLabel,
                stageUpdatedAt: now
              }
            : row
        )
      );
      setStageData((prev) => moveItemAcrossStages(prev, caseId, targetStageId, destinationIndex, now));

      const ok = updateStudyAbroadCaseStage(caseId, stageLabel, options?.actorName || updatedBy);
      if (!ok) {
        setRows(previousRows);
        setStageData(previousStageData);
      }
      return ok;
    },
    [rows, stageData, updatedBy]
  );

  const saveInternalNote = useCallback(
    async (caseId: string, note: string, actorName?: string): Promise<boolean> => {
      const previousRows = rows;
      const previousStageData = stageData;
      const normalizedNote = note.trim();
      const now = new Date().toISOString();

      setRows((prev) =>
        prev.map((row) =>
          row.id === caseId
            ? {
                ...row,
                internalNote: normalizedNote || undefined,
                internalNoteUpdatedAt: normalizedNote ? now : undefined
              }
            : row
        )
      );

      setStageData((prev) => {
        const next = createEmptyStageData();
        (Object.keys(prev) as StageId[]).forEach((stageId) => {
          next[stageId] = prev[stageId].map((item) =>
            item.id === caseId
              ? {
                  ...item,
                  internalNote: normalizedNote || undefined,
                  internalNoteUpdatedAt: normalizedNote ? now : undefined
                }
              : item
          );
        });
        return next;
      });

      const ok = updateStudyAbroadCaseInternalNote(caseId, note, actorName || updatedBy);
      if (!ok) {
        setRows(previousRows);
        setStageData(previousStageData);
      }
      return ok;
    },
    [rows, stageData, updatedBy]
  );

  const totalCount = useMemo(() => rows.length, [rows]);

  return {
    loading,
    rows,
    stageData,
    totalCount,
    stages: KANBAN_STAGES,
    reloadCases,
    updateCaseStage,
    saveInternalNote
  };
};
