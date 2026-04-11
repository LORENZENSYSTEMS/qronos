import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { useFocusEffect, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// --- IMPORTANTE: Asegúrate de que la ruta a ProductCard sea correcta ---
import ProductCard from '../../../components/products/ProductCard';
import { useCompanies } from '../../../hooks/useCompanies';
import { useFavorites } from '../../../hooks/useFavorites';

// --- PALETA DE COLORES (PREMIUM) ---
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
  whatsapp: '#25D366', 
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
  'Colombia': ['Todas', 'Cartagena de Indias'],
  'Emiratos Árabes Unidos': ['Todas', 'Dubái'],
  'Argentina': ['Todas', 'Rosario']
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
  whatsapp?: string | null; 
  img1?: string | null;
  img2?: string | null;
  img3?: string | null;
}

// --- COMPONENTE DE PRODUCTOS ---
const CompanyProducts = ({ 
  empresaId, 
  cart, 
  onCartUpdate,
  onImagePress
}: { 
  empresaId: number, 
  cart: Record<number, any>, 
  onCartUpdate: (productId: number, product: any, delta: number) => void,
  onImagePress: (url: string) => void
}) => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const fetchProducts = async () => {
      try {
        const baseUrl = process.env.EXPO_PUBLIC_API_URL;
        const response = await fetch(`${baseUrl}/api/empresas/${empresaId}/productos`);
        if (response.ok) {
          const data = await response.json();
          setProducts(data);
        }
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [empresaId]);

  if (loading) return <ActivityIndicator color={COLORS.accent} style={{ marginVertical: 30 }} />;
  if (products.length === 0) return null;

  return (
    <View style={{ marginVertical: 20 }}>
      <Text style={styles.sectionTitle}>PRODUCTOS DISPONIBLES</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
        {products.map((item) => (
          <ProductCard 
            key={item.producto_id}
            nombre={item.nombre}
            precio={item.precio}
            imagenUrl={item.imagenUrl}
            cantidad={cart[item.producto_id]?.cantidad || 0}
            onAdd={() => onCartUpdate(item.producto_id, item, 1)}
            onRemove={() => onCartUpdate(item.producto_id, item, -1)}
            onImagePress={() => item.imagenUrl ? onImagePress(item.imagenUrl) : null}
          />
        ))}
      </ScrollView>
    </View>
  );
};

