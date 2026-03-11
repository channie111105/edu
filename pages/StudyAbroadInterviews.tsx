import React, { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle2,
  Clock,
  Calendar,
  Search,
  Filter,
  MapPin,
  Pencil,
  Trash2,
  Bell
} from 'lucide-react';
import PinnedSearchInput, { PinnedSearchChip } from '../components/PinnedSearchInput';

type InterviewStatus = 'Scheduled' | 'Pending' | 'Completed' | 'Cancelled';
type InterviewType = 'Visa' | 'Entrance Exam';

interface InterviewItem {
  id: number;
  date: string;
  time: string;
  studentName: string;
  type: InterviewType;
  subType: string;
  location: string;
  status: InterviewStatus;
  reminded: boolean;
  channel: string;
}

const INTERVIEW_DATA: InterviewItem[] = [
  {
    id: 1,
    date: '10/09/2026',
    time: '09:00',
    studentName: 'Nguyễn Thùy Linh',
    type: 'Visa',
    subType: 'Đức',
    location: 'Đại sứ quán Đức (Hà Nội)',
    status: 'Scheduled',
    reminded: true,
    channel: 'Zalo'
  },
  {
    id: 2,
    date: '07/09/2026',
    time: '14:30',
    studentName: 'Trần Văn Minh',
    type: 'Entrance Exam',
    subType: 'TestAS',
    location: 'Online (Zoom Link)',
    status: 'Scheduled',
    reminded: false,
    channel: 'Email'
  },
  {
    id: 3,
    date: '15/09/2026',
    time: '10:00',
    studentName: 'Lê Hoàng',
    type: 'Visa',
    subType: 'Đức',
    location: 'Lãnh sự quán (HCM)',
    status: 'Pending',
    reminded: false,
    channel: 'Zalo'
  },
  {
    id: 4,
    date: '01/09/2026',
    time: '08:00',
    studentName: 'Phạm Hương',
    type: 'Visa',
    subType: 'Đức',
    location: 'Đại sứ quán Đức (Hà Nội)',
    status: 'Completed',
    reminded: true,
    channel: 'Email'
  },
  {
    id: 5,
    date: '12/09/2026',
    time: '13:00',
    studentName: 'Đào Văn Hùng',
    type: 'Entrance Exam',
    subType: 'Tiếng Đức B1',
    location: 'Trung tâm Goethe',
    status: 'Cancelled',
    reminded: true,
    channel: 'SMS'
  }
];

const STATUS_LABEL_MAP: Record<'ALL' | InterviewStatus, string> = {
  ALL: 'Tất cả',
  Scheduled: 'Đã lên lịch',
  Pending: 'Chờ xác nhận',
  Completed: 'Hoàn thành',
  Cancelled: 'Đã hủy'
};

const TYPE_LABEL_MAP: Record<'ALL' | InterviewType, string> = {
  ALL: 'Tất cả',
  Visa: 'Phỏng vấn Visa',
  'Entrance Exam': 'Thi đầu vào'
};

