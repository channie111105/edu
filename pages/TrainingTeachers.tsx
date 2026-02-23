import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Phone, Briefcase, Award } from 'lucide-react';
import { ITeacher } from '../types';
import { addTeacher, getTeachers, getTrainingClasses } from '../utils/storage';
import { useAuth } from '../contexts/AuthContext';

const DEFAULT_TEACHER: Partial<ITeacher> = {
  status: 'ACTIVE',
  teachSubjects: [],
  teachLevels: [],
  certificates: [],
  assignedClassIds: []
};

const TrainingTeachers: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [teachers, setTeachers] = useState<ITeacher[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [newTeacher, setNewTeacher] = useState<Partial<ITeacher>>(DEFAULT_TEACHER);

  const loadData = () => {
    setTeachers(getTeachers());
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

  const classCountMap = useMemo(() => {
    const classes = getTrainingClasses();
    return teachers.reduce<Record<string, number>>((acc, teacher) => {
      const linked = classes.filter((c) => c.teacherId === teacher.id).length;
      const own = teacher.assignedClassIds?.length || 0;
      acc[teacher.id] = Math.max(linked, own);
      return acc;
    }, {});
  }, [teachers]);

  const filteredTeachers = teachers.filter((t) => {
    const matchesSearch =
      t.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.phone.includes(searchTerm) ||
      t.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      filterStatus === 'ALL' ||
      (filterStatus === 'ACTIVE' && t.status === 'ACTIVE') ||
      (filterStatus === 'INACTIVE' && t.status === 'INACTIVE');
    return matchesSearch && matchesStatus;
  });

  const handleCreateTeacher = (e: React.FormEvent) => {
    e.preventDefault();
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

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap gap-4 justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                placeholder="Tìm theo tên hoặc SĐT..."
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1">
              <button
                onClick={() => setFilterStatus('ALL')}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${filterStatus === 'ALL' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setFilterStatus('ACTIVE')}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${filterStatus === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                Đang hoạt động
              </button>
              <button
                onClick={() => setFilterStatus('INACTIVE')}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${filterStatus === 'INACTIVE' ? 'bg-rose-50 text-rose-700' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                Đã nghỉ
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#F8FAFC] border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Họ tên / Định danh</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Hợp đồng & Nhân sự</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Chuyên môn</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Lớp đang nhận</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTeachers.map((teacher) => (
                <tr
                  key={teacher.id}
                  className="hover:bg-slate-50 transition-colors group cursor-pointer"
                  onClick={() => navigate(`/training/teachers/${teacher.id}`)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                        {teacher.fullName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-900">{teacher.fullName}</div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <span>{teacher.code}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-300" />
                          <span className="flex items-center gap-1"><Phone size={10} /> {teacher.phone}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-300" />
                          <span>{teacher.dob ? new Date(teacher.dob).toLocaleDateString('vi-VN') : teacher.birthYear || '-'}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-700">{teacher.contractType}</div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <Briefcase size={12} /> Vào làm: {new Date(teacher.startDate).toLocaleDateString('vi-VN')}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1 mb-1">
                      {teacher.teachSubjects.map((lang) => (
                        <span key={lang} className="px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-600 uppercase">{lang}</span>
                      ))}
                      {teacher.teachLevels.map((lvl) => (
                        <span key={lvl} className="px-2 py-0.5 rounded border border-blue-100 bg-blue-50 text-[10px] font-bold text-blue-600">{lvl}</span>
                      ))}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      <Award size={12} className="text-amber-500" /> {teacher.certificates.join(', ') || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold ${classCountMap[teacher.id] > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                      {classCountMap[teacher.id] || 0} lớp
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">Tạo Giáo viên mới</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
            </div>

            <form onSubmit={handleCreateTeacher} className="p-6 grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">1. Thông tin cá nhân</h4>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Họ và tên</label>
                  <input required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={newTeacher.fullName || ''} onChange={(e) => setNewTeacher({ ...newTeacher, fullName: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Ngày sinh</label>
                    <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={newTeacher.dob || ''} onChange={(e) => setNewTeacher({ ...newTeacher, dob: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Số điện thoại</label>
                    <input required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={newTeacher.phone || ''} onChange={(e) => setNewTeacher({ ...newTeacher, phone: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                  <input type="email" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={newTeacher.email || ''} onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })} />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-bold text-sm text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">2. Chuyên môn & Hợp đồng</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Loại hợp đồng</label>
                    <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={newTeacher.contractType || 'Full-time'} onChange={(e) => setNewTeacher({ ...newTeacher, contractType: e.target.value as ITeacher['contractType'] })}>
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="CTV">CTV</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Ngày vào làm</label>
                    <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={newTeacher.startDate || ''} onChange={(e) => setNewTeacher({ ...newTeacher, startDate: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Trình độ có thể dạy</label>
                  <input placeholder="Ví dụ: A1, A2, IELTS" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={newTeacher.teachLevels?.join(', ') || ''} onChange={(e) => setNewTeacher({ ...newTeacher, teachLevels: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Môn dạy</label>
                  <input placeholder="Ví dụ: German, English" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={newTeacher.teachSubjects?.join(', ') || ''} onChange={(e) => setNewTeacher({ ...newTeacher, teachSubjects: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Bằng cấp / chứng chỉ</label>
                  <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={newTeacher.certificates?.join(', ') || ''} onChange={(e) => setNewTeacher({ ...newTeacher, certificates: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
                </div>
              </div>

              <div className="col-span-2 flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-5 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-bold hover:bg-slate-50">Hủy bỏ</button>
                <button type="submit" className="px-5 py-2.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700">Lưu Giáo viên</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainingTeachers;
