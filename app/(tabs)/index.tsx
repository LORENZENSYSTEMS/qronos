import { AntDesign, Ionicons } from '@expo/vector-icons'; // Importado para el icono del ojito
import { Camera } from 'expo-camera';
import { useFonts } from 'expo-font';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from "expo-router";
import * as SecureStore from 'expo-secure-store';
import { reload, signInWithEmailAndPassword } from 'firebase/auth';
import { useEffect, useRef, useState } from 'react';
import { useAppleAuth } from '../../hooks/useAppleAuth';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
    useWindowDimensions
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth } from '../../src/firebaseConfig';
import { getPushToken } from '../../src/services/notifications';
import {
  googleSignIn,
  googleSignOut,
  hasPlayServices,
  isGoogleSigninAvailable,
} from '../../src/services/googleSignin';
import '../../src/googleSignin';
import { useAuthNavigation } from '../../hooks/useAuthNavigation';

// --- PALETA QRONNOS ---
const COLORS = {
    background: '#0f1115',
    cardBg: '#181b21',
    accent: '#01c38e',
    text: '#ffffff',
    textSec: '#8b9bb4',
    border: '#232936'
};

// --- CONSTANTES DE FUENTES ---
const FONTS = {
    title: 'Heavitas',
    textRegular: 'Poppins-Regular',
    textMedium: 'Poppins-Medium',
    textBold: 'Poppins-Bold'
};

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const LOGIN_CLIENTE_URL = `${API_URL}/api/cliente/login`;
const LOGIN_GOOGLE_URL = `${API_URL}/api/cliente/login-google`;
const LOGIN_APPLE_URL = `${API_URL}/api/cliente/login-apple`;

