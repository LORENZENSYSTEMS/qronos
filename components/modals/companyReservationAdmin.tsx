import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const COLORS = {
    background: '#0f1115',
    cardBg: '#181b21',
    accent: '#01c38e',
    text: '#ffffff',
    textSec: '#8b9bb4',
    border: '#232936',
    disabled: '#2a3140',
    disabledText: '#4e5d78'
};

const FONTS = {
    title: 'Heavitas',
    textRegular: 'Poppins-Regular',
    textMedium: 'Poppins-Medium',
    textBold: 'Poppins-Bold'
};

interface Mesa {
    mesa_id: number;
    nombre: string;
    capacidad: number;
    activo: boolean;
}

interface Reserva {
    reserva_id: number;
    mesa_nombre?: string;
    nombre_mesa?: string;
    cliente_nombre?: string;
    clienteNombre?: string;
    fecha: string;
    hora: string;
    personas: number;
}

interface CompanyReservationAdminProps {
    visible: boolean;
    onClose: () => void;
    empresaId: string | null;
}

// Generador del calendario en grilla mensual bloqueando días pasados
const getMonthCalendarGrid = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const year = today.getFullYear();
    const month = today.getMonth();
    
    const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const monthTitle = `${monthNames[month]} de ${year}`;

    const firstDayOfMonth = new Date(year, month, 1);
    let startingDay = firstDayOfMonth.getDay();
    startingDay = (startingDay + 6) % 7; // Ajustar para iniciar en Lunes

    const totalDays = new Date(year, month + 1, 0).getDate();
    const days = [];

    // Espacios vacíos para alinear el primer día
    for (let i = 0; i < startingDay; i++) {
        days.push({ empty: true, key: `empty-${i}` });
    }

    // Días del mes con validación de días pasados
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
            key: dateFormatted 
        });
    }

    return { monthTitle, days };
};

// Nueva función para generar las horas disponibles según el horario de la empresa
const generarHorasDisponibles = (apertura: string, cierre: string) => {
    if (!apertura || !cierre) return [];
    
    const horas = [];
    let [horaActual] = apertura.split(':').map(Number);
    const [horaFin] = cierre.split(':').map(Number);

    while (horaActual <= horaFin) {
        const horaFormateada = horaActual < 10 ? `0${horaActual}:00` : `${horaActual}:00`;
        horas.push(horaFormateada);
        horaActual++;
    }
    return horas;
};

