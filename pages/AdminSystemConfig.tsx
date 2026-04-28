import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Building2,
  CheckCircle2,
  Database,
  Flag,
  Globe,
  GraduationCap,
  Megaphone,
  Pencil,
  Plus,
  Search,
  Send,
  Tag as TagIcon,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { LEAD_CHANNEL_OPTIONS } from '../constants';
import { getCampaignNameOptions } from '../utils/campaignCatalog';
import {
  LEAD_CAMPUS_OPTIONS,
  LEAD_PRODUCT_OPTIONS,
  LEAD_SOURCE_OPTIONS,
  LEAD_TARGET_COUNTRY_OPTIONS,
  STUDENT_EDUCATION_LEVEL_OPTIONS,
} from '../utils/leadCreateForm';
import { LEAD_STATUS_OPTIONS } from '../utils/leadStatus';
import {
  createSystemCatalogOption,
  isDefaultSystemCatalogValue,
  LEAD_CHANNEL_OPTIONS as SYSTEM_CHANNEL_OPTIONS,
  SYSTEM_CONFIG_EVENT,
  saveSystemCatalog,
  SystemCatalogId,
  SystemCatalogOption,
} from '../utils/systemConfig';
import {
  FIXED_LEAD_TAGS,
  getCollaborators,
  getLeads,
  getLostReasons,
  getTags,
  saveLeads,
  saveLostReasons,
  saveTags,
} from '../utils/storage';

type ConfigTabId =
  | 'target_countries'
  | 'products'
  | 'campuses'
  | 'lead_statuses'
  | 'tags'
  | 'education_levels'
  | 'campaigns'
  | 'lead_sources'
  | 'lead_channels'
  | 'referrers'
  | 'lost_reasons';

type ConfigTone = 'system' | 'dynamic' | 'custom';

type ConfigRow = {
  id: string;
  value: string;
  label: string;
  sourceLabel: string;
  tone: ConfigTone;
  canEdit: boolean;
  canDelete: boolean;
};

type ConfigMenuItem = {
  id: ConfigTabId;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  emptyHint: string;
  editable?: boolean;
};

const CONFIG_MENU: ConfigMenuItem[] = [
  { id: 'target_countries', label: 'Quốc gia mục tiêu', icon: Globe, emptyHint: 'Chưa có quốc gia mục tiêu nào.', editable: true },
  { id: 'products', label: 'Sản phẩm', icon: Database, emptyHint: 'Chưa có sản phẩm nào.', editable: true },
  { id: 'campuses', label: 'Cơ sở', icon: Building2, emptyHint: 'Chưa có cơ sở nào.', editable: true },
  { id: 'lead_statuses', label: 'Trạng thái Lead', icon: Activity, emptyHint: 'Chưa có trạng thái lead nào.' },
  { id: 'tags', label: 'Tag', icon: TagIcon, emptyHint: 'Chưa có tag nào.', editable: true },
  { id: 'education_levels', label: 'Trình độ', icon: GraduationCap, emptyHint: 'Chưa có trình độ nào.', editable: true },
  { id: 'campaigns', label: 'Chiến dịch', icon: Megaphone, emptyHint: 'Chưa có chiến dịch nào từ trang Chiến dịch.' },
  { id: 'lead_sources', label: 'Nguồn', icon: Database, emptyHint: 'Chưa có nguồn lead nào.', editable: true },
  { id: 'lead_channels', label: 'Kênh', icon: Send, emptyHint: 'Chưa có kênh nào.', editable: true },
  { id: 'referrers', label: 'Người giới thiệu', icon: Users, emptyHint: 'Chưa có cộng tác viên nào để dùng làm người giới thiệu.' },
  { id: 'lost_reasons', label: 'Lý do thất bại', icon: Flag, emptyHint: 'Chưa có lý do thất bại nào.', editable: true },
];

const TAB_HINTS: Partial<Record<ConfigTabId, string>> = {
  target_countries: 'Danh mục này dùng cho form lead và hồ sơ học viên.',
  products: 'Danh mục này dùng khi chọn sản phẩm quan tâm của lead.',
  campuses: 'Danh mục này dùng cho cơ sở, thị trường và phân tuyến sale.',
  tags: 'Tag mới sẽ xuất hiện ngay trong phần phân loại lead.',
  education_levels: 'Dùng cho trình độ học vấn của học viên.',
  lead_sources: 'Dùng cho nguồn phát sinh lead.',
  lead_channels: 'Dùng cho kênh phát sinh lead và dữ liệu marketing.',
  lost_reasons: 'Dùng khi đánh dấu lead là mất hoặc không xác thực.',
};

