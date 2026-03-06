import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Linking,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useWindowDimensions // <-- Agregamos este hook
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Importaciones de Firebase Auth
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { auth } from '../../../src/firebaseConfig.js';

// PALETA DE COLORES QRONNOS
const COLORS = {
    background: '#0f1115', 
    cardBg: '#181b21',     
    accent: '#01c38e',     
    text: '#ffffff',       
    textSec: '#8b9bb4',    
    border: '#232936'      
};

// CONSTANTES DE FUENTES
const FONTS = {
    title: 'Heavitas',
    textRegular: 'Poppins-Regular',
    textMedium: 'Poppins-Medium',
    textBold: 'Poppins-Bold'
};

export default function Register() {
    const safeareaInsets = useSafeAreaInsets();
    const router = useRouter();
    const { width } = useWindowDimensions(); // <-- Obtenemos el ancho dinámicamente

    const [nombreCompleto, setNombreCompleto] = useState("");
    const [correo, setCorreo] = useState("");
    const [contrasena, setContrasena] = useState(""); 
    const [aceptoTerminos, setAceptoTerminos] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Carga de fuentes
    const [fontsLoaded] = useFonts({
        'Heavitas': require('../../../assets/fonts/Heavitas.ttf'),
        'Poppins-Regular': require('../../../assets/fonts/Poppins-Regular.ttf'),
        'Poppins-Medium': require('../../../assets/fonts/Poppins-Medium.ttf'),
        'Poppins-Bold': require('../../../assets/fonts/Poppins-Bold.ttf'),
    });

    const handleOpenTerms = () => {
        const url = 'https://qronnos.co/terminos';
        Linking.openURL(url).catch((err) => 
            Alert.alert("Error", "No se pudo abrir la página web.")
        );
    };

    async function handleRegister() {
        if (!aceptoTerminos) {
            Alert.alert("Atención", "Debes aceptar los términos y condiciones para continuar.");
            return;
        }

        if (!nombreCompleto || !correo || !contrasena) {
            Alert.alert("Campos incompletos", "Por favor llena todos los datos.");
            return;
        }

        setIsRegistering(true);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, correo, contrasena);
            const user = userCredential.user;
            const firebase_uid = user.uid; 

            await sendEmailVerification(user);

            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/cliente/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombreCompleto: nombreCompleto,
                    correo: correo,
                    contrasena: contrasena, 
                    auth_uid: firebase_uid 
                })
            });

            const data = await response.json();

            if (response.status !== 201) {
                Alert.alert("Error de Registro", data.message || "No se pudo crear el perfil.");
            } else {
                Alert.alert(
                    "Registro Exitoso", 
                    "¡Cuenta creada! Revisa tu correo para verificar tu cuenta antes de iniciar sesión."
                );
                router.replace('/'); 
            }

        } catch (error: any) {
            let errorMessage = "Hubo un problema al registrarse.";
            if (error.code === 'auth/email-already-in-use') errorMessage = "Este correo ya está registrado.";
            else if (error.code === 'auth/weak-password') errorMessage = "La contraseña es muy débil.";
            Alert.alert("Error de Registro", errorMessage);
        } finally {
            setIsRegistering(false);
        }
    }

    if (!fontsLoaded) return null;

    // Calculamos si es una pantalla grande para aplicar padding dinámico
    const isTablet = width > 500;

    return (
        <View style={styles.fullScreenContainer}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
            
            {/* --- CONTENEDOR RESPONSIVO CENTRAL --- */}
            <View 
                style={[
                    styles.contentWrapper, 
                    { 
                        paddingTop: safeareaInsets.top + 20,
                        paddingHorizontal: isTablet ? 0 : '8%'
                    }
                ]}
            >
                {/* Botón de volver alineado al contenedor central */}
                <View style={styles.headerSpacer}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={24} color={COLORS.accent} />
                    </TouchableOpacity>
                </View>

                <View style={styles.containerLogin}>
                    <Text style={styles.welcomeText}>NUEVA EXPERIENCIA</Text>
                    <Text style={styles.Titulo}>CREAR <Text style={{color: COLORS.accent}}>CUENTA</Text></Text>
                    <Text style={styles.Subtitulo}>Únete al ecosistema tecnológico QRONNOS</Text>
                    
                    {/* Nombre Completo */}
                    <View style={styles.inputWrapper}>
                        <Text style={styles.label}>NOMBRE COMPLETO</Text>
                        <View style={styles.inputShadowContainer}>
                            <TextInput
                                placeholder="Tu nombre y apellido"
                                placeholderTextColor="rgba(255,255,255,0.2)"
                                style={styles.TextInput}
                                value={nombreCompleto}
                                onChangeText={setNombreCompleto}
                            />
                        </View>
                    </View>
                    
                    {/* Correo */}
                    <View style={styles.inputWrapper}>
                        <Text style={styles.label}>CORREO ELECTRÓNICO</Text>
                        <View style={styles.inputShadowContainer}>
                            <TextInput
                                placeholder="ejemplo@qronnos.com"
                                placeholderTextColor="rgba(255,255,255,0.2)"
                                style={styles.TextInput}
                                value={correo}
                                onChangeText={setCorreo}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>
                    </View>
                    
                    {/* Contraseña con botón de visualización */}
                    <View style={styles.inputWrapper}>
                        <Text style={styles.label}>CONTRASEÑA</Text>
                        <View style={[styles.inputShadowContainer, { flexDirection: 'row', alignItems: 'center', paddingRight: 15 }]}>
                            <TextInput
                                placeholder="********"
                                placeholderTextColor="rgba(255,255,255,0.2)"
                                secureTextEntry={!showPassword}
                                style={styles.TextInput}
                                value={contrasena}
                                onChangeText={setContrasena}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                <Ionicons 
                                    name={showPassword ? "eye-off" : "eye"} 
                                    size={22} 
                                    color={COLORS.textSec} 
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* BOTÓN TÉRMINOS Y CONDICIONES */}
                    <View style={styles.termsContainer}>
                        <TouchableOpacity 
                            style={[styles.checkbox, aceptoTerminos && styles.checkboxChecked]} 
                            onPress={() => setAceptoTerminos(!aceptoTerminos)}
                            activeOpacity={0.8}
                        >
                            {aceptoTerminos && <Ionicons name="checkmark" size={16} color="#000" />}
                        </TouchableOpacity>
                        
                        <Text style={styles.termsText}>
                            Acepto los{' '}
                            <Text style={styles.linkText} onPress={handleOpenTerms}>
                                Términos y Condiciones
                            </Text>
                        </Text>
                    </View>

                    <TouchableOpacity 
                        onPress={handleRegister} 
                        style={[
                            styles.button, 
                            (isRegistering || !aceptoTerminos) && { opacity: 0.5, elevation: 0, shadowOpacity: 0 }
                        ]}
                        disabled={isRegistering || !aceptoTerminos}
                    >
                        {isRegistering ? (
                            <ActivityIndicator color="#000" />
                        ) : (
                            <Text style={styles.textButton}>REGISTRARSE</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    fullScreenContainer: {
        backgroundColor: COLORS.background,
        flex: 1,
    },
    // --- MAGIA RESPONSIVA ---
    contentWrapper: {
        width: '100%',
        maxWidth: 450,
        alignSelf: 'center',
        flex: 1,
    },
    headerSpacer: {
        marginBottom: 20,
    },
    // ------------------------
    backButton: {
        width: 45,
        height: 45,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 14,
        backgroundColor: COLORS.cardBg,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    containerLogin: {
        width: '100%',
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
        marginBottom: 35,
    },
    inputWrapper: {
        marginBottom: 20,
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
    termsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 5,
        marginBottom: 10,
        paddingHorizontal: 5
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.cardBg,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    checkboxChecked: {
        backgroundColor: COLORS.accent,
        borderColor: COLORS.accent,
    },
    termsText: {
        color: COLORS.textSec,
        fontSize: 12,
        fontFamily: FONTS.textRegular,
        flex: 1
    },
    linkText: {
        color: COLORS.accent,
        fontFamily: FONTS.textBold,
        textDecorationLine: 'underline'
    },
    button: {
        backgroundColor: COLORS.accent,
        width: "100%",
        height: 60,
        marginTop: 20,
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
    }
});