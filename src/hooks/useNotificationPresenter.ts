import { useEffect, useMemo, useState } from "react";
import { NotificationService } from "../services/NotificationService";
import type { AppNotification } from "../types";
import { logger } from "../utils/logger";

interface UseNotificationPresenterArgs {
  onNavigateToProject?: (projectId: string) => void;
  onNavigateToMilestone?: (projectId: string, milestoneId: string) => void;
  onNavigateToAuditTrail?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToSettings?: () => void;
}

export const useNotificationPresenter = (
  {
    onNavigateToProject,
    onNavigateToMilestone,
    onNavigateToAuditTrail,
    onNavigateToProfile,
    onNavigateToSettings,
  }: UseNotificationPresenterArgs = {},
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
    const meta = (item.metadata ?? {}) as { projectId?: string; milestoneId?: string };
    const projectIdFromMeta = typeof meta.projectId === "string" ? meta.projectId : null;
    const milestoneIdFromMeta = typeof meta.milestoneId === "string" ? meta.milestoneId : null;

    switch (item.targetType) {
      case "project":
        if (item.targetId && onNavigateToProject) onNavigateToProject(item.targetId);
        return;
      case "milestone": {
        const projectId = projectIdFromMeta;
        const milestoneId = milestoneIdFromMeta ?? item.targetId;
        if (projectId && milestoneId && onNavigateToMilestone) {
          onNavigateToMilestone(projectId, milestoneId);
        } else if (projectId && onNavigateToProject) {
          onNavigateToProject(projectId);
        }
        return;
      }
      case "auditTrail":
        if (onNavigateToAuditTrail) onNavigateToAuditTrail();
        return;
      case "profile":
        if (onNavigateToProfile) onNavigateToProfile();
        return;
      case "settings":
        if (onNavigateToSettings) onNavigateToSettings();
        return;
      default:
        logger.log("[Notifications] no route handler for targetType:", item.targetType);
        return;
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
