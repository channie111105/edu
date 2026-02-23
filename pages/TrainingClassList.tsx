import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, FileSpreadsheet, NotebookPen, Plus, Save, Search, StickyNote } from 'lucide-react';
import {
  AttendanceStatus,
  IAttendanceRecord,
  IClassSession,
  IClassStudent,
  IStudent,
  IStudentScore,
  IStudyNote,
  ITrainingClass
} from '../types';
import {
  addClassLog,
  addStudentToClass,
  ensureDefaultSessionsForClass,
  getAttendanceByClassId,
  getClassStudents,
  getLogNotes,
  getSessionsByClassId,
  getStudentScoresByClassId,
  getStudents,
  getStudyNotesByClassId,
  getTrainingClasses,
  markDebtTermPaid,
  removeStudentFromClass,
  saveClassStudents,
  transferStudentClass,
  updateClassStatus,
  upsertAttendance,
  upsertStudentScore,
  upsertStudyNote
} from '../utils/storage';

const STATUS = ['DRAFT', 'ACTIVE', 'DONE', 'CANCELED'] as const;
const STATUS_LABEL: Record<ITrainingClass['status'], string> = {
  DRAFT: 'Nháp',
  ACTIVE: 'Đang học',
  DONE: 'Đã kết thúc',
  CANCELED: 'Đã hủy'
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
const rank = (v: number) => (v >= 8.5 ? 'A' : v >= 7 ? 'B' : v >= 5.5 ? 'C' : 'D');
const fd = (v?: string) => (v ? new Date(v).toLocaleDateString('vi-VN') : '-');
const formatMoney = (value: number) => value.toLocaleString('vi-VN') + ' đ';
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

type Row = { member: IClassStudent; student?: IStudent; score?: IStudentScore };
type TabKey = 'overview' | 'attendance' | 'grades' | 'logs';
type AttendanceDraft = Record<string, AttendanceStatus | ''>;
type NoteModalState = { studentId: string; studentName: string; sessionId: string; note: string };
const TAB_ITEMS: Array<{ key: TabKey; label: string }> = [
  { key: 'overview', label: 'Thông tin & Học viên' },
  { key: 'attendance', label: 'Điểm danh & Log Note' },
  { key: 'grades', label: 'Bảng điểm' },
  { key: 'logs', label: 'Log lớp' }
];

const attendanceKey = (studentId: string, sessionId: string) => `${studentId}__${sessionId}`;

const normalizeSessionTitle = (value?: string) => {
  const raw = (value || '').trim();
  if (!raw) return '';
  if (/[ÃÂ]/.test(raw) || raw.includes('\uFFFD')) return '';
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
  const [students, setStudents] = useState<IStudent[]>([]);
  const [members, setMembers] = useState<IClassStudent[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [tab, setTab] = useState<TabKey>('overview');
  const [search, setSearch] = useState('');
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
  const [noteModal, setNoteModal] = useState<NoteModalState | null>(null);

  const loadBaseData = () => {
    setClasses(getTrainingClasses());
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
      'educrm:students-changed',
      'educrm:class-students-changed',
      'educrm:student-scores-changed',
      'educrm:log-notes-changed'
    ].forEach((e) => window.addEventListener(e, h as EventListener));
    return () =>
      [
        'educrm:training-classes-changed',
        'educrm:students-changed',
        'educrm:class-students-changed',
        'educrm:student-scores-changed',
        'educrm:log-notes-changed'
      ].forEach((e) => window.removeEventListener(e, h as EventListener));
  }, []);

  useEffect(() => {
    if (!selectedClassId && classes.length) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, selectedClassId]);

  const selected = classes.find((c) => c.id === selectedClassId) || classes[0];
  const locked = !!selected && (selected.status === 'DONE' || selected.status === 'CANCELED');

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

  const logs = useMemo(() => (selected ? getLogNotes('CLASS', selected.id) : []), [selected, members, classes]);
  const classItems = classes.filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase())
  );
  const availableStudents = selected ? students.filter((s) => !rows.some((r) => r.member.studentId === s.id)) : [];
  const transferTargets = selected ? classes.filter((c) => c.id !== selected.id) : [];
  const inferredLevel = selected?.level || selected?.code.match(/(A1|A2|B1|B2|C1|C2)/i)?.[1]?.toUpperCase() || '-';
  const scheduleRange = selected && (selected.startDate || selected.endDate) ? `${fd(selected.startDate)} - ${fd(selected.endDate)}` : '-';
  const classSize = selected ? `${rows.length}/${selected.maxStudents ?? 25}` : '-';
  const classType = selected?.classType ? CLASS_TYPE_LABEL[selected.classType] : '-';

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
      return 'Không có kỳ thu';
    }
    return '-';
  };

  const renderDebtBadge = (status?: IClassStudent['debtStatus']) => {
    if (!status) return <span>-</span>;
    return <span className={`rounded-full px-2 py-1 text-xs font-bold ${DEBT_BADGE[status]}`}>{DEBT_LABEL[status]}</span>;
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
    const key = attendanceKey(studentId, sessionId);
    setAttendanceDraft((prev) => ({ ...prev, [key]: value }));
    setAttendanceSaveMessage('');
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

    if (tab === 'overview') {
      return (
        <table className="w-full">
          <thead>
            <tr>
              <th className="border-b py-2 text-left text-xs uppercase">Học viên</th>
              <th className="border-b py-2 text-left text-xs uppercase">Trạng thái</th>
              <th className="border-b py-2 text-left text-xs uppercase">Công nợ</th>
              <th className="border-b py-2 text-left text-xs uppercase">Hạn đóng</th>
              <th className="border-b py-2 text-right text-xs uppercase">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.member.id}>
                <td className="border-b py-2">
                  <div className="font-semibold">{r.student?.name || r.member.studentId}</div>
                  <div className="text-xs text-slate-500">{r.student?.code || '-'}</div>
                </td>
                <td className="border-b py-2">
                  <select
                    value={r.member.status}
                    onChange={(e) => changeMember(r.member, e.target.value as IClassStudent['status'])}
                    disabled={locked}
                    className="rounded-lg border px-2 py-1 text-xs"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="BAO_LUU">Bảo lưu</option>
                    <option value="NGHI_HOC">Nghỉ học</option>
                  </select>
                </td>
                <td className="border-b py-2">{renderDebtBadge(r.member.debtStatus)}</td>
                <td className="border-b py-2">{getDueLabel(r.member)}</td>
                <td className="border-b py-2 text-right">
                  <div className="flex justify-end gap-2">
                    <select
                      value={toClass}
                      onChange={(e) => setToClass(e.target.value)}
                      disabled={locked}
                      className="rounded-lg border px-2 py-1 text-xs"
                    >
                      <option value="">Lớp đích</option>
                      {transferTargets.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code}
                        </option>
                      ))}
                    </select>
                    <button
                      disabled={locked || !toClass}
                      onClick={() => {
                        transferStudentClass(r.member.studentId, selected.id, toClass);
                        addClassLog(selected.id, 'TRANSFER_OUT', `Chuyển ${r.member.studentId} sang ${toClass}`, 'training');
                        addClassLog(toClass, 'TRANSFER_IN', `Nhận ${r.member.studentId} từ ${selected.code}`, 'training');
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 disabled:opacity-50"
                    >
                      <ArrowRightLeft size={12} /> Chuyển
                    </button>
                    <button onClick={() => setDebtModal(r.member)} className="rounded-lg border px-2 py-1 text-xs">
                      Công nợ
                    </button>
                    <button
                      disabled={locked}
                      onClick={() => {
                        removeStudentFromClass(selected.id, r.member.studentId);
                        addClassLog(selected.id, 'REMOVE_STUDENT', `Bỏ ${r.member.studentId}`, 'training');
                      }}
                      className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700 disabled:opacity-50"
                    >
                      Bỏ
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (tab === 'attendance') {
      return (
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-slate-50 px-3 py-3">
            <div className="flex flex-wrap items-center gap-2">
              {(['PRESENT', 'ABSENT', 'LATE'] as const).map((status) => (
                <span key={status} className={`rounded-full px-3 py-1 text-xs font-bold ${ATTENDANCE_BADGE[status]}`}>
                  {ATTENDANCE_LABEL[status]}
                </span>
              ))}
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
                title="TODO: thay bằng API export Excel backend"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-600"
              >
                <FileSpreadsheet size={13} /> Xuất Excel (TODO)
              </button>
            </div>
          </div>

          {!rows.length ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">
              Chưa có học viên để điểm danh
            </div>
          ) : (
            <div className="max-w-full overflow-x-auto rounded-xl border">
              <table className="min-w-[1040px] w-max">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="border-b px-3 py-2 text-left text-xs uppercase">Học viên</th>
                    {sessions.map((session) => (
                      <th key={session.id} className="border-b px-3 py-2 text-left text-xs uppercase">
                        <div>{getSessionShortTitle(session)}</div>
                        <div className="mt-1 text-[10px] font-medium normal-case text-slate-500">{fd(session.date)}</div>
                      </th>
                    ))}
                    <th className="border-b px-3 py-2 text-left text-xs uppercase">Tổng kết (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.member.id}>
                      <td className="border-b px-3 py-2">
                        <div className="font-semibold">{r.student?.name || r.member.studentId}</div>
                        <div className="text-xs text-slate-500">{r.student?.code || '-'}</div>
                      </td>
                      {sessions.map((session) => {
                        const cellValue = getAttendanceCellValue(r.member.studentId, session.id);
                        const noteKey = attendanceKey(r.member.studentId, session.id);
                        const hasNote = !!studyNoteMap.get(noteKey)?.note?.trim();
                        return (
                          <td key={`${r.member.id}-${session.id}`} className="border-b px-3 py-2">
                            <div className="flex items-center gap-2">
                              <select
                                value={cellValue}
                                disabled={locked}
                                onChange={(e) =>
                                  setAttendanceCellValue(r.member.studentId, session.id, e.target.value as AttendanceStatus | '')
                                }
                                className="rounded-lg border px-2 py-1 text-xs"
                              >
                                <option value="">-- Chọn --</option>
                                {(['PRESENT', 'ABSENT', 'LATE'] as const).map((status) => (
                                  <option key={status} value={status}>
                                    {ATTENDANCE_LABEL[status]}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => openNoteModal(r, session.id)}
                                className={`rounded-lg border px-2 py-1 ${hasNote ? 'border-blue-200 bg-blue-50 text-blue-700' : 'text-slate-500'}`}
                                title={`Ghi chú ${getSessionLabel(session)}`}
                              >
                                <StickyNote size={13} />
                              </button>
                            </div>
                          </td>
                        );
                      })}
                      <td className="border-b px-3 py-2 text-sm font-semibold text-slate-700">
                        {getStudentAttendanceSummary(r.member.studentId)}
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

    if (tab === 'grades') {
      return (
        <table className="w-full">
          <thead>
            <tr>
              <th className="border-b py-2 text-left text-xs uppercase">Học viên</th>
              <th className="border-b py-2 text-left text-xs uppercase">Bài tập</th>
              <th className="border-b py-2 text-left text-xs uppercase">Giữa kỳ</th>
              <th className="border-b py-2 text-left text-xs uppercase">Cuối kỳ</th>
              <th className="border-b py-2 text-left text-xs uppercase">TB</th>
              <th className="border-b py-2 text-left text-xs uppercase">Xếp loại</th>
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
              const rk = rank(avg);
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
                  <td className="border-b py-2">{rk}</td>
                  <td className="border-b py-2 text-right">
                    <button
                      disabled={locked}
                      onClick={() => {
                        const prev = r.score;
                        const next = upsertStudentScore(selected.id, r.member.studentId, d);
                        addClassLog(
                          selected.id,
                          'UPDATE_SCORE',
                          `GK ${prev?.midterm ?? 0}->${next.midterm}, CK ${prev?.final ?? 0}->${next.final}`,
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
              Thêm log
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto rounded-xl border p-3">
          {logs.map((l) => (
            <div key={l.id} className="rounded-lg border bg-[#f8fafc] p-3">
              <p className="text-sm font-semibold">{l.action}</p>
              <p className="text-sm text-slate-700">{l.message}</p>
              <p className="text-xs text-slate-500">
                {fd(l.createdAt)} - {l.createdBy}
              </p>
            </div>
          ))}
          {!logs.length && <p className="text-sm text-slate-500">Chưa có log lớp.</p>}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full gap-4 overflow-x-hidden bg-[#f8fafc] px-6 py-5">
      <div className="w-80 shrink-0 rounded-xl border bg-white p-3">
        <div className="mb-3 text-lg font-bold">Quản lý lớp</div>
        <div className="mb-3 flex items-center rounded-lg border px-3">
          <Search size={16} className="text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border-0 px-2 py-2 text-sm outline-none"
            placeholder="Tìm lớp..."
          />
        </div>
        <div className="space-y-2">
          {classItems.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedClassId(c.id)}
              className={`w-full rounded-lg border p-3 text-left ${selected?.id === c.id ? 'border-blue-200 bg-blue-50' : 'border-transparent hover:bg-slate-50'}`}
            >
              <div className="text-sm font-bold">{c.name}</div>
              <div className="text-xs text-slate-500">{c.code}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="min-w-0 flex-1 rounded-xl border bg-white">
        {selected && (
          <>
            <div className="border-b px-5 py-4">
              <div className="mb-3 flex items-center justify-between">
                <h1 className="text-2xl font-bold">{selected.name}</h1>
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

              <div className="grid grid-cols-2 gap-3 text-sm text-slate-600 md:grid-cols-3 xl:grid-cols-4">
                <div>
                  Mã lớp: <span className="font-semibold text-slate-800">{selected.code}</span>
                </div>
                <div>
                  Trình độ: <span className="font-semibold text-slate-800">{inferredLevel}</span>
                </div>
                <div>
                  Cơ sở: <span className="font-semibold text-slate-800">{selected.campus || '-'}</span>
                </div>
                <div>
                  Ngày dự kiến: <span className="whitespace-nowrap font-semibold text-slate-800">{scheduleRange}</span>
                </div>
                <div>
                  Sĩ số: <span className="font-semibold text-slate-800">{classSize} học viên</span>
                </div>
                <div>
                  Ca dạy: <span className="font-semibold text-slate-800">{selected.schedule || '-'}</span>
                </div>
                <div>
                  Ngôn ngữ: <span className="font-semibold text-slate-800">{selected.language || '-'}</span>
                </div>
                <div>
                  Loại lớp: <span className="font-semibold text-slate-800">{classType}</span>
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
              {TAB_ITEMS.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setTab(item.key)}
                  className={`border-b-2 px-4 py-3 text-sm font-bold ${tab === item.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="h-[520px] overflow-y-auto overflow-x-hidden p-5">{renderTabContent()}</div>
          </>
        )}
      </div>

      {noteModal && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-5">
            <h3 className="mb-4 text-lg font-bold">Ghi chú học tập - {noteModal.studentName}</h3>
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
                readOnly={locked}
                className="w-full rounded-lg border p-3 text-sm"
                placeholder="Nhập ghi chú học tập..."
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setNoteModal(null)} className="rounded-lg border px-4 py-2 text-sm font-semibold">
                Đóng
              </button>
              <button
                disabled={locked || !noteModal.note.trim()}
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
