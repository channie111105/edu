
import React, { useState } from 'react';
import { 
  Save, 
  Search, 
  Plus, 
  Edit2,
  Trash2,
  CreditCard,
  Settings2,
  X,
  CheckCircle2
} from 'lucide-react';

export type ServicePackageStatus = 'Đang áp dụng' | 'Ngừng áp dụng';


interface PaymentRoadmapStep {
  name: string;
  percent: number;
  due: string;
}

export interface ServicePackage {
  id: string;
  name: string;
  price: number;
  country: string;
  productPackage: string;
  programs: string[];

  type: string;
  currency: string;
  startDate: string;
  endDate: string;
  status: ServicePackageStatus;
  roadmap: {
    name: string;
    steps: PaymentRoadmapStep[];
  };
}

interface ServicePackageDraft {
  id: string;
  name: string;
  price: string;
  country: string;
  productPackage: string;
  programs: string[];

  type: string;
  currency: string;
  startDate: string;
  endDate: string;
  status: ServicePackageStatus;
  roadmapName: string;
  steps: Array<PaymentRoadmapStep & { key: string }>;
}

const COUNTRIES = ['Trung Quốc', 'Đức'];
const SERVICE_TYPES = ['Onl', 'off', 'APp', 'Blended'];
const CURRENCIES = ['Eur', 'VNĐ', 'tệ', 'won'];
const PROGRAM_OPTIONS = ['A1', 'A2', 'B1', 'ôn B1', 'HSK 1', 'HSK 2', 'HSK 3', 'HSK 4', 'HSK 5', 'HSK 6', 'Dv hồ sơ', 'du học'];

const PRODUCTS: ServicePackage[] = [
  {
    id: 'DE-A1',
    name: 'Tiếng Đức A1 (Offline)',
    price: 8000000,
    country: 'Đức',
    productPackage: 'Gói cơ bản',
    programs: ['du học', 'A1'],
    type: 'off',
    currency: 'VNĐ',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'Đang áp dụng',
    roadmap: {
      name: 'Lộ trình Tiếng Đức A1',
      steps: [
        { name: 'Thanh toán giữ lớp', percent: 40, due: 'Khi xác nhận lịch học' },
        { name: 'Hoàn tất học phí', percent: 60, due: 'Trước buổi học đầu tiên' },
      ],
    },
  },
  {
    id: 'COMBO-GER',
    name: 'Combo Du học Đức (A1-B1)',
    price: 45000000,
    country: 'Đức',
    productPackage: 'Gói VIP',
    programs: ['du học', 'A1', 'A2', 'B1', 'Dv hồ sơ'],
    type: 'Blended',
    currency: 'VNĐ',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'Đang áp dụng',
    roadmap: {
      name: 'Lộ trình Combo Du học Đức A1-B1',
      steps: [
        { name: 'Đợt 1 (Khởi động hồ sơ)', percent: 30, due: 'Ngay khi ký HĐ' },
        { name: 'Đợt 2 (Hoàn tất học phần)', percent: 40, due: 'Khi hoàn thành A2' },
        { name: 'Đợt 3 (Hồ sơ visa)', percent: 30, due: 'Trước lịch nộp hồ sơ' },
      ],
    },
  },
];

const STORAGE_KEY = 'educrm_admin_financial_course_packages_v1';
const inputClass =
  'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
const labelClass = 'mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500';

const createStepKey = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createEmptyDraft = (): ServicePackageDraft => ({
  id: '',
  name: '',
  price: '',
  country: 'Đức',
  productPackage: '',
  programs: ['du học'],
  type: 'off',
  currency: 'VNĐ',
  startDate: new Date().toISOString().split('T')[0],
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  status: 'Đang áp dụng',
  roadmapName: '',
  steps: [{ key: createStepKey(), name: 'Thanh toán toàn bộ', percent: 100, due: 'Trước khai giảng' }],
});

