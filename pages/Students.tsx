import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, GraduationCap } from 'lucide-react';
import { IAdmission, IQuotation, IStudent, QuotationStatus, StudentStatus } from '../types';
import { getAdmissions, getQuotations, getStudents, quotationLinksToStudent } from '../utils/storage';
import { createAdmission } from '../services/enrollmentFlow.service';
import { useAuth } from '../contexts/AuthContext';
import PinnedSearchInput, { PinnedSearchChip } from '../components/PinnedSearchInput';

const MOCK_CLASSES = ['GER-A1-K35', 'GER-A1-K36', 'GER-B1-K12', 'AUS-COOK-K01'];
const MOCK_CAMPUSES = ['Ha Noi', 'HCM', 'Da Nang'];

const formatDisplayDate = (value?: string) => {
  if (!value) return '--/--/----';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN');
};

const Students: React.FC = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<IStudent[]>([]);
  const [quotations, setQuotations] = useState<IQuotation[]>([]);
  const [admissions, setAdmissions] = useState<IAdmission[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'CHUA_GHI_DANH' | 'DA_GHI_DANH'>('CHUA_GHI_DANH');
  const [search, setSearch] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<IStudent | null>(null);
  const [enrollData, setEnrollData] = useState({
    quotationId: '',
    campusId: 'Ha Noi',
    classId: '',
    note: ''
  });

  const loadData = () => {
    setStudents(getStudents() as IStudent[]);
    setQuotations(getQuotations());
    setAdmissions(getAdmissions());
  };

  useEffect(() => {
    loadData();
    window.addEventListener('educrm:students-changed', loadData as EventListener);
    window.addEventListener('educrm:quotations-changed', loadData as EventListener);
    window.addEventListener('educrm:admissions-changed', loadData as EventListener);
    return () => {
      window.removeEventListener('educrm:students-changed', loadData as EventListener);
      window.removeEventListener('educrm:quotations-changed', loadData as EventListener);
      window.removeEventListener('educrm:admissions-changed', loadData as EventListener);
    };
  }, []);

  const getLockedQuotationsForStudent = (student: IStudent) =>
    quotations.filter((q) => q.status === QuotationStatus.LOCKED && quotationLinksToStudent(q, student));

  const hasLockedQuotation = (studentId: string) => {
    const student = students.find((item) => item.id === studentId);
    if (!student) return false;
    return getLockedQuotationsForStudent(student).length > 0;
  };

  const filteredData = useMemo(() => {
    return students.filter((s) => {
      const linkedToEnrollmentFlow =
        getLockedQuotationsForStudent(s).length > 0 ||
        admissions.some((admission) => admission.studentId === s.id);
      if (!linkedToEnrollmentFlow) return false;

      const status = s.enrollmentStatus || (s.status === StudentStatus.ENROLLED ? 'DA_GHI_DANH' : 'CHUA_GHI_DANH');
      const statusOk = filter === 'ALL' || status === filter;
      const searchOk = `${s.code} ${s.name} ${s.phone} ${s.dob || ''} ${s.payerName || ''}`.toLowerCase().includes(search.toLowerCase());
      return statusOk && searchOk;
    });
  }, [admissions, filter, quotations, search, students]);

  const filterLabelMap: Record<'ALL' | 'CHUA_GHI_DANH' | 'DA_GHI_DANH', string> = {
    ALL: 'Tat ca',
    CHUA_GHI_DANH: 'Chua ghi danh',
    DA_GHI_DANH: 'Da ghi danh'
  };

  const activeSearchChips = useMemo<PinnedSearchChip[]>(() => {
    if (filter === 'ALL') return [];
    return [
      {
        key: 'enrollmentStatus',
        label: `Trang thai: ${filterLabelMap[filter]}`
      }
    ];
  }, [filter]);

  const removeSearchChip = (chipKey: string) => {
    if (chipKey === 'enrollmentStatus') {
      setFilter('ALL');
    }
  };

  const clearAllSearchFilters = () => {
    setSearch('');
    setFilter('ALL');
  };

  const openEnroll = (student: IStudent) => {
    const lockedQuotation = getLockedQuotationsForStudent(student)[0];
    setSelectedStudent(student);
    setEnrollData({
      quotationId: lockedQuotation?.id || '',
      campusId: student.campus || 'Ha Noi',
      classId: student.className || '',
      note: ''
    });
    setShowModal(true);
  };

  const submitEnroll = () => {
    if (!selectedStudent) return;
    if (!enrollData.campusId || !enrollData.classId) {
      alert('Vui long chon co so va lop');
      return;
    }
    if (!enrollData.quotationId) {
      alert('Không tìm thấy báo giá đã Khóa để ghi danh');
      return;
    }

    try {
      createAdmission({
        studentId: selectedStudent.id,
        quotationId: enrollData.quotationId || undefined,
        campusId: enrollData.campusId,
        classId: enrollData.classId,
        note: enrollData.note,
        createdBy: user?.id || 'system'
      });
    } catch (error: any) {
      alert(error?.message || 'Không thể tạo Admission');
      return;
    }

    setShowModal(false);
    setSelectedStudent(null);
    loadData();
    alert('Da tao Admission CHO_DUYET. Student van CHUA_GHI_DANH cho toi khi Dao tao confirm.');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans text-slate-800">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <GraduationCap className="text-indigo-600" /> Quan ly Hoc vien
        </h1>
        <p className="text-slate-500 text-sm mt-1">Lock Quotation se tao Student. Sale bam "Ghi danh" de tao Admission cho dao tao duyet.</p>
      </div>

      <div className="flex bg-slate-100 p-1 rounded-lg w-fit mb-4">
        <button onClick={() => setFilter('CHUA_GHI_DANH')} className={`px-4 py-2 rounded-md text-sm font-bold ${filter === 'CHUA_GHI_DANH' ? 'bg-white text-indigo-700' : 'text-slate-500'}`}>CHUA_GHI_DANH</button>
        <button onClick={() => setFilter('DA_GHI_DANH')} className={`px-4 py-2 rounded-md text-sm font-bold ${filter === 'DA_GHI_DANH' ? 'bg-white text-green-700' : 'text-slate-500'}`}>DA_GHI_DANH</button>
        <button onClick={() => setFilter('ALL')} className={`px-4 py-2 rounded-md text-sm font-bold ${filter === 'ALL' ? 'bg-white text-slate-900' : 'text-slate-500'}`}>Tat ca</button>
      </div>

      <div className="mb-6 max-w-2xl">
        <PinnedSearchInput
          value={search}
          onChange={setSearch}
          placeholder="Tim theo ten, ma, SDT..."
          chips={activeSearchChips}
          onRemoveChip={removeSearchChip}
          onClearAll={clearAllSearchFilters}
          clearAllAriaLabel="Xoa tat ca bo loc hoc vien"
          inputClassName="text-sm h-7"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">Ma HV</th>
              <th className="px-6 py-4">Hoc vien</th>
              <th className="px-6 py-4">Co so / Lop</th>
              <th className="px-6 py-4">Trang thai</th>
              <th className="px-6 py-4 text-right">Hanh dong</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredData.length > 0 ? (
              filteredData.map((student) => {
                const enrollmentStatus = student.enrollmentStatus || (student.status === StudentStatus.ENROLLED ? 'DA_GHI_DANH' : 'CHUA_GHI_DANH');
                const hasPendingAdmission = admissions.some((a) => a.studentId === student.id && a.status === 'CHO_DUYET');
                const canEnroll = enrollmentStatus === 'CHUA_GHI_DANH' && hasLockedQuotation(student.id) && !hasPendingAdmission;
                return (
                  <tr key={student.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-mono font-bold text-slate-700">{student.code}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{student.name}</div>
                      <div className="text-xs text-slate-500">{student.phone}</div>
                      <div className="text-[11px] text-slate-400">
                        NS: {formatDisplayDate(student.dob)}{student.payerName ? ` • Lead/thu tiền: ${student.payerName}` : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>{student.campus || '-'}</div>
                      <div className="text-xs text-indigo-700 font-semibold">{student.className || 'Chua xep lop'}</div>
                    </td>
                    <td className="px-6 py-4">
                      {enrollmentStatus === 'CHUA_GHI_DANH' ? (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 inline-flex items-center gap-1">
                          <AlertCircle size={12} /> CHUA_GHI_DANH
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 inline-flex items-center gap-1">
                          <CheckCircle2 size={12} /> DA_GHI_DANH
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {canEnroll ? (
                        <button onClick={() => openEnroll(student)} className="bg-indigo-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-indigo-700">Ghi danh</button>
                      ) : (
                        <span className="text-xs text-slate-400">
                          {enrollmentStatus === 'DA_GHI_DANH' ? 'Da ghi danh' : hasPendingAdmission ? 'Dang cho duyet Admission' : 'Can Lock Quotation'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="text-center py-12 text-slate-500">Khong co hoc vien phu hop.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-lg w-full">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Ghi danh hoc vien</h3>
            <p className="text-sm text-slate-500 mb-4">Tao Admission CHO_DUYET cho {selectedStudent.name}</p>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-semibold block mb-1">SO LOCKED lien quan</label>
                <select className="w-full border border-slate-300 rounded p-2" value={enrollData.quotationId} onChange={(e) => setEnrollData((p) => ({ ...p, quotationId: e.target.value }))}>
                  <option value="">-- Chon SO --</option>
                  {getLockedQuotationsForStudent(selectedStudent).map((q) => (
                    <option key={q.id} value={q.id}>{q.soCode} - {q.customerName}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold block mb-1">Co so *</label>
                  <select className="w-full border border-slate-300 rounded p-2" value={enrollData.campusId} onChange={(e) => setEnrollData((p) => ({ ...p, campusId: e.target.value }))}>
                    {MOCK_CAMPUSES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold block mb-1">Lop *</label>
                  <select className="w-full border border-slate-300 rounded p-2" value={enrollData.classId} onChange={(e) => setEnrollData((p) => ({ ...p, classId: e.target.value }))}>
                    <option value="">-- Chon lop --</option>
                    {MOCK_CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold block mb-1">Ghi chu</label>
                <textarea className="w-full border border-slate-300 rounded p-2 h-20" value={enrollData.note} onChange={(e) => setEnrollData((p) => ({ ...p, note: e.target.value }))} />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowModal(false)} className="px-3 py-2 border border-slate-300 rounded">Huy</button>
              <button onClick={submitEnroll} className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Luu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;
