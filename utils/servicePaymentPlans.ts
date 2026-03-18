export type ServicePaymentPlanMarket = 'Đức' | 'Trung Quốc';
export type ServicePaymentPlanPackage = 'Du học' | 'Combo' | 'Đào tạo';

export type ServicePaymentPlanStepConfig = {
  installmentLabel: string;
  condition: string;
  ratio: number;
};

export type ServicePaymentPlanConfig = {
  id: string;
  market: ServicePaymentPlanMarket;
  servicePackage: ServicePaymentPlanPackage;
  steps: ServicePaymentPlanStepConfig[];
};

export type ResolvedServicePaymentPlanStep = ServicePaymentPlanStepConfig & {
  amount: number;
};

export type ResolvedServicePaymentPlan = ServicePaymentPlanConfig & {
  totalAmount: number;
  steps: ResolvedServicePaymentPlanStep[];
};

export const SERVICE_PAYMENT_PLAN_CONFIGS: ServicePaymentPlanConfig[] = [
  {
    id: 'de-training',
    market: 'Đức',
    servicePackage: 'Đào tạo',
    steps: [
      { installmentLabel: 'Lần 1', condition: 'Giữ chỗ và xác nhận lịch khai giảng', ratio: 0.5 },
      { installmentLabel: 'Lần 2', condition: 'Trước ngày vào lớp chính thức', ratio: 0.5 }
    ]
  },
  {
    id: 'de-combo',
    market: 'Đức',
    servicePackage: 'Combo',
    steps: [
      { installmentLabel: 'Lần 1', condition: 'Chốt lộ trình và giữ chỗ', ratio: 0.3 },
      { installmentLabel: 'Lần 2', condition: 'Trước khi chuyển sang giai đoạn tiếp theo', ratio: 0.3 },
      { installmentLabel: 'Lần 3', condition: 'Trước khi hoàn tất hồ sơ đầu ra', ratio: 0.4 }
    ]
  },
  {
    id: 'de-study-abroad',
    market: 'Đức',
    servicePackage: 'Du học',
    steps: [
      { installmentLabel: 'Lần 1', condition: 'Ký hồ sơ dịch vụ và mở hồ sơ', ratio: 0.2 },
      { installmentLabel: 'Lần 2', condition: 'Nộp hồ sơ APS/Visa', ratio: 0.35 },
      { installmentLabel: 'Lần 3', condition: 'Trước xuất cảnh và bàn giao hồ sơ', ratio: 0.45 }
    ]
  },
  {
    id: 'cn-training',
    market: 'Trung Quốc',
    servicePackage: 'Đào tạo',
    steps: [
      { installmentLabel: 'Lần 1', condition: 'Giữ chỗ và kích hoạt lớp đầu vào', ratio: 0.5 },
      { installmentLabel: 'Lần 2', condition: 'Trước khi vào lớp tiếp theo', ratio: 0.5 }
    ]
  },
  {
    id: 'cn-combo',
    market: 'Trung Quốc',
    servicePackage: 'Combo',
    steps: [
      { installmentLabel: 'Lần 1', condition: 'Xác nhận lộ trình và giữ chỗ', ratio: 0.4 },
      { installmentLabel: 'Lần 2', condition: 'Trước giai đoạn luyện hồ sơ', ratio: 0.3 },
      { installmentLabel: 'Lần 3', condition: 'Trước khi hoàn tất thủ tục', ratio: 0.3 }
    ]
  },
  {
    id: 'cn-study-abroad',
    market: 'Trung Quốc',
    servicePackage: 'Du học',
    steps: [
      { installmentLabel: 'Lần 1', condition: 'Mở hồ sơ và xác nhận trường mục tiêu', ratio: 0.25 },
      { installmentLabel: 'Lần 2', condition: 'Nộp hồ sơ xin thư mời/visa', ratio: 0.35 },
      { installmentLabel: 'Lần 3', condition: 'Trước khi bay và bàn giao hồ sơ', ratio: 0.4 }
    ]
  }
];

export const getServicePaymentPlanConfig = (
  market?: string,
  servicePackage?: string
) => SERVICE_PAYMENT_PLAN_CONFIGS.find(
  (item) => item.market === market && item.servicePackage === servicePackage
);

export const resolveServicePaymentPlan = (
  market?: string,
  servicePackage?: string,
  totalAmount: number = 0
): ResolvedServicePaymentPlan | null => {
  const config = getServicePaymentPlanConfig(market, servicePackage);
  if (!config) return null;

  const normalizedTotal = Math.max(0, Math.round(Number(totalAmount) || 0));
  let allocated = 0;
  const steps = config.steps.map((step, index) => {
    const isLastStep = index === config.steps.length - 1;
    const amount = isLastStep
      ? Math.max(0, normalizedTotal - allocated)
      : Math.round(normalizedTotal * step.ratio);
    allocated += amount;
    return { ...step, amount };
  });

  return {
    ...config,
    totalAmount: normalizedTotal,
    steps
  };
};

export const formatServicePaymentPlanNote = (plan: ResolvedServicePaymentPlan | null) => {
  if (!plan) return '';
  return plan.steps
    .map(
      (step) =>
        `${step.installmentLabel}: ${step.condition} - ${step.amount.toLocaleString('vi-VN')} đ`
    )
    .join('\n');
};
