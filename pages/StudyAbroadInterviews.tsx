import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  Bell,
  X
} from 'lucide-react';
import { AdvancedFilterDropdown, ToolbarTimeFilter } from '../components/filters';
import PinnedSearchInput, { PinnedSearchChip } from '../components/PinnedSearchInput';
import { getStudyAbroadCaseList, type StudyAbroadCaseRecord } from '../services/studyAbroadCases.local';
import { decodeMojibakeReactNode } from '../utils/mojibake';
import {
  CustomDateRange,
  ToolbarOption,
  ToolbarValueOption,
  doesDateMatchTimeRange,
  getTimeRangeSummaryLabel
} from '../utils/filterToolbar';
import { STUDY_ABROAD_TIME_PRESETS, normalizeStudyAbroadSearch } from '../utils/studyAbroadToolbar';
import {
  addStudyAbroadInterview,
  deleteStudyAbroadInterview,
  getStudyAbroadInterviews,
  type StudyAbroadInterviewInput,
  type StudyAbroadInterviewItem,
  type StudyAbroadInterviewStatus,
  type StudyAbroadInterviewType,
  updateStudyAbroadInterview
} from '../services/studyAbroadInterviews.local';

const STATUS_LABEL_MAP: Record<'ALL' | StudyAbroadInterviewStatus, string> = {
  ALL: 'Tất cả',
  Scheduled: 'Đã lên lịch',
  Pending: 'Chờ xác nhận',
  Completed: 'Hoàn thành',
  Cancelled: 'Đã hủy'
};

const TYPE_LABEL_MAP: Record<'ALL' | StudyAbroadInterviewType, string> = {
  ALL: 'Tất cả',
  Visa: 'Phỏng vấn Visa',
  'Entrance Exam': 'Thi đầu vào'
};

const CHANNEL_OPTIONS = ['Zalo', 'Email', 'SMS', 'Call'] as const;
type InterviewAdvancedFieldKey = 'market' | 'program' | 'status';
type InterviewResolvedMeta = {
  market: Exclude<InterviewMarketFilter, 'ALL'> | '';
  program: Exclude<InterviewProgramFilter, 'ALL'> | '';
};
type InterviewMarketFilter = 'ALL' | 'Đức' | 'Trung Quốc';
type InterviewProgramFilter = 'ALL' | 'Du học đại học' | 'Du học thạc sĩ';
type InterviewTimeField = 'interviewDate';

const INTERVIEW_MARKET_OPTIONS = [
  { value: 'ALL', label: 'Thị trường: Tất cả' },
  { value: 'Đức', label: 'Thị trường: Đức' },
  { value: 'Trung Quốc', label: 'Thị trường: Trung Quốc' }
] as const;

const INTERVIEW_PROGRAM_OPTIONS = [
  { value: 'ALL', label: 'Chương trình: Tất cả' },
  { value: 'Du học đại học', label: 'Chương trình: Du học đại học' },
  { value: 'Du học thạc sĩ', label: 'Chương trình: Du học thạc sĩ' }
] as const;

const INTERVIEW_TIME_FIELD_OPTIONS = [
  { id: 'interviewDate', label: 'Ngày lịch hẹn' }
] as const satisfies ReadonlyArray<ToolbarOption>;

const INTERVIEW_ADVANCED_FILTER_OPTIONS = [
  { id: 'market', label: 'Th\u1ecb tr\u01b0\u1eddng' },
  { id: 'program', label: 'Ch\u01b0\u01a1ng tr\xECnh' },
  { id: 'status', label: 'Tr\u1ea1ng th\xE1i' }
] as const satisfies ReadonlyArray<ToolbarOption>;

const INTERVIEW_ADVANCED_FILTER_LABELS: Record<InterviewAdvancedFieldKey, string> = {
  market: 'Th\u1ecb tr\u01b0\u1eddng',
  program: 'Ch\u01b0\u01a1ng tr\xECnh',
  status: 'Tr\u1ea1ng th\xE1i'
};

const INTERVIEW_ADVANCED_SELECTABLE_VALUES = {
  market: INTERVIEW_MARKET_OPTIONS
    .filter((option) => option.value !== 'ALL')
    .map((option) => ({ value: option.value, label: option.value })),
  program: INTERVIEW_PROGRAM_OPTIONS
    .filter((option) => option.value !== 'ALL')
    .map((option) => ({ value: option.value, label: option.value })),
  status: Object.entries(STATUS_LABEL_MAP)
    .filter(([value]) => value !== 'ALL')
    .map(([value, label]) => ({ value, label }))
} as const satisfies Record<InterviewAdvancedFieldKey, ReadonlyArray<ToolbarValueOption>>;

