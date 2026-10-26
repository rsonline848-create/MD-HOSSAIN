import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { AppLicense } from '../types';

export const DEFAULT_LICENSE: AppLicense = {
  licenseKey: 'LIFETIME-UNLOCKED',
  shopName: 'বিসমিল্লাহ ট্রেডার্স (Bismillah Traders)',
  clientPhone: '01611814813',
  providerName: 'RS ONLINE',
  supportPhone: '01611814813',
  status: 'active',
  planName: 'আজীবন আনলিমিটেড (Lifetime)',
  activatedAt: new Date().toISOString(),
  expiresAt: '2099-12-31T23:59:59.000Z',
  maxBranches: 999,
  notes: 'লাইসেন্স সিস্টেম স্থায়ীভাবে বন্ধ ও সফটওয়্যার সম্পূর্ণ আনলক করা হয়েছে'
};

const LOCAL_STORAGE_KEY = 'ML_ELECTRIC_CLOUD_LICENSE';

// Get cached license from localStorage or fallback to DEFAULT_LICENSE
export const getCachedLicense = (): AppLicense => {
  if (typeof window === 'undefined') return DEFAULT_LICENSE;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.licenseKey && parsed.status) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading cached license:', e);
  }
  return DEFAULT_LICENSE;
};

// Save license to localStorage cache
export const saveCachedLicense = (license: AppLicense) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(license));
  } catch (e) {
    console.error('Error saving cached license:', e);
  }
};

// Helper: License system permanently disabled (always valid, never expired)
export const getLicenseStatusDetails = (_license?: AppLicense) => {
  return {
    isValid: true,
    isExpired: false,
    isSuspended: false,
    daysLeft: 99999,
    diffMs: 999999999999
  };
};

// Listen to realtime cloud license changes from Firestore
export const subscribeToCloudLicense = (
  onUpdate: (license: AppLicense) => void
): (() => void) => {
  const docRef = doc(db, 'system_license', 'app_license');

  const unsubscribe = onSnapshot(
    docRef,
    async (snap) => {
      if (snap.exists()) {
        const cloudLicense = snap.data() as AppLicense;
        saveCachedLicense(cloudLicense);
        onUpdate(cloudLicense);
      } else {
        // Document not found in Firestore yet, try seeding with default
        try {
          await setDoc(docRef, DEFAULT_LICENSE);
          saveCachedLicense(DEFAULT_LICENSE);
          onUpdate(DEFAULT_LICENSE);
        } catch (e) {
          console.warn('Could not auto-seed cloud license, using cached:', e);
          onUpdate(getCachedLicense());
        }
      }
    },
    async (err) => {
      console.warn('Firestore license onSnapshot error, falling back to API:', err);
      // Fallback: Check /api/license
      try {
        const res = await fetch('/api/license');
        if (res.ok) {
          const json = await res.json();
          if (json.license) {
            saveCachedLicense(json.license);
            onUpdate(json.license);
            return;
          }
        }
      } catch (apiErr) {
        console.warn('API license fetch fallback error:', apiErr);
      }
      onUpdate(getCachedLicense());
    }
  );

  return unsubscribe;
};

// Push updated license to Firestore & API backend
export const updateCloudLicense = async (license: AppLicense): Promise<void> => {
  const updated: AppLicense = {
    ...license,
    lastCheckedAt: new Date().toISOString()
  };

  // 1. Update Firestore
  try {
    const docRef = doc(db, 'system_license', 'app_license');
    await setDoc(docRef, updated, { merge: true });
    // Also save in license keys collection for validation tracking
    if (updated.licenseKey) {
      const keyRef = doc(db, 'licenses', updated.licenseKey.trim().toUpperCase());
      await setDoc(keyRef, updated, { merge: true });
    }
  } catch (e) {
    console.error('Firestore license save error:', e);
  }

  // 2. Update server.ts DB as redundant backup
  try {
    await fetch('/api/license', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ license: updated })
    });
  } catch (e) {
    console.error('API license save error:', e);
  }

  // 3. Update localStorage
  saveCachedLicense(updated);
};

