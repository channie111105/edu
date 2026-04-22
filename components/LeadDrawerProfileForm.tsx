import React from 'react';
import { ShieldCheck } from 'lucide-react';
import {
  LEAD_CAMPUS_OPTIONS,
  LEAD_POTENTIAL_OPTIONS,
  LEAD_PRODUCT_OPTIONS,
  LEAD_RELATION_OPTIONS,
  LEAD_SOURCE_OPTIONS,
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
    className={getFieldInputClassName(`field-input-textarea ${extraClassName}`)}
    placeholder={placeholder}
    value={value}
    onChange={(event) => onChange(event.target.value)}
  />
);

const renderSelectField = (
  value: string,
  options: ReadonlyArray<{ value: string; label: string }>,
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
  multiline?: boolean;
  children: React.ReactNode;
}> = ({
  label,
  required = false,
  requiredHint,
  className = '',
  labelClassName = '',
  title,
  multiline = false,
  children,
}) => (
  <div
    className={['field-row', multiline ? 'field-row-multiline' : '', className].filter(Boolean).join(' ')}
    title={title}
  >
    <label className={['field-label', labelClassName].filter(Boolean).join(' ')}>
      <span>
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {requiredHint && <span className="field-required-hint">{requiredHint}</span>}
    </label>
    <div className="field-control">{children}</div>
  </div>
);

const SectionShell: React.FC<{
  title: React.ReactNode;
  className?: string;
  titleClassName?: string;
  children: React.ReactNode;
}> = ({ title, className = '', titleClassName = '', children }) => (
  <section className={className}>
    <div className={['section-title', titleClassName].filter(Boolean).join(' ')}>{title}</div>
    {children}
  </section>
);

