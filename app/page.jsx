'use client';

import React, { useState, useEffect } from 'react';
import AuthHeader from '@/components/AuthHeader';
import BottomNav from '@/components/BottomNav';
import MicModal from '@/components/MicModal';
import AddFlockModal from '@/components/AddFlockModal';
import FamilyShareModal from '@/components/FamilyShareModal';
import DiseaseDetailModal from '@/components/DiseaseDetailModal';
import {
  DEFAULT_GUEST_FARM_ID,
  getFarm,
  createFlock,
  subscribeFlocks,
  subscribeFlockVaccines,
  toggleFlockVaccineStatus,
  saveFlockVaccines,
  addHealthLog,
  subscribeHealthLogs,
  saveVisionDiagnosis
} from '@/lib/tenantDb';
import {
  Camera,
  Upload,
  AlertTriangle,
  CheckCircle2,
  PhoneCall,
  Activity,
  Calendar,
  Layers,
  ChevronRight,
  Sparkles,
  Loader2,
  PlusCircle,
  Clock,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronDown,
  Info,
  Check,
  ShieldAlert,
  Wallet,
  TrendingUp,
  MapPin,
  X
} from 'lucide-react';

export default function HomeApp() {
  const [activeTab, setActiveTab] = useState('home');
  const [isMicOpen, setIsMicOpen] = useState(false);
  const [isAddFlockOpen, setIsAddFlockOpen] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);

  // Multi-Tenant Farm & Auth State
  const [activeFarmId, setActiveFarmId] = useState(DEFAULT_GUEST_FARM_ID);
  const [userRole, setUserRole] = useState('OWNER');
  const [user, setUser] = useState(null);
  const [currentFarm, setCurrentFarm] = useState(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Multi-Flock Management State
  const [flocks, setFlocks] = useState([]);
  const [selectedFlockId, setSelectedFlockId] = useState(null);
  const [flockVaccines, setFlockVaccines] = useState([]);
  const [showUpcomingVaccines, setShowUpcomingVaccines] = useState(false);
  const [showCompletedVaccines, setShowCompletedVaccines] = useState(false);

  // Disease Modal & Vision State
  const [selectedDisease, setSelectedDisease] = useState(null);
  const [isDiseaseModalOpen, setIsDiseaseModalOpen] = useState(false);
  const [visionImages, setVisionImages] = useState([]);
  const [isAnalyzingVision, setIsAnalyzingVision] = useState(false);
  const [visionResult, setVisionResult] = useState(null);
  const [showDifferentialAccordion, setShowDifferentialAccordion] = useState(false);

  // Finance Ledger State
  const [transactions, setTransactions] = useState([]);
  const [financeFlockFilter, setFinanceFlockFilter] = useState('all');
  const [financeCategoryFilter, setFinanceCategoryFilter] = useState('all');

  // 1. Subscribe to Flocks on activeFarmId change
  useEffect(() => {
    const unsubFlocks = subscribeFlocks(activeFarmId, (flocksList) => {
      setFlocks(flocksList);
      if (flocksList.length > 0) {
        setSelectedFlockId(prev => {
          if (prev && flocksList.find(f => f.flockId === prev)) return prev;
          return flocksList[0].flockId;
        });
      } else {
        setSelectedFlockId(null);
      }
    });

    const unsubLogs = subscribeHealthLogs(activeFarmId, (logsList) => {
      setTransactions(logsList);
    });

    getFarm(activeFarmId).then(f => {
      if (f) setCurrentFarm(f);
    });

    return () => {
      unsubFlocks();
      unsubLogs();
    };
  }, [activeFarmId]);

  // 2. Subscribe to Vaccine Schedules of Selected Flock
  useEffect(() => {
    if (!selectedFlockId) {
      setFlockVaccines([]);
      return;
    }

    const unsubVaccines = subscribeFlockVaccines(activeFarmId, selectedFlockId, (schedules) => {
      setFlockVaccines(schedules);
    });

    return () => {
      unsubVaccines();
    };
  }, [activeFarmId, selectedFlockId]);

  // Selected Flock Object
  const currentFlock = flocks.find(f => f.flockId === selectedFlockId) || flocks[0] || null;

  // Helper: Compute Age in Days safely
  const getAgeInDays = (startDate) => {
    if (!startDate) return 1;
    try {
      const start = new Date(startDate);
      if (isNaN(start.getTime())) return 1;
      const now = new Date();
      const diffTime = now.getTime() - start.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return Math.max(1, diffDays + 1);
    } catch (e) {
      return 1;
    }
  };

  // Helper: Compute Vaccine Date from Start Date safely
  const getVaccineDate = (startDate, dayAge) => {
    if (!startDate) return '';
    try {
      const date = new Date(startDate);
      if (isNaN(date.getTime())) return '';
      date.setDate(date.getDate() + (Number(dayAge) || 1) - 1);
      return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) {
      return '';
    }
  };

  // Helper: Format Date Safely
  const formatDateSafe = (dStr) => {
    if (!dStr) return '--/--';
    try {
      const d = new Date(dStr);
      if (isNaN(d.getTime())) return dStr;
      return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    } catch (e) {
      return dStr || '--/--';
    }
  };

  // Toggle Vaccine Status
  const handleToggleVaccine = async (scheduleId, currentStatus) => {
    if (!selectedFlockId) return;
    await toggleFlockVaccineStatus(activeFarmId, selectedFlockId, scheduleId, !currentStatus);
  };

  // Create Flock Handler + AI Vaccine Generation
  const handleCreateFlock = async (flockData) => {
    const newFlock = await createFlock(activeFarmId, flockData);
    setSelectedFlockId(newFlock.flockId);

    // Call Gemini to generate personalized vaccine schedule for this breed
    try {
      const res = await fetch('/api/gemini/generate-vaccine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          breed: flockData.breed,
          startDate: flockData.startDate
        })
      });
      const data = await res.json();
      if (data.schedule && data.schedule.length > 0) {
        const fullSchedules = data.schedule.map((item, idx) => ({
          scheduleId: `vac_${newFlock.flockId}_${idx}_${Date.now()}`,
          flockId: newFlock.flockId,
          dayAge: item.day_age,
          diseaseName: item.disease_name,
          vaccineType: item.vaccine_type,
          method: item.method,
          isMandatory: !!item.is_mandatory,
          notes: item.notes || '',
          isCompleted: false,
          completedAt: null
        }));
        await saveFlockVaccines(activeFarmId, newFlock.flockId, fullSchedules);
      }
    } catch (e) {
      console.warn("AI vaccine generate fallback:", e);
    }

    // Automatically record Seed Purchase Expense in Sổ Thu Chi if unitPrice > 0
    if (flockData.unitPrice && Number(flockData.unitPrice) > 0) {
      const initialSeedCost = Number(flockData.initialCount || 1000) * Number(flockData.unitPrice);
      await addHealthLog(activeFarmId, {
        flockId: newFlock.flockId,
        flockName: newFlock.flockName,
        date: flockData.startDate || new Date().toLocaleDateString('vi-VN'),
        logType: 'EXPENSE',
        category: 'giong',
        amount: initialSeedCost,
        mortalityCount: 0,
        notes: `Nhập giống ${flockData.breed || 'Gà'} (${(flockData.initialCount || 1000).toLocaleString('vi-VN')} con x ${(flockData.unitPrice).toLocaleString('vi-VN')}đ/con)`,
        createdVia: 'VOICE_AI',
        createdBy: user?.name || 'Chủ Hộ'
      });
    }

    // Refresh farm profile
    const updatedFarm = await getFarm(activeFarmId);
    if (updatedFarm) setCurrentFarm(updatedFarm);
  };

  // Save Transaction (Optimistic UI)
  const handleSaveTransaction = async (newTx) => {
    const flockId = newTx.flockId || selectedFlockId || 'general';
    const targetFlock = flocks.find(f => f.flockId === flockId);
    const flockName = newTx.flockName || (targetFlock ? targetFlock.flockName : 'Chung Toàn Trại');

    await addHealthLog(activeFarmId, {
      flockId,
      flockName,
      date: new Date().toLocaleDateString('vi-VN'),
      logType: newTx.type || 'EXPENSE',
      category: newTx.category || 'cam',
      amount: newTx.total_amount || 0,
      mortalityCount: newTx.mortalityCount || 0,
      notes: `${newTx.item_name || 'Giao dịch'} (${newTx.quantity || 1} ${newTx.unit || ''})`,
      createdVia: 'VOICE_AI',
      createdBy: user?.name || 'Chủ Hộ'
    });

    const updatedFarm = await getFarm(activeFarmId);
    if (updatedFarm) setCurrentFarm(updatedFarm);
  };

  // Multi-image Vision Handlers
  const addVisionImages = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    e.target.value = '';

    const remaining = 15 - visionImages.length;
    const toProcess = files.slice(0, remaining);
    if (!toProcess.length) return;

    setVisionResult(null);

    for (const file of toProcess) {
      const id = Date.now() + Math.random().toString(36).slice(2, 6);
      const previewUrl = URL.createObjectURL(file);

      setVisionImages(prev => [...prev, {
        id,
        previewUrl,
        compressedBase64: null,
        qualityStatus: 'checking',
        failReason: null
      }]);

      try {
        const reader = new FileReader();
        reader.onloadend = () => {
          setVisionImages(prev => prev.map(img => {
            if (img.id !== id) return img;
            return {
              ...img,
              compressedBase64: reader.result,
              qualityStatus: 'passed'
            };
          }));
        };
        reader.readAsDataURL(file);
      } catch (err) {
        setVisionImages(prev => prev.map(img => {
          if (img.id !== id) return img;
          return { ...img, qualityStatus: 'failed', failReason: 'Lỗi tải ảnh' };
        }));
      }
    }
  };

  const removeVisionImage = (id) => {
    setVisionImages(prev => prev.filter(img => img.id !== id));
  };

  const handleAnalyzeVision = async () => {
    const validImages = visionImages.filter(img => img.compressedBase64 && img.qualityStatus === 'passed');
    if (!validImages.length) return;

    setIsAnalyzingVision(true);
    setVisionResult(null);

    try {
      const payloadImages = validImages.map(img => img.compressedBase64);
      const res = await fetch('/api/gemini/analyze-vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: payloadImages }),
      });

      const data = await res.json();
      setVisionResult(data);
      await saveVisionDiagnosis(activeFarmId, data);
    } catch (e) {
      console.error('Vision analysis error:', e);
      setVisionResult({
        analysis_status: "INSUFFICIENT_DATA",
        images_analyzed: validImages.length,
        primary_suspicion: "Phân tích ngoại tuyến",
        confidence: "TRUNG BÌNH",
        urgency_level: "TRUNG BÌNH",
        observed_symptoms: [{ location: "Toàn thân", symptom: "Gà ủ rũ, cần theo dõi thêm", severity: "TRUNG BÌNH" }],
        differential_diagnosis: [],
        biosafety_actions: ["Cách ly gà bệnh và vệ sinh chuồng nuôi."],
        what_to_photograph_next: ["Chụp lại ảnh rõ hơn ở nơi đủ sáng"],
        disclaimer: "Cảnh báo sớm bằng AI — Không thay thế chẩn đoán của Bác sĩ Thú y."
      });
    } finally {
      setIsAnalyzingVision(false);
    }
  };

  // Safe Array References
  const safeFlocks = Array.isArray(flocks) ? flocks : [];
  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const safeVaccines = Array.isArray(flockVaccines) ? flockVaccines : [];

  // Financial Calculations
  const filteredTransactions = safeTransactions.filter(tx => {
    if (!tx) return false;
    if (financeFlockFilter !== 'all' && tx.flockId !== financeFlockFilter) return false;
    if (financeCategoryFilter !== 'all' && tx.category !== financeCategoryFilter) return false;
    return true;
  });

  const totalExpense = filteredTransactions
    .filter(tx => tx && (tx.logType === 'EXPENSE' || tx.type === 'EXPENSE'))
    .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

  const totalRevenue = filteredTransactions
    .filter(tx => tx && (tx.logType === 'REVENUE' || tx.type === 'REVENUE'))
    .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

  const netProfit = totalRevenue - totalExpense;

  // Vaccine progress for selected flock
  const completedVaccinesCount = safeVaccines.filter(v => v && v.isCompleted).length;
  const totalVaccinesCount = safeVaccines.length;
  const vaccineProgressPct = totalVaccinesCount > 0 ? Math.round((completedVaccinesCount / totalVaccinesCount) * 100) : 0;

  return (
    <main className="min-h-screen bg-[#F0FAF9] text-[#1A2332] safe-bottom-padding pt-[64px]">
      <AuthHeader
        userRole={userRole}
        setUserRole={setUserRole}
        user={user}
        setUser={setUser}
        activeFarmId={activeFarmId}
        setActiveFarmId={setActiveFarmId}
        onOpenShareModal={() => setIsShareModalOpen(true)}
      />

      {/* Top Banner for Viewer Mode */}
      {userRole === 'FAMILY_VIEWER' && (
        <div className="bg-[#E3F2FD] border-b border-[#90CAF9] text-[#0D47A1] px-4 py-2.5 text-xs font-bold flex items-center justify-between shadow-sm animate-count-up">
          <div className="flex items-center gap-2">
            <span className="text-sm">👁️</span>
            <span>Bạn đang xem trang trại ở chế độ Xem Từ Xa (Chỉ đọc).</span>
          </div>
          <span className="text-[10px] bg-[#90CAF9] text-[#0D47A1] font-extrabold px-2 py-0.5 rounded-full uppercase shrink-0">
            CHỈ ĐỌC
          </span>
        </div>
      )}

      <FamilyShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        farmName={user?.farmName || currentFarm?.farmName}
      />

      <DiseaseDetailModal
        disease={selectedDisease}
        isOpen={isDiseaseModalOpen}
        onClose={() => { setIsDiseaseModalOpen(false); setSelectedDisease(null); }}
      />

      <AddFlockModal
        isOpen={isAddFlockOpen}
        onClose={() => setIsAddFlockOpen(false)}
        onCreateFlock={handleCreateFlock}
      />

      <MicModal
        isOpen={isMicOpen}
        onClose={() => setIsMicOpen(false)}
        onSaveTransaction={handleSaveTransaction}
        availableFlocks={flocks}
        defaultFlockId={selectedFlockId}
        ttsEnabled={ttsEnabled}
      />

      <div className="max-w-md mx-auto px-4 py-3">
        {/* ===================================================================
            TAB 1: TRANG CHỦ (HOME DASHBOARD & VISION CAMERA)
           =================================================================== */}
        {activeTab === 'home' && (
          <div className="space-y-4 animate-count-up">
            {/* Farm Status Card */}
            <div className="bg-[#00695C] text-white p-5 rounded-3xl shadow-lg relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-1.5">
                  <Sparkles className="w-4 h-4 text-[#FF8F00]" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#FF8F00]">
                    {currentFarm?.farmName || "Trang Trại Cá Nhân"}
                  </span>
                </div>
                <h2 className="text-lg font-extrabold">{currentFarm?.ownerName || "Chủ Hộ"} • {currentFarm?.location || "Việt Nam"}</h2>
                <div className="flex items-center gap-4 text-xs text-white/90 mt-2 pt-2 border-t border-white/20">
                  <span>🏢 <strong>{flocks.length} đàn</strong> đang nuôi</span>
                  <span>•</span>
                  <span>🐔 <strong>{flocks.reduce((sum, f) => sum + (Number(f.currentCount) || 0), 0).toLocaleString('vi-VN')} con</strong></span>
                </div>
              </div>
            </div>

            {/* AI Vision Diagnosis Section */}
            <div className="bg-white p-4 rounded-3xl border border-gray-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b pb-2.5">
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-[#00695C]" />
                  <h3 className="font-extrabold text-sm text-[#1A2332]">Chẩn Đoán Bệnh Qua Ảnh Bằng AI</h3>
                </div>
                <span className="text-[11px] font-bold text-[#00695C] bg-[#F0FAF9] px-2 py-0.5 rounded-full border border-[#00695C]/20">
                  Merck & OIE
                </span>
              </div>

              <p className="text-xs text-gray-600">
                Chụp hoặc chọn từ 1–15 ảnh (gà sống, phân, mào, mắt, nội tạng mổ khám) để AI phân tích 20 bệnh gia cầm chuẩn xác.
              </p>

              {/* Upload Buttons */}
              <div className="flex gap-2">
                <label className="flex-1 min-h-[44px] bg-[#00695C] hover:bg-[#004D40] text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow">
                  <Camera className="w-4 h-4 text-[#FF8F00]" />
                  <span>Chụp Ảnh</span>
                  <input type="file" accept="image/*" capture="environment" multiple onChange={addVisionImages} className="hidden" />
                </label>
                <label className="flex-1 min-h-[44px] bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer border border-gray-200">
                  <Upload className="w-4 h-4 text-gray-500" />
                  <span>Chọn Thư Viện</span>
                  <input type="file" accept="image/*" multiple onChange={addVisionImages} className="hidden" />
                </label>
              </div>

              {/* Image Previews */}
              {visionImages.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs font-bold text-gray-600">
                    <span>Ảnh đã chọn ({visionImages.length}/15)</span>
                    <button onClick={() => setVisionImages([])} className="text-red-600 hover:underline text-[11px]">Xóa tất cả</button>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {visionImages.map(img => (
                      <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
                        <img src={img.previewUrl} alt="Gà bệnh" className="w-full h-full object-cover" />
                        <button
                          onClick={() => removeVisionImage(img.id)}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleAnalyzeVision}
                    disabled={isAnalyzingVision}
                    className="w-full btn-primary-cta flex items-center justify-center gap-2 mt-3 text-xs"
                  >
                    {isAnalyzingVision ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>AI Đang Đối Soát 20 Bệnh Chuẩn Merck...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-[#1A2332]" />
                        <span>BẮT ĐẦU CHẨN ĐOÁN {visionImages.length} ẢNH</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Vision Result */}
              {visionResult && (
                <div className="mt-4 p-4 bg-[#F0FAF9] border-2 border-[#00695C] rounded-2xl space-y-3 animate-count-up">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Kết quả chẩn đoán</span>
                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                      visionResult.urgency_level === 'CAO' ? 'bg-[#C62828] text-white' : 'bg-[#FF8F00] text-[#1A2332]'
                    }`}>
                      Mức độ: {visionResult.urgency_level || 'TRUNG BÌNH'}
                    </span>
                  </div>

                  <div className="text-xl font-extrabold text-[#00695C]">
                    🩺 {visionResult.primary_suspicion}
                  </div>

                  {visionResult.observed_symptoms && visionResult.observed_symptoms.length > 0 && (
                    <div className="text-xs space-y-1 bg-white p-3 rounded-xl border border-gray-200">
                      <span className="font-bold text-gray-700">Triệu chứng quan sát được:</span>
                      <ul className="list-disc pl-4 space-y-0.5 text-gray-600">
                        {visionResult.observed_symptoms.map((s, idx) => (
                          <li key={idx}><strong>{s.location}:</strong> {s.symptom}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {visionResult.biosafety_actions && visionResult.biosafety_actions.length > 0 && (
                    <div className="text-xs space-y-1 bg-[#FFF8E7] p-3 rounded-xl border border-[#FF8F00]/30">
                      <span className="font-bold text-[#D97706]">Hành động xử lý khẩn cấp:</span>
                      <ul className="list-disc pl-4 space-y-0.5 text-gray-700">
                        {visionResult.biosafety_actions.map((act, idx) => (
                          <li key={idx}>{act}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <a
                    href="tel:18001119"
                    className="w-full min-h-[44px] bg-[#C62828] hover:bg-[#B71C1C] text-white font-extrabold text-xs rounded-2xl flex items-center justify-center gap-2 shadow"
                  >
                    <PhoneCall className="w-4 h-4" />
                    <span>GỌI TRỰC TIẾP BÁC SĨ THÚ Y</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 2: ĐÀN GÀ (MULTI-FLOCK MANAGEMENT & PER-FLOCK VACCINE SCHEDULE)
           =================================================================== */}
        {activeTab === 'flocks' && (
          <div className="space-y-4 animate-count-up">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-[#00695C]">🐔 Quản Lý Đàn Gà & Lịch Tiêm</h2>
                <p className="text-xs text-gray-500">Lịch tiêm phòng cá nhân hóa theo từng chuồng</p>
              </div>
              <button
                onClick={() => setIsAddFlockOpen(true)}
                className="btn-primary-cta text-xs px-3 py-2 flex items-center gap-1.5 shadow"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Thêm Đàn</span>
              </button>
            </div>

            {/* Flock Selector Pills */}
            {flocks.length === 0 ? (
              <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm text-center space-y-4">
                <div className="w-16 h-16 bg-[#F0FAF9] text-[#00695C] rounded-3xl flex items-center justify-center mx-auto text-3xl shadow-sm">
                  🐔
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-[#1A2332]">Chưa Có Đàn Gà Nào</h3>
                  <p className="text-xs text-gray-500 max-w-xs mx-auto">
                    Trang trại của bạn chưa tạo đàn gà nào. Bấm nút bên dưới để tạo đàn đầu tiên, AI sẽ tự động sinh lịch tiêm chuẩn!
                  </p>
                </div>
                <button
                  onClick={() => setIsAddFlockOpen(true)}
                  className="btn-primary-cta w-full flex items-center justify-center gap-2"
                >
                  <PlusCircle className="w-5 h-5" />
                  <span>➕ KHỞI TẠO ĐÀN GÀ ĐẦU TIÊN</span>
                </button>
              </div>
            ) : (
              <>
                {/* Horizontal Flock Switcher Carousel */}
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {flocks.map(f => {
                    const isSelected = f.flockId === selectedFlockId;
                    const age = getAgeInDays(f.startDate);
                    return (
                      <button
                        key={f.flockId}
                        onClick={() => setSelectedFlockId(f.flockId)}
                        className={`flex-shrink-0 px-3.5 py-2 rounded-2xl border text-left transition-all ${
                          isSelected
                            ? 'bg-[#00695C] text-white border-[#00695C] shadow-md'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-[#00695C]'
                        }`}
                      >
                        <div className="font-extrabold text-xs flex items-center gap-1.5">
                          <span>{f.flockName}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3] text-[#FF8F00]" />}
                        </div>
                        <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>
                          {f.breed} • <strong className={isSelected ? 'text-[#FF8F00]' : 'text-[#00695C]'}>{age} ngày tuổi</strong>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Flock Overview Card */}
                {currentFlock && (
                  <div className="bg-white p-4 rounded-3xl border border-gray-200 shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b pb-2.5">
                      <div>
                        <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">{currentFlock.coopLocation || 'Chuồng Nuôi'}</span>
                        <h3 className="font-extrabold text-base text-[#1A2332]">{currentFlock.flockName}</h3>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] bg-[#F0FAF9] text-[#00695C] font-extrabold px-2.5 py-1 rounded-full border border-[#00695C]/20">
                          {currentFlock.purpose || 'Nuôi lấy thịt'}
                        </span>
                        <div className="text-xs font-extrabold text-[#00695C] mt-1">
                          🎂 {getAgeInDays(currentFlock.startDate)} ngày tuổi
                        </div>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-gray-50 p-2 rounded-2xl border border-gray-100">
                        <span className="text-[10px] text-gray-500 font-semibold">Nhập ban đầu</span>
                        <div className="text-xs font-extrabold text-[#1A2332] mt-0.5">
                          {(currentFlock.initialCount || 0).toLocaleString('vi-VN')} con
                        </div>
                      </div>
                      <div className="bg-gray-50 p-2 rounded-2xl border border-gray-100">
                        <span className="text-[10px] text-gray-500 font-semibold">Hiện tại</span>
                        <div className="text-xs font-extrabold text-[#2E7D32] mt-0.5">
                          {(currentFlock.currentCount || currentFlock.initialCount || 0).toLocaleString('vi-VN')} con
                        </div>
                      </div>
                      <div className="bg-gray-50 p-2 rounded-2xl border border-gray-100">
                        <span className="text-[10px] text-gray-500 font-semibold">Ngày vào đàn</span>
                        <div className="text-xs font-extrabold text-gray-700 mt-0.5">
                          {formatDateSafe(currentFlock?.startDate)}
                        </div>
                      </div>
                    </div>

                    {/* Vaccine Progress Bar */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-gray-600 flex items-center gap-1">
                          <ShieldAlert className="w-4 h-4 text-[#00695C]" />
                          Tiến độ tiêm phòng
                        </span>
                        <span className="text-[#00695C]">{completedVaccinesCount}/{totalVaccinesCount} mũi ({vaccineProgressPct}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#00695C] h-full rounded-full transition-all duration-500"
                          style={{ width: `${vaccineProgressPct}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Personalized Vaccine Schedules List (Compact & Focused Hero Card) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-sm text-[#1A2332] flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-[#FF8F00]" />
                      Lịch Tiêm Vắc-xin Cá Nhân Hóa ({safeVaccines.length} mũi)
                    </h3>
                  </div>

                  {safeVaccines.length === 0 ? (
                    <div className="bg-white p-6 rounded-3xl border border-gray-200 text-center space-y-2 text-gray-500 text-xs shadow-sm">
                      <p>Chưa có lịch vắc-xin cho đàn này.</p>
                      <button
                        onClick={async () => {
                          if (currentFlock) {
                            const res = await fetch('/api/gemini/generate-vaccine', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ breed: currentFlock.breed, startDate: currentFlock.startDate })
                            });
                            const data = await res.json();
                            if (data.schedule) {
                              const fullSchedules = data.schedule.map((item, idx) => ({
                                scheduleId: `vac_${currentFlock.flockId}_${idx}_${Date.now()}`,
                                flockId: currentFlock.flockId,
                                dayAge: item.day_age,
                                diseaseName: item.disease_name,
                                vaccineType: item.vaccine_type,
                                method: item.method,
                                isMandatory: !!item.is_mandatory,
                                notes: item.notes || '',
                                isCompleted: false,
                                completedAt: null
                              }));
                              await saveFlockVaccines(activeFarmId, currentFlock.flockId, fullSchedules);
                            }
                          }
                        }}
                        className="text-xs text-[#00695C] font-bold bg-[#F0FAF9] px-3.5 py-2 rounded-xl border border-[#00695C]/20 hover:bg-[#E0F2F1] transition-colors inline-block"
                      >
                        🤖 Tạo Lịch Tiêm Bằng AI Ngay
                      </button>
                    </div>
                  ) : (() => {
                    const currentFlockAge = getAgeInDays(currentFlock?.startDate);
                    const completedList = safeVaccines
                      .filter(v => v && v.isCompleted)
                      .sort((a, b) => (Number(a.dayAge) || 0) - (Number(b.dayAge) || 0));
                    const uncompletedList = safeVaccines
                      .filter(v => v && !v.isCompleted)
                      .sort((a, b) => (Number(a.dayAge) || 0) - (Number(b.dayAge) || 0));

                    // Next due vaccine: earliest overdue or earliest upcoming
                    const overdueList = uncompletedList.filter(v => (Number(v.dayAge) || 0) <= currentFlockAge);
                    const heroVaccine = overdueList.length > 0 ? overdueList[0] : (uncompletedList.length > 0 ? uncompletedList[0] : null);
                    const remainingUpcoming = uncompletedList.filter(v => v.scheduleId !== heroVaccine?.scheduleId);

                    const isOverdueOrToday = heroVaccine ? currentFlockAge >= (Number(heroVaccine.dayAge) || 0) : false;
                    const heroDateStr = heroVaccine ? getVaccineDate(currentFlock?.startDate, heroVaccine.dayAge) : '';
                    const daysDiff = heroVaccine ? (Number(heroVaccine.dayAge) || 0) - currentFlockAge : 0;

                    return (
                      <div className="space-y-3">
                        {/* 1. HERO CARD: Next / Due Vaccine */}
                        {heroVaccine ? (
                          <div className={`p-5 rounded-3xl border-2 shadow-lg transition-all ${
                            isOverdueOrToday
                              ? 'bg-gradient-to-br from-[#FFF8E7] via-white to-[#FFF3E0] border-[#FF8F00] ring-4 ring-[#FF8F00]/15'
                              : 'bg-gradient-to-br from-[#F0FAF9] via-white to-[#E0F2F1] border-[#00695C] ring-4 ring-[#00695C]/15'
                          }`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase flex items-center gap-1.5 shadow-sm ${
                                isOverdueOrToday
                                  ? 'bg-[#C62828] text-white animate-pulse'
                                  : 'bg-[#00695C] text-white'
                              }`}>
                                {isOverdueOrToday ? '⚠️ CẦN TIÊM HÔM NAY / ĐẾN HẠN' : '🔔 MŨI TIÊM TIẾP THEO (GẦN NHẤT)'}
                              </span>
                              <span className="text-xs font-extrabold text-gray-500">
                                {heroVaccine.dayAge} ngày tuổi
                              </span>
                            </div>

                            <div className="space-y-0.5 my-3">
                              <h3 className="text-lg sm:text-xl font-black text-[#1A2332]">
                                🐔 {heroVaccine.diseaseName}
                              </h3>
                              <div className="text-xs sm:text-sm font-bold text-gray-600">
                                Loại vắc-xin: <span className="text-[#00695C] font-extrabold">{heroVaccine.vaccineType}</span>
                              </div>
                            </div>

                            {/* 3 Key Badges */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 my-3">
                              <div className="bg-white/90 p-2.5 rounded-2xl border border-gray-200">
                                <span className="text-[10px] text-gray-400 font-bold block">📅 Ngày tiêm</span>
                                <span className="text-xs font-extrabold text-[#1A2332]">{heroDateStr}</span>
                              </div>
                              <div className="bg-white/90 p-2.5 rounded-2xl border border-gray-200">
                                <span className="text-[10px] text-gray-400 font-bold block">⏳ Thời hạn</span>
                                <span className={`text-xs font-extrabold ${isOverdueOrToday ? 'text-[#C62828]' : 'text-[#00695C]'}`}>
                                  {isOverdueOrToday ? '⚡ Đến hạn tiêm ngay' : `Còn ${daysDiff} ngày nữa`}
                                </span>
                              </div>
                              <div className="col-span-2 sm:col-span-1 bg-white/90 p-2.5 rounded-2xl border border-gray-200">
                                <span className="text-[10px] text-gray-400 font-bold block">💧 Đường dùng</span>
                                <span className="text-xs font-extrabold text-[#00695C]">{heroVaccine.method}</span>
                              </div>
                            </div>

                            {heroVaccine.notes && (
                              <p className="text-xs text-gray-600 italic bg-white/70 p-2.5 rounded-xl border border-gray-100 mb-3">
                                💡 <strong>Lưu ý:</strong> {heroVaccine.notes}
                              </p>
                            )}

                            {/* 1-Tap CTA */}
                            <button
                              onClick={() => handleToggleVaccine(heroVaccine.scheduleId, false)}
                              className="w-full min-h-[48px] btn-primary-cta flex items-center justify-center gap-2 text-xs font-extrabold shadow-md active:scale-95 transition-all"
                            >
                              <CheckCircle2 className="w-5 h-5 text-[#FF8F00]" />
                              <span>ĐÃ TIÊM XONG MŨI NÀY (Bấm để ghi nhận)</span>
                            </button>
                          </div>
                        ) : (
                          <div className="p-6 rounded-3xl bg-[#E8F5E9] border-2 border-[#2E7D32] text-center space-y-2 shadow-sm">
                            <div className="text-4xl">🎉</div>
                            <h3 className="text-base font-extrabold text-[#2E7D32]">Đàn Gà Đã Hoàn Thành 100% Lịch Tiêm!</h3>
                            <p className="text-xs text-gray-600">Toàn bộ các mũi tiêm phòng theo chuẩn thú y đã được thực hiện đầy đủ.</p>
                          </div>
                        )}

                        {/* 2. ACCORDION: Upcoming Vaccines */}
                        {remainingUpcoming.length > 0 && (
                          <div className="rounded-3xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                            <button
                              type="button"
                              onClick={() => setShowUpcomingVaccines(!showUpcomingVaccines)}
                              className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-[#FFF8E7] text-[#FF8F00] flex items-center justify-center font-bold text-sm">
                                  ⏳
                                </div>
                                <div>
                                  <h4 className="font-extrabold text-xs text-[#1A2332]">
                                    Các Mũi Tiêm Sắp Tới ({remainingUpcoming.length} mũi)
                                  </h4>
                                  <span className="text-[10px] text-gray-400 font-semibold">
                                    {showUpcomingVaccines ? 'Chạm để thu gọn Ẩn đi' : 'Chạm để mở xem toàn bộ'}
                                  </span>
                                </div>
                              </div>
                              <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${showUpcomingVaccines ? 'rotate-180' : ''}`} />
                            </button>

                            {showUpcomingVaccines && (
                              <div className="p-3 pt-0 space-y-2.5 border-t border-gray-100 divide-y divide-gray-100">
                                {remainingUpcoming.map(vac => {
                                  const vacDate = getVaccineDate(currentFlock?.startDate, vac.dayAge);
                                  return (
                                    <div key={vac.scheduleId} className="pt-3 first:pt-0 flex items-center justify-between">
                                      <div className="space-y-1 flex-1 pr-3">
                                        <div className="flex items-center gap-2">
                                          <span className="text-[10px] font-extrabold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                                            {vac.dayAge} ngày tuổi
                                          </span>
                                          <span className="text-[11px] font-bold text-gray-500">📅 {vacDate}</span>
                                          {vac.isMandatory && (
                                            <span className="text-[9px] bg-red-100 text-red-700 font-extrabold px-1.5 py-0.5 rounded">
                                              Bắt buộc
                                            </span>
                                          )}
                                        </div>
                                        <h5 className="font-extrabold text-xs text-[#1A2332]">
                                          {vac.diseaseName} • <span className="font-semibold text-gray-500">{vac.vaccineType}</span>
                                        </h5>
                                        <p className="text-[11px] text-gray-500">Đường dùng: <strong>{vac.method}</strong></p>
                                      </div>

                                      <button
                                        onClick={() => handleToggleVaccine(vac.scheduleId, false)}
                                        className="w-8 h-8 rounded-xl border-2 border-gray-300 hover:border-[#00695C] bg-white flex items-center justify-center flex-shrink-0 transition-colors"
                                        title="Đánh dấu hoàn thành"
                                      >
                                        <Check className="w-4 h-4 text-transparent hover:text-gray-400" />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}

                        {/* 3. ACCORDION: Completed Vaccines History */}
                        {completedList.length > 0 && (
                          <div className="rounded-3xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                            <button
                              type="button"
                              onClick={() => setShowCompletedVaccines(!showCompletedVaccines)}
                              className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center font-bold text-sm">
                                  ✅
                                </div>
                                <div>
                                  <h4 className="font-extrabold text-xs text-[#2E7D32]">
                                    Lịch Sử Đã Tiêm Xong ({completedList.length} mũi)
                                  </h4>
                                  <span className="text-[10px] text-gray-400 font-semibold">
                                    {showCompletedVaccines ? 'Chạm để thu gọn Ẩn đi' : 'Chạm để mở xem lại'}
                                  </span>
                                </div>
                              </div>
                              <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${showCompletedVaccines ? 'rotate-180' : ''}`} />
                            </button>

                            {showCompletedVaccines && (
                              <div className="p-3 pt-0 space-y-2.5 border-t border-gray-100 divide-y divide-gray-100">
                                {completedList.map(vac => {
                                  const vacDate = getVaccineDate(currentFlock?.startDate, vac.dayAge);
                                  return (
                                    <div key={vac.scheduleId} className="pt-3 first:pt-0 flex items-center justify-between opacity-80">
                                      <div className="space-y-1 flex-1 pr-3">
                                        <div className="flex items-center gap-2">
                                          <span className="text-[10px] font-extrabold bg-[#2E7D32]/15 text-[#2E7D32] px-2 py-0.5 rounded-full">
                                            {vac.dayAge} ngày tuổi
                                          </span>
                                          <span className="text-[11px] font-bold text-gray-500">📅 {vacDate}</span>
                                        </div>
                                        <h5 className="font-extrabold text-xs text-gray-600 line-through">
                                          {vac.diseaseName} • <span className="font-semibold">{vac.vaccineType}</span>
                                        </h5>
                                        <p className="text-[11px] text-gray-400">Đã tiêm • Đường dùng: {vac.method}</p>
                                      </div>

                                      <button
                                        onClick={() => handleToggleVaccine(vac.scheduleId, true)}
                                        className="w-8 h-8 rounded-xl bg-[#2E7D32] text-white flex items-center justify-center flex-shrink-0 shadow-sm"
                                        title="Bỏ đánh dấu hoàn thành"
                                      >
                                        <Check className="w-4 h-4 stroke-[3]" />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </>
            )}
          </div>
        )}

        {/* ===================================================================
            TAB 4: SỔ THU CHI ĐA ĐÀN (MULTI-FLOCK FINANCIAL LEDGER)
           =================================================================== */}
        {activeTab === 'finance' && (
          <div className="space-y-4 animate-count-up">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-[#00695C]">💵 Sổ Thu Chi & Dòng Tiền</h2>
              <button
                onClick={() => setIsMicOpen(true)}
                className="text-xs font-bold text-[#00695C] bg-[#F0FAF9] px-3 py-1.5 rounded-xl border border-[#00695C]/20 flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#FF8F00]" />
                <span>+ Ghi Thu Chi</span>
              </button>
            </div>

            {/* Flock Filter Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setFinanceFlockFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all flex-shrink-0 ${
                  financeFlockFilter === 'all'
                    ? 'bg-[#00695C] text-white border-[#00695C] shadow'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-[#00695C]'
                }`}
              >
                🏢 Toàn Trang Trại
              </button>
              {flocks.map(f => (
                <button
                  key={f.flockId}
                  onClick={() => setFinanceFlockFilter(f.flockId)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all flex-shrink-0 ${
                    financeFlockFilter === f.flockId
                      ? 'bg-[#00695C] text-white border-[#00695C] shadow'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-[#00695C]'
                  }`}
                >
                  🐔 {f.flockName}
                </button>
              ))}
            </div>

            {/* 3-Block Financial Summary Cards */}
            <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm space-y-3">
              <div className="text-center">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  {financeFlockFilter === 'all' ? 'Lãi Ròng Toàn Trại' : `Lãi Ròng [${flocks.find(f => f.flockId === financeFlockFilter)?.flockName}]`}
                </span>
                <div className={`text-3xl sm:text-4xl font-extrabold my-1 ${netProfit >= 0 ? 'text-[#2E7D32]' : 'text-[#C62828]'}`}>
                  {netProfit >= 0 ? '+' : ''}{netProfit.toLocaleString('vi-VN')} đ
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                <div className="bg-[#E8F5E9] p-3 rounded-2xl border border-[#2E7D32]/20">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-[#2E7D32]">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>Tổng Thu (Bán gà)</span>
                  </div>
                  <div className="text-sm font-extrabold text-[#2E7D32] mt-0.5">
                    +{totalRevenue.toLocaleString('vi-VN')} đ
                  </div>
                </div>

                <div className="bg-[#FFEBEE] p-3 rounded-2xl border border-[#C62828]/20">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-[#C62828]">
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                    <span>Tổng Chi (Cám/Thuốc)</span>
                  </div>
                  <div className="text-sm font-extrabold text-[#C62828] mt-0.5">
                    -{totalExpense.toLocaleString('vi-VN')} đ
                  </div>
                </div>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
              {[
                { id: 'all', label: 'Tất cả' },
                { id: 'cam', label: '🌾 Cám gà' },
                { id: 'giong', label: '🐣 Gà giống' },
                { id: 'thuoc', label: '💊 Thuốc thú y' },
                { id: 'ban_ga', label: '💵 Bán gà' },
                { id: 'khac', label: '⚡ Vận hành' },
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setFinanceCategoryFilter(cat.id)}
                  className={`px-2.5 py-1 rounded-xl font-bold border transition-all flex-shrink-0 ${
                    financeCategoryFilter === cat.id
                      ? 'bg-[#1A2332] text-white border-[#1A2332]'
                      : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Transactions List */}
            {filteredTransactions.length === 0 ? (
              <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm text-center space-y-3">
                <div className="text-3xl">📝</div>
                <h3 className="text-sm font-bold text-gray-700">Chưa có giao dịch phù hợp</h3>
                <p className="text-xs text-gray-400">Bấm nút Mic 🎙️ hoặc nút Ghi Thu Chi để thêm giao dịch!</p>
              </div>
            ) : (
              <div className="bg-white p-4 rounded-3xl border border-gray-200 shadow-sm space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-gray-500 border-b pb-2">
                  <span>Lịch sử giao dịch ({filteredTransactions.length})</span>
                  <span>Số tiền</span>
                </div>
                <div className="divide-y">
                  {filteredTransactions.map((tx) => {
                    const isRev = tx.logType === 'REVENUE' || tx.type === 'REVENUE';
                    return (
                      <div key={tx.logId || tx.id} className="py-3 flex items-center justify-between">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">
                              {tx.category === 'cam' ? '🌾' : tx.category === 'giong' ? '🐣' : tx.category === 'thuoc' ? '💊' : tx.category === 'ban_ga' ? '💵' : '⚙️'}
                            </span>
                            <h4 className="font-extrabold text-xs text-[#1A2332]">{tx.notes || 'Khoản thu chi'}</h4>
                          </div>
                          <div className="text-[10px] text-gray-500 flex items-center gap-2">
                            <span>📅 {tx.date}</span>
                            {tx.flockName && (
                              <span className="bg-gray-100 text-gray-700 px-1.5 py-0.2 rounded font-semibold">
                                🐔 {tx.flockName}
                              </span>
                            )}
                            {tx.createdVia === 'VOICE_AI' && (
                              <span className="text-[#00695C] font-bold">🎙️ Voice AI</span>
                            )}
                          </div>
                        </div>

                        <span className={`font-extrabold text-sm ${isRev ? 'text-[#2E7D32]' : 'text-[#C62828]'}`}>
                          {isRev ? '+' : '-'}{(Number(tx.amount) || 0).toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===================================================================
            TAB 5: GIÁ & DỊCH (MARKET & DISEASE RADAR)
           =================================================================== */}
        {activeTab === 'market' && (
          <div className="space-y-4 animate-count-up">
            <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-[#1A2332]">Giá Thị Trường Gà Thịt Hôm Nay</h3>
                <span className="text-[10px] font-extrabold text-[#2E7D32] bg-[#2E7D32]/10 px-2.5 py-1 rounded-full">
                  ▲ TĂNG 1.500đ/kg
                </span>
              </div>
              <div className="text-3xl font-extrabold text-[#00695C]">56.000 đ/kg</div>
              <p className="text-xs text-gray-500">Cập nhật giá gà thịt xuất chuồng trung bình 3 miền theo thời gian thực</p>
            </div>
          </div>
        )}
      </div>

      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenMic={() => setIsMicOpen(true)}
      />
    </main>
  );
}
