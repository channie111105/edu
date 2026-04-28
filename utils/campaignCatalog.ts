export type CampaignType = 'manual' | 'auto';
export type CampaignStatus = 'Running' | 'Paused' | 'Planned' | 'Completed';

export type CampaignCatalogItem = {
  id: string;
  name: string;
  channel: string;
  status: CampaignStatus;
  startDate: string;
  endDate: string;
  budget: number;
  spent: number;
  revenue: number;
  leads: number;
  campaignType: CampaignType;
  apiConnected: boolean;
  color: string;
  reportFileNames?: string[];
};

const CAMPAIGN_STORAGE_KEY = 'educrm_campaign_catalog';

export const DEFAULT_CAMPAIGN_CATALOG: CampaignCatalogItem[] = [];

const LEGACY_MOCK_CAMPAIGN_KEYS = new Set([
  'camp_01|Trại Hè 2024|Facebook|Running|01/05/2026|30/08/2026',
  'camp_02|Khóa học IELTS Online|Google Ads|Paused|15/04/2026|15/06/2026',
  'camp_03|Hội thảo Du học Đức|Event/Offline|Planned|10/06/2026|10/06/2026',
  'camp_04|TikTok Brand Awareness|TikTok|Running|01/01/2026|31/12/2026',
  'camp_05|Email Marketing - Khách cũ|Email|Running|05/02/2026|Indefinite',
]);

const getCampaignMigrationKey = (item: Partial<CampaignCatalogItem>) =>
  [
    String(item.id || '').trim(),
    String(item.name || '').trim(),
    String(item.channel || '').trim(),
    String(item.status || '').trim(),
    String(item.startDate || '').trim(),
    String(item.endDate || '').trim(),
  ].join('|');

const emitCampaignCatalogChanged = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('educrm:campaigns-changed'));
  }
};

const normalizeCampaignCatalogItem = (item: Partial<CampaignCatalogItem>, fallbackIndex: number): CampaignCatalogItem => ({
  id: String(item.id || `campaign_${fallbackIndex + 1}`),
  name: String(item.name || '').trim(),
  channel: String(item.channel || '').trim(),
  status: item.status === 'Paused' || item.status === 'Planned' || item.status === 'Completed' ? item.status : 'Running',
  startDate: String(item.startDate || ''),
  endDate: String(item.endDate || ''),
  budget: Number(item.budget) || 0,
  spent: Number(item.spent) || 0,
  revenue: Number(item.revenue) || 0,
  leads: Number(item.leads) || 0,
  campaignType: item.campaignType === 'auto' ? 'auto' : 'manual',
  apiConnected: Boolean(item.apiConnected),
  color: String(item.color || 'bg-slate-100 text-slate-700'),
  reportFileNames: Array.isArray(item.reportFileNames) ? item.reportFileNames.map((name) => String(name)) : [],
});

const normalizeCampaignCatalog = (items: unknown): CampaignCatalogItem[] => {
  if (!Array.isArray(items)) return DEFAULT_CAMPAIGN_CATALOG;

  return items
    .map((item, index) => normalizeCampaignCatalogItem((item || {}) as Partial<CampaignCatalogItem>, index))
    .filter((item) => item.name)
    .filter((item) => !LEGACY_MOCK_CAMPAIGN_KEYS.has(getCampaignMigrationKey(item)));
};

export const getCampaignCatalog = (): CampaignCatalogItem[] => {
  if (typeof window === 'undefined') return DEFAULT_CAMPAIGN_CATALOG;

  try {
    const stored = window.localStorage.getItem(CAMPAIGN_STORAGE_KEY);
    return stored ? normalizeCampaignCatalog(JSON.parse(stored)) : DEFAULT_CAMPAIGN_CATALOG;
  } catch {
    return DEFAULT_CAMPAIGN_CATALOG;
  }
};

export const saveCampaignCatalog = (items: CampaignCatalogItem[]) => {
  if (typeof window === 'undefined') return items;

  const normalized = normalizeCampaignCatalog(items);
  window.localStorage.setItem(CAMPAIGN_STORAGE_KEY, JSON.stringify(normalized));
  emitCampaignCatalogChanged();
  return normalized;
};

export const getCampaignNameOptions = () =>
  Array.from(
    new Set(
      getCampaignCatalog()
        .map((item) => item.name.trim())
        .filter(Boolean)
    )
  )
    .sort((left, right) => left.localeCompare(right, 'vi'))
    .map((name) => ({ value: name, label: name }));
