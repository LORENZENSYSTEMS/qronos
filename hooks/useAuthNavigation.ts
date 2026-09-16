import { useRouter } from 'expo-router';

export function useAuthNavigation() {
  const router = useRouter();

  const goToDashboard = () => router.replace('/(tabs)/dashboard');
  const goToLogin = () => router.replace('/');

  return { goToDashboard, goToLogin };
}