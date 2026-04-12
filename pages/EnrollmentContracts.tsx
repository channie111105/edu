import React, { useEffect, useMemo, useState } from 'react';
import { Edit3, ExternalLink, FileText, Filter, Printer, Save, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ContractStatus, IContract, IQuotation, QuotationStatus } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { CONTRACT_FIELD_CONFIG, EditableContractFieldKey } from '../utils/contractFields';
import { decodeMojibakeReactNode, decodeMojibakeText } from '../utils/mojibake';
import { getContracts, getPrimaryQuotationStudentName, getQuotations, updateContract } from '../utils/storage';
import PinnedSearchInput, { PinnedSearchChip } from '../components/PinnedSearchInput';

type ContractFilter = 'ALL' | ContractStatus;
type ContractEditFormState = Record<EditableContractFieldKey, string>;

const statusConfig: Record<ContractStatus, { label: string; badge: string }> = {
  [ContractStatus.DRAFT]: { label: 'Nháp', badge: 'bg-slate-100 text-slate-700' },
  [ContractStatus.SENT]: { label: 'Đã gửi', badge: 'bg-blue-100 text-blue-700' },
  [ContractStatus.SIGNED]: { label: 'Đã ký', badge: 'bg-emerald-100 text-emerald-700' },
  [ContractStatus.ACTIVE]: { label: 'Active', badge: 'bg-indigo-100 text-indigo-700' },
  [ContractStatus.COMPLETED]: { label: 'Hoàn tất', badge: 'bg-violet-100 text-violet-700' },
  [ContractStatus.CANCELLED]: { label: 'Hủy', badge: 'bg-rose-100 text-rose-700' }
};

const contractStatusOptions = Object.values(ContractStatus) as ContractStatus[];

const normalizeStatusToken = (value: unknown) =>
  decodeMojibakeText(typeof value === 'string' ? value : String(value || ''))
    .trim()
    .toLocaleLowerCase('vi-VN');

const contractStatusLookup = (() => {
  const lookup = new Map<string, ContractStatus>();

  contractStatusOptions.forEach((status) => {
    [
      status,
      statusConfig[status].label,
      status === ContractStatus.SENT ? 'Da gui' : '',
      status === ContractStatus.ACTIVE ? 'Dang hieu luc' : '',
      status === ContractStatus.CANCELLED ? 'Huy' : ''
    ].forEach((candidate) => {
      const token = normalizeStatusToken(candidate);
      if (token) lookup.set(token, status);
    });
  });

  return lookup;
})();

const normalizeContractStatus = (value: unknown): ContractStatus | null => {
  const token = normalizeStatusToken(value);
  return token ? contractStatusLookup.get(token) || null : null;
};

const getContractStatusMeta = (value: unknown) => {
  const normalizedStatus = normalizeContractStatus(value);
  if (normalizedStatus) {
    return {
      key: normalizedStatus,
      ...statusConfig[normalizedStatus]
    };
  }

  return {
    key: null,
    label: decodeMojibakeText(String(value || '')).trim() || 'Unknown',
    badge: 'bg-slate-100 text-slate-500'
  };
};

const formatCurrency = (value?: number) => `${(value || 0).toLocaleString('vi-VN')} đ`;

const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('vi-VN');
};

const createContractEditForm = (contract: IContract, quotation?: IQuotation): ContractEditFormState => {
  const templateFields = contract.templateFields || {};
  const primaryStudentName = quotation ? getPrimaryQuotationStudentName(quotation) : '';

  return {
    customerName: String(templateFields.customerName || contract.customerName || primaryStudentName || '').trim(),
    studentName: String(templateFields.studentName || primaryStudentName || contract.customerName || '').trim(),
    studentPhone: String(templateFields.studentPhone || quotation?.studentPhone || '').trim(),
    identityCard: String(templateFields.identityCard || contract.cccdNumber || quotation?.identityCard || '').trim()
  };
};

