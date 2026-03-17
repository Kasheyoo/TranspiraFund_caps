import { useCallback, useEffect, useState } from "react";
import { NotificationService } from "../services/NotificationService";
import type { AppNotification } from "../types";
import { logger } from "../utils/logger";

export const useNotificationPresenter = () => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await NotificationService.getAll();
      setNotifications(data);
    } catch (error) {
      logger.error("Load Notifications Error:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleItemPress = async (item: AppNotification) => {
    if (item.status === "Unread") {
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, status: "Read" } : n)),
      );

      try {
        await NotificationService.markAsRead(item.id);
      } catch (error) {
        logger.error("Mark Read Error:", error);
        loadNotifications();
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    const unread = notifications.filter((n) => n.status === "Unread");
    if (unread.length === 0) return;

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.status === "Unread" ? { ...n, status: "Read" } : n)),
    );

    try {
      await Promise.all(unread.map((n) => NotificationService.markAsRead(n.id)));
    } catch (error) {
      logger.error("Mark All Read Error:", error);
      loadNotifications();
    }
  };

  return {
    data: { notifications, isLoading },
    actions: {
      refresh: loadNotifications,
      onPressItem: handleItemPress,
      markAllAsRead: handleMarkAllAsRead,
    },
  };
};
