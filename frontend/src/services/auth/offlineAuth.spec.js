import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  hashPassword, 
  verifyPassword, 
  cacheUserForOffline, 
  authenticateOffline 
} from './offlineAuth';

vi.mock('@/pouchdb', () => ({
  getAll: vi.fn(),
  save: vi.fn()
}));

import { getAll, save } from '@/pouchdb';

describe('Offline Authentication Service', () => {
  let mockStorage = [];

  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage = [];

    getAll.mockImplementation(async (collection) => {
      if (collection === 'users') {
        return [...mockStorage];
      }
      return [];
    });

    save.mockImplementation(async (collection, doc) => {
      if (collection === 'users') {
        const index = mockStorage.findIndex(u => u._id === doc._id);
        if (index >= 0) {
          mockStorage[index] = doc;
        } else {
          mockStorage.push(doc);
        }
        return { ok: true, id: doc._id };
      }
      return { ok: true };
    });
  });

  describe('hashPassword & verifyPassword', () => {
    it('generates a 64-char hex hash and 32-char hex salt', async () => {
      const { hash, salt } = await hashPassword('mySecurePassword123');
      expect(hash).toHaveLength(64);
      expect(salt).toHaveLength(32);
    });

    it('generates unique salts for different calls with same password', async () => {
      const res1 = await hashPassword('samePassword');
      const res2 = await hashPassword('samePassword');
      expect(res1.salt).not.toBe(res2.salt);
      expect(res1.hash).not.toBe(res2.hash);
    });

    it('generates identical hash when provided with the same salt', async () => {
      const { hash, salt } = await hashPassword('password123');
      const secondRun = await hashPassword('password123', salt);
      expect(secondRun.hash).toBe(hash);
      expect(secondRun.salt).toBe(salt);
    });

    it('verifies correct password against salt and hash', async () => {
      const { hash, salt } = await hashPassword('correctPassword');
      const isValid = await verifyPassword('correctPassword', salt, hash);
      expect(isValid).toBe(true);
    });

    it('rejects incorrect password', async () => {
      const { hash, salt } = await hashPassword('correctPassword');
      const isValid = await verifyPassword('wrongPassword', salt, hash);
      expect(isValid).toBe(false);
    });
  });

  describe('cacheUserForOffline', () => {
    it('stores user with salt and passwordHash without exposing plaintext password', async () => {
      const user = { id: 10, username: 'cashier_bob', role: 'cashier' };
      const plainPassword = 'bobSecretPassword';

      const cachedProfile = await cacheUserForOffline(user, plainPassword, 'bob@metmma.com');

      expect(save).toHaveBeenCalledWith('users', expect.any(Object));
      expect(mockStorage).toHaveLength(1);

      const savedDoc = mockStorage[0];
      expect(savedDoc.id).toBe(10);
      expect(savedDoc.username).toBe('cashier_bob');
      expect(savedDoc.email).toBe('bob@metmma.com');
      expect(savedDoc.role).toBe('cashier');
      expect(savedDoc.salt).toBeDefined();
      expect(savedDoc.passwordHash).toBeDefined();

      // Ensure plaintext password is NOT stored anywhere in the saved document
      expect(savedDoc.password).toBeUndefined();
      expect(JSON.stringify(savedDoc)).not.toContain(plainPassword);

      // Returned profile also omits sensitive fields
      expect(cachedProfile.salt).toBeUndefined();
      expect(cachedProfile.passwordHash).toBeUndefined();
    });

    it('updates existing cached record rather than creating duplicates', async () => {
      const user = { id: 10, username: 'cashier_bob', role: 'cashier' };
      await cacheUserForOffline(user, 'firstPass', 'bob@metmma.com');
      expect(mockStorage).toHaveLength(1);

      await cacheUserForOffline(user, 'secondPass', 'bob@metmma.com');
      expect(mockStorage).toHaveLength(1);
    });
  });

  describe('authenticateOffline', () => {
    beforeEach(async () => {
      await cacheUserForOffline(
        { id: 42, username: 'pharm_alice', role: 'pharmacist' },
        'alicePass123',
        'alice@metmma.com'
      );
    });

    it('authenticates successfully by username with correct password', async () => {
      const session = await authenticateOffline('pharm_alice', 'alicePass123');
      expect(session).not.toBeNull();
      expect(session.id).toBe(42);
      expect(session.username).toBe('pharm_alice');
      expect(session.role).toBe('pharmacist');
    });

    it('authenticates successfully by email case-insensitively', async () => {
      const session = await authenticateOffline('ALICE@METMMA.COM', 'alicePass123');
      expect(session).not.toBeNull();
      expect(session.id).toBe(42);
    });

    it('fails authentication with incorrect password', async () => {
      const session = await authenticateOffline('pharm_alice', 'wrongPassword');
      expect(session).toBeNull();
    });

    it('fails authentication for non-existent user', async () => {
      const session = await authenticateOffline('non_existent', 'alicePass123');
      expect(session).toBeNull();
    });

    it('returns null when input is empty', async () => {
      expect(await authenticateOffline('', '')).toBeNull();
      expect(await authenticateOffline('alice', '')).toBeNull();
      expect(await authenticateOffline('', 'password')).toBeNull();
    });
  });
});