const EMPTY_FORM: StudyAbroadInterviewInput = {
  date: '',
  time: '',
  studentName: '',
  type: 'Visa',
  subType: '',
  location: '',
  status: 'Scheduled',
  reminded: false,
  channel: 'Zalo'
};

const formatDisplayDate = (value: string) => {
  if (!value) return '--';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN');
};

const normalizeInterviewMarket = (value: string) => {
  const token = normalizeStudyAbroadSearch(value);
  if (!token) return '';
  if (token.includes('duc') || token.includes('germany') || token.includes('ger')) return 'Đức';
  if (token.includes('trung quoc') || token.includes('china')) return 'Trung Quốc';
  return '';
};

const normalizeInterviewProgram = (value: string) => {
  const token = normalizeStudyAbroadSearch(value);
  if (!token) return '';
  if (token.includes('du hoc dai hoc') || token.includes('dai hoc') || token.includes('bachelor')) {
    return 'Du học đại học';
  }
  if (token.includes('du hoc thac si') || token.includes('thac si') || token.includes('master')) {
    return 'Du học thạc sĩ';
  }
  return '';
};

const getInterviewStudentToken = (value: string) => normalizeStudyAbroadSearch(value);

const resolveInterviewMeta = (
  item: StudyAbroadInterviewItem,
  caseByStudentToken: Map<string, StudyAbroadCaseRecord>
): InterviewResolvedMeta => {
  const matchedCase = caseByStudentToken.get(getInterviewStudentToken(item.studentName));
  const marketSource = [matchedCase?.country, item.subType, item.location].filter(Boolean).join(' ');
  const programSource = [matchedCase?.program, matchedCase?.productPackage, item.subType, item.location]
    .filter(Boolean)
    .join(' ');

  return {
    market: normalizeInterviewMarket(marketSource) as InterviewResolvedMeta['market'],
    program: normalizeInterviewProgram(programSource) as InterviewResolvedMeta['program']
  };
};

const formatInterviewAdvancedFilterValue = (fieldId: InterviewAdvancedFieldKey, value: string) => {
  if (fieldId === 'status') {
    return STATUS_LABEL_MAP[value as keyof typeof STATUS_LABEL_MAP] || value;
  }
  return value;
};

const toInterviewForm = (item: StudyAbroadInterviewItem): StudyAbroadInterviewInput => ({
  date: item.date,
  time: item.time,
  studentName: item.studentName,
  type: item.type,
  subType: item.subType,
  location: item.location,
  status: item.status,
  reminded: item.reminded,
  channel: item.channel
});

