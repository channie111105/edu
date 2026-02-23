import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Save, CheckCircle2, Printer, ChevronRight, ChevronDown } from 'lucide-react';
import { IQuotation, QuotationStatus, UserRole } from '../types';
import { addQuotation, getContacts, getDealById, getLeadById, getLeads, getQuotations, updateQuotation } from '../utils/storage';
import { useAuth } from '../contexts/AuthContext';
import { confirmSale, lockQuotationAfterAccounting } from '../services/financeFlow.service';

const SERVICES = [
  { id: 'study_abroad', name: 'Du học' },
  { id: 'training', name: 'Đào tạo' },
  { id: 'combo', name: 'Combo' }
];

const PRODUCTS = [
  { id: 'p1', name: 'Khóa tiếng Đức A1-A2', price: 15000000 },
  { id: 'p2', name: 'Khóa tiếng Đức B1-B2', price: 55000000 },
  { id: 'p3', name: 'Combo Du học nghề Đức (Trọn gói)', price: 210000000 },
  { id: 'p4', name: 'Combo Du học nghề Úc', price: 210000000 },
  { id: 'p5', name: 'Phí xử lý hồ sơ', price: 5000000 }
];

const STATUS_STEPS = [
  { id: QuotationStatus.DRAFT, label: 'Mới' },
  { id: QuotationStatus.SENT, label: 'Đã gửi' },
  { id: QuotationStatus.SALE_CONFIRMED, label: 'Sale Confirmed' },
  { id: QuotationStatus.LOCKED, label: 'Đã khóa' }
];