const EnrollmentContracts: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [contracts, setContracts] = useState<IContract[]>([]);
  const [quotations, setQuotations] = useState<IQuotation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ContractFilter>('ALL');
  const [editingContract, setEditingContract] = useState<IContract | null>(null);
  const [editingQuotation, setEditingQuotation] = useState<IQuotation | undefined>(undefined);
  const [contractEditForm, setContractEditForm] = useState<ContractEditFormState>({
    customerName: '',
    studentName: '',
    studentPhone: '',
    identityCard: ''
  });

  const loadData = () => {
    setContracts(getContracts());
    setQuotations(getQuotations());
  };

  useEffect(() => {
    loadData();
    window.addEventListener('educrm:contracts-changed', loadData as EventListener);
    window.addEventListener('educrm:quotations-changed', loadData as EventListener);
    return () => {
      window.removeEventListener('educrm:contracts-changed', loadData as EventListener);
      window.removeEventListener('educrm:quotations-changed', loadData as EventListener);
    };
  }, []);

  const quotationMap = useMemo(() => new Map(quotations.map((item) => [item.id, item])), [quotations]);

  const statusLabelMap: Record<ContractFilter, string> = useMemo(
    () => ({
      ALL: 'Tất cả',
      [ContractStatus.DRAFT]: statusConfig[ContractStatus.DRAFT].label,
      [ContractStatus.SENT]: statusConfig[ContractStatus.SENT].label,
      [ContractStatus.SIGNED]: statusConfig[ContractStatus.SIGNED].label,
      [ContractStatus.ACTIVE]: statusConfig[ContractStatus.ACTIVE].label,
      [ContractStatus.COMPLETED]: statusConfig[ContractStatus.COMPLETED].label,
      [ContractStatus.CANCELLED]: statusConfig[ContractStatus.CANCELLED].label
    }),
    []
  );

  const activeSearchChips = useMemo<PinnedSearchChip[]>(() => {
    if (statusFilter === 'ALL') return [];
    return [
      {
        key: 'status',
        label: `Trạng thái: ${statusLabelMap[statusFilter]}`
      }
    ];
  }, [statusFilter, statusLabelMap]);

  const removeSearchChip = (chipKey: string) => {
    if (chipKey === 'status') setStatusFilter('ALL');
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
  };

  const applyStatusFilter = (nextFilter: ContractFilter) => {
    if (nextFilter === 'ALL') {
      setStatusFilter('ALL');
      return;
    }

    setStatusFilter(normalizeContractStatus(nextFilter) || nextFilter);
  };

  const closeEditModal = () => {
    setEditingContract(null);
    setEditingQuotation(undefined);
    setContractEditForm({
      customerName: '',
      studentName: '',
      studentPhone: '',
      identityCard: ''
    });
  };

  const openEditModal = (contract: IContract, quotation?: IQuotation) => {
    setEditingContract(contract);
    setEditingQuotation(quotation);
    setContractEditForm(createContractEditForm(contract, quotation));
  };

  const handleContractFieldChange = (field: EditableContractFieldKey, value: string) => {
    setContractEditForm((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveContractEdit = () => {
    if (!editingContract) return;

    const actor = user?.name || user?.id || 'system';
    const normalizedFields: ContractEditFormState = {
      customerName: contractEditForm.customerName.trim(),
      studentName: contractEditForm.studentName.trim(),
      studentPhone: contractEditForm.studentPhone.trim(),
      identityCard: contractEditForm.identityCard.trim()
    };

    const nextContract: IContract = {
      ...editingContract,
      customerName:
        normalizedFields.customerName ||
        editingQuotation?.customerName ||
        editingContract.customerName ||
        normalizedFields.studentName,
      cccdNumber: normalizedFields.identityCard || editingContract.cccdNumber,
      templateFields: {
        ...(editingContract.templateFields || {}),
        ...normalizedFields
      },
      importedAt: new Date().toISOString(),
      importedBy: actor
    };

    updateContract(nextContract);
    closeEditModal();
  };

  const rows = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return contracts
      .map((contract) => {
        const quotation = contract.quotationId ? quotationMap.get(contract.quotationId) : undefined;
        const searchable = [
          contract.code,
          contract.customerName,
          contract.templateName,
          contract.templateFields?.studentPhone,
          contract.templateFields?.studentEmail,
          contract.templateFields?.identityCard,
          quotation?.soCode,
          quotation?.customerName
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        const sortTime = new Date(
          contract.importedAt || contract.signedDate || quotation?.updatedAt || quotation?.createdAt || Date.now()
        ).getTime();

        return {
          contract,
          quotation,
          searchable,
          sortTime,
          normalizedStatus: normalizeContractStatus(contract.status)
        };
      })
      .filter(({ normalizedStatus, searchable }) => {
        if (statusFilter !== 'ALL' && normalizedStatus !== statusFilter) return false;
        if (!keyword) return true;
        return searchable.includes(keyword);
      })
      .sort((a, b) => b.sortTime - a.sortTime);
  }, [contracts, quotationMap, searchTerm, statusFilter]);

  const summary = useMemo(() => {
    const total = contracts.length;
    const signed = contracts.filter((item) => {
      const normalizedStatus = normalizeContractStatus(item.status);
      return normalizedStatus === ContractStatus.SIGNED || normalizedStatus === ContractStatus.ACTIVE;
    }).length;
    const totalValue = contracts.reduce((sum, item) => sum + (item.totalValue || 0), 0);
    return { total, signed, totalValue };
  }, [contracts]);

  return decodeMojibakeReactNode(
    <div className="p-6 max-w-7xl mx-auto font-sans text-slate-800">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Hợp đồng</h1>
          <p className="text-sm text-slate-500 mt-1">
            Danh sách hợp đồng lưu riêng từ báo giá. Dữ liệu import được nối trường để in theo mẫu hợp đồng.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
            Tổng HĐ: <span className="font-bold text-slate-900">{summary.total}</span>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
            Đã ký/Active: <span className="font-bold text-emerald-700">{summary.signed}</span>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
            Tổng giá trị: <span className="font-bold text-blue-700">{formatCurrency(summary.totalValue)}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap lg:flex-nowrap items-center gap-2 bg-slate-50">
          <div className="flex-1 min-w-[260px]">
            <PinnedSearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Tìm theo mã hợp đồng, SO, khách hàng, CCCD..."
              chips={activeSearchChips}
              onRemoveChip={removeSearchChip}
              onClearAll={clearAllFilters}
              clearAllAriaLabel="Xóa tất cả bộ lọc hợp đồng"
              inputClassName="text-sm h-7"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap md:flex-nowrap shrink-0">
            <div
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                statusFilter !== 'ALL'
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Filter size={16} />
                <span>Bá»™ lá»c</span>
                <span className="text-slate-300">|</span>
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(event) => applyStatusFilter(event.target.value as ContractFilter)}
                    className={`appearance-none bg-transparent pr-5 text-sm font-semibold outline-none ${
                      statusFilter !== 'ALL' ? 'text-blue-700' : 'text-slate-500'
                    }`}
                  >
                    <option value="ALL">Tất cả</option>
                    {contractStatusOptions.map((status) => (
                      <option key={status} value={status}>
                        {statusLabelMap[status]}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                    ▾
                  </span>
                </div>

              {false && (
                <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                  <div className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Tráº¡ng thÃ¡i há»£p Ä‘á»“ng
                  </div>
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => applyStatusFilter('ALL')}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                        statusFilter === 'ALL'
                          ? 'bg-blue-50 font-semibold text-blue-700'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>Táº¥t cáº£ tráº¡ng thÃ¡i</span>
                      {statusFilter === 'ALL' && <span>✓</span>}
                    </button>
                    {Object.values(ContractStatus).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => applyStatusFilter(status)}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                          statusFilter === status
                            ? 'bg-blue-50 font-semibold text-blue-700'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{statusConfig[status].label}</span>
                        {statusFilter === status && <span>✓</span>}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 border-t border-slate-100 pt-2">
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                    >
                      XÃ³a bá»™ lá»c
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="hidden">
            <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700">
              <Filter size={16} /> Bộ lọc
            </div>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as ContractFilter)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-700"
            >
              <option value="ALL">Trạng thái: Tất cả</option>
              {Object.values(ContractStatus).map((status) => (
                <option key={status} value={status}>
                  {statusConfig[status].label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-center w-16">STT</th>
              <th className="px-4 py-3">Mã HĐ</th>
              <th className="px-4 py-3">Khách hàng</th>
              <th className="px-4 py-3">SO liên quan</th>
              <th className="px-4 py-3">Mẫu</th>
              <th className="px-4 py-3">Giá trị</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Ngày ký</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length ? (
              rows.map(({ contract, quotation }, index) => {
                const canPrint = Boolean(quotation?.id && quotation.status === QuotationStatus.LOCKED);
                const statusMeta = getContractStatusMeta(contract.status);
                return (
                  <tr key={contract.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-center font-semibold text-slate-500">{index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-blue-700">{contract.code}</div>
                      <div className="text-xs text-slate-500">{contract.id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{contract.customerName || '-'}</div>
                      <div className="text-xs text-slate-500">
                        {contract.templateFields?.studentPhone || '-'} • {contract.templateFields?.studentEmail || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {quotation ? (
                        <div>
                          <div className="font-semibold">{quotation.soCode}</div>
                          <div className="text-xs text-slate-500">{quotation.customerName}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Chưa nối SO</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{contract.templateName || '-'}</div>
                      <div className="text-xs text-slate-500">Import: {formatDate(contract.importedAt)}</div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{formatCurrency(contract.totalValue)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${statusMeta.badge}`}>
                        {statusMeta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">{formatDate(contract.signedDate)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(contract, quotation)}
                          className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                        >
                          <Edit3 size={12} />
                          Sửa HĐ
                        </button>
                        <button
                          type="button"
                          onClick={() => quotation?.id && navigate(`/contracts/quotations/${quotation.id}?tab=contract`)}
                          disabled={!quotation?.id}
                          className="inline-flex items-center gap-1 rounded border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <ExternalLink size={12} />
                          Mở SO
                        </button>
                        <button
                          type="button"
                          onClick={() => quotation?.id && navigate(`/contracts/quotations/${quotation.id}/contract`)}
                          disabled={!canPrint}
                          className="inline-flex items-center gap-1 rounded bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Printer size={12} />
                          In mẫu
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center gap-2">
                    <FileText size={22} className="text-slate-300" />
                    <span>Chưa có hợp đồng phù hợp bộ lọc.</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editingContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" onClick={closeEditModal}>
          <div
            className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Sửa hợp đồng</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Chỉ cho sửa các trường được nối từ tab hợp đồng của báo giá.
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                title="Đóng"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-4 text-sm md:grid-cols-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Mã hợp đồng</div>
                <div className="mt-1 font-semibold text-slate-800">{editingContract.code}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">SO liên quan</div>
                <div className="mt-1 font-semibold text-slate-800">{editingQuotation?.soCode || 'Chưa nối SO'}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Mẫu hợp đồng</div>
                <div className="mt-1 font-semibold text-slate-800">{editingContract.templateName || '-'}</div>
              </div>
            </div>

            <div className="grid gap-4 px-5 py-5 md:grid-cols-2">
              {CONTRACT_FIELD_CONFIG.map((field) => (
                <label key={field.key} className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    {field.label}
                  </span>
                  <input
                    type="text"
                    value={contractEditForm[field.key]}
                    onChange={(event) => handleContractFieldChange(field.key, event.target.value)}
                    placeholder={field.placeholder}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-800 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                onClick={closeEditModal}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveContractEdit}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <Save size={15} />
                Lưu trường nối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnrollmentContracts;
