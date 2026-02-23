import {
  IAdmission,
  IQuotation,
  IStudent,
  QuotationStatus,
  StudentStatus
} from '../types';
import {
  addStudentToClass,
  addClassLog,
  addAdmission,
  createStudentFromQuotation,
  getAdmissions,
  getQuotations,
  getStudents,
  updateAdmission,
  updateQuotation,
  updateStudent
} from '../utils/storage';

type CreateAdmissionPayload = {
  studentId: string;
  quotationId?: string;
  classId: string;
  campusId: string;
  createdBy: string;
  note?: string;
};

type ServiceResult<T> = {
  ok: boolean;
  data?: T;
  error?: string;
};

const appendLog = (quotation: IQuotation, action: string, detail: string, user = 'System'): IQuotation => ({
  ...quotation,
  logNotes: [
    {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user,
      action,
      detail
    },
    ...(quotation.logNotes || [])
  ]
});

export const ensureStudentProfileFromQuotation = (quotationId: string): IStudent | null => {
  // TODO: replace mock store with BE API
  const quotation = getQuotations().find((q) => q.id === quotationId);
  if (!quotation) return null;

  const students = getStudents();
  const existing = students.find((s: any) =>
    (quotation.studentId && s.id === quotation.studentId) ||
    (quotation.customerId && s.customerId === quotation.customerId) ||
    (quotation.leadId && s.customerId === quotation.leadId)
  );

  if (existing) return existing as IStudent;
  return createStudentFromQuotation(quotation) as IStudent;
};

export const lockQuotation = (id: string): { quotation?: IQuotation; student?: IStudent; ok: boolean } => {
  // TODO: replace mock store with BE API
  const quotation = getQuotations().find((q) => q.id === id);
  if (!quotation) return { ok: false };
  if (quotation.status !== QuotationStatus.SALE_CONFIRMED && quotation.status !== QuotationStatus.SALE_ORDER) {
    return { ok: false };
  }
  if (quotation.transactionStatus !== 'DA_DUYET') {
    return { ok: false };
  }

  const student = ensureStudentProfileFromQuotation(id);
  const updated = appendLog(
    {
      ...quotation,
      status: QuotationStatus.LOCKED,
      contractStatus: 'signed_contract',
      lockedAt: new Date().toISOString(),
      studentId: student?.id || quotation.studentId,
      updatedAt: new Date().toISOString()
    },
    'Lock Quotation',
    `Locked and linked student ${student?.code || 'N/A'}`
  );

  updateQuotation(updated);
  return { quotation: updated, student: student || undefined, ok: true };
};

export const createAdmission = (payload: CreateAdmissionPayload): IAdmission => {
  // TODO: replace mock store with BE API
  if (!payload.studentId || !payload.classId || !payload.campusId) {
    throw new Error('Vui lòng chọn học viên, cơ sở và lớp');
  }

  const students = getStudents();
  const student = students.find((s: any) => s.id === payload.studentId);
  if (!student) {
    throw new Error('Không tìm thấy học viên');
  }

  const existingPending = getAdmissions().find(
    (a) => a.studentId === payload.studentId && a.status === 'CHO_DUYET'
  );
  if (existingPending) {
    throw new Error(`Học viên đang có hồ sơ ${existingPending.code} chờ duyệt`);
  }

  const quotations = getQuotations();
  let linkedQuotation = payload.quotationId
    ? quotations.find((q) => q.id === payload.quotationId)
    : undefined;

  if (linkedQuotation && linkedQuotation.status !== QuotationStatus.LOCKED) {
    throw new Error('Chỉ có thể ghi danh từ báo giá đã Khóa');
  }

  if (!linkedQuotation) {
    linkedQuotation = quotations.find(
      (q) =>
        q.status === QuotationStatus.LOCKED &&
        (q.studentId === student.id ||
          (!!student.customerId && q.customerId === student.customerId) ||
          (!!student.soId && q.id === student.soId))
    );
  }

  if (!linkedQuotation) {
    throw new Error('Không tìm thấy báo giá đã Khóa để ghi danh');
  }

  const next = getAdmissions().length + 1;
  const item: IAdmission = {
    id: `ADM-${Date.now()}`,
    code: `ADM${String(next).padStart(4, '0')}`,
    studentId: payload.studentId,
    quotationId: linkedQuotation.id,
    classId: payload.classId,
    campusId: payload.campusId,
    status: 'CHO_DUYET',
    createdBy: payload.createdBy,
    createdAt: new Date().toISOString(),
    note: payload.note
  };

  addAdmission(item);

  updateStudent({
    ...student,
    campus: payload.campusId,
    className: payload.classId,
    classId: payload.classId,
    enrollmentStatus: 'CHUA_GHI_DANH',
    status: StudentStatus.ADMISSION
  });

  updateQuotation(
    appendLog(
      {
        ...linkedQuotation,
        updatedAt: new Date().toISOString()
      },
      'Create Admission',
      `Sale tạo ${item.code} chờ duyệt`,
      payload.createdBy
    )
  );

  return item;
};

