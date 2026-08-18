import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRouter } from "expo-router";
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// --- IMPORTACIÓN DEL COMPONENTE EXTERNO DE MESAS Y RESERVAS ---
import CompanyCanchaReservationAdmin from '../../../components/modals/companyCanchaReservationAdmin';
import CompanyReservationAdmin from '../../../components/modals/companyReservationAdmin';

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

// --- TIPOS DE CATÁLOGO DINÁMICO ---
interface PaisUbicacion {
    id: number;
    nombre: string;
    codigo: string;
}
interface CiudadUbicacion {
    id: number;
    nombre: string;
    paisId: number;
}
interface Categoria {
    id: number;
    nombre: string;
}

// --- HOOK DE AUTORIZACIÓN ---
const useEmpresaCheck = () => {
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isLoadingAuth, setIsLoadingAuth] = useState(true);
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
                setIsLoadingAuth(false);
            }
        };

        checkAccess();
    }, []);

    return { isAuthorized, isLoadingAuth, errorMessage, empresaId };
};

export default function CompanyScreen() {
    const navigator = useNavigation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { isAuthorized, isLoadingAuth, errorMessage, empresaId } = useEmpresaCheck();
    const { width } = useWindowDimensions();
    const isTablet = width >= 768;
    const isSmallScreen = width < 380;
    const [totalScans, setTotalScans] = useState<number | null>(null);
    const [totalPoints, setTotalPoints] = useState<number | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    
    // --- ESTADO PARA EL MODAL DE GESTIÓN DE MESAS Y RESERVAS ---
    const [gestionModalVisible, setGestionModalVisible] = useState(false);
    
    // --- ESTADO PARA EL MODAL DE GESTIÓN DE CANCHAS Y RESERVAS ---
    const [gestionCanchaModalVisible, setGestionCanchaModalVisible] = useState(false);

    // --- CATÁLOGO DINÁMICO (API) ---
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [paises, setPaises] = useState<PaisUbicacion[]>([]);
    const [ciudades, setCiudades] = useState<CiudadUbicacion[]>([]);
    
    // --- ESTADO PARA RECARGA ---
    const [refreshing, setRefreshing] = useState(false);
    
    // --- ESTADOS PARA LOS MENÚS DESPLEGABLES ---
    const [countryModalVisible, setCountryModalVisible] = useState(false);
    const [cityModalVisible, setCityModalVisible] = useState(false);
    
    // --- ESTADOS PARA EL SELECTOR DE HORA MODERNO ---
    const [timeModalVisible, setTimeModalVisible] = useState(false);
    const [timeType, setTimeType] = useState<'apertura' | 'cierre'>('apertura');
    const [tempHour, setTempHour] = useState('08');
    const [tempMinute, setTempMinute] = useState('00');

    // --- ESTADO DEL FORMULARIO DE EMPRESA ---
    const [formData, setFormData] = useState({
        descripcion: '',
        ubicacionMaps: '',
        whatsapp: '', 
        descuento: '',
        pais: '',
        ciudad: '',
        categoria: 'Restaurantes',
        fotoPerfil: null as string | null,
        fotoDescripcion1: null as string | null,
        fotoDescripcion2: null as string | null,
        fotoDescripcion3: null as string | null,
        horarioApertura: '',
        horarioCierre: '',
    });

    const [fontsLoaded] = useFonts({
        'Heavitas': require('../../../assets/fonts/Heavitas.ttf'),
        'Poppins-Regular': require('../../../assets/fonts/Poppins-Regular.ttf'),
        'Poppins-Medium': require('../../../assets/fonts/Poppins-Medium.ttf'),
        'Poppins-Bold': require('../../../assets/fonts/Poppins-Bold.ttf'),
    });

    const openTimeSelector = (type: 'apertura' | 'cierre') => {
        setTimeType(type);
        const currentTime = type === 'apertura' ? formData.horarioApertura : formData.horarioCierre;
        if (currentTime && currentTime.includes(':')) {
            const [h, m] = currentTime.split(':');
            setTempHour(h || '08');
            setTempMinute(m || '00');
        } else {
            setTempHour(type === 'apertura' ? '08' : '18');
            setTempMinute('00');
        }
        setTimeModalVisible(true);
    };

    const confirmTimeSelection = () => {
        const formatted = `${tempHour}:${tempMinute}`;
        if (timeType === 'apertura') {
            setFormData(prev => ({ ...prev, horarioApertura: formatted }));
        } else {
            setFormData(prev => ({ ...prev, horarioCierre: formatted }));
        }
        setTimeModalVisible(false);
    };

    // --- CARGA DE DATOS ---
    const loadData = useCallback(async (isRefresh = false) => {
        if (!empresaId) return;
        if (isRefresh) setRefreshing(true);

        try {
            const API_URL = process.env.EXPO_PUBLIC_API_URL;

            const [categoriasRes, paisesRes, ciudadesRes] = await Promise.all([
                fetch(`${API_URL}/api/categorias`),
                fetch(`${API_URL}/api/paises`),
                fetch(`${API_URL}/api/ciudades`),
            ]);

            let categoriasLista: Categoria[] = [];
            if (categoriasRes.ok) {
                const data = await categoriasRes.json();
                const lista = Array.isArray(data) ? data : (data.categorias || []);
                categoriasLista = lista.map((c: any) => ({ id: c.categoria_id, nombre: c.nombre }));
                setCategorias(categoriasLista);
            }

            if (paisesRes.ok) {
                const data = await paisesRes.json();
                const lista = Array.isArray(data) ? data : (data.paises || []);
                setPaises(lista.map((p: any) => ({ id: p.pais_id, nombre: p.nombre, codigo: p.codigo || '' })));
            }

            if (ciudadesRes.ok) {
                const data = await ciudadesRes.json();
                const lista = Array.isArray(data) ? data : (data.ciudades || []);
                setCiudades(lista.map((c: any) => ({ id: c.ciudad_id, nombre: c.nombre, paisId: c.pais_id })));
            }

            const responseMetricas = await fetch(`${API_URL}/api/metricas/empresa/${empresaId}`);
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

            const responseEmpresa = await fetch(`${API_URL}/api/empresa/${empresaId}`);
            if (responseEmpresa.ok) {
                const data = await responseEmpresa.json();
                const catFromBd = data.categoria;
                const nombresCategorias = categoriasLista.map(c => c.nombre);
                const finalCat = nombresCategorias.includes(catFromBd) ? catFromBd : (nombresCategorias[0] || 'Restaurantes');
                const horaAp = data.horarioApertura || '';
                const horaCi = data.horarioCierre || '';

                setFormData({
                    descripcion: data.descripcion || '',
                    ubicacionMaps: data.ubicacionMaps || '',
                    whatsapp: data.whatsapp || '', 
                    descuento: data.descuento || '',
                    pais: data.pais || '',
                    ciudad: data.ciudad || '',
                    categoria: finalCat,
                    fotoPerfil: data.fotoPerfil || null,
                    fotoDescripcion1: data.fotoDescripcion1 || null,
                    fotoDescripcion2: data.fotoDescripcion2 || null,
                    fotoDescripcion3: data.fotoDescripcion3 || null,
                    horarioApertura: horaAp,
                    horarioCierre: horaCi,
                });
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            Alert.alert("Error", "No se pudieron cargar los datos. Verifica tu conexión.");
        } finally {
            if (isRefresh) setRefreshing(false);
        }
    }, [empresaId]);

    useEffect(() => {
        if (isAuthorized && empresaId) {
            loadData(false);
        }
    }, [isAuthorized, empresaId, loadData]);

    const onRefresh = () => loadData(true);

    const updateEmpresaData = async () => {
        if (!empresaId) return;
        setIsSaving(true);

        try {
            const API_URL = process.env.EXPO_PUBLIC_API_URL;
            const data = new FormData();

            data.append('descripcion', formData.descripcion);
            data.append('ubicacionMaps', formData.ubicacionMaps);
            data.append('whatsapp', formData.whatsapp); 
            data.append('descuento', formData.descuento);
            data.append('pais', formData.pais);
            data.append('ciudad', formData.ciudad);
            data.append('categoria', formData.categoria);
            data.append('horarioApertura', formData.horarioApertura);
            data.append('horarioCierre', formData.horarioCierre);

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
                headers: { 'Accept': 'application/json' },
                body: data
            });

            if (response.ok) {
                Alert.alert("Éxito", "Tu perfil se ha actualizado correctamente.");
            } else {
                Alert.alert("Error", "No se pudo actualizar el perfil.");
            }
        } catch (error) {
            console.error("Network Error:", error);
            Alert.alert("Error", "Error de conexión con el servidor.");
        } finally {
            setIsSaving(false);
        }
    };

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

    if (!fontsLoaded || isLoadingAuth) {
        return (
            <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
                <ActivityIndicator size="large" color={COLORS.accent} />
            </View>
        );
    }

    if (!isAuthorized) {
        return (
            <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
                <Ionicons name="lock-closed-outline" size={60} color={COLORS.accent} style={{ marginBottom: 20 }} />
                <Text style={styles.textBase}>ACCESO DENEGADO</Text>
                <Text style={styles.subText}>{errorMessage}</Text>
            </View>
        );
    }

    const selectedPais = paises.find(p => p.nombre === formData.pais);
    const availableCities = selectedPais
        ? ciudades.filter(c => c.paisId === selectedPais.id).map(c => c.nombre)
        : [];

    return (
        <View style={{ flex: 1, backgroundColor: COLORS.background, paddingTop: insets.top }}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
                <ScrollView
                    style={styles.scrollViewStyle}
                    contentContainerStyle={[
                        styles.companyContainer,
                        isTablet && { maxWidth: 800, alignSelf: 'center', width: '100%' }
                    ]}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />
                    }
                >
                    <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

                    <View style={styles.headerRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.welcomeText}>ESTADÍSTICAS</Text>
                            <Text style={styles.header}>
                                PANEL DE <Text style={{ color: COLORS.accent }}>EMPRESA</Text>
                            </Text>
                        </View>
                        <TouchableOpacity 
                            onPress={onRefresh} 
                            style={styles.headerBtn} 
                            disabled={refreshing}
                            activeOpacity={0.7}
                        >
                            {refreshing ? (
                                <ActivityIndicator size="small" color={COLORS.accent} />
                            ) : (
                                <Ionicons name="refresh-outline" size={22} color={COLORS.accent} />
                            )}
                        </TouchableOpacity>
                    </View>

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

                        <TouchableOpacity
                            style={styles.productsLinkBtn}
                            onPress={() => router.push('/(tabs)/dashboard/products' as any)}
                        >
                            <View style={styles.productsLinkContent}>
                                <Ionicons name="cube" size={20} color="#000" />
                                <Text style={styles.productsLinkText}>GESTIONAR PRODUCTOS</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#000" />
                        </TouchableOpacity>

                        {/* --- BOTÓN DE GESTIÓN DE MESAS Y RESERVAS --- */}
                        <TouchableOpacity
                            style={[styles.productsLinkBtn, { backgroundColor: '#4F9CF9', marginTop: 12 }]}
                            onPress={() => setGestionModalVisible(true)}
                        >
                            <View style={styles.productsLinkContent}>
                                <Ionicons name="restaurant-outline" size={20} color="#000" />
                                <Text style={[styles.productsLinkText, { color: '#000' }]}>GESTIONAR MESAS Y RESERVAS</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#000" />
                        </TouchableOpacity>

                        {/* --- BOTÓN DE GESTIÓN DE CANCHAS Y RESERVAS --- */}
                        <TouchableOpacity
                            style={[styles.productsLinkBtn, { backgroundColor: '#ffa726', marginTop: 12 }]}
                            onPress={() => setGestionCanchaModalVisible(true)}
                        >
                            <View style={styles.productsLinkContent}>
                                <Ionicons name="football-outline" size={20} color="#000" />
                                <Text style={[styles.productsLinkText, { color: '#000' }]}>GESTIONAR CANCHAS Y RESERVAS</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#000" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.divider} />
                    <Text style={styles.sectionTitle}>CONFIGURACIÓN DE PERFIL</Text>

                    <View style={styles.infoBoxIndex}>
                        <Ionicons name="eye" size={20} color={COLORS.accent} />
                        <Text style={styles.infoTextIndex}>
                            <Text style={{ fontWeight: 'bold', color: COLORS.accent }}>Visible en el Index: </Text>
                            La información, categoría y fotos que configures aquí serán las que vean los clientes en la pantalla principal.
                        </Text>
                    </View>

                    <View style={styles.formContainer}>
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

                        <Text style={styles.label}>Categoría (Selecciona una)</Text>
                        <View style={[styles.categoryContainer, isSmallScreen && { flexWrap: 'wrap' }]}>
                            {categorias.map((cat) => (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={[
                                        styles.categoryChip,
                                        formData.categoria === cat.nombre && styles.categoryChipActive,
                                        isSmallScreen && { minWidth: '45%' }
                                    ]}
                                    onPress={() => setFormData({ ...formData, categoria: cat.nombre })}
                                >
                                    <Text style={[
                                        styles.categoryChipText,
                                        formData.categoria === cat.nombre && styles.categoryChipTextActive,
                                        isSmallScreen && { fontSize: 11 }
                                    ]}>
                                        {cat.nombre}
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

                        <View style={[styles.rowInputs, isSmallScreen && { flexDirection: 'column' }]}>
                            <View style={{ flex: 1, marginRight: isSmallScreen ? 0 : 10 }}>
                                <Text style={styles.label}>País</Text>
                                <TouchableOpacity
                                    style={[styles.input, { justifyContent: 'center' }]}
                                    onPress={() => setCountryModalVisible(true)}
                                >
                                    <Text style={{ color: formData.pais ? COLORS.text : COLORS.textSec, fontSize: 14 }}>
                                        {formData.pais || "Seleccionar..."}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>Ciudad</Text>
                                <TouchableOpacity
                                    style={[styles.input, { justifyContent: 'center' }]}
                                    onPress={() => {
                                        if (!formData.pais) Alert.alert("Atención", "Primero debes seleccionar un país.");
                                        else setCityModalVisible(true);
                                    }}
                                >
                                    <Text style={{ color: formData.ciudad ? COLORS.text : COLORS.textSec, fontSize: 14 }}>
                                        {formData.ciudad || "Seleccionar..."}
                                    </Text>
                                </TouchableOpacity>
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

                        <Text style={styles.label}>Número de WhatsApp (Incluye código de país)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ej: 573001234567"
                            placeholderTextColor={COLORS.textSec}
                            keyboardType="phone-pad"
                            value={formData.whatsapp}
                            onChangeText={(t) => setFormData({ ...formData, whatsapp: t })}
                        />
                        
                        <Text style={styles.label}>Horario de Atención</Text>
                        <View style={[styles.rowInputs, isSmallScreen && { flexDirection: 'column' }]}>
                            <View style={{ flex: 1, marginRight: isSmallScreen ? 0 : 10 }}>
                                <Text style={[styles.label, { fontSize: 12, color: COLORS.textSec, marginBottom: 5 }]}>Apertura</Text>
                                <TouchableOpacity 
                                    style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]} 
                                    onPress={() => openTimeSelector('apertura')}
                                >
                                    <Text style={{ color: formData.horarioApertura ? COLORS.text : COLORS.textSec, fontSize: 14, fontFamily: FONTS.textMedium }}>
                                        {formData.horarioApertura || "08:00"}
                                    </Text>
                                    <Ionicons name="time-outline" size={18} color={COLORS.accent} />
                                </TouchableOpacity>
                            </View>

                            <View style={{ flex: 1 }}>
                                <Text style={[styles.label, { fontSize: 12, color: COLORS.textSec, marginBottom: 5 }]}>Cierre</Text>
                                <TouchableOpacity 
                                    style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]} 
                                    onPress={() => openTimeSelector('cierre')}
                                >
                                    <Text style={{ color: formData.horarioCierre ? COLORS.text : COLORS.textSec, fontSize: 14, fontFamily: FONTS.textMedium }}>
                                        {formData.horarioCierre || "18:00"}
                                    </Text>
                                    <Ionicons name="time-outline" size={18} color={COLORS.accent} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <Text style={styles.label}>Fotos para el Index (Opcional)</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                            {['fotoDescripcion1', 'fotoDescripcion2', 'fotoDescripcion3'].map((field, index) => (
                                <TouchableOpacity
                                    key={field}
                                    onPress={() => pickImage(field as keyof typeof formData)}
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

                        <TouchableOpacity style={styles.saveButton} onPress={updateEmpresaData} disabled={isSaving}>
                            {isSaving ? <ActivityIndicator color="#000" /> : <Text style={styles.saveButtonText}>GUARDAR Y PUBLICAR</Text>}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* --- COMPONENTE EXTERNO DE GESTIÓN DE MESAS Y RESERVAS --- */}
            <CompanyReservationAdmin 
                visible={gestionModalVisible} 
                onClose={() => setGestionModalVisible(false)} 
                empresaId={empresaId} 
            />

            {/* --- COMPONENTE EXTERNO DE GESTIÓN DE CANCHAS Y RESERVAS --- */}
            <CompanyCanchaReservationAdmin 
                visible={gestionCanchaModalVisible} 
                onClose={() => setGestionCanchaModalVisible(false)} 
                empresaId={empresaId} 
            />

            {/* --- MODAL MODERNO PARA SELECCIONAR HORA --- */}
            <Modal visible={timeModalVisible} transparent animationType="fade">
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setTimeModalVisible(false)}>
                    <View style={[styles.modalContent, { maxWidth: 360 }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <Text style={styles.modalTitle}>
                                {timeType === 'apertura' ? 'Hora de Apertura' : 'Hora de Cierre'}
                            </Text>
                            <TouchableOpacity onPress={() => setTimeModalVisible(false)}>
                                <Ionicons name="close" size={22} color={COLORS.textSec} />
                            </TouchableOpacity>
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 25, gap: 15 }}>
                            {/* Columna Horas */}
                            <View style={{ flex: 1, alignItems: 'center' }}>
                                <Text style={[styles.label, { marginBottom: 8 }]}>Hora</Text>
                                <View style={{ height: 160, width: '100%', backgroundColor: COLORS.background, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' }}>
                                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 10 }}>
                                        {Array.from({ length: 24 }, (_, i) => {
                                            const h = i.toString().padStart(2, '0');
                                            const isSelected = tempHour === h;
                                            return (
                                                <TouchableOpacity
                                                    key={h}
                                                    style={{ paddingVertical: 10, alignItems: 'center', backgroundColor: isSelected ? 'rgba(1, 195, 142, 0.15)' : 'transparent' }}
                                                    onPress={() => setTempHour(h)}
                                                >
                                                    <Text style={{ color: isSelected ? COLORS.accent : COLORS.text, fontFamily: isSelected ? FONTS.textBold : FONTS.textRegular, fontSize: 16 }}>
                                                        {h}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                </View>
                            </View>

                            <Text style={{ color: COLORS.accent, fontSize: 24, fontFamily: FONTS.title, marginTop: 20 }}>:</Text>

                            {/* Columna Minutos */}
                            <View style={{ flex: 1, alignItems: 'center' }}>
                                <Text style={[styles.label, { marginBottom: 8 }]}>Minutos</Text>
                                <View style={{ height: 160, width: '100%', backgroundColor: COLORS.background, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' }}>
                                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 10 }}>
                                        {['00', '10', '15', '20', '30', '40', '45', '50'].map((m) => {
                                            const isSelected = tempMinute === m;
                                            return (
                                                <TouchableOpacity
                                                    key={m}
                                                    style={{ paddingVertical: 10, alignItems: 'center', backgroundColor: isSelected ? 'rgba(1, 195, 142, 0.15)' : 'transparent' }}
                                                    onPress={() => setTempMinute(m)}
                                                >
                                                    <Text style={{ color: isSelected ? COLORS.accent : COLORS.text, fontFamily: isSelected ? FONTS.textBold : FONTS.textRegular, fontSize: 16 }}>
                                                        {m}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                </View>
                            </View>
                        </View>

                        <TouchableOpacity 
                            style={{ backgroundColor: COLORS.accent, padding: 14, borderRadius: 12, alignItems: 'center' }}
                            onPress={confirmTimeSelection}
                        >
                            <Text style={{ color: '#000', fontFamily: FONTS.textBold, fontSize: 14 }}>CONFIRMAR HORA</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* --- MODALES DE PAÍSES Y CIUDADES --- */}
            <Modal visible={countryModalVisible} transparent animationType="fade">
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setCountryModalVisible(false)}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Selecciona el País</Text>
                        {paises.map(p => (
                            <TouchableOpacity
                                key={p.id}
                                style={styles.modalOption}
                                onPress={() => {
                                    setFormData({ ...formData, pais: p.nombre, ciudad: '' });
                                    setCountryModalVisible(false);
                                }}
                            >
                                <Text style={[styles.modalOptionText, formData.pais === p.nombre && { color: COLORS.accent, fontFamily: FONTS.textBold }]}>
                                    {p.nombre}{p.codigo ? ` (${p.codigo})` : ''}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>
            
            <Modal visible={cityModalVisible} transparent animationType="fade">
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setCityModalVisible(false)}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Selecciona la Ciudad</Text>
                        {availableCities.map((city: string) => (
                            <TouchableOpacity
                                key={city}
                                style={styles.modalOption}
                                onPress={() => {
                                    setFormData({ ...formData, ciudad: city });
                                    setCityModalVisible(false);
                                }}
                            >
                                <Text style={[styles.modalOptionText, formData.ciudad === city && { color: COLORS.accent, fontFamily: FONTS.textBold }]}>
                                    {city}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
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
    headerBtn: {
        width: 44,
        height: 44,
        backgroundColor: COLORS.cardBg,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 15
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
        fontSize: 14,
        minHeight: 50,
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
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16
    },
    modalContent: {
        backgroundColor: COLORS.cardBg,
        width: '100%',
        maxWidth: 450,
        maxHeight: '85%',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    modalTitle: {
        color: COLORS.text,
        fontFamily: FONTS.title,
        fontSize: 15
    },
    modalOption: {
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border
    },
    modalOptionText: {
        color: COLORS.textSec,
        fontFamily: FONTS.textRegular,
        fontSize: 14,
        textAlign: 'center'
    },
    productsLinkBtn: {
        backgroundColor: COLORS.accent,
        borderRadius: 18,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 10,
        marginBottom: 10,
        elevation: 5,
        shadowColor: COLORS.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    productsLinkContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    productsLinkText: {
        color: '#000',
        fontFamily: FONTS.title,
        fontSize: 14,
        marginLeft: 10,
    }
});