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
    whatsapp?: string | null; // ✅ 1. Añadido a la interfaz
    img1?: string | null;
    img2?: string | null;
    img3?: string | null;
}

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
        whatsapp: item.whatsapp, // ✅ 2. AHORA SÍ PASAMOS EL WHATSAPP AL DASHBOARD
        img1: item.fotoDescripcion1,
        img2: item.fotoDescripcion2,
        img3: item.fotoDescripcion3,
    }));
};

export function useCompanies() {
    // Bajamos el staleTime a 5 minutos para que los cambios se vean rápido durante el desarrollo
    const REFRESH_TIME = 1000 * 60 * 5; 

    return useQuery({
        queryKey: ['companies'],
        queryFn: fetchCompanies,
        staleTime: REFRESH_TIME,
        gcTime: REFRESH_TIME,
    });
}