const StudyAbroadInterviews: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | InterviewStatus>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | InterviewType>('ALL');

  const filteredInterviews = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return INTERVIEW_DATA.filter((item) => {
      const matchesSearch =
        !keyword ||
        [item.studentName, item.location, item.subType, item.channel, item.date, item.time]
          .join(' ')
          .toLowerCase()
          .includes(keyword);

      const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
      const matchesType = typeFilter === 'ALL' || item.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [searchTerm, statusFilter, typeFilter]);

  const activeSearchChips = useMemo<PinnedSearchChip[]>(() => {
    const chips: PinnedSearchChip[] = [];

    if (statusFilter !== 'ALL') {
      chips.push({ key: 'status', label: `Trạng thái: ${STATUS_LABEL_MAP[statusFilter]}` });
    }

    if (typeFilter !== 'ALL') {
      chips.push({ key: 'type', label: `Loại lịch: ${TYPE_LABEL_MAP[typeFilter]}` });
    }

    return chips;
  }, [statusFilter, typeFilter]);

  const removeSearchChip = (chipKey: string) => {
    if (chipKey === 'status') {
      setStatusFilter('ALL');
      return;
    }
    if (chipKey === 'type') {
      setTypeFilter('ALL');
    }
  };

  const clearAllSearchFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setTypeFilter('ALL');
  };

  const getStatusBadge = (status: InterviewStatus) => {
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

  const getTypeBadge = (type: InterviewType, sub: string) => {
    if (type === 'Visa') {
      return (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-purple-700">Phỏng vấn Visa</span>
          <span className="text-xs text-purple-500">{sub}</span>
        </div>
      );
    }

    return (
      <div className="flex flex-col">
        <span className="text-sm font-medium text-orange-700">Thi đầu vào</span>
        <span className="text-xs text-orange-500">{sub}</span>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#0d141b] font-sans overflow-hidden">
      <div className="px-8 py-6 flex justify-between items-end shrink-0 border-b border-[#e7edf3] bg-white">
        <div>
          <h1 className="text-3xl font-bold text-[#0d141b] flex items-center gap-2">
            <Calendar className="text-blue-600" />
            Lịch Phỏng vấn & Nhắc nhở
          </h1>
          <p className="text-[#4c739a] text-sm mt-1">Quản lý lịch phỏng vấn Visa và lịch thi đầu vào của học viên.</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-[#0d47a1] px-5 py-2.5 text-white font-bold text-sm hover:bg-[#0a3d8b] transition-all shadow-sm">
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
                  onClearAll={clearAllSearchFilters}
                  clearAllAriaLabel="Xóa tất cả bộ lọc lịch phỏng vấn"
                  inputClassName="text-sm h-7"
                />
              </div>

              <div className="inline-flex items-center gap-2 rounded-lg border border-[#cfdbe7] bg-white px-3 py-2">
                <Filter size={15} className="text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as 'ALL' | InterviewStatus)}
                  className="bg-transparent text-sm font-medium text-slate-700 outline-none"
                >
                  <option value="ALL">Trạng thái: Tất cả</option>
                  <option value="Scheduled">Đã lên lịch</option>
                  <option value="Pending">Chờ xác nhận</option>
                  <option value="Completed">Hoàn thành</option>
                  <option value="Cancelled">Đã hủy</option>
                </select>
              </div>

              <div className="inline-flex items-center gap-2 rounded-lg border border-[#cfdbe7] bg-white px-3 py-2">
                <Search size={15} className="text-gray-400" />
                <select
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value as 'ALL' | InterviewType)}
                  className="bg-transparent text-sm font-medium text-slate-700 outline-none"
                >
                  <option value="ALL">Loại lịch: Tất cả</option>
                  <option value="Visa">Phỏng vấn Visa</option>
                  <option value="Entrance Exam">Thi đầu vào</option>
                </select>
              </div>
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
                  filteredInterviews.map((item) => (
                    <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-[#0d141b] text-sm">{item.date}</div>
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
                          <button className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold border border-gray-200 hover:bg-blue-100 hover:text-blue-700 hover:border-blue-200 transition-colors">
                            <Bell size={10} /> Gửi ngay
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-blue-600" title="Chỉnh sửa">
                            <Pencil size={16} />
                          </button>
                          <button className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-red-600" title="Hủy lịch">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-500">
                      Không tìm thấy lịch phỏng vấn phù hợp với bộ lọc hiện tại.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-[#e7edf3] flex justify-between items-center bg-gray-50 text-xs text-gray-500">
            <span>
              Hiển thị {filteredInterviews.length === 0 ? 0 : 1}-{filteredInterviews.length} trên tổng {INTERVIEW_DATA.length} lịch hẹn
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
    </div>
  );
};

export default StudyAbroadInterviews;
