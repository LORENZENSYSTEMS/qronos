import type {
  GoogleSignin as GoogleSigninApi,
  SignInResponse,
} from '@react-native-google-signin/google-signin';

// RNGoogleSignin es un módulo nativo que no está disponible en Expo Go.
// Se importa con `require` en try/catch para que la app no crashee al cargar,
// y el login con Google quede deshabilitado hasta correr en un development/build.
let GoogleSignin: typeof GoogleSigninApi | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
} catch (e) {
  if (__DEV__) {
    console.warn(
      '[google-signin] El módulo nativo RNGoogleSignin no está disponible (¿Expo Go?). El login con Google quedará deshabilitado.',
      e
    );
  }
}

export function isGoogleSigninAvailable(): boolean {
  return GoogleSignin !== null;
}

export function configureGoogleSignin() {
  const googleSignin = GoogleSignin;
  if (!googleSignin) return;
  googleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    offlineAccess: false,
  });
}

export async function hasPlayServices(): Promise<boolean> {
  const googleSignin = GoogleSignin;
  if (!googleSignin) return false;
  return googleSignin.hasPlayServices();
}

export async function googleSignIn(): Promise<SignInResponse | null> {
  const googleSignin = GoogleSignin;
  if (!googleSignin) return null;
  return googleSignin.signIn();
}

export async function googleSignOut(): Promise<void> {
  const googleSignin = GoogleSignin;
  if (!googleSignin) return;
  await googleSignin.signOut();
}