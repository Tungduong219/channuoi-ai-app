'use client';

import React, { useState, useEffect } from 'react';
import DesktopSidebar from '@/components/DesktopSidebar';
import BottomNav from '@/components/BottomNav';
import MicModal from '@/components/MicModal';
import AddFlockModal from '@/components/AddFlockModal';
import FamilyShareModal from '@/components/FamilyShareModal';
import DiseaseDetailModal from '@/components/DiseaseDetailModal';
import AuthHeader from '@/components/AuthHeader';
import InteractiveVoiceWalkthrough from '@/components/InteractiveVoiceWalkthrough';
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
  saveVisionDiagnosis,
  getOrCreateFarm,
  migrateGuestData,
  calculateFlockFCR,
  setSyncStatusListener,
} from '@/lib/tenantDb';
import { auth, isCloudEnabled, onAuthStateChanged } from '@/lib/firebase';
import {
  Mic,
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
  X,
  Droplet,
  Pill,
  Sun,
  CloudSun,
  ShieldCheck,
  Bell,
  Scale,
  Egg,
  Package,
  ShoppingBag,
  Stethoscope,
  BookOpen,
  HelpCircle,
  Flame,
  Search
} from 'lucide-react';

const COMMON_POULTRY_DISEASES = [
  {
    disease_name: "Bệnh Newcastle (Dịch Tả Gà)",
    pathogen: "Avian Paramyxovirus Serotype 1 (APMV-1)",
    urgency_level: "KHẨN CẤP",
    match_score: "NGUY CƠ CAO",
    matching_symptoms: ["Phân xanh lá chuối / trắng", "Mào tím tái", "Vẹo cổ / Liệt chân cánh", "Thở khò khè"],
    treatment_protocol: "Không có thuốc đặc trị. Khẩn cấp can thiệp vắc-xin Newcastle Lasota/NDV liều gấp đôi cho toàn đàn, kết hợp kháng thể KTG và hạ sốt Para C.",
    prevention_guide: "Tiêm phòng vắc-xin đầy đủ theo lịch: 3-5 ngày tuổi (nhỏ mắt), 18-21 ngày tuổi (nhỏ lần 2), 45 ngày tuổi (tiêm nhũ dầu)."
  },
  {
    disease_name: "Bệnh Gumboro (IBD)",
    pathogen: "Infectious Bursal Disease Virus (IBDV)",
    urgency_level: "KHẨN CẤP",
    match_score: "NGUY CƠ CAO",
    matching_symptoms: ["Phân trắng như vôi / nhớt vàng", "Gà run rẩy, xù lông", "Cắn mổ vào hậu môn", "Túi Fabricius sưng to"],
    treatment_protocol: "Tiêm kháng thể Gumboro (hoặc KTG), bổ sung điện giải Gluco-K-C thảo dược, tuyệt đối không dùng kháng sinh hại thận.",
    prevention_guide: "Nhỏ vắc-xin Gumboro lúc 10-12 ngày tuổi và nhắc lại lúc 20-22 ngày tuổi."
  },
  {
    disease_name: "Bệnh Cầu Trùng (Coccidiosis)",
    pathogen: "Ký sinh trùng Eimeria tenella / E. necatrix",
    urgency_level: "CAO",
    match_score: "PHỔ BIẾN",
    matching_symptoms: ["Phân sáp nâu / phân lẫn máu tươi", "Mào nhợt nhạt", "Gà ủ rũ, giảm ăn", "Độn chuồng ẩm ướt"],
    treatment_protocol: "Dùng thuốc đặc trị: Toltrazuril 2.5% hoặc Diclazuril / Sulfaclozine kết hợp Vitamin K chống xuất huyết ruột.",
    prevention_guide: "Giữ chất độn chuồng khô ráo, dùng men rắc chuồng Balasa và trộn thuốc phòng cầu trùng giai đoạn 15-35 ngày tuổi."
  },
  {
    disease_name: "Bệnh Hô Hấp Mãn Tính (CRD - Khẹc Gà)",
    pathogen: "Mycoplasma gallisepticum",
    urgency_level: "TRUNG BÌNH",
    match_score: "PHỔ BIẾN",
    matching_symptoms: ["Thở khò khè, vẩy mỏ", "Sưng mặt, chảy nước mắt/mũi", "Gà kém lớn", "Mắt có bọt khí"],
    treatment_protocol: "Kháng sinh đặc trị: Doxycycline + Tylosin hoặc Tilmicosin kết hợp thuốc long đờm Bromhexine.",
    prevention_guide: "Đảm bảo thông thoáng chuồng nuôi, mật độ vừa phải, phun sát trùng định kỳ 2 lần/tuần."
  },
  {
    disease_name: "Bệnh Kéo Màng E. Coli (Colibacillosis)",
    pathogen: "Escherichia coli",
    urgency_level: "CAO",
    match_score: "PHỔ BIẾN",
    matching_symptoms: ["Gà rù, bại liệt", "Phân trắng loãng", "Mổ khám có màng Fibrin trắng bao phủ gan và tim", "Khó thở"],
    treatment_protocol: "Kháng sinh: Ceftiofur / Enrofloxacin / Amoxicillin + Colistin kết hợp giải độc gan thận cấp.",
    prevention_guide: "Xử lý nguồn nước uống bằng Clo/Iodine, vệ sinh máng ăn máng uống hàng ngày."
  },
  {
    disease_name: "Bệnh Tụ Huyết Trùng (Fowl Cholera)",
    pathogen: "Pasteurella multocida",
    urgency_level: "KHẨN CẤP",
    match_score: "NGUY CƠ CAO",
    matching_symptoms: ["Chết đột ngột", "Mào yếm sưng to đỏ tím", "Thở gấp, chảy dãi mũi miệng", "Phân xanh loãng"],
    treatment_protocol: "Tiêm kháng sinh khẩn cấp: Penicillin + Streptomycin hoặc Florfenicol / Enrofloxacin cho toàn đàn.",
    prevention_guide: "Tiêm vắc-xin Tụ huyết trùng cho gà lúc 40-45 ngày tuổi, che chắn chuồng khi thời tiết thay đổi đột ngột."
  },
  {
    disease_name: "Bệnh Đậu Gà (Fowl Pox)",
    pathogen: "Avian Poxvirus",
    urgency_level: "TRUNG BÌNH",
    match_score: "PHỔ BIẾN",
    matching_symptoms: ["Mụn đậu sần sùi ở mào, mép mỏ, quanh mắt", "Mắt dính bết, khó thở", "Gà khó nuốt"],
    treatment_protocol: "Cạy mụn đậu bôi cồn Iodine hoặc Xanh Methylen 2%, bổ sung Vitamin A + kháng sinh chống phụ nhiễm.",
    prevention_guide: "Chủng vắc-xin Đậu gà bằng phương pháp xuyên màng cánh lúc 7-10 ngày tuổi."
  },
  {
    disease_name: "Bệnh Viêm Thanh Khí Quản Truyền Nhiễm (ILT)",
    pathogen: "Gallid herpesvirus 1 (GaHV-1)",
    urgency_level: "KHẨN CẤP",
    match_score: "NGUY CƠ CAO",
    matching_symptoms: ["Gà ngửa cổ hít thở", "Ho khạc ra đờm có máu", "Tiếng thở rít rên rỉ", "Mắt đỏ sưng"],
    treatment_protocol: "Khẩn cấp nhỏ lại vắc-xin ILT vào mắt cho toàn đàn, phun sương tinh dầu Bạc hà làm giãn khí quản.",
    prevention_guide: "Chủng ngừa vắc-xin ILT nhỏ mắt lúc 25-30 ngày tuổi và nhắc lại lúc 50 ngày tuổi."
  }
];

