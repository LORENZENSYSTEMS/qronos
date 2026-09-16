import { useFocusEffect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthNavigation } from '../../../hooks/useAuthNavigation';

export default function Close() {
  const insets = useSafeAreaInsets();
  const { goToLogin } = useAuthNavigation();
  const { width } = useWindowDimensions();

  // Función simple para escalar la fuente
  const scale = width / 375;
  const normalize = (size: number) => Math.round(size * scale);

  useFocusEffect(() => {
    async function CloseSession() {
      await Promise.all([
        SecureStore.deleteItemAsync('user_id'),
        SecureStore.deleteItemAsync('nameCliente'),
        SecureStore.deleteItemAsync('empresa_id'),
        SecureStore.deleteItemAsync('nameEmpresa'),
      ]);

      goToLogin();
    }

    CloseSession();
  });

  return (
    <View style={{ flex: 1, paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: normalize(16), fontWeight: '500' }}>Cerrando...</Text>
    </View>
  );
}