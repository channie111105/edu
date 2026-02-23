import { IQuotationPaymentDocument } from '../types';

// FE-only adapter for future backend integration.
// TODO(BE): replace local stub with:
// POST /api/quotations/:id/payment-documents
// PATCH /api/quotations/:id/status
export const savePaymentDocument = async (
  quotationId: string,
  payload: IQuotationPaymentDocument
): Promise<{ quotationId: string; saved: boolean; payload: IQuotationPaymentDocument }> => {
  return Promise.resolve({
    quotationId,
    saved: true,
    payload
  });
};
