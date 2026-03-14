import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  Check,
  Circle,
  ClipboardList,
  CreditCard,
  FileText,
  Globe,
  GraduationCap,
  Languages,
  Loader2,
  Mail,
  MapPin,
  Package,
  Pencil,
  Phone,
  Plane,
  Save,
  User,
  Wallet,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getStudyAbroadCaseList,
  StudyAbroadCaseCompleteness,
  StudyAbroadCaseRecord,
  StudyAbroadCmtcStatus,
  StudyAbroadEmbassyAppointmentStatus,
  StudyAbroadFlightStatus,
  StudyAbroadInvoiceStatus,
  StudyAbroadOfferLetterStatus,
  StudyAbroadProgramSelectionStatus,
  StudyAbroadSchoolInterviewStatus,
  StudyAbroadServiceStatus,
  StudyAbroadTranslationStatus,
  StudyAbroadVisaStatus,
  UpdateStudyAbroadCasePayload,
  updateStudyAbroadCase
} from '../services/studyAbroadCases.local';
import { decodeMojibakeReactNode, decodeMojibakeText } from '../utils/mojibake';

type EditFormState = UpdateStudyAbroadCasePayload;

type Option<T extends string> = {
  value: T;
  label: string;
};

type ProgressStep = {
  key: string;
  title: string;
  subtitle: string;
  date?: string;
  state: 'done' | 'active' | 'pending' | 'danger';
};

type StatusTimelineLog = {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  detail?: string;
  isPending?: boolean;
};

type ReadOnlyIcon = React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;

const text = (value: string) => decodeMojibakeText(value);

const inputClassName =
  'h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100';
const selectClassName =
  'h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100';
const textareaClassName =
  'min-h-[84px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100';
const labelClassName = 'mb-1.5 whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500';
const requiredMarkClassName = 'ml-1 text-rose-500';
const primaryButtonClassName =
  'inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60';
const secondaryButtonClassName =
  'inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50';
const sectionCardClassName = 'rounded-[24px] border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)]';

const PROGRAM_OPTIONS = [
  { value: text('Du há»c ÄH Äá»©c'), label: text('Du há»c ÄH Äá»©c') },
  { value: text('Du há»c nghá»'), label: text('Du há»c nghá»') },
  { value: '18B', label: '18B' }
] as const;

const PRODUCT_PACKAGE_OPTIONS = [
  { value: text('Combo du há»c Äá»©c'), label: text('Combo du há»c Äá»©c') },
  { value: text('Combo du há»c nghá»'), label: text('Combo du há»c nghá»') },
  { value: text('Du há»c nghá»'), label: text('Du há»c nghá»') }
] as const;

const SERVICE_STATUS_OPTIONS: Option<StudyAbroadServiceStatus>[] = [
  { value: 'NEW', label: 'Má»›i' },
  { value: 'UNPROCESSED', label: 'ChÆ°a xá»­ lÃ½' },
  { value: 'PROCESSED', label: 'ÄÃ£ xá»­ lÃ½' },
  { value: 'DEPARTED', label: 'ÄÃ£ bay' },
  { value: 'WITHDRAWN', label: 'ÄÃ£ rÃºt há»“ sÆ¡' },
  { value: 'VISA_FAILED', label: 'TrÆ°á»£t visa' },
  { value: 'REPROCESSING', label: 'Äang xá»­ lÃ½ láº¡i' }
];

const INVOICE_STATUS_OPTIONS: Option<StudyAbroadInvoiceStatus>[] = [
  { value: 'UNPAID', label: 'ChÆ°a ná»™p' },
  { value: 'HAS_INVOICE', label: 'CÃ³ invoice' },
  { value: 'PAID', label: 'ÄÃ£ ná»™p' }
];

const SCHOOL_INTERVIEW_STATUS_OPTIONS: Option<StudyAbroadSchoolInterviewStatus>[] = [
  { value: 'NO_SCHEDULE', label: 'ChÆ°a cÃ³ lá»‹ch' },
  { value: 'SCHEDULED', label: 'ÄÃ£ cÃ³ lá»‹ch' },
  { value: 'INTERVIEWED', label: 'ÄÃ£ phá»ng váº¥n' },
  { value: 'FAILED', label: 'TrÆ°á»£t' },
  { value: 'NOT_REQUIRED', label: 'KhÃ´ng cáº§n' }
];

const CMTC_STATUS_OPTIONS: Option<StudyAbroadCmtcStatus>[] = [
  { value: 'NOT_OPENED', label: 'ChÆ°a má»Ÿ tÃ i khoáº£n' },
  { value: 'OPENED', label: 'ÄÃ£ má»Ÿ tÃ i khoáº£n' },
  { value: 'SUBMITTED', label: 'ÄÃ£ ná»™p' }
];

const PROGRAM_SELECTION_OPTIONS: Option<StudyAbroadProgramSelectionStatus>[] = [
  { value: 'NOT_SELECTED', label: 'ChÆ°a chá»n' },
  { value: 'SELECTED', label: 'ÄÃ£ chá»n' }
];

const CASE_COMPLETENESS_OPTIONS: Option<StudyAbroadCaseCompleteness>[] = [
  { value: 'MISSING', label: 'ChÆ°a Ä‘á»§' },
  { value: 'FULL', label: 'ÄÃ£ Ä‘á»§' }
];

const TRANSLATION_STATUS_OPTIONS: Option<StudyAbroadTranslationStatus>[] = [
  { value: 'NOT_YET', label: 'ChÆ°a' },
  { value: 'DONE', label: 'CÃ³' }
];

const OFFER_LETTER_OPTIONS: Option<StudyAbroadOfferLetterStatus>[] = [
  { value: 'NOT_SENT', label: 'ChÆ°a gá»­i' },
  { value: 'SENT', label: 'ÄÃ£ gá»­i' },
  { value: 'RECEIVED', label: 'ÄÃ£ cÃ³' }
];

const EMBASSY_APPOINTMENT_OPTIONS: Option<StudyAbroadEmbassyAppointmentStatus>[] = [
  { value: 'NOT_BOOKED', label: 'ChÆ°a Ä‘áº·t' },
  { value: 'BOOKED', label: 'ÄÃ£ Ä‘áº·t lá»‹ch' },
  { value: 'SCHEDULED', label: 'ÄÃ£ cÃ³ lá»‹ch' },
  { value: 'CANCELLED', label: 'Há»§y lá»‹ch' }
];

const VISA_STATUS_OPTIONS: Option<StudyAbroadVisaStatus>[] = [
  { value: 'NOT_SUBMITTED', label: 'ChÆ°a ná»™p' },
  { value: 'SUBMITTED', label: 'ÄÃ£ ná»™p' },
  { value: 'SUPPLEMENT', label: 'Bá»• sung' },
  { value: 'GRANTED', label: 'Äá»— visa' },
  { value: 'FAILED', label: 'TrÆ°á»£t visa' }
];

const FLIGHT_STATUS_OPTIONS: Option<StudyAbroadFlightStatus>[] = [
  { value: 'NOT_DEPARTED', label: 'ChÆ°a bay' },
  { value: 'DEPARTED', label: 'ÄÃ£ bay' },
  { value: 'CANCELLED', label: 'Há»§y' }
];

const getOptionLabel = (options: readonly Option<string>[], value: string) =>
  text(options.find((option) => option.value === value)?.label || value || '-');

const getDisplayText = (value?: string | number | null, fallback = '') => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : fallback;
  return value.trim() ? value : fallback;
};

const formatDisplayDate = (value?: string | null, fallback = '') => {
  if (!value) return fallback;
  const parsedTime = Date.parse(value);
  if (Number.isNaN(parsedTime)) return value;
  return new Date(parsedTime).toLocaleDateString('vi-VN');
};

const formatDisplayNumber = (value?: number | null, fallback = '') => {
  if (value === null || value === undefined || Number.isNaN(value)) return fallback;
  return new Intl.NumberFormat('vi-VN').format(value);
};