export default function HomeScreen() {
    const safeareaInsets = useSafeAreaInsets();
    const router = useRouter();
    const { goToDashboard } = useAuthNavigation();
    const { width, height } = useWindowDimensions();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false); // Estado para mostrar/ocultar contraseña
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [isAppleLoading, setIsAppleLoading] = useState(false);

    const { isAvailable: isAppleAvailable, signIn: appleSignIn } = useAppleAuth();

    // --- ESTADOS DE ANIMACIÓN ---
    const [splashVisible, setSplashVisible] = useState(true);
    const splashOpacity = useRef(new Animated.Value(1)).current;
    const logoScale = useRef(new Animated.Value(0.8)).current;
    const loginOpacity = useRef(new Animated.Value(0)).current;

    // CARGA DE FUENTES
    const [fontsLoaded] = useFonts({
        'Heavitas': require('../../assets/fonts/Heavitas.ttf'),
        'Poppins-Regular': require('../../assets/fonts/Poppins-Regular.ttf'),
        'Poppins-Medium': require('../../assets/fonts/Poppins-Medium.ttf'),
        'Poppins-Bold': require('../../assets/fonts/Poppins-Bold.ttf'),
    });

    // --- FUNCIONES DE PERMISOS ---
    const checkCameraPermission = async () => {
        const cameraStatus = await Camera.getCameraPermissionsAsync();
        if (cameraStatus.status !== 'granted') {
            Alert.alert(
                "Acceso a la Cámara",
                "Será utilizada solo si inicias sesión con un perfil tipo empresa para que puedas escanear los códigos QR de los clientes que lleguen a tu tienda/empresa.",
                [
                    { text: "Ahora no", style: "cancel" },
                    // CORRECCIÓN: Se cambia "Permitir" por "Continuar"
                    {
                        text: "Continuar", onPress: async () => {
                            await Camera.requestCameraPermissionsAsync();
                        }
                    }
                ]
            );
        }
    };

    const requestPermissions = async () => {
        const galleryStatus = await ImagePicker.getMediaLibraryPermissionsAsync();

        if (galleryStatus.status !== 'granted') {
            Alert.alert(
                "Acceso a la Galería",
                "Será utilizado si inicias con un perfil tipo empresa para que puedas subir las imágenes de tu tienda/empresa.",
                [
                    { text: "Ahora no", style: "cancel", onPress: () => checkCameraPermission() },
                    // CORRECCIÓN: Se cambia "Permitir" por "Continuar"
                    {
                        text: "Continuar", onPress: async () => {
                            await ImagePicker.requestMediaLibraryPermissionsAsync();
                            checkCameraPermission();
                        }
                    }
                ]
            );
        } else {
            checkCameraPermission();
        }
    };
    // --- EFECTO DE ANIMACIÓN DE ENTRADA ---
    useEffect(() => {
        if (fontsLoaded) {
            Animated.sequence([
                Animated.parallel([
                    Animated.timing(splashOpacity, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.spring(logoScale, {
                        toValue: 1,
                        friction: 6,
                        tension: 40,
                        useNativeDriver: true,
                    })
                ]),
                Animated.delay(1500),
                Animated.parallel([
                    Animated.timing(splashOpacity, {
                        toValue: 0,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(logoScale, {
                        toValue: 1.5,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(loginOpacity, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    })
                ])
            ]).start(() => {
                setSplashVisible(false);
                requestPermissions();
            });
        }
    }, [fontsLoaded]);

    useEffect(() => {
        async function checkUserIdAndRedirect() {
            try {
                const userId = await SecureStore.getItemAsync('user_id');
                const empresaId = await SecureStore.getItemAsync('empresa_id');

                if (userId || empresaId) {
                    goToDashboard();
                }
            } catch (error) {
                console.error('Error al acceder a SecureStore:', error);
            }
        }
        checkUserIdAndRedirect();
    }, []);

    async function handleLogin() {
        if (!email || !password) {
            Alert.alert("Campos vacíos", "Por favor ingresa tus credenciales.");
            return;
        }

        setIsLoggingIn(true);
        try {
            let expoToken = null;
            expoToken = await getPushToken();

            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            await reload(user);

            if (!user.emailVerified) {
                Alert.alert("Verificación Requerida", "Tu correo aún no está verificado.");
                setIsLoggingIn(false);
                return;
            }

            console.log(expoToken)
            const response = await fetch(LOGIN_CLIENTE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email.trim(),
                    password: password,
                    pushToken: expoToken
                }),
            });

            const data = await response.json();

            if (response.ok && data.code === 200) {
                const { token, token_empresa, jwt, rol, cliente, empresa } = data;

                if (jwt) await SecureStore.setItemAsync('jwt', String(jwt));
                console.log("JWT guardado con exito");
                if (rol) await SecureStore.setItemAsync('rol', String(rol));

                if (token) {
                    await SecureStore.setItemAsync('user_id', String(token));
                    await SecureStore.setItemAsync('nameCliente', String(cliente));
                }

                if (token_empresa) {
                    await SecureStore.setItemAsync('empresa_id', String(token_empresa));
                    await SecureStore.setItemAsync('nameEmpresa', String(empresa));
                }

                goToDashboard();

            } else {
                Alert.alert("Error", data.message || "Credenciales incorrectas.");
            }

        } catch (error: any) {
            Alert.alert("Error de Acceso", "Correo o contraseña incorrecta.");
        } finally {
            setIsLoggingIn(false);
        }
    }

    async function handleGoogleLogin() {
        setIsGoogleLoading(true);
        try {
            if (!isGoogleSigninAvailable()) {
                Alert.alert("No disponible", "Iniciar sesión con Google requiere un development build.");
                return;
            }

            let expoToken = null;
            expoToken = await getPushToken();

            await hasPlayServices();

            try {
                await googleSignOut();
            } catch (e) {
                console.log("Sin sesión previa de Google:", e);
            }

            const userInfo = await googleSignIn();

            if (!userInfo || userInfo.type === 'cancelled') {
                console.log("Inicio de sesión con Google cancelado.");
                return;
            }

            const idToken = userInfo.data.idToken;

            if (!idToken) {
                Alert.alert("Error", "No fue posible obtener el token de Google.");
                return;
            }

            console.log(expoToken)
            const response = await fetch(LOGIN_GOOGLE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    idToken: idToken,
                    pushToken: expoToken
                }),
            });

            const data = await response.json();

            if (response.ok && data.code === 200) {
                const { token, token_empresa, jwt, rol, cliente, empresa } = data;

                if (jwt) await SecureStore.setItemAsync('jwt', String(jwt));
                if (rol) await SecureStore.setItemAsync('rol', String(rol));

                if (token) {
                    await SecureStore.setItemAsync('user_id', String(token));
                    if (cliente) await SecureStore.setItemAsync('nameCliente', String(cliente));
                }

                if (token_empresa) {
                    await SecureStore.setItemAsync('empresa_id', String(token_empresa));
                    if (empresa) await SecureStore.setItemAsync('nameEmpresa', String(empresa));
                }

                goToDashboard();
            } else {
                Alert.alert("Error", data.message || "No se pudo iniciar sesión con Google.");
            }

        } catch (error: any) {
            if (error?.message && String(error.message).toLowerCase().includes('cancel')) {
                console.log("Inicio de sesión con Google cancelado:", error?.message);
            } else {
                Alert.alert(
                    "Error de Acceso",
                    "No se pudo iniciar sesión con Google. Intenta de nuevo."
                );
            }
        } finally {
            setIsGoogleLoading(false);
        }
    }

    async function handleAppleLogin() {
        if (!isAppleAvailable) {
            Alert.alert("No disponible", "Iniciar sesión con Apple solo está disponible en dispositivos iOS.");
            return;
        }

        setIsAppleLoading(true);
        try {
            let expoToken = null;
            expoToken = await getPushToken();

            const result = await appleSignIn();

            if (!result) {
                console.log("Inicio de sesión con Apple cancelado o sin token.");
                return;
            }

            if (!result.identityToken) {
                Alert.alert("Error", "No fue posible obtener el token de Apple.");
                return;
            }

            if (!result.authorizationCode) {
                Alert.alert("Error", "No fue posible obtener el código de autorización de Apple.");
                return;
            }

            console.log(expoToken)
            const response = await fetch(LOGIN_APPLE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    identityToken: result.identityToken,
                    authorizationCode: result.authorizationCode,
                    nonce: result.nonce,
                    name: result.fullName || undefined,
                    pushToken: expoToken
                }),
            });

            const data = await response.json();

            if (response.ok && data.code === 200) {
                const { token, token_empresa, jwt, rol, cliente, empresa } = data;

                if (jwt) await SecureStore.setItemAsync('jwt', String(jwt));
                if (rol) await SecureStore.setItemAsync('rol', String(rol));

                if (token) {
                    await SecureStore.setItemAsync('user_id', String(token));
                    if (cliente) await SecureStore.setItemAsync('nameCliente', String(cliente));
                }

                if (token_empresa) {
                    await SecureStore.setItemAsync('empresa_id', String(token_empresa));
                    if (empresa) await SecureStore.setItemAsync('nameEmpresa', String(empresa));
                }

                goToDashboard();
            } else {
                Alert.alert("Error", data.message || "No se pudo iniciar sesión con Apple.");
            }

        } catch (error: any) {
            if (error?.message && String(error.message).toLowerCase().includes('cancel')) {
                console.log("Inicio de sesión con Apple cancelado:", error?.message);
            } else {
                Alert.alert(
                    "Error de Acceso",
                    "No se pudo iniciar sesión con Apple. Intenta de nuevo."
                );
            }
        } finally {
            setIsAppleLoading(false);
        }
    }

    if (!fontsLoaded) {
        return (
            <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center' }}>
                <ActivityIndicator color={COLORS.accent} />
            </View>
        );
    }

    const isTablet = width > 500;

    return (
        <KeyboardAvoidingView
            style={styles.fullContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.fullContainer}>
                    <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

                    {/* --- CONTENIDO DEL LOGIN --- */}
                    <Animated.View style={[styles.loginContentWrapper, { opacity: loginOpacity }]}>
                        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
                            <View
                                style={[
                                    styles.containerLogin,
                                    {
                                        paddingTop: safeareaInsets.top + height * 0.08,
                                        paddingHorizontal: isTablet ? 0 : '8%',
                                        paddingBottom: height * 0.1
                                    }
                                ]}
                            >
                                <Text style={styles.welcomeText}>BIENVENIDO A</Text>
                                <Text style={styles.Titulo}>INICIAR <Text style={{ color: COLORS.accent }}>SESIÓN</Text></Text>
                                <Text style={styles.Subtitulo}>Accede a tu ecosistema de beneficios</Text>

                                <View style={styles.inputWrapper}>
                                    <Text style={styles.label}>CORREO ELECTRÓNICO</Text>
                                    <View style={styles.inputShadowContainer}>
                                        <TextInput
                                            placeholder="ejemplo@qronnos.com"
                                            placeholderTextColor="rgba(255,255,255,0.2)"
                                            style={styles.TextInput}
                                            value={email}
                                            onChangeText={setEmail}
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                        />
                                    </View>
                                </View>

                                <View style={styles.inputWrapper}>
                                    <Text style={styles.label}>CONTRASEÑA</Text>
                                    <View style={[styles.inputShadowContainer, { flexDirection: 'row', alignItems: 'center' }]}>
                                        <TextInput
                                            placeholder="********"
                                            placeholderTextColor="rgba(255,255,255,0.2)"
                                            style={styles.TextInput}
                                            value={password}
                                            onChangeText={setPassword}
                                            secureTextEntry={!showPassword}
                                        />
                                        <TouchableOpacity 
                                            onPress={() => setShowPassword(!showPassword)}
                                            style={{ paddingRight: 20 }}
                                        >
                                            <Ionicons 
                                                name={showPassword ? "eye-off-outline" : "eye-outline"} 
                                                size={22} 
                                                color={COLORS.textSec} 
                                            />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <TouchableOpacity onPress={() => router.push('/(tabs)/guest')} style={styles.registerLink}>
                                    <Text style={styles.linkAccent}>Ver Como invitado</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => router.push('/(tabs)/account/register')} style={styles.registerLink}>
                                    <Text style={styles.textRegister}>
                                        ¿No tienes cuenta? <Text style={styles.linkAccent}>Regístrate aquí</Text>
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => router.push('/(tabs)/account/forgotpassword')} style={styles.registerLink}>
                                    <Text style={styles.textRegister}>
                                        <Text style={styles.linkAccent}>¿Olvidaste tu contraseña?</Text>
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={handleLogin}
                                    style={[styles.button, (isLoggingIn || isGoogleLoading || isAppleLoading) && { opacity: 0.7 }]}
                                    disabled={isLoggingIn || isGoogleLoading || isAppleLoading}
                                >
                                    {isLoggingIn ? (
                                        <ActivityIndicator color="#000" />
                                    ) : (
                                        <Text style={styles.textButton}>INGRESAR</Text>
                                    )}
                                </TouchableOpacity>

                                <View style={styles.dividerRow}>
                                    <View style={styles.dividerLine} />
                                    <Text style={styles.dividerText}>o</Text>
                                    <View style={styles.dividerLine} />
                                </View>

                                <TouchableOpacity
                                    onPress={handleGoogleLogin}
                                    style={[styles.googleButton, (isLoggingIn || isGoogleLoading || isAppleLoading) && { opacity: 0.7 }]}
                                    disabled={isLoggingIn || isGoogleLoading || isAppleLoading}
                                >
                                    {isGoogleLoading ? (
                                        <ActivityIndicator color="#000" />
                                    ) : (
                                        <>
                                            <Text style={styles.googleIcon}>G</Text>
                                            <Text style={styles.googleButtonText}>Continuar con Google</Text>
                                        </>
                                    )}
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={handleAppleLogin}
                                    style={[styles.appleButton, (isLoggingIn || isGoogleLoading || isAppleLoading || !isAppleAvailable) && { opacity: isAppleAvailable ? 0.7 : 0.35 }]}
                                    disabled={isLoggingIn || isGoogleLoading || isAppleLoading || !isAppleAvailable}
                                >
                                    {isAppleLoading ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <>
                                            <AntDesign name="apple" size={22} color="#fff" />
                                            <Text style={styles.appleButtonText}>Continuar con Apple</Text>
                                        </>
                                    )}
                                </TouchableOpacity>

                            </View>
                        </ScrollView>
                    </Animated.View>

                    {/* --- CAPA DE ANIMACIÓN SPLASH --- */}
                    {splashVisible && (
                        <Animated.View
                            pointerEvents="none"
                            style={[
                                styles.splashContainer,
                                { opacity: splashOpacity }
                            ]}
                        >
                            <Animated.Image
                                source={require('../../assets/images/animacionInicio.png')}
                                style={[
                                    { width: width * 0.6, height: width * 0.6 },
                                    { transform: [{ scale: logoScale }] }
                                ]}
                                resizeMode="contain"
                            />
                        </Animated.View>
                    )}
                </View>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    fullContainer: {
        backgroundColor: COLORS.background,
        flex: 1,
    },
    loginContentWrapper: {
        flex: 1,
    },
    splashContainer: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    },
    containerLogin: {
        width: '100%',
        maxWidth: 450,
        alignSelf: 'center',
    },
    welcomeText: {
        fontFamily: FONTS.textBold,
        fontSize: 12,
        color: COLORS.accent,
        textAlign: 'center',
        letterSpacing: 4,
        marginBottom: 5
    },
    Titulo: {
        fontSize: 28,
        fontFamily: FONTS.title,
        color: COLORS.text,
        textAlign: 'center',
    },
    Subtitulo: {
        fontSize: 14,
        fontFamily: FONTS.textRegular,
        color: COLORS.textSec,
        textAlign: 'center',
        marginTop: 10,
        marginBottom: 50,
    },
    inputWrapper: {
        marginBottom: 25,
    },
    label: {
        color: COLORS.text,
        fontSize: 10,
        fontFamily: FONTS.textBold,
        marginBottom: 10,
        marginLeft: 5,
        letterSpacing: 1.5,
        opacity: 0.6
    },
    inputShadowContainer: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 16,
        width: "100%",
        height: 60,
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    TextInput: {
        flex: 1,
        paddingHorizontal: 20,
        fontSize: 15,
        fontFamily: FONTS.textMedium,
        color: COLORS.text,
    },
    registerLink: {
        marginTop: 10,
        alignSelf: 'center'
    },
    textRegister: {
        color: COLORS.textSec,
        fontFamily: FONTS.textRegular,
        fontSize: 13,
    },
    linkAccent: {
        fontFamily: FONTS.textBold,
        color: COLORS.accent,
    },
    button: {
        backgroundColor: COLORS.accent,
        width: "100%",
        height: 60,
        marginTop: 40,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: COLORS.accent,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    textButton: {
        color: "#000",
        fontSize: 15,
        fontFamily: FONTS.title,
    },
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 10,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: COLORS.border,
    },
    dividerText: {
        color: COLORS.textSec,
        fontFamily: FONTS.textRegular,
        fontSize: 13,
        marginHorizontal: 12,
    },
    googleButton: {
        backgroundColor: '#ffffff',
        width: "100%",
        height: 60,
        borderRadius: 18,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    googleButtonText: {
        color: "#000",
        fontSize: 15,
        fontFamily: FONTS.textMedium,
        marginLeft: 10,
    },
    googleIcon: {
        color: "#4285F4",
        fontSize: 18,
        fontFamily: FONTS.textBold,
        width: 24,
        height: 24,
        textAlign: 'center',
        lineHeight: 24,
        borderWidth: 1,
        borderColor: "#4285F4",
        borderRadius: 12,
        overflow: 'hidden',
    },
    appleButton: {
        backgroundColor: '#000000',
        width: "100%",
        height: 60,
        marginTop: 12,
        borderRadius: 18,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    appleButtonText: {
        color: "#fff",
        fontSize: 15,
        fontFamily: FONTS.textMedium,
        marginLeft: 10,
    },
    footerContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    footerText: {
        fontSize: 34,
        fontFamily: FONTS.title,
        color: COLORS.accent,
        letterSpacing: 15,
        textShadowColor: COLORS.accent,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 15,
        elevation: 10,
    }
});