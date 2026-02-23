import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Edit, Plus, Power, Trash2, User } from 'lucide-react';
import { ITeacher } from '../types';
import {
  addLogNote,
  assignTeacherToClass,
  getLogNotes,
  getTeacherById,
  getTeachers,
  getTrainingClasses,
  unassignTeacherFromClass,
  updateTeacher
} from '../utils/storage';
import { useAuth } from '../contexts/AuthContext';

const TeacherDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [teacher, setTeacher] = useState<ITeacher | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'classes' | 'logs'>(
    searchParams.get('tab') === 'classes' ? 'classes' : searchParams.get('tab') === 'logs' ? 'logs' : 'info'
  );
  const [showEdit, setShowEdit] = useState(searchParams.get('edit') === '1');
  const [showAssign, setShowAssign] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [classSearch, setClassSearch] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');

  const loadData = () => {
    if (!id) return;
    const found = getTeacherById(id) || null;
    setTeacher(found);
  };

  useEffect(() => {
    loadData();
    window.addEventListener('educrm:teachers-changed', loadData as EventListener);
    window.addEventListener('educrm:training-classes-changed', loadData as EventListener);
    window.addEventListener('educrm:log-notes-changed', loadData as EventListener);
    return () => {
      window.removeEventListener('educrm:teachers-changed', loadData as EventListener);
      window.removeEventListener('educrm:training-classes-changed', loadData as EventListener);
      window.removeEventListener('educrm:log-notes-changed', loadData as EventListener);
    };
  }, [id]);

  const classes = useMemo(() => getTrainingClasses(), [teacher?.updatedAt]);

  const assignedClasses = useMemo(() => {
    if (!teacher) return [];
    return classes.filter((c) => teacher.assignedClassIds.includes(c.id) || c.teacherId === teacher.id);
  }, [classes, teacher]);

  const availableClasses = useMemo(() => {
    if (!teacher) return [];
    const assignedSet = new Set(teacher.assignedClassIds);
    return classes
      .filter((c) => !assignedSet.has(c.id))
      .filter((c) => `${c.code} ${c.name}`.toLowerCase().includes(classSearch.toLowerCase()));
  }, [classes, classSearch, teacher]);

  const logs = useMemo(() => (teacher ? getLogNotes('TEACHER', teacher.id) : []), [teacher?.id, teacher?.updatedAt]);

  if (!teacher) {
    return (
      <div className="p-6">
        <p>Không tìm thấy giáo viên.</p>
        <button onClick={() => navigate('/training/teachers')} className="mt-3 px-3 py-2 border rounded">
          Quay lại
        </button>
      </div>
    );
  }

  const toggleStatus = () => {
    const next = teacher.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const ok = window.confirm(next === 'ACTIVE' ? 'Chuyển giáo viên sang Đang hoạt động?' : 'Chuyển giáo viên sang Đã nghỉ?');
    if (!ok) return;
    updateTeacher(
      { ...teacher, status: next },
      user?.id || 'system',
      'STATUS_CHANGED',
      `Đổi trạng thái giáo viên từ ${teacher.status} sang ${next}`
    );
  };

  const submitManualNote = () => {
    if (!noteInput.trim()) return;
    addLogNote({
      id: `LOG-${Date.now()}`,
      entityType: 'TEACHER',
      entityId: teacher.id,
      action: 'MANUAL_NOTE',
      message: noteInput.trim(),
      createdAt: new Date().toISOString(),
      createdBy: user?.id || 'system'
    });
    setNoteInput('');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <button onClick={() => navigate('/training/teachers')} className="hover:text-blue-600">
            Đào tạo
          </button>
          <span>&gt;</span>
          <button onClick={() => navigate('/training/teachers')} className="hover:text-blue-600">
            Giáo viên
          </button>
          <span>&gt;</span>
          <span className="font-semibold text-slate-900">{teacher.fullName}</span>
        </div>
        <button onClick={() => navigate('/training/teachers')} className="px-3 py-2 border rounded inline-flex items-center gap-2">
          <ArrowLeft size={14} /> Quay lại
        </button>
      </div>

      <div className="bg-white border rounded-xl p-4 mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{teacher.fullName}</h1>
          <div className="text-sm text-slate-500 mt-1">{teacher.code} • {teacher.phone}</div>
          <div className="mt-2">
            <span className={`px-2 py-1 text-xs rounded font-bold ${teacher.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              {teacher.status === 'ACTIVE' ? 'Active' : 'Đã nghỉ'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowEdit(true)} className="px-3 py-2 border rounded inline-flex items-center gap-2">
            <Edit size={14} /> Chỉnh sửa
          </button>
          <button onClick={toggleStatus} className="px-3 py-2 border rounded inline-flex items-center gap-2">
            <Power size={14} /> Đổi trạng thái
          </button>
          <button onClick={() => setShowAssign(true)} className="px-3 py-2 bg-blue-600 text-white rounded inline-flex items-center gap-2">
            <Plus size={14} /> Gán lớp
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setActiveTab('info')} className={`px-3 py-2 rounded ${activeTab === 'info' ? 'bg-blue-600 text-white' : 'bg-white border'}`}>Thông tin</button>
        <button onClick={() => setActiveTab('classes')} className={`px-3 py-2 rounded ${activeTab === 'classes' ? 'bg-blue-600 text-white' : 'bg-white border'}`}>Lớp đang nhận ({assignedClasses.length})</button>
        <button onClick={() => setActiveTab('logs')} className={`px-3 py-2 rounded ${activeTab === 'logs' ? 'bg-blue-600 text-white' : 'bg-white border'}`}>Log note</button>
      </div>

      {activeTab === 'info' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border rounded-xl p-4">
            <h3 className="font-bold mb-3">Thông tin cá nhân</h3>
            <div className="text-sm space-y-2">
              <div><span className="text-slate-500">Họ tên:</span> {teacher.fullName}</div>
              <div><span className="text-slate-500">SĐT:</span> {teacher.phone}</div>
              <div><span className="text-slate-500">Ngày sinh:</span> {teacher.dob ? new Date(teacher.dob).toLocaleDateString('vi-VN') : '-'}</div>
              <div><span className="text-slate-500">Email:</span> {teacher.email || '-'}</div>
              <div><span className="text-slate-500">Địa chỉ:</span> {teacher.address || '-'}</div>
            </div>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <h3 className="font-bold mb-3">Hợp đồng & nhân sự</h3>
            <div className="text-sm space-y-2">
              <div><span className="text-slate-500">Loại hợp đồng:</span> {teacher.contractType}</div>
              <div><span className="text-slate-500">Ngày vào làm:</span> {new Date(teacher.startDate).toLocaleDateString('vi-VN')}</div>
              <div><span className="text-slate-500">Ghi chú hợp đồng:</span> {teacher.contractNote || '-'}</div>
            </div>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <h3 className="font-bold mb-3">Chuyên môn</h3>
            <div className="text-sm mb-2 text-slate-500">Môn/khối có thể dạy</div>
            <div className="flex flex-wrap gap-1 mb-3">
              {teacher.teachSubjects.map((item) => <span key={item} className="px-2 py-1 bg-slate-100 rounded text-xs">{item}</span>)}
              {teacher.teachLevels.map((item) => <span key={item} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">{item}</span>)}
            </div>
            <div className="text-sm mb-2 text-slate-500">Bằng cấp/chứng chỉ</div>
            <div className="flex flex-wrap gap-1">
              {teacher.certificates.map((item) => <span key={item} className="px-2 py-1 bg-amber-50 text-amber-700 rounded text-xs">{item}</span>)}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'classes' && (
        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-3 text-left">Mã lớp</th>
                <th className="p-3 text-left">Tên lớp</th>
                <th className="p-3 text-left">Cơ sở</th>
                <th className="p-3 text-left">Lịch học</th>
                <th className="p-3 text-left">Trạng thái</th>
                <th className="p-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {assignedClasses.length > 0 ? assignedClasses.map((cls) => (
                <tr key={cls.id} className="border-t">
                  <td className="p-3">{cls.code}</td>
                  <td className="p-3">{cls.name}</td>
                  <td className="p-3">{cls.campus || '-'}</td>
                  <td className="p-3">{cls.schedule || '-'}</td>
                  <td className="p-3">{cls.status || '-'}</td>
                  <td className="p-3 text-right">
                    <button onClick={() => navigate('/training/classes')} className="mr-2 px-2 py-1 border rounded text-xs">Mở lớp</button>
                    <button
                      onClick={() => unassignTeacherFromClass(teacher.id, cls.id, user?.id || 'system')}
                      className="px-2 py-1 border border-rose-200 text-rose-700 rounded text-xs inline-flex items-center gap-1"
                    >
                      <Trash2 size={12} /> Bỏ lớp
                    </button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="p-6 text-center text-slate-500">Chưa có lớp được gán.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-white border rounded-xl p-4">
            <h3 className="font-bold mb-3">Lịch sử log note</h3>
            <div className="space-y-3 max-h-[420px] overflow-auto">
              {logs.length > 0 ? logs.map((log) => (
                <div key={log.id} className="border-l-2 border-blue-200 pl-3 py-1">
                  <div className="text-sm font-semibold">{log.action}</div>
                  <div className="text-sm text-slate-600">{log.message}</div>
                  <div className="text-xs text-slate-400 mt-1">{new Date(log.createdAt).toLocaleString('vi-VN')} • {log.createdBy}</div>
                </div>
              )) : <div className="text-sm text-slate-500">Chưa có log.</div>}
            </div>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <h3 className="font-bold mb-3">Thêm ghi chú</h3>
            <textarea value={noteInput} onChange={(e) => setNoteInput(e.target.value)} className="w-full border rounded p-2 h-28" placeholder="Nhập ghi chú..." />
            <button onClick={submitManualNote} className="mt-3 w-full py-2 bg-blue-600 text-white rounded">Thêm note</button>
          </div>
        </div>
      )}

      {showEdit && (
        <EditTeacherModal
          teacher={teacher}
          onClose={() => setShowEdit(false)}
          onSave={(next) => {
            updateTeacher(next, user?.id || 'system');
            setShowEdit(false);
          }}
        />
      )}

      {showAssign && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-4 w-full max-w-lg">
            <h3 className="font-bold mb-3">Gán lớp cho giáo viên</h3>
            <input
              value={classSearch}
              onChange={(e) => setClassSearch(e.target.value)}
              placeholder="Tìm lớp theo mã/tên"
              className="w-full border rounded p-2 mb-3"
            />
            <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} className="w-full border rounded p-2 mb-3">
              <option value="">-- Chọn lớp --</option>
              {availableClasses.map((cls) => (
                <option key={cls.id} value={cls.id}>{cls.code} - {cls.name}</option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowAssign(false)} className="px-3 py-2 border rounded">Hủy</button>
              <button
                onClick={() => {
                  if (!selectedClassId) return;
                  assignTeacherToClass(teacher.id, selectedClassId, user?.id || 'system');
                  setSelectedClassId('');
                  setShowAssign(false);
                }}
                className="px-3 py-2 bg-blue-600 text-white rounded"
              >
                Gán lớp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const EditTeacherModal: React.FC<{
  teacher: ITeacher;
  onClose: () => void;
  onSave: (teacher: ITeacher) => void;
}> = ({ teacher, onClose, onSave }) => {
  const [form, setForm] = useState<ITeacher>(teacher);
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-4 w-full max-w-2xl">
        <h3 className="font-bold mb-3">Chỉnh sửa hồ sơ giáo viên</h3>
        <div className="grid grid-cols-2 gap-3">
          <input className="border rounded p-2" value={form.fullName} onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))} />
          <input className="border rounded p-2" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
          <input type="date" className="border rounded p-2" value={form.dob || ''} onChange={(e) => setForm((p) => ({ ...p, dob: e.target.value }))} />
          <select className="border rounded p-2" value={form.contractType} onChange={(e) => setForm((p) => ({ ...p, contractType: e.target.value as ITeacher['contractType'] }))}>
            <option value="Full-time">Full-time</option>
            <option value="Part-time">Part-time</option>
            <option value="CTV">CTV</option>
          </select>
          <input type="date" className="border rounded p-2" value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} />
          <input className="border rounded p-2" value={form.contractNote || ''} onChange={(e) => setForm((p) => ({ ...p, contractNote: e.target.value }))} placeholder="Ghi chú hợp đồng" />
          <input className="border rounded p-2 col-span-2" value={form.teachSubjects.join(', ')} onChange={(e) => setForm((p) => ({ ...p, teachSubjects: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }))} placeholder="Môn dạy" />
          <input className="border rounded p-2 col-span-2" value={form.teachLevels.join(', ')} onChange={(e) => setForm((p) => ({ ...p, teachLevels: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }))} placeholder="Trình độ dạy" />
          <input className="border rounded p-2 col-span-2" value={form.certificates.join(', ')} onChange={(e) => setForm((p) => ({ ...p, certificates: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }))} placeholder="Chứng chỉ" />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-2 border rounded">Hủy</button>
          <button onClick={() => onSave(form)} className="px-3 py-2 bg-blue-600 text-white rounded">Lưu</button>
        </div>
      </div>
    </div>
  );
};

export default TeacherDetails;

