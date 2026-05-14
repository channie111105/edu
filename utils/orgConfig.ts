// Org Config - Cấu hình tổ chức (Cơ sở & Team/Phòng ban)

const BRANCH_KEY = 'educrm_org_branches';
const TEAM_KEY = 'educrm_org_teams';
export const ORG_CONFIG_EVENT = 'educrm:org-config-changed';

export type BranchType = 'Trụ sở chính' | 'Chi nhánh' | 'Online' | 'Đối tác';
export type BranchStatus = 'Đang hoạt động' | 'Tạm khóa';

export interface OrgBranch {
  id: string;
  name: string;
  code: string;
  type: BranchType;
  address: string;
  manager: string;
  phone: string;
  email: string;
  status: BranchStatus;
  note: string;
  createdAt: string;
}

export type TeamType = 'Sale' | 'Marketing' | 'Hồ sơ' | 'Kế toán' | 'CSKH' | 'Admin' | 'Đào tạo' | 'Khác';
export type TeamStatus = 'Đang hoạt động' | 'Tạm khóa';

export interface OrgTeam {
  id: string;
  name: string;
  code: string;
  type: TeamType;
  branchId: string; // 'all' = Toàn hệ thống
  leader: string;
  description: string;
  status: TeamStatus;
  note: string;
  createdAt: string;
}

// ─── Branches ───────────────────────────────────────────────────────────────

export const getBranches = (): OrgBranch[] => {
  try {
    const raw = localStorage.getItem(BRANCH_KEY);
    return raw ? JSON.parse(raw) : getDefaultBranches();
  } catch {
    return getDefaultBranches();
  }
};

export const saveBranches = (branches: OrgBranch[]) => {
  localStorage.setItem(BRANCH_KEY, JSON.stringify(branches));
  window.dispatchEvent(new CustomEvent(ORG_CONFIG_EVENT));
};

const getDefaultBranches = (): OrgBranch[] => [
  {
    id: 'branch-1',
    name: 'Cơ sở 1',
    code: 'CS1',
    type: 'Trụ sở chính',
    address: '',
    manager: '',
    phone: '',
    email: '',
    status: 'Đang hoạt động',
    note: '',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'branch-2',
    name: 'Cơ sở 2',
    code: 'CS2',
    type: 'Chi nhánh',
    address: '',
    manager: '',
    phone: '',
    email: '',
    status: 'Đang hoạt động',
    note: '',
    createdAt: new Date().toISOString(),
  },
];

// ─── Teams ───────────────────────────────────────────────────────────────────

export const getTeams = (): OrgTeam[] => {
  try {
    const raw = localStorage.getItem(TEAM_KEY);
    return raw ? JSON.parse(raw) : getDefaultTeams();
  } catch {
    return getDefaultTeams();
  }
};

export const saveTeams = (teams: OrgTeam[]) => {
  localStorage.setItem(TEAM_KEY, JSON.stringify(teams));
  window.dispatchEvent(new CustomEvent(ORG_CONFIG_EVENT));
};

const getDefaultTeams = (): OrgTeam[] => [
  { id: 't1', name: 'Team KD 1', code: 'KD1', type: 'Sale', branchId: 'branch-1', leader: '', description: '', status: 'Đang hoạt động', note: '', createdAt: new Date().toISOString() },
  { id: 't2', name: 'Team KD 2', code: 'KD2', type: 'Sale', branchId: 'branch-1', leader: '', description: '', status: 'Đang hoạt động', note: '', createdAt: new Date().toISOString() },
  { id: 't3', name: 'Phòng Hồ sơ', code: 'HS', type: 'Hồ sơ', branchId: 'branch-1', leader: '', description: '', status: 'Đang hoạt động', note: '', createdAt: new Date().toISOString() },
  { id: 't4', name: 'Phòng MKT', code: 'MKT', type: 'Marketing', branchId: 'branch-1', leader: '', description: '', status: 'Đang hoạt động', note: '', createdAt: new Date().toISOString() },
  { id: 't5', name: 'Phòng Đào tạo', code: 'DT', type: 'Đào tạo', branchId: 'branch-1', leader: '', description: '', status: 'Đang hoạt động', note: '', createdAt: new Date().toISOString() },
];

export const generateId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
