import { useState, useEffect, useCallback, useRef } from 'react';
import websocketService from '../services/websocket';

export const useWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectStatus, setReconnectStatus] = useState({
    isReconnecting: false,
    attempts: 0,
    maxAttempts: 5,
  });
  const [error, setError] = useState<Error | null>(null);

  const connect = useCallback(async () => {
    try {
      console.log('[useWebSocket] Attempting to connect...');
      await websocketService.connect();
      setIsConnected(true);
      setError(null);
    } catch (err) {
      console.error('[useWebSocket] Connection failed:', err);
      setError(err as Error);
      setIsConnected(false);
      throw err;
    }
  }, []);

  const disconnect = useCallback(() => {
    console.log('[useWebSocket] Disconnecting...');
    websocketService.disconnect();
    setIsConnected(false);
  }, []);

  useEffect(() => {
    const handleConnected = () => {
      console.log('[useWebSocket] Connected event received');
      setIsConnected(true);
      setError(null);
      setReconnectStatus(websocketService.getConnectionStatus());
    };

    const handleDisconnected = () => {
      console.log('[useWebSocket] Disconnected event received');
      setIsConnected(false);
      setReconnectStatus(websocketService.getConnectionStatus());
    };

    const handleError = (error: Error) => {
      console.error('[useWebSocket] Error event received:', error);
      setError(error);
      setIsConnected(false);
    };

    const handleMaxReconnectAttemptsReached = () => {
      console.log('[useWebSocket] Max reconnect attempts reached');
      setError(new Error('No se pudo reconectar después de varios intentos'));
      setReconnectStatus(websocketService.getConnectionStatus());
    };

    websocketService.on('connected', handleConnected);
    websocketService.on('disconnected', handleDisconnected);
    websocketService.on('error', handleError);
    websocketService.on('maxReconnectAttemptsReached', handleMaxReconnectAttemptsReached);

    return () => {
      websocketService.off('connected', handleConnected);
      websocketService.off('disconnected', handleDisconnected);
      websocketService.off('error', handleError);
      websocketService.off('maxReconnectAttemptsReached', handleMaxReconnectAttemptsReached);
    };
  }, []);

  return {
    isConnected,
    reconnectStatus,
    error,
    connect,
    disconnect,
    send: websocketService.send.bind(websocketService),
    joinConversation: websocketService.joinConversation.bind(websocketService),
    leaveConversation: websocketService.leaveConversation.bind(websocketService),
    startTyping: websocketService.startTyping.bind(websocketService),
    stopTyping: websocketService.stopTyping.bind(websocketService),
  };
};

