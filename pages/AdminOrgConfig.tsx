import React, { useEffect, useState } from 'react';
import {
  Building2, Users, Plus, Pencil, EyeOff, Eye, X, CheckCircle,
  Phone, Mail, MapPin, User, Hash, Layers,
} from 'lucide-react';
import {
  OrgBranch, OrgTeam, BranchType, BranchStatus, TeamType, TeamStatus,
  getBranches, saveBranches, getTeams, saveTeams, generateId, ORG_CONFIG_EVENT,
} from '../utils/orgConfig';

// ─── Types ──────────────────────────────────────────────────────────────────

type Tab = 'branches' | 'teams';

const BRANCH_TYPES: BranchType[] = ['Trụ sở chính', 'Chi nhánh', 'Online', 'Đối tác'];
const BRANCH_STATUSES: BranchStatus[] = ['Đang hoạt động', 'Tạm khóa'];
const TEAM_TYPES: TeamType[] = ['Sale', 'Marketing', 'Hồ sơ', 'Kế toán', 'CSKH', 'Admin', 'Đào tạo', 'Khác'];
const TEAM_STATUSES: TeamStatus[] = ['Đang hoạt động', 'Tạm khóa'];

const EMPTY_BRANCH: Omit<OrgBranch, 'id' | 'createdAt'> = {
  name: '', code: '', type: 'Chi nhánh', address: '', manager: '', phone: '', email: '',
  status: 'Đang hoạt động', note: '',
};
const EMPTY_TEAM: Omit<OrgTeam, 'id' | 'createdAt'> = {
  name: '', code: '', type: 'Sale', branchId: '', leader: '', description: '',
  status: 'Đang hoạt động', note: '',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const statusBadge = (status: BranchStatus | TeamStatus) =>
  status === 'Đang hoạt động'
    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    : 'bg-amber-50 text-amber-700 border border-amber-200';

const inputCls = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100';
const labelCls = 'mb-1.5 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500';

// ─── Branch Modal ─────────────────────────────────────────────────────────────

const BranchModal: React.FC<{
  initial: Omit<OrgBranch, 'id' | 'createdAt'>;
  onSave: (data: Omit<OrgBranch, 'id' | 'createdAt'>) => void;
  onClose: () => void;
  title: string;
}> = ({ initial, onSave, onClose, title }) => {
  const [form, setForm] = useState(initial);
  const set = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
        </div>
        <div className="grid grid-cols-2 gap-4 overflow-y-auto px-6 py-5 max-h-[70vh]">
          <div className="col-span-2">
            <label className={labelCls}>Tên cơ sở *</label>
            <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} placeholder="VD: Cơ sở Hà Nội" />
          </div>
          <div>
            <label className={labelCls}>Mã cơ sở</label>
            <input className={inputCls} value={form.code} onChange={e => set('code', e.target.value)} placeholder="VD: HN01" />
          </div>
          <div>
            <label className={labelCls}>Loại cơ sở</label>
            <select className={inputCls} value={form.type} onChange={e => set('type', e.target.value as BranchType)}>
              {BRANCH_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Địa chỉ</label>
            <input className={inputCls} value={form.address} onChange={e => set('address', e.target.value)} placeholder="Số nhà, đường, quận, tỉnh/thành" />
          </div>
          <div>
            <label className={labelCls}>Người phụ trách</label>
            <input className={inputCls} value={form.manager} onChange={e => set('manager', e.target.value)} placeholder="Họ tên" />
          </div>
          <div>
            <label className={labelCls}>Số điện thoại</label>
            <input className={inputCls} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="09x..." />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input className={inputCls} value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@..." />
          </div>
          <div>
            <label className={labelCls}>Trạng thái</label>
            <select className={inputCls} value={form.status} onChange={e => set('status', e.target.value as BranchStatus)}>
              {BRANCH_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Ghi chú</label>
            <textarea
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 resize-none"
              rows={2} value={form.note} onChange={e => set('note', e.target.value)} placeholder="Ghi chú thêm..."
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 transition">Hủy</button>
          <button
            onClick={() => { if (form.name.trim()) onSave(form); }}
            className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
          >
            Lưu cơ sở
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Team Modal ───────────────────────────────────────────────────────────────

const TeamModal: React.FC<{
  initial: Omit<OrgTeam, 'id' | 'createdAt'>;
  branches: OrgBranch[];
  onSave: (data: Omit<OrgTeam, 'id' | 'createdAt'>) => void;
  onClose: () => void;
  title: string;
}> = ({ initial, branches, onSave, onClose, title }) => {
  const [form, setForm] = useState(initial);
  const set = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
        </div>
        <div className="grid grid-cols-2 gap-4 overflow-y-auto px-6 py-5 max-h-[70vh]">
          <div className="col-span-2">
            <label className={labelCls}>Tên team / phòng ban *</label>
            <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} placeholder="VD: Team KD 1" />
          </div>
          <div>
            <label className={labelCls}>Mã team</label>
            <input className={inputCls} value={form.code} onChange={e => set('code', e.target.value)} placeholder="VD: KD1" />
          </div>
          <div>
            <label className={labelCls}>Loại team</label>
            <select className={inputCls} value={form.type} onChange={e => set('type', e.target.value as TeamType)}>
              {TEAM_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Thuộc cơ sở</label>
            <select className={inputCls} value={form.branchId} onChange={e => set('branchId', e.target.value)}>
              <option value="">-- Toàn hệ thống --</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Trưởng nhóm</label>
            <input className={inputCls} value={form.leader} onChange={e => set('leader', e.target.value)} placeholder="Họ tên" />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Mô tả nhiệm vụ</label>
            <textarea
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 resize-none"
              rows={2} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Nhiệm vụ chính..."
            />
          </div>
          <div>
            <label className={labelCls}>Trạng thái</label>
            <select className={inputCls} value={form.status} onChange={e => set('status', e.target.value as TeamStatus)}>
              {TEAM_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Ghi chú</label>
            <input className={inputCls} value={form.note} onChange={e => set('note', e.target.value)} placeholder="Ghi chú thêm..." />
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 transition">Hủy</button>
          <button
            onClick={() => { if (form.name.trim()) onSave(form); }}
            className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
          >
            Lưu team
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const AdminOrgConfig: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('branches');
  const [branches, setBranches] = useState<OrgBranch[]>([]);
  const [teams, setTeams] = useState<OrgTeam[]>([]);

  const [branchModal, setBranchModal] = useState<{ open: boolean; editing?: OrgBranch }>({ open: false });
  const [teamModal, setTeamModal] = useState<{ open: boolean; editing?: OrgTeam }>({ open: false });

  useEffect(() => {
    const load = () => {
      setBranches(getBranches());
      setTeams(getTeams());
    };
    load();
    window.addEventListener(ORG_CONFIG_EVENT, load);
    return () => window.removeEventListener(ORG_CONFIG_EVENT, load);
  }, []);

  // ── Branch actions ─────────────────────────────────────────────────────────

  const handleSaveBranch = (data: Omit<OrgBranch, 'id' | 'createdAt'>) => {
    if (branchModal.editing) {
      const next = branches.map(b => b.id === branchModal.editing!.id ? { ...branchModal.editing!, ...data } : b);
      saveBranches(next);
      setBranches(next);
    } else {
      const next = [...branches, { ...data, id: generateId('branch'), createdAt: new Date().toISOString() }];
      saveBranches(next);
      setBranches(next);
    }
    setBranchModal({ open: false });
  };

  const toggleBranchStatus = (id: string) => {
    const next = branches.map(b => b.id === id ? { ...b, status: b.status === 'Đang hoạt động' ? 'Tạm khóa' as BranchStatus : 'Đang hoạt động' as BranchStatus } : b);
    saveBranches(next);
    setBranches(next);
  };

  // ── Team actions ───────────────────────────────────────────────────────────

  const handleSaveTeam = (data: Omit<OrgTeam, 'id' | 'createdAt'>) => {
    if (teamModal.editing) {
      const next = teams.map(t => t.id === teamModal.editing!.id ? { ...teamModal.editing!, ...data } : t);
      saveTeams(next);
      setTeams(next);
    } else {
      const next = [...teams, { ...data, id: generateId('team'), createdAt: new Date().toISOString() }];
      saveTeams(next);
      setTeams(next);
    }
    setTeamModal({ open: false });
  };

  const toggleTeamStatus = (id: string) => {
    const next = teams.map(t => t.id === id ? { ...t, status: t.status === 'Đang hoạt động' ? 'Tạm khóa' as TeamStatus : 'Đang hoạt động' as TeamStatus } : t);
    saveTeams(next);
    setTeams(next);
  };

  const getBranchName = (id: string) => {
    if (!id) return 'Toàn hệ thống';
    return branches.find(b => b.id === id)?.name ?? 'N/A';
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-slate-200 bg-white p-4">
        <div className="mb-6">
          <h1 className="text-lg font-bold text-slate-900">Cấu hình tổ chức</h1>
          <p className="mt-1 text-xs text-slate-500">Quản lý cơ sở & team nội bộ</p>
        </div>
        <nav className="space-y-1">
          {([
            { id: 'branches', label: 'Cơ sở / Chi nhánh', icon: Building2, count: branches.length },
            { id: 'teams',    label: 'Team / Phòng ban',   icon: Users,     count: teams.length },
          ] as const).map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                activeTab === item.id ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <item.icon size={18} className={activeTab === item.id ? 'text-blue-600' : 'text-slate-400'} />
              <span className="flex-1 text-left">{item.label}</span>
              <span className={`text-xs font-bold tabular-nums ${activeTab === item.id ? 'text-blue-600' : 'text-slate-400'}`}>
                {item.count}
              </span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 p-8">
        {activeTab === 'branches' && (
          <>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Cơ sở / Chi nhánh</h2>
                <p className="text-sm text-slate-500">{branches.length} cơ sở đang được quản lý</p>
              </div>
              <button
                onClick={() => setBranchModal({ open: true })}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition"
              >
                <Plus size={16} /> Thêm cơ sở
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {branches.map(b => (
                <div key={b.id} className={`rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md ${b.status === 'Tạm khóa' ? 'opacity-60' : ''}`}>
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-slate-900">{b.name}</p>
                      {b.code && <p className="text-xs text-slate-400">Mã: {b.code}</p>}
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadge(b.status)}`}>
                      {b.status}
                    </span>
                  </div>
                  <div className="mb-4 space-y-1.5 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <Layers size={13} className="text-slate-400" />{b.type}
                    </div>
                    {b.address && <div className="flex items-center gap-2"><MapPin size={13} className="text-slate-400" />{b.address}</div>}
                    {b.manager && <div className="flex items-center gap-2"><User size={13} className="text-slate-400" />{b.manager}</div>}
                    {b.phone && <div className="flex items-center gap-2"><Phone size={13} className="text-slate-400" />{b.phone}</div>}
                    {b.email && <div className="flex items-center gap-2"><Mail size={13} className="text-slate-400" />{b.email}</div>}
                  </div>
                  <div className="flex gap-2 border-t border-slate-100 pt-3">
                    <button
                      onClick={() => setBranchModal({ open: true, editing: b })}
                      className="flex-1 rounded-lg py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition flex items-center justify-center gap-1"
                    >
                      <Pencil size={12} /> Sửa
                    </button>
                    <button
                      onClick={() => toggleBranchStatus(b.id)}
                      className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition flex items-center justify-center gap-1 ${
                        b.status === 'Đang hoạt động'
                          ? 'text-amber-600 hover:bg-amber-50'
                          : 'text-emerald-600 hover:bg-emerald-50'
                      }`}
                    >
                      {b.status === 'Đang hoạt động' ? <><EyeOff size={12} /> Tạm khóa</> : <><Eye size={12} /> Mở lại</>}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'teams' && (
          <>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Team / Phòng ban</h2>
                <p className="text-sm text-slate-500">{teams.length} team đang được quản lý</p>
              </div>
              <button
                onClick={() => setTeamModal({ open: true })}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition"
              >
                <Plus size={16} /> Thêm team
              </button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-left">
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Team</th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Loại</th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Cơ sở</th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Trưởng nhóm</th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Trạng thái</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map(t => (
                    <tr key={t.id} className={`border-b border-slate-100 last:border-0 hover:bg-slate-50/60 ${t.status === 'Tạm khóa' ? 'opacity-60' : ''}`}>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900">{t.name}</p>
                        {t.code && <p className="text-xs text-slate-400">#{t.code}</p>}
                        {t.description && <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">{t.description}</p>}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{t.type}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{getBranchName(t.branchId)}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{t.leader || '—'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadge(t.status)}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => setTeamModal({ open: true, editing: t })}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition"
                            title="Sửa"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => toggleTeamStatus(t.id)}
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition ${
                              t.status === 'Đang hoạt động'
                                ? 'text-slate-400 hover:bg-amber-50 hover:text-amber-600'
                                : 'text-emerald-500 hover:bg-emerald-50'
                            }`}
                            title={t.status === 'Đang hoạt động' ? 'Tạm khóa' : 'Mở lại'}
                          >
                            {t.status === 'Đang hoạt động' ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {teams.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-14 text-center text-sm text-slate-400">
                        Chưa có team nào. Nhấn "Thêm team" để bắt đầu.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>

      {/* Modals */}
      {branchModal.open && (
        <BranchModal
          title={branchModal.editing ? 'Sửa cơ sở' : 'Thêm cơ sở mới'}
          initial={branchModal.editing ? { ...branchModal.editing } : { ...EMPTY_BRANCH }}
          onSave={handleSaveBranch}
          onClose={() => setBranchModal({ open: false })}
        />
      )}
      {teamModal.open && (
        <TeamModal
          title={teamModal.editing ? 'Sửa team' : 'Thêm team mới'}
          initial={teamModal.editing ? { ...teamModal.editing } : { ...EMPTY_TEAM }}
          branches={branches.filter(b => b.status === 'Đang hoạt động')}
          onSave={handleSaveTeam}
          onClose={() => setTeamModal({ open: false })}
        />
      )}
    </div>
  );
};

export default AdminOrgConfig;
