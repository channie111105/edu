import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Search, XCircle } from 'lucide-react';
import { IAdmission, IQuotation, IStudent, UserRole } from '../types';
import { getAdmissions, getQuotations, getStudents } from '../utils/storage';
import { approveAdmission, rejectAdmission } from '../services/enrollmentFlow.service';
import { useAuth } from '../contexts/AuthContext';

const ContractApprovalQueue: React.FC = () => {
  const { user } = useAuth();
  const canApproveByTraining = user?.role === UserRole.TRAINING;
  const [admissions, setAdmissions] = useState<IAdmission[]>([]);
  const [students, setStudents] = useState<IStudent[]>([]);
  const [quotations, setQuotations] = useState<IQuotation[]>([]);
  const [search, setSearch] = useState('');
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [decisionId, setDecisionId] = useState<string | null>(null);
  const [decisionAction, setDecisionAction] = useState<'approve' | 'reject'>('approve');
  const [decisionNote, setDecisionNote] = useState('');

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

  const rows = useMemo(() => {
    return admissions
      .filter((a) => a.status === 'CHO_DUYET')
      .map((a) => {
        const student = students.find((s) => s.id === a.studentId);
        const quotation = quotations.find((q) => q.id === a.quotationId);
        return {
          admission: a,
          student,
          quotation
        };
      })
      .filter((row) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        const fields = [
          row.admission.code,
          row.student?.name,
          row.student?.phone,
          row.admission.classId,
          row.admission.campusId,
          row.quotation?.soCode
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return fields.includes(q);
      });
  }, [admissions, students, quotations, search]);

  const openDecisionModal = (id: string, action: 'approve' | 'reject' = 'approve') => {
    if (!canApproveByTraining) {
      alert('Chỉ Quản lý Đào tạo được duyệt hồ sơ chờ duyệt');
      return;
    }
    setDecisionId(id);
    setDecisionAction(action);
    setDecisionNote('');
    setShowDecisionModal(true);
  };

  const handleDecision = () => {
    if (!canApproveByTraining) {
      alert('Chỉ Quản lý Đào tạo được duyệt hồ sơ chờ duyệt');
      return;
    }
    if (!decisionId) return;

    const res =
      decisionAction === 'approve'
        ? approveAdmission(decisionId, user?.id || 'training', decisionNote.trim())
        : rejectAdmission(decisionId, decisionNote.trim(), user?.id || 'training');

    if (!res.ok) {
      alert(decisionAction === 'approve' ? 'Không thể duyệt hồ sơ này' : 'Không thể từ chối hồ sơ này');
      return;
    }
    setShowDecisionModal(false);
    setDecisionId(null);
    setDecisionNote('');
    loadData();
    alert(decisionAction === 'approve' ? 'Đã duyệt ghi danh và cập nhật trạng thái hợp đồng' : 'Đã từ chối hồ sơ chờ duyệt');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans text-slate-800">
      <div className="flex justify-between items-end gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Hàng chờ duyệt Ghi danh</h1>
          <p className="text-slate-500 text-sm mt-1">Đào tạo xác nhận các hồ sơ Admission đang chờ duyệt.</p>
          {!canApproveByTraining && (
            <p className="text-amber-700 text-xs mt-1 font-medium">Chế độ xem: chỉ Quản lý Đào tạo mới được Confirm/Từ chối.</p>
          )}
        </div>
        <div className="text-sm font-medium text-slate-600">Chờ duyệt: <b>{rows.length}</b></div>
      </div>

      <div className="relative mb-4 max-w-lg">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo mã admission, học viên, SO, lớp..."
          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 w-16 text-center">STT</th>
              <th className="px-4 py-3">Admission</th>
              <th className="px-4 py-3">Học viên</th>
              <th className="px-4 py-3">SO liên quan</th>
              <th className="px-4 py-3">Cơ sở / Lớp</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length > 0 ? (
              rows.map(({ admission, student, quotation }, index) => (
                <tr key={admission.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-center font-semibold text-slate-500">{index + 1}</td>
                  <td className="px-4 py-3 font-bold text-indigo-700">{admission.code}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{student?.name || 'N/A'}</div>
                    <div className="text-xs text-slate-500">{student?.phone || 'N/A'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{quotation?.soCode || '-'}</div>
                    <div className="text-xs text-slate-500">{quotation?.customerName || ''}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{admission.campusId}</div>
                    <div className="text-xs text-indigo-700 font-semibold">{admission.classId}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">CHO_DUYET</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canApproveByTraining ? (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openDecisionModal(admission.id)}
                          className="px-3 py-1.5 rounded text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 inline-flex items-center gap-1"
                        >
                          <CheckCircle2 size={13} /> Duyệt admission
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-amber-700">Quản lý Đào tạo xác nhận</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-500">Không có admission chờ duyệt.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showDecisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="bg-white w-full max-w-md rounded-xl shadow-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">Duyệt admission</h3>
              <button onClick={() => setShowDecisionModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                onClick={() => setDecisionAction('approve')}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold ${decisionAction === 'approve' ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-300 text-slate-700'}`}
              >
                Đồng ý
              </button>
              <button
                onClick={() => setDecisionAction('reject')}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold ${decisionAction === 'reject' ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-slate-300 text-slate-700'}`}
              >
                Từ chối
              </button>
            </div>
            <textarea
              className="w-full h-28 border border-slate-300 rounded p-2 text-sm"
              placeholder="Nhập ghi chú duyệt..."
              value={decisionNote}
              onChange={(e) => setDecisionNote(e.target.value)}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowDecisionModal(false)} className="px-3 py-2 rounded border border-slate-300 text-slate-700">Hủy</button>
              <button onClick={handleDecision} className={`px-3 py-2 rounded text-white inline-flex items-center gap-1 ${decisionAction === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}>
                {decisionAction === 'approve' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                {decisionAction === 'approve' ? 'Xác nhận duyệt' : 'Xác nhận từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractApprovalQueue;
