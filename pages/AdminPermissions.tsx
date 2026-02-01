
import React, { useState } from 'react';
import { 
  Save, 
  Search, 
  Filter, 
  Shield, 
  Info,
  Check,
  CheckCircle2
} from 'lucide-react';

interface IPermissionRow {
  id: string;
  module: string;
  admin: string[];
  marketing: string[];
  salesLeader: string[];
  salesRep: string[];
  accountant: string[];
  training: string[];
  teacher: string[];
  studyAbroad: string[];
}

const INITIAL_PERMISSIONS: IPermissionRow[] = [
  {
    id: 'm1',
    module: '1. Marketing & Khách hàng (Leads)',
    admin: ['V', 'C', 'E', 'D', 'X'],
    marketing: ['V', 'C', 'E', 'D', 'X'],
    salesLeader: ['V', 'C', 'E', 'X'],
    salesRep: ['V', 'C', 'E'],
    accountant: [],
    training: [],
    teacher: [],
    studyAbroad: ['V', 'C']
  },
  {
    id: 'm2',
    module: '2. Bán hàng (Deals / Pipeline)',
    admin: ['V', 'C', 'E', 'D', 'X'],
    marketing: ['V'], // Xem hiệu quả
    salesLeader: ['V', 'C', 'E', 'D', 'X'],
    salesRep: ['V', 'C', 'E'],
    accountant: ['V'],
    training: [],
    teacher: [],
    studyAbroad: ['V', 'C', 'E']
  },
  {
    id: 'm3',
    module: '3. Quản lý Hợp đồng',
    admin: ['V', 'C', 'E', 'D', 'X', 'A'],
    marketing: [],
    salesLeader: ['V', 'C', 'E', 'A'],
    salesRep: ['V', 'C'], // Chỉ xem và tạo draft
    accountant: ['V', 'C'], // Xem để đối soát
    training: [],
    teacher: [],
    studyAbroad: ['V', 'C']
  },
  {
    id: 'm4',
    module: '4. Tài chính & Kế toán',
    admin: ['V', 'C', 'E', 'D', 'A'],
    marketing: ['V'], // Xem ngân sách
    salesLeader: ['V'], // Xem doanh số team
    salesRep: ['V'], // Xem hoa hồng cá nhân
    accountant: ['V', 'C', 'E', 'D', 'X', 'A'],
    training: [],
    teacher: [],
    studyAbroad: ['V'] // Xem công nợ du học
  },
  {
    id: 'm5',
    module: '5. Quản lý Đào tạo (Lớp/Lịch)',
    admin: ['V', 'C', 'E', 'D'],
    marketing: [],
    salesLeader: ['V'], // Xem lịch để tư vấn
    salesRep: ['V'],
    accountant: ['V'], // Xem để tính lương
    training: ['V', 'C', 'E', 'D', 'X'],
    teacher: ['V', 'E'], // Điểm danh, nhập điểm
    studyAbroad: []
  },
  {
    id: 'm6',
    module: '6. Hồ sơ Du học',
    admin: ['V', 'C', 'E', 'D', 'A'],
    marketing: [],
    salesLeader: ['V', 'C', 'E'],
    salesRep: ['V'],
    accountant: ['V'],
    training: [],
    teacher: [],
    studyAbroad: ['V', 'C', 'E', 'D', 'X', 'A']
  },
  {
    id: 'm7',
    module: '7. Cấu hình Hệ thống',
    admin: ['V', 'C', 'E', 'D', 'X'],
    marketing: [],
    salesLeader: [],
    salesRep: [],
    accountant: [],
    training: [],
    teacher: [],
    studyAbroad: []
  }
];

