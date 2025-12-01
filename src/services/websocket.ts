import { authAPI, userAPI } from './api';

interface WebSocketConfig {
  url: string;
  connectionTimeout: number;
  heartbeatInterval: number;
  reconnectBackoff: number;
  maxReconnectAttempts: number;
}

// Get WebSocket URL from environment variable
const getWsUrl = (): string => {
  const envWsUrl = process.env.EXPO_PUBLIC_WS_URL;
  const envApiUrl = process.env.EXPO_PUBLIC_API_URL;
  
  if (envWsUrl) {
    console.log('[WebSocket] Using EXPO_PUBLIC_WS_URL:', envWsUrl);
    return envWsUrl;
  }
  
  if (envApiUrl) {
    const wsUrl = envApiUrl.replace('http://', 'ws://').replace('https://', 'wss://');
    console.log('[WebSocket] Derived from EXPO_PUBLIC_API_URL:', wsUrl);
    return wsUrl;
  }
  
  console.log('[WebSocket] Using default localhost');
  return 'ws://localhost:8080';
};

const websocketConfig: WebSocketConfig = {
  url: getWsUrl(),
  connectionTimeout: 10000,
  heartbeatInterval: 30000,
  reconnectBackoff: 1.5,
  maxReconnectAttempts: 5,
};

class WebSocketService {
  private ws: WebSocket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isReconnecting = false;
  private messageQueue: any[] = [];
  private eventListeners = new Map<string, Function[]>();
  currentUserId: number | null = null;

  constructor() {
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.send = this.send.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    this.startHeartbeat = this.startHeartbeat.bind(this);
    this.stopHeartbeat = this.stopHeartbeat.bind(this);
  }

  async connect(): Promise<void> {
    if (this.isConnected) {
      console.log('[WebSocket] Already connected');
      return Promise.resolve();
    }
    
    if (this.isReconnecting) {
      console.log('[WebSocket] Already reconnecting');
      return Promise.resolve();
    }

    try {
      console.log('[WebSocket] Starting connection...');
      const token = await authAPI.getAuthToken();
      
      if (!token) {
        console.log('[WebSocket] No token available, skipping connection');
        throw new Error('No authenticated user');
      }

      // Try to get user data from storage first
      let currentUser = await authAPI.getUserData();
      
      // If no user data in storage, fetch from server
      if (!currentUser) {
        console.log('[WebSocket] No user data in storage, fetching from server...');
        try {
          currentUser = await userAPI.whoAmI();
          if (currentUser) {
            // Save for next time
            await authAPI.saveAuthData(token, currentUser);
            console.log('[WebSocket] User data fetched and saved:', currentUser.id);
          }
        } catch (error) {
          console.error('[WebSocket] Error fetching user data:', error);
        }
      }

      if (!currentUser) {
        console.log('[WebSocket] Could not get user data, skipping connection');
        throw new Error('No authenticated user');
      }

      this.currentUserId = currentUser.id;
      const fullWsUrl = `${websocketConfig.url}?token=${token}&userId=${currentUser.id}`;
      console.log('[WebSocket] Connecting to:', websocketConfig.url, 'userId:', currentUser.id);

      return new Promise((resolve, reject) => {
        try {
          this.ws = new WebSocket(fullWsUrl);

          const timeout = setTimeout(() => {
            console.log('[WebSocket] Connection timeout');
            if (this.ws) {
              this.ws.close();
            }
            reject(new Error('WebSocket connection timeout'));
          }, websocketConfig.connectionTimeout);

          this.ws.onopen = () => {
            clearTimeout(timeout);
            console.log('[WebSocket] Connected successfully!');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.isReconnecting = false;
            this.startHeartbeat();
            this.processMessageQueue();
            this.emit('connected');
            resolve();
          };

          this.ws.onmessage = (event) => {
            this.handleMessage(event);
          };

          this.ws.onclose = (event) => {
            clearTimeout(timeout);
            console.log('[WebSocket] Connection closed, code:', event.code);
            this.isConnected = false;
            this.stopHeartbeat();
            this.emit('disconnected', event);
            if (!this.isReconnecting && event.code !== 1000) {
              this.scheduleReconnect();
            }
          };

          this.ws.onerror = (error) => {
            clearTimeout(timeout);
            console.error('[WebSocket] Connection error:', error);
            this.emit('error', error);
            reject(error);
          };
        } catch (error) {
          console.error('[WebSocket] Error creating WebSocket:', error);
          reject(error);
        }
      });
    } catch (error) {
      return Promise.reject(error);
    }
  }

