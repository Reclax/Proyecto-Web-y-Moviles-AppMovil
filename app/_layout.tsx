import { useAuthStore } from "@/store/authStore";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { checkAuth, isAuthenticated } = useAuthStore();

  useEffect(() => {
    const initAuth = async () => {
      console.log('[RootLayout] Starting auth initialization...');
      try {
        // Add timeout to prevent infinite loading
        const authPromise = checkAuth();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth check timeout')), 10000)
        );
        
        await Promise.race([authPromise, timeoutPromise]);
        console.log('[RootLayout] Auth check completed');
      } catch (error) {
        console.error('[RootLayout] Auth initialization error:', error);
      } finally {
        await SplashScreen.hideAsync();
        console.log('[RootLayout] Splash hidden');
      }
    };

    initAuth();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="producto/[id]" />
      <Stack.Screen name="categorias" />
      <Stack.Screen name="favoritos" />
      <Stack.Screen name="mis-productos" />
      <Stack.Screen name="notificaciones" />
      <Stack.Screen name="chat/[conversationId]" />
      <Stack.Screen name="auth/login" />
      <Stack.Screen name="auth/register" />
    </Stack>
  );
}
