import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import {
    MoreHorizontal,
    Search,
    Filter,
    GraduationCap,
    DollarSign,
    AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// --- Types ---

interface PipelineStage {
    id: string;
    title: string;
    color: string;
}

interface PipelineItem {
    id: string;
    studentName: string;
    program: string;
    country: string;
    value: string;
    startDate: string;
    assignedTo: string;
    noOfferWarning?: boolean; // Tag warning defined in requirements
}

interface PipelineData {
    [key: string]: PipelineItem[];
}

// --- Mock Data ---

const STAGES: PipelineStage[] = [
    { id: 'stage-1', title: 'Hồ sơ mới', color: 'bg-slate-500' },
    { id: 'stage-2', title: 'Đã chọn chương trình', color: 'bg-blue-500' },
    { id: 'stage-3', title: 'Đã phỏng vấn trường/DN', color: 'bg-indigo-500' },
    { id: 'stage-4', title: 'Đã có thư mời', color: 'bg-purple-500' },
    { id: 'stage-5', title: 'Đã có lịch hẹn ĐSQ', color: 'bg-orange-500' },
    { id: 'stage-6', title: 'Có Visa', color: 'bg-green-500' },
    { id: 'stage-7', title: 'Đã bay', color: 'bg-emerald-600' },
];

const INITIAL_DATA: PipelineData = {
    'stage-1': [
        { id: 'item-1', studentName: 'Nguyễn Văn A', program: 'Du học Đức', country: 'Đức', value: '2.500$', startDate: '2023-10-01', assignedTo: 'Sarah M' },
        { id: 'item-2', studentName: 'Trần Thị B', program: 'Du học Hàn', country: 'Hàn Quốc', value: '1.800$', startDate: '2023-09-28', assignedTo: 'John D' },
    ],
    'stage-2': [
        { id: 'item-3', studentName: 'Lê Văn C', program: 'Du học Úc', country: 'Úc', value: '4.000$', startDate: '2023-09-15', assignedTo: 'Sarah M' },
    ],
    'stage-3': [
        { id: 'item-4', studentName: 'Phạm Thị D', program: 'Du học Canada', country: 'Canada', value: '3.500$', startDate: '2023-08-20', assignedTo: 'Mike T', noOfferWarning: true },
        { id: 'item-5', studentName: 'Hoàng Văn E', program: 'Du học Đức', country: 'Đức', value: '2.500$', startDate: '2023-09-01', assignedTo: 'Sarah M' },
    ],
    'stage-4': [],
    'stage-5': [
        { id: 'item-6', studentName: 'Đặng Thị F', program: 'Du học Đức', country: 'Đức', value: '2.500$', startDate: '2023-06-15', assignedTo: 'Sarah M' },
    ],
    'stage-6': [],
    'stage-7': [],
};

const StudyAbroadPipelineBoard = () => {
    const [data, setData] = useState<PipelineData>(INITIAL_DATA);
    const navigate = useNavigate();

    const onDragEnd = (result: DropResult) => {
        const { source, destination } = result;

        if (!destination) {
            return;
        }

        if (
            source.droppableId === destination.droppableId &&
            source.index === destination.index
        ) {
            return;
        }

        const sourceList = [...data[source.droppableId]];
        const destList = source.droppableId === destination.droppableId ? sourceList : [...data[destination.droppableId]];

        const [removed] = sourceList.splice(source.index, 1);
        destList.splice(destination.index, 0, removed);

        if (source.droppableId === destination.droppableId) {
            setData({
                ...data,
                [source.droppableId]: sourceList
            });
        } else {
            setData({
                ...data,
                [source.droppableId]: sourceList,
                [destination.droppableId]: destList
            });

            // --- AUTOMATION MOCK --- 
            // In a real app, this would trigger an API call to create an activity
            console.log(`[Automation] Created activity log for student ${removed.studentName}: Moved to stage ${destination.droppableId}`);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-gray-50 font-sans">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                <div>
                    <h1 className="text-xl font-bold text-gray-800">Quy trình Hồ sơ Du học</h1>
                    <p className="text-sm text-gray-500">Quản lý trạng thái hồ sơ học viên theo quy trình kanban</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm hồ sơ..."
                            className="pl-10 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500 w-64"
                        />
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 text-gray-700">
                        <Filter size={16} /> Lọc
                    </button>
                    {/* Removed 'Add Profile' button to enforce automated flow */}
                </div>
            </div>

            {/* Kanban Board */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="flex h-full gap-4 min-w-max">
                        {STAGES.map((stage) => (
                            <div key={stage.id} className="w-80 flex flex-col h-full rounded-xl bg-gray-100/50 border border-gray-200/60">
                                {/* Column Header */}
                                <div className={`px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-white rounded-t-xl`}>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-3 h-3 rounded-full ${stage.color}`}></div>
                                        <h3 className="font-bold text-gray-700 text-xs uppercase">{stage.title}</h3>
                                    </div>
                                    <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                        {data[stage.id]?.length || 0}
                                    </span>
                                </div>

                                {/* Droppable Area */}
                                <Droppable droppableId={stage.id}>
                                    {(provided, snapshot) => (
                                        <div
                                            {...provided.droppableProps}
                                            ref={provided.innerRef}
                                            className={`flex-1 overflow-y-auto p-3 space-y-3 transition-colors ${snapshot.isDraggingOver ? 'bg-blue-50/50' : ''}`}
                                        >
                                            {data[stage.id]?.map((item, index) => (
                                                <Draggable key={item.id} draggableId={item.id} index={index}>
                                                    {(provided, snapshot) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            onClick={() => navigate(`/study-abroad/cases/${item.id}`)}
                                                            className={`bg-white rounded-lg p-3 shadow-sm border border-gray-200 cursor-pointer group hover:border-blue-300 hover:shadow-md transition-all
                                                        ${snapshot.isDragging ? 'shadow-lg rotate-1' : ''}
                                                    `}
                                                        >
                                                            <div className="flex justify-between items-start mb-2">
                                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 uppercase tracking-tighter">
                                                                    {item.country}
                                                                </span>
                                                                <div className="flex items-center gap-1">
                                                                    {item.noOfferWarning && (
                                                                        <span className="flex items-center gap-1 px-1.5 py-0.5 bg-red-100 text-red-600 rounded text-[10px] font-bold animate-pulse" title="Hồ sơ đang bị chậm thư mời">
                                                                            <AlertCircle size={10} /> Chưa có thư mời
                                                                        </span>
                                                                    )}
                                                                    <button className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100">
                                                                        <MoreHorizontal size={14} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <h4 className="font-bold text-gray-900 mb-1">{item.studentName}</h4>
                                                            <p className="text-xs text-gray-500 mb-3 flex items-center gap-1">
                                                                <GraduationCap size={12} /> {item.program}
                                                            </p>

                                                            {/* Internal Note Area (Clicking opens Detail, this is mockup for quick info) */}
                                                            <div className="mb-3">
                                                                <input
                                                                    type="text"
                                                                    placeholder="Ghi chú nội bộ..."
                                                                    className="w-full text-xs border-b border-gray-100 py-1 focus:border-blue-400 focus:outline-none placeholder:text-gray-300 bg-transparent"
                                                                    onClick={(e) => e.stopPropagation()} // Prevent card click
                                                                />
                                                            </div>

                                                            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                                                <div className="flex items-center gap-1 text-xs text-gray-500" title="Expected Value">
                                                                    <DollarSign size={12} className="text-green-600" />
                                                                    <span className="font-medium text-green-700">{item.value}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1.5">
                                                                    <div className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-[10px] font-bold" title={`Assigned to ${item.assignedTo}`}>
                                                                        {item.assignedTo.charAt(0)}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </Draggable>
                                            ))}
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
