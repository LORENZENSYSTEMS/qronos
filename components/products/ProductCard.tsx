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
    onDeleteSuccess?: (id: number) => void; // Para modo Admin
    onEdit?: () => void;                   // NUEVO: Para editar producto
    cantidad?: number;                     // Para modo Cliente/Carrito
    onAdd?: () => void;                    // Para modo Cliente/Carrito
    onRemove?: () => void;                 // Para modo Cliente/Carrito
    onImagePress?: (url: string) => void;  // NUEVO: Para abrir la imagen en grande
}

export default function ProductCard({ 
    producto_id, 
    nombre, 
    precio, 
    descripcion, 
    imagenUrl, 
    onDeleteSuccess,
    onEdit,
    cantidad = 0,
    onAdd,
    onRemove,
    onImagePress 
}: ProductCardProps) {
    const { width } = useWindowDimensions();
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
                                if (onDeleteSuccess) onDeleteSuccess(producto_id);
                            } else {
                                Alert.alert("Error", "No se pudo eliminar el producto.");
                            }
                        } catch (error) {
                            Alert.alert("Error", "Error de red.");
                        } finally {
                            setIsDeleting(false);
                        }
                    }
                }
            ]
        );
    };

    return (
        <View style={[styles.card, cantidad > 0 && { borderColor: COLORS.accent }]}>
            {/* NUEVO: TouchableOpacity rodeando la imagen para detectar el clic */}
            <TouchableOpacity 
                activeOpacity={onImagePress ? 0.8 : 1}
                onPress={() => onImagePress && imagenUrl && onImagePress(imagenUrl)}
                style={styles.imageContainer}
            >
                <Image
                    source={getImageSource(imagenUrl)}
                    style={styles.image}
                    resizeMode="cover"
                />
                
                {/* Badge de cantidad seleccionada */}
                {cantidad > 0 && (
                    <View style={styles.quantityBadge}>
                        <Text style={styles.quantityText}>{cantidad}</Text>
                    </View>
                )}

                {/* Botón de eliminar (Solo si se pasa onDeleteSuccess - Modo Admin) */}
                {producto_id !== undefined && onDeleteSuccess && (
                    <TouchableOpacity 
                        style={styles.deleteButton} 
                        onPress={handleDelete}
                        disabled={isDeleting}
                    >
                        {isDeleting ? (
                            <ActivityIndicator size="small" color="#ff4444" />
                        ) : (
                            <Ionicons name="trash" size={18} color="#ff4444" />
                        )}
                    </TouchableOpacity>
                )}

                {/* NUEVO: Botón de editar (Solo si se pasa onEdit) */}
                {onEdit && (
                    <TouchableOpacity 
                        style={styles.editButton} 
                        onPress={onEdit}
                    >
                        <Ionicons name="pencil" size={18} color={COLORS.accent} />
                    </TouchableOpacity>
                )}
            </TouchableOpacity>

            <View style={styles.info}>
                <Text style={styles.nombre} numberOfLines={1}>{nombre}</Text>
                {descripcion ? (
                    <Text style={styles.descripcion} numberOfLines={2}>{descripcion}</Text>
                ) : null}
                
                <View style={styles.footer}>
                    <Text style={styles.precio}>${Number(precio).toLocaleString()}</Text>
                    
                    {/* Controles de Carrito (Solo si se pasan onAdd/onRemove - Modo Cliente) */}
                    {onAdd && onRemove ? (
                        <View style={styles.cartControls}>
                            <TouchableOpacity onPress={onRemove} style={styles.controlBtn}>
                                <Ionicons name="remove-circle-outline" size={24} color={cantidad > 0 ? COLORS.accent : COLORS.border} />
                            </TouchableOpacity>
                            
                            <Text style={[styles.qtyText, { color: cantidad > 0 ? COLORS.text : COLORS.textSec }]}>
                                {cantidad}
                            </Text>

                            <TouchableOpacity onPress={onAdd} style={styles.controlBtn}>
                                <Ionicons name="add-circle" size={24} color={COLORS.accent} />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <Ionicons name="cart-outline" size={18} color={COLORS.textSec} />
                    )}
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
        width: 160, // Ancho fijo para el scroll horizontal del Dashboard
        marginRight: 12,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    imageContainer: {
        height: 110,
        width: '100%',
        backgroundColor: '#13151a',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    quantityBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: COLORS.accent,
        borderRadius: 8,
        paddingHorizontal: 7,
        paddingVertical: 2,
    },
    quantityText: {
        color: '#000',
        fontFamily: FONTS.textBold,
        fontSize: 11,
    },
    deleteButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.6)',
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    editButton: {
        position: 'absolute',
        top: 8,
        right: 48, // Al lado del de eliminar si ambos existen
        backgroundColor: 'rgba(0,0,0,0.6)',
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    info: {
        padding: 12,
    },
    nombre: {
        color: COLORS.text,
        fontFamily: FONTS.textBold,
        fontSize: 13,
        marginBottom: 2,
    },
    descripcion: {
        color: COLORS.textSec,
        fontFamily: FONTS.textRegular,
        fontSize: 11,
        lineHeight: 14,
        marginBottom: 8,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    precio: {
        color: COLORS.accent,
        fontFamily: FONTS.textBold,
        fontSize: 14,
    },
    cartControls: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 20,
        paddingHorizontal: 4,
    },
    controlBtn: {
        padding: 2,
    },
    qtyText: {
        fontFamily: FONTS.textBold,
        fontSize: 13,
        marginHorizontal: 8,
    }
});