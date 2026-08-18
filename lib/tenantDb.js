/**
 * tenantDb.js
 * Multi-Tenant Firebase Firestore Database & Offline Persistence Layer
 * for ChănNuôi AI App (AI Riser Vietnam 2026).
 *
 * Core Features:
 * 1. Strict Tenant Isolation (Sub-collections per farm: farms/{farmId}/...)
 * 2. Financial Summary Aggregations with Firestore increment() to save 99% Read Quota
 * 3. Magic Link Zalo Share Token Generator for Family Viewers
 * 4. Clean Slate by Default (0 mock data on newly created farms)
 * 5. Offline Persistent Storage with automatic LocalStorage Fallback
 */

import { 
  db, 
  serverTimestamp, 
  increment,
  doc, 
  collection, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  limit, 
  onSnapshot 
} from './firebase';

export const DEFAULT_GUEST_FARM_ID = 'farm_guest_local';

// Local storage keys for offline fallback
const LOCAL_STORAGE_PREFIX = 'channuoi_ai_tenant_';

/**
 * Generate a unique ID with prefix
 */
export function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

/**
 * Helper: Save to local fallback cache
 */
function saveLocalCache(key, data) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${key}`, JSON.stringify(data));
  } catch (e) {
    console.warn('LocalStorage save failed:', e);
  }
}

/**
 * Helper: Read from local fallback cache
 */
function readLocalCache(key, defaultValue = null) {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${key}`);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch (e) {
    console.warn('LocalStorage read failed:', e);
    return defaultValue;
  }
}

/* ==========================================================================
   1. FARM / TENANT PROFILE MANAGEMENT
   ========================================================================== */

/**
 * Create a new Farm (Clean Slate — 0 data)
 */
export async function createFarm(farmData) {
  const farmId = farmData.farmId || generateId('farm');
  const nowIso = new Date().toISOString();

  const newFarm = {
    farmId,
    farmName: farmData.farmName || 'Trang Trại Chăn Nuôi Mới',
    ownerName: farmData.ownerName || 'Chủ Hộ',
    phone: farmData.phone || '',
    email: farmData.email || '',
    location: farmData.location || 'Việt Nam',
    authProvider: farmData.authProvider || 'PHONE',
    totalFlockCount: 0,
    financialSummary: {
      totalExpense: 0,
      totalRevenue: 0,
      totalMortality: 0,
      netProfit: 0,
      lastUpdated: nowIso
    },
    shareToken: generateId('magic_token'),
    tokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    members: [
      {
        userId: farmData.userId || farmData.phone || 'owner',
        name: farmData.ownerName || 'Chủ Hộ',
        role: 'OWNER',
        joinedAt: nowIso
      }
    ],
    createdAt: nowIso
  };

  // 1. Save to Local Cache immediately
  saveLocalCache(`farm_${farmId}`, newFarm);

  // Update registered farms list locally
  const registeredFarms = readLocalCache('registered_farms', []);
  if (!registeredFarms.find(f => f.farmId === farmId)) {
    registeredFarms.push({
      farmId,
      farmName: newFarm.farmName,
      ownerName: newFarm.ownerName,
      phone: newFarm.phone
    });
    saveLocalCache('registered_farms', registeredFarms);
  }

  // 2. Try persisting to Firestore if available
  try {
    if (db) {
      const farmRef = doc(db, 'farms', farmId);
      await setDoc(farmRef, {
        ...newFarm,
        serverCreatedAt: serverTimestamp()
      }, { merge: true });
    }
  } catch (err) {
    console.warn('Firestore createFarm offline fallback:', err.message);
  }

  return newFarm;
}

/**
 * Get registered farms for switching
 */
export async function getRegisteredFarms() {
  const localList = readLocalCache('registered_farms', []);
  return localList;
}

/**
 * Get farm by ID
 */
export async function getFarm(farmId = DEFAULT_GUEST_FARM_ID) {
  const cached = readLocalCache(`farm_${farmId}`, null);
  if (cached) return cached;

  try {
    if (db) {
      const farmRef = doc(db, 'farms', farmId);
      const snapshot = await getDoc(farmRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        saveLocalCache(`farm_${farmId}`, data);
        return data;
      }
    }
  } catch (err) {
    console.warn('Firestore getFarm fallback:', err.message);
  }

  // If not found, create clean guest farm
  if (farmId === DEFAULT_GUEST_FARM_ID) {
    return await createFarm({
      farmId: DEFAULT_GUEST_FARM_ID,
      farmName: 'Trại Gà Gia Đình (Chế độ Khách)',
      ownerName: 'Chủ Hộ Mới',
      authProvider: 'GUEST'
    });
  }

  return null;
}

/**
 * Generate a new Share Magic Link for Zalo/SMS
 */
