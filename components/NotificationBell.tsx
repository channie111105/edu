import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, CheckCheck, Clock3, UserPlus2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getNotificationsForUser,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  NOTIFICATION_EVENTS,
  syncDueMeetingNotifications,
  type IAppNotification,
} from '../utils/notifications';

const formatRelativeTime = (value: string) => {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();

  if (Number.isNaN(diffMs)) return '';

  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return 'Vừa xong';
  if (diffMinutes < 60) return `${diffMinutes} phút trước`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} ngày trước`;

  return date.toLocaleString('vi-VN');
};

const getNotificationIcon = (type: IAppNotification['type']) => {
  if (type === 'meeting_due') return Clock3;
  return UserPlus2;
};

const NotificationBell: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<IAppNotification[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});

  const updatePanelPosition = () => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const panelWidth = 320;
    const viewportPadding = 12;
    const preferredLeft = rect.right + 8;
    const left = Math.min(
      Math.max(viewportPadding, preferredLeft),
      window.innerWidth - panelWidth - viewportPadding
    );

    setPanelStyle({
      position: 'fixed',
      top: rect.bottom + 8,
      left,
      width: panelWidth,
      zIndex: 200,
    });
  };

  const syncNotifications = () => {
    if (!user?.id) {
      setNotifications([]);
      return;
    }

    syncDueMeetingNotifications();
    setNotifications(getNotificationsForUser(user.id));
  };

  useEffect(() => {
    syncNotifications();
  }, [user?.id]);

  useEffect(() => {
    const handleChanged = () => syncNotifications();
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    window.addEventListener(NOTIFICATION_EVENTS.CHANGED, handleChanged as EventListener);
    window.addEventListener('educrm:meetings-changed', handleChanged as EventListener);
    window.addEventListener('mousedown', handleClickOutside);

    const intervalId = window.setInterval(syncNotifications, 60000);

    return () => {
      window.removeEventListener(NOTIFICATION_EVENTS.CHANGED, handleChanged as EventListener);
      window.removeEventListener('educrm:meetings-changed', handleChanged as EventListener);
      window.removeEventListener('mousedown', handleClickOutside);
      window.clearInterval(intervalId);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!isOpen) return;

    updatePanelPosition();
    const handleViewportChange = () => updatePanelPosition();

    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);

    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [isOpen]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.readAt).length,
    [notifications]
  );

  const handleOpenNotification = (notification: IAppNotification) => {
    markNotificationAsRead(notification.id);
    setIsOpen(false);
    if (notification.route) {
      navigate(notification.route);
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => {
          syncNotifications();
          if (!isOpen) {
            requestAnimationFrame(() => updatePanelPosition());
          }
          setIsOpen((prev) => !prev);
        }}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
        title="Thông báo"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-red-500 px-1.5 text-center text-[10px] font-bold leading-[18px] text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          style={panelStyle}
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <p className="text-sm font-bold text-slate-900">Thông báo</p>
              <p className="text-xs text-slate-500">
                {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : 'Không có thông báo mới'}
              </p>
            </div>
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={() => markAllNotificationsAsRead(user.id)}
                className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                <CheckCheck size={14} />
                Đọc hết
              </button>
            )}
          </div>

          <div className="max-h-[360px] overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                Chưa có thông báo nào cho bạn.
              </div>
            ) : (
              notifications.map((notification) => {
                const Icon = getNotificationIcon(notification.type);
                return (
                  <div
                    key={notification.id}
                    className={`group flex gap-3 border-b border-slate-100 px-4 py-3 transition-colors last:border-b-0 ${
                      notification.readAt ? 'bg-white' : 'bg-blue-50/60'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleOpenNotification(notification)}
                      className="flex min-w-0 flex-1 items-start gap-3 text-left"
                    >
                      <div className={`mt-0.5 rounded-full p-2 ${notification.readAt ? 'bg-slate-100 text-slate-500' : 'bg-blue-100 text-blue-700'}`}>
                        <Icon size={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-slate-900">{notification.title}</p>
                          {!notification.readAt && <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500" />}
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-slate-600">{notification.message}</p>
                        <p className="mt-2 text-xs text-slate-400">{formatRelativeTime(notification.createdAt)}</p>
                      </div>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
