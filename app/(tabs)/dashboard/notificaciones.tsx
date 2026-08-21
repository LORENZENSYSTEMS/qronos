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

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const COLORS = {
  background: '#0f1115',
  cardBg: '#181b21',
  accent: '#01c38e',
  text: '#ffffff',
  textSec: '#8b9bb4',
  border: '#232936',
  pink: '#E1306C'
};

const FONTS = {
  title: 'Heavitas',
  textRegular: 'Poppins-Regular',
  textMedium: 'Poppins-Medium',
  textBold: 'Poppins-Bold'
};

interface Cliente {
  id: number;
  nombreCompleto: string;
  correo: string;
}

export default function NotificacionesScreen() {
  const router = useRouter();
  const safeAreaInsets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [jwtState, setJwt] = useState<string | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [busqueda, setBusqueda] = useState('');
  const [titulo, setTitulo] = useState('');
  const [contenido, setContenido] = useState('');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [enviando, setEnviando] = useState(false);

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

      const jwt = await SecureStore.getItemAsync('jwt');
      setJwt(jwt);
    };
    loadJwt();
  }, []);

  const fetchClientes = async () => {
    try {
      const res = await fetch(`${API_URL}/api/cliente/with-token`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtState}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        const lista = Array.isArray(data) ? data : (data.clientes || []);
        const mapeados: Cliente[] = lista.map((c: any) => ({
          id: c.cliente_id ?? c.id,
          nombreCompleto: c.nombreCompleto || 'Sin nombre',
          correo: c.correo || '',
        })).filter((c: Cliente) => typeof c.id === 'number');
        setClientes(mapeados);
        setSelectedIds(prev => new Set([...prev].filter(id => mapeados.some(m => m.id === id))));
      } else {
        Alert.alert("Error", "No se pudieron cargar los clientes.");
      }
    } catch (error) {
      console.error("Error de red:", error);
      Alert.alert("Error", "Revisa tu conexión.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (jwtState) fetchClientes();
  }, [jwtState]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchClientes();
  };

  const clientesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter(c =>
      c.nombreCompleto.toLowerCase().includes(q) ||
      c.correo.toLowerCase().includes(q)
    );
  }, [clientes, busqueda]);

  const toggleCliente = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const seleccionarTodos = () => {
    setSelectedIds(new Set(clientesFiltrados.map(c => c.id)));
  };

  const quitarTodos = () => {
    setSelectedIds(new Set());
  };

  const handleEnviar = async () => {
    const tituloFinal = titulo.trim();
    const contenidoFinal = contenido.trim();

    if (!tituloFinal) {
      Alert.alert("Título requerido", "Escribe el título de la notificación.");
      return;
    }
    if (!contenidoFinal) {
      Alert.alert("Contenido requerido", "Escribe el contenido de la notificación.");
      return;
    }
    if (selectedIds.size === 0) {
      Alert.alert("Sin destinatarios", "Selecciona al menos un usuario.");
      return;
    }

    const destinatarios = clientes.filter(c => selectedIds.has(c.id));

    Alert.alert(
      "Enviar Notificación",
      `Se enviará la notificación a ${destinatarios.length} ${destinatarios.length === 1 ? 'usuario' : 'usuarios'}. ¿Continuar?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Enviar",
          style: "default",
          onPress: async () => {
            setEnviando(true);
            let enviadas = 0;
            let fallidas = 0;

            await Promise.all(destinatarios.map(async (cliente) => {
              try {
                const res = await fetch(`${API_URL}/api/notifications/send-to-user`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${jwtState}`,
                  },
                  body: JSON.stringify({
                    userId: cliente.id,
                    title: tituloFinal,
                    body: contenidoFinal,
                  }),
                });

                if (res.ok) enviadas++;
                else fallidas++;
              } catch (error) {
                console.error("Error al enviar:", error);
                fallidas++;
              }
            }));

            setEnviando(false);

            if (fallidas === 0) {
              Alert.alert("Notificaciones enviadas", `Se enviaron correctamente a ${enviadas} ${enviadas === 1 ? 'usuario' : 'usuarios'}.`);
            } else {
              Alert.alert(
                "Envío finalizado",
                `Enviadas: ${enviadas}\nFallidas: ${fallidas}`
              );
            }
          }
        }
      ]
    );
  };

  if (!fontsLoaded || loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={{ marginTop: normalize(15), color: COLORS.textSec, fontFamily: FONTS.textMedium, fontSize: normalize(14) }}>
          Cargando clientes...
        </Text>
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
          <Text style={styles.headerTitle}>NOTIFICACIONES</Text>
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
        {/* --- DESTINATARIOS --- */}
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="people-outline" size={normalize(18)} color={COLORS.pink} />
          <Text style={styles.sectionTitle}>DESTINATARIOS</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{selectedIds.size}</Text>
          </View>
        </View>

        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre o correo..."
            placeholderTextColor={COLORS.textSec}
            value={busqueda}
            onChangeText={setBusqueda}
          />
        </View>

        <View style={styles.selectRow}>
          <TouchableOpacity
            style={styles.selectBtn}
            onPress={seleccionarTodos}
            disabled={clientesFiltrados.length === 0}
          >
            <Ionicons name="checkmark-done-outline" size={normalize(16)} color={COLORS.accent} />
            <Text style={styles.selectBtnText}>Seleccionar todos</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.selectBtn}
            onPress={quitarTodos}
            disabled={selectedIds.size === 0}
          >
            <Ionicons name="close-outline" size={normalize(16)} color="#ff4444" />
            <Text style={[styles.selectBtnText, { color: '#ff4444' }]}>Quitar todos</Text>
          </TouchableOpacity>
        </View>

        {clientes.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={normalize(44)} color={COLORS.border} />
            <Text style={styles.emptyText}>No hay usuarios con token de notificación registrado.</Text>
          </View>
        ) : clientesFiltrados.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={normalize(44)} color={COLORS.border} />
            <Text style={styles.emptyText}>No se encontraron usuarios con ese filtro.</Text>
          </View>
        ) : (
          clientesFiltrados.map((cliente) => {
            const seleccionado = selectedIds.has(cliente.id);
            return (
              <TouchableOpacity
                key={cliente.id}
                style={[styles.itemCard, seleccionado && styles.itemCardActive]}
                onPress={() => toggleCliente(cliente.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, seleccionado && styles.checkboxActive]}>
                  {seleccionado && <Ionicons name="checkmark" size={normalize(16)} color="#000" />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle} numberOfLines={1}>{cliente.nombreCompleto}</Text>
                  <Text style={styles.itemSubtitle} numberOfLines={1}>{cliente.correo}</Text>
                </View>
                <Ionicons
                  name="person-circle-outline"
                  size={normalize(26)}
                  color={seleccionado ? COLORS.accent : COLORS.textSec}
                />
              </TouchableOpacity>
            );
          })
        )}

        {/* --- CONTENIDO --- */}
        <View style={[styles.sectionHeaderRow, styles.sectionSpacing]}>
          <Ionicons name="create-outline" size={normalize(18)} color={COLORS.accent} />
          <Text style={styles.sectionTitle}>CONTENIDO</Text>
        </View>

        <Text style={styles.label}>TÍTULO</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: ¡Nueva promoción disponible!"
          placeholderTextColor={COLORS.textSec}
          value={titulo}
          onChangeText={setTitulo}
          maxLength={80}
        />

        <Text style={styles.label}>CONTENIDO</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Escribe el mensaje de la notificación..."
          placeholderTextColor={COLORS.textSec}
          value={contenido}
          onChangeText={setContenido}
          multiline
          textAlignVertical="top"
          maxLength={300}
        />

        <TouchableOpacity
          style={styles.btnEnviar}
          onPress={handleEnviar}
          disabled={enviando}
          activeOpacity={0.85}
        >
          {enviando ? (
            <ActivityIndicator color="#000" />
          ) : (
            <>
              <Ionicons name="send" size={normalize(20)} color="#000" />
              <Text style={styles.btnEnviarText}>ENVIAR NOTIFICACIÓN</Text>
            </>
          )}
        </TouchableOpacity>

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
    countBadge: { backgroundColor: COLORS.border, paddingHorizontal: normalize(8), paddingVertical: normalize(2), borderRadius: normalize(6), marginLeft: normalize(10) },
    countText: { color: COLORS.text, fontSize: normalize(10), fontFamily: FONTS.textBold },

    searchRow: { flexDirection: 'row', gap: normalize(8), marginBottom: normalize(12) },
    searchInput: {
      flex: 1,
      backgroundColor: COLORS.cardBg,
      borderRadius: normalize(12),
      padding: normalize(14),
      color: COLORS.text,
      fontFamily: FONTS.textRegular,
      borderWidth: 1,
      borderColor: COLORS.border,
    },

    selectRow: { flexDirection: 'row', gap: normalize(8), marginBottom: normalize(15) },
    selectBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: normalize(6),
      paddingVertical: normalize(10),
      backgroundColor: COLORS.cardBg,
      borderRadius: normalize(10),
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    selectBtnText: { color: COLORS.accent, fontFamily: FONTS.textMedium, fontSize: normalize(11) },

    itemCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.cardBg,
      borderRadius: normalize(14),
      padding: normalize(14),
      marginBottom: normalize(10),
      borderWidth: 1,
      borderColor: COLORS.border,
      gap: normalize(12),
    },
    itemCardActive: {
      borderColor: COLORS.accent,
      backgroundColor: 'rgba(1, 195, 142, 0.06)',
    },
    checkbox: {
      width: normalize(24),
      height: normalize(24),
      borderRadius: normalize(7),
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: 'rgba(255,255,255,0.04)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkboxActive: {
      backgroundColor: COLORS.accent,
      borderColor: COLORS.accent,
    },
    itemTitle: { color: COLORS.text, fontFamily: FONTS.textMedium, fontSize: normalize(14) },
    itemSubtitle: { color: COLORS.textSec, fontFamily: FONTS.textRegular, fontSize: normalize(11), marginTop: 2 },

    emptyState: { alignItems: 'center', marginTop: normalize(40), opacity: 0.5, marginBottom: normalize(20) },
    emptyText: { color: COLORS.textSec, marginTop: normalize(12), fontFamily: FONTS.textMedium, fontSize: normalize(13), textAlign: 'center' },

    label: {
      fontFamily: FONTS.textBold,
      color: COLORS.accent,
      fontSize: normalize(10),
      letterSpacing: 1,
      marginBottom: normalize(8),
      textTransform: 'uppercase',
    },
    input: {
      backgroundColor: COLORS.cardBg,
      borderRadius: normalize(12),
      padding: normalize(14),
      color: COLORS.text,
      fontFamily: FONTS.textRegular,
      marginBottom: normalize(20),
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    textArea: {
      minHeight: normalize(120),
      maxHeight: normalize(180),
      paddingTop: normalize(14),
    },

    btnEnviar: {
      backgroundColor: COLORS.accent,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: normalize(8),
      padding: normalize(16),
      borderRadius: normalize(16),
      marginTop: normalize(5),
      shadowColor: COLORS.accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 5,
    },
    btnEnviarText: {
      color: '#000',
      fontFamily: FONTS.title,
      fontSize: normalize(14),
    },
  });
};