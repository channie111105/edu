
import { ILead, IDeal, IContact, IContract, LeadStatus, DealStage } from '../types';

const KEYS = {
  LEADS: 'educrm_leads',
  DEALS: 'educrm_deals',
  CONTACTS: 'educrm_contacts', // Bảng riêng cho Contacts
  CONTRACTS: 'educrm_contracts',
  INIT: 'educrm_initialized'
};

// --- INITIAL MOCK DATA (SEED DATA) ---
const INITIAL_LEADS: ILead[] = [];

const INITIAL_DEALS: IDeal[] = [];
const INITIAL_CONTRACTS: IContract[] = [];

// --- STORAGE FUNCTIONS ---

export const initializeData = () => {
  if (!localStorage.getItem(KEYS.INIT)) {
    console.log('Initializing Data if needed...');
    localStorage.setItem(KEYS.LEADS, JSON.stringify(INITIAL_LEADS));
    localStorage.setItem(KEYS.DEALS, JSON.stringify(INITIAL_DEALS));
    localStorage.setItem(KEYS.CONTACTS, JSON.stringify([]));
    localStorage.setItem(KEYS.CONTRACTS, JSON.stringify(INITIAL_CONTRACTS));
    localStorage.setItem(KEYS.INIT, 'true');
  }
};

// LEADS
export const getLeads = (): ILead[] => {
  try {
    const data = localStorage.getItem(KEYS.LEADS);
    return data ? JSON.parse(data) : [];
  } catch (e) { return []; }
};

export const saveLead = (lead: ILead) => {
  const leads = getLeads();
  const existingIndex = leads.findIndex(l => l.id === lead.id);

  if (existingIndex >= 0) {
    leads[existingIndex] = lead;
  } else {
    leads.unshift(lead);
  }

  localStorage.setItem(KEYS.LEADS, JSON.stringify(leads));
  return leads;
};

export const saveLeads = (leads: ILead[]) => {
  localStorage.setItem(KEYS.LEADS, JSON.stringify(leads));
  return leads;
};

export const getLeadById = (id: string): ILead | undefined => {
  const leads = getLeads();
  return leads.find(l => l.id === id);
};

export const deleteLead = (id: string) => {
  const leads = getLeads();
  const filteredLeads = leads.filter(l => l.id !== id);
  localStorage.setItem(KEYS.LEADS, JSON.stringify(filteredLeads));
  return filteredLeads;
};

// CONTACTS (LOGIC QUAN TRỌNG: Unique Phone)
export const getContacts = (): IContact[] => {
  try {
    const data = localStorage.getItem(KEYS.CONTACTS);
    return data ? JSON.parse(data) : [];
  } catch (e) { return []; }
};

export const addContact = (contact: IContact): IContact => {
  try {
    const contacts = getContacts();

    // Chuẩn hóa SĐT (xóa khoảng trắng, ký tự lạ) để so sánh
    const cleanPhone = (contact.phone || '').replace(/\D/g, '');

    // Tìm xem SĐT này đã tồn tại chưa trong danh bạ Contacts
    const existingIndex = contacts.findIndex(c => {
      const cPhone = (c.phone || '').replace(/\D/g, '');
      return cPhone === cleanPhone && cleanPhone.length > 6;
    });

    if (existingIndex >= 0) {
      // MERGE: Cập nhật thông tin mới vào Contact cũ
      console.log(`[Storage] Contact existed (Phone: ${cleanPhone}). Updating info...`);
      const existing = contacts[existingIndex];

      contacts[existingIndex] = {
        ...existing,
        ...contact,
        id: existing.id, // Giữ ID gốc
        dealIds: [...(existing.dealIds || []), ...(contact.dealIds || [])], // Merge dealIds
        activities: [...(existing.activities || []), ...(contact.activities || [])], // Merge activities
        updatedAt: new Date().toISOString()
      };

      localStorage.setItem(KEYS.CONTACTS, JSON.stringify(contacts));
      return contacts[existingIndex];
    } else {
      // CREATE: Tạo mới hoàn toàn
      console.log(`[Storage] Creating new Contact (Phone: ${cleanPhone})...`);
      const newContact: IContact = {
        ...contact,
        id: `C-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      contacts.unshift(newContact);
      localStorage.setItem(KEYS.CONTACTS, JSON.stringify(contacts));
      return newContact;
    }
  } catch (error) {
    console.error('Error in addContact:', error);
    throw error;
  }
};

// Helper:// CONVERT LEAD TO CONTACT OBJECT
export const convertLeadToContact = (lead: ILead): IContact => {
  return {
    id: `C-${Date.now()}`, // Temporary ID, will be handled in addContact
    name: lead.name,
    phone: lead.phone,
    targetCountry: lead.studentInfo?.targetCountry || lead.program || 'Khác', // Map target country
    email: lead.email,
    address: lead.address,
    city: lead.city,
    dob: lead.dob, // Sync DOB
    identityCard: lead.identityCard, // Sync Identity
    identityDate: lead.identityDate,
    identityPlace: lead.identityPlace,
    gender: lead.gender, // Sync Gender

    // Map Student Info
    school: lead.educationLevel, // Map education level to school/education field
    languageLevel: lead.studentInfo?.languageLevel,
    financialStatus: lead.studentInfo?.financialStatus,
    socialLink: lead.studentInfo?.socialLink,

    ownerId: lead.ownerId,
    source: lead.source,
    createdAt: new Date().toISOString(),
    notes: lead.notes,
    activities: lead.activities || [],
    dealIds: []
  };
};

// DEALS
export const getDeals = (): IDeal[] => {
  try {
    const data = localStorage.getItem(KEYS.DEALS);
    const deals = data ? JSON.parse(data) : [];
    return deals;
  } catch (e) { return []; }
};

export const saveDeals = (deals: IDeal[]) => {
  localStorage.setItem(KEYS.DEALS, JSON.stringify(deals));
};

export const addDeal = (deal: IDeal) => {
  try {
    const deals = getDeals();
    console.log('[Storage] Adding new Deal:', deal.title);
    deals.unshift(deal);
    localStorage.setItem(KEYS.DEALS, JSON.stringify(deals));
    return deals;
  } catch (error) {
    console.error('Error in addDeal:', error);
    return [];
  }
};

export const getDealById = (id: string): IDeal | undefined => {
  const deals = getDeals();
  return deals.find(d => d.id === id);
};

export const updateDeal = (updatedDeal: IDeal): boolean => {
  try {
    const deals = getDeals();
    const index = deals.findIndex(d => d.id === updatedDeal.id);
    if (index !== -1) {
      deals[index] = updatedDeal;
      localStorage.setItem(KEYS.DEALS, JSON.stringify(deals));
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error in updateDeal:', error);
    return false;
  }
};
// CONTRACTS
export const getContracts = (): IContract[] => {
  try {
    const data = localStorage.getItem(KEYS.CONTRACTS);
    return data ? JSON.parse(data) : [];
  } catch (e) { return []; }
};

export const addContract = (contract: IContract) => {
  const contracts = getContracts();
  console.log('[Storage] Adding new Contract:', contract.code);
  contracts.unshift(contract);
  localStorage.setItem(KEYS.CONTRACTS, JSON.stringify(contracts));
  return contracts;
};

