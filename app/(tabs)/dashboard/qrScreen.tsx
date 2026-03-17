import { CameraView, useCameraPermissions } from 'expo-camera';
import * as SecureStore from 'expo-secure-store';
import React, { useState } from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function QRScreen() {
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [messageState, setMessageState] = useState('');

    // Valores responsivos
    const scale = width / 375;
    const normalize = (size: number) => Math.round(size * scale);
    const cameraSize = width * 0.75; 

    // Función para manejar el botón de permisos
    const handlePermission = async () => {
        if (permission && !permission.canAskAgain && !permission.granted) {
            // Si el usuario ya denegó y el sistema no permite preguntar de nuevo, abrimos ajustes
            await Linking.openSettings();
        } else {
            // De lo contrario, lanzamos la petición nativa
            await requestPermission();
        }
    };

    async function CreateMetricasQr(qr_token: string, puntos: number) {
        const empresa_id = await SecureStore.getItemAsync('empresa_id');
        const jwt = await SecureStore.getItemAsync('jwt');
        try {
            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/metricas/register-scan`, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${jwt}`,
                },
                body: JSON.stringify({
                    qr_token: qr_token,
                    empresa_id: empresa_id,
                    puntos: puntos,
                })
            });

            const data = await response.json();
            setMessageState(data.message);
        } catch (err) {
            console.log(err);
        }
    }

    if (!permission) return <View style={{ flex: 1, backgroundColor: '#0f1115' }} />;

    if (!permission.granted) {
        return (
            <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
                <Text style={styles.infoText}>Necesitamos acceso a la cámara para escanear los códigos QR.</Text>
                <TouchableOpacity onPress={handlePermission} style={styles.permissionBtn}>
                    <Text style={styles.permissionBtnText}>
                        {permission.canAskAgain ? "Continuar" : "Abrir Ajustes"}
                    </Text>
                </TouchableOpacity>
            </View>
        );
    }

    const handleBarCodeScanned = ({ data }: { data: any }) => {
        setScanned(true);
        CreateMetricasQr(data, 10);
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#0f1115', paddingTop: insets.top }}>
            {!scanned ? (
                <View style={styles.scannerWrapper}>
                    <View style={[styles.cameraContainer, { width: cameraSize, height: cameraSize }]}>
                        <CameraView
                            style={StyleSheet.absoluteFill}
                            facing="back"
                            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                        />
                    </View>
                    <Text style={[styles.instructionText, { fontSize: normalize(14) }]}>
                        Apunta la cámara hacia un código QR
                    </Text>
                </View>
            ) : (
                <View style={styles.resultContainer}>
                    <TouchableOpacity 
                        style={[styles.retryBtn, { padding: normalize(15) }]} 
                        onPress={() => setScanned(false)}
                    >
                        <Text style={styles.retryBtnText}>Toca para escanear de nuevo</Text>
                    </TouchableOpacity>
                    <Text style={[styles.messageText, { fontSize: normalize(16) }]}>{messageState}</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    scannerWrapper: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    cameraContainer: {
        borderRadius: 30,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#01c38e',
        backgroundColor: '#000'
    },
    infoText: { textAlign: 'center', color: '#8b9bb4', fontFamily: 'Poppins-Medium' },
    permissionBtn: { marginTop: 15 },
    permissionBtnText: { color: '#01c38e', fontWeight: 'bold' },
    instructionText: { color: '#ffffff', marginTop: 30, textAlign: 'center', fontFamily: 'Poppins-Medium' },
    resultContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    retryBtn: {
        backgroundColor: '#01c38e',
        borderRadius: 12,
        width: '80%',
        alignItems: 'center',
        marginBottom: 20
    },
    retryBtnText: { color: '#0f1115', fontWeight: 'bold', fontSize: 16 },
    messageText: { color: '#ffffff', textAlign: 'center', fontFamily: 'Poppins-Bold' }
});