import { useCallback, useEffect, useState } from "react";
import { notificationAPI } from "../services/api";
import websocketService from "../services/websocket";

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getNotificationType = (typeId: number): string => {
    switch (typeId) {
      case 1:
        return "message";
      case 2:
        return "product";
      case 3:
        return "system";
      default:
        return "general";
    }
  };

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await notificationAPI.getAllNotifications();

      const mappedNotifications = data
        .map((notification: any) => ({
          id: notification.id,
          title: notification.title || "New notification",
          message: notification.message,
          read: notification.read || false,
          createdAt: notification.createdAt,
          typeId: notification.typeId,
          userId: notification.userId,
          type: getNotificationType(notification.typeId),
          timestamp: notification.createdAt,
        }))
        .sort(
          (a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

      setNotifications(mappedNotifications);
    } catch (err) {
      setError((err as Error).message);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const addNotification = useCallback((newNotification: any) => {
    setNotifications((prev) => {
      const exists = prev.some((notif) => notif.id === newNotification.id);
      if (exists) {
        return prev;
      }

      const mappedNotification = {
        id: newNotification.id || Date.now(),
        title: newNotification.title || "New notification",
        message: newNotification.message || newNotification.content || "",
        read: false,
        createdAt: newNotification.createdAt || new Date().toISOString(),
        typeId: newNotification.typeId,
        userId: newNotification.userId,
        type: getNotificationType(newNotification.typeId),
        timestamp: newNotification.createdAt || new Date().toISOString(),
      };

      return [mappedNotification, ...prev];
    });
  }, []);

  const markAsRead = useCallback(async (notificationId: number) => {
    try {
      await notificationAPI.markAsRead(notificationId);

      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    const unreadNotifications = notifications.filter((n) => !n.read);

    if (unreadNotifications.length === 0) {
      return;
    }

    try {
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, read: true }))
      );

      await Promise.all(
        unreadNotifications.map((notification) =>
          notificationAPI.markAsRead(notification.id)
        )
      );
    } catch (err) {
      setError((err as Error).message);
      loadNotifications();
    }
  }, [notifications, loadNotifications]);

  const deleteNotification = useCallback(async (notificationId: number) => {
    try {
      await notificationAPI.deleteNotification(notificationId);

      setNotifications((prev) =>
        prev.filter((notif) => notif.id !== notificationId)
      );
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  const unreadCount = notifications.filter((notif) => !notif.read).length;
  const recentNotifications = notifications.slice(0, 10);

  useEffect(() => {
    const handleNewMessage = (payload: any) => {
      console.log('[useNotifications] New message received:', payload);
      if (
        payload.senderId &&
        payload.senderId !== websocketService.currentUserId
      ) {
        const notificationPayload = {
          id: `msg_${payload.id}_${Date.now()}`,
          title: "Nuevo mensaje",
          message: payload.content?.substring(0, 50) || "Tienes un nuevo mensaje",
          typeId: 1,
          userId: websocketService.currentUserId,
          conversationId: payload.conversationId,
          createdAt:
            payload.sentAt || payload.createdAt || new Date().toISOString(),
        };
        addNotification(notificationPayload);
      }
    };

    const handleNewNotification = (payload: any) => {
      console.log('[useNotifications] New notification from WebSocket:', payload);
      addNotification(payload);
    };

    const handleNotificationReadConfirm = (data: any) => {
      console.log('[useNotifications] Notification read confirmed:', data);
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === data.notificationId ? { ...notif, read: true } : notif
        )
      );
    };

    websocketService.on("newMessage", handleNewMessage);
    websocketService.on("newNotification", handleNewNotification);
    websocketService.on("notificationReadConfirm", handleNotificationReadConfirm);

    return () => {
      websocketService.off("newMessage", handleNewMessage);
      websocketService.off("newNotification", handleNewNotification);
      websocketService.off("notificationReadConfirm", handleNotificationReadConfirm);
    };
  }, [addNotification]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  return {
    notifications,
    recentNotifications,
    unreadCount,
    loading,
    error,
    loadNotifications,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
};

export default useNotifications;
