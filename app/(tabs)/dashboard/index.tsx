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
import CompanyMap from '../../../components/maps/CompanyMap';
import CompanyMenuModal from '../../../components/modals/companyMenuModal';
import CompanyReservationModal from '../../../components/modals/companyReservationModal';
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
  sitioWeb?: string | null;
  instagram?: string | null;
  img1?: string | null;
  img2?: string | null;
  img3?: string | null;
  horarioApertura?: string;
  horarioCierre?: string;
  // --- NUEVOS CAMPOS DE RESERVAS ---
  mostrar_reservas?: boolean | string | number;
  mostrarReservas?: boolean | string | number;
  tipo_reservas?: string;
  tipoReservas?: string;
}

export default function HomeScreen() {
  const navigator: any = useNavigation();
  const router = useRouter();
  const safeAreaInsets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
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
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedCountry, setSelectedCountry] = useState<string>('Colombia');
  const [selectedCity, setSelectedCity] = useState<string>('Todas');
  const [paisesUbicacion, setPaisesUbicacion] = useState<PaisUbicacion[]>([]);
  const [ciudadesUbicacion, setCiudadesUbicacion] = useState<CiudadUbicacion[]>([]);
  const [isLocationMenuOpen, setIsLocationMenuOpen] = useState(false);
  const [isEmpresa, setIsEmpresa] = useState(false);
  
  const [modalScreen, setModalScreen] = useState<'detail' | 'menu' | 'reservation'>('detail');
  const [cart, setCart] = useState<Record<number, any>>({});

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

  const handleOpenUrl = async (url?: string | null) => {
    if (!url) {
      Alert.alert("Aviso", "Enlace no disponible.");
      return;
    }
    const formattedUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
    await Linking.openURL(formattedUrl);
  };

  const openLugarFromMap = (lugar: any) => {
    setSelectedLugar(lugar);
    setModalScreen('detail');
    setModalVisible(true);
    setCart({});
    setViewerImage(null);
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
          <View style={styles.listHeaderRow}>
            <Text style={styles.resultsText}>{filteredLugares.length} {filteredLugares.length === 1 ? 'Lugar exclusivo' : 'Lugares exclusivos'} encontrados</Text>
            <View style={styles.viewModeToggle}>
              <TouchableOpacity style={[styles.viewModeBtn, viewMode === 'list' && styles.viewModeBtnActive]} onPress={() => setViewMode('list')}>
                <Ionicons name="list" size={14} color={viewMode === 'list' ? '#000' : COLORS.textSec} />
                <Text style={[styles.viewModeText, viewMode === 'list' && styles.viewModeTextActive]}>Lista</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.viewModeBtn, viewMode === 'map' && styles.viewModeBtnActive]} onPress={() => setViewMode('map')}>
                <Ionicons name="map" size={14} color={viewMode === 'map' ? '#000' : COLORS.textSec} />
                <Text style={[styles.viewModeText, viewMode === 'map' && styles.viewModeTextActive]}>Mapa</Text>
              </TouchableOpacity>
            </View>
          </View>

          {viewMode === 'map' ? (
            <CompanyMap lugares={filteredLugares} height={Math.round(height * 0.6)} onMarkerPress={openLugarFromMap} />
          ) : (
            <>
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
                      setCart({});
                      setViewerImage(null);
                    }}
                    activeOpacity={0.9}
                    style={[styles.premiumCard, isTablet && styles.tabletCardItem]}
                  >
                    <View style={styles.cardHeaderWrapper}>
                      <Image source={bgImage} style={[styles.cardAtmosphereImage, !lugar.img1 && { transform: [{ scale: 1.5 }], opacity: 0.15 }]} resizeMode={lugar.img1 ? "cover" : "contain"} blurRadius={lugar.img1 ? 0 : 10} />
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
                        <Image source={getImageSource(lugar.imagen)} style={styles.logoImage} resizeMode="contain" />
                      </View>
                      
                      <View style={styles.cardInfo}>
                        <Text style={styles.cardTitle}>{lugar.titulo}</Text>
                        
                        <View style={styles.locationRow}>
                          <Ionicons name="location-sharp" size={12} color={COLORS.accent} />
                          <Text style={styles.cardLocation}>{lugar.ciudad} • {lugar.pais}</Text>
                        </View>

                        <View style={styles.scheduleRow}>
                          <Ionicons name="time-outline" size={12} color={COLORS.textSec} />
                          <Text style={styles.cardSchedule}>
                            Hoy: {lugar.horarioApertura || '--:--'} - {lugar.horarioCierre || '--:--'}
                          </Text>
                        </View>

                        <View style={styles.cardFooterRow}>
                          <View style={styles.verDetallesBtn}>
                            <Text style={styles.verDetallesText}>Ver detalles</Text>
                            <Ionicons name="arrow-forward" size={12} color="#fff" style={{ marginLeft: 4 }} />
                          </View>

                          <View style={styles.cardActionButtons}>
                            {(lugar.mostrar_reservas || lugar.mostrarReservas) && (
                              <TouchableOpacity 
                                style={styles.reservarMesaBtn}
                                onPress={(e) => {
                                  e.stopPropagation();
                                  setSelectedLugar(lugar);
                                  setModalScreen('reservation');
                                  setModalVisible(true);
                                }}
                              >
                                <Ionicons name="calendar-outline" size={14} color="#000" />
                                <Text style={styles.reservarMesaText}>Reservar</Text>
                              </TouchableOpacity>
                            )}

                            <TouchableOpacity 
                              style={styles.pedirDomicilioBtn}
                              onPress={(e) => {
                                e.stopPropagation();
                                setSelectedLugar(lugar);
                                setModalScreen('menu');
                                setModalVisible(true);
                              }}
                            >
                              <Ionicons name="bicycle-outline" size={14} color="#000" />
                              <Text style={styles.pedirDomicilioText}>Domicilio</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    </View>

                    <TouchableOpacity style={styles.favoriteBtn} onPress={(e) => { e.stopPropagation(); toggleFavorite(lugar.id.toString()); }}>
                      <Ionicons name={isFavorite(lugar.id.toString()) ? "heart" : "heart-outline"} size={22} color={isFavorite(lugar.id.toString()) ? "#ff4d4f" : "#fff"} />
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
            </>
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
                
                {/* Botón Atrás */}
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.topBackBtn}>
                  <Ionicons name="arrow-back" size={22} color="#FFF" />
                </TouchableOpacity>

                {/* Botón Favorito */}
                <TouchableOpacity 
                  style={styles.topFavoriteBtn} 
                  onPress={() => selectedLugar && toggleFavorite(selectedLugar.id.toString())}
                >
                  <Ionicons 
                    name={selectedLugar && isFavorite(selectedLugar.id.toString()) ? "heart" : "heart-outline"} 
                    size={20} 
                    color={selectedLugar && isFavorite(selectedLugar.id.toString()) ? "#ff4d4f" : "#fff"} 
                  />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Logotipo Central */}
                <View style={styles.modalLogoWrapper}>
                  <Image source={getImageSource(selectedLugar?.imagen)} style={styles.modalLogo} resizeMode="contain" />
                </View>

                {/* Título y Categoría */}
                <Text style={styles.modalTitle}>{selectedLugar?.titulo}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 20 }}>
                  <Text style={styles.modalSubtitle}>{selectedLugar?.categoria}  •  {selectedLugar?.ciudad}</Text>
                </View>

                {/* FILA DE BOTONES: SITIO WEB | INSTAGRAM | MAPS */}
                <View style={styles.actionRowContainer}>
                  <TouchableOpacity 
                    style={styles.actionIconButton}
                    onPress={() => handleOpenUrl(selectedLugar?.sitioWeb)}
                  >
                    <Ionicons name="globe-outline" size={18} color="#fff" />
                    <Text style={styles.actionIconText}>Sitio web</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.actionIconButton}
                    onPress={() => {
                      if (selectedLugar?.instagram) {
                        const insta = selectedLugar.instagram.replace('@', '').trim();
                        const url = selectedLugar.instagram.startsWith('http') ? selectedLugar.instagram : `https://instagram.com/${insta}`;
                        Linking.openURL(url);
                      } else {
                        Alert.alert("Aviso", "Esta empresa no ha registrado su Instagram.");
                      }
                    }}
                  >
                    <Ionicons name="logo-instagram" size={18} color="#fff" />
                    <Text style={styles.actionIconText}>Instagram</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.actionIconButton}
                    onPress={() => handleOpenMaps(selectedLugar?.mapLink)}
                  >
                    <Ionicons name="location-outline" size={18} color="#fff" />
                    <Text style={styles.actionIconText}>Maps</Text>
                  </TouchableOpacity>
                </View>

                {/* HORA LABORAL (EXTRAÍDA DEL BACKEND) */}
                <View style={styles.modalScheduleRowCenter}>
                  <Ionicons name="time-outline" size={16} color={COLORS.textSec} />
                  <Text style={styles.modalScheduleTextCenter}>
                    {selectedLugar?.horarioCierre ? `Cierra ${selectedLugar.horarioCierre}` : `Horario: ${selectedLugar?.horarioApertura || '--:--'} - ${selectedLugar?.horarioCierre || '--:--'}`}
                  </Text>
                </View>

                {/* SECCIÓN ACUMULA PUNTOS / BENEFICIO */}
                {selectedLugar?.descuentos && !isEmpresa && (
                  <TouchableOpacity style={styles.modalPromoBox} onPress={() => { setModalVisible(false); router.push('/(tabs)/dashboard/profileScreen' as any); }} activeOpacity={0.8}>
                    <View style={styles.qrIconBadge}>
                      <Ionicons name="qr-code-outline" size={22} color={COLORS.accent} />
                    </View>
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text style={styles.modalPromoTitle}>Acumula puntos</Text>
                      <Text style={styles.modalPromoVal}>Escanea cada vez que compres dentro de la tienda y acumula puntos.</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={COLORS.textSec} />
                  </TouchableOpacity>
                )}

                {/* SOBRE EL LUGAR */}
                <Text style={styles.sectionTitle}>SOBRE EL LUGAR</Text>
                <Text style={styles.modalDesc}>{selectedLugar?.descripcion}</Text>

                {/* GALERÍA DE IMÁGENES (EL LUGAR) */}
                {(selectedLugar?.img1 || selectedLugar?.img2 || selectedLugar?.img3) && (
                  <View style={{ marginVertical: 15 }}>
                    <Text style={styles.sectionTitle}>EL LUGAR</Text>
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

                {/* BOTONES INFERIORES DE ACCIÓN */}
                <View style={styles.modalBottomRow}>
                  {(selectedLugar?.mostrar_reservas || selectedLugar?.mostrarReservas) && (
                    <TouchableOpacity 
                      style={styles.whatsappActionBtnOutline}
                      activeOpacity={0.85}
                      onPress={() => setModalScreen('reservation')}
                    >
                      <Ionicons name="logo-whatsapp" size={20} color={COLORS.whatsapp} />
                      <View style={{ marginLeft: 8 }}>
                        <Text style={styles.whatsappBtnTitleOutline}>
                          {selectedLugar?.tipo_reservas === 'Canchas' || selectedLugar?.tipoReservas === 'Canchas' ? 'Reservar cancha' : 'Reservar mesa'}
                        </Text>
                        <Text style={styles.whatsappBtnSubtextOutline}>por WhatsApp</Text>
                      </View>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity 
                    style={[styles.whatsappActionBtnFilled, !(selectedLugar?.mostrar_reservas || selectedLugar?.mostrarReservas) && { flex: 1 }]}
                    activeOpacity={0.85}
                    onPress={() => setModalScreen('menu')}
                  >
                    <Ionicons name="logo-whatsapp" size={20} color="#000" />
                    <View style={{ marginLeft: 8 }}>
                      <Text style={styles.whatsappBtnTitleFilled}>Pedir domicilio</Text>
                      <Text style={styles.whatsappBtnSubtextFilled}>por WhatsApp</Text>
                    </View>
                  </TouchableOpacity>
                </View>

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
  listHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  resultsText: { color: COLORS.textSec, fontSize: 11, fontFamily: FONTS.textMedium, opacity: 0.6, textAlign: 'center', flexShrink: 1 },
  viewModeToggle: { flexDirection: 'row', backgroundColor: COLORS.cardBg, borderRadius: 20, padding: 3, borderWidth: 1, borderColor: COLORS.border },
  viewModeBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, gap: 4 },
  viewModeBtnActive: { backgroundColor: COLORS.accent },
  viewModeText: { fontSize: 11, color: COLORS.textSec, fontFamily: FONTS.textMedium },
  viewModeTextActive: { color: '#000', fontFamily: FONTS.textBold },
  tabletGridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  tabletCardItem: { width: '48%' },

  premiumCard: { backgroundColor: COLORS.cardBg, borderRadius: 24, marginBottom: 30, overflow: 'hidden', borderWidth: 1, borderColor: '#23262f', width: '100%' },
  cardHeaderWrapper: { height: 140, width: '100%', position: 'relative', backgroundColor: '#16181d', overflow: 'hidden' },
  cardAtmosphereImage: { width: '100%', height: '100%', opacity: 0.85 },
  cardOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)' },
  cardTopBadges: { position: 'absolute', top: 15, left: 15, right: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  promoBadge: { backgroundColor: COLORS.accent, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  promoText: { color: '#000', fontFamily: FONTS.textBold, fontSize: 10, textTransform: 'uppercase' },
  categoryBadge: { backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  categoryBadgeText: { color: '#fff', fontSize: 10, fontFamily: FONTS.textBold, textTransform: 'uppercase', letterSpacing: 0.5 },
  favoriteBtn: { position: 'absolute', top: 15, right: 15, backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },

  cardBody: { paddingHorizontal: 20, paddingBottom: 20, marginTop: -40 },
  logoMedallion: { width: 80, height: 80, borderRadius: 25, backgroundColor: '#1E2129', justifyContent: 'center', alignItems: 'center', alignSelf: 'flex-start', borderWidth: 4, borderColor: COLORS.cardBg, elevation: 8, marginBottom: 12 },
  logoImage: { width: '85%', height: '85%' },
  cardInfo: {},
  cardTitle: { fontSize: 20, color: '#fff', fontFamily: FONTS.title, marginBottom: 6, letterSpacing: 0.5 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  cardLocation: { fontSize: 12, color: COLORS.textSec, fontFamily: FONTS.textRegular, marginLeft: 4 },
  
  scheduleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  cardSchedule: { fontSize: 12, color: COLORS.textSec, fontFamily: FONTS.textRegular, marginLeft: 4 },

  cardFooterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 14 },
  verDetallesBtn: { flexDirection: 'row', alignItems: 'center' },
  verDetallesText: { color: '#fff', fontSize: 12, fontFamily: FONTS.textBold },

  cardActionButtons: { flexDirection: 'row', alignItems: 'center' },
  reservarMesaBtn: { backgroundColor: COLORS.accent, flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 11, borderRadius: 10, marginRight: 8 },
  reservarMesaText: { color: '#000', fontFamily: FONTS.textBold, fontSize: 11, marginLeft: 4 },
  pedirDomicilioBtn: { backgroundColor: COLORS.yellowBtn, flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 11, borderRadius: 10 },
  pedirDomicilioText: { color: '#000', fontFamily: FONTS.textBold, fontSize: 11, marginLeft: 4 },

  emptyState: { alignItems: 'center', marginTop: 40, opacity: 0.5 },
  emptyText: { color: COLORS.textSec, marginTop: 10, fontFamily: FONTS.textRegular },

  // --- NUEVOS ESTILOS DEL MODAL (SEGÚN LA IMAGEN DE REFERENCIA) ---
  modalContainer: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.85)' },
  modalCard: { height: '94%', width: '100%', backgroundColor: COLORS.background, borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden' },
  modalCardTablet: { maxWidth: 600, height: '88%', borderRadius: 30, marginBottom: '4%' },
  modalHeaderImageContainer: { height: 260, width: '100%', position: 'relative' },
  modalHeroImage: { width: '100%', height: '100%' },
  modalGradient: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  topBackBtn: { position: 'absolute', top: 20, left: 20, backgroundColor: 'rgba(0,0,0,0.5)', width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  topFavoriteBtn: { position: 'absolute', top: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.5)', width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },

  modalContent: { flex: 1, marginTop: -50, paddingHorizontal: 20 },
  modalLogoWrapper: { width: 84, height: 84, borderRadius: 22, backgroundColor: '#13151a', alignSelf: 'center', justifyContent: 'center', alignItems: 'center', marginBottom: 12, borderWidth: 3, borderColor: COLORS.background, elevation: 10 },
  modalLogo: { width: 60, height: 60, borderRadius: 12 },
  modalTitle: { fontSize: 22, color: COLORS.text, fontFamily: FONTS.textBold, textAlign: 'center', marginBottom: 4, letterSpacing: 0.5 },
  modalSubtitle: { fontSize: 13, color: COLORS.textSec, fontFamily: FONTS.textRegular, textAlign: 'center' },

  // Acciones (Sitio web, Instagram, Maps)
  actionRowContainer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)', marginBottom: 16 },
  actionIconButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 10 },
  actionIconText: { color: COLORS.text, fontSize: 13, fontFamily: FONTS.textMedium },

  // Hora laboral
  modalScheduleRowCenter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20, gap: 6 },
  modalScheduleTextCenter: { fontSize: 13, color: COLORS.accent, fontFamily: FONTS.textMedium },

  // Promo / Puntos
  modalPromoBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#13151a', padding: 14, borderRadius: 16, marginBottom: 25, borderWidth: 1, borderColor: '#1f2229' },
  qrIconBadge: { width: 44, height: 44, borderRadius: 10, backgroundColor: 'rgba(1, 195, 142, 0.1)', justifyContent: 'center', alignItems: 'center' },
  modalPromoTitle: { color: '#fff', fontSize: 14, fontFamily: FONTS.textBold, marginBottom: 2 },
  modalPromoVal: { color: COLORS.textSec, fontSize: 11, fontFamily: FONTS.textRegular, lineHeight: 15 },

  sectionTitle: { fontSize: 11, color: COLORS.textSec, fontFamily: FONTS.textBold, letterSpacing: 1, marginBottom: 10, textTransform: 'uppercase' },
  modalDesc: { fontSize: 13, color: '#9ca3af', lineHeight: 20, fontFamily: FONTS.textRegular, marginBottom: 25 },
  
  galleryImg: { width: 160, height: 110, borderRadius: 14, marginRight: 12, backgroundColor: '#13151a' },

  // Botones inferiores (Reservar / Pedir Domicilio)
  modalBottomRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 15, marginBottom: 20 },
  whatsappActionBtnOutline: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 16, borderBottomWidth: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: '#13151a' },
  whatsappBtnTitleOutline: { color: '#fff', fontFamily: FONTS.textBold, fontSize: 13 },
  whatsappBtnSubtextOutline: { color: COLORS.textSec, fontFamily: FONTS.textRegular, fontSize: 10 },

  whatsappActionBtnFilled: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 16, backgroundColor: COLORS.accent },
  whatsappBtnTitleFilled: { color: '#000', fontFamily: FONTS.textBold, fontSize: 13 },
  whatsappBtnSubtextFilled: { color: '#000', opacity: 0.8, fontFamily: FONTS.textRegular, fontSize: 10 },

  fullScreenOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.96)', zIndex: 9999, justifyContent: 'center', alignItems: 'center' },
  closeOverlayBtn: { position: 'absolute', right: 20, zIndex: 10000, backgroundColor: 'rgba(255,255,255,0.1)', padding: 10, borderRadius: 30 },
});