const toInputDate = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const fromInputDate = (value?: string, fallback?: string) => {
  if (!value) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return fallback;
  const base = fallback ? new Date(fallback) : new Date();
  const safeBase = Number.isNaN(base.getTime()) ? new Date() : base;
  const next = new Date(safeBase);
  next.setFullYear(year, month - 1, day);
  next.setHours(12, 0, 0, 0);
  return next.toISOString();
};

const formatTimelineTimestamp = (timestamp?: string) => {
  const parsedTime = Date.parse(timestamp || '');
  if (Number.isNaN(parsedTime)) return text('Không xác định');
  return new Date(parsedTime).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
};

const buildPendingStatusLog = (
  currentCase: StudyAbroadCaseRecord | null,
  form: EditFormState | null,
  updatedBy: string
): StatusTimelineLog | null => {
  if (!currentCase || !form) return null;

  const changedFields: string[] = [];
  const pushChange = (label: string, currentValue: string, nextValue: string, options: readonly Option<string>[]) => {
    if (currentValue === nextValue) return;
    changedFields.push(`${label}: ${getOptionLabel(options, currentValue)} -> ${getOptionLabel(options, nextValue)}`);
  };

  pushChange('Trạng thái dịch vụ', currentCase.serviceStatus, form.serviceStatus, SERVICE_STATUS_OPTIONS);
  pushChange('Invoice', currentCase.invoiceStatus, form.invoiceStatus, INVOICE_STATUS_OPTIONS);
  pushChange('Phỏng vấn trường', currentCase.schoolInterviewStatus, form.schoolInterviewStatus, SCHOOL_INTERVIEW_STATUS_OPTIONS);
  pushChange('CMTC', currentCase.cmtc, form.cmtc, CMTC_STATUS_OPTIONS);
  pushChange('Chọn chương trình', currentCase.programSelectionStatus, form.programSelectionStatus, PROGRAM_SELECTION_OPTIONS);
  pushChange('Trạng thái hồ sơ', currentCase.caseCompleteness, form.caseCompleteness, CASE_COMPLETENESS_OPTIONS);
  pushChange('Dịch thuật công chứng', currentCase.translationStatus, form.translationStatus, TRANSLATION_STATUS_OPTIONS);
  pushChange('Xin thư mời', currentCase.offerLetterStatus, form.offerLetterStatus, OFFER_LETTER_OPTIONS);
  pushChange(
    'Lịch hẹn ĐSQ',
    currentCase.embassyAppointmentStatus,
    form.embassyAppointmentStatus,
    EMBASSY_APPOINTMENT_OPTIONS
  );
  pushChange('Visa', currentCase.visaStatus, form.visaStatus, VISA_STATUS_OPTIONS);
  pushChange('Bay', currentCase.flightStatus, form.flightStatus, FLIGHT_STATUS_OPTIONS);

  if (!changedFields.length) return null;

  return {
    id: 'pending-status-log',
    timestamp: new Date().toISOString(),
    user: updatedBy || 'System',
    action: 'Pending Study Abroad Status Update',
    detail: changedFields.join('\n'),
    isPending: true
  };
};

const getServiceStatusBadgeClass = (status: StudyAbroadServiceStatus) => {
  switch (status) {
    case 'DEPARTED':
      return 'border border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'PROCESSED':
      return 'border border-sky-200 bg-sky-50 text-sky-700';
    case 'REPROCESSING':
      return 'border border-amber-200 bg-amber-50 text-amber-700';
    case 'WITHDRAWN':
    case 'VISA_FAILED':
      return 'border border-rose-200 bg-rose-50 text-rose-700';
    case 'UNPROCESSED':
      return 'border border-slate-200 bg-slate-100 text-slate-700';
    default:
      return 'border border-slate-200 bg-slate-50 text-slate-700';
  }
};

const toEditForm = (row: StudyAbroadCaseRecord): EditFormState => ({
  student: row.student,
  address: row.address,
  phone: row.phone,
  email: row.email,
  dateOfBirth: row.dateOfBirth,
  identityCard: row.identityCard,
  passport: row.passport,
  demographicInfo: row.demographicInfo,
  country: row.country,
  program: row.program,
  productPackage: row.productPackage,
  major: row.major,
  salesperson: row.salesperson,
  branch: row.branch,
  processorName: row.processorName,
  intake: row.intake,
  intakeDate: row.intakeDate,
  intakeNote: row.intakeNote,
  stage: row.stage,
  caseCompleteness: row.caseCompleteness,
  caseCompletenessNote: row.caseCompletenessNote,
  certificate: row.certificate,
  serviceStatus: row.serviceStatus,
  serviceStatusNote: row.serviceStatusNote,
  tuition: row.tuition,
  invoiceStatus: row.invoiceStatus,
  invoiceNote: row.invoiceNote,
  cmtc: row.cmtc,
  cmtcAmount: row.cmtcAmount,
  cmtcNote: row.cmtcNote,
  schoolInterviewDate: row.schoolInterviewDate,
  schoolInterviewStatus: row.schoolInterviewStatus,
  schoolInterviewNote: row.schoolInterviewNote,
  programSelectionStatus: row.programSelectionStatus,
  schoolProgramName: row.schoolProgramName,
  schoolProgramNote: row.schoolProgramNote,
  translationStatus: row.translationStatus,
  translationNote: row.translationNote,
  offerLetterStatus: row.offerLetterStatus,
  offerLetterNote: row.offerLetterNote,
  embassyAppointmentStatus: row.embassyAppointmentStatus,
  embassyAppointmentDate: row.embassyAppointmentDate,
  embassyAppointmentNote: row.embassyAppointmentNote,
  visaStatus: row.visaStatus,
  visaNote: row.visaNote,
  flightStatus: row.flightStatus,
  expectedFlightTerm: row.expectedFlightTerm,
  expectedEntryDate: row.expectedEntryDate,
  flightNote: row.flightNote
});

const deriveStageFromForm = (form: EditFormState) => {
  if (form.flightStatus === 'DEPARTED') return text('ÄÃƒ BAY');
  if (form.visaStatus === 'GRANTED') return text('CÃ“ VISA');
  if (form.embassyAppointmentStatus === 'SCHEDULED') return text('ÄÃƒ CÃ“ Lá»ŠCH Háº¸N DSQ');
  if (form.offerLetterStatus === 'RECEIVED') return text('ÄÃƒ CÃ“ THÆ¯ Má»ŒI');
  if (form.schoolInterviewStatus === 'INTERVIEWED' || form.schoolInterviewStatus === 'PASSED') {
    return text('ÄÃƒ PHá»ŽNG Váº¤N TRÆ¯á»ŒNG/DN');
  }
  if (form.programSelectionStatus === 'SELECTED') return text('ÄÃƒ CHá»ŒN CHÆ¯Æ NG TRÃŒNH');
  return text('Há»’ SÆ  Má»šI');
};

