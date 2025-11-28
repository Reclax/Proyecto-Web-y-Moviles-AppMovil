// Configuración WebSocket para la App Móvil
export const websocketConfig = {
  // URL del servidor WebSocket - se obtiene del .env
  url: process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:8080',
  
  // Configuraciones de conexión
  connectionTimeout: 10000,     // 10 segundos timeout para conexión
  heartbeatInterval: 30000,     // 30 segundos para heartbeat
  reconnectBackoff: 1.5,        // Factor de backoff exponencial
  maxReconnectAttempts: 5,      // Máximo intentos de reconexión
  
  // Timeouts
  typingTimeout: 3000,          // 3 segundos para indicador de "escribiendo"
  
  // Configuraciones de desarrollo
  enableDebugLogs: __DEV__,     // Logs de debug solo en desarrollo
};

// Función helper para obtener la URL del WebSocket
export const getWebSocketUrl = (): string => {
  const envWsUrl = process.env.EXPO_PUBLIC_WS_URL;
  const envApiUrl = process.env.EXPO_PUBLIC_API_URL;
  
  if (envWsUrl) {
    return envWsUrl;
  }
  
  if (envApiUrl) {
    return envApiUrl.replace('http://', 'ws://').replace('https://', 'wss://');
  }
  
  return 'ws://localhost:8080';
};

// También exportar como WEBSOCKET_CONFIG para compatibilidad
export const WEBSOCKET_CONFIG = websocketConfig;