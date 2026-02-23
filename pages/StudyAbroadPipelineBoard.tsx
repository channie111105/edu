import React, { useMemo, useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Filter, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import KanbanCard from '../components/KanbanCard';
import { useAuth } from '../contexts/AuthContext';
import { StageId, useKanbanCases } from '../hooks/useKanbanCases';

const normalizeSearch = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const StudyAbroadPipelineBoard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const actorName = user?.name || 'Study Abroad';

  const [searchTerm, setSearchTerm] = useState('');
  const { loading, totalCount, stageData, stages, saveInternalNote, updateCaseStage } = useKanbanCases(actorName);

  const hasSearch = searchTerm.trim().length > 0;

  const visibleData = useMemo(() => {
    if (!hasSearch) return stageData;
    const keyword = normalizeSearch(searchTerm);

    const filtered = stages.reduce((acc, stage) => {
      acc[stage.id] = stageData[stage.id].filter((item) => {
        const searchable = normalizeSearch(
          [item.studentName, item.program, item.country, item.assignedTo, item.internalNote || ''].join(' ')
        );
        return searchable.includes(keyword);
      });
      return acc;
    }, {} as typeof stageData);

    return filtered;
  }, [hasSearch, searchTerm, stageData, stages]);

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (hasSearch) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    void updateCaseStage(draggableId, destination.droppableId as StageId, {
      destinationIndex: destination.index,
      actorName
    });
  };

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col overflow-hidden bg-gray-50 font-sans">
      <div className="z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Quy trình Hồ sơ Du học</h1>
          <p className="text-sm text-gray-500">Quản lý trạng thái hồ sơ học viên theo quy trình kanban</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Tìm kiếm hồ sơ..."
              className="w-64 rounded-lg border-none bg-gray-100 py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Filter size={16} /> Lọc
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex h-full min-w-max gap-4">
            {stages.map((stage) => (
              <div key={stage.id} className="flex h-full w-80 flex-col rounded-xl border border-gray-200/70 bg-gray-100/50">
                <div className="flex items-center justify-between rounded-t-xl border-b border-gray-200 bg-white px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className={`h-3 w-3 rounded-full ${stage.color}`} />
                    <h3 className="text-xs font-bold uppercase text-gray-700">{stage.title}</h3>
                  </div>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                    {visibleData[stage.id]?.length || 0}
                  </span>
                </div>

                <Droppable droppableId={stage.id}>
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={`flex-1 space-y-3 overflow-y-auto p-3 transition-all ${
                        snapshot.isDraggingOver
                          ? 'rounded-b-xl border-2 border-dashed border-blue-300 bg-blue-50/60'
                          : 'border-2 border-transparent'
                      }`}
                    >
                      {loading ? (
                        Array.from({ length: 3 }).map((_, index) => (
                          <div key={`${stage.id}-skeleton-${index}`} className="h-24 animate-pulse rounded-lg bg-white/80" />
                        ))
                      ) : (
                        <>
                          {visibleData[stage.id].map((item, index) => (
                            <Draggable key={item.id} draggableId={item.id} index={index} isDragDisabled={hasSearch}>
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
                            <div className="rounded-lg border border-dashed border-gray-200 bg-white/80 px-3 py-6 text-center text-xs text-gray-400">
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

      <div className="border-t border-transparent px-6 pb-2 text-[11px] text-slate-500">
        Đang hiển thị {totalCount} hồ sơ.
        {hasSearch ? ' Đang bật lọc theo từ khóa, tạm khóa kéo thả (dùng menu 3 chấm để chuyển stage).' : ''}
      </div>
    </div>
  );
};

export default StudyAbroadPipelineBoard;
