import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from "expo-router";
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useWindowDimensions
} from "react-native";

// --- PALETA QRONNOS ---
const COLORS = {
    background: '#0f1115',
    cardBg: '#181b21',
    accent: '#01c38e',
    text: '#ffffff',
    textSec: '#8b9bb4',
    border: '#232936',
    activeChip: '#01c38e',
    inactiveChip: '#232936'
};

// --- CONSTANTES ---
const FONTS = {
    title: 'Heavitas',
    textRegular: 'Poppins-Regular',
    textMedium: 'Poppins-Medium',
    textBold: 'Poppins-Bold'
};

// --- CATEGORÍAS PERMITIDAS ---
const VALID_CATEGORIES = ["Restaurantes", "Bar", "Tiendas"];

// --- HOOK DE AUTORIZACIÓN ---
const useEmpresaCheck = () => {
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [empresaId, setEmpresaId] = useState<string | null>(null);

    useEffect(() => {
        const checkAccess = async () => {
            try {
                const eId = await SecureStore.getItemAsync('empresa_id');
                const uId = await SecureStore.getItemAsync('user_id');

                if (eId) {
                    setIsAuthorized(true);
                    setEmpresaId(eId);
                }
                else if (!eId && uId) {
                    setIsAuthorized(false);
                    setErrorMessage("Tu cuenta no es de Empresa. Acceso no autorizado.");
                }
                else {
                    setIsAuthorized(false);
                    setErrorMessage("No se encontró información de acceso. Inicia sesión nuevamente.");
                }

            } catch (error) {
                console.error("Error leyendo datos de SecureStore:", error);
                setIsAuthorized(false);
                setErrorMessage("Error al validar credenciales.");
            } finally {
                setIsLoading(false);
            }
        };

        checkAccess();
    }, []);

    return { isAuthorized, isLoading, errorMessage, empresaId };
};