const READ_ONLY_HINTS: Partial<Record<ConfigTabId, string>> = {
  lead_statuses: 'Trạng thái lead đang gắn với logic nghiệp vụ nên hiện chỉ xem tại đây.',
  campaigns: 'Chiến dịch được đồng bộ từ màn Chiến dịch.',
  referrers: 'Người giới thiệu được lấy từ danh sách Cộng tác viên.',
};

const normalizeToken = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');

const getSystemCatalogId = (tab: ConfigTabId): SystemCatalogId | null => {
  switch (tab) {
    case 'target_countries':
      return 'targetCountries';
    case 'products':
      return 'products';
    case 'campuses':
      return 'campuses';
    case 'education_levels':
      return 'educationLevels';
    case 'lead_sources':
      return 'leadSources';
    case 'lead_channels':
      return 'leadChannels';
    default:
      return null;
  }
};

const getSystemCatalogOptions = (tab: ConfigTabId): SystemCatalogOption[] => {
  switch (tab) {
    case 'target_countries':
      return LEAD_TARGET_COUNTRY_OPTIONS;
    case 'products':
      return LEAD_PRODUCT_OPTIONS;
    case 'campuses':
      return LEAD_CAMPUS_OPTIONS;
    case 'education_levels':
      return STUDENT_EDUCATION_LEVEL_OPTIONS;
    case 'lead_sources':
      return LEAD_SOURCE_OPTIONS;
    case 'lead_channels':
      return SYSTEM_CHANNEL_OPTIONS;
    default:
      return [];
  }
};

