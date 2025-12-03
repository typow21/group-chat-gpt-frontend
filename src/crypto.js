/**
 * End-to-end encryption utilities for chat messages.
 * Uses AES-GCM for symmetric encryption with per-room keys stored locally.
 */

const ENCRYPTION_ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for AES-GCM

// Prefix to identify encrypted messages
const ENCRYPTED_PREFIX = 'ENC:';

/**
 * Generate a new encryption key for a room
 */
export async function generateRoomKey() {
    const key = await window.crypto.subtle.generateKey(
        { name: ENCRYPTION_ALGORITHM, length: KEY_LENGTH },
        true, // extractable
        ['encrypt', 'decrypt']
    );
    return key;
}

/**
 * Export a CryptoKey to a base64 string for storage
 */
export async function exportKey(key) {
    const exported = await window.crypto.subtle.exportKey('raw', key);
    return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

/**
 * Import a base64 string back to a CryptoKey
 */
export async function importKey(base64Key) {
    const keyData = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0));
    return window.crypto.subtle.importKey(
        'raw',
        keyData,
        { name: ENCRYPTION_ALGORITHM, length: KEY_LENGTH },
        true,
        ['encrypt', 'decrypt']
    );
}

/**
 * Get or create encryption key for a room
 */
export async function getRoomKey(roomId) {
    const storageKey = `room_key_${roomId}`;
    let storedKey = localStorage.getItem(storageKey);
    
    if (storedKey) {
        try {
            return await importKey(storedKey);
        } catch (e) {
            console.warn('Failed to import stored key, generating new one');
        }
    }
    
    // Generate new key for this room
    const newKey = await generateRoomKey();
    const exported = await exportKey(newKey);
    localStorage.setItem(storageKey, exported);
    return newKey;
}

/**
 * Encrypt a message for a room
 */
export async function encryptMessage(roomId, plaintext) {
    try {
        const key = await getRoomKey(roomId);
        const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
        const encoder = new TextEncoder();
        const data = encoder.encode(plaintext);
        
        const ciphertext = await window.crypto.subtle.encrypt(
            { name: ENCRYPTION_ALGORITHM, iv },
            key,
            data
        );
        
        // Combine IV + ciphertext and encode as base64
        const combined = new Uint8Array(iv.length + ciphertext.byteLength);
        combined.set(iv);
        combined.set(new Uint8Array(ciphertext), iv.length);
        
        return ENCRYPTED_PREFIX + btoa(String.fromCharCode(...combined));
    } catch (error) {
        console.error('Encryption failed:', error);
        // Fall back to plaintext if encryption fails
        return plaintext;
    }
}

/**
 * Decrypt a message from a room
 */
export async function decryptMessage(roomId, encryptedData) {
    // Check if message is encrypted
    if (!encryptedData || !encryptedData.startsWith(ENCRYPTED_PREFIX)) {
        return encryptedData; // Return as-is if not encrypted
    }
    
    try {
        const key = await getRoomKey(roomId);
        const base64Data = encryptedData.slice(ENCRYPTED_PREFIX.length);
        const combined = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        
        const iv = combined.slice(0, IV_LENGTH);
        const ciphertext = combined.slice(IV_LENGTH);
        
        const decrypted = await window.crypto.subtle.decrypt(
            { name: ENCRYPTION_ALGORITHM, iv },
            key,
            ciphertext
        );
        
        const decoder = new TextDecoder();
        return decoder.decode(decrypted);
    } catch (error) {
        console.error('Decryption failed:', error);
        return '[Unable to decrypt message]';
    }
}

/**
 * Decrypt an array of messages
 */
export async function decryptMessages(roomId, messages) {
    if (!messages || !Array.isArray(messages)) return messages;
    
    return Promise.all(
        messages.map(async (msg) => {
            if (msg && msg.content) {
                const decryptedContent = await decryptMessage(roomId, msg.content);
                return { ...msg, content: decryptedContent };
            }
            return msg;
        })
    );
}

/**
 * Check if encryption is supported in this browser
 */
export function isEncryptionSupported() {
    return !!(window.crypto && window.crypto.subtle);
}

/**
 * Get the exportable key for sharing with other room members
 * (For future key exchange feature)
 */
export async function getShareableRoomKey(roomId) {
    const key = await getRoomKey(roomId);
    return exportKey(key);
}

/**
 * Import a shared room key from another user
 * (For future key exchange feature)
 */
export async function importSharedRoomKey(roomId, base64Key) {
    const storageKey = `room_key_${roomId}`;
    localStorage.setItem(storageKey, base64Key);
    return importKey(base64Key);
}

/**
 * Share room key with the backend server for AI decryption
 */
export async function shareRoomKeyWithServer(roomId, apiEndpoint) {
    try {
        const base64Key = await getShareableRoomKey(roomId);
        const response = await fetch(`${apiEndpoint}/room-key`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                roomId: roomId,
                key: base64Key
            })
        });
        return response.ok;
    } catch (error) {
        console.error('Failed to share room key with server:', error);
        return false;
    }
}
