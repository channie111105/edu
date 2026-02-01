
import React, { useState } from 'react';
import { 
  Search, 
  UserPlus, 
  Users, 
  Building2, 
  ToggleRight, 
  MoreHorizontal, 
  Edit2, 
  KeyRound, 
  ChevronLeft, 
  ChevronRight,
  Shield,
  Filter
} from 'lucide-react';
import { UserRole } from '../types';

// Mock Data matching system roles
const MOCK_USERS = [
  {
    id: 1,
    name: 'Cô Nguyễn Thị Lan',
    email: 'lan.nguyen@educrm.com',
    role: UserRole.TEACHER,
    department: 'Đào tạo (Education)',
    status: 'Active',
    avatar: 'NL',
    color: 'text-emerald-800 bg-emerald-100 border-emerald-200'
  },
  {
    id: 2,
    name: 'Phạm Hương',
    email: 'huong.pham@educrm.com',
    role: UserRole.SALES_REP,
    department: 'Kinh doanh (Sales)',
    status: 'Active',
    avatar: 'PH',
    color: 'text-blue-800 bg-blue-100 border-blue-200'
  },
  {
    id: 3,
    name: 'Trần Văn Minh',
    email: 'minh.tran@educrm.com',
    role: UserRole.ACCOUNTANT,
    department: 'Tài chính (Finance)',
    status: 'Active',
    avatar: 'TM',
    color: 'text-purple-800 bg-purple-100 border-purple-200'
  },
  {
    id: 4,
    name: 'Lê Hoàng',
    email: 'hoang.le@educrm.com',
    role: UserRole.SALES_LEADER,
    department: 'Kinh doanh (Sales)',
    status: 'Inactive',
    avatar: 'LH',
    color: 'text-amber-800 bg-amber-100 border-amber-200'
  },
  {
    id: 5,
    name: 'Trần Văn Quản Trị',
    email: 'admin@educrm.com',
    role: UserRole.ADMIN,
    department: 'Ban Giám đốc (Board)',
    status: 'Active',
    avatar: 'QT',
    color: 'text-red-800 bg-red-100 border-red-200'
  },
  {
    id: 6,
    name: 'Nguyễn Bích Ngọc',
    email: 'ngoc.nguyen@educrm.com',
    role: UserRole.STUDY_ABROAD,
    department: 'Du học (Study Abroad)',
    status: 'Active',
    avatar: 'NN',
    color: 'text-cyan-800 bg-cyan-100 border-cyan-200'
  },
  {
    id: 7,
    name: 'Vũ Minh Hiếu',
    email: 'hieu.vu@educrm.com',
    role: UserRole.MARKETING,
    department: 'Marketing',
    status: 'Active',
    avatar: 'VH',
    color: 'text-pink-800 bg-pink-100 border-pink-200'
  }
];

const AdminUserManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = MOCK_USERS.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#111418] font-sans overflow-y-auto">
      <div className="flex flex-1 justify-center py-8">
        <div className="flex flex-col max-w-[1200px] flex-1 px-4 sm:px-10">
          
          {/* Header Section */}
          <div className="flex flex-wrap justify-between gap-3 pb-6">
            <div className="flex min-w-72 flex-col gap-1">
              <h1 className="text-[#111418] text-3xl font-black leading-tight tracking-tight">Quản lý Tài khoản Người dùng</h1>
              <p className="text-[#64748B] text-base font-normal leading-normal">
                Cấu hình quyền truy cập, vai trò và quản trị nhân sự hệ thống.
              </p>
            </div>
            <div className="flex items-center gap-2">
               <button className="flex min-w-[140px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg h-10 px-4 bg-[#1380ec] text-white text-sm font-bold leading-normal hover:bg-blue-700 transition-colors shadow-sm">
                  <UserPlus size={18} />
                  <span className="truncate">Thêm Người dùng</span>
               </button>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-wrap items-center justify-between mb-4 bg-white p-3 rounded-xl border border-[#dbe0e6] shadow-sm gap-4">
            <div className="flex gap-3 flex-wrap flex-1">
                <div className="relative group">
                    <button className="flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-[#f0f2f4] px-4 hover:bg-slate-200 transition-colors text-sm font-medium text-[#111418]">
                        <Users size={18} className="text-[#1380ec]" />
                        <p>Vai trò (Tất cả)</p>
                        <Filter size={16} className="text-slate-400" />
                    </button>
                </div>
                <button className="flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-[#f0f2f4] px-4 hover:bg-slate-200 transition-colors text-sm font-medium text-[#111418]">
                    <Building2 size={18} className="text-[#1380ec]" />
                    <p>Phòng ban</p>
                    <Filter size={16} className="text-slate-400" />
                </button>
                <button className="flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-[#f0f2f4] px-4 hover:bg-slate-200 transition-colors text-sm font-medium text-[#111418]">
                    <ToggleRight size={18} className="text-[#1380ec]" />
                    <p>Trạng thái</p>
                    <Filter size={16} className="text-slate-400" />
                </button>
            </div>
            
            <div className="relative min-w-[240px]">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Search size={18} />
                </div>
                <input 
                    type="text" 
                    placeholder="Tìm kiếm nhân viên..." 
                    className="w-full pl-10 pr-4 py-2 bg-[#f0f2f4] border-none rounded-lg text-sm focus:ring-2 focus:ring-[#1380ec] outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
          </div>

          {/* User Table */}
          <div className="overflow-hidden rounded-xl border border-[#dbe0e6] bg-white shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f8fafc] border-b border-[#dbe0e6]">
                  <th className="px-6 py-4 text-[#111418] text-sm font-bold uppercase tracking-wider">Họ và Tên</th>
                  <th className="px-6 py-4 text-[#111418] text-sm font-bold uppercase tracking-wider">Email / Username</th>
                  <th className="px-6 py-4 text-[#111418] text-sm font-bold uppercase tracking-wider text-center">Vai trò (Role)</th>
                  <th className="px-6 py-4 text-[#111418] text-sm font-bold uppercase tracking-wider">Phòng ban</th>
                  <th className="px-6 py-4 text-[#111418] text-sm font-bold uppercase tracking-wider text-center">Trạng thái</th>
                  <th className="px-6 py-4 text-right text-[#617589] text-sm font-bold uppercase tracking-wider">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dbe0e6]">
                {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-[#f0f4f8] transition-colors group">
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                                <div className={`size-9 rounded-full flex items-center justify-center font-bold text-xs ${user.color.replace('border', '')}`}>
                                    {user.avatar}
                                </div>
                                <span className="text-[#111418] text-sm font-bold">{user.name}</span>
                            </div>
                        </td>
                        <td className="px-6 py-4 text-[#617589] text-sm font-medium">{user.email}</td>
                        <td className="px-6 py-4">
                            <div className="flex justify-center">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${user.color}`}>
                                    {user.role}
                                </span>
                            </div>
                        </td>
                        <td className="px-6 py-4 text-[#617589] text-sm font-medium">{user.department}</td>
                        <td className="px-6 py-4">
                            <div className="flex justify-center items-center">
                                {user.status === 'Active' ? (
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold border border-green-200">
                                        <span className="size-1.5 rounded-full bg-green-600"></span>
                                        Hoạt động
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-bold border border-slate-200">
                                        <span className="size-1.5 rounded-full bg-slate-400"></span>
                                        Ngừng
                                    </div>
                                )}
                            </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="p-2 hover:bg-blue-50 rounded-lg transition-colors text-blue-600" title="Chỉnh sửa">
                                    <Edit2 size={18} />
                                </button>
                                <button className="p-2 hover:bg-red-50 rounded-lg transition-colors text-slate-400 hover:text-red-500" title="Đặt lại mật khẩu">
                                    <KeyRound size={18} />
                                </button>
                            </div>
                        </td>
                    </tr>
                ))}
              </tbody>
            </table>
            
            {/* Pagination */}
            <div className="flex items-center justify-between p-4 bg-white border-t border-[#dbe0e6]">
                <div className="text-sm text-[#617589]">
                    Hiển thị <span className="font-bold text-[#111418]">{filteredUsers.length}</span> trên tổng số <span className="font-bold text-[#111418]">25</span> người dùng
                </div>
                <div className="flex items-center gap-1">
                    <button className="flex size-9 items-center justify-center rounded-lg hover:bg-[#f0f2f4] text-slate-500 transition-colors">
                        <ChevronLeft size={20} />
                    </button>
                    <button className="text-sm font-bold leading-normal flex size-9 items-center justify-center text-white rounded-lg bg-[#1380ec]">1</button>
                    <button className="text-sm font-medium leading-normal flex size-9 items-center justify-center text-[#111418] rounded-lg hover:bg-[#f0f2f4] transition-colors">2</button>
                    <button className="text-sm font-medium leading-normal flex size-9 items-center justify-center text-[#111418] rounded-lg hover:bg-[#f0f2f4] transition-colors">3</button>
                    <div className="text-[#617589] px-1">...</div>
                    <button className="flex size-9 items-center justify-center rounded-lg hover:bg-[#f0f2f4] text-slate-500 transition-colors">
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AdminUserManagement;
