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
// Đọc từ biến môi trường. Nếu chưa có key thật, hệ thống tự động chạy ở chế độ
// Offline Demo và hiển thị badge "💾 Bộ nhớ Offline" trên giao diện.
const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// ─── Cloud Connection Check ───────────────────────────────────────────────────
// Trả về true chỉ khi API key thật của Firebase (bắt đầu bằng "AIzaSy").
// Placeholder "your_firebase_api_key" hay undefined → false → chạy Offline Demo.
export function isFirebaseConfigured() {
  const key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';
  return key.startsWith('AIzaSy');
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
