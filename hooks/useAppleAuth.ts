import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

export interface AppleAuthResult {
    identityToken: string | null;
    authorizationCode: string | null;
    nonce: string | null;
    email: string | null;
    fullName: string | null;
}

const generateNonce = (length = 32): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const values = new Uint8Array(length);
    crypto.getRandomValues(values);
    return Array.from(values, (v) => chars[v % chars.length]).join('');
};

export function useAppleAuth() {
    const [isAvailable, setIsAvailable] = useState(false);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const available = await AppleAuthentication.isAvailableAsync();
                if (mounted) setIsAvailable(available);
            } catch (error) {
                console.log('Apple Sign-In no disponible:', error);
                if (mounted) setIsAvailable(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);

    const signIn = async (): Promise<AppleAuthResult | null> => {
        if (Platform.OS !== 'ios' || !isAvailable) return null;

        const nonce = generateNonce();

        let credential: AppleAuthentication.AppleAuthenticationCredential | null = null;
        try {
            credential = await AppleAuthentication.signInAsync({
                requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
                nonce,
            });
        } catch (error: any) {
            if (error?.code === 'ERR_REQUEST_CANCELED') {
                console.log('Inicio de sesión con Apple cancelado.');
                return null;
            }
            throw error;
        }

        if (!credential || !credential.identityToken) return null;

        const fullName = credential.fullName
            ? [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(' ')
            : null;

        return {
            identityToken: credential.identityToken,
            authorizationCode: credential.authorizationCode,
            nonce,
            email: credential.email,
            fullName: fullName || null,
        };
    };

    return { isAvailable, signIn };
}