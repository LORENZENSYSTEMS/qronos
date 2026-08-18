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

interface CourtReservationStepProps {
    empresa: any;
    userName: string;
    onBack: () => void;
    onClose: () => void;
}

const getMonthCalendarGrid = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const year = today.getFullYear();
    const month = today.getMonth();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const firstDayDate = new Date(year, month, 1);
    const startingDayIndex = (firstDayDate.getDay() + 6) % 7; 

    const days = [];
    for (let i = 0; i < startingDayIndex; i++) days.push({ empty: true, id: `empty-${i}` });
    for (let i = 1; i <= totalDays; i++) {
        const loopDate = new Date(year, month, i);
        loopDate.setHours(0, 0, 0, 0);
        const dayStr = i < 10 ? `0${i}` : `${i}`;
        const monthStr = (month + 1) < 10 ? `0${month + 1}` : `${month + 1}`;
        days.push({
            empty: false, dayNumber: i, dateString: `${year}-${monthStr}-${dayStr}`,
            isPast: loopDate < today, id: `${year}-${monthStr}-${dayStr}`,
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
    const endHour = parseHour(horarioCierre, 23);
    const times = [];
    for (let i = startHour; i <= endHour; i++) {
        times.push(i < 10 ? `0${i}:00` : `${i}:00`);
    }
    return times;
};

export default function CourtReservationStep({ empresa, userName, onBack, onClose }: CourtReservationStepProps) {
    const insets = useSafeAreaInsets();
    const [step, setStep] = useState<2 | 3 | 4>(2);
    
    // Calendario y Fechas
    const calendarData = getMonthCalendarGrid();
    const validFirstDay = calendarData.days.find(d => !d.empty && !d.isPast)?.dateString || new Date().toISOString().split('T')[0];
    const [selectedDate, setSelectedDate] = useState<string>(validFirstDay);
    
    // Horarios
    const availableTimes = useMemo(() => {
        const apertura = empresa?.horarioApertura || empresa?.horario_apertura || '08:00';
        const cierre = empresa?.horarioCierre || empresa?.horario_cierre || '23:00';
        return generateAvailableTimes(apertura, cierre);
    }, [empresa]);
    
    const [activeTimePicker, setActiveTimePicker] = useState<'start' | 'end' | null>(null);
    const [selectedTime, setSelectedTime] = useState<string>(availableTimes[0] || '18:00');
    
    const availableEndTimes = useMemo(() => availableTimes.filter(time => time > selectedTime), [availableTimes, selectedTime]);
    const [selectedEndTime, setSelectedEndTime] = useState<string>(availableEndTimes[0] || selectedTime);

    // Estados de Canchas y Reservas desde el Backend
    const [canchas, setCanchas] = useState<any[]>([]);
    const [reservadas, setReservadas] = useState<any[]>([]);
    const [loadingCanchas, setLoadingCanchas] = useState<boolean>(false);
    const [isValidating, setIsValidating] = useState<boolean>(false);
    const [selectedCancha, setSelectedCancha] = useState<any>(null);
    const [resourceDetail, setResourceDetail] = useState('');

    const [numberOfPeople, setNumberOfPeople] = useState<number>(10);
    const [reservationNote, setReservationNote] = useState('');

    // Cargar canchas y reservas al montar el componente
    useEffect(() => {
        fetchCanchas();
        fetchReservasCanchas();
    }, [empresa]);

    const fetchCanchas = async () => {
        try {
            setLoadingCanchas(true);
            const empresaId = empresa?.id || empresa?._id;
            const API_URL = process.env.EXPO_PUBLIC_API_URL;
            const response = await fetch(`${API_URL}/api/canchas/empresa/${empresaId}`);
            const data = await response.json();
            const listaCanchas = data.canchas || (Array.isArray(data) ? data : []);
            
            if (listaCanchas.length > 0) {
                setCanchas(listaCanchas);
                setSelectedCancha(listaCanchas[0]);
                setResourceDetail(listaCanchas[0].nombre || listaCanchas[0].titulo);
            } else {
                setCanchas([]);
            }
        } catch (error) {
            console.error("Error al cargar canchas:", error);
            setCanchas([]);
        } finally {
            setLoadingCanchas(false);
        }
    };

    const fetchReservasCanchas = async () => {
        try {
            const empresaId = empresa?.id || empresa?._id;
            const API_URL = process.env.EXPO_PUBLIC_API_URL;
            const response = await fetch(`${API_URL}/api/canchas/reservas/empresa/${empresaId}`);
            const data = await response.json();
            setReservadas(data.reservas || (Array.isArray(data) ? data : []));
        } catch (error) {
            console.error("Error al cargar reservas de canchas:", error);
        }
    };

    // Filtrar reservas específicas de la cancha seleccionada
    const reservasCanchaActual = useMemo(() => {
        if (!selectedCancha) return [];
        return reservadas.filter((res: any) => {
            const resId = String(res.cancha_id || res.id_cancha || '').trim();
            const resNombre = String(res.cancha_nombre || res.nombre_cancha || '').trim();
            
            const currentId = String(selectedCancha.cancha_id || selectedCancha.id || '').trim();
            const currentNombre = String(selectedCancha.nombre || '').trim();

            return (currentId !== '' && resId !== '' && currentId === resId) ||
                   (currentNombre !== '' && resNombre !== '' && currentNombre === resNombre);
        });
    }, [reservadas, selectedCancha]);

    // Validar si una hora puntual está dentro de una reserva existente
    const isTimePointOccupied = (date: string, time: string) => {
        return reservasCanchaActual.some((res: any) => {
            if (res.fecha !== date) return false;
            const resStart = res.hora_inicio || res.hora;
            const resEnd = res.hora_fin || res.hora_salida || resStart;
            if (!resStart || !resEnd) return false;
            // Bloquea todas las horas entre la llegada y la salida (ej. 18:00 a 22:00)
            return time >= resStart && time <= resEnd;
        });
    };

    // Validar solapamiento completo de rangos de horarios
    const checkIfTimeIsOccupied = (date: string, startTime: string, endTime: string) => {
        return reservasCanchaActual.some((res: any) => {
            if (res.fecha !== date) return false;
            const resStart = res.hora_inicio || res.hora;
            const resEnd = res.hora_fin || res.hora_salida || resStart; 
            
            if (!resStart || !resEnd) return false;
            return startTime < resEnd && endTime > resStart;
        });
    };

    // Efecto para reasignar automáticamente si el horario actual quedó ocupado al cambiar fecha/cancha
    useEffect(() => {
        if (reservasCanchaActual.length > 0) {
            const isStartOccupied = isTimePointOccupied(selectedDate, selectedTime);
            const isCurrentOccupied = isStartOccupied || checkIfTimeIsOccupied(selectedDate, selectedTime, selectedEndTime);
            if (isCurrentOccupied) {
                for (const start of availableTimes) {
                    if (!isTimePointOccupied(selectedDate, start)) {
                        const possibleEnds = availableTimes.filter(t => t > start);
                        for (const end of possibleEnds) {
                            if (!checkIfTimeIsOccupied(selectedDate, start, end)) {
                                setSelectedTime(start);
                                setSelectedEndTime(end);
                                return;
                            }
                        }
                    }
                }
            }
        }
    }, [selectedCancha, selectedDate, reservasCanchaActual]);

    useEffect(() => {
        if (selectedEndTime <= selectedTime && availableEndTimes.length > 0) {
            setSelectedEndTime(availableEndTimes[0]);
        }
    }, [selectedTime, availableEndTimes]);

    const handleNextStep = async () => {
        if (step === 2) {
            if (!selectedCancha) {
                Alert.alert("Atención", "Selecciona una cancha para continuar.");
                return;
            }

            setIsValidating(true);
            try {
                const empresaId = empresa?.id || empresa?._id;
                const API_URL = process.env.EXPO_PUBLIC_API_URL;
                const response = await fetch(`${API_URL}/api/canchas/reservas/empresa/${empresaId}`);
                const data = await response.json();
                const reservasActuales = data.reservas || (Array.isArray(data) ? data : []);
                setReservadas(reservasActuales);

                const isOccupied = reservasActuales.some((res: any) => {
                    const resId = String(res.cancha_id || res.id_cancha || '').trim();
                    const resNombre = String(res.cancha_nombre || res.nombre_cancha || '').trim();
                    
                    const currentId = String(selectedCancha?.cancha_id || selectedCancha?.id || '').trim();
                    const currentNombre = String(selectedCancha?.nombre || '').trim();

                    const matchResource = (currentId !== '' && resId !== '' && currentId === resId) ||
                                          (currentNombre !== '' && resNombre !== '' && currentNombre === resNombre);

                    if (!matchResource || res.fecha !== selectedDate) return false;

                    const resStart = res.hora_inicio || res.hora;
                    const resEnd = res.hora_fin || res.hora_salida || resStart;
                    return selectedTime < resEnd && selectedEndTime > resStart;
                });

                if (isOccupied) {
                    Alert.alert(
                        "Horario no disponible",
                        "La cancha ya se encuentra reservada en parte o en la totalidad del horario seleccionado. Por favor, elige otro intervalo u otra cancha."
                    );
                    setIsValidating(false);
                    return;
                }
            } catch (error) {
                console.error("Error validando disponibilidad de cancha:", error);
            } finally {
                setIsValidating(false);
            }

            setStep(3);
        } else if (step === 3) {
            setStep(4);
        }
    };

    const sendReservationWhatsApp = async () => {
        if (!empresa.whatsapp) {
            Alert.alert("Aviso", "Esta empresa no ha registrado número de WhatsApp.");
            return;
        }

        const reservationId = Math.floor(10000 + Math.random() * 90000);
        let mensaje = `*NUEVA RESERVA DE CANCHA DESDE QRONNOS*\n`;
        mensaje += `👤 *Cliente:* ${userName}\n`;
        mensaje += `(ID Reserva: #${reservationId})\n\n`;
        mensaje += `📅 *Fecha:* ${selectedDate}\n`;
        mensaje += `⏰ *Llegada (24h):* ${selectedTime}\n`;
        mensaje += `🏁 *Salida (24h):* ${selectedEndTime}\n`;
        mensaje += `👥 *Jugadores est.:* ${numberOfPeople}\n`;
        mensaje += `📍 *Cancha:* ${resourceDetail}\n`;

        if (reservationNote.trim() !== '') mensaje += `📝 *Notas:* ${reservationNote.trim()}\n`;
        mensaje += `\n✅ *Estado:* Solicitud pendiente de confirmación.`;

        const cleanPhone = empresa.whatsapp.replace(/[^\d]/g, '');
        const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(mensaje)}`;
        const supported = await Linking.canOpenURL(url);
        if (supported) await Linking.openURL(url);
        else Alert.alert("Error", "No se pudo abrir WhatsApp.");
    };

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
                <TouchableOpacity onPress={() => step > 2 ? setStep((step - 1) as any) : onBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>Reserva de Cancha</Text>
                    <Text style={styles.headerSubtitle} numberOfLines={1}>{empresa?.titulo}</Text>
                </View>
                <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>Paso {step}/4</Text>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                {step === 2 && (
                    <View>
                        <View style={styles.stepBadgeContainer}><Text style={styles.stepBadgeNumber}>PASO 2 DE 4</Text></View>
                        <Text style={styles.stepTitle}>Disponibilidad de Cancha</Text>
                        <Text style={styles.stepSubtitle}>Selecciona la cancha, fecha y duración del partido.</Text>

                        <Text style={styles.label}>Selecciona la Cancha</Text>
                        {loadingCanchas ? (
                            <ActivityIndicator size="small" color="#01c38e" style={{ marginVertical: 20 }} />
                        ) : canchas.length === 0 ? (
                            <Text style={{ color: '#9ca3af', fontSize: 13, fontStyle: 'italic', marginBottom: 15 }}>No hay canchas registradas en este establecimiento.</Text>
                        ) : (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                                {canchas.map((cancha) => {
                                    const canchaId = cancha.cancha_id || cancha.id;
                                    const isSelected = selectedCancha?.id === canchaId || selectedCancha?.cancha_id === canchaId;
                                    return (
                                        <TouchableOpacity
                                            key={canchaId}
                                            style={[styles.mesaCard, isSelected && styles.mesaCardActive]}
                                            onPress={() => {
                                                setSelectedCancha(cancha);
                                                setResourceDetail(cancha.nombre || cancha.titulo);
                                            }}
                                        >
                                            <Ionicons name="football-outline" size={24} color={isSelected ? '#01c38e' : '#9ca3af'} />
                                            <Text style={[styles.mesaCardTitle, isSelected && styles.calendarTextActive]}>{cancha.nombre || cancha.titulo}</Text>
                                            <Text style={styles.mesaCardCap}>{cancha.tipo || 'Cancha'}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        )}

                        <Text style={styles.label}>Selecciona el Día</Text>
                        <View style={styles.calendarContainer}>
                            <Text style={styles.calendarHeaderTitle}>{calendarData.monthName}</Text>
                            <View style={styles.weekDaysRow}>
                                {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, i) => <Text key={`wd-${i}`} style={styles.weekDayText}>{d}</Text>)}
                            </View>
                            <View style={styles.daysGrid}>
                                {calendarData.days.map((item) => {
                                    if (item.empty) return <View key={item.id} style={styles.dayCellEmpty} />;
                                    const isSelected = selectedDate === item.dateString;
                                    return (
                                        <TouchableOpacity
                                            key={item.id}
                                            style={[styles.dayCell, item.isPast && styles.dayCellPast, isSelected && styles.dayCellActive]}
                                            disabled={item.isPast}
                                            onPress={() => setSelectedDate(item.dateString)}
                                        >
                                            <Text style={[styles.dayCellText, item.isPast && styles.dayCellTextPast, isSelected && styles.dayCellTextActive]}>
                                                {item.dayNumber}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        <View style={{ marginBottom: 15 }}>
                            <Text style={styles.label}>Hora de Llegada (Inicio)</Text>
                            <TouchableOpacity style={styles.timeDropdownSelector} onPress={() => setActiveTimePicker(activeTimePicker === 'start' ? null : 'start')}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Ionicons name="time-outline" size={18} color="#01c38e" style={{ marginRight: 8 }} />
                                    <Text style={styles.timeDropdownText}>{selectedTime} Hrs</Text>
                                </View>
                                <Ionicons name={activeTimePicker === 'start' ? "chevron-up" : "chevron-down"} size={18} color="#9ca3af" />
                            </TouchableOpacity>
                            {activeTimePicker === 'start' && (
                                <View style={styles.timeDropdownGrid}>
                                    {availableTimes.map((time) => {
                                        const isOccupiedStart = isTimePointOccupied(selectedDate, time);
                                        return (
                                            <TouchableOpacity 
                                                key={`st-${time}`} 
                                                style={[
                                                    styles.timeOptionItem, 
                                                    selectedTime === time && styles.timeOptionItemActive,
                                                    isOccupiedStart && styles.timeOptionItemDisabled
                                                ]} 
                                                disabled={isOccupiedStart}
                                                onPress={() => { setSelectedTime(time); setActiveTimePicker(null); }}
                                            >
                                                <Text style={[
                                                    styles.timeOptionText, 
                                                    selectedTime === time && styles.timeOptionTextActive,
                                                    isOccupiedStart && styles.timeOptionTextDisabled
                                                ]}>{time}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            )}

                            <Text style={[styles.label, { marginTop: 10 }]}>Hora de Salida (Fin)</Text>
                            <TouchableOpacity style={styles.timeDropdownSelector} onPress={() => setActiveTimePicker(activeTimePicker === 'end' ? null : 'end')}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Ionicons name="time-outline" size={18} color="#01c38e" style={{ marginRight: 8 }} />
                                    <Text style={styles.timeDropdownText}>{selectedEndTime} Hrs</Text>
                                </View>
                                <Ionicons name={activeTimePicker === 'end' ? "chevron-up" : "chevron-down"} size={18} color="#9ca3af" />
                            </TouchableOpacity>
                            {activeTimePicker === 'end' && (
                                <View style={styles.timeDropdownGrid}>
                                    {availableEndTimes.map((time) => {
                                        const isOccupiedRange = checkIfTimeIsOccupied(selectedDate, selectedTime, time);
                                        return (
                                            <TouchableOpacity 
                                                key={`et-${time}`} 
                                                style={[
                                                    styles.timeOptionItem, 
                                                    selectedEndTime === time && styles.timeOptionItemActive,
                                                    isOccupiedRange && styles.timeOptionItemDisabled
                                                ]} 
                                                disabled={isOccupiedRange}
                                                onPress={() => { setSelectedEndTime(time); setActiveTimePicker(null); }}
                                            >
                                                <Text style={[
                                                    styles.timeOptionText, 
                                                    selectedEndTime === time && styles.timeOptionTextActive,
                                                    isOccupiedRange && styles.timeOptionTextDisabled
                                                ]}>{time}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            )}
                        </View>

                        <Text style={styles.label}>Cantidad de Jugadores Estimados</Text>
                        <View style={styles.counterContainer}>
                            <TouchableOpacity style={styles.counterBtn} onPress={() => setNumberOfPeople(Math.max(2, numberOfPeople - 1))}>
                                <Ionicons name="remove" size={20} color="#fff" />
                            </TouchableOpacity>
                            <Text style={styles.counterValue}>{numberOfPeople} Personas</Text>
                            <TouchableOpacity style={styles.counterBtn} onPress={() => setNumberOfPeople(numberOfPeople + 1)}>
                                <Ionicons name="add" size={20} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {step === 3 && (
                    <View>
                        <View style={styles.stepBadgeContainer}><Text style={styles.stepBadgeNumber}>PASO 3 DE 4</Text></View>
                        <Text style={styles.stepTitle}>Detalles del Partido</Text>
                        <Text style={styles.stepSubtitle}>¿Necesitan balones, petos o hidratación extra?</Text>
                        
                        <Text style={styles.label}>Cancha seleccionada</Text>
                        <View style={styles.input}><Text style={{ color: '#fff', fontFamily: 'Poppins-Regular' }}>{resourceDetail}</Text></View>

                        <Text style={styles.label}>Requerimientos (Opcional)</Text>
                        <View style={{ backgroundColor: '#13151a', borderRadius: 12, borderWidth: 1, borderColor: '#1f2229', padding: 12 }}>
                            <TextInput
                                style={{ color: '#fff', height: 80, textAlignVertical: 'top', fontFamily: 'Poppins-Regular' }}
                                multiline
                                value={reservationNote}
                                onChangeText={setReservationNote}
                                placeholder="Ej: Necesitamos 2 balones y petos azules..."
                                placeholderTextColor="#9ca3af"
                            />
                        </View>
                    </View>
                )}

                {step === 4 && (
                    <View>
                        <View style={styles.stepBadgeContainer}><Text style={styles.stepBadgeNumber}>PASO 4 DE 4</Text></View>
                        <Text style={styles.stepTitle}>Resumen de la Cancha</Text>
                        <Text style={styles.stepSubtitle}>Verifica los datos antes de enviar la reserva.</Text>

                        <View style={styles.summaryCard}>
                            <Text style={styles.summaryRow}>📅 Fecha: <Text style={styles.bold}>{selectedDate}</Text></Text>
                            <Text style={styles.summaryRow}>⏰ Inicio: <Text style={styles.bold}>{selectedTime}</Text></Text>
                            <Text style={styles.summaryRow}>🏁 Fin: <Text style={styles.bold}>{selectedEndTime}</Text></Text>
                            <Text style={styles.summaryRow}>📍 Cancha: <Text style={styles.bold}>{resourceDetail}</Text></Text>
                            <Text style={styles.summaryRow}>👥 Jugadores: <Text style={styles.bold}>{numberOfPeople}</Text></Text>
                            {reservationNote ? <Text style={styles.summaryRow}>📝 Notas: <Text style={styles.bold}>{reservationNote}</Text></Text> : null}
                        </View>
                    </View>
                )}
            </ScrollView>

            <View style={styles.footer}>
                {step < 4 ? (
                    <TouchableOpacity style={styles.primaryBtn} onPress={handleNextStep} disabled={isValidating}>
                        {isValidating ? <ActivityIndicator size="small" color="#000" /> : (
                            <><Text style={styles.primaryBtnText}>SIGUIENTE</Text><Ionicons name="arrow-forward" size={18} color="#000" style={{ marginLeft: 6 }} /></>
                        )}
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={styles.whatsappBtn} onPress={sendReservationWhatsApp}>
                        <Ionicons name="logo-whatsapp" size={22} color="#FFF" />
                        <Text style={styles.whatsappBtnText}>ENVIAR A WHATSAPP</Text>
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
    input: { backgroundColor: '#13151a', borderRadius: 12, borderWidth: 1, borderColor: '#1f2229', padding: 14, marginBottom: 15 },
    
    mesaCard: { width: 110, height: 90, backgroundColor: '#13151a', borderRadius: 12, borderWidth: 1, borderColor: '#1f2229', alignItems: 'center', justifyContent: 'center', marginRight: 10, padding: 8 },
    mesaCardActive: { borderColor: '#01c38e', backgroundColor: 'rgba(1, 195, 142, 0.1)' },
    mesaCardTitle: { color: '#fff', fontSize: 11, fontFamily: 'Poppins-Bold', marginTop: 6, textAlign: 'center' },
    mesaCardCap: { color: '#9ca3af', fontSize: 10, fontFamily: 'Poppins-Regular', marginTop: 2 },

    calendarContainer: { backgroundColor: '#13151a', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#1f2229', marginBottom: 10 },
    calendarHeaderTitle: { color: '#fff', fontFamily: 'Poppins-Bold', fontSize: 15, marginBottom: 12 },
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

    summaryCard: { backgroundColor: '#13151a', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#1f2229', gap: 12 },
    summaryRow: { color: '#9ca3af', fontFamily: 'Poppins-Regular', fontSize: 14 },
    bold: { color: '#fff', fontFamily: 'Poppins-Bold' },

    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#12141A', borderTopWidth: 1, borderTopColor: '#2A2E39', padding: 20 },
    primaryBtn: { backgroundColor: '#01c38e', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, borderRadius: 16 },
    primaryBtnText: { color: '#000', fontFamily: 'Poppins-Bold', fontSize: 14 },
    whatsappBtn: { backgroundColor: '#25D366', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, borderRadius: 16 },
    whatsappBtnText: { color: '#FFF', fontFamily: 'Poppins-Bold', fontSize: 14, marginLeft: 8 },
});