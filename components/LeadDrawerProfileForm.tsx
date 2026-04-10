import React from 'react';
import { ShieldCheck } from 'lucide-react';
import {
  LEAD_CAMPUS_OPTIONS,
  LEAD_RELATION_OPTIONS,
  LEAD_TARGET_COUNTRY_OPTIONS,
  LeadCreateFormData,
  LeadCreateModalTab,
  STUDENT_EDUCATION_LEVEL_OPTIONS,
} from '../utils/leadCreateForm';
import { LEAD_CHANNEL_OPTIONS } from '../constants';
import { LEAD_STATUS_OPTIONS } from '../utils/leadStatus';
import LeadTagManager from './LeadTagManager';

interface LeadDrawerProfileFormProps {
  leadFormData: LeadCreateFormData;
  leadFormActiveTab: LeadCreateModalTab;
  closeReasonOptions: string[];
  salesOptions: Array<{ id: string; value: string; label: string }>;
  availableTags: string[];
  fixedTags: readonly string[];
  isAddingTag: boolean;
  customCloseReason: string;
  viewMode?: boolean;
  onPatch: (patch: Partial<LeadCreateFormData>) => void;
  onTabChange: (tab: LeadCreateModalTab) => void;
  onStatusChange: (status: string) => void;
  onStartAddingTag: () => void;
  onStopAddingTag: () => void;
  onAddTag: (tag: string) => void;
  onCreateTag: (tag: string) => void;
  onRemoveSelectedTag: (tag: string) => void;
  onDeleteTag: (tag: string) => void;
}

const SOURCE_OPTIONS = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'google', label: 'Google Search' },
  { value: 'hotline', label: 'Hotline' },
  { value: 'referral', label: 'Giới thiệu' },
] as const;

const POTENTIAL_OPTIONS = [
  { value: 'Nóng', label: 'Nóng' },
  { value: 'Tiềm năng', label: 'Tiềm năng' },
  { value: 'Tham khảo', label: 'Tham khảo' },
];

const PRODUCT_OPTIONS = [
  { value: 'Tiếng Đức', label: 'Tiếng Đức' },
  { value: 'Tiếng Trung', label: 'Tiếng Trung' },
  { value: 'Du học Đức', label: 'Du học Đức' },
  { value: 'Du học Trung', label: 'Du học Trung' },
  { value: 'Du học Nghề', label: 'Du học Nghề' },
  { value: 'XKLĐ', label: 'XKLĐ' },
];

const getFieldInputClassName = (extraClassName = '') =>
  ['field-input', extraClassName].filter(Boolean).join(' ');

const renderTextField = (
  value: string,
  placeholder: string,
  onChange: (value: string) => void,
  type: 'text' | 'date' = 'text',
  extraClassName = '',
) => (
  <input
    type={type}
    className={getFieldInputClassName(extraClassName)}
    placeholder={placeholder}
    value={value}
    onChange={(event) => onChange(event.target.value)}
  />
);

const renderTextAreaField = (
  value: string,
  placeholder: string,
  onChange: (value: string) => void,
  extraClassName = '',
) => (
  <textarea
    className={getFieldInputClassName(`h-20 resize-none ${extraClassName}`)}
    placeholder={placeholder}
    value={value}
    onChange={(event) => onChange(event.target.value)}
  />
);

