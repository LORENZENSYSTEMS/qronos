import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
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

interface CategoriaProducto {
    categoria_prod_id: number;
    nombre: string;
}

interface ProductFormModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
    empresaId: string;
    productToEdit?: {
        producto_id: number;
        nombre: string;
        precio: number;
        descripcion: string;
        imagenUrl: string;
        categoria_prod_id?: number | null;
    } | null;
}

export default function ProductFormModal({ visible, onClose, onSuccess, empresaId, productToEdit }: ProductFormModalProps) {
    const [nombre, setNombre] = useState('');
    const [precio, setPrecio] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [imagen, setImagen] = useState<string | null>(null);
    const [imagenAsset, setImagenAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
    
    // --- ESTADOS PARA CATEGORÍAS ---
    const [categorias, setCategorias] = useState<CategoriaProducto[]>([]);
    const [selectedCategoriaId, setSelectedCategoriaId] = useState<number | null>(null);
    const [dropdownVisible, setDropdownVisible] = useState(false);

    const [isSaving, setIsSaving] = useState(false);

    const fetchCategorias = async () => {
        try {
            const API_URL = process.env.EXPO_PUBLIC_API_URL;
            const response = await fetch(`${API_URL}/api/categorias-productos`);
            if (response.ok) {
                const data = await response.json();
                setCategorias(Array.isArray(data) ? data : (data.categorias || []));
            }
        } catch (error) {
            console.error("Error al cargar categorías:", error);
        }
    };

    // Efecto para resetear el formulario y cargar categorías cuando se abre
    useEffect(() => {
        if (visible) {
            fetchCategorias();
            if (productToEdit) {
                setNombre(productToEdit.nombre);
                setPrecio(productToEdit.precio.toString());
                setDescripcion(productToEdit.descripcion || '');
                setImagen(productToEdit.imagenUrl);
                setSelectedCategoriaId(productToEdit.categoria_prod_id || null);
                setImagenAsset(null);
            } else {
                resetForm();
            }
        }
    }, [visible, productToEdit]);

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
            setImagenAsset(result.assets[0]);
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
            
            if (selectedCategoriaId) {
                data.append('categoria_prod_id', selectedCategoriaId.toString());
            }

            if (imagenAsset) {
                const fileToUpload = {
                    uri: imagenAsset.uri,
                    name: imagenAsset.fileName || `prod_${Date.now()}.jpg`,
                    type: imagenAsset.mimeType || 'image/jpeg',
                };
                // @ts-ignore
                data.append('imagen', fileToUpload);
            }

            const method = productToEdit ? 'PUT' : 'POST';
            const endpoint = productToEdit 
                ? `${API_URL}/api/productos/${productToEdit.producto_id}`
                : `${API_URL}/api/productos`;

            const response = await fetch(endpoint, {
                method: method,
                headers: { 'Accept': 'application/json' },
                body: data
            });

            if (response.ok) {
                Alert.alert("Éxito", `Producto ${productToEdit ? 'actualizado' : 'creado'} correctamente.`);
                resetForm();
                onSuccess();
                onClose();
            } else {
                const errText = await response.text();
                console.error("Server Error:", errText);
                Alert.alert("Error", `No se pudo ${productToEdit ? 'actualizar' : 'crear'} el producto. Inténtalo de nuevo.`);
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
        setImagenAsset(null);
        setSelectedCategoriaId(null);
        setDropdownVisible(false);
    };

    const categoriaSeleccionadaNombre = categorias.find(c => c.categoria_prod_id === selectedCategoriaId)?.nombre || 'Seleccionar categoría';

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                    style={styles.keyboardView}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.header}>
                            <Text style={styles.headerTitle}>{productToEdit ? 'EDITAR' : 'NUEVO'} <Text style={{ color: COLORS.accent }}>PRODUCTO</Text></Text>
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

                                {/* --- MENÚ DESPLEGABLE DE CATEGORÍAS --- */}
                                <Text style={styles.label}>Categoría</Text>
                                <TouchableOpacity 
                                    style={styles.dropdownSelector}
                                    onPress={() => setDropdownVisible(!dropdownVisible)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[styles.dropdownSelectorText, !selectedCategoriaId && { color: COLORS.textSec }]}>
                                        {categoriaSeleccionadaNombre}
                                    </Text>
                                    <Ionicons name={dropdownVisible ? "chevron-up" : "chevron-down"} size={20} color={COLORS.textSec} />
                                </TouchableOpacity>

                                {dropdownVisible && (
                                    <View style={styles.dropdownList}>
                                        {categorias.length === 0 ? (
                                            <Text style={styles.emptyCategoryText}>No hay categorías registradas</Text>
                                        ) : (
                                            categorias.map((cat) => (
                                                <TouchableOpacity
                                                    key={cat.categoria_prod_id}
                                                    style={[
                                                        styles.dropdownItem,
                                                        selectedCategoriaId === cat.categoria_prod_id && styles.dropdownItemActive
                                                    ]}
                                                    onPress={() => {
                                                        setSelectedCategoriaId(cat.categoria_prod_id);
                                                        setDropdownVisible(false);
                                                    }}
                                                >
                                                    <Text style={[
                                                        styles.dropdownItemText,
                                                        selectedCategoriaId === cat.categoria_prod_id && styles.dropdownItemTextActive
                                                    ]}>
                                                        {cat.nombre}
                                                    </Text>
                                                    {selectedCategoriaId === cat.categoria_prod_id && (
                                                        <Ionicons name="checkmark" size={16} color={COLORS.accent} />
                                                    )}
                                                </TouchableOpacity>
                                            ))
                                        )}
                                    </View>
                                )}

                                <Text style={[styles.label, { marginTop: 20 }]}>Descripción (Opcional)</Text>
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
                                    <Text style={styles.saveBtnText}>{productToEdit ? 'ACTUALIZAR' : 'CREAR'} PRODUCTO</Text>
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
        marginBottom: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    // Estilos del menú desplegable de categorías
    dropdownSelector: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 15,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 5,
    },
    dropdownSelectorText: {
        color: COLORS.text,
        fontFamily: FONTS.textRegular,
        fontSize: 14,
    },
    dropdownList: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginTop: 5,
        marginBottom: 15,
        overflow: 'hidden',
        maxHeight: 180,
    },
    dropdownItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 14,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    dropdownItemActive: {
        backgroundColor: 'rgba(1, 195, 142, 0.15)',
    },
    dropdownItemText: {
        color: COLORS.textSec,
        fontFamily: FONTS.textRegular,
        fontSize: 14,
    },
    dropdownItemTextActive: {
        color: COLORS.accent,
        fontFamily: FONTS.textBold,
    },
    emptyCategoryText: {
        color: COLORS.textSec,
        fontFamily: FONTS.textRegular,
        fontSize: 13,
        textAlign: 'center',
        padding: 15,
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