const buildDraftFromProduct = (product: ServicePackage): ServicePackageDraft => ({
  id: product.id,
  name: product.name,
  price: String(product.price),
  country: product.country || 'Đức',
  productPackage: product.productPackage || '',
  programs: product.programs || ['du học'],
  type: product.type || 'off',
  currency: product.currency || 'VNĐ',
  startDate: product.startDate || new Date().toISOString().split('T')[0],
  endDate: product.endDate || new Date().toISOString().split('T')[0],
  status: product.status || 'Đang áp dụng',
  roadmapName: product.roadmap.name,
  steps: product.roadmap.steps.map((step) => ({
    ...step,
    key: createStepKey(),
  })),
});


const normalizeProduct = (value: unknown): ServicePackage | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const source = value as Partial<ServicePackage>;
  const id = String(source.id || '').trim();
  const name = String(source.name || '').trim();
  const price = Number(source.price) || 0;
  const country = String(source.country || 'Đức');
  const productPackage = String(source.productPackage || '');
  const programs = Array.isArray(source.programs) ? source.programs : ['du học'];
  if (!programs.includes('du học')) programs.push('du học');
  const type = String(source.type || 'off');
  const currency = String(source.currency || 'VNĐ');
  const startDate = String(source.startDate || new Date().toISOString().split('T')[0]);
  const endDate = String(source.endDate || new Date().toISOString().split('T')[0]);
  const status = (source.status === 'Ngừng áp dụng' ? 'Ngừng áp dụng' : 'Đang áp dụng') as ServicePackageStatus;
  const roadmapName = String(source.roadmap?.name || '').trim();
  const rawSteps = Array.isArray(source.roadmap?.steps) ? source.roadmap.steps : [];
  const steps = rawSteps
    .map((step) => ({
      name: String(step?.name || '').trim(),
      percent: Number(step?.percent) || 0,
      due: String(step?.due || '').trim(),
    }))
    .filter((step) => step.name && step.percent > 0 && step.due);

  if (!id || !name || price <= 0 || !roadmapName || !steps.length) return null;

  return {
    id,
    name,
    price,
    country,
    productPackage,
    programs,
    type,
    currency,
    startDate,
    endDate,
    status,
    roadmap: {
      name: roadmapName,
      steps,
    },
  };
};

const loadProducts = (): ServicePackage[] => {
  if (typeof window === 'undefined') return PRODUCTS;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return PRODUCTS;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return PRODUCTS;

    return parsed.map(normalizeProduct).filter((item): item is ServicePackage => Boolean(item));
  } catch {
    return PRODUCTS;
  }
};

