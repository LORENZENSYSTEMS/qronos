import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    ScrollView,
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

interface Categoria {
    categoria_prod_id: number;
    nombre: string;
}

interface Producto {
    producto_id: number;
    nombre: string;
    precio: number;
    imagenUrl: string;
    descripcion: string;
    categoria_prod_id?: number | null;
    categoria_rel?: Categoria;
}

export default function ProductsScreen() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const isTablet = width >= 768;

    const [productos, setProductos] = useState<Producto[]>([]);
    const [categoriasDisponibles, setCategoriasDisponibles] = useState<Categoria[]>([]);
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [empresaId, setEmpresaId] = useState<string | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [productToEdit, setProductToEdit] = useState<Producto | null>(null);

    // Cargar productos y extraer categorías automáticamente con logs
    const fetchProductos = async (id: string) => {
        try {
            const API_URL = process.env.EXPO_PUBLIC_API_URL;
            console.log(`🔍 [DEBUG] Consultando API: ${API_URL}/api/empresas/${id}/productos`);
            
            const response = await fetch(`${API_URL}/api/empresas/${id}/productos`);
            if (response.ok) {
                const data = await response.json();
                console.log(`📦 [DEBUG] Productos totales recibidos (${data.length}):`, JSON.stringify(data, null, 2));

                setProductos(data);

                // Extraer categorías únicas de los productos obtenidos
                const catsMap = new Map();
                data.forEach((p: Producto, index: number) => {
                    console.log(`🔍 [DEBUG] Producto [${index}] -> Nombre: "${p.nombre}" | categoria_prod_id: ${p.categoria_prod_id} | categoria_rel:`, p.categoria_rel);
                    if (p.categoria_rel && p.categoria_prod_id) {
                        catsMap.set(p.categoria_prod_id, p.categoria_rel);
                    }
                });

                const categoriasExtraidas = Array.from(catsMap.values());
                console.log(`🏷️ [DEBUG] Categorías finales detectadas para la barra superior:`, categoriasExtraidas);
                
                setCategoriasDisponibles(categoriasExtraidas);
            } else {
                const errorText = await response.text();
                console.error("❌ [DEBUG] Error HTTP en productos:", response.status, errorText);
            }
        } catch (error) {
            console.error("❌ [DEBUG] Network error fetching products:", error);
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

    const handleEditProduct = (producto: Producto) => {
        setProductToEdit(producto);
        setModalVisible(true);
    };

    const handleAddNewProduct = () => {
        setProductToEdit(null);
        setModalVisible(true);
    };

    // Filtrar productos según la categoría seleccionada
    const productosFiltrados = categoriaSeleccionada === null 
        ? productos 
        : productos.filter(p => p.categoria_prod_id === categoriaSeleccionada);

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
                {/* --- PESTAÑAS DE CATEGORÍAS (SUPERIOR) --- */}
                {categoriasDisponibles.length > 0 && (
                    <View style={styles.categoriasWrapper}>
                        <ScrollView 
                            horizontal 
                            showsHorizontalScrollIndicator={false} 
                            contentContainerStyle={styles.categoriasScroll}
                        >
                            <TouchableOpacity
                                style={[
                                    styles.categoriaTab,
                                    categoriaSeleccionada === null && styles.categoriaTabActive
                                ]}
                                onPress={() => setCategoriaSeleccionada(null)}
                            >
                                <Text style={[
                                    styles.categoriaTabText,
                                    categoriaSeleccionada === null && styles.categoriaTabTextActive
                                ]}>
                                    Todas
                                </Text>
                            </TouchableOpacity>

                            {categoriasDisponibles.map((cat) => {
                                const isActive = categoriaSeleccionada === cat.categoria_prod_id;
                                return (
                                    <TouchableOpacity
                                        key={cat.categoria_prod_id}
                                        style={[styles.categoriaTab, isActive && styles.categoriaTabActive]}
                                        onPress={() => setCategoriaSeleccionada(cat.categoria_prod_id)}
                                    >
                                        <Text style={[styles.categoriaTabText, isActive && styles.categoriaTabTextActive]}>
                                            {cat.nombre}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                )}

                <FlatList
                    data={productosFiltrados}
                    keyExtractor={(item) => item.producto_id.toString()}
                    renderItem={({ item }) => (
                        <View style={isTablet ? { width: '48%' } : { width: '100%' }}>
                            <ProductCard
                                producto_id={item.producto_id}
                                nombre={item.nombre}
                                precio={item.precio}
                                descripcion={item.descripcion}
                                imagenUrl={item.imagenUrl}
                                categoriaNombre={item.categoria_rel?.nombre}
                                onDeleteSuccess={(id) => {
                                    setProductos(prev => {
                                        const nuevosProductos = prev.filter(p => p.producto_id !== id);
                                        return nuevosProductos;
                                    });
                                }}
                                onEdit={() => handleEditProduct(item)}
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
                            <Text style={styles.emptyText}>No hay productos en esta categoría.</Text>
                            <Text style={styles.emptySubtext}>Añade productos o selecciona otra categoría arriba.</Text>
                        </View>
                    }
                />
            </View>

            <TouchableOpacity
                style={styles.fab}
                onPress={handleAddNewProduct}
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
                    productToEdit={productToEdit}
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
    categoriasWrapper: {
        paddingVertical: 10,
        marginBottom: 5,
    },
    categoriasScroll: {
        alignItems: 'center',
    },
    categoriaTab: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: COLORS.cardBg,
        borderRadius: 20,
        marginRight: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    categoriaTabActive: {
        backgroundColor: COLORS.accent,
        borderColor: COLORS.accent,
    },
    categoriaTabText: {
        color: COLORS.textSec,
        fontFamily: FONTS.textMedium,
        fontSize: 13,
        textTransform: 'capitalize',
    },
    categoriaTabTextActive: {
        color: '#000000',
        fontFamily: FONTS.textBold,
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