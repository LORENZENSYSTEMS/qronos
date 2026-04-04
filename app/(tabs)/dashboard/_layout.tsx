import { Ionicons } from '@expo/vector-icons';
import { CommonActions } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Tabs, useFocusEffect, useNavigation, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useState } from 'react';
import { Alert, Platform, useWindowDimensions } from 'react-native';

const COLORS = {
    background: '#0f1115',
    cardBg: '#181b21',
    accent: '#01c38e',
    text: '#ffffff',
    textSec: '#8b9bb4',
    border: '#232936'
};

export default function TabLayout() {
    const router = useRouter();
    const navigation = useNavigation();
    const { width, height } = useWindowDimensions();
    const [empresaState, setEmpresaState] = useState(false);
    const [adminState, setAdminState] = useState(false);

    // Función de normalización rápida (AJUSTADA)
    // Usamos Math.min para limitar la escala a 1.15x como máximo en pantallas grandes (iPad)
    const scale = Math.min(width / 375, 1.15);
    const normalize = (size: number) => Math.round(size * scale);

    const [fontsLoaded] = useFonts({
        'Heavitas': require('../../../assets/fonts/Heavitas.ttf'),
        'Poppins-Medium': require('../../../assets/fonts/Poppins-Medium.ttf'),
        'Poppins-Bold': require('../../../assets/fonts/Poppins-Bold.ttf'),
    });

    useFocusEffect(
        useCallback(() => {
            const checkAuth = async () => {
                const empresa_id = await SecureStore.getItemAsync('empresa_id');
                const admin = await SecureStore.getItemAsync('rol');
                setEmpresaState(!!empresa_id);
                setAdminState(admin === 'Admin');
            };
            checkAuth();
        }, [])
    );

    const handleLogout = () => {
        Alert.alert("Cerrar Sesión", "¿Estás seguro de que deseas salir?", [
            { text: "Cancelar", style: "cancel" },
            {
                text: "Sí, salir",
                style: "destructive",
                onPress: async () => {
                    await SecureStore.deleteItemAsync('empresa_id');
                    await SecureStore.deleteItemAsync('user_id');
                    await SecureStore.deleteItemAsync('rol');
                    navigation.dispatch(
                        CommonActions.reset({
                            index: 0,
                            routes: [{ name: 'index' }],
                        })
                    );
                }
            }
        ]);
    };

    if (!fontsLoaded) return null;

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: COLORS.accent,
                tabBarInactiveTintColor: COLORS.textSec,
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: COLORS.background,
                    borderTopColor: COLORS.border,
                    borderTopWidth: 1,
                    // Altura responsiva: base 70 + ajuste por plataforma
                    height: Platform.OS === 'ios' ? normalize(85) : normalize(70),
                    paddingBottom: Platform.OS === 'ios' ? normalize(25) : normalize(12),
                    paddingTop: normalize(10),
                    elevation: 10,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 10,
                },
                tabBarLabelStyle: {
                    fontFamily: 'Poppins-Medium',
                    fontSize: normalize(10), // Texto responsivo
                    marginTop: 2,
                },
                tabBarIconStyle: {
                    marginBottom: -2,
                }
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Inicio',
                    tabBarLabel: 'Inicio',
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? "home" : "home-outline"} size={normalize(22)} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="profileScreen"
                options={{
                    title: 'Mi Perfil',
                    tabBarLabel: 'Perfil',
                    href: empresaState ? null : undefined,
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? "person" : "person-outline"} size={normalize(22)} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="companyScreen"
                options={{
                    title: 'Mi Empresa',
                    tabBarLabel: 'Empresa',
                    href: !empresaState ? null : undefined,
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? "business" : "business-outline"} size={normalize(22)} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="qrScreen"
                options={{
                    title: 'Escáner QR',
                    tabBarLabel: 'QR',
                    href: !empresaState ? null : undefined,
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? "qr-code" : "qr-code-outline"} size={normalize(22)} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="admin"
                options={{
                    title: 'Panel Admin',
                    tabBarLabel: 'Admin',
                    href: !adminState ? null : undefined,
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? "shield-checkmark" : "shield-checkmark-outline"} size={normalize(22)} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="close"
                options={{
                    title: 'Salir',
                    tabBarLabel: 'Salir',
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="log-out-outline" size={normalize(22)} color="#ff4d4d" />
                    ),
                    tabBarLabelStyle: {
                        color: '#ff4d4d',
                        fontFamily: 'Poppins-Bold',
                        fontSize: normalize(10),
                    }
                }}
                listeners={() => ({
                    tabPress: (e) => {
                        e.preventDefault();
                        handleLogout();
                    },
                })}
            />
            <Tabs.Screen
                name="products"
                options={{
                    title: 'Productos',
                    tabBarLabel: 'Productos',
                    href: null,
                }}
            />
        </Tabs>
    );
}