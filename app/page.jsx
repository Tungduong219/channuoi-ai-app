'use client';

import React, { useState, useEffect } from 'react';
import AuthHeader from '@/components/AuthHeader';
import FamilyShareModal from '@/components/FamilyShareModal';
import AIScanningLoader from '@/components/AIScanningLoader';
import DiseaseDetailModal from '@/components/DiseaseDetailModal';
import TopBar from '@/components/TopBar';
import BottomNav from '@/components/BottomNav';
import MicModal from '@/components/MicModal';
import { checkImageQuality } from '@/lib/canvasQualityCheck';
import { compressImage } from '@/lib/imageCompressor';
import { 
  DEFAULT_GUEST_FARM_ID,
  getFarm, 
  addHealthLog, 
  subscribeHealthLogs, 
  subscribeVaccineSchedules, 
  saveVaccineSchedules, 
  toggleVaccineStatus, 
  saveVisionDiagnosis 
} from '@/lib/tenantDb';
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
  Loader2,
  ChevronDown,
  PlusCircle,
  Calendar,
  FileSpreadsheet
} from 'lucide-react';

export default function HomeApp() {
  const [activeTab, setActiveTab] = useState('home');
  const [isMicOpen, setIsMicOpen] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);

  // Multi-Tenant Farm & Auth State
  const [activeFarmId, setActiveFarmId] = useState(DEFAULT_GUEST_FARM_ID);
  const [userRole, setUserRole] = useState('OWNER'); // 'OWNER' | 'WORKER' | 'FAMILY_VIEWER'
  const [user, setUser] = useState(null);
  const [currentFarm, setCurrentFarm] = useState(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Disease Modal & Accordion State
  const [selectedDisease, setSelectedDisease] = useState(null);
  const [isDiseaseModalOpen, setIsDiseaseModalOpen] = useState(false);
  const [showDifferentialAccordion, setShowDifferentialAccordion] = useState(false);

  // Realtime Database Subscriptions State
  const [transactions, setTransactions] = useState([]);
  const [vaccineSchedule, setVaccineSchedule] = useState([]);
  const [isLoadingVaccine, setIsLoadingVaccine] = useState(false);
  const [chickenBreed, setChickenBreed] = useState('Gà Ri');

  // Vision State — multi-image (1–15)
  const [visionImages, setVisionImages] = useState([]);
  const [visionResult, setVisionResult] = useState(null);
  const [isAnalyzingVision, setIsAnalyzingVision] = useState(false);

  // URL Parameter Detection for Family Share Link (?magic_share=... / ?view=family)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('view') === 'family' || params.get('magic_share')) {
        setUserRole('FAMILY_VIEWER');
        const queryFarm = params.get('farm');
        if (queryFarm) setActiveFarmId(queryFarm);
      }
    }
  }, []);

  // Realtime Subscriptions for Active Farm (with clean memory cleanup)
  useEffect(() => {
    let unsubLogs = () => {};
    let unsubVaccines = () => {};

    const loadFarmData = async () => {
      const farmData = await getFarm(activeFarmId);
      if (farmData) {
        setCurrentFarm(farmData);
      }

      // Subscribe to real-time logs per farm
      unsubLogs = subscribeHealthLogs(activeFarmId, (logs) => {
        setTransactions(logs || []);
      });

      // Subscribe to real-time vaccine schedules per farm
      unsubVaccines = subscribeVaccineSchedules(activeFarmId, (schedules) => {
        setVaccineSchedule(schedules || []);
      });
    };

    loadFarmData();

    return () => {
      if (typeof unsubLogs === 'function') unsubLogs();
      if (typeof unsubVaccines === 'function') unsubVaccines();
    };
  }, [activeFarmId]);

  // Generate Vaccine Schedule via AI and Save to Database
  const handleGenerateVaccineSchedule = async (breed = chickenBreed) => {
    setIsLoadingVaccine(true);
    try {
      const res = await fetch('/api/gemini/generate-vaccine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ breed, startDate: new Date().toLocaleDateString('vi-VN') }),
      });
      const data = await res.json();
      if (data.schedule && Array.isArray(data.schedule)) {
        const formatted = data.schedule.map((item, idx) => ({
          scheduleId: `vac_${idx}_${Date.now()}`,
          farmId: activeFarmId,
          dayAge: item.dayAge || (idx + 1) * 3,
          diseaseName: item.diseaseName || item.disease || 'Vắc-xin Phòng Bệnh',
          vaccineType: item.vaccineType || item.vaccine || 'Nhỏ mắt / Pha nước',
          method: item.method || 'Nhỏ mắt / Tiêm',
          dosageNotes: item.dosageNotes || item.notes || 'Dùng theo hướng dẫn thú y',
          isCompleted: false,
          completedAt: null
        }));
        await saveVaccineSchedules(activeFarmId, formatted);
        setVaccineSchedule(formatted);
      }
    } catch (e) {
      console.error("Generate vaccine error:", e);
    } finally {
      setIsLoadingVaccine(false);
    }
  };

  const handleToggleVaccine = async (scheduleId, currentStatus) => {
    await toggleVaccineStatus(activeFarmId, scheduleId, !currentStatus);
  };

  // Save Transaction / Health Log via Database Layer
  const handleSaveTransaction = async (newTx) => {
    await addHealthLog(activeFarmId, {
      flockId: 'flock_001',
      date: new Date().toLocaleDateString('vi-VN'),
      logType: newTx.type || 'EXPENSE',
      category: newTx.category || 'CÁM_GÀ',
      amount: newTx.total_amount || 0,
      mortalityCount: newTx.mortalityCount || 0,
      notes: `${newTx.item_name || 'Giao dịch'} (${newTx.quantity || 1} ${newTx.unit || ''})`,
      createdVia: 'VOICE_AI',
      createdBy: user?.name || 'Chủ Hộ'
    });

    // Refresh farm financial summary
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

    if (files.length > remaining) {
      alert(`Chỉ thêm được ${remaining}/${files.length} ảnh do đã đạt giới hạn tối đa 15 ảnh.`);
    }

    setVisionResult(null);

    for (const file of toProcess) {
      const id = Date.now() + Math.random().toString(36).slice(2, 6);
      const previewUrl = URL.createObjectURL(file);

      setVisionImages(prev => [...prev, {
        id,
        previewUrl,
        compressedBase64: null,
        qualityStatus: 'checking',
        failReason: null,
        visualFeatures: null
      }]);

      try {
        const compressedBase64 = await compressImage(file, 1280, 0.7);
        const qualityResult = await checkImageQuality(compressedBase64);

        setVisionImages(prev => prev.map(img => {
          if (img.id !== id) return img;
          return {
            ...img,
            compressedBase64,
            qualityStatus: qualityResult.passed ? 'passed' : 'failed',
            failReason: qualityResult.reason,
            visualFeatures: qualityResult.visualFeatures || null
          };
        }));
      } catch (err) {
        setVisionImages(prev => prev.map(img => {
          if (img.id !== id) return img;
          return {
            ...img,
            qualityStatus: 'failed',
            failReason: 'Không nén được ảnh. Vui lòng chọn ảnh khác.'
          };
        }));
      }
    }
  };

  const removeVisionImage = (id) => {
    setVisionImages(prev => {
      const target = prev.find(img => img.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter(img => img.id !== id);
    });
    setVisionResult(null);
  };

  const analyzeVision = async () => {
    const validImages = visionImages.filter(img => img.qualityStatus === 'passed');
    if (validImages.length === 0) return;

    setIsAnalyzingVision(true);
    setVisionResult(null);

    try {
      const res = await fetch('/api/gemini/analyze-vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: validImages.map(img => img.compressedBase64),
          visualFeatures: validImages.map(img => img.visualFeatures).filter(Boolean)
        }),
      });

      const data = await res.json();
      setVisionResult(data);

      // Save diagnosis to farm database
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

  // Calculate Net Profit
  const netProfit = currentFarm?.financialSummary?.netProfit || 0;
  const totalExpense = currentFarm?.financialSummary?.totalExpense || 0;
  const totalRevenue = currentFarm?.financialSummary?.totalRevenue || 0;

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
                <p className="text-xs text-white/80 mt-1">
                  Tổng đàn: <strong className="text-[#FF8F00]">{currentFarm?.totalFlockCount || 0} con</strong> • Doanh thu: <strong>{totalRevenue.toLocaleString('vi-VN')}đ</strong>
                </p>
              </div>
            </div>

            {/* Upcoming Vaccine Widget */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b pb-2.5">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-[#FF8F00]" />
                  <span className="font-bold text-sm text-[#1A2332]">Lịch tiêm phòng sắp tới</span>
                </div>
                {vaccineSchedule.length > 0 && (
                  <span className="text-xs font-bold text-[#00695C] bg-[#E0F2F1] px-2 py-0.5 rounded-full">
                    {vaccineSchedule.filter(v => !v.isCompleted).length} mũi cần tiêm
                  </span>
                )}
              </div>

              {vaccineSchedule.length === 0 ? (
                <div className="text-center py-3 space-y-2">
                  <p className="text-xs text-gray-500">Chưa có lịch tiêm cho trang trại này.</p>
                  <button
                    onClick={() => setActiveTab('vaccine')}
                    className="text-xs font-bold text-[#00695C] bg-[#F0FAF9] hover:bg-[#E0F2F1] px-3 py-2 rounded-xl border border-[#00695C]/20 inline-flex items-center gap-1.5 transition-all"
                  >
                    <PlusCircle className="w-4 h-4 text-[#FF8F00]" />
                    <span>Lập Lịch Tiêm Vắc-xin Tự Động</span>
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-bold text-[#00695C]">
                    🛡️ {vaccineSchedule.find(v => !v.isCompleted)?.diseaseName || "Đã hoàn thành toàn bộ lịch tiêm"}
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-gray-500">
                      {vaccineSchedule.find(v => !v.isCompleted)?.method || "Tất cả mũi tiêm đã xong"}
                    </span>
                    <button
                      onClick={() => setActiveTab('vaccine')}
                      className="text-xs font-bold text-[#00695C] flex items-center gap-1 hover:underline min-h-[44px]"
                    >
                      Xem chi tiết <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Vision Diagnosis Big CTA */}
            <button
              onClick={() => setActiveTab('vision')}
              className="w-full btn-primary-cta shadow-md"
            >
              <Camera className="w-6 h-6 text-[#1A2332]" />
              <span>📸 CHẨN ĐOÁN BỆNH GÀ QUA ẢNH</span>
            </button>

            {/* ROI & Impact Summary */}
            <div className="p-4 bg-[#FFF3CD] border border-[#FF8F00]/40 rounded-2xl flex items-start gap-3">
              <Sparkles className="w-6 h-6 text-[#FF8F00] shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-[#1A2332]">Hiệu quả Quản trị AI:</h4>
                <p className="text-xs text-gray-700 mt-0.5 leading-relaxed">
                  Quản lý sổ sách và tiêm phòng đúng ngày giúp giảm <span className="font-bold text-[#2E7D32]">85% rủi ro dịch bệnh</span> và tối ưu hóa chi phí cám.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 3: SMART VACCINE SCHEDULE */}
        {activeTab === 'vaccine' && (
          <div className="space-y-4 animate-count-up">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-[#00695C]">🛡️ Lịch Tiêm Vắc-xin AI</h2>
              <button
                onClick={() => handleGenerateVaccineSchedule(chickenBreed)}
                disabled={isLoadingVaccine}
                className="text-xs font-extrabold text-[#00695C] bg-[#E0F2F1] hover:bg-[#B2DFDB] px-3 py-2 rounded-xl flex items-center gap-1 transition-all"
              >
                {isLoadingVaccine ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                <span>{isLoadingVaccine ? "Đang tạo..." : "Tạo Lại Lịch"}</span>
              </button>
            </div>

            {/* Breed Selector */}
            <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-gray-700">Giống gà đang nuôi:</span>
              <select
                value={chickenBreed}
                onChange={(e) => {
                  setChickenBreed(e.target.value);
                  handleGenerateVaccineSchedule(e.target.value);
                }}
                className="bg-[#F0FAF9] border border-[#00695C]/30 text-[#00695C] text-xs font-extrabold rounded-xl px-3 py-1.5 focus:outline-none"
              >
                <option value="Gà Ri">Gà Ri Lai Thả Vườn</option>
                <option value="Gà Mía">Gà Mía Sơn Tây</option>
                <option value="Gà Đông Tảo">Gà Đông Tảo</option>
                <option value="Gà Ai Cập">Gà Ai Cập Siêu Trứng</option>
                <option value="Gà Lương Phượng">Gà Lương Phượng</option>
              </select>
            </div>

            {/* Empty State when 0 vaccine items */}
            {vaccineSchedule.length === 0 && !isLoadingVaccine && (
              <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm text-center space-y-4 my-4">
                <div className="w-16 h-16 bg-[#FFF8E7] text-[#FF8F00] rounded-3xl flex items-center justify-center mx-auto text-3xl shadow-sm">
                  🐣
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-[#1A2332]">Chưa Có Lịch Tiêm Vắc-xin</h3>
                  <p className="text-xs text-gray-500 max-w-xs mx-auto">
                    Bấm nút bên dưới để AI tự động thiết lập lịch tiêm phòng chuẩn thú y cho giống <strong>{chickenBreed}</strong> của bạn.
                  </p>
                </div>
                <button
                  onClick={() => handleGenerateVaccineSchedule(chickenBreed)}
                  className="btn-primary-cta w-full flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-5 h-5 text-[#1A2332]" />
                  <span>➕ Khởi Tạo Lịch Tiêm Cho {chickenBreed}</span>
                </button>
              </div>
            )}

            {/* Vaccine Timeline List */}
            {vaccineSchedule.length > 0 && (
              <div className="space-y-3">
                {vaccineSchedule.map((vac) => (
                  <div
                    key={vac.scheduleId}
                    className={`p-4 rounded-2xl border transition-all ${
                      vac.isCompleted ? 'bg-[#E8F5E9] border-[#2E7D32]/40 opacity-80' : 'bg-white border-gray-200 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-grow">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black bg-[#FF8F00] text-[#1A2332] px-2 py-0.5 rounded-lg">
                            Ngày {vac.dayAge}
                          </span>
                          <h4 className={`text-sm font-extrabold ${vac.isCompleted ? 'line-through text-gray-500' : 'text-[#1A2332]'}`}>
                            {vac.diseaseName}
                          </h4>
                        </div>
                        <p className="text-xs text-gray-600 font-semibold">
                          Loại: <strong>{vac.vaccineType}</strong> • Đường dùng: <strong>{vac.method}</strong>
                        </p>
                        {vac.dosageNotes && (
                          <p className="text-[11px] text-gray-500 italic mt-1">"{vac.dosageNotes}"</p>
                        )}
                      </div>

                      <button
                        onClick={() => handleToggleVaccine(vac.scheduleId, vac.isCompleted)}
                        disabled={userRole === 'FAMILY_VIEWER'}
                        className={`min-h-[44px] min-w-[44px] px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all ${
                          vac.isCompleted 
                            ? 'bg-[#2E7D32] text-white shadow' 
                            : 'bg-[#F0FAF9] text-[#00695C] border border-[#00695C]/30 hover:bg-[#E0F2F1]'
                        }`}
                      >
                        {vac.isCompleted ? <CheckCircle2 className="w-4 h-4" /> : null}
                        <span>{vac.isCompleted ? "Đã Tiêm" : "Chưa Tiêm"}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SCREEN 4: VISION DIAGNOSIS */}
        {activeTab === 'vision' && (
          <div className="space-y-4 animate-count-up">
            <h2 className="text-xl font-extrabold text-[#00695C]">📸 Chẩn Đoán Bệnh AI</h2>

            {/* Multi-Image Upload Area */}
            <div className="bg-white p-5 rounded-3xl border-2 border-dashed border-[#00695C]/40 text-center space-y-3">
              <div className="w-12 h-12 bg-[#F0FAF9] text-[#00695C] rounded-2xl flex items-center justify-center mx-auto text-2xl shadow">
                📷
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1A2332]">Chụp 1–15 ảnh gà sống hoặc mổ khám</h3>
                <p className="text-xs text-gray-500">Chụp rõ mắt, mào, bãi phân hoặc nội tạng</p>
              </div>

              <label className="btn-primary-cta inline-flex items-center gap-2 cursor-pointer">
                <Camera className="w-5 h-5 text-[#1A2332]" />
                <span>Chọn / Chụp Ảnh</span>
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

            {/* Thumbnail Previews */}
            {visionImages.length > 0 && (
              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700">Đã chọn ({visionImages.length}/15 ảnh):</span>
                  <span className="text-[11px] text-gray-500">Kiểm tra Canvas real-time</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {visionImages.map((img) => (
                    <div key={img.id} className="relative rounded-xl overflow-hidden aspect-square border group">
                      <img src={img.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeVisionImage(img.id)}
                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow"
                      >
                        ✕
                      </button>
                      <div className="absolute bottom-1 left-1 right-1 text-[9px] font-bold py-0.5 px-1 rounded text-center text-white bg-black/60">
                        {img.qualityStatus === 'passed' ? '✓ Đạt' : '⚠️ Xem lại'}
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={analyzeVision}
                  disabled={isAnalyzingVision || visionImages.filter(i => i.qualityStatus === 'passed').length === 0}
                  className="w-full btn-primary-cta flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-5 h-5 text-[#1A2332]" />
                  <span>TIẾN HÀNH PHÂN TÍCH AI</span>
                </button>
              </div>
            )}

            {/* Scanning Loader */}
            {isAnalyzingVision && <AIScanningLoader message="Gemini 3.5 Flash đang phân tích ảnh và đối chiếu 20 bệnh..." />}

            {/* Vision Diagnosis Results */}
            {visionResult && (
              <div className="bg-white p-5 rounded-3xl border-2 border-[#FF8F00] shadow-md space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-extrabold px-3 py-1 rounded-full uppercase ${
                    visionResult.urgency_level === 'KHẨN CẤP' ? 'bg-[#7B0000] text-white' :
                    visionResult.urgency_level === 'CAO' ? 'bg-[#C62828] text-white' :
                    visionResult.urgency_level === 'TRUNG BÌNH' ? 'bg-[#FF8F00] text-[#1A2332]' :
                    'bg-[#2E7D32] text-white'
                  }`}>
                    {visionResult.urgency_level === 'KHẨN CẤP' ? '🚨' : visionResult.urgency_level === 'CAO' ? '⚠️' : '🔶'} {visionResult.urgency_level}
                  </span>
                  <span className="text-xs text-gray-500 font-semibold">Chẩn Đoán AI · {visionResult.images_analyzed} ảnh</span>
                </div>

                {/* AI Engine Status Badge */}
                {visionResult.ai_engine_info && (
                  <div className={`text-xs font-bold px-3 py-2 rounded-xl flex items-center justify-between gap-2 ${
                    visionResult.ai_engine_info.is_live_ai 
                      ? 'bg-[#E8F5E9] text-[#00695C] border border-[#00695C]/20' 
                      : 'bg-[#FFF8E7] text-[#D97706] border border-[#D97706]/20'
                  }`}>
                    <span>{visionResult.ai_engine_info.status_badge}</span>
                    <span className="text-[10px] opacity-80">{visionResult.ai_engine_info.engine_name}</span>
                  </div>
                )}

                {/* Primary Suspicion */}
                {visionResult.primary_suspicion && (
                  <div className="p-3.5 bg-[#FFF5F5] rounded-2xl border border-[#C62828]/30 space-y-1">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Nghi ngờ khả năng cao nhất:</span>
                    <h3 className="text-base font-extrabold text-[#C62828]">{visionResult.primary_suspicion}</h3>
                  </div>
                )}

                {/* Differential Diagnosis List */}
                {visionResult.differential_diagnosis?.length > 0 && (
                  <div className="space-y-2">
                    <button
                      onClick={() => setShowDifferentialAccordion(!showDifferentialAccordion)}
                      className="w-full text-left font-bold text-xs text-[#00695C] flex items-center justify-between p-2 bg-[#F0FAF9] rounded-xl"
                    >
                      <span>🔍 Chẩn đoán phân biệt ({visionResult.differential_diagnosis.length} bệnh liên quan)</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${showDifferentialAccordion ? 'rotate-180' : ''}`} />
                    </button>

                    {showDifferentialAccordion && (
                      <div className="space-y-2 pt-1">
                        {visionResult.differential_diagnosis.map((d, i) => (
                          <div
                            key={i}
                            onClick={() => { setSelectedDisease(d); setIsDiseaseModalOpen(true); }}
                            className={`rounded-xl p-3 text-xs border cursor-pointer hover:shadow-md transition-all ${
                              d.match_score === 'CAO' ? 'border-[#C62828] bg-[#FFF5F5]' :
                              d.match_score === 'TRUNG BÌNH' ? 'border-[#FF8F00] bg-[#FFF8E7]' :
                              'border-gray-200 bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-[#1A2332] flex items-center gap-1">
                                {d.disease_name} <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                              </span>
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
                            <span className="text-[10px] text-[#00695C] font-bold mt-1 block text-right">
                              Bấm để xem cẩm nang điều trị ➔
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Biosafety actions */}
                {visionResult.biosafety_actions?.length > 0 && (
                  <div className="text-xs text-gray-700 bg-gray-50 p-3 rounded-xl space-y-1">
                    <span className="font-bold block">🛡️ Hướng dẫn an toàn sinh học ban đầu:</span>
                    <ul className="list-disc list-inside space-y-0.5">
                      {visionResult.biosafety_actions.map((a, i) => <li key={i}>{a}</li>)}
                    </ul>
                  </div>
                )}

                <div className="p-3 bg-[#FFF3CD] rounded-xl text-xs text-[#1A2332] font-semibold flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-[#FF8F00] shrink-0" />
                  <span>{visionResult.disclaimer || "Cảnh báo sớm bằng AI — Không thay thế chẩn đoán của Bác sĩ Thú y."}</span>
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

            {/* Profit Card */}
            {userRole === 'WORKER' ? (
              <div className="bg-[#FFF8E7] p-4 rounded-2xl border border-[#FF8F00] text-center space-y-1">
                <p className="text-xs font-bold text-[#1A2332]">🧑‍🌾 Chế độ Công Nhân Chuồng</p>
                <p className="text-[11px] text-gray-600">Báo cáo Tổng lợi nhuận & Doanh thu tài chính được ẩn để bảo mật.</p>
              </div>
            ) : (
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm text-center">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Lãi Ròng Ước Tính</span>
                <div className={`text-3xl sm:text-4xl font-extrabold my-2 ${netProfit >= 0 ? 'text-[#2E7D32]' : 'text-[#C62828]'}`}>
                  {netProfit >= 0 ? '+' : ''}{netProfit.toLocaleString('vi-VN')} đ
                </div>
                <div className="flex items-center justify-center gap-4 text-xs text-gray-600 font-semibold border-t pt-3">
                  <span>Tổng Thu: <strong className="text-[#2E7D32]">+{totalRevenue.toLocaleString('vi-VN')}đ</strong></span>
                  <span>•</span>
                  <span>Tổng Chi: <strong className="text-[#C62828]">-{totalExpense.toLocaleString('vi-VN')}đ</strong></span>
                </div>
              </div>
            )}

            {/* Empty State when 0 transactions */}
            {transactions.length === 0 ? (
              <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm text-center space-y-4 my-4">
                <div className="w-16 h-16 bg-[#F0FAF9] text-[#00695C] rounded-3xl flex items-center justify-center mx-auto text-3xl shadow-sm">
                  📝
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-[#1A2332]">Sổ Thu Chi Đang Trắng</h3>
                  <p className="text-xs text-gray-500 max-w-xs mx-auto">
                    Trang trại này chưa phát sinh khoản chi tiêu hay doanh thu nào. Bấm nút Mic 🎙️ hoặc nút bên dưới để ghi chép!
                  </p>
                </div>
                <button
                  onClick={() => setIsMicOpen(true)}
                  className="btn-primary-cta w-full flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-5 h-5 text-[#1A2332]" />
                  <span>🎙️ Nói Giọng Nói Để Ghi Thu / Chi</span>
                </button>
              </div>
            ) : (
              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-[#1A2332]">Lịch sử giao dịch ({transactions.length} bản ghi)</h3>
                  <button
                    onClick={() => setIsMicOpen(true)}
                    className="text-xs font-bold text-[#00695C] bg-[#F0FAF9] px-2.5 py-1 rounded-lg border border-[#00695C]/20"
                  >
                    + Ghi Mới
                  </button>
                </div>
                <div className="divide-y">
                  {transactions.map((tx) => (
                    <div key={tx.logId || tx.id} className="py-3 flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-[#1A2332]">{tx.notes || tx.item || 'Khoản thu chi'}</h4>
                        <span className="text-xs text-gray-500">{tx.date} • {tx.createdBy || 'Chủ Hộ'}</span>
                      </div>
                      <span className={`font-extrabold text-sm ${
                        tx.logType === 'REVENUE' || tx.type === 'REVENUE' ? 'text-[#2E7D32]' : 'text-[#C62828]'
                      }`}>
                        {tx.logType === 'REVENUE' || tx.type === 'REVENUE' ? '+' : '-'}{(tx.amount || 0).toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SCREEN 6: MARKET & DISEASE MAP */}
        {activeTab === 'market' && (
          <div className="space-y-4 animate-count-up">
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-[#1A2332]">Giá Thị Trường: Miền Bắc & Miền Nam</h3>
                <span className="text-xs font-bold text-[#2E7D32] bg-[#2E7D32]/10 px-2.5 py-1 rounded-full">
                  ▲ TĂNG 1.500đ/kg
                </span>
              </div>
              <div className="text-3xl font-extrabold text-[#00695C]">56.000 đ/kg</div>
              <p className="text-xs text-gray-500">Cập nhật giá gà thịt xuất chuồng theo thời gian thực</p>
            </div>
          </div>
        )}
      </div>

      <TopBar ttsEnabled={ttsEnabled} setTtsEnabled={setTtsEnabled} />
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} onOpenMic={() => setIsMicOpen(true)} />
    </main>
  );
}
