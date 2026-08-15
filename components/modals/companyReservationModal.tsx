import { Ionicons } from '@expo/vector-icons';
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

interface CompanyReservationModalProps {
    empresa: any;
    userName: string;
    onClose: () => void;
}

const getMonthCalendarGrid = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const year = today.getFullYear();
    const month = today.getMonth();

    const totalDays = new Date(year, month + 1, 0).getDate();
    const firstDayDate = new Date(year, month, 1);
    const jsDay = firstDayDate.getDay();
    const startingDayIndex = (jsDay + 6) % 7; // Lunes = 0

    const days = [];

    // Espacios vacíos para alinear el primer día de la semana
    for (let i = 0; i < startingDayIndex; i++) {
        days.push({ empty: true, id: `empty-${i}` });
    }

    // Días del mes
    for (let i = 1; i <= totalDays; i++) {
        const loopDate = new Date(year, month, i);
        loopDate.setHours(0, 0, 0, 0);

        const dayStr = i < 10 ? `0${i}` : `${i}`;
        const monthStr = (month + 1) < 10 ? `0${month + 1}` : `${month + 1}`;
        const dateFormatted = `${year}-${monthStr}-${dayStr}`;

        const isPast = loopDate < today;

        days.push({
            empty: false,
            dayNumber: i,
            dateString: dateFormatted,
            isPast,
            id: dateFormatted,
        });
    }

    const monthName = firstDayDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    return { monthName: monthName.charAt(0).toUpperCase() + monthName.slice(1), days };
};

const MILITARY_TIMES = [
    '08:00', '09:00', '10:00', '11:00', '12:00', 
    '13:00', '14:00', '15:00', '16:00', '17:00', 
    '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
];