export const approveAdmission = (
  admissionId: string,
  approvedBy = 'training'
): ServiceResult<{ admission: IAdmission; student?: IStudent; quotation?: IQuotation }> => {
  // TODO: replace mock store with BE API
  const admission = getAdmissions().find((a) => a.id === admissionId);
  if (!admission || admission.status !== 'CHO_DUYET') {
    return { ok: false, error: 'Không thể duyệt hồ sơ này' };
  }

  if (!admission.studentId || !admission.campusId || !admission.classId) {
    return { ok: false, error: 'Admission thiếu dữ liệu bắt buộc (student/campus/class)' };
  }

  const student = getStudents().find((s: any) => s.id === admission.studentId);
  if (!student) {
    return { ok: false, error: 'Không tìm thấy học viên của hồ sơ ghi danh' };
  }

  const quotations = getQuotations();
  const linkedQuotation =
    (admission.quotationId ? quotations.find((q) => q.id === admission.quotationId) : undefined) ||
    quotations.find(
      (q) =>
        (q.status === QuotationStatus.LOCKED || q.status === QuotationStatus.SALE_CONFIRMED) &&
        (q.studentId === student.id ||
          (!!student.customerId && q.customerId === student.customerId) ||
          (!!student.soId && q.id === student.soId))
    );

  if (!linkedQuotation) {
    return { ok: false, error: 'Không tìm thấy SO liên quan để duyệt ghi danh' };
  }

  const approvedAt = new Date().toISOString();

  const approved: IAdmission = {
    ...admission,
    quotationId: linkedQuotation.id,
    status: 'DA_DUYET',
    approvedAt,
    approvedBy,
    updatedAt: approvedAt
  };
  updateAdmission(approved);

  const updatedStudent: IStudent = {
    ...student,
    campus: admission.campusId,
    classId: admission.classId,
    className: admission.classId,
    enrollmentStatus: 'DA_GHI_DANH',
    status: StudentStatus.ENROLLED
  };
  updateStudent(updatedStudent);

  const updatedQuotation = appendLog(
    {
      ...linkedQuotation,
      studentId: linkedQuotation.studentId || student.id,
      contractStatus: 'enrolled',
      updatedAt: approvedAt
    },
    'Approve Admission',
    `Training confirmed admission ${approved.code} and assigned student to class ${admission.classId} at ${approvedAt}`,
    approvedBy
  );
  updateQuotation(updatedQuotation);
  addStudentToClass(admission.classId, admission.studentId);
  addClassLog(
    admission.classId,
    'TRAINING_CONFIRM_ADMISSION',
    `Đào tạo duyệt ${approved.code}, gán học viên ${updatedStudent.name} vào lớp`,
    approvedBy
  );

  return { ok: true, data: { admission: approved, student: updatedStudent, quotation: updatedQuotation } };
};

export const rejectAdmission = (admissionId: string, reason?: string): { ok: boolean; admission?: IAdmission } => {
  // TODO: replace mock store with BE API
  const admission = getAdmissions().find((a) => a.id === admissionId);
  if (!admission || admission.status !== 'CHO_DUYET') return { ok: false };

  const rejected: IAdmission = {
    ...admission,
    status: 'TU_CHOI',
    note: reason || admission.note,
    updatedAt: new Date().toISOString()
  };
  updateAdmission(rejected);
  return { ok: true, admission: rejected };
};
