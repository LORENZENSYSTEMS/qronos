import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { useFocusEffect, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

// --- COMPONENTES Y HOOKS ---
import CompanyMenuModal from '../../../components/modals/companyMenuModal';
import CompanyReservationModal from '../../../components/modals/companyReservationModal'; // <-- NUEVO MODAL DE RESERVAS
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
  yellowBtn: '#ffc107',
};

const FONTS = {
  title: 'Heavitas',
  textRegular: 'Poppins-Regular',
  textMedium: 'Poppins-Medium',
  textBold: 'Poppins-Bold'
};

type Category = 'Todos' | 'Restaurantes' | 'Tiendas' | 'Bar' | string;
const CATEGORIES: Category[] = ['Todos', 'Restaurantes', 'Bar', "Tiendas"];

const API_URL = process.env.EXPO_PUBLIC_API_URL;

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
  horarioApertura?: string;
  horarioCierre?: string;
}

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
  const [viewerImage, setViewerImage] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('Usuario');
  
  const [selectedLugar, setSelectedLugar] = useState<Lugar | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category>('Todos');
  const [selectedCountry, setSelectedCountry] = useState<string>('Colombia');
  const [selectedCity, setSelectedCity] = useState<string>('Todas');
  const [paisesUbicacion, setPaisesUbicacion] = useState<PaisUbicacion[]>([]);
  const [ciudadesUbicacion, setCiudadesUbicacion] = useState<CiudadUbicacion[]>([]);
  const [isLocationMenuOpen, setIsLocationMenuOpen] = useState(false);
  const [isEmpresa, setIsEmpresa] = useState(false);
  
  // Modificamos para soportar la pantalla 'reservation'
  const [modalScreen, setModalScreen] = useState<'detail' | 'menu' | 'reservation'>('detail');

  const [fontsLoaded] = useFonts({
    'Heavitas': require('../../../assets/fonts/Heavitas.ttf'),
    'Poppins-Regular': require('../../../assets/fonts/Poppins-Regular.ttf'),
    'Poppins-Medium': require('../../../assets/fonts/Poppins-Medium.ttf'),
    'Poppins-Bold': require('../../../assets/fonts/Poppins-Bold.ttf'),
  });

  useFocusEffect(
    useCallback(() => {
      const fetchUserData = async () => {
        const empresaId = await SecureStore.getItemAsync('empresa_id');
        setIsEmpresa(!!empresaId);
        const name = await SecureStore.getItemAsync('nameCliente');
        if (name) setUserName(name);
      };
      fetchUserData();
    }, [])
  );

  useEffect(() => {
    const fetchUbicaciones = async () => {
      try {
        const [paisesRes, ciudadesRes] = await Promise.all([
          fetch(`${API_URL}/api/paises`),
          fetch(`${API_URL}/api/ciudades`),
        ]);

        if (paisesRes.ok) {
          const data = await paisesRes.json();
          const lista = Array.isArray(data) ? data : (data.paises || []);
          const mapeados: PaisUbicacion[] = lista.map((p: any) => ({ id: p.pais_id, nombre: p.nombre, codigo: p.codigo || '' }));
          setPaisesUbicacion(mapeados);
          if (mapeados.length > 0) {
            setSelectedCountry(prev => (mapeados.some(p => p.nombre === prev) ? prev : mapeados[0].nombre));
          }
        }

        if (ciudadesRes.ok) {
          const data = await ciudadesRes.json();
          const lista = Array.isArray(data) ? data : (data.ciudades || []);
          setCiudadesUbicacion(lista.map((c: any) => ({ id: c.ciudad_id, nombre: c.nombre, paisId: c.pais_id })));
        }
      } catch (error) {
        console.error("Error al obtener ubicaciones:", error);
      }
    };
    fetchUbicaciones();
  }, []);

  const onRefresh = () => refetchStores();

  const filteredLugares = useMemo(() => {
    return lugares.filter(lugar => {
      const matchCountry = lugar.pais?.toLowerCase() === selectedCountry.toLowerCase();
      const matchCity = selectedCity === 'Todas' || lugar.ciudad?.toLowerCase() === selectedCity.toLowerCase();
      const matchCategory = selectedCategory === 'Todos' || lugar.categoria?.toLowerCase() === selectedCategory.toLowerCase();
      return matchCountry && matchCity && matchCategory;
    });
  }, [selectedCategory, selectedCity, selectedCountry, lugares]);

  const handleOpenMaps = async (mapLink?: string | null) => {
    if (!mapLink) {
      Alert.alert("Aviso", "Esta empresa no ha registrado su ubicación.");
      return;
    }
    await Linking.openURL(mapLink);
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

      {/* ENCABEZADO */}
      <View style={[styles.header, { paddingTop: Math.max(safeAreaInsets.top, 5) }]}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitleLeft}>
            <Text style={{ color: COLORS.accent, textShadowColor: 'rgba(1, 195, 142, 0.4)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 }}>Q</Text>RONNOS
          </Text>
          <TouchableOpacity
            style={styles.locationSelectorBtn}
            onPress={() => setIsLocationMenuOpen(!isLocationMenuOpen)}
          >
            <Ionicons name="location-sharp" size={14} color={COLORS.accent} />
            <Text style={styles.locationSelectorText} numberOfLines={1}>{selectedCountry}, {selectedCity}</Text>
            <Ionicons name="chevron-down" size={12} color={COLORS.textSec} />
          </TouchableOpacity>
        </View>
      </View>

      {/* MENÚ DESPLEGABLE UBICACIÓN */}
      {isLocationMenuOpen && (
        <View style={[styles.floatingDropdown, { top: Math.max(safeAreaInsets.top, 5) + 45, maxWidth: contentWidth }]}>
          <ScrollView style={{ maxHeight: 350 }} showsVerticalScrollIndicator={false}>
            <Text style={styles.dropdownHeaderLabel}>Selecciona tu ubicación</Text>
            {paisesUbicacion.map((pais) => {
              const cityList = ciudadesUbicacion.filter(c => c.paisId === pais.id);
              const options = ['Todas', ...cityList.map(c => c.nombre)];
              return (
                <View key={pais.id} style={{ marginBottom: 10 }}>
                  <Text style={styles.dropdownCountryText}>
                    {pais.nombre}{pais.codigo ? ` (${pais.codigo})` : ''}
                  </Text>
                  {options.map((city) => {
                    const isSelected = selectedCountry === pais.nombre && selectedCity === city;
                    return (
                      <TouchableOpacity
                        key={`${pais.nombre}-${city}`}
                        style={styles.dropdownCityItem}
                        onPress={() => {
                          setSelectedCountry(pais.nombre);
                          setSelectedCity(city);
                          setIsLocationMenuOpen(false);
                        }}
                      >
                        <Text style={[styles.dropdownCityText, isSelected && styles.activeDropdownText]}>•  {city}</Text>
                        {isSelected && <Ionicons name="checkmark" size={16} color={COLORS.accent} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })}
            {paisesUbicacion.length === 0 && (
              <Text style={styles.dropdownHeaderLabel}>No hay ubicaciones disponibles.</Text>
            )}
          </ScrollView>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { width: contentWidth, alignSelf: 'center' }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
      >
        <View style={styles.categoriesContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                style={[styles.tabItem, selectedCategory === cat && styles.tabItemActive]}
              >
                <Text style={[styles.tabText, selectedCategory === cat && styles.tabTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.listContainer}>
          <Text style={styles.resultsText}>{filteredLugares.length} {filteredLugares.length === 1 ? 'Lugar exclusivo' : 'Lugares exclusivos'} encontrados</Text>

          <View style={isTablet ? styles.tabletGridContainer : undefined}>
            {filteredLugares.map((lugar) => {
              const bgImage = lugar.img1 ? { uri: lugar.img1 } : getImageSource(lugar.imagen);
              return (
                <TouchableOpacity
                  key={lugar.id}
                  onPress={() => { 
                    setSelectedLugar(lugar); 
                    setModalScreen('detail'); 
                    setModalVisible(true); 
                    setViewerImage(null); 
                  }}
                  activeOpacity={0.9}
                  style={[styles.premiumCard, isTablet && styles.tabletCardItem]}
                >
                  <View style={styles.cardHeaderWrapper}>
                    <Image source={bgImage} style={[styles.cardAtmosphereImage, !lugar.img1 && { transform: [{ scale: 1.5 }], opacity: 0.15 }]} resizeMode={lugar.img1 ? "cover" : "contain"} blurRadius={lugar.img1 ? 0 : 10} />
                    <View style={styles.cardOverlay} />
                    <View style={styles.cardTopBadges}>
                      {lugar.descuentos ? (
                        <View style={styles.promoBadge}>
                          <Text style={styles.promoText}>{lugar.descuentos}</Text>
                        </View>
                      ) : <View />}
                      <View style={styles.topRightRow}>
                        <View style={styles.categoryBadge}>
                          <Text style={styles.categoryBadgeText}>{lugar.categoria}</Text>
                        </View>
                        <TouchableOpacity style={styles.favoriteBtnInline} onPress={(e) => { e.stopPropagation(); toggleFavorite(lugar.id.toString()); }}>
                          <Ionicons name={isFavorite(lugar.id.toString()) ? "heart" : "heart-outline"} size={20} color={isFavorite(lugar.id.toString()) ? "#ff4d4f" : "#fff"} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  <View style={styles.cardBody}>
                    <View style={styles.logoMedallion}>
                      <Image source={getImageSource(lugar.imagen)} style={styles.logoImage} resizeMode="contain" />
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardTitle}>{lugar.titulo}</Text>
                      
                      <View style={styles.locationRow}>
                        <Ionicons name="location-sharp" size={13} color={COLORS.accent} />
                        <Text style={styles.cardLocation}>{lugar.ciudad} • {lugar.pais}</Text>
                      </View>

                      <View style={styles.scheduleRow}>
                        <Ionicons name="time-outline" size={13} color={COLORS.textSec} />
                        <Text style={styles.cardSchedule}>
                          {lugar.horarioApertura && lugar.horarioCierre
                            ? `Hoy: ${lugar.horarioApertura} - ${lugar.horarioCierre}`
                            : 'Horario no disponible'}
                        </Text>
                      </View>
                      
                      <View style={styles.cardFooterRow}>
                        <TouchableOpacity 
                          style={styles.verDetallesBtn}
                          onPress={() => { 
                            setSelectedLugar(lugar); 
                            setModalScreen('detail'); 
                            setModalVisible(true); 
                            setViewerImage(null); 
                          }}
                        >
                          <Text style={styles.verDetallesText}>Ver detalles</Text>
                          <Ionicons name="arrow-forward" size={13} color={COLORS.text} style={{ marginLeft: 4 }} />
                        </TouchableOpacity>

                        <View style={styles.cardActionButtons}>
                          {/* BOTÓN EXTERNO DE RESERVAR -> ABRE EL MÓDULO DE RESERVAS DIRECTAMENTE */}
                          <TouchableOpacity 
                            style={styles.reservarMesaBtn}
                            onPress={(e) => {
                              e.stopPropagation();
                              setSelectedLugar(lugar);
                              setModalScreen('reservation');
                              setModalVisible(true);
                            }}
                          >
                            <Ionicons name="calendar-outline" size={13} color="#000" />
                            <Text style={styles.reservarMesaText} numberOfLines={1}>Reservar</Text>
                          </TouchableOpacity>

                          <TouchableOpacity 
                            style={styles.pedirDomicilioBtn}
                            onPress={(e) => {
                              e.stopPropagation();
                              setSelectedLugar(lugar);
                              setModalScreen('menu');
                              setModalVisible(true);
                            }}
                          >
                            <Ionicons name="bicycle-outline" size={13} color="#000" />
                            <Text style={styles.pedirDomicilioText} numberOfLines={1}>Domicilio</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                    </View>
                  </View>
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

      {/* --- MODAL MAESTRO UNIFICADO --- */}
      <Modal 
        visible={modalVisible} 
        transparent 
        animationType="slide" 
        onRequestClose={() => {
          if (modalScreen === 'menu' || modalScreen === 'reservation') {
            setModalScreen('detail'); 
          } else {
            setModalVisible(false); 
          }
        }}
      >
        {modalScreen === 'detail' ? (
          <View style={styles.modalContainer}>
            <TouchableOpacity style={styles.modalBackdrop} onPress={() => setModalVisible(false)} />

            <View style={[styles.modalCard, isTablet && styles.modalCardTablet]}>
              <View style={styles.modalHeaderImageContainer}>
                <TouchableOpacity activeOpacity={0.9} style={{ flex: 1 }} onPress={() => { const heroImg = selectedLugar?.img1 || selectedLugar?.imagen; if(heroImg) setViewerImage(heroImg); }}>
                  <Image source={selectedLugar?.img1 ? { uri: selectedLugar.img1 } : getImageSource(selectedLugar?.imagen)} style={styles.modalHeroImage} resizeMode="cover" blurRadius={selectedLugar?.img1 ? 0 : 20} />
                </TouchableOpacity>
                <View style={styles.modalGradient} />
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                  <Ionicons name="chevron-down" size={24} color="#FFF" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                <View style={styles.modalLogoWrapper}>
                  <Image source={getImageSource(selectedLugar?.imagen)} style={styles.modalLogo} resizeMode="contain" />
                </View>

                <Text style={styles.modalTitle}>{selectedLugar?.titulo}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 10 }}>
                  <Text style={styles.modalSubtitle}>{selectedLugar?.categoria} • {selectedLugar?.ciudad}</Text>
                </View>

                {(selectedLugar?.horarioApertura || selectedLugar?.horarioCierre) && (
                  <View style={styles.modalScheduleRow}>
                    <Ionicons name="time-outline" size={14} color={COLORS.textSec} />
                    <Text style={styles.modalScheduleText}>
                      Horario: {selectedLugar?.horarioApertura || ''} {selectedLugar?.horarioApertura && selectedLugar?.horarioCierre ? '-' : ''} {selectedLugar?.horarioCierre || ''}
                    </Text>
                  </View>
                )}

                {selectedLugar?.descuentos && !isEmpresa && (
                  <TouchableOpacity style={styles.modalPromoBox} onPress={() => { setModalVisible(false); router.push('/(tabs)/dashboard/profileScreen' as any); }} activeOpacity={0.8}>
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

                <TouchableOpacity onPress={() => handleOpenMaps(selectedLugar?.mapLink)} style={styles.mapBtn}>
                  <Ionicons name="location" size={18} color={COLORS.accent} />
                  <Text style={styles.mapBtnText}>Ver en Mapa</Text>
                </TouchableOpacity>

                {/* GALERÍA DE IMÁGENES */}
                {(selectedLugar?.img1 || selectedLugar?.img2 || selectedLugar?.img3) && (
                  <View style={{ marginVertical: 15 }}>
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

                {/* BOTÓN RESERVAR ESPACIO */}
                <TouchableOpacity 
                  style={styles.btnReservarEspacio}
                  activeOpacity={0.9}
                  onPress={() => setModalScreen('reservation')}
                >
                  <Ionicons name="calendar" size={20} color="#000" />
                  <Text style={styles.btnReservarEspacioText}>RESERVAR ESPACIO (MESA / CANCHA)</Text>
                </TouchableOpacity>

                {/* BOTÓN VER MENÚ */}
                <TouchableOpacity 
                  style={styles.btnVerMenu}
                  activeOpacity={0.9}
                  onPress={() => setModalScreen('menu')}
                >
                  <Ionicons name="restaurant" size={20} color={COLORS.background} />
                  <Text style={styles.btnVerMenuText}>VER MENÚ DE PRODUCTOS</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        ) : modalScreen === 'menu' ? (
          <CompanyMenuModal 
            empresa={selectedLugar}
            userName={userName}
            onClose={() => setModalScreen('detail')}
            onImagePress={(url) => setViewerImage(url)}
          />
        ) : (
          <CompanyReservationModal 
            empresa={selectedLugar}
            userName={userName}
            onClose={() => setModalScreen('detail')}
          />
        )}

        {viewerImage && (
          <View style={styles.fullScreenOverlay}>
            <TouchableOpacity style={[styles.closeOverlayBtn, { top: Math.max(safeAreaInsets.top, 20) + 10 }]} onPress={() => setViewerImage(null)}>
              <Ionicons name="close" size={36} color="#FFF" />
            </TouchableOpacity>
            <Image source={{ uri: viewerImage }} style={{ width: '100%', height: '80%' }} resizeMode="contain" />
          </View>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: 100 },

  header: { backgroundColor: COLORS.background, paddingHorizontal: 24, paddingBottom: 10, zIndex: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitleLeft: { fontFamily: FONTS.title, fontSize: 20, color: COLORS.text, letterSpacing: 1 },

  locationSelectorBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBg, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, flexShrink: 1, maxWidth: '65%' },
  locationSelectorText: { color: COLORS.text, marginHorizontal: 6, fontSize: 11, fontFamily: FONTS.textMedium, flexShrink: 1 },
  floatingDropdown: { position: 'absolute', left: 24, right: 24, backgroundColor: '#1a1d24', borderRadius: 16, padding: 8, zIndex: 100, borderWidth: 1, borderColor: COLORS.border, elevation: 20, alignSelf: 'center' },
  dropdownHeaderLabel: { fontSize: 10, color: COLORS.textSec, fontFamily: FONTS.textBold, paddingHorizontal: 12, paddingVertical: 8, textTransform: 'uppercase' },
  dropdownCountryText: { color: COLORS.text, fontSize: 14, fontFamily: FONTS.textBold, paddingHorizontal: 12, marginTop: 8, marginBottom: 4 },
  dropdownCityItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 12, paddingLeft: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  dropdownCityText: { color: COLORS.textSec, fontSize: 13, fontFamily: FONTS.textRegular },
  activeDropdownText: { color: COLORS.accent, fontFamily: FONTS.textBold },

  categoriesContainer: { marginTop: 10, marginBottom: 15 },
  tabItem: { marginRight: 15, paddingVertical: 8, paddingHorizontal: 18, borderRadius: 20, backgroundColor: COLORS.cardBg, borderWidth: 1, borderColor: COLORS.border },
  tabItemActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  tabText: { fontSize: 13, color: COLORS.textSec, fontFamily: FONTS.textMedium },
  tabTextActive: { color: '#000', fontFamily: FONTS.textBold },

  listContainer: { paddingHorizontal: 24 },
  resultsText: { color: COLORS.textSec, fontSize: 11, marginBottom: 20, fontFamily: FONTS.textMedium, opacity: 0.6, textAlign: 'center' },
  tabletGridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  tabletCardItem: { width: '48%' },

  premiumCard: { backgroundColor: COLORS.cardBg, borderRadius: 24, marginBottom: 30, overflow: 'hidden', borderWidth: 1, borderColor: '#23262f', width: '100%' },
  cardHeaderWrapper: { height: 140, width: '100%', position: 'relative', backgroundColor: '#16181d', overflow: 'hidden' },
  cardAtmosphereImage: { width: '100%', height: '100%', opacity: 0.85 },
  cardOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)' },
  cardTopBadges: { position: 'absolute', top: 15, left: 15, right: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  promoBadge: { backgroundColor: COLORS.accent, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  promoText: { color: '#000', fontFamily: FONTS.textBold, fontSize: 10, textTransform: 'uppercase' },
  topRightRow: { flexDirection: 'row', alignItems: 'center' },
  categoryBadge: { backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  categoryBadgeText: { color: '#fff', fontSize: 10, fontFamily: FONTS.textBold, textTransform: 'uppercase', letterSpacing: 0.5 },
  favoriteBtnInline: { backgroundColor: 'rgba(0,0,0,0.6)', padding: 7, borderRadius: 20, marginLeft: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },

  cardBody: { paddingHorizontal: 20, paddingBottom: 20, marginTop: -40 },
  logoMedallion: { width: 80, height: 80, borderRadius: 25, backgroundColor: '#1E2129', justifyContent: 'center', alignItems: 'center', alignSelf: 'flex-start', borderWidth: 4, borderColor: COLORS.cardBg, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 8, marginBottom: 12 },
  logoImage: { width: '85%', height: '85%' },
  cardInfo: {},
  cardTitle: { fontSize: 20, color: '#fff', fontFamily: FONTS.title, marginBottom: 6, letterSpacing: 0.5 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  cardLocation: { fontSize: 12, color: COLORS.textSec, fontFamily: FONTS.textRegular, marginLeft: 4 },
  
  scheduleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  cardSchedule: { fontSize: 12, color: COLORS.textSec, fontFamily: FONTS.textRegular, marginLeft: 4 },

  cardFooterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 14 },
  verDetallesBtn: { flexDirection: 'row', alignItems: 'center' },
  verDetallesText: { color: '#fff', fontSize: 12, fontFamily: FONTS.textBold, borderBottomWidth: 1, borderBottomColor: COLORS.accent, paddingBottom: 1 },

  cardActionButtons: { flexDirection: 'row', alignItems: 'center' },
  reservarMesaBtn: { backgroundColor: COLORS.accent, flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 11, borderRadius: 10, marginRight: 8 },
  reservarMesaText: { color: '#000', fontFamily: FONTS.textBold, fontSize: 11, marginLeft: 4 },
  pedirDomicilioBtn: { backgroundColor: COLORS.yellowBtn, flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 11, borderRadius: 10 },
  pedirDomicilioText: { color: '#000', fontFamily: FONTS.textBold, fontSize: 11, marginLeft: 4 },

  emptyState: { alignItems: 'center', marginTop: 40, opacity: 0.5 },
  emptyText: { color: COLORS.textSec, marginTop: 10, fontFamily: FONTS.textRegular },

  modalContainer: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.85)' },
  modalCard: { height: '92%', width: '100%', backgroundColor: COLORS.background, borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden' },
  modalCardTablet: { maxWidth: 600, height: '85%', borderRadius: 30, marginBottom: '5%' },
  modalHeaderImageContainer: { height: 250, width: '100%', position: 'relative' },
  modalHeroImage: { width: '100%', height: '100%' },
  modalGradient: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)' },
  closeBtn: { position: 'absolute', top: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 20 },

  modalContent: { flex: 1, marginTop: -60, paddingHorizontal: 24 },
  modalLogoWrapper: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.background, alignSelf: 'center', justifyContent: 'center', alignItems: 'center', marginBottom: 15, borderWidth: 4, borderColor: COLORS.background, shadowColor: "#000", shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, elevation: 10 },
  modalLogo: { width: 70, height: 70 },
  modalTitle: { fontSize: 28, color: COLORS.text, fontFamily: FONTS.title, textAlign: 'center', marginBottom: 5 },
  modalSubtitle: { fontSize: 14, color: COLORS.textSec, fontFamily: FONTS.textRegular, textAlign: 'center', opacity: 0.8 },

  modalScheduleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  modalScheduleText: { fontSize: 13, color: COLORS.textSec, fontFamily: FONTS.textMedium, marginLeft: 6 },

  modalPromoBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E222B', padding: 16, borderRadius: 16, marginBottom: 25, borderWidth: 1, borderColor: '#333' },
  modalPromoTitle: { color: COLORS.gold, fontSize: 11, fontFamily: FONTS.textBold, textTransform: 'uppercase', marginBottom: 2 },
  modalPromoVal: { color: '#fff', fontSize: 16, fontFamily: FONTS.textMedium },

  sectionTitle: { fontSize: 11, color: COLORS.textSec, fontFamily: FONTS.textBold, letterSpacing: 1, marginBottom: 12, textTransform: 'uppercase' },
  modalDesc: { fontSize: 15, color: '#ccc', lineHeight: 24, fontFamily: FONTS.textRegular, marginBottom: 15 },
  
  mapBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: 'rgba(1, 195, 142, 0.1)', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, marginBottom: 30, borderWidth: 1, borderColor: 'rgba(1, 195, 142, 0.3)' },
  mapBtnText: { color: COLORS.accent, fontFamily: FONTS.textMedium, fontSize: 12, marginLeft: 6 },
  
  galleryImg: { width: 140, height: 90, borderRadius: 12, marginRight: 10, backgroundColor: '#222' },

  btnReservarEspacio: { backgroundColor: COLORS.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, borderRadius: 16, marginTop: 10, marginBottom: 12, shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 5 },
  btnReservarEspacioText: { color: '#000', fontFamily: FONTS.textBold, fontSize: 14, marginLeft: 8, letterSpacing: 1 },

  btnVerMenu: { backgroundColor: '#1E2129', borderWidth: 1, borderColor: COLORS.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, borderRadius: 16, marginBottom: 30 },
  btnVerMenuText: { color: COLORS.text, fontFamily: FONTS.textBold, fontSize: 14, marginLeft: 8, letterSpacing: 1 },

  fullScreenOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.96)', zIndex: 9999, justifyContent: 'center', alignItems: 'center' },
  closeOverlayBtn: { position: 'absolute', right: 20, zIndex: 10000, backgroundColor: 'rgba(255,255,255,0.1)', padding: 10, borderRadius: 30 },
});