  private handleMessage(event: any): void {
    try {
      const message = JSON.parse(event.data);
      console.log('[WebSocket] Received message type:', message.type, 'data:', JSON.stringify(message).substring(0, 200));

      switch (message.type) {
        case 'init:data':
          console.log('[WebSocket] Init data received');
          this.emit('init', message.data);
          break;
        case 'chat:new':
          console.log('[WebSocket] New chat message received:', message.data?.message?.id);
          if (message.data && message.data.message) {
            this.emit('newMessage', message.data.message);
          }
          break;
        case 'chat:sent':
          console.log('[WebSocket] Chat sent confirmation:', message.data?.message?.id);
          if (message.data && message.data.message) {
            this.emit('messageSent', message.data.message);
          }
          break;
        case 'notification:new':
          this.emit('newNotification', message.data);
          break;
        case 'notification:read:confirm':
          this.emit('notificationReadConfirm', message.data);
          break;
        case 'chat:read:update':
          this.emit('messageReadUpdate', message.data);
          break;
        case 'user:online':
          this.emit('userOnline', message.data);
          break;
        case 'user:offline':
          this.emit('userOffline', message.data);
          break;
        case 'users:list':
          this.emit('onlineUsers', message.data);
          break;
        case 'typingStart':
          this.emit('typingStart', message.payload || message.data);
          break;
        case 'typingStop':
          this.emit('typingStop', message.payload || message.data);
          break;
        case 'error':
          console.error('[WebSocket] Server error:', message);
          this.emit('serverError', message);
          break;
        case 'newMessage':
        case 'message':
          this.emit('newMessage', message.payload || message.data);
          break;
        case 'pong':
          break;
        default:
          console.log('[WebSocket] Unknown message type:', message.type);
          this.emit('message', message);
      }
    } catch (error) {
      console.error('[WebSocket] Error handling message:', error);
    }
  }

  send(message: any): boolean {
    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('[WebSocket] Sending message:', message.type, 'connected:', this.isConnected, 'readyState:', this.ws.readyState);
      this.ws.send(JSON.stringify(message));
      return true;
    } else {
      console.log('[WebSocket] Cannot send - connected:', this.isConnected, 'ws:', !!this.ws, 'readyState:', this.ws?.readyState);
      console.log('[WebSocket] Queuing message:', message.type);
      this.messageQueue.push(message);
      return false;
    }
  }

  joinConversation(conversationId: number): boolean {
    console.log('[WebSocket] Joining conversation:', conversationId);
    return this.send({
      type: 'joinConversation',
      payload: { conversationId },
    });
  }

  leaveConversation(conversationId: number): boolean {
    console.log('[WebSocket] Leaving conversation:', conversationId);
    return this.send({
      type: 'leaveConversation',
      payload: { conversationId },
    });
  }

  sendMessage(conversationId: number, content: string): boolean {
    console.log('[WebSocket] Sending chat message to conversation:', conversationId);
    return this.send({
      type: 'chat:send',
      conversationId,
      content,
    });
  }

  startTyping(conversationId: number): boolean {
    return this.send({
      type: 'startTyping',
      payload: { conversationId },
    });
  }

  stopTyping(conversationId: number): boolean {
    return this.send({
      type: 'stopTyping',
      payload: { conversationId },
    });
  }

  markNotificationAsRead(notificationId: number): boolean {
    return this.send({
      type: 'notification:read',
      notificationId,
    });
  }

  requestOnlineUsers(): boolean {
    return this.send({
      type: 'users:request',
      action: 'getOnlineUsers',
    });
  }

  setUserStatus(status: 'online' | 'away' | 'offline'): boolean {
    return this.send({
      type: 'userStatusChange',
      payload: {
        status,
        timestamp: new Date().toISOString(),
      },
    });
  }

  markMessageAsRead(messageId: number): boolean {
    return this.send({
      type: 'chat:read',
      messageId,
    });
  }

  disconnect(): void {
    this.isReconnecting = false;
    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }

    this.isConnected = false;
    this.messageQueue = [];
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts || this.isReconnecting) {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.emit('maxReconnectAttemptsReached');
      }
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;
    const delay =
      this.reconnectDelay *
      Math.pow(websocketConfig.reconnectBackoff, this.reconnectAttempts - 1);

    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        this.isReconnecting = false;
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          this.emit('maxReconnectAttemptsReached');
        } else {
          this.scheduleReconnect();
        }
      }
    }, delay);
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.send(message);
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.send({
          type: 'ping',
          payload: { timestamp: Date.now() },
        });
      }
    }, websocketConfig.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  isConnectedStatus(): boolean {
    return this.isConnected;
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      isReconnecting: this.isReconnecting,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  getReconnectStatus() {
    return {
      isReconnecting: this.isReconnecting,
      attempts: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts,
    };
  }

  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in listener:', error);
        }
      });
    }
  }

  removeAllListeners(): void {
    this.eventListeners.clear();
  }
}

export const websocketService = new WebSocketService();
export default websocketService;