import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const COLORS = {
    background: '#0f1115',
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

interface ProductFormModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
    empresaId: string;
}

export default function ProductFormModal({ visible, onClose, onSuccess, empresaId }: ProductFormModalProps) {
    const [nombre, setNombre] = useState('');
    const [precio, setPrecio] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [imagen, setImagen] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permiso requerido', 'Se necesita acceso a la galería para subir una imagen del producto.');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.7,
        });

        if (!result.canceled) {
            setImagen(result.assets[0].uri);
        }
    };

    const handleSave = async () => {
        if (!nombre || !precio || !imagen) {
            Alert.alert("Campos incompletos", "Por favor completa el nombre, precio y selecciona una imagen.");
            return;
        }

        setIsSaving(true);
        try {
            const API_URL = process.env.EXPO_PUBLIC_API_URL;
            const data = new FormData();

            data.append('nombre', nombre);
            data.append('precio', precio);
            data.append('empresa_id', empresaId);
            data.append('descripcion', descripcion);

            const filename = imagen.split('/').pop();
            const match = /\.(\w+)$/.exec(filename || '');
            const type = match ? `image/${match[1]}` : `image`;

            // @ts-ignore
            data.append('imagen', { uri: imagen, name: filename, type });

            const response = await fetch(`${API_URL}/api/productos`, {
                method: 'POST',
                headers: { 'Accept': 'application/json' },
                body: data
            });

            if (response.ok) {
                Alert.alert("Éxito", "Producto creado correctamente.");
                resetForm();
                onSuccess();
                onClose();
            } else {
                const errText = await response.text();
                console.error("Server Error:", errText);
                Alert.alert("Error", "No se pudo crear el producto. Inténtalo de nuevo.");
            }
        } catch (error) {
            console.error("Network Error:", error);
            Alert.alert("Error", "Error de conexión con el servidor.");
        } finally {
            setIsSaving(false);
        }
    };

    const resetForm = () => {
        setNombre('');
        setPrecio('');
        setDescripcion('');
        setImagen(null);
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                    style={styles.keyboardView}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.header}>
                            <Text style={styles.headerTitle}>NUEVO <Text style={{ color: COLORS.accent }}>PRODUCTO</Text></Text>
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color={COLORS.textSec} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
                            <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
                                {imagen ? (
                                    <Image source={{ uri: imagen }} style={styles.pickedImage} />
                                ) : (
                                    <View style={styles.placeholderImage}>
                                        <Ionicons name="camera-outline" size={40} color={COLORS.textSec} />
                                        <Text style={styles.placeholderText}>Añadir Imagen</Text>
                                    </View>
                                )}
                            </TouchableOpacity>

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Nombre del Producto</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Ej: Café Americano"
                                    placeholderTextColor={COLORS.textSec}
                                    value={nombre}
                                    onChangeText={setNombre}
                                />

                                <Text style={styles.label}>Precio</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Ej: 3.50"
                                    placeholderTextColor={COLORS.textSec}
                                    keyboardType="numeric"
                                    value={precio}
                                    onChangeText={setPrecio}
                                />

                                <Text style={styles.label}>Descripción (Opcional)</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    placeholder="Ej: Café de grano premium..."
                                    placeholderTextColor={COLORS.textSec}
                                    multiline
                                    value={descripcion}
                                    onChangeText={setDescripcion}
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.saveBtn, isSaving && { opacity: 0.7 }]}
                                onPress={handleSave}
                                disabled={isSaving}
                            >
                                {isSaving ? (
                                    <ActivityIndicator color="#000" />
                                ) : (
                                    <Text style={styles.saveBtnText}>CREAR PRODUCTO</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'flex-end',
    },
    keyboardView: {
        width: '100%',
    },
    modalContent: {
        backgroundColor: COLORS.background,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingHorizontal: 24,
        paddingBottom: 40,
        maxHeight: '90%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 25,
    },
    headerTitle: {
        fontFamily: FONTS.title,
        fontSize: 20,
        color: COLORS.text,
    },
    closeBtn: {
        padding: 5,
    },
    scroll: {
        paddingBottom: 20,
    },
    imagePicker: {
        width: '100%',
        height: 180,
        backgroundColor: COLORS.cardBg,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderStyle: 'dashed',
        marginBottom: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pickedImage: {
        width: '100%',
        height: '100%',
    },
    placeholderImage: {
        alignItems: 'center',
    },
    placeholderText: {
        color: COLORS.textSec,
        fontFamily: FONTS.textMedium,
        marginTop: 10,
        fontSize: 14,
    },
    inputContainer: {
        marginBottom: 30,
    },
    label: {
        color: COLORS.accent,
        fontFamily: FONTS.textBold,
        fontSize: 10,
        letterSpacing: 1,
        marginBottom: 10,
        textTransform: 'uppercase',
    },
    input: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 15,
        padding: 16,
        color: COLORS.text,
        fontFamily: FONTS.textRegular,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    saveBtn: {
        backgroundColor: COLORS.accent,
        padding: 18,
        borderRadius: 18,
        alignItems: 'center',
        shadowColor: COLORS.accent,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    saveBtnText: {
        color: '#000',
        fontFamily: FONTS.title,
        fontSize: 15,
    }
});
