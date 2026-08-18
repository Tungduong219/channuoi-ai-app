import {
  db,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  increment,
  serverTimestamp
} from './firebase';

const LOCAL_STORAGE_PREFIX = 'channuoi_ai_v2_';
export const DEFAULT_GUEST_FARM_ID = 'guest_farm_default';

// Helper: Generate clean unique IDs
function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// Helper: Save to local fallback cache
function saveLocalCache(key, data) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${key}`, JSON.stringify(data));
  } catch (e) {
    console.warn('LocalStorage save failed:', e);
  }
}

// Helper: Read from local fallback cache
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
    tokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
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

  saveLocalCache(`farm_${farmId}`, newFarm);

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

  // Non-blocking Firestore save
  try {
    if (db) {
      const farmRef = doc(db, 'farms', farmId);
      setDoc(farmRef, { ...newFarm, serverCreatedAt: serverTimestamp() }, { merge: true }).catch(err => {
        console.warn('Firestore createFarm async error:', err.message);
      });
    }
  } catch (err) {
    console.warn('Firestore createFarm fallback:', err.message);
  }

  return newFarm;
}

export async function getRegisteredFarms() {
  return readLocalCache('registered_farms', []);
}

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

  if (farmId === DEFAULT_GUEST_FARM_ID) {
    return await createFarm({
      farmId: DEFAULT_GUEST_FARM_ID,
      farmName: 'Trại Gà Gia Đình',
      ownerName: 'Chủ Hộ Mới',
      authProvider: 'GUEST'
    });
  }

  return null;
}

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
        updateDoc(farmRef, { shareToken, tokenExpiresAt }).catch(() => {});
      }
    } catch (e) {}
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  return `${origin}?magic_share=${shareToken}&farm=${farmId}`;
}

/* ==========================================================================
   2. MULTI-FLOCK (ĐÀN GÀ & CHUỒNG NUÔI) MANAGEMENT
   ========================================================================== */

/**
 * Create a new flock for a farm
 */
export async function createFlock(farmId, flockData) {
  const flockId = flockData.flockId || generateId('flock');
  const nowIso = new Date().toISOString();

  const newFlock = {
    flockId,
    farmId,
    flockName: flockData.flockName || 'Chuồng Nuôi Mới',
    breed: flockData.breed || 'Gà Ri',
    initialCount: Number(flockData.initialCount) || 1000,
    currentCount: Number(flockData.currentCount || flockData.initialCount) || 1000,
    startDate: flockData.startDate || new Date().toISOString().split('T')[0],
    purpose: flockData.purpose || 'Nuôi lấy thịt',
    coopLocation: flockData.coopLocation || 'Chuồng 1',
    status: flockData.status || 'ACTIVE', // ACTIVE | COMPLETED
    financialSummary: {
      totalExpense: 0,
      totalRevenue: 0,
      netProfit: 0,
      lastUpdated: nowIso
    },
    createdAt: nowIso
  };

  // 1. Update Local Cache
  const localFlocks = readLocalCache(`flocks_${farmId}`, []);
  localFlocks.push(newFlock);
  saveLocalCache(`flocks_${farmId}`, localFlocks);

  // Update totalFlockCount in farm
  const farm = await getFarm(farmId);
  if (farm) {
    farm.totalFlockCount = localFlocks.length;
    saveLocalCache(`farm_${farmId}`, farm);
  }

  // 2. Persist to Firestore asynchronously
  try {
    if (db) {
      const flockRef = doc(db, 'farms', farmId, 'flocks', flockId);
      setDoc(flockRef, { ...newFlock, serverCreatedAt: serverTimestamp() }).catch(err => {
        console.warn('Firestore createFlock async error:', err.message);
      });

      const farmRef = doc(db, 'farms', farmId);
      updateDoc(farmRef, { totalFlockCount: increment(1) }).catch(() => {});
    }
  } catch (err) {
    console.warn('Firestore createFlock error:', err.message);
  }

  return newFlock;
}

/**
 * Get all flocks of a farm
 */
export async function getFlocks(farmId) {
  return readLocalCache(`flocks_${farmId}`, []);
}

/**
 * Subscribe to realtime flocks updates
 */
export function subscribeFlocks(farmId, callback) {
  const localFlocks = readLocalCache(`flocks_${farmId}`, []);
  callback(localFlocks);

  let unsubscribe = () => {};

  try {
    if (db && typeof window !== 'undefined') {
      const flocksRef = collection(db, 'farms', farmId, 'flocks');
      const q = query(flocksRef, orderBy('createdAt', 'desc'));

      unsubscribe = onSnapshot(q, (snapshot) => {
        const flocks = [];
        snapshot.forEach((d) => flocks.push(d.data()));
        if (flocks.length > 0) {
          saveLocalCache(`flocks_${farmId}`, flocks);
          callback(flocks);
        }
      }, (err) => {
        console.warn('Firestore flocks snapshot fallback:', err.message);
      });
    }
  } catch (err) {
    console.warn('subscribeFlocks error:', err.message);
  }

  return unsubscribe;
}

/**
 * Update flock info
 */
export async function updateFlock(farmId, flockId, updates) {
  const localFlocks = readLocalCache(`flocks_${farmId}`, []);
  const idx = localFlocks.findIndex(f => f.flockId === flockId);
  if (idx !== -1) {
    localFlocks[idx] = { ...localFlocks[idx], ...updates, lastUpdated: new Date().toISOString() };
    saveLocalCache(`flocks_${farmId}`, localFlocks);
  }

  try {
    if (db) {
      const flockRef = doc(db, 'farms', farmId, 'flocks', flockId);
      updateDoc(flockRef, updates).catch(() => {});
    }
  } catch (err) {}
}

/* ==========================================================================
   3. HEALTH LOGS & FINANCIAL TRANSACTIONS (MULTI-FLOCK LINKED)
   ========================================================================== */

/**
 * Add a new Health/Financial Log with Atomic Financial Aggregation per Flock & per Farm
 */
export async function addHealthLog(farmId, logData) {
  const logId = logData.logId || generateId('log');
  const nowIso = new Date().toISOString();
  const flockId = logData.flockId || 'general';

  const newLog = {
    logId,
    farmId,
    flockId,
    flockName: logData.flockName || '',
    date: logData.date || new Date().toISOString().split('T')[0],
    logType: logData.logType || (logData.amount ? 'EXPENSE' : 'NOTE'), // EXPENSE | REVENUE | NOTE
    category: logData.category || 'cam',
    amount: Number(logData.amount) || 0,
    mortalityCount: Number(logData.mortalityCount) || 0,
    notes: logData.notes || '',
    createdVia: logData.createdVia || 'MANUAL',
    createdBy: logData.createdBy || 'Chủ Hộ',
    createdAt: nowIso
  };

  // 1. Update Local Logs Cache
  const localLogs = readLocalCache(`logs_${farmId}`, []);
  localLogs.unshift(newLog);
  saveLocalCache(`logs_${farmId}`, localLogs);

  // 2. Update Local Flock Financial Summary
  if (flockId && flockId !== 'general') {
    const localFlocks = readLocalCache(`flocks_${farmId}`, []);
    const fIdx = localFlocks.findIndex(f => f.flockId === flockId);
    if (fIdx !== -1) {
      const flock = localFlocks[fIdx];
      const prevSummary = flock.financialSummary || { totalExpense: 0, totalRevenue: 0, netProfit: 0 };
      let newExpense = prevSummary.totalExpense || 0;
      let newRevenue = prevSummary.totalRevenue || 0;

      if (newLog.logType === 'EXPENSE') newExpense += newLog.amount;
      else if (newLog.logType === 'REVENUE') newRevenue += newLog.amount;

      if (newLog.mortalityCount > 0) {
        flock.currentCount = Math.max(0, (flock.currentCount || flock.initialCount) - newLog.mortalityCount);
      }

      flock.financialSummary = {
        totalExpense: newExpense,
        totalRevenue: newRevenue,
        netProfit: newRevenue - newExpense,
        lastUpdated: nowIso
      };
      saveLocalCache(`flocks_${farmId}`, localFlocks);
    }
  }

  // 3. Update Local Farm Financial Summary
  const farm = await getFarm(farmId);
  if (farm) {
    const prevSummary = farm.financialSummary || { totalExpense: 0, totalRevenue: 0, totalMortality: 0, netProfit: 0 };
    let newExpense = prevSummary.totalExpense || 0;
    let newRevenue = prevSummary.totalRevenue || 0;
    let newMortality = prevSummary.totalMortality || 0;

    if (newLog.logType === 'EXPENSE') newExpense += newLog.amount;
    else if (newLog.logType === 'REVENUE') newRevenue += newLog.amount;
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

  // 4. Persist to Firestore asynchronously (Non-blocking)
  try {
    if (db) {
      const logRef = doc(db, 'farms', farmId, 'health_logs', logId);
      setDoc(logRef, { ...newLog, serverCreatedAt: serverTimestamp() }).catch(() => {});

      // Atomically update farm summary
      const farmRef = doc(db, 'farms', farmId);
      const farmUpdates = {};
      if (newLog.logType === 'EXPENSE' && newLog.amount > 0) {
        farmUpdates['financialSummary.totalExpense'] = increment(newLog.amount);
        farmUpdates['financialSummary.netProfit'] = increment(-newLog.amount);
      } else if (newLog.logType === 'REVENUE' && newLog.amount > 0) {
        farmUpdates['financialSummary.totalRevenue'] = increment(newLog.amount);
        farmUpdates['financialSummary.netProfit'] = increment(newLog.amount);
      }
      if (newLog.mortalityCount > 0) {
        farmUpdates['financialSummary.totalMortality'] = increment(newLog.mortalityCount);
      }
      if (Object.keys(farmUpdates).length > 0) {
        updateDoc(farmRef, farmUpdates).catch(() => {});
      }

      // Atomically update flock summary
      if (flockId && flockId !== 'general') {
        const flockRef = doc(db, 'farms', farmId, 'flocks', flockId);
        const flockUpdates = {};
        if (newLog.logType === 'EXPENSE' && newLog.amount > 0) {
          flockUpdates['financialSummary.totalExpense'] = increment(newLog.amount);
          flockUpdates['financialSummary.netProfit'] = increment(-newLog.amount);
        } else if (newLog.logType === 'REVENUE' && newLog.amount > 0) {
          flockUpdates['financialSummary.totalRevenue'] = increment(newLog.amount);
          flockUpdates['financialSummary.netProfit'] = increment(newLog.amount);
        }
        if (newLog.mortalityCount > 0) {
          flockUpdates['currentCount'] = increment(-newLog.mortalityCount);
        }
        if (Object.keys(flockUpdates).length > 0) {
          updateDoc(flockRef, flockUpdates).catch(() => {});
        }
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
export function subscribeHealthLogs(farmId, callback, limitCount = 100) {
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
        console.warn('Firestore logs snapshot fallback:', err.message);
      });
    }
  } catch (err) {
    console.warn('subscribeHealthLogs error:', err.message);
  }

  return unsubscribe;
}

/* ==========================================================================
   4. FLOCK VACCINE SCHEDULES (PER-FLOCK PERSONALIZED)
   ========================================================================== */

/**
 * Subscribe to Vaccine Schedules for a specific flock
 */
export function subscribeFlockVaccines(farmId, flockId, callback) {
  const cacheKey = `vaccines_${farmId}_${flockId || 'default'}`;
  const localSchedules = readLocalCache(cacheKey, []);
  callback(localSchedules);

  let unsubscribe = () => {};

  try {
    if (db && typeof window !== 'undefined') {
      const vacRef = collection(db, 'farms', farmId, 'flocks', flockId, 'vaccine_schedules');
      const q = query(vacRef, orderBy('dayAge', 'asc'));

      unsubscribe = onSnapshot(q, (snapshot) => {
        const schedules = [];
        snapshot.forEach((d) => schedules.push(d.data()));
        if (schedules.length > 0) {
          saveLocalCache(cacheKey, schedules);
          callback(schedules);
        }
      }, (err) => {
        console.warn('Firestore flock vaccine snapshot fallback:', err.message);
      });
    }
  } catch (err) {
    console.warn('subscribeFlockVaccines error:', err.message);
  }

  return unsubscribe;
}

/**
 * Toggle vaccine status for a flock
 */
export async function toggleFlockVaccineStatus(farmId, flockId, scheduleId, isCompleted) {
  const nowIso = new Date().toISOString();
  const cacheKey = `vaccines_${farmId}_${flockId || 'default'}`;

  // 1. Update Local Cache
  const schedules = readLocalCache(cacheKey, []);
  const idx = schedules.findIndex(s => s.scheduleId === scheduleId);
  if (idx !== -1) {
    schedules[idx].isCompleted = isCompleted;
    schedules[idx].completedAt = isCompleted ? nowIso : null;
    saveLocalCache(cacheKey, schedules);
  }

  // 2. Persist to Firestore
  try {
    if (db && flockId) {
      const scheduleRef = doc(db, 'farms', farmId, 'flocks', flockId, 'vaccine_schedules', scheduleId);
      updateDoc(scheduleRef, {
        isCompleted,
        completedAt: isCompleted ? serverTimestamp() : null
      }).catch(() => {});
    }
  } catch (err) {
    console.warn('Firestore toggleFlockVaccineStatus fallback:', err.message);
  }
}

/**
 * Save customized vaccine schedule list for a flock
 */
export async function saveFlockVaccines(farmId, flockId, schedulesList) {
  const cacheKey = `vaccines_${farmId}_${flockId || 'default'}`;
  saveLocalCache(cacheKey, schedulesList);

  try {
    if (db && flockId) {
      for (const item of schedulesList) {
        const itemRef = doc(db, 'farms', farmId, 'flocks', flockId, 'vaccine_schedules', item.scheduleId);
        setDoc(itemRef, {
          ...item,
          serverUpdatedAt: serverTimestamp()
        }, { merge: true }).catch(() => {});
      }
    }
  } catch (err) {
    console.warn('Firestore saveFlockVaccines fallback:', err.message);
  }
}

/* ==========================================================================
   5. VISION DIAGNOSES HISTORY
   ========================================================================== */

export async function saveVisionDiagnosis(farmId, diagnosisResult) {
  const diagnosisId = diagnosisResult.diagnosisId || generateId('diag');
  const nowIso = new Date().toISOString();

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

  const localHistory = readLocalCache(`vision_history_${farmId}`, []);
  localHistory.unshift(entry);
  saveLocalCache(`vision_history_${farmId}`, localHistory);

  try {
    if (db) {
      const diagRef = doc(db, 'farms', farmId, 'vision_diagnoses', diagnosisId);
      setDoc(diagRef, { ...entry, serverCreatedAt: serverTimestamp() }).catch(() => {});
    }
  } catch (err) {
    console.warn('Firestore saveVisionDiagnosis fallback:', err.message);
  }

  return entry;
}
