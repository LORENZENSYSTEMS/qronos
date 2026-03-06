import { router } from "expo-router";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useWindowDimensions // <-- Importado para hacer la pantalla verdaderamente responsiva
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

export default function ForgotPassword() {
    const safeareaInsets = useSafeAreaInsets();
    const { width, height } = useWindowDimensions(); // Obtenemos las dimensiones en tiempo real
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);

    const handlePress = async () => {
        if (!email) {
            Alert.alert("Atención", "Por favor, ingresa tu correo electrónico para continuar.");
            return;
        }

        setLoading(true);
        const auth = getAuth();

        try {
            await sendPasswordResetEmail(auth, email);
            Alert.alert(
                "Enlace Enviado", 
                "Hemos enviado las instrucciones a tu correo para restablecer tu contraseña."
            );
            setEmail("");
        } catch (error: any) {
            let message = "No se pudo procesar la solicitud.";
            if (error.code === 'auth/user-not-found') {
                message = "Este correo no se encuentra registrado.";
            }
            Alert.alert("Error", message);
        } finally {
            setLoading(false);
        }
    };

    // Calculamos si es una pantalla grande (ej. iPad) para ajustar paddings
    const isTablet = width > 500;

    return (
        <View style={[styles.fullContainer, { paddingTop: safeareaInsets.top }]}>
            <View 
                style={[
                    styles.containerLogin, 
                    { 
                        // Altura dinámica: 8% del alto de la pantalla para evitar que choque
                        marginTop: height * 0.08, 
                        // Padding responsivo: en tabletas no hace falta padding extra porque usamos maxWidth
                        paddingHorizontal: isTablet ? 0 : '8%' 
                    }
                ]}
            >
                
                {/* Cabecera */}
                <Text style={styles.welcomeText}>RECUPERACIÓN</Text>
                <Text style={styles.Titulo}>Olvidé mi clave</Text>
                <Text style={styles.Subtitulo}>
                    Introduce tu correo electrónico y te enviaremos un enlace para que recuperes el acceso a tu cuenta.
                </Text>

                {/* Input con Shadow Wrapper */}
                <View style={styles.inputWrapper}>
                    <Text style={styles.label}>CORREO ELECTRÓNICO</Text>
                    <View style={styles.inputShadowContainer}>
                        <TextInput 
                            placeholder="ejemplo@correo.com" 
                            placeholderTextColor={`${COLORS.text}60`} 
                            value={email} 
                            onChangeText={setEmail}
                            style={styles.TextInput}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>
                </View>

                {/* Botón */}
                <TouchableOpacity 
                    style={[styles.button, loading && { opacity: 0.7 }]} 
                    onPress={handlePress}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#000" />
                    ) : (
                        <Text style={styles.textButton}>ENVIAR ENLACE</Text>
                    )}
                </TouchableOpacity>

                {/* Link para volver atrás */}
                <TouchableOpacity onPress={()=> router.push('/(tabs)')} style={styles.registerLink}>
                    <Text style={styles.textRegister}>
                        ¿Recordaste tu contraseña? <Text style={styles.linkAccent}>Inicia sesión</Text>
                    </Text>
                </TouchableOpacity>

            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    fullContainer: {
        backgroundColor: COLORS.background,
        flex: 1,
    },
    containerLogin: {
        // --- MAGIA RESPONSIVA AQUÍ ---
        width: '100%',
        maxWidth: 450, // En un iPad, el contenido no pasará de 450px de ancho
        alignSelf: 'center', // Centra el contenedor en pantallas grandes
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
    },
    registerLink: {
        marginTop: 30,
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
    // Nota: Dejé footerContainer y footerText por si los vas a usar más adelante, 
    // aunque no estaban renderizados en tu código original.
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
    }
});