const PERMISSION_CODES = [
  { code: 'V', label: 'Xem (View)', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { code: 'C', label: 'Tạo (Create)', color: 'bg-green-100 text-green-700 border-green-200' },
  { code: 'E', label: 'Sửa (Edit)', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { code: 'D', label: 'Xóa (Delete)', color: 'bg-red-100 text-red-700 border-red-200' },
  { code: 'X', label: 'Xuất (Export)', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { code: 'A', label: 'Duyệt (Approve)', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
];

const AdminPermissions: React.FC = () => {
  const [permissions, setPermissions] = useState(INITIAL_PERMISSIONS);
  const [searchTerm, setSearchTerm] = useState('');

  const togglePermission = (rowId: string, role: keyof IPermissionRow, code: string) => {
    setPermissions(prev => prev.map(row => {
      if (row.id === rowId) {
        const currentPerms = row[role] as string[];
        let newPerms;
        if (currentPerms.includes(code)) {
          newPerms = currentPerms.filter(c => c !== code);
        } else {
          newPerms = [...currentPerms, code];
        }
        return { ...row, [role]: newPerms };
      }
      return row;
    }));
  };

  const renderCell = (row: IPermissionRow, role: keyof IPermissionRow) => {
    const currentPerms = row[role] as string[];

    return (
      <div className="flex flex-wrap justify-center gap-1 max-w-[120px] mx-auto">
        {['V', 'C', 'E', 'D', 'X', 'A'].map(code => {
          const isActive = currentPerms.includes(code);
          const isApprove = code === 'A';
          
          return (
            <button
              key={code}
              onClick={() => togglePermission(row.id, role, code)}
              className={`
                w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold border transition-all
                ${isActive 
                  ? (isApprove ? 'bg-indigo-600 border-indigo-700 text-white' : 'bg-blue-600 border-blue-700 text-white') 
                  : 'bg-white border-slate-200 text-slate-300 hover:border-slate-400'}
              `}
              title={PERMISSION_CODES.find(p => p.code === code)?.label}
            >
              {code}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#0d141b] font-sans overflow-hidden">
      <div className="flex flex-col flex-1 overflow-y-auto p-6 lg:p-8 w-full">
        
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 leading-tight">Phân quyền Vai trò (RBAC)</h1>
            <p className="text-slate-500 mt-1">Quản lý ma trận phân quyền cho 8 vai trò hệ thống.</p>
          </div>
          <button 
            className="flex min-w-[140px] items-center justify-center rounded-lg h-10 px-5 bg-[#1380ec] text-white text-sm font-bold shadow-sm hover:bg-[#106bc5] transition-colors gap-2"
            onClick={() => alert("Đã lưu cấu hình phân quyền!")}
          >
            <Save size={18} />
            Lưu thay đổi
          </button>
        </div>

        {/* Legend & Filter */}
        <div className="bg-white rounded-xl border border-[#cfdbe7] p-4 mb-6 shadow-sm">
           <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                 {PERMISSION_CODES.map(p => (
                    <div key={p.code} className={`flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-bold ${p.color}`}>
                       <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                       {p.label}
                    </div>
                 ))}
              </div>
              <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                 <input 
                    type="text" 
                    placeholder="Tìm phân hệ..." 
                    className="pl-9 pr-4 py-1.5 border border-[#cfdbe7] rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                 />
              </div>
           </div>
        </div>

        {/* Matrix Table */}
        <div className="bg-white rounded-xl border border-[#cfdbe7] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-[#cfdbe7]">
                  <th className="px-4 py-4 min-w-[200px] text-[#0d141b] text-xs font-bold uppercase tracking-wider sticky left-0 bg-slate-50 z-10 border-r border-[#cfdbe7]">Phân hệ / Chức năng</th>
                  <th className="px-2 py-4 min-w-[100px] text-[#0d141b] text-xs font-bold text-center border-r border-slate-100">Admin</th>
                  <th className="px-2 py-4 min-w-[100px] text-[#0d141b] text-xs font-bold text-center border-r border-slate-100">Marketing</th>
                  <th className="px-2 py-4 min-w-[100px] text-[#0d141b] text-xs font-bold text-center border-r border-slate-100">Sales Lead</th>
                  <th className="px-2 py-4 min-w-[100px] text-[#0d141b] text-xs font-bold text-center border-r border-slate-100">Sales Rep</th>
                  <th className="px-2 py-4 min-w-[100px] text-[#0d141b] text-xs font-bold text-center border-r border-slate-100">Kế toán</th>
                  <th className="px-2 py-4 min-w-[100px] text-[#0d141b] text-xs font-bold text-center border-r border-slate-100">Đào tạo</th>
                  <th className="px-2 py-4 min-w-[100px] text-[#0d141b] text-xs font-bold text-center border-r border-slate-100">Giáo viên</th>
                  <th className="px-2 py-4 min-w-[100px] text-[#0d141b] text-xs font-bold text-center">Du học</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#cfdbe7]">
                {permissions.filter(p => p.module.toLowerCase().includes(searchTerm.toLowerCase())).map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4 text-xs font-bold text-[#0d141b] border-r border-[#cfdbe7] bg-white sticky left-0 z-10 group-hover:bg-slate-50">
                      {row.module}
                    </td>
                    <td className="px-2 py-3 border-r border-slate-100 bg-slate-50/30">{renderCell(row, 'admin')}</td>
                    <td className="px-2 py-3 border-r border-slate-100">{renderCell(row, 'marketing')}</td>
                    <td className="px-2 py-3 border-r border-slate-100">{renderCell(row, 'salesLeader')}</td>
                    <td className="px-2 py-3 border-r border-slate-100">{renderCell(row, 'salesRep')}</td>
                    <td className="px-2 py-3 border-r border-slate-100">{renderCell(row, 'accountant')}</td>
                    <td className="px-2 py-3 border-r border-slate-100">{renderCell(row, 'training')}</td>
                    <td className="px-2 py-3 border-r border-slate-100">{renderCell(row, 'teacher')}</td>
                    <td className="px-2 py-3">{renderCell(row, 'studyAbroad')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="px-6 py-4 bg-slate-50 border-t border-[#cfdbe7] flex justify-between items-center">
             <div className="flex items-center gap-2 text-xs text-slate-500">
                <Info size={14} />
                <span>Quyền <strong>Duyệt (A)</strong>: Phê duyệt ngoại lệ tài chính, giảm giá, và quy trình nhạy cảm.</span>
             </div>
             <p className="text-xs text-[#4c739a] font-medium">RBAC Status: Active</p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminPermissions;
