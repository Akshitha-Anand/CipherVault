import { EncryptedData } from '../types';

// --- Base64 Helpers ---
// Converts a base64 string to an ArrayBuffer.
const b64_to_ab = (b64: string): ArrayBuffer => {
    const binary_string = window.atob(b64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
};

// Converts an ArrayBuffer to a base64 string.
const ab_to_b64 = (ab: ArrayBuffer): string => {
    const bytes = new Uint8Array(ab);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
};

// --- Web Crypto API Service ---
const cryptoService = {
    /**
     * Derives a cryptographic key from a user's password and a salt.
     * Uses PBKDF2 for key derivation, which is a standard and secure method.
     */
    async getKey(password: string, salt: string): Promise<CryptoKey> {
        const enc = new TextEncoder();
        const keyMaterial = await window.crypto.subtle.importKey(
            'raw',
            enc.encode(password),
            { name: 'PBKDF2' },
            false,
            ['deriveBits', 'deriveKey']
        );
        return window.crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: enc.encode(salt),
                iterations: 100000, // A standard number of iterations
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 }, // Using AES-GCM for authenticated encryption
            true,
            ['encrypt', 'decrypt']
        );
    },

    /**
     * Encrypts a string using AES-GCM.
     * @returns An object with the base64 encoded IV (Initialization Vector) and ciphertext.
     */
    async encrypt(data: string, key: CryptoKey): Promise<EncryptedData> {
        const enc = new TextEncoder();
        const iv = window.crypto.getRandomValues(new Uint8Array(12)); // IV for GCM should be 12 bytes
        const encodedData = enc.encode(data);

        const ciphertext = await window.crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: iv
            },
            key,
            encodedData
        );

        return {
            iv: ab_to_b64(iv),
            ciphertext: ab_to_b64(ciphertext)
        };
    },

    /**
     * Decrypts a string using AES-GCM.
     * @param encryptedData An object with base64 encoded IV and ciphertext.
     * @returns The decrypted string.
     */
    async decrypt(encryptedData: EncryptedData, key: CryptoKey): Promise<string> {
        const dec = new TextDecoder();
        const iv = b64_to_ab(encryptedData.iv);
        const ciphertext = b64_to_ab(encryptedData.ciphertext);

        const decrypted = await window.crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: iv
            },
            key,
            ciphertext
        );

        return dec.decode(decrypted);
    }
};

export default cryptoService;