const QuotationDetails: React.FC = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isNew = id === 'new';
  const dealId = searchParams.get('dealId');
  const initialAction = searchParams.get('action');

  const [activeTab, setActiveTab] = useState<'order_lines' | 'other_info' | 'payment'>('order_lines');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CK' | 'CASH'>('CK');
  const [paymentProof, setPaymentProof] = useState('');
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [customerQuery, setCustomerQuery] = useState('');

  const [formData, setFormData] = useState<Partial<IQuotation>>({
    status: QuotationStatus.DRAFT,
    amount: 0,
    discount: 0,
    finalAmount: 0,
    createdAt: new Date().toISOString()
  });

  useEffect(() => {
    if (isNew) {
      if (dealId) {
        const deal = getDealById(dealId);
        if (deal) {
          setFormData((prev) => ({
            ...prev,
            dealId: deal.id,
            leadId: deal.leadId,
            customerName: 'Loading...',
            product: deal.title,
            amount: deal.value,
            finalAmount: deal.value
          }));
          const lead = getLeadById(deal.leadId);
          if (lead) {
            setFormData((prev) => ({ ...prev, customerName: lead.name, customerId: lead.id }));
          }
        }
      }
      const soCode = `SO${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      setFormData((prev) => ({ ...prev, soCode }));
      return;
    }

    if (!id) return;
    const found = getQuotations().find((q) => q.id === id);
    if (!found) {
      navigate('/contracts/quotations');
      return;
    }

    setFormData(found);
    if (found.paymentProof) setPaymentProof(found.paymentProof);
    if (found.paymentMethod) setPaymentMethod(found.paymentMethod);
    if (initialAction === 'confirm' && found.status === QuotationStatus.SENT) {
      setShowConfirmModal(true);
    }
  }, [dealId, id, initialAction, isNew, navigate]);

  const isLocked = formData.status === QuotationStatus.LOCKED;
  const userRole = user?.role as UserRole | undefined;
  const canConfirmByRole = [UserRole.SALES_REP, UserRole.SALES_LEADER, UserRole.ADMIN, UserRole.FOUNDER].includes(userRole || UserRole.SALES_REP);
  const canLockByRole = userRole === UserRole.ACCOUNTANT;
  const canLockByTransaction = formData.transactionStatus === 'DA_DUYET';

  const stepIndex = useMemo(() => {
    const steps = [QuotationStatus.DRAFT, QuotationStatus.SENT, QuotationStatus.SALE_CONFIRMED, QuotationStatus.LOCKED];
    return steps.indexOf(formData.status as QuotationStatus);
  }, [formData.status]);

  const handleSave = () => {
    const dataToSave = {
      ...formData,
      updatedAt: new Date().toISOString(),
      id: formData.id || `Q-${Date.now()}`
    } as IQuotation;

    if (isNew) addQuotation(dataToSave);
    else updateQuotation(dataToSave);

    navigate('/contracts/quotations');
  };

  const handleSend = () => {
    const updated = { ...formData, status: QuotationStatus.SENT } as IQuotation;
    setFormData(updated);
    updateQuotation(updated);
    alert('Đã gửi báo giá cho khách hàng');
  };

  const handleConfirmSale = () => {
    if (!paymentProof) {
      alert('Vui lòng nhập chứng từ thanh toán');
      return;
    }

    const savedBeforeConfirm = {
      ...(formData as IQuotation),
      paymentMethod,
      paymentProof,
      updatedAt: new Date().toISOString()
    };

    updateQuotation(savedBeforeConfirm);
    const res = confirmSale(savedBeforeConfirm.id, user?.id || 'system');
    if (!res.ok || !res.quotation) {
      alert(res.error || 'Không thể xác nhận sale');
      return;
    }

    setFormData(res.quotation);
    setShowConfirmModal(false);
    alert('Đã xác nhận sale, giao dịch đang chờ kế toán duyệt');
  };

  const handleLock = () => {
    const res = lockQuotationAfterAccounting((formData as IQuotation).id, user?.id || 'system', userRole);
    if (!res.ok || !res.quotation) {
      alert(res.error || 'Không thể khóa SO');
      return;
    }
    setFormData(res.quotation);
    alert('Đã khóa đơn hàng và tạo hồ sơ học viên');
  };

  const productOptions = useMemo(() => {
    if (!formData.product) return PRODUCTS;
    const exists = PRODUCTS.some((p) => p.name === formData.product);
    if (exists) return PRODUCTS;
    return [
      ...PRODUCTS,
      {
        id: 'legacy-product',
        name: formData.product,
        price: formData.amount || formData.finalAmount || 0
      }
    ];
  }, [formData.product, formData.amount, formData.finalAmount]);

  const customerOptions = useMemo(() => {
    const contacts = getContacts().map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone || '',
      email: c.email || '',
      source: 'contact' as const
    }));
    const leads = getLeads().map((l) => ({
      id: l.id,
      name: l.name,
      phone: l.phone || '',
      email: l.email || '',
      source: 'lead' as const
    }));
    const merged = [...contacts, ...leads];
    const keyword = (customerQuery || '').trim().toLowerCase();
    if (!keyword) return merged.slice(0, 20);
    return merged
      .filter((c) =>
        [c.name, c.phone, c.email].some((v) => (v || '').toLowerCase().includes(keyword))
      )
      .slice(0, 20);
  }, [customerQuery]);

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6 text-sm text-slate-800">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-slate-500">
            <button onClick={() => navigate('/contracts/quotations')} className="hover:text-blue-600">Báo giá</button>
            <ChevronRight size={14} />
            <span className="font-semibold text-slate-900">{isNew ? 'Mới' : formData.soCode}</span>
          </div>
          {!isLocked && (
            <button onClick={handleSave} className="bg-slate-800 text-white px-3 py-2 rounded flex items-center gap-2">
              <Save size={16} /> Lưu
            </button>
          )}
        </div>

        <div className="bg-white border rounded p-2 flex items-center justify-between mb-4 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            {formData.status === QuotationStatus.DRAFT && (
              <button onClick={handleSend} className="px-3 py-1.5 rounded bg-purple-600 text-white text-xs font-semibold">Gửi Email</button>
            )}
            {(formData.status === QuotationStatus.DRAFT || formData.status === QuotationStatus.SENT) && (
              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={!canConfirmByRole}
                title={!canConfirmByRole ? 'Chỉ Sales được xác nhận Sale' : 'Xác nhận Sale'}
                className="px-3 py-1.5 rounded bg-blue-600 text-white text-xs font-semibold disabled:opacity-50"
              >
                Xác nhận
              </button>
            )}
            {(formData.status === QuotationStatus.SALE_CONFIRMED || formData.status === QuotationStatus.SALE_ORDER) && (
              <button
                onClick={handleLock}
                disabled={!canLockByRole || !canLockByTransaction}
                title={!canLockByRole ? 'Chỉ Kế toán được khóa SO' : !canLockByTransaction ? 'Cần kế toán duyệt giao dịch trước' : 'Khóa SO'}
                className="px-3 py-1.5 rounded border text-xs font-semibold disabled:text-slate-400"
              >
                Khóa đơn
              </button>
            )}
            {formData.status === QuotationStatus.LOCKED && (
              <button onClick={() => window.print()} className="px-3 py-1.5 rounded bg-blue-600 text-white text-xs font-semibold inline-flex items-center gap-1">
                <Printer size={14} /> In hợp đồng
              </button>
            )}
            {formData.transactionStatus && formData.transactionStatus !== 'NONE' && (
              <span className="px-2 py-1 text-xs border rounded bg-slate-50">Giao dịch: {formData.transactionStatus}</span>
            )}
          </div>

          <div className="flex items-center border rounded overflow-hidden">
            {STATUS_STEPS.map((step, idx) => (
              <div
                key={step.id}
                className={`px-3 py-1.5 text-[11px] font-bold uppercase ${idx <= stepIndex ? 'text-blue-700 bg-white' : 'text-slate-500 bg-slate-100'}`}
              >
                {step.label}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
          <div className="bg-white border rounded p-6">
            <div className="flex items-start justify-between mb-6">
              <h1 className="text-4xl font-bold text-slate-900">{isNew ? 'Báo giá mới' : formData.soCode}</h1>
              <div className="text-right">
                <div className="text-xs font-bold text-slate-500 uppercase">Ngày tạo</div>
                <div className="font-medium">{new Date(formData.createdAt || '').toLocaleDateString('vi-VN')}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <label className="text-xs font-bold uppercase text-blue-800">Khách hàng</label>
                <div className="relative">
                  <div className="flex items-center border-b">
                    <input
                      className="w-full py-1 pr-8 outline-none"
                      value={customerQuery || formData.customerName || ''}
                      onChange={(e) => {
                        if (isLocked) return;
                        const value = e.target.value;
                        setCustomerQuery(value);
                        setFormData((p) => ({ ...p, customerName: value }));
                        setCustomerDropdownOpen(true);
                      }}
                      onFocus={() => !isLocked && setCustomerDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setCustomerDropdownOpen(false), 120)}
                      disabled={isLocked}
                      placeholder="Nhập tên/SĐT hoặc chọn từ danh sách"
                    />
                    {!isLocked && (
                      <button
                        type="button"
                        className="absolute right-0 p-1 text-slate-500 hover:text-slate-700"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setCustomerDropdownOpen((prev) => !prev)}
                        title="Danh sách khách hàng"
                      >
                        <ChevronDown size={16} />
                      </button>
                    )}
                  </div>
                  {customerDropdownOpen && !isLocked && (
                    <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded border bg-white shadow">
                      {customerOptions.length > 0 ? (
                        customerOptions.map((customer) => (
                          <button
                            key={`${customer.source}-${customer.id}`}
                            type="button"
                            className="w-full border-b px-3 py-2 text-left hover:bg-slate-50"
                            onClick={() => {
                              setFormData((p) => ({
                                ...p,
                                customerName: customer.name,
                                customerId: customer.id,
                                leadId: customer.source === 'lead' ? customer.id : p.leadId
                              }));
                              setCustomerQuery(customer.name);
                              setCustomerDropdownOpen(false);
                            }}
                          >
                            <div className="font-medium text-slate-800">{customer.name}</div>
                            <div className="text-xs text-slate-500">
                              {customer.phone || customer.email || 'Không có thông tin liên hệ'}
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-xs text-slate-500">Không có khách hàng phù hợp</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-blue-800">Hạn báo giá</label>
                <input type="date" className="w-full border-b py-1 outline-none" disabled={isLocked} />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-blue-800">Loại dịch vụ</label>
                <select
                  className="w-full border-b py-1 outline-none"
                  value={formData.serviceType || 'training'}
                  onChange={(e) => !isLocked && setFormData((p) => ({ ...p, serviceType: e.target.value as any }))}
                  disabled={isLocked}
                >
                  {SERVICES.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-6 border-b mb-4">
              <button onClick={() => setActiveTab('order_lines')} className={`pb-2 font-semibold ${activeTab === 'order_lines' ? 'text-blue-700 border-b-2 border-blue-700' : 'text-slate-500'}`}>Chi tiết đơn hàng</button>
              <button onClick={() => setActiveTab('other_info')} className={`pb-2 font-semibold ${activeTab === 'other_info' ? 'text-blue-700 border-b-2 border-blue-700' : 'text-slate-500'}`}>Thông tin khác</button>
              <button onClick={() => setActiveTab('payment')} className={`pb-2 font-semibold inline-flex items-center gap-2 ${activeTab === 'payment' ? 'text-blue-700 border-b-2 border-blue-700' : 'text-slate-500'}`}>Thanh toán {(formData.status === QuotationStatus.SALE_CONFIRMED || isLocked) && <CheckCircle2 size={14} className="text-green-600" />}</button>
            </div>

            {activeTab === 'order_lines' && (
              <div>
                <table className="w-full text-left text-sm mb-4">
                  <thead>
                    <tr className="border-b-2 border-slate-800 text-xs uppercase">
                      <th className="py-2">Sản phẩm</th>
                      <th className="py-2 text-center">Số lượng</th>
                      <th className="py-2 text-right">Đơn giá</th>
                      <th className="py-2 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-3">
                        <select
                          className="w-full border rounded p-2"
                          value={formData.product || ''}
                          onChange={(e) => {
                            if (isLocked) return;
                            const prod = productOptions.find((p) => p.name === e.target.value);
                            setFormData((prev) => ({
                              ...prev,
                              product: e.target.value,
                              amount: prod ? prod.price : 0,
                              finalAmount: prod ? prod.price - (prev.discount || 0) : 0
                            }));
                          }}
                          disabled={isLocked}
                        >
                          <option value="">-- Chọn sản phẩm --</option>
                          {productOptions.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
                        </select>
                      </td>
                      <td className="py-3 text-center">1</td>
                      <td className="py-3 text-right">{(formData.amount || 0).toLocaleString('vi-VN')}</td>
                      <td className="py-3 text-right font-semibold">{(formData.finalAmount || 0).toLocaleString('vi-VN')}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="w-full md:w-80 ml-auto border rounded p-4 bg-slate-50 space-y-2">
                  <div className="flex justify-between"><span>Tổng giá trị:</span><span>{(formData.amount || 0).toLocaleString('vi-VN')} VND</span></div>
                  <div className="flex justify-between"><span>Chiết khấu:</span><span>{(formData.discount || 0).toLocaleString('vi-VN')}</span></div>
                  <div className="flex justify-between text-2xl text-blue-700 font-bold"><span>Tổng tiền:</span><span>{(formData.finalAmount || 0).toLocaleString('vi-VN')} đ</span></div>
                </div>
              </div>
            )}

            {activeTab === 'other_info' && (
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <h3 className="font-bold text-sm uppercase border-b pb-2">Thông tin sales</h3>
                  <div className="flex justify-between"><span>Người phụ trách</span><span className="font-medium text-blue-700">{user?.name || 'Sales Rep'}</span></div>
                  <div className="flex justify-between"><span>Đội nhóm</span><span>Sales Team 1</span></div>
                </div>
                <div className="space-y-3">
                  <h3 className="font-bold text-sm uppercase border-b pb-2">Thông tin bổ sung</h3>
                  <div className="flex justify-between"><span>Mã lớp dự kiến</span><span>{formData.classCode || 'N/A'}</span></div>
                  <div className="flex justify-between"><span>Lịch học</span><span>{formData.schedule || 'N/A'}</span></div>
                </div>
              </div>
            )}

            {activeTab === 'payment' && (
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-6 p-4 rounded border bg-blue-50">
                  <div>
                    <div className="text-xs uppercase font-bold text-slate-500 mb-1">Hình thức thanh toán</div>
                    <div className="font-semibold">{formData.paymentMethod === 'CK' ? 'Chuyển khoản' : formData.paymentMethod === 'CASH' ? 'Tiền mặt' : 'Chưa xác nhận'}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase font-bold text-slate-500 mb-1">Trạng thái giao dịch</div>
                    <div className="font-semibold">{isLocked || formData.status === QuotationStatus.SALE_CONFIRMED ? 'Đã thanh toán' : 'Chờ xác nhận'}</div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Minh chứng (Bill/Phiếu thu)</label>
                  <textarea
                    value={formData.paymentProof || ''}
                    onChange={(e) => !isLocked && setFormData((p) => ({ ...p, paymentProof: e.target.value }))}
                    disabled={isLocked}
                    placeholder="Nhập mã giao dịch hoặc ghi chú"
                    className="w-full h-40 border rounded p-3"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="bg-white border rounded h-fit">
            <div className="p-3 border-b font-bold">Lịch sử hoạt động</div>
            <div className="p-4 space-y-4 text-sm">
              {isNew && <div>Đang tạo báo giá mới...</div>}
              {(formData.status === QuotationStatus.SALE_CONFIRMED || formData.status === QuotationStatus.SALE_ORDER) && (
                <div>
                  <div className="font-semibold">Đã chốt đơn hàng (Confirmed)</div>
                  <div className="text-slate-500">Trạng thái đổi từ Quotation Sent sang Sale Confirmed</div>
                </div>
              )}
              {formData.paymentProof && <div>Đã tải lên chứng từ: {formData.paymentProof}</div>}
              <div>Báo giá được tạo bởi <b className="text-blue-700">{formData.createdBy || 'System'}</b></div>
            </div>
          </div>
        </div>
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Xác nhận đơn hàng (Sale Confirmed)</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1">Hình thức thanh toán</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 p-2 rounded border flex-1">
                    <input type="radio" value="CK" checked={paymentMethod === 'CK'} onChange={() => setPaymentMethod('CK')} />
                    <span>Chuyển khoản</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded border flex-1">
                    <input type="radio" value="CASH" checked={paymentMethod === 'CASH'} onChange={() => setPaymentMethod('CASH')} />
                    <span>Tiền mặt</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">Mã chứng từ / Bill <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={paymentProof}
                  onChange={(e) => setPaymentProof(e.target.value)}
                  placeholder={paymentMethod === 'CK' ? 'Nhập mã bill...' : 'Số phiếu thu...'}
                  className="w-full p-2 border rounded"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button onClick={() => setShowConfirmModal(false)} className="px-4 py-2 rounded hover:bg-slate-100">Hủy</button>
                <button onClick={handleConfirmSale} disabled={!paymentProof} className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50">Xác nhận</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuotationDetails;
