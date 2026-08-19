"use client";

import React, { useState, useEffect } from 'react';
import { 
  User, 
  LogIn, 
  LogOut, 
  ChevronDown, 
  Sparkles, 
  X, 
  Smartphone, 
  PlusCircle, 
  Share2, 
  Check,
  CloudSun,
  ShieldCheck
} from 'lucide-react';
import { createFarm, getRegisteredFarms, generateShareMagicLink } from '../lib/tenantDb';

export default function AuthHeader({ 
  userRole, 
  setUserRole, 
  user, 
  setUser, 
  activeFarmId, 
  setActiveFarmId, 
  onOpenShareModal 
}) {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showCreateFarmModal, setShowCreateFarmModal] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [registeredFarms, setRegisteredFarms] = useState([]);
  const [copiedLink, setCopiedLink] = useState(false);

  // Form states
  const [phoneInput, setPhoneInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [farmNameInput, setFarmNameInput] = useState('');
  const [locationInput, setLocationInput] = useState('Bắc Giang');
  const [flockCountInput, setFlockCountInput] = useState('1000');

  useEffect(() => {
    loadFarms();
  }, []);

  const loadFarms = async () => {
    const list = await getRegisteredFarms();
    setRegisteredFarms(list);
  };

  // Handle Phone Login
  const handlePhoneLogin = async (e) => {
    if (e) e.preventDefault();
    if (!phoneInput) return;

    const farmId = `farm_${phoneInput.replace(/\D/g, '') || 'user'}`;
    const farmName = farmNameInput || `Trại Gà ${nameInput || 'Gia Đình'}`;
    const ownerName = nameInput || 'Chủ Hộ';

    const farm = await createFarm({
      farmId,
      farmName,
      ownerName,
      phone: phoneInput,
      authProvider: 'PHONE'
    });

    setUser({
      name: ownerName,
      phone: phoneInput,
      farmName: farm.farmName,
      farmId: farm.farmId,
      avatar: null
    });
    setUserRole('OWNER');
    setActiveFarmId(farm.farmId);
    setShowAuthModal(false);
    loadFarms();
  };

  // Handle Google Login (1-Touch)
  const handleGoogleLogin = async () => {
    const farmId = 'farm_google_user';
    const farm = await createFarm({
      farmId,
      farmName: 'Trại Gà Đồi Út Bảy',
      ownerName: 'Trần Văn Bảy',
      email: 'tranvanbay.farm@gmail.com',
      authProvider: 'GOOGLE'
    });

    setUser({
      name: 'Trần Văn Bảy (Chủ Hộ)',
      email: 'tranvanbay.farm@gmail.com',
      farmName: farm.farmName,
      farmId: farm.farmId,
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAE78zuGi8bTZKWeP7QXErrsqkAGmcdkzANnzu67MaU3T4SWMkpoluM0uJ-SMVfWsCPGq_QijFbrFxaxFUf_SToKIFEFzVBLIcR3hgtNFoopLOsSuz3AaZ06y7zWBD9rTQq7rfYFH5FZYtmui0ZRflqJPKcyJoom6GSe5Z6t9RV1IyjnTAfx-h-h1W17d4ms5TV09HrVlEUUAjDo0OSDBlx0uaoRXCL9ErMM-eLAQCW7VcQ8O2Lhjp10g'
    });
    setUserRole('OWNER');
    setActiveFarmId(farm.farmId);
    setShowAuthModal(false);
    loadFarms();
  };

  // Create New Custom Farm
  const handleCreateNewFarm = async (e) => {
    e.preventDefault();
    if (!farmNameInput || !nameInput) return;

    const farmId = `farm_${Date.now()}`;
    const farm = await createFarm({
      farmId,
      farmName: farmNameInput,
      ownerName: nameInput,
      phone: phoneInput || '0988 888 888',
      location: locationInput,
      totalFlockCount: Number(flockCountInput) || 0
    });

    setUser({
      name: farm.ownerName,
      phone: farm.phone,
      farmName: farm.farmName,
      farmId: farm.farmId,
      avatar: null
    });
    setUserRole('OWNER');
    setActiveFarmId(farm.farmId);
    setShowCreateFarmModal(false);
    setShowAuthModal(false);
    loadFarms();
  };

  // Switch Farm
  const handleSwitchFarm = (targetFarmId, targetFarmName, targetOwner) => {
    setActiveFarmId(targetFarmId);
    if (user) {
      setUser({
        ...user,
        farmId: targetFarmId,
        farmName: targetFarmName,
        name: targetOwner || user.name
      });
    }
    setShowUserDropdown(false);
  };

  // Copy Magic Share Link
  const handleCopyMagicLink = async () => {
    const link = await generateShareMagicLink(activeFarmId || 'farm_guest_local');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setUserRole('OWNER');
    setActiveFarmId('farm_guest_local');
    setShowUserDropdown(false);
  };

  return (
    <>
      {/* Clean Light Modern Header (Matching Design System) */}
      <header className="w-full bg-surface border-b border-border-subtle px-margin-mobile py-3.5 sticky top-0 z-30 shadow-xs">
        <div className="flex items-center justify-between">
          {/* Left: Avatar + Warm Greeting */}
          <div className="flex items-center gap-3">
            <div className="relative w-11 h-11 rounded-full overflow-hidden border-2 border-primary-container shrink-0 bg-primary/10 shadow-sm">
              <img 
                src={user?.avatar || "https://lh3.googleusercontent.com/aida-public/AB6AXuAE78zuGi8bTZKWeP7QXErrsqkAGmcdkzANnzu67MaU3T4SWMkpoluM0uJ-SMVfWsCPGq_QijFbrFxaxFUf_SToKIFEFzVBLIcR3hgtNFoopLOsSuz3AaZ06y7zWBD9rTQq7rfYFH5FZYtmui0ZRflqJPKcyJoom6GSe5Z6t9RV1IyjnTAfx-h-h1W17d4ms5TV09HrVlEUUAjDo0OSDBlx0uaoRXCL9ErMM-eLAQCW7VcQ8O2Lhjp10g"} 
                alt="Farmer Profile" 
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h1 className="font-display-lg-mobile text-base sm:text-lg font-black text-primary leading-tight">
                Chào {user?.name || "Bác Bảy"}! 🌾
              </h1>
              <p className="text-[11px] text-on-surface-muted font-semibold mt-0.5">
                {user ? user.farmName : "Trang trại đang hoạt động tốt."}
              </p>
            </div>
          </div>

          {/* Right: Actions / Auth Dropdown */}
          <div className="flex items-center gap-2">
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

                {/* User Dropdown Menu */}
                {showUserDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-border-subtle py-2 z-50 text-on-surface animate-count-up">
                    <div className="px-4 py-2 border-b border-border-subtle">
                      <p className="text-xs font-bold text-on-surface truncate">{user.name}</p>
                      <p className="text-[10px] text-on-surface-muted truncate">{user.phone || user.email || 'Chủ hộ'}</p>
                    </div>

                    {/* Switch Farm Section */}
                    {registeredFarms.length > 1 && (
                      <div className="px-3 py-1.5 border-b border-border-subtle">
                        <span className="text-[10px] font-bold text-on-surface-muted uppercase block mb-1">
                          Chuyển Đổi Trang Trại:
                        </span>
                        <div className="space-y-1 max-h-28 overflow-y-auto">
                          {registeredFarms.map((f) => (
                            <button
                              key={f.farmId}
                              onClick={() => handleSwitchFarm(f.farmId, f.farmName, f.ownerName)}
                              className={`w-full text-left px-2 py-1 rounded-lg text-xs flex items-center justify-between font-semibold ${
                                activeFarmId === f.farmId ? 'bg-surface-subtle text-primary font-bold' : 'hover:bg-gray-50 text-on-surface-variant'
                              }`}
                            >
                              <span className="truncate">{f.farmName}</span>
                              {activeFarmId === f.farmId && <Check className="w-3.5 h-3.5 text-primary" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Add New Farm Button */}
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        setShowCreateFarmModal(true);
                      }}
                      className="w-full min-h-[44px] px-4 text-left text-xs font-bold hover:bg-surface-hover text-primary flex items-center gap-2"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>+ Đăng Ký Trang Trại Mới</span>
                    </button>

                    {/* Magic Link Share for Zalo */}
                    <button
                      onClick={handleCopyMagicLink}
                      className="w-full min-h-[44px] px-4 text-left text-xs font-bold hover:bg-accent-warm-container text-secondary flex items-center gap-2"
                    >
                      <Share2 className="w-4 h-4 text-secondary-container" />
                      <span>{copiedLink ? "✓ Đã copy link Zalo!" : "Copy Link Zalo cho Con cái"}</span>
                    </button>

                    <div className="border-t border-border-subtle my-1"></div>

                    <button
                      onClick={handleLogout}
                      className="w-full min-h-[44px] px-4 text-left text-xs font-bold hover:bg-danger-container text-danger flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Weather & Quick Status Strip */}
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

      {/* Auth Modal — Multi-channel Login */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-border-subtle space-y-4 animate-count-up relative">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 min-h-[44px] min-w-[44px] flex items-center justify-center text-on-surface-muted hover:text-on-surface rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-surface-subtle text-primary flex items-center justify-center mx-auto text-2xl shadow-sm">
                🏡
              </div>
              <h3 className="text-lg font-extrabold text-on-surface">Đăng Nhập Cá Nhân Hóa</h3>
              <p className="text-xs text-on-surface-muted">Mỗi tài khoản sở hữu một trang trại và dữ liệu riêng biệt</p>
            </div>

            {/* Phone Login Form */}
            <form onSubmit={handlePhoneLogin} className="space-y-3 pt-2">
              <div>
                <label className="text-[11px] font-bold text-on-surface block mb-1">Số điện thoại của bạn:</label>
                <input
                  type="tel"
                  placeholder="Ví dụ: 0987 654 321"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="w-full min-h-[44px] px-3 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-semibold focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-on-surface block mb-1">Tên của bạn / Chủ hộ:</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Bác Bảy, Cô Mía..."
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full min-h-[44px] px-3 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-semibold focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full min-h-[48px] btn-primary-cta text-xs font-extrabold flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all"
              >
                <Smartphone className="w-4 h-4 text-on-surface" />
                <span>Đăng Nhập / Vào Trang Trại Riêng</span>
              </button>
            </form>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-border-subtle"></div>
              <span className="flex-shrink mx-2 text-[10px] font-bold text-on-surface-muted uppercase">Hoặc đăng nhập 1-chạm</span>
              <div className="flex-grow border-t border-border-subtle"></div>
            </div>

            {/* Google OAuth button */}
            <button
              onClick={handleGoogleLogin}
              className="w-full min-h-[44px] bg-white border border-border-subtle hover:border-primary text-on-surface rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Tiếp tục với Google (Bác Bảy)</span>
            </button>

            <div className="pt-2 border-t border-border-subtle text-center">
              <button
                onClick={() => setShowAuthModal(false)}
                className="text-xs text-on-surface-muted hover:text-primary font-semibold underline"
              >
                Tiếp tục dùng ở chế độ Khách (Offline)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create New Farm Modal */}
      {showCreateFarmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-border-subtle space-y-4 animate-count-up relative">
            <button
              onClick={() => setShowCreateFarmModal(false)}
              className="absolute top-4 right-4 min-h-[44px] min-w-[44px] flex items-center justify-center text-on-surface-muted hover:text-on-surface rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-accent-warm-container text-secondary flex items-center justify-center mx-auto text-2xl shadow-sm">
                🏗️
              </div>
              <h3 className="text-lg font-extrabold text-on-surface">Đăng Ký Trang Trại Mới</h3>
              <p className="text-xs text-on-surface-muted">Khởi tạo không gian dữ liệu trắng tinh cho trang trại của bạn</p>
            </div>

            <form onSubmit={handleCreateNewFarm} className="space-y-3 pt-1">
              <div>
                <label className="text-[11px] font-bold text-on-surface block mb-1">Tên Trang Trại:</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Trại Gà Đồi Ba Vì"
                  value={farmNameInput}
                  onChange={(e) => setFarmNameInput(e.target.value)}
                  className="w-full min-h-[44px] px-3 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-semibold focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-on-surface block mb-1">Tên Chủ Hộ:</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Nguyễn Văn B"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full min-h-[44px] px-3 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-semibold focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-on-surface block mb-1">Tỉnh / Thành:</label>
                  <input
                    type="text"
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)}
                    className="w-full min-h-[44px] px-3 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-semibold focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface block mb-1">Quy mô (con):</label>
                  <input
                    type="number"
                    value={flockCountInput}
                    onChange={(e) => setFlockCountInput(e.target.value)}
                    className="w-full min-h-[44px] px-3 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-semibold focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full min-h-[48px] btn-primary-cta text-xs font-extrabold flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all"
              >
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
