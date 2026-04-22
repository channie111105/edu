import React, { useMemo, useState } from 'react';
import { DragDropContext, Draggable, Droppable, DropResult } from '@hello-pangea/dnd';
import { GraduationCap, RotateCcw, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import KanbanCard from '../components/KanbanCard';
import { AdvancedFilterDropdown, ToolbarTimeFilter } from '../components/filters';
import { useAuth } from '../contexts/AuthContext';
import { StageId, useKanbanCases } from '../hooks/useKanbanCases';
import { UserRole } from '../types';
import { CustomDateRange, doesDateMatchTimeRange } from '../utils/filterToolbar';
import {
  buildStudyAbroadSelectableValuesByField,
  DEFAULT_STUDY_ABROAD_TIME_FIELD,
  formatStudyAbroadAdvancedFieldValue,
  getStudyAbroadAdvancedFieldDisplayValue,
  getStudyAbroadAdvancedFieldValues,
  getStudyAbroadTimeFieldValue,
  normalizeStudyAbroadSearch,
  STUDY_ABROAD_TIME_PRESETS,
  STUDY_ABROAD_TOOLBAR_FILTER_OPTIONS,
  STUDY_ABROAD_TOOLBAR_GROUP_OPTIONS,
  STUDY_ABROAD_TOOLBAR_TIME_FIELD_OPTIONS,
  STUDY_ABROAD_TOOLBAR_TIME_PLACEHOLDER,
  StudyAbroadAdvancedFieldKey,
  StudyAbroadAdvancedGroupFieldKey,
  StudyAbroadTimeFieldSelection
} from '../utils/studyAbroadToolbar';

const StudyAbroadPipelineBoard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const actorName = user?.name || 'Study Abroad';

  const [searchTerm, setSearchTerm] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timeFilterField, setTimeFilterField] = useState<StudyAbroadTimeFieldSelection>(STUDY_ABROAD_TOOLBAR_TIME_PLACEHOLDER);
  const [timeRangeType, setTimeRangeType] = useState<(typeof STUDY_ABROAD_TIME_PRESETS)[number]['id']>('all');
  const [customRange, setCustomRange] = useState<CustomDateRange | null>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [selectedAdvancedFilterFields, setSelectedAdvancedFilterFields] = useState<StudyAbroadAdvancedFieldKey[]>([]);
  const [selectedAdvancedFilterValues, setSelectedAdvancedFilterValues] = useState<Partial<Record<StudyAbroadAdvancedFieldKey, string>>>({});
  const [selectedAdvancedGroupFields, setSelectedAdvancedGroupFields] = useState<StudyAbroadAdvancedGroupFieldKey[]>([]);

  const { loading, rows, stageData, stages, saveInternalNote, updateCaseStage } = useKanbanCases(actorName);
  const canViewAllCases = user?.role === UserRole.ADMIN || user?.role === UserRole.FOUNDER;

  const scopedRows = useMemo(() => {
    if (!user || canViewAllCases) return rows;
    const currentUserName = normalizeStudyAbroadSearch(user.name);
    return rows.filter((row) => normalizeStudyAbroadSearch(row.salesperson) === currentUserName);
  }, [canViewAllCases, rows, user]);

  const scopedRowsById = useMemo(
    () => new Map(scopedRows.map((row) => [row.id, row])),
    [scopedRows]
  );

  const selectedAdvancedFilterOptions = useMemo(
    () =>
      selectedAdvancedFilterFields
        .map((fieldId) => STUDY_ABROAD_TOOLBAR_FILTER_OPTIONS.find((option) => option.id === fieldId))
        .filter((option): option is (typeof STUDY_ABROAD_TOOLBAR_FILTER_OPTIONS)[number] => Boolean(option)),
    [selectedAdvancedFilterFields]
  );
  const activeAdvancedFilterField = selectedAdvancedFilterOptions[0] || null;
  const selectedAdvancedFilterEntries = Object.entries(selectedAdvancedFilterValues).filter(
    (entry): entry is [StudyAbroadAdvancedFieldKey, string] => Boolean(entry[1])
  );
  const resolvedTimeFilterField =
    timeFilterField === STUDY_ABROAD_TOOLBAR_TIME_PLACEHOLDER ? DEFAULT_STUDY_ABROAD_TIME_FIELD : timeFilterField;

  const advancedFilterSelectableValuesByField = useMemo(
    () => buildStudyAbroadSelectableValuesByField(scopedRows, selectedAdvancedFilterFields),
    [scopedRows, selectedAdvancedFilterFields]
  );
  const advancedFilterSelectableValues =
    (activeAdvancedFilterField
      ? advancedFilterSelectableValuesByField[activeAdvancedFilterField.id as StudyAbroadAdvancedFieldKey]
      : []) || [];

  const visibleData = useMemo(() => {
    const keyword = normalizeStudyAbroadSearch(searchTerm);

    return stages.reduce((accumulator, stage) => {
      const filteredItems = stageData[stage.id].filter((item) => {
        const row = scopedRowsById.get(item.id);
        if (!row) return false;

        if (keyword) {
          const searchable = normalizeStudyAbroadSearch(
            [
              row.soCode,
              row.student,
              row.address,
              row.phone,
              row.country,
              row.program,
              row.major,
              row.salesperson,
              row.branch,
              row.intake,
              row.stage,
              row.certificate,
              row.expectedFlightTerm,
              row.processorName,
              row.internalNote || ''
            ].join(' ')
          );

          if (!searchable.includes(keyword)) {
            return false;
          }
        }

        if (
          timeRangeType !== 'all' &&
          !doesDateMatchTimeRange(
            getStudyAbroadTimeFieldValue(row, resolvedTimeFilterField),
            timeRangeType,
            customRange
          )
        ) {
          return false;
        }

        if (
          selectedAdvancedFilterEntries.some(
            ([fieldId, selectedValue]) => !getStudyAbroadAdvancedFieldValues(row, fieldId).includes(selectedValue)
          )
        ) {
          return false;
        }

        return true;
      });

      accumulator[stage.id] =
        selectedAdvancedGroupFields.length > 0
          ? [...filteredItems].sort((left, right) => {
              const leftRow = scopedRowsById.get(left.id);
              const rightRow = scopedRowsById.get(right.id);

              if (leftRow && rightRow) {
                const leftGroup = selectedAdvancedGroupFields
                  .map((fieldId) => getStudyAbroadAdvancedFieldDisplayValue(leftRow, fieldId))
                  .join('||');
                const rightGroup = selectedAdvancedGroupFields
                  .map((fieldId) => getStudyAbroadAdvancedFieldDisplayValue(rightRow, fieldId))
                  .join('||');
                const groupCompare = leftGroup.localeCompare(rightGroup, 'vi');
                if (groupCompare !== 0) return groupCompare;
              }

              return left.studentName.localeCompare(right.studentName, 'vi');
            })
          : filteredItems;

      return accumulator;
    }, {} as typeof stageData);
  }, [
    customRange,
    resolvedTimeFilterField,
    scopedRowsById,
    searchTerm,
    selectedAdvancedFilterEntries,
    selectedAdvancedGroupFields,
    stageData,
    stages,
    timeRangeType
  ]);

  const visibleCount = useMemo(
    () => stages.reduce((sum, stage) => sum + (visibleData[stage.id]?.length || 0), 0),
    [stages, visibleData]
  );

  const advancedToolbarActiveCount =
    selectedAdvancedGroupFields.length + selectedAdvancedFilterEntries.length;
  const hasAdvancedToolbarFilters =
    selectedAdvancedGroupFields.length > 0 || selectedAdvancedFilterEntries.length > 0;
  const hasToolbarFilters = Boolean(searchTerm.trim()) || timeRangeType !== 'all' || hasAdvancedToolbarFilters;

  const clearAllFilters = () => {
    setSearchTerm('');
    setShowTimePicker(false);
    setTimeFilterField(STUDY_ABROAD_TOOLBAR_TIME_PLACEHOLDER);
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
    setTimeFilterField(fieldId as StudyAbroadTimeFieldSelection);
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
    window.alert('Vui lòng chọn khoảng ngày');
  };

  const handleAdvancedFilterOpenChange = (nextOpen: boolean) => {
    setShowTimePicker(false);
    setShowFilterDropdown(nextOpen);
  };

  const toggleAdvancedFieldSelection = (
    type: 'filter' | 'group',
    fieldId: StudyAbroadAdvancedFieldKey | StudyAbroadAdvancedGroupFieldKey
  ) => {
    if (type === 'filter') {
      const resolvedFieldId = fieldId as StudyAbroadAdvancedFieldKey;

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
      prev.includes(fieldId as StudyAbroadAdvancedGroupFieldKey)
        ? prev.filter((item) => item !== fieldId)
        : [...prev, fieldId as StudyAbroadAdvancedGroupFieldKey]
    );
  };

  const handleAdvancedFilterValueChange = (fieldId: StudyAbroadAdvancedFieldKey, value: string) => {
    setSelectedAdvancedFilterValues((prev) => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (hasToolbarFilters) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    void updateCaseStage(draggableId, destination.droppableId as StageId, {
      destinationIndex: destination.index,
      actorName
    });
  };

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col overflow-hidden bg-[#f8fafc]">
      <div className="border-b border-slate-200 bg-white px-6 py-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="flex min-w-72 flex-col gap-1">
            <h1 className="flex items-center gap-2 text-[20px] font-bold text-slate-900">
              <GraduationCap size={22} className="text-blue-600" />
              Quy trình Hồ sơ Du học
            </h1>
            <p className="text-sm text-slate-500">
              Quản lý trạng thái hồ sơ học viên theo quy trình kanban.
            </p>
          </div>
        </div>

        <div className="overflow-visible rounded-2xl border border-[#cfdbe7] bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
            >
              <RotateCcw size={16} />
              Đặt lại
            </button>

            <ToolbarTimeFilter
              isOpen={showTimePicker}
              fieldOptions={STUDY_ABROAD_TOOLBAR_TIME_FIELD_OPTIONS}
              fieldPlaceholderValue={STUDY_ABROAD_TOOLBAR_TIME_PLACEHOLDER}
              fieldPlaceholderLabel="Hành động"
              selectedField={timeFilterField}
              selectedRangeType={timeRangeType}
              customRange={customRange}
              presets={STUDY_ABROAD_TIME_PRESETS}
              onOpenChange={handleTimeFilterOpenChange}
              onFieldChange={handleTimeFilterFieldChange}
              onPresetSelect={handleTimePresetSelect}
              onCustomRangeChange={setCustomRange}
              onReset={() => {
                setTimeFilterField(STUDY_ABROAD_TOOLBAR_TIME_PLACEHOLDER);
                setTimeRangeType('all');
                setCustomRange(null);
                setShowTimePicker(false);
              }}
              onCancel={() => setShowTimePicker(false)}
              onApplyCustomRange={handleApplyCustomTimeRange}
              controlClassName="min-h-[36px] rounded-xl border-[#cfdbe7] shadow-none"
              fieldSectionClassName="bg-white"
              fieldSelectClassName="text-[13px]"
              rangeButtonClassName="px-2.5 text-[13px]"
              className="shrink-0"
              panelAlign="left"
            />

            <div className="min-w-[320px] flex-[1.6]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Tìm kiếm học viên, mã hồ sơ, sale, SDT..."
                  className="h-9 w-full rounded-xl border border-[#cfdbe7] bg-[#f8fafc] pl-10 pr-4 text-[13px] outline-none transition focus:border-slate-400"
                />
              </div>
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-3">
              <AdvancedFilterDropdown
                isOpen={showFilterDropdown}
                activeCount={advancedToolbarActiveCount}
                hasActiveFilters={hasAdvancedToolbarFilters}
                filterOptions={STUDY_ABROAD_TOOLBAR_FILTER_OPTIONS}
                groupOptions={STUDY_ABROAD_TOOLBAR_GROUP_OPTIONS}
                selectedFilterFieldIds={selectedAdvancedFilterFields}
                selectedGroupFieldIds={selectedAdvancedGroupFields}
                activeFilterField={activeAdvancedFilterField}
                selectableValues={advancedFilterSelectableValues}
                selectedFilterValue={
                  activeAdvancedFilterField
                    ? selectedAdvancedFilterValues[activeAdvancedFilterField.id as StudyAbroadAdvancedFieldKey] || ''
                    : ''
                }
                selectedFilterValuesByField={selectedAdvancedFilterValues}
                selectableValuesByField={advancedFilterSelectableValuesByField}
                onOpenChange={handleAdvancedFilterOpenChange}
                onToggleFilterField={(fieldId) =>
                  toggleAdvancedFieldSelection('filter', fieldId as StudyAbroadAdvancedFieldKey)
                }
                onToggleGroupField={(fieldId) =>
                  toggleAdvancedFieldSelection('group', fieldId as StudyAbroadAdvancedGroupFieldKey)
                }
                onFilterValueChange={() => undefined}
                onFilterValueChangeForField={(fieldId, value) =>
                  handleAdvancedFilterValueChange(fieldId as StudyAbroadAdvancedFieldKey, value)
                }
                onClearAll={() => {
                  setSelectedAdvancedFilterFields([]);
                  setSelectedAdvancedFilterValues({});
                  setSelectedAdvancedGroupFields([]);
                }}
                triggerLabel="Lọc nâng cao"
                filterDescription="Chọn một hoặc nhiều trường rồi chọn giá trị tương ứng để lọc nhanh danh sách hồ sơ du học."
                groupDescription="Có thể chọn nhiều trường. Thứ tự bấm sẽ là thứ tự ưu tiên sắp xếp thẻ trong từng cột."
                triggerClassName="min-h-[36px] rounded-xl px-3 py-1.5 text-[13px] font-medium shadow-none"
                className="shrink-0"
              />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#e7edf3] pt-3">
            <div className="text-xs text-slate-500">
              Đang hiển thị {loading ? '...' : visibleCount} hồ sơ.
              {hasToolbarFilters
                ? ' Đang bật bộ lọc hoặc sắp xếp, tạm khóa kéo thả.'
                : ' Có thể kéo thả trực tiếp giữa các cột.'}
            </div>
            {hasToolbarFilters ? (
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-xs font-semibold text-slate-500 transition-colors hover:text-slate-700"
              >
                Xóa lọc
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden p-5">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex h-full min-w-max gap-3">
            {stages.map((stage) => (
              <div key={stage.id} className="flex h-full w-72 flex-col rounded-lg border border-slate-200 bg-[#f8fafc]">
                <div className="flex items-center justify-between rounded-t-lg border-b border-slate-200 bg-[#f8fafc] px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${stage.color}`} />
                    <h3 className="text-[11px] font-bold uppercase tracking-[0.04em] text-slate-700">{stage.title}</h3>
                  </div>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-600">
                    {visibleData[stage.id]?.length || 0}
                  </span>
                </div>

                <Droppable droppableId={stage.id}>
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={`flex-1 space-y-2 overflow-y-auto p-2.5 transition-all ${
                        snapshot.isDraggingOver && !hasToolbarFilters
                          ? 'rounded-b-lg border-2 border-dashed border-blue-300 bg-blue-50/60'
                          : 'border-2 border-transparent'
                      }`}
                    >
                      {loading ? (
                        Array.from({ length: 3 }).map((_, index) => (
                          <div key={`${stage.id}-skeleton-${index}`} className="h-20 animate-pulse rounded-lg bg-white" />
                        ))
                      ) : (
                        <>
                          {visibleData[stage.id].map((item, index) => (
                            <Draggable key={item.id} draggableId={item.id} index={index} isDragDisabled={hasToolbarFilters}>
                              {(dragProvided, dragSnapshot) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  {...dragProvided.dragHandleProps}
                                  className="cursor-grab active:cursor-grabbing"
                                >
                                  <KanbanCard
                                    item={item}
                                    isDragging={dragSnapshot.isDragging}
                                    stageOptions={stages.map((entry) => ({ id: entry.id, title: entry.title }))}
                                    onOpenCase={(caseId) => navigate(`/study-abroad/cases/${caseId}`)}
                                    onSaveInternalNote={(caseId, note) => saveInternalNote(caseId, note, actorName)}
                                    onUpdateStage={(caseId, stageId) =>
                                      updateCaseStage(caseId, stageId as StageId, { destinationIndex: 0, actorName })
                                    }
                                  />
                                </div>
                              )}
                            </Draggable>
                          ))}

                          {!visibleData[stage.id].length ? (
                            <div className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-5 text-center text-[11px] text-slate-400">
                              Chưa có hồ sơ
                            </div>
                          ) : null}
                        </>
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
};

export default StudyAbroadPipelineBoard;
