import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform, AppState, AppStateStatus } from "react-native";
import Constants from "expo-constants";
import { router } from "expo-router";

// Configure how notifications are handled when the app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface PushNotificationData {
  title: string;
  body: string;
  data?: {
    type?: "message" | "notification" | "product" | "system";
    conversationId?: number;
    productId?: number;
    notificationId?: number;
    senderId?: number;
    senderName?: string;
    [key: string]: any;
  };
}

class PushNotificationService {
  private expoPushToken: string | null = null;
  private notificationListener: any = null;
  private responseListener: any = null;
  private appStateSubscription: any = null;
  private isInitialized = false;

  /**
   * Initialize the push notification service
   */
  async initialize(): Promise<string | null> {
    if (this.isInitialized) {
      console.log("[PushNotifications] Already initialized");
      return this.expoPushToken;
    }

    try {
      // Register for push notifications
      const token = await this.registerForPushNotifications();
      
      // Setup notification listeners
      this.setupNotificationListeners();
      
      // Setup app state listener for badge management
      this.setupAppStateListener();
      
      this.isInitialized = true;
      console.log("[PushNotifications] Initialized successfully");
      
      return token;
    } catch (error) {
      console.error("[PushNotifications] Initialization error:", error);
      return null;
    }
  }

  /**
   * Register for push notifications and get the token
   */
  private async registerForPushNotifications(): Promise<string | null> {
    let token: string | null = null;

    // Check if it's a physical device - local notifications still work on emulator
    if (!Device.isDevice) {
      console.log("[PushNotifications] Running on emulator - push tokens unavailable but local notifications will work");
      // Continue to setup permissions and channels for local notifications
    }

    // Check and request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("[PushNotifications] Permission not granted");
      return null;
    }

    // Get the token (only works on physical device)
    if (Device.isDevice) {
      try {
        const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
        
        if (projectId) {
          const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId,
          });
          token = tokenData.data;
        } else {
          // For development without EAS
          try {
            const tokenData = await Notifications.getDevicePushTokenAsync();
            token = tokenData.data;
          } catch (e) {
            console.log("[PushNotifications] Could not get device push token");
          }
        }
        
        this.expoPushToken = token;
        console.log("[PushNotifications] Token obtained:", token?.substring(0, 20) + "...");
      } catch (error) {
        console.error("[PushNotifications] Error getting token:", error);
      }
    }

    // Configure Android notification channel
    if (Platform.OS === "android") {
      await this.setupAndroidChannel();
    }

    return token;
  }

  /**
   * Setup Android notification channel
   */
  private async setupAndroidChannel(): Promise<void> {
    await Notifications.setNotificationChannelAsync("default", {
      name: "General",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF5722",
      sound: "default",
      enableVibrate: true,
      enableLights: true,
    });

    await Notifications.setNotificationChannelAsync("messages", {
      name: "Mensajes",
      description: "Notificaciones de nuevos mensajes",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF5722",
      sound: "default",
      enableVibrate: true,
      enableLights: true,
    });

    await Notifications.setNotificationChannelAsync("products", {
      name: "Productos",
      description: "Notificaciones sobre productos",
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: "default",
    });

    console.log("[PushNotifications] Android channels configured");
  }

  /**
   * Setup notification listeners
   */
  private setupNotificationListeners(): void {
    // Listener for notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log("[PushNotifications] Notification received in foreground:", notification);
      }
    );

    // Listener for when user taps on notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log("[PushNotifications] Notification tapped:", response);
        this.handleNotificationResponse(response);
      }
    );
  }

  /**
   * Handle notification tap response
   */
  private handleNotificationResponse(response: Notifications.NotificationResponse): void {
    const data = response.notification.request.content.data;
    
    if (!data) return;

    console.log("[PushNotifications] Handling tap with data:", data);

    // Navigate based on notification type
    if (data.type === "message" && data.conversationId) {
      router.push(`/chat/${data.conversationId}`);
    } else if (data.type === "product" && data.productId) {
      router.push(`/producto/${data.productId}`);
    } else if (data.type === "notification" || data.notificationId) {
      router.push("/notificaciones");
    } else {
      // Default: go to notifications screen
      router.push("/notificaciones");
    }
  }

  /**
   * Setup app state listener for badge management
   */
  private setupAppStateListener(): void {
    this.appStateSubscription = AppState.addEventListener(
      "change",
      async (nextAppState: AppStateStatus) => {
        if (nextAppState === "active") {
          // Clear badge when app becomes active
          await Notifications.setBadgeCountAsync(0);
        }
      }
    );
  }

  /**
   * Show a local push notification
   */
  async showLocalNotification(notification: PushNotificationData): Promise<string | null> {
    console.log("[PushNotifications] Attempting to show notification:", notification.title);
    try {
      const channelId = this.getChannelForType(notification.data?.type);
      console.log("[PushNotifications] Using channel:", channelId);
      
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
          sound: "default",
          badge: 1,
          ...(Platform.OS === "android" && { channelId }),
        },
        trigger: null, // null means show immediately
      });

      console.log("[PushNotifications] Local notification shown successfully:", notificationId);
      return notificationId;
    } catch (error) {
      console.error("[PushNotifications] Error showing local notification:", error);
      return null;
    }
  }

  /**
   * Show notification for new message
   */
  async showMessageNotification(
    senderName: string,
    messageContent: string,
    conversationId: number,
    senderId?: number
  ): Promise<string | null> {
    return this.showLocalNotification({
      title: `💬 ${senderName}`,
      body: messageContent.length > 100 
        ? messageContent.substring(0, 100) + "..." 
        : messageContent,
      data: {
        type: "message",
        conversationId,
        senderId,
        senderName,
      },
    });
  }

  /**
   * Show notification for new product interest
   */
  async showProductNotification(
    title: string,
    body: string,
    productId?: number
  ): Promise<string | null> {
    return this.showLocalNotification({
      title: `🛒 ${title}`,
      body,
      data: {
        type: "product",
        productId,
      },
    });
  }

  /**
   * Show general notification
   */
  async showGeneralNotification(
    title: string,
    body: string,
    notificationId?: number
  ): Promise<string | null> {
    return this.showLocalNotification({
      title: `🔔 ${title}`,
      body,
      data: {
        type: "notification",
        notificationId,
      },
    });
  }

  /**
   * Get the appropriate channel for notification type
   */
  private getChannelForType(type?: string): string {
    switch (type) {
      case "message":
        return "messages";
      case "product":
        return "products";
      default:
        return "default";
    }
  }

  /**
   * Get current push token
   */
  getToken(): string | null {
    return this.expoPushToken;
  }

  /**
   * Set badge count
   */
  async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error("[PushNotifications] Error setting badge count:", error);
    }
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications(): Promise<void> {
    try {
      await Notifications.dismissAllNotificationsAsync();
      await Notifications.setBadgeCountAsync(0);
    } catch (error) {
      console.error("[PushNotifications] Error clearing notifications:", error);
    }
  }

  /**
   * Cleanup listeners
   */
  cleanup(): void {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
      this.notificationListener = null;
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
      this.responseListener = null;
    }
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    this.isInitialized = false;
    console.log("[PushNotifications] Cleaned up");
  }
}

// Export singleton instance
const pushNotificationService = new PushNotificationService();
export default pushNotificationService;
