import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
    onEdit?: () => void;
    cantidad?: number;
    onAdd?: () => void;
    onRemove?: () => void;
    onImagePress?: (url: string) => void;
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
    const [isDeleting, setIsDeleting] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

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
        <TouchableOpacity 
            style={[styles.cardContainer, isExpanded && styles.cardContainerExpanded]} 
            activeOpacity={0.9} 
            onPress={() => setIsExpanded(!isExpanded)}
        >
            {/* VISTA CONTRAÍDA (FILA) */}
            <View style={styles.rowLayout}>
                <View style={styles.thumbnailContainer}>
                    <Image source={getImageSource(imagenUrl)} style={styles.thumbnail} />
                </View>

                <View style={styles.infoCol}>
                    <Text style={styles.nombre} numberOfLines={2}>{nombre}</Text>
                    {!isExpanded && descripcion && (
                        <Text style={styles.shortDesc} numberOfLines={1}>{descripcion}</Text>
                    )}
                    <Text style={styles.precio}>${Number(precio).toLocaleString()}</Text>
                </View>

                {/* CONTROLES DE CARRITO U OPCIONES */}
                <View style={styles.actionCol}>
                    {onAdd && onRemove ? (
                        cantidad === 0 ? (
                            <TouchableOpacity style={styles.addBtn} onPress={onAdd}>
                                <Ionicons name="add" size={20} color={COLORS.background} />
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.cartControls}>
                                <TouchableOpacity onPress={onRemove} style={styles.qtyBtn}>
                                    <Ionicons name="remove" size={16} color={COLORS.text} />
                                </TouchableOpacity>
                                <Text style={styles.qtyText}>{cantidad}</Text>
                                <TouchableOpacity onPress={onAdd} style={styles.qtyBtn}>
                                    <Ionicons name="add" size={16} color={COLORS.text} />
                                </TouchableOpacity>
                            </View>
                        )
                    ) : null}

                    {/* Botones de Admin */}
                    {onEdit && (
                        <TouchableOpacity style={[styles.adminBtn, { backgroundColor: COLORS.accent, marginTop: 8 }]} onPress={onEdit}>
                            <Ionicons name="pencil" size={14} color={COLORS.background} />
                        </TouchableOpacity>
                    )}
                    {producto_id !== undefined && onDeleteSuccess && (
                        <TouchableOpacity style={[styles.adminBtn, { backgroundColor: '#ff4444', marginTop: 8 }]} onPress={handleDelete} disabled={isDeleting}>
                            {isDeleting ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="trash" size={14} color="#fff" />}
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* VISTA EXPANDIDA (FOTO GRANDE Y TEXTO COMPLETO) */}
            {isExpanded && (
                <View style={styles.expandedContent}>
                    <TouchableOpacity 
                        activeOpacity={onImagePress ? 0.8 : 1} 
                        onPress={() => onImagePress && imagenUrl && onImagePress(imagenUrl)}
                    >
                        <Image source={getImageSource(imagenUrl)} style={styles.largeImage} />
                    </TouchableOpacity>
                    {descripcion && (
                        <View style={styles.descBox}>
                            <Text style={styles.sectionLabel}>Detalles del producto</Text>
                            <Text style={styles.fullDesc}>{descripcion}</Text>
                        </View>
                    )}
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    cardContainer: {
        backgroundColor: COLORS.background,
        borderBottomWidth: 1,
        borderColor: COLORS.border,
        paddingVertical: 16,
        paddingHorizontal: 8,
        width: '100%',
    },
    cardContainerExpanded: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 16,
        borderBottomWidth: 0,
        marginVertical: 8,
        padding: 12,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    rowLayout: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    thumbnailContainer: {
        width: 70,
        height: 70,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#1E2129',
    },
    thumbnail: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    infoCol: {
        flex: 1,
        paddingHorizontal: 14,
        justifyContent: 'center',
    },
    nombre: {
        color: COLORS.text,
        fontFamily: FONTS.textBold,
        fontSize: 14,
        marginBottom: 4,
    },
    shortDesc: {
        color: COLORS.textSec,
        fontFamily: FONTS.textRegular,
        fontSize: 11,
        marginBottom: 6,
    },
    precio: {
        color: COLORS.accent,
        fontFamily: FONTS.textMedium,
        fontSize: 14,
    },
    actionCol: {
        alignItems: 'flex-end',
        justifyContent: 'center',
        minWidth: 80,
    },
    addBtn: {
        backgroundColor: COLORS.accent,
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: COLORS.accent,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
    },
    cartControls: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E2129',
        borderRadius: 20,
        paddingHorizontal: 4,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    qtyBtn: {
        width: 28,
        height: 28,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#2A2E39',
        borderRadius: 14,
    },
    qtyText: {
        color: COLORS.text,
        fontFamily: FONTS.textBold,
        fontSize: 13,
        marginHorizontal: 12,
    },
    adminBtn: {
        padding: 6,
        borderRadius: 8,
    },
    expandedContent: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderColor: COLORS.border,
    },
    largeImage: {
        width: '100%',
        height: 200,
        borderRadius: 12,
        resizeMode: 'cover',
        marginBottom: 16,
    },
    descBox: {
        backgroundColor: 'rgba(255,255,255,0.02)',
        padding: 12,
        borderRadius: 12,
    },
    sectionLabel: {
        color: COLORS.accent,
        fontFamily: FONTS.textBold,
        fontSize: 10,
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    fullDesc: {
        color: '#E2E8F0',
        fontFamily: FONTS.textRegular,
        fontSize: 13,
        lineHeight: 20,
    }
});