const AdminSystemConfig: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ConfigTabId>('products');
  const [searchTerm, setSearchTerm] = useState('');
  const [tagCatalog, setTagCatalog] = useState<string[]>([]);
  const [lostReasons, setLostReasons] = useState<string[]>([]);
  const [campaignCatalog, setCampaignCatalog] = useState<string[]>([]);
  const [referrerCatalog, setReferrerCatalog] = useState<string[]>([]);
  const [catalogRevision, setCatalogRevision] = useState(0);
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [draftLabel, setDraftLabel] = useState('');
  const [editingRow, setEditingRow] = useState<ConfigRow | null>(null);

  useEffect(() => {
    const syncCatalogs = () => {
      setTagCatalog(getTags());
      setLostReasons(getLostReasons());
      setCampaignCatalog(getCampaignNameOptions().map((option) => option.label));
      setReferrerCatalog(
        Array.from(
          new Set(
            getCollaborators()
              .map((item) => String(item?.name || '').trim())
              .filter(Boolean),
          ),
        ).sort((left, right) => left.localeCompare(right, 'vi')),
      );
      setCatalogRevision((current) => current + 1);
    };

    syncCatalogs();
    window.addEventListener('storage', syncCatalogs);
    window.addEventListener(SYSTEM_CONFIG_EVENT, syncCatalogs as EventListener);
    window.addEventListener('educrm:tags-changed', syncCatalogs as EventListener);
    window.addEventListener('educrm:lost-reasons-changed', syncCatalogs as EventListener);
    window.addEventListener('educrm:campaigns-changed', syncCatalogs as EventListener);
    window.addEventListener('educrm:collaborators-changed', syncCatalogs as EventListener);

    return () => {
      window.removeEventListener('storage', syncCatalogs);
      window.removeEventListener(SYSTEM_CONFIG_EVENT, syncCatalogs as EventListener);
      window.removeEventListener('educrm:tags-changed', syncCatalogs as EventListener);
      window.removeEventListener('educrm:lost-reasons-changed', syncCatalogs as EventListener);
      window.removeEventListener('educrm:campaigns-changed', syncCatalogs as EventListener);
      window.removeEventListener('educrm:collaborators-changed', syncCatalogs as EventListener);
    };
  }, []);

  const rowsByTab = useMemo<Record<ConfigTabId, ConfigRow[]>>(
    () => ({
      target_countries: LEAD_TARGET_COUNTRY_OPTIONS.map((option) => ({
        id: `target-country-${option.value}`,
        value: option.value,
        label: option.label,
        sourceLabel: isDefaultSystemCatalogValue('targetCountries', option.value) ? 'Danh mục mặc định' : 'Tự thêm tại Admin',
        tone: isDefaultSystemCatalogValue('targetCountries', option.value) ? 'system' : 'custom',
        canEdit: true,
        canDelete: true,
      })),
      products: LEAD_PRODUCT_OPTIONS.map((option) => ({
        id: `product-${option.value}`,
        value: option.value,
        label: option.label,
        sourceLabel: isDefaultSystemCatalogValue('products', option.value) ? 'Danh mục mặc định' : 'Tự thêm tại Admin',
        tone: isDefaultSystemCatalogValue('products', option.value) ? 'system' : 'custom',
        canEdit: true,
        canDelete: true,
      })),
      campuses: LEAD_CAMPUS_OPTIONS.map((option) => ({
        id: `campus-${option.value}`,
        value: option.value,
        label: option.label,
        sourceLabel: isDefaultSystemCatalogValue('campuses', option.value) ? 'Danh mục mặc định' : 'Tự thêm tại Admin',
        tone: isDefaultSystemCatalogValue('campuses', option.value) ? 'system' : 'custom',
        canEdit: true,
        canDelete: true,
      })),
      lead_statuses: LEAD_STATUS_OPTIONS.map((option) => ({
        id: `status-${option.value}`,
        value: option.value,
        label: option.label,
        sourceLabel: 'Logic hệ thống',
        tone: 'system',
        canEdit: false,
        canDelete: false,
      })),
      tags: tagCatalog.map((label) => {
        const isFixed = FIXED_LEAD_TAGS.includes(label as (typeof FIXED_LEAD_TAGS)[number]);
        return {
          id: `tag-${label}`,
          value: label,
          label,
          sourceLabel: isFixed ? 'Tag cố định' : 'Tag tùy chỉnh',
          tone: isFixed ? 'system' : 'custom',
          canEdit: !isFixed,
          canDelete: !isFixed,
        };
      }),
      education_levels: STUDENT_EDUCATION_LEVEL_OPTIONS.map((option) => ({
        id: `education-level-${option.value}`,
        value: option.value,
        label: option.label,
        sourceLabel: isDefaultSystemCatalogValue('educationLevels', option.value) ? 'Danh mục mặc định' : 'Tự thêm tại Admin',
        tone: isDefaultSystemCatalogValue('educationLevels', option.value) ? 'system' : 'custom',
        canEdit: true,
        canDelete: true,
      })),
      campaigns: campaignCatalog.map((label) => ({
        id: `campaign-${label}`,
        value: label,
        label,
        sourceLabel: 'Tạo ở trang Chiến dịch',
        tone: 'dynamic',
        canEdit: false,
        canDelete: false,
      })),
      lead_sources: LEAD_SOURCE_OPTIONS.map((option) => ({
        id: `lead-source-${option.value}`,
        value: option.value,
        label: option.label,
        sourceLabel: isDefaultSystemCatalogValue('leadSources', option.value) ? 'Danh mục mặc định' : 'Tự thêm tại Admin',
        tone: isDefaultSystemCatalogValue('leadSources', option.value) ? 'system' : 'custom',
        canEdit: true,
        canDelete: true,
      })),
      lead_channels: LEAD_CHANNEL_OPTIONS.map((option) => ({
        id: `lead-channel-${option.value}`,
        value: option.value,
        label: option.label,
        sourceLabel: isDefaultSystemCatalogValue('leadChannels', option.value) ? 'Danh mục mặc định' : 'Tự thêm tại Admin',
        tone: isDefaultSystemCatalogValue('leadChannels', option.value) ? 'system' : 'custom',
        canEdit: true,
        canDelete: true,
      })),
      referrers: referrerCatalog.map((label) => ({
        id: `referrer-${label}`,
        value: label,
        label,
        sourceLabel: 'Lấy từ Cộng tác viên',
        tone: 'dynamic',
        canEdit: false,
        canDelete: false,
      })),
      lost_reasons: lostReasons.map((label) => ({
        id: `lost-reason-${label}`,
        value: label,
        label,
        sourceLabel: 'Lý do tùy chỉnh',
        tone: 'custom',
        canEdit: true,
        canDelete: true,
      })),
    }),
    [campaignCatalog, catalogRevision, lostReasons, referrerCatalog, tagCatalog],
  );

  const activeMenu = CONFIG_MENU.find((item) => item.id === activeTab) || CONFIG_MENU[0];
  const filteredRows = rowsByTab[activeTab].filter((row) =>
    row.label.toLowerCase().includes(searchTerm.trim().toLowerCase()),
  );
  const modalTitle = editingRow ? `Sửa ${activeMenu.label.toLowerCase()}` : `Thêm ${activeMenu.label.toLowerCase()}`;
  const modalHint = TAB_HINTS[activeTab] || 'Thay đổi này sẽ áp dụng cho các lựa chọn mới trong hệ thống.';
  const readOnlyHint = READ_ONLY_HINTS[activeTab] || '';

  const closeEditorModal = () => {
    setShowEditorModal(false);
    setEditingRow(null);
    setDraftLabel('');
  };

  const getToneBadgeClassName = (tone: ConfigTone) => {
    switch (tone) {
      case 'custom':
        return 'border-emerald-200 bg-emerald-50 text-emerald-700';
      case 'dynamic':
        return 'border-amber-200 bg-amber-50 text-amber-700';
      default:
        return 'border-blue-200 bg-blue-50 text-blue-700';
    }
  };

  const getToneLabel = (tone: ConfigTone) => {
    switch (tone) {
      case 'custom':
        return 'Tùy chỉnh';
      case 'dynamic':
        return 'Đồng bộ';
      default:
        return 'Hệ thống';
    }
  };

  const replaceTagInLeads = (currentLabel: string, nextLabel: string) => {
    const leads = getLeads();
    let hasChanged = false;

    const nextLeads = leads.map((lead) => {
      const currentTags = Array.isArray(lead.marketingData?.tags)
        ? lead.marketingData.tags
        : typeof lead.marketingData?.tags === 'string'
          ? lead.marketingData.tags.split(',').map((item) => item.trim()).filter(Boolean)
          : [];

      if (!currentTags.some((tag) => tag === currentLabel)) return lead;

      hasChanged = true;
      return {
        ...lead,
        marketingData: {
          ...lead.marketingData,
          tags: Array.from(new Set(currentTags.map((tag) => (tag === currentLabel ? nextLabel : tag)))),
        },
      };
    });

    if (hasChanged) {
      saveLeads(nextLeads);
    }
  };

  const removeTagFromLeads = (targetLabel: string) => {
    const leads = getLeads();
    let hasChanged = false;

    const nextLeads = leads.map((lead) => {
      const currentTags = Array.isArray(lead.marketingData?.tags)
        ? lead.marketingData.tags
        : typeof lead.marketingData?.tags === 'string'
          ? lead.marketingData.tags.split(',').map((item) => item.trim()).filter(Boolean)
          : [];

      if (!currentTags.some((tag) => tag === targetLabel)) return lead;

      hasChanged = true;
      return {
        ...lead,
        marketingData: {
          ...lead.marketingData,
          tags: currentTags.filter((tag) => tag !== targetLabel),
        },
      };
    });

    if (hasChanged) {
      saveLeads(nextLeads);
    }
  };

  const replaceLostReasonInLeads = (currentLabel: string, nextLabel: string) => {
    const leads = getLeads();
    let hasChanged = false;

    const nextLeads = leads.map((lead) => {
      if (lead.lostReason !== currentLabel) return lead;
      hasChanged = true;
      return { ...lead, lostReason: nextLabel };
    });

    if (hasChanged) {
      saveLeads(nextLeads);
    }
  };

  const hasDuplicateLabel = (value: string) => {
    const nextToken = normalizeToken(value);
    return rowsByTab[activeTab].some((row) => {
      if (editingRow && row.value === editingRow.value) return false;
      return normalizeToken(row.label) === nextToken;
    });
  };

  const persistSystemCatalog = (tab: ConfigTabId, updater: (current: SystemCatalogOption[]) => SystemCatalogOption[]) => {
    const catalogId = getSystemCatalogId(tab);
    if (!catalogId) return;
    saveSystemCatalog(catalogId, updater(getSystemCatalogOptions(tab)));
  };

  const handleSaveItem = () => {
    const value = draftLabel.trim();
    if (!value) return;
    if (hasDuplicateLabel(value)) {
      window.alert('Mục này đã tồn tại.');
      return;
    }

    const catalogId = getSystemCatalogId(activeTab);
    if (catalogId) {
      persistSystemCatalog(activeTab, (current) => {
        if (editingRow) {
          return current.map((item) =>
            item.value === editingRow.value ? { ...item, label: value } : item,
          );
        }

        return [...current, createSystemCatalogOption(value)];
      });
      closeEditorModal();
      return;
    }

    if (activeTab === 'tags') {
      if (editingRow) {
        replaceTagInLeads(editingRow.label, value);
        setTagCatalog(saveTags(tagCatalog.map((item) => (item === editingRow.label ? value : item))));
      } else {
        setTagCatalog(saveTags([...tagCatalog, value]));
      }
      closeEditorModal();
      return;
    }

    if (activeTab === 'lost_reasons') {
      if (editingRow) {
        replaceLostReasonInLeads(editingRow.label, value);
        const nextReasons = lostReasons.map((item) => (item === editingRow.label ? value : item));
        setLostReasons(nextReasons);
        saveLostReasons(nextReasons);
      } else {
        const nextReasons = [...lostReasons, value].sort((left, right) => left.localeCompare(right, 'vi'));
        setLostReasons(nextReasons);
        saveLostReasons(nextReasons);
      }
      closeEditorModal();
    }
  };

  const handleDeleteRow = (row: ConfigRow) => {
    if (!row.canDelete) return;

    if (!window.confirm(`Bạn có chắc muốn xóa "${row.label}"?`)) {
      return;
    }

    const catalogId = getSystemCatalogId(activeTab);
    if (catalogId) {
      persistSystemCatalog(activeTab, (current) => current.filter((item) => item.value !== row.value));
      return;
    }

    if (activeTab === 'tags') {
      removeTagFromLeads(row.label);
      setTagCatalog(saveTags(tagCatalog.filter((item) => item !== row.label)));
      return;
    }

    if (activeTab === 'lost_reasons') {
      const nextReasons = lostReasons.filter((item) => item !== row.label);
      setLostReasons(nextReasons);
      saveLostReasons(nextReasons);
    }
  };

  return (
    <div className="flex h-full bg-slate-50 text-slate-900">
      <aside className="w-80 shrink-0 border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-xl font-bold">Cấu hình dữ liệu</h2>
          <p className="mt-1 text-sm text-slate-500">
            Quản lý các danh mục dùng trong lead, chiến dịch và dữ liệu marketing.
          </p>
        </div>

        <div className="flex flex-col gap-1 p-4">
          {CONFIG_MENU.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === activeTab;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  setSearchTerm('');
                }}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm transition ${
                  isActive
                    ? 'bg-slate-100 font-semibold text-slate-900'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
                <span className="flex-1">{item.label}</span>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-500 shadow-sm">
                  {rowsByTab[item.id].length}
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-slate-200 bg-white px-8 py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">{activeMenu.label}</h1>
              <p className="mt-1 text-sm text-slate-500">{filteredRows.length} mục đang hiển thị</p>
              {readOnlyHint ? (
                <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  {readOnlyHint}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="relative block">
                <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Tìm kiếm mục cấu hình..."
                  className="h-11 w-72 rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </label>

              {activeMenu.editable ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditingRow(null);
                    setDraftLabel('');
                    setShowEditorModal(true);
                  }}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                  <Plus size={16} />
                  Thêm mới
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-8">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-6 py-4 text-sm font-semibold text-slate-700">Tên mục</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-700">Nguồn dữ liệu</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-700">Trạng thái</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length > 0 ? (
                  filteredRows.map((row) => {
                    const hasActions = row.canEdit || row.canDelete;

                    return (
                      <tr key={row.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70">
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">{row.label}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">{row.sourceLabel}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${getToneBadgeClassName(row.tone)}`}>
                            <CheckCircle2 size={12} />
                            {getToneLabel(row.tone)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {hasActions ? (
                            <div className="inline-flex items-center gap-1">
                              {row.canEdit ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingRow(row);
                                    setDraftLabel(row.label);
                                    setShowEditorModal(true);
                                  }}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                                  title="Sửa mục"
                                >
                                  <Pencil size={16} />
                                </button>
                              ) : null}
                              {row.canDelete ? (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRow(row)}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                                  title="Xóa mục"
                                >
                                  <Trash2 size={16} />
                                </button>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-14 text-center text-sm text-slate-500">
                      {activeMenu.emptyHint}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {showEditorModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-bold">{modalTitle}</h3>
              <button
                type="button"
                onClick={closeEditorModal}
                className="text-slate-400 transition hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                  Nội dung
                </label>
                <input
                  value={draftLabel}
                  onChange={(event) => setDraftLabel(event.target.value)}
                  placeholder={`Nhập ${activeMenu.label.toLowerCase()}...`}
                  className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  autoFocus
                />
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                {modalHint}
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={closeEditorModal}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-200"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveItem}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Lưu cấu hình
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AdminSystemConfig;
