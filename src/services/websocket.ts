import Constants from 'expo-constants';
import { authAPI } from './api';

interface WebSocketConfig {
  url: string;
  connectionTimeout: number;
  heartbeatInterval: number;
  reconnectBackoff: number;
}

const wsUrl = Constants.expoConfig?.extra?.wsUrl || 'ws://localhost:8080';
const websocketConfig: WebSocketConfig = {
  url: wsUrl.replace('http', 'ws'),
  connectionTimeout: 30000,
  heartbeatInterval: 30000,
  reconnectBackoff: 1.5,
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
    if (this.isConnected || this.isReconnecting) {
      return Promise.resolve();
    }

    try {
      const token = await authAPI.getAuthToken();
      const currentUser = await authAPI.getUserData();

      if (!token || !currentUser) {
        throw new Error('No authenticated user');
      }

      this.currentUserId = currentUser.id;
      const fullWsUrl = `${websocketConfig.url}?token=${token}&userId=${currentUser.id}`;

      return new Promise((resolve, reject) => {
        try {
          this.ws = new WebSocket(fullWsUrl);

          const timeout = setTimeout(() => {
            if (this.ws) {
              this.ws.close();
            }
            reject(new Error('WebSocket connection timeout'));
          }, websocketConfig.connectionTimeout);

          this.ws.onopen = () => {
            clearTimeout(timeout);
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
            this.isConnected = false;
            this.stopHeartbeat();
            this.emit('disconnected', event);
            if (!this.isReconnecting && event.code !== 1000) {
              this.scheduleReconnect();
            }
          };

          this.ws.onerror = (error) => {
            clearTimeout(timeout);
            this.emit('error', error);
            reject(error);
          };
        } catch (error) {
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

      switch (message.type) {
        case 'init:data':
          this.emit('init', message.data);
          break;
        case 'chat:new':
          if (message.data && message.data.message) {
            this.emit('newMessage', message.data.message);
          }
          break;
        case 'chat:sent':
          if (message.data && message.data.message) {
            this.emit('messageSent', message.data.message);
          }
          break;
        case 'notification:new':
          this.emit('newNotification', message.data);
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
        case 'pong':
          break;
        default:
          this.emit('message', message);
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  send(message: any): boolean {
    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      return true;
    } else {
      this.messageQueue.push(message);
      return false;
    }
  }

  joinConversation(conversationId: number): boolean {
    return this.send({
      type: 'joinConversation',
      payload: { conversationId },
    });
  }

  leaveConversation(conversationId: number): boolean {
    return this.send({
      type: 'leaveConversation',
      payload: { conversationId },
    });
  }

  sendMessage(conversationId: number, content: string): boolean {
    return this.send({
      type: 'chat:send',
      conversationId,
      content,
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