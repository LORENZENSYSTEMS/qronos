import React, { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { Callout, Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';

export interface MapPlace {
  id: number;
  titulo?: string;
  categoria?: string;
  ciudad?: string;
  pais?: string;
  lat?: number | null;
  lng?: number | null;
}

const COLORS = {
  background: '#090a0c',
  cardBg: '#181b21',
  accent: '#01c38e',
  textSec: '#8b9bb4',
  border: '#232936'
};

const CATEGORY_COLORS: Record<string, string> = {
  'Restaurantes': '#01c38e',
  'Bar': '#D4AF37',
  'Tiendas': '#7c6cf6',
  'Varios': '#4a8fe7'
};

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#090a0c' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8b9bb4' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#090a0c' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#232936' }, { weight: 1 }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#8b9bb4' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#0b0d10' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#1a1f28' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#5b6b85' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#181b21' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#232936' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#8b9bb4' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#20252f' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#9fb0c9' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1116' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#33415a' }] }
];

interface Place {
  id: number;
  nombre: string;
  categoria: string;
  ciudad: string;
  lat: number;
  lng: number;
}

function buildRegion(places: Place[]) {
  if (places.length === 0) {
    return { latitude: 4.6, longitude: -74.1, latitudeDelta: 50, longitudeDelta: 50 };
  }
  const lats = places.map(p => p.lat);
  const lngs = places.map(p => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const pad = Math.max((maxLat - minLat), (maxLng - minLng), 0.05) * 0.2;
  const latDelta = Math.min(maxLat - minLat + pad * 2, 300);
  const lngDelta = Math.min(maxLng - minLng + pad * 2, 300);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: latDelta,
    longitudeDelta: lngDelta
  };
}

interface CompanyMapProps<T extends MapPlace> {
  lugares: T[];
  height?: number;
  onMarkerPress?: (lugar: T) => void;
}

export default function CompanyMap<T extends MapPlace>({ lugares, height, onMarkerPress }: CompanyMapProps<T>) {
  const places = useMemo(() => {
    return lugares
      .map(l => ({
        id: l.id,
        nombre: l.titulo ?? '',
        categoria: l.categoria ?? 'Varios',
        ciudad: l.ciudad ?? '',
        lat: l.lat,
        lng: l.lng
      }))
      .filter((p): p is Place => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  }, [lugares]);

  const region = useMemo(() => buildRegion(places), [places]);

  const placeById = useMemo(() => {
    const map = new Map<number, T>();
    lugares.forEach(l => map.set(l.id, l));
    return map;
  }, [lugares]);

  if (places.length === 0) {
    return (
      <View style={[styles.emptyContainer, height ? { height } : styles.flexFill]}>
        <Text style={styles.emptyIcon}>🗺️</Text>
        <Text style={styles.emptyText}>Sin ubicaciones disponibles.</Text>
      </View>
    );
  }

  return (
    <View style={height ? { height } : styles.flexFill}>
      <MapView
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
        style={styles.map}
        customMapStyle={DARK_MAP_STYLE}
        region={region}
      >
        {places.map(p => {
          const lugar = placeById.get(p.id);
          const color = CATEGORY_COLORS[p.categoria] || COLORS.accent;
          return (
            <Marker
              key={p.id}
              coordinate={{ latitude: p.lat, longitude: p.lng }}
              onPress={() => {
                if (lugar && onMarkerPress) onMarkerPress(lugar);
              }}
            >
              <View style={[styles.markerOuter, { backgroundColor: color }]}>
                <View style={styles.markerInner} />
              </View>
              <Callout tooltip>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle}>{p.nombre}</Text>
                  <Text style={styles.calloutSub}>
                    {p.categoria}
                    {p.ciudad ? ` • ${p.ciudad}` : ''}
                  </Text>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  flexFill: { flex: 1 },
  map: { flex: 1, backgroundColor: COLORS.background, borderRadius: 16 },
  markerOuter: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4
  },
  markerInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.background },
  callout: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  calloutTitle: { fontWeight: '700', fontSize: 13, color: '#fff' },
  calloutSub: { fontSize: 11, color: COLORS.textSec, marginTop: 2 },
  emptyContainer: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyIcon: { fontSize: 32, opacity: 0.5, marginBottom: 8 },
  emptyText: { color: COLORS.textSec, fontFamily: 'Poppins-Medium', fontSize: 13 }
});