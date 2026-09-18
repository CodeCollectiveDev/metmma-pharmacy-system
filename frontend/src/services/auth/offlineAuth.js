/**
 * Offline Authentication Service
 * 
 * Provides secure client-side authentication capabilities during network outages.
 * Uses standard Web Crypto API (PBKDF2 with SHA-256 and unique cryptographic salts)
 * to avoid storing plaintext passwords in client-side storage (CWE-256).
 */
import { getAll, save } from '@/pouchdb';

/**
 * Convert a Uint8Array or byte array into a hex string
 */
function bytesToHex(bytes) {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert a hex string into a Uint8Array
 */
function hexToBytes(hex) {
  if (hex.length % 2 !== 0) {
    throw new Error('Invalid hex string');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Hash a password using PBKDF2 with SHA-256 and 100,000 iterations.
 * Generates a random 16-byte salt if none is provided.
 *
 * @param {string} password - The plaintext password to hash
 * @param {string|null} [saltHex=null] - Optional hex-encoded salt for verification
 * @returns {Promise<{hash: string, salt: string}>}
 */
export async function hashPassword(password, saltHex = null) {
  const cryptoObj = globalThis.crypto;
  if (!cryptoObj?.subtle) {
    throw new Error('Web Crypto API is not supported in this environment');
  }

  const enc = new TextEncoder();
  const saltBytes = saltHex 
    ? hexToBytes(saltHex) 
    : cryptoObj.getRandomValues(new Uint8Array(16));

  const keyMaterial = await cryptoObj.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await cryptoObj.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );

  return {
    hash: bytesToHex(new Uint8Array(derivedBits)),
    salt: bytesToHex(saltBytes)
  };
}

/**
 * Verify a candidate password against a stored PBKDF2 hash and salt.
 * Performs constant-time comparison to prevent timing attacks.
 *
 * @param {string} password - The password candidate
 * @param {string} saltHex - The hex-encoded salt
 * @param {string} expectedHashHex - The expected hex-encoded hash
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(password, saltHex, expectedHashHex) {
  if (!password || !saltHex || !expectedHashHex) {
    return false;
  }

  try {
    const { hash } = await hashPassword(password, saltHex);
    if (hash.length !== expectedHashHex.length) {
      return false;
    }

    let diff = 0;
    for (let i = 0; i < hash.length; i++) {
      diff |= hash.charCodeAt(i) ^ expectedHashHex.charCodeAt(i);
    }
    return diff === 0;
  } catch (error) {
    console.error('[OfflineAuth] Verification error:', error);
    return false;
  }
}

/**
 * Cache an authenticated user profile and salted password hash for emergency offline login.
 * Called automatically upon successful online authentication.
 * Never stores the plaintext password.
 *
 * @param {Object} user - User object returned by the backend ({ id, username, role })
 * @param {string} plainPassword - Plaintext password used during online login
 * @param {string} [email=''] - Email or login identifier entered by the user
 * @returns {Promise<Object>} The stored user document (without plaintext password)
 */
export async function cacheUserForOffline(user, plainPassword, email = '') {
  if (!user || !plainPassword) {
    return null;
  }

  try {
    const { hash, salt } = await hashPassword(plainPassword);
    const userId = user.id || user._id || `gen_${Date.now()}`;
    const username = (user.username || user.name || '').trim();
    const normalizedEmail = (email || user.email || '').toLowerCase().trim();
    const normalizedRole = (user.role || '').toLowerCase().trim();

    // Check if user already exists in local cache to preserve or reuse document ID
    const existingUsers = await getAll('users');
    const existing = existingUsers.find(u => 
      (u.id && String(u.id) === String(userId)) ||
      (u.username && u.username.toLowerCase() === username.toLowerCase()) ||
      (normalizedEmail && u.email && u.email.toLowerCase() === normalizedEmail)
    );

    const docId = existing ? existing._id : `user_${userId}`;

    const userDoc = {
      _id: docId,
      id: userId,
      username: username,
      email: normalizedEmail,
      role: normalizedRole,
      salt: salt,
      passwordHash: hash,
      updatedAt: new Date().toISOString()
    };

    await save('users', userDoc);
    return {
      _id: userDoc._id,
      id: userDoc.id,
      username: userDoc.username,
      email: userDoc.email,
      role: userDoc.role
    };
  } catch (error) {
    console.error('[OfflineAuth] Error caching user for offline access:', error);
    return null;
  }
}

/**
 * Attempt to authenticate a user offline using locally cached salted credentials.
 * Used when backend connectivity is unavailable.
 *
 * @param {string} identifier - Username or email entered by user
 * @param {string} plainPassword - Password entered by user
 * @returns {Promise<Object|null>} User session profile if valid, or null if authentication fails
 */
export async function authenticateOffline(identifier, plainPassword) {
  if (!identifier || !plainPassword) {
    return null;
  }

  try {
    const cleanIdentifier = identifier.toLowerCase().trim();
    const users = await getAll('users');

    const matchedUser = users.find(u => 
      (u.username && u.username.toLowerCase().trim() === cleanIdentifier) ||
      (u.email && u.email.toLowerCase().trim() === cleanIdentifier)
    );

    if (!matchedUser || !matchedUser.salt || !matchedUser.passwordHash) {
      return null;
    }

    const isValid = await verifyPassword(plainPassword, matchedUser.salt, matchedUser.passwordHash);
    if (!isValid) {
      return null;
    }

    return {
      id: matchedUser.id || matchedUser._id,
      _id: matchedUser._id,
      username: matchedUser.username,
      name: matchedUser.username,
      email: matchedUser.email,
      role: matchedUser.role
    };
  } catch (error) {
    console.error('[OfflineAuth] Error during offline authentication:', error);
    return null;
  }
}
