import { Stack } from 'expo-router';
import { useEffect, useRef } from 'react';
import type { EventSubscription } from 'expo-notifications';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';

import {
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
  configureNotificationHandler,
  registerForPushNotificationsAsync,
  savePushToken,
} from '../src/services/notifications';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
    },
  },
});

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
});

// 1. Configuración de cómo se comportan las notificaciones cuando la app está abierta
configureNotificationHandler();

export default function RootLayout() {
  const notificationListener = useRef<EventSubscription | null>(null);
  const responseListener = useRef<EventSubscription | null>(null);

  useEffect(() => {
    // 2. Registrar para obtener el Token de Expo
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        console.log("Token para tu Backend (Expo):", token);
        savePushToken(token);

        // Aquí podrías llamar a tu backend:
        // await fetch('tu-api.com/save-token', { method: 'POST', body: JSON.stringify({token}) });
      }
    });

    // 3. Escuchar cuando llega una notificación (App abierta)
    notificationListener.current = addNotificationReceivedListener(notification => {
      console.log("Notificación recibida en vivo:", notification);
    });

    // 4. Escuchar cuando el usuario toca la notificación
    responseListener.current = addNotificationResponseReceivedListener(response => {
      console.log("Usuario interactuó con la notificación:", response.notification.request.content.data);
    });

    return () => {
      if (notificationListener.current) notificationListener.current.remove();
      if (responseListener.current) responseListener.current.remove();
    };
  }, []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: asyncStoragePersister }}
    >
      <Stack>
        <Stack.Screen
          name="(tabs)"
          options={{ headerShown: false }}
        />
      </Stack>
    </PersistQueryClientProvider>
  );
}