const buildProgressSteps = (form: EditFormState): ProgressStep[] => [
  {
    key: 'program',
    title: 'Program selected',
    subtitle:
      form.programSelectionStatus === 'SELECTED'
        ? form.schoolProgramName || form.productPackage || text('ÄÃ£ chá»n chÆ°Æ¡ng trÃ¬nh')
        : text('ChÆ°a chá»n chÆ°Æ¡ng trÃ¬nh'),
    state: form.programSelectionStatus === 'SELECTED' ? 'done' : 'pending'
  },
  {
    key: 'interview',
    title: 'Interview progress',
    subtitle: getOptionLabel(SCHOOL_INTERVIEW_STATUS_OPTIONS, form.schoolInterviewStatus),
    date: form.schoolInterviewDate || undefined,
    state:
      form.schoolInterviewStatus === 'PASSED' || form.schoolInterviewStatus === 'INTERVIEWED'
        ? 'done'
        : form.schoolInterviewStatus === 'SCHEDULED'
          ? 'active'
          : form.schoolInterviewStatus === 'FAILED'
            ? 'danger'
            : 'pending'
  },
  {
    key: 'invoice',
    title: 'Invoice',
    subtitle: getOptionLabel(INVOICE_STATUS_OPTIONS, form.invoiceStatus),
    state: form.invoiceStatus === 'PAID' ? 'done' : form.invoiceStatus === 'HAS_INVOICE' ? 'active' : 'pending'
  },
  {
    key: 'offer',
    title: 'Offer letter',
    subtitle: getOptionLabel(OFFER_LETTER_OPTIONS, form.offerLetterStatus),
    state: form.offerLetterStatus === 'RECEIVED' ? 'done' : form.offerLetterStatus === 'SENT' ? 'active' : 'pending'
  },
  {
    key: 'embassy',
    title: 'Embassy appointment',
    subtitle: getOptionLabel(EMBASSY_APPOINTMENT_OPTIONS, form.embassyAppointmentStatus),
    date: form.embassyAppointmentDate || undefined,
    state:
      form.embassyAppointmentStatus === 'SCHEDULED'
        ? 'done'
        : form.embassyAppointmentStatus === 'BOOKED'
          ? 'active'
          : form.embassyAppointmentStatus === 'CANCELLED'
            ? 'danger'
            : 'pending'
  },
  {
    key: 'visa',
    title: 'Visa',
    subtitle: getOptionLabel(VISA_STATUS_OPTIONS, form.visaStatus),
    state:
      form.visaStatus === 'GRANTED'
        ? 'done'
        : form.visaStatus === 'FAILED'
          ? 'danger'
          : form.visaStatus === 'SUBMITTED' || form.visaStatus === 'SUPPLEMENT'
            ? 'active'
            : 'pending'
  },
  {
    key: 'flight',
    title: 'Departure',
    subtitle: getOptionLabel(FLIGHT_STATUS_OPTIONS, form.flightStatus),
    date: form.expectedEntryDate || form.expectedFlightTerm || undefined,
    state:
      form.flightStatus === 'DEPARTED'
        ? 'done'
        : form.flightStatus === 'CANCELLED'
          ? 'danger'
          : form.expectedEntryDate || form.expectedFlightTerm
            ? 'active'
            : 'pending'
  }
];

const FieldShell: React.FC<{
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}> = ({ label, required = false, className = '', children }) => (
  <div className={`block ${className}`}>
    <div className={labelClassName}>
      {label}
      {required ? <span className={requiredMarkClassName}>*</span> : null}
    </div>
    {children}
  </div>
);

const ReadOnlyValue: React.FC<{
  value?: React.ReactNode;
  multiline?: boolean;
  placeholder?: string;
  className?: string;
  icon?: ReadOnlyIcon;
}> = ({ value, multiline = false, placeholder = text('ChÆ°a cáº­p nháº­t'), className = '', icon: Icon }) => {
  const hasValue =
    value !== null &&
    value !== undefined &&
    (!(typeof value === 'string') || value.trim().length > 0);

  return (
    <div className={`flex items-start gap-3 ${className}`}>
      {Icon ? (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500">
          <Icon size={15} strokeWidth={1.9} />
        </div>
      ) : null}
      <div className={`min-w-0 ${multiline ? 'pt-0.5' : 'pt-0.5'}`}>
        {hasValue ? (
          <div className={`text-[13px] leading-5 text-slate-800 ${multiline ? 'whitespace-pre-line font-normal' : 'font-medium'}`}>
            {value}
          </div>
        ) : (
          <div className="text-[13px] italic leading-5 text-slate-400">{placeholder}</div>
        )}
      </div>
    </div>
  );
};

