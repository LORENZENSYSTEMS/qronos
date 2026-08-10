import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Keyboard,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCompanies } from '../../../hooks/useCompanies';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const COLORS = {
    background: '#0f1115',
    cardBg: '#181b21',
    accent: '#01c38e',
    text: '#ffffff',
    textSec: '#8b9bb4',
    border: '#232936',
    gold: '#D4AF37',
    pink: '#E1306C'
};

const FONTS = {
    title: 'Heavitas',
    textRegular: 'Poppins-Regular',
    textMedium: 'Poppins-Medium',
    textBold: 'Poppins-Bold'
};

interface Categoria {
    id: number;
    nombre: string;
}

export default function CatalogoScreen() {
    const router = useRouter();
    const safeAreaInsets = useSafeAreaInsets();
    const { width } = useWindowDimensions();

    const { data: stores = [], isLoading: loadingStores, refetch: refetchStores, isFetching } = useCompanies();

    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [destacadas, setDestacadas] = useState<number[]>([]);

    const [nuevaCategoria, setNuevaCategoria] = useState('');
    const [guardandoCategoria, setGuardandoCategoria] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

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

    const loading = loadingStores || refreshing;
    const isFetchingStores = isFetching || refreshing;

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
            const [categoriasRes, destacadasRes] = await Promise.all([
                fetch(`${API_URL}/api/categorias`),
                fetch(`${API_URL}/api/empresas/destacadas`),
            ]);

            if (categoriasRes.ok) {
                const data = await categoriasRes.json();
                const lista = Array.isArray(data) ? data : (data.categorias || []);
                setCategorias(lista.map((c: any) => ({ id: c.categoria_id, nombre: c.nombre })));
            }

            if (destacadasRes.ok) {
                const data = await destacadasRes.json();
                const lista = Array.isArray(data) ? data : (data.empresas || []);
                setDestacadas(lista.filter((e: any) => e.destacada && e.activo !== false).map((e: any) => e.empresa_id));
            }
        } catch (error) {
            console.error("Error de red:", error);
            Alert.alert("Error", "Revisa tu conexión.");
        } finally {
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
        refetchStores();
    };

    const handleAgregarCategoria = async () => {
        const nombre = nuevaCategoria.trim();
        if (!nombre) {
            Alert.alert("Campo vacío", "Escribe el nombre de la categoría.");
            return;
        }

        setGuardandoCategoria(true);
        try {
            const response = await fetch(`${API_URL}/api/categorias`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre }),
            });

            if (response.ok) {
                const categoria = await response.json();
                setCategorias(prev => [...prev, { id: categoria.categoria_id, nombre: categoria.nombre }]);
                setNuevaCategoria('');
            } else {
                const err = await response.json();
                Alert.alert("Error", err.message || "No se pudo agregar la categoría.");
            }
        } catch (error) {
            console.error("Error al agregar categoría:", error);
            Alert.alert("Error", "Error de conexión.");
        } finally {
            setGuardandoCategoria(false);
        }
    };

    const handleEliminarCategoria = (categoria: Categoria) => {
        Alert.alert(
            "Eliminar Categoría",
            `¿Eliminar "${categoria.nombre}"?`,
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Eliminar",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const response = await fetch(`${API_URL}/api/categorias/${categoria.id}`, { method: 'DELETE' });

                            if (response.ok) {
                                setCategorias(prev => prev.filter(c => c.id !== categoria.id));
                            } else {
                                const err = await response.json();
                                Alert.alert("Error", err.message || "No se pudo eliminar la categoría.");
                            }
                        } catch (error) {
                            console.error("Error al eliminar categoría:", error);
                            Alert.alert("Error", "Error de conexión.");
                        }
                    }
                }
            ]
        );
    };

    const handleToggleDestacada = async (store: any) => {
        const esDestacada = destacadas.includes(store.id);
        const proximoEstado = !esDestacada;

        setDestacadas(prev =>
            proximoEstado ? [...prev, store.id] : prev.filter(id => id !== store.id)
        );

        try {
            const response = await fetch(`${API_URL}/api/empresas/${store.id}/destacar`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ destacada: proximoEstado }),
            });

            if (!response.ok) {
                const err = await response.json();
                setDestacadas(prev =>
                    proximoEstado ? prev.filter(id => id !== store.id) : [...prev, store.id]
                );
                Alert.alert("Error", err.message || "No se pudo actualizar la tienda.");
            }
        } catch (error) {
            setDestacadas(prev =>
                proximoEstado ? prev.filter(id => id !== store.id) : [...prev, store.id]
            );
            console.error("Error al cambiar destacada:", error);
            Alert.alert("Error", "Error de conexión.");
        }
    };

    if (!fontsLoaded) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={COLORS.accent} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

            <View style={styles.header}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
                            <Ionicons name="chevron-back" size={normalize(24)} color={COLORS.text} />
                        </TouchableOpacity>
                        <View style={{ alignItems: 'center' }}>
                            <Text style={styles.headerSubtitle}>ADMINISTRACIÓN</Text>
                            <Text style={styles.headerTitle}>CATÁLOGO</Text>
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
                        refreshControl={<RefreshControl refreshing={isFetchingStores} onRefresh={onRefresh} tintColor={COLORS.accent} />}
                    >
                        {/* --- CATEGORÍAS --- */}
                        <View style={styles.sectionHeaderRow}>
                            <Ionicons name="pricetags-outline" size={normalize(18)} color={COLORS.accent} />
                            <Text style={styles.sectionTitle}>CATEGORÍAS</Text>
                            <View style={styles.countBadge}>
                                <Text style={styles.countText}>{categorias.length}</Text>
                            </View>
                        </View>

                        <View style={styles.addRow}>
                            <TextInput
                                style={styles.input}
                                placeholder="Ej: Restaurantes"
                                placeholderTextColor={COLORS.textSec}
                                value={nuevaCategoria}
                                onChangeText={setNuevaCategoria}
                            />
                            <TouchableOpacity
                                style={styles.addBtn}
                                onPress={handleAgregarCategoria}
                                disabled={guardandoCategoria}
                            >
                                {guardandoCategoria ? (
                                    <ActivityIndicator color="#000" size="small" />
                                ) : (
                                    <Ionicons name="add" size={normalize(22)} color="#000" />
                                )}
                            </TouchableOpacity>
                        </View>

                        {categorias.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Ionicons name="pricetags-outline" size={normalize(44)} color={COLORS.border} />
                                <Text style={styles.emptyText}>Aún no hay categorías registradas.</Text>
                            </View>
                        ) : (
                            categorias.map((categoria) => (
                                <View key={categoria.id} style={styles.itemCard}>
                                    <View style={styles.itemIcon}>
                                        <Ionicons name="pricetag" size={normalize(16)} color={COLORS.accent} />
                                    </View>
                                    <Text style={styles.itemTitle} numberOfLines={1}>{categoria.nombre}</Text>
                                    <TouchableOpacity
                                        onPress={() => handleEliminarCategoria(categoria)}
                                        style={styles.deleteBtn}
                                    >
                                        <Ionicons name="trash-outline" size={normalize(18)} color="#ff4444" />
                                    </TouchableOpacity>
                                </View>
                            ))
                        )}

                        {/* --- TIENDAS DESTACADAS --- */}
                        <View style={[styles.sectionHeaderRow, styles.sectionSpacing]}>
                            <Ionicons name="star-outline" size={normalize(18)} color={COLORS.gold} />
                            <Text style={styles.sectionTitle}>TIENDAS DESTACADAS</Text>
                            <View style={styles.countBadge}>
                                <Text style={styles.countText}>{destacadas.length}</Text>
                            </View>
                        </View>
                        <Text style={styles.sectionHint}>Toca la estrella para marcar o desmarcar una tienda como destacada.</Text>

                        {loading ? (
                            <View style={styles.loadingState}>
                                <ActivityIndicator size="large" color={COLORS.accent} />
                            </View>
                        ) : stores.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Ionicons name="storefront-outline" size={normalize(44)} color={COLORS.border} />
                                <Text style={styles.emptyText}>No hay tiendas registradas.</Text>
                            </View>
                        ) : (
                            stores.map((store) => {
                                const esDestacada = destacadas.includes(store.id);
                                return (
                                    <View key={store.id} style={styles.storeCard}>
                                        <View style={[styles.itemIcon, esDestacada && styles.itemIconActive]}>
                                            <Ionicons name="storefront" size={normalize(16)} color={esDestacada ? '#000' : COLORS.textSec} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.itemTitle} numberOfLines={1}>{store.titulo}</Text>
                                            <Text style={styles.itemSubtitle} numberOfLines={1}>
                                                {store.categoria} • {store.ciudad}, {store.pais}
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            onPress={() => handleToggleDestacada(store)}
                                            style={[styles.starBtn, esDestacada && styles.starBtnActive]}
                                        >
                                            <Ionicons
                                                name={esDestacada ? "star" : "star-outline"}
                                                size={normalize(20)}
                                                color={esDestacada ? '#000' : COLORS.gold}
                                            />
                                        </TouchableOpacity>
                                    </View>
                                );
                            })
                        )}

                        <View style={{ height: normalize(40) }} />
                    </ScrollView>
        </View>
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
        sectionHint: { fontSize: normalize(11), color: COLORS.textSec, fontFamily: FONTS.textRegular, marginBottom: normalize(15), opacity: 0.7 },
        countBadge: { backgroundColor: COLORS.border, paddingHorizontal: normalize(8), paddingVertical: normalize(2), borderRadius: normalize(6), marginLeft: normalize(10) },
        countText: { color: COLORS.text, fontSize: normalize(10), fontFamily: FONTS.textBold },

        addRow: { flexDirection: 'row', gap: normalize(8), marginBottom: normalize(20) },
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
        itemIcon: {
            width: normalize(34),
            height: normalize(34),
            borderRadius: normalize(10),
            backgroundColor: 'rgba(255,255,255,0.04)',
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: COLORS.border,
        },
        itemIconActive: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
        itemTitle: { flex: 1, color: COLORS.text, fontFamily: FONTS.textMedium, fontSize: normalize(14) },
        itemSubtitle: { color: COLORS.textSec, fontFamily: FONTS.textRegular, fontSize: normalize(11), marginTop: 2 },
        deleteBtn: {
            padding: normalize(6),
            backgroundColor: 'rgba(255, 68, 68, 0.1)',
            borderRadius: normalize(8),
            borderWidth: 1,
            borderColor: 'rgba(255, 68, 68, 0.2)'
        },

        storeCard: {
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
        starBtn: {
            padding: normalize(8),
            backgroundColor: 'rgba(212, 175, 55, 0.1)',
            borderRadius: normalize(10),
            borderWidth: 1,
            borderColor: 'rgba(212, 175, 55, 0.3)'
        },
        starBtnActive: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },

        loadingState: { alignItems: 'center', marginTop: normalize(40) },
        emptyState: { alignItems: 'center', marginTop: normalize(40), opacity: 0.5, marginBottom: normalize(20) },
        emptyText: { color: COLORS.textSec, marginTop: normalize(12), fontFamily: FONTS.textMedium, fontSize: normalize(13) },
    });
};