export async function generateShareMagicLink(farmId) {
  const shareToken = generateId('magic_token');
  const tokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const farm = await getFarm(farmId);
  if (farm) {
    farm.shareToken = shareToken;
    farm.tokenExpiresAt = tokenExpiresAt;
    saveLocalCache(`farm_${farmId}`, farm);

    try {
      if (db) {
        const farmRef = doc(db, 'farms', farmId);
        await updateDoc(farmRef, { shareToken, tokenExpiresAt });
      }
    } catch (e) {
      console.warn('Firestore update shareToken error:', e.message);
    }
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  return `${origin}?magic_share=${shareToken}&farm=${farmId}`;
}

/* ==========================================================================
   2. HEALTH LOGS & FINANCIAL TRANSACTIONS (AGGREGATED & READ-SAVING)
   ========================================================================== */

/**
 * Add a new Health/Financial Log with Atomic Financial Aggregation
 */
export async function addHealthLog(farmId, logData) {
  const logId = logData.logId || generateId('log');
  const nowIso = new Date().toISOString();

  const newLog = {
    logId,
    farmId,
    flockId: logData.flockId || 'general',
    date: logData.date || new Date().toISOString().split('T')[0],
    logType: logData.logType || (logData.amount ? 'EXPENSE' : 'NOTE'), // EXPENSE | REVENUE | NOTE
    category: logData.category || 'CÁM_GÀ',
    amount: Number(logData.amount) || 0,
    mortalityCount: Number(logData.mortalityCount) || 0,
    notes: logData.notes || '',
    createdVia: logData.createdVia || 'MANUAL',
    createdBy: logData.createdBy || 'Chủ Hộ',
    createdAt: nowIso
  };

  // 1. Update Local Cache
  const localLogs = readLocalCache(`logs_${farmId}`, []);
  localLogs.unshift(newLog);
  saveLocalCache(`logs_${farmId}`, localLogs);

  // 2. Update Local Financial Summary
  const farm = await getFarm(farmId);
  if (farm) {
    const prevSummary = farm.financialSummary || { totalExpense: 0, totalRevenue: 0, totalMortality: 0, netProfit: 0 };
    let newExpense = prevSummary.totalExpense || 0;
    let newRevenue = prevSummary.totalRevenue || 0;
    let newMortality = prevSummary.totalMortality || 0;

    if (newLog.logType === 'EXPENSE') {
      newExpense += newLog.amount;
    } else if (newLog.logType === 'REVENUE') {
      newRevenue += newLog.amount;
    }
    newMortality += newLog.mortalityCount;

    farm.financialSummary = {
      totalExpense: newExpense,
      totalRevenue: newRevenue,
      totalMortality: newMortality,
      netProfit: newRevenue - newExpense,
      lastUpdated: nowIso
    };
    saveLocalCache(`farm_${farmId}`, farm);
  }

  // 3. Persist to Firestore with atomic increment
  try {
    if (db) {
      const logRef = doc(db, 'farms', farmId, 'health_logs', logId);
      await setDoc(logRef, {
        ...newLog,
        serverCreatedAt: serverTimestamp()
      });

      // Update aggregate fields atomically
      const farmRef = doc(db, 'farms', farmId);
      const updates = {};
      if (newLog.logType === 'EXPENSE' && newLog.amount > 0) {
        updates['financialSummary.totalExpense'] = increment(newLog.amount);
        updates['financialSummary.netProfit'] = increment(-newLog.amount);
      } else if (newLog.logType === 'REVENUE' && newLog.amount > 0) {
        updates['financialSummary.totalRevenue'] = increment(newLog.amount);
        updates['financialSummary.netProfit'] = increment(newLog.amount);
      }
      if (newLog.mortalityCount > 0) {
        updates['financialSummary.totalMortality'] = increment(newLog.mortalityCount);
      }

      if (Object.keys(updates).length > 0) {
        await updateDoc(farmRef, updates);
      }
    }
  } catch (err) {
    console.warn('Firestore addHealthLog fallback:', err.message);
  }

  return newLog;
}

/**
 * Subscribe to Health Logs realtime updates
 */
export function subscribeHealthLogs(farmId, callback, limitCount = 50) {
  // Return local cache immediately
  const localLogs = readLocalCache(`logs_${farmId}`, []);
  callback(localLogs);

  let unsubscribe = () => {};

  try {
    if (db && typeof window !== 'undefined') {
      const logsRef = collection(db, 'farms', farmId, 'health_logs');
      const q = query(logsRef, orderBy('createdAt', 'desc'), limit(limitCount));

      unsubscribe = onSnapshot(q, (snapshot) => {
        const logs = [];
        snapshot.forEach((d) => logs.push(d.data()));
        if (logs.length > 0) {
          saveLocalCache(`logs_${farmId}`, logs);
          callback(logs);
        }
      }, (err) => {
        console.warn('Firestore logs snapshot fallback to cache:', err.message);
      });
    }
  } catch (err) {
    console.warn('subscribeHealthLogs error:', err.message);
  }

  return unsubscribe;
}

/* ==========================================================================
   3. VACCINE SCHEDULES
   ========================================================================== */

/**
 * Subscribe to Vaccine Schedules realtime updates
 */
export function subscribeVaccineSchedules(farmId, callback) {
  const localSchedules = readLocalCache(`vaccines_${farmId}`, []);
  callback(localSchedules);

  let unsubscribe = () => {};

  try {
    if (db && typeof window !== 'undefined') {
      const vacRef = collection(db, 'farms', farmId, 'vaccine_schedules');
      const q = query(vacRef, orderBy('dayAge', 'asc'));

      unsubscribe = onSnapshot(q, (snapshot) => {
        const schedules = [];
        snapshot.forEach((d) => schedules.push(d.data()));
        if (schedules.length > 0) {
          saveLocalCache(`vaccines_${farmId}`, schedules);
          callback(schedules);
        }
      }, (err) => {
        console.warn('Firestore vaccine snapshot fallback to cache:', err.message);
      });
    }
  } catch (err) {
    console.warn('subscribeVaccineSchedules error:', err.message);
  }

  return unsubscribe;
}

/**
 * Toggle vaccine completion status
 */
export async function toggleVaccineStatus(farmId, scheduleId, isCompleted) {
  const nowIso = new Date().toISOString();

  // 1. Update Local Cache
  const schedules = readLocalCache(`vaccines_${farmId}`, []);
  const idx = schedules.findIndex(s => s.scheduleId === scheduleId);
  if (idx !== -1) {
    schedules[idx].isCompleted = isCompleted;
    schedules[idx].completedAt = isCompleted ? nowIso : null;
    saveLocalCache(`vaccines_${farmId}`, schedules);
  }

  // 2. Persist to Firestore
  try {
    if (db) {
      const scheduleRef = doc(db, 'farms', farmId, 'vaccine_schedules', scheduleId);
      await updateDoc(scheduleRef, {
        isCompleted,
        completedAt: isCompleted ? serverTimestamp() : null
      });
    }
  } catch (err) {
    console.warn('Firestore toggleVaccineStatus fallback:', err.message);
  }
}

/**
 * Initialize / Save customized vaccine schedules for a new flock
 */
export async function saveVaccineSchedules(farmId, schedulesList) {
  saveLocalCache(`vaccines_${farmId}`, schedulesList);

  try {
    if (db) {
      for (const item of schedulesList) {
        const itemRef = doc(db, 'farms', farmId, 'vaccine_schedules', item.scheduleId);
        await setDoc(itemRef, {
          ...item,
          serverUpdatedAt: serverTimestamp()
        }, { merge: true });
      }
    }
  } catch (err) {
    console.warn('Firestore saveVaccineSchedules fallback:', err.message);
  }
}

/* ==========================================================================
   4. VISION DIAGNOSES HISTORY (LIGHTWEIGHT NO-BASE64 METADATA)
   ========================================================================== */

/**
 * Save Vision Diagnosis without storing raw large Base64 (saving document quota)
 */
export async function saveVisionDiagnosis(farmId, diagnosisResult) {
  const diagnosisId = diagnosisResult.diagnosisId || generateId('diag');
  const nowIso = new Date().toISOString();

  // Store lightweight metadata (clean, no raw 1MB base64 images in Firestore)
  const entry = {
    diagnosisId,
    farmId,
    analysis_status: diagnosisResult.analysis_status || 'DIAGNOSED',
    primary_suspicion: diagnosisResult.primary_suspicion || 'Chưa xác định',
    urgency_level: diagnosisResult.urgency_level || 'TRUNG BÌNH',
    images_analyzed: diagnosisResult.images_analyzed || 1,
    biosafety_actions: diagnosisResult.biosafety_actions || [],
    differential_diagnosis: diagnosisResult.differential_diagnosis || [],
    createdAt: nowIso
  };

  // 1. Update Local Cache
  const localHistory = readLocalCache(`vision_history_${farmId}`, []);
  localHistory.unshift(entry);
  saveLocalCache(`vision_history_${farmId}`, localHistory);

  // 2. Persist to Firestore
  try {
    if (db) {
      const diagRef = doc(db, 'farms', farmId, 'vision_diagnoses', diagnosisId);
      await setDoc(diagRef, {
        ...entry,
        serverCreatedAt: serverTimestamp()
      });
    }
  } catch (err) {
    console.warn('Firestore saveVisionDiagnosis fallback:', err.message);
  }

  return entry;
}

/**
 * Subscribe to Vision History
 */
export function subscribeVisionHistory(farmId, callback) {
  const localHistory = readLocalCache(`vision_history_${farmId}`, []);
  callback(localHistory);

  let unsubscribe = () => {};

  try {
    if (db && typeof window !== 'undefined') {
      const visionRef = collection(db, 'farms', farmId, 'vision_diagnoses');
      const q = query(visionRef, orderBy('createdAt', 'desc'), limit(20));

      unsubscribe = onSnapshot(q, (snapshot) => {
        const history = [];
        snapshot.forEach((d) => history.push(d.data()));
        if (history.length > 0) {
          saveLocalCache(`vision_history_${farmId}`, history);
          callback(history);
        }
      }, (err) => {
        console.warn('Firestore vision history snapshot fallback to cache:', err.message);
      });
    }
  } catch (err) {
    console.warn('subscribeVisionHistory error:', err.message);
  }

  return unsubscribe;
}
