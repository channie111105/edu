import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, FileText, Filter, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ContractStatus, IContract, IQuotation, QuotationStatus } from '../types';
import { getContracts, getQuotations } from '../utils/storage';
import PinnedSearchInput, { PinnedSearchChip } from '../components/PinnedSearchInput';

type ContractFilter = 'ALL' | ContractStatus;

const statusConfig: Record<ContractStatus, { label: string; badge: string }> = {
  [ContractStatus.DRAFT]: { label: 'Nháp', badge: 'bg-slate-100 text-slate-700' },
  [ContractStatus.SENT]: { label: 'Đã gửi', badge: 'bg-blue-100 text-blue-700' },
  [ContractStatus.SIGNED]: { label: 'Đã ký', badge: 'bg-emerald-100 text-emerald-700' },
  [ContractStatus.ACTIVE]: { label: 'Active', badge: 'bg-indigo-100 text-indigo-700' },
  [ContractStatus.COMPLETED]: { label: 'Hoàn tất', badge: 'bg-violet-100 text-violet-700' },
  [ContractStatus.CANCELLED]: { label: 'Hủy', badge: 'bg-rose-100 text-rose-700' }
};

const formatCurrency = (value?: number) => `${(value || 0).toLocaleString('vi-VN')} đ`;

const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('vi-VN');
};

const EnrollmentContracts: React.FC = () => {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState<IContract[]>([]);
  const [quotations, setQuotations] = useState<IQuotation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ContractFilter>('ALL');

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

        return { contract, quotation, searchable, sortTime };
      })
      .filter(({ contract, searchable }) => {
        if (statusFilter !== 'ALL' && contract.status !== statusFilter) return false;
        if (!keyword) return true;
        return searchable.includes(keyword);
      })
      .sort((a, b) => b.sortTime - a.sortTime);
  }, [contracts, quotationMap, searchTerm, statusFilter]);

  const summary = useMemo(() => {
    const total = contracts.length;
    const signed = contracts.filter((item) => item.status === ContractStatus.SIGNED || item.status === ContractStatus.ACTIVE).length;
    const totalValue = contracts.reduce((sum, item) => sum + (item.totalValue || 0), 0);
    return { total, signed, totalValue };
  }, [contracts]);

  return (
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
              rows.map(({ contract, quotation }) => {
                const canPrint = Boolean(quotation?.id && quotation.status === QuotationStatus.LOCKED);
                return (
                  <tr key={contract.id} className="hover:bg-slate-50">
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
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${statusConfig[contract.status].badge}`}>
                        {statusConfig[contract.status].label}
                      </span>
                    </td>
                    <td className="px-4 py-3">{formatDate(contract.signedDate)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
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
                <td colSpan={8} className="py-12 text-center text-slate-500">
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
    </div>
  );
};

export default EnrollmentContracts;

