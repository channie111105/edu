import { ILead, IDeal, IContact, IContract, LeadStatus, DealStage, IMeeting, MeetingStatus, MeetingType, IQuotation, QuotationStatus } from '../types';

export const KEYS = {
  LEADS: 'educrm_leads_v2', // Changed key to force fresh load
  DEALS: 'educrm_deals',
  CONTACTS: 'educrm_contacts',
  CONTRACTS: 'educrm_contracts_cleaned',
  QUOTATIONS: 'educrm_quotations',
  STUDENTS: 'educrm_students',
  MEETINGS: 'educrm_meetings',
  ACTUAL_TRANSACTIONS: 'educrm_actual_transactions',
  INVOICES: 'educrm_invoices',
  INIT: 'educrm_initialized_v10' // Bump version
};

// ... (existing code)

// ACTUAL TRANSACTIONS
export const getActualTransactions = (): any[] => {
  try {
    const data = localStorage.getItem(KEYS.ACTUAL_TRANSACTIONS);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
};

export const saveActualTransactions = (data: any[]) => {
  localStorage.setItem(KEYS.ACTUAL_TRANSACTIONS, JSON.stringify(data));
};

export const addActualTransaction = (newItem: any) => {
  const list = getActualTransactions();
  list.unshift(newItem);
  saveActualTransactions(list);
  return newItem;
};

export const updateActualTransaction = (updated: any) => {
  const list = getActualTransactions();
  const idx = list.findIndex((t: any) => t.id === updated.id);
  if (idx !== -1) {
    list[idx] = updated;
    saveActualTransactions(list);
    return true;
  }
  return false;
};

// ... (existing code)

// QUOTATIONS
export const getQuotations = (): IQuotation[] => {
  try {
    const data = localStorage.getItem(KEYS.QUOTATIONS);
    return data ? JSON.parse(data) : [];
  } catch (e) { return []; }
};

export const addQuotation = (quotation: IQuotation) => {
  const list = getQuotations();
  list.unshift(quotation);
  localStorage.setItem(KEYS.QUOTATIONS, JSON.stringify(list));
  return list;
};

export const updateQuotation = (updated: IQuotation) => {
  const list = getQuotations();
  const idx = list.findIndex(q => q.id === updated.id);
  if (idx !== -1) {
    list[idx] = updated;
    localStorage.setItem(KEYS.QUOTATIONS, JSON.stringify(list));
    return true;
  }
  return false;
};

// ... (existing code, ensure initialize calls mock)

// MEETINGS
export const getMeetings = (): IMeeting[] => {
  try {
    const data = localStorage.getItem(KEYS.MEETINGS);
    return data ? JSON.parse(data) : [];
  } catch (e) { return []; }
};

export const saveMeetings = (meetings: IMeeting[]) => {
  localStorage.setItem(KEYS.MEETINGS, JSON.stringify(meetings));
};

export const addMeeting = (meeting: IMeeting) => {
  const meetings = getMeetings();
  meetings.unshift(meeting);
  localStorage.setItem(KEYS.MEETINGS, JSON.stringify(meetings));
  return meetings;
};

export const updateMeeting = (updated: IMeeting) => {
  const meetings = getMeetings();
  const idx = meetings.findIndex(m => m.id === updated.id);
  if (idx !== -1) {
    meetings[idx] = updated;
    localStorage.setItem(KEYS.MEETINGS, JSON.stringify(meetings));
    return true;
  }
  return false;
};

// STUDENTS
export const getStudents = (): any[] => {
  try {
    const data = localStorage.getItem(KEYS.STUDENTS);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
};

export const saveStudents = (students: any[]) => {
  localStorage.setItem(KEYS.STUDENTS, JSON.stringify(students));
};

export const updateStudent = (updated: any) => {
  const list = getStudents();
  const idx = list.findIndex(s => s.id === updated.id);
  if (idx !== -1) {
    list[idx] = updated;
    saveStudents(list);
    return true;
  }
  return false;
};

export const createStudentFromQuotation = (quotation: IQuotation) => {
  const existing = getStudents();

  // Generate Student Code
  const nextId = existing.length + 1;
  const code = `HV24-${nextId.toString().padStart(4, '0')}`;

  // Try to get more info from Lead/Contact if possible
  const lead = getLeadById(quotation.leadId || '');

  const newStudent: any = {
    id: `ST-${Date.now()}`,
    code: code,
    name: quotation.customerName,
    phone: lead?.phone || 'N/A',
    email: lead?.email || '',
    campus: 'Hà Nội',

    dealId: quotation.dealId,
    soId: quotation.id,
    salesPersonId: quotation.createdBy,

    level: quotation.serviceType,
    note: `Chuyển từ SO: ${quotation.soCode}. Lớp dự kiến: ${quotation.classCode}`,

    status: 'Chưa ghi danh', // StudentStatus.ADMISSION
    admissionDate: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  existing.unshift(newStudent);
  saveStudents(existing);
  return newStudent;
};

// --- INITIAL MOCK DATA (SEED DATA) ---
const INITIAL_LEADS: ILead[] = [
  // 1. SLA DANGER (Created 2 days ago, Status NEW, No activities)
  {
    id: 'SLA-001',
    name: 'Trần Văn Nguy Hiểm',
    phone: '090111222',
    email: 'danger@test.com',
    source: 'SLA Test',
    status: 'NEW' as LeadStatus,
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    ownerId: 'u1',
    activities: [],
    program: 'Du học Đức',
    city: 'Hà Nội',
    lastInteraction: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    notes: 'SLA Test Lead',
    slaStatus: 'danger'
  },
  // 2. SLA WARNING (Created 6 hours ago, Status NEW, No activities)
  {
    id: 'SLA-002',
    name: 'Nguyễn Thị Cảnh Báo',
    phone: '090333444',
    email: 'warning@test.com',
    source: 'SLA Test',
    status: 'NEW' as LeadStatus,
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    ownerId: 'u1',
    activities: [],
    program: 'Tiếng Đức',
    city: 'Đà Nẵng',
    lastInteraction: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    notes: 'SLA Test Lead',
    slaStatus: 'warning'
  },
  // 3. SLA OVERDUE APPOINTMENT (Created 3 days ago, has overdue task)
  {
    id: 'SLA-003',
    name: 'Lê Văn Trễ Hẹn',
    phone: '090555666',
    email: 'overdue@test.com',
    source: 'Website',
    status: 'CONTACTED' as LeadStatus,
    createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    ownerId: 'u1',
    program: 'Du học Đức', // Fixed enum
    city: 'Hồ Chí Minh',
    lastInteraction: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    notes: 'Has overdue appointment',
    slaStatus: 'danger',
    activities: [
      {
        id: 'act-1',
        type: 'activity',
        title: 'Gọi điện tư vấn lần 1',
        description: 'Khách hẹn gọi lại',
        status: 'scheduled',
        datetime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        user: 'u1' // Added user
      }
    ]
  },
  // 4. SLA INFO (Just created 1 hour ago)
  {
    id: 'SLA-004',
    name: 'Phạm Văn Mới',
    phone: '090777888',
    email: 'new@test.com',
    source: 'Facebook',
    status: 'NEW' as LeadStatus,
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
    ownerId: 'u1',
    activities: [],
    program: 'Du học Đức',
    city: 'Hải Phòng',
    lastInteraction: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    notes: 'New lead',
    slaStatus: 'normal'
  },
  // 5. High Potential Lead (Recently Active)
  {
    id: 'LEAD-005',
    name: 'Đặng Thảo Chi',
    phone: '0988777666',
    email: 'thaochi@example.com',
    source: 'TikTok',
    status: 'CONTACTED' as LeadStatus,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    ownerId: 'u1',
    program: 'Du học nghề Úc',
    city: 'Hà Nội',
    lastInteraction: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 mins ago
    notes: 'Quan tâm ngành nhà hàng khách sạn',
    slaStatus: 'normal',
    activities: [
      {
        id: 'act-5-1',
        type: 'activity',
        title: 'Trao đổi sơ bộ',
        description: 'Khách hàng có tài chính tốt, đang tìm hiểu chương trình Úc',
        datetime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        user: 'u1'
      }
    ]
  },
  // 6. Old Lead (Risk of Churn - Danger SLA if logic applies to time)
  {
    id: 'LEAD-006',
    name: 'Vũ Minh Tuấn',
    phone: '0912345678',
    email: 'minhtuan@example.com',
    source: 'Google',
    status: 'NEW' as LeadStatus,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago (Should be Warning/Danger for NEW)
    ownerId: 'u3',
    program: 'Du học Đức',
    city: 'Quảng Ninh',
    lastInteraction: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Chưa liên hệ được',
    slaStatus: 'danger',
    activities: []
  },
  // 7. Another Fresh Lead
  {
    id: 'LEAD-007',
    name: 'Hoàng Thị Lan',
    phone: '0933221100',
    email: 'hlan@example.com',
    source: 'Referral',
    status: 'NEW' as LeadStatus,
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 mins ago
    ownerId: 'u2',
    program: 'Tiếng Đức',
    city: 'Hồ Chí Minh',
    lastInteraction: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    notes: 'Bạn của học viên cũ giới thiệu',
    slaStatus: 'normal',
    activities: []
  },
  // 8. SLA DEMO LEAD
  {
    id: 'SLA-DEMO-008',
    name: 'Phạm Thị Demo SLA',
    phone: '0998877665',
    email: 'slademo@test.com',
    source: 'Website',
    status: 'NEW' as LeadStatus,
    createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25 hours ago
    ownerId: 'u1',
    program: 'Du học Đức',
    city: 'Đà Nẵng',
    lastInteraction: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
    notes: 'Lead demo cho tính năng SLA',
    slaStatus: 'warning',
    slaReason: 'Quá hạn 23 giờ - Chưa tương tác trong 24h đầu (Quy định: 2h)',
    activities: []
  },
  // 9. Another SLA DANGER LEAD
  {
    id: 'SLA-DANGER-009',
    name: 'Trương Văn Khẩn Cấp',
    phone: '0911223344',
    email: 'urgent@test.com',
    source: 'Facebook',
    status: 'NEW' as LeadStatus,
    createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(), // 3 days ago
    ownerId: 'u1',
    program: 'Du học Đức',
    city: 'Hà Nội',
    lastInteraction: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    notes: 'Lead cần xử lý gấp',
    slaStatus: 'danger',
    slaReason: 'Quá hạn 70 giờ - Chưa có tương tác (Quy định: 2h)',
    activities: []
  },
  // 10. SLA - Overdue Appointment
  {
    id: 'SLA-APPT-010',
    name: 'Lý Thị Hẹn Trễ',
    phone: '0922334455',
    email: 'appointment@test.com',
    source: 'Website',
    status: 'CONTACTED' as LeadStatus,
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    ownerId: 'u1',
    program: 'Tiếng Đức',
    city: 'Hồ Chí Minh',
    lastInteraction: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    notes: 'Có lịch hẹn nhưng đã quá giờ',
    slaStatus: 'danger',
    slaReason: 'Quá hạn lịch hẹn 45 phút - Chưa gọi lại',
    activities: [
      {
        id: 'act-appt-1',
        type: 'activity',
        title: 'Gọi điện tư vấn',
        description: 'Hẹn gọi lại lúc 14:00',
        status: 'scheduled',
        datetime: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 mins ago
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        user: 'u1'
      }
    ]
  },
  // 11. SLA - Warning Call Follow-up
  {
    id: 'SLA-CALL-011',
    name: 'Ngô Văn Gọi Lại',
    phone: '0933445566',
    email: 'callback@test.com',
    source: 'Zalo',
    status: 'CONTACTED' as LeadStatus,
    createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
    ownerId: 'u2',
    program: 'Du học Trung',
    city: 'Đà Nẵng',
    lastInteraction: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    notes: 'Khách yêu cầu gọi lại nhưng chưa xử lý',
    slaStatus: 'warning',
    slaReason: 'Quá hạn 3 giờ - Chưa gọi lại theo yêu cầu (Quy định: 2h)',
    activities: [
      {
        id: 'act-call-1',
        type: 'note',
        title: 'Ghi chú',
        description: 'Khách yêu cầu gọi lại sau 2h',
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        user: 'u2'
      }
    ]
  },
  // 12. SLA - Overdue Email Response
  {
    id: 'SLA-EMAIL-012',
    name: 'Phan Thị Email',
    phone: '0944556677',
    email: 'emailresponse@test.com',
    source: 'Email',
    status: 'QUALIFIED' as LeadStatus,
    createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
    ownerId: 'u1',
    program: 'Du học Đức',
    city: 'Hà Nội',
    lastInteraction: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    notes: 'Khách gửi email hỏi thông tin nhưng chưa trả lời',
    slaStatus: 'danger',
    slaReason: 'Quá hạn 4 giờ - Chưa phản hồi email (Quy định: 2h)',
    activities: [
      {
        id: 'act-email-1',
        type: 'message',
        title: 'Email từ khách',
        description: 'Khách hỏi về học phí và thời gian khai giảng',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        user: 'System'
      }
    ]
  }
];

const INITIAL_DEALS: IDeal[] = [];
const INITIAL_CONTRACTS: IContract[] = [];
const INITIAL_QUOTATIONS: IQuotation[] = [
  {
    id: 'Q-001',
    soCode: 'SO001',
    customerName: 'Nguyễn Văn A',
    serviceType: 'StudyAbroad',
    product: 'Du học Đức - Combo A1-B1',
    amount: 45000000,
    finalAmount: 45000000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: QuotationStatus.DRAFT,
    createdBy: 'u1'
  }
];

// --- STORAGE FUNCTIONS ---

export const initializeData = () => {
  if (!localStorage.getItem(KEYS.INIT) || localStorage.getItem(KEYS.INIT) !== 'educrm_initialized_v5') {
    console.log('Initializing Data if needed...');
    localStorage.setItem(KEYS.LEADS, JSON.stringify(INITIAL_LEADS));
    localStorage.setItem(KEYS.DEALS, JSON.stringify(INITIAL_DEALS));
    localStorage.setItem(KEYS.CONTACTS, JSON.stringify([]));
    localStorage.setItem(KEYS.CONTRACTS, JSON.stringify(INITIAL_CONTRACTS));
    localStorage.setItem(KEYS.QUOTATIONS, JSON.stringify(INITIAL_QUOTATIONS));
    localStorage.setItem(KEYS.INIT, 'educrm_initialized_v7');
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

// INVOICES
export const getInvoices = (): any[] => {
  try {
    const data = localStorage.getItem(KEYS.INVOICES);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
};

export const saveInvoices = (data: any[]) => {
  localStorage.setItem(KEYS.INVOICES, JSON.stringify(data));
};

export const addInvoice = (newItem: any) => {
  const list = getInvoices();
  list.unshift(newItem);
  saveInvoices(list);
  return newItem;
};

export const updateInvoice = (updated: any) => {
  const list = getInvoices();
  const idx = list.findIndex((t: any) => t.id === updated.id);
  if (idx !== -1) {
    list[idx] = updated;
    saveInvoices(list);
    return true;
  }
  return false;
};

