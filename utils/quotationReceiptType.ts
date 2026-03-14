export const QUOTATION_RECEIPT_TYPE_OPTIONS = [
  { value: 'DEPOSIT', label: 'Đặt cọc' },
  { value: 'INSTALLMENT_1', label: 'Đóng lần 1' },
  { value: 'INSTALLMENT_2', label: 'Đóng lần 2' },
  { value: 'INSTALLMENT_3', label: 'Đóng lần 3' },
  { value: 'SETTLEMENT', label: 'Tất toán' },
  { value: 'FULL_PAYMENT', label: 'Đóng toàn bộ' }
] as const;

export type QuotationReceiptType = (typeof QUOTATION_RECEIPT_TYPE_OPTIONS)[number]['value'];

export const DEFAULT_QUOTATION_RECEIPT_TYPE: QuotationReceiptType = 'DEPOSIT';

const LEGACY_ORDER_MODE_MAP: Record<string, QuotationReceiptType> = {
  Normal: DEFAULT_QUOTATION_RECEIPT_TYPE,
  Urgent: DEFAULT_QUOTATION_RECEIPT_TYPE,
  Promotion: DEFAULT_QUOTATION_RECEIPT_TYPE
};

export const normalizeQuotationReceiptType = (value?: string | null): QuotationReceiptType => {
  if (!value) return DEFAULT_QUOTATION_RECEIPT_TYPE;

  const matched = QUOTATION_RECEIPT_TYPE_OPTIONS.find((item) => item.value === value);
  if (matched) return matched.value;

  return LEGACY_ORDER_MODE_MAP[value] || DEFAULT_QUOTATION_RECEIPT_TYPE;
};
