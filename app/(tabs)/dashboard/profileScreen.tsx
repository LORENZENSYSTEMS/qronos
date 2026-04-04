import { Ionicons } from '@expo/vector-icons';
import { CommonActions } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { useFocusEffect, useNavigation } from "expo-router";
import * as SecureStore from 'expo-secure-store';
import { deleteUser } from 'firebase/auth';
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View
} from "react-native";
import { QrCodeSvg } from 'react-native-qr-svg';
import { auth } from '../../../src/firebaseConfig';

// --- PALETA QRONNOS ---
const COLORS = {
  background: '#0f1115',
  cardBg: '#181b21',
  accent: '#01c38e',
  text: '#ffffff',
  textSec: '#8b9bb4',
  border: '#232936',
};

// --- CONSTANTES DE FUENTES ---
const FONTS = {
  title: 'Heavitas',
  textRegular: 'Poppins-Regular',
  textMedium: 'Poppins-Medium',
  textBold: 'Poppins-Bold'
};

export default function ProfileScreen() {
  const navigation = useNavigation();
  const navigator: any = useNavigation();
  // Hook dinámico para responsividad (reacciona a rotaciones y tamaños de iPad)
  const { width } = useWindowDimensions();

  const [nombreClienteState, setNameClienteState] = useState('');
  const [qrData, setQrData] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Carga de fuentes
  const [fontsLoaded] = useFonts({
    'Heavitas': require('../../../assets/fonts/Heavitas.ttf'),
    'Poppins-Regular': require('../../../assets/fonts/Poppins-Regular.ttf'),
    'Poppins-Medium': require('../../../assets/fonts/Poppins-Medium.ttf'),
    'Poppins-Bold': require('../../../assets/fonts/Poppins-Bold.ttf'),
  });

  useFocusEffect(
    useCallback(() => {
      async function loadUserDataAndGenerateQr() {
        setIsLoading(true);
        setHasError(false);
        setQrData('');

        try {
          const secureUserId = await SecureStore.getItemAsync('user_id') || '';
          const secureNameCliente = await SecureStore.getItemAsync('nameCliente') || '';
          const jwt = await SecureStore.getItemAsync('jwt') || '';

          setNameClienteState(secureNameCliente);

          if (secureUserId && jwt) {
            await fetchQrData(secureUserId, jwt);
          } else {
            setHasError(true);
          }
        } catch (error) {
          console.error('Error:', error);
          setHasError(true);
        } finally {
          setIsLoading(false);
        }
      }

      async function fetchQrData(clientId: string, token: string) {
        try {
          const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/qr/generate`, {
            method: "POST",
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ client_id: parseInt(clientId, 10) }),
          });
          const data = await response.json();
          if (response.ok) {
            setQrData(data.qr_token || '');
          } else {
            setHasError(true);
          }
        } catch (error) {
          setHasError(true);
        }
      }

      loadUserDataAndGenerateQr();
      return () => { };
    }, [])
  );

  const handleDeleteAccount = async () => {
    Alert.alert(
      "Eliminar Cuenta",
      "¿Estás seguro de que deseas eliminar tu cuenta? Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              setIsLoading(true);
              const userId = await SecureStore.getItemAsync('user_id');
              const jwt = await SecureStore.getItemAsync('jwt');

              if (!userId) {
                Alert.alert("Error", "No se pudo encontrar el ID de usuario.");
                return;
              }

              const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/cliente/${userId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${jwt}`,
                  'Content-Type': 'application/json'
                }
              });

              if (!response.ok) {
                const errorData = await response.json();
                console.error("Error al borrar del backend:", errorData);
              }

              const user = auth.currentUser;
              if (user) {
                await deleteUser(user);
              }

              await SecureStore.deleteItemAsync('user_id');
              await SecureStore.deleteItemAsync('jwt');
              await SecureStore.deleteItemAsync('nameCliente');

              Alert.alert("Cuenta eliminada", "Tu cuenta ha sido eliminada exitosamente.");
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'index' }],
                })
              );

            } catch (error: any) {
              console.error("Error eliminando cuenta:", error);
              if (error.code === 'auth/requires-recent-login') {
                Alert.alert(
                  "Re-autenticación necesaria",
                  "Para eliminar tu cuenta, debes haber iniciado sesión recientemente. Por favor, cierra sesión e inicia sesión de nuevo antes de intentar borrar tu cuenta."
                );
              } else {
                Alert.alert("Error", "Ocurrió un error al intentar eliminar tu cuenta.");
              }
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  if (!fontsLoaded || isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  if (hasError || !qrData) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={80} color={COLORS.accent} />
        <Text style={styles.errorTitle}>SESIÓN CADUCADA</Text>
        <Text style={styles.errorSub}>No pudimos generar tu código. Por favor, intenta iniciar sesión de nuevo.</Text>
      </View>
    );
  }

  // Cálculos dinámicos para responsividad
  const isTablet = width >= 768;
  const qrFrameSize = Math.min(width * 0.45, 200); // El QR crecerá máximo hasta 200px
  const cardResponsiveStyle = {
    width: width * 0.9,
    maxWidth: 420 // Evita que en iPads la tarjeta sea obscenamente ancha
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* HEADER PROFESIONAL */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>MI PERFIL</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {/* TARJETA DE PERFIL TIPO MEMBRESÍA */}
        <View style={[styles.profileCard, cardResponsiveStyle]}>
          <View style={styles.cardHeader}>
            <Text style={styles.brandName}>QRONNOS</Text>
          </View>

          <View style={styles.userInfoSection}>
            <Text style={[styles.userName, { fontSize: isTablet ? 28 : 22 }]}>
              {nombreClienteState.toUpperCase() || 'USUARIO'}
            </Text>
            <View style={styles.badgeContainer}>
              <Text style={styles.userLabel}>CLIENTE EXCLUSIVO</Text>
            </View>
          </View>

          {/* CONTENEDOR DEL QR REFINADO */}
          <View style={styles.qrWrapper}>
            <QrCodeSvg
              value={qrData}
              frameSize={qrFrameSize}
              contentCells={5}
              backgroundColor="white"
              color="#000"
            />
          </View>

          <View style={styles.scanHintContainer}>
            <Ionicons name="scan-outline" size={18} color={COLORS.accent} />
            <Text style={styles.footerNoteCard}>Identificación Digital</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.deleteAccountButton} onPress={handleDeleteAccount}>
          <Text style={styles.deleteAccountButtonText}>Borrar Cuenta</Text>
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          Presenta este código en los comercios aliados para recibir tus beneficios.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 30
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Centrado mejorado
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: COLORS.background,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FONTS.title,
    color: COLORS.text,
    letterSpacing: 1,
    textAlign: 'center'
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 10,
    paddingHorizontal: 15,
  },
  // --- CARD DESIGN ---
  profileCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 30,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
    width: '100%', // Se sobrescribe por cardResponsiveStyle
  },
  cardHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center', // Mejorado para centrar el logo
    alignItems: 'center',
    marginBottom: 25
  },
  brandName: {
    fontFamily: FONTS.title,
    color: COLORS.accent,
    fontSize: 16, // Ligeramente más grande
    letterSpacing: 2
  },
  userInfoSection: {
    alignItems: 'center',
    marginBottom: 30,
    width: '100%',
  },
  userName: {
    fontFamily: FONTS.title,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8
  },
  badgeContainer: {
    backgroundColor: 'rgba(1, 195, 142, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(1, 195, 142, 0.2)'
  },
  userLabel: {
    fontSize: 10,
    fontFamily: FONTS.textBold,
    color: COLORS.accent,
    letterSpacing: 1,
  },
  qrWrapper: {
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 24,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 5,
  },
  scanHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 25,
  },
  footerNoteCard: {
    marginLeft: 8,
    fontSize: 11,
    color: COLORS.textSec,
    fontFamily: FONTS.textMedium,
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  // --- ACCIONES ---
  deleteAccountButton: {
    marginTop: 30,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255, 60, 60, 0.1)', // Diseño más sutil y estándar para eliminar
    borderWidth: 1,
    borderColor: 'rgba(255, 60, 60, 0.3)',
    borderRadius: 12,
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
  },
  deleteAccountButtonText: {
    color: '#ff4444',
    fontFamily: FONTS.title,
    fontSize: 12,
  },
  // --- OTROS ---
  loadingText: {
    marginTop: 15,
    fontSize: 14,
    fontFamily: FONTS.textMedium,
    color: COLORS.textSec,
  },
  errorTitle: {
    fontSize: 20,
    fontFamily: FONTS.title,
    marginTop: 20,
    color: COLORS.text
  },
  errorSub: {
    fontSize: 14,
    fontFamily: FONTS.textRegular,
    textAlign: 'center',
    color: COLORS.textSec,
    marginTop: 10,
    lineHeight: 22,
    paddingHorizontal: 20
  },
  footerNote: {
    marginTop: 25,
    fontSize: 13,
    color: COLORS.textSec,
    fontFamily: FONTS.textRegular,
    textAlign: 'center',
    paddingHorizontal: 30,
    lineHeight: 20,
    opacity: 0.6,
    maxWidth: 400
  }
});