const AdminFinancialConfig: React.FC = () => {
  const [products, setProducts] = useState<ServicePackage[]>(() => loadProducts());
  const [searchTerm, setSearchTerm] = useState('');
  const [draft, setDraft] = useState<ServicePackageDraft | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  const filteredProducts = products.filter((product) =>
    [product.id, product.name, product.roadmap.name].some((value) =>
      value.toLowerCase().includes(searchTerm.trim().toLowerCase()),
    ),
  );
  const roadmapPercentTotal = draft?.steps.reduce((total, step) => total + (Number(step.percent) || 0), 0) || 0;

  const openCreateModal = () => {
    setDraft(createEmptyDraft());
    setEditingProductId(null);
    setFormError('');
    setFeedbackMessage('');
  };

  const openEditModal = (product: ServicePackage) => {
    setDraft(buildDraftFromProduct(product));
    setEditingProductId(product.id);
    setFormError('');
    setFeedbackMessage('');
  };

  const closeModal = () => {
    setDraft(null);
    setEditingProductId(null);
    setFormError('');
  };

  const updateDraftField = <K extends keyof Omit<ServicePackageDraft, 'steps'>>(field: K, value: ServicePackageDraft[K]) => {
    setDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const updateDraftStep = (stepKey: string, field: keyof PaymentRoadmapStep, value: string | number) => {
    setDraft((prev) => {
      if (!prev) return prev;
      
      let nextSteps = prev.steps.map((step) => 
        step.key === stepKey ? { ...step, [field]: value } : step
      );

      // Tự động cân bằng 100% nếu có đúng 2 đợt và đang sửa phần trăm
      if (field === 'percent' && nextSteps.length === 2) {
        const editedIndex = nextSteps.findIndex((s) => s.key === stepKey);
        const otherIndex = editedIndex === 0 ? 1 : 0;
        const newPercent = Number(value) || 0;
        
        nextSteps[otherIndex] = {
          ...nextSteps[otherIndex],
          percent: Math.max(0, 100 - newPercent)
        };
      }

      return { ...prev, steps: nextSteps };
    });
  };

  const addDraftStep = () => {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            steps: [...prev.steps, { key: createStepKey(), name: `Đợt ${prev.steps.length + 1}`, percent: 0, due: '' }],
          }
        : prev,
    );
  };

  const removeDraftStep = (stepKey: string) => {
    setDraft((prev) =>
      prev && prev.steps.length > 1
        ? {
            ...prev,
            steps: prev.steps.filter((step) => step.key !== stepKey),
          }
        : prev,
    );
  };

  const handleSaveDraft = () => {
    if (!draft) return;

    const nextProduct: ServicePackage = {
      id: draft.id.trim().toUpperCase(),
      name: draft.name.trim(),
      price: Number(draft.price) || 0,
      country: draft.country,
      productPackage: draft.productPackage,
      programs: draft.programs,
      type: draft.type,
      currency: draft.currency,
      startDate: draft.startDate,
      endDate: draft.endDate,
      status: draft.status,
      roadmap: {
        name: draft.roadmapName.trim(),
        steps: draft.steps.map((step) => ({
          name: step.name.trim(),
          percent: Number(step.percent) || 0,
          due: step.due.trim(),
        })),
      },
    };

    if (!nextProduct.id) {
      setFormError('Vui lòng nhập mã gói dịch vụ.');
      return;
    }

    if (!nextProduct.name) {
      setFormError('Vui lòng nhập tên gói dịch vụ.');
      return;
    }

    if (nextProduct.price <= 0) {
      setFormError('Giá niêm yết phải lớn hơn 0.');
      return;
    }

    if (!nextProduct.roadmap.name) {
      setFormError('Vui lòng nhập tên lộ trình phí.');
      return;
    }

    if (nextProduct.roadmap.steps.some((step) => !step.name || step.percent <= 0 || !step.due)) {
      setFormError('Mỗi đợt thanh toán cần đủ tên, phần trăm và điều kiện.');
      return;
    }

    const totalPercent = Math.round(nextProduct.roadmap.steps.reduce((total, step) => total + step.percent, 0) * 10) / 10;
    if (totalPercent !== 100) {
      setFormError('Tổng phần trăm lộ trình phải bằng 100%.');
      return;
    }

    const hasDuplicateId = products.some((product) => product.id === nextProduct.id && product.id !== editingProductId);
    if (hasDuplicateId) {
      setFormError('Mã gói dịch vụ đã tồn tại.');
      return;
    }

    setProducts((prev) =>
      editingProductId
        ? prev.map((product) => (product.id === editingProductId ? nextProduct : product))
        : [nextProduct, ...prev],
    );
    setHasUnsavedChanges(true);
    setFeedbackMessage(editingProductId ? `Đã cập nhật nháp ${nextProduct.name}.` : `Đã thêm nháp ${nextProduct.name}.`);
    closeModal();
  };

  const handleDeleteProduct = (product: ServicePackage) => {
    if (!window.confirm(`Bạn có chắc muốn xóa "${product.name}"?`)) return;

    setProducts((prev) => prev.filter((item) => item.id !== product.id));
    setHasUnsavedChanges(true);
    setFeedbackMessage(`Đã xóa nháp ${product.name}.`);
  };

  const handleSaveAll = () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    setHasUnsavedChanges(false);
    setFeedbackMessage('Đã lưu bảng giá gói dịch vụ.');
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#111418] font-sans overflow-y-auto">
      <div className="flex flex-1 justify-center py-8">
        <div className="flex flex-col max-w-[1200px] flex-1 px-6 gap-8">
          
          <div className="flex flex-col gap-2">
             <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                <Settings2 className="text-blue-600" /> Cấu hình Tài chính & Gói dịch vụ
             </h1>
             <p className="text-slate-500">Quản lý giá niêm yết và lộ trình đóng phí riêng cho từng gói dịch vụ.</p>
          </div>

          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 flex flex-col md:flex-row items-start justify-between gap-6 shadow-sm">
                <div className="flex gap-4 items-start">
                    <div className="p-3 bg-white text-blue-600 rounded-lg border border-blue-100 shadow-sm">
                      <CreditCard size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-blue-950 text-lg">Nguyên tắc gói dịch vụ</h3>
                      <p className="text-sm text-blue-800 mt-1 max-w-2xl">
                          Mỗi gói dịch vụ có một lộ trình đóng phí riêng để dùng khi tạo báo giá và hợp đồng. Gói dịch vụ bắt buộc phải bao gồm chương trình Du học.
                      </p>
                    </div>
                </div>
                <div className="rounded-lg border border-blue-200 bg-white px-4 py-3">
                    <span className="block text-xs font-bold uppercase tracking-wide text-slate-500">Số gói dịch vụ</span>
                    <span className="text-2xl font-black text-blue-700">{products.length}</span>
                </div>
              </div>

              {feedbackMessage ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 size={16} /> {feedbackMessage}
                </div>
              ) : hasUnsavedChanges ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                  Có thay đổi chưa lưu. Vui lòng nhấn "Lưu thay đổi" để hoàn tất.
                </div>
              ) : null}

              {/* Price List Table */}
              <div className="bg-white rounded-xl border border-[#cfdbe7] shadow-sm overflow-hidden">
                <div className="p-6 border-b border-[#cfdbe7] flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-900 text-lg">Bảng giá Gói dịch vụ</h3>
                    <div className="flex gap-3">
                      <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          <input
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 w-64"
                            placeholder="Tìm gói dịch vụ..."
                          />
                      </div>
                      <button
                        type="button"
                        onClick={openCreateModal}
                        className="flex items-center gap-2 bg-[#1380ec] text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors shadow-sm"
                      >
                          <Plus size={16} /> Thêm Gói dịch vụ
                      </button>
                    </div>
                </div>
                <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-500 uppercase text-xs font-bold border-b border-slate-200">
                      <tr>
                          <th className="px-6 py-4 w-20">Mã</th>
                          <th className="px-6 py-4">Tên Gói dịch vụ</th>
                          <th className="px-6 py-4">Quốc gia</th>
                          <th className="px-6 py-4">Chương trình</th>

                          <th className="px-6 py-4 text-right">Giá Niêm yết</th>
                          <th className="px-6 py-4">Trạng thái</th>
                          <th className="px-6 py-4 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredProducts.map((prod) => (
                          <tr key={prod.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-mono text-xs font-bold text-slate-500">{prod.id}</td>
                            <td className="px-6 py-4">
                                <div className="font-bold text-slate-900">{prod.name}</div>
                                <div className="text-[10px] text-slate-400 uppercase font-bold">{prod.productPackage}</div>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-700 font-medium">{prod.country}</td>
                            <td className="px-6 py-4">
                                <div className="flex flex-wrap gap-1">
                                    {prod.programs.map(p => (
                                        <span key={p} className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-[10px] font-bold border border-blue-100">{p}</span>
                                    ))}
                                </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="font-bold text-slate-900">{formatCurrency(prod.price)}</div>
                                <div className="text-[10px] text-slate-400 font-bold">{prod.currency}</div>
                            </td>
                            <td className="px-6 py-4">
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${prod.status === 'Đang áp dụng' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                                    {prod.status}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => openEditModal(prod)}
                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    aria-label={`Sửa ${prod.name}`}
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteProduct(prod)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                    aria-label={`Xóa ${prod.name}`}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                            </td>
                          </tr>
                      ))}
                      {!filteredProducts.length ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-10 text-center text-sm font-medium text-slate-500">
                            Không tìm thấy gói dịch vụ phù hợp.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveAll}
                  disabled={!hasUnsavedChanges}
                  className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg font-bold shadow-md transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                >
                    <Save size={20} /> Lưu thay đổi
                </button>
              </div>
            </div>

        </div>
      </div>

      {draft ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <button type="button" className="absolute inset-0 cursor-default" onClick={closeModal} aria-label="Đóng form" />

          <div className="relative z-10 flex max-h-[calc(100vh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5 bg-slate-50">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingProductId ? 'Sửa gói dịch vụ' : 'Thêm gói dịch vụ mới'}
                </h2>
                <p className="mt-1 text-sm text-slate-500 font-medium">
                  Cấu hình thông tin cơ bản và lộ trình thanh toán cho gói dịch vụ.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 bg-white shadow-sm"
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                handleSaveDraft();
              }}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                <div className="grid gap-4 md:grid-cols-12">
                  <div className="md:col-span-3">
                    <label className={labelClass}>Mã gói</label>
                    <input
                      value={draft.id}
                      onChange={(event) => updateDraftField('id', event.target.value)}
                      className={inputClass}
                      placeholder="VD: DE-A1"
                    />
                  </div>
                  <div className="md:col-span-6">
                    <label className={labelClass}>Tên gói dịch vụ</label>
                    <input
                      value={draft.name}
                      onChange={(event) => updateDraftField('name', event.target.value)}
                      className={inputClass}
                      placeholder="VD: Tiếng Đức A1"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className={labelClass}>Quốc gia</label>
                    <select
                      value={draft.country}
                      onChange={(event) => updateDraftField('country', event.target.value)}
                      className={inputClass}
                    >
                      {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div className="md:col-span-4">
                    <label className={labelClass}>Gói SP</label>
                    <input
                      value={draft.productPackage}
                      onChange={(event) => updateDraftField('productPackage', event.target.value)}
                      className={inputClass}
                      placeholder="Nhập tên gói..."
                    />
                  </div>
                  <div className="md:col-span-4">
                    <label className={labelClass}>Loại hình</label>
                    <select
                      value={draft.type}
                      onChange={(event) => updateDraftField('type', event.target.value)}
                      className={inputClass}
                    >
                      {SERVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-4">
                    <label className={labelClass}>Trạng thái</label>
                    <select
                      value={draft.status}
                      onChange={(event) => updateDraftField('status', event.target.value as ServicePackageStatus)}
                      className={inputClass}
                    >
                      <option value="Đang áp dụng">Đang áp dụng</option>
                      <option value="Ngừng áp dụng">Ngừng áp dụng</option>
                    </select>
                  </div>

                  <div className="md:col-span-3">
                    <label className={labelClass}>Giá niêm yết</label>
                    <input
                      type="text"
                      value={Number(draft.price || 0).toLocaleString('vi-VN')}
                      onChange={(event) => updateDraftField('price', event.target.value.replace(/\D/g, ''))}
                      className={inputClass}
                      placeholder="8.000.000"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className={labelClass}>Đơn vị tiền</label>
                    <select
                      value={draft.currency}
                      onChange={(event) => updateDraftField('currency', event.target.value)}
                      className={inputClass}
                    >
                      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <label className={labelClass}>Ngày bắt đầu</label>
                    <input
                      type="date"
                      value={draft.startDate}
                      onChange={(event) => updateDraftField('startDate', event.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className={labelClass}>Ngày kết thúc</label>
                    <input
                      type="date"
                      value={draft.endDate}
                      onChange={(event) => updateDraftField('endDate', event.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div className="md:col-span-12">
                    <label className={labelClass}>Chương trình</label>
                    <div className="flex flex-wrap gap-4 p-3 border border-slate-200 rounded-lg bg-slate-50">
                        {PROGRAM_OPTIONS.map(prog => (
                            <label key={prog} className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={draft.programs.includes(prog)}
                                    disabled={prog === 'du học'} // Bắt buộc
                                    onChange={(e) => {
                                        const next = e.target.checked 
                                            ? [...draft.programs, prog]
                                            : draft.programs.filter(p => p !== prog);
                                        updateDraftField('programs', next);
                                    }}
                                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                                />
                                <span className={`text-sm font-medium ${prog === 'du học' ? 'text-blue-700 font-bold' : 'text-slate-700'}`}>
                                    {prog} {prog === 'du học' && <span className="text-[10px] text-blue-500">(Bắt buộc)</span>}
                                </span>
                            </label>
                        ))}
                    </div>
                  </div>

                  <div className="md:col-span-12">
                    <label className={labelClass}>Tên lộ trình phí</label>
                    <input
                      value={draft.roadmapName}
                      onChange={(event) => updateDraftField('roadmapName', event.target.value)}
                      className={inputClass}
                      placeholder="VD: Lộ trình Combo Du học Đức A1-B1"
                    />
                  </div>
                </div>

                <div className="mt-6 rounded-xl border border-slate-200">
                  <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900">Các đợt thanh toán</h3>
                      <p className="text-xs text-slate-500">Tổng phần trăm hiện tại: {roadmapPercentTotal.toFixed(1)}%</p>
                    </div>
                    <button
                      type="button"
                      onClick={addDraftStep}
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 text-sm font-bold text-blue-700 transition hover:bg-blue-50 shadow-sm"
                    >
                      <Plus size={15} /> Thêm đợt
                    </button>
                  </div>

                  <div className="divide-y divide-slate-100 bg-white">
                    {draft.steps.map((step, index) => (
                      <div key={step.key} className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_180px_minmax(0,1fr)_44px] md:items-end hover:bg-slate-50/50 transition-colors">
                        <div>
                          <label className={labelClass}>Tên đợt {index + 1}</label>
                          <input
                            value={step.name}
                            onChange={(event) => updateDraftStep(step.key, 'name', event.target.value)}
                            className={inputClass}
                            placeholder={`Đợt ${index + 1}`}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Số tiền (VND)</label>
                          <div className="relative">
                              <input
                                type="text"
                                value={Math.round(Number(draft.price) * step.percent / 100).toLocaleString('vi-VN')}
                                onChange={(event) => {
                                    const rawValue = event.target.value.replace(/\D/g, '');
                                    const amount = Number(rawValue);
                                    const total = Number(draft.price) || 1;
                                    const percent = (amount / total) * 100;
                                    updateDraftStep(step.key, 'percent', percent);
                                }}
                                className={inputClass}
                                placeholder="0"
                              />
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 bg-white px-1 border border-slate-100 rounded">
                                  {step.percent.toFixed(1)}%
                              </div>
                          </div>
                        </div>
                        <div>
                          <label className={labelClass}>Điều kiện / thời điểm</label>
                          <input
                            value={step.due}
                            onChange={(event) => updateDraftStep(step.key, 'due', event.target.value)}
                            className={inputClass}
                            placeholder="VD: Trước khai giảng"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeDraftStep(step.key)}
                          disabled={draft.steps.length === 1}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label={`Xóa đợt ${index + 1}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between bg-slate-50">
                <div className="text-sm">
                  {formError ? (
                    <div className="flex items-center gap-2 font-semibold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100">
                      <X size={14} /> {formError}
                    </div>
                  ) : (
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${Math.abs(roadmapPercentTotal - 100) < 0.1 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                      <div className={`w-2 h-2 rounded-full ${Math.abs(roadmapPercentTotal - 100) < 0.1 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      <span className="font-bold">Tổng lộ trình: {roadmapPercentTotal.toFixed(1)}%</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="inline-flex h-10 items-center rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-100 bg-white shadow-sm"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={Math.abs(roadmapPercentTotal - 100) >= 0.1}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#1380ec] px-6 text-sm font-bold text-white transition hover:bg-blue-700 shadow-md disabled:bg-slate-300 disabled:cursor-not-allowed disabled:shadow-none"
                  >
                    <Save size={16} />
                    {editingProductId ? 'Cập nhật gói dịch vụ' : 'Lưu gói dịch vụ'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AdminFinancialConfig;
