import {
  db,
  isCloudEnabled,
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

// ─── Constants ────────────────────────────────────────────────────────────────
const LOCAL_STORAGE_PREFIX = 'channuoi_ai_v2_';
export const DEFAULT_GUEST_FARM_ID = 'guest_farm_default';

// ─── Sync Status Emitter ──────────────────────────────────────────────────────
// Thay thế .catch(() => {}) im lặng — phát sự kiện ra để UI hiển thị badge trạng thái
let _syncStatusListener = null;

export function setSyncStatusListener(fn) {
  _syncStatusListener = fn;
}

function emitSyncStatus(status) {
  // status: 'synced' | 'error' | 'offline'
  if (typeof _syncStatusListener === 'function') {
    _syncStatusListener(status);
  }
}

// ─── Local Storage Helpers ────────────────────────────────────────────────────
function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function saveLocalCache(key, data) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${key}`, JSON.stringify(data));
  } catch (e) {
    console.warn('[LocalStorage] save failed:', e);
  }
}

function readLocalCache(key, defaultValue = null) {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${key}`);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch (e) {
    console.warn('[LocalStorage] read failed:', e);
    return defaultValue;
  }
}

function clearLocalCache(key) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}${key}`);
  } catch (e) {}
}

/* =============================================================================
   1. FARM / TENANT PROFILE MANAGEMENT
   ============================================================================= */

/**
 * Tạo trang trại mới (dữ liệu sạch)
 * Khi có Firebase thật: ghi đồng thời Firestore và members sub-collection
 */
export async function createFarm(farmData) {
  const farmId = farmData.farmId || `${farmData.userId || 'guest'}_farm_${Date.now()}`;
  const nowIso = new Date().toISOString();

  const newFarm = {
    farmId,
    farmName:   farmData.farmName  || 'Trang Trại Chăn Nuôi Mới',
    ownerName:  farmData.ownerName || 'Chủ Hộ',
    ownerUid:   farmData.userId    || farmData.phone || 'guest',
    phone:      farmData.phone     || '',
    email:      farmData.email     || '',
    location:   farmData.location  || 'Việt Nam',
    authProvider: farmData.authProvider || 'GUEST',
    totalFlockCount: 0,
    financialSummary: {
      totalExpense: 0, totalRevenue: 0, totalMortality: 0, netProfit: 0,
      lastUpdated: nowIso
    },
    shareToken:     generateId('magic_token'),
    tokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: nowIso,
  };

  // Lưu local cache trước
  saveLocalCache(`farm_${farmId}`, newFarm);

  const registeredFarms = readLocalCache('registered_farms', []);
  if (!registeredFarms.find(f => f.farmId === farmId)) {
    registeredFarms.push({ farmId, farmName: newFarm.farmName, ownerName: newFarm.ownerName, phone: newFarm.phone });
    saveLocalCache('registered_farms', registeredFarms);
  }

  // Ghi Firestore nếu có key thật
  if (isCloudEnabled && db) {
    try {
      const farmRef = doc(db, 'farms', farmId);
      await setDoc(farmRef, { ...newFarm, serverCreatedAt: serverTimestamp() }, { merge: true });

      // Ghi thành viên OWNER vào sub-collection (bắt buộc để Security Rules hoạt động)
      if (farmData.userId) {
        const memberRef = doc(db, 'farms', farmId, 'members', farmData.userId);
        await setDoc(memberRef, {
          role: 'OWNER',
          name: farmData.ownerName || 'Chủ Hộ',
          joinedAt: serverTimestamp()
        });
      }

      emitSyncStatus('synced');
    } catch (err) {
      console.error('[Firestore] createFarm error:', err.code, err.message);
      emitSyncStatus('error');
    }
  } else {
    emitSyncStatus('offline');
  }

  return newFarm;
}

/**
 * Lấy hoặc tạo trang trại cho Google user (đăng nhập lần đầu)
 * Trả về { farm, isNew, hasGuestData }
 */
export async function getOrCreateFarm(firebaseUser) {
  const farmId = `${firebaseUser.uid}_farm`;

  // 1. Thử lấy farm từ Firestore
  if (isCloudEnabled && db) {
    try {
      const farmRef = doc(db, 'farms', farmId);
      const snap = await getDoc(farmRef);

      if (snap.exists()) {
        const farm = snap.data();
        saveLocalCache(`farm_${farmId}`, farm);

        const registeredFarms = readLocalCache('registered_farms', []);
        if (!registeredFarms.find(f => f.farmId === farmId)) {
          registeredFarms.push({ farmId, farmName: farm.farmName, ownerName: farm.ownerName, phone: farm.phone || '' });
          saveLocalCache('registered_farms', registeredFarms);
        }

        return { farm, isNew: false, hasGuestData: false };
      }
    } catch (err) {
      console.error('[Firestore] getOrCreateFarm fetch error:', err.code, err.message);
    }
  }

  // 2. Farm chưa tồn tại — kiểm tra dữ liệu Guest cục bộ
  const guestFlocks = readLocalCache(`flocks_${DEFAULT_GUEST_FARM_ID}`, []);
  const guestLogs   = readLocalCache(`logs_${DEFAULT_GUEST_FARM_ID}`, []);
  const hasGuestData = guestFlocks.length > 0 || guestLogs.length > 0;

  // 3. Tạo farm mới cho user
  const farm = await createFarm({
    farmId,
    userId:       firebaseUser.uid,
    ownerName:    firebaseUser.displayName || 'Chủ Hộ',
    email:        firebaseUser.email || '',
    authProvider: 'GOOGLE',
    farmName:     `Trang Trại ${firebaseUser.displayName?.split(' ').pop() || 'Của Bạn'}`,
  });

  return { farm, isNew: true, hasGuestData };
}

/**
 * Di chuyển dữ liệu Guest cục bộ sang farm Google mới
 */
export async function migrateGuestData(targetFarmId) {
  const guestFlocks = readLocalCache(`flocks_${DEFAULT_GUEST_FARM_ID}`, []);
  const guestLogs   = readLocalCache(`logs_${DEFAULT_GUEST_FARM_ID}`, []);
  const nowIso = new Date().toISOString();

  // Di chuyển Flocks
  const migratedFlocks = guestFlocks.map(f => ({ ...f, farmId: targetFarmId }));
  saveLocalCache(`flocks_${targetFarmId}`, migratedFlocks);

  // Di chuyển Logs
  const migratedLogs = guestLogs.map(l => ({ ...l, farmId: targetFarmId }));
  saveLocalCache(`logs_${targetFarmId}`, migratedLogs);

  // Ghi lên Firestore nếu có key thật
  if (isCloudEnabled && db) {
    try {
      for (const flock of migratedFlocks) {
        const ref = doc(db, 'farms', targetFarmId, 'flocks', flock.flockId);
        await setDoc(ref, { ...flock, migratedAt: serverTimestamp() }, { merge: true });
      }
      for (const log of migratedLogs) {
        const ref = doc(db, 'farms', targetFarmId, 'health_logs', log.logId);
        await setDoc(ref, { ...log, migratedAt: serverTimestamp() }, { merge: true });
      }
      emitSyncStatus('synced');
    } catch (err) {
      console.error('[Firestore] migrateGuestData error:', err.code, err.message);
      emitSyncStatus('error');
    }
  }

  // Xóa dữ liệu Guest cũ sau khi chuyển xong
  clearLocalCache(`flocks_${DEFAULT_GUEST_FARM_ID}`);
  clearLocalCache(`logs_${DEFAULT_GUEST_FARM_ID}`);
  clearLocalCache(`farm_${DEFAULT_GUEST_FARM_ID}`);
}

export async function getRegisteredFarms() {
  return readLocalCache('registered_farms', []);
}

export async function getFarm(farmId = DEFAULT_GUEST_FARM_ID) {
  // Ưu tiên cache cục bộ (Firestore SDK đã tự cache offline)
  const cached = readLocalCache(`farm_${farmId}`, null);
  if (cached) return cached;

  if (isCloudEnabled && db) {
    try {
      const farmRef = doc(db, 'farms', farmId);
      const snapshot = await getDoc(farmRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        saveLocalCache(`farm_${farmId}`, data);
        return data;
      }
    } catch (err) {
      console.error('[Firestore] getFarm error:', err.code, err.message);
      emitSyncStatus('error');
    }
  }

  if (farmId === DEFAULT_GUEST_FARM_ID) {
    return await createFarm({
      farmId: DEFAULT_GUEST_FARM_ID,
      farmName: 'Trại Gà Gia Đình (Demo)',
      ownerName: 'Chủ Hộ',
      authProvider: 'GUEST',
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

    if (isCloudEnabled && db) {
      const farmRef = doc(db, 'farms', farmId);
      updateDoc(farmRef, { shareToken, tokenExpiresAt })
        .then(() => emitSyncStatus('synced'))
        .catch(err => {
          console.error('[Firestore] generateShareMagicLink error:', err.code, err.message);
          emitSyncStatus('error');
        });
    }
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  return `${origin}?magic_share=${shareToken}&farm=${farmId}`;
}

/* =============================================================================
   2. MULTI-FLOCK (ĐÀN GÀ & CHUỒNG NUÔI) MANAGEMENT
   ============================================================================= */

export async function createFlock(farmId, flockData) {
  const flockId = flockData.flockId || generateId('flock');
  const nowIso = new Date().toISOString();

  const newFlock = {
    flockId, farmId,
    flockName:    flockData.flockName    || 'Chuồng Nuôi Mới',
    breed:        flockData.breed        || 'Gà Ri',
    initialCount: Number(flockData.initialCount) || 1000,
    currentCount: Number(flockData.currentCount || flockData.initialCount) || 1000,
    startDate:    flockData.startDate    || new Date().toISOString().split('T')[0],
    purpose:      flockData.purpose      || 'Nuôi lấy thịt',
    coopLocation: flockData.coopLocation || 'Chuồng 1',
    status: 'ACTIVE',
    financialSummary: { totalExpense: 0, totalRevenue: 0, netProfit: 0, lastUpdated: nowIso },
    createdAt: nowIso,
  };

  const localFlocks = readLocalCache(`flocks_${farmId}`, []);
  localFlocks.push(newFlock);
  saveLocalCache(`flocks_${farmId}`, localFlocks);

  const farm = await getFarm(farmId);
  if (farm) {
    farm.totalFlockCount = localFlocks.length;
    saveLocalCache(`farm_${farmId}`, farm);
  }

  if (isCloudEnabled && db) {
    try {
      const flockRef = doc(db, 'farms', farmId, 'flocks', flockId);
      await setDoc(flockRef, { ...newFlock, serverCreatedAt: serverTimestamp() });

      const farmRef = doc(db, 'farms', farmId);
      await updateDoc(farmRef, { totalFlockCount: increment(1) });

      emitSyncStatus('synced');
    } catch (err) {
      console.error('[Firestore] createFlock error:', err.code, err.message);
      emitSyncStatus('error');
    }
  }

  return newFlock;
}

export async function getFlocks(farmId) {
  return readLocalCache(`flocks_${farmId}`, []);
}

export function subscribeFlocks(farmId, callback) {
  const localFlocks = readLocalCache(`flocks_${farmId}`, []);
  callback(localFlocks);

  let unsubscribe = () => {};

  if (isCloudEnabled && db && typeof window !== 'undefined') {
    try {
      const flocksRef = collection(db, 'farms', farmId, 'flocks');
      const q = query(flocksRef, orderBy('createdAt', 'desc'));

      unsubscribe = onSnapshot(q, (snapshot) => {
        const flocks = [];
        snapshot.forEach(d => flocks.push(d.data()));
        if (flocks.length > 0) {
          saveLocalCache(`flocks_${farmId}`, flocks);
          callback(flocks);
        }
        emitSyncStatus('synced');
      }, (err) => {
        console.error('[Firestore] subscribeFlocks error:', err.code, err.message);
        emitSyncStatus('error');
      });
    } catch (err) {
      console.error('[Firestore] subscribeFlocks setup error:', err.message);
    }
  }

  return unsubscribe;
}

export async function updateFlock(farmId, flockId, updates) {
  const localFlocks = readLocalCache(`flocks_${farmId}`, []);
  const idx = localFlocks.findIndex(f => f.flockId === flockId);
  if (idx !== -1) {
    localFlocks[idx] = { ...localFlocks[idx], ...updates, lastUpdated: new Date().toISOString() };
    saveLocalCache(`flocks_${farmId}`, localFlocks);
  }

  if (isCloudEnabled && db) {
    const flockRef = doc(db, 'farms', farmId, 'flocks', flockId);
    updateDoc(flockRef, updates)
      .then(() => emitSyncStatus('synced'))
      .catch(err => {
        console.error('[Firestore] updateFlock error:', err.code, err.message);
        emitSyncStatus('error');
      });
  }
}

/* =============================================================================
   3. HEALTH LOGS & FINANCIAL TRANSACTIONS
   ============================================================================= */

export async function addHealthLog(farmId, logData) {
  const logId = logData.logId || generateId('log');
  const nowIso = new Date().toISOString();
  const flockId = logData.flockId || 'general';

  const newLog = {
    logId, farmId, flockId,
    flockName:     logData.flockName     || '',
    date:          logData.date          || new Date().toISOString().split('T')[0],
    logType:       logData.logType       || (logData.amount ? 'EXPENSE' : 'NOTE'),
    category:      logData.category      || 'cam',
    amount:        Number(logData.amount) || 0,
    mortalityCount: Number(logData.mortalityCount) || 0,
    notes:         logData.notes         || '',
    createdVia:    logData.createdVia    || 'MANUAL',
    createdBy:     logData.createdBy     || 'Chủ Hộ',
    createdAt:     nowIso,
  };

  // 1. Cập nhật cache cục bộ
  const localLogs = readLocalCache(`logs_${farmId}`, []);
  localLogs.unshift(newLog);
  saveLocalCache(`logs_${farmId}`, localLogs);

  // 2. Cập nhật tóm tắt tài chính flock cục bộ
  if (flockId && flockId !== 'general') {
    const localFlocks = readLocalCache(`flocks_${farmId}`, []);
    const fIdx = localFlocks.findIndex(f => f.flockId === flockId);
    if (fIdx !== -1) {
      const flock = localFlocks[fIdx];
      const prev = flock.financialSummary || { totalExpense: 0, totalRevenue: 0, netProfit: 0 };
      let exp = prev.totalExpense || 0;
      let rev = prev.totalRevenue || 0;
      if (newLog.logType === 'EXPENSE') exp += newLog.amount;
      else if (newLog.logType === 'REVENUE') rev += newLog.amount;
      if (newLog.mortalityCount > 0) {
        flock.currentCount = Math.max(0, (flock.currentCount || flock.initialCount) - newLog.mortalityCount);
      }
      flock.financialSummary = { totalExpense: exp, totalRevenue: rev, netProfit: rev - exp, lastUpdated: nowIso };
      saveLocalCache(`flocks_${farmId}`, localFlocks);
    }
  }

  // 3. Cập nhật tóm tắt tài chính farm cục bộ
  const farm = await getFarm(farmId);
  if (farm) {
    const prev = farm.financialSummary || { totalExpense: 0, totalRevenue: 0, totalMortality: 0, netProfit: 0 };
    let exp = prev.totalExpense || 0;
    let rev = prev.totalRevenue || 0;
    let mort = prev.totalMortality || 0;
    if (newLog.logType === 'EXPENSE') exp += newLog.amount;
    else if (newLog.logType === 'REVENUE') rev += newLog.amount;
    mort += newLog.mortalityCount;
    farm.financialSummary = { totalExpense: exp, totalRevenue: rev, totalMortality: mort, netProfit: rev - exp, lastUpdated: nowIso };
    saveLocalCache(`farm_${farmId}`, farm);
  }

  // 4. Ghi Firestore (không block UI, nhưng báo lỗi rõ ràng)
  if (isCloudEnabled && db) {
    try {
      const logRef = doc(db, 'farms', farmId, 'health_logs', logId);
      await setDoc(logRef, { ...newLog, serverCreatedAt: serverTimestamp() });

      const farmRef = doc(db, 'farms', farmId);
      const farmUpdates = {};
      if (newLog.logType === 'EXPENSE' && newLog.amount > 0) {
        farmUpdates['financialSummary.totalExpense'] = increment(newLog.amount);
        farmUpdates['financialSummary.netProfit']    = increment(-newLog.amount);
      } else if (newLog.logType === 'REVENUE' && newLog.amount > 0) {
        farmUpdates['financialSummary.totalRevenue'] = increment(newLog.amount);
        farmUpdates['financialSummary.netProfit']    = increment(newLog.amount);
      }
      if (newLog.mortalityCount > 0) {
        farmUpdates['financialSummary.totalMortality'] = increment(newLog.mortalityCount);
      }
      if (Object.keys(farmUpdates).length > 0) {
        await updateDoc(farmRef, farmUpdates);
      }

      if (flockId && flockId !== 'general') {
        const flockRef = doc(db, 'farms', farmId, 'flocks', flockId);
        const flockUpdates = {};
        if (newLog.logType === 'EXPENSE' && newLog.amount > 0) {
          flockUpdates['financialSummary.totalExpense'] = increment(newLog.amount);
          flockUpdates['financialSummary.netProfit']    = increment(-newLog.amount);
        } else if (newLog.logType === 'REVENUE' && newLog.amount > 0) {
          flockUpdates['financialSummary.totalRevenue'] = increment(newLog.amount);
          flockUpdates['financialSummary.netProfit']    = increment(newLog.amount);
        }
        if (newLog.mortalityCount > 0) {
          flockUpdates['currentCount'] = increment(-newLog.mortalityCount);
        }
        if (Object.keys(flockUpdates).length > 0) {
          await updateDoc(flockRef, flockUpdates);
        }
      }

      emitSyncStatus('synced');
    } catch (err) {
      console.error('[Firestore] addHealthLog error:', err.code, err.message);
      emitSyncStatus('error');
    }
  }

  return newLog;
}

export function subscribeHealthLogs(farmId, callback, limitCount = 100) {
  const localLogs = readLocalCache(`logs_${farmId}`, []);
  callback(localLogs);

  let unsubscribe = () => {};

  if (isCloudEnabled && db && typeof window !== 'undefined') {
    try {
      const logsRef = collection(db, 'farms', farmId, 'health_logs');
      const q = query(logsRef, orderBy('createdAt', 'desc'), limit(limitCount));

      unsubscribe = onSnapshot(q, (snapshot) => {
        const logs = [];
        snapshot.forEach(d => logs.push(d.data()));
        if (logs.length > 0) {
          saveLocalCache(`logs_${farmId}`, logs);
          callback(logs);
        }
        emitSyncStatus('synced');
      }, (err) => {
        console.error('[Firestore] subscribeHealthLogs error:', err.code, err.message);
        emitSyncStatus('error');
      });
    } catch (err) {
      console.error('[Firestore] subscribeHealthLogs setup error:', err.message);
    }
  }

  return unsubscribe;
}

/* =============================================================================
   4. FLOCK VACCINE SCHEDULES (vaccine_schedules — đường dẫn đúng từ code thực tế)
   ============================================================================= */

export function subscribeFlockVaccines(farmId, flockId, callback) {
  const cacheKey = `vaccines_${farmId}_${flockId || 'default'}`;
  const localSchedules = readLocalCache(cacheKey, []);
  callback(localSchedules);

  let unsubscribe = () => {};

  if (isCloudEnabled && db && typeof window !== 'undefined') {
    try {
      // Đường dẫn chính xác: farms/{farmId}/flocks/{flockId}/vaccine_schedules
      const vacRef = collection(db, 'farms', farmId, 'flocks', flockId, 'vaccine_schedules');
      const q = query(vacRef, orderBy('dayAge', 'asc'));

      unsubscribe = onSnapshot(q, (snapshot) => {
        const schedules = [];
        snapshot.forEach(d => schedules.push(d.data()));
        if (schedules.length > 0) {
          saveLocalCache(cacheKey, schedules);
          callback(schedules);
        }
        emitSyncStatus('synced');
      }, (err) => {
        console.error('[Firestore] subscribeFlockVaccines error:', err.code, err.message);
        emitSyncStatus('error');
      });
    } catch (err) {
      console.error('[Firestore] subscribeFlockVaccines setup error:', err.message);
    }
  }

  return unsubscribe;
}

export async function toggleFlockVaccineStatus(farmId, flockId, scheduleId, isCompleted) {
  const nowIso = new Date().toISOString();
  const cacheKey = `vaccines_${farmId}_${flockId || 'default'}`;

  const schedules = readLocalCache(cacheKey, []);
  const idx = schedules.findIndex(s => s.scheduleId === scheduleId);
  if (idx !== -1) {
    schedules[idx].isCompleted = isCompleted;
    schedules[idx].completedAt = isCompleted ? nowIso : null;
    saveLocalCache(cacheKey, schedules);
  }

  if (isCloudEnabled && db && flockId) {
    const scheduleRef = doc(db, 'farms', farmId, 'flocks', flockId, 'vaccine_schedules', scheduleId);
    updateDoc(scheduleRef, { isCompleted, completedAt: isCompleted ? serverTimestamp() : null })
      .then(() => emitSyncStatus('synced'))
      .catch(err => {
        console.error('[Firestore] toggleFlockVaccineStatus error:', err.code, err.message);
        emitSyncStatus('error');
      });
  }
}

export async function saveFlockVaccines(farmId, flockId, schedulesList) {
  const cacheKey = `vaccines_${farmId}_${flockId || 'default'}`;
  saveLocalCache(cacheKey, schedulesList);

  if (isCloudEnabled && db && flockId) {
    try {
      for (const item of schedulesList) {
        const itemRef = doc(db, 'farms', farmId, 'flocks', flockId, 'vaccine_schedules', item.scheduleId);
        await setDoc(itemRef, { ...item, serverUpdatedAt: serverTimestamp() }, { merge: true });
      }
      emitSyncStatus('synced');
    } catch (err) {
      console.error('[Firestore] saveFlockVaccines error:', err.code, err.message);
      emitSyncStatus('error');
    }
  }
}

/* =============================================================================
   5. VISION DIAGNOSES HISTORY
   ============================================================================= */

export async function saveVisionDiagnosis(farmId, diagnosisResult) {
  const diagnosisId = diagnosisResult.diagnosisId || generateId('diag');
  const nowIso = new Date().toISOString();

  const entry = {
    diagnosisId, farmId,
    analysis_status:     diagnosisResult.analysis_status     || 'DIAGNOSED',
    primary_suspicion:   diagnosisResult.primary_suspicion   || 'Chưa xác định',
    urgency_level:       diagnosisResult.urgency_level       || 'TRUNG BÌNH',
    images_analyzed:     diagnosisResult.images_analyzed     || 1,
    biosafety_actions:   diagnosisResult.biosafety_actions   || [],
    differential_diagnosis: diagnosisResult.differential_diagnosis || [],
    createdAt: nowIso,
  };

  const localHistory = readLocalCache(`vision_history_${farmId}`, []);
  localHistory.unshift(entry);
  saveLocalCache(`vision_history_${farmId}`, localHistory);

  if (isCloudEnabled && db) {
    const diagRef = doc(db, 'farms', farmId, 'vision_diagnoses', diagnosisId);
    setDoc(diagRef, { ...entry, serverCreatedAt: serverTimestamp() })
      .then(() => emitSyncStatus('synced'))
      .catch(err => {
        console.error('[Firestore] saveVisionDiagnosis error:', err.code, err.message);
        emitSyncStatus('error');
      });
  }

  return entry;
}
