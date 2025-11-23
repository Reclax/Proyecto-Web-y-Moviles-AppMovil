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
      await websocketService.connect();
      setIsConnected(true);
      setError(null);
    } catch (err) {
      setError(err as Error);
      setIsConnected(false);
      throw err;
    }
  }, []);

  const disconnect = useCallback(() => {
    websocketService.disconnect();
    setIsConnected(false);
  }, []);

  useEffect(() => {
    const handleConnected = () => {
      setIsConnected(true);
      setError(null);
      setReconnectStatus(websocketService.getConnectionStatus());
    };

    const handleDisconnected = () => {
      setIsConnected(false);
      setReconnectStatus(websocketService.getConnectionStatus());
    };

    const handleError = (error: Error) => {
      setError(error);
      setIsConnected(false);
    };

    websocketService.on('connected', handleConnected);
    websocketService.on('disconnected', handleDisconnected);
    websocketService.on('error', handleError);

    return () => {
      websocketService.off('connected', handleConnected);
      websocketService.off('disconnected', handleDisconnected);
      websocketService.off('error', handleError);
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
  };
};

export const useWebSocketMessages = (conversationId: number | null) => {
  const [messages, setMessages] = useState<any[]>([]);
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
      }
    };

    websocketService.on('newMessage', handleNewMessage);

    if (conversationId) {
      websocketService.joinConversation(conversationId);
    }

    return () => {
      websocketService.off('newMessage', handleNewMessage);
      if (conversationId) {
        websocketService.leaveConversation(conversationId);
      }
    };
  }, [conversationId, addMessage]);

  return {
    messages,
    addMessage,
    updateMessage,
    setMessagesFromAPI,
  };
};

export const useWebSocketNotifications = () => {
  const [notifications, setNotifications] = useState<any[]>([]);

  const addNotification = useCallback((notification: any) => {
    setNotifications((prev) => {
      const exists = prev.some((notif) => notif.id === notification.id);
      if (exists) return prev;
      return [notification, ...prev];
    });
  }, []);

  const removeNotification = useCallback((notificationId: number) => {
    setNotifications((prev) =>
      prev.filter((notif) => notif.id !== notificationId)
    );
  }, []);

  const markAsRead = useCallback((notificationId: number) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
  }, []);

  useEffect(() => {
    const handleNewNotification = (payload: any) => {
      addNotification(payload);
    };

    websocketService.on('newNotification', handleNewNotification);

    return () => {
      websocketService.off('newNotification', handleNewNotification);
    };
  }, [addNotification]);

  return {
    notifications,
    addNotification,
    removeNotification,
    markAsRead,
  };
};