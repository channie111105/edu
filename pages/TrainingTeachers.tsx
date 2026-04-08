import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Phone, Briefcase, Award, FileText, Paperclip, X } from 'lucide-react';
import { ITeacher } from '../types';
import { addTeacher, getTeachers, getTrainingClasses } from '../utils/storage';
import { useAuth } from '../contexts/AuthContext';
import PinnedSearchInput, { PinnedSearchChip } from '../components/PinnedSearchInput';
import { DEFAULT_ATTACHMENT_ACCEPT, readFilesAsAttachmentRecords } from '../utils/fileAttachments';

const DEFAULT_TEACHER: Partial<ITeacher> = {
  status: 'ACTIVE',
  teachSubjects: [],
  teachLevels: [],
  certificates: [],
  assignedClassIds: [],
  attachments: []
};

const TrainingTeachers: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [teachers, setTeachers] = useState<ITeacher[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [newTeacher, setNewTeacher] = useState<Partial<ITeacher>>(DEFAULT_TEACHER);
  const [isProcessingAttachments, setIsProcessingAttachments] = useState(false);

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

  const statusLabelMap: Record<'ALL' | 'ACTIVE' | 'INACTIVE', string> = {
    ALL: 'Tat ca',
    ACTIVE: 'Dang hoat dong',
    INACTIVE: 'Da nghi'
  };

  const teacherStatusConfig: Record<ITeacher['status'], { label: string; className: string }> = {
    ACTIVE: {
      label: 'Đang hoạt động',
      className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
    },
    INACTIVE: {
      label: 'Đã nghỉ',
      className: 'bg-rose-50 text-rose-700 ring-1 ring-rose-100'
    }
  };

  const activeSearchChips = useMemo<PinnedSearchChip[]>(() => {
    if (filterStatus === 'ALL') return [];
    return [
      {
        key: 'status',
        label: `Trang thai: ${statusLabelMap[filterStatus]}`
      }
    ];
  }, [filterStatus]);

  const removeSearchChip = (chipKey: string) => {
    if (chipKey === 'status') {
      setFilterStatus('ALL');
    }
  };

  const clearAllSearchFilters = () => {
    setSearchTerm('');
    setFilterStatus('ALL');
  };

  const handleCreateTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessingAttachments) return;

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
      attachments: newTeacher.attachments || [],
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

  const handleDraftAttachmentSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setIsProcessingAttachments(true);
      const nextAttachments = await readFilesAsAttachmentRecords(event.target.files);
      if (nextAttachments.length === 0) return;

      setNewTeacher((prev) => ({
        ...prev,
        attachments: [...(prev.attachments || []), ...nextAttachments]
      }));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Không thể tải hồ sơ lên. Vui lòng thử lại.');
    } finally {
      setIsProcessingAttachments(false);
      event.target.value = '';
    }
  };

  const handleRemoveDraftAttachment = (attachmentId: string) => {
    setNewTeacher((prev) => ({
      ...prev,
      attachments: (prev.attachments || []).filter((attachment) => attachment.id !== attachmentId)
    }));
  };

  const odooFieldLabelClass = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500';
  const odooFieldClass =
    'h-11 w-full rounded-md border border-slate-200 bg-white px-3.5 text-sm text-slate-700 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100';

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
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="min-w-[280px] max-w-[520px] flex-1">
              <PinnedSearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Tim theo ten, ma giao vien, SDT..."
                chips={activeSearchChips}
                onRemoveChip={removeSearchChip}
                onClearAll={clearAllSearchFilters}
                clearAllAriaLabel="Xoa tat ca bo loc giao vien"
                inputClassName="text-sm h-7"
              />
            </div>

            <div className="flex shrink-0 items-center bg-white border border-slate-200 rounded-lg p-1">
              <button
                onClick={() => setFilterStatus('ALL')}
                className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded text-xs font-bold transition-all ${filterStatus === 'ALL' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setFilterStatus('ACTIVE')}
                className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded text-xs font-bold transition-all ${filterStatus === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                Đang hoạt động
              </button>
              <button
                onClick={() => setFilterStatus('INACTIVE')}
                className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded text-xs font-bold transition-all ${filterStatus === 'INACTIVE' ? 'bg-rose-50 text-rose-700' : 'text-slate-500 hover:bg-slate-50'}`}
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
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-16 text-center">STT</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Họ tên / Định danh</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Chuyên môn</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Hợp đồng & Nhân sự</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Lớp đang nhận</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTeachers.map((teacher, index) => (
                <tr
                  key={teacher.id}
                  className="hover:bg-slate-50 transition-colors group cursor-pointer"
                  onClick={() => navigate(`/training/teachers/${teacher.id}`)}
                >
                  <td className="px-6 py-4 text-center font-semibold text-slate-500">{index + 1}</td>
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
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-700">{teacher.contractType}</div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <Briefcase size={12} /> Vào làm: {new Date(teacher.startDate).toLocaleDateString('vi-VN')}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${teacherStatusConfig[teacher.status].className}`}
                    >
                      {teacherStatusConfig[teacher.status].label}
                    </span>
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/45 backdrop-blur-[2px]">
          <div className="flex min-h-full items-center justify-center p-4 md:p-6">
            <div className="w-full max-w-5xl overflow-hidden rounded-2xl border border-sky-100 bg-[#f5faff] shadow-[0_28px_80px_rgba(15,23,42,0.22)]">
              <div className="border-b border-sky-100 bg-white/95 px-6 py-5 md:px-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="mb-2 inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
                      Teacher Form
                    </div>
                    <h3 className="text-[28px] font-semibold tracking-tight text-slate-900">Tạo Giáo viên mới</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Biểu mẫu hồ sơ theo kiểu sheet của Odoo, giữ nguyên dữ liệu và quy trình tạo giáo viên.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-xl text-slate-400 transition hover:border-slate-300 hover:text-slate-600"
                    aria-label="Đóng"
                  >
                    &times;
                  </button>
                </div>
              </div>

              <form onSubmit={handleCreateTeacher} className="px-6 py-6 md:px-7">
                <div className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.06)]">
                  <div className="border-b border-sky-100 bg-[#f4faff] px-5 py-3.5">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-md border border-sky-200 bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">Form</span>
                      <span className="rounded-md border border-sky-100 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                        Hồ sơ giáo viên
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
                    <section className="rounded-xl border border-slate-200 bg-[#fcfcfd] p-5">
                      <div className="mb-5 flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-100 text-sm font-bold text-sky-700">
                          1
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-700">Thông tin cá nhân</h4>
                          <p className="text-xs text-slate-500">Thông tin nhận diện và liên hệ cơ bản của giáo viên.</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className={odooFieldLabelClass}>Họ và tên</label>
                          <input
                            required
                            className={odooFieldClass}
                            value={newTeacher.fullName || ''}
                            onChange={(e) => setNewTeacher({ ...newTeacher, fullName: e.target.value })}
                          />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <label className={odooFieldLabelClass}>Ngày sinh</label>
                            <input
                              type="date"
                              className={odooFieldClass}
                              value={newTeacher.dob || ''}
                              onChange={(e) => setNewTeacher({ ...newTeacher, dob: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className={odooFieldLabelClass}>Số điện thoại</label>
                            <input
                              required
                              className={odooFieldClass}
                              value={newTeacher.phone || ''}
                              onChange={(e) => setNewTeacher({ ...newTeacher, phone: e.target.value })}
                            />
                          </div>
                        </div>

                        <div>
                          <label className={odooFieldLabelClass}>Email</label>
                          <input
                            type="email"
                            className={odooFieldClass}
                            value={newTeacher.email || ''}
                            onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })}
                          />
                        </div>
                      </div>
                    </section>

                    <section className="rounded-xl border border-slate-200 bg-[#fcfcfd] p-5">
                      <div className="mb-5 flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-100 text-sm font-bold text-sky-700">
                          2
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-700">Chuyên môn và hợp đồng</h4>
                          <p className="text-xs text-slate-500">Nhóm trường phục vụ phân công giảng dạy và quản trị nhân sự.</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <label className={odooFieldLabelClass}>Loại hợp đồng</label>
                            <select
                              className={odooFieldClass}
                              value={newTeacher.contractType || 'Full-time'}
                              onChange={(e) => setNewTeacher({ ...newTeacher, contractType: e.target.value as ITeacher['contractType'] })}
                            >
                              <option value="Full-time">Full-time</option>
                              <option value="Part-time">Part-time</option>
                              <option value="CTV">CTV</option>
                            </select>
                          </div>
                          <div>
                            <label className={odooFieldLabelClass}>Ngày vào làm</label>
                            <input
                              type="date"
                              className={odooFieldClass}
                              value={newTeacher.startDate || ''}
                              onChange={(e) => setNewTeacher({ ...newTeacher, startDate: e.target.value })}
                            />
                          </div>
                        </div>

                        <div>
                          <label className={odooFieldLabelClass}>Trình độ có thể dạy</label>
                          <input
                            placeholder="Ví dụ: A1, A2, IELTS"
                            className={odooFieldClass}
                            value={newTeacher.teachLevels?.join(', ') || ''}
                            onChange={(e) => setNewTeacher({ ...newTeacher, teachLevels: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                          />
                        </div>

                        <div>
                          <label className={odooFieldLabelClass}>Môn dạy</label>
                          <input
                            placeholder="Ví dụ: German, English"
                            className={odooFieldClass}
                            value={newTeacher.teachSubjects?.join(', ') || ''}
                            onChange={(e) => setNewTeacher({ ...newTeacher, teachSubjects: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                          />
                        </div>

                        <div>
                          <label className={odooFieldLabelClass}>Bằng cấp / chứng chỉ</label>
                          <input
                            className={odooFieldClass}
                            value={newTeacher.certificates?.join(', ') || ''}
                            onChange={(e) => setNewTeacher({ ...newTeacher, certificates: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                          />
                        </div>
                      </div>
                    </section>

                    <section className="rounded-xl border border-slate-200 bg-[#fcfcfd] p-5 xl:col-span-2">
                      <div className="mb-5 flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-100 text-sm font-bold text-sky-700">
                          3
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-700">Hồ sơ đính kèm</h4>
                          <p className="text-xs text-slate-500">Lưu CV, bằng cấp scan và các giấy tờ nội bộ trực tiếp trong hồ sơ giáo viên.</p>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-dashed border-sky-200 bg-sky-50/40 p-4">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div>
                            <div className="text-sm font-semibold text-slate-700">Tệp hồ sơ giáo viên</div>
                            <p className="mt-1 text-xs text-slate-500">Hỗ trợ PDF, ảnh, Word, Excel. Mỗi tệp tối đa 3MB vì dữ liệu đang lưu trong local storage.</p>
                          </div>
                          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-sky-200 bg-white px-4 py-2 text-sm font-semibold text-sky-700 transition hover:border-sky-300 hover:bg-sky-50">
                            <Paperclip size={15} />
                            {isProcessingAttachments ? 'Đang tải...' : 'Thêm hồ sơ'}
                            <input
                              type="file"
                              multiple
                              accept={DEFAULT_ATTACHMENT_ACCEPT}
                              className="hidden"
                              disabled={isProcessingAttachments}
                              onChange={handleDraftAttachmentSelect}
                            />
                          </label>
                        </div>

                        {newTeacher.attachments && newTeacher.attachments.length > 0 ? (
                          <div className="mt-4 grid gap-2 md:grid-cols-2">
                            {newTeacher.attachments.map((attachment) => (
                              <div
                                key={attachment.id}
                                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2"
                              >
                                <div className="flex min-w-0 items-center gap-2">
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                                    <FileText size={14} />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="truncate text-sm font-medium text-slate-700">{attachment.name}</div>
                                    <div className="text-xs text-slate-400">Sẽ được lưu cùng hồ sơ giáo viên</div>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDraftAttachment(attachment.id)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 text-rose-600 transition hover:bg-rose-50"
                                  aria-label={`Xóa ${attachment.name}`}
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
                            Chưa có hồ sơ đính kèm.
                          </div>
                        )}
                      </div>
                    </section>
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-sky-100 bg-white/90 px-5 py-4 md:flex-row md:items-center md:justify-between">
                  <div className="text-sm text-slate-500">
                    Giữ nguyên toàn bộ trường dữ liệu hiện có, chỉ tinh chỉnh bố cục và phong cách hiển thị.
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="rounded-md border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      disabled={isProcessingAttachments}
                      className="rounded-md bg-sky-400 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-500"
                    >
                      {isProcessingAttachments ? 'Đang xử lý hồ sơ...' : 'Lưu Giáo viên'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainingTeachers;
