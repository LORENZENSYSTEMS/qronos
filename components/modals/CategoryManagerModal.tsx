import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

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

interface Categoria {
  categoria_prod_id: number;
  nombre: string;
  descripcion: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  jwt: string | null;
}

export default function CategoryManagerModal({ visible, onClose, jwt }: Props) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Formulario
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');

  // Cargar categorías al abrir el modal
  useEffect(() => {
    if (visible && jwt) {
      fetchCategorias();
    }
  }, [visible, jwt]);

  const fetchCategorias = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/categorias-productos`, {
        headers: {
          'Authorization': `Bearer ${jwt}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setCategorias(data);
      }
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!nombre.trim()) {
      Alert.alert('Atención', 'El nombre de la categoría es obligatorio.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/categorias-productos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`
        },
        body: JSON.stringify({
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || undefined
        })
      });

      if (response.ok) {
        setNombre('');
        setDescripcion('');
        fetchCategorias(); // Recargar la lista
      } else {
        const error = await response.json();
        Alert.alert('Error', error.message || 'No se pudo crear la categoría');
      }
    } catch (error) {
      Alert.alert('Error', 'Problema de conexión con el servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: number, nombreCategoria: string) => {
    Alert.alert(
      "Eliminar Categoría",
      `¿Estás seguro de que deseas eliminar "${nombreCategoria}"? No se podrá eliminar si hay productos usándola.`,
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Eliminar", 
          style: "destructive", 
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/api/categorias-productos/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${jwt}` }
              });

              if (response.ok) {
                fetchCategorias();
              } else {
                const error = await response.json();
                Alert.alert('Error', error.message || 'No se pudo eliminar.');
              }
            } catch (error) {
              Alert.alert('Error', 'Problema de conexión con el servidor.');
            }
          }
        }
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
            style={{ width: '100%', maxHeight: '90%' }}
          >
            <View style={styles.modalContent}>
              
              {/* HEADER */}
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>GESTIONAR</Text>
                  <Text style={[styles.modalTitle, { color: COLORS.accent }]}>CATEGORÍAS</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={24} color={COLORS.textSec} />
                </TouchableOpacity>
              </View>

              {/* FORMULARIO DE CREACIÓN */}
              <View style={styles.formContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Nombre de la categoría (Ej: Hamburguesas)"
                  placeholderTextColor={COLORS.textSec}
                  value={nombre}
                  onChangeText={setNombre}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Descripción breve (Opcional)"
                  placeholderTextColor={COLORS.textSec}
                  value={descripcion}
                  onChangeText={setDescripcion}
                />
                <TouchableOpacity 
                  style={[styles.btnCrear, isSubmitting && { opacity: 0.7 }]} 
                  onPress={handleCreate}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <>
                      <Ionicons name="add-circle-outline" size={20} color="#000" />
                      <Text style={styles.btnCrearText}>CREAR CATEGORÍA</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              {/* LISTA DE CATEGORÍAS */}
              <Text style={styles.listTitle}>CATEGORÍAS EXISTENTES</Text>
              
              {loading ? (
                <ActivityIndicator size="large" color={COLORS.accent} style={{ marginTop: 20 }} />
              ) : (
                <FlatList
                  data={categorias}
                  keyExtractor={(item) => item.categoria_prod_id.toString()}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 20 }}
                  ListEmptyComponent={
                    <Text style={styles.emptyText}>No hay categorías creadas aún.</Text>
                  }
                  renderItem={({ item }) => (
                    <View style={styles.categoriaCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.catNombre}>{item.nombre}</Text>
                        {item.descripcion ? (
                          <Text style={styles.catDesc}>{item.descripcion}</Text>
                        ) : null}
                      </View>
                      <TouchableOpacity 
                        onPress={() => handleDelete(item.categoria_prod_id, item.nombre)}
                        style={styles.deleteBtn}
                      >
                        <Ionicons name="trash-outline" size={20} color="#ff4444" />
                      </TouchableOpacity>
                    </View>
                  )}
                />
              )}

            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    height: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontFamily: FONTS.title,
    fontSize: 18,
    color: COLORS.text,
  },
  closeBtn: {
    padding: 8,
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  formContainer: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    padding: 14,
    color: COLORS.text,
    fontFamily: FONTS.textRegular,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  btnCrear: {
    backgroundColor: COLORS.accent,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnCrearText: {
    color: '#000',
    fontFamily: FONTS.title,
    fontSize: 12,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 20,
  },
  listTitle: {
    fontFamily: FONTS.textBold,
    color: COLORS.textSec,
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: 15,
  },
  categoriaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  catNombre: {
    color: COLORS.text,
    fontFamily: FONTS.title,
    fontSize: 14,
  },
  catDesc: {
    color: COLORS.textSec,
    fontFamily: FONTS.textRegular,
    fontSize: 12,
    marginTop: 4,
  },
  deleteBtn: {
    padding: 10,
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderRadius: 12,
  },
  emptyText: {
    color: COLORS.textSec,
    fontFamily: FONTS.textRegular,
    textAlign: 'center',
    marginTop: 20,
  }
});