import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock, DollarSign, FileText, ShieldAlert } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { IStudent, IStudentClaim, StudentClaimStatus, StudentClaimType, UserRole } from '../types';
import { createStudentClaim, getStudentClaims, getStudents, updateStudentClaim } from '../utils/storage';

type ProfileTabKey = 'history' | 'deals' | 'contracts' | 'payments' | 'academic' | 'claims';
type ClaimModalMode = 'create' | 'process' | 'cancel';

const CLAIM_TYPE_OPTIONS: Array<{ value: StudentClaimType; label: string }> = [
  { value: 'KHONG_CO', label: 'Không có' },
  { value: 'CHUYEN_LOP', label: 'Chuyển lớp' },
  { value: 'TAM_DUNG', label: 'Tạm dừng' },
  { value: 'BAO_LUU', label: 'Bảo lưu' },
  { value: 'HOC_LAI', label: 'Học lại' },
  { value: 'KHAC', label: 'Khác' }
];

const CLAIM_STATUS_OPTIONS: Array<{ value: StudentClaimStatus; label: string }> = [
  { value: 'KHONG_CO', label: 'Không có' },
  { value: 'CHO_XU_LY', label: 'Chờ xử lý' },
  { value: 'DA_XU_LY', label: 'Đã xử lý' },
  { value: 'TU_CHOI', label: 'Từ chối' },
  { value: 'DA_HUY', label: 'Đã hủy' }
];

const CLAIM_TYPE_LABELS: Record<StudentClaimType, string> = Object.fromEntries(
  CLAIM_TYPE_OPTIONS.map((item) => [item.value, item.label])
) as Record<StudentClaimType, string>;

const CLAIM_STATUS_LABELS: Record<StudentClaimStatus, string> = Object.fromEntries(
  CLAIM_STATUS_OPTIONS.map((item) => [item.value, item.label])
) as Record<StudentClaimStatus, string>;

const getClaimBadgeClass = (status?: StudentClaimStatus) => {
  if (status === 'CHO_XU_LY') return 'bg-amber-100 text-amber-700';
  if (status === 'DA_XU_LY') return 'bg-emerald-100 text-emerald-700';
  if (status === 'TU_CHOI') return 'bg-rose-100 text-rose-700';
  if (status === 'DA_HUY') return 'bg-slate-100 text-slate-600';
  return 'bg-slate-100 text-slate-600';
};

const getStudentStatusClass = (value?: string) => {
  if (value?.includes('Đang học') || value?.includes('ENROLLED')) return 'bg-green-100 text-green-700';
  if (value?.includes('Chờ') || value?.includes('ADMISSION')) return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-700';
};

const formatDate = (value?: string) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN');
};

const formatDateTime = (value?: string) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN');
};

const getInitialTab = (value: string | null): ProfileTabKey => (value === 'claims' ? 'claims' : 'history');

