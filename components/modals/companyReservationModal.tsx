import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
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
import CourtReservationStep from './courtReservationStep';

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

    for (let i = 0; i < startingDayIndex; i++) {
        days.push({ empty: true, id: `empty-${i}` });
    }

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

const generateAvailableTimes = (horarioApertura?: string, horarioCierre?: string) => {
    const parseHour = (timeStr?: string, defaultHour: number = 8) => {
        if (!timeStr) return defaultHour;
        const match = timeStr.match(/(\d{1,2}):\d{2}/);
        return match ? parseInt(match[1], 10) : defaultHour;
    };

    const startHour = parseHour(horarioApertura, 8); 
    const endHour = parseHour(horarioCierre, 22);

    const times = [];
    for (let i = startHour; i <= endHour; i++) {
        const formattedTime = i < 10 ? `0${i}:00` : `${i}:00`;
        times.push(formattedTime);
    }
    return times;
};

export default function CompanyReservationModal({ empresa, userName, onClose }: CompanyReservationModalProps) {
    const insets = useSafeAreaInsets();
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
    const [showCourtStep, setShowCourtStep] = useState<boolean>(false);
    
    const calendarData = getMonthCalendarGrid();
    const validFirstDay = calendarData.days.find(d => !d.empty && !d.isPast)?.dateString || new Date().toISOString().split('T')[0];
    
    const [selectedDate, setSelectedDate] = useState<string>(validFirstDay);
    const [activeTimePicker, setActiveTimePicker] = useState<boolean>(false);

    const availableTimes = useMemo(() => {
        const apertura = empresa?.horarioApertura || empresa?.horario_apertura || '08:00';
        const cierre = empresa?.horarioCierre || empresa?.horario_cierre || '22:00';
        return generateAvailableTimes(apertura, cierre);
    }, [empresa]);

    const [selectedTime, setSelectedTime] = useState<string>(availableTimes.length > 0 ? availableTimes[0] : '18:00');
    const [numberOfPeople, setNumberOfPeople] = useState<number>(2);
    
    const [mesas, setMesas] = useState<any[]>([]);
    const [reservadas, setReservadas] = useState<any[]>([]); 
    const [loadingMesas, setLoadingMesas] = useState<boolean>(false);
    const [isValidating, setIsValidating] = useState<boolean>(false); 
    const [selectedMesa, setSelectedMesa] = useState<any>(null);

    const [resourceDetail, setResourceDetail] = useState('Mesa Estándar');
    const [reservationNote, setReservationNote] = useState('');

    useEffect(() => {
        fetchMesas();
        fetchReservas();
    }, []);

    const fetchMesas = async () => {
        try {
            setLoadingMesas(true);
            const empresaId = empresa?.id || empresa?._id;
            const API_URL = process.env.EXPO_PUBLIC_API_URL;
            const response = await fetch(`${API_URL}/api/mesas/empresa/${empresaId}`);
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

    const fetchReservas = async () => {
        try {
            const empresaId = empresa?.id || empresa?._id;
            const API_URL = process.env.EXPO_PUBLIC_API_URL;
            const response = await fetch(`${API_URL}/api/mesas/reservas/empresa/${empresaId}`);
            const data = await response.json();
            setReservadas(data.reservas || (Array.isArray(data) ? data : []));
        } catch (error) {
            console.error("Error al cargar reservas:", error);
        }
    };

    const reservasMesaActual = useMemo(() => {
        if (!selectedMesa) return [];
        
        return reservadas.filter((res: any) => {
            const resId = String(res.mesa_id || res.id_mesa || '').trim();
            const resNombre = String(res.mesa_nombre || res.nombre_mesa || '').trim();
            
            const currentId = String(selectedMesa.mesa_id || selectedMesa.id || '').trim();
            const currentNombre = String(selectedMesa.nombre || selectedMesa.numero || '').trim();

            const matchById = currentId !== '' && resId !== '' && currentId === resId;
            const matchByName = currentNombre !== '' && resNombre !== '' && currentNombre === resNombre;

            return matchById || matchByName;
        });
    }, [reservadas, selectedMesa]);

    useEffect(() => {
        if (reservasMesaActual.length > 0) {
            const isCurrentOccupied = reservasMesaActual.some(res => res.fecha === selectedDate && res.hora === selectedTime);
            if (isCurrentOccupied) {
                const firstFreeTime = availableTimes.find(time => 
                    !reservasMesaActual.some(res => res.fecha === selectedDate && res.hora === time)
                );
                if (firstFreeTime) setSelectedTime(firstFreeTime);
            }
        }
    }, [selectedMesa, selectedDate, reservasMesaActual, availableTimes]);

    const handleNextStep = async () => {
        if (step === 2) {
            setIsValidating(true);
            try {
                const empresaId = empresa?.id || empresa?._id;
                const API_URL = process.env.EXPO_PUBLIC_API_URL;
                const response = await fetch(`${API_URL}/api/mesas/reservas/empresa/${empresaId}`);
                const data = await response.json();
                const reservasActuales = data.reservas || (Array.isArray(data) ? data : []);
                setReservadas(reservasActuales); 

                const isOccupied = reservasActuales.some((res: any) => {
                    const resId = String(res.mesa_id || res.id_mesa || '').trim();
                    const resNombre = String(res.mesa_nombre || res.nombre_mesa || '').trim();
                    
                    const currentId = String(selectedMesa?.mesa_id || selectedMesa?.id || '').trim();
                    const currentNombre = String(selectedMesa?.nombre || selectedMesa?.numero || '').trim();

                    const matchById = currentId !== '' && resId !== '' && currentId === resId;
                    const matchByName = currentNombre !== '' && resNombre !== '' && currentNombre === resNombre;

                    return (matchById || matchByName) && res.fecha === selectedDate && res.hora === selectedTime;
                });

                if (isOccupied) {
                    Alert.alert(
                        "Horario no disponible", 
                        "La mesa seleccionada acaba de ser reservada para ese horario. Por favor, selecciona otra hora u otra mesa."
                    );
                    setIsValidating(false);
                    return; 
                }
            } catch (error) {
                console.error("Error verificando disponibilidad en el backend:", error);
            } finally {
                setIsValidating(false);
            }
        }
        
        setStep((step + 1) as any);
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
        mensaje += `⏰ *Hora (24h):* ${selectedTime}\n`;
        mensaje += `👥 *Personas:* ${numberOfPeople}\n`;
        mensaje += `📍 *Tipo:* 🍽️ Reserva de Mesa\n`;
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

    if (showCourtStep) {
        return (
            <CourtReservationStep 
                empresa={empresa} 
                userName={userName} 
                onBack={() => setShowCourtStep(false)} 
                onClose={onClose} 
            />
        );
    }

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
                                style={[styles.optionCard, styles.optionCardActive]}
                                onPress={() => setStep(2)}
                            >
                                <Ionicons name="restaurant" size={28} color="#01c38e" />
                                <Text style={[styles.optionText, styles.optionTextActive]}>Mesa</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={styles.optionCard}
                                onPress={() => setShowCourtStep(true)}
                            >
                                <Ionicons name="football" size={28} color="#9ca3af" />
                                <Text style={styles.optionText}>Cancha</Text>
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

                        {/* SELECCIÓN DE MESA */}
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

                        {/* HORA DE RESERVA */}
                        <View style={{ marginBottom: 15 }}>
                            <Text style={styles.label}>Hora de Reserva (Formato 24h)</Text>
                            <TouchableOpacity 
                                style={styles.timeDropdownSelector}
                                onPress={() => setActiveTimePicker(!activeTimePicker)}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Ionicons name="time-outline" size={18} color="#01c38e" style={{ marginRight: 8 }} />
                                    <Text style={styles.timeDropdownText}>{selectedTime} Hrs</Text>
                                </View>
                                <Ionicons name={activeTimePicker ? "chevron-up" : "chevron-down"} size={18} color="#9ca3af" />
                            </TouchableOpacity>

                            {activeTimePicker && (
                                <View style={styles.timeDropdownGrid}>
                                    {availableTimes.map((time) => {
                                        const isOccupied = reservasMesaActual.some((res: any) => {
                                            return res.fecha === selectedDate && res.hora === time;
                                        });

                                        return (
                                            <TouchableOpacity
                                                key={`mesa-${time}`}
                                                style={[
                                                    styles.timeOptionItem, 
                                                    selectedTime === time && styles.timeOptionItemActive,
                                                    isOccupied && styles.timeOptionItemDisabled 
                                                ]}
                                                disabled={isOccupied} 
                                                onPress={() => { setSelectedTime(time); setActiveTimePicker(false); }}
                                            >
                                                <Text style={[
                                                    styles.timeOptionText, 
                                                    selectedTime === time && styles.timeOptionTextActive,
                                                    isOccupied && styles.timeOptionTextDisabled
                                                ]}>{time}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            )}
                        </View>

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
                            <Text style={styles.summaryRow}>⏰ Hora (24h): <Text style={styles.bold}>{selectedTime}</Text></Text>
                            <Text style={styles.summaryRow}>👥 Asistentes: <Text style={styles.bold}>{numberOfPeople} personas</Text></Text>
                            <Text style={styles.summaryRow}>📍 Tipo: <Text style={styles.bold}>Mesa</Text></Text>
                            <Text style={styles.summaryRow}>📌 Detalle: <Text style={styles.bold}>{resourceDetail}</Text></Text>
                            {reservationNote ? <Text style={styles.summaryRow}>📝 Notas: <Text style={styles.bold}>{reservationNote}</Text></Text> : null}
                        </View>
                    </View>
                )}

            </ScrollView>

            {/* BARRA INFERIOR */}
            <View style={styles.footer}>
                {step < 4 ? (
                    <TouchableOpacity style={styles.primaryBtn} onPress={handleNextStep} disabled={isValidating}>
                        {isValidating ? (
                            <ActivityIndicator size="small" color="#000" />
                        ) : (
                            <>
                                <Text style={styles.primaryBtnText}>SIGUIENTE</Text>
                                <Ionicons name="arrow-forward" size={18} color="#000" style={{ marginLeft: 6 }} />
                            </>
                        )}
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
    
    mesaCard: { width: 95, height: 85, backgroundColor: '#13151a', borderRadius: 12, borderWidth: 1, borderColor: '#1f2229', alignItems: 'center', justifyContent: 'center', marginRight: 10, padding: 8 },
    mesaCardActive: { borderColor: '#01c38e', backgroundColor: 'rgba(1, 195, 142, 0.1)' },
    mesaCardTitle: { color: '#fff', fontSize: 12, fontFamily: 'Poppins-Bold', marginTop: 4 },
    mesaCardCap: { color: '#9ca3af', fontSize: 10, fontFamily: 'Poppins-Regular', marginTop: 2 },

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
    timeOptionItemDisabled: { opacity: 0.4, backgroundColor: '#13151a', borderColor: '#1f2229' }, 
    timeOptionText: { color: '#fff', fontFamily: 'Poppins-Medium', fontSize: 12 },
    timeOptionTextActive: { color: '#000', fontFamily: 'Poppins-Bold' },
    timeOptionTextDisabled: { color: '#4e5d78', textDecorationLine: 'line-through' }, 

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