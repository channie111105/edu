export const DEFAULT_CONTRACT_TEMPLATE_NAME = 'Mẫu hợp đồng đào tạo';

export const CONTRACT_FIELD_CONFIG = [
  { key: 'customerName', label: 'Tên khách hàng / Bên B', placeholder: 'Tên khách hàng đứng tên hợp đồng' },
  { key: 'studentName', label: 'Tên học sinh', placeholder: 'Họ tên học sinh' },
  { key: 'studentPhone', label: 'SĐT học sinh', placeholder: 'Số điện thoại học sinh' },
  { key: 'identityCard', label: 'CCCD học sinh', placeholder: 'Số CCCD học sinh' }
] as const;

export type EditableContractFieldKey = (typeof CONTRACT_FIELD_CONFIG)[number]['key'];
