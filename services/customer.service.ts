import { MOCK_CUSTOMERS, MockCustomer } from '../mocks/customers';

const normalize = (value?: string) =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const randomDelay = (min = 200, max = 400) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type Customer = MockCustomer;

export const formatCustomerLabel = (customer: Customer) => {
  const suffix = customer.phone || customer.email;
  return suffix ? `${customer.full_name} - ${suffix}` : customer.full_name;
};

export const searchCustomers = async (keyword: string): Promise<Customer[]> => {
  // TODO: replace mock service with BE API GET /api/customers?query=&limit=20
  await delay(randomDelay());

  const q = normalize(keyword);
  if (!q) return MOCK_CUSTOMERS.slice(0, 20);

  return MOCK_CUSTOMERS.filter((item) => {
    const fields = [item.full_name, item.phone, item.email, item.code].map(normalize);
    return fields.some((f) => f.includes(q));
  }).slice(0, 20);
};
