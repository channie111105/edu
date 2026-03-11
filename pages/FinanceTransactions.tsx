import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Lock, XCircle, Unlock } from 'lucide-react';
import { IQuotation, ITransaction, QuotationStatus, UserRole } from '../types';
import { getQuotations, getTransactions } from '../utils/storage';
import { approveTransaction, lockQuotationAfterAccounting, rejectTransaction, unlockQuotationAfterAccounting } from '../services/financeFlow.service';
import { useAuth } from '../contexts/AuthContext';
import PinnedSearchInput, { PinnedSearchChip } from '../components/PinnedSearchInput';

const FinanceTransactions: React.FC = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<ITransaction[]>([]);
  const [quotations, setQuotations] = useState<IQuotation[]>([]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CHO_DUYET' | 'DA_DUYET' | 'TU_CHOI'>('ALL');
  const [search, setSearch] = useState('');

  const loadData = () => {
    setTransactions(getTransactions());
    setQuotations(getQuotations());
  };

  useEffect(() => {
    loadData();
    window.addEventListener('educrm:transactions-changed', loadData as EventListener);
    window.addEventListener('educrm:quotations-changed', loadData as EventListener);
    return () => {
      window.removeEventListener('educrm:transactions-changed', loadData as EventListener);
      window.removeEventListener('educrm:quotations-changed', loadData as EventListener);
    };
  }, []);

  const quotationMap = useMemo(() => {
    return new Map(quotations.map((q) => [q.id, q]));
  }, [quotations]);

  const rows = useMemo(() => {
    return transactions.filter((t) => {
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return [t.soCode, t.studentName, t.customerId, t.bankRefCode, t.note, t.method, t.status]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [transactions, statusFilter, search]);

  const statusLabelMap: Record<'ALL' | ITransaction['status'], string> = {
    ALL: 'Tất cả',
    CHO_DUYET: 'Chờ duyệt',
    DA_DUYET: 'Đã duyệt',
    TU_CHOI: 'Từ chối'
  };

  const activeSearchChips = useMemo<PinnedSearchChip[]>(() => {
    if (statusFilter === 'ALL') return [];
    return [
      {
        key: 'status',
        label: `Trạng thái: ${statusLabelMap[statusFilter]}`
      }
    ];
  }, [statusFilter]);

  const removeSearchChip = (chipKey: string) => {
    if (chipKey === 'status') {
      setStatusFilter('ALL');
    }
  };

  const clearAllSearchFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
  };

  const statusBadge = (status: ITransaction['status']) => {
    if (status === 'CHO_DUYET') return <span className="px-2 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">CHO_DUYET</span>;
    if (status === 'DA_DUYET') return <span className="px-2 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">DA_DUYET</span>;
    return <span className="px-2 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700">TU_CHOI</span>;
  };

  const handleApprove = (id: string) => {
    const res = approveTransaction(id, user?.id || 'accountant', user?.role as UserRole | undefined);
    if (!res.ok) {
      alert(res.error || 'Không thể duyệt giao dịch');
      return;
    }
    loadData();
    alert('Đã duyệt giao dịch và tự động khóa SO');
  };

  const handleReject = (id: string) => {
    const reason = window.prompt('Nhập lý do từ chối giao dịch:', 'Thiếu chứng từ');
    const res = rejectTransaction(id, user?.id || 'accountant', user?.role as UserRole | undefined, reason || undefined);
    if (!res.ok) {
      alert(res.error || 'Không thể từ chối giao dịch');
      return;
    }
    loadData();
  };

  const handleUnlock = (transaction: ITransaction) => {
    const quotation = quotationMap.get(transaction.quotationId);
    if (!quotation) {
      alert('Không tìm thấy SO liên quan');
      return;
    }

    const confirm = window.confirm(`Bạn có chắc muốn hủy khóa SO ${quotation.soCode}?`);
    if (!confirm) return;

    const res = unlockQuotationAfterAccounting(quotation.id, user?.id || 'accountant', user?.role as UserRole | undefined);
    if (!res.ok) {
      alert(res.error || 'Không thể hủy khóa SO');
      return;
    }

    loadData();
    alert('Đã hủy khóa SO');
  };

  const handleLock = (transaction: ITransaction) => {
    const quotation = quotationMap.get(transaction.quotationId);
    if (!quotation) {
      alert('Không tìm thấy SO liên quan');
      return;
    }

    const res = lockQuotationAfterAccounting(quotation.id, user?.id || 'accountant', user?.role as UserRole | undefined);
    if (!res.ok) {
      alert(res.error || 'Không thể khóa SO');
      return;
    }

    loadData();
    alert('Đã khóa SO');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans text-slate-800">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Duyệt giao dịch kế toán</h1>
        <p className="text-slate-500 text-sm mt-1">Kế toán duyệt chứng từ trước khi khóa SO.</p>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setStatusFilter('ALL')} className={`px-3 py-1.5 rounded text-sm font-semibold ${statusFilter === 'ALL' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`}>Tất cả</button>
        <button onClick={() => setStatusFilter('CHO_DUYET')} className={`px-3 py-1.5 rounded text-sm font-semibold ${statusFilter === 'CHO_DUYET' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Chờ duyệt</button>
        <button onClick={() => setStatusFilter('DA_DUYET')} className={`px-3 py-1.5 rounded text-sm font-semibold ${statusFilter === 'DA_DUYET' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Đã duyệt</button>
        <button onClick={() => setStatusFilter('TU_CHOI')} className={`px-3 py-1.5 rounded text-sm font-semibold ${statusFilter === 'TU_CHOI' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Từ chối</button>
      </div>

      <div className="mb-4 max-w-2xl">
        <PinnedSearchInput
          value={search}
          onChange={setSearch}
          placeholder="Tìm theo SO, học viên, mã UNC..."
          chips={activeSearchChips}
          onRemoveChip={removeSearchChip}
          onClearAll={clearAllSearchFilters}
          clearAllAriaLabel="Xóa tất cả bộ lọc duyệt giao dịch"
          inputClassName="text-sm h-7"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">SO</th>
              <th className="px-4 py-3">Học viên</th>
              <th className="px-4 py-3">Minh chứng</th>
              <th className="px-4 py-3">Số tiền</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length ? (
              rows.map((t) => {
                const linkedQuotation = quotationMap.get(t.quotationId);
                const isLocked = linkedQuotation?.status === QuotationStatus.LOCKED;

                return (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-indigo-700">{t.soCode}</td>
                    <td className="px-4 py-3">{t.studentName || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-semibold">{t.proofType || 'NONE'}</div>
                      <div className="text-xs text-slate-500 truncate max-w-[220px]" title={t.bankRefCode || t.proofFiles?.[0]?.name || ''}>
                        {t.bankRefCode || t.proofFiles?.[0]?.name || 'Không có chứng từ'}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold whitespace-nowrap">{t.amount.toLocaleString('vi-VN')} đ</td>
                    <td className="px-4 py-3">{statusBadge(t.status)}</td>
                    <td className="px-4 py-3 text-right">
                      {t.status === 'CHO_DUYET' ? (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleReject(t.id)} className="px-2 py-1 rounded border border-rose-200 text-rose-700 text-xs font-bold">Từ chối</button>
                          <button onClick={() => handleApprove(t.id)} className="px-2 py-1 rounded bg-emerald-600 text-white text-xs font-bold inline-flex items-center gap-1"><CheckCircle2 size={12} /> Duyệt</button>
                        </div>
                      ) : t.status === 'DA_DUYET' ? (
                        isLocked ? (
                          <button onClick={() => handleUnlock(t)} className="px-2 py-1 rounded border border-amber-300 text-amber-700 text-xs font-bold inline-flex items-center gap-1">
                            <Unlock size={12} /> Hủy khóa
                          </button>
                        ) : (
                          <button onClick={() => handleLock(t)} className="px-2 py-1 rounded bg-slate-700 text-white text-xs font-bold inline-flex items-center gap-1">
                            <Lock size={12} /> Khóa
                          </button>
                        )
                      ) : (
                        <span className="text-xs text-slate-400 inline-flex items-center gap-1">
                          <XCircle size={12} />
                          Đã xử lý
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr><td colSpan={6} className="text-center py-10 text-slate-500">Không có giao dịch phù hợp.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FinanceTransactions;
