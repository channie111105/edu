import { IContact, ILead, IMeeting, MeetingStatus, MeetingType } from '../types';
import { addMeeting, getContacts, getLeads, getMeetings, saveContact, saveLead } from './storage';

export interface MeetingTeacherOption {
  id: string;
  name: string;
}

export interface MeetingCustomerOption {
  key: string;
  id: string;
  source: 'lead' | 'contact';
  name: string;
  phone: string;
  campus?: string;
  address?: string;
  leadId?: string;
  contactId?: string;
}

export interface CreateMeetingPayload {
  customer: MeetingCustomerOption;
  datetime: string;
  type: MeetingType;
  campus?: string;
  address?: string;
  notes?: string;
  teacherId?: string;
  teacherName?: string;
  salesPersonId: string;
  salesPersonName: string;
}

export const MEETING_TEACHERS: MeetingTeacherOption[] = [
  { id: 'T01', name: 'Nguyễn Văn A (IELTS)' },
  { id: 'T02', name: 'Trần Thị B (Tiếng Đức)' },
  { id: 'T03', name: 'Lê Văn C (Tiếng Trung)' }
];

const normalizePhone = (phone?: string) => (phone || '').replace(/\D/g, '');

const toCustomerFromLead = (lead: ILead): MeetingCustomerOption => ({
  key: `lead:${lead.id}`,
  id: lead.id,
  source: 'lead',
  name: lead.name,
  phone: lead.phone,
  campus: lead.company || lead.city || 'Hà Nội',
  address: lead.address || 'N/A',
  leadId: lead.id
});

const toCustomerFromContact = (contact: IContact): MeetingCustomerOption => ({
  key: `contact:${contact.id}`,
  id: contact.id,
  source: 'contact',
  name: contact.name,
  phone: contact.phone,
  campus: contact.company || contact.city || 'Hà Nội',
  address: contact.address || 'N/A',
  contactId: contact.id
});

const findLeadByPhone = (phone: string): ILead | undefined => {
  const normalized = normalizePhone(phone);
  if (!normalized) return undefined;
  return getLeads().find(l => normalizePhone(l.phone) === normalized);
};

export const getMeetingCustomerOptions = (): MeetingCustomerOption[] => {
  const leads = getLeads().map(toCustomerFromLead);
  const contacts = getContacts().map(toCustomerFromContact);
  return [...leads, ...contacts];
};

export const hasTeacherConflict = (teacherId: string, datetime: string, excludeMeetingId?: string): boolean => {
  if (!teacherId || !datetime) return false;
  const target = new Date(datetime).getTime();
  if (Number.isNaN(target)) return false;

  return getMeetings().some((meeting) => {
    if (excludeMeetingId && meeting.id === excludeMeetingId) return false;
    if (meeting.status === MeetingStatus.CANCELLED) return false;
    if (meeting.teacherId !== teacherId) return false;
    return new Date(meeting.datetime).getTime() === target;
  });
};

export const createMeetingWithActivityLog = (payload: CreateMeetingPayload): IMeeting => {
  const linkedLead = payload.customer.leadId
    ? getLeads().find(l => l.id === payload.customer.leadId)
    : findLeadByPhone(payload.customer.phone);
  const linkedContact = payload.customer.contactId
    ? getContacts().find(c => c.id === payload.customer.contactId)
    : undefined;

  const meeting: IMeeting = {
    id: `M-${Date.now()}`,
    title: `Lịch hẹn: ${payload.customer.name}`,
    leadId: linkedLead?.id || payload.customer.id,
    leadName: payload.customer.name,
    leadPhone: payload.customer.phone,
    salesPersonId: payload.salesPersonId,
    salesPersonName: payload.salesPersonName,
    campus: payload.campus || payload.customer.campus || 'Hà Nội',
    address: payload.address || payload.customer.address || 'N/A',
    datetime: payload.datetime,
    type: payload.type,
    status: MeetingStatus.DRAFT,
    teacherId: payload.teacherId,
    teacherName: payload.teacherName,
    notes: payload.notes || '',
    createdAt: new Date().toISOString()
  };

  addMeeting(meeting);

  const systemActivity = {
    id: `act-meeting-${Date.now()}`,
    type: 'system' as const,
    timestamp: new Date().toISOString(),
    title: 'Đặt lịch hẹn',
    description: `Đã tạo lịch hẹn ${payload.type} vào ${new Date(payload.datetime).toLocaleString('vi-VN')}. Trạng thái khởi tạo: Draft.`,
    user: payload.salesPersonName
  };

  if (linkedLead) {
    const updatedLead = {
      ...linkedLead,
      activities: [systemActivity, ...(linkedLead.activities || [])]
    };
    saveLead(updatedLead);
  }

  if (linkedContact) {
    const updatedContact = {
      ...linkedContact,
      activities: [systemActivity, ...((linkedContact.activities as any[]) || [])]
    };
    saveContact(updatedContact);
  }

  return meeting;
};

export const toMeetingType = (value: string): MeetingType => {
  return value === MeetingType.ONLINE ? MeetingType.ONLINE : MeetingType.OFFLINE;
};
