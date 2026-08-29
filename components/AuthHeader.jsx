"use client";

import React, { useState, useEffect } from 'react';
import { 
  LogIn, LogOut, ChevronDown, X, Smartphone, PlusCircle,
  Share2, Check, CloudSun, ShieldCheck, CloudOff, Cloud, AlertTriangle, Sparkles
} from 'lucide-react';
import { auth, isCloudEnabled, GoogleAuthProvider, signInWithPopup, signOut } from '../lib/firebase';
import {
  createFarm, getFarm, getRegisteredFarms, generateShareMagicLink,
  getOrCreateFarm, migrateGuestData, DEFAULT_GUEST_FARM_ID
} from '../lib/tenantDb';

export default function AuthHeader({ 
  userRole, setUserRole,
  user,     setUser,
  activeFarmId, setActiveFarmId,
  onOpenShareModal,
  syncStatus,   // 'connecting' | 'synced' | 'error' | 'offline' — được truyền từ page.jsx
  showMigratePrompt: externalShowMigratePrompt,
  onMigrateGuest: externalOnMigrateGuest,
  onSkipMigrate: externalOnSkipMigrate,
  onOpenWalkthrough,
}) {
  const [showAuthModal,       setShowAuthModal]       = useState(false);
  const [showCreateFarmModal, setShowCreateFarmModal] = useState(false);
  const [showUserDropdown,    setShowUserDropdown]    = useState(false);
  const [registeredFarms,     setRegisteredFarms]     = useState([]);
  const [copiedLink,          setCopiedLink]          = useState(false);
  const [authLoading,         setAuthLoading]         = useState(false);
  const [authError,           setAuthError]           = useState(null);
  const [internalShowMigratePrompt, setInternalShowMigratePrompt] = useState(false);
  const [pendingFarmId,       setPendingFarmId]       = useState(null);

  const isMigrateVisible = externalShowMigratePrompt !== undefined ? externalShowMigratePrompt : internalShowMigratePrompt;

  // Form states
  const [phoneInput,     setPhoneInput]     = useState('');
  const [nameInput,      setNameInput]      = useState('');
  const [farmNameInput,  setFarmNameInput]  = useState('');
  const [locationInput,  setLocationInput]  = useState('Bắc Giang');
  const [flockCountInput,setFlockCountInput]= useState('1000');

  useEffect(() => { loadFarms(); }, []);

  const loadFarms = async () => {
    const list = await getRegisteredFarms();
    setRegisteredFarms(list);
  };

  // ─── Google Sign-In thật (Firebase Auth) ───────────────────────────────────
  // onAuthStateChanged trong page.jsx là nguồn duy nhất (single source of truth)
  // để quản lý user / farm / guest migration prompt — tránh gọi trùng lặp 2 lần
  const handleGoogleLogin = async () => {
    setAuthLoading(true);
    setAuthError(null);

    // Chế độ Offline Demo — Firebase chưa được cấu hình
    if (!isCloudEnabled) {
      const farm = await createFarm({
        farmId: 'demo_farm',
        farmName: 'Trại Gà Demo (Offline)',
        ownerName: 'Bác Bảy Demo',
        authProvider: 'GUEST',
      });
      setUser({ name: 'Bác Bảy Demo', farmName: farm.farmName, farmId: farm.farmId });
      setUserRole('OWNER');
      setActiveFarmId(farm.farmId);
      setShowAuthModal(false);
      setAuthLoading(false);
      loadFarms();
      return;
    }

    // Firebase Auth thật — chỉ gọi popup, onAuthStateChanged tự đồng bộ user và farm
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
      setShowAuthModal(false);
      loadFarms();
    } catch (err) {
      console.error('[Google Sign-In]', err.code, err.message);
      if (err.code === 'auth/popup-closed-by-user') {
        setAuthError(null); // Không phải lỗi thật — người dùng tự đóng
      } else if (err.code === 'auth/network-request-failed') {
        setAuthError('Không có kết nối mạng. Thử dùng chế độ khách hoặc kết nối lại Wi-Fi.');
      } else {
        setAuthError(`Đăng nhập thất bại: ${err.message}`);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  // ─── Guest Migration Handlers ───────────────────────────────────────────────
  const handleMigrateGuest = async () => {
    if (externalOnMigrateGuest) {
      await externalOnMigrateGuest();
    } else if (pendingFarmId) {
      await migrateGuestData(pendingFarmId);
    }
    setInternalShowMigratePrompt(false);
    setPendingFarmId(null);
  };

  const handleSkipMigrate = () => {
    if (externalOnSkipMigrate) {
      externalOnSkipMigrate();
    }
    setInternalShowMigratePrompt(false);
    setPendingFarmId(null);
  };

  // ─── Phone Login (Offline / No-Auth Mode) ──────────────────────────────────
  const handlePhoneLogin = async (e) => {
    if (e) e.preventDefault();
    if (!phoneInput) return;

    const farmId    = `farm_${phoneInput.replace(/\D/g, '') || 'user'}`;
    const farmName  = farmNameInput || `Trại Gà ${nameInput || 'Gia Đình'}`;
    const ownerName = nameInput || 'Chủ Hộ';

    const farm = await createFarm({ farmId, farmName, ownerName, phone: phoneInput, authProvider: 'PHONE' });
    setUser({ name: ownerName, phone: phoneInput, farmName: farm.farmName, farmId: farm.farmId });
    setUserRole('OWNER');
    setActiveFarmId(farm.farmId);
    setShowAuthModal(false);
    loadFarms();
  };

  // ─── Create New Farm ────────────────────────────────────────────────────────
  const handleCreateNewFarm = async (e) => {
    e.preventDefault();
    if (!farmNameInput || !nameInput) return;

    const farmId = `farm_${Date.now()}`;
    const farm = await createFarm({
      farmId, farmName: farmNameInput, ownerName: nameInput,
      phone: phoneInput || '', location: locationInput,
      totalFlockCount: Number(flockCountInput) || 0,
    });
    setUser({ name: farm.ownerName, phone: farm.phone, farmName: farm.farmName, farmId: farm.farmId });
    setUserRole('OWNER');
    setActiveFarmId(farm.farmId);
    setShowCreateFarmModal(false);
    setShowAuthModal(false);
    loadFarms();
  };

  // ─── Switch Farm ────────────────────────────────────────────────────────────
  const handleSwitchFarm = (targetFarmId, targetFarmName, targetOwner) => {
    setActiveFarmId(targetFarmId);
    if (user) setUser({ ...user, farmId: targetFarmId, farmName: targetFarmName, name: targetOwner || user.name });
    setShowUserDropdown(false);
  };

  // ─── Magic Link ─────────────────────────────────────────────────────────────
  const handleCopyMagicLink = async () => {
    const link = await generateShareMagicLink(activeFarmId || DEFAULT_GUEST_FARM_ID);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // ─── Logout ─────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    if (isCloudEnabled && auth) {
      try { await signOut(auth); } catch (err) { console.error('[SignOut]', err.message); }
    }
    setUser(null);
    setUserRole('OWNER');
    setActiveFarmId(DEFAULT_GUEST_FARM_ID);
    setShowUserDropdown(false);
  };

  // ─── Sync Status Badge ──────────────────────────────────────────────────────
  const renderSyncBadge = () => {
    if (!isCloudEnabled) {
      return (
        <span title="Dữ liệu đang lưu trên thiết bị này. Cấu hình Firebase để đồng bộ đám mây."
          className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-secondary bg-secondary-fixed/30 px-2 py-0.5 rounded-full border border-secondary-container/30">
          <CloudOff className="w-3 h-3" />
          <span>Offline Mode</span>
        </span>
      );
    }
    if (syncStatus === 'connecting') {
      return (
        <span title="Đang kết nối Firestore..."
          className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-on-surface-muted bg-surface-container-low px-2 py-0.5 rounded-full border border-border-subtle">
          <div className="w-2.5 h-2.5 rounded-full border-2 border-on-surface-muted/30 border-t-on-surface-muted animate-spin" />
          <span>Đang kết nối</span>
        </span>
      );
    }
    if (syncStatus === 'error') {
      return (
        <span title="Ghi lên Cloud thất bại. Dữ liệu vẫn lưu cục bộ và sẽ đồng bộ lại khi có mạng."
          className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-danger bg-danger-container px-2 py-0.5 rounded-full border border-danger/20">
          <AlertTriangle className="w-3 h-3" />
          <span>Lỗi kết nối</span>
        </span>
      );
    }
    if (syncStatus === 'synced') {
      return (
        <span title="Dữ liệu đã đồng bộ lên Firestore thành công."
          className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-primary bg-surface-subtle px-2 py-0.5 rounded-full border border-primary/20">
          <Cloud className="w-3 h-3" />
          <span>Firestore</span>
        </span>
      );
    }
    return null;
  };

  return (
    <>
      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <header className="w-full bg-surface border-b border-border-subtle px-4 py-3.5 sticky top-0 z-30 shadow-xs">
        <div className="flex items-center justify-between">
          {/* Left: Avatar + Greeting */}
          <div className="flex items-center gap-3">
            <div className="relative w-11 h-11 rounded-full overflow-hidden border-2 border-primary-container shrink-0 bg-primary/10 shadow-sm">
              <img 
                src={user?.photoURL || user?.avatar || "https://lh3.googleusercontent.com/aida-public/AB6AXuAE78zuGi8bTZKWeP7QXErrsqkAGmcdkzANnzu67MaU3T4SWMkpoluM0uJ-SMVfWsCPGq_QijFbrFxaxFUf_SToKIFEFzVBLIcR3hgtNFoopLOsSuz3AaZ06y7zWBD9rTQq7rfYFH5FZYtmui0ZRflqJPKcyJoom6GSe5Z6t9RV1IyjnTAfx-h-h1W17d4ms5TV09HrVlEUUAjDo0OSDBlx0uaoRXCL9ErMM-eLAQCW7VcQ8O2Lhjp10g"} 
                alt="Farmer Profile" 
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black text-primary leading-tight">
                Chào {user?.name?.split(' ').pop() || 'Bác Bảy'}! 🌾
              </h1>
              <p className="text-[11px] text-on-surface-muted font-semibold mt-0.5">
                {user ? user.farmName : 'Trang trại đang hoạt động tốt.'}
              </p>
            </div>
          </div>

          {/* Right: Badge + Walkthrough + Auth */}
          <div className="flex items-center gap-2">
            {renderSyncBadge()}

            {/* Elderly-Friendly Voice Walkthrough Button */}
            <button
              onClick={onOpenWalkthrough}
              title="Hướng dẫn sử dụng bằng giọng nói cho người lớn tuổi"
              className="min-h-[40px] px-3 py-1.5 bg-surface-container-low hover:bg-surface-hover text-primary border border-primary/20 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs active:scale-95 shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 text-secondary shrink-0" />
              <span className="hidden sm:inline">🎧 Hướng Dẫn</span>
              <span className="sm:hidden">🎧</span>
            </button>

            {!user ? (
              <button
                onClick={() => setShowAuthModal(true)}
                className="min-h-[40px] px-3.5 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-2xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Đăng nhập</span>
              </button>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="min-h-[40px] px-3 py-1.5 bg-surface-container-low hover:bg-surface-hover border border-border-subtle text-on-surface rounded-2xl text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-xs"
                >
                  <span className="text-[10px] bg-primary text-white px-2 py-0.5 rounded-full font-black uppercase">
                    {userRole === 'FAMILY_VIEWER' ? 'XEM' : 'CHỦ HỘ'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-on-surface-muted" />
                </button>

                {showUserDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-border-subtle py-2 z-50 text-on-surface animate-count-up">
                    <div className="px-4 py-2 border-b border-border-subtle">
                      <p className="text-xs font-bold text-on-surface truncate">{user.name}</p>
                      <p className="text-[10px] text-on-surface-muted truncate">{user.phone || user.email || 'Chủ hộ'}</p>
                    </div>

                    {registeredFarms.length > 1 && (
                      <div className="px-3 py-1.5 border-b border-border-subtle">
                        <span className="text-[10px] font-bold text-on-surface-muted uppercase block mb-1">Chuyển Đổi Trang Trại:</span>
                        <div className="space-y-1 max-h-28 overflow-y-auto">
                          {registeredFarms.map(f => (
                            <button key={f.farmId} onClick={() => handleSwitchFarm(f.farmId, f.farmName, f.ownerName)}
                              className={`w-full text-left px-2 py-1 rounded-lg text-xs flex items-center justify-between font-semibold ${activeFarmId === f.farmId ? 'bg-surface-subtle text-primary font-bold' : 'hover:bg-gray-50 text-on-surface-variant'}`}>
                              <span className="truncate">{f.farmName}</span>
                              {activeFarmId === f.farmId && <Check className="w-3.5 h-3.5 text-primary" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <button onClick={() => { setShowUserDropdown(false); onOpenWalkthrough(); }}
                      className="w-full min-h-[44px] px-4 text-left text-xs font-bold hover:bg-surface-hover text-primary flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-secondary-container" />
                      <span>🎧 Nghe Hướng Dẫn Giọng Nói</span>
                    </button>

                    <button onClick={() => { setShowUserDropdown(false); setShowCreateFarmModal(true); }}
                      className="w-full min-h-[44px] px-4 text-left text-xs font-bold hover:bg-surface-hover text-primary flex items-center gap-2">
                      <PlusCircle className="w-4 h-4" />
                      <span>+ Đăng Ký Trang Trại Mới</span>
                    </button>

                    <button onClick={handleCopyMagicLink}
                      className="w-full min-h-[44px] px-4 text-left text-xs font-bold hover:bg-accent-warm-container text-secondary flex items-center gap-2">
                      <Share2 className="w-4 h-4 text-secondary-container" />
                      <span>{copiedLink ? '✓ Đã copy link Zalo!' : 'Copy Link Zalo cho Con cái'}</span>
                    </button>

                    <div className="border-t border-border-subtle my-1" />

                    <button onClick={handleLogout}
                      className="w-full min-h-[44px] px-4 text-left text-xs font-bold hover:bg-danger-container text-danger flex items-center gap-2">
                      <LogOut className="w-4 h-4" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Weather Strip */}
        <div className="lg:hidden mt-2 pt-2 border-t border-border-subtle/50 flex items-center justify-between text-[11px] text-on-surface-muted font-semibold">
          <div className="flex items-center gap-1.5">
            <CloudSun className="w-4 h-4 text-secondary-container" />
            <span>28°C Nắng ấm • Bắc Giang, VN</span>
          </div>
          <div className="flex items-center gap-1 text-primary font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>An toàn dịch bệnh</span>
          </div>
        </div>
      </header>

      {/* ─── Guest Data Migration Toast ─────────────────────────────────────── */}
      {isMigrateVisible && (
        <div className="fixed bottom-24 left-4 right-4 z-50 bg-white border-2 border-primary/30 rounded-3xl p-4 shadow-2xl animate-count-up max-w-sm mx-auto">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xl shrink-0">📦</div>
            <div>
              <p className="text-sm font-extrabold text-on-surface">Chuyển dữ liệu demo vào tài khoản?</p>
              <p className="text-xs text-on-surface-muted mt-0.5">Đàn gà và giao dịch tài chính cũ sẽ được chuyển vào tài khoản Google của bạn.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleMigrateGuest}
              className="flex-1 btn-primary-cta text-xs font-bold py-2.5 rounded-xl">
              ✅ Chuyển dữ liệu
            </button>
            <button onClick={handleSkipMigrate}
              className="flex-1 border border-border-subtle hover:bg-surface-subtle rounded-xl text-xs font-bold py-2.5 text-on-surface-muted transition-colors">
              Bỏ qua
            </button>
          </div>
        </div>
      )}

      {/* ─── Auth Modal ──────────────────────────────────────────────────────── */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-border-subtle space-y-4 animate-count-up relative">
            <button onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 min-h-[44px] min-w-[44px] flex items-center justify-center text-on-surface-muted hover:text-on-surface rounded-full">
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-surface-subtle text-primary flex items-center justify-center mx-auto text-2xl shadow-sm">🏡</div>
              <h3 className="text-lg font-extrabold text-on-surface">Đăng Nhập Cá Nhân Hóa</h3>
              <p className="text-xs text-on-surface-muted">Mỗi tài khoản sở hữu một trang trại và dữ liệu riêng biệt</p>
            </div>

            {/* Google Sign-In — Luồng chính (1 chạm, xác thực thật) */}
            <button
              onClick={handleGoogleLogin}
              disabled={authLoading}
              className="w-full min-h-[48px] bg-white border-2 border-primary/30 hover:border-primary text-on-surface rounded-xl font-extrabold text-sm flex items-center justify-center gap-2.5 shadow-sm active:scale-95 transition-all disabled:opacity-60"
            >
              {authLoading ? (
                <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
              )}
              <span>{authLoading ? 'Đang đăng nhập...' : isCloudEnabled ? 'Tiếp tục với Google' : 'Vào Chế Độ Demo (Offline)'}</span>
            </button>

            {authError && (
              <div className="p-3 bg-danger-container rounded-xl text-xs text-danger font-semibold flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            {!isCloudEnabled && (
              <div className="p-3 bg-accent-warm-container rounded-xl text-xs text-secondary font-semibold">
                💡 <strong>Chế độ Demo:</strong> Dữ liệu lưu trên thiết bị này. Để đồng bộ đám mây, cần cấu hình Firebase trong <code className="bg-secondary-fixed/30 px-1 rounded">.env.local</code>.
              </div>
            )}

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-border-subtle" />
              <span className="flex-shrink mx-2 text-[10px] font-bold text-on-surface-muted uppercase">Hoặc đăng nhập bằng số điện thoại</span>
              <div className="flex-grow border-t border-border-subtle" />
            </div>

            {/* Phone Login Form (không xác thực, chỉ dùng offline) */}
            <form onSubmit={handlePhoneLogin} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-on-surface block mb-1">Số điện thoại:</label>
                <input type="tel" placeholder="Ví dụ: 0987 654 321" value={phoneInput}
                  onChange={e => setPhoneInput(e.target.value)}
                  className="w-full min-h-[44px] px-3 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-semibold focus:outline-none focus:border-primary" required />
              </div>
              <div>
                <label className="text-[11px] font-bold text-on-surface block mb-1">Tên của bạn / Chủ hộ:</label>
                <input type="text" placeholder="Ví dụ: Bác Bảy, Cô Mía..." value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  className="w-full min-h-[44px] px-3 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-semibold focus:outline-none focus:border-primary" required />
              </div>
              <button type="submit"
                className="w-full min-h-[44px] bg-surface-container-low hover:bg-surface-hover border border-border-subtle rounded-xl text-xs font-bold flex items-center justify-center gap-2 text-on-surface transition-colors active:scale-95">
                <Smartphone className="w-4 h-4" />
                <span>Vào Trang Trại Offline (Không xác thực)</span>
              </button>
            </form>

            <div className="pt-1 border-t border-border-subtle text-center">
              <button onClick={() => setShowAuthModal(false)}
                className="text-xs text-on-surface-muted hover:text-primary font-semibold underline">
                Tiếp tục dùng ở chế độ Khách (không đăng nhập)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Create New Farm Modal ───────────────────────────────────────────── */}
      {showCreateFarmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-border-subtle space-y-4 animate-count-up relative">
            <button onClick={() => setShowCreateFarmModal(false)}
              className="absolute top-4 right-4 min-h-[44px] min-w-[44px] flex items-center justify-center text-on-surface-muted hover:text-on-surface rounded-full">
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-accent-warm-container text-secondary flex items-center justify-center mx-auto text-2xl shadow-sm">🏗️</div>
              <h3 className="text-lg font-extrabold text-on-surface">Đăng Ký Trang Trại Mới</h3>
              <p className="text-xs text-on-surface-muted">Khởi tạo không gian dữ liệu trắng tinh cho trang trại của bạn</p>
            </div>

            <form onSubmit={handleCreateNewFarm} className="space-y-3 pt-1">
              <div>
                <label className="text-[11px] font-bold text-on-surface block mb-1">Tên Trang Trại:</label>
                <input type="text" placeholder="Ví dụ: Trại Gà Đồi Ba Vì" value={farmNameInput}
                  onChange={e => setFarmNameInput(e.target.value)}
                  className="w-full min-h-[44px] px-3 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-semibold focus:outline-none focus:border-primary" required />
              </div>
              <div>
                <label className="text-[11px] font-bold text-on-surface block mb-1">Tên Chủ Hộ:</label>
                <input type="text" placeholder="Ví dụ: Nguyễn Văn B" value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  className="w-full min-h-[44px] px-3 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-semibold focus:outline-none focus:border-primary" required />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-on-surface block mb-1">Tỉnh / Thành:</label>
                  <input type="text" value={locationInput} onChange={e => setLocationInput(e.target.value)}
                    className="w-full min-h-[44px] px-3 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-semibold focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface block mb-1">Quy mô (con):</label>
                  <input type="number" value={flockCountInput} onChange={e => setFlockCountInput(e.target.value)}
                    className="w-full min-h-[44px] px-3 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-semibold focus:outline-none focus:border-primary" />
                </div>
              </div>
              <button type="submit" className="w-full min-h-[48px] btn-primary-cta text-xs font-extrabold flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all">
                <PlusCircle className="w-4 h-4 text-on-surface" />
                <span>Khởi Tạo Trang Trại (Dữ Liệu Trắng)</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
