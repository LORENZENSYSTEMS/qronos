import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ProductCard from '../../../components/products/ProductCard';
import ProductFormModal from '../../../components/products/ProductFormModal';

const COLORS = {
    background: '#090a0c',
    cardBg: '#13151a',
    accent: '#01c38e',
    text: '#ffffff',
    textSec: '#9ca3af',
    border: '#1f2229',
};

const FONTS = {
    title: 'Heavitas',
    textRegular: 'Poppins-Regular',
    textMedium: 'Poppins-Medium',
    textBold: 'Poppins-Bold'
};

interface Producto {
    producto_id: number;
    nombre: string;
    precio: number;
    imagenUrl: string;
    descripcion: string;
}

export default function ProductsScreen() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const isTablet = width >= 768;

    const [productos, setProductos] = useState<Producto[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [empresaId, setEmpresaId] = useState<string | null>(null);
    const [modalVisible, setModalVisible] = useState(false);

    const fetchProductos = async (id: string) => {
        try {
            const API_URL = process.env.EXPO_PUBLIC_API_URL;
            const response = await fetch(`${API_URL}/api/empresas/${id}/productos`);
            if (response.ok) {
                const data = await response.json();
                setProductos(data);
            } else {
                console.error("Error fetching products:", await response.text());
            }
        } catch (error) {
            console.error("Network error fetching products:", error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        const loadEmpresa = async () => {
            const id = await SecureStore.getItemAsync('empresa_id');
            if (id) {
                setEmpresaId(id);
                fetchProductos(id);
            } else {
                setIsLoading(false);
                Alert.alert("Error", "No se encontró información de la empresa.");
                router.back();
            }
        };
        loadEmpresa();
    }, []);

    const onRefresh = () => {
        if (empresaId) {
            setIsRefreshing(true);
            fetchProductos(empresaId);
        }
    };

    if (isLoading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={COLORS.accent} />
            </View>
        );
    }

    return (
        <View style={[styles.safeArea, { marginTop: insets.top }]}>
            <StatusBar barStyle="light-content" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerSubtitle}>GESTIÓN DE</Text>
                    <Text style={styles.headerTitle}>PRODUCTOS</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.container}>
                <FlatList
                    data={productos}
                    keyExtractor={(item) => item.producto_id.toString()}
                    renderItem={({ item }) => (
                        <View style={isTablet ? { width: '48%' } : { width: '100%' }}>
                            <ProductCard
                                producto_id={item.producto_id}
                                nombre={item.nombre}
                                precio={item.precio}
                                descripcion={item.descripcion}
                                imagenUrl={item.imagenUrl}
                                onDeleteSuccess={(id) => {
                                    setProductos(prev => prev.filter(p => p.producto_id !== id));
                                }}
                            />
                        </View>
                    )}
                    numColumns={isTablet ? 2 : 1}
                    columnWrapperStyle={isTablet ? { justifyContent: 'space-between' } : null}
                    contentContainerStyle={styles.listContent}
                    onRefresh={onRefresh}
                    refreshing={isRefreshing}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="cube-outline" size={60} color={COLORS.border} />
                            <Text style={styles.emptyText}>No tienes productos registrados.</Text>
                            <Text style={styles.emptySubtext}>Añade tu primer producto para que los clientes puedan verlo.</Text>
                        </View>
                    }
                />
            </View>

            <TouchableOpacity
                style={styles.fab}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.8}
            >
                <Ionicons name="add" size={32} color="#000" />
            </TouchableOpacity>

            {empresaId && (
                <ProductFormModal
                    visible={modalVisible}
                    onClose={() => setModalVisible(false)}
                    onSuccess={() => empresaId && fetchProductos(empresaId)}
                    empresaId={empresaId}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    center: {
        flex: 1,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        justifyContent: 'space-between',
    },
    backBtn: {
        padding: 8,
        borderRadius: 12,
        backgroundColor: COLORS.cardBg,
    },
    headerTitleContainer: {
        alignItems: 'center',
    },
    headerSubtitle: {
        fontFamily: FONTS.textBold,
        fontSize: 10,
        color: COLORS.accent,
        letterSpacing: 3,
    },
    headerTitle: {
        fontFamily: FONTS.title,
        fontSize: 22,
        color: COLORS.text,
    },
    container: {
        flex: 1,
        paddingHorizontal: 20,
    },
    listContent: {
        paddingTop: 10,
        paddingBottom: 100,
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 60,
        paddingHorizontal: 40,
    },
    emptyText: {
        color: COLORS.text,
        fontFamily: FONTS.textBold,
        fontSize: 18,
        marginTop: 20,
        textAlign: 'center',
    },
    emptySubtext: {
        color: COLORS.textSec,
        fontFamily: FONTS.textRegular,
        fontSize: 14,
        textAlign: 'center',
        marginTop: 10,
    },
    fab: {
        position: 'absolute',
        bottom: 30,
        right: 30,
        backgroundColor: COLORS.accent,
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: COLORS.accent,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    }
});
