import React, { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { IAdmission, IQuotation, IStudent, QuotationStatus } from '../types';
import { getAdmissions, getQuotations, getStudents } from '../utils/storage';
import { createAdmission } from '../services/enrollmentFlow.service';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const MOCK_CLASSES = ['GER-A1-K35', 'GER-A1-K36', 'GER-B1-K12', 'AUS-COOK-K01'];
const MOCK_CAMPUSES = ['Hà Nội', 'HCM', 'Đà Nẵng'];

type StudentRow = {
  student: IStudent;
  lockedQuotation: IQuotation;
  latestAdmission?: IAdmission;
};

const Contracts: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [admissions, setAdmissions] = useState<IAdmission[]>([]);
  const [students, setStudents] = useState<IStudent[]>([]);
  const [quotations, setQuotations] = useState<IQuotation[]>([]);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [form, setForm] = useState({
    studentId: '',
    quotationId: '',
    campusId: 'Hà Nội',
    classId: '',
    note: ''
  });

  const loadData = () => {
    setAdmissions(getAdmissions());
    setStudents(getStudents() as IStudent[]);
    setQuotations(getQuotations());
  };

  useEffect(() => {
    loadData();
    window.addEventListener('educrm:admissions-changed', loadData as EventListener);
    window.addEventListener('educrm:students-changed', loadData as EventListener);
    window.addEventListener('educrm:quotations-changed', loadData as EventListener);
    return () => {
      window.removeEventListener('educrm:admissions-changed', loadData as EventListener);
      window.removeEventListener('educrm:students-changed', loadData as EventListener);
      window.removeEventListener('educrm:quotations-changed', loadData as EventListener);
    };
  }, []);

  const rows = useMemo<StudentRow[]>(() => {
    return students
      .map((student) => {
        const lockedQuotation = quotations.find(
          (q) =>
            q.status === QuotationStatus.LOCKED &&
            (q.studentId === student.id || (!!student.soId && q.id === student.soId))
        );
        if (!lockedQuotation) return null;

        const latestAdmission = admissions
          .filter((a) => a.studentId === student.id)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

        return { student, lockedQuotation, latestAdmission };
      })
      .filter(Boolean)
      .filter((row) => {
        const r = row as StudentRow;
        const q = search.trim().toLowerCase();
        if (!q) return true;
        const text = [
          r.student.code,
          r.student.name,
          r.student.phone,
          r.lockedQuotation.soCode,
          r.latestAdmission?.classId,
          r.latestAdmission?.campusId,
          (r.student as any).enrollmentStatus,
          r.latestAdmission?.status
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return text.includes(q);
      }) as StudentRow[];
  }, [admissions, students, quotations, search]);

  const admissionEligibleStudents = useMemo(() => {
    return students.filter((s) => {
      const linkedQuotation = quotations.find((q) => q.studentId === s.id && q.status === QuotationStatus.LOCKED);
      if (!linkedQuotation) return false;
      if ((s as any).enrollmentStatus === 'DA_GHI_DANH') return false;
      return true;
    });
  }, [students, quotations]);

  const linkedQuotationsForStudent = useMemo(() => {
    if (!form.studentId) return [];
    return quotations.filter((q) => q.studentId === form.studentId && q.status === QuotationStatus.LOCKED);
  }, [form.studentId, quotations]);

  const admissionStatusBadge = (status?: IAdmission['status']) => {
    if (!status) return <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">CHƯA TẠO</span>;
    if (status === 'CHO_DUYET') return <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">CHO_DUYET</span>;
    if (status === 'DA_DUYET') return <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">DA_DUYET</span>;
    if (status === 'TU_CHOI') return <span className="px-2 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-bold">TU_CHOI</span>;
    return <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">DRAFT</span>;
  };

  const enrollmentStatusBadge = (status?: string) => {
    if (status === 'DA_GHI_DANH') return <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">ĐÃ GHI DANH</span>;
    return <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">CHƯA GHI DANH</span>;
  };

  const openEnroll = (student?: IStudent, quotationId?: string) => {
    setForm({
      studentId: student?.id || '',
      quotationId: quotationId || '',
      campusId: student?.campus || 'Hà Nội',
      classId: '',
      note: ''
    });
    setShowCreateModal(true);
  };

  const onStudentChange = (studentId: string) => {
    const selectedStudent = students.find((s) => s.id === studentId);
    const studentQuotations = quotations.filter((q) => q.studentId === studentId && q.status === QuotationStatus.LOCKED);
    setForm((prev) => ({
      ...prev,
      studentId,
      quotationId: studentQuotations[0]?.id || '',
      campusId: selectedStudent?.campus || prev.campusId
    }));
  };

  const handleCreate = () => {
    if (!form.studentId || !form.classId || !form.campusId) {
      alert('Vui lòng chọn học viên, cơ sở, lớp');
      return;
    }
    if (!form.quotationId) {
      alert('Không tìm thấy báo giá đã Khóa để ghi danh');
      return;
    }

    try {
      createAdmission({
        studentId: form.studentId,
        quotationId: form.quotationId || undefined,
        classId: form.classId,
        campusId: form.campusId,
        note: form.note,
        createdBy: user?.id || 'system'
      });
    } catch (error: any) {
      alert(error?.message || 'Không thể tạo ghi danh');
      return;
    }

    setShowCreateModal(false);
    loadData();
    alert('Đã tạo ghi danh, trạng thái CHO_DUYET');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans text-slate-800">
      <div className="flex justify-between items-end gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Học viên</h1>
          <p className="text-slate-500 text-sm mt-1">Tự động tạo hồ sơ sau khi SO được khóa. Sale bấm Ghi danh, Đào tạo duyệt ở Hàng chờ Duyệt.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/contracts/approvals')}
            className="px-4 py-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 font-semibold"
          >
            Hàng chờ Duyệt
          </button>
        </div>
      </div>

      <div className="relative mb-4 max-w-lg">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          placeholder="Tìm theo mã học viên, học viên, SO, lớp..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Mã học viên</th>
              <th className="px-4 py-3">Học viên</th>
              <th className="px-4 py-3">SO (Đã khóa)</th>
              <th className="px-4 py-3">Cơ sở / Lớp</th>
              <th className="px-4 py-3">Trạng thái học viên</th>
              <th className="px-4 py-3">Trạng thái Admission</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length > 0 ? (
              rows.map(({ student, lockedQuotation, latestAdmission }) => (
                <tr key={student.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold text-indigo-700">{student.code || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold">{student.name || 'N/A'}</div>
                    <div className="text-xs text-slate-500">{student.phone || '-'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{lockedQuotation.soCode}</div>
                    <div className="text-xs text-slate-500">{lockedQuotation.customerName || ''}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{latestAdmission?.campusId || student.campus || '-'}</div>
                    <div className="text-xs font-semibold text-indigo-700">{latestAdmission?.classId || student.className || '-'}</div>
                  </td>
                  <td className="px-4 py-3">{enrollmentStatusBadge((student as any).enrollmentStatus)}</td>
                  <td className="px-4 py-3">{admissionStatusBadge(latestAdmission?.status)}</td>
                  <td className="px-4 py-3 text-right">
                    {(student as any).enrollmentStatus !== 'DA_GHI_DANH' && latestAdmission?.status !== 'CHO_DUYET' ? (
                      <button
                        onClick={() => openEnroll(student, lockedQuotation.id)}
                        className="px-3 py-1.5 rounded bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
                      >
                        Ghi danh
                      </button>
                    ) : latestAdmission?.status === 'CHO_DUYET' ? (
                      <span className="text-xs text-amber-700 font-semibold">Đang chờ duyệt</span>
                    ) : (
                      <span className="text-xs text-slate-500">Đã ghi danh</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-500">Chưa có học viên đủ điều kiện (cần SO đã khóa).</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-xl p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Ghi danh học viên</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold mb-1">Học viên (chỉ hiện khi Quotation đã LOCKED)</label>
                <select
                  value={form.studentId}
                  onChange={(e) => onStudentChange(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2"
                >
                  <option value="">-- Chọn học viên --</option>
                  {admissionEligibleStudents.map((s) => (
                    <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                  ))}
                </select>
                {admissionEligibleStudents.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">Chưa có học viên nào đủ điều kiện (cần có báo giá đã Khóa).</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">SO liên quan</label>
                <select
                  value={form.quotationId}
                  onChange={(e) => setForm((p) => ({ ...p, quotationId: e.target.value }))}
                  className="w-full border border-slate-300 rounded p-2"
                  disabled={!form.studentId}
                >
                  <option value="">-- Chọn SO --</option>
                  {linkedQuotationsForStudent.map((q) => (
                    <option key={q.id} value={q.id}>{q.soCode} - {q.customerName}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold mb-1">Cơ sở *</label>
                  <select
                    value={form.campusId}
                    onChange={(e) => setForm((p) => ({ ...p, campusId: e.target.value }))}
                    className="w-full border border-slate-300 rounded p-2"
                  >
                    {MOCK_CAMPUSES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Lớp *</label>
                  <select
                    value={form.classId}
                    onChange={(e) => setForm((p) => ({ ...p, classId: e.target.value }))}
                    className="w-full border border-slate-300 rounded p-2"
                  >
                    <option value="">-- Chọn lớp --</option>
                    {MOCK_CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Ghi chú</label>
                <textarea
                  value={form.note}
                  onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
                  className="w-full border border-slate-300 rounded p-2 h-20"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowCreateModal(false)} className="px-3 py-2 border rounded border-slate-300">Hủy</button>
              <button onClick={handleCreate} className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Lưu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contracts;
