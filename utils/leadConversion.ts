import { DealStage, IContact, IDeal, ILead } from '../types';
import {
  addContact,
  addDeal,
  convertLeadToContact,
  getContactById,
  getContacts,
  getDealById,
  getDeals,
  getLeadActivitiesForConversion,
  saveContact,
  updateDeal,
} from './storage';

const normalizePhone = (value?: string) => String(value || '').replace(/\D/g, '');
const createUniqueId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const hasMeaningfulValue = (value: unknown): boolean => {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

const mergeUniqueStrings = (base: string[] = [], incoming: string[] = []) =>
  Array.from(new Set([...base, ...incoming].map((item) => String(item || '').trim()).filter(Boolean)));

const mergeUniqueRecordsById = <T extends { id?: string }>(base: T[] = [], incoming: T[] = []) => {
  const merged: T[] = [];
  const seen = new Set<string>();

  [...base, ...incoming].forEach((item) => {
    if (!item) return;
    const key = String(item.id || JSON.stringify(item));
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(item);
  });

  return merged;
};

const mergeUniqueProductItems = (
  base: NonNullable<IDeal['productItems']> = [],
  incoming: NonNullable<IDeal['productItems']> = []
) => {
  const merged: NonNullable<IDeal['productItems']> = [];
  const seen = new Set<string>();

  [...base, ...incoming].forEach((item) => {
    if (!item) return;
    const key = String(item.id || `${item.name}::${item.price}::${item.quantity}`);
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(item);
  });

  return merged;
};

const mergeTextNotes = (base?: string, incoming?: string) => {
  const lines = [base, incoming]
    .flatMap((block) => String(block || '').split('\n'))
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return undefined;
  return Array.from(new Set(lines)).join('\n');
};

const parseTags = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const mergeMarketingData = (existing?: IContact['marketingData'], incoming?: IContact['marketingData']) => {
  const merged = { ...(existing || {}) } as NonNullable<IContact['marketingData']>;

  Object.entries(incoming || {}).forEach(([key, value]) => {
    if (key === 'tags') return;
    if (hasMeaningfulValue(value)) {
      (merged as Record<string, unknown>)[key] = value;
    }
  });

  const mergedTags = mergeUniqueStrings(parseTags(existing?.tags), parseTags(incoming?.tags));
  if (mergedTags.length > 0) {
    merged.tags = mergedTags;
  }

  return Object.keys(merged).length > 0 ? merged : undefined;
};

const mergeContactRecords = (existing: IContact, incoming: IContact, nowIso: string): IContact => {
  const merged: IContact = { ...existing };

  Object.entries(incoming).forEach(([key, value]) => {
    if (['id', 'leadId', 'createdAt', 'updatedAt', 'dealIds', 'activities', 'marketingData', 'notes'].includes(key)) {
      return;
    }

    if (hasMeaningfulValue(value)) {
      (merged as Record<string, unknown>)[key] = value;
    }
  });

  const mergedNotes = mergeTextNotes(existing.notes, incoming.notes);

  return {
    ...merged,
    id: existing.id,
    leadId: existing.leadId || incoming.leadId,
    createdAt: existing.createdAt || incoming.createdAt || nowIso,
    updatedAt: nowIso,
    dealIds: mergeUniqueStrings(existing.dealIds, incoming.dealIds),
    activities: mergeUniqueRecordsById(
      (existing.activities || []) as Array<{ id?: string }>,
      (incoming.activities || []) as Array<{ id?: string }>
    ) as any[],
    notes: mergedNotes,
    marketingData: mergeMarketingData(existing.marketingData, incoming.marketingData),
  };
};

const buildDealActivities = (lead: ILead, nowIso: string, dealId: string, conversionDescription: string) => {
  const leadActivities = getLeadActivitiesForConversion(lead).map((activity) => ({
    ...activity,
    type: activity.type === 'message' ? 'chat' : activity.type === 'system' ? 'note' : activity.type as any,
  })) as any[];

  return [
    ...leadActivities,
    {
      id: `deal-convert-${dealId}-${lead.id}`,
      type: 'note' as const,
      timestamp: nowIso,
      title: 'Chuyển đổi từ lead',
      description: conversionDescription,
    },
  ];
};

const buildDealFromLead = (
  lead: ILead,
  linkedEntityId: string,
  nowIso: string,
  conversionDescription: string,
  customerLinkMode: IDeal['customerLinkMode'] = 'linked_contact'
): IDeal => {
  const dealStage = Object.values(DealStage).includes(lead.status as DealStage)
    ? (lead.status as DealStage)
    : DealStage.NEW_OPP;

  const productItems = Array.isArray(lead.productItems) ? lead.productItems : [];
  const computedValue = lead.value || productItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const defaultCloseDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const dealId = createUniqueId('D');
  const products = productItems.length > 0 ? productItems.map((item) => item.name) : (lead.program ? [lead.program] : []);

  return {
    id: dealId,
    leadId: linkedEntityId,
    customerLinkMode,
    title: `${lead.name} - ${lead.program || 'Cơ hội mới'}`,
    value: computedValue || 0,
    stage: dealStage,
    ownerId: lead.ownerId || 'admin',
    expectedCloseDate: lead.expectedClosingDate || defaultCloseDate,
    products,
    productItems,
    discount: lead.discount || 0,
    paymentRoadmap: lead.paymentRoadmap || '',
    probability: lead.probability || 20,
    createdAt: nowIso,
    leadCreatedAt: lead.createdAt,
    assignedAt: lead.pickUpDate,
    activities: buildDealActivities(lead, nowIso, dealId, conversionDescription),
  };
};

const buildContactConversionActivity = (
  lead: ILead,
  deal: IDeal,
  nowIso: string,
  mergedIntoExistingContact: boolean,
  salesChannel?: string,
  dealAction: LeadConversionAction = 'create_opportunity'
) => ({
  id: `contact-convert-${deal.id}-${lead.id}`,
  type: 'system' as const,
  timestamp: nowIso,
  title:
    dealAction === 'merge_existing_opportunity'
      ? 'Gộp lead vào cơ hội cũ'
      : mergedIntoExistingContact
        ? 'Gộp lead vào Contact cũ'
        : 'Tạo Contact từ lead',
  description: [
    dealAction === 'merge_existing_opportunity'
      ? `Lead ${lead.name} được nhập vào cơ hội ${deal.title} (${deal.id}).`
      : mergedIntoExistingContact
        ? `Lead ${lead.name} được gộp vào Contact hiện có và tạo Deal ${deal.title}.`
        : `Lead ${lead.name} được chuyển thành Contact mới và tạo Deal ${deal.title}.`,
    salesChannel ? `Nhóm kinh doanh: ${salesChannel}.` : '',
  ]
    .filter(Boolean)
    .join(' '),
  user: 'System',
});

export type LeadConversionContactMode = 'merge_contact' | 'create_contact' | 'no_contact';
export type LeadConversionAction = 'create_opportunity' | 'merge_existing_opportunity';
export type LeadConversionCustomerAction = 'auto' | 'link_existing_customer' | 'create_new_customer' | 'no_customer_link';

export interface LeadConversionPreview {
  existingContact?: IContact;
  normalizedPhone: string;
  willMergeContact: boolean;
}

export interface LeadBatchConversionPreviewGroup {
  key: string;
  normalizedPhone: string;
  label: string;
  leads: ILead[];
  existingContact?: IContact;
  createCount: number;
  mergeCount: number;
}

export interface LeadBatchConversionPreview {
  totalLeads: number;
  totalGroups: number;
  createCount: number;
  mergeCount: number;
  existingContactMatchCount: number;
  duplicatePhoneGroupCount: number;
  groups: LeadBatchConversionPreviewGroup[];
}

export interface ConvertLeadToOpportunityOptions {
  ownerId?: string;
  salesChannel?: string;
  conversionAction?: LeadConversionAction;
  customerAction?: LeadConversionCustomerAction;
  targetDealId?: string;
}

export interface ConvertLeadToOpportunityResult {
  contact?: IContact;
  deal: IDeal;
  existingContact?: IContact;
  mode: LeadConversionContactMode;
  action: LeadConversionAction;
}

export interface LeadExistingOpportunityOption {
  id: string;
  title: string;
  stage: DealStage;
  ownerId: string;
  createdAt?: string;
  contactId: string;
  contactName: string;
}

export const getLeadConversionPreview = (phone?: string): LeadConversionPreview => {
  const normalizedPhone = normalizePhone(phone);
  const existingContact = normalizedPhone.length > 6
    ? getContacts().find((contact) => normalizePhone(contact.phone) === normalizedPhone)
    : undefined;

  return {
    existingContact,
    normalizedPhone,
    willMergeContact: Boolean(existingContact),
  };
};

export const getLeadBatchConversionPreview = (leads: ILead[]): LeadBatchConversionPreview => {
  const contacts = getContacts();
  const groupsByKey = new Map<string, LeadBatchConversionPreviewGroup>();

  leads.forEach((lead) => {
    const normalizedPhone = normalizePhone(lead.phone);
    const canMergeByPhone = normalizedPhone.length > 6;
    const existingContact = canMergeByPhone
      ? contacts.find((contact) => normalizePhone(contact.phone) === normalizedPhone)
      : undefined;
    const key = canMergeByPhone ? normalizedPhone : `lead:${lead.id}`;
    const label = canMergeByPhone ? normalizedPhone : `Lead riêng: ${lead.name}`;

    if (!groupsByKey.has(key)) {
      groupsByKey.set(key, {
        key,
        normalizedPhone,
        label,
        leads: [],
        existingContact,
        createCount: 0,
        mergeCount: 0,
      });
    }

    groupsByKey.get(key)!.leads.push(lead);
  });

  const groups = Array.from(groupsByKey.values()).map((group) => {
    if (group.existingContact) {
      return {
        ...group,
        createCount: 0,
        mergeCount: group.leads.length,
      };
    }

    if (group.normalizedPhone.length > 6) {
      return {
        ...group,
        createCount: 1,
        mergeCount: Math.max(0, group.leads.length - 1),
      };
    }

    return {
      ...group,
      createCount: group.leads.length,
      mergeCount: 0,
    };
  });

  return {
    totalLeads: leads.length,
    totalGroups: groups.length,
    createCount: groups.reduce((sum, group) => sum + group.createCount, 0),
    mergeCount: groups.reduce((sum, group) => sum + group.mergeCount, 0),
    existingContactMatchCount: groups.filter((group) => Boolean(group.existingContact)).length,
    duplicatePhoneGroupCount: groups.filter((group) => group.normalizedPhone.length > 6 && group.leads.length > 1).length,
    groups,
  };
};

const getDealsForContact = (contact: IContact): IDeal[] => {
  const contactDealIds = new Set(contact.dealIds || []);

  return getDeals()
    .filter((deal) => {
      if (deal.leadId === contact.id) return true;
      return contactDealIds.has(deal.id);
    })
    .filter((deal) => ![DealStage.WON, DealStage.LOST, DealStage.AFTER_SALE].includes(deal.stage))
    .sort((left, right) => {
      const leftTime = new Date(left.createdAt || 0).getTime();
      const rightTime = new Date(right.createdAt || 0).getTime();
      return rightTime - leftTime;
    });
};

export const getLeadExistingOpportunityOptions = (leads: ILead[]): LeadExistingOpportunityOption[] => {
  if (!Array.isArray(leads) || leads.length === 0) return [];

  const existingContact = leads.length === 1
    ? getLeadConversionPreview(leads[0].phone).existingContact
    : (() => {
        const batchPreview = getLeadBatchConversionPreview(leads);
        if (batchPreview.groups.length !== 1) return undefined;
        return batchPreview.groups[0].existingContact;
      })();

  if (!existingContact) return [];

  return getDealsForContact(existingContact).map((deal) => ({
    id: deal.id,
    title: deal.title,
    stage: deal.stage,
    ownerId: deal.ownerId,
    createdAt: deal.createdAt,
    contactId: existingContact.id,
    contactName: existingContact.name,
  }));
};

const mergeLeadIntoExistingDeal = (
  deal: IDeal,
  lead: ILead,
  nowIso: string,
  conversionDescription: string,
  ownerId: string
): IDeal => {
  const productItems = Array.isArray(lead.productItems) ? lead.productItems : [];
  const computedValue = lead.value || productItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const incomingProducts = productItems.length > 0 ? productItems.map((item) => item.name) : (lead.program ? [lead.program] : []);
  const defaultCloseDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  return {
    ...deal,
    ownerId: ownerId || deal.ownerId,
    value: deal.value > 0 ? deal.value : (computedValue || 0),
    expectedCloseDate: deal.expectedCloseDate || lead.expectedClosingDate || defaultCloseDate,
    products: mergeUniqueStrings(deal.products || [], incomingProducts),
    productItems: mergeUniqueProductItems(deal.productItems || [], productItems),
    discount: typeof deal.discount === 'number' && deal.discount > 0 ? deal.discount : (lead.discount || deal.discount || 0),
    paymentRoadmap: deal.paymentRoadmap || lead.paymentRoadmap || '',
    probability: Math.max(deal.probability || 0, lead.probability || 20),
    leadCreatedAt: deal.leadCreatedAt || lead.createdAt,
    assignedAt: deal.assignedAt || lead.pickUpDate,
    activities: mergeUniqueRecordsById(
      (deal.activities || []) as Array<{ id?: string }>,
      buildDealActivities(lead, nowIso, deal.id, conversionDescription) as Array<{ id?: string }>
    ) as any[],
  };
};

export const convertLeadToOpportunity = (
  lead: ILead,
  options: ConvertLeadToOpportunityOptions = {}
): ConvertLeadToOpportunityResult => {
  const nowIso = new Date().toISOString();
  const ownerId = options.ownerId || lead.ownerId || 'admin';
  const conversionAction = options.conversionAction || 'create_opportunity';
  const customerAction = options.customerAction || 'auto';
  const preview = getLeadConversionPreview(lead.phone);
  const targetDeal = options.targetDealId ? getDealById(options.targetDealId) : undefined;
  const targetContact = targetDeal ? getContactById(targetDeal.leadId) : undefined;
  const contactDraft = convertLeadToContact({ ...lead, ownerId } as ILead);
  const shouldSkipContactLink =
    conversionAction !== 'merge_existing_opportunity' &&
    customerAction === 'no_customer_link';

  if (conversionAction === 'merge_existing_opportunity' && (!targetDeal || !targetContact)) {
    throw new Error('Không tìm thấy cơ hội hoặc Contact đích để gộp.');
  }

  const forcedExistingContact = conversionAction === 'merge_existing_opportunity'
    ? targetContact || preview.existingContact
    : shouldSkipContactLink
      ? undefined
    : customerAction === 'create_new_customer'
      ? targetContact
      : targetContact || preview.existingContact;
  const shouldUseExistingContact =
    !shouldSkipContactLink &&
    Boolean(forcedExistingContact) &&
    (
      conversionAction === 'merge_existing_opportunity' ||
      customerAction === 'link_existing_customer' ||
      customerAction === 'auto'
    );

  const persistedContact = shouldSkipContactLink
    ? undefined
    : shouldUseExistingContact && forcedExistingContact
    ? saveContact(mergeContactRecords(forcedExistingContact, contactDraft, nowIso))
    : customerAction === 'create_new_customer'
      ? saveContact({
          ...contactDraft,
          id: createUniqueId('C'),
          createdAt: nowIso,
          updatedAt: nowIso,
        })
      : addContact(contactDraft);

  const mergedIntoExistingContact = !shouldSkipContactLink && shouldUseExistingContact && Boolean(forcedExistingContact);

  const conversionDescription = conversionAction === 'merge_existing_opportunity' && targetDeal
    ? `Gộp lead ${lead.name} vào cơ hội ${targetDeal.title} (${targetDeal.id}) của Contact ${persistedContact?.name} (${persistedContact?.id}).`
    : shouldSkipContactLink
      ? `Tạo cơ hội ${lead.name} trong Pipeline mà không tạo hoặc liên kết Contact.`
    : mergedIntoExistingContact
      ? `Gộp vào Contact ${persistedContact?.name} (${persistedContact?.id}) theo SĐT ${persistedContact?.phone}.`
      : preview.existingContact && customerAction === 'create_new_customer'
        ? `Tạo Contact mới ${persistedContact?.id} từ lead ${lead.name}, bỏ qua Contact trùng SĐT ${preview.existingContact.id}.`
        : `Tạo Contact mới ${persistedContact?.id} từ lead ${lead.name}.`;

  const finalDescription = [conversionDescription, options.salesChannel ? `Nhóm kinh doanh: ${options.salesChannel}.` : '']
    .filter(Boolean)
    .join(' ');

  const deal = conversionAction === 'merge_existing_opportunity' && targetDeal
    ? mergeLeadIntoExistingDeal(targetDeal, { ...lead, ownerId } as ILead, nowIso, finalDescription, ownerId)
    : buildDealFromLead(
        { ...lead, ownerId } as ILead,
        shouldSkipContactLink ? lead.id : String(persistedContact?.id || lead.id),
        nowIso,
        finalDescription,
        shouldSkipContactLink ? 'no_contact' : 'linked_contact'
      );

  if (conversionAction === 'merge_existing_opportunity') {
    if (!updateDeal(deal)) {
      throw new Error(`Không thể cập nhật cơ hội ${targetDeal?.id}.`);
    }
  } else {
    addDeal(deal);
  }

  if (shouldSkipContactLink) {
    return {
      contact: undefined,
      deal,
      existingContact: preview.existingContact,
      mode: 'no_contact',
      action: conversionAction,
    };
  }

  const finalContact = saveContact({
    ...persistedContact,
    ownerId,
    dealIds: mergeUniqueStrings(persistedContact?.dealIds, [deal.id]),
    activities: mergeUniqueRecordsById(
      (persistedContact?.activities || []) as Array<{ id?: string }>,
      [buildContactConversionActivity(lead, deal, nowIso, mergedIntoExistingContact, options.salesChannel, conversionAction)]
    ) as any[],
    updatedAt: nowIso,
  });

  return {
    contact: finalContact,
    deal,
    existingContact: forcedExistingContact || preview.existingContact,
    mode: mergedIntoExistingContact ? 'merge_contact' : 'create_contact',
    action: conversionAction,
  };
};
