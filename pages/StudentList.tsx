import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter, MoreHorizontal, Search, User } from 'lucide-react';
import { getStudents } from '../utils/storage';
import { IStudent } from '../types';

const StudentList: React.FC = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<IStudent[]>([]);

  useEffect(() => {
    setStudents(getStudents());
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] font-sans text-[#0d141b]">
      <div className="flex flex-1 flex-col py-5 px-6 max-w-[1200px] mx-auto w-full">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Danh sách Học viên</h1>
          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Tìm kiếm..."
                className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64"
              />
            </div>
            <button className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-slate-50">
              <Filter size={16} /> Bộ lọc
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-bold text-sm text-slate-600 w-16 text-center">STT</th>
                <th className="px-6 py-4 font-bold text-sm text-slate-600">Mã HV</th>
                <th className="px-6 py-4 font-bold text-sm text-slate-600">Họ tên</th>
                <th className="px-6 py-4 font-bold text-sm text-slate-600">Chương trình</th>
                <th className="px-6 py-4 font-bold text-sm text-slate-600">Trạng thái</th>
                <th className="px-6 py-4 font-bold text-sm text-slate-600 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm">
                    Chưa có học viên nào trong hệ thống.
                  </td>
                </tr>
              ) : (
                students.map((student, index) => (
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => navigate(`/students/${student.id}`)}>
                    <td className="px-6 py-4 text-center text-sm font-semibold text-slate-500">{index + 1}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{(student as any).code || student.id}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                          <User size={16} />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-900">{student.name}</p>
                          <p className="text-xs text-slate-400">{(student as any).email || ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">{(student as any).program || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700`}>
                        {student.status || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-slate-400">
                      <MoreHorizontal size={20} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StudentList;
