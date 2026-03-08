import React, { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { IAdmission, IContract, IQuotation, IStudent, QuotationStatus } from '../types';
import { getAdmissions, getContractByQuotationId, getQuotations, getStudents } from '../utils/storage';

const formatDate = (value?: string) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN');
};

const formatCurrency = (value?: number) => `${(value || 0).toLocaleString('vi-VN')} đ`;

const ContractPreview: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const quotation: IQuotation | undefined = useMemo(() => getQuotations().find((q) => q.id === id), [id]);
  const linkedContract: IContract | undefined = useMemo(
    () => (id ? getContractByQuotationId(id) : undefined),
    [id]
  );

  const student: IStudent | undefined = useMemo(() => {
    if (!quotation) return undefined;
    const students = getStudents() as IStudent[];
    return students.find(
      (s) =>
        (quotation.studentId && s.id === quotation.studentId) ||
        (quotation.customerId && (s as any).customerId === quotation.customerId) ||
        (s as any).soId === quotation.id
    );
  }, [quotation]);

  const approvedAdmission: IAdmission | undefined = useMemo(() => {
    if (!quotation) return undefined;
    const admissions = getAdmissions().filter(
      (a) => a.status === 'DA_DUYET' && (a.quotationId === quotation.id || a.studentId === student?.id)
    );
    if (!admissions.length) return undefined;
    return admissions.sort((a, b) => {
      const at = new Date(a.approvedAt || a.updatedAt || a.createdAt).getTime();
      const bt = new Date(b.approvedAt || b.updatedAt || b.createdAt).getTime();
      return bt - at;
    })[0];
  }, [quotation, student?.id]);

  if (!quotation) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <p className="text-slate-600">Không tìm thấy báo giá.</p>
        <button onClick={() => navigate('/contracts/quotations')} className="mt-4 rounded border border-slate-300 px-3 py-2">
          Quay lại
        </button>
      </div>
    );
  }

  if (quotation.status !== QuotationStatus.LOCKED) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <p className="font-semibold text-slate-700">Chỉ in hợp đồng khi SO đã khóa.</p>
        <p className="mt-1 text-slate-500">Trạng thái hiện tại: {quotation.status}</p>
        <button onClick={() => navigate(`/contracts/quotations/${quotation.id}`)} className="mt-4 rounded border border-slate-300 px-3 py-2">
          Quay lại báo giá
        </button>
      </div>
    );
  }

  const templateFields = linkedContract?.templateFields || {};
  const resolveField = (key: string, fallback?: string) => templateFields[key] || fallback || 'N/A';

  const lineItems = quotation.lineItems?.length
    ? quotation.lineItems
    : [
        {
          id: 'legacy-line',
          name: quotation.product || 'Sản phẩm',
          quantity: 1,
          unitPrice: quotation.amount || 0,
          discount: quotation.discount || 0,
          total: quotation.finalAmount || quotation.amount || 0
        }
      ];

  const customerName = resolveField('studentName', student?.name || quotation.customerName);
  const customerPhone = resolveField('studentPhone', student?.phone || quotation.studentPhone);
  const customerEmail = resolveField('studentEmail', student?.email || quotation.studentEmail);
  const address = resolveField('address', quotation.studentAddress);
  const identityCard = resolveField('identityCard', quotation.identityCard);
  const guardianName = resolveField('guardianName', quotation.guardianName);
  const guardianPhone = resolveField('guardianPhone', quotation.guardianPhone);
  const branchName = resolveField('branchName', approvedAdmission?.campusId || student?.campus);
  const representative = resolveField('centerRepresentative');
  const contractNote = templateFields.contractNote;
  const contractTitle = linkedContract?.templateName || 'HỢP ĐỒNG ĐÀO TẠO';
  const contractCode = linkedContract?.code || `HD-${quotation.soCode}`;

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #contract-print-root, #contract-print-root * { visibility: visible !important; }
          #contract-print-root { position: absolute; left: 0; top: 0; width: 100%; background: #fff; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="no-print mx-auto mb-4 flex max-w-4xl items-center justify-between">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 rounded border border-slate-300 bg-white px-3 py-2">
          <ArrowLeft size={16} /> Quay lại
        </button>
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-2 font-semibold text-white">
          <Printer size={16} /> In hợp đồng
        </button>
      </div>

      <div id="contract-print-root" className="mx-auto max-w-4xl rounded border border-slate-200 bg-white p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold uppercase">{contractTitle}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {contractCode} • SO: {quotation.soCode}
          </p>
          {linkedContract?.fileUrl && <p className="mt-1 text-xs text-slate-400">Nguồn mẫu: {linkedContract.fileUrl}</p>}
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
          <div>
            <div className="text-slate-500">Khách hàng / học viên</div>
            <div className="font-semibold">{customerName}</div>
          </div>
          <div>
            <div className="text-slate-500">Ngày ký / lock</div>
            <div className="font-semibold">{formatDate(linkedContract?.signedDate || quotation.lockedAt || quotation.confirmDate || quotation.createdAt)}</div>
          </div>
          <div>
            <div className="text-slate-500">Số điện thoại</div>
            <div className="font-semibold">{customerPhone}</div>
          </div>
          <div>
            <div className="text-slate-500">Email</div>
            <div className="font-semibold">{customerEmail}</div>
          </div>
          <div>
            <div className="text-slate-500">CCCD</div>
            <div className="font-semibold">{identityCard}</div>
          </div>
          <div>
            <div className="text-slate-500">Địa chỉ</div>
            <div className="font-semibold">{address}</div>
          </div>
          <div>
            <div className="text-slate-500">Chi nhánh / cơ sở</div>
            <div className="font-semibold">{branchName}</div>
          </div>
          <div>
            <div className="text-slate-500">Lớp</div>
            <div className="font-semibold">{approvedAdmission?.classId || student?.classId || student?.className || 'N/A'}</div>
          </div>
          <div>
            <div className="text-slate-500">Quotation date</div>
            <div className="font-semibold">{templateFields.quotationDate || formatDate(quotation.quotationDate || quotation.createdAt)}</div>
          </div>
          <div>
            <div className="text-slate-500">Confirm date</div>
            <div className="font-semibold">{templateFields.confirmDate || formatDate(quotation.confirmDate || quotation.saleConfirmedAt || quotation.lockedAt)}</div>
          </div>
        </div>

        {(guardianName !== 'N/A' || guardianPhone !== 'N/A') && (
          <div className="mb-6 grid grid-cols-1 gap-4 rounded border border-slate-200 bg-slate-50 p-4 text-sm md:grid-cols-2">
            <div>
              <div className="text-slate-500">Người bảo hộ</div>
              <div className="font-semibold">{guardianName}</div>
            </div>
            <div>
              <div className="text-slate-500">SĐT người bảo hộ</div>
              <div className="font-semibold">{guardianPhone}</div>
            </div>
          </div>
        )}

        <table className="mb-6 w-full border border-slate-200 text-sm">
          <thead>
            <tr className="bg-slate-50">
              <th className="border-b border-slate-200 p-2 text-left">Sản phẩm</th>
              <th className="border-b border-slate-200 p-2 text-center">SL</th>
              <th className="border-b border-slate-200 p-2 text-right">Đơn giá</th>
              <th className="border-b border-slate-200 p-2 text-right">Giảm dòng</th>
              <th className="border-b border-slate-200 p-2 text-right">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item) => (
              <tr key={item.id}>
                <td className="border-b border-slate-100 p-2">{item.name}</td>
                <td className="border-b border-slate-100 p-2 text-center">{item.quantity}</td>
                <td className="border-b border-slate-100 p-2 text-right">{item.unitPrice.toLocaleString('vi-VN')}</td>
                <td className="border-b border-slate-100 p-2 text-right">{item.discount.toLocaleString('vi-VN')}</td>
                <td className="border-b border-slate-100 p-2 text-right font-medium">{item.total.toLocaleString('vi-VN')}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mb-8 ml-auto w-full space-y-1 text-sm md:w-96">
          <div className="flex justify-between">
            <span>Tổng giá trị:</span>
            <b>{linkedContract ? formatCurrency(linkedContract.totalValue) : formatCurrency(quotation.amount)}</b>
          </div>
          <div className="flex justify-between">
            <span>Chiết khấu:</span>
            <b>{formatCurrency(quotation.discount || 0)}</b>
          </div>
          <div className="flex justify-between text-lg text-blue-700">
            <span>Tổng thanh toán:</span>
            <b>{linkedContract ? formatCurrency(linkedContract.totalValue) : formatCurrency(quotation.finalAmount)}</b>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
          <div>
            <div className="text-slate-500">Hình thức thanh toán</div>
            <div className="font-semibold">
              {templateFields.paymentMethod ||
                (quotation.paymentMethod === 'CK' ? 'Chuyển khoản' : quotation.paymentMethod === 'CASH' ? 'Tiền mặt' : 'N/A')}
            </div>
          </div>
          <div>
            <div className="text-slate-500">Chứng từ thanh toán</div>
            <div className="font-semibold">{quotation.paymentProof || quotation.paymentDocuments?.bankTransactionCode || 'N/A'}</div>
          </div>
        </div>

        {contractNote && (
          <div className="mb-8 rounded border border-slate-200 bg-slate-50 p-4 text-sm">
            <div className="mb-2 text-xs font-bold uppercase text-slate-500">Ghi chú hợp đồng</div>
            <div className="whitespace-pre-wrap text-slate-700">{contractNote}</div>
          </div>
        )}

        <div className="mt-16 grid grid-cols-2 gap-8 text-center text-sm">
          <div>
            <div className="font-semibold">Đại diện trung tâm</div>
            <div className="mt-1 font-medium">{representative}</div>
            <div className="h-20" />
            <div>(Ký, ghi rõ họ tên)</div>
          </div>
          <div>
            <div className="font-semibold">Khách hàng / Học viên</div>
            <div className="mt-1 font-medium">{customerName}</div>
            <div className="h-20" />
            <div>(Ký, ghi rõ họ tên)</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractPreview;