export default function CompanyReservationAdmin({ visible, onClose, empresaId }: CompanyReservationAdminProps) {
    const insets = useSafeAreaInsets();
    const [activeTab, setActiveTab] = useState<'mesas' | 'bloquear' | 'reservas'>('mesas');
    const [mesas, setMesas] = useState<Mesa[]>([]);
    const [reservas, setReservas] = useState<Reserva[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingReservas, setIsLoadingReservas] = useState(false);

    const [mesaNombre, setMesaNombre] = useState('');
    const [mesaCapacidad, setMesaCapacidad] = useState('4');
    const [isCreating, setIsCreating] = useState(false);

    const [selectedMesaId, setSelectedMesaId] = useState<number | null>(null);
    const [clienteNombre, setClienteNombre] = useState('Bloqueo Administrativo');
    
    const monthCalendar = getMonthCalendarGrid();
    const todayFormatted = new Date().toISOString().split('T')[0];
    const [fechaReserva, setFechaReserva] = useState(todayFormatted);
    const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false);
    const [personas, setPersonas] = useState<number>(4);
    
    const [isBooking, setIsBooking] = useState(false);

    // Nuevos estados para el horario
    const [horarioApertura, setHorarioApertura] = useState<string>('08:00');
    const [horarioCierre, setHorarioCierre] = useState<string>('22:00');
    const [horaReserva, setHoraReserva] = useState(''); // Dejamos vacío por defecto para que tome la hora de apertura

    // Generamos las horas disponibles en base a los estados
    const horasDisponibles = generarHorasDisponibles(horarioApertura, horarioCierre);

    // Función para obtener la configuración de la empresa (Horarios)
    const loadEmpresaData = async () => {
        if (!empresaId) return;
        try {
            const API_URL = process.env.EXPO_PUBLIC_API_URL;
            const res = await fetch(`${API_URL}/api/empresa/${empresaId}`);
            if (res.ok) {
                const data = await res.json();
                if (data.horarioApertura) setHorarioApertura(data.horarioApertura);
                if (data.horarioCierre) setHorarioCierre(data.horarioCierre);
            }
        } catch (error) {
            console.error("Error loading empresa data:", error);
        }
    };

    const loadMesas = async () => {
        if (!empresaId) return;
        setIsLoading(true);
        try {
            const API_URL = process.env.EXPO_PUBLIC_API_URL;
            const res = await fetch(`${API_URL}/api/mesas/empresa/${empresaId}`);
            if (res.ok) {
                const data = await res.json();
                setMesas(data.mesas || []);
                if (data.mesas && data.mesas.length > 0 && !selectedMesaId) {
                    setSelectedMesaId(data.mesas[0].mesa_id);
                }
            }
        } catch (error) {
            console.error("Error loading mesas:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadReservas = async () => {
        if (!empresaId) return;
        setIsLoadingReservas(true);
        try {
            const API_URL = process.env.EXPO_PUBLIC_API_URL;
            const res = await fetch(`${API_URL}/api/mesas/reservas/empresa/${empresaId}`);
            if (res.ok) {
                const data = await res.json();
                setReservas(data.reservas || data || []);
            }
        } catch (error) {
            console.error("Error loading reservas:", error);
        } finally {
            setIsLoadingReservas(false);
        }
    };

    useEffect(() => {
        if (visible && empresaId) {
            loadEmpresaData(); // Cargamos los datos de la empresa para los horarios
            loadMesas();
            loadReservas();
        }
    }, [visible, empresaId]);

    const handleCreateMesa = async () => {
        if (!mesaNombre.trim()) {
            Alert.alert("Atención", "Ingresa un nombre para la mesa.");
            return;
        }
        setIsCreating(true);
        try {
            const API_URL = process.env.EXPO_PUBLIC_API_URL;
            const res = await fetch(`${API_URL}/api/mesas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre: mesaNombre.trim(),
                    capacidad: parseInt(mesaCapacidad) || 4,
                    empresa_id: Number(empresaId)
                })
            });
            if (res.ok) {
                setMesaNombre('');
                setMesaCapacidad('4');
                Alert.alert("Éxito", "Mesa creada correctamente.");
                loadMesas();
            } else {
                Alert.alert("Error", "No se pudo crear la mesa.");
            }
        } catch (error) {
            console.error("Error creating mesa:", error);
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteMesa = async (mesa_id: number) => {
        Alert.alert(
            "Eliminar Mesa",
            "¿Estás seguro de eliminar esta mesa?",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Eliminar",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const API_URL = process.env.EXPO_PUBLIC_API_URL;
                            const res = await fetch(`${API_URL}/api/mesas/${mesa_id}`, { method: 'DELETE' });
                            if (res.ok) loadMesas();
                        } catch (err) {
                            console.error("Error deleting mesa:", err);
                        }
                    }
                }
            ]
        );
    };

    const handleDeleteReserva = async (reserva_id: number) => {
        Alert.alert(
            "Cancelar Reserva",
            "¿Estás seguro de cancelar esta reserva?",
            [
                { text: "No", style: "cancel" },
                {
                    text: "Sí, cancelar",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const API_URL = process.env.EXPO_PUBLIC_API_URL;
                            const res = await fetch(`${API_URL}/api/mesas/reservas/${reserva_id}`, { method: 'DELETE' });
                            if (res.ok) loadReservas();
                        } catch (err) {
                            console.error("Error deleting reserva:", err);
                        }
                    }
                }
            ]
        );
    };

    const handleBloquearMesa = async () => {
        if (!selectedMesaId) {
            Alert.alert("Atención", "Selecciona una mesa para bloquear.");
            return;
        }
        setIsBooking(true);
        try {
            const API_URL = process.env.EXPO_PUBLIC_API_URL;
            const res = await fetch(`${API_URL}/api/mesas/reservar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mesa_id: selectedMesaId,
                    fecha: fechaReserva,
                    hora: horaReserva || horarioApertura, // Usamos la hora seleccionada o la de apertura por defecto
                    personas: personas,
                    clienteNombre: clienteNombre.trim() || 'Bloqueo Administrativo'
                })
            });
            const data = await res.json();
            if (res.ok) {
                Alert.alert("Éxito", "Mesa bloqueada/reservada correctamente.");
                loadReservas();
                setActiveTab('reservas');
            } else {
                Alert.alert("Error", data.message || "No se pudo bloquear la mesa.");
            }
        } catch (error) {
            console.error("Error booking mesa:", error);
        } finally {
            setIsBooking(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={false}>
            <View style={[styles.container, { paddingTop: insets.top || 20 }]}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={onClose} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={22} color={COLORS.text} />
                    </TouchableOpacity>
                    <Text style={styles.screenTitle}>GESTIÓN DE MESAS Y RESERVAS</Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === 'mesas' && styles.tabActive]}
                        onPress={() => setActiveTab('mesas')}
                    >
                        <Text style={[styles.tabText, activeTab === 'mesas' && styles.tabTextActive]}>Mesas</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === 'bloquear' && styles.tabActive]}
                        onPress={() => setActiveTab('bloquear')}
                    >
                        <Text style={[styles.tabText, activeTab === 'bloquear' && styles.tabTextActive]}>Bloquear</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === 'reservas' && styles.tabActive]}
                        onPress={() => {
                            setActiveTab('reservas');
                            loadReservas();
                        }}
                    >
                        <Text style={[styles.tabText, activeTab === 'reservas' && styles.tabTextActive]}>Reservas</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                    {activeTab === 'mesas' ? (
                        <View>
                            <View style={styles.cardForm}>
                                <Text style={styles.label}>Nombre de la Mesa</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Ej: Mesa 1, VIP 2"
                                    placeholderTextColor={COLORS.textSec}
                                    value={mesaNombre}
                                    onChangeText={setMesaNombre}
                                />

                                <Text style={styles.label}>Capacidad</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Ej: 4"
                                    placeholderTextColor={COLORS.textSec}
                                    keyboardType="numeric"
                                    value={mesaCapacidad}
                                    onChangeText={setMesaCapacidad}
                                />

                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={handleCreateMesa}
                                    disabled={isCreating}
                                >
                                    {isCreating ? <ActivityIndicator color="#000" /> : <Text style={styles.actionButtonText}>AGREGAR MESA</Text>}
                                </TouchableOpacity>
                            </View>

                            <Text style={[styles.label, { marginTop: 15, marginBottom: 10 }]}>Mesas Registradas ({mesas.length})</Text>
                            {isLoading ? (
                                <ActivityIndicator color={COLORS.accent} style={{ marginVertical: 20 }} />
                            ) : (
                                mesas.map((mesa) => (
                                    <View key={mesa.mesa_id} style={styles.mesaRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.mesaName}>{mesa.nombre}</Text>
                                            <Text style={styles.mesaCap}>Capacidad: {mesa.capacidad} personas</Text>
                                        </View>
                                        <TouchableOpacity onPress={() => handleDeleteMesa(mesa.mesa_id)} style={styles.deleteBtn}>
                                            <Ionicons name="trash-outline" size={18} color="#ff5252" />
                                        </TouchableOpacity>
                                    </View>
                                ))
                            )}
                        </View>
                    ) : activeTab === 'bloquear' ? (
                        <View style={styles.cardForm}>
                            <Text style={styles.label}>Seleccionar Mesa</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
                                {mesas.map((mesa) => (
                                    <TouchableOpacity
                                        key={mesa.mesa_id}
                                        style={[styles.mesaChip, selectedMesaId === mesa.mesa_id && styles.mesaChipActive]}
                                        onPress={() => setSelectedMesaId(mesa.mesa_id)}
                                    >
                                        <Text style={[styles.mesaChipText, selectedMesaId === mesa.mesa_id && styles.mesaChipTextActive]}>
                                            {mesa.nombre}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                                {mesas.length === 0 && (
                                    <Text style={{ color: COLORS.textSec, fontSize: 13 }}>No hay mesas creadas aún.</Text>
                                )}
                            </ScrollView>

                            {/* CALENDARIO EN GRILLA MENSUAL CON BLOQUEO DE DÍAS PASADOS */}
                            <Text style={styles.label}>Selecciona el Día</Text>
                            <View style={styles.calendarCard}>
                                <Text style={styles.calendarMonthTitle}>{monthCalendar.monthTitle}</Text>
                                
                                <View style={styles.weekDaysRow}>
                                    {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, index) => (
                                        <Text key={index} style={styles.weekDayText}>{d}</Text>
                                    ))}
                                </View>

                                <View style={styles.daysGrid}>
                                    {monthCalendar.days.map((item) => {
                                        if (item.empty) {
                                            return <View key={item.key} style={styles.calendarDayCellEmpty} />;
                                        }
                                        const isSelected = fechaReserva === item.dateString;
                                        const isPast = item.isPast;

                                        return (
                                            <TouchableOpacity
                                                key={item.key}
                                                style={[
                                                    styles.calendarDayCell, 
                                                    isSelected && styles.calendarDayCellActive,
                                                    isPast && styles.calendarDayCellDisabled
                                                ]}
                                                disabled={isPast}
                                                onPress={() => !isPast && setFechaReserva(item.dateString!)}
                                            >
                                                <Text style={[
                                                    styles.calendarDayCellText, 
                                                    isSelected && styles.calendarDayCellTextActive,
                                                    isPast && styles.calendarDayCellTextDisabled
                                                ]}>
                                                    {item.dayNumber}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                            <Text style={styles.selectedDateInfo}>Fecha seleccionada: <Text style={styles.bold}>{fechaReserva}</Text></Text>

                            {/* HORA DE RESERVA / BLOQUEO */}
                            <Text style={styles.label}>Hora de Reserva / Bloqueo (Formato 24h)</Text>
                            <TouchableOpacity 
                                style={styles.timeDropdownSelector}
                                onPress={() => setIsTimeDropdownOpen(!isTimeDropdownOpen)}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Ionicons name="time-outline" size={18} color={COLORS.accent} style={{ marginRight: 8 }} />
                                    <Text style={styles.timeDropdownText}>{horaReserva || horarioApertura} Hrs</Text>
                                </View>
                                <Ionicons name={isTimeDropdownOpen ? "chevron-up" : "chevron-down"} size={18} color={COLORS.textSec} />
                            </TouchableOpacity>

                            {isTimeDropdownOpen && (
                                <View style={styles.timeDropdownGrid}>
                                    {horasDisponibles.map((time) => (
                                        <TouchableOpacity
                                            key={time}
                                            style={[styles.timeOptionItem, (horaReserva || horarioApertura) === time && styles.timeOptionItemActive]}
                                            onPress={() => {
                                                setHoraReserva(time);
                                                setIsTimeDropdownOpen(false);
                                            }}
                                        >
                                            <Text style={[styles.timeOptionText, (horaReserva || horarioApertura) === time && styles.timeOptionTextActive]}>{time}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}

                            <Text style={styles.label}>Motivo / Nombre del Cliente</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Bloqueo administrativo / Juan Pérez"
                                placeholderTextColor={COLORS.textSec}
                                value={clienteNombre}
                                onChangeText={setClienteNombre}
                            />

                            <Text style={styles.label}>Número de Personas</Text>
                            <View style={styles.counterContainer}>
                                <TouchableOpacity 
                                    style={styles.counterBtn}
                                    onPress={() => setPersonas(Math.max(1, personas - 1))}
                                >
                                    <Ionicons name="remove" size={20} color="#fff" />
                                </TouchableOpacity>
                                <Text style={styles.counterValue}>{personas} {personas === 1 ? 'Persona' : 'Personas'}</Text>
                                <TouchableOpacity 
                                    style={styles.counterBtn}
                                    onPress={() => setPersonas(personas + 1)}
                                >
                                    <Ionicons name="add" size={20} color="#fff" />
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: '#ff5252', marginTop: 10 }]}
                                onPress={handleBloquearMesa}
                                disabled={isBooking}
                            >
                                {isBooking ? <ActivityIndicator color="#FFF" /> : <Text style={[styles.actionButtonText, { color: '#FFF' }]}>BLOQUEAR / RESERVAR MESA</Text>}
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View>
                            <Text style={[styles.label, { marginBottom: 10 }]}>Mesas Reservadas / Bloqueadas ({reservas.length})</Text>
                            {isLoadingReservas ? (
                                <ActivityIndicator color={COLORS.accent} style={{ marginVertical: 20 }} />
                            ) : reservas.length === 0 ? (
                                <View style={[styles.cardForm, { alignItems: 'center', padding: 30 }]}>
                                    <Ionicons name="calendar-outline" size={40} color={COLORS.textSec} style={{ marginBottom: 10 }} />
                                    <Text style={{ color: COLORS.textSec, fontFamily: FONTS.textMedium, fontSize: 14, textAlign: 'center' }}>
                                        No hay reservas registradas actualmente.
                                    </Text>
                                </View>
                            ) : (
                                reservas.map((res, index) => {
                                    const mesaName = res.mesa_nombre || res.nombre_mesa || 'Mesa';
                                    const cliente = res.cliente_nombre || res.clienteNombre || 'Sin nombre';
                                    return (
                                        <View key={res.reserva_id || index} style={styles.reservaCard}>
                                            <View style={styles.reservaHeader}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                    <View style={styles.mesaBadge}>
                                                        <Ionicons name="restaurant-outline" size={14} color={COLORS.accent} />
                                                        <Text style={styles.mesaBadgeText}>{mesaName}</Text>
                                                    </View>
                                                    <Text style={[styles.reservaPersonas, { marginLeft: 10 }]}>{res.personas} pers.</Text>
                                                </View>
                                                
                                                <TouchableOpacity onPress={() => handleDeleteReserva(res.reserva_id)} style={styles.deleteBtn}>
                                                    <Ionicons name="trash-outline" size={18} color="#ff5252" />
                                                </TouchableOpacity>
                                            </View>
                                            
                                            <View style={styles.reservaDetailRow}>
                                                <Ionicons name="person-outline" size={15} color={COLORS.textSec} />
                                                <Text style={styles.reservaTextLabel}>Reservado por:</Text>
                                                <Text style={styles.reservaTextValue}>{cliente}</Text>
                                            </View>

                                            <View style={styles.reservaDetailRow}>
                                                <Ionicons name="calendar-clear-outline" size={15} color={COLORS.textSec} />
                                                <Text style={styles.reservaTextLabel}>Para cuándo:</Text>
                                                <Text style={styles.reservaTextValue}>{res.fecha}</Text>
                                            </View>

                                            <View style={styles.reservaDetailRow}>
                                                <Ionicons name="time-outline" size={15} color={COLORS.textSec} />
                                                <Text style={styles.reservaTextLabel}>A qué hora:</Text>
                                                <Text style={styles.reservaTextValue}>{res.hora}</Text>
                                            </View>
                                        </View>
                                    );
                                })
                            )}
                        </View>
                    )}
                </ScrollView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        paddingHorizontal: '6%'
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        marginTop: 10
    },
    screenTitle: {
        color: COLORS.text,
        fontFamily: FONTS.title,
        fontSize: 13,
        textAlign: 'center',
        flex: 1
    },
    backBtn: {
        width: 40,
        height: 40,
        backgroundColor: COLORS.cardBg,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        justifyContent: 'center',
        alignItems: 'center'
    },
    tabContainer: {
        flexDirection: 'row',
        marginBottom: 20,
        backgroundColor: COLORS.cardBg,
        borderRadius: 12,
        padding: 4,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    tabButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10
    },
    tabActive: {
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    tabText: {
        color: COLORS.textSec,
        fontFamily: FONTS.textMedium,
        fontSize: 11
    },
    tabTextActive: {
        color: COLORS.accent,
        fontFamily: FONTS.textBold
    },
    cardForm: {
        backgroundColor: COLORS.cardBg,
        padding: 15,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    label: {
        color: COLORS.textSec,
        fontFamily: FONTS.textMedium,
        fontSize: 12,
        marginBottom: 6,
        marginLeft: 2,
        marginTop: 8
    },
    input: {
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 10,
        padding: 12,
        color: COLORS.text,
        fontSize: 14,
        marginBottom: 12,
        minHeight: 45
    },
    actionButton: {
        backgroundColor: COLORS.accent,
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10
    },
    actionButtonText: {
        color: '#000',
        fontFamily: FONTS.title,
        fontSize: 13
    },
    mesaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: COLORS.cardBg,
        padding: 14,
        borderRadius: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    mesaName: {
        color: COLORS.text,
        fontFamily: FONTS.textBold,
        fontSize: 14
    },
    mesaCap: {
        color: COLORS.textSec,
        fontFamily: FONTS.textRegular,
        fontSize: 12,
        marginTop: 2
    },
    deleteBtn: {
        padding: 8,
        backgroundColor: 'rgba(255, 82, 82, 0.1)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ff5252'
    },
    mesaChip: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: COLORS.background,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginRight: 8
    },
    mesaChipActive: {
        backgroundColor: COLORS.accent,
        borderColor: COLORS.accent
    },
    mesaChipText: {
        color: COLORS.textSec,
        fontFamily: FONTS.textMedium,
        fontSize: 12
    },
    mesaChipTextActive: {
        color: '#000',
        fontFamily: FONTS.textBold
    },
    calendarCard: {
        backgroundColor: COLORS.background,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 12,
        marginBottom: 8
    },
    calendarMonthTitle: {
        color: COLORS.text,
        fontFamily: FONTS.textBold,
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 10
    },
    weekDaysRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 8
    },
    weekDayText: {
        color: COLORS.textSec,
        fontFamily: FONTS.textMedium,
        fontSize: 11,
        width: `${100 / 7}%`,
        textAlign: 'center'
    },
    daysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap'
    },
    calendarDayCellEmpty: {
        width: `${100 / 7}%`,
        height: 36,
        marginBottom: 4
    },
    calendarDayCell: {
        width: `${100 / 7}%`,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
        borderRadius: 8
    },
    calendarDayCellActive: {
        backgroundColor: 'rgba(1, 195, 142, 0.15)',
        borderWidth: 1,
        borderColor: COLORS.accent
    },
    calendarDayCellDisabled: {
        backgroundColor: 'transparent',
        opacity: 0.3
    },
    calendarDayCellText: {
        color: COLORS.text,
        fontSize: 13,
        fontFamily: FONTS.textRegular
    },
    calendarDayCellTextActive: {
        color: COLORS.accent,
        fontFamily: FONTS.textBold
    },
    calendarDayCellTextDisabled: {
        color: COLORS.disabledText,
        textDecorationLine: 'line-through'
    },
    selectedDateInfo: {
        color: COLORS.textSec,
        fontFamily: FONTS.textRegular,
        fontSize: 12,
        marginBottom: 12,
        marginLeft: 2
    },
    timeDropdownSelector: { backgroundColor: COLORS.background, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    timeDropdownText: { color: COLORS.text, fontFamily: FONTS.textBold, fontSize: 14 },
    timeDropdownGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, backgroundColor: COLORS.background, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 },
    timeOptionItem: { width: '22%', paddingVertical: 10, backgroundColor: COLORS.cardBg, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
    timeOptionItemActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
    timeOptionText: { color: COLORS.text, fontFamily: FONTS.textMedium, fontSize: 12 },
    timeOptionTextActive: { color: '#000', fontFamily: FONTS.textBold },
    counterContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.background, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, padding: 10, marginBottom: 12 },
    counterBtn: { backgroundColor: COLORS.cardBg, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
    counterValue: { color: COLORS.text, fontFamily: FONTS.textBold, fontSize: 14 },
    bold: { color: COLORS.text, fontFamily: FONTS.textBold },
    reservaCard: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 14,
        padding: 15,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    reservaHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border
    },
    mesaBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(1, 195, 142, 0.1)',
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.accent
    },
    mesaBadgeText: {
        color: COLORS.accent,
        fontFamily: FONTS.textBold,
        fontSize: 12,
        marginLeft: 6
    },
    reservaPersonas: {
        color: COLORS.textSec,
        fontFamily: FONTS.textMedium,
        fontSize: 12
    },
    reservaDetailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6
    },
    reservaTextLabel: {
        color: COLORS.textSec,
        fontFamily: FONTS.textMedium,
        fontSize: 12,
        marginLeft: 8,
        width: 105
    },
    reservaTextValue: {
        color: COLORS.text,
        fontFamily: FONTS.textRegular,
        fontSize: 13,
        flex: 1
    }
});