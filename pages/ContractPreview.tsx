import React, { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { QuotationStatus, IAdmission, IQuotation, IStudent } from '../types';
import { getAdmissions, getQuotations, getStudents } from '../utils/storage';

const ContractPreview: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const quotation: IQuotation | undefined = useMemo(
    () => getQuotations().find((q) => q.id === id),
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
      <div className="p-6 max-w-4xl mx-auto">
        <p className="text-slate-600">Không tìm thấy báo giá.</p>
        <button
          onClick={() => navigate('/contracts/quotations')}
          className="mt-4 px-3 py-2 rounded border border-slate-300"
        >
          Quay lại
        </button>
      </div>
    );
  }

  if (quotation.status !== QuotationStatus.LOCKED) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <p className="text-slate-700 font-semibold">Chỉ in hợp đồng khi SO đã khóa.</p>
        <p className="text-slate-500 mt-1">Trạng thái hiện tại: {quotation.status}</p>
        <button
          onClick={() => navigate(`/contracts/quotations/${quotation.id}`)}
          className="mt-4 px-3 py-2 rounded border border-slate-300"
        >
          Quay lại báo giá
        </button>
      </div>
    );
  }

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

  return (
    <div className="p-4 md:p-6 bg-slate-100 min-h-screen">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #contract-print-root, #contract-print-root * { visibility: visible !important; }
          #contract-print-root { position: absolute; left: 0; top: 0; width: 100%; background: #fff; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="max-w-4xl mx-auto no-print flex items-center justify-between mb-4">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded border border-slate-300 bg-white"
        >
          <ArrowLeft size={16} /> Quay lại
        </button>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded bg-blue-600 text-white font-semibold"
        >
          <Printer size={16} /> In hợp đồng
        </button>
      </div>

      <div id="contract-print-root" className="max-w-4xl mx-auto bg-white border border-slate-200 rounded p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">HỢP ĐỒNG ĐÀO TẠO</h1>
          <p className="text-sm text-slate-500 mt-1">Mã SO: {quotation.soCode}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-6">
          <div>
            <div className="text-slate-500">Khách hàng / Học viên</div>
            <div className="font-semibold">{student?.name || quotation.customerName}</div>
          </div>
          <div>
            <div className="text-slate-500">Ngày tạo</div>
            <div className="font-semibold">{new Date(quotation.createdAt).toLocaleDateString('vi-VN')}</div>
          </div>
          <div>
            <div className="text-slate-500">Số điện thoại</div>
            <div className="font-semibold">{student?.phone || quotation.studentPhone || 'N/A'}</div>
          </div>
          <div>
            <div className="text-slate-500">Email</div>
            <div className="font-semibold">{student?.email || quotation.studentEmail || 'N/A'}</div>
          </div>
          <div>
            <div className="text-slate-500">Cơ sở</div>
            <div className="font-semibold">{approvedAdmission?.campusId || student?.campus || 'N/A'}</div>
          </div>
          <div>
            <div className="text-slate-500">Lớp</div>
            <div className="font-semibold">{approvedAdmission?.classId || student?.classId || student?.className || 'N/A'}</div>
          </div>
        </div>

        <table className="w-full text-sm border border-slate-200 mb-6">
          <thead>
            <tr className="bg-slate-50">
              <th className="text-left p-2 border-b border-slate-200">Sản phẩm</th>
              <th className="text-center p-2 border-b border-slate-200">SL</th>
              <th className="text-right p-2 border-b border-slate-200">Đơn giá</th>
              <th className="text-right p-2 border-b border-slate-200">Giảm dòng</th>
              <th className="text-right p-2 border-b border-slate-200">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item) => (
              <tr key={item.id}>
                <td className="p-2 border-b border-slate-100">{item.name}</td>
                <td className="p-2 text-center border-b border-slate-100">{item.quantity}</td>
                <td className="p-2 text-right border-b border-slate-100">{item.unitPrice.toLocaleString('vi-VN')}</td>
                <td className="p-2 text-right border-b border-slate-100">{item.discount.toLocaleString('vi-VN')}</td>
                <td className="p-2 text-right border-b border-slate-100 font-medium">{item.total.toLocaleString('vi-VN')}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ml-auto w-full md:w-96 space-y-1 text-sm mb-8">
          <div className="flex justify-between"><span>Tổng giá trị:</span><b>{(quotation.amount || 0).toLocaleString('vi-VN')} đ</b></div>
          <div className="flex justify-between"><span>Chiết khấu:</span><b>{(quotation.discount || 0).toLocaleString('vi-VN')} đ</b></div>
          <div className="flex justify-between text-lg text-blue-700"><span>Tổng thanh toán:</span><b>{(quotation.finalAmount || 0).toLocaleString('vi-VN')} đ</b></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-slate-500">Hình thức thanh toán</div>
            <div className="font-semibold">
              {quotation.paymentMethod === 'CK' ? 'Chuyển khoản' : quotation.paymentMethod === 'CASH' ? 'Tiền mặt' : 'N/A'}
            </div>
          </div>
          <div>
            <div className="text-slate-500">Chứng từ thanh toán</div>
            <div className="font-semibold">{quotation.paymentProof || quotation.paymentDocuments?.bankTransactionCode || 'N/A'}</div>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-2 gap-8 text-center text-sm">
          <div>
            <div className="font-semibold">Đại diện trung tâm</div>
            <div className="h-20" />
            <div>(Ký, ghi rõ họ tên)</div>
          </div>
          <div>
            <div className="font-semibold">Khách hàng / Học viên</div>
            <div className="h-20" />
            <div>(Ký, ghi rõ họ tên)</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractPreview;

