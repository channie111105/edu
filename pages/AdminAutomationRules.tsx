
import React, { useState } from 'react';
import { Save, Zap, ChevronDown } from 'lucide-react';

const AdminAutomationRules: React.FC = () => {
  const [slaConfig, setSlaConfig] = useState({
    saleAlert: '15',
    leaderAlert: '60',
    warningHours: '24'
  });

  const [distribution, setDistribution] = useState({
    roundRobin: true,
    manual: false,
    territory: '',
    program: ''
  });

  const [financeReminders, setFinanceReminders] = useState({
    beforeDue: '3',
    afterOverdue1: '1',
    afterOverdue2: '7'
  });

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#0d141b] font-sans overflow-hidden">
      <div className="flex flex-1 justify-center py-5 overflow-y-auto">
        <div className="flex flex-col max-w-[960px] flex-1 px-4 md:px-8 pb-10">
          
          {/* Header */}
          <div className="flex flex-wrap justify-between gap-3 p-4">
            <div className="flex min-w-72 flex-col gap-3">
              <p className="text-[#0d141b] tracking-light text-[32px] font-bold leading-tight">Quy tắc Tự động hóa</p>
              <p className="text-[#4c739a] text-sm font-normal leading-normal">
                Cấu hình các quy tắc tự động cho quản lý Lead (SLA), phân bổ và nhắc nhở tài chính.
              </p>
            </div>
          </div>

          {/* Section 1: SLA & Escalation */}
          <h2 className="text-[#0d141b] text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">
            SLA & Quy trình Leo thang
          </h2>
          
          <div className="flex max-w-[600px] flex-wrap items-end gap-4 px-4 py-3">
            <label className="flex flex-col min-w-40 flex-1">
              <p className="text-[#0d141b] text-base font-medium leading-normal pb-2">Cảnh báo Sale (phút)</p>
              <input
                type="number"
                className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#0d141b] focus:outline-0 focus:ring-2 focus:ring-blue-500 border border-[#cfdbe7] bg-slate-50 h-14 placeholder:text-[#4c739a] p-[15px] text-base font-normal leading-normal"
                value={slaConfig.saleAlert}
                onChange={(e) => setSlaConfig({...slaConfig, saleAlert: e.target.value})}
              />
              <p className="text-xs text-[#4c739a] mt-1">Thời gian tối đa để Sale phản hồi Lead mới trước khi bị nhắc nhở.</p>
            </label>
          </div>

          <div className="flex max-w-[600px] flex-wrap items-end gap-4 px-4 py-3">
            <label className="flex flex-col min-w-40 flex-1">
              <p className="text-[#0d141b] text-base font-medium leading-normal pb-2">Cảnh báo Quản lý (phút)</p>
              <input
                type="number"
                className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#0d141b] focus:outline-0 focus:ring-2 focus:ring-blue-500 border border-[#cfdbe7] bg-slate-50 h-14 placeholder:text-[#4c739a] p-[15px] text-base font-normal leading-normal"
                value={slaConfig.leaderAlert}
                onChange={(e) => setSlaConfig({...slaConfig, leaderAlert: e.target.value})}
              />
              <p className="text-xs text-[#4c739a] mt-1">Gửi thông báo cho Leader nếu Lead chưa được xử lý sau khoảng thời gian này.</p>
            </label>
          </div>

          {/* Section 2: Lead Distribution */}
          <h2 className="text-[#0d141b] text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">
            Phân bổ Lead (Distribution)
          </h2>

          <div className="flex items-center gap-4 bg-slate-50 px-4 min-h-[72px] py-2 justify-between rounded-t-xl border border-[#cfdbe7] border-b-0 mx-4">
            <div className="flex flex-col justify-center">
              <p className="text-[#0d141b] text-base font-medium leading-normal line-clamp-1">Phân bổ Vòng tròn (Round-robin)</p>
              <p className="text-[#4c739a] text-sm font-normal leading-normal line-clamp-2">
                Tự động chia đều Lead cho nhân viên kinh doanh dựa trên trạng thái sẵn sàng (Active).
              </p>
            </div>
            <div className="shrink-0">
              <label className="relative flex h-[31px] w-[51px] cursor-pointer items-center rounded-full border-none bg-[#e7edf3] p-0.5 transition-colors has-[:checked]:bg-[#1380ec]">
                <div className={`h-full w-[27px] rounded-full bg-white shadow-sm transition-transform ${distribution.roundRobin ? 'translate-x-[20px]' : ''}`}></div>
                <input 
                  type="checkbox" 
                  className="invisible absolute" 
                  checked={distribution.roundRobin}
                  onChange={(e) => setDistribution({...distribution, roundRobin: e.target.checked, manual: !e.target.checked})}
                />
              </label>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-slate-50 px-4 min-h-[72px] py-2 justify-between rounded-b-xl border border-[#cfdbe7] mx-4 mb-4">
            <div className="flex flex-col justify-center">
              <p className="text-[#0d141b] text-base font-medium leading-normal line-clamp-1">Phân bổ Thủ công</p>
              <p className="text-[#4c739a] text-sm font-normal leading-normal line-clamp-2">
                Tất cả Lead mới sẽ được gán cho Admin/Leader để phân công bằng tay.
              </p>
            </div>
            <div className="shrink-0">
              <label className="relative flex h-[31px] w-[51px] cursor-pointer items-center rounded-full border-none bg-[#e7edf3] p-0.5 transition-colors has-[:checked]:bg-[#1380ec]">
                <div className={`h-full w-[27px] rounded-full bg-white shadow-sm transition-transform ${distribution.manual ? 'translate-x-[20px]' : ''}`}></div>
                <input 
                  type="checkbox" 
                  className="invisible absolute"
                  checked={distribution.manual}
                  onChange={(e) => setDistribution({...distribution, manual: e.target.checked, roundRobin: !e.target.checked})}
                />
              </label>
            </div>
          </div>

          <div className="flex max-w-[600px] flex-wrap items-end gap-4 px-4 py-3">
            <label className="flex flex-col min-w-40 flex-1">
              <p className="text-[#0d141b] text-base font-medium leading-normal pb-2">Định tuyến theo Khu vực</p>
              <div className="relative">
                <select
                  className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#0d141b] focus:outline-0 focus:ring-2 focus:ring-blue-500 border border-[#cfdbe7] bg-slate-50 h-14 placeholder:text-[#4c739a] px-4 appearance-none text-base font-normal leading-normal"
                  defaultValue=""
                >
                  <option value="" disabled>Chọn quy tắc khu vực...</option>
                  <option value="north">Miền Bắc → Team A</option>
                  <option value="south">Miền Nam → Team B</option>
                  <option value="central">Miền Trung → Team C</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-[#4c739a] pointer-events-none" size={20} />
              </div>
            </label>
          </div>

          <div className="flex max-w-[600px] flex-wrap items-end gap-4 px-4 py-3">
            <label className="flex flex-col min-w-40 flex-1">
              <p className="text-[#0d141b] text-base font-medium leading-normal pb-2">Định tuyến theo Chương trình</p>
              <div className="relative">
                <select
                  className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#0d141b] focus:outline-0 focus:ring-2 focus:ring-blue-500 border border-[#cfdbe7] bg-slate-50 h-14 placeholder:text-[#4c739a] px-4 appearance-none text-base font-normal leading-normal"
                  defaultValue=""
                >
                  <option value="" disabled>Chọn quy tắc chương trình...</option>
                  <option value="german">Tiếng Đức → Team Đức</option>
                  <option value="chinese">Tiếng Trung → Team Trung</option>
                  <option value="abroad">Du học → Team Du học</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-[#4c739a] pointer-events-none" size={20} />
              </div>
            </label>
          </div>

          {/* Section 3: Financial Reminders */}
          <h2 className="text-[#0d141b] text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">
            Nhắc nhở Tài chính
          </h2>

          <div className="flex max-w-[600px] flex-wrap items-end gap-4 px-4 py-3">
            <label className="flex flex-col min-w-40 flex-1">
              <p className="text-[#0d141b] text-base font-medium leading-normal pb-2">Nhắc trước hạn đóng phí (ngày)</p>
              <input
                type="number"
                className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#0d141b] focus:outline-0 focus:ring-2 focus:ring-blue-500 border border-[#cfdbe7] bg-slate-50 h-14 placeholder:text-[#4c739a] p-[15px] text-base font-normal leading-normal"
                value={financeReminders.beforeDue}
                onChange={(e) => setFinanceReminders({...financeReminders, beforeDue: e.target.value})}
              />
            </label>
          </div>

          <div className="flex max-w-[600px] flex-wrap items-end gap-4 px-4 py-3">
            <label className="flex flex-col min-w-40 flex-1">
              <p className="text-[#0d141b] text-base font-medium leading-normal pb-2">Nhắc sau khi quá hạn lần 1 (ngày)</p>
              <input
                type="number"
                className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#0d141b] focus:outline-0 focus:ring-2 focus:ring-blue-500 border border-[#cfdbe7] bg-slate-50 h-14 placeholder:text-[#4c739a] p-[15px] text-base font-normal leading-normal"
                value={financeReminders.afterOverdue1}
                onChange={(e) => setFinanceReminders({...financeReminders, afterOverdue1: e.target.value})}
              />
            </label>
          </div>

          <div className="flex px-4 py-6 justify-end">
            <button
              onClick={() => alert("Đã lưu cấu hình tự động hóa thành công!")}
              className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-6 bg-[#1380ec] text-slate-50 text-base font-bold leading-normal tracking-[0.015em] hover:bg-blue-700 transition-colors shadow-sm gap-2"
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
