import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  MessageSquare,
  Mail,
  AlertCircle,
  CheckCircle2,
  Clock,
  Calendar,
  MoreHorizontal,
  Search,
  Filter,
  MapPin,
  Pencil,
  Trash2,
  Bell
} from 'lucide-react';

const StudyAbroadInterviews: React.FC = () => {
  // Standardized table data
  const INTERVIEW_DATA = [
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

  const getStatusBadge = (status: string) => {
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

  const getTypeBadge = (type: string, sub: string) => {
    if (type === 'Visa') {
      return (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-purple-700">Phỏng vấn Visa</span>
          <span className="text-xs text-purple-500">{sub}</span>
        </div>
      )
    }
    return (
      <div className="flex flex-col">
        <span className="text-sm font-medium text-orange-700">Thi Đầu vào</span>
        <span className="text-xs text-orange-500">{sub}</span>
      </div>
    )
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#0d141b] font-sans overflow-hidden">

      {/* Header */}
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
          Lên lịch Mới
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden p-8 gap-6">

        {/* MAIN TABLE CONTENT */}
        <div className="flex-1 bg-white rounded-xl border border-[#e7edf3] shadow-sm flex flex-col overflow-hidden">

          {/* Toolbar */}
          <div className="p-4 border-b border-[#e7edf3] flex justify-between items-center bg-gray-50/50">
            <div className="flex gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Tìm học viên..."
                  className="pl-9 pr-4 py-2 bg-white border border-[#cfdbe7] rounded-lg text-sm focus:ring-2 focus:ring-blue-500 w-64 shadow-sm"
                />
              </div>
              <button className="px-3 py-2 bg-white border border-[#cfdbe7] rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-2 shadow-sm">
                <Filter size={16} /> Bộ lọc
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button className="text-gray-400 hover:text-gray-600 p-2">
                <ChevronLeft size={20} />
              </button>
              <span className="text-sm font-bold text-gray-700">Tháng 9, 2026</span>
              <button className="text-gray-400 hover:text-gray-600 p-2">
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          {/* Table */}
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
                {INTERVIEW_DATA.map((item) => (
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
                    <td className="px-6 py-4">
                      {getTypeBadge(item.type, item.subType)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-1.5 text-sm text-[#0d141b] max-w-[200px]">
                        <MapPin size={14} className="text-[#4c739a] mt-0.5 shrink-0" />
                        <span className="truncate">{item.location}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(item.status)}
                    </td>
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
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Placeholder */}
          <div className="p-4 border-t border-[#e7edf3] flex justify-between items-center bg-gray-50 text-xs text-gray-500">
            <span>Hiển thị 1-5 trên tổng 24 lịch hẹn</span>
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
