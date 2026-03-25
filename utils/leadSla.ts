import { ILead } from '../types';

const parseDateSafe = (value?: string) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const getPickedLeadFirstActionDeadline = (
  pickUpDate?: string,
  firstActionTimeMinutes = 120
): Date | null => {
  const pickedAt = parseDateSafe(pickUpDate);
  if (!pickedAt) return null;

  const hour = pickedAt.getHours();
  const deadline = new Date(pickedAt);

  if (hour >= 8 && hour < 17) {
    deadline.setTime(deadline.getTime() + firstActionTimeMinutes * 60 * 1000);
    return deadline;
  }

  deadline.setDate(deadline.getDate() + 1);
  deadline.setHours(9, 0, 0, 0);
  return deadline;
};

export const getPickedLeadFirstActionMessage = (
  pickUpDate?: string,
  firstActionTimeMinutes = 120
): string => {
  const pickedAt = parseDateSafe(pickUpDate);
  if (!pickedAt) return 'Da nhan lead nhung chua co goi/cap nhat sau khi nhan.';

  const hour = pickedAt.getHours();
  if (hour >= 8 && hour < 17) {
    const hours = Math.max(1, Math.round(firstActionTimeMinutes / 60));
    return `Da nhan lead trong gio hanh chinh nhung qua ${hours} tieng van chua goi/cap nhat.`;
  }

  return 'Da nhan lead ngoai gio hanh chinh nhung den 09:00 sang ngay hom sau van chua goi/cap nhat.';
};

export const clearLeadReclaimTracking = <T extends ILead>(lead: T): T => ({
  ...lead,
  reclaimedAt: undefined,
  reclaimReason: undefined,
  reclaimTriggerAt: undefined,
  reclaimedFromOwnerId: undefined
});
