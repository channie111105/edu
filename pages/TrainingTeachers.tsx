import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Phone, Briefcase, Award, FileText, Paperclip, Search, X } from 'lucide-react';
import { ITeacher, ITrainingClass } from '../types';
import { addTeacher, getTeachers, getTrainingClasses } from '../utils/storage';
import { useAuth } from '../contexts/AuthContext';
import { AdvancedFilterDropdown, ToolbarTimeFilter } from '../components/filters';
import { DEFAULT_ATTACHMENT_ACCEPT, readFilesAsAttachmentRecords } from '../utils/fileAttachments';
import { CustomDateRange, ToolbarOption, ToolbarValueOption, doesDateMatchTimeRange } from '../utils/filterToolbar';

const DEFAULT_TEACHER: Partial<ITeacher> = {
  status: 'ACTIVE',
  teachSubjects: [],
  teachLevels: [],
  certificates: [],
  assignedClassIds: [],
  attachments: []
};

type TeacherStatusTab = 'ALL' | 'ACTIVE' | 'INACTIVE';
type TeacherToolbarFilterFieldKey = 'campus' | 'language' | 'teachingLevel' | 'contractType' | 'classLoad';
type TeacherToolbarGroupFieldKey = TeacherToolbarFilterFieldKey;
type TeacherTimeField = 'contractSignedDate' | 'contractEndDate';
type TeacherTimeFieldSelection = 'action' | TeacherTimeField;
type TeacherListRow = {
  teacher: ITeacher;
  linkedClasses: ITrainingClass[];
  classCount: number;
  campusValues: string[];
  languageValues: string[];
  teachingLevelValues: string[];
  contractTypeValue: ITeacher['contractType'];
  classLoadValue: string;
  contractSignedDateValue?: string;
  contractEndDateValue?: string;
};

const TEACHER_TOOLBAR_FILTER_OPTIONS = [
  { id: 'campus', label: 'Cơ sở' },
  { id: 'language', label: 'Ngôn ngữ' },
  { id: 'teachingLevel', label: 'Trình độ dạy' },
  { id: 'contractType', label: 'Loại hợp đồng' },
  { id: 'classLoad', label: 'Số lớp đang nhận' }
] as const satisfies ReadonlyArray<ToolbarOption>;

const TEACHER_TOOLBAR_GROUP_OPTIONS = [
  { id: 'campus', label: 'Cơ sở' },
  { id: 'language', label: 'Ngôn ngữ' },
  { id: 'teachingLevel', label: 'Trình độ dạy' },
  { id: 'contractType', label: 'Loại hợp đồng' },
  { id: 'classLoad', label: 'Số lớp đang nhận' }
] as const satisfies ReadonlyArray<ToolbarOption>;

const TEACHER_TOOLBAR_TIME_FIELD_OPTIONS = [
  { id: 'contractSignedDate', label: 'Ngày ký HĐ' },
  { id: 'contractEndDate', label: 'Ngày kết thúc' }
] as const satisfies ReadonlyArray<ToolbarOption>;

const TEACHER_TIME_PRESETS = [
  { id: 'all', label: 'Tất cả thời gian' },
  { id: 'today', label: 'Hôm nay' },
  { id: 'yesterday', label: 'Hôm qua' },
  { id: 'thisWeek', label: 'Tuần này' },
  { id: 'last7Days', label: '7 ngày qua' },
  { id: 'last30Days', label: '30 ngày qua' },
  { id: 'thisMonth', label: 'Tháng này' },
  { id: 'lastMonth', label: 'Tháng trước' },
  { id: 'custom', label: 'Tùy chỉnh khoảng...' }
] as const satisfies ReadonlyArray<ToolbarOption>;

const TEACHER_TOOLBAR_TIME_PLACEHOLDER = 'action';
const DEFAULT_TEACHER_TIME_FIELD: TeacherTimeField = 'contractSignedDate';
const TEACHER_CONTRACT_TYPE_ORDER = ['Full-time', 'Part-time', 'CTV'] as const;
const TEACHER_LANGUAGE_LABELS: Record<string, string> = {
  CHINESE: 'Tiếng Trung',
  Chinese: 'Tiếng Trung',
  ENGLISH: 'Tiếng Anh',
  English: 'Tiếng Anh',
  GERMAN: 'Tiếng Đức',
  German: 'Tiếng Đức'
};
const TEACHER_CONTRACT_TYPE_LABELS: Record<ITeacher['contractType'], string> = {
  'Full-time': 'Toàn thời gian',
  'Part-time': 'Bán thời gian',
  CTV: 'CTV'
};

