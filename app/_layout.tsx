import * as Device from 'expo-device';
import { EventSubscription } from 'expo-modules-core';
import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';

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
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});


export default function RootLayout() {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>('');
  const notificationListener = useRef<EventSubscription | null>(null);
  const responseListener = useRef<EventSubscription | null>(null);

  useEffect(() => {

    async function fetchAndStoreToken(token: string) {
      await SecureStore.setItemAsync('expoPushToken', token);
    }
    // 2. Registrar para obtener el Token de Expo
    registerForPushNotificationsAsync().then(token => {
      setExpoPushToken(token);
      if (token) {
        console.log("Token para tu Backend (Expo):", token);
        fetchAndStoreToken(token);


        // Aquí podrías llamar a tu backend: 
        // await fetch('tu-api.com/save-token', { method: 'POST', body: JSON.stringify({token}) });
      }
    });

    // 3. Escuchar cuando llega una notificación (App abierta)
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log("Notificación recibida en vivo:", notification);
    });

    // 4. Escuchar cuando el usuario toca la notificación
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
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

async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      alert('¡Permiso de notificaciones denegado!');
      return undefined;
    }

    const projectId = process.env.EXPO_PUBLIC_EXPO_PROJECT_ID;

    if (!projectId) {
      console.error("Error: No se encontró el Project ID en app.json. Asegúrate de tener configurado EAS.");
      return undefined;
    }

    try {
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    } catch (e) {
      console.error("Error obteniendo el token de Expo:", e);
    }

  } else {
    alert('Las notificaciones Push requieren un dispositivo físico (no funciona en emulador)');
  }

  return token;
}