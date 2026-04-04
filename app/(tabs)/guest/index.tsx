import { Ionicons } from '@expo/vector-icons';
import { CommonActions } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { useNavigation, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, Linking, Modal, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

// --- PALETA DE COLORES (COPIADA DE DASHBOARD) ---
const COLORS = {
    background: '#090a0c',
    cardBg: '#13151a',
    accent: '#01c38e',
    secondaryAccent: '#4a5568',
    text: '#ffffff',
    textSec: '#9ca3af',
    border: '#1f2229',
    overlay: 'rgba(0,0,0,0.6)',
    gold: '#D4AF37',
};

const FONTS = {
    title: 'Heavitas',
    textRegular: 'Poppins-Regular',
    textMedium: 'Poppins-Medium',
    textBold: 'Poppins-Bold'
};

type Category = 'Todos' | 'Restaurantes' | 'Tiendas' | 'Bar' | string;
const CATEGORIES: Category[] = ['Todos', 'Restaurantes', 'Bar', "Tiendas"];

const COUNTRIES_CONFIG: { [key: string]: string[] } = {
    'Colombia': ['Todas', 'Cartagena', 'Barranquilla'],
    'España': ['Todas', 'Madrid'],
};

const COUNTRIES_LIST = Object.keys(COUNTRIES_CONFIG);

interface Lugar {
    id: number;
    titulo: string;
    descripcion: string;
    imagen: string | null;
    categoria: string;
    pais: string;
    ciudad: string;
    descuentos?: string | null;
    mapLink?: string | null;
    img1?: string | null;
    img2?: string | null;
    img3?: string | null;
}

export default function GuestIndex() {
    const router = useRouter();
    const navigation = useNavigation();
    const safeAreaInsets = useSafeAreaInsets();

    const [lugares, setLugares] = useState<Lugar[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [fontsLoaded] = useFonts({
        'Heavitas': require('../../../assets/fonts/Heavitas.ttf'),
        'Poppins-Regular': require('../../../assets/fonts/Poppins-Regular.ttf'),
        'Poppins-Medium': require('../../../assets/fonts/Poppins-Medium.ttf'),
        'Poppins-Bold': require('../../../assets/fonts/Poppins-Bold.ttf'),
    });

    const [selectedLugar, setSelectedLugar] = useState<Lugar | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<Category>('Todos');
    const [selectedCountry, setSelectedCountry] = useState<string>('Colombia');
    const [isCountryMenuOpen, setIsCountryMenuOpen] = useState(false);
    const [selectedCity, setSelectedCity] = useState<string>('Todas');
    const [isCityMenuOpen, setIsCityMenuOpen] = useState(false);

    const fetchLugares = async () => {
        try {
            const baseUrl = process.env.EXPO_PUBLIC_API_URL;

            // Llamada directa a la API sin JWT como pidió el usuario
            const response = await fetch(`${baseUrl}/api/empresa`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const data = await response.json();

            if (!Array.isArray(data)) {
                console.error("Error: La API no devolvió un array. Devolvió:", data);
                return;
            }

            const formattedData = data.map((item: any) => ({
                id: item.empresa_id,
                titulo: item.nombreCompleto,
                descripcion: item.descripcion || "Sin descripción",
                imagen: item.fotoPerfil,
                categoria: item.categoria || 'Varios',
                pais: item.pais,
                ciudad: item.ciudad,
                descuentos: item.descuento,
                mapLink: item.ubicacionMaps,
                img1: item.fotoDescripcion1,
                img2: item.fotoDescripcion2,
                img3: item.fotoDescripcion3,
            }));

            setLugares(formattedData);

        } catch (error) {
            console.error("Error en fetchLugares (Guest):", error);
            if (!refreshing) Alert.alert("Error", "No se pudieron cargar las empresas.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchLugares();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchLugares();
    };

    const availableCities = useMemo(() => {
        return COUNTRIES_CONFIG[selectedCountry] || ['Todas'];
    }, [selectedCountry]);

    const filteredLugares = useMemo(() => {
        return lugares.filter(lugar => {
            const matchCountry = lugar.pais?.toLowerCase() === selectedCountry.toLowerCase();
            const matchCity = selectedCity === 'Todas' || lugar.ciudad?.toLowerCase() === selectedCity.toLowerCase();
            const matchCategory = selectedCategory === 'Todos' || lugar.categoria?.toLowerCase() === selectedCategory.toLowerCase();
            return matchCountry && matchCity && matchCategory;
        });
    }, [selectedCategory, selectedCity, selectedCountry, lugares]);

    const handleCountryChange = (country: string) => {
        setSelectedCountry(country);
        setSelectedCity('Todas');
        setIsCountryMenuOpen(false);
    };

    const handleOpenMaps = async (mapLink?: string | null) => {
        if (!mapLink) {
            Alert.alert("Aviso", "Esta empresa no ha registrado su ubicación.");
            return;
        }
        const supported = await Linking.canOpenURL(mapLink);
        if (supported) await Linking.openURL(mapLink);
        else await Linking.openURL(mapLink);
    };

    const getImageSource = (img: string | null | undefined) => {
        if (!img) return { uri: 'https://via.placeholder.com/400x300.png?text=Qronnos' };
        return { uri: img };
    };

    if (!fontsLoaded || loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={COLORS.accent} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

            {/* HEADER DE INVITADO */}
            <View style={[styles.header, { paddingTop: safeAreaInsets.top + 10 }]}>
                <View style={styles.headerTopRow}>
                    <TouchableOpacity
                        onPress={() =>
                            navigation.dispatch(
                                CommonActions.reset({
                                    index: 0,
                                    routes: [{ name: 'index' }],
                                })
                            )
                        }
                        style={styles.backButton}
                    >
                        <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                    </TouchableOpacity>

                    <View style={{ alignItems: 'center', flex: 1 }}>
                        <Text style={styles.headerSubtitle}>PERFIL DE INVITADO</Text>
                        <Text style={styles.headerTitle}>QRONNOS</Text>
                    </View>

                    <View style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }}>
                        <Ionicons name="person-circle-outline" size={32} color={COLORS.accent} />
                    </View>
                </View>

                <View style={styles.locationFiltersContainer}>
                    <TouchableOpacity
                        style={styles.countrySelectorBtn}
                        onPress={() => {
                            setIsCountryMenuOpen(!isCountryMenuOpen);
                            setIsCityMenuOpen(false);
                        }}
                    >
                        <Ionicons name="globe-outline" size={12} color={COLORS.textSec} />
                        <Text style={styles.countrySelectorText}>{selectedCountry}</Text>
                        <Ionicons name="chevron-down" size={10} color={COLORS.textSec} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.citySelectorBtn}
                        onPress={() => {
                            setIsCityMenuOpen(!isCityMenuOpen);
                            setIsCountryMenuOpen(false);
                        }}
                    >
                        <Ionicons name="location-sharp" size={16} color={COLORS.accent} />
                        <Text style={styles.citySelectorText}>
                            {selectedCity === 'Todas' ? `Explorando todo` : selectedCity}
                        </Text>
                        <Ionicons name="chevron-down" size={16} color={COLORS.textSec} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* MENUS DESPLEGABLES */}
            {isCountryMenuOpen && (
                <View style={[styles.floatingDropdown, { top: safeAreaInsets.top + 110 }]}>
                    <Text style={styles.dropdownHeaderLabel}>Selecciona país</Text>
                    {COUNTRIES_LIST.map((pais) => (
                        <TouchableOpacity
                            key={pais}
                            style={styles.dropdownItem}
                            onPress={() => handleCountryChange(pais)}
                        >
                            <Text style={[styles.dropdownText, selectedCountry === pais && styles.activeDropdownText]}>
                                {pais}
                            </Text>
                            {selectedCountry === pais && <Ionicons name="checkmark" size={16} color={COLORS.accent} />}
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {isCityMenuOpen && (
                <View style={[styles.floatingDropdown, { top: safeAreaInsets.top + 155 }]}>
                    <Text style={styles.dropdownHeaderLabel}>Ciudades en {selectedCountry}</Text>
                    {availableCities.map((ciudad) => (
                        <TouchableOpacity
                            key={ciudad}
                            style={styles.dropdownItem}
                            onPress={() => { setSelectedCity(ciudad); setIsCityMenuOpen(false); }}
                        >
                            <Text style={[styles.dropdownText, selectedCity === ciudad && styles.activeDropdownText]}>
                                {ciudad}
                            </Text>
                            {selectedCity === ciudad && <Ionicons name="checkmark" size={16} color={COLORS.accent} />}
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />
                }
            >
                {/* BANNER DE INVITADO */}
                <View style={styles.guestBanner}>
                    <Text style={styles.guestBannerTitle}>¡Bienvenido!</Text>
                    <Text style={styles.guestBannerText}>Explora nuestro ecosistema como invitado. Regístrate para obtener beneficios exclusivos.</Text>
                    <TouchableOpacity onPress={() => router.push('/(tabs)/account/register')} style={styles.registerButton}>
                        <Text style={styles.registerButtonText}>Crear Cuenta</Text>
                    </TouchableOpacity>
                </View>

                {/* TABS DE CATEGORIAS */}
                <View style={styles.categoriesContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
                        {CATEGORIES.map((cat) => (
                            <TouchableOpacity
                                key={cat}
                                onPress={() => setSelectedCategory(cat)}
                                style={[styles.tabItem, selectedCategory === cat && styles.tabItemActive]}
                            >
                                <Text style={[styles.tabText, selectedCategory === cat && styles.tabTextActive]}>
                                    {cat}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* LISTA DE EMPRESAS */}
                <View style={styles.listContainer}>
                    <Text style={styles.resultsText}>
                        {filteredLugares.length} {filteredLugares.length === 1 ? 'Empresa disponible' : 'Empresas disponibles'}
                    </Text>

                    {filteredLugares.map((lugar) => {
                        const bgImage = lugar.img1 ? { uri: lugar.img1 } : getImageSource(lugar.imagen);

                        return (
                            <TouchableOpacity
                                key={lugar.id}
                                onPress={() => { setSelectedLugar(lugar); setModalVisible(true); }}
                                activeOpacity={0.9}
                                style={styles.premiumCard}
                            >
                                <View style={styles.cardHeaderWrapper}>
                                    <Image
                                        source={bgImage}
                                        style={[
                                            styles.cardAtmosphereImage,
                                            !lugar.img1 && { transform: [{ scale: 1.5 }], opacity: 0.15 }
                                        ]}
                                        resizeMode={lugar.img1 ? "cover" : "contain"}
                                        blurRadius={lugar.img1 ? 0 : 10}
                                    />
                                    <View style={styles.cardOverlay} />

                                    <View style={styles.cardTopBadges}>
                                        {lugar.descuentos && (
                                            <View style={styles.promoBadge}>
                                                <Text style={styles.promoText}>{lugar.descuentos}</Text>
                                            </View>
                                        )}
                                        <View style={styles.categoryBadge}>
                                            <Text style={styles.categoryBadgeText}>{lugar.categoria}</Text>
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.cardBody}>
                                    <View style={styles.logoMedallion}>
                                        <Image
                                            source={getImageSource(lugar.imagen)}
                                            style={styles.logoImage}
                                            resizeMode="contain"
                                        />
                                    </View>

                                    <View style={styles.cardInfo}>
                                        <Text style={styles.cardTitle}>{lugar.titulo}</Text>

                                        <View style={styles.locationRow}>
                                            <Ionicons name="location-sharp" size={12} color={COLORS.accent} />
                                            <Text style={styles.cardLocation}>{lugar.ciudad} • {lugar.pais}</Text>
                                        </View>

                                        <Text style={styles.cardDesc} numberOfLines={2}>
                                            {lugar.descripcion}
                                        </Text>

                                        <View style={styles.cardFooterBtn}>
                                            <Text style={styles.btnText}>Ver Detalles</Text>
                                            <Ionicons name="arrow-forward" size={14} color={COLORS.textSec} />
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        )
                    })}

                    {filteredLugares.length === 0 && (
                        <View style={styles.emptyState}>
                            <Ionicons name="planet-outline" size={40} color={COLORS.border} />
                            <Text style={styles.emptyText}>No hay empresas en esta zona.</Text>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* MODAL DETALLE */}
            <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalContainer}>
                    <TouchableOpacity style={styles.modalBackdrop} onPress={() => setModalVisible(false)} />

                    <View style={styles.modalCard}>
                        <View style={styles.modalHeaderImageContainer}>
                            <Image
                                source={selectedLugar?.img1 ? { uri: selectedLugar.img1 } : getImageSource(selectedLugar?.imagen)}
                                style={styles.modalHeroImage}
                                resizeMode="cover"
                                blurRadius={selectedLugar?.img1 ? 0 : 20}
                            />
                            <View style={styles.modalGradient} />

                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                                <Ionicons name="chevron-down" size={24} color="#FFF" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                            <View style={styles.modalLogoWrapper}>
                                <Image source={getImageSource(selectedLugar?.imagen)} style={styles.modalLogo} resizeMode="contain" />
                            </View>

                            <Text style={styles.modalTitle}>{selectedLugar?.titulo}</Text>
                            <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 20 }}>
                                <Text style={styles.modalSubtitle}>{selectedLugar?.categoria} • {selectedLugar?.ciudad}</Text>
                            </View>

                            {selectedLugar?.descuentos && (
                                <View style={styles.modalPromoBox}>
                                    <Ionicons name="star" size={20} color={COLORS.gold} />
                                    <View style={{ marginLeft: 10, flex: 1 }}>
                                        <Text style={styles.modalPromoTitle}>Beneficio para Miembros</Text>
                                        <Text style={styles.modalPromoVal}>{selectedLugar.descuentos}</Text>
                                    </View>
                                </View>
                            )}

                            <Text style={styles.sectionTitle}>INFORMACIÓN</Text>
                            <Text style={styles.modalDesc}>{selectedLugar?.descripcion}</Text>

                            {(selectedLugar?.img1 || selectedLugar?.img2 || selectedLugar?.img3) && (
                                <View style={{ marginVertical: 20 }}>
                                    <Text style={styles.sectionTitle}>GALERÍA</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                        {[selectedLugar.img1, selectedLugar.img2, selectedLugar.img3].map((img, idx) => (
                                            img ? <Image key={idx} source={{ uri: img }} style={styles.galleryImg} /> : null
                                        ))}
                                    </ScrollView>
                                </View>
                            )}

                            <TouchableOpacity
                                onPress={() => handleOpenMaps(selectedLugar?.mapLink)}
                                style={styles.mainActionBtn}
                            >
                                <Text style={styles.mainActionBtnText}>Cómo llegar</Text>
                                <Ionicons name="map" size={20} color={COLORS.background} />
                            </TouchableOpacity>

                            <View style={{ height: 40 }} />
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { backgroundColor: COLORS.background, paddingHorizontal: 24, paddingBottom: 15, zIndex: 10 },
    headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    headerSubtitle: { fontFamily: FONTS.textBold, fontSize: 9, color: COLORS.accent, letterSpacing: 4, marginBottom: 2, textAlign: 'center' },
    headerTitle: { fontFamily: FONTS.title, fontSize: 24, color: COLORS.text, letterSpacing: 1, textAlign: 'center' },
    backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-start' },

    locationFiltersContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 },
    countrySelectorBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, backgroundColor: '#1a1d24' },
    countrySelectorText: { color: COLORS.textSec, fontSize: 11, fontFamily: FONTS.textMedium, marginHorizontal: 6 },
    citySelectorBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBg, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 30, borderWidth: 1, borderColor: COLORS.accent },
    citySelectorText: { color: COLORS.text, marginHorizontal: 8, fontSize: 13, fontFamily: FONTS.textMedium },

    floatingDropdown: { position: 'absolute', left: 24, right: 24, backgroundColor: '#1a1d24', borderRadius: 16, padding: 8, zIndex: 100, borderWidth: 1, borderColor: COLORS.border, elevation: 20 },
    dropdownHeaderLabel: { fontSize: 10, color: COLORS.textSec, fontFamily: FONTS.textBold, paddingHorizontal: 12, paddingVertical: 8, textTransform: 'uppercase' },
    dropdownItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
    dropdownText: { color: COLORS.textSec, fontSize: 14, fontFamily: FONTS.textRegular },
    activeDropdownText: { color: COLORS.accent, fontFamily: FONTS.textBold },

    guestBanner: { marginHorizontal: 24, marginTop: 20, padding: 20, borderRadius: 20, backgroundColor: '#13151a', borderWidth: 1, borderColor: COLORS.border },
    guestBannerTitle: { color: COLORS.accent, fontFamily: FONTS.title, fontSize: 18, marginBottom: 8 },
    guestBannerText: { color: COLORS.textSec, fontFamily: FONTS.textRegular, fontSize: 13, lineHeight: 20, marginBottom: 15 },
    registerButton: { alignSelf: 'flex-start', backgroundColor: COLORS.accent, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
    registerButtonText: { color: '#000', fontFamily: FONTS.textBold, fontSize: 12 },

    categoriesContainer: { marginTop: 25, marginBottom: 15 },
    tabItem: { marginRight: 15, paddingVertical: 8, paddingHorizontal: 18, borderRadius: 20, backgroundColor: COLORS.cardBg, borderWidth: 1, borderColor: COLORS.border },
    tabItemActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
    tabText: { fontSize: 13, color: COLORS.textSec, fontFamily: FONTS.textMedium },
    tabTextActive: { color: '#000', fontFamily: FONTS.textBold },

    listContainer: { paddingHorizontal: 24 },
    resultsText: { color: COLORS.textSec, fontSize: 11, marginBottom: 20, fontFamily: FONTS.textMedium, opacity: 0.6, textAlign: 'center' },

    premiumCard: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 24,
        marginBottom: 30,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#23262f',
    },
    cardHeaderWrapper: {
        height: 140,
        width: '100%',
        position: 'relative',
        backgroundColor: '#16181d',
        overflow: 'hidden'
    },
    cardAtmosphereImage: {
        width: '100%',
        height: '100%',
        opacity: 0.85
    },
    cardOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.2)'
    },
    cardTopBadges: {
        position: 'absolute',
        top: 15, left: 15, right: 15,
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    promoBadge: {
        backgroundColor: COLORS.accent,
        paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: 8,
    },
    promoText: { color: '#000', fontFamily: FONTS.textBold, fontSize: 10, textTransform: 'uppercase' },
    categoryBadge: {
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)'
    },
    categoryBadgeText: { color: '#fff', fontSize: 10, fontFamily: FONTS.textBold, textTransform: 'uppercase', letterSpacing: 0.5 },

    cardBody: {
        paddingHorizontal: 20,
        paddingBottom: 24,
        marginTop: -40,
    },
    logoMedallion: {
        width: 80, height: 80,
        borderRadius: 25,
        backgroundColor: '#1E2129',
        justifyContent: 'center', alignItems: 'center',
        alignSelf: 'flex-start',
        borderWidth: 4,
        borderColor: COLORS.cardBg,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
        marginBottom: 12
    },
    logoImage: { width: '85%', height: '85%' },
    cardInfo: {},
    cardTitle: {
        fontSize: 20, color: '#fff', fontFamily: FONTS.title, marginBottom: 6, letterSpacing: 0.5
    },
    locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    cardLocation: { fontSize: 12, color: COLORS.textSec, fontFamily: FONTS.textRegular, marginLeft: 4 },
    cardDesc: { fontSize: 13, color: '#8b9bb4', lineHeight: 20, fontFamily: FONTS.textRegular, marginBottom: 15 },
    cardFooterBtn: {
        flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
        borderBottomWidth: 1, borderBottomColor: COLORS.accent, paddingBottom: 2
    },
    btnText: { color: '#fff', fontSize: 12, fontFamily: FONTS.textBold, marginRight: 6 },

    emptyState: { alignItems: 'center', marginTop: 40, opacity: 0.5 },
    emptyText: { color: COLORS.textSec, marginTop: 10, fontFamily: FONTS.textRegular },

    modalContainer: { flex: 1, justifyContent: 'flex-end' },
    modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.85)' },
    modalCard: { height: '92%', backgroundColor: COLORS.background, borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden' },
    modalHeaderImageContainer: { height: 250, width: '100%', position: 'relative' },
    modalHeroImage: { width: '100%', height: '100%' },
    modalGradient: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.25)'
    },
    closeBtn: { position: 'absolute', top: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 20 },

    modalContent: { flex: 1, marginTop: -60, paddingHorizontal: 24 },
    modalLogoWrapper: {
        width: 100, height: 100, borderRadius: 50,
        backgroundColor: COLORS.background, alignSelf: 'center',
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 15, borderWidth: 4, borderColor: COLORS.background,
        shadowColor: "#000", shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, elevation: 10
    },
    modalLogo: { width: 70, height: 70 },
    modalTitle: { fontSize: 28, color: COLORS.text, fontFamily: FONTS.title, textAlign: 'center', marginBottom: 5 },
    modalSubtitle: { fontSize: 14, color: COLORS.textSec, fontFamily: FONTS.textRegular, textAlign: 'center', opacity: 0.8 },

    modalPromoBox: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E222B',
        padding: 16, borderRadius: 16, marginBottom: 25, borderWidth: 1, borderColor: '#333'
    },
    modalPromoTitle: { color: COLORS.gold, fontSize: 11, fontFamily: FONTS.textBold, textTransform: 'uppercase', marginBottom: 2 },
    modalPromoVal: { color: '#fff', fontSize: 16, fontFamily: FONTS.textMedium },

    sectionTitle: { fontSize: 11, color: COLORS.textSec, fontFamily: FONTS.textBold, letterSpacing: 1, marginBottom: 12, textTransform: 'uppercase' },
    modalDesc: { fontSize: 15, color: '#ccc', lineHeight: 24, fontFamily: FONTS.textRegular, marginBottom: 30 },
    galleryImg: { width: 140, height: 90, borderRadius: 12, marginRight: 10, backgroundColor: '#222' },

    mainActionBtn: {
        backgroundColor: COLORS.accent, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 18, marginBottom: 20,
        shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, elevation: 8
    },
    mainActionBtnText: { color: COLORS.background, fontFamily: FONTS.textBold, fontSize: 16, marginRight: 8 }
});