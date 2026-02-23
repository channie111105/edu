import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, CheckCircle2, Search } from 'lucide-react';
import { getClassStudents, getStudents, getTrainingClasses } from '../utils/storage';
import { IClassStudent } from '../types';

type DebtStatus = 'THIEU' | 'QUA_HAN' | 'DA_DONG';
type StatusFilter = 'ALL' | DebtStatus;

type DebtRow = {
  id: string;
  studentCode: string;
  studentName: string;
  className: string;
  totalDebt: number;
  dueDate: string;
  overdueDays: number;
  status: DebtStatus;
};

const STATUS_META: Record<DebtStatus, { label: string; badge: string }> = {
  THIEU: { label: 'Trong hạn', badge: 'bg-amber-100 text-amber-700 border-amber-200' },
  QUA_HAN: { label: 'Quá hạn', badge: 'bg-red-100 text-red-700 border-red-200' },
  DA_DONG: { label: 'Đã đóng', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
};

const money = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

const formatDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('vi-VN');
};

const toDateOnly = (value?: string) => {
  if (!value) return null;
  const raw = value.includes('T') ? value : `${value}T00:00:00`;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const getNearestDueDate = (item: IClassStudent) => {
  if (item.nearestDueDate) return item.nearestDueDate;
  const pendingTerms = (item.debtTerms || [])
    .filter((term) => term.status !== 'PAID')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  return pendingTerms[0]?.dueDate || '';
};

const getTotalDebt = (item: IClassStudent) => {
  if (typeof item.totalDebt === 'number') return item.totalDebt;
  return (item.debtTerms || [])
    .filter((term) => term.status !== 'PAID')
    .reduce((sum, term) => sum + Number(term.amount || 0), 0);
};

const getOverdueDays = (dueDate: string, totalDebt: number) => {
  if (!dueDate || totalDebt <= 0) return 0;
  const due = toDateOnly(dueDate);
  if (!due) return 0;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = today.getTime() - due.getTime();
  if (diffMs <= 0) return 0;
  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
};

const FinanceDebtList: React.FC = () => {
  const [classStudents, setClassStudents] = useState<IClassStudent[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = () => {
    setClassStudents(getClassStudents());
    setStudents(getStudents());
    setClasses(getTrainingClasses());
  };

  useEffect(() => {
    loadData();
    window.addEventListener('educrm:class-students-changed', loadData as EventListener);
    window.addEventListener('educrm:students-changed', loadData as EventListener);
    window.addEventListener('educrm:training-classes-changed', loadData as EventListener);
    return () => {
      window.removeEventListener('educrm:class-students-changed', loadData as EventListener);
      window.removeEventListener('educrm:students-changed', loadData as EventListener);
      window.removeEventListener('educrm:training-classes-changed', loadData as EventListener);
    };
  }, []);

  const studentMap = useMemo(() => {
    return new Map(students.map((item) => [item.id, item]));
  }, [students]);

  const classMap = useMemo(() => {
    return new Map(classes.map((item) => [item.id, item]));
  }, [classes]);

  const rows = useMemo<DebtRow[]>(() => {
    return classStudents
      .map((item) => {
        const student = studentMap.get(item.studentId);
        const classInfo = classMap.get(item.classId);
        const totalDebt = getTotalDebt(item);
        const dueDate = getNearestDueDate(item);
        const overdueDays = getOverdueDays(dueDate, totalDebt);
        const status: DebtStatus =
          totalDebt <= 0 ? 'DA_DONG' : overdueDays > 0 || item.debtStatus === 'QUA_HAN' ? 'QUA_HAN' : 'THIEU';

        return {
          id: item.id,
          studentCode: student?.code || item.studentId,
          studentName: student?.name || item.studentId,
          className: classInfo?.name || item.classId,
          totalDebt,
          dueDate,
          overdueDays,
          status
        };
      })
      .sort((a, b) => {
        if (a.status === 'QUA_HAN' && b.status !== 'QUA_HAN') return -1;
        if (a.status !== 'QUA_HAN' && b.status === 'QUA_HAN') return 1;
        return b.totalDebt - a.totalDebt;
      });
  }, [classStudents, studentMap, classMap]);

  const filteredRows = useMemo(() => {
    return rows.filter((item) => {
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      const q = searchTerm.trim().toLowerCase();
      if (!q) return true;
      return [item.studentCode, item.studentName, item.className, STATUS_META[item.status].label]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [rows, statusFilter, searchTerm]);

  const summary = useMemo(() => {
    const totalDebt = rows.reduce((sum, item) => sum + item.totalDebt, 0);
    const overdueRows = rows.filter((item) => item.status === 'QUA_HAN' && item.totalDebt > 0);
    const dueSoonRows = rows.filter((item) => {
      if (item.totalDebt <= 0 || item.status !== 'THIEU') return false;
      const due = toDateOnly(item.dueDate);
      if (!due) return false;
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const diffDays = Math.ceil((due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
      return diffDays >= 0 && diffDays <= 7;
    });

    return {
      totalDebt,
      overdueAmount: overdueRows.reduce((sum, item) => sum + item.totalDebt, 0),
      overdueCount: overdueRows.length,
      dueSoonCount: dueSoonRows.length
    };
  }, [rows]);

  return (
    <div className="p-8 max-w-[1600px] mx-auto bg-[#F8FAFC] min-h-screen font-sans text-slate-900">
      <div className="mb-6">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Công nợ - Danh sách</h1>
        <p className="text-slate-500">Theo dõi công nợ phải thu, ngày đến hạn và số ngày quá hạn của từng học viên.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Tổng công nợ</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{money(summary.totalDebt)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Sắp đến hạn (7 ngày)</p>
          <p className="mt-2 text-3xl font-black text-amber-600">{summary.dueSoonCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Quá hạn</p>
          <p className="mt-2 text-2xl font-black text-red-600">{money(summary.overdueAmount)}</p>
          <p className="text-xs text-slate-500 mt-1">{summary.overdueCount} học viên cần ưu tiên xử lý</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap gap-3 justify-between items-center bg-slate-50/50">
          <div className="flex gap-2">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-slate-800 text-white shadow'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setStatusFilter('THIEU')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-2 ${
                statusFilter === 'THIEU'
                  ? 'bg-amber-600 text-white shadow'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-amber-50 hover:text-amber-700'
              }`}
            >
              <CalendarClock size={14} /> Trong hạn
            </button>
            <button
              onClick={() => setStatusFilter('QUA_HAN')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-2 ${
                statusFilter === 'QUA_HAN'
                  ? 'bg-red-600 text-white shadow'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-red-50 hover:text-red-700'
              }`}
            >
              <AlertTriangle size={14} /> Quá hạn
            </button>
            <button
              onClick={() => setStatusFilter('DA_DONG')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-2 ${
                statusFilter === 'DA_DONG'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700'
              }`}
            >
              <CheckCircle2 size={14} /> Đã đóng
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo học viên, mã học viên, lớp..."
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-[340px] focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#F8FAFC] border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Mã học viên</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Học viên</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Lớp</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right whitespace-nowrap">Công nợ</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Ngày đến hạn</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Quá hạn</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Trạng thái</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredRows.length > 0 ? (
                filteredRows.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-blue-600">{item.studentCode}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">{item.studentName}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{item.className}</td>
                    <td className="px-6 py-4 text-right text-sm font-bold text-slate-800 whitespace-nowrap">{money(item.totalDebt)}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">{formatDate(item.dueDate)}</td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                      {item.overdueDays > 0 ? (
                        <span className="font-bold text-red-600">{item.overdueDays} ngày</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block whitespace-nowrap px-2.5 py-1 rounded text-xs font-bold border ${STATUS_META[item.status].badge}`}>
                        {STATUS_META[item.status].label}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 italic">
                    Không tìm thấy dữ liệu công nợ phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
          <span className="text-xs text-slate-500 font-bold">Tổng số: {filteredRows.length} bản ghi</span>
        </div>
      </div>
    </div>
  );
};

export default FinanceDebtList;

