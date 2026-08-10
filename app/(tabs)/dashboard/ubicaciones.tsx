import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    useWindowDimensions,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const COLORS = {
    background: '#0f1115',
    cardBg: '#181b21',
    accent: '#01c38e',
    text: '#ffffff',
    textSec: '#8b9bb4',
    border: '#232936',
    pink: '#E1306C',
    gold: '#D4AF37'
};

const FONTS = {
    title: 'Heavitas',
    textRegular: 'Poppins-Regular',
    textMedium: 'Poppins-Medium',
    textBold: 'Poppins-Bold'
};

interface Pais {
    id: number;
    nombre: string;
    codigo: string;
}

interface Ciudad {
    id: number;
    nombre: string;
    paisId: number;
}

export default function UbicacionesScreen() {
    const router = useRouter();
    const safeAreaInsets = useSafeAreaInsets();
    const { width } = useWindowDimensions();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [paises, setPaises] = useState<Pais[]>([]);
    const [ciudades, setCiudades] = useState<Ciudad[]>([]);

    const [nuevoPais, setNuevoPais] = useState('');
    const [nuevoCodigo, setNuevoCodigo] = useState('');
    const [ciudadPaisSeleccionado, setCiudadPaisSeleccionado] = useState<number | null>(null);
    const [nuevaCiudad, setNuevaCiudad] = useState('');

    const [guardandoPais, setGuardandoPais] = useState(false);
    const [guardandoCiudad, setGuardandoCiudad] = useState(false);

    const [fontsLoaded] = useFonts({
        'Heavitas': require('../../../assets/fonts/Heavitas.ttf'),
        'Poppins-Regular': require('../../../assets/fonts/Poppins-Regular.ttf'),
        'Poppins-Medium': require('../../../assets/fonts/Poppins-Medium.ttf'),
        'Poppins-Bold': require('../../../assets/fonts/Poppins-Bold.ttf'),
    });

    const styles = useMemo(() => getResponsiveStyles(width, safeAreaInsets.top), [width, safeAreaInsets.top]);
    const normalize = useMemo(() => {
        const scale = width / 375;
        return (size: number) => Math.round(size * scale);
    }, [width]);

    useEffect(() => {
        const loadJwt = async () => {
            const rol = await SecureStore.getItemAsync('rol');

            if (rol !== 'Admin') {
                Alert.alert("Acceso Denegado", "No tienes permisos de administrador.");
                router.back();
                return;
            }
            fetchData();
        };
        loadJwt();
    }, []);

    const fetchData = async () => {
        try {
            const [paisesRes, ciudadesRes] = await Promise.all([
                fetch(`${API_URL}/api/paises`),
                fetch(`${API_URL}/api/ciudades`),
            ]);

            if (paisesRes.ok) {
                const data = await paisesRes.json();
                const lista = Array.isArray(data) ? data : (data.paises || []);
                const mapeados = lista.map((p: any) => ({ id: p.pais_id, nombre: p.nombre, codigo: p.codigo || '' }));
                setPaises(mapeados);
                setCiudadPaisSeleccionado(prev => prev ?? (mapeados.length > 0 ? mapeados[0].id : null));
            }

            if (ciudadesRes.ok) {
                const data = await ciudadesRes.json();
                const lista = Array.isArray(data) ? data : (data.ciudades || []);
                setCiudades(lista.map((c: any) => ({ id: c.ciudad_id, nombre: c.nombre, paisId: c.pais_id })));
            }
        } catch (error) {
            console.error("Error de red:", error);
            Alert.alert("Error", "Revisa tu conexión.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleAgregarPais = async () => {
        const nombre = nuevoPais.trim();
        if (!nombre) {
            Alert.alert("Campo vacío", "Escribe el nombre del país.");
            return;
        }

        const codigo = nuevoCodigo.trim().toUpperCase();

        setGuardandoPais(true);
        try {
            const response = await fetch(`${API_URL}/api/paises`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(codigo ? { nombre, codigo } : { nombre }),
            });

            if (response.ok) {
                const pais = await response.json();
                setPaises(prev => [...prev, { id: pais.pais_id, nombre: pais.nombre, codigo: pais.codigo || '' }]);
                setNuevoPais('');
                setNuevoCodigo('');
            } else {
                const err = await response.json();
                Alert.alert("Error", err.message || "No se pudo agregar el país.");
            }
        } catch (error) {
            console.error("Error al agregar país:", error);
            Alert.alert("Error", "Error de conexión.");
        } finally {
            setGuardandoPais(false);
        }
    };

    const handleEliminarPais = (pais: Pais) => {
        Alert.alert(
            "Eliminar País",
            `¿Eliminar "${pais.nombre}"? Se eliminarán también sus ciudades.`,
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Eliminar",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const response = await fetch(`${API_URL}/api/paises/${pais.id}`, { method: 'DELETE' });

                            if (response.ok) {
                                setPaises(prev => prev.filter(p => p.id !== pais.id));
                                setCiudades(prev => prev.filter(c => c.paisId !== pais.id));
                                if (ciudadPaisSeleccionado === pais.id) setCiudadPaisSeleccionado(null);
                            } else {
                                const err = await response.json();
                                Alert.alert("Error", err.message || "No se pudo eliminar el país.");
                            }
                        } catch (error) {
                            console.error("Error al eliminar país:", error);
                            Alert.alert("Error", "Error de conexión.");
                        }
                    }
                }
            ]
        );
    };

    const handleAgregarCiudad = async () => {
        const nombre = nuevaCiudad.trim();
        if (!nombre) {
            Alert.alert("Campo vacío", "Escribe el nombre de la ciudad.");
            return;
        }
        if (!ciudadPaisSeleccionado) {
            Alert.alert("País requerido", "Selecciona un país para la ciudad.");
            return;
        }

        setGuardandoCiudad(true);
        try {
            const response = await fetch(`${API_URL}/api/ciudades`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre, pais_id: ciudadPaisSeleccionado }),
            });

            if (response.ok) {
                const ciudad = await response.json();
                setCiudades(prev => [...prev, { id: ciudad.ciudad_id, nombre: ciudad.nombre, paisId: ciudad.pais_id }]);
                setNuevaCiudad('');
            } else {
                const err = await response.json();
                Alert.alert("Error", err.message || "No se pudo agregar la ciudad.");
            }
        } catch (error) {
            console.error("Error al agregar ciudad:", error);
            Alert.alert("Error", "Error de conexión.");
        } finally {
            setGuardandoCiudad(false);
        }
    };

    const handleEliminarCiudad = (ciudad: Ciudad) => {
        Alert.alert(
            "Eliminar Ciudad",
            `¿Eliminar "${ciudad.nombre}"?`,
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Eliminar",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const response = await fetch(`${API_URL}/api/ciudades/${ciudad.id}`, { method: 'DELETE' });

                            if (response.ok) {
                                setCiudades(prev => prev.filter(c => c.id !== ciudad.id));
                            } else {
                                const err = await response.json();
                                Alert.alert("Error", err.message || "No se pudo eliminar la ciudad.");
                            }
                        } catch (error) {
                            console.error("Error al eliminar ciudad:", error);
                            Alert.alert("Error", "Error de conexión.");
                        }
                    }
                }
            ]
        );
    };

    const ciudadesDelPais = ciudadPaisSeleccionado
        ? ciudades.filter(c => c.paisId === ciudadPaisSeleccionado)
        : [];

    if (!fontsLoaded || loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={COLORS.accent} />
                <Text style={{ marginTop: normalize(15), color: COLORS.textSec, fontFamily: FONTS.textMedium, fontSize: normalize(14) }}>
                    Cargando ubicaciones...
                </Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.container}>
                    <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
                            <Ionicons name="chevron-back" size={normalize(24)} color={COLORS.text} />
                        </TouchableOpacity>
                        <View style={{ alignItems: 'center' }}>
                            <Text style={styles.headerSubtitle}>ADMINISTRACIÓN</Text>
                            <Text style={styles.headerTitle}>UBICACIONES</Text>
                        </View>
                        <TouchableOpacity onPress={onRefresh} style={styles.headerBtn}>
                            <Ionicons name="refresh-outline" size={normalize(22)} color={COLORS.accent} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        onScrollBeginDrag={Keyboard.dismiss}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
                    >
                        {/* --- PAÍSES --- */}
                        <View style={styles.sectionHeaderRow}>
                            <Ionicons name="flag-outline" size={normalize(18)} color={COLORS.accent} />
                            <Text style={styles.sectionTitle}>PAÍSES</Text>
                            <View style={styles.countBadge}>
                                <Text style={styles.countText}>{paises.length}</Text>
                            </View>
                        </View>

                        <View style={styles.addRow}>
                            <View style={styles.inputGroup}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Nombre país"
                                    placeholderTextColor={COLORS.textSec}
                                    value={nuevoPais}
                                    onChangeText={setNuevoPais}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Código (MX)"
                                    placeholderTextColor={COLORS.textSec}
                                    value={nuevoCodigo}
                                    onChangeText={setNuevoCodigo}
                                    autoCapitalize="characters"
                                    maxLength={3}
                                />
                            </View>
                            <TouchableOpacity
                                style={styles.addBtn}
                                onPress={handleAgregarPais}
                                disabled={guardandoPais}
                            >
                                {guardandoPais ? (
                                    <ActivityIndicator color="#000" size="small" />
                                ) : (
                                    <Ionicons name="add" size={normalize(22)} color="#000" />
                                )}
                            </TouchableOpacity>
                        </View>

                        {paises.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Ionicons name="flag-outline" size={normalize(44)} color={COLORS.border} />
                                <Text style={styles.emptyText}>Aún no hay países registrados.</Text>
                            </View>
                        ) : (
                            paises.map((pais) => (
                                <View key={pais.id} style={styles.itemCard}>
                                    {pais.codigo ? (
                                        <View style={styles.itemCodeChip}>
                                            <Text style={styles.itemCodeText}>{pais.codigo}</Text>
                                        </View>
                                    ) : (
                                        <Ionicons name="flag" size={normalize(16)} color={COLORS.accent} />
                                    )}
                                    <Text style={styles.itemTitle} numberOfLines={1}>{pais.nombre}</Text>
                                    <TouchableOpacity
                                        onPress={() => handleEliminarPais(pais)}
                                        style={styles.deleteBtn}
                                    >
                                        <Ionicons name="trash-outline" size={normalize(18)} color="#ff4444" />
                                    </TouchableOpacity>
                                </View>
                            ))
                        )}

                        {/* --- CIUDADES --- */}
                        <View style={[styles.sectionHeaderRow, styles.sectionSpacing]}>
                            <Ionicons name="location-outline" size={normalize(18)} color={COLORS.pink} />
                            <Text style={styles.sectionTitle}>CIUDADES</Text>
                            <View style={styles.countBadge}>
                                <Text style={styles.countText}>{ciudadesDelPais.length}</Text>
                            </View>
                        </View>

                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.paisChipsRow}
                            contentContainerStyle={{ gap: normalize(8) }}
                        >
                            {paises.map((pais) => (
                                <TouchableOpacity
                                    key={pais.id}
                                    onPress={() => setCiudadPaisSeleccionado(pais.id)}
                                    style={[
                                        styles.paisChip,
                                        ciudadPaisSeleccionado === pais.id && styles.paisChipActive
                                    ]}
                                >
                                    <Text style={[
                                        styles.paisChipText,
                                        ciudadPaisSeleccionado === pais.id && styles.paisChipTextActive
                                    ]}>
                                        {pais.nombre}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <View style={styles.addRow}>
                            <TextInput
                                style={styles.input}
                                placeholder={ciudadPaisSeleccionado ? "Ej: Cartagena" : "Selecciona un país primero"}
                                placeholderTextColor={COLORS.textSec}
                                value={nuevaCiudad}
                                onChangeText={setNuevaCiudad}
                                editable={!!ciudadPaisSeleccionado}
                            />
                            <TouchableOpacity
                                style={[styles.addBtn, !ciudadPaisSeleccionado && styles.addBtnDisabled]}
                                onPress={handleAgregarCiudad}
                                disabled={guardandoCiudad || !ciudadPaisSeleccionado}
                            >
                                {guardandoCiudad ? (
                                    <ActivityIndicator color="#000" size="small" />
                                ) : (
                                    <Ionicons name="add" size={normalize(22)} color="#000" />
                                )}
                            </TouchableOpacity>
                        </View>

                        {ciudadesDelPais.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Ionicons name="location-outline" size={normalize(44)} color={COLORS.border} />
                                <Text style={styles.emptyText}>No hay ciudades para este país.</Text>
                            </View>
                        ) : (
                            ciudadesDelPais.map((ciudad) => (
                                <View key={ciudad.id} style={styles.itemCard}>
                                    <Ionicons name="location-sharp" size={normalize(16)} color={COLORS.pink} />
                                    <Text style={styles.itemTitle} numberOfLines={1}>{ciudad.nombre}</Text>
                                    <TouchableOpacity
                                        onPress={() => handleEliminarCiudad(ciudad)}
                                        style={styles.deleteBtn}
                                    >
                                        <Ionicons name="trash-outline" size={normalize(18)} color="#ff4444" />
                                    </TouchableOpacity>
                                </View>
                            ))
                        )}

                        <View style={{ height: normalize(40) }} />
                    </ScrollView>
                </View>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
}

const getResponsiveStyles = (width: number, topInset: number) => {
    const scale = width / 375;
    const normalize = (size: number) => Math.round(size * scale);

    return StyleSheet.create({
        container: { flex: 1, backgroundColor: COLORS.background },

        header: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: normalize(20),
            paddingBottom: normalize(20),
            paddingTop: topInset + normalize(10),
            backgroundColor: COLORS.background,
        },
        headerSubtitle: { fontFamily: FONTS.textBold, fontSize: normalize(10), color: COLORS.accent, letterSpacing: 2, marginBottom: 2 },
        headerTitle: { fontFamily: FONTS.title, fontSize: normalize(18), color: COLORS.text },
        headerBtn: {
            padding: normalize(10),
            backgroundColor: COLORS.cardBg,
            borderRadius: normalize(12),
            borderWidth: 1,
            borderColor: COLORS.border
        },

        scrollContent: { padding: normalize(20) },

        sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: normalize(15) },
        sectionSpacing: { marginTop: normalize(30) },
        sectionTitle: { fontFamily: FONTS.textBold, fontSize: normalize(12), color: COLORS.textSec, letterSpacing: 1.5, marginLeft: normalize(8) },
        countBadge: { backgroundColor: COLORS.border, paddingHorizontal: normalize(8), paddingVertical: normalize(2), borderRadius: normalize(6), marginLeft: normalize(10) },
        countText: { color: COLORS.text, fontSize: normalize(10), fontFamily: FONTS.textBold },

        addRow: { flexDirection: 'row', gap: normalize(8), marginBottom: normalize(20) },
        inputGroup: { flex: 1, flexDirection: 'row', gap: normalize(8) },
        input: {
            flex: 1,
            backgroundColor: COLORS.cardBg,
            borderRadius: normalize(12),
            padding: normalize(14),
            color: COLORS.text,
            fontFamily: FONTS.textRegular,
            borderWidth: 1,
            borderColor: COLORS.border,
        },
        addBtn: {
            width: normalize(48),
            backgroundColor: COLORS.accent,
            borderRadius: normalize(12),
            justifyContent: 'center',
            alignItems: 'center',
        },
        addBtnDisabled: { opacity: 0.4 },

        itemCard: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: COLORS.cardBg,
            borderRadius: normalize(14),
            padding: normalize(14),
            marginBottom: normalize(10),
            borderWidth: 1,
            borderColor: COLORS.border,
            gap: normalize(10),
        },
        itemCodeChip: {
            width: normalize(40),
            height: normalize(34),
            borderRadius: normalize(10),
            backgroundColor: 'rgba(1, 195, 142, 0.1)',
            borderWidth: 1,
            borderColor: 'rgba(1, 195, 142, 0.3)',
            justifyContent: 'center',
            alignItems: 'center',
        },
        itemCodeText: { color: COLORS.accent, fontFamily: FONTS.textBold, fontSize: normalize(11), letterSpacing: 1 },
        itemTitle: { flex: 1, color: COLORS.text, fontFamily: FONTS.textMedium, fontSize: normalize(14) },
        deleteBtn: {
            padding: normalize(6),
            backgroundColor: 'rgba(255, 68, 68, 0.1)',
            borderRadius: normalize(8),
            borderWidth: 1,
            borderColor: 'rgba(255, 68, 68, 0.2)'
        },

        paisChipsRow: { marginBottom: normalize(15), flexGrow: 0 },
        paisChip: {
            paddingVertical: normalize(8),
            paddingHorizontal: normalize(14),
            backgroundColor: COLORS.cardBg,
            borderRadius: normalize(20),
            borderWidth: 1,
            borderColor: COLORS.border,
        },
        paisChipActive: { backgroundColor: COLORS.pink, borderColor: COLORS.pink },
        paisChipText: { color: COLORS.textSec, fontFamily: FONTS.textMedium, fontSize: normalize(12) },
        paisChipTextActive: { color: '#000', fontFamily: FONTS.textBold },

        emptyState: { alignItems: 'center', marginTop: normalize(40), opacity: 0.5, marginBottom: normalize(20) },
        emptyText: { color: COLORS.textSec, marginTop: normalize(12), fontFamily: FONTS.textMedium, fontSize: normalize(13) },
    });
};
