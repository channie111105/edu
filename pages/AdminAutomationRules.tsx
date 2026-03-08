import React, { useEffect, useRef, useState } from 'react';
import { Save, ChevronDown } from 'lucide-react';
import { getLeadDistributionConfig, saveLeadDistributionConfig } from '../utils/storage';

const SALES_REPS = [
  { id: 'u2', name: 'Sarah Miller' },
  { id: 'u3', name: 'David Clark' },
  { id: 'u4', name: 'Alex Rivera' },
];

const DEFAULT_WEIGHTED_RATIOS: Record<string, number> = {
  u2: 40,
  u3: 35,
  u4: 25,
};

const buildWeightedRatios = (ratios?: Record<string, number>) =>
  SALES_REPS.reduce<Record<string, number>>((acc, rep) => {
    const rawValue = ratios?.[rep.id];
    const fallbackValue = DEFAULT_WEIGHTED_RATIOS[rep.id] ?? 0;
    const numericValue = Number(rawValue);
    acc[rep.id] = Number.isFinite(numericValue) ? Math.max(0, Math.min(100, Math.floor(numericValue))) : fallbackValue;
    return acc;
  }, {});

const AdminAutomationRules: React.FC = () => {
  const [slaConfig, setSlaConfig] = useState({
    saleAlert: '15',
    leaderAlert: '60',
  });

  const [distribution, setDistribution] = useState({
    auto: true,
    manual: false,
    territory: '',
    program: '',
    method: 'round_robin' as 'round_robin' | 'weighted',
    weightedRatios: buildWeightedRatios(),
  });

  const [financeReminders, setFinanceReminders] = useState({
    beforeDue: '3',
    afterOverdue1: '1',
  });

  const [isAutoHover, setIsAutoHover] = useState(false);
  const hoverHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fieldWidthClass = 'w-full max-w-[640px]';

  const setDistributionMode = (mode: 'auto' | 'manual') => {
    setDistribution((prev) => ({
      ...prev,
      auto: mode === 'auto',
      manual: mode === 'manual',
    }));
    saveLeadDistributionConfig({ mode });
  };

  useEffect(() => {
    const config = getLeadDistributionConfig();
    setDistribution((prev) => ({
      ...prev,
      auto: config.mode === 'auto',
      manual: config.mode === 'manual',
      method: config.method,
      weightedRatios: buildWeightedRatios(config.weightedRatios),
    }));
  }, []);

  useEffect(() => {
    if (!distribution.auto) {
      setIsAutoHover(false);
    }
  }, [distribution.auto]);

  useEffect(() => {
    return () => {
      if (hoverHideTimerRef.current) {
        clearTimeout(hoverHideTimerRef.current);
      }
    };
  }, []);

  const openAutoPopup = () => {
    if (hoverHideTimerRef.current) {
      clearTimeout(hoverHideTimerRef.current);
      hoverHideTimerRef.current = null;
    }
    setIsAutoHover(true);
  };

  const closeAutoPopup = () => {
    if (hoverHideTimerRef.current) {
      clearTimeout(hoverHideTimerRef.current);
    }
    hoverHideTimerRef.current = setTimeout(() => {
      setIsAutoHover(false);
    }, 180);
  };

  const updateWeight = (repId: string, value: string) => {
    const parsed = Number.parseInt(value, 10);
    const safeValue = Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : 0;
    setDistribution((prev) => ({
      ...prev,
      weightedRatios: {
        ...prev.weightedRatios,
        [repId]: safeValue,
      },
    }));
  };

  const weightedRatioTotal = SALES_REPS.reduce((sum, rep) => sum + (distribution.weightedRatios[rep.id] || 0), 0);

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#0d141b] font-sans overflow-hidden">
      <div className="flex flex-1 justify-center py-5 overflow-y-auto">
        <div className="flex flex-col max-w-[960px] flex-1 px-4 md:px-8 pb-10">
          <div className="flex flex-wrap justify-between gap-3 p-4">
            <div className="flex min-w-72 flex-col gap-3">
              <p className="text-[#0d141b] tracking-light text-[32px] font-bold leading-tight">Quy tắc tự động hóa</p>
              <p className="text-[#4c739a] text-sm font-normal leading-normal">
                Cấu hình các quy tắc tự động cho quản lý Lead (SLA), phân bổ và nhắc nhở tài chính.
              </p>
            </div>
          </div>

          <h2 className="text-[#0d141b] text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">
            SLA & Quy trình leo thang
          </h2>

          <div className={`flex ${fieldWidthClass} flex-wrap items-end gap-4 mx-4 py-3`}>
            <label className="flex flex-col min-w-40 flex-1">
              <p className="text-[#0d141b] text-base font-medium leading-normal pb-2">Cảnh báo Sale (phút)</p>
              <input
                type="number"
                className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#0d141b] focus:outline-0 focus:ring-2 focus:ring-blue-500 border border-[#cfdbe7] bg-slate-50 h-14 placeholder:text-[#4c739a] p-[15px] text-base font-normal leading-normal"
                value={slaConfig.saleAlert}
                onChange={(e) => setSlaConfig({ ...slaConfig, saleAlert: e.target.value })}
              />
              <p className="text-xs text-[#4c739a] mt-1">Thời gian tối đa để Sale phản hồi lead mới.</p>
            </label>
          </div>

          <div className={`flex ${fieldWidthClass} flex-wrap items-end gap-4 mx-4 py-3`}>
            <label className="flex flex-col min-w-40 flex-1">
              <p className="text-[#0d141b] text-base font-medium leading-normal pb-2">Cảnh báo Quản lý (phút)</p>
              <input
                type="number"
                className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#0d141b] focus:outline-0 focus:ring-2 focus:ring-blue-500 border border-[#cfdbe7] bg-slate-50 h-14 placeholder:text-[#4c739a] p-[15px] text-base font-normal leading-normal"
                value={slaConfig.leaderAlert}
                onChange={(e) => setSlaConfig({ ...slaConfig, leaderAlert: e.target.value })}
              />
              <p className="text-xs text-[#4c739a] mt-1">Thông báo cho Leader nếu lead chưa được xử lý sau mốc này.</p>
            </label>
          </div>

          <h2 className="text-[#0d141b] text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">
            Phân bổ Lead (Distribution)
          </h2>

          <div className={`mx-4 ${fieldWidthClass} rounded-xl border border-[#cfdbe7] overflow-visible`}>
            <div
              className="relative flex items-center gap-4 bg-slate-50 px-4 min-h-[72px] py-2 justify-between border-b border-[#cfdbe7]"
              onMouseEnter={openAutoPopup}
              onMouseLeave={closeAutoPopup}
            >
              <div className="flex flex-col justify-center">
                <p className="text-[#0d141b] text-base font-medium leading-normal line-clamp-1">Phân bổ tự động</p>
                <p className="text-[#4c739a] text-sm font-normal leading-normal line-clamp-2">
                  Hệ thống tự chia lead theo phương thức bạn chọn.
                </p>
              </div>
              <div className="shrink-0">
                <label className="relative flex h-[31px] w-[51px] cursor-pointer items-center rounded-full border-none bg-[#e7edf3] p-0.5 transition-colors has-[:checked]:bg-[#1380ec]">
                  <div className={`h-full w-[27px] rounded-full bg-white shadow-sm transition-transform ${distribution.auto ? 'translate-x-[20px]' : ''}`}></div>
                  <input
                    type="checkbox"
                    className="invisible absolute"
                    checked={distribution.auto}
                    onChange={(e) => setDistributionMode(e.target.checked ? 'auto' : 'manual')}
                  />
                </label>
              </div>

              {distribution.auto && isAutoHover && (
                <div
                  className="absolute right-0 top-[calc(100%+6px)] z-20 w-[300px] rounded-lg border border-[#cfdbe7] bg-white p-3 shadow-lg"
                  onMouseEnter={openAutoPopup}
                  onMouseLeave={closeAutoPopup}
                >
                  <p className="text-[#0d141b] text-sm font-semibold leading-normal mb-2">Cấu hình tự động</p>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDistribution((prev) => ({ ...prev, method: 'round_robin' }))}
                      className={`h-8 rounded-md border px-3 text-xs font-semibold transition-colors ${
                        distribution.method === 'round_robin'
                          ? 'border-[#1380ec] bg-blue-50 text-[#0d141b]'
                          : 'border-[#cfdbe7] bg-white text-[#4c739a] hover:border-[#9bb8d6]'
                      }`}
                    >
                      Xoay vòng đều
                    </button>
                    <button
                      type="button"
                      onClick={() => setDistribution((prev) => ({ ...prev, method: 'weighted' }))}
                      className={`h-8 rounded-md border px-3 text-xs font-semibold transition-colors ${
                        distribution.method === 'weighted'
                          ? 'border-[#1380ec] bg-blue-50 text-[#0d141b]'
                          : 'border-[#cfdbe7] bg-white text-[#4c739a] hover:border-[#9bb8d6]'
                      }`}
                    >
                      Theo tỉ trọng
                    </button>
                  </div>

                  {distribution.method === 'weighted' ? (
                    <div className="mt-3 space-y-2">
                      {SALES_REPS.map((rep) => (
                        <div key={rep.id} className="flex items-center justify-between gap-2">
                          <div className="text-sm text-[#0d141b] font-medium truncate">{rep.name}</div>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={distribution.weightedRatios[rep.id] ?? 0}
                              onChange={(e) => updateWeight(rep.id, e.target.value)}
                              className="h-8 w-[72px] rounded-md border border-[#cfdbe7] bg-white px-2 text-sm text-[#0d141b] focus:outline-0 focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-xs text-[#4c739a]">%</span>
                          </div>
                        </div>
                      ))}
                      <p className={`text-xs ${weightedRatioTotal === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        Tổng: {weightedRatioTotal}%
                      </p>
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-[#4c739a]">Đang dùng chế độ xoay vòng đều.</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 bg-slate-50 px-4 min-h-[72px] py-2 justify-between">
              <div className="flex flex-col justify-center">
                <p className="text-[#0d141b] text-base font-medium leading-normal line-clamp-1">Phân bổ thủ công</p>
                <p className="text-[#4c739a] text-sm font-normal leading-normal line-clamp-2">
                  Lead mới sẽ đợi Admin/Leader phân công bằng tay.
                </p>
              </div>
              <div className="shrink-0">
                <label className="relative flex h-[31px] w-[51px] cursor-pointer items-center rounded-full border-none bg-[#e7edf3] p-0.5 transition-colors has-[:checked]:bg-[#1380ec]">
                  <div className={`h-full w-[27px] rounded-full bg-white shadow-sm transition-transform ${distribution.manual ? 'translate-x-[20px]' : ''}`}></div>
                  <input
                    type="checkbox"
                    className="invisible absolute"
                    checked={distribution.manual}
                    onChange={(e) => setDistributionMode(e.target.checked ? 'manual' : 'auto')}
                  />
                </label>
              </div>
            </div>
          </div>

          <div className={`flex ${fieldWidthClass} flex-wrap items-end gap-4 mx-4 py-3`}>
            <label className="flex flex-col min-w-40 flex-1">
              <p className="text-[#0d141b] text-base font-medium leading-normal pb-2">Định tuyến theo khu vực</p>
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

          <div className={`flex ${fieldWidthClass} flex-wrap items-end gap-4 mx-4 py-3`}>
            <label className="flex flex-col min-w-40 flex-1">
              <p className="text-[#0d141b] text-base font-medium leading-normal pb-2">Định tuyến theo chương trình</p>
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

          <h2 className="text-[#0d141b] text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">
            Nhắc nhở tài chính
          </h2>

          <div className={`flex ${fieldWidthClass} flex-wrap items-end gap-4 mx-4 py-3`}>
            <label className="flex flex-col min-w-40 flex-1">
              <p className="text-[#0d141b] text-base font-medium leading-normal pb-2">Nhắc trước hạn đóng phí (ngày)</p>
              <input
                type="number"
                className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#0d141b] focus:outline-0 focus:ring-2 focus:ring-blue-500 border border-[#cfdbe7] bg-slate-50 h-14 placeholder:text-[#4c739a] p-[15px] text-base font-normal leading-normal"
                value={financeReminders.beforeDue}
                onChange={(e) => setFinanceReminders({ ...financeReminders, beforeDue: e.target.value })}
              />
            </label>
          </div>

          <div className={`flex ${fieldWidthClass} flex-wrap items-end gap-4 mx-4 py-3`}>
            <label className="flex flex-col min-w-40 flex-1">
              <p className="text-[#0d141b] text-base font-medium leading-normal pb-2">Nhắc sau quá hạn lần 1 (ngày)</p>
              <input
                type="number"
                className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#0d141b] focus:outline-0 focus:ring-2 focus:ring-blue-500 border border-[#cfdbe7] bg-slate-50 h-14 placeholder:text-[#4c739a] p-[15px] text-base font-normal leading-normal"
                value={financeReminders.afterOverdue1}
                onChange={(e) => setFinanceReminders({ ...financeReminders, afterOverdue1: e.target.value })}
              />
            </label>
          </div>

          <div className="flex px-4 py-6 justify-end">
            <button
              onClick={() => {
                saveLeadDistributionConfig({
                  mode: distribution.auto ? 'auto' : 'manual',
                  method: distribution.method,
                  weightedRatios: distribution.weightedRatios,
                });
                alert('Đã lưu cấu hình tự động hóa thành công!');
              }}
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
