import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ProductCard from '../products/ProductCard';

interface CompanyMenuModalProps {
    empresa: any;
    userName: string;
    onClose: () => void;
    onImagePress: (url: string) => void;
}

export default function CompanyMenuModal({ empresa, userName, onClose, onImagePress }: CompanyMenuModalProps) {
    const insets = useSafeAreaInsets();
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [cart, setCart] = useState<Record<number, any>>({});
    
    // --- ESTADOS DE LOS PASOS ---
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
    const [deliveryNote, setDeliveryNote] = useState('');
    const [orderType, setOrderType] = useState<'Domicilio' | 'Establecimiento'>('Domicilio');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [isFetchingLocation, setIsFetchingLocation] = useState(false);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const baseUrl = process.env.EXPO_PUBLIC_API_URL;
                const response = await fetch(`${baseUrl}/api/empresas/${empresa.id}/productos`);
                if (response.ok) {
                    const data = await response.json();
                    setProducts(data);
                }
            } catch (error) {
                console.error("Error fetching products:", error);
            } finally {
                setLoading(false);
            }
        };
        if (empresa?.id) {
            fetchProducts();
        }
    }, [empresa]);

    const handleCartUpdate = (productId: number, product: any, delta: number) => {
        setCart(prev => {
            const currentQty = prev[productId]?.cantidad || 0;
            const newQty = Math.max(0, currentQty + delta);
            if (newQty === 0) {
                const { [productId]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [productId]: { ...product, cantidad: newQty } };
        });
    };

    const cartArray = Object.values(cart);
    const totalItemsCount = cartArray.reduce((sum, item) => sum + item.cantidad, 0);
    const subtotal = cartArray.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
    const descMatch = empresa?.descuentos?.match(/\d+/);
    const descPercent = descMatch ? parseInt(descMatch[0]) : 0;
    const descuentoTotal = subtotal * (descPercent / 100);
    const totalPagado = subtotal - descuentoTotal;

    // --- FUNCIÓN PARA OBTENER Y COMPARTIR UBICACIÓN ---
    const handleShareLocation = async () => {
        setIsFetchingLocation(true);
        try {
            // Solicita permisos al usuario (si ya los tiene, simplemente avanza)
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    "Permiso denegado", 
                    "Necesitamos acceso a tu ubicación para pegarla automáticamente. Puedes ingresarla manualmente si lo prefieres."
                );
                setIsFetchingLocation(false);
                return;
            }

            // Obtiene la ubicación actual con alta precisión
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Highest
            });

            const { latitude, longitude } = location.coords;
            const mapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;

            // Opcional: Intenta obtener el nombre de la calle (Geocodificación inversa)
            let addressText = '';
            try {
                const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
                if (geocode && geocode.length > 0) {
                    const place = geocode[0];
                    addressText = `${place.street || ''} ${place.streetNumber || ''}, ${place.city || ''}`.trim();
                    if (addressText.startsWith(',')) addressText = addressText.substring(1).trim();
                }
            } catch (e) {
                console.log("No se pudo obtener el nombre de la calle", e);
            }

            // Pega la ubicación en el estado del Input
            const finalAddressText = addressText 
                ? `${addressText}\nGPS: ${mapsLink}` 
                : `Ubicación GPS: ${mapsLink}`;
            
            setDeliveryAddress(finalAddressText);

        } catch (error) {
            console.error("Error obteniendo ubicación:", error);
            Alert.alert("Error", "Ocurrió un problema al obtener tu ubicación. Por favor, revisa que tu GPS esté encendido.");
        } finally {
            setIsFetchingLocation(false);
        }
    };

    const sendOrderWhatsApp = async () => {
        if (cartArray.length === 0) {
            Alert.alert("Carrito vacío", "Debes agregar productos para enviar una orden.");
            return;
        }
        if (!empresa.whatsapp) {
            Alert.alert("Aviso", "Esta empresa no ha registrado número de WhatsApp.");
            return;
        }

        const orderId = Math.floor(10000 + Math.random() * 90000);
        let mensaje = `*NUEVA ORDEN DESDE QRONNOS*\n`;
        mensaje += `👤 *Cliente:* ${userName}\n`;
        mensaje += `(ID: #${orderId})\n\n`;

        mensaje += `📍 *Tipo de orden:* ${orderType === 'Domicilio' ? '🛵 Domicilio' : '🍽️ Consumir en el establecimiento'}\n`;
        if (orderType === 'Domicilio' && deliveryAddress.trim() !== '') {
            mensaje += `🏠 *Dirección:*\n${deliveryAddress.trim()}\n\n`;
        }

        if (deliveryNote.trim() !== '') {
            mensaje += `📝 *Nota / Instrucciones:*\n${deliveryNote.trim()}\n\n`;
        }

        mensaje += `*PEDIDO:*\n`;
        cartArray.forEach(item => {
            mensaje += `• (${item.cantidad}) ${item.nombre} - $${(item.precio * item.cantidad).toLocaleString()}\n`;
        });
        mensaje += `\n*RESUMEN:*\n`;
        mensaje += `• Subtotal: $${subtotal.toLocaleString()}\n`;
        if (descPercent > 0) {
            mensaje += `• Ahorro Qronnos (${descPercent}%): -$${descuentoTotal.toLocaleString()}\n`;
        }
        mensaje += `\n✅ *TOTAL A PAGAR: $${totalPagado.toLocaleString()}*`;

        const cleanPhone = empresa.whatsapp.replace(/[^\d]/g, '');
        const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(mensaje)}`;
        const supported = await Linking.canOpenURL(url);
        if (supported) await Linking.openURL(url);
        else Alert.alert("Error", "No se pudo abrir WhatsApp.");
    };

    return (
        <View style={styles.menuScreenContainer}>
            {/* ENCABEZADO */}
            <View style={[styles.menuHeader, { paddingTop: Math.max(insets.top, 16) }]}>
                <TouchableOpacity 
                    onPress={() => {
                        if (step > 1) {
                            setStep((step - 1) as any);
                        } else {
                            onClose();
                        }
                    }} 
                    style={styles.backBtn}
                >
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.menuHeaderTitle}>
                        {step === 1 && "Menú de Productos"}
                        {step === 2 && "Paso 2: Notas"}
                        {step === 3 && "Paso 3: Tipo de Orden"}
                        {step === 4 && "Paso 4: Confirmación"}
                    </Text>
                    <Text style={styles.menuHeaderSubtitle} numberOfLines={1}>{empresa?.titulo}</Text>
                </View>

                {totalItemsCount > 0 && (
                    <View style={styles.stepIndicatorBadge}>
                        <Text style={styles.stepIndicatorText}>Paso {step}/4</Text>
                    </View>
                )}
            </View>

            {/* CONTENIDO SEGÚN EL PASO */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 180, paddingTop: 10 }}>
                
                {/* WIDGET DE AHORRO Y TOTAL FLOTANTE SUPERIOR EN CADA PASO */}
                {totalItemsCount > 0 && (
                    <View style={styles.savingsBanner}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.savingsBannerSub}>Total a cancelar:</Text>
                            <Text style={styles.savingsBannerTotal}>${totalPagado.toLocaleString()}</Text>
                        </View>
                        {descPercent > 0 && (
                            <View style={styles.savingsBadgeRight}>
                                <Ionicons name="pricetag" size={14} color="#D4AF37" />
                                <Text style={styles.savingsBadgeText}>¡Ahorras ${descuentoTotal.toLocaleString()} ({descPercent}%)!</Text>
                            </View>
                        )}
                    </View>
                )}

                {/* PASO 1: SELECCIÓN DE PRODUCTOS */}
                {step === 1 && (
                    <>
                        {loading ? (
                            <ActivityIndicator color="#01c38e" style={{ marginVertical: 30 }} />
                        ) : products.length === 0 ? (
                            <Text style={{ color: '#9ca3af', textAlign: 'center', marginTop: 40, fontFamily: 'Poppins-Medium' }}>
                                No hay productos disponibles.
                            </Text>
                        ) : (
                            <View>
                                {products.map((item) => (
                                    <ProductCard 
                                        key={item.producto_id}
                                        nombre={item.nombre}
                                        precio={item.precio}
                                        descripcion={item.descripcion}
                                        imagenUrl={item.imagenUrl}
                                        cantidad={cart[item.producto_id]?.cantidad || 0}
                                        onAdd={() => handleCartUpdate(item.producto_id, item, 1)}
                                        onRemove={() => handleCartUpdate(item.producto_id, item, -1)}
                                        onImagePress={() => item.imagenUrl ? onImagePress(item.imagenUrl) : null}
                                    />
                                ))}
                            </View>
                        )}
                    </>
                )}

                {/* PASO 2: AGREGAR NOTA O INSTRUCCIONES */}
                {step === 2 && (
                    <View style={styles.stepContainer}>
                        <View style={styles.stepBadgeContainer}>
                            <Text style={styles.stepBadgeNumber}>PASO 2 DE 4</Text>
                        </View>
                        <Text style={styles.stepTitle}>¿Cómo deseas tus productos?</Text>
                        <Text style={styles.stepSubtitle}>Agrega instrucciones especiales para la preparación o indicaciones de entrega.</Text>

                        <TextInput
                            style={styles.textInputNoteLarge}
                            placeholder="Ej: Tocar el timbre, dejar en recepción, sin ají..."
                            placeholderTextColor="#9ca3af"
                            multiline
                            numberOfLines={5}
                            value={deliveryNote}
                            onChangeText={setDeliveryNote}
                        />

                        <View style={styles.miniCartPreview}>
                            <Text style={styles.miniCartTitle}>Productos seleccionados ({totalItemsCount}):</Text>
                            {cartArray.map((item, idx) => (
                                <View key={idx} style={styles.miniCartItemRow}>
                                    <Text style={styles.miniCartItemText}>• {item.cantidad}x {item.nombre}</Text>
                                    <Text style={styles.miniCartItemPrice}>${(item.precio * item.cantidad).toLocaleString()}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* PASO 3: SELECCIONAR TIPO DE ORDEN Y MAPS */}
                {step === 3 && (
                    <View style={styles.stepContainer}>
                        <View style={styles.stepBadgeContainer}>
                            <Text style={styles.stepBadgeNumber}>PASO 3 DE 4</Text>
                        </View>
                        <Text style={styles.stepTitle}>¿Cómo deseas recibir tu pedido?</Text>
                        <Text style={styles.stepSubtitle}>Selecciona la modalidad para gestionar tu orden correctamente.</Text>

                        <View style={styles.orderTypeRow}>
                            <TouchableOpacity 
                                style={[styles.orderTypeCard, orderType === 'Domicilio' && styles.orderTypeCardActive]}
                                onPress={() => setOrderType('Domicilio')}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="bicycle" size={28} color={orderType === 'Domicilio' ? '#01c38e' : '#9ca3af'} />
                                <Text style={[styles.orderTypeTitle, orderType === 'Domicilio' && styles.orderTypeTitleActive]}>Domicilio</Text>
                                <Text style={styles.orderTypeDesc}>Recíbelo en la puerta de tu hogar u oficina.</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={[styles.orderTypeCard, orderType === 'Establecimiento' && styles.orderTypeCardActive]}
                                onPress={() => setOrderType('Establecimiento')}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="restaurant" size={28} color={orderType === 'Establecimiento' ? '#01c38e' : '#9ca3af'} />
                                <Text style={[styles.orderTypeTitle, orderType === 'Establecimiento' && styles.orderTypeTitleActive]}>En el Local</Text>
                                <Text style={styles.orderTypeDesc}>Consumir directamente en el establecimiento.</Text>
                            </TouchableOpacity>
                        </View>

                        {orderType === 'Domicilio' && (
                            <View style={{ marginTop: 15 }}>
                                <View style={styles.addressHeaderRow}>
                                    <Text style={styles.noteSectionTitle}>DIRECCIÓN DE ENTREGA</Text>
                                    <TouchableOpacity 
                                        style={styles.mapsButtonSmall} 
                                        onPress={handleShareLocation} 
                                        activeOpacity={0.8}
                                        disabled={isFetchingLocation}
                                    >
                                        {isFetchingLocation ? (
                                            <ActivityIndicator size="small" color="#01c38e" />
                                        ) : (
                                            <>
                                                <Ionicons name="location" size={14} color="#01c38e" style={{ marginRight: 4 }} />
                                                <Text style={styles.mapsButtonSmallText}>Usar mi ubicación</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>
                                <TextInput
                                    style={[styles.textInputNote, { height: 85, textAlignVertical: 'top' }]}
                                    placeholder="Ej: Calle 45 #20-10, Apto 302..."
                                    placeholderTextColor="#9ca3af"
                                    value={deliveryAddress}
                                    onChangeText={setDeliveryAddress}
                                    multiline
                                />
                                <Text style={styles.addressTip}>Toca "Usar mi ubicación" para pegar tu enlace de GPS automáticamente o escribe tu dirección.</Text>
                            </View>
                        )}
                    </View>
                )}

                {/* PASO 4: RESUMEN Y ENVÍO */}
                {step === 4 && (
                    <View style={styles.stepContainer}>
                        <View style={styles.stepBadgeContainer}>
                            <Text style={styles.stepBadgeNumber}>PASO 4 DE 4</Text>
                        </View>
                        <Text style={styles.stepTitle}>Resumen de tu Orden</Text>
                        <Text style={styles.stepSubtitle}>Verifica que todos los datos sean correctos antes de enviar a WhatsApp.</Text>

                        <View style={styles.summaryCard}>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Tipo de Orden:</Text>
                                <Text style={styles.summaryValueHighlight}>{orderType === 'Domicilio' ? '🛵 Domicilio' : '🍽️ En el Local'}</Text>
                            </View>

                            {orderType === 'Domicilio' && deliveryAddress.trim() !== '' && (
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>Dirección:</Text>
                                    <Text style={styles.summaryValue}>{deliveryAddress}</Text>
                                </View>
                            )}

                            {deliveryNote.trim() !== '' && (
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>Notas:</Text>
                                    <Text style={styles.summaryValue}>{deliveryNote}</Text>
                                </View>
                            )}

                            <View style={styles.dividerSummary} />

                            <Text style={styles.summarySectionTitle}>Productos:</Text>
                            {cartArray.map((item, idx) => (
                                <View key={idx} style={styles.summaryItemRow}>
                                    <Text style={styles.summaryItemText}>({item.cantidad}x) {item.nombre}</Text>
                                    <Text style={styles.summaryItemPrice}>${(item.precio * item.cantidad).toLocaleString()}</Text>
                                </View>
                            ))}

                            <View style={styles.dividerSummary} />

                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Subtotal:</Text>
                                <Text style={styles.summaryValue}>${subtotal.toLocaleString()}</Text>
                            </View>
                            {descPercent > 0 && (
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>Ahorro Qronnos ({descPercent}%):</Text>
                                    <Text style={[styles.summaryValue, { color: '#D4AF37' }]}>-${descuentoTotal.toLocaleString()}</Text>
                                </View>
                            )}
                            <View style={[styles.summaryRow, { marginTop: 8 }]}>
                                <Text style={styles.summaryTotalLabel}>Total a Pagar:</Text>
                                <Text style={styles.summaryTotalValue}>${totalPagado.toLocaleString()}</Text>
                            </View>
                        </View>
                    </View>
                )}

            </ScrollView>

            {/* BARRA INFERIOR DE NAVEGACIÓN ENTRE PASOS */}
            {totalItemsCount > 0 && (
                <View style={styles.stickyBottomBar}>
                    {step === 1 && (
                        <>
                            <View style={styles.totalsContainer}>
                                <Text style={styles.subtotalText}>{totalItemsCount} {totalItemsCount === 1 ? 'producto' : 'productos'}</Text>
                                <Text style={styles.totalText}>${totalPagado.toLocaleString()}</Text>
                            </View>
                            <TouchableOpacity 
                                style={styles.nextStepBtn} 
                                onPress={() => setStep(2)}
                                activeOpacity={0.9}
                            >
                                <Text style={styles.nextStepBtnText}>CONTINUAR</Text>
                                <Ionicons name="arrow-forward" size={18} color="#000" style={{ marginLeft: 6 }} />
                            </TouchableOpacity>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <TouchableOpacity style={styles.backStepBtn} onPress={() => setStep(1)}>
                                <Ionicons name="arrow-back" size={18} color="#FFF" />
                                <Text style={styles.backStepBtnText}>Volver</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={styles.nextStepBtn} 
                                onPress={() => setStep(3)}
                                activeOpacity={0.9}
                            >
                                <Text style={styles.nextStepBtnText}>SIGUIENTE</Text>
                                <Ionicons name="arrow-forward" size={18} color="#000" style={{ marginLeft: 6 }} />
                            </TouchableOpacity>
                        </>
                    )}

                    {step === 3 && (
                        <>
                            <TouchableOpacity style={styles.backStepBtn} onPress={() => setStep(2)}>
                                <Ionicons name="arrow-back" size={18} color="#FFF" />
                                <Text style={styles.backStepBtnText}>Volver</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={styles.nextStepBtn} 
                                onPress={() => {
                                    if (orderType === 'Domicilio' && !deliveryAddress.trim()) {
                                        Alert.alert("Dirección requerida", "Por favor ingresa la dirección de entrega o usa tu ubicación.");
                                        return;
                                    }
                                    setStep(4);
                                }}
                                activeOpacity={0.9}
                            >
                                <Text style={styles.nextStepBtnText}>VER RESUMEN</Text>
                                <Ionicons name="arrow-forward" size={18} color="#000" style={{ marginLeft: 6 }} />
                            </TouchableOpacity>
                        </>
                    )}

                    {step === 4 && (
                        <>
                            <TouchableOpacity style={styles.backStepBtn} onPress={() => setStep(3)}>
                                <Ionicons name="arrow-back" size={18} color="#FFF" />
                                <Text style={styles.backStepBtnText}>Modificar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={styles.whatsappOrderBtn} 
                                onPress={sendOrderWhatsApp}
                                activeOpacity={0.9}
                            >
                                <Ionicons name="logo-whatsapp" size={22} color="#FFF" />
                                <Text style={styles.whatsappOrderBtnText}>ENVIAR A WHATSAPP</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    menuScreenContainer: { flex: 1, backgroundColor: '#090a0c' },
    menuHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#1f2229' },
    backBtn: { padding: 10, marginRight: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14 },
    menuHeaderTitle: { color: '#fff', fontFamily: 'Heavitas', fontSize: 16 },
    menuHeaderSubtitle: { color: '#9ca3af', fontFamily: 'Poppins-Regular', fontSize: 12 },
    
    stepIndicatorBadge: { backgroundColor: 'rgba(1, 195, 142, 0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(1, 195, 142, 0.3)' },
    stepIndicatorText: { color: '#01c38e', fontFamily: 'Poppins-Bold', fontSize: 11 },

    savingsBanner: { backgroundColor: '#13151a', borderRadius: 14, padding: 12, marginBottom: 15, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#1f2229' },
    savingsBannerSub: { color: '#9ca3af', fontFamily: 'Poppins-Regular', fontSize: 11 },
    savingsBannerTotal: { color: '#fff', fontFamily: 'Poppins-Bold', fontSize: 16 },
    savingsBadgeRight: { backgroundColor: 'rgba(212, 175, 55, 0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.3)', flexDirection: 'row', alignItems: 'center' },
    savingsBadgeText: { color: '#D4AF37', fontFamily: 'Poppins-Bold', fontSize: 11, marginLeft: 4 },

    stepContainer: { marginTop: 5 },
    stepBadgeContainer: { alignSelf: 'flex-start', backgroundColor: 'rgba(1, 195, 142, 0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 10 },
    stepBadgeNumber: { color: '#01c38e', fontFamily: 'Poppins-Bold', fontSize: 11, letterSpacing: 1 },
    stepTitle: { color: '#fff', fontFamily: 'Heavitas', fontSize: 22, marginBottom: 6 },
    stepSubtitle: { color: '#9ca3af', fontFamily: 'Poppins-Regular', fontSize: 13, marginBottom: 20, lineHeight: 20 },

    textInputNoteLarge: { backgroundColor: '#13151a', borderRadius: 16, borderWidth: 1, borderColor: '#1f2229', color: '#ffffff', paddingHorizontal: 16, paddingVertical: 14, fontFamily: 'Poppins-Regular', fontSize: 14, textAlignVertical: 'top', minHeight: 120, marginBottom: 20 },
    
    miniCartPreview: { backgroundColor: '#13151a', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#1f2229' },
    miniCartTitle: { color: '#01c38e', fontFamily: 'Poppins-Bold', fontSize: 12, marginBottom: 10, textTransform: 'uppercase' },
    miniCartItemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
    miniCartItemText: { color: '#fff', fontFamily: 'Poppins-Regular', fontSize: 13 },
    miniCartItemPrice: { color: '#9ca3af', fontFamily: 'Poppins-Medium', fontSize: 13 },

    orderTypeRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 15 },
    orderTypeCard: { flex: 1, backgroundColor: '#13151a', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#1f2229', alignItems: 'center' },
    orderTypeCardActive: { borderColor: '#01c38e', backgroundColor: 'rgba(1, 195, 142, 0.05)' },
    orderTypeTitle: { color: '#9ca3af', fontFamily: 'Poppins-Bold', fontSize: 14, marginTop: 10, marginBottom: 4 },
    orderTypeTitleActive: { color: '#01c38e' },
    orderTypeDesc: { color: '#9ca3af', fontFamily: 'Poppins-Regular', fontSize: 11, textAlign: 'center', lineHeight: 16 },

    addressHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    noteSectionTitle: { color: '#01c38e', fontFamily: 'Poppins-Bold', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
    mapsButtonSmall: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(1, 195, 142, 0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(1, 195, 142, 0.3)' },
    mapsButtonSmallText: { color: '#01c38e', fontFamily: 'Poppins-Bold', fontSize: 11 },
    textInputNote: { backgroundColor: '#13151a', borderRadius: 12, borderWidth: 1, borderColor: '#1f2229', color: '#ffffff', paddingHorizontal: 14, paddingVertical: 12, fontFamily: 'Poppins-Regular', fontSize: 13 },
    addressTip: { color: '#9ca3af', fontFamily: 'Poppins-Regular', fontSize: 11, marginTop: 6, fontStyle: 'italic' },

    summaryCard: { backgroundColor: '#13151a', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#1f2229' },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    summaryLabel: { color: '#9ca3af', fontFamily: 'Poppins-Medium', fontSize: 13 },
    summaryValue: { color: '#fff', fontFamily: 'Poppins-Regular', fontSize: 13, maxWidth: '60%', textAlign: 'right' },
    summaryValueHighlight: { color: '#01c38e', fontFamily: 'Poppins-Bold', fontSize: 13 },
    dividerSummary: { height: 1, backgroundColor: '#1f2229', marginVertical: 12 },
    summarySectionTitle: { color: '#01c38e', fontFamily: 'Poppins-Bold', fontSize: 11, letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' },
    summaryItemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    summaryItemText: { color: '#fff', fontFamily: 'Poppins-Regular', fontSize: 13 },
    summaryItemPrice: { color: '#9ca3af', fontFamily: 'Poppins-Medium', fontSize: 13 },
    summaryTotalLabel: { color: '#fff', fontFamily: 'Poppins-Bold', fontSize: 15 },
    summaryTotalValue: { color: '#01c38e', fontFamily: 'Poppins-Bold', fontSize: 18 },

    stickyBottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#12141A', borderTopWidth: 1, borderTopColor: '#2A2E39', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 20 },
    totalsContainer: { flex: 1, justifyContent: 'center' },
    subtotalText: { color: '#9ca3af', fontFamily: 'Poppins-Medium', fontSize: 11 },
    totalText: { color: '#fff', fontFamily: 'Poppins-Bold', fontSize: 16 },
    
    nextStepBtn: { backgroundColor: '#01c38e', flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 22, borderRadius: 16 },
    nextStepBtnText: { color: '#000', fontFamily: 'Poppins-Bold', fontSize: 13, letterSpacing: 0.5 },

    backStepBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14 },
    backStepBtnText: { color: '#FFF', fontFamily: 'Poppins-Medium', fontSize: 13, marginLeft: 6 },

    whatsappOrderBtn: { backgroundColor: '#25D366', flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 16, elevation: 5 },
    whatsappOrderBtnText: { color: '#FFF', fontFamily: 'Poppins-Bold', fontSize: 13, marginLeft: 8 },
});