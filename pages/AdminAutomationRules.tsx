import React, { useState } from 'react';
import { Save, ChevronDown } from 'lucide-react';
import { saveLeadDistributionConfig } from '../utils/storage';

const AdminAutomationRules: React.FC = () => {
  const [slaConfig, setSlaConfig] = useState({
    saleAlert: '15',
    leaderAlert: '60',
  });

  const [financeReminders, setFinanceReminders] = useState({
    beforeDue: '3',
    afterOverdue1: '1',
  });

  const fieldWidthClass = 'w-full max-w-[640px]';

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#f8fafc] font-sans text-[#0d141b]">
      <div className="flex flex-1 justify-center overflow-y-auto py-5">
        <div className="flex max-w-[960px] flex-1 flex-col px-4 pb-10 md:px-8">
          <div className="flex flex-wrap justify-between gap-3 p-4">
            <div className="flex min-w-72 flex-col gap-3">
              <p className="text-[32px] font-bold leading-tight tracking-light text-[#0d141b]">Quy tắc tự động hóa</p>
              <p className="text-sm font-normal leading-normal text-[#4c739a]">
                Cấu hình các quy tắc quản lý Lead như SLA, phân bổ và nhắc nhở tài chính.
              </p>
            </div>
          </div>

          <h2 className="px-4 pb-3 pt-5 text-[22px] font-bold leading-tight tracking-[-0.015em] text-[#0d141b]">
            SLA & Quy trình leo thang
          </h2>

          <div className={`mx-4 flex ${fieldWidthClass} flex-wrap items-end gap-4 py-3`}>
            <label className="flex min-w-40 flex-1 flex-col">
              <p className="pb-2 text-base font-medium leading-normal text-[#0d141b]">Cảnh báo Sale (phút)</p>
              <input
                type="number"
                className="flex h-14 w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg border border-[#cfdbe7] bg-slate-50 p-[15px] text-base font-normal leading-normal text-[#0d141b] placeholder:text-[#4c739a] focus:outline-0 focus:ring-2 focus:ring-blue-500"
                value={slaConfig.saleAlert}
                onChange={(e) => setSlaConfig({ ...slaConfig, saleAlert: e.target.value })}
              />
              <p className="mt-1 text-xs text-[#4c739a]">Thời gian tối đa để Sale phản hồi lead mới.</p>
            </label>
          </div>

          <div className={`mx-4 flex ${fieldWidthClass} flex-wrap items-end gap-4 py-3`}>
            <label className="flex min-w-40 flex-1 flex-col">
              <p className="pb-2 text-base font-medium leading-normal text-[#0d141b]">Cảnh báo Quản lý (phút)</p>
              <input
                type="number"
                className="flex h-14 w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg border border-[#cfdbe7] bg-slate-50 p-[15px] text-base font-normal leading-normal text-[#0d141b] placeholder:text-[#4c739a] focus:outline-0 focus:ring-2 focus:ring-blue-500"
                value={slaConfig.leaderAlert}
                onChange={(e) => setSlaConfig({ ...slaConfig, leaderAlert: e.target.value })}
              />
              <p className="mt-1 text-xs text-[#4c739a]">Thông báo cho Leader nếu lead chưa được xử lý sau mốc này.</p>
            </label>
          </div>

          <h2 className="px-4 pb-3 pt-5 text-[22px] font-bold leading-tight tracking-[-0.015em] text-[#0d141b]">
            Phân bổ Lead (Distribution)
          </h2>

          <div className={`mx-4 ${fieldWidthClass} overflow-visible rounded-xl border border-[#cfdbe7]`}>
            <div className="flex min-h-[88px] items-center justify-between gap-4 bg-slate-50 px-4 py-3">
              <div className="flex flex-col justify-center">
                <p className="text-base font-medium leading-normal text-[#0d141b]">Phân bổ thủ công</p>
                <p className="text-sm font-normal leading-normal text-[#4c739a]">
                  Đã xoá cơ chế tự động giao lead. Lead mới sẽ chờ Admin/Leader phân công bằng tay.
                </p>
              </div>
              <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] text-amber-700">
                Manual Only
              </span>
            </div>
          </div>

          <div className={`mx-4 flex ${fieldWidthClass} flex-wrap items-end gap-4 py-3`}>
            <label className="flex min-w-40 flex-1 flex-col">
              <p className="pb-2 text-base font-medium leading-normal text-[#0d141b]">Định tuyến theo khu vực</p>
              <div className="relative">
                <select
                  className="flex h-14 w-full min-w-0 flex-1 resize-none appearance-none overflow-hidden rounded-lg border border-[#cfdbe7] bg-slate-50 px-4 text-base font-normal leading-normal text-[#0d141b] placeholder:text-[#4c739a] focus:outline-0 focus:ring-2 focus:ring-blue-500"
                  defaultValue=""
                >
                  <option value="" disabled>Chọn quy tắc khu vực...</option>
                  <option value="north">Miền Bắc → Team A</option>
                  <option value="south">Miền Nam → Team B</option>
                  <option value="central">Miền Trung → Team C</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#4c739a]" size={20} />
              </div>
            </label>
          </div>

          <div className={`mx-4 flex ${fieldWidthClass} flex-wrap items-end gap-4 py-3`}>
            <label className="flex min-w-40 flex-1 flex-col">
              <p className="pb-2 text-base font-medium leading-normal text-[#0d141b]">Định tuyến theo chương trình</p>
              <div className="relative">
                <select
                  className="flex h-14 w-full min-w-0 flex-1 resize-none appearance-none overflow-hidden rounded-lg border border-[#cfdbe7] bg-slate-50 px-4 text-base font-normal leading-normal text-[#0d141b] placeholder:text-[#4c739a] focus:outline-0 focus:ring-2 focus:ring-blue-500"
                  defaultValue=""
                >
                  <option value="" disabled>Chọn quy tắc chương trình...</option>
                  <option value="german">Tiếng Đức → Team Đức</option>
                  <option value="chinese">Tiếng Trung → Team Trung</option>
                  <option value="abroad">Du học → Team Du học</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#4c739a]" size={20} />
              </div>
            </label>
          </div>

          <h2 className="px-4 pb-3 pt-5 text-[22px] font-bold leading-tight tracking-[-0.015em] text-[#0d141b]">
            Nhắc nhở tài chính
          </h2>

          <div className={`mx-4 flex ${fieldWidthClass} flex-wrap items-end gap-4 py-3`}>
            <label className="flex min-w-40 flex-1 flex-col">
              <p className="pb-2 text-base font-medium leading-normal text-[#0d141b]">Nhắc trước hạn đóng phí (ngày)</p>
              <input
                type="number"
                className="flex h-14 w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg border border-[#cfdbe7] bg-slate-50 p-[15px] text-base font-normal leading-normal text-[#0d141b] placeholder:text-[#4c739a] focus:outline-0 focus:ring-2 focus:ring-blue-500"
                value={financeReminders.beforeDue}
                onChange={(e) => setFinanceReminders({ ...financeReminders, beforeDue: e.target.value })}
              />
            </label>
          </div>

          <div className={`mx-4 flex ${fieldWidthClass} flex-wrap items-end gap-4 py-3`}>
            <label className="flex min-w-40 flex-1 flex-col">
              <p className="pb-2 text-base font-medium leading-normal text-[#0d141b]">Nhắc sau quá hạn lần 1 (ngày)</p>
              <input
                type="number"
                className="flex h-14 w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg border border-[#cfdbe7] bg-slate-50 p-[15px] text-base font-normal leading-normal text-[#0d141b] placeholder:text-[#4c739a] focus:outline-0 focus:ring-2 focus:ring-blue-500"
                value={financeReminders.afterOverdue1}
                onChange={(e) => setFinanceReminders({ ...financeReminders, afterOverdue1: e.target.value })}
              />
            </label>
          </div>

          <div className="flex justify-end px-4 py-6">
            <button
              onClick={() => {
                saveLeadDistributionConfig({ mode: 'manual' });
                alert('Đã lưu cấu hình. Hệ thống chỉ dùng phân bổ thủ công.');
              }}
              className="flex h-12 min-w-[84px] items-center justify-center gap-2 overflow-hidden rounded-lg bg-[#1380ec] px-6 text-base font-bold leading-normal tracking-[0.015em] text-slate-50 shadow-sm transition-colors hover:bg-blue-700"
            >
              <Save size={20} />
              <span className="truncate">Lưu thay đổi</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAutomationRules;
