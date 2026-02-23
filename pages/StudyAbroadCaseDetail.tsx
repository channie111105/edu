import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getStudyAbroadCaseList,
  StudyAbroadCaseCompleteness,
  StudyAbroadCaseRecord,
  StudyAbroadCmtcStatus,
  StudyAbroadInvoiceStatus,
  StudyAbroadServiceStatus,
  UpdateStudyAbroadCasePayload,
  updateStudyAbroadCase
} from '../services/studyAbroadCases.local';

type EditFormState = UpdateStudyAbroadCasePayload;

const inputClassName =
  'h-8 w-full rounded-md border border-blue-200 bg-[#f3f7ff] px-2.5 text-[13px] text-slate-800 outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100';
const selectClassName =
  'h-8 w-full rounded-md border border-blue-200 bg-[#f3f7ff] px-2.5 pr-8 text-[13px] text-slate-800 outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100';
const labelClassName = 'mb-1 text-[10px] font-bold uppercase tracking-[0.06em] text-slate-600';
const requiredMarkClassName = 'ml-1 text-rose-500';
const primaryButtonClassName =
  'inline-flex h-10 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed';
const secondaryButtonClassName =
  'h-10 rounded-md border border-blue-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-blue-50';

const toEditForm = (row: StudyAbroadCaseRecord): EditFormState => ({
  student: row.student,
  address: row.address,
  phone: row.phone,
  country: row.country,
  program: row.program,
  major: row.major,
  salesperson: row.salesperson,
  branch: row.branch,
  intake: row.intake,
  stage: row.stage,
  caseCompleteness: row.caseCompleteness,
  certificate: row.certificate,
  serviceStatus: row.serviceStatus,
  tuition: row.tuition,
  invoiceStatus: row.invoiceStatus,
  cmtc: row.cmtc,
  expectedFlightTerm: row.expectedFlightTerm
});

const StudyAbroadCaseDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [row, setRow] = useState<StudyAbroadCaseRecord | null>(null);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [saveNotice, setSaveNotice] = useState('');

  const reloadCase = useCallback(() => {
    if (!id) {
      setRow(null);
      setEditForm(null);
      setLoading(false);
      return;
    }

    const found = getStudyAbroadCaseList().find((item) => item.id === id) || null;
    setRow(found);
    setEditForm(found ? toEditForm(found) : null);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    reloadCase();
  }, [reloadCase]);

  useEffect(() => {
    const handleStorage = () => reloadCase();
    const events = [
      'educrm_cases_updated',
      'educrm:study-abroad-cases-changed',
      'educrm:quotations-changed',
      'educrm:leads-changed',
      'educrm:students-changed',
      'educrm:admissions-changed'
    ];

    window.addEventListener('storage', handleStorage);
    events.forEach((eventName) => window.addEventListener(eventName, handleStorage));

    return () => {
      window.removeEventListener('storage', handleStorage);
      events.forEach((eventName) => window.removeEventListener(eventName, handleStorage));
    };
  }, [reloadCase]);

  const updateEditForm = (patch: Partial<EditFormState>) => {
    setEditForm((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const handleSave = () => {
    if (!id || !editForm) return;

    setSaving(true);
    setSaveNotice('');
    const ok = updateStudyAbroadCase(id, editForm, user?.name || 'Study Abroad');
    setSaving(false);

    if (!ok) {
      window.alert('Không thể cập nhật hồ sơ. Vui lòng thử lại.');
      return;
    }

    setSaveNotice('Đã lưu thay đổi hồ sơ.');
    reloadCase();
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#eef4ff] via-[#f8fbff] to-[#edf2ff]">
        <div className="inline-flex items-center gap-2 text-slate-600">
          <Loader2 size={16} className="animate-spin" />
          Đang tải hồ sơ...
        </div>
      </div>
    );
  }

  if (!row || !editForm) {
    return (
      <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#eef4ff] via-[#f8fbff] to-[#edf2ff] p-4">
        <div className="w-full max-w-xl rounded-xl border border-blue-100 bg-white p-6 text-center shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Không tìm thấy hồ sơ</h2>
          <p className="mt-2 text-sm text-slate-500">Hồ sơ có thể đã bị xóa hoặc chưa đồng bộ dữ liệu.</p>
          <button onClick={() => navigate('/study-abroad/cases')} className={`${primaryButtonClassName} mt-4`}>
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden bg-gradient-to-br from-[#eef4ff] via-[#f8fbff] to-[#edf2ff] text-[#111418]">
      <div className="mx-auto flex h-full w-full max-w-[1180px] flex-col gap-2 p-3 lg:p-4">
        <header className="rounded-lg border border-blue-100 bg-white/90 px-4 py-2.5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <button
                onClick={() => navigate('/study-abroad/cases')}
                className="mb-1 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft size={15} />
                Danh sách hồ sơ
              </button>
              <h1 className="truncate text-[24px] font-bold leading-tight text-slate-900 lg:text-[26px]">Chỉnh sửa hồ sơ - {row.soCode}</h1>
              <p className="mt-0.5 text-[13px] text-slate-500">{row.student}</p>
            </div>
          </div>
        </header>

        <section className="flex flex-col overflow-hidden rounded-lg border border-blue-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-blue-100 bg-[#f1f6ff] px-4 py-2.5">
            <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#1f3b73]">Cập nhật thông tin hồ sơ</h2>
            <p className="text-[11px] font-semibold text-slate-500">
              Trường có dấu <span className={requiredMarkClassName}>*</span> là bắt buộc
            </p>
          </div>

          {saveNotice ? (
            <div className="mx-4 mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
              {saveNotice}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3 px-4 py-2.5">
            <div className="rounded-lg border border-blue-100 bg-[#f8fbff] p-3">
              <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Thông tin chính</h3>
              <div className="grid grid-cols-2 gap-x-2.5 gap-y-2">
                <label className="col-span-2 text-sm">
                  <div className={labelClassName}>
                    Học viên<span className={requiredMarkClassName}>*</span>
                  </div>
                  <input
                    value={editForm.student}
                    onChange={(event) => updateEditForm({ student: event.target.value })}
                    className={inputClassName}
                    required
                  />
                </label>

                <label className="text-sm">
                  <div className={labelClassName}>
                    SĐT<span className={requiredMarkClassName}>*</span>
                  </div>
                  <input
                    value={editForm.phone}
                    onChange={(event) => updateEditForm({ phone: event.target.value })}
                    className={inputClassName}
                    required
                  />
                </label>

                <label className="text-sm">
                  <div className={labelClassName}>
                    Quốc gia<span className={requiredMarkClassName}>*</span>
                  </div>
                  <input
                    value={editForm.country}
                    onChange={(event) => updateEditForm({ country: event.target.value })}
                    className={inputClassName}
                    required
                  />
                </label>

                <label className="text-sm">
                  <div className={labelClassName}>
                    Chương trình<span className={requiredMarkClassName}>*</span>
                  </div>
                  <input
                    value={editForm.program}
                    onChange={(event) => updateEditForm({ program: event.target.value })}
                    className={inputClassName}
                    required
                  />
                </label>

                <label className="text-sm">
                  <div className={labelClassName}>
                    Salesperson<span className={requiredMarkClassName}>*</span>
                  </div>
                  <input
                    value={editForm.salesperson}
                    onChange={(event) => updateEditForm({ salesperson: event.target.value })}
                    className={inputClassName}
                    required
                  />
                </label>

                <label className="col-span-2 text-sm">
                  <div className={labelClassName}>Địa chỉ</div>
                  <input
                    value={editForm.address}
                    onChange={(event) => updateEditForm({ address: event.target.value })}
                    className={inputClassName}
                  />
                </label>

                <label className="col-span-2 text-sm">
                  <div className={labelClassName}>Ngành</div>
                  <input
                    value={editForm.major}
                    onChange={(event) => updateEditForm({ major: event.target.value })}
                    className={inputClassName}
                  />
                </label>
              </div>
            </div>

            <div className="rounded-lg border border-blue-100 bg-[#f8fbff] p-3">
              <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Theo dõi hồ sơ</h3>
              <div className="grid grid-cols-2 gap-x-2.5 gap-y-2">
                <label className="text-sm">
                  <div className={labelClassName}>Chi nhánh</div>
                  <input
                    value={editForm.branch}
                    onChange={(event) => updateEditForm({ branch: event.target.value })}
                    className={inputClassName}
                  />
                </label>

                <label className="text-sm">
                  <div className={labelClassName}>Kỳ nhập học</div>
                  <input
                    value={editForm.intake}
                    onChange={(event) => updateEditForm({ intake: event.target.value })}
                    className={inputClassName}
                  />
                </label>

                <label className="text-sm">
                  <div className={labelClassName}>Kỳ bay dự kiến</div>
                  <input
                    value={editForm.expectedFlightTerm}
                    onChange={(event) => updateEditForm({ expectedFlightTerm: event.target.value })}
                    className={inputClassName}
                  />
                </label>

                <label className="text-sm">
                  <div className={labelClassName}>
                    Giai đoạn<span className={requiredMarkClassName}>*</span>
                  </div>
                  <input
                    value={editForm.stage}
                    onChange={(event) => updateEditForm({ stage: event.target.value })}
                    className={inputClassName}
                    required
                  />
                </label>

                <label className="text-sm">
                  <div className={labelClassName}>Chứng chỉ</div>
                  <input
                    value={editForm.certificate}
                    onChange={(event) => updateEditForm({ certificate: event.target.value })}
                    className={inputClassName}
                  />
                </label>

                <label className="text-sm">
                  <div className={labelClassName}>CMTC</div>
                  <select
                    value={editForm.cmtc}
                    onChange={(event) => updateEditForm({ cmtc: event.target.value as StudyAbroadCmtcStatus })}
                    className={selectClassName}
                  >
                    <option value="PENDING">Chưa nộp</option>
                    <option value="APPROVED">Đạt</option>
                    <option value="REJECTED">Cần bổ sung</option>
                  </select>
                </label>

                <label className="text-sm">
                  <div className={labelClassName}>Trạng thái hồ sơ</div>
                  <select
                    value={editForm.caseCompleteness}
                    onChange={(event) =>
                      updateEditForm({ caseCompleteness: event.target.value as StudyAbroadCaseCompleteness })
                    }
                    className={selectClassName}
                  >
                    <option value="FULL">Đủ hồ sơ</option>
                    <option value="MISSING">Chưa đủ</option>
                  </select>
                </label>

                <label className="text-sm">
                  <div className={labelClassName}>
                    Trạng thái dịch vụ<span className={requiredMarkClassName}>*</span>
                  </div>
                  <select
                    value={editForm.serviceStatus}
                    onChange={(event) => updateEditForm({ serviceStatus: event.target.value as StudyAbroadServiceStatus })}
                    className={selectClassName}
                    required
                  >
                    <option value="UNPROCESSED">Chưa xử lý</option>
                    <option value="PROCESSING">Đang xử lý</option>
                  </select>
                </label>

                <label className="text-sm">
                  <div className={labelClassName}>Trạng thái invoice</div>
                  <select
                    value={editForm.invoiceStatus}
                    onChange={(event) => updateEditForm({ invoiceStatus: event.target.value as StudyAbroadInvoiceStatus })}
                    className={selectClassName}
                  >
                    <option value="NONE">Chưa có</option>
                    <option value="HAS_INVOICE">Có invoice</option>
                    <option value="PAID">Đã nộp</option>
                  </select>
                </label>

                <label className="text-sm">
                  <div className={labelClassName}>Học phí</div>
                  <input
                    type="number"
                    value={editForm.tuition}
                    onChange={(event) => updateEditForm({ tuition: Number(event.target.value || 0) })}
                    className={inputClassName}
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-blue-100 bg-[#f8faff] px-4 pt-3 pb-5">
            <button onClick={() => navigate('/study-abroad/cases')} className={secondaryButtonClassName}>
              Hủy
            </button>
            <button onClick={handleSave} disabled={saving} className={primaryButtonClassName}>
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default StudyAbroadCaseDetail;