const renderSelectField = (
  value: string,
  options: Array<{ value: string; label: string }>,
  placeholder: string,
  onChange: (value: string) => void,
  extraClassName = '',
) => (
  <select
    className={getFieldInputClassName(extraClassName)}
    value={value}
    onChange={(event) => onChange(event.target.value)}
  >
    <option value="">{placeholder}</option>
    {options.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
);

const FieldBlock: React.FC<{
  label: string;
  required?: boolean;
  requiredHint?: string;
  className?: string;
  labelClassName?: string;
  title?: string;
  children: React.ReactNode;
}> = ({
  label,
  required = false,
  requiredHint,
  className = '',
  labelClassName = '',
  title,
  children,
}) => (
  <div className={className} title={title}>
    <label className={['field-label', labelClassName].filter(Boolean).join(' ')}>
      {label}
      {required && <span className="text-red-500"> *</span>}
      {requiredHint && <span className="text-red-500"> {requiredHint}</span>}
    </label>
    {children}
  </div>
);

const SectionShell: React.FC<{
  title: React.ReactNode;
  className?: string;
  titleClassName?: string;
  children: React.ReactNode;
}> = ({ title, className = '', titleClassName = '', children }) => (
  <div className={className}>
    <h3 className={['section-title', titleClassName].filter(Boolean).join(' ')}>{title}</h3>
    {children}
  </div>
);

const LeadDrawerProfileForm: React.FC<LeadDrawerProfileFormProps> = ({
  leadFormData,
  leadFormActiveTab,
  closeReasonOptions,
  salesOptions,
  availableTags,
  fixedTags,
  isAddingTag,
  customCloseReason,
  viewMode = false,
  onPatch,
  onTabChange,
  onStatusChange,
  onStartAddingTag,
  onStopAddingTag,
  onAddTag,
  onCreateTag,
  onRemoveSelectedTag,
  onDeleteTag,
}) => {
  void leadFormActiveTab;
  void viewMode;
  void onTabChange;

  return (
    <>
      <style>
        {`
          .field-label { font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 4px; display: block; letter-spacing: 0.02em; }
          .field-input { width: 100%; padding: 8px 10px; font-size: 13px; color: #1e293b; background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 10px; outline: none; transition: all 0.2s; }
          .field-input::placeholder { color: #94a3b8; }
          .field-input:focus { background-color: #fff; border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1); }
          .field-input:disabled { background-color: #f8fafc; color: #64748b; cursor: not-allowed; }
          .section-title { display: none; }
        `}
      </style>

      <div className="mb-4 flex items-center gap-2 border-b border-blue-100 pb-2">
        <h3 className="text-[14px] font-extrabold uppercase tracking-wide text-blue-800">THÔNG TIN LEAD</h3>
      </div>

      <SectionShell title="Thông tin lead" className="mb-10">
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
          <FieldBlock label="Danh xưng / quan hệ">
            {renderSelectField(
              leadFormData.title,
              LEAD_RELATION_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
              '-- Chọn --',
              (value) => onPatch({ title: value }),
            )}
          </FieldBlock>

          <FieldBlock label="Họ và tên" required>
            {renderTextField(
              leadFormData.name,
              'Nhập họ và tên',
              (value) => onPatch({ name: value }),
              'text',
              'font-bold',
            )}
          </FieldBlock>

          <FieldBlock label="Số điện thoại" required>
            {renderTextField(
              leadFormData.phone,
              'Nhập số điện thoại',
              (value) => onPatch({ phone: value }),
              'text',
              'font-bold',
            )}
          </FieldBlock>

          <FieldBlock label="Nguồn data">
            {renderSelectField(
              leadFormData.source,
              SOURCE_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
              '-- Chọn nguồn --',
              (value) => onPatch({ source: value }),
            )}
          </FieldBlock>

          <FieldBlock label="Email">
            {renderTextField(
              leadFormData.email,
              'name@example.com',
              (value) => onPatch({ email: value }),
            )}
          </FieldBlock>
        </div>
      </SectionShell>

      <SectionShell title="Thông tin kinh doanh" className="mb-10 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
          <FieldBlock label="Sản phẩm">
            {renderSelectField(
              leadFormData.product,
              PRODUCT_OPTIONS,
              '-- Chọn --',
              (value) => onPatch({ product: value }),
            )}
          </FieldBlock>

          <FieldBlock label="Cơ sở">
            {renderSelectField(
              leadFormData.market,
              LEAD_CAMPUS_OPTIONS.map((option) => ({ value: option, label: option })),
              '-- Chọn --',
              (value) => onPatch({ market: value }),
            )}
          </FieldBlock>

          <FieldBlock label="Sale phụ trách">
            {renderSelectField(
              leadFormData.salesperson,
              salesOptions,
              '-- Chọn sale --',
              (value) => onPatch({ salesperson: value }),
            )}
          </FieldBlock>

          <FieldBlock label="Trạng thái">
            {renderSelectField(
              leadFormData.status,
              LEAD_STATUS_OPTIONS,
              '-- Chọn trạng thái --',
              (value) => onStatusChange(value),
            )}
          </FieldBlock>

          <FieldBlock label="Chiến dịch">
            {renderTextField(
              leadFormData.campaign,
              'VD: Summer 2026',
              (value) => onPatch({ campaign: value }),
            )}
          </FieldBlock>

          <FieldBlock label="Kênh">
            {renderSelectField(
              leadFormData.channel,
              LEAD_CHANNEL_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
              '-- Chọn kênh --',
              (value) => onPatch({ channel: value }),
            )}
          </FieldBlock>

          <FieldBlock label="Người giới thiệu" className="md:col-span-2">
            {renderTextField(
              leadFormData.referredBy,
              'VD: CTV A',
              (value) => onPatch({ referredBy: value }),
            )}
          </FieldBlock>
        </div>
      </SectionShell>

      <SectionShell title="Hồ sơ năng lực" className="mb-10 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
          <FieldBlock label="Thị trường mục tiêu">
            {renderSelectField(
              leadFormData.targetCountry,
              LEAD_TARGET_COUNTRY_OPTIONS.map((option) => ({ value: option, label: option })),
              '-- Chọn --',
              (value) => onPatch({ targetCountry: value }),
            )}
          </FieldBlock>

          <FieldBlock label="Trình độ học vấn" required>
            {renderSelectField(
              leadFormData.studentEducationLevel,
              STUDENT_EDUCATION_LEVEL_OPTIONS.map((option) => ({ value: option, label: option })),
              '-- Chọn --',
              (value) => onPatch({ studentEducationLevel: value }),
            )}
          </FieldBlock>

          <FieldBlock label="Ngày sinh" requiredHint="(Bắt buộc Qualified)">
            {renderTextField(
              leadFormData.studentDob,
              'dd/mm/yyyy',
              (value) => onPatch({ studentDob: value }),
              'date',
            )}
          </FieldBlock>

          <FieldBlock label="GPA / Điểm ngoại ngữ">
            {renderTextField(
              leadFormData.studentLanguageLevel,
              'VD: GPA 7.5 - IELTS 6.0',
              (value) => onPatch({ studentLanguageLevel: value }),
            )}
          </FieldBlock>
        </div>
      </SectionShell>

      <SectionShell title="Ghi chú nội bộ" className="mb-10 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
          <FieldBlock label="Mức độ tiềm năng">
            {renderSelectField(
              leadFormData.potential,
              POTENTIAL_OPTIONS,
              '-- Chọn --',
              (value) => onPatch({ potential: value }),
            )}
          </FieldBlock>

          <FieldBlock label="Thời gian dự kiến tham gia">
            {renderTextField(
              leadFormData.expectedStart,
              'VD: 06/2026',
              (value) => onPatch({ expectedStart: value }),
            )}
          </FieldBlock>

          <FieldBlock label="Tài chính">
            {renderTextField(
              leadFormData.financial,
              'Đủ / Thiếu / Cần hỗ trợ',
              (value) => onPatch({ financial: value }),
            )}
          </FieldBlock>

          <FieldBlock label="Ý kiến bố mẹ">
            {renderTextField(
              leadFormData.parentOpinion,
              'Đồng ý / Cần cân nhắc...',
              (value) => onPatch({ parentOpinion: value }),
            )}
          </FieldBlock>

          <FieldBlock label="Ghi chú khác" className="md:col-span-2">
            {renderTextAreaField(
              leadFormData.notes,
              'Nhập ghi chú thêm...',
              (value) => onPatch({ notes: value }),
            )}
          </FieldBlock>
        </div>
      </SectionShell>

      <SectionShell
        title={
          <span className="flex items-center gap-2 rounded-sm bg-red-50 py-1 pl-2 text-red-700">
            <ShieldCheck size={16} />
            Thông tin pháp lý
          </span>
        }
        className="mb-20"
        titleClassName="rounded-sm border-red-100 bg-red-50 py-1 pl-2 text-red-700"
      >
        <div className="relative grid grid-cols-1 gap-x-4 gap-y-4 rounded border border-red-100 bg-white p-4 md:grid-cols-3">
          <FieldBlock label="Số CCCD / Hộ chiếu" required className="md:col-span-1" labelClassName="text-red-800">
            {renderTextField(
              leadFormData.studentIdentityCard,
              'Số giấy tờ',
              (value) => onPatch({ studentIdentityCard: value }),
              'text',
              'font-bold border-red-200',
            )}
          </FieldBlock>

          <FieldBlock label="Ngày cấp" required className="md:col-span-1" labelClassName="text-red-800">
            {renderTextField(
              leadFormData.identityDate,
              'dd/mm/yyyy',
              (value) => onPatch({ identityDate: value }),
              'date',
              'border-red-200',
            )}
          </FieldBlock>

          <FieldBlock label="Nơi cấp" required className="md:col-span-1" labelClassName="text-red-800">
            {renderTextField(
              leadFormData.identityPlace,
              'Cục CS QLHC...',
              (value) => onPatch({ identityPlace: value }),
              'text',
              'border-red-200',
            )}
          </FieldBlock>

          <FieldBlock label="Địa chỉ thường trú (Full)" required className="md:col-span-3" labelClassName="text-red-800">
            {renderTextField(
              leadFormData.street,
              'Số nhà, Đường, Phường/Xã, Quận/Huyện, Tỉnh/TP',
              (value) => onPatch({ street: value }),
              'text',
              'border-red-200',
            )}
          </FieldBlock>
        </div>
      </SectionShell>

      <SectionShell title="Thông tin hệ thống" className="mb-10 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
          <FieldBlock label="Ngày tạo lead">
            <input className="field-input" readOnly disabled value={leadFormData.createdAtDisplay || '-'} />
          </FieldBlock>

          <FieldBlock label="Ngày assign">
            <input className="field-input" readOnly disabled value={leadFormData.assignedAtDisplay || '-'} />
          </FieldBlock>

          <FieldBlock label="Tags (Phân loại)" className="md:col-span-2">
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-3">
              <LeadTagManager
                selectedTags={leadFormData.tags}
                availableTags={availableTags}
                fixedTags={fixedTags}
                isAdding={isAddingTag}
                accent="blue"
                mode="dropdown"
                onStartAdding={onStartAddingTag}
                onStopAdding={onStopAddingTag}
                onAddTag={onAddTag}
                onCreateTag={onCreateTag}
                onRemoveSelectedTag={onRemoveSelectedTag}
                onDeleteTag={onDeleteTag}
              />
            </div>
          </FieldBlock>
        </div>
      </SectionShell>

      {closeReasonOptions.length > 0 && (
        <SectionShell title="Lý do đóng lead" className="mb-10 rounded-lg border border-rose-200 bg-rose-50 p-4">
          <div className="grid grid-cols-1 gap-4">
            <FieldBlock label="Lý do đóng lead">
              {renderSelectField(
                leadFormData.lossReason,
                closeReasonOptions.map((reason) => ({ value: reason, label: reason })),
                '-- Chọn lý do --',
                (value) => onPatch({ lossReason: value }),
              )}
            </FieldBlock>

            {leadFormData.lossReason === customCloseReason && (
              <FieldBlock label="Chi tiết">
                {renderTextAreaField(
                  leadFormData.lossReasonCustom,
                  'Nhập lý do cụ thể...',
                  (value) => onPatch({ lossReasonCustom: value }),
                )}
              </FieldBlock>
            )}
          </div>
        </SectionShell>
      )}
    </>
  );
};

export default LeadDrawerProfileForm;
