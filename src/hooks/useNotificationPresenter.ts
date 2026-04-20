import { useEffect, useMemo, useState } from "react";
import { NotificationService } from "../services/NotificationService";
import type { AppNotification } from "../types";
import { logger } from "../utils/logger";

interface UseNotificationPresenterArgs {
  onNavigateToProject?: (projectId: string) => void;
}

export const useNotificationPresenter = (
  { onNavigateToProject }: UseNotificationPresenterArgs = {},
) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = NotificationService.subscribe(
      (items) => {
        setNotifications(items);
        setIsLoading(false);
      },
      (err) => {
        logger.error("[Notifications] subscribe failed:", err);
        setIsLoading(false);
      },
    );
    return unsubscribe;
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications],
  );

  const handleItemPress = async (item: AppNotification) => {
    if (!item.isRead) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)),
      );
      NotificationService.markAsRead(item.id).catch((err) => {
        logger.error("[Notifications] markAsRead error:", err);
      });
    }
    if (item.targetType === "project" && item.targetId && onNavigateToProject) {
      onNavigateToProject(item.targetId);
    }
  };

  const handleMarkAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.isRead);
    if (unread.length === 0) return;

    setNotifications((prev) =>
      prev.map((n) => (n.isRead ? n : { ...n, isRead: true })),
    );

    try {
      await Promise.all(unread.map((n) => NotificationService.markAsRead(n.id)));
    } catch (error) {
      logger.error("[Notifications] markAllAsRead error:", error);
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await NotificationService.dismiss(id);
    } catch (error) {
      logger.error("[Notifications] dismiss error:", error);
    }
  };

  return {
    data: { notifications, unreadCount, isLoading },
    actions: {
      onPressItem: handleItemPress,
      markAllAsRead: handleMarkAllAsRead,
      onDismiss: handleDismiss,
    },
  };
};
