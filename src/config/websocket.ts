export const websocketConfig = {
  url: process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:8080',
  connectionTimeout: 30000,
  heartbeatInterval: 30000,
  reconnectBackoff: 1.5,
  maxReconnectAttempts: 5,
};