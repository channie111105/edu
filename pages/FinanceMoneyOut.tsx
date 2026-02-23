import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Plus,
  Filter,
  Search,
  FileText,
  History
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { IActualTransaction, IActualTransactionLog, TransactionStatus, TransactionType } from '../types';
import {
  addActualTransaction,
  addActualTransactionLog,
  getActualTransactionLogs,
  getActualTransactions,
  saveActualTransactions,
  updateActualTransaction
} from '../utils/storage';

const OUT_STATUSES: TransactionStatus[] = ['PROPOSED', 'APPROVED', 'PAID'];
const IN_STATUSES: TransactionStatus[] = ['PLANNED', 'RECEIVED'];

const STATUS_META: Record<TransactionStatus, { label: string; badge: string }> = {
  PROPOSED: { label: 'Đề xuất', badge: 'bg-amber-100 text-amber-700' },
  APPROVED: { label: 'Đã duyệt', badge: 'bg-blue-100 text-blue-700' },
  PAID: { label: 'Đã chi', badge: 'bg-rose-100 text-rose-700' },
  PLANNED: { label: 'Dự thu', badge: 'bg-indigo-100 text-indigo-700' },
  RECEIVED: { label: 'Đã thu', badge: 'bg-emerald-100 text-emerald-700' }
};

const TYPE_META: Record<TransactionType, { label: string; badge: string }> = {
  IN: { label: 'Thu', badge: 'bg-emerald-50 text-emerald-700' },
  OUT: { label: 'Chi', badge: 'bg-rose-50 text-rose-700' }
};

const DEPARTMENTS = ['Kế toán', 'Kinh doanh', 'Đào tạo', 'Marketing', 'Vận hành', 'Ban giám đốc'];

const INITIAL_ACTUAL_TRANSACTIONS: IActualTransaction[] = [
  {
    id: 'TXN-001',
    type: 'OUT',
    category: 'Thanh toán đối tác hồ sơ',
    title: 'Đợt 1 - Đại học Goethe',
    amount: 50000000,
    department: 'Kế toán',
    date: '2026-02-10',
    status: 'APPROVED',
    proof: 'UNC-2026-0201',
    createdBy: 'Kế toán',
    createdAt: '2026-02-10T08:30:00.000Z'
  },
  {
    id: 'TXN-002',
    type: 'OUT',
    category: 'Phí dịch vụ visa',
    title: 'Nhóm hồ sơ tháng 2',
    amount: 18000000,
    department: 'Kinh doanh',
    date: '2026-02-12',
    status: 'PROPOSED',
    proof: 'Đề xuất chi #VC-02',
    createdBy: 'Kế toán',
    createdAt: '2026-02-12T03:45:00.000Z'
  },
  {
    id: 'TXN-003',
    type: 'OUT',
    category: 'Mua văn phòng phẩm',
    title: 'Bổ sung vật tư hành chính',
    amount: 3500000,
    department: 'Vận hành',
    date: '2026-02-14',
    status: 'PAID',
    proof: 'PC-014',
    createdBy: 'Kế toán',
    createdAt: '2026-02-14T09:10:00.000Z'
  },
  {
    id: 'TXN-004',
    type: 'IN',
    category: 'Thu học phí',
    title: 'Lớp A2 K52 - đợt 1',
    amount: 12000000,
    department: 'Đào tạo',
    date: '2026-02-11',
    status: 'PLANNED',
    proof: 'Kế hoạch thu #A2K52',
    createdBy: 'Kế toán',
    createdAt: '2026-02-11T05:20:00.000Z'
  },
  {
    id: 'TXN-005',
    type: 'IN',
    category: 'Thu phí dịch vụ',
    title: 'Phí xử lý hồ sơ Đức',
    amount: 25000000,
    department: 'Kinh doanh',
    date: '2026-02-15',
    status: 'RECEIVED',
    proof: 'PT-2026-0103',
    createdBy: 'Kế toán',
    createdAt: '2026-02-15T02:00:00.000Z'
  }
];

