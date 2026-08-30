import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  initializeFirestore, 
  getFirestore,
  persistentLocalCache, 
  persistentMultipleTabManager,
  serverTimestamp,
  increment,
  writeBatch,
  doc,
  collection,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot
} from "firebase/firestore";
import { 
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "firebase/auth";

// ─── Firebase Config ──────────────────────────────────────────────────────────
// Đọc từ biến môi trường với fallback an toàn cho dự án channuoi-ai
const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBNSR_C3bgN2QpA5P0zQ0cLT0IwoZnv6-8",
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "channuoi-ai.firebaseapp.com",
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "channuoi-ai",
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "channuoi-ai.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "496710385782",
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:496710385782:web:a200c4785dbcd6cbfd5f57",
  measurementId:     process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-EZBYKFQGQC",
};

// ─── Cloud Connection Check ───────────────────────────────────────────────────
// Trả về true khi có API key thật của Firebase (bắt đầu bằng "AIzaSy") và có projectId hợp lệ.
export function isFirebaseConfigured() {
  const key = firebaseConfig.apiKey || '';
  const proj = firebaseConfig.projectId || '';
  return key.startsWith('AIzaSy') && proj.trim().length > 0;
}

export const isCloudEnabled = isFirebaseConfigured();

// ─── App Initialization ───────────────────────────────────────────────────────
let app = null;
let dbInstance = null;
let authInstance = null;

if (isCloudEnabled) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

    // Firestore với Persistent Multi-Tab Cache (SDK tự xử lý offline/retry — không cần lớp cache thủ công)
    try {
      if (typeof window !== "undefined") {
        dbInstance = initializeFirestore(app, {
          localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager()
          })
        });
      } else {
        dbInstance = getFirestore(app);
      }
    } catch (e) {
      // Đã khởi tạo trước đó (hot reload Next.js) — dùng instance hiện có
      dbInstance = getFirestore(app);
    }

    authInstance = typeof window !== "undefined" ? getAuth(app) : null;
  } catch (e) {
    console.error('[Firebase Init Error]', e.message);
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────
export const db   = dbInstance;
export const auth = authInstance;

// Auth helpers
export { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged };

// Firestore helpers
export {
  serverTimestamp,
  increment,
  writeBatch,
  doc,
  collection,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
};
