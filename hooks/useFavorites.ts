import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const FAVORITES_KEY = 'qronos_favorites';

export function useFavorites() {
    const [favorites, setFavorites] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Cargar favoritos iniciales desde el almacenamiento
        const loadFavorites = async () => {
            try {
                const storedFavorites = await AsyncStorage.getItem(FAVORITES_KEY);
                if (storedFavorites) {
                    setFavorites(JSON.parse(storedFavorites));
                }
            } catch (error) {
                console.error('Error al cargar favoritos:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadFavorites();
    }, []);

    const toggleFavorite = async (storeId: string) => {
        try {
            setFavorites((prevFavorites) => {
                const isCurrentlyFavorite = prevFavorites.includes(storeId);
                const newFavorites = isCurrentlyFavorite
                    ? prevFavorites.filter((id) => id !== storeId) // Eliminar si ya es favorito
                    : [...prevFavorites, storeId]; // Agregar si no es favorito

                // Guardar el nuevo estado de forma asíncrona pero sin bloquear la UI
                AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites)).catch((err) =>
                    console.error('Error al guardar favorito en AsyncStorage:', err)
                );

                return newFavorites;
            });
        } catch (error) {
            console.error('Error al actualizar favoritos:', error);
        }
    };

    const isFavorite = (storeId: string) => favorites.includes(storeId);

    return {
        favorites,
        isLoading,
        toggleFavorite,
        isFavorite,
    };
}