const StudentProfile: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const [students, setStudents] = useState<IStudent[]>([]);
  const [claims, setClaims] = useState<IStudentClaim[]>([]);
  const [activeTab, setActiveTab] = useState<ProfileTabKey>(() => getInitialTab(searchParams.get('tab')));
  const [claimModalMode, setClaimModalMode] = useState<ClaimModalMode | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<IStudentClaim | null>(null);
  const [claimForm, setClaimForm] = useState<{ claimType: StudentClaimType; claimStatus: StudentClaimStatus; reason: string; note: string }>({
    claimType: 'CHUYEN_LOP',
    claimStatus: 'CHO_XU_LY',
    reason: '',
    note: ''
  });

  const isTeacher = user?.role === UserRole.TEACHER;
  const isSales = user?.role === UserRole.SALES_REP || user?.role === UserRole.SALES_LEADER;
  const canManageClaims = !isTeacher;

  const loadData = () => {
    setStudents(getStudents());
    setClaims(id ? getStudentClaims().filter((item) => item.studentId === id) : []);
  };

  useEffect(() => {
    loadData();
    const events = ['educrm:students-changed', 'educrm:student-claims-changed'] as const;
    events.forEach((eventName) => window.addEventListener(eventName, loadData as EventListener));
    return () => events.forEach((eventName) => window.removeEventListener(eventName, loadData as EventListener));
  }, [id]);

  useEffect(() => {
    const nextTab = getInitialTab(searchParams.get('tab'));
    setActiveTab((prev) => (prev === nextTab ? prev : nextTab));
  }, [searchParams]);

  const handleTabChange = (tab: ProfileTabKey) => {
    setActiveTab(tab);
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (tab === 'claims') params.set('tab', 'claims');
      else params.delete('tab');
      return params;
    }, { replace: true });
  };

  const student = useMemo(() => students.find((item) => item.id === id), [id, students]);
  const latestClaim = claims[0];
  const latestPendingClaim = claims.find((item) => item.claimStatus === 'CHO_XU_LY');
  const latestClaimTypeLabel = latestClaim ? CLAIM_TYPE_LABELS[latestClaim.claimType] : CLAIM_TYPE_LABELS.KHONG_CO;
  const latestClaimStatusLabel = latestClaim ? CLAIM_STATUS_LABELS[latestClaim.claimStatus] : CLAIM_STATUS_LABELS.KHONG_CO;

  const profileStudent = student || {
    id: id || '123456',
    code: 'HV-2024-089',
    name: 'Nguyễn Thùy Linh',
    phone: '098 765 4321',
    email: 'linh.nguyen@email.com',
    address: 'Số 18, Ngõ 5, Nguyễn Chí Thanh, Hà Nội',
    dob: '2004-01-15',
    guardianName: 'Nguyễn Văn Hùng',
    guardianPhone: '091 234 5678',
    campus: 'Hà Nội',
    status: 'ENROLLED' as IStudent['status'],
    createdAt: new Date().toISOString()
  };

  const timeline = [
    { icon: FileText, title: 'Nộp hồ sơ ghi danh', date: '01/07/2024', status: 'completed' },
    { icon: CheckCircle2, title: 'Phỏng vấn đầu vào', date: '15/07/2024', status: 'completed' },
    { icon: CheckCircle2, title: 'Xác nhận nhập học', date: '15/08/2024', status: 'completed' },
    { icon: DollarSign, title: 'Hoàn thành đóng phí đợt 1', date: '01/09/2024', status: 'completed' },
    { icon: Clock, title: 'Dự kiến thi B1', date: '15/12/2024', status: 'pending' }
  ];

  const closeClaimModal = () => {
    setClaimModalMode(null);
    setSelectedClaim(null);
    setClaimForm({
      claimType: 'CHUYEN_LOP',
      claimStatus: 'CHO_XU_LY',
      reason: '',
      note: ''
    });
  };

  const openCreateClaimModal = () => {
    setSelectedClaim(null);
    setClaimModalMode('create');
    setClaimForm({
      claimType: latestPendingClaim?.claimType || latestClaim?.claimType || 'CHUYEN_LOP',
      claimStatus: 'CHO_XU_LY',
      reason: '',
      note: ''
    });
  };

  const openProcessClaimModal = (claim?: IStudentClaim) => {
    const targetClaim = claim || latestPendingClaim || latestClaim;
    if (!targetClaim) return;
    setSelectedClaim(targetClaim);
    setClaimModalMode('process');
    setClaimForm({
      claimType: targetClaim.claimType,
      claimStatus: targetClaim.claimStatus === 'CHO_XU_LY' ? 'DA_XU_LY' : targetClaim.claimStatus,
      reason: targetClaim.reason || '',
      note: targetClaim.note || ''
    });
  };

  const openCancelClaimModal = (claim?: IStudentClaim) => {
    const targetClaim = claim || latestPendingClaim || latestClaim;
    if (!targetClaim) return;
    setSelectedClaim(targetClaim);
    setClaimModalMode('cancel');
    setClaimForm({
      claimType: targetClaim.claimType,
      claimStatus: 'DA_HUY',
      reason: targetClaim.reason || '',
      note: targetClaim.note || ''
    });
  };

  const submitClaim = () => {
    const actor = user?.name || user?.id || 'system';
    const reason = claimForm.reason.trim();
    const note = claimForm.note.trim();

    if (claimModalMode === 'create') {
      createStudentClaim({
        id: `CLM-${Date.now()}`,
        studentId: profileStudent.id,
        claimType: claimForm.claimType,
        claimStatus: claimForm.claimStatus,
        reason,
        note,
        createdAt: new Date().toISOString(),
        createdBy: actor
      });
      closeClaimModal();
      loadData();
      return;
    }

    if (!selectedClaim) return;

    updateStudentClaim({
      ...selectedClaim,
      claimType: claimForm.claimType,
      claimStatus: claimModalMode === 'cancel' ? 'DA_HUY' : claimForm.claimStatus,
      reason,
      note,
      updatedAt: new Date().toISOString(),
      updatedBy: actor
    });
    closeClaimModal();
    loadData();
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-[#f8fafc] font-sans text-[#0d141b]">
      <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="rounded-full p-2 transition-colors hover:bg-slate-200">
              <ArrowLeft size={24} className="text-slate-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-[#0d141b]">Hồ sơ Học viên (Student 360)</h1>
              <p className="text-sm text-[#4c739a]">Quản lý thông tin cá nhân, lịch sử học tập và claim xử lý.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="rounded-lg border border-[#cfdbe7] bg-white px-4 py-2 text-sm font-bold text-[#0d141b] hover:bg-slate-50">
              Xuất hồ sơ
            </button>
            {!isTeacher ? (
              <button className="rounded-lg bg-[#1380ec] px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-700">
                Cập nhật
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex w-full flex-shrink-0 flex-col gap-6 lg:w-80">
            <div className="flex flex-col items-center rounded-xl border border-[#cfdbe7] bg-white p-6 shadow-sm">
              <div className="mb-4 flex h-32 w-32 items-center justify-center rounded-full border-4 border-slate-50 bg-slate-100 text-4xl font-bold text-slate-500 shadow-inner">
                {String(profileStudent.name || 'H').charAt(0).toUpperCase()}
              </div>
              <h2 className="text-center text-[22px] font-bold text-[#0d141b]">{profileStudent.name}</h2>
              <p className="text-sm text-[#4c739a]">Mã HV: {profileStudent.code || '--'}</p>
              <span className={`mt-2 rounded-full px-3 py-1 text-xs font-bold uppercase ${getStudentStatusClass(String(profileStudent.status || ''))}`}>
                {String(profileStudent.status || 'Đang học')}
              </span>
            </div>

            <div className="overflow-hidden rounded-xl border border-[#cfdbe7] bg-white shadow-sm">
              <h3 className="px-6 pb-2 pt-5 text-lg font-bold text-[#0d141b]">Thông tin cá nhân</h3>
              <div className="grid grid-cols-1 gap-y-4 p-6 pt-2">
                <div className="flex justify-between border-t border-[#cfdbe7] pt-4">
                  <span className="text-sm text-[#4c739a]">Email</span>
                  <span className="text-right text-sm font-medium text-[#0d141b]">{profileStudent.email || '--'}</span>
                </div>
                <div className="flex justify-between border-t border-[#cfdbe7] pt-4">
                  <span className="text-sm text-[#4c739a]">Điện thoại</span>
                  <span className="text-sm font-medium text-[#0d141b]">{profileStudent.phone || '--'}</span>
                </div>
                <div className="flex justify-between border-t border-[#cfdbe7] pt-4">
                  <span className="text-sm text-[#4c739a]">Địa chỉ</span>
                  <span className="max-w-[160px] text-right text-sm font-medium text-[#0d141b]">{profileStudent.address || '--'}</span>
                </div>
                <div className="flex justify-between border-t border-[#cfdbe7] pt-4">
                  <span className="text-sm text-[#4c739a]">Ngày sinh</span>
                  <span className="text-sm font-medium text-[#0d141b]">{formatDate(profileStudent.dob)}</span>
                </div>
                <div className="flex justify-between border-t border-[#cfdbe7] pt-4">
                  <span className="text-sm text-[#4c739a]">Cơ sở</span>
                  <span className="text-sm font-medium text-[#0d141b]">{profileStudent.campus || '--'}</span>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-[#cfdbe7] bg-white shadow-sm">
              <h3 className="px-6 pb-2 pt-5 text-lg font-bold text-[#0d141b]">Phụ huynh / Bảo hộ</h3>
              <div className="grid grid-cols-1 gap-y-4 p-6 pt-2">
                <div className="flex justify-between border-t border-[#cfdbe7] pt-4">
                  <span className="text-sm text-[#4c739a]">Họ tên</span>
                  <span className="text-sm font-medium text-[#0d141b]">{profileStudent.guardianName || '--'}</span>
                </div>
                <div className="flex justify-between border-t border-[#cfdbe7] pt-4">
                  <span className="text-sm text-[#4c739a]">Điện thoại</span>
                  <span className="text-sm font-medium text-[#0d141b]">{profileStudent.guardianPhone || '--'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-6">
            <div className="overflow-hidden rounded-xl border border-[#cfdbe7] bg-white p-0 shadow-sm">
              <div className="border-b border-[#cfdbe7] p-6 pb-0">
                <h2 className="mb-4 text-[22px] font-bold text-[#0d141b]">Hồ sơ chi tiết</h2>
                <div className="flex gap-8 overflow-x-auto">
                  <button onClick={() => handleTabChange('history')} className={`whitespace-nowrap border-b-[3px] pb-4 text-sm font-bold transition-colors ${activeTab === 'history' ? 'border-[#1380ec] text-[#0d141b]' : 'border-transparent text-[#4c739a] hover:text-[#0d141b]'}`}>
                    Lịch sử
                  </button>
                  <button onClick={() => handleTabChange('academic')} className={`whitespace-nowrap border-b-[3px] pb-4 text-sm font-bold transition-colors ${activeTab === 'academic' ? 'border-[#1380ec] text-[#0d141b]' : 'border-transparent text-[#4c739a] hover:text-[#0d141b]'}`}>
                    Học vụ
                  </button>
                  <button onClick={() => handleTabChange('claims')} className={`whitespace-nowrap border-b-[3px] pb-4 text-sm font-bold transition-colors ${activeTab === 'claims' ? 'border-[#1380ec] text-[#0d141b]' : 'border-transparent text-[#4c739a] hover:text-[#0d141b]'}`}>
                    Claim
                  </button>
                  {!isTeacher ? (
                    <>
                      <button onClick={() => handleTabChange('deals')} className={`whitespace-nowrap border-b-[3px] pb-4 text-sm font-bold transition-colors ${activeTab === 'deals' ? 'border-[#1380ec] text-[#0d141b]' : 'border-transparent text-[#4c739a] hover:text-[#0d141b]'}`}>
                        Deals
                      </button>
                      <button onClick={() => handleTabChange('contracts')} className={`whitespace-nowrap border-b-[3px] pb-4 text-sm font-bold transition-colors ${activeTab === 'contracts' ? 'border-[#1380ec] text-[#0d141b]' : 'border-transparent text-[#4c739a] hover:text-[#0d141b]'}`}>
                        Hợp đồng
                      </button>
                      <button onClick={() => handleTabChange('payments')} className={`whitespace-nowrap border-b-[3px] pb-4 text-sm font-bold transition-colors ${activeTab === 'payments' ? 'border-[#1380ec] text-[#0d141b]' : 'border-transparent text-[#4c739a] hover:text-[#0d141b]'}`}>
                        Tài chính
                      </button>
                    </>
                  ) : null}
                </div>
              </div>

              {activeTab === 'history' ? (
                <div className="space-y-6 p-6">
                  <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">Yêu cầu xử lý</h3>
                        <p className="mt-1 text-sm text-slate-500">Claim nằm trong hồ sơ học viên và được tạo, xử lý trực tiếp tại đây.</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getClaimBadgeClass(latestClaim?.claimStatus)}`}>
                        {latestClaimStatusLabel}
                      </span>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <div className="space-y-3">
                        <div className="flex justify-between gap-4 border-b border-slate-200 pb-2">
                          <span className="text-sm text-slate-500">Loại claim</span>
                          <span className="text-right text-sm font-semibold text-slate-900">{latestClaimTypeLabel}</span>
                        </div>
                        <div className="flex justify-between gap-4 border-b border-slate-200 pb-2">
                          <span className="text-sm text-slate-500">Trạng thái claim</span>
                          <span className="text-right text-sm font-semibold text-slate-900">{latestClaimStatusLabel}</span>
                        </div>
                        <div className="flex justify-between gap-4 border-b border-slate-200 pb-2">
                          <span className="text-sm text-slate-500">Ngày tạo</span>
                          <span className="text-right text-sm font-semibold text-slate-900">{formatDateTime(latestClaim?.createdAt)}</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between gap-4 border-b border-slate-200 pb-2">
                          <span className="text-sm text-slate-500">Người tạo</span>
                          <span className="text-right text-sm font-semibold text-slate-900">{latestClaim?.createdBy || '--'}</span>
                        </div>
                        <div className="flex justify-between gap-4 border-b border-slate-200 pb-2">
                          <span className="text-sm text-slate-500">Lý do</span>
                          <span className="text-right text-sm font-semibold text-slate-900">{latestClaim?.reason || '--'}</span>
                        </div>
                        <div className="flex justify-between gap-4 border-b border-slate-200 pb-2">
                          <span className="text-sm text-slate-500">Ghi chú</span>
                          <span className="text-right text-sm font-semibold text-slate-900">{latestClaim?.note || '--'}</span>
                        </div>
                      </div>
                    </div>

                    {canManageClaims ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button onClick={openCreateClaimModal} className="rounded-lg bg-[#1380ec] px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">
                          Tạo claim
                        </button>
                        <button onClick={() => openProcessClaimModal()} disabled={!latestPendingClaim} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                          Xử lý claim
                        </button>
                        <button onClick={() => openCancelClaimModal()} disabled={!latestPendingClaim} className="rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40">
                          Hủy claim
                        </button>
                      </div>
                    ) : null}
                  </section>

                  <div className="grid grid-cols-[40px_1fr] gap-x-2">
                    {timeline.map((event, index) => {
                      const isLast = index === timeline.length - 1;
                      const isPending = event.status === 'pending';
                      return (
                        <React.Fragment key={event.title}>
                          <div className="flex flex-col items-center gap-1">
                            {index > 0 ? <div className={`h-3 w-[1.5px] ${isPending ? 'bg-slate-200' : 'bg-[#cfdbe7]'}`} /> : null}
                            <div className={`text-[#0d141b] ${isPending ? 'opacity-40' : ''}`}>
                              <event.icon size={24} />
                            </div>
                            {!isLast ? <div className={`grow w-[1.5px] ${isPending ? 'bg-slate-200' : 'bg-[#cfdbe7]'}`} /> : null}
                          </div>
                          <div className={`flex flex-col py-3 ${isPending ? 'opacity-50' : ''}`}>
                            <p className="text-base font-medium leading-normal text-[#0d141b]">{event.title}</p>
                            <p className="text-base font-normal leading-normal text-[#4c739a]">{event.date}</p>
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {activeTab === 'academic' ? (
                <div className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-bold text-slate-900">Tiến độ học tập</h3>
                    {isSales ? <span className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700">Dữ liệu dùng để tư vấn Upsell</span> : null}
                  </div>
                  <div className="space-y-4">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="font-bold text-slate-800">{profileStudent.className || 'Lớp Tiếng Đức A1'}</p>
                        <span className="text-xs font-bold text-green-600">Đang học</span>
                      </div>
                      <div className="flex gap-6 text-sm text-slate-600">
                        <p>Chuyên cần: <strong>95%</strong></p>
                        <p>Điểm GK: <strong>8.5</strong></p>
                        <p>Điểm CK: <strong>--</strong></p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {activeTab === 'claims' ? (
                <div className="space-y-6 p-6">
                  <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">Yêu cầu xử lý</h3>
                        <p className="mt-1 text-sm text-slate-500">Claim nằm trong hồ sơ học viên và được tạo, xử lý trực tiếp tại đây.</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getClaimBadgeClass(latestClaim?.claimStatus)}`}>
                        {latestClaimStatusLabel}
                      </span>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <div className="space-y-3">
                        <div className="flex justify-between gap-4 border-b border-slate-200 pb-2">
                          <span className="text-sm text-slate-500">Loại claim</span>
                          <span className="text-right text-sm font-semibold text-slate-900">{latestClaimTypeLabel}</span>
                        </div>
                        <div className="flex justify-between gap-4 border-b border-slate-200 pb-2">
                          <span className="text-sm text-slate-500">Trạng thái claim</span>
                          <span className="text-right text-sm font-semibold text-slate-900">{latestClaimStatusLabel}</span>
                        </div>
                        <div className="flex justify-between gap-4 border-b border-slate-200 pb-2">
                          <span className="text-sm text-slate-500">Ngày tạo</span>
                          <span className="text-right text-sm font-semibold text-slate-900">{formatDateTime(latestClaim?.createdAt)}</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between gap-4 border-b border-slate-200 pb-2">
                          <span className="text-sm text-slate-500">Người tạo</span>
                          <span className="text-right text-sm font-semibold text-slate-900">{latestClaim?.createdBy || '--'}</span>
                        </div>
                        <div className="flex justify-between gap-4 border-b border-slate-200 pb-2">
                          <span className="text-sm text-slate-500">Lý do</span>
                          <span className="text-right text-sm font-semibold text-slate-900">{latestClaim?.reason || '--'}</span>
                        </div>
                        <div className="flex justify-between gap-4 border-b border-slate-200 pb-2">
                          <span className="text-sm text-slate-500">Ghi chú</span>
                          <span className="text-right text-sm font-semibold text-slate-900">{latestClaim?.note || '--'}</span>
                        </div>
                      </div>
                    </div>

                    {canManageClaims ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button onClick={openCreateClaimModal} className="rounded-lg bg-[#1380ec] px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">
                          Tạo claim
                        </button>
                        <button onClick={() => openProcessClaimModal()} disabled={!latestPendingClaim} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                          Xử lý claim
                        </button>
                        <button onClick={() => openCancelClaimModal()} disabled={!latestPendingClaim} className="rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40">
                          Hủy claim
                        </button>
                      </div>
                    ) : null}
                  </section>

                  <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <div className="border-b border-slate-200 px-5 py-4">
                      <h3 className="text-lg font-bold text-slate-900">Lịch sử claim</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase text-slate-500">
                          <tr>
                            <th className="px-4 py-3">Claim type</th>
                            <th className="px-4 py-3">Claim status</th>
                            <th className="px-4 py-3">Ngày tạo</th>
                            <th className="px-4 py-3">Người tạo</th>
                            <th className="px-4 py-3">Lý do</th>
                            <th className="px-4 py-3 text-right">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {claims.length > 0 ? claims.map((claim) => (
                            <tr key={claim.id}>
                              <td className="px-4 py-3 text-slate-800">{CLAIM_TYPE_LABELS[claim.claimType]}</td>
                              <td className="px-4 py-3">
                                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getClaimBadgeClass(claim.claimStatus)}`}>
                                  {CLAIM_STATUS_LABELS[claim.claimStatus]}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-600">{formatDateTime(claim.createdAt)}</td>
                              <td className="px-4 py-3 text-slate-600">{claim.createdBy}</td>
                              <td className="px-4 py-3 text-slate-600">{claim.reason || '--'}</td>
                              <td className="px-4 py-3">
                                {canManageClaims ? (
                                  <div className="flex justify-end gap-2">
                                    <button onClick={() => openProcessClaimModal(claim)} disabled={claim.claimStatus !== 'CHO_XU_LY'} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                                      Xử lý
                                    </button>
                                    <button onClick={() => openCancelClaimModal(claim)} disabled={claim.claimStatus !== 'CHO_XU_LY'} className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40">
                                      Hủy
                                    </button>
                                  </div>
                                ) : null}
                              </td>
                            </tr>
                          )) : (
                            <tr>
                              <td colSpan={6} className="px-4 py-10 text-center text-slate-500">Chưa có claim nào trong hồ sơ học viên này.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </div>
              ) : null}

              {(activeTab === 'deals' || activeTab === 'contracts' || activeTab === 'payments') ? (
                <div className="p-12 text-center text-[#4c739a]">
                  <ShieldAlert className="mx-auto mb-2 text-slate-300" size={48} />
                  <p>Dữ liệu {activeTab} được bảo mật và chỉ hiển thị cho bộ phận liên quan.</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {claimModalMode ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{claimModalMode === 'create' ? 'Tạo claim' : claimModalMode === 'process' ? 'Xử lý claim' : 'Hủy claim'}</h3>
                <p className="mt-1 text-sm text-slate-500">{profileStudent.name} • {profileStudent.code || '--'}</p>
              </div>
              <button onClick={closeClaimModal} className="text-sm font-medium text-slate-500">Đóng</button>
            </div>
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Claim type</label>
                  <select value={claimForm.claimType} onChange={(event) => setClaimForm((prev) => ({ ...prev, claimType: event.target.value as StudentClaimType, claimStatus: claimModalMode === 'create' && event.target.value === 'KHONG_CO' ? 'KHONG_CO' : prev.claimStatus === 'KHONG_CO' ? 'CHO_XU_LY' : prev.claimStatus }))} disabled={claimModalMode !== 'create'} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm disabled:bg-slate-50">
                    {CLAIM_TYPE_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Claim status</label>
                  <select value={claimModalMode === 'cancel' ? 'DA_HUY' : claimForm.claimStatus} onChange={(event) => setClaimForm((prev) => ({ ...prev, claimStatus: event.target.value as StudentClaimStatus }))} disabled={claimModalMode === 'cancel'} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm disabled:bg-slate-50">
                    {(claimModalMode === 'process' ? CLAIM_STATUS_OPTIONS.filter((item) => ['CHO_XU_LY', 'DA_XU_LY', 'TU_CHOI'].includes(item.value)) : CLAIM_STATUS_OPTIONS).map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Lý do</label>
                <textarea value={claimForm.reason} onChange={(event) => setClaimForm((prev) => ({ ...prev, reason: event.target.value }))} className="h-24 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Nhập lý do claim" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Ghi chú</label>
                <textarea value={claimForm.note} onChange={(event) => setClaimForm((prev) => ({ ...prev, note: event.target.value }))} className="h-24 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder={claimModalMode === 'cancel' ? 'Nhập ghi chú hủy claim' : 'Nhập ghi chú xử lý'} />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={closeClaimModal} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">Hủy</button>
              <button onClick={submitClaim} className={`rounded-xl px-4 py-2 text-sm font-semibold text-white ${claimModalMode === 'cancel' ? 'bg-rose-600' : 'bg-slate-900'}`}>
                {claimModalMode === 'create' ? 'Tạo claim' : claimModalMode === 'process' ? 'Lưu xử lý' : 'Xác nhận hủy'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default StudentProfile;