// Activate a license key: check Firestore or recognize standard signed patterns
export const verifyAndActivateLicenseKey = async (
  rawKey: string,
  currentLicense: AppLicense
): Promise<{ success: boolean; message: string; newLicense?: AppLicense }> => {
  const key = rawKey.trim().toUpperCase();
  if (!key) {
    return { success: false, message: 'অনুগ্রহ করে লাইসেন্স কি প্রবেশ করান।' };
  }

  try {
    // 1. Check if specific key exists in Firestore `/licenses/{key}`
    const keyRef = doc(db, 'licenses', key);
    const snap = await getDoc(keyRef);
    if (snap.exists()) {
      const cloudData = snap.data() as AppLicense;
      const updated: AppLicense = {
        ...currentLicense,
        ...cloudData,
        licenseKey: key,
        status: 'active',
        lastCheckedAt: new Date().toISOString()
      };
      await updateCloudLicense(updated);
      return { success: true, message: 'লাইসেন্স সফলভাবে ক্লাউডে সক্রিয় হয়েছে!', newLicense: updated };
    }
  } catch (e) {
    console.warn('Firestore key lookup error, checking offline algorithm:', e);
  }

  // 2. Algorithm check for RS ONLINE generated keys:
  // Pattern: RS-MLE-(YEAR)-(RANDOM) or RS-LIFE-(RANDOM)
  if (key.startsWith('RS-LIFE-') || key.startsWith('RS-MLE-LIFE')) {
    const lifetimeExpiry = new Date();
    lifetimeExpiry.setFullYear(lifetimeExpiry.getFullYear() + 20); // 20 years lifetime
    const updated: AppLicense = {
      ...currentLicense,
      licenseKey: key,
      status: 'active',
      planName: 'আজীবন লাইসেন্স (Lifetime Plan)',
      expiresAt: lifetimeExpiry.toISOString(),
      lastCheckedAt: new Date().toISOString()
    };
    await updateCloudLicense(updated);
    return { success: true, message: 'আজীবন (Lifetime) লাইসেন্স সক্রিয় হয়েছে!', newLicense: updated };
  }

  if (key.startsWith('RS-MLE-') && key.length >= 14) {
    // 1 Year renewal key format
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const updated: AppLicense = {
      ...currentLicense,
      licenseKey: key,
      status: 'active',
      planName: '১ বছর মেয়াদী (Annual Plan)',
      expiresAt: nextYear.toISOString(),
      lastCheckedAt: new Date().toISOString()
    };
    await updateCloudLicense(updated);
    return { success: true, message: '১ বছরের লাইসেন্স সফলভাবে সক্রিয় হয়েছে!', newLicense: updated };
  }

  if (key === '102267' || key === 'ADMIN-UNLOCK') {
    // Emergency master unlock key
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const updated: AppLicense = {
      ...currentLicense,
      status: 'active',
      expiresAt: nextYear.toISOString(),
      lastCheckedAt: new Date().toISOString()
    };
    await updateCloudLicense(updated);
    return { success: true, message: 'মাস্টার আনলক সফল! ১ বছরের জন্য মেয়াদ বৃদ্ধি করা হয়েছে।', newLicense: updated };
  }

  return { success: false, message: 'অকার্যকর লাইসেন্স কি! সঠিক কি দিয়ে পুনরায় চেষ্টা করুন অথবা RS ONLINE এর সাথে যোগাযোগ করুন।' };
};

// Key Generator for Provider / Admin
export const generateNewLicenseKey = (type: 'annual' | 'lifetime' | 'monthly' = 'annual'): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const year = new Date().getFullYear();
  if (type === 'lifetime') {
    return `RS-LIFE-${year}-${rand}`;
  }
  if (type === 'monthly') {
    return `RS-MLE-M${new Date().getMonth() + 1}-${rand}`;
  }
  return `RS-MLE-${year}-${rand}`;
};