const StudyAbroadInterviews: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timeFilterField, setTimeFilterField] = useState<InterviewTimeField>('interviewDate');
  const [timeRangeType, setTimeRangeType] = useState<(typeof STUDY_ABROAD_TIME_PRESETS)[number]['id']>('all');
  const [customRange, setCustomRange] = useState<CustomDateRange | null>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [selectedAdvancedFilterFields, setSelectedAdvancedFilterFields] = useState<InterviewAdvancedFieldKey[]>([]);
  const [selectedAdvancedFilterValues, setSelectedAdvancedFilterValues] = useState<Partial<Record<InterviewAdvancedFieldKey, string>>>({});
  const [interviews, setInterviews] = useState<StudyAbroadInterviewItem[]>([]);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingInterview, setEditingInterview] = useState<StudyAbroadInterviewItem | null>(null);
  const [formData, setFormData] = useState<StudyAbroadInterviewInput>(EMPTY_FORM);

  const loadInterviews = () => {
    setInterviews(getStudyAbroadInterviews());
  };

  useEffect(() => {
    loadInterviews();

    const handleStorageChange = () => loadInterviews();
    window.addEventListener('educrm:study-abroad-interviews-changed', handleStorageChange as EventListener);

    return () => {
      window.removeEventListener('educrm:study-abroad-interviews-changed', handleStorageChange as EventListener);
    };
  }, []);

  const caseByStudentToken = useMemo(() => {
    const nextMap = new Map<string, StudyAbroadCaseRecord>();

    getStudyAbroadCaseList().forEach((row) => {
      const token = getInterviewStudentToken(row.student);
      if (!token || nextMap.has(token)) return;
      nextMap.set(token, row);
    });

    return nextMap;
  }, [interviews]);

  const interviewMetaById = useMemo(() => {
    const nextMap = new Map<string, InterviewResolvedMeta>();

    interviews.forEach((item) => {
      nextMap.set(item.id, resolveInterviewMeta(item, caseByStudentToken));
    });

    return nextMap;
  }, [caseByStudentToken, interviews]);

  const selectedAdvancedFilterOptions = useMemo(
    () =>
      selectedAdvancedFilterFields
        .map((fieldId) => INTERVIEW_ADVANCED_FILTER_OPTIONS.find((option) => option.id === fieldId))
        .filter((option): option is (typeof INTERVIEW_ADVANCED_FILTER_OPTIONS)[number] => Boolean(option)),
    [selectedAdvancedFilterFields]
  );
  const activeAdvancedFilterField = selectedAdvancedFilterOptions[0] || null;
  const selectedAdvancedFilterEntries = useMemo(
    () =>
      Object.entries(selectedAdvancedFilterValues).filter(
        (entry): entry is [InterviewAdvancedFieldKey, string] => Boolean(entry[1])
      ),
    [selectedAdvancedFilterValues]
  );
  const advancedFilterSelectableValuesByField = useMemo(
    () =>
      selectedAdvancedFilterFields.reduce<Partial<Record<InterviewAdvancedFieldKey, ReadonlyArray<ToolbarValueOption>>>>(
        (accumulator, fieldId) => {
          accumulator[fieldId] = INTERVIEW_ADVANCED_SELECTABLE_VALUES[fieldId];
          return accumulator;
        },
        {}
      ),
    [selectedAdvancedFilterFields]
  );
  const advancedFilterSelectableValues =
    (activeAdvancedFilterField
      ? advancedFilterSelectableValuesByField[activeAdvancedFilterField.id as InterviewAdvancedFieldKey]
      : []) || [];
  const advancedToolbarActiveCount = selectedAdvancedFilterEntries.length;
  const hasAdvancedToolbarFilters = selectedAdvancedFilterEntries.length > 0;

  const filteredInterviews = useMemo(() => {
    const keyword = normalizeStudyAbroadSearch(searchTerm);

    return interviews.filter((item) => {
      const meta = interviewMetaById.get(item.id);
      const matchesSearch =
        !keyword ||
        normalizeStudyAbroadSearch(
          [
            item.studentName,
            item.location,
            item.subType,
            item.channel,
            item.date,
            item.time,
            formatDisplayDate(item.date),
            TYPE_LABEL_MAP[item.type],
            STATUS_LABEL_MAP[item.status],
            meta?.market || '',
            meta?.program || ''
          ].join(' ')
        ).includes(keyword);

      if (!matchesSearch) {
        return false;
      }

      if (timeRangeType !== 'all' && !doesDateMatchTimeRange(item.date, timeRangeType, customRange)) {
        return false;
      }

      if (
        selectedAdvancedFilterEntries.some(([fieldId, selectedValue]) => {
          if (fieldId === 'status') return item.status !== selectedValue;
          if (fieldId === 'market') return (meta?.market || '') !== selectedValue;
          return (meta?.program || '') !== selectedValue;
        })
      ) {
        return false;
      }

      return true;
    });
  }, [customRange, interviewMetaById, interviews, searchTerm, selectedAdvancedFilterEntries, timeRangeType]);

  const activeSearchChips = useMemo<PinnedSearchChip[]>(() => {
    const chips = selectedAdvancedFilterEntries.map(([fieldId, value]) => ({
      key: fieldId,
      label: `${INTERVIEW_ADVANCED_FILTER_LABELS[fieldId]}: ${formatInterviewAdvancedFilterValue(fieldId, value)}`
    }));

    if (timeRangeType !== 'all') {
      chips.push({
        key: 'time',
        label: `Ng\u00E0y: ${getTimeRangeSummaryLabel(STUDY_ABROAD_TIME_PRESETS, timeRangeType, customRange)}`
      });
    }

    return chips;
  }, [customRange, selectedAdvancedFilterEntries, timeRangeType]);

  const removeSearchChip = (chipKey: string) => {
    if (chipKey === 'time') {
      setShowTimePicker(false);
      setTimeRangeType('all');
      setCustomRange(null);
      return;
    }

    if (chipKey === 'market' || chipKey === 'program' || chipKey === 'status') {
      const fieldId = chipKey as InterviewAdvancedFieldKey;
      setSelectedAdvancedFilterFields((prev) => prev.filter((item) => item !== fieldId));
      setSelectedAdvancedFilterValues((prev) => {
        if (!(fieldId in prev)) return prev;

        const nextValues = { ...prev };
        delete nextValues[fieldId];
        return nextValues;
      });
    }
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setShowTimePicker(false);
    setTimeFilterField('interviewDate');
    setTimeRangeType('all');
    setCustomRange(null);
    setShowFilterDropdown(false);
    setSelectedAdvancedFilterFields([]);
    setSelectedAdvancedFilterValues({});
  };

  const handleTimeFilterOpenChange = (nextOpen: boolean) => {
    setShowFilterDropdown(false);
    setShowTimePicker(nextOpen);
  };

  const handleTimeFilterFieldChange = (fieldId: string) => {
    setShowFilterDropdown(false);
    setShowTimePicker(false);
    setTimeFilterField(fieldId as InterviewTimeField);
  };

  const handleTimePresetSelect = (presetId: string) => {
    const nextPresetId = presetId as (typeof STUDY_ABROAD_TIME_PRESETS)[number]['id'];
    setTimeRangeType(nextPresetId);
    if (nextPresetId !== 'custom') {
      setShowTimePicker(false);
    }
  };

  const handleApplyCustomTimeRange = () => {
    if (customRange?.start && customRange?.end) {
      setTimeRangeType('custom');
      setShowTimePicker(false);
      return;
    }
    window.alert('Vui l\xF2ng ch\u1ECDn kho\u1EA3ng ng\xE0y');
  };

  const handleAdvancedFilterOpenChange = (nextOpen: boolean) => {
    setShowTimePicker(false);
    setShowFilterDropdown(nextOpen);
  };

  const toggleAdvancedFilterField = (fieldId: InterviewAdvancedFieldKey) => {
    setSelectedAdvancedFilterFields((prev) =>
      prev.includes(fieldId) ? prev.filter((item) => item !== fieldId) : [...prev, fieldId]
    );
    setSelectedAdvancedFilterValues((prev) => {
      if (!(fieldId in prev)) return prev;

      const nextValues = { ...prev };
      delete nextValues[fieldId];
      return nextValues;
    });
  };

  const handleAdvancedFilterValueChange = (fieldId: InterviewAdvancedFieldKey, value: string) => {
    setSelectedAdvancedFilterValues((prev) => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const openCreateModal = () => {
    setEditingInterview(null);
    setFormData(EMPTY_FORM);
    setShowFormModal(true);
  };

  const openEditModal = (item: StudyAbroadInterviewItem) => {
    setEditingInterview(item);
    setFormData(toInterviewForm(item));
    setShowFormModal(true);
  };

  const closeFormModal = () => {
    setShowFormModal(false);
    setEditingInterview(null);
    setFormData(EMPTY_FORM);
  };

  const updateFormField = <K extends keyof StudyAbroadInterviewInput>(key: K, value: StudyAbroadInterviewInput[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveInterview = (event: React.FormEvent) => {
    event.preventDefault();

    if (
      !formData.date.trim() ||
      !formData.time.trim() ||
      !formData.studentName.trim() ||
      !formData.subType.trim() ||
      !formData.location.trim()
    ) {
      window.alert('Vui lòng nhập đủ ngày, giờ, học viên, loại lịch chi tiết và địa điểm.');
      return;
    }

    if (editingInterview) {
      updateStudyAbroadInterview({
        ...editingInterview,
        ...formData
      });
    } else {
      addStudyAbroadInterview(formData);
    }

    closeFormModal();
  };

  const handleDeleteInterview = (item: StudyAbroadInterviewItem) => {
    const confirmed = window.confirm(
      `Xóa lịch của ${item.studentName} lúc ${item.time} ngày ${formatDisplayDate(item.date)}?`
    );
    if (!confirmed) return;

    deleteStudyAbroadInterview(item.id);
    if (editingInterview?.id === item.id) {
      closeFormModal();
    }
  };

  const handleSendReminder = (item: StudyAbroadInterviewItem) => {
    if (item.reminded) return;

    updateStudyAbroadInterview({
      ...item,
      reminded: true
    });
  };

  const getStatusBadge = (status: StudyAbroadInterviewStatus) => {
    switch (status) {
      case 'Scheduled':
        return <span className="px-2 py-1 rounded text-xs font-bold bg-blue-100 text-blue-700">Đã lên lịch</span>;
      case 'Completed':
        return <span className="px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-700">Hoàn thành</span>;
      case 'Cancelled':
        return <span className="px-2 py-1 rounded text-xs font-bold bg-gray-100 text-gray-500 line-through">Đã hủy</span>;
      case 'Pending':
        return <span className="px-2 py-1 rounded text-xs font-bold bg-amber-100 text-amber-700">Chờ xác nhận</span>;
      default:
        return status;
    }
  };

  const getTypeBadge = (type: StudyAbroadInterviewType, subType: string) => {
    if (type === 'Visa') {
      return (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-purple-700">Phỏng vấn Visa</span>
          <span className="text-xs text-purple-500">{subType}</span>
        </div>
      );
    }

    return (
      <div className="flex flex-col">
        <span className="text-sm font-medium text-orange-700">Thi đầu vào</span>
        <span className="text-xs text-orange-500">{subType}</span>
      </div>
    );
  };

  const fieldClass =
    'h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100';
  const labelClass = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500';

  return decodeMojibakeReactNode(
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#0d141b] font-sans overflow-hidden">
      <div className="px-8 py-6 flex justify-between items-end shrink-0 border-b border-[#e7edf3] bg-white">
        <div>
          <h1 className="text-3xl font-bold text-[#0d141b] flex items-center gap-2">
            <Calendar className="text-blue-600" />
            Lịch Phỏng vấn & Nhắc nhở
          </h1>
          <p className="text-[#4c739a] text-sm mt-1">Quản lý lịch phỏng vấn Visa và lịch thi đầu vào của học viên.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-lg bg-[#0d47a1] px-5 py-2.5 text-white font-bold text-sm hover:bg-[#0a3d8b] transition-all shadow-sm"
        >
          <Plus size={20} />
          Lên lịch mới
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden p-8 gap-6">
        <div className="flex-1 bg-white rounded-xl border border-[#e7edf3] shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-[#e7edf3] flex justify-between items-center gap-4 bg-gray-50/50">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="min-w-[280px] flex-1">
                <PinnedSearchInput
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Tìm học viên, địa điểm, kênh nhắc..."
                  chips={activeSearchChips}
                  onRemoveChip={removeSearchChip}
                  onClearAll={clearAllFilters}
                  clearAllAriaLabel="Xóa tất cả bộ lọc lịch phỏng vấn"
                  inputClassName="text-sm h-7"
                />
              </div>

              <ToolbarTimeFilter
                isOpen={showTimePicker}
                fieldOptions={INTERVIEW_TIME_FIELD_OPTIONS}
                selectedField={timeFilterField}
                selectedRangeType={timeRangeType}
                customRange={customRange}
                presets={STUDY_ABROAD_TIME_PRESETS}
                showFieldSelector={false}
                onOpenChange={handleTimeFilterOpenChange}
                onFieldChange={handleTimeFilterFieldChange}
                onPresetSelect={handleTimePresetSelect}
                onCustomRangeChange={setCustomRange}
                onReset={() => {
                  setTimeRangeType('all');
                  setCustomRange(null);
                  setShowTimePicker(false);
                }}
                onCancel={() => setShowTimePicker(false)}
                onApplyCustomRange={handleApplyCustomTimeRange}
                controlClassName="min-h-[36px] rounded-xl border-[#cfdbe7] shadow-none"
                rangeButtonClassName="px-3 text-[13px]"
                className="shrink-0"
              />

              <AdvancedFilterDropdown
                isOpen={showFilterDropdown}
                activeCount={advancedToolbarActiveCount}
                hasActiveFilters={hasAdvancedToolbarFilters}
                filterOptions={INTERVIEW_ADVANCED_FILTER_OPTIONS}
                groupOptions={[]}
                selectedFilterFieldIds={selectedAdvancedFilterFields}
                selectedGroupFieldIds={[]}
                activeFilterField={activeAdvancedFilterField}
                selectableValues={advancedFilterSelectableValues}
                selectedFilterValue={
                  activeAdvancedFilterField
                    ? selectedAdvancedFilterValues[activeAdvancedFilterField.id as InterviewAdvancedFieldKey] || ''
                    : ''
                }
                selectedFilterValuesByField={selectedAdvancedFilterValues}
                selectableValuesByField={advancedFilterSelectableValuesByField}
                onOpenChange={handleAdvancedFilterOpenChange}
                onToggleFilterField={(fieldId) => toggleAdvancedFilterField(fieldId as InterviewAdvancedFieldKey)}
                onToggleGroupField={() => undefined}
                onFilterValueChange={() => undefined}
                onFilterValueChangeForField={(fieldId, value) =>
                  handleAdvancedFilterValueChange(fieldId as InterviewAdvancedFieldKey, value)
                }
                onClearAll={() => {
                  setSelectedAdvancedFilterFields([]);
                  setSelectedAdvancedFilterValues({});
                }}
                triggerLabel="B\u1ED9 l\u1ECDc"
                filterDescription="Ch\u1ECDn th\u1ecb tr\u01b0\u1eddng, ch\u01b0\u01a1ng tr\xECnh v\xE0 tr\u1ea1ng th\xE1i \u0111\u1ec3 l\u1ecdc nhanh l\u1ecbch ph\u1ecfng v\u1ea5n du h\u1ecdc."
                triggerClassName="min-h-[36px] rounded-xl px-3 py-1.5 text-[13px] font-medium shadow-none"
                className="shrink-0"
              />
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button className="text-gray-400 hover:text-gray-600 p-2">
                <ChevronLeft size={20} />
              </button>
              <span className="text-sm font-bold text-gray-700">Tháng 9, 2026</span>
              <button className="text-gray-400 hover:text-gray-600 p-2">
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#f8fafc] border-b border-[#e7edf3] sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-6 py-4 text-center text-[#4c739a] text-xs font-bold uppercase tracking-wider w-16">STT</th>
                  <th className="px-6 py-4 text-[#4c739a] text-xs font-bold uppercase tracking-wider w-32">Thời gian</th>
                  <th className="px-6 py-4 text-[#4c739a] text-xs font-bold uppercase tracking-wider">Học viên</th>
                  <th className="px-6 py-4 text-[#4c739a] text-xs font-bold uppercase tracking-wider">Loại lịch</th>
                  <th className="px-6 py-4 text-[#4c739a] text-xs font-bold uppercase tracking-wider">Địa điểm</th>
                  <th className="px-6 py-4 text-[#4c739a] text-xs font-bold uppercase tracking-wider w-32">Trạng thái</th>
                  <th className="px-6 py-4 text-[#4c739a] text-xs font-bold uppercase tracking-wider text-center w-32">Nhắc nhở</th>
                  <th className="px-6 py-4 text-[#4c739a] w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e7edf3]">
                {filteredInterviews.length > 0 ? (
                  filteredInterviews.map((item, index) => (
                    <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="px-6 py-4 text-center text-sm font-semibold text-slate-500">{index + 1}</td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-[#0d141b] text-sm">{formatDisplayDate(item.date)}</div>
                        <div className="text-[#4c739a] text-xs font-medium flex items-center gap-1 mt-0.5">
                          <Clock size={12} /> {item.time}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-[#0d141b] text-sm">{item.studentName}</div>
                      </td>
                      <td className="px-6 py-4">{getTypeBadge(item.type, item.subType)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-1.5 text-sm text-[#0d141b] max-w-[200px]">
                          <MapPin size={14} className="text-[#4c739a] mt-0.5 shrink-0" />
                          <span className="truncate">{item.location}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(item.status)}</td>
                      <td className="px-6 py-4 text-center">
                        {item.reminded ? (
                          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-50 text-green-700 text-[10px] font-bold border border-green-100">
                            <CheckCircle2 size={10} /> Đã gửi ({item.channel})
                          </div>
                        ) : (
                          <button
                            onClick={() => handleSendReminder(item)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold border border-gray-200 hover:bg-blue-100 hover:text-blue-700 hover:border-blue-200 transition-colors"
                          >
                            <Bell size={10} /> Gửi ngay
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-blue-600"
                            title="Chỉnh sửa"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteInterview(item)}
                            className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-red-600"
                            title="Hủy lịch"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-sm text-slate-500">
                      Không tìm thấy lịch phỏng vấn phù hợp với bộ lọc hiện tại.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-[#e7edf3] flex justify-between items-center bg-gray-50 text-xs text-gray-500">
            <span>
              Hiển thị {filteredInterviews.length === 0 ? 0 : 1}-{filteredInterviews.length} trên tổng {interviews.length} lịch hẹn
            </span>
            <div className="flex gap-1">
              <button className="px-2 py-1 border rounded hover:bg-white disabled:opacity-50">Trước</button>
              <button className="px-2 py-1 border rounded bg-blue-600 text-white border-blue-600">1</button>
              <button className="px-2 py-1 border rounded hover:bg-white">2</button>
              <button className="px-2 py-1 border rounded hover:bg-white">3</button>
              <button className="px-2 py-1 border rounded hover:bg-white">Sau</button>
            </div>
          </div>
        </div>
      </div>

      {showFormModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/45 p-4 backdrop-blur-sm">
          <div className="flex min-h-full items-start justify-center py-4">
            <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-600">
                  Interview Schedule
                </div>
                <h3 className="mt-2 text-2xl font-semibold text-slate-900">
                  {editingInterview ? 'Chỉnh sửa lịch phỏng vấn' : 'Lên lịch phỏng vấn mới'}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Cập nhật thông tin lịch hẹn, trạng thái và kênh nhắc để đội xử lý theo dõi đúng tiến độ.
                </p>
              </div>
              <button
                type="button"
                onClick={closeFormModal}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-slate-300 hover:text-slate-600"
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>

              <form onSubmit={handleSaveInterview} className="overflow-y-auto px-6 py-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Ngày hẹn</label>
                  <input
                    type="date"
                    className={fieldClass}
                    value={formData.date}
                    onChange={(event) => updateFormField('date', event.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className={labelClass}>Giờ hẹn</label>
                  <input
                    type="time"
                    className={fieldClass}
                    value={formData.time}
                    onChange={(event) => updateFormField('time', event.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className={labelClass}>Học viên</label>
                  <input
                    className={fieldClass}
                    value={formData.studentName}
                    onChange={(event) => updateFormField('studentName', event.target.value)}
                    placeholder="Nhập tên học viên"
                    required
                  />
                </div>

                <div>
                  <label className={labelClass}>Kênh nhắc</label>
                  <select
                    className={fieldClass}
                    value={formData.channel}
                    onChange={(event) => updateFormField('channel', event.target.value)}
                  >
                    {CHANNEL_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Loại lịch</label>
                  <select
                    className={fieldClass}
                    value={formData.type}
                    onChange={(event) => updateFormField('type', event.target.value as StudyAbroadInterviewType)}
                  >
                    <option value="Visa">Phỏng vấn Visa</option>
                    <option value="Entrance Exam">Thi đầu vào</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Trạng thái</label>
                  <select
                    className={fieldClass}
                    value={formData.status}
                    onChange={(event) => updateFormField('status', event.target.value as StudyAbroadInterviewStatus)}
                  >
                    <option value="Scheduled">Đã lên lịch</option>
                    <option value="Pending">Chờ xác nhận</option>
                    <option value="Completed">Hoàn thành</option>
                    <option value="Cancelled">Đã hủy</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>{formData.type === 'Visa' ? 'Quốc gia / diện visa' : 'Loại bài thi'}</label>
                  <input
                    className={fieldClass}
                    value={formData.subType}
                    onChange={(event) => updateFormField('subType', event.target.value)}
                    placeholder={formData.type === 'Visa' ? 'Ví dụ: Đức, Úc...' : 'Ví dụ: TestAS, IELTS...'}
                    required
                  />
                </div>

                <div>
                  <label className={labelClass}>Địa điểm</label>
                  <input
                    className={fieldClass}
                    value={formData.location}
                    onChange={(event) => updateFormField('location', event.target.value)}
                    placeholder="Nhập địa điểm hoặc link online"
                    required
                  />
                </div>
              </div>

              <label className="mt-4 inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={formData.reminded}
                  onChange={(event) => updateFormField('reminded', event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Đánh dấu đã gửi nhắc hẹn qua kênh đã chọn
              </label>

              <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-4 md:flex-row md:items-center md:justify-between">
                <div>
                  {editingInterview ? (
                    <button
                      type="button"
                      onClick={() => handleDeleteInterview(editingInterview)}
                      className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                    >
                      <Trash2 size={15} />
                      Xóa lịch
                    </button>
                  ) : null}
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeFormModal}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    {editingInterview ? 'Lưu thay đổi' : 'Tạo lịch'}
                  </button>
                </div>
              </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyAbroadInterviews;
