import { CommonActions } from '@react-navigation/native';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Close() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation();
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

      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'index' }],
        })
      );
    }

    CloseSession();
  });

  return (
    <View style={{ flex: 1, paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: normalize(16), fontWeight: '500' }}>Cerrando...</Text>
    </View>
  );
}