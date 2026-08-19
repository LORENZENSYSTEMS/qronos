import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

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

function buildHtml(data: any[]): string {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html, body, #map { height: 100%; margin: 0; padding: 0; background: #090a0c; }
  .leaflet-container { background: #090a0c; font-family: -apple-system, Roboto, sans-serif; }
  .leaflet-popup-content-wrapper { background: #181b21; color: #fff; border: 1px solid #232936; border-radius: 12px; box-shadow: 0 4px 14px rgba(0,0,0,0.5); }
  .leaflet-popup-tip { background: #181b21; border: 1px solid #232936; }
  .leaflet-popup-content { margin: 12px 14px; }
  .leaflet-control-attribution { background: rgba(9,10,12,0.8) !important; color: #8b9bb4 !important; font-size: 9px !important; }
  .leaflet-control-attribution a { color: #01c38e !important; }
  .pop-title { font-weight: 700; font-size: 13px; color: #fff; }
  .pop-sub { font-size: 11px; color: #8b9bb4; margin-top: 2px; }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var DATA = ${json};
var CATEGORY_COLORS = ${JSON.stringify(CATEGORY_COLORS)};
function esc(s) { var d = document.createElement('div'); d.textContent = String(s == null ? '' : s); return d.innerHTML; }
var map = L.map('map', { zoomControl: true }).setView([4.6, -74.1], 5);
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  subdomains: 'abcd',
  maxZoom: 20
}).addTo(map);
var markers = [];
DATA.forEach(function (p) {
  var color = CATEGORY_COLORS[p.categoria] || '#01c38e';
  var icon = L.divIcon({
    className: '',
    html: '<div style="width:26px;height:26px;border-radius:50%;background:' + color + ';border:3px solid #fff;box-shadow:0 0 8px rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;"><div style="width:8px;height:8px;border-radius:50%;background:#090a0c;"></div></div>',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -16]
  });
  var m = L.marker([p.lat, p.lng], { icon: icon }).addTo(map);
  m.bindPopup('<div class="pop-title">' + esc(p.nombre) + '</div><div class="pop-sub">' + esc(p.categoria) + (p.ciudad ? ' &bull; ' + esc(p.ciudad) : '') + '</div>');
  m.on('click', function () {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ id: p.id }));
    }
  });
  markers.push(m);
});
if (markers.length === 1) {
  map.setView(markers[0].getLatLng(), 15);
} else if (markers.length > 1) {
  var group = L.featureGroup(markers);
  map.fitBounds(group.getBounds().pad(0.2), { maxZoom: 15 });
}
</script>
</body>
</html>`;
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
      .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  }, [lugares]);

  const html = useMemo(() => buildHtml(places), [places]);

  const handleMessage = (event: any) => {
    try {
      const parsed = JSON.parse(event.nativeEvent.data);
      const lugar = lugares.find(l => l.id === parsed.id);
      if (lugar && onMarkerPress) onMarkerPress(lugar);
    } catch (e) {
      console.error('CompanyMap message error:', e);
    }
  };

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
      <WebView
        originWhitelist={['*']}
        source={{ html, baseUrl: 'https://unpkg.com/' }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        onMessage={handleMessage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flexFill: { flex: 1 },
  webview: { flex: 1, backgroundColor: COLORS.background, borderRadius: 16 },
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