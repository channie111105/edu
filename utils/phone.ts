export const normalizeLeadPhone = (value?: string): string => String(value || '').replace(/\D/g, '');

export const isValidLeadPhone = (value?: string): boolean => /^0\d{9}$/.test(normalizeLeadPhone(value));

export const getLeadPhoneValidationMessage = (value?: string): string | null => {
  const normalizedPhone = normalizeLeadPhone(value);

  if (!normalizedPhone) {
    return 'Vui l\u00f2ng nh\u1eadp s\u1ed1 \u0111i\u1ec7n tho\u1ea1i.';
  }

  if (!isValidLeadPhone(normalizedPhone)) {
    return 'S\u1ed1 \u0111i\u1ec7n tho\u1ea1i kh\u00f4ng \u0111\u00fang \u0111\u1ecbnh d\u1ea1ng, vui l\u00f2ng nh\u1eadp l\u1ea1i.';
  }

  return null;
};