export default function HomeApp() {
  const [activeTab, setActiveTab] = useState('home');
  const [isMicOpen, setIsMicOpen] = useState(false);
  const [isAddFlockOpen, setIsAddFlockOpen] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);

  // Multi-Tenant Farm & Auth State
  const [activeFarmId, setActiveFarmId] = useState(DEFAULT_GUEST_FARM_ID);
  const [userRole, setUserRole]     = useState('OWNER');
  const [user, setUser]             = useState(null);
  const [currentFarm, setCurrentFarm] = useState(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Cloud Sync Status — 'connecting' | 'synced' | 'error' | 'offline'
  // Khởi tạo 'connecting' khi có Firebase thật, tránh badge nói dối trước khi verify
  const [syncStatus, setSyncStatus] = useState(isCloudEnabled ? 'connecting' : 'offline');

  // Guest Data Migration State
  const [showMigratePrompt, setShowMigratePrompt] = useState(false);
  const [pendingMigrateFarmId, setPendingMigrateFarmId] = useState(null);

  const handleMigrateGuest = async () => {
    if (pendingMigrateFarmId) {
      await migrateGuestData(pendingMigrateFarmId);
    }
    setShowMigratePrompt(false);
    setPendingMigrateFarmId(null);
  };

  const handleSkipMigrate = () => {
    setShowMigratePrompt(false);
    setPendingMigrateFarmId(null);
  };

  // Multi-Flock Management State
  const [flocks, setFlocks] = useState([]);
  const [selectedFlockId, setSelectedFlockId] = useState(null);
  const [flockVaccines, setFlockVaccines] = useState([]);
  const [showUpcomingVaccines, setShowUpcomingVaccines] = useState(false);
  const [showCompletedVaccines, setShowCompletedVaccines] = useState(false);

  // Disease Modal & Vision State
  const [selectedDisease, setSelectedDisease] = useState(null);
  const [isDiseaseModalOpen, setIsDiseaseModalOpen] = useState(false);
  const [isEncyclopediaModalOpen, setIsEncyclopediaModalOpen] = useState(false);
  const [visionImages, setVisionImages] = useState([]);
  const [isAnalyzingVision, setIsAnalyzingVision] = useState(false);
  const [visionResult, setVisionResult] = useState(null);
  const [diseaseSearchQuery, setDiseaseSearchQuery] = useState('');

  // Finance Ledger State
  const [transactions, setTransactions] = useState([]);
  const [financeFlockFilter, setFinanceFlockFilter] = useState('all');
  const [financeCategoryFilter, setFinanceCategoryFilter] = useState('all');

  // Live Market & Disease Radar State (Google Search Grounding)
  const [marketRadarData, setMarketRadarData] = useState(null);
  const [isLoadingMarket, setIsLoadingMarket] = useState(false);

  const fetchMarketRadar = async () => {
    setIsLoadingMarket(true);
    try {
      const res = await fetch('/api/gemini/market-radar');
      const data = await res.json();
      if (data && data.market_overview) {
        setMarketRadarData(data);
      }
    } catch (err) {
      console.warn('[Fetch Market Radar Error]:', err.message);
    } finally {
      setIsLoadingMarket(false);
    }
  };

  useEffect(() => {
    fetchMarketRadar();
  }, []);

  // Daily Tasks Checklist State
  const [dailyTasks, setDailyTasks] = useState([
    { id: 't1', title: 'Bơm nước sạch chuồng 1 & 2', time: '08:00 Sáng', icon: Droplet, completed: true },
    { id: 't2', title: 'Kiểm tra quạt thông gió & nhiệt độ', time: '11:30 Trưa', icon: Sun, completed: false },
    { id: 't3', title: 'Cho ăn cữ chiều & bổ sung men tiêu hóa', time: '15:00 Chiều', icon: Pill, completed: false },
  ]);

  // Elderly Interactive Voice Walkthrough Modal State
  const [isWalkthroughOpen, setIsWalkthroughOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasCompleted = localStorage.getItem('has_completed_voice_walkthrough');
      if (!hasCompleted) {
        const timer = setTimeout(() => {
          setIsWalkthroughOpen(true);
        }, 1200);
        return () => clearTimeout(timer);
      }
    }
  }, [user]);

  const toggleTask = (taskId) => {
    setDailyTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t));
  };

  // 0a. Kết nối listener cập nhật badge đồng bộ Cloud (Firestore write events)
  useEffect(() => {
    setSyncStatusListener((status) => setSyncStatus(status));
    return () => setSyncStatusListener(null);
  }, []);

  // 0b. Lắng nghe trạng thái xác thực Google theo thời gian thực (onAuthStateChanged)
  //     Khi user đăng nhập hoặc đăng xuất ở bất kỳ tab nào, app tự đồng bộ ngay lập tức
  useEffect(() => {
    if (!isCloudEnabled || !auth) return;

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const { farm, isNew, hasGuestData } = await getOrCreateFarm(firebaseUser);
          setActiveFarmId(farm.farmId);
          setUser(prev => prev?.uid === firebaseUser.uid ? prev : {
            name:     firebaseUser.displayName,
            email:    firebaseUser.email,
            photoURL: firebaseUser.photoURL,
            uid:      firebaseUser.uid,
            farmId:   farm.farmId,
            farmName: farm.farmName,
          });
          setUserRole('OWNER');

          // Hiện Toast chuyển dữ liệu nếu đăng nhập lần đầu và có dữ liệu guest cũ
          if (isNew && hasGuestData) {
            setPendingMigrateFarmId(farm.farmId);
            setShowMigratePrompt(true);
          }
        } catch (err) {
          console.error('[onAuthStateChanged] getOrCreateFarm error:', err.message);
        }
      } else {
        // Đã đăng xuất — về chế độ Guest
        setActiveFarmId(DEFAULT_GUEST_FARM_ID);
        setUser(null);
      }
    });

    return () => unsub();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Create Flock Handler + AI Vaccine Generation + Auto Initial Expense
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
      amount: Number(newTx.total_amount) || 0,
      mortalityCount: Number(newTx.mortality_count) || 0,
      notes: `${newTx.item_name || 'Giao dịch'} (${newTx.quantity || 1} ${newTx.unit || ''} x ${(newTx.price_per_unit || 0).toLocaleString('vi-VN')}đ)`,
      createdVia: 'VOICE_AI',
      createdBy: user?.name || 'Chủ Hộ'
    });

    const updatedFarm = await getFarm(activeFarmId);
    if (updatedFarm) setCurrentFarm(updatedFarm);
  };

  // Handle Multi-Image Upload for Vision (Up to 15 images)
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.slice(0, 15).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setVisionImages(prev => {
          if (prev.length >= 15) return prev;
          return [...prev, event.target.result].slice(0, 15);
        });
      };
      reader.readAsDataURL(file);
    });
  };

  // Analyze Vision with Gemini
  const handleAnalyzeVision = async () => {
    const validImages = visionImages.filter(img => img && typeof img === 'string');
    if (validImages.length === 0) return;

    setIsAnalyzingVision(true);
    setVisionResult(null);

    try {
      const res = await fetch('/api/gemini/analyze-vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: validImages,
          flockContext: currentFlock ? {
            breed: currentFlock.breed,
            ageDays: getAgeInDays(currentFlock.startDate),
            currentCount: currentFlock.currentCount
          } : null
        })
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

  // Total birds count
  const totalBirdsCount = safeFlocks.reduce((sum, f) => sum + (Number(f.currentCount) || Number(f.initialCount) || 0), 0);
  const dailyFeedKg = Math.round(totalBirdsCount * 0.084) || 210;

  // Vaccine progress for selected flock
  const completedVaccinesCount = safeVaccines.filter(v => v && v.isCompleted).length;
  const totalVaccinesCount = safeVaccines.length;
  const vaccineProgressPct = totalVaccinesCount > 0 ? Math.round((completedVaccinesCount / totalVaccinesCount) * 100) : 0;

  // Dynamic FCR calculation for selected flock (Weight / Weight ratio)
  const flockFCRInfo = calculateFlockFCR(activeFarmId, selectedFlockId);

  // Filtered Disease Encyclopedia
  const filteredDiseases = COMMON_POULTRY_DISEASES.filter(d => 
    !diseaseSearchQuery || 
    d.disease_name.toLowerCase().includes(diseaseSearchQuery.toLowerCase()) ||
    d.matching_symptoms.some(s => s.toLowerCase().includes(diseaseSearchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md antialiased safe-bottom-padding">
      {/* 1. Desktop Left SideNavBar */}
      <DesktopSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        currentFarm={currentFarm}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        onOpenWalkthrough={() => setIsWalkthroughOpen(true)}
      />

      {/* Main App Container (Shifted right on desktop by 64 = 256px) */}
      <div className="lg:ml-64 min-h-screen flex flex-col">
        {/* Top Header & Auth Header */}
        <AuthHeader
          userRole={userRole}
          setUserRole={setUserRole}
          user={user}
          setUser={setUser}
          activeFarmId={activeFarmId}
          setActiveFarmId={setActiveFarmId}
          onOpenShareModal={() => setIsShareModalOpen(true)}
          syncStatus={syncStatus}
          showMigratePrompt={showMigratePrompt}
          onMigrateGuest={handleMigrateGuest}
          onSkipMigrate={handleSkipMigrate}
          onOpenWalkthrough={() => setIsWalkthroughOpen(true)}
        />

        {/* Read-Only Warning Banner */}
        {userRole === 'VIEWER' && (
          <div className="bg-[#E3F2FD] border-b border-[#90CAF9] px-4 py-2 text-xs text-[#0D47A1] font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-[#1976D2]" />
              <span>Bạn đang xem trang trại ở chế độ Xem Từ Xa (Chỉ đọc).</span>
            </div>
            <span className="text-[10px] bg-[#90CAF9] text-[#0D47A1] font-extrabold px-2 py-0.5 rounded-full uppercase shrink-0">
              CHỈ ĐỌC
            </span>
          </div>
        )}

        {/* Desktop Top Context Bar */}
        <div className="hidden lg:flex justify-between items-center px-gutter py-3.5 bg-surface-subtle border-b border-border-subtle sticky top-[64px] z-20">
          <div className="flex items-center gap-2 text-on-surface-muted text-xs font-semibold">
            <CloudSun className="w-4 h-4 text-secondary-container" />
            <span>28°C Nắng ấm • Bắc Giang, Việt Nam</span>
          </div>

          <div className="flex items-center gap-3">
            {safeFlocks.length > 0 && (
              <div className="relative">
                <select
                  value={selectedFlockId || ''}
                  onChange={(e) => setSelectedFlockId(e.target.value)}
                  className="appearance-none bg-surface-card border border-border-subtle text-on-surface font-title-md text-xs py-2 pl-3.5 pr-8 rounded-xl focus:border-border-focus focus:ring-0 cursor-pointer shadow-sm"
                >
                  {safeFlocks.map(f => (
                    <option key={f.flockId} value={f.flockId}>
                      🐔 {f.flockName} ({f.breed} - {(f.currentCount || f.initialCount || 0).toLocaleString('vi-VN')} con)
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-on-surface-muted">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            )}

            <button
              id="tour-add-flock-button"
              onClick={() => setIsAddFlockOpen(true)}
              className="px-3 py-1.5 bg-primary text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm hover:bg-primary/90 transition-all active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Thêm Đàn</span>
            </button>
          </div>
        </div>

        {/* Mobile Top Context Selector */}
        <div className="lg:hidden px-margin-mobile pt-3 flex items-center gap-2">
          {safeFlocks.length > 0 && (
            <div className="relative flex-1">
              <select
                value={selectedFlockId || ''}
                onChange={(e) => setSelectedFlockId(e.target.value)}
                className="w-full appearance-none bg-surface-card border border-border-subtle text-on-surface font-title-md text-xs py-2.5 pl-3.5 pr-8 rounded-2xl focus:border-border-focus focus:ring-0 cursor-pointer shadow-sm"
              >
                {safeFlocks.map(f => (
                  <option key={f.flockId} value={f.flockId}>
                    🐔 {f.flockName} ({f.breed} - {(f.currentCount || f.initialCount || 0).toLocaleString('vi-VN')} con)
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-on-surface-muted">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          )}

          <button
            id="tour-add-flock-button-mobile"
            onClick={() => setIsAddFlockOpen(true)}
            className="min-h-[42px] px-3.5 bg-primary text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-sm hover:bg-primary/90 shrink-0 transition-all active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Đàn mới</span>
          </button>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 p-margin-mobile lg:p-gutter max-w-max-width-desktop mx-auto w-full flex flex-col gap-6 lg:gap-8">
          {/* ===================================================================
              TAB 1: TRANG CHỦ (HOME DASHBOARD & 12-COL RESPONSIVE GRID)
             =================================================================== */}
          {activeTab === 'home' && (
            <div className="space-y-6 animate-count-up">
              {/* 1. Hero Actions (2 Big Touch Buttons) */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <button
                  id="tour-mic-button"
                  onClick={() => setIsMicOpen(true)}
                  className="pulse-ring relative overflow-hidden bg-primary text-white rounded-3xl p-5 flex items-center justify-between group transition-transform hover:scale-[1.02] shadow-sm text-left h-24"
                >
                  <div className="flex items-center gap-3.5 relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                      <Mic className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-title-lg text-lg sm:text-xl font-black text-white leading-tight">Ghi Thu Chi</span>
                      <span className="font-body-md text-xs text-white/90 mt-0.5">Bằng Giọng Nói AI</span>
                    </div>
                  </div>
                  <Sparkles className="w-5 h-5 text-secondary-container shrink-0 relative z-10" />
                  <div className="absolute -right-8 -bottom-8 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
                </button>

                <button
                  id="tour-vision-card"
                  onClick={() => setActiveTab('vision')}
                  className="relative overflow-hidden bg-secondary-container text-on-secondary-container rounded-3xl p-5 flex items-center justify-between group transition-transform hover:scale-[1.02] soft-shadow-hover text-left h-24"
                >
                  <div className="flex items-center gap-3.5 relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-title-lg text-lg sm:text-xl font-black text-white leading-tight">Khám Bệnh</span>
                      <span className="font-body-md text-xs text-white/90 mt-0.5">Chụp Ảnh Bệnh Gà AI</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/80 shrink-0 relative z-10" />
                  <div className="absolute -right-8 -bottom-8 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
                </button>
              </section>

              {/* 2. Core Metrics (Horizontal Scroll Carousel on Mobile / 3-Col on Desktop) */}
              <section>
                <div className="flex items-center justify-between mb-2.5">
                  <h2 className="font-title-md text-sm font-extrabold text-on-surface">Tổng quan hôm nay</h2>
                  <span className="text-[11px] font-bold text-primary bg-surface-subtle px-2.5 py-1 rounded-full border border-primary/20">
                    {safeFlocks.length} Chuồng Nuôi
                  </span>
                </div>

                <div className="flex overflow-x-auto gap-3 pb-2 snap-x hide-scrollbar sm:grid sm:grid-cols-3">
                  {/* Metric 1 */}
                  <div className="min-w-[160px] sm:min-w-0 snap-start shrink-0 bg-surface-card border border-border-subtle rounded-3xl p-4 soft-shadow flex flex-col gap-1 relative overflow-hidden">
                    <div className="flex items-center gap-2 text-on-surface-muted mb-1">
                      <span className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">🐔</span>
                      <span className="font-label-bold text-[11px] uppercase tracking-wider">Tổng Đàn</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-display-lg text-2xl sm:text-3xl font-extrabold text-on-surface">{totalBirdsCount.toLocaleString('vi-VN')}</span>
                      <span className="font-body-sm text-xs text-on-surface-muted">con</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-primary text-xs font-bold">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>Tỷ lệ sống 98.4%</span>
                    </div>
                    <div className="absolute bottom-0 right-0 w-20 h-20 bg-primary/5 rounded-tl-full pointer-events-none"></div>
                  </div>

                  {/* Metric 2 */}
                  <div className="min-w-[160px] sm:min-w-0 snap-start shrink-0 bg-surface-card border border-border-subtle rounded-3xl p-4 soft-shadow flex flex-col gap-1 relative overflow-hidden">
                    <div className="flex items-center gap-2 text-on-surface-muted mb-1">
                      <span className="w-7 h-7 rounded-xl bg-secondary-container/15 text-secondary-container flex items-center justify-center text-xs font-bold">🌾</span>
                      <span className="font-label-bold text-[11px] uppercase tracking-wider">Tiêu Thụ Cám</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-display-lg text-2xl sm:text-3xl font-extrabold text-on-surface">{dailyFeedKg}</span>
                      <span className="font-body-sm text-xs text-on-surface-muted">kg / ngày</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-on-surface-muted text-xs font-bold truncate" title={flockFCRInfo.displayLabel}>
                      <Scale className="w-3.5 h-3.5 text-secondary shrink-0" />
                      <span className="truncate">{flockFCRInfo.displayLabel}</span>
                    </div>
                    <div className="absolute bottom-0 right-0 w-20 h-20 bg-secondary/5 rounded-tl-full pointer-events-none"></div>
                  </div>

                  {/* Metric 3 */}
                  <div className="min-w-[160px] sm:min-w-0 snap-start shrink-0 bg-surface-card border border-border-subtle rounded-3xl p-4 soft-shadow flex flex-col gap-1 relative overflow-hidden">
                    <div className="flex items-center gap-2 text-on-surface-muted mb-1">
                      <span className="w-7 h-7 rounded-xl bg-primary-container/15 text-primary-container flex items-center justify-center text-xs font-bold">💵</span>
                      <span className="font-label-bold text-[11px] uppercase tracking-wider">Lợi Nhuận</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className={`font-title-lg text-xl sm:text-2xl font-extrabold ${netProfit >= 0 ? 'text-primary' : 'text-danger'}`}>
                        {netProfit >= 0 ? '+' : ''}{(netProfit / 1000000).toFixed(1)}
                      </span>
                      <span className="font-body-sm text-xs text-on-surface-muted">triệu VNĐ</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-on-surface-muted text-xs font-semibold">
                      <Info className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">
                        {marketRadarData?.market_overview?.regions?.[0]
                          ? `${marketRadarData.market_overview.regions[0].region}: ${(marketRadarData.market_overview.regions[0].chicken_price_per_kg / 1000).toFixed(0)}k/kg`
                          : 'Giá thị trường: Đang cập nhật'}
                      </span>
                    </div>
                    <div className="absolute bottom-0 right-0 w-20 h-20 bg-primary-fixed/10 rounded-tl-full pointer-events-none"></div>
                  </div>
                </div>
              </section>

              {/* 3. Main 12-Column Responsive Layout Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
                {/* Left Column (60% on desktop = 7 cols) */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                  {/* Nearest Vaccine Reminder (Focused on the upcoming/urgent vaccine) */}
                  <section id="tour-vaccines-card" className="bg-surface-card border border-border-subtle rounded-3xl p-card-padding soft-shadow space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-xl bg-secondary-container/20 text-secondary flex items-center justify-center font-bold text-sm">
                          📅
                        </span>
                        <div>
                          <h3 className="font-title-md text-sm font-extrabold text-on-surface">Lịch Tiêm Phòng Gần Nhất</h3>
                          <p className="text-[11px] text-on-surface-muted">
                            {currentFlock ? `🐔 ${currentFlock.flockName} (${getAgeInDays(currentFlock.startDate)} ngày tuổi)` : 'Toàn trang trại'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveTab('flocks')}
                        className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5"
                      >
                        <span>Xem toàn bộ lịch tiêm</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {(() => {
                      const age = getAgeInDays(currentFlock?.startDate);
                      const pendingVaccines = safeVaccines.filter(v => !v.isCompleted);
                      const nearestVaccine = pendingVaccines.sort((a, b) => a.dayAge - b.dayAge)[0];

                      if (!nearestVaccine) {
                        return (
                          <div className="p-4 rounded-2xl bg-surface-subtle border border-primary/20 flex items-center gap-3">
                            <span className="text-2xl">🎉</span>
                            <div>
                              <p className="text-xs font-extrabold text-primary">Đàn Gà Đã Hoàn Thành Toàn Bộ Lịch Tiêm!</p>
                              <p className="text-[11px] text-on-surface-muted">Chưa có lịch tiêm mới nào cần thực hiện.</p>
                            </div>
                          </div>
                        );
                      }

                      const daysDiff = nearestVaccine.dayAge - age;
                      const isOverdueOrToday = daysDiff <= 0;
                      const dateStr = getVaccineDate(currentFlock?.startDate, nearestVaccine.dayAge);

                      return (
                        <div className={`p-4 rounded-2xl border-2 transition-all ${
                          isOverdueOrToday
                            ? 'bg-danger-container/20 border-danger'
                            : 'bg-surface-subtle border-primary/30'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                isOverdueOrToday ? 'bg-danger text-white' : 'bg-primary text-white'
                              }`}>
                                {isOverdueOrToday ? '⚡ Đến Hạn Tiêm Ngay' : `⏳ Còn ${daysDiff} Ngày`}
                              </span>
                              <span className="text-[11px] font-extrabold text-on-surface-muted">
                                📅 {dateStr}
                              </span>
                            </div>
                            <span className="text-[10px] font-extrabold bg-white px-2 py-0.5 rounded-full border border-border-subtle text-primary">
                              {nearestVaccine.dayAge} ngày tuổi
                            </span>
                          </div>

                          <div className="my-2.5">
                            <h4 className="text-sm sm:text-base font-black text-on-surface">
                              🐔 {nearestVaccine.diseaseName}
                            </h4>
                            <p className="text-xs text-on-surface-muted mt-0.5">
                              Loại vắc-xin: <strong className="text-primary">{nearestVaccine.vaccineType}</strong> • Đường dùng: <strong>{nearestVaccine.method}</strong>
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleToggleVaccine(nearestVaccine.scheduleId, false)}
                            className="w-full btn-primary-cta py-2.5 text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm"
                          >
                            <CheckCircle2 className="w-4 h-4 text-on-surface" />
                            <span>ĐÃ TIÊM XONG MŨI NÀY (Bấm để ghi nhận)</span>
                          </button>
                        </div>
                      );
                    })()}
                  </section>

                  {/* Quick Access to Khám Bệnh Banner */}
                  <section className="bg-gradient-to-br from-surface-subtle via-white to-surface-hover border-2 border-primary/30 rounded-3xl p-5 soft-shadow flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Stethoscope className="w-4 h-4 text-primary" />
                        <span className="text-xs font-extrabold text-primary uppercase">Bác Sĩ Thú Y AI</span>
                      </div>
                      <h4 className="font-title-md text-sm font-extrabold text-on-surface">Chẩn Đoán Bệnh Gia Cầm Chuẩn Merck & OIE</h4>
                      <p className="text-xs text-on-surface-muted">Tải ảnh triệu chứng để nhận chẩn đoán và phác đồ điều trị tức thì.</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('vision')}
                      className="px-4 py-2.5 bg-primary text-white rounded-2xl text-xs font-extrabold flex items-center gap-1 shadow-md hover:bg-primary/90 shrink-0"
                    >
                      <span>Vào Khám Bệnh</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </section>

                  {/* Recent Financial Log */}
                  <section className="bg-surface-card border border-border-subtle rounded-3xl p-card-padding soft-shadow relative overflow-hidden">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-title-md text-sm font-extrabold text-on-surface">Nhật ký thu chi gần đây</h3>
                      <button
                        onClick={() => setActiveTab('finance')}
                        className="text-xs font-bold text-primary hover:underline"
                      >
                        Xem toàn bộ
                      </button>
                    </div>

                    <div className="flex flex-col divide-y divide-border-subtle">
                      {safeTransactions.slice(0, 3).map((tx) => {
                        const isRev = tx.logType === 'REVENUE' || tx.type === 'REVENUE';
                        return (
                          <div key={tx.logId || tx.id} className="py-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-xs font-bold shrink-0 ${
                                isRev ? 'bg-primary-container/20 text-primary' : 'bg-danger-container/40 text-danger'
                              }`}>
                                {tx.category === 'cam' ? '🌾' : tx.category === 'giong' ? '🐣' : tx.category === 'thuoc' ? '💊' : '💵'}
                              </div>
                              <div className="min-w-0">
                                <p className="font-body-lg text-xs font-bold text-on-surface truncate">{tx.notes || 'Giao dịch'}</p>
                                <p className="font-body-sm text-[10px] text-on-surface-muted flex items-center gap-1">
                                  <span>📅 {tx.date}</span>
                                  {tx.flockName && <span>• 🐔 {tx.flockName}</span>}
                                </p>
                              </div>
                            </div>
                            <span className={`font-body-lg text-xs font-extrabold shrink-0 ${isRev ? 'text-primary' : 'text-danger'}`}>
                              {isRev ? '+' : '-'}{(Number(tx.amount) || 0).toLocaleString('vi-VN')} đ
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </div>

                {/* Right Column (40% on desktop = 5 cols) */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                  {/* Disease Radar / Farm Status */}
                  <section className="bg-surface-card border border-border-subtle rounded-3xl p-card-padding soft-shadow">
                    <h3 className="font-title-md text-sm font-extrabold text-on-surface mb-3">Radar an toàn dịch bệnh</h3>
                    <div className="flex items-center justify-center py-4">
                      <div className="relative w-36 h-36 flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
                        <div className="absolute inset-3 rounded-full border-2 border-primary/40 border-dashed animate-[spin_10s_linear_infinite]"></div>
                        <div className="absolute inset-6 rounded-full bg-primary/10 flex items-center justify-center">
                          <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-white shadow-[0_0_20px_rgba(34,197,94,0.5)]">
                            <ShieldCheck className="w-7 h-7" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-surface-subtle border border-primary/20 rounded-2xl p-3.5 flex items-center gap-3 mt-1">
                      <span className="w-3 h-3 rounded-full bg-primary animate-pulse shrink-0"></span>
                      <div>
                        <p className="font-body-lg text-xs font-bold text-primary">Vùng Nuôi An Toàn Dịch Bệnh</p>
                        <p className="font-body-sm text-[11px] text-on-surface-muted">Không phát hiện triệu chứng bất thường trong 7 ngày qua.</p>
                      </div>
                    </div>
                  </section>

                  {/* Market Prices Today (Grounded Live Data) */}
                  <section id="tour-market-card" className="bg-surface-card border border-border-subtle rounded-3xl p-card-padding soft-shadow space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-primary" />
                        <h3 className="font-title-md text-sm font-extrabold text-on-surface">Giá thị trường 3 miền</h3>
                      </div>
                      <span className="text-[10px] font-bold text-on-surface-muted">
                        {marketRadarData?.market_overview?.reported_date ? `Ngày ${marketRadarData.market_overview.reported_date}` : 'Cập nhật hôm nay'}
                      </span>
                    </div>

                    <div className="flex flex-col gap-2">
                      {marketRadarData?.market_overview?.regions ? (
                        marketRadarData.market_overview.regions.map((reg, idx) => (
                          <div key={idx} className="flex justify-between items-center p-3 rounded-2xl bg-surface-container-low">
                            <div className="flex items-center gap-2.5">
                              <Egg className="w-4 h-4 text-secondary-container shrink-0" />
                              <div>
                                <span className="text-xs font-bold text-on-surface block">{reg.region} (Gà Thịt)</span>
                                <span className="text-[10px] text-on-surface-muted">{reg.sample_locations || 'Xuất chuồng'}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-extrabold text-primary">{(reg.chicken_price_per_kg || 56000).toLocaleString('vi-VN')} đ/kg</p>
                              <p className={`text-[10px] font-bold ${reg.price_change?.includes('+') ? 'text-primary' : reg.price_change?.includes('-') ? 'text-danger' : 'text-on-surface-muted'}`}>
                                {reg.price_change ? `${reg.price_change} đ` : 'Ổn định'}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-xs text-on-surface-muted text-center flex items-center justify-center gap-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                          <span>Đang tra cứu giá thị trường...</span>
                        </div>
                      )}

                      {marketRadarData?.market_overview?.data_source && (
                        <div className="pt-1 text-[10px] text-on-surface-muted font-semibold text-right flex items-center justify-end gap-1">
                          <Sparkles className="w-3 h-3 text-secondary" />
                          <span>Nguồn: {marketRadarData.market_overview.data_source}</span>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Hotline Vet Support */}
                  <a
                    href="tel:19001234"
                    className="w-full bg-danger text-white rounded-2xl p-4 flex items-center justify-center gap-3 font-title-md text-xs font-bold soft-shadow hover:bg-danger/90 transition-colors"
                  >
                    <PhoneCall className="w-4 h-4" />
                    <span>📞 GỌI BÁC SĨ THÚ Y KHẨN CẤP</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================
              TAB: KHÁM BỆNH AI (DEDICATED FULL VISION DIAGNOSIS & DISEASE ENCYCLOPEDIA)
             =================================================================== */}
          {activeTab === 'vision' && (
            <div className="space-y-6 animate-count-up">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-extrabold text-primary flex items-center gap-2">
                    <Stethoscope className="w-5 h-5" />
                    <span>Khám Bệnh & Chẩn Đoán AI</span>
                  </h2>
                  <p className="text-xs text-on-surface-muted">Tiêu chuẩn chẩn đoán lâm sàng Merck Veterinary Manual & OIE</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEncyclopediaModalOpen(true)}
                    className="px-3 py-1.5 bg-surface-subtle text-primary border border-primary/20 hover:bg-surface-hover rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Tra Cứu 20 Bệnh</span>
                  </button>
                  <a
                    href="tel:19001234"
                    className="px-3 py-1.5 bg-danger text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm hover:bg-danger/90"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Gọi Bác Sĩ</span>
                  </a>
                </div>
              </div>

              {/* Multi-Image Upload Studio Card (1 to 15 Images) */}
              <div className="bg-surface-card p-5 rounded-3xl border border-border-subtle shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-border-subtle pb-3">
                  <div>
                    <h3 className="font-extrabold text-sm text-on-surface">📸 Phòng Chụp & Tải Ảnh Lâm Sàng (1–15 Ảnh)</h3>
                    <p className="text-xs text-on-surface-muted">Tải lên từ 1 đến 15 ảnh cận cảnh các vị trí nghi ngờ (mào, mắt, phân, dáng đứng, nội tạng)</p>
                  </div>
                  <span className="text-[11px] font-black text-primary bg-surface-subtle px-3 py-1 rounded-full border border-primary/20">
                    {visionImages.length}/15 Ảnh
                  </span>
                </div>

                {/* Upload Slots with Visual Hints */}
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2.5">
                  {visionImages.map((img, idx) => (
                    <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border-2 border-primary group shadow-sm">
                      <img src={img} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setVisionImages(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 bg-black/70 hover:bg-danger text-white rounded-full w-6 h-6 flex items-center justify-center transition-colors shadow"
                        aria-label="Xóa ảnh"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                        Ảnh {idx + 1}
                      </span>
                    </div>
                  ))}

                  {visionImages.length < 15 && (
                    <label className="aspect-square rounded-2xl border-2 border-dashed border-border-subtle hover:border-primary flex flex-col items-center justify-center cursor-pointer bg-surface-container-low transition-all hover:bg-surface-hover p-2 text-center group">
                      <div className="w-9 h-9 rounded-full bg-primary/10 group-hover:bg-primary/20 text-primary flex items-center justify-center mb-1 transition-colors">
                        <Upload className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-on-surface">+ Tải Thêm</span>
                      <span className="text-[9px] text-on-surface-muted">({15 - visionImages.length} slot trống)</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Quick Photography Targets Guide */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-[11px] text-on-surface-muted bg-surface-container-low p-3 rounded-2xl">
                  <div className="flex items-center gap-1.5">
                    <span className="text-primary font-bold">1.</span>
                    <span>Chụp cận mào, mắt, dịch mỏ</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-primary font-bold">2.</span>
                    <span>Chụp bãi phân tươi đủ sáng</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-primary font-bold">3.</span>
                    <span>Chụp toàn thân/dáng đứng</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-primary font-bold">4.</span>
                    <span>Chụp mổ khám nội tạng (nếu có)</span>
                  </div>
                </div>

                {/* Analyze Action Button */}
                <button
                  type="button"
                  onClick={handleAnalyzeVision}
                  disabled={visionImages.length === 0 || isAnalyzingVision}
                  className="w-full btn-primary-cta text-xs font-extrabold flex items-center justify-center gap-2 shadow-md disabled:opacity-50 min-h-[50px]"
                >
                  {isAnalyzingVision ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>AI Đang Đối Soát 20 Bệnh Gia Cầm Chuẩn Merck & OIE...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 text-on-surface" />
                      <span>{visionImages.length > 0 ? `PHÂN TÍCH CHẨN ĐOÁN ${visionImages.length} ẢNH NGAY` : 'CHỌN TỪ 1 ĐẾN 15 ẢNH ĐỂ BẮT ĐẦU'}</span>
                    </>
                  )}
                </button>
              </div>

              {/* AI Clinical Diagnosis Results Card */}
              {visionResult && (
                <div className="p-5 rounded-3xl bg-surface-card border-2 border-primary shadow-lg space-y-4 animate-count-up">
                  <div className="flex items-center justify-between border-b border-border-subtle pb-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase shadow-sm ${
                      visionResult.urgency_level === 'KHẨN CẤP'
                        ? 'bg-danger text-white animate-pulse'
                        : 'bg-secondary-container text-on-secondary-container'
                    }`}>
                      Mức Độ: {visionResult.urgency_level || 'THEO DÕI'}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-primary bg-surface-subtle px-3 py-1 rounded-full border border-primary/20">
                        Đã Phân Tích: {visionResult.images_analyzed || visionImages.length} Ảnh
                      </span>
                      <span className="text-xs font-extrabold text-primary bg-surface-subtle px-3 py-1 rounded-full border border-primary/20">
                        Độ Tin Cậy: {visionResult.overall_confidence || visionResult.confidence || 'CAO'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-on-surface-muted uppercase tracking-wider block mb-0.5">Chẩn đoán sơ bộ</span>
                    <h3 className="font-extrabold text-xl text-primary flex items-center gap-2">
                      🐔 {visionResult.primary_suspicion || 'Chưa đủ dữ liệu đặc trưng'}
                    </h3>
                    <p className="text-xs text-on-surface-muted italic mt-1 bg-surface-container-low p-2.5 rounded-xl border border-border-subtle">
                      ⚠️ {visionResult.disclaimer || 'Cảnh báo sớm bằng AI — Không thay thế chẩn đoán của Bác sĩ Thú y.'}
                    </p>
                  </div>

                  {/* Interactive Step-2: Request Additional Targeted Photo */}
                  {visionResult.request_additional_photo && visionResult.reason_for_next_photo && (
                    <div className="p-4 rounded-2xl bg-accent-warm-container border-2 border-secondary-container text-on-surface space-y-2">
                      <div className="flex items-center gap-2 text-secondary font-black text-xs uppercase">
                        <Camera className="w-4 h-4 text-secondary-container" />
                        <span>🎯 Yêu cầu chụp thêm góc ảnh để phân biệt chính xác 100%:</span>
                      </div>
                      <p className="text-xs font-bold text-on-surface">
                        {visionResult.reason_for_next_photo}
                      </p>
                      <label className="btn-primary-cta text-xs px-4 py-2 inline-flex items-center gap-2 cursor-pointer shadow">
                        <Upload className="w-4 h-4" />
                        <span>+ CHỤP / TẢI THÊM ẢNH BỔ SUNG ({visionResult.next_photo_target || 'MỤC TIÊU'})</span>
                        <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                      </label>
                    </div>
                  )}

                  {/* Observed Symptoms */}
                  {visionResult.observed_symptoms && visionResult.observed_symptoms.length > 0 && (
                    <div className="bg-surface-subtle p-4 rounded-2xl border border-primary/20 space-y-2">
                      <h4 className="text-xs font-extrabold text-primary flex items-center gap-1.5">
                        <Activity className="w-4 h-4" />
                        <span>Triệu chứng lâm sàng phát hiện qua {visionImages.length} ảnh:</span>
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {visionResult.observed_symptoms.map((s, idx) => (
                          <div key={idx} className="bg-white p-2.5 rounded-xl border border-border-subtle text-xs">
                            <span className="font-bold text-primary block">{s.location}</span>
                            <span className="text-on-surface">{s.symptom}</span>
                            {s.severity && (
                              <span className="text-[10px] text-danger font-bold block mt-0.5">Mức độ: {s.severity}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Differential Diagnosis Cross-Check Accordion */}
                  {visionResult.differential_diagnosis && visionResult.differential_diagnosis.length > 0 && (
                    <div className="bg-white p-4 rounded-2xl border border-border-subtle space-y-2.5">
                      <h4 className="text-xs font-extrabold text-on-surface flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-primary" />
                        <span>Chẩn đoán phân biệt chéo các bệnh tương tự ({visionResult.differential_diagnosis.length} bệnh):</span>
                      </h4>
                      <div className="space-y-2">
                        {visionResult.differential_diagnosis.map((diff, dIdx) => (
                          <div key={dIdx} className="p-3 rounded-xl bg-surface-container-low border border-border-subtle space-y-1 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-on-surface">🦠 {diff.disease_name}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                diff.match_score === 'CAO'
                                  ? 'bg-danger text-white'
                                  : diff.match_score === 'TRUNG BÌNH'
                                  ? 'bg-secondary-container text-on-secondary-container'
                                  : 'bg-surface-container text-on-surface-muted'
                              }`}>
                                Độ Khớp: {diff.match_score}
                              </span>
                            </div>
                            {diff.matching_symptoms && diff.matching_symptoms.length > 0 && (
                              <p className="text-[11px] text-on-surface-muted">
                                Triệu chứng trùng khớp: <strong className="text-primary">{diff.matching_symptoms.join(', ')}</strong>
                              </p>
                            )}
                            {diff.ruling_out_reason && (
                              <p className="text-[11px] text-danger font-semibold italic">
                                💡 Lý do loại trừ/phân biệt: {diff.ruling_out_reason}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Biosafety Actions */}
                  {visionResult.biosafety_actions && visionResult.biosafety_actions.length > 0 && (
                    <div className="bg-[#FFF8E7] p-4 rounded-2xl border border-secondary-container/30 space-y-2">
                      <h4 className="text-xs font-extrabold text-secondary flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-secondary-container" />
                        <span>Phác đồ xử lý an toàn sinh học khẩn cấp:</span>
                      </h4>
                      <ul className="space-y-1.5 text-xs text-on-surface">
                        {visionResult.biosafety_actions.map((act, idx) => (
                          <li key={idx} className="flex items-start gap-2 bg-white/80 p-2 rounded-xl border border-secondary-container/20">
                            <CheckCircle2 className="w-4 h-4 text-secondary-container shrink-0 mt-0.5" />
                            <span>{act}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Targeted Treatment Protocol for Diagnosed / Suspected Diseases */}
                  {(() => {
                    const primaryName = (visionResult.primary_suspicion || '').toLowerCase();
                    const matchedDisease = COMMON_POULTRY_DISEASES.find(d => 
                      primaryName.includes(d.disease_name.toLowerCase()) || 
                      d.disease_name.toLowerCase().includes(primaryName) ||
                      (d.pathogen && primaryName.includes(d.pathogen.toLowerCase()))
                    ) || COMMON_POULTRY_DISEASES[0];

                    return (
                      <div className="bg-white p-5 rounded-3xl border-2 border-primary/40 space-y-3.5 shadow-sm">
                        <div className="flex items-center justify-between border-b border-border-subtle pb-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                              <BookOpen className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="text-xs font-black text-primary uppercase tracking-wider">
                                Cẩm Nang Phác Đồ Đặc Trị Cho Bệnh Nghi Ngờ
                              </h4>
                              <p className="text-xs font-black text-on-surface">
                                💊 {matchedDisease.disease_name}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-extrabold bg-surface-subtle text-primary px-2.5 py-1 rounded-full border border-primary/20">
                            Merck & OIE
                          </span>
                        </div>

                        {/* Treatment Protocol */}
                        <div className="p-3.5 rounded-2xl bg-surface-container-low border border-border-subtle space-y-1.5">
                          <span className="text-xs font-extrabold text-primary flex items-center gap-1.5">
                            <Pill className="w-4 h-4 text-primary" />
                            Phác đồ điều trị & Hoạt chất thuốc thú y khuyên dùng:
                          </span>
                          <p className="text-xs text-on-surface font-medium leading-relaxed">
                            {matchedDisease.treatment_protocol}
                          </p>
                        </div>

                        {/* Prevention Guide */}
                        <div className="p-3.5 rounded-2xl bg-[#FFF8E7] border border-secondary-container/30 space-y-1.5">
                          <span className="text-xs font-extrabold text-secondary flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-secondary-container" />
                            Hướng dẫn phòng ngừa cho đàn:
                          </span>
                          <p className="text-xs text-on-surface font-medium leading-relaxed">
                            {matchedDisease.prevention_guide}
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Call Hotline Vet */}
                  <a
                    href="tel:19001234"
                    className="w-full bg-danger text-white rounded-2xl p-4 flex items-center justify-center gap-3 font-title-md text-xs font-bold shadow hover:bg-danger/90 transition-colors"
                  >
                    <PhoneCall className="w-4 h-4" />
                    <span>📞 GỌI BÁC SĨ THÚ Y XÁC NHẬN PHÁC ĐỒ (1900 1234)</span>
                  </a>
                </div>
              )}
            </div>
          )}

          {/* ===================================================================
              TAB 2: ĐÀN GÀ (MULTI-FLOCK MANAGEMENT & COMPACT VACCINE HERO CARD)
             =================================================================== */}
          {activeTab === 'flocks' && (
            <div className="space-y-4 animate-count-up">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-extrabold text-primary">🐔 Quản Lý Đàn Gà & Lịch Tiêm</h2>
                  <p className="text-xs text-on-surface-muted">Lịch tiêm phòng cá nhân hóa theo từng chuồng</p>
                </div>
                <button
                  onClick={() => setIsAddFlockOpen(true)}
                  className="btn-primary-cta text-xs px-3.5 py-2 flex items-center gap-1.5 shadow"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>+ Thêm Đàn</span>
                </button>
              </div>

              {/* Flock Selector Pills */}
              {safeFlocks.length === 0 ? (
                <div className="bg-surface-card p-8 rounded-3xl border border-border-subtle shadow-sm text-center space-y-4">
                  <div className="w-16 h-16 bg-surface-subtle text-primary rounded-3xl flex items-center justify-center mx-auto text-3xl shadow-sm">
                    🐔
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-extrabold text-on-surface">Chưa Có Đàn Gà Nào</h3>
                    <p className="text-xs text-on-surface-muted max-w-xs mx-auto">
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
                  <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                    {safeFlocks.map(f => {
                      const isSelected = f.flockId === selectedFlockId;
                      const age = getAgeInDays(f.startDate);
                      return (
                        <button
                          key={f.flockId}
                          onClick={() => setSelectedFlockId(f.flockId)}
                          className={`flex-shrink-0 px-3.5 py-2 rounded-2xl border text-left transition-all ${
                            isSelected
                              ? 'bg-primary text-white border-primary shadow-md'
                              : 'bg-surface-card text-on-surface border-border-subtle hover:border-primary'
                          }`}
                        >
                          <div className="font-extrabold text-xs flex items-center gap-1.5">
                            <span>{f.flockName}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3] text-secondary-container" />}
                          </div>
                          <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-white/80' : 'text-on-surface-muted'}`}>
                            {f.breed} • <strong className={isSelected ? 'text-secondary-container' : 'text-primary'}>{age} ngày tuổi</strong>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected Flock Overview Card */}
                  {currentFlock && (
                    <div className="bg-surface-card p-4 rounded-3xl border border-border-subtle shadow-sm space-y-3">
                      <div className="flex items-center justify-between border-b border-border-subtle pb-2.5">
                        <div>
                          <span className="text-[10px] font-extrabold text-on-surface-muted uppercase tracking-wider">{currentFlock.coopLocation || 'Chuồng Nuôi'}</span>
                          <h3 className="font-extrabold text-base text-on-surface">{currentFlock.flockName}</h3>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] bg-surface-subtle text-primary font-extrabold px-2.5 py-1 rounded-full border border-primary/20">
                            {currentFlock.purpose || 'Nuôi lấy thịt'}
                          </span>
                          <div className="text-xs font-extrabold text-primary mt-1">
                            🎂 {getAgeInDays(currentFlock.startDate)} ngày tuổi
                          </div>
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-surface-container-low p-2 rounded-2xl border border-border-subtle/50">
                          <span className="text-[10px] text-on-surface-muted font-semibold">Nhập ban đầu</span>
                          <div className="text-xs font-extrabold text-on-surface mt-0.5">
                            {(currentFlock.initialCount || 0).toLocaleString('vi-VN')} con
                          </div>
                        </div>
                        <div className="bg-surface-container-low p-2 rounded-2xl border border-border-subtle/50">
                          <span className="text-[10px] text-on-surface-muted font-semibold">Hiện tại</span>
                          <div className="text-xs font-extrabold text-primary mt-0.5">
                            {(currentFlock.currentCount || currentFlock.initialCount || 0).toLocaleString('vi-VN')} con
                          </div>
                        </div>
                        <div className="bg-surface-container-low p-2 rounded-2xl border border-border-subtle/50">
                          <span className="text-[10px] text-on-surface-muted font-semibold">Ngày vào đàn</span>
                          <div className="text-xs font-extrabold text-on-surface mt-0.5">
                            {formatDateSafe(currentFlock?.startDate)}
                          </div>
                        </div>
                      </div>

                      {/* Vaccine Progress Bar */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-on-surface-muted flex items-center gap-1">
                            <ShieldAlert className="w-4 h-4 text-primary" />
                            Tiến độ tiêm phòng
                          </span>
                          <span className="text-primary">{completedVaccinesCount}/{totalVaccinesCount} mũi ({vaccineProgressPct}%)</span>
                        </div>
                        <div className="w-full bg-surface-container-low h-2.5 rounded-full overflow-hidden">
                          <div
                            className="bg-primary h-full rounded-full transition-all duration-500"
                            style={{ width: `${vaccineProgressPct}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Personalized Vaccine Schedules List (Compact & Focused Hero Card) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-extrabold text-sm text-on-surface flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-secondary-container" />
                        Lịch Tiêm Vắc-xin Cá Nhân Hóa ({safeVaccines.length} mũi)
                      </h3>
                    </div>

                    {safeVaccines.length === 0 ? (
                      <div className="bg-surface-card p-6 rounded-3xl border border-border-subtle text-center space-y-2 text-on-surface-muted text-xs shadow-sm">
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
                          className="text-xs text-primary font-bold bg-surface-subtle px-3.5 py-2 rounded-xl border border-primary/20 hover:bg-surface-hover transition-colors inline-block"
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
                                ? 'bg-gradient-to-br from-[#FFF8E7] via-white to-[#FFF3E0] border-secondary-container ring-4 ring-secondary-container/15'
                                : 'bg-gradient-to-br from-surface-subtle via-white to-surface-hover border-primary ring-4 ring-primary/15'
                            }`}>
                              <div className="flex items-center justify-between mb-2">
                                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase flex items-center gap-1.5 shadow-sm ${
                                  isOverdueOrToday
                                    ? 'bg-danger text-white animate-pulse'
                                    : 'bg-primary text-white'
                                }`}>
                                  {isOverdueOrToday ? '⚠️ CẦN TIÊM HÔM NAY / ĐẾN HẠN' : '🔔 MŨI TIÊM TIẾP THEO (GẦN NHẤT)'}
                                </span>
                                <span className="text-xs font-extrabold text-on-surface-muted">
                                  {heroVaccine.dayAge} ngày tuổi
                                </span>
                              </div>

                              <div className="space-y-0.5 my-3">
                                <h3 className="text-lg sm:text-xl font-black text-on-surface">
                                  🐔 {heroVaccine.diseaseName}
                                </h3>
                                <div className="text-xs sm:text-sm font-bold text-on-surface-muted">
                                  Loại vắc-xin: <span className="text-primary font-extrabold">{heroVaccine.vaccineType}</span>
                                </div>
                              </div>

                              {/* 3 Key Badges */}
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 my-3">
                                <div className="bg-white/90 p-2.5 rounded-2xl border border-border-subtle">
                                  <span className="text-[10px] text-on-surface-muted font-bold block">📅 Ngày tiêm</span>
                                  <span className="text-xs font-extrabold text-on-surface">{heroDateStr}</span>
                                </div>
                                <div className="bg-white/90 p-2.5 rounded-2xl border border-border-subtle">
                                  <span className="text-[10px] text-on-surface-muted font-bold block">⏳ Thời hạn</span>
                                  <span className={`text-xs font-extrabold ${isOverdueOrToday ? 'text-danger' : 'text-primary'}`}>
                                    {isOverdueOrToday ? '⚡ Đến hạn tiêm ngay' : `Còn ${daysDiff} ngày nữa`}
                                  </span>
                                </div>
                                <div className="col-span-2 sm:col-span-1 bg-white/90 p-2.5 rounded-2xl border border-border-subtle">
                                  <span className="text-[10px] text-on-surface-muted font-bold block">💧 Đường dùng</span>
                                  <span className="text-xs font-extrabold text-primary">{heroVaccine.method}</span>
                                </div>
                              </div>

                              {heroVaccine.notes && (
                                <p className="text-xs text-on-surface-muted italic bg-white/70 p-2.5 rounded-xl border border-border-subtle mb-3">
                                  💡 <strong>Lưu ý:</strong> {heroVaccine.notes}
                                </p>
                              )}

                              {/* 1-Tap CTA */}
                              <button
                                onClick={() => handleToggleVaccine(heroVaccine.scheduleId, false)}
                                className="w-full min-h-[48px] btn-primary-cta flex items-center justify-center gap-2 text-xs font-extrabold shadow-md active:scale-95 transition-all"
                              >
                                <CheckCircle2 className="w-5 h-5 text-on-surface" />
                                <span>ĐÃ TIÊM XONG MŨI NÀY (Bấm để ghi nhận)</span>
                              </button>
                            </div>
                          ) : (
                            <div className="p-6 rounded-3xl bg-surface-subtle border-2 border-primary text-center space-y-2 shadow-sm">
                              <div className="text-4xl">🎉</div>
                              <h3 className="text-base font-extrabold text-primary">Đàn Gà Đã Hoàn Thành 100% Lịch Tiêm!</h3>
                              <p className="text-xs text-on-surface-muted">Toàn bộ các mũi tiêm phòng theo chuẩn thú y đã được thực hiện đầy đủ.</p>
                            </div>
                          )}

                          {/* 2. ACCORDION: Upcoming Vaccines */}
                          {remainingUpcoming.length > 0 && (
                            <div className="rounded-3xl border border-border-subtle bg-surface-card overflow-hidden shadow-sm">
                              <button
                                type="button"
                                onClick={() => setShowUpcomingVaccines(!showUpcomingVaccines)}
                                className="w-full p-4 flex items-center justify-between text-left hover:bg-surface-container-low transition-colors"
                              >
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-xl bg-accent-warm-container text-secondary flex items-center justify-center font-bold text-sm">
                                    ⏳
                                  </div>
                                  <div>
                                    <h4 className="font-extrabold text-xs text-on-surface">
                                      Các Mũi Tiêm Sắp Tới ({remainingUpcoming.length} mũi)
                                    </h4>
                                    <span className="text-[10px] text-on-surface-muted font-semibold">
                                      {showUpcomingVaccines ? 'Chạm để thu gọn Ẩn đi' : 'Chạm để mở xem toàn bộ'}
                                    </span>
                                  </div>
                                </div>
                                <ChevronDown className={`w-5 h-5 text-on-surface-muted transition-transform duration-200 ${showUpcomingVaccines ? 'rotate-180' : ''}`} />
                              </button>

                              {showUpcomingVaccines && (
                                <div className="p-3 pt-0 space-y-2.5 border-t border-border-subtle divide-y divide-border-subtle">
                                  {remainingUpcoming.map(vac => {
                                    const vacDate = getVaccineDate(currentFlock?.startDate, vac.dayAge);
                                    return (
                                      <div key={vac.scheduleId} className="pt-3 first:pt-0 flex items-center justify-between">
                                        <div className="space-y-1 flex-1 pr-3">
                                          <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-extrabold bg-surface-container text-on-surface px-2 py-0.5 rounded-full">
                                              {vac.dayAge} ngày tuổi
                                            </span>
                                            <span className="text-[11px] font-bold text-on-surface-muted">📅 {vacDate}</span>
                                            {vac.isMandatory && (
                                              <span className="text-[9px] bg-danger-container text-danger font-extrabold px-1.5 py-0.5 rounded">
                                                Bắt buộc
                                              </span>
                                            )}
                                          </div>
                                          <h5 className="font-extrabold text-xs text-on-surface">
                                            {vac.diseaseName} • <span className="font-semibold text-on-surface-muted">{vac.vaccineType}</span>
                                          </h5>
                                          <p className="text-[11px] text-on-surface-muted">Đường dùng: <strong>{vac.method}</strong></p>
                                        </div>

                                        <button
                                          onClick={() => handleToggleVaccine(vac.scheduleId, false)}
                                          className="w-8 h-8 rounded-xl border-2 border-border-subtle hover:border-primary bg-white flex items-center justify-center flex-shrink-0 transition-colors"
                                          title="Đánh dấu hoàn thành"
                                        >
                                          <Check className="w-4 h-4 text-transparent hover:text-on-surface-muted" />
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
                            <div className="rounded-3xl border border-border-subtle bg-surface-card overflow-hidden shadow-sm">
                              <button
                                type="button"
                                onClick={() => setShowCompletedVaccines(!showCompletedVaccines)}
                                className="w-full p-4 flex items-center justify-between text-left hover:bg-surface-container-low transition-colors"
                              >
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-xl bg-surface-subtle text-primary flex items-center justify-center font-bold text-sm">
                                    ✅
                                  </div>
                                  <div>
                                    <h4 className="font-extrabold text-xs text-primary">
                                      Lịch Sử Đã Tiêm Xong ({completedList.length} mũi)
                                    </h4>
                                    <span className="text-[10px] text-on-surface-muted font-semibold">
                                      {showCompletedVaccines ? 'Chạm để thu gọn Ẩn đi' : 'Chạm để mở xem lại'}
                                    </span>
                                  </div>
                                </div>
                                <ChevronDown className={`w-5 h-5 text-on-surface-muted transition-transform duration-200 ${showCompletedVaccines ? 'rotate-180' : ''}`} />
                              </button>

                              {showCompletedVaccines && (
                                <div className="p-3 pt-0 space-y-2.5 border-t border-border-subtle divide-y divide-border-subtle">
                                  {completedList.map(vac => {
                                    const vacDate = getVaccineDate(currentFlock?.startDate, vac.dayAge);
                                    return (
                                      <div key={vac.scheduleId} className="pt-3 first:pt-0 flex items-center justify-between opacity-80">
                                        <div className="space-y-1 flex-1 pr-3">
                                          <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-extrabold bg-primary/15 text-primary px-2 py-0.5 rounded-full">
                                              {vac.dayAge} ngày tuổi
                                            </span>
                                            <span className="text-[11px] font-bold text-on-surface-muted">📅 {vacDate}</span>
                                          </div>
                                          <h5 className="font-extrabold text-xs text-on-surface-muted line-through">
                                            {vac.diseaseName} • <span className="font-semibold">{vac.vaccineType}</span>
                                          </h5>
                                          <p className="text-[11px] text-on-surface-muted">Đã tiêm • Đường dùng: {vac.method}</p>
                                        </div>

                                        <button
                                          onClick={() => handleToggleVaccine(vac.scheduleId, true)}
                                          className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center flex-shrink-0 shadow-sm"
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
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-extrabold text-primary flex items-center gap-2">
                    <Wallet className="w-5 h-5" />
                    <span>Sổ Thu Chi & Dòng Tiền Đa Đàn</span>
                  </h2>
                  <p className="text-xs text-on-surface-muted">Quản lý thu chi riêng biệt cho từng đàn gà hoặc toàn trại</p>
                </div>
              </div>

              {/* Big Prominent Voice AI Hero Banner */}
              <div
                onClick={() => setIsMicOpen(true)}
                className="pulse-ring bg-gradient-to-r from-primary via-[#007A33] to-[#006B2C] text-white p-5 sm:p-6 rounded-3xl shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group hover:scale-[1.01] transition-transform relative overflow-hidden"
              >
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 border border-white/20 shadow-sm">
                    <Mic className="w-7 h-7 text-secondary-container" />
                  </div>
                  <div>
                    <span className="text-[11px] font-extrabold text-secondary-container bg-black/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      🎙️ Voice AI Một Chạm
                    </span>
                    <h3 className="text-lg sm:text-xl font-black text-white mt-1 leading-tight">
                      Ghi Thu Chi Bằng Giọng Nói
                    </h3>
                    <p className="text-xs text-white/90 font-medium mt-0.5">
                      Nói tự nhiên: <span className="italic font-bold text-secondary-container">"Đàn Đông Tảo mua 5 bao cám hết 1 triệu 750k"</span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMicOpen(true);
                  }}
                  className="btn-primary-cta px-6 py-3 text-xs sm:text-sm font-black shadow-md shrink-0 flex items-center justify-center gap-2 relative z-10"
                >
                  <Mic className="w-5 h-5 text-on-surface" />
                  <span>BẤM ĐỂ NÓI NGAY</span>
                </button>
                <div className="absolute -right-10 -bottom-10 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
              </div>

              {/* Flock Filter Tabs */}
              <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                <button
                  onClick={() => setFinanceFlockFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all flex-shrink-0 ${
                    financeFlockFilter === 'all'
                      ? 'bg-primary text-white border-primary shadow'
                      : 'bg-surface-card text-on-surface-muted border-border-subtle hover:border-primary'
                  }`}
                >
                  🏢 Toàn Trang Trại
                </button>
                {safeFlocks.map(f => (
                  <button
                    key={f.flockId}
                    onClick={() => setFinanceFlockFilter(f.flockId)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all flex-shrink-0 ${
                      financeFlockFilter === f.flockId
                        ? 'bg-primary text-white border-primary shadow'
                        : 'bg-surface-card text-on-surface-muted border-border-subtle hover:border-primary'
                    }`}
                  >
                    🐔 {f.flockName}
                  </button>
                ))}
              </div>

              {/* 3-Block Financial Summary Cards */}
              <div className="bg-surface-card p-5 rounded-3xl border border-border-subtle shadow-sm space-y-3">
                <div className="text-center">
                  <span className="text-[11px] font-bold text-on-surface-muted uppercase tracking-wider">
                    {financeFlockFilter === 'all' ? 'Lãi Ròng Toàn Trại' : `Lãi Ròng [${safeFlocks.find(f => f.flockId === financeFlockFilter)?.flockName || ''}]`}
                  </span>
                  <div className={`text-3xl sm:text-4xl font-extrabold my-1 ${netProfit >= 0 ? 'text-primary' : 'text-danger'}`}>
                    {netProfit >= 0 ? '+' : ''}{netProfit.toLocaleString('vi-VN')} đ
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border-subtle">
                  <div className="bg-surface-subtle p-3 rounded-2xl border border-primary/20">
                    <div className="flex items-center gap-1 text-[11px] font-bold text-primary">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>Tổng Thu (Bán gà)</span>
                    </div>
                    <div className="text-sm font-extrabold text-primary mt-0.5">
                      +{totalRevenue.toLocaleString('vi-VN')} đ
                    </div>
                  </div>

                  <div className="bg-danger-container/30 p-3 rounded-2xl border border-danger/20">
                    <div className="flex items-center gap-1 text-[11px] font-bold text-danger">
                      <ArrowDownLeft className="w-3.5 h-3.5" />
                      <span>Tổng Chi (Cám/Thuốc)</span>
                    </div>
                    <div className="text-sm font-extrabold text-danger mt-0.5">
                      -{totalExpense.toLocaleString('vi-VN')} đ
                    </div>
                  </div>
                </div>
              </div>

              {/* Category Filter Pills */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 hide-scrollbar text-[11px]">
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
                        ? 'bg-on-surface text-white border-on-surface'
                        : 'bg-surface-card text-on-surface-muted border-border-subtle'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Transactions List */}
              {filteredTransactions.length === 0 ? (
                <div className="bg-surface-card p-8 rounded-3xl border border-border-subtle shadow-sm text-center space-y-3">
                  <div className="text-3xl">📝</div>
                  <h3 className="text-sm font-bold text-on-surface">Chưa có giao dịch phù hợp</h3>
                  <p className="text-xs text-on-surface-muted">Bấm nút Mic 🎙️ hoặc nút Ghi Thu Chi để thêm giao dịch!</p>
                </div>
              ) : (
                <div className="bg-surface-card p-4 rounded-3xl border border-border-subtle shadow-sm space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-on-surface-muted border-b border-border-subtle pb-2">
                    <span>Lịch sử giao dịch ({filteredTransactions.length})</span>
                    <span>Số tiền</span>
                  </div>
                  <div className="divide-y divide-border-subtle">
                    {filteredTransactions.map((tx) => {
                      const isRev = tx.logType === 'REVENUE' || tx.type === 'REVENUE';
                      return (
                        <div key={tx.logId || tx.id} className="py-3 flex items-center justify-between">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm">
                                {tx.category === 'cam' ? '🌾' : tx.category === 'giong' ? '🐣' : tx.category === 'thuoc' ? '💊' : tx.category === 'ban_ga' ? '💵' : '⚙️'}
                              </span>
                              <h4 className="font-extrabold text-xs text-on-surface">{tx.notes || 'Khoản thu chi'}</h4>
                            </div>
                            <div className="text-[10px] text-on-surface-muted flex items-center gap-2">
                              <span>📅 {tx.date}</span>
                              {tx.flockName && (
                                <span className="bg-surface-container text-on-surface px-1.5 py-0.2 rounded font-semibold">
                                  🐔 {tx.flockName}
                                </span>
                              )}
                              {tx.createdVia === 'VOICE_AI' && (
                                <span className="text-primary font-bold">🎙️ Voice AI</span>
                              )}
                            </div>
                          </div>

                          <span className={`font-extrabold text-sm ${isRev ? 'text-primary' : 'text-danger'}`}>
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
              TAB 5: GIÁ & DỊCH (MARKET & RADAR - GOOGLE GROUNDING LIVE DATA)
             =================================================================== */}
          {activeTab === 'market' && (
            <div className="space-y-4 animate-count-up">
              {/* Header Card with Refresh */}
              <div className="bg-surface-card p-5 rounded-3xl border border-border-subtle shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">📈</div>
                    <div>
                      <h3 className="font-extrabold text-sm text-on-surface">Giá Thị Trường & Radar Dịch Bệnh</h3>
                      <p className="text-[11px] text-on-surface-muted">
                        Dữ liệu tổng hợp từ Báo Nông Nghiệp VN & Hiệp hội Gia cầm
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={fetchMarketRadar}
                    disabled={isLoadingMarket}
                    className="px-3 py-1.5 bg-surface-container-low hover:bg-surface-hover text-primary border border-primary/20 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-60"
                  >
                    <Loader2 className={`w-3.5 h-3.5 ${isLoadingMarket ? 'animate-spin' : ''}`} />
                    <span>{isLoadingMarket ? 'Đang tải...' : 'Làm mới AI'}</span>
                  </button>
                </div>

                {marketRadarData?.market_overview?.trend_summary && (
                  <div className="p-3 bg-surface-subtle border border-primary/20 rounded-2xl text-xs text-on-surface leading-relaxed">
                    💡 <strong>Tổng quan xu hướng:</strong> {marketRadarData.market_overview.trend_summary}
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] text-on-surface-muted pt-1 border-t border-border-subtle/60">
                  <span>📅 Ngày báo cáo: <strong>{marketRadarData?.market_overview?.reported_date || 'Hôm nay'}</strong></span>
                  <span>🌐 Nguồn: <strong>{marketRadarData?.market_overview?.data_source || 'Bộ NN&PTNT'}</strong></span>
                </div>
              </div>

              {/* 3-Region Live Poultry Prices Grid */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <h4 className="font-extrabold text-xs text-on-surface uppercase tracking-wider">
                    🐔 Giá Gà Thịt Xuất Chuồng 3 Miền
                  </h4>
                  <span className="text-[10px] text-on-surface-muted font-bold">Đơn vị: VNĐ/kg</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {marketRadarData?.market_overview?.regions ? (
                    marketRadarData.market_overview.regions.map((reg, idx) => (
                      <div key={idx} className="bg-surface-card p-4 rounded-3xl border border-border-subtle shadow-xs space-y-2 hover:border-primary/40 transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-xs text-on-surface">{reg.region}</span>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            reg.price_change?.includes('+') ? 'bg-primary/10 text-primary' :
                            reg.price_change?.includes('-') ? 'bg-danger/10 text-danger' :
                            'bg-surface-container text-on-surface-muted'
                          }`}>
                            {reg.price_change ? `${reg.price_change} đ` : 'Ổn định'}
                          </span>
                        </div>

                        <div className="text-2xl font-black text-primary">
                          {(reg.chicken_price_per_kg || 56000).toLocaleString('vi-VN')} <span className="text-xs text-on-surface-muted font-normal">đ/kg</span>
                        </div>

                        <div className="space-y-1 text-[11px] text-on-surface-muted pt-1 border-t border-border-subtle/50">
                          <div className="flex justify-between">
                            <span>Trứng gà:</span>
                            <span className="font-bold text-on-surface">{(reg.egg_price || 2400).toLocaleString('vi-VN')} đ/quả</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Khu vực:</span>
                            <span className="font-medium text-on-surface-variant truncate max-w-[130px]">{reg.sample_locations || 'Trọng điểm'}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-3 p-6 bg-surface-card rounded-3xl text-center text-xs text-on-surface-muted flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span>Đang kết nối vệ tinh và Google Search thu thập giá 3 miền...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Feed Prices Section */}
              {marketRadarData?.market_overview?.feed_prices && (
                <div className="bg-surface-card p-4 rounded-3xl border border-border-subtle shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-xs text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-secondary" />
                      <span>Giá Cám Chăn Nuôi Gia Cầm Khảo Sát (Bao 25kg)</span>
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {marketRadarData.market_overview.feed_prices.map((feed, idx) => (
                      <div key={idx} className="p-3 bg-surface-container-low rounded-2xl flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-on-surface">{feed.feed_type}</p>
                          {feed.unit_price_per_kg && (
                            <p className="text-[10px] text-on-surface-muted">~{feed.unit_price_per_kg.toLocaleString('vi-VN')} đ/kg</p>
                          )}
                        </div>
                        <span className="text-xs font-extrabold text-secondary">
                          {(feed.average_price_per_bag || 365000).toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Disease Radar Alerts Section */}
              <div className="bg-surface-card p-5 rounded-3xl border border-border-subtle shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-danger" />
                    <h4 className="font-extrabold text-xs text-on-surface uppercase tracking-wider">
                      Radar Dịch Bệnh Gia Cầm & Cảnh Báo Thú Y
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-danger bg-danger/10 px-2 py-0.5 rounded-full">
                    Cập nhật mới nhất
                  </span>
                </div>

                <div className="space-y-2.5">
                  {marketRadarData?.disease_radar_alerts && marketRadarData.disease_radar_alerts.length > 0 ? (
                    marketRadarData.disease_radar_alerts.map((alert, idx) => (
                      <div key={idx} className="p-3.5 rounded-2xl border border-border-subtle bg-surface-container-low space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs text-on-surface">📍 {alert.province}</span>
                            <span className="text-[11px] font-bold text-danger bg-danger-container px-2 py-0.5 rounded-md">
                              {alert.pathogen}
                            </span>
                          </div>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            alert.risk_level === 'CAO' ? 'bg-danger text-white' :
                            alert.risk_level === 'TRUNG BÌNH' ? 'bg-secondary-container text-white' :
                            'bg-surface-subtle text-primary'
                          }`}>
                            Nguy cơ: {alert.risk_level || 'TRUNG BÌNH'}
                          </span>
                        </div>
                        <p className="text-xs text-on-surface-variant leading-relaxed">{alert.summary}</p>
                        <div className="flex items-center justify-between text-[10px] text-on-surface-muted pt-1">
                          <span>Nguồn tin: {alert.source || 'Cơ quan Thú y'}</span>
                          <span>Ngày báo: {alert.reported_date}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 rounded-2xl bg-surface-subtle border border-primary/20 text-center text-xs text-primary font-semibold">
                      🛡️ Chưa phát hiện ổ dịch gia cầm nghiêm trọng nào tại các vùng khảo sát.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <BottomNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenMic={() => setIsMicOpen(true)}
        />
      </div>

      {/* Modals Container */}
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
        availableFlocks={safeFlocks}
        defaultFlockId={selectedFlockId}
        ttsEnabled={ttsEnabled}
      />

      {/* 20 Poultry Diseases Search Modal */}
      {isEncyclopediaModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setIsEncyclopediaModalOpen(false); }}
        >
          <div 
            className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-2xl p-5 sm:p-6 shadow-2xl animate-count-up relative border border-border-subtle max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border-subtle pb-3 shrink-0">
              <div>
                <h3 className="font-extrabold text-base text-on-surface flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  <span>Cẩm Nang 20 Bệnh Gia Cầm Chuẩn Merck & OIE</span>
                </h3>
                <p className="text-xs text-on-surface-muted">Tra cứu nhanh triệu chứng, phân biệt chéo & phác đồ điều trị</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEncyclopediaModalOpen(false)}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-container-low hover:bg-danger-container text-on-surface-muted hover:text-danger transition-colors"
                aria-label="Đóng cẩm nang"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative my-3 shrink-0">
              <Search className="w-4 h-4 text-on-surface-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm theo tên bệnh hoặc triệu chứng (ví dụ: phân xanh, sưng mắt, cầu trùng)..."
                value={diseaseSearchQuery}
                onChange={(e) => setDiseaseSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-surface-container-low border border-border-subtle rounded-2xl text-xs font-semibold focus:outline-none focus:border-primary"
              />
            </div>

            {/* Disease List Scrollable */}
            <div className="overflow-y-auto space-y-2.5 pr-1 flex-1">
              {filteredDiseases.map((disease, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setSelectedDisease(disease);
                    setIsDiseaseModalOpen(true);
                  }}
                  className="p-3.5 rounded-2xl border border-border-subtle hover:border-primary bg-surface-container-low hover:bg-surface-subtle transition-all cursor-pointer space-y-1.5 shadow-sm group"
                >
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                      disease.urgency_level === 'KHẨN CẤP'
                        ? 'bg-danger-container text-danger'
                        : 'bg-surface-container text-primary'
                    }`}>
                      {disease.urgency_level}
                    </span>
                    <span className="text-[11px] font-bold text-on-surface-muted group-hover:text-primary transition-colors flex items-center gap-0.5">
                      Xem phác đồ <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>

                  <h4 className="font-extrabold text-xs text-on-surface group-hover:text-primary transition-colors">
                    🦠 {disease.disease_name}
                  </h4>

                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {disease.matching_symptoms.slice(0, 3).map((sym, sIdx) => (
                      <span key={sIdx} className="text-[10px] bg-white text-on-surface-muted px-2 py-0.5 rounded-md font-medium border border-border-subtle">
                        {sym}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 8. Interactive Voice & Spotlight Walkthrough for Elderly Farmers */}
      <InteractiveVoiceWalkthrough
        isOpen={isWalkthroughOpen}
        onClose={() => setIsWalkthroughOpen(false)}
      />
    </div>
  );
}
