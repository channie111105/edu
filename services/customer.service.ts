import { getContacts, getLeads } from '../utils/storage';
import { IContact, ILead } from '../types';

// Customer hợp nhất từ Lead và Contact thực trong storage. Mock đã loại bỏ.
export interface Customer {
  id: string;
  source: 'lead' | 'contact';
  code?: string;
  full_name: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  notes?: string;
}

const normalize = (value?: string) =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export const formatCustomerLabel = (customer: Customer) => {
  const suffix = customer.phone || customer.email;
  return suffix ? `${customer.full_name} - ${suffix}` : customer.full_name;
};

const leadToCustomer = (lead: ILead): Customer => ({
  id: lead.id,
  source: 'lead',
  full_name: lead.name || '',
  phone: lead.phone,
  email: lead.email,
  address: lead.address,
  city: lead.city,
  notes: lead.notes,
});

const contactToCustomer = (contact: IContact): Customer => ({
  id: contact.id,
  source: 'contact',
  full_name: contact.name || contact.company || '',
  phone: contact.phone,
  email: contact.email,
  address: contact.address,
  city: contact.city,
  notes: contact.notes,
});

const buildCustomerPool = (): Customer[] => {
  const leads = getLeads().map(leadToCustomer);
  const contacts = getContacts().map(contactToCustomer);
  return [...contacts, ...leads];
};

export const searchCustomers = async (keyword: string): Promise<Customer[]> => {
  const pool = buildCustomerPool();
  const q = normalize(keyword);
  if (!q) return pool.slice(0, 20);

  return pool
    .filter((item) => {
      const fields = [item.full_name, item.phone, item.email, item.code].map(normalize);
      return fields.some((f) => f.includes(q));
    })
    .slice(0, 20);
};
