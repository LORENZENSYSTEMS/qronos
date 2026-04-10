import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';

const COLORS = {
    cardBg: '#181b21',
    accent: '#01c38e',
    text: '#ffffff',
    textSec: '#8b9bb4',
    border: '#232936',
};

const FONTS = {
    title: 'Heavitas',
    textRegular: 'Poppins-Regular',
    textMedium: 'Poppins-Medium',
    textBold: 'Poppins-Bold'
};

interface ProductCardProps {
    producto_id?: number;
    nombre: string;
    precio: number;
    descripcion?: string;
    imagenUrl?: string | null;
    onDeleteSuccess?: (id: number) => void;
}

export default function ProductCard({ producto_id, nombre, precio, descripcion, imagenUrl, onDeleteSuccess }: ProductCardProps) {
    const { width } = useWindowDimensions();
    const isSmall = width < 380;
    const [isDeleting, setIsDeleting] = useState(false);

    const getImageSource = (url?: string | null) => {
        if (!url) return { uri: 'https://via.placeholder.com/400x300.png?text=Producto' };
        return { uri: url };
    };

    const handleDelete = () => {
        Alert.alert(
            '¿Eliminar producto?',
            '¿Estás seguro de que deseas eliminar este producto del catálogo?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        if (!producto_id) return;
                        setIsDeleting(true);
                        try {
                            const API_URL = process.env.EXPO_PUBLIC_API_URL;
                            const response = await fetch(`${API_URL}/api/productos/${producto_id}`, {
                                method: 'DELETE',
                            });
                            
                            if (response.status === 200) {
                                Alert.alert("Éxito", "Producto eliminado correctamente.");
                                if (onDeleteSuccess) {
                                    onDeleteSuccess(producto_id);
                                }
                            } else {
                                let errorMsg = "Error al eliminar el producto.";
                                try {
                                    const errorData = await response.json();
                                    errorMsg = errorData.message || errorData.error || errorMsg;
                                } catch (e) {
                                    const textQuote = await response.text();
                                    if (textQuote) errorMsg = textQuote;
                                }
                                Alert.alert("Error", errorMsg);
                            }
                        } catch (error) {
                            Alert.alert("Error", "Error de red al intentar eliminar el producto.");
                            console.error(error);
                        } finally {
                            setIsDeleting(false);
                        }
                    }
                }
            ]
        );
    };

    return (
        <View style={styles.card}>
            <View style={styles.imageContainer}>
                <Image
                    source={getImageSource(imagenUrl)}
                    style={styles.image}
                    resizeMode="cover"
                />
                {producto_id !== undefined && onDeleteSuccess && (
                    <TouchableOpacity 
                        style={styles.deleteButton} 
                        onPress={handleDelete}
                        disabled={isDeleting}
                    >
                        {isDeleting ? (
                            <ActivityIndicator size="small" color="#ff4444" />
                        ) : (
                            <Ionicons name="trash" size={20} color="#ff4444" />
                        )}
                    </TouchableOpacity>
                )}
            </View>
            <View style={styles.info}>
                <Text style={styles.nombre} numberOfLines={1}>{nombre}</Text>
                {descripcion ? (
                    <Text style={styles.descripcion} numberOfLines={2}>{descripcion}</Text>
                ) : null}
                <View style={styles.footer}>
                    <Text style={styles.precio}>${precio.toFixed(2)}</Text>
                    <Ionicons name="cart-outline" size={16} color={COLORS.accent} />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden',
        width: '100%',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    imageContainer: {
        height: 120,
        width: '100%',
        backgroundColor: '#13151a',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    deleteButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.6)',
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    info: {
        padding: 12,
    },
    nombre: {
        color: COLORS.text,
        fontFamily: FONTS.title,
        fontSize: 14,
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    descripcion: {
        color: COLORS.textSec,
        fontFamily: FONTS.textRegular,
        fontSize: 11,
        lineHeight: 16,
        marginBottom: 8,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
    },
    precio: {
        color: COLORS.accent,
        fontFamily: FONTS.textBold,
        fontSize: 15,
    }
});
