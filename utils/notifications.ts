import { MeetingStatus } from '../types';

export type AppNotificationType = 'lead_assigned' | 'meeting_due';

export interface IAppNotification {
  id: string;
  recipientUserId: string;
  type: AppNotificationType;
  title: string;
  message: string;
  createdAt: string;
  readAt?: string;
  route?: string;
  entityId?: string;
  entityType?: 'lead' | 'meeting';
  dedupeKey?: string;
}

const NOTIFICATIONS_KEY = 'educrm_notifications_v1';
const MEETINGS_KEY = 'educrm_meetings';
const NOTIFICATIONS_CHANGED_EVENT = 'educrm:notifications-changed';

const emitNotificationsChanged = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED_EVENT));
  }
};

const isNotificationRecord = (value: unknown): value is IAppNotification =>
  Boolean(value) && typeof value === 'object' && typeof (value as IAppNotification).id === 'string';

export const getNotifications = (): IAppNotification[] => {
  try {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(NOTIFICATIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isNotificationRecord) : [];
  } catch {
    return [];
  }
};

const saveNotifications = (notifications: IAppNotification[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications.slice(0, 200)));
  emitNotificationsChanged();
};

export const addNotification = (notification: Omit<IAppNotification, 'id' | 'createdAt'> & Partial<Pick<IAppNotification, 'id' | 'createdAt'>>): IAppNotification => {
  const notifications = getNotifications();

  if (notification.dedupeKey) {
    const existing = notifications.find((item) =>
      item.recipientUserId === notification.recipientUserId && item.dedupeKey === notification.dedupeKey
    );
    if (existing) return existing;
  }

  const created: IAppNotification = {
    ...notification,
    id: notification.id || `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: notification.createdAt || new Date().toISOString(),
  };

  saveNotifications([created, ...notifications]);
  return created;
};

export const getNotificationsForUser = (userId?: string | null): IAppNotification[] => {
  if (!userId) return [];
  return getNotifications()
    .filter((item) => item.recipientUserId === userId)
    .sort((a, b) => {
      if (!!a.readAt !== !!b.readAt) return a.readAt ? 1 : -1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
};

export const markNotificationAsRead = (notificationId: string) => {
  const notifications = getNotifications();
  const next = notifications.map((item) =>
    item.id === notificationId && !item.readAt
      ? { ...item, readAt: new Date().toISOString() }
      : item
  );
  saveNotifications(next);
};

export const markAllNotificationsAsRead = (userId?: string | null) => {
  if (!userId) return;
  const nowIso = new Date().toISOString();
  const next = getNotifications().map((item) =>
    item.recipientUserId === userId && !item.readAt
      ? { ...item, readAt: nowIso }
      : item
  );
  saveNotifications(next);
};

export const deleteNotification = (notificationId: string) => {
  const next = getNotifications().filter((item) => item.id !== notificationId);
  saveNotifications(next);
};

export const createLeadAssignmentNotification = ({
  recipientUserId,
  leadId,
  leadName,
  isReassigned,
}: {
  recipientUserId?: string;
  leadId: string;
  leadName: string;
  isReassigned?: boolean;
}) => {
  if (!recipientUserId) return null;

  return addNotification({
    recipientUserId,
    type: 'lead_assigned',
    title: isReassigned ? 'Lead được phân bổ lại' : 'Lead được phân bổ',
    message: isReassigned
      ? `Lead "${leadName}" vừa được phân bổ lại cho bạn.`
      : `Lead "${leadName}" vừa được phân bổ cho bạn.`,
    route: '/sales/my-leads',
    entityId: leadId,
    entityType: 'lead',
    dedupeKey: `lead_assigned:${leadId}:${recipientUserId}:${isReassigned ? 'reassigned' : 'assigned'}`,
  });
};

const getStoredMeetings = (): Array<{
  id: string;
  leadName?: string;
  datetime?: string;
  salesPersonId?: string;
  status?: string;
}> => {
  try {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(MEETINGS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const syncDueMeetingNotifications = (now = new Date()) => {
  const nowMs = now.getTime();
  if (Number.isNaN(nowMs)) return;

  getStoredMeetings().forEach((meeting) => {
    const recipientUserId = String(meeting.salesPersonId || '').trim();
    const datetime = String(meeting.datetime || '').trim();
    const meetingTime = new Date(datetime).getTime();
    const status = String(meeting.status || '');

    if (!recipientUserId || !datetime || Number.isNaN(meetingTime)) return;
    if (meetingTime > nowMs) return;
    if ([MeetingStatus.CANCELLED, MeetingStatus.SUBMITTED].includes(status as MeetingStatus)) return;

    addNotification({
      recipientUserId,
      type: 'meeting_due',
      title: 'Đến lịch hẹn',
      message: `Lịch hẹn với lead "${meeting.leadName || 'Khách hàng'}" đã đến giờ.`,
      route: '/sales/meetings',
      entityId: meeting.id,
      entityType: 'meeting',
      dedupeKey: `meeting_due:${meeting.id}:${datetime}`,
      createdAt: datetime,
    });
  });
};

export const getUnreadNotificationCount = (userId?: string | null) =>
  getNotificationsForUser(userId).filter((item) => !item.readAt).length;

export const NOTIFICATION_EVENTS = {
  CHANGED: NOTIFICATIONS_CHANGED_EVENT,
} as const;