const ProgressItem: React.FC<{ step: ProgressStep }> = ({ step }) => {
  const markerClassName =
    step.state === 'done'
      ? 'border-emerald-200 bg-emerald-600 text-white'
      : step.state === 'active'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : step.state === 'danger'
          ? 'border-rose-200 bg-rose-50 text-rose-600'
          : 'border-slate-300 bg-white text-slate-300';

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${markerClassName}`}>
          {step.state === 'pending' ? <Circle size={9} fill="currentColor" strokeWidth={2.4} /> : <Check size={12} strokeWidth={2.8} />}
        </span>
        <span className="mt-1 h-full min-h-[28px] border-l border-slate-200" />
      </div>
      <div className="flex-1 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[15px] font-medium text-slate-900">{step.title}</div>
            <div className="mt-1 text-[14px] leading-6 text-slate-500">{step.subtitle}</div>
          </div>
          {step.date ? <div className="shrink-0 pt-0.5 text-[13px] font-medium text-slate-400">{step.date}</div> : null}
        </div>
      </div>
    </div>
  );
};

const viewCardClassName = 'overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_6px_18px_rgba(15,23,42,0.04)]';
const viewCardHeaderClassName = 'border-b border-slate-200 px-5 py-4';
const viewCardBodyClassName = 'px-5 py-4';
const viewCardTitleClassName = 'text-[15px] font-semibold tracking-[-0.01em] text-slate-950';
const viewCardDescriptionClassName = 'mt-1 text-[12px] leading-5 text-slate-500';

const ViewFieldItem: React.FC<{
  label: string;
  value: React.ReactNode;
  icon: ReadOnlyIcon;
  multiline?: boolean;
  placeholder?: string;
}> = ({ label, value, icon: Icon, multiline = false, placeholder = 'Chưa cập nhật' }) => {
  const hasValue =
    value !== null &&
    value !== undefined &&
    (!(typeof value === 'string') || value.trim().length > 0);

  return (
    <div className="flex items-start gap-2.5 rounded-2xl py-0.5">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500">
        <Icon size={15} strokeWidth={1.9} />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</div>
        {hasValue ? (
          <div className={`mt-0.5 text-[13px] leading-5 text-slate-900 ${multiline ? 'whitespace-pre-line font-normal' : 'font-medium'}`}>
            {value}
          </div>
        ) : (
          <div className="mt-0.5 text-[13px] italic leading-5 text-slate-400">{placeholder}</div>
        )}
      </div>
    </div>
  );
};

const ViewStatItem: React.FC<{
  label: string;
  value: React.ReactNode;
  icon: ReadOnlyIcon;
  placeholder?: string;
}> = ({ label, value, icon: Icon, placeholder = 'Chưa cập nhật' }) => {
  const hasValue =
    value !== null &&
    value !== undefined &&
    (!(typeof value === 'string') || value.trim().length > 0);

  return (
    <div className="rounded-[18px] border border-slate-200 bg-white px-3.5 py-3">
      <div className="flex items-start gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500">
          <Icon size={15} strokeWidth={1.9} />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</div>
          {hasValue ? (
            <div className="mt-0.5 text-[13px] font-medium leading-5 text-slate-900">{value}</div>
          ) : (
            <div className="mt-0.5 text-[13px] italic leading-5 text-slate-400">{placeholder}</div>
          )}
        </div>
      </div>
    </div>
  );
};

const ViewStatusMarker: React.FC<{ state: 'done' | 'pending' | 'danger' }> = ({ state }) => {
  if (state === 'done') {
    return (
      <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#0f8a72] text-white">
        <Check size={11} strokeWidth={3} />
      </span>
    );
  }

  if (state === 'danger') {
    return <span className="h-4.5 w-4.5 rounded-full border-2 border-rose-300 bg-white" />;
  }

  return <span className="h-4.5 w-4.5 rounded-full border-2 border-slate-300 bg-white" />;
};

const ViewStatusRow: React.FC<{
  label: string;
  value: string;
  state: 'done' | 'pending' | 'danger';
}> = ({ label, value, state }) => (
  <div className="flex items-start gap-2.5 rounded-[18px] border border-slate-200 bg-white px-3.5 py-3">
    <div className="pt-0.5">
      <ViewStatusMarker state={state} />
    </div>
    <div className="min-w-0 flex-1">
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</div>
      <div className={`mt-0.5 text-[13px] leading-5 ${state === 'done' ? 'font-medium text-slate-900' : state === 'danger' ? 'font-medium text-rose-600' : 'font-medium text-slate-700'}`}>
        {value}
      </div>
    </div>
  </div>
);

const ViewProgressTimelineItem: React.FC<{
  title: string;
  subtitle: string;
  date?: string;
  state: ProgressStep['state'];
  isLast: boolean;
}> = ({ title, subtitle, date, state, isLast }) => {
  const markerClassName =
    state === 'done'
      ? 'border-[#0f8a72] bg-[#0f8a72] text-white'
      : state === 'active'
        ? 'border-[#7fd3c2] bg-[#e8f8f4] text-[#0f8a72]'
        : state === 'danger'
          ? 'border-rose-200 bg-rose-50 text-rose-600'
          : 'border-slate-300 bg-white text-slate-300';

  return (
    <div className="relative flex gap-3">
      <div className="flex w-5 shrink-0 flex-col items-center">
        <span className={`relative z-10 flex h-5 w-5 items-center justify-center rounded-full border ${markerClassName}`}>
          {state === 'pending' ? <Circle size={9} fill="currentColor" strokeWidth={2.4} /> : <Check size={11} strokeWidth={2.8} />}
        </span>
        {!isLast ? <span className="mt-1 h-full min-h-[28px] border-l border-slate-200" /> : null}
      </div>
      <div className="flex-1 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[14px] font-semibold text-slate-900">{title}</div>
            <div className="mt-0.5 text-[12px] leading-5 text-slate-500">{subtitle}</div>
          </div>
          {date ? <div className="shrink-0 text-[12px] font-medium text-slate-400">{date}</div> : null}
        </div>
      </div>
    </div>
  );
};

const ViewTimelineItem: React.FC<{
  time: string;
  title: string;
  subtitle?: string;
  isLast: boolean;
  pending?: boolean;
}> = ({ time, title, subtitle, isLast, pending = false }) => (
  <div className="relative flex gap-3">
    <div className="flex w-5 shrink-0 flex-col items-center">
      <span
        className={`relative z-10 flex h-5 w-5 items-center justify-center rounded-full border ${
          pending ? 'border-slate-300 bg-white text-slate-400' : 'border-[#7fd3c2] bg-[#e8f8f4] text-[#0f8a72]'
        }`}
      >
        {pending ? <Circle size={9} fill="currentColor" strokeWidth={2.4} /> : <Check size={11} strokeWidth={2.8} />}
      </span>
      {!isLast ? <span className="mt-1 h-full min-h-[28px] border-l border-slate-200" /> : null}
    </div>
    <div className="flex-1 pb-4">
      <div className="text-[12px] font-medium text-slate-400">{time}</div>
      <div className="mt-0.5 text-[13px] leading-5 text-slate-900">{title}</div>
      {subtitle ? <div className="mt-0.5 text-[12px] leading-5 text-slate-500">{subtitle}</div> : null}
    </div>
  </div>
);

const StudyAbroadCaseDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [row, setRow] = useState<StudyAbroadCaseRecord | null>(null);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [saveNotice, setSaveNotice] = useState('');

  const reloadCase = useCallback(() => {
    if (!id) {
      setRow(null);
      setEditForm(null);
      setLoading(false);
      return;
    }

    const found = getStudyAbroadCaseList().find((item) => item.id === id) || null;
    setRow(found);
    setEditForm(found ? toEditForm(found) : null);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    reloadCase();
  }, [reloadCase]);

  useEffect(() => {
    const handleStorage = () => reloadCase();
    const events = [
      'educrm_cases_updated',
      'educrm:study-abroad-cases-changed',
      'educrm:quotations-changed',
      'educrm:leads-changed',
      'educrm:students-changed',
      'educrm:admissions-changed'
    ];

    window.addEventListener('storage', handleStorage);
    events.forEach((eventName) => window.addEventListener(eventName, handleStorage));

    return () => {
      window.removeEventListener('storage', handleStorage);
      events.forEach((eventName) => window.removeEventListener(eventName, handleStorage));
    };
  }, [reloadCase]);

  const updateEditForm = <K extends keyof EditFormState>(key: K, value: EditFormState[K]) => {
    setEditForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSave = () => {
    if (!id || !editForm) return;

    setSaving(true);
    setSaveNotice('');
    const payload: UpdateStudyAbroadCasePayload = {
      ...editForm,
      stage: deriveStageFromForm(editForm)
    };
    const ok = updateStudyAbroadCase(id, payload, user?.name || 'Study Abroad', row);
    setSaving(false);

    if (!ok) {
      window.alert(text('KhÃ´ng thá»ƒ cáº­p nháº­t há»“ sÆ¡. Vui lÃ²ng thá»­ láº¡i.'));
      return;
    }

    setSaveNotice(text('ÄÃ£ lÆ°u thay Ä‘á»•i há»“ sÆ¡.'));
    setIsEditing(false);
    reloadCase();
  };

  const handleCancelEdit = () => {
    setSaveNotice('');
    setEditForm(row ? toEditForm(row) : null);
    setIsEditing(false);
  };

  const progressSteps = useMemo(() => (row ? buildProgressSteps(toEditForm(row)) : []), [row]);
  const pendingStatusLog = useMemo(
    () => buildPendingStatusLog(row, editForm, user?.name || 'Study Abroad'),
    [editForm, row, user?.name]
  );
  const statusLogs = useMemo(
    () =>
      [...(pendingStatusLog ? [pendingStatusLog] : []), ...(row?.logNotes || [])]
        .filter(
          (item) =>
            item.action === 'Pending Study Abroad Status Update' ||
            item.action === 'Study Abroad Status Update' ||
            item.action === 'Update Study Abroad Case' ||
            (item.detail || '').includes('->')
        )
        .sort((a, b) => {
          const timeA = Date.parse(a.timestamp || '');
          const timeB = Date.parse(b.timestamp || '');
          return (Number.isNaN(timeB) ? 0 : timeB) - (Number.isNaN(timeA) ? 0 : timeA);
        }),
    [pendingStatusLog, row?.logNotes]
  );
  const statusTimelineGroups = useMemo(() => {
    const groups: Array<{
      date: string;
      items: Array<{ id: string; user: string; change: string; isPending?: boolean }>;
    }> = [];

    statusLogs.forEach((log, logIndex) => {
      const rawLines = (log.detail || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      const lines = rawLines.length ? rawLines.map((line) => text(line)) : [text(log.action || 'Cập nhật trạng thái')];
      const normalizedUser = text(log.user || 'System');
      const dateKey = formatTimelineTimestamp(log.timestamp);

      let group = groups.find((item) => item.date === dateKey);
      if (!group) {
        group = { date: dateKey, items: [] };
        groups.push(group);
      }

        lines.forEach((line, lineIndex) => {
          group?.items.push({
            id: `${log.id || `status-log-${logIndex}`}-${lineIndex}`,
            user: normalizedUser,
            change: line,
            isPending: log.isPending
          });
        });
      });

    return groups;
  }, [statusLogs]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#eef4ff] via-[#f8fbff] to-[#edf2ff]">
        <div className="inline-flex items-center gap-2 text-slate-600">
          <Loader2 size={16} className="animate-spin" />
          {text('Äang táº£i há»“ sÆ¡...')}
        </div>
      </div>
    );
  }

  if (!row || !editForm) {
    return (
      <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#eef4ff] via-[#f8fbff] to-[#edf2ff] p-4">
        <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">{text('KhÃ´ng tÃ¬m tháº¥y há»“ sÆ¡')}</h2>
          <p className="mt-2 text-sm text-slate-500">{text('Há»“ sÆ¡ cÃ³ thá»ƒ Ä‘Ã£ bá»‹ xÃ³a hoáº·c chÆ°a Ä‘á»“ng bá»™ dá»¯ liá»‡u.')}</p>
          <button onClick={() => navigate('/study-abroad/cases')} className={`${primaryButtonClassName} mt-4`}>
            {text('Quay láº¡i danh sÃ¡ch')}
          </button>
        </div>
      </div>
    );
  }

  const actionStatusLabel = getOptionLabel(SERVICE_STATUS_OPTIONS, editForm.serviceStatus);
  const studentInfoItems = [
    { label: 'Họ tên', value: getDisplayText(editForm.student), icon: User },
    { label: 'SĐT', value: getDisplayText(editForm.phone), icon: Phone },
    { label: 'Email', value: getDisplayText(editForm.email), icon: Mail },
    { label: 'Địa chỉ', value: getDisplayText(editForm.address), icon: MapPin },
    { label: 'Ngày sinh (nếu cần visa)', value: formatDisplayDate(editForm.dateOfBirth), icon: Calendar },
    { label: 'CCCD', value: getDisplayText(editForm.identityCard), icon: CreditCard },
    { label: 'Passport', value: getDisplayText(editForm.passport), icon: FileText },
    { label: 'Chương trình', value: getDisplayText(editForm.program), icon: GraduationCap },
    { label: 'Gói sản phẩm', value: getDisplayText(editForm.productPackage), icon: Package },
    { label: 'Salesperson', value: getDisplayText(editForm.salesperson), icon: Briefcase },
    { label: 'Chi nhánh', value: getDisplayText(editForm.branch), icon: Building2 },
    { label: 'Người xử lý hồ sơ', value: getDisplayText(editForm.processorName), icon: User }
  ] as const;

  const schoolInfoItems = [
    { label: 'Kỳ nhập học', value: formatDisplayDate(editForm.intakeDate || editForm.intake), icon: Calendar },
    { label: 'Invoice', value: getOptionLabel(INVOICE_STATUS_OPTIONS, editForm.invoiceStatus), icon: FileText },
    { label: 'Phỏng vấn trường', value: getOptionLabel(SCHOOL_INTERVIEW_STATUS_OPTIONS, editForm.schoolInterviewStatus), icon: User },
    { label: 'Ngày phỏng vấn trường', value: formatDisplayDate(editForm.schoolInterviewDate), icon: Calendar },
    { label: 'CMTC', value: formatDisplayNumber(editForm.cmtcAmount), icon: Wallet },
    { label: 'Trạng thái CMTC', value: getOptionLabel(CMTC_STATUS_OPTIONS, editForm.cmtc), icon: ClipboardList },
    { label: 'Chọn ngành / chương trình', value: getOptionLabel(PROGRAM_SELECTION_OPTIONS, editForm.programSelectionStatus), icon: Globe },
    { label: 'Tên chương trình', value: getDisplayText(editForm.schoolProgramName), icon: GraduationCap }
  ] as const;

  const progressTitleMap: Record<string, string> = {
    'Program selected': 'Đã chọn chương trình',
    'Interview progress': 'Phỏng vấn trường',
    Invoice: 'Invoice',
    'Offer letter': 'Thư mời',
    'Embassy appointment': 'Lịch hẹn ĐSQ',
    Visa: 'Visa',
    Departure: 'Xuất cảnh'
  };

  const viewProgressSteps = progressSteps.map((step) => ({
    ...step,
    title: progressTitleMap[step.title] || step.title,
    date: step.date ? formatDisplayDate(step.date, step.date) : undefined
  }));

  const statusItems: Array<{ label: string; value: string; state: 'done' | 'pending' | 'danger' }> = [
    {
      label: 'Trạng thái hồ sơ',
      value: getOptionLabel(CASE_COMPLETENESS_OPTIONS, editForm.caseCompleteness),
      state: editForm.caseCompleteness === 'FULL' ? 'done' : 'pending'
    },
    {
      label: 'Dịch thuật công chứng',
      value: getOptionLabel(TRANSLATION_STATUS_OPTIONS, editForm.translationStatus),
      state: editForm.translationStatus === 'DONE' ? 'done' : 'pending'
    },
    {
      label: 'Xin thư mời',
      value: getOptionLabel(OFFER_LETTER_OPTIONS, editForm.offerLetterStatus),
      state: editForm.offerLetterStatus === 'RECEIVED' || editForm.offerLetterStatus === 'SENT' ? 'done' : 'pending'
    },
    {
      label: 'Lịch hẹn ĐSQ',
      value: getOptionLabel(EMBASSY_APPOINTMENT_OPTIONS, editForm.embassyAppointmentStatus),
      state:
        editForm.embassyAppointmentStatus === 'CANCELLED'
          ? 'danger'
          : editForm.embassyAppointmentStatus === 'BOOKED' || editForm.embassyAppointmentStatus === 'SCHEDULED'
            ? 'done'
            : 'pending'
    },
    {
      label: 'Visa',
      value: getOptionLabel(VISA_STATUS_OPTIONS, editForm.visaStatus),
      state: editForm.visaStatus === 'FAILED' ? 'danger' : editForm.visaStatus === 'GRANTED' ? 'done' : 'pending'
    },
    {
      label: 'Xuất cảnh',
      value: getOptionLabel(FLIGHT_STATUS_OPTIONS, editForm.flightStatus),
      state: editForm.flightStatus === 'CANCELLED' ? 'danger' : editForm.flightStatus === 'DEPARTED' ? 'done' : 'pending'
    },
    {
      label: 'Ngày nhập cảnh dự kiến',
      value: formatDisplayDate(editForm.expectedEntryDate, editForm.expectedFlightTerm || ''),
      state: getDisplayText(editForm.expectedEntryDate || editForm.expectedFlightTerm) ? 'done' : 'pending'
    }
  ];

  const quickTimelineItems = statusLogs
    .flatMap((log, logIndex) => {
      const lines = (log.detail || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      const content = lines.length ? lines : [text(log.action || 'Cập nhật hồ sơ')];
      const time = formatTimelineTimestamp(log.timestamp);
      const subtitle = text(log.user || 'System');

      return content.map((line, lineIndex) => ({
        id: `${log.id || `timeline-${logIndex}`}-${lineIndex}`,
        time,
        title: text(line),
        subtitle,
        pending: log.isPending
      }));
    })
    .slice(0, 8);

  const timelineFeed =
    quickTimelineItems.length > 0
      ? quickTimelineItems
      : [
          {
            id: 'timeline-empty',
            time: formatTimelineTimestamp(row.updatedAt || row.createdAt),
            title: `Hồ sơ ${row.soCode} hiện ở trạng thái ${actionStatusLabel}`,
            subtitle: 'Chưa có lịch sử cập nhật trạng thái được ghi nhận.',
            pending: false
          }
        ];

  if (!isEditing) {
    return decodeMojibakeReactNode(
      <div className="min-h-screen overflow-y-auto bg-[#f4f7f5] text-slate-900">
        <div className="mx-auto w-full max-w-[1450px] p-4 lg:p-5">
          <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.05)]">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-5 py-5 lg:px-6">
              <div className="flex min-w-0 items-center gap-3.5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600">
                  <GraduationCap size={24} strokeWidth={1.9} />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-slate-950 lg:text-[25px]">
                      {editForm.student}
                    </h1>
                    <span className="inline-flex rounded-full bg-[#0f8a72] px-2.5 py-1 text-[12px] font-semibold text-white">
                      {actionStatusLabel}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[13px] text-slate-500">
                    Hồ sơ {row.soCode} • Tiến độ hồ sơ lấy từ dữ liệu đã lưu.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => navigate('/study-abroad/cases')}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Quay lại
                </button>
                <button
                  onClick={() => {
                    setSaveNotice('');
                    setIsEditing(true);
                  }}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <Pencil size={15} strokeWidth={1.9} />
                  Chỉnh sửa
                </button>
              </div>
            </div>

            {saveNotice ? (
              <div className="border-b border-emerald-100 bg-emerald-50 px-6 py-2.5 text-[13px] font-medium text-emerald-700">
                {saveNotice}
              </div>
            ) : null}

            <div className="grid gap-5 p-4 lg:p-5 xl:grid-cols-[300px_minmax(0,1fr)_320px]">
              <div className="space-y-5">
                <section className={viewCardClassName}>
                  <div className={viewCardHeaderClassName}>
                    <div className={viewCardTitleClassName}>Thông tin học sinh</div>
                    <div className={viewCardDescriptionClassName}>
                      Thông tin liên hệ, giấy tờ và người phụ trách hồ sơ.
                    </div>
                  </div>
                  <div className={`${viewCardBodyClassName} space-y-3`}>
                    {studentInfoItems.map((item) => (
                      <ViewFieldItem key={item.label} label={item.label} value={item.value} icon={item.icon} />
                    ))}
                  </div>
                </section>
              </div>

              <div className="space-y-5">
                <section className={viewCardClassName}>
                  <div className={viewCardHeaderClassName}>
                    <div className={viewCardTitleClassName}>Thông tin trường</div>
                    <div className={viewCardDescriptionClassName}>
                      Kỳ nhập học, invoice, phỏng vấn trường, CMTC và chọn chương trình.
                    </div>
                  </div>
                  <div className={`${viewCardBodyClassName} grid gap-3 md:grid-cols-2`}>
                    {schoolInfoItems.map((item) => (
                      <ViewStatItem key={item.label} label={item.label} value={item.value} icon={item.icon} />
                    ))}
                  </div>
                </section>

                <section className={viewCardClassName}>
                  <div className={viewCardHeaderClassName}>
                    <div className={viewCardTitleClassName}>Tiến độ hồ sơ</div>
                    <div className={viewCardDescriptionClassName}>
                      Danh sách các mốc xử lý chính được tổng hợp từ dữ liệu hiện có.
                    </div>
                  </div>
                  <div className={viewCardBodyClassName}>
                    {viewProgressSteps.map((step, index) => (
                      <ViewProgressTimelineItem
                        key={step.key}
                        title={step.title}
                        subtitle={step.subtitle}
                        date={step.date}
                        state={step.state}
                        isLast={index === viewProgressSteps.length - 1}
                      />
                    ))}
                  </div>
                </section>
              </div>

              <div className="space-y-5">
                <section className={viewCardClassName}>
                  <div className={viewCardHeaderClassName}>
                    <div className={viewCardTitleClassName}>Trạng thái hồ sơ</div>
                    <div className={viewCardDescriptionClassName}>
                      Theo dõi các đầu việc chính của hồ sơ theo trạng thái hiện tại.
                    </div>
                  </div>
                  <div className={`${viewCardBodyClassName} space-y-2.5`}>
                    {statusItems.map((item) => (
                      <ViewStatusRow key={item.label} label={item.label} value={item.value} state={item.state} />
                    ))}

                    <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-3.5 py-3.5">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                        Ghi chú trạng thái hồ sơ
                      </div>
                      <div className="mt-1.5 text-[12px] leading-5 text-slate-600">
                        {getDisplayText(editForm.caseCompletenessNote, 'Chưa cập nhật')}
                      </div>
                    </div>
                  </div>
                </section>

                <section className={viewCardClassName}>
                  <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-5">
                    <div>
                      <div className={viewCardTitleClassName}>Quick Timeline</div>
                      <div className={viewCardDescriptionClassName}>
                        Lịch sử cập nhật nhanh của hồ sơ và các thay đổi trạng thái gần nhất.
                      </div>
                    </div>
                  </div>
                  <div className={viewCardBodyClassName}>
                    {timelineFeed.map((item, index) => (
                      <ViewTimelineItem
                        key={item.id}
                        time={item.time}
                        title={item.title}
                        subtitle={item.subtitle}
                        pending={item.pending}
                        isLast={index === timelineFeed.length - 1}
                      />
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return decodeMojibakeReactNode(
    <div className="min-h-screen overflow-y-auto bg-gradient-to-br from-[#eef4ff] via-[#f8fbff] to-[#edf2ff] text-slate-900">
      <div className="mx-auto w-full max-w-[1480px] p-4 lg:p-6">
        <div className={`${sectionCardClassName} overflow-hidden`}>
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600">
                <GraduationCap size={26} strokeWidth={1.9} />
              </div>
              <div className="min-w-0">
                <button
                  onClick={() => navigate('/study-abroad/cases')}
                  className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"
                >
                  <ArrowLeft size={15} />
                  Danh sÃ¡ch há»“ sÆ¡
                </button>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.02em] text-slate-950 lg:text-[32px]">
                    {editForm.student}
                  </h1>
                  <span
                    className={`inline-flex rounded-xl px-3 py-1 text-sm font-medium ${getServiceStatusBadgeClass(
                      editForm.serviceStatus
                    )}`}
                  >
                    {getOptionLabel(SERVICE_STATUS_OPTIONS, editForm.serviceStatus)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  Há»“ sÆ¡ {row.soCode} â€¢ Application progress láº¥y tá»« dá»¯ liá»‡u Ä‘Ã£ lÆ°u.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isEditing ? (
                <button onClick={handleCancelEdit} className={secondaryButtonClassName}>
                  Há»§y chá»‰nh sá»­a
                </button>
              ) : (
                <button onClick={() => navigate('/study-abroad/cases')} className={secondaryButtonClassName}>
                  Quay láº¡i
                </button>
              )}
              {isEditing ? (
                <button onClick={handleSave} disabled={saving} className={primaryButtonClassName}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {saving ? 'Äang lÆ°u...' : 'LÆ°u thay Ä‘á»•i'}
                </button>
              ) : (
                <button
                  onClick={() => {
                    setSaveNotice('');
                    setIsEditing(true);
                  }}
                  className={primaryButtonClassName}
                >
                  <Pencil size={16} />
                  Chỉnh sửa
                </button>
              )}
            </div>
          </div>

          {saveNotice ? (
            <div className="border-b border-emerald-100 bg-emerald-50 px-6 py-3 text-sm font-medium text-emerald-700">
              {saveNotice}
            </div>
          ) : null}

          <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.55fr)_minmax(0,1fr)]">
            <div className="space-y-4">
              <section className={sectionCardClassName}>
                <div className="border-b border-slate-200 px-5 py-4">
                  <div className="text-[18px] font-medium tracking-[-0.01em] text-slate-950">ThÃ´ng tin chung</div>
                  <div className="mt-1 text-[13px] leading-5 text-slate-500">
                    NhÃ¢n kháº©u há»c, chÆ°Æ¡ng trÃ¬nh, gÃ³i sáº£n pháº©m, sale, chi nhÃ¡nh vÃ  ngÆ°á»i xá»­ lÃ½ há»“ sÆ¡.
                  </div>
                </div>
                <div className="p-5">
                  <fieldset disabled={!isEditing || saving}>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
                      <div className="space-y-4 md:col-span-2 lg:col-span-1">
                        <div className={labelClassName}>Nhân khẩu học</div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <FieldShell label="Họ tên">
                            {isEditing ? (
                              <input
                                value={editForm.student}
                                onChange={(event) => updateEditForm('student', event.target.value)}
                                className={inputClassName}
                              />
                            ) : (
                              <ReadOnlyValue value={getDisplayText(editForm.student)} icon={User} />
                            )}
                          </FieldShell>
                          <FieldShell label="SĐT">
                            {isEditing ? (
                              <input
                                value={editForm.phone}
                                onChange={(event) => updateEditForm('phone', event.target.value)}
                                className={inputClassName}
                              />
                            ) : (
                              <ReadOnlyValue value={getDisplayText(editForm.phone)} icon={Phone} />
                            )}
                          </FieldShell>
                          <FieldShell label="Email">
                            {isEditing ? (
                              <input
                                type="email"
                                value={editForm.email}
                                onChange={(event) => updateEditForm('email', event.target.value)}
                                className={inputClassName}
                              />
                            ) : (
                              <ReadOnlyValue value={getDisplayText(editForm.email)} icon={Mail} />
                            )}
                          </FieldShell>
                          <FieldShell label="Ngày sinh (nếu cần visa)">
                            {isEditing ? (
                              <input
                                type="date"
                                value={toInputDate(editForm.dateOfBirth)}
                                onChange={(event) =>
                                  updateEditForm('dateOfBirth', fromInputDate(event.target.value, editForm.dateOfBirth) || '')
                                }
                                className={inputClassName}
                              />
                            ) : (
                              <ReadOnlyValue value={formatDisplayDate(editForm.dateOfBirth)} icon={Calendar} />
                            )}
                          </FieldShell>
                          <FieldShell label="Địa chỉ" className="md:col-span-2">
                            {isEditing ? (
                              <input
                                value={editForm.address}
                                onChange={(event) => updateEditForm('address', event.target.value)}
                                className={inputClassName}
                              />
                            ) : (
                              <ReadOnlyValue value={getDisplayText(editForm.address)} icon={MapPin} />
                            )}
                          </FieldShell>
                          <FieldShell label="CCCD">
                            {isEditing ? (
                              <input
                                value={editForm.identityCard}
                                onChange={(event) => updateEditForm('identityCard', event.target.value)}
                                className={inputClassName}
                              />
                            ) : (
                              <ReadOnlyValue value={getDisplayText(editForm.identityCard)} icon={CreditCard} />
                            )}
                          </FieldShell>
                          <FieldShell label="Passport">
                            {isEditing ? (
                              <input
                                value={editForm.passport}
                                onChange={(event) => updateEditForm('passport', event.target.value)}
                                className={inputClassName}
                              />
                            ) : (
                              <ReadOnlyValue value={getDisplayText(editForm.passport)} icon={FileText} />
                            )}
                          </FieldShell>
                        </div>
                      </div>
                      <FieldShell label="ChÆ°Æ¡ng trÃ¬nh" required>
                        {isEditing ? (
                          <select
                            value={editForm.program}
                            onChange={(event) => updateEditForm('program', event.target.value)}
                            className={selectClassName}
                          >
                            {PROGRAM_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <ReadOnlyValue value={getDisplayText(editForm.program)} icon={GraduationCap} />
                        )}
                      </FieldShell>
                      <FieldShell label="GÃ³i sáº£n pháº©m">
                        {isEditing ? (
                          <select
                            value={editForm.productPackage}
                            onChange={(event) => updateEditForm('productPackage', event.target.value)}
                            className={selectClassName}
                          >
                            <option value="">Chá»n gÃ³i sáº£n pháº©m</option>
                            {PRODUCT_PACKAGE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <ReadOnlyValue value={getDisplayText(editForm.productPackage)} icon={Package} />
                        )}
                      </FieldShell>
                      <FieldShell label="Salesperson" required>
                        {isEditing ? (
                          <input
                            value={editForm.salesperson}
                            onChange={(event) => updateEditForm('salesperson', event.target.value)}
                            className={inputClassName}
                          />
                        ) : (
                          <ReadOnlyValue value={getDisplayText(editForm.salesperson)} icon={Briefcase} />
                        )}
                      </FieldShell>
                      <FieldShell label="Chi nhÃ¡nh">
                        {isEditing ? (
                          <input
                            value={editForm.branch}
                            onChange={(event) => updateEditForm('branch', event.target.value)}
                            className={inputClassName}
                          />
                        ) : (
                          <ReadOnlyValue value={getDisplayText(editForm.branch)} icon={Building2} />
                        )}
                      </FieldShell>
                      <FieldShell label="NgÆ°á»i xá»­ lÃ½ há»“ sÆ¡">
                        {isEditing ? (
                          <input
                            value={editForm.processorName}
                            onChange={(event) => updateEditForm('processorName', event.target.value)}
                            className={inputClassName}
                          />
                        ) : (
                          <ReadOnlyValue value={getDisplayText(editForm.processorName)} icon={User} />
                        )}
                      </FieldShell>
                    </div>
                  </fieldset>
                </div>
              </section>
            </div>

            <div className="space-y-4">
              <section className={sectionCardClassName}>
                <div className="border-b border-slate-200 px-5 py-4">
                  <div className="text-[18px] font-medium tracking-[-0.01em] text-slate-950">ThÃ´ng tin trÆ°á»ng</div>
                  <div className="mt-1 text-[13px] leading-5 text-slate-500">Ká»³ nháº­p há»c, invoice, phá»ng váº¥n trÆ°á»ng, CMTC vÃ  chá»n chÆ°Æ¡ng trÃ¬nh.</div>
                </div>
                <div className="p-5">
                  <fieldset disabled={!isEditing || saving}>
                    <div className="grid gap-4 md:grid-cols-2">
                      <FieldShell label="Ká»³ nháº­p há»c">
                        {isEditing ? (
                          <input
                            type="date"
                            value={editForm.intakeDate}
                            onChange={(event) => {
                              updateEditForm('intakeDate', event.target.value);
                              updateEditForm('intake', event.target.value);
                            }}
                            className={inputClassName}
                          />
                        ) : (
                          <ReadOnlyValue value={formatDisplayDate(editForm.intakeDate || editForm.intake)} icon={Calendar} />
                        )}
                      </FieldShell>
                      <FieldShell label="Invoice">
                        {isEditing ? (
                          <select
                            value={editForm.invoiceStatus}
                            onChange={(event) => updateEditForm('invoiceStatus', event.target.value as StudyAbroadInvoiceStatus)}
                            className={selectClassName}
                          >
                            {INVOICE_STATUS_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <ReadOnlyValue value={getOptionLabel(INVOICE_STATUS_OPTIONS, editForm.invoiceStatus)} icon={FileText} />
                        )}
                      </FieldShell>
                      <FieldShell label="Phá»ng váº¥n trÆ°á»ng">
                        {isEditing ? (
                          <select
                            value={editForm.schoolInterviewStatus}
                            onChange={(event) =>
                              updateEditForm('schoolInterviewStatus', event.target.value as StudyAbroadSchoolInterviewStatus)
                            }
                            className={selectClassName}
                          >
                            {SCHOOL_INTERVIEW_STATUS_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <ReadOnlyValue value={getOptionLabel(SCHOOL_INTERVIEW_STATUS_OPTIONS, editForm.schoolInterviewStatus)} icon={User} />
                        )}
                      </FieldShell>
                      <FieldShell label="NgÃ y phá»ng váº¥n trÆ°á»ng">
                        {isEditing ? (
                          <input
                            type="date"
                            value={editForm.schoolInterviewDate}
                            onChange={(event) => updateEditForm('schoolInterviewDate', event.target.value)}
                            className={inputClassName}
                          />
                        ) : (
                          <ReadOnlyValue value={formatDisplayDate(editForm.schoolInterviewDate)} icon={Calendar} />
                        )}
                      </FieldShell>
                      <FieldShell label="CMTC">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editForm.cmtcAmount}
                            onChange={(event) => updateEditForm('cmtcAmount', Number(event.target.value || 0))}
                            className={inputClassName}
                          />
                        ) : (
                          <ReadOnlyValue value={formatDisplayNumber(editForm.cmtcAmount)} icon={Wallet} />
                        )}
                      </FieldShell>
                      <FieldShell label="Tráº¡ng thÃ¡i CMTC">
                        {isEditing ? (
                          <select
                            value={editForm.cmtc}
                            onChange={(event) => updateEditForm('cmtc', event.target.value as StudyAbroadCmtcStatus)}
                            className={selectClassName}
                          >
                            {CMTC_STATUS_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <ReadOnlyValue value={getOptionLabel(CMTC_STATUS_OPTIONS, editForm.cmtc)} icon={ClipboardList} />
                        )}
                      </FieldShell>
                      <FieldShell label="Chá»n ngÃ nh / chÆ°Æ¡ng trÃ¬nh">
                        {isEditing ? (
                          <select
                            value={editForm.programSelectionStatus}
                            onChange={(event) =>
                              updateEditForm('programSelectionStatus', event.target.value as StudyAbroadProgramSelectionStatus)
                            }
                            className={selectClassName}
                          >
                            {PROGRAM_SELECTION_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <ReadOnlyValue value={getOptionLabel(PROGRAM_SELECTION_OPTIONS, editForm.programSelectionStatus)} icon={Globe} />
                        )}
                      </FieldShell>
                      <FieldShell label="TÃªn chÆ°Æ¡ng trÃ¬nh">
                        {isEditing ? (
                          <input
                            value={editForm.schoolProgramName}
                            onChange={(event) => updateEditForm('schoolProgramName', event.target.value)}
                            className={inputClassName}
                          />
                        ) : (
                          <ReadOnlyValue value={getDisplayText(editForm.schoolProgramName)} icon={GraduationCap} />
                        )}
                      </FieldShell>
                    </div>
                  </fieldset>
                </div>
              </section>

              <section className={sectionCardClassName}>
                <div className="border-b border-slate-200 px-5 py-4">
                  <div className="text-[18px] font-medium tracking-[-0.01em] text-slate-950">Application Progress</div>
                  <div className="mt-1 text-[13px] leading-5 text-slate-500">Sinh tá»± Ä‘á»™ng tá»« cÃ¡c tiáº¿n Ä‘á»™ há»“ sÆ¡ Ä‘Ã£ lÆ°u.</div>
                </div>
                <div className="p-5">
                  {progressSteps.map((step) => (
                    <ProgressItem key={step.key} step={step} />
                  ))}
                </div>
              </section>
            </div>

            <div className="space-y-4">
              <section className={sectionCardClassName}>
                <div className="border-b border-slate-200 px-5 py-4">
                  <div className="text-[18px] font-medium tracking-[-0.01em] text-slate-950">Tráº¡ng thÃ¡i há»“ sÆ¡</div>
                  <div className="mt-1 text-[13px] leading-5 text-slate-500">
                    TÃ¬nh tráº¡ng há»“ sÆ¡ vÃ  cÃ¡c má»‘c xá»­ lÃ½ chÃ­nh.
                  </div>
                </div>
                <div className="p-5">
                  <fieldset disabled={!isEditing || saving}>
                    <div className="grid gap-4 md:grid-cols-2">
                      <FieldShell label="Tráº¡ng thÃ¡i há»“ sÆ¡">
                        {isEditing ? (
                          <select
                            value={editForm.caseCompleteness}
                            onChange={(event) =>
                              updateEditForm('caseCompleteness', event.target.value as StudyAbroadCaseCompleteness)
                            }
                            className={selectClassName}
                          >
                            {CASE_COMPLETENESS_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <ReadOnlyValue value={getOptionLabel(CASE_COMPLETENESS_OPTIONS, editForm.caseCompleteness)} icon={ClipboardList} />
                        )}
                      </FieldShell>
                      <FieldShell label="Dá»‹ch thuáº­t cÃ´ng chá»©ng">
                        {isEditing ? (
                          <select
                            value={editForm.translationStatus}
                            onChange={(event) =>
                              updateEditForm('translationStatus', event.target.value as StudyAbroadTranslationStatus)
                            }
                            className={selectClassName}
                          >
                            {TRANSLATION_STATUS_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <ReadOnlyValue value={getOptionLabel(TRANSLATION_STATUS_OPTIONS, editForm.translationStatus)} icon={Languages} />
                        )}
                      </FieldShell>
                      <FieldShell label="Xin thÆ° má»i" className="md:col-span-2">
                        {isEditing ? (
                          <select
                            value={editForm.offerLetterStatus}
                            onChange={(event) =>
                              updateEditForm('offerLetterStatus', event.target.value as StudyAbroadOfferLetterStatus)
                            }
                            className={selectClassName}
                          >
                            {OFFER_LETTER_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <ReadOnlyValue value={getOptionLabel(OFFER_LETTER_OPTIONS, editForm.offerLetterStatus)} icon={Mail} />
                        )}
                      </FieldShell>
                      <FieldShell label="Lá»‹ch háº¹n ÄSQ">
                        {isEditing ? (
                          <select
                            value={editForm.embassyAppointmentStatus}
                            onChange={(event) =>
                              updateEditForm(
                                'embassyAppointmentStatus',
                                event.target.value as StudyAbroadEmbassyAppointmentStatus
                              )
                            }
                            className={selectClassName}
                          >
                            {EMBASSY_APPOINTMENT_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <ReadOnlyValue value={getOptionLabel(EMBASSY_APPOINTMENT_OPTIONS, editForm.embassyAppointmentStatus)} icon={Calendar} />
                        )}
                      </FieldShell>
                      <FieldShell label="NgÃ y háº¹n ÄSQ">
                        {isEditing ? (
                          <input
                            type="date"
                            value={editForm.embassyAppointmentDate}
                            onChange={(event) => updateEditForm('embassyAppointmentDate', event.target.value)}
                            className={inputClassName}
                          />
                        ) : (
                          <ReadOnlyValue value={formatDisplayDate(editForm.embassyAppointmentDate)} icon={Calendar} />
                        )}
                      </FieldShell>
                      <FieldShell label="Visa" className="md:col-span-2">
                        {isEditing ? (
                          <select
                            value={editForm.visaStatus}
                            onChange={(event) => updateEditForm('visaStatus', event.target.value as StudyAbroadVisaStatus)}
                            className={selectClassName}
                          >
                            {VISA_STATUS_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <ReadOnlyValue value={getOptionLabel(VISA_STATUS_OPTIONS, editForm.visaStatus)} icon={FileText} />
                        )}
                      </FieldShell>
                      <FieldShell label="Xuáº¥t cáº£nh">
                        {isEditing ? (
                          <select
                            value={editForm.flightStatus}
                            onChange={(event) => updateEditForm('flightStatus', event.target.value as StudyAbroadFlightStatus)}
                            className={selectClassName}
                          >
                            {FLIGHT_STATUS_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <ReadOnlyValue value={getOptionLabel(FLIGHT_STATUS_OPTIONS, editForm.flightStatus)} icon={Plane} />
                        )}
                      </FieldShell>
                      <FieldShell label="NgÃ y nháº­p cáº£nh dá»± kiáº¿n">
                        {isEditing ? (
                          <input
                            type="date"
                            value={editForm.expectedEntryDate}
                            onChange={(event) => updateEditForm('expectedEntryDate', event.target.value)}
                            className={inputClassName}
                          />
                        ) : (
                          <ReadOnlyValue value={formatDisplayDate(editForm.expectedEntryDate)} icon={Calendar} />
                        )}
                      </FieldShell>
                      <FieldShell label="Ghi chÃº tráº¡ng thÃ¡i há»“ sÆ¡" className="md:col-span-2">
                        {isEditing ? (
                          <textarea
                            value={editForm.caseCompletenessNote}
                            onChange={(event) => updateEditForm('caseCompletenessNote', event.target.value)}
                            className={textareaClassName}
                            placeholder="Nháº­p ghi chÃº..."
                          />
                        ) : (
                          <ReadOnlyValue value={getDisplayText(editForm.caseCompletenessNote)} multiline icon={FileText} />
                        )}
                      </FieldShell>
                    </div>
                  </fieldset>
                </div>
              </section>

              <section className={sectionCardClassName}>
                <div className="border-b border-slate-200 px-5 py-4">
                  <div className="text-[18px] font-medium tracking-[-0.01em] text-slate-950">Log note</div>
                  <div className="mt-1 text-[13px] leading-5 text-slate-500">LÆ°u láº¡i cÃ¡c thay Ä‘á»•i tráº¡ng thÃ¡i cá»§a há»“ sÆ¡, ká»ƒ cáº£ thay Ä‘á»•i chÆ°a lÆ°u.</div>
                </div>
                <div className="max-h-[640px] overflow-auto p-5">
                  {statusTimelineGroups.length ? (
                    <div className="space-y-6">
                      {statusTimelineGroups.map((group) => (
                        <div key={group.date}>
                          <div className="mb-4 flex items-center gap-3">
                            <div className="h-px flex-1 bg-slate-200" />
                            <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500">
                              {group.date}
                            </div>
                            <div className="h-px flex-1 bg-slate-200" />
                          </div>
                          <div className="space-y-4">
                            {group.items.map((item, index) => (
                              <div key={item.id} className="relative pl-10">
                                {index < group.items.length - 1 ? (
                                  <div className="absolute left-4 top-10 bottom-[-18px] w-px bg-slate-200" />
                                ) : null}
                                <div className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-500">
                                  {(item.user || 'S').charAt(0).toUpperCase()}
                                </div>
                                <div className="text-sm font-semibold text-slate-900">{item.user}</div>
                                <div className={`mt-1 text-sm ${item.isPending ? 'text-amber-600' : 'text-slate-700'}`}>
                                  {item.change}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                      ChÆ°a cÃ³ thay Ä‘á»•i tráº¡ng thÃ¡i nÃ o Ä‘Æ°á»£c ghi nháº­n.
                    </div>
                  )}
                </div>
              </section>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudyAbroadCaseDetail;