export default function CompanyReservationModal({ empresa, userName, onClose }: CompanyReservationModalProps) {
    const insets = useSafeAreaInsets();
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
    
    const isSportsComplex = empresa?.categoria?.toLowerCase().includes('deporte') || 
                            empresa?.titulo?.toLowerCase().includes('cancha') || false;

    const [reservationType, setReservationType] = useState<'mesa' | 'cancha'>(isSportsComplex ? 'cancha' : 'mesa');
    
    const calendarData = getMonthCalendarGrid();
    const validFirstDay = calendarData.days.find(d => !d.empty && !d.isPast)?.dateString || new Date().toISOString().split('T')[0];
    
    const [selectedDate, setSelectedDate] = useState<string>(validFirstDay);
    const [selectedTime, setSelectedTime] = useState<string>('18:00');
    const [selectedEndTime, setSelectedEndTime] = useState<string>('19:00');
    const [activeTimePicker, setActiveTimePicker] = useState<'start' | 'end' | null>(null);
    
    const [numberOfPeople, setNumberOfPeople] = useState<number>(2);
    
    const [mesas, setMesas] = useState<any[]>([]);
    const [loadingMesas, setLoadingMesas] = useState<boolean>(false);
    const [selectedMesa, setSelectedMesa] = useState<any>(null);

    const [resourceDetail, setResourceDetail] = useState(isSportsComplex ? 'Cancha Sintética #1' : 'Mesa Estándar');
    const [reservationNote, setReservationNote] = useState('');

    useEffect(() => {
        if (reservationType === 'mesa') {
            fetchMesas();
        }
    }, [reservationType]);

    const fetchMesas = async () => {
        try {
            setLoadingMesas(true);
            const empresaId = empresa?.id || empresa?._id;
            const response = await fetch(`http://192.168.68.106:3000/api/mesas/empresa/${empresaId}`);
            const data = await response.json();
            const listaMesas = data.mesas || (Array.isArray(data) ? data : []);
            
            if (Array.isArray(listaMesas)) {
                setMesas(listaMesas);
                if (listaMesas.length > 0 && !selectedMesa) {
                    setSelectedMesa(listaMesas[0]);
                    setResourceDetail(`Mesa #${listaMesas[0].nombre || listaMesas[0].id} (${listaMesas[0].capacidad || 4} pers.)`);
                }
            } else {
                setMesas([]);
            }
        } catch (error) {
            console.error("Error al cargar mesas:", error);
            setMesas([]);
        } finally {
            setLoadingMesas(false);
        }
    };

    const sendReservationWhatsApp = async () => {
        if (!empresa.whatsapp) {
            Alert.alert("Aviso", "Esta empresa no ha registrado número de WhatsApp.");
            return;
        }

        const reservationId = Math.floor(10000 + Math.random() * 90000);
        let mensaje = `*NUEVA RESERVA DESDE QRONNOS*\n`;
        mensaje += `👤 *Cliente:* ${userName}\n`;
        mensaje += `(ID Reserva: #${reservationId})\n\n`;

        mensaje += `📅 *Fecha:* ${selectedDate}\n`;
        if (reservationType === 'cancha') {
            mensaje += `⏰ *Hora de Llegada (24h):* ${selectedTime}\n`;
            mensaje += `🏁 *Hora de Salida (24h):* ${selectedEndTime}\n`;
        } else {
            mensaje += `⏰ *Hora (24h):* ${selectedTime}\n`;
        }
        mensaje += `👥 *Personas:* ${numberOfPeople}\n`;
        mensaje += `📍 *Tipo:* ${reservationType === 'mesa' ? '🍽️ Reserva de Mesa' : '⚽ Reserva de Cancha'}\n`;
        mensaje += `📌 *Detalle:* ${resourceDetail}\n`;

        if (reservationNote.trim() !== '') {
            mensaje += `📝 *Notas:* ${reservationNote.trim()}\n`;
        }

        mensaje += `\n✅ *Estado:* Solicitud pendiente de confirmación.`;

        const cleanPhone = empresa.whatsapp.replace(/[^\d]/g, '');
        const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(mensaje)}`;
        const supported = await Linking.canOpenURL(url);
        if (supported) await Linking.openURL(url);
        else Alert.alert("Error", "No se pudo abrir WhatsApp.");
    };

    return (
        <View style={styles.container}>
            {/* ENCABEZADO */}
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
                <TouchableOpacity onPress={() => step > 1 ? setStep((step - 1) as any) : onClose()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>Sistema de Reservas</Text>
                    <Text style={styles.headerSubtitle} numberOfLines={1}>{empresa?.titulo}</Text>
                </View>
                <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>Paso {step}/4</Text>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                
                {/* PASO 1: SELECCIÓN DE TIPO */}
                {step === 1 && (
                    <View>
                        <View style={styles.stepBadgeContainer}><Text style={styles.stepBadgeNumber}>PASO 1 DE 4</Text></View>
                        <Text style={styles.stepTitle}>¿Qué deseas reservar?</Text>
                        <Text style={styles.stepSubtitle}>Selecciona el tipo de espacio para tu visita.</Text>

                        <View style={styles.optionsRow}>
                            <TouchableOpacity 
                                style={[styles.optionCard, reservationType === 'mesa' && styles.optionCardActive]}
                                onPress={() => { setReservationType('mesa'); setResourceDetail('Mesa Estándar'); }}
                            >
                                <Ionicons name="restaurant" size={28} color={reservationType === 'mesa' ? '#01c38e' : '#9ca3af'} />
                                <Text style={[styles.optionText, reservationType === 'mesa' && styles.optionTextActive]}>Mesa</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={[styles.optionCard, reservationType === 'cancha' && styles.optionCardActive]}
                                onPress={() => { setReservationType('cancha'); setResourceDetail('Cancha Sintética #1'); }}
                            >
                                <Ionicons name="football" size={28} color={reservationType === 'cancha' ? '#01c38e' : '#9ca3af'} />
                                <Text style={[styles.optionText, reservationType === 'cancha' && styles.optionTextActive]}>Cancha</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* PASO 2: MAPA DE MESAS, CALENDARIO MENSUAL, HORARIOS Y PERSONAS */}
                {step === 2 && (
                    <View>
                        <View style={styles.stepBadgeContainer}><Text style={styles.stepBadgeNumber}>PASO 2 DE 4</Text></View>
                        <Text style={styles.stepTitle}>Fecha, Horarios y Espacio</Text>
                        <Text style={styles.stepSubtitle}>Selecciona la fecha y detalles de tu reserva.</Text>

                        {/* SELECCIÓN DE MESA (Si aplica) */}
                        {reservationType === 'mesa' && (
                            <View style={{ marginBottom: 20 }}>
                                <Text style={styles.label}>Selecciona la Mesa Disponible</Text>
                                {loadingMesas ? (
                                    <View style={{ padding: 20, alignItems: 'center' }}>
                                        <ActivityIndicator size="small" color="#01c38e" />
                                        <Text style={{ color: '#9ca3af', marginTop: 8, fontSize: 12 }}>Cargando mesas...</Text>
                                    </View>
                                ) : mesas.length === 0 ? (
                                    <Text style={{ color: '#9ca3af', fontSize: 13, fontStyle: 'italic' }}>No hay mesas disponibles registradas.</Text>
                                ) : (
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.calendarScroll}>
                                        {mesas.map((mesa) => {
                                            const mesaId = mesa.mesa_id || mesa.id;
                                            const mesaNombre = mesa.nombre || mesa.numero;
                                            const isSelected = selectedMesa?.mesa_id === mesaId || selectedMesa?.id === mesaId;
                                            return (
                                                <TouchableOpacity
                                                    key={mesaId}
                                                    style={[styles.mesaCard, isSelected && styles.mesaCardActive]}
                                                    onPress={() => {
                                                        setSelectedMesa(mesa);
                                                        setResourceDetail(`Mesa #${mesaNombre} (${mesa.capacidad || 4} pers.)`);
                                                    }}
                                                >
                                                    <Ionicons name="restaurant-outline" size={22} color={isSelected ? '#01c38e' : '#9ca3af'} />
                                                    <Text style={[styles.mesaCardTitle, isSelected && styles.calendarTextActive]}>Mesa #{mesaNombre}</Text>
                                                    <Text style={styles.mesaCardCap}>{mesa.capacidad || 4} pers.</Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                )}
                            </View>
                        )}

                        {/* CALENDARIO EN CUADRÍCULA MENSUAL */}
                        <Text style={styles.label}>Selecciona el Día</Text>
                        <View style={styles.calendarContainer}>
                            <Text style={styles.calendarHeaderTitle}>{calendarData.monthName}</Text>
                            
                            <View style={styles.weekDaysRow}>
                                {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, index) => (
                                    <Text key={`weekday-${index}`} style={styles.weekDayText}>{d}</Text>
                                ))}
                            </View>

                            <View style={styles.daysGrid}>
                                {calendarData.days.map((item) => {
                                    if (item.empty) {
                                        return <View key={item.id} style={styles.dayCellEmpty} />;
                                    }

                                    const isSelected = selectedDate === item.dateString;
                                    const isPast = item.isPast;

                                    return (
                                        <TouchableOpacity
                                            key={item.id}
                                            style={[
                                                styles.dayCell,
                                                isPast && styles.dayCellPast,
                                                isSelected && styles.dayCellActive
                                            ]}
                                            disabled={isPast}
                                            onPress={() => setSelectedDate(item.dateString)}
                                        >
                                            <Text style={[
                                                styles.dayCellText,
                                                isPast && styles.dayCellTextPast,
                                                isSelected && styles.dayCellTextActive
                                            ]}>
                                                {item.dayNumber}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                        <Text style={styles.selectedDateInfo}>Fecha seleccionada: <Text style={styles.bold}>{selectedDate}</Text></Text>

                        {/* HORA DE LLEGADA / SALIDA */}
                        {reservationType === 'cancha' ? (
                            <View style={{ marginBottom: 15 }}>
                                <Text style={styles.label}>Hora de Llegada (Formato 24h)</Text>
                                <TouchableOpacity 
                                    style={styles.timeDropdownSelector}
                                    onPress={() => setActiveTimePicker(activeTimePicker === 'start' ? null : 'start')}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Ionicons name="time-outline" size={18} color="#01c38e" style={{ marginRight: 8 }} />
                                        <Text style={styles.timeDropdownText}>{selectedTime} Hrs</Text>
                                    </View>
                                    <Ionicons name={activeTimePicker === 'start' ? "chevron-up" : "chevron-down"} size={18} color="#9ca3af" />
                                </TouchableOpacity>

                                {activeTimePicker === 'start' && (
                                    <View style={styles.timeDropdownGrid}>
                                        {MILITARY_TIMES.map((time) => (
                                            <TouchableOpacity
                                                key={`start-${time}`}
                                                style={[styles.timeOptionItem, selectedTime === time && styles.timeOptionItemActive]}
                                                onPress={() => { setSelectedTime(time); setActiveTimePicker(null); }}
                                            >
                                                <Text style={[styles.timeOptionText, selectedTime === time && styles.timeOptionTextActive]}>{time}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}

                                <Text style={[styles.label, { marginTop: 10 }]}>Hora de Salida (Formato 24h)</Text>
                                <TouchableOpacity 
                                    style={styles.timeDropdownSelector}
                                    onPress={() => setActiveTimePicker(activeTimePicker === 'end' ? null : 'end')}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Ionicons name="time-outline" size={18} color="#01c38e" style={{ marginRight: 8 }} />
                                        <Text style={styles.timeDropdownText}>{selectedEndTime} Hrs</Text>
                                    </View>
                                    <Ionicons name={activeTimePicker === 'end' ? "chevron-up" : "chevron-down"} size={18} color="#9ca3af" />
                                </TouchableOpacity>

                                {activeTimePicker === 'end' && (
                                    <View style={styles.timeDropdownGrid}>
                                        {MILITARY_TIMES.map((time) => (
                                            <TouchableOpacity
                                                key={`end-${time}`}
                                                style={[styles.timeOptionItem, selectedEndTime === time && styles.timeOptionItemActive]}
                                                onPress={() => { setSelectedEndTime(time); setActiveTimePicker(null); }}
                                            >
                                                <Text style={[styles.timeOptionText, selectedEndTime === time && styles.timeOptionTextActive]}>{time}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>
                        ) : (
                            <View style={{ marginBottom: 15 }}>
                                <Text style={styles.label}>Hora de Reserva (Formato 24h)</Text>
                                <TouchableOpacity 
                                    style={styles.timeDropdownSelector}
                                    onPress={() => setActiveTimePicker(activeTimePicker === 'start' ? null : 'start')}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Ionicons name="time-outline" size={18} color="#01c38e" style={{ marginRight: 8 }} />
                                        <Text style={styles.timeDropdownText}>{selectedTime} Hrs</Text>
                                    </View>
                                    <Ionicons name={activeTimePicker === 'start' ? "chevron-up" : "chevron-down"} size={18} color="#9ca3af" />
                                </TouchableOpacity>

                                {activeTimePicker === 'start' && (
                                    <View style={styles.timeDropdownGrid}>
                                        {MILITARY_TIMES.map((time) => (
                                            <TouchableOpacity
                                                key={`mesa-${time}`}
                                                style={[styles.timeOptionItem, selectedTime === time && styles.timeOptionItemActive]}
                                                onPress={() => { setSelectedTime(time); setActiveTimePicker(null); }}
                                            >
                                                <Text style={[styles.timeOptionText, selectedTime === time && styles.timeOptionTextActive]}>{time}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>
                        )}

                        {/* NÚMERO DE PERSONAS */}
                        <Text style={styles.label}>Número de personas</Text>
                        <View style={styles.counterContainer}>
                            <TouchableOpacity 
                                style={styles.counterBtn}
                                onPress={() => setNumberOfPeople(Math.max(1, numberOfPeople - 1))}
                            >
                                <Ionicons name="remove" size={20} color="#fff" />
                            </TouchableOpacity>
                            <Text style={styles.counterValue}>{numberOfPeople} {numberOfPeople === 1 ? 'Persona' : 'Personas'}</Text>
                            <TouchableOpacity 
                                style={styles.counterBtn}
                                onPress={() => setNumberOfPeople(numberOfPeople + 1)}
                            >
                                <Ionicons name="add" size={20} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* PASO 3: DETALLES Y NOTAS */}
                {step === 3 && (
                    <View>
                        <View style={styles.stepBadgeContainer}><Text style={styles.stepBadgeNumber}>PASO 3 DE 4</Text></View>
                        <Text style={styles.stepTitle}>Detalles Adicionales</Text>
                        <Text style={styles.stepSubtitle}>Especificaciones o notas especiales para el establecimiento.</Text>

                        <Text style={styles.label}>Espacio seleccionado</Text>
                        <View style={styles.input}>
                            <Text style={{ color: '#fff', fontFamily: 'Poppins-Regular' }}>{resourceDetail}</Text>
                        </View>

                        <Text style={styles.label}>Notas o requerimientos</Text>
                        <View style={{ backgroundColor: '#13151a', borderRadius: 12, borderWidth: 1, borderColor: '#1f2229', padding: 12 }}>
                            <TextInput
                                style={{ color: '#fff', height: 80, textAlignVertical: 'top', fontFamily: 'Poppins-Regular' }}
                                multiline
                                value={reservationNote}
                                onChangeText={setReservationNote}
                                placeholder="Ej: Celebración de cumpleaños, ubicación preferida, etc."
                                placeholderTextColor="#9ca3af"
                            />
                        </View>
                    </View>
                )}

                {/* PASO 4: RESUMEN */}
                {step === 4 && (
                    <View>
                        <View style={styles.stepBadgeContainer}><Text style={styles.stepBadgeNumber}>PASO 4 DE 4</Text></View>
                        <Text style={styles.stepTitle}>Resumen de Reserva</Text>
                        <Text style={styles.stepSubtitle}>Verifica los datos antes de enviarlos a WhatsApp.</Text>

                        <View style={styles.summaryCard}>
                            <Text style={styles.summaryRow}>📅 Fecha: <Text style={styles.bold}>{selectedDate}</Text></Text>
                            {reservationType === 'cancha' ? (
                                <>
                                    <Text style={styles.summaryRow}>⏰ Hora de Llegada (24h): <Text style={styles.bold}>{selectedTime}</Text></Text>
                                    <Text style={styles.summaryRow}>🏁 Hora de Salida (24h): <Text style={styles.bold}>{selectedEndTime}</Text></Text>
                                </>
                            ) : (
                                <Text style={styles.summaryRow}>⏰ Hora (24h): <Text style={styles.bold}>{selectedTime}</Text></Text>
                            )}
                            <Text style={styles.summaryRow}>👥 Asistentes: <Text style={styles.bold}>{numberOfPeople} personas</Text></Text>
                            <Text style={styles.summaryRow}>📍 Tipo: <Text style={styles.bold}>{reservationType === 'mesa' ? 'Mesa' : 'Cancha'}</Text></Text>
                            <Text style={styles.summaryRow}>📌 Detalle: <Text style={styles.bold}>{resourceDetail}</Text></Text>
                            {reservationNote ? <Text style={styles.summaryRow}>📝 Notas: <Text style={styles.bold}>{reservationNote}</Text></Text> : null}
                        </View>
                    </View>
                )}

            </ScrollView>

            {/* BARRA INFERIOR */}
            <View style={styles.footer}>
                {step < 4 ? (
                    <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep((step + 1) as any)}>
                        <Text style={styles.primaryBtnText}>SIGUIENTE</Text>
                        <Ionicons name="arrow-forward" size={18} color="#000" style={{ marginLeft: 6 }} />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={styles.whatsappBtn} onPress={sendReservationWhatsApp}>
                        <Ionicons name="logo-whatsapp" size={22} color="#FFF" />
                        <Text style={styles.whatsappBtnText}>ENVIAR RESERVA A WHATSAPP</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#090a0c' },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#1f2229' },
    backBtn: { padding: 10, marginRight: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14 },
    headerTitle: { color: '#fff', fontFamily: 'Heavitas', fontSize: 16 },
    headerSubtitle: { color: '#9ca3af', fontFamily: 'Poppins-Regular', fontSize: 12 },
    stepBadge: { backgroundColor: 'rgba(1, 195, 142, 0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    stepBadgeText: { color: '#01c38e', fontFamily: 'Poppins-Bold', fontSize: 11 },
    content: { padding: 20, paddingBottom: 100 },
    stepBadgeContainer: { alignSelf: 'flex-start', backgroundColor: 'rgba(1, 195, 142, 0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 10 },
    stepBadgeNumber: { color: '#01c38e', fontFamily: 'Poppins-Bold', fontSize: 11, letterSpacing: 1 },
    stepTitle: { color: '#fff', fontFamily: 'Heavitas', fontSize: 20, marginBottom: 6 },
    stepSubtitle: { color: '#9ca3af', fontFamily: 'Poppins-Regular', fontSize: 13, marginBottom: 20 },
    label: { color: '#01c38e', fontFamily: 'Poppins-Bold', fontSize: 11, marginBottom: 8, textTransform: 'uppercase', marginTop: 10 },
    input: { backgroundColor: '#13151a', borderRadius: 12, borderWidth: 1, borderColor: '#1f2229', color: '#fff', padding: 14, marginBottom: 15 },
    
    // Tarjetas de Mesas
    mesaCard: { width: 95, height: 85, backgroundColor: '#13151a', borderRadius: 12, borderWidth: 1, borderColor: '#1f2229', alignItems: 'center', justifyContent: 'center', marginRight: 10, padding: 8 },
    mesaCardActive: { borderColor: '#01c38e', backgroundColor: 'rgba(1, 195, 142, 0.1)' },
    mesaCardTitle: { color: '#fff', fontSize: 12, fontFamily: 'Poppins-Bold', marginTop: 4 },
    mesaCardCap: { color: '#9ca3af', fontSize: 10, fontFamily: 'Poppins-Regular', marginTop: 2 },

    // Calendario en Cuadrícula Mensual
    calendarContainer: { backgroundColor: '#13151a', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#1f2229', marginBottom: 10 },
    calendarHeaderTitle: { color: '#fff', fontFamily: 'Poppins-Bold', fontSize: 15, marginBottom: 12, textAlign: 'left' },
    weekDaysRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 },
    weekDayText: { color: '#9ca3af', fontFamily: 'Poppins-Bold', fontSize: 12, width: '14.28%', textAlign: 'center' },
    daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    dayCellEmpty: { width: '14.28%', height: 38, marginVertical: 4 },
    dayCell: { width: '14.28%', height: 38, justifyContent: 'center', alignItems: 'center', marginVertical: 4, borderRadius: 8 },
    dayCellPast: { opacity: 0.3 },
    dayCellActive: { backgroundColor: 'rgba(1, 195, 142, 0.2)', borderWidth: 1, borderColor: '#01c38e' },
    dayCellText: { color: '#fff', fontFamily: 'Poppins-Medium', fontSize: 14 },
    dayCellTextPast: { color: '#6b7280' },
    dayCellTextActive: { color: '#01c38e', fontFamily: 'Poppins-Bold' },
    calendarTextActive: { color: '#01c38e' },
    selectedDateInfo: { color: '#9ca3af', fontFamily: 'Poppins-Regular', fontSize: 12, marginBottom: 15 },

    timeDropdownSelector: { backgroundColor: '#13151a', borderRadius: 12, borderWidth: 1, borderColor: '#1f2229', padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
    timeDropdownText: { color: '#fff', fontFamily: 'Poppins-Bold', fontSize: 14 },
    timeDropdownGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, backgroundColor: '#13151a', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#1f2229', marginBottom: 10 },
    timeOptionItem: { width: '22%', paddingVertical: 10, backgroundColor: '#1a1d24', borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#23262f' },
    timeOptionItemActive: { backgroundColor: '#01c38e', borderColor: '#01c38e' },
    timeOptionText: { color: '#fff', fontFamily: 'Poppins-Medium', fontSize: 12 },
    timeOptionTextActive: { color: '#000', fontFamily: 'Poppins-Bold' },

    counterContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#13151a', borderRadius: 12, borderWidth: 1, borderColor: '#1f2229', padding: 10, marginBottom: 15 },
    counterBtn: { backgroundColor: '#1e222b', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#333' },
    counterValue: { color: '#fff', fontFamily: 'Poppins-Bold', fontSize: 14 },

    optionsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    optionCard: { flex: 1, backgroundColor: '#13151a', borderRadius: 14, padding: 20, borderWidth: 1, borderColor: '#1f2229', alignItems: 'center', justifyContent: 'center' },
    optionCardActive: { borderColor: '#01c38e', backgroundColor: 'rgba(1, 195, 142, 0.05)' },
    optionText: { color: '#9ca3af', fontFamily: 'Poppins-Bold', fontSize: 13, marginTop: 8 },
    optionTextActive: { color: '#01c38e' },
    summaryCard: { backgroundColor: '#13151a', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#1f2229', gap: 12 },
    summaryRow: { color: '#9ca3af', fontFamily: 'Poppins-Regular', fontSize: 14 },
    bold: { color: '#fff', fontFamily: 'Poppins-Bold' },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#12141A', borderTopWidth: 1, borderTopColor: '#2A2E39', padding: 20 },
    primaryBtn: { backgroundColor: '#01c38e', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, borderRadius: 16 },
    primaryBtnText: { color: '#000', fontFamily: 'Poppins-Bold', fontSize: 14 },
    whatsappBtn: { backgroundColor: '#25D366', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, borderRadius: 16 },
    whatsappBtnText: { color: '#FFF', fontFamily: 'Poppins-Bold', fontSize: 14, marginLeft: 8 },
});