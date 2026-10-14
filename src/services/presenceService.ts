import { collection, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { UserPresence } from '../types';

const PRESENCE_LOCAL_CACHE = 'ML_ELECTRIC_PRESENCE_CACHE';

// Get cached presence list
export const getCachedPresenceList = (): UserPresence[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PRESENCE_LOCAL_CACHE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Error reading cached presence:', e);
  }
  return [];
};

// Save cached presence list
export const saveCachedPresenceList = (list: UserPresence[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PRESENCE_LOCAL_CACHE, JSON.stringify(list));
  } catch (e) {
    console.error('Error saving presence cache:', e);
  }
};

/**
 * Sends heartbeat to keep user presence alive.
 * Updates both Firestore collection and backend server API.
 */
export const sendPresenceHeartbeat = async (params: {
  userId: string;
  userName: string;
  role: 'admin' | 'manager' | 'branch_manager';
  branchId?: string;
  branchName?: string;
}): Promise<void> => {
  if (!params.userId) return;

  const nowIso = new Date().toISOString();
  let userAgent = 'ওয়েব ব্রাউজার';
  if (typeof navigator !== 'undefined') {
    const ua = navigator.userAgent;
    if (/Android/i.test(ua)) userAgent = 'অ্যান্ড্রয়েড ফোন';
    else if (/iPhone|iPad/i.test(ua)) userAgent = 'আইফোন / আইপ্যাড';
    else if (/Windows/i.test(ua)) userAgent = 'উইন্ডোজ পিসি';
    else if (/Macintosh/i.test(ua)) userAgent = 'ম্যাক কম্পিউটার';
  }

  const payload: UserPresence = {
    userId: params.userId,
    userName: params.userName,
    role: params.role,
    branchId: params.branchId || 'ml_electric_main',
    branchName: params.branchName || 'প্রধান শাখা',
    isOnline: true,
    lastActive: nowIso,
    deviceInfo: userAgent
  };

  // 1. Direct Firestore write
  try {
    const presenceRef = doc(db, 'user_presence', params.userId);
    await setDoc(presenceRef, payload, { merge: true });
  } catch (err) {
    // Non-blocking if Firestore network is busy
    // console.warn('Firestore presence heartbeat error:', err);
  }

  // 2. Server API fallback / sync
  try {
    await fetch('/api/presence/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    // Silent fail for network fluctuations
  }
};

/**
 * Marks user as explicitly offline on logout
 */
export const sendPresenceLogout = async (userId: string): Promise<void> => {
  if (!userId) return;
  const nowIso = new Date().toISOString();

  // 1. Update Firestore
  try {
    const presenceRef = doc(db, 'user_presence', userId);
    await setDoc(presenceRef, { isOnline: false, lastActive: nowIso }, { merge: true });
  } catch (e) {
    // ignore
  }

  // 2. Update Server API
  try {
    await fetch('/api/presence/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
  } catch (e) {
    // ignore
  }
};

/**
 * Calculates whether a presence record is actively online based on heartbeat timestamp
 */
export const isPresenceOnline = (presence: UserPresence | undefined | null): boolean => {
  if (!presence) return false;
  if (presence.isOnline === false) return false;
  if (!presence.lastActive) return false;
  const lastActiveTime = new Date(presence.lastActive).getTime();
  if (isNaN(lastActiveTime)) return false;
  // Consider online if heartbeat was within last 90 seconds
  return Date.now() - lastActiveTime < 90 * 1000;
};

/**
 * Subscribes to realtime presence updates via Firestore and periodic API polling fallback
 */
export const subscribeToPresence = (
  onUpdate: (presenceList: UserPresence[]) => void
): (() => void) => {
  let isSubscribed = true;
  let unsubscribeFirestore: (() => void) | null = null;
  let pollInterval: any = null;

  const handleIncomingList = (incoming: UserPresence[]) => {
    if (!isSubscribed) return;
    const evaluated = incoming.map(p => ({
      ...p,
      isOnline: isPresenceOnline(p)
    }));
    saveCachedPresenceList(evaluated);
    onUpdate(evaluated);
  };

  // 1. Initial cached state
  const cached = getCachedPresenceList();
  if (cached.length > 0) {
    handleIncomingList(cached);
  }

  // 2. Fetch from /api/presence immediately
  const fetchApiPresence = async () => {
    try {
      const res = await fetch('/api/presence');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.presence)) {
          handleIncomingList(json.presence);
        }
      }
    } catch (e) {
      // console.warn('API presence fetch error:', e);
    }
  };

  fetchApiPresence();

  // 3. Firestore onSnapshot real-time listener
  try {
    const collectionRef = collection(db, 'user_presence');
    unsubscribeFirestore = onSnapshot(
      collectionRef,
      (snapshot) => {
        const list: UserPresence[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as UserPresence;
          if (data && data.userId) {
            list.push(data);
          }
        });
        if (list.length > 0) {
          handleIncomingList(list);
        }
      },
      (err) => {
        console.warn('Firestore presence onSnapshot warning:', err);
      }
    );
  } catch (e) {
    console.warn('Could not attach Firestore presence listener:', e);
  }

  // 4. Fallback Polling every 15 seconds to ensure timestamps re-evaluate
  pollInterval = setInterval(() => {
    fetchApiPresence();
  }, 15000);

  // Return unsubscription cleanup
  return () => {
    isSubscribed = false;
    if (unsubscribeFirestore) {
      try {
        unsubscribeFirestore();
      } catch {}
    }
    if (pollInterval) {
      clearInterval(pollInterval);
    }
  };
};