const getOptionLabel = (options: ReadonlyArray<{ value: string; label: string }>, value: string) =>
  options.find((option) => option.value === value)?.label || value;

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
  void onTabChange;

  const renderViewValue = (
    value: string | undefined,
    placeholder = 'Chưa cập nhật',
    extraClassName = '',
    multiline = false,
  ) => {
    const normalized = String(value || '').trim();
    const hasValue = normalized.length > 0;

    return (
      <div
        className={[
          'field-view',
          hasValue ? '' : 'field-view-empty',
          multiline ? 'field-view-multiline' : '',
          extraClassName,
        ].filter(Boolean).join(' ')}
      >
        {hasValue ? normalized : placeholder}
      </div>
    );
  };

  const textField = (
    value: string,
    placeholder: string,
    onChange: (value: string) => void,
    type: 'text' | 'date' = 'text',
    inputClassName = '',
    viewClassName = '',
  ) => (viewMode
    ? renderViewValue(value, 'Chưa cập nhật', viewClassName)
    : renderTextField(value, placeholder, onChange, type, inputClassName));

  const textAreaField = (
    value: string,
    placeholder: string,
    onChange: (value: string) => void,
    inputClassName = '',
    viewClassName = '',
  ) => (viewMode
    ? renderViewValue(value, 'Chưa cập nhật', viewClassName, true)
    : renderTextAreaField(value, placeholder, onChange, inputClassName));

  const selectField = (
    value: string,
    options: ReadonlyArray<{ value: string; label: string }>,
    placeholder: string,
    onChange: (value: string) => void,
    inputClassName = '',
    viewClassName = '',
  ) => (viewMode
    ? renderViewValue(value ? getOptionLabel(options, value) : '', 'Chưa chọn', viewClassName)
    : renderSelectField(value, options, placeholder, onChange, inputClassName));

  const tagsField = viewMode ? (
    leadFormData.tags.length ? (
      <div className="flex min-h-[36px] flex-wrap items-center gap-2 py-1">
        {leadFormData.tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700"
          >
            {tag}
          </span>
        ))}
      </div>
    ) : (
      renderViewValue('', 'Chưa có tag')
    )
  ) : (
    <div className="py-1">
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
  );

  return (
    <>
      <style>
        {`
          .section-title {
            margin-bottom: 14px;
            font-size: 12px;
            font-weight: 800;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }
          .field-row {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .field-row-multiline {
            align-items: stretch;
          }
          .field-label {
            display: flex;
            flex-direction: column;
            gap: 2px;
            font-size: 11px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            line-height: 1.4;
          }
          .field-required-hint {
            font-size: 10px;
            font-weight: 600;
            color: #ef4444;
            text-transform: none;
            letter-spacing: 0;
          }
          .field-control {
            min-width: 0;
          }
          .field-input {
            width: 100%;
            min-height: 36px;
            border: 1px solid #cbd5e1;
            border-radius: 10px;
            background: #ffffff;
            padding: 8px 12px;
            font-size: 13px;
            color: #0f172a;
            outline: none;
            transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
          }
          .field-input::placeholder {
            color: #94a3b8;
          }
          .field-input:focus {
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
          }
          .field-input:disabled {
            background: #f8fafc;
            color: #64748b;
            cursor: not-allowed;
          }
          .field-input-textarea {
            min-height: 84px;
            resize: vertical;
          }
          .field-view {
            min-height: 36px;
            display: flex;
            align-items: center;
            padding: 6px 0;
            font-size: 13px;
            font-weight: 600;
            color: #0f172a;
            line-height: 1.6;
            word-break: break-word;
          }
          .field-view-empty {
            color: #94a3b8;
            font-style: italic;
            font-weight: 500;
          }
          .field-view-multiline {
            min-height: 64px;
            align-items: flex-start;
            white-space: pre-wrap;
          }
          @media (min-width: 768px) {
            .field-row {
              display: grid;
              grid-template-columns: minmax(136px, 160px) minmax(0, 1fr);
              gap: 14px;
              align-items: center;
            }
            .field-row-multiline {
              align-items: start;
            }
          }
        `}
      </style>

      <div className="mb-5 flex items-center gap-2 border-b border-slate-200 pb-3">
        <h3 className="text-[14px] font-extrabold uppercase tracking-[0.14em] text-slate-800">Thông tin lead</h3>
      </div>

      <SectionShell title="Thông tin liên hệ" className="mb-6 border-b border-slate-100 pb-6">
        <div className="grid grid-cols-1 gap-x-8 gap-y-4 xl:grid-cols-2">
          <FieldBlock label="Danh xưng / quan hệ">
            {selectField(
              leadFormData.title,
              LEAD_RELATION_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
              '-- Chọn --',
              (value) => onPatch({ title: value }),
            )}
          </FieldBlock>

          <FieldBlock label="Họ và tên" required>
            {textField(
              leadFormData.name,
              'Nhập họ và tên',
              (value) => onPatch({ name: value }),
              'text',
              'font-semibold',
              'font-semibold',
            )}
          </FieldBlock>

          <FieldBlock label="Số điện thoại" required>
            {textField(
              leadFormData.phone,
              'Nhập số điện thoại',
              (value) => onPatch({ phone: value }),
              'text',
              'font-semibold',
              'font-semibold',
            )}
          </FieldBlock>

          <FieldBlock label="Nguồn data">
            {selectField(
              leadFormData.source,
              LEAD_SOURCE_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
              '-- Chọn nguồn --',
              (value) => onPatch({ source: value }),
            )}
          </FieldBlock>

          <FieldBlock label="Email">
            {textField(
              leadFormData.email,
              'name@example.com',
              (value) => onPatch({ email: value }),
            )}
          </FieldBlock>
        </div>
      </SectionShell>

      <SectionShell title="Thông tin kinh doanh" className="mb-6 border-b border-slate-100 pb-6">
        <div className="grid grid-cols-1 gap-x-8 gap-y-4 xl:grid-cols-2">
          <FieldBlock label="Sản phẩm">
            {selectField(
              leadFormData.product,
              LEAD_PRODUCT_OPTIONS,
              '-- Chọn --',
              (value) => onPatch({ product: value }),
            )}
          </FieldBlock>

          <FieldBlock label="Cơ sở">
            {selectField(
              leadFormData.market,
              LEAD_CAMPUS_OPTIONS.map((option) => ({ value: option, label: option })),
              '-- Chọn --',
              (value) => onPatch({ market: value }),
            )}
          </FieldBlock>

          <FieldBlock label="Sale phụ trách">
            {selectField(
              leadFormData.salesperson,
              salesOptions,
              '-- Chọn sale --',
              (value) => onPatch({ salesperson: value }),
            )}
          </FieldBlock>

          <FieldBlock label="Trạng thái">
            {selectField(
              leadFormData.status,
              LEAD_STATUS_OPTIONS,
              '-- Chọn trạng thái --',
              (value) => onStatusChange(value),
            )}
          </FieldBlock>

          <FieldBlock label="Chiến dịch">
            {textField(
              leadFormData.campaign,
              'VD: Summer 2026',
              (value) => onPatch({ campaign: value }),
            )}
          </FieldBlock>

          <FieldBlock label="Kênh">
            {selectField(
              leadFormData.channel,
              LEAD_CHANNEL_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
              '-- Chọn kênh --',
              (value) => onPatch({ channel: value }),
            )}
          </FieldBlock>

          <FieldBlock label="Người giới thiệu" className="xl:col-span-2">
            {textField(
              leadFormData.referredBy,
              'VD: CTV A',
              (value) => onPatch({ referredBy: value }),
            )}
          </FieldBlock>
        </div>
      </SectionShell>

      <SectionShell title="Hồ sơ năng lực" className="mb-6 border-b border-slate-100 pb-6">
        <div className="grid grid-cols-1 gap-x-8 gap-y-4 xl:grid-cols-2">
          <FieldBlock label="Thị trường mục tiêu">
            {selectField(
              leadFormData.targetCountry,
              LEAD_TARGET_COUNTRY_OPTIONS.map((option) => ({ value: option, label: option })),
              '-- Chọn --',
              (value) => onPatch({ targetCountry: value }),
            )}
          </FieldBlock>

          <FieldBlock label="Trình độ học vấn" required>
            {selectField(
              leadFormData.studentEducationLevel,
              STUDENT_EDUCATION_LEVEL_OPTIONS.map((option) => ({ value: option, label: option })),
              '-- Chọn --',
              (value) => onPatch({ studentEducationLevel: value }),
            )}
          </FieldBlock>

          <FieldBlock label="Ngày sinh" requiredHint="Bắt buộc khi Qualified">
            {textField(
              leadFormData.studentDob,
              'dd/mm/yyyy',
              (value) => onPatch({ studentDob: value }),
              'date',
            )}
          </FieldBlock>

          <FieldBlock label="GPA / Điểm ngoại ngữ">
            {textField(
              leadFormData.studentLanguageLevel,
              'VD: GPA 7.5 - IELTS 6.0',
              (value) => onPatch({ studentLanguageLevel: value }),
            )}
          </FieldBlock>
        </div>
      </SectionShell>

      <SectionShell title="Ghi chú nội bộ" className="mb-6 border-b border-slate-100 pb-6">
        <div className="grid grid-cols-1 gap-x-8 gap-y-4 xl:grid-cols-2">
          <FieldBlock label="Mức độ tiềm năng">
            {selectField(
              leadFormData.potential,
              LEAD_POTENTIAL_OPTIONS,
              '-- Chọn --',
              (value) => onPatch({ potential: value }),
            )}
          </FieldBlock>

          <FieldBlock label="Thời gian dự kiến tham gia">
            {textField(
              leadFormData.expectedStart,
              'VD: 06/2026',
              (value) => onPatch({ expectedStart: value }),
            )}
          </FieldBlock>

          <FieldBlock label="Tài chính">
            {textField(
              leadFormData.financial,
              'Đủ / Thiếu / Cần hỗ trợ',
              (value) => onPatch({ financial: value }),
            )}
          </FieldBlock>

          <FieldBlock label="Ý kiến bố mẹ">
            {textField(
              leadFormData.parentOpinion,
              'Đồng ý / Cần cân nhắc...',
              (value) => onPatch({ parentOpinion: value }),
            )}
          </FieldBlock>

          <FieldBlock label="Ghi chú khác" className="xl:col-span-2" multiline>
            {textAreaField(
              leadFormData.notes,
              'Nhập ghi chú thêm...',
              (value) => onPatch({ notes: value }),
            )}
          </FieldBlock>
        </div>
      </SectionShell>

      <SectionShell
        title={
          <span className="inline-flex items-center gap-2 text-red-700">
            <ShieldCheck size={15} />
            Thông tin pháp lý
          </span>
        }
        className="mb-6 border-b border-red-100 pb-6"
        titleClassName="text-red-700"
      >
        <div className="grid grid-cols-1 gap-x-8 gap-y-4 xl:grid-cols-2">
          <FieldBlock label="Số CCCD / Hộ chiếu" required labelClassName="text-red-800">
            {textField(
              leadFormData.studentIdentityCard,
              'Số giấy tờ',
              (value) => onPatch({ studentIdentityCard: value }),
              'text',
              'border-red-200',
            )}
          </FieldBlock>

          <FieldBlock label="Ngày cấp" required labelClassName="text-red-800">
            {textField(
              leadFormData.identityDate,
              'dd/mm/yyyy',
              (value) => onPatch({ identityDate: value }),
              'date',
              'border-red-200',
            )}
          </FieldBlock>

          <FieldBlock label="Nơi cấp" required labelClassName="text-red-800">
            {textField(
              leadFormData.identityPlace,
              'Cục CS QLHC...',
              (value) => onPatch({ identityPlace: value }),
              'text',
              'border-red-200',
            )}
          </FieldBlock>

          <FieldBlock
            label="Địa chỉ thường trú (Full)"
            required
            className="xl:col-span-2"
            labelClassName="text-red-800"
          >
            {textField(
              leadFormData.street,
              'Số nhà, Đường, Phường/Xã, Quận/Huyện, Tỉnh/TP',
              (value) => onPatch({ street: value }),
              'text',
              'border-red-200',
            )}
          </FieldBlock>
        </div>
      </SectionShell>

      <SectionShell title="Thông tin hệ thống" className="mb-6 border-b border-slate-100 pb-6">
        <div className="grid grid-cols-1 gap-x-8 gap-y-4 xl:grid-cols-2">
          <FieldBlock label="Ngày tạo lead">
            {viewMode
              ? renderViewValue(leadFormData.createdAtDisplay, '-')
              : <input className="field-input bg-slate-50" readOnly disabled value={leadFormData.createdAtDisplay || '-'} />}
          </FieldBlock>

          <FieldBlock label="Ngày assign">
            {viewMode
              ? renderViewValue(leadFormData.assignedAtDisplay, '-')
              : <input className="field-input bg-slate-50" readOnly disabled value={leadFormData.assignedAtDisplay || '-'} />}
          </FieldBlock>

          <FieldBlock label="Tags (phân loại)" className="xl:col-span-2">
            {tagsField}
          </FieldBlock>
        </div>
      </SectionShell>

      {closeReasonOptions.length > 0 && (
        <SectionShell title="Lý do đóng lead" className="mb-6 border-b border-rose-100 pb-6" titleClassName="text-rose-700">
          <div className="grid grid-cols-1 gap-4">
            <FieldBlock label="Lý do đóng lead">
              {selectField(
                leadFormData.lossReason,
                closeReasonOptions.map((reason) => ({ value: reason, label: reason })),
                '-- Chọn lý do --',
                (value) => onPatch({ lossReason: value }),
              )}
            </FieldBlock>

            {leadFormData.lossReason === customCloseReason && (
              <FieldBlock label="Chi tiết" multiline>
                {textAreaField(
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