export default function CompanyScreen() {
    const navigator = useNavigation();
    const { isAuthorized, isLoading, errorMessage, empresaId } = useEmpresaCheck();

    // Detección de dimensiones para responsividad
    const { width } = useWindowDimensions();
    const isTablet = width >= 768; // Detecta iPad o tablets grandes
    const isSmallScreen = width < 380; // Detecta iPhone SE o Androids pequeños

    const [totalScans, setTotalScans] = useState<number | null>(null);
    const [totalPoints, setTotalPoints] = useState<number | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // --- ESTADO DEL FORMULARIO ---
    const [formData, setFormData] = useState({
        descripcion: '',
        ubicacionMaps: '',
        descuento: '',
        pais: '',
        ciudad: '',
        categoria: 'Restaurantes', // Valor por defecto válido
        fotoPerfil: null as string | null,
        fotoDescripcion1: null as string | null,
        fotoDescripcion2: null as string | null,
        fotoDescripcion3: null as string | null
    });

    const [fontsLoaded] = useFonts({
        'Heavitas': require('../../../assets/fonts/Heavitas.ttf'),
        'Poppins-Regular': require('../../../assets/fonts/Poppins-Regular.ttf'),
        'Poppins-Medium': require('../../../assets/fonts/Poppins-Medium.ttf'),
        'Poppins-Bold': require('../../../assets/fonts/Poppins-Bold.ttf'),
    });

    // =========================================================================
    // LÓGICA DE API (USANDO EXPO_PUBLIC_API_URL)
    // =========================================================================

    // 1. OBTENER DATOS (GET)
    const getEmpresaData = async (id: string) => {
        try {
            const API_URL = process.env.EXPO_PUBLIC_API_URL;

            // A. Obtener Métricas
            const responseMetricas = await fetch(`${API_URL}/api/metricas/empresa/${id}`);
            const metricas = await responseMetricas.json();

            if (Array.isArray(metricas)) {
                const scans = metricas.reduce((acc: number, m: any) => acc + (Number(m.vecesScan) || 0), 0);
                setTotalScans(scans);
                const points = metricas.reduce((acc: number, m: any) => acc + (Number(m.puntos) || 0), 0);
                setTotalPoints(points);
            } else {
                setTotalScans(0);
                setTotalPoints(0);
            }

            // B. Obtener Perfil
            const responseEmpresa = await fetch(`${API_URL}/api/empresa/${id}`);
            if (responseEmpresa.ok) {
                const data = await responseEmpresa.json();

                // Validar categoría entrante
                const catFromBd = data.categoria;
                const finalCat = VALID_CATEGORIES.includes(catFromBd) ? catFromBd : VALID_CATEGORIES[0];

                setFormData({
                    descripcion: data.descripcion || '',
                    ubicacionMaps: data.ubicacionMaps || '',
                    descuento: data.descuento || '',
                    pais: data.pais || '',
                    ciudad: data.ciudad || '',
                    categoria: finalCat,
                    fotoPerfil: data.fotoPerfil || null,
                    fotoDescripcion1: data.fotoDescripcion1 || null,
                    fotoDescripcion2: data.fotoDescripcion2 || null,
                    fotoDescripcion3: data.fotoDescripcion3 || null,
                });
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            Alert.alert("Error", "No se pudieron cargar los datos. Verifica tu conexión.");
        }
    };

    // 2. ACTUALIZAR DATOS (PUT)
    const updateEmpresaData = async () => {
        if (!empresaId) return;
        setIsSaving(true);

        try {
            const API_URL = process.env.EXPO_PUBLIC_API_URL;
            const data = new FormData();

            data.append('descripcion', formData.descripcion);
            data.append('ubicacionMaps', formData.ubicacionMaps);
            data.append('descuento', formData.descuento);
            data.append('pais', formData.pais);
            data.append('ciudad', formData.ciudad);
            data.append('categoria', formData.categoria);

            const appendImage = (key: string, uri: string | null) => {
                if (!uri) return;
                if (uri.startsWith('http') || uri.startsWith('https')) return;

                const filename = uri.split('/').pop();
                const match = /\.(\w+)$/.exec(filename || '');
                const type = match ? `image/${match[1]}` : `image`;

                // @ts-ignore
                data.append(key, { uri: uri, name: filename, type });
            };

            appendImage('fotoPerfil', formData.fotoPerfil);
            appendImage('fotoDescripcion1', formData.fotoDescripcion1);
            appendImage('fotoDescripcion2', formData.fotoDescripcion2);
            appendImage('fotoDescripcion3', formData.fotoDescripcion3);

            const response = await fetch(`${API_URL}/api/empresa/${empresaId}`, {
                method: 'PUT',
                headers: {
                    'Accept': 'application/json'
                },
                body: data
            });

            if (response.ok) {
                Alert.alert("Éxito", "Tu perfil se ha actualizado y la información se mostrará en el Index.");
            } else {
                const errText = await response.text();
                console.error("Server Error:", errText);
                Alert.alert("Error", "No se pudo actualizar el perfil.");
            }
        } catch (error) {
            console.error("Network Error:", error);
            Alert.alert("Error", "Error de conexión con el servidor.");
        } finally {
            setIsSaving(false);
        }
    };

    // --- EFECTOS ---
    useEffect(() => {
        if (isAuthorized && empresaId) {
            getEmpresaData(empresaId);
        }
    }, [isAuthorized, empresaId]);

    // --- PICKER DE IMAGEN ---
    const pickImage = async (field: keyof typeof formData) => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permiso requerido', 'Se necesita acceso a la galería.');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: field === 'fotoPerfil' ? [1, 1] : [4, 3],
            quality: 0.7,
        });

        if (!result.canceled) {
            setFormData(prev => ({ ...prev, [field]: result.assets[0].uri }));
        }
    };

    if (!fontsLoaded || isLoading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={COLORS.accent} />
            </View>
        );
    }

    if (!isAuthorized) {
        return (
            <View style={styles.centerContainer}>
                <Ionicons name="lock-closed-outline" size={60} color={COLORS.accent} style={{ marginBottom: 20 }} />
                <Text style={styles.textBase}>ACCESO DENEGADO</Text>
                <Text style={styles.subText}>{errorMessage}</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <ScrollView 
                    style={styles.scrollViewStyle} 
                    contentContainerStyle={[
                        styles.companyContainer,
                        // Limita el ancho en tablets y lo centra para que no se vea estirado
                        isTablet && { maxWidth: 800, alignSelf: 'center', width: '100%' }
                    ]}
                >
                    <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

                    {/* HEADER */}
                    <View style={styles.headerRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.welcomeText}>ESTADÍSTICAS</Text>
                            <Text style={styles.header}>
                                PANEL DE <Text style={{ color: COLORS.accent }}>EMPRESA</Text>
                            </Text>
                        </View>
                    </View>

                    {/* MÉTRICAS (Flex direction condicional en pantallas muy chicas si se desea, pero en Row con Flex 1 funciona bien) */}
                    <View style={{ marginTop: width > 400 ? 40 : 25 }}>
                        <View style={styles.card}>
                            <View style={styles.iconCircle}>
                                <Ionicons name="gift-outline" size={26} color={COLORS.accent} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.smallTitle}>Puntos otorgados</Text>
                                <Text style={[styles.scanNumber, { color: COLORS.accent }]}>
                                    {totalPoints !== null ? totalPoints : "0"}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.card}>
                            <View style={[styles.iconCircle, { borderColor: '#4F9CF9', backgroundColor: 'rgba(79, 156, 249, 0.1)' }]}>
                                <Ionicons name="qr-code-outline" size={26} color="#4F9CF9" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.smallTitle}>Total escaneos</Text>
                                <Text style={[styles.scanNumber, { color: '#4F9CF9' }]}>
                                    {totalScans !== null ? totalScans : "0"}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* --- SECCIÓN: CONFIGURACIÓN --- */}
                    <View style={styles.divider} />
                    <Text style={styles.sectionTitle}>CONFIGURACIÓN DE PERFIL</Text>

                    {/* AVISO IMPORTANTE SOBRE EL INDEX */}
                    <View style={styles.infoBoxIndex}>
                        <Ionicons name="eye" size={20} color={COLORS.accent} />
                        <Text style={styles.infoTextIndex}>
                            <Text style={{ fontWeight: 'bold', color: COLORS.accent }}>Visible en el Index: </Text>
                            La información, categoría y fotos que configures aquí serán las que vean los clientes en la pantalla principal.
                        </Text>
                    </View>

                    <View style={styles.formContainer}>

                        {/* FOTO PERFIL */}
                        <View style={{ alignItems: 'center', marginBottom: 20, marginTop: 10 }}>
                            <Text style={[styles.label, { alignSelf: 'center', marginBottom: 10 }]}>Logo de la Empresa</Text>
                            <TouchableOpacity onPress={() => pickImage('fotoPerfil')} style={styles.profileImageContainer}>
                                {formData.fotoPerfil ? (
                                    <Image source={{ uri: formData.fotoPerfil }} style={styles.profileImage} />
                                ) : (
                                    <View style={styles.placeholderImage}>
                                        <Ionicons name="camera-outline" size={30} color={COLORS.textSec} />
                                    </View>
                                )}
                                <View style={styles.editIconBadge}>
                                    <Ionicons name="pencil" size={14} color="#FFF" />
                                </View>
                            </TouchableOpacity>
                        </View>

                        {/* SELECCIÓN DE CATEGORÍA (RESTRINGIDA Y RESPONSIVA) */}
                        <Text style={styles.label}>Categoría (Selecciona una)</Text>
                        <View style={[styles.categoryContainer, isSmallScreen && { flexWrap: 'wrap' }]}>
                            {VALID_CATEGORIES.map((cat) => (
                                <TouchableOpacity
                                    key={cat}
                                    style={[
                                        styles.categoryChip,
                                        formData.categoria === cat && styles.categoryChipActive,
                                        // En pantallas pequeñas, si hace wrap, aseguramos que ocupen al menos el 40%
                                        isSmallScreen && { minWidth: '45%' }
                                    ]}
                                    onPress={() => setFormData({ ...formData, categoria: cat })}
                                >
                                    <Text style={[
                                        styles.categoryChipText,
                                        formData.categoria === cat && styles.categoryChipTextActive,
                                        isSmallScreen && { fontSize: 11 } // Letra un poquito más pequeña si es necesario
                                    ]}>
                                        {cat}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>Descripción</Text>
                        <TextInput
                            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                            placeholder="Describe tu empresa..."
                            placeholderTextColor={COLORS.textSec}
                            multiline
                            value={formData.descripcion}
                            onChangeText={(t) => setFormData({ ...formData, descripcion: t })}
                        />

                        {/* ENTRADAS EN FILA RESPONSIVAS */}
                        <View style={[styles.rowInputs, isSmallScreen && { flexDirection: 'column' }]}>
                            <View style={{ flex: 1, marginRight: isSmallScreen ? 0 : 10 }}>
                                <Text style={styles.label}>País</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="País"
                                    placeholderTextColor={COLORS.textSec}
                                    value={formData.pais}
                                    onChangeText={(t) => setFormData({ ...formData, pais: t })}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>Ciudad</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Ciudad"
                                    placeholderTextColor={COLORS.textSec}
                                    value={formData.ciudad}
                                    onChangeText={(t) => setFormData({ ...formData, ciudad: t })}
                                />
                            </View>
                        </View>

                        <Text style={styles.label}>Descuento / Oferta Principal</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ej: 10% OFF en primera compra"
                            placeholderTextColor={COLORS.textSec}
                            value={formData.descuento}
                            onChangeText={(t) => setFormData({ ...formData, descuento: t })}
                        />

                        <Text style={styles.label}>Link Google Maps</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enlace de ubicación"
                            placeholderTextColor={COLORS.textSec}
                            value={formData.ubicacionMaps}
                            onChangeText={(t) => setFormData({ ...formData, ubicacionMaps: t })}
                        />

                        {/* GALERÍA RESPONSIVA */}
                        <Text style={styles.label}>Fotos para el Index (Opcional)</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                            {['fotoDescripcion1', 'fotoDescripcion2', 'fotoDescripcion3'].map((field, index) => (
                                <TouchableOpacity
                                    key={field}
                                    onPress={() => pickImage(field as keyof typeof formData)}
                                    // Cálculo dinámico del ancho según la pantalla
                                    style={[styles.galleryImageContainer, { width: width * 0.28, height: (width * 0.28) * 0.75, maxWidth: 150, maxHeight: 110 }]}
                                >
                                    {/* @ts-ignore */}
                                    {formData[field] ? (
                                        // @ts-ignore
                                        <Image source={{ uri: formData[field] }} style={styles.galleryImage} />
                                    ) : (
                                        <View style={styles.placeholderGallery}>
                                            <Ionicons name="add" size={24} color={COLORS.textSec} />
                                            <Text style={styles.placeholderTextSmall}>Foto {index + 1}</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <TouchableOpacity
                            style={styles.saveButton}
                            onPress={updateEmpresaData}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <ActivityIndicator color="#000" />
                            ) : (
                                <Text style={styles.saveButtonText}>GUARDAR Y PUBLICAR</Text>
                            )}
                        </TouchableOpacity>

                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    centerContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: '5%'
    },
    textBase: {
        color: COLORS.text,
        fontSize: 22,
        fontFamily: FONTS.title,
        marginBottom: 10,
        textAlign: 'center'
    },
    subText: {
        color: COLORS.textSec,
        fontSize: 15,
        textAlign: 'center',
        fontFamily: FONTS.textRegular,
        lineHeight: 22
    },
    scrollViewStyle: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    companyContainer: {
        paddingHorizontal: '6%',
        paddingTop: Platform.OS === 'ios' ? 10 : 24,
        paddingBottom: 50
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 20,
    },
    welcomeText: {
        fontFamily: FONTS.textBold,
        fontSize: 10,
        color: COLORS.accent,
        letterSpacing: 3,
        marginBottom: 4
    },
    header: {
        fontSize: 24,
        fontFamily: FONTS.title,
        color: COLORS.text,
        textAlign: "left",
        flexWrap: 'wrap'
    },
    card: {
        backgroundColor: COLORS.cardBg,
        padding: 20,
        borderRadius: 24,
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border
    },
    iconCircle: {
        width: 56,
        height: 56,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: COLORS.accent,
        backgroundColor: 'rgba(1, 195, 142, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16
    },
    smallTitle: {
        fontSize: 11,
        color: COLORS.textSec,
        fontFamily: FONTS.textBold,
        textTransform: 'uppercase',
        letterSpacing: 1
    },
    scanNumber: {
        fontSize: 32,
        fontFamily: FONTS.title,
        marginTop: 2
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginVertical: 25
    },
    sectionTitle: {
        fontFamily: FONTS.title,
        fontSize: 18,
        color: COLORS.text,
        marginBottom: 10
    },
    infoBoxIndex: {
        flexDirection: 'row',
        backgroundColor: 'rgba(1, 195, 142, 0.1)',
        padding: 15,
        borderRadius: 12,
        marginBottom: 25,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.accent
    },
    infoTextIndex: {
        color: COLORS.text,
        fontSize: 13,
        fontFamily: FONTS.textRegular,
        marginLeft: 10,
        flex: 1,
        lineHeight: 18
    },
    formContainer: {
        marginBottom: 40
    },
    label: {
        color: COLORS.textSec,
        fontFamily: FONTS.textMedium,
        fontSize: 12,
        marginBottom: 8,
        marginLeft: 4
    },
    input: {
        backgroundColor: COLORS.cardBg,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 12,
        padding: 14,
        color: COLORS.text,
        fontFamily: FONTS.textRegular,
        marginBottom: 16,
        fontSize: 14
    },
    categoryContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        gap: 8
    },
    categoryChip: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 5,
        backgroundColor: COLORS.cardBg,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
        justifyContent: 'center'
    },
    categoryChipActive: {
        backgroundColor: COLORS.accent,
        borderColor: COLORS.accent,
    },
    categoryChipText: {
        color: COLORS.textSec,
        fontFamily: FONTS.textMedium,
        fontSize: 12,
        textAlign: 'center'
    },
    categoryChipTextActive: {
        color: '#000',
        fontFamily: FONTS.textBold
    },
    rowInputs: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%'
    },
    saveButton: {
        backgroundColor: COLORS.accent,
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 10,
    },
    saveButtonText: {
        color: '#000',
        fontFamily: FONTS.textBold,
        fontSize: 14
    },
    profileImageContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: COLORS.cardBg,
        borderWidth: 1,
        borderColor: COLORS.border,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden'
    },
    profileImage: {
        width: '100%',
        height: '100%',
        borderRadius: 50,
    },
    placeholderImage: {
        alignItems: 'center',
        justifyContent: 'center'
    },
    editIconBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: COLORS.accent,
        padding: 6,
        borderRadius: 20,
        zIndex: 10
    },
    galleryImageContainer: {
        borderRadius: 12,
        backgroundColor: COLORS.cardBg,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginRight: 10,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center'
    },
    galleryImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover'
    },
    placeholderGallery: {
        alignItems: 'center',
    },
    placeholderTextSmall: {
        color: COLORS.textSec,
        fontSize: 10,
        marginTop: 4
    }
});