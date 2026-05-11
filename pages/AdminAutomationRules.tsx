import React, { useState } from 'react';
import { Bell, CheckCircle2, Clock3, Save } from 'lucide-react';

const STORAGE_KEY = 'educrm_admin_automation_time_config_v1';

const loadTimeConfig = () => {
  if (typeof window === 'undefined') {
    return { saleAlert: '15', leaderAlert: '60' };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { saleAlert: '15', leaderAlert: '60' };

    const parsed = JSON.parse(raw) as Partial<{ saleAlert: string; leaderAlert: string }>;
    return {
      saleAlert: parsed.saleAlert || '15',
      leaderAlert: parsed.leaderAlert || '60',
    };
  } catch {
    return { saleAlert: '15', leaderAlert: '60' };
  }
};

const AdminAutomationRules: React.FC = () => {
  const [slaConfig, setSlaConfig] = useState(() => loadTimeConfig());
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const handleSave = () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slaConfig));
    setFeedbackMessage('Đã lưu cấu hình thời gian.');
  };

  return (
    <div className="min-h-full overflow-y-auto bg-[#f3f6fa] font-sans text-[#0d141b]">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-8 lg:px-8">
        <header className="flex flex-col gap-4">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-700 shadow-sm">
            <Clock3 size={14} />
            Cấu hình thời gian
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-[#0d141b] md:text-4xl">Quy tắc tự động hóa</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4c739a]">
              Thiết lập mốc phản hồi lead và thời điểm leo thang cho quản lý. Các giá trị được tính bằng phút.
            </p>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-slate-900">Sale phản hồi</p>
                <p className="mt-1 text-sm text-slate-500">Thời gian tối đa cho lead mới</p>
              </div>
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <Clock3 size={20} />
              </div>
            </div>
            <div className="mt-5 flex items-end gap-2">
              <span className="text-4xl font-black text-blue-700">{slaConfig.saleAlert || 0}</span>
              <span className="pb-1 text-sm font-bold text-slate-500">phút</span>
            </div>
          </div>

          <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-slate-900">Leo thang quản lý</p>
                <p className="mt-1 text-sm text-slate-500">Thông báo khi lead chưa xử lý</p>
              </div>
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                <Bell size={20} />
              </div>
            </div>
            <div className="mt-5 flex items-end gap-2">
              <span className="text-4xl font-black text-indigo-700">{slaConfig.leaderAlert || 0}</span>
              <span className="pb-1 text-sm font-bold text-slate-500">phút</span>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[#cfdbe7] bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-lg font-black text-[#0d141b]">Thiết lập SLA</h2>
            <p className="mt-1 text-sm text-[#4c739a]">Nhập số phút cho từng mốc cảnh báo.</p>
          </div>

          <div className="grid gap-5 px-6 py-5 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-900">Cảnh báo Sale</span>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  className="h-12 w-full rounded-xl border border-[#cfdbe7] bg-slate-50 px-4 pr-14 text-base font-semibold text-[#0d141b] outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  value={slaConfig.saleAlert}
                  onChange={(e) => setSlaConfig({ ...slaConfig, saleAlert: e.target.value })}
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">phút</span>
              </div>
              <span className="mt-2 block text-xs leading-5 text-[#4c739a]">Thời gian tối đa để Sale phản hồi lead mới.</span>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-900">Cảnh báo Quản lý</span>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  className="h-12 w-full rounded-xl border border-[#cfdbe7] bg-slate-50 px-4 pr-14 text-base font-semibold text-[#0d141b] outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  value={slaConfig.leaderAlert}
                  onChange={(e) => setSlaConfig({ ...slaConfig, leaderAlert: e.target.value })}
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">phút</span>
              </div>
              <span className="mt-2 block text-xs leading-5 text-[#4c739a]">Thông báo cho Leader nếu lead chưa được xử lý sau mốc này.</span>
            </label>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-h-6 text-sm font-semibold text-emerald-700">
              {feedbackMessage ? (
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  {feedbackMessage}
                </span>
              ) : null}
            </div>
            <button
              onClick={handleSave}
              className="inline-flex h-11 min-w-[160px] items-center justify-center gap-2 rounded-xl bg-[#1380ec] px-5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              <Save size={18} />
              <span className="truncate">Lưu thay đổi</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminAutomationRules;
