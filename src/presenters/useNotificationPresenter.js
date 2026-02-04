import { useCallback, useEffect, useState } from "react";
import { NotificationService } from "../services/NotificationService";

export const useNotificationPresenter = () => {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await NotificationService.getAll();
      setNotifications(data);
    } catch (error) {
      console.error("Load Notifications Error:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleItemPress = async (item) => {
    if (item.status === "Unread") {
      // Optimistic UI update
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, status: "Read" } : n)),
      );

      try {
        // ✅ This call will now work with the updated service
        await NotificationService.markAsRead(item.id);
      } catch (error) {
        console.error("Mark Read Error:", error);
        loadNotifications(); // Rollback UI if the DB update fails
      }
    }
  };

  return {
    data: { notifications, isLoading },
    actions: {
      refresh: loadNotifications,
      onPressItem: handleItemPress,
    },
  };
};