const INITIAL_ACTUAL_TRANSACTION_LOGS: IActualTransactionLog[] = [
  {
    id: 'TXN-LOG-001',
    transactionId: 'TXN-001',
    action: 'CREATE',
    message: 'Tạo khoản Chi: Thanh toán đối tác hồ sơ (50.000.000 đ)',
    createdAt: '2026-02-10T08:30:00.000Z',
    createdBy: 'Kế toán'
  },
  {
    id: 'TXN-LOG-002',
    transactionId: 'TXN-001',
    action: 'UPDATE_STATUS',
    message: 'Cập nhật trạng thái: Đề xuất -> Đã duyệt',
    createdAt: '2026-02-10T09:15:00.000Z',
    createdBy: 'Kế toán'
  },
  {
    id: 'TXN-LOG-003',
    transactionId: 'TXN-005',
    action: 'CREATE',
    message: 'Tạo khoản Thu: Thu phí dịch vụ (25.000.000 đ)',
    createdAt: '2026-02-15T02:00:00.000Z',
    createdBy: 'Kế toán'
  }
];

const moneyFormat = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

const dateTimeFormat = (value: string) =>
  new Date(value).toLocaleString('vi-VN', { hour12: false });

const FinanceMoneyOut: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<IActualTransaction[]>([]);
  const [logs, setLogs] = useState<IActualTransactionLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | TransactionType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | TransactionStatus>('ALL');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: 'OUT' as TransactionType,
    category: '',
    amount: '',
    proof: '',
    department: 'Kế toán',
    date: new Date().toISOString().slice(0, 10),
    status: 'PROPOSED' as TransactionStatus,
    note: ''
  });

  const loadData = () => {
    setTransactions(getActualTransactions());
    setLogs(getActualTransactionLogs());
  };

  useEffect(() => {
    const currentTransactions = getActualTransactions();
    if (!currentTransactions.length) {
      saveActualTransactions(INITIAL_ACTUAL_TRANSACTIONS);
    }

    const currentLogs = getActualTransactionLogs();
    if (!currentLogs.length) {
      INITIAL_ACTUAL_TRANSACTION_LOGS.forEach((item) => addActualTransactionLog(item));
    }

    loadData();

    window.addEventListener('educrm:actual-transactions-changed', loadData as EventListener);
    window.addEventListener('educrm:actual-transaction-logs-changed', loadData as EventListener);
    return () => {
      window.removeEventListener('educrm:actual-transactions-changed', loadData as EventListener);
      window.removeEventListener('educrm:actual-transaction-logs-changed', loadData as EventListener);
    };
  }, []);

  const logsByTransaction = useMemo(() => {
    return logs.reduce<Record<string, IActualTransactionLog[]>>((acc, item) => {
      if (!acc[item.transactionId]) acc[item.transactionId] = [];
      acc[item.transactionId].push(item);
      return acc;
    }, {});
  }, [logs]);

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((item) => {
        if (typeFilter !== 'ALL' && item.type !== typeFilter) return false;
        if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
        const query = searchTerm.trim().toLowerCase();
        if (!query) return true;
        return [
          item.id,
          item.category,
          item.title,
          item.department,
          item.proof,
          STATUS_META[item.status].label,
          TYPE_META[item.type].label
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(query);
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, typeFilter, statusFilter, searchTerm]);

  const getAllowedStatuses = (type: TransactionType) => (type === 'OUT' ? OUT_STATUSES : IN_STATUSES);

  const createLog = (transactionId: string, action: IActualTransactionLog['action'], message: string) => {
    addActualTransactionLog({
      id: `TXN-LOG-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      transactionId,
      action,
      message,
      createdAt: new Date().toISOString(),
      createdBy: user?.name || user?.id || 'Kế toán'
    });
  };

  const handleCreate = () => {
    const amount = Number(formData.amount);
    if (!formData.category.trim() || !amount || amount <= 0) {
      alert('Vui lòng nhập đầy đủ Tên khoản và Số tiền hợp lệ.');
      return;
    }

    const allowedStatuses = getAllowedStatuses(formData.type);
    const status = allowedStatuses.includes(formData.status) ? formData.status : allowedStatuses[0];

    const item: IActualTransaction = {
      id: `TXN-${Date.now()}`,
      type: formData.type,
      category: formData.category.trim(),
      title: formData.note.trim() || formData.category.trim(),
      amount,
      department: formData.department,
      date: formData.date,
      status,
      proof: formData.proof.trim() || undefined,
      createdBy: user?.name || user?.id || 'Kế toán',
      createdAt: new Date().toISOString()
    };

    addActualTransaction(item);
    createLog(item.id, 'CREATE', `Tạo khoản ${TYPE_META[item.type].label}: ${item.category} (${moneyFormat(item.amount)})`);

    setFormData({
      type: 'OUT',
      category: '',
      amount: '',
      proof: '',
      department: 'Kế toán',
      date: new Date().toISOString().slice(0, 10),
      status: 'PROPOSED',
      note: ''
    });
    setIsCreateModalOpen(false);
  };

  const handleStatusChange = (item: IActualTransaction, nextStatus: TransactionStatus) => {
    if (item.status === nextStatus) return;
    const allowedStatuses = getAllowedStatuses(item.type);
    if (!allowedStatuses.includes(nextStatus)) return;

    const updated: IActualTransaction = { ...item, status: nextStatus };
    const ok = updateActualTransaction(updated);
    if (!ok) return;

    createLog(
      item.id,
      'UPDATE_STATUS',
      `Cập nhật trạng thái: ${STATUS_META[item.status].label} -> ${STATUS_META[nextStatus].label}`
    );
  };

  const onTypeChangeInForm = (nextType: TransactionType) => {
    setFormData((prev) => ({
      ...prev,
      type: nextType,
      status: nextType === 'OUT' ? 'PROPOSED' : 'PLANNED'
    }));
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#111418] font-sans overflow-hidden">
      <div className="flex flex-col flex-1 overflow-y-auto p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <ArrowLeft size={24} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Thu chi - Danh sách</h1>
            <p className="text-sm text-slate-500">
              Quản lý dòng tiền thu/chi theo loại khoản, chứng từ, bộ phận và trạng thái nghiệp vụ.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-wrap lg:flex-nowrap items-center gap-2 bg-slate-50">
            <div className="relative flex-1 min-w-[260px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm theo tên khoản, chứng từ, bộ phận..."
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-full focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap md:flex-nowrap shrink-0">
              <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700">
                <Filter size={16} /> Bộ lọc
              </div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as 'ALL' | TransactionType)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-700"
              >
                <option value="ALL">Loại: Tất cả</option>
                <option value="IN">Thu</option>
                <option value="OUT">Chi</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'ALL' | TransactionStatus)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-700"
              >
                <option value="ALL">Trạng thái: Tất cả</option>
                {Object.entries(STATUS_META).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm shrink-0"
            >
              <Plus size={18} /> Tạo khoản
            </button>
          </div>

          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold">
              <tr>
                <th className="px-6 py-4">Mã khoản</th>
                <th className="px-6 py-4">Loại</th>
                <th className="px-6 py-4">Tên khoản</th>
                <th className="px-6 py-4">Số tiền</th>
                <th className="px-6 py-4">Chứng từ</th>
                <th className="px-6 py-4">Bộ phận thu chi</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length ? (
                filteredTransactions.map((item) => {
                  const itemLogs = (logsByTransaction[item.id] || []).sort(
                    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                  );
                  return (
                    <React.Fragment key={item.id}>
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs font-bold text-blue-600">{item.id}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${TYPE_META[item.type].badge}`}>
                            {TYPE_META[item.type].label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-slate-900">{item.category}</p>
                          <p className="text-xs text-slate-500">{item.title}</p>
                        </td>
                        <td className={`px-6 py-4 text-sm font-bold ${item.type === 'OUT' ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {moneyFormat(item.amount)}
                        </td>
                        <td className="px-6 py-4">
                          {item.proof ? (
                            <span className="inline-flex items-center gap-1 text-xs text-slate-700 bg-slate-100 px-2 py-1 rounded">
                              <FileText size={12} />
                              {item.proof}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">Chưa có chứng từ</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">{item.department}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${STATUS_META[item.status].badge}`}>
                            {STATUS_META[item.status].label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end items-center gap-2">
                            <select
                              value={item.status}
                              onChange={(e) => handleStatusChange(item, e.target.value as TransactionStatus)}
                              className="text-xs border border-slate-200 rounded px-2 py-1 bg-white"
                            >
                              {getAllowedStatuses(item.type).map((status) => (
                                <option key={status} value={status}>
                                  {STATUS_META[status].label}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => setExpandedLogId(expandedLogId === item.id ? null : item.id)}
                              className="text-xs font-semibold text-blue-600 hover:underline inline-flex items-center gap-1"
                            >
                              <History size={12} /> Log note
                            </button>
                          </div>
                        </td>
                      </tr>

                      {expandedLogId === item.id && (
                        <tr className="bg-slate-50">
                          <td colSpan={8} className="px-6 py-4">
                            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Lịch sử log note</p>
                            {itemLogs.length ? (
                              <div className="space-y-2">
                                {itemLogs.map((log) => (
                                  <div key={log.id} className="text-sm bg-white border border-slate-200 rounded-lg px-3 py-2">
                                    <p className="text-slate-800 font-medium">{log.message}</p>
                                    <p className="text-xs text-slate-500 mt-1">
                                      {dateTimeFormat(log.createdAt)} • {log.createdBy}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-slate-500 italic">Chưa có log note.</p>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-500">
                    Không có khoản thu/chi phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-2xl">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-900">Tạo khoản Thu/Chi</h2>
                <p className="text-sm text-slate-500">Nhập đầy đủ: loại, tên khoản, số tiền, chứng từ, bộ phận và trạng thái.</p>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700">Loại</label>
                  <select
                    value={formData.type}
                    onChange={(e) => onTypeChangeInForm(e.target.value as TransactionType)}
                    className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="OUT">Chi</option>
                    <option value="IN">Thu</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700">Bộ phận thu chi</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData((prev) => ({ ...prev, department: e.target.value }))}
                    className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700">Tên khoản</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                    className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    placeholder="Ví dụ: Thu học phí / Thanh toán đối tác"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700">Số tiền</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                    className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    placeholder="Nhập số tiền"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700">Chứng từ</label>
                  <input
                    type="text"
                    value={formData.proof}
                    onChange={(e) => setFormData((prev) => ({ ...prev, proof: e.target.value }))}
                    className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    placeholder="Mã UNC / Phiếu thu / Mã chứng từ"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700">Ngày</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                    className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-semibold text-slate-700">Trạng thái</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as TransactionStatus }))}
                    className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  >
                    {getAllowedStatuses(formData.type).map((status) => (
                      <option key={status} value={status}>
                        {STATUS_META[status].label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-semibold text-slate-700">Ghi chú</label>
                  <textarea
                    value={formData.note}
                    onChange={(e) => setFormData((prev) => ({ ...prev, note: e.target.value }))}
                    className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm min-h-[88px]"
                    placeholder="Mô tả ngắn cho khoản thu/chi..."
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  onClick={handleCreate}
                  className="px-4 py-2 rounded-lg text-sm font-bold bg-blue-600 text-white hover:bg-blue-700"
                >
                  Lưu khoản
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinanceMoneyOut;