export const useWebSocketMessages = (conversationId: number | null) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<number>>(new Set());
  const conversationIdRef = useRef(conversationId);

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  const addMessage = useCallback((message: any) => {
    setMessages((prevMessages) => {
      const exists = prevMessages.some((msg) => msg.id === message.id);
      if (exists) return prevMessages;
      return [...prevMessages, message];
    });
  }, []);

  const updateMessage = useCallback((messageId: number, updates: any) => {
    setMessages((prevMessages) =>
      prevMessages.map((msg) =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      )
    );
  }, []);

  const setMessagesFromAPI = useCallback((apiMessages: any[]) => {
    setMessages(apiMessages);
  }, []);

  useEffect(() => {
    const handleNewMessage = (payload: any) => {
      console.log('[useWebSocketMessages] New message received:', payload);
      const payloadConvId = payload.conversationId?.toString();
      const currentConvId = conversationIdRef.current?.toString();

      if (payloadConvId === currentConvId) {
        const mappedMessage = {
          id: payload.id,
          text: payload.content,
          sender:
            payload.senderId === websocketService.currentUserId ? 'me' : 'vendor',
          timestamp: payload.sentAt || payload.createdAt,
          originalData: payload,
        };

        addMessage(mappedMessage);
        
        // Remove typing indicator when message is received
        if (payload.senderId && payload.senderId !== websocketService.currentUserId) {
          setTypingUsers((prev) => {
            const newSet = new Set(prev);
            newSet.delete(payload.senderId);
            return newSet;
          });
        }
      }
    };

    const handleMessageSent = (messageData: any) => {
      console.log('[useWebSocketMessages] Message sent confirmation:', messageData);
      // Update pending message with real data from server
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.pending && msg.text === messageData.content
            ? {
                ...msg,
                id: messageData.id,
                pending: false,
                status: 'sent',
                timestamp: messageData.sentAt || messageData.createdAt,
                originalData: messageData,
              }
            : msg
        )
      );
    };

    const handleMessageReadUpdate = (data: any) => {
      console.log('[useWebSocketMessages] Message read update:', data);
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === data.messageId
            ? { ...msg, status: data.read ? 'read' : 'delivered' }
            : msg
        )
      );
    };

    const handleTypingStart = (payload: any) => {
      console.log('[useWebSocketMessages] Typing start:', payload);
      if (
        payload.conversationId?.toString() === conversationIdRef.current?.toString() &&
        payload.userId !== websocketService.currentUserId
      ) {
        setTypingUsers((prev) => new Set([...prev, payload.userId]));
      }
    };

    const handleTypingStop = (payload: any) => {
      console.log('[useWebSocketMessages] Typing stop:', payload);
      if (payload.conversationId?.toString() === conversationIdRef.current?.toString()) {
        setTypingUsers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(payload.userId);
          return newSet;
        });
      }
    };

    websocketService.on('newMessage', handleNewMessage);
    websocketService.on('messageSent', handleMessageSent);
    websocketService.on('messageReadUpdate', handleMessageReadUpdate);
    websocketService.on('typingStart', handleTypingStart);
    websocketService.on('typingStop', handleTypingStop);

    if (conversationId) {
      console.log('[useWebSocketMessages] Joining conversation:', conversationId);
      websocketService.joinConversation(conversationId);
    }

    return () => {
      websocketService.off('newMessage', handleNewMessage);
      websocketService.off('messageSent', handleMessageSent);
      websocketService.off('messageReadUpdate', handleMessageReadUpdate);
      websocketService.off('typingStart', handleTypingStart);
      websocketService.off('typingStop', handleTypingStop);
      if (conversationId) {
        console.log('[useWebSocketMessages] Leaving conversation:', conversationId);
        websocketService.leaveConversation(conversationId);
      }
    };
  }, [conversationId, addMessage]);

  return {
    messages,
    typingUsers: Array.from(typingUsers),
    isTyping: typingUsers.size > 0,
    addMessage,
    updateMessage,
    setMessagesFromAPI,
  };
};

export const useWebSocketNotifications = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const addNotification = useCallback((notification: any) => {
    console.log('[useWebSocketNotifications] Adding notification:', notification);
    setNotifications((prev) => {
      const exists = prev.some((notif) => notif.id === notification.id);
      if (exists) return prev;
      return [notification, ...prev];
    });
    setUnreadCount((prev) => prev + 1);
  }, []);

  const removeNotification = useCallback((notificationId: number) => {
    setNotifications((prev) =>
      prev.filter((notif) => notif.id !== notificationId)
    );
  }, []);

  const markAsRead = useCallback((notificationId: number) => {
    websocketService.markNotificationAsRead(notificationId);
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) =>
      prev.map((notif) => ({ ...notif, read: true }))
    );
    setUnreadCount(0);
  }, []);

  const setNotificationsFromAPI = useCallback((apiNotifications: any[]) => {
    setNotifications(apiNotifications);
    const unread = apiNotifications.filter((n) => !n.read).length;
    setUnreadCount(unread);
  }, []);

  useEffect(() => {
    const handleNewNotification = (payload: any) => {
      console.log('[useWebSocketNotifications] New notification:', payload);
      addNotification(payload);
    };

    const handleNotificationReadConfirm = (data: any) => {
      console.log('[useWebSocketNotifications] Notification read confirmed:', data);
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === data.notificationId ? { ...notif, read: true } : notif
        )
      );
    };

    websocketService.on('newNotification', handleNewNotification);
    websocketService.on('notificationReadConfirm', handleNotificationReadConfirm);

    return () => {
      websocketService.off('newNotification', handleNewNotification);
      websocketService.off('notificationReadConfirm', handleNotificationReadConfirm);
    };
  }, [addNotification]);

  return {
    notifications,
    unreadCount,
    addNotification,
    removeNotification,
    markAsRead,
    markAllAsRead,
    setNotificationsFromAPI,
  };
};