import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import type {
  EventSubscription,
  Notification,
  NotificationResponse,
} from 'expo-notifications';
import { Platform } from 'react-native';

const EXPO_PUSH_TOKEN_KEY = 'expoPushToken';

// expo-notifications ya no está disponible en Expo Go (SDK 53+, Android).
// Se importa con `require` en try/catch para que la app no crashee al cargar,
// y las funciones queden deshabilitadas hasta correr en un development/build.
let Notifications: typeof import('expo-notifications') | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Notifications = require('expo-notifications');
} catch (e) {
  if (__DEV__) {
    console.warn(
      '[notifications] expo-notifications no está disponible en este runtime (¿Expo Go?). Las notificaciones push quedarán deshabilitadas.',
      e
    );
  }
}

export function configureNotificationHandler() {
  const notifications = Notifications;
  if (!notifications) return;
  notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export function addNotificationReceivedListener(
  listener: (notification: Notification) => void
): EventSubscription | null {
  const notifications = Notifications;
  if (!notifications) return null;
  return notifications.addNotificationReceivedListener(listener);
}

export function addNotificationResponseReceivedListener(
  listener: (response: NotificationResponse) => void
): EventSubscription | null {
  const notifications = Notifications;
  if (!notifications) return null;
  return notifications.addNotificationResponseReceivedListener(listener);
}

export async function savePushToken(token: string) {
  await SecureStore.setItemAsync(EXPO_PUSH_TOKEN_KEY, token);
}

export async function getPushToken(): Promise<string | null> {
  const token = await registerForPushNotificationsAsync();
  return token ?? null;
}

export async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  const notifications = Notifications;
  if (!notifications) return undefined;

  let token;

  if (Platform.OS === 'android') {
    await notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (!Device.isDevice) {
    alert('Las notificaciones Push requieren un dispositivo físico (no funciona en emulador)');
    return undefined;
  }

  const { status: existingStatus } = await notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await notifications.requestPermissionsAsync();
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
    token = (await notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch (e) {
    console.error("Error obteniendo el token de Expo:", e);
  }

  return token;
}