const toDateInputValue = (value: Date) => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const TrainingTeachers: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [teachers, setTeachers] = useState<ITeacher[]>([]);
  const [classes, setClasses] = useState<ITrainingClass[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<TeacherStatusTab>('ALL');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timeFilterField, setTimeFilterField] = useState<TeacherTimeFieldSelection>(TEACHER_TOOLBAR_TIME_PLACEHOLDER);
  const [timeRangeType, setTimeRangeType] = useState<(typeof TEACHER_TIME_PRESETS)[number]['id']>('all');
  const [customRange, setCustomRange] = useState<CustomDateRange | null>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [selectedAdvancedFilterFields, setSelectedAdvancedFilterFields] = useState<TeacherToolbarFilterFieldKey[]>([]);
  const [selectedAdvancedFilterValues, setSelectedAdvancedFilterValues] = useState<Partial<Record<TeacherToolbarFilterFieldKey, string>>>({});
  const [selectedAdvancedGroupFields, setSelectedAdvancedGroupFields] = useState<TeacherToolbarGroupFieldKey[]>([]);
  const [newTeacher, setNewTeacher] = useState<Partial<ITeacher>>(DEFAULT_TEACHER);
  const [isProcessingAttachments, setIsProcessingAttachments] = useState(false);

  const loadData = () => {
    setTeachers(getTeachers());
    setClasses(getTrainingClasses());
  };

  useEffect(() => {
    loadData();
    window.addEventListener('educrm:teachers-changed', loadData as EventListener);
    window.addEventListener('educrm:training-classes-changed', loadData as EventListener);
    return () => {
      window.removeEventListener('educrm:teachers-changed', loadData as EventListener);
      window.removeEventListener('educrm:training-classes-changed', loadData as EventListener);
      };
  }, []);

  const teacherStatusConfig: Record<ITeacher['status'], { label: string; className: string }> = {
    ACTIVE: {
      label: 'Đang hoạt động',
      className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
    },
    INACTIVE: {
      label: 'Đã nghỉ',
      className: 'bg-rose-50 text-rose-700 ring-1 ring-rose-100'
    }
  };

  const teacherRows = useMemo<TeacherListRow[]>(() => (
    teachers.map((teacher) => {
      const linkedClasses = classes.filter(
        (classItem) =>
          classItem.teacherId === teacher.id ||
          teacher.assignedClassIds.includes(classItem.id) ||
          teacher.assignedClassIds.includes(classItem.code)
      );
      const classCount = linkedClasses.length;
      const campusValues = Array.from(new Set(linkedClasses.map((classItem) => classItem.campus).filter(Boolean))) as string[];
      const contractEndCandidates = linkedClasses
        .map((classItem) => classItem.endDate)
        .filter((value): value is string => Boolean(value))
        .sort((left, right) => left.localeCompare(right));

      return {
        teacher,
        linkedClasses,
        classCount,
        campusValues: campusValues.sort((left, right) => left.localeCompare(right, 'vi')),
        languageValues: [...teacher.teachSubjects].sort((left, right) => left.localeCompare(right, 'vi')),
        teachingLevelValues: [...teacher.teachLevels].sort((left, right) => left.localeCompare(right, 'vi')),
        contractTypeValue: teacher.contractType,
        classLoadValue: String(classCount),
        contractSignedDateValue: teacher.startDate,
        contractEndDateValue: contractEndCandidates[contractEndCandidates.length - 1]
      };
    })
  ), [classes, teachers]);

  const selectedAdvancedFilterOptions = useMemo(
    () =>
      selectedAdvancedFilterFields
        .map((fieldId) => TEACHER_TOOLBAR_FILTER_OPTIONS.find((option) => option.id === fieldId))
        .filter((option): option is (typeof TEACHER_TOOLBAR_FILTER_OPTIONS)[number] => Boolean(option)),
    [selectedAdvancedFilterFields]
  );
  const activeAdvancedFilterField = selectedAdvancedFilterOptions[0] || null;
  const selectedAdvancedFilterEntries = Object.entries(selectedAdvancedFilterValues).filter(
    (entry): entry is [TeacherToolbarFilterFieldKey, string] => Boolean(entry[1])
  );
  const resolvedTimeFilterField =
    timeFilterField === TEACHER_TOOLBAR_TIME_PLACEHOLDER ? DEFAULT_TEACHER_TIME_FIELD : timeFilterField;

  const getRowTimeFieldValue = (
    row: TeacherListRow,
    fieldId: TeacherTimeField = resolvedTimeFilterField
  ) => (fieldId === 'contractEndDate' ? row.contractEndDateValue : row.contractSignedDateValue);

  const getAdvancedFieldValues = (
    row: TeacherListRow,
    fieldId: TeacherToolbarFilterFieldKey | TeacherToolbarGroupFieldKey
  ) => {
    switch (fieldId) {
      case 'campus':
        return row.campusValues;
      case 'language':
        return row.languageValues;
      case 'teachingLevel':
        return row.teachingLevelValues;
      case 'contractType':
        return row.contractTypeValue ? [row.contractTypeValue] : [];
      case 'classLoad':
        return row.classLoadValue ? [row.classLoadValue] : [];
      default:
        return [];
    }
  };

  const getAdvancedFieldEmptyLabel = (
    fieldId: TeacherToolbarFilterFieldKey | TeacherToolbarGroupFieldKey
  ) => {
    switch (fieldId) {
      case 'campus':
        return 'Chưa có cơ sở';
      case 'language':
        return 'Chưa có ngôn ngữ';
      case 'teachingLevel':
        return 'Chưa có trình độ';
      case 'contractType':
        return 'Chưa có hợp đồng';
      case 'classLoad':
        return '0 lớp';
      default:
        return 'Chưa có dữ liệu';
    }
  };

  const formatAdvancedFieldValue = (
    fieldId: TeacherToolbarFilterFieldKey | TeacherToolbarGroupFieldKey,
    value: string
  ) => {
    if (!value) return getAdvancedFieldEmptyLabel(fieldId);
    if (fieldId === 'language') return TEACHER_LANGUAGE_LABELS[value] || value;
    if (fieldId === 'contractType') {
      return TEACHER_CONTRACT_TYPE_LABELS[value as ITeacher['contractType']] || value;
    }
    if (fieldId === 'classLoad') return `${value} lớp`;
    return value;
  };

  const getAdvancedFieldDisplayValue = (
    row: TeacherListRow,
    fieldId: TeacherToolbarFilterFieldKey | TeacherToolbarGroupFieldKey
  ) => {
    const values = getAdvancedFieldValues(row, fieldId);
    if (!values.length) return getAdvancedFieldEmptyLabel(fieldId);
    return values.map((value) => formatAdvancedFieldValue(fieldId, value)).join(' / ');
  };

  const sortSelectableValues = (fieldId: TeacherToolbarFilterFieldKey, values: string[]) => {
    if (fieldId === 'contractType') {
      const contractTypeOrder = new Map(TEACHER_CONTRACT_TYPE_ORDER.map((value, index) => [value, index]));
      return [...values].sort((left, right) => {
        const leftOrder = contractTypeOrder.get(left as (typeof TEACHER_CONTRACT_TYPE_ORDER)[number]) ?? Number.MAX_SAFE_INTEGER;
        const rightOrder = contractTypeOrder.get(right as (typeof TEACHER_CONTRACT_TYPE_ORDER)[number]) ?? Number.MAX_SAFE_INTEGER;
        if (leftOrder !== rightOrder) return leftOrder - rightOrder;
        return left.localeCompare(right, 'vi');
      });
    }

    if (fieldId === 'classLoad') {
      return [...values].sort((left, right) => Number(left) - Number(right));
    }

    return [...values].sort((left, right) => left.localeCompare(right, 'vi'));
  };

  const advancedFilterSelectableValuesByField = useMemo<
    Readonly<Partial<Record<TeacherToolbarFilterFieldKey, ReadonlyArray<ToolbarValueOption>>>>
  >(() => {
    return selectedAdvancedFilterFields.reduce<Partial<Record<TeacherToolbarFilterFieldKey, ReadonlyArray<ToolbarValueOption>>>>(
      (accumulator, fieldId) => {
        const derivedValues = teacherRows.flatMap((row) => getAdvancedFieldValues(row, fieldId));
        const presetValues = fieldId === 'contractType' ? [...TEACHER_CONTRACT_TYPE_ORDER] : [];

        accumulator[fieldId] = sortSelectableValues(
          fieldId,
          Array.from(new Set([...presetValues, ...derivedValues].filter(Boolean)))
        ).map((value) => ({
          value,
          label: formatAdvancedFieldValue(fieldId, value)
        }));

        return accumulator;
      },
      {}
    );
  }, [selectedAdvancedFilterFields, teacherRows]);
  const advancedFilterSelectableValues =
    (activeAdvancedFilterField
      ? advancedFilterSelectableValuesByField[activeAdvancedFilterField.id as TeacherToolbarFilterFieldKey]
      : []) || [];

  const filteredRows = useMemo(() => {
    const statusFilteredRows = teacherRows.filter((row) => {
      if (filterStatus === 'ACTIVE') return row.teacher.status === 'ACTIVE';
      if (filterStatus === 'INACTIVE') return row.teacher.status === 'INACTIVE';
      return true;
    });

    return statusFilteredRows
      .filter((row) => {
        const query = searchTerm.trim().toLowerCase();
        const matchesSearch =
          !query ||
          [
            row.teacher.fullName,
            row.teacher.phone,
            row.teacher.code,
            row.campusValues.join(' '),
            row.languageValues.join(' '),
            row.teachingLevelValues.join(' '),
            row.contractTypeValue,
            row.classLoadValue
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(query);

        if (!matchesSearch) return false;

        if (timeRangeType !== 'all' && !doesDateMatchTimeRange(getRowTimeFieldValue(row), timeRangeType, customRange)) {
          return false;
        }

        if (
          selectedAdvancedFilterEntries.some(
            ([fieldId, selectedValue]) => !getAdvancedFieldValues(row, fieldId).includes(selectedValue)
          )
        ) {
          return false;
        }

        return true;
      })
      .sort((left, right) => {
        if (selectedAdvancedGroupFields.length > 0) {
          const leftGroup = selectedAdvancedGroupFields
            .map((fieldId) => getAdvancedFieldDisplayValue(left, fieldId))
            .join('||');
          const rightGroup = selectedAdvancedGroupFields
            .map((fieldId) => getAdvancedFieldDisplayValue(right, fieldId))
            .join('||');
          const groupCompare = leftGroup.localeCompare(rightGroup, 'vi');
          if (groupCompare !== 0) return groupCompare;
        }

        return left.teacher.fullName.localeCompare(right.teacher.fullName, 'vi');
      });
  }, [
    customRange,
    filterStatus,
    searchTerm,
    selectedAdvancedFilterEntries,
    selectedAdvancedGroupFields,
    teacherRows,
    timeRangeType
  ]);

  const groupedRows = useMemo(() => {
    if (!selectedAdvancedGroupFields.length) {
      return [{ key: 'all', label: `Tất cả (${filteredRows.length})`, rows: filteredRows }];
    }

    const buildGroups = (
      rows: TeacherListRow[],
      fields: TeacherToolbarGroupFieldKey[],
      path: string[] = [],
      keyPath: string[] = []
    ): Array<{ key: string; label: string; rows: TeacherListRow[] }> => {
      if (!fields.length) {
        return [{ key: keyPath.join('||') || 'all', label: `${path.join(' / ')} (${rows.length})`, rows }];
      }

      const [currentField, ...restFields] = fields;
      const groups = new Map<string, TeacherListRow[]>();
      const fieldLabel =
        TEACHER_TOOLBAR_GROUP_OPTIONS.find((option) => option.id === currentField)?.label || currentField;

      rows.forEach((row) => {
        const key = getAdvancedFieldDisplayValue(row, currentField);
        groups.set(key, [...(groups.get(key) || []), row]);
      });

      return Array.from(groups.entries())
        .sort((left, right) => left[0].localeCompare(right[0], 'vi'))
        .flatMap(([key, nestedRows]) =>
          buildGroups(
            nestedRows,
            restFields,
            [...path, `${fieldLabel}: ${key}`],
            [...keyPath, `${fieldLabel}:${key}`]
          )
        );
    };

    return buildGroups(filteredRows, selectedAdvancedGroupFields);
  }, [filteredRows, selectedAdvancedGroupFields]);

  const advancedToolbarActiveCount =
    selectedAdvancedGroupFields.length + selectedAdvancedFilterEntries.length;
  const hasAdvancedToolbarFilters =
    selectedAdvancedGroupFields.length > 0 || selectedAdvancedFilterEntries.length > 0;

  const clearAllFilters = () => {
    setSearchTerm('');
    setFilterStatus('ALL');
    setShowTimePicker(false);
    setTimeFilterField(TEACHER_TOOLBAR_TIME_PLACEHOLDER);
    setTimeRangeType('all');
    setCustomRange(null);
    setShowFilterDropdown(false);
    setSelectedAdvancedFilterFields([]);
    setSelectedAdvancedFilterValues({});
    setSelectedAdvancedGroupFields([]);
  };

  const handleTimeFilterOpenChange = (nextOpen: boolean) => {
    setShowFilterDropdown(false);
    setShowTimePicker(nextOpen);
  };

  const handleTimeFilterFieldChange = (fieldId: string) => {
    setShowFilterDropdown(false);
    setShowTimePicker(false);
    setTimeFilterField(fieldId as TeacherTimeFieldSelection);
  };

  const handleTimePresetSelect = (presetId: string) => {
    const nextPresetId = presetId as (typeof TEACHER_TIME_PRESETS)[number]['id'];
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
    window.alert('Vui lòng chọn khoảng ngày');
  };

  const handleAdvancedFilterOpenChange = (nextOpen: boolean) => {
    setShowTimePicker(false);
    setShowFilterDropdown(nextOpen);
  };

  const toggleAdvancedFieldSelection = (
    type: 'filter' | 'group',
    fieldId: TeacherToolbarFilterFieldKey | TeacherToolbarGroupFieldKey
  ) => {
    if (type === 'filter') {
      const resolvedFieldId = fieldId as TeacherToolbarFilterFieldKey;

      setSelectedAdvancedFilterFields((prev) =>
        prev.includes(resolvedFieldId)
          ? prev.filter((item) => item !== resolvedFieldId)
          : [...prev, resolvedFieldId]
      );
      setSelectedAdvancedFilterValues((prev) => {
        if (!(resolvedFieldId in prev)) return prev;

        const nextValues = { ...prev };
        delete nextValues[resolvedFieldId];
        return nextValues;
      });
      return;
    }

    setSelectedAdvancedGroupFields((prev) =>
      prev.includes(fieldId as TeacherToolbarGroupFieldKey)
        ? prev.filter((item) => item !== fieldId)
        : [...prev, fieldId as TeacherToolbarGroupFieldKey]
    );
  };

  const handleAdvancedFilterValueChange = (
    fieldId: TeacherToolbarFilterFieldKey,
    value: string
  ) => {
    setSelectedAdvancedFilterValues((prev) => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleCreateTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessingAttachments) return;

    const nextIndex = teachers.length + 1;
    const teacher: ITeacher = {
      id: `T${Date.now()}`,
      code: `GV${String(nextIndex).padStart(3, '0')}`,
      fullName: newTeacher.fullName || '',
      phone: newTeacher.phone || '',
      dob: newTeacher.dob,
      birthYear: newTeacher.birthYear,
      email: newTeacher.email,
      address: newTeacher.address,
      contractType: (newTeacher.contractType as ITeacher['contractType']) || 'Full-time',
      contractNote: newTeacher.contractNote,
      startDate: newTeacher.startDate || new Date().toISOString().slice(0, 10),
      teachSubjects: newTeacher.teachSubjects || [],
      teachLevels: newTeacher.teachLevels || [],
      certificates: newTeacher.certificates || [],
      attachments: newTeacher.attachments || [],
      status: (newTeacher.status as ITeacher['status']) || 'ACTIVE',
      assignedClassIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    addTeacher(teacher, user?.id || 'system');
    setShowCreateModal(false);
    setNewTeacher(DEFAULT_TEACHER);
    loadData();
  };

  const handleDraftAttachmentSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setIsProcessingAttachments(true);
      const nextAttachments = await readFilesAsAttachmentRecords(event.target.files);
      if (nextAttachments.length === 0) return;

      setNewTeacher((prev) => ({
        ...prev,
        attachments: [...(prev.attachments || []), ...nextAttachments]
      }));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Không thể tải hồ sơ lên. Vui lòng thử lại.');
    } finally {
      setIsProcessingAttachments(false);
      event.target.value = '';
    }
  };

  const handleRemoveDraftAttachment = (attachmentId: string) => {
    setNewTeacher((prev) => ({
      ...prev,
      attachments: (prev.attachments || []).filter((attachment) => attachment.id !== attachmentId)
    }));
  };

  const odooFieldLabelClass = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500';
  const odooFieldClass =
    'h-11 w-full rounded-md border border-slate-200 bg-white px-3.5 text-sm text-slate-700 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100';

  return (
    <div className="p-8 max-w-[1600px] mx-auto bg-[#F8FAFC] min-h-screen font-sans text-slate-900">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Đội ngũ Giáo viên</h1>
          <p className="text-slate-500">Quản lý hồ sơ, hợp đồng và tình trạng hoạt động của giảng viên.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-bold shadow-sm transition-all"
        >
          <Plus size={18} /> Tạo Giáo viên mới
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="rounded-t-xl border-b border-slate-200 bg-slate-50/50 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-[360px] flex-[1.8]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Tìm theo tên, mã giáo viên, SDT..."
                  className="h-9 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-[13px] outline-none transition focus:border-slate-500"
                />
              </div>
            </div>

            <ToolbarTimeFilter
              isOpen={showTimePicker}
              fieldOptions={TEACHER_TOOLBAR_TIME_FIELD_OPTIONS}
              fieldPlaceholderValue={TEACHER_TOOLBAR_TIME_PLACEHOLDER}
              fieldPlaceholderLabel="Hành động"
              selectedField={timeFilterField}
              selectedRangeType={timeRangeType}
              customRange={customRange}
              presets={TEACHER_TIME_PRESETS}
              onOpenChange={handleTimeFilterOpenChange}
              onFieldChange={handleTimeFilterFieldChange}
              onPresetSelect={handleTimePresetSelect}
              onCustomRangeChange={setCustomRange}
              onReset={() => {
                setTimeFilterField(TEACHER_TOOLBAR_TIME_PLACEHOLDER);
                setTimeRangeType('all');
                setCustomRange(null);
                setShowTimePicker(false);
              }}
              onCancel={() => setShowTimePicker(false)}
              onApplyCustomRange={handleApplyCustomTimeRange}
              controlClassName="min-h-[36px] rounded-xl border-slate-300 shadow-none"
              fieldSectionClassName="bg-white"
              fieldSelectClassName="text-[13px]"
              rangeButtonClassName="px-2.5 text-[13px]"
              className="shrink-0"
            />

            <AdvancedFilterDropdown
              isOpen={showFilterDropdown}
              activeCount={advancedToolbarActiveCount}
              hasActiveFilters={hasAdvancedToolbarFilters}
              filterOptions={TEACHER_TOOLBAR_FILTER_OPTIONS}
              groupOptions={TEACHER_TOOLBAR_GROUP_OPTIONS}
              selectedFilterFieldIds={selectedAdvancedFilterFields}
              selectedGroupFieldIds={selectedAdvancedGroupFields}
              activeFilterField={activeAdvancedFilterField}
              selectableValues={advancedFilterSelectableValues}
              selectedFilterValue={activeAdvancedFilterField ? (selectedAdvancedFilterValues[activeAdvancedFilterField.id as TeacherToolbarFilterFieldKey] || '') : ''}
              selectedFilterValuesByField={selectedAdvancedFilterValues}
              selectableValuesByField={advancedFilterSelectableValuesByField}
              onOpenChange={handleAdvancedFilterOpenChange}
              onToggleFilterField={(fieldId) =>
                toggleAdvancedFieldSelection('filter', fieldId as TeacherToolbarFilterFieldKey)
              }
              onToggleGroupField={(fieldId) =>
                toggleAdvancedFieldSelection('group', fieldId as TeacherToolbarGroupFieldKey)
              }
              onFilterValueChange={() => undefined}
              onFilterValueChangeForField={(fieldId, value) =>
                handleAdvancedFilterValueChange(fieldId as TeacherToolbarFilterFieldKey, value)
              }
              onClearAll={() => {
                setSelectedAdvancedFilterFields([]);
                setSelectedAdvancedFilterValues({});
                setSelectedAdvancedGroupFields([]);
              }}
              triggerLabel="Lọc nâng cao"
              filterDescription="Chọn một hoặc nhiều trường rồi chọn giá trị tương ứng để lọc nhanh danh sách giáo viên."
              groupDescription="Có thể chọn nhiều trường. Thứ tự bấm sẽ là thứ tự ghép nhóm hiển thị trong bảng."
              triggerClassName="min-h-[36px] rounded-xl px-3 py-1.5 text-[13px] font-medium shadow-none"
              className="shrink-0"
            />

            {(searchTerm.trim() || filterStatus !== 'ALL' || timeRangeType !== 'all' || hasAdvancedToolbarFilters) ? (
              <button
                type="button"
                onClick={clearAllFilters}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-[13px] font-semibold text-slate-500 transition-colors hover:bg-slate-50"
              >
                Xóa lọc
              </button>
            ) : null}
          </div>

        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
          <div className="flex shrink-0 items-center rounded-lg border border-slate-200 bg-white p-1">
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`shrink-0 whitespace-nowrap rounded px-3 py-1.5 text-xs font-bold transition-all ${filterStatus === 'ALL' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setFilterStatus('ACTIVE')}
              className={`shrink-0 whitespace-nowrap rounded px-3 py-1.5 text-xs font-bold transition-all ${filterStatus === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              Đang hoạt động
            </button>
            <button
              onClick={() => setFilterStatus('INACTIVE')}
              className={`shrink-0 whitespace-nowrap rounded px-3 py-1.5 text-xs font-bold transition-all ${filterStatus === 'INACTIVE' ? 'bg-rose-50 text-rose-700' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              Đã nghỉ
            </button>
          </div>
          <div className="text-xs font-medium text-slate-500">Đang hiển thị {filteredRows.length} giáo viên.</div>
        </div>

        <div className="overflow-hidden rounded-b-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
            <thead className="bg-[#F8FAFC] border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-16 text-center">STT</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Họ tên / Định danh</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Chuyên môn</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Hợp đồng & Nhân sự</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Lớp đang nhận</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {selectedAdvancedGroupFields.length === 0 &&
                filteredRows.map((row, index) => {
                  const teacher = row.teacher;
                  return (
                    <tr
                      key={teacher.id}
                      className="cursor-pointer transition-colors group hover:bg-slate-50"
                      onClick={() => navigate(`/training/teachers/${teacher.id}`)}
                    >
                      <td className="px-6 py-4 text-center font-semibold text-slate-500">{index + 1}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-600">
                            {teacher.fullName.charAt(0)}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-900">{teacher.fullName}</div>
                            <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                              <span>{teacher.code}</span>
                              <span className="h-1 w-1 rounded-full bg-slate-300" />
                              <span className="flex items-center gap-1"><Phone size={10} /> {teacher.phone}</span>
                              <span className="h-1 w-1 rounded-full bg-slate-300" />
                              <span>{teacher.dob ? new Date(teacher.dob).toLocaleDateString('vi-VN') : teacher.birthYear || '-'}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="mb-1 flex flex-wrap gap-1">
                          {teacher.teachSubjects.map((lang) => (
                            <span key={lang} className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">{lang}</span>
                          ))}
                          {teacher.teachLevels.map((level) => (
                            <span key={level} className="rounded border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">{level}</span>
                          ))}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <Award size={12} className="text-amber-500" /> {teacher.certificates.join(', ') || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-700">{teacher.contractType}</div>
                        <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                          <Briefcase size={12} /> Vào làm: {new Date(teacher.startDate).toLocaleDateString('vi-VN')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${teacherStatusConfig[teacher.status].className}`}
                        >
                          {teacherStatusConfig[teacher.status].label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-bold ${row.classCount > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                          {row.classCount} lớp
                        </span>
                      </td>
                    </tr>
                  );
                })}
              {selectedAdvancedGroupFields.length > 0 &&
                (() => {
                  let currentIndex = 0;
                  return groupedRows.map((group) => {
                    const groupStartIndex = currentIndex;
                    currentIndex += group.rows.length;

                    return (
                      <React.Fragment key={group.key}>
                        <tr className="border-b border-slate-200 bg-slate-50">
                          <td colSpan={6} className="px-6 py-2 text-sm font-semibold text-slate-700">
                            <div className="flex items-center justify-between gap-3">
                              <span>{group.label}</span>
                              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-500">{group.rows.length} giáo viên</span>
                            </div>
                          </td>
                        </tr>
                        {group.rows.map((row, index) => {
                          const teacher = row.teacher;
                          return (
                            <tr
                              key={teacher.id}
                              className="cursor-pointer transition-colors group hover:bg-slate-50"
                              onClick={() => navigate(`/training/teachers/${teacher.id}`)}
                            >
                              <td className="px-6 py-4 text-center font-semibold text-slate-500">{groupStartIndex + index + 1}</td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-600">
                                    {teacher.fullName.charAt(0)}
                                  </div>
                                  <div>
                                    <div className="text-sm font-bold text-slate-900">{teacher.fullName}</div>
                                    <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                                      <span>{teacher.code}</span>
                                      <span className="h-1 w-1 rounded-full bg-slate-300" />
                                      <span className="flex items-center gap-1"><Phone size={10} /> {teacher.phone}</span>
                                      <span className="h-1 w-1 rounded-full bg-slate-300" />
                                      <span>{teacher.dob ? new Date(teacher.dob).toLocaleDateString('vi-VN') : teacher.birthYear || '-'}</span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="mb-1 flex flex-wrap gap-1">
                                  {teacher.teachSubjects.map((lang) => (
                                    <span key={lang} className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">{lang}</span>
                                  ))}
                                  {teacher.teachLevels.map((level) => (
                                    <span key={level} className="rounded border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">{level}</span>
                                  ))}
                                </div>
                                <div className="flex items-center gap-1 text-xs text-slate-500">
                                  <Award size={12} className="text-amber-500" /> {teacher.certificates.join(', ') || '-'}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm font-medium text-slate-700">{teacher.contractType}</div>
                                <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                                  <Briefcase size={12} /> Vào làm: {new Date(teacher.startDate).toLocaleDateString('vi-VN')}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span
                                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${teacherStatusConfig[teacher.status].className}`}
                                >
                                  {teacherStatusConfig[teacher.status].label}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-bold ${row.classCount > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                                  {row.classCount} lớp
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  });
                })()}
            </tbody>
            </table>
          </div>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/45 backdrop-blur-[2px]">
          <div className="flex min-h-full items-center justify-center p-4 md:p-6">
            <div className="w-full max-w-5xl overflow-hidden rounded-2xl border border-sky-100 bg-[#f5faff] shadow-[0_28px_80px_rgba(15,23,42,0.22)]">
              <div className="border-b border-sky-100 bg-white/95 px-6 py-5 md:px-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="mb-2 inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
                      Teacher Form
                    </div>
                    <h3 className="text-[28px] font-semibold tracking-tight text-slate-900">Tạo Giáo viên mới</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Biểu mẫu hồ sơ theo kiểu sheet của Odoo, giữ nguyên dữ liệu và quy trình tạo giáo viên.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-xl text-slate-400 transition hover:border-slate-300 hover:text-slate-600"
                    aria-label="Đóng"
                  >
                    &times;
                  </button>
                </div>
              </div>

              <form onSubmit={handleCreateTeacher} className="px-6 py-6 md:px-7">
                <div className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.06)]">
                  <div className="border-b border-sky-100 bg-[#f4faff] px-5 py-3.5">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-md border border-sky-200 bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">Form</span>
                      <span className="rounded-md border border-sky-100 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                        Hồ sơ giáo viên
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
                    <section className="rounded-xl border border-slate-200 bg-[#fcfcfd] p-5">
                      <div className="mb-5 flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-100 text-sm font-bold text-sky-700">
                          1
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-700">Thông tin cá nhân</h4>
                          <p className="text-xs text-slate-500">Thông tin nhận diện và liên hệ cơ bản của giáo viên.</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className={odooFieldLabelClass}>Họ và tên</label>
                          <input
                            required
                            className={odooFieldClass}
                            value={newTeacher.fullName || ''}
                            onChange={(e) => setNewTeacher({ ...newTeacher, fullName: e.target.value })}
                          />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <label className={odooFieldLabelClass}>Ngày sinh</label>
                            <input
                              type="date"
                              className={odooFieldClass}
                              value={newTeacher.dob || ''}
                              onChange={(e) => setNewTeacher({ ...newTeacher, dob: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className={odooFieldLabelClass}>Số điện thoại</label>
                            <input
                              required
                              className={odooFieldClass}
                              value={newTeacher.phone || ''}
                              onChange={(e) => setNewTeacher({ ...newTeacher, phone: e.target.value })}
                            />
                          </div>
                        </div>

                        <div>
                          <label className={odooFieldLabelClass}>Email</label>
                          <input
                            type="email"
                            className={odooFieldClass}
                            value={newTeacher.email || ''}
                            onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })}
                          />
                        </div>
                      </div>
                    </section>

                    <section className="rounded-xl border border-slate-200 bg-[#fcfcfd] p-5">
                      <div className="mb-5 flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-100 text-sm font-bold text-sky-700">
                          2
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-700">Chuyên môn và hợp đồng</h4>
                          <p className="text-xs text-slate-500">Nhóm trường phục vụ phân công giảng dạy và quản trị nhân sự.</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <label className={odooFieldLabelClass}>Loại hợp đồng</label>
                            <select
                              className={odooFieldClass}
                              value={newTeacher.contractType || 'Full-time'}
                              onChange={(e) => setNewTeacher({ ...newTeacher, contractType: e.target.value as ITeacher['contractType'] })}
                            >
                              <option value="Full-time">Full-time</option>
                              <option value="Part-time">Part-time</option>
                              <option value="CTV">CTV</option>
                            </select>
                          </div>
                          <div>
                            <label className={odooFieldLabelClass}>Ngày vào làm</label>
                            <input
                              type="date"
                              className={odooFieldClass}
                              value={newTeacher.startDate || ''}
                              onChange={(e) => setNewTeacher({ ...newTeacher, startDate: e.target.value })}
                            />
                          </div>
                        </div>

                        <div>
                          <label className={odooFieldLabelClass}>Trình độ có thể dạy</label>
                          <input
                            placeholder="Ví dụ: A1, A2, IELTS"
                            className={odooFieldClass}
                            value={newTeacher.teachLevels?.join(', ') || ''}
                            onChange={(e) => setNewTeacher({ ...newTeacher, teachLevels: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                          />
                        </div>

                        <div>
                          <label className={odooFieldLabelClass}>Môn dạy</label>
                          <input
                            placeholder="Ví dụ: German, English"
                            className={odooFieldClass}
                            value={newTeacher.teachSubjects?.join(', ') || ''}
                            onChange={(e) => setNewTeacher({ ...newTeacher, teachSubjects: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                          />
                        </div>

                        <div>
                          <label className={odooFieldLabelClass}>Bằng cấp / chứng chỉ</label>
                          <input
                            className={odooFieldClass}
                            value={newTeacher.certificates?.join(', ') || ''}
                            onChange={(e) => setNewTeacher({ ...newTeacher, certificates: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                          />
                        </div>
                      </div>
                    </section>

                    <section className="rounded-xl border border-slate-200 bg-[#fcfcfd] p-5 xl:col-span-2">
                      <div className="mb-5 flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-100 text-sm font-bold text-sky-700">
                          3
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-700">Hồ sơ đính kèm</h4>
                          <p className="text-xs text-slate-500">Lưu CV, bằng cấp scan và các giấy tờ nội bộ trực tiếp trong hồ sơ giáo viên.</p>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-dashed border-sky-200 bg-sky-50/40 p-4">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div>
                            <div className="text-sm font-semibold text-slate-700">Tệp hồ sơ giáo viên</div>
                            <p className="mt-1 text-xs text-slate-500">Hỗ trợ PDF, ảnh, Word, Excel. Mỗi tệp tối đa 3MB vì dữ liệu đang lưu trong local storage.</p>
                          </div>
                          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-sky-200 bg-white px-4 py-2 text-sm font-semibold text-sky-700 transition hover:border-sky-300 hover:bg-sky-50">
                            <Paperclip size={15} />
                            {isProcessingAttachments ? 'Đang tải...' : 'Thêm hồ sơ'}
                            <input
                              type="file"
                              multiple
                              accept={DEFAULT_ATTACHMENT_ACCEPT}
                              className="hidden"
                              disabled={isProcessingAttachments}
                              onChange={handleDraftAttachmentSelect}
                            />
                          </label>
                        </div>

                        {newTeacher.attachments && newTeacher.attachments.length > 0 ? (
                          <div className="mt-4 grid gap-2 md:grid-cols-2">
                            {newTeacher.attachments.map((attachment) => (
                              <div
                                key={attachment.id}
                                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2"
                              >
                                <div className="flex min-w-0 items-center gap-2">
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                                    <FileText size={14} />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="truncate text-sm font-medium text-slate-700">{attachment.name}</div>
                                    <div className="text-xs text-slate-400">Sẽ được lưu cùng hồ sơ giáo viên</div>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDraftAttachment(attachment.id)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 text-rose-600 transition hover:bg-rose-50"
                                  aria-label={`Xóa ${attachment.name}`}
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
                            Chưa có hồ sơ đính kèm.
                          </div>
                        )}
                      </div>
                    </section>
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-sky-100 bg-white/90 px-5 py-4 md:flex-row md:items-center md:justify-between">
                  <div className="text-sm text-slate-500">
                    Giữ nguyên toàn bộ trường dữ liệu hiện có, chỉ tinh chỉnh bố cục và phong cách hiển thị.
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="rounded-md border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      disabled={isProcessingAttachments}
                      className="rounded-md bg-sky-400 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-500"
                    >
                      {isProcessingAttachments ? 'Đang xử lý hồ sơ...' : 'Lưu Giáo viên'}
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

export default TrainingTeachers;