export default function HomeScreen() {
  const navigator: any = useNavigation();
  const router = useRouter();
  const safeAreaInsets = useSafeAreaInsets();

  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const { data: stores, isLoading: loadingStores, refetch: refetchStores, isFetching } = useCompanies();
  const { isFavorite, toggleFavorite } = useFavorites();

  const lugares = stores || [];
  const loading = loadingStores;
  const refreshing = isFetching;

  // --- ESTADOS ---
  const [cart, setCart] = useState<Record<number, any>>({});
  const [viewerImage, setViewerImage] = useState<string | null>(null); // Estado de la imagen ampliada

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
  const [isEmpresa, setIsEmpresa] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const checkRole = async () => {
        const empresaId = await SecureStore.getItemAsync('empresa_id');
        setIsEmpresa(!!empresaId);
      };
      checkRole();
    }, [])
  );

  const onRefresh = () => {
    refetchStores();
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
    await Linking.openURL(mapLink);
  };

  const handleCartUpdate = (productId: number, product: any, delta: number) => {
    setCart(prev => {
      const currentQty = prev[productId]?.cantidad || 0;
      const newQty = Math.max(0, currentQty + delta);
      
      if (newQty === 0) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return {
        ...prev,
        [productId]: { ...product, cantidad: newQty }
      };
    });
  };

  const sendOrderWhatsApp = async (lugar: any) => {
    const cartArray = Object.values(cart);
    
    if (cartArray.length === 0) {
      if (!lugar.whatsapp) {
        Alert.alert("Aviso", "Esta empresa no ha registrado un número de contacto.");
        return;
      }
      const cleanPhone = lugar.whatsapp.replace(/[^\d]/g, '');
      Linking.openURL(`https://wa.me/${cleanPhone}`);
      return;
    }

    const subtotal = cartArray.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
    const descMatch = lugar.descuentos?.match(/\d+/);
    const descPercent = descMatch ? parseInt(descMatch[0]) : 0;
    const descuentoTotal = subtotal * (descPercent / 100);
    const total = subtotal - descuentoTotal;
    const orderId = Math.floor(10000 + Math.random() * 90000);

    let mensaje = `*ORDEN DESDE QRONNOS*\n`;
    mensaje += `(ID: #${orderId})\n\n`;
    mensaje += `*PRODUCTOS:*\n`;
    
    cartArray.forEach(item => {
      mensaje += `• (${item.cantidad}) ${item.nombre} - $${(item.precio * item.cantidad).toLocaleString()}\n`;
    });

    mensaje += `\n*RESUMEN DE CUENTA:*\n`;
    mensaje += `• Subtotal: $${subtotal.toLocaleString()}\n`;
    if (descPercent > 0) {
      mensaje += `• Desc. Qronnos (${descPercent}%): -$${descuentoTotal.toLocaleString()}\n`;
    }
    mensaje += `\n✅ *TOTAL A PAGAR: $${total.toLocaleString()}*`;

    const cleanPhone = lugar.whatsapp?.replace(/[^\d]/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(mensaje)}`;
    
    const supported = await Linking.canOpenURL(url);
    if (supported) await Linking.openURL(url);
    else Alert.alert("Error", "No se pudo abrir WhatsApp.");
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

  const contentWidth = isTablet ? Math.min(width * 0.9, 1000) : width;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <View style={[styles.header, { paddingTop: Math.max(safeAreaInsets.top, 10) }]}>
        <View style={styles.headerTopRow}>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text style={styles.headerSubtitle}>ECOSISTEMA</Text>
            <Text style={styles.headerTitle}>QRONNOS</Text>
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

      {isCountryMenuOpen && (
        <View style={[styles.floatingDropdown, { top: safeAreaInsets.top + 80, maxWidth: contentWidth }]}>
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
        <View style={[styles.floatingDropdown, { top: safeAreaInsets.top + 125, maxWidth: contentWidth }]}>
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
        contentContainerStyle={[styles.scrollContent, { width: contentWidth, alignSelf: 'center' }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />
        }
      >
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

        <View style={styles.listContainer}>
          <Text style={styles.resultsText}>
            {filteredLugares.length} {filteredLugares.length === 1 ? 'Lugar exclusivo' : 'Lugares exclusivos'} encontrados
          </Text>

          <View style={isTablet ? styles.tabletGridContainer : undefined}>
            {filteredLugares.map((lugar) => {
              const bgImage = lugar.img1 ? { uri: lugar.img1 } : getImageSource(lugar.imagen);

              return (
                <TouchableOpacity
                  key={lugar.id}
                  onPress={() => { setSelectedLugar(lugar); setModalVisible(true); setCart({}); setViewerImage(null); }}
                  activeOpacity={0.9}
                  style={[styles.premiumCard, isTablet && styles.tabletCardItem]}
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
                        <Text style={styles.btnText}>Explorar</Text>
                        <Ionicons name="arrow-forward" size={14} color={COLORS.textSec} />
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.favoriteBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      toggleFavorite(lugar.id.toString());
                    }}
                  >
                    <Ionicons
                      name={isFavorite(lugar.id.toString()) ? "heart" : "heart-outline"}
                      size={22}
                      color={isFavorite(lugar.id.toString()) ? "#ff4d4f" : "#fff"}
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
              )
            })}
          </View>

          {filteredLugares.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="planet-outline" size={40} color={COLORS.border} />
              <Text style={styles.emptyText}>No hay resultados en esta zona.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* --- MODAL DETALLE --- */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setModalVisible(false)} />

          <View style={[styles.modalCard, isTablet && styles.modalCardTablet]}>
            <View style={styles.modalHeaderImageContainer}>
              <TouchableOpacity 
                activeOpacity={0.9}
                style={{ flex: 1 }}
                onPress={() => {
                  const heroImg = selectedLugar?.img1 || selectedLugar?.imagen;
                  if(heroImg) setViewerImage(heroImg);
                }}
              >
                <Image
                  source={selectedLugar?.img1 ? { uri: selectedLugar.img1 } : getImageSource(selectedLugar?.imagen)}
                  style={styles.modalHeroImage}
                  resizeMode="cover"
                  blurRadius={selectedLugar?.img1 ? 0 : 20}
                />
              </TouchableOpacity>
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

              {selectedLugar?.descuentos && !isEmpresa && (
                <TouchableOpacity
                  style={styles.modalPromoBox}
                  onPress={() => {
                    setModalVisible(false);
                    router.push('/(tabs)/dashboard/profileScreen' as any);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="star" size={20} color={COLORS.gold} />
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text style={styles.modalPromoTitle}>Beneficio Exclusivo</Text>
                    <Text style={styles.modalPromoVal}>{selectedLugar.descuentos}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.textSec} />
                </TouchableOpacity>
              )}

              <Text style={styles.sectionTitle}>SOBRE EL LUGAR</Text>
              <Text style={styles.modalDesc}>{selectedLugar?.descripcion}</Text>

              {/* GALERÍA DE IMÁGENES CLICKABLES */}
              {(selectedLugar?.img1 || selectedLugar?.img2 || selectedLugar?.img3) && (
                <View style={{ marginVertical: 10 }}>
                  <Text style={styles.sectionTitle}>GALERÍA</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {[selectedLugar.img1, selectedLugar.img2, selectedLugar.img3].map((img, idx) => (
                      img ? (
                        <TouchableOpacity key={idx} onPress={() => setViewerImage(img)} activeOpacity={0.8}>
                          <Image source={{ uri: img }} style={styles.galleryImg} />
                        </TouchableOpacity>
                      ) : null
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* LISTA DE PRODUCTOS CON CONEXIÓN AL VISOR */}
              {selectedLugar && (
                <CompanyProducts 
                  empresaId={selectedLugar.id} 
                  cart={cart}
                  onCartUpdate={handleCartUpdate}
                  onImagePress={(url) => setViewerImage(url)} 
                />
              )}

              <View style={styles.modalActionContainer}>
                <TouchableOpacity
                  onPress={() => handleOpenMaps(selectedLugar?.mapLink)}
                  style={styles.mainActionBtn}
                >
                  <Text style={styles.mainActionBtnText}>Cómo llegar</Text>
                  <Ionicons name="map" size={18} color={COLORS.background} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => sendOrderWhatsApp(selectedLugar)}
                  style={[
                    styles.whatsappActionBtn,
                    Object.keys(cart).length > 0 && { width: 140, flexDirection: 'row', gap: 8 }
                  ]}
                >
                  <Ionicons name="logo-whatsapp" size={24} color="#fff" />
                  {Object.keys(cart).length > 0 && (
                    <Text style={{ color: '#fff', fontFamily: FONTS.textBold, fontSize: 13 }}>PEDIR AHORA</Text>
                  )}
                </TouchableOpacity>
              </View>

              <View style={{ height: 40 }} />
            </ScrollView>

            {/* --- VISOR DE IMAGEN (Overlay Absoluto DENTRO del Modal Principal) --- */}
            {viewerImage && (
              <View style={styles.fullScreenOverlay}>
                <TouchableOpacity
                  style={[styles.closeOverlayBtn, { top: Math.max(safeAreaInsets.top, 20) + 10 }]}
                  onPress={() => setViewerImage(null)}
                >
                  <Ionicons name="close" size={36} color="#FFF" />
                </TouchableOpacity>
                <Image
                  source={{ uri: viewerImage }}
                  style={{ width: '100%', height: '80%' }}
                  resizeMode="contain"
                />
              </View>
            )}

          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: 100 },

  // HEADER
  header: { backgroundColor: COLORS.background, paddingHorizontal: 24, paddingBottom: 5, zIndex: 10 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
  headerSubtitle: { fontFamily: FONTS.textBold, fontSize: 9, color: COLORS.accent, letterSpacing: 4, marginBottom: 2, textAlign: 'center' },
  headerTitle: { fontFamily: FONTS.title, fontSize: 24, color: COLORS.text, letterSpacing: 1, textAlign: 'center' },

  // FILTERS
  locationFiltersContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5, flexWrap: 'wrap', gap: 10 },
  countrySelectorBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, backgroundColor: '#1a1d24' },
  countrySelectorText: { color: COLORS.textSec, fontSize: 11, fontFamily: FONTS.textMedium, marginHorizontal: 6 },
  citySelectorBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBg, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 30, borderWidth: 1, borderColor: COLORS.accent, flexShrink: 1 },
  citySelectorText: { color: COLORS.text, marginHorizontal: 8, fontSize: 13, fontFamily: FONTS.textMedium },

  // DROPDOWNS
  floatingDropdown: { position: 'absolute', left: 24, right: 24, backgroundColor: '#1a1d24', borderRadius: 16, padding: 8, zIndex: 100, borderWidth: 1, borderColor: COLORS.border, elevation: 20, alignSelf: 'center' },
  dropdownHeaderLabel: { fontSize: 10, color: COLORS.textSec, fontFamily: FONTS.textBold, paddingHorizontal: 12, paddingVertical: 8, textTransform: 'uppercase' },
  dropdownItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  dropdownText: { color: COLORS.textSec, fontSize: 14, fontFamily: FONTS.textRegular },
  activeDropdownText: { color: COLORS.accent, fontFamily: FONTS.textBold },

  // CATEGORIES
  categoriesContainer: { marginTop: 10, marginBottom: 15 },
  tabItem: { marginRight: 15, paddingVertical: 8, paddingHorizontal: 18, borderRadius: 20, backgroundColor: COLORS.cardBg, borderWidth: 1, borderColor: COLORS.border },
  tabItemActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  tabText: { fontSize: 13, color: COLORS.textSec, fontFamily: FONTS.textMedium },
  tabTextActive: { color: '#000', fontFamily: FONTS.textBold },

  // LIST & GRID
  listContainer: { paddingHorizontal: 24 },
  resultsText: { color: COLORS.textSec, fontSize: 11, marginBottom: 20, fontFamily: FONTS.textMedium, opacity: 0.6, textAlign: 'center' },
  tabletGridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  tabletCardItem: { width: '48%' },

  // --- PREMIUM CARD DESIGN ---
  premiumCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 24,
    marginBottom: 30,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#23262f',
    width: '100%'
  },
  cardHeaderWrapper: { height: 140, width: '100%', position: 'relative', backgroundColor: '#16181d', overflow: 'hidden' },
  cardAtmosphereImage: { width: '100%', height: '100%', opacity: 0.85 },
  cardOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)' },
  cardTopBadges: { position: 'absolute', top: 15, left: 15, right: 15, flexDirection: 'row', justifyContent: 'space-between' },
  promoBadge: { backgroundColor: COLORS.accent, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  promoText: { color: '#000', fontFamily: FONTS.textBold, fontSize: 10, textTransform: 'uppercase' },
  categoryBadge: { backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  categoryBadgeText: { color: '#fff', fontSize: 10, fontFamily: FONTS.textBold, textTransform: 'uppercase', letterSpacing: 0.5 },
  favoriteBtn: { position: 'absolute', top: 15, right: 15, backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },

  // CARD BODY
  cardBody: { paddingHorizontal: 20, paddingBottom: 24, marginTop: -40 },
  logoMedallion: {
    width: 80, height: 80, borderRadius: 25, backgroundColor: '#1E2129', justifyContent: 'center', alignItems: 'center',
    alignSelf: 'flex-start', borderWidth: 4, borderColor: COLORS.cardBg, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 8, marginBottom: 12
  },
  logoImage: { width: '85%', height: '85%' },
  cardInfo: {},
  cardTitle: { fontSize: 20, color: '#fff', fontFamily: FONTS.title, marginBottom: 6, letterSpacing: 0.5 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardLocation: { fontSize: 12, color: COLORS.textSec, fontFamily: FONTS.textRegular, marginLeft: 4 },
  cardDesc: { fontSize: 13, color: '#8b9bb4', lineHeight: 20, fontFamily: FONTS.textRegular, marginBottom: 15 },
  cardFooterBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderBottomWidth: 1, borderBottomColor: COLORS.accent, paddingBottom: 2 },
  btnText: { color: '#fff', fontSize: 12, fontFamily: FONTS.textBold, marginRight: 6 },

  emptyState: { alignItems: 'center', marginTop: 40, opacity: 0.5 },
  emptyText: { color: COLORS.textSec, marginTop: 10, fontFamily: FONTS.textRegular },

  // --- MODAL PREMIUM ---
  modalContainer: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.85)' },
  modalCard: { height: '92%', width: '100%', backgroundColor: COLORS.background, borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden' },
  modalCardTablet: { maxWidth: 600, height: '85%', borderRadius: 30, marginBottom: '5%' },
  modalHeaderImageContainer: { height: 250, width: '100%', position: 'relative' },
  modalHeroImage: { width: '100%', height: '100%' },
  modalGradient: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)' },
  closeBtn: { position: 'absolute', top: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 20 },

  modalContent: { flex: 1, marginTop: -60, paddingHorizontal: 24 },
  modalLogoWrapper: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.background, alignSelf: 'center', justifyContent: 'center', alignItems: 'center',
    marginBottom: 15, borderWidth: 4, borderColor: COLORS.background, shadowColor: "#000", shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, elevation: 10
  },
  modalLogo: { width: 70, height: 70 },
  modalTitle: { fontSize: 28, color: COLORS.text, fontFamily: FONTS.title, textAlign: 'center', marginBottom: 5 },
  modalSubtitle: { fontSize: 14, color: COLORS.textSec, fontFamily: FONTS.textRegular, textAlign: 'center', opacity: 0.8 },

  modalPromoBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E222B', padding: 16, borderRadius: 16, marginBottom: 25, borderWidth: 1, borderColor: '#333' },
  modalPromoTitle: { color: COLORS.gold, fontSize: 11, fontFamily: FONTS.textBold, textTransform: 'uppercase', marginBottom: 2 },
  modalPromoVal: { color: '#fff', fontSize: 16, fontFamily: FONTS.textMedium },

  sectionTitle: { fontSize: 11, color: COLORS.textSec, fontFamily: FONTS.textBold, letterSpacing: 1, marginBottom: 12, textTransform: 'uppercase' },
  modalDesc: { fontSize: 15, color: '#ccc', lineHeight: 24, fontFamily: FONTS.textRegular, marginBottom: 30 },
  galleryImg: { width: 140, height: 90, borderRadius: 12, marginRight: 10, backgroundColor: '#222' },

  // ACCIONES DEL MODAL
  modalActionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  mainActionBtn: {
    flex: 1,
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 18,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    elevation: 8
  },
  whatsappActionBtn: {
    width: 60,
    height: 60,
    backgroundColor: COLORS.whatsapp,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.whatsapp,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    elevation: 8
  },
  mainActionBtnText: { color: COLORS.background, fontFamily: FONTS.textBold, fontSize: 15, marginRight: 8 },

  // VISOR DE IMÁGENES DENTRO DEL MODAL
  fullScreenOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.96)',
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeOverlayBtn: {
    position: 'absolute',
    right: 20,
    zIndex: 10000,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 10,
    borderRadius: 30,
  }
});