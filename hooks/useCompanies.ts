import { useQuery } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';

export interface Lugar {
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
    lat?: number | null;
    lng?: number | null;
    horarioApertura?: string;
    horarioCierre?: string;
    // --- CAMPOS DE RESERVAS AÑADIDOS ---
    mostrar_reservas?: boolean | string | number;
    mostrarReservas?: boolean | string | number;
    tipo_reservas?: string;
    tipoReservas?: string;
}

const parseCoord = (value: any): number | null => {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
};

const fetchCompanies = async (): Promise<Lugar[]> => {
    const baseUrl = process.env.EXPO_PUBLIC_API_URL;
    const token = await SecureStore.getItemAsync('jwt');

    const response = await fetch(`${baseUrl}/api/empresa`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });

    const data = await response.json();

    if (!Array.isArray(data)) {
        if (response.status === 401) {
            Alert.alert("Sesión expirada", "Por favor inicia sesión nuevamente.");
        }
        throw new Error('La API no devolvió un array.');
    }

    return data.map((item: any) => ({
        id: item.empresa_id,
        titulo: item.nombreCompleto,
        descripcion: item.descripcion || "Sin descripción",
        imagen: item.fotoPerfil,
        categoria: item.categoria || 'Varios',
        pais: item.pais,
        ciudad: item.ciudad,
        descuentos: item.descuento,
        mapLink: item.ubicacionMaps,
        whatsapp: item.whatsapp,
        img1: item.fotoDescripcion1,
        img2: item.fotoDescripcion2,
        img3: item.fotoDescripcion3,
        lat: parseCoord(item.lat ?? item.latitud ?? item.latitude),
        lng: parseCoord(item.lng ?? item.longitud ?? item.lon ?? item.longitude),
        horarioApertura: item.horarioApertura,
        horarioCierre: item.horarioCierre,
        // --- MAPEO DE CAMPOS DE RESERVAS DESDE EL BACKEND ---
        mostrar_reservas: item.mostrar_reservas ?? item.mostrarReservas,
        mostrarReservas: item.mostrar_reservas ?? item.mostrarReservas,
        tipo_reservas: item.tipo_reservas ?? item.tipoReservas,
        tipoReservas: item.tipo_reservas ?? item.tipoReservas,
    }));
};

export function useCompanies() {
    const REFRESH_TIME = 1000 * 60 * 5; 

    return useQuery({
        queryKey: ['companies'],
        queryFn: fetchCompanies,
        staleTime: REFRESH_TIME,
        gcTime: REFRESH_TIME,
    });
}