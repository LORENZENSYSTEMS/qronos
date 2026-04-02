import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

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
    nombre: string;
    precio: number;
    descripcion?: string;
    imagenUrl?: string | null;
}

export default function ProductCard({ nombre, precio, descripcion, imagenUrl }: ProductCardProps) {
    const { width } = useWindowDimensions();
    const isSmall = width < 380;

    const getImageSource = (url?: string | null) => {
        if (!url) return { uri: 'https://via.placeholder.com/400x300.png?text=Producto' };
        return { uri: url };
    };

    return (
        <View style={styles.card}>
            <View style={styles.imageContainer}>
                <Image
                    source={getImageSource(imagenUrl)}
                    style={styles.image}
                    resizeMode="cover"
                />
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
