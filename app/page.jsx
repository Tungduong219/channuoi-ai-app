'use client';

import React, { useState, useEffect } from 'react';
import AuthHeader from '@/components/AuthHeader';
import FamilyShareModal from '@/components/FamilyShareModal';
import TopBar from '@/components/TopBar';
import BottomNav from '@/components/BottomNav';
import MicModal from '@/components/MicModal';
import { checkImageQuality } from '@/lib/canvasQualityCheck';
import { compressImage } from '@/lib/imageCompressor';
import { db } from '@/lib/firebase';
import { collection, addDoc, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import {
  ShieldAlert,
  Camera,
  CheckCircle2,
  AlertTriangle,
  PhoneCall,
  RefreshCw,
  TrendingUp,
  MapPin,
  QrCode,
  Share2,
  UserCheck,
  ChevronRight,
  Sparkles,
  Loader2
} from 'lucide-react';

const CURRENT_FARM_ID = "trai_ga_nguyen_van_a";

export default function HomeApp() {
  const [activeTab, setActiveTab] = useState('home');
  const [isMicOpen, setIsMicOpen] = useState(false);
  const [pnlAmount, setPnlAmount] = useState(3450000);
  const [ttsEnabled, setTtsEnabled] = useState(true);

  // Auth & Multi-Tenancy Roles State
  const [userRole, setUserRole] = useState('OWNER'); // 'OWNER' | 'WORKER' | 'FAMILY_VIEWER'
  const [user, setUser] = useState(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // URL Parameter Detection for Family Share Link (?view=family)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('view') === 'family') {
        setUserRole('FAMILY_VIEWER');
      }
    }
  }, []);

  // Transactions State with LocalStorage & Realtime Firestore Sync
  const [transactions, setTransactions] = useState([]);

  // Vaccine Schedule State
  const [chickenBreed, setChickenBreed] = useState('Gà Ri');
  const [vaccineSchedule, setVaccineSchedule] = useState([]);
  const [isLoadingVaccine, setIsLoadingVaccine] = useState(false);
  const [completedVaccines, setCompletedVaccines] = useState({});

  // Vision State — multi-image (1–8)
  // Each item: { id, previewUrl, compressedBase64, qualityStatus: 'checking'|'passed'|'failed', failReason }
  const [visionImages, setVisionImages] = useState([]);
  const [visionResult, setVisionResult] = useState(null);
  const [isAnalyzingVision, setIsAnalyzingVision] = useState(false);

  // Effect 1: Firestore Realtime Listener
  useEffect(() => {
    try {
      const q = query(
        collection(db, "transactions"),
        where("farmId", "==", CURRENT_FARM_ID),
        orderBy("createdAt", "desc")
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const remoteData = [];
        snapshot.forEach((doc) => {
          remoteData.push({ id: doc.id, ...doc.data() });
        });
        if (remoteData.length > 0) {
          setTransactions(remoteData);
          recalculatePnl(remoteData);
          localStorage.setItem('channuoi_transactions', JSON.stringify(remoteData));
        }
      }, (error) => {
        console.warn("Firestore snapshot listener error (offline or config):", error);
      });
      return () => unsubscribe();
    } catch (err) {
      console.warn("Firestore init error:", err);
    }
  }, []);

  // Effect 2: Local data load + Vaccine fetch + Online sync listener
  useEffect(() => {
    const savedTx = localStorage.getItem('channuoi_transactions');
    if (savedTx) {
      try {
        const parsed = JSON.parse(savedTx);
        setTransactions(parsed);
        recalculatePnl(parsed);
      } catch (e) {}
    } else {
      const initialTx = [
        { id: 1, date: '03/08/2026', type: 'EXPENSE', item: 'Cám hỗn hợp gà thịt (5 bao)', amount: 1750000, status: 'SYNCED', farmId: CURRENT_FARM_ID },
        { id: 2, date: '01/08/2026', type: 'EXPENSE', item: 'Vắc-xin Cúm H5N1 (500 liều)', amount: 200000, status: 'SYNCED', farmId: CURRENT_FARM_ID },
        { id: 3, date: '28/07/2026', type: 'REVENUE', item: 'Bán gà thịt đợt 1 (100kg x 54k)', amount: 5400000, status: 'SYNCED', farmId: CURRENT_FARM_ID },
      ];
      setTransactions(initialTx);
      localStorage.setItem('channuoi_transactions', JSON.stringify(initialTx));
    }

    const savedVaccines = localStorage.getItem('channuoi_completed_vaccines');
    if (savedVaccines) {
      try { setCompletedVaccines(JSON.parse(savedVaccines)); } catch (e) {}
    }

    fetchVaccineSchedule('Gà Ri');

    const handleOnline = () => {
      syncPendingTransactions();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const recalculatePnl = (list) => {
    let basePnl = 3450000;
    list.forEach(t => {
      if (t.type === 'REVENUE') basePnl += t.amount;
      else basePnl -= t.amount;
    });
    setPnlAmount(basePnl);
  };

  // Sync OFFLINE_PENDING transactions with Await and Strict Error Handling
  const syncPendingTransactions = async () => {
    const current = JSON.parse(localStorage.getItem('channuoi_transactions') || '[]');
    let hasChanges = false;
    const updated = [];

    for (const tx of current) {
      if (tx.status === 'OFFLINE_PENDING') {
        try {
          await addDoc(collection(db, "transactions"), {
            ...tx,
            farmId: CURRENT_FARM_ID,
            createdAt: new Date()
          });
          updated.push({ ...tx, status: 'SYNCED' });
          hasChanges = true;
        } catch (e) {
          console.error("Sync failed for transaction, keeping OFFLINE_PENDING:", tx, e);
          updated.push(tx); // Retain OFFLINE_PENDING status if sync failed!
        }
      } else {
        updated.push(tx);
      }
    }

    if (hasChanges) {
      setTransactions(updated);
      localStorage.setItem('channuoi_transactions', JSON.stringify(updated));
    }
  };

  // Fetch Vaccine Schedule from Gemini API Route
  const fetchVaccineSchedule = async (breed) => {
    setIsLoadingVaccine(true);
    try {
      const res = await fetch('/api/gemini/generate-vaccine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ breed, startDate: '01/08/2026' }),
      });
      const data = await res.json();
      if (data.schedule) setVaccineSchedule(data.schedule);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingVaccine(false);
    }
  };

  const toggleVaccineDone = (dayAge) => {
    const nextState = { ...completedVaccines, [dayAge]: !completedVaccines[dayAge] };
    setCompletedVaccines(nextState);
    localStorage.setItem('channuoi_completed_vaccines', JSON.stringify(nextState));
  };

  // Save transaction with Firestore Await & Strict Sync State
  const handleSaveTransaction = async (newTx) => {
    const isOnline = typeof window !== 'undefined' ? navigator.onLine : true;
    let syncStatus = 'OFFLINE_PENDING';

    const createdTx = {
      id: Date.now(),
      date: new Date().toLocaleDateString('vi-VN'),
      type: newTx.type,
      item: `${newTx.item_name} (${newTx.quantity} ${newTx.unit})`,
      amount: newTx.total_amount,
      farmId: CURRENT_FARM_ID,
      status: syncStatus
    };

    if (isOnline) {
      try {
        await addDoc(collection(db, "transactions"), {
          ...createdTx,
          createdAt: new Date()
        });
        createdTx.status = 'SYNCED';
      } catch (e) {
        console.warn("Firestore save error, marking OFFLINE_PENDING:", e);
        createdTx.status = 'OFFLINE_PENDING';
      }
    }

    const updated = [createdTx, ...transactions];
    setTransactions(updated);
    localStorage.setItem('channuoi_transactions', JSON.stringify(updated));
    recalculatePnl(updated);
  };

  // Multi-image Vision Handlers
  const addVisionImages = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    // Reset file input so same file can be re-added after delete
    e.target.value = '';

    const remaining = 15 - visionImages.length;
    const toProcess = files.slice(0, remaining);

    if (files.length > remaining) {
      alert(`Chỉ thêm được ${remaining}/${files.length} ảnh do đã đạt giới hạn tối đa 15 ảnh.`);
    }

    // Reset results when new images added
    setVisionResult(null);

    for (const file of toProcess) {
      const id = `img_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const previewUrl = URL.createObjectURL(file);

      // Add placeholder with 'checking' status
      setVisionImages((prev) => [
        ...prev,
        { id, previewUrl, compressedBase64: null, qualityStatus: 'checking', failReason: '' }
      ]);

      // Run quality check on the image
      try {
        const base64Raw = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const img = new Image();
        await new Promise((resolve) => { img.onload = resolve; img.src = base64Raw; });

        const qualityResult = checkImageQuality(img);

        if (!qualityResult.isPassed) {
          setVisionImages((prev) =>
            prev.map((item) =>
              item.id === id
                ? { ...item, qualityStatus: 'failed', failReason: qualityResult.reason }
                : item
            )
          );
        } else {
          // Compress before storing
          const compressedBase64 = await compressImage(file);
          setVisionImages((prev) =>
            prev.map((item) =>
              item.id === id
                ? { ...item, compressedBase64, qualityStatus: 'passed' }
                : item
            )
          );
        }
      } catch (err) {
        console.error('Image processing error:', err);
        setVisionImages((prev) =>
          prev.map((item) =>
            item.id === id
              ? { ...item, qualityStatus: 'failed', failReason: 'Không đọc được định dạng ảnh.' }
              : item
          )
        );
      }
    }
  };

  const removeVisionImage = (id) => {
    setVisionImages((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
    setVisionResult(null);
  };

  const analyzeVision = async () => {
    const passedImages = visionImages.filter((i) => i.qualityStatus === 'passed');
    if (!passedImages.length) return;

    setIsAnalyzingVision(true);
    setVisionResult(null);
    try {
      const res = await fetch('/api/gemini/analyze-vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: passedImages.map((i) => i.compressedBase64) }),
      });
      const data = await res.json();
      setVisionResult(data);
    } catch (apiErr) {
      console.error(apiErr);
      setVisionResult({
        images_analyzed: passedImages.length,
        symptoms_detected: ['Không kết nối được AI'],
        suspected_condition: 'Theo dõi thêm',
        confidence_note: 'THẤP',
        urgency_level: 'TRUNG BÌNH',
        action_recommendation: 'Vệ sinh chuồng nuôi và liên hệ Bác sĩ Thú y địa phương.',
        disclaimer: 'Cảnh báo sớm bằng AI — Không thay thế chẩn đoán của Bác sĩ Thú y.'
      });
    } finally {
      setIsAnalyzingVision(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F0FAF9] text-[#1A2332] safe-bottom-padding pt-[64px]">
      <AuthHeader
        userRole={userRole}
        setUserRole={setUserRole}
        user={user}
        setUser={setUser}
        onOpenShareModal={() => setIsShareModalOpen(true)}
      />

      {/* Top Banner for Con Cái / Người thân (FAMILY_VIEWER mode) — Note 3 */}
      {userRole === 'FAMILY_VIEWER' && (
        <div className="bg-[#E3F2FD] border-b border-[#90CAF9] text-[#0D47A1] px-4 py-2.5 text-xs font-bold flex items-center justify-between shadow-sm animate-count-up">
          <div className="flex items-center gap-2">
            <span className="text-sm">👁️</span>
            <span>Bạn đang xem trang trại của Bố/Mẹ ở chế độ xem từ xa (Chỉ đọc).</span>
          </div>
          <span className="text-[10px] bg-[#90CAF9] text-[#0D47A1] font-extrabold px-2 py-0.5 rounded-full uppercase shrink-0">
            CHỈ ĐỌC
          </span>
        </div>
      )}

      <FamilyShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        farmName={user?.farmName}
      />

      <MicModal
        isOpen={isMicOpen}
        onClose={() => setIsMicOpen(false)}
        onSaveTransaction={handleSaveTransaction}
        ttsEnabled={ttsEnabled}
      />

      <div className="max-w-md mx-auto px-4 py-3">
        {/* SCREEN 2: HOME DASHBOARD */}
        {activeTab === 'home' && (
          <div className="space-y-4 animate-count-up">
            <div className="bg-[#00695C] text-white p-4 rounded-2xl shadow-lg relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-5 h-5 text-[#FF8F00]" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#FF8F00]">
                    Trại gà Ri — 28 ngày tuổi
                  </span>
                </div>
                <h2 className="text-xl font-extrabold">Đàn gà Ri Lứa 1 (500 con)</h2>
                <p className="text-xs text-white/80 mt-1">Đang phát triển tốt • FCR: 1.65 (Tốt)</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-[#FF8F00]" />
                  <span className="font-bold text-sm text-[#1A2332]">Lịch tiêm sắp tới</span>
                </div>
                <span className="text-xs font-bold text-[#C62828] bg-[#C62828]/10 px-2 py-0.5 rounded-full">
                  Hôm nay
                </span>
              </div>
              <p className="text-base font-bold text-[#00695C]">
                🛡️ Vắc-xin Cúm gia cầm H5N1 (Mũi 1)
              </p>
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-gray-500">Phương pháp: Tiêm dưới da cổ</span>
                <button
                  onClick={() => setActiveTab('vaccine')}
                  className="text-xs font-bold text-[#00695C] flex items-center gap-1 hover:underline min-h-[44px]"
                >
                  Xem timeline <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('vision')}
              className="w-full btn-primary-cta shadow-md"
            >
              <Camera className="w-6 h-6 text-[#1A2332]" />
              📸 CHẨN ĐOÁN BỆNH GÀ QUA ẢNH
            </button>

            <div className="p-4 bg-[#FFF3CD] border border-[#FF8F00]/40 rounded-2xl flex items-start gap-3">
              <Sparkles className="w-6 h-6 text-[#FF8F00] shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-[#1A2332]">Tác động ROI Ước tính:</h4>
                <p className="text-xs text-gray-700 mt-0.5 leading-relaxed">
                  Phát hiện bệnh sớm 2-3 ngày giúp cứu <span className="font-bold text-[#2E7D32]">85% đàn gà</span> ➔ Tiết kiệm ước tính <span className="font-bold text-[#00695C]">12.500.000đ/lứa</span>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 3: SMART VACCINE SCHEDULE */}
        {activeTab === 'vaccine' && (
          <div className="space-y-4 animate-count-up">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-[#00695C]">🛡️ Lịch Tiêm AI Sinh</h2>
              <select
                value={chickenBreed}
                onChange={(e) => {
                  setChickenBreed(e.target.value);
                  fetchVaccineSchedule(e.target.value);
                }}
                className="text-xs font-bold bg-[#00695C] text-white px-3 py-1.5 rounded-full outline-none"
              >
                <option value="Gà Ri">Giống: Gà Ri</option>
                <option value="Gà Ta">Giống: Gà Ta</option>
                <option value="Gà Tam Hoàng">Giống: Tam Hoàng</option>
              </select>
            </div>

            {isLoadingVaccine ? (
              <div className="p-8 bg-white rounded-2xl text-center space-y-2">
                <Loader2 className="w-8 h-8 text-[#00695C] animate-spin mx-auto" />
                <p className="text-sm font-bold text-[#00695C]">Gemini đang lập lịch vắc-xin cho {chickenBreed}...</p>
              </div>
            ) : (
              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                {vaccineSchedule.map((v, i) => {
                  const isDone = completedVaccines[v.day_age];
                  return (
                    <div
                      key={i}
                      className={`border-l-4 pl-3 py-2 transition-all rounded-r-xl p-2 ${
                        isDone ? 'border-[#2E7D32] bg-[#2E7D32]/5' : 'border-[#FF8F00] bg-[#FFF3CD]/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-500 uppercase">Ngày {v.day_age} tuổi</span>
                        {v.is_mandatory && (
                          <span className="text-[10px] font-extrabold bg-[#C62828] text-white px-2 py-0.5 rounded">BẮT BUỘC</span>
                        )}
                      </div>
                      <h4 className="font-bold text-base text-[#1A2332] mt-0.5">{v.disease_name}</h4>
                      <p className="text-xs text-gray-600">Loại: {v.vaccine_type} • Cách tiêm: {v.method}</p>
                        <button
                        onClick={() => toggleVaccineDone(v.day_age)}
                        className={`mt-2 w-full btn-secondary ${isDone ? 'bg-[#2E7D32] text-white' : ''}`}
                      >
                        <CheckCircle2 className="w-5 h-5" />
                        {isDone ? '✅ ĐÃ TIÊM HOÀN THÀNH' : '▲ XÁC NHẬN ĐÃ TIÊM'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SCREEN 4: VISION DIAGNOSIS — MULTI-IMAGE (1–15 ảnh) */}
        {activeTab === 'vision' && (
          <div className="space-y-4 animate-count-up">
            <h2 className="text-xl font-extrabold text-[#00695C]">📸 Chẩn Đoán Bệnh AI</h2>

            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
              {/* Hint text */}
              <p className="text-xs text-gray-500 font-medium text-center">
                Chụp 1–15 ảnh: phân gà, dáng đứng, triệu chứng rõ (mắt, mào, chân), ảnh mổ khám...
              </p>

              {/* Image grid — 4 columns */}
              <div className="grid grid-cols-4 gap-2">
                {visionImages.map((item) => (
                  <div key={item.id} className="relative aspect-square">
                    <img
                      src={item.previewUrl}
                      alt="ảnh gà"
                      className={`w-full h-full object-cover rounded-xl border-2 ${
                        item.qualityStatus === 'failed'
                          ? 'border-[#C62828]'
                          : item.qualityStatus === 'passed'
                          ? 'border-[#2E7D32]'
                          : 'border-gray-300'
                      }`}
                    />
                    {/* Status overlay */}
                    {item.qualityStatus === 'checking' && (
                      <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                      </div>
                    )}
                    {item.qualityStatus === 'failed' && (
                      <div className="absolute inset-0 bg-[#C62828]/60 rounded-xl p-1 flex flex-col items-center justify-center text-center">
                        <AlertTriangle className="w-4 h-4 text-white mb-0.5" />
                        <span className="text-[9px] font-bold text-white leading-tight">
                          {item.failReason}
                        </span>
                      </div>
                    )}
                    {item.qualityStatus === 'passed' && (
                      <div className="absolute top-1 left-1">
                        <CheckCircle2 className="w-4 h-4 text-[#2E7D32] drop-shadow" />
                      </div>
                    )}
                    {/* Delete button — 44×44 minimum touch target */}
                    <button
                      onClick={() => removeVisionImage(item.id)}
                      aria-label="Xóa ảnh"
                      className="absolute -top-2 -right-2 w-[44px] h-[44px] flex items-center justify-center"
                    >
                      <span className="w-[22px] h-[22px] bg-[#C62828] text-white rounded-full flex items-center justify-center text-xs font-bold shadow">
                        ✕
                      </span>
                    </button>
                  </div>
                ))}

                {/* Add button — hidden when 15 images reached */}
                {visionImages.length < 15 && (
                  <label className="aspect-square border-2 border-dashed border-[#00695C]/40 rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-[#F0FAF9] transition-colors">
                    <Camera className="w-7 h-7 text-[#00695C]" />
                    <span className="text-[10px] font-bold text-[#00695C] text-center leading-tight">➕ Thêm ảnh</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      capture="environment"
                      onChange={addVisionImages}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Count summary */}
              {visionImages.length > 0 && (
                <p className="text-xs text-center text-gray-500">
                  {visionImages.filter(i => i.qualityStatus === 'passed').length} ảnh đạt / {visionImages.length} ảnh đã chọn
                  {visionImages.some(i => i.qualityStatus === 'failed') && (
                    <span className="text-[#C62828] font-bold ml-1">— Có ảnh lỗi, bấm ✕ để xóa và chụp lại</span>
                  )}
                </p>
              )}

              {/* Analyse button — enabled only when ≥1 passed */}
              <button
                onClick={analyzeVision}
                disabled={isAnalyzingVision || visionImages.filter(i => i.qualityStatus === 'passed').length === 0}
                className="w-full btn-secondary-cta flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isAnalyzingVision ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Gemini Vision đang phân tích...</>
                ) : (
                  <><ShieldAlert className="w-5 h-5" /> Gửi AI Phân Tích ({visionImages.filter(i => i.qualityStatus === 'passed').length} ảnh)</>
                )}
              </button>
            </div>

            {/* Result card */}
            {visionResult && (
              <div className="bg-white p-5 rounded-2xl border-2 border-[#FF8F00] shadow-md space-y-3">
                {/* Header: status + urgency */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className={`text-xs font-extrabold px-3 py-1 rounded-full uppercase ${
                    visionResult.urgency_level === 'KHẨN CẤP' ? 'bg-[#7B0000] text-white' :
                    visionResult.urgency_level === 'CAO' ? 'bg-[#C62828] text-white' :
                    visionResult.urgency_level === 'TRUNG BÌNH' ? 'bg-[#FF8F00] text-[#1A2332]' :
                    'bg-[#2E7D32] text-white'
                  }`}>
                    {visionResult.urgency_level === 'KHẨN CẤP' ? '🚨' : visionResult.urgency_level === 'CAO' ? '⚠️' : visionResult.urgency_level === 'TRUNG BÌNH' ? '🔶' : '✅'} {visionResult.urgency_level}
                  </span>
                  <span className="text-xs text-gray-500 font-semibold">Gemini Vision 2.0 Flash · {visionResult.images_analyzed} ảnh</span>
                </div>

                {/* analysis_status + confidence */}
                {visionResult.analysis_status === 'INSUFFICIENT_DATA' && (
                  <div className="text-xs font-semibold text-[#FF8F00] bg-[#FFF3CD] px-3 py-2 rounded-lg">
                    📷 Ảnh chưa đủ rõ để chẩn đoán chắc chắn. Xem gợi ý chụp thêm bên dưới.
                  </div>
                )}
                {visionResult.analysis_status === 'HEALTHY' && (
                  <div className="text-xs font-semibold text-[#2E7D32] bg-[#E8F5E9] px-3 py-2 rounded-lg">
                    ✅ Gà trông bình thường, chưa thấy dấu hiệu bệnh rõ ràng.
                  </div>
                )}
                {visionResult.overall_confidence && visionResult.analysis_status === 'DIAGNOSED' && (
                  <div className="text-xs font-semibold text-[#00695C] bg-[#F0FAF9] px-3 py-1.5 rounded-lg">
                    Độ tin cậy phân tích: <strong>{visionResult.overall_confidence}</strong>
                  </div>
                )}

                {/* Primary suspicion */}
                {visionResult.primary_suspicion && (
                  <h3 className="text-base font-extrabold text-[#C62828]">
                    🔴 Nghi ngờ chính: {visionResult.primary_suspicion}
                  </h3>
                )}

                {/* Differential diagnosis list */}
                {visionResult.differential_diagnosis?.length > 0 && (
                  <div className="space-y-2">
                    <p className="font-bold text-sm text-gray-700">Chẩn đoán phân biệt:</p>
                    {visionResult.differential_diagnosis.map((d, i) => (
                      <div key={i} className={`rounded-xl px-3 py-2 text-xs border ${
                        d.match_score === 'CAO' ? 'border-[#C62828] bg-[#FFF5F5]' :
                        d.match_score === 'TRUNG BÌNH' ? 'border-[#FF8F00] bg-[#FFF8E7]' :
                        'border-gray-200 bg-gray-50'
                      }`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-[#1A2332]">{d.disease_name}</span>
                          <span className={`font-extrabold px-2 py-0.5 rounded-full text-[10px] ${
                            d.match_score === 'CAO' ? 'bg-[#C62828] text-white' :
                            d.match_score === 'TRUNG BÌNH' ? 'bg-[#FF8F00] text-[#1A2332]' :
                            'bg-gray-200 text-gray-600'
                          }`}>{d.match_score}</span>
                        </div>
                        {d.matching_symptoms?.length > 0 && (
                          <p className="text-gray-600">Khớp: {d.matching_symptoms.join(', ')}</p>
                        )}
                        {d.ruling_out_reason && (
                          <p className="text-gray-400 italic mt-0.5">Loại trừ: {d.ruling_out_reason}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Observed symptoms */}
                {visionResult.observed_symptoms?.length > 0 && (
                  <div className="text-sm space-y-1">
                    <p className="font-bold text-gray-700">Triệu chứng quan sát được:</p>
                    <ul className="list-disc list-inside text-xs text-gray-600 space-y-0.5">
                      {visionResult.observed_symptoms.map((s, i) => (
                        <li key={i}>
                          <span className="font-semibold">[{s.location}]</span> {s.symptom}
                          {s.severity === 'NẶNG' && <span className="text-[#C62828] font-bold ml-1">(Nặng)</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Biosafety actions */}
                {visionResult.biosafety_actions?.length > 0 && (
                  <div className="text-xs text-gray-700 bg-gray-50 p-3 rounded-xl space-y-1">
                    <span className="font-bold block">🛡️ Hướng dẫn an toàn sinh học:</span>
                    <ul className="list-disc list-inside space-y-0.5">
                      {visionResult.biosafety_actions.map((a, i) => <li key={i}>{a}</li>)}
                    </ul>
                  </div>
                )}

                {/* Interactive 2-Step Differential Flow CTA */}
                {visionResult.request_additional_photo && (
                  <div className="bg-[#E0F2F1] border-2 border-[#00695C] p-3.5 rounded-xl space-y-2 animate-pulse-subtle">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-[#00695C]">
                      <Camera className="w-4 h-4 text-[#00695C] shrink-0" />
                      <span>💡 AI gợi ý chụp thêm 1 góc ảnh để chẩn đoán chính xác 100%:</span>
                    </div>
                    {visionResult.reason_for_next_photo && (
                      <p className="text-xs text-gray-700 bg-white/80 p-2 rounded-lg italic">
                        "{visionResult.reason_for_next_photo}"
                      </p>
                    )}
                    <label className="w-full bg-[#00695C] hover:bg-[#004D40] text-white py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer text-xs font-extrabold shadow transition-all">
                      <Camera className="w-4 h-4" />
                      {visionResult.next_photo_target === 'EYE_COMB' ? '📷 Chụp vùng Mắt & Mào gà' :
                       visionResult.next_photo_target === 'POOP_ON_WHITE_PAPER' ? '📷 Chụp bãi phân trên nền sáng / giấy' :
                       visionResult.next_photo_target === 'POST_MORTEM_GIZZARD' ? '📷 Chụp mổ khám nội tạng / dạ dày tuyến' :
                       visionResult.next_photo_target === 'FULL_BODY' ? '📷 Chụp toàn thân / dáng đứng đàn gà' :
                       '📷 Chụp Thêm Góc Ảnh Đề Xuất'}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        capture="environment"
                        onChange={addVisionImages}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}

                {/* What to photograph next */}
                {visionResult.what_to_photograph_next?.length > 0 && (
                  <div className="text-xs text-[#00695C] bg-[#F0FAF9] p-3 rounded-xl space-y-1">
                    <span className="font-bold block">📷 Gợi ý chụp bổ sung:</span>
                    <ul className="list-disc list-inside space-y-0.5">
                      {visionResult.what_to_photograph_next.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                  </div>
                )}

                <div className="p-3 bg-[#FFF3CD] rounded-xl text-xs text-[#1A2332] font-semibold flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-[#FF8F00] shrink-0" />
                  {visionResult.disclaimer}
                </div>

                <a
                  href="tel:18001119"
                  className="w-full btn-primary-cta mt-3 flex items-center justify-center gap-2"
                >
                  <PhoneCall className="w-6 h-6" /> 📞 GỌI TRỰC TIẾP BÁC SĨ THÚ Y
                </a>
              </div>
            )}

          </div>
        )}

        {/* SCREEN 5: FINANCE & LEDGER */}
        {activeTab === 'finance' && (
          <div className="space-y-4 animate-count-up">
            <h2 className="text-xl font-extrabold text-[#00695C]">💵 Sổ Thu Chi & Báo Cáo Tài Chính</h2>

            {/* Hide Revenue / Profit Card for WORKER role — Note 1 */}
            {userRole === 'WORKER' ? (
              <div className="bg-[#FFF8E7] p-4 rounded-2xl border border-[#FF8F00] text-center space-y-1">
                <p className="text-xs font-bold text-[#1A2332]">🧑‍🌾 Chế độ Công Nhân Chuồng</p>
                <p className="text-[11px] text-gray-600">Báo cáo Tổng lợi nhuận & Doanh thu tài chính được ẩn để bảo mật.</p>
              </div>
            ) : (
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm text-center">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Lãi Rồng Dự Kiến Lứa Gà</span>
                <div className="text-3xl sm:text-4xl font-extrabold text-[#2E7D32] my-2">
                  ▲ +{pnlAmount.toLocaleString('vi-VN')} đ
                </div>
                <div className="flex items-center justify-center gap-4 text-xs text-gray-600 font-semibold border-t pt-3">
                  <span>FCR: <strong className="text-[#00695C]">1.65</strong></span>
                  <span>•</span>
                  <span>Giá thành/kg: <strong className="text-[#00695C]">48.000đ</strong></span>
                </div>
              </div>
            )}

            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
              <h3 className="font-bold text-base text-[#1A2332]">Lịch sử giao dịch (Realtime Cloud Firestore)</h3>
              <div className="divide-y">
                {transactions.map((tx) => (
                  <div key={tx.id} className="py-3 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-[#1A2332]">{tx.item}</h4>
                      <span className="text-xs text-gray-500">{tx.date}</span>
                      {tx.status === 'OFFLINE_PENDING' && (
                        <span className="ml-2 text-[10px] font-bold bg-[#FF8F00] text-[#1A2332] px-2 py-0.5 rounded-full">
                          🟧 CHỜ ĐỒNG BỘ (OFFLINE)
                        </span>
                      )}
                    </div>
                    <span className={`font-extrabold text-sm ${
                      tx.type === 'REVENUE' ? 'text-[#2E7D32]' : 'text-[#C62828]'
                    }`}>
                      {tx.type === 'REVENUE' ? '+' : '-'}{tx.amount.toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 6: MARKET & DISEASE MAP */}
        {activeTab === 'market' && (
          <div className="space-y-4 animate-count-up">
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-[#1A2332]">Khu vực: Đồng Nai</h3>
                <span className="text-xs font-bold text-[#2E7D32] bg-[#2E7D32]/10 px-2.5 py-1 rounded-full">
                  ▲ TĂNG 2.000đ/kg
                </span>
              </div>
              <div className="text-3xl font-extrabold text-[#00695C]">56.000 đ/kg</div>
              <div className="p-3 bg-[#F0FAF9] rounded-xl text-xs text-gray-700">
                <span className="font-bold text-[#00695C]">Khuyên AI:</span> Nhu cầu thị trường đang tăng nhẹ. Hộ nuôi gà đạt cân (≥ 2.2kg) có thể cân nhắc xuất bán.
              </div>
              <p className="text-[11px] text-gray-500 italic border-t pt-2">
                ⚠️ Dự báo xu hướng giá mang tính tham khảo, không đảm bảo diễn biến giá thực tế.
              </p>
            </div>
          </div>
        )}

        {/* SCREEN 7: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="space-y-4 animate-count-up">
            <h2 className="text-xl font-extrabold text-[#00695C]">⚙️ Cài Đặt Trang Trại</h2>
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Tên chủ trang trại</label>
                <p className="font-bold text-base text-[#1A2332]">Trại gà Nguyễn Văn A</p>
              </div>
              <div className="flex items-center justify-between border-t pt-3">
                <div>
                  <h4 className="font-bold text-sm text-[#1A2332]">Đọc giọng nói phản hồi (TTS)</h4>
                  <p className="text-xs text-gray-500">AI phát âm thanh đọc lại sau khi ghi thu chi</p>
                </div>
                <input
                  type="checkbox"
                  checked={ttsEnabled}
                  onChange={(e) => setTtsEnabled(e.target.checked)}
                  className="w-6 h-6 accent-[#00695C]"
                />
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 8: SECONDARY USER READ-ONLY DASHBOARD */}
        {activeTab === 'secondary' && (
          <div className="space-y-4 animate-count-up">
            <div className="p-3 bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <UserCheck className="w-4 h-4" /> 👁️ Chế độ Xem Từ Xa dành cho Con cái (Realtime Firestore Cloud)
              </span>
              <span className="bg-white/20 px-2 py-0.5 rounded text-[10px]">7 ngày TTL</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <h3 className="font-bold text-lg text-[#1A2332] text-center">Báo cáo Trại Gà Bố Mẹ (Cloud Realtime)</h3>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 bg-[#F0FAF9] rounded-xl">
                  <span className="text-xs text-gray-500 font-medium">Số gà hiện tại</span>
                  <p className="text-xl font-extrabold text-[#00695C]">500 con</p>
                </div>
                <div className="p-3 bg-[#2E7D32]/10 rounded-xl">
                  <span className="text-xs text-gray-500 font-medium">Lãi rồng hiện tại</span>
                  <p className="text-xl font-extrabold text-[#2E7D32]">▲ +{pnlAmount.toLocaleString('vi-VN')}đ</p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border flex flex-col items-center justify-center gap-2">
                <QrCode className="w-24 h-24 text-[#00695C]" />
                <span className="text-xs font-bold text-gray-700">Mã QR Chia sẻ xem từ xa (Dữ liệu Cloud Firestore Realtime)</span>
                <span className="text-[10px] text-gray-500">Tự động hết hạn sau 7 ngày bảo mật</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenMic={() => setIsMicOpen(true)}
        isReadOnly={userRole === 'FAMILY_VIEWER'}
      />
    